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

// the zones whose forests are saved (data/zones.js)
import { ZONE_IDS } from '../data/zones.js';
export { ZONE_IDS };

// The names the code uses. A per-zone key is made by zoneKey / saveKey.
export const K = {
  // per device
  profiles: 'web-of-life-profiles',   // { list: [{ id, name, animal }], current }   core/profiles.js
  quality: 'web-of-life-quality',     // 'min' | 'low' | 'medium' | 'high' – the graphics the child chose      main.js
  autoq: 'web-of-life-autoq',         // { q, t } – what the automatic adjustment learned (kept two weeks)    main.js
  campad: 'web-of-life-campad',       // 'folded' | 'open' – the camera pad                                  ui/camera-pad.js
  music: 'web-of-life-music',         // 'on' | 'off'                                                         audio/music.js
  sound: 'web-of-life-sound',         // 'off' when the sounds were turned off (1.3.2)                        main.js
  sources: 'web-of-life-sources',     // 'on' | 'off' – torah edition: show the sources                       core/edition.js
  allopen: 'web-of-life-allopen',     // '1' – the instructors' switch (everything open)                      core/journey.js
  playtime: 'web-of-life-playtime',   // { lim, day, s, extra } – the parents' daily play time (1.3.3)        core/playtime.js
  // per player
  howto: 'web-of-life-howto',         // { <cardKey>: 1 } – how-to cards already seen (per player since 1.3.2) ui/howto.js
  mode: 'web-of-life-mode',           // 'kids' | 'full' – the level (מתחילים / מתקדמים)                       main.js
  coach: 'web-of-life-coach',         // '1' – the forest's coach was seen                                    game/game/intro.js
  cards: 'web-of-life-cards',         // the learning hub's album and games                                   learn/hub/
  badges: 'web-of-life-badges',       // { own, n, frame }                                                    core/badges-store.js
  srccards: 'web-of-life-srccards',   // { <sourceId>: time } – torah edition source cards                   core/sources-store.js
  lab: 'web-of-life-lab',             // the lab of רובו־דע                                                   lab/progress.js
  research: 'web-of-life-research',   // { cases } – the mysteries                                            research/progress.js
  journey: 'web-of-life-journey',     // מסע החוקר, play mode, text size, voice                               core/journey.js
  threads: 'web-of-life-threads',     // the threads between the parts                                        core/threads.js
  photos: 'web-of-life-photos',       // [{ id, sp, sps, zone, t, img, pair?, visitor? }]                     game/rank.js
  visitors: 'web-of-life-visitors',   // [{ id, zone, t }]                                                    game/rank.js
  after: 'web-of-life-after',         // { v, z: { <zone>: {...} } } – challenges, photo missions, snapshots  game/rank.js
  robolab: 'web-of-life-robolab',   // { done: { <levelId>: { stars, blocks, t } }, seen, fun } – מעבדת הרובוטים (1.4.1) robolab/progress.js
};
export const zoneKey = (zone) => 'web-of-life-' + zone;                                    // { unlocked, done, discovered, placed, quiz }
export const saveKey = (zone, kids) => 'web-of-life-save-' + zone + (kids ? '-kids' : '');  // the whole forest (game/game/save.js)

const P = 'player', D = 'device';
// Every key: { key, scope, kind: 'json' | 'text', migrate? }. `migrate: false` – the first run of profiles (data from
// before players existed) leaves it where it is; every other unprefixed key is moved to the first player then.
export const KEYS = [
  { key: K.profiles, scope: D, kind: 'json', migrate: false },
  { key: K.quality, scope: D, kind: 'text', migrate: false },
  { key: K.autoq, scope: D, kind: 'json', migrate: false },
  { key: K.campad, scope: D, kind: 'text', migrate: false },
  { key: K.playtime, scope: D, kind: 'json', migrate: false },   // the parents' limit is for the whole computer (1.3.3)
  // read and written for the whole computer, but (as before 1.3.2) moved to the first player by the first-run migration
  { key: K.music, scope: D, kind: 'text' },
  { key: K.sound, scope: D, kind: 'text' },
  { key: K.sources, scope: D, kind: 'text' },
  { key: K.allopen, scope: D, kind: 'text' },
  { key: K.howto, scope: P, kind: 'json' },   // 1.3.2: each child sees the how-to cards (was one mark for the computer)
  { key: K.mode, scope: P, kind: 'text' },
  { key: K.coach, scope: P, kind: 'text' },
  { key: K.cards, scope: P, kind: 'json' },
  { key: K.badges, scope: P, kind: 'json' },
  { key: K.srccards, scope: P, kind: 'json' },
  { key: K.lab, scope: P, kind: 'json' },
  { key: K.research, scope: P, kind: 'json' },
  { key: K.journey, scope: P, kind: 'json' },
  { key: K.threads, scope: P, kind: 'json' },
  { key: K.photos, scope: P, kind: 'json' },
  { key: K.visitors, scope: P, kind: 'json' },
  { key: K.after, scope: P, kind: 'json' },
  { key: K.robolab, scope: P, kind: 'json' },   // 1.4.1
  ...ZONE_IDS.flatMap((z) => [
    { key: zoneKey(z), scope: P, kind: 'json' },
    { key: saveKey(z, false), scope: P, kind: 'json' },
    { key: saveKey(z, true), scope: P, kind: 'json' },
  ]),
];
// the keys core/profiles.js never moves to a player (its DEVICE_KEYS)
export const unmovedKeys = () => KEYS.filter((k) => k.scope === D && k.migrate === false).map((k) => k.key);

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
