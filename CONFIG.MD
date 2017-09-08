# CONFIG

Configuration of the WebService/API is done through the `/.config.js` file in the root folder of the app. If you installed the app with `npm i -g timings` you will find the file in the `{global node_modules}/timings` folder. On Linux systems, this is usually `/usr/lib/node_modules/timings/`

If for some reason, the file is missing, you can copy the sample config from here:

## sample config file

```javascript

const config = {
  NODE_ENV: process.env.NODE_ENV,
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
|required|-|-|Array of fields that you want to enforce|
|defaults|baseline:days|`7`|The default number of days for the baseline query|
|defaults|baseline:perc|`75`|The default percentile for the baseline query|
|defaults|baseline:padding|`1.2`|The default padding for the baseline query|
|defaults|flags:assertBaseline|`true`|Indicates whether the client wants to assert against baseline|
|defaults|flags:debug|`false`|Indicates whether the API should provide extra debug output in the response|
|defaults|flags:esTrace|`false`|Indicates whether the API should provide extra ElasticSearch output in the response|
|defaults|flags:esCreate|`true`|Indicates whether the API should write results to ElasticSearch|
|defaults|flags:passOnFailedAssert|`false`|Indicates whether the API should overwrite the assert field on failed test|
