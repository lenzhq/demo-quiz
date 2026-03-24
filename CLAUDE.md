# CLAUDE.md

## Project Overview

Fact or Fiction is a standalone trivia game where players guess the verdict of real fact-checked claims. It's extracted from the [Lenz](https://lenz.io) platform and deployed at `play.lenz.io`. The game has no backend of its own — it proxies all API calls to the Lenz backend at `api.lenz.io`.

## Commands

```bash
npm run dev          # Vite dev server (port 5173, proxies /api to Django on port 8000)
npm run build        # Production build (typecheck + bundle)
npm run typecheck    # TypeScript check only
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
- No auth — fully anonymous, stateless gameplay
- State management: local React state only (no Redux/Zustand/Context)

### Game Modes
- **Odd One Out** — 7 rounds, 3 claims (2 true, 1 false), find the false one
- **True or False** — 10 rounds, binary choice
- **Four Verdicts** — 10 rounds, pick from True/Mostly True/Misleading/False

### API (proxied to Lenz backend)
All endpoints are public, no auth required:
- `GET /api/game/claims?count=10&mode=4v` — random claims for 4v/tf modes
- `GET /api/game/odd-one-out?rounds=7` — grouped claims for OOO mode
- `POST /api/game/view/{share_id}` — increment view counter
- `POST /api/game/vote` — submit implicit votes `{votes: [{share_id, value}]}`

The `VITE_API_BASE` env var controls the API base URL. In dev it defaults to `/api` (proxied by Vite to localhost:8000). In production it's `https://api.lenz.io/api`.

### Key Files
```
src/
├── main.tsx                     # Entry point (StrictMode + HelmetProvider)
├── index.css                    # Tailwind theme tokens
├── pages/GamePage.tsx           # Main page: phase management, confetti, back-to-lenz link
├── features/game/
│   ├── GameIntro.tsx            # Mode selection screen
│   ├── GameRound.tsx            # Single-claim round (4v/tf modes, 15s timer)
│   ├── OddOneOutRound.tsx       # 3-claim round (OOO mode, 25s timer)
│   └── GameSummary.tsx          # Results: score, tier, round recap, share
├── api/
│   ├── client.ts                # Game API functions + fetch helpers
│   └── utils.ts                 # CSRF token getter
├── components/
│   ├── LenzLogo.tsx             # SVG logo
│   └── ShareLinks.tsx           # Social sharing menu (X, FB, WhatsApp, copy)
├── hooks/useClickOutside.ts     # Click-outside hook for ShareLinks
└── utils/
    ├── analytics.ts             # GA4 trackGameStart/trackGameFinish
    ├── renderEmphasis.tsx        # **bold** and *italic* → React elements
    └── slugify.ts               # Claim URL builder (points to lenz.io)
```

## Environment Variables

```
VITE_API_BASE=/api                # API base URL (default: /api, prod: https://api.lenz.io/api)
VITE_LENZ_URL=https://lenz.io    # Main Lenz site URL (for claim links, back button)
```

## Deployment

- **Hosting**: Firebase Hosting → `play.lenz.io`
- **Firebase project**: `lenz-prod` (same as main Lenz site, different hosting site)
- **Firebase site**: `lenz-play`
- Config: `firebase.json` + `.firebaserc`
- Deploy script: `deploy/deploy.sh`

## Code Conventions

- Extracted from Lenz — follows the same conventions: functional components, Tailwind only, no form libraries
- Verdict colors: `text-true`, `text-false`, `text-mostly-true`, `text-misleading`
- Warm palette: `text-warm-400` through `text-warm-800`, `bg-cream`
- All external links (claim pages, library) point to `lenz.io` via `VITE_LENZ_URL`
