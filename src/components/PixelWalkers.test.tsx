import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PixelWalkers from "./PixelWalkers";

// Deterministic, component-style world. The real walker simulation has its own
// tests; here we only care that the presentation layer renders, scales, pauses
// and cleans up according to the engine contract.
const engine = vi.hoisted(() => ({
  sprites: [] as Array<{
    id: number;
    kind: string;
    x: number;
    y: number;
    frame: number;
    facing: "left" | "right" | "up" | "down";
    flipped: boolean;
  }>,
}));

vi.mock("@/lib/pixelWalkers", () => ({
  createWalkerWorld: vi.fn((width: number) => ({ width, time: 0 })),
  stepWalkerWorld: vi.fn(
    (
      world: { width: number; time: number },
      deltaMs: number,
      width: number,
    ) => ({ ...world, width, time: world.time + deltaMs }),
  ),
  getWalkerSprites: vi.fn(() => engine.sprites),
}));

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

  trigger(width: number) {
    this.callback(
      [{ contentRect: { width } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
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

let stripWidth = 720;
let rafCallbacks = new Map<number, FrameRequestCallback>();
let nextRafId = 1;
let docHidden = false;

const rAF = vi.fn((callback: FrameRequestCallback) => {
  const id = nextRafId++;
  rafCallbacks.set(id, callback);
  return id;
});

const cancelRAF = vi.fn((id: number) => {
  rafCallbacks.delete(id);
});

const runNextFrame = (now: number) => {
  const next = rafCallbacks.entries().next();
  if (next.done) return;
  const [id, callback] = next.value;
  rafCallbacks.delete(id);
  callback(now);
};

const renderInTerminal = (strict = false) => {
  const tree = (
    <div className="terminal-window">
      <PixelWalkers />
    </div>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

describe("PixelWalkers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripWidth = 720;
    rafCallbacks = new Map();
    nextRafId = 1;
    docHidden = false;
    engine.sprites = [
      {
        id: 1,
        kind: "brendan",
        x: 10,
        y: 10,
        frame: 2,
        facing: "right",
        flipped: false,
      },
    ];
    FakeResizeObserver.instances = [];

    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    vi.stubGlobal("requestAnimationFrame", rAF);
    vi.stubGlobal("cancelAnimationFrame", cancelRAF);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return rect(this.classList.contains("pixel-walkers") ? stripWidth : 0);
      },
    );
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => docHidden,
    });
  });

  afterEach(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the sprite sheet at 2x when the strip is at least 700px", () => {
    const { container } = renderInTerminal();
    const root = container.querySelector<HTMLElement>(".pixel-walkers");
    const terminal = container.querySelector<HTMLElement>(".terminal-window");
    const sprite =
      container.querySelector<HTMLElement>(".pixel-walker-sprite");

    expect(root?.dataset.scale).toBe("2");
    expect(terminal?.style.getPropertyValue("--walker-strip-height")).toBe(
      "76px",
    );
    expect(sprite?.style.width).toBe("32px");
    expect(sprite?.style.height).toBe("64px");
    expect(sprite?.style.backgroundImage).toContain("/sprites/brendan.png");
    expect(sprite?.style.backgroundSize).toBe("288px 64px");
    expect(sprite?.style.backgroundPosition).toBe("-64px 0px");
    expect(sprite?.style.transform).toBe("scaleX(-1)");
    expect(sprite?.parentElement?.style.transform).toBe(
      "translate3d(20px, -20px, 0)",
    );
  });

  it("drops to 1.5x below 700px and back up at the boundary", () => {
    stripWidth = 699;
    const { container } = renderInTerminal();

    const root = container.querySelector<HTMLElement>(".pixel-walkers");
    const terminal = container.querySelector<HTMLElement>(".terminal-window");
    let sprite =
      container.querySelector<HTMLElement>(".pixel-walker-sprite");

    expect(root?.dataset.scale).toBe("1.5");
    expect(terminal?.style.getPropertyValue("--walker-strip-height")).toBe(
      "60px",
    );
    expect(sprite?.style.width).toBe("24px");
    expect(sprite?.style.height).toBe("48px");

    act(() => FakeResizeObserver.instances[0]?.trigger(700));
    sprite = container.querySelector<HTMLElement>(".pixel-walker-sprite");
    expect(root?.dataset.scale).toBe("2");
    expect(terminal?.style.getPropertyValue("--walker-strip-height")).toBe(
      "76px",
    );
    expect(sprite?.style.width).toBe("32px");
    expect(sprite?.style.height).toBe("64px");
  });

  it("applies the trainer, Mario and Goomba facing rules", () => {
    engine.sprites = [
      {
        id: 1,
        kind: "may",
        x: 0,
        y: 0,
        frame: 1,
        facing: "up",
        flipped: false,
      },
      {
        id: 2,
        kind: "mario",
        x: 40,
        y: 0,
        frame: 1,
        facing: "left",
        flipped: false,
      },
      {
        id: 3,
        kind: "goomba",
        x: 80,
        y: 0,
        frame: 0,
        facing: "left",
        flipped: true,
      },
    ];

    const { container } = renderInTerminal();
    const sprites = [
      ...container.querySelectorAll<HTMLElement>(".pixel-walker-sprite"),
    ];
    const transforms = sprites.map((sprite) => sprite.style.transform);

    // Up/down trainer poses keep the sheet's native left-facing art.
    expect(transforms).toContain("none");
    // Mario art faces right by default, so a left-facing Mario is mirrored.
    expect(transforms).toContain("scaleX(-1)");
    // A flipped Goomba is rendered upside down.
    expect(transforms).toContain("scaleY(-1)");
  });

  it("renders nothing when reduced motion is requested", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("prefers-reduced-motion"),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );

    const { container } = renderInTerminal();

    expect(container.querySelector(".pixel-walkers")).toBeNull();
    expect(rAF).not.toHaveBeenCalled();
  });

  it("pauses while the document is hidden and resumes without a time jump", async () => {
    const { stepWalkerWorld } = await import("@/lib/pixelWalkers");
    vi.spyOn(performance, "now").mockReturnValue(0);

    renderInTerminal();
    act(() => runNextFrame(100));

    docHidden = true;
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(rafCallbacks.size).toBe(0);

    vi.mocked(performance.now).mockReturnValue(5000);
    docHidden = false;
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(rafCallbacks.size).toBe(1);

    act(() => runNextFrame(5016));
    const lastCall = vi.mocked(stepWalkerWorld).mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(16);
  });

  it("leaves a single sprite set after StrictMode remount and cleans up", () => {
    const { container, unmount } = renderInTerminal(true);
    const terminal = container.querySelector<HTMLElement>(".terminal-window");

    expect(container.querySelectorAll(".pixel-walkers")).toHaveLength(1);
    expect(container.querySelectorAll(".pixel-walker")).toHaveLength(1);

    unmount();
    expect(container.querySelectorAll(".pixel-walkers")).toHaveLength(0);
    expect(rafCallbacks.size).toBe(0);
    expect(
      terminal?.style.getPropertyValue("--walker-strip-height"),
    ).toBe("");
  });
});
