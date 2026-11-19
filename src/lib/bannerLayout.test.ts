import { describe, expect, it } from "vitest";
import { ASCII_BANNER, ASCII_BANNER_COMPACT } from "@/data/resumeData";
import {
  FULL_MIN_AVAILABLE_WIDTH,
  FULL_MIN_COLUMNS,
  findBannerArtLayout,
  getBannerChunkIndex,
  getBannerColumnCount,
  getBannerLines,
  measureBannerCharWidth,
  selectBannerVariant,
  stripBannerMarkup,
} from "./bannerLayout";

describe("compact ASCII banner", () => {
  const lines = stripBannerMarkup(ASCII_BANNER_COMPACT).split("\n");

  it("uses an equal-width 30-column grid on every line", () => {
    expect(lines).toHaveLength(11);
    const widths = lines.map((line) => [...line].length);
    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBeGreaterThanOrEqual(30);
    expect(widths[0]).toBeLessThanOrEqual(36);
  });

  it("keeps the box edges and the compact tagline aligned", () => {
    expect(lines[0].startsWith("╔")).toBe(true);
    expect(lines[0].endsWith("╗")).toBe(true);
    expect(lines[lines.length - 1].startsWith("╚")).toBe(true);
    expect(lines[lines.length - 1].endsWith("╝")).toBe(true);
    expect(lines.some((line) => line.includes("ML Engineer · Builder"))).toBe(
      true,
    );

    for (const line of lines) {
      expect(line.startsWith("║") || line.startsWith("╔") || line.startsWith("╚")).toBe(true);
      expect(line.endsWith("║") || line.endsWith("╗") || line.endsWith("╝")).toBe(true);
    }
  });

  it("is written with the terminal's cyan markup only", () => {
    expect(ASCII_BANNER_COMPACT.startsWith("\x1b[cyan]")).toBe(true);
    expect(ASCII_BANNER_COMPACT.endsWith("\x1b[/cyan]")).toBe(true);
    expect(stripBannerMarkup(ASCII_BANNER_COMPACT)).not.toContain("\x1b");
    expect(stripBannerMarkup(ASCII_BANNER_COMPACT)).not.toContain("[cyan]");
  });
});

describe("banner metrics", () => {
  it("leaves the full 65-column art unchanged", () => {
    expect(getBannerColumnCount(ASCII_BANNER)).toBe(FULL_MIN_COLUMNS);
    expect(stripBannerMarkup(ASCII_BANNER)).toContain(
      "ML Engineer · Data Scientist · Builder",
    );
  });

  it("derives the full art region from block glyphs, including letter bottoms", () => {
    const layout = findBannerArtLayout(ASCII_BANNER);
    expect(layout).not.toBeNull();
    expect(layout?.startRow).toBe(3);
    expect(layout?.endRow).toBe(8);
    expect(layout?.startColumn).toBe(4);
    expect(layout?.endColumn).toBeGreaterThan(30);
    expect(layout?.totalChunks).toBeGreaterThanOrEqual(4);
  });

  it("derives a separate chunk grid for the compact art", () => {
    const layout = findBannerArtLayout(ASCII_BANNER_COMPACT);
    expect(layout).not.toBeNull();
    expect(layout?.startRow).toBe(2);
    expect(layout?.endRow).toBe(6);
    expect(layout?.totalChunks).toBeGreaterThanOrEqual(2);

    const first = getBannerChunkIndex(
      layout,
      layout!.startRow,
      layout!.startColumn,
    );
    const last = getBannerChunkIndex(
      layout,
      layout!.endRow,
      layout!.endColumn,
    );
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();
    expect(first).not.toBe(last);
    expect(getBannerChunkIndex(layout, 0, 0)).toBeNull();
  });
});

describe("banner variant selection", () => {
  it("picks the full banner at common wide layouts", () => {
    // Content width after page padding, terminal border and body padding.
    expect(selectBannerVariant(696, 8.4)).toBe("full"); // 768px viewport
    expect(selectBannerVariant(860, 8.4)).toBe("full"); // 1440px viewport
  });

  it("picks the compact banner at 320 / 375 / 390 / 414 layouts", () => {
    for (const width of [264, 325, 340, 364]) {
      expect(selectBannerVariant(width, 8.4)).toBe("compact");
    }
  });

  it("requires both 600px and room for 65 monospace columns", () => {
    expect(selectBannerVariant(FULL_MIN_AVAILABLE_WIDTH, 8.4)).toBe("full");
    expect(selectBannerVariant(FULL_MIN_AVAILABLE_WIDTH - 0.1, 8.4)).toBe(
      "compact",
    );

    const wideChar = FULL_MIN_AVAILABLE_WIDTH / FULL_MIN_COLUMNS + 0.1;
    expect(selectBannerVariant(FULL_MIN_AVAILABLE_WIDTH, wideChar)).toBe(
      "compact",
    );
    expect(
      selectBannerVariant(FULL_MIN_AVAILABLE_WIDTH, FULL_MIN_AVAILABLE_WIDTH / FULL_MIN_COLUMNS),
    ).toBe("full");
  });

  it("falls back to compact when layout has no measurable width", () => {
    expect(selectBannerVariant(0, 0)).toBe("compact");
    expect(selectBannerVariant(Number.NaN, Number.NaN)).toBe("compact");
  });
});

describe("measureBannerCharWidth", () => {
  it("uses a hidden ruler and falls back to the 0.6em monospace ratio", () => {
    const host = document.createElement("div");
    host.style.fontSize = "14px";
    document.body.appendChild(host);

    const width = measureBannerCharWidth(host);
    expect(width).toBeCloseTo(8.4, 5);
    expect(host.querySelector(".banner-measure")).toBeNull();

    host.remove();
  });
});

describe("banner source lines", () => {
  it("does not include ANSI tokens in visible line measurements", () => {
    expect(getBannerLines(ASCII_BANNER)[1]).toContain("╔");
    expect(getBannerLines(ASCII_BANNER)[1]).not.toContain("\x1b");
    expect(getBannerLines(ASCII_BANNER)).toHaveLength(14);
  });
});
