import { useState, useCallback, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { fetchGameClaims, fetchOddOneOutRounds } from "../api/client";
import type { GameClaim, GameMode } from "../api/client";
import { trackGameStart, trackGameFinish } from "../utils/analytics";
import LenzLogo from "../components/LenzLogo";
import GameIntro from "../features/game/GameIntro";
import GameRound from "../features/game/GameRound";
import type { RoundResult } from "../features/game/GameRound";
import OddOneOutRound from "../features/game/OddOneOutRound";
import type { OddOneOutResult } from "../features/game/OddOneOutRound";
import GameSummary from "../features/game/GameSummary";

const LENZ_URL = import.meta.env.VITE_LENZ_URL || "https://lenz.io";
const QUERY_PARAMS = new URLSearchParams(window.location.search);
const IS_EMBEDDED = QUERY_PARAMS.has("embedded");
// Styling hook: embedded under the lenz.io nav the column sits on the left edge.
if (IS_EMBEDDED) document.documentElement.dataset.embedded = "";
const VALID_MODES: GameMode[] = ["ooo", "tf", "5v"];
const AUTO_START_MODE = (() => {
  let m = QUERY_PARAMS.get("mode");
  if (m === "4v") m = "5v"; // legacy alias — old ?mode=4v bookmarks
  return m && (VALID_MODES as string[]).includes(m) ? (m as GameMode) : null;
})();

// ---------------------------------------------------------------------------
// Confetti helpers (lightweight CSS-only particles)
// ---------------------------------------------------------------------------

function spawnConfetti(container: HTMLElement) {
  const COLORS = [
    "var(--color-true)",
    "var(--color-mostly-true)",
    "var(--color-primary)",
    "var(--color-false)",
    "var(--color-confetti-purple)",
    "var(--color-confetti-pink)",
  ];
  const COUNT = 40;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement("div");
    const size = 6 + Math.random() * 6;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const x = 50 + (Math.random() - 0.5) * 60; // spread %
    const duration = 0.8 + Math.random() * 0.6;
    const delay = Math.random() * 0.2;
    const rotation = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 120;

    Object.assign(el.style, {
      position: "absolute",
      left: `${x}%`,
      top: "40%",
      width: `${size}px`,
      height: `${size * 0.6}px`,
      backgroundColor: color,
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      opacity: "1",
      pointerEvents: "none",
      zIndex: "100",
      transform: `rotate(${rotation}deg)`,
      animation: `confettiFall ${duration}s ease-out ${delay}s forwards`,
      // Custom properties for the animation
      ["--drift" as string]: `${drift}px`,
    });

    frag.appendChild(el);
  }
  container.appendChild(frag);
  // Cleanup after animation
  setTimeout(() => {
    container.querySelectorAll("div[style*=confettiFall]").forEach((el) => el.remove());
  }, 2000);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const TOTAL_ROUNDS = 10;

type Phase = "intro" | "loading" | "playing" | "summary";

export default function GamePage() {
  const [phase, setPhase] = useState<Phase>(AUTO_START_MODE ? "loading" : "intro");
  const [autoStartPending, setAutoStartPending] = useState(!!AUTO_START_MODE);
  const [mode, setMode] = useState<GameMode>("5v");
  const [claims, setClaims] = useState<GameClaim[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [oooRounds, setOooRounds] = useState<GameClaim[][]>([]);
  const [oooResults, setOooResults] = useState<OddOneOutResult[]>([]);

  const confettiRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Embedded: tell the page around the game how tall it is, so the page scrolls
  // and the frame never grows a second scrollbar. The page (lenz.io/play) sizes
  // the iframe from this message; standalone it does nothing.
  useEffect(() => {
    if (!IS_EMBEDDED || !mainRef.current || window.parent === window) return;
    const el = mainRef.current;
    const send = () =>
      window.parent.postMessage(
        { type: "lenz-play-height", height: Math.ceil(el.getBoundingClientRect().height) },
        "*",
      );
    const ro = new ResizeObserver(send);
    ro.observe(el);
    send();
    return () => ro.disconnect();
  }, []);

  // Track game finish analytics — captures values at the moment phase becomes "summary"
  const scoreRef = useRef(score);
  const bestStreakRef = useRef(bestStreak);
  scoreRef.current = score;
  bestStreakRef.current = bestStreak;

  useEffect(() => {
    if (phase === "summary") {
      const rounds = mode === "ooo" ? oooResults.length : results.length;
      trackGameFinish(scoreRef.current, rounds, bestStreakRef.current, mode);
    }
  }, [phase, mode, oooResults.length, results.length]);

  // Inject confetti keyframes once
  useEffect(() => {
    const id = "confetti-keyframes";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(320px) translateX(var(--drift, 0px)) rotate(720deg); opacity: 0; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      @keyframes timerShrink {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const autoStartedRef = useRef(false);

  const loadClaims = useCallback(async (m: GameMode) => {
    setMode(m);
    setPhase("loading");
    setError(null);
    try {
      if (m === "ooo") {
        const data = await fetchOddOneOutRounds(7);
        if (data.length === 0) {
          setError("Not enough claims in the library to play. Check back later!");
          setPhase("intro");
          return;
        }
        setOooRounds(data);
        setOooResults([]);
      } else {
        const data = await fetchGameClaims(TOTAL_ROUNDS, m);
        if (data.length === 0) {
          setError("Not enough claims in the library to play. Check back later!");
          setPhase("intro");
          return;
        }
        setClaims(data);
        setResults([]);
      }
      setCurrentRound(0);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setPhase("playing");
      window.scrollTo(0, 0);
      trackGameStart(m);
    } catch {
      setError("Failed to load claims. Please try again.");
      setPhase("intro");
    }
  }, []);

  useEffect(() => {
    if (AUTO_START_MODE && !autoStartedRef.current) {
      autoStartedRef.current = true;
      loadClaims(AUTO_START_MODE).finally(() => setAutoStartPending(false));
    }
  }, [loadClaims]);

  const handleAnswer = useCallback(
    (result: RoundResult) => {
      const newScore = score + result.points + result.streakBonus;
      setScore(newScore);
      setResults((prev) => [...prev, result]);

      if (result.distance === 0) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
        // Confetti on exact match!
        if (confettiRef.current) spawnConfetti(confettiRef.current);
      } else {
        setStreak(0);
      }
    },
    [score, streak, bestStreak],
  );

  const handleOooAnswer = useCallback(
    (result: OddOneOutResult) => {
      const newScore = score + result.points + result.timeBonus + result.streakBonus;
      setScore(newScore);
      setOooResults((prev) => [...prev, result]);

      if (result.correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
        if (confettiRef.current) spawnConfetti(confettiRef.current);
      } else {
        setStreak(0);
      }
    },
    [score, streak, bestStreak],
  );

  const handleNext = useCallback(() => {
    const nextRound = currentRound + 1;
    const total = mode === "ooo" ? oooRounds.length : claims.length;
    if (nextRound >= total) {
      setPhase("summary");
    } else {
      setCurrentRound(nextRound);
    }
  }, [currentRound, claims.length, oooRounds.length, mode]);

  return (
    <>
      <Helmet>
        <title>Fact or Fiction | Lenz</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {!IS_EMBEDDED && (
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          {/* Back to the quiz home (mode selection). */}
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-secondary hover:text-primary transition-colors text-sm"
            aria-label="Back to home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Home
          </a>
          {/* Separate link to the main Lenz site. */}
          <a
            href={LENZ_URL}
            className="inline-flex items-center gap-1.5 text-secondary hover:text-primary transition-colors text-sm"
            aria-label="Go to lenz.io"
          >
            <LenzLogo className="h-4" />
          </a>
        </div>
      )}

      <main
        ref={mainRef}
        className={`flex-1 pt-2 pb-16 relative overflow-hidden ${IS_EMBEDDED ? "" : "min-h-screen"}`}
        style={IS_EMBEDDED ? { paddingTop: 0 } : undefined}
      >
        {/* Confetti container */}
        <div ref={confettiRef} className="absolute inset-0 pointer-events-none overflow-hidden" />

        {phase === "intro" && !autoStartPending && <GameIntro onStart={(m) => loadClaims(m)} loading={false} embedded={IS_EMBEDDED} />}

        {phase === "loading" && !autoStartPending && <GameIntro onStart={(m) => loadClaims(m)} loading={true} embedded={IS_EMBEDDED} />}

        {error && (
          <div className="ff-col">
            <div className="ff-error" role="alert">
              {error}
            </div>
          </div>
        )}

        {phase === "playing" && mode === "ooo" && oooRounds[currentRound] && (
          <OddOneOutRound
            key={`ooo-${currentRound}`}
            claims={oooRounds[currentRound]}
            roundNumber={currentRound + 1}
            totalRounds={oooRounds.length}
            score={score}
            streak={streak}
            results={oooResults}
            onAnswer={handleOooAnswer}
            onNext={handleNext}
          />
        )}

        {phase === "playing" && mode !== "ooo" && claims[currentRound] && (
          <GameRound
            key={claims[currentRound].verification_id}
            claim={claims[currentRound]}
            roundNumber={currentRound + 1}
            totalRounds={claims.length}
            score={score}
            streak={streak}
            results={results}
            mode={mode}
            onAnswer={handleAnswer}
            onNext={handleNext}
          />
        )}

        {phase === "summary" && (
          <GameSummary
            claims={claims}
            results={results}
            totalScore={score}
            bestStreak={bestStreak}
            mode={mode}
            onPlayAgain={() => setPhase("intro")}
            oooRounds={mode === "ooo" ? oooRounds : undefined}
            oooResults={mode === "ooo" ? oooResults : undefined}
          />
        )}
      </main>
    </>
  );
}
