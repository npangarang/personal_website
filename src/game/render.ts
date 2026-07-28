import {
  COLORS, TILE, INTERNAL_W, INTERNAL_H, TileType, COLS, ROWS,
  PlayerState, EnemyState, CoinState, QBlockState,
  Particle, DialogState, Star, CloudDeco, TransitionState,
} from './constants';

export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  camX: number,
  camY: number,
  time: number,
) {
  stars.forEach(s => {
    const sx = s.x - camX * s.speed;
    const sy = s.y;
    if (sx < -10 || sx > INTERNAL_W + 10) return;
    const alpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.002 + s.twinkle));
    const bright = Math.floor(200 + 55 * alpha);
    ctx.fillStyle = `rgb(${bright},${bright},${bright})`;

    if (s.size === 1) {
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    } else if (s.size === 2) {
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    } else {
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
      ctx.fillRect(Math.round(sx) - 1, Math.round(sy) + 1, 1, 1);
      ctx.fillRect(Math.round(sx) + 2, Math.round(sy) + 1, 1, 1);
    }
  });
}

export function drawClouds(
  ctx: CanvasRenderingContext2D,
  clouds: CloudDeco[],
  camX: number,
  camY: number,
) {
  clouds.forEach(c => {
    const cx = c.x - camX * c.speed;
    const cy = c.y;
    if (cx < -c.w || cx > INTERNAL_W + c.w) return;

    const w = c.w;
    const h = w * 0.35;
    ctx.fillStyle = COLORS.cloud;

    ctx.fillRect(cx + 8, cy + h * 0.3, w - 16, h * 0.7);
    ctx.fillRect(cx, cy + h * 0.5, w, h * 0.5);

    ctx.fillRect(cx + w * 0.1, cy + h * 0.05, w * 0.25, h * 0.85);
    ctx.fillRect(cx + w * 0.3, cy - h * 0.05, w * 0.3, h * 0.95);
    ctx.fillRect(cx + w * 0.55, cy + h * 0.1, w * 0.25, h * 0.75);
    ctx.fillRect(cx + w * 0.7, cy + h * 0.15, w * 0.2, h * 0.65);
  });
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  time: number,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, INTERNAL_H);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.45, COLORS.skyMid);
  grad.addColorStop(1, COLORS.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  drawHills(ctx, camX, 0.04, COLORS.hillDark, 0.5);
  drawHills(ctx, camX, 0.07, COLORS.hill, 0.6);

  const groundY = ROWS * TILE - TILE;
  drawBushes(ctx, camX, groundY);
}

