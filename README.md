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
fastify.decorate('verifyAuthentication', (request, reply, done) => {
  // Implement auth strategy here
  done();
});

fastify.register(warehouse);

fastify.ready(() => {
  fastify.listen(fastify.config.port, err => {
    if (err) throw err;
  });
})
```
