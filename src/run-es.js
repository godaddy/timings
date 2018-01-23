const fs = require('fs');
const nconf = require('nconf');
const logger = require('../log.js');
const esUtils = require('./v2/es-utils');

/* eslint no-sync: 0 */
class Elastic {
  constructor() {
    this.env = nconf.get('env');
    this.es = new esUtils.ESClass();
    this.currVer;
    this.newVer = this.env.APP_VERSION ? parseInt(this.env.APP_VERSION.replace(/\./g, ''), 10) : 0;
  }

  async setup() {
    try {
      logger.debug(`Checking ElasticSearch host ["${this.env.ES_HOST}"] ...`);
      await this.es.ping();
      logger.debug(` >> SUCCESS! found it on port [${this.env.ES_PORT}]!`);
      nconf.set('env:useES', true);

      logger.debug(`Checking if upgrades to ES are needed ...`);

      await this.checkVer();

    } catch (err) {
      logger.debug(`Elasticsearch error [${this.env.ES_HOST}:${this.env.ES_PORT}] - error message: ${err.message}`);
      nconf.set('env:useES', false);
    }
    return;
  }

  async checkVer() {
    const currTemplate = await this.es.getTemplate(this.env.INDEX_PERF);

    if (currTemplate && currTemplate.hasOwnProperty(this.env.INDEX_PERF)) {
      this.currVer = currTemplate[this.env.INDEX_PERF].version;
    }

    if (!this.currVer || this.newVer > this.currVer || nconf.get('es_upgrade') === true) {
      this.doUpgrade();
    } else {
      logger.debug(` >> no upgrades needed ... current version: v.${this.currVer}`);
    }
  }

  async doUpgrade() {
    // Import/update latest visualizations and dashboards
    logger.debug(` >> Upgrading Elasticsearch to v.${this.newVer} ... ` +
      `[Force: ${nconf.get('es_upgrade')} - New: ${!this.currVer} - Upgr: ${this.currVer < this.newVer}]`);

    let importFile = fs.readFileSync('./.kibana_items.json', 'utf8');
    const replText = nconf.get('env:KB_RENAME');
    if (replText && typeof replText === 'string') {
      importFile = importFile.replace(/TIMINGS/g, replText.toUpperCase());
    }
    const importJson = JSON.parse(importFile);
    const esResponse = await this.es.kbImport(importJson);
    if (esResponse === true) {
      await this.es.defaultIndex(this.env.INDEX_PERF + '*', this.env.ES_VERSION);
    }

    // Make sure the latest template is present
    const templateJson = require('./.es_template.js');
    templateJson.version = this.newVer;
    await this.es.putTemplate('cicd-perf', templateJson);
    return;
  }
}

module.exports.Elastic = Elastic;
