'use strict';

module.exports = function (app, options, next) {
  app.perform('actions', function (done) {
    //
    // Setup our known param handlers for parameter names.
    //
    require('./params')(app.routes);
    require('./assets')(app);
    require('./builds')(app);
    require('./checks')(app);
    require('./packages')(app);
    require('../npm/routes')(app);
    done();
  });

  next();
};
