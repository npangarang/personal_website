// Pure, deterministic simulation for the little trainers, Mario and the Goomba
// that walk along the bottom of the terminal.
//
// The component owns rendering, CSS, animation-frame timing and visibility.
// This module owns only the world state: who exists, where they are, which
// sheet frame they are showing and which way they face.
//
// Coordinates are *logical base pixels*: `x` is the sprite's left edge and `y`
// is lift above the floor (negative while falling below it). The component
// divides its CSS width by the current display scale before calling us, so the
// simulation is resolution-independent.
//
// `stepWalkerWorld` is pure: it deep-copies the world, advances a local copy and
// returns it. The caller's world (and anything it returned to the renderer) is
// never mutated.

export const WALKER_FRAME_MS = 133;
export const WALKER_MAX_ACTORS = 3;
export const WALKER_SCENE_MIN_DELAY_MS = 45_000;
export const WALKER_SCENE_MAX_DELAY_MS = 120_000;

/** Trainer sheets are 144×32: nine 16×32 frames laid out horizontally. */
export const WALKER_TRAINER_FRAME_WIDTH = 16;
export const WALKER_TRAINER_FRAME_HEIGHT = 32;

export type WalkerKind =
  | "brendan"
  | "may"
  | "hiker"
  | "lass"
  | "picnicker"
  | "sailor"
  | "mario"
  | "goomba";

export type WalkerFacing = "left" | "right" | "up" | "down";

export interface WalkerSprite {
  id: number;
  kind: WalkerKind;
  x: number;
  y: number;
  frame: number;
  facing: WalkerFacing;
  flipped: boolean;
}

type TrainerKind = Extract<
  WalkerKind,
  "brendan" | "may" | "hiker" | "lass" | "picnicker" | "sailor"
>;

type Direction = -1 | 1;

interface TrainerActor {
  role: "trainer";
  id: number;
  kind: TrainerKind;
  x: number;
  dir: Direction;
  speed: number;
  facing: WalkerFacing;
  walkMs: number;
  pauseCooldownMs: number;
  pauseRemainingMs: number;
}

interface GoombaActor {
  role: "goomba";
  kind: "goomba";
  id: number;
  x: number;
  y: number;
  vy: number;
  dir: Direction;
  speed: number;
  flipped: boolean;
}

type MarioPhase = "chase" | "jump" | "walk";

interface MarioActor {
  role: "mario";
  kind: "mario";
  id: number;
  x: number;
  y: number;
  vy: number;
  vx: number;
  dir: Direction;
  speed: number;
  walkMs: number;
  phase: MarioPhase;
  stomped: boolean;
}

type WalkerActor = TrainerActor | GoombaActor | MarioActor;

interface WalkerScene {
  dir: Direction;
  goombaId: number;
  marioId: number | null;
  /** Time until Mario enters from the same edge as the Goomba. */
  marioSpawnInMs: number | null;
  goombaSpeed: number;
  chaseSpeed: number;
}

export interface WalkerWorld {
  width: number;
  timeMs: number;
  actors: WalkerActor[];
  nextId: number;
  rngState: number;
  trainerSpawnInMs: number;
  nextTrainerSide: Direction;
  sceneDueInMs: number;
  scenePending: boolean;
  scene: WalkerScene | null;
}

// Sheet frame indices. Trainer art is drawn facing left, so the renderer mirrors
// it for right-facing trainers. up/down poses are not mirrored.
const TRAINER_WALK_FRAMES = [7, 2, 8, 2] as const;
const TRAINER_IDLE_UP_FRAME = 1;
// If vertical trainer walking is ever emitted: down walk [3, 0, 4, 0] with
// down idle 0, up walk [5, 1, 6, 1] with up idle 1.

const TRAINER_KINDS: readonly TrainerKind[] = [
  "brendan",
  "may",
  "hiker",
  "lass",
  "picnicker",
  "sailor",
];

// Mario's sheet has three frames (left stride, together, right stride). Bounce
// back through the middle frame so the walk does not skip from right to left.
const MARIO_WALK_FRAMES = [0, 1, 2, 1] as const;

