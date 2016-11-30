/*eslint no-unused-vars: 0*/
'use strict';

module.exports = function (app) {
  //
  // ### /checks
  // List all checks that run against the package.
  //
  app.routes.get('/checks/:pkg', function (req, res, next) {
    // TODO: list all checks that will run for the package, ignore 2nd param
    // Theoretical this can fetched from the check-suite by keyword.
  });

  //
  // ### /checks/run
  // Run checks against the package and report.
  //
  app.routes.post('/checks/:pkg/run', function (req, res, next) {
    // TODO: execute the checks, requires the same payload as npm publish
  });

  //
  // ### /checks/stats
  // Statistics from historic runs.
  //
  app.routes.get('/checks/:pkg/stats', function (req, res, next) {
    // TODO: report on statistics of earlier runs, duration, failures, warnings, etc.
  });
};
