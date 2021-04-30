# Quick Start

This guide covers how you can quickly get started using Warehouse.

This guide does not cover how to deploy and secure Warehouse on your own infrastructure.

## Prerequisites

The following prerequisites are required for a successful use of Warehouse.

 - Warehouse service running and accessible via http
 - [Warehouse CLI](https://github.com/warehouseai/wrhs) installed

## Configuring the CLI

Warehouse CLI will look for a `.wrhs` config file in the root user directory. Alternatively, you can specify a different path to the config file using the `WRHS_NEXT_CONFIG` environment variable.

In your config, you must declare the warehouse service endpoint and authentication credentials.

The config file uses a JSON-like syntax:

```json
{
  "baseUrl": "https://wrhs.mydomain.com",
  "username": "user",
  "password": "password"
}
```

## Push an asset to Warehouse

In this example we assume that we have an application call `example-app` that uses Warehouse to store and distrubute its assets. The application has two assets called `script.js` and `style.css`, and it runs in three separate environemnts: `development`, `test` and `production`. The assets for each environments are compiled with different parameters, therefore each enviroment references to different CDN files (files in different environments have different fingerprint).

Our application assets can be compiled with the `NODE_ENV=<env> npm run build` command where `<env>` is the environment for which the assets are getting builded for.

Now let's assume we want to publish version `1.0.0` of the application in `development`.

We start with building the assets:

```sh
NODE_ENV=dev npm run build
```

Then we can push the assets to Warehouse using the CLI:

```sh
# Upload and register assets
wrhs upload /example-app/dist example-app --env development --version 1.0.0

# Set version 1.0.0 as current
wrhs object set-head example-app --env development --version 1.0.0
```

Now the application backend can call Warehouse API to obtain:

1. The current app version
1. The asset urls

Finally, whenever version `1.0.0` is ready to go `test` and/or `production`, simply repeat the previous steps changing the environment parameter.
