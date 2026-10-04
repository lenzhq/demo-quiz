import { useState, useEffect, useCallback, useRef } from "react";
import type { GameClaim, GameMode } from "../../api/client";
import { renderEmphasis } from "../../utils/renderEmphasis";
import { verdictDistance, scoreForDistance } from "../../utils/scoring";
import RoundProgress from "../../components/RoundProgress";
import Countdown from "../../components/Countdown";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMER_SECONDS = 15;

// ---------------------------------------------------------------------------
// Verdict helpers
// ---------------------------------------------------------------------------

const VERDICTS_5V = ["True", "Mostly True", "Mixed", "Mostly False", "False"] as const;
const VERDICTS_TF = ["True", "False"] as const;
type Verdict = "True" | "Mostly True" | "Mixed" | "Mostly False" | "False";

// The verdict atom's class for each label (dot + mono label, verdict colour).
const VERDICT_ATOM: Record<Verdict, string> = {
  True: "ff-verdict--true",
  "Mostly True": "ff-verdict--mostly-true",
  Mixed: "ff-verdict--mixed",
  "Mostly False": "ff-verdict--mostly-false",
  False: "ff-verdict--false",
};

// ---------------------------------------------------------------------------
// Props & types
// ---------------------------------------------------------------------------

export interface RoundResult {
  claimIndex: number;
  guess: string;
  correct: string;
  distance: number;
  points: number;
  streakBonus: number;
}

