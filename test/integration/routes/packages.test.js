/* eslint max-nested-callbacks: 0*/
'use strict';

const url = require('url');
const path = require('path');
const async = require('async');
const assume = require('assume');
const request = require('request');
const mocks = require('../../mocks');
const macros = require('../../macros');
const helpers = require('../../helpers');

function address(app, properties) {
  const socket = app.servers.http.address();
  return url.format(Object.assign({
    hostname: '127.0.0.1',
    port: socket.port,
    protocol: 'http'
  }, properties || {}));
}

function validatePackage(pkg, expectation) {
  const keys = ['name', 'version', 'description', 'main', 'gitHead', 'extended',
    'keywords', 'bundledDependencies', 'distTags', 'envs', 'metadata', 'config',
    'repository', 'dependencies', 'devDependencies', 'peerDependencies',
    'optionalDependencies'];

  keys.forEach(key => assume(pkg[key]).is.not.equals(undefined)); // eslint-disable-line no-undefined

  Object.keys(expectation).forEach(key => {
    assume(pkg[key]).equals(expectation[key]);
  });
}

describe('/packages/*', function () {
  const context = {};
  const spec = { name: 'pancake', version: '0.0.1', env: 'test' };
  let app;

  before(function (next) {
    helpers.integrationSetup(function (err, result) {
      assume(err).is.falsey();
      app = result.app;

      context.registry = result.registry;
      context.app = result.app;
      context.app.publisher.carpenter = mocks.carpenter;

      if (process.env.DEBUG) {
        context.app.datastar.connection.on('queryStarted', function () {
          console.log.apply(console, arguments);
        });
      }

      next();
    });
  });

  afterEach(function (next) {
    app.bffs.unpublish(spec, function () {
      async.each(app.bffs.envs, function (env, next) {
        var mine = JSON.parse(JSON.stringify(spec));

        mine.name = mine.name + ':all';
        mine.env = env;

        app.bffs.unpublish(mine, next);
      }, next);
    });
  });

  after(function (next) {
    async.series([
      helpers.cleanupPublish(context.app),
      helpers.cleanupPublish(context.app, {
        name: '@good/work',
        file: path.join(helpers.dirs.payloads, '@good-work.json')
      }),
      context.app.close.bind(context.app),
      context.registry.close.bind(context.registry)
    ], next);
  });

  it('/packages returns a list all of the packages', function (next) {
    macros.publishOk(context)(function () {
      macros.publishOk(context, {
        file: path.join(helpers.dirs.payloads, '@good-work.json'),
        publishUrl: 'http://localhost:8090/@good%2Fwork',
        id: '@good/work@1.0.0',
        path: '/@good%2Fwork'
      })(function () {
        request(address(app, { pathname: 'packages' }), function (err, res, packages) {
          try {
            packages = JSON.parse(packages);
          } catch (e) {
            return next(e);
          }

          assume(err).to.be.falsey();
          assume(res.statusCode).equals(200);
          assume(packages.length).equals(2);

          validatePackage(packages[0], {
            name: '@good/work',
            version: '1.0.0',
            description: '',
            main: 'index.js'
          });

          validatePackage(packages[1], {
            name: 'my-package',
            version: '0.0.1',
            description: 'A kind of package',
            main: 'index.js'
          });

          next();
        });
      });
    });
  });

  it('/packages/:pkg returns information about a specific package', function (next) {
    macros.publishOk(context, {
      file: path.join(helpers.dirs.payloads, '@good-work.json'),
      publishUrl: 'http://localhost:8090/@good%2Fwork',
      id: '@good/work@1.0.0',
      path: '/@good%2Fwork'
    })(function () {
      request(address(app, { pathname: 'packages/@good%2Fwork' }), function (err, res, body) {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return next(e);
        }

        assume(err).to.be.falsey();
        assume(res.statusCode).equals(200);

        validatePackage(body, {
          name: '@good/work',
          version: '1.0.0',
          description: '',
          main: 'index.js'
        });

        next();
      });
    });
  });
});
