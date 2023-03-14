const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');

const HOOKS_TABLE = 'warehouse-hooks';

/**
 * @typedef {import('../warehouse').WarehouseApp} WarehouseApp
 */

/**
 * Return a clean Hook record
 *
 * @param {Object} record Hook record
 * @returns {Object} JSON object
 */
function cleanHookRecord(record) {
  const { id, keyname: name, url } = record;
  return { id, name, url };
}

module.exports = fp(
  /**
   * Initialize Hook plugin
   *
   * @param {WarehouseApp} fastify Fastify instance
   * @returns {Promise<void>} Promise representing plugin initialization result
   */
  async function (fastify) {
    const { dynamo } = fastify;

    fastify.decorate(
      'getHooks',
      /**
       * Get an Object hooks
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @returns {Promise<Object>} The object
       */
      async function getHooks({ name: keyname }) {
        const { Items: hooks } = await dynamo
          .query({
            KeyConditionExpression: 'keyname = :name',
            ExpressionAttributeValues: {
              ':name': keyname
            },
            TableName: HOOKS_TABLE
          })
          .promise();
        return hooks.map((hook) => cleanHookRecord(hook));
      }
    );

    fastify.decorate(
      'getHook',
      /**
       * Get an Object hook
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.id Hook id
       * @returns {Promise<Object>} The hook
       */
      async function getHook({ name: keyname, id }) {
        const params = {
          Key: { keyname, id },
          TableName: HOOKS_TABLE
        };
        const { Item: item } = await dynamo.get(params).promise();
        if (!item) return null;
        return cleanHookRecord(item);
      }
    );

    fastify.decorate(
      'createHook',
      /**
       * Create hook for object
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.url Hook URL
       * @returns {Promise<string>} The hook id
       */
      async function createHook({ name: keyname, url }) {
        const id = uuidv4();

        await dynamo
          .put({
            Item: {
              keyname,
              id,
              url
            },
            TableName: HOOKS_TABLE
          })
          .promise();

        return id;
      }
    );

    fastify.decorate(
      'deleteHook',
      /**
       * Delete an Object hook
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.id Hook id
       * @returns {Promise<void>} The hook
       */
      async function deleteHook({ name: keyname, id }) {
        const params = {
          Key: { keyname, id },
          TableName: HOOKS_TABLE
        };
        return dynamo.delete(params).promise();
      }
    );
  },
  {
    fastify: '3.x',
    name: 'hook',
    decorators: {
      fastify: ['dynamo']
    },
    dependencies: ['aws']
  }
);
