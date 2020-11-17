const finger = require('fingerprinting');
const tar = require('tar');

module.exports = async function (fastify) {
  fastify.route({
    method: 'POST',
    url: '/cdn',
    schema: {
      querystring: {
        type: 'object',
        properties: {
          expiration: { type: 'string' }
        }
      }
    },
    preHandler: fastify.auth([fastify.verifyAuthentication]),
    handler: async (req, res) => {
      const tarballFiles = [];
      let metas = {};

      await new Promise((resolve) => {
        req.raw
          .pipe(tar.t())
          .on('entry', async (entry) => {
            const {
              header: { path: filename }
            } = entry;
            fastify.log.info(`Processing file ${filename}`);
            const buffer = await fastify.streamToBuffer(entry);
            if (filename === '_metadata.json') {
              metas = buffer;
              return;
            }
            const { id } = finger(filename, { content: buffer });
            tarballFiles.push({ id, name: filename, data: buffer });
          })
          .on('finish', resolve);
      });

      await Promise.all(
        tarballFiles.map(({ id, name, data }) => {
          const filepath = `${id}/${name}`;
          return fastify.uploadToStorage(filepath, data);
        })
      );

      res.send({
        fingerprints: tarballFiles.map((file) => `${file.id}.gz`),
        recommended: tarballFiles.map((file) => `${file.id}/${file.name}`),
        files: tarballFiles.map((file) => {
          const filepath = `${file.id}/${file.name}`;
          return {
            url: `${fastify.config.baseCdnUrl}/${filepath}`,
            metadata: metas[file.id]
          };
        })
      });
    }
  });
};
