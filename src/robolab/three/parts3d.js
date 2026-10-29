// מעבדת הרובוטים – the Blender tools in the game: a base (robot, drone, sub) with parts on its sockets, painted in the
// player's colours. The meshes come from src/data/robolab-parts.js (tools/blender/robolab_kit.py → build-robolab-parts.py).
//   const g = buildTool({ base: 'robot', parts: { head: 'head_screen', back: 'bin' }, paint: { body: '#e8873a' } })
//   g.userData: { kind, rotors (spinning groups), prop, sockets: { name: Object3D }, mats: { slot: Material } }
//   paintTool(g, { body, trim, accent })   attachPart(g, socket, partId)   (both work on a built tool, at any time)
// Every socket is an Object3D, so anything can be attached later: another part, a light, a sensor, a second tool.
import * as THREE from 'three';
import { RL_PARTS } from '../../data/robolab-parts.js';
import { DEFAULT_LOOK } from '../../data/robolab/parts.js';

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
const geoCache = new Map();
export function geo(key, m) {
  if (geoCache.has(key)) return geoCache.get(key);
  const q = new Int16Array(b64(m.p)), n = new Int8Array(b64(m.n)), idx = new Uint16Array(b64(m.i));
  const P = new Float32Array(q.length), N = new Float32Array(n.length);
  for (let v = 0; v < q.length / 3; v++) for (let k = 0; k < 3; k++) {
    P[v * 3 + k] = m.lo[k] + (q[v * 3 + k] + 32767) / 65534 * m.sc[k];
    N[v * 3 + k] = n[v * 3 + k] / 127;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  geoCache.set(key, g); return g;
}
// the slots' looks; body / trim / accent take the player's paint
export const SLOT_LOOK = {
  body: { c: '#f2731f', r: 0.45 }, trim: { c: '#1a9e99', r: 0.45 }, accent: { c: '#ffc72e', r: 0.4 },
  dark: { c: '#24292f', r: 0.6 }, cream: { c: '#f5f0e6', r: 0.5 }, glass: { c: '#1a2b35', r: 0.08, m: 0.3 },
  glow: { c: '#7fe3ff', r: 0.3, e: 1.4 }, metal: { c: '#b8c2cc', r: 0.3, m: 0.75 }, rubber: { c: '#17181a', r: 0.92 },
  leather: { c: '#8c5a36', r: 0.75 }, wood: { c: '#d9a862', r: 0.7 },
};
export function mats(paint) {
  const M = {};
  for (const [k, L] of Object.entries(SLOT_LOOK)) {
    const c = (paint && paint[k]) || L.c;
    M[k] = new THREE.MeshStandardMaterial({ color: c, roughness: L.r, metalness: L.m || 0.05, ...(L.e ? { emissive: c, emissiveIntensity: L.e } : {}) });
  }
  return M;
}
function meshGroup(prefix, slots, M) {
  const g = new THREE.Group();
  for (const [sl, m] of Object.entries(slots)) {
    const mesh = new THREE.Mesh(geo(prefix + ':' + sl, m), M[sl] || M.body);
    mesh.castShadow = true; mesh.receiveShadow = false; mesh.name = sl;
    g.add(mesh);
  }
  return g;
}
export const hasBlenderTools = () => !!(RL_PARTS && RL_PARTS.bases && RL_PARTS.bases.robot);

export function buildTool(spec = {}) {
  const base = spec.base || 'robot', B = RL_PARTS.bases[base];
  if (!B) return null;
  const M = mats(spec.paint);
  const g = new THREE.Group(); g.name = 'rl-' + base;
  g.add(meshGroup('b:' + base, B.slots, M));
  const rotors = []; let prop = null;
  for (const [name, S] of Object.entries(B.spin || {})) {
    const holder = new THREE.Group(); holder.position.fromArray(S.at); holder.rotation.set(S.rot[0], S.rot[1], S.rot[2]);
    const spinner = meshGroup('s:' + base + ':' + name, S.slots, M); holder.add(spinner); g.add(holder);
    if (name === 'prop') prop = spinner; else rotors.push(spinner);
  }
  const sockets = {};
  for (const [name, S] of Object.entries(B.sockets || {})) {
    const o = new THREE.Group(); o.name = 'socket:' + name; o.position.fromArray(S.at); o.rotation.y = S.yaw || 0;
    g.add(o); sockets[name] = o;
  }
  g.userData = { kind: base, rotors, prop, sockets, mats: M, parts: {} };
  const parts = { ...(DEFAULT_LOOK[base] || {}), ...(spec.parts || {}) };
  for (const [s, pid] of Object.entries(parts)) if (pid) attachPart(g, s, pid);
  return g;
}
export function attachPart(g, socket, pid) {
  const U = g.userData, s = U.sockets[socket]; if (!s) return null;
  if (U.parts[socket]) { s.remove(U.parts[socket].obj); U.parts[socket] = null; }
  const P = pid && RL_PARTS.parts[pid]; if (!P) return null;
  const obj = meshGroup('p:' + pid, P.slots, U.mats); obj.name = 'part:' + pid;
  s.add(obj); U.parts[socket] = { id: pid, obj };
  return obj;
}
export function paintTool(g, paint) {
  const M = g.userData.mats;
  for (const k of ['body', 'trim', 'accent']) if (paint && paint[k]) M[k].color.set(paint[k]);
}
