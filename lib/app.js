require('dotenv').config();

const createFastify = require('fastify');
const pino = require('pino');
const warehouse = require('./warehouse');

if (require.main === module) {
  const log = pino({ level: 'info' });
  const fastify = createFastify({ logger: log });

  const main = async () => {
    await fastify.decorate('verifyAuthentication', async function () {});
    await fastify.register(warehouse);
    await fastify.ready();
    return fastify.listen(fastify.config.port);
  };

  main().catch(function (err) {
    fastify.log.error('Error starting server:', err);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
}

module.exports = warehouse;
