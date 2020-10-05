module.exports = async function (fastify) {
  fastify.get('/cdn', async function (request, reply) {
    return reply.send({ cnd: true });
  });
};
