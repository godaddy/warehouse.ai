const { compareVersions } = require('compare-versions/lib/umd');
const fp = require('fastify-plugin');

const OBJECTS_TABLE = 'warehouse-objects';
const OBJECT_VARIANTS_TABLE = 'warehouse-object-variants';
const OBJECT_HISTORY_TABLE = 'warehouse-object-history';

const ENVS_TABLE = 'warehouse-envs';
const ENV_ALIASES_TABLE = 'warehouse-env-aliases';

/**
 * @typedef {import('../warehouse').WarehouseApp} WarehouseApp
 */

/**
 * Return a clean JSON obect
 *
 * @param {Object} record Variant record
 * @returns {Object} JSON object
 */
function cleanVariantRecord(record) {
  const { keyname: name, env, data, version, variant } = record;
  return { name, env, version, data, variant };
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
      'getObject',
      /**
       * Get an Object from the Ledger
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @returns {Promise<Object>} The object
       */
      async function getObject({ name: keyname, env }) {
        const params = {
          Key: { keyname, env },
          TableName: OBJECTS_TABLE
        };
        const { Item: item } = await dynamo.get(params).promise();
        return item;
      }
    );

    fastify.decorate(
      'setHead',
      /**
       * Set object head
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {string} opts.version Head object version
       * @param {number} [opts.timestamp] Timestamp of when the head has been set
       * @param {number} [opts.prevTimestamp] Timestamp of when the head has been previusly set
       * @returns {Promise<any>} The operation result
       */
      function setHead({
        name: keyname,
        env,
        version: headVersion,
        timestamp = null,
        prevTimestamp
      }) {
        const now = new Date();
        if (!timestamp) {
          timestamp = now.getTime();
        }

        const transactItems = [
          {
            Put: {
              Item: {
                id: `${keyname}_${env}`,
                timestamp,
                headVersion,
                prevTimestamp
              },
              TableName: OBJECT_HISTORY_TABLE
            }
          },
          {
            Update: {
              TableName: OBJECTS_TABLE,
              Key: { keyname, env },
              UpdateExpression:
                'set headVersion = :hv, headTimestamp = :ht, lastModified = :lm',
              // Ensure: 1. no duplicates in history, 2. optimistic locking
              ConditionExpression: 'headVersion <> :hv and headTimestamp = :pt',
              ExpressionAttributeValues: {
                ':hv': headVersion,
                ':ht': timestamp,
                ':pt': prevTimestamp,
                ':lm': now.toUTCString()
              }
            }
          }
        ];

        return dynamo.transactWrite({ TransactItems: transactItems }).promise();
      }
    );

    fastify.decorate(
      'getHistoryRecord',
      /**
       * Get history record
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {number} opts.timestamp Timestamp of when the head has been set
       * @returns {Promise<any>} The operation result
       */
      async function getHistoryRecord({ name, env, timestamp }) {
        const { Item: item } = await dynamo
          .get({
            Key: {
              id: `${name}_${env}`,
              timestamp
            },
            TableName: OBJECT_HISTORY_TABLE
          })
          .promise();

        return item;
      }
    );

    fastify.decorate(
      'getHistoryRecords',
      /**
       * Get history records
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @returns {Promise<any>} The operation result
       */
      async function getHistoryRecords({ name, env }) {
        const { Items: items } = await dynamo
          .query({
            KeyConditionExpression: 'id = :id',
            ExpressionAttributeValues: {
              ':id': `${name}_${env}`
            },
            TableName: OBJECT_HISTORY_TABLE
          })
          .promise();

        return items;
      }
    );

    fastify.decorate(
      'deleteObject',
      /**
       * Delete an Object from the Ledger
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @returns {Promise<any>} The operation result
       */
      async function deleteObject({ name, env }) {
        const { Items: objVariants } = await dynamo
          .query({
            IndexName: 'keyname-env-index',
            KeyConditionExpression: 'keyname = :name AND env = :env',
            ExpressionAttributeValues: {
              ':name': name,
              ':env': env
            },
            TableName: OBJECT_VARIANTS_TABLE
          })
          .promise();

        const params = objVariants.reduce(
          (acc, obj) => {
            const { variant, version } = obj;
            const id = `${name}_${version}_${env}`;
            acc.TransactItems.push({
              Delete: {
                Key: { id, variant },
                TableName: OBJECT_VARIANTS_TABLE
              }
            });
            return acc;
          },
          {
            TransactItems: [
              {
                Delete: {
                  Key: { keyname: name, env },
                  TableName: OBJECTS_TABLE
                }
              }
            ]
          }
        );

        return dynamo.transactWrite(params).promise();
      }
    );

    fastify.decorate(
      'getObjectVariant',
      /**
       * Get an Object variant from the Ledger
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {string} [opts.variant] Object variant. Default `_default`
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
          TableName: OBJECT_VARIANTS_TABLE
        };
        const { Item: item } = await dynamo.get(params).promise();
        return item ? cleanVariantRecord(item) : null;
      }
    );

    fastify.decorate(
      'deleteObjectVariant',
      /**
       * Delete an Object variant from the Ledger
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.version Object version
       * @param {string} opts.env Environment
       * @param {string} [opts.variant='_default'] Object variant
       * @returns {Promise<any>} The operation result
       */
      function deleteObjectVariant({
        name,
        version,
        env,
        variant = '_default'
      }) {
        const id = `${name}_${version}_${env}`;
        const params = {
          Key: { id, variant },
          TableName: OBJECT_VARIANTS_TABLE
        };
        return dynamo.delete(params).promise();
      }
    );

    fastify.decorate(
      'checkAndFixCorruptedHead',
      /**
       * Properly ensure the object head is correctly
       * pointing to existing object versions and
       * fix it otherwise.
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @returns {Promise<boolean>} Return true if head was corrupted, false otherwise
       */
      async function checkAndFixCorruptededHead({ name, env }) {
        const [obj, objVariants] = await Promise.all([
          fastify.getObject({ name, env }),
          fastify.getAllObjectVersions({ name, env })
        ]);

        if (objVariants.length === 0) {
          // Delete object version
          await fastify.deleteObject({ name, env });
          return true;
        }

        const { headVersion, latestVersion } = obj;

        const newHeadVersion = objVariants.includes(headVersion)
          ? headVersion
          : null;

        let newLatestVersion;
        if (!objVariants.includes(latestVersion)) {
          // Get the new latest available version
          newLatestVersion = objVariants.sort(compareVersions)[
            objVariants.length - 1
          ];
        } else {
          newLatestVersion = latestVersion;
        }

        // Update db record if head was corrupted
        if (
          newHeadVersion !== headVersion ||
          newLatestVersion !== latestVersion
        ) {
          await dynamo
            .update({
              TableName: OBJECTS_TABLE,
              Key: { keyname: name, env },
              UpdateExpression:
                'set headVersion = :newHeadVersion, latestVersion = :newLatestVersion',
              ConditionExpression:
                'headVersion = :headVersion and latestVersion = :latestVersion',
              ExpressionAttributeValues: {
                ':newHeadVersion': newHeadVersion,
                ':newLatestVersion': newLatestVersion,
                ':headVersion': headVersion,
                ':latestVersion': latestVersion
              }
            })
            .promise();

          return true;
        }

        return false;
      }
    );

    fastify.decorate(
      'deleteObjectVersion',
      /**
       * Delete an Object version from the Ledger
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.version Object version
       * @param {string} opts.env Environment
       * @returns {Promise<any>} The operation result
       */
      async function deleteObjectVersion({ name, version, env }) {
        const id = `${name}_${version}_${env}`;
        const objVariants = await fastify.getAllObjectVariants({
          name,
          env,
          version
        });

        // TODO(jdaeli): Handle more than 25 variants cases

        const params = objVariants.reduce(
          (acc, obj) => {
            const { variant } = obj;
            acc.TransactItems.push({
              Delete: {
                Key: { id, variant },
                TableName: OBJECT_VARIANTS_TABLE
              }
            });
            return acc;
          },
          {
            TransactItems: []
          }
        );

        return dynamo.transactWrite(params).promise();
      }
    );

    fastify.decorate(
      'getObjectVariants',
      /**
       * Get multiple Object variants from the Ledger
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {string[]} opts.variants Object variant
       * @returns {Promise<Object[]>} List of object variants
       */
      async function getObjectVariants({ name, version, env, variants }) {
        const id = `${name}_${version}_${env}`;
        const params = {
          RequestItems: {
            [OBJECT_VARIANTS_TABLE]: {
              Keys: variants.map((variant) => {
                return { id, variant };
              })
            }
          }
        };
        const { Responses: results } = await dynamo.batchGet(params).promise();
        return results[OBJECT_VARIANTS_TABLE].map((item) =>
          cleanVariantRecord(item)
        );
      }
    );

    /**
     * Get all Object variants from the Ledger
     *
     * @param {Object} opts Method parameters
     * @param {string} opts.name Object name
     * @param {string} opts.version Object version
     * @param {string} opts.env Environment
     * @returns {Promise<Object[]>} List of all object variants
     */
    fastify.decorate(
      'getAllObjectVariants',
      async function getAllObjectVariants({ name, version, env }) {
        const params = {
          KeyConditionExpression: 'id = :hkey',
          ExpressionAttributeValues: {
            ':hkey': `${name}_${version}_${env}`
          },
          TableName: OBJECT_VARIANTS_TABLE
        };
        const { Items: items } = await dynamo.query(params).promise();
        return items.map((item) => cleanVariantRecord(item));
      }
    );

    /**
     * Get all Object versions
     *
     * @param {Object} opts Method parameters
     * @param {string} opts.name Object name
     * @param {string} opts.env Environment
     * @returns {Promise<string[]>} A list of all the object versions
     */
    fastify.decorate(
      'getAllObjectVersions',
      async function getAllObjectVersions({ name, env }) {
        const params = {
          IndexName: 'keyname-env-index',
          KeyConditionExpression: 'keyname = :name AND env = :env',
          ExpressionAttributeValues: {
            ':name': name,
            ':env': env
          },
          TableName: OBJECT_VARIANTS_TABLE
        };
        const { Items: items } = await dynamo.query(params).promise();
        const results = items.map((item) => item.version);
        return Array.from(new Set(results));
      }
    );

    fastify.decorate(
      'putObjectVariant',
      /**
       * Put an Object variant into the Ledger
       *
       * @param {Object} params Method parameters
       * @param {string} params.name Object name
       * @param {string} params.env Environment
       * @param {string} [params.variant] Object variant name. Default `_default`
       * @param {string} params.expiration Optional variant expiration. Default `never`
       * @param {any} params.data Object variant data
       * @param {Object} opts Method options
       * @param {boolean} [opts.forceCreateEnv] Force to create environment
       * @returns {Promise<any>} The operation result
       */
      async function putObjectVariant(
        {
          name: keyname,
          version,
          env,
          variant = '_default',
          expiration = null,
          data
        },
        { forceCreateEnv = false } = {}
      ) {
        const now = new Date().toUTCString();
        const obj = await fastify.getObject({ name: keyname, env });

        const transactItems = [];

        const objItem = {
          keyname,
          env,
          headVersion: null,
          headTimestamp: null,
          ...obj,
          latestVersion: version,
          lastModified: now
        };

        if (!obj) {
          transactItems.push({
            Put: {
              Item: objItem,
              ConditionExpression: 'attribute_not_exists(keyname)',
              TableName: OBJECTS_TABLE
            }
          });
        } else if (compareVersions(version, obj.latestVersion) > 0) {
          transactItems.push({
            Put: {
              Item: objItem,
              ConditionExpression: 'latestVersion = :lv',
              ExpressionAttributeValues: {
                ':lv': obj.latestVersion
              },
              TableName: OBJECTS_TABLE
            }
          });
        }

        const id = `${keyname}_${version}_${env}`;
        transactItems.push({
          Put: {
            Item: {
              id,
              keyname,
              version,
              env,
              variant,
              expiration,
              data,
              createdAt: now
            },
            TableName: OBJECT_VARIANTS_TABLE
          }
        });

        if (forceCreateEnv) {
          transactItems.push({
            Put: {
              Item: {
                keyname,
                env,
                aliases: [env]
              },
              TableName: ENVS_TABLE
            }
          });
          transactItems.push({
            Put: {
              Item: {
                keyname,
                alias: env,
                env
              },
              TableName: ENV_ALIASES_TABLE
            }
          });
        }

        return dynamo.transactWrite({ TransactItems: transactItems }).promise();
      }
    );

    fastify.decorate(
      'putObjectHistory',
      /**
       * Create an object history record to track object changes
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.headVersion Head version
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @param {number} [opts.prevTimestamp] Previus changes timestamp
       * @returns {Promise<any>} The operation result
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
          TableName: OBJECT_HISTORY_TABLE
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
    dependencies: ['aws']
  }
);
