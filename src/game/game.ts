import {
  INTERNAL_W, INTERNAL_H, TILE, COLS, ROWS,
  GRAVITY, FRICTION, PLAYER_ACC, PLAYER_MAX_SPEED, JUMP_VEL, TERMINAL_VEL,
  SOLID_TILES, TileType,
  PlayerState, EnemyState, CoinState, QBlockState,
  Particle, DialogState, Star, CloudDeco, TransitionState,
  PORTFOLIO_CONTENT, SECTIONS,
} from './constants';
import { generateLevel, LevelData } from './level';
import {
  drawBackground, drawTile, drawPlayer, drawEnemy, drawCoin,
  drawParticles, drawHUD, drawDialogBox,
  drawTitleScreen, drawDeathScreen, drawWinScreen,
  drawClouds, drawStarfield, drawScanlines, drawVignette, drawSectionTransition,
} from './render';
import {
  sfxJump, sfxCoin, sfxBlockHit, sfxBump, sfxStomp,
  sfxDeath, sfxWin, sfxPowerUp, sfxDialog, resumeAudio,
} from './audio';

type Scene = 'title' | 'playing' | 'dead' | 'win';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  private animId = 0;
  private lastTime = 0;
  private time = 0;

  private scene: Scene = 'title';
  private deathPause = 0;
  private winPause = 0;

  private keys: Set<string> = new Set();

  private player!: PlayerState;
  private enemies: EnemyState[] = [];
  private coins: CoinState[] = [];
  private qblocks: QBlockState[] = [];
  private particles: Particle[] = [];
  private dialog: DialogState = { active: false, title: '', body: [], charIndex: 0, lineIndex: 0, timer: 0 };
  private transition: TransitionState = { active: false, text: '', color: '', timer: 0, maxTime: 90 };

  private map: TileType[][] = [];
  private levelWidth = 0;
  private camX = 0;
  private camY = 0;
  private sectionName = 'HELLO WORLD';
  private sectionColor = '#e94560';
  private prevSection = '';

  private stars: Star[] = [];
  private clouds: CloudDeco[] = [];

  private levelData!: LevelData;

  private onContentReveal?: (key: string) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.offscreen = document.createElement('canvas');
    this.offscreen.width = INTERNAL_W;
    this.offscreen.height = INTERNAL_H;
    this.offCtx = this.offscreen.getContext('2d')!;
    this.offCtx.imageSmoothingEnabled = false;

    this.setupInput();
    this.generateDecor();
  }

  private setupInput() {
    const handler = (e: KeyboardEvent, down: boolean) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter' ||
          e.key === 'a' || e.key === 'd' || e.key === 'w' ||
          e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
      }
      if (down) {
        this.keys.add(e.key);
      } else {
        this.keys.delete(e.key);
      }

      if (down && e.key === 'Enter') {
        resumeAudio();
        if (this.scene === 'title') {
          this.startGame();
        } else if (this.scene === 'dead' && this.deathPause > 60) {
          this.startGame();
        } else if (this.scene === 'win' && this.winPause > 60) {
          this.startGame();
        }
      }

      if (down && e.key === ' ' && this.scene === 'playing') {
        if (this.dialog.active) {
          this.advanceDialog();
        }
      }
    };

    window.addEventListener('keydown', e => handler(e, true));
    window.addEventListener('keyup', e => handler(e, false));

    this.canvas.addEventListener('click', () => {
      resumeAudio();
      if (this.scene === 'title') {
        this.startGame();
      } else if (this.scene === 'dead' && this.deathPause > 60) {
        this.startGame();
      } else if (this.scene === 'win' && this.winPause > 60) {
        this.startGame();
      }
    });
  }

  private generateDecor() {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * INTERNAL_W * 4,
        y: Math.random() * INTERNAL_H * 0.55,
        size: Math.random() < 0.2 ? 2 : 1,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.04,
      });
    }

    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      this.clouds.push({
        x: Math.random() * INTERNAL_W * 8,
        y: 40 + Math.random() * 160,
        w: 80 + Math.random() * 120,
        speed: 0.02 + Math.random() * 0.04,
      });
    }
  }

  private startGame() {
    this.levelData = generateLevel();
    this.map = this.levelData.map;
    this.levelWidth = this.levelData.totalWidth;

    this.player = {
      x: this.levelData.playerSpawn.x,
      y: this.levelData.playerSpawn.y,
      w: TILE,
      h: TILE,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      animFrame: 0,
      animTimer: 0,
      dead: false,
      deathTimer: 0,
      won: false,
      coins: 0,
      lives: 3,
      invincible: 0,
    };

    this.enemies = this.levelData.enemies.map(e => ({
      x: e.x * TILE,
      y: (e.y - 1) * TILE,
      w: TILE,
      h: TILE,
      vx: e.type === 'bug' ? -0.8 : -0.5,
      vy: 0,
      alive: true,
      squishTimer: 0,
      animFrame: 0,
      animTimer: 0,
      type: e.type,
    }));

    this.coins = this.levelData.coins.map(c => ({
      x: c.x * TILE + 4,
      y: c.y * TILE + 2,
      w: 8,
      h: 12,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
    }));

    this.qblocks = this.levelData.qblocks.map(q => ({
      x: q.x * TILE,
      y: q.y * TILE,
      w: TILE,
      h: TILE,
      used: false,
      contains: q.contains,
      contentKey: q.contentKey,
      bumpTimer: 0,
      bumpOffset: 0,
    }));

    this.particles = [];
    this.dialog = { active: false, title: '', body: [], charIndex: 0, lineIndex: 0, timer: 0 };
    this.transition = { active: false, text: '', color: '', timer: 0, maxTime: 90 };
    this.scene = 'playing';
    this.deathPause = 0;
    this.winPause = 0;
    this.camX = 0;
    this.prevSection = '';
  }

  private advanceDialog() {
    const fullLine = this.dialog.body[this.dialog.lineIndex] || '';
    if (this.dialog.charIndex < fullLine.length) {
      this.dialog.charIndex = fullLine.length;
    } else if (this.dialog.lineIndex < this.dialog.body.length - 1) {
      this.dialog.lineIndex++;
      this.dialog.charIndex = 0;
    } else {
      this.dialog.active = false;
    }
  }

  private spawnParticles(x: number, y: number, count: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + Math.random() * TILE,
        y: y + Math.random() * TILE * 0.5,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 1,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2,
      });
    }
  }

  private isSolid(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.map[0]?.length || ty < 0 || ty >= ROWS) return false;
    return SOLID_TILES.has(this.map[ty][tx]);
  }

  private getTileAt(px: number, py: number): { tx: number; ty: number; tile: TileType } | null {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || tx >= this.map[0]?.length || ty < 0 || ty >= ROWS) return null;
    return { tx, ty, tile: this.map[ty][tx] };
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  destroy() {
    cancelAnimationFrame(this.animId);
  }

  private loop = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 16.667, 3);
    this.lastTime = now;
    this.time = now;

    this.update(dt);
    this.render();

    this.animId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.scene === 'title' || this.scene === 'dead' || this.scene === 'win') {
      if (this.scene === 'dead') this.deathPause += dt;
      if (this.scene === 'win') this.winPause += dt;
      return;
    }

    if (this.dialog.active) {
      this.dialog.timer += dt;
      const fullLine = this.dialog.body[this.dialog.lineIndex] || '';
      if (this.dialog.timer > 3) {
        this.dialog.timer = 0;
        if (this.dialog.charIndex < fullLine.length) {
          this.dialog.charIndex++;
          if (this.dialog.charIndex % 2 === 0) {
            try { sfxDialog(); } catch {}
          }
        }
      }
      return;
    }

    if (this.transition.active) {
      this.transition.timer += dt;
      if (this.transition.timer >= this.transition.maxTime) {
        this.transition.active = false;
      }
      return;
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updateQBlocks(dt);
    this.updateCamera();
    this.updateSection();
    this.checkCoinCollisions();
    this.checkEnemyCollisions();
    this.checkWinCondition();
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    if (p.dead) {
      p.deathTimer += dt;
      if (p.deathTimer > 120) {
        p.lives--;
        if (p.lives <= 0) {
          this.scene = 'dead';
          this.deathPause = 0;
        } else {
          this.respawnPlayer();
        }
      }
      return;
    }

    if (p.won) return;

    if (p.invincible > 0) p.invincible -= dt;

    const left = this.keys.has('ArrowLeft') || this.keys.has('a');
    const right = this.keys.has('ArrowRight') || this.keys.has('d');
    const jump = this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has(' ');

    if (left && !right) {
      p.vx -= PLAYER_ACC * dt;
      p.facing = -1;
    } else if (right && !left) {
      p.vx += PLAYER_ACC * dt;
      p.facing = 1;
    } else {
      p.vx *= FRICTION;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    p.vx = Math.max(-PLAYER_MAX_SPEED, Math.min(PLAYER_MAX_SPEED, p.vx));

    if (jump && p.onGround) {
      p.vy = JUMP_VEL;
      p.onGround = false;
      try { sfxJump(); } catch {}
    }

    if (!p.onGround && !this.keys.has('ArrowUp') && !this.keys.has('w') && !this.keys.has(' ') && p.vy < 0) {
      p.vy *= 0.85;
    }

    p.vy += GRAVITY * dt;
    if (p.vy > TERMINAL_VEL) p.vy = TERMINAL_VEL;

    p.x += p.vx * dt;
    this.resolveCollisionX(p);

    p.y += p.vy * dt;
    p.onGround = false;
    this.resolveCollisionY(p);

    if (p.onGround) {
      if (Math.abs(p.vx) > 0.5) {
        p.animTimer += dt;
        if (p.animTimer > 8) { p.animTimer = 0; p.animFrame = (p.animFrame + 1) % 2; }
      } else {
        p.animFrame = 0;
      }
    }

    if (p.y > INTERNAL_H + TILE) {
      this.killPlayer();
    }
  }

  private resolveCollisionX(p: PlayerState) {
    const left = Math.floor(p.x / TILE);
    const right = Math.floor((p.x + p.w - 1) / TILE);
    const top = Math.floor((p.y + 2) / TILE);
    const bottom = Math.floor((p.y + p.h - 2) / TILE);

    for (let ty = top; ty <= bottom; ty++) {
      if (p.vx < 0 && this.isSolid(left, ty)) {
        p.x = (left + 1) * TILE;
        p.vx = 0;
      }
      if (p.vx > 0 && this.isSolid(right, ty)) {
        p.x = right * TILE - p.w;
        p.vx = 0;
      }
    }
  }

  private resolveCollisionY(p: PlayerState) {
    const left = Math.floor((p.x + 2) / TILE);
    const right = Math.floor((p.x + p.w - 3) / TILE);
    const top = Math.floor(p.y / TILE);
    const bottom = Math.floor((p.y + p.h) / TILE);

    for (let tx = left; tx <= right; tx++) {
      if (p.vy > 0 && this.isSolid(tx, bottom)) {
        p.y = bottom * TILE - p.h;
        p.vy = 0;
        p.onGround = true;
      }
      if (p.vy < 0 && this.isSolid(tx, top)) {
        p.y = (top + 1) * TILE;
        p.vy = 0;
        this.bumpBlock(tx, top);
      }
    }
  }

  private bumpBlock(tx: number, ty: number) {
    if (tx < 0 || tx >= this.map[0]?.length || ty < 0 || ty >= ROWS) return;

    const tile = this.map[ty][tx];

    if (tile === TileType.QBLOCK) {
      this.map[ty][tx] = TileType.QBLOCK_USED;
      const qb = this.qblocks.find(q =>
        Math.floor(q.x / TILE) === tx && Math.floor(q.y / TILE) === ty
      );
      if (qb) {
        qb.used = true;
        qb.bumpTimer = 10;
        qb.bumpOffset = -3;
        if (qb.contains === 'coin') {
          this.player.coins++;
          try { sfxCoin(); } catch {}
          this.spawnParticles(tx * TILE, ty * TILE - TILE, 4,
            ['#f5d060', '#fce898', '#fcfcfc']);
        } else if (qb.contains === 'content' && qb.contentKey) {
          const content = PORTFOLIO_CONTENT[qb.contentKey];
          if (content) {
            this.dialog = {
              active: true,
              title: content.title,
              body: content.body,
              charIndex: 0,
              lineIndex: 0,
              timer: 0,
            };
          }
          try { sfxPowerUp(); } catch {}
        }
      }
      try { sfxBlockHit(); } catch {}
    } else if (tile === TileType.BRICK) {
      this.map[ty][tx] = TileType.AIR;
      this.spawnParticles(tx * TILE, ty * TILE, 6,
        ['#c9925e', '#8b5e3c', '#5c3d2e']);
      try { sfxBump(); } catch {}
    }
  }

  private killPlayer() {
    if (this.player.invincible > 0 || this.player.dead) return;
    this.player.dead = true;
    this.player.vy = -6;
    this.player.vx = 0;
    this.player.deathTimer = 0;
    try { sfxDeath(); } catch {}
  }

  private respawnPlayer() {
    const p = this.player;
    p.x = this.levelData.playerSpawn.x;
    p.y = this.levelData.playerSpawn.y;
    p.vx = 0;
    p.vy = 0;
    p.dead = false;
    p.deathTimer = 0;
    p.invincible = 120;
    p.won = false;
    this.camX = 0;

    this.enemies.forEach(e => { e.alive = true; e.squishTimer = 0; });
    this.coins.forEach(c => { c.collected = false; });
    this.qblocks.forEach(q => { q.used = false; q.bumpTimer = 0; });
    this.particles = [];

    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < this.map[0]?.length; tx++) {
        if (this.map[ty][tx] === TileType.QBLOCK_USED) {
          this.map[ty][tx] = TileType.QBLOCK;
        }
      }
    }
  }

  private updateEnemies(dt: number) {
    this.enemies.forEach(e => {
      if (!e.alive) {
        if (e.squishTimer > 0) e.squishTimer -= dt;
        return;
      }

      if (e.x < this.camX - TILE * 2 || e.x > this.camX + INTERNAL_W + TILE * 2) return;

      e.vy += GRAVITY * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      const left = Math.floor(e.x / TILE);
      const right = Math.floor((e.x + e.w - 1) / TILE);
      const bottom = Math.floor((e.y + e.h) / TILE);

      for (let tx = left; tx <= right; tx++) {
        if (this.isSolid(tx, bottom) && e.vy >= 0) {
          e.y = bottom * TILE - e.h;
          e.vy = 0;
        }
      }

      if (e.vx < 0 && this.isSolid(left, Math.floor((e.y + e.h / 2) / TILE))) {
        e.vx = Math.abs(e.vx);
      }
      if (e.vx > 0 && this.isSolid(right, Math.floor((e.y + e.h / 2) / TILE))) {
        e.vx = -Math.abs(e.vx);
      }

      const below = Math.floor((e.y + e.h + 1) / TILE);
      const belowLeft = Math.floor(e.x / TILE);
      const belowRight = Math.floor((e.x + e.w - 1) / TILE);
      let groundBelow = false;
      for (let tx = belowLeft; tx <= belowRight; tx++) {
        if (this.isSolid(tx, below)) { groundBelow = true; break; }
      }
      if (!groundBelow && e.vy >= 0) {
        const edgeLeft = belowLeft - 1;
        const edgeRight = belowRight + 1;
        if ((e.vx < 0 && !this.isSolid(edgeLeft, below)) ||
            (e.vx > 0 && !this.isSolid(edgeRight, below))) {
          e.vx = -e.vx;
        }
      }

      e.animTimer += dt;
      if (e.animTimer > 15) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }

      if (e.y > INTERNAL_H + TILE) {
        e.alive = false;
      }
    });
  }

  private checkEnemyCollisions() {
    const p = this.player;
    if (p.dead || p.invincible > 0) return;

    this.enemies.forEach(e => {
      if (!e.alive) return;

      const overlapX = p.x < e.x + e.w && p.x + p.w > e.x;
      const overlapY = p.y < e.y + e.h && p.y + p.h > e.y;

      if (overlapX && overlapY) {
        if (p.vy > 0 && p.y + p.h - e.y < TILE * 0.6) {
          e.alive = false;
          e.squishTimer = 30;
          p.vy = -5;
          try { sfxStomp(); } catch {}
          this.spawnParticles(e.x, e.y + TILE - 4, 3, ['#c9925e', '#8b5e3c']);
        } else {
          this.killPlayer();
        }
      }
    });
  }

  private checkCoinCollisions() {
    const p = this.player;
    if (p.dead) return;

    this.coins.forEach(c => {
      if (c.collected) return;
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      const px = p.x + p.w / 2;
      const py = p.y + p.h / 2;
      const dx = px - cx;
      const dy = py - cy;
      if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.8) {
        c.collected = true;
        p.coins++;
        try { sfxCoin(); } catch {}
        this.spawnParticles(c.x, c.y, 2, ['#f5d060', '#fce898']);
      }
    });
  }

  private checkWinCondition() {
    const p = this.player;
    if (p.dead || p.won) return;
    if (p.x > this.levelWidth - TILE * 4) {
      p.won = true;
      try { sfxWin(); } catch {}
      this.scene = 'win';
      this.winPause = 0;
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.15 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateQBlocks(dt: number) {
    this.qblocks.forEach(q => {
      if (q.bumpTimer > 0) {
        q.bumpTimer -= dt;
        q.bumpOffset = Math.sin(q.bumpTimer * 0.6) * -3;
        if (q.bumpTimer <= 0) q.bumpOffset = 0;
      }
    });
  }

  private updateCamera() {
    const targetX = this.player.x - INTERNAL_W / 3;
    this.camX += (targetX - this.camX) * 0.1;
    if (this.camX < 0) this.camX = 0;
    const maxCam = this.levelWidth - INTERNAL_W;
    if (this.camX > maxCam) this.camX = maxCam;
  }

  private updateSection() {
    const playerTileX = Math.floor(this.player.x / TILE);
    for (const s of SECTIONS) {
      if (playerTileX >= s.startX && playerTileX < s.endX) {
        if (this.prevSection !== s.name && this.prevSection !== '') {
          this.transition = { active: true, text: s.name, color: s.color, timer: 0, maxTime: 90 };
        }
        this.sectionName = s.name;
        this.sectionColor = s.color;
        this.prevSection = s.name;
        break;
      }
    }
  }

  private render() {
    const ctx = this.offCtx;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

    if (this.scene === 'title') {
      drawTitleScreen(ctx, this.time, this.stars, this.clouds);
      this.blitToScreen();
      return;
    }

    drawStarfield(ctx, this.stars, this.camX, this.camY, this.time);
    drawBackground(ctx, this.camX, this.camY, this.time);
    drawClouds(ctx, this.clouds, this.camX, this.camY);

    const startCol = Math.floor(this.camX / TILE) - 1;
    const endCol = Math.floor((this.camX + INTERNAL_W) / TILE) + 1;

    for (let row = 0; row < ROWS; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (col >= 0 && col < this.map[0]?.length) {
          const tile = this.map[row][col];
          if (tile !== TileType.AIR) {
            this.qblocks.forEach(q => {
              if (Math.floor(q.x / TILE) === col && Math.floor(q.y / TILE) === row && q.bumpOffset !== 0) {
                drawTile(ctx, tile, col, row);
                return;
              }
            });
            drawTile(ctx, tile, col, row);
          }
        }
      }
    }

    ctx.save();
    ctx.translate(-this.camX, 0);

    this.coins.forEach(c => {
      if (!c.collected) drawCoin(ctx, c, this.time);
    });

    this.enemies.forEach(e => {
      if (e.x + TILE > this.camX - TILE && e.x < this.camX + INTERNAL_W + TILE) {
        drawEnemy(ctx, e, this.time);
      }
    });

    drawPlayer(ctx, this.player, this.time);

    drawParticles(ctx, this.particles);

    ctx.restore();

    drawHUD(ctx, this.player?.coins || 0, this.player?.lives || 0, this.sectionName, this.sectionColor);
    drawDialogBox(ctx, this.dialog, this.time);
    drawScanlines(ctx);
    drawVignette(ctx);
    drawSectionTransition(ctx, this.transition, this.time);

    if (this.scene === 'dead') {
      drawDeathScreen(ctx, this.time);
    }
    if (this.scene === 'win') {
      drawWinScreen(ctx, this.time, this.player?.coins || 0);
    }

    this.blitToScreen();
  }

  private blitToScreen() {
    const displayCtx = this.ctx;
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.fillStyle = '#0a0a1a';
    displayCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const scale = Math.min(
      this.canvas.width / INTERNAL_W,
      this.canvas.height / INTERNAL_H,
    );

    const scaledW = INTERNAL_W * scale;
    const scaledH = INTERNAL_H * scale;
    const offsetX = (this.canvas.width - scaledW) / 2;
    const offsetY = (this.canvas.height - scaledH) / 2;

    displayCtx.drawImage(
      this.offscreen,
      0, 0, INTERNAL_W, INTERNAL_H,
      offsetX, offsetY, scaledW, scaledH,
    );
  }
}
