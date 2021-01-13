/**
 * @typedef {import('fastify').FastifyRequest} FastifyRequest
 * @typedef {import('fastify').FastifyReply} FastifyReply
 * @typedef {import('../warehouse').WarehouseApp} WarehouseApp
 */

module.exports = async function (fastify) {
  /**
   * Initialize root routes
   * @param {WarehouseApp} fastify
   * @returns {Promise<void>} Promise representing routes initialization result
   */
  fastify.get(
    '/',
    /** @type {(req: FastifyRequest, res: FastifyReply) => Promise<void>} */
    async function (req, res) {
      res.send('Warehouse is running');
    }
  );
};
