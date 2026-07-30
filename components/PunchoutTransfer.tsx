'use client';

/**
 * Transfer-cart button for a PunchOut session. Rendered on the cart page; shows
 * itself only when the readable `punchout_active` flag cookie is present (set by
 * /api/punchout/enter). Submitting POSTs the cart id to /api/punchout/transfer,
 * which builds the OCI/cXML payload and hands the cart back to the ERP.
 */

import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';

export default function PunchoutTransfer() {
  const { cart } = useCart();
  const [active, setActive] = useState(false);

  // Read the flag after mount to avoid a hydration mismatch (server render
  // can't see document.cookie).
  useEffect(() => {
    setActive(/(?:^|;\s*)punchout_active=/.test(document.cookie));
  }, []);

  if (!active || !cart?.cartId) return null;

  return (
    <form method="POST" action="/api/punchout/transfer" className="rounded-lg border bg-card p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        You are shopping from your procurement system. Send this cart back as a requisition.
      </p>
      <input type="hidden" name="cartId" value={cart.cartId} />
      <button
        type="submit"
        className="w-full rounded-lg bg-primary px-6 py-3 text-primary-foreground transition hover:bg-primary/90"
      >
        Transfer cart to procurement
      </button>
    </form>
  );
}
