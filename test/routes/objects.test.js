/* eslint-disable no-shadow */

const { test } = require('tap');
const { build } = require('../helper');

test('Objects API', async (t) => {
  const fastify = build(t);

  t.plan(6);

  t.test('create object', async (t) => {
    t.plan(2);

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        name: 'myObject',
        version: '3.0.2',
        env: 'test',
        data: 'data from CDN api',
        variant: 'en-US'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.deepEqual(body, { created: true });
  });

  t.test('get objects', async (t) => {
    t.plan(2);

    const res = await fastify.inject({
      method: 'GET',
      url: '/objects/myObject?env=test'
    });

    t.equal(res.statusCode, 200);

    const body = JSON.parse(res.payload);
    t.deepEqual(body, [
      {
        name: 'myObject',
        env: 'test',
        version: '3.0.2',
        data: 'data from CDN api',
        variant: 'en-US'
      }
    ]);
  });

  t.test('set object head', async (t) => {
    // t.plan(4);
  });

  t.test('get object head', async (t) => {
    // t.plan(4);
  });

  t.test('delete object variant', async (t) => {
    // t.plan(4);
  });

  t.test('delete object', async (t) => {
    // t.plan(4);
  });
});
