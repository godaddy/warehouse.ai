const fp = require('fastify-plugin');

module.exports = fp(
  async function (fastify) {
    /* eslint-disable no-process-env */
    const config = {
      port: process.env.PORT || 8088,
      cdnBaseUrl: process.env.CDN_BASE_URL || 'http://localhost:8088',
      dynamo: {},
      s3: {}
    };

    const localstack = process.env.LOCALSTACK || 0;
    if (localstack) {
      const endpoint =
        process.env.LOCALSTACK_STS_URL || 'http://localhost:4566';
      const region = process.env.AWS_REGION || 'us-west-2';
      config.dynamo = { endpoint, region };
      config.s3 = { endpoint, region, s3ForcePathStyle: true };
    }

    fastify.decorate('config', config);
    /* eslint-enable no-process-env */
  },
  {
    fastify: '3.x',
    name: 'config'
  }
);
