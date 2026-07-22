/**
 * Optional GA4 analytics. Off by default — this open-source demo never phones
 * home. Set `VITE_GA_ID` to your own measurement id to enable it; with it unset,
 * gtag is never loaded and `track()` is a no-op.
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
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
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
