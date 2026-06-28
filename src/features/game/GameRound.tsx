import { useState, useEffect, useCallback, useRef } from "react";
import type { GameClaim, GameMode, VoteValue } from "../../api/client";
import { recordGameView, submitGameVotes } from "../../api/client";
import { renderEmphasis } from "../../utils/renderEmphasis";
import { verdictDistance, scoreForDistance } from "../../utils/scoring";

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

const VERDICT_TO_VOTE: Record<string, VoteValue> = {
  True: "true",
  "Mostly True": "mostly_true",
  Mixed: "mixed",
  "Mostly False": "mostly_false",
  False: "false",
};

const VERDICT_STYLES: Record<
  Verdict,
  { bg: string; bgHover: string; text: string; ring: string; dot: string }
> = {
  True: {
    bg: "bg-true/10",
    bgHover: "hover:bg-true/20",
    text: "text-true",
    ring: "ring-true/40",
    dot: "bg-true",
  },
  "Mostly True": {
    bg: "bg-mostly-true/10",
    bgHover: "hover:bg-mostly-true/20",
    text: "text-mostly-true",
    ring: "ring-mostly-true/40",
    dot: "bg-mostly-true",
  },
  Mixed: {
    bg: "bg-mixed/10",
    bgHover: "hover:bg-mixed/20",
    text: "text-mixed",
    ring: "ring-mixed/40",
    dot: "bg-mixed",
  },
  "Mostly False": {
    bg: "bg-mostly-false/10",
    bgHover: "hover:bg-mostly-false/20",
    text: "text-mostly-false",
    ring: "ring-mostly-false/40",
    dot: "bg-mostly-false",
  },
  False: {
    bg: "bg-false/10",
    bgHover: "hover:bg-false/20",
    text: "text-false",
    ring: "ring-false/40",
    dot: "bg-false",
  },
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

  // Record view when the executive summary is shown
  useEffect(() => {
    if (showSummary && claim.executive_summary) {
      recordGameView(claim.share_id);
    }
  }, [showSummary, claim.share_id, claim.executive_summary]);

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
        correct: claim.conclusion_label,
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

      const correct = claim.conclusion_label;
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

      // Submit implicit vote based on the user's guess
      const voteValue = VERDICT_TO_VOTE[v];
      if (voteValue) {
        submitGameVotes([{ share_id: claim.share_id, value: voteValue }]);
      }
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

  const correctLabel = claim.conclusion_label;
  const correctStyle = VERDICT_STYLES[correctLabel as Verdict] ?? VERDICT_STYLES.True;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-warm-500">
            Round {roundNumber} of {totalRounds}
          </span>
          <span className="text-xs font-bold text-primary-text">{score} pts</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalRounds }).map((_, i) => {
            let bg = "bg-warm-200";
            if (i < results.length) {
              const r = results[i];
              if (r.distance === 0) bg = "bg-true";
              else if (r.distance === 1) bg = "bg-mostly-true";
              else if (r.distance === 2) bg = "bg-mixed";
              else if (r.distance === 3) bg = "bg-mostly-false";
              else bg = "bg-false";
            } else if (i === roundNumber - 1) {
              bg = "bg-primary";
            }
            return (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${bg}`}
              />
            );
          })}
        </div>
      </div>

      {/* Claim card */}
      <div className="relative bg-surface rounded-2xl border border-warm-200 shadow-sm p-6 sm:p-8 mb-6">
        {/* Domain pill & date */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {claim.domain && (
            <span className="inline-flex items-center rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-semibold text-primary-text">
              {claim.domain}
            </span>
          )}
          {claim.completed_at && (
            <span className="text-[11px] text-warm-400 font-medium">
              {new Date(claim.completed_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        <p className="text-lg sm:text-xl font-medium text-warm-800 leading-relaxed italic">
          &ldquo;{claim.atomic_claim}&rdquo;
        </p>

        {/* Reveal: score badge */}
        {phase === "reveal" && (
          <div className="mt-4 flex items-center gap-2 animate-[fadeIn_0.3s_ease-out]">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${correctStyle.bg} ${correctStyle.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${correctStyle.dot}`} />
              {correctLabel}
            </span>
            {claim.lenz_score !== null && (
              <span className="text-xs text-warm-400 font-medium">
                Score: {Math.round(claim.lenz_score)}/10
              </span>
            )}
          </div>
        )}
      </div>

      {/* Verdict buttons OR reveal feedback */}
      {phase === "guess" ? (
        <>
          <div
            className={`grid gap-3 mb-3 ${mode === "tf" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}
          >
            {verdicts.map((v, i) => {
              const s = VERDICT_STYLES[v];
              const isFocused = keyboardActive && focusedIndex === i;
              return (
                <button
                  key={v}
                  onClick={() => handleGuess(v)}
                  tabIndex={isFocused ? 0 : -1}
                  className={`rounded-xl border-2 ${isFocused ? "border-warm-400 ring-2 " + s.ring : "border-transparent"} ${s.bg} ${s.bgHover} ${s.text}
                           px-4 py-3.5 text-sm font-bold transition-all
                           hover:ring-2 ${s.ring} hover:scale-[1.03]
                           active:scale-[0.97] cursor-pointer`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-warm-300 text-center mb-2 hidden sm:block">
            Use arrow keys to navigate, Enter to select, or press 1-{verdicts.length}
          </p>
          {/* Timer bar — synced with TIMER_SECONDS timeout */}
          <div className="h-1 rounded-full bg-warm-100 overflow-hidden mb-6">
            <div
              key={claim.share_id}
              className="h-full bg-primary/30 rounded-full"
              style={{
                width: "100%",
                animation: `timerShrink ${TIMER_SECONDS}s linear forwards`,
              }}
            />
          </div>
        </>
      ) : (
        <div className="mb-6">
          {/* Points earned */}
          <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap mb-4 animate-[fadeIn_0.3s_ease-out]">
            {/* Feedback badge */}
            <span
              className={`text-lg font-extrabold ${
                pointsEarned > 0 && feedbackMsg === "Nailed it!"
                  ? "text-true"
                  : pointsEarned >= 50
                    ? "text-mostly-true"
                    : pointsEarned >= 25
                      ? "text-mixed"
                      : "text-false"
              }`}
            >
              {feedbackMsg}
            </span>
            <span
              className={`text-2xl font-black animate-[bounceIn_0.5s_ease-out] ${
                pointsEarned > 0 && feedbackMsg === "Nailed it!" ? "text-true" : "text-warm-600"
              }`}
            >
              +{pointsEarned}
            </span>
            {streakBonus > 0 && (
              <span className="text-sm font-bold text-primary-text animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                +{streakBonus} streak!
              </span>
            )}
          </div>

          {/* Guess vs correct */}
          <div className="flex items-center justify-center gap-2 mb-4 text-sm animate-[fadeIn_0.4s_ease-out_0.1s_both]">
            {guess ? (
              <>
                <span className="text-warm-400">Your guess:</span>
                <span
                  className={`font-bold ${
                    VERDICT_STYLES[guess as Verdict]?.text ?? "text-warm-600"
                  }`}
                >
                  {guess}
                </span>
                {guess !== correctLabel && (
                  <>
                    <span className="text-warm-300 mx-1">&rarr;</span>
                    <span className="text-warm-400">Correct:</span>
                    <span className={`font-bold ${correctStyle.text}`}>{correctLabel}</span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="text-warm-400 italic">No guess</span>
                <span className="text-warm-300 mx-1">&rarr;</span>
                <span className="text-warm-400">Correct:</span>
                <span className={`font-bold ${correctStyle.text}`}>{correctLabel}</span>
              </>
            )}
          </div>

          {/* Executive summary */}
          {showSummary && claim.executive_summary && (
            <div className="bg-warm-50 rounded-xl p-4 text-sm text-warm-600 leading-relaxed mb-4 animate-[fadeIn_0.4s_ease-out]">
              {renderEmphasis(claim.executive_summary)}
            </div>
          )}

          {/* Next button */}
          <div className="flex justify-center">
            <button
              onClick={onNext}
              className="rounded-xl bg-primary px-6 py-3 text-cream font-bold text-sm
                         hover:bg-primary-hover active:scale-[0.97] transition-all
                         shadow-md shadow-primary/15 cursor-pointer"
            >
              {roundNumber < totalRounds ? "Next Claim" : "See Results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
