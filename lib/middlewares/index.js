const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('access-control');
const debugParam = require('./debug');

module.exports = function (app, options, done) {
  const authMiddleware = app.authboot && app.authboot.middleware || function (req, res, next) { next(); };

  const authMiddlewareWithLogging = function (req, res, next) {
    authMiddleware(req, res, function (err) {
      if (err) {
        app.securityLog({
          message: 'Authentication failed: ' + err.message,
          category: 'authentication',
          type: ['access', 'denied'],
          success: false,
          req,
          res
        });
      } else {
        app.securityLog({
          message: 'Request sucessfully authenticated',
          category: 'authentication',
          type: ['access', 'allowed'],
          success: true,
          req,
          res
        });
      }
      return next(err);
    });
  };

  //
  // Set some known middlewares on the app so that
  // we can use them in various stacks.
  //
  var middlewares = app.middlewares = {
    error: require('./error')(app),
    auth: authMiddlewareWithLogging
  };

  app.log.verbose('Adding standard middlewares');

  app.use(debugParam(app));

  //
  // Enable CORS based on configuration.
  //
  app.use(cors(app.config.get('cors')));

  app.use(cookieParser());

  //
  // This needs to be a separate middleware because it is streamed
  // vs. a buffered and parsed JSON blob.
  //
  middlewares['npm-publish'] = require('../npm/middleware')(app);
  app.use(middlewares['npm-publish']);

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({
    strict: false,
    type: function (req) {
      var header = req.headers['content-type'];
      if (!header) { return false; }

      var index = header.indexOf(';');
      var type = index !== -1
        ? header.substr(0, index).trim()
        : header.trim();

      return type === 'text/plain' || type === 'application/json';
    }
  }));

  app.use(require('./debra')(app));

  //
  // After actions have been defined, we can add
  // our error case middlewares to be called AFTER
  // core routing.
  //
  app.after('actions', function () {
    app.log.verbose('Adding post-routing middlewares');

    //
    // Before we let our 404 logic kick in. Attempt
    // to see if the current request can be directly
    // proxied to npm.
    //
    app.use(middlewares.auth, app.npmProxy.bind(app));
    app.use(app.middlewares.error);
  });

  done();
};
