# TIMINGS API

[![Build Status](https://travis-ci.org/godaddy/timings.svg?branch=master)](https://travis-ci.org/godaddy/timings) [![npm version](https://badge.fury.io/js/timings.svg)](https://www.npmjs.com/package/timings) [![Node version](https://img.shields.io/node/v/timings.svg?style=flat)](http://nodejs.org/download/) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/godaddy/timings/issues)

## **TL;DR**

The timings API is a solution for asserting **web UI or API performance** during functional/integration tests!

Run this API in your local network => install one of the clients on your dev/test machine => add a few lines of code => assert perf & collect data!

Call the API **from your test script(s)** (using platform specific [clients](#the-clients) or directly) to:

1. [UI tests only] Grab a snippet of JavaScript code from the API [`/v2/api/cicd/injectjs`](#post-v2apicicdinjectjs)
2. [UI tests only] Decode the `"inject_code"` key from the response and inject it into your browser/webdriver
3. [UI tests only] Send the browser's response (json object) from step 2 back to the API ([/v2/api/cicd/navtiming](#post-v2apicicdnavtiming) or [/v2/api/cicd/usertiming](#post-v2apicicdusertiming))
4. [API tests only] Send timestamps to the API ([/v2/api/cicd/apitiming](#post-v2apicicdapitiming))
5. [UI and API tests] Use the API's response to assert performance (look for the `assert` field in the response)

To simplify communication with the API, there are currently three [clients](#the-clients) that you can install: one for JavaScript (`npm i --save-dev timings-client-js`), one for Python (`pip install timingsclient`) and one for Java (see here: [https://github.com/kaygee/timings-client](https://github.com/kaygee/timings-client)). Easy to install and easy to use! For all other languages, you can interact with API yourself using http `POST` calls. More info [here](#using-the-api-without-clients).

Continue reading below for more details about the API and the clients.

Enjoy!

------

## Table of Contents

* [The API](#the-api)

  * [Installing, running and upgrading the API](#installing-running-the-api)

  * [Upgrading the API](#upgrading-the-api)

  * [Manual installation of Elasticsearch/Kibana](#manual-setup-for-elasticsearch-and-kibana)

* [The clients](#the-clients)

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

The timings API is a node/express based API the uses ElasticSearch and Kibana (we'll call that "ELK") to store & visualize data. The idea behind the API is to submit/validate/store/assert performance measurements as part of regular functional test cycles.

The API can be run in various ways (see below) and it _can_ be run without ELK although that is not recommended (you miss out on a lot of the goodies!). You can run ELK yourself or you can make use of the convenient [timings-docker](https://github.com/mverkerk-godaddy/timings-docker) repo!

The API can be installed on both Windows and Linux Operating systems. Linux is highly recommended but of course, the choice is yours! Following are some system recommendations:

* **Enterprise Linux, 64-bit** [recommended]
* **Windows Server 2012+, 64-bit**
* **nodejs + npm (version 8+)** - see [here](https://nodejs.org/en/download/package-manager/)
* **git** - see [here](https://git-scm.com/downloads)

### **Installing and running the API**

The recommended method is "**docker-compose**" as it includes ELK and requires the least amount of setup/configuration! You can also clone this repo and run the API with `node` from inside the cloned directory, or you can install it **globally** with `npm i -g` (from the public NPM registry), or you can build/pull/run a stand-alone Docker container.

**NOTE**: It is important that you **create a config file** before you start the API! Your config file can be in JS, JSON or YML format (examples are provided in the root of this repo).

You need to point the API at the config file using the `CONFIGFILE` environment variable. If you fail to do this, the API will use defaults settings such as `""` for the elasticsearch server (= don't use ElasticSearch)! Please refer to [CONFIG.MD](CONFIG.MD) for more details.

Below are the different install & run commands for each method as well as the instructions on how to point to the config file:

## docker-compose (recommended)

For more info, check the repo here: [https://github.com/mverkerk-godaddy/timings-docker](https://github.com/mverkerk-godaddy/timings-docker)

Activity|Command
---|---
Install|`$ git clone https://github.com/mverkerk-godaddy/timings-docker`
Startup|`$ cd timings-docker`<br>`$ CONFIGFILE={path} docker-compose up`
Upgrade|`$ git pull`<br>`$ CONFIGFILE={path} docker-compose up --build`
Config|Can be anywhere! Set `$ CONFIGFILE={path}` variable before the docker-compose command!

## Git clone

You have to run ELK yourself! See also here: [installing-elasticsearch-and-kibana](#installing-elasticsearch-and-kibana)

Activity|Command
---|---
Installation|`$ git clone https://www.github.com/godaddy/timings.git`<br>`$ cd timings`<br>`$ npm i`
Startup|`$ CONFIGFILE={path} node ./server.js`
Upgrade|`$ git pull`<br>`$ CONFIGFILE={path} node ./server.js`
Config|Can be anywhere! Use the `CONFIGFILE` environment variable!

## NPM install

You have to run ELK yourself! See also here: [installing-elasticsearch-and-kibana](#installing-elasticsearch-and-kibana)

Activity|Command
---|---
Installation|`$ npm install -g timings`
Startup|`$ CONFIGFILE={path} timings`
Upgrade|`$ npm update -g timings`<br>`$ CONFIGFILE={path} timings`
Config|Can be anywhere! Use the `CONFIGFILE` environment variable!

## Docker (stand-alone)

You have to run ELK yourself! See also here: [installing-elasticsearch-and-kibana](#installing-elasticsearch-and-kibana)

Activity|Command
---|---
Installation|`$ docker pull mverkerk/timings:{version}`
Startup|`$ docker run \`<br>`-d -v {path to config}:/src/.config.js \`<br>`-p {VM_port}:{Host_port} \`<br>`mverkerk/timings:{version}`
Upgrade|Just point at the latest version or use `mverkerk/timings:latest` in the startup command.<br>You can find the latest version here: [https://hub.docker.com/r/mverkerk/timings/tags/](https://hub.docker.com/r/mverkerk/timings/tags/)
Config|Your config file can be stored anywhere you want. Use the `-v` argument to mount the config file in the container.<br>`{path to config}` = the **absolute** path to your config file<br>`{VM_port}` = the listening port of the API server inside the container<br>`{Host_port}` = the port that you want the **docker host** to listen on. This is the port used to connect to the API!!<br>`{version}` = the desired version of the timings API. You can also use `"latest"`

### **Upgrading the API**

On every startup of the API, the code will check for differences in the version and run the necessary updates. This may include updates to the Elasticsearch template & index-patterns and may add new visualizations & dashboards to Kibana! This process runs automatically when you startup the API again after an upgrade! For upgrade instructions, see the above run options.

### **Manual setup for Elasticsearch and Kibana**

If you choose to install & run Elasticsearch and Kibana yourself, you can reference these sources: [Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/_installation.html) and [Kibana](https://www.elastic.co/guide/en/kibana/current/install.html).

You can also use `docker-compose` using the `docker-compose-elk.yml` file in [https://github.com/mverkerk-godaddy/timings-docker](https://github.com/mverkerk-godaddy/timings-docker)

**IMPORTANT:** If you run Elasticsearch and Kibana yourself, you **HAVE** to point the API to their respective hostnames! You can do this in **one** of the following ways (ENV vars take priority!):

1. Use the correct keys in the `env` object of your config file. See [CONFIG.MD](CONFIG.MD).
1. Set Environment Variables for `ES_PROTOCOL`, `ES_HOST`, `ES_PORT`, `ES_VERSION`, `KB_HOST` and `KB_PORT`

* **The API also supports authentication for elasticsearch!**
  * use `ES_USER` and `ES_PASS` for Basic Auth
  * use `ES_SSL_CERT` and `ES_SSL_KEY` for SSL Auth
  * **NOTE:** If both are provided, SSL auth will be used!

## **THE CLIENTS**

To help you on your way from the client-side (your Selenium test script), you can install the API clients as follows:

|Language|Install|Readme|
|-|-|-|
|JavaScript|`npm install --save-dev timings-client-js`|[https://github.com/godaddy/timings-client-js/blob/master/README.md](https://github.com/godaddy/timings-client-js/blob/master/README.md)|
|Python|`pip install timingsclient`|[https://github.com/godaddy/timings-client-py/blob/master/README.md](https://github.com/godaddy/timings-client-py/blob/master/README.md)|
|Java|IntelliJ: import as maven project<br>Java Project: build/publish with `mvn` or add to your maven POM|[https://github.com/kaygee/timings-client/blob/master/README.md](https://github.com/kaygee/timings-client/blob/master/README.md)|
|Ruby|Coming soon!||

### Using the API without clients

The concept is that test-teams/SDETs can add the assertion of web/api performance to something that they already do: automated UI or API testing!

UI tesing - In the case of UI testing, these automated tests involve a browser (controlled via a WebDriver) in which certain user actions are performed. Why not ask that browser for performance metrics at the same time? All of the major browsers already measure & store this data every time a page is loaded! Sweet!

To make this happen, test scripts will have to make two WS calls:

* Call [`/v2/api/cicd/injectjs`](#post-v2apicicdinjectjs)
  * This method will return a url-encoded string containing JavaScript code
  * This code needs to be injected into webdriver after **every** page load / user action!
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
|`visualCompleteMark`|no|string|Used in combination with `navtiming` - Name of the "visual complete mark" as set by `performance.mark()`. Default is `visual_complete`|
|`stripQueryString`|no|boolean|Setting this to `true` will strip the querystring from the current URL. Default is `false`.|

##### Example Request Body (injectjs)

```json
{
  "injectType":"navtiming",
  "visualCompleteMark":"visual_complete",
  "stripQueryString": true
}
```

##### Example Response (injectjs)

```json
{
  "status": 200,
  "inject_code": "var%20visualCompleteTime%20%3D%200%3B%0A%20%20if%20(performance.getEntriesByName('visual_complete').length)%20%7B%0A%20%20%20%20%20%20visualCompleteTime%20%3D%20parseInt(performance.getEntriesByName('visual_complete')%5B0%5D.startTime)%3B%0A%20%20%20%20%20%20window.performance.clearMarks()%3B%0A%20%20%7D%3B%0A%20%20return%20%7B%0A%20%20%20%20%20%20time%3Anew%20Date().getTime()%2C%0A%20%20%20%20%20%20timing%3Awindow.performance.timing%2C%0A%20%20%20%20%20%20visualCompleteTime%3A%20visualCompleteTime%2C%0A%20%20%20%20%20%20url%3A%20document.location.href.split(%22%3F%22)%5B0%5D%2C%0A%20%20%20%20%20%20resources%3A%20window.performance.getEntriesByType('resource')%0A%20%20%7D%3B"
}
```

Decoded [navtiming]:

```javascript
var visualCompleteTime = 0;
if (performance.getEntriesByName('" + visualCompleteMark + "').length) {
  visualCompleteTime = parseInt(performance.getEntriesByName('" + visualCompleteMark + "')[0].startTime);
  window.performance.clearMarks();
};
return {time:new Date().getTime(), timing:window.performance.timing, visualCompleteTime: visualCompleteTime, url: document.location.href.split('?')[0], resources: window.performance.getEntriesByType('resource')};
```

Insert this decoded script into your browser object to collect the required performance data!

#### [POST] /v2/api/cicd/navtiming

Processes the performance data that was collected from the browser (resulting from the injectjs code - see above), retrieves baseline data from ElasticSearch,
asserts the measured page performance against baseline or SLA, and saves results to ElasticSearch.

Returns JSON object with results and debug/trace info, if requested.

##### Parameters (navtiming)

|Name|Required?|Type|Description|
|-|-|-|-|
|`injectJS`|yes|object|This is the FULL response object returned by the browser as a result of injecting the code that was obtained from [`/v2/api/cicd/injectjs`](#post-v2apicicdinjectjs).|

For the remaining parameters, see here: [common parameters](#common-parameters-navtiming-usertiming-and-apitiming)

##### Example Request Body (navtiming)

```json
{
    "injectJS": {
        "time": 1515175358980,
        "timing": {
            "navigationStart": 1515175358980,
            "unloadEventStart": 0,
            "unloadEventEnd": 0,
            "redirectStart": 0,
            "redirectEnd": 0,
            "fetchStart": 1515175359044,
            "domainLookupStart": 1515175359047,
            "domainLookupEnd": 1515175359047,
            "connectStart": 1515175359047,
            "connectEnd": 1515175359094,
            "secureConnectionStart": 1515175359061,
            "requestStart": 1515175359094,
            "responseStart": 1515175359224,
            "responseEnd": 1515175359753,
            "domLoading": 1515175359233,
            "domInteractive": 1515175359757,
            "domContentLoadedEventStart": 1515175359757,
            "domContentLoadedEventEnd": 1515175359772,
            "domComplete": 1515175359809,
            "loadEventStart": 1515175359810,
            "loadEventEnd": 1515175359813
        },
        "visualCompleteTime": 1734,
        "url": "https://www.test-godaddy.com/",
        "resources": [
            {
                "name": "https://img1.wsimg.com/ux/1.3.46-brand/css/uxcore-sales.min.css",
                "entryType": "resource",
                "startTime": 254.55,
                "duration": 28.064999999999998,
                "initiatorType": "link",
                "workerStart": 0,
                "redirectStart": 0,
                "redirectEnd": 0,
                "fetchStart": 254.55,
                "domainLookupStart": 254.55,
                "domainLookupEnd": 254.55,
                "connectStart": 254.55,
                "connectEnd": 254.55,
                "secureConnectionStart": 0,
                "requestStart": 256.665,
                "responseStart": 279.37,
                "responseEnd": 282.615,
                "transferSize": 17008,
                "encodedBodySize": 16731,
                "decodedBodySize": 93840
            },
            {
                "name": "https://img1.wsimg.com/wrhs/725d0b82d00774200f2cc0f7283a5b3d/salesheader.min.css",
                "entryType": "resource",
                "startTime": 254.59000000000003,
                "duration": 32.974999999999966,
                "initiatorType": "link",
                "workerStart": 0,
                "redirectStart": 0,
                "redirectEnd": 0,
                "fetchStart": 254.59000000000003,
                "domainLookupStart": 254.59000000000003,
                "domainLookupEnd": 254.59000000000003,
                "connectStart": 254.59000000000003,
                "connectEnd": 254.59000000000003,
                "secureConnectionStart": 0,
                "requestStart": 257.49,
                "responseStart": 285.1,
                "responseEnd": 287.565,
                "transferSize": 36980,
                "encodedBodySize": 36620,
                "decodedBodySize": 151067
            }
        ]
    },
    "sla": {
        "pageLoadTime": 3000
    },
    "baseline": {
        "days": 7,
        "perc": 75,
        "padding": 1.2
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
    "api_version": "1.1.3",
    "assert": true,
    "route": "navtiming",
    "esSaved": "ElasticSearch is not available or 'flags.esCreate=false'!",
    "export": {
        "et": "2018-01-05T18:03:52.418Z",
        "@timestamp": "2018-01-05T18:03:52.418Z",
        "status": "pass",
        "@_uuid": "38ec95e5-5dd3-4b93-b2a4-a4d1cdb6d6c5",
        "dl": "www.test-godaddy.com/",
        "perf": {
            "flatSLA": 3000,
            "measured": 830,
            "baseline": 0,
            "threshold": 3000,
            "visualComplete": 1734
        },
        "info": {
            "ranBaseline": false,
            "usedBaseline": false,
            "assertMetric": "pageLoadTime",
            "api_took": 0,
            "api_version": "1.1.3",
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
            "padding": 1.2
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
        }
    }
}
```

#### [POST] /v2/api/cicd/usertiming

Processes data provided by the browser (from the injectjs code), retrieves baseline data from ElasticSearch, asserts the measured performance against baseline or SLA, and saves results to ElasticSearch.

Returns JSON object with results and debug/trace info, if requested.

##### Parameters (usertiming)

|Name|Required?|Type|Description|
|-|-|-|-|
|`injectJS`|yes|object|This is the FULL response object returned by the browser as a result of injecting the JS code that was returned by [`/v2/api/cicd/injectjs`](#post-v2apicicdinjectjs)

For the remaining parameters, see here: [common parameters](#common-parameters-navtiming-usertiming-and-apitiming)

##### Example Request (usertiming)

```json

{
    "injectJS": {
        "time": 1515175191685,
        "measureArray": [
            {
                "name": "test",
                "entryType": "measure",
                "startTime": 119375,
                "duration": 1583
            }
        ],
        "url": "https://www.sample.com",
        "marks": [
            {
                "name": "test_start",
                "entryType": "mark",
                "startTime": 119375,
                "duration": 0
            },
            {
                "name": "test_stop",
                "entryType": "mark",
                "startTime": 120958,
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
        "searchUrl": "*sample*test*",
        "incl": {
            "browser": "_log_",
            "environment": "_log_"
        },
        "excl": {
            "platform": ""
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
    "api_version": "1.1.3",
    "assert": true,
    "route": "usertiming",
    "esSaved": "ElasticSearch is not available or 'flags.esCreate=false'!",
    "export": {
        "et": "2018-01-05T18:00:58.805Z",
        "@timestamp": "2018-01-05T18:00:58.805Z",
        "status": "pass",
        "@_uuid": "ae251cab-f2e7-4fa0-9ab3-56d7ba36daed",
        "dl": "www.sample.com",
        "perf": {
            "flatSLA": 6000,
            "measured": 3869,
            "baseline": 0,
            "threshold": 6000,
            "visualComplete": 3869
        },
        "info": {
            "ranBaseline": false,
            "usedBaseline": false,
            "assertMetric": "pageLoadTime",
            "api_took": 0,
            "api_version": "1.1.3",
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
            "searchUrl": "*sample*test*",
            "incl": {
                "browser": "_log_",
                "environment": "_log_"
            },
            "excl": {
                "platform": ""
            }
        }
    }
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
|`timing`|yes|object|The START and STOP timestamps. Example: `{"timing": {"startTime": 1474997676867, "endTime": 1474997676905}}`

For the remaining parameters, see here: [common parameters](#common-parameters-navtiming-usertiming-and-apitiming)

##### Example Request (apitiming)

```json

{
  "timing": {
    "startTime": 1515175107429,
    "endTime": 1515175107471
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
    "api_version": "1.1.3",
    "assert": true,
    "route": "apitiming",
    "esSaved": "ElasticSearch is not available or 'flags.esCreate=false'!",
    "export": {
        "et": "2018-01-05T17:57:31.387Z",
        "@timestamp": "2018-01-05T17:57:31.387Z",
        "status": "pass",
        "@_uuid": "782f4d5b-b4f8-49bd-bf6b-bc68503e8cd7",
        "dl": "api.sample.com/endpoint",
        "perf": {
            "flatSLA": 200,
            "measured": 57,
            "baseline": 0,
            "threshold": 200,
            "visualComplete": 57
        },
        "info": {
            "ranBaseline": false,
            "usedBaseline": false,
            "assertMetric": "pageLoadTime",
            "api_took": 0,
            "api_version": "1.1.3",
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
        }
    }
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
  "kibana_host": "localhost",
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
|`baseline.searchUrl`|no|string|A custom search string/wildcard for the baseline. This will be applied to the 'dl' field query. Has to be a full, valid Kibana search string and must contain at least one `'*'` character/wildcard!
|`baseline.incl`|no|object|This can be used to fine-tune the baseline query. The key-value pair will be used as an "include-filter" for the ElasticSearch query. Example: `{"browser": "chrome"}`
|`baseline.excl`|no|object|This can be used to fine-tune the baseline query. The key-value pair will be used as an "exclude-filter" for the ElasticSearch query. Example: `{"status": "fail"}` to exclude all the failed tests
|`flags`|no|object|Collection of flags for actions & return output. Sub-parameters:
|`flags.assertBaseline`|no|boolean|Assert against RUM baseline (true) or against flat sla (false)
|`flags.debug`|no|boolean|Return debug output
|`flags.esTrace`|no|boolean|Return ElasticSearch trace output
|`flags.esCreate`|no|boolean|Write results to ElasticSearch
|`flags.passOnFailedAssert`|no|boolean|Will determine whether a **failed** assertion will still return `true` in the assert field
|`multirun`|no|object|Object to be used for **multi-run** tests. Sub-parameters:
|`multirun.totalRuns`|yes|integer|Total number of tests runs
|`multirun.currentRun`|yes|boolean|Current test run
|`multirun.id`|yes|boolean|Unique string of **at least 6** alphanumeric characters
|`log`|*|object|Set of key/value pairs that will be saved to ElasticSearch. You can add any key-value pair here but the following are mandatory / recommended:
|`log.test_info`|*|boolean|String describing the page/transaction being tested. Example: "Login to home page"
|`log.env_tester`|*|boolean|The platform of the test **source**. Examples: "local", "saucelabs-windows-firefox47"
|`log.browser`|*|boolean|The browser used to run the test. Examples: "chrome", "firefox"
|`log.env_target`|*|boolean|Environment of the test **target**. Examples: "test", "prod"
|`log.team`|*|boolean|Short string describing the product or test team

**NOTE:** mandatory `log` parameters can be set in the server's config file! Above parameters are just a suggestion. Look for the `required` field here: [CONFIG.MD](CONFIG.MD) for more info.

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
      "src": "timings",
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
      "test_info": "test App (navtiming)",
      "env_tester": "saucelabs-windows-firefox47",
      "browser": "firefox",
      "env_target": "test"
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
|export|Contains the JSON data that was (or would have been) saved to ElasticSearch.|
||NOTE: the `export` object is always in the response, even when `flags.esCreate` is set to `false`!

Example of the `esTrace` output:

```json

{
  "esTrace": [
    {
      "type": "ES_SEARCH",
      "src": "timings",
      "host": "localhost:9200",
      "index": "timings-perf/usertiming",
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
              "_index": "timings-perf",
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
                "test_info": "test App (navtiming)",
                "env_tester": "saucelabs-windows-firefox47",
                "browser": "firefox",
                "server": "saucelabs",
                "buildURL": "",
                "env_target": "test",
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
              "_index": "timings-perf",
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
                "test_info": "test App (navtiming)",
                "env_tester": "tempe-android-s5-atom",
                "browser": "chrome",
                "server": "tempe-lab",
                "branch": "update-precheck",
                "buildURL": "",
                "buildVersion": "65fa65c",
                "workflow": "pr",
                "workflowStep": "uitest_android_chrome_real_perf",
                "env_target": "test",
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
