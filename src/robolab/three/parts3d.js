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
  body: { c: '#f2731f', r: 0.34 }, trim: { c: '#1a9e99', r: 0.34 }, accent: { c: '#ffc72e', r: 0.32 },
  dark: { c: '#33383f', r: 0.42, m: 0.3 }, cream: { c: '#f5f0e6', r: 0.4 }, glass: { c: '#1a2b35', r: 0.08, m: 0.3 },
  glow: { c: '#7fe3ff', r: 0.3, e: 1.4 }, metal: { c: '#c4ccd4', r: 0.26, m: 0.8 }, rubber: { c: '#17181a', r: 0.9 },
  leather: { c: '#8c5a36', r: 0.75 }, wood: { c: '#d9a862', r: 0.7 },
};
// 1.4.3 (Avi: "less smooth, a certain roughness"): a fine grain on every surface but glass and light, the same as the
// Blender kit's (tools/blender/robolab_wk.py GRIT): a jitter of the normal and a slow change of roughness from a noise
// of the object's own position (it stays on the part as the tool moves). [scale per metre, normal jitter, roughness ±]
const GRIT = { rubber: [90, 0.22, 0.14], metal: [220, 0.06, 0.12], dark: [160, 0.1, 0.14], wood: [60, 0.14, 0.12] };
const GRIT_DEF = [180, 0.08, 0.14];
const GRIT_GLSL = `varying vec3 vGrit; uniform vec3 uGrit;
float gH(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float gN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gH(i), gH(i + vec3(1,0,0)), f.x), mix(gH(i + vec3(0,1,0)), gH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(gH(i + vec3(0,0,1)), gH(i + vec3(1,0,1)), f.x), mix(gH(i + vec3(0,1,1)), gH(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
function grit(mat, g) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGrit = { value: new THREE.Vector3(g[0], g[1], g[2]) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGrit;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrit = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GRIT_GLSL)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (gN(vGrit * uGrit.x * 0.11) - 0.5) * uGrit.z * 2.0, 0.04, 1.0);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec3 q = vGrit * uGrit.x; normal = normalize(normal + (vec3(gN(q), gN(q + 17.1), gN(q + 31.7)) - 0.5) * uGrit.y); }');
  };
  mat.customProgramCacheKey = () => 'grit:' + g.join(',');
}
export function mats(paint) {
  const M = {};
  for (const [k, L] of Object.entries(SLOT_LOOK)) {
    const c = (paint && paint[k]) || L.c;
    M[k] = new THREE.MeshStandardMaterial({ color: c, roughness: L.r, metalness: L.m || 0.05, ...(L.e ? { emissive: c, emissiveIntensity: L.e } : {}) });
    if (k !== 'glass' && k !== 'glow') grit(M[k], GRIT[k] || GRIT_DEF);
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

// 1.4.3 set 4: the tall robot's compound eyes are thousands of small facets; seen from afar (a mission field) a few
// soft lights look the same and cost a fraction. farEyes(g) finds the head's light slot, puts one smooth eye over
// each cluster of facets, and returns set(far) to switch between them (session.js decides by the camera's distance).
export function farEyes(g) {
  const head = g.getObjectByName('part:head_d'); if (!head) return null;
  const glow = head.children.find((m) => m.name === 'glow'); if (!glow || !glow.geometry) return null;
  const p = glow.geometry.attributes.position, sides = [[], []];
  for (let i = 0; i < p.count; i++) sides[p.getX(i) < 0 ? 0 : 1].push(i);
  const simple = new THREE.Group(); simple.name = 'far-eyes'; simple.visible = false;
  for (const ids of sides) {
    if (!ids.length) continue;
    const bb = new THREE.Box3(), v = new THREE.Vector3();
    for (const i of ids) bb.expandByPoint(v.fromBufferAttribute(p, i));
    const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3());
    const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), glow.material);
    eye.position.copy(c); eye.scale.set(Math.max(0.01, s.x), Math.max(0.01, s.y), Math.max(0.01, s.z));
    simple.add(eye);
  }
  head.add(simple);
  let far = false;
  return { set(f) { if (f === far) return; far = f; glow.visible = !f; simple.visible = f; }, get far() { return far; } };
}
