const debra = require('debra');
const json = require('morgan-json');

const healthcheck = /healthcheck/;

debra.token('env', req => req.params.env);
debra.token('pkg', req => req.params.pkg);
debra.token('version', req => req.params.version);
debra.token('hash', req => req.params.hash);

const format = json({
  'request': ':method :url HTTP/:http-version :status',
  'remote': ':remote-addr - :remote-user',
  'date': ':date[clf]',
  'referrer': ':referrer',
  'user-agent': ':user-agent',
  'env': ':env',
  'pkg': ':pkg',
  'version': ':version',
  'hash': ':hash'
}, { stringify: false });

/**
 * Creates a slightly more sophisticated debra wrapper
 * that reduces noise from `healthcheck.html` routes.
 * @param  {slay.App} app Slay app to log to.
 * @returns {function} express middleware to use.
 */
module.exports = function createLogger(app) {
  let rid = 0;
  const logger = debra(format, {
    objectMode: true,
    stream: {
      write: function (meta) {
        app.log.info('Request served for wrhs', meta);
      }
    }
  });

  return function debraLogger(req, res, next) {
    //
    // Reduce healthcheck logs as it creates unnecessary noise
    //
    if (healthcheck.test(req.url) && rid++ % 50 !== 0) return next();
    logger(req, res, next);
  };
};
