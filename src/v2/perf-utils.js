// eslint-disable-next-line no-prototype-builtins
/**
 * Created by mverkerk on 9/26/2016.
 */
import fs from 'fs-extra';
import path from 'path';
import url from 'url'; // Used in usertimings method only
import { v4 as uuidv4 } from 'uuid';
import percentile from 'percentile';
import crypto from 'crypto';
import mime from 'mime-types';
import { ESClass } from './es-utils.js';

class PUClass {
  constructor(body, route, objParams, app) {
    this.env = app.locals.env;
    this.body = body;
    this.route = route.replace('/', '');
    if (this.env.ES_ACTIVE === true) {
      this.es = new ESClass(app);
    }
    this.debugMsg = [];
    this.esTrace = [];
    this.infoMsg = [];
    this.errorMsg = [];
    this.dl = '';
    this.timing = {};
    this.objParams = objParams;
    if (body?.sla) {
      this.assertMetric = Object.keys(body.sla)[0] || '';
      this.assertSLA = body.sla[this.assertMetric] || '';
    }
    this.measuredPerf = 0;
    this.baseline = 0;
    this.ranBaseline = false;
    this.usedBaseline = false;
    this.esSaved = false;
    this.resourcesSaved = false;
  }

  async handler(cb) {
    this.apiStartTime = new Date().getTime();
    try {
      this.measuredPerf = 0;
      // Call the correct timing function based on the route
      if (this.objParams?.multirun) {
        const multiRunDone = await this.multirun();
        if (!multiRunDone === true) return cb(null, {
          acknowledge: true,
          totalRuns: this.objParams.multirun.totalRuns,
          currentRun: this.objParams.multirun.currentRun,
          id: this.objParams.multirun.id
        });
      }
      this.measuredPerf = this[this.route]();
      // Run baseline
      if (this.env.ES_ACTIVE === true) {
        const blQuery = this.buildBaselineQuery();
        this.esTrace.push({ type: 'ES_SEARCH', host: this.env.ES_HOST,
          index: `${this.env.INDEX_PERF}-*`, search_query: blQuery
        });
        const response = await this.es.search(`${this.env.INDEX_PERF}-*`, this.route, blQuery);
        this.esTrace.push({ type: 'ES_RESPONSE', response: response });
        this.es_took = response.took;
        if (response?.aggregations?.baseline) {
          this.baseline = this.checkBaseline(response);
        } else {
          this.baseline = 0;
        }
      }
      // Compare actual to SLA and create output
      this.status = this.checkSLA(this.measuredPerf);
      // Get day from export data
      const exportData = this.createExportData();
      const indexDay = new Date(exportData.et).toISOString().slice(0, 10).replace(/-/g, '.');
      // Store results in ES
      if (this.env.ES_ACTIVE === true && this.objParams.flags.esCreate === true) {
        this.esTrace.push({ type: 'ES_CREATE', exportData });
        const docId = this.getDocId(exportData);
        const response = await this.es.index(`${this.env.INDEX_PERF}-${indexDay}`, exportData, docId || '');
        this.esSaved = ['created', 'updated'].includes(response.result);
        if (this.esSaved && this.route === 'navtiming') {
          const resBody = this.getResourcesBody(exportData['@_uuid']);
          this.resourcesSaved = await this.es.bulk(resBody);
        }
      }
      // Send create response and send back to router
      return cb(null, this.buildResponse(exportData));
    } catch (e) {
      return cb(e);
    }
  }

