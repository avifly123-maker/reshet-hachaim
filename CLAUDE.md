# CLAUDE.md: רשת החיים

The short brief every session reads first (kept under ~12 KB; cut from 94 KB in the 1.4.4 stability set). History,
decisions and tool tricks of every version: `docs/HISTORY.md`. The map of the code: `docs/CODEMAP.md`. The code rules:
`docs/RULES-CODE.md`. The review checklist: `docs/REVIEW-CHECKLIST.md`. Owner's way of thinking: `docs/ROADMAP.md`.

## The project

An offline 3D educational game about biodiversity in Hebrew, for Haredi children aged 6 to 12, for Baba Da (בבא דע, an
educational non-profit that owns the game). Five zones (Amazon, Mediterranean grove, Eilat reef, desert, savanna), the
journey of 9 stages that opens the game step by step, a learning hub (cards, quiz, card games), the science centre (חוקרי
הטבע mysteries, רובו־דע's lab, the robot lab with קוּבִּי, ניצוץ's inventors' workshop), weekly events. Plain JS + three.js
r186, esbuild → one offline HTML; Electron for Windows and macOS. Repo `avifly123-maker/reshet-hachaim`.

## Current state (8.11.2026)

- **Children play 1.3.3** ("רשת החיים – המסע"): tag `v1.3.3`, refreshed in place on `claude/1.3.3-refresh2` (8.11,
  same version). Note: `main` already holds the 1.4.1 merge (PR 13), so it is not the children's build.
- **1.4 is a separate install for testers only** ("רשת החיים – המסע הגדול", `desktop/builder-1.4.json`). Work branch
  `claude/1.4.4`. 1.4.4 is complete (plan `docs/PLAN-1.4.4.md`); the stability set after the architecture review is
  `docs/PLAN-1.4.4-STABILITY.md` (its progress list says where it stands). Nothing from 1.4 goes into the children's
  build until Avi orders it; then that version is built with builder-torah.json's appId and installs over 1.3.3.
- **Next, after the stability set:** Avi decides the version number (likely 1.4.5) and when 1.4 reaches the children;
  replace רובו־דע's voice with a Gemini TTS voice (969 clips; method in HISTORY, 7.11); more animal rounds (3 of 10–15).
- **Open bug:** a tester saw the whole Amazon island vanish after it opened (29.10); not reproduced headless. Ask for a
  photo of the F strip (last error, GL context, visible meshes) before guessing.

## Rules that never change

- **Talking with Avi:** Hebrew only, plain everyday language. Careful with tokens; one task at a time; no swarm of
  parallel agents unless he asks; prove every change. Documents fully RTL; text for others must not read as machine-written.
- **How to work (Avi, "always"):** in layers, tidy and coordinated code; a change in one part is checked against every part
  it touches; every so often a code review, a visual review and an overlap check (no toolbar over a function, never two
  voices or רובו־דע and קוּבִּי speaking together); think of weak computers: lighter without uglier.
- **Every part built or improved comes with its hands-on tutorial** (`runGuided`, words in `src/data/guide/tutorials.js`,
  once per player) **and a play script in `tests/play/` inside check-all.**
- **Content:** no human figures (one exception: ניצוץ, decided 28.10), no women or girls, no dinosaurs, no "millions of
  years" ("בעבר הרחוק"), no evolution language, no pigs, no cross shapes of any kind (plus signs, crosshairs, first-aid
  cross: a red "!"), gentle simple Hebrew with correct gender, full RTL, nikud for beginners, a source for every fact
  (`docs/sources.md`). The word "תורני" is never shown. `validate-content` enforces the text rules.
- **Upgrades keep the data:** never change an `appId`, a `productName`, the `app://game` origin or a `web-of-life*` storage
  key; every released version's save in `tests/fixtures/` must load (`tools/check-old-saves.py`).
- **Code rules** (`docs/RULES-CODE.md`): one owner per resource; free only what you made (`disposeOwned`, mark shared
  things `userData.shared`); async bound to its run; failures go to `logError` (`src/core/log.js`), never swallowed;
  content is read-only at run time; parts meet through `src/core/services.js`, `window.__*` is for tests;
  `tools/check-bounds.mjs` enforces the boundaries.
