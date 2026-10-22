# 1.3.2 technical spec (for the development agents)

Avi's plan (Hebrew, approved 22.10.2026) is the Docs page "רשת החיים 1.3.2: מפת פיתוח". This file turns it into code
contracts. Read `CLAUDE.md` (rules that never change, build and test) first. Everything the child sees is Hebrew, RTL,
simple, gentle; no human figures, no cross / plus / crosshair shapes, no dinosaurs or "millions of years", no pigs.
The child is addressed in plural ("בחרו", "אתם"). Beginners (`web-of-life-mode` = 'kids') read full nikud.

## The idea in one line
The game stops feeling like a huge supermarket: it opens step by step (מסע החוקר), רובו־דע presents and explains every
part in his voice, a lighter "חוויה" mode trims text in the forests, and the parts feed each other (threads).

## Foundation (already in the branch, use it, do not rewrite it)
- `src/core/journey.js` — stages and parts. `PARTS` (ids: `zone:amazon`, `zone:grove`, `zone:reef`, `journey`, `learn`,
  `album`, `quiz`, `webpuzzle`, `keepforest`, `badges`, `science`, `lab`, `lab:scope`, `lab:atlas`, `lab:table`,
  `inventors`, `robots`, `research`, `lab:greenhouse`, `lab:aquarium`, `lab:cabinet`, `frames`, `expedition`, `duel`,
  `versematch`, `experts`), `STAGES` (6). `isOpen(part)`, `lockInfo(part)` → `{ stage, name, text }`, `state()`,
  `check()`, `markUsed(part)` (call it when a part is really used: the lab stations open one after the other by it),
  `playMode()` → 'experience' | 'full' | 'kids', `setPlayMode`, `textSize()` / `setTextSize` ('normal'|'large'|'xlarge'),
  `voiceOn()` / `setVoice`, `allOpen()` / `unlockAll(code)` / `lockAgain()` (instructors, code `INSTRUCTOR_CODE`).
  A player with any progress from before 1.3.2 is `legacy`: every part is open for them, and they keep the full mode.
  Events: window `wol-stage` ({stage, parts, legacy}), `wol-journey` (something changed: repaint locks),
  `wol-stage-done` (the stage moment closed). Progress is announced by `wol-progress` (missions, lab, mysteries already
  fire it) and `wol-badge`.
