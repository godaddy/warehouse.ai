/**
 * @typedef {import('fastify').FastifyRequest} FastifyRequest
 * @typedef {import('fastify').FastifyReply} FastifyReply
 * @typedef {import('../warehouse').WarehouseApp} WarehouseApp
 */

module.exports =
  /**
   * Initialize root routes
   *
   * @param {WarehouseApp} fastify Warehouse app instance
   * @returns {Promise<void>} Promise representing routes initialization result
   */
  async function (fastify) {
    fastify.get(
      '/',
      /** @type {(req: FastifyRequest, res: FastifyReply) => Promise<void>} */
      async function (req, res) {
        res.send('Warehouse is running');
      }
    );
  };