- **Look:** polished and colourful, "not a circus". Trees stay procedural; animals are Blender-rigged, traced from photos,
  refined about five times each; Avi approves a pilot before many are made.
- **Git:** push only to `claude/*`; Avi merges. Never into `main` without Avi.

## Build and test

```bash
npm install
node build.mjs [--edition=torah]          # dist/index.html, dist/index-torah.html
node build.mjs --desktop --edition=torah  # desktop/app
npm run check        # tools/check-all.sh: validators, check-bounds, builds, play scripts, old saves, worlds (~1.5 h on 2 CPUs)
npm run check:quick  # validators + builds
python3 tools/play.py dist/index.html tests/play/<name>.json 800 460   # one play script
python3 tools/regress.py <page> shots/regress/<name> [--compare]     # screens before / after
python3 tools/check-leaks.py dist/index.html                         # slow, before a release
```

Headless: SwiftShader starts on the 'min' tier: `bus.emit('quality',{q:'medium'})` for real visuals. Debug handles:
`window.__app` (incl. `lastErrors()`), `__game.debug`, `__rlDebug`, `__wsDebug`, `__labDebug`, `__wolLearn`, and the list
in `src/core/services.js`. Test switches: `__failLoadAt`, `__filmWatch`, `__noRender`, `__timeScale`.

## Where things are

`docs/CODEMAP.md` lists every folder and "how to add…". In short: `src/core/` services without UI (storage, profiles,
journey, badges, weekly, log, math, services); `src/game/` the island game (`game/` parts assembled by `createGame`,
`savanna/`, training); `src/env/`, `src/models/`, `src/world/` the 3D; `src/ui/` screens, the guide, CSS layers;
`src/learn/` the hub and card games; `src/research/` mysteries; `src/lab/` רובו־דע's lab; `src/robolab/` the robot lab
(`engine/` pure); `src/workshop/` ניצוץ's workshop; `src/weekly/` weekly events; `src/data/` content (generated asset
tables are built by `tools/build-*.py`, never edited by hand); `tools/` build, checks, Blender kits, voice, music.

## Releases and delivery

- **Build:** `bash tools/pack-1.4.sh` (the 1.4 install; rcodesign from `~/.cargo/bin` for the Mac app) or
  `bash tools/pack-torah.sh` (the children's edition). `SHA256SUMS.txt` in every folder. Installer ceiling 250 MB.
- **Avi's PC:** 1.4 lives in `Documents\reshet-hachaim-1.4` (installer, animals, blend, art), 1.3 in
  `Documents\reshet-hachaim-blender`. Big files: 24 MB parts, joined and hashed on the PC (device_bash: `cat` into the VM
  home, then `cp` into the mount), or SendUserFile then device_commit_files with the `fileUuid`.
- **Drive:** 1.4 development builds only in the private folder `G:\האחסון שלי\רשת החיים 1.4 - קבצי פיתוח (פרטי)`.
  The shared folder "רשת החיים- המסע" (parents and testers) gets 1.3.3 files only, and only when Avi says so.
- **GitHub releases:** sessions cannot use the release API; open the pull request, give Avi the release text
  (`docs/RELEASE.md`), he merges, publishes and attaches the files.
- **Blender** runs on Avi's PC (his work computer): one job at a time through the session queue
  (`tools/blender/bridge/`), never call it while a job runs, nothing left running at the end. Kits and methods:
  `tools/blender/README.md`, `tools/blender/refs/README.md`, `docs/WORKFLOW.md`. Headless `bpy` in the container works
  for the robot lab, Nitzotz, medals and frames.
- **Voice:** רובו־דע: Piper "shaul" (`tools/voice/make.py`, `--check`, record only what changed); קוּבִּי: Chatterbox on
  the PC (needs ~3 GB free RAM); ניצוץ: Gemini TTS in AI Studio. Details in HISTORY.

## The studio

Avi's private studio repo (method, rules, skills, kits for the next projects) is separate. Lessons from this game go
there at the end of each version.
