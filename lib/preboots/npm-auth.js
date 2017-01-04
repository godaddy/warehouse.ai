'use strict';

const passport = require('passport');
const NPMStrategy = require('passport-npm').NPMStrategy;
const NPMStrategyErrorHandler = require('passport-npm').NPMStrategyErrorHandler;
const initializer = passport.initialize();

module.exports = function (app, options, done) {
  if (!app.config.get('npm:auth-argument-factory')) {
    app.log.warn('Running without NPM authentication');
    done();
    return;
  }
  passport.use('npm', new NPMStrategy(
    // note: this registers /-/user/org.couchdb.user:*
    Object.assign(
      Object.create(null),
      require(app.config.get('npm:auth-argument-factory'))
        .createPassportNPMOptions(),
      { router: app.routes })
  ));
  const authenticator = passport.authenticate('npm', {
    // npm client doesn't have compatible sessions with PassportJS
    // - does not use a cookie
    // - uses bearer tokens and basic auth via HTTP authorization header
    session: false,
    // npm client doesn't have compatible response parsing with PassportJS
    failWithError: true
  });
  // call passport initializer
  // if error, pass the error on
  // call strategy.authenticate
  // if error, reply w/ something `npm` CLI can consume
  app.npmAuthMiddleware = (req, res, next) => {
    // manually call passport initialize in slightly special way
    initializer(req, res, passportInitErr => {
      if (passportInitErr) return void next(passportInitErr);
      authenticator(req, res, authError => {
        // function to send back responses that npm client understands
        if (!authError) return void next(null);
        NPMStrategyErrorHandler(authError, req, res, next);
      });
    });
  }


  done();
};
