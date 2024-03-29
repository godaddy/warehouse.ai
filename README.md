[![Version npm](https://img.shields.io/npm/v/warehouse.ai.svg?style=flat-square)](https://www.npmjs.com/package/warehouse.ai)
[![License](https://img.shields.io/npm/l/warehouse.ai.svg?style=flat-square)](https://github.com/godaddy/warehouse.ai/blob/master/LICENSE)
[![npm Downloads](https://img.shields.io/npm/dm/warehouse.ai.svg?style=flat-square)](https://npmcharts.com/compare/warehouse.ai?minimal=true)
[![Build Status](https://travis-ci.org/godaddy/warehouse.ai.svg?branch=master)](https://travis-ci.org/godaddy/warehouse.ai)
[![Dependencies](https://img.shields.io/david/godaddy/warehouse.ai.svg?style=flat-square)](https://github.com/godaddy/warehouse.ai/blob/master/package.json)

# warehouse.ai

Warehouse is a scalable object ledger and CDN management system for powering dynamic web applications.

The system exposes two set of APIs: a generic Object API and a CDN management API separately. The user can use the CDN API to upload the desired assets while using the Object API to store the metadata of those assets (e.g., file urls, etc.).

The Object API acts as generic ledger and it can be used to store any type of data. In particular, the Object API is good at storing versioned JSON data that may have one or more "head" version(s) for one or more "environment(s)"; for example, "production" and "staging".

Warehouse can be used for different use cases in different ways. At GoDaddy we mainly use it for storing and serving our web applications' compiled browser-side assets. Our applications' workflow can be summarized as follows:

1. Engineers create a new service or package version and release it (e.g., `npm publish`, `git push <tag>`)
1. A CICD workflow is triggered and runs the builds (e.g., webpack)
1. When all builds are completed, the CICD workflow uploads the assets to Warehouse using the CDN API
1. Metadata for those assets on the CDN are stored in the Object API to allow application servers to fetch the URL(s) for the latest assets for a given environment.

## Get Started

Warehouse is a Node.js web service running on Fastify. It stores data in Amazon's DynamoDB.

### Quick Start

```bash
git clone git@github.com:godaddy/warehouse.ai.git
cd warehouse.ai && npm install
npm start
```

### Programmatic Usage

If you need further customization of Warehouse such as authentication and/or custom logging, you may wrap it using a `fastify` application.

```js
const createFastify = require('fastify');
const warehouse = require('warehouse.ai');

const fastify = createFastify({
  logger: {
    level: 'info'
  }
});

// Optional authentication on Warehouse protected routes
fastify.decorate('verifyAuthentication', function (req, res, done) {
  // Implement auth strategy here
  done();
});

fastify.register(warehouse);

fastify.ready(function () {
  fastify.listen(fastify.config.port, function (err) {
    if (err) throw err;
  });
})
```

## API

### Object API

#### Get object

```json5
GET /objects/:name
```

Optional query parameters:

```json5
{
  "accept_variants": "<variants>", // if not specified it returns all variants
  "version": "<version>", // if not specified it returns the head version (or latest if head not found)
  "env": "<env>" // if not specified it defaults to `production`
}
```

#### Create object

```json5
POST /objects

{
  "name": "<name>",
  "env": "<env>",
  "version": "<version>",
  "variant": "<variant>", // optional, default to _default
  "expiration": "<expiration>", // optional, default to never
  "data": "<data>"
}
```

#### Delete object

```json5
DELETE /objects/:name/:env
```

#### Delete object version

```json5
DELETE /objects/:name/:env/:version
```

Optional query parameters:

```json5
{
  "variant": "<variant>", // if not specified deletes all variants
}
```

#### Get object head

```json5
GET /head/:name/:env
```

#### Update object head

```json5
PUT /objects/:name/:env

{
  "head": "<version>"
}
```

### CDN API

#### Upload new asset

```json5
POST /cdn

<binary-data>
```

Optional query parameters:

```json5
{
  "expiration": "<expiration>", // if not specified, default to never
}
``` 

Binary data can be a specific file, or a tarball containing multiple files.

To attach metadata to a file (or files) upload a tarball that contains both the file (or files) and a `_metadata.json`.

For example, a tarball containing the following files:

```json5
main.js
main.css
_metadata.json // { "main.js": {"foo":"bar"}, "main.css": {"beep":"boop"}}
```

will make the API returning the following response:

```json5
{
  "fingerprints": [
    "0c0383549608cf3b4b01e8f3d15f7ce8.gz",
    "a013ff249608cf3b4b01e7rta6388817.gz"
  ],
  "recommended": [
    "0c0383549608cf3b4b01e8f3d15f7ce8/main.js",
    "a013ff249608cf3b4b01e7rta6388817/main.css"
  ],
  "files": [
    {
      "url": "https://cdn.com/0c0383549608cf3b4b01e8f3d15f7ce8/main.js",
      "metadata": {
        "foo": "bar"
      }
    },
    {
      "url": "https://cdn.com/a013ff249608cf3b4b01e7rta6388817/main.css",
      "metadata": {
        "beep": "boop"
      }
    }
  ]
}
```

#### Delete asset

```json5
DELETE /assets/:sha
```

## CLI

Warehouse comes along with a [CLI] that can be used to interact with the API and perform all the various system operations: from uploading a file to the CDN, to create a new object version into a brand new environment.

#### Upload new asset and create object in the ledger

Option 1:

```bash
wrhs upload /dev/myFilesFolder @org/service --env development --version 1.21.5 --variant en-US --expiration 365d
```

Option 2:

```bash
wrhs cdn upload /dev/myFilesFolder --expiration 365d | wrhs object create @org/service --env development --version 1.21.5 --variant en-US --expiration 365d
```

#### Upload new asset

To upload multiple files within a folder:

```bash
wrhs cdn upload /dev/myFilesFolder --expiration 365d
```

To upload a specific file:

```bash
wrhs cdn upload /dev/myFile.ext --expiration 365d --metadata '{ "beep": "boop" }'
```

#### Create object

With `data` argument:

```bash
wrhs object create @org/service --env development --version 1.21.5 --variant en-US --expiration 365d --data '{ "foo": "bar" }'
```

With `data` pipe:

```bash
echo -n '{ "foo": "bar" }' | wrhs object create @org/service --env development --version 1.21.5 --variant en-US --expiration 365d
```

#### Get object

All variants:

```bash
wrhs object get @org/service --env development --version 1.21.5
```

Specific variant:

```bash
wrhs object get @org/service --env development --version 1.21.5 --accept-variants pt-BR,pt,en-US
```

Using `--accept-variants` flag, it returns the highest priority variant found. If no `accept-variants` are found, a `404` is returned. 

#### Update object head 

> Promotion simply moves the object version head creating a record in the object history. Promotion happens for all the object variants at once.

```bash
wrhs object set-head @org/service --env development --version 1.21.6
```

#### Rollback object head

```bash
wrhs object rollback-head @org/service --env development --version 1.21.4
```

If `--version` argument is omitted, Warehouse will rollback to the previous version.

## Development

Warehouse uses [Localstack] and [Docker] for local development.

To properly run the application locally, open one terminal session and run:

```
npm run localstack
```

Then, open another terminal session and run:

```
npm run init-localstack
npm run dev
```

[Docker]: https://www.docker.com
[Localstack]: https://github.com/localstack/localstack
[CLI]: https://github.com/warehouseai/wrhs
