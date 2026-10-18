// Props modelled in Blender (see tools/build-props.py): ground details and the tool models.
// propGeometry(name) → a NEW BufferGeometry each call (its own GPU buffers, so disposing one never breaks another);
// the decoded arrays are cached and shared between the copies.
import * as THREE from 'three';
import { GROUND_PROPS, TOOL_PROPS } from '../data/props.js';

const decoded = new Map();
const srgb = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; srgb[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

function bytes(s) {
  const bin = atob(s); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function decode(key, d) {
  let r = decoded.get(key);
  if (r) return r;
  const q = new Int16Array(bytes(d.p).buffer), qn = new Int8Array(bytes(d.n).buffer), qc = bytes(d.c), qi = new Uint16Array(bytes(d.i).buffer);
  const n = q.length / 3;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) for (let k = 0; k < 3; k++) {
    pos[v * 3 + k] = (q[v * 3 + k] + 32767) * d.s[k] + d.o[k];
    nor[v * 3 + k] = qn[v * 3 + k] / 127;
    col[v * 3 + k] = srgb[qc[v * 3 + k]];   // the game works in linear colour
  }
  r = { pos, nor, col, idx: qi };
  decoded.set(key, r);
  return r;
}
function build(r, center = false) {
  const g = new THREE.BufferGeometry();
  let pos = r.pos;
  let c = null;
  if (center) {   // move the part to its own pivot (spinning rotors)
    const b = new THREE.Box3().setFromArray(r.pos); c = b.getCenter(new THREE.Vector3());
    pos = r.pos.slice(); for (let i = 0; i < pos.length; i += 3) { pos[i] -= c.x; pos[i + 1] -= c.y; pos[i + 2] -= c.z; }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(r.nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(r.col, 3));
  g.setIndex(new THREE.BufferAttribute(r.idx, 1));
  g.computeBoundingSphere();
  return { g, c };
}

export const groundPropNames = () => Object.keys(GROUND_PROPS);
export function propGeometry(name) {
  const d = GROUND_PROPS[name];
  if (!d) return null;
  return build(decode('g:' + name, d)).g;
}

// a red "!" (a rounded bar and a dot) on each plate where the model had a first-aid cross
function bangMark(r) {
  // the part may hold several crosses (one per side): split it into connected pieces
  const n = r.pos.length / 3, par = new Int32Array(n).map((_, i) => i);
  const find = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
  for (let k = 0; k < r.idx.length; k += 3) { const a = find(r.idx[k]); par[find(r.idx[k + 1])] = a; par[find(r.idx[k + 2])] = a; }
  // vertices at the same spot (split normals) belong together as well
  const key = new Map();
  for (let v = 0; v < n; v++) { const q = `${Math.round(r.pos[v * 3] * 500)},${Math.round(r.pos[v * 3 + 1] * 500)},${Math.round(r.pos[v * 3 + 2] * 500)}`; if (key.has(q)) par[find(v)] = find(key.get(q)); else key.set(q, v); }
  const boxes = new Map();
  for (let v = 0; v < n; v++) { const root = find(v); if (!boxes.has(root)) boxes.set(root, new THREE.Box3()); boxes.get(root).expandByPoint(new THREE.Vector3(r.pos[v * 3], r.pos[v * 3 + 1], r.pos[v * 3 + 2])); }
  const all = new THREE.Group(); all.name = 'bang';
  const mat = new THREE.MeshStandardMaterial({ color: '#e5483b', roughness: 0.4, emissive: '#a01a10', emissiveIntensity: 0.35 });
  // the two bars of one cross share a centre: one mark each
  const merged = [];
  for (const bx of boxes.values()) { const cc = bx.getCenter(new THREE.Vector3()); const m = merged.find((o) => o.getCenter(new THREE.Vector3()).distanceTo(cc) < 0.05); if (m) m.union(bx); else merged.push(bx.clone()); }
  for (const box of merged) {
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const ax = s.x <= s.y && s.x <= s.z ? 'x' : s.y <= s.z ? 'y' : 'z';   // the thin axis is the plate's normal
    const h = Math.max(...['x', 'y', 'z'].filter((k) => k !== ax).map((k) => s[k]));
    if (h < 0.02) continue;
    const t = Math.max(s[ax], h * 0.08);
    const grp = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.1, h * 0.46, 4, 10), mat); bar.position.y = h * 0.14; bar.scale.z = t / (h * 0.2);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(h * 0.11, 12, 8), mat); dot.position.y = -h * 0.36; dot.scale.z = t / (h * 0.22);
    grp.add(bar, dot);
    if (ax === 'y') grp.rotation.x = -Math.PI / 2;   // lying on top: the dot toward the front
    else if (ax === 'x') grp.rotation.y = Math.PI / 2;
    grp.position.copy(c);
    grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    all.add(grp);
  }
  return all;
}

// glowing parts keep their colour at night (emissive), the rest is lit normally
const GLOW = { eye: '#2a8fd0', led: '#3fbf27', beacon: '#ff2010' };
// tool model as a Group of parts; userData: rotors[], eye, led, beacon (whatever the model has)
export function toolProp(id, { tint = null } = {}) {
  const parts = TOOL_PROPS[id];
  if (!parts) return null;
  const g = new THREE.Group();
  g.userData.rotors = [];
  for (const [name, d] of Object.entries(parts)) {
    if (name === 'cross') { g.add(bangMark(decode('t:' + id + ':' + name, d))); continue; }   // no cross shapes in the game (Avi's rule): a red "!" takes its place
    const isRotor = name.startsWith('rotor');
    const { g: geo, c } = build(decode('t:' + id + ':' + name, d), isRotor);
    const glow = GLOW[name];
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: glow ? 0.35 : 0.55, metalness: 0.05 });
    if (glow) { mat.emissive = new THREE.Color(glow); mat.emissiveIntensity = 0.9; }
    if (tint && name === 'body') mat.color = new THREE.Color(tint);
    const m = new THREE.Mesh(geo, mat);
    m.name = name; m.castShadow = true;
    if (c) m.position.copy(c);
    g.add(m);
    if (isRotor) g.userData.rotors.push(m);
    else if (glow) g.userData[name] = m;
  }
  return g;
}
