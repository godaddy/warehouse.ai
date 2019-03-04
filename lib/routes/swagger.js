'use strict';
const swaggerUI = require('swagger-ui-express');
const swaggerDefs = require('../swagger.json');

module.exports = function (app) {
  //
  // ### /api-docs
  // Swagger docs
  //
  app.routes.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDefs));

  // Global swagger defs:

  /**
   * @swagger
   *
   * components:
   *   securitySchemes:
   *     basicAuth:
   *       type: http
   *       scheme: basic
   *
   * security:
   *   - basicAuth: []
   *
   * definitions:
   *   Environment:
   *     type: string
   *     minimum: 1
   *     enum:
   *       - dev
   *       - test
   *       - prod
   *
   *   PackageName:
   *     type: string
   *     minimum: 1
   *
   *   VersionNumber:
   *     type: string
   *     minimum: 1
   *
   *   Locale:
   *     type: string
   *     minimum: 1
   */

};

