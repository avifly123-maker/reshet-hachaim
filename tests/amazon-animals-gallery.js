// Gallery for src/models/amazon-animals.js
//   window.setAction('walk')  – every animal does that action (falls back to the closest it supports)
//   window.setAction('auto')  – each animal cycles through its own actions (default)
//   window.focus('jaguar')    – camera close-up;  window.focus('all') – overview
//   window.setNight(1)
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { ANIMALS } from '../src/models/amazon-animals.js';

const rig = makeRig({ ground: '#4f6236', camPos: [0, 9, 26], target: [0, 1, -3], size: 70 });
const { scene, camera, controls } = rig;

const ids = Object.keys(ANIMALS).filter((k) => k !== 'leafcutter');
const FLY = { orchidbee: 1, morpho: 1, hummingbird: 1, toucan: 1, macaw: 1, harpy: 1, fruitbat: 1 };
const perRow = 5, sp = 4.2;
const slots = [];
const branchMat = new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.9 });
const report = {};

ids.forEach((id, i) => {
  const r = Math.floor(i / perRow), c = i % perRow;
  const base = new THREE.Vector3((c - (perRow - 1) / 2) * sp, 0, -r * sp * 1.1);
  const vis = ANIMALS[id]({ seed: 1 });
  const holder = new THREE.Group(); holder.position.copy(base); scene.add(holder);
  holder.add(vis.object);
  // props: horizontal branch (along Z) for hang / perch, vertical trunk for climb
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), branchMat);
  branch.rotation.x = Math.PI / 2; branch.castShadow = true; holder.add(branch);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.2, 10), branchMat);
  trunk.position.set(0, 1.6, 0); trunk.castShadow = true; holder.add(trunk);
  let tri = 0, meshes = 0;
  vis.object.traverse((o) => { if (o.isMesh) { meshes++; tri += o.geometry.attributes.position.count / 3; } });
  report[id] = { tris: tri, meshes, height: vis.height, length: vis.length, actions: vis.actions };
  slots.push({ id, vis, holder, branch, trunk, k: i });
});

// leafcutter colony with a test trail to a "plant" (little green cone)
const colony = ANIMALS.leafcutter({ seed: 2 });
const nestPos = new THREE.Vector3(12, 0, 4.5);
colony.object.position.copy(nestPos); scene.add(colony.object);
const plant = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 7), new THREE.MeshStandardMaterial({ color: '#3d8a2a', roughness: 0.8 }));
const plantPos = new THREE.Vector3(5.5, 0.9, 7.5); plant.position.copy(plantPos); plant.castShadow = true; scene.add(plant);
const trail = [];
for (let i = 0; i <= 30; i++) {
  const k = i / 30;
  trail.push(new THREE.Vector3(THREE.MathUtils.lerp(nestPos.x + 0.55, plantPos.x + 0.5, k) + Math.sin(k * 9) * 0.6, 0.02, THREE.MathUtils.lerp(nestPos.z + 0.8, plantPos.z, k) + Math.sin(k * 5) * 0.8));
}
trail[0].y = 0.2;
colony.setTrail(trail);
let tri = 0; colony.object.traverse((o) => { if (o.isMesh) tri += o.geometry.attributes.position.count / 3 * (o.isInstancedMesh ? 1 : 1); });
report.leafcutter = { tris: tri, ants: 120 };

let mode = 'auto', night = 0, activity = 1;
window.setAction = (a) => { mode = a; return a; };
window.setNight = (n) => { night = n; return n; };
window.setActivity = (a) => { activity = a; return a; };
window.report = report;
console.log(JSON.stringify(report));

function resolve(vis, a) {
  if (vis.actions.includes(a)) return a;
  return a; // let the model fall back on its own
}

