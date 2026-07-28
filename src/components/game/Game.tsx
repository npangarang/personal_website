import React, { useRef, useEffect, useCallback } from "react";
import {
  ABOUT,
  EDUCATION,
  SKILLS,
  WORK_EXPERIENCE,
  CONTACT,
} from "@/data/resumeData";

// ─────────────────────── CONSTANTS ───────────────────────
const W = 400; // internal game width
const H = 225; // internal game height
const GRAVITY = 0.55;
const FRICTION = 0.82;
const MOVE_SPEED = 2.2;
const JUMP_VEL = -9;
const PLAYER_W = 14;
const PLAYER_H = 20;
const INTERACT_DIST = 36;
const DIALOG_SPEED = 1.5; // chars per frame
const PARTICLE_COUNT = 12;
const WORLD_W = 4200;
const TILE = 16;

// ─────────────────────── COLOR PALETTE ───────────────────────
const C = {
  skyTop: "#3a6fb5",
  skyBot: "#8ec5fc",
  mountainFar: "#3a2f6b",
  mountainNear: "#5a4b9a",
  hill: "#1d7a2e",
  hillLight: "#2da03e",
  grass: "#00a800",
  grassDark: "#007800",
  dirt: "#c86c1c",
  dirtDark: "#a05014",
  brick: "#c8600c",
  brickDark: "#94400c",
  brickLight: "#e8903c",
  cloud: "#fcfcfc",
  cloudShadow: "#c8d8f0",
  playerHair: "#2d1800",
  playerSkin: "#fcbc3c",
  playerShirt: "#1034fc",
  playerPants: "#5c2c14",
  playerShoes: "#381808",
  playerEye: "#000000",
  signWood: "#8b5a2b",
  signFace: "#faf0dc",
  signText: "#381808",
  qBlock: "#fcbc3c",
  qBlockDark: "#d49820",
  qBlockLight: "#fcdc7c",
  qMark: "#683000",
  building: "#c84c3c",
  buildingRoof: "#683030",
  buildingWindow: "#fce83c",
  mailbox: "#1040fc",
  mailboxFlag: "#fc2020",
  dialogBg: "#00084c",
  dialogBorder: "#fcfcfc",
  dialogText: "#fcfcfc",
  particleCyan: "#00fff5",
  particleGreen: "#39ff14",
  particleAmber: "#ffbf00",
  particleGold: "#ffd700",
  water: "#2068c0",
  waterLight: "#5098f0",
  bushGreen: "#187818",
  bushLight: "#28a828",
  flowerPink: "#fc80a8",
  flowerYellow: "#fcd800",
  pipeGreen: "#20a840",
  pipeGreenDark: "#107028",
  flag: "#fc2020",
  starGold: "#ffd700",
};

// ─────────────────────── TYPES ───────────────────────
interface Player {
  x: number; y: number;
  vx: number; vy: number;
  grounded: boolean;
  facing: 1 | -1;
  animFrame: number;
  animTimer: number;
  squash: number;
}

interface Platform {
  x: number; y: number; w: number; h: number; type: string;
}

interface WorldObj {
  x: number; y: number; w: number; h: number;
  type: "sign" | "qblock" | "building" | "mailbox" | "trophy" | "pipe" | "flag" | "star";
  section: string;
  title?: string;
  text?: string;
  skills?: string[];
  company?: string;
  role?: string;
  hint?: string;
  hit: boolean;
  bounceT: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string;
  size: number;
}

interface DialogState {
  active: boolean;
  lines: string[];
  currentLine: number;
  charIdx: number;
  timer: number;
}

// ─────────────────────── PLAYER SPRITE (16x20, color indices) ───────────────────────
// 0=transparent, 1=hair, 2=skin, 3=shirt, 4=pants, 5=shoes, 6=eye
const SPRITE: Record<string, number[][]> = {
  idle: [
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,1,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,1,2,2,1,1,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,0,3,3,3,3,0,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,3,0],
    [0,0,0,0,0,3,3,3,1,3,3,3,3,3,0,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0],
    [0,0,0,0,0,0,4,4,4,4,4,0,0,0,0,0],
    [0,0,0,0,0,0,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,0,0,0,4,4,0,4,4,4,0,0,0,0],
    [0,0,0,0,0,0,4,4,0,4,4,4,0,0,0,0],
    [0,0,0,0,0,0,5,5,0,0,5,5,0,0,0,0],
    [0,0,0,0,0,0,5,5,0,0,5,5,0,0,0,0],
    [0,0,0,0,0,0,0,5,0,0,5,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ],
  walk1: [
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,1,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,1,2,2,1,1,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,0,3,3,3,3,0,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,3,0],
    [0,0,0,0,0,3,3,3,1,3,3,3,3,3,3,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,0,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,0,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,0,0,0,4,4,4,4,4,0,0,0,0,0],
    [0,0,0,0,0,4,4,4,4,4,0,0,0,0,0,0],
    [0,0,0,0,0,4,4,0,4,4,0,0,0,0,0,0],
    [0,0,0,0,0,4,4,0,4,4,0,0,0,0,0,0],
    [0,0,0,0,0,5,5,0,5,5,0,0,0,0,0,0],
    [0,0,0,0,0,5,5,0,5,5,0,0,0,0,0,0],
    [0,0,0,0,0,5,0,0,5,0,0,0,0,0,0,0],
    [0,0,0,0,0,5,0,0,5,0,0,0,0,0,0,0],
  ],
  walk2: [
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,1,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,1,2,2,1,1,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,0,3,3,3,3,0,0],
    [0,3,0,0,0,3,3,3,3,3,3,3,3,3,3,0],
    [0,3,3,0,0,3,3,3,1,3,3,3,3,3,3,0],
    [0,0,3,3,0,3,3,3,3,3,3,3,3,3,3,0],
    [0,0,0,3,0,3,3,3,3,3,3,3,3,3,3,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,0,0],
    [0,0,0,0,0,0,4,4,4,4,4,0,0,0,0,0],
    [0,0,0,0,0,0,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,0,0,0,4,4,0,4,4,4,0,0,0,0],
    [0,0,0,0,0,0,4,4,0,4,4,4,0,0,0,0],
    [0,0,0,0,0,0,5,5,0,0,5,5,0,0,0,0],
    [0,0,0,0,0,0,5,5,0,0,5,5,0,0,0,0],
    [0,0,0,0,0,0,5,0,0,0,5,0,0,0,0,0],
    [0,0,0,0,0,0,5,0,0,0,5,0,0,0,0,0],
  ],
  jump: [
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,1,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0],
    [0,0,0,1,2,1,2,2,1,1,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,0,3,3,3,3,0,0],
    [0,0,3,3,0,3,3,3,3,3,3,3,3,3,3,0],
    [0,0,3,3,0,3,3,3,1,3,3,3,3,3,3,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,3,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,3,0],
    [0,0,0,0,0,3,3,3,3,3,3,3,3,3,0,0],
    [0,0,0,0,4,4,4,4,4,4,0,0,0,0,0,0],
    [0,0,0,0,4,4,4,4,4,4,0,0,0,0,0,0],
    [0,0,0,0,0,4,4,0,4,4,0,0,0,0,0,0],
    [0,0,0,0,0,4,4,0,4,4,0,0,0,0,0,0],
    [0,0,0,0,5,5,0,0,0,5,5,0,0,0,0,0],
    [0,0,0,0,5,5,0,0,0,5,5,0,0,0,0,0],
    [0,0,0,0,5,0,0,0,0,0,5,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ],
};

const SPRITE_COLORS = [
  "", // 0 = transparent
  C.playerHair,
  C.playerSkin,
  C.playerShirt,
  C.playerPants,
  C.playerShoes,
  C.playerEye,
];

