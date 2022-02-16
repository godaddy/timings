const nconf = require('nconf');
const esUtils = require('./v2/es-utils');
const semver = require('semver');
const templates = require('../.es_template.js');

/* eslint no-sync: 0 */
class Elastic {
  constructor() {
    this.env = nconf.get('env');
    this.es = new esUtils.ESClass();
    this.templates = templates;
  }

  async setup() {
    try {
      // Wait for healthy status and get info
      await this.es.waitPort(60000, this.env.ES_HOST, this.env.ES_PORT);
      await this.es.healthy('60s', 'yellow');
      await this.es.info();
      // Get API version + check if template needs update
      nconf.set('env:CURR_VERSION', semver.valid(await this.es.getTemplateVersion(nconf.get('env:ES_MAJOR'))) || null);
      if (nconf.get('env:CURR_VERSION')) {
        if (await this.checkUpgrade() === true) {
          await this.upgrade();
        } else {
          this.es.logElastic('info', `[UPDATE] API and ELK are up-to-date!`);
        }
      } else {
        // New installation - put templates in place before anything else!
        await this.newInstall();
      }
      // Everything looks good - we can save data to ES!
      nconf.set('env:useES', true);
    } catch (err) {
      if (err) {
        nconf.set('env:useES', false);
        this.es.logElastic('error', `Error setting up Elastic! Data will NOT be saved to ES! Error: ${err}`);
        return err;
      }
    }
  }

  async newInstall() {
    Object.keys(this.templates[`elk${nconf.get('env:ES_MAJOR')}`]).forEach(async templ => {
      await this.es.putTemplate(templ, this.templates[`elk${nconf.get('env:ES_MAJOR')}`][templ]);
    });
    // Import Kibana saved objects
    try {
      await this.es.esImport();
      await this.es.kbImport();
    } catch (err) {
      this.es.logElastic('error', `Error importing first time setup data! Error: ${err}`);
    }
  }

  async upgrade() {
    try {
      this.es.logElastic('info', `[UPDATE] checking for updates ...`);
      Object.keys(this.templates[`elk${nconf.get('env:ES_MAJOR')}`]).forEach(async templ => {
        await this.es.putTemplate(templ, this.templates[`elk${nconf.get('env:ES_MAJOR')}`][templ]);
      });
      this.es.logElastic('info', `[UPDATE] completed successfully!`);
    } catch (err) {
      if (err) {
        throw err;
      }
    }
  }

  async checkUpgrade() {
    nconf.set('env:NEW_VERSION', semver.valid(nconf.get('env:APP_VERSION')) || nconf.get('env:CURR_VERSION'));
    nconf.set('env:KB_VERSION', await this.es.getKBVer());
    nconf.set('env:KB_MAJOR', parseInt(nconf.get('env:KB_VERSION').substr(0, 1), 10));
    this.env = nconf.get('env');
    const upgrade = (
      semver.lt(this.env.CURR_VERSION, this.env.NEW_VERSION) ||
      (this.env.KB_MAJOR < this.env.ES_MAJOR) ||
      nconf.get('es_upgrade') === true
    );
    if (upgrade === true) {
      this.es.logElastic('info', `[UPDATE] ` +
      `Force: ${nconf.get('es_upgrade') || false} - ` +
      `New: ${!this.env.KB_MAJOR} - ` +
      `App Update: ${semver.lt(this.env.CURR_VERSION, this.env.NEW_VERSION)} - ` +
        `(CURR:${this.env.CURR_VERSION} > NEW:${this.env.NEW_VERSION}) - ` +
      `ES Upgrade: ${this.env.KB_MAJOR < this.env.ES_MAJOR} - (KB:${this.env.KB_MAJOR} > ES:${this.env.ES_MAJOR})`);
    }
    return upgrade;
  }
}


module.exports.Elastic = Elastic;
