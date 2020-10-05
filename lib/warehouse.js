const fastifyAuth = require('fastify-auth');
const AutoLoad = require('fastify-autoload');
const fp = require('fastify-plugin');
const path = require('path');

module.exports = fp(
  async function (fastify) {
    fastify.register(fastifyAuth);

    fastify.after(() => {
      fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'plugins')
      });

      fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'routes')
      });
    });
  },
  {
    fastify: '3.x',
    decorators: {
      fastify: ['verifyAuthentication']
    }
  }
);
