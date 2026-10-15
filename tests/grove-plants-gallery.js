// Gallery for grove plants. Build: node build.mjs tests/grove-plants-gallery.js scratch/grove-plants.html --dev
// window.setSeason('winter'|'spring'|'summer'|'autumn', frac) · window.setView('all'|'trees'|'shrubs'|'herbs'|<id>|'growth')
// window.stats() → triangle counts / mesh counts per species.  URL ?season=spring&view=trees
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { PLANTS } from '../src/models/grove-plants.js';

const rig = makeRig({ ground: '#6b6a3e', camPos: [0, 30, 70], target: [0, 3, 0], size: 150, sunPos: [30, 40, 22] });
rig.renderer.shadowMap.autoUpdate = true;
const ids = ['pine', 'oak', 'terebinth', 'carob', 'mastic', 'buckthorn', 'sage', 'rockrose', 'cyclamen', 'anemone', 'mushroom'];
const width = { pine: 10, oak: 11, terebinth: 12, carob: 11, mastic: 5, buckthorn: 4.5, sage: 3, rockrose: 3, cyclamen: 2, anemone: 2, mushroom: 2 };
const xs = {}; let x = 0; for (const id of ids) { xs[id] = x + width[id] / 2; x += width[id]; }
const total = x; for (const id of ids) xs[id] -= total / 2;

const rows = [
  { name: 'mature', z: 0, g: 1, h: 1 },
  { name: 'growth', z: 16, g: 0.3, h: 1 },
  { name: 'health', z: -18, g: 1, h: 0.3 },
];
const all = [];
for (const row of rows) for (const id of ids) {
  const v = PLANTS[id]({ seed: 7 + all.length });
  v.object.position.set(xs[id], 0, row.z);
  v.setGrowth(row.g); v.setHealth(row.h);
  rig.scene.add(v.object);
  all.push({ id, row: row.name, v });
}
// extra: seedlings + growth sequence (for the 'growth' view)
const seq = [];
for (const id of ['oak', 'terebinth', 'carob', 'pine']) [0, 0.15, 0.3, 0.5, 0.75, 1].forEach((g, i) => {
  const v = PLANTS[id]({ seed: 100 + i }); v.setGrowth(g);
  v.object.position.set(-24 + i * 9, 0, 27 + ['oak', 'terebinth', 'carob', 'pine'].indexOf(id) * 6);
  rig.scene.add(v.object); seq.push({ id, v });
});
// variants row (seed%3) for close-ups
const WOODY_IDS = new Set(['pine', 'oak', 'terebinth', 'carob']);
const variants = [];
for (const id of ids) for (let s = 0; s < 3; s++) {
  const v = PLANTS[id]({ seed: s });
  v.object.position.set(xs[id] + (s - 1) * width[id] * 0.33 * (id === 'pine' || id === 'oak' || id === 'carob' || id === 'terebinth' ? 0 : 1), 0, -36 - (WOODY_IDS.has(id) ? s * 11 : 0));
  rig.scene.add(v.object); variants.push({ id, v });
}

const everything = [...all, ...seq, ...variants];
let season = 'spring', frac = 0.4;
window.setSeason = (s, f = 0.4) => { season = s; frac = f; for (const e of everything) e.v.setSeason(s, f); return s + ' ' + f; };
const views = {
  all: [[0, 26, 62], [0, 3, 0]],
  hero: [[-14, 9, 30], [-6, 4.5, 0]],
  trees: [[-total / 2 + 23, 13, 34], [-total / 2 + 23, 6, 0]],
  shrubs: [[xs.mastic + 3, 3.2, 11], [xs.mastic + 3, 1.3, 0]],
  herbs: [[xs.cyclamen + 0.5, 1.1, 4.2], [xs.cyclamen + 0.5, 0.2, 0]],
  growth: [[0, 7, 62], [0, 2.5, 33]],
  seedlings: [[-19.5, 2.2, 18.5], [-19.5, 0.2, 30]],
  health: [[0, 26, 30], [0, 2, -18]],
  sickTrees: [[-total / 2 + 23, 12, 16], [-total / 2 + 23, 5, -18]],
  growthRow: [[-total / 2 + 30, 9, 40], [-total / 2 + 30, 1.5, 16]],
  variants: [[-5, 22, -22], [-5, 4, -48]],
};
for (const id of ids) {
  const w = width[id]; const h = { pine: 16, oak: 10, terebinth: 9, carob: 9, mastic: 3, buckthorn: 3, sage: 1, rockrose: 1.2, cyclamen: 0.5, anemone: 0.6, mushroom: 0.45 }[id];
  const d = h < 1.5 ? h * 2.2 + 0.4 : h * 1.7 + 1.2;
  views[id] = [[xs[id] + w * 0.12, h * 0.8 + (h < 1.5 ? 0.3 : 0), d], [xs[id], h * 0.42, 0]];
}
window.setView = (n) => { const v = views[n]; if (!v) return 'no view ' + n; rig.camera.position.set(...v[0]); rig.controls.target.set(...v[1]); rig.controls.update(); return n; };
window.stats = () => {
  const out = {};
  for (const e of all.filter(e => e.row === 'mature')) {
    let tris = 0, meshes = 0;
    e.v.object.traverse(o => { if (o.isMesh) { meshes++; tris += o.geometry.attributes.position.count / 3; } });
    const c = e.v.crown();
    out[e.id] = { tris, meshes, crown: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, +v.toFixed(2)])), perches: e.v.perchPoints().length, trunk: +e.v.trunkRadius.toFixed(2) };
  }
  return JSON.stringify(out);
};
window.densities = () => {
  const o = {};
  for (const s of ['winter', 'spring', 'summer', 'autumn']) { window.setSeason(s, 0.5); o[s] = all.filter(e => e.row === 'mature').map(e => e.id + ':' + e.v.crown().density.toFixed(2)).join(' '); }
  window.setSeason(season, frac); return JSON.stringify(o);
};
const q = new URLSearchParams(location.search);
window.setSeason(q.get('season') || 'spring', 0.4);
window.setView(q.get('view') || 'all');
let wind = 0.3;
rig.onFrame((dt, t) => { for (const e of everything) e.v.update(dt, t, wind); });
window.setWind = (w) => { wind = w; };
rig.start();
