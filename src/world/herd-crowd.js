// The savanna's herds drawn as crowds (1.4.2: the migrating herds; 1.4.3: also the resident herds of savanna/pop.js).
// 1.4.3 (Avi: "the GitHub project for large numbers"): each kind is the real Blender model (its light far version, its
// bones and clips: src/models/rigged.js crowdSource) drawn many times by one InstancedMesh2 of @three.ez/instanced-mesh
// (MIT): one draw call per kind, a skeleton per animal in a bone texture, the animals outside the view are not drawn.
// The animation is shared: each frame the model is posed a few times (walking or grazing, at a few phases) and every
// animal takes the pose of its phase, so a herd does not step in step. A kind with no Blender model yet falls back to the
// 1.4.2 body of a few tapered pieces with legs swung in the shader.
// The herds themselves (where, how many, what they do) are savanna/herds.js and savanna/pop.js; this only places them.
//   createHerdCrowd(scene, env, { builders, quality(), renderer }) → { update(groups, dt, t, { spreadOf }), drawn(), dispose() }
//   group = { id, kind, n, x, z, hx, hz, state: 'graze' | 'move' | …, scatter, spread? }
// Members keep a fixed place in their herd (a loose spread around its centre) and follow the ground.
import * as THREE from 'three';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { mergeGeometries } from '../core/util.js';
import { crowdSource } from '../models/rigged.js';

const MAX = 60;   // the simple bodies: animals of one kind drawn at most
// the Blender crowds: how many of one kind are drawn by the quality tier (the numbers of the herds stay true; a weak computer
// draws a part of a big herd), whether they cast shadows, and how often their bones are posed (every n-th frame)
const TIER = { min: { cap: 24, shadow: false, every: 3 }, low: { cap: 40, shadow: false, every: 2 }, medium: { cap: 70, shadow: true, every: 1 }, high: { cap: 90, shadow: true, every: 1 }, ultra: { cap: 90, shadow: true, every: 1 } };
const KINDS = ['zebra', 'wildebeest', 'impala', 'buffalo'];
const PHASES = 4;   // poses per gait (walking, grazing) and frame
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

// a member's fixed place in its herd: a loose oval around the centre, longer along the way it walks
const slot = (id, i, spread) => {
  const a = (i * 2.39996 + id * 1.7) % (Math.PI * 2), r = Math.sqrt((i + 0.5) / 18) * spread;
  return { a: Math.cos(a) * r * 0.75, b: Math.sin(a) * r * 1.25, yaw: Math.sin(i * 7.3 + id) * 0.35 };
};

// one kind drawn from its Blender model: InstancedMesh2 with a skeleton per instance, posed from shared phases
function riggedKind(scene, kind, src, cap, renderer) {
  const bones = src.bones.map((b) => { const o = new THREE.Bone(); o.name = b.n; o.position.fromArray(b.t); o.quaternion.fromArray(b.q); return o; });
  src.bones.forEach((b, i) => { if (b.p >= 0) bones[b.p].add(bones[i]); });
  const holder = new THREE.Group(); holder.add(bones[0]); holder.updateMatrixWorld(true);   // never in the scene: only posed
  const skel = new THREE.Skeleton(bones);
  const im = new InstancedMesh2(src.geo, src.mat, { capacity: cap, renderer });
  im.initSkeleton(skel);
  im.addInstances(cap, () => {});
  for (let i = 0; i < cap; i++) im.setVisibilityAt(i, false);
  im.receiveShadow = true; im.name = 'herd-' + kind;
  scene.add(im);
  const mixer = new THREE.AnimationMixer(holder);
  const map = src.meta.map || {};
  const clip = (a, ...f) => { for (const n of [map[a], a, ...f]) if (n && src.clips[n]) return src.clips[n]; return Object.values(src.clips)[0]; };
  const gaits = { move: clip('walk', 'idle'), graze: clip('eat', 'idle') };
  const acts = { move: mixer.clipAction(gaits.move), graze: mixer.clipAction(gaits.graze) };
  for (const a of Object.values(acts)) { a.play(); a.setEffectiveWeight(0); }
  // pose the skeleton for one gait at one phase (the clip's time), then hand that pose to the instances that use it
  function pose(gait, phase, t, ts) {
    for (const k in acts) acts[k].setEffectiveWeight(k === gait ? 1 : 0);
    const a = acts[gait], d = a.getClip().duration;
    a.time = ((t * ts + phase * d / PHASES) % d + d) % d;
    mixer.update(0);
  }
  return { im, pose, cap, dispose() { mixer.stopAllAction(); mixer.uncacheRoot(holder); im.removeFromParent(); im.dispose(); skel.dispose(); src.geo.deleteAttribute('instanceIndex'); } };   // the cached geometry is clean for the next island
}

