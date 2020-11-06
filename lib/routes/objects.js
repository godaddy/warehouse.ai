module.exports = async function (fastify) {
  fastify.route({
    method: 'GET',
    url: '/objects/:name',
    preHandler: fastify.auth([
      fastify.verifyAuthentication
    ]),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          accepted_variants: { type: 'string' },
          version: { type: 'string' },
          env: { type: 'string' }
        }
      }
    },
    handler: (req, res) => {
      req.log.info('Objects API hit!');
      res.send({ objects: true });
    }
  });

  fastify.route({
    method: 'POST',
    url: '/objects',
    preHandler: fastify.auth([
      fastify.verifyAuthentication
    ]),
    schema: {
      body: {
        type: 'object',
        required: ['accepted_variants', 'version', 'env', 'data'],
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          env: { type: 'string' },
          variant: { type: 'string' },
          expiration: { type: ['string', 'number'] },
          data: { type: ['object', 'string'] }
        }
      }
    },
    handler: (req, res) => {
      req.log.info('Objects API hit!');
      res.send({ objects: true });
    }
  });
};
