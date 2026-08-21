'use client';

import { useEffect } from 'react';
import { isContact } from '@propeller-commerce/propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { config } from '@/data/config';
import { tracker, track, batchTo } from '@/lib/tracking';
import { GA4_ENABLED, ga4Subscriber } from '@/lib/tracking/ga4';
import type { TrackingContext, UserMode } from '@/lib/tracking';

/**
 * Pushes per-session scope into the tracker singleton and registers the
 * subscriber that ships events.
 *
 * Renders nothing. Mirrors the shape `PreprSegmentsSync` already uses — a null
 * component that syncs store state outwards — because the alternative, a hook
 * returning a bound `track`, would hand every call site an unstable function
 * identity. React Compiler lint is enforced here, so that would either break
 * the build or silently re-fire every effect depending on it.
 *
 * Nothing here gates event emission on auth. The bus buffers events fired
 * before context resolves and flushes them once it lands, so ordering is safe
 * without a single `isLoading` guard — which matters, because auth can stay
 * unresolved indefinitely against a slow or failing backend, and anonymous
 * visitors are explicitly in scope.
 */

const SESSION_KEY = 'pr_sid';
const SESSION_IDLE_MS = 30 * 60 * 1000;
/**
 * How long to wait for auth before publishing context as anonymous. Verified by
 * driving a real browser against a backend returning 403: without this fallback
 * the context never resolved and NOTHING was tracked at all.
 */
const AUTH_GRACE_MS = 2000;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * A 30-minute sliding session. Needed so the dashboard can count *visits*
 * rather than events — without it "visitors today" and "page views today" are
 * the same number wearing different labels.
 */
function resolveSessionId(): string {
  if (typeof window === 'undefined') return '';
  const now = Date.now();
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string; at: number };
      if (parsed?.id && now - parsed.at < SESSION_IDLE_MS) {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, at: now }));
        return parsed.id;
      }
    }
  } catch {
    /* sessionStorage can throw in private mode — fall through to a fresh id */
  }
  const id = crypto.randomUUID();
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
  } catch {
    /* ignore */
  }
  return id;
}

function buildContext(partial: Partial<TrackingContext>): TrackingContext {
  return {
    channelId: Number(config.channelId) || 1,
    userMode: 'anonymous',
    contactId: null,
    customerId: null,
    companyId: null,
    visitorId: readCookie('pr_vid') ?? '',
    sessionId: resolveSessionId(),
    language: null,
    currency: 'EUR',
    ...partial,
  };
}

export default function TrackingBridge() {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { language } = useLanguage();

  // Register the transports exactly once for the life of the page.
  //
  // Subscribers are independent: GA4 receiving a malformed event cannot stop
  // the row reaching `/api/track`, and vice versa — the bus isolates throwing
  // subscribers from each other. Both run off the same event, so instrumenting
  // once feeds every sink.
  useEffect(() => {
    const offBatch = tracker.subscribe(batchTo('/api/track'));
    const offGa4 = GA4_ENABLED ? tracker.subscribe(ga4Subscriber()) : null;
    return () => {
      offBatch();
      offGa4?.();
    };
  }, []);

  const user = state.user as { contactId?: number; customerId?: number } | null;
  const contactId = user && isContact(user as never) ? (user.contactId ?? null) : null;
  const customerId = user && !isContact(user as never) ? (user.customerId ?? null) : null;
  const companyId = selectedCompany?.companyId ?? null;
  const userMode: UserMode = !user ? 'anonymous' : contactId != null ? 'b2b' : 'b2c';
  const lang = language ? String(language).slice(0, 2).toUpperCase() : null;

  // Publish scope as soon as auth resolves. Cheap and idempotent, so pushing on
  // every change keeps the singleton current without components knowing it exists.
  useEffect(() => {
    if (state.isLoading) return;
    tracker.setContext(
      buildContext({ userMode, contactId, customerId, companyId, language: lang })
    );
  }, [state.isLoading, userMode, contactId, customerId, companyId, lang]);

  // Fallback: if auth has not resolved within the grace period, publish
  // anonymous context so buffered events flush instead of being stranded. No
  // React state involved — the timer talks to the singleton directly, which
  // also keeps this clear of the `set-state-in-effect` rule.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!tracker.getContext()) tracker.setContext(buildContext({ language: lang }));
    }, AUTH_GRACE_MS);
    return () => clearTimeout(timer);
  }, [lang]);

  // One `session_started` per session.
  //
  // The bus's dedupe map lives in module scope, so it resets on every full page
  // load — enough for a StrictMode double-invoke or a soft navigation, but NOT
  // enough for session identity, which has to survive reloads. Verified against
  // real traffic: without the sessionStorage flag this fired once per page load
  // and inflated the session count.
  useEffect(() => {
    const sid = resolveSessionId();
    if (!sid) return;
    try {
      const flag = `pr_ss:${sid}`;
      if (window.sessionStorage.getItem(flag)) return;
      window.sessionStorage.setItem(flag, '1');
    } catch {
      /* private mode: fall through and accept a possible repeat */
    }
    track(
      'session_started',
      { entry_path: window.location.pathname, referrer: document.referrer || null },
      `session_started:${sid}`
    );
  }, []);

  // `identify` is the join row that lets a sink retro-attribute the anonymous
  // history to the account. Without it, ids on later events say nothing about
  // the weeks before the login — which is the interesting part for a rep.
  useEffect(() => {
    const userId = contactId ?? customerId;
    if (userId == null) return;
    const visitorId = readCookie('pr_vid') ?? '';
    track(
      'identify',
      { visitor_id: visitorId, user_id: userId, user_type: userMode, company_id: companyId },
      `identify:${visitorId}:${userMode}:${userId}`
    );
  }, [contactId, customerId, companyId, userMode]);

  return null;
}
