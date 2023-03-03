/* eslint-disable no-shadow, max-statements */

const { test } = require('tap');
const { build, getHook, createHook, createObject } = require('../helper');

test('Hooks API', async (t) => {
  const fastify = build(t);

  t.plan(3);

  t.test('create a hook', async (t) => {
    t.plan(2);

    await createObject(fastify, {
      name: 'hookObjectA',
      version: '1.0.0',
      env: 'test',
      data: 'data from CDN api',
      variant: 'en-US'
    });

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects/hookObjectA/hooks',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        url: 'https://google.com'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.hasProp(body, 'id');
  });

  t.test('get hooks', async (t) => {
    t.plan(4);

    await createObject(fastify, {
      name: 'hookObjectB',
      version: '1.0.0',
      env: 'test',
      data: 'data from CDN api',
      variant: 'en-US'
    });

    const googleHookId = await createHook(fastify, {
      name: 'hookObjectB',
      url: 'https://google.com'
    });

    const godaddyHookId = await createHook(fastify, {
      name: 'hookObjectB',
      url: 'https://godaddy.com'
    });

    const resAll = await fastify.inject({
      method: 'GET',
      url: '/objects/hookObjectB/hooks'
    });

    t.equal(resAll.statusCode, 200);

    const bodyAll = JSON.parse(resAll.payload);
    t.same(bodyAll, [
      { name: 'hookObjectB', id: googleHookId, url: 'https://google.com' },
      { name: 'hookObjectB', id: godaddyHookId, url: 'https://godaddy.com' }
    ]);

    const resGodaddy = await fastify.inject({
      method: 'GET',
      url: `/objects/hookObjectB/hooks/${godaddyHookId}`
    });

    t.equal(resGodaddy.statusCode, 200);

    const bodyGodaddy = JSON.parse(resGodaddy.payload);
    t.same(bodyGodaddy, {
      name: 'hookObjectB',
      id: godaddyHookId,
      url: 'https://godaddy.com'
    });
  });

  t.test('delete hooks', async (t) => {
    t.plan(4);

    await createObject(fastify, {
      name: 'hookObjectC',
      version: '1.0.0',
      env: 'test',
      data: 'data from CDN api',
      variant: 'en-US'
    });

    const [reg123HookId, fiatHookId] = await Promise.all([
      createHook(fastify, {
        name: 'hookObjectC',
        url: 'https://reg123.com'
      }),
      createHook(fastify, {
        name: 'hookObjectC',
        url: 'https://fiat.com'
      })
    ]);

    const resDelReg123 = await fastify.inject({
      method: 'DELETE',
      url: `/objects/hookObjectC/hooks/${reg123HookId}`
    });

    t.equal(resDelReg123.statusCode, 204);

    let getReg123HookErr = null;
    try {
      await getHook(fastify, {
        name: 'hookObjectC',
        id: reg123HookId
      });
    } catch (err) {
      getReg123HookErr = err;
    }

    t.hasProp(getReg123HookErr, 'message');
    t.equal(
      getReg123HookErr.message,
      'An error occourred while getting the object hook'
    );

    const fiatHook = await getHook(fastify, {
      name: 'hookObjectC',
      id: fiatHookId
    });

    t.equal(fiatHook.id, fiatHookId);
  });
});

/* eslint-enable no-shadow, max-statements */
