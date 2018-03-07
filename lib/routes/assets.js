/* eslint no-bitwise: 0*/
'use strict';

const comment = require('commenting');
const zipline = require('zipline');
const hyperquest = require('hyperquest');
const mime = require('mime');
const path = require('path');

//
// As our intention is to primary serve JS builds, this should be our default
// type when the mime lookup fails to find something fruitful.
//
mime.default_type = 'text/javascript';

module.exports = function (app) {
  const spec = app.spec;

  /*
   * API for serving latest files
   */
  app.routes.get('/assets/-/:pkg/:env/:version?', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;

    spec.findBuild(
      spec.fromRequest(req),
      function (err, build) {
        if (err) { return next(err); }

        //
        // TODO (indexzero): proper sanitization on this untrusted
        // user input.
        //
        const { filter } = req.query;
        if (filter) {
          res.send(
            build.files.filter(file => {
              return path.extname(file) === filter;
            });
          )
        }

        res.send(build.files);
      }
    );
  });

  /**
   * API endpoint for serving builds.
   * TODO: Whats the right way to support gzip if our content is stored in an
   * s3 like store and not duplicated with gzip.
   *
   * Should we just delete these?
   */
  app.routes.get('/assets/:hash', function (req, res) {
    var extension = path.extname(req.params.hash),
      gzip = !!~zipline.accepts(req).indexOf('gzip'),
      fingerprint = extension
        ? req.params.hash.slice(0, -(extension.length))
        : req.params.hash;

    res.setHeader('Content-Type', mime.lookup(req.params.hash));
    res.statusCode = 200;

    res.log.debug('bffs using gzip: ' + gzip);

    //
    // It makes sense from the warehouse standpoint to send the
    // fingerprint with the extension
    //
    app.bffs.build(fingerprint, gzip, function (err, build) {
      if (err) {
        return res.status(500).send(comment('Failed to lookup the build: ' + err.message, {
          extension
        }));
      }

      if (!build) {
        return res.status(404).send(comment('Build not found', {
          extension
        }));
      }

      var url = extension === '.map' ? build.url + '.map' : build.url;
      hyperquest(url)
        .on('error', (err) => {
          if (res.headersSent) return;
          res.status(500).send(comment('Failed to fetch build content:' + err.message, {
            extension
          }));
        })
        .pipe(res);
    });
  });
};
