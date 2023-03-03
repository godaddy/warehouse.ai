/**
 * @typedef {import('fastify').FastifyRequest} FastifyRequest
 * @typedef {import('fastify').FastifyReply} FastifyReply
 * @typedef {import('../warehouse').WarehouseApp} WarehouseApp
 */

/**
 * HTTP Request Handler
 *
 * @callback FastifyHandler
 * @param {FastifyRequest} req Fastify request object
 * @param {FastifyReply} res Fastify response object
 */

module.exports =
  /**
   * Initialize hook routes
   *
   * @param {WarehouseApp} fastify Warehouse app instance
   * @returns {Promise<void>} Promise representing routes initialization result
   */
  async function (fastify) {
    fastify.route({
      method: 'GET',
      url: '/objects/:name/hooks',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                url: { type: 'string', format: 'uri' }
              }
            }
          }
        }
      },
      handler:
        /**
         * @type {FastifyHandler}
         */
        // eslint-disable-next-line no-unused-vars
        async (req, res) => {
          const {
            params: { name }
          } = req;

          return fastify.getHooks({ name });
        }
    });

    fastify.route({
      method: 'GET',
      url: '/objects/:name/hooks/:id',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              url: { type: 'string', format: 'uri' }
            }
          }
        }
      },
      handler:
        /**
         * @type {FastifyHandler}
         */
        // eslint-disable-next-line no-unused-vars
        async (req, res) => {
          const {
            params: { name, id }
          } = req;

          const hook = await fastify.getHook({ name, id });
          if (!hook) {
            throw fastify.httpErrors.notFound(
              `Hook '${id}' not found for object '${name}'`
            );
          }

          return hook;
        }
    });

    fastify.route({
      method: 'POST',
      url: '/objects/:name/hooks',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', format: 'uri' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      handler:
        /**
         * @type {FastifyHandler}
         */
        async (req, res) => {
          const {
            params: { name },
            body: { url }
          } = req;

          const hookId = await fastify.createHook({
            name,
            url
          });

          if (fastify.log.security) {
            fastify.log.security({
              success: true,
              message: `Hook "${hookId}" sucessfully created for object "${name}"`,
              category: 'database',
              type: ['creation', 'allowed'],
              method: req.method,
              url: req.url,
              requestId: req.id,
              sourceAddress: req.ip,
              host: req.hostname
            });
          }

          res.header('Cache-Control', 'no-storage');
          res.status(201).send({ id: hookId });
        }
    });

    fastify.route({
      method: 'DELETE',
      url: '/objects/:name/hooks/:id',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          204: {}
        }
      },
      handler:
        /**
         * @type {FastifyHandler}
         */
        async (req, res) => {
          const {
            params: { name, id }
          } = req;

          const hook = await fastify.getHook({ name, id });
          if (!hook) {
            throw fastify.httpErrors.notFound(
              `Hook '${id}' not found for object '${name}'`
            );
          }

          await fastify.deleteHook({ name, id });

          if (fastify.log.security) {
            fastify.log.security({
              success: true,
              message: `Hook "${id}" sucessfully deleted for object "${name}"`,
              category: 'database',
              type: ['deletion', 'allowed'],
              method: req.method,
              url: req.url,
              requestId: req.id,
              sourceAddress: req.ip,
              host: req.hostname
            });
          }

          res.header('Cache-Control', 'no-storage');
          res.status(204);
        }
    });
  };
