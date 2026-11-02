---
name: game-design
description: >-
  Design a Radio Reload feature before building it, using the Elephant-Goldfish
  Model. You (the Elephant) hold the context and write the design doc. Fresh,
  read-only Goldfish subagents then review it without the conversation, and the
  user resolves the findings. Use for new floors, enemies, mechanics, HUD or
  screen changes, story beats, or anything that touches more than one
  subsystem. Skip it for small, clear bug fixes. Modes: brainstorm, draft,
  review, resolve.
argument-hint: "[brainstorm|draft|review|resolve] <idea or path to design doc>"
---

# Game design with the Elephant-Goldfish Model

Adapted from Google's open-source
[Elephant-Goldfish Model](https://github.com/google/elephant-goldfish-model)
(Apache-2.0) and fitted to this repo.

| Role | Context | Job |
|---|---|---|
| **Elephant** (you) | The conversation, `CLAUDE.md`, `docs/STORY.md` and the code | Explore the idea and write the design doc. |
| **Goldfish** (`.claude/agents/gf-*.md`) | Only the doc and the files it links. No conversation. | Find gaps, risks and things a newcomer can't follow. |
| **User** | The goals and taste | Make the trade-offs, approve the design and decide what gets built. |

## Ground rules

- **Write to files, not chat.** Briefs, drafts and review reports go in
  `docs/designs/`. In chat, give the path and a short summary.
- **Use plain English.** No hype words (seamless, robust, epic). Explain how
  things work.
- **Critique first.** Lead with what is wrong, missing or risky. Don't flatter
  the idea, and agree only once it has held up.
- **Goldfish must be fresh.** Spawn each reviewer with the `Agent` tool and its
  `gf-*` subagent type. Never run a review inline. If subagents can't be
  spawned, stop and say so, because a same-context review is not a Goldfish
  review.
- **Brief Goldfish only with the doc.** Pass the doc's path and the mode, and
  nothing from the conversation. If a reviewer needs some context, it belongs
  in the doc.
- **Respect `CLAUDE.md`:** art is code, use the Phaser 3.90 API only, the scene
  and React talk only through the listed callbacks and methods, new timers use
  `this.time`, leave the `signalModel.js` thresholds alone, and change one
  subsystem at a time.

## Pick the mode

Read the first word of the argument. If it isn't a mode, infer one: an idea
with no doc means `brainstorm`, an existing brief means `draft`, a doc path
means `review`, and an existing `*.review.md` means `resolve`. If it's still
unclear, ask one question.

The slug is a short kebab-case name for the feature, for example `boss-floor`.

---

### brainstorm: test the idea

1. Read `CLAUDE.md`, `docs/STORY.md` and the files the idea touches.
2. Ask the user a few clarifying questions, at most 3 per turn. Cover what the
   player should feel, which floor or screen this touches, and what is out of
   scope.
3. Write `docs/designs/<slug>.concept.md` with the problem, the player
   experience, the rough approach, the subsystems touched and open questions.
4. Spawn these reviewers **in parallel** (one message, several `Agent` calls),
   each with the prompt
   `Mode: BRAINSTORM. Target: docs/designs/<slug>.concept.md`:
   - `gf-zoom-out`
   - `gf-game-feel`
   - `gf-art-story`
   - `gf-design-critic`
5. Fold the challenges into the brief under **Risks raised**, and update the
   approach where the user agrees. Then ask whether to draft.

### draft: write the design doc

1. Start from the concept brief, or from whatever notes the user points to.
2. Fill in [references/design_doc.md](references/design_doc.md) and save it as
   `docs/designs/<slug>.md`. Write it **one section at a time**. After each
   major section (Player Experience, Technical Plan and Implementation Plan),
   pause and ask the user for feedback in chat.
3. Name real files, functions and data shapes. Read the code before you
   describe it, and don't invent APIs.
4. Keep unresolved items under **Open Questions**. Don't guess at them.

### review: send in the Goldfish

1. Target: the doc path. Read it first so you know which sections exist.
2. Run the stages in order. Within a stage, spawn the reviewers in parallel.
   Each prompt is exactly `Mode: REVIEW. Target: <path>`.

   | Stage | Reviewers | Question |
   |---|---|---|
   | 1. Zoom out | `gf-zoom-out` | Is this needed, is it the simplest version, and does it reuse what exists? |
   | 2. Comprehension | `gf-comprehension` | Can a newcomer follow it? |
   | 3. Critique | `gf-design-critic`, `gf-game-feel`, `gf-art-story` | Will it break, will it be fun, and does it fit the world? |
   | 4. Readiness | `gf-implementation-readiness` | Could someone build it without making design calls? |

   Run the stages back to back by default. If the user asked for an
   interactive review, check in after each stage instead.
3. If a reviewer fails or returns nothing, retry it once. If it fails again,
   mark it **not run**, and never count it as zero findings.
4. Merge the findings into `docs/designs/<slug>.review.md`:

   ```markdown
   # Goldfish review: <doc title>
   Target: `docs/designs/<slug>.md` · Date: YYYY-MM-DD

   | Reviewer | Status | 🔴 | 🟡 | 🟢 |
   |---|---|---|---|---|

   ## 🔴 Blockers
   ### <Short title>
   - **Lens:** gf-… · **Where:** <section>
   - **Problem:** …
   - **Suggestion:** …
   ## 🟡 Major
   ## 🟢 Nits
   ```

   Remove duplicates, and when two lenses raise the same point, note both.
   Expect more findings than are worth acting on.
5. Tell the user the counts and the path, then offer to resolve.

### resolve: decide what changes

1. Read the review report and the doc.
2. Go through the Blockers, then the Majors, **one finding per question**. For
   each one, give your view (accept, adjust or reject) with one line of
   reasoning, and let the user decide. Batch the Nits into a single question.
3. Apply the accepted changes to the doc. Record each decision in the report
   as ✅ accepted, ✏️ adjusted or ❌ rejected, with a reason.
4. When nothing open is left, set the doc's **Status** to `Approved` and ask
   whether to implement. When implementing, follow the doc's Implementation
   Plan, work on one subsystem at a time, and run its Verification Plan.
