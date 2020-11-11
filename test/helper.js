const createFastify = require('fastify');
const warehouse = require('../lib/app');

function build(t) {
  const fastify = createFastify({ logger: 'info' });
  fastify.decorate('verifyAuthentication', async function () {});
  fastify.register(warehouse);
  t.tearDown(fastify.close.bind(fastify));
  return fastify;
}

module.exports = {
  build
};
