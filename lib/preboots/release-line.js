const ReleaseLine = require('@wrhs/release-line');

module.exports = function (app, options, done) {
  const { models } = app;
  app.release = new ReleaseLine({ models });
  done();
};
