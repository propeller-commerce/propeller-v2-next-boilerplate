import type { ReactNode } from 'react';
import './tracker.css';

/**
 * /tracker layout.
 *
 * ponytail: ungated by request — gate before deploy. This page exposes every
 * account's behaviour and revenue to anyone with the URL, which is fine on a
 * local box and is not fine anywhere shared. The reminder lives here rather
 * than only in the plan document.
 */
export const metadata = {
  title: 'Storefront tracker',
  robots: { index: false, follow: false },
};

export default function TrackerLayout({ children }: { children: ReactNode }) {
  return children;
}
