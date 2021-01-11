/* eslint-disable no-shadow */

const { test } = require('tap');
const { build, createObject, getHead, getObject } = require('../helper');

test('Objects API', async (t) => {
  const fastify = build(t);

  t.plan(6);

  t.test('create object', async (t) => {
    t.plan(3);

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        name: 'myObject',
        version: '3.0.2',
        env: 'development',
        data: 'data from CDN api',
        variant: 'en-US'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.deepEqual(body, { created: true });

    const head = await getHead(fastify, {
      name: 'myObject',
      env: 'development'
    });
    t.deepEqual(head, {
      headVersion: null,
      latestVersion: '3.0.2'
    });
  });

  t.test('get objects', async (t) => {
    t.plan(4);

    await createObject(fastify, {
      name: 'myObject',
      version: '3.0.2',
      env: 'development',
      data: 'data from CDN api',
      variant: 'en-GB'
    });

    await createObject(fastify, {
      name: 'myObject',
      version: '3.0.3',
      env: 'development',
      data: 'data from CDN api',
      variant: 'en-US'
    });

    const resLast = await fastify.inject({
      method: 'GET',
      url: '/objects/myObject?env=development'
    });

    t.equal(resLast.statusCode, 200);

    const bodyLast = JSON.parse(resLast.payload);
    t.deepEqual(bodyLast, [
      {
        name: 'myObject',
        env: 'development',
        version: '3.0.3',
        data: 'data from CDN api',
        variant: 'en-US'
      }
    ]);

    const res302 = await fastify.inject({
      method: 'GET',
      url:
        '/objects/myObject?env=development&version=3.0.2&accepted_variants=en-US'
    });

    t.equal(res302.statusCode, 200);

    const body302 = JSON.parse(res302.payload);
    t.deepEqual(body302, [
      {
        name: 'myObject',
        env: 'development',
        version: '3.0.2',
        data: 'data from CDN api',
        variant: 'en-US'
      }
    ]);
  });

  t.test('set object head', async (t) => {
    t.plan(2);

    const resBadReq = await fastify.inject({
      method: 'PUT',
      url: '/objects/myObject/development',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        head: '3.0.1'
      })
    });

    t.equal(resBadReq.statusCode, 404);

    const resOK = await fastify.inject({
      method: 'PUT',
      url: '/objects/myObject/development',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        head: '3.0.2'
      })
    });

    t.equal(resOK.statusCode, 204);
  });

  t.test('get object head', async (t) => {
    t.plan(2);

    const res = await fastify.inject({
      method: 'GET',
      url: '/head/myObject/development',
      headers: {
        'Content-type': 'application/json'
      }
    });

    t.equal(res.statusCode, 200);

    const head = JSON.parse(res.payload);
    t.deepEqual(head, {
      headVersion: '3.0.2',
      latestVersion: '3.0.3'
    });
  });

  t.test('delete object variant', async (t) => {
    t.plan(2);

    const res = await fastify.inject({
      method: 'DELETE',
      url: '/objects/myObject/development/3.0.2?variant=en-GB',
      headers: {
        'Content-type': 'application/json'
      }
    });

    t.equal(res.statusCode, 204);

    const obj = await getObject(fastify, {
      name: 'myObject',
      env: 'development',
      version: '3.0.2'
    });
    t.deepEqual(obj, [
      {
        name: 'myObject',
        env: 'development',
        version: '3.0.2',
        data: 'data from CDN api',
        variant: 'en-US'
      }
    ]);
  });

  t.test('delete object', async (t) => {
    t.plan(2);

    await createObject(fastify, {
      name: 'myObject',
      version: '3.0.2',
      env: 'development',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });

    const res = await fastify.inject({
      method: 'DELETE',
      url: '/objects/myObject/development/3.0.2',
      headers: {
        'Content-type': 'application/json'
      }
    });

    t.equal(res.statusCode, 204);

    const obj = await getObject(fastify, {
      name: 'myObject',
      env: 'development',
      version: '3.0.2'
    });

    t.equal(obj, null);
  });
});
