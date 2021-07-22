const fp = require('fastify-plugin');
const { DynamoDB, S3 } = require('aws-sdk');

/**
 * @typedef {import('fastify').FastifyInstance} FastifyInstance
 */

module.exports = fp(
  /**
   * Initialize AWS plugin
   *
   * @param {FastifyInstance} fastify Fastify instance
   * @returns {Promise<void>} Promise representing plugin initialization result
   */
  async function (fastify) {
    const dynamo = new DynamoDB.DocumentClient(fastify.config.dynamo);
    fastify.decorate('dynamo', dynamo);

    const s3 = new S3(fastify.config.s3);
    fastify.decorate('s3', s3);
  },
  {
    fastify: '3.x',
    name: 'aws',
    decorators: {
      fastify: ['config']
    },
    dependencies: ['config']
  }
);
