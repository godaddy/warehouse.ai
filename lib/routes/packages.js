'use strict';
const stringify = require('stringify-stream');

/**
 * @function setup
 *  @param {slay.App} app - global app object
 * Adds non-npm package routes for working with packages
 * and package metadata
 * @returns {undefined}
 */
module.exports = function (app) {
  const auth = app.middlewares.auth;

  /**
   * @swagger
   *
   * definitions:
   *   Package:
   *     type: object
   *     additionalProperties: true
   *     properties:
   *       name:
   *         type: string
   *       version:
   *         type: string
   *   Packages:
   *     type: array
   *     items:
   *       $ref: '#/definitions/Package'
   * responses:
   *   Packages:
   *     200:
   *       description: OK
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/definitions/Packages'
   *     400:
   *       $ref: '#/responses/Standard400'
   *     403:
   *       $ref: '#/responses/Standard403'
   *     404:
   *       $ref: '#/responses/Standard404'
   *     500:
   *       $ref: '#/responses/Standard500'

   */

  /**
   * Returns the packages matching the query string parameters
   *
   * @swagger
   * /packages/search:
   *   get:
   *     summary: Returns the packages matching the query string parameters
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - in: query
   *         name: type
   *         required: false
   *         schema:
   *           type: string
   *         description: The type to search for
   *     responses:
   *       $ref: '#/responses/Packages'
   */
  app.routes.post('/packages/search', auth, function (req, res, next) {
    if (!app.bay) return res.status(500).json({ error: 'Not configured' });
    //
    // Currently we only fetch by tag
    //
    var type = app.params.type;
    app.bay.get(type, function (err, packages) {
      if (err) { return next(err); }

      res.status(200).json(packages);
    });
  });

  /**
   * Returns a list of information about all tracked packages
   *
   * @swagger
   * /packages:
   *   get:
   *     summary: Returns a list of information about all tracked packages
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     responses:
   *       $ref: '#/responses/Packages'
   */
  app.routes.get('/packages', auth, function (req, res, next) {
    app.models.PackageCache.findAll({ partitioner: 'cached' })
      .once('error', err => {
        err.status = 500;
        next(err);
      })
      .pipe(stringify({ open: '[', close: ']' }))
      .pipe(res);
  });

  /**
   * Returns information about the given package
   *
   * @swagger
   * /packages/{pkg}:
   *   get:
   *     summary: Returns information about the given package
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *     responses:
   *       $ref: '#/responses/Packages'
   */
  app.routes.get('/packages/:pkg', auth, function (req, res, next) {
    app.models.Package.get({ name: req.params.pkg }, function (err, pkg) {
      if (err) return next(err);

      if (!pkg) {
        err = new Error('Package not found');
        err.status = 404;
        return next(err);
      }

      res.json(pkg);
    });
  });
};
