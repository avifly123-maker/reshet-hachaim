// services.js – one place where the shared services of a page live (1.4.1), instead of the parts reaching for
// window.__guide and window.__app. main.js registers them once at start-up; a part asks for them when it needs them
// (they may be missing while the page starts, or in a test page, so every reader allows null).
//   setService(name, value)   main.js and robo-guide.js
//   svcGuide()                רובו־דע's bubbles (src/ui/robo-guide.js), or null
//   svcApp()                  { bus, ui, audio, music, pipe, voice, guide, journey, loadBiome, game, … } (main.js), or null
// window.__guide and window.__app stay as handles for the headless test tools (tools/*.py); game code does not read them.
const S = Object.create(null);
export function setService(name, value) { S[name] = value; }
export const svcGuide = () => S.guide || null;
export const svcApp = () => S.app || null;
// 1.4.4 stability set: the other shared parts the game reaches for, by name (registered where they are made):
//   'flourish' (ui/flourish.js), 'learn' (the hub: open, close, isOpen, grantPack; main.js), 'stageScene' (ui/stage-scenes.js),
//   'playtimeCheck' (main.js)
export const svc = (name) => S[name] || null;
export const svcQuality = () => { try { return (S.app && S.app.quality) || 'medium'; } catch (e) { return 'medium'; } };
// window.__* names are for the headless tests and debugging only; product code never reads them (tools/check-bounds.mjs):
//   handles the game sets:  __app __guide __game __journey __wolLearn __flourish __stageScene __ptCheck __svFilm __rlDebug
//     and the other __*Debug objects, __det, __badges, __playtime, __rlCourse, __labDebug, __ivDebug, __exDebug, __kfDebug, __wpDebug
//   switches only a test sets:  __filmWatch __noRender __tech __timeScale __failLoadAt
