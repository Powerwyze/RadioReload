# Radio Reload: Dead Air Run — Story & Art Bible

This is the source of truth for story, cast, setting and look. In-game text lives in
`src/game/story.js`, floors in `src/game/floors.js`, and every sprite in `src/game/art/`.

Items marked **(recovered)** come from the original April development notes. Everything
else was decided during the November 2026 buildout to fill the gaps.

## Pitch

At the top of Tunez Tower, genius music producer Kilo Tunez completes his newest creation:
Spin, a robot DJ. That same night every speaker in the tower goes silent, Clef Goons crash
through the skylight, and Kilo is dragged down the elevator shaft toward Bassolini's lair.
Armed with the Tune Ray — a boombox sidearm tuned to the live airwaves — Spin fights down
fifty floors to bring his creator home.

## Cast

### Kilo Tunez — the creator (recovered)
Genius producer and inventor. Built Tunez Tower's rooftop transmitter, the K-records and Spin.
- **Look:** dark high-top, round gold shades, gold headphones around his neck, purple bomber
  with a gold K on the chest, white tee, dark jeans.
- **Voice:** warm, quick, proud of Spin. Calls him "kid".
- **Role in play:** never playable. He appears in cutscenes, tied to a chair on the final
  floor, and on the game-over screen.

### Spin (SPIN-1) — the hero (recovered)
Kilo's robot DJ, switched on for the first time the night Kilo is taken.
- **Look (recovered):** turntable head (a spinning platter with a gold K label and a
  tonearm), subwoofer shoulders, chrome boots. A cyan visor and a VU meter on the chest.
- **Personality:** brand new and literal at first; learns to improvise as he goes.
- **Health:** three signal bars. A touch from an enemy costs one bar, and clearing a floor
  restores them all.

### Don Bassolini — the antagonist
Owner of Low End Records and the biggest bass-music mogul in the city. **(Decided)** He wants
to own the dial. His Dead Air Engine jams every free station in the city until the only
signal left is his paid broadcast. Kilo built the best transmitter in the city, so Bassolini
needs Kilo to finish the engine.
- **Look:** a big frame, purple pinstripe suit, wide fedora with a gold band, dark shades,
  and a gold chain with a bass-clef pendant.
- **Voice:** smooth, patient, theatrical. He talks like a radio host.
- **Role in play:** he watches from his booth on the final floor and escapes when the engine
  falls. That leaves a sequel hook.

### Clef Goons — regular enemies (recovered)
Bassolini's crew. Their pompadours curl like the top of a treble clef.
- **Look:** lavender skin, black curl, red shades, dark purple suits and a gold clef pin.
- **Behaviour:** each goon has its own habit:
  - **Chaser** runs straight at Spin.
  - **Cutter** heads for where Spin is going.
  - **Drifter** wanders until Spin comes close, then charges.
- **Toughness:** one hit.

### Clef Brutes — heavy enemies (recovered concept, now in play)
Bigger muscle with a bass-clef hook of hair and two gold studs, the clef's two dots.
- **Look:** oxblood suit.
- **Behaviour:** slow and relentless chasers.
- **Toughness:** three hits. Each hit flashes white.

## Setting: Tunez Tower (recovered)
A 50-floor recording-studio hotel. **(Decided)** The goons took Kilo down the elevator shaft to
the sub-basement club Bassolini seized, **The Low End**. Every elevator in the tower is keyed to
Kilo's music, so Spin has to find K-records to call it.

| Floor | Name | Look | Goal |
|---|---|---|---|
| 50 | The Penthouse | Purple carpet, black glass walls, gold trim, city lights | 3 K-records |
| 38 | Studio Row | Oak floors, charcoal acoustic foam, teal booth lights | 3 K-records |
| 21 | The Suites | Red hotel carpet, green damask wallpaper, brass sconces | 4 K-records |
| 1 | The Lobby | Black-and-white marble checker, brass panels | 4 K-records |
| B3 | The Low End | Wet concrete, subwoofer-stack walls, red work lights | Destroy the Dead Air Engine |

## Items & mechanics, in-world
- **The Tune Ray (recovered):** "a boombox-turned-sidearm tuned to whatever station is riding
  the airwaves." It fires sound-wave blasts. The live station's bass sets its fire rate:
  - **Rapid** (green): the bass is peaking for this station.
  - **Normal** (yellow): the bass is steady.
  - **Dragging** (red): the bass is low, or the station has gone to dead air.
- **K-records (recovered):** Kilo's master records, scattered when the goons ransacked the
  vault. Dropping the needle on one does three things:
  - retunes the Tune Ray to a fresh live station the jammer hasn't found yet;
  - adds 15 charge;
  - counts toward the floor's elevator key.
- **Charge:** each blast costs one. Goons sometimes drop a D-cell battery worth 5.
- **Dead air:** silence is the enemy. When a station goes quiet, the Tune Ray drags.
- **The Dead Air Engine:** a wall of speaker cabinets in the middle of the Low End. Spin wins
  by blasting it apart.

## Story beats
1. **Tower at night:** fifty floors of studios, suites and sound, with Kilo at the top.
2. **Spin comes online:** "SPIN-1, wake up."
3. **Dead air:** every speaker goes silent and goons drop through the skylight.
4. **Bassolini on the monitor:** "You built the finest transmitter in the city. Now you'll
   build mine."
5. **The kidnapping:** the goons drag Kilo into the elevator.
6. **The Tune Ray (recovered beat):** Spin grabs it off Kilo's gear rack.
7. **The mission:** find the K-records, ride down and bring Kilo home.
8. **Play:** floors 50, 38, 21, 1, then B3.
9. **Ending:**
   - the engine blows;
   - every station floods back;
   - Bassolini escapes ("Every song ends, Tunez. Even yours.");
   - Spin unties Kilo;
   - dawn on the roof.
10. **Game over (recovered concept):** Kilo tied to a chair in Bassolini's lair, with
    "TUNE IN AGAIN?"

## Art direction
- **Pixel art.** Every sprite is a 16×16 grid, drawn at 3× (one tile = 48 px):
  - Brutes are 20×20.
  - Kilo and Bassolini are taller, for cutscenes.
- **Source of truth.** Sprites are text grids in `src/game/art/sprites.js` that use the
  shared palette in `src/game/art/palette.js`. Tiles and big props are generated from code
  in `src/game/art/tiles.js`. Nothing is a binary file.
- **Palette roles:**
  - **Spin:** chrome and cyan.
  - **Kilo:** gold and purple.
  - **Bassolini and the Goons:** purple, oxblood and red.
  - **The Tune Ray tiers:** green, yellow and red.
- **The tier glow.** The neon trim along every wall follows the Tune Ray tier, so the whole
  floor pulses with the station.
- **Type:**
  - "Press Start 2P" for labels and the logo;
  - "Chakra Petch" for body text.
