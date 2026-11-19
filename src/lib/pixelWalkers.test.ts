import { describe, expect, it } from "vitest";
import {
  createWalkerWorld,
  getWalkerSprites,
  stepWalkerWorld,
  WALKER_FRAME_MS,
  WALKER_GOOMBA_SQUASH_LINGER_MS,
  WALKER_MAX_ACTORS,
  WALKER_SCENE_MAX_DELAY_MS,
  WALKER_SCENE_MIN_DELAY_MS,
  type WalkerSprite,
} from "./pixelWalkers";

const FRAME_MS = 16;
const TRAINER_KINDS = [
  "red",
  "blue",
  "prof_oak",
  "giovanni",
  "lorelei",
  "rocket_m",
] as const;

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

function isTrainer(sprite: WalkerSprite) {
  return sprite.kind !== "mario" && sprite.kind !== "goomba";
}

function findTrainer(sprites: WalkerSprite[]) {
  return sprites.find(isTrainer);
}

function visible(sprite: WalkerSprite, width: number) {
  return sprite.x + 16 > 0 && sprite.x < width;
}

/**
 * Step a deterministic world until the Goomba has just been stomped (its
 * squashed frame appears for the first time) and return that world plus the
 * frozen sprite for boundary tests.
 */
function runToStomp(width: number, seed: number) {
  let world = createWalkerWorld(width, seeded(seed));

  for (let elapsed = 0; elapsed < 240_000; elapsed += FRAME_MS) {
    const previousGoomba = getWalkerSprites(world).find(
      (sprite) => sprite.kind === "goomba",
    );
    world = stepWalkerWorld(world, FRAME_MS, width);
    const goomba = getWalkerSprites(world).find(
      (sprite) => sprite.kind === "goomba",
    );

    if (previousGoomba && goomba && goomba.frame === 2) {
      return { world, goomba };
    }
  }

  throw new Error("Goomba never got stomped");
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

  it("exposes only the renderer contract fields on each sprite", () => {
    const world = createWalkerWorld(420, seeded(7));

    for (const sprite of getWalkerSprites(world)) {
      expect(Object.keys(sprite).sort()).toEqual([
        "facing",
        "frame",
        "id",
        "kind",
        "x",
        "y",
      ]);
      expect(sprite).not.toHaveProperty("flipped");
    }
  });

  it("uses exactly the six FireRed trainer kinds", () => {
    const seen = new Set<string>();

    for (let seed = 1; seed <= 2_000 && seen.size < TRAINER_KINDS.length; seed += 1) {
      const world = createWalkerWorld(320, seeded(seed));
      const trainer = findTrainer(getWalkerSprites(world));
      expect(trainer).toBeDefined();
      seen.add(trainer!.kind);
    }

    expect([...seen].sort()).toEqual([...TRAINER_KINDS].sort());
  });

  it("spawns one trainer from an offscreen edge that reaches view promptly", () => {
    const world = createWalkerWorld(420, seeded(7));
    const initial = getWalkerSprites(world);
    expect(initial).toHaveLength(1);

    const trainer = initial[0];
    expect(TRAINER_KINDS).toContain(trainer.kind);
    expect(trainer.y).toBe(0);
    // Fully offscreen at the left (-16) or right (width) edge.
    expect(trainer.x === -16 || trainer.x === 420).toBe(true);

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
        if (!isTrainer(sprite)) continue;
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
    const squashedX = new Map<number, number>();
    let maxActors = 0;
    let sawGoomba = false;
    let sawSquashedGoomba = false;

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
          // The Goomba never leaves the floor now that flip physics are gone.
          expect(sprite.y).toBe(0);

          if (sprite.frame === 2) {
            sawSquashedGoomba = true;
            if (squashedX.has(sprite.id)) {
              expect(sprite.x).toBe(squashedX.get(sprite.id));
            } else {
              squashedX.set(sprite.id, sprite.x);
            }
          } else {
            expect([0, 1]).toContain(sprite.frame);
            expect(squashedX.has(sprite.id)).toBe(false);
          }
        }

        if (sprite.kind === "mario") {
          sceneActorIds.add(sprite.id);
          expect(sprite.y).toBeGreaterThanOrEqual(0);
          expect([0, 1, 2, 3]).toContain(sprite.frame);
          if (sprite.y > 0) expect(sprite.frame).toBe(3);
        }

        if (isTrainer(sprite)) {
          expect(TRAINER_KINDS).toContain(sprite.kind);
          expect(sprite.y).toBe(0);
          expect([1, 2, 7, 8]).toContain(sprite.frame);
          if (sprite.facing === "up") {
            expect(sprite.frame).toBe(1);
          } else {
            expect(["left", "right"]).toContain(sprite.facing);
            expect([2, 7, 8]).toContain(sprite.frame);
          }
        }
      }
    }

    expect(maxActors).toBeLessThanOrEqual(WALKER_MAX_ACTORS);
    expect(maxActors).toBeGreaterThanOrEqual(2);
    expect(sawGoomba).toBe(true);
    expect(sawSquashedGoomba).toBe(true);

    // Every scene actor that appeared during the window has left the stage by
    // the end (the last possible scene starts by 120s and takes < 60s).
    const leftoverSceneActors = getWalkerSprites(world).filter((sprite) =>
      sceneActorIds.has(sprite.id),
    );
    expect(leftoverSceneActors).toHaveLength(0);
  });

  it("cycles Mario's walk frames 0,1,2 on the 133ms cadence while chasing", () => {
    const width = 480;
    let world = createWalkerWorld(width, seeded(2718));
    let mario: WalkerSprite | undefined;

    for (let elapsed = 0; elapsed < 240_000 && !mario; elapsed += 1) {
      world = stepWalkerWorld(world, 1, width);
      mario = getWalkerSprites(world).find(
        (sprite) => sprite.kind === "mario",
      );
    }
    expect(mario).toBeDefined();

    const observed: Array<{ time: number; frame: number }> = [];
    // The first visible frame is already 0. Five transitions cover one full
    // 0→1→2 cycle plus the restart, proving the order repeats.
    let lastFrame = 0;

    for (let elapsed = 0; elapsed < 4_000; elapsed += 1) {
      world = stepWalkerWorld(world, 1, width);
      const sprite = getWalkerSprites(world).find(
        (entry) => entry.kind === "mario",
      );
      if (!sprite) break;
      if (sprite.y > 0) break; // The hop is covered separately.
      if (sprite.frame !== lastFrame) {
        observed.push({ time: elapsed, frame: sprite.frame });
        lastFrame = sprite.frame;
      }
      if (observed.length >= 5) break;
    }

    expect(observed.map((entry) => entry.frame)).toEqual([
      1, 2, 0, 1, 2,
    ]);
    for (let index = 1; index < observed.length; index += 1) {
      expect(observed[index].time - observed[index - 1].time).toBe(
        WALKER_FRAME_MS,
      );
    }
  });

  it("alternates the Goomba's 0/1 walk frames on the 133ms cadence", () => {
    const width = 640;
    let world = createWalkerWorld(width, seeded(2718));
    let goomba: WalkerSprite | undefined;
    let elapsed = 0;

    while (!goomba && elapsed < WALKER_SCENE_MAX_DELAY_MS + 5_000) {
      world = stepWalkerWorld(world, 1, width);
      elapsed += 1;
      goomba = getWalkerSprites(world).find(
        (sprite) => sprite.kind === "goomba",
      );
    }
    expect(goomba).toBeDefined();
    expect(goomba!.frame).toBe(0);

    const observed: Array<{ time: number; frame: number }> = [
      { time: 0, frame: 0 },
    ];
    let lastFrame = 0;

    for (let step = 1; step <= 3_000; step += 1) {
      world = stepWalkerWorld(world, 1, width);
      const sprite = getWalkerSprites(world).find(
        (entry) => entry.kind === "goomba",
      );
      if (!sprite) break;
      expect(sprite.y).toBe(0);
      if (sprite.frame !== lastFrame) {
        observed.push({ time: step, frame: sprite.frame });
        lastFrame = sprite.frame;
      }
      if (sprite.frame === 2) break;
    }

    expect(observed.map((entry) => entry.frame).slice(0, 6)).toEqual([
      0, 1, 0, 1, 0, 1,
    ]);
    for (let index = 1; index < 6; index += 1) {
      expect(observed[index].time - observed[index - 1].time).toBe(
        WALKER_FRAME_MS,
      );
    }
  });

  const CHASE_CASES = [
    { seed: 1, direction: "left" as const },
    { seed: 2, direction: "right" as const },
  ];

  it.each(CHASE_CASES)(
    "runs a real $direction chase -> jump -> descending stomp -> squash -> walk-on sequence (seed $seed)",
    ({ seed, direction }) => {
      const width = 480;
      let world = createWalkerWorld(width, seeded(seed));

      let goombaSeenAt: number | null = null;
      let marioSeenAt: number | null = null;
      let jumpSeenAt: number | null = null;
      let maxMarioY = 0;
      let stompAt: number | null = null;
      let squashSnapshot: WalkerSprite | null = null;
      let goombaMovedWhileSquashed = false;
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

        if (goomba && goombaSeenAt === null) {
          goombaSeenAt = elapsed;
          expect(goomba.facing).toBe(direction);
        }
        if (mario && marioSeenAt === null) {
          marioSeenAt = elapsed;
          expect(mario.facing).toBe(direction);
        }
        if (mario) {
          expect(mario.facing).toBe(direction);
          maxMarioY = Math.max(maxMarioY, mario.y);
          expect(mario.y).toBeGreaterThanOrEqual(0);
          if (mario.y > 0) {
            // Airborne Mario always uses the real sheet's jump frame.
            expect(mario.frame).toBe(3);
            if (jumpSeenAt === null) jumpSeenAt = elapsed;
          }
        }
        if (goomba) {
          expect(goomba.y).toBe(0);
          expect(goomba.facing).toBe(direction);
        }

        if (
          stompAt === null &&
          previousGoomba &&
          goomba &&
          previousGoomba.frame !== 2 &&
          goomba.frame === 2
        ) {
          expect(previousMario).toBeDefined();
          expect(mario).toBeDefined();
          stompAt = elapsed;
          squashSnapshot = { ...goomba };

          // This is a *descending* stomp, not a side collision.
          expect(mario!.y).toBeLessThan(previousMario!.y);
          expect(mario!.y).toBe(16);
          expect(
            Math.min(mario!.x + 16, goomba.x + 16) -
              Math.max(mario!.x, goomba.x),
          ).toBeGreaterThanOrEqual(2);
        }

        if (goomba && goomba.frame === 2 && squashSnapshot) {
          if (goomba.x !== squashSnapshot.x || goomba.y !== squashSnapshot.y) {
            goombaMovedWhileSquashed = true;
          }
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
      expect(squashSnapshot).not.toBeNull();
      expect(squashSnapshot!.y).toBe(0);
      expect(squashSnapshot!.frame).toBe(2);
      expect(goombaMovedWhileSquashed).toBe(false);
      expect(goombaRemovedAt).not.toBeNull();
      // The flattened Goomba holds for its linger, then is removed.
      expect(goombaRemovedAt! - stompAt!).toBeGreaterThanOrEqual(
        WALKER_GOOMBA_SQUASH_LINGER_MS,
      );
      expect(goombaRemovedAt! - stompAt!).toBeLessThanOrEqual(
        WALKER_GOOMBA_SQUASH_LINGER_MS + FRAME_MS,
      );
      // Mario keeps moving after the Goomba disappears, then exits.
      expect(marioAfterGoombaRemoval).toBe(true);
      expect(marioRemovedAt).not.toBeNull();
      expect(marioRemovedAt!).toBeGreaterThan(goombaRemovedAt!);
    },
  );

  it("holds a stomped Goomba frozen for exactly 700ms, then removes it", () => {
    const width = 480;
    const { world, goomba: stamped } = runToStomp(width, 2718);

    expect(stamped.frame).toBe(2);
    expect(stamped.y).toBe(0);
    expect(stamped.x).toBeGreaterThanOrEqual(0);
    expect(stamped.x).toBeLessThan(width);

    const lingering = stepWalkerWorld(
      world,
      WALKER_GOOMBA_SQUASH_LINGER_MS - 1,
      width,
    );
    const held = getWalkerSprites(lingering).find(
      (sprite) => sprite.kind === "goomba",
    );
    expect(held).toBeDefined();
    expect(held!.id).toBe(stamped.id);
    expect(held!.x).toBe(stamped.x);
    expect(held!.y).toBe(0);
    expect(held!.frame).toBe(2);

    const removed = stepWalkerWorld(lingering, 1, width);
    expect(
      getWalkerSprites(removed).some((sprite) => sprite.kind === "goomba"),
    ).toBe(false);

    // One 700ms step lands on the same boundary.
    const direct = stepWalkerWorld(
      world,
      WALKER_GOOMBA_SQUASH_LINGER_MS,
      width,
    );
    expect(
      getWalkerSprites(direct).some((sprite) => sprite.kind === "goomba"),
    ).toBe(false);
  });

  it("replays squashed scene state deterministically without mutating it", () => {
    const width = 480;
    const { world } = runToStomp(width, 2718);
    const snapshot = JSON.parse(JSON.stringify(world));

    const first = stepWalkerWorld(world, 400, width);
    expect(world).toEqual(snapshot);

    const replay = stepWalkerWorld(
      JSON.parse(JSON.stringify(world)),
      400,
      width,
    );
    expect(replay).toEqual(first);
    expect(getWalkerSprites(replay)).toEqual(getWalkerSprites(first));

    // 400ms is still inside the 700ms linger, so the new scene state ran.
    const held = getWalkerSprites(first).find(
      (sprite) => sprite.kind === "goomba",
    );
    expect(held).toBeDefined();
    expect(held!.frame).toBe(2);
    expect(held!.y).toBe(0);
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
