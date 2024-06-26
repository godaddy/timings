/**
* Created by mverkerk on 10/20/2016.
*/
import fs from 'fs-extra';
import path from 'path';
import FormData from 'form-data';

class KBClass {
  // Class to handle interactions with elasticsearch
  constructor(app) {
    this.app = app;
    this.logger = app.logger;
    this.env = this.app.locals.env;
  }

  async getKBStatus(attempt = 1, retries = 10, retryDelay = 5000) {
    const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
    const fetchParams = {
      method: 'GET'
    };
    let data;

    try {
      if (this.app.locals.env.ES_USER && this.app.locals.env.ES_PASS) {
        fetchParams.headers = {
          Authorization: 'Basic ' + Buffer.from(`${this.app.locals.env.ES_USER}:${this.app.locals.env.ES_PASS}`)
            .toString('base64')
        };
      }
      const kbResponse = await fetch(`${this.app.locals.env.KB_URL}/api/status`, fetchParams);
      data = await kbResponse.json();
      if (data.status?.overall?.state === 'green' || data.status?.overall?.level === 'available') {
        return data;
      }
      await delay(retryDelay);
      data = await this.getKBStatus(++attempt);
    } catch (err) {
      if (attempt <= retries) {
        if (err.code === 'ECONNREFUSED') {
          this.logger.info(`[KIBANA] Status could not be determined [${err.code}] ` +
            `[attempt ${attempt} out of ${retries}]`);
        } else {
          this.logger.info(`[KIBANA] Status is [${data?.status?.overall?.state || data?.status?.overall?.level}] ` +
            `[attempt ${attempt} out of ${retries}]`);
        }
        await delay(retryDelay);
        data = await this.getKBStatus(++attempt);
      }
    }
    return data;
  }

  async getKBVer() {
    try {
      const kbResponse = await fetch(`${this.app.locals.env.KB_URL}/api/status`);
      const data = await kbResponse.json();
      return data.version?.number;
    } catch (err) {
      this.logger.error(`[KIBANA] could not get Kibana Version!`, err);
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
      this.logger.error(`[KIBANA] could not import Kibana objects!`, err);
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
      this.logger.error(`[KIBANA] could not set default index!`, err);
    }
  }
}

export { KBClass };
