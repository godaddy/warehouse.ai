const { version } = require('../package.json');

module.exports = {
  openapi: '3.0.2',
  info: {
    title: 'Warehouse.ai',
    version,
    description: 'Warehouse.ai'
  },
  apis: [
    './lib/routes/*.js',
    './lib/npm/routes.js'
  ]
};
