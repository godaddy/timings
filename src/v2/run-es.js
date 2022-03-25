const semver = require('semver');
const waitOn = require('wait-port');
const esUtils = require('./es-utils');
const kbUtils = require('./kb-utils');
const logger = require('../log')(module.id);

/* eslint no-sync: 0 */
class Elastic {
  constructor(app) {
    this.es = new esUtils.ESClass(app);
    this.kb = new kbUtils.KBClass(app);
    this.app = app;
  }

  esInit(attempt = 1, attempts = 5) {
    this.app.locals.env.ES_REASON = [];
    this.app.locals.env.ES_ACTIVE = false;
    if (!this.app.locals.env.ES_HOST) {
      this.app.locals.env.ES_REASON.push(`No value for ES_HOST variable in config!`);
      this.app.logger.log('warn', `[INIT] - No value for ES_HOST variable in config - data will NOT be saved!`);
    } else {
      try {
        this.waitLoop(attempt, attempts);
      } catch (e) {
        this.app.locals.env.ES_REASON.push(`Error setting up Elastic! Data will NOT be saved to ES! Error: ${e}`);
        logger.log('error', `[INIT] Error setting up Elastic! Data will NOT be saved to ES!`, e);
      }
    }
  }

  waitLoop(attempt = 1, attempts = 5) {
    let waitResults;
    logger.log('info', `[INIT] Waiting for Elasticsearch and Kibana - attempt #${attempt} ...`);
    setTimeout(async () => {
      waitResults = await this.waitES();
      if (attempt < attempts && !waitResults) {
        this.waitLoop(attempt + 1);
      } else if (!waitResults) {
        const msg = `No response from Elasticsearch and/or Kibana - are they running? Please check ` +
          `[${this.app.locals.env.ES_HOST}:${this.app.locals.env.ES_PORT}]`;
        this.app.locals.env.ES_REASON.push(msg);
        logger.log('warn', `[INIT] ${msg}`);
      } else {
        logger.log('info', `[INIT] Elasticsearch and Kibana are available!`);
      }
    }, this.app.locals.env.ES_TIMEOUT);
  }

  async waitES() {
    // Wait for healthy status and get info
    const waitESResult = await waitOn({
      host: this.app.locals.env.ES_HOST,
      port: this.app.locals.env.ES_PORT,
      output: 'silent',
      timeout: this.app.locals.env.ES_TIMEOUT || 5000
    });
    const waitKBResult = await waitOn({
      host: this.app.locals.env.KB_HOST,
      port: this.app.locals.env.KB_PORT,
      output: 'silent',
      timeout: this.app.locals.env.ES_TIMEOUT || 5000
    });
    if (waitKBResult) await this.checkKBStatus();
    if (waitESResult) await this.checkESStatus();
    return waitESResult && waitKBResult;
  }

  async checkKBStatus() {
    const healthResult = await this.kb.getKBStatus();
    this.app.locals.env.KB_VERSION = healthResult?.version?.number || 'unknown';
    this.app.locals.env.KB_BUILD = healthResult?.version?.build_number || 'unknown';
    this.app.locals.env.KB_STATUS = healthResult?.status?.overall?.state || 'unknown';
    this.app.locals.env.ES_REASON.push(`Kibana status: ${this.app.locals.env.KB_STATUS}`);
    if (Array.isArray(healthResult?.status?.statuses)) {
      const esStatus = healthResult?.status?.statuses.filter(s => s.id.indexOf('core:elasticsearch') === 0);
      if (esStatus.length > 0) {
        this.app.locals.env.ES_STATUS = esStatus[0].state || 'unknown';
        if (['green', 'yellow'].includes(this.app.locals.env.ES_STATUS)) {
          this.app.locals.env.ES_ACTIVE = true;
          this.app.locals.env.ES_REASON.push(`Elasticsearch  status: ${this.app.locals.env.ES_STATUS}`);
        }
      }
    } else this.app.locals.env.ES_STATUS = 'unknown';

    // const healthResult = await this.es.healthy(`${this.app.locals.env.ES_TIMEOUT / 10}s`, 'yellow');
    if (this.app.locals.env.KB_STATUS !== 'green') {
      const msg = `Kibana state is [${this.app.locals.env.KB_STATUS}] while expecting [green] - ` +
        `Please check [${this.app.locals.env.ES_PROTOCOL}://${this.app.locals.env.KB_HOST}:${this.app.locals.env.KB_PORT}]`;
      logger.log('warn', msg);
      this.app.locals.env.ES_REASON.push(msg);
    } else {
      // Elastic looks good!
      this.app.locals.env.ES_ACTIVE = true;
    }
  }

