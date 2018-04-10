const nconf = require('nconf');

// Elastic Templates
const kb_index = (nconf.get('env:KB_INDEX') || '.kibana');

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
        "doc": {
          "dynamic_templates": [
            {
              "iso8601_date_fields": {
                "match": "*_iso8601",
                "match_mapping_type": "date",
                "mapping": {
                  "type": "date",
                  "coerce": true
                }
              }
            },
            {
              "date_fields": {
                "match": "*",
                "match_mapping_type": "date",
                "mapping": {
                  "type": "date",
                  "coerce": true
                }
              }
            },
            {
              "string_fields": {
                "match": "*",
                "match_mapping_type": "string",
                "mapping": {
                  "type": "keyword",
                  "index": true,
                  "norms": false
                }
              }
            },
            {
              "long_fields": {
                "match": "*",
                "match_mapping_type": "long",
                "mapping": {
                  "type": "long"
                }
              }
            },
            {
              "double_fields": {
                "match": "*",
                "match_mapping_type": "double",
                "mapping": {
                  "store": false,
                  "type": "double"
                }
              }
            }
          ]
        }
      },
      "aliases": {}
    }
  }
};

template.elk5[kb_index] = {
  template: '.kibana*',
  settings: {
    number_of_shards: 1
  },
  mappings: {
    'config': {
      properties: {
        buildNum: {
          type: 'keyword'
        }
      }
    },
    'index-pattern': {
      properties: {
        fieldFormatMap: {
          type: 'text'
        },
        fields: {
          type: 'text'
        },
        intervalName: {
          type: 'keyword'
        },
        notExpandable: {
          type: 'boolean'
        },
        sourceFilters: {
          type: 'text'
        },
        timeFieldName: {
          type: 'keyword'
        },
        title: {
          type: 'text'
        }
      }
    },
    'visualization': {
      properties: {
        description: {
          type: 'text'
        },
        kibanaSavedObjectMeta: {
          properties: {
            searchSourceJSON: {
              type: 'text'
            }
          }
        },
        savedSearchId: {
          type: 'keyword'
        },
        title: {
          type: 'text'
        },
        uiStateJSON: {
          type: 'text'
        },
        version: {
          type: 'integer'
        },
        visState: {
          type: 'text'
        }
      }
    },
    'search': {
      properties: {
        columns: {
          type: 'keyword'
        },
        description: {
          type: 'text'
        },
        hits: {
          type: 'integer'
        },
        kibanaSavedObjectMeta: {
          properties: {
            searchSourceJSON: {
              type: 'text'
            }
          }
        },
        sort: {
          type: 'keyword'
        },
        title: {
          type: 'text'
        },
        version: {
          type: 'integer'
        }
      }
    },
    'dashboard': {
      properties: {
        description: {
          type: 'text'
        },
        hits: {
          type: 'integer'
        },
        kibanaSavedObjectMeta: {
          properties: {
            searchSourceJSON: {
              type: 'text'
            }
          }
        },
        optionsJSON: {
          type: 'text'
        },
        panelsJSON: {
          type: 'text'
        },
        refreshInterval: {
          properties: {
            display: {
              type: 'keyword'
            },
            pause: {
              type: 'boolean'
            },
            section: {
              type: 'integer'
            },
            value: {
              type: 'integer'
            }
          }
        },
        timeFrom: {
          type: 'keyword'
        },
        timeRestore: {
          type: 'boolean'
        },
        timeTo: {
          type: 'keyword'
        },
        title: {
          type: 'text'
        },
        uiStateJSON: {
          type: 'text'
        },
        version: {
          type: 'integer'
        }
      }
    },
    'url': {
      properties: {
        accessCount: {
          type: 'long'
        },
        accessDate: {
          type: 'date'
        },
        createDate: {
          type: 'date'
        },
        url: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 2048
            }
          }
        }
      }
    },
    'server': {
      properties: {
        uuid: {
          type: 'keyword'
        }
      }
    },
    'timelion-sheet': {
      properties: {
        description: {
          type: 'text'
        },
        hits: {
          type: 'integer'
        },
        kibanaSavedObjectMeta: {
          properties: {
            searchSourceJSON: {
              type: 'text'
            }
          }
        },
        timelion_chart_height: {
          type: 'integer'
        },
        timelion_columns: {
          type: 'integer'
        },
        timelion_interval: {
          type: 'keyword'
        },
        timelion_other_interval: {
          type: 'keyword'
        },
        timelion_rows: {
          type: 'integer'
        },
        timelion_sheet: {
          type: 'text'
        },
        title: {
          type: 'text'
        },
        version: {
          type: 'integer'
        }
      }
    }
  }
}

