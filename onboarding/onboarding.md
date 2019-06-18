# Onboarding

These steps should enable you to setup and publish a module to your running instance of [Warehouse.ai].

### Onboarding process

1. [Configure your `npm` client](#1-configure-your-npm-client)
    1. [Private or `@`-scoped packages](#private-or-`@`-scoped-packages)
1. [Configure your module for Warehouse](#2-configure-your-module-for-warehouse)
    1. [Add properties to package.json](#add-properties-to-packagejson)
    1. [Set publish target](#warehouse-as-publish-target)
    1. [Setup `wrhs.toml`](#setup-wrhstoml)
1. [Publishing your module and advanced configurations](#3-publishing-your-module-and-advanced-configurations)


### 1. Configure your `npm` client

Depending on the warehouse instance, performing requests against the API may require authentication. 
If so, you will need to add the credentials, which you created as part of the setup process for your 
running instance of `warehouse.ai`, to your `.npmrc` file. 

```ini
//where.you.are.running.your-warehouse.ai/:_authToken=YOUR_AUTH_TOKEN
```

> *NOTE:* You may also need to set `strict-ssl` to false if you do not
configure SSL termination for `where.you.are.running.your-warehouse.ai`

```sh
npm config set strict-ssl false
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

If this package needs to be published to a different registry than `warehouse.ai` 
is already configured to publish to, the configuration will need to be updated.


### 2. Configure your module for Warehouse

The following steps assume you already have a working build for your client-side assets
using [webpack], [browserify] or [babel]. Warehouse will use the same `devDependencies` you
use locally to build your assets. Most versions of the aforementioned build systems can be used - 
assuming they work against the current [LTS branch of Node.JS and the maintainance branch][nodejs-releases]. 
At the time of writing, this means, your build will need to work in both `node@8` and `node@10`.

#### Add properties to `package.json`

When you `npm publish` your module to Warehouse, the service will forward proxy to the `write` endpoint you 
specified for your instance of `warehouse.ai` and optionally build your module. You can configure your module 
to build by specifying the `build` type in your `package.json`.

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
The file describes build process outcomes. Defining what `files` should be uploaded to the CDN, how minification
should be done, etc.

To get started, indicate which files should be uploaded to the CDN. The filenames should be changed to match the output
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
> We plan to do all configuration from a single file in the future.
> This will allow for easier setup and supports more features.

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

### 3. Publishing your module and advanced configurations

That's it, your package is setup to use `warehouse.ai`.

You can now publish your package with `npm publish` as you normally would and use npm dist-tags to promote your 
build through environments. See [publishing] for help with how to do that.

There are also more [advanced configuration options][advanced-configuration-options] that allow you to control 
minification, create dependent builds, create locale-specific builds, etc.

You can also use [`warehouse.ai-api-client`][client] in your application to consume the [build output][build].


[build-system-type]: https://github.com/godaddy/carpenterd#identification-of-build-system-type
[toml]: https://github.com/toml-lang/toml#toml
[warehouse.ai]: https://github.com/godaddy/warehouse.ai/
[webpack]: https://webpack.js.org/
[browserify]: http://browserify.org/
[nodejs-releases]: https://nodejs.org/en/about/releases/
[babel]: https://babeljs.io/docs/en/
[npm-config]: https://docs.npmjs.com/files/package.json#publishconfig
[client]: https://github.com/warehouseai/warehouse.ai-api-client#warehouseai-api-client
[uglifyjs]: https://github.com/mishoo/UglifyJS2#uglifyjs-3
[private]: https://docs.npmjs.com/creating-and-publishing-private-packages
[scoped]: https://docs.npmjs.com/about-scopes
[publishing]: publishing.md
[advanced-configuration-options]: advancedConfigurations.md
[build]: buildOutput.md