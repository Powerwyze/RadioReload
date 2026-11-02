import { gridToCanvas } from './textures.js';
import { SPRITES } from './sprites.js';

// Pixel painters for every cutscene panel. Each draws a 256x144 frame; `t` is seconds since
// the panel opened, for twinkles, bobs and falling goons.
export const PANEL_WIDTH = 256;
export const PANEL_HEIGHT = 144;

const spriteCache = new Map();

function spriteCanvas(key, tint = null) {
  const cacheKey = `${key}:${tint ?? ''}`;
  if (!spriteCache.has(cacheKey)) {
    const base = gridToCanvas(SPRITES[key]);
    if (tint) {
      const context = base.getContext('2d');
      context.globalCompositeOperation = 'source-in';
      context.fillStyle = tint;
      context.fillRect(0, 0, base.width, base.height);
    }
    spriteCache.set(cacheKey, base);
  }
  return spriteCache.get(cacheKey);
}

function rand(seed) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Draws a sprite with its feet at (x, baseY), scaled by an integer.
function sprite(ctx, key, x, baseY, scale = 1, { flip = false, tint = null, alpha = 1 } = {}) {
  const image = spriteCanvas(key, tint);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(baseY - h));
  if (flip) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(image, 0, 0, w, h);
  ctx.restore();
}

function skyBands(ctx, bands, top = 0, bottom = PANEL_HEIGHT) {
  const step = (bottom - top) / bands.length;
  bands.forEach((color, index) => rect(ctx, 0, top + index * step, PANEL_WIDTH, step + 1, color));
}

function stars(ctx, t, seed = 3, count = 46, maxY = 80) {
  const r = rand(seed);
  for (let index = 0; index < count; index += 1) {
    const x = r() * PANEL_WIDTH;
    const y = r() * maxY;
    const phase = r() * 6;
    const lit = Math.sin(t * 2 + phase) > -0.3;
    rect(ctx, x, y, 1, 1, lit ? '#e8e4ff' : '#6d5fa8');
  }
}

function skyline(ctx, t, { seed = 9, base = 144, color = '#120d24', windows = '#ffd23f', minH = 24, maxH = 70 } = {}) {
  const r = rand(seed);
  let x = -4;
  while (x < PANEL_WIDTH) {
    const w = 10 + Math.floor(r() * 18);
    const h = minH + Math.floor(r() * (maxH - minH));
    rect(ctx, x, base - h, w, h, color);
    for (let wy = base - h + 4; wy < base - 4; wy += 5) {
      for (let wx = x + 2; wx < x + w - 2; wx += 4) {
        if (r() < 0.28) {
          rect(ctx, wx, wy, 2, 2, r() < 0.15 ? '#ff9fd8' : windows);
        }
      }
    }
    x += w + 1;
  }
}

function tunezTower(ctx, t, x = 108, top = 18, width = 40) {
  rect(ctx, x, top, width, PANEL_HEIGHT - top, '#1c1338');
  rect(ctx, x + 2, top, 2, PANEL_HEIGHT - top, '#2c2056');
  // Windows: rows of studios, a few always lit.
  const r = rand(77);
  for (let y = top + 16; y < PANEL_HEIGHT - 4; y += 6) {
    for (let wx = x + 5; wx < x + width - 4; wx += 5) {
      const on = r() < 0.4;
      rect(ctx, wx, y, 3, 3, on ? (r() < 0.2 ? '#5cf4ff' : '#ffd23f') : '#120d24');
    }
  }
  // Penthouse crown and sign.
  rect(ctx, x - 4, top - 2, width + 8, 12, '#2a1846');
  rect(ctx, x - 4, top - 2, width + 8, 2, '#d4a531');
  rect(ctx, x + 6, top + 2, width - 12, 5, '#ffd23f');
  rect(ctx, x + 8, top + 3, width - 16, 3, '#b98a12');
  // Antenna with a blinking beacon.
  rect(ctx, x + width / 2 - 1, top - 16, 2, 14, '#9aa5ba');
  rect(ctx, x + width / 2 - 2, top - 18, 4, 3, Math.sin(t * 4) > 0 ? '#ff4d6d' : '#5a1624');
}

