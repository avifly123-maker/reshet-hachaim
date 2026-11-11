# Code rules of רשת החיים

From the architecture review of 1.4.4 (8.11.2026, the reviewer's document is in the chat, not in git) and the stability set.
The same rules live in Avi's studio (rules/code.md) for every project. Where this game has the tool for a rule, it is named.
In this game: `src/core/storage.js` (+ `storage-keys.js`) for saves, `src/core/services.js` for parts meeting,
`src/core/log.js` (`logError`) for failures, `disposeOwned` in `src/core/util.js` for cleanup, `src/core/math.js` for
numbers-only helpers, `tools/check-bounds.mjs` for the boundaries, `src/ui/css/00-layers.css` for layers.


## Structure
1. **Each module owns one area.** Saves, the screen, the renderer, audio, the network (if any): one service each, and only it touches that resource.
2. **Layers, one direction:** pure engine (no three.js, no DOM; tested alone) → data/content → 3D → UI → tutorial → play test. A lower layer never imports a higher one.
3. **No circular imports.** If two modules need each other, move the shared part to a neutral module or pass a function in.
4. **Explicit dependencies.** A part receives what it needs (guide, playSound, quality, navigate) instead of reaching into a global app object. `window.__*` names are for tests and debugging only, and are listed in one table.
5. **Content is read-only at run time.** Derived fields go on runtime copies, never on the content objects.
6. **One place per job.** Before writing a helper, look for one. Shared logic lives in a shared module; when two copies appear, merge them, and keep each consumer's ownership of what it creates.
7. **No giant files.** Split by responsibility, not by line count; one folder per area with an `index.js` whose header says what it does, exports and needs.
8. **CSS and HTML out of JS strings** where practical; one layer order for z-index (CSS variables, never raw numbers).

## Life cycle and errors
9. **Every resource that is created is registered for cleanup at the moment it is created** (geometry, material, texture, renderer, listener, timer, audio node). Shared/cached resources are marked and never disposed by a consumer.
10. **Async work is bound to the run that started it.** When the result arrives, check that this run is still alive; otherwise drop it and free what it made.
11. **A failure in the middle of building something cleans up what was already built** and returns to a safe screen.
12. **Errors are logged, not swallowed:** one log module, one line format (area, id, message), the last errors visible in a debug strip. An optional part may fail and the product continues, but the failure is recorded.

## Saves and upgrades
13. **Every version installs over the previous one and keeps all data.** Never rename a storage key, an app id or an origin. Keep a sample save from every released version; a check loads all of them.
14. All storage goes through one module with a list of keys and their scope (player / device).

## Proof
15. **Every part has a test inside the full check,** and every new or improved part has a hands-on tutorial with a play script.
16. **Boundary checks run in the full check:** pure engines import no UI/three, no core cycles, packs import only each other's entry points, no new unlisted globals.
17. **Before/after screenshots** for every screen touched; two sizes.
18. **Weak computers:** measure first; a speed-up must leave the picture and the play the same.
19. **A change in one part is checked against every part it touches.** Before writing, ask: does it affect existing parts? will other parts need it (then it goes to shared infrastructure)? will it need extending (then build it so things can be added without breaking: a table of kinds, not a chain of ifs)?
19a. **Text shown to the child lives in a key/value dictionary** in new projects (not hard-coded), so text changes are safe, validated in one place, and a second language is easy.
19b. **Quick checks per area** on every change; the full check at the end of a set and before delivery.

## Context for agents
20. `CLAUDE.md` stays short (a brief, the rules that never change, how to build and test, where things are, the current state). History goes to a DEVLOG / HISTORY file. A code map (`docs/CODEMAP.md`) is the one architecture map.