function drawHills(ctx: CanvasRenderingContext2D, camX: number, parallax: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    const hx = (i * 140 - camX * parallax) % (INTERNAL_W + 280) - 140;
    const hw = 80 + (i % 3) * 40;
    const hh = 50 + (i % 5) * 18;
    ctx.beginPath();
    ctx.moveTo(hx, INTERNAL_H);
    ctx.quadraticCurveTo(hx + hw * 0.4, INTERNAL_H - hh, hx + hw * 0.5, INTERNAL_H - hh * 0.8);
    ctx.quadraticCurveTo(hx + hw * 0.6, INTERNAL_H - hh, hx + hw, INTERNAL_H);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBushes(ctx: CanvasRenderingContext2D, camX: number, groundY: number) {
  for (let i = 0; i < 10; i++) {
    const bx = (i * 360 + 180 - camX * 0.08) % (INTERNAL_W * 3) - 60;
    ctx.fillStyle = COLORS.bushDark;
    ctx.fillRect(bx + 8, groundY - 20, 20, 22);
    ctx.fillRect(bx, groundY - 14, 36, 16);
    ctx.fillStyle = COLORS.bush;
    ctx.fillRect(bx + 4, groundY - 28, 28, 16);
    ctx.fillRect(bx + 2, groundY - 18, 32, 10);
    ctx.fillStyle = COLORS.bushLight;
    ctx.fillRect(bx + 8, groundY - 32, 16, 8);
    ctx.fillRect(bx + 6, groundY - 24, 20, 8);
  }
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  tx: number,
  ty: number,
) {
  const x = tx * TILE;
  const y = ty * TILE;
  const t = TILE;

  switch (tile) {
    case TileType.GROUND_TOP: {
      ctx.fillStyle = COLORS.groundTop;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = COLORS.groundTopDark;
      ctx.fillRect(x, y + t - 4, t, 4);
      ctx.fillStyle = COLORS.groundFill;
      ctx.fillRect(x + 4, y + 4, 6, 4);
      ctx.fillRect(x + 14, y + 4, 6, 4);
      ctx.fillRect(x + 24, y + 4, 4, 4);
      ctx.fillStyle = COLORS.groundTop;
      ctx.fillRect(x + 2, y + 8, 4, 2);
      ctx.fillRect(x + 18, y + 6, 4, 2);
      break;
    }
    case TileType.GROUND: {
      ctx.fillStyle = COLORS.groundFill;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = COLORS.groundSub;
      ctx.fillRect(x, y, t, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(x + 6, y + 8, 4, 4);
      ctx.fillRect(x + 16, y + 18, 6, 4);
      ctx.fillRect(x + 24, y + 6, 4, 6);
      ctx.fillRect(x + 4, y + 20, 4, 3);
      break;
    }
    case TileType.GROUND_SUB: {
      ctx.fillStyle = COLORS.groundSub;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(x + 4, y + 6, 6, 4);
      ctx.fillRect(x + 20, y + 10, 5, 5);
      ctx.fillRect(x + 10, y + 20, 4, 3);
      break;
    }
    case TileType.BRICK: {
      ctx.fillStyle = COLORS.brickBase;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = COLORS.brickDark;
      ctx.fillRect(x, y, t, 2);
      ctx.fillRect(x, y + 16, t, 2);
      ctx.fillRect(x, y, 2, t);
      ctx.fillStyle = COLORS.brickLight;
      ctx.fillRect(x + t - 3, y, 3, t);
      ctx.fillRect(x + 3, y + t - 3, t - 6, 3);
      ctx.fillRect(x + 18, y + 2, t - 18, 2);
      ctx.fillRect(x + 18, y + 18, t - 18, 2);

      ctx.fillStyle = COLORS.brickBase;
      ctx.fillRect(x + 4, y + 3, 12, 12);
      ctx.fillStyle = COLORS.brickLight;
      ctx.fillRect(x + 5, y + 4, 10, 10);
      ctx.fillStyle = COLORS.brickDark;
      ctx.fillRect(x + 7, y + 6, 2, 2);
      ctx.fillRect(x + 12, y + 8, 3, 3);

      ctx.fillRect(x + 19, y + 3, 9, 12);
      ctx.fillStyle = COLORS.brickLight;
      ctx.fillRect(x + 20, y + 4, 7, 10);
      break;
    }
    case TileType.QBLOCK: {
      ctx.fillStyle = COLORS.qblockBase;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = COLORS.qblockDark;
      ctx.fillRect(x, y, t, 3);
      ctx.fillRect(x, y, 3, t);
      ctx.fillStyle = COLORS.qblockLight;
      ctx.fillRect(x + t - 3, y, 3, t);
      ctx.fillRect(x + 3, y + t - 3, t - 6, 3);
      ctx.fillStyle = COLORS.qblockMark;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + t / 2, y + t / 2 + 1);
      ctx.fillStyle = COLORS.qblockLight;
      ctx.fillRect(x + 6, y + 3, 4, 4);
      ctx.fillRect(x + 22, y + 3, 4, 4);
      break;
    }
    case TileType.QBLOCK_USED: {
      ctx.fillStyle = COLORS.usedBlock;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = COLORS.usedBlockLight;
      ctx.fillRect(x + 3, y + 3, t - 6, t - 6);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x + 6, y + 6, 8, 8);
      ctx.fillRect(x + 18, y + 6, 8, 8);
      break;
    }
    case TileType.PIPE_TL: {
      ctx.fillStyle = COLORS.pipeBody;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = COLORS.pipeLight;
      ctx.fillRect(x + 4, y, 8, t);
      ctx.fillStyle = COLORS.pipeDark;
      ctx.fillRect(x + t - 7, y, 7, t);
      ctx.fillStyle = COLORS.pipeLight;
      ctx.fillRect(x - 2, y, t + 4, 6);
      ctx.fillRect(x + 4, y + 6, 3, 2);
      ctx.fillRect(x + t - 7, y + 6, 3, 2);
      break;
    }
    case TileType.PIPE_TR: {
      ctx.fillStyle = COLORS.pipeBody;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = COLORS.pipeLight;
      ctx.fillRect(x + 4, y, 8, t);
      ctx.fillStyle = COLORS.pipeDark;
      ctx.fillRect(x + t - 7, y, 7, t);
      ctx.fillStyle = COLORS.pipeLight;
      ctx.fillRect(x - 2, y, t + 4, 6);
      break;
    }
    case TileType.PIPE_BL:
    case TileType.PIPE_BR: {
      ctx.fillStyle = COLORS.pipeBody;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = COLORS.pipeLight;
      ctx.fillRect(x + 4, y, 8, t);
      ctx.fillStyle = COLORS.pipeDark;
      ctx.fillRect(x + t - 7, y, 7, t);
      break;
    }
    case TileType.FLAG_TOP: {
      ctx.fillStyle = COLORS.flagGreen;
      const cx = x + t / 2;
      ctx.beginPath();
      ctx.moveTo(cx, y + 4);
      ctx.lineTo(cx + 22, y + 16);
      ctx.lineTo(cx, y + 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.flagPoleLight;
      ctx.fillRect(cx - 1, y + 4, 4, t + 40);
      ctx.fillStyle = COLORS.flagPole;
      ctx.fillRect(cx + 1, y + 4, 2, t + 40);
      const ballX = cx + 1, ballY = y + 2;
      ctx.fillStyle = COLORS.flagPoleLight;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case TileType.FLAG_POLE: {
      ctx.fillStyle = COLORS.flagPole;
      ctx.fillRect(x + t / 2 - 2, y, 3, t);
      ctx.fillStyle = COLORS.flagPoleLight;
      ctx.fillRect(x + t / 2 - 1, y, 2, t);
      break;
    }
    case TileType.HARD: {
      ctx.fillStyle = '#888888';
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(x + 4, y + 4, t - 8, t - 8);
      ctx.fillStyle = '#666666';
      ctx.fillRect(x, y, t, 3);
      ctx.fillRect(x, y, 3, t);
      break;
    }
    case TileType.CASTLE_BRICK: {
      ctx.fillStyle = '#b8a080';
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = '#d8c8a8';
      ctx.fillRect(x + 3, y + 3, t - 6, t - 6);
      ctx.fillStyle = '#887860';
      ctx.fillRect(x, y, t, 3);
      ctx.fillRect(x, y, 3, t);
      ctx.fillStyle = '#f0e0c8';
      ctx.fillRect(x + 8, y + 8, 8, 8);
      ctx.fillRect(x + 20, y + 8, 6, 8);
      break;
    }
  }
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: PlayerState,
  time: number,
) {
  const { x, y, facing, animFrame, dead, invincible } = p;

  if (invincible > 0 && Math.floor(time / 60) % 2 === 0) return;

  ctx.save();
  if (facing === -1) {
    ctx.translate(x + TILE, 0);
    ctx.scale(-1, 1);
  }

  const px = facing === 1 ? x : 0;
  const py = y;

  if (dead) {
    ctx.fillStyle = COLORS.playerHat;
    ctx.fillRect(px + 6, py, 22, 8);
    ctx.fillStyle = COLORS.playerSkin;
    ctx.fillRect(px + 4, py + 8, 26, 12);
    ctx.fillStyle = COLORS.playerEye;
    ctx.fillRect(px + 8, py + 10, 5, 5);
    ctx.fillRect(px + 22, py + 10, 5, 5);
    ctx.fillStyle = COLORS.playerOverall;
    ctx.fillRect(px + 4, py + 20, 26, TILE - 20);
    ctx.fillStyle = COLORS.playerShoe;
    ctx.fillRect(px + 2, py + TILE - 4, 14, 4);
    ctx.fillRect(px + 18, py + TILE - 4, 14, 4);
    ctx.restore();
    return;
  }

  const bob = p.onGround && animFrame === 1 ? 2 : 0;

  ctx.fillStyle = COLORS.playerHatDark;
  ctx.fillRect(px + 6, py - 2 + bob, 22, 4);
  ctx.fillStyle = COLORS.playerHat;
  ctx.fillRect(px + 6, py + 2 + bob, 22, 6);
  ctx.fillRect(px + 8, py - 2 + bob, 18, 4);

  ctx.fillStyle = COLORS.playerSkin;
  ctx.fillRect(px + 4, py + 8, 26, 12);
  ctx.fillStyle = COLORS.playerSkinDark;
  ctx.fillRect(px + 4, py + 18, 26, 2);

  ctx.fillStyle = COLORS.playerEyeWhite;
  ctx.fillRect(px + 7, py + 10, 7, 7);
  ctx.fillRect(px + 22, py + 10, 7, 7);
  ctx.fillStyle = COLORS.playerEye;
  ctx.fillRect(px + 9, py + 12, 3, 5);
  ctx.fillRect(px + 24, py + 12, 3, 5);

  ctx.fillStyle = COLORS.playerSkin;
  ctx.fillRect(px + 8, py + 18, 3, 2);
  ctx.fillRect(px + 25, py + 18, 3, 2);

  ctx.fillStyle = COLORS.playerShirt;
  ctx.fillRect(px + 4, py + 20, 26, 5);

  ctx.fillStyle = COLORS.playerOverall;
  ctx.fillRect(px + 6, py + 25, 22, 3);
  ctx.fillStyle = COLORS.playerOverallDark;
  ctx.fillRect(px + 6, py + 25, 22, 1);
  ctx.fillRect(px + 14, py + 25, 6, 3);

  const legOff = animFrame === 1 ? 4 : 0;
  ctx.fillStyle = COLORS.playerOverall;
  ctx.fillRect(px + 8, py + 28, 6, 4 - legOff);
  ctx.fillRect(px + 20, py + 28, 6, 4 + legOff);

  ctx.fillStyle = COLORS.playerShoe;
  ctx.fillRect(px + 6, py + 30 + (4 - legOff), 10, 4);
  ctx.fillRect(px + 18, py + 30 + (4 + legOff), 10, 4);

  ctx.restore();
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  e: EnemyState,
  time: number,
) {
  if (!e.alive) {
    if (e.squishTimer > 0) {
      ctx.fillStyle = COLORS.enemyBody;
      ctx.fillRect(e.x + 4, e.y + TILE - 10, TILE - 8, 10);
      ctx.fillStyle = COLORS.enemyFeet;
      ctx.fillRect(e.x + 6, e.y + TILE - 8, TILE - 12, 4);
      ctx.fillStyle = COLORS.enemyEye;
      ctx.fillRect(e.x + 8, e.y + TILE - 8, 6, 4);
      ctx.fillRect(e.x + 20, e.y + TILE - 8, 6, 4);
    }
    return;
  }

  const bobY = Math.sin(time * 0.08 + e.x * 0.01) * 2;

  ctx.fillStyle = COLORS.enemyFeet;
  ctx.fillRect(e.x + 4, e.y + TILE - 6 + bobY, 8, 6);
  ctx.fillRect(e.x + 20, e.y + TILE - 6 + bobY, 8, 6);

  ctx.fillStyle = COLORS.enemyBody;
  ctx.fillRect(e.x + 4, e.y + 4 + bobY, TILE - 8, TILE - 14);
  ctx.fillStyle = COLORS.enemyBodyLight;
  ctx.fillRect(e.x + 4, e.y + 4 + bobY, TILE - 8, 8);

  ctx.fillStyle = COLORS.enemyEye;
  ctx.fillRect(e.x + 8, e.y + 8 + bobY, 7, 7);
  ctx.fillRect(e.x + 18, e.y + 8 + bobY, 7, 7);
  ctx.fillStyle = COLORS.enemyPupil;
  const px = e.vx < 0 ? 1 : 3;
  ctx.fillRect(e.x + 9 + px, e.y + 10 + bobY, 3, 4);
  ctx.fillRect(e.x + 19 + px, e.y + 10 + bobY, 3, 4);

  if (e.type === 'bug') {
    ctx.fillStyle = COLORS.enemyBodyLight;
    ctx.fillRect(e.x + 2, e.y + 6 + bobY, 3, 8);
    ctx.fillRect(e.x + TILE - 5, e.y + 6 + bobY, 3, 8);
    ctx.fillStyle = COLORS.enemyFeet;
    ctx.fillRect(e.x - 1, e.y + 10 + bobY, 3, 6);
    ctx.fillRect(e.x + TILE - 2, e.y + 10 + bobY, 3, 6);
  }
}

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  c: CoinState,
  time: number,
) {
  const bobY = Math.sin(time * 0.04 + c.bobOffset) * 3;
  const cx = c.x + TILE / 2;
  const cy = c.y + TILE / 2 + bobY;
  const w = 12 + Math.abs(Math.sin(time * 0.06 + c.bobOffset)) * 4;

  ctx.fillStyle = COLORS.coinDark;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.coinGold;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w - 4, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.coinLight;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy);
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
) {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  coins: number,
  lives: number,
  sectionName: string,
  sectionColor: string,
) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, 0, INTERNAL_W, 36);
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.coinGold;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('COINS', 12, 18);
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`x${String(coins).padStart(2, '0')}`, 72, 18);

  ctx.fillStyle = COLORS.playerHat;
  ctx.fillText('LIVES', 130, 18);
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`x${lives}`, 182, 18);

  ctx.fillStyle = sectionColor;
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(sectionName, INTERNAL_W - 12, 18);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawDialogBox(
  ctx: CanvasRenderingContext2D,
  dialog: DialogState,
  time: number,
) {
  if (!dialog.active) return;

  const boxW = 400;
  const boxH = 180;
  const boxX = (INTERNAL_W - boxW) / 2;
  const boxY = (INTERNAL_H - boxH) / 2 - 30;

  ctx.fillStyle = COLORS.dialogBg;
  ctx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
  ctx.fillStyle = COLORS.dialogBorder;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#0c1420';
  ctx.fillRect(boxX + 5, boxY + 5, boxW - 10, boxH - 10);

  ctx.fillStyle = COLORS.dialogBorder;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(dialog.title, INTERNAL_W / 2, boxY + 24);

  ctx.fillStyle = '#f0f0e8';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';

  dialog.body.forEach((line, i) => {
    if (i < dialog.lineIndex) {
      ctx.fillText(line, boxX + 20, boxY + 48 + i * 18);
    } else if (i === dialog.lineIndex) {
      const visible = line.substring(0, dialog.charIndex);
      ctx.fillText(visible, boxX + 20, boxY + 48 + i * 18);

      if (Math.floor(time / 40) % 2 === 0 && dialog.timer > 0) {
        const cursorX = boxX + 20 + visible.length * 7.5;
        ctx.fillRect(cursorX, boxY + 36 + i * 18, 8, 14);
      }
    }
  });

  ctx.fillStyle = COLORS.dialogBorder;
  ctx.textAlign = 'center';
  ctx.font = '10px monospace';
  const fullLine = dialog.body[dialog.lineIndex] || '';
  if (dialog.lineIndex >= dialog.body.length ||
      (dialog.lineIndex === dialog.body.length - 1 && dialog.charIndex >= fullLine.length)) {
    const blink = Math.floor(time / 50) % 2 === 0;
    if (blink) {
      ctx.fillText('[PRESS SPACE]', INTERNAL_W / 2, boxY + boxH - 12);
    }
  }
  ctx.textAlign = 'left';
}