function studioRoom(ctx, t, { dark = false } = {}) {
  // Back wall with a wide window onto the city.
  rect(ctx, 0, 0, PANEL_WIDTH, PANEL_HEIGHT, '#1b1230');
  rect(ctx, 16, 10, 224, 62, '#0c0a16');
  skyBands(ctx, ['#140e2c', '#1d1440', '#2a1a52'], 12, 70);
  ctx.save();
  ctx.beginPath();
  ctx.rect(18, 12, 220, 58);
  ctx.clip();
  stars(ctx, t, 5, 30, 30);
  skyline(ctx, t, { seed: 21, base: 70, minH: 12, maxH: 44 });
  ctx.restore();
  for (let x = 16; x <= 240; x += 56) {
    rect(ctx, x, 10, 3, 62, '#d4a531');
  }
  rect(ctx, 16, 10, 227, 3, '#d4a531');
  rect(ctx, 16, 70, 227, 3, '#d4a531');
  // Carpet.
  rect(ctx, 0, 100, PANEL_WIDTH, 44, '#2a1846');
  for (let x = 0; x < PANEL_WIDTH; x += 8) {
    rect(ctx, x, 100 + ((x / 8) % 2) * 4, 1, 44, '#33205a');
  }
  rect(ctx, 0, 98, PANEL_WIDTH, 3, '#120d24');
  // Speaker towers.
  [6, 222].forEach((x) => {
    rect(ctx, x, 54, 28, 50, '#121216');
    rect(ctx, x + 2, 56, 24, 46, '#22222a');
    [64, 86].forEach((cy) => {
      ctx.fillStyle = '#5b5b69';
      ctx.beginPath();
      ctx.arc(x + 14, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#121216';
      ctx.beginPath();
      ctx.arc(x + 14, cy, 6 + (dark ? 0 : Math.sin(t * 9) * 0.6), 0, Math.PI * 2);
      ctx.fill();
    });
  });
  // Mixing console.
  rect(ctx, 76, 84, 104, 20, '#121216');
  rect(ctx, 76, 82, 104, 4, '#525a70');
  for (let x = 82; x < 176; x += 6) {
    const lit = !dark && Math.sin(t * 6 + x) > 0.2;
    rect(ctx, x, 88, 2, 8, '#2b2440');
    rect(ctx, x, 90 + ((x * 7) % 5), 2, 2, lit ? '#5dff8f' : '#9aa5ba');
  }
  rect(ctx, 80, 104, 6, 12, '#121216');
  rect(ctx, 170, 104, 6, 12, '#121216');
  // Gear rack, Tune Ray on top.
  rect(ctx, 192, 76, 26, 40, '#22252e');
  for (let y = 80; y < 112; y += 8) {
    rect(ctx, 194, y, 22, 6, '#3d4150');
    rect(ctx, 196, y + 2, 3, 2, dark ? '#5a1624' : '#ff4d6d');
  }
  sprite(ctx, 'tune-ray', 193, 76, 2);
}

function darken(ctx, alpha) {
  rect(ctx, 0, 0, PANEL_WIDTH, PANEL_HEIGHT, `rgba(4, 2, 10, ${alpha})`);
}

function lampCone(ctx, x, color = 'rgba(255, 51, 85, 0.18)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 4, 8);
  ctx.lineTo(x + 4, 8);
  ctx.lineTo(x + 46, PANEL_HEIGHT);
  ctx.lineTo(x - 46, PANEL_HEIGHT);
  ctx.closePath();
  ctx.fill();
  rect(ctx, x - 1, 0, 2, 6, '#5b5b69');
  rect(ctx, x - 6, 6, 12, 4, '#ff3355');
}

function lairRoom(ctx) {
  rect(ctx, 0, 0, PANEL_WIDTH, PANEL_HEIGHT, '#121216');
  for (let x = 0; x < PANEL_WIDTH; x += 32) {
    rect(ctx, x, 8, 30, 86, '#1a1a20');
    ctx.fillStyle = '#26262c';
    [28, 62].forEach((cy) => {
      ctx.beginPath();
      ctx.arc(x + 15, cy, 11, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  rect(ctx, 0, 96, PANEL_WIDTH, 48, '#26262c');
  rect(ctx, 0, 96, PANEL_WIDTH, 2, '#3a3a47');
  for (let x = 0; x < PANEL_WIDTH; x += 12) {
    rect(ctx, x, 140, 6, 4, '#d9a91c');
  }
}

function waves(ctx, x, y, t, color, count = 3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let index = 0; index < count; index += 1) {
    const radius = ((t * 30 + index * 14) % 42) + 6;
    ctx.globalAlpha = 1 - radius / 48;
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const PAINTERS = {
  tower(ctx, t) {
    skyBands(ctx, ['#07051a', '#0d0a26', '#140e33', '#1d1442', '#291a52', '#3a2160']);
    stars(ctx, t);
    ctx.fillStyle = '#f4ecc2';
    ctx.beginPath();
    ctx.arc(212, 26, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9cf9f';
    ctx.beginPath();
    ctx.arc(208, 23, 3, 0, Math.PI * 2);
    ctx.fill();
    skyline(ctx, t, { seed: 4, color: '#0f0b20', minH: 30, maxH: 64 });
    tunezTower(ctx, t);
    skyline(ctx, t, { seed: 12, color: '#08060f', minH: 10, maxH: 34, windows: '#7d6bd0' });
  },
  studio(ctx, t) {
    studioRoom(ctx, t);
    sprite(ctx, 'kilo', 100, 112, 2);
    // Spin on the charging stand, still dark.
    rect(ctx, 134, 108, 36, 6, '#525a70');
    sprite(ctx, 'spin-down-0', 136, 108, 2, { alpha: 0.65 });
  },
  'studio-online'(ctx, t) {
    studioRoom(ctx, t);
    sprite(ctx, 'kilo', 100, 112, 2);
    rect(ctx, 134, 108, 36, 6, '#525a70');
    ctx.fillStyle = `rgba(92, 244, 255, ${0.18 + Math.sin(t * 5) * 0.08})`;
    ctx.beginPath();
    ctx.arc(152, 90, 26, 0, Math.PI * 2);
    ctx.fill();
    sprite(ctx, 'spin-down-0', 136, 108 - Math.abs(Math.sin(t * 3)) * 2, 2);
    waves(ctx, 152, 70, t, '#5cf4ff');
  },
  'dead-air'(ctx, t) {
    studioRoom(ctx, t, { dark: true });
    darken(ctx, 0.62);
    // The skylight shatters and goons drop in.
    const r = rand(31);
    for (let index = 0; index < 24; index += 1) {
      const x = 30 + r() * 200;
      const y = ((r() * 60 + t * 70) % 110) - 10;
      rect(ctx, x, y, 2, 3, '#b9e6ff');
    }
    [60, 170, 205].forEach((x, index) => {
      const fall = Math.min(1, Math.max(0, t * 0.9 - index * 0.3));
      sprite(ctx, 'goon-0', x, 20 + fall * 92, 2);
    });
    sprite(ctx, 'kilo', 100, 112, 2, { tint: '#2b2440' });
    sprite(ctx, 'spin-down-0', 136, 108, 2, { tint: '#2b2440' });
    rect(ctx, 96, 56, 64, 12, '#15111f');
    rect(ctx, 100, 61, 56, 2, '#ff4d6d');
  },
  bassolini(ctx, t) {
    studioRoom(ctx, t, { dark: true });
    darken(ctx, 0.55);
    // The studio monitor hijacked by Bassolini's broadcast.
    rect(ctx, 70, 14, 116, 82, '#15111f');
    rect(ctx, 74, 18, 108, 74, '#2e1b57');
    ctx.save();
    ctx.beginPath();
    ctx.rect(74, 18, 108, 74);
    ctx.clip();
    for (let y = 18; y < 92; y += 4) {
      rect(ctx, 74, y, 108, 2, '#3a2270');
    }
    sprite(ctx, 'bassolini', 98, 104 + Math.sin(t * 2) * 1.5, 3);
    rect(ctx, 74, ((t * 40) % 80) + 14, 108, 3, 'rgba(255,255,255,0.08)');
    ctx.restore();
    rect(ctx, 120, 96, 16, 8, '#15111f');
    sprite(ctx, 'goon-0', 30, 120, 2, { tint: '#120d24' });
    sprite(ctx, 'goon-0', 196, 120, 2, { tint: '#120d24', flip: true });
  },
  kidnap(ctx, t) {
    rect(ctx, 0, 0, PANEL_WIDTH, PANEL_HEIGHT, '#1b1230');
    rect(ctx, 0, 100, PANEL_WIDTH, 44, '#2a1846');
    // Elevator, doors open.
    rect(ctx, 92, 18, 72, 84, '#b98a12');
    rect(ctx, 98, 30, 60, 72, '#15111f');
    rect(ctx, 98, 30, 8, 72, '#9aa5ba');
    rect(ctx, 150, 30, 8, 72, '#9aa5ba');
    rect(ctx, 122, 21, 12, 6, '#15111f');
    rect(ctx, 125, 22, 6, 4, '#ff4d6d');
    darken(ctx, 0.3);
    const tug = Math.sin(t * 6) * 1.5;
    sprite(ctx, 'goon-0', 102 + tug, 104, 2);
    sprite(ctx, 'kilo', 114, 106, 2);
    sprite(ctx, 'goon-1', 130 - tug, 104, 2, { flip: true });
    sprite(ctx, 'spin-up-0', 112, 150, 3);
  },
  'gear-rack'(ctx, t) {
    rect(ctx, 0, 0, PANEL_WIDTH, PANEL_HEIGHT, '#140e24');
    rect(ctx, 120, 10, 120, 134, '#22252e');
    for (let y = 18; y < 140; y += 26) {
      rect(ctx, 124, y, 112, 20, '#2b2e38');
      rect(ctx, 124, y + 18, 112, 3, '#15111f');
      for (let x = 130; x < 230; x += 10) {
        rect(ctx, x, y + 6, 4, 4, (x + y) % 3 ? '#3d4150' : '#ff4d6d');
      }
    }
    ctx.fillStyle = `rgba(255, 210, 63, ${0.22 + Math.sin(t * 4) * 0.08})`;
    ctx.beginPath();
    ctx.arc(180, 58, 30, 0, Math.PI * 2);
    ctx.fill();
    sprite(ctx, 'tune-ray', 144, 80 - Math.abs(Math.sin(t * 2)) * 3, 6);
    sprite(ctx, 'spin-side-0', 16, 140, 6);
    const sparkle = (t * 2) % 1;
    rect(ctx, 214, 30 + sparkle * 4, 2, 6, '#fff1b0');
    rect(ctx, 212, 32 + sparkle * 4, 6, 2, '#fff1b0');
  },
  mission(ctx, t) {
    skyBands(ctx, ['#07051a', '#0d0a26', '#140e33', '#1d1442']);
    stars(ctx, t, 8, 30, 140);
    // A cross-section of the tower with the route down.
    rect(ctx, 96, 6, 64, 138, '#1c1338');
    const stops = [
      { y: 12, label: '50', color: '#9b5cff' },
      { y: 40, label: '38', color: '#22d3c5' },
      { y: 70, label: '21', color: '#c9a227' },
      { y: 100, label: '1', color: '#e9e6df' },
      { y: 128, label: 'B3', color: '#ff3355' }
    ];
    stops.forEach((stop, index) => {
      rect(ctx, 96, stop.y, 64, 12, '#2a1d4f');
      rect(ctx, 98, stop.y + 2, 60, 8, stop.color);
      rect(ctx, 100, stop.y + 4, 56, 4, 'rgba(10, 6, 20, 0.55)');
      if (index < stops.length - 1) {
        for (let y = stop.y + 13; y < stops[index + 1].y; y += 4) {
          rect(ctx, 127, y, 2, 2, '#ffd23f');
        }
      }
    });
    const progress = (t * 0.35) % 1;
    sprite(ctx, 'spin-down-0', 120, 22 + progress * 112, 1);
    sprite(ctx, 'kilo-tied', 176, 142, 1);
    sprite(ctx, 'record', 60, 50 + Math.sin(t * 2) * 2, 2);
    sprite(ctx, 'record', 190, 80 + Math.cos(t * 2) * 2, 2);
  },
  'engine-down'(ctx, t) {
    lairRoom(ctx);
    const shake = Math.sin(t * 40) * Math.max(0, 2 - t);
    sprite(ctx, 'engine-1', 80 + shake, 112, 2);
    const r = rand(Math.floor(t * 6));
    for (let index = 0; index < 10; index += 1) {
      const x = 80 + r() * 96;
      const y = 50 + r() * 60;
      const size = 3 + r() * 8;
      rect(ctx, x, y, size, size, r() < 0.5 ? '#ffd23f' : '#ff4d6d');
    }
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, 0.6 - t * 0.3)})`;
    ctx.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    waves(ctx, 128, 60, t, '#5dff8f', 4);
  },
  escape(ctx, t) {
    lairRoom(ctx);
    lampCone(ctx, 160);
    // A hatch in the floor and a ladder going down.
    rect(ctx, 130, 112, 60, 14, '#08080b');
    rect(ctx, 132, 112, 56, 2, '#d9a91c');
    const sink = Math.min(30, t * 12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, PANEL_WIDTH, 118);
    ctx.clip();
    sprite(ctx, 'bassolini', 140, 118 + sink, 3);
    ctx.restore();
    sprite(ctx, 'spin-side-0', 20, 130, 3);
  },
  rescue(ctx, t) {
    lairRoom(ctx);
    lampCone(ctx, 128, 'rgba(255, 210, 63, 0.16)');
    rect(ctx, 96, 120, 30, 3, '#c9965a');
    rect(ctx, 104, 124, 22, 2, '#7a4b2a');
    sprite(ctx, 'kilo', 132, 126, 3);
    sprite(ctx, 'spin-side-0', 76, 126 - Math.abs(Math.sin(t * 3)) * 2, 3);
    waves(ctx, 160, 46, t, '#ffd23f', 2);
  },
  dawn(ctx, t) {
    skyBands(ctx, ['#2a1a52', '#5a2a6e', '#a8457a', '#e0686b', '#f59a5c', '#ffd27a']);
    ctx.fillStyle = '#fff1b0';
    ctx.beginPath();
    ctx.arc(196, 98, 18, 0, Math.PI * 2);
    ctx.fill();
    skyline(ctx, t, { seed: 4, color: '#3a1d4a', windows: '#ffb36b', minH: 20, maxH: 60 });
    // The roof of Tunez Tower.
    rect(ctx, 0, 110, PANEL_WIDTH, 34, '#1c1338');
    rect(ctx, 0, 108, PANEL_WIDTH, 3, '#d4a531');
    for (let x = 4; x < PANEL_WIDTH; x += 10) {
      rect(ctx, x, 98, 2, 10, '#9aa5ba');
    }
    rect(ctx, 0, 98, PANEL_WIDTH, 2, '#9aa5ba');
    sprite(ctx, 'kilo', 92, 112, 2);
    sprite(ctx, 'spin-down-1', 128, 112 - Math.abs(Math.sin(t * 4)) * 3, 2);
    waves(ctx, 144, 72, t, '#ffffff', 3);
  },
  captive(ctx, t) {
    lairRoom(ctx);
    darken(ctx, 0.35);
    const sway = Math.sin(t * 1.4) * 6;
    lampCone(ctx, 128 + sway);
    sprite(ctx, 'kilo-tied', 104, 128, 3);
    sprite(ctx, 'bassolini', 196, 128, 3, { tint: '#08080b' });
    sprite(ctx, 'goon-0', 16, 128, 3, { tint: '#08080b' });
  }
};

export function paintPanel(ctx, sceneId, t) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
  (PAINTERS[sceneId] ?? PAINTERS.tower)(ctx, t);
}
