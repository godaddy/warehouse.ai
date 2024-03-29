const fp = require('fastify-plugin');

/**
 * @typedef {import('fastify').FastifyInstance} FastifyInstance
 * @typedef {import('fastify').FastifyPluginOptions} FastifyPluginOptions
 */

const DEFAULT_CDN_BASE_URL = 'http://localhost:8088';
const DEFAULT_CDN_S3_BUCKET = 'warehouse-cdn';

module.exports = fp(
  /**
   * Initialize config
   *
   * @param {FastifyInstance} fastify Fastify instance
   * @param {FastifyPluginOptions} opts Fastify options
   * @returns {Promise<void>} Promise representing initialization result
   */
  async function (fastify, opts = {}) {
    /* eslint-disable no-process-env */
    const config = {
      port: process.env.PORT || 8088,
      cdnBaseUrl:
        process.env.CDN_BASE_URL || opts.cdnBaseUrl || DEFAULT_CDN_BASE_URL,
      cdnS3Bucket:
        process.env.CDN_S3_BUCKET || opts.cdnS3Bucket || DEFAULT_CDN_S3_BUCKET,
      dynamo: {},
      s3: {}
    };

    const localstack = process.env.LOCALSTACK || 0;
    if (localstack || opts.useLocalstack) {
      const endpoint = process.env.LOCALSTACK_URL || 'http://localhost:4566';
      const region = process.env.AWS_REGION || 'us-west-2';
      const credentials = { accessKeyId: 'foo', secretAccessKey: 'bar' };
      config.dynamo = { endpoint, region, credentials };
      config.s3 = { endpoint, region, credentials, s3ForcePathStyle: true };
    }

    fastify.decorate('config', config);
    /* eslint-enable no-process-env */
  },
  {
    fastify: '3.x',
    name: 'config'
  }
);
