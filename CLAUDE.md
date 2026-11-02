# Radio Reload: Dead Air Run

A top-down maze shooter. Spin, a robot DJ, fights down Tunez Tower to rescue Kilo Tunez. His
Tune Ray's fire rate follows the bass of a live internet radio stream.

Story, cast and art direction live in [docs/STORY.md](docs/STORY.md). Read it before you change
any narrative or visual content.

## Stack (exact)
- Vite 5, React 18, **Phaser 3.90** (Phaser 3 API only, not Phaser 4). Use `realtime-bpm-analyzer` 5.
- Deploys go to Vercel project `radio-reload` on every push to `main`
  (https://radio-reload.vercel.app).
- On Windows dev boxes, use `npm.cmd run dev`; it serves on port 5173.

## Layout
| Path | Responsibility |
|---|---|
| `src/game/createRadioEscapeScene.js` | The Phaser scene. It handles floors, actors, combat and pushes HUD state to React. |
| `src/game/floors.js` | The five floors: layout, theme, enemy roster, spawns, elevator and objectives. |
| `src/game/maze.js` | Grid maths and BFS pathing (`createMaze(rows)`). |
| `src/game/signalModel.js` | Bass reading → Rapid / Normal / Dragging tier. Station-relative percentile with hysteresis. |
| `src/game/useRadioAudio.js` | Stream playback, the Web Audio analyser and station-failure callbacks. |
| `src/game/story.js` | Every cutscene line, game-over line and how-to-play entry. |
| `src/game/art/palette.js` | The shared colour keys for every sprite grid. |
| `src/game/art/sprites.js` | Sprites as text grids, plus generated props (record, engine, elevator). |
| `src/game/art/tiles.js` | Floor themes and the board painter. Pure functions. |
| `src/game/art/textures.js` | Turns grids into Phaser textures and animations, and into data URLs for React. |
| `src/game/art/cutscenes.js` | 256×144 canvas painters for the story panels. |
| `src/pages/RadioEscapePage.jsx` | Screens (title, cutscenes, floor cards, game over, results) and the HUD. |

## Rules
- **Art is code.** Never add binary sprite sheets. Change a sprite by editing its grid in
  `sprites.js`, using palette keys from `palette.js`:
  - `validateSprites` throws on ragged rows or unknown colours at startup;
  - sprites are 16×16 at `PIXEL_SCALE` 3 (one tile is 48 px);
  - keep integer scales so pixels stay crisp.
- **The pure art modules** (`palette`, `pixelGrid`, `sprites`, `tiles`) import with explicit `.js`
  extensions and touch no DOM. That way Node scripts can render them to PNG for review.
- **The scene talks to React only through callbacks:**
  - `onHudChange`
  - `onFloorReady`
  - `onGameOver`
  - `onVictory`
  - `onPauseChange`
- **React calls into the scene only through these methods:**
  - `beginFloor`
  - `setPaused`
  - `setPulseState`
  - `handleStationFailure`
- **Pausing** sets `this.time.paused` and pauses tweens and anims. Any new timer must use
  `this.time` so it freezes with the game.
- **The fire-tier logic** in `signalModel.js` was tuned against live streams. Don't change the
  thresholds without re-measuring.
- **Change one subsystem at a time**, and read a file before rewriting it.
- **Commits:** end every commit message with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
