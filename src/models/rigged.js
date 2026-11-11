// Rigged animals made in Blender (tools/blender/animal_kit.py → tools/build-rigged.py → src/data/rigged-<zone>.js).
// One skinned mesh per animal, a skeleton, and looping action clips (idle, walk, eat, sleep, fly…) baked at 30 fps.
// Implements the AnimalVisual contract (CONTRACT.md §4), so the world code treats it like the procedural models.
//   v1: vertex colours only.
//   v2 (tools/blender/animal_kit_hd.py, the "museum diorama" models): a colour texture with soft occlusion and a
//       normal map baked from a dense sculpt with fur / feather / scale relief, UVs and normals, and a lighter far
//       version (lod1) that shares the skeleton and the textures – THREE.LOD switches between them by distance.
import * as THREE from 'three';
import { makeRng, cachedMaterial, releaseMaterials } from '../core/util.js';

const _lin = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; _lin[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function bytes(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
const i16 = (s) => { const u = bytes(s); return new Int16Array(u.buffer, 0, u.length >> 1); };
const u16 = (s) => { const u = bytes(s); return new Uint16Array(u.buffer, 0, u.length >> 1); };

// fallback chains: an action the species has no clip for borrows the nearest one
const FALLBACK = {
  run: ['walk'], swim: ['walk'], climb: ['walk'], sit: ['idle'], eat: ['idle'], perch: ['idle'],
  glide: ['fly'], hover: ['fly'], hang: ['sleep', 'idle'], sleep: ['idle'], fly: ['idle'], walk: ['idle'],
};

// the far (light) version takes over beyond this distance (game metres) + a little more for tall animals
const LOD_FAR = 26, LOD_PER_M = 14;
const cache = new Map();
// v2 geometry: positions in a box (int16), uv (uint16), normals (int8), skin, indices grouped by material (1 = glossy)
function geoV2(d) {
  const g = new THREE.BufferGeometry();
  const q = i16(d.pos), n = q.length / 3, bx = d.box, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = bx[k] + (q[i * 3 + k] + 32768) / 65535 * (bx[k + 3] - bx[k]);
  const uq = u16(d.uv), uv = new Float32Array(n * 2);
  for (let i = 0; i < n * 2; i++) uv[i] = uq[i] / 65535;
  const nb = bytes(d.n), nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = (nb[i * 3] << 24 >> 24) / 127, y = (nb[i * 3 + 1] << 24 >> 24) / 127, z = (nb[i * 3 + 2] << 24 >> 24) / 127;
    const l = Math.hypot(x, y, z) || 1; nrm[i * 3] = x / l; nrm[i * 3 + 1] = y / l; nrm[i * 3 + 2] = z / l;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(bytes(d.sk)), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(bytes(d.sw), 4, true));
  const ib = bytes(d.idx), ix = n < 65536 ? new Uint16Array(ib.buffer, 0, ib.length >> 1) : new Uint32Array(ib.buffer, 0, ib.length >> 2);
  g.setIndex(new THREE.BufferAttribute(ix, 1));
  const rough = new Float32Array(n).fill((d.meta && d.meta.rough) || 0.82);   // wet skins (fish, the octopus) are glossier
  for (const [s0, cnt, m] of d.groups) if (m === 1) for (let i = s0; i < s0 + cnt; i++) rough[ix[i]] = 0.16;
  g.setAttribute('aRough', new THREE.BufferAttribute(rough, 1));
  return g;
}
function texture(b64, srgb) {
  const img = new Image(); const t = new THREE.Texture(img);
  img.onload = () => { t.needsUpdate = true; };
  img.src = 'data:image/webp;base64,' + b64;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function prepare(id, d) {
  let c = cache.get(id);
  if (c) return c;
  if (d.v === 2) {
    const geo = geoV2(d), lod = d.lod1 ? geoV2(d.lod1) : null;
    c = { geo, lod, clips: clipsOf(id, d), bones: d.bones, meta: d.meta || {}, tris: geo.index.count / 3,
      tex: { map: texture(d.tex.col, true), normalMap: texture(d.tex.nrm, false) } };
    cache.set(id, c);
    return c;
  }
  const g = new THREE.BufferGeometry();
  const q = i16(d.pos), n = q.length / 3, bx = d.box, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = bx[k] + (q[i * 3 + k] + 32768) / 65535 * (bx[k + 3] - bx[k]);
  const cb = bytes(d.col), col = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) col[i] = _lin[cb[i]];
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(bytes(d.sk)), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(bytes(d.sw), 4, true));
  g.setIndex(new THREE.BufferAttribute(u16(d.idx), 1));

  // one material for the whole animal: the glossy parts (eyes, noses, claws) carry their roughness per vertex,
  // so every animal is a single draw call instead of two (in both the colour and the shadow pass)
  const rough = new Float32Array(n).fill(0.85), ix = u16(d.idx);
  for (const [s0, cnt, m] of d.groups) if (m === 1) for (let i = s0; i < s0 + cnt; i++) rough[ix[i]] = 0.18;
  g.setAttribute('aRough', new THREE.BufferAttribute(rough, 1));
  g.computeVertexNormals();
  c = { geo: g, clips: clipsOf(id, d), bones: d.bones, meta: d.meta || {}, tris: g.index.count / 3 };
  cache.set(id, c);
  return c;
}
function clipsOf(id, d) {
  const names = d.bones.map((b) => b.n), clips = {};
  for (const [name, cl] of Object.entries(d.clips)) {
    const N = cl.n, fps = cl.fps || 30, times = new Float32Array(N + 1);
    for (let f = 0; f <= N; f++) times[f] = f / fps;
    const qv = i16(cl.q), nb = cl.b.length, tracks = [];
    cl.b.forEach((bi, k) => {
      const v = new Float32Array((N + 1) * 4);
      for (let f = 0; f <= N; f++) {
        const src = ((f % N) * nb + k) * 4;
        let x = qv[src] / 32767, y = qv[src + 1] / 32767, z = qv[src + 2] / 32767, w = qv[src + 3] / 32767;
        const l = Math.hypot(x, y, z, w) || 1; x /= l; y /= l; z /= l; w /= l;
        if (f > 0) { const p = (f - 1) * 4; if (v[p] * x + v[p + 1] * y + v[p + 2] * z + v[p + 3] * w < 0) { x = -x; y = -y; z = -z; w = -w; } }
        v.set([x, y, z, w], f * 4);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(names[bi] + '.quaternion', times, v));
    });
    if (cl.r) {
      const v = new Float32Array((N + 1) * 3);
      for (let f = 0; f <= N; f++) v.set(cl.r.slice((f % N) * 3, (f % N) * 3 + 3), f * 3);
      tracks.push(new THREE.VectorKeyframeTrack(names[0] + '.position', times, v));
    }
    clips[name] = new THREE.AnimationClip(id + ':' + name, N / fps, tracks);
  }
  return clips;
}

