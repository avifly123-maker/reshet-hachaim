// 1.4.2, the savanna: the migrating herds drawn as crowds (Avi's plan: "a herd is drawn as one group"). One instanced
// mesh per kind (zebra, wildebeest) for every animal of every herd: a simple low-poly body seen from the game's distance,
// its legs swinging in the vertex shader (a phase per animal from its position), so a herd of dozens costs one draw call.
// The herds themselves (where, how many, what they do) are src/game/savanna/herds.js; this only places their animals.
//   createHerdCrowd(scene, env) → { update(herds, dt, t, moving), dispose() }
// Members keep a fixed place in their herd (a loose spread around its centre) and follow the ground.
import * as THREE from 'three';
import { mergeGeometries } from '../core/util.js';

const MAX = 60;   // animals of one kind drawn at most (the herds' numbers are capped well below this)
const LOOK = {
  zebra: { len: 2.1, sh: 1.3, body: '#f2efe6', dark: '#1e1c1c', stripes: true, neck: 0.75, headDown: 0.15 },
  wildebeest: { len: 2.2, sh: 1.3, body: '#5e6068', dark: '#2a2a2e', stripes: false, neck: 0.55, headDown: 0.45, horns: true, beard: true },
};

// a quadruped of a few tapered pieces, coloured per vertex; legs carry aLeg = (front +1 / back -1) × side: the sign is the
// diagonal pair (front-right with back-left), which swing together
function buildBody(L) {
  const parts = [];
  const col = (g, fn) => { const p = g.attributes.position, c = new Float32Array(p.count * 3), t = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(t, p.getX(i), p.getY(i), p.getZ(i)); c.set([t.r, t.g, t.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const leg = (g, v) => { g.setAttribute('aLeg', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(v), 1)); return g; };
  const B = new THREE.Color(L.body), D = new THREE.Color(L.dark);
  const paint = (t, x, y, z) => { t.copy(B); if (L.stripes && Math.sin(z * 11 + y * 4) > 0.15) t.copy(D); if (!L.stripes) t.lerp(D, Math.max(0, 0.9 - y / L.sh) * 0.6); };
  // the body: a tapered cylinder along z (head to the +z side)
  const body = new THREE.CylinderGeometry(0.36, 0.32, L.len * 0.62, 10, 8); body.rotateX(Math.PI / 2); body.scale(0.9, 1.15, 1); body.translate(0, L.sh * 0.92, 0);
  parts.push(leg(col(body, paint), 0));
  // the neck and head
  const neck = new THREE.CylinderGeometry(0.13, 0.2, L.neck, 6, 3); neck.rotateX(-0.9 + L.headDown); neck.translate(0, L.sh * 1.18, L.len * 0.34);
  parts.push(leg(col(neck, paint), 0));
  const head = new THREE.CylinderGeometry(0.08, 0.14, 0.55, 6, 2); head.rotateX(Math.PI / 2 + 0.6 + L.headDown); head.translate(0, L.sh * 1.32 - L.headDown * 0.5, L.len * 0.5);
  parts.push(leg(col(head, (t, x, y, z) => { paint(t, x, y, z); if (z > L.len * 0.58) t.copy(D); }), 0));
  if (L.stripes) {   // the zebra's short upright mane
    const mane = new THREE.BoxGeometry(0.05, 0.14, L.neck * 0.9); mane.rotateX(-0.9 + L.headDown + Math.PI / 2 - 0.2); mane.translate(0, L.sh * 1.32, L.len * 0.32);
    parts.push(leg(col(mane, (t) => t.copy(D)), 0));
  }
  if (L.horns) for (const s of [1, -1]) {
    const h = new THREE.CylinderGeometry(0.02, 0.05, 0.4, 4, 1); h.rotateZ(s * 1.1); h.translate(s * 0.16, L.sh * 1.4 - L.headDown * 0.4, L.len * 0.47);
    parts.push(leg(col(h, (t) => t.set('#3a3632')), 0));
  }
  if (L.beard) { const b = new THREE.BoxGeometry(0.06, 0.25, 0.18); b.translate(0, L.sh * 1.0, L.len * 0.42); parts.push(leg(col(b, (t) => t.copy(D)), 0)); }
  // the tail
  const tail = new THREE.CylinderGeometry(0.02, 0.03, 0.6, 4, 1); tail.rotateX(0.35); tail.translate(0, L.sh * 0.78, -L.len * 0.34);
  parts.push(leg(col(tail, (t) => t.copy(D)), 0));
  // four legs: from the body down to the ground, a dark hoof
  for (const [fz, side] of [[0.24, 1], [0.24, -1], [-0.26, 1], [-0.26, -1]]) {
    const g = new THREE.CylinderGeometry(0.07, 0.05, L.sh * 0.92, 5, 4); g.translate(side * 0.18, L.sh * 0.46, fz * L.len);
    parts.push(leg(col(g, (t, x, y, z) => { paint(t, x, y, z); if (y < 0.12) t.set('#2a2622'); }), (fz > 0 ? 1 : -1) * side));
  }
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute('uv'); return g; }));
  parts.forEach((g) => g.dispose());
  geo.computeVertexNormals();
  return geo;
}

