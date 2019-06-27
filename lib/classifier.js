'use strict';

var merge = require('lodash.merge');

/**
 * Constructor function for the Classifier responsible for mapping
 * package.json keywords onto a fully resolved set of script paths
 * representing checks to execute for a valid publish.
 *
 * @param {Object} opts Options for classification.
 */
var Classifier = module.exports = function Classifier(opts) {
  this.classification = opts.keywords || {};
  this.projects = Object.keys(opts.projects || {})
    .reduce(function (acc, type) {
      acc[type] = opts.projects[type].map(function (pkg) {
        return require.resolve(pkg);
      });

      return acc;
    }, {});
};

/**
 * Find the correct set of checks for the provided package.json
 *
 * @param {Object} data Package.json which we need to classify.
 * @param {Object} options Define additional classifications or special keywords.
 * @returns {Array} Set of checks to execute
 * @api public
 */
Classifier.prototype.getChecks = function (data = {}, options) {
  var project = this.getProject(data, options);
  return this.projects[project] || [];
};

/**
 * Find the correct project on the provided package.json.
 *
 * @param {Object} data Package.json which we need to classify.
 * @param {Object} options Define additional classifications or special keywords.
 * @returns {String} Empty string indicates global usage.
 * @api public
 */
Classifier.prototype.getProject = function (data, options) {
  options = options || {};

  //
  // Allow additional rules to be defined and merge against the default.
  //
  var classy = merge(this.classification, options.classification),
    keyword = options.keyword || 'check',
    match = '';

  //
  // The classification can also be read directly from the data.
  // Allow opt-in for a `keyword`. This defaults to the `check` property.
  //
  if (data[keyword] in classy) return data[keyword];

  //
  // Check if there are keywords in the package.json that gives some intel on
  // which project/team created these packages.
  //
  if (!Array.isArray(data.keywords)) data.keywords = [];

  Object.keys(classy).some(function each(project) {
    var keywords = classy[project];

    if (keywords.some(function some(keyword) {
      return !!~data.keywords.indexOf(keyword);
    })) return !!(match = project);

    return false;
  });

  return match;
};
