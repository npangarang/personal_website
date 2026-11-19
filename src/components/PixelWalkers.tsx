import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createWalkerWorld,
  getWalkerSprites,
  stepWalkerWorld,
} from "@/lib/pixelWalkers";

// ── Terminal walkers ───────────────────────────────────────────
//
// A thin strip of pixel sprites walks along the bottom of the terminal, above
// the command chips and above the scanline overlay. All simulation lives in
// `src/lib/pixelWalkers.ts`; this component owns presentation only.
//
// Rendering choice: the world is stepped in a single requestAnimationFrame
// loop and sprites are updated imperatively through refs/DOM nodes. With only
// 1–3 sprites that is cheaper and far simpler than routing 60 updates/second
// through React state, and it keeps the pixel art crisp because each sprite is
// a DOM element with `image-rendering: pixelated` rather than a canvas that
// would need DPR-aware drawing and sprite-sheet decoding. React state is used
// only for the (rare) reduced-motion preference and never per frame.
//
// Pausing: the loop stops entirely while `document.hidden`, and resume resets
// the timestamp so walkers do not teleport forward by the length of the pause.
// Cleanup cancels the frame, disconnects the observer, removes listeners, and
// clears the reserved strip height, which also makes StrictMode's double
// mount safe.

const TRAINER_SHEET_WIDTH = 144;
const TRAINER_SHEET_HEIGHT = 32;
const TRAINER_FRAME_WIDTH = 16;
const TRAINER_FRAME_HEIGHT = 32;
const TRAINER_FRAMES = 9;

interface SpriteMeta {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  frames: number;
}

const TRAINER_META: Omit<SpriteMeta, "src"> = {
  sheetWidth: TRAINER_SHEET_WIDTH,
  sheetHeight: TRAINER_SHEET_HEIGHT,
  frameWidth: TRAINER_FRAME_WIDTH,
  frameHeight: TRAINER_FRAME_HEIGHT,
  frames: TRAINER_FRAMES,
};

const SPRITE_META: Record<string, SpriteMeta> = {
  brendan: { src: "/sprites/brendan.png", ...TRAINER_META },
  may: { src: "/sprites/may.png", ...TRAINER_META },
  hiker: { src: "/sprites/hiker.png", ...TRAINER_META },
  lass: { src: "/sprites/lass.png", ...TRAINER_META },
  picnicker: { src: "/sprites/picnicker.png", ...TRAINER_META },
  sailor: { src: "/sprites/sailor.png", ...TRAINER_META },
  mario: {
    src: "/sprites/mario.png",
    sheetWidth: 48,
    sheetHeight: 16,
    frameWidth: 16,
    frameHeight: 16,
    frames: 3,
  },
  goomba: {
    src: "/sprites/goomba.png",
    sheetWidth: 16,
    sheetHeight: 16,
    frameWidth: 16,
    frameHeight: 16,
    frames: 1,
  },
};

/** Strip width at which sprites double in size. */
export const WALKER_LARGE_SCALE_WIDTH = 700;
const WALKER_SCALE_SMALL = 1.5;
const WALKER_SCALE_LARGE = 2;
const WALKER_GROUND_OFFSET = 6;
const WALKER_HEADROOM = 6;
const MAX_FRAME_MS = 64;

type WalkerWorld = ReturnType<typeof createWalkerWorld>;
type WalkerSprite = ReturnType<typeof getWalkerSprites>[number];

interface WalkerNode {
  root: HTMLDivElement;
  sprite: HTMLDivElement;
  kind: string;
  scale: number;
  frame: number;
  mirrored: boolean;
  flipped: boolean;
  position: string;
}

function getWalkerScale(stripWidth: number): number {
  return stripWidth >= WALKER_LARGE_SCALE_WIDTH
    ? WALKER_SCALE_LARGE
    : WALKER_SCALE_SMALL;
}

