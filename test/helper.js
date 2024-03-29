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
  t.teardown(fastify.close.bind(fastify));
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

async function getHeads(f, { name }) {
  const res = await f.inject({
    method: 'GET',
    url: `/head/${name}`,
    headers: {
      'Content-type': 'application/json'
    }
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object heads');
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
    url: `/objects/${data.name}/envs`,
    headers: {
      'Content-type': 'application/json'
    },
    payload: JSON.stringify({ env: data.env })
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while creating a new env');
  }
}

async function createEnvAlias(f, data) {
  const res = await f.inject({
    method: 'POST',
    url: `/objects/${data.name}/envs/${data.env}/aliases`,
    headers: {
      'Content-type': 'application/json'
    },
    payload: JSON.stringify({ alias: data.alias })
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while creating a new env alias');
  }
}

async function getEnvs(f, data) {
  const res = await f.inject({
    method: 'GET',
    url: `/objects/${data.name}/envs`,
    headers: {
      'Content-type': 'application/json'
    }
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object envs');
  }

  return JSON.parse(res.payload);
}

async function getEnv(f, data) {
  const res = await f.inject({
    method: 'GET',
    url: `/objects/${data.name}/envs/${data.env}`,
    headers: {
      'Content-type': 'application/json'
    }
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object env');
  }

  return JSON.parse(res.payload);
}

async function createHook(f, data) {
  const res = await f.inject({
    method: 'POST',
    url: `/objects/${data.name}/hooks`,
    headers: {
      'Content-type': 'application/json'
    },
    payload: JSON.stringify({ url: data.url })
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while creating a new hook');
  }

  return JSON.parse(res.payload).id;
}

async function getHooks(f, data) {
  const res = await f.inject({
    method: 'GET',
    url: `/objects/${data.name}/hooks`,
    headers: {
      'Content-type': 'application/json'
    }
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object hooks');
  }

  return JSON.parse(res.payload);
}

async function getHook(f, data) {
  const res = await f.inject({
    method: 'GET',
    url: `/objects/${data.name}/hooks/${data.id}`,
    headers: {
      'Content-type': 'application/json'
    }
  });

  if (res.statusCode > 399) {
    throw new Error('An error occourred while getting the object hook');
  }

  return JSON.parse(res.payload);
}

module.exports = {
  build,
  createObject,
  getHead,
  getHeads,
  getHistoryRecords,
  getObject,
  setHead,
  createEnv,
  createEnvAlias,
  getEnvs,
  getEnv,
  createHook,
  getHooks,
  getHook
};