  async multirun() {
    // Temp file is the multirun's ID (to be provided by client)
    const multiFile = path.resolve(`./multi_tmp/${this.route}_${this.objParams.multirun.id}.json`);
    if (this.objParams.multirun.currentRun > 1 && !fs.existsSync(multiFile)) {
      const e = new Error();
      e.status = 400;
      e.message = 'Missing first run - currentRun has to be 1 for the first run!';
      throw e;
    }
    const appendObject = this.objParams.multirun.currentRun < 2 ? {} : await fs.readJson(multiFile);
    appendObject[this.objParams.multirun.currentRun] = this.objParams;
    appendObject[this.objParams.multirun.currentRun].route = this.route;
    // Write to the file
    await fs.outputJson(multiFile, appendObject, { flag: 'w+' });
    // Check if this is the last run
    if (this.objParams.multirun.currentRun >= this.objParams.multirun.totalRuns) {
      // Last run! Determine the chosen run (percentile?)
      const objResults = {};
      /* eslint guard-for-in: 0 */
      for (const run in appendObject) {
        switch (appendObject[run].route) {
          case 'navtiming':
            objResults[run] =
              (this.assertMetric === 'visualCompleteTime') ? appendObject[run].injectJS.visualCompleteTime :
                appendObject[run].injectJS.timing.loadEventStart - appendObject[run].injectJS.timing.navigationStart;
            break;
          case 'usertiming':
            objResults[run] = appendObject[run].injectJS.measureArray[0].duration;
            break;
          case 'apitiming':
            objResults[run] = appendObject[run].timing.endTime - appendObject[run].timing.startTime;
            break;
          default:
        }
      }
      // Submit chosen result to route
      const perc75 = percentile(75, Object.values(objResults)) || 0;
      const index75 = (Object.values(objResults).indexOf(perc75) + 1).toString();
      // const pickRun = Object.keys(objResults)[index75];
      this.objParams = appendObject[index75];
      // Delete the tmp file
      await fs.remove(multiFile);
      return true;
    }
    return;
  }

  navtiming() {
    // Check for mandatory & default parameters in objParams
    let injectJSdata = this.objParams.injectJS;
    if (injectJSdata?.value) {
      injectJSdata = injectJSdata.value;
    }
    if (injectJSdata.timing.navigationStart <= 0 || isNaN(new Date(injectJSdata.timing.navigationStart).getTime())) {
      const err = new Error('[navtimings] the injectJS.timing object is malformed or missing the navigationStart value!');
      err.status = 400;
      throw err;
    }
    const nt = injectJSdata.timing;
    const visualCompleteTime = parseInt(injectJSdata.visualCompleteTime, 10);
    nt.visualCompleteTime = (nt.navigationStart + visualCompleteTime);

    this.dl = injectJSdata.url.replace('https://', '').replace('http://', '');
    this.timing = {
      redirectStart: (nt.redirectStart ? nt.redirectStart - nt.navigationStart : 0),
      AppCacheStart: (nt.fetchStart - nt.navigationStart),
      dnsStart: (nt.domainLookupStart ? nt.domainLookupStart - nt.navigationStart : 0),
      connectStart: (nt.connectStart - nt.navigationStart),
      sslStart: (nt.secureConnectionStart ? nt.secureConnectionStart - nt.navigationStart : 0),
      requestStart: (nt.requestStart - nt.navigationStart),
      downloadStart: (nt.responseStart - nt.navigationStart),
      processingStart: (nt.responseEnd - nt.navigationStart),
      domLoadingStart: (nt.domLoading - nt.navigationStart),
      loadEventStart: (nt.loadEventStart - nt.navigationStart),

      firstByteTime: (nt.responseStart - nt.requestStart),
      domInteractiveTime: (nt.domInteractive - nt.navigationStart),
      domCompleteTime: (nt.domComplete - nt.navigationStart),
      pageLoadTime: (nt.loadEventStart - nt.navigationStart),
      visualCompleteTime: (nt.visualCompleteTime - nt.navigationStart),

      redirectTime: (nt.redirectEnd - nt.redirectStart),
      appCacheTime: (nt.domainLookupStart - nt.fetchStart),
      dnsTime: (nt.domainLookupEnd - nt.domainLookupStart),
      // connectTime and sslTime time depend on whether secureConnectionStart has a value > 0
      connectTime: ((nt.secureConnectionStart || nt.connectEnd) - nt.connectStart),
      sslTime: (nt.connectEnd - (nt.secureConnectionStart || nt.connectEnd)),
      downloadTime: (nt.responseEnd - nt.responseStart),
      processingTime: (nt.loadEventStart - nt.responseEnd),
      loadingTime: (nt.loadEventEnd - nt.loadEventStart)
    };
    this.debugMsg.push({ type: 'DEBUG', message: 'PageLoadTime: ' + this.timing.pageLoadTime });
    this.debugMsg.push({ type: 'DEBUG', message: 'VisualCompleteTime: ' + this.timing.visualCompleteTime });

    return this.timing[this.assertMetric] || 0;
  }