export function createHerdCrowd(scene, env) {
  const U = { uTime: { value: 0 }, uGait: { value: 1 } };
  const meshes = {};
  for (const [kind, L] of Object.entries(LOOK)) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aLeg; uniform float uTime, uGait;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          if (aLeg != 0.0) {
            float ph = instanceMatrix[3][0] * 1.31 + instanceMatrix[3][2] * 0.77;
            float sw = sin(uTime * 6.0 * uGait + ph + (aLeg > 0.0 ? 0.0 : 3.1416));   // the diagonal pairs step together
            float k = clamp(1.0 - transformed.y / ${(L.sh * 0.92).toFixed(2)}, 0.0, 1.0);
            transformed.z += sw * k * 0.32 * uGait;
          }`);
    };
    mat.customProgramCacheKey = () => 'herd-crowd-' + kind;
    const m = new THREE.InstancedMesh(buildBody(L), mat, MAX);
    m.count = 0; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.name = 'herd-' + kind;
    scene.add(m); meshes[kind] = m;
  }
  // a member's fixed place in its herd: a loose oval around the centre, longer along the way it walks
  const slot = (id, i, spread) => {
    const a = (i * 2.39996 + id * 1.7) % (Math.PI * 2), r = Math.sqrt((i + 0.5) / 18) * spread;
    return { a: Math.cos(a) * r * 0.75, b: Math.sin(a) * r * 1.25, yaw: Math.sin(i * 7.3 + id) * 0.35 };
  };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
  function update(herds, dt, t, { spreadOf = () => 6 } = {}) {
    U.uTime.value = t;
    let moving = 0, all = 0;
    const n = {}; for (const k in meshes) n[k] = 0;
    for (const h of herds) {
      const m = meshes[h.kind]; if (!m) continue;
      all++; if (h.state !== 'graze') moving++;
      const spread = spreadOf(h.kind) * (1 + h.scatter * 1.2), yaw0 = Math.atan2(h.hx, h.hz);
      const cs = Math.cos(yaw0), sn = Math.sin(yaw0);
      for (let i = 0; i < h.n && n[h.kind] < MAX; i++) {
        const s = slot(h.id, i, spread);
        const x = h.x + s.a * cs + s.b * sn, z = h.z - s.a * sn + s.b * cs;
        _p.set(x, env.heightAt(x, z), z);
        _q.setFromAxisAngle(_up, yaw0 + s.yaw * (h.state === 'graze' ? 2.2 : 0.4) + h.scatter * Math.sin(i * 3.1) * 1.2);
        _s.setScalar(0.92 + ((i * 37 + h.id * 11) % 17) / 100);
        _m.compose(_p, _q, _s); m.setMatrixAt(n[h.kind]++, _m);
      }
    }
    for (const k in meshes) { const m = meshes[k]; m.count = n[k]; m.instanceMatrix.needsUpdate = true; }
    U.uGait.value += ((all && moving ? 1 : 0.25) - U.uGait.value) * Math.min(1, dt * 2);   // grazing herds step slowly
  }
  function dispose() { for (const m of Object.values(meshes)) { m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); } }
  return { update, dispose, meshes };
}
