const nconf = require('nconf');
const esUtils = require('./v2/es-utils');
const semver = require('semver');
const templates = require('../.es_template.js');
const logger = require('../log.js');

/* eslint no-sync: 0 */
class Elastic {
  constructor() {
    this.env = nconf.get('env');
    this.es = new esUtils.ESClass();
    this.templates = templates;
  }

  async init() {
    try {
      // Wait for healthy status and get info
      nconf.set('env:useES', false);
      await this.es.waitPort(60000, this.env.ES_HOST, this.env.ES_PORT);
      await this.es.healthy('60s', 'yellow');
      const info = await this.es.info();
      const version = info.version.number;

      if (version) {
        // Set initial env vars
        nconf.set('env:ES_VERSION', version);
        nconf.set('env:ES_VERSION_INFO', info.version);
        nconf.set('env:ES_CLUSTER', info.cluster_name);
        nconf.set('env:ES_MAJOR', parseInt(version.substring(0, 1), 10));
        this.env = nconf.get('env');
        nconf.set('env:useES', this.es.clientVersionMajor === nconf.get('env:ES_MAJOR'));

        nconf.set('env:useESReason', `NPM client is [v.${this.es.clientVersion}] - ` +
          `Elasticsearch is [v.${nconf.get('env:ES_VERSION')}] - are ${nconf.get('env:useES') ? '' : 'NOT '}a match!`);

        if (nconf.get('env:useES') === true) {
          // Check the API version that created the current 'cicd-perf' template (if it's present)
          const templateVersion = await this.es.getTemplateVersion(nconf.get('env:ES_MAJOR'));
          const currVersion = semver.valid(templateVersion) || null;
          nconf.set('env:CURR_VERSION', currVersion);

          // Check if this is a first-time install - if so, create the 'cicd-perf' template and set the default index-pattern
          if (!nconf.get('env:CURR_VERSION')) {
            this.logElastic('info', `[INFO] New install - going to install templates and sample data...`);
            await this.newInstall();
          } else {
            const match = nconf.get('env:CURR_VERSION') === nconf.get('env:APP_VERSION');
            this.logElastic('info', `[INFO] Existing install - template version is [${nconf.get('env:CURR_VERSION')}] - ` +
              `API version is [${nconf.get('env:APP_VERSION')}]`);
            if (!match) {
              this.logElastic('info', `[INFO] Updating template to [v.${nconf.get('env:APP_VERSION')}] ...`);
              await this.upgrade();
            }
          }
          nconf.set('env:KB_VERSION', await this.es.getKBVer());
          await this.checkES();
        }
      } else {
        nconf.set('env:useESReason',
          `No version was found for Elasticsearch - is it running? Please check ` +
          `[${nconf.get('env:ES_HOST')}://${nconf.get('env:ES_HOST')}:${nconf.get('env:ES_PORT')}]`);
      }
      this.logElastic('info', `[INFO] ${nconf.get('env:useESReason')}`);
    } catch (err) {
      if (err) {
        nconf.set('env:useES', false);
        nconf.set('env:useESReason', `Error setting up Elastic! Data will NOT be saved to ES! Error: ${err}`);
        this.logElastic('error', `[ERROR] ${nconf.get('env:useESReason')}`);
      }
    }
  }

  async checkES() {
    let response = { info: [] };
    if (nconf.get('env:useES') === true) {
      try {
        // Check if there is cicd-perf (sample) data
        const hasTimingsData = await this.es.getIncides('cicd-*');

        // Check if there the default Kibana items are present
        const hasKibanaItems = await this.es.search(
          nconf.get('env:KB_INDEX'),
          null,
          {
            query: {
              term: {
                _id: {
                  value: nconf.get('env:ES_MAJOR') > 5
                    ? 'dashboard:TIMINGS-Dashboard'
                    : 'TIMINGS-Dashboard'
                }
              }
            }
          }
        );
        const checkTemplate = await this.checkUpgrade();

        // Set the rest of the env variables
        nconf.set('env:HAS_TIMINGS_DATA', hasTimingsData != null);
        nconf.set('env:HAS_KB_ITEMS', hasKibanaItems.hits.total > 0 || hasKibanaItems.hits.total.value > 0);

        response = {
          action: 'Check ES',
          useES: nconf.get('env:useES'),
          esVersion: nconf.get('env:ES_VERSION'),
          clientVersion: this.es.clientVersion,
          templateVersion: nconf.get('env:CURR_VERSION'),
          hasTimingsData: nconf.get('env:HAS_TIMINGS_DATA'),
          hasKibanaItems: nconf.get('env:HAS_KB_ITEMS'),
          checkTemplate: checkTemplate,
          ok: nconf.get('env:useES'),
          info: [
            ...checkTemplate.info,
            'Your elasticsearch server and the elasticsearch client are a good match! Elastic can be used!'
          ]
        };
        delete checkTemplate.info;
      } catch (err) {
        response = {
          ok: false,
          info: [`Error setting up Elastic! Data will NOT be saved to ES! Error: ${err}`]
        };
      }
    } else {
      response = {
        ok: false,
        info: [`Elasticsearch is not in use! Reason: ${nconf.get('env:useESReason')}`]
      };
    }
    return response;
  }