  usertiming() {
    let injectJSdata = this.objParams.injectJS;
    if (injectJSdata?.value) {
      injectJSdata = injectJSdata.value;
    }
    const measure = injectJSdata.measureArray;
    this.timing.pageLoadTime = measure[0].duration;
    this.timing.visualCompleteTime = measure[0].duration;
    this.dl = injectJSdata.url.replace('https://', '').replace('http://', '');

    return measure[0].duration;
  }

  apitiming() {
    const measure = this.objParams.timing;
    this.dl = this.objParams.url.replace('https://', '').replace('http://', '');
    // Check if there are valid measures
    if (measure.startTime > measure.endTime) {
      this.errorMsg.push({ type: 'ERROR', message: 'startTime is greater than endTime!' });
      const err = new Error('[apitimings] invalid start/end parameters!!');
      err.status = 400;
      throw err;
    }
    this.timing.pageLoadTime = measure.endTime - measure.startTime;
    this.timing.visualCompleteTime = measure.endTime - measure.startTime;

    return (measure.endTime - measure.startTime);
  }

  // BASELINE //
  buildBaselineQuery() {
    // All conditions are met! Run baseline!
    const baselineParams = this.objParams.baseline;
    this.ranBaseline = true;
    this.debugMsg.push({ type: 'DEBUG', message: 'Going to run baseline ...' });

    const baselineAgg = this.assertMetric === 'pageLoadTime' ? 'perf.measured' : 'perf.visualComplete';

    // Build the ES base query
    const query = { bool: { must: [], must_not: [] } };
    const aggs = { baseline: { percentiles: { field: baselineAgg, percents: [baselineParams.perc] } } };

    // Decide what URL to filter on
    let mustUrl = { wildcard: { dl: { value: baselineParams.searchUrl } } };
    if (!baselineParams.searchUrl || baselineParams.searchUrl.indexOf('*') < 0) {
      // Not a wildcard search - sanitize the 'dl' field!
      this.queryUrl = this.dl;
      this.queryUrl = this.queryUrl.replace('https://', '').replace('http://', '').trim();

      // Add the URL to the query object
      mustUrl = { query_string: { default_field: 'dl', query: `"${this.queryUrl}"` } };
    }

    // Add the time range to the query object
    const mustRange = { range: { et: { from: 'now-' + baselineParams.days + 'd', to: 'now' } } };
    query.bool.must.push(mustUrl, mustRange);
    query.bool.must.push({ term: { type: { value: this.route } } });

    // Add baseline includes
    if ((baselineParams?.incl ?? []).length > 0) {
      this.addBaselineIncl(baselineParams.incl, query, aggs);
    }

    // Add baseline excludes
    if ((baselineParams.excl ?? []).length > 0) {
      this.addBaselineExcl(baselineParams.excl, query);
    }

    // Clean up query
    if (query.bool.must_not.length < 1) {
      delete query.bool.must_not;
    }

    return { query: query, size: 5, aggs: aggs };
  }

