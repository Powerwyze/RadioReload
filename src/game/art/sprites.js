import {
  blankGrid,
  fillDisc,
  fillRect,
  outline,
  setPixel,
  strokeRect,
  toRows
} from './pixelGrid.js';

// Every character and prop in the game. Hand-drawn grids use palette keys from palette.js;
// the round and mechanical props are generated so their circles stay clean.

const SPIN_HEAD = [
  '................',
  '...kkkkkkkkkk...',
  '..kddbbbbbbddk..',
  '..kdbbvyyvbbsk..',
  '..kdbvyrryvbsk..',
  '..kdbbvyyvbbgk..',
  '..kddbbbbbbddk..',
  '..kgssssssssgk..'
];

const SPIN_DOWN_0 = [
  ...SPIN_HEAD,
  'kkkkcckkkkcckkkk',
  'kddkgssssssgkddk',
  'kdgkssGGyrsskgdk',
  'kddkgssssssgkddk',
  '.kk.kggssggk.kk.',
  '....kddkkddk....',
  '..ksssk..ksssk..',
  '..kkkkk..kkkkk..'
];

const SPIN_DOWN_1 = [
  ...SPIN_HEAD,
  'kkkkcckkkkcckkkk',
  'kddkgssssssgkddk',
  'kdgkssGGyGsskgdk',
  'kddkgssssssgkddk',
  '.kk.kggssggk.kk.',
  '....kddkkddk....',
  '...ksssk.kddk...',
  '...kkkkk.ksssk..'
];

const SPIN_UP_HEAD = [
  '................',
  '...kkkkkkkkkk...',
  '..kddbbbbbbddk..',
  '..ksbbvyyvbbdk..',
  '..ksbvyrryvbdk..',
  '..kgbbvyyvbbdk..',
  '..kddbbbbbbddk..',
  '..kgssssssssgk..'
];

const SPIN_UP_0 = [
  ...SPIN_UP_HEAD,
  'kkkkggggggggkkkk',
  'kddkgkkkkkkgkddk',
  'kdgkkdggggdkkgdk',
  'kddkgkkkkkkgkddk',
  '.kk.kggggggk.kk.',
  '....kddkkddk....',
  '..ksssk..ksssk..',
  '..kkkkk..kkkkk..'
];

const SPIN_UP_1 = [
  ...SPIN_UP_HEAD,
  'kkkkggggggggkkkk',
  'kddkgkkkkkkgkddk',
  'kdgkkdgcgcdkkgdk',
  'kddkgkkkkkkgkddk',
  '.kk.kggggggk.kk.',
  '....kddkkddk....',
  '..kddk..ksssk...',
  '..ksssk.kkkkk...'
];

const SPIN_SIDE_HEAD = [
  '................',
  '....kkkkkkkkk...',
  '...kddbbbbbddk..',
  '...kdbvyyvbbsk..',
  '...kbvyrryvbsk..',
  '...kdbvyyvbbgk..',
  '...kddbbbbbddk..',
  '...kgssssssssk..',
  '...kkkkkkkkcck..'
];

const SPIN_SIDE_0 = [
  ...SPIN_SIDE_HEAD,
  '....kkkkkkkkk...',
  '....kdddkssgk...',
  '....kdgdkcGgk...',
  '....kdddkssgk...',
  '.....kkkkkkk....',
  '.....kddkddk....',
  '.....ksssksssk..'
];

const SPIN_SIDE_1 = [
  ...SPIN_SIDE_HEAD,
  '....kkkkkkkkk...',
  '....kdddkssgk...',
  '....kdgdkGcgk...',
  '....kdddkssgk...',
  '.....kkkkkkk....',
  '....kddk.kddk...',
  '...ksssk.ksssk..'
];

const TUNE_RAY = [
  '..kkkkkk...k',
  '..k....k..k.',
  'kkkkkkkkkkk.',
  'krrrrrrrrrrk',
  'kgdgkcckgdgk',
  'kdkdkCCkdkdk',
  'kgdgkrrkgdgk',
  'kkkkkkkkkkkk'
];