// the per-vertex roughness (glossy eyes, noses, claws) is the same shader patch for v1 and v2
// 1.4.4 set 10: a little life in the look. A catch light in the eyes (and on wet noses: the glossy parts), and a soft
// sheen of fur at the edges of the body, as fur catches the light. RIM_U.uRimK follows the daylight (the island's update).
export const RIM_U = { uRimK: { value: 0.2 } };
const LOOK_FRAG = `
  { float _g = 1.0 - smoothstep(0.25, 0.4, vRough);
    totalEmissiveRadiance += vec3(1.0, 0.98, 0.94) * pow(max(dot(normal, normalize(vec3(-0.35, 0.55, 0.75))), 0.0), 70.0) * 1.4 * _g * (0.35 + uRimK * 3.0);
    float _rim = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 3.0);
    totalEmissiveRadiance += diffuseColor.rgb * _rim * uRimK * (1.0 - _g); }`;
function lookPatch(sh) {
  sh.uniforms.uRimK = RIM_U.uRimK;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aRough;\nvarying float vRough;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRough = aRough;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vRough; uniform float uRimK;')
    .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRough;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + LOOK_FRAG);
}
function roughPatch(m) {
  m.onBeforeCompile = lookPatch;
  m.customProgramCacheKey = () => 'rigged-rough';
  return m;
}
function materialV2(id, tex, meta = {}) {
  // meta.opacity: see-through animals (the moon jellyfish)
  const see = meta.opacity && meta.opacity < 1;
  return cachedMaterial('rigged:hd:' + id, () => roughPatch(new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, roughness: 0.82, metalness: 0,
    ...(see ? { transparent: true, opacity: meta.opacity, depthWrite: false, side: THREE.DoubleSide } : {}) })));
}
function materials() {
  return cachedMaterial('rigged:skin', () => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
    m.onBeforeCompile = lookPatch;
    m.customProgramCacheKey = () => 'rigged-rough';
    return m;
  });
}

