// Emberfox — vision.js: what a guard can see, and how suspicion grows.
//
// A guard sees the fox when the fox is inside the guard's vision cone
// (range + half-angle), there is a clear line of sight, and the fox is
// not hidden. Bushes hide the fox unless the guard is almost on top of
// it; sneaking halves how fast suspicion rises; standing close fills
// the meter fast. Suspicion always drains when the fox is unseen, so a
// near miss is recoverable — the guard gets curious, not instantly sure.

import { TILE, COLS, ROWS } from './levels.js';
import { hasLineOfSight, isBushTile, castSightRay } from './world.js';

export const VISION_RANGE = 190;
export const VISION_HALF_ANGLE = 0.66; // ~38 degrees each side
export const BUSH_SPOT_DIST = 52; // a guard this close spots a fox in a bush

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Full visibility test: range, cone angle, line of sight, bush cover.
export function guardCanSee(grid, guard, fox) {
  const dx = fox.x - guard.x;
  const dy = fox.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return { seen: false, dist };
  const angleToFox = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleToFox, guard.facing)) > VISION_HALF_ANGLE) {
    return { seen: false, dist };
  }
  if (!hasLineOfSight(grid, guard.x, guard.y, fox.x, fox.y)) {
    return { seen: false, dist };
  }
  const foxTileX = Math.floor(fox.x / TILE);
  const foxTileY = Math.floor(fox.y / TILE);
  if (isBushTile(grid, foxTileX, foxTileY) && dist > BUSH_SPOT_DIST) {
    return { seen: false, dist, hidden: true };
  }
  return { seen: true, dist };
}

// How fast suspicion (0-100) rises per second while the fox is seen.
// Close and careless fills the meter in about a second; far away and
// sneaking buys several seconds to slip back behind cover.
export function suspicionRate(dist, sneaking) {
  const closeness = 1 - dist / VISION_RANGE; // 0 far, 1 point blank
  let rate = 26 + 110 * closeness;
  if (sneaking) rate *= 0.45;
  return rate;
}

export const SUSPICION_DECAY = 22; // per second while unseen

// The visible cone polygon: the guard's position plus raycast endpoints
// fanned across the cone, so the cone hugs walls instead of drawing
// through them. The renderer fills this polygon.
export function conePolygon(grid, guard) {
  const rays = 15;
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i++) {
    const t = i / rays;
    const angle = guard.facing - VISION_HALF_ANGLE + 2 * VISION_HALF_ANGLE * t;
    points.push(castSightRay(grid, guard.x, guard.y, angle, VISION_RANGE));
  }
  return points;
}
