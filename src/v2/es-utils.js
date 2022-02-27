/**
* Created by mverkerk on 10/20/2016.
*/
const fs = require('fs');
const path = require('path');
const elasticsearch = require('@elastic/elasticsearch');
const nconf = require('nconf');
const waitOn = require('wait-port');
const logger = require('../../log.js');
const kbImportJson = require('../../.kibana_items.json');
const sampleData = require('../../.sample_data.json');

const esPkg = fs.readFileSync(
  path.join(__dirname, '..', '..', 'node_modules', '@elastic', 'elasticsearch', 'package.json'), 'utf8'
);
const { version } = JSON.parse(esPkg);

/* eslint no-sync: 0 */
class ESClass {
  // Class to handle interactions with elasticsearch
  constructor() {
    this.env = nconf.get('env');

    // Basic ES config - no auth
    const esConfig = {
      node: nconf.get('env:ES_PROTOCOL') + '://' + nconf.get('env:ES_HOST') + ':' + nconf.get('env:ES_PORT'),
      requestTimeout: nconf.get('env:ES_TIMEOUT') || 5000,
      log: 'error'
    };

    // Check if user/passwd are provided - configure basic auth
    if (nconf.get('env:ES_USER') && nconf.get('env:ES_PASS')) {
      esConfig.auth = {
        username: nconf.get('env:ES_USER'),
        password: nconf.get('env:ES_PASS')
      };
    }

    // Check if SSL cert/key are provided - configure SSL
    if (nconf.get('env:ES_SSL_CERT') && nconf.get('env:ES_SSL_KEY')) {
      // Cert overwrites basic auth! Delete the 'auth' key
      esConfig.host = [
        {
          ssl: {
            cert: fs.readFileSync(nconf.get('env:ES_SSL_CERT')).toString(),
            key: fs.readFileSync(nconf.get('env:ES_SSL_KEY')).toString(),
            rejectUnauthorized: true
          }
        }
      ];
    }

    // Create the ES client!
    this.client = new elasticsearch.Client(esConfig);
    this.clientVersion = version;
    this.clientVersionMajor = parseInt(version.substring(0, 1), 10);
  }

  esOpts(itemType, id) {
    let _type;
    let _id;
    switch (parseInt(nconf.get('env:ES_MAJOR'), 10)) {
      case 5:
        _type = itemType;
        _id = id;
        break;
      case 6:
        _type = 'doc';
        _id = `${itemType}:${id}`;
        break;
      case 7:
      case 8:
      default:
        _type = '_doc';
        _id = `${itemType}:${id}`;
    }
    return ({ _type, type: itemType, _id });
  }

  checkEsResponse(response) {
    return response.body || response.body === '' ? response.body : response;
  }

  async healthy(timeout = '90s', status = 'green') {
    try {
      await this.client.cluster.health({ level: 'cluster', wait_for_status: status, timeout: timeout });
      this.logElastic('info', `[HEALTHCHECK] status [${status}] of host [${nconf.get('env:ES_HOST')}] is OK!`);
    } catch (err) {
      this.logElastic('error', `Could not check cluster health for host [${nconf.get('env:ES_HOST')}]! Error: ${err}`);
    }
  }

  async waitPort(timeoutMs = 120000, host, port) {
    this.logElastic('info', `[PORTCHECK] waiting for host [${nconf.get('env:ES_HOST')}:${nconf.get('env:ES_PORT')}] ...`);
    if (!await waitOn({ host: host, port: port, output: 'silent', timeout: timeoutMs })) {
      throw new Error(`[PORTCHECK] - timeout on port [${nconf.get('env:ES_PORT')}]`);
    }
  }

  async putTemplate(name, body) {
    const params = { name: name, body: body };
    if (nconf.get('env:ES_MAJOR') === 6) {
      params.include_type_name = false;
    }
    try {
      let result;
      if (parseInt(nconf.get('env:ES_MAJOR'), 10) > 6) {
        result = await this.client.indices.putIndexTemplate(params);
      } else {
        result = await this.client.indices.putTemplate(params);
      }
      this.logElastic('info', `[TEMPLATE] created/updated [${name}] success!`);
      return result;
    } catch (e) {
      this.logElastic('error', `[TEMPLATE] create [${name}] failure! Error: ${e}`);
    }
  }

