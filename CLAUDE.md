# CLAUDE.md: working notes for continuing רשת החיים

This file is the hand-off between development sessions. Read it first, then `CONTRACT.md` (architecture), `CHANGELOG.md` (what each version did) and `docs/DEVLOG.md` (how it was built).

## The project in one paragraph

An offline 3D educational biodiversity game in Hebrew for Baba Da (בבא דע), for Haredi children aged 6 to 12. Two zones (Amazon rainforest: the struggle for light; Israeli Mediterranean grove: the seasons), two levels (מתחילים / מתקדמים), a learning hub (quiz, card album, "חוט הקשר", "מחזיקים את היער", "מי חזק ברשת?"), two editions (general, and torah with source cards). Plain JS + three.js r186, esbuild → one offline HTML; Electron for Windows and macOS.

## Rules that never change

- **Content:** no human figures at all, no women or girls depicted or named, no dinosaurs, no "millions of years" (say "בעבר הרחוק"), no evolution language, no pigs. Gentle, simple Hebrew for grades 3 to 5, correct grammatical gender, fully right-to-left. Facts must be checked against a source (`docs/sources.md`). `node tools/validate-content.mjs` enforces the text rules, including UI and torah text.
- **Talking with the owner:** always in Hebrew, plain everyday language (not a literary style). Documents and printouts fully RTL. Written content for others should not read as machine-written (no em dashes, no hype words).
- **Look:** polished and colourful but "not a circus". Trees stay procedural (no Blender trees: mixing would look unnatural); animals are Blender-rigged.

## Build and test

```bash
npm install
node build.mjs                          # dist/index.html (general)
node build.mjs --edition=torah          # dist/index-torah.html
node build.mjs --desktop [--edition=torah]   # desktop/app (shared by both editions: build torah first, general last)
node tools/validate-content.mjs && node tools/validate-kids.mjs
python3 tools/play.py dist/index.html tests/play/integ.json 800 460    # must print "hub ok 10"
python3 tools/play.py desktop/app tests/play/integ.json 800 460
python3 tools/check-old-saves.py desktop/app                         # saves from 1.0.0 must load (OK)
```

Headless notes: SwiftShader is slow and makes the game start on the 'min' tier; emit `bus.emit('quality',{q:'medium'})` for real visuals, wait about 15 s for the intro camera, click the 'דלג' button to skip the coach, keep screenshots at 800x460. `window.__game.debug` has `place(id,x,z)`, `ff(seconds)`, `auto()`, `unlockAll()`, `rig`; the hub has `window.__wolLearn`, `__kfDebug`, `__wpDebug`.

## Release checklist

1. Bump `desktop/package.json` version; update `CHANGELOG.md`.
2. Validators, integration on html / torah / desktop, old saves.
3. Windows: `cd desktop && WINEDEBUG=-all npx electron-builder --win nsis --x64` (torah: `--config builder-torah.json`).
4. macOS (from Linux): `npx electron-builder --mac` (torah: `--config builder-torah.json --mac`), then ad-hoc sign each `.app` with `rcodesign sign` (cargo install apple-codesign; required on Apple Silicon), then zip with `python3 tools/zip-mac-app.py <app> <zip> "<Hebrew name>.app"` (electron-builder's Linux zip breaks symlinks and the signature). Never tested on a real Mac yet.
5. GitHub (`avifly123-maker/reshet-hachaim`, public): sessions can push only to `claude/*` branches; the owner merges the pull request. The release API is blocked for sessions, and browser uploads are limited to 10 MB, so the owner attaches installers to the release himself (create the release text, he drags the files).
6. Getting big files to the owner's PC: split into 24 MB parts, send with the device file tool into the `installer\parts` folder under `Documents\reshet-hachaim-blender`, join and sha256-check them with Python run inside Blender, delete the parts.

## Blender

Blender runs on the owner's PC and is reached through the Blender MCP bridge. `tools/blender/animal_kit.py` is the toolkit; `tools/blender/animals/<id>.py` is one spec per animal (31 animals). Exports come back as JSON in the tool result and are written to `art/rigged/<zone>/<id>.json` (`tools/blender/bridge/pulltxt.py`), then packed by `tools/build-rigged.py` into `src/data/rigged-*.js`. Each upload of a changed script must use a new staged file name (`tools/blender/bridge/push.sh`), or the cached old content arrives. Panoramas, ground textures, props and the card pack also come from Blender (`tools/build-*.py`).

## Where things stand (1.2.1)

Done: river crossing logs, more flowers and insects, richer ambient sound, tree and flower graphics, performance work for weak PCs, a full code review with fixes, Mac builds, the public repo with README, CHANGELOG and dev log.

Open, in rough priority order:
- Real-world testing: children playing (watch where they get stuck), a weak school PC, a real Mac.
- Lower-detail models for far-away animals (biggest remaining performance win).
- Click targets of 24 to 32 px in the album and web puzzle at 1024x600.
- Auto quality still reacts slowly on very weak machines.
- Feedback from the Baba Da instructors' pilot group.
