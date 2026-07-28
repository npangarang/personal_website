import { TileType, TileMap, ROWS, TILE } from './constants';

const CHUNK_WIDTH = 64;

interface ChunkDef {
  tiles: string[];
  coins?: { x: number; y: number }[];
  enemies?: { x: number; y: number; type: 'goomba' | 'bug' }[];
  qblocks?: { x: number; y: number; contains: 'coin' | 'content'; contentKey?: string }[];
}

function parseChunk(lines: string[]): TileMap {
  const map: TileMap = [];
  for (let row = 0; row < ROWS; row++) {
    map[row] = [];
    for (let col = 0; col < CHUNK_WIDTH; col++) {
      map[row][col] = TileType.AIR;
    }
  }

  for (let row = 0; row < lines.length && row < ROWS; row++) {
    for (let col = 0; col < lines[row].length && col < CHUNK_WIDTH; col++) {
      const ch = lines[row][col];
      switch (ch) {
        case '#': map[row][col] = TileType.GROUND; break;
        case '=': map[row][col] = TileType.GROUND_TOP; break;
        case '-': map[row][col] = TileType.GROUND_SUB; break;
        case 'B': map[row][col] = TileType.BRICK; break;
        case '?': map[row][col] = TileType.QBLOCK; break;
        case 'H': map[row][col] = TileType.HARD; break;
        case 'P': map[row][col] = TileType.PIPE_TL; break;
        case 'p': map[row][col] = TileType.PIPE_TR; break;
        case 'L': map[row][col] = TileType.PIPE_BL; break;
        case 'l': map[row][col] = TileType.PIPE_BR; break;
        case 'F': map[row][col] = TileType.FLAG_TOP; break;
        case 'f': map[row][col] = TileType.FLAG_POLE; break;
        case 'C': map[row][col] = TileType.CASTLE_BRICK; break;
        default: break;
      }
    }
  }
  return map;
}

const CHUNK_INTRO: ChunkDef = {
  tiles: [
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '..................?.............?................................',
    '.........B.B.B.B...........B?B..?................................',
    '................................................................',
    '...............................?...........c..c..c...............',
    '..........................................................B?B..B',
    '................................................................',
    '.......==......................................................=',
    '=======--=============....========...=============....=====--===',
    '-------##------------....--------...-------------....----------',
    '-------##------------....--------...-------------....----------',
  ],
  coins: [
    { x: 5, y: 11 }, { x: 6, y: 11 }, { x: 7, y: 11 },
    { x: 24, y: 8 }, { x: 25, y: 8 }, { x: 26, y: 8 },
    { x: 20, y: 6 }, { x: 21, y: 6 }, { x: 22, y: 6 },
    { x: 50, y: 11 },
  ],
  enemies: [
    { x: 28, y: 13, type: 'goomba' },
    { x: 42, y: 13, type: 'goomba' },
  ],
  qblocks: [
    { x: 18, y: 5, contains: 'content', contentKey: 'about' },
    { x: 31, y: 5, contains: 'coin' },
    { x: 36, y: 6, contains: 'coin' },
    { x: 37, y: 6, contains: 'content', contentKey: 'secret' },
  ],
};

const CHUNK_EDUCATION: ChunkDef = {
  tiles: [
    '................................................................',
    '................................................................',
    '.......?..............?...............?...........................',
    '......B?B............B?B.............B?B......?...................',
    '................................................................',
    '......................................BBBB...BB..................',
    '......?.........?.....................?......?...................',
    '.....B?B.......B?B...................B?B....B?B.................',
    '................................................................',
    '..............................?..................................',
    '...................................BB............................',
    '.......=..................?....?................................',
    '==--============..=======BB==BB====..======....===========......',
    '---.............--..........-----..............-----------......',
    '---.............--..........-----..............-----------......',
  ],
  coins: [
    { x: 65, y: 11 }, { x: 66, y: 11 },
    { x: 72, y: 6 }, { x: 73, y: 6 },
    { x: 85, y: 8 }, { x: 86, y: 8 }, { x: 87, y: 8 },
    { x: 100, y: 3 }, { x: 102, y: 3 },
    { x: 115, y: 11 },
  ],
  enemies: [
    { x: 75, y: 13, type: 'goomba' },
    { x: 95, y: 13, type: 'bug' },
    { x: 110, y: 13, type: 'goomba' },
  ],
  qblocks: [
    { x: 67, y: 5, contains: 'content', contentKey: 'education' },
    { x: 80, y: 5, contains: 'coin' },
    { x: 93, y: 5, contains: 'coin' },
    { x: 106, y: 6, contains: 'content', contentKey: 'education' },
  ],
};

