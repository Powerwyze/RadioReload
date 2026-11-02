# Design docs

These are feature designs written with the `game-design` skill
(`.claude/skills/game-design/`), which follows the Elephant-Goldfish Model:

| File | What it is |
|---|---|
| `<slug>.concept.md` | The brainstorm brief, including the risks raised by the Goldfish reviewers. |
| `<slug>.md` | The design doc, built from `.claude/skills/game-design/references/design_doc.md`. |
| `<slug>.review.md` | The merged Goldfish review and the decisions taken on each finding. |

Run it in Claude Code:

```text
/game-design brainstorm Add a boss fight on the roof
/game-design draft
/game-design review docs/designs/roof-boss.md
/game-design resolve docs/designs/roof-boss.review.md
```

The reviewers live in `.claude/agents/gf-*.md` and are read-only:

| Reviewer | What it checks |
|---|---|
| `gf-zoom-out` | YAGNI and reuse |
| `gf-comprehension` | Whether a newcomer can follow the doc |
| `gf-design-critic` | Technical risk and the scene↔React contract |
| `gf-game-feel` | Fun, fairness and readability |
| `gf-art-story` | The art-is-code rules and `docs/STORY.md` |
| `gf-implementation-readiness` | Whether the plan can be built as written |

Skip this process for small, clear bug fixes.
