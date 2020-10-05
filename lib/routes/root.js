module.exports = async function (fastify) {
  fastify.get('/', async function (request, reply) {
    reply.send(fastify.someSupport());
  });
};