export function createHerdCrowd(scene, env, { builders = {}, quality = () => 'medium', renderer = null } = {}) {
  const U = { uTime: { value: 0 }, uGait: { value: 1 } };
  const simple = {}, rig = {};
  const tierOf = () => TIER[quality()] || TIER.medium;
  for (const kind of KINDS) {
    const rd = builders[kind] && builders[kind].rigged;
    let src = null;
    try { src = rd ? crowdSource(kind, rd) : null; } catch (e) { console.warn('herd crowd', kind, e); }
    if (src) { rig[kind] = riggedKind(scene, kind, src, TIER.high.cap, renderer); continue; }
    const L = LOOK[kind]; if (!L) continue;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
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
    scene.add(m); simple[kind] = m;
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
  const used = {}, wasUsed = {}, gaitOf = {}; for (const k in rig) { used[k] = 0; wasUsed[k] = 0; gaitOf[k] = new Uint8Array(rig[k].cap); }
  let frame = 0, drawnNow = 0;
  function update(groups, dt, t, { spreadOf = () => 6 } = {}) {
    U.uTime.value = t; frame++;
    const tier = tierOf();
    let moving = 0, all = 0; drawnNow = 0;
    const n = {}; for (const k in simple) n[k] = 0;
    for (const k in rig) used[k] = 0;
    for (const h of groups) {
      const R = rig[h.kind], S = simple[h.kind]; if (!R && !S) continue;
      all++; const walking = h.state !== 'graze'; if (walking) moving++;
      const spread = (h.spread || spreadOf(h.kind)) * (1 + (h.scatter || 0) * 1.2), yaw0 = Math.atan2(h.hx, h.hz);   // a resident herd brings its own
      const cs = Math.cos(yaw0), sn = Math.sin(yaw0);
      for (let i = 0; i < h.n; i++) {
        if (R ? used[h.kind] >= Math.min(R.cap, tier.cap) : n[h.kind] >= MAX) break;
        const s = slot(h.id, i, spread);
        let x = h.x + s.a * cs + s.b * sn, z = h.z - s.a * sn + s.b * cs;
        if (env.isWater && env.isWater(x, z)) { x = 2 * h.x - x; z = 2 * h.z - z; if (env.isWater(x, z)) continue; }   // a place in the river: the other side of the herd, or none
        _p.set(x, env.heightAt(x, z), z);
        _q.setFromAxisAngle(_up, yaw0 + s.yaw * (walking ? 0.4 : 2.2) + (h.scatter || 0) * Math.sin(i * 3.1) * 1.2);
        _s.setScalar(0.92 + ((i * 37 + h.id * 11) % 17) / 100);
        _m.compose(_p, _q, _s);
        if (R) { const id = used[h.kind]++; R.im.setMatrixAt(id, _m); if (id >= wasUsed[h.kind]) R.im.setVisibilityAt(id, true); gaitOf[h.kind][id] = walking ? 1 : 0; }
        else S.setMatrixAt(n[h.kind]++, _m);
      }
    }
    for (const k in simple) { const m = simple[k]; m.count = n[k]; m.instanceMatrix.needsUpdate = true; drawnNow += n[k]; }
    U.uGait.value += ((all && moving ? 1 : 0.25) - U.uGait.value) * Math.min(1, dt * 2);   // grazing herds step slowly
    for (const k in rig) {
      const R = rig[k], u = used[k];
      for (let i = u; i < wasUsed[k]; i++) R.im.setVisibilityAt(i, false);   // a herd that grew smaller
      wasUsed[k] = u; drawnNow += u;
      R.im.castShadow = tier.shadow;
      if (!u || frame % tier.every) continue;
      // the shared poses: each animal takes its gait at the phase its slot gives it
      for (const gait of ['graze', 'move']) {
        const g = gait === 'move' ? 1 : 0;
        for (let ph = 0; ph < PHASES; ph++) {
          let first = true;
          for (let id = ph; id < u; id += PHASES) {
            if (gaitOf[k][id] !== g) continue;
            if (first) R.pose(gait, ph, t, gait === 'move' ? 1 : 0.8);
            R.im.setBonesAt(id, first); first = false;   // the bones' matrices once per pose, then only copied
          }
        }
      }
    }
  }
  function dispose() { for (const m of Object.values(simple)) { m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); } for (const R of Object.values(rig)) R.dispose(); }
  return { update, dispose, meshes: simple, rigged: rig, drawn: () => drawnNow };
}
