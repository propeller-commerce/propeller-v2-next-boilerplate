import { GraphQLClient, GraphQLClientConfig } from 'propeller-sdk-v2';
import { ProductService, CartService, UserService, CategoryService, OrderService, PayMethodService } from 'propeller-sdk-v2';

// Use the Next.js API proxy endpoint instead of direct GraphQL endpoint
const endpoint = '/api/graphql';

const config: GraphQLClientConfig = {
  endpoint,
  apiKey: '', // API key is handled by the proxy
  orderEditorApiKey: process.env.NEXT_PUBLIC_ORDER_EDITOR_API_KEY || '',
  timeout: parseInt(process.env.NEXT_PUBLIC_TIMEOUT || '30000', 10),
  headers: {},
};

export const graphqlClient = new GraphQLClient(config);

export const productService = new ProductService(graphqlClient);
export const cartService = new CartService(graphqlClient);
export const userService = new UserService(graphqlClient);
export const categoryService = new CategoryService(graphqlClient);
export const orderService = new OrderService(graphqlClient);
export const payMethodService = new PayMethodService(graphqlClient);

export { config as graphqlConfig };