// the contact spot: one shared soft round texture, geometry and material for all animals
let BLOB = null;
function contactBlob(size) {
  if (!BLOB) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.55, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    BLOB = { geo: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat: new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }) };
  }
  const m = new THREE.Mesh(BLOB.geo, BLOB.mat); m.name = 'contact'; m.position.y = 0.03; m.scale.set(size * 0.9, 1, size * 0.9 * 1.3); m.renderOrder = 1;
  m.castShadow = false; m.receiveShadow = false; m.raycast = () => { };
  return m;
}
export function makeRigged(id, data, opts = {}) {
  const P = prepare(id, data), meta = P.meta;
  const seed = opts.seed ?? 1, rng = makeRng(((seed * 2654435761) ^ (id.length * 977)) >>> 0);
  const object = new THREE.Group(); object.name = id;
  const bones = P.bones.map((b) => { const o = new THREE.Bone(); o.name = b.n; o.position.fromArray(b.t); o.quaternion.fromArray(b.q); return o; });
  P.bones.forEach((b, i) => { if (b.p >= 0) bones[b.p].add(bones[i]); });
  const mat = P.tex ? materialV2(id, P.tex, meta) : materials();
  const mesh = new THREE.SkinnedMesh(P.geo, mat);
  const meshes = [mesh];
  if (P.lod) {
    // near: the detailed mesh; far: the light one. Both share the bones (kept on the group) and the textures.
    const far = new THREE.SkinnedMesh(P.lod, mat);
    const lod = new THREE.LOD();
    lod.addLevel(mesh, 0); lod.addLevel(far, LOD_FAR + LOD_PER_M * (meta.height || 0.5), 0.1);
    object.add(bones[0]); object.add(lod); object.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones);
    mesh.bind(skel); far.bind(skel);
    meshes.push(far);
  } else {
    mesh.add(bones[0]); mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    object.add(mesh);
  }
  for (const m of meshes) {
    m.castShadow = true; m.receiveShadow = true;
    // culling sphere from the rest pose, enlarged so stretched poses (flight, climbing, hanging) never pop out of view
    m.computeBoundingSphere(); m.boundingSphere.radius *= 1.7;
  }
  const sc = 0.94 + rng() * 0.12; object.scale.setScalar(sc);
  const mixer = new THREE.AnimationMixer(P.lod ? object : mesh);
  const acts = {};
  for (const [k, clip] of Object.entries(P.clips)) { const a = mixer.clipAction(clip); a.time = rng() * clip.duration; acts[k] = a; }
  const map = meta.map || {};
  const pick = (a) => {
    if (acts[map[a]]) return map[a];
    if (acts[a]) return a;
    for (const f of FALLBACK[a] || []) if (acts[map[f] || f]) return map[f] || f;
    return acts.idle ? 'idle' : Object.keys(acts)[0];
  };
  let cur = null, curName = '', dirty = true;
  const speeds = meta.speeds || {};
  function setAction(a, speed) {
    const name = pick(a), next = acts[name];
    if (!next) return;
    if (name !== curName) {
      next.reset(); next.time = rng() * next.getClip().duration; next.enabled = true; next.setEffectiveWeight(1); next.play();
      if (cur) cur.crossFadeTo(next, 0.3, false);
      cur = next; curName = name; dirty = true;
    }
    // gait clips follow the ground speed (a walk clip used for running simply plays faster)
    let ts = 1;
    if ((name === 'walk' || name === 'run') && speed != null) {
      const ref = speeds[name] || speeds.walk || 0.5;
      ts = speed > 0.01 ? Math.min(3, Math.max(0.5, speed / ref)) : 0.6;
    }
    cur.timeScale = ts;
  }
  setAction('idle', 0); mixer.update(0);
  // Animation is evaluated only for animals that were actually drawn last frame, and less often for tiny far-away
  // ones (time is accumulated, so the motion keeps its speed). Off-screen animals cost nothing.
  let seen = true, acc = 0, skip = 0, every = 1;
  const _wp = new THREE.Vector3();
  const onDraw = (r, sc, cam) => {
    seen = true;
    if (!cam || !cam.isPerspectiveCamera) { every = 1; return; }
    const d = cam.position.distanceTo(object.getWorldPosition(_wp));
    const px = (r.domElement.height / (2 * Math.tan(cam.fov * Math.PI / 360))) * object.scale.y * (meta.height || 0.4) / Math.max(0.1, d);
    every = px > 40 ? 1 : px > 18 ? 2 : 3;   // on-screen height in pixels
  };
  for (const m of meshes) m.onBeforeRender = onDraw;
  const grip = {}; for (const [k, v] of Object.entries(meta.gripY || {})) grip[k] = v * sc;
  // 1.4.4 set 10: life at rest, laid over the clip after each evaluation (the clip sets the bones again next time, so
  // nothing adds up): breathing in the chest, a slow look around, a tail that sways, an ear that flicks now and then
  const byName = (re) => bones.find((b) => re.test(b.name));
  const LB = { chest: byName(/^chest/), head: (byName(/^head/) || byName(/^neck/) || {}).parent ? (byName(/^head/) || byName(/^neck/)) : null, tail: byName(/^tail/), ears: bones.filter((b) => /^ear/.test(b.name)) };
  const life = { t: rng() * 50, look: 0, lookT: 0, flick: 0, flickT: 3 + rng() * 6 };
  const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _ax = new THREE.Vector3(), UPW = new THREE.Vector3(0, 1, 0);
  // turn a bone about an axis given in the world (up = look left and right), whatever way the bone itself points
  const turn = (b, axisW, a) => { b.parent.getWorldQuaternion(_pq); _ax.copy(axisW).applyQuaternion(_pq.invert()); b.quaternion.premultiply(_q.setFromAxisAngle(_ax, a)); };
  const REST = { idle: 1, sit: 1, graze: 0.5, eat: 0.5, sleep: 0.3, perch: 1, look: 1 };
  function rest(name) {
    const k = REST[name] || 0; if (!k) return;
    const t = life.t;
    if (LB.chest) LB.chest.scale.setScalar(1 + 0.018 * Math.sin(t * 2.1));
    if (LB.head && name !== 'sleep') {
      if (t > life.lookT) { life.look = (rng() - 0.5) * 0.9; life.lookT = t + 2.5 + rng() * 4; }
      life.lookNow = (life.lookNow || 0) + (life.look - (life.lookNow || 0)) * 0.08;
      turn(LB.head, UPW, life.lookNow * k);
    }
    if (LB.tail && LB.tail.parent) turn(LB.tail, UPW, Math.sin(t * 1.3) * 0.18 * k);
    if (LB.ears.length) {
      if (t > life.flickT) { life.flick = 1; life.flickT = t + 4 + rng() * 7; }
      if (life.flick > 0) { life.flick = Math.max(0, life.flick - 0.25); for (const e of LB.ears) e.quaternion.multiply(_q.setFromAxisAngle(_ax.set(1, 0, 0), Math.sin(life.flick * Math.PI) * 0.35)); }
    }
  }
  // a soft dark spot on the ground under the animal (it holds it to the ground, even where there are no shadow maps);
  // hidden when it flies, perches, climbs or swims
  const blob = opts.noBlob ? null : contactBlob(Math.max(meta.length || 0.4, (meta.height || 0.4) * 0.7));
  if (blob) object.add(blob);
  const AIR = /^(fly|hover|glide|perch|climb|hang|swim)/;
  return {
    type: 'animal', id, object,
    height: (meta.height || (data.box[4] - Math.min(0, data.box[1]))) * sc,
    length: (meta.length || (data.box[5] - data.box[2])) * sc,
    actions: Object.keys(acts), speeds: meta.speeds, gripY: grip, perchOffset: (meta.perchOffset || 0) * sc,
    tris: P.tris, rigged: true,
    update(dt, s = {}) {
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      setAction(s.action || 'idle', s.speed);
      life.t += dt;
      if (blob) blob.visible = !AIR.test(curName);
      acc = Math.min(acc + dt, 1);
      const vis = seen; seen = false;
      if (!vis && !dirty) return;
      if (acc <= 0 && !dirty) return;               // paused: the pose cannot change
      if (!dirty && ++skip < every) return;
      skip = 0; dirty = false;
      mixer.update(acc); acc = 0;
      if (every === 1) rest(curName);   // close enough to see: the little movements of rest
      else if (LB.chest) LB.chest.scale.setScalar(1);
    },
    dispose() { if (blob) blob.removeFromParent(); mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot()); mesh.skeleton.dispose(); object.removeFromParent(); },
  };
}

