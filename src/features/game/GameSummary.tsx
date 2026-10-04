import { useEffect, useState } from "react";

import type { GameClaim, GameMode } from "../../api/client";
import type { RoundResult } from "./GameRound";
import type { OddOneOutResult } from "./OddOneOutRound";
import { getTier, type Tier } from "../../utils/scoring";
import ShareLinks from "../../components/ShareLinks";

const LENZ_URL = import.meta.env.VITE_LENZ_URL || "https://lenz.io";

const VERDICT_ATOM: Record<string, string> = {
  True: "ff-verdict--true",
  "Mostly True": "ff-verdict--mostly-true",
  Mixed: "ff-verdict--mixed",
  "Mostly False": "ff-verdict--mostly-false",
  False: "ff-verdict--false",
};

// ---------------------------------------------------------------------------
// Share helpers
// ---------------------------------------------------------------------------

const GAME_URL = window.location.origin;

const MODE_LABEL: Record<GameMode, string> = {
  tf: "True or False",
  "5v": "Five Verdicts",
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
    <div className="ff-col animate-[fadeIn_0.4s_ease-out]">
      {/* Hero score */}
      <div className="mb-10">
        <p className="ff-eyebrow mb-3">Final Score</p>
        <p className="ff-score ff-score--lg">
          {displayScore}
          <span className="denom">/{maxScore}</span>
        </p>
        <p className="ff-title ff-title--tier">{tier.label}</p>
      </div>

      {/* Stats row */}
      {isOoo ? (
        <ul className="ff-stats">
          <li>
            <b>{exactCount}</b>
            <span className="ff-eyebrow">Correct</span>
          </li>
          <li>
            <b>{bestStreak}</b>
            <span className="ff-eyebrow">Best Streak</span>
          </li>
        </ul>
      ) : (
        <ul className="ff-stats">
          <li>
            <b>{exactCount}</b>
            <span className="ff-eyebrow">Exact</span>
          </li>
          <li>
            <b>{closeCount}</b>
            <span className="ff-eyebrow">Close</span>
          </li>
          <li>
            <b>{bestStreak}</b>
            <span className="ff-eyebrow">Best Streak</span>
          </li>
        </ul>
      )}

      {/* Round recap */}
      <div className="ff-artefact mb-10 overflow-hidden">
        <div className="ff-recap__head">
          <p className="ff-eyebrow">Round Recap</p>
        </div>
        <ul className="ff-recap" style={{ margin: 0 }}>
          {isOoo
            ? oooResults.map((r, i) => {
                const round = oooRounds[r.roundIndex];
                const falseClaim = round?.[r.falseIndex];
                const totalPts = r.points + r.timeBonus + r.streakBonus;
                return (
                  <li key={i}>
                    <span className={r.correct ? "ff-tick" : "ff-cross"} role="img" aria-label={r.correct ? "Correct" : "Wrong"} />
                    <div className="min-w-0">
                      <p className="ff-recap__text">{falseClaim?.atomic_claim ?? "Unknown claim"}</p>
                      <p className="ff-recap__sub">
                        <span className={`ff-verdict ${r.correct ? "ff-verdict--true" : "ff-verdict--false"}`}>
                          {r.correct
                            ? "Spotted the false claim"
                            : r.selectedIndex === null
                              ? "Timed out"
                              : "Wrong pick"}
                        </span>
                      </p>
                    </div>
                    <span className="ff-score" style={{ fontSize: 13 }}>
                      +{totalPts}
                    </span>
                  </li>
                );
              })
            : results.map((r, i) => {
                const claim = claims[r.claimIndex];
                return (
                  <li key={i}>
                    {r.distance === 0 ? (
                      <span className="ff-tick" role="img" aria-label="Exact" />
                    ) : (
                      <span className="ff-dist" aria-label={`Off by ${r.distance}`}>
                        {r.distance}
                      </span>
                    )}
                    <div className="min-w-0">
                      <a href={claim?.url ?? ""} className="ff-recap__text block">
                        {claim?.atomic_claim}
                      </a>
                      <p className="ff-recap__sub">
                        <span className={`ff-verdict ${VERDICT_ATOM[r.guess] ?? "ff-verdict--mixed"}`}>
                          {r.guess}
                        </span>
                        {r.distance > 0 && (
                          <>
                            <span className="ff-eyebrow">Correct</span>
                            <span className={`ff-verdict ${VERDICT_ATOM[r.correct] ?? "ff-verdict--mixed"}`}>
                              {r.correct}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="ff-score" style={{ fontSize: 13 }}>
                      +{r.points + r.streakBonus}
                    </span>
                  </li>
                );
              })}
        </ul>
      </div>

      {/* Actions */}
      <div className="ff-actions mb-12">
        <button onClick={onPlayAgain} className="ff-btn ff-btn--primary">
          Play Again
        </button>

        <ShareLinks
          url={GAME_URL}
          shareTitle={title}
          shareText={text}
          buttonLabel="Share Score"
          openAbove
        />

        <a href={`${LENZ_URL}/library`} className="ff-btn ff-btn--ghost">
          Explore Library
        </a>
      </div>
    </div>
  );
}
