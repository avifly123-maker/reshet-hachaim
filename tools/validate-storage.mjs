// The saves' keys (1.3.2): checks src/core/storage.js, the one list of every localStorage key the game uses.
// Usage: node tools/validate-storage.mjs   (exit code 1 on errors)
// - KEYS: unique, every key starts with 'web-of-life-', scope 'player' | 'device', kind 'json' | 'text'; every name in K is listed
// - core/profiles.js agrees: its STORE is K.profiles, and the keys its first-run migration leaves alone are exactly the
//   four it always left alone (changing them would move or strand old data)
// - no other module types a 'web-of-life…' key string in its code (comments may name keys)
import fs from 'node:fs';
import path from 'node:path';
import { KEYS, K, ZONE_IDS, zoneKey, saveKey } from '../src/core/storage.js';
import { STORE, deviceKeys } from '../src/core/profiles.js';
import { ZONES } from '../src/data/zones.js';

const errors = [];
const err = (m) => errors.push(m);

const seen = new Set();
for (const k of KEYS) {
  if (seen.has(k.key)) err(`KEYS: ${k.key} twice`);
  seen.add(k.key);
  if (!k.key.startsWith('web-of-life-') || k.key.includes('::')) err(`KEYS: ${k.key} is not a plain 'web-of-life-' key`);
  if (!['player', 'device'].includes(k.scope)) err(`KEYS: ${k.key} has scope ${k.scope}`);
  if (!['json', 'text'].includes(k.kind)) err(`KEYS: ${k.key} has kind ${k.kind}`);
  if (k.scope === 'player' && k.migrate === false) err(`KEYS: ${k.key} is per player but marked migrate: false`);
}
for (const [name, key] of Object.entries(K)) if (!seen.has(key)) err(`K.${name} (${key}) is not in KEYS`);
for (const z of ZONE_IDS) for (const key of [zoneKey(z), saveKey(z, false), saveKey(z, true)]) if (!seen.has(key)) err(`${key} is not in KEYS`);
const zoneIds = (Array.isArray(ZONES) ? ZONES : Object.values(ZONES)).map((z) => z.id);
for (const z of zoneIds) if (!ZONE_IDS.includes(z)) err(`zone ${z} (data/zones.js) is missing from ZONE_IDS: its saves have no keys`);

if (STORE !== K.profiles) err(`profiles.STORE (${STORE}) differs from K.profiles (${K.profiles})`);
const HISTORIC = ['web-of-life-profiles', 'web-of-life-quality', 'web-of-life-campad', 'web-of-life-autoq'];
// keys born after players existed (no save from before them can hold them), so skipping them changes nothing old
const NEWER = ['web-of-life-playtime'];   // 1.3.3: the parents' play time, for the whole computer
const dev = [...deviceKeys()].filter((k) => !NEWER.includes(k)).sort();
if (JSON.stringify(dev) !== JSON.stringify([...HISTORIC].sort())) err(`profiles' migration skips ${dev.join(', ')}; it always skipped ${HISTORIC.join(', ')}`);

// key strings typed outside core/storage.js
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ALLOWED = [
  /startsWith\('web-of-life'\)/,                 // core/edition.js: the torah edition's prefix shim
  /const PREFIX = 'web-of-life-';/,              // core/profiles.js: the migration's prefix
  /export const STORE = 'web-of-life-profiles';/, // core/profiles.js: its own store (checked against K above)
];
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out); else if (f.name.endsWith('.js')) out.push(p);
  }
  return out;
}
for (const file of walk(path.join(ROOT, 'src'))) {
  const rel = path.relative(ROOT, file);
  if (rel === path.join('src', 'core', 'storage.js') || rel.startsWith(path.join('src', 'data') + path.sep)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const at = line.search(/['"`]web-of-life/);
    if (at < 0) return;
    const t = line.trimStart();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;   // a comment
    const c = line.indexOf('//'); if (c >= 0 && c < at) return;                  // after a comment mark
    if (ALLOWED.some((re) => re.test(line))) return;
    err(`${rel}:${i + 1}: a storage key typed here; use core/storage.js (K, readPlayer, …)`);
  });
}

if (errors.length) { for (const e of errors) console.log('ERROR ' + e); console.log(`${errors.length} error(s)`); process.exit(1); }
console.log(`storage: ${KEYS.length} keys (${KEYS.filter((k) => k.scope === 'player').length} per player, ${KEYS.filter((k) => k.scope === 'device').length} per device), all OK`);
