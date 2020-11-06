const fp = require('fastify-plugin');

module.exports = fp(
  async function (fastify) {
    /* eslint-disable no-process-env */
    fastify.decorate('config', {
      port: process.env.PORT || 6666,
      dynamo: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID, // optional
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // optional
        region: process.env.AWS_REGION || 'us-west-2'
      }
    });
    /* eslint-enable no-process-env */
  },
  {
    fastify: '3.x',
    name: 'config'
  }
);
