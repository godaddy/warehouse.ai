'use strict';

const async = require('async');
const url = require('url');
const stringify = require('stringify-stream');
const asynk = require('express-async-handler');
const semver = require('semver');
const fs = require('fs')
const through = require('through2');
const zlib = require('zlib');
const tar = require('tar-fs');
const extract = require('@wrhs/extract-config');
const path = require('path');

const stringifyOpts = { open: '[', close: ']' };

module.exports = function (app) {
  const specify = app.spec;
  const auth = app.middlewares.auth;
  const { manager } = app;

  /**
   * @swagger
   *
   * definitions:
   *   Build:
   *     type: object
   *     properties:
   *       env:
   *         $ref: '#/definitions/Environment'
   *       name:
   *         $ref: '#/definitions/PackageName'
   *       buildId:
   *         type: string
   *       previousBuildId:
   *         type: string
   *       rollbackBuildIds:
   *         type: object
   *       createDate:
   *         type: string
   *         format: date-time
   *       udpateDate:
   *         type: string
   *         format: date-time
   *       version:
   *         $ref: '#/definitions/VersionNumber'
   *       locale:
   *         $ref: '#/definitions/Locale'
   *       cdnUrl:
   *         type: string
   *         format: uri
   *       fingerPrints:
   *         type: array
   *         items:
   *           type: string
   *       artifacts:
   *         type: array
   *         items:
   *           type: string
   *       recommended:
   *         type: array
   *         items:
   *           type: string
   *   Builds:
   *     type: array
   *     items:
   *       $ref: '#/definitions/Build'
   * responses:
   *   Builds:
   *     200:
   *       description: OK
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/definitions/Builds'
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
   */

  /**
   * @swagger
   * /builds/-/head:
   *   get:
   *     summary: List the build heads or latest builds
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - in: query
   *         name: name
   *         required: false
   *         schema:
   *           $ref: '#/definitions/PackageName'
   *         description: The package name
   *       - in: query
   *         name: env
   *         required: false
   *         schema:
   *           $ref: '#/definitions/Environment'
   *         description: The environment
   *       - in: query
   *         name: locale
   *         required: false
   *         schema:
   *           $ref: '#/definitions/Locale'
   *         description: The locale (e.g. en-US)
   *     responses:
   *       $ref: '#/responses/Builds'
   */
  app.routes.get('/builds/-/head/', auth, function compose(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    app.models.BuildHead.findAll(req.query || {})
      .once('error', err => {
        err.status = 500;
        next(err);
      })
      .pipe(stringify(stringifyOpts))
      .pipe(res);

  });

  /**
   * @swagger
   *
   * definitions:
   *   MetaEnv:
   *     type: object
   *     properties:
   *       buildId:
   *         type: string
   *       previousBuildId:
   *         type: string
   *       rollbackBuildIds:
   *         type: object
   *       createDate:
   *         type: string
   *         format: date-time
   *       udpateDate:
   *         type: string
   *         format: date-time
   *       locale:
   *         $ref: '#/definitions/Locale'
   *       cdnUrl:
   *         type: string
   *         format: uri
   *       fingerPrints:
   *         type: array
   *         items:
   *           type: string
   *       artifacts:
   *         type: array
   *         items:
   *           type: string
   *       recommended:
   *         type: array
   *         items:
   *           type: string
   */

  /**
   * @swagger
   *
   * definitions:
   *   Meta:
   *     type: object
   *     properties:
   *       name:
   *         $ref: '#/definitions/PackageName'
   *       version:
   *         $ref: '#/definitions/VersionNumber'
   *       envs:
   *         type: object
   *         properties:
   *           dev:
   *             $ref: '#/definitions/MetaEnv'
   *           test:
   *             $ref: '#/definitions/MetaEnv'
   *           prod:
   *             $ref: '#/definitions/MetaEnv'
   */

  /**
   * API for retrieving meta data about a build
   * @swagger
   * /builds/-/meta/{pkg}/{version}:
   *   get:
   *     summary: Retrieves meta data about a build, including its usage in various environments
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Version'
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/Meta'
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
  app.routes.get('/builds/-/meta/:pkg/:version', auth, function (req, res, next) {
    var error;

    app.bffs.meta(specify.fromRequest(req), function meta(err, build) {
      if (err) {
        return next(err);
      }

      if (!build) {
        error = new Error('Build not found');
        error.status = 404;
        return next(error);
      }

      res.setHeader('Content-Type', 'application/json');
      res.send(build);
    });
  });

  /**
   * List ALL of the builds that are in the database
   *
   * @swagger
   * /builds:
   *   get:
   *     summary: Retrieves ALL builds
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     responses:
   *       $ref: '#/responses/Builds'
   */
  app.routes.get('/builds/', auth, function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    app.models.Build.findAll(req.query || {})
      .once('error', err => {
        err.status = 500;
        next(err);
      })
      .pipe(stringify(stringifyOpts))
      .pipe(res);
  });

  /**
   * Cancel the specified build.
   *
   * @swagger
   * /builds/cancel/{pkg}/{version}/{env}:
   *   get:
   *     summary: Cancel the specified build.
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Env'
   *       - $ref: '#/parameters/Version'
   *     responses:
   *       $ref: '#/responses/Standard'
   */
  app.routes.get('/builds/cancel/:pkg/:env/:version', auth, function compose(req, res, next) {
    app.carpenter.cancel(req.params, function client(error, response) {
      if (error) return next(error);

      response.pipe(res);
    }).on('error', next);
  });

  /**
   * Get build or trigger build for the package.
   *
   * @swagger
   * /builds/{pkg}:
   *   get:
   *     summary: Gets the builds for a package.
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *     responses:
   *       $ref: '#/responses/Builds'
   *   post:
   *     summary: Get build the builds for a package.
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *     requestBody:
   *       description: An 'npm publish'-like JSON data
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       $ref: '#/responses/Standard'
   */
  // app.routes.route('/builds/:pkg')
  //   .get(auth, function (req, res, next) {
  //     // TODO: fetch the latest build from artifactory or CDN
  //     // Investigate how this interacts with the CDN.
  //     /* eslint no-unused-vars: 0*/
  //     next();
  //   })

  //   //
  //   // Trigger a build in carpenter through POST request, pipe the response. This
  //   // route assumes valid `npm publish` like JSON as data.
  //   //
    // .post(auth, function build(req, res, next) {
    //   app.carpenter.build({
    //     data: req.body || {}
    //   }, function client(error, response) {
    //     if (error) return next(error);

    //     response.pipe(res);
    //   }).on('error', next);
    // });

    // do we need :pkg? maybe ignore the name? 
  app.routes.put('/builds/:pkg/:env?', auth, function (req, res, next) {
    const payload = req.body;
    //console.log("received payload", payload);
    // Assume no locales are supplied, so just build it in en-US, and no artifactory
    // const testPkgPayload = JSON.parse(fs.readFileSync('test/fixtures/payloads/built-asset.json', 'utf-8'))
    // const payload = testPkgPayload;
    const builtAssets = payload._attachments || {};
    console.log("to route", builtAssets)

    // const pkg = {
    //   name: 'try',
    //   version: '1.1.0',
    //   env: 'dev'
    // }// output of fromPublish

    const models = app.models;
    const pkg = models.Package.fromPublish(payload);
    
    // create version and package records in system 
    var version = pkg.version;
    var name = pkg.name;
  
    async.parallel({
      version: function (next) {
        // Before create, get to see if there is already one and dont write if there is one? REQ:No overwriting existing versions.
        models.Version.create({
          name: name,
          version: version,
          value: JSON.stringify(payload)
        }, function (err) {
          if (err) { app.log.error('Error creating version', err); }
          next(err);
        });
      },
      pkg: function (next) {
        // this will create a new one if there isn't one
        models.Package.update(pkg, function (err) {
          if (err) { app.log.error('Error creating package', err); }
          models.Package.get(pkg, function (err, gotPkg) {
            console.log("package received?", gotPkg);
          });
          next(err);
        });
      }
    }, function (err) {
      next(err)
    });

    // untar, write _attachments to disk
    const stream = through();
    const files = []

    // Unpack the base64 string content into a proper directory of code on disk
    const installPath = './untarpkg/' + name;
    // os package, tmp dir 
    // const rootPath = path.join(tmpdir(), 'some-top-level-folder');
    // const untarPath = path.join(rootPath, `${pkg.name}-${pkg.version}`);
    const assetName = `${name}-${version}.tgz`
    const content = builtAssets[assetName] || '';
    const contentData = content.data || '';
    stream
      .pipe(zlib.Unzip()) // eslint-disable-line new-cap
      .pipe(tar.extract(installPath))
    stream.end(Buffer.from(contentData, 'base64'))


    // Generate files 
    // const file = {
    //   content: fullPath,
    //   compressed: fullPath + '.gz',
    //   fingerprint: src.fingerprint || fingerprinter(fullPath, { content: src.content || src }).id,
    //   filename: src.filename || file,
    //   extension: extensions[extension] || extension
    // }
    // files.push(file);

    // publish with bffs

    const spec = {
      name,
      version,
      env: req.params.env|| 'dev'
    }
    //REQ: All content assumed to be "headless" (i.e. a future call to /dist-tag is what sets it in the next environment
    const publishOpts = {
      promote: false, // prevents creating BuildHead based on the created Build configurable?
      files
    }
    // app.bffs.publish(spec, publishOpts, (err)=> {
    //   console.log("bffs publish error");
    // });
    res.status(204).end();
  });

  /**
   * Get the build for the specified environment. Returns builds for all
   * versions if no version is specified.
   *
   * @swagger
   * /builds/{pkg}/{env}:
   *   get:
   *     summary: Get the builds for a package & environment.
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Env'
   *     responses:
   *       $ref: '#/responses/Builds'
   * /builds/{pkg}/{env}/{version}:
   *   get:
   *     summary: Get builds the builds for a package, environment, and version.
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Env'
   *       - $ref: '#/parameters/Version'
   *     responses:
   *       $ref: '#/responses/Builds'
   */
  app.routes.get('/builds/:pkg/:env/:version?', auth, function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;

    specify.findBuild(
      specify.fromRequest(req),
      function (err, build) {
        if (err) { return next(err); }
        res.send(build);
      }
    );
  });

  /**
   * Run a build with an optional promotion.
   *
   * @swagger
   * /builds/{pkg}/{env}/{version}:
   *   patch:
   *     summary: Run a build with an optional promotion.
   *     security:
   *       - basicAuth: []
   *     produces:
   *       - "application/json"
   *     parameters:
   *       - $ref: '#/parameters/Pkg'
   *       - $ref: '#/parameters/Env'
   *       - $ref: '#/parameters/Version'
   *       - in: query
   *         name: promote
   *         required: false
   *         schema:
   *           type: boolean
   *         description: true if a promotion should happen on successful build
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
   */
  app.routes.patch('/builds/:pkg/:env/:version', auth, asynk(async (req, res) => {
    // Allow promote to be possible through this via query param but default to
    // false
    const promote = req.query.promote === 'true';
    const { version, ...spec } = specify.fromRequest(req);
    const tag = true;

    if (promote) await manager.promoteOrBuild({ spec, version, promote, tag });
    else await manager.build({ spec, version, promote, tag });

    res.status(204).end();
  }));
};
