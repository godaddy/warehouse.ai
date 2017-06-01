'use strict';

var async = require('async');
var errs = require('errs');
var util = require('util');
var tryParse = require('json-try-parse');

/**
 * @constructor Tagger
 *  @param {Object} opts - Options for configuring constructor
 * Constructor function for the Tagger which is responsible
 * for reading and writing npm dist-tags
 */
var Tagger = module.exports = function Tagger(opts) {
  opts = opts || {};
  opts.npm = opts.npm || {};
  opts.npm.cluster = opts.npm.cluster || {};
  opts.npm.urls = opts.npm.urls || {};

  this.npm = opts.npm;
  this.log = opts.log;
  this.Package = opts.models.Package;
  this.Version = opts.models.Version;
};

/**
 * @function delete
 *  @param {Object} opts - Options for delete
 *  @param {function} callback - continuation to call when finished
 * Deletes a specific dist-tag
 * @returns {undefined}
 */
Tagger.prototype.delete = function (opts, callback) {
  var pkg = opts.pkg,
      tag = opts.tag;

  var update = {
    name: pkg,
    distTags: {}
  };

  //
  // Note that for maps we actually don't currently delete values as to
  // prevent tombstones. This should technically be allowed but we should
  // expect in this case for the value to still exist but have a null value
  //
  update.distTags[tag] = null;

  //
  // Remark: Do we do anything special with the builder on a remove?
  //
  this.Package.update(update, function (err) {
    if (err) { return callback(err); }
    callback();
  });
};

/**
 * @function add
 *  @param {Object} opts - Options for add action
 *  @param {function} callback - continuation to call when finished
 * Updates / adds a specific dist-tag. This will kick off a build
 * from carpenter for the appropriate package(s).
 * @returns {undefined}
 */
Tagger.prototype.add = function (opts, callback) {
  var pkg = opts.pkg,
      tag = opts.tag,
      Package = this.Package,
      read = this.npm.urls.read;

  //
  // Create update body for cassandra
  //
  var update = {
    name: pkg,
    distTags: {}
  };

  update.distTags[tag] = version;

  Package.update(update, function (err) {
    if (err) return callback(err);
    callback(null, update.distTags);
  });
};

/**
 * @function list
 *  @param {String} pkg - package name we are listing
 *  @param {function} callback - continutation to call when finished with distTags
 * Lists all dist-tags for the specified pkg
 * @returns {undefined}
 */
Tagger.prototype.list = function (pkg, callback) {
  //
  // Retrieve a list of all current tags from cassandra. This route will also
  // be hit by the `add` and `rm` command.
  //
  this.Package.get(pkg, function (err, pack) {
    if (err) { return callback(err); }

    pack = pack || {};
    callback(null, pack.distTags);
  });
};
