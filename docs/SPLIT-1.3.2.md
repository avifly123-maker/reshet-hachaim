# Splitting the big files (1.3.2) — rules for every split

Avi (owner): "the code fix must be careful and calm; nothing may break". The goal is code an outside developer can
read and fix: folders of small files with one job each, no 2,000-line blocks, no spaghetti. Behaviour must not change.

## Rules
1. **Pure move.** Move code, do not rewrite it. No logic changes, no renamed storage keys, events, CSS classes, ids,
   `window.__*` debug hooks or exported names. Fix nothing on the way (write what you noticed in your report instead);
   the only allowed edits are the ones a move needs (imports/exports, passing shared state).
2. **Shape.** A big file becomes a folder (e.g. `src/learn/hub/`) with an `index.js` that keeps the same public API, so
   other files' imports keep working (or update the importers, and say so). Aim for files of 150–600 lines, each with a
   short header comment: what it does, what it exports, what it needs.
3. **Shared state.** When a giant `create…()` closure is split, pass one explicit context object (`ctx`: state, helpers,
   DOM roots) to the parts. Do not invent globals. Keep the order of side effects (event listeners, timers, first paint).
4. **CSS** stays where it is unless it lives inside the JS you move (then it moves with its part, unchanged).
5. **Packs.** Code that is in a lazy pack (src/core/packs.js, build.mjs) must stay in the same pack: check that the
   built output still loads the pack lazily (the main file must not grow by the moved code).
6. **Small steps.** Commit after each part that builds (`node build.mjs`), with a message that names what moved.
7. **Checks before you report:** `bash tools/check-all.sh` must end "OK – all checks passed"; then
   `python3 tools/regress.py dist/index.html shots/regress/after` and
   `python3 tools/regress.py --compare /home/claude/reshet-hachaim/shots/regress/base shots/regress/after`
   — look at every flagged picture yourself. Still screens must match; forests only roughly (they move). Also run the
   play tests that touch your area (tests/play/*.json) and compare their output with the same run on the base.
8. Report: the new folder map (file → lines → job), what you passed between parts, anything odd you saw but did not fix.
