module.exports = async function (fastify) {
  fastify.route({
    method: 'GET',
    url: '/objects/:name',
    preHandler: fastify.auth([fastify.verifyAuthentication]),
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
    handler: async (req, res) => {
      const {
        params: { name },
        query: {
          version: v,
          accepted_variants: acceptedVariants,
          env = 'producton'
        }
      } = req;

      const variants = acceptedVariants
        ? acceptedVariants
          .split(',')
          .map((variant) => variant.trim())
          .filter((variant) => variant !== '')
        : null;

      let version = v;
      if (!version) {
        const obj = await fastify.getObject({ name, env });
        if (!obj) {
          throw fastify.httpErrors.notFound();
        }
        version = obj.latestVersion;
      }

      let objectVariants;
      if (!variants) {
        objectVariants = await fastify.getAllObjectVariants({
          name,
          env,
          version
        });
      } else {
        objectVariants = await fastify.getObjectVariants({
          name,
          env,
          version,
          variants
        });
      }

      res.send(objectVariants);
    }
  });

  fastify.route({
    method: 'POST',
    url: '/objects',
    preHandler: fastify.auth([fastify.verifyAuthentication]),
    schema: {
      body: {
        type: 'object',
        required: ['name', 'version', 'env', 'data'],
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
      res.send({ post: true });
    }
  });

  fastify.route({
    method: 'DELETE',
    url: '/objects/:name/:env',
    preHandler: fastify.auth([fastify.verifyAuthentication]),
    handler: (req, res) => {
      req.log.info('Objects API hit!');
      res.send({ delete: true });
    }
  });

  fastify.route({
    method: 'DELETE',
    url: '/objects/:name/:env/:version',
    preHandler: fastify.auth([fastify.verifyAuthentication]),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          variant: { type: 'string' }
        }
      }
    },
    handler: (req, res) => {
      req.log.info('Objects API hit!');
      res.send({ deleteAgain: true });
    }
  });

  fastify.route({
    method: 'PUT',
    url: '/objects/:name/:env',
    preHandler: fastify.auth([fastify.verifyAuthentication]),
    schema: {
      body: {
        type: 'object',
        required: ['head'],
        properties: {
          head: { type: 'string' }
        }
      }
    },
    handler: (req, res) => {
      req.log.info('Objects API hit!');
      res.send({ put: true });
    }
  });
};
