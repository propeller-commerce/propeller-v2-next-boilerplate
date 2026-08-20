'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AccountsSection,
  CatalogSection,
  CheckoutSection,
  EventsSection,
  IdentitySection,
  OverviewSection,
  PagesSection,
  SearchSection,
  VisitorsSection,
} from './sections';
import { POLL_MS } from './useMetric';

/**
 * /tracker shell: sidebar, date range, section switch (PWP-910).
 *
 * The range picker is a pair of native `<input type="date">` — no picker
 * library. Sections are grouped by subject rather than by event name, because a
 * rep thinks in questions ("what did this account do?"), not in taxonomies.
 */

import { SECTIONS, SECTION_GROUPS as GROUPS, type SectionId } from './config';

/** Local calendar date — the dashboard's ranges are shop-local, not UTC. */
function todayLocalISO(): string {
  const d = new Date();
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const PRESETS = [
  { label: 'Today', from: () => todayLocalISO(), to: () => todayLocalISO() },
  { label: '7 days', from: () => daysAgoISO(6), to: () => todayLocalISO() },
  { label: '30 days', from: () => daysAgoISO(29), to: () => todayLocalISO() },
  { label: '90 days', from: () => daysAgoISO(89), to: () => todayLocalISO() },
];

export default function TrackerShell({ section }: { section: SectionId }) {
  const [from, setFrom] = useState<string>(() => daysAgoISO(6));
  const [to, setTo] = useState<string>(() => todayLocalISO());

  const range = { from, to };

  return (
    <div className="viz-root min-h-screen">
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside
          className="lg:w-60 lg:min-h-screen border-b lg:border-b-0 lg:border-r p-4 shrink-0"
          style={{ borderColor: 'var(--border-1)', background: 'var(--surface-2)' }}
        >
          <div className="mb-4">
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Storefront tracker
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Live · refreshes every {POLL_MS / 1000}s
            </p>
          </div>

          <nav aria-label="Tracker sections">
            {GROUPS.map((group) => (
              <div key={group} className="mb-3">
                <div
                  className="text-[10px] uppercase tracking-wider mb-1 px-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {group}
                </div>
                <ul className="space-y-0.5">
                  {SECTIONS.filter((s) => s.group === group).map((s) => {
                    const active = s.id === section;
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/tracker/${s.id}`}
                          aria-current={active ? 'page' : undefined}
                          className="block rounded px-2 py-1.5 text-sm"
                          style={{
                            background: active ? 'var(--surface-1)' : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {s.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 lg:p-6 min-w-0">
          {/* Filters live in one row above the charts. */}
          <div className="flex flex-wrap items-end gap-3 mb-5">
            <div className="flex gap-1">
              {PRESETS.map((p) => {
                const active = from === p.from() && to === p.to();
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFrom(p.from());
                      setTo(p.to());
                    }}
                    className="rounded px-2.5 py-1.5 text-xs border"
                    style={{
                      borderColor: 'var(--border-1)',
                      background: active ? 'var(--surface-2)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              From{' '}
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="ml-1 rounded border px-2 py-1 text-xs"
                style={{
                  borderColor: 'var(--border-1)',
                  background: 'var(--surface-1)',
                  color: 'var(--text-primary)',
                }}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              To{' '}
              <input
                type="date"
                value={to}
                min={from}
                max={todayLocalISO()}
                onChange={(e) => setTo(e.target.value)}
                className="ml-1 rounded border px-2 py-1 text-xs"
                style={{
                  borderColor: 'var(--border-1)',
                  background: 'var(--surface-1)',
                  color: 'var(--text-primary)',
                }}
              />
            </label>
          </div>

          {section === 'overview' ? <OverviewSection {...range} /> : null}
          {section === 'visitors' ? <VisitorsSection {...range} /> : null}
          {section === 'identity' ? <IdentitySection {...range} /> : null}
          {section === 'pages' ? <PagesSection {...range} /> : null}
          {section === 'search' ? <SearchSection {...range} /> : null}
          {section === 'catalog' ? <CatalogSection {...range} /> : null}
          {section === 'checkout' ? <CheckoutSection {...range} /> : null}
          {section === 'accounts' ? <AccountsSection {...range} /> : null}
          {section === 'events' ? <EventsSection {...range} /> : null}
        </main>
      </div>
    </div>
  );
}
