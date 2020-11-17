const fp = require('fastify-plugin');

const CDN_BUCKET = 'warehouse-cdn';

/**
 * @typedef {import('stream').Readable} ReadableStream
 * @typedef {import('buffer').Buffer } Buffer
 */

module.exports = fp(
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
        return new Promise((resolve) => {
          stream.on('data', (chunk) => {
            data += chunk;
          });
          stream.on('finish', () => resolve(data));
        });
      }
    );

    fastify.decorate(
      'uploadToStorage',
      /**
       * Upload file to S3 storage service.
       * @param {string} filepath - File path
       * @param {Buffer} data - File data
       * @returns {Promise<any>} Operation result
       */
      function uploadToStorage(filepath, data) {
        return storage
          .putObject({
            Body: data,
            Bucket: CDN_BUCKET,
            Key: filepath
          })
          .promise();
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
