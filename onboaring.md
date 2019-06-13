# Onboarding

These steps should enable you to setup and publish a module to your running instance of [Warehouse.ai].

### Onboarding process

1. [Configure your `npm` client](#1=configure-your-npm-client)
    1. [Private or `@`-scoped packages](#private-or-`@`-scoped-packages)
1. [Configure your module for Warehouse](#3-configure-your-module-for-warehouse)
    1. [Add properties to package.json](#add-properties-to-packagejson)
    1. [Set publish target](#warehouse-as-publish-target)
    1. [Setup `wrhs.toml`](#setup-wrhstoml)
1. [Publishing your module](#4-publishing-your-module)
    1. [Monitoring build progress](#monitoring-build-progress)
    1. [Promoting your module](#promote-your-module-to-testprod)
1. [Using build output](#5-using-build-output)
    1. [Inspect your bundle](#inspect-your-bundle)
    1. [Serving assets from a web service](#serving-assets-from-a-web-service)
1. [Advanced features](#6-advanced-features)
    - [Building for multiple locales](#building-for-multiple-locales)
    - [Debugging a build](#debugging-a-build)
    - [Minification](#minification)
    - [Dependent builds](#dependent-builds)


### 1. Configure your npm client

Depending on the warehouse instance, performing requests against the API may require authentication. 
If so, you will need to add the credentials, which you created as part of the setup process for your 
running instance of `warehouse.ai`, to your `.npmrc` file. 

```ini
//where.you.are.running.your-warehouse.ai/:_authToken=YOUR_AUTH_TOKEN
```

> *NOTE:* You may also need to set `strict-ssl` to false if you do not
configure SSL termination for `where.you.are.running.your-warehouse.ai`

```sh
npm c set strict-ssl false
```

#### Private or `@`-scoped packages

If your package is [private] or [scoped], your package should provide an `.npmrc` file
so that `warehouse.ai` can properly `npm install` and build your assets. For
example, if you're using a private registry you may need to add this to your
repository's `.npmrc` file:

```sh
# for a private registry
registry=https://your.private.registry.com/
```

If using a private registry, be sure that your instance of `warehouse.ai`
has network access to that registry so that `npm install` can succeed.


### 2. Configure your module for Warehouse

The following steps assume you already have a working build for your client-side assets. For example by 
using [webpack], [browserify] or [babel]. Warehouse will use the same `devDependencies` you
use locally to build your assets. Most versions of the aforementioned build systems can be used - 
assuming they work against the current [LTS branch of Node.JS and the maintainance branch.][nodejs-releases]. 
Your bundler will need to work in `node@8` and `node@10` at the time of writing.

#### Add properties to `package.json`

When you `npm publish` your module to Warehouse, the service will read out the module's `package.json` to
determine if it needs to build the module or not. Based on the `build` property in `package.json` a specific
build will be triggered. In any case - even if no build is specified - the `npm publish` will forward proxy to  
the `write` endpoint you specified for your instance of `warehouse.ai`.

Assuming you are using [webpack], add the `build` property to your `package.json`:  

```json
"build": "webpack"
```

Additional build systems we support can be found [here][build-system-type]. These targets merely let 
`Warehouse` know which build to initiate. The service still requires all modules to be present in 
`devDependencies` and  installable. Currently, builds are initiated against their defaults. For example, 
`webpack` initiates the `webpack-cli` and assumes configuration is available in the root folder as 
`./webpack.config.js`.

#### Warehouse as publish target

By default, `npm` uses the global `registry` setting as endpoint to `publish` modules. This endpoint should 
be changed locally in your module to point to Warehouse. The local settings will override the global configuration.

Add the following property to your `package.json`. It should be a top-level property, e.g. at the level of 
`main`, `dependencies`, etc. [More details on npm configuration can be found here][npm-config].

```js
"publishConfig": {
  "registry": "https://wherever-you-deployed-warehouse.ai"
}
```

#### Setup `wrhs.toml`

Create a new file in the root folder named `./wrhs.toml`. This configuration file is read by Warehouse to understand
additional build details. This file follows the `toml` format, which is [described in detail here][toml].
The file describes build process outcomes. Defining what `files` should be uploaded to CDN, how minification
should be done, etc.

To get started, indicate which files should be uploaded to CDN. The filenames should be changed to match the output
from your build. The list acts as a filter of assets. By default Warehouse will read all files from
the output directory of your build. This ensures only the files that you specify will be uploaded to CDN.
In the example Warehouse expects to find asset files in the folder `./dist`, named `output[.min].js` or
`output[.min].css` respectively.

```ini
[files]
dev = ['dist/ouput.js', 'dist/output.css']
test = ['dist/ouput.js', 'dist/output.css']
prod = ['dist/ouput.min.js', 'dist/output.min.css']
```
> We plan to do all configuration from this file in the future.
> This will allow us to expose more features and make setup easier.

From this example you can discern that uploaded files are configurable per environment and file paths are
determined relative to the root of your module. The `dist` directory is not an arbitrary choice, `warehouse.ai` 
will need the `dist` directory to explicitly exist so it knows which files to serve.

Finally, if you are using `webpack`, you will need a `webpack.config.js` in the root directory. Make sure that 
files in your `wrhs.toml` match the ouput of your `webpack.config.js`. It is important to note that all 
`warehouse.ai` is doing is to call `webpack` in this case, thus all of your configuration must live within this 
file (not as command line arguments). 

```js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'output.js'
  }
};
```
#### Extract Config

COMING SOON: You will be able to extract your warehouse.ai configuration to keep it in one place by using [extract-config]. 

### 3. Publishing your module

If you followed above steps carefully, your module should be ready to be published to Warehouse. Let's publish your
first module to Warehouse!

Publish your package as you normally would:

```sh-session
npm version <newversion> 

npm publish
```

This will trigger a build in Warehouse and publish the module to the `write` endpoint you specified. Initially the build of 
this version will only be available in `DEV`. Subsequently the files are only uploaded to the `DEV` CDN as well. A hash is 
generated from the file content that the browser will use to do caching based on file content. Warehouse provides
various mechanics to retrieve the build files. We'll [dive into the mechanisms later](#using-build-output).


#### Monitoring build progress

To check the status of the build process you can either use the [Warehouse UI][ui] or
[CLI](cli).
Once you have `Warehouse UI` set up, it will show the
build progress for each environment. Wait for the `DEV` build to complete.

#### Promote your module to TEST/PROD

After the initial publish, the build will only be available in the `DEV` environment. Assuming the bundle
works as expected, it can be promoted to `TEST` and/or `PROD`. Promoting your module's bundle to a specific
environment can be done through `npm dist-tag`. For example, to promote your bundle to `TEST` run:

```
npm dist-tag add [module-name]@[semver] test --reg=https://wherever-you-deployed-warehouse.ai
```

Where `[module-name]` is the package name of your module and `[semver]` the exact semver that was published to
`DEV`. Also be aware that the `--reg` argument is required, since `publishConfig` only applies to `npm publish`.
To promote your module to `PROD`, simply `npm dist-tag` again but replace `test` with `prod`.

### 4. Using build output

Now that you can promote your module's bundle to each environment, you can start using the bundle.
First, let's inspect the available bundle output. Then, we'll reference the assets from your web application.

#### Inspect your bundle

The easiest way to quickly inspect a build and files on CDN is by using the Warehouse CLI. Install the CLI by
following [the directions from the readme][cli].

Now let's inspect your build by running the following command. Replace `[module-name]` with your package name.
This will return bundle and build details for your package in `dev`. Similarly you can inspect your bundle in
`test` and `prod`.

```sh-session
wrhs get:build [module-name] dev
```

#### Serving assets from a web service

Use the [Warehouse-client][client] to retrieve bundle information for your webserver's responses. The client
requires the same authentication and endpoint details as provided to the [CLI](#inspect-your-bundle).
Currently, we only have a client available for Node.JS. Usage is straightforward. Install the module as
a `dependency` of your webserver, e.g. `npm i --save warehouse.ai-api-client`.

Next, setup an instance of the client like below. 

```js
const Warehouse = require('warehouse.ai-api-client');
const warehouse = new Warehouse({
  uri: 'https://wherever-you-deployed-warehouse.ai',
  retry: {
    max: 3000
  }
});
```
If your `warehouse.ai` instance was setup with auth, you will need to add your credentials in 
the `uri` field for the step above. Ideally the `[username]` and `[password]` are stored in a 
secure config, for example by using [whisper.json][whisper].

```js
{
  uri: 'https://[username]:[password]@wherever-you-deployed-warehouse.ai'
  ...
}
```



This client can now be used to get information from bundle `details`. This object will contain properties like
`files` and `fingerprints` (unique hashes). Which enables you to reference the correct CDN assets in your
webserver responses.

```js
warehouse.builds.get({
  env: 'prod',                       // This should match the enviroment your server is running in
  pkg: '[module-name]',              // Replace this with your package's name
  locale: 'en-US'                    // Defaults to `en-US`, but could be any locale you specified as target
}, function done(error, details) {
  console.log(details);              // Will return properties similar to the CLI.
});
```

To make sure that build information is retrieved out-of-band, the client has build in memory and/or file caching
mechanisms. Bundles information will be mostly static between requests. The client will automatically
perform update requests on an interval against Warehouse to retrieve the bundle's latests details.

### 5. Advanced features

#### Building for multiple locales

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

#### Debugging a build

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

#### Minification

By default all builds for `test` and `prod` environment will have their JS and CSS minified. This ensures that 
any asset used in production will always be minified and has an associated `sourcemap` that refers to the same 
hashed filename. You still get full control over minification [through `wrhs.toml`](#setup-wrhstoml). The 
configuration below will be passed along to [uglifyjs], which Warehouse uses for minification. The properties 
(i.e. `compress`) match the properies `uglifyjs` expects from its configuration. Minification is done before 
pushing to CDN, so you still can expose [non-minified files only for `test`](#setup-wrhstoml).

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

#### Dependent builds

If you have multiple customer facing modules that should always depend on the latest version of one of
your team's modules. Warehouse provides a feature to rebuild dependent modules after the dependency they all
have in common is published. If the dependent module is published to Warehouse, Warehouse will
[rebuild the dependent module][rebuild] after the dependency is built.

However, if you need to depend on a module, say `module A` depends on `module B`, but do not want your dependent 
module (`module A`) to rebuild each time a new version of your dependency (`module B`) is published, specify the 
dependency (`module B`) as a `devDependency` in the `package.json` of  your dependent module (`module A`). 
Warehouse will only trigger dependant builds from modules specified under `dependencies`.


[build-system-type]: https://github.com/godaddy/carpenterd#identification-of-build-system-type
[toml]: https://github.com/toml-lang/toml#toml
[warehouse.ai]: https://github.com/godaddy/warehouse.ai/
[webpack]: https://webpack.js.org/
[browserify]: http://browserify.org/
[nodejs-releases]: https://nodejs.org/en/about/releases/
[babel]: https://babeljs.io/docs/en/
[npm-config]: https://docs.npmjs.com/files/package.json#publishconfig
[rebuild]: https://github.com/godaddy/warehouse.ai/#auto-update-of-builds
[cli]: https://github.com/warehouseai/wrhs
[ui]: https://github.com/godaddy/warehouse.ai-ui
[client]: https://github.com/warehouseai/warehouse.ai-api-client#warehouseai-api-client
[uglifyjs]: https://github.com/mishoo/UglifyJS2#uglifyjs-3
[whisper]: https://www.npmjs.com/package/whisper.json
[ietf]: https://en.wikipedia.org/wiki/IETF_language_tag
[language-subtag]: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
[region-subtag]: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
[extract-config]: https://github.com/warehouseai/extract-config
[private]: https://docs.npmjs.com/creating-and-publishing-private-packages
[scoped]: https://docs.npmjs.com/about-scopes