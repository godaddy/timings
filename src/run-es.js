const fs = require('fs');
const nconf = require('nconf');
const esUtils = require('./v2/es-utils');
const semver = require('semver');

/* eslint no-sync: 0 */
class Elastic {
  constructor() {
    this.env = nconf.get('env');
    this.es = new esUtils.ESClass();
  }

  async setup() {
    try {
      // Wait for healthy status and get info
      await this.es.waitPort(60000, this.env.ES_HOST, this.env.ES_PORT);
      await this.es.healthy('60s', 'yellow');
      await this.es.info();
      nconf.set('env:useES', true);
      // Get versions of API and KIBANA + check if update is needed
      this.templates = require('../.es_template.js');
      nconf.set('env:CURR_VERSION', semver.valid(await this.es.getTmplVer(nconf.get('env:ES_MAJOR'))) || null);
      if (nconf.get('env:CURR_VERSION')) {
        if (await this.checkUpgrade() === true) {
          await this.upgrade();
        } else {
          this.es.logElastic('info', `[UPDATE] API and KIBANA are up-to-date!`);
        }
      } else {
        // New installation - put 'cicd-perf' template
        Object.keys(this.templates).forEach(async templ => {
          await this.es.putTemplate(templ, this.templates[templ]);
        });
      }
    } catch (err) {
      if (err) {
        this.es.logElastic('error', `[ERROR] message: ${err}`);
        return err;
      }
    }
  }

  async upgrade() {
    try {
      this.es.logElastic('info', `[UPDATE] checking for updates ...`);
      Object.keys(this.templates).forEach(async templ => {
        await this.es.putTemplate(templ, this.templates[templ]);
      });
      if (nconf.get('env:KB_MAJOR') < 6 && nconf.get('env:ES_MAJOR') > 5) {
        // This is a 5.x -> 6.x upgrade! Run reindex jobs!
        this.es.logElastic(
          'info',
          `[UPGRADE] upgrading indices from [${nconf.get('env:KB_MAJOR')}] to [${nconf.get('env:ES_MAJOR')}]!`
        );
        const indexDay = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
        await this.upgradeReindex(this.env.KB_INDEX);
        await this.upgradeReindex(`${this.env.INDEX_PERF}-${indexDay}`);
        await this.upgradeReindex(`${this.env.INDEX_RES}-${indexDay}`);
        await this.upgradeReindex(`${this.env.INDEX_ERR}-${indexDay}`);
      }
      // Always run the regular checks
      await this.es.kbImport(JSON.parse(this.importFile('./.kibana_items.json')));
      await this.es.defaultIndex(this.env.INDEX_PERF + '*', this.env.ES_VERSION);
      this.es.logElastic('info', `[UPDATE] completed successfully!`);
    } catch (err) {
      if (err) {
        throw err;
      }
    }
  }

  async upgradeReindex(index) {
    try {
      const indexSettings = await this.es.getSettings(index);
      if (!Object.prototype.hasOwnProperty.call(indexSettings, index)) return;
      const indexVer = indexSettings[index].settings.index.version.created_string || '0';
      // Make sure we don't attempt reindex of v6.x indices!
      if (parseInt(indexVer.substr(0, 1), 10) > 5) return;

      const srcConvert = (index === this.env.KB_INDEX) ? 'ctx._source=[ctx._type:ctx._source];' : '';
      await this.es.reindex(
        index, '-v6',
        {
          source: srcConvert + 'ctx._source.type=ctx._type;ctx._id=ctx._type + ":" + ctx._id;ctx._type="doc";',
          lang: 'painless'
        }
      );
    } catch (err) {
      if (err) {
        this.es.logElastic('warn', `[REINDEX] skip reindex [${index}] - ${err.displayName || 'unknown'}!`);
        return;
      }
    }
  }

  importFile(file) {
    let importFile = fs.readFileSync(file, 'utf8');
    const replText = this.env.KB_RENAME;
    if (replText && typeof replText === 'string') {
      importFile = importFile.replace(/TIMINGS/g, replText.toUpperCase());
    }
    if (nconf.get('env:ES_MAJOR') > 5) {
      importFile = importFile.replace(/_type:navtiming/g, '(_type:navtiming OR type:navtiming)');
    }
    return importFile;
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
      `Force: ${nconf.get('es_upgrade')} - ` +
      `New: ${!this.env.KB_MAJOR} - ` +
      `Update: ${semver.lt(this.env.CURR_VERSION, this.env.NEW_VERSION)} - ` +
        `(CURR:${this.env.CURR_VERSION} > NEW:${this.env.NEW_VERSION}) - ` +
      `Upgrade: ${this.env.KB_MAJOR < this.env.ES_MAJOR} - (KB:${this.env.KB_MAJOR} > ES:${this.env.ES_MAJOR})`);
    }
    return upgrade;
  }
}


module.exports.Elastic = Elastic;
