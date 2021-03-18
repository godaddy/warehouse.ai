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
   * Initialize Object routes
   *
   * @param {WarehouseApp} fastify Warehouse app instance
   * @returns {Promise<void>} Promise representing routes initialization result
   */
  async function (fastify) {
    fastify.route({
      method: 'GET',
      url: '/objects/:name',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            accepted_variants: { type: 'string' },
            version: { type: 'string' },
            env: { type: 'string' }
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
                version: { type: 'string' },
                data: {
                  type: ['string', 'object'],
                  additionalProperties: true
                },
                variant: { type: 'string' }
              }
            }
          }
        }
      },
      handler:
        /**
         * @type {FastifyHandler}
         */
        // eslint-disable-next-line max-statements
        async (req, res) => {
          const {
            params: { name },
            query: {
              version: v,
              accepted_variants: acceptedVariants,
              env = 'production'
            }
          } = req;

          let version = v;
          if (!version) {
            const obj = await fastify.getObject({ name, env });
            if (!obj) {
              throw fastify.httpErrors.notFound(
                `Object '${name}' not found in '${env}'`
              );
            }
            version = obj.latestVersion;
          } else {
            const objVersions = await fastify.getAllObjectVersions({
              name,
              env
            });
            if (!objVersions.includes(version)) {
              throw fastify.httpErrors.notFound(
                `Version ${version} not found in '${env}'`
              );
            }
          }

          const variants = acceptedVariants
            ? acceptedVariants
                .split(',')
                .map((variant) => variant.trim())
                .filter((variant) => variant !== '')
            : null;

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
      method: 'GET',
      url: '/head/:name/:env',
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
              headVersion: { type: ['string', 'null'] },
              latestVersion: { type: 'string' }
            }
          }
        }
      },
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      handler:
        /**
         * @type {FastifyHandler}
         */
        async (req, res) => {
          const {
            params: { name, env }
          } = req;
          const obj = await fastify.getObject({ name, env });
          if (!obj) {
            throw fastify.httpErrors.notFound(
              `Object '${name}' not found in '${env}'`
            );
          }

          const { headVersion, latestVersion } = obj;
          res.send({
            headVersion,
            latestVersion
          });
        }
    });

    fastify.route({
      method: 'POST',
      url: '/objects',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        body: {
          type: 'object',
          required: ['name', 'version', 'data'],
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            env: { type: 'string' },
            variant: { type: 'string' },
            expiration: { type: ['string', 'number'] },
            data: { type: ['object', 'string'] }
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
            body: {
              name,
              version,
              data,
              env = 'production',
              variant = '_default',
              expiration = null
            }
          } = req;

          await fastify.putObjectVariant({
            name,
            version,
            env,
            data,
            variant,
            expiration
          });

          res.status(201).send({ created: true });
        }
    });

    fastify.route({
      method: 'DELETE',
      url: '/objects/:name/:env',
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            env: { type: 'string' }
          }
        },
        response: {
          204: {}
        }
      },
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      handler:
        /**
         * @type {FastifyHandler}
         */
        async (req, res) => {
          const {
            params: { name, env }
          } = req;
          const obj = await fastify.getObject({ name, env });
          if (!obj) {
            throw fastify.httpErrors.notFound(
              `Object '${name}' not found in '${env}'`
            );
          }
          await fastify.deleteObject({ name, env });
          res.status(204);
        }
    });

    fastify.route({
      method: 'DELETE',
      url: '/objects/:name/:env/:version',
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            env: { type: 'string' },
            version: { type: 'string' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            variant: { type: 'string' }
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
            params: { name, env, version },
            query: { variant }
          } = req;

          const [obj, objVersions] = await Promise.all([
            fastify.getObject({ name, env }),
            fastify.getAllObjectVersions({ name, env })
          ]);

          if (!obj) {
            throw fastify.httpErrors.notFound(
              `Object '${name}' not found in '${env}'`
            );
          }

          if (!objVersions.includes(version)) {
            throw fastify.httpErrors.notFound(
              `Version ${version} not found in '${env}'`
            );
          }

          if (!variant) {
            await fastify.deleteObjectVersion({ name, env, version });
          } else {
            const objVariant = await fastify.getObjectVariant({
              name,
              env,
              version,
              variant
            });
            if (!objVariant) {
              throw fastify.httpErrors.notFound(
                `Variant '${variant}' not found in '${env}'`
              );
            }
            await fastify.deleteObjectVariant({ name, env, version, variant });
          }

          // Since this happens outside a Dynamo transaction,
          // if the operation fails due to optimistic locking
          // or network error, we may want retry this
          // operation in isolation.

          // TODO (jdaeli): consider to expose a route to expose
          // this operation so that can be run in isolation
          await fastify.checkAndFixCorruptedHead({ name, env });

          res.status(204);
        }
    });

    fastify.route({
      method: 'PUT',
      url: '/objects/:name/:env',
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
          required: ['head'],
          properties: {
            head: { type: 'string' }
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
            params: { name, env },
            body: { head: headVersion }
          } = req;

          const [obj, objVersions] = await Promise.all([
            fastify.getObject({ name, env }),
            fastify.getAllObjectVersions({ name, env })
          ]);

          if (!obj) {
            throw fastify.httpErrors.notFound(
              `Object '${name}' not found in '${env}'`
            );
          }

          if (!objVersions.includes(headVersion)) {
            throw fastify.httpErrors.notFound(
              `Version ${headVersion} not found in '${env}'`
            );
          }

          const {
            headTimestamp: prevTimestamp,
            headVersion: prevHeadVersion
          } = obj;

          if (headVersion === prevHeadVersion) {
            throw fastify.httpErrors.conflict(
              `Version ${headVersion} is already set for object '${name}' in '${env}'`
            );
          }

          await fastify.setHead({
            name,
            env,
            version: headVersion,
            prevTimestamp
          });
          res.status(204);
        }
    });

    /* eslint-disable max-statements */
    fastify.route({
      method: 'PUT',
      url: '/objects/:name/:env/rollback',
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
          properties: {
            hops: { type: 'number', minimum: 1, maximum: 20, default: 1 }
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
            params: { name, env },
            body: { hops = 1 }
          } = req;

          const [obj, objVersions] = await Promise.all([
            fastify.getObject({ name, env }),
            fastify.getAllObjectVersions({ name, env })
          ]);

          if (!obj) {
            throw fastify.httpErrors.notFound(
              `Object '${name}' not found in '${env}'`
            );
          }

          // Recursivly find version back to N hops
          let timestamp = obj.headTimestamp;
          let hop = 0;
          let record;
          while (timestamp && hop < hops + 1) {
            record = await fastify.getHistoryRecord({ name, env, timestamp });
            timestamp = record.prevTimestamp;
            hop++;
          }

          if (hop < 2 || !record) {
            throw fastify.httpErrors.notFound(
              `Object '${name}' in '${env}' does not have a previous version to rollback to`
            );
          }

          const { headVersion: version } = record;

          // This can happen if the version has been deleted
          if (!objVersions.includes(version)) {
            throw fastify.httpErrors.gone(
              `Version ${version} in '${env}' has been deleted`
            );
          }

          const {
            headTimestamp: prevTimestamp,
            headVersion: prevHeadVersion
          } = obj;

          if (version === prevHeadVersion) {
            throw fastify.httpErrors.conflict(
              `Object '${name}' in '${env}' is already rolled back to version '${version}'`
            );
          }

          await fastify.setHead({
            name,
            env,
            version,
            prevTimestamp
          });
          res.status(204);
        }
    });
    /* eslint-enable max-statements */
  };
