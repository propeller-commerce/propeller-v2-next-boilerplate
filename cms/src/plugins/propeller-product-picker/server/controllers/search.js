'use strict';

const SEARCH_QUERY = `
  query SearchProducts(
    $input: ProductSearchInput
    $imageSearchFilters: MediaImageProductSearchInput
    $imageVariantFilters: TransformationsInput!
  ) {
    products(input: $input) {
      itemsFound
      items {
        ... on Product {
          productId
          sku
          names { value }
          slugs { value }
          price { gross net }
          media {
            images(search: $imageSearchFilters) {
              items {
                imageVariants(input: $imageVariantFilters) { url }
              }
            }
          }
        }
        ... on Cluster {
          clusterId
          sku
          names { value }
          slugs { value }
          defaultProduct {
            sku
            price { gross net }
            media {
              images(search: $imageSearchFilters) {
                items {
                  imageVariants(input: $imageVariantFilters) { url }
                }
              }
            }
          }
        }
      }
    }
  }
`;

function mapItem(item) {
  const isCluster = 'clusterId' in item && item.clusterId != null;
  const displayItem = isCluster ? item.defaultProduct : item;
  const id = isCluster ? item.clusterId : item.productId;
  const imageUrl =
    displayItem?.media?.images?.items?.[0]?.imageVariants?.[0]?.url ||
    item.media?.images?.items?.[0]?.imageVariants?.[0]?.url ||
    '';

  return {
    id,
    name: item.names?.[0]?.value || 'Product',
    sku: item.sku || displayItem?.sku || '',
    price: displayItem?.price?.gross || 0,
    imageUrl,
    isCluster,
  };
}

module.exports = {
  async search(ctx) {
    const endpoint = process.env.BOILERPLATE_GRAPHQL_ENDPOINT;
    const apiKey = process.env.BOILERPLATE_API_KEY;

    if (!endpoint || !apiKey) {
      ctx.status = 500;
      ctx.body = {
        error:
          'Missing BOILERPLATE_GRAPHQL_ENDPOINT or BOILERPLATE_API_KEY env vars',
      };
      return;
    }

    const term = ctx.query.term || '';
    const language = ctx.query.language || 'NL';
    const offset = parseInt(ctx.query.offset, 10) || 10;

    if (term.length < 2) {
      ctx.body = { items: [], itemsFound: 0 };
      return;
    }

    const variables = {
      input: {
        term,
        language,
        page: 1,
        offset,
        statuses: ['A', 'P', 'T', 'S'],
        hidden: false,
        sortInputs: [{ field: 'RELEVANCE', order: 'DESC' }],
      },
      imageSearchFilters: { page: 1, offset: 1 },
      imageVariantFilters: {
        transformations: [
          {
            name: 'thumb',
            transformation: {
              format: 'WEBP',
              height: 100,
              width: 100,
              fit: 'BOUNDS',
            },
          },
        ],
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({ query: SEARCH_QUERY, variables }),
      });

      const json = await response.json();

      if (json.errors) {
        ctx.status = 502;
        ctx.body = { error: 'GraphQL error', details: json.errors };
        return;
      }

      const products = json.data?.products;
      const items = (products?.items || []).map(mapItem);

      ctx.body = {
        items,
        itemsFound: products?.itemsFound || 0,
      };
    } catch (err) {
      ctx.status = 502;
      ctx.body = { error: 'Failed to fetch from Propeller API', message: err.message };
    }
  },
};
