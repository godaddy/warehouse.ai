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
   * Initialize Env routes
   *
   * @param {WarehouseApp} fastify Warehouse app instance
   * @returns {Promise<void>} Promise representing routes initialization result
   */
  async function (fastify) {
    fastify.route({
      method: 'GET',
      url: '/envs/:name',
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
                name: { type: 'string' },
                env: { type: 'string' },
                aliases: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
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

          const envs = fastify.getEnvs({ name });
          return envs;
        }
    });

    fastify.route({
      method: 'POST',
      url: '/envs/:name',
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
          required: ['env'],
          properties: {
            env: { type: 'string' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              created: { type: 'boolean' }
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
            body: { env }
          } = req;

          await fastify.createEnv({
            name,
            env
          });

          if (fastify.log.security) {
            fastify.log.security({
              success: true,
              message: `Enviroment "${env}" sucessfully created for object "${name}"`,
              // eslint-disable-next-line max-len
              category: 'database', // see https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-category.html#ecs-event-category-database
              // eslint-disable-next-line max-len
              type: ['creation', 'allowed'], // see https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-type.html#ecs-event-type-creation
              method: req.method,
              url: req.url,
              requestId: req.id,
              sourceAddress: req.ip,
              host: req.hostname
            });
          }

          res.header('Cache-Control', 'no-storage');
          res.status(201).send({ created: true });
        }
    });
  };
