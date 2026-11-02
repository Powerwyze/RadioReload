# [Feature name]

- **Author:** [name]
- **Status:** Draft | In Review | Approved
- **Date:** YYYY-MM-DD
- **Subsystem(s):** [scene | floors | maze | signalModel | audio | story | art | React screens/HUD]

---

## Overview
<!-- Two or three sentences covering what this adds to Radio Reload and why. -->

## The Problem
<!-- What is missing or wrong in the game today? Point to the code or the play moment. -->

## Goals
- 

## Non-Goals
<!-- What is explicitly out of scope. This stops feature creep. -->
- 

## Player Experience
<!-- What the player sees, hears and feels, moment to moment. Cover:
     - the controls and how they read on screen;
     - how it interacts with the bass-driven Tune Ray (Rapid / Normal / Dragging);
     - difficulty and fairness, including what happens when the stream is quiet or fails;
     - how a new player learns it, which may need a how-to-play entry in story.js. -->

### Play moments (CUJs)
#### 1. [Title]
- **Given:** [floor, state, signal tier]
- **When:** [player action or event]
- **Then:** [what happens on screen and in the HUD]

## Story & Art
<!-- Write "None" if neither is touched.
     - Story: the cast, lines and how they fit docs/STORY.md.
     - Sprites: their grids, the palette keys they use, 16×16 and PIXEL_SCALE 3.
     - Tile themes and cutscene panels (256×144). -->

## Technical Plan
<!-- How it works. Cover the data flow between floors.js, the scene and React.
     Use only the allowed scene↔React callbacks and methods.
     Any timer must use this.time so pausing freezes it. -->

```text
[optional diagram]
```

## Alternatives Considered
### [Alternative]
- **Pros:** 
- **Cons:** 
- **Why not:** 

## Risks & Tuning
<!-- Cover balance numbers, performance (enemy counts, BFS cost), stream or
     audio failure modes, and save or state compatibility. -->

## Open Questions
- 

---

## Implementation Plan
<!-- Give an exact list of files. Order the steps so each one changes a single subsystem. -->

### 1. `path/to/file.js` (Modify | Create)
- **Changes:** [functions, data shapes, constants]

### Verification Plan
- **Build:** `npm run build`
- **Art check:** `node --input-type=module -e "import {SPRITES,validateSprites} from './src/game/art/sprites.js'; import {PALETTE} from './src/game/art/palette.js'; validateSprites(SPRITES, PALETTE); console.log('sprites ok')"`
- **Playtest:** `npm run dev`. Then [the exact steps to try, and what to look for]

---
*Drafted with the game-design skill (Elephant-Goldfish Model).*
