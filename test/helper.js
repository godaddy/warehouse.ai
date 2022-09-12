const createFastify = require('fastify');
const fp = require('fastify-plugin');
const warehouse = require('../lib/warehouse');

const OBJECT_HISTORY_TABLE = 'warehouse-object-history';

function build(t) {
  const fastify = createFastify({
    logger: {
      level: 'debug',
      prettyPrint: true
    }
  });
  fastify.decorate('verifyAuthentication', async function () {});
  // Expose all decorators for testing purposes
  fastify.register(fp(warehouse), {
    useLocalstack: true,
    cdnBaseUrl: 'https://cdn-example.com'
  });
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

  if (res.statusCode === 404) {
    return null;
  } else if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object head');
  }

  return JSON.parse(res.payload);
}

async function setHead(f, { name, env, version }) {
  const res = await f.inject({
    method: 'PUT',
    url: `/objects/${name}/${env}`,
    headers: {
      'Content-type': 'application/json'
    },
    payload: JSON.stringify({ head: version })
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while setting the object head');
  }
}

async function getObject(f, { name, env, version }) {
  let url;
  if (version) {
    url = `/objects/${name}?env=${env}&version=${version}`;
  } else {
    url = `/objects/${name}?env=${env}`;
  }

  const res = await f.inject({
    method: 'GET',
    url
  });

  if (res.statusCode === 404) {
    return null;
  } else if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object');
  }

  return JSON.parse(res.payload);
}

async function getHistoryRecords(f, { name, env }) {
  const params = {
    KeyConditionExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': `${name}_${env}`
    },
    TableName: OBJECT_HISTORY_TABLE
  };
  const { Items: items } = await f.dynamo.query(params).promise();
  return items;
}

async function createEnv(f, data) {
  const res = await f.inject({
    method: 'POST',
    url: `/envs/${data.name}`,
    headers: {
      'Content-type': 'application/json'
    },
    payload: JSON.stringify({ env: data.env })
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while creating a new object');
  }
}

async function getEnvs(f, data) {
  const res = await f.inject({
    method: 'GET',
    url: `/envs/${data.name}`,
    headers: {
      'Content-type': 'application/json'
    }
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object envs');
  }

  return JSON.parse(res.payload);
}

module.exports = {
  build,
  createObject,
  getHead,
  getHistoryRecords,
  getObject,
  setHead,
  createEnv,
  getEnvs
};
