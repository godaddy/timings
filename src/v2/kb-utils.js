/**
* Created by mverkerk on 10/20/2016.
*/
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const logger = require('../log')(module.id);

class KBClass {
  // Class to handle interactions with elasticsearch
  constructor(app) {
    this.app = app;
    this.env = this.app.locals.env;
  }

  async getKBStatus() {
    try {
      const kbResponse = await fetch(`${this.app.locals.env.KB_URL}/api/status`);
      const data = await kbResponse.json();
      return data;
    } catch (err) {
      logger.log('error', `[KIBANA] could not get Kibana Status!`, err);
    }
  }

  async getKBVer() {
    try {
      const kbResponse = await fetch(`${this.app.locals.env.KB_URL}/api/status`);
      const data = await kbResponse.json();
      return data.version?.number;
    } catch (err) {
      logger.log('error', `[KIBANA] could not get Kibana Version!`, err);
    }
  }

  async kbObjectsReplace() {
    const ndjsonString = fs.readFileSync(
      path.join(this.app.locals.appRootPath, 'config', '.kibana_objects.ndjson'),
      { encoding: 'utf8', flag: 'r' }
    );
    const newKbObjects = ndjsonString.replace(/__api__hostname/g, this.app.locals.env.HOST);
    fs.writeFileSync(
      path.join(this.app.locals.appRootPath, 'config', '.kibana_objects_customer.ndjson'),
      newKbObjects
    );
  }

  async kbImport() {
    const response = {
      info: [],
      imports: [],
      ok: true
    };
    try {
      this.kbObjectsReplace();
      const readStream = fs.createReadStream(
        path.join(this.app.locals.appRootPath, 'config', '.kibana_objects_customer.ndjson')
      );
      const formData = new FormData();
      // const params = new URLSearchParams();
      formData.append('file', readStream);
      const kbResponse = await fetch(
        `${this.app.locals.env.KB_URL}/api/saved_objects/_import?overwrite=true`, {
          method: 'POST',
          body: formData,
          headers: {
            'kbn-xsrf': true
          }
        }
      );
      const data = await kbResponse.json();
      response.imports = data.successResults;
      delete data.successResults;
      response.info.push(data);
      response.setDefaultIndex = await this.setDefaultIndex();
      return response;
    } catch (err) {
      logger.log('error', `[KIBANA] could not import Kibana objects!`, err);
    }
  }

  async setDefaultIndex() {
    try {
      const kbResponse = await fetch(
        `${this.app.locals.env.KB_URL}/api/index_patterns/default`, {
          method: 'POST',
          body: JSON.stringify({
            index_pattern_id: `${this.app.locals.env.INDEX_PERF}*`
          }),
          headers: {
            'kbn-xsrf': true
          }
        }
      );
      const data = await kbResponse.json();
      return data.acknowledged;
    } catch (err) {
      logger.log('error', `[KIBANA] could not set default index!`, err);
    }
  }
}

module.exports.KBClass = KBClass;
