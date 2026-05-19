/**
 * mergeAnonymousCart — copies items from an anonymous cart into a target
 * (authenticated) cart by calling CartService.addItemToCart per item.
 *
 * Framework-agnostic: shared between Vue (`propeller-vue`) and React
 * (`propeller-next`).
 */

import { getServices } from '@/lib/api';
import type {
  Cart,
  CartMainItem,
  GraphQLClient,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';

export interface MergeAnonymousCartConfig {
  graphqlClient: GraphQLClient;
  /** The authenticated user's cart that anonymous items will be added to. */
  targetCartId: string;
  /** The anonymous cart from the store/state captured before authentication. */
  anonymousCart: Cart | null;
  language: string;
  imageSearchFilters: MediaImageProductSearchInput;
  imageVariantFilters: TransformationsInput;
}

export async function mergeAnonymousCart(
  cfg: MergeAnonymousCartConfig,
): Promise<Cart | null> {
  const items = cfg.anonymousCart?.items ?? [];
  if (!items.length) return null;
  // Skip if anonymous cart IS the target — guards against self-merge.
  if (
    cfg.anonymousCart?.cartId &&
    cfg.anonymousCart.cartId === cfg.targetCartId
  ) {
    return null;
  }

  const service = getServices(cfg.graphqlClient).cart;
  let result: Cart | null = null;

  // Serial iteration: each call returns the full cart, so parallel races.
  for (const item of items as CartMainItem[]) {
    if (!item.productId || !item.quantity) continue;

    const childItems = item.childItems
      ?.filter((c: any) => c.productId)
      .map((c: any) => ({
        productId: c.productId,
        quantity: c.quantity ?? item.quantity,
      }));

    try {
      result = await service.addItemToCart({
        id: cfg.targetCartId,
        input: {
          productId: item.productId,
          quantity: item.quantity,
          ...(item.clusterId && { clusterId: item.clusterId }),
          ...(childItems && childItems.length > 0 && { childItems }),
          ...(item.notes && { notes: item.notes }),
        },
        language: cfg.language,
        imageSearchFilters: cfg.imageSearchFilters,
        imageVariantFilters: cfg.imageVariantFilters,
      });
    } catch (e) {
      console.error(
        '[mergeAnonymousCart] addItemToCart failed for productId=' +
        item.productId,
        e,
      );
    }
  }

  return result;
}
