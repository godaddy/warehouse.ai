const fp = require('fastify-plugin');

module.exports = fp(async function (fastify) {
  /* eslint-disable no-process-env */
  fastify.decorate('config', {
    port: process.env.PORT || 6666
  });
  /* eslint-enable no-process-env */
});