template.elk6[kb_index] = {
  template: '.kibana*',
  "settings" : {
    "number_of_shards" : 1,
    "index.mapper.dynamic": false
  },
  "mappings" : {
    "doc": {
      "properties": {
        "type": {
          "type": "keyword"
        },
        "updated_at": {
          "type": "date"
        },
        "config": {
          "properties": {
            "buildNum": {
              "type": "keyword"
            }
          }
        },
        "index-pattern": {
          "properties": {
            "fieldFormatMap": {
              "type": "text"
            },
            "fields": {
              "type": "text"
            },
            "intervalName": {
              "type": "keyword"
            },
            "notExpandable": {
              "type": "boolean"
            },
            "sourceFilters": {
              "type": "text"
            },
            "timeFieldName": {
              "type": "keyword"
            },
            "title": {
              "type": "text"
            }
          }
        },
        "visualization": {
          "properties": {
            "description": {
              "type": "text"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "savedSearchId": {
              "type": "keyword"
            },
            "title": {
              "type": "text"
            },
            "uiStateJSON": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            },
            "visState": {
              "type": "text"
            }
          }
        },
        "search": {
          "properties": {
            "columns": {
              "type": "keyword"
            },
            "description": {
              "type": "text"
            },
            "hits": {
              "type": "integer"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "sort": {
              "type": "keyword"
            },
            "title": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            }
          }
        },
        "dashboard": {
          "properties": {
            "description": {
              "type": "text"
            },
            "hits": {
              "type": "integer"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "optionsJSON": {
              "type": "text"
            },
            "panelsJSON": {
              "type": "text"
            },
            "refreshInterval": {
              "properties": {
                "display": {
                  "type": "keyword"
                },
                "pause": {
                  "type": "boolean"
                },
                "section": {
                  "type": "integer"
                },
                "value": {
                  "type": "integer"
                }
              }
            },
            "timeFrom": {
              "type": "keyword"
            },
            "timeRestore": {
              "type": "boolean"
            },
            "timeTo": {
              "type": "keyword"
            },
            "title": {
              "type": "text"
            },
            "uiStateJSON": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            }
          }
        },
        "url": {
          "properties": {
            "accessCount": {
              "type": "long"
            },
            "accessDate": {
              "type": "date"
            },
            "createDate": {
              "type": "date"
            },
            "url": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 2048
                }
              }
            }
          }
        },
        "server": {
          "properties": {
            "uuid": {
              "type": "keyword"
            }
          }
        },
        "timelion-sheet": {
          "properties": {
            "description": {
              "type": "text"
            },
            "hits": {
              "type": "integer"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "timelion_chart_height": {
              "type": "integer"
            },
            "timelion_columns": {
              "type": "integer"
            },
            "timelion_interval": {
              "type": "keyword"
            },
            "timelion_other_interval": {
              "type": "keyword"
            },
            "timelion_rows": {
              "type": "integer"
            },
            "timelion_sheet": {
              "type": "text"
            },
            "title": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            }
          }
        },
        "graph-workspace": {
          "properties": {
            "description": {
              "type": "text"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "numLinks": {
              "type": "integer"
            },
            "numVertices": {
              "type": "integer"
            },
            "title": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            },
            "wsState": {
              "type": "text"
            }
          }
        }
      }
    }
  }
}

module.exports = (parseInt(nconf.get('env:ES_MAJOR'), 10) > 5) ? template.elk6 : template.elk5;