const CHUNK_SKILLS: ChunkDef = {
  tiles: [
    '................................................................',
    '................................................................',
    '..............................................?..................',
    '.............................................B?B..........?.....',
    '......?...........?.......................................B?B....',
    '.....B?B.........B?B.....HH...?..?................................',
    '..........................HH..B?BB?B...?.........................',
    '...............?.........................B?B.......?......?......',
    '..............B?B........?..............................B?B.....',
    '....?........................B?B....?.....?........................',
    '...B?B..?.........?........................B?B...B?B.............',
    '.......B?B.......B?B.....HH..........................B?B..B.B.B.',
    '=..................=.....HH......................................',
    '--======.........======..........................................',
    '-------.........-------..........................................',
  ],
  coins: [
    { x: 130, y: 11 }, { x: 131, y: 11 },
    { x: 140, y: 6 }, { x: 142, y: 6 }, { x: 144, y: 6 },
    { x: 155, y: 9 }, { x: 157, y: 9 },
    { x: 160, y: 6 }, { x: 162, y: 6 },
    { x: 175, y: 3 },
  ],
  enemies: [
    { x: 135, y: 13, type: 'bug' },
    { x: 150, y: 13, type: 'goomba' },
    { x: 165, y: 13, type: 'bug' },
  ],
  qblocks: [
    { x: 126, y: 5, contains: 'content', contentKey: 'skills' },
    { x: 145, y: 7, contains: 'coin' },
    { x: 158, y: 5, contains: 'coin' },
    { x: 168, y: 7, contains: 'content', contentKey: 'skills' },
  ],
};

const CHUNK_EXPERIENCE: ChunkDef = {
  tiles: [
    '................................................................',
    '................................................................',
    '..........................?........................................',
    '.........................B?B.......................................',
    '......?..?..........?............................................',
    '.....B?BB?B........B?B....?..?.......?.............................',
    '..........................B?BB?B.....B?B...?..........?...........',
    '............?..?................................B?B....B?B.....?.',
    '...........B?BB?B..............................................B?B',
    '.....?...............................Pp..........................',
    '....B?B...?..?........?..?..........L.l......?....?..............',
    '.........B?BB?B......B?BB?B..................B?BBB?B.....?.......',
    '..=................................=....................B?B......',
    '---.............=======...=======---.....................=.......',
    '---.............-------...------------.....................======',
  ],
  coins: [
    { x: 190, y: 11 }, { x: 191, y: 11 },
    { x: 198, y: 6 }, { x: 200, y: 6 },
    { x: 210, y: 8 }, { x: 212, y: 8 },
    { x: 220, y: 5 }, { x: 222, y: 5 },
    { x: 230, y: 11 }, { x: 232, y: 11 },
  ],
  enemies: [
    { x: 195, y: 13, type: 'goomba' },
    { x: 205, y: 13, type: 'bug' },
    { x: 215, y: 13, type: 'goomba' },
    { x: 225, y: 13, type: 'bug' },
    { x: 235, y: 13, type: 'goomba' },
  ],
  qblocks: [
    { x: 186, y: 5, contains: 'content', contentKey: 'experience' },
    { x: 196, y: 7, contains: 'coin' },
    { x: 208, y: 5, contains: 'coin' },
    { x: 218, y: 5, contains: 'content', contentKey: 'experience' },
    { x: 228, y: 7, contains: 'coin' },
  ],
};