// ─────────────────────── LEVEL DATA ───────────────────────
function makeGround(x: number, w: number): Platform {
  return { x, y: H - 32, w, h: 32, type: "ground" };
}
function makePlat(x: number, y: number, w: number): Platform {
  return { x, y, w, h: TILE, type: "brick" };
}
function makeQPlat(x: number, y: number, w: number): Platform {
  return { x, y, w, h: TILE, type: "question" };
}

const PLATFORMS: Platform[] = [
  // === ZONE 0: WELCOME (0-450) ===
  makeGround(0, 480),
  makePlat(120, 155, 48),
  makePlat(240, 130, 48),
  makePlat(360, 145, 64),
  // === ZONE 1: ABOUT (480-1000) ===
  makeGround(520, 520),
  makePlat(600, 150, 64),
  makePlat(740, 135, 48),
  makePlat(860, 120, 48),
  makeGround(1080, 2080 - 1080),
  makePlat(1120, 155, 64),
  makePlat(1260, 130, 80),
  makePlat(1400, 145, 64),
  // === ZONE 2: EDUCATION (1080-1700) ===
  makePlat(1540, 140, 48),
  makeQPlat(1600, 140, TILE),
  makeQPlat(1616, 140, TILE),
  makeQPlat(1632, 140, TILE),
  makePlat(1700, 120, 96),
  // === ZONE 3: SKILLS (1700-2500) ===
  makePlat(1900, 155, 64),
  makeQPlat(1948, 155, TILE),
  makeQPlat(1964, 155, TILE),
  makePlat(2050, 135, 48),
  makeQPlat(2098, 135, TILE),
  makePlat(2180, 115, 64),
  makeQPlat(2228, 115, TILE),
  makeQPlat(2244, 115, TILE),
  makeQPlat(2260, 115, TILE),
  makePlat(2350, 145, 80),
  makeGround(2080, 2520 - 2080),
  // === ZONE 4: EXPERIENCE (2500-3400) ===
  makePlat(2620, 155, 64),
  makePlat(2740, 140, 48),
  makePlat(2860, 150, 80),
  makePlat(3000, 130, 64),
  makePlat(3120, 145, 48),
  makeGround(2520, 3480 - 2520),
  // === ZONE 5: CONTACT (3400-4000) ===
  makePlat(3500, 150, 64),
  makePlat(3640, 135, 48),
  makePlat(3760, 150, 80),
  makeGround(3480, 4200 - 3480),
];

const WORLD_OBJECTS: WorldObj[] = [
  // Welcome zone
  {
    x: 160, y: H - 64, w: 24, h: 32, type: "sign", section: "welcome",
    title: "Welcome!",
    text: "Hey! I'm Neel 👋🏽\n\nSenior ML Engineer, Data Scientist & Builder.\n\nUse ← → to walk, ↑/Space to jump.\nWalk up to objects and press ↑ to interact!",
    hint: "Press ↑ to read",
    hit: false, bounceT: 0,
  },
  {
    x: 340, y: H - 64, w: 16, h: 16, type: "flag", section: "welcome",
    hint: "→ Adventure awaits!",
    hit: false, bounceT: 0,
  },
  // About zone
  {
    x: 640, y: H - 64, w: 24, h: 32, type: "sign", section: "about",
    title: "About Me",
    text: ABOUT,
    hint: "Press ↑ to read",
    hit: false, bounceT: 0,
  },
  {
    x: 820, y: H - 80, w: 48, h: 48, type: "building", section: "about",
    title: "My World",
    text: "Based in Austin, TX.\nI love building cool stuff with data 🤖\n\nML · Full Stack · Cloud · Startups",
    hint: "Press ↑ to visit",
    hit: false, bounceT: 0,
  },
  // Education zone
  {
    x: 1180, y: H - 80, w: 56, h: 48, type: "building", section: "education",
    title: EDUCATION[0].school,
    text: `${EDUCATION[0].degree}\n${EDUCATION[0].year} · ${EDUCATION[0].location}`,
    hint: "Press ↑ to view",
    hit: false, bounceT: 0,
  },
  {
    x: 1340, y: H - 72, w: 48, h: 40, type: "building", section: "education",
    title: EDUCATION[1].school,
    text: `${EDUCATION[1].degree}\n${EDUCATION[1].year} · ${EDUCATION[1].location}`,
    hint: "Press ↑ to view",
    hit: false, bounceT: 0,
  },
  // Skills zone (question blocks)
  ...Object.entries(SKILLS).map(([cat, items], i) => ({
    x: 2120 + i * 80, y: H - 120 - (i % 2) * 32, w: 16, h: 16,
    type: "qblock" as const, section: "skills",
    title: cat,
    skills: items,
    hint: "Hit from below!",
    hit: false, bounceT: 0,
  })),
  // Experience zone
  ...WORK_EXPERIENCE.map((exp, i) => ({
    x: 2600 + i * 240, y: H - 96 - (i % 2) * 16, w: 64, h: 64,
    type: "building" as const, section: "experience",
    title: exp.company,
    company: exp.company,
    role: exp.role,
    text: `${exp.role}\n${exp.duration}\n${exp.location}\n\n${exp.description}`,
    hint: "Press ↑ to explore",
    hit: false, bounceT: 0,
  })),
  // Trophy at end of experience
  {
    x: 3400, y: H - 64, w: 24, h: 32, type: "trophy", section: "experience",
    title: "Achievement Unlocked!",
    text: "4+ years building ML systems.\n\nFrom demand forecasting to ranking models,\nit's been quite a journey! 🏆",
    hint: "Press ↑ to claim",
    hit: false, bounceT: 0,
  },
  // Contact zone
  {
    x: 3540, y: H - 56, w: 20, h: 24, type: "mailbox", section: "contact",
    title: "Contact",
    text: CONTACT.map((c) => `${c.label}: ${c.value}`).join("\n"),
    hint: "Press ↑ to open",
    hit: false, bounceT: 0,
  },
  {
    x: 3780, y: H - 64, w: 24, h: 32, type: "sign", section: "contact",
    title: "Thanks for visiting!",
    text: "Let's build something cool together! 🚀\n\nType 'terminal' or press T\nfor the classic terminal experience.",
    hint: "Press ↑ to read",
    hit: false, bounceT: 0,
  },
  // ── Collectible Stars ──
  { x: 150, y: H - 55, w: 10, h: 10, type: "star", section: "welcome", hit: false, bounceT: 0 },
  { x: 250, y: H - 55, w: 10, h: 10, type: "star", section: "welcome", hit: false, bounceT: 0 },
  { x: 380, y: 115, w: 10, h: 10, type: "star", section: "welcome", hit: false, bounceT: 0 },
  { x: 600, y: H - 55, w: 10, h: 10, type: "star", section: "about", hit: false, bounceT: 0 },
  { x: 720, y: 110, w: 10, h: 10, type: "star", section: "about", hit: false, bounceT: 0 },
  { x: 850, y: H - 55, w: 10, h: 10, type: "star", section: "about", hit: false, bounceT: 0 },
  { x: 960, y: 95, w: 10, h: 10, type: "star", section: "about", hit: false, bounceT: 0 },
  { x: 1150, y: H - 55, w: 10, h: 10, type: "star", section: "education", hit: false, bounceT: 0 },
  { x: 1280, y: 105, w: 10, h: 10, type: "star", section: "education", hit: false, bounceT: 0 },
  { x: 1420, y: H - 55, w: 10, h: 10, type: "star", section: "education", hit: false, bounceT: 0 },
  { x: 1580, y: H - 55, w: 10, h: 10, type: "star", section: "education", hit: false, bounceT: 0 },
  { x: 1720, y: 95, w: 10, h: 10, type: "star", section: "skills", hit: false, bounceT: 0 },
  { x: 1920, y: 130, w: 10, h: 10, type: "star", section: "skills", hit: false, bounceT: 0 },
  { x: 2070, y: H - 55, w: 10, h: 10, type: "star", section: "skills", hit: false, bounceT: 0 },
  { x: 2200, y: 90, w: 10, h: 10, type: "star", section: "skills", hit: false, bounceT: 0 },
  { x: 2370, y: H - 55, w: 10, h: 10, type: "star", section: "skills", hit: false, bounceT: 0 },
  { x: 2580, y: H - 55, w: 10, h: 10, type: "star", section: "experience", hit: false, bounceT: 0 },
  { x: 2760, y: 115, w: 10, h: 10, type: "star", section: "experience", hit: false, bounceT: 0 },
  { x: 2900, y: H - 55, w: 10, h: 10, type: "star", section: "experience", hit: false, bounceT: 0 },
  { x: 3040, y: 105, w: 10, h: 10, type: "star", section: "experience", hit: false, bounceT: 0 },
  { x: 3180, y: H - 55, w: 10, h: 10, type: "star", section: "experience", hit: false, bounceT: 0 },
  { x: 3300, y: H - 55, w: 10, h: 10, type: "star", section: "experience", hit: false, bounceT: 0 },
  { x: 3550, y: H - 55, w: 10, h: 10, type: "star", section: "contact", hit: false, bounceT: 0 },
  { x: 3700, y: 125, w: 10, h: 10, type: "star", section: "contact", hit: false, bounceT: 0 },
  { x: 3850, y: H - 55, w: 10, h: 10, type: "star", section: "contact", hit: false, bounceT: 0 },
  { x: 4000, y: H - 55, w: 10, h: 10, type: "star", section: "contact", hit: false, bounceT: 0 },
];