  async newInstall() {
    // Create index templates
    try {
      Object.keys(this.templates[`elk${nconf.get('env:ES_MAJOR')}`]).forEach(async templ => {
        await this.es.putTemplate(templ, this.templates[`elk${this.env.ES_MAJOR}`][templ]);
      });
    } catch (err) {
      this.es.logElastic('error', `Error importing first time setup data! Error: ${err}`);
    }

    // Import Kibana saved objects
    try {
      await this.es.esImport();
      await this.es.setDefaultIndex();
      await this.es.kbImport();
    } catch (err) {
      this.es.logElastic('error', `Error importing first time setup data! Error: ${err}`);
    }
  }

  async upgrade() {
    const response = {
      action: 'ES Template upgrade',
      appVersion: nconf.get('env:APP_VERSION'),
      templateVersion: nconf.get('env:CURR_VERSION'),
      esVersion: nconf.get('env:ES_VERSION'),
      kibanaVersion: nconf.get('env:KB_VERSION'),
      kibanaIndex: nconf.get('env:KB_INDEX'),
      ok: false
    };
    try {
      this.es.logElastic('info', `[UPDATE] checking for updates ...`);
      Object.keys(this.templates[`elk${nconf.get('env:ES_MAJOR')}`]).forEach(async templ => {
        console.debug('would be putting template now ...');
        await this.es.putTemplate(templ, this.templates[`elk${nconf.get('env:ES_MAJOR')}`][templ]);
      });
      this.es.logElastic('info', `[UPDATE] completed successfully!`);
      response.ok = true;
    } catch (err) {
      response.ok = false;
      response.err = err;
    }
    return response;
  }

  async checkUpgrade() {
    nconf.set('env:NEW_VERSION', semver.valid(nconf.get('env:APP_VERSION')) || nconf.get('env:CURR_VERSION'));
    nconf.set('env:KB_VERSION', await this.es.getKBVer());
    nconf.set('env:KB_MAJOR', parseInt(nconf.get('env:KB_VERSION').substring(0, 1), 10));
    this.env = nconf.get('env');  // refresh `this.env` after ^^^ updates
    const response = {
      action: 'Template version check',
      currVersion: this.env.CURR_VERSION,
      newVersion: this.env.NEW_VERSION,
      info: []
    };

    const upgrade = (
      nconf.get('env:CURR_VERSION') && (
        semver.lt(this.env.CURR_VERSION, this.env.NEW_VERSION) ||
        (this.env.KB_MAJOR < this.env.ES_MAJOR) ||
        nconf.get('es_upgrade') === true
      )
    );
    if (upgrade === true) {
      response.info.push(`[UPDATE] Force: ${nconf.get('es_upgrade') || false} - ` +
      `New: ${!this.env.KB_MAJOR} - ` +
      `App Update: ${semver.lt(this.env.CURR_VERSION, this.env.NEW_VERSION)} - ` +
        `(CURR:${this.env.CURR_VERSION} > NEW:${this.env.NEW_VERSION}) - ` +
        `ES Upgrade: ${this.env.KB_MAJOR < this.env.ES_MAJOR} - (KB:${this.env.KB_MAJOR} > ES:${this.env.ES_MAJOR})`);
      this.es.logElastic('info', response.info);
    } else {
      response.info.push(
        `Your Elasticsearch template [${nconf.get('env:INDEX_PERF')}*] was created by the current version of Timings API `
        + `(v.${this.env.APP_VERSION})! No changes needed.`);
    }
    return response;
  }

  logElastic(level, msg) {
    logger[level](`Elasticsearch - UTILS - ${msg}`);
  }
}


module.exports.Elastic = Elastic;
