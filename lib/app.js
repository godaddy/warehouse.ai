const createFastify = require('fastify');
const pino = require('pino');
const warehouse = require('./warehouse');

if (require.main === module) {
  const log = pino({ level: 'info' });
  const fastify = createFastify({ logger: log });

  fastify.decorate('verifyAuthentication', () => {});

  fastify.register(warehouse);

  fastify.ready(() => {
    fastify.listen(fastify.config.port, err => {
      if (err) throw err;
    });
  });
}

module.exports = warehouse;
