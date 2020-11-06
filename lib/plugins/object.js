const fp = require('fastify-plugin');

const OBJECTS_TABLE = 'warehouse-objects';
const OBJECT_VARIANTS_TABLE = 'warehouse-object-variants';
const OBJECTS_HISTORY_TABLE = 'warehouse-objects-history';

module.exports = fp(
  async function (fastify) {
    const { dynamo } = fastify;

    fastify.decorate('getObject', async function ({ name, env }) {
      const params = {
        Key: { name, env },
        TableName: OBJECTS_TABLE
      };
      const { Item: item } = await dynamo.get(params).promise();
      return item;
    });

    fastify.decorate('putObject', function ({
      name,
      latestVersion,
      env,
      headVersion = null,
      headTimestamp = null
    }) {
      const now = new Date();
      if (headVersion && !headTimestamp) {
        headTimestamp = now.getTime();
      }
      const lastModified = now.toUTCString();
      const params = {
        Key: {
          name,
          env,
          latestVersion,
          headVersion,
          headTimestamp,
          lastModified
        },
        TableName: OBJECTS_TABLE
      };
      return new Promise((resolve, reject) => {
        dynamo.get(params, function (err, data) {
          if (err) return reject(err);
          resolve(data);
        });
      });
    });

    fastify.decorate('getObjectVariant', async function ({
      name,
      version,
      env,
      variant = '_default'
    }) {
      const id = `${name}_${version}_${env}`;
      const params = {
        Key: { id, variant },
        TableName: OBJECTS_TABLE
      };
      const { Item: item } = await dynamo.get(params).promise();
      return item;
    });

    fastify.decorate('getObjectVariants', async function ({
      name,
      version,
      env,
      variants
    }) {
      const id = `${name}_${version}_${env}`;
      const params = {
        RequestItems: {
          [OBJECTS_TABLE]: {
            Keys: variants.map((variant) => {
              return { id, variant };
            })
          }
        }
      };
      const { Responses: results } = await dynamo.batchGet(params).promise();
      return results.map((result) => result.Item);
    });

    fastify.decorate('getAllObjectVariants', async function ({
      name,
      version,
      env
    }) {
      const params = {
        KeyConditionExpression: 'HashKey = :hkey',
        ExpressionAttributeValues: {
          ':hkey': `${name}_${version}_${env}`
        },
        TableName: OBJECT_VARIANTS_TABLE
      };
      const { Items: items } = await dynamo.query(params).promise();
      return items;
    });

    fastify.decorate('putObjectVariant', function ({
      name,
      version,
      env,
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
      env,
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
  },
  {
    fastify: '3.x',
    name: 'object',
    decorators: {
      fastify: ['dynamo']
    },
    dependencies: ['dynamo']
  }
);
