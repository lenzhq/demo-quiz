import { getCSRFToken } from "./utils";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameClaim {
  share_id: string;
  slug: string;
  atomic_claim: string;
  domain: string;
  conclusion_label: string;
  lenz_score: number | null;
  executive_summary: string;
  completed_at: string | null;
}

export type GameMode = "tf" | "4v" | "ooo";
export type VoteValue = "true" | "mostly_true" | "misleading" | "false";

// ---------------------------------------------------------------------------
// Fetch helpers — timeout and retry
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init?.signal
    ? init.signal
    : controller.signal;
  return fetch(input, { ...init, signal }).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// GET request deduplication
// ---------------------------------------------------------------------------

const MAX_INFLIGHT = 20;
const _inflight = new Map<string, Promise<Response>>();

function deduplicatedFetch(
  input: string,
  init?: RequestInit,
  opts?: { retries?: number; timeoutMs?: number },
): Promise<Response> {
  const method = init?.method?.toUpperCase() || "GET";
  if (method !== "GET") return fetchWithRetry(input, init, opts);

  const existing = _inflight.get(input);
  if (existing) return existing.then((r) => r.clone());

  // Safety bound: clear stale entries if the map grows too large
  if (_inflight.size >= MAX_INFLIGHT) _inflight.clear();

  const promise = fetchWithRetry(input, init, opts).finally(() => _inflight.delete(input));
  _inflight.set(input, promise);
  return promise;
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  { retries = 2, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(input, init, timeoutMs);
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`Server error (${res.status})`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Game API
// ---------------------------------------------------------------------------

export async function fetchGameClaims(count = 10, mode: GameMode = "4v"): Promise<GameClaim[]> {
  const res = await deduplicatedFetch(`${API_BASE}/game/claims?count=${count}&mode=${mode}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch game claims");
  return res.json();
}

export async function fetchOddOneOutRounds(count = 7): Promise<GameClaim[][]> {
  const res = await deduplicatedFetch(`${API_BASE}/game/odd-one-out?rounds=${count}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch odd-one-out rounds");
  return res.json();
}

export function recordGameView(shareId: string): void {
  fetchWithTimeout(
    `${API_BASE}/game/view/${shareId}`,
    {
      method: "POST",
      credentials: "include",
    },
    10_000,
  ).catch(() => {});
}

export function submitGameVotes(votes: { share_id: string; value: VoteValue }[]): void {
  if (!votes.length) return;
  fetchWithTimeout(
    `${API_BASE}/game/vote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
      credentials: "include",
      body: JSON.stringify({ votes }),
    },
    10_000,
  ).catch(() => {});
}