  async getTemplate(name) {
    const params = { name: name };
    if (nconf.get('env:ES_MAJOR') === 6) {
      params.include_type_name = false;
    }
    // For ES 5/6 - use legacy '_template'
    if (parseInt(nconf.get('env:ES_MAJOR'), 10) > 6) {
      // For ES 7.x - use the newer '_index_template'
      return this.checkEsResponse(await this.client.indices.getIndexTemplate(params));
    }
    return this.checkEsResponse(await this.client.indices.getTemplate(params));
  }

  async exists(index, type, id) {
    const existsBody = {
      index: index,
      id: id,
      type: this.esOpts(type)._type
    };
    if (nconf.get('env:ES_MAJOR') === 6) {
      existsBody.include_type_name = false;
    }
    return this.checkEsResponse(await this.client.exists(existsBody));
  }

  async search(index, type, body) {
    const searchBody = {
      index: index,
      body: body,
      type: this.esOpts(type)._type
    };
    return this.checkEsResponse(await this.client.search(searchBody));
  }

  async getIncides(index) {
    try {
      const searchBody = {
        index: index,
        format: 'json'
      };
      if (nconf.get('env:ES_MAJOR') === 6) {
        searchBody.include_type_name = false;
      }
      return this.checkEsResponse(await this.client.cat.indices(searchBody));
    } catch (e) {
      return null;
    }
  }

  async info() {
    return this.checkEsResponse(await this.client.info());
  }

  async getKBVer() {
    let index;
    try {
      index = this.checkEsResponse(await this.client.indices.getAlias({ name: (nconf.get('env:KB_INDEX') || '.kibana') }));
      index = Object.keys(index)[0];
    } catch (err) {
      if (err) index = '.kibana';
    }

    if (await this.client.indices.exists({ index: index })) {
      const settings = this.checkEsResponse(
        await this.client.indices.getSettings({ index: index, include_defaults: true, human: true })
      );
      if (Object.keys(settings).length > 0) {
        if (settings[index]) {
          return settings[index].settings.index.version.created_string;
        }
        return (settings[Object.keys(settings)[0]].settings.index.version.created_string || '0');
      }
    }
    return '0';
  }

