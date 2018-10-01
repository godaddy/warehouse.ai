const asuck = require('express-async-handler');
const errs = require('errs');

module.exports = function (app) {
  const auth = app.middlewares.auth;
  const { release } = app;

  app.routes.get('/release-line/:pkg/:version?', auth, asuck(async (req, res) => {
    const { params } = req;

    const line = await release.get(params);
    if (!line) throw errs.create({
      message: `ReleaseLine not found for ${params.pkg}${params.version ? ' ' + params.version : ''}`,
      status: 404
    });

    res.status(200).json(line);
  }));
};
