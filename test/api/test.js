// Require the dev-dependencies

/* eslint no-console: 0 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../config/env.json');
const params = require('../params/params');
const config = require('../../.config.js');

const expect = chai.expect;
const assert = chai.assert;
chai.should();

const env = config.NODE_ENV || 'local';

chai.use(chaiHttp);
// Our parent block
describe('Test APIs V2', () => {
  describe('/POST injectJS', () => {
    it('it should retrieve the injectJS code', (done) => {
      const objParams = params.v2.cicd.injectjs;
      chai.request(server[env])
        .post('/v2/api/cicd/injectjs')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('inject_code');
          }
          done();
        });
    });
  });
  describe('/POST injectJS [failure]', () => {
    it('it should receive an error when there is no injectType', (done) => {
      const objParams = { visualCompleteMark: 'something' };
      chai.request(server[env])
        .post('/v2/api/cicd/injectjs')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('status');
            res.body.should.have.property('message');
            expect(res.body.message).to.contain('Incorrect injectType specified');
          }
          done();
        });
    });
  });
  describe('/POST navtiming', () => {
    it('it should retrieve a successful navtiming response', (done) => {
      const objParams = params.v2.cicd.navtiming;
      chai.request(server[env])
        .post('/v2/api/cicd/navtiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('assert');
            res.body.should.have.property('export');
            res.body.should.have.property('debugMsg');
            res.body.should.have.property('params');
            res.body.should.have.property('timingInfo');
            res.body.should.have.property('esTrace');
            assert.isTrue(res.body.assert, 'perf assert is true');
            assert.isNotTrue(res.body.esSaved, 'no data saved to ES');
          }
          done();
        });
    });
  });
  describe('/POST navtiming [failure]', () => {
    it('it should retrieve an error when there are no parameters in the POST', (done) => {
      const objParams = {};
      chai.request(server[env])
        .post('/v2/api/cicd/navtiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('status');
            res.body.should.have.property('message');
            expect(res.body.message).to.contain('child \'sla\' fails because [\'sla\' is required]');
          }
          done();
        });
    });
  });
  describe('/POST usertiming', () => {
    it('it should retrieve a successful usertiming response', (done) => {
      const objParams = params.v2.cicd.usertiming;
      chai.request(server[env])
        .post('/v2/api/cicd/usertiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('assert');
            res.body.should.have.property('export');
            res.body.should.have.property('debugMsg');
            res.body.should.have.property('params');
            res.body.should.have.property('timingInfo');
            res.body.should.have.property('esTrace');
            assert.isTrue(res.body.assert, 'perf assert is true');
            assert.isNotTrue(res.body.esSaved, 'no data saved to ES');
          }
          done();
        });
    });
  });
  describe('/POST usertiming [failure]', () => {
    it('it should retrieve an error when there are no parameters in the POST', (done) => {
      const objParams = {};
      chai.request(server[env])
        .post('/v2/api/cicd/usertiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('status');
            res.body.should.have.property('message');
            expect(res.body.message).to.contain('child \'sla\' fails because [\'sla\' is required]');
          }
          done();
        });
    });
  });
  describe('/POST apitiming', () => {
    it('it should retrieve a successful apitiming response', (done) => {
      const objParams = params.v2.cicd.apitiming;
      chai.request(server[env])
        .post('/v2/api/cicd/apitiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('assert');
            res.body.should.have.property('export');
            res.body.should.have.property('debugMsg');
            res.body.should.have.property('params');
            res.body.should.have.property('timingInfo');
            res.body.should.have.property('esTrace');
            assert.isTrue(res.body.assert, 'perf assert is true');
            assert.isNotTrue(res.body.esSaved, 'no data saved to ES');
          }
          done();
        });
    });
  });
  describe('/POST apitiming [failure]', () => {
    it('it should retrieve an error when there are no parameters in the POST', (done) => {
      const objParams = {};
      chai.request(server[env])
        .post('/v2/api/cicd/apitiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('status');
            res.body.should.have.property('message');
            expect(res.body.message).to.contain('child \'sla\' fails because [\'sla\' is required]');
          }
          done();
        });
    });
  });
  describe('/POST resources', () => {
    it('it should retrieve an array of resources', (done) => {
      const objParams = params.v2.cicd.resources;
      chai.request(server[env])
        .post('/v2/api/cicd/resources')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('kibana_host');
            res.body.should.have.property('kibana_port');
            res.body.should.have.property('resources');
            res.body.resources.should.be.a('array');
          }
          done();
        });
    });
  });
  describe('/POST resources [failure]', () => {
    it('it should retrieve an error when there is no ID in the POST', (done) => {
      const objParams = {};
      chai.request(server[env])
        .post('/v2/api/cicd/resources')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            // console.log(JSON.stringify(res.body));
            res.should.have.status(400);
            res.body.should.be.a('object');
            res.body.should.have.property('status');
            res.body.should.have.property('message');
            expect(res.body.message).to.contain('ValidationError: child \'id\' fails');
          }
          done();
        });
    });
  });
});
