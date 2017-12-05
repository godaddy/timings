# CONFIG

Configuration of the WebService/API is done through a JavaScript based config file called `.config.js`. For your convenience, this repo includes a sample config file: `/.config_sample.js`.

Depending on how you installed the API, your config file should be located here:

|Installation|Location config file|Notes|
|-|-|-|
|git clone|`{clone path}/timings/.config.js`|folder created by the `git clone https://github.com/godaddy/timings.git` command|
|npm global install|`{global node_modules}/timings/.config.js`|folder created by the `npm i -g timings` command|
|docker-compose|`{clone path}/timings-docker/timings/config/.config.js`|folder created by the `git clone https://github.com/Verkurkie/timings-docker.git` command|

If for some reason, the file is missing, you can copy the sample config from here:

## example config file

```javascript

const config = {
  NODE_ENV: process.env.NODE_ENV,
  // Environment variables
  env: {
    ES_HOST: '{elasticsearch host}',   // Scheme used by the ElasticSearch server/cluster (default: "http")
    ES_PORT: '{elasticsearch port}',   // Hostname of the ElasticSearch server/cluster (default: "localhost")
    ES_PROTOCOL: "http|https",         // Scheme used by the ElasticSearch server/cluster (default: 9200)
    ES_USER: '{username}',             // Username for Basic auth to ElasticSearch server/cluster (default: "")
    ES_PASS: '{password}',             // Password for Basic auth to ElasticSearch server/cluster (default: "")
    ES_SSL_CERT: '{cert_file.crt}',    // Path to cert file for SSL auth to ElasticSearch server/cluster (default: "")
    ES_SSL_KEY: '{key_file.key}',      // Path to key file for SSL auth toElasticSearch server/cluster (default: "")
    KB_HOST: '{kibana host}',          // Hostname of the Kibana server/cluster (default: -same as ES_HOST-)
    KB_PORT: '{kibana port}',          // Scheme used by the ElasticSearch server/cluster (default: 5601)
    HTTP_PORT: 80                      // Port of the API server (default: 80)
  },
  // API parameters
  params: {
    // Array of REQUIRED LOG parameters (have to start with 'log.')
    required: ['log.test_info', 'log.env_tester', 'log.team', 'log.browser', 'log.env_target'],
    // DEFAULT parameters (will be used if they are not provided in the client's POST body)
    defaults: {
      "baseline": {           // These settings are used to calculate the baseline
        "days": 7,                     // Number of days to calculate the baseline for
        "perc": 75,                    // Percentile to calculate
        "padding": 1.2                 // Extra padding on top of the calculated baseline (gives some wiggle-room)
      },
      "flags": {              // These booleans determine the output and other actions to be performed
        "assertBaseline": true,        // Whether or not to compare against baseline
        "debug": false,                // Request extra debug info from the API
        "esTrace": false,              // Request elasticsearch output from API
        "esCreate": true,              // Save results to elasticsearch
        "passOnFailedAssert": false    // Pass the test, even when the performance is above the threshold
      }
    }
  }
}

module.exports = config;


```

## config.params

This section has the defaults values for various client parameters. These values are used when they are not provided by the client in the POST body.

|Main key|Sub-key|Default|Description|
|--------|------------|-------|-----------|
|env|ES_HOST|-|Hostname of the elasticsearch server/cluster|
|env|ES_PORT|9200|TCP port of the elasticsearch server/cluster|
|env|ES_PROTOCOL|`'http'`|Protocol/scheme used by the elasticsearch server/cluster ('http' or 'https')|
|env|ES_USER|`''`|Username - for elasticsearch server/cluster Basic auth|
|env|ES_PASS|`''`|Password - for elasticsearch server/cluster Basic auth|
|env|ES_SLL_CERT|`''`|Path to the CERT file - for elasticsearch server/cluster SSL auth|
|env|ES_SLL_KEY|`''`|Path to the KEY file - for elasticsearch server/cluster SSL auth|
|env|KB_HOST|-|Hostname of the kibana server|
|env|KB_PORT|5601|TCP port of the kibana server|
|required|-|-|Array of fields that you want to enforce|
|defaults|baseline:days|`7`|The default number of days for the baseline query|
|defaults|baseline:perc|`75`|The default percentile for the baseline query|
|defaults|baseline:padding|`1.2`|The default padding for the baseline query|
|defaults|flags:assertBaseline|`true`|Indicates whether the client wants to assert against baseline|
|defaults|flags:debug|`false`|Indicates whether the API should provide extra debug output in the response|
|defaults|flags:esTrace|`false`|Indicates whether the API should provide extra ElasticSearch output in the response|
|defaults|flags:esCreate|`true`|Indicates whether the API should write results to ElasticSearch|
|defaults|flags:passOnFailedAssert|`false`|Indicates whether the API should overwrite the assert field on failed test|

## Required LOG parameters

Using the `params.required` key, you can enforce LOG keys. In the above example, the API will expect that the POST body includes this object:

```json
{
  ...
  "log": {
    "test_info": "info",
    "env_tester": "windows_10",
    "team": "Our awesome PRODUCT TEAM",
    "browser": "Chrome",
    "env_target": : "PROD"
  }
}
```

If any of the required keys are not provided, the API will throw an error. Example:

```json
{
    "status": 422,
    "message": "ValidationError: child 'log' fails because [child 'test_info' fails because ['test_info' is required]]"
}
```
