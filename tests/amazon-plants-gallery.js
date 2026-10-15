// Gallery for src/models/amazon-plants.js
// Rows: z=0 growth 1 (bloom/fruit from URL), z=-ROW growth 0.3, z=-2*ROW growth 1 + health 0.3.
// URL params: ?night=1  ?bloom=0..1  ?fruit=0..1  ?wind=0..1  ?t=secs  ?only=id
// window.focusOn(id, row=0, dist=1)  window.overview()  window.stats()
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { PLANTS, _plantStats } from '../src/models/amazon-plants.js';
import { makeRng } from '../src/core/util.js';

const q = new URLSearchParams(location.search);
const night = q.get('night') === '1';
const bloom = Number(q.get('bloom') ?? 1), fruit = Number(q.get('fruit') ?? 1), wind = Number(q.get('wind') ?? 0.3);
const rig = makeRig({ night, size: 280, camPos: [0, 40, 120], target: [0, 12, -20], sunPos: [60, 90, 50], ground: '#4d5e33' });
rig.sun.shadow.camera.far = 400; rig.sun.shadow.mapSize.set(4096, 4096);
const sc = rig.sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.updateProjectionMatrix();

const ORDER = ['kapok', 'brazilnut', 'fig', 'cecropia', 'acai', 'liana', 'heliconia', 'fern', 'bromeliad', 'orchid', 'glowfungus', 'waterlily'];
const WIDTH = { kapok: 26, brazilnut: 18, fig: 22, cecropia: 13, acai: 9, liana: 7, heliconia: 5, fern: 4, bromeliad: 3, orchid: 3, glowfungus: 3.5, waterlily: 7 };
const ROW = 34;
const only = q.get('only');
const ids = only ? only.split(',') : ORDER;
const total = ids.reduce((s, id) => s + WIDTH[id], 0);
const items = []; // {id,row,vis,root}
const rows = [{ g: 1, h: 1 }, { g: 0.3, h: 1 }, { g: 1, h: 0.3 }];
const branchMat = new THREE.MeshStandardMaterial({ color: '#6e5a40', roughness: 0.95 });
const hostMat = new THREE.MeshStandardMaterial({ color: '#8a7b62', roughness: 0.95 });
const waterMat = new THREE.MeshStandardMaterial({ color: '#2f6f8f', roughness: 0.15, metalness: 0.1 });

const strip = q.get('strip');
if (strip) {
  const G = [0, 0.05, 0.1, 0.15, 0.3, 0.5, 0.75, 1];
  G.forEach((g, i) => {
    const vis = PLANTS[strip]({ seed: 1, rng: makeRng(1), hostHeight: 18, hostRadius: 0.6 });
    vis.setGrowth(g); vis.setBloom(bloom); vis.setFruit(fruit); vis.setNightGlow(night ? 1 : 0);
    vis.object.position.set((i - 3.5) * Number(q.get('sp') || 14), 0, 0); rig.scene.add(vis.object);
    if (strip === 'liana') { const host = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 18, 12).translate(0, 9, 0), hostMat); host.position.copy(vis.object.position); rig.scene.add(host); }
    items.push({ id: strip + i, row: 0, vis, root: vis.object });
    console.log('g', g, JSON.stringify(vis.crown()));
  });
}
if (!strip) rows.forEach((r, ri) => {
  let x = -total / 2;
  for (const id of ids) {
    const w = WIDTH[id]; const cx = x + w / 2; x += w;
    const seed = 11 + ri * 5 + ORDER.indexOf(id);
    const root = new THREE.Group(); root.position.set(cx, 0, -ri * ROW); rig.scene.add(root);
    const opts = { seed, rng: makeRng(seed) };
    let holder = root;
    if (id === 'liana') {
      opts.hostHeight = 18; opts.hostRadius = 0.6;
      const host = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 18, 12).translate(0, 9, 0), hostMat); host.castShadow = host.receiveShadow = true; root.add(host);
    }
    if (id === 'bromeliad' || id === 'orchid') {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8).rotateZ(Math.PI / 2), branchMat); br.position.y = 1.4; br.castShadow = br.receiveShadow = true; root.add(br);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 6).translate(0, 0.7, 0), branchMat); post.position.x = -1.1; root.add(post);
      holder = new THREE.Group(); holder.position.y = 1.52; root.add(holder);
    }
    if (id === 'waterlily') {
      const wd = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40).rotateX(-Math.PI / 2), waterMat); wd.position.y = 0.03; wd.receiveShadow = true; root.add(wd);
      holder = new THREE.Group(); holder.position.y = 0.05; root.add(holder);
    }
    const vis = PLANTS[id](opts);
    vis.setGrowth(r.g); vis.setHealth(r.h); vis.setBloom(bloom); vis.setFruit(fruit); vis.setNightGlow(night ? 1 : 0);
    holder.add(vis.object);
    items.push({ id, row: ri, vis, root });
  }
});

rig.onFrame((dt, t) => { for (const it of items) it.vis.update(dt, t, wind); });

const box = new THREE.Box3();
window.focusOn = (id, row = 0, dist = 1, elev = 0.25, az = 0) => {
  const it = items.find(i => i.id === id && i.row === row); if (!it) return 'no ' + id;
  const cr = it.vis.crown(); const wp = it.vis.object.getWorldPosition(new THREE.Vector3());
  const top = Math.max(cr.top, 0.3), rad = Math.max(cr.radius, 0.3);
  const c = wp.clone().add(new THREE.Vector3(0, top * 0.5, 0)); const s = new THREE.Vector3(rad * 2, top, rad * 2);
  const R = Math.max(s.x, s.y) * 0.75 * dist + 0.2;
  rig.camera.position.set(c.x + Math.sin(az) * R * 1.6, c.y + R * elev, c.z + Math.cos(az) * R * 1.6);
  rig.controls.target.copy(c); rig.controls.update();
  return JSON.stringify({ crown: it.vis.crown(), attach: it.vis.attachPoints().length, perch: it.vis.perchPoints().length, size: s.toArray().map(v => +v.toFixed(1)) });
};
window.setView = (p, t) => { rig.camera.position.set(...p); rig.controls.target.set(...t); rig.controls.update(); };
window.stats = () => JSON.stringify(_plantStats());
window.markPoints = (id, row = 0) => {
  const it = items.find(i => i.id === id && i.row === row);
  it.vis.object.updateMatrixWorld(true);
  const add = (p, col) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(p).applyMatrix4(it.vis.object.matrixWorld); rig.scene.add(m); };
  it.vis.attachPoints().forEach(a => add(a.pos, '#ff00ff'));
  it.vis.perchPoints().forEach(p => add(p, '#00ffff'));
  return 'ok';
};
rig.start();
console.log('gallery ready', items.length);