// zone packs: species that have a Blender model use it, the others keep their procedural model
// 1.4.3: what the savanna's crowds draw many times over (src/world/herd-crowd.js): the light far version of the model, its
// bones and clips, and a material of its own (the instancing library patches its material, so it is never shared with
// the animals the child placed). A model without textures (v1) is not used for crowds.
export function crowdSource(id, data) {
  const P = prepare(id, data);
  if (!P.tex) return null;
  const mat = cachedMaterial('rigged:crowd:' + id, () => roughPatch(new THREE.MeshStandardMaterial({ map: P.tex.map, normalMap: P.tex.normalMap, roughness: 0.82, metalness: 0 })));
  if (!P.crowdGeo) P.crowdGeo = (P.lod || P.geo).clone();   // its own copy: the library adds an instance attribute to the geometry it draws
  return { geo: P.crowdGeo, mat, bones: P.bones, clips: P.clips, meta: P.meta };
}

export function withRigged(animals, data) {
  const out = { ...animals };
  for (const [id, d] of Object.entries(data || {})) {
    const old = animals[id];
    out[id] = (o) => { try { return makeRigged(id, d, o); } catch (e) { console.warn('rigged', id, e); return old ? old(o) : null; } };
    out[id].rigged = d;   // 1.4.3: the crowd (src/world/herd-crowd.js) draws many of the same model from its data
  }
  return out;
}

export function releaseRigged() {
  for (const c of cache.values()) { c.geo.dispose(); if (c.lod) c.lod.dispose(); if (c.crowdGeo) c.crowdGeo.dispose(); if (c.tex) { c.tex.map.dispose(); c.tex.normalMap.dispose(); } }
  cache.clear(); releaseMaterials('rigged:');
}
