const createFastify = require('fastify');
const AutoLoad = require('fastify-autoload');
const path = require('path');
const pino = require('pino');

function setup(fastify) {
  fastify.register(require('fastify-auth'));

  fastify.after(() => {
    fastify.register(AutoLoad, {
      dir: path.join(__dirname, 'plugins')
    });

    fastify.register(AutoLoad, {
      dir: path.join(__dirname, 'routes')
    });
  });

  return fastify;
}

if (require.main === module) {
  const log = pino({ level: 'info' });
  const fastify = createFastify({ logger: log });

  fastify.decorate('verifyAuthentication', function (request, reply, done) {
    done();
  });

  setup(fastify);

  // eslint-disable-next-line no-process-env
  fastify.listen(process.env.PORT, err => {
    if (err) throw err;
  });
}

module.exports = setup;
