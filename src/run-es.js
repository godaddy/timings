const fs = require('fs');
const nconf = require('nconf');
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
      this.es.logElastic('debug', `[WAIT] waiting for Elasticsearch healthy state ...`);
      await this.es.waitPort(60000);
      this.esHealth = await this.es.healthy(60, 'yellow');
      this.esInfo = await this.es.info();
      nconf.set('env:ES_VERSION', this.esInfo.version.number);
    } catch (err) {
      if (err.hasOwnProperty('path') && err.path === '/_cluster/health' && err.body.status === 'red') {
        this.es.logElastic('error', `[ERROR] unhealthy [status=RED]!! Check ES logs for issues!`);
      } else {
        this.es.logElastic('error', `[ERROR] message: ${err.message}`);
      }
      return;
    }
    this.es.logElastic('debug', `[READY] - [Elasticsearch v.${this.esInfo.version.number}] ` +
      `status = ${this.esHealth.status.toUpperCase()}`);
    nconf.set('env:useES', true);
    await this.checkVer();
    return;
  }

  async checkVer() {
    this.es.logElastic('debug', `[UPGRADE] checking if upgrades are needed ...`);
    const currTemplate = await this.es.getTemplate(this.env.INDEX_PERF);

    if (currTemplate && currTemplate.hasOwnProperty(this.env.INDEX_PERF)) {
      this.currVer = currTemplate[this.env.INDEX_PERF].version;
    }

    if (!this.currVer || this.newVer > this.currVer || nconf.get('es_upgrade') === true) {
      this.doUpgrade();
    } else {
      this.es.logElastic('debug', `[UPGRADE] already up-to-date [v${this.env.APP_VERSION}]`);
    }
  }

  async doUpgrade() {
    // Import/update latest visualizations and dashboards
    this.es.logElastic('debug', `[UPGRADE] upgrading to v.${this.newVer} ... [Force: ${nconf.get('es_upgrade')} ` +
      `- New: ${!this.currVer} - Upgr: ${this.currVer < this.newVer}]`);

    let importFile = fs.readFileSync('./.kibana_items.json', 'utf8');
    const replText = nconf.get('env:KB_RENAME');
    if (replText && typeof replText === 'string') {
      importFile = importFile.replace(/TIMINGS/g, replText.toUpperCase());
    }
    const importJson = JSON.parse(importFile);
    const esResponse = await this.es.kbImport(importJson);
    if (esResponse === true) {
      this.es.logElastic('debug', `[IMPORT] - imported ${Object.keys(importJson).length} item(s) into Kibana!`);
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
