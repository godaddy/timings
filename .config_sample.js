const config = {
  NODE_ENV: process.env.NODE_ENV,
  // Environment variables
  env: {
    ES_PROTOCOL: "http",               // Scheme used by the ElasticSearch server/cluster (default: "http")
    ES_HOST: "localhost",              // Hostname of the ElasticSearch server/cluster (default: "localhost")
    ES_PORT: 9200,                     // Scheme used by the ElasticSearch server/cluster (default: 9200)
    ES_USER: "",                       // Username for Basic auth to ElasticSearch server/cluster (default: "")
    ES_PASS: "",                       // Password for Basic auth to ElasticSearch server/cluster (default: "")
    ES_SSL_CERT: "",                   // Path to cert file for SSL auth to ElasticSearch server/cluster (default: "")
    ES_SSL_KEY: "",                    // Path to key file for SSL auth toElasticSearch server/cluster (default: "")
    KB_HOST: "",                       // Hostname of the Kibana server/cluster (default: -same as ES_HOST-)
    KB_PORT: 5601,                     // Scheme used by the ElasticSearch server/cluster (default: 5601)
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
        "esCreate": false,             // Save results to elasticsearch
        "passOnFailedAssert": false    // Pass the test, even when the performance is above the threshold
      }
    }
  }
}

module.exports = config;