function getWalkerStripHeight(scale: number): number {
  return Math.ceil(32 * scale + WALKER_GROUND_OFFSET + WALKER_HEADROOM);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMirrored(sprite: WalkerSprite): boolean {
  if (sprite.kind === "mario") return sprite.facing === "left";
  if (sprite.kind === "goomba") return false;
  // Trainer sheets are drawn facing left; up/down poses are not mirrored.
  return sprite.facing === "right";
}

function isUpsideDown(sprite: WalkerSprite): boolean {
  return sprite.kind === "goomba" && sprite.flipped;
}

const PixelWalkers: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  // React to a preference change without re-reading it on every frame.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);

    if (query.addEventListener) {
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    }
    if (query.addListener) {
      query.addListener(onChange);
      return () => query.removeListener(onChange);
    }
    return;
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const doc = root.ownerDocument;
    const win = doc.defaultView;
    if (!win) return;

    const windowEl = root.closest<HTMLElement>(".terminal-window");
    const nodes = new Map<number, WalkerNode>();
    let world: WalkerWorld | null = null;
    let displayWidth = 0;
    let scale = WALKER_SCALE_SMALL;
    let rafId: number | null = null;
    let lastTime = 0;
    let running = false;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const stopLoop = () => {
      running = false;
      if (rafId !== null) {
        win.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const createNode = (sprite: WalkerSprite, meta: SpriteMeta): WalkerNode => {
      const nodeRoot = doc.createElement("div");
      nodeRoot.className = "pixel-walker";
      const spriteEl = doc.createElement("div");
      spriteEl.className = "pixel-walker-sprite";
      spriteEl.style.backgroundImage = `url("${meta.src}")`;
      spriteEl.style.transform = "none";
      nodeRoot.appendChild(spriteEl);
      root.appendChild(nodeRoot);

      return {
        root: nodeRoot,
        sprite: spriteEl,
        kind: sprite.kind,
        scale: -1,
        frame: -1,
        mirrored: false,
        flipped: false,
        position: "",
      };
    };

    const sizeNode = (node: WalkerNode, meta: SpriteMeta, nextScale: number) => {
      node.sprite.style.width = `${meta.frameWidth * nextScale}px`;
      node.sprite.style.height = `${meta.frameHeight * nextScale}px`;
      node.sprite.style.backgroundSize = `${meta.sheetWidth * nextScale}px ${
        meta.sheetHeight * nextScale
      }px`;
      node.scale = nextScale;
      // Force the frame background position to be recalculated at the new size.
      node.frame = -1;
    };

    const syncSprites = (currentWorld: WalkerWorld) => {
      const sprites = getWalkerSprites(currentWorld);
      const seen = new Set<number>();

      for (const sprite of sprites) {
        const meta = SPRITE_META[sprite.kind];
        if (!meta) continue;
        seen.add(sprite.id);

        let node = nodes.get(sprite.id);
        if (!node || node.kind !== sprite.kind) {
          node?.root.remove();
          node = createNode(sprite, meta);
          nodes.set(sprite.id, node);
        }

        if (node.scale !== scale) sizeNode(node, meta, scale);

        const frame = Math.max(
          0,
          Math.min(meta.frames - 1, Math.floor(sprite.frame)),
        );
        if (node.frame !== frame) {
          node.sprite.style.backgroundPosition = `${
            -frame * meta.frameWidth * scale
          }px 0px`;
          node.frame = frame;
        }

        const mirrored = isMirrored(sprite);
        const flipped = isUpsideDown(sprite);
        if (node.mirrored !== mirrored || node.flipped !== flipped) {
          const transforms = [
            mirrored ? "scaleX(-1)" : "",
            flipped ? "scaleY(-1)" : "",
          ].filter(Boolean);
          node.sprite.style.transform = transforms.join(" ") || "none";
          node.mirrored = mirrored;
          node.flipped = flipped;
        }

        const x = Math.round(sprite.x * scale);
        const y = -Math.round(sprite.y * scale);
        const position = `${x},${y}`;
        if (node.position !== position) {
          node.root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          node.position = position;
        }
      }

      for (const [id, node] of nodes) {
        if (!seen.has(id)) {
          node.root.remove();
          nodes.delete(id);
        }
      }
    };

    const loop = (now: number) => {
      rafId = null;
      if (disposed || !running || !world) return;

      // Clamp after a long stall (GC, breakpoint) so the world cannot make a
      // huge leap even if the page was only briefly hidden.
      const delta = Math.min(MAX_FRAME_MS, Math.max(0, now - lastTime));
      lastTime = now;
      world = stepWalkerWorld(world, delta, displayWidth / scale);
      syncSprites(world);
      rafId = win.requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (disposed || running || !world || doc.hidden) return;
      running = true;
      lastTime = win.performance.now();
      rafId = win.requestAnimationFrame(loop);
    };

    const setGeometry = (width: number) => {
      if (disposed) return;
      if (!Number.isFinite(width) || width <= 0) return;

      const nextScale = getWalkerScale(width);
      const widthChanged = Math.abs(width - displayWidth) >= 0.5;
      const scaleChanged = nextScale !== scale;

      displayWidth = width;
      scale = nextScale;
      root.dataset.scale = String(scale);
      windowEl?.style.setProperty(
        "--walker-strip-height",
        `${getWalkerStripHeight(scale)}px`,
      );

      if (!world) {
        world = createWalkerWorld(width / scale);
      } else if (widthChanged || scaleChanged) {
        // A zero-delta step rescales the walkable world without advancing time.
        world = stepWalkerWorld(world, 0, width / scale);
      }

      syncSprites(world);
      startLoop();
    };

    const measure = () => {
      setGeometry(root.getBoundingClientRect().width);
    };

    const onVisibilityChange = () => {
      if (disposed) return;
      if (doc.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    };

    // Measure in a layout effect so the reserved clearance is in place before
    // the first paint (no content jump when the sprites appear).
    measure();

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        const width =
          entries[0]?.contentRect.width ??
          root.getBoundingClientRect().width;
        setGeometry(width);
      });
      resizeObserver.observe(root);
    } else {
      win.addEventListener("resize", measure);
    }
    doc.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      stopLoop();
      resizeObserver?.disconnect();
      win.removeEventListener("resize", measure);
      doc.removeEventListener("visibilitychange", onVisibilityChange);
      nodes.clear();
      root.replaceChildren();
      root.removeAttribute("data-scale");
      windowEl?.style.removeProperty("--walker-strip-height");
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return <div ref={rootRef} className="pixel-walkers" aria-hidden="true" />;
};

export default PixelWalkers;
