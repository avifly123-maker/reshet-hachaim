// סדנת הרובוט (1.4.3 set 4): makes the practice islands (src/data/robolab/practice-islands.js): for every zone, small
// groups of its plants and animals around the island, tried until every template mission of the zone can be made on
// it at every step (the workshop opens a template mission there when the child's own island cannot give it).
// node tools/make-practice-islands.mjs   (writes the file; run again only when templates or slots change)
import fs from 'fs';
import { TEMPLATE_MISSIONS } from '../src/data/robolab/missions.js';

const GROUPS = {   // per zone: [kind, id, n, mature?]  kind: plant | animal
  amazon: [['plant', 'heliconia', 3], ['plant', 'fig', 1], ['animal', 'toucan', 1], ['plant', 'kapok', 3], ['animal', 'capybara', 3], ['plant', 'acai', 3, 0.3], ['plant', 'cecropia', 2]],
  grove: [['plant', 'sage', 3], ['plant', 'oak', 2], ['plant', 'mastic', 1], ['animal', 'blackbird', 1], ['animal', 'gazelle', 3], ['plant', 'carob', 3, 0.3], ['plant', 'pine', 2]],
  reef: [['plant', 'brain', 3], ['plant', 'table', 3], ['animal', 'parrotfish', 3], ['plant', 'branching', 2]],
  desert: [['plant', 'caper', 3], ['plant', 'acacia', 2], ['animal', 'dorcas', 3], ['plant', 'datepalm', 2], ['animal', 'fennec', 1], ['plant', 'saltbush', 3, 0.3]],
  savanna: [['plant', 'marula', 2], ['animal', 'baboon', 1], ['animal', 'zebra', 3], ['plant', 'umbrella', 3], ['plant', 'baobab', 2], ['plant', 'umbrella', 3, 0.3]],
};
const out = {};
for (const zone of Object.keys(GROUPS)) {
  const { BIOME } = await import('../src/data/' + zone + '.js');
  const species = BIOME.species, ids = new Set(species.map((s) => s.id));
  for (const g of GROUPS[zone]) if (!ids.has(g[1])) console.error(zone, 'no species', g[1]);
  const { makeMission, practiceView } = await import('../src/robolab/island-missions.js?' + zone);
  const { PRACTICE } = await import('../src/data/robolab/practice-islands.js');
  let found = null;
  for (let seed = 1; seed < 400 && !found; seed++) {
    let s = seed * 7919; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const plants = [], animals = [];
    GROUPS[zone].forEach((g, gi) => {
      const a = (gi / GROUPS[zone].length) * Math.PI * 2 + rnd() * 0.5, r = 12 + rnd() * 12, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      for (let i = 0; i < g[2]; i++) {
        const x = +(cx + (rnd() - 0.5) * 12).toFixed(1), z = +(cz + (rnd() - 0.5) * 9).toFixed(1);
        if (g[0] === 'plant') plants.push([g[1], x, z, g[3] || +(0.8 + rnd() * 0.2).toFixed(2)]); else animals.push([g[1], x, z]);
      }
    });
    PRACTICE[zone] = { plants, animals, water: [] };
    const view = practiceView(zone, species);
    const ok = TEMPLATE_MISSIONS.filter((M) => M.zone === zone).every((M) => [M.step, 3, 4, 5].filter((st) => st >= M.step).every((st) => makeMission(view, { zone, species, step: st, seed: 1, tpl: M.tpl, shape: M.shape, id: M.id })));
    if (ok) found = PRACTICE[zone];
  }
  if (!found) { console.error(zone, ': no practice island found'); process.exitCode = 1; continue; }
  out[zone] = found; console.log(zone, 'ok', found.plants.length, 'plants', found.animals.length, 'animals');
}
const body = Object.entries(out).map(([z, P]) => `  ${z}: {\n    plants: [${P.plants.map((p) => JSON.stringify(p).replace(/"/g, "'")).join(', ')}],\n    animals: [${P.animals.map((p) => JSON.stringify(p).replace(/"/g, "'")).join(', ')}],\n    water: [],\n  },`).join('\n');
fs.writeFileSync(new URL('../src/data/robolab/practice-islands.js', import.meta.url), `// סדנת הרובוט (1.4.3 set 4): the practice island of each zone, where a template mission opens when the child's own
// island cannot give it (src/robolab/island-missions.js practiceView). Made by tools/make-practice-islands.mjs: small
// groups of the zone's plants ([id, x, z, growth]) and animals ([id, x, z]), the same for every child.
export const PRACTICE = {
${body}
};
`);
