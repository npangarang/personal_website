import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WalkerKind, WalkerSprite } from "@/lib/pixelWalkers";
import PixelWalkers from "./PixelWalkers";

// Deterministic, component-style world. The real walker simulation has its own
// tests; here we only care that the presentation layer renders, scales, aligns,
// pauses and cleans up according to the engine contract.
const engine = vi.hoisted(() => ({
  sprites: [] as WalkerSprite[],
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

/** Build a sprite with presentation defaults; the engine only owns the fields. */
const makeSprite = (
  id: number,
  kind: WalkerKind,
  overrides: Partial<Omit<WalkerSprite, "id" | "kind">> = {},
): WalkerSprite => ({
  id,
  kind,
  x: 0,
  y: 0,
  frame: 0,
  facing: "right",
  ...overrides,
});

const getNodes = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>(".pixel-walker"),
];

const getSpriteEls = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>(".pixel-walker-sprite"),
];

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
      makeSprite(1, "red", { x: 10, frame: 7, facing: "right" }),
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

  it("renders all six FireRed trainers from their matching 144x32 sheets", () => {
    const kinds = [
      "red",
      "blue",
      "prof_oak",
      "giovanni",
      "lorelei",
      "rocket_m",
    ] as const;

    engine.sprites = kinds.map((kind, index) =>
      makeSprite(index + 1, kind, {
        x: 5 + index * 20,
        frame: 7,
        facing: "right",
      }),
    );

    const { container } = renderInTerminal();
    const root = container.querySelector<HTMLElement>(".pixel-walkers");
    const sprites = getSpriteEls(container);

    expect(root?.dataset.scale).toBe("2");
    expect(getNodes(container)).toHaveLength(kinds.length);

    kinds.forEach((kind, index) => {
      expect(sprites[index].style.backgroundImage).toContain(
        `/sprites/${kind}.png`,
      );
      expect(sprites[index].style.backgroundSize).toBe("288px 64px");
      expect(sprites[index].style.backgroundPosition).toBe("-224px 0px");
      expect(sprites[index].style.width).toBe("32px");
      expect(sprites[index].style.height).toBe("64px");
    });
  });

  it("drops to 1.5x below 700px and back up at the boundary", () => {
    stripWidth = 699;
    engine.sprites = [
      makeSprite(1, "red", { x: 10, frame: 2, facing: "right" }),
    ];
    const { container } = renderInTerminal();

    const root = container.querySelector<HTMLElement>(".pixel-walkers");
    const terminal = container.querySelector<HTMLElement>(".terminal-window");
    let sprite = getSpriteEls(container)[0];
    let node = getNodes(container)[0];

    expect(root?.dataset.scale).toBe("1.5");
    expect(terminal?.style.getPropertyValue("--walker-strip-height")).toBe(
      "60px",
    );
    expect(sprite.style.width).toBe("24px");
    expect(sprite.style.height).toBe("48px");
    expect(sprite.style.backgroundSize).toBe("216px 48px");
    expect(sprite.style.backgroundPosition).toBe("-48px 0px");
    expect(sprite.style.transform).toBe("scaleX(-1)");
    expect(node.style.transform).toBe("translate3d(15px, 0px, 0)");

    act(() => FakeResizeObserver.instances[0]?.trigger(700));
    sprite = getSpriteEls(container)[0];
    node = getNodes(container)[0];

    expect(root?.dataset.scale).toBe("2");
    expect(terminal?.style.getPropertyValue("--walker-strip-height")).toBe(
      "76px",
    );
    expect(sprite.style.width).toBe("32px");
    expect(sprite.style.height).toBe("64px");
    expect(sprite.style.backgroundSize).toBe("288px 64px");
    expect(sprite.style.backgroundPosition).toBe("-64px 0px");
    expect(node.style.transform).toBe("translate3d(20px, 0px, 0)");
  });

  it("keeps 32px-high Mario and the 16px-high Goomba on the same floor at both scales", () => {
    stripWidth = 600;
    engine.sprites = [
      makeSprite(1, "mario", { x: 40, frame: 1, facing: "right" }),
      makeSprite(2, "goomba", { x: 80, frame: 1, facing: "left" }),
    ];

    const { container } = renderInTerminal();
    const root = container.querySelector<HTMLElement>(".pixel-walkers");
    let sprites = getSpriteEls(container);
    let nodes = getNodes(container);

    expect(root?.dataset.scale).toBe("1.5");
    // 64x32 sheet, one 16x32 frame: at 1.5x the art is 24x48.
    expect(sprites[0].style.width).toBe("24px");
    expect(sprites[0].style.height).toBe("48px");
    expect(sprites[0].style.backgroundSize).toBe("96px 48px");
    expect(sprites[0].style.backgroundPosition).toBe("-24px 0px");
    // 48x16 sheet, one 16x16 frame: at 1.5x the art is 24x24.
    expect(sprites[1].style.width).toBe("24px");
    expect(sprites[1].style.height).toBe("24px");
    expect(sprites[1].style.backgroundSize).toBe("72px 24px");
    expect(sprites[1].style.backgroundPosition).toBe("-24px 0px");
    // Both roots sit on y = 0; the shared CSS floor is what bottom-aligns the
    // taller Mario and the shorter Goomba.
    expect(nodes[0].style.transform).toBe("translate3d(60px, 0px, 0)");
    expect(nodes[1].style.transform).toBe("translate3d(120px, 0px, 0)");

    act(() => FakeResizeObserver.instances[0]?.trigger(700));
    sprites = getSpriteEls(container);
    nodes = getNodes(container);

    expect(root?.dataset.scale).toBe("2");
    expect(sprites[0].style.width).toBe("32px");
    expect(sprites[0].style.height).toBe("64px");
    expect(sprites[0].style.backgroundSize).toBe("128px 64px");
    expect(sprites[0].style.backgroundPosition).toBe("-32px 0px");
    expect(sprites[1].style.width).toBe("32px");
    expect(sprites[1].style.height).toBe("32px");
    expect(sprites[1].style.backgroundSize).toBe("96px 32px");
    expect(sprites[1].style.backgroundPosition).toBe("-32px 0px");
    expect(nodes[0].style.transform).toBe("translate3d(80px, 0px, 0)");
    expect(nodes[1].style.transform).toBe("translate3d(160px, 0px, 0)");
  });

  it("renders Mario's jump frame and the Goomba's squash frame unclamped and unflipped", () => {
    engine.sprites = [
      makeSprite(1, "mario", { x: 40, y: 16, frame: 3, facing: "left" }),
      makeSprite(2, "goomba", { x: 80, y: 0, frame: 2, facing: "left" }),
    ];

    const { container } = renderInTerminal();
    const sprites = getSpriteEls(container);
    const nodes = getNodes(container);

    // Mario frame 3 is the airborne pose; it must not clamp to the last walk
    // frame (frame 2 would be -64px on this sheet).
    expect(sprites[0].style.backgroundImage).toContain("/sprites/mario.png");
    expect(sprites[0].style.backgroundSize).toBe("128px 64px");
    expect(sprites[0].style.backgroundPosition).toBe("-96px 0px");
    expect(sprites[0].style.transform).toBe("scaleX(-1)");
    // The Goomba's third frame is the flattened pose, drawn flat on the floor.
    expect(sprites[1].style.backgroundImage).toContain("/sprites/goomba.png");
    expect(sprites[1].style.backgroundSize).toBe("96px 32px");
    expect(sprites[1].style.backgroundPosition).toBe("-64px 0px");
    expect(sprites[1].style.transform).toBe("none");

    for (const sprite of sprites) {
      expect(sprite.style.transform).not.toContain("scaleY");
    }

    // The jump lifts Mario relative to the shared floor; the squashed Goomba
    // stays on it.
    expect(nodes[0].style.transform).toBe("translate3d(80px, -32px, 0)");
    expect(nodes[1].style.transform).toBe("translate3d(160px, 0px, 0)");
  });

  it("never mirrors either Goomba walk frame, whichever way it faces", () => {
    engine.sprites = [
      makeSprite(1, "goomba", { x: 0, frame: 0, facing: "left" }),
      makeSprite(2, "goomba", { x: 40, frame: 0, facing: "right" }),
      makeSprite(3, "goomba", { x: 80, frame: 1, facing: "left" }),
      makeSprite(4, "goomba", { x: 120, frame: 1, facing: "right" }),
    ];

    const { container } = renderInTerminal();
    const sprites = getSpriteEls(container);

    expect(sprites).toHaveLength(4);
    expect(sprites.map((sprite) => sprite.style.backgroundPosition)).toEqual([
      "0px 0px",
      "0px 0px",
      "-32px 0px",
      "-32px 0px",
    ]);
    for (const sprite of sprites) {
      expect(sprite.style.transform).toBe("none");
    }
  });

  it("mirrors trainers and Mario by direction only", () => {
    engine.sprites = [
      makeSprite(1, "lorelei", { frame: 1, facing: "up" }),
      makeSprite(2, "red", { frame: 7, facing: "right" }),
      makeSprite(3, "prof_oak", { frame: 7, facing: "left" }),
      makeSprite(4, "mario", { frame: 2, facing: "right" }),
      makeSprite(5, "mario", { frame: 0, facing: "left" }),
      makeSprite(6, "goomba", { frame: 0, facing: "left" }),
    ];

    const { container } = renderInTerminal();
    const transforms = getSpriteEls(container).map(
      (sprite) => sprite.style.transform,
    );

    // Up poses keep the sheet's native left-facing art.
    expect(transforms[0]).toBe("none");
    // Trainer sheets are drawn facing left, so right-facing trainers mirror.
    expect(transforms[1]).toBe("scaleX(-1)");
    expect(transforms[2]).toBe("none");
    // Mario art faces right by default.
    expect(transforms[3]).toBe("none");
    expect(transforms[4]).toBe("scaleX(-1)");
    // The Goomba has native art for both directions; it is never mirrored.
    expect(transforms[5]).toBe("none");
  });

  it("removes a node when the engine despawns its sprite", () => {
    engine.sprites = [
      makeSprite(1, "goomba", { x: 20, frame: 0 }),
      makeSprite(2, "mario", { x: 80, frame: 1 }),
    ];

    const { container } = renderInTerminal();
    expect(getNodes(container)).toHaveLength(2);

    // Mario exits first; the Goomba keeps walking in the same frame.
    engine.sprites = [engine.sprites[0]];
    act(() => runNextFrame(16));

    expect(getNodes(container)).toHaveLength(1);
    expect(getSpriteEls(container)[0].style.backgroundImage).toContain(
      "/sprites/goomba.png",
    );

    // The last actor despawns and its node is removed from the DOM.
    engine.sprites = [];
    act(() => runNextFrame(32));

    expect(getNodes(container)).toHaveLength(0);
    expect(getSpriteEls(container)).toHaveLength(0);
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
