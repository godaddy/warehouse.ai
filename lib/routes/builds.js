'use strict';

var async = require('async');
var url = require('url');
var stringify = require('stringify-stream');

const stringifyOpts = { open: '[', close: ']' };

/**
 * Generate a build specification so we can fetch it from bffs.
 *
 * @param {Object} params Parameters.
 * @param {Object} query Query string args
 * @param {String} env Fallback environment in case it's missing.
 * @returns {Object} proper spec object
 * @api private
 */
function spec(params, query, env) {
  query = query || {};
  return {
    env: params.env || env,
    version: params.version,
    name: params.pkg,
    locale: query.locale || 'en-US'
  };
}

module.exports = function (app) {
  //
  // ### /builds/head
  // List the build heads or latest builds
  //
  app.routes.get('/builds/-/head/', function compose(req, res, next) {
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
  app.routes.get('/builds/', function (req, res, next) {
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
  app.routes.get('/builds/cancel/:pkg/:env/:version', function compose(req, res, next) {
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
    .get(function (req, res, next) {
      // TODO: fetch the latest build from artifactory or CDN
      // Investigate how this interacts with the CDN.
      /*eslint no-unused-vars: 0*/
      next();
    })

    //
    // Trigger a build in carpenter through POST request, pipe the response. This
    // route assumes valid `npm publish` like JSON as data.
    //
    .post(function build(req, res, next) {
      app.carpenter.build({
        data: req.body || {}
      }, function client(error, response) {
        if (error) return next(error);

        response.pipe(res);
      }).on('error', next);
    });

  app.routes.get('/builds/-/meta/:pkg/:version', function (req, res, next) {
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
  app.routes.get('/builds/:pkg/:env/:version?', function (req, res, next) {
    var error;

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;

    //
    // Normalzie the build object
    //
    function normalizeBuild(build) {

      function normalizeUrl(filePath) {
        return url.resolve(build.cdnUrl, filePath);
      }

      build.files = build.recommended.length
        ? build.recommended.map(normalizeUrl)
        : build.artifacts.map(normalizeUrl);

      return build;
    }

    //
    // Ok so the assumption currently is that we will use the locale passed on
    // the query string or we use en-US for all of the builds fetched.
    //
    var specs = spec(req.params, req.query);

    return fetch(specs);

    function notFound() {
      error = new Error('Build not found');
      error.status = 404;
      return next(error);
    }

    function fetch(spec) {
      //
      // If we have a version, do search, otherwise fetch from HEAD,
      // we may want to automatically handle this in `bffs`
      //
      return spec.version
        ? app.bffs.search(spec, fetched)
        : app.bffs.head(spec, fetched);
    }

    function fetched(err, build) {
      if (err) {
        err.status = 500;
        return next(err);
      }

      //
      // Remark: Do a secondary lookup when we have a locale if we get a miss the first
      // time if we have a 2 part locale
      //
      if (!build && !specs.locale) return notFound();
      else if (!build && specs.locale) {
        let parts = specs.locale.split('-');
        if (parts.length !== 2) return notFound();
        specs.locale = parts[0];
        return fetch(specs);
      }
      //
      // Grab the relevant file info for the fingerprints on these builds
      //
      res.send(normalizeBuild(build.toJSON()));
    }
  });
};
