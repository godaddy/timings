// test/es-utils.test.js
import { describe, it, expect } from 'vitest';
import { ESClass } from '../src/v2/es-utils.js';

describe('ESClass', () => {
  describe('indexing, bulk and import', () => {
    it('should import sample data into Elasticsearch', async () => {
      const app = global.mocks.mockExpressApp(); // Use this mock app in your tests
      const es = new ESClass(app);

      const response = await es.esImport();

      expect(response.ok).toBe(true);
      expect(response.imports.length).toEqual(7);
      expect(response.info.length).toEqual(1);
    });

    it('should bulk index documents', async () => {
      const app = global.mocks.mockExpressApp(); // Use this mock app in your tests
      const es = new ESClass(app);

      const docs = [
        { _index: 'index1', _source: { name: 'Document 1' } },
        { _index: 'index2', _source: { name: 'Document 2' } },
        { _index: 'index3', _source: { name: 'Document 3' } }
      ];

      const response = await es.bulk(docs);

      expect(response).toBe(true);
    });

    it('should index a document', async () => {
      const app = global.mocks.mockExpressApp();
      const es = new ESClass(app);

      const index = 'myindex';
      const body = { name: 'John Doe' };

      const response = await es.index(index, body);

      expect(response.acknowledged).toBe(true);
      expect(response._index).toBe(index);
    });

    it('should index a document with specified id', async () => {
      const app = global.mocks.mockExpressApp();
      const es = new ESClass(app);

      const index = 'myindex';
      const id = '123';
      const body = { name: 'John Doe' };

      const response = await es.index(index, body, id);

      expect(response.acknowledged).toBe(true);
      expect(response._index).toBe(index);
      expect(response._id).toBe(id);
    });

    it('should handle indexing error', async () => {
      const app = global.mocks.mockExpressApp();
      const es = new ESClass(app);

      const body = { name: 'John Doe' };

      // Simulate an error by passing an invalid index
      const response = await es.index('', body);

      expect(response).toBeInstanceOf(Error);
    });
  });

  describe('template actions', () => {
    it('should return the API version of the template', async () => {
      const app = global.mocks.mockExpressApp();
      const es = new ESClass(app);

      const response = await es.getTemplateVersion();

      expect(response).toEqual('x.x.x');
    });

    it('should return undefined if the template does not exist', async () => {
      const app = global.mocks.mockExpressApp();
      const es = new ESClass(app);

      app.locals.env.INDEX_PERF = 'nonexistentindex';

      const response = await es.getTemplateVersion();

      expect(response).toBeUndefined();
    });

    it('should handle errors when getting the template version', async () => {
      const app = global.mocks.mockExpressApp();
      const es = new ESClass(app);
      app.locals.env.INDEX_PERF = '';

      // Simulate an error by not passing a valid index
      const response = await es.getTemplateVersion();

      // Expect the function to log an error and return undefined
      expect(response).toBeUndefined();
      // Check if app.logger.error was called
      expect(app.logger.error).toHaveBeenCalled();
    });
  });

  it('should create/update the template successfully', async () => {
    const app = global.mocks.mockExpressApp();
    const es = new ESClass(app);

    const name = 'myTemplate';
    const body = { template: { mappings: { properties: { name: { type: 'text' } } } } };

    const response = await es.putTemplate(name, body);

    expect(response).toBeDefined();
    expect(response).toEqual(expect.objectContaining({ acknowledged: true }));
    expect(app.logger.info).toHaveBeenCalledWith(`[TEMPLATE] created/updated [${name}] successfully!`);
  });

  it('should handle failure to create/update the template', async () => {
    const app = global.mocks.mockExpressApp();
    const es = new ESClass(app);

    const body = { template: { mappings: { properties: { name: { type: 'text' } } } } };

    // Simulate an error by passing an invalid template name
    const response = await es.putTemplate('', body);

    expect(response).toBeUndefined();
    expect(app.logger.error).toHaveBeenCalledWith(`[TEMPLATE] create [] failure!`, expect.any(Error));
  });
});
