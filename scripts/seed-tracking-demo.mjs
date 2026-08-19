/**
 * Seeds a realistic demo dataset into propeller_analytics (PWP-910).
 *
 *   node scripts/seed-tracking-demo.mjs [days]
 *
 * Why direct SQL rather than POSTing to /api/track: the ingest route clamps
 * `occurred_at` to server time when the client clock looks implausible, which is
 * correct behaviour and also means the API cannot backdate. Trend charts need
 * history, so the seeder writes rows itself.
 *
 * Every row it writes has a `demo-` visitor id prefix. To remove all of it:
 *   DELETE FROM storefront_events WHERE visitor_id LIKE 'demo-%';
 */

import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';

/* Minimal .env.local reader — avoids depending on Next's loader for a script. */
function env() {
  const out = {};
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      // Strip an unquoted trailing comment: real values in this repo look like
      // `NEXT_PUBLIC_CHANNEL_ID=621 # Quantore channel ID`, and Number() on the
      // whole string is NaN.
      if (m) out[m[1]] = m[2].replace(/\s+#.*$/, '').trim();
    }
  } catch {
    /* fall back to process.env */
  }
  return { ...out, ...process.env };
}

const E = env();
const DAYS = Math.max(1, Math.min(Number(process.argv[2]) || 14, 90));

const CATEGORIES = [
  [1737, 'Kantoorartikelen'], [1801, 'Gereedschap'], [1922, 'Veiligheid'],
  [2044, 'Elektra'], [2210, 'Bevestiging'],
];
const PRODUCTS = [
  [4471, 'SKU-4471', 'Quixx Repair Kit'], [5120, 'SKU-5120', 'Laser Meter 40m'],
  [6033, 'SKU-6033', 'Veiligheidsbril'], [7781, 'SKU-7781', 'Boorset 19-delig'],
  [8890, 'SKU-8890', 'Werkhandschoen L'],
];
const GOOD_QUERIES = ['boormachine', 'veiligheidsbril', 'laser', 'handschoen', 'schroeven'];
/* The point of the exercise: queries that repeatedly return nothing. */
const DEAD_QUERIES = ['laser 4mm rvs', 'kabelgoot 60mm', 'accu 18v makita', 'trilplaat huren'];
const SOURCES = ['category', 'search', 'pdp', 'slider', 'favorites', 'quick_order'];
const COMPANIES = [7, 12, 31, 44];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

