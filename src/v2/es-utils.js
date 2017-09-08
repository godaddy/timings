/**
* Created by mverkerk on 10/20/2016.
*/
const elasticsearch = require('elasticsearch');
const logger = require('../../log.js');
const config = require('../../.config.js');

class ESClass {
  constructor() {
    this.config = config;
    this.logger = logger;
    const esHost = this.config.env.ES_HOST || 'localhost';
    const esPort = this.config.env.ES_PORT || 9200;
    this.client = new elasticsearch.Client({
      host: esHost + ':' + esPort,
      requestTimeout: 2000,
      log: 'error'
    });
  }

  async ping() {
    const response = await this.client
      .ping({ requestTimeout: 2000 });
    this.logger.debug('SUCCESS! ElasticSearch cluster for [' +
      this.config.env.ES_HOST + '] is alive!)');
    return response;
  }

  async indexExists(index) {
    const response = await this.client
      .indices
      .exists({ index: index });
    this.logger.debug('Index [' + index + '] exists: ' + (response === true));
    return response;
  }

  async indexCreate(index) {
    const response = await this.client
      .indices
      .create({ index: index });
    this.logger.debug('Index [' + index + '] created: ' + (response.acknowledged === true));
    return response.acknowledged;
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
