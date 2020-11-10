const fp = require('fastify-plugin');

const OBJECTS_TABLE = 'warehouse-objects';
const OBJECT_VARIANTS_TABLE = 'warehouse-object-variants';
const OBJECTS_HISTORY_TABLE = 'warehouse-objects-history';

/**
 * Return a clean JSON obect.
 *
 * @param {Object} record Variant record
 * @returns {Object} JSON object
 */
function cleanVariantRecord(record) {
  const { keyname: name, env, data, version } = record;
  return { name, env, version, data };
}

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
        name: keyname,
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
            keyname,
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
      'deleteObject',
      /**
       * Delete an Object from the Ledger.
       *
       * @param {Object} opts Method parameters
       * @param {string} opts.name Object name
       * @param {string} opts.env Environment
       * @returns {Promise<Object>} The operation result
       */
      async function deleteObject({ name, env }) {
        const { Items: objVariants } = await dynamo
          .scan({
            FilterExpression: 'keyname = :name AND env = :env',
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
       * Get an Object variant from the Ledger.
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
        return cleanVariantRecord(item);
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
     * Get all Object variants from the Ledger.
     *
     * @param {Object} opts Method parameters
     * @param {string} opts.name Object name
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
     * Get all Object versions.
     *
     * @param {Object} opts Method parameters
     * @param {string} opts.name Object name
     * @param {string} opts.env Environment
     * @returns {Promise<string[]>} List with all object versions
     */
    fastify.decorate(
      'getAllObjectVersions',
      async function getAllObjectVersions({ name, env }) {
        const params = {
          FilterExpression: 'keyname = :name AND env = :env',
          ExpressionAttributeValues: {
            ':name': name,
            ':env': env
          },
          TableName: OBJECT_VARIANTS_TABLE
        };
        const { Items: items } = await dynamo.scan(params).promise();
        const results = items.map((item) => item.version);
        return Array.from(new Set(results));
      }
    );

    /**
     * Delete all Object variants from the Ledger.
     *
     * @param {Object} opts Method parameters
     * @param {string} opts.name Object name
     * @param {string} opts.env Environment
     * @returns {Promise<any>} Operation result
     */
    // fastify.decorate(
    //   'deleteAllObjectVariants',
    //   async function deleteAllObjectVariants({ name, version, env }) {
    //     // TODO
    //   }
    // );

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
      async function putObjectVariant({
        name: keyname,
        version,
        env,
        variant = '_default',
        expiration = null,
        data
      }) {
        const now = new Date();
        const obj = await fastify.getObject({ name: keyname, env });

        // TODO(jdaeli): if obj exists
        // compare versions and update
        // only if `version` > `obj.latestVerison`
        const putObjParams = {
          Put: {
            Item: {
              keyname,
              env,
              headVersion: null,
              headTimestamp: null,
              ...obj,
              latestVersion: version,
              lastModified: now.toUTCString()
            },
            TableName: OBJECTS_TABLE
          }
        };

        const id = `${keyname}_${version}_${env}`;
        const createdAt = now.toUTCString();
        const putObjVariantParams = {
          Put: {
            Item: {
              id,
              keyname,
              version,
              env,
              variant,
              expiration,
              data,
              createdAt
            },
            TableName: OBJECT_VARIANTS_TABLE
          }
        };

        return dynamo
          .transactWrite({ TransactItems: [putObjParams, putObjVariantParams] })
          .promise();
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
