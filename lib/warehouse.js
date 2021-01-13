const fastifyAuth = require('fastify-auth');
const AutoLoad = require('fastify-autoload');
const fp = require('fastify-plugin');
const fastifySensible = require('fastify-sensible');
const path = require('path');

const config = require('./config');

/**
 * @typedef {Object} WarehouseExtension
 * @property {import('aws-sdk').DynamoDB.DocumentClient} [dynamo]
 * @property {import('aws-sdk').S3} [s3]
 *
 * @typedef {import('fastify').FastifyInstance & WarehouseExtension} WarehouseApp
 */

module.exports = fp(
  /**
   * Initialize Warehouse
   * @param {import('fastify').FastifyInstance} fastify
   * @param {import('fastify').FastifyPluginOptions} opts
   * @returns {Promise<void>} Promise representing initialization result
   */
  async function (fastify, opts) {
    // Catch all ContentType Parser
    fastify.addContentTypeParser('*', (req, res, done) => done());

    fastify.register(config, opts);
    fastify.register(fastifyAuth, opts);
    fastify.register(fastifySensible, opts);

    await fastify.after();

    return Promise.all([
      fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'plugins'),
        options: opts
      }),
      fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'routes'),
        options: opts
      })
    ]);
  },
  {
    fastify: '3.x',
    decorators: {
      fastify: ['verifyAuthentication']
    }
  }
);
