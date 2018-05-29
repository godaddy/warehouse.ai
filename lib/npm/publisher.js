/* eslint max-statements: [2, 20] */
'use strict';

var PublishSplitStream = require('npm-publish-split-stream'),
    EventEmitter = require('events').EventEmitter,
    VerifyStream = require('npm-verify-stream'),
    fork = require('child_process').fork,
    Gjallarhorn = require('gjallarhorn'),
    Classifier = require('../classifier'),
    concat = require('concat-stream'),
    params = require('./params'),
    ndjson = require('ndjson'),
    async = require('async'),
    path = require('path'),
    util = require('util'),
    once = require('once'),
    errs = require('errs'),
    url = require('url');

var checkmate = require.resolve(path.resolve(__dirname, '..', 'checkmate'));

var hasScope = /^(@.\w+?)\//;

/*
 * @constructor Publisher
 *  @param {Object} opts - Options to confgure Publisher
 * All state related to handling and processing npm publishes
 */
var Publisher = module.exports = function Publisher(opts) {
  EventEmitter.call(this);

  opts = opts || {};
  opts.npm = opts.npm || {};
  opts.agents = opts.agents || {};
  opts.npm.cluster = opts.npm.cluster || {};
  opts.npm.urls = opts.npm.urls || {};
  opts.npm.urls.write = opts.npm.urls.write || {};

  this.npm = opts.npm;
  this.log = opts.log;
  this.models = opts.models;
  this.agents = opts.agents;
  this.carpenter = opts.carpenter;

  //
  // Map for scope lookup
  // {
  //   @scope: Endpoint
  // }
  //
  this.scopes = new Map(
    Object.keys(this.npm.urls.write).map(scope => [scope, this.npm.urls.write[scope]])
  );

  this.classifier = new Classifier(opts.classification || {});
  this.checkScript = opts.npm.checkScript || checkmate;
  this.cluster = new Gjallarhorn(this.npm.cluster);
  //
  // TODO: Investigate performance gains for bound
  // prototypal function vs. scoped non-prototypal function.
  //
  this.cluster.reload(this.spawn.bind(this));
};

util.inherits(Publisher, EventEmitter);

/**
 * Lazy setup of the router because the nested requires take about 100ms
 * @returns {Publisher} the instance that we are
 */
Publisher.prototype.setup = function () {
  var Router = require('slay').Router;

  //
  // Create a router to handle a single route.
  //
  // ### publish
  // Publish a package but only when verified.
  //
  this.router = params(new Router())
    .put('/:pkg', this.verify.bind(this));

  this.request = require('hyperquest');
  return this;
};

/**
 * @function spawn
 *  @param {Object} data - Payload to send to child process
 * Factory function to use with Gjallarhorn. Made
 * into a prototype function because V8 optimizes them.
 * @returns {ChildProcess} spawned child
 */
Publisher.prototype.spawn = function (data) {
  var child = fork(this.checkScript, {
    gid: this.npm.cluster.gid,
    uid: this.npm.cluster.uid,
    silent: true
  });

  if (this.npm.debugChildren) {
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  }

  child.send(data);
  return child;
};

/**
 * @function dispatch
 *  @param {Request} req - Incoming Request
 *  @param {Response} res - Outgoing Response
 *  @param {function} next - Continutation if this route isn't matched
 *
 * Attempts to dispatch the `req` if it matches the appropriate
 * path to be an "npm publish" request.
 * @returns {undefined}
 */
Publisher.prototype.dispatch = function (req, res, next) {
  var self = this;
  this.router(req, res, function (err) {
    return err
      ? self.error(err, req, res, next)
      : next();
  });
};

/**
 * @function checks
 *  @param {Object} buffer - Npm package buffer
 * Get all required module names for checks required for a given
 * package.json in an npm-package-buffer instance and map them into
 * functions to queue up the spawning the lazy installation and
 * execution of those check modules.
 * @returns {Array} Functions that are used to run checks in a child process
 */
