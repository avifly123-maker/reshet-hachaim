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
