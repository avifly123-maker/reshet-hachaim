// סדנת הרובוט (1.4.3 set 4): missions made from the child's own island (src/robolab/island-missions.js), checked on
// the saved islands of every released version and on made-up islands of every zone. Each mission offered must be done
// by at least two robots (the planner's program, run in the engine), keep its texts in full and vocalised form, and lie
// on the island; a template that cannot be made must give no mission rather than a broken one.
import fs from 'fs';
import { islandMissions, viewFromSave } from '../../src/robolab/island-missions.js';
import { planLevel } from '../../src/robolab/engine/plan.js';
import { levelOf } from '../../src/robolab/engine/level.js';
import { ZONE_IDS } from '../../src/data/zones.js';

const errs = [], NIKUD = /[ְ-ׇּׁׂ]/;
let made = 0, tried = 0;
const check = (M, where) => {
  for (const k of ['title', 'need', 'end']) if (!M[k] || !M[k].f || !NIKUD.test(M[k].k || '')) errs.push(where + ': ' + k + ' needs f and a vocalised k');
  for (const s of M.say || []) if (!s.f || !NIKUD.test(s.k || '')) errs.push(where + ': say needs f and k');
  if ((M.ways || []).length < 2) errs.push(where + ': fewer than two robots');
  for (const w of M.ways || []) if (!planLevel(levelOf(M), w.robot)) errs.push(where + ': a listed robot cannot do it');
  const rows = M.map.rows; for (const it of M.items) if (!rows[it.y] || rows[it.y][it.x] === '#') errs.push(where + ': an item off the field');
};
const species = {};
for (const z of ZONE_IDS) species[z] = (await import('../../src/data/' + z + '.js')).BIOME.species;
// the saved islands of the released versions
for (const f of fs.readdirSync(new URL('../fixtures/', import.meta.url))) {
  const d = JSON.parse(fs.readFileSync(new URL('../fixtures/' + f, import.meta.url)));
  for (const [k, v] of Object.entries(d.keys)) {
    const m = k.match(/save-(\w+)::/); if (!m || !species[m[1]]) continue;
    const save = JSON.parse(v);
    for (const step of [1, 3, 5]) for (const seed of [1, 7, 42]) {
      tried++; const ms = islandMissions(viewFromSave(save, species[m[1]]), { zone: m[1], species: species[m[1]], step, seed });
      if (step < 3 && ms.length) errs.push(f + ' ' + m[1] + ': a mission before its step');
      ms.forEach((M) => { made++; check(M, `${f} ${m[1]} ${M.id}`); });
    }
  }
}
// made-up islands: the zone's plants scattered at random (some in pairs), every zone
let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
for (const z of ZONE_IDS) for (let n = 0; n < 12; n++) {
  const plants = species[z].filter((q) => !['animal', 'insect', 'bird', 'fish'].includes(q.kind) && q.kind !== undefined);
  const view = { plants: [], animals: [], isWater: (x, zz) => Math.hypot(x - 10, zz + 6) < 3 && n % 2 === 0, isPlaceable: () => true, radius: 38, sea: z === 'reef' };
  for (let i = 0; i < 18; i++) { const sp = plants[Math.floor(rnd() * plants.length)]; if (!sp) break; const a = rnd() * 6.28, r = 4 + rnd() * 28; view.plants.push({ id: sp.id, x: Math.cos(a) * r, z: Math.sin(a) * r, g: 0.4 + rnd() * 0.6, tree: sp.kind === 'tree' }); }
  tried++; islandMissions(view, { zone: z, species: species[z], step: 5, seed: n }).forEach((M) => { made++; check(M, `made-up ${z} ${n} ${M.id}`); });
}
if (!made) errs.push('no island gave a mission');
if (errs.length) { console.error('island missions: ' + errs.length + ' problem(s)\n  ' + [...new Set(errs)].slice(0, 30).join('\n  ')); process.exit(1); }
console.log(`island missions: ${made} made from ${tried} islands, every one by at least two robots`);
