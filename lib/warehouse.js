const fastifyAuth = require('fastify-auth');
const AutoLoad = require('fastify-autoload');
const fp = require('fastify-plugin');
const fastifySensible = require('fastify-sensible');
const etag = require('fastify-etag');
const path = require('path');

const config = require('./config');

/**
 * @typedef {import('aws-sdk').DynamoDB.DocumentClient} DocumentClient
 * @typedef {import('aws-sdk').S3} S3
 * @typedef {import('fastify').FastifyInstance} FastifyInstance
 * @typedef {import('fastify').FastifyPluginOptions} FastifyPluginOptions
 * @typedef {import('pino').Logger} PinoLogger
 */

/**
 * @typedef {Object} SecurityLogFnOpts
 * @prop {string} [message] Log message
 * @prop {boolean} success Whether the security operation succeeded
 * @prop {string} [category] Security operation category
 * @prop {string[]} [type] Security operation type
 * @prop {string} [host] Host from the request
 * @prop {string} [method] HTTP method from the request
 * @prop {string} [url] URL from the request,
 * @prop {string} [sourceAddress] Source IP address of the request
 * @prop {string} [requestId] Unique identifier for the request
 */

/**
 * @callback SecurityLogFn
 * @param {SecurityLogFnOpts} opts Options
 */

/**
 * @typedef {Object} SecurityLogger
 * @prop {SecurityLogFn} [security] Security logging function
 * @typedef {PinoLogger & SecurityLogger} WarehouseLogger
 */

/**
 * @typedef {Object} WarehouseExtension
 * @property {DocumentClient} [dynamo]
 * @property {S3} [s3]
 * @property {WarehouseLogger} log
 *
 * @typedef {FastifyInstance & WarehouseExtension} WarehouseApp
 */

module.exports = fp(
  /**
   * Initialize Warehouse
   *
   * @param {FastifyInstance} fastify Fastify instance
   * @param {FastifyPluginOptions} opts Fastify options
   * @returns {Promise<void>} Promise representing initialization result
   */
  async function (fastify, opts) {
    // Catch all ContentType Parser
    fastify.addContentTypeParser('*', (req, res, done) => done());

    fastify.register(config, opts);
    fastify.register(fastifyAuth, opts);
    fastify.register(fastifySensible, opts);

    // Automatically calculate and return response etag
    // and return 304 status if-none-match condition fulfil
    fastify.register(etag, { algorithm: 'fnv1a' });

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
