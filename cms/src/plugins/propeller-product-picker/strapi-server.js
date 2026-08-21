'use strict';

const register = require('./server/register');
const searchController = require('./server/controllers/search');
const routes = require('./server/routes');

module.exports = {
  register,
  controllers: {
    search: searchController,
  },
  routes,
};
