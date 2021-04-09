# warehouse.ai

Scalable Object Ledger and CDN.

## Introducing Warehouse 7

Warehouse 7, also known as Warehouse Next, is a scalabe object ledger and cdn system for powering dynamic web applications. The new system has been entirly redisgned using a lightweight, portable and flexible architecture.

While designing the new system, it made sense to add a higher level of abstraction.
The idea is expose a generic Object API and a CDN service. The user can use the CDN service to upload the desired assets while using the Object API to store the metadata of the assets (e.g., file urls, etc.)

The Object API acts as generic ledger and it can be used by a third-party system to store any type of data.

Warehouse can be used for different use cases in different ways. At GoDaddy we mainly use it for storing and serving our web applications compiled assets. Our apps workflow can be summarized as following:

1. Engineers create a new service or package version and release it (e.g., `npm publish`, `git push <tag>`)
1. A CICD workflow is triggered and run the Webpack builds
1. When all builds are completed, the CICD workflow uploads the assets to Warehouse

## Get Started

### Quick Start

```bash
git clone git@github.com:godaddy/warehouse.ai.git
cd warehouse.ai && npm install
npm start
```

### Programmatic Usage

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
  "version": "<version>", // if not specified it returns the latest version
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
POST /assets

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
wrhs upload /dev/myFilesFolder @ux/sales-header --env development --version 1.21.5 --variant en_US --expiration 365d
```

Option 2:

```bash
wrhs cdn upload /dev/myFilesFolder --expiration 365d | wrhs object create @ux/sales-header --env development --version 1.21.5 --variant en_US --expiration 365d
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
wrhs object create @ux/sales-header --env development --version 1.21.5 --variant en_US --expiration 365d --data '{ "foo": "bar" }'
```

With `data` pipe:

```bash
echo -n '{ "foo": "bar" }' | wrhs object create @ux/sales-header --env development --version 1.21.5 --variant en_US --expiration 365d
```

#### Get object

All variants:

```bash
wrhs object get @ux/sales-header --env development --version 1.21.5
```

Specific variant:

```bash
wrhs object get @ux/sales-header --env development --version 1.21.5 --accept-variants pt_BR,pt,en_US
```

Using `--accept-variants` flag, it returns the highest priority variant found. If no `accept-variants` are found, a `404` is returned. 

#### Update object head 

> Promotion simply moves the object version head creating a record in the object history. Promotion happens for all the object variants at once.

```bash
wrhs object set-head @ux/sales-header --env development --version 1.21.6
```

#### Rollback object head

```bash
wrhs object rollback-head @ux/sales-header --env development --version 1.21.4
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
