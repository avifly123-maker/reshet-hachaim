# Review checklist (רשת החיים)

Used at the end of every set and before every build for testers or children. The same checklist is the studio skill
`studio-code-review`. In this game the tools behind it: `tools/check-bounds.mjs` (boundaries), `tools/check-worlds.py`
and `tests/play/robolab-course-leak.json` (cleanup), `tests/play/load-fail.json` (a failing load), `tools/regress.py`
(screens), `tools/check-old-saves.py` (saves), `validate-content` (content rules).


Use at the end of a set or a version, before merging or building for testers/children, or when Avi asks for a review. Goal: find real defects and boundary violations, verify each one, report in plain Hebrew. No big rewrites.

## How
1. Fetch the latest branch first (reviews of a stale copy mislead). Note the commit reviewed.
2. Scope: the diff of the set/version (`git diff <base>...HEAD`), plus anything it touches. For a version close, also sweep the whole tree with the boundary checks.
3. Prefer a reviewer who did not write the code (a fresh agent with only this skill and the diff) when Avi allows an agent; otherwise review it yourself with fresh eyes, file by file.
4. Every finding must be verified: point to file:line, describe the concrete scenario (inputs → wrong result), and where possible prove it with a small test or a headless run. Unverified suspicions are listed separately as "to check".
5. Rank: high (crash, data loss, saves, leaks that grow, wrong content for children) → medium (rare races, hidden coupling) → low (duplication, naming, clarity).

## Checklist
**Life cycle**
- Every created geometry/material/texture/renderer/listener/timer/audio node is freed on close, and only by its owner; shared/cached resources are never disposed by a consumer.
- A failure halfway through building (a level, an island, a screen) cleans up what was built and returns to a safe screen.
- Opening and closing a world N times leaves nothing behind (heap, GL contexts, DOM nodes).

**Async**
- Every promise/timer/load checks that the run that started it is still alive before acting; old results are dropped and freed.
- Rapid repeat (skip and replay, leave mid-load, switch player) cannot start two copies or leave sound playing.

**Errors and logs**
- No silent `catch {}` on load/build paths; failures go to the log module with area and id.

**Boundaries**
- Pure engines import no UI / three.js. No circular imports in core. Packs import only other packs' entry points. No new `window.__` name outside the listed test/debug table. Product code uses services, not globals.
- Content objects are never mutated at run time.

**Data and saves**
- New storage keys are in the one key list with a scope; no renamed keys; old saves of every released version load.

**Duplication**
- The same logic in two places (decoders, helpers, rules) is merged into one shared module, ownership kept per consumer. Do not merge things that only look alike.

**Screen and play**
- Nothing overlaps at 1280 and 800x460: buttons, bubbles, toolbars, two characters or two voice lines at once.
- Every new part has a tutorial and a play script in the full check.

**Performance**
- Weak machines: draw only what is visible, caps by quality tier, no work while hidden; measured, not guessed.

**Content rules**
- No human figures, women, crosses (plus signs, crosshairs, first-aid cross), dinosaurs, "millions of years", evolution language, pigs; gentle simple Hebrew with correct gender; nikud for beginners; sources for facts.

## Report (Hebrew, plain)
- One line on what was reviewed (branch, commit, scope).
- Findings by rank: what it means for the child or the product, where, how to fix, how to prove the fix. Mark which also exist in the released version for children.
- What is fine and should stay.
- A recommended order. Fixes go into a set with tests (often the stability set), not as quick patches mid-review.
