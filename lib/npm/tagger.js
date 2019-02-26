'use strict';

const thenify = require('tinythen');
const errs = require('errs');

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
 * Updates / adds a specific dist-tag.
 * @returns {undefined}
 */
Tagger.prototype.add = function (opts, callback) {
  var pkg = opts.pkg,
    tag = opts.tag,
    version = opts.version,
    Package = this.Package;

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

    if (!pack) {
      return callback(errs.create({
        message: `'${pkg}' is not in the registry.`,
        status: 404
      }));
    }

    callback(null, pack.distTags);
  });
};

/**
 * Async/await wrapper for running a tag add but deleting if it fails
 * @function wrap
 * @param {Object} opts Options
 *  @param {Boolean} opts.tag Should we run the tag operation or not
 *  @param {Object} opts.spec Spec for the operation
 *  @param {String} opts.version Semver version for the given package
 * @param {Function} fn Function to await for given operation
 * @returns {Promise} via async fn
 */
Tagger.prototype.wrap = async function ({ tag, spec, version }, fn) {
  const { name: pkg, env } = spec;

  this.log.info('tagger.wrap', { tag, spec, version });
  if (tag) await thenify(this, 'add', { pkg, version, tag: env  });

  try {
    return await fn();
  } catch (error) {
    this.log.error('tagger.wrap error', { tag, spec, version, error: error.message, ...error });
    if (tag) return thenify(this, 'delete', { pkg, tag: env });
  }

};
