export const INTERNAL_W = 512;
export const INTERNAL_H = 448;
export const TILE = 32;
export const COLS = INTERNAL_W / TILE;
export const ROWS = INTERNAL_H / TILE;

export const GRAVITY = 0.55;
export const FRICTION = 0.82;
export const PLAYER_ACC = 0.4;
export const PLAYER_MAX_SPEED = 2.4;
export const JUMP_VEL = -8.5;
export const TERMINAL_VEL = 10;

export const COLORS = {
  skyTop: '#5c94fc',
  skyMid: '#78a8fc',
  skyBot: '#a4c8fc',

  groundFill: '#c88048',
  groundTop: '#68d870',
  groundTopDark: '#40a848',
  groundSub: '#885830',

  brickBase: '#c88048',
  brickLight: '#e8b068',
  brickDark: '#885830',

  qblockBase: '#f8c040',
  qblockLight: '#f8e070',
  qblockDark: '#c88820',
  qblockMark: '#885830',

  usedBlock: '#787878',
  usedBlockLight: '#a0a0a0',

  pipeBody: '#48b848',
  pipeLight: '#80e080',
  pipeDark: '#288828',

  coinGold: '#f8d060',
  coinLight: '#fcf0b0',
  coinDark: '#d8a828',

  playerHat: '#e83030',
  playerHatDark: '#b01818',
  playerSkin: '#f8c898',
  playerSkinDark: '#e0a870',
  playerShirt: '#e83030',
  playerOverall: '#3858f8',
  playerOverallDark: '#1838c0',
  playerShoe: '#583820',
  playerEye: '#181818',
  playerEyeWhite: '#f8f8f8',

  enemyBody: '#c88048',
  enemyBodyLight: '#e8b068',
  enemyFeet: '#181818',
  enemyEye: '#fcfcfc',
  enemyPupil: '#181818',

  flagPole: '#a0a0a0',
  flagPoleLight: '#d0d0d0',
  flagGreen: '#40a848',

  cloud: '#f8f8f8',
  cloudShadow: '#e0e0e8',

  bush: '#40a848',
  bushLight: '#68d870',
  bushDark: '#288028',

  hill: '#68d870',
  hillDark: '#40a848',
  hillOutline: '#288028',

  particleGold: '#f8d060',
  particleRed: '#e83030',
  particleWhite: '#fcfcfc',

  dialogBg: '#101828',
  dialogBorder: '#f8c040',

  death: '#e83030',

  hudBg: '#101828',
  hudText: '#f8f8f8',
};

export enum TileType {
  AIR = 0,
  GROUND = 1,
  GROUND_TOP = 2,
  GROUND_SUB = 3,
  BRICK = 4,
  QBLOCK = 5,
  QBLOCK_USED = 6,
  PIPE_TL = 7,
  PIPE_TR = 8,
  PIPE_BL = 9,
  PIPE_BR = 10,
  FLAG_POLE = 11,
  FLAG_TOP = 12,
  HARD = 13,
  CASTLE_BRICK = 14,
  BUSH = 15,
}

export type TileMap = TileType[][];

export const SOLID_TILES = new Set([
  TileType.GROUND, TileType.GROUND_TOP, TileType.GROUND_SUB,
  TileType.BRICK, TileType.QBLOCK, TileType.QBLOCK_USED,
  TileType.PIPE_TL, TileType.PIPE_TR, TileType.PIPE_BL, TileType.PIPE_BR,
  TileType.HARD, TileType.CASTLE_BRICK,
]);

export interface GameObject {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlayerState extends GameObject {
  vx: number;
  vy: number;
  onGround: boolean;
  facing: 1 | -1;
  animFrame: number;
  animTimer: number;
  dead: boolean;
  deathTimer: number;
  won: boolean;
  coins: number;
  lives: number;
  invincible: number;
}

export interface EnemyState extends GameObject {
  vx: number;
  vy: number;
  alive: boolean;
  squishTimer: number;
  animFrame: number;
  animTimer: number;
  type: 'goomba' | 'bug';
}

export interface CoinState extends GameObject {
  collected: boolean;
  bobOffset: number;
}

export interface QBlockState extends GameObject {
  used: boolean;
  contains: 'coin' | 'content';
  contentKey?: string;
  bumpTimer: number;
  bumpOffset: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface DialogState {
  active: boolean;
  title: string;
  body: string[];
  charIndex: number;
  lineIndex: number;
  timer: number;
}

export interface TransitionState {
  active: boolean;
  text: string;
  color: string;
  timer: number;
  maxTime: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: number;
  speed: number;
}

export interface CloudDeco {
  x: number;
  y: number;
  w: number;
  speed: number;
}

export interface SectionInfo {
  name: string;
  color: string;
  startX: number;
  endX: number;
}

export const PORTFOLIO_CONTENT: Record<string, { title: string; body: string[] }> = {
  about: {
    title: 'ABOUT NEEL',
    body: [
      'Senior ML Engineer &',
      'Data Scientist.',
      '',
      'I build AI systems that',
      'solve real problems.',
      'Currently exploring the',
      'frontier of LLM agents.',
    ],
  },
  education: {
    title: 'EDUCATION',
    body: [
      'Georgia Tech',
      'MS Computer Science',
      'Machine Learning, 2024',
      '',
      'UT Austin',
      'BS Applied Mathematics',
      '2022',
    ],
  },
  skills: {
    title: 'SKILLS',
    body: [
      'Python, TypeScript,',
      'React, PyTorch,',
      'TensorFlow, SQL,',
      'Docker, AWS, GCP...',
      '',
      'Full-stack ML &',
      'data engineering.',
    ],
  },
  experience: {
    title: 'EXPERIENCE',
    body: [
      'Realtor.com',
      'Transfix (logistics)',
      'Dell Technologies',
      '',
      'ML Engineering,',
      'Data Infrastructure,',
      'Product Analytics.',
    ],
  },
  contact: {
    title: 'CONTACT',
    body: [
      'neel@example.com',
      'github.com/neelpanging',
      'linkedin.com/in/neel',
      '',
      'Always open to cool',
      'projects & collabs!',
    ],
  },
  secret: {
    title: 'SECRET FOUND!',
    body: [
      'You discovered a',
      'hidden block!',
      '',
      'Fun fact: Neel once',
      'trained a model that',
      'could identify cats',
      'with 99.9% accuracy.',
      '(It was just guessing',
      '"cat" every time.)',
    ],
  },
};

export const SECTIONS: SectionInfo[] = [
  { name: 'HELLO WORLD', color: '#e83030', startX: 0, endX: 64 },
  { name: 'EDUCATION', color: '#f8c040', startX: 64, endX: 128 },
  { name: 'SKILLS', color: '#3858f8', startX: 128, endX: 192 },
  { name: 'EXPERIENCE', color: '#68d870', startX: 192, endX: 256 },
  { name: 'CONTACT', color: '#e83030', startX: 256, endX: 320 },
];
