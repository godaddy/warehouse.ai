const fp = require('fastify-plugin');

const ENVS_TABLE = 'warehouse-envs';
const ENV_ALIASES_TABLE = 'warehouse-env-aliases';

/**
 * @typedef {import('../warehouse').WarehouseApp} WarehouseApp
 */

/**
 * Return a clean Env record
 *
 * @param {Object} record Env record
 * @returns {Object} JSON object
 */
function cleanEnvRecord(record) {
  const { keyname: name, env, aliases } = record;
  return { name, env, aliases };
}

/**
 * Return a clean Env Alias record
 *
 * @param {Object} record Env Alias record
 * @returns {Object} JSON object
 */
function cleanEnvAliasRecord(record) {
  const { keyname: name, alias, env } = record;
  return { name, alias, env };
}

module.exports = fp(
  /**
   * Initialize Object plugin
   *
   * @param {WarehouseApp} fastify Fastify instance
   * @returns {Promise<void>} Promise representing plugin initialization result
   */
  async function (fastify) {
    const { dynamo } = fastify;

    fastify.decorate(
      'getEnvs',
      /**
       * Get an Object environments
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @returns {Promise<Object>} The object
       */
      async function getEnvs({ name: keyname }) {
        const { Items: objEnvs } = await dynamo
          .query({
            KeyConditionExpression: 'keyname = :name',
            ExpressionAttributeValues: {
              ':name': keyname
            },
            TableName: ENVS_TABLE
          })
          .promise();
        return objEnvs.map((obj) => cleanEnvRecord(obj));
      }
    );

    fastify.decorate(
      'getEnv',
      /**
       * Get an Object environment
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Object environment
       * @returns {Promise<Object>} The object
       */
      async function getEnv({ name: keyname, env }) {
        const params = {
          Key: { keyname, env },
          TableName: ENVS_TABLE
        };
        const { Item: item } = await dynamo.get(params).promise();
        if (!item) return null;
        return cleanEnvRecord(item);
      }
    );

    fastify.decorate(
      'getEnvAlias',
      /**
       * Get an Object environment alias
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.alias Object environment alias
       * @returns {Promise<Object>} The object
       */
      async function getEnvAlias({ name: keyname, alias }) {
        const params = {
          Key: { keyname, alias },
          TableName: ENV_ALIASES_TABLE
        };
        const { Item: item } = await dynamo.get(params).promise();
        if (!item) return null;
        return cleanEnvAliasRecord(item);
      }
    );

    fastify.decorate(
      'createEnv',
      /**
       * Create environment for object
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @returns {Promise<void>} The operation result
       */
      async function createEnv({ name: keyname, env }) {
        const transactItems = [
          {
            Put: {
              Item: {
                keyname,
                env,
                aliases: [env]
              },
              TableName: ENVS_TABLE
            }
          },
          {
            Put: {
              Item: {
                keyname,
                alias: env,
                env
              },
              TableName: ENV_ALIASES_TABLE
            }
          }
        ];

        return dynamo.transactWrite({ TransactItems: transactItems }).promise();
      }
    );

    fastify.decorate(
      'createEnvAlias',
      /**
       * Create alias for an environment
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {string} opts.alias Alias
       * @returns {Promise<void>} The operation result
       */
      async function createEnvAlias({ name: keyname, env, alias }) {
        const transactItems = [
          {
            Put: {
              Item: {
                keyname,
                alias,
                env
              },
              TableName: ENV_ALIASES_TABLE
            }
          },
          {
            Update: {
              TableName: ENVS_TABLE,
              Key: { keyname, env },
              UpdateExpression:
                'SET #aliases = list_append(:newAliases, #aliases)',
              ExpressionAttributeNames: {
                '#aliases': 'aliases'
              },
              ExpressionAttributeValues: {
                ':newAliases': [alias]
              }
            }
          }
        ];

        return dynamo.transactWrite({ TransactItems: transactItems }).promise();
      }
    );
  },
  {
    fastify: '3.x',
    name: 'env',
    decorators: {
      fastify: ['dynamo']
    },
    dependencies: ['aws']
  }
);
