import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import TypewriterText from "./TypewriterText";
import {
  BANNER_ART,
  findBannerArtLayout,
  getBannerChunkIndex,
  measureBannerCharWidth,
  selectBannerVariant,
  stripBannerMarkup,
  type BannerVariantId,
} from "@/lib/bannerLayout";

// ── Animated ASCII identity banner (NEEL) ───────────────────────
//
// The banner has two artworks: the original 65-column desktop art and a
// 30-column compact art for phones. Both use the same animation pipeline:
//
//   • A typewriter reveal, unchanged from the original header.
//   • A per-glyph shimmer wave (negative, index-staggered delay).
//   • Larger “chunk” glitch bursts over the NEEL lettering. The chunk grid is
//     derived from the actual block-glyph area of whichever art is mounted
//     (see `findBannerArtLayout`), so the compact art is not animating a
//     desktop-shaped grid.
//
// The variant is selected from the *measured* content-box width, not from
// the viewport: the terminal is capped at 900px and has its own padding, so a
// viewport breakpoint would pick the wrong art on tablets and zoomed text.
//
// ResizeObserver is preferred over a window-resize listener because the
// terminal can change width for reasons other than the viewport (font swap,
// scrollbar, future layout changes). It only reports box-size changes though,
// so `document.fonts.ready` triggers one extra measurement after the
// monospace webfont loads. Browsers without ResizeObserver fall back to the
// window resize event.
//
// `prefers-reduced-motion: reduce` disables the shimmer/flicker in CSS for a
// stable cyan banner. `onComplete` is guarded so a variant swap (rotation or
// resize) can never unlock the header twice.

const STEP_MS = 8;
const CHUNK_CYCLE_MS = 10_000;

interface AnimatedBannerProps {
  onComplete?: () => void;
}

const AnimatedBanner: React.FC<AnimatedBannerProps> = ({ onComplete }) => {
  const [variant, setVariant] = useState<BannerVariantId | null>(null);
  const [completed, setCompleted] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    onCompleteRef.current?.();
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let lastMeasuredWidth = -1;

    const measure = (force = false) => {
      if (disposed) return;
      const availableWidth = frame.getBoundingClientRect().width;
      // ResizeObserver also fires when the banner's height changes during the
      // typewriter reveal. Width is what selects the art, so skip those extra
      // layout reads; a font swap passes `force` because advance width can
      // change without the box resizing.
      if (!force && Math.abs(availableWidth - lastMeasuredWidth) < 0.5) return;
      lastMeasuredWidth = availableWidth;

      const charWidth = measureBannerCharWidth(frame);
      const next = selectBannerVariant(availableWidth, charWidth);
      setVariant((current) => (current === next ? current : next));
    };

    // Initial measurement runs in a layout effect, before the browser paints,
    // so phones never flash the too-wide desktop banner first.
    measure(true);

    const onWindowResize = () => measure(true);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => measure());
      resizeObserver.observe(frame);
    } else {
      frame.ownerDocument.defaultView?.addEventListener("resize", onWindowResize);
    }

    let cancelled = false;
    const fonts = frame.ownerDocument.fonts;
    fonts?.ready
      ?.then(() => {
        if (!cancelled) measure(true);
      })
      ?.catch(() => {
        // Font loading API is best-effort; the initial measurement still ran.
      });

    return () => {
      disposed = true;
      cancelled = true;
      resizeObserver?.disconnect();
      frame.ownerDocument.defaultView?.removeEventListener("resize", onWindowResize);
    };
  }, []);

  const content = useMemo(() => {
    if (!variant) return [];

    const art = BANNER_ART[variant];
    const plain = stripBannerMarkup(art);
    const layout = findBannerArtLayout(art);
    let row = 0;
    let column = 0;

    return [...plain].map((ch, i) => {
      if (ch === "\n") {
        row += 1;
        column = 0;
        return ch;
      }

      const chunk =
        ch === " " ? null : getBannerChunkIndex(layout, row, column);
      const chunkDelay =
        chunk !== null && layout
          ? (chunk * CHUNK_CYCLE_MS) / layout.totalChunks
          : 0;
      const style = {
        "--char-delay": `-${i * STEP_MS}ms`,
        ...(chunk !== null && {
          "--chunk-delay": `-${chunkDelay}ms`,
        }),
      } as React.CSSProperties;

      column += 1;

      // Whitespace stays a raw text node so the typewriter character count and
      // the monospace layout match the plain source exactly.
      if (ch === " ") return ch;
      return (
        <span
          key={`${variant}-${i}`}
          className={chunk === null ? "banner-char" : "banner-char banner-chunk"}
          style={style}
        >
          {ch}
        </span>
      );
    });
  }, [variant]);

  return (
    <div
      ref={frameRef}
      className="banner-frame"
      data-banner-variant={variant ?? "pending"}
    >
      {variant && (
        <pre
          className={`terminal-output banner-art banner-art--${variant}`}
          data-variant={variant}
        >
          {completed ? (
            content
          ) : (
            <TypewriterText
              key={variant}
              content={content}
              speed={4}
              onComplete={handleComplete}
            />
          )}
        </pre>
      )}
    </div>
  );
};

export default AnimatedBanner;
