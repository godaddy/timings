# CONFIG

Configuration of the WebService/API is done through the `/.config.js` file in the root folder of the app. If you installed the app with `npm i -g timings` you will find the file in the `{global node_modules}/timings` folder. On Linux systems, this is usually `/usr/lib/node_modules/timings/`

If for some reason, the file is missing, you can copy the sample config from here:

## example config file

```javascript

const config = {
  NODE_ENV: process.env.NODE_ENV,
  env: {
    ES_HOST: '{elasticsearch host}',
    ES_PORT: '{elasticsearch port}',
    ES_PROTOCOL: "http|https",
    ES_USER: '{username}',
    ES_PASS: '{password}',
    ES_SSL_CERT: '{cert_file.crt}',
    ES_SSL_KEY: '{key_file.key},
    KB_HOST: '{kibana host}',
    HTTP_PORT: 80
  },
  params: {
    //Required and default parameters
    required: ['log.test_info', 'log.env_tester', 'log.team', 'log.browser', 'log.env_target'],
    defaults: {
      baseline: {
        days: 7,
        perc: 75,
        padding: 1.2
      },
      flags: {
        assertBaseline: true,
        debug: false,
        esTrace: false,
        esCreate: true,
        passOnFailedAssert: false
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
