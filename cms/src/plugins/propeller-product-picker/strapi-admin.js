import { ShoppingCart } from '@strapi/icons';

export default {
  register(app) {
    app.customFields.register({
      name: 'propeller-products',
      pluginId: 'propeller-product-picker',
      type: 'json',
      intlLabel: {
        id: 'propeller-product-picker.label',
        defaultMessage: 'Propeller Products',
      },
      intlDescription: {
        id: 'propeller-product-picker.description',
        defaultMessage: 'Search and select products/clusters from Propeller Commerce',
      },
      icon: ShoppingCart,
      components: {
        Input: async () =>
          import('./admin/src/components/ProductPickerInput'),
      },
    });
  },
};
