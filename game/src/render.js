// Emberfox — render.js: every pixel the player sees.
//
// Top-down night gallery: a dark checkerboard floor, stone walls, green
// bushes you can hide in, wooden crates that block sight, glowing ember
// gems, and the green exit door. Guards draw their vision cones on the
// floor (amber while curious, red on alarm) so the safe ground is
// readable at a glance. The HUD strip sits above the world.

import { TILE, COLS, ROWS } from './levels.js';
import { conePolygon } from './vision.js';

export const HUD_H = 44;
export const WORLD_W = COLS * TILE; // 960
export const WORLD_H = ROWS * TILE; // 640

const FLOOR_A = '#232c42';
const FLOOR_B = '#1d2537';
const WALL = '#46587e';
const WALL_TOP = '#5d719e';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, view) {
  const { grid } = view;
  ctx.save();
  ctx.translate(0, HUD_H);

  // Floor: quiet checkerboard so the fox and the guards stand out.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Bushes: soft green clusters, drawn under everything that walks.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] !== 'B') continue;
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      ctx.fillStyle = '#2c5d33';
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 4, 9, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 5, 9, 0, Math.PI * 2);
      ctx.arc(cx, cy + 6, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7d46';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 2, 5, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy + 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGems(ctx, view);
  drawExit(ctx, view);
  drawCoins(ctx, view);

  // Vision cones first, so guards and the fox draw on top of them.
  for (const guard of view.guards) drawCone(ctx, view, guard);

  // Crates and walls: solid cover that blocks sight, drawn over cones.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = grid[y][x];
      if (t === '#') drawWall(ctx, x, y);
      else if (t === 'C') drawCrate(ctx, x, y);
    }
  }

  for (const guard of view.guards) drawGuard(ctx, guard, view.time);
  drawFox(ctx, view);

  // Coin-toss preview: a gold ring where the click would land.
  if (view.aim && view.state === 'playing') {
    ctx.strokeStyle = view.aim.ok ? 'rgba(255, 210, 90, 0.9)' : 'rgba(255, 90, 90, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(view.aim.x, view.aim.y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Red edge glow while any guard is close to raising the alarm.
  if (view.maxSuspicion > 55 && view.state === 'playing') {
    const a = 0.10 + 0.16 * ((view.maxSuspicion - 55) / 45);
    const grad = ctx.createRadialGradient(
      WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.35,
      WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.75,
    );
    grad.addColorStop(0, 'rgba(200, 30, 30, 0)');
    grad.addColorStop(1, `rgba(200, 30, 30, ${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  ctx.restore();
}

function drawWall(ctx, x, y) {
  ctx.fillStyle = WALL;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  ctx.fillStyle = WALL_TOP;
  ctx.fillRect(x * TILE, y * TILE, TILE, 5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(x * TILE, y * TILE + TILE - 4, TILE, 4);
}

function drawCrate(ctx, x, y) {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = '#5a3a20';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
  ctx.beginPath();
  ctx.moveTo(px + 2, py + 2);
  ctx.lineTo(px + TILE - 2, py + TILE - 2);
  ctx.moveTo(px + TILE - 2, py + 2);
  ctx.lineTo(px + 2, py + TILE - 2);
  ctx.stroke();
}

function drawGems(ctx, view) {
  const t = view.time;
  for (const gem of view.gems) {
    if (gem.taken) continue;
    const cx = gem.x * TILE + TILE / 2;
    const cy = gem.y * TILE + TILE / 2 + Math.sin(t * 3 + gem.x) * 2;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
    glow.addColorStop(0, 'rgba(255, 150, 40, 0.55)');
    glow.addColorStop(1, 'rgba(255, 150, 40, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a2e';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 9);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 3, cy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawExit(ctx, view) {
  const { x, y } = view.exit;
  const cx = x * TILE + TILE / 2;
  const cy = y * TILE + TILE / 2;
  const pulse = 0.5 + 0.3 * Math.sin(view.time * 3);
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
  glow.addColorStop(0, `rgba(60, 255, 140, ${0.5 * pulse + 0.2})`);
  glow.addColorStop(1, 'rgba(60, 255, 140, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d3a22';
  roundRect(ctx, cx - 13, cy - 14, 26, 28, 4);
  ctx.fill();
  ctx.fillStyle = '#37e07e';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', cx, cy - 20);
  ctx.fillStyle = '#9dffc4';
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 7);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx - 5, cy + 7);
  ctx.closePath();
  ctx.fill();
}

function drawCoins(ctx, view) {
  for (const coin of view.coins) {
    ctx.fillStyle = '#ffd25a';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a87c14';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawCone(ctx, view, guard) {
  const poly = conePolygon(view.grid, guard);
  const hot = guard.state === 'chase' || guard.suspicion > 55;
  ctx.fillStyle = hot ? 'rgba(255, 60, 50, 0.30)' : 'rgba(255, 205, 70, 0.20)';
  ctx.strokeStyle = hot ? 'rgba(255, 60, 50, 0.5)' : 'rgba(255, 205, 70, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  const bob = Math.sin(guard.stepPhase) * 1.5;
  const alerted = guard.state === 'chase';
  const worried = guard.suspicion > 35 && !alerted;
  // Body: dark uniform with a red cap; amber when curious, red on alarm.
  ctx.fillStyle = alerted ? '#8c1f1f' : '#2b3550';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.3, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alerted ? '#ff5040' : worried ? '#ffbf40' : '#5d719e';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick: where the guard is looking.
  const fx = guard.x + Math.cos(guard.facing) * 16;
  const fy = guard.y + bob * 0.3 + Math.sin(guard.facing) * 16;
  ctx.strokeStyle = '#dfe6f5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y + bob * 0.3);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  // Suspicion mark above the head.
  if (alerted || worried) {
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = alerted ? '#ff5040' : '#ffbf40';
    ctx.fillText(alerted ? '!' : '?', guard.x, guard.y - 16 + bob * 0.3);
  }
  // Thin suspicion arc under the guard while it is building.
  if (guard.suspicion > 2 && !alerted) {
    ctx.strokeStyle = 'rgba(255, 191, 64, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob * 0.3, 18, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawFox(ctx, view) {
  const fox = view.fox;
  const bob = fox.moving ? Math.sin(fox.stepPhase) * 1.2 : 0;
  const x = fox.x;
  const y = fox.y + bob * 0.3;
  const hidden = view.foxInBush;
  // Tail.
  ctx.fillStyle = '#e07020';
  ctx.beginPath();
  ctx.ellipse(x - Math.cos(fox.facing) * 12, y - Math.sin(fox.facing) * 12, 9, 5, fox.facing, 0, Math.PI * 2);
  ctx.fill();
  // Ears.
  ctx.fillStyle = '#e07020';
  const earBase = fox.facing - Math.PI / 2;
  for (const side of [-1, 1]) {
    const a = earBase + side * 0.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    ctx.lineTo(x + Math.cos(a + side * 0.35) * 17, y + Math.sin(a + side * 0.35) * 17);
    ctx.lineTo(x + Math.cos(a - side * 0.2) * 12, y + Math.sin(a - side * 0.2) * 12);
    ctx.closePath();
    ctx.fill();
  }
  // Body: bright orange so the fox reads against the dark floor.
  ctx.fillStyle = fox.sneaking ? '#d86a1e' : '#f08025';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hidden ? '#7dff9e' : '#ffd9a0';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Nose.
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.arc(x + Math.cos(fox.facing) * 11, y + Math.sin(fox.facing) * 11, 3, 0, Math.PI * 2);
  ctx.fill();
  if (hidden) {
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#7dff9e';
    ctx.fillText('HIDDEN', x, y - 18);
  } else if (fox.sneaking) {
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#cfe0ff';
    ctx.fillText('sneaking', x, y - 18);
  }
}

// --- HUD and screens -------------------------------------------------

export function drawHud(ctx, view) {
  ctx.fillStyle = '#10151f';
  ctx.fillRect(0, 0, WORLD_W, HUD_H);
  ctx.fillStyle = '#2c3a58';
  ctx.fillRect(0, HUD_H - 2, WORLD_W, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`Level ${view.levelIndex + 1}/3 — ${view.levelName}`, 12, HUD_H / 2 - 8);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#9fb0d0';
  ctx.fillText(view.levelHint, 12, HUD_H / 2 + 10);

  const right = WORLD_W - 12;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff9a2e';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`◆ ${view.fox.gems}/${view.gemsTotal}`, right - 260, HUD_H / 2);
  ctx.fillStyle = '#ffd25a';
  ctx.fillText(`◉ ${view.fox.coins}`, right - 190, HUD_H / 2);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('♥'.repeat(Math.max(0, view.lives)), right - 130, HUD_H / 2);

  // Suspicion meter: the hottest guard right now.
  const mw = 110;
  const mx = right - mw;
  ctx.fillStyle = '#222c42';
  roundRect(ctx, mx, 10, mw, 12, 6);
  ctx.fill();
  const frac = view.maxSuspicion / 100;
  ctx.fillStyle = frac > 0.66 ? '#ff5040' : frac > 0.33 ? '#ffbf40' : '#37e07e';
  if (frac > 0.01) {
    roundRect(ctx, mx, 10, mw * frac, 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = '#9fb0d0';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SPOTTED', mx, 32);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`Score ${view.score}`, right, 14);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#9fb0d0';
  ctx.fillText(`⏱ ${Math.floor(view.elapsed)}s`, right, 32);
}

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(8, 10, 16, ${alpha})`;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H + HUD_H);
}

function centerText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, WORLD_W / 2, y);
}