interface GameRoundProps {
  claim: GameClaim;
  roundNumber: number;
  totalRounds: number;
  score: number;
  streak: number;
  results: RoundResult[];
  mode: GameMode;
  onAnswer: (result: RoundResult) => void;
  onNext: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameRound({
  claim,
  roundNumber,
  totalRounds,
  score,
  streak,
  results,
  mode,
  onAnswer,
  onNext,
}: GameRoundProps) {
  const verdicts = mode === "tf" ? VERDICTS_TF : VERDICTS_5V;
  const [phase, setPhase] = useState<"guess" | "reveal">("guess");
  const [guess, setGuess] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [streakBonus, setStreakBonus] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard navigation for verdict buttons
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [keyboardActive, setKeyboardActive] = useState(false);

  // Timer: auto-timeout after TIMER_SECONDS during guess phase
  useEffect(() => {
    if (phase !== "guess") return;

    timerRef.current = setTimeout(() => {
      setGuess(null);
      setPointsEarned(0);
      setStreakBonus(0);
      setFeedbackMsg("Time\u2019s up!");
      setPhase("reveal");

      setTimeout(() => setShowSummary(true), 400);

      onAnswer({
        claimIndex: roundNumber - 1,
        guess: "Timed out",
        correct: claim.verdict,
        distance: mode === "tf" ? 1 : 4,
        points: 0,
        streakBonus: 0,
      });
    }, TIMER_SECONDS * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, claim, roundNumber, onAnswer, mode]);

  const handleGuess = useCallback(
    (v: Verdict) => {
      if (phase !== "guess") return;

      // Cancel the auto-timeout timer
      if (timerRef.current) clearTimeout(timerRef.current);

      const correct = claim.verdict;
      const d = verdictDistance(v, correct);
      const base = scoreForDistance(d, mode);
      const bonus = d === 0 && streak > 0 ? streak * 10 : 0;

      setGuess(v);
      setPointsEarned(base);
      setStreakBonus(bonus);
      setPhase("reveal");

      // Feedback message
      if (d === 0) setFeedbackMsg("Nailed it!");
      else if (mode === "tf") setFeedbackMsg("Not quite!");
      else if (d === 1) setFeedbackMsg("Close!");
      else if (d === 2) setFeedbackMsg("Almost...");
      else setFeedbackMsg("Not quite!");

      // Delay showing the summary to let the reveal animation play
      setTimeout(() => setShowSummary(true), 400);

      onAnswer({
        claimIndex: roundNumber - 1,
        guess: v,
        correct,
        distance: d,
        points: base,
        streakBonus: bonus,
      });
    },
    [phase, claim, streak, roundNumber, onAnswer, mode],
  );

  // Keyboard handler for verdict selection
  useEffect(() => {
    if (phase !== "guess") return;

    const handler = (e: KeyboardEvent) => {
      const len = verdicts.length;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setKeyboardActive(true);
        setFocusedIndex((i) => (i + 1) % len);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setKeyboardActive(true);
        setFocusedIndex((i) => (i - 1 + len) % len);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleGuess(verdicts[focusedIndex] as Verdict);
      } else if (e.key >= "1" && e.key <= String(len)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        handleGuess(verdicts[idx] as Verdict);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [phase, verdicts, focusedIndex, handleGuess]);

  const correctLabel = claim.verdict;
  const correctAtom = VERDICT_ATOM[correctLabel as Verdict] ?? VERDICT_ATOM.True;

  return (
    <div className="ff-col">
      <RoundProgress
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        score={score}
        doneCount={results.length}
      />

      {/* Claim card */}
      <div className="ff-artefact ff-single mb-6">
        {(claim.domain || claim.created_at) && (
          <p className="ff-eyebrow mb-4">
            {[
              claim.domain,
              claim.created_at
                ? new Date(claim.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : null,
            ]
              .filter(Boolean)
              .join(" \u00b7 ")}
          </p>
        )}

        <p className="ff-claim__text">{claim.atomic_claim}</p>

        {/* Reveal: verdict + score */}
        {phase === "reveal" && (
          <div className="mt-4 flex items-center gap-4 animate-[fadeIn_0.3s_ease-out]">
            <span className={`ff-verdict ${correctAtom}`}>{correctLabel}</span>
            {claim.lenz_score !== null && (
              <span className="ff-score" style={{ fontSize: 13 }}>
                {Math.round(claim.lenz_score)}
                <span className="denom">/10</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Verdict buttons OR reveal feedback */}
      {phase === "guess" ? (
        <>
          <div className={`ff-answers ${mode === "tf" ? "" : "ff-answers--five"}`}>
            {verdicts.map((v, i) => {
              const isFocused = keyboardActive && focusedIndex === i;
              return (
                <button
                  key={v}
                  onClick={() => handleGuess(v)}
                  tabIndex={isFocused ? 0 : -1}
                  className={`ff-artefact ff-answer ${isFocused ? "is-focused" : ""}`}
                >
                  <span className={`ff-verdict ${VERDICT_ATOM[v]}`}>{v}</span>
                </button>
              );
            })}
          </div>
          <p className="ff-hint hidden sm:block">
            Use arrow keys to navigate, Enter to select, or press 1-{verdicts.length}
          </p>
          {/* Timer — synced with TIMER_SECONDS timeout */}
          <Countdown key={claim.verification_id} seconds={TIMER_SECONDS} />
        </>
      ) : (
        <div className="mb-6">
          {/* Points earned */}
          <div className="ff-result animate-[fadeIn_0.3s_ease-out]">
            <span className="ff-result__msg">{feedbackMsg}</span>
            <span className="ff-score ff-result__pts">+{pointsEarned}</span>
            {streakBonus > 0 && (
              <span className="ff-result__bonus animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                +{streakBonus} streak!
              </span>
            )}
          </div>

          {/* Guess vs correct */}
          <div className="ff-guess animate-[fadeIn_0.4s_ease-out_0.1s_both]">
            {guess ? (
              <>
                <span>Your guess</span>
                <span className={`ff-verdict ${VERDICT_ATOM[guess as Verdict] ?? ""}`}>{guess}</span>
                {guess !== correctLabel && (
                  <>
                    <span>Correct</span>
                    <span className={`ff-verdict ${correctAtom}`}>{correctLabel}</span>
                  </>
                )}
              </>
            ) : (
              <>
                <span>No guess</span>
                <span>Correct</span>
                <span className={`ff-verdict ${correctAtom}`}>{correctLabel}</span>
              </>
            )}
          </div>

          {/* Executive summary */}
          {showSummary && claim.executive_summary && (
            <p className="ff-why animate-[fadeIn_0.4s_ease-out]">
              {renderEmphasis(claim.executive_summary)}
            </p>
          )}

          {/* Next button */}
          <div className="ff-actions">
            <button onClick={onNext} className="ff-btn ff-btn--primary">
              {roundNumber < totalRounds ? "Next Claim" : "See Results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