const GOON_TOP = [
  '.......kkk......',
  '......kbbbk.....',
  '.....kbkkbbk....',
  '.....kbk.kbk....',
  '....kkbbkbbkk...',
  '...klllllllllk..',
  '...krrrrkrrrrk..',
  '...klllllllllk..',
  '....kllLLLllk...',
  '...kkkkkkkkkkk..',
  '..kPPPPeyePPPPk.',
  '..kPqPPeeePPqPk.',
  '..kkPPPPePPPPkk.'
];

const GOON_0 = [
  ...GOON_TOP,
  '..klkPPPPPPPklk.',
  '....kbbk.kbbk...',
  '....kkkk.kkkk...'
];

const GOON_1 = [
  ...GOON_TOP,
  '..klkPPPPPPPklk.',
  '...kbbk...kbbk..',
  '...kkkk...kkkk..'
];

const BRUTE_TOP = [
  '....................',
  '.......kkkkkk.......',
  '......kbbbbbbk......',
  '.....kbbbbbbbbk..kk.',
  '.....kbbkkkkkbk.kyyk',
  '.....kbklllllkk..kk.',
  '.....kllbbbbllk.kyyk',
  '.....kllllllllk..kk.',
  '......klLLLLlk......',
  '...kkkkkkkkkkkkkk...',
  '..kRRRRRReeRRRRRRk..',
  '.kRRRRRRReeRRRRRRRk.',
  '.kRRKRRRReeRRRRKRRk.',
  '.kRRKRRRRRRRRRRKRRk.'
];

const BRUTE_0 = [
  ...BRUTE_TOP,
  '.kllkRRRRRRRRRRkllk.',
  '.kllkRRRRRRRRRRkllk.',
  '..kk.kRRRRRRRRk.kk..',
  '.....kbbbkkbbbk.....',
  '....kbbbbk.kbbbbk...',
  '....kkkkkk.kkkkkk...'
];

const BRUTE_1 = [
  ...BRUTE_TOP,
  '..kllkRRRRRRRRRkllk.',
  '..kllkRRRRRRRRRkllk.',
  '...kk.kRRRRRRRk.kk..',
  '.....kbbbkkbbbk.....',
  '.....kbbbk..kbbbbk..',
  '.....kkkkk..kkkkkk..'
];

const KILO = [
  '................',
  '......kkkk......',
  '.....khhNhk.....',
  '....khNhhhhk....',
  '....khhhhNhk....',
  '...kkhNhhhhkk...',
  '...knnnnnnnnk...',
  '...knkkyykknk...',
  '...knnnnnnnnk...',
  '....knnwwnnk....',
  '....kyynnyyk....',
  '..kPPPPeePPPPk..',
  '.kPPPPPeePyPPk..',
  '.kPqPPPeePyPqPk.',
  '.kPqPPPeePPPqPk.',
  '.knkPPPPPPPPknk.',
  '.kkkPPPPPPPPkkk.',
  '...kuuuuuuuuk...',
  '...kuuuUUuuuk...',
  '...kuuukkuuuk...',
  '...kuuukkuuuk...',
  '...kwwwkkwwwk...',
  '...kkkkkkkkkk...',
  '................'
];

const KILO_TIED = [
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '..k.khhhhhhk.k..',
  '.ktkknnnnnnkktk.',
  '.ktknknnnnknktk.',
  '.ktknnnnnnnnktk.',
  '.ktkkRRRRRRkktk.',
  '.ktkkyyPPyykktk.',
  '.ktkTTTTTTTTktk.',
  '.ktkPPPeePPPktk.',
  '.ktkTTTTTTTTktk.',
  '.kttkPPPPPPkttk.',
  '.ktttkuuuuktttk.',
  '..kk.kuuuuk.kk..',
  '..kt.kuuuuk.tk..',
  '..kk.kwwwwk.kk..'
];

