// Emberfox — guards.js: the night watch.
//
// A guard walks its patrol route, pausing at each waypoint to look
// around. When it sees the fox its suspicion rises; at 100 it raises
// the alarm and chases. Lose it and it searches the last place it saw
// you, then gives up and goes back to patrol. A tossed coin pulls a
// patrolling guard over to investigate the clink. Guards never leave
// the floor: they slide along walls like the fox does.

import { TILE } from './levels.js';
import { slideMove } from './world.js';
import { guardCanSee, suspicionRate, SUSPICION_DECAY } from './vision.js';

export const PATROL_SPEED = 68;
export const CHASE_SPEED = 132;
export const INVESTIGATE_SPEED = 92;
export const CATCH_DIST = 22;
export const LOSE_SIGHT_SECONDS = 2.6;
export const SEARCH_SECONDS = 2.2;

export class Guard {
  constructor(def, grid) {
    this.waypoints = def.waypoints.map(([tx, ty]) => ({
      x: tx * TILE + TILE / 2,
      y: ty * TILE + TILE / 2,
    }));
    this.pause = def.pause ?? 0.7;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.target = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = 'patrol'; // patrol | investigate | chase
    this.suspicion = 0;
    this.waitTimer = 0;
    this.searchTimer = 0;
    this.lostTimer = 0;
    this.lastSeen = null;
    this.investigatePoint = null;
    this.lookTimer = 0;
    this.stepPhase = Math.random() * Math.PI * 2;
  }

  get alerted() {
    return this.state === 'chase';
  }

  // The guard's patrol speed, nudged per guard so the watch does not
  // march in lockstep.
  patrolSpeed() {
    return PATROL_SPEED;
  }

  // A tossed coin (or a noise) pulls a patrolling guard over to look.
  hearNoise(point) {
    if (this.state === 'chase') return;
    this.state = 'investigate';
    this.investigatePoint = { x: point.x, y: point.y };
    this.searchTimer = 0;
  }

  update(dt, grid, fox, events) {
    const seen = guardCanSee(grid, this, fox);
    if (seen.seen) {
      this.suspicion += suspicionRate(seen.dist, fox.sneaking) * dt;
      this.lastSeen = { x: fox.x, y: fox.y };
      this.lostTimer = 0;
    } else {
      this.suspicion = Math.max(0, this.suspicion - SUSPICION_DECAY * dt);
      if (this.state === 'chase') this.lostTimer += dt;
    }

    if (this.suspicion >= 100 && this.state !== 'chase') {
      this.suspicion = 100;
      this.state = 'chase';
      this.lostTimer = 0;
      events.push({ type: 'alarm', guard: this });
    }

    if (this.state === 'patrol') this.updatePatrol(dt, grid, events);
    else if (this.state === 'investigate') this.updateInvestigate(dt, grid, events);
    else this.updateChase(dt, grid, fox, events);

    if (seen.seen && this.state !== 'chase' && this.suspicion > 55) {
      events.push({ type: 'spotted', guard: this });
    }
  }

  // Walk toward a point; returns true on arrival. Facing follows motion.
  moveToward(dt, grid, tx, ty, speed) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const moved = slideMove(grid, { x: this.x, y: this.y }, nx - this.x, ny - this.y, 13);
    this.x = moved.x;
    this.y = moved.y;
    this.facing = Math.atan2(dy, dx);
    this.stepPhase += dt * (speed / 9);
    return dist - step < 3;
  }

  updatePatrol(dt, grid, events) {
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      // Look around while waiting at a waypoint: slow scan.
      this.facing += dt * 0.9;
      return;
    }
    const wp = this.waypoints[this.target];
    if (this.moveToward(dt, grid, wp.x, wp.y, this.patrolSpeed())) {
      this.target = (this.target + 1) % this.waypoints.length;
      this.waitTimer = this.pause;
      this.lookTimer = 0;
    }
  }

  updateInvestigate(dt, grid, events) {
    const point = this.investigatePoint ?? this.lastSeen;
    if (!point) {
      this.state = 'patrol';
      return;
    }
    if (this.moveToward(dt, grid, point.x, point.y, INVESTIGATE_SPEED)) {
      this.searchTimer += dt;
      this.facing += dt * 1.4; // sweep the area, looking for the fox
      if (this.searchTimer > SEARCH_SECONDS) {
        this.state = 'patrol';
        this.investigatePoint = null;
        this.waitTimer = 0.4;
      }
    }
  }

  updateChase(dt, grid, fox, events) {
    // Chase the fox itself while visible; otherwise head for the last
    // place it was seen, then search there.
    const target = guardCanSee(grid, this, fox).seen
      ? { x: fox.x, y: fox.y }
      : this.lastSeen;
    if (!target) {
      this.state = 'patrol';
      return;
    }
    this.moveToward(dt, grid, target.x, target.y, CHASE_SPEED);
    if (this.lostTimer > LOSE_SIGHT_SECONDS) {
      this.state = 'investigate';
      this.investigatePoint = { x: this.lastSeen.x, y: this.lastSeen.y };
      this.searchTimer = 0;
      events.push({ type: 'lost', guard: this });
    }
  }
}