  checkBaseline(response) {
    // Determine if we can run a baseline
    const baselineParams = this.objParams.baseline;
    const baseline = parseInt(response.aggregations.baseline.values[baselineParams.perc + '.0'], 10) || 0;
    const baselineTotal = baseline * baselineParams.padding;
    this.assertType = 'flat_sla';
    if (this.objParams.flags.assertBaseline === true && baselineTotal > 0 && baselineTotal < this.assertSLA) {
      // We're doing baseline! Overwrite the assertSLA
      this.assertSLA = baselineTotal;
      this.assertType = baselineParams.padding !== 1 ? 'baseline_padding' : 'baseline';
      this.usedBaseline = true;
    } else {
      this.infoMsg.push({
        type: 'INFO',
        message: 'Baseline not used: [assertBaseline] = ' + this.objParams.flags.assertBaseline +
                  ' - [baseline + padding] = ' + baselineTotal +
                  ' - [flat sla] = ' + this.assertSLA
      });
    }
    this.infoMsg.push({
      type: 'INFO',
      message: ((baseline <= 0) ? 'FAIL - No ' : 'SUCCESS - ') + 'Baseline found...'
    });
    this.debugMsg.push({
      type: 'DEBUG',
      message: `Search info: [url] = ${this.queryUrl} - [days] = ${baselineParams.days} - [percentile] ${baselineParams.perc}`
    });
    this.debugMsg.push({
      type: 'DEBUG',
      message: `ES query info: [took] ${response.took} ms - [hits] ${response.hits.total} - [baseline] = ${baseline}`
    });

    return baseline;
  }

  addBaselineIncl(incl, query, aggs) {
    // Add user-specified includes
    for (const field in incl) {
      if (incl[field] !== '*') {
        const mustIncl = { query_string: {} };
        mustIncl.query_string.default_field = 'log.' + field;
        // Special field functions (_log_ and _agg_)
        if (incl[field] === '_log_') {
          // Copy field value from log parameter!
          if (this.objParams?.log?.[field]) {
            mustIncl.query_string.query = `"${this.objParams.log[field]}"`;
            query.bool.must.push(mustIncl);
          }
        } else if (incl[field] === '_agg_') {
          // Do filter and aggregate
          aggs[field] = { terms: { field: field } };
        } else {
          // Do filter and aggregate
          mustIncl.query_string.query = `"${incl[field]}"`;
          query.bool.must.push(mustIncl);
          aggs[field] = { terms: { field: 'log.' + field } };
        }
      }
    }
  }

  addBaselineExcl(excl, query) {
    // Add user-specified excludes
    for (const field in excl) {
      if (excl[field] !== '*' && excl[field] !== '') {
        const mustExcl = { query_string: {} };
        mustExcl.query_string.default_field = 'log.' + field;
        mustExcl.query_string.query = `"${excl[field]}"`;
        query.bool.must_not.push(mustExcl);
      }
    }
  }

  // COMPARE RESULT //
  checkSLA(measuredPerf) {
    // Assert
    let result = '';
    if (measuredPerf > 60000 || measuredPerf < 0) {
      result = 'rejected';
    }

    result = (measuredPerf > this.assertSLA) ? 'fail' : 'pass';

    return result;
  }

