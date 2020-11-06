const fp = require('fastify-plugin');

const OBJECTS_TABLE = 'warehouse-objects';
const OBJECT_VARIANTS_TABLE = 'warehouse-object-variants';
const OBJECTS_HISTORY_TABLE = 'warehouse-objects-history';

module.exports = fp(async function (fastify) {
  const { dynamo } = fastify;

  fastify.decorate('getObject', function ({
    name,
    env = 'production'
  }) {
    const params = {
      Key: { name, env },
      TableName: OBJECTS_TABLE
    };
    return dynamo.get(params).promise();
  });

  fastify.decorate('putObject', function ({
    name,
    latestVersion,
    env = 'production',
    headVersion = null,
    headTimestamp = null
  }) {
    const now = new Date();
    if (headVersion && !headTimestamp) {
      headTimestamp = now.getTime();
    }
    const lastModified = now.toUTCString();
    const params = {
      Key: { name, env, latestVersion, headVersion, headTimestamp, lastModified },
      TableName: OBJECTS_TABLE
    };
    return new Promise((resolve, reject) => {
      dynamo.get(params, function (err, data) {
        if (err) return reject(err);
        resolve(data);
      });
    });
  });

  fastify.decorate('getObjectVariant', function ({
    name,
    version,
    env = 'production',
    variant = '_default'
  }) {
    const id = `${name}_${version}_${env}`;
    const params = {
      Key: { id, variant },
      TableName: OBJECTS_TABLE
    };
    return dynamo.query(params).promise();
  });

  fastify.decorate('getObjectVariants', function ({
    name,
    version,
    env = 'production'
  }) {
    const params = {
      KeyConditionExpression: 'HashKey = :hkey',
      ExpressionAttributeValues: {
        ':hkey': `${name}_${version}_${env}`
      },
      TableName: OBJECT_VARIANTS_TABLE
    };
    return dynamo.query(params).promise();
  });

  fastify.decorate('putObjectVariant', function ({
    name,
    version,
    env = 'production',
    variant = '_default',
    expiration = null,
    data
  }) {
    const createdAt = new Date().toUTCString();
    const id = `${name}_${version}_${env}`;
    const params = {
      Item: { id, name, version, env, variant, expiration, data, createdAt },
      TableName: OBJECT_VARIANTS_TABLE
    };
    return dynamo.put(params).promise();
  });

  fastify.decorate('putObjectHistory', function ({
    name,
    headVersion,
    env = 'production',
    prevTimestamp = null
  }) {
    const timestamp = Date.now();
    const id = `${name}_${env}`;
    const params = {
      Item: { id, timestamp, headVersion, prevTimestamp },
      TableName: OBJECTS_HISTORY_TABLE
    };
    return dynamo.put(params).promise();
  });

}, {
  fastify: '3.x',
  name: 'object',
  decorators: {
    fastify: ['dynamo']
  },
  dependencies: ['dynamo']
});
