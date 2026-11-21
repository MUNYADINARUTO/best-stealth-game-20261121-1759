// Emberfox — player.js: the fox.
//
// The fox runs with WASD or the arrow keys and sneaks (slower, harder
// to spot, quieter) while Shift is held. Clicking the floor tosses a
// coin: patrolling guards in earshot wander over to investigate the
// clink, opening a gap in the patrol. Coins are scarce — three a level.

import { TILE } from './levels.js';
import { slideMove, isBushTile } from './world.js';

export const WALK_SPEED = 158;
export const SNEAK_SPEED = 86;
export const PLAYER_RADIUS = 13;
export const COIN_RANGE = 270;
export const COIN_HEARING = 230;

export class Fox {
  constructor(startTile) {
    this.reset(startTile);
    this.coins = 3;
    this.gems = 0;
  }

  reset(startTile) {
    this.x = startTile.x * TILE + TILE / 2;
    this.y = startTile.y * TILE + TILE / 2;
    this.facing = 0;
    this.moving = false;
    this.sneaking = false;
    this.stepPhase = 0;
    this.stepAccum = 0;
  }

  update(dt, grid, input, events) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.moving = mx !== 0 || my !== 0;
    this.sneaking = input.sneak && this.moving;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
      const moved = slideMove(
        grid,
        { x: this.x, y: this.y },
        mx * speed * dt,
        my * speed * dt,
        PLAYER_RADIUS,
      );
      this.x = moved.x;
      this.y = moved.y;
      this.facing = Math.atan2(my, mx);
      this.stepPhase += dt * (speed / 8);
      // Footsteps: a soft tick every stride, louder when running.
      this.stepAccum += speed * dt;
      if (this.stepAccum > 46) {
        this.stepAccum = 0;
        events.push({ type: 'step', sneaking: this.sneaking });
      }
    }
  }

  // Is the fox standing in a bush right now (hidden from all but the
  // closest guard)?
  isInBush(grid) {
    return isBushTile(grid, Math.floor(this.x / TILE), Math.floor(this.y / TILE));
  }

  // Toss a coin toward a clicked floor point. Returns the landing point
  // or null when out of range / out of coins.
  tossCoin(targetX, targetY) {
    if (this.coins <= 0) return null;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > COIN_RANGE || dist < 24) return null;
    this.coins -= 1;
    return { x: targetX, y: targetY };
  }
}
