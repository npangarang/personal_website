import { ASCII_BANNER, ASCII_BANNER_COMPACT } from "@/data/resumeData";

/**
 * Banner layout + variant selection helpers.
 *
 * The full banner is the desktop identity art. The compact banner is a
 * narrower box (30 visible columns) for phones. Both are boxed ASCII art, so
 * the shimmer “chunks” are derived from the actual block-glyph area of each
 * variant rather than from coordinates that only make sense for the full art.
 */

export type BannerVariantId = "full" | "compact";

export const BANNER_ART: Record<BannerVariantId, string> = {
  full: ASCII_BANNER,
  compact: ASCII_BANNER_COMPACT,
};

/** Content width below this never gets the full 65-column art. */
export const FULL_MIN_AVAILABLE_WIDTH = 600;

/** Visible monospace columns the full banner needs to breathe. */
export const FULL_MIN_COLUMNS = 65;

/** Approximate width of one glitch chunk, in monospace columns. */
const CHUNK_TARGET_COLUMNS = 12;
/** Vertical band size for the glitch chunks. */
const CHUNK_ROWS_PER_BAND = 3;

const ESC = String.fromCharCode(27);
const ANSI_TOKEN = new RegExp(`${ESC}\\[[^\\]]*\\]`, "g");
const BOX_EDGE = /[║╔╗╚╝]/u;
const INTERIOR_STROKE = /[╔╗╚╝═║█]/u;

export interface BannerArtLayout {
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
  rowBands: number;
  columnBands: number;
  totalChunks: number;
}

export function stripBannerMarkup(text: string): string {
  return text.replace(ANSI_TOKEN, "");
}

export function getBannerLines(text: string): string[] {
  return stripBannerMarkup(text).split("\n");
}

/** Widest visible line, in display columns. */
export function getBannerColumnCount(text: string): number {
  return getBannerLines(text).reduce((widest, line) => {
    const width = [...line].length;
    return width > widest ? width : widest;
  }, 0);
}

function interiorOf(line: string): string {
  const chars = [...line];
  const from = BOX_EDGE.test(chars[0] ?? "") ? 1 : 0;
  const to = BOX_EDGE.test(chars[chars.length - 1] ?? "")
    ? chars.length - 1
    : chars.length;
  return chars.slice(from, to).join("");
}

/**
 * Find the part of the banner that reads as the NEEL art: rows containing
 * solid block glyphs, plus any immediately following row that is still made
 * of box-drawing strokes (the bottom of the letters sits on such a row and
 * contains no solid blocks). Borders, blank padding, and the tagline are
 * excluded, so the chunk grid adapts to either banner variant.
 */
export function findBannerArtLayout(text: string): BannerArtLayout | null {
  const lines = getBannerLines(text);
  const solidRows: number[] = [];

  lines.forEach((line, row) => {
    if ([...line].includes("█")) solidRows.push(row);
  });

  if (solidRows.length === 0) return null;

  const startRow = solidRows[0];
  let endRow = solidRows[solidRows.length - 1];

  // Include the letter-bottom outline row(s), but stop at blank lines or the
  // tagline (which has no interior box strokes).
  while (endRow + 1 < lines.length) {
    const next = lines[endRow + 1];
    if (!next.trim()) break;
    if (/^[╔╚]/u.test(next)) break;
    if (!BOX_EDGE.test([...next][0] ?? "")) break;
    if (!INTERIOR_STROKE.test(interiorOf(next))) break;
    endRow += 1;
  }

  let startColumn = Number.POSITIVE_INFINITY;
  let endColumn = -1;

  for (let row = startRow; row <= endRow; row += 1) {
    const chars = [...lines[row]];
    const from = BOX_EDGE.test(chars[0] ?? "") ? 1 : 0;
    const to = BOX_EDGE.test(chars[chars.length - 1] ?? "")
      ? chars.length - 1
      : chars.length;
    for (let column = from; column < to; column += 1) {
      if (chars[column] !== " ") {
        startColumn = Math.min(startColumn, column);
        endColumn = Math.max(endColumn, column);
      }
    }
  }

  if (!Number.isFinite(startColumn) || endColumn < startColumn) return null;

  const rowSpan = endRow - startRow + 1;
  const columnSpan = endColumn - startColumn + 1;
  const rowBands = Math.max(1, Math.ceil(rowSpan / CHUNK_ROWS_PER_BAND));
  const columnBands = Math.max(
    1,
    Math.min(4, Math.ceil(columnSpan / CHUNK_TARGET_COLUMNS)),
  );

  return {
    startRow,
    endRow,
    startColumn,
    endColumn,
    rowBands,
    columnBands,
    totalChunks: rowBands * columnBands,
  };
}

