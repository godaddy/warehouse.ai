/* eslint-disable no-shadow, max-statements */

const { test } = require('tap');
const {
  build,
  getEnvs,
  // getEnvAlias,
  createEnv
  // createEnvAlias
} = require('../helper');

test('Enviroments API', async (t) => {
  const fastify = build(t);

  t.plan(2);

  t.test('create an enviroment', async (t) => {
    t.plan(3);

    const res = await fastify.inject({
      method: 'POST',
      url: '/envs/myObject',
      headers: {
        'Content-type': 'application/json'
      },
      payload: JSON.stringify({
        env: 'development'
      })
    });

    t.equal(res.statusCode, 201);

    const body = JSON.parse(res.payload);
    t.deepEqual(body, { created: true });

    const envs = await getEnvs(fastify, {
      name: 'myObject'
    });
    t.deepEqual(envs, [
      { name: 'myObject', env: 'development', aliases: ['development'] }
    ]);
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

    const resObj2 = await fastify.inject({
      method: 'GET',
      url: '/envs/myObject2'
    });

    t.equal(resObj2.statusCode, 200);

    const bodyObj2 = JSON.parse(resObj2.payload);
    t.deepEqual(bodyObj2, [
      { name: 'myObject2', env: 'test', aliases: ['test'] },
      { name: 'myObject2', env: 'production', aliases: ['production'] }
    ]);
  });
});
/* eslint-enable max-statements */