const BASSOLINI = [
  '....................',
  '......kkkkkkkk......',
  '.....kqqqqqqqqk.....',
  '.....kqqqqqqqqk.....',
  '.....kyyyyyyyyk.....',
  '..kkkqqqqqqqqqqkkk..',
  '..kqqqqqqqqqqqqqqk..',
  '.....kffffffffk.....',
  '.....kbbbffbbbk.....',
  '.....kffffffffk.....',
  '.....kfFkkkkFfk.....',
  '......kFffffFk......',
  '...kkkkkyyyykkkkk...',
  '..kpqpqpyeeypqpqpk..',
  '.kpqpqpqpyypqpqpqpk.',
  '.kpqpqpqpYYpqpqpqpk.',
  '.kpqpqpqpqpqpqpqpqk.',
  '.kfkpqpqpqpqpqpqkfk.',
  '.kkkpqpqpqpqpqpqkkk.',
  '....kqqqqqqqqqqk....',
  '....kqqqqkkqqqqk....',
  '....kqqqk..kqqqk....',
  '....kbbbbk.kbbbbk...',
  '....kkkkkk.kkkkkk...'
];

const BATTERY = [
  '...kk...',
  '..kssk..',
  '.kkkkkk.',
  '.kyyyyk.',
  '.kbbcbk.',
  '.kbccbk.',
  '.kbcbbk.',
  '.kcbbbk.',
  '.kbbbbk.',
  '.kggggk.',
  '.kkkkkk.'
];

function makeRecord() {
  const grid = blankGrid(14, 14);
  fillDisc(grid, 7, 7, 7, 'k');
  fillDisc(grid, 7, 7, 6.2, 'b');
  for (let row = 0; row < 14; row += 1) {
    for (let col = 0; col < 14; col += 1) {
      const distance = Math.hypot(col + 0.5 - 7, row + 0.5 - 7);
      if (Math.abs(distance - 4.8) < 0.45 && (col + row) % 3 !== 0) {
        grid[row][col] = 'v';
      }
    }
  }
  fillDisc(grid, 7, 7, 3.3, 'y');
  // The K label.
  [
    [5, 5],
    [5, 6],
    [5, 7],
    [5, 8],
    [6, 7],
    [7, 6],
    [8, 5],
    [7, 8],
    [8, 9]
  ].forEach(([x, y]) => setPixel(grid, x, y, 'R'));
  setPixel(grid, 3, 4, 'w');
  setPixel(grid, 4, 3, 'w');
  return toRows(grid);
}

// Concentric sound-wave arcs, white so the scene can tint them by tier.
function makeBlast() {
  const grid = blankGrid(8, 12);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const distance = Math.hypot(col + 0.5 + 2, row + 0.5 - 6);
      if (Math.abs(distance - 4) < 0.7 || Math.abs(distance - 8) < 0.7) {
        grid[row][col] = 'w';
      }
    }
  }
  return toRows(grid);
}

function makeMuzzle() {
  return [
    '...w...',
    '.w.w.w.',
    '..www..',
    'wwwwwww',
    '..www..',
    '.w.w.w.',
    '...w...'
  ];
}

function makeElevator(open) {
  const grid = blankGrid(16, 16);
  fillRect(grid, 0, 0, 16, 16, 'k');
  fillRect(grid, 1, 1, 14, 15, 'Y');
  fillRect(grid, 2, 4, 12, 12, open ? 'b' : 's');
  if (open) {
    fillRect(grid, 2, 4, 2, 12, 'g');
    fillRect(grid, 12, 4, 2, 12, 'g');
    fillRect(grid, 4, 13, 8, 3, 'K');
  } else {
    fillRect(grid, 7, 4, 2, 12, 'g');
    setPixel(grid, 7, 4, 'k');
    setPixel(grid, 8, 4, 'k');
    fillRect(grid, 3, 6, 3, 1, 'g');
    fillRect(grid, 10, 6, 3, 1, 'g');
  }
  // Floor indicator lamp: red when locked, green when the elevator is cued.
  fillRect(grid, 6, 1, 4, 2, 'k');
  fillRect(grid, 7, 1, 2, 2, open ? 'G' : 'r');
  strokeRect(grid, 2, 4, 12, 12, 'k');
  return toRows(grid);
}