  async getTemplateVersion(esVersion) {
    try {
      const currTemplate = this.checkEsResponse(await this.getTemplate(nconf.get('env:INDEX_PERF')));
      if (
        currTemplate[nconf.get('env:INDEX_PERF')] || (currTemplate.index_templates && currTemplate.index_templates.length > 0)
      ) {
        switch (esVersion) {
          case 5:
            return currTemplate[nconf.get('env:INDEX_PERF')].mappings._default_._meta.api_version;
          case 6:
            return currTemplate[nconf.get('env:INDEX_PERF')].mappings._meta.api_version;
          case 7:
            return currTemplate.index_templates[0].index_template.template.mappings._meta.api_version;
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
        throw new Error(`Unable to get Template ${nconf.get('env:INDEX_PERF')}! Error: ${err}`);
      }
    }
  }

  async index(index, type, id, body) {
    try {
      const sendBody = {
        index: index,
        body: body,
        type: this.esOpts(type)._type,
        ...id && { id: id }
      };
      return this.checkEsResponse(await this.client.index(sendBody));
    } catch (err) {
      this.logElastic('error', `Unable to index record! Error: ${err}`);
    }
  }

  async legacyBulk(docs) {
    const response = this.checkEsResponse(await this.client.bulk({
      body: docs
    }));
    return response.statusCode < 300;
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

  async esImport() {
    const response = {
      info: [],
      ok: false
    };
    try {
      const replaceDate = new Date().toISOString().split('T')[0];
      const versionData = parseInt(nconf.get('env:ES_MAJOR'), 10) < 6 ? sampleData.v5 : sampleData.latest;
      const data = JSON.parse(JSON.stringify(versionData).replace(/==date==/g, replaceDate));
      for (const index of Object.keys(data)) {
        const item = data[index];
        const type = this.esOpts(item._type)._type;
        await this.index(item._index, type, item._id, item._source);
      }
      response.ok = true;
      response.info.push('[IMPORT] Successfully imported sample data into elasticsearch! You can now find the sample data in ' +
        'Elasticsearch indices [cicd-*-sample] and visualize them in Kibana');
      this.logElastic('info', '[IMPORT] Successfully imported sample data into elasticsearch!');
    } catch (err) {
      if (err) {
        response.ok = false;
        response.info.push(`Could not import sample data into Elasticsearch! Error: ${err}`);
        this.logElastic('error', response.info);
      }
    }
    return response;
  }

  async kbImport() {
    const response = {
      info: [],
      ok: false
    };
    try {
      for (const index of Object.keys(kbImportJson)) {
        let item = kbImportJson[index];
        const title = item._source.title;
        if (item._type === 'index-pattern' && item._id === 'cicd-perf*') {
          const apiHost = (nconf.get('env:HTTP_PORT') !== 80)
            ? `${nconf.get('env:HOST')}:${nconf.get('env:HTTP_PORT')}`
            : nconf.get('env:HOST');
          item._source.fieldFormatMap = item._source.fieldFormatMap.replace('__api__hostname', apiHost.toLowerCase());
        }
        item = this.upgradeConvert(item);
        const indexResponse = await this.index((nconf.get('env:KB_INDEX') || '.kibana'), item._type, item._id, item._source);
        this.checkImportErrors(
          indexResponse,
          'import [' + item._type + ']', title
        );
      }
      response.ok = true;
      response.info.push(`[IMPORT] Successfully created/updated ${Object.keys(kbImportJson).length} Kibana item(s)! ` +
        'You can now enjoy dashboards and visualizations in Kibana!');
      this.logElastic('info', `[IMPORT] Created/updated ${Object.keys(kbImportJson).length} Kibana item(s)!`);
    } catch (err) {
      if (err) {
        response.ok = false;
        response.info.push(`Could not create/update Kibana item(s)! Error: ${err}`);
        this.logElastic('error', response.info);
      }
    }
    return response;
  }

  async checkImportErrors(response, job, item) {
    if (response.hasOwnProperty('error')) {
      this.logElastic('error', `[IMPORT] ${job} - item: ${item} - ERROR! - reason: ${response.error.reason}`);
    } else {
      this.logElastic('debug', `[IMPORT] ${job} - item: ${item} - ${response.result.toUpperCase() || 'SUCCESS'}!`);
    }
  }

  async setDefaultIndex() {
    const { _type, type, _id } = this.esOpts('config', nconf.get('env:ES_VERSION'));
    const body = {};
    switch (nconf.get('env:ES_MAJOR')) {
      case 5:
        body.doc = {
          defaultIndex: `${nconf.get('env:INDEX_PERF')}*`
        };
        break;
      case 6:
      case 7:
      default:
        body[_type] = {
          [type]: {
            defaultIndex: `${nconf.get('env:INDEX_PERF')}*`
          },
          type: type,
          updated_at: new Date().toISOString()
        };
    }
    const sendBody = {
      id: _id,
      index: nconf.get('env:KB_INDEX') || '.kibana',
      type: _type,
      refresh: true,
      body: body
    };
    return this.checkEsResponse(await this.client.update(sendBody));
  }

  upgradeConvert_old(item) {
    if (parseInt(nconf.get('env:ES_MAJOR'), 10) > 5 && parseInt(nconf.get('env:ES_MAJOR'), 10) < 7) {
      item._id = item._type + ':' + item._id;
      item._type + ':' + item._id;
      const _sourceTmp = {};
      _sourceTmp[item._type] = item._source;
      item._source = _sourceTmp;
    } else {
      item.type = item._type;
      item._id = item._type + ':' + item._id;
      item._source = {
        [item._type]: item._source
      };
      item._type = '_doc';
    }
    return item;
  }

  upgradeConvert(item) {
    const esVersion = parseInt(nconf.get('env:ES_MAJOR'), 10);
    const { _type, type, _id } = this.esOpts(item._type, item._id);
    item._type = _type;
    item._id = _id;
    if (esVersion > 5) {
      item._source = {
        [type]: item._source,
        type: type
      };
    }
    return item;
  }

  logElastic(level, msg) {
    logger[level](`Elasticsearch - UTILS - ${msg}`);
  }
}

module.exports.ESClass = ESClass;
