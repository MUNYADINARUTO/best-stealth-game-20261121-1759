// Emberfox: The Quiet Heist — level definitions.
//
// Each level is a 30 x 20 tile map drawn with characters:
//   '#' wall (blocks movement and sight)   '.' open floor
//   'B' bush (walkable; hides the fox)     'C' crate (blocks movement and sight)
//   'G' ember gem (bonus score)            'E' exit door
//   'P' the fox's starting tile
// Guards are defined separately below as patrol waypoints in tile
// coordinates; every leg of a patrol runs in a straight line down an
// open corridor, so a guard never has to path around a wall.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;

export const LEVELS = [
  {
    name: 'The Ember Gallery',
    hint: 'Slip past the night watch and reach the green door.',
    parSeconds: 75,
    map: [
      '##############################',
      '#P....B.......C......G.......#',
      '#............................#',
      '#....####......B.....####....#',
      '#............................#',
      '#..C.........####............#',
      '#........................B...#',
      '#......B......C.............G#',
      '#............................#',
      '#...####.........####....#...#',
      '#............................#',
      '#.B.......C........B.........#',
      '#............................#',
      '#......####.....C....####....#',
      '#............................#',
      '#..G........B..........C.....#',
      '#............................#',
      '#....C..........####......B..#',
      '#.......................G...E#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 2], [27, 2]], pause: 0.8 },
      { waypoints: [[27, 8], [3, 8]], pause: 0.8 },
      { waypoints: [[3, 16], [27, 16]], pause: 0.8 },
    ],
  },
  {
    name: "The Vault Corridor",
    hint: 'More eyes, tighter halls. Bushes are your friends.',
    parSeconds: 95,
    map: [
      '##############################',
      '#P....#......B.....#....G....#',
      '#.....#............#.........#',
      '#..B..#....C.......#....C....#',
      '#.....#............#.........#',
      '#####.######..######.#########',
      '#..........#...#.....#...B...#',
      '#.C....B...#...#..G..........#',
      '#..........#...#.....#.......#',
      '####..######...#######..######',
      '#......B..........#..........#',
      '#..G...#....C.....#....C.....#',
      '#......#.....................#',
      '#..B...#..####....#....B.....#',
      '#......#..#.......#..........#',
      '#......#..#...G...#....E.....#',
      '#......#..#.......#..........#',
      '#..C...#..#...B...#....C.....#',
      '#......#..#.......#..........#',
      '##############################',
    ],
    guards: [
      { waypoints: [[8, 2], [18, 2]], pause: 0.6 },
      { waypoints: [[23, 7], [27, 7]], pause: 1.0 },
      { waypoints: [[20, 10], [20, 18]], pause: 0.6 },
      { waypoints: [[18, 4], [8, 4]], pause: 0.6 },
    ],
  },
  {
    name: "The Warden's Hall",
    hint: 'Five wardens, one fox. Spend your coins to pull them away.',
    parSeconds: 120,
    map: [
      '##############################',
      '#P...B....C......G......#....#',
      '#.........#..................#',
      '#..C...........B...#...C.....#',
      '#.........#.........#........#',
      '####.#######.#########.#######',
      '#....B.....#.....C....#...G..#',
      '#.........#.........#........#',
      '#..G.......#..B......#..C....#',
      '#.........#.........#........#',
      '####..#####...######..########',
      '#.....#......B.....#.........#',
      '#.B....#..C........#....G....#',
      '#.....#............#.........#',
      '#..C...#..####.....#...B.....#',
      '#.....#..#.........#.........#',
      '#.G....#..#...C....#..E......#',
      '#.....#..#.........#.........#',
      '#..B...#..#....G...#....C....#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 2], [9, 2]], pause: 0.5 },
      { waypoints: [[18, 7], [12, 7]], pause: 0.7 },
      { waypoints: [[13, 6], [13, 9]], pause: 0.5 },
      { waypoints: [[21, 12], [27, 12]], pause: 0.9 },
      { waypoints: [[11, 17], [18, 17]], pause: 0.6 },
    ],
  },
];

// Turn a level's character map into the pieces the game needs: the
// walkable grid, the fox start, gem tiles and the exit tile.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  let start = { x: 1, y: 1 };
  const gems = [];
  let exit = { x: COLS - 2, y: ROWS - 2 };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x];
      if (ch === 'P') { start = { x, y }; grid[y][x] = '.'; }
      if (ch === 'G') { gems.push({ x, y, taken: false }); grid[y][x] = '.'; }
      if (ch === 'E') { exit = { x, y }; grid[y][x] = '.'; }
    }
  }
  return { ...def, grid, start, gems, exit };
}
