const asynk = require('express-async-handler');
const errs = require('errs');

module.exports = function (app) {
  const auth = app.middlewares.auth;
  const { release } = app;

  /**
   * @swagger
   * definitions:
   *   ReleaseLine:
   *     type: object
   *     properties:
   *       pkg:
   *         $ref: '#/definitions/PackageName'
   *       version:
   *         $ref: '#/definitions/VersionNumber'
   *       previousVersion:
   *         $ref: '#/definitions/VersionNumber'
   *       dependents:
   *         type: object
   * response:
   *   ReleaseLine:
   *     200:
   *       description: OK
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/definitions/ReleaseLine'
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
   * @swagger
   * /promote/{pkg}/{env}:
   *   get:
   *     summary: Get the release line for a package & environment, uses the version that is currently in that environment
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Env'
   *     responses:
   *       $ref: '#/responses/ReleaseLine'
   * /promote/{pkg}/{env}/{version}:
   *   get:
   *     summary: Get the release line for a package, environment, and version
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Env'
   *       - $ref: '#/parameters/Version'
   *     responses:
   *       $ref: '#/responses/ReleaseLine'
   */
  app.routes.get('/release-line/:pkg/:version?', auth, asynk(async (req, res) => {
    const { params } = req;

    const line = await release.get(params);
    if (!line) throw errs.create({
      message: `ReleaseLine not found for ${params.pkg}${params.version ? ' ' + params.version : ''}`,
      status: 404
    });

    res.status(200).json(line);
  }));
};
