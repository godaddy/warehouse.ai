'use strict';

module.exports = function (app) {
  var env = app.config.get('NODE_ENV');

  return function (err, req, res, next) {
    if (!err) { return next(); }

    var msg = err.message || 'Unknown error';
    var meta = {
      title: 'Error executing API call',
      status: err.status || 500
    };

    // This stack information only gets sent to kibana
    meta.content = err.stack;
    var result = { message: msg };
    if (env === 'development') {
      result.stack = err.stack;
    }

    if (err.code) {
      meta.code = result.code = err.code;
    }

    req.log.error(msg, meta);
    res.status(meta.status).json(result);
  };
};
