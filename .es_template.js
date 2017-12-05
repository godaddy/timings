// Elastic Template for the cicd-perf index

const template = {
    "order": 0,
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

module.exports = template;