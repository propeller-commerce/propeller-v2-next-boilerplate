'use client';

import { useMetric } from './useMetric';
import { BarList, DataTable, Empty, FunnelBars, Panel, StatTile, TrendChart, cf, fmt, nf } from './charts';

/* Rows come back from MySQL as plain objects; kept loose on purpose. */
type Row = Record<string, unknown>;
const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const rows = (d: unknown): Row[] => (Array.isArray(d) ? (d as Row[]) : []);

export interface RangeProps {
  from: string;
  to: string;
}

/* ── Overview ──────────────────────────────────────────────────────────── */

export function OverviewSection({ from, to }: RangeProps) {
  const overview = useMetric<Row>('overview', from, to);
  const trend = useMetric<Row[]>('trend', from, to);
  const o = overview.data ?? {};

  const visits = n(o.visits);
  const orders = n(o.orders);
  const searches = n(o.searches);
  const zero = n(o.zero_result_searches);

  return (
    <div className="space-y-4">
      {/* A setup problem is already reported once, globally, by SetupBanner. */}
      {overview.error && !overview.setup ? <ErrorNote message={overview.error} /> : null}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Visits" value={visits} hint="Distinct sessions" />
        <StatTile label="Visitors" value={n(o.visitors)} hint="Distinct visitor ids" />
        <StatTile label="Page views" value={n(o.page_views)} />
        <StatTile label="Add to cart" value={n(o.add_to_carts)} />
        <StatTile label="Orders" value={orders} />
        <StatTile label="Revenue" value={cf.format(n(o.revenue))} />
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile
          label="Searches"
          value={searches}
          hint={searches > 0 ? `${Math.round((zero / searches) * 100)}% found nothing` : undefined}
        />
        <StatTile
          label="Zero-result searches"
          value={zero}
          tone={zero > 0 ? 'warning' : 'default'}
          hint="Unsatisfied purchase intent"
        />
        <StatTile label="Logins" value={n(o.logins)} />
        <StatTile label="Accounts active" value={n(o.companies)} hint="Distinct companies" />
      </div>

      <Panel title="Activity over time" subtitle="Daily totals across the selected range">
        <TrendChart
          data={rows(trend.data)}
          xKey="day"
          series={[
            { key: 'visits', label: 'Visits' },
            { key: 'page_views', label: 'Page views' },
            { key: 'add_to_carts', label: 'Add to cart' },
            { key: 'orders', label: 'Orders' },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ── Visitors ──────────────────────────────────────────────────────────── */

export function VisitorsSection({ from, to }: RangeProps) {
  const split = useMetric<Row[]>('visitor_split', from, to);
  const trend = useMetric<Row[]>('trend', from, to);
  const data = rows(split.data);

  return (
    <div className="space-y-4">
      <Panel
        title="Anonymous vs known"
        subtitle="B2B contacts, B2C customers and logged-out visitors. Summing daily visitors across days gives visits, not unique people."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList data={data} labelKey="user_mode" valueKey="visitors" colorIndex={0} />
          <DataTable
            rows={data}
            columns={[
              { key: 'user_mode', label: 'Mode' },
              { key: 'visitors', label: 'Visitors', align: 'right', format: fmt },
              { key: 'visits', label: 'Visits', align: 'right', format: fmt },
              { key: 'events', label: 'Events', align: 'right', format: fmt },
            ]}
          />
        </div>
      </Panel>

      <Panel title="Visits and visitors over time">
        <TrendChart
          data={rows(trend.data)}
          xKey="day"
          series={[
            { key: 'visits', label: 'Visits' },
            { key: 'visitors', label: 'Visitors' },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ── Pages ─────────────────────────────────────────────────────────────── */

export function PagesSection({ from, to }: RangeProps) {
  const top = useMetric<Row[]>('top_pages', from, to, 20);
  const types = useMetric<Row[]>('page_types', from, to);

  const topRows = rows(top.data).map((r) => ({
    ...r,
    label: String(r.entity_name ?? '') || `${r.page_type}${r.entity_id ? ` #${r.entity_id}` : ''}`,
  }));

  return (
    <div className="space-y-4">
      <Panel title="Most visited" subtitle="Any page type — categories, products, account screens, CMS pages">
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList data={topRows} labelKey="label" valueKey="views" colorIndex={0} />
          <DataTable
            rows={topRows}
            columns={[
              { key: 'label', label: 'Page' },
              { key: 'page_type', label: 'Type' },
              { key: 'views', label: 'Views', align: 'right', format: fmt },
              { key: 'visitors', label: 'Visitors', align: 'right', format: fmt },
            ]}
          />
        </div>
      </Panel>

      <Panel title="Where visits go" subtitle="Distribution by page type">
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList data={rows(types.data)} labelKey="page_type" valueKey="views" colorIndex={2} />
          <DataTable
            rows={rows(types.data)}
            columns={[
              { key: 'page_type', label: 'Page type' },
              { key: 'views', label: 'Views', align: 'right', format: fmt },
              { key: 'visitors', label: 'Visitors', align: 'right', format: fmt },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}

/* ── Search ────────────────────────────────────────────────────────────── */

export function SearchSection({ from, to }: RangeProps) {
  const zero = useMetric<Row[]>('zero_result_searches', from, to, 25);
  const top = useMetric<Row[]>('top_searches', from, to, 25);
  const zeroRows = rows(zero.data);

  return (
    <div className="space-y-4">
      <Panel
        title="Searches that found nothing"
        subtitle="The headline signal: a named account repeatedly finding nothing is an assortment gap with a customer attached."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList data={zeroRows} labelKey="search_term" valueKey="searches" colorIndex={1} />
          <DataTable
            rows={zeroRows}
            columns={[
              { key: 'search_term', label: 'Query' },
              { key: 'searches', label: 'Times', align: 'right', format: fmt },
              { key: 'visitors', label: 'Visitors', align: 'right', format: fmt },
              { key: 'companies', label: 'Accounts', align: 'right', format: fmt },
            ]}
          />
        </div>
      </Panel>

      <Panel title="Top searches" subtitle="All searches, whether or not they returned results">
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList data={rows(top.data)} labelKey="search_term" valueKey="searches" colorIndex={0} />
          <DataTable
            rows={rows(top.data)}
            columns={[
              { key: 'search_term', label: 'Query' },
              { key: 'searches', label: 'Times', align: 'right', format: fmt },
              { key: 'visitors', label: 'Visitors', align: 'right', format: fmt },
              { key: 'max_results', label: 'Results', align: 'right', format: fmt },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}

/* ── Catalog ───────────────────────────────────────────────────────────── */

export function CatalogSection({ from, to }: RangeProps) {
  const bySource = useMetric<Row[]>('add_to_cart_by_source', from, to);
  const data = rows(bySource.data);

  return (
    <div className="space-y-4">
      <Panel
        title="Add to cart by source"
        subtitle="Which surface actually converts — the same product added from search means something different from the same add on its PDP."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList data={data} labelKey="source_type" valueKey="adds" colorIndex={2} />
          <DataTable
            rows={data}
            columns={[
              { key: 'source_type', label: 'Source' },
              { key: 'adds', label: 'Adds', align: 'right', format: fmt },
              { key: 'visitors', label: 'Visitors', align: 'right', format: fmt },
              { key: 'value', label: 'Value', align: 'right', format: (v) => cf.format(n(v)) },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}

/* ── Checkout ──────────────────────────────────────────────────────────── */

const FUNNEL_ORDER: { key: string; label: string }[] = [
  { key: 'view_item', label: 'Product viewed' },
  { key: 'add_to_cart', label: 'Added to cart' },
  { key: 'view_cart', label: 'Cart viewed' },
  { key: 'begin_checkout', label: 'Checkout started' },
  { key: 'add_shipping_info', label: 'Shipping chosen' },
  { key: 'add_payment_info', label: 'Payment chosen' },
  { key: 'purchase', label: 'Purchased' },
];

export function CheckoutSection({ from, to }: RangeProps) {
  const funnel = useMetric<Row[]>('funnel', from, to);
  const map = new Map(rows(funnel.data).map((r) => [String(r.event_name), n(r.sessions)]));
  const steps = FUNNEL_ORDER.map((s) => ({ label: s.label, value: map.get(s.key) ?? 0 }));

  return (
    <div className="space-y-4">
      <Panel title="Checkout funnel" subtitle="Distinct sessions reaching each step, with drop-off from the step above">
        <FunnelBars steps={steps} />
      </Panel>
      <Panel title="Funnel detail">
        <DataTable
          rows={steps.map((s) => ({ step: s.label, sessions: s.value }))}
          columns={[
            { key: 'step', label: 'Step' },
            { key: 'sessions', label: 'Sessions', align: 'right', format: fmt },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ── Accounts (B2B) ────────────────────────────────────────────────────── */

export function AccountsSection({ from, to }: RangeProps) {
  const accounts = useMetric<Row[]>('accounts', from, to, 50);
  const data = rows(accounts.data);

  return (
    <div className="space-y-4">
      <Panel
        title="Account activity"
        subtitle="What each company did. Failed searches and add-to-carts without orders are the rows worth a phone call."
      >
        {data.length === 0 ? (
          <Empty message="No logged-in company activity in this range." />
        ) : (
          <DataTable
            rows={data}
            columns={[
              { key: 'company_id', label: 'Company' },
              { key: 'contacts', label: 'Contacts', align: 'right', format: fmt },
              { key: 'visits', label: 'Visits', align: 'right', format: fmt },
              { key: 'page_views', label: 'Pages', align: 'right', format: fmt },
              { key: 'failed_searches', label: 'Failed searches', align: 'right', format: fmt },
              { key: 'add_to_carts', label: 'Adds', align: 'right', format: fmt },
              { key: 'orders', label: 'Orders', align: 'right', format: fmt },
              {
                key: 'last_seen',
                label: 'Last seen',
                align: 'right',
                format: (v) => (v ? new Date(String(v)).toLocaleString() : '—'),
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}

/* ── Registrations & logins ────────────────────────────────────────────── */

export function IdentitySection({ from, to }: RangeProps) {
  const trend = useMetric<Row[]>('identity_trend', from, to);
  const data = rows(trend.data);

  return (
    <div className="space-y-4">
      <Panel title="Registrations and logins over time">
        <TrendChart
          data={data}
          xKey="day"
          series={[
            { key: 'logins', label: 'Logins' },
            { key: 'registrations', label: 'Registrations submitted' },
            { key: 'sign_ups', label: 'Sign-ups' },
            { key: 'sessions', label: 'Sessions started' },
          ]}
        />
      </Panel>
      <Panel title="Daily detail">
        <DataTable
          rows={data}
          columns={[
            { key: 'day', label: 'Day', format: (v) => String(v).slice(0, 10) },
            { key: 'sessions', label: 'Sessions', align: 'right', format: fmt },
            { key: 'logins', label: 'Logins', align: 'right', format: fmt },
            { key: 'logouts', label: 'Logouts', align: 'right', format: fmt },
            { key: 'registrations', label: 'Registrations', align: 'right', format: fmt },
            { key: 'sign_ups', label: 'Sign-ups', align: 'right', format: fmt },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ── Event explorer ────────────────────────────────────────────────────── */

export function EventsSection({ from, to }: RangeProps) {
  const counts = useMetric<Row[]>('event_counts', from, to);
  const recent = useMetric<Row[]>('recent_events', from, to, 100);

  return (
    <div className="space-y-4">
      <Panel title="Events by name" subtitle="Every event type recorded in the range">
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList data={rows(counts.data)} labelKey="event_name" valueKey="events" colorIndex={4} />
          <DataTable
            rows={rows(counts.data)}
            columns={[
              { key: 'event_name', label: 'Event' },
              { key: 'events', label: 'Count', align: 'right', format: fmt },
              { key: 'visitors', label: 'Visitors', align: 'right', format: fmt },
            ]}
          />
        </div>
      </Panel>

      <Panel title="Recent events" subtitle="Raw rows — the escape hatch for anything the fixed panels do not answer">
        <DataTable
          rows={rows(recent.data)}
          columns={[
            { key: 'occurred_at', label: 'When', format: (v) => (v ? new Date(String(v)).toLocaleString() : '—') },
            { key: 'event_name', label: 'Event' },
            { key: 'user_mode', label: 'Mode' },
            { key: 'company_id', label: 'Company', align: 'right' },
            { key: 'page_type', label: 'Page' },
            { key: 'entity_id', label: 'Entity', align: 'right' },
            { key: 'source_type', label: 'Source' },
            { key: 'search_term', label: 'Query' },
            { key: 'sku', label: 'SKU' },
            { key: 'value', label: 'Value', align: 'right', format: (v) => (v == null ? '—' : nf.format(n(v))) },
          ]}
        />
      </Panel>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border p-3 text-sm"
      style={{ borderColor: 'var(--status-critical)', color: 'var(--status-critical)' }}
      role="alert"
    >
      Query failed: {message}
    </div>
  );
}
