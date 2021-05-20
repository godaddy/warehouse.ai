const { version, description, name: title } = require('../package.json');

module.exports = {
  info: {
    title,
    version,
    description
  },
  consumes: ['application/json'],
  produces: ['application/json']
};
