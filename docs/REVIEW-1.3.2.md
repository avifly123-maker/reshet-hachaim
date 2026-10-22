# Code review of 1.3.2 — brief for the reviewers

Branch `claude/1.3.2` (compare with `main` = 1.3.1: `git diff main..HEAD`). Read CLAUDE.md (rules that never change),
docs/SPEC-1.3.2.md (what was built) and docs/JOURNEY.md. The big files were just split into folders as pure moves
(src/game/game/, src/ui/ui/, src/learn/hub/, src/env/environment/, src/learn/games/keep-forest/, src/models/*/).

You are a reviewer, not an author: do NOT edit source files. Find real problems and prove each one.

Look for, in your area:
1. **Things that sit on each other** — two windows, bubbles, banners or toasts on screen at once in the same place
   (רובו־דע's guide bubble, how-to cards, the coach, mission banner, badge toast, stage scene, photo frame, tech cards,
   modals); z-index fights; an element hidden behind another at 800x460 or 1024x600; a click that goes to the wrong layer.
2. **Bugs** — wrong logic, state that is not reset when the player changes or a forest closes, listeners or timers never
   removed (leaks across forests/players), errors on old saves, storage writes not wrapped in try/catch, a lock that can
   close something a legacy player had, experience mode leaking text it should hide, beginners' text without nikud.
3. **Complexity and duplication** — code that is much more complicated than it needs to be, the same thing written
   twice in two places, dead code, magic numbers that should be named, unclear names.
4. **Rules** — cross shapes, human figures, content rules, Hebrew gender, em dashes in child-facing text.

How: read the code, and verify every suspected bug in a running build when possible (headless: `python3 tools/play.py
dist/index.html <script.json> 800 460`; build with `node build.mjs`; hooks: window.__app, __game (debug), __journey,
__guide, __wolLearn, __labDebug, __threads, __flourish, __stageScene; __journey.unlockAll('2580') opens everything).
Keep your scratch files in /tmp/claude-0/-home-claude/c4944bf7-0187-57f0-be5e-c79740ed116b/scratchpad/review-<area>/.

Report (English): a numbered list, most severe first. Each finding: severity (critical / important / medium / minor),
file:line, what is wrong, how you verified it (or "not verified" and why), and a suggested fix in one or two lines.
Do not list style nits. Say clearly what you checked and found fine.
