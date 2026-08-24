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

    // LocalStack 1.4.0 returns unparseable Date headers on S3 responses. SDK v3
    // reads that header to correct its clock offset; if it's invalid the offset
    // becomes NaN, which then causes the next request's SigV4 signing to throw
    // "Invalid time value". Strip any invalid Date header before the SDK sees it.
    if (fastify.config.s3.endpoint) {
      s3.middlewareStack.add(
        (next) => async (args) => {
          const result = await next(args); // eslint-disable-line callback-return
          const date = result.response?.headers?.date;
          if (date && isNaN(new Date(date).getTime())) {
            delete result.response.headers.date;
          }
          return result;
        },
        { step: 'deserialize', priority: 'low', name: 'fixLocalstackDateHeader' }
      );
    }

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
