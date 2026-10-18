# CLAUDE.md: working notes for continuing רשת החיים

This file is the hand-off between development sessions. Read it first, then `docs/ROADMAP.md` (the owner's way of thinking and the ideas he wants developed, in Hebrew), `CONTRACT.md` (architecture), `CHANGELOG.md` (what each version did) and `docs/DEVLOG.md` (how it was built).

## The project in one paragraph

An offline 3D educational biodiversity game in Hebrew for Baba Da (בבא דע), for Haredi children aged 6 to 12. Two zones (Amazon rainforest: the struggle for light; Israeli Mediterranean grove: the seasons), two levels (מתחילים / מתקדמים), a learning hub (quiz, card album, "חוט הקשר", "מחזיקים את היער", "מי חזק ברשת?"), two editions (general, and torah with source cards). Plain JS + three.js r186, esbuild → one offline HTML; Electron for Windows and macOS.

## Rules that never change

- **Content:** no human figures at all, no women or girls depicted or named, no dinosaurs, no "millions of years" (say "בעבר הרחוק"), no evolution language, no pigs. Gentle, simple Hebrew for grades 3 to 5, correct grammatical gender, fully right-to-left. Facts must be checked against a source (`docs/sources.md`). `node tools/validate-content.mjs` enforces the text rules, including UI and torah text.
- **Talking with the owner:** always in Hebrew, plain everyday language (not a literary style). Documents and printouts fully RTL. Written content for others should not read as machine-written (no em dashes, no hype words).
- **Upgrades keep the data:** every version (1.2.x and the future 1.3) installs over the previous one and keeps all saves, players and cards. Never change the desktop `appId` / `productName` (both editions), the `app://game` origin or the `web-of-life*` storage keys; `tests/fixtures/saves-<version>.json` holds a save from each released version and `tools/check-old-saves.py` must load all of them.
- **Look:** polished and colourful but "not a circus". Trees stay procedural (no Blender trees: mixing would look unnatural); animals are Blender-rigged. Corals and the reef's other fixed life are Blender models (Avi, 18.10: they barely grow, so they can be fixed models). No cross shapes anywhere, not even a first-aid cross (use a red "!").

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
3. `tools/pack-release.sh` builds the seven release files into `release-files/<version>/` (torah first, general last, then the one-file html) with `SHA256SUMS.txt`. Names: `reshet-hachaim[-torah]-setup-<v>.exe`, `reshet-hachaim[-torah]-mac-apple-silicon-<v>.zip`, `reshet-hachaim[-torah]-mac-intel-<v>.zip`, `reshet-hachaim-<v>.html`; README.md and docs/RELEASE.md list the same names, keep the three in step. Inside, per edition: `node build.mjs --desktop [--edition=torah]`, `cd desktop && WINEDEBUG=-all npx electron-builder --win nsis --x64` and `--mac` (torah: `--config builder-torah.json`; NSIS needs wine32:i386), ad-hoc sign each `.app` with `rcodesign sign` (cargo install apple-codesign; required on Apple Silicon), zip with `python3 tools/zip-mac-app.py <app> <zip> "<Hebrew name>.app"` (electron-builder's Linux zip breaks symlinks and the signature). Never tested on a real Mac yet.
4. Update the download section of README.md (version and file names) and docs/RELEASE.md (the release link with `?tag=v<v>&target=main&title=...` and the release text, which covers every version since the last published release).
5. GitHub (`avifly123-maker/reshet-hachaim`, public): sessions can push only to `claude/*` branches; the owner merges the pull request. The release API is blocked for sessions, and browser uploads are limited to 10 MB, so the owner attaches installers to the release himself: open the pull request to `main` (REST: `gh api repos/avifly123-maker/reshet-hachaim/pulls -f head=... -f base=main`; GraphQL is blocked), give him the release link and text from docs/RELEASE.md, he merges, publishes and drags the files. Published so far: v1.2.1 and v1.2.3 (1.2.2 was never published, so the 1.2.3 text covers it). One release per version, tag `v<version>`, all seven files on it (see docs/RELEASE.md).
6. Getting big files to the owner's PC: ask once for access to `Documents\reshet-hachaim-blender` (device folder access), split into 24 MB parts (bigger parts are refused), send them with the device file tool into `installer\<new folder>`, then join and sha256-check them with `device_bash` (the folder is mounted at `$HOME/mnt/reshet-hachaim-blender`) and delete the parts. If there is no folder access, Python inside Blender can join them.

## Blender

Blender runs on the owner's PC and is reached through the Blender MCP bridge. After Blender starts, run `animals\session.py` there once (see `tools/blender/bridge/session.py`); it loads the kits and sets up a gentle one-at-a-time job queue. The owner's PC is also his work computer: one job at a time, never call Blender while a job runs, check progress by listing `animals\pv` and `animals\out` with the device tools. How we work, decisions and dilemmas: `docs/WORKFLOW.md` (Hebrew). `tools/blender/animal_kit.py` is the toolkit; `tools/blender/animals/<id>.py` is one spec per animal (33: 31 animals and two bees). Exports are written by Blender to `animals\out\<id>.json`, staged back with the device tools and copied to `art/rigged/<zone>/<id>.json`, then packed by `tools/build-rigged.py` into `src/data/rigged-*.js`. Each upload of a changed script must use a new staged file name (`tools/blender/bridge/push.sh`), or the cached old content arrives. Panoramas, ground textures, props and the card pack also come from Blender (`tools/build-*.py`).

## Two lines of work (decided 2026-10-16)

- **1.2.x** (branch `main`): the finished product. Only bug fixes and small improvements (1.2.2, 1.2.3, ...).
- **1.3.0** (branch `claude/research-1.3`): **חוקרי היער**, the research world. Built on its own branch; merge `main` into it now and then so fixes reach it. Released as 1.3.0 when it is ready.

## חוקרי היער (research world, 1.3.0 in progress)

Design: `docs/RESEARCH.md` (Hebrew). Proposed 1.3 development map (mysteries, the Eilat reef, the lab, dubbed scenes, cards, infrastructure): `docs/PLAN-1.3.md`, awaiting the owner's decisions (section 8). Code: `src/research/`.

- A mystery (תעלומה) is one case file in `src/research/cases/` (data only: model, board, tools, ideas, hints, guesses, texts, scene, tests). `cases/index.js` lists them; `hub.js` shows them by level (מתחילים / בינוני / מתקדמים) next to the "בקרוב" ones.
- `model.js` is a population model in plain numbers (no three.js): vars (animals, plants, stocks) and flows (produce, consume, prey with a refuge, germinate, mature, decay); animals grow by how fed they are, leave when hungry or crowded (caps can be tied to a stock, e.g. owls per nest box), arrive from outside when there is food and room. No hard limit on numbers.
- `runner.js` holds the rules shared by the game and the tests: idea cost (`perUnit`), budget, `max`, and the balance clock (three lights; waits at kids/middle, restarts at advanced).
- `session.js` runs a case inside `createGame({ research: C })`: the island shows a sample of the numbers (`visual`: sqrt for many animals, seedlings stay small until the model says they grew up); tools reveal numbers (night camera counts only at night, drone, quadrat); ideas change the model; "לראות מה קורה" runs the model 3x for 90 model seconds; renewable hint bulbs; lab with RTL graphs and the child's guess; stars (healed, right guess, thrift); a card pack the first time; torah edition: a source card (`SOURCE_CARDS` with `earn: 'research:<id>'`).
- game.js / tools.js hooks are all gated by `W.research` (no missions, coach, births, saves, daily report, injuries, experiments; the camera and seed drone report to the mystery).
- Beginner texts are fully vocalised (ניקוד מלא). `node tools/validate-research.mjs --all` checks references, nikud on every beginner string, and runs `tests/research/solvable.mjs`: doing nothing fails, every trap fails alone, every fix heals within the limit, with three season lengths. A case that fails does not ship.
- Relation types of the research engine (competes, harms habitat, limits, changes the environment) live only in the research world; the collectible cards keep their four attributes.
- Headless: `window.__app.openCase('mice-owl')`; `window.__game.research.dbg` has `useTool`, `applyIdea`, `startFF`, `openLab`, `runner`, `model`.

Stage 1 done: engine, research centre, mystery 1 "יותר מדי קוצנים" end to end. Next (docs/RESEARCH.md): the other two beginner mysteries, then middle (המלכודת, החורש שלא מתחדש, הנמלים שאכלו את היער), then advanced with the goat and jackal models.

## The reef zone (1.3.0, branch claude/research-1.3)

שונית האלמוגים של אילת, the third environment. Start card marked "בבנייה" (`dev: true` in src/data/zones.js) until Avi signs it off.
- Data: src/data/reef.js (30 species: corals, sponge, anemone, clam, seagrass, algae, plankton; 18 animals incl. jellyfish and reef shark; 13 missions, 6 events, tips); kids set in src/data/kids.js; torah mission rt1 and source card `yam` (תהלים קד, כה) in src/data/torah.js.
- Fish swim: `locomotion: 'swim'` becomes 'flying' with `s.swims = true` in src/sim/species.js; the flight code keeps them under `env.surfaceY`.
- Environment: src/env/reef.js ("cube of sea" diorama: sea floor with Blender sand / rubble textures and Voronoi caustics, reef-rock boulders on the mounds, coral heads on the crest as scenery, turquoise surface and water wall, light rays, bubbles, sky dome). `env.underwater`, `env.surfaceY`.
- Blender, all on Avi's PC through the session queue (one job at a time):
  - animals: tools/blender/reef_kit.py (`fish_spec`, fish clips fly/hover/glide/perch/eat/sleep, fish scales skin) + tools/blender/animals/<id>.py → art/rigged/reef → src/data/rigged-reef.js. `meta.rough` (wet skin) and `meta.opacity` (jellyfish) are read by src/models/rigged.js.
  - fixed life: tools/blender/reef_flora.py (`flora_job(id)`, exec into its own namespace, it switches to its own scene so modifiers apply) → art/reef/flora → tools/build-reef-flora.py → src/data/reef-flora.js, drawn by src/models/reef-plants.js (coral material: bleaching, sway, night glow; Blender corals appear at ~82% size and grow only a little; `SIZE_B` scales).
  - devices: tools/blender/reef_props.py → art/props/reef_props.json, merged by tools/build-props.py.
  - floor: tools/blender/reef_ground.py (needs pano_common.py and ground_textures.py in the PC folder) → art/ground/reefsand_*, reefrubble_* → tools/build-ground-textures.py.
- Tools: TOOL_DEFS entries have `zones`; `toolDef(id, biome)` gives the reef look (רובוט צולל, מצלמה תת־ימית, מצוף חיישנים); reef-only nursery / reefball / buoy. Events: `anchor` (prevented by a buoy), heat softened by the sensor buoy.
- Learning hub: reef tab, cards, sets (בוני השונית, שותפים בשונית, שומרי השונית); reef cards use their painting as thumbnail.
- Card paintings: Gemini in Avi's Chrome (prompt style in docs/DEVLOG.md); Chrome blocks a second automatic download from a tab, so collect images as data URLs in the page and download one JSON from a fresh same-origin tab.
- Card games: "מחזיקים את היער" has a reef board (rows מים רדודים / מדרון השונית / קרקעית, `KF_ROW` moves brain coral and anemone to the slope and sponge and algae to the floor; reef events: murky water, warm water, storm, a flood from the wadi, an anchor, a new pier, a broken table coral, a calm sea, a spawning night; no drought; reef devices only). "חוט הקשר" has a reef tab. The daily report has reef wording.
- The rescue robot shows a red "!" on each plate where the Blender model had a cross (`bangMark` in src/world/props.js).
- Not done yet: a Blender panorama of the Eilat mountains (the sky dome paints them for now), Hebrew names still to confirm (מנתחן, דקר, גובי, שרימפס אקדח).

## Where things stand (1.2.3, and 1.3.0 in development)

1.2.3 is built (branch `claude/1.2.3`, installers on the owner's PC in `Documents\reshet-hachaim-blender\installer`):
- Animals v2 to v5 (`tools/blender/animal_kit_hd.py`, see `tools/blender/README.md`): SDF bodies, baked textures with a natural tone layer, eyes with lids, three-joint legs with hooves and paws and a stance / swing gait, wing beat with a folding upstroke, body plans by family (`BODY`), mouths (`MOUTH`), a neck so the head stands out and turns on its own (`NECK`, `NECK_FIX`), LOD. All 33 were exported with v5 on 16.10; `art/rigged` holds them.
- Two Blender bees (`honeybee.py`, `orchidbee.py`, one model in two colours).
- "Where?" beacons for a species, mission how-to hints, done-by-itself notes and the completed-missions list, zone names instead of "the island" (`src/core/place.js`), game controller support (`src/ui/gamepad.js`).

`claude/research-1.3` (version 1.3.0, the research world "חוקרי היער", still in development and not published: no public release, the owner tests it on his PC; test installers are in `installer\1.3.0-dev`) has everything from 1.2.3 merged in; merge each 1.2.x fix into it as well. It installs over 1.2 and keeps all data (see the upgrade rule above).

At the end of a Blender session: stop the queue and keep-awake timers, save the scene to `blend\` and quit Blender (the owner asked that nothing keeps running on his PC). The scripts are the source; the saved `.blend` is only a convenience.

The Blender kit master copy is the repo file; the PC copy at `Documents\reshet-hachaim-blender\animals\animal_kit_hd.py` is updated with the device file tool and exec'd into the Blender session namespace.

Open, in rough priority order:
- Real-world testing is under way (October 2026): children and adults of different ages and levels of tech literacy play 1.2.3. Reviews are very good, they compare it to "real" games rather than school software, and only cosmetic fixes have come up. Still untested: a weak school PC, a real Mac.
- The owner's vision for 1.3 (the big release: reef, research lab, design thinking, one opening film plus in-engine scenes, many new cards) and 1.4 (desert, weather, changing the environment, "מתכנתים בטבע" with programmable drones and a modular robot) is in `docs/ROADMAP.md`. One new environment per big release; new cards, card games and quizzes are split between releases; a release that grows too big is split in three instead of two, depending on demand. Decided: no internet or AI connection.
- Lower-detail models for far-away animals (biggest remaining performance win).
- Click targets of 24 to 32 px in the album and web puzzle at 1024x600.
- Auto quality still reacts slowly on very weak machines.
- Feedback from the Baba Da instructors' pilot group.
- The owner's development ideas (coral reef zone, more card games, the Lab, visual programming of drones and robots, two known bugs) are in `docs/ROADMAP.md`.
