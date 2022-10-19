/* eslint-disable no-shadow, max-statements */

const { test } = require('tap');
const {
  build,
  getEnvs,
  getEnv,
  createEnv,
  createEnvAlias,
  createObject
} = require('../helper');

test('Enviroments API', async (t) => {
  const fastify = build(t);

  t.plan(8);

  t.test('create an enviroment', async (t) => {
    t.plan(3);

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects/myObject/envs',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        env: 'development'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.same(body, { created: true });

    const envs = await getEnvs(fastify, {
      name: 'myObject'
    });
    t.same(envs, [
      { name: 'myObject', env: 'development', aliases: ['development'] }
    ]);
  });

  t.test('cannot create the same enviroment twice', async (t) => {
    t.plan(2);

    // This creates development enviroment together with the object variant
    await createObject(fastify, {
      name: 'myObjectA',
      version: '2.0.0',
      env: 'development',
      data: 'data from CDN api',
      variant: 'it-IT'
    });

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects/myObjectA/envs',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        env: 'development'
      })
    });

    t.equal(res.statusCode, 409);

    const body = JSON.parse(res.payload);
    t.same(body.message, 'Enviroment already exists');
  });

  t.test('get enviroments', async (t) => {
    t.plan(2);

    await createEnv(fastify, {
      name: 'myObject2',
      env: 'test'
    });

    await createEnv(fastify, {
      name: 'myObject2',
      env: 'production'
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/objects/myObject2/envs'
    });

    t.equal(res.statusCode, 200);

    const body = JSON.parse(res.payload);
    t.same(body, [
      { name: 'myObject2', env: 'production', aliases: ['production'] },
      { name: 'myObject2', env: 'test', aliases: ['test'] }
    ]);
  });

  t.test('create an enviroment alias', async (t) => {
    t.plan(5);

    await createEnv(fastify, {
      name: 'myObject3',
      env: 'development'
    });

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects/myObject3/envs/development/aliases',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        alias: 'dev'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.same(body, { created: true });

    const res2 = await fastify.inject({
      method: 'POST',
      url: '/objects/myObject3/envs/dev/aliases',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        alias: 'devo'
      })
    });

    t.equal(res.statusCode, 201);

    const body2 = JSON.parse(res2.payload);
    t.same(body2, { created: true });

    const env = await getEnv(fastify, {
      name: 'myObject3',
      env: 'development'
    });
    t.same(env, {
      name: 'myObject3',
      env: 'development',
      aliases: ['devo', 'dev', 'development']
    });
  });

  t.test('get enviroment using alias', async (t) => {
    t.plan(4);

    await createEnv(fastify, {
      name: 'myObject4',
      env: 'production'
    });

    await createEnvAlias(fastify, {
      name: 'myObject4',
      env: 'production',
      alias: 'prod'
    });

    const res1 = await fastify.inject({
      method: 'GET',
      url: '/objects/myObject4/envs'
    });

    t.equal(res1.statusCode, 200);

    const body1 = JSON.parse(res1.payload);
    t.same(body1, [
      { name: 'myObject4', env: 'production', aliases: ['prod', 'production'] }
    ]);

    const res2 = await fastify.inject({
      method: 'GET',
      url: '/objects/myObject4/envs/prod'
    });

    t.equal(res2.statusCode, 200);

    const body2 = JSON.parse(res2.payload);
    t.same(body2, {
      name: 'myObject4',
      env: 'production',
      aliases: ['prod', 'production']
    });
  });

  t.test('cannot create an alias twice', async (t) => {
    t.plan(4);

    await createEnv(fastify, {
      name: 'myObjectB',
      env: 'production'
    });

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects/myObjectB/envs/production/aliases',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        alias: 'prod'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.same(body, { created: true });

    const res2 = await fastify.inject({
      method: 'POST',
      url: '/objects/myObjectB/envs/production/aliases',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        alias: 'prod'
      })
    });

    t.equal(res2.statusCode, 409);

    const body2 = JSON.parse(res2.payload);
    t.same(body2.message, 'Enviroment alias already exists');
  });

  t.test('cannot create an alias for a non existing enviroment', async (t) => {
    t.plan(2);

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects/myObjectC/envs/development/aliases',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        alias: 'dev'
      })
    });

    t.equal(res.statusCode, 404);

    const body = JSON.parse(res.payload);
    t.same(body.message, 'Enviroment not found');
  });

  t.test('cannot create the same alias for two different envs', async (t) => {
    t.plan(4);

    await createEnv(fastify, {
      name: 'myObjectD',
      env: 'development'
    });

    await createEnv(fastify, {
      name: 'myObjectD',
      env: 'production'
    });

    const res = await fastify.inject({
      method: 'POST',
      url: '/objects/myObjectD/envs/development/aliases',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        alias: 'custom'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.same(body, { created: true });

    const res2 = await fastify.inject({
      method: 'POST',
      url: '/objects/myObjectD/envs/production/aliases',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        alias: 'custom'
      })
    });

    t.equal(res2.statusCode, 409);

    const body2 = JSON.parse(res2.payload);
    t.same(body2.message, 'Enviroment alias already exists');
  });
});

/* eslint-enable no-shadow, max-statements */