Publisher.prototype.checks = function (buffer) {
  //
  // If not tags are found we should run no checks. Yes, this is similar
  // to `git push -f` but we need to allow things to flow through the registry.
  //
  var self = this;
  var checks = this.classifier.getChecks(buffer.pkg) || [];
  var messages = [];
  var options = {
    message: function (msg, round) {
      if (msg.__checkmate) { return round.ref.disconnect(); }
      messages.push(msg);
    }
  };

  return checks
    .map(function mapCheck(filename) {
      //
      // Remark: Yes. This is the same `buffer` as the outer
      // scope. Out usage of `npm-verify-stream` is hyper
      // dynamic.
      //
      return function checkProxy(buf, next) {
        //
        // Remark: if this throws the stack trace is very
        // difficult to read. Consider a try/catch.
        //
        self.cluster.launch({
          check: filename,
          payload: buf
        }, options, function processed(err) {
          //
          // If we got an error from the child process
          // we spawned or that child process returned
          // any data via `.send` we assume it is an error.
          //
          if (err) return next(err);
          if (messages.length) return next(messages.pop());
          next();
        });
      };
    });
};

/**
 * @function createVersion
 *  @param {Object} payload - Package information used to create a version record
 *  @param {function} done - Continuation to be called when finished
 * Attempts to create a Version record for the `payload`
 * that has been published and updates the `Package` it
 * is from. If no corresponding `Package` record exists
 * then it will be created.
 * @returns {undefined}
 */
Publisher.prototype.createVersion = function (payload, done) {
  var pkg = this.models.Package.fromPublish(payload);
  var version = pkg.version;
  var name = payload.name;
  var id = name + '@' + version;
  var self = this;

  async.parallel({
    version: function (next) {
      //
      // Remark: if `version.version` does not exist we will
      // end up in a bad state.
      //
      self.models.Version.create({
        versionId: id,
        name: name,
        version: version,
        value: JSON.stringify(payload)
      }, function (err) {
        if (err) { self.log.error('Error creating version', err); }
        next(err);
      });
    },
    pkg: function (next) {
      self.models.Package.update(pkg, function (err) {
        if (err) { self.log.error('Error creating package', err); }
        next(err);
      });
    }
  }, function (err) {
    self.emit('publish:end', id, err);
    done(err, id);
  });
};

/**
 * @function getTarget
 *  @param {String} name - Name of package
 * Figures out and returns target registry from the given scope
 * @returns {String} Target registry
 */
Publisher.prototype.getTarget = function getTarget(name) {
  var match = hasScope.exec(name);

  if (!match) {
    return this.scopes.get('default');
  }

  //
  // Grab the scope and return the URL if it exists
  //
  var scope = match[1];

  return this.scopes.get(scope);
};

/**
 * @function toNpm
 *  @param {String} target - Target npm to send the payload to
 *  @param {Object} payload - Full paylaod to be written to the request
 *  @param {Object} options - Any additional options needed for the request
 * Publish to npm, payload is stringified JSON from the npm client.
 * @returns {Request} a request as a writable stream
 */
Publisher.prototype.toNpm = function toNpm(target, payload, options) {
  var req;

  options = options || {};
  //
  // Leading slash clobbers the path on `target` so we slice it off
  //
  var resolved = url.resolve(target, options.url.slice(1));
  var parsed = url.parse(resolved);

  var host = parsed.host;
  var proto = parsed.protocol;
  parsed.auth = '****:****';

  this.log.info('Publishing to resolved url', {
    url: url.format(parsed)
  });

  //
  // Set the proper host on the header
  //
  options.headers.host = host;

  req = this.request(resolved, {
    method: 'PUT',
    headers: options.headers,
    agent: this.agents[proto]
    //
    // Remark: We may need to rewrite authentication
    // here depending on the strategy that we want to
    // go with.
    //
  });

  setImmediate(req.end.bind(req, payload));
  return req;
};

/**
 * @function build
 *  @param {String} name - name of the package used for logging
 *  @param {Object} payload - Payload to send to carpenter to build
 *  @param {function} next - Continuation called when build finishes
 * Trigger the Carpenter build to run, uses the npm client payload. The response is
 * not piped back to the npm client, basically making builds fire and forget.
 * @returns {Request} hyperquest request from carpenter client
 */
