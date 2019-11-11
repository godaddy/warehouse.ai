'use strict';

var path = require('path'),
  macros = require('../../macros'),
  helpers = require('../../helpers'),
  assume = require('assume');

const npmrc = name => {
  return path.join(__dirname, '..', '..', 'fixtures', 'npm-auth', `${name}.npmrc`);
};

describe('npm auth', function () {
  describe('having npm auth-argument-factory configured', function () {
    let teardowns;
    const context = {};
    const teardown = (cb) => void teardowns.push(cb);

    beforeEach((done) => {
      teardowns = [];
      helpers.integrationSetup({
        app: {
          npm: {
            'auth-argument-factory': path.join(__dirname, '..', '..', 'fixtures', 'npm-auth', 'basic.js')
          }
        }
      }, (err, result) => {
        assume(err).to.be.falsey();
        teardown(result.app.close.bind(result.app));
        teardown(result.registry.close.bind(result.registry));
        teardown(helpers.cleanupPublish.bind(helpers, context.app));
        context.app = result.app;
        context.registry = result.registry;
        macros.publishOk(context, {
          auth: {
            user: 'basic_user',
            password: 'basic_pass'
          }
        })(done);
      });
    });

    afterEach(() => {
      teardowns.forEach(fn => fn());
    });

    it('handles basic auth', function (done) {
      macros.testNPM(context.registry, {
        teardown,
        command: 'view',
        args: ['my-package'],
        startingNpmrc: npmrc('basic'),
        expectedNpmrc: npmrc('basic')
      }, done);
    });
    it('handles token auth', function (done) {
      macros.testNPM(context.registry, {
        teardown,
        command: 'view',
        args: ['my-package'],
        startingNpmrc: npmrc('token'),
        expectedNpmrc: npmrc('token')
      }, done);
    });
    it('fails without auth', function (done) {
      macros.testNPM(context.registry, {
        teardown,
        command: 'view',
        args: ['my-package'],
        expectedExit: 1,
        startingNpmrc: npmrc('blank'),
        expectedNpmrc: npmrc('blank')
      }, done);
    });
    it('fails with invalid basic auth', function (done) {
      macros.testNPM(context.registry, {
        teardown,
        command: 'view',
        args: ['my-package'],
        expectedExit: 1,
        startingNpmrc: npmrc('invalid-basic'),
        expectedNpmrc: npmrc('invalid-basic')
      }, done);
    });
    it('fails with invalid token auth', function (done) {
      macros.testNPM(context.registry, {
        teardown,
        command: 'view',
        args: ['my-package'],
        expectedExit: 1,
        startingNpmrc: npmrc('invalid-token'),
        expectedNpmrc: npmrc('invalid-token')
      }, done);
    });
  });
});
