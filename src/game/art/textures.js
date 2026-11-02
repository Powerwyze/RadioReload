import { PALETTE } from './palette.js';
import { SPRITES, validateSprites } from './sprites.js';
import { paintBoard } from './tiles.js';

validateSprites(SPRITES, PALETTE);

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 255, value & 255];
}

const RGB = Object.fromEntries(Object.entries(PALETTE).map(([key, hex]) => [key, hexToRgb(hex)]));

export function gridToCanvas(rows, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length * scale;
  canvas.height = rows.length * scale;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);

  rows.forEach((line, row) => {
    for (let col = 0; col < line.length; col += 1) {
      const rgb = RGB[line[col]];
      if (!rgb) {
        continue;
      }
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const index = ((row * scale + dy) * canvas.width + col * scale + dx) * 4;
          image.data[index] = rgb[0];
          image.data[index + 1] = rgb[1];
          image.data[index + 2] = rgb[2];
          image.data[index + 3] = 255;
        }
      }
    }
  });

  context.putImageData(image, 0, 0);
  return canvas;
}

export function boardToCanvas(rows, themeId) {
  const board = paintBoard(rows, themeId);
  const canvas = document.createElement('canvas');
  canvas.width = board.width;
  canvas.height = board.height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(board.width, board.height);
  board.pixels.forEach((hex, index) => {
    const [r, g, b] = hexToRgb(hex);
    image.data[index * 4] = r;
    image.data[index * 4 + 1] = g;
    image.data[index * 4 + 2] = b;
    image.data[index * 4 + 3] = 255;
  });
  context.putImageData(image, 0, 0);
  return canvas;
}

const dataUrlCache = new Map();

// For React screens: a crisp PNG of any sprite at an integer scale.
export function spriteDataUrl(key, scale = 4) {
  const cacheKey = `${key}@${scale}`;
  if (!dataUrlCache.has(cacheKey)) {
    dataUrlCache.set(cacheKey, gridToCanvas(SPRITES[key], scale).toDataURL());
  }
  return dataUrlCache.get(cacheKey);
}

export function spriteSize(key) {
  return { width: SPRITES[key][0].length, height: SPRITES[key].length };
}

const ANIMATIONS = [
  { key: 'spin-down', frames: ['spin-down-0', 'spin-down-1'], frameRate: 7 },
  { key: 'spin-up', frames: ['spin-up-0', 'spin-up-1'], frameRate: 7 },
  { key: 'spin-side', frames: ['spin-side-0', 'spin-side-1'], frameRate: 7 },
  { key: 'goon-walk', frames: ['goon-0', 'goon-1'], frameRate: 4 },
  { key: 'brute-walk', frames: ['brute-0', 'brute-1'], frameRate: 3 },
  { key: 'engine-hum', frames: ['engine-0', 'engine-1'], frameRate: 3 }
];

export function registerArt(scene) {
  Object.entries(SPRITES).forEach(([key, rows]) => {
    if (!scene.textures.exists(key)) {
      scene.textures.addCanvas(key, gridToCanvas(rows));
    }
  });

  ANIMATIONS.forEach(({ key, frames, frameRate }) => {
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: frames.map((frame) => ({ key: frame })),
        frameRate,
        repeat: -1
      });
    }
  });
}

export function registerBoard(scene, floor) {
  const key = `board-${floor.id}`;
  if (!scene.textures.exists(key)) {
    scene.textures.addCanvas(key, boardToCanvas(floor.rows, floor.theme));
  }
  return key;
}