export function drawTitle(ctx, view) {
  drawWorld(ctx, { ...view, state: 'title' });
  overlay(ctx, 0.72);
  centerText(ctx, 'EMBERFOX', 150, 'bold 64px sans-serif', '#f08025');
  centerText(ctx, '— The Quiet Heist —', 200, 'bold 20px sans-serif', '#ffd9a0');
  centerText(ctx, 'A little fox, three guarded halls, one green door per hall.', 250, '16px sans-serif', '#e8ecf5');
  centerText(ctx, 'Slip past the night watch. Hide in the bushes. Mind the cones.', 278, '16px sans-serif', '#e8ecf5');
  centerText(ctx, 'WASD / arrows — move      Shift — sneak      Click — toss a coin to distract', 340, '15px sans-serif', '#9fb0d0');
  centerText(ctx, 'M — mute      P — pause', 366, '15px sans-serif', '#9fb0d0');
  centerText(ctx, 'Reach the EXIT unseen. Gems are worth 250 each — but only if you live.', 410, '15px sans-serif', '#9fb0d0');
  centerText(ctx, 'Click or press Enter to begin', 480, 'bold 20px sans-serif', '#37e07e');
  centerText(ctx, '3 levels · 3 lives · the watch never sleeps', 520, '13px sans-serif', '#5d719e');
}

