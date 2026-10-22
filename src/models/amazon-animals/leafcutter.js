// Amazon animals: the leafcutter ant colony (ColonyVisual) (moved unchanged from amazon-animals.js).
// Adds ANIM.leafcutter. Also holds releaseCaches(), because it resets this file's cached geometry (let bindings
// can only be reassigned in the module that declares them). Needs: kit.js, species.js.
import * as THREE from 'three';
import { makeRng, clamp, smoothstep, mergeGeometries, isLowQuality, disposeDeep, releaseMaterials } from '../../core/util.js';
import { V3, TAU, PI, col, mixc, L, ball, xf, paintFaces, solid, plate, jl, mat, _specCache } from './kit.js';
import { ANIM } from './species.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// Leafcutter ant colony (ColonyVisual)
// ═══════════════════════════════════════════════════════════════════════════════════
let _antGeo = null, _leafGeo = null, _moundGeo = new Map();
function antGeometry() {
  if (_antGeo) return _antGeo;
  const c = '#7a2e14', d = '#5a200c';
  const parts = [
    solid(ball(0.018, 0.016, 0.022, 6, 4, [0, 0.025, 0.045]), c),         // head
    solid(ball(0.012, 0.012, 0.028, 5, 4, [0, 0.026, 0.008]), d),         // thorax
    solid(ball(0.022, 0.02, 0.03, 6, 4, [0, 0.028, -0.04]), d),          // abdomen
  ];
  for (const s of [1, -1]) for (const z of [0.022, 0.006, -0.012]) parts.push(solid(L([{ p: [s * 0.006, 0.022, z], rx: 0.0025, ry: 0.0025 }, { p: [s * 0.03, 0.025, z + z * 0.8], rx: 0.0022, ry: 0.0022 }, { p: [s * 0.04, 0.0, z + z * 1.5], rx: 0.002, ry: 0.002 }], { seg: 3, sub: 1 }), d));
  for (const s of [1, -1]) parts.push(solid(L([{ p: [s * 0.008, 0.035, 0.06], rx: 0.002, ry: 0.002 }, { p: [s * 0.02, 0.05, 0.075], rx: 0.002, ry: 0.002 }, { p: [s * 0.028, 0.045, 0.095], rx: 0.0018, ry: 0.0018 }], { seg: 3, sub: 1 }), d));
  _antGeo = mergeGeometries(parts);
  // scale to 0.15 length
  _antGeo.computeBoundingBox(); const len = _antGeo.boundingBox.max.z - _antGeo.boundingBox.min.z;
  _antGeo.scale(0.15 / len, 0.15 / len, 0.15 / len);
  _antGeo.computeBoundingSphere();
  return _antGeo;
}
function leafGeometry() {
  if (_leafGeo) return _leafGeo;
  // irregular leaf fragment (half-moon cut), held upright like a sail over the head
  const st = [{ s: 0, l: 0.0, t: 0.0 }, { s: 0.03, l: 0.045, t: -0.035 }, { s: 0.07, l: 0.055, t: -0.05 }, { s: 0.1, l: 0.03, t: -0.04 }, { s: 0.115, l: 0.0, t: -0.01 }];
  const g = plate(st, { map: (s, c, h) => [h, s, c], cs: 2, single: true, top: (u, v) => mixc('#7fd04a', '#4caa2a', v), bot: () => '#5ab832' });
  _leafGeo = g;
  return g;
}
function moundGeometry(v) {
  if (_moundGeo.has(v)) return _moundGeo.get(v);
  const rng = makeRng(1500 + v);
  const soil = col('#7a4a2a'), pale = col('#a8744a'), dark = col('#1a0e08');
  const R = 1.3, H = 0.42;
  const g = new THREE.CircleGeometry(1, 28, 0, TAU).toNonIndexed();
  // build dome from a lathe profile with noise
  const prof = []; for (let i = 0; i <= 7; i++) { const k = i / 7; prof.push(new THREE.Vector2(Math.max(0.001, R * Math.sin(k * PI / 2) * (1 + 0.15 * (1 - k))), H * Math.cos(k * PI / 2) - (k > 0.95 ? 0.03 : 0))); }
  let dome = new THREE.LatheGeometry(prof.reverse(), 22);
  dome = dome.toNonIndexed(); dome.deleteAttribute('uv');
  const p = dome.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const n = Math.sin(x * 4.1 + v) * Math.cos(z * 3.7) * 0.06 + Math.sin(x * 9 + z * 7) * 0.02;
    p.setY(i, Math.max(0, y + (y > 0.02 ? n : 0)));
  }
  dome.computeVertexNormals();
  g.dispose();
  const entrances = [];
  const holes = [[0.15, 0.36, 0.05], [0.55, 0.2, 0.8], [-0.4, 0.28, -0.6], [0.0, 0.3, -0.35], [-0.65, 0.16, 0.5]];
  for (const [x, y, z] of holes) {
    const rim = solid(xf(new THREE.TorusGeometry(0.07, 0.035, 4, 8).toNonIndexed(), [x, y + 0.02, z], [-PI / 2, 0, 0]), pale); rim.deleteAttribute('uv');
    entrances.push(rim, solid(xf(ball(0.06, 0.02, 0.06, 6, 3), [x, y + 0.035, z]), dark));
  }
  // excavated soil crumbs around the mound
  const crumbs = [];
  for (let i = 0; i < 26; i++) { const a = rng() * TAU, r = R * (0.9 + rng() * 0.45); crumbs.push(solid(ball(0.05 + rng() * 0.05, 0.03 + rng() * 0.02, 0.05 + rng() * 0.05, 5, 3, [Math.cos(a) * r, 0.01, Math.sin(a) * r]), jl(pale, rng, 0.15))); }
  const domeC = paintFaces(dome, (i) => jl(mixc(soil, pale, clamp(i.y / H * 0.9 + 0.1)), rng, 0.12));
  const out = mergeGeometries([domeC, ...entrances, ...crumbs]);
  _moundGeo.set(v, out);
  return out;
}

