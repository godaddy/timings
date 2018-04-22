/**
* Created by mverkerk on 10/20/2016.
*/
const fs = require('fs');
const elasticsearch = require('elasticsearch');
const nconf = require('nconf');
const waitOn = require('wait-port');
const logger = require('../../log.js');

/* eslint no-sync: 0 */
class ESClass {
  // Class to handle interactions with elasticsearch
  constructor() {
    this.env = nconf.get('env');

    // Basic ES config - no auth
    const esConfig = {
      host: this.env.ES_PROTOCOL + '://' + this.env.ES_HOST + ':' + this.env.ES_PORT,
      requestTimeout: 5000,
      log: 'error'
    };

    // Check if user/passwd are provided - configure basic auth
    if (this.env.ES_USER && this.env.ES_PASS) {
      // esConfig.host[0].auth = (this.env.ES_USER || '') + ':' + (this.env.ES_PASS || '');
      esConfig.host = this.env.ES_PROTOCOL + '://' + this.env.ES_USER + ':' + this.env.ES_PASS + '@' +
        this.env.ES_HOST + ':' + this.env.ES_PORT;
    }

    // Check if SSL cert/key are provided - configure SSL
    if (this.env.ES_SSL_CERT && this.env.ES_SSL_KEY) {
      // Cert overwrites basic auth! Delete the 'auth' key
      esConfig.host = [
        {
          ssl: {
            cert: fs.readFileSync(this.env.ES_SSL_CERT).toString(),
            key: fs.readFileSync(this.env.ES_SSL_KEY).toString(),
            rejectUnauthorized: true
          }
        }
      ];
    }

    // Create the ES client!
    this.client = new elasticsearch.Client(esConfig);
  }

  async healthy(timeoutMs = 90000, status = 'green') {
    await this.client.cluster.health({ level: 'cluster', waitForStatus: status, requestTimeout: timeoutMs });
    this.logElastic('info', `[HEALTHCHECK] status [${status}] is OK!`);
  }

  async waitPort(timeoutMs = 120000, host, port) {
    this.logElastic('info', `[PORTCHECK] waiting for port [${this.env.ES_PORT}] ...`);
    if (!await waitOn({ host: host, port: port, output: 'silent', timeout: timeoutMs })) {
      throw new Error(`[PORTCHECK] - timeout on port [${this.env.ES_PORT}]`);
    }
  }

  async info(timeoutMs = 60000) {
    const response = await this.client
      .info({ requestTimeout: timeoutMs });
    // Update ES version in nconf
    nconf.set('env:ES_VERSION', response.version.number);
    nconf.set('env:ES_MAJOR', parseInt(response.version.number.substr(0, 1), 10));
    this.env = nconf.get('env');
    this.logElastic('info', `[INFO] found elastic v${this.env.ES_VERSION} ...`);
  }

  putTemplate(name, body) {
    this.client
      .indices
      .putTemplate({ name: name, body: body });
    this.logElastic('info', `[TEMPLATE] created/updated [${name}]`);
  }

  async getTemplate(name) {
    if (await this.client
      .indices
      .existsTemplate({ name: name })) {
      return await this.client
        .indices
        .getTemplate({ name: name });
    }
    return;
  }

  async defaultIndex(name) {
    let id = this.env.ES_VERSION;
    let body = { defaultIndex: name };
    let type = 'config';
    if (parseInt(this.env.ES_MAJOR, 10) > 5) {
      id = 'config:' + this.env.ES_VERSION;
      type = 'doc';
      body = {
        type: 'config',
        config: {
          defaultIndex: name
        }
      };
    }
    await this.client
      .index({ index: (this.env.KB_INDEX || '.kibana'), type: type, id: id, body: body });
    this.logElastic('info', `[DEFAULT] Default Index set to [${name}]`);
  }

  async delIndex(index) {
    await this.client
      .indices
      .delete({ index: index });
    this.logElastic('info', `[DELETE] successfully deleted index [${index}]!`);
  }

  async delDocById(index, type, id) {
    let exists = false;
    if (id) {
      exists = await this.client
        .exists({ index: index, type: type, id: id });
    }
    if (exists) {
      return await this.client
        .delete({ index: index, type: type, id: id });
    }
    return { _id: id, result: 'not_exists', statusCode: 200, reason: 'Does not exist' };
  }

  async reindex(src, suffix, script) {
    const dst = src + suffix;
    const opts = { body: { source: { index: src }, dest: { index: dst }}};
    if (script && typeof script === 'object') {
      opts.body.script = script;
    }
    await this.client.reindex(opts);
    await this.delIndex(src);
    await this.putAlias(dst, src);
    this.logElastic('info', `[REINDEX] successfully reindexed [${src}] to [${dst}]!`);
  }

