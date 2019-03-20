'use strict';
const swaggerUI = require('swagger-ui-express');
const swaggerDefs = require('../wrhs-spec.json');

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
   *
   *   Error:
   *     application/json:
   *       schema:
   *         type: object
   *         properties:
   *           code:
   *             type: string
   *           message:
   *             type: string
   *
   * parameters:
   *   Pkg:
   *     in: path
   *     name: pkg
   *     required: true
   *     schema:
   *       $ref: '#/definitions/PackageName'
   *     description: The package name
   *   Env:
   *     in: path
   *     name: env
   *     required: true
   *     schema:
   *       $ref: '#/definitions/Environment'
   *     description: The environment
   *   Version:
   *     in: path
   *     name: version
   *     required: true
   *     schema:
   *       $ref: '#/definitions/VersionNumber'
   *     description: The package version
   *
   * responses:
   *   Standard:
   *     200:
   *       $ref: '#/responses/Standard200'
   *     400:
   *       $ref: '#/responses/Standard400'
   *     401:
   *       $ref: '#/responses/Standard401'
   *     403:
   *       $ref: '#/responses/Standard403'
   *     404:
   *       $ref: '#/responses/Standard404'
   *     500:
   *       $ref: '#/responses/Standard500'
   *   Standard200:
   *     description: OK
   *   Standard304:
   *     description: Not Modified
   *   Standard400:
   *     description: Bad Request
   *     content:
   *       $ref: '#/definitions/Error'
   *   Standard401:
   *     description: Unauthorized
   *     content:
   *       $ref: '#/definitions/Error'
   *   Standard403:
   *     description: Forbidden
   *     content:
   *       $ref: '#/definitions/Error'
   *   Standard404:
   *     description: Not Found
   *     content:
   *       $ref: '#/definitions/Error'
   *   Standard500:
   *     description: Internal Server Error
   *     content:
   *       $ref: '#/definitions/Error'
   *
   */

};

