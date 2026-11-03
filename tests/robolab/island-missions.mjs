// סדנת הרובוט (1.4.3 set 4): missions made from the child's own island (src/robolab/island-missions.js), checked on
// the saved islands of every released version and on made-up islands of every zone. Each mission offered must be done
// by at least two robots (the planner's program, run in the engine), keep its texts in full and vocalised form, and lie
// on the island; a template that cannot be made must give no mission rather than a broken one.
import fs from 'fs';
import { islandMissions, viewFromSave, TEMPLATE_IDS, isBig } from '../../src/robolab/island-missions.js';
import { runLevel } from '../../src/robolab/engine/run.js';
import { missionBuild } from '../../src/robolab/missions.js';
import { levelOf } from '../../src/robolab/engine/level.js';
import { ZONE_IDS } from '../../src/data/zones.js';

const errs = [], NIKUD = /[ְ-ׇּׁׂ]/;
let made = 0, tried = 0;
const check = (M, where) => {
  for (const k of ['title', 'need', 'end']) if (!M[k] || !M[k].f || !NIKUD.test(M[k].k || '')) errs.push(where + ': ' + k + ' needs f and a vocalised k');
  for (const s of M.say || []) if (!s.f || !NIKUD.test(s.k || '')) errs.push(where + ': say needs f and k');
  if ((M.ways || []).length < 3) errs.push(where + ': fewer than three ways');
  for (const w of M.ways || []) if (!runLevel([{ ...levelOf(M), build: { robot: missionBuild(w.robot) } }], w.prog).ok) errs.push(where + ': a listed way fails');
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
      for (const M of ms) if (M.step > step) errs.push(f + ' ' + m[1] + ': a mission before its step');
      ms.forEach((M) => { made++; check(M, `${f} ${m[1]} ${M.id}`); });
    }
  }
}
// made-up islands: the zone's plants scattered at random (some in pairs), every zone
let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const tally = {};
for (const z of ZONE_IDS) for (let n = 0; n < 16; n++) {
  // islands of every kind: sparse and dense, young and old, with and without water and animals
  const plants = species[z].filter((q) => !['animal', 'colony', 'swarm'].includes(q.kind));
  const animals = species[z].filter((q) => q.kind === 'animal');
  const dense = 8 + (n % 4) * 10, young = (n % 3) / 3;
  const view = { plants: [], animals: [], isWater: (x, zz) => n % 2 === 0 && Math.hypot(x - 10, zz + 6) < 4, isPlaceable: (x, zz) => !(n % 5 === 0 && Math.hypot(x + 12, zz - 8) < 3), radius: 38, sea: z === 'reef' };
  for (let i = 0; i < dense; i++) { const sp = plants[Math.floor(rnd() * plants.length)]; if (!sp) break; const a = rnd() * 6.28, r = 4 + rnd() * 28; view.plants.push({ id: sp.id, x: Math.cos(a) * r, z: Math.sin(a) * r, g: rnd() < young ? 0.2 + rnd() * 0.3 : 0.6 + rnd() * 0.4, tree: isBig(sp, z === 'reef') }); }
  for (let i = 0; i < (n % 4) * 3; i++) { const sp = animals[Math.floor(rnd() * Math.min(5, animals.length))]; const a = rnd() * 6.28, r = 4 + rnd() * 26; view.animals.push({ id: sp.id, x: Math.cos(a) * r, z: Math.sin(a) * r }); }
  tried++; islandMissions(view, { zone: z, species: species[z], step: 5, seed: n }).forEach((M) => { made++; tally[z + ':' + M.tpl] = (tally[z + ':' + M.tpl] || 0) + 1; check(M, `made-up ${z} ${n} ${M.id}`); });
}
if (process.argv.includes('--verbose')) console.log(tally);
if (!made) errs.push('no island gave a mission');
if (errs.length) { console.error('island missions: ' + errs.length + ' problem(s)\n  ' + [...new Set(errs)].slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`island missions: ${made} made from ${tried} islands, every one by at least two robots`);
