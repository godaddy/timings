# CONFIG

Configuration of the WebService/API can be done through a **JavaScript**, **JSON** or **YAML** config file and/or through **Environment Variables**. Environment variables always have priority!

The config file can be located **anywhere on your local filesystem**. Point the API to the file by using the `-c` or `--config-file` argument or the `CONFIGFILE` environment variable(see [Startup commands](#startup-commands) below).

- If you don't provide a config file or ENV vars, the API will use the default settings (see [Default Settings](#default-settings) below)!
  - Note that the defaults settings don't have entries for Elasticsearch and Kibana! You have to use a config file to point at ELK servers/clusters!!
- JavaScript files need to export the settings (use `module.exports = {...}`).
- All of the keys inside the `env` object can be overritten with Environment Variables (for example: the `env.ES_HOST` key in the config file matches ENV var `ES_HOST`)
- All of the keys inside the `params` object are client-side defaults that the API will use in case the client does not send them in the POST body.

## Startup commands

Install type|Startup command (where `{path}` is the absolute path to the config file)
---|---
docker-compose|`$ CONFIGFILE={path} docker-compose up`
git clone|`$ node ./server.js --config-file {path}`
NPM global install|`$ timings --config-file {path}`
Docker (stand-alone)|`$ docker run -d -v {path}:/src/.config.js -p {VM_port}:{Host_port} mverkerk/timings:{version}`

NOTE: For non-docker installs, you may need elevated permissions to run the API on ports < 1024

## Default settings

```javascript

{
  env: {                          // Server-side settings
    ES_PROTOCOL: "http",            // Scheme used by the ElasticSearch server/cluster (default: "http")
    ES_HOST: "",                    // Hostname of the ElasticSearch server/cluster (default: "")
    ES_PORT: 9200,                  // Scheme used by the ElasticSearch server/cluster (default: 9200)
    ES_VERSION: "",                 // The version of ElasticSearch (default: '5.6.2')
    ES_USER: "",                    // Username for Basic auth to ElasticSearch server/cluster (default: "")
    ES_PASS: "",                    // Password for Basic auth to ElasticSearch server/cluster (default: "")
    ES_SSL_CERT: "",                // Path to cert file for SSL auth to ElasticSearch server/cluster (default: "")
    ES_SSL_KEY: "",                 // Path to key file for SSL auth toElasticSearch server/cluster (default: "")
    KB_HOST: "",                    // Hostname of the Kibana server/cluster (default: -copy value from ES_HOST-)
    KB_PORT: 5601,                  // Scheme used by the ElasticSearch server/cluster (default: 5601)
    KB_INDEX: "",                   // Name of the main Kibana index in ElasticSearch (default: ".kibana") - used for upgrades
    HTTP_PORT: 80                   // Port of the API server (default: 80)
  },
  // API parameters
  params: {                       // Client-side parameters
    required: [                     // REQUIRED LOG parameters (have to start with 'log.')
      log.test_info,                  // Information about the test-step
      log.env_tester,                 // Environment of the test machine (i.e. `local`, `grid`, `saucelabs`, `iphone 7`, `galaxy-s6`, etc.)
      log.team,                       // The name of the test team (this is used to organize the Kibana dashboard)
      log.browser,                    // The browser used to perform the test (i.e. `Chrome`, `FireFox`, etc. - for API tests, use something like `api-curl`)
      log.env_target                  // Environment of the target application (i.e. `dev`, `test`, `prod`)
    ],
    defaults: {                     // DEFAULT parameters (will be used if they are not provided in the client's POST body)
      baseline: {                     // These settings are used to calculate the baseline
        days: 7,                        // Number of days to calculate the baseline for (default: 7)
        perc: 75,                       // Percentile to calculate (default: 75)
        padding: 1.2                    // Multiplier to calculate extra padding on top of the baseline (default: 1.2 = 20%)
      },
      flags: {                        // These booleans determine the output and other actions to be performed
        assertBaseline: true,           // Whether or not to compare against baseline (default: true)
        debug: false,                   // Request extra debug info from the API (default: false)
        esTrace: false,                 // Request elasticsearch output from API (default: false)
        esCreate: false,                // Save results to elasticsearch (default: false)
        passOnFailedAssert: false       // Pass the test, even when the performance is above the threshold (default: false)
      }
    }
  }
}
```

## The "required" array

Using the `params.required` array, you can enforce certain LOG keys. In the above example, the API will expect that the POST body includes a `log` object like this:

```javascript
{
  log: {
    test_info: "Login to home page",
    env_tester: process.env.TEST_ENV,
    team: "TEAM_ABC",
    browser: browserPerf,
    env_target: process.env.TARGET_ENV
  }
}
```

**TIP:** use dynamic values to populate fields like `browser` and `env_target` from sources like `process.env` (node/javascript) or `os.environ` (python).

If any of the required keys are not provided, the API will return an error. Example:

```javascript
{
    status: 422,
    message: "ValidationError: child 'log' fails because [child 'test_info' fails because ['test_info' is required]]"
}
```
