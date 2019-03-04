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
   *       - in: path
   *         name: pkg
   *         required: true
   *         schema:
   *           $ref: '#/definitions/PackageName'
   *         description: The package name
   *       - in: path
   *         name: env
   *         required: true
   *         schema:
   *           $ref: '#/definitions/Environment'
   *         description: The environment
   *       - in: path
   *         name: version
   *         required: true
   *         schema:
   *           $ref: '#/definitions/VersionNumber'
   *         description: The package version
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/ReleaseLine'
   * /promote/{pkg}/{env}/{version}:
   *   get:
   *     summary: Get the release line for a package, environment, and version
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - in: path
   *         name: pkg
   *         required: true
   *         schema:
   *           $ref: '#/definitions/PackageName'
   *         description: The package name
   *       - in: path
   *         name: env
   *         required: true
   *         schema:
   *           $ref: '#/definitions/Environment'
   *         description: The environment
   *       - in: path
   *         name: version
   *         required: true
   *         schema:
   *           $ref: '#/definitions/VersionNumber'
   *         description: The package version
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/ReleaseLine'
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
