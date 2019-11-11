'use strict';

var { DynamoDB } = require('aws-sdk');
var dynamo = require('dynamodb-x');
var AwsLiveness = require('aws-liveness');
var wrhs = require('warehouse-models');


/**
 * @function models
 *  @param {slay.App} app - the global app instance
 *  @param {Object} options - for extra configurability
 *  @param {function} done - continuation when preboot is finished
 * Attaches all models to the `app` instance as `app.models`.
 * @returns {undefined}
 */
module.exports = function models(app, options, done) {
  //
  // Get the regular config unless we are in prod where it doesnt exist
  //
  const ensure = app.config.get('ensure') || options.ensure;
  const dynamoDriver = new DynamoDB(app.config.get('database'));

  dynamo.dynamoDriver(dynamoDriver);
  app.models = wrhs(dynamo);
  app.database = dynamo;

  new AwsLiveness().waitForServices({
    clients: [dynamoDriver],
    waitSeconds: 60
  }).then(function () {
    if (!ensure) return done();
    app.models.ensure(done);
  }).catch(done);
};
