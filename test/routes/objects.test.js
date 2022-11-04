/* eslint-disable no-shadow, max-statements */

const { test } = require('tap');
const {
  build,
  createObject,
  getHead,
  getHeads,
  getHistoryRecords,
  getObject,
  setHead,
  createEnv,
  getEnvs,
  createEnvAlias
} = require('../helper');

test('Objects API', async (t) => {
  const fastify = build(t);

  t.plan(15);

  t.test('create object', async (t) => {
    t.plan(4);

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
    t.same(body, { created: true });

    const head = await getHead(fastify, {
      name: 'myObject',
      env: 'development'
    });
    t.same(head, {
      headVersion: null,
      latestVersion: '3.0.2'
    });

    const envs = await getEnvs(fastify, {
      name: 'myObject'
    });

    t.same(envs, [
      {
        name: 'myObject',
        env: 'development',
        aliases: ['development']
      }
    ]);
  });

  t.test('get objects', async (t) => {
    t.plan(4);

    await createObject(fastify, {
      name: 'myObject',
      version: '3.0.2',
      env: 'development',
      data: 'data from CDN api',
      variant: 'en-US'
    });

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
    t.same(bodyLast, [
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
        '/objects/myObject?env=development&version=3.0.2&accepted_variants=en-GB,en-US'
    });

    t.equal(res302.statusCode, 200);

    const body302 = JSON.parse(res302.payload);
    t.same(body302, [
      {
        name: 'myObject',
        env: 'development',
        version: '3.0.2',
        data: 'data from CDN api',
        variant: 'en-GB'
      }
    ]);
  });

  t.test('set object head', async (t) => {
    t.plan(8);

    const resNotFound = await fastify.inject({
      method: 'PUT',
      url: '/objects/myObject/development',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        head: '3.0.1'
      })
    });

    t.equal(resNotFound.statusCode, 404);

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

    const historyRecords = await getHistoryRecords(fastify, {
      name: 'myObject',
      env: 'development'
    });
    t.equal(historyRecords.length, 1);
    t.equal(historyRecords[0].headVersion, '3.0.2');
    t.equal(historyRecords[0].prevTimestamp, null);

    const res409Req = await fastify.inject({
      method: 'PUT',
      url: '/objects/myObject/development',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        head: '3.0.2'
      })
    });

    t.equal(res409Req.statusCode, 409);

    const resHead = await fastify.inject({
      method: 'GET',
      url: '/objects/myObject?env=development'
    });

    t.equal(resHead.statusCode, 200);

    const bodyHead = JSON.parse(resHead.payload);
    t.same(bodyHead, [
      {
        name: 'myObject',
        env: 'development',
        version: '3.0.2',
        data: 'data from CDN api',
        variant: 'en-GB'
      },
      {
        name: 'myObject',
        env: 'development',
        version: '3.0.2',
        data: 'data from CDN api',
        variant: 'en-US'
      }
    ]);
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
    t.same(head, {
      headVersion: '3.0.2',
      latestVersion: '3.0.3'
    });
  });

  t.test('get object heads', async (t) => {
    t.plan(2);

    const res = await fastify.inject({
      method: 'GET',
      url: '/head/myObject',
      headers: {
        'Content-type': 'application/json'
      }
    });

    t.equal(res.statusCode, 200);

    const heads = JSON.parse(res.payload);
    t.same(heads, [
      {
        environment: 'development',
        headVersion: '3.0.2',
        latestVersion: '3.0.3'
      }
    ]);
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
    t.same(obj, [
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
      name: 'myNewAwesomeObject',
      version: '3.0.1',
      env: 'development',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });

    await createObject(fastify, {
      name: 'myNewAwesomeObject',
      version: '3.0.2',
      env: 'development',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });

    const res = await fastify.inject({
      method: 'DELETE',
      url: '/objects/myNewAwesomeObject/development',
      headers: {
        'Content-type': 'application/json'
      }
    });

    t.equal(res.statusCode, 204);

    const obj = await getObject(fastify, {
      name: 'newObject',
      env: 'development'
    });

    t.equal(obj, null);
  });

  t.test('delete latest object version', async (t) => {
    t.plan(4);

    await createObject(fastify, {
      name: 'newObject',
      version: '3.0.1',
      env: 'development',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });

    await setHead(fastify, {
      name: 'newObject',
      env: 'development',
      version: '3.0.1'
    });

    await createObject(fastify, {
      name: 'newObject',
      version: '3.0.2',
      env: 'development',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });

    const res = await fastify.inject({
      method: 'DELETE',
      url: '/objects/newObject/development/3.0.2',
      headers: {
        'Content-type': 'application/json'
      }
    });

    t.equal(res.statusCode, 204);

    const [obj302, objHead] = await Promise.all([
      getObject(fastify, {
        name: 'newObject',
        env: 'development',
        version: '3.0.2'
      }),
      getHead(fastify, {
        name: 'newObject',
        env: 'development'
      })
    ]);

    t.equal(obj302, null);
    t.equal(objHead.latestVersion, '3.0.1');
    t.equal(objHead.headVersion, '3.0.1');
  });

  t.test('delete head object version', async (t) => {
    t.plan(4);

    await createObject(fastify, {
      name: 'newObjectX',
      version: '3.0.1',
      env: 'production',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });

    await setHead(fastify, {
      name: 'newObjectX',
      env: 'production',
      version: '3.0.1'
    });

    await createObject(fastify, {
      name: 'newObjectX',
      version: '3.0.2',
      env: 'production',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });

    const res = await fastify.inject({
      method: 'DELETE',
      url: '/objects/newObjectX/production/3.0.1',
      headers: {
        'Content-type': 'application/json'
      }
    });

    t.equal(res.statusCode, 204);

    const [obj301, objHead] = await Promise.all([
      getObject(fastify, {
        name: 'newObjectX',
        env: 'production',
        version: '3.0.1'
      }),
      getHead(fastify, {
        name: 'newObjectX',
        env: 'production'
      })
    ]);

    t.equal(obj301, null);
    t.equal(objHead.headVersion, null);
    t.equal(objHead.latestVersion, '3.0.2');
  });

  t.test('delete all object versions', async (t) => {
    t.plan(3);

    await createObject(fastify, {
      name: 'newObjectA',
      version: '3.0.1',
      env: 'test',
      data: 'data from CDN api',
      variant: 'en-US'
    });

    await setHead(fastify, {
      name: 'newObjectA',
      env: 'test',
      version: '3.0.1'
    });

    const res = await fastify.inject({
      method: 'DELETE',
      url: '/objects/newObjectA/test/3.0.1',
      headers: {
        'Content-type': 'application/json'
      }
    });

    t.equal(res.statusCode, 204);

    const [obj, objHead] = await Promise.all([
      getHead(fastify, {
        name: 'newObjectA',
        env: 'test'
      }),
      getHead(fastify, {
        name: 'newObjectA',
        env: 'test'
      })
    ]);

    t.equal(obj, null);
    t.equal(objHead, null);
  });

  /* eslint-disable max-statements */
  t.test('rollback head', async (t) => {
    t.plan(7);

    for (const version of ['1.0.0', '1.0.1', '1.0.2', '2.0.0']) {
      await createObject(fastify, {
        name: 'rollbackObjA',
        env: 'ote',
        data: 'data from CDN api',
        version
      });
    }

    // Return 404 since head has never been set previusly
    const res404NoHeadSet = await fastify.inject({
      method: 'PUT',
      url: '/objects/rollbackObjA/ote/rollback',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        hops: 1
      })
    });

    t.equal(res404NoHeadSet.statusCode, 404);

    await setHead(fastify, {
      name: 'rollbackObjA',
      env: 'ote',
      version: '1.0.0'
    });

    // Return 404 since head no previus version to rollback
    const res404NoPrev = await fastify.inject({
      method: 'PUT',
      url: '/objects/rollbackObjA/ote/rollback',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        hops: 1
      })
    });

    t.equal(res404NoPrev.statusCode, 404);

    await setHead(fastify, {
      name: 'rollbackObjA',
      env: 'ote',
      version: '1.0.1'
    });

    // Rollback to version 1.0.0
    const resOKHop1 = await fastify.inject({
      method: 'PUT',
      url: '/objects/rollbackObjA/ote/rollback',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        hops: 1
      })
    });

    t.equal(resOKHop1.statusCode, 204);

    const head100 = await getHead(fastify, {
      name: 'rollbackObjA',
      env: 'ote'
    });

    t.same(head100, { headVersion: '1.0.0', latestVersion: '2.0.0' });

    // Return 409 since head is already rolledback to version 1.0.0
    const res409Already = await fastify.inject({
      method: 'PUT',
      url: '/objects/rollbackObjA/ote/rollback',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        hops: 2
      })
    });

    t.equal(res409Already.statusCode, 409);

    for (const version of ['1.0.1', '1.0.2', '2.0.0']) {
      await setHead(fastify, {
        name: 'rollbackObjA',
        env: 'ote',
        version
      });
    }

    // Rollback to version 1.0.1
    const resOKHop2 = await fastify.inject({
      method: 'PUT',
      url: '/objects/rollbackObjA/ote/rollback',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        hops: 2
      })
    });

    t.equal(resOKHop2.statusCode, 204);

    const head101 = await getHead(fastify, {
      name: 'rollbackObjA',
      env: 'ote'
    });

    t.same(head101, { headVersion: '1.0.1', latestVersion: '2.0.0' });
  });

  t.test('create object in all predefinied environments', async (t) => {
    t.plan(3);

    await Promise.all([
      createEnv(fastify, {
        name: 'preObj0',
        env: 'devo'
      }),
      createEnv(fastify, {
        name: 'preObj1',
        env: 'test'
      }),
      createEnv(fastify, {
        name: 'preObj1',
        env: 'prod'
      })
    ]);

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        name: 'preObj1',
        version: '1.0.0',
        data: 'data from CDN api',
        variant: 'en-US'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.same(body, { created: true });

    const head = await getHeads(fastify, {
      name: 'preObj1'
    });
    t.same(head, [
      {
        environment: 'prod',
        headVersion: null,
        latestVersion: '1.0.0'
      },
      {
        environment: 'test',
        headVersion: null,
        latestVersion: '1.0.0'
      }
    ]);
  });

  t.test(
    'create an object in a predefinied environment using alias',
    async (t) => {
      t.plan(4);

      await createEnv(fastify, {
        name: 'preObj2',
        env: 'devo'
      });

      await createEnvAlias(fastify, {
        name: 'preObj2',
        env: 'devo',
        alias: 'development'
      });

      const headBefore = await getHeads(fastify, {
        name: 'preObj2'
      });
      t.same(headBefore, []);

      const res = await fastify.inject({
        method: 'POST',
        url: '/objects',
        headers: {
          'Content-type': 'application/json'
        },
        payload: JSON.stringify({
          name: 'preObj2',
          version: '1.0.1',
          env: 'development',
          data: 'data from CDN api',
          variant: 'en-US'
        })
      });

      t.equal(res.statusCode, 201);

      const body = JSON.parse(res.payload);
      t.same(body, { created: true });

      const headAfter = await getHeads(fastify, {
        name: 'preObj2'
      });
      t.same(headAfter, [
        {
          environment: 'devo',
          headVersion: null,
          latestVersion: '1.0.1'
        }
      ]);
    }
  );

  t.test('fail to create an object in all predefined envs', async (t) => {
    t.plan(4);

    const headBefore = await getHeads(fastify, {
      name: 'preObj3'
    });
    t.same(headBefore, []);

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        name: 'preObj3',
        version: '1.0.3',
        data: 'data from CDN api',
        variant: 'en-US'
      })
    });

    t.equal(res.statusCode, 400);

    const body = JSON.parse(res.payload);
    t.same(body, {
      statusCode: 400,
      error: 'Bad Request',
      message:
        'You must define at least one an environment or specify one with this request to create one'
    });

    const headAfter = await getHeads(fastify, {
      name: 'preObj3'
    });
    t.same(headAfter, []);
  });

  t.test('get object versions', async (t) => {
    t.plan(2);

    await createObject(fastify, {
      name: 'objV1',
      version: '3.0.0',
      env: 'development',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });
    await createObject(fastify, {
      name: 'objV1',
      version: '3.0.1',
      env: 'development',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });
    await createObject(fastify, {
      name: 'objV1',
      version: '3.0.0',
      env: 'test',
      data: 'data from CDN api',
      variant: 'fr-CA'
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/objects/objV1/versions'
    });

    t.equal(res.statusCode, 200);

    const body = JSON.parse(res.payload);
    t.same(body, [
      { version: '3.0.1', environments: ['development'] },
      { version: '3.0.0', environments: ['development', 'test'] }
    ]);
  });

  /* eslint-enable max-statements */
});
