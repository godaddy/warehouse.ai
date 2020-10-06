const fastifyAuth = require('fastify-auth');
const AutoLoad = require('fastify-autoload');
const fp = require('fastify-plugin');
const path = require('path');

const config = require('./config');

module.exports = fp(
  async function (fastify) {
    await Promise.all([
      fastify.register(config),
      fastify.register(fastifyAuth)
    ]);

    await fastify.after();

    return Promise.all([
      fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'plugins')
      }),
      fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'routes')
      })
    ]);
  },
  {
    fastify: '3.x',
    decorators: {
      fastify: ['verifyAuthentication']
    }
  }
);
