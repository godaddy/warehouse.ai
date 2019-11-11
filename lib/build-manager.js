'use strict';

const thenify = require('tinythen');
const ndjson = require('ndjson');
const { AwaitWrap } = require('dynastar');
const Retryme = require('retryme');
const limiter = require('p-limit');
const errs = require('errs');

class BuildManager {
  constructor(opts) {
    this.tagger = opts.tagger;
    this.bffs = opts.bffs;
    this.log = opts.log;
    this.carpenter = opts.carpenter;
    this.Version = new AwaitWrap(opts.Version);
    this.release = opts.release;
    this.config = opts.config;
  }

  /**
   * Alias around (promote|rollback)orBuild for use with _tagDependents
   *
   * @function tagAndBuild
   * @param {Object} opts Options
   *  @param {String} opts.pkg Name of package
   *  @param {String} opts.tag Env or npm tag being used
   *  @param {String} opts.version Semver version
   *  @param {String} opts.type Promote or rollback
   * @returns {Promise} from the function called
   */
  tagAndBuild({ pkg, tag, version, type = 'rollback' }) {
    const spec = { name: pkg, env: tag };

    return this[`${type}OrBuild`]({ spec, version, tag: true });
  }

  /**
   * @function promote
   * @param {Object} opts Options
   * @returns {Promise} from _modify
   */
  promote(opts) {
    return this._modify('promote', opts);
  }

  /**
   * @function rollback
   * @param {Object} opts Options
   * @returns {Promise} from _modify
   */
  rollback(opts) {
    return this._modify('rollback', opts);
  }

  /**
   * The logic for either rollback or promote
   *
   * @function _modify
   * @param {String} type Rollback or promote
   * @param {Object} opts Options
   *  @param {Object} opts.spec Name and env for given package
   *  @param {String} opts.version Semver version
   *  @param {Boolean} opts.tag Whether we tag or not
   * @returns {Promise} from returned function
   */
  _modify(type, { spec, version, tag = false }) {
    const { name: pkg, env } = spec;
    const buildSpec = Object.assign({ version }, spec);

    return this.tagger.wrap({ spec, version, tag },
      async () => {
        //
        // If this version already has a build associated, assume we want to
        // rollback to that version
        //
        this.log.info('Searching for build based on tag', buildSpec);

        let build, release;
        try {
          [build, release] = await Promise.all([
            thenify(this.bffs, 'search', buildSpec),
            this.release.get({ pkg, version })
          ]);
        } catch (ex) {
          this.log.error('Error fetching build or release', ex);
          throw errs.create({
            status: 500,
            message: ex.message,
            build: true // if applicable
          });
        }

        if (!build) return false;

        this.log.info('Executing %s, version %s found', type, version, buildSpec);

        // For the eventual route where we want to get real status here, we need to think more
        // about how to give back status/errors here. Right now `tagDependents` is forcing success
        // so we should never actually hit error here. We probably want to gather up all the
        // errors and undo the change the best we can for anything that's been updated.
        try {
          await Promise.all([
            this._tagDependents({ dependents: release && release.dependents, tag: env, type }),
            type === 'rollback' ? thenify(this.bffs, type, spec, version) : thenify(this.bffs, type, { version, ...spec })
          ]);
        } catch (ex) {
          this.log.error('Tag dependents and or rollback failed :(', ex);
          throw errs.create({
            status: 500,
            nessage: ex.message,
            build: false
          });
        }

        return true;
      }
    );
  }

  /**
   * @function rollbackOrBuild
   * @param {Object} opts Options
   * @returns {Promise} from inner function
   */
  rollbackOrBuild(opts) {
    return this._modifyOrBuild('rollback', opts);
  }
  /**
   * @function promoteOrBuild
   * @param {Object} opts Options
   * @returns {Promise} from inner function
   */
  promoteOrBuild(opts) {
    return this._modifyOrBuild('promote', opts);
  }
  /**
  *
  * Either execute a rollback/promote or a carpenter build
  *
  * @function _modifyOrBuild
  * @param {String} type Rollback or promote
  * @param {Object} opts Options for function
  *  @param {Object} opts.spec Name and env for given build
  *  @param {String} opts.version Semver version of build
  *  @param {Boolean} opts.tag Whether we should tag or not
  *  @param {Boolean} opts.promote Whether we should promote build or not
  * @returns {Promise} via async function
  * @public
  */
  async _modifyOrBuild(type, { spec, version, tag, promote = true }) {
    let rolled;
    try {
      rolled = await this[type]({ spec, version, tag });
    } catch (ex) {
      this.log.error(`${type} failed with error`, ex);
      if (!ex.build) return;
    }

    if (rolled) return;

    return this.build({ spec, version, promote });
  }
  /**
  * Tags all dependents in a release line, forcing it to either just tag the existing build
  * and update the build-head or run a full carpenterd build if necessary.
  * @param {Object} dependents - Listing of dependent package from a release line.
  * Object keys are package names, values are the versions to be tagged
  * @param {Object} options - Options object
  * @param {String} options.env - The environment to perform the rollback in
  * @param {String} options.log - How to log errors
  * @returns {Promise} that executes operation
  * @private
  */
  _tagDependents({ dependents, tag, type }) {
    if (!dependents) return;
    const config = {
      retry: this.config.get('retry') || { retries: 5, min: 50, max: 10000 },
      limit: 5,
      ...this.config.get('dependentBuilds')
    };

    const limit = limiter(config.limit);
    // Loop the dependents and roll them back to that version as well.
    return Promise.all(Object.entries(dependents)
      .map(([pkg, version]) => {
        const retry = new Retryme(config.retry);
        return limit(() => retry.async(() => this.tagAndBuild({ pkg, tag, version, type })));
      })
    );

  }
  /**
  *
  * Execute a carpenter build
  * @function build
  * @param {Object} opts - options for function
  * @returns {Promise} for sure
  * @private
  */
  async build({ spec, version, promote, tag = false }) {
    const { name, env } = spec;
    const read = this.tagger.npm.urls.read;

    return this.tagger.wrap({ tag, spec, version },
      async () => {
        const vers = await this.Version.get({ name, version });
        const pack = await thenify(vers, 'forBuild', read);

        //
        // Don't wait for the build to complete as it can be longer
        // that the default request timeout, before responding with the dist-tag
        // details. In the case of any build errors remove the dist-tag.
        // Add tag as environment to package and trigger build.
        //
        pack.env = env;
        this.log.info('No previous build for %s, carpenter trigger', version, spec);
        return new Promise((resolve, reject) => {
          this.carpenter.build({ data: { data: pack, promote } }, (err, buildLog) => {
            if (err) return reject(err);
            //
            // Log the streaming responses of the builder.
            // TODO: can these be streamed back to npm?
            //
            buildLog.pipe(ndjson.parse())
              .on('error', reject)
              .on('data', (data) => {
                if (data.event === 'error') {
                  return reject(err);
                }

                this.log.info(data);
              }).on('end', resolve);
          });
        });
      }
    );
  }
}

module.exports = BuildManager;