// ─────────────────────── DRAWING HELPERS ───────────────────────
function drawSprite(
  ctx: CanvasRenderingContext2D,
  data: number[][],
  x: number, y: number,
  flip: boolean,
  scale: number,
) {
  const colors = SPRITE_COLORS;
  for (let row = 0; row < data.length; row++) {
    for (let col = 0; col < data[row].length; col++) {
      const ci = data[row][col];
      if (ci === 0) continue;
      const sx = flip ? (data[row].length - 1 - col) * scale + x : col * scale + x;
      ctx.fillStyle = colors[ci];
      ctx.fillRect(Math.round(sx), Math.round(row * scale + y), scale, scale);
    }
  }
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ─────────────────────── GAME COMPONENT ───────────────────────
const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    player: {
      x: 80, y: H - 64, vx: 0, vy: 0,
      grounded: false, facing: 1 as 1 | -1,
      animFrame: 0, animTimer: 0, squash: 0,
    } as Player,
    camera: { x: 0, y: 0, targetX: 0 },
    shakeAmount: 0,
    particles: [] as Particle[],
    dialog: { active: false, lines: [], currentLine: 0, charIdx: 0, timer: 0 } as DialogState,
    objects: WORLD_OBJECTS.map(o => ({ ...o })),
    nearestObj: null as WorldObj | null,
    promptShown: false,
    time: 0,
    keys: {} as Record<string, boolean>,
    interactedThisFrame: false,
    stars: [] as { x: number; y: number; collected: boolean; id: number }[],
    starCount: 0,
    totalStars: 0,
    achievement: null as { text: string; timer: number } | null,
    landedThisFrame: false,
  });

  const nearestObjRef = useRef<WorldObj | null>(null);

  // ─── Spawn particles ───
  const spawnParticles = useCallback((x: number, y: number, colors: string[]) => {
    const p = stateRef.current.particles;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      p.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 4 + 2),
        life: 25 + Math.random() * 15,
        maxLife: 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  // ─── Get nearest interactable object ───
  const getNearestObj = useCallback((px: number, py: number): WorldObj | null => {
    let best: WorldObj | null = null;
    let bestDist = INTERACT_DIST;
    for (const obj of stateRef.current.objects) {
      if (obj.hit && obj.type === "qblock") continue;
      if (obj.type === "star") continue;
      const cx = obj.x + obj.w / 2;
      const cy = obj.y + obj.h / 2;
      const dx = px + PLAYER_W / 2 - cx;
      const dy = py + PLAYER_H / 2 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = obj;
      }
    }
    return best;
  }, []);

  // ─── Handle interaction ───
  const interact = useCallback(() => {
    const obj = nearestObjRef.current;
    if (!obj || stateRef.current.dialog.active) return;

    if (obj.type === "qblock" && !obj.hit) {
      obj.hit = true;
      obj.bounceT = 12;
      spawnParticles(obj.x + obj.w / 2, obj.y, [
        C.particleCyan, C.particleGreen, C.particleGold, C.particleAmber,
      ]);
      // Show skills
      const lines: string[] = [];
      if (obj.title) lines.push(obj.title);
      if (obj.skills) lines.push(obj.skills.join(" · "));
      stateRef.current.dialog = {
        active: true, lines, currentLine: 0, charIdx: 0, timer: 0,
      };
    } else if (obj.text) {
      const lines = obj.text.split("\n");
      stateRef.current.dialog = {
        active: true, lines, currentLine: 0, charIdx: 0, timer: 0,
      };
    }
  }, [spawnParticles]);

  // ─── Main game loop ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Offscreen canvas for pixel-art rendering
    const offscreen = document.createElement("canvas");
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext("2d")!;
    offCtx.imageSmoothingEnabled = false;

    const s = stateRef.current;
    let animId: number;
    let lastTime = 0;

    // ─── Handle resize ───
    const resize = () => {
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      const scale = Math.floor(Math.min(maxW / W, maxH / H));
      canvas.width = W * scale;
      canvas.height = H * scale;
      canvas.style.width = `${W * scale}px`;
      canvas.style.height = `${H * scale}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize star collectibles
    const starObjs = s.objects.filter(o => o.type === "star");
    s.totalStars = starObjs.length;
    s.stars = starObjs.map((o, i) => ({ x: o.x, y: o.y, collected: false, id: i }));

    // ─── Input handlers ───
    const onKeyDown = (e: KeyboardEvent) => {
      s.keys[e.key] = true;
      if (e.key === "ArrowUp" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (s.dialog.active) {
          // Advance dialog
          if (s.dialog.currentLine < s.dialog.lines.length - 1) {
            s.dialog.currentLine++;
            s.dialog.charIdx = 0;
            s.dialog.timer = 0;
          } else {
            s.dialog.active = false;
          }
        } else {
          interact();
        }
      }
      if (e.key === "t" || e.key === "T") {
        // Switch to terminal
        window.location.href = "/terminal";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      s.keys[e.key] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ─── Update ───
    const update = (dt: number) => {
      const p = s.player;
      const keys = s.keys;

      // Player movement
      const onGround = p.grounded;
      if (keys["ArrowLeft"] || keys["a"]) {
        p.vx -= MOVE_SPEED * 0.3;
        if (p.vx < -MOVE_SPEED) p.vx = -MOVE_SPEED;
        p.facing = -1;
      } else if (keys["ArrowRight"] || keys["d"]) {
        p.vx += MOVE_SPEED * 0.3;
        if (p.vx > MOVE_SPEED) p.vx = MOVE_SPEED;
        p.facing = 1;
      } else {
        p.vx *= FRICTION;
        if (Math.abs(p.vx) < 0.1) p.vx = 0;
      }

      // Jump
      if ((keys["ArrowUp"] || keys[" "] || keys["w"]) && onGround) {
        p.vy = JUMP_VEL;
        p.grounded = false;
        p.squash = -4;
      }

      // Physics
      p.vy += GRAVITY;
      if (p.vy > 12) p.vy = 12;
      p.x += p.vx;
      p.y += p.vy;

      // Squash recovery
      p.squash += (0 - p.squash) * 0.2;

      // World bounds
      if (p.x < 0) p.x = 0;
      if (p.x > WORLD_W - PLAYER_W) p.x = WORLD_W - PLAYER_W;
      if (p.y > H + 40) {
        // Fell off world - respawn
        p.x = 80;
        p.y = H - 80;
        p.vx = 0;
        p.vy = 0;
      }

      // Platform collision
      p.grounded = false;
      const pb = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H };
      for (const plat of PLATFORMS) {
        const pl = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
        // AABB overlap
        if (
          pb.x < pl.x + pl.w &&
          pb.x + pb.w > pl.x &&
          pb.y < pl.y + pl.h &&
          pb.y + pb.h > pl.y
        ) {
          // Determine overlap on each axis
          const overlapX = Math.min(pb.x + pb.w - pl.x, pl.x + pl.w - pb.x);
          const overlapY = Math.min(pb.y + pb.h - pl.y, pl.y + pl.h - pb.y);

          if (overlapX < overlapY) {
            // Horizontal collision
            if (pb.x + pb.w / 2 < pl.x + pl.w / 2) {
              p.x = pl.x - pb.w;
            } else {
              p.x = pl.x + pl.w;
            }
            p.vx = 0;
          } else {
            // Vertical collision
            if (pb.y + pb.h / 2 < pl.y + pl.h / 2) {
              // Landing on top
              p.y = pl.y - pb.h;
              p.vy = 0;
              p.grounded = true;
              if (p.squash > -2) p.squash = 3;
            } else {
              // Hitting from below
              p.y = pl.y + pl.h;
              p.vy = 0;
              // Check for question block hit
              for (const obj of s.objects) {
                if (
                  obj.type === "qblock" && !obj.hit &&
                  Math.abs(obj.x + obj.w / 2 - (pl.x + pl.w / 2)) < 20 &&
                  Math.abs(obj.y - (pl.y + pl.h)) < 4
                ) {
                  obj.hit = true;
                  obj.bounceT = 12;
                  s.shakeAmount = 6;
                  spawnParticles(obj.x + obj.w / 2, obj.y, [
                    C.particleCyan, C.particleGreen, C.particleGold, C.particleAmber,
                  ]);
                }
              }
            }
          }
        }
      }

      // Animation
      if (Math.abs(p.vx) > 0.1 && p.grounded) {
        p.animTimer += dt;
        if (p.animTimer > 8) {
          p.animTimer = 0;
          p.animFrame = (p.animFrame + 1) % 2;
        }
      } else if (p.grounded) {
        p.animFrame = 0;
        p.animTimer = 0;
      }

      // Star collection
      for (const star of s.stars) {
        if (star.collected) continue;
        const dx = p.x + PLAYER_W / 2 - (star.x + 5);
        const dy = p.y + PLAYER_H / 2 - (star.y + 5);
        if (Math.abs(dx) < 13 && Math.abs(dy) < 14) {
          star.collected = true;
          s.starCount++;
          spawnParticles(star.x + 5, star.y + 5, [C.starGold, C.particleCyan, C.particleGreen]);
          // Achievement check
          if (s.starCount === s.totalStars && !s.achievement) {
            s.achievement = { text: "ALL STARS COLLECTED! ⭐ LEGEND!", timer: 180 };
          } else if (s.starCount === Math.floor(s.totalStars * 0.5) && !s.achievement) {
            s.achievement = { text: "Halfway there! Keep going! ⭐", timer: 120 };
          } else if (s.starCount === 5 && !s.achievement) {
            s.achievement = { text: "5 stars! You're a collector! ⭐", timer: 120 };
          } else if (s.starCount === 15 && !s.achievement) {
            s.achievement = { text: "15 stars! So close to greatness! ⭐", timer: 120 };
          }
        }
      }

      // Landing dust
      if (p.grounded && !s.landedThisFrame && p.vy > 3) {
        s.landedThisFrame = true;
        for (let i = 0; i < 6; i++) {
          s.particles.push({
            x: p.x + 2 + Math.random() * 10, y: p.y + PLAYER_H,
            vx: (Math.random() - 0.5) * 1.5, vy: -(Math.random() * 2 + 0.5),
            life: 12 + Math.random() * 8, maxLife: 20,
            color: C.dirtDark, size: 2 + Math.random() * 2,
          });
        }
      }
      if (!p.grounded) s.landedThisFrame = false;

      // Achievement timer
      if (s.achievement) {
        s.achievement.timer -= dt / 16.67;
        if (s.achievement.timer <= 0) s.achievement = null;
      }

      // Screen shake decay
      if (s.shakeAmount > 0.1) s.shakeAmount *= 0.85;
      else s.shakeAmount = 0;

      // Camera - lerp toward player with lookahead
      const lookAhead = p.vx * 30;
      s.camera.targetX = p.x - W / 2 + PLAYER_W / 2 + lookAhead;
      s.camera.targetX = Math.max(0, Math.min(WORLD_W - W, s.camera.targetX));
      s.camera.x += (s.camera.targetX - s.camera.x) * 0.08;

      // Nearest object
      nearestObjRef.current = getNearestObj(p.x, p.y);
      s.nearestObj = nearestObjRef.current;
      s.promptShown = s.nearestObj !== null && !s.dialog.active;
      // Hide prompt for hit qblocks
      if (s.nearestObj?.type === "qblock" && s.nearestObj.hit) {
        s.promptShown = false;
        s.nearestObj = null;
      }

      // Object animations
      for (const obj of s.objects) {
        if (obj.bounceT > 0) obj.bounceT -= 1 * (dt / 16.67);
      }

      // Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.1;
        pt.life -= 1 * (dt / 16.67);
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // Dialog typewriter
      if (s.dialog.active) {
        s.dialog.timer += DIALOG_SPEED * (dt / 16.67);
        const targetLen = s.dialog.lines[s.dialog.currentLine]?.length ?? 0;
        s.dialog.charIdx = Math.min(targetLen, Math.floor(s.dialog.timer));
      }

      s.time += dt;
    };

    // ─── Render ───
    const render = () => {
      const shakeX = s.shakeAmount > 0.1 ? (Math.random() - 0.5) * s.shakeAmount : 0;
      const shakeY = s.shakeAmount > 0.1 ? (Math.random() - 0.5) * s.shakeAmount * 0.5 : 0;
      const cx = Math.round(s.camera.x + shakeX);

      // Apply camera vertical shake
      offCtx.save();
      offCtx.translate(0, shakeY);

      // Clear
      offCtx.fillStyle = C.skyTop;
      offCtx.fillRect(0, 0, W, H);

      // Sky gradient
      const skyGrad = offCtx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, C.skyTop);
      skyGrad.addColorStop(0.7, C.skyBot);
      skyGrad.addColorStop(1, "#c8dcf8");
      offCtx.fillStyle = skyGrad;
      offCtx.fillRect(0, 0, W, H);

      // ── Background layers (parallax) ──
      // Far mountains (0.1x)
      drawParallaxMountains(offCtx, cx * 0.1, C.mountainFar, 40, 80);
      // Near mountains (0.25x)
      drawParallaxMountains(offCtx, cx * 0.25, C.mountainNear, 30, 60);
      // Hills (0.4x)
      drawParallaxHills(offCtx, cx * 0.4, C.hill, C.hillLight, 20, 40);
      // Clouds (0.15x)
      drawClouds(offCtx, cx * 0.15, s.time);

      // ── Decorative elements ──
      drawBushes(offCtx, cx);
      drawFlowers(offCtx, cx, s.time);
      drawWater(offCtx, cx, s.time);
      drawTrees(offCtx, cx);
      drawBirds(offCtx, cx, s.time);

      // ── Zone Banners ──
      drawZoneBanners(offCtx, cx);

      // ── Platforms ──
      for (const plat of PLATFORMS) {
        const sx = plat.x - cx;
        if (sx + plat.w < -16 || sx > W + 16) continue;

        if (plat.type === "ground") {
          drawGroundTile(offCtx, sx, plat.y, plat.w, plat.h);
        } else if (plat.type === "brick") {
          drawBrickTile(offCtx, sx, plat.y, plat.w, plat.h);
        } else if (plat.type === "question") {
          drawQuestionTile(offCtx, sx, plat.y, plat.w, plat.h, s.time);
        }
      }

      // ── Objects ──
      for (const obj of s.objects) {
        const ox = obj.x - cx;
        if (ox + obj.w < -32 || ox > W + 32) continue;
        const oy = obj.y;
        const bounce = obj.bounceT > 0 ? -Math.sin(obj.bounceT * 0.5) * 8 : 0;

        if (obj.type === "sign") {
          drawSign(offCtx, ox, oy + bounce, obj.hit);
        } else if (obj.type === "qblock") {
          drawQBlockObj(offCtx, ox, oy + bounce, obj.hit, s.time);
        } else if (obj.type === "building") {
          drawBuilding(offCtx, ox, oy, obj.w, obj.h, obj.title || "", obj.hit, s.time);
        } else if (obj.type === "mailbox") {
          drawMailbox(offCtx, ox, oy);
        } else if (obj.type === "trophy") {
          drawTrophy(offCtx, ox, oy + bounce, s.time);
        } else if (obj.type === "flag") {
          drawFlag(offCtx, ox, oy, s.time);
        }
      }

      // ── Star rendering (from stars array, not objects) ──
      for (const star of s.stars) {
        if (star.collected) continue;
        const sx = star.x - cx;
        if (sx < -16 || sx > W + 16) continue;
        drawStar(offCtx, sx, star.y, false, s.time);
      }

      // ── Interaction prompt ──
      if (s.promptShown && s.nearestObj) {
        const hint = s.nearestObj.hint || "Press ↑";
        const ox = s.nearestObj.x + s.nearestObj.w / 2 - cx;
        const oy = s.nearestObj.y - 18 + Math.sin(s.time * 0.05) * 2;
        offCtx.fillStyle = C.dialogBg;
        const tw = hint.length * 6 + 8;
        offCtx.fillRect(Math.round(ox - tw / 2), Math.round(oy), tw, 12);
        offCtx.fillStyle = C.dialogBorder;
        offCtx.fillRect(Math.round(ox - tw / 2), Math.round(oy), tw, 2);
        offCtx.fillRect(Math.round(ox - tw / 2), Math.round(oy + 10), tw, 2);
        offCtx.fillRect(Math.round(ox - tw / 2), Math.round(oy), 2, 12);
        offCtx.fillRect(Math.round(ox + tw / 2 - 2), Math.round(oy), 2, 12);
        offCtx.fillStyle = C.dialogText;
        offCtx.font = "6px monospace";
        offCtx.fillText(hint, Math.round(ox - tw / 2 + 5), Math.round(oy + 9));
      }

      // ── Player ──
      const px = p.x - cx;
      const py = p.y + p.squash;
      const spriteKey = !p.grounded ? "jump" : (Math.abs(p.vx) > 0.3 ? (p.animFrame === 0 ? "walk1" : "walk2") : "idle");
      drawSprite(offCtx, SPRITE[spriteKey], Math.round(px), Math.round(py), p.facing === -1, 1);

      // ── Particles ──
      for (const pt of s.particles) {
        const alpha = Math.max(0, pt.life / pt.maxLife);
        offCtx.globalAlpha = alpha;
        drawRect(offCtx, pt.x - cx, pt.y, pt.size, pt.size, pt.color);
        offCtx.globalAlpha = 1;
      }

      // ── HUD: Star counter ──
      offCtx.fillStyle = "rgba(0,0,0,0.5)";
      offCtx.fillRect(W - 52, 4, 48, 14);
      offCtx.fillStyle = C.starGold;
      offCtx.font = "bold 7px monospace";
      offCtx.fillText(`⭐ ${s.starCount}/${s.totalStars}`, W - 48, 14);

      // ── Achievement popup ──
      if (s.achievement) {
        const alpha = Math.min(1, s.achievement.timer / 30);
        offCtx.globalAlpha = alpha;
        const ax = W / 2 - 80;
        const ay = 20;
        offCtx.fillStyle = C.dialogBg;
        offCtx.fillRect(ax, ay, 160, 22);
        offCtx.fillStyle = C.starGold;
        offCtx.fillRect(ax, ay, 160, 2);
        offCtx.fillRect(ax, ay + 20, 160, 2);
        offCtx.fillRect(ax, ay, 2, 22);
        offCtx.fillRect(ax + 158, ay, 2, 22);
        offCtx.fillStyle = C.dialogText;
        offCtx.font = "bold 7px monospace";
        const atw = s.achievement.text.length * 4;
        offCtx.fillText(s.achievement.text, W / 2 - atw / 2, ay + 15);
        offCtx.globalAlpha = 1;
      }

      // ── Dialog overlay ──
      if (s.dialog.active) {
        drawDialog(offCtx, s.dialog);
      }

      // ── Zone minimap indicator ──
      drawMinimap(offCtx, cx, WORLD_W);

      // Restore camera transform
      offCtx.restore();

      // ── Upscale to display canvas ──
      ctx.imageSmoothingEnabled = false;
      const scale = canvas.width / W;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

      // ── CRT scanlines (subtle) ──
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      for (let sy = 0; sy < canvas.height; sy += 3) {
        ctx.fillRect(0, sy, canvas.width, 1);
      }

      // ── T command hint (top-right) ──
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = `${Math.max(10, scale * 3.5)}px "JetBrains Mono", monospace`;
      ctx.fillText("Press T for terminal", canvas.width - scale * 52, scale * 6);
    };

    // ─── Game loop ───
    const loop = (timestamp: number) => {
      if (lastTime === 0) lastTime = timestamp;
      let dt = timestamp - lastTime;
      lastTime = timestamp;
      if (dt > 50) dt = 16.67; // cap delta to avoid spiral of death

      update(dt);
      render();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [getNearestObj, interact, spawnParticles]);

  const [showTitle, setShowTitle] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-hide title after 5s or on first interaction
  useEffect(() => {
    if (!showTitle) return;
    const timer = setTimeout(() => setShowTitle(false), 5000);
    const onInteract = () => setShowTitle(false);
    window.addEventListener("keydown", onInteract, { once: true });
    window.addEventListener("touchstart", onInteract, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("touchstart", onInteract);
    };
  }, [showTitle]);

  // Touch handlers
  const touchRef = useRef({ left: false, right: false, jump: false, interact: false });

  const makeTouchHandler = (action: string, pressed: boolean) => (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const s = stateRef.current;
    if (action === "jump" && pressed) {
      if (s.dialog.active) {
        if (s.dialog.currentLine < s.dialog.lines.length - 1) {
          s.dialog.currentLine++;
          s.dialog.charIdx = 0;
          s.dialog.timer = 0;
        } else {
          s.dialog.active = false;
        }
      } else {
        s.keys["ArrowUp"] = true;
        interact();
      }
    } else if (action === "jump" && !pressed) {
      s.keys["ArrowUp"] = false;
      s.keys[" "] = false;
    } else if (action === "left") {
      s.keys["ArrowLeft"] = pressed;
    } else if (action === "right") {
      s.keys["ArrowRight"] = pressed;
    }
    setShowTitle(false);
  };

  const p = stateRef.current.player;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ imageRendering: "pixelated", cursor: isMobile ? "default" : "none" }}
      />

      {/* Title overlay */}
      {showTitle && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 pointer-events-none">
          <div className="font-mono text-center px-4">
            <h1
              className="text-[#00fff5] font-bold tracking-wider mb-4"
              style={{
                fontSize: "clamp(1.5rem, 6vw, 3.5rem)",
                textShadow: "0 0 20px rgba(0,255,245,0.5), 0 0 60px rgba(0,255,245,0.2)",
              }}
            >
              NEEL'S WORLD
            </h1>
            <p
              className="text-[#c5c8c6] mb-8"
              style={{ fontSize: "clamp(0.7rem, 2vw, 1.2rem)" }}
            >
              A pixel adventure portfolio
            </p>
            <p
              className="text-[#39ff14] animate-pulse"
              style={{ fontSize: "clamp(0.6rem, 1.5vw, 0.9rem)" }}
            >
              Press any key or tap to start
            </p>
          </div>
        </div>
      )}

      {/* Mobile touch controls */}
      {isMobile && (
        <>
          {/* D-pad left */}
          <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="w-8 h-8" />
              <button
                className="w-14 h-14 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center active:bg-[#00fff5]/30 active:border-[#00fff5]/50 transition-colors"
                onTouchStart={makeTouchHandler("jump", true)}
                onTouchEnd={makeTouchHandler("jump", false)}
                aria-label="Jump"
              >
                <span className="text-white/70 text-xl">▲</span>
              </button>
              <div className="w-8 h-8" />
            </div>
            <div className="flex gap-2">
              <button
                className="w-14 h-14 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center active:bg-[#00fff5]/30 active:border-[#00fff5]/50 transition-colors"
                onTouchStart={makeTouchHandler("left", true)}
                onTouchEnd={makeTouchHandler("left", false)}
                aria-label="Move left"
              >
                <span className="text-white/70 text-xl">◀</span>
              </button>
              <div className="w-14 h-14" />
              <button
                className="w-14 h-14 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center active:bg-[#00fff5]/30 active:border-[#00fff5]/50 transition-colors"
                onTouchStart={makeTouchHandler("right", true)}
                onTouchEnd={makeTouchHandler("right", false)}
                aria-label="Move right"
              >
                <span className="text-white/70 text-xl">▶</span>
              </button>
            </div>
          </div>

          {/* Jump button (right side) */}
          <button
            className="absolute bottom-6 right-6 z-20 w-16 h-16 rounded-full bg-[#39ff14]/20 border-2 border-[#39ff14]/40 flex items-center justify-center active:bg-[#39ff14]/40 active:scale-95 transition-all"
            onTouchStart={makeTouchHandler("jump", true)}
            onTouchEnd={makeTouchHandler("jump", false)}
            aria-label="Jump"
          >
            <span className="text-[#39ff14] text-sm font-bold font-mono">JUMP</span>
          </button>
        </>
      )}
    </div>
  );
};

// ─────────────────────── RENDER HELPERS ───────────────────────

function drawParallaxMountains(
  ctx: CanvasRenderingContext2D,
  offset: number, color: string, baseY: number, height: number,
) {
  const period = 300;
  const startX = -(offset % period);
  ctx.fillStyle = color;
  for (let x = startX - period; x < W + period; x += period) {
    const h = height + Math.sin(x * 0.008) * 20 + Math.sin(x * 0.015) * 15;
    ctx.beginPath();
    ctx.moveTo(x - 40, baseY + height);
    ctx.lineTo(x + period / 2, baseY + height - h);
    ctx.lineTo(x + period + 40, baseY + height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawParallaxHills(
  ctx: CanvasRenderingContext2D,
  offset: number, color: string, highlight: string, baseY: number, height: number,
) {
  const period = 200;
  const startX = -(offset % period);
  ctx.fillStyle = color;
  for (let x = startX - period; x < W + period; x += period) {
    const h = height + Math.sin(x * 0.01) * 10;
    ctx.beginPath();
    ctx.ellipse(x + period / 2, baseY + height, period / 2 + 10, h, 0, Math.PI, 0);
    ctx.fill();
  }
}

function drawClouds(ctx: CanvasRenderingContext2D, offset: number, time: number) {
  const cloudPositions = [50, 200, 380, 550, 720, 900, 1100, 1300, 1550, 1800, 2050];
  const t = time * 0.01;
  for (const cx of cloudPositions) {
    const x = cx - offset + Math.sin(t + cx * 0.05) * 5;
    if (x < -60 || x > W + 60) continue;
    const y = 20 + Math.sin(cx * 0.3) * 15;
    ctx.fillStyle = C.cloud;
    ctx.fillRect(Math.round(x), Math.round(y + 8), 48, 10);
    ctx.fillRect(Math.round(x + 8), Math.round(y), 32, 18);
    ctx.fillRect(Math.round(x + 16), Math.round(y - 6), 16, 10);
  }
}

function drawBushes(ctx: CanvasRenderingContext2D, cx: number) {
  const positions = [100, 350, 700, 950, 1300, 1650, 2200, 2700, 3100, 3600, 3950];
  for (const bx of positions) {
    const x = bx - cx;
    if (x < -20 || x > W + 20) continue;
    const y = H - 36;
    ctx.fillStyle = C.bushGreen;
    ctx.fillRect(Math.round(x), Math.round(y - 6), 16, 8);
    ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 8, 6);
    ctx.fillRect(Math.round(x + 8), Math.round(y - 4), 10, 6);
    ctx.fillStyle = C.bushLight;
    ctx.fillRect(Math.round(x + 2), Math.round(y - 8), 6, 3);
    ctx.fillRect(Math.round(x + 10), Math.round(y - 6), 4, 3);
  }
}

function drawFlowers(ctx: CanvasRenderingContext2D, cx: number, time: number) {
  const positions = [180, 550, 880, 1450, 1950, 2550, 3050, 3750];
  const t = time * 0.003;
  for (const fx of positions) {
    const x = fx - cx + Math.sin(t + fx) * 0.5;
    if (x < -8 || x > W + 8) continue;
    const y = H - 34;
    // Stem
    ctx.fillStyle = C.grassDark;
    ctx.fillRect(Math.round(x + 3), Math.round(y - 4), 2, 6);
    // Petals
    ctx.fillStyle = fx % 200 < 100 ? C.flowerPink : C.flowerYellow;
    ctx.fillRect(Math.round(x), Math.round(y - 6), 2, 2);
    ctx.fillRect(Math.round(x + 6), Math.round(y - 6), 2, 2);
    ctx.fillRect(Math.round(x + 3), Math.round(y - 9), 2, 2);
    ctx.fillRect(Math.round(x + 3), Math.round(y - 3), 2, 2);
    // Center
    ctx.fillStyle = C.starGold;
    ctx.fillRect(Math.round(x + 3), Math.round(y - 6), 2, 2);
  }
}

function drawWater(ctx: CanvasRenderingContext2D, cx: number, time: number) {
  // Small decorative pond at x ~2400
  const wx = 2380 - cx;
  if (wx > -60 && wx < W + 60) {
    const wy = H - 34;
    ctx.fillStyle = C.water;
    ctx.fillRect(Math.round(wx), Math.round(wy), 48, 6);
    ctx.fillStyle = C.waterLight;
    const shimmer = Math.sin(time * 0.03) * 3;
    ctx.fillRect(Math.round(wx + 4 + shimmer), Math.round(wy + 1), 8, 2);
    ctx.fillRect(Math.round(wx + 24 - shimmer), Math.round(wy + 1), 8, 2);
  }
}

function drawTrees(ctx: CanvasRenderingContext2D, cx: number) {
  const positions = [
    { x: 80, h: 30 }, { x: 420, h: 26 }, { x: 680, h: 34 },
    { x: 1050, h: 28 }, { x: 1500, h: 32 }, { x: 1850, h: 28 },
    { x: 2450, h: 30 }, { x: 2800, h: 34 }, { x: 3400, h: 28 },
    { x: 3900, h: 30 },
  ];
  for (const { x, h } of positions) {
    const tx = x - cx;
    if (tx < -40 || tx > W + 40) continue;
    const ty = H - 32;
    drawTree(ctx, tx, ty, h);
  }
}

function drawBirds(ctx: CanvasRenderingContext2D, cx: number, time: number) {
  const birds = [
    { baseX: 200, y: 40, speed: 0.3, amplitude: 15 },
    { baseX: 600, y: 55, speed: -0.4, amplitude: 12 },
    { baseX: 1000, y: 35, speed: 0.25, amplitude: 18 },
    { baseX: 1500, y: 50, speed: -0.35, amplitude: 14 },
    { baseX: 2000, y: 42, speed: 0.3, amplitude: 16 },
    { baseX: 2800, y: 48, speed: -0.28, amplitude: 13 },
    { baseX: 3500, y: 38, speed: 0.32, amplitude: 15 },
  ];
  for (const bird of birds) {
    const bx = bird.baseX + time * bird.speed - cx;
    // Wrap around
    const wrappedX = ((bx % (W + 120)) + W + 120) % (W + 120) - 60;
    if (wrappedX < -20 || wrappedX > W + 20) continue;
    const by = bird.y + Math.sin(time * 0.02 + bird.baseX * 0.01) * bird.amplitude;
    // Simple V-shaped bird
    ctx.fillStyle = "#1a1a3a";
    const sx = Math.round(wrappedX);
    const sy = Math.round(by);
    // Left wing
    ctx.fillRect(sx, sy, 3, 1);
    ctx.fillRect(sx + 1, sy - 1, 1, 1);
    ctx.fillRect(sx + 2, sy - 2, 1, 1);
    // Right wing
    ctx.fillRect(sx + 4, sy, 3, 1);
    ctx.fillRect(sx + 5, sy - 1, 1, 1);
    ctx.fillRect(sx + 4, sy - 2, 1, 1);
    // Body
    ctx.fillRect(sx + 3, sy + 1, 1, 1);
  }
}

function drawGroundTile(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
) {
  // Grass top
  ctx.fillStyle = C.grass;
  ctx.fillRect(Math.round(x), Math.round(y), w, 8);
  ctx.fillStyle = C.grassDark;
  ctx.fillRect(Math.round(x), Math.round(y), w, 2);
  // Dirt
  ctx.fillStyle = C.dirt;
  ctx.fillRect(Math.round(x), Math.round(y + 8), w, h - 8);
  // Dirt texture lines
  ctx.fillStyle = C.dirtDark;
  for (let dx = 0; dx < w; dx += TILE) {
    ctx.fillRect(Math.round(x + dx + 4), Math.round(y + 12), 2, 2);
    ctx.fillRect(Math.round(x + dx + 10), Math.round(y + 20), 2, 2);
    ctx.fillRect(Math.round(x + dx + 6), Math.round(y + 26), 2, 2);
  }
}

function drawBrickTile(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
) {
  ctx.fillStyle = C.brick;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
  ctx.fillStyle = C.brickDark;
  // Brick pattern
  for (let dy = 0; dy < h; dy += 8) {
    ctx.fillRect(Math.round(x), Math.round(y + dy + 7), w, 1);
    for (let dx = (dy % 16 === 0 ? 0 : 8); dx < w; dx += 16) {
      ctx.fillRect(Math.round(x + dx + 7), Math.round(y + dy), 1, 8);
    }
  }
  // Highlight top
  ctx.fillStyle = C.brickLight;
  ctx.fillRect(Math.round(x), Math.round(y), w, 2);
}

function drawQuestionTile(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number,
) {
  const pulse = Math.sin(time * 0.05) * 0.1 + 0.9;
  ctx.fillStyle = C.qBlock;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
  ctx.fillStyle = C.qBlockDark;
  ctx.fillRect(Math.round(x), Math.round(y + h - 2), w, 2);
  ctx.fillRect(Math.round(x + w - 2), Math.round(y), 2, h);
  ctx.fillStyle = C.qBlockLight;
  ctx.fillRect(Math.round(x), Math.round(y), w, 2);
  ctx.fillRect(Math.round(x), Math.round(y), 2, h);
  // Question mark
  ctx.fillStyle = C.qMark;
  ctx.globalAlpha = pulse;
  ctx.font = "bold 10px monospace";
  ctx.fillText("?", Math.round(x + 4), Math.round(y + 11));
  ctx.globalAlpha = 1;
}

function drawQBlockObj(
  ctx: CanvasRenderingContext2D, x: number, y: number, hit: boolean, time: number,
) {
  if (hit) {
    ctx.fillStyle = C.brickDark;
    ctx.fillRect(Math.round(x), Math.round(y), 16, 16);
    ctx.fillStyle = C.brick;
    ctx.fillRect(Math.round(x + 1), Math.round(y + 1), 14, 1);
    ctx.fillRect(Math.round(x + 1), Math.round(y + 1), 1, 14);
    return;
  }
  const pulse = Math.sin(time * 0.05) * 0.1 + 0.9;
  ctx.fillStyle = C.qBlock;
  ctx.fillRect(Math.round(x), Math.round(y), 16, 16);
  ctx.fillStyle = C.qBlockDark;
  ctx.fillRect(Math.round(x), Math.round(y + 14), 16, 2);
  ctx.fillRect(Math.round(x + 14), Math.round(y), 2, 16);
  ctx.fillStyle = C.qBlockLight;
  ctx.fillRect(Math.round(x), Math.round(y), 16, 2);
  ctx.fillRect(Math.round(x), Math.round(y), 2, 16);
  ctx.fillStyle = C.qMark;
  ctx.globalAlpha = pulse;
  ctx.font = "bold 10px monospace";
  ctx.fillText("?", Math.round(x + 4), Math.round(y + 11));
  ctx.globalAlpha = 1;
}

function drawSign(
  ctx: CanvasRenderingContext2D, x: number, y: number, _read: boolean,
) {
  // Post
  ctx.fillStyle = C.signWood;
  ctx.fillRect(Math.round(x + 10), Math.round(y + 16), 4, 16);
  // Board
  ctx.fillStyle = C.signFace;
  ctx.fillRect(Math.round(x), Math.round(y), 24, 18);
  ctx.fillStyle = C.signWood;
  ctx.fillRect(Math.round(x), Math.round(y), 24, 3);
  ctx.fillRect(Math.round(x), Math.round(y + 15), 24, 3);
  ctx.fillRect(Math.round(x), Math.round(y), 3, 18);
  ctx.fillRect(Math.round(x + 21), Math.round(y), 3, 18);
  // "!" mark
  ctx.fillStyle = C.signText;
  ctx.font = "bold 8px monospace";
  ctx.fillText("!", Math.round(x + 9), Math.round(y + 14));
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  label: string, _visited: boolean, time: number,
) {
  // Body
  ctx.fillStyle = C.building;
  ctx.fillRect(Math.round(x + 2), Math.round(y + 12), w - 4, h - 12);
  // Roof
  ctx.fillStyle = C.buildingRoof;
  ctx.beginPath();
  ctx.moveTo(Math.round(x), Math.round(y + 12));
  ctx.lineTo(Math.round(x + w / 2), Math.round(y));
  ctx.lineTo(Math.round(x + w), Math.round(y + 12));
  ctx.closePath();
  ctx.fill();
  // Windows (glowing)
  const glow = Math.sin(time * 0.03) * 0.15 + 0.85;
  ctx.globalAlpha = glow;
  ctx.fillStyle = C.buildingWindow;
  ctx.fillRect(Math.round(x + 8), Math.round(y + 20), 10, 10);
  if (w > 48) {
    ctx.fillRect(Math.round(x + w - 18), Math.round(y + 20), 10, 10);
  }
  ctx.globalAlpha = 1;
  // Door
  ctx.fillStyle = C.signWood;
  ctx.fillRect(Math.round(x + w / 2 - 5), Math.round(y + h - 14), 10, 14);
  // Label
  ctx.fillStyle = C.dialogText;
  ctx.font = "5px monospace";
  const short = label.length > 14 ? label.slice(0, 13) + "." : label;
  ctx.fillText(short, Math.round(x + w / 2 - short.length * 1.5), Math.round(y + h + 2));
}

function drawMailbox(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Post
  ctx.fillStyle = C.signWood;
  ctx.fillRect(Math.round(x + 8), Math.round(y + 14), 4, 10);
  // Box
  ctx.fillStyle = C.mailbox;
  ctx.fillRect(Math.round(x), Math.round(y + 2), 20, 12);
  ctx.fillStyle = "#0830d0";
  ctx.fillRect(Math.round(x), Math.round(y + 2), 20, 3);
  // Flag
  ctx.fillStyle = C.mailboxFlag;
  ctx.fillRect(Math.round(x + 16), Math.round(y - 2), 3, 8);
  ctx.fillRect(Math.round(x + 16), Math.round(y - 2), 8, 3);
}

function drawTrophy(
  ctx: CanvasRenderingContext2D, x: number, y: number, time: number,
) {
  const glow = Math.sin(time * 0.04) * 0.2 + 0.8;
  // Base
  ctx.fillStyle = "#683000";
  ctx.fillRect(Math.round(x + 4), Math.round(y + 24), 16, 4);
  ctx.fillRect(Math.round(x + 8), Math.round(y + 28), 8, 4);
  // Stem
  ctx.fillStyle = C.starGold;
  ctx.globalAlpha = glow;
  ctx.fillRect(Math.round(x + 10), Math.round(y + 18), 4, 6);
  // Cup
  ctx.fillRect(Math.round(x + 4), Math.round(y + 6), 16, 12);
  ctx.fillRect(Math.round(x + 2), Math.round(y), 20, 8);
  // Handles
  ctx.fillStyle = C.starGold;
  ctx.fillRect(Math.round(x), Math.round(y + 6), 4, 6);
  ctx.fillRect(Math.round(x + 20), Math.round(y + 6), 4, 6);
  ctx.globalAlpha = 1;
  // Star
  ctx.fillStyle = C.starGold;
  ctx.fillRect(Math.round(x + 10), Math.round(y + 8), 4, 4);
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const wave = Math.sin(time * 0.06) * 1;
  // Pole
  ctx.fillStyle = "#888";
  ctx.fillRect(Math.round(x), Math.round(y), 2, 32);
  // Flag
  ctx.fillStyle = C.flag;
  ctx.beginPath();
  ctx.moveTo(Math.round(x + 2), Math.round(y));
  ctx.lineTo(Math.round(x + 18 + wave), Math.round(y + 6));
  ctx.lineTo(Math.round(x + 2), Math.round(y + 12));
  ctx.closePath();
  ctx.fill();
}

function drawDialog(ctx: CanvasRenderingContext2D, dialog: DialogState) {
  const boxY = H - 56;
  const boxH = 52;
  // Background
  ctx.fillStyle = C.dialogBg;
  ctx.fillRect(4, boxY, W - 8, boxH);
  // Border
  ctx.fillStyle = C.dialogBorder;
  ctx.fillRect(4, boxY, W - 8, 2);
  ctx.fillRect(4, boxY + boxH - 2, W - 8, 2);
  ctx.fillRect(4, boxY, 2, boxH);
  ctx.fillRect(W - 6, boxY, 2, boxH);
  // Inner shadow line
  ctx.fillStyle = "#000020";
  ctx.fillRect(6, boxY + 2, W - 12, 1);
  // Text
  ctx.fillStyle = C.dialogText;
  ctx.font = "7px monospace";
  const line = dialog.lines[dialog.currentLine] || "";
  const shown = line.slice(0, dialog.charIdx);
  // Word wrap
  const maxChars = 52;
  let yOff = 0;
  let i = 0;
  const words = shown.split(" ");
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + word).length > maxChars) {
      ctx.fillText(currentLine.trim(), 12, boxY + 14 + yOff);
      yOff += 10;
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
    i++;
  }
  if (currentLine.trim()) {
    ctx.fillText(currentLine.trim(), 12, boxY + 14 + yOff);
  }
  // Continue hint
  if (dialog.charIdx >= line.length) {
    const blink = Math.sin(Date.now() * 0.005) > 0;
    if (blink) {
      ctx.fillStyle = C.dialogBorder;
      ctx.font = "6px monospace";
      const hint = dialog.currentLine < dialog.lines.length - 1 ? "▼ Next" : "▼ Close";
      ctx.fillText(hint, W - 50, boxY + boxH - 10);
    }
  }
}

function drawZoneBanners(ctx: CanvasRenderingContext2D, cx: number) {
  const zones = [
    { x: 0, label: "WELCOME", color: "#00fff5" },
    { x: 480, label: "ABOUT", color: "#39ff14" },
    { x: 1080, label: "EDUCATION", color: "#ffbf00" },
    { x: 1700, label: "SKILLS", color: "#fc80a8" },
    { x: 2520, label: "EXPERIENCE", color: "#fc4040" },
    { x: 3480, label: "CONTACT", color: "#8080fc" },
  ];
  for (const zone of zones) {
    const zx = zone.x - cx;
    if (zx > -80 && zx < W + 80) {
      ctx.fillStyle = zone.color;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(Math.round(zx), 2, 56, 10);
      ctx.globalAlpha = 0.9;
      ctx.font = "5px monospace";
      ctx.fillText(zone.label, Math.round(zx + 4), Math.round(10));
      ctx.globalAlpha = 1;
    }
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, cx: number, worldW: number) {
  const mmY = 4;
  const mmW = 60;
  const mmH = 4;
  const mmX = W - mmW - 4;
  // Background
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(mmX, mmY, mmW, mmH);
  // Player position indicator
  const indicatorX = mmX + (cx + W / 2) / worldW * mmW;
  ctx.fillStyle = C.green;
  ctx.fillRect(Math.round(indicatorX - 2), mmY, 4, mmH);
  // Zone markers
  const zones = [0, 480, 1080, 1700, 2520, 3480];
  for (const zx of zones) {
    const mx = mmX + zx / worldW * mmW;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(Math.round(mx), mmY, 1, mmH);
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, collected: boolean, time: number) {
  if (collected) return;
  const glow = Math.sin(time * 0.06) * 0.3 + 0.7;
  const bob = Math.sin(time * 0.04 + x * 0.1) * 2;
  const sy = Math.round(y + bob);
  const sx = Math.round(x);
  ctx.globalAlpha = glow;
  // Draw a simple 8-bit star shape
  ctx.fillStyle = C.starGold;
  // Center
  ctx.fillRect(sx + 2, sy + 2, 6, 6);
  // Points (cross shape)
  ctx.fillRect(sx + 4, sy, 2, 2);
  ctx.fillRect(sx + 4, sy + 8, 2, 2);
  ctx.fillRect(sx, sy + 4, 2, 2);
  ctx.fillRect(sx + 8, sy + 4, 2, 2);
  // Diagonal sparkles
  ctx.fillStyle = "#fff8c0";
  ctx.fillRect(sx + 4, sy + 3, 2, 2);
  ctx.globalAlpha = 1;
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  // Trunk
  ctx.fillStyle = C.signWood;
  ctx.fillRect(Math.round(x + h / 2 - 2), Math.round(y - h * 0.7), 4, h * 0.7);
  // Canopy (layered circles in pixel art)
  ctx.fillStyle = C.bushGreen;
  const canopyR = h * 0.5;
  for (let dy = -canopyR; dy <= canopyR; dy += 2) {
    const rowW = Math.sqrt(Math.max(0, canopyR * canopyR - dy * dy)) * 2;
    ctx.fillRect(
      Math.round(x + h / 2 - rowW / 2),
      Math.round(y - h * 0.7 - canopyR + dy),
      Math.round(rowW), 2,
    );
  }
  // Highlights
  ctx.fillStyle = C.bushLight;
  const hlR = canopyR * 0.6;
  for (let dy = -hlR; dy <= hlR; dy += 2) {
    const rowW = Math.sqrt(Math.max(0, hlR * hlR - dy * dy)) * 2;
    ctx.fillRect(
      Math.round(x + h / 2 - rowW / 2 + 2),
      Math.round(y - h * 0.7 - hlR + dy + 2),
      Math.round(rowW * 0.6), 2,
    );
  }
}

export default Game;
