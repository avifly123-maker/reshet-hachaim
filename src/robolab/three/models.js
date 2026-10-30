// מעבדת הרובוטים in 3D – the three tools and the things on a training field, built from simple shapes until the
// Blender models come (docs/PLAN-1.4.md 7.0: the tools will be designed in Blender, in parts, and the player will paint
// and decorate them). Every model takes a paint { body, trim } so a chosen colour can be applied later (paint()).
// No cross or plus shapes: the drone has three rotors in a ring and three-blade propellers, nets are loops.
import * as THREE from 'three';
import { buildTool, hasBlenderTools } from './parts3d.js';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05, ...o });
const glow = (c, i = 1.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; }
function rbox(w, h, d, r) {   // a box with rounded edges (extruded rounded rectangle)
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.9, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - r * 2) / 2); return g;
}
// a three-blade propeller (never four: four blades read as a cross from above)
function prop3(r, mat) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.BoxGeometry(r, 0.03, r * 0.22), mat); b.position.x = r / 2; const arm = new THREE.Group(); arm.rotation.y = i * Math.PI * 2 / 3; arm.add(b); g.add(arm); }
  g.add(mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.08, 12), mat));
  return g;
}
const DEF = { robot: { body: '#e8873a', trim: '#2fa39a' }, drone: { body: '#3b82c4', trim: '#f2c94c' }, sub: { body: '#f2c14e', trim: '#2fa39a' } };

// the ground robot: a friendly rover on two tracks, a round head with two eye lights, a small bin at the back.
// Faces +z (the course turns it). About 1.4 m long.
export function makeRobot(paint = {}) {
  const P = { ...DEF.robot, ...paint }, g = new THREE.Group();
  const body = M(P.body), trim = M(P.trim), dark = M('#2b3036', { roughness: 0.8 }), cream = M('#f5f1e8');
  for (const sx of [-0.52, 0.52]) {   // tracks
    const tr = mesh(rbox(0.26, 0.36, 1.25, 0.12), dark, sx, 0.2, 0); g.add(tr);
    for (const z of [-0.42, 0, 0.42]) { const w = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.28, 14), trim, sx, 0.2, z); w.rotation.z = Math.PI / 2; g.add(w); }
  }
  const chassis = mesh(rbox(0.86, 0.42, 1.1, 0.12), body, 0, 0.5, 0); g.add(chassis);
  const bin = mesh(rbox(0.6, 0.26, 0.38, 0.06), cream, 0, 0.8, -0.32); g.add(bin);
  const neck = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 10), trim, 0, 0.85, 0.22); g.add(neck);
  const head = new THREE.Group(); head.position.set(0, 1.08, 0.26); g.add(head);
  head.add(mesh(rbox(0.62, 0.38, 0.4, 0.12), cream));
  const face = mesh(rbox(0.5, 0.26, 0.04, 0.02), M('#22313a', { roughness: 0.3 }), 0, 0, 0.2); head.add(face);
  const eyes = [];
  for (const ex of [-0.12, 0.12]) { const e = mesh(new THREE.SphereGeometry(0.055, 12, 8), glow('#7fe3ff', 1.4), ex, 0.01, 0.23); head.add(e); eyes.push(e); }
  const ant = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), dark, 0.2, 0.28, -0.05); head.add(ant);
  const tip = mesh(new THREE.SphereGeometry(0.045, 10, 8), glow('#ffd25a', 1.2), 0.2, 0.4, -0.05); head.add(tip);
  const arm = mesh(rbox(0.12, 0.12, 0.42, 0.04), trim, 0.38, 0.62, 0.52); g.add(arm);
  g.userData = { kind: 'robot', head, eyes, tip, paintParts: { body: [chassis], trim: [neck, arm] } };
  g.scale.setScalar(1.25);
  return g;
}

