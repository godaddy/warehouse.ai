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
      url: '/objects/:name/envs',
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

          return fastify.getEnvs({ name });
        }
    });

    fastify.route({
      method: 'GET',
      url: '/objects/:name/envs/:env',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            env: { type: 'string' }
          }
        },
        response: {
          200: {
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
      },
      handler:
        /**
         * @type {FastifyHandler}
         */
        // eslint-disable-next-line no-unused-vars
        async (req, res) => {
          const {
            params: { name, env: envOrAlias }
          } = req;

          const envAlias = await fastify.getEnvAlias({
            name,
            alias: envOrAlias
          });
          if (!envAlias) {
            throw fastify.httpErrors.notFound('Environment not found');
          }

          return fastify.getEnv({ name, env: envAlias.env });
        }
    });

    fastify.route({
      method: 'POST',
      url: '/objects/:name/envs',
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
            body: { env: envOrAlias }
          } = req;

          const existingEnv = await fastify.getEnvAlias({
            name,
            alias: envOrAlias
          });
          if (existingEnv) {
            throw fastify.httpErrors.conflict('Environment already exists');
          }

          await fastify.createEnv({
            name,
            env: envOrAlias
          });

          if (fastify.log.security) {
            fastify.log.security({
              success: true,
              message: `Environment "${envOrAlias}" sucessfully created for object "${name}"`,
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
          res.status(201).send({ created: true });
        }
    });

    fastify.route({
      method: 'POST',
      url: '/objects/:name/envs/:env/aliases',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            env: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['alias'],
          properties: {
            alias: { type: 'string' }
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
            params: { name, env: envOrAlias },
            body: { alias }
          } = req;

          const existingEnv = await fastify.getEnvAlias({
            name,
            alias: envOrAlias
          });
          if (!existingEnv) {
            throw fastify.httpErrors.notFound('Environment not found');
          }

          const existingAlias = await fastify.getEnvAlias({ name, alias });
          if (existingAlias) {
            throw fastify.httpErrors.conflict(
              'Environment alias already exists'
            );
          }

          await fastify.createEnvAlias({
            name,
            env: existingEnv.env,
            alias
          });

          if (fastify.log.security) {
            fastify.log.security({
              success: true,
              message: `Alias "${alias}" sucessfully created for object "${name}" and environment "${existingEnv.env}"`,
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
          res.status(201).send({ created: true });
        }
    });
  };
