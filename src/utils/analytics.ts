/**
 * Thin wrapper around gtag() for Google Analytics 4 custom events.
 * Safe to call even if gtag hasn't loaded yet (window.gtag may be undefined).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
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
