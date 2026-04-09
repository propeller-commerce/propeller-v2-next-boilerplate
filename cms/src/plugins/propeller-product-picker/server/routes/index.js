'use strict';

module.exports = {
  admin: {
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/search',
        handler: 'search.search',
        config: {
          policies: [],
        },
      },
    ],
  },
};