// the drone: a round body with three arms and three-blade rotors in a ring, a camera eye below.
export function makeDrone(paint = {}) {
  const P = { ...DEF.drone, ...paint }, g = new THREE.Group();
  const body = M(P.body), trim = M(P.trim), grey = M('#d6dde3'), dark = M('#2b3036');
  const shell = mesh(new THREE.SphereGeometry(0.42, 22, 14), body, 0, 0, 0); shell.scale.y = 0.62; g.add(shell);
  const band = mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 28), trim); band.rotation.x = Math.PI / 2; g.add(band);
  const eye = mesh(new THREE.SphereGeometry(0.12, 14, 10), M('#1d2a33', { roughness: 0.2 }), 0, -0.18, 0.26); g.add(eye);
  const lens = mesh(new THREE.SphereGeometry(0.06, 10, 8), glow('#7fe3ff', 1.5), 0, -0.19, 0.35); g.add(lens);
  const rotors = [];
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;   // one arm points forward (+z), two behind: a triangle from above
    const x = Math.sin(a) * 0.78, z = Math.cos(a) * 0.78;
    const arm = mesh(new THREE.BoxGeometry(0.08, 0.06, 0.6), grey, Math.sin(a) * 0.5, 0.04, Math.cos(a) * 0.5); arm.rotation.y = a; g.add(arm);
    const pod = mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 12), dark, x, 0.08, z); g.add(pod);
    const ring = mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 26), trim, x, 0.14, z); ring.rotation.x = Math.PI / 2; g.add(ring);
    const r = prop3(0.3, grey); r.position.set(x, 0.17, z); g.add(r); rotors.push(r);
  }
  const led = mesh(new THREE.SphereGeometry(0.05, 10, 8), glow('#8fe36a', 1.5), 0, 0.27, 0); g.add(led);
  g.userData = { kind: 'drone', rotors, led, paintParts: { body: [shell], trim: [band] } };
  g.scale.setScalar(1.25);
  return g;
}

// the diving robot: a rounded capsule with a big window, side fins and a three-blade propeller behind.
export function makeSub(paint = {}) {
  const P = { ...DEF.sub, ...paint }, g = new THREE.Group();
  const body = M(P.body), trim = M(P.trim), glass = M('#9ad8ea', { roughness: 0.1, transparent: true, opacity: 0.75 }), dark = M('#2b3036');
  const hull = mesh(new THREE.CapsuleGeometry(0.42, 0.8, 8, 18), body); hull.rotation.x = Math.PI / 2; g.add(hull);
  const win = mesh(new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass, 0, 0.12, 0.42); win.rotation.x = Math.PI / 2.4; g.add(win);
  for (const ex of [-0.09, 0.09]) g.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), glow('#7fe3ff', 1.3), ex, 0.14, 0.62));
  const fin = mesh(rbox(0.06, 0.34, 0.36, 0.03), trim, 0, 0.46, -0.3); g.add(fin);
  for (const sx of [-0.5, 0.5]) { const f = mesh(rbox(0.34, 0.05, 0.26, 0.02), trim, sx, -0.05, -0.1); g.add(f); }
  const cone = mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.2, 14), dark, 0, 0, -0.9); cone.rotation.x = Math.PI / 2; g.add(cone);
  const pr = prop3(0.3, M('#d6dde3')); pr.rotation.x = Math.PI / 2; pr.position.set(0, 0, -1.02); g.add(pr);
  const lamp = mesh(new THREE.SphereGeometry(0.06, 10, 8), glow('#fff2b0', 1.6), 0.24, -0.2, 0.55); g.add(lamp);
  g.userData = { kind: 'sub', prop: pr, paintParts: { body: [hull], trim: [fin] } };
  g.scale.setScalar(1.2);
  return g;
}
// the Blender tools (parts3d.js) when their data is in the build, these simple ones otherwise
export function makeTool(k, paint, look) {
  if (hasBlenderTools()) {
    const g = buildTool({ base: k, parts: look, paint });
    if (g) { g.scale.setScalar(k === 'drone' ? 1.1 : 1.25); return g; }
  }
  return k === 'drone' ? makeDrone(paint) : k === 'sub' ? makeSub(paint) : makeRobot(paint);
}
export function paint(g, colours) {
  const P = g.userData.paintParts || {};
  for (const [slot, list] of Object.entries(P)) if (colours[slot]) for (const m of list) m.material.color.set(colours[slot]);
}

