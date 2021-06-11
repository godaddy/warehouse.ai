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
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Env'
   *       - $ref: '#/parameters/Version'
   *     responses:
   *       204:
   *         description: Success
   *       400:
   *         description: Filter is too long
   *       403:
   *         $ref: '#/responses/Standard403'
   *       404:
   *         $ref: '#/responses/Standard404'
   *       500:
   *         $ref: '#/responses/Standard500'
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

    app.securityLog({
      message: 'Pkg ' + req.params.pkg + ' has been successfully promoted',
      category: 'database',
      type: ['change', 'allowed'],
      success: true,
      req,
      res
    });

    res.status(204).end();
  }));
};
