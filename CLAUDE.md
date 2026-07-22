# CLAUDE.md

## Project Overview

Fact or Fiction is a standalone trivia game where players guess the verdict of real
fact-checked claims. It's an open-source demo of the [Lenz](https://lenz.io) public API,
deployed at `play.lenz.io`. **It has no backend of its own** — it reads the keyless public
API (`GET /api/v1/library`) directly from the browser through the official
[`lenz-io`](https://www.npmjs.com/package/lenz-io) SDK. No API key, no cookies, no server.

## Commands

```bash
npm install
npm run dev          # Vite dev server (defaults to the production public API)
npm run build        # Production build (typecheck + bundle)
npm run typecheck    # TypeScript check only
npm run test         # Vitest (unit tests, e.g. scoring)
npm run preview      # Preview production build locally
```

### Deployment
```bash
bash deploy/deploy.sh   # Build + deploy to Firebase Hosting (play.lenz.io)
```

## Architecture

### Pure React SPA
- React 19 + TypeScript + Vite + Tailwind CSS 4
- No routing — single page, game mounts at `/`
- No auth — fully anonymous, keyless, read-only gameplay
- State management: local React state only

### Game Modes
- **Odd One Out** — 7 rounds of 3 claims (2 true, 1 false); find the false one
- **True or False** — 10 rounds, binary choice
- **Five Verdicts** — 10 rounds, pick from True / Mostly True / Mixed / Mostly False / False

### API — the keyless public API via the SDK

The entire data layer is `src/api/client.ts`, built on one endpoint through the SDK:

```ts
import { Lenz } from "lenz-io";
const lenz = new Lenz();                       // no API key — public reads
await lenz.library.list({ curated: true, sort: "random", verdict: "True,False" });
```

- `curated: true` — the LLM-curated, trivia-worthy public subset.
- `sort: "random"` — shuffled.
- `verdict` — comma-separated label filter (`"True,False"` for T/F mode).

`fetchGameClaims` powers True-or-False / Five-Verdicts (one curated page). `fetchOddOneOutRounds`
fetches a `verdict: "True"` pool and a `verdict: "False"` pool and assembles 2-true + 1-false
rounds client-side. `mapItem` is the only adapter — it normalizes the verdict and builds a
claim-page url from `verification_id` (the library returns no url/slug).

### Key Files
```
src/
├── main.tsx                     # Entry point (StrictMode + HelmetProvider)
├── index.css                    # Tailwind theme tokens
├── pages/GamePage.tsx           # Main page: phase management, confetti, back-to-lenz link
├── features/game/
│   ├── GameIntro.tsx            # Mode selection screen
│   ├── GameRound.tsx            # Single-claim round (tf/5v modes, 15s timer)
│   ├── OddOneOutRound.tsx       # 3-claim round (ooo mode)
│   └── GameSummary.tsx          # Results: score, tier, round recap, share
├── api/client.ts                # SDK integration — the whole API surface (~one call)
├── components/
│   ├── LenzLogo.tsx             # SVG logo
│   └── ShareLinks.tsx           # Social sharing menu (X, FB, WhatsApp, copy)
├── hooks/useClickOutside.ts     # Click-outside hook for ShareLinks
└── utils/
    ├── analytics.ts             # GA4 trackGameStart/trackGameFinish (opt-in via env)
    ├── renderEmphasis.tsx       # **bold** and *italic* → React elements
    ├── scoring.ts               # Verdict-distance scoring + tiers
    └── slugify.ts               # Claim-page URL builder (points to lenz.io)
```

## Environment Variables

Both are OPTIONAL — the app defaults to the production public API and runs with zero config.

```
VITE_API_BASE=https://lenz.io/api/v1   # Lenz public API base (keyless)
VITE_LENZ_URL=https://lenz.io          # site URL for claim links / back button
VITE_GA_ID=G-XXXXXXXXXX                 # optional GA4 measurement id (analytics off if unset)
```

## Deployment

- **Hosting**: Firebase Hosting → `play.lenz.io`
- **Firebase project**: `lenz-prod`, site `lenz-play` (`firebase.json` + `.firebaserc`)
- **Deploy**: `deploy/deploy.sh` (builds with `VITE_API_BASE=https://lenz.io/api/v1`)

Forkers: change the Firebase project/site (or use any static host — it's a plain Vite build).

## Code Conventions

- Functional components, Tailwind only, no form libraries.
- Verdict labels/colors follow the 5-point scale (True / Mostly True / Mixed / Mostly False / False).
- External links point to `lenz.io` via `VITE_LENZ_URL`.
