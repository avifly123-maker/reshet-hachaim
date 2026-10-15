// Node sanity test: node tests/grove-plants-api.js  — exercises every PlantVisual method, checks budgets & finite values.
import * as THREE from 'three';
import { PLANTS } from '../src/models/grove-plants.js';
const BUDGET = { oak: 4000, terebinth: 4000, carob: 4000, pine: 4000, mastic: 1500, buckthorn: 1500, sage: 1500, rockrose: 1500, cyclamen: 600, anemone: 600, mushroom: 600 };
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const expected = ['oak', 'terebinth', 'carob', 'pine', 'mastic', 'buckthorn', 'sage', 'rockrose', 'cyclamen', 'anemone', 'mushroom'];
ok(JSON.stringify(Object.keys(PLANTS).sort()) === JSON.stringify(expected.slice().sort()), 'species ids');
for (const id of expected) for (let seed = 0; seed < 6; seed++) {
  const v = PLANTS[id]({ seed });
  let tris = 0, meshes = 0;
  v.object.traverse(o => { if (o.isMesh) { meshes++; if (!o.name.endsWith('-seed')) tris += o.geometry.attributes.position.count / 3; ok(o.castShadow && o.receiveShadow, id + ' shadows'); } });
  ok(tris <= BUDGET[id], `${id} tris ${tris} > ${BUDGET[id]}`); ok(meshes <= 6, id + ' meshes');
  for (const s of ['winter', 'spring', 'summer', 'autumn']) for (const f of [0, 0.5, 0.99]) for (const g of [0, 0.3, 1]) for (const h of [0, 1]) {
    v.setSeason(s, f); v.setGrowth(g); v.setHealth(h); v.update(0.016, 3, 0.5);
    const c = v.crown();
    ok(Object.values(c).every(Number.isFinite) && c.top >= c.bottom && c.density >= 0 && c.density <= 1, `${id} crown ${JSON.stringify(c)}`);
    ok(Number.isFinite(v.trunkRadius), id + ' trunk');
    for (const p of v.perchPoints()) ok(p.isVector3 && Number.isFinite(p.y), id + ' perch');
    for (const a of v.attachPoints()) ok(a.pos.isVector3 && a.normal.isVector3, id + ' attach');
  }
  v.setBloom(1); v.setFruit(1); v.setBloom(null); v.setFruit(null); v.setNightGlow(1); v.fall(0.5); v.fall(0); v.dispose();
}
const t = PLANTS.terebinth({ seed: 1 });
t.setSeason('winter', 0.5); const dw = t.crown().density; t.setSeason('summer', 0.5); const ds = t.crown().density;
ok(dw <= 0.15 && ds >= 0.6, `terebinth density winter ${dw} summer ${ds}`);
console.log(fail ? `${fail} failures` : 'all grove plant API checks passed');
