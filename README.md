# warehouse.ai

Scalable Object Ledger and CDN.

## Quick Start

```bash
git clone git@github.com:godaddy/warehouse.ai.git
cd warehouse.ai && npm install
npm start
```

## Programmatic Usage

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

### Development

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