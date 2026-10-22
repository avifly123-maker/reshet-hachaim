// רשת החיים – player profiles: up to 6 children can share one copy on one offline computer.
//
// Storage (localStorage, every access wrapped in try/catch – the game also works without storage):
//   'web-of-life-profiles' = { list: [{ id, name, animal }], current: id }      (device-wide)
//   per-player data lives under  `${base}::${playerId}`, e.g. 'web-of-life-cards::p1'
//   device-wide keys stay unprefixed: the profiles store itself, 'web-of-life-quality', 'web-of-life-campad'.
//
// Migration: the first run that finds no profiles store creates "שחקן 1" and moves every existing
// per-player key ('web-of-life-*' except the device-wide ones) to that player's prefixed key.
//
// API: list(), current(), setCurrent(id), add(name, animal), rename(id, name), setAnimal(id, animal),
//      remove(id), key(base), state(), MAX, NAME_MAX.   Exposed as window.__profiles for tests.

export const STORE = 'web-of-life-profiles';
export const MAX = 6;   // 1.3.2: six children (was four)
export const NAME_MAX = 14;
const PREFIX = 'web-of-life-';
const SEP = '::';
const DEVICE_KEYS = new Set([STORE, 'web-of-life-quality', 'web-of-life-campad', 'web-of-life-autoq']);
// the animal avatars a player can pick (ids of painted card art; see src/ui/avatars.js)
export const ANIMALS = ['owl', 'fox', 'hedgehog', 'hoopoe', 'toucan', 'dartfrog', 'sloth', 'butterfly'];

let P = null;   // { list, current } – kept in memory too, so profiles work even when storage is blocked

const ls = () => { try { return window.localStorage || null; } catch (e) { return null; } };
const allKeys = () => { const s = ls(); const out = []; try { if (s) for (let i = 0; i < s.length; i++) out.push(s.key(i)); } catch (e) { } return out; };
const isPerPlayerLegacy = (k) => typeof k === 'string' && k.startsWith(PREFIX) && !k.includes(SEP) && !DEVICE_KEYS.has(k);
const cleanName = (n) => String(n == null ? '' : n).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
const cleanAnimal = (a, fallback) => (ANIMALS.includes(a) ? a : fallback || ANIMALS[0]);
const newId = () => 'p' + Date.now().toString(36).slice(-5) + Math.floor(Math.random() * 1296).toString(36);
function persist() { try { const s = ls(); if (s) s.setItem(STORE, JSON.stringify(P)); } catch (e) { } }

// "שחקן N" with the smallest N not already taken
function defaultName(list) {
  const taken = new Set(list.map((p) => p.name));
  for (let n = 1; ; n++) if (!taken.has('שחקן ' + n)) return 'שחקן ' + n;
}
// the first animal nobody uses yet
function freeAnimal(list) { const used = new Set(list.map((p) => p.animal)); return ANIMALS.find((a) => !used.has(a)) || ANIMALS[0]; }

function migrateLegacy(toId) {
  const s = ls(); if (!s) return;
  for (const k of allKeys()) {
    if (!isPerPlayerLegacy(k)) continue;
    try {
      const v = s.getItem(k);
      if (v != null && s.getItem(k + SEP + toId) == null) s.setItem(k + SEP + toId, v);
      s.removeItem(k);
    } catch (e) { /* quota or blocked: leave the legacy key where it is */ }
  }
}

function ensure() {
  if (P) return P;
  let stored = null;
  try { const s = ls(); const t = s && s.getItem(STORE); stored = t ? JSON.parse(t) : null; } catch (e) { stored = null; }
  const list = [];
  if (stored && Array.isArray(stored.list)) {
    for (const p of stored.list) {
      if (!p || typeof p.id !== 'string' || !p.id || p.id.includes(SEP) || list.some((q) => q.id === p.id)) continue;
      if (list.length >= MAX) break;
      list.push({ id: p.id, name: cleanName(p.name) || defaultName(list), animal: cleanAnimal(p.animal, freeAnimal(list)) });
    }
  }
  const hadList = list.length > 0;
  if (!list.length && stored) {
    // a damaged store: rebuild the players from the keys their data was saved under
    const ids = [];
    for (const k of allKeys()) { const i = typeof k === 'string' && k.startsWith(PREFIX) ? k.lastIndexOf(SEP) : -1; if (i > 0) { const id = k.slice(i + SEP.length); if (id && !ids.includes(id)) ids.push(id); } }
    for (const id of ids.slice(0, MAX)) list.push({ id, name: defaultName(list), animal: freeAnimal(list) });
  }
  if (!list.length) list.push({ id: 'p1', name: 'שחקן 1', animal: ANIMALS[0] });   // first run (fresh install or old data)
  P = { list, current: stored && list.some((p) => p.id === stored.current) ? stored.current : list[0].id };
  // data saved before profiles existed belongs to the first player (only once: when there was no profiles store yet)
  if (!hadList) migrateLegacy(P.current);
  persist();
  return P;
}

const copy = (p) => (p ? { id: p.id, name: p.name, animal: p.animal } : null);
const find = (id) => ensure().list.find((p) => p.id === id) || null;

export function list() { return ensure().list.map(copy); }
export function current() { const s = ensure(); return copy(s.list.find((p) => p.id === s.current) || s.list[0]); }
export function setCurrent(id) { const s = ensure(); if (!find(id)) return false; s.current = id; persist(); return true; }
export function add(name, animal) {
  const s = ensure();
  if (s.list.length >= MAX) return null;
  let id = newId(); while (find(id)) id = newId();
  const p = { id, name: cleanName(name) || defaultName(s.list), animal: cleanAnimal(animal, freeAnimal(s.list)) };
  s.list.push(p); persist();
  return copy(p);
}
export function rename(id, name) { const p = find(id); const n = cleanName(name); if (!p || !n) return false; p.name = n; persist(); return true; }
export function setAnimal(id, animal) { const p = find(id); if (!p || !ANIMALS.includes(animal)) return false; p.animal = animal; persist(); return true; }
// deletes the player and all of their saved data; the last remaining player cannot be deleted
export function remove(id) {
  const s = ensure();
  if (s.list.length <= 1 || !find(id)) return false;
  const st = ls();
  for (const k of allKeys()) if (typeof k === 'string' && k.endsWith(SEP + id)) { try { st.removeItem(k); } catch (e) { } }
  s.list = s.list.filter((p) => p.id !== id);
  if (s.current === id) s.current = s.list[0].id;
  persist();
  return true;
}
// wipes all of a player's saved data (forests, cards, packs, mode, tutorial) but keeps the player, name and animal
export function reset(id) {
  if (!find(id)) return false;
  const st = ls();
  for (const k of allKeys()) if (typeof k === 'string' && k.endsWith(SEP + id)) { try { st.removeItem(k); } catch (e) { } }
  return true;
}
// the storage key for this player's copy of `base`
export function key(base, id) { return base + SEP + (id || ensure().current); }
export function state() { return { list: list(), current: current(), max: MAX, nameMax: NAME_MAX }; }

const api = { list, current, setCurrent, add, rename, setAnimal, remove, reset, key, state, MAX, NAME_MAX, ANIMALS, STORE, _reload: () => { P = null; return state(); } };
try { window.__profiles = api; } catch (e) { /* no window */ }
export default api;
