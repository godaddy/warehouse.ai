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
   * Initialize root routes
   *
   * @param {WarehouseApp} fastify Warehouse app instance
   * @returns {Promise<void>} Promise representing routes initialization result
   */
  async function (fastify) {
    fastify.route({
      method: 'GET',
      url: '/',
      schema: {
        response: {
          200: {
            type: 'string'
          }
        }
      },
      preHandler: fastify.auth([fastify.verifyAuthentication]),
      handler:
        /**
         * @type {FastifyHandler}
         */
        async (req, res) => {
          res.header('Cache-Control', 'must-revalidate, max-age: 10');
          res.send('Warehouse is running');
        }
    });
  };
