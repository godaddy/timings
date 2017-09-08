// Elastic Template for the cicd-perf index

const template = {
  "order": 0,
  "template": "cicd-perf*",
  "settings": {
      "number_of_shards": 1
  },
  "mappings": {
      "_default_": {
          "dynamic_templates": [{
                  "string_fields": {
                      "mapping": {
                          "ignore_above": 256,
                          "index": "not_analyzed",
                          "omit_norms": true,
                          "type": "string",
                          "doc_values": true
                      },
                      "match_mapping_type": "string",
                      "match": "*"
                  }
              },
              {
                  "timing_fields": {
                      "mapping": {
                          "type": "long"
                      },
                      "match_mapping_type": "*",
                      "match": "*Time"
                  }
              }
          ],
          "_all": {
              "enabled": false
          }
      }
  },
  "aliases": {

  }
}

module.exports = template;