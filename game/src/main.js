// Emberfox — main.js: the game loop and the rules that tie it together.
//
// States: title → banner (level intro) → playing → caught / levelclear
// → gamewin / gameover, plus paused and shot (frozen for screenshots).
// Scoring: 250 per ember gem, plus a time bonus for clearing a hall
// under par. Three lives; getting caught restarts the hall. The fox
// wins by reaching the green exit door of all three halls.

import { LEVELS, parseLevel, TILE, COLS, ROWS } from './levels.js';
import { Guard, CATCH_DIST } from './guards.js';
import { Fox, COIN_RANGE, COIN_HEARING } from './player.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { applyShot } from './shots.js';
import {
  HUD_H, WORLD_W, WORLD_H,
  drawWorld, drawHud, drawTitle, drawBanner,
  drawCaught, drawLevelClear, drawGameWin, drawGameOver, drawPaused,
} from './render.js';

const GEM_SCORE = 250;
const BANNER_SECONDS = 1.8;
const CAUGHT_FREEZE = 0.9;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.fox = new Fox({ x: 1, y: 1 });
    this.levelIndex = 0;
    this.level = null;
    this.grid = [];
    this.guards = [];
    this.coins = []; // tossed coins lying on the floor
    this.score = 0;
    this.scoreAtLevelStart = 0;
    this.totalGems = 0;
    this.alarms = 0;
    this.lives = 3;
    this.state = 'title';
    this.time = 0;
    this.elapsed = 0;
    this.bannerTimer = 0;
    this.caughtTimer = 0;
    this.timeBonus = 0;
    this.shotName = null;
    this.pausedFrom = null;
    this.lastFrame = performance.now();

    // Headless play-testing hook: the test driver reads this snapshot.
    window.__game = this;
    window.__gameState = () => this.snapshot();

    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      applyShot(this, shot);
    } else {
      this.level = parseLevel(LEVELS[0]);
      this.grid = this.level.grid;
      this.fox.reset(this.level.start);
      this.guards = this.level.guards.map((def) => new Guard(def, this.grid));
    }
    requestAnimationFrame((now) => this.frame(now));
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVELS[index]);
    this.grid = this.level.grid;
    this.fox.reset(this.level.start);
    this.fox.gems = 0;
    this.fox.coins = 3;
    this.guards = this.level.guards.map((def) => new Guard(def, this.grid));
    this.coins = [];
    this.scoreAtLevelStart = this.score;
    this.elapsed = 0;
    this.bannerTimer = BANNER_SECONDS;
    this.state = 'banner';
  }

  startGame() {
    this.audio.ensure();
    this.score = 0;
    this.totalGems = 0;
    this.alarms = 0;
    this.lives = 3;
    this.loadLevel(0);
  }

  get maxSuspicion() {
    return this.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
  }

  get foxInBush() {
    return this.fox.isInBush(this.grid);
  }

  snapshot() {
    return {
      state: this.state,
      level: this.levelIndex + 1,
      levelName: this.level.name,
      score: this.score,
      lives: this.lives,
      gems: this.fox.gems,
      gemsTotal: this.level.gems.length,
      coins: this.fox.coins,
      maxSuspicion: Math.round(this.maxSuspicion),
      fox: { x: Math.round(this.fox.x), y: Math.round(this.fox.y) },
      guards: this.guards.map((g) => ({
        x: Math.round(g.x), y: Math.round(g.y),
        state: g.state, suspicion: Math.round(g.suspicion),
      })),
      exit: this.level.exit,
    };
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000 || 0);
    this.lastFrame = now;
    this.time += dt;
    this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((n) => this.frame(n));
  }

  update(dt) {
    if (this.state === 'title') {
      this.audio.ensure();
      if (this.input.wasPressed('enter') || this.input.wasPressed(' ') || this.input.clicks.length > 0) {
        this.startGame();
      }
      return;
    }
    if (this.state === 'shot') return; // frozen pose for screenshots
    if (this.input.wasPressed('m')) this.audio.toggleMute();
    if (this.state === 'paused') {
      if (this.input.wasPressed('p') || this.input.wasPressed('escape')) this.state = this.pausedFrom;
      return;
    }
    if (this.state === 'playing' && (this.input.wasPressed('p') || this.input.wasPressed('escape'))) {
      this.pausedFrom = 'playing';
      this.state = 'paused';
      return;
    }

    if (this.state === 'banner') {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.state = 'playing';
      return;
    }
    if (this.state === 'caught') {
      this.caughtTimer -= dt;
      if (this.caughtTimer <= 0 && (this.input.wasPressed('enter') || this.input.wasPressed(' ') || this.input.clicks.length > 0)) {
        if (this.lives <= 0) this.state = 'gameover';
        else this.loadLevel(this.levelIndex);
      }
      return;
    }
    if (this.state === 'levelclear') {
      if (this.input.wasPressed('enter') || this.input.wasPressed(' ') || this.input.clicks.length > 0) {
        if (this.levelIndex + 1 >= LEVELS.length) {
          this.state = 'gamewin';
          this.audio.gameWin();
        } else {
          this.loadLevel(this.levelIndex + 1);
        }
      }
      return;
    }
    if (this.state === 'gamewin' || this.state === 'gameover') {
      if (this.input.wasPressed('enter') || this.input.wasPressed(' ') || this.input.clicks.length > 0) {
        this.startGame();
      }
      return;
    }
    if (this.state !== 'playing') return;

    this.elapsed += dt;
    const events = [];
    this.fox.update(dt, this.grid, this.input, events);
    for (const guard of this.guards) guard.update(dt, this.grid, this.fox, events);
    this.handleEvents(events);
    this.handleClicks();
    this.checkGems();
    this.checkExit();
    this.checkCaught();
  }

  handleEvents(events) {
    for (const event of events) {
      if (event.type === 'step') this.audio.step(event.sneaking);
      else if (event.type === 'alarm') {
        this.alarms += 1;
        this.audio.alarm();
      }
    }
  }

  handleClicks() {
    for (const click of this.input.clicks) {
      this.audio.ensure();
      const wx = click.x;
      const wy = click.y - HUD_H;
      if (wy < 0) continue;
      const coin = this.fox.tossCoin(wx, wy);
      if (!coin) continue;
      this.coins.push(coin);
      this.audio.coin();
      for (const guard of this.guards) {
        const d = Math.hypot(guard.x - coin.x, guard.y - coin.y);
        if (d < COIN_HEARING) guard.hearNoise(coin);
      }
    }
  }

  checkGems() {
    for (const gem of this.level.gems) {
      if (gem.taken) continue;
      const cx = gem.x * TILE + TILE / 2;
      const cy = gem.y * TILE + TILE / 2;
      if (Math.hypot(this.fox.x - cx, this.fox.y - cy) < 26) {
        gem.taken = true;
        this.fox.gems += 1;
        this.totalGems += 1;
        this.score += GEM_SCORE;
        this.audio.gem();
      }
    }
  }

  checkExit() {
    const fx = Math.floor(this.fox.x / TILE);
    const fy = Math.floor(this.fox.y / TILE);
    if (fx === this.level.exit.x && fy === this.level.exit.y) {
      const underPar = Math.max(0, this.level.parSeconds - Math.floor(this.elapsed));
      this.timeBonus = underPar * 10;
      this.score += this.timeBonus;
      this.audio.levelClear();
      this.state = 'levelclear';
    }
  }

  checkCaught() {
    for (const guard of this.guards) {
      if (guard.state !== 'chase') continue;
      if (Math.hypot(guard.x - this.fox.x, guard.y - this.fox.y) < CATCH_DIST) {
        this.lives -= 1;
        this.score = this.scoreAtLevelStart;
        this.audio.caught();
        this.caughtTimer = CAUGHT_FREEZE;
        this.state = 'caught';
        return;
      }
    }
  }

  aimView() {
    if (this.state !== 'playing') return null;
    const wx = this.input.mouse.x;
    const wy = this.input.mouse.y - HUD_H;
    if (wy < 0 || this.fox.coins <= 0) return null;
    const dist = Math.hypot(wx - this.fox.x, wy - this.fox.y);
    return { x: wx, y: wy, ok: dist <= COIN_RANGE && dist >= 24 };
  }

  view() {
    return {
      grid: this.grid,
      guards: this.guards,
      fox: this.fox,
      gems: this.level.gems,
      gemsTotal: this.level.gems.length,
      exit: this.level.exit,
      coins: this.coins,
      levelIndex: this.levelIndex,
      levelName: this.level.name,
      levelHint: this.level.hint,
      lives: this.lives,
      score: this.score,
      maxSuspicion: this.maxSuspicion,
      elapsed: this.elapsed,
      state: this.state,
      time: this.time,
      foxInBush: this.foxInBush,
      aim: this.aimView(),
      timeBonus: this.timeBonus,
      totalGems: this.totalGems,
      alarms: this.alarms,
    };
  }

  render() {
    const ctx = this.ctx;
    const view = this.view();
    ctx.clearRect(0, 0, WORLD_W, WORLD_H + HUD_H);
    if (this.state === 'title') {
      drawTitle(ctx, view);
      return;
    }
    drawWorld(ctx, view);
    drawHud(ctx, view);
    if (this.state === 'banner') drawBanner(ctx, this.level.name, this.level.hint);
    else if (this.state === 'caught') drawCaught(ctx, view);
    else if (this.state === 'levelclear') drawLevelClear(ctx, view);
    else if (this.state === 'gamewin') drawGameWin(ctx, view);
    else if (this.state === 'gameover') drawGameOver(ctx, view);
    else if (this.state === 'paused') drawPaused(ctx);
  }
}

const canvas = document.getElementById('game');
canvas.width = WORLD_W;
canvas.height = WORLD_H + HUD_H;
new Game(canvas);
