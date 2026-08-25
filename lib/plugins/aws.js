const fp = require('fastify-plugin');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');

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
    const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(fastify.config.dynamo));
    fastify.decorate('dynamo', dynamo);

    const s3 = new S3Client(fastify.config.s3);
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
