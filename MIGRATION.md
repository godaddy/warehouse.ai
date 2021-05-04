# Migrating to Warehouse 7

Since version 6, the new system has been entirely redesigned using a lightweight, portable, and flexible architecture.

While designing the new system, it made sense to add a higher level of abstraction. The idea is to expose a generic Object API and a CDN management API separately. The user can use the CDN API to upload the desired assets while using the Object API to store the metadata of those assets (e.g., file urls, etc.).

At the same time we removed building capabilities support. From now on, teams must build their assets using their own building system.

## No more wrhs.toml

Configuration declared via the `wrhs.toml` is not supported anymore. After moving to the new system, you can safely remove the file.

## Run your own builds

Building capabilities have been removed. You must now build the assets yourself.

### Example: Webpack build

Webpack is a popular system to compile, optimize and build frontend applications. Let's imagine you want to deploy to Warehouse an application call `my-app` in which you use webpack to build the app assets.

Assuming your `webpack.config.js` file:

```js
const path = require('path');
const { EnvironmentPlugin } = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        test: /\.js(\?.*)?$/i,
      })
    ]
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new EnvironmentPlugin({
      NODE_ENV: process.env.NODE_ENV,
      LOCALE: process.env.LOCALE
    })
  ]
};
```

Running `NODE_ENV=development LOCALE=en-US npm run build` will build your app for the `development` environment and `en-US` locale.

The you can use the CLI to upload, register, and promote the assets:

```bash
# Upload and register v1.0.0 assets
wrhs upload /my-app/dist example-app --env development --version 1.0.0 --variant en-US

# Set v1.0.0 as current
wrhs object set-head my-app --env development --version 1.0.0
```

> You can defer to updated the head until the new version is ready to be deployed. Each environment has its own head. This means you can upload the assets for all the enviroments at once, and update each individual head whenver the new version is ready to be deployed to that specific environment.

You must build your app for each environment/locale commbination you may need. 

Each build assets must then being properly uploaded to Warehouse using the CLI or the http API directly.

If your app assets are the same across all your environments, you may choose to build and upload the files only once and simply update the environment head when you need. Please note that Warehouse does not rebuild things on your behalf per environment.

> In the real world, you probably want to automate this using a CICD system such as Jenkins, or Github Actions.
