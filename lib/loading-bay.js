/* eslint no-continue: 0 */
/* eslint no-empty: 0 */
'use strict';

var EE = require('events').EventEmitter;
var util = require('util');
var Redis = require('ioredis');
var Writable = require('readable-stream/writable');

var defaultLogger = {
  info: function () {},
  warn: function () {},
  error: function () {}
};

module.exports = LoadingBay;

/**
 * Become an EventEmitter
 */
util.inherits(LoadingBay, EE);

/**
 * Constructor function for the LoadingBay responsible for a fast lookup cache of Package models.
 *  @param {Object} options
 *    - options.PackageCache {Object} Instance of a datastar Model
 *    - options.redis {String} String for redis instance
 *    - options.ttl {Number} Milliseconds of how long to cache before we invalidate
 */
function LoadingBay(options) {
  EE.call(this);
  this.PackageCache = options.PackageCache;
  //
  // If we need redis elsewhere we should pass in an instance
  //
  this.redis = new Redis(options.redis);
  this.log = options.log || defaultLogger;
  //
  // This could be more generic but we make certain assumptions here in general
  // so meh for now
  //
  this.conditions = { conditions: { partitioner: 'cached' } };
  this.ttl = options.ttl || 3E5; // 5 minutes
  this.expired = options.expired || '__package_cache__';
  //
  // Key to use to set that we are currently populating the cache,
  // we store this in redis so we remain stateless
  // TODO: IMPLEMENT
  //
  this.populatingKey = options.populatingKey || '__populating__';
  this._populating = false;
}

/**
 * Get a set of packages by tag.
 * @param {String} tag Tag for packages to get from the cache
 * @param {Function} callback Continuation to respond to when complete.
 * @returns {undefined} Nothing of interest.
 */
LoadingBay.prototype.get = function (tag, callback) {
  var self = this;

  //
  // Wait until we finish fetching the new cache before getting it if we are
  // populating. This prevents stale reads.
  // TODO: Handle the case where we are
  // running on multiple instances by storing this in redis and use pub sub for
  // notification when one node is done doing the populating work so that we
  // ensure no stale reads happen in that case if it matters
  //
  if (this._populating) return this.once('refreshed', this.get.bind(tag, callback));

  //
  // Simply check to see if our cache has expired
  // Technically we can use one key for this since we re-populate everything
  // at once
  //
  this.redis.get(this.expired, function (err, res) {
    if (err || !res || !res.length) {
      return self._populate(self.fetch.bind(self, tag, callback));
    }
    //
    // Fetch the set for the particular tag!
    //
    self.fetch(tag, callback);
  });
};

/**
 * Fetch the array of packages associated with each tag from the hash
 * @param {String} tag Tag for packages to fetch from the cache
 * @param {Function} callback Continuation to respond to when complete.
 */
LoadingBay.prototype.fetch = function (tag, callback) {
  var self = this;
  this.redis.hgetall(this.key(tag), function (err, hash) {
    if (err) { return callback(err); }
    callback(null, self._normalize(tag, hash));
  });
};

/**
 * Transform an object into a list
 * @param {String} tag Tag for packages to get from the cache
 * @param {Object} hash Object to transform into a list.
 * @returns {Array} Normalized array of object values from `hash`.
 * @api private
 */
LoadingBay.prototype._normalize = function (tag, hash) {
  var result = [];
  var keys = Object.keys(hash);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = tryParse(hash[key]);
    if (!value) {
      this.log.warn('Value for %s under tag %s is unparseable', key, tag, {
        value: hash[key]
      });
      continue;
    }
    result.push(value);
  }

  return result;
};

/**
 * Return a namspaced key for the hashes we are using to store packages
 * @param {String} tag Tag for packages to namespace.
 * @returns {String} Key for the corresponding tag.
 */
LoadingBay.prototype.key = function (tag) {
  return 'tags:' + tag;
};

/**
 * Populate the redis cache using a pipeline for efficiency by fetching all of
 * the packages from the PackageCache table and putting them in the appropriate
 * hashes
 * @param {Function} callback Continuation to respond to when complete.
 */
LoadingBay.prototype._populate = function (callback) {
  var self = this;
  this._populating = true;
  //
  // Use a pipeline to be more efficient with redis
  //
  var pipeline = this.redis.pipeline();
  //
  // Start the pipeline by setting up the cache expiration
  //
  pipeline.setex(this.expired, this.ttl, 'make it so');
  this.PackageCache.findAll(this.conditions)
    .pipe(this.invalidate(pipeline))
    .on('finish', function () {
      pipeline.exec(function (err) {
        if (err) { return callback(err); }
        self._populating = false;
        self.emit('refreshed');
        callback();
      });
    });
};

/**
 * Setup the invalidation pipeline that gets executed in populate on all
 * packages we received to insert each tag into the proper hash
 * @param {Redis} pipeline Redis client to invalidate with.
 * @returns {Stream} WriteableStream to perform invalidation operation with.
 */
LoadingBay.prototype.invalidate = function (pipeline) {
  var self = this;
  return new Writable({
    objectMode: true,
    write: function (pkg, enc, done) {
      var pack = self.filter(pkg.toJSON());
      //
      // Iterate through the tags so we can create the keys to set
      //
      (pack.keywords || []).forEach(function (tag) {
        pipeline.hmset(self.key(tag), pkg.name, JSON.stringify(pack));
      });

      done();
    }
  });
};

/**
 * Reduce payload size by removing keys with null values when inserting
 * @param {Object} pkg Package to filter null values from.
 * @returns {Object} Package object with null values filtered out.
 */
LoadingBay.prototype.filter = function (pkg) {
  //
  // Delete useless key used for partitioning the cache
  //
  delete pkg.partitioner;
  var keys = Object.keys(pkg);
  var key;

  for (var i = 0; i < keys.length; i++) {
    key = keys[i];
    if (!pkg[key]) delete pkg[key];
  }

  return pkg;
};

/**
 * Dont let try catch de-optimize our functions!
 * @param {String} data Potential JSON to attempt to parse.
 * @returns {Object|undefined} Parsed JSON or undefined.
 */
function tryParse(data) {
  var json;

  try {
    json = JSON.parse(data);
  } catch (ex) {}

  return json;
}

