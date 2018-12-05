'use strict';

const ndjson = require('ndjson');
const async = require('async');
const etag = require('etag');
const Retryme = require('retryme');

module.exports = function (app) {
  const Package = app.models.Package;
  const Version = app.models.Version;
  const auth = app.npmAuthMiddleware || ((req, res, next) => {
    next(null);
  });

  //
  // Setup our known param handlers for well-known npm
  // parameter names.
  //
  require('./params')(app.routes);

  //
  // ### unpublish
  // Unpublish a package but only when it will not have
  // an adverse affect on a build that we care about.
  //
  app.routes.delete('/:pkg/-rev/:rev', auth, function deleteNPMPackageRoute(req, res, next) {
    //
    // TODO: ensure that no builds prevent this unpublish event.
    // Remark: Should we also change the state of the package in cassandra here
    // or does that happen on a different request?
    //
    app.npmProxy(req, res, next);
  });

  //
  // ### dist-tags/
  // Atomic operations on all dist-tags.
  //
  app.routes.route('/-/package/:pkg/dist-tags')
    .get(auth, function (req, res, next) {
      app.tagger.list(req.params.pkg, function getDistTagNPMPackageRoute(err, tags) {
        if (err) { return next(err); }
        res.status(200).json(tags);
      });
    })
    .put(auth, function putDistTagNPMPackageRoute(req, res, next) {
      /* eslint no-unused-vars: 0*/

      //
      // Remark: as of npm@2.13.5 this is not consumed anywhere, but it is
      // implemented as `registry.distTags.set` in npm-registry-client. see:
      // https://github.com/npm/npm-registry-client/blob/master/lib/dist-tags/set.js.
      // We are choosing to not implement it here purposefully.
      //
      res.status(400).json({ message: 'Not implemented' });
    })
    .post(auth, function postDistTagNPMPackageRoute(req, res, next) {
      /* eslint no-unused-vars: 0*/

      //
      // Remark: as of npm@2.13.5 this is not consumed anywhere, but it is
      // implemented as `registry.distTags.set` in npm-registry-client. see:
      // https://github.com/npm/npm-registry-client/blob/master/lib/dist-tags/update.js.
      // We are choosing to not implement it here purposefully.
      //
      res.status(400).json({ message: 'Not implemented' });
    });

  //
  // ### dist-tags/:tag
  // Atomic operations on individual dist-tags.
  //
  app.routes.route('/-/package/:pkg/dist-tags/:tag')
    .delete(auth, function deleteDistTagNPMPackageRoute(req, res, next) {
      app.tagger.delete(req.params, function (err) {
        if (err) { return next(err); }
        res.status(204).end();
      });
    })
    .put(auth, tagBuild)
    .post(auth, tagBuild);

  //
  // ### View package
  // Attempts to fetch the `package` and `version`
  // records that have been persisted for this `:pkg`
  //
  app.routes.get('/:pkg', auth, function getNPMPackageRoute(req, res, done) {
    const name = req.params.pkg;
    const etags = {
      last: req.headers['if-none-match']
    };

    async.waterfall([
      Package.get.bind(Package, name),
      function getVersion(pkg, next) {
        //
        // Default to the version for the environment or the latest `distTag`.
        //
        const env = req.headers['registry-environment'] || 'test';
        const version = pkg && pkg.distTags && (pkg.distTags[env]
          || pkg.distTags.latest);

        if (!version) {
          req.log.warn('No package %s in cassandra, proxying to artifactory', name, pkg);
          //
          // Hit our final middleware
          //
          return next();
        }

        Version.get([name, version].join('@'), next);
      }
    ], function onPackageVersion(err, version) {
      if (err || !version) { return done(err); }

      let send = version.value;
      let status = 200;

      //
      // TODO: store this on the version record itself because
      // it wasteful to recalculate it every request.
      //
      etags.now = etag(version.value);
      res.setHeader('etag', etags.now);
      res.setHeader('content-type', 'applcation/json');

      if (etags.now === etags.last) {
        status = 304;
        send = '';
      }

      res.status(status);
      res.end(send);
    });
  });

  /**
   * Create a new tag for the specified package and data, then either execute
   * a rollback or a new build in carpenter
   *
   * @param {HTTPRequest} req Request from npm or similar client
   * @param {HTTPResponse} res Response to npm or similar client
   * @param {Function} next Completion callback.
   * @private
   * @returns {undefined}
   */
  function tagBuild(req, res, next) {
    var version = req.body;
    var pkg = req.params.pkg;
    var tag = req.params.tag;
    tagAndBuild({ pkg, tag, version, log: req.log, earlyReturn: true }, function distTagged(err, tags) {
      if (err) { return next(err); }
      //
      // Respond with the newly created tags.
      //
      res.status(201).json(tags);
    });
  }

  function tagAndBuild({ pkg, tag, version, log, earlyReturn }, callback) {
    app.tagger.add({ pkg, tag, version }, function distTagged(err, tags) {
      if (err) { return callback(err); }
      // eslint-disable-next-line callback-return
      earlyReturn && callback(null, tags);

      /**
       * Carpenter error occured.
       *
       * @param {Error} buildError Request or Carpenter error
       * @api private
       * @returns {undefined}
       */
      function error(buildError) {
        log.error(buildError);

        //
        // Remove the already tagged version as the build/rollback failed miserably.
        //
        app.tagger.delete({ pkg, tag }, log.error);
        !earlyReturn && callback(buildError);
      }

      var spec = {
        name: pkg,
        env: tag
      };

      rollbackOrBuild({ spec, version, log }, (err) => {
        if (err) return error(err);


        log.info('Successful rollback to %s', version, spec);
        !earlyReturn && callback(null, tags);
      });
    });
  }

  /**
   *
   * Either execute a rollback or a carpenter build
   * @function rollbackOrBuild
   * @param {Object} opts - options for function
   * @param {Function} done - function to execute when complete
   * @returns {undefined}
   * @private
   */
  function rollbackOrBuild(opts, done) {
    const { log, spec, version } = opts;
    const { name: pkg } = spec;
    var buildSpec = Object.assign({ version }, spec);

    //
    // If this version already has a build associated, assume we want to
    // rollback to that version
    //
    log.info('Searching for build based on tag', buildSpec);
    async.parallel([
      app.bffs.search.bind(app.bffs, buildSpec),
      async.asyncify(app.release.get.bind(app.release, { pkg, version }))
    ], function findPreviousBuild(err, [build, releaseLine]) {
      if (build) {
        log.info('Executing rollback, version %s found', version,  buildSpec);

        // For the eventual route where we want to get real status here, we need to think more
        // about how to give back status/errors here. Right now `tagDependents` is forcing success
        // so we should never actually hit error here. We probably want to gather up all the
        // errors and undo the change the best we can for anything that's been updated.
        tagDependents(releaseLine && releaseLine.dependents, { tag: spec.env, log }, function depRollback(err) {
          if (err) {
            log.error(err);
          }
        });

        return void app.bffs.rollback(spec, version, done);
      }
      if (err) log.error(err);

      //
      // Only fetch version if this is not a rollback so we can rollback
      // dependent builds that dont have explicit version records.
      // TODO: We could make version records in feedsme but that would also
      // mean we would have to replicate publish in feedsme
      //
      carpenterBuild(opts, done);
    });
  }

  /**
   * Tags all dependents in a release line, forcing it to either just tag the existing build
   * and update the build-head or run a full carpenterd build if necessary.
   * @param {Object} dependents - Listing of dependent package from a release line.
   * Object keys are package names, values are the versions to be tagged
   * @param {Object} options - Options object
   * @param {String} options.env - The environment to perform the rollback in
   * @param {String} options.log - How to log errors
   * @param {Function} done - function to execute when complete
   * @private
   */
  function tagDependents(dependents, { tag, log }, done) {
    if (!dependents) return;

    // Loop the dependents and roll them back to that version as well.
    const depOpts = Object.entries(dependents)
      .map(([pkg, version]) => ({
        pkg,
        tag,
        version,
        log,
        earlyReturn: false
      }));

    const config = {
      retry: { retries: 5, min: 50, max: 10000 },
      limit: 5,
      ...app.config.get('dependentBuilds')
    };

    // setImmediate(function () {
    async.parallelLimit(
      depOpts.map(depOpt => {
        const retry = new Retryme(config.retry);
        return function (next) {
          retry.attempt(
            tagAndBuild.bind(null, depOpt),
            // Forces eventual success so that we attempt to tag each dependent.
            // We probably want to track the work we've done here and undo anything that has
            // completed if any errors happen.
            function (e, data) {
              e && log.err(e);
              next(null, data);
            });
        };
      }),
      config.limit,
      done);
  }

  /**
   *
   * Execute a carpenter build
   * @function carpenterBuild
   * @param {Object} opts - options for function
   * @param {Function} done - function to execute when complete
   * @returns {undefined}
   * @private
   */
  function carpenterBuild(opts, done) {
    var spec = opts.spec;
    var version = opts.version;
    var log = opts.log;
    var read = app.tagger.npm.urls.read;
    Version.get(`${spec.name}@${version}`, function (err, vers) {
      if (err) return done(err);
      vers.forBuild(read, function (err, pack) {
        if (err) return done(err);
        //
        // Don't wait for the build to complete as it can be longer
        // that the default request timeout, before responding with the dist-tag
        // details. In the case of any build errors remove the dist-tag.
        // Add tag as environment to package and trigger build.
        //
        pack.env = spec.env;
        log.info('No previous build for %s, carpenter trigger', version, spec);
        app.carpenter.build({ data: pack }, function response(err, buildLog) {
          if (err) { return done(err); }

          //
          // Log the streaming responses of the builder.
          // TODO: can these be streamed back to npm?
          //
          buildLog.pipe(ndjson.parse())
            .on('error', done)
            .on('data', function onData(data) {
              if (data.event === 'error') {
                return done(data);
              }

              log.info(data);
            });
        });
      });
    });
  }
};


