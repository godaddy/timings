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

  async ping() {
    const response = await this.client
      .ping({ requestTimeout: 5000 });
    this.logger.debug('SUCCESS! ElasticSearch cluster for [' +
      this.env.ES_HOST + '] is alive!');
    return response;
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
    return response.acknowledged;
  }

  async search(index, type, body) {
    const response = await this.client
      .search({ index: index, type: type, body: body });
    return response;
  }

  async index(index, type, body) {
    const response = await this.client
      .index({ index: index, type: type, body: body });
    return response.created;
  }

  async bulk(body) {
    const response = await this.client
      .bulk({ body: body });
    return (response.items.length > 0);
  }

}

module.exports.ESClass = ESClass;
