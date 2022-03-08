/**
* Created by mverkerk on 10/20/2016.
*/
const fs = require('fs');
const path = require('path');
const elasticsearch = require('@elastic/elasticsearch');
const logger = require('../log')(module.id);

const esPkg = fs.readFileSync(
  path.join(__dirname, '..', '..', 'node_modules', '@elastic', 'elasticsearch', 'package.json'), 'utf8'
);
const { version } = JSON.parse(esPkg);

/* eslint no-sync: 0 */
class ESClass {
  // Class to handle interactions with elasticsearch
  constructor(app) {
    this.app = app;
    this.env = this.app.locals.env;
    // Create the ES client!
    this.client = this.esClient();
    this.clientVersion = version;
    this.clientVersionMajor = parseInt(version.substring(0, 1), 10);
  }

  esClient() {
    if (this.app.locals.env.ES_HOST) {
      // Basic ES config - no auth
      const esConfig = {
        node: this.app.locals.env.ES_PROTOCOL + '://' + this.app.locals.env.ES_HOST + ':' + this.app.locals.env.ES_PORT,
        requestTimeout: this.app.locals.env.ES_TIMEOUT || 5000,
        log: 'error'
      };

      // Check if user/passwd are provided - configure basic auth
      if (this.app.locals.env.ES_USER && this.app.locals.env.ES_PASS) {
        esConfig.auth = {
          username: this.app.locals.env.ES_USER,
          password: this.app.locals.env.ES_PASS
        };
      }

      // Check if SSL cert/key are provided - configure SSL
      if (this.app.locals.env.ES_SSL_CERT && this.app.locals.env.ES_SSL_KEY) {
        // Cert overwrites basic auth! Delete the 'auth' key
        esConfig.host = [
          {
            ssl: {
              cert: fs.readFileSync(this.app.locals.env.ES_SSL_CERT).toString(),
              key: fs.readFileSync(this.app.locals.env.ES_SSL_KEY).toString(),
              rejectUnauthorized: true
            }
          }
        ];
      }
      return new elasticsearch.Client(esConfig);
    }
  }

  async healthy(timeout = '90s', status = 'green') {
    if (!this.client) return {};
    try {
      const response = await this.client.cluster.health({ level: 'cluster', wait_for_status: status, timeout: timeout });
      logger.log('info', `[ELASTIC] status [${status}] of host ` +
        `[${this.app.locals.env.ES_HOST}://${this.app.locals.env.ES_HOST}:${this.app.locals.env.ES_PORT}] is OK!`);
      return response.body;
    } catch (err) {
      logger.log('error', `Could not check Elasticsearch cluster health for host [${this.app.locals.env.ES_HOST}]!`, err);
      return err.meta.body;
    }
  }

  async putTemplate(name, body) {
    if (!this.client) return;
    const params = { name: name, body: body };
    try {
      const response = await this.client.indices.putIndexTemplate(params);
      logger.log('info', `[TEMPLATE] created/updated [${name}] successfully!`);
      return response.body;
    } catch (err) {
      logger.log('error', `[TEMPLATE] create [${name}] failure!`, err);
    }
  }

  async getTemplate(name) {
    if (!this.client) return;
    try {
      const response = await this.client.indices.getIndexTemplate({ name: name });
      return response.body;
    } catch (err) {
      logger.log('error', `[TEMPLATE] could not get template [${name}]!`, err);
    }
  }

  async exists(index, type, id) {
    if (!this.client) return;
    try {
      const response = await this.client.exists({
        index: index,
        id: id
      });
      return response.body;
    } catch (err) {
      logger.log('error', `[INDEX] could check for index [${index}]!`, err);
    }
  }

  async search(index, type, body) {
    if (!this.client) return;
    try {
      const response = await this.client.search({
        index: index,
        body: body
      });
      return response.body;
    } catch (err) {
      logger.log('error', `[INDEX] search in index [${index}] failed!`, err);
    }
  }

  async getIncides(index) {
    if (!this.client) return;
    try {
      const response = await this.client.cat.indices({
        index: index,
        format: 'json'
      });
      return response.body;
    } catch (err) {
      if (err.statusCode === 404) {
        return null;
      }
      logger.log('error', `[INDEX] search for index [${index}] failed!`, err);
    }
  }

  async info() {
    if (!this.client) return;
    try {
      const response = await this.client.info();
      return response.body;
    } catch (err) {
      logger.log('error', `[ELASTIC] could not get ES info!`, err);
    }
  }

  async getKBVer() {
    if (!this.client) return;
    try {
      const settings = await this.client.indices.getSettings({ index: '.kibana', include_defaults: true, human: true });
      const kbIndex = Object.keys(settings.body)[0];
      const kbIndexVersion = settings.body[kbIndex]?.settings?.index?.version?.created_string;
      return kbIndexVersion;
    } catch (err) {
      logger.log('error', `[TEMPLATE] could not get Kibana Index [${this.app.locals.env.KB_INDEX}]!`, err);
    }
  }