/** Chunk index for a glyph, or null when it sits outside the art area. */
export function getBannerChunkIndex(
  layout: BannerArtLayout | null,
  row: number,
  column: number,
): number | null {
  if (
    !layout ||
    row < layout.startRow ||
    row > layout.endRow ||
    column < layout.startColumn ||
    column > layout.endColumn
  ) {
    return null;
  }

  const rowBand = Math.min(
    layout.rowBands - 1,
    Math.floor((row - layout.startRow) / CHUNK_ROWS_PER_BAND),
  );
  const chunkWidth = Math.max(
    1,
    Math.ceil(
      (layout.endColumn - layout.startColumn + 1) / layout.columnBands,
    ),
  );
  const columnBand = Math.min(
    layout.columnBands - 1,
    Math.floor((column - layout.startColumn) / chunkWidth),
  );

  return rowBand * layout.columnBands + columnBand;
}

/**
 * Choose the largest banner that fits.
 *
 * The full art is only used when the measured content box is at least 600px
 * wide *and* can actually hold 65 monospace columns. The second check matters
 * when someone zooms text or uses a wider fallback font: width alone is not a
 * promise that the ASCII box will not overflow.
 */
export function selectBannerVariant(
  availableWidth: number,
  monospaceCharWidth: number,
): BannerVariantId {
  const width = Number.isFinite(availableWidth)
    ? Math.max(0, availableWidth)
    : 0;
  const columns =
    Number.isFinite(monospaceCharWidth) && monospaceCharWidth > 0
      ? width / monospaceCharWidth
      : Number.POSITIVE_INFINITY;

  if (width >= FULL_MIN_AVAILABLE_WIDTH && columns + 1e-6 >= FULL_MIN_COLUMNS) {
    return "full";
  }
  return "compact";
}

const MEASURE_GLYPHS = 40;

/**
 * Measure the advance width of the banner's monospace font.
 *
 * A short-lived hidden span inherits the real computed font from the banner
 * frame (including the webfont once it loads), which is more reliable than
 * assuming a 0.6em advance. If layout is unavailable (SSR or jsdom), fall
 * back to the typical JetBrains Mono ratio.
 */
export function measureBannerCharWidth(host: HTMLElement): number {
  const doc = host.ownerDocument;
  const ruler = doc.createElement("span");
  ruler.className = "banner-measure";
  ruler.setAttribute("aria-hidden", "true");
  ruler.textContent = "0".repeat(MEASURE_GLYPHS);
  ruler.style.position = "absolute";
  ruler.style.visibility = "hidden";
  ruler.style.whiteSpace = "pre";
  ruler.style.pointerEvents = "none";
  ruler.style.font = "inherit";
  host.appendChild(ruler);

  const measured = ruler.getBoundingClientRect().width / MEASURE_GLYPHS;
  ruler.remove();

  if (Number.isFinite(measured) && measured > 0) return measured;

  const fontSize = Number.parseFloat(
    doc.defaultView?.getComputedStyle(host).fontSize ?? "",
  );
  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize * 0.6 : 0;
}