function makeEngine(frame) {
  const grid = blankGrid(48, 32);
  // Antenna and dishes.
  fillRect(grid, 23, 0, 2, 7, 'g');
  setPixel(grid, 23, 0, frame ? 'r' : 'w');
  setPixel(grid, 24, 0, frame ? 'r' : 'w');
  fillRect(grid, 6, 3, 8, 3, 'g');
  fillRect(grid, 34, 3, 8, 3, 'g');
  // Cabinet.
  fillRect(grid, 0, 6, 48, 26, 'd');
  fillRect(grid, 1, 7, 46, 2, 'g');
  // Warning lights across the top lip.
  for (let col = 3; col < 46; col += 4) {
    const lit = ((col - 3) / 4 + frame) % 2 === 0;
    fillRect(grid, col, 7, 2, 2, lit ? 'r' : 'R');
  }
  // Two big speaker cones.
  [10.5, 37.5].forEach((cx) => {
    const pulse = frame ? 0.6 : 0;
    fillDisc(grid, cx, 19.5, 8.6, 'k');
    fillDisc(grid, cx, 19.5, 7.8, 'g');
    fillDisc(grid, cx, 19.5, 6.4 + pulse, 'd');
    fillDisc(grid, cx, 19.5, 4.2 + pulse, 'b');
    fillDisc(grid, cx, 19.5, 2, frame ? 'R' : 'g');
  });
  // Centre screen with a flat-lined waveform.
  fillRect(grid, 20, 11, 8, 15, 'k');
  fillRect(grid, 21, 12, 6, 13, 'U');
  fillRect(grid, 21, 18, 6, 1, 'r');
  if (frame) {
    setPixel(grid, 23, 17, 'r');
    setPixel(grid, 24, 16, 'r');
    setPixel(grid, 25, 17, 'r');
  }
  // Hazard stripes.
  for (let col = 1; col < 47; col += 1) {
    for (let row = 28; row < 31; row += 1) {
      grid[row][col] = (col + row) % 6 < 3 ? 'y' : 'k';
    }
  }
  strokeRect(grid, 0, 6, 48, 26, 'k');
  return toRows(outline(grid));
}

export const SPRITES = {
  'spin-down-0': SPIN_DOWN_0,
  'spin-down-1': SPIN_DOWN_1,
  'spin-up-0': SPIN_UP_0,
  'spin-up-1': SPIN_UP_1,
  'spin-side-0': SPIN_SIDE_0,
  'spin-side-1': SPIN_SIDE_1,
  'tune-ray': TUNE_RAY,
  'goon-0': GOON_0,
  'goon-1': GOON_1,
  'brute-0': BRUTE_0,
  'brute-1': BRUTE_1,
  kilo: KILO,
  'kilo-tied': KILO_TIED,
  bassolini: BASSOLINI,
  battery: BATTERY,
  record: makeRecord(),
  blast: makeBlast(),
  muzzle: makeMuzzle(),
  'elevator-closed': makeElevator(false),
  'elevator-open': makeElevator(true),
  'engine-0': makeEngine(0),
  'engine-1': makeEngine(1)
};

// Throws on ragged rows or unknown colours so a typo in a grid fails loudly at startup.
export function validateSprites(sprites, palette) {
  Object.entries(sprites).forEach(([key, rows]) => {
    const width = rows[0].length;
    rows.forEach((line, index) => {
      if (line.length !== width) {
        throw new Error(`Sprite ${key} row ${index} is ${line.length} wide, expected ${width}.`);
      }
      line.split('').forEach((char) => {
        if (char !== '.' && !(char in palette)) {
          throw new Error(`Sprite ${key} uses unknown colour "${char}".`);
        }
      });
    });
  });
}
