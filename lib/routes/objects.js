module.exports = async function (fastify) {
  fastify.route({
    method: 'GET',
    url: '/objects',
    preHandler: fastify.auth([
      fastify.verifyAuthentication
    ]),
    handler: (req, res) => {
      req.log.info('Objects API hit!');
      res.send({ objects: true });
    }
  });
};
