'use strict';

module.exports = ({ strapi }) => {
  strapi.customFields.register({
    name: 'propeller-products',
    plugin: 'propeller-product-picker',
    type: 'json',
  });
};
