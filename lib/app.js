require('dotenv').config();

const createFastify = require('fastify');
const fastifySwagger = require('fastify-swagger');
const pino = require('pino');
const swaggerOpts = require('./swagger');
const warehouse = require('./warehouse');

if (require.main === module) {
  const log = pino({ level: 'info' });
  const fastify = createFastify({ logger: log });

  const main = async () => {
    fastify.decorate('verifyAuthentication', async function () {});
    fastify.register(fastifySwagger, {
      routePrefix: '/docs',
      swagger: swaggerOpts,
      exposeRoute: true
    });
    fastify.register(warehouse);
    await fastify.ready();
    return fastify.listen(fastify.config.port, '0.0.0.0');
  };

  main().catch(function (err) {
    fastify.log.error('Error starting server');
    fastify.log.error(err);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
}

module.exports = warehouse;