// ── things on the field
export function makeHome() {   // the base: a round charging pad with a small roof sign (no cross)
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.12, 32), M('#f5f1e8'), 0, 0.06, 0));
  const ring = mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 36), glow('#e8873a', 0.6), 0, 0.14, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
  const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), M('#5a6670'), 1.15, 0.6, -0.9); g.add(post);
  const sign = new THREE.Group(); sign.position.set(1.15, 1.3, -0.9); g.add(sign);
  const roof = mesh(new THREE.ConeGeometry(0.32, 0.26, 4), M('#e8873a'), 0, 0.12, 0); roof.rotation.y = Math.PI / 4; sign.add(roof);
  sign.add(mesh(new THREE.BoxGeometry(0.36, 0.26, 0.36), M('#f5f1e8'), 0, -0.12, 0));
  return g;
}
export function makeSpot(color = '#7a5434') {   // a dug spot for a seed or a young coral: soil and a dotted ring
  const g = new THREE.Group();
  const soil = mesh(new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(color, { roughness: 1 }), 0, -0.05, 0); soil.scale.y = 0.35; g.add(soil);
  const dot = M('#ffffff', { transparent: true, opacity: 0.85 });
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), dot, Math.cos(a) * 0.95, 0.08, Math.sin(a) * 0.95)); }
  return g;
}
export function makeFruit() {   // a basket stand with ripe fruit on it
  const g = new THREE.Group(), f = M('#f08a24', { roughness: 0.4 });
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.3, 14), M('#b88a52', { roughness: 0.9 }), 0, 0.15, 0));
  const fruit = new THREE.Group(); g.add(fruit);
  for (const [x, y, z] of [[-0.18, 0.4, 0], [0.18, 0.4, 0.05], [0, 0.4, -0.18], [0, 0.6, 0]]) fruit.add(mesh(new THREE.SphereGeometry(0.17, 12, 10), f, x, y, z));
  g.userData.fruit = fruit;
  return g;
}
export function makeNet() {   // an old fishing net: loose grey loops on the sand
  const g = new THREE.Group(), m = M('#cfd6da', { roughness: 0.9 });
  for (const [x, z, r] of [[-0.3, -0.2, 0.32], [0.3, -0.15, 0.3], [0, 0.25, 0.35], [-0.35, 0.35, 0.25], [0.38, 0.32, 0.26]]) { const t = mesh(new THREE.TorusGeometry(r, 0.035, 6, 20), m, x, 0.1, z); t.rotation.x = Math.PI / 2 + (x * 0.6); g.add(t); }
  return g;
}
export function makeTrash() {   // a plastic bottle and a can
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 12), M('#8fc0d8', { transparent: true, opacity: 0.8, roughness: 0.2 }), 0, 0.14, 0); b.rotation.z = Math.PI / 2; g.add(b);
  const c = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 12), M('#c0392b', { metalness: 0.5 }), 0.3, 0.13, 0.3); g.add(c);
  return g;
}
export function makeRock(rng = Math.random) {
  const g = new THREE.Group(), m = M('#9a9488', { roughness: 0.95, flatShading: true });
  for (let i = 0; i < 3; i++) { const r = mesh(new THREE.DodecahedronGeometry(0.6 + rng() * 0.4, 0), m, (rng() - 0.5) * 0.8, 0.25, (rng() - 0.5) * 0.8); r.scale.y = 0.6 + rng() * 0.3; r.rotation.y = rng() * 6; g.add(r); }
  return g;
}
export function makeEdge(water) {   // the field's border: a low stone curb (on land) or reef rock (in the sea)
  const g = new THREE.Group(), m = M(water ? '#7d8a86' : '#b5a88e', { roughness: 0.95, flatShading: true });
  g.add(mesh(new THREE.BoxGeometry(1, 0.35, 1), m, 0, 0.17, 0));
  return g;
}
export function makeFireBase() {   // dry brush that is burning (the flames are particles, see course.js)
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.08, 16), M('#3a2c22', { roughness: 1 }), 0, 0.04, 0));
  const tw = M('#6b4a2a', { roughness: 1 });
  for (let i = 0; i < 5; i++) { const t = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6), tw, Math.cos(i * 1.3) * 0.25, 0.25, Math.sin(i * 1.3) * 0.25); t.rotation.z = 1.1 + i * 0.3; t.rotation.y = i * 1.3; g.add(t); }
  return g;
}
