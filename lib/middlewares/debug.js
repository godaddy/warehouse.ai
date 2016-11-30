/* eslint guard-for-in: 0*/
'use strict';

// adds a ?debug query parameter
// if ?debug=true we will grab all
// the writes to our HTTP response and transform
// it to all logs attached to the request/response
// and dump the final headers/content

var DEBUG_PATTERN = /^(?:|[\*])$/;

function bufferStringOrValue(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }
  return value;
}

function stringify(content) {
  return JSON.stringify(content, function (key, value) {
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map(bufferStringOrValue);
      }
      value = Object.create(value);
      for (var k in value) {
        value[k] = bufferStringOrValue(value[k]);
      }
    }
    return bufferStringOrValue(value);
  }, 2);
}

module.exports = function (app) {
  // this checks for ?debug and then creates a new logger that will pick up
  // logging information for this particular request
  //
  // we do not use app.log since we do not want to get data from requests going
  // on at the same time as this request
  return function forwardedDebugger(req, res, next) {
    var logger = app.log;
    if (DEBUG_PATTERN.test(req.query.debug)) {
      logger = Object.create(logger);
      var _write = res.write;
      var _end = res.end;
      var content = [];
      res.write = function () {
        content.push({
          type: 'write',
          arguments: arguments
        });
      };
      res.end = function () {
        res.write.apply(this, arguments);
        content.push({
          type: 'end',
          headers: res._headers
        });

        var body = stringify(content);
        res.setHeader('content-type', 'application/json');
        res.setHeader('content-length', Buffer.byteLength(body));
        res.setHeader('content-encoding', 'identity');
        _write.call(res, body);
        return _end.apply(res);
      };
      Object.keys(app.log.levels).forEach(function (level) {
        logger[level] = function debugLevel() {
          content.push({
            type: 'log',
            level: level,
            arguments: arguments
          });
          return app.log[level].apply(app.log, arguments);
        };
      });
    }
    req.log = logger;
    res.log = logger;
    next();
  };
};
