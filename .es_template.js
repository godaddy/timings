const nconf = require('nconf');

// Elastic Templates
const template = {
  elk5: {
    'cicd-perf': {
      "order": 0,
      "version": parseInt(nconf.get('env:APP_VERSION').replace(/\./g, ''), 10),
      "template": "cicd-*",
      "settings": {
          "number_of_shards": 1
      },
      "mappings": {
          "_default_": {
              "dynamic_templates": [
                  {
                      "string_fields": {
                          "mapping": {
                              "index": "not_analyzed",
                              "omit_norms": true,
                              "type": "string",
                              "doc_values": true
                          },
                          "match_mapping_type": "string",
                          "match": "*"
                      }
                  }, {
                      "timing_fields": {
                          "mapping": {
                              "type": "float"
                          },
                          "match_mapping_type": "long"
                      }
                  }
              ],
              "_meta": {
                "api_version": nconf.get('env:APP_VERSION')
              },
              "_all": {
                  "enabled": false
              }
          }
      },
      "aliases": {}
    }
  },
  elk6: {
    'cicd-perf': {
      "order": 0,
      "version": parseInt(nconf.get('env:APP_VERSION').replace(/\./g, ''), 10),
      "index_patterns": ['cicd-perf-*', 'cicd-resource-*', 'cicd-errorlog-*'],
      "settings": {
        "index": {
          "number_of_shards": "1"
        }
      },
      "mappings": {
        "dynamic_templates": [
          {
            "message_fields": {
              "mapping": {
                "norms": false,
                "index": true,
                "store": false,
                "type": "text"
              },
              "match_mapping_type": "string",
              "match": "message"
            }
          },
          {
            "iso8601_date_fields": {
              "mapping": {
                "store": false,
                "type": "date"
              },
              "match_mapping_type": "date",
              "match": "*_iso8601"
            }
          },
          {
            "date_fields": {
              "mapping": {
                "store": false,
                "type": "date"
              },
              "match_mapping_type": "date",
              "match": "*"
            }
          },
          {
            "string_fields": {
              "mapping": {
                "norms": false,
                "ignore_above": 512,
                "index": true,
                "store": false,
                "type": "keyword"
              },
              "match_mapping_type": "string",
              "match": "*"
            }
          },
          {
            "long_fields": {
              "mapping": {
                "store": false,
                "type": "long"
              },
              "match_mapping_type": "long",
              "match": "*"
            }
          },
          {
            "double_fields": {
              "mapping": {
                "store": false,
                "type": "double"
              },
              "match_mapping_type": "double",
              "match": "*"
            }
          }
        ],
        "_meta": {
          "api_version": nconf.get('env:APP_VERSION')
        }
      },
      "aliases": {}
    }
  },
  elk7: {
    "cicd-perf": {
      "version": parseInt(nconf.get('env:APP_VERSION').replace(/\./g, ''), 10),
      "index_patterns": [
        "cicd-perf-*",
        "cicd-resource-*",
        "cicd-errorlog-*"
      ],
      "template": {
        "settings": {
          "index": {
            "refresh_interval": "30s",
            "number_of_shards": "1",
            "number_of_replicas": "1"
          }
        },
        "mappings": {
          "dynamic_date_formats": [
            "strict_date_optional_time",
            "yyyy/MM/dd HH:mm:ss Z||yyyy/MM/dd Z"
          ],
          "dynamic": true,
          "_source": {
            "excludes": [],
            "includes": [],
            "enabled": true
          },
          "date_detection": true,
          "dynamic_templates": [
            {
              "message_fields": {
                "mapping": {
                  "norms": false,
                  "index": true,
                  "store": false,
                  "type": "text"
                },
                "match_mapping_type": "string",
                "match": "message"
              }
            },
            {
              "iso8601_date_fields": {
                "mapping": {
                  "store": false,
                  "type": "date"
                },
                "match_mapping_type": "date",
                "match": "*_iso8601"
              }
            },
            {
              "date_fields": {
                "mapping": {
                  "store": false,
                  "type": "date"
                },
                "match_mapping_type": "date",
                "match": "*"
              }
            },
            {
              "string_fields": {
                "mapping": {
                  "norms": false,
                  "ignore_above": 512,
                  "index": true,
                  "store": false,
                  "type": "keyword"
                },
                "match_mapping_type": "string",
                "match": "*"
              }
            },
            {
              "long_fields": {
                "mapping": {
                  "store": false,
                  "type": "long"
                },
                "match_mapping_type": "long",
                "match": "*"
              }
            },
            {
              "double_fields": {
                "mapping": {
                  "store": false,
                  "type": "double"
                },
                "match_mapping_type": "double",
                "match": "*"
              }
            }
          ],
          "_meta": {
            "api_version": nconf.get('env:APP_VERSION')
          }
        }
      }
    }
  }
};


module.exports = template;
