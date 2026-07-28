import React, { useEffect, useState } from "react";

// ── "Agent at work" indicator ──────────────────────────────────
//
// Three compact ASCII frames that cycle to suggest a small agent
// is alive and processing. All frames share identical width and
// height so cycling is jitter-free. Each frame is a closed 3-row
// square so the eye glyph sits on the middle row — that keeps it
// vertically aligned with the title text in the titlebar.
//
// Frame 0  — idle:    ━   closed eye
// Frame 1  — active:  ◉   alert eye
// Frame 2  — scan:    ◑◐  eyes looking both ways
//
// A subtle CSS opacity "breath" pulse (see terminal.css) layers on
// top so the widget feels alive without being noisy.

const FRAMES: ReadonlyArray<ReadonlyArray<string>> = [
  [" ┌───┐", " │ ━ │", " └───┘"],
  [" ┌───┐", " │ ◐ │", " └───┘"],
  [" ┌───┐", " │ ◑ │", " └───┘"],
];

const FRAME_INTERVAL_MS = 600;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const AgentAtWork: React.FC = () => {
  const [frame, setFrame] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Respect the user's reduced-motion preference and keep it in sync.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const sync = () => setReduced(mq.matches);
    sync();
    if (mq.addEventListener) {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    // Legacy Safari fallback
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  // Cycle through frames; freeze on the first frame if motion is reduced.
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
    }, FRAME_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <pre
      className="agent-at-work"
      aria-hidden="true"
      title="agent at work"
    >
      {FRAMES[frame].join("\n")}
    </pre>
  );
};

export default AgentAtWork;