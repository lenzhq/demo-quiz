# Fact or Fiction

A trivia game built entirely on the **[Lenz](https://lenz.io) public API** — real fact-checked
claims, real verdicts, no backend of its own. It's a live demo of the official
[`lenz-io`](https://www.npmjs.com/package/lenz-io) SDK: everything here is reproducible by
any developer against the same keyless public endpoints.

▶ **Play it:** [play.lenz.io](https://play.lenz.io) · 📚 **API docs:** [lenz.io/developers](https://lenz.io/developers)

## How it works

The whole game runs on one keyless endpoint — `GET /api/v1/library` — through the SDK. No
API key, no cookies, no server:

```ts
import { Lenz } from "lenz-io";

const lenz = new Lenz(); // no API key — the library reads are public

// A round of true/false quiz claims, curated and shuffled:
const round = await lenz.library.list({
  curated: ["trivia"],    // named curated collections
  sort: "random",         // shuffled
  verdict: "True,False",  // filter by verdict label
});

for (const item of round.items) {
  console.log(item.claim, "→", item.verdict, `(${item.lenz_score}/10)`);
}
```

Three modes compose from that single call:

- **True or False** — `verdict: "True,False"`
- **Five Verdicts** — the full `True → False` scale
- **Odd One Out** — fetch a `verdict: "True"` pool and a `verdict: "False"` pool, then
  assemble 2-true + 1-false rounds client-side

See [`src/api/client.ts`](src/api/client.ts) — that's the entire integration.

## Run it locally

```bash
npm install
npm run dev        # dev server
npm run build      # production build (typecheck + bundle)
npm test           # unit tests (scoring)
```

Zero config — it defaults to the production public API. Optional overrides are in
`.env.example`: `VITE_API_BASE` (point at a different server), `VITE_LENZ_URL`, and
`VITE_GA_ID` (opt into your own GA4 — analytics are off by default).

## Tech

React 19 + TypeScript + Vite + Tailwind. The `lenz-io` SDK is isomorphic, so this same code
runs in the browser, Node, Deno, and edge runtimes.

## Deploy

It's a plain Vite build (`npm run build` → `dist/`) — host it anywhere static. The included
`firebase.json` deploys to a Firebase Hosting **target** named `app`; point it at your own
project/site once:

```bash
firebase use --add                        # pick your Firebase project
firebase target:apply hosting app <site>  # map the "app" target to your site
bash deploy/deploy.sh
```

## License

MIT — see [LICENSE](LICENSE).

## Maintainer

[@Pavel12431432](https://github.com/Pavel12431432)
