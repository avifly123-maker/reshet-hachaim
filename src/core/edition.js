// Which edition this build is: 'general' (default) or 'torah' (מהדורה תורנית: node build.mjs --edition=torah).
// The torah edition adds content from the sources (src/data/torah.js); a switch ("מקורות ופסוקים", on by default)
// shows or hides all of it. Each edition is a stand-alone game with its own saves:
//   desktop – its own app id and data folder (desktop/builder-torah.json);
//   browser – the torah edition keeps its keys under 'torah:' (the shim below), so both files can live side by side.
/* global __EDITION__ */
import { K, readDeviceRaw, writeDeviceRaw } from './storage.js';
export const EDITION = typeof __EDITION__ !== 'undefined' ? __EDITION__ : 'general';
export const TORAH = EDITION === 'torah';
export const EDITION_NAME = TORAH ? 'מהדורה תורנית' : '';

if (TORAH && typeof window !== 'undefined' && !window.wolDesktop && typeof Storage !== 'undefined') {
  try {
    const P = Storage.prototype, get = P.getItem, set = P.setItem, rem = P.removeItem;
    const map = (k) => (typeof k === 'string' && k.startsWith('web-of-life') ? 'torah:' + k : k);
    P.getItem = function (k) { return get.call(this, map(k)); };
    P.setItem = function (k, v) { return set.call(this, map(k), v); };
    P.removeItem = function (k) { return rem.call(this, map(k)); };
  } catch (e) { /* storage unavailable */ }
}

// the switch is for the whole computer (core/storage.js K.sources)
export function sourcesOn() {
  if (!TORAH) return false;
  return readDeviceRaw(K.sources) !== 'off';
}
export function setSourcesOn(on) {
  writeDeviceRaw(K.sources, on ? 'on' : 'off');
  try { window.dispatchEvent(new CustomEvent('wol-sources', { detail: !!on })); } catch (e) { /* */ }
}
