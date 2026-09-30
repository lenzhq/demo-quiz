import type { GameMode } from "../../api/client";

interface GameIntroProps {
  onStart: (mode: GameMode) => void;
  loading: boolean;
  embedded?: boolean;
}

type VerdictKey = "true" | "mostly-true" | "mixed" | "mostly-false" | "false";

const MODES: {
  mode: GameMode;
  n: string;
  title: string;
  blurb: string;
  verdicts: { key: VerdictKey; label: string }[];
  foot: string;
}[] = [
  {
    mode: "ooo",
    n: "03",
    title: "Odd One Out",
    blurb: "See 3 claims each round. Two are true, one is false. Find the false one.",
    verdicts: [
      { key: "true", label: "True" },
      { key: "true", label: "True" },
      { key: "false", label: "False" },
    ],
    foot: "7 rounds · 100 pts + time bonus per round",
  },
  {
    mode: "tf",
    n: "02",
    title: "True or False",
    blurb: "Only claims rated True or False. Pick between two options.",
    verdicts: [
      { key: "true", label: "True" },
      { key: "false", label: "False" },
    ],
    foot: "50 pts max per round",
  },
  {
    mode: "5v",
    n: "05",
    title: "Five Verdicts",
    blurb: "All verdict types. More nuance, more points to earn.",
    verdicts: [
      { key: "true", label: "True" },
      { key: "mostly-true", label: "Mostly True" },
      { key: "mixed", label: "Mixed" },
      { key: "mostly-false", label: "Mostly False" },
      { key: "false", label: "False" },
    ],
    foot: "100 pts max per round",
  },
];

export default function GameIntro({ onStart, loading, embedded }: GameIntroProps) {
  return (
    <div className="ff-col" style={{ paddingTop: embedded ? 0 : 48 }}>
      {/* Embedded, the page around the game already carries the title. */}
      {!embedded && <h1 className="ff-title" style={{ fontSize: "clamp(32px, 2.4vw + 20px, 46px)" }}>Fact or Fiction</h1>}
      <p className="ff-lede" style={embedded ? { marginTop: 0 } : undefined}>
        Real claims, real verdicts. How well can you spot the truth?
      </p>
      <p className="ff-eyebrow" style={{ marginTop: 16 }}>
        Pick a mode below. Streaks earn bonus points!
      </p>

      {/* Mode selection: open rows, one per mode */}
      <ul className="ff-modes">
        {MODES.map((m) => (
          <li key={m.mode}>
            <button onClick={() => onStart(m.mode)} disabled={loading} className="ff-mode">
              <span className="ff-mode__n">{m.n}</span>
              <span className="block min-w-0">
                <span className="ff-mode__t">{m.title}</span>
                <span className="ff-mode__d block">{m.blurb}</span>
                <span className="ff-mode__f flex flex-wrap gap-x-4 gap-y-1">
                  {m.verdicts.map((v, i) => (
                    <span key={i} className={`ff-verdict ff-verdict--${v.key}`}>
                      {v.label}
                    </span>
                  ))}
                </span>
                <span className="ff-eyebrow block" style={{ marginTop: 10 }}>
                  {m.foot}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {loading && (
        <div className="ff-eyebrow flex items-center gap-2 mt-6" role="status">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Loading claims...
        </div>
      )}
    </div>
  );
}
