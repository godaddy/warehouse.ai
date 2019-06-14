# Advanced features

This document details advanced configurations such as minification, create dependent builds, 
create locale-specific builds, etc.

1. [Advanced features](#6-advanced-features)
    - [Building for multiple locales](#building-for-multiple-locales)
    - [Debugging a build](#debugging-a-build)
    - [Minification](#minification)
    - [Dependent builds](#dependent-builds)


### Building for multiple locales

Warehouse can create bundles per locale and/or market. This should result in optimized bundles per locale. 
By default any package is built for `en-US`. To enable builds for multiple locales, add the `locales` property
of your module's `package.json`. `locales` should be specified as an `array`. For example:

```js
"locales": [
  "da",
  "de",
  "nl-NL",
  ...
],
```

Locales can be specified with their full [IETF language tag][ietf], which is composed of a 
[primary language subtag][language-subtag] and a [region subtag][region-subtag], or their primary language subtag alone.

Each locale will run as a separate build. The build will set the locale to environment variables. These are
`process.env.WRHS_LOCALE` and `process.env.LOCALE`, preferably use the latter. You can refer to
the environment variables directly in your webpack configuration.

### Debugging a build

If your build failed to complete for some reason, you can first inspect the result of each step
through the build status. Run the following command to get a detailed description of each step.

```js
wrhs get:status [moduleName] dev -e
```

The results from a successful build can be found below. Warehouse has some built-in retries for some steps.
This can be seen in the `wrhs` CLI output below with the `ERROR` for  `npm install`. 


```sh-session
2018-12-20T22:40:58.154Z       :  'unpacking' starting
2018-12-20T22:40:58.297Z       :  'unpacking' completed successfully
2018-12-20T22:40:58.306Z       :  'npm install-all' starting
2018-12-20T22:40:58.308Z       :  'npm install' attempt starting
2018-12-20T22:42:16.241Z       :  ERROR: 'npm install' attempt exited with code: 1.
2018-12-20T22:42:16.338Z       :  'npm install' attempt starting
2018-12-20T22:43:50.611Z       :  'npm install' attempt completed successfully
2018-12-20T22:43:50.615Z       :  'npm install-all' completed successfully
2018-12-20T22:43:50.617Z       :  'packing' starting
2018-12-20T22:44:23.606Z       :  'packing' completed successfully
2018-12-20T22:44:23.608Z       :  'uploading' starting
2018-12-20T22:44:24.877Z       :  'uploading' completed successfully
2018-12-20T22:44:24.889Z       :  'Queueing all builds' starting
2018-12-20T22:44:24.920Z en-US :  Queuing webpack build for [moduleName]
2018-12-20T22:44:24.966Z       :  'Queueing all builds' completed successfully
2018-12-20T22:44:25.013Z en-US :  Successfully queued build
2018-12-20T22:44:26.172Z       :  Builds Queued
2018-12-20T22:45:35.544Z en-US :  Fetched tarball
2018-12-20T22:45:35.550Z en-US :  webpack build start
2018-12-20T22:46:41.667Z en-US :  Assets published
2018-12-20T22:46:41.693Z en-US :  carpenterd-worker build completed
```

### Minification

By default all builds for `test` and `prod` environment will have their JS and CSS minified. This ensures that 
any asset used in production will always be minified and has an associated `sourcemap` that refers to the same 
hashed filename. You still get full control over minification [through `wrhs.toml`][setup-wrhstoml]. The 
configuration below will be passed along to [uglifyjs], which Warehouse uses for minification. The properties 
(i.e. `compress`) match the properies `uglifyjs` expects from its configuration. Minification is done before 
pushing to CDN, so you still can expose [non-minified files only for `test`][setup-wrhstoml].

```ini
[minify]
[minify.compress]
unsafe = true
dead_code = true
collapse_vars = true
drop_console = true
conditionals = true
booleans = true
unused = true
if_return = true
join_vars = true
```

### Dependent builds

If you have multiple customer facing modules that should always depend on the latest version of one of
your team's modules. Warehouse provides a feature to rebuild dependent modules after the dependency they all
have in common is published. If the dependent module is published to Warehouse, Warehouse will
[rebuild the dependent module][rebuild] after the dependency is built.

However, if you need to depend on a module, say `module A` depends on `module B`, but do not want your dependent 
module (`module A`) to rebuild each time a new version of your dependency (`module B`) is published, specify the 
dependency (`module B`) as a `devDependency` in the `package.json` of  your dependent module (`module A`). 
Warehouse will only trigger dependant builds from modules specified under `dependencies`.


[ietf]: https://en.wikipedia.org/wiki/IETF_language_tag
[language-subtag]: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
[region-subtag]: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
[rebuild]: https://github.com/godaddy/warehouse.ai/#auto-update-of-builds
[setup-wrhstoml]: onboarding.md#setup-wrhstoml