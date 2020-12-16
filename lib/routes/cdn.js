const ms = require('ms');

const MIN_EXP_MS = 5 * 60 * 1000;

module.exports = async function (fastify) {
  fastify.route({
    method: 'POST',
    url: '/cdn',
    schema: {
      querystring: {
        type: 'object',
        properties: {
          expiration: { type: ['string', 'number'] }
        }
      }
    },
    security: [
      {
        authorization: []
      }
    ],
    preHandler: fastify.auth([fastify.verifyAuthentication]),
    handler: async (req, res) => {
      const {
        query: { expiration }
      } = req;
      const nowMs = Date.now();
      let expTimestamp = null;
      if (expiration && typeof expiration === 'string') {
        const milliseconds = ms(expiration);
        if (!milliseconds) {
          throw fastify.httpErrors.badRequest(
            `'${expiration}' is not a valid expiration value`
          );
        }
        expTimestamp = nowMs + milliseconds;
      } else if (expiration) {
        expTimestamp = expiration;
      }

      if (expTimestamp && expTimestamp - nowMs < MIN_EXP_MS) {
        throw fastify.httpErrors.badRequest(
          `Expiration '${expiration}' is less than ${ms(MIN_EXP_MS)}`
        );
      }

      const wrhsAssets = await fastify.tarballToAssets(req.raw);
      const { files, metadata: metas } = wrhsAssets;
      await fastify.uploadAssetFilesToStorage(files, expTimestamp);
      res.send({
        fingerprints: files.map((file) => `${file.id}.gz`),
        recommended: files.map((file) => `${file.id}/${file.name}`),
        files: files.map((file) => {
          const filepath = `${file.id}/${file.name}`;
          return {
            url: `${fastify.config.cdnBaseUrl}/${filepath}`,
            metadata: metas[file.name]
          };
        })
      });
    }
  });
};