  async exists(index, type, id) {
    return await this.client
      .exists({
        index: index,
        type: (this.env.ES_MAJOR > 5) ? 'doc' : type,
        id: id
      });
  }

  async search(index, type, body) {
    return await this.client
      .search({
        index: index,
        type: (this.env.ES_MAJOR > 5) ? 'doc' : type,
        body: body
      });
  }

  async getSettings(index) {
    const response = await this.client
      .indices
      .getSettings({ index: index, includeDefaults: true, human: true });
    return response;
  }

  async putAlias(index, alias) {
    await this.client
      .indices
      .putAlias({ index: index, name: alias });
    this.logElastic('info', `[ALIAS] successfully added alias [${alias}] to [${index}]!`);
  }

  async getAlias(alias) {
    return await this.client
      .indices
      .getAlias({ name: alias });
  }

  async getKBVer() {
    let index;
    try {
      index = await this.getAlias((this.env.KB_INDEX || '.kibana'));
    } catch (err) {
      if (err) index = '.kibana';
    }
    if (typeof index === 'object') index = Object.keys(index)[0];
    const exists = await this.client
      .indices
      .exists({ index: index });
    if (exists) {
      const settings = await this.client
        .indices
        .getSettings({ index: index, includeDefaults: true, human: true });
      return (settings[index].settings.index.version.created_string || '0');
    }
    return '0';
  }

  async getTmplVer(esVersion) {
    try {
      const currTemplate = await this.getTemplate(this.env.INDEX_PERF);
      const type = esVersion > 5 ? 'doc' : '_default_';
      return currTemplate[this.env.INDEX_PERF].mappings[type]._meta.api_version;
    } catch (err) {
      if (err) {
        return 0;
      }
    }
  }

  async index(index, type, id, body) {
    if (parseInt(this.env.ES_MAJOR, 10) > 5) {
      body.type = type;
      type = 'doc';
    }
    let exists = false;
    if (id) {
      exists = await this.client
        .exists({ index: index, type: type, id: id });
    }
    if (!exists || nconf.get('es_upgrade') === true) {
      // item doesn not exists yet or we're doing a 'force' update
      return await this.client
        .index({ index: index, type: type, id: id, body: body });
    }
    return { _id: id, result: 'exists', statusCode: 200, reason: 'Already exists' };
  }

  async bulk(body) {
    const response = await this.client
      .bulk({ body: body });
    return (response.items.length > 0);
  }

  async kbImport(importJson) {
    for (const index of Object.keys(importJson)) {
      let item = importJson[index];
      const title = item._source.title;
      if (item._source === 'delete_this') {
        this.checkImportErrors(
          await this.delDocById((this.env.KB_INDEX || '.kibana'), item._type, item._id),
          'delete [' + item._type + ']',
          item._id
        );
      } else {
        if (item._type === 'index-pattern' && item._id === 'cicd-perf*') {
          const apiHost = (this.env.HTTP_PORT !== 80) ? this.env.HOST + ':' + this.env.HTTP_PORT : this.env.HOST;
          item._source.fieldFormatMap = item._source.fieldFormatMap.replace('__api__hostname', apiHost.toLowerCase());
        }
        item = this.upgradeConvert(item);
        this.checkImportErrors(
          await this.index((this.env.KB_INDEX || '.kibana'), item._type, item._id, item._source),
          'import [' + item._type + ']', title
        );
      }
    }
    this.logElastic('info', `[IMPORT] Created/updated ${Object.keys(importJson).length} Kibana item(s)!`);
  }

  upgradeConvert(item) {
    if (parseInt(nconf.get('env:ES_MAJOR'), 10) > 5) {
      item._id = item._type + ':' + item._id;
      item._type + ':' + item._id;
      const _sourceTmp = {};
      _sourceTmp[item._type] = item._source;
      item._source = _sourceTmp;
    }
    return item;
  }

  async checkImportErrors(response, job, item) {
    if (response.hasOwnProperty('error')) {
      this.logElastic('error', `[IMPORT] ${job} - item: ${item} - ERROR! - reason: ${response.error.reason}`);
    } else {
      this.logElastic('debug', `[IMPORT] ${job} - item: ${item} - ${response.result.toUpperCase() || 'SUCCESS'}!`);
    }
  }

  logElastic(level, msg) {
    logger[level](`[Elasticsearch] - ${msg}`);
  }
}

module.exports.ESClass = ESClass;
