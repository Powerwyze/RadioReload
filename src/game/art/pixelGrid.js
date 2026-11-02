// Tiny drawing kit for code-generated pixel art. A grid is an array of rows of palette keys.

export function blankGrid(width, height, fill = '.') {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

export function setPixel(grid, x, y, key) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    grid[y][x] = key;
  }
}

export function fillRect(grid, x, y, width, height, key) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      setPixel(grid, col, row, key);
    }
  }
}

export function strokeRect(grid, x, y, width, height, key) {
  for (let col = x; col < x + width; col += 1) {
    setPixel(grid, col, y, key);
    setPixel(grid, col, y + height - 1, key);
  }
  for (let row = y; row < y + height; row += 1) {
    setPixel(grid, x, row, key);
    setPixel(grid, x + width - 1, row, key);
  }
}

// Filled disc measured from pixel centres, so odd and even sizes both come out round.
export function fillDisc(grid, cx, cy, radius, key) {
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) {
      if (Math.hypot(col + 0.5 - cx, row + 0.5 - cy) <= radius) {
        grid[row][col] = key;
      }
    }
  }
}

export function stampRows(grid, x, y, rows) {
  rows.forEach((line, row) => {
    line.split('').forEach((key, col) => {
      if (key !== '.') {
        setPixel(grid, x + col, y + row, key);
      }
    });
  });
}

// Wraps every opaque pixel in a one-pixel outline on transparent neighbours.
export function outline(grid, key = 'k') {
  const copy = grid.map((row) => [...row]);
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) {
      if (grid[row][col] !== '.') {
        continue;
      }
      const touches = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0]
      ].some(([dx, dy]) => {
        const value = grid[row + dy]?.[col + dx];
        return value && value !== '.' && value !== key;
      });
      if (touches) {
        copy[row][col] = key;
      }
    }
  }
  return copy;
}

export function toRows(grid) {
  return grid.map((row) => row.join(''));
}

export function fromRows(rows) {
  return rows.map((line) => line.split(''));
}
