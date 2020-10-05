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

fastify.decorate('verifyAuthentication', (request, reply, done) => {
  // Define some authentication strategy for Warehouse protected routes
  done();
});

const wrhs = warehouse(fastify);

wrhs.listen(process.env.PORT, err => {
  if (err) throw err;
});
```