export function drawTitleScreen(
  ctx: CanvasRenderingContext2D,
  time: number,
  stars: Star[],
  clouds: CloudDeco[],
) {
  const grad = ctx.createLinearGradient(0, 0, 0, INTERNAL_H);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.45, COLORS.skyMid);
  grad.addColorStop(1, COLORS.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  stars.forEach(s => {
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.002 + s.twinkle));
    const bright = Math.floor(200 + 55 * alpha);
    ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
  });

  clouds.forEach(c => {
    const w = c.w;
    const h = w * 0.35;
    ctx.fillStyle = COLORS.cloud;
    ctx.fillRect(c.x + 8, c.y + h * 0.3, w - 16, h * 0.7);
    ctx.fillRect(c.x, c.y + h * 0.5, w, h * 0.5);
    ctx.fillRect(c.x + w * 0.1, c.y + h * 0.05, w * 0.25, h * 0.85);
    ctx.fillRect(c.x + w * 0.3, c.y - h * 0.05, w * 0.3, h * 0.95);
    ctx.fillRect(c.x + w * 0.55, c.y + h * 0.1, w * 0.25, h * 0.75);
    ctx.fillRect(c.x + w * 0.7, c.y + h * 0.15, w * 0.2, h * 0.65);
  });

  const groundY = ROWS * TILE - TILE;
  for (let tx = 0; tx < COLS; tx++) {
    const gx = tx * TILE;
    ctx.fillStyle = COLORS.groundTop;
    ctx.fillRect(gx, groundY, TILE, TILE);
    ctx.fillStyle = COLORS.groundTopDark;
    ctx.fillRect(gx, groundY + TILE - 4, TILE, 4);
  }

  for (let tx = 0; tx < COLS; tx++) {
    const gx = tx * TILE;
    ctx.fillStyle = COLORS.groundFill;
    ctx.fillRect(gx, groundY + TILE, TILE, TILE);
    ctx.fillStyle = COLORS.groundSub;
    ctx.fillRect(gx, groundY + TILE, TILE, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(gx + 6, groundY + TILE + 8, 4, 4);
    ctx.fillRect(gx + 16, groundY + TILE + 18, 6, 4);
  }

  ctx.fillStyle = COLORS.coinGold;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NEEL PANGING', INTERNAL_W / 2, 100);

  ctx.fillStyle = COLORS.playerHat;
  ctx.font = 'bold 14px monospace';
  ctx.fillText('ML ENGINEER  ·  DATA SCIENTIST  ·  BUILDER', INTERNAL_W / 2, 130);

  const blockY = 155;
  const cx = INTERNAL_W / 2;
  drawQBlockDeco(ctx, cx - 72, blockY + 16);
  drawQBlockDeco(ctx, cx - 36, blockY);
  drawQBlockDeco(ctx, cx, blockY + 16);
  drawQBlockDeco(ctx, cx + 36, blockY + 32);

  ctx.fillStyle = COLORS.playerOverall;
  ctx.font = 'bold 11px monospace';
  ctx.fillText('A 2D 8-BIT PLATFORMER ADVENTURE', INTERNAL_W / 2, 240);

  const ppx = INTERNAL_W / 2 - TILE;
  const ppy = 270;
  ctx.fillStyle = COLORS.playerHatDark;
  ctx.fillRect(ppx + 6, ppy - 2, 22, 4);
  ctx.fillStyle = COLORS.playerHat;
  ctx.fillRect(ppx + 6, ppy + 2, 22, 6);
  ctx.fillRect(ppx + 8, ppy - 2, 18, 4);
  ctx.fillStyle = COLORS.playerSkin;
  ctx.fillRect(ppx + 4, ppy + 8, 26, 12);
  ctx.fillStyle = COLORS.playerSkinDark;
  ctx.fillRect(ppx + 4, ppy + 18, 26, 2);
  ctx.fillStyle = COLORS.playerEyeWhite;
  ctx.fillRect(ppx + 7, ppy + 10, 7, 7);
  ctx.fillRect(ppx + 22, ppy + 10, 7, 7);
  ctx.fillStyle = COLORS.playerEye;
  ctx.fillRect(ppx + 9, ppy + 12, 3, 5);
  ctx.fillRect(ppx + 24, ppy + 12, 3, 5);
  ctx.fillStyle = COLORS.playerShirt;
  ctx.fillRect(ppx + 4, ppy + 20, 26, 5);
  ctx.fillStyle = COLORS.playerOverall;
  ctx.fillRect(ppx + 6, ppy + 25, 22, 3);

  const frm = Math.floor(time / 250) % 2;
  ctx.fillRect(ppx + 8, ppy + 28, 6, 4 - frm * 4);
  ctx.fillRect(ppx + 20, ppy + 28, 6, 4 + frm * 4);
  ctx.fillStyle = COLORS.playerShoe;
  ctx.fillRect(ppx + 6, ppy + 30 + (4 - frm * 4), 10, 4);
  ctx.fillRect(ppx + 18, ppy + 30 + (4 + frm * 4), 10, 4);

  const goomX = INTERNAL_W / 2 + 40;
  const goomY = 308;
  const goomBob = Math.sin(time * 0.08) * 2;
  ctx.fillStyle = COLORS.enemyFeet;
  ctx.fillRect(goomX + 4, goomY + TILE - 6 + goomBob, 8, 6);
  ctx.fillRect(goomX + 20, goomY + TILE - 6 + goomBob, 8, 6);
  ctx.fillStyle = COLORS.enemyBody;
  ctx.fillRect(goomX + 4, goomY + 4 + goomBob, TILE - 8, TILE - 14);
  ctx.fillStyle = COLORS.enemyBodyLight;
  ctx.fillRect(goomX + 4, goomY + 4 + goomBob, TILE - 8, 8);
  ctx.fillStyle = COLORS.enemyEye;
  ctx.fillRect(goomX + 8, goomY + 8 + goomBob, 7, 7);
  ctx.fillRect(goomX + 18, goomY + 8 + goomBob, 7, 7);
  ctx.fillStyle = COLORS.enemyPupil;
  ctx.fillRect(goomX + 12, goomY + 10 + goomBob, 3, 4);
  ctx.fillRect(goomX + 22, goomY + 10 + goomBob, 3, 4);

  const blink = Math.floor(time / 70) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#f8f8f8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS ENTER OR CLICK TO START', INTERNAL_W / 2, 390);
  }

  ctx.fillStyle = '#a0a0b8';
  ctx.font = '10px monospace';
  ctx.fillText('ARROWS / WASD TO MOVE  ·  SPACE TO JUMP  ·  ARROW KEYS TO NAVIGATE', INTERNAL_W / 2, 420);
  ctx.textAlign = 'left';
}

