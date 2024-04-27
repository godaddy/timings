# CONFIG

Configuration of the timings API can be done through a **JSON** config file and/or **Environment Variables**. Environment variables will always take priority!

The config file can be located **anywhere on your local filesystem**. You can point the API to the file by using the `CONFIGFILE` environment variable (see [Startup commands](#startup-commands) below).

- If you don't provide a config file or ENV vars, the API will use the default settings (see [Default Settings](#default-settings) below)!
  - Note that the defaults settings don't have entries for Elasticsearch and Kibana! You have to use a config file to point at ELK servers/clusters!!
- All of the keys inside the `env` object can be overwritten with Environment Variables (for example: the `env.ES_HOST` key in the config file matches the ENV var `ES_HOST`)
- All of the keys inside the `params` object are client-side defaults that the API will use in case they are not included in the POST body.

## Startup commands

Install type|Startup command (where `{path}` is the absolute path to the config file)
---|---
docker-compose|`$ CONFIGFILE={path} docker-compose up`
stand-alone - local node|`$ CONFIGFILE={path} node ./server.js`
stand-alone - global node|`$ CONFIGFILE={path} timings`
stand-alone - docker|`$ docker run -d -v {path}:/src/config/default.json -v ./timings/logs:/src/logs -p {VM_port}:{Host_port} godaddy/timings:{version}`

NOTE: For non-docker installs, you may need elevated permissions to run the API on ports < 1024

## Default settings

```json
{
  "env": {
    "ES_PROTOCOL": "http",
    "ES_HOST": "",
    "ES_PORT": 9200, 
    "ES_TIMEOUT": 5000, 
    "ES_USER": "",
    "ES_PASS": "",
    "ES_SSL_CERT": "",
    "ES_SSL_KEY": "",
    "KB_HOST": "",
    "KB_PORT": 5601, 
    "KB_INDEX": "",
    "HTTP_PORT": 80
  },

  "params": {
    "required": [
      "log.test_info",
      "log.env_tester",
      "log.team",
      "log.browser",
      "log.env_target"
    ],
    "defaults": {
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
      }
    }
  }
}
```

> **Tip:** you can use this JSON object as a template for your own config file!

## Additional Environment variables

In addition to the `env` parameters in the config file, the following environment variables can be used to control certain settings:

Variable|Description|Examples|Default value
---|---|---|---
**CONFIGFILE**|Path to custom config file|`"/etc/timings/timings.json"`|if omitted, API will use `<installation path>/config/default.json`
**NODE_ENV**|The node environment|`"production"`, `"test"`, `"development"`|`"development"`
**LOG_LEVEL**|The desired level of logging - used for console output and app log|`"info"`, `"debug"`, `"error"`|`"info"`
**LOG_PATH**|Custom logging path|`"/var/logs/timings"`, `"/home/user/logs/timings"`|`"<installation path>/logs/"`

## The "required" array

In your server config file, you can use the `params.required` array to enforce certain LOG keys. Example:

```json
params: {
  required: [log.test_info,log.env_tester,log.team,log.browser,log.env_target],
  ...
}
```

In the above example, the API will expect that the client's POST body includes a `log` object that looks like this:

```javascript
{
  log: {
    test_info: "...",
    env_tester: "...",
    team: "...",
    browser: "...",
    env_target: "...",
  }
}
```

**TIP:** the timings clients can use dynamic values to populate fields like `browser` and `env_target` from sources like `process.env` (node/javascript) or `os.environ` (python).

When required keys are not provided, the API will return an error. Example:

```javascript
{
    status: 422,
    message: "ValidationError: child 'log' fails because [child 'test_info' fails because ['test_info' is required]]"
}
```

// This is the default config
// This file will be overwritten in case the API is run with the docker-compose solution (https://www.github.com/verkurkie/timings-docker)

```json
{
  "env": {
    "ES_PROTOCOL": "http",
    "ES_HOST": "127.0.0.1",
    "ES_PORT": 9200,
    "ES_TIMEOUT": 5000,
    "ES_USER": "",
    "ES_PASS": "",
    "ES_SSL_CERT": "",
    "ES_SSL_KEY": "",
    "KB_HOST": "127.0.0.1",
    "KB_PORT": 5601,
    "KB_INDEX": "",
    "HTTP_PORT": 80
  },

  "params": {
    "required": [
      "log.test_info",
      "log.env_tester",
      "log.team",
      "log.browser",
      "log.env_target"
    ],
    "defaults": {
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
      }
    }
  }
}
```
