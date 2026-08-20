/**
 * Tracking types (PWP-910).
 *
 * Deliberately framework-agnostic plain TS: the bus knows nothing about React,
 * about GA4, about a database or about an endpoint. Consumers subscribe and
 * decide. See `tracker.ts`.
 */

/** Anonymous / B2C customer / B2B contact. Mirrors the package's `UserMode`. */
export type UserMode = 'anonymous' | 'b2c' | 'b2b';

/**
 * Which surface an interaction came from.
 *
 * This is the dimension that makes the data worth collecting: the same
 * `add_to_cart` means very different things from a category grid, a search
 * result or a PDP. Without it you can count carts; with it you can answer
 * "did search work?".
 */
export type SourceType =
  | 'pdp'
  // The cart page itself: quantity edits and removals originate here, not from
  // whichever surface first added the line.
  | 'cart'
  | 'category'
  | 'search'
  | 'cluster'
  | 'favorites'
  | 'quick_order'
  | 'reorder'
  | 'cms_block'
  | 'slider'
  | 'machine'
  | 'spare_parts'
  | 'punchout';

export interface TrackingSource {
  type: SourceType;
  id?: number | null;
  name?: string | null;
  /** 1-based index within the list. */
  position?: number | null;
  page?: number | null;
  /** Present when type === 'search'. */
  searchTerm?: string | null;
  /** Ties an add/click back to the exact result set that produced it. */
  queryId?: string | null;
}

/**
 * Per-session context, attached to every event. Global by nature — one user,
 * one company, one language at a time — which is why it lives on a mutable
 * singleton rather than in React context. (Source is the opposite: per-subtree.)
 */
export interface TrackingContext {
  channelId: number;
  userMode: UserMode;
  contactId: number | null;
  customerId: number | null;
  companyId: number | null;
  visitorId: string;
  sessionId: string;
  language: string | null;
  currency: string | null;
}

export interface TrackedEvent {
  name: string;
  /** Client clock. Clamped server-side at ingest when implausible. */
  ts: number;
  /** Idempotency key — deduped in the bus and again by a unique index. */
  key: string;
  context: TrackingContext;
  props: Record<string, unknown>;
}

export type Subscriber = (event: TrackedEvent) => void;
