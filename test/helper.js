const createFastify = require('fastify');
const fp = require('fastify-plugin');
const warehouse = require('../lib/warehouse');

function build(t) {
  const fastify = createFastify({
    logger: {
      level: 'debug',
      prettyPrint: true
    }
  });
  fastify.decorate('verifyAuthentication', async function () {});
  // Expose all decorators for testing purposes
  fastify.register(fp(warehouse), { useLocalstack: true });
  t.tearDown(fastify.close.bind(fastify));
  return fastify;
}

module.exports = {
  build
};
