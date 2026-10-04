import { useEffect, useState } from "react";

// Display only: the round's own timeout (in the round component) is what ends
// the round. This mirrors it as a mono number over a quiet rule, both started
// when the round's answer phase mounts and gone when it ends.

const LOW_SECONDS = 5;

export default function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setLeft(Math.max(0, seconds - Math.floor((Date.now() - start) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [seconds]);

  return (
    <div className="ff-timer" role="timer" aria-label="Time left">
      <div className="ff-timer__rule" aria-hidden="true">
        <span style={{ width: "100%", animation: `timerShrink ${seconds}s linear forwards` }} />
      </div>
      <span className={`ff-timer__n${left <= LOW_SECONDS ? " is-low" : ""}`}>{left}s</span>
    </div>
  );
}