ANIM.leafcutter = (opts = {}) => {
  const seed = opts.seed || 1, v = seed % 3, rng = makeRng(seed * 13 + 5);
  const object = new THREE.Group(); object.name = 'amazon-leafcutter';
  const mound = new THREE.Mesh(moundGeometry(v), mat('matte'));
  mound.castShadow = mound.receiveShadow = true;
  object.add(mound);
  const N = 120, N_LOW = 36;   // ants on the trail at full activity (N_LOW on min/low quality)
  const ants = new THREE.InstancedMesh(antGeometry(), mat('satin'), N);
  const leaves = new THREE.InstancedMesh(leafGeometry(), mat('membrane'), N);
  // ants are a few mm on screen: their shadows are invisible but would double the (large) instanced triangle count
  ants.castShadow = false; leaves.castShadow = false; ants.receiveShadow = true;
  ants.frustumCulled = false; leaves.frustumCulled = false;
  ants.instanceMatrix.setUsage(THREE.DynamicDrawUsage); leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const leafCol = new THREE.Color(), leafCols = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { leafCol.setHSL(0.24 + rng() * 0.08, 0.55 + rng() * 0.2, 0.38 + rng() * 0.18); leaves.setColorAt(i, leafCol); leafCol.toArray(leafCols, i * 3); }
  ants.count = 0; leaves.count = 0;   // only the instances written this frame are drawn (see update)
  object.add(ants, leaves);
  const per = []; for (let i = 0; i < N; i++) per.push({ u: i / N + (rng() - 0.5) * 0.4 / N, sp: 0.85 + rng() * 0.3, lane: (rng() - 0.5) * 0.05, wob: rng() * TAU, leaf: 0.7 + rng() * 0.6 });
  // trail in local space (cumulative lengths)
  let pts = [], cum = [], total = 1;
  const worldPts = [];
  const lastMat = new THREE.Matrix4();
  function rebuild() {
    object.updateWorldMatrix(true, false);
    lastMat.copy(object.matrixWorld);
    const inv = new THREE.Matrix4().copy(object.matrixWorld).invert();
    pts = worldPts.length >= 2 ? worldPts.map((p) => p.clone().applyMatrix4(inv)) : defaultTrail();
    cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    total = Math.max(0.01, cum[cum.length - 1]);
  }
  function defaultTrail() {
    const out = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * PI * 1.2 + 0.4; const r = 1.5 + i * 0.12; out.push(new V3(Math.cos(a) * r, 0.02, Math.sin(a) * r)); }
    out.unshift(new V3(0.55, 0.2, 0.8)); return out;
  }
  rebuild();
  const P = new V3(), D = new V3(), side = new V3(), up = new V3(0, 1, 0), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), zero = new V3(0, 0, 0), e = new THREE.Euler();
  const lq = new THREE.Quaternion(), le = new THREE.Euler(), hp = new V3();
  function sample(d, out, dir) {
    d = clamp(d, 0, total);
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1, k = (d - cum[i - 1]) / seg;
    out.lerpVectors(a, b, k); dir.subVectors(b, a).normalize();
  }
  let time = 0;
  const speed = 0.35;
  const yAxis = new V3(0, 1, 0);
  return {
    type: 'colony', id: 'leafcutter', object, height: 0.45, length: 2.6,
    setTrail(pointsWorld) { worldPts.length = 0; for (const p of pointsWorld || []) worldPts.push(new V3(p.x, p.y, p.z)); rebuild(); },
    update(dt, s = {}) {
      dt = Math.min(dt || 0, 0.1); time += dt;
      object.updateWorldMatrix(true, false);
      if (worldPts.length >= 2 && !object.matrixWorld.equals(lastMat)) rebuild();
      const act = clamp(s.activity ?? 1);
      const cap = isLowQuality() ? N_LOW : N;
      const visible = Math.round(cap * (0.08 + 0.92 * act));
      const loop = total * 2;
      const lc = leaves.instanceColor.array;
      let nLeaf = 0;
      // instances are packed: slot j = j-th visible ant, leaves packed separately (count = what's actually drawn).
      // With a reduced cap, ants are taken with an even stride so the trail stays evenly filled.
      for (let j = 0; j < visible; j++) {
        const i = cap < N ? Math.floor(j * N / cap) : j;
        const a = per[i];
        const pos = ((a.u * loop + time * speed * a.sp) % loop + loop) % loop;
        const outbound = pos < total;
        const d = outbound ? pos : loop - pos;
        sample(d, P, D);
        if (!outbound) D.negate();
        side.crossVectors(up, D).normalize();
        const laneOff = (outbound ? -0.07 : 0.07) + a.lane;
        P.addScaledVector(side, laneOff);
        // disappear into the nest entrance at the start of the trail
        const fade = smoothstep(0.0, 0.25, d) * (1 - smoothstep(total - 0.05, total, d) * 0.0);
        const wob = Math.sin(time * 14 + a.wob) * 0.12;
        const yaw = Math.atan2(D.x, D.z) + wob;
        const pitch = -Math.asin(clamp(D.y, -1, 1));
        e.set(pitch, yaw, 0, 'YXZ'); q.setFromEuler(e);
        sc.setScalar(fade);
        P.y += Math.abs(Math.sin(time * 18 + a.wob)) * 0.004;
        m4.compose(P, q, sc); ants.setMatrixAt(j, m4);
        if (!outbound) {
          // leaf held in mandibles, raised above the head, swaying slightly
          lq.setFromEuler(le.set(pitch - 0.25 + Math.sin(time * 6 + a.wob) * 0.08, yaw + PI / 2, 0, 'YXZ'));
          hp.set(0, 0.035, 0.05).applyQuaternion(q).add(P);
          sc.setScalar(fade * a.leaf * 1.4);
          m4.compose(hp, lq, sc); leaves.setMatrixAt(nLeaf, m4);
          lc[nLeaf * 3] = leafCols[i * 3]; lc[nLeaf * 3 + 1] = leafCols[i * 3 + 1]; lc[nLeaf * 3 + 2] = leafCols[i * 3 + 2];   // colour follows the ant
          nLeaf++;
        }
      }
      ants.count = visible; leaves.count = nLeaf;
      ants.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true; leaves.instanceColor.needsUpdate = true;
    },
    dispose() { if (object.parent) object.parent.remove(object); ants.dispose(); leaves.dispose(); },
  };
};

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() {
  disposeDeep([_specCache, _antGeo, _leafGeo, _moundGeo]); _specCache.clear(); _moundGeo.clear(); _antGeo = null; _leafGeo = null;
  releaseMaterials('amzA:');
}
