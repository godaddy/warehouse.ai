'use strict';

const ndjson = require('ndjson');
const async = require('async');
const etag = require('etag');
const Retryme = require('retryme');
const asynk = require('express-async-handler');
const thenify = require('tinythen');

module.exports = function (app) {
  const Package = app.models.Package;
  const Version = app.models.Version;
  const { manager } = app;
  const auth = app.npmAuthMiddleware || ((req, res, next) => {
    next(null);
  });

  //
  // Setup our known param handlers for well-known npm
  // parameter names.
  //
  require('./params')(app.routes);

  /**
   * @swagger
   * /{pkg}/-rev/{rev}:
   *   delete:
   *     summary: Unpublish a package but only when it will not have an adverse affect on a build that we care about.
   *     security:
   *       - basicAuth: []
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - in: path
   *         name: rev
   *         required: true
   *         schema:
   *           $ref: '#/definitions/VersionNumber'
   *         description: The package version
   *     responses:
   *       $ref: '#/responses/Standard'
   */
  app.routes.delete('/:pkg/-rev/:rev', auth, function deleteNPMPackageRoute(req, res, next) {
    //
    // TODO: ensure that no builds prevent this unpublish event.
    // Remark: Should we also change the state of the package in cassandra here
    // or does that happen on a different request?
    //
    app.npmProxy(req, res, next);
  });

  /**
   * @swagger
   * definitions:
   *   DistTags:
   *     type: object
   * parameters:
   *   Tag:
   *     in: path
   *     name: tag
   *     required: true
   *     schema:
   *       type: string
   *     description: The dist-tag
   */

  /**
   * @swagger
   * /-/package/{pkg}/dist-tags:
   *   get:
   *     summary: Lists the dist-tags for a package
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/DistTags'
   *       400:
   *         $ref: '#/responses/Standard400'
   *       401:
   *         $ref: '#/responses/Standard401'
   *       403:
   *         $ref: '#/responses/Standard403'
   *       404:
   *         $ref: '#/responses/Standard404'
   *       500:
   *         $ref: '#/responses/Standard500'
   */
  app.routes.route('/-/package/:pkg/dist-tags')
    .get(auth, function (req, res, next) {
      app.tagger.list(req.params.pkg, function getDistTagNPMPackageRoute(err, tags) {
        if (err) { return next(err); }
        res.status(200).json(tags);
      });
    })
    .put(auth, function putDistTagNPMPackageRoute(req, res, next) {
      /* eslint no-unused-vars: 0*/

      //
      // Remark: as of npm@2.13.5 this is not consumed anywhere, but it is
      // implemented as `registry.distTags.set` in npm-registry-client. see:
      // https://github.com/npm/npm-registry-client/blob/master/lib/dist-tags/set.js.
      // We are choosing to not implement it here purposefully.
      //
      res.status(400).json({ message: 'Not implemented' });
    })
    .post(auth, function postDistTagNPMPackageRoute(req, res, next) {
      /* eslint no-unused-vars: 0*/

      //
      // Remark: as of npm@2.13.5 this is not consumed anywhere, but it is
      // implemented as `registry.distTags.set` in npm-registry-client. see:
      // https://github.com/npm/npm-registry-client/blob/master/lib/dist-tags/update.js.
      // We are choosing to not implement it here purposefully.
      //
      res.status(400).json({ message: 'Not implemented' });
    });

  /**
   * Atomic operations on individual dist-tags.
   *
   * @swagger
   * /-/package/{pkg}/dist-tags/{tag}:
   *   delete:
   *     summary: Removes a dist-tag for a package
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Tag'
   *     responses:
   *       204:
   *         description: Success
   *       400:
   *         $ref: '#/responses/Standard400'
   *       401:
   *         $ref: '#/responses/Standard401'
   *       403:
   *         $ref: '#/responses/Standard403'
   *       404:
   *         $ref: '#/responses/Standard404'
   *       500:
   *         $ref: '#/responses/Standard500'
   *   put:
   *     summary: Adds a dist-tag for a package
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Tag'
   *     requestBody:
   *       description: The version, an 'npm dist-tag add'-like data
   *     responses:
   *       201:
   *         description: Success
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/DistTags'
   *       400:
   *         $ref: '#/responses/Standard400'
   *       401:
   *         $ref: '#/responses/Standard401'
   *       403:
   *         $ref: '#/responses/Standard403'
   *       404:
   *         $ref: '#/responses/Standard404'
   *       500:
   *         $ref: '#/responses/Standard500'
   *   post:
   *     summary: Adds a dist-tag for a package
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Tag'
   *     requestBody:
   *       description: The version, an 'npm dist-tag add'-like data
   *     responses:
   *       201:
   *         description: Success
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/DistTags'
   *       400:
   *         $ref: '#/responses/Standard400'
   *       401:
   *         $ref: '#/responses/Standard401'
   *       403:
   *         $ref: '#/responses/Standard403'
   *       404:
   *         $ref: '#/responses/Standard404'
   *       500:
   *         $ref: '#/responses/Standard500'
   */
  app.routes.route('/-/package/:pkg/dist-tags/:tag')
    .delete(auth, function deleteDistTagNPMPackageRoute(req, res, next) {
      app.tagger.delete(req.params, function (err) {
        if (err) { return next(err); }
        res.status(204).end();
      });
    })
    .put(auth, asynk(tagBuild))
    .post(auth, asynk(tagBuild));

  /**
   * View package
   *
   * @swagger
   * /{pkg}:
   *   delete:
   *     summary: Attempts to fetch the `package` and `version` records that have been persisted for this `:pkg`
   *     security:
   *       - basicAuth: []
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *     responses:
   *       200:
   *         description: OK
   *       304:
   *         $ref: '#/responses/Standard304'
   *       400:
   *         $ref: '#/responses/Standard400'
   *       401:
   *         $ref: '#/responses/Standard401'
   *       403:
   *         $ref: '#/responses/Standard403'
   *       404:
   *         $ref: '#/responses/Standard404'
   *       500:
   *         $ref: '#/responses/Standard500'
   */
  app.routes.get('/:pkg', auth, function getNPMPackageRoute(req, res, done) {
    const name = req.params.pkg;
    const etags = {
      last: req.headers['if-none-match']
    };

    async.waterfall([
      Package.get.bind(Package, name),
      function getVersion(pkg, next) {
        //
        // Default to the version for the environment or the latest `distTag`.
        //
        const env = req.headers['registry-environment'] || 'test';
        const version = pkg && pkg.distTags && (pkg.distTags[env]
          || pkg.distTags.latest);

        if (!version) {
          req.log.warn('No package %s in cassandra, proxying to artifactory', name, pkg);
          //
          // Hit our final middleware
          //
          return next();
        }

        Version.get([name, version].join('@'), next);
      }
    ], function onPackageVersion(err, version) {
      if (err || !version) { return done(err); }

      let send = version.value;
      let status = 200;
      //
      // TODO: store this on the version record itself because
      // it wasteful to recalculate it every request.
      //
      etags.now = etag(version.value);
      res.setHeader('etag', etags.now);
      res.setHeader('content-type', 'applcation/json');

      if (etags.now === etags.last) {
        status = 304;
        send = '';
      }

      res.status(status);
      res.end(send);
    });
  });

  /**
   * Create a new tag for the specified package and data, then either execute
   * a rollback or a new build in carpenter
   *
   * @param {HTTPRequest} req Request from npm or similar client
   * @param {HTTPResponse} res Response to npm or similar client
   * @param {Function} next Completion callback.
   * @private
   * @returns {undefined}
   */
  async function tagBuild(req, res) {
    var version = req.body;
    var pkg = req.params.pkg;
    var tag = req.params.tag;

    const tags = await thenify(app.tagger, 'add', { pkg, tag, version });

    res.status(201).json(tags);

    const spec = { name: pkg, env: tag };

    try {
      await manager.rollbackOrBuild({ spec, version });
    } catch (ex) {
      app.log.error(ex);
    }
  }
};


