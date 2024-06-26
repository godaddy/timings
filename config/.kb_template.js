// Elastic Template for the .kibana index

const template = {
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
};

export default template;
