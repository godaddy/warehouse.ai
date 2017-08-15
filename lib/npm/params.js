/* eslint no-unused-vars: 0*/
/* eslint no-bitwise: 0*/
'use strict';

var errs = require('errs'),
  semver = require('semver');

//
// TODO: this should be in configuration or constants
// or something immutable of that nature.
//
var validTags = ['latest', 'prod', 'test', 'dev'];

module.exports = function setupParams(router) {
  //
  // @param :pkg. Used in
  // /:pkg
  // /:pkg/:version
  // /-/package/:pkg/dist-tags
  // /-/package/:pkg/dist-tags/:tag
  //
  router.param('pkg', function (req, res, next, pkg) {
    //
    // Remark: do we even care about this beyond the matching done by
    // the `path-to-regexp` module?
    //
    next();
  });

  //
  // @param :rev. Used in
  // /:pkg/-rev/:rev
  //
  router.param('rev', function (req, res, next, rev) {
    //
    // Remark: do we even care about this beyond the matching done by
    // the `path-to-regexp` module?
    //
    next();
  });

  //
  // @param :version. Used in
  // /:pkg/:version
  //
  router.param('version', function (req, res, next, version) {
    if (!semver.validRange(version)) {
      return next(errs.create({
        message: version + ' is not a valid semver version.',
        status: 400
      }));
    }

    next();
  });

  //
  // @param :tag. Used in
  // /-/package/:pkg/dist-tags/:tag
  //
  router.param('tag', function (req, res, next, tag) {
    if (!~validTags.indexOf(tag)) {
      return next(errs.create({
        message: tag + ' is not a valid tag. ' + validTags.join(', ') + ' are valid tags.',
        status: 400
      }));
    }

    next();
  });

  return router;
};
