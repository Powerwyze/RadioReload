// Code-generated 16x16 tiles for each floor theme, and a painter that bakes a whole floor
// into one pixel image. Pure functions only, so the same code feeds Phaser and the preview tools.

export const TILE_PIXELS = 16;

function hash(a, b, c = 0) {
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263) ^ Math.imul(c + 13, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

export function shade(hex, amount) {
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return rgbToHex(hexToRgb(hex).map((v) => v + (target - v) * t));
}

export const THEMES = {
  penthouse: {
    colors: {
      1: '#2a1846',
      2: '#33205a',
      3: '#47306f',
      4: '#d4a531',
      5: '#0c0a16',
      6: '#1b1733',
      7: '#3d3570',
      8: '#ffe28a',
      9: '#7d6bd0'
    },
    floor(x, y, cell) {
      const d1 = (x + y) % 8 === 0;
      const d2 = (x - y + 16) % 8 === 0;
      if (x % 8 === 4 && y % 8 === 4) return '4';
      if (d1 || d2) return '3';
      return hash(x, y, cell.seed) < 0.06 ? '2' : '1';
    },
    wallTop(x, y, cell) {
      if (Math.abs(x - y - (cell.seed % 5)) === 0 && hash(x, cell.seed) < 0.7) return '7';
      return hash(x, y, cell.seed) < 0.05 ? '7' : '6';
    },
    wallFace(x, y, cell) {
      if (y <= 1 || y >= 14) return y === 14 ? '8' : '4';
      if (x === 0 || x === 15) return '4';
      if ((x + y + cell.seed) % 11 === 0 || (x + y + cell.seed) % 11 === 1) return '7';
      if (hash(x, y, cell.seed) < 0.05) return hash(y, x) < 0.5 ? '8' : '9';
      return '5';
    }
  },
  studio: {
    colors: {
      1: '#6b4423',
      2: '#7a4f2a',
      3: '#3f2612',
      4: '#946339',
      5: '#2b2e38',
      6: '#3d4150',
      7: '#1a1c23',
      8: '#22d3c5',
      9: '#22252e'
    },
    floor(x, y, cell) {
      const plank = Math.floor(y / 4);
      if (y % 4 === 3) return '3';
      if ((x + plank * 6 + cell.seed) % 16 === 0) return '3';
      const grain = hash(x >> 1, y, plank + cell.seed);
      return grain < 0.12 ? '4' : grain < 0.3 ? '2' : '1';
    },
    wallTop(x, y, cell) {
      return hash(x, y, cell.seed) < 0.08 ? '6' : '9';
    },
    wallFace(x, y) {
      if (y <= 1) return '9';
      if (y === 2) return x % 4 === 1 ? '8' : '7';
      if (y >= 14) return '7';
      const u = x % 4;
      const v = (y - 3) % 4;
      if ((u === 0 && v === 0) || (u === 2 && v === 2)) return '6';
      if ((u === 1 && v === 1) || (u === 3 && v === 3)) return '7';
      return '5';
    }
  },
  suites: {
    colors: {
      1: '#7a1a2a',
      2: '#5e1220',
      3: '#c9a227',
      4: '#94293b',
      5: '#1f4a3f',
      6: '#2f6b59',
      7: '#e8dcc0',
      8: '#c79a44',
      9: '#143329'
    },
    floor(x, y) {
      const mx = x % 8;
      const my = y % 8;
      if ((mx === 3 || mx === 4) && (my === 3 || my === 4)) return '3';
      if (mx === my || mx === 7 - my) return '4';
      if (y === 0 || y === 15) return '2';
      return '1';
    },
    wallTop(x, y) {
      if (y === 0 || y === 15 || x === 0 || x === 15) return '8';
      return (x + y) % 6 === 0 ? '6' : '9';
    },
    wallFace(x, y, cell) {
      if (y === 0) return '8';
      if (y === 11) return '7';
      if (y >= 12) {
        if (y === 15) return '7';
        return x === 1 || x === 14 || y === 12 ? '7' : '9';
      }
      // Brass sconce on every third tile.
      if (cell.col % 3 === 0 && x >= 7 && x <= 8 && y >= 3 && y <= 6) {
        return y === 3 ? '3' : '8';
      }
      const mx = (x + 2) % 6;
      const my = (y + 1) % 5;
      if ((mx === 2 && my !== 4) || (my === 2 && mx >= 1 && mx <= 3)) return '6';
      return '5';
    }
  },
  lobby: {
    colors: {
      1: '#e9e6df',
      2: '#c4beb3',
      3: '#9a93a3',
      4: '#b3adbb',
      5: '#b8862b',
      6: '#ecc56a',
      7: '#26242e',
      8: '#46424f',
      9: '#6e5018'
    },
    floor(x, y, cell) {
      const dark = ((x >> 3) + (y >> 3) + cell.row + cell.col) % 2 === 1;
      const vein = Math.abs(((x * 3 + y * 2 + cell.seed) % 13) - 6) === 0 && hash(x, y, cell.seed) < 0.6;
      if (dark) return vein ? '4' : '3';
      return vein ? '2' : '1';
    },
    wallTop(x, y, cell) {
      if (y === 0 || y === 15 || x === 0 || x === 15) return '9';
      const vein = Math.abs(((x * 2 + y * 3 + cell.seed) % 11) - 5) === 0;
      return vein ? '8' : '7';
    },
    wallFace(x, y) {
      if (y <= 1) return y === 0 ? '6' : '5';
      if (y >= 14) return '9';
      if (x === 0 || x === 15) return '5';
      if (x === 1 || y === 2) return '8';
      if (x === 14 || y === 13) return '7';
      if (x === 7 || x === 8) return y % 3 === 0 ? '6' : '5';
      return '7';
    }
  },
  lowend: {
    colors: {
      1: '#26262c',
      2: '#313139',
      3: '#18181d',
      4: '#5a1624',
      5: '#121216',
      6: '#3a3a47',
      7: '#5b5b69',
      8: '#ff3355',
      9: '#d9a91c'
    },
    floor(x, y, cell) {
      // A drain grate on some tiles, wet red reflections on others.
      if (cell.seed % 7 === 0 && x >= 5 && x <= 10 && y >= 5 && y <= 10) {
        return x === 5 || x === 10 || y === 5 || y === 10 ? '6' : x % 2 ? '3' : '6';
      }
      if (cell.seed % 5 === 1 && Math.hypot(x - 8, (y - 9) * 1.6) < 4.5) return '4';
      const n = hash(x, y, cell.seed);
      return n < 0.08 ? '3' : n < 0.22 ? '2' : '1';
    },
    wallTop(x, y, cell) {
      if ((x === 2 || x === 13) && (y === 2 || y === 13)) return '7';
      if (y === 0 || y === 15 || x === 0 || x === 15) return '5';
      return hash(x, y, cell.seed) < 0.06 ? '2' : '6';
    },
    wallFace(x, y) {
      if (y === 0) return '6';
      if (y === 15) return '5';
      if (x === 0 || x === 15) return '6';
      const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
      if (d < 1.6) return '7';
      if (d < 3.5) return '5';
      if (d < 5) return '6';
      if (d < 6) return '7';
      if (x === 2 && y === 2) return '8';
      return '5';
    }
  }
};

// Returns { width, height, pixels } where pixels is a flat array of hex colours (or null).
// `rows` uses '#' for walls; every other character is painted as floor.
export function paintBoard(rows, themeId) {
  const theme = THEMES[themeId];
  const height = rows.length * TILE_PIXELS;
  const width = rows[0].length * TILE_PIXELS;
  const pixels = new Array(width * height);
  const isWall = (row, col) => (rows[row]?.[col] ?? '#') === '#';

  rows.forEach((line, row) => {
    line.split('').forEach((char, col) => {
      const cell = { row, col, seed: Math.floor(hash(row, col, 7) * 1000) };
      const wall = char === '#';
      const face = wall && !isWall(row + 1, col);
      const shadowAbove = !wall && isWall(row - 1, col);
      const shadowLeft = !wall && isWall(row, col - 1);

      for (let y = 0; y < TILE_PIXELS; y += 1) {
        for (let x = 0; x < TILE_PIXELS; x += 1) {
          const key = wall
            ? face
              ? theme.wallFace(x, y, cell)
              : theme.wallTop(x, y, cell)
            : theme.floor(x, y, cell);
          let color = theme.colors[key];
          if (shadowAbove && y < 4) {
            color = shade(color, -(0.55 - y * 0.12));
          } else if (shadowLeft && x < 2) {
            color = shade(color, -0.25);
          }
          if (face && y >= 13) {
            color = shade(color, -0.2);
          }
          pixels[(row * TILE_PIXELS + y) * width + col * TILE_PIXELS + x] = color;
        }
      }
    });
  });

  return { width, height, pixels };
}

// Small swatch for UI chips: one floor tile and one wall face side by side.
export function paintThemeSwatch(themeId) {
  return paintBoard(['#', '.'], themeId);
}
