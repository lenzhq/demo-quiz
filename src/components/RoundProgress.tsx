// Round counter, score and one rule per round: blue while running, ink once done.

interface RoundProgressProps {
  roundNumber: number;
  totalRounds: number;
  score: number;
  doneCount: number;
}

export default function RoundProgress({
  roundNumber,
  totalRounds,
  score,
  doneCount,
}: RoundProgressProps) {
  return (
    <div>
      <div className="ff-meta">
        <span className="ff-eyebrow">
          Round {roundNumber} of {totalRounds}
        </span>
        <span className="ff-score" style={{ fontSize: 13 }}>
          {score} pts
        </span>
      </div>
      <ol className="ff-track" aria-label={`Round ${roundNumber} of ${totalRounds}`}>
        {Array.from({ length: totalRounds }).map((_, i) => (
          <li
            key={i}
            className={i < doneCount ? "is-done" : i === roundNumber - 1 ? "is-running" : ""}
          />
        ))}
      </ol>
    </div>
  );
}
