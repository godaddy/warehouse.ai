const fp = require('fastify-plugin');

module.exports = fp(
  async function (fastify) {
    /* eslint-disable no-process-env */
    const config = {
      port: process.env.PORT || 8088,
      dynamo: {}
    };

    const localstack = process.env.LOCALSTACK || 0;
    if (localstack) {
      config.dynamo = {
        endpoint: process.env.LOCALSTACK_STS_URL || 'http://localhost:4566',
        region: process.env.AWS_REGION || 'us-west-2'
      };
    }

    fastify.decorate('config', config);
    /* eslint-enable no-process-env */
  },
  {
    fastify: '3.x',
    name: 'config'
  }
);
