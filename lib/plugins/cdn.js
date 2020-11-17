const fp = require('fastify-plugin');

const CDN_BUCKET = 'warehouse-cdn';

module.exports = fp(
  async function (fastify) {
    const { s3: storage } = fastify;
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
