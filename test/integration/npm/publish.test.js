/* eslint no-process-env: 0*/
/* eslint no-console: 0*/
'use strict';

var path = require('path'),
  async = require('async'),
  sinon = require('sinon'),
  assume = require('assume'),
  mocks = require('../../mocks'),
  macros = require('../../macros'),
  concat = require('concat-stream'),
  helpers = require('../../helpers'),
  hyperquest = require('hyperquest');

var FileRequest = mocks.FileRequest,
  dirs = helpers.dirs;

//
// Enhance assume with sinon.
//
assume.use(require('assume-sinon'));

describe('npm publish', function () {
  var context = {};

  before(function (done) {
    helpers.integrationSetup(function (err, result) {
      assume(err).to.be.falsey();
      context.registry = result.registry;
      context.app = result.app;
      context.app.publisher.carpenter = mocks.carpenter;

      done();
    });
  });

  it.skip('should respond with an error on an invalid publish', function (done) {
    var filename = path.join(dirs.payloads, 'what-is-happening-1.10.1.json');
    var publishUrl = 'http://localhost:8090/what-is-happening-1.10.1.json';
    var request = new FileRequest({ file: filename });

    request
      .pipe(hyperquest.put(publishUrl))
      .pipe(concat({ encoding: 'string' }, function (data) {
        var result = JSON.parse(data);
        assume(result).is.an('object');
        assume(result.message).is.a('string');
        assume(result.code).equals('npm-verify');
        assume(context.registry.cache['/what-is-happening']).doesnt.exist();
        done();
      }));
  });

  it('should trigger a carpenter build with promote=true', function (done) {
    sinon.spy(context.registry, 'cacheRequest');
    sinon.spy(context.app.publisher.carpenter, 'build');

    macros.publishOk(context)(function () {
      assume(context.app.publisher.carpenter.build).to.be.called();
      assume(context.app.publisher.carpenter.build).to.be.calledWith(
        sinon.match({ data: { payload: sinon.match.any, promote: true }})
      );
      assume(context.app.publisher.carpenter.build).to.be.calledAfter(context.registry.cacheRequest);

      context.registry.cacheRequest.restore();
      context.app.publisher.carpenter.build.restore();

      done();
    });
  });

  it('should trigger a carpenter build with promote=false', function (done) {
    sinon.spy(context.registry, 'cacheRequest');
    sinon.spy(context.app.publisher.carpenter, 'build');

    macros.publishOk(context, {
      file: path.join(dirs.payloads, 'promote-false-0.0.1.json'),
      publishUrl: 'http://localhost:8090/promote-false',
      id: 'promote-false@0.0.1',
      path: '/promote-false'
    })(function () {
      assume(context.app.publisher.carpenter.build).to.be.called();
      assume(context.app.publisher.carpenter.build).to.be.calledWith(
        sinon.match({ data: { payload: sinon.match.any, promote: false }})
      );
      assume(context.app.publisher.carpenter.build).to.be.calledAfter(context.registry.cacheRequest);

      context.registry.cacheRequest.restore();
      context.app.publisher.carpenter.build.restore();

      done();
    });
  });

  it('should successfully publish a valid package', macros.publishOk(context));

  it('should successfully publish a scoped package', macros.publishOk(context, {
    file: path.join(dirs.payloads, '@good-work.json'),
    publishUrl: 'http://localhost:8090/@good%2Fwork',
    id: '@good/work@1.0.0',
    path: '/@good%2Fwork'
  }));

  //
  // TODO: Make another macro like thing
  //
  it('should fail to publish an unknown scope', function (done) {
    var filename = path.join(dirs.payloads, '@scope-fail.json');
    var publishUrl = 'http://localhost:8090/@scope%2Ffail';
    var request = new FileRequest({ file: filename });

    request
      .pipe(hyperquest.put(publishUrl))
      .pipe(concat({ encoding: 'string' }, function (data) {
        var result = JSON.parse(data);
        assume(result).is.an('object');
        assume(result.message).is.a('string');
        assume(result.code).equals('npm-scope');
        assume(context.registry.cache['/@scope/fail']).doesnt.exist();
        done();
      }));

  });

  it('should create the Package record on publish', function (done) {
    context.app.models.Package.get({ name: 'my-package' }, function (err, pack) {
      assume(err).is.falsey();
      assume(pack).is.an('object');
      assume(pack.name).equals('my-package');
      assume(pack.description).equals('A kind of package');
      assume(pack.distTags).deep.equals({ latest: '0.0.1' });
      assume(pack.peerDependencies).deep.equals({
        react: '*'
      });

      done();
    });
  });

  after(function (done) {
    async.series([
      helpers.cleanupPublish(context.app),
      helpers.cleanupPublish(context.app, {
        name: '@good/work',
        file: path.join(dirs.payloads, '@good-work.json')
      }),
      context.app.close.bind(context.app),
      context.registry.close.bind(context.registry)
    ], done);
  });
});
