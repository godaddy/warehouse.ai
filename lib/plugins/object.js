const fp = require('fastify-plugin');

const OBJECTS_TABLE = 'warehouse-objects';
const OBJECT_VARIANTS_TABLE = 'warehouse-object-variants';
const OBJECTS_HISTORY_TABLE = 'warehouse-objects-history';

module.exports = fp(
  async function (fastify) {
    const { dynamo } = fastify;

    fastify.decorate(
      'getObject',
      /**
       * Get an Object from the Ledger.
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @returns {Promise<Object>} The object
       */
      async function getObject({ name, env }) {
        const params = {
          Key: { name, env },
          TableName: OBJECTS_TABLE
        };
        const { Item: item } = await dynamo.get(params).promise();
        return item;
      }
    );

    fastify.decorate(
      'putObject',
      /**
       * Put an Object into the Ledger.
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.latestVersion Latest object version
       * @param {string} opts.env Environment
       * @param {string} opts.headVersion Current head object version
       * @param {number} opts.headTimestamp Timestamp of when the head has been set
       * @returns {Promise<Object>} The operation result
       */
      function putObject({
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
          Item: {
            name,
            env,
            latestVersion,
            headVersion,
            headTimestamp,
            lastModified
          },
          TableName: OBJECTS_TABLE
        };
        return dynamo.put(params).promise();
      }
    );

    fastify.decorate(
      'getObjectVariant',
      /**
       * Get an Object variant from the Ledger.
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {string} [opts.variant] Object variant
       * @returns {Promise<Object>} The object variant
       */
      async function getObjectVariant({
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
      }
    );

    fastify.decorate(
      'getObjectVariants',
      /**
       * Get multiple Object variants from the Ledger.
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {string} [opts.variant] Object variant
       * @returns {Promise<[Object]>} List of object variants
       */
      async function getObjectVariants({ name, version, env, variants }) {
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
      }
    );

    /**
     * Get all Object variants from the Ledger.
     *
     * @param {Object} opts Method parameters
     * @param {string} opts.name Object name
     * @param {string} opts.env Environment
     * @param {string} [opts.variant] Object variant name. Default `_default`
     * @returns {Promise<[Object]>} List of all object variants
     */
    fastify.decorate(
      'getAllObjectVariants',
      async function getAllObjectVariants({ name, version, env }) {
        const params = {
          KeyConditionExpression: 'HashKey = :hkey',
          ExpressionAttributeValues: {
            ':hkey': `${name}_${version}_${env}`
          },
          TableName: OBJECT_VARIANTS_TABLE
        };
        const { Items: items } = await dynamo.query(params).promise();
        return items;
      }
    );

    fastify.decorate(
      'putObjectVariant',
      /**
       * Put an Object variant into the Ledger.
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {string} [opts.variant] Object variant name. Default `_default`
       * @param {string} opts.expiration Optional variant expiration. Default `never`
       * @param {any} opts.data Object variant data
       * @returns {Promise<Object>} The operation result
       */
      function putObjectVariant({
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
          Item: {
            id,
            name,
            version,
            env,
            variant,
            expiration,
            data,
            createdAt
          },
          TableName: OBJECT_VARIANTS_TABLE
        };
        return dynamo.put(params).promise();
      }
    );

    fastify.decorate(
      'putObjectHistory',
      /**
       * Create an object history record to track object changes.
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.headVersion Head version
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {number} [opts.prevTimestamp] Previus changes timestamp
       * @returns {Promise<Object>} The operation result
       */

      function putObjectHistory({
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
      }
    );
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