async function main() {
  const conn = await mysql.createConnection({
    host: E.TRACKING_DB_HOST || '127.0.0.1',
    port: Number(E.TRACKING_DB_PORT || 3307),
    user: E.TRACKING_DB_USER || 'root',
    password: E.TRACKING_DB_PASSWORD || '',
    database: E.TRACKING_DB_NAME || 'propeller_analytics',
    timezone: 'Z',
  });

  const channelId = Number(E.NEXT_PUBLIC_CHANNEL_ID || 1);
  const rows = [];

  const push = (at, name, visitorId, sessionId, mode, contactId, companyId, props = {}) => {
    const key = `${name}:${visitorId}:${at.getTime()}:${Math.random()}`;
    rows.push([
      at, channelId, name, visitorId, sessionId, mode,
      contactId, mode === 'b2c' ? contactId : null, companyId,
      'NL', 'EUR',
      props.page_type ?? null, props.entity_type ?? null, props.entity_id ?? null, props.entity_name ?? null,
      props.source_type ?? null, props.source_id ?? null, props.position ?? null,
      props.search_term ?? null, props.results_count ?? null, null,
      props.product_id ?? null, props.sku ?? null, props.order_id ?? null,
      props.quantity ?? null, props.value ?? null,
      createHash('md5').update(key).digest(), null,
    ]);
  };

  for (let d = DAYS - 1; d >= 0; d--) {
    // More traffic on recent days and on weekdays, so the trend line has shape.
    const base = new Date();
    base.setDate(base.getDate() - d);
    const weekday = base.getDay() !== 0 && base.getDay() !== 6;
    const sessions = Math.round((weekday ? 14 : 5) * (1 + (DAYS - d) / DAYS));

    for (let s = 0; s < sessions; s++) {
      const at = new Date(base);
      at.setHours(7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);

      const known = chance(0.55);
      const b2b = known && chance(0.8);
      const mode = !known ? 'anonymous' : b2b ? 'b2b' : 'b2c';
      const visitorId = `demo-${randomUUID().slice(5)}`;
      const sessionId = randomUUID();
      const contactId = known ? 1000 + Math.floor(Math.random() * 60) : null;
      const companyId = b2b ? pick(COMPANIES) : null;

      const t = (mins) => new Date(at.getTime() + mins * 60_000);

      push(at, 'session_started', visitorId, sessionId, mode, contactId, companyId, { page_type: 'home' });
      push(t(0), 'page_viewed', visitorId, sessionId, mode, contactId, companyId, { page_type: 'home' });
      if (known) push(t(0.4), 'login', visitorId, sessionId, mode, contactId, companyId);

      // Browse a category
      if (chance(0.75)) {
        const [cid, cname] = pick(CATEGORIES);
        push(t(1), 'page_viewed', visitorId, sessionId, mode, contactId, companyId, {
          page_type: 'category', entity_type: 'category', entity_id: cid, entity_name: cname,
        });
      }

      // Search — sometimes fruitful, sometimes not
      if (chance(0.6)) {
        const dead = chance(0.35);
        const term = dead ? pick(DEAD_QUERIES) : pick(GOOD_QUERIES);
        const results = dead ? 0 : 3 + Math.floor(Math.random() * 40);
        push(t(2), 'search', visitorId, sessionId, mode, contactId, companyId, {
          page_type: 'search', search_term: term, results_count: results,
        });
        if (dead) {
          push(t(2.1), 'search_no_results', visitorId, sessionId, mode, contactId, companyId, {
            page_type: 'search', search_term: term,
          });
        }
      }

      // PDP → cart → checkout → purchase, each step losing people
      if (chance(0.55)) {
        const [pid, sku, pname] = pick(PRODUCTS);
        push(t(3), 'page_viewed', visitorId, sessionId, mode, contactId, companyId, {
          page_type: 'product', entity_type: 'product', entity_id: pid, entity_name: pname,
        });
        push(t(3.1), 'view_item', visitorId, sessionId, mode, contactId, companyId, { product_id: pid, sku });

        if (chance(0.45)) {
          const value = 25 + Math.round(Math.random() * 400);
          push(t(4), 'add_to_cart', visitorId, sessionId, mode, contactId, companyId, {
            product_id: pid, sku, quantity: 1 + Math.floor(Math.random() * 4), value,
            source_type: pick(SOURCES), source_id: null, position: 1 + Math.floor(Math.random() * 8),
          });
          if (chance(0.7)) push(t(5), 'view_cart', visitorId, sessionId, mode, contactId, companyId, { page_type: 'cart', value });
          if (chance(0.55)) {
            push(t(6), 'begin_checkout', visitorId, sessionId, mode, contactId, companyId, { page_type: 'checkout', value });
            if (chance(0.8)) push(t(7), 'add_shipping_info', visitorId, sessionId, mode, contactId, companyId, {});
            if (chance(0.75)) push(t(8), 'add_payment_info', visitorId, sessionId, mode, contactId, companyId, {});
            if (chance(0.65)) {
              push(t(9), 'purchase', visitorId, sessionId, mode, contactId, companyId, {
                page_type: 'thank_you', order_id: 900000 + rows.length, value,
              });
            }
          }
        }
      }

      // Account-area activity — the B2B intent signals
      if (b2b && chance(0.3)) {
        push(t(10), 'propeller.favorite_added', visitorId, sessionId, mode, contactId, companyId, {
          product_id: pick(PRODUCTS)[0],
        });
      }
      if (b2b && chance(0.15)) {
        push(t(11), 'propeller.quote_viewed', visitorId, sessionId, mode, contactId, companyId, {
          page_type: 'quote', order_id: 500000 + Math.floor(Math.random() * 999),
        });
      }
      if (chance(0.08)) push(t(12), 'registration_submitted', visitorId, sessionId, mode, contactId, companyId, {});
    }
  }

  const SQL = `INSERT IGNORE INTO storefront_events
    (occurred_at, channel_id, event_name, visitor_id, session_id, user_mode,
     contact_id, customer_id, company_id, language, currency,
     page_type, entity_type, entity_id, entity_name,
     source_type, source_id, source_position,
     search_term, results_count, query_id,
     product_id, sku, order_id, quantity, value,
     idempotency_key, props)
    VALUES ?`;

  for (let i = 0; i < rows.length; i += 500) {
    await conn.query(SQL, [rows.slice(i, i + 500)]);
  }

  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM storefront_events WHERE visitor_id LIKE 'demo-%'"
  );
  console.log(`seeded ${rows.length} events over ${DAYS} days — ${n} demo rows now present`);
  console.log("remove with: DELETE FROM storefront_events WHERE visitor_id LIKE 'demo-%';");
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
