/**
 * Optional GA4 analytics — fully env-driven, off by default. This open-source
 * demo ships no analytics config; a deployer opts in with their own:
 *
 *   VITE_GA_ID          GA4 measurement id (e.g. G-XXXXXXXX). Required to enable.
 *   VITE_GA_SERVER      Optional server-side GTM container URL. When set, gtag.js
 *                       loads from it and events route through it (with Google
 *                       Signals + ad-personalization disabled).
 *   VITE_GA_REF_COOKIE  Optional cookie name; when set, the first external
 *                       referrer is captured into it (30-day acquisition cookie).
 *
 * With VITE_GA_ID unset, gtag never loads and `track()` is a no-op.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function initAnalytics() {
  const id = import.meta.env.VITE_GA_ID;
  if (!id) return;
  const server = import.meta.env.VITE_GA_SERVER;

  const s = document.createElement("script");
  s.async = true;
  s.src = `${server || "https://www.googletagmanager.com"}/gtag/js?id=${id}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  const config: Record<string, unknown> = {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  };
  if (server) config.server_container_url = server;
  window.gtag("config", id, config);

  // Capture the first external referrer for acquisition attribution.
  const refCookie = import.meta.env.VITE_GA_REF_COOKIE;
  if (refCookie && !document.cookie.match(new RegExp(`(?:^|;\\s*)${refCookie}=`))) {
    const ref = document.referrer;
    if (ref) {
      try {
        if (new URL(ref).hostname !== location.hostname) {
          document.cookie = `${refCookie}=${encodeURIComponent(ref)};path=/;SameSite=Lax;max-age=2592000`;
        }
      } catch {
        /* ignore malformed referrer */
      }
    }
  }
}

function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

export function trackGameStart(mode?: string) {
  track("game_start", { ...(mode && { mode }) });
}

export function trackGameFinish(score: number, rounds: number, bestStreak: number, mode?: string) {
  track("game_finish", { score, rounds, best_streak: bestStreak, ...(mode && { mode }) });
}
