const createFastify = require('fastify');
const pino = require('pino');
const warehouse = require('./warehouse');

if (require.main === module) {
  const log = pino({ level: 'info' });
  const fastify = createFastify({ logger: log });

  // Optional authentication on Warehouse protected routes
  fastify.decorate('verifyAuthentication', (request, reply, done) => {
    // Implement auth strategy here
    done();
  });

  fastify.register(warehouse);

  // eslint-disable-next-line no-process-env
  fastify.listen(process.env.PORT, err => {
    if (err) throw err;
  });
}

module.exports = warehouse;
