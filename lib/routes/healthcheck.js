'use strict';

module.exports = function (app) {
  /**
   * @swagger
   * /healthcheck:
   *   get:
   *     summary: Healthcheck endpoint to verify that service is running and able to accept new connections
   *     produces:
   *       - "text/plain"
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   *       500:
   *         $ref: '#/responses/Standard500'
   */
  app.routes.get('/healthcheck(.html)?', function (req, res) {
    res.end('ok');
  });
};
