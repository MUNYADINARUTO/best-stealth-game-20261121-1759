// Emberfox — input.js: keyboard and mouse.
//
// WASD and the arrow keys move; Shift sneaks; M mutes; P pauses;
// Enter / Space confirms on the title and end screens. Clicking the
// floor tosses a coin (the game decides whether the click is in range).
// The canvas listens, so the page never scrolls while playing.

export class Input {
  constructor(canvas) {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.sneak = false;
    this.clicks = []; // {x, y} in canvas pixels, consumed by the game
    this.pressedKeys = new Set(); // edge-triggered keys, consumed by the game
    this.mouse = { x: 0, y: 0 };

    canvas.tabIndex = 0;
    this.canvas = canvas;
    this.keyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      this.setKey(event.key, true);
      this.pressedKeys.add(event.key.toLowerCase());
    };
    this.keyUp = (event) => this.setKey(event.key, false);
    this.mouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    };
    this.mouseDown = (event) => {
      this.mouseMove(event);
      this.clicks.push({ x: this.mouse.x, y: this.mouse.y });
    };
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    canvas.addEventListener('mousemove', this.mouseMove);
    canvas.addEventListener('mousedown', this.mouseDown);
  }

  setKey(key, down) {
    switch (key) {
      case 'a': case 'A': case 'ArrowLeft': this.left = down; break;
      case 'd': case 'D': case 'ArrowRight': this.right = down; break;
      case 'w': case 'W': case 'ArrowUp': this.up = down; break;
      case 's': case 'S': case 'ArrowDown': this.down = down; break;
      case 'Shift': this.sneak = down; break;
      default: break;
    }
  }

  // Did this key go down since the last frame?
  wasPressed(key) {
    return this.pressedKeys.has(key.toLowerCase());
  }

  endFrame() {
    this.pressedKeys.clear();
    this.clicks.length = 0;
  }

  destroy() {
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    this.canvas.removeEventListener('mousemove', this.mouseMove);
    this.canvas.removeEventListener('mousedown', this.mouseDown);
  }
}
