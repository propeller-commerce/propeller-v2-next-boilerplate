'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Chart primitives for /tracker.
 *
 * Built on `recharts`, which was already a dependency and previously unused —
 * no new package. Colours are read from CSS custom properties defined in
 * tracker.css so light/dark swap in one place and the marks are written against
 * roles rather than hex.
 *
 * Conventions applied throughout, per the dataviz method:
 *  - top-N is a HORIZONTAL bar list, never a pie: ranked categorical reads
 *    better and long product names actually fit;
 *  - one y-axis, never two — two measures of different scale get two charts;
 *  - grid and axes recede, marks are thin, and every chart ships beside a table
 *    (which is also the documented relief for the light-mode contrast warning
 *    on three of the series colours).
 */

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];

export const nf = new Intl.NumberFormat('en-US');
export const cf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' });

export function fmt(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? nf.format(n) : '—';
}

/* ── Stat tile ─────────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warning' | 'good';
}) {
  const color =
    tone === 'warning'
      ? 'var(--status-warning)'
      : tone === 'good'
        ? 'var(--status-good)'
        : 'var(--text-primary)';
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border-1)', background: 'var(--surface-2)' }}
    >
      <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={{ color }}>
        {typeof value === 'number' ? nf.format(value) : value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/* ── Panel wrapper ─────────────────────────────────────────────────────── */

export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border-1)', background: 'var(--surface-2)' }}
    >
      <header className="mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {subtitle ? (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function Empty({ message = 'No data in this range yet.' }: { message?: string }) {
  return (
    <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
      {message}
    </p>
  );
}

/* ── Tooltip ───────────────────────────────────────────────────────────── */

const tooltipStyle = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
};

/* ── Trend (time series) ───────────────────────────────────────────────── */

export function TrendChart({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: { key: string; label: string }[];
  height?: number;
}) {
  if (!data.length) return <Empty />;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            stroke="var(--border-1)"
            tickFormatter={(v: string) => String(v).slice(5)}
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            stroke="var(--border-1)"
            allowDecimals={false}
            width={40}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--border-1)' }} />
          {/* A legend is always present for two or more series, so identity is
              never carried by colour alone. */}
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} /> : null}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Ranked horizontal bars ────────────────────────────────────────────── */

export function BarList({
  data,
  labelKey,
  valueKey,
  height,
  colorIndex = 0,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  height?: number;
  colorIndex?: number;
}) {
  if (!data.length) return <Empty />;
  const h = height ?? Math.max(140, data.length * 28 + 40);
  return (
    <div style={{ width: '100%', height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey={labelKey}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            stroke="var(--border-1)"
            width={180}
            interval={0}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--grid)' }} />
          <Bar dataKey={valueKey} radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES[colorIndex % SERIES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Funnel (ordered bars, not a tapering triangle) ────────────────────── */

export function FunnelBars({ steps }: { steps: { label: string; value: number }[] }) {
  if (!steps.length) return <Empty />;
  const top = Math.max(...steps.map((s) => s.value), 1);
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const pct = (s.value / top) * 100;
        const prev = i > 0 ? steps[i - 1].value : null;
        const drop = prev && prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : null;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {nf.format(s.value)}
                {drop !== null && drop > 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}> · −{drop}%</span>
                ) : null}
              </span>
            </div>
            <div className="h-2 rounded" style={{ background: 'var(--grid)' }}>
              <div
                className="h-2 rounded"
                style={{ width: `${pct}%`, background: SERIES[0], minWidth: s.value > 0 ? 4 : 0 }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Table ─────────────────────────────────────────────────────────────── */

export function DataTable({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; align?: 'left' | 'right'; format?: (v: unknown, row: Record<string, unknown>) => string }[];
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="viz-scroll">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`py-2 px-2 font-medium text-xs whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-1)' }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`py-2 px-2 whitespace-nowrap ${c.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                  style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-1)' }}
                >
                  {c.format ? c.format(row[c.key], row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
