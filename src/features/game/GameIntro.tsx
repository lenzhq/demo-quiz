import type { GameMode } from "../../api/client";

interface GameIntroProps {
  onStart: (mode: GameMode) => void;
  loading: boolean;
}

export default function GameIntro({ onStart, loading }: GameIntroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-warm-800 mb-3 tracking-tight">
        Fact or Fiction
      </h1>
      <p className="text-warm-500 text-base sm:text-lg max-w-md mb-2 leading-relaxed">
        Real claims, real verdicts.
        <br />
        How well can you spot the truth?
      </p>
      <p className="text-warm-400 text-sm max-w-sm mb-8 leading-relaxed">
        Pick a mode below. Streaks earn bonus points!
      </p>

      {/* Mode selection cards */}
      <p className="text-xs font-semibold text-warm-400 uppercase tracking-widest mb-4">
        Choose your mode
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-4">
        {/* Odd One Out card */}
        <button
          onClick={() => onStart("ooo")}
          disabled={loading}
          className="group relative rounded-2xl border-2 border-false/30 bg-surface p-5 text-left
                     sm:col-span-2
                     hover:border-false/60 hover:shadow-lg hover:shadow-false/10 hover:scale-[1.02]
                     active:scale-[0.98] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {/* New badge */}
          <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] font-bold text-primary-text uppercase tracking-wide">
            New
          </span>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-false/10 text-false text-sm font-black">
              3
            </span>
            <h3 className="text-base font-extrabold text-warm-800">Odd One Out</h3>
          </div>
          <p className="text-xs text-warm-500 leading-relaxed mb-3">
            See 3 claims each round. Two are true, one is false. Find the false one.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-true/10 text-true">
              <span className="w-1.5 h-1.5 rounded-full bg-true" /> True
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-true/10 text-true">
              <span className="w-1.5 h-1.5 rounded-full bg-true" /> True
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-warm-100 text-warm-500">
              <span className="w-1.5 h-1.5 rounded-full bg-warm-400" /> ???
            </span>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-warm-400">
            7 rounds &middot; 100 pts + time bonus per round
          </p>
        </button>

        {/* True or False card */}
        <button
          onClick={() => onStart("tf")}
          disabled={loading}
          className="group relative rounded-2xl border-2 border-true/30 bg-surface p-5 text-left
                     hover:border-true/60 hover:shadow-lg hover:shadow-true/10 hover:scale-[1.02]
                     active:scale-[0.98] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-true/10 text-true text-sm font-black">
              2
            </span>
            <h3 className="text-base font-extrabold text-warm-800">True or False</h3>
          </div>
          <p className="text-xs text-warm-500 leading-relaxed mb-3">
            Only claims rated True or False. Pick between two options.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-true/10 text-true">
              <span className="w-1.5 h-1.5 rounded-full bg-true" /> True
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-false/10 text-false">
              <span className="w-1.5 h-1.5 rounded-full bg-false" /> False
            </span>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-warm-400">50 pts max per round</p>
        </button>

        {/* Four Verdicts card */}
        <button
          onClick={() => onStart("4v")}
          disabled={loading}
          className="group relative rounded-2xl border-2 border-primary/30 bg-surface p-5 text-left
                     hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02]
                     active:scale-[0.98] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary-text text-sm font-black">
              4
            </span>
            <h3 className="text-base font-extrabold text-warm-800">Four Verdicts</h3>
          </div>
          <p className="text-xs text-warm-500 leading-relaxed mb-3">
            All verdict types. More nuance, more points to earn.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-true/10 text-true">
              <span className="w-1.5 h-1.5 rounded-full bg-true" /> True
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-mostly-true/10 text-mostly-true">
              <span className="w-1.5 h-1.5 rounded-full bg-mostly-true" /> Mostly True
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-misleading/10 text-misleading">
              <span className="w-1.5 h-1.5 rounded-full bg-misleading" /> Misleading
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-false/10 text-false">
              <span className="w-1.5 h-1.5 rounded-full bg-false" /> False
            </span>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-warm-400">100 pts max per round</p>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-warm-500 text-sm mt-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Loading claims...
        </div>
      )}
    </div>
  );
}
