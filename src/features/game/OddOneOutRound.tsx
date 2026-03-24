import { useState, useEffect, useCallback, useRef } from "react";
import type { GameClaim } from "../../api/client";
import { recordGameView, submitGameVotes } from "../../api/client";
import { renderEmphasis } from "../../utils/renderEmphasis";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMER_SECONDS = 25;

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface OddOneOutResult {
  roundIndex: number;
  selectedIndex: number | null;
  falseIndex: number;
  correct: boolean;
  points: number;
  timeBonus: number;
  streakBonus: number;
  timeElapsed: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OddOneOutRoundProps {
  claims: GameClaim[];
  roundNumber: number;
  totalRounds: number;
  score: number;
  streak: number;
  results: OddOneOutResult[];
  onAnswer: (result: OddOneOutResult) => void;
  onNext: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OddOneOutRound({
  claims,
  roundNumber,
  totalRounds,
  score,
  streak,
  results,
  onAnswer,
  onNext,
}: OddOneOutRoundProps) {
  const [phase, setPhase] = useState<"guess" | "reveal">("guess");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [timeBonus, setTimeBonus] = useState(0);
  const [streakBonusEarned, setStreakBonusEarned] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [keyboardActive, setKeyboardActive] = useState(false);

  const falseIndex = claims.findIndex((c) => c.conclusion_label.toLowerCase() === "false");

  // Record views on mount
  useEffect(() => {
    claims.forEach((c) => recordGameView(c.share_id));
  }, [claims]);

  // Reset start time on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  // Timer: auto-timeout
  useEffect(() => {
    if (phase !== "guess") return;

    timerRef.current = setTimeout(() => {
      setSelectedIndex(null);
      setPointsEarned(0);
      setTimeBonus(0);
      setStreakBonusEarned(0);
      setFeedbackMsg("Time\u2019s up!");
      setPhase("reveal");
      setTimeout(() => setShowDetails(true), 400);

      onAnswer({
        roundIndex: roundNumber - 1,
        selectedIndex: null,
        falseIndex,
        correct: false,
        points: 0,
        timeBonus: 0,
        streakBonus: 0,
        timeElapsed: TIMER_SECONDS,
      });
    }, TIMER_SECONDS * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, roundNumber, falseIndex, onAnswer]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (phase !== "guess") return;
      if (timerRef.current) clearTimeout(timerRef.current);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const isCorrect = idx === falseIndex;

      let base = 0;
      let tb = 0;
      let sb = 0;

      if (isCorrect) {
        base = 100;
        if (elapsed <= 5) tb = 30;
        else if (elapsed <= 10) tb = 20;
        else if (elapsed <= 15) tb = 10;
        sb = streak > 0 ? streak * 10 : 0;
        setFeedbackMsg("Nailed it!");
      } else {
        setFeedbackMsg("Not quite!");
      }

      setSelectedIndex(idx);
      setPointsEarned(base);
      setTimeBonus(tb);
      setStreakBonusEarned(sb);
      setPhase("reveal");
      setTimeout(() => setShowDetails(true), 400);

      onAnswer({
        roundIndex: roundNumber - 1,
        selectedIndex: idx,
        falseIndex,
        correct: isCorrect,
        points: base,
        timeBonus: tb,
        streakBonus: sb,
        timeElapsed: Math.round(elapsed * 10) / 10,
      });

      // Submit implicit votes: selected claim → "false", others → "true"
      submitGameVotes(
        claims.map((c, i) => ({
          share_id: c.share_id,
          value: i === idx ? ("false" as const) : ("true" as const),
        })),
      );
    },
    [phase, falseIndex, streak, roundNumber, onAnswer, claims],
  );

  // Keyboard handler
  useEffect(() => {
    if (phase !== "guess") return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setKeyboardActive(true);
        setFocusedIndex((i) => (i + 1) % 3);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setKeyboardActive(true);
        setFocusedIndex((i) => (i - 1 + 3) % 3);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(focusedIndex);
      } else if (e.key >= "1" && e.key <= "3") {
        e.preventDefault();
        handleSelect(parseInt(e.key, 10) - 1);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [phase, focusedIndex, handleSelect]);

  const totalPoints = pointsEarned + timeBonus + streakBonusEarned;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-warm-500">
            Round {roundNumber} of {totalRounds}
          </span>
          <span className="text-xs font-bold text-primary">{score} pts</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalRounds }).map((_, i) => {
            let bg = "bg-warm-200";
            if (i < results.length) {
              bg = results[i].correct ? "bg-true" : "bg-false";
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

      {/* Heading */}
      {phase === "guess" && (
        <p className="text-center text-sm font-bold text-false mb-4">Which claim is FALSE?</p>
      )}

      {/* Claim cards */}
      <div className="flex flex-col gap-3 mb-4">
        {claims.map((claim, idx) => {
          const isFalse = claim.conclusion_label.toLowerCase() === "false";
          const isSelected = selectedIndex === idx;
          const isFocused = keyboardActive && focusedIndex === idx && phase === "guess";

          let borderClass = "border border-warm-200";
          let accentColor = "";
          if (phase === "reveal") {
            if (isSelected) {
              borderClass = isFalse ? "border-2 border-false" : "border-2 border-true";
            } else {
              borderClass = isFalse ? "border border-false/40" : "border border-true/40";
            }
            accentColor = isFalse ? "bg-false" : "bg-true";
          } else if (isFocused) {
            borderClass = "border border-warm-400 ring-2 ring-primary/30";
          }

          return (
            <button
              key={claim.share_id}
              onClick={() => phase === "guess" && handleSelect(idx)}
              disabled={phase !== "guess"}
              tabIndex={isFocused ? 0 : -1}
              className={`relative rounded-xl overflow-hidden ${borderClass} bg-white text-left
                         transition-all cursor-pointer
                         ${phase === "guess" ? "hover:border-warm-400 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] active:bg-warm-50" : ""}
                         disabled:cursor-default`}
            >
              {/* Left accent bar — reveal only */}
              {accentColor && <div className={`absolute left-0 inset-y-0 w-1 ${accentColor}`} />}
              <div className="p-4 flex items-start gap-3">
                {/* Number badge */}
                <span
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black mt-0.5
                    ${phase === "reveal" && isFalse ? "bg-false/10 text-false" : phase === "reveal" ? "bg-true/10 text-true" : "bg-warm-100 text-warm-500"}`}
                >
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-warm-800 leading-snug">
                    {claim.atomic_claim}
                  </p>

                  {/* Domain + date */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {claim.domain && (
                      <span className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {claim.domain}
                      </span>
                    )}
                    {claim.completed_at && (
                      <span className="text-[10px] text-warm-400 font-medium">
                        {new Date(claim.completed_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Reveal: badge + summary */}
                  {phase === "reveal" && (
                    <div className="mt-2 animate-[fadeIn_0.3s_ease-out]">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold
                          ${isFalse ? "bg-false/10 text-false" : "bg-true/10 text-true"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isFalse ? "bg-false" : "bg-true"}`}
                        />
                        {isFalse ? "FALSE" : "TRUE"}
                      </span>
                      {isFalse && showDetails && claim.executive_summary && (
                        <p className="mt-1.5 text-xs text-warm-500 leading-relaxed line-clamp-3">
                          {renderEmphasis(claim.executive_summary)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Selection indicator in reveal */}
                {phase === "reveal" && isSelected && (
                  <span className="shrink-0 mt-0.5 animate-[fadeIn_0.3s_ease-out]">
                    {isSelected && idx === falseIndex ? (
                      <svg className="w-5 h-5 text-true" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-false" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Guess phase: keyboard hint + timer */}
      {phase === "guess" && (
        <>
          <p className="text-[10px] text-warm-300 text-center mb-2 hidden sm:block">
            Use arrow keys to navigate, Enter to select, or press 1-3
          </p>
          <div className="h-1 rounded-full bg-warm-100 overflow-hidden mb-6">
            <div
              key={`timer-${roundNumber}`}
              className="h-full bg-false/30 rounded-full"
              style={{
                width: "100%",
                animation: `timerShrink ${TIMER_SECONDS}s linear forwards`,
              }}
            />
          </div>
        </>
      )}

      {/* Reveal phase: feedback + next */}
      {phase === "reveal" && (
        <div className="mb-6">
          <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap mb-4 animate-[fadeIn_0.3s_ease-out]">
            <span
              className={`text-lg font-extrabold ${totalPoints > 0 ? "text-true" : "text-false"}`}
            >
              {feedbackMsg}
            </span>
            <span
              className={`text-2xl font-black animate-[bounceIn_0.5s_ease-out] ${totalPoints > 0 ? "text-true" : "text-warm-600"}`}
            >
              +{pointsEarned}
            </span>
            {timeBonus > 0 && (
              <span className="text-sm font-bold text-mostly-true animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                +{timeBonus} speed
              </span>
            )}
            {streakBonusEarned > 0 && (
              <span className="text-sm font-bold text-primary animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                +{streakBonusEarned} streak!
              </span>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={onNext}
              className="rounded-xl bg-primary px-6 py-3 text-white font-bold text-sm
                         hover:bg-primary-hover active:scale-[0.97] transition-all
                         shadow-md shadow-primary/15 cursor-pointer"
            >
              {roundNumber < totalRounds ? "Next Round" : "See Results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
