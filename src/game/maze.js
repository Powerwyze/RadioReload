// Every sprite and tile is 16px art drawn at 3x, so one maze cell is 48px.
export const PIXEL_SCALE = 3;
export const TILE_SIZE = 16 * PIXEL_SCALE;
export const MAZE_COLS = 21;
export const MAZE_ROW_COUNT = 17;

const STEPS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 }
];

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

export function manhattan(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

// Wraps one floor layout. Only '.' is walkable; '#', the engine and the booth are not.
export function createMaze(rows) {
  const charAt = (row, col) => rows[row]?.[col] ?? '#';
  const isWalkable = (row, col) => charAt(row, col) === '.';

  const walkableCells = [];
  rows.forEach((line, row) => {
    line.split('').forEach((char, col) => {
      if (char === '.') {
        walkableCells.push({ row, col });
      }
    });
  });

  function getNeighbors(row, col) {
    return STEPS.map(({ dx, dy }) => ({ row: row + dy, col: col + dx, dx, dy })).filter(
      (cell) => isWalkable(cell.row, cell.col)
    );
  }

  function randomFloorCell(rng = Math.random, exclusions = [], avoid = null, minDistance = 0) {
    const blacklist = new Set(exclusions.map(({ row, col }) => `${row}:${col}`));
    const candidates = walkableCells.filter(
      (cell) =>
        !blacklist.has(`${cell.row}:${cell.col}`) &&
        (!avoid || manhattan(cell, avoid) >= minDistance)
    );
    const pool = candidates.length ? candidates : walkableCells;
    return pool[Math.floor(rng() * pool.length)];
  }

  // One BFS step from start toward goal; returns start when the goal is unreachable.
  function findNextStep(start, goal) {
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
      if (`${current.row}:${current.col}` === goalKey) {
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

  return { rows, charAt, isWalkable, walkableCells, getNeighbors, randomFloorCell, findNextStep };
}