function drawQBlockDeco(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = COLORS.qblockBase;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = COLORS.qblockDark;
  ctx.fillRect(x, y, TILE, 3);
  ctx.fillRect(x, y, 3, TILE);
  ctx.fillStyle = COLORS.qblockLight;
  ctx.fillRect(x + TILE - 3, y, 3, TILE);
  ctx.fillRect(x + 3, y + TILE - 3, TILE - 6, 3);
  ctx.fillStyle = COLORS.qblockMark;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + TILE / 2, y + TILE / 2 + 1);
  ctx.fillStyle = COLORS.qblockLight;
  ctx.fillRect(x + 6, y + 3, 4, 4);
  ctx.fillRect(x + 22, y + 3, 4, 4);
}

export function drawDeathScreen(
  ctx: CanvasRenderingContext2D,
  time: number,
) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  ctx.fillStyle = COLORS.death;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', INTERNAL_W / 2, INTERNAL_H / 2 - 16);

  const blink = Math.floor(time / 60) % 2 === 0;
  if (blink && time % 255 > 120) {
    ctx.fillStyle = '#f8f8f8';
    ctx.font = '14px monospace';
    ctx.fillText('PRESS ENTER TO RETRY', INTERNAL_W / 2, INTERNAL_H / 2 + 24);
  }
  ctx.textAlign = 'left';
}

