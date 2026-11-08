// The game's saves in one place (1.3.2). Every localStorage key the game uses is listed in KEYS below, with its exact
// string, whether it belongs to the player who is playing or to the whole computer, and what it holds.
//
//   per player  ('player'): stored under profiles.key(base) = `${base}::${playerId}`  (core/profiles.js)
//   per device  ('device'): stored under the key itself, the same for every player on this computer
//
// The key strings and the stored values never change (CLAUDE.md, "Upgrades keep the data"): saves from every released
// version must keep loading (tests/fixtures/saves-*.json, tools/check-old-saves.py). The desktop shell mirrors every
// "web-of-life*" key to a file (desktop/preload.js); the torah edition's browser build keeps its keys under 'torah:'
// (core/edition.js) – both happen below this module, nothing here needs to know.
//
// API (reading never throws; a write that fails returns false and the game goes on without storage):
//   readPlayer(base, fallback, id?)  / writePlayer(base, value, id?)     JSON of this player (or of player `id`)
//   readPlayerRaw(base, id?)         / writePlayerRaw(base, text, id?)   a plain string (null when missing)
//   removePlayer(base, id?)
//   readDevice(key, fallback) / writeDevice(key, value) / readDeviceRaw(key) / writeDeviceRaw(key, text) / removeDevice(key)
//   playerMode() → 'kids' | 'full'    the level of the player who is playing (the start screen's מתחילים / מתקדמים)
//   playerKey(base, id?)             the full storage key (for a cache that must notice a player switch)
//   zoneKey(zone), saveKey(zone, kids)   the per-zone keys
//
// Adding a key: add it to KEYS (and to K), pick its scope once and for all, use the functions here; never type the
// string elsewhere. A per-device key that must also stay out of the first-run migration gets `migrate: false`.
import { key as profileKey } from './profiles.js';

// the key list and its names live in core/storage-keys.js (no import back to profiles.js); re-exported here
import { K } from './storage-keys.js';
export { ZONE_IDS, K, zoneKey, saveKey, KEYS, unmovedKeys } from './storage-keys.js';

const ls = () => { try { return window.localStorage || null; } catch (e) { return null; } };
export const playerKey = (base, id) => profileKey(base, id);

// ── raw strings
function getRaw(k) { try { const s = ls(); return s ? s.getItem(k) : null; } catch (e) { return null; } }
function setRaw(k, text) { try { const s = ls(); if (!s) return false; s.setItem(k, text); return true; } catch (e) { return false; } }
function delRaw(k) { try { const s = ls(); if (!s) return false; s.removeItem(k); return true; } catch (e) { return false; } }
// ── JSON: a missing or empty value gives the fallback, as does one that does not parse
function getJSON(k, fb) { try { const t = getRaw(k); return t ? JSON.parse(t) : fb; } catch (e) { return fb; } }
function setJSON(k, v) { let t; try { t = JSON.stringify(v); } catch (e) { return false; } return setRaw(k, t); }

export const readPlayerRaw = (base, id) => getRaw(profileKey(base, id));
export const writePlayerRaw = (base, text, id) => setRaw(profileKey(base, id), text);
export const readPlayer = (base, fb, id) => getJSON(profileKey(base, id), fb);
export const writePlayer = (base, v, id) => setJSON(profileKey(base, id), v);
export const removePlayer = (base, id) => delRaw(profileKey(base, id));

export const readDeviceRaw = (k) => getRaw(k);
export const writeDeviceRaw = (k, text) => setRaw(k, text);
export const readDevice = (k, fb) => getJSON(k, fb);
export const writeDevice = (k, v) => setJSON(k, v);
export const removeDevice = (k) => delRaw(k);

// the level of the player who is playing: the one place that reads 'web-of-life-mode'
export const playerMode = () => (readPlayerRaw(K.mode) === 'kids' ? 'kids' : 'full');
