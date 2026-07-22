import { Lenz } from "lenz-io";
import type { LibraryItem } from "lenz-io";

// ---------------------------------------------------------------------------
// Lenz public API client
//
// This whole game runs on the KEYLESS public API (`GET /api/v1/library`) via
// the official `lenz-io` SDK — no API key, no cookies, no server of our own.
// That's the point of the demo: everything here is reproducible by any
// developer against the same public endpoints.
//
// `VITE_API_BASE` lets a fork point at a local/staging server; it defaults to
// production so a fresh clone works with zero config.
// ---------------------------------------------------------------------------

const client = new Lenz({
  baseUrl: import.meta.env.VITE_API_BASE || "https://lenz.io/api/v1",
});

const LENZ_URL = import.meta.env.VITE_LENZ_URL || "https://lenz.io";

// ---------------------------------------------------------------------------
// Types — the shape the game components consume.
// ---------------------------------------------------------------------------

export interface GameClaim {
  share_id: string;
  atomic_claim: string;
  domain: string;
  conclusion_label: string;
  lenz_score: number | null;
  executive_summary: string;
  completed_at: string | null;
  // Canonical claim page. The library endpoint returns no url/slug, so we
  // build it from the verification_id (lenz.io/c/<id> resolves via redirect).
  url: string;
}

export type GameMode = "tf" | "5v" | "ooo";

// ---------------------------------------------------------------------------
// Mapping + helpers
// ---------------------------------------------------------------------------

// Map a public-API LibraryItem onto GameClaim. Normalizes the legacy
// 'Misleading' label to 'Mixed' so downstream verdict maps resolve.
function mapItem(item: LibraryItem): GameClaim {
  const verdict = item.verdict === "Misleading" ? "Mixed" : (item.verdict ?? "");
  const id = item.verification_id ?? "";
  return {
    share_id: id,
    atomic_claim: item.claim ?? "",
    domain: item.domain ?? "",
    conclusion_label: verdict,
    lenz_score: item.lenz_score ?? null,
    executive_summary: item.executive_summary ?? "",
    completed_at: item.created_at ?? null,
    url: `${LENZ_URL}/c/${id}`,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

// ---------------------------------------------------------------------------
// Game API — composed from library.list()
// ---------------------------------------------------------------------------

// True/False and Five-Verdict rounds: a curated, shuffled page of claims.
// `tf` restricts to exactly-True / exactly-False verdicts.
export async function fetchGameClaims(count = 10, mode: GameMode = "5v"): Promise<GameClaim[]> {
  const verdict = mode === "tf" ? "True,False" : undefined;
  const page = await client.library.list({ curated: true, sort: "random", verdict });
  return page.items.slice(0, count).map(mapItem);
}

// Odd-One-Out: each round is 2 true + 1 false, shuffled. Fetch a curated,
// shuffled pool of each verdict and assemble the rounds client-side.
export async function fetchOddOneOutRounds(count = 7): Promise<GameClaim[][]> {
  const [truePool, falsePool] = await Promise.all([
    client.library.list({ curated: true, sort: "random", verdict: "True" }),
    client.library.list({ curated: true, sort: "random", verdict: "False" }),
  ]);
  const trues = truePool.items.map(mapItem);
  const falses = falsePool.items.map(mapItem);

  // Bounded by the smaller pool so we never index past what the API returned.
  const maxRounds = Math.min(count, Math.floor(trues.length / 2), falses.length);
  const rounds: GameClaim[][] = [];
  for (let i = 0; i < maxRounds; i++) {
    rounds.push(shuffle([trues[i * 2]!, trues[i * 2 + 1]!, falses[i]!]));
  }
  return rounds;
}
