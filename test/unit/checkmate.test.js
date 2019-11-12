/* eslint no-undefined: 0, no-process-env: 0 */
'use strict';

var path = require('path'),
  fork = require('child_process').fork,
  assume = require('assume'),
  concat = require('concat-stream');

var checkmate = require.resolve(path.join(__dirname, '..', '..', 'lib', 'checkmate'));
var checksDir = path.join(__dirname, '..', 'fixtures', 'checks');

/*
 * Spawns a checkmate process and sends
 * a particular payload.
 */
function spawnWith(data) {
  var context = {
    child: fork(checkmate, { silent: true })
  };

  ['stdout', 'stderr'].forEach(function (stream) {
    context.child[stream].pipe(concat({ encoding: 'string' }, function (data) {
      context[stream] = data;
    }));
  });

  if (process.env.DEBUG) {
    context.child.stdout.pipe(process.stdout);
    context.child.stderr.pipe(process.stderr);
  }

  context.child.on('message', function (data) {
    if (data.__checkmate) {
      return context.child.disconnect();
    }

    context.response = data;
  });

  context.child.send(data);
  return context;
}

describe('checkmate', function () {
  it('provides a descriptive message for no check', function (done) {
    var context = spawnWith({ payload: { ok: true } });

    context.child.on('exit', function (code, signal) {
      assume(code).equals(0);
      assume(signal).equals(null);
      assume(context.stderr).equals('');
      assume(context.stdout).equals('');
      assume(context.response).is.an('object');
      assume(context.response.message).is.a('string');
      assume(context.response.stack).is.a('string');
      assume(context.response.message).equals('{ check } is required data using `.send()`');
      done();
    });
  });

  it('provides a descriptive message for no payload', function (done) {
    var context = spawnWith({ check: 'nopayload' });

    context.child.on('exit', function (code, signal) {
      assume(code).equals(0);
      assume(signal).equals(null);
      assume(context.stderr).equals('');
      assume(context.stdout).equals('');
      assume(context.response).is.an('object');
      assume(context.response.message).is.a('string');
      assume(context.response.stack).is.a('string');
      assume(context.response.message).equals('{ payload } is required data using `.send()`');
      done();
    });
  });

  it('fails when the check does not exist', function (done) {
    var checkFile = path.join(checksDir, 'noexist');
    var context = spawnWith({
      check: checkFile,
      payload: { valid: true }
    });

    context.child.on('exit', function (code, signal) {
      assume(code).equals(0);
      assume(signal).equals(null);
      assume(context.stderr).equals('');
      assume(context.stdout).equals('');
      assume(context.response).is.an('object');
      assume(context.response.message).is.a('string');
      assume(context.response.stack).is.a('string');
      assume(context.response.message).includes("Cannot find module '" + checkFile + "'");
      done();
    });
  });

  it('passes with checks/good.js', function (done) {
    var checkFile = path.join(checksDir, 'good.js');
    var context = spawnWith({
      check: checkFile,
      payload: { always: 'ok' }
    });

    context.child.on('exit', function (code, signal) {
      assume(code).equals(0);
      assume(signal).equals(null);
      assume(context.stderr).equals('');
      assume(context.stdout).equals('');
      assume(context.response).equals(undefined);
      done();
    });
  });

  it('passes with checks/simple.js', function (done) {
    var checkFile = path.join(checksDir, 'simple.js');
    var context = spawnWith({
      check: checkFile,
      payload: {
        pkg: { test: true },
        files: { test: true }
      }
    });

    context.child.on('exit', function (code, signal) {
      assume(code).equals(0);
      assume(signal).equals(null);
      assume(context.stderr).equals('');
      assume(context.stdout).equals('');
      assume(context.response).equals(undefined);
      done();
    });
  });

  it('fails with checks/bad.js', function (done) {
    var checkFile = path.join(checksDir, 'bad.js');
    var context = spawnWith({
      check: checkFile,
      payload: { always: 'failure' }
    });

    context.child.on('exit', function (code, signal) {
      assume(code).equals(0);
      assume(signal).equals(null);
      assume(context.stderr).equals('');
      assume(context.stdout).equals('');
      assume(context.response).is.an('object');
      assume(context.response.message).is.a('string');
      assume(context.response.stack).is.a('string');
      assume(context.response.message).equal('The bad check is always bad.');
      done();
    });
  });
});
