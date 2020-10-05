module.exports = async function (fastify) {
  fastify.route({
    method: 'GET',
    url: '/objects',
    preHandler: fastify.auth([
      fastify.verifyAuthentication
    ]),
    handler: (req, reply) => {
      req.log.info('Objects API hit!');
      reply.send({ objects: fastify.someSupport() });
    }
  });
};
