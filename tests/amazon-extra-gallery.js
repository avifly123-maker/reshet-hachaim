// Gallery for src/models/amazon-animals-extra.js – one row per species, one column per action (all shown at once).
//   window.focus('kinkajou') – close-up of a row;  window.focus('all') – overview
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { ANIMALS_EXTRA } from '../src/models/amazon-animals-extra.js';

const rig = makeRig({ ground: '#4f6236', camPos: [0.6, 5.2, 9.6], target: [0.6, 0.55, -2.0], size: 40 });
const { scene, camera, controls } = rig;

const ROWS = {
  anteater: ['idle', 'walk', 'run', 'eat', 'sleep'],
  kinkajou: ['idle', 'walk', 'eat', 'sleep', 'perch', 'climb', 'hang'],
  coati: ['idle', 'walk', 'run', 'eat', 'sleep', 'climb'],
};
const sp = 1.75, bh = 1.25, br = 0.04;
const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.9 });
const slots = [], report = {};

Object.entries(ROWS).forEach(([id, acts], r) => {
  acts.forEach((a, c) => {
    const vis = ANIMALS_EXTRA[id]({ seed: 1 + c });
    const holder = new THREE.Group();
    holder.position.set((c - 3) * sp, 0, -r * 2.3);
    holder.rotation.y = 0.75;
    scene.add(holder); holder.add(vis.object);
    if (a === 'hang' || a === 'perch') {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(br, br, 1.5, 8), wood);
      b.rotation.x = Math.PI / 2; b.position.y = bh; b.castShadow = true; holder.add(b);
      vis.object.position.y = a === 'hang' ? bh + br - vis.gripY.hang : bh + br - vis.gripY.perch;
    } else if (a === 'climb') {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.6, 10), wood);
      tr.position.set(0, 1.3, 0.15); tr.castShadow = true; holder.add(tr);
      vis.object.position.y = 0.45;
    }
    let tri = 0, meshes = 0;
    vis.object.traverse((o) => { if (o.isMesh) { meshes++; tri += o.geometry.attributes.position.count / 3; } });
    report[id] = { tris: tri, meshes, height: vis.height, length: vis.length, actions: vis.actions, gripY: vis.gripY };
    slots.push({ vis, a });
  });
});
window.report = report;
console.log(JSON.stringify(report));

rig.onFrame((dt, t) => {
  for (const s of slots) {
    const speed = s.a === 'run' ? s.vis.speeds.run : s.a === 'walk' ? s.vis.speeds.walk : null;
    s.vis.update(dt, { action: s.a, speed, t, night: 0 });
  }
});

window.focus = (id) => {
  const r = Object.keys(ROWS).indexOf(id);
  if (id === 'all' || r < 0) { camera.position.set(0.6, 5.2, 9.6); controls.target.set(0.6, 0.55, -2.0); }
  else { camera.position.set(0.6, 2.2, -r * 2.3 + 4.2); controls.target.set(0.6, 0.6, -r * 2.3); }
  controls.update();
  return id;
};
rig.start();
