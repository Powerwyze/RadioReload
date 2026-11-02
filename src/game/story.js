// Cutscene script. Each panel names a painter in art/cutscenes.js. See docs/STORY.md.

export const INTRO_PANELS = [
  {
    scene: 'tower',
    speaker: null,
    text: 'Tunez Tower. Fifty floors of studios, suites and sound. And at the very top, Kilo Tunez is up late.'
  },
  {
    scene: 'studio',
    speaker: 'Kilo Tunez',
    text: "SPIN-1, wake up. You're going to be the best DJ this city has ever heard."
  },
  {
    scene: 'studio-online',
    speaker: 'SPIN-1',
    text: 'SYSTEMS ONLINE. PLATTER AT 33 RPM. HELLO, KILO.'
  },
  {
    scene: 'dead-air',
    speaker: null,
    text: 'Then every speaker in the tower went silent. Dead air. And the skylight came down.'
  },
  {
    scene: 'bassolini',
    speaker: 'Don Bassolini',
    text: "Kilo Tunez. You built the finest transmitter in the city. Now you're going to build mine."
  },
  {
    scene: 'bassolini',
    speaker: 'Don Bassolini',
    text: "When my Dead Air Engine is done, every station on the dial goes quiet. Except one. Guess whose."
  },
  {
    scene: 'kidnap',
    speaker: 'Kilo Tunez',
    text: "Spin! The records! The elevators only answer to my records!"
  },
  {
    scene: 'gear-rack',
    speaker: null,
    text: "Spin grabs The Tune Ray off Kilo's gear rack: a boombox-turned-sidearm tuned to whatever station is riding the airwaves."
  },
  {
    scene: 'mission',
    speaker: 'SPIN-1',
    text: 'OBJECTIVE: FIND THE K-RECORDS. RIDE DOWN TO THE LOW END. BRING KILO HOME.'
  }
];

export const ENDING_PANELS = [
  {
    scene: 'engine-down',
    speaker: null,
    text: 'The Dead Air Engine coughs, sputters and blows. Every station in the city floods back onto the dial.'
  },
  {
    scene: 'escape',
    speaker: 'Don Bassolini',
    text: 'Enjoy the encore, tin can. Every song ends, Tunez. Even yours.'
  },
  {
    scene: 'rescue',
    speaker: 'Kilo Tunez',
    text: "Not bad for your first gig, kid. Not bad at all."
  },
  {
    scene: 'dawn',
    speaker: 'SPIN-1',
    text: 'BROADCAST RESTORED. REQUESTING NEXT TRACK.'
  }
];

export const GAME_OVER_LINES = [
  "Kilo's still waiting in the booth.",
  'The dial is going quiet, one station at a time.',
  "Bassolini's engine hums a little louder.",
  'Somewhere below, a needle skips.'
];

export const HOW_TO_PLAY = [
  { keys: 'WASD / Arrows', text: 'Move Spin through the floor.' },
  { keys: 'Space', text: 'Fire the Tune Ray. Hold it to keep firing.' },
  { keys: 'Esc', text: 'Pause the broadcast.' },
  { keys: 'K-records', text: 'Retune to a fresh station, add 15 charge and count toward the elevator.' },
  { keys: 'Bass', text: 'Heavy bass means rapid fire. Thin bass or dead air makes the Tune Ray drag.' },
  { keys: 'Signal bars', text: 'Three hits and Spin goes down. Clearing a floor restores them.' }
];
