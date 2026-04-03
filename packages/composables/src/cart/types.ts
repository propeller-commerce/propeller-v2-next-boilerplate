import type {
  GraphQLClient,
  Cart,
  Contact,
  Customer,
  Product,
  Cluster,
  CartMainItem,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';
import type { AsyncState } from '../core/types';

export interface CartComposableConfig {
  graphqlClient: GraphQLClient;
  user?: Contact | Customer | null;
  companyId?: number;
  language?: string;
  createCart?: boolean;
  imageSearchFilters?: MediaImageProductSearchInput;
  imageVariantFilters?: TransformationsInput;
}

export interface CartState extends AsyncState {
  cart: Cart | null;
  cartId: string | null;
  addingItem: boolean;
  lastAddedItem: CartMainItem | null;
}

export interface AddItemInput {
  product: Product;
  quantity: number;
  cluster?: Cluster;
  childItems?: number[];
  notes?: string;
  price?: number;
}

export interface CartComposable {
  getState: () => CartState;
  subscribe: (listener: () => void) => () => void;
  resolveOrCreateCart: () => Promise<Cart>;
  addItem: (input: AddItemInput) => Promise<Cart>;
  updateItemQuantity: (itemId: string, quantity: number) => Promise<Cart>;
  deleteItem: (itemId: string) => Promise<Cart>;
  setCart: (cart: Cart) => void;
  clearCart: () => void;
}
