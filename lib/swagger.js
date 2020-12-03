const { version } = require('../package.json');

module.exports = {
  openapi: '3.0.2',
  info: {
    title: 'Warehouse',
    version,
    description: 'Warehouse API endpoints'
  }
};