  // STORE & RESPONSE //
  createExportData() {
    const exportData = {};
    // Get the main timestamp
    let et = new Date().toISOString();
    if (this.route === 'apitiming') {
      // get timestamp from startTime
      et = new Date(this.objParams.timing.startTime).toISOString();
    } else {
      // get timestamp from injectJS.time parameter
      et = (this.objParams.injectJS?.time)
        ? new Date(this.objParams.injectJS.time).toISOString()
        : new Date().toISOString();
    }
    exportData.et = et;
    exportData['@timestamp'] = et;
    exportData.status = this.status;
    exportData['@_uuid'] = uuidv4();
    exportData.dl = this.dl;
    exportData.type = this.route;

    // Add the 'perf' section
    exportData.perf = {
      flatSLA: parseInt(Math.round(this.objParams.sla[this.assertMetric] * 100) / 100, 10),
      measured: parseInt(Math.round(this.measuredPerf * 100) / 100, 10),
      baseline: parseInt(Math.round(this.baseline * 100) / 100, 10),
      threshold: parseInt(Math.round(this.assertSLA * 100) / 100, 10),
      visualComplete: parseInt(Math.round(this.timing.visualCompleteTime * 100) / 100, 10)
    };

    // Add the 'info' section
    exportData.info = {
      ranBaseline: this.ranBaseline,
      usedBaseline: this.usedBaseline,
      assertType: this.assertType,
      assertMetric: this.assertMetric,
      api_took: (new Date().getTime() - this.apiStartTime),
      es_took: this.es_took,
      api_version: this.env.APP_VERSION,
      api_host: `${this.env.HOST}:${this.env.HTTP_PORT}`,
      hasResources: (this.route === 'navtiming' && !!this.objParams.injectJS?.resources)
    };

    // Add params to the export object
    exportData.log = this.objParams.log;
    exportData.flags = this.objParams.flags;
    exportData.multirun = this.objParams.multirun || false;
    exportData.baseline = this.objParams.baseline;

    // Add the 'nav' section (if 'navtiming')
    if (this.route === 'navtiming') {
      exportData.nav = {
        loadEventStart: parseInt(Math.round(this.timing.loadEventStart * 100) / 100, 10),
        domComplete: parseInt(Math.round(this.timing.domCompleteTime * 100) / 100, 10),
        domInteractive: parseInt(Math.round(this.timing.domInteractiveTime * 100) / 100, 10),
        firstByteTime: parseInt(Math.round(this.timing.firstByteTime * 100) / 100, 10),
        dnsTime: parseInt(Math.round(this.timing.dnsTime * 100) / 100, 10),
        redirectTime: parseInt(Math.round(this.timing.redirectTime * 100) / 100, 10),
        connectTime: parseInt(Math.round(this.timing.connectTime * 100) / 100, 10),
        processingTime: parseInt(Math.round(this.timing.processingTime * 100) / 100, 10)
      };
    }

    return exportData;
  }

  getDocId(data) {
    // Create unique document ID so data can be backfilled/copied/exported if that's ever needed
    const docIdRaw = [data.et, (data.log.team || 'unknown'), data.dl].join('_');
    return crypto.createHash('md5').update(docIdRaw).digest('hex');
  }

  buildResponse(exportData) {
    if (this.objParams.flags.passOnFailedAssert === true) {
      this.infoMsg.push({ type: 'INFO', message: `Override flag [passOnFailedAssert] is set to [true] -> 
            setting [assert] to [true] regarldless of result!` });
    }

    const returnJSON = {
      // - Build response object
      status: 200,
      api_version: this.env.APP_VERSION,
      api_host: `${this.env.HOST}:${this.env.HTTP_PORT}`,
      assert: this.objParams.flags.passOnFailedAssert ? true : (this.status !== 'fail'),
      route: this.route
    };
    if (this.env.ES_ACTIVE === true) {
      returnJSON.esServer = this.env.ES_HOST;
      returnJSON.esIndex = this.env.INDEX_PERF + '-*';
      returnJSON.esSaved = this.esSaved;
      returnJSON.resourceSaved = this.resourcesSaved;
      if (this.objParams.flags.esTrace === true) {
        returnJSON.esTrace = this.esTrace;
      }
    } else {
      returnJSON.esSaved = "ElasticSearch is not available or 'flags.esCreate=false'!";
    }
    if (this.objParams.flags.debug === true) {
      returnJSON.debugMsg = this.debugMsg;
      returnJSON.params = this.body;
      returnJSON.timingInfo = this.timing;
    }
    if (this.infoMsg && Object.keys(this.errorMsg).length > 0) {
      returnJSON.infoMsg = this.infoMsg;
    }
    if (this.errorMsg && Object.keys(this.errorMsg).length > 0) {
      returnJSON.errorMsg = this.errorMsg;
    }

    returnJSON.export = exportData;

    return returnJSON;
  }