function place(s, a) {
  // uses vis.gripY (calibrated grip heights) exactly like the core should: object.y = branchY - gripY[pose]
  const v = s.vis, o = v.object, id = s.id;
  const isFly = !!FLY[id];
  s.branch.visible = false; s.trunk.visible = false;
  s.branch.rotation.set(Math.PI / 2, 0, 0);
  o.position.set(0, 0, 0); o.rotation.set(0, 0, 0);
  const bh = 1.6;
  const onBranch = (pose, across) => { s.branch.visible = true; s.branch.position.set(0, bh, 0); if (across) s.branch.rotation.set(0, 0, Math.PI / 2); o.position.y = bh + 0.05 - (v.gripY[pose] || 0); };
  if (id === 'fruitbat') { if (!(a === 'fly' || a === 'glide' || a === 'run' || a === 'hover')) { onBranch('hang'); o.position.y = bh - 0.05 - v.gripY.hang; } else o.position.y = 1.4; }
  else if (isFly) {
    if (id === 'hummingbird' && (a === 'eat' || a === 'hover')) o.position.y = 1.3;
    else if (['perch', 'idle', 'eat', 'sleep', 'walk', 'hang', 'climb'].includes(a)) onBranch('perch', true);
    else o.position.y = 1.4;
  } else if (id === 'sloth' && ['hang', 'sleep', 'eat', 'idle', 'perch'].includes(a)) { onBranch('hang'); o.position.y = bh - 0.05 - v.gripY.hang; }
  else if (id === 'howler' && a === 'hang') { onBranch('hang'); o.position.y = bh - 0.05 - v.gripY.hang; }
  else if (id === 'howler' && ['perch', 'idle', 'eat', 'sleep'].includes(a)) onBranch('perch', true);
  else if (a === 'climb' && (id === 'sloth' || id === 'howler' || id === 'dartfrog')) { s.trunk.visible = true; s.trunk.position.z = id === 'dartfrog' ? 0.32 : 0.22; o.position.y = 0.6; }
}

const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#3b7a8a', roughness: 0.15, transparent: true, opacity: 0.65 }));
water.rotation.x = -Math.PI / 2; water.position.y = 0.22; water.visible = false; scene.add(water);

rig.onFrame((dt, t) => {
  water.visible = mode === 'swim';
  for (const s of slots) {
    let a = mode;
    if (mode === 'auto') { const acts = s.vis.actions; a = acts[Math.floor((t / 4 + s.k * 0.37)) % acts.length]; }
    a = resolve(s.vis, a);
    place(s, a);
    const speed = a === 'run' ? (s.vis.speeds.run || 0) : a === 'walk' ? (s.vis.speeds.walk || 0) : a === 'fly' ? s.vis.speeds.fly : null;
    s.vis.update(dt, { action: a, speed, t, night });
    // slow turntable so we see sides
    s.holder.rotation.y = window.yaw != null ? window.yaw : 0.6 + Math.sin(t * 0.15 + s.k) * 0.4 + (window.spin ? t * 0.5 : 0);
  }
  colony.update(dt, { t, night, activity });
});

const views = { all: [[0, 9, 26], [0, 1, -3]] };
window.focus = (id) => {
  if (window.ty != null) { /* explicit target height */ }
  if (id === 'all') { camera.position.set(...views.all[0]); controls.target.set(...views.all[1]); controls.update(); return id; }
  if (id === 'leafcutter') { camera.position.set(9, 4.5, 12.5); controls.target.set(9, 0, 5.5); controls.update(); return id; }
  if (id === 'ants') { camera.position.set(8.2, 0.9, 7.6); controls.target.set(8.0, 0, 5.8); controls.update(); return id; }
  const s = slots.find((x) => x.id === id); if (!s) return 'no ' + id;
  const p = s.holder.position;
  const L = Math.max(s.vis.length, 0.35);
  const isFly = !!FLY[id];
  const isPerchH = mode === 'perch' && id === 'howler';
  const bb = new THREE.Box3().setFromObject(s.vis.object); const c = bb.getCenter(new THREE.Vector3());
  const ty = window.ty != null ? window.ty : c.y;
  const d = (L * 1.25 + 0.3) * (window.zoom || 1);
  const dir = new THREE.Vector3(...(window.camDir || [0.8, 0.35, 1.0])).normalize().multiplyScalar(d * 1.33);
  camera.position.set(p.x + dir.x, ty + dir.y, p.z + dir.z);
  controls.target.set(p.x, ty, p.z); controls.update();
  return id;
};
// freeze animation time for deterministic shots
window.freezeAt = null;
rig.start();
