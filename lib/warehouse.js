const fastifyAuth = require('fastify-auth');
const AutoLoad = require('fastify-autoload');
const fp = require('fastify-plugin');
const path = require('path');

module.exports = fp(async function (fastify) {
  fastify.register(fastifyAuth);

  fastify.after(() => {
    if (!fastify.verifyAuthentication) {
      throw new Error('Fastify must be decorated with method verifyAuthentication');
    }

    fastify.register(AutoLoad, {
      dir: path.join(__dirname, 'plugins')
    });

    fastify.register(AutoLoad, {
      dir: path.join(__dirname, 'routes')
    });
  });
});
