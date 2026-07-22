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
  curated: true,          // LLM-curated, trivia-worthy subset
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
npm run dev
```

It works with zero config (defaults to the production public API). To point at a different
server, copy `.env.example` to `.env` and set `VITE_API_BASE`.

## Tech

React 19 + TypeScript + Vite + Tailwind. The `lenz-io` SDK is isomorphic, so this same code
runs in the browser, Node, Deno, and edge runtimes.

## License

MIT — see [LICENSE](LICENSE).
