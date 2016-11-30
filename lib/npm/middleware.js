'use strict';

/*
 * function middleware (app)
 * Returns the middleware for npm publish
 * to be used in the app.
 */
module.exports = function (app) {
  app.publisher.error = app.middlewares.error;

  return app.publisher.dispatch.bind(app.publisher);
};
