const fp = require('fastify-plugin');

module.exports = fp(async function (fastify) {
  fastify.decorate('someSupport', function () {
    return 'hugs';
  });
});
