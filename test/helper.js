const createFastify = require('fastify');
const fp = require('fastify-plugin');
const warehouse = require('../lib/warehouse');

function build(t) {
  const fastify = createFastify({
    logger: {
      level: 'debug',
      prettyPrint: true
    }
  });
  fastify.decorate('verifyAuthentication', async function () {});
  // Expose all decorators for testing purposes
  fastify.register(fp(warehouse), { useLocalstack: true });
  t.tearDown(fastify.close.bind(fastify));
  return fastify;
}

async function createObject(f, data) {
  const res = await f.inject({
    method: 'POST',
    url: '/objects',
    headers: {
      'Content-type': 'application/json'
    },
    payload: JSON.stringify(data)
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while creating a new object');
  }
}

async function getHead(f, { name, env }) {
  const res = await f.inject({
    method: 'GET',
    url: `/head/${name}/${env}`,
    headers: {
      'Content-type': 'application/json'
    }
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object head');
  }

  return JSON.parse(res.payload);
}

async function getObject(f, { name, env, version }) {
  const res = await f.inject({
    method: 'GET',
    url: `/objects/${name}?env=${env}&version=${version}`
  });

  if (res.statusCode === 404) {
    return null;
  } else if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object');
  }

  return JSON.parse(res.payload);
}

module.exports = {
  build,
  createObject,
  getHead,
  getObject
};
