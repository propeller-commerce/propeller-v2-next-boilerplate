'use client';

import { useEffect, useState } from 'react';

/**
 * "Why is this dashboard empty?".
 *
 * The three ways a fresh install has no data — no database configured, a
 * database that is unreachable, a schema that was never created — are
 * indistinguishable from a quiet day once the panels have rendered their zeros.
 * This asks the API once and says which one it is, with the fix.
 *
 * Its own request rather than lifting state out of the nine sections: the cause
 * is global, the `health` probe is a query that scans nothing, and threading a
 * status up from whichever section happens to be mounted would put dashboard
 * plumbing in every one of them.
 */

interface Health {
  status: string;
  hint: string;
}

export default function SetupBanner() {
  const [problem, setProblem] = useState<Health | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch('/api/tracker?metric=health', { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? null : res.json()))
      .then((json) => {
        if (cancelled || !json?.status) return;
        setProblem({ status: json.status, hint: json.hint ?? '' });
      })
      // A network failure here says nothing useful — the panels will report it.
      .catch(() => {});

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (!problem) return null;

  // Not configured is an ordinary state for a shop that never set analytics up,
  // so it is informational. The rest are mistakes, and look like it.
  const ordinary = problem.status === 'not_configured';
  const color = ordinary ? 'var(--text-secondary)' : 'var(--status-warning)';

  return (
    <div
      className="mb-4 rounded-lg border p-3 text-sm"
      style={{ borderColor: color, color }}
      role="status"
    >
      <strong className="font-medium">
        {ordinary ? 'No analytics database' : 'Analytics database problem'}
      </strong>
      <span className="ml-2">{problem.hint}</span>
    </div>
  );
}