  async getTemplateVersion() {
    if (!this.client) return;
    const indexPerf = this.app.locals.env.INDEX_PERF;
    try {
      const currTemplate = await this.client.indices.getIndexTemplate({ name: indexPerf });
      if (currTemplate.body.index_templates && currTemplate.body.index_templates.length > 0) {
        return currTemplate.body.index_templates[0].index_template?.template?.mappings?._meta?.api_version;
      }
    } catch (err) {
      if (err.statusCode === 404) {
        // cicd-perf template doesn't exist - new installation?
        return;
      }
      logger.log('error', `[TEMPLATE] could not get template [${indexPerf}]!`, err);
    }
  }

  async index(index, body, id = null) {
    if (!this.client) return;
    try {
      const params = {
        index: index,
        body: body
      };
      if (id) params.id = id;
      const response = await this.client.index(params);
      return response.body;
    } catch (err) {
      logger.log('error', `Unable to index record`, err);
    }
  }

  async bulk(docs) {
    if (!this.client) return;
    const response = await this.client.helpers.bulk({
      datasource: docs,
      onDocument(document) {
        return {
          index: {
            _index: document._index
          }
        };
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
    return response.body.successful > 0;
  }

  async esImport() {
    const sampleData = require('../../config/.sample_data.json');
    const response = {
      info: [],
      ok: false
    };
    try {
      const replaceDate = new Date().toISOString().split('T')[0];
      const data = JSON.parse(JSON.stringify(sampleData.latest).replace(/==date==/g, replaceDate));
      for (const index of Object.keys(data)) {
        const item = data[index];
        const type = '_doc';
        await this.index(item._index, type, item._id, item._source);
      }
      response.ok = true;
      response.info.push('[IMPORT] Successfully imported sample data into elasticsearch! You can now find the sample data in ' +
        'Elasticsearch indices [cicd-*-sample] and visualize them in Kibana');
      logger.log('info', '[IMPORT] Successfully imported sample data into elasticsearch!');
    } catch (err) {
      response.ok = false;
      response.info.push(`Could not import sample data into Elasticsearch - error: ${err}`);
      logger.log('error', response.info, err);
    }
    return response;
  }

  async kbImport() {
    const kbImportJson = require('../../config/.kibana_items.json');
    const response = {
      info: [],
      ok: false
    };
    try {
      for (const index of Object.keys(kbImportJson)) {
        const item = kbImportJson[index];
        const title = item._source.title;
        if (item._type === 'index-pattern' && item._id === 'cicd-perf*') {
          const apiHost = (this.app.locals.env.HTTP_PORT !== 80)
            ? `${this.app.locals.env.HOST}:${this.app.locals.env.HTTP_PORT}`
            : this.app.locals.env.HOST;
          item._source.fieldFormatMap = item._source.fieldFormatMap.replace('__api__hostname', apiHost.toLowerCase());
        }
        // Conversion for v7
        item._id = `${item._type}:${item._id}`;
        const indexResponse = await this.index((this.app.locals.env.KB_INDEX || '.kibana'), item._source, item._id);
        this.checkImportErrors(indexResponse, 'import [' + item._type + ']', title);
      }
      response.ok = true;
      response.info.push(`[IMPORT] Successfully created/updated ${Object.keys(kbImportJson).length} Kibana item(s)! ` +
        'You can now enjoy dashboards and visualizations in Kibana!');
      logger.log('info', `[IMPORT] Created/updated ${Object.keys(kbImportJson).length} Kibana item(s)!`);
    } catch (err) {
      response.ok = false;
      response.info.push(`Could not create/update Kibana item(s) - error: ${err}`);
      logger.log('error', response.info, err);
    }
    return response;
  }

  async checkImportErrors(response, job, item) {
    if (response.hasOwnProperty('error')) {
      logger.log('error', `[IMPORT] ${job} - item: ${item} - ERROR! - reason: ${response.error.reason}`);
    } else {
      logger.log('info', `[IMPORT] ${job} - item: ${item} - ${response.result.toUpperCase() || 'SUCCESS'}!`);
    }
  }

  async setDefaultIndex() {
    if (!this.client) return;
    const sendBody = {
      id: `config:${this.app.locals.env.ES_VERSION}`,
      index: this.app.locals.env.KB_INDEX || '.kibana',
      type: '_doc',
      refresh: true,
      body: {
        config: {
          defaultIndex: `${this.app.locals.env.INDEX_PERF}*`
        },
        type: 'config',
        updated_at: new Date().toISOString()
      }
    };
    const response = await this.client.update(sendBody);
    return response.body;
  }
}

module.exports.ESClass = ESClass;
