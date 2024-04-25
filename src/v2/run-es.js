const semver = require('semver');
const esUtils = require('./es-utils');
const kbUtils = require('./kb-utils');
const logger = require('../log')(module);

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
      this.app.locals.env.ES_REASON.push(`[INIT] value for ES_HOST variable in config: [false]`);
      this.app.logger.log('warn', `[INIT] No value for ES_HOST variable in config - data will NOT be saved!`);
    } else {
      try {
        this.waitLoop(attempt, attempts);
      } catch (e) {
        this.app.locals.env.ES_REASON.push(`[INIT] Error setting up Elastic! Data will be saved to ES: [false]! Error: ${e}`);
        logger.log('error', `[INIT] Error setting up Elastic! Data will NOT be saved to ES!`, e);
      }
    }
  }

  waitLoop(attempt = 1, attempts = 5) {
    logger.log('info', `[INIT] Checking status of Kibana and Elasticsearch [attempt # ${attempt} of 5]`);
    this.waitES()
      .then(waitResults => {
        if (!waitResults) {
          if (attempt < attempts) {
            logger.log('info', `[INIT] Waiting ${this.app.locals.env.ES_TIMEOUT / 1000} seconds to check status of ` +
              `Kibana and Elasticsearch again ...`);
            setTimeout(async () => {
              if (attempt < attempts && !waitResults) {
                waitResults = this.waitLoop(attempt + 1);
              } else if (!waitResults) {
                this.app.locals.env.ES_REASON.push(
                  `[INIT] Response from Elasticsearch and or Kibana: [false] - are they running? Please check ` +
                    `[${this.app.locals.env.ES_HOST}:${this.app.locals.env.ES_PORT}]`);
              }
            }, this.app.locals.env.ES_TIMEOUT);
          } else {
            logger.log('warn', 'Could not connect to Kibana or Elasticsearch!\nPlease check your config and/or ' +
              'check the health of the elastic cluster!\nThe Timings API is running at ' +
              `[http://${this.app.locals.env.HOST}:${this.app.locals.env.HTTP_PORT}] but data will NOT be saved to Elasticsearch`
            );
          }
        } else {
          logger.log('info', this.app.locals.env.ES_REASON);
          if (this.app.locals.env.ES_ACTIVE === true) {
            logger.log('info', `\n${'='.repeat(100)}\nThe Timings API is running at ` +
              `[http://${this.app.locals.env.HOST}:${this.app.locals.env.HTTP_PORT}]\n${'='.repeat(100)}`
            );
          }
        }
      });
  }

  async waitES() {
    const kbStatus = await this.checkKBStatus();
    if (['green', 'available'].includes(this.app.locals.env.KB_STATUS)) {
      await this.checkESStatus();
      if (this.app.locals.env.ES_ACTIVE) {
        if (this.app.locals.esUpgrade === true) {
          // Forced upgrade --es-upgrade flag is set
          await this.upgrade();
          return kbStatus;
        }
        // Check for necessary ES upgrades
        const upgrades = await this.checkUpgrade();
        if (upgrades.type && typeof this[upgrades.type] === 'function') {
          const response = this[upgrades.type]();
          if (!response.ok) {
            this.app.locals.env.ES_REASON.push(
              `[ELASTIC] Upgrade failed ... Elasticsearch will NOT be active and data will not be saved!`
            );
            this.app.locals.env.ES_ACTIVE = false;
          }
        }
      }
    }
    return ['green', 'available'].includes(this.app.locals.env.KB_STATUS);
  }

  async checkKBStatus() {
    const healthResult = await this.kb.getKBStatus();
    this.app.locals.env.KB_VERSION = healthResult?.version?.number || 'unknown';
    this.app.locals.env.KB_BUILD = healthResult?.version?.build_number || 'unknown';
    this.app.locals.env.KB_STATUS = healthResult?.status?.overall?.state || healthResult?.status?.overall?.level || 'unknown';
    this.app.locals.env.KB_INDEX_VERSION = healthResult?.version?.number || '0.0.0';
    this.app.locals.env.KB_INDEX_MAJOR = parseInt(this.app.locals.env.KB_INDEX_VERSION.substring(0, 1), 10);
    if (Array.isArray(healthResult?.status?.statuses)) {
      // Elastic version < 8.x - status is green/yellow/red
      const esStatus = healthResult?.status?.statuses.filter(s => s.id.indexOf('core:elasticsearch') === 0);
      if (esStatus.length > 0) {
        this.app.locals.env.ES_STATUS = esStatus[0].state || 'unknown';
        if (['green', 'yellow'].includes(this.app.locals.env.ES_STATUS)) {
          this.app.locals.env.ES_ACTIVE = true;
          this.app.locals.env.ES_REASON.push(
            `[ELASTIC] Elasticsearch status ok: [${['green', 'yellow'].includes(this.app.locals.env.ES_STATUS)}]`);
        }
      }
    } else if (healthResult?.status?.core?.elasticsearch) {
      // Elastic stack version 8.x - status is now in the 'level' field and should be 'available'
      this.app.locals.env.ES_STATUS = healthResult?.status?.core.elasticsearch.level || 'unknown';
      if (this.app.locals.env.ES_STATUS === 'available') {
        this.app.locals.env.ES_ACTIVE = true;
        this.app.locals.env.ES_REASON.push(
          `[ELASTIC] Elasticsearch status ok: [${this.app.locals.env.ES_STATUS === 'available'}]`);
      }

    } else this.app.locals.env.ES_STATUS = 'unknown';

    // const healthResult = await this.es.healthy(`${this.app.locals.env.ES_TIMEOUT / 10}s`, 'yellow');
    if (['green', 'available'].includes(this.app.locals.env.KB_STATUS)) {
      this.app.locals.env.ES_REASON.push(`[KIBANA] Kibana status ok: [true]`);
    } else {
      this.app.locals.env.ES_REASON.push(`[KIBANA] Kibana status ok: [false] - ` +
        `Please check [${this.app.locals.env.ES_PROTOCOL}://${this.app.locals.env.KB_HOST}:${this.app.locals.env.KB_PORT}]`);
    }
    return healthResult;
  }

  async checkESStatus() {
    if (['green', 'yellow', 'available'].includes(this.app.locals.env.ES_STATUS)) {
      this.app.locals.env.ES_ACTIVE = true;
      const info = await this.es.info();
      const version = info?.version?.number;
      if (!version) {
        this.app.locals.env.ES_REASON.push(
          `[ELASTIC] Version found for Elasticsearch: [false] - does your version match the client? ` +
          `Please check [${this.app.locals.env.ES_PROTOCOL}://${this.app.locals.env.ES_HOST}:${this.app.locals.env.ES_PORT}]`
        );
        this.app.locals.env.ES_ACTIVE = false;
      } else {
        const templateVersion = await this.es.getTemplateVersion();
        this.app.locals.env.CURR_VERSION = semver.valid(templateVersion) || null;
        this.app.locals.env.NEW_VERSION = semver.valid(this.app.locals.env.APP_VERSION) || this.app.locals.env.CURR_VERSION;
        this.app.locals.env.ES_VERSION = version;
        this.app.locals.env.ES_VERSION_INFO = info.version;
        this.app.locals.env.ES_CLUSTER = info.cluster_name;
        this.app.locals.env.ES_MAJOR = parseInt(version.substring(0, 1), 10);
        this.app.locals.env.ES_ACTIVE = this.es.clientVersionMajor === this.app.locals.env.ES_MAJOR;
        this.app.locals.env.ES_REASON.push(`[ELASTIC] NPM client [v.${this.es.clientVersion}] and ` +
        `Elasticsearch [v.${this.app.locals.env.ES_VERSION}] - match: [${this.app.locals.env.ES_ACTIVE}]`);
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
        info: `Elasticsearch is not in use!`,
        reason: this.app.locals.env.ES_REASON
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
    // There is reason to upgrade but the '--es-upgrade' is not set! Skip upgrade and set ES to inactive!
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
        logger.log('info', `[UPGRADE] updating index template [${this.app.locals.env.INDEX_PERF}] ...`);
        await this.es.putTemplate(this.app.locals.env.INDEX_PERF, esTemplate);
        logger.log('info', `[UPGRADE] index template [${this.app.locals.env.INDEX_PERF}] updated successfully!`);
        response.ok = true;
      } catch (e) {
        response.ok = false;
        response.err = e;
      }
    } else {
      logger.log('warn',
        `Elasticsearch is not in use - cannot upgrade template [${this.app.locals.env.INDEX_PERF}*]`);
    }
    return response;
  }

  async checkUpgrade() {
    const response = {
      action: 'Upgrade check',
      info: [],
      upgrade: false
    };

    if (this.app.locals.env.ES_ACTIVE === true) {
      // Check the API version that created the current 'cicd-perf' template (if it's present)
      response.currVersion = this.app.locals.env.CURR_VERSION;
      response.newVersion = this.app.locals.env.NEW_VERSION;
      // Check if this is a first-time install - if so, create the 'cicd-perf' template and set the default index-pattern
      if (!this.app.locals.env.CURR_VERSION) {
        logger.log('info', `[ELASTIC] New install - installing templates and sample data`);
        response.upgrade = true;
        response.type = 'newInstall';
      } else if (
        semver.lt(this.app.locals.env.CURR_VERSION, this.app.locals.env.NEW_VERSION) ||
        this.app.locals.env.KB_INDEX_MAJOR < this.app.locals.env.ES_MAJOR
      ) {
        this.app.locals.env.ES_REASON.push(
          `[UPGRADE] API version: Current: [${this.app.locals.env.CURR_VERSION}] - New: [${this.app.locals.env.NEW_VERSION}] - ` +
            `match: [${semver.eq(this.app.locals.env.CURR_VERSION, this.app.locals.env.NEW_VERSION)}]`);
        this.app.locals.env.ES_REASON.push(
          `[UPGRADE] KB major version: ${this.app.locals.env.KB_INDEX_MAJOR} - ` +
            `ES major version: ${this.app.locals.env.ES_MAJOR} - ` +
            `match: [${this.app.locals.env.KB_INDEX_MAJOR === this.app.locals.env.ES_MAJOR}]`);
        response.upgrade = true;
        response.type = 'upgrade';
      }
    } else {
      this.app.locals.env.ES_REASON.push(
        `[ELASTIC] Elasticsearch is not in use - checking for upgrades: [false]`);
    }
    response.info = this.app.locals.env.ES_REASON;
    return response;
  }
}


module.exports.Elastic = Elastic;
