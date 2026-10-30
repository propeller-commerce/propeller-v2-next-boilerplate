import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { checkTrackerAccess } from '@/lib/tracker/access';
import './tracker.css';

// Basic-auth gated in proxy.ts; re-checked here in case the proxy is bypassed.
export const metadata = {
  title: 'Storefront tracker',
  robots: { index: false, follow: false },
};

export default async function TrackerLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  if (!checkTrackerAccess(requestHeaders.get('authorization')).ok) notFound();
  return children;
}
