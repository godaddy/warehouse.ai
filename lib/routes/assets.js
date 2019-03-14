/* eslint no-bitwise: 0*/
'use strict';

const mime = require('mime');

//
// As our intention is to primary serve JS builds, this should be our default
// type when the mime lookup fails to find something fruitful.
//
mime.default_type = 'text/javascript';

module.exports = function (app) {
  const spec = app.spec;

  /**
   * @swagger
   *
   * definitions:
   *   Assets:
   *     type: object
   *     properties:
   *       files:
   *         type: array
   *         items:
   *           type: string
   */

  /**
   * API for serving latest files
   * @swagger
   * /assets/files/{pkg}/{env}/{version}:
   *   get:
   *     summary: Gets the file assets for a given package-environment-version
   *     security: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Env'
   *       - $ref: '#/parameters/Version'
   *       - in: query
   *         name: filter
   *         required: false
   *         schema:
   *           type: string
   *           maximum: 50
   *         description: Case-insensitive substring filter to apply to the file list
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/Assets'
   *       400:
   *         description: Filter is too long
   *       403:
   *         $ref: '#/responses/Standard403'
   *       404:
   *         $ref: '#/responses/Standard404'
   *       500:
   *         $ref: '#/responses/Standard500'
   */
  app.routes.get('/assets/files/:pkg/:env/:version?', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;

    spec.findBuild(
      spec.fromRequest(req),
      function (err, build) {
        if (err) { return next(err); }

        const filter = req.query.filter;
        if (filter) {
          if (filter.length > 50) {
            res.statusCode = 400;
            return res.json({ error: `${filter} is too many characters. Limit 50.` });
          }

          res.json({
            files: build.files.filter(file => {
              return file.toString().toLowerCase().includes(filter.toLowerCase());
            })
          });
        } else {
          res.json({ files: build.files });
        }
      }
    );
  });
};