export function drawWinScreen(
  ctx: CanvasRenderingContext2D,
  time: number,
  coins: number,
) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  ctx.fillStyle = COLORS.coinGold;
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WORLD COMPLETE!', INTERNAL_W / 2, INTERNAL_H / 2 - 40);

  ctx.fillStyle = '#f8f8f8';
  ctx.font = '16px monospace';
  ctx.fillText(`COINS COLLECTED: ${coins}`, INTERNAL_W / 2, INTERNAL_H / 2 + 10);
  ctx.fillText('THANKS FOR PLAYING!', INTERNAL_W / 2, INTERNAL_H / 2 + 36);

  const blink = Math.floor(time / 60) % 2 === 0;
  if (blink) {
    ctx.fillText('PRESS ENTER TO PLAY AGAIN', INTERNAL_W / 2, INTERNAL_H / 2 + 70);
  }
  ctx.textAlign = 'left';
}

export function drawScanlines(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let y = 0; y < INTERNAL_H; y += 3) {
    ctx.fillRect(0, y, INTERNAL_W, 1);
  }
}

export function drawVignette(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createRadialGradient(
    INTERNAL_W / 2, INTERNAL_H / 2, INTERNAL_W * 0.55,
    INTERNAL_W / 2, INTERNAL_H / 2, INTERNAL_W * 0.85,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
}

export function drawSectionTransition(
  ctx: CanvasRenderingContext2D,
  transition: TransitionState,
  time: number,
) {
  if (!transition.active) return;

  const progress = transition.timer / transition.maxTime;
  let alpha = 1;

  if (progress < 0.2) alpha = progress / 0.2;
  else if (progress > 0.75) alpha = (1 - progress) / 0.25;

  const boxW = 380;
  const boxH = 70;
  const boxX = (INTERNAL_W - boxW) / 2;
  const boxY = (INTERNAL_H - boxH) / 2;

  ctx.fillStyle = `rgba(0,0,0,${(alpha * 0.8).toFixed(2)})`;
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(2)})`;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = transition.color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 4;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = transition.color;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(transition.text, INTERNAL_W / 2, boxY + 28);

  ctx.fillStyle = '#f8f8f8';
  ctx.font = '12px monospace';
  ctx.fillText('PORTFOLIO ZONE', INTERNAL_W / 2, boxY + 52);

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
