# Code map (1.3.2) — where things are, for a developer new to רשת החיים

Plain JavaScript (ES modules) + three.js r186, bundled by esbuild (`build.mjs`). No framework, no network at run time.
Every folder that holds a part of the game starts with an `index.js` whose header says what it does, what it exports
and what it needs. Read CLAUDE.md for the rules that never change (content, upgrades, look), then this file.

## Run it

```bash
npm install
node build.mjs                    # dist/index.html  (general edition, one offline file)
node build.mjs --edition=torah    # dist/index-torah.html
node build.mjs --desktop          # desktop/app (Electron; packs load on demand)
npm run check                     # every check (≈15 min); npm run check:quick = validators + builds (≈1 min)
```

## Folders

| Folder | What lives there |
|---|---|
| `src/main.js` | Start-up: creates the renderer, UI, audio, voice, guide; opens forests, the hub, the lab, mysteries; the stage moments of the journey. |
| `src/core/` | Small shared services without UI. `storage.js` (every save key, per player or per device), `profiles.js` (up to six players), `journey.js` (מסע החוקר: stages and which parts are open), `threads.js` (links between parts), `badges-store.js`, `sources-store.js`, `edition.js`, `packs.js` (lazy loading), `util.js`. |
| `src/game/game/` | One forest while it runs: world state, placing and dragging, ecology, events, missions glue, saving, the update loop, dispose. `index.js` builds one `ctx` and adds the parts in order (`addPart`). |
| `src/game/` | Around the forest: `tools.js` + `tool-defs.js` (devices), `missions.js`, `report.js`, `tour.js` (through an animal's eyes), `after.js` with `visitors.js`, `photos.js`, `challenges.js`, `rank.js` (after the missions), `fieldcam.js`. |
| `src/world/` | 3D things that live in a forest: plants, animals and their behaviour, the camera, effects, props, `tech.js` (the six new technologies and רובו־דע on the island). |
| `src/sim/` | Light map and species rules. |
| `src/env/` | The renderer pipeline and the environment: `environment/` (sky, sun and moon, weather, ground, water, island edge…, one file per part), `reef.js`. |
| `src/models/` | Procedural plant and animal models per zone (folders, one file per family), the Blender-rigged animals (`rigged.js`), reef models. |
| `src/ui/ui/` | The overlay UI: start screen, HUD, tray, toolbar, missions panel, species card, toasts. `src/ui/ui.js` re-exports it. |
| `src/ui/` | Other screens and pieces: `robo-guide.js` (רובו־דע's bubbles), `settings.js`, `journey-map.js`, `threads-ui.js`, `stage-scenes.js` (the stage films), `flourish.js`, `howto.js`, `badge-toast.js`, `css/` (one stylesheet per area; `00-layers.css` = the layer order). |
| `src/learn/hub/` | מרכז הלמידה: album, packs, quiz, sets, badges and frames screens, navigation. |
| `src/learn/games/` | The card games: keep-forest (folder), web-puzzle, inventors (and the robot workshop), expedition, verse-match. |
| `src/lab/` | The lab of רובו־דע: the room, stations, microscope, atlas, thinking corner, cabinet. |
| `src/research/` | חוקרי הטבע: the mysteries (`cases/` = one data file each), the population model, the session, the notebook. |
| `src/robolab/` | מעבדת הרובוטים (1.4.1): `engine/` (pure, deterministic: world, blocks, sensors, signals between tools, goals, `run.js`), `ui/` (block editor, icons, the flat map kept for tests), `three/` (a lesson as a training field on the zone's real island: `course.js`, `session.js`; the Blender tools from parts: `parts3d.js`, simple fallbacks `models.js`), `garage.js` (סדנת העיצוב: parts and colours), `earn.js`, `progress.js`. Data in `src/data/robolab/` (lessons, chapters, lines, parts and paints). |
| `src/audio/` | Sound effects, music, `voice.js` (plays the recorded lines). |
| `src/data/` | Content (zones, cards, missions, quiz, guide lines in `guide/`, threads) and generated asset tables (pictures, voice, models – made by `tools/build-*.py`, never edited by hand). |
| `src/packs/` | Entry points of the lazy packs (game, hub, lab, research, one per zone). |
| `tools/` | Builders of generated data (`build-*.py`), validators (`validate-*.mjs`), test runners (`play.py`, `regress.py`, `check-old-saves.py`, `check-all.sh`), the voice maker (`voice/`), Blender scripts (`blender/`), release packing. |
| `tests/` | Play scripts (`play/*.json`), save fixtures of every released version (`fixtures/`), model galleries. |
| `desktop/` | Electron shell (`main.js`, `preload.js` mirrors the saves to a file), builder configs for both editions. |
| `docs/` | Plans and decisions (mostly Hebrew): ROADMAP, JOURNEY, RESEARCH, LAB, SPEC-1.3.2, sources.md (a source for every fact). |

## How to…

- **Add a save:** add the key to `K` and `KEYS` in `src/core/storage.js` (per player or per device) and use
  `readPlayer` / `writePlayer` (or the device ones). Never rename an existing key. `validate-storage` checks it.
- **Add something that floats over the screen:** give it a layer from `src/ui/css/00-layers.css` (`var(--z-…)`), not a number.
- **Add a line for רובו־דע:** in `src/data/guide/<area>.js`, `{ id, f, k }` with full nikud in `k`; run
  `node tools/validate-guide.mjs`, then record it: `python3 tools/voice/make.py --model <shaul.onnx> --check`.
- **Add a part that opens along the journey:** `PARTS` in `src/core/journey.js`, a veil where it is shown, an intro in `src/data/guide/`.
- **Add a mystery:** a case file in `src/research/cases/`, list it in `cases/index.js`, run `node tools/validate-research.mjs --all`.
- **Add a zone (1.4):** an entry in `ZONES` and `ZONE_LOOK` (`src/data/zones.js`, the one list of zones: code that needs "every zone", a zone's short name, colour or mascot reads it from there), `src/data/<id>.js`, `src/packs/<id>.js`, then run `node tools/validate-zones.mjs <id>`: it lists every other table that still needs the zone (place words, quiz, lab words, ranks, card games, kids' set…).
- **Add a card, species or mission:** the zone file in `src/data/` (`amazon.js`, `grove.js`, `reef.js`, `kids.js`), with a source in `docs/sources.md`.
- **Add a robot-lab lesson or puzzle:** an entry in `src/data/robolab/lessons-*.js` (map rows, items, tools, the blocks it offers, goal, par, two different solutions), then `node tools/validate-robolab.mjs` (every solution must pass, an empty program must fail).
- **Add a part or colour for the tools:** model it in `tools/blender/robolab_kit.py` (an object whose origin sits on a socket, materials by slot name), run `rl_build()` and `rl_export()` on the PC, copy the JSON to `art/robolab/parts_export.json`, `python3 tools/build-robolab-parts.py`; then list it in `src/data/robolab/parts.js` (tool, socket, what blocks it gives, how it is earned).
- **Let something new hear the tools' signals:** push `{ id, on(m, from, W) }` into `W.listeners` (`src/robolab/engine/world.js`); a block `send` reaches it.
- **Change a big screen safely:** take regression shots before and after (`python3 tools/regress.py dist/index.html shots/regress/<name>`, then `--compare`), and run `npm run check`.
