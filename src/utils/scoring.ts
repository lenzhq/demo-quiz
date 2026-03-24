import type { GameMode } from "../api/client";

// ---------------------------------------------------------------------------
// Verdict distance (4-point scale)
// ---------------------------------------------------------------------------

const VERDICT_INDEX: Record<string, number> = {
  True: 0,
  "Mostly True": 1,
  Misleading: 2,
  False: 3,
};

export function verdictDistance(a: string, b: string): number {
  return Math.abs((VERDICT_INDEX[a] ?? 0) - (VERDICT_INDEX[b] ?? 0));
}

export function scoreForDistance(d: number, mode: GameMode): number {
  if (mode === "tf") {
    return d === 0 ? 50 : 0;
  }
  if (d === 0) return 100;
  if (d === 1) return 50;
  if (d === 2) return 25;
  return 0;
}

// ---------------------------------------------------------------------------
// Streak bonus
// ---------------------------------------------------------------------------

export function streakBonus(distance: number, currentStreak: number): number {
  return distance === 0 && currentStreak > 0 ? currentStreak * 10 : 0;
}

// ---------------------------------------------------------------------------
// OOO time bonus
// ---------------------------------------------------------------------------

export function oooTimeBonus(elapsedSeconds: number): number {
  if (elapsedSeconds <= 5) return 30;
  if (elapsedSeconds <= 10) return 20;
  if (elapsedSeconds <= 15) return 10;
  return 0;
}

// ---------------------------------------------------------------------------
// Tier system
// ---------------------------------------------------------------------------

export interface Tier {
  label: string;
  emoji: string;
  color: string;
}

export function getTier(score: number, mode: GameMode): Tier {
  const t = mode === "tf" ? 0.5 : mode === "ooo" ? 0.7 : 1;
  if (score >= 900 * t) return { label: "Verdict Virtuoso", emoji: "\u2728", color: "text-true" };
  if (score >= 700 * t)
    return { label: "Verification Pro", emoji: "\uD83C\uDFAF", color: "text-true" };
  if (score >= 500 * t)
    return { label: "Truth Seeker", emoji: "\uD83D\uDD0D", color: "text-mostly-true" };
  if (score >= 300 * t)
    return { label: "Getting There", emoji: "\uD83D\uDCAA", color: "text-misleading" };
  return { label: "Rookie Checker", emoji: "\uD83C\uDF31", color: "text-false" };
}
