# TIMINGS API

The timings API can be used in CI/CD pipelines for the asserting of **web UI or API performance** during functional/integration tests!

## **tl;dr**

Install and run this API in your local network. Easiest deployment is with docker-compose (see here: [timings-docker](https://github.com/Verkurkie/timings-docker/))

Then, use this API **from your functional test script(s)** to:

1) Grab a snippet of JavaScript code from [`/v2/api/cicd/injectjs`](#post-v2apicicdinjectjs)
2) Decode the response from step 1 and inject it into your browser/webdriver
3) Send the browser's response (json object) from step 2 back to the API ([/v2/api/cicd/navtiming](#post-v2apicicdnavtiming) or [/v2/api/cicd/usertiming](#post-v2apicicdusertiming))
4) Use the API's response to assert performance (look for the `assert` field in the response)

To simplify communication with the API, there are currently two clients that you can install: one for JavaScript (`npm i --save-dev timings-client-js`) and one for Python (`pip install timingsclient`). Easy to install and easy to use! For all other languages, you will have to interact with API yourself using http `POST` calls. More info [here](#using-the-api-without-clients).

Continue reading below for more details about the API and the clients.

Enjoy!

------

## Table of Contents

* [The API](#the-api)

  * [Installing the API](#installing-the-api)

  * [Installing Elasticsearch/Kibana](#installing-elasticsearch-and-kibana)

  * [Starting the API](#starting-the-api)

* [The clients](#the-clients)

* [Starting the API](#starting-the-api)

* [Methods](#methods)

  * [/v2/api/cicd/injectjs](#post-v2apicicdinjectjs)

    * [parameters](#parameters-injectjs)

  * [/v2/api/cicd/navtiming](#post-v2apicicdnavtiming)

    * [parameters](#parameters-navtiming)

  * [/v2/api/cicd/resources](#post-v2apicicdresources)

    * [parameters](#parameters-resources)

  * [/v2/api/cicd/usertiming](#post-v2apicicdusertiming)

    * [parameters](#parameters-usertiming)

  * [/v2/api/cicd/apitiming](#post-v2apicicdapitiming)

    * [parameters](#parameters-apitiming)

* [Common Parameters](#common-parameters-navtiming-usertiming-and-apitiming)

* [DEBUG output](#debug-output)

* [ESTRACE output](#estrace-output)

## **The API**

This API is based on nodejs/express and can be installed on both Windows and Linux Operating systems. Linux is highly recommended but of course, the choice is yours! Following are some recommendations for the system:

* Enterprise Linux recommended, 64-bit
* Windows Server 2012+, 64-bit
* nodejs + npm (version 6+)
* git

There are different ways to install this API. You can clone it from github and run `npm install`, you can insttall it globally from the NPM registry, or you can pull the Docker image.

### Installing the API

#### Option 1 - Clone from github

Install the API directly from the NPM repository by running:

```shell
$ git clone https://www.github.com/godaddy/timings.git
$ cd timings
$ npm i
...
```

#### Option 2 - NPM install (global)

Install the API directly from the NPM repository by running:

```shell
$ npm install -g timings
...
```

(You may need Adminstrator/root rights.)

#### Option 3 - Docker pull

The API is also available as a docker container! You can pull the image with the following command:

```shell
$ docker pull mverkerk/timings
...
```

You can also find a complete `docker-compose` based setup (incl. Elasticsearch and Kibana) here: [https://github.com/Verkurkie/timings-docker](https://github.com/Verkurkie/timings-docker)

### Installing Elasticsearch and Kibana

If you already have an Elasticsearch cluster, you can simply point the API to it with the correct parameters (see below: [Start the API](starting-the-api))

You can install Elasticsearch and Kibana yourself by following instructions from here: [Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/_installation.html) and [Kibana](https://www.elastic.co/guide/en/kibana/current/install.html).

To setup Kibana for the timings API, please follow the steps described in [KIBANA.MD](https://github.com/Verkurkie/timings-docker/blob/master/README.md#import-kibana-assets)

### Starting the API

Please review & edit the main config file as described in [CONFIG.MD](CONFIG.MD) before starting the server!

The startup command accepts following arguments:

```shell
$ timings --help
Options:
  -h, --help    Show help                                              [boolean]
  -d, --debug   enable console debugging              [boolean] [default: false]
  -e, --env     specify runtime environment
                    [choices: "local", "dev", "test", "prod"] [default: "local"]
  -f, --eshost  specify the elasticsearch host                     [default: ""]
  -g, --esport  specify the elasticsearch port                   [default: 9200]
  -k, --kbhost  specify the kibana host                            [default: ""]
  -l, --kbport  specify the kibana port                          [default: 5601]
  --watch       watch local build                     [boolean] [default: false]
  -p, --http    HTTP Port                                          [default: 80]
```

#### Running from the command line

Assuming you have installed the API with the `global` option, you can start it by running:

```shell
$ timings [arguments]
debug: SUCCESS! ElasticSearch cluster for [localhost] is alive!)
debug: Index [cicd-perf] exists: true
debug: Template [cicd-perf] exists/created: true
...
```

#### Using a process manager

We recommend running the API with a process manager such as `pm2`. Example:

```shell
$ pm2 start timings -- [arguments]
info: SUCCESS! ElasticSearch cluster for [CICD] is alive! Host: localhost
info: Index [cicd-perf] exists: true
info: TIMINGS API [local] is running on port 80
...
```

#### Running inside Docker

Or to run the API with Docker:

```shell
$ docker run -e "ES_HOST={elasticsearch}" -e "KB_HOST={kibana}" -p 80:80 mverkerk/timings:latest
npm info it worked if it ends with ok
npm info using npm@5.3.0
npm info using node@v8.4.0
npm info lifecycle timings@1.0.0~prestart: timings@1.0.0
...
```

You can also find a complete `docker-compose` based setup (incl. Elasticsearch and Kibana) here: [https://github.com/Verkurkie/timings-docker](https://github.com/Verkurkie/timings-docker)

## **THE CLIENTS**

To help you on your way from the client-side (your Selenium test script), you can install the API clients as follows:

|Language|Install|Readme|
|-|-|-|
|JavaScript|`npm install --save-dev timings-client-js`|[https://github.com/godaddy/timings-client-js](https://github.com/godaddy/timings-client-js)|
|Python|`pip install timingsclient`|[https://github.com/godaddy/timings-client-py](https://github.com/godaddy/timings-client-py)|
|Ruby|Coming soon!||
|Java|Coming soon!||

### Using the API without clients

The concept is that test-teams/SDETs can add the assertion of web/api performance to something that they already do: automated UI or API testing!

UI tesing - In the case of UI testing, these automated tests involve a browser (controlled via a WebDriver) in which certain user actions are performed. Why not ask that browser for performance metrics at the same time? All of the major browsers already measure & store this data every time a page is loaded! Sweet!

To make this happen, test scripts will have to make two WS calls:

* Call [`/v2/api/cicd/injectjs`](#post-v2apicicdinjectjs)
  * This method will return a url-encoded string containing JavaScript code
  * This code needs to be injected into webdriver (or equivalent) after **every** page load / user action!
  * The browser will return an object that becomes input for the second call (as the the injectJS parameter) …
* Call [`/v2/api/cicd/navtiming`](#post-v2apicicdnavtiming) or [`/v2/api/cicd/usertiming`](#post-v2apicicdusertiming)
  * navtiming is used for "full page loads"
  * usertiming is used for "soft page loads" and requires start/stop "marks" to be set in the browser!
  * These methods expect the `injectJS` object and a number of other objects with various settings & flags
  * These methods use ElasticSearch to get baselines, compare results, write back results
  * The response includes the `assert` field that can be used to assert the result

API testing - In this case, there is no browser and tests are mostly performed with cURL (or equivalent) calls. To grab performance for these tests, the tester will have to collect start/stop timestamps and send them to the API end point:

* Call [`/v2/api/cicd/apitiming`](#post-v2apicicdapitiming)
  * expects a start and a stop timestamp in standard UNIX (epoch) timestamp format
  * Uses ElasticSearch to get baselines, compare results, write back results
  * The response includes the `assert` field that can be used to assert the result

**NOTE:** All of the methods accept the `application/json` content-type only!

### **METHODS**

#### [POST] /v2/api/cicd/injectjs

Returns a **url-encoded** string containing JavaScript code. This string should be decoded and injected into the browser via webdriver or equivalent.
The browser's response is then used as POST data for [`/v2/api/cicd/navtiming`](#post-v2apicicdnavtiming) and [`/v2/api/cicd/usertiming`](#post-v2apicicdusertiming).

**NOTE:** The response should be decoded using `decodeURIComponent()` or equivalent before injecting it into the browser!

##### Parameters (injectjs)

|Name|Required?|Type|Description|
|-|-|-|-|
|`injectType`|yes|string|Valid values: `navtiming` or `usertiming`|
|`visualCompleteMark`|only used for injectType `navtiming`|string|Name of the "visual complete mark" as set by `performance.mark()`|

##### Example Request Body (injectjs)

```json
{
  "injectType":"navtiming",
  "visualCompleteMark":"initialPageLoad"
}
```

##### Example Response (injectjs)

```json
{
  "status": 200,
  "inject_code": "var%20visualCompleteTime%20%3D%200%3B%0Aif%20(performance.getEntriesByName('%22%20%2B%20visualCompleteMark%20%2B%20%22').length)%20%7B%0A%20%20visualCompleteTime%20%3D%20parseInt(performance.getEntriesByName('%22%20%2B%20visualCompleteMark%20%2B%20%22')%5B0%5D.startTime)%3B%0A%20%20window.performance.clearMarks()%3B%0A%7D%3B%0Areturn%20%7Btime%3Anew%20Date().getTime()%2C%20timing%3Awindow.performance.timing%2C%20visualCompleteTime%3A%20visualCompleteTime%2C%20url%3A%20document.location.href%2C%20resources%3A%20window.performance.getEntriesByType('resource')%7D%3B"
}
```

Decoded [navtiming]:

```javascript
var visualCompleteTime = 0;
if (performance.getEntriesByName('" + visualCompleteMark + "').length) {
  visualCompleteTime = parseInt(performance.getEntriesByName('" + visualCompleteMark + "')[0].startTime);
  window.performance.clearMarks();
};
return {time:new Date().getTime(), timing:window.performance.timing, visualCompleteTime: visualCompleteTime, url: document.location.href, resources: window.performance.getEntriesByType('resource')};
```

Decoded [usertiming]:

```javascript
var marks = window.performance.getEntriesByType('mark');
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
return {time:new Date().getTime(), measureArray:measureArray, url:document.location.href, marks};
```

Insert this decoded script into your browser object to collect the required performance data!

#### [POST] /v2/api/cicd/navtiming

Processes the performance data that was collected from the browser (resulting from the injectjs code - see above), retrieves baseline data from ElasticSearch,
asserts the measured page performance against baseline or SLA, and saves results to ElasticSearch.

Returns JSON object with results and debug/trace info, if requested.

##### Parameters (navtiming)

|Name|Required?|Type|Description|
|-|-|-|-|
|`injectJS`|yes|string|The value of this parameters is the FULL object returned by the browser as a result of injecting the JS code that was returned by [`/v2/api/cicd/injectjs`](#post-v2apicicdinjectjs).|

For the remaining parameters, see here: [common parameters](#common-parameters-navtiming-usertiming-and-apitiming)

##### Example Request Body (navtiming)

```json
{
  "injectJS": {
    "time": 1474997671801,
    "timing": {
      "navigationStart": 1474997673801,
      "unloadEventStart": 0,
      "unloadEventEnd": 0,
      "redirectStart": 0,
      "redirectEnd": 0,
      "fetchStart": 1474997676866,
      "domainLookupStart": 1474997676867,
      "domainLookupEnd": 1474997676867,
      "connectStart": 1474997676867,
      "connectEnd": 1474997676905,
      "secureConnectionStart": 1474997676880,
      "requestStart": 1474997676905,
      "responseStart": 1474997676990,
      "responseEnd": 1474997677298,
      "domLoading": 1474997676998,
      "domInteractive": 1474997677402,
      "domContentLoadedEventStart": 1474997677402,
      "domContentLoadedEventEnd": 1474997677403,
      "domComplete": 1474997677527,
      "loadEventStart": 1474997677527,
      "loadEventEnd": 1474997677534
    },
    "visualCompleteTime": 5992,
    "url": "http://www.example.com",
    "resources": [
      {
        connectEnd:52.095,
        connectStart:52.095,
        decodedBodySize:450,
        domainLookupEnd:52.095,
        ...
      },
      {
        ...
      }
    ]
  },
  "sla": {
    "pageLoadTime": 4000
  },
  "baseline": {
    "days": 7,
    "perc": 75,
    "padding": 1.2,
    "incl": {
      "team": "_log_"
    }
  },
  "flags": {
    "assertBaseline": true,
    "debug": false,
    "esTrace": false,
    "esCreate": false,
    "passOnFailedAssert": false
  },
  "log": {
    "team": "Sample team",
    "test_info": "Sample App (navtiming)",
    "env_tester": "test",
    "browser": "chrome",
    "env_target": "prod"
  }
}
```

##### Example Response (navtiming)

```json

{
  "status": 200,
  "api_version": "2.0.12",
  "export": {
    "perf": {
      "flatSLA": 4000,
      "measured": 830,
      "baseline": 830,
      "threshold": 996,
      "visualComplete": 1734
    },
    "info": {
      "ranBaseline": true,
      "usedBaseline": true,
      "assertType": "baseline_padding",
      "assertMetric": "pageLoadTime",
      "api_took": 99,
      "es_took": 1,
      "api_version": "2.0.12",
      "hasResources": true
    },
    "log": {
      "team": "Sample team",
      "test_info": "Sample App (navtiming)",
      "env_tester": "test",
      "browser": "chrome",
      "env_target": "prod"
    },
    "flags": {
      "assertBaseline": true,
      "debug": false,
      "esTrace": false,
      "esCreate": false,
      "passOnFailedAssert": false
    },
    "baseline": {
      "days": 7,
      "perc": 75,
      "padding": 1.2,
      "incl": {
        "team": "_log_"
      }
    },
    "nav": {
      "loadEventStart": 830,
      "domComplete": 829,
      "domInteractive": 777,
      "firstByteTime": 130,
      "dnsTime": 0,
      "redirectTime": 0,
      "connectTime": 14,
      "processingTime": 57
    },
    "et": "2017-09-29T23:16:12.869Z",
    "@timestamp": "2017-09-29T23:16:12.869Z",
    "status": "pass",
    "@_uuid": "8441cd30-892a-4cf8-9046-9f175c1b4f67",
    "dl": "www.example.com"
  },
  "assert": true,
  "esServer": "10.33.170.109",
  "esIndex": "cicd-perf",
  "esSaved": false,
  "resourceSaved": false,
}
```

#### [POST] /v2/api/cicd/usertiming

Processes data provided by the browser (from the injectjs code), retrieves baseline data from ElasticSearch,
asserts the measured page performance against baseline or SLA, and saves results to ElasticSearch.

Returns JSON object with results and debug/trace info, if requested.

##### Parameters (usertiming)

|Name|Required?|Type|Description|
|-|-|-|-|
|`injectJS`|yes|object|The object returned by the browser as a result of injecting the JS code that was returned by [`/v2/api/cicd/injectjs`](#post-v2apicicdinjectjs)

For the remaining parameters, see here: [common parameters](#common-parameters-navtiming-usertiming-and-apitiming)

##### Example Request (usertiming)

```json

{
  "injectJS": {
    "time": 1474997671801,
    "measureArray": [
      {
        "name": "test",
        "entryType": "measure",
        "startTime": 236377.80000000002,
        "duration":  5345.174999999988
      }
    ],
    "url": "https://www.w3.org/webperf/",
    "marks": [
      {
        "name": "test_start",
        "entryType": "mark",
        "startTime": 236377.80000000002,
        "duration": 0
      },
      {
        "name": "test_stop",
        "entryType": "mark",
        "startTime": 241722.975,
        "duration": 0
      }
    ]
  },
  "sla": {
    "pageLoadTime": 6000
  },
  "baseline": {
    "days": 7,
    "perc": 75,
    "padding": 1.2,
    "searchUrl": "*w3*webperf*",
    "incl": {
      "browser":"_log_",
      "environment":"_log_"
    },
    "excl": {
      "platform":""
  }
  },
  "flags": {
    "assertBaseline": true,
    "debug": false,
    "esTrace": false,
    "esCreate": false,
    "passOnFailedAssert": false
  },
  "log": {
    "team": "Sample team",
    "test_info": "Sample App (usertiming)",
    "env_tester": "test",
    "browser": "chrome",
    "env_target": "prod"
  }
}

```

##### Example Response (usertiming)

```json

{
  "status": 200,
  "api_version": "2.0.12",
  "export": {
    "perf": {
      "flatSLA": 6000,
      "measured": 3304,
      "baseline": 0,
      "threshold": 6000,
      "visualComplete": 3304
    },
    "info": {
      "ranBaseline": true,
      "usedBaseline": false,
      "assertType": "flat_sla",
      "assertMetric": "pageLoadTime",
      "api_took": 44,
      "es_took": 3,
      "api_version": "2.0.12",
      "hasResources": false
    },
    "log": {
      "team": "Sample team",
      "test_info": "Sample App (usertiming)",
      "env_tester": "test",
      "browser": "chrome",
      "env_target": "prod"
    },
    "flags": {
      "assertBaseline": true,
      "debug": false,
      "esTrace": false,
      "esCreate": false,
      "passOnFailedAssert": false
    },
    "baseline": {
      "days": 7,
      "perc": 75,
      "padding": 1.2,
      "searchUrl": "*w3*webperf*",
      "incl": {
        "browser": "_log_",
        "environment": "_log_"
      },
      "excl": {
        "platform": ""
      }
    },
    "et": "2017-09-29T23:22:41.765Z",
    "@timestamp": "2017-09-29T23:22:41.765Z",
    "status": "pass",
    "@_uuid": "7b171d80-9b44-4721-8872-ce2f5a86f363",
    "dl": "www.w3.org/webperf/"
  },
  "assert": true,
  "esServer": "localhost",
  "esIndex": "cicd-perf",
  "esSaved": false,
  "resourceSaved": false
}

```

#### [POST] /v2/api/cicd/apitiming

Processes timestamps provided by the tester, retrieves baseline data from ElasticSearch,
asserts the measured performance against baseline or SLA, and saves results to ElasticSearch.

Returns JSON object with results and debug/trace info, if requested.

##### Parameters (apitiming)

|Name|Required?|Type|Description|
|-|-|-|-|
|`url`|yes|string|The URL of the API that is being tested
|`timing`|yes|object|The START and STOP timestamps. Example: `{"startTime": 1474997676867,"endTime": 1474997676905}

For the remaining parameters, see here: [common parameters](#common-parameters-navtiming-usertiming-and-apitiming)

##### Example Request (apitiming)

```json

{
  "timing": {
    "startTime": 1474997676867,
    "endTime": 1474997676905
  },
  "url": "http://api.sample.com/endpoint",
  "sla": {
    "pageLoadTime": 200
  },
  "flags": {
    "assertBaseline": true,
    "debug": false,
    "esTrace": false,
    "esCreate": false,
    "passOnFailedAssert": false
  },
  "log": {
    "team": "Sample team",
    "test_info": "Sample App (apitiming)",
    "env_tester": "linux",
    "browser": "api_call",
    "env_target": "prod"
  }
}

```

##### Example Response (apitiming)

```json

{
  "status": 200,
  "api_version": "2.0.12",
  "export": {
    "perf": {
      "flatSLA": 200,
      "measured": 17,
      "baseline": 69,
      "threshold": 82,
      "visualComplete": 17
    },
    "info": {
      "ranBaseline": true,
      "usedBaseline": true,
      "assertType": "baseline_padding",
      "assertMetric": "pageLoadTime",
      "api_took": 40,
      "es_took": 1,
      "api_version": "2.0.12",
      "hasResources": false
    },
    "log": {
      "team": "Sample team",
      "test_info": "Sample App (apitiming)",
      "env_tester": "linux",
      "browser": "api_call",
      "env_target": "prod"
    },
    "flags": {
      "assertBaseline": true,
      "debug": false,
      "esTrace": false,
      "esCreate": false,
      "passOnFailedAssert": false
    },
    "baseline": {
      "days": 7,
      "perc": 75,
      "padding": 1.2
    },
    "et": "2017-09-29T23:30:11.756Z",
    "@timestamp": "2017-09-29T23:30:11.756Z",
    "status": "pass",
    "@_uuid": "b453ec35-52ab-4a61-a731-00c9229e0712",
    "dl": "api.sample.com/endpoint"
  },
  "assert": true,
  "esServer": "10.33.170.109",
  "esIndex": "cicd-perf",
  "esSaved": false,
  "resourceSaved": false
}

```

#### [POST] /v2/api/cicd/resources

Retrieves an array of resources for a particular test result given its UUID. This endpoint is used by the waterfall page.

Returns JSON object with array of resources.

##### Parameters (resources)

|Name|Required?|Type|Description|
|-|-|-|-|
|`id`|yes|string|The value of this parameters is the UUID of a previous test result

##### Example Request (resources)

```json

{
  "id": "fb20419b-0ec9-4e9f-8a2e-143884211469"
}

```

##### Example Response (resources)

```json

{
  "status": 200,
  "kibana_host": "10.33.170.109",
  "kibana_port": 5601,
  "resources": [
    {
      "perf": {
        "flatSLA": 4000,
        "measured": 830,
        "baseline": 0,
        "threshold": 4000,
        "visualComplete": 1734
      },
      "info": {
        "ranBaseline": true,
        "es_took": 9,
        "usedBaseline": false,
        "assertType": "flat_sla",
        "assertMetric": "pageLoadTime",
        "api_took": 5890,
        "api_version": "2.0.10",
        "hasResources": true
      },
      "log": {
        "team": "Sample team",
        "test_info": "Sample App (navtiming)",
        "env_tester": "test",
        "browser": "chrome",
        "env_target": "prod"
      },
      "flags": {
        "assertBaseline": true,
        "debug": false,
        "esTrace": false,
        "esCreate": true,
        "passOnFailedAssert": false
      },
      "baseline": {
        "days": 7,
        "perc": 75,
        "padding": 1.2,
        "searchUrl": "sample*test*",
        "incl": {
          "useragent_family": "*hrome*",
          "team": "_log_",
          "os_family": "_agg_"
        }
      },
      "nav": {
        "loadEventStart": 830,
        "domComplete": 829,
        "domInteractive": 777,
        "firstByteTime": 130,
        "dnsTime": 0,
        "redirectTime": 0,
        "connectTime": 14,
        "processingTime": 57
      },
      "dl": "www.example.com/",
      "status": "pass",
      "@_uuid": "fb20419b-0ec9-4e9f-8a2e-143884211469",
      "et": "1980-01-01T00:00:00.000Z",
      "@timestamp": "1980-01-01T00:00:00.000Z"
    },
    {
      "et": "1980-01-01T00:00:00.000Z",
      "@timestamp": "1980-01-01T00:00:00.000Z",
      "type": "navtiming",
      "@_uuid": "fb20419b-0ec9-4e9f-8a2e-143884211469",
      "dl": "www.example.com/",
      "uri": "https://www.example.com/",
      "uri_protocol": "https",
      "uri_host": "www.example.com",
      "uri_path": "/",
      "uri_query": null,
      "team": "Sample team",
      "start": 0,
      "duration": 773,
      "redirectStart": 0,
      "redirectDuration": 0,
      "appCacheStart": 0,
      "appCacheDuration": 0,
      "dnsStart": 67,
      "dnsDuration": 0,
      "tcpStart": 67,
      "tcpDuration": 47,
      "sslStart": 81,
      "sslDuration": 33,
      "requestStart": 114,
      "requestDuration": 130,
      "responseStart": 244,
      "responseDuration": 529,
      "loadEventStart": 830,
      "loadEventDuration": 3
    },
    {
      "et": "1980-01-01T00:00:00.000Z",
      "@timestamp": "1980-01-01T00:00:00.000Z",
      "type": "resource",
      "@_uuid": "fb20419b-0ec9-4e9f-8a2e-143884211469",
      "dl": "www.example.com/",
      "uri": "https://img.example.com/test/example.min.css",
      "uri_protocol": "https",
      "uri_host": "img.example.com",
      "uri_path": "/test/example.min.css",
      "uri_query": null,
      "team": "Sample team",
      "start": 254.59000000000003,
      "fetchStart": 254.59000000000003,
      "duration": 32.974999999999966,
      "decodedBodySize": 151067,
      "encodedBodySize": 36620,
      "transferSize": 36980,
      "initiatorType": "link",
      "redirectStart": 0,
      "redirectDuration": 0,
      "appCacheStart": 0,
      "appCacheDuration": 0,
      "dnsStart": 254.59000000000003,
      "dnsDuration": 0,
      "tcpStart": 254.59000000000003,
      "tcpDuration": 0,
      "sslStart": 0,
      "sslDuration": 0,
      "requestStart": 257.49,
      "requestDuration": 27.610000000000014,
      "responseStart": 285.1,
      "responseDuration": 2.464999999999975
    }
  ]
}

```

### Common Parameters (navtiming, usertiming and apitiming)

The "common parameters" are used by for following endpoints:

[`/v2/api/cicd/navtiming`](#post-v2apicicdnavtiming)\
[`/v2/api/cicd/usertiming`](#post-v2apicicdusertiming)\
[`/v2/api/cicd/apitiming`](#post-v2apicicdapitiming)

|Name|Required?|Type|Description|
|-|-|-|-|
|`sla`|yes|object|This is the "flat" threshold value for the metric to be asserted. Currently, the API only supports the `pageLoadTime` and `visualCompleteTime` metrics. Example: `{"pageLoadTime": 4000}`. Note: The value will be used for assertion if (a) `flags.assertBaseline = false` or (b) it is **lower than the baseline** value.
|`baseline`|no|object|Set of parameters that determine how the baseline is determined. Sub-parameters:
|`baseline.days`|no|integer|Number of days for the baseline
|`baseline.perc`|no|integer|The percentile for the baseline
|`baseline.padding`|no|integer|Baseline multiplyer that enabled you to "pad" the baseline. Value has to be > 1
|`baseline.searchUrl`|no|string|A custom search string/wildcard for the baseline. This will be applied to the 'dl' field query. Has to be a full, valid Kibana search string and **can not be empty**!
|`baseline.incl`|no|object|This can be used to fine-tune the baseline query. The key-value pair will be used as an "include-filter" for the ElasticSearch query. Example: `{"browser": "chrome"}`
|`baseline.excl`|no|object|This can be used to fine-tune the baseline query. The key-value pair will be used as an "exclude-filter" for the ElasticSearch query. Example: `{"status": "fail"}` to exclude all the failed tests
|`flags`|no|object|Collection of flags for actions & return output. Sub-parameters:
|`flags.assertBaseline`|no|boolean|Assert against RUM baseline (true) or against flat sla (false)
|`flags.debug`|no|boolean|Return debug output
|`flags.esTrace`|no|boolean|Return ElasticSearch trace output
|`flags.esCreate`|no|boolean|Write results to ElasticSearch
|`flags.passOnFailedAssert`|no|boolean|Will determine whether a **failed** assertion will still return `true` in the assert field
|`log`|no|object|Set of key/value pairs that will be saved to ElasticSearch. You can add any key-value pair here but the following are mandatory / recommended:
|`log.test_info`|no|boolean|String describing the page/transaction being tested. Example: "Login to home page"
|`log.env_tester`|no|boolean|The platform of the test **source**. Examples: "local", "saucelabs-windows-firefox47"
|`log.browser`|no|boolean|The browser used to run the test. Examples: "chrome", "firefox"
|`log.env_target`|no|boolean|Environment of the test **target**. Examples: "test", "prod"
|`log.team`|no|boolean|Short string describing the product or test team

### DEBUG output

When you set `flags.debug` parameter to `true`, the API will return additional information in the response JSON. The output will include the following additional sections:

|Key|Description|
|-|-|
|`params`|Contains all the parameters that were send in the POST body plus the default ones|
|`debugMsg`|Contains 'DEBUG' messages that occured during execution of the code|
|`infoMsg`|Contains 'INFO' messages that occured during execution of the code|
|`timingInfo`|Contains calculated values of performance metrics|

Example of the Debug response:

```json

{
  "debugMsg": [
    {
      "type": "DEBUG",
      "message": "[navtimings] pageLoadTime: 3726"
    },
    {
      "type": "DEBUG",
      "message": "[navtimings] visualCompleteTime: 5992"
    },
    {
      "type": "DEBUG",
      "message": "[runBaseline] Going to run baseline ..."
    },
    {
      "type": "DEBUG",
      "message": "SUCCESS:  Baseline found..."
    },
    {
      "type": "DEBUG",
      "message": "[esResult] Search info: url=\"*w3*webperf*\" - days=7 - percentile=75"
    },
    {
      "type": "DEBUG",
      "message": "[esResult] Response info: took 129ms - hits=88 - baseline=1118.25"
    },
    {
      "type": "DEBUG",
      "message": "[assertPerf] Asserting [pageLoadTime] against flat_sla:result: pass,assertBaseline=false,actual=3726,baseline + padding=1341.6,flat SLA=6000"
    }
  ],
  "infoMsg": [
    {
      "type": "INFO",
      "message": "[savePerfLog] RESULT NOT SAVED!! Flag [esCreate] set to false - Output will be in the [export] key of this response!"
    }
  ],
  "params": {
    "injectJS": {
      "timing": {
        "navigationStart": 1474997673801,
        "unloadEventStart": 0,
        "unloadEventEnd": 0,
        "redirectStart": 0,
        "redirectEnd": 0,
        "fetchStart": 1474997676866,
        "domainLookupStart": 1474997676867,
        "domainLookupEnd": 1474997676867,
        "connectStart": 1474997676867,
        "connectEnd": 1474997676905,
        "secureConnectionStart": 1474997676880,
        "requestStart": 1474997676905,
        "responseStart": 1474997676990,
        "responseEnd": 1474997677298,
        "domLoading": 1474997676998,
        "domInteractive": 1474997677402,
        "domContentLoadedEventStart": 1474997677402,
        "domContentLoadedEventEnd": 1474997677403,
        "domComplete": 1474997677527,
        "loadEventStart": 1474997677527,
        "loadEventEnd": 1474997677534,
        "visualCompleteTime": 1474997679793
      },
      "visualCompleteTime": 5992,
      "url": "http://www.w3.org/webperf/"
    },
    "sla": {
      "pageLoadTime": 6000
    },
    "baseline": {
      "src": "cicd",
      "days": 7,
      "perc": 75,
      "padding": 1.2,
      "incl": {
        "platform": "_log_",
        "browser": "_log_",
        "environment": "_log_"
      },
      "searchUrl": "*w3*webperf*",
      "aggField": "act_pageLoadTime"
    },
    "flags": {
      "assertBaseline": false,
      "debug": true,
      "esTrace": false,
      "esCreate": false,
      "passOnFailedAssert": false
    },
    "log": {
      "team": "perfeng",
      "app_info": "test App (navtiming)",
      "platform": "saucelabs-windows-firefox47",
      "browser": "firefox",
      "environment": "test"
    },
    "startTime": 1492102183494
  },
  "timingInfo": {
    "timingType": "navtiming",
    "redirectStart": 0,
    "AppCacheStart": 3065,
    "dnsStart": 3066,
    "connectStart": 3066,
    "sslStart": 3079,
    "requestStart": 3104,
    "downloadStart": 3189,
    "processingStart": 3497,
    "domLoadingStart": 3197,
    "onLoadStart": 3726,
    "firstByteTime": 85,
    "domInteractiveTime": 3601,
    "domCompleteTime": 3726,
    "pageLoadTime": 3726,
    "visualCompleteTime": 5992,
    "redirectTime": 0,
    "appCacheTime": 1,
    "dnsTime": 0,
    "connectTime": 13,
    "sslTime": 25,
    "downloadTime": 308,
    "processingTime": 229,
    "loadingTime": 7
  }
}

```

### ESTRACE output

When you set `flags.esTrace` to `true`, the API will return the baseline query and response in the response JSON. The output will include the `esTrace` key that holds up to three sections:

|Key|Description|
|-|-|
|ES_SEARCH|This is the query that was send to ELK by the API|
|ES_RESPONSE|This is the full response received from ELK. Interesting items to look at are:|
||- `response.hits.total` = the number of matched documents
||- `response.hits.hits` = contains a few of the actual documents that matched the query
||- `response.aggregations` = here you can find the baseline aggregation!
|ES_CREATE|Contains measured values of timing metrics|
|export|Contains the JSON data that was (or would have been) saved to the ElasticSearch CICD index.|
||NOTE: the `export` object will also be included when `flags.esCreate` is set to `false`

Example of the `esTrace` output:

```json

{
  "esTrace": [
    {
      "type": "ES_SEARCH",
      "src": "cicd",
      "host": "localhost:9200",
      "index": "cicd-perf/usertiming",
      "search_query": {
        "query": {
          "bool": {
            "must": [
              {
                "query_string": {
                  "default_field": "dl",
                  "query": "w3*webperf*"
                }
              },
              {
                "range": {
                  "et": {
                    "from": "now-14d",
                    "to": "now"
                  }
                }
              }
            ]
          }
        },
        "size": 5,
        "aggs": {
          "baseline": {
            "percentiles": {
              "field": "act_pageLoadTime",
              "percents": [
                75
              ]
            }
          }
        }
      }
    },
    {
      "type": "ES_RESPONSE",
      "response": {
        "took": 323,
        "timed_out": false,
        "_shards": {
          "total": 1,
          "successful": 1,
          "failed": 0
        },
        "hits": {
          "total": 1779,
          "max_score": 2,
          "hits": [
            {
              "_index": "cicd-perf",
              "_type": "usertiming",
              "_id": "AVsiPO3XgIFNtugI0oui",
              "_score": 2,
              "_source": {
                "dl": "www.w3.org/webperf/",
                "ranBaseline": false,
                "rum_pageLoadTime": 0,
                "usedBaseline": false,
                "assertType": "flat_sla",
                "status": "fail",
                "req_pageLoadTime": 10000,
                "act_pageLoadTime": 12170,
                "sla_pageLoadTime": 10000,
                "vis_pageLoadTime": 12170,
                "et": "2017-03-31T02:41:10.101Z",
                "@timestamp": "2017-03-31T02:41:10.101Z",
                "app_info": "test App (navtiming)",
                "platform": "saucelabs-windows-firefox47",
                "browser": "firefox",
                "server": "saucelabs",
                "buildURL": "",
                "environment": "test",
                "tags": "dt_firefox_regression",
                "team": "WSB",
                "flag_useRum": false,
                "flag_assertBaseline": false,
                "flag_debug": false,
                "flag_esTrace": false,
                "flag_esCreate": true,
                "flag_passOnFailedAssert": false,
                "baseline_src": "rum",
                "baseline_days": 7,
                "baseline_perc": 75,
                "baseline_padding": 20,
                "baseline_searchUrl": "*w3c*webperf*",
                "api_took": 4,
                "api_version": "2.0.2"
              }
            },
            {
              "_index": "cicd-perf",
              "_type": "usertiming",
              "_id": "AVsigv1UgIFNtugI0twP",
              "_score": 2,
              "_source": {
                "dl": "www.w3.org/webperf/",
                "ranBaseline": false,
                "rum_pageLoadTime": 0,
                "usedBaseline": false,
                "assertType": "flat_sla",
                "status": "pass",
                "req_pageLoadTime": 10000,
                "act_pageLoadTime": 2652,
                "sla_pageLoadTime": 10000,
                "vis_pageLoadTime": 2652,
                "et": "2017-03-31T03:57:41.586Z",
                "@timestamp": "2017-03-31T03:57:41.586Z",
                "app_info": "test App (navtiming)",
                "platform": "tempe-android-s5-atom",
                "browser": "chrome",
                "server": "tempe-lab",
                "branch": "update-precheck",
                "buildURL": "",
                "buildVersion": "65fa65c",
                "workflow": "pr",
                "workflowStep": "uitest_android_chrome_real_perf",
                "environment": "test",
                "tags": "perf-real-device",
                "uuid": "check-widget-mutator",
                "team": "WSB",
                "flag_useRum": false,
                "flag_assertBaseline": false,
                "flag_debug": false,
                "flag_esTrace": false,
                "flag_esCreate": true,
                "flag_passOnFailedAssert": false,
                "baseline_src": "rum",
                "baseline_days": 7,
                "baseline_perc": 75,
                "baseline_padding": 20,
                "baseline_searchUrl": "*w3c*webperf*",
                "api_took": 5,
                "api_version": "2.0.2"
              }
            }
          ]
        },
        "aggregations": {
          "baseline": {
            "values": {
              "75.0": 6620.900000000001
            }
          }
        }
      }
    }
  ]
}

```
