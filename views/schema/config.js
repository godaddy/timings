const nconf = require('nconf');
// const { env } = require('../../.config_sample');
const customerConfig = require(nconf.get('env:APP_CONFIG'));

module.exports.schema = {
  schema: {
    env: {
      type: 'array',
      items: {
        type: 'object',
        title: 'Environment',
        properties: {
          ES_PROTOCOL: {
            title: 'Elasticsearch protocol',
            type: 'string',
            default: customerConfig.env.ES_PROTOCOL,
            enum: ['http', 'https']
          },
          ES_HOST: {
            title: 'Elasticsearch hostname',
            default: customerConfig.env.ES_HOST,
            type: 'string'
          },
          ES_PORT: {
            title: 'Elasticsearch port',
            type: 'integer',
            minimum: 7,
            maximum: 10000,
            default: 9200
          },
          ES_TIMEOUT: {
            title: 'Elasticsearch timeout',
            type: 'number',
            default: 5000
          },
          ES_USER: {
            title: 'Elasticsearch user',
            type: 'string'
          },
          ES_PASS: {
            title: 'Elasticsearch password',
            type: 'password'
          },
          ES_SSL_CERT: {
            title: 'Elasticsearch SSL cert',
            type: 'textarea'
          },
          ES_SSL_KEY: {
            title: 'Elasticsearch SSL key',
            type: 'textarea'
          },
          KB_HOST: {
            title: 'Kibana host',
            type: 'string'
          },
          KB_PORT: {
            title: 'Kibana port',
            type: 'number',
            default: 5601
          },
          KB_INDEX: {
            title: 'Kibana index',
            type: 'string',
            default: '.kibana'
          },
          HTTP_PORT: {
            title: 'Application http port',
            type: 'number',
            default: 80
          }

        }
      }
    },
    env2: {
      type: 'array',
      items: {
        type: 'object',
        title: 'Environment 2',
        properties: {
          ES_PROTOCOL: {
            title: 'Elasticsearch protocol',
            type: 'string',
            enum: ['http', 'https']
          },
          ES_HOST: {
            title: 'Elasticsearch hostname',
            type: 'string'
          },
          ES_POST: {
            title: 'Elasticsearch port',
            type: 'number',
            default: 9200
          }
        }
      }
    }
  },
  form: [
    {
      type: 'tabarray',
      items: {
        type: 'section',
        items: [
          'env[]',
          'env2[]'
        ]
      }
    }
  ]
};
