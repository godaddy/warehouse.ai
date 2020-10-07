module.exports = async function (fastify) {
  fastify.get('/', async function (req, res) {
    res.send('Warehouse is running');
  });
};
