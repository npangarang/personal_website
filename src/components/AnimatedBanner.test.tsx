import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnimatedBanner from "./AnimatedBanner";

// The typewriter is timing-based; a controllable stand-in lets these tests
// assert the banner's completion contract without waiting for real timers.
const typewriterControl = vi.hoisted(() => ({
  complete: null as null | (() => void),
}));

vi.mock("./TypewriterText", async () => {
  const React = await import("react");
  type MockProps = {
    content: import("react").ReactNode;
    onComplete?: () => void;
  };

  const MockTypewriterText = (props: MockProps) => {
    typewriterControl.complete = () => props.onComplete?.();
    return React.createElement(
      "span",
      { "data-testid": "typewriter" },
      props.content,
    );
  };

  return { default: MockTypewriterText };
});

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const rect = (width: number): DOMRect =>
  ({
    width,
    height: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

let frameWidth = 320;
let charWidth = 8.4;

const frame = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".banner-frame");

const artText = (container: HTMLElement) =>
  container.querySelector(".banner-art")?.textContent ?? "";

describe("AnimatedBanner variant selection", () => {
  beforeEach(() => {
    frameWidth = 320;
    charWidth = 8.4;
    typewriterControl.complete = null;
    FakeResizeObserver.instances = [];

    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains("banner-measure")) {
          return rect(charWidth * 40);
        }
        if (this.classList.contains("banner-frame")) {
          return rect(frameWidth);
        }
        return rect(0);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts compact on a phone-width content box", () => {
    const onComplete = vi.fn();
    const { container } = render(<AnimatedBanner onComplete={onComplete} />);

    expect(frame(container)?.dataset.bannerVariant).toBe("compact");
    expect(artText(container)).toContain("ML Engineer · Builder");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("unlocks the header exactly once across wide/narrow resizes", () => {
    const onComplete = vi.fn();
    const { container } = render(<AnimatedBanner onComplete={onComplete} />);

    act(() => {
      typewriterControl.complete?.();
      typewriterControl.complete?.();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Rotate/expand: full art replaces the compact art, but the header was
    // already unlocked and must not fire a second completion.
    frameWidth = 800;
    act(() => FakeResizeObserver.instances[0]?.trigger());
    expect(frame(container)?.dataset.bannerVariant).toBe("full");
    expect(artText(container)).toContain("Data Scientist");
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Shrink back down; still exactly one completion.
    frameWidth = 375;
    act(() => FakeResizeObserver.instances[0]?.trigger());
    expect(frame(container)?.dataset.bannerVariant).toBe("compact");
    expect(artText(container)).toContain("ML Engineer · Builder");

    act(() => typewriterControl.complete?.());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("still completes once when the variant changes mid-animation", () => {
    const onComplete = vi.fn();
    const { container } = render(<AnimatedBanner onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();

    frameWidth = 860;
    act(() => FakeResizeObserver.instances[0]?.trigger());
    expect(frame(container)?.dataset.bannerVariant).toBe("full");
    expect(onComplete).not.toHaveBeenCalled();

    act(() => typewriterControl.complete?.());
    expect(onComplete).toHaveBeenCalledTimes(1);

    frameWidth = 390;
    act(() => FakeResizeObserver.instances[0]?.trigger());
    expect(frame(container)?.dataset.bannerVariant).toBe("compact");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("uses the full banner when the measured box is wide enough", () => {
    frameWidth = 860;
    const onComplete = vi.fn();
    const { container } = render(<AnimatedBanner onComplete={onComplete} />);

    expect(frame(container)?.dataset.bannerVariant).toBe("full");
    expect(artText(container)).toContain("Data Scientist");
  });
});
