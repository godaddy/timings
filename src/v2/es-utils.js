/**
* Created by mverkerk on 10/20/2016.
*/
const fs = require('fs');
const elasticsearch = require('@elastic/elasticsearch');
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
      node: this.env.ES_PROTOCOL + '://' + this.env.ES_HOST + ':' + this.env.ES_PORT,
      requestTimeout: this.env.ES_TIMEOUT || 5000,
      log: 'error'
    };

    // Check if user/passwd are provided - configure basic auth
    if (this.env.ES_USER && this.env.ES_PASS) {
      esConfig.auth = {
        username: this.env.ES_USER,
        password: this.env.ES_PASS
      };
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

  async healthy(timeout = '90s', status = 'green') {
    try {
      await this.client.cluster.health({ level: 'cluster', wait_for_status: status, timeout: timeout });
      this.logElastic('info', `[HEALTHCHECK] status [${status}] of host [${this.env.ES_HOST}] is OK!`);
    } catch (err) {
      this.logElastic('error', `Could not check cluster health for host [${this.env.ES_HOST}]! Error: ${err}`);
    }
  }

  async waitPort(timeoutMs = 120000, host, port) {
    this.logElastic('info', `[PORTCHECK] waiting for host [${this.env.ES_HOST}] at port [${this.env.ES_PORT}] ...`);
    if (!await waitOn({ host: host, port: port, output: 'silent', timeout: timeoutMs })) {
      throw new Error(`[PORTCHECK] - timeout on port [${this.env.ES_PORT}]`);
    }
  }

  async info() {
    const response = await this.client.info();
    // Update ES version in nconf
    const version = response.body.version.number;
    nconf.set('env:ES_VERSION', version);
    nconf.set('env:ES_MAJOR', parseInt(version.substr(0, 1), 10));
    this.env = nconf.get('env');
    this.logElastic('info', `[INFO] found elastic v${this.env.ES_VERSION} ...`);
  }

  async putTemplate(name, body) {
    try {
      if (parseInt(this.env.ES_MAJOR, 10) > 6) {
        await this.client.indices.putIndexTemplate({ name: name, body: body });
      } else {
        await this.client.indices.putTemplate({ name: name, body: body });
      }
      this.logElastic('info', `[TEMPLATE] created/updated [${name}]`);
    } catch (e) {
      this.logElastic('error', `[TEMPLATE] create failure! Error: ${e}`);
    }
  }

  async getTemplate(name) {
    if (parseInt(this.env.ES_MAJOR, 10) > 6) {
      // For ES 7.x - use the newer '_index_template'
      if (await this.client.indices.existsIndexTemplate({ name: name })) {
        return await this.client.indices.getIndexTemplate({ name: name });
      }
    }
    // For ES 5/6 - use legacy '_template'
    if (await this.client.indices.existsTemplate({ name: name })) {
      return await this.client.indices.getTemplate({ name: name });
    }
    return;
  }

  async defaultIndex(name) {
    let id = this.env.ES_VERSION;
    let body = { defaultIndex: name };
    let type = 'config';
    if (parseInt(this.env.ES_MAJOR, 10) > 5) {
      id = 'config:' + this.env.ES_VERSION;
      type = (parseInt(this.env.ES_MAJOR, 10) > 6) ? '_doc' : 'doc';
      body = {
        type: 'config',
        config: {
          defaultIndex: name
        }
      };
    }
    await this.client.index({ index: (this.env.KB_INDEX || '.kibana'), type: type, id: id, body: body });
    this.logElastic('info', `[DEFAULT] Default Index set to [${name}]`);
  }

  async delIndex(index) {
    await this.client
      .indices
      .delete({ index: index });
    this.logElastic('info', `[DELETE] successfully deleted index [${index}]!`);
  }

  async delDocById(index, type, id) {
    if (await this.client
      .exists({ index: index, type: type, id: id })
    ) {
      return await this.client
        .delete({ index: index, type: type, id: id });
    }
    return { _id: id, result: 'not_exists', statusCode: 200, reason: 'Does not exist' };
  }

  async reindex(src, suffix, script) {
    const dst = src + suffix;
    const opts = { body: { source: { index: src }, dest: { index: dst } } };
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
    index = Object.keys(index.body)[0];

    if (await this.client
      .indices
      .exists({ index: index })
    ) {
      const settings = await this.client
        .indices
        .getSettings({ index: index, includeDefaults: true, human: true });
      return (settings.body[index].settings.index.version.created_string || '0');
    }
    return '0';
  }

  async getTmplVer(esVersion) {
    try {
      const currTemplate = await this.getTemplate(this.env.INDEX_PERF);
      if (currTemplate.body) {
        switch (esVersion) {
          case 5:
            return currTemplate.body[this.env.INDEX_PERF].mappings._default._meta.api_version;
          case 6:
            return currTemplate.body[this.env.INDEX_PERF].mappings.doc._meta.api_version;
          case 7:
            return currTemplate.body.index_templates[0].index_template.template.mappings._meta.api_version;
          default:
            return false;
        }
      }
    } catch (err) {
      if (err.statusCode === 404) {
        // cicd-perf template doesn't exist - new installation?
        return null;
      }
      if (err) {
        throw new Error(`Unable to get Template ${this.env.INDEX_PERF}! Error: ${err}`);
      }
    }
  }

  async index(index, type, id, body) {
    if (parseInt(this.env.ES_MAJOR, 10) > 5) {
      type = (parseInt(this.env.ES_MAJOR, 10) > 6) ? '_doc' : 'doc';
    }
    const sendBody = {
      index: index,
      body: body,
      ...parseInt(this.env.ES_MAJOR, 10) < 7 && { type: type },
      ...id && { id: id }
    };
    try {
      return await this.client.index(sendBody);
    } catch (err) {
      this.logElastic('error', `Unable to index record! Error: ${err}`);
    }
  }

  async bulk(docs) {
    const response = await this.client.helpers.bulk({
      datasource: docs,
      onDocument(document) {
        const rec = {
          index: {
            _index: document._index
          }
        };
        if (document._type) {
          rec.index._type = document._type;
        }
        delete document._index;
        delete document._type;
        return rec;
      },
      onDrop(doc) {
        console.error(`ERROR: elastic dropped document: ${JSON.stringify(doc, null, 2)}`);
      },
      retries: 3,
      refreshOnCompletion: true
    }, {
      ignore: [404],
      maxRetries: 3
    });
    return response.successful > 0;
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
    logger[level](`Elasticsearch - UTILS - ${msg}`);
  }
}

module.exports.ESClass = ESClass;
