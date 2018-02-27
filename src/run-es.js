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
    this.esHostPort = `${this.env.ES_HOST}:${this.env.ES_PORT}`;
    try {
      logger.debug(`[Elasticsearch] - ${this.esHostPort} - waiting up to 1 minute for startup ...`);
      await this.es.waitPort(60000);
      logger.debug(`[Elasticsearch] - ${this.esHostPort} - waiting up to 1 minute for healthy state ...`);
      this.esHealth = await this.es.healthy('60s', 'yellow');
      nconf.set('env:ES_VERSION', this.esHealth.version.number);
    } catch (err) {
      if (err.hasOwnProperty('path') && err.path === '/_cluster/health' && err.body.status === 'red') {
        logger.debug(`[Elasticsearch] - ${this.esHostPort} - unhealthy [status=RED]!! Check ES logs for issues!`);
      } else {
        logger.debug(`[Elasticsearch] - ${this.esHostPort} - ERROR - message: ${err.message}`);
      }
      return (err);
    }
    logger.debug(`[Elasticsearch] - ${this.esHostPort} - READY - [v.${this.esHealth.version.number}]` +
      ` - [status = ${this.esHealth.status.toUpperCase()}]`);
    nconf.set('env:useES', true);
    await this.checkVer();
    return;
  }

  async checkVer() {
    logger.debug(`[Elasticsearch] - ${this.esHostPort} - checking if upgrades are needed ...`);
    const currTemplate = await this.es.getTemplate(this.env.INDEX_PERF);

    if (currTemplate && currTemplate.hasOwnProperty(this.env.INDEX_PERF)) {
      this.currVer = currTemplate[this.env.INDEX_PERF].version;
    }

    if (!this.currVer || this.newVer > this.currVer || nconf.get('es_upgrade') === true) {
      this.doUpgrade();
    } else {
      logger.debug(`[Elasticsearch] - ${this.esHostPort} - already up-to-date [v${this.env.APP_VERSION}]`);
    }
  }

  async doUpgrade() {
    // Import/update latest visualizations and dashboards
    logger.debug(`[Elasticsearch] - ${this.esHostPort} - upgrading to v.${this.newVer} ... ` +
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
    const templateJson = require('../.es_template.js');
    templateJson.version = this.newVer;
    await this.es.putTemplate('cicd-perf', templateJson);
    return;
  }
}

module.exports.Elastic = Elastic;
