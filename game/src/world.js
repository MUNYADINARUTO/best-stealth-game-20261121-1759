// Emberfox — world.js: the tile grid, collision and line of sight.
//
// The world is a grid of 32px tiles. Walls ('#') and crates ('C') block
// movement and sight; bushes ('B') hide the fox but block nothing else;
// every other tile is open floor. All positions in the game are pixel
// coordinates; these helpers translate between the two.

import { TILE, COLS, ROWS } from './levels.js';

export function tileAt(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

export function isSolidTile(grid, tx, ty) {
  const t = tileAt(grid, tx, ty);
  return t === '#' || t === 'C';
}

export function blocksSight(grid, tx, ty) {
  return isSolidTile(grid, tx, ty);
}

export function isBushTile(grid, tx, ty) {
  return tileAt(grid, tx, ty) === 'B';
}

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

// Is the pixel point inside a solid tile? Used for circle-vs-grid
// collision: the mover is a circle of the given radius.
export function hitsSolid(grid, px, py, radius) {
  const minTx = Math.floor((px - radius) / TILE);
  const maxTx = Math.floor((px + radius) / TILE);
  const minTy = Math.floor((py - radius) / TILE);
  const maxTy = Math.floor((py + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isSolidTile(grid, tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(px, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(py, ty * TILE + TILE));
      const dx = px - nearestX;
      const dy = py - nearestY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

// Move a circle one axis at a time so it slides along walls instead of
// sticking on corners. Returns the new position.
export function slideMove(grid, pos, dx, dy, radius) {
  let { x, y } = pos;
  if (dx !== 0 && !hitsSolid(grid, x + dx, y, radius)) x += dx;
  if (dy !== 0 && !hitsSolid(grid, x, y + dy, radius)) y += dy;
  return { x, y };
}

// True when no wall or crate stands between the two pixel points.
// Steps along the segment in 4px hops and checks the tile under each hop.
export function hasLineOfSight(grid, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((ax + dx * t) / TILE);
    const ty = Math.floor((ay + dy * t) / TILE);
    if (blocksSight(grid, tx, ty)) return false;
  }
  return true;
}

// Cast one sight ray from (ox, oy) at the given angle until it hits a
// solid tile or travels maxDist. Returns the endpoint pixel.
export function castSightRay(grid, ox, oy, angle, maxDist) {
  const step = 4;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let dist = 0;
  while (dist < maxDist) {
    dist += step;
    const x = ox + cos * dist;
    const y = oy + sin * dist;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (blocksSight(grid, tx, ty)) {
      return { x: ox + cos * (dist - step), y: oy + sin * (dist - step) };
    }
  }
  return { x: ox + cos * maxDist, y: oy + sin * maxDist };
}
