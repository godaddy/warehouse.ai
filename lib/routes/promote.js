'use strict';

const asynk = require('express-async-handler');

module.exports = function (app) {
  const auth = app.middlewares.auth;
  const specify = app.spec;
  const { manager } = app;

  app.routes.patch('/promote/:pkg/:env/:version', auth, asynk(async (req, res) => {
    const build = (req.body.build || req.query.build) === 'true';
    const { version, ...spec } = specify.fromRequest(req);
    const promote = true;
    const tag = true;

    //
    // There should be a separate promote method that doesn't
    // treat it as a rollback, this change should be in bffs
    //
    if (build) await manager.rollbackOrBuild({ spec, version, promote, tag });
    else await manager.rollback({ spec, version, tag });

    res.status(204).end();
  }));
};
