/** Created by mverkerk on 10/20/2016. */
import fs from 'fs-extra';
import { Client } from '@elastic/elasticsearch';

// Loading sample data content
const sampleData = fs.readJsonSync(new URL('../../config/.sample_data.json', import.meta.url));
const { version } = fs.readJsonSync(new URL('../../node_modules/@elastic/elasticsearch/package.json', import.meta.url));

/* eslint no-sync: 0 */
class ESClass {
  // Class to handle interactions with elasticsearch
  constructor(app) {
    this.app = app;
    this.logger = app.logger;
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
      return new Client(esConfig);
    }
  }

  async healthy(timeout = '90s', status = 'green') {
    if (!this.client) return {};
    try {
      const response = await this.client.cluster.health({ level: 'cluster', wait_for_status: status, timeout: timeout });
      this.logger.info(`[ELASTIC] status [${status}] of host ` +
        `[${this.app.locals.env.ES_HOST}://${this.app.locals.env.ES_HOST}:${this.app.locals.env.ES_PORT}] is OK!`);
      return response.body ? response.body : response;
    } catch (err) {
      this.logger.error(`Could not check Elasticsearch cluster health for host [${this.app.locals.env.ES_HOST}]!`, err);
      return err.meta.body || err.meta;
    }
  }

  async putTemplate(name, body) {
    if (!this.client) return;
    const params = { name: name, body: body };
    try {
      const response = await this.client.indices.putIndexTemplate(params);
      this.logger.info(`[TEMPLATE] created/updated [${name}] successfully!`);
      return response.body ? response.body : response;
    } catch (err) {
      this.logger.error(`[TEMPLATE] create [${name}] failure!`, err);
    }
  }

  async getTemplate(name) {
    if (!this.client) return;
    try {
      const response = await this.client.indices.getIndexTemplate({ name: name });
      return response.body ? response.body : response;
    } catch (err) {
      this.logger.error(`[TEMPLATE] could not get template [${name}]!`, err);
    }
  }

  async exists(index, type, id) {
    if (!this.client) return;
    try {
      const response = await this.client.exists({
        index: index,
        id: id
      });
      return response.body ? response.body : response;
    } catch (err) {
      this.logger.error(`[INDEX] could check for index [${index}]!`, err);
    }
  }

  async search(index, type, body) {
    if (!this.client) return;
    try {
      const response = await this.client.search({
        index: index,
        body: body
      });
      return response.body ? response.body : response;
    } catch (err) {
      this.logger.error(`[INDEX] search in index [${index}] failed!`, err);
    }
  }

  async getIndices(index) {
    if (!this.client) return;
    try {
      const response = await this.client.cat.indices({
        index: index,
        format: 'json'
      });
      return response.body ? response.body : response;
    } catch (err) {
      if (err.statusCode === 404) {
        return null;
      }
      this.logger.error(`[INDEX] search for index [${index}] failed!`, err);
    }
  }

  async info() {
    if (!this.client) return;
    try {
      const response = await this.client.info();
      return response.body ? response.body : response;
    } catch (err) {
      this.logger.error(`[ELASTIC] could not get ES info!`, err);
    }
  }

  async getTemplateVersion() {
    if (!this.client) return;
    const indexPerf = this.app.locals.env.INDEX_PERF;
    try {
      const response = await this.client.indices.getIndexTemplate({ name: indexPerf });
      const currTemplate = response.body ? response.body : response;
      if (currTemplate.index_templates && currTemplate.index_templates.length > 0) {
        return currTemplate.index_templates[0].index_template?.template?.mappings?._meta?.api_version;
      }
    } catch (err) {
      if (err.statusCode === 404) {
        // cicd-perf template doesn't exist - new installation?
        return;
      }
      this.logger.error(`[TEMPLATE] could not get template [${indexPerf}]!`, err);
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
      return response.body ? response.body : response;
    } catch (err) {
      return err;
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
    return response.body ? response.body.successful > 0 : response.successful > 0;
  }

  async esImport() {
    const response = {
      info: [],
      imports: [],
      ok: true
    };
    try {
      const replaceDate = new Date().toISOString().split('T')[0];
      const data = JSON.parse(JSON.stringify(sampleData.latest).replace(/==date==/g, replaceDate));
      for (const index of Object.keys(data)) {
        const item = data[index];
        const type = '_doc';
        const indexResponse = await this.index(item._index, type, item._id, item._source);
        if (typeof indexResponse === Error) response.ok = false;
        response.imports.push({
          result: typeof indexResponse === Error ? 'ERROR' : 'SUCCESS',
          index: item._index,
          type: type,
          id: item._id,
          overwrite: true
        });
      }
      response.ok = true;
      response.info.push(
        `[IMPORT] processed [${response.imports.length}] sample items into elasticsearch! You can now find the sample data in ` +
        'the Elasticsearch [cicd-*-sample] indices');
      this.logger.info(`[IMPORT] processed [${response.imports.length}] sample items into elasticsearch!`);
    } catch (err) {
      response.ok = false;
      response.info.push(`Could not import sample data into Elasticsearch - error: ${err}`);
      this.logger.error(response.info, err);
    }
    return response;
  }
}

export { ESClass };
