const fp = require('fastify-plugin');
const finger = require('fingerprinting');
const tar = require('tar');

const CDN_BUCKET = 'warehouse-cdn';

/**
 * @typedef {import('aws-sdk').S3.PutObjectOutput} AWSPutObjectResponse
 * @typedef {import('stream').Readable} ReadableStream
 * @typedef {import('buffer').Buffer } Buffer
 * @typedef {Object<string, Object>} AssetsMetadata
 */
/**
 * @typedef {Object} WrhsAssetFile
 * @property {string} id
 * @property {string} name
 * @property {Buffer} data
 */
/**
 * @typedef {Object} WrhsAssets
 * @property {AssetsMetadata} metadata
 * @property {WrhsAssetFile[]} files
 */

module.exports = fp(
  /**
   * Initialize CDN plugin
   * @param {import('../warehouse').WarehouseApp} fastify
   * @returns {Promise<void>} Promise representing plugin initialization result
   */
  async function (fastify) {
    const { s3: storage } = fastify;

    fastify.decorate(
      'streamToBuffer',
      /**
       * Convert a data stream to buffer.
       * @param {ReadableStream} stream - Data stream
       * @returns {Promise<Buffer>} Data buffer
       */
      function streamToBuffer(stream) {
        let data = '';
        return new Promise((resolve, reject) => {
          stream.on('data', (chunk) => {
            data += chunk;
          });
          stream.on('error', reject);
          stream.on('finish', () => resolve(data));
        });
      }
    );

    fastify.decorate(
      'tarballToAssets',
      /**
       * Unpack tarball and process files and metadata.
       * @param {ReadableStream} stream - Tarball readable stream
       * @returns {Promise<WrhsAssets>} Warehouse assets
       */
      async function tarballToAssets(stream) {
        const files = [];
        let metadata = {};

        await new Promise((resolve, reject) => {
          stream
            .pipe(tar.t())
            .on('entry', async (entry) => {
              const {
                header: { path: filename }
              } = entry;
              fastify.log.info(`Processing file ${filename}`);
              const buffer = await fastify.streamToBuffer(entry);
              if (filename === '_metadata.json') {
                const unsafeJson = buffer.toString('utf8');
                fastify.log.debug(unsafeJson);
                try {
                  metadata = JSON.parse(unsafeJson);
                } catch (err) {
                  fastify.log.warning(err);
                  stream.removeAllListeners('entry');
                  reject(err);
                }
                return;
              }
              const { id } = finger(filename, { content: buffer });
              files.push({ id, name: filename, data: buffer });
            })
            .on('error', reject)
            .on('finish', resolve);
        });

        return { metadata, files };
      }
    );

    fastify.decorate(
      'uploadFileToStorage',
      /**
       * Upload file to S3 storage service.
       * @param {Object} opts Method parameters
       * @param {string} opts.filepath File path
       * @param {number} [opts.expiration] Expiration timestamp
       * @param {Buffer} opts.data File data
       * @returns {Promise<AWSPutObjectResponse>} Operation result
       */
      function uploadFileToStorage({ filepath, data, expiration }) {
        return storage
          .putObject({
            Body: data,
            Bucket: CDN_BUCKET,
            Key: filepath,
            Expires: expiration
          })
          .promise();
      }
    );

    fastify.decorate(
      'uploadAssetFilesToStorage',
      /**
       * Upload Warehouse assets to storage.
       * @param {WrhsAssetFile[]} files - Warehouse asset files
       * @param {number} [expiration] - Assets expiration timestamp
       * @returns {Promise<AWSPutObjectResponse[]>} Operation result
       */
      function uploadAssetFilesToStorage(files, expiration) {
        return Promise.all(
          files.map(({ id, name, data }) => {
            const filepath = `${id}/${name}`;
            return fastify.uploadFileToStorage({
              filepath,
              data,
              expiration
            });
          })
        );
      }
    );
  },
  {
    fastify: '3.x',
    name: 'cdn',
    decorators: {
      fastify: ['s3']
    },
    dependencies: ['aws']
  }
);
