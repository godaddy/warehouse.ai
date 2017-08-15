/* eslint no-bitwise: 0*/
'use strict';

var path = require('path'),
  errs = require('errs');

//
// TODO: this should be in configuration or constants
// or something immutable of that nature.
//
var envs = ['dev', 'prod', 'test'];

module.exports = function setupParams(router) {
  //
  // @param :pkg.
  // Used in build, check and npm routes
  //
  router.param('pkg', function (req, res, next, pkg) {
    //
    // Remark: do we even care about this beyond the matching done by
    // the `path-to-regexp` module?
    //
    req.pkg = pkg;
    next();
  });

  //
  // @param :hash used in:
  //
  // /builds/:hash
  //
  router.param('hash', function (req, res, next, hash) {
    if (!path.extname(hash)) {
      return next(errs.create({
        message: 'Missing file extension'
      }));
    }

    next();
  });

  //
  // @param :env used in:
  //
  // /meta/:env/:pkg/:version
  //
  router.param('env', function (req, res, next, env) {
    if (!~envs.indexOf(env)) {
      return next(errs.create({
        message: `Incorrect environment requested: ${env}`
      }));
    }

    next();
  });

  return router;
};
