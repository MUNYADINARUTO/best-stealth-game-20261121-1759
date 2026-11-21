// Emberfox — shots.js: staged states for screenshots.
//
// The game reads ?shot=<name> from the URL and freezes on a composed
// moment, so screenshots show the real game mid-play instead of a menu:
//   start  — level 1 as the fox finds it: patrols, cones, cover, exit
//   sneak  — the fox crouched in a bush, a guard's cone sweeping past
//   alarm  — a near miss at the exit: one guard at 92 suspicion, red cone
//   hall3  — level 3 at a glance: five wardens on patrol
// A shot never changes the rules; it only places the fox and the guards
// and pauses the loop. Playing without ?shot= is unaffected.

import { TILE } from './levels.js';

function placeFox(game, tx, ty, sneaking) {
  game.fox.x = tx * TILE + TILE / 2;
  game.fox.y = ty * TILE + TILE / 2;
  game.fox.sneaking = sneaking;
  game.fox.moving = false;
}

function placeGuard(game, index, tx, ty, facing, suspicion, state) {
  const guard = game.guards[index];
  if (!guard) return;
  guard.x = tx * TILE + TILE / 2;
  guard.y = ty * TILE + TILE / 2;
  guard.facing = facing;
  guard.suspicion = suspicion;
  guard.state = state;
  guard.waitTimer = 99; // hold the pose while the shot is taken
}

export function applyShot(game, name) {
  if (name === 'sneak') {
    game.loadLevel(0);
    // Fox tucked in the bush at (6, 1); the top patrol passes just
    // below, its cone brushing the bush line.
    placeFox(game, 6, 1, true);
    placeGuard(game, 0, 10, 2, Math.PI / 2, 48, 'patrol');
    placeGuard(game, 1, 20, 8, Math.PI, 12, 'patrol');
    placeGuard(game, 2, 12, 16, 0, 0, 'patrol');
  } else if (name === 'alarm') {
    game.loadLevel(0);
    // Fox two steps from the exit; the bottom patrol has almost made
    // it and is bearing down, cone red.
    placeFox(game, 25, 18, false);
    placeGuard(game, 2, 22, 16, Math.PI / 2, 92, 'chase');
    game.fox.gems = 3;
    placeGuard(game, 0, 14, 2, Math.PI, 20, 'patrol');
    placeGuard(game, 1, 8, 8, 0, 0, 'patrol');
  } else if (name === 'hall3') {
    game.loadLevel(2);
    placeFox(game, 5, 1, true);
    placeGuard(game, 0, 6, 2, 0, 0, 'patrol');
    placeGuard(game, 1, 15, 7, Math.PI, 30, 'patrol');
    placeGuard(game, 2, 13, 8, -Math.PI / 2, 0, 'patrol');
    placeGuard(game, 3, 24, 12, Math.PI, 0, 'patrol');
    placeGuard(game, 4, 15, 17, 0, 0, 'patrol');
  } else {
    // 'start' and anything unknown: level 1, opening positions.
    game.loadLevel(0);
  }
  game.state = 'shot';
  game.shotName = name;
}
