const fp = require('fastify-plugin');

module.exports = fp(
  /**
   * Initialize config
   * @param {import('fastify').FastifyInstance} fastify
   * @param {import('fastify').FastifyPluginOptions} opts
   * @returns {Promise<void>} Promise representing initialization result
   */
  async function (fastify, opts = {}) {
    /* eslint-disable no-process-env */
    const config = {
      port: process.env.PORT || 8088,
      cdnBaseUrl:
        process.env.CDN_BASE_URL || opts.cdnBaseUrl || 'http://localhost:8088',
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
