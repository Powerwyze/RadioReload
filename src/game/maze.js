export const TILE_SIZE = 44;

export const MAZE_ROWS = [
  '#####################',
  '#.....#.......#.....#',
  '#.###.#.#####.#.###.#',
  '#.#...#...#...#...#.#',
  '#.#.#####.#.#####.#.#',
  '#...#.....#.....#...#',
  '###.#.###.#.###.#.###',
  '#.....#.......#.....#',
  '#.#####.##.##.#####.#',
  '#.......#...#.......#',
  '#.#####.#.#.#.#####.#',
  '#.....#.......#.....#',
  '###.#.###.#.###.#.###',
  '#...#.....#.....#...#',
  '#.#.#####.#.#####.#.#',
  '#.#...#...#...#...#.#',
  '#####################'
];

export const WALKABLE_CELLS = [];

for (let row = 0; row < MAZE_ROWS.length; row += 1) {
  for (let col = 0; col < MAZE_ROWS[row].length; col += 1) {
    if (MAZE_ROWS[row][col] !== '#') {
      WALKABLE_CELLS.push({ row, col });
    }
  }
}

export function isWalkableCell(row, col) {
  if (row < 0 || col < 0 || row >= MAZE_ROWS.length || col >= MAZE_ROWS[0].length) {
    return false;
  }

  return MAZE_ROWS[row][col] !== '#';
}

export function cellToWorld(row, col) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2
  };
}

export function worldToCell(x, y) {
  return {
    row: Math.floor(y / TILE_SIZE),
    col: Math.floor(x / TILE_SIZE)
  };
}

export function randomFloorCell(rng = Math.random, exclusions = []) {
  const blacklist = new Set(exclusions.map(({ row, col }) => `${row}:${col}`));
  const candidates = WALKABLE_CELLS.filter(
    ({ row, col }) => !blacklist.has(`${row}:${col}`)
  );
  return candidates[Math.floor(rng() * candidates.length)];
}

export function getNeighbors(row, col) {
  return [
    { row: row - 1, col, dx: 0, dy: -1 },
    { row: row + 1, col, dx: 0, dy: 1 },
    { row, col: col - 1, dx: -1, dy: 0 },
    { row, col: col + 1, dx: 1, dy: 0 }
  ].filter(({ row: nextRow, col: nextCol }) => isWalkableCell(nextRow, nextCol));
}

export function findNextStep(start, goal) {
  if (start.row === goal.row && start.col === goal.col) {
    return start;
  }

  const startKey = `${start.row}:${start.col}`;
  const goalKey = `${goal.row}:${goal.col}`;
  const queue = [start];
  const visited = new Set([startKey]);
  const parents = new Map();

  while (queue.length) {
    const current = queue.shift();
    const currentKey = `${current.row}:${current.col}`;

    if (currentKey === goalKey) {
      break;
    }

    for (const neighbor of getNeighbors(current.row, current.col)) {
      const key = `${neighbor.row}:${neighbor.col}`;
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      parents.set(key, current);
      queue.push({ row: neighbor.row, col: neighbor.col });
    }
  }

  if (!parents.has(goalKey)) {
    return start;
  }

  let step = goal;
  let parent = parents.get(goalKey);

  while (parent && `${parent.row}:${parent.col}` !== startKey) {
    step = parent;
    parent = parents.get(`${parent.row}:${parent.col}`);
  }

  return step;
}
