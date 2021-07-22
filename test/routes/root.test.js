const { test } = require('tap');
const { build } = require('../helper');

test('default root route', async (t) => {
  const app = build(t);
  const res = await app.inject({
    url: '/'
  });
  t.equal(res.payload, 'Warehouse is running');
});
