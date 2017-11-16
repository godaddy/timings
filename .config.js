const config = {
  NODE_ENV: process.env.NODE_ENV,
  env: {
    ES_HOST: "rumspark-master.cloud.phx3.gdg",
    ES_PORT: 9200,
    ES_PROTOCOL: "",
    ES_USER: "",
    ES_PASS: "",
    ES_SSL_CERT: "",
    ES_SSL_KEY: "",
    KB_HOST: "localhost",
    HTTP_PORT: 80
  },
  params: {
    // Array of REQUIRED LOG parameters (have to start with 'log.')
    required: ['log.test_info', 'log.env_tester', 'log.team', 'log.browser', 'log.env_target'],

    // DEFAULT parameters (will be used if they are not in the POST body)
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