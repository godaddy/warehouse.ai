const createFastify = require('fastify');
const AutoLoad = require('fastify-autoload');
const path = require('path');
const pino = require('pino');

function build(opts) {
  const fastify = createFastify(opts);

  fastify.register(require('fastify-auth'));

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  });

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  });

  return fastify;
}

if (require.main === module) {
  const log = pino({ level: 'info' });
  const fastify = build({ logger: log });
  fastify.decorate('verifyAuthentication', function (request, reply, done) {
    done();
  });
  // eslint-disable-next-line no-process-env
  fastify.listen(process.env.PORT, err => {
    if (err) throw err;
  });
}

module.exports = build;