const TRAINER_SPEED_MIN = 12;
const TRAINER_SPEED_MAX = 18;
const INITIAL_TRAINER_SPEED_MIN = 20;
const INITIAL_TRAINER_SPEED_MAX = 24;
const MAX_TRAINERS = 2;
const TRAINER_PAUSE_MIN_MS = 1_000;
const TRAINER_PAUSE_MAX_MS = 3_000;
const TRAINER_PAUSE_COOLDOWN_MIN_MS = 3_500;
const TRAINER_PAUSE_COOLDOWN_MAX_MS = 8_000;

const SPRITE_WIDTH = 16;
const GOOMBA_SPEED_MIN = 13;
const GOOMBA_SPEED_MAX = 16;
const MARIO_EXTRA_SPEED_MIN = 17;
const MARIO_EXTRA_SPEED_MAX = 23;
const MARIO_WALK_SPEED_FACTOR = 0.85;

const JUMP_TRIGGER_GAP = 18;
const MIN_JUMP_RUNWAY = 24;
const STOMP_HEIGHT = 16;
const JUMP_VELOCITY = 150;
const GRAVITY = 360;
const FLIP_VELOCITY = 70;
const FLIP_GRAVITY = 420;
const FLIP_REMOVE_Y = -32;

const MAX_SUBSTEP_MS = 32;
const MAX_TIME_MS = 24 * 60 * 60 * 1_000;

function normalizeWidth(width: number, fallback: number): number {
  return Number.isFinite(width) && width > 0 ? width : fallback;
}

function normalizeRandom(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.999999999, Math.max(0, value));
}

function seedRandomState(value: number): number {
  return Math.floor(normalizeRandom(value) * 0x100000000) >>> 0;
}

