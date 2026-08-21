/**
 * Day bucketing in the shop's timezone.
 *
 * Deliberately done in Node rather than MySQL's CONVERT_TZ: that function needs
 * the server's timezone tables to be loaded, which they frequently are not — and
 * when they are missing it returns NULL rather than erroring, so a rollup
 * silently drops rows instead of failing. `Intl` ships full IANA data with the
 * runtime, so this works identically on any MySQL install.
 *
 * A fixed UTC offset is not an option: Europe/Amsterdam is +01:00 or +02:00
 * depending on DST, so a hardcoded offset is wrong for half the year and a UTC
 * bucket is wrong every night between midnight and 01:00/02:00 local.
 */

export const SHOP_TIMEZONE = process.env.TRACKING_TIMEZONE || 'Europe/Amsterdam';

/** Offset (ms) between the given instant's wall-clock time in `tz` and UTC. */
function offsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/**
 * The UTC instant at which the given local calendar day starts.
 *
 * Two passes because the offset itself depends on the instant: on a DST
 * boundary the first guess can land in the wrong offset, so we re-resolve.
 */
export function zonedDayStartUtc(dateStr: string, timeZone: string = SHOP_TIMEZONE): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0);
  const first = offsetMs(new Date(guess), timeZone);
  let ts = guess - first;
  const second = offsetMs(new Date(ts), timeZone);
  if (second !== first) ts = guess - second;
  return new Date(ts);
}

/** Local calendar date (YYYY-MM-DD) for an instant. */
export function zonedDateString(date: Date, timeZone: string = SHOP_TIMEZONE): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dtf.format(date);
}

export function todayLocal(timeZone: string = SHOP_TIMEZONE): string {
  return zonedDateString(new Date(), timeZone);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Half-open [start, end) UTC range covering the local days `from`..`to`
 * inclusive. Half-open so an event at exactly midnight belongs to one day only.
 */
export function rangeToUtc(
  from: string,
  to: string,
  timeZone: string = SHOP_TIMEZONE
): { start: Date; end: Date } {
  return {
    start: zonedDayStartUtc(from, timeZone),
    end: zonedDayStartUtc(addDays(to, 1), timeZone),
  };
}
