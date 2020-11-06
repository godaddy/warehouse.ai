const fp = require('fastify-plugin');
const { DynamoDB } = require('aws-sdk');

module.exports = fp(
  async function (fastify) {
    const dynamo = new DynamoDB.DocumentClient(fastify.config.dynamo);
    fastify.decorate('dynamo', dynamo);
  },
  {
    fastify: '3.x',
    name: 'dynamo',
    decorators: {
      fastify: ['config']
    },
    dependencies: ['config']
  }
);
