import { describe, expect, it } from "vitest";
import {
  createWalkerWorld,
  getWalkerSprites,
  stepWalkerWorld,
  WALKER_FRAME_MS,
  WALKER_MAX_ACTORS,
  WALKER_SCENE_MAX_DELAY_MS,
  WALKER_SCENE_MIN_DELAY_MS,
  type WalkerSprite,
} from "./pixelWalkers";

const FRAME_MS = 16;

/** Small deterministic PRNG for seeds; the engine seeds its own PRNG from one. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function tick(
  world: ReturnType<typeof createWalkerWorld>,
  width: number,
  deltaMs = FRAME_MS,
) {
  return stepWalkerWorld(world, deltaMs, width);
}

function simulate(
  world: ReturnType<typeof createWalkerWorld>,
  width: number,
  totalMs: number,
  onFrame?: (
    world: ReturnType<typeof createWalkerWorld>,
    elapsedMs: number,
    previous: WalkerSprite[],
  ) => void,
  onFrameMs = FRAME_MS,
) {
  let current = world;
  let elapsed = 0;
  while (elapsed < totalMs) {
    const previous = getWalkerSprites(current);
    const delta = Math.min(onFrameMs, totalMs - elapsed);
    current = stepWalkerWorld(current, delta, width);
    elapsed += delta;
    onFrame?.(current, elapsed, previous);
  }
  return current;
}

function findTrainer(sprites: WalkerSprite[]) {
  return sprites.find(
    (sprite) =>
      sprite.kind !== "mario" && sprite.kind !== "goomba",
  );
}

function visible(sprite: WalkerSprite, width: number) {
  return sprite.x + 16 > 0 && sprite.x < width;
}

describe("pixelWalkers engine", () => {
  it("does not mutate the world passed to stepWalkerWorld", () => {
    const world = createWalkerWorld(480, seeded(1234));
    const snapshot = JSON.parse(JSON.stringify(world));
    const spritesSnapshot = getWalkerSprites(world);

    const next = stepWalkerWorld(world, 64, 480, seeded(99));

    expect(world).toEqual(snapshot);
    expect(getWalkerSprites(world)).toEqual(spritesSnapshot);
    expect(next).not.toBe(world);
    expect(next.actors).not.toBe(world.actors);
    expect(next.timeMs).toBe(64);

    // A zero-delta resize must be pure as well.
    const resized = stepWalkerWorld(world, 0, 300);
    expect(world.width).toBe(480);
    expect(world).toEqual(snapshot);
    expect(resized.width).toBe(300);
  });

  it("spawns one trainer from an offscreen edge that reaches view promptly", () => {
    const world = createWalkerWorld(420, seeded(7));
    const initial = getWalkerSprites(world);
    expect(initial).toHaveLength(1);

    const trainer = initial[0];
    expect(trainer.kind).not.toBe("mario");
    expect(trainer.kind).not.toBe("goomba");
    expect(trainer.y).toBe(0);
    expect(trainer.flipped).toBe(false);
    // Fully offscreen at the left (-16) or right (width) edge.
    expect(
      trainer.x === -16 || trainer.x === 420,
    ).toBe(true);

    let current = world;
    let elapsed = 0;
    while (!visible(getWalkerSprites(current)[0], 420) && elapsed < 2_000) {
      current = tick(current, 420);
      elapsed += FRAME_MS;
    }

    expect(visible(getWalkerSprites(current)[0], 420)).toBe(true);
    expect(elapsed).toBeLessThanOrEqual(1_000);
  });

  it("uses the 133ms trainer walk cadence and faces the walking direction", () => {
    let world = createWalkerWorld(420, seeded(19));
    const trainer = getWalkerSprites(world)[0];
    const direction = trainer.x < 0 ? "right" : "left";

    expect(trainer.frame).toBe(7);
    expect(trainer.facing).toBe(direction);

    const observed: Array<{ time: number; frame: number }> = [
      { time: 0, frame: trainer.frame },
    ];
    let lastFrame = trainer.frame;

    for (let elapsed = 1; elapsed <= 820; elapsed += 1) {
      world = stepWalkerWorld(world, 1, 420);
      const sprite = getWalkerSprites(world).find(
        (entry) => entry.id === trainer.id,
      );
      expect(sprite).toBeDefined();
      expect(sprite!.facing).toBe(direction);
      if (sprite!.frame !== lastFrame) {
        observed.push({ time: elapsed, frame: sprite!.frame });
        lastFrame = sprite!.frame;
      }
    }

    expect(observed.map((entry) => entry.frame).slice(0, 5)).toEqual([
      7, 2, 8, 2, 7,
    ]);
    for (let index = 1; index < 5; index += 1) {
      expect(observed[index].time - observed[index - 1].time).toBe(
        WALKER_FRAME_MS,
      );
    }
  });

  it("pauses for 1-3s facing up as if reading, then resumes walking", () => {
    let world = createWalkerWorld(420, seeded(31));
    const trainer = getWalkerSprites(world)[0];

    let pausedAt = -1;
    for (let elapsed = 0; elapsed < 12_000 && pausedAt < 0; elapsed += 1) {
      world = stepWalkerWorld(world, 1, 420);
      const sprite = getWalkerSprites(world).find(
        (entry) => entry.id === trainer.id,
      );
      expect(sprite).toBeDefined();
      if (sprite!.facing === "up") pausedAt = elapsed;
    }

    expect(pausedAt).toBeGreaterThanOrEqual(0);

    const paused = getWalkerSprites(world).find(
      (entry) => entry.id === trainer.id,
    )!;
    expect(paused.frame).toBe(1);
    const pausedX = paused.x;

    // Still paused halfway through the shortest possible pause.
    world = stepWalkerWorld(world, 500, 420);
    const stillPaused = getWalkerSprites(world).find(
      (entry) => entry.id === trainer.id,
    )!;
    expect(stillPaused.facing).toBe("up");
    expect(stillPaused.frame).toBe(1);
    expect(stillPaused.x).toBe(pausedX);

    let resumedAt = -1;
    for (let elapsed = 0; elapsed < 4_000 && resumedAt < 0; elapsed += 1) {
      world = stepWalkerWorld(world, 1, 420);
      const sprite = getWalkerSprites(world).find(
        (entry) => entry.id === trainer.id,
      );
      if (sprite && sprite.facing !== "up") resumedAt = elapsed;
    }
    expect(resumedAt).toBeGreaterThanOrEqual(0);
  });

  it("spawns trainers from both offscreen edges over time", () => {
    let world = createWalkerWorld(460, seeded(55));
    const seen = new Map<number, number>();

    for (const sprite of getWalkerSprites(world)) {
      seen.set(sprite.id, sprite.x < 0 ? -1 : 1);
    }

    world = simulate(world, 460, 20_000, (next) => {
      for (const sprite of getWalkerSprites(next)) {
        if (sprite.kind === "mario" || sprite.kind === "goomba") continue;
        if (!seen.has(sprite.id)) {
          seen.set(sprite.id, sprite.x < 0 ? -1 : 1);
        }
      }
    });

    expect([...seen.values()]).toContain(-1);
    expect([...seen.values()]).toContain(1);
  });

  it("keeps actors capped, finite and cleaned up over a long simulation", () => {
    const width = 380;
    let world = createWalkerWorld(width, seeded(2024));
    const sceneActorIds = new Set<number>();
    let maxActors = 0;
    let sawGoomba = false;

    for (let elapsed = 0; elapsed < 180_000; elapsed += FRAME_MS) {
      world = stepWalkerWorld(world, FRAME_MS, width);
      const sprites = getWalkerSprites(world);

      expect(sprites.length).toBeLessThanOrEqual(WALKER_MAX_ACTORS);
      maxActors = Math.max(maxActors, sprites.length);

      for (const sprite of sprites) {
        expect(Number.isFinite(sprite.x)).toBe(true);
        expect(Number.isFinite(sprite.y)).toBe(true);
        expect(sprite.frame).toBeGreaterThanOrEqual(0);
        expect(sprite.frame).toBeLessThanOrEqual(8);
        expect(Number.isInteger(sprite.frame)).toBe(true);

        if (sprite.kind === "goomba") {
          sawGoomba = true;
          sceneActorIds.add(sprite.id);
          if (sprite.flipped) expect(sprite.y).toBeLessThanOrEqual(16);
          if (sprite.y < 0) expect(sprite.flipped).toBe(true);
        }
        if (sprite.kind === "mario") {
          sceneActorIds.add(sprite.id);
          expect(sprite.y).toBeGreaterThanOrEqual(0);
        }
        if (findTrainer([sprite])) {
          expect(sprite.y).toBe(0);
          expect(sprite.flipped).toBe(false);
        }
      }
    }

    expect(maxActors).toBeLessThanOrEqual(WALKER_MAX_ACTORS);
    expect(maxActors).toBeGreaterThanOrEqual(2);
    expect(sawGoomba).toBe(true);

    // Every scene actor that appeared during the window has left the stage by
    // the end (the last possible scene starts by 120s and takes < 60s).
    const leftoverSceneActors = getWalkerSprites(world).filter((sprite) =>
      sceneActorIds.has(sprite.id),
    );
    expect(leftoverSceneActors).toHaveLength(0);
  });

  it("runs a real chase -> jump -> descending stomp -> flipped fall -> walk-on sequence", () => {
    const width = 480;
    let world = createWalkerWorld(width, seeded(2718));

    let goombaSeenAt: number | null = null;
    let marioSeenAt: number | null = null;
    let jumpSeenAt: number | null = null;
    let maxMarioY = 0;
    let stompAt: number | null = null;
    let stompMarioX = 0;
    let stompGoombaX = 0;
    let stompMarioY = 0;
    let stompPreviousMarioY = 0;
    let goombaNegativeYAt: number | null = null;
    let goombaRemovedAt: number | null = null;
    let marioAfterGoombaRemoval = false;
    let marioRemovedAt: number | null = null;

    for (let elapsed = 0; elapsed < 240_000; elapsed += FRAME_MS) {
      const previousSprites = getWalkerSprites(world);
      world = stepWalkerWorld(world, FRAME_MS, width);
      const sprites = getWalkerSprites(world);

      const goomba = sprites.find((sprite) => sprite.kind === "goomba");
      const mario = sprites.find((sprite) => sprite.kind === "mario");
      const previousGoomba = previousSprites.find(
        (sprite) => sprite.kind === "goomba",
      );
      const previousMario = previousSprites.find(
        (sprite) => sprite.kind === "mario",
      );

      if (goomba && goombaSeenAt === null) goombaSeenAt = elapsed;
      if (mario && marioSeenAt === null) marioSeenAt = elapsed;
      if (mario) {
        maxMarioY = Math.max(maxMarioY, mario.y);
        if (mario.y > 0 && jumpSeenAt === null) jumpSeenAt = elapsed;
      }

      if (
        stompAt === null &&
        previousGoomba &&
        goomba &&
        !previousGoomba.flipped &&
        goomba.flipped
      ) {
        expect(previousMario).toBeDefined();
        expect(mario).toBeDefined();
        stompAt = elapsed;
        stompMarioX = mario!.x;
        stompGoombaX = goomba.x;
        stompMarioY = mario!.y;
        stompPreviousMarioY = previousMario!.y;

        // This is a *descending* stomp, not a side collision.
        expect(stompMarioY).toBeLessThan(stompPreviousMarioY);
        expect(stompMarioY).toBeLessThanOrEqual(16);
        expect(
          Math.min(stompMarioX + 16, stompGoombaX + 16) -
            Math.max(stompMarioX, stompGoombaX),
        ).toBeGreaterThanOrEqual(2);
      }

      if (goomba?.flipped && goomba.y < 0 && goombaNegativeYAt === null) {
        goombaNegativeYAt = elapsed;
      }

      if (
        goombaSeenAt !== null &&
        !goomba &&
        goombaRemovedAt === null
      ) {
        goombaRemovedAt = elapsed;
        marioAfterGoombaRemoval = Boolean(mario);
      }

      if (marioSeenAt !== null && !mario && marioRemovedAt === null) {
        marioRemovedAt = elapsed;
        break;
      }
    }

    expect(goombaSeenAt).not.toBeNull();
    expect(marioSeenAt).not.toBeNull();
    expect(marioSeenAt!).toBeGreaterThan(goombaSeenAt!);
    expect(jumpSeenAt).not.toBeNull();
    // A real, visible jump rather than a rounding crumb.
    expect(maxMarioY).toBeGreaterThan(20);
    expect(stompAt).not.toBeNull();
    expect(goombaNegativeYAt).not.toBeNull();
    expect(goombaRemovedAt).not.toBeNull();
    expect(marioAfterGoombaRemoval).toBe(true);
    expect(marioRemovedAt).not.toBeNull();

    // The Goomba is upside down (renderer flips it) and falls below the floor.
    expect(goombaNegativeYAt!).toBeGreaterThan(stompAt!);
    // Mario walks on for a while after the Goomba is gone.
    expect(marioRemovedAt!).toBeGreaterThan(goombaRemovedAt!);
  });

  it("re-schedules the Mario scene after the previous scene cleans up", () => {
    const width = 300;
    let world = createWalkerWorld(width, seeded(314159));
    let firstGoombaSeen = false;
    let firstSceneFinishedAt: number | null = null;
    let secondGoombaAt: number | null = null;
    let hadMario = false;

    for (let elapsed = 0; elapsed < 300_000; elapsed += FRAME_MS) {
      world = stepWalkerWorld(world, FRAME_MS, width);
      const sprites = getWalkerSprites(world);
      const goomba = sprites.find((sprite) => sprite.kind === "goomba");
      const mario = sprites.find((sprite) => sprite.kind === "mario");

      if (goomba && !firstGoombaSeen) firstGoombaSeen = true;
      if (mario) hadMario = true;

      if (firstGoombaSeen && hadMario && !goomba && !mario) {
        if (firstSceneFinishedAt === null) {
          firstSceneFinishedAt = elapsed;
          hadMario = false;
        }
      }

      if (
        firstSceneFinishedAt !== null &&
        goomba &&
        secondGoombaAt === null
      ) {
        secondGoombaAt = elapsed;
        break;
      }
    }

    expect(firstGoombaSeen).toBe(true);
    expect(firstSceneFinishedAt).not.toBeNull();
    expect(secondGoombaAt).not.toBeNull();
    expect(secondGoombaAt!).toBeGreaterThan(firstSceneFinishedAt!);
    expect(secondGoombaAt! - firstSceneFinishedAt!).toBeLessThanOrEqual(
      WALKER_SCENE_MAX_DELAY_MS + 2_000,
    );
    expect(WALKER_SCENE_MIN_DELAY_MS).toBeGreaterThan(0);
    expect(WALKER_SCENE_MAX_DELAY_MS).toBeGreaterThan(
      WALKER_SCENE_MIN_DELAY_MS,
    );
  });

  it("resizes in place and drops actors that the new width pushed offscreen", () => {
    let world = createWalkerWorld(520, seeded(11));
    // Find a seed whose first trainer walks right, then move it far enough
    // across that a narrower strip puts it completely past the right edge.
    for (let seed = 1; seed <= 100; seed += 1) {
      const candidate = createWalkerWorld(520, seeded(seed));
      if (getWalkerSprites(candidate)[0].facing === "right") {
        world = candidate;
        break;
      }
    }

    const trainer = getWalkerSprites(world)[0];
    expect(trainer.facing).toBe("right");

    for (let elapsed = 0; elapsed < 20_000; elapsed += FRAME_MS) {
      world = tick(world, 520);
      const current = getWalkerSprites(world).find(
        (sprite) => sprite.id === trainer.id,
      );
      if (!current || current.x > 300) break;
    }

    const beforeResize = getWalkerSprites(world).find(
      (sprite) => sprite.id === trainer.id,
    );
    expect(beforeResize).toBeDefined();
    expect(beforeResize!.x).toBeGreaterThan(300);

    const removed = stepWalkerWorld(world, 0, 250);
    expect(removed.width).toBe(250);
    expect(
      getWalkerSprites(removed).some((sprite) => sprite.id === trainer.id),
    ).toBe(false);

    // Anything left is either visible or entering from an edge, never NaN.
    for (const sprite of getWalkerSprites(removed)) {
      expect(Number.isFinite(sprite.x)).toBe(true);
      expect(Number.isFinite(sprite.y)).toBe(true);
    }

    const widened = stepWalkerWorld(removed, 0, 900);
    expect(widened.width).toBe(900);
    expect(widened.actors.length).toBe(removed.actors.length);
  });
});
