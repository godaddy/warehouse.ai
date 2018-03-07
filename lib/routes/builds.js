'use strict';

var async = require('async');
var url = require('url');
var stringify = require('stringify-stream');

const stringifyOpts = { open: '[', close: ']' };

module.exports = function (app) {
  const spec = app.spec;
  const auth = app.middlewares.auth;
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

  app.routes.get('/builds/-/meta/:pkg/:version', auth, function (req, res, next) {
    var error;

    app.bffs.meta(spec(req.params, req.query), function meta(err, build) {
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
  // ### /builds/:pkg/:version/:env
  // Get the build for the specified environment. Returns builds for all
  // environments if no env is specified.
  //
  app.routes.get('/builds/:pkg/:env/:version?', auth, function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;

    spec.findBuild(
      spec.fromRequest(req),
      function (err, build) {
        if (err) { return next(err); }
        res.send(build);
      }
    );
  });
};