  // RESOURCES //
  async getResources(req, cb) {
    // Collect POST data
    if (this.env.ES_ACTIVE === false) {
      return cb(null, {
        status: 200,
        kibana_host: (this.env.ES_PROTOCOL || 'http') + '://' + this.env.KB_HOST,
        kibana_port: this.env.KB_PORT,
        kibana_rename: this.env.KB_RENAME,
        resources: []
      });
    }

    const returnJSON = { status: 400 };

    // Build the ES base query
    const query = { bool: { must: [] } };
    // Add the ID
    const mustID = { multi_match: { fields: ['uuid', '@_uuid'], query: req.body.id } };
    // Add the URL and the time range

    query.bool.must.push(mustID);
    const body = { query: query, size: 1000 };

    try {
      const response = await this.es.search([this.env.INDEX_PERF + '*', this.env.INDEX_RES + '*'], '', body);
      // Strip the meta-data from the hits
      const hits = response.hits.hits;
      const resources = [];
      hits.forEach((hit) => {
        const resource = hit._source;
        resource.mimeType = mime.lookup(resource.uri_path) || 'other';
        if (resource.initiatorType === 'xmlhttprequest') {
          resource.mimeType = 'xhr';
        }
        resources.push(resource);
      });

      returnJSON.status = 200;
      returnJSON.kibana_host = (this.env.ES_PROTOCOL || 'http') + '://' + this.env.KB_HOST;
      returnJSON.kibana_port = this.env.KB_PORT;
      returnJSON.kibana_rename = this.env.KB_RENAME;
      returnJSON.resources = resources;
      return cb(null, returnJSON);
    } catch (e) {
      return cb(e);
    }
  }

  getResourcesBody(uuid) {
    // [OUTPUT TO CICD-RESOURCE] Only used for navtiming
    // Check if ES server is there & grab resources
    const rt = this.objParams.injectJS.resources;
    if (this.env.ES_ACTIVE === false || !Array.isArray(rt)) {
      const err = new Error(
        '[getResourcesBody] ERROR: Resources not saved! Issue with resources array or ELK is not available!'
      );
      err.status = 500;
      throw err;
    }

    const et = this.objParams.injectJS.time
      ? new Date(this.objParams.injectJS.time).toISOString()
      : new Date().toISOString();
    const indexDay = new Date(et).toISOString().slice(0, 10).replace(/-/g, '.');
    const body = [this.resNav(uuid, et)];

    // Create entries for resources
    rt.forEach((resource) => {
      const resUrl = this.parseUrl(resource.name);
      const res = {
        'et': et,
        '@timestamp': et,
        'type': 'resource',
        '@_uuid': uuid,
        'dl': this.dl,
        'uri': resource.name,
        'uri_protocol': resUrl.protocol,
        'uri_host': resUrl.hostname,
        'uri_path': resUrl.pathname,
        'uri_query': resUrl.query,
        'team': this.objParams.log.team || '',
        'log': { team: this.objParams.log.team || '' },
        'start': resource.startTime,
        'fetchStart': resource.fetchStart,
        'duration': resource.duration,
        'decodedBodySize': resource.decodedBodySize || 0,
        'encodedBodySize': resource.encodedBodySize || 0,
        'transferSize': resource.transferSize || 0,
        'initiatorType': resource.initiatorType || '',
        'redirectStart': resource.redirectStart,
        'redirectDuration': resource.redirectEnd - resource.redirectStart,
        'appCacheStart': 0, // TODO
        'appCacheDuration': 0, // TODO
        'dnsStart': resource.domainLookupStart,
        'dnsDuration': resource.domainLookupEnd - resource.domainLookupStart,
        'tcpStart': resource.connectStart,
        'tcpDuration': resource.connectEnd - resource.connectStart, // TODO
        'sslStart': resource.secureConnectionStart,
        'sslDuration': resource.secureConnectionStart > 0 ? resource.connectEnd - resource.secureConnectionStart : 0,
        'requestStart': resource.requestStart,
        'requestDuration': resource.responseStart - resource.requestStart,
        'responseStart': resource.responseStart,
        'responseDuration': resource.responseStart > 0 ? resource.responseEnd - resource.responseStart : 0
      };

      body.push({
        _index: `${this.env.INDEX_RES}-${indexDay}`,
        ...res
      });

    });
    return body;
  }