/** Deterministic Mulberry32 step. */
function drawRandom(world: WalkerWorld, rng?: () => number): number {
  if (rng) return normalizeRandom(rng());

  const state = (world.rngState + 0x6d2b79f5) >>> 0;
  world.rngState = state;
  let r = Math.imul(state ^ (state >>> 15), state | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return ((r ^ (r >>> 14)) >>> 0) / 0x100000000;
}

function randomBetween(
  world: WalkerWorld,
  rng: (() => number) | undefined,
  min: number,
  max: number,
): number {
  return min + drawRandom(world, rng) * (max - min);
}

function pickTrainerKind(world: WalkerWorld, rng?: () => number): TrainerKind {
  const index = Math.floor(drawRandom(world, rng) * TRAINER_KINDS.length);
  return TRAINER_KINDS[Math.min(TRAINER_KINDS.length - 1, index)];
}

function cloneWorld(world: WalkerWorld): WalkerWorld {
  return {
    ...world,
    actors: world.actors.map((actor) => ({ ...actor })),
    scene: world.scene ? { ...world.scene } : null,
  };
}

function getTrainers(world: WalkerWorld): TrainerActor[] {
  return world.actors.filter(
    (actor): actor is TrainerActor => actor.role === "trainer",
  );
}

function getGoomba(world: WalkerWorld, id: number): GoombaActor | undefined {
  return world.actors.find(
    (actor): actor is GoombaActor =>
      actor.role === "goomba" && actor.id === id,
  );
}

function getMario(world: WalkerWorld, id: number | null): MarioActor | undefined {
  if (id == null) return undefined;
  return world.actors.find(
    (actor): actor is MarioActor => actor.role === "mario" && actor.id === id,
  );
}

function spawnTrainer(
  world: WalkerWorld,
  side: Direction,
  rng: (() => number) | undefined,
  initial: boolean,
): void {
  if (getTrainers(world).length >= MAX_TRAINERS) return;

  const speed = initial
    ? randomBetween(
        world,
        rng,
        INITIAL_TRAINER_SPEED_MIN,
        INITIAL_TRAINER_SPEED_MAX,
      )
    : randomBetween(world, rng, TRAINER_SPEED_MIN, TRAINER_SPEED_MAX);

  const actor: TrainerActor = {
    role: "trainer",
    id: world.nextId++,
    kind: pickTrainerKind(world, rng),
    x: side === -1 ? -SPRITE_WIDTH : world.width,
    dir: side === -1 ? 1 : -1,
    speed,
    facing: side === -1 ? "right" : "left",
    walkMs: 0,
    pauseCooldownMs: randomBetween(
      world,
      rng,
      TRAINER_PAUSE_COOLDOWN_MIN_MS,
      TRAINER_PAUSE_COOLDOWN_MAX_MS,
    ),
    pauseRemainingMs: 0,
  };

  world.actors.push(actor);
}

function startScene(world: WalkerWorld, rng?: () => number): void {
  if (world.scene || world.actors.length + 2 > WALKER_MAX_ACTORS) return;

  const dir: Direction = drawRandom(world, rng) < 0.5 ? 1 : -1;
  const goombaSpeed = randomBetween(
    world,
    rng,
    GOOMBA_SPEED_MIN,
    GOOMBA_SPEED_MAX,
  );
  const chaseSpeed =
    goombaSpeed +
    randomBetween(world, rng, MARIO_EXTRA_SPEED_MIN, MARIO_EXTRA_SPEED_MAX);

  // The Goomba leads. Mario enters once it has covered enough of the strip that
  // the chase is visible without the Goomba reaching the far edge before the
  // stomp. Clamp for very narrow strips.
  const leadDistance = Math.min(
    Math.max(world.width * 0.42, 28),
    220,
  );
  const marioSpawnInMs = (leadDistance / goombaSpeed) * 1_000;

  const goomba: GoombaActor = {
    role: "goomba",
    kind: "goomba",
    id: world.nextId++,
    x: dir === 1 ? -SPRITE_WIDTH : world.width,
    y: 0,
    vy: 0,
    dir,
    speed: goombaSpeed,
    flipped: false,
  };

  world.actors.push(goomba);
  world.scene = {
    dir,
    goombaId: goomba.id,
    marioId: null,
    marioSpawnInMs,
    goombaSpeed,
    chaseSpeed,
  };
  world.scenePending = false;
}

function spawnMario(world: WalkerWorld, scene: WalkerScene): void {
  const mario: MarioActor = {
    role: "mario",
    kind: "mario",
    id: world.nextId++,
    x: scene.dir === 1 ? -SPRITE_WIDTH : world.width,
    y: 0,
    vy: 0,
    vx: 0,
    dir: scene.dir,
    speed: scene.chaseSpeed,
    walkMs: 0,
    phase: "chase",
    stomped: false,
  };

  world.actors.push(mario);
  scene.marioId = mario.id;
  scene.marioSpawnInMs = null;
}

function horizontalGap(mario: MarioActor, goomba: GoombaActor): number {
  return mario.dir === 1
    ? goomba.x - (mario.x + SPRITE_WIDTH)
    : mario.x - (goomba.x + SPRITE_WIDTH);
}

function beginJump(
  mario: MarioActor,
  goomba: GoombaActor,
  scene: WalkerScene,
): void {
  // Solve for the descending crossing of the Goomba's 16px-high top. Aim the
  // horizontal velocity so Mario's centre meets the Goomba's centre at that
  // exact moment; this makes the stomp deliberate instead of accidental and
  // prevents side-on overlap.
  const discriminant =
    JUMP_VELOCITY * JUMP_VELOCITY - 2 * GRAVITY * STOMP_HEIGHT;
  if (discriminant <= 0) return;

  const secondsToStomp =
    (JUMP_VELOCITY + Math.sqrt(discriminant)) / GRAVITY;
  const targetCentre =
    goomba.x +
    SPRITE_WIDTH / 2 +
    scene.dir * scene.goombaSpeed * secondsToStomp;

  mario.vx = (targetCentre - (mario.x + SPRITE_WIDTH / 2)) / secondsToStomp;
  mario.vy = JUMP_VELOCITY;
  mario.y = 0;
  mario.phase = "jump";
}

function advanceTrainers(
  world: WalkerWorld,
  deltaMs: number,
  rng: (() => number) | undefined,
  draining: boolean,
): void {
  const seconds = deltaMs / 1_000;

  for (const trainer of getTrainers(world)) {
    // While the Mario scene waits for cap space, cancel reading pauses so the
    // trainers actually drain and the scene is never starved.
    if (draining && trainer.pauseRemainingMs > 0) {
      trainer.pauseRemainingMs = 0;
      trainer.pauseCooldownMs = randomBetween(
        world,
        rng,
        TRAINER_PAUSE_COOLDOWN_MIN_MS,
        TRAINER_PAUSE_COOLDOWN_MAX_MS,
      );
    }

    if (trainer.pauseRemainingMs > 0) {
      trainer.pauseRemainingMs = Math.max(
        0,
        trainer.pauseRemainingMs - deltaMs,
      );
      trainer.facing = "up";
      if (trainer.pauseRemainingMs === 0) {
        trainer.facing = trainer.dir === 1 ? "right" : "left";
        trainer.walkMs = 0;
        trainer.pauseCooldownMs = randomBetween(
          world,
          rng,
          TRAINER_PAUSE_COOLDOWN_MIN_MS,
          TRAINER_PAUSE_COOLDOWN_MAX_MS,
        );
      }
      continue;
    }

    trainer.x += trainer.dir * trainer.speed * seconds;
    trainer.walkMs += deltaMs;
    trainer.facing = trainer.dir === 1 ? "right" : "left";
    trainer.pauseCooldownMs -= deltaMs;

    if (trainer.pauseCooldownMs <= 0) {
      const fullyVisible =
        trainer.x > -2 && trainer.x < world.width - SPRITE_WIDTH + 2;
      if (!draining && fullyVisible) {
        trainer.pauseRemainingMs = randomBetween(
          world,
          rng,
          TRAINER_PAUSE_MIN_MS,
          TRAINER_PAUSE_MAX_MS,
        );
        trainer.facing = "up";
        trainer.walkMs = 0;
      } else {
        trainer.pauseCooldownMs = randomBetween(world, rng, 800, 1_800);
      }
    }
  }
}

function advanceScene(
  world: WalkerWorld,
  deltaMs: number,
  rng: (() => number) | undefined,
): void {
  const scene = world.scene;
  if (!scene) return;

  const seconds = deltaMs / 1_000;
  let goomba = getGoomba(world, scene.goombaId);

  // The Goomba is already on its way before Mario enters.
  if (goomba) {
    if (goomba.flipped) {
      goomba.vy -= FLIP_GRAVITY * seconds;
      goomba.y += goomba.vy * seconds;
    } else {
      goomba.x += scene.dir * goomba.speed * seconds;
    }
  }

  if (!goomba) {
    // Nothing left to chase. Any remaining Mario simply exits.
    scene.marioSpawnInMs = null;
  }

  let mario = getMario(world, scene.marioId);

  if (!mario && goomba && scene.marioSpawnInMs !== null) {
    scene.marioSpawnInMs -= deltaMs;
    if (scene.marioSpawnInMs <= 0) {
      spawnMario(world, scene);
      mario = getMario(world, scene.marioId);
    }
  }

  // Re-read after a possible spawn and after the Goomba could have been moved.
  goomba = getGoomba(world, scene.goombaId);
  mario = getMario(world, scene.marioId);

  if (!mario) return;

  if (mario.phase === "chase") {
    mario.x += scene.dir * mario.speed * seconds;
    mario.walkMs += deltaMs;

    if (goomba && !goomba.flipped) {
      let gap = horizontalGap(mario, goomba);

      // Never let the chase become a head-on overlap. If a resize or a very
      // large step closed the gap, park Mario at the Goomba's heel.
      if (gap < 0) {
        mario.x =
          scene.dir === 1
            ? goomba.x - SPRITE_WIDTH
            : goomba.x + SPRITE_WIDTH;
        gap = 0;
      }

      const runway =
        scene.dir === 1
          ? world.width - (goomba.x + SPRITE_WIDTH)
          : goomba.x;

      if (gap <= JUMP_TRIGGER_GAP && runway >= MIN_JUMP_RUNWAY) {
        beginJump(mario, goomba, scene);
      }
    }
    return;
  }

  if (mario.phase === "jump") {
    const previousY = mario.y;
    mario.vy -= GRAVITY * seconds;
    mario.y += mario.vy * seconds;
    mario.x += mario.vx * seconds;
    mario.walkMs += deltaMs;

    if (
      goomba &&
      !goomba.flipped &&
      !mario.stomped &&
      mario.vy < 0 &&
      previousY > STOMP_HEIGHT &&
      mario.y <= STOMP_HEIGHT
    ) {
      const overlap =
        Math.min(mario.x + SPRITE_WIDTH, goomba.x + SPRITE_WIDTH) -
        Math.max(mario.x, goomba.x);

      if (overlap >= 2) {
        // A genuine descending stomp: flip the Goomba, snap Mario onto its top
        // for one clean frame, then let both fall naturally.
        goomba.flipped = true;
        goomba.vy = FLIP_VELOCITY;
        mario.stomped = true;
        mario.y = STOMP_HEIGHT;
      }
    }

    if (mario.y <= 0 && mario.vy < 0) {
      mario.y = 0;
      mario.vy = 0;
      mario.vx = 0;
      mario.phase = "walk";
      mario.speed = scene.chaseSpeed * MARIO_WALK_SPEED_FACTOR;
    }
    return;
  }

  // Landed and walking on.
  mario.x += scene.dir * mario.speed * seconds;
  mario.walkMs += deltaMs;
}

function actorHasExited(actor: WalkerActor, width: number): boolean {
  if (actor.role === "trainer" || actor.role === "mario") {
    return actor.dir === 1 ? actor.x >= width : actor.x + SPRITE_WIDTH <= 0;
  }

  if (actor.flipped) return actor.y < FLIP_REMOVE_Y;
  return actor.dir === 1 ? actor.x >= width : actor.x + SPRITE_WIDTH <= 0;
}

function pruneExitedActors(world: WalkerWorld): void {
  world.actors = world.actors.filter(
    (actor) => !actorHasExited(actor, world.width),
  );
}

function completeSceneIfDone(
  world: WalkerWorld,
  rng: (() => number) | undefined,
): void {
  const scene = world.scene;
  if (!scene) return;

  const hasGoomba = Boolean(getGoomba(world, scene.goombaId));
  const hasMario = Boolean(getMario(world, scene.marioId));
  if (hasGoomba || hasMario) return;

  world.scene = null;
  world.scenePending = false;
  world.sceneDueInMs = randomBetween(
    world,
    rng,
    WALKER_SCENE_MIN_DELAY_MS,
    WALKER_SCENE_MAX_DELAY_MS,
  );
}

function maybeStartScene(
  world: WalkerWorld,
  rng: (() => number) | undefined,
): void {
  if (world.scene || !world.scenePending) return;
  if (getTrainers(world).length > 1) return;
  if (world.actors.length + 2 > WALKER_MAX_ACTORS) return;
  startScene(world, rng);
}

function maybeSpawnTrainer(
  world: WalkerWorld,
  deltaMs: number,
  rng: (() => number) | undefined,
): void {
  if (world.scene || world.scenePending) return;

  world.trainerSpawnInMs -= deltaMs;
  if (world.trainerSpawnInMs > 0) return;

  if (getTrainers(world).length >= MAX_TRAINERS) {
    world.trainerSpawnInMs = 2_500;
    return;
  }

  spawnTrainer(world, world.nextTrainerSide, rng, false);
  world.nextTrainerSide = world.nextTrainerSide === 1 ? -1 : 1;
  world.trainerSpawnInMs = randomBetween(world, rng, 7_000, 16_000);
}

function advance(
  world: WalkerWorld,
  deltaMs: number,
  rng: (() => number) | undefined,
): void {
  world.timeMs = Math.min(MAX_TIME_MS, world.timeMs + deltaMs);

  if (!world.scene && !world.scenePending) {
    world.sceneDueInMs -= deltaMs;
    if (world.sceneDueInMs <= 0) {
      world.sceneDueInMs = 0;
      world.scenePending = true;
    }
  }

  const draining = Boolean(world.scene) || world.scenePending;
  advanceTrainers(world, deltaMs, rng, draining);
  advanceScene(world, deltaMs, rng);

  pruneExitedActors(world);
  completeSceneIfDone(world, rng);
  maybeStartScene(world, rng);
  maybeSpawnTrainer(world, deltaMs, rng);
}

function trainerFrame(trainer: TrainerActor): number {
  if (trainer.pauseRemainingMs > 0) return TRAINER_IDLE_UP_FRAME;
  if (trainer.walkMs <= 0) return TRAINER_WALK_FRAMES[0];
  const index =
    Math.floor(trainer.walkMs / WALKER_FRAME_MS) %
    TRAINER_WALK_FRAMES.length;
  return TRAINER_WALK_FRAMES[index];
}

function marioFrame(mario: MarioActor): number {
  const index =
    Math.floor(mario.walkMs / WALKER_FRAME_MS) % MARIO_WALK_FRAMES.length;
  return MARIO_WALK_FRAMES[index];
}

function facingForActor(actor: WalkerActor): WalkerFacing {
  if (actor.role === "trainer") return actor.facing;
  return actor.dir === 1 ? "right" : "left";
}

function frameForActor(actor: WalkerActor): number {
  if (actor.role === "trainer") return trainerFrame(actor);
  if (actor.role === "mario") return marioFrame(actor);
  return 0;
}

function spriteForActor(actor: WalkerActor): WalkerSprite {
  return {
    id: actor.id,
    kind: actor.kind,
    x: actor.x,
    y: actor.role === "trainer" ? 0 : actor.y,
    frame: frameForActor(actor),
    facing: facingForActor(actor),
    flipped: actor.role === "goomba" ? actor.flipped : false,
  };
}

export function createWalkerWorld(
  width: number,
  rng: () => number = Math.random,
): WalkerWorld {
  const seed = normalizeRandom(rng());
  const world: WalkerWorld = {
    width: normalizeWidth(width, 640),
    timeMs: 0,
    actors: [],
    nextId: 1,
    rngState: seedRandomState(seed),
    trainerSpawnInMs: 0,
    nextTrainerSide: 1,
    sceneDueInMs: 0,
    scenePending: false,
    scene: null,
  };

  const firstSide: Direction =
    drawRandom(world) < 0.5 ? -1 : 1;
  spawnTrainer(world, firstSide, undefined, true);
  world.nextTrainerSide = firstSide === 1 ? -1 : 1;
  world.trainerSpawnInMs = randomBetween(world, undefined, 6_000, 14_000);
  world.sceneDueInMs = randomBetween(
    world,
    undefined,
    WALKER_SCENE_MIN_DELAY_MS,
    WALKER_SCENE_MAX_DELAY_MS,
  );

  return world;
}

export function stepWalkerWorld(
  world: WalkerWorld,
  deltaMs: number,
  width: number,
  rng?: () => number,
): WalkerWorld {
  const next = cloneWorld(world);
  next.width = normalizeWidth(width, world.width);

  const delta = Number.isFinite(deltaMs)
    ? Math.min(MAX_TIME_MS, Math.max(0, deltaMs))
    : 0;

  if (delta === 0) {
    // A zero-delta step is used when the strip is resized. Drop anything the
    // new width pushed completely off its travel edge, then finish.
    pruneExitedActors(next);
    completeSceneIfDone(next, rng);
    return next;
  }

  let remaining = delta;
  while (remaining > 0) {
    const slice = Math.min(MAX_SUBSTEP_MS, remaining);
    remaining -= slice;
    advance(next, slice, rng);
  }

  return next;
}

export function getWalkerSprites(world: WalkerWorld): WalkerSprite[] {
  return world.actors.map(spriteForActor);
}