export function drawBanner(ctx, text, sub) {
  overlay(ctx, 0.45);
  centerText(ctx, text, 300, 'bold 44px sans-serif', '#ffd9a0');
  if (sub) centerText(ctx, sub, 350, '18px sans-serif', '#e8ecf5');
}

export function drawCaught(ctx, view) {
  overlay(ctx, 0.6);
  centerText(ctx, 'CAUGHT!', 280, 'bold 56px sans-serif', '#ff5040');
  centerText(ctx, 'The night watch grabbed the fox by the tail.', 340, '18px sans-serif', '#e8ecf5');
  centerText(ctx, view.lives > 0 ? `${view.lives} ${view.lives === 1 ? 'life' : 'lives'} left — press Enter to try the hall again` : 'No lives left.', 380, '16px sans-serif', '#9fb0d0');
}

export function drawLevelClear(ctx, view) {
  overlay(ctx, 0.6);
  centerText(ctx, 'HALL CLEARED', 240, 'bold 48px sans-serif', '#37e07e');
  centerText(ctx, `${view.levelName} — slipped through unseen.`, 300, '18px sans-serif', '#e8ecf5');
  centerText(ctx, `Gems ${view.fox.gems}/${view.gemsTotal}  ·  Time bonus ${view.timeBonus}  ·  Score ${view.score}`, 350, '17px sans-serif', '#ffd25a');
  centerText(ctx, view.levelIndex + 1 < 3 ? 'Press Enter for the next hall' : 'Press Enter for the reckoning', 410, 'bold 18px sans-serif', '#e8ecf5');
}

export function drawGameWin(ctx, view) {
  overlay(ctx, 0.72);
  centerText(ctx, 'THE QUIET HEIST', 220, 'bold 48px sans-serif', '#f08025');
  centerText(ctx, 'Three halls. Three green doors. Not a single alarm that stuck.', 290, '18px sans-serif', '#e8ecf5');
  centerText(ctx, `Final score ${view.score}  ·  Gems ${view.totalGems}  ·  Alarms raised ${view.alarms}`, 340, '17px sans-serif', '#ffd25a');
  centerText(ctx, 'Press Enter to play again', 410, 'bold 18px sans-serif', '#37e07e');
}

export function drawGameOver(ctx, view) {
  overlay(ctx, 0.72);
  centerText(ctx, 'THE WATCH WINS', 260, 'bold 48px sans-serif', '#ff5040');
  centerText(ctx, 'The fox is caught, and the embers stay in their vaults.', 320, '18px sans-serif', '#e8ecf5');
  centerText(ctx, `Score ${view.score} — press Enter to try again`, 380, 'bold 18px sans-serif', '#e8ecf5');
}

export function drawPaused(ctx) {
  overlay(ctx, 0.55);
  centerText(ctx, 'PAUSED', 300, 'bold 44px sans-serif', '#e8ecf5');
  centerText(ctx, 'Press P to keep sneaking', 350, '16px sans-serif', '#9fb0d0');
}