  resNav(uuid, et) {
    // Create separate entry for the root URL (using navtiming data)
    // grab navtiming info (only for the root URL)
    const indexDay = new Date(et).toISOString().slice(0, 10).replace(/-/g, '.');
    const timing = this.objParams.injectJS.timing;
    const navUrl = this.parseUrl(this.objParams.injectJS.url);
    const nt = {
      'et': et,
      '@timestamp': et,
      'type': 'navtiming',
      '@_uuid': uuid,
      'dl': this.dl,
      'uri': navUrl.href,
      'uri_protocol': navUrl.protocol,
      'uri_host': navUrl.hostname,
      'uri_path': navUrl.pathname,
      'uri_query': navUrl.query,
      'team': this.objParams.log.team || '',
      'log': { team: this.objParams.log.team || '' },
      'start': 0,
      'duration': timing.responseEnd - timing.navigationStart,
      'redirectStart': timing.redirectStart > 0 ? timing.redirectStart - timing.navigationStart : 0,
      'redirectDuration': timing.redirectEnd - timing.redirectStart,
      'appCacheStart': 0, // TODO
      'appCacheDuration': 0, // TODO
      'dnsStart': timing.domainLookupStart > 0 ? timing.domainLookupStart - timing.navigationStart : 0,
      'dnsDuration': timing.domainLookupEnd - timing.domainLookupStart,
      'tcpStart': timing.connectStart - timing.navigationStart,
      'tcpDuration': timing.connectEnd - timing.connectStart,
      'sslStart': timing.secureConnectionStart > 0 ? timing.secureConnectionStart - timing.navigationStart : 0,
      'sslDuration': timing.secureConnectionStart > 0 ? timing.connectEnd - timing.secureConnectionStart : 0,
      'requestStart': timing.requestStart - timing.navigationStart,
      'requestDuration': timing.responseStart - timing.requestStart,
      'responseStart': timing.responseStart - timing.navigationStart,
      'responseDuration': timing.responseEnd - timing.responseStart,
      'loadEventStart': timing.loadEventStart - timing.navigationStart,
      'loadEventDuration': timing.loadEventEnd - timing.loadEventStart
    };

    return {
      _index: `${this.env.INDEX_RES}-${indexDay}`,
      ...nt
    };
  }

  // OTHER //
  saveError(err, req) {
    if (this.env.ES_ACTIVE === true) {
      // post to ELK (if flags.esCreate=true)
      const body = {};

      // Add timestamp to body object
      body.api_version = this.env.APP_VERSION;
      body.api_host = `${this.env.HOST}:${this.env.HTTP_PORT}`;
      body.et = new Date().toISOString();
      body.route = req.route.path.replace('/', '');
      body.client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      body.client_ua = req.headers['user-agent'] || 'Unknown user-agent';
      const reqBody = req.body;
      body['@timestamp'] = body.et;
      const indexDay = new Date(body.et).toISOString().slice(0, 10).replace(/-/g, '.');

      if (typeof (reqBody) === 'object') {

        // Get the URL from injectJS (nav/usertiming)
        if (reqBody?.injectJS?.url) {
          body.dl = reqBody.injectJS.url;
        }

        // Get the URL from the params (apitiming)
        if (reqBody?.timing) {
          body.dl = reqBody.url;
        }

        // Get the LOG info from payload
        if (reqBody?.log) {
          body.log = reqBody.log;
        }
      }

      // Add ERROR message and status
      body.err_message = err.message || 'Missing or Unknown message';
      body.err_status = err.status || 400;
      body.err_stack = err.stack || '';

      // console.log("Error to ELK: " + JSON.stringify(body, null, 2));
      body.type = 'error_' + body.route;
      this.es.index(`${this.env.INDEX_ERR}-${indexDay}`, body);
    }
  }

