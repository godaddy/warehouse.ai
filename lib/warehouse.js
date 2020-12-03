const fastifyAuth = require('fastify-auth');
const AutoLoad = require('fastify-autoload');
const fp = require('fastify-plugin');
const fastifySensible = require('fastify-sensible');
const fastifySwagger = require('fastify-swagger');
const path = require('path');

const config = require('./config');
const swaggerOpts = require('./swagger');

module.exports = fp(
  async function (fastify) {
    // Catch all ContentType Parser
    fastify.addContentTypeParser('*', (req, res, done) => done());

    fastify.register(fastifySwagger, {
      routePrefix: '/docs',
      swagger: swaggerOpts,
      exposeRoute: true
    });

    await Promise.all([
      fastify.register(config),
      fastify.register(fastifyAuth),
      fastify.register(fastifySensible)
    ]);

    await fastify.after();

    await Promise.all([
      fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'plugins')
      }),
      fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'routes')
      })
    ]);

    fastify.swagger();
  },
  {
    fastify: '3.x',
    decorators: {
      fastify: ['verifyAuthentication']
    }
  }
);