- `src/ui/robo-guide.js` — `window.__guide` (also `__app.guide`): `say(lines, { key, force, modal, place, actions, tip })`,
  `intro(part)` (lines of `GUIDE[part]`, once per player), `tip(line)`. The figure sits bottom-right; `at` in a line
  rings an element. `src/ui/robo-face.js` draws his face (the lab's visor face) and his SVG figure.
- `src/audio/voice.js` — `__app.voice.say(lineId)`. Lines are voiced in advance (main session) into `src/data/voice.js`.
  Until then the guide shows words only. Never call the voice for a line that is not in `guide-lines`.
- `src/data/guide-lines.js` gathers `src/data/guide/{stages,start,hub,lab,zone,research}.js`. Each area owns its file.
  Line: `{ id: '<area>.<key>.<n>', f, k, at?, expr? }`, up to ~15 words, one idea; `k` with full nikud.
  `node tools/validate-guide.mjs` must pass.
- `src/ui/css/*.css` — one stylesheet per area, concatenated by build.mjs after style.css (sorted by name).
  `html.ts-large` / `ts-xlarge` set `--ts` (1.18 / 1.36); multiply the font size of words a child must read by it.
- `src/main.js` — creates voice and guide, greets a player (stage 1 hello or the legacy note), shows the stage moment
  on `wol-stage` (`window.__stageScene(n)` is called first if it exists: the animation, 5 to 7 s), checks the journey
  whenever the start screen shows.

## Rules for every part
- Lock = veil, never hide: a part that is not open is shown dimmed with a small lock-free "curtain" (no padlock that
  reads as a cross) and its `lockInfo(part).text`. A click on it lets רובו־דע say what opens it (a short `tip`).
- When a part opens and the child enters it the first time: `guide.intro(part)` (modal, 3 to 5 bubbles with `at`).
- Nothing that is open today closes for a legacy player. Saves of every version load (tools/check-old-saves.py).
- Experience mode changes only the forests (zones). Cards, lab, mysteries are the same in both modes.
- No new storage keys outside `web-of-life-*`; per-player data through `profiles.key()`.
- Small screens: 800x460 and 1024x600 must show every button without scrolling the page.
- Test with `tools/play.py` (real mouse with `clickSel`), validators, `node build.mjs` and `--edition=torah`.

## Areas (one agent each in wave 2; stay inside your files, add CSS only in your own file under src/ui/css/)

### A. Start screen, map, settings (`src/ui/ui.js` renderStart region only, new `src/ui/journey-map.js`, new `src/ui/settings.js`, `src/research/hub.js`, `src/ui/css/journey.css`, `src/data/guide/start.js`, `src/data/guide/research.js`)
- Tabs and buttons on the start screen follow `isOpen`: islands (`zone:*`; the reef island veiled until stage 4),
  science tab (`science`: research and lab panels each veiled by `research` / `lab`), learning tab (`learn`, each
  button by its part). Repaint on `wol-journey`, `wol-stage-done`, profile change.
- A journey bar on the start screen: rank name + emblem, a progress bar to the next stage, "מה עוד חסר" words from
  `state().next.need`; a click opens the map.
- `journey-map.js`: מפת המסע, a full screen: the six stages as a path (RTL, from the right), each with its parts as
  small tiles (open / veiled), the current stage glowing, the threads area (wave 3 fills it: leave a container
  `.jm-threads`), replay buttons for stage scenes (calls `window.__stageScene(n)` when present).
- On `wol-stage-done` while the start screen shows: offer to go to the new part (guide action buttons "בואו נלך!" /
  "אחר כך"), switching the tab and ringing the new button.
- Settings on the start screen (a gear next to "מי משחק?"): play mode חוויה / מלא (hidden for beginners), text size
  (רגיל / גדול / גדול מאוד), voice of רובו־דע on/off, music, "לשמוע שוב את ההסברים" (journey.resetIntros()), and the
  instructors' row: a code field → `unlockAll(code)`, a "לנעול שוב" button when open. The in-forest satchel menu gets
  the same three rows (play mode, text size, voice): coordinate by exposing `settingsRows()` HTML + a click handler from
  settings.js; agent C only inserts the call.
- Research hub (`src/research/hub.js`): the Baba Da logo in its top bar, `guide.intro('research')` on first entry.
- Guide lines: start (the journey bar, the map, settings), research hub intro.

### B. Learning hub (`src/learn/hub/`, `src/learn/games/inventors.js` entry only, `src/data/guide/hub.js`)
- One page, no scrolling at 800x460 / 1024x600 / larger: the album in the middle (big tile), on the right the quiz,
  "התגים שלי" (3 newest + count) and a separate "המסגרות שלי" tile (shows the chosen frame; opens a frames screen that
  is separate from the badges screen), on the left all the card games as small tiles in a grid (icon + name only):
  חוט הקשר, מחזיקים את היער, מי חזק ברשת? (its own tile now), הממציאים, משלחת לעומק, מה הפסוק מלמד? (torah + sources).
  The design sketch is in the Docs page, section 7.
- Locks per game/tile by `isOpen` (album, quiz, webpuzzle, keepforest, badges, frames, inventors, expedition, duel,
  versematch). `go(screen)` to a locked screen shows the tip instead.
- `guide.intro(<part>)` the first time each game/screen opens; the inventors game says which tab is for robots.
- Inventors: support `opts.view = 'robots'` (open on the robot workshop tab) and make the tab itself a big, clear
  button with a robot icon. `journey.markUsed('inventors'|'robots')` when used.
- `markUsed` for every hub game; the Baba Da logo stays in the top bar.

### C. The forests (`src/game/*.js` except `tour.js`, the HUD / tray / missions / species card / toasts regions of `src/ui/ui.js`, `src/ui/css/zone.css`, `src/data/guide/zone.js`)
- Experience mode (`playMode() === 'experience'`): species card = name, picture, one fact, "who it lives with", no
  question; toasts only for the important (mission done, unlocks, injured animal, events), one at a time; mission panel
  one line + icon; no expert missions; daily report off (רובו־דע one line at day end instead); events keep one line of
  explanation and at most two choices; HUD: points and one health meter. Measure before and after (an hour of
  `debug.auto()` per zone: number of toasts and words per minute) and write the numbers in docs/DEVLOG.md.
- Injured animal: a fixed red bar at the top (picture, name, what happened), one per injured animal side by side,
  stays until healed or gone; a click flies the camera to it and makes the rescue robot in the tray pulse; a larger,
  pulsing red "!" over the animal (no cross), an edge arrow when off-screen, one short sound, more time before it
  leaves, one reminder from רובו־דע before that.
- Larger text: mission title and text, tray names and prices, HUD numbers, species card: use `calc(… * var(--ts))`.
- רובו־דע in the forests: first time each tool opens, each event first happens, the first mission of a zone, and the
  answer to "מה עושים עכשיו?" (a small button near the mission panel). Experience mode leans on him more; the old coach
  stays only for players who never saw it, rendered as guide bubbles if simple, otherwise left as is.
- Expert missions open only when `isOpen('experts')`.
- The satchel menu: insert the settings rows from `settings.js` (agent A) — if it is not merged yet, leave a clearly
  marked hook `/* settings rows (journey) */`.

### D. The lab and the cabinet (`src/lab/*`, `src/research/notebook.js` logo only, `src/data/guide/lab.js`)
- Station hotspots follow `isOpen('lab:<station>')` (scope, atlas, table, greenhouse, aquarium, cabinet; the thinking
  corner and talk follow the lab itself). A veiled station: a dim hotspot, a click → רובו־דע (the lab's own robot
  speech) says what opens it. `markUsed('lab:<station>')` when an activity there is done.
- Every station: the first entry explains in 3 to 4 bubbles what can be done there (use the lab's own robot and
  `say()`, plus `__app.voice.say(id)` with the same line ids from `guide/lab.js`). The inventors table shows two big
  doors: "ממציאים פתרון" and "בונים רובוט" (opens inventors with `{ view: 'robots' }`; robots part by `isOpen('robots')`).
- The Baba Da logo in the lab top bar, in the research notebook header, and on patents / certificates (small).
- Cabinet (ארון הממצאים): replace the plain SVG folders of solved mysteries by a painted find per mystery (paintings
  come later as `art/lab-items/find-<caseId>.webp` through `manifest.json`; until then a soft tile with its name) and
  the plain jars by rendered jars (later `art/lab-items/jar-<id>.webp`); add shelves "תמונות מהאי" (wave 3 photos:
  read `web-of-life-photos` per player if present), "רובוטים שבניתי" (from the robot workshop's saved builds, read
  from the hub store if present; otherwise record builds in lab progress `robots`), "מבקרים נדירים" (wave 3, read
  `web-of-life-visitors` if present). A not-yet-found exhibit is a soft shadow of its shape, not "?". A click on an
  exhibit opens a small card with its story (where from, what we learned).

### E. The tour through the animal's eyes (`src/game/tour.js`, `src/sim/animals.js` only where needed, `src/data/reef.js` shark entries, `src/data/kids.js`, `src/models/reef-animals.js` fallback)
- Clownfish: the chase camera keeps at least ~3 m from small fish and rises over corals in the way (as the close-look
  view does); the fish slides along corals and rocks instead of entering them (expose reef decor/rocks from
  `src/env/reef.js` read-only if needed); no sleeping or homing while toured.
- Reef shark: available to beginners, unlocks earlier, does not leave from hunger (a roaming reef predator), a wider
  diet only if a checked source supports it (docs/sources.md); a simple fallback model so a missing Blender model can't
  crash; in the tour picker an animal that is not on the island shows as a shadow with one line on how to bring it.
- Then tour every animal of the three zones headless and fix any other stuck/missing case of the same kind.

## Wave 3 (after wave 2 is merged)

### F. Threads engine and their screens (`src/core/threads.js`, `src/data/threads.js`, the `.jm-threads` part of `src/ui/journey-map.js`, card stamps in `src/learn/hub/`, recommended mystery in `src/research/hub.js`, the "from your island" marks in `src/lab/`)
- `src/data/threads.js`: `THREADS = [{ id, mode: 'exp'|'full', from: { kind, id }, to: { kind, id }, effect, f, k, fact, src }]`.
  `from.kind`: 'invention' (lab progress inventions / solved problems), 'case' (a solved mystery), 'photo' (a species
  photographed on the island), 'link' (a relation discovered), 'event' (an island event lived), 'zone' (all regular
  missions of a zone), 'robot' (a robot built in the workshop), 'think' (a thinking-corner activity done).
  `to.kind`: 'tool' (an island tool upgrade, `effect` = { tool, key, value }), 'choice' (a new event choice),
  'reveal' (links shown on the island), 'measure' (the quadrat / notebook on the island), 'sample' (a microscope
  sample marked), 'question' (an atlas question marked), 'case' (a recommended mystery), 'problem' (inventor problems
  marked "מחכות לך"), 'robotout' (the child's robot works on the island), 'stamp' (a card stamp).
  Experience mode = the six simple threads of the Docs page section 4; full = all (the 22 of the earlier page + tech).
- `src/core/threads.js`: `active()` → open threads for the current player and play mode, `has(id)`, `toolBoost(tool, zone)`
  → { speed, range, hover, night, … } merged, `choicesFor(eventId)`, `stamps(speciesId)` → ['seen','photo','scope',
  'invent','case','source'], `fresh()` → threads opened since last shown (for רובו־דע's announcement), `markShown()`.
  Computed from the saves (like journey.js), no new saves except shown ids (`web-of-life-threads`).
- Announcement: when a thread opens, רובו־דע says its line (f/k) with a `tip` (or modal in the journey map).
- The journey map draws the threads between the parts (a soft line per open thread, a dashed one + hint per closed).

### G. Technologies and רובו־דע on the island (`src/game/tool-defs.js`, `src/game/tools.js`, new `src/world/tech.js`, `src/data/guide/zone.js` additions)
- Six new tools (Docs section 5): canopy robot (amazon), lidar drone (amazon), thermal drone (grove, night), fire
  watch tower (grove, softens fire events), healthy-reef speaker (reef, young fish arrive at a damaged reef),
  coral-spawning robot (reef, spawning night). Procedural three.js models for now (clean, toy-like, teal/white like
  רובו־דע; no cross shapes); Blender versions later. Each has a clear visual effect (scan lines, heat glows, sound rings,
  floating coral eggs). Experience mode: they work by themselves and show the picture; full: also numbers / a graph.
  They unlock through missions like other tools and fit the journey (no tool before its zone opens).
- Tool upgrades from threads: read `threads.toolBoost(tool, zone)` (fallback: no boost) — drone hover, camera night
  range, rescue speed, watergen output, nest box storm-proof, buoy range, murky water shorter, sharkskin (keep).
- רובו־דע on the island: the lab robot model (src/data/lab-robot.js, decoded like src/lab/lab.js) hovers near the camera
  target when he speaks in the forest, and goes to a spot he points at. Light: only while a guide bubble is open.

### H. After the missions (`src/game/visitors.js`, `src/game/photos.js`, `src/game/challenges.js`, island rank in `src/game/rank.js`, start-screen badge under the island through a small hook)
- Rare visitors: per zone 3 existing hard-to-attract species with conditions (e.g. harpy eagle: enough monkeys and tall
  trees; reef shark visiting; a hoopoe or owl in the grove) → a short visit, a guide line, photograph it to keep it
  (`web-of-life-visitors` per player: { id, zone, t, img? }).
- Photo mode with the field camera / a "צילום" button: a framed shot, small JPEG (≤ 160 px, ≤ 12 kB) saved in
  `web-of-life-photos` (max 40 per player, oldest dropped); photo missions ("טוקן אוכל פרי"); a photo of two linked
  species counts more. The cabinet already reads this key.
- Guardian challenges (full mode): one short challenge per visit from templates, three levels; rank points.
- Island rank: per zone 4 ranks (e.g. חורש צעיר, חורש פורח, חורש עבות, חורש עתיק) from species alive, active links,
  seasons survived, challenges; shown on the start screen under the island and as small visual extras on the island.

### I. Animations (`src/ui/stage-scenes.js` → `window.__stageScene(n)`, plus small flourishes)
- Six stage scenes, 5 to 7 s each, staged in-engine with existing models (רובו־דע from src/data/lab-robot.js, rigged
  animals, island stills / panoramas, card paintings), drawn in an overlay canvas with its own small renderer that is
  disposed after the scene; skippable; replayable from the map; low quality on weak machines. Docs section 12 lists
  what each scene shows. The Baba Da logo on the last frame.
- Short flourishes (1 to 2 s): a part opening (its tile lifts and shines), a new thread (a glowing line drawn), a badge.
- Other places (Avi: "more animations from existing models"): the hub album opening, the lab entrance (רובו־דע waves),
  the mission-done moment on the island (an animal from the mission runs a small celebration loop).

## Reporting
Each agent commits on its own worktree branch with clear messages (end with the Co-Authored-By line from CLAUDE.md
sessions), runs the validators and an integration run, and reports in English: what changed (files), how it was
tested (with screenshot paths), what is left or uncertain. Do not touch files of another area; if you must, say so.