  customParam(object, needle, result) {
    const ndlKey = Object.keys(needle)[0];
    if (object?.[ndlKey]) {
      // Key exists! Check for value(s) - multiple values may be separated by '|' ...
      const ndlVal = needle[Object.keys(needle)[0]].split('|');
      for (const ndl of ndlVal) {
        if (object?.[ndlKey]?.[ndl]) {
          // Key-value pair exists at this level! Get out!
          return result;
        } else if (ndlVal.indexOf(ndl) === (ndlVal.length - 1)) {
          // Checked all values - none of them existed!
          object = object[ndlKey];
        }
      }
    } else {
      // Key doesn't exist at top-level! Set missing parameter and get out!
      result.push(needle);
      return result;
    }
    for (let i = 0; i < Object.keys(object).length; i++) {
      if (typeof object[Object.keys(object)[i]] === 'object') {
        this.customParam(object[Object.keys(object)[i]], needle, result);
      }
    }
    result.push(needle);
    return result;
  }

  getInjectJS(req, cb) {
    const injectType = req.body.injectType;
    const visualCompleteMark = req.body.visualCompleteMark || '';
    const stripQueryString = req.body.stripQueryString || false;
    let injectJS = this.getInjectCode(injectType, visualCompleteMark, stripQueryString);
    // Send decoded string if requested!
    if (req.body?.decoded === true) {
      injectJS = decodeURIComponent(injectJS);
    }
    cb(null, { status: 200, inject_code: injectJS });
  }

  parseUrl(fullUrl) {
    if (typeof fullUrl !== 'string') {
      return null;
    }

    const tmpUrl = fullUrl.indexOf('http') < 0 ? 'http://' + fullUrl : fullUrl;
    const parsedUrl = url.parse(tmpUrl);
    parsedUrl.protocol = fullUrl.indexOf('http') < 0 ? 'none' : parsedUrl.protocol.replace(':', '');

    return parsedUrl;
  }

  getInjectCode(type = null, mark = null, stripQueryString = false) {
    let injectCode = '';
    // If no mark is provided, set to default "visual_complete"
    mark = mark || 'visual_complete';
    const docHref = (stripQueryString === true) ? 'document.location.href.split("?")[0]' : 'document.location.href';
    if (type === 'navtiming') {
      injectCode +=
          `var visualCompleteTime = 0;
  if (performance.getEntriesByName('${mark}').length) {
      visualCompleteTime = parseInt(performance.getEntriesByName('${mark}')[0].startTime);
      window.performance.clearMarks();
  };
  var pageResources = window.performance.getEntriesByType('resource');
  window.performance.clearResourceTimings();
  return {
      time:new Date().getTime(),
      timing:window.performance.timing,
      visualCompleteTime: visualCompleteTime,
      url: ${docHref},
      resources: pageResources
  };`;

    } else if (type === 'usertiming') {
      injectCode =
          `var marks = window.performance.getEntriesByType('mark');
  for (var i = 0; i < marks.length; i++) {
      var markName = marks[i].name;
      if (i < marks.length && (markName.indexOf('_start') >= 0 || markName.indexOf('_stop') >= 0)) {
          if (markName.indexOf('_start') >= 0) {
              var startMark = markName;
              var measureName = markName.replace('_start', '');
          }
          if (startMark && markName.indexOf('_stop') >= 0 && markName.replace('_stop', '') === measureName) {
              var stopMark = markName;
              window.performance.measure(measureName, startMark, stopMark);
          }
      }
  };
  window.performance.clearMarks();
  var measureArray = window.performance.getEntriesByType('measure');
  window.performance.clearMeasures();
  return {
      time:new Date().getTime(),
      measureArray:measureArray,
      url: ${docHref},
      marks
  };`;
    }

    return encodeURIComponent(injectCode);
  }
}

export { PUClass };
