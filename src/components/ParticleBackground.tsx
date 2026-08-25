import React, { useEffect, useRef } from "react";

// ── Particle backdrop ───────────────────────────────────────────
//
// A sparse, slow-drifting field of faint dots and occasional glyphs
// that fills the *inside* of the terminal window. It is mounted as the
// first child of `.terminal-window`, which clips it (`overflow: hidden`)
// and isolates it behind all terminal content (negative z-index within
// the window's stacking context). Deliberately understated — nothing
// like a dense Matrix rain — so the terminal text stays fully legible.
// It reuses the terminal's cyan/green accents (plus a neutral dim) at
// very low opacity.
//
// Accessibility & performance:
//   • `prefers-reduced-motion: reduce` → renders one static frame,
//     no animation loop (mirrors the AgentAtWork freeze behaviour).
//   • Pauses the rAF loop while the tab is hidden.
//   • Device-pixel-ratio capped at 2, single canvas, one loop.
//   • `pointer-events: none` + `aria-hidden` so it can never swallow
//     pointer or keyboard input.

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Glyph set is small and terminal-ish, kept subtle rather than noisy.
const GLYPHS = ["0", "1", "+", "-", "<", ">", "$", "#", "%", "&"] as const;

const HUES = {
  cyan: "#00fff5",
  green: "#39ff14",
  dim: "#6b7a8a",
} as const;

type Hue = keyof typeof HUES;

interface Particle {
  x: number;
  y: number;
  vx: number; // horizontal drift (px/s)
  vy: number; // upward drift (px/s)
  size: number; // dot radius or glyph font size (px)
  type: "dot" | "glyph";
  glyph: string;
  baseAlpha: number;
  phase: number; // twinkle phase (rad)
  twinkle: number; // twinkle speed (rad/s)
  hue: Hue;
}

const MAX_PARTICLES = 170;
// One particle per ~N px². Tuned for a terminal-window-sized canvas
// (max ~900×700) — denser than before so the field is clearly present
// yet still reads as an uncluttered backdrop, not a rain.
const DENSITY = 6000;

function makeParticle(w: number, h: number): Particle {
  // Glyphs now dominate (60%) for a stronger terminal feel.
  const type: "dot" | "glyph" = Math.random() < 0.6 ? "glyph" : "dot";
  const roll = Math.random();
  const hue: Hue = roll < 0.5 ? "cyan" : roll < 0.85 ? "green" : "dim";
  const isGlyph = type === "glyph";

  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 4,
    vy: 4 + Math.random() * 14,
    size: isGlyph ? 10 + Math.random() * 8 : 0.8 + Math.random() * 1.8,
    type,
    glyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
    baseAlpha: isGlyph ? 0.14 + Math.random() * 0.16 : 0.18 + Math.random() * 0.27,
    phase: Math.random() * Math.PI * 2,
    twinkle: 0.4 + Math.random() * 1.2,
    hue,
  };
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rafId = 0;
    let running = false;
    let last = 0;
    let reduced = false;

    const mq = window.matchMedia
      ? window.matchMedia(REDUCED_MOTION_QUERY)
      : null;
    reduced = mq ? mq.matches : false;

    const seed = () => {
      const count = Math.min(
        MAX_PARTICLES,
        Math.max(0, Math.floor((width * height) / DENSITY)),
      );
      particles = Array.from({ length: count }, () =>
        makeParticle(width, height),
      );
    };

    const render = (dt: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (dt > 0) {
          p.y -= p.vy * dt;
          p.x += p.vx * dt;
          p.phase += p.twinkle * dt;
        }

        // Wrap so the field loops seamlessly with no teleports at edges.
        if (p.y < -24) {
          p.y = height + 24;
          p.x = Math.random() * width;
        }
        if (p.x < -24) p.x = width + 24;
        else if (p.x > width + 24) p.x = -24;

        const alpha = Math.max(
          0,
          p.baseAlpha * (0.7 + 0.3 * Math.sin(p.phase)),
        );
        ctx.fillStyle = HUES[p.hue];

        if (p.type === "dot") {
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = alpha;
          ctx.font = `${p.size}px "JetBrains Mono", ui-monospace, monospace`;
          ctx.fillText(p.glyph, p.x, p.y);
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = (t: number) => {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
      last = t;
      render(dt);
      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      if (reduced) {
        render(0);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    const resize = () => {
      // Size to the canvas's own box — i.e. the terminal window it is
      // clipped inside — not the viewport. `getBoundingClientRect`
      // reflects the `absolute inset-0` layout.
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width < 1 || height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) render(0);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onMotion = () => {
      reduced = mq ? mq.matches : false;
      stop();
      start();
    };

    resize();
    start();

    // ResizeObserver tracks the terminal window's responsive size
    // (90vh / max-height / viewport changes) so the canvas re-fits
    // whenever its clipping box changes. Reading `getBoundingClientRect`
    // inside the callback and mutating only the bitmap dimensions never
    // changes CSS layout, so this cannot loop.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
    }

    document.addEventListener("visibilitychange", onVisibility);
    if (mq && mq.addEventListener) mq.addEventListener("change", onMotion);
    else if (mq && mq.addListener) mq.addListener(onMotion);

    return () => {
      stop();
      if (ro) ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (mq && mq.removeEventListener) mq.removeEventListener("change", onMotion);
      else if (mq && mq.removeListener) mq.removeListener(onMotion);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 -z-10 block h-full w-full"
      aria-hidden="true"
    />
  );
};

export default ParticleBackground;