  async checkESStatus() {
    if (['green', 'yellow'].includes(this.app.locals.env.ES_STATUS)) {
      this.app.locals.env.ES_ACTIVE = true;
      await this.checkEsTemplate();
      const info = await this.es.info();
      const version = info?.version?.number;
      if (!version) {
        this.app.locals.env.ES_REASON.push(`No version found for Elasticsearch - does your version match the client? ` +
          `Please check [${this.app.locals.env.ES_PROTOCOL}://${this.app.locals.env.ES_HOST}:${this.app.locals.env.ES_PORT}]`);
        this.app.locals.env.ES_ACTIVE = false;
      } else {
        this.app.locals.env.ES_VERSION = version;
        this.app.locals.env.ES_VERSION_INFO = info.version;
        this.app.locals.env.ES_CLUSTER = info.cluster_name;
        this.app.locals.env.ES_MAJOR = parseInt(version.substring(0, 1), 10);
        this.app.locals.env.ES_ACTIVE = this.es.clientVersionMajor === this.app.locals.env.ES_MAJOR;
        this.app.locals.env.ES_REASON.push(`NPM client [v.${this.es.clientVersion}] and ` +
          `Elasticsearch [v.${this.app.locals.env.ES_VERSION}] - are ${this.app.locals.env.ES_ACTIVE ? '' : 'NOT '}a match!`);
      }
    }
  }

  async checkEsTemplate() {
    if (this.app.locals.env.ES_ACTIVE === true) {
      // Check the API version that created the current 'cicd-perf' template (if it's present)
      const templateVersion = await this.es.getTemplateVersion();
      this.app.locals.env.CURR_VERSION = semver.valid(templateVersion) || null;

      // Check if this is a first-time install - if so, create the 'cicd-perf' template and set the default index-pattern
      if (!this.app.locals.env.CURR_VERSION) {
        logger.log('info', `[ELASTIC] New install - going to install templates and sample data...`);
        await this.newInstall();
      } else {
        const match = this.app.locals.env.CURR_VERSION === this.app.locals.env.APP_VERSION;
        if (!match) {
          logger.log('info', `[ELASTIC] Updating template to [v.${this.app.locals.env.APP_VERSION}] ...`);
          await this.upgrade();
        }
      }
    }
  }

  async getEsInfo() {
    this.app.locals.env.ES_REASON = [];
    let response = { info: [] };
    await this.waitES();
    if (this.app.locals.env.ES_ACTIVE === true) {
      try {
        // Check if there is cicd-perf (sample) data
        const timingsIndices = await this.es.getIncides('cicd-*');
        this.app.locals.env.HAS_TIMINGS_DATA = Array.isArray(timingsIndices) && timingsIndices.length > 0;

        // Check if there the default Kibana items are present
        const hasKibanaObjects = await this.es.search(
          this.app.locals.env.KB_INDEX,
          null,
          {
            query: {
              term: {
                _id: {
                  value: 'dashboard:TIMINGS-Dashboard'
                }
              }
            }
          }
        );
        this.app.locals.env.HAS_KB_ITEMS = hasKibanaObjects.hits?.total?.value > 0;

        response = {
          action: 'Check ES',
          esActive: this.app.locals.env.ES_ACTIVE,
          esVersion: this.app.locals.env.ES_VERSION,
          esStatus: this.app.locals.env.ES_STATUS,
          clientVersion: this.es.clientVersion,
          kbVersion: this.app.locals.env.KB_VERSION,
          kbBuild: this.app.locals.env.KB_BUILD,
          kbStatus: this.app.locals.env.KB_STATUS,
          templateVersion: this.app.locals.env.CURR_VERSION,
          hasTimingsData: this.app.locals.env.HAS_TIMINGS_DATA,
          hasKibanaObjects: this.app.locals.env.HAS_KB_ITEMS,
          ok: this.app.locals.env.ES_ACTIVE,
          info: this.app.locals.env.ES_REASON
        };
      } catch (e) {
        response = {
          ok: false,
          info: [`Error setting up Elastic! Data will NOT be saved to ES! Error: ${e}`]
        };
      }
    } else {
      response = {
        ok: false,
        info: [`Elasticsearch is not in use! Reason(s): ${this.app.locals.env.ES_REASON}`]
      };
    }
    return response;
  }

  async newInstall() {
    if (this.app.locals.env.ES_ACTIVE === true) {
      // Create index template
      const esTemplate = require('../../config/.es_template.json');
      esTemplate.version = parseInt(this.app.locals.env.APP_VERSION.replace(/\./g, ''), 10);
      esTemplate.template.mappings._meta.api_version = this.app.locals.env.APP_VERSION;
      try {
        await this.es.putTemplate(this.app.locals.env.INDEX_PERF, esTemplate);
        await this.es.esImport();
        await this.kb.kbImport(); // also sets the default index-pattern!
      } catch (e) {
        logger.log('error', `Error importing first time setup data!`, e);
      }
    } else {
      logger.log('warn', `Elasticsearch is not in use - cannot install template [${this.app.locals.env.INDEX_PERF}*]`);
    }
  }

  async upgrade() {
    const response = {
      action: 'Template upgrade',
      info: [],
      ok: false
    };

    if (this.app.locals.env.ES_ACTIVE === true) {
      const esTemplate = require('../../config/.es_template.json');
      esTemplate.template.mappings._meta.api_version = this.app.locals.env.APP_VERSION;
      esTemplate.version = parseInt(this.app.locals.env.APP_VERSION.replace(/\./g, ''), 10);
      response.appVersion = this.app.locals.env.APP_VERSION;
      response.templateVersion = this.app.locals.env.CURR_VERSION;
      response.esVersion = this.app.locals.env.ES_VERSION;
      response.esStatus = this.app.locals.env.ES_STATUS;
      response.kibanaVersion = this.app.locals.env.KB_VERSION;
      response.kibanaBuild = this.app.locals.env.KB_BUILD;
      response.kibanaStatus = this.app.locals.env.KB_STATUS;
      response.kibanaIndex = this.app.locals.env.KB_INDEX;
      try {
        logger.log('info', `[UPDATE] updating index template [${this.app.locals.env.INDEX_PERF}] ...`);
        await this.es.putTemplate(this.app.locals.env.INDEX_PERF, esTemplate);
        logger.log('info', `[UPDATE] index template [${this.app.locals.env.INDEX_PERF}] updated successfully!`);
        response.ok = true;
      } catch (e) {
        response.ok = false;
        response.err = e;
      }
    } else {
      response.info.push(
        `Elasticsearch is not in use - cannot upgrade template [${this.app.locals.env.INDEX_PERF}*]`);
    }
    return response;
  }

  async checkUpgrade() {
    const response = {
      action: 'Template version check',
      info: []
    };

    if (this.app.locals.env.ES_ACTIVE === true) {
      this.app.locals.env.NEW_VERSION = semver.valid(this.app.locals.env.APP_VERSION) || this.app.locals.env.CURR_VERSION;
      this.app.locals.env.KB_INDEX_VERSION = await this.kb.getKBVer();
      this.app.locals.env.KB_INDEX_MAJOR = parseInt(this.app.locals.env.KB_INDEX_VERSION.substring(0, 1), 10);
      response.currVersion = this.app.locals.env.CURR_VERSION;
      response.newVersion = this.app.locals.env.NEW_VERSION;

      const upgrade = (
        this.app.locals.env.CURR_VERSION && (
          semver.lt(this.app.locals.env.CURR_VERSION, this.app.locals.env.NEW_VERSION) ||
          (this.app.locals.env.KB_INDEX_MAJOR < this.app.locals.env.ES_MAJOR) ||
          this.app.locals.ES_UPGRADE === true
        )
      );
      if (upgrade === true) {
        response.info.push(`[UPDATE] Force: ${this.app.locals.ES_UPGRADE || false} - ` +
          `App Update: ${semver.lt(this.app.locals.env.CURR_VERSION, this.app.locals.env.NEW_VERSION)} - ` +
          `(CURR:${this.app.locals.env.CURR_VERSION} / NEW:${this.app.locals.env.NEW_VERSION}) - ` +
          `ES Upgrade: ${this.app.locals.env.KB_INDEX_MAJOR < this.app.locals.env.ES_MAJOR} - ` +
          `(KB index major:${this.app.locals.env.KB_INDEX_MAJOR} / ES major:${this.app.locals.env.ES_MAJOR})`);
        logger.log('info', response.info);

        // Update the [cicd-perf] template
        this.upgrade();

      } else {
        response.info.push(
          `Your Elasticsearch template [${this.app.locals.env.INDEX_PERF}*] was created by the current version of Timings API `
          + `(v.${this.app.locals.env.APP_VERSION})! No changes needed.`);
      }
    } else {
      response.info.push(
        `Elasticsearch is not in use - cannot check template [${this.app.locals.env.INDEX_PERF}*]`);
    }
    return response;
  }
}


module.exports.Elastic = Elastic;