const CHUNK_CONTACT: ChunkDef = {
  tiles: [
    '................................................................',
    '................................................................',
    '................................................................',
    '...............................................CC.CC.............',
    '......?........?...............................CC.CC.............',
    '.....B?B......B?B..........?..................CC.CC..............',
    '................................B?B...........CC.CC..............',
    '........?........?.........F.................CC.CC..............',
    '.......B?B......B?B........f.................CC.CC..............',
    '..........................f..................CC.CC..............',
    '..........?...............f..........................................',
    '.........B?B..............f..........................................',
    '=..................=======f=................................===.===',
    '--=======================--===============================---.---',
    '--=======================--===============================---.---',
  ],
  coins: [
    { x: 248, y: 11 }, { x: 249, y: 11 }, { x: 250, y: 11 },
    { x: 260, y: 8 }, { x: 262, y: 8 },
    { x: 270, y: 5 }, { x: 272, y: 5 },
    { x: 280, y: 11 }, { x: 282, y: 11 }, { x: 284, y: 11 },
    { x: 290, y: 6 }, { x: 292, y: 6 },
    { x: 300, y: 11 }, { x: 301, y: 11 }, { x: 302, y: 11 },
  ],
  enemies: [
    { x: 255, y: 13, type: 'bug' },
    { x: 265, y: 13, type: 'goomba' },
    { x: 275, y: 13, type: 'bug' },
    { x: 285, y: 13, type: 'goomba' },
    { x: 295, y: 13, type: 'bug' },
  ],
  qblocks: [
    { x: 246, y: 5, contains: 'content', contentKey: 'contact' },
    { x: 256, y: 7, contains: 'coin' },
    { x: 268, y: 5, contains: 'coin' },
    { x: 278, y: 5, contains: 'content', contentKey: 'contact' },
  ],
};

export interface LevelData {
  map: TileMap;
  coins: { x: number; y: number }[];
  enemies: { x: number; y: number; type: 'goomba' | 'bug' }[];
  qblocks: { x: number; y: number; contains: 'coin' | 'content'; contentKey?: string }[];
  playerSpawn: { x: number; y: number };
  totalWidth: number;
}

export function generateLevel(): LevelData {
  const chunks: ChunkDef[] = [
    CHUNK_INTRO,
    CHUNK_EDUCATION,
    CHUNK_SKILLS,
    CHUNK_EXPERIENCE,
    CHUNK_CONTACT,
  ];

  const totalColumns = chunks.length * CHUNK_WIDTH;

  const map: TileMap = [];
  for (let row = 0; row < ROWS; row++) {
    map[row] = new Array(totalColumns).fill(TileType.AIR);
  }

  const allCoins: { x: number; y: number }[] = [];
  const allEnemies: { x: number; y: number; type: 'goomba' | 'bug' }[] = [];
  const allQBlocks: { x: number; y: number; contains: 'coin' | 'content'; contentKey?: string }[] = [];

  chunks.forEach((chunk, ci) => {
    const chunkMap = parseChunk(chunk.tiles);
    const offsetX = ci * CHUNK_WIDTH;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < CHUNK_WIDTH; col++) {
        map[row][offsetX + col] = chunkMap[row][col];
      }
    }

    if (chunk.coins) {
      chunk.coins.forEach(c => allCoins.push({ x: c.x + offsetX, y: c.y }));
    }
    if (chunk.enemies) {
      chunk.enemies.forEach(e => allEnemies.push({ ...e, x: e.x + offsetX }));
    }
    if (chunk.qblocks) {
      chunk.qblocks.forEach(q => allQBlocks.push({ ...q, x: q.x + offsetX }));
    }
  });

  return {
    map,
    coins: allCoins,
    enemies: allEnemies,
    qblocks: allQBlocks,
    playerSpawn: { x: 3 * TILE, y: 10 * TILE },
    totalWidth: totalColumns * TILE,
  };
}
