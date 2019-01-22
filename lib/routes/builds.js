'use strict';

const async = require('async');
const url = require('url');
const stringify = require('stringify-stream');
const asynk = require('express-async-handler');
const semver = require('semver');

const stringifyOpts = { open: '[', close: ']' };

module.exports = function (app) {
  const specify = app.spec;
  const auth = app.middlewares.auth;
  const { manager } = app;
  //
  // ### /builds/head
  // List the build heads or latest builds
  //
  app.routes.get('/builds/-/head/', auth, function compose(req, res, next) {
    app.models.BuildHead.findAll(req.query || {})
      .once('error', err => {
        err.status = 500;
        next(err);
      })
      .pipe(stringify(stringifyOpts))
      .pipe(res);

  });

  app.routes.get('/builds/-/meta/:pkg/:version', auth, function (req, res, next) {
    var error;

    app.bffs.meta(specify.fromRequest(req), function meta(err, build) {
      if (err) {
        return next(err);
      }

      if (!build) {
        error = new Error('Build not found');
        error.status = 404;
        return next(error);
      }

      res.send(build);
    });
  });

  //
  // ### /builds/
  // List ALL of the builds that are in the database
  //
  app.routes.get('/builds/', auth, function (req, res, next) {
    app.models.Build.findAll(req.query || {})
      .once('error', err => {
        err.status = 500;
        next(err);
      })
      .pipe(stringify(stringifyOpts))
      .pipe(res);
  });

  //
  // ### /builds/cancel/:pkg/:version/:env
  // Cancel the specified build.
  //
  app.routes.get('/builds/cancel/:pkg/:env/:version', auth, function compose(req, res, next) {
    app.carpenter.cancel(req.params, function client(error, response) {
      if (error) return next(error);

      response.pipe(res);
    }).on('error', next);
  });

  //
  // ### /build
  // Get build or trigger build for the package.
  //
  app.routes.route('/builds/:pkg')
    .get(auth, function (req, res, next) {
      // TODO: fetch the latest build from artifactory or CDN
      // Investigate how this interacts with the CDN.
      /* eslint no-unused-vars: 0*/
      next();
    })

    //
    // Trigger a build in carpenter through POST request, pipe the response. This
    // route assumes valid `npm publish` like JSON as data.
    //
    .post(auth, function build(req, res, next) {
      app.carpenter.build({
        data: req.body || {}
      }, function client(error, response) {
        if (error) return next(error);

        response.pipe(res);
      }).on('error', next);
    });

  //
  // ### /builds/:pkg/:version/:env
  // Get the build for the specified environment. Returns builds for all
  // environments if no env is specified.
  //
  app.routes.get('/builds/:pkg/:env/:version?', auth, function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;

    specify.findBuild(
      specify.fromRequest(req),
      function (err, build) {
        if (err) { return next(err); }
        res.send(build);
      }
    );
  });

  app.routes.patch('/builds/:pkg/:env/:version', auth, asynk(async (req, res) => {
    // Allow promote to be possible through this via query param but default to
    // false
    const promote = req.query.promote === 'true';
    const { version, ...spec } = specify.fromRequest(req);
    const tag = true;

    if (promote) await manager.rollbackOrBuild({ spec, version, promote, tag });
    else await manager.build({ spec, version, promote, tag });

    res.status(204).end();
  }));
};
