// Require the dev-dependencies
/* eslint no-console: 0 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../config/env.json');
const params = require('../params/params');

const expect = chai.expect;
const should = chai.should();

const env = process.env.NODE_ENV || 'local';

console.log('Testing against API host: ' + server[env]);

chai.use(chaiHttp);
// Our parent block
describe('Test APIs V2', () => {
  describe('/POST injectjs', () => {
    it('[/injectjs] should retrieve the injectJS code', (done) => {
      const objParams = params.v2.cicd.injectjs;
      chai.request(server[env])
        .post('/v2/api/cicd/injectjs')
        .send(objParams)
        .end((err, res) => {
          if (err) {
            console.log(JSON.stringify(res.body));
          }
          should.not.exist(err);
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('inject_code');
          done();
        });
    });
  });
  describe('/POST injectjs [fail]', () => {
    it('[/injectjs] should receive an error when there is no injectType', (done) => {
      const objParams = { visualCompleteMark: 'something' };
      chai.request(server[env])
        .post('/v2/api/cicd/injectjs')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            console.log(JSON.stringify(res.body));
          }
          should.exist(err);
          res.should.have.status(422);
          res.body.should.be.a('object');
          res.body.should.have.property('status');
          res.body.should.have.property('message');
          expect(res.body.message).to.contain("'injectType' is required");
          done();
        });
    });
  });
  describe('/POST navtiming', () => {
    it('[/navtiming] should retrieve a successful navtiming response', (done) => {
      const objParams = params.v2.cicd.navtiming;
      chai.request(server[env])
        .post('/v2/api/cicd/navtiming')
        .send(objParams)
        .end((err, res) => {
          if (err) {
            console.log(JSON.stringify(res.body));
          }
          should.not.exist(err);
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('assert');
          res.body.should.have.property('export');
          res.body.should.have.property('debugMsg');
          res.body.should.have.property('params');
          res.body.should.have.property('timingInfo');
          res.body.should.have.property('esTrace');
          expect(res.body.assert).to.be.true;
          expect(res.body.esSaved).to.be.false;
        });
      done();
    });
  });
  describe('/POST navtiming [fail]', () => {
    it('[/navtiming] should retrieve an error when there are no parameters in the POST', (done) => {
      const objParams = {};
      chai.request(server[env])
        .post('/v2/api/cicd/navtiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            console.log(JSON.stringify(res.body));
          }
          should.exist(err);
          res.should.have.status(422);
          res.body.should.be.a('object');
          res.body.should.have.property('status');
          res.body.should.have.property('message');
          expect(res.body.message).to.contain("'sla' is required");
        });
      done();
    });
  });
  describe('/POST usertiming', () => {
    it('[/usertiming] should retrieve a successful usertiming response', (done) => {
      const objParams = params.v2.cicd.usertiming;
      chai.request(server[env])
        .post('/v2/api/cicd/usertiming')
        .send(objParams)
        .end((err, res) => {
          if (err) {
            console.log(JSON.stringify(res.body));
          }
          should.not.exist(err);
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('assert');
          res.body.should.have.property('export');
          res.body.should.have.property('debugMsg');
          res.body.should.have.property('params');
          res.body.should.have.property('timingInfo');
          res.body.should.have.property('esTrace');
          expect(res.body.assert).to.be.true;
          expect(res.body.esSaved).to.be.false;
        });
      done();
    });
  });
  describe('/POST usertiming [fail]', () => {
    it('[/usertiming] should retrieve an error when there are no parameters in the POST', (done) => {
      const objParams = {};
      chai.request(server[env])
        .post('/v2/api/cicd/usertiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            console.log(JSON.stringify(res.body));
          }
          should.exist(err);
          res.should.have.status(422);
          res.body.should.be.a('object');
          res.body.should.have.property('status');
          res.body.should.have.property('message');
          expect(res.body.message).to.contain("'sla' is required");
        });
      done();
    });
  });
  describe('/POST apitiming', () => {
    it('[/apitiming] should retrieve a successful apitiming response', (done) => {
      const objParams = params.v2.cicd.apitiming;
      chai.request(server[env])
        .post('/v2/api/cicd/apitiming')
        .send(objParams)
        .end((err, res) => {
          if (err) {
            console.log(JSON.stringify(res.body));
          }
          should.not.exist(err);
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('assert');
          res.body.should.have.property('export');
          res.body.should.have.property('debugMsg');
          res.body.should.have.property('params');
          res.body.should.have.property('timingInfo');
          res.body.should.have.property('esTrace');
          expect(res.body.assert).to.be.true;
          expect(res.body.esSaved).to.be.false;
        });
      done();
    });
  });
  describe('/POST apitiming [fail]', () => {
    it('[/apitiming] should retrieve an error when there are no parameters in the POST', (done) => {
      const objParams = {};
      chai.request(server[env])
        .post('/v2/api/cicd/apitiming')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            console.log(JSON.stringify(res.body));
          }
          should.exist(err);
          res.should.have.status(422);
          res.body.should.be.a('object');
          res.body.should.have.property('status');
          res.body.should.have.property('message');
          expect(res.body.message).to.contain("'sla' is required");
        });
      done();
    });
  });
  describe('/POST resources', () => {
    it('[/resources] should retrieve an array of resources', (done) => {
      const objParams = params.v2.cicd.resources;
      chai.request(server[env])
        .post('/v2/api/cicd/resources')
        .send(objParams)
        .end((err, res) => {
          if (err) {
            console.log(JSON.stringify(res.body));
          }
          should.not.exist(err);
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('kibana_host');
          res.body.should.have.property('kibana_port');
          res.body.should.have.property('resources');
          res.body.resources.should.be.a('array');
        });
      done();
    });
  });
  describe('/POST resources [fail]', () => {
    it('[/resources] should retrieve an error when there is no ID in the POST', (done) => {
      const objParams = {};
      chai.request(server[env])
        .post('/v2/api/cicd/resources')
        .send(objParams)
        .end((err, res) => {
          if (!err) {
            console.log(JSON.stringify(res.body));
          }
          should.exist(err);
          res.should.have.status(422);
          res.body.should.be.a('object');
          res.body.should.have.property('status');
          res.body.should.have.property('message');
          expect(res.body.message).to.contain("'id' is required");
        });
      done();
    });
  });
});
