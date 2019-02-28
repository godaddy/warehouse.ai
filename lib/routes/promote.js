'use strict';

const asynk = require('express-async-handler');

module.exports = function (app) {
  const auth = app.middlewares.auth;
  const specify = app.spec;
  const { manager } = app;

  /**
   * Promotes a build
   *
   * @swagger
   * /promote/{pkg}/{env}/{version}:
   *   patch:
   *     summary: Promotes a build
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
   *       204:
   *         description: Success
   */
  app.routes.patch('/promote/:pkg/:env/:version', auth, asynk(async (req, res) => {
    const build = (req.body.build || req.query.build) === 'true';
    const { version, ...spec } = specify.fromRequest(req);
    const promote = true;
    const tag = true;

    //
    // There should be a separate promote method that doesn't
    // treat it as a rollback, this change should be in bffs
    //
    if (build) await manager.promoteOrBuild({ spec, version, promote, tag });
    else await manager.promote({ spec, version, tag });

    res.status(204).end();
  }));
};
