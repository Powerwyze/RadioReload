// The Descent: five floors of Tunez Tower, top to bottom. Layouts are 21x17.
// '#' wall, '.' floor, 'E' Dead Air Engine, 'B' Bassolini, 'K' Kilo, 'x' booth floor.

export const FLOORS = [
  {
    id: 'penthouse',
    theme: 'penthouse',
    label: 'Floor 50',
    name: 'The Penthouse',
    flavor: "Kilo's studio. Glass is everywhere and the goons are still tracking mud on the carpet.",
    objective: 'Find 3 K-records to cue the elevator.',
    recordsToOpen: 3,
    enemies: ['chaser', 'drifter', 'chaser'],
    baseAggression: 0,
    playerStart: { row: 15, col: 10 },
    elevator: { row: 0, col: 10 },
    spawns: [
      { row: 1, col: 1 },
      { row: 1, col: 19 },
      { row: 7, col: 1 },
      { row: 7, col: 19 }
    ],
    rows: [
      '#####################',
      '#...................#',
      '#.#######.#.#######.#',
      '#.#.....#.#.#.....#.#',
      '#.#.###.#.#.#.###.#.#',
      '#.#...#...#...#...#.#',
      '#.###.#########.###.#',
      '#.#...............#.#',
      '#.#.#.###.#.###.#.#.#',
      '#...#.....#.....#...#',
      '#.#.#.#########.#.#.#',
      '#...#.#.......#.#...#',
      '###.#.#.#.#.#.#.#.###',
      '#...#...#.#.#...#...#',
      '#.#.#####.#.#####.#.#',
      '#...................#',
      '#####################'
    ]
  },
  {
    id: 'studio',
    theme: 'studio',
    label: 'Floor 38',
    name: 'Studio Row',
    flavor: 'Twelve recording booths. Every one has its door kicked in.',
    objective: 'Find 3 K-records to cue the elevator.',
    recordsToOpen: 3,
    enemies: ['chaser', 'cutter', 'drifter', 'chaser'],
    baseAggression: 1,
    playerStart: { row: 15, col: 10 },
    elevator: { row: 0, col: 10 },
    spawns: [
      { row: 1, col: 1 },
      { row: 1, col: 19 },
      { row: 7, col: 1 },
      { row: 7, col: 19 }
    ],
    rows: [
      '#####################',
      '#.....#.......#.....#',
      '#.###.#.#.#.#.#.###.#',
      '#.....#...#...#.....#',
      '#.#####.#.#.#.#####.#',
      '#.#.....#.#.#.....#.#',
      '#.#.#.###.#.###.#.#.#',
      '#.....#...#...#.....#',
      '#####.#.#.#.#.#.#####',
      '#.....#...#...#.....#',
      '#.#####.#####.#####.#',
      '#.......#...#.......#',
      '#.#######.#.#######.#',
      '#...#...#.#.#...#...#',
      '#.#.#.#.#.#.#.#.#.#.#',
      '#...................#',
      '#####################'
    ]
  },
  {
    id: 'suites',
    theme: 'suites',
    label: 'Floor 21',
    name: 'The Suites',
    flavor: 'Long hotel halls with nowhere to hide. A Clef Brute is working the room service.',
    objective: 'Find 4 K-records to cue the elevator.',
    recordsToOpen: 4,
    enemies: ['chaser', 'cutter', 'drifter', 'brute'],
    baseAggression: 1,
    playerStart: { row: 15, col: 10 },
    elevator: { row: 0, col: 10 },
    spawns: [
      { row: 1, col: 1 },
      { row: 1, col: 19 },
      { row: 7, col: 1 },
      { row: 7, col: 19 }
    ],
    rows: [
      '#####################',
      '#...#...........#...#',
      '#.#.#.#########.#.#.#',
      '#...#.....#.....#...#',
      '#.#######.#.#######.#',
      '#...#.....#.....#...#',
      '###.#.#########.#.###',
      '#...#.....#.....#...#',
      '#.###.###.#.###.###.#',
      '#...#.....#.....#...#',
      '###.#####.#.#####.###',
      '#...#...#.#.#...#...#',
      '#.#.#.#.#.#.#.#.#.#.#',
      '#...#.#.#.#.#.#.#...#',
      '#.###.#.#.#.#.#.###.#',
      '#.....#.......#.....#',
      '#####################'
    ]
  },
  {
    id: 'lobby',
    theme: 'lobby',
    label: 'Floor 1',
    name: 'The Lobby',
    flavor: "Marble, brass and two Brutes guarding the service stairs to the basement.",
    objective: 'Find 4 K-records to cue the freight elevator.',
    recordsToOpen: 4,
    enemies: ['chaser', 'cutter', 'brute', 'brute'],
    baseAggression: 2,
    playerStart: { row: 15, col: 10 },
    elevator: { row: 0, col: 10 },
    spawns: [
      { row: 1, col: 1 },
      { row: 1, col: 19 },
      { row: 7, col: 1 },
      { row: 7, col: 19 }
    ],
    rows: [
      '#####################',
      '#.....#.......#.....#',
      '#.###.#.#.#.#.#.###.#',
      '#.#...#.......#...#.#',
      '#.#.###.#.#.#.###.#.#',
      '#.#.#...#.#.#...#.#.#',
      '#.#.#.###.#.###.#.#.#',
      '#.#...#.......#...#.#',
      '#.#####.#.#.#.#####.#',
      '#.........#.........#',
      '#.#.#####.#.#####.#.#',
      '#.#...............#.#',
      '#.#.#####.#.#####.#.#',
      '#.......#.#.#.......#',
      '#.###.#.#.#.#.#.###.#',
      '#.....#.......#.....#',
      '#####################'
    ]
  },
  {
    id: 'lowend',
    theme: 'lowend',
    label: 'B3',
    name: 'The Low End',
    flavor: "Bassolini's club. Kilo is tied up in the booth and the Dead Air Engine is humming.",
    objective: 'Blast the Dead Air Engine apart.',
    recordsToOpen: 0,
    engineHp: 36,
    enemies: ['chaser', 'cutter', 'drifter', 'brute'],
    baseAggression: 2,
    playerStart: { row: 15, col: 10 },
    elevator: null,
    spawns: [
      { row: 1, col: 1 },
      { row: 1, col: 19 },
      { row: 5, col: 1 },
      { row: 5, col: 19 }
    ],
    rows: [
      '#####################',
      '#.......#BxK#.......#',
      '#.#####.#####.#####.#',
      '#.#.....#...#.....#.#',
      '#.#.###.#.#.#.###.#.#',
      '#...#...........#...#',
      '###.#.#.......#.#.###',
      '#.....#..EEE..#.....#',
      '#.###.#..EEE..#.###.#',
      '#...#.#.......#.#...#',
      '#.#.#.###.#.###.#.#.#',
      '#.#...#.......#...#.#',
      '#.###.#.#####.#.###.#',
      '#.....#.......#.....#',
      '#.###.###.#.###.###.#',
      '#...................#',
      '#####################'
    ]
  }
];

// Test Lab reuses the penthouse layout with no enemies.
export const TEST_LAB_FLOOR = {
  ...FLOORS[0],
  id: 'test-lab',
  label: 'Test Lab',
  name: "Kilo's Sound Lab",
  flavor: 'No goons. Walk the floor, listen to the station and watch how the bass drives the Tune Ray.',
  objective: 'Press R or grab a record to retune.',
  recordsToOpen: Infinity,
  enemies: [],
  elevator: null
};
