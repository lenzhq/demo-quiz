import { useState, useEffect, useCallback, useRef } from "react";
import type { GameClaim } from "../../api/client";
import { renderEmphasis } from "../../utils/renderEmphasis";
import RoundProgress from "../../components/RoundProgress";
import Countdown from "../../components/Countdown";

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

  const falseIndex = claims.findIndex((c) => c.verdict.toLowerCase() === "false");

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

  return (
    <div className="ff-col">
      <RoundProgress
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        score={score}
        doneCount={results.length}
      />

      {/* Heading */}
      {phase === "guess" && <h2 className="ff-title ff-title--q">Which claim is FALSE?</h2>}

      {/* Claim cards */}
      <div className="flex flex-col gap-3 mb-6">
        {claims.map((claim, idx) => {
          const isFalse = claim.verdict.toLowerCase() === "false";
          const isSelected = selectedIndex === idx;
          const isFocused = keyboardActive && focusedIndex === idx && phase === "guess";

          const stateClass =
            phase === "reveal"
              ? `${isFalse ? "is-false" : "is-true"}${isSelected ? " is-picked" : ""}`
              : isFocused
                ? "is-focused"
                : "";

          return (
            <button
              key={claim.verification_id}
              onClick={() => phase === "guess" && handleSelect(idx)}
              disabled={phase !== "guess"}
              tabIndex={isFocused ? 0 : -1}
              className={`ff-artefact ${stateClass}`}
            >
              <div className="ff-claim">
                <span className="ff-claim__n">{String(idx + 1).padStart(2, "0")}</span>

                <div className="min-w-0">
                  <p className="ff-claim__text">{claim.atomic_claim}</p>

                  {/* Domain + date */}
                  {(claim.domain || claim.created_at) && (
                    <p className="ff-eyebrow ff-claim__meta">
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

                  {/* Reveal: verdict + summary */}
                  {phase === "reveal" && (
                    <div className="mt-3 animate-[fadeIn_0.3s_ease-out]">
                      <span className={`ff-verdict ${isFalse ? "ff-verdict--false" : "ff-verdict--true"}`}>
                        {isFalse ? "FALSE" : "TRUE"}
                      </span>
                      {isFalse && showDetails && claim.executive_summary && (
                        <p className="ff-claim__why line-clamp-3">
                          {renderEmphasis(claim.executive_summary)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Selection indicator in reveal */}
                <span className="ff-claim__mark">
                  {phase === "reveal" && isSelected && (
                    <span className="animate-[fadeIn_0.3s_ease-out]">
                      {isSelected && idx === falseIndex ? (
                        <svg className="text-true" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg className="text-false" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Guess phase: keyboard hint + timer */}
      {phase === "guess" && (
        <>
          <p className="ff-hint hidden sm:block">
            Use arrow keys to navigate, Enter to select, or press 1-3
          </p>
          <Countdown key={`timer-${roundNumber}`} seconds={TIMER_SECONDS} />
        </>
      )}

      {/* Reveal phase: feedback + next */}
      {phase === "reveal" && (
        <div className="mb-6">
          <div className="ff-result animate-[fadeIn_0.3s_ease-out]">
            <span className="ff-result__msg">{feedbackMsg}</span>
            <span className="ff-score ff-result__pts">+{pointsEarned}</span>
            {timeBonus > 0 && (
              <span className="ff-result__bonus animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                +{timeBonus} speed
              </span>
            )}
            {streakBonusEarned > 0 && (
              <span className="ff-result__bonus animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                +{streakBonusEarned} streak!
              </span>
            )}
          </div>

          <div className="ff-actions">
            <button onClick={onNext} className="ff-btn ff-btn--primary">
              {roundNumber < totalRounds ? "Next Round" : "See Results"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
