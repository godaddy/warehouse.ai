/* eslint-disable no-shadow, max-statements */

const { test } = require('tap');
const {
  build,
  getHook,
  createHook,
  createObject,
  setHead
} = require('../helper');
const nock = require('nock');

test('Hooks API', async (t) => {
  const fastify = build(t);

  t.plan(4);

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
    t.same(
      bodyAll.sort((a, b) => {
        if (b.url < a.url) {
          return -1;
        } else if (b.url > a.url) {
          return 1;
        }
        return 0;
      }),
      [
        { name: 'hookObjectB', id: googleHookId, url: 'https://google.com' },
        { name: 'hookObjectB', id: godaddyHookId, url: 'https://godaddy.com' }
      ]
    );

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

  t.test('trigger hook on head changes', async (t) => {
    t.plan(2);

    await Promise.all([
      createObject(fastify, {
        name: 'triggerHookA',
        version: '1.0.0',
        env: 'development',
        data: 'data from CDN api',
        variant: 'en-US'
      }),
      createObject(fastify, {
        name: 'triggerHookA',
        version: '1.0.0',
        env: 'test',
        data: 'data from CDN api',
        variant: 'en-US'
      })
    ]);

    const scope01 = nock('http://uxp.godaddy.com')
      .post('/webhooks', {
        event: 'NEW_RELEASE',
        data: {
          object: 'triggerHookA',
          environment: 'development',
          version: '1.0.0',
          previousVersion: null
        }
      })
      .reply(200, { ok: true });

    const scope02 = nock('http://xd.godaddy.com')
      .post('/info', {
        event: 'NEW_RELEASE',
        data: {
          object: 'triggerHookA',
          environment: 'development',
          version: '1.0.0',
          previousVersion: null
        }
      })
      .reply(200, { ok: true });

    await createHook(fastify, {
      name: 'triggerHookA',
      url: 'http://uxp.godaddy.com/webhooks'
    });

    await createHook(fastify, {
      name: 'triggerHookA',
      url: 'http://xd.godaddy.com/info'
    });

    await setHead(fastify, {
      name: 'triggerHookA',
      env: 'development',
      version: '1.0.0'
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    t.equal(scope01.isDone(), true);
    t.equal(scope02.isDone(), true);
  });
});

/* eslint-enable no-shadow, max-statements */
