const url = require('url');

/**
 *
 * @param {slay.App} app - the global app instance
 * @param {Object} opts - for extra configurability
 * @param {function} done - continuation when preboot is finished
 * @returns {undefined}
 *
 * Attaches the spec helpers to the `app` instance as `app.spec`.
 */
module.exports = function (app, opts, done) {
  //
  // TODO (indexzero): this should be configurable.
  //
  const defaultLocale = 'en-US';

  //
  // Returns back an iso639 string if given a full locale,
  // if given the same iso639 string, returns null
  //
  function iso639(locale) {
    const parts = locale.split('-');
    if (parts[0] === locale) return null;
    return parts[0];
  }

  app.spec = {
    /**
     * Generate a build specification from an inbound HTTP request
     * so we can fetch it from bffs.
     *
     * @param {IncomingRequest} req HTTP request to extract spec info from.
     *   @param {Object} req.params Parameters.
     *   @param {Object} req.query Query string args
     * @param {String} env Fallback environment in case it's missing.
     * @returns {Object} proper spec object
     * @api private
     */
    fromRequest: function spec(req, env) {
      const { params, query = {} } = req;
      return {
        env: params.env || env,
        version: params.version,
        name: params.pkg,
        locale: query.locale || defaultLocale
      };
    },

    /**
     * Responds with the build for the normalized `spec`
     * @param  {Object}   spec Description of the build
     * @param  {Function} next Continuation to respond to when complete.
     */
    findBuild: function (spec, next) {
      var error;
      var defaulted = false;

      //
      // Normalzie the build object
      //
      function normalizeBuild(build) {
        function normalizeUrl(filePath) {
          return url.resolve(build.cdnUrl, filePath);
        }

        build.files = build.recommended && build.recommended.length
          ? build.recommended.map(normalizeUrl)
          : build.artifacts.map(normalizeUrl);

        return build;
      }

      //
      // Responds with a 404 not found error.
      //
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
        if (!build && !spec.locale) return notFound();
        else if (!build && spec.locale) {
          //
          // 1. Try and grab the iso369 of the locale and refetch
          // 2. Otherwise try and fetch the defaultLocale
          // 3. Return notFound if all else fails
          const lang = iso639(spec.locale);
          if (lang) return refetch(lang);
          if (defaulted) return notFound();
          defaulted = true;
          return refetch(defaultLocale);
        }

        //
        // Grab the relevant file info for the fingerprints on these builds
        //
        next(null, normalizeBuild(build));
      }

      //
      // Retries fetch for build with given locale string
      //
      function refetch(locale) {
        spec.locale = locale;
        return fetch(spec);
      }

      //
      // Ok so the assumption currently is that we will use the locale passed on
      // the query string or we use en-US for all of the builds fetched.
      //
      fetch(spec);
    }
  };

  return done();
};