Publisher.prototype.build = function build(name, payload, next) {
  var self = this;

  function onError(err) {
    self.log.error('carpenter build error for %s', name, {
      name: name,
      message: err.message,
      stack: err.stack,
      code: err.code || 'NONE'
    });
  }

  //
  // Build verified and published package.
  //
  return self.carpenter.build({ data: payload })
    .once('error', onError)
    .once('response', function response(buildLog) {
      //
      // We have already returned to the response at this point so we log
      // errors. We can potentially retry on this layer if that is useful.
      //
      if (buildLog.statusCode >= 400) {
        return self.log.error('Invalid status code %d on build for %s', buildLog.statusCode, name, {
          name: name
        });
      }

      buildLog
        .pipe(ndjson.parse())
        .on('data', self.log.info.bind(self.log), 'carpenter build status')
        .once('error', onError)
        .once('end', next);
    });
};

/**
 * @function verify
 *  @param {Request} req - Incoming request
 *  @param {Response} res - Outgoing response
 *  @param {function} next - Continuation called if error occurs
 * Attempts to verify the specified `req` tarball against
 * the **core** checks associated with the registry.
 *
 * Remark: this is a *prototypal* method for performance reasons.
 * @returns {Stream} whatever is returned from concat-stream
 */
Publisher.prototype.verify = function verify(req, res, next) {
  var done = once(next);
  var self = this;
  var verifier;
  var version;

  /**
   * @function onError
   *  @param {String} status - status of error
   *  @param {Number} code - http status code
   * Returns a function which appropriately
   * wraps the error in the pipechain
   * @returns {function} error handling function
   */
  function onError(status, code) {
    status = status || 500;

    return function (err) {
      done(errs.create({
        status: status,
        message: err.message,
        stack: err.stack,
        code: code
      }));
    };
  }

  //
  // Create a new VerifyStream which will cache the entire request before
  // splitting it out in a new PublishSplitStream.
  //
  verifier = new VerifyStream({
    before: new PublishSplitStream(),
    checks: this.checks.bind(this),
    concurrency: this.npm.concurrency,
    cleanup: this.npm.cleanup,
    read: this.npm.read
  }).once('error', onError(400, 'npm-verify'));

  //
  // some of the tests are piping in objects, so enforce string like prod.
  // This uses the buffered request from verify to ensure the payload passes checks.
  //
  return req.pipe(verifier).pipe(concat({ encoding: 'string' }, function transform(payload) {
    //
    // We optimally rewrite the payload received from
    // `npm publish` by stripping `data._attachments`
    // to avoid JSON parsing what could be quite large.
    // We **MAY** perform additional rewrites in the future
    // but do not currently do so since
    //
    // `data.versions[VERSION].dist.tarball`
    //
    // is relative to the Warehouse URL and not
    // to a target npm URL (i.e. `npm:urls`).
    //
    try {
      version = JSON.parse(
        payload.slice(0, payload.indexOf('_attachments"')) + '_attachments":{}}'
      );
    } catch (ex) {
      self.log.error('Unparsable json | strip attachment: %s', {
        error: ex.message,
        payload: payload
      });

      return onError(400, 'npm-parse')(ex);
    }

    //
    // Check if we are a scoped package and get the proper target
    //
    var target = self.getTarget(version.name);

    if (!target) {
      return onError(400, 'npm-scope')(new Error('Invalid scope for ' + version.name));
    }

    var parsed = url.parse(target);
    parsed.auth = '****:****';
    self.log.info('Proxy to target', {
      target: url.format(parsed),
      name: version.name
    });

    self.toNpm(target, payload, req)
      .once('error', onError(400, 'npm-publish'))
      .once('response', function response(inc) {
        res.writeHead(inc.statusCode, inc.statusMessage, inc.headers);

        if (inc.statusCode >= 400) {
          return self.log.error('Invalid status code ' + inc.statusCode + ' on publish', {
            name: version.name,
            verson: version.version
          });
        }

        //
        // TODO: check if progress can be shared through the npm client.
        //
        self.log.info('Creating version for publish');
        self.createVersion(version, function versionStored(err, id) {
          if (err) {
            return self.log.error(err);
          }

          self.log.info('Starting carpenter build: %s', id);
          self.build(version.name, payload, function build() {
            self.log.info('Build finished: %s', id);
          });
        });
      }).pipe(res);
  })).once('error', onError(400, 'npm-verify'));
};
