const fp = require('fastify-plugin');
const { DynamoDB, S3 } = require('aws-sdk');

module.exports = fp(
  async function (fastify) {
    const dynamo = new DynamoDB.DocumentClient(fastify.config.dynamo);
    fastify.decorate('dynamo', dynamo);

    const s3 = new S3(fastify.config.s3);
    fastify.decorate('s3', s3);
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
