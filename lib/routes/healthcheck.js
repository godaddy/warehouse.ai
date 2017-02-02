'use strict';

module.exports = function (app) {
  //
  // ### /healthcheck
  // Simple healthcheck
  //
  app.routes.get('/healthcheck(.html)?', function (req, res) {
    res.end('ok');
  });
};
