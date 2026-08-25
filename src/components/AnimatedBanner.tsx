import React from "react";
import { ASCII_BANNER } from "@/data/resumeData";
import TypewriterText from "./TypewriterText";

// ── Animated ASCII identity banner (NEEL) ───────────────────────
//
// Renders the prominent ASCII-art header with the same typewriter
// reveal as before. On top of the container-level colour sweep, each
// visible glyph is wrapped in a `.banner-char` span and given a
// negative, index-staggered delay so a soft shimmer wave travels
// through the characters. The NEEL art is also divided into six large
// regions which briefly glitch out and reassemble in sequence.
//
//   • Layout is preserved exactly — spans stay inline and only animate
//     paint properties (opacity / text-shadow), never geometry, so the
//     monospace grid and box-drawing glyphs stay aligned.
//   • Whitespace (spaces / newlines) stays as raw text nodes so the
//     typewriter's character counting and reveal are identical to the
//     plain-text version, and the banner-complete callback fires the
//     same way.
//   • `prefers-reduced-motion: reduce` disables the per-char animation
//     (see terminal.css) for a stable cyan fallback.

const ESC = "\x1b"; // ANSI escape prefix used by the colour-markup tokens
const STRIP_MARKUP = new RegExp(`${ESC}\\[[^\\]]*\\]`, "g");

// Stagger between adjacent characters. Negative delays phase every
// glyph immediately so the wave is visible the moment a glyph is
// revealed, rather than ramping up from zero.
const STEP_MS = 8;
const CHUNK_STAGGER_MS = 1650;
const ART_START_ROW = 3;
const ART_END_ROW = 8;
const ART_START_COLUMN = 4;
const ART_COLUMNS_PER_CHUNK = 15;
const ART_CHUNKS_PER_ROW = 3;

interface AnimatedBannerProps {
  onComplete?: () => void;
}

const AnimatedBanner: React.FC<AnimatedBannerProps> = ({ onComplete }) => {
  const content = React.useMemo(() => {
    const plain = ASCII_BANNER.replace(STRIP_MARKUP, "");
    let row = 0;
    let column = 0;

    return [...plain].map((ch, i) => {
      if (ch === "\n") {
        row += 1;
        column = 0;
        return ch;
      }

      const isArtGlyph =
        row >= ART_START_ROW &&
        row <= ART_END_ROW &&
        column >= ART_START_COLUMN &&
        ch !== " ";
      const chunk = isArtGlyph
        ? Math.floor((row - ART_START_ROW) / 3) * ART_CHUNKS_PER_ROW +
          Math.min(
            ART_CHUNKS_PER_ROW - 1,
            Math.floor((column - ART_START_COLUMN) / ART_COLUMNS_PER_CHUNK),
          )
        : null;
      const style = {
        "--char-delay": `-${i * STEP_MS}ms`,
        ...(chunk !== null && {
          "--chunk-delay": `-${chunk * CHUNK_STAGGER_MS}ms`,
        }),
      } as React.CSSProperties;

      column += 1;

      // Whitespace has no visible glyph to animate, so it stays a raw
      // text node (and preserves the typewriter's char-by-char count).
      if (ch === " ") return ch;
      return (
        <span
          key={i}
          className={chunk === null ? "banner-char" : "banner-char banner-chunk"}
          style={style}
        >
          {ch}
        </span>
      );
    });
  }, []);

  return (
    <pre className="terminal-output banner-art">
      <TypewriterText content={content} speed={4} onComplete={onComplete} />
    </pre>
  );
};

export default AnimatedBanner;
