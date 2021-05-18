const ms = require('ms');

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

const MIN_EXP_MS = 5 * 60 * 1000;

module.exports =
  /**
   * Initialize CDN routes
   *
   * @param {WarehouseApp} fastify Warehouse app instance
   * @returns {Promise<void>} Promise representing routes initialization result
   */
  async function (fastify) {
    fastify.route({
      method: 'POST',
      url: '/cdn',
      schema: {
        querystring: {
          type: 'object',
          properties: {
            expiration: { type: ['string', 'number'] }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              fingerprints: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              recommended: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              files: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    metadata: {
                      type: ['object', 'null'],
                      additionalProperties: true
                    }
                  }
                }
              }
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
            query: { expiration }
          } = req;
          const nowMs = Date.now();
          let expTimestamp = null;
          if (expiration && typeof expiration === 'string') {
            const milliseconds = ms(expiration);
            if (!milliseconds) {
              throw fastify.httpErrors.badRequest(
                `'${expiration}' is not a valid expiration value`
              );
            }
            expTimestamp = nowMs + milliseconds;
          } else if (expiration) {
            expTimestamp = expiration;
          }

          if (expTimestamp && expTimestamp - nowMs < MIN_EXP_MS) {
            throw fastify.httpErrors.badRequest(
              `Expiration '${expiration}' is less than ${ms(MIN_EXP_MS)}`
            );
          }

          const wrhsAssets = await fastify.tarballToAssets(req.raw);
          const { files, metadata: metas } = wrhsAssets;
          await fastify.uploadAssetFilesToStorage(files, expTimestamp);

          if (fastify.log.security) {
            logger.security({
              success: true,
              message: 'Files sucessfully uploaded',
              method: req.method,
              url: req.url,
              requestId: req.id,
              sourceAddress: req.ip,
              host: req.hostname
            });
          }

          res.status(201).send({
            fingerprints: files.map((file) => `${file.id}.gz`),
            recommended: files.map((file) => `${file.id}/${file.name}`),
            files: files.map((file) => {
              const filepath = `${file.id}/${file.name}`;
              return {
                url: `${fastify.config.cdnBaseUrl}/${filepath}`,
                metadata: metas[file.name]
              };
            })
          });
        }
    });
  };
