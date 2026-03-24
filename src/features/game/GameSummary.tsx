import { useEffect, useState } from "react";

import type { GameClaim, GameMode } from "../../api/client";
import type { RoundResult } from "./GameRound";
import type { OddOneOutResult } from "./OddOneOutRound";
import { claimPath } from "../../utils/slugify";
import { getTier, type Tier } from "../../utils/scoring";
import ShareLinks from "../../components/ShareLinks";

const LENZ_URL = import.meta.env.VITE_LENZ_URL || "https://lenz.io";

const VERDICT_TEXT_COLOR: Record<string, string> = {
  True: "text-true",
  "Mostly True": "text-mostly-true",
  Misleading: "text-misleading",
  False: "text-false",
};

const VERDICT_BG: Record<string, string> = {
  True: "bg-true/10",
  "Mostly True": "bg-mostly-true/10",
  Misleading: "bg-misleading/10",
  False: "bg-false/10",
};

// ---------------------------------------------------------------------------
// Share helpers
// ---------------------------------------------------------------------------

const GAME_URL = window.location.origin;

const MODE_LABEL: Record<GameMode, string> = {
  tf: "True or False",
  "4v": "Four Verdicts",
  ooo: "Odd One Out",
};

function shareText(
  totalScore: number,
  maxScore: number,
  tier: Tier,
  exactCount: number,
  bestStreak: number,
  mode: GameMode,
): string {
  return [
    `I scored ${totalScore}/${maxScore} on Fact or Fiction (${MODE_LABEL[mode]})!`,
    `${tier.emoji} ${tier.label}`,
    `${exactCount}/10 exact matches, best streak: ${bestStreak}`,
    "",
    "Can you beat my score?",
    GAME_URL,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GameSummaryProps {
  claims: GameClaim[];
  results: RoundResult[];
  totalScore: number;
  bestStreak: number;
  mode: GameMode;
  onPlayAgain: () => void;
  oooRounds?: GameClaim[][];
  oooResults?: OddOneOutResult[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameSummary({
  claims,
  results,
  totalScore,
  bestStreak,
  mode,
  onPlayAgain,
  oooRounds,
  oooResults,
}: GameSummaryProps) {
  const isOoo = mode === "ooo" && oooResults && oooRounds;
  const tier = getTier(totalScore, mode);
  const exactCount = isOoo
    ? oooResults.filter((r) => r.correct).length
    : results.filter((r) => r.distance === 0).length;
  const closeCount = results.filter((r) => r.distance === 1).length;
  const roundCount = isOoo ? oooResults.length : results.length;
  const maxScore = isOoo ? roundCount * 100 : roundCount * (mode === "tf" ? 50 : 100);
  const text = isOoo
    ? [
        `I scored ${totalScore}/${maxScore} on Odd One Out!`,
        `${tier.emoji} ${tier.label}`,
        `Spotted ${exactCount}/${roundCount} false claims.`,
        "",
        "Can you beat my score?",
        GAME_URL,
      ].join("\n")
    : shareText(totalScore, maxScore, tier, exactCount, bestStreak, mode);
  const title = isOoo
    ? `I scored ${totalScore}/${maxScore} on Odd One Out! ${tier.emoji} ${tier.label} — Can you beat me?`
    : `I scored ${totalScore}/${maxScore} on Fact or Fiction (${MODE_LABEL[mode]})! ${tier.emoji} ${tier.label} — Can you beat me?`;

  // Animated score counter
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (totalScore === 0) return;
    const duration = 1200;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayScore(Math.round(eased * totalScore));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalScore]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-[fadeIn_0.4s_ease-out]">
      {/* Hero score */}
      <div className="text-center mb-8">
        <p className="text-sm font-semibold text-warm-400 uppercase tracking-widest mb-2">
          Final Score
        </p>
        <p className="text-5xl sm:text-6xl font-black text-warm-800 mb-1">
          {displayScore}
          <span className="text-2xl text-warm-400 font-bold">/{maxScore}</span>
        </p>
        <p className={`text-lg font-bold ${tier.color} mt-2`}>
          {tier.emoji} {tier.label}
        </p>
      </div>

      {/* Stats row */}
      {isOoo ? (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white rounded-xl border border-warm-200 p-4 text-center">
            <p className="text-2xl font-black text-true">{exactCount}</p>
            <p className="text-xs text-warm-400 font-medium">Correct</p>
          </div>
          <div className="bg-white rounded-xl border border-warm-200 p-4 text-center">
            <p className="text-2xl font-black text-primary">{bestStreak}</p>
            <p className="text-xs text-warm-400 font-medium">Best Streak</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl border border-warm-200 p-4 text-center">
            <p className="text-2xl font-black text-true">{exactCount}</p>
            <p className="text-xs text-warm-400 font-medium">Exact</p>
          </div>
          <div className="bg-white rounded-xl border border-warm-200 p-4 text-center">
            <p className="text-2xl font-black text-mostly-true">{closeCount}</p>
            <p className="text-xs text-warm-400 font-medium">Close</p>
          </div>
          <div className="bg-white rounded-xl border border-warm-200 p-4 text-center">
            <p className="text-2xl font-black text-primary">{bestStreak}</p>
            <p className="text-xs text-warm-400 font-medium">Best Streak</p>
          </div>
        </div>
      )}

      {/* Round recap */}
      <div className="bg-white rounded-2xl border border-warm-200 shadow-sm mb-8 overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-100">
          <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide">Round Recap</p>
        </div>
        <ul className="divide-y divide-warm-100">
          {isOoo
            ? oooResults.map((r, i) => {
                const round = oooRounds[r.roundIndex];
                const falseClaim = round?.[r.falseIndex];
                const totalPts = r.points + r.timeBonus + r.streakBonus;
                return (
                  <li key={i} className="px-5 py-3 flex items-start gap-3">
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5
                        ${r.correct ? "bg-true" : "bg-false"}`}
                    >
                      {r.correct ? "\u2713" : "\u2717"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-warm-700 leading-snug">
                        {falseClaim?.atomic_claim ?? "Unknown claim"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`text-xs font-bold ${r.correct ? "text-true" : "text-false"}`}
                        >
                          {r.correct
                            ? "Spotted the false claim"
                            : r.selectedIndex === null
                              ? "Timed out"
                              : "Wrong pick"}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-warm-500 mt-0.5">
                      +{totalPts}
                    </span>
                  </li>
                );
              })
            : results.map((r, i) => {
                const claim = claims[r.claimIndex];
                const guessColor = VERDICT_TEXT_COLOR[r.guess] ?? "text-warm-600";
                const correctColor = VERDICT_TEXT_COLOR[r.correct] ?? "text-warm-600";
                const correctBg = VERDICT_BG[r.correct] ?? "bg-warm-100";
                return (
                  <li key={i} className="px-5 py-3 flex items-start gap-3">
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5
                        ${r.distance === 0 ? "bg-true" : r.distance === 1 ? "bg-mostly-true" : r.distance === 2 ? "bg-misleading" : "bg-false"}`}
                    >
                      {r.distance === 0 ? "\u2713" : r.distance}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={claimPath(claim?.slug ?? "")}
                        className="text-sm text-warm-700 leading-snug hover:text-primary hover:underline transition-colors block"
                      >
                        {claim?.atomic_claim}
                      </a>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-bold ${guessColor}`}>{r.guess}</span>
                        {r.distance > 0 && (
                          <>
                            <span className="text-warm-300 text-xs">&rarr;</span>
                            <span
                              className={`text-xs font-bold ${correctColor} ${correctBg} rounded-full px-2 py-0.5`}
                            >
                              {r.correct}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-warm-500 mt-0.5">
                      +{r.points + r.streakBonus}
                    </span>
                  </li>
                );
              })}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
        <button
          onClick={onPlayAgain}
          className="rounded-xl bg-primary px-6 py-3 text-white font-bold text-sm
                     hover:bg-primary-hover active:scale-[0.97] transition-all
                     shadow-md shadow-primary/15 cursor-pointer"
        >
          Play Again
        </button>

        <ShareLinks
          url={GAME_URL}
          shareTitle={title}
          shareText={text}
          buttonLabel="Share Score"
          openAbove
        />

        <a
          href={`${LENZ_URL}/library`}
          className="rounded-xl border-2 border-warm-200 bg-white px-6 py-3 text-warm-700 font-bold text-sm
                     hover:border-warm-300 transition-all text-center"
        >
          Explore Library
        </a>
      </div>
    </div>
  );
}
