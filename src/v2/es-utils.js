/**
* Created by mverkerk on 10/20/2016.
*/
const fs = require('fs');
const elasticsearch = require('elasticsearch');
const logger = require('../../log.js');
const nconf = require('nconf');

class ESClass {
  constructor() {
    this.env = nconf.get('env');
    this.logger = logger;

    // Basic ES config - no auth
    const esConfig = {
      host: this.env.ES_PROTOCOL + '://' + this.env.ES_HOST + ':' + this.env.ES_PORT,
      requestTimeout: 5000,
      log: 'error',
      apiVersion: '5.x'
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
            cert: fs.readFileSync(this.env.ES_SSL_CERT).toString(),   // eslint-disable-line no-sync
            key: fs.readFileSync(this.env.ES_SSL_KEY).toString(),   // eslint-disable-line no-sync
            rejectUnauthorized: true
          }
        }
      ];
    }

    // Create the ES client!
    this.client = new elasticsearch.Client(esConfig);
  }

  async ping(timeout) {
    await this.client.ping({ requestTimeout: (timeout || 5000) })
      .then(function (resp) {
        return resp;
      }, function (err) {
        throw (err);
      });
  }

  async templExists(template) {
    const response = await this.client
      .indices
      .existsTemplate({ name: template });
    this.logger.debug('Template [cicd-perf] exists: ' + (response === true));
    return response;
  }

  async putTemplate(name, body) {
    const response = await this.client
      .indices
      .putTemplate({ name: name, body: body });
    this.logger.debug('Template [' + name + '] exists/created: ' + (response.acknowledged === true));
    return response;
  }

  async getTemplate(name) {
    const exists = await this.client
      .indices
      .existsTemplate({ name: name });
    if (exists) {
      const response = await this.client
        .indices
        .getTemplate({ name: name });
      return response;
    }
    return { error: { message: 'Not Found' }};
  }

  async defaultIndex(name, version) {
    const response = await this.client
      .index({ index: (this.env.KB_INDEX || '.kibana'), type: 'config', id: version, body: { defaultIndex: name }});
    return response;
  }

  async delIndexPattern(pattern) {
    const response = await this.client
      .delete({ index: (this.env.KB_INDEX || '.kibana'), type: 'index-pattern', id: pattern });
    return response.acknowledged;
  }

  async delIndex(index) {
    const response = await this.client
      .indices
      .delete({ index: index });
    return response;
  }

  async delDocById(index, type, id) {
    let exists = false;
    if (id) {
      // Check if it already exists
      exists = await this.client
        .exists({ index: index, type: type, id: id });
    }
    if (exists) {
      const response = await this.client
        .delete({ index: index, type: type, id: id });
      return response;
    }
    return { _id: id, result: 'not_exists', statusCode: 200, reason: 'Does not exist' };
  }

  async reindex(src, dst) {
    const response = await this.client
      .reindex({ body: { source: { index: src }, dest: { index: dst }}});
    return response;
  }

  async exists(index, type, id) {
    const response = await this.client
      .exists({ index: index, type: type, id: id });
    return response;
  }

  async search(index, type, body) {
    const response = await this.client
      .search({ index: index, type: type, body: body });
    return response;
  }

  async index(index, type, id, body) {
    let exists = false;
    if (id) {
      // Check if it already exists
      exists = await this.client
        .exists({ index: index, type: type, id: id });
    }
    if (!exists) {
      const response = await this.client
        .index({ index: index, type: type, id: id, body: body });
      return response;
    }
    return { _id: id, result: 'exists', statusCode: 200, reason: 'Already exists' };
  }

  async bulk(body) {
    const response = await this.client
      .bulk({ body: body });
    return (response.items.length > 0);
  }

  async kbImport(importJson) {
    try {
      for (const index of Object.keys(importJson)) {
        const item = importJson[index];
        const _source = item._source;
        if (_source === 'delete_this') {
          this.checkEsResponse(
            await this.delDocById((this.env.KB_INDEX || '.kibana'), item._type, item._id),
            'delete [' + item._type + ']',
            item._id
          );
        } else {
          if (item._type === 'index-pattern' && item._id === 'cicd-perf*') {
            const apiHost = (this.env.HTTP_PORT !== 80) ? this.env.HOST + ':' + this.env.HTTP_PORT : this.env.HOST;
            _source.fieldFormatMap = _source.fieldFormatMap.replace('__api__hostname', apiHost.toLowerCase());
          }
          this.checkEsResponse(
            await this.index((this.env.KB_INDEX || '.kibana'), item._type, item._id, _source),
            'import [' + item._type + ']',
            item._source.title
          );
        }
      }
      return true;
    } catch (err) {
      this.logger.debug('Error in kbImport: ' + err.message);
      return false;
    }
  }

  async checkEsResponse(response, job, item) {
    let result;
    let reason = response.reason || 'n/a';
    if (response.hasOwnProperty('result')) {
      result = response.result.toUpperCase();
    } else if (response.hasOwnProperty('total')) {
      if (response.hasOwnProperty('created') && response.created > 0)
        result = 'CREATED (' + response.created + ' items)';
      if (response.hasOwnProperty('deleted') && response.deleted > 0)
        result = 'DELETED (' + response.deleted + ' items)';
      if (response.hasOwnProperty('updated') && response.updated > 0)
        result = 'UPDATED (' + response.updated + ' items)';
    } else if (response.hasOwnProperty('acknowledged')) {
      result = 'ACKNOWLEDGED';
    } else if (response.hasOwnProperty('error')) {
      result = 'ERROR';
      reason = response.error.reason;
    }
    this.logger.debug(`[${result}] - action: ${job} - item: ${item} - status: ${response.statuscode ||
      response.status || 'n/a'} - reason: ${reason}`);
    return true;
  }
}

module.exports.ESClass = ESClass;
