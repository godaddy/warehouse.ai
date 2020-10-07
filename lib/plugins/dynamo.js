const fp = require('fastify-plugin');

module.exports = fp(async function (fastify) {
  // TODO(jdaeli): create an AWS.DynamoDB instance.
  const dynamo = {};
  fastify.decorate('dynamo', dynamo);
});
