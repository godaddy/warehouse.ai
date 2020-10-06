module.exports = async function (fastify) {
  fastify.get('/cdn', async function (req, res) {
    return res.send({ cnd: true });
  });
};
