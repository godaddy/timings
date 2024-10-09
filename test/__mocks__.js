import { vi } from 'vitest';

// Mocking @elastic/elasticsearch with named export Client
vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(() => ({
    cat: {
      indices: vi.fn().mockResolvedValue([]),
    },
    indices: {
      putIndexTemplate: vi.fn().mockImplementation((args) => {
        // if args.name is not provided or empty, throw an error
        if (!args.name) {
          return Promise.reject(new Error('Template name is required'));
        }
        if (args.name === 'nonexistentindex') {
          return Promise.resolve(null);
        }
        return Promise.resolve({ acknowledged: true });
      }),
      getIndexTemplate: vi.fn().mockImplementation((args) => {
        // if args.name is not provided or empty, throw an error
        if (!args.name) {
          return Promise.reject(new Error('Template name is required'));
        }
        if (args.name === 'nonexistentindex') {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          index_templates: [
            { index_template: { template: { mappings: { _meta: { api_version: 'x.x.x' } } } } }
          ]
        });
      }),
    },
    search: vi.fn().mockResolvedValue({ hits: { hits: [] } }),
    index: vi.fn().mockImplementation((args) => {
      // if args.index is not provided or empty, throw an error
      if (!args.index) {
        return Promise.reject(new Error('Index name is required'));
      }
      return Promise.resolve({
        acknowledged: true,
        _index: args.index,
        _id: args.id
      });
    }),
    exists: vi.fn().mockResolvedValue({ body: true }),
    info: vi.fn().mockResolvedValue({ version: { number: '7.10.0' }, cluster_name: 'elastic-cluster' }),
    helpers: {
      bulk: vi.fn().mockResolvedValue({ successful: 7 }),
      cluster: {
        health: vi.fn().mockResolvedValue({ status: 'green' })

      }
    }
  })),
}));

// // Correctly mock the @elastic/elasticsearch module with a default export
// vi.mock('@elastic/elasticsearch', () => ({
//   // Mock the default export, which is the Client class
//   Client: vi.fn().mockImplementation(() => ({
//     // Mock methods used from the Elasticsearch client
//     search: vi.fn().mockResolvedValue({ hits: { hits: [] } }),
//     index: vi.fn().mockResolvedValue({ acknowledged: true }),
//     // Add more mocked methods as needed
//   })),
//   // If there are named exports you use, mock them here as well
// }));

// // Mock the Elasticsearch module
// vi.mock('@elastic/elasticsearch', () => ({
//   Client: vi.fn().mockImplementation(() => ({
//     // Mock any methods you use from the Elasticsearch client
//     cat: {
//       indices: vi.fn().mockResolvedValue([]),
//     },
//     indices: {
//       putIndexTemplate: vi.fn().mockResolvedValue({ acknowledged: true }),
//       getIndexTemplate: vi.fn().mockImplementation((args) => {
//         // if args.name is not provided or empty, throw an error
//         if (!args.name) {
//           return Promise.reject(new Error('Template name is required'));
//         }
//         if (args.name === 'nonexistentindex') {
//           return Promise.resolve(null);
//         }
//         return Promise.resolve({
//           index_templates: [
//             { index_template: { template: { mappings: { _meta: { api_version: 'x.x.x' } } } } }
//           ]
//         });
//       }),
//     },
//     search: vi.fn().mockResolvedValue({ hits: { hits: [] } }),
//     index: vi.fn().mockImplementation((args) => {
//       // if args.index is not provided or empty, throw an error
//       if (!args.index) {
//         return Promise.reject(new Error('Index name is required'));
//       }
//       return Promise.resolve({
//         acknowledged: true,
//         _index: args.index,
//         _id: args.id
//       });
//     }),
//     exists: vi.fn().mockResolvedValue({ body: true }),
//     info: vi.fn().mockResolvedValue({ version: { number: '7.10.0' }, cluster_name: 'elastic-cluster' }),
//     helpers: {
//       bulk: vi.fn().mockResolvedValue({ successful: 7 }),
//       cluster: {
//         health: vi.fn().mockResolvedValue({ status: 'green' })

//       }
//     }
//   })),
// }));

// Mock Express app
const mockExpressApp = () => {
  const app = {
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    listen: vi.fn(),
    locals: {
      env: {
        INDEX_PERF: 'myindex',
        ES_HOST: 'fake_host',
        ES_PORT: 9200,
        ES_PROTOCOL: 'http',
        ES_USER: 'elastic',
        ES_PASS: 'changeme',
      }
    },
    logger: {
      info: vi.fn(),
      error: vi.fn()
    }
  };

  // Mock chaining for methods like app.use().get().post()...
  app.use.mockReturnThis();
  app.get.mockReturnThis();
  app.post.mockReturnThis();
  app.put.mockReturnThis();
  app.delete.mockReturnThis();

  return app;
};

const mockRequest = (options = {}) => ({
  ...options,
});

const mockResponse = () => {
  const res = {};
  res.send = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  res.status = vi.fn().mockReturnThis();
  return res;
};

export default { mockExpressApp, mockRequest, mockResponse };
