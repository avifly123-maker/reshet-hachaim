// Amazon plants: the visual factory (moved unchanged from amazon-plants.js).
// makeVisual(spec, opts) turns a cached species variant into a PlantVisual (CONTRACT.md §3) driven by the uniforms of
// one per-instance material; CACHE / cached keep the geometry per species + variant (CACHE is cleared by
// releaseCaches in index.js); variantOf, vrng, finGeo, addClumps are shared by the species builders.
// Needs: kit.js.
import * as THREE from 'three';
import { makeRng, hashString, clamp, lerp, smoothstep, jitterColor } from '../../core/util.js';
import { V3, TAU, makePlantMaterials, M, hash3, blob } from './kit.js';

// ───────────────────────────── visual factory ─────────────────────────────
export const CACHE = new Map();
export function cached(key, build) { if (!CACHE.has(key)) CACHE.set(key, build()); return CACHE.get(key); }

// spec: { geo, seedGeo?, look, H, cb (trunk stretch limit), crown:{top,bottom,radius,density}, attach, perch, trunkR,
//         grow(g) → { s, sxz?, stretch?, late?, seed? (0..1 seedling scale or null) , leaf? },
//         sway (top displacement factor), onUpdate?, onGrowth? }
export function makeVisual(spec, opts) {
  const rng = opts.rng || makeRng(opts.seed || 1);
  const { mat, depth, u } = makePlantMaterials({ ...spec.look, H: spec.H });
  const object = new THREE.Group(); object.name = spec.name || 'plant';
  const body = new THREE.Group(); object.add(body);
  const yaw = rng() * TAU, jit = spec.noJitter ? 1 : 0.92 + rng() * 0.16;
  body.rotation.y = yaw;
  const main = new THREE.Mesh(spec.geo, mat); main.customDepthMaterial = depth;
  main.castShadow = main.receiveShadow = true; body.add(main);
  let seed = null;
  if (spec.seedGeo) { seed = new THREE.Mesh(spec.seedGeo, mat); seed.customDepthMaterial = depth; seed.castShadow = seed.receiveShadow = true; seed.visible = false; object.add(seed); seed.rotation.y = yaw; }
  if (spec.extra) for (const m of spec.extra(mat, depth, u, body)) { m.castShadow = m.receiveShadow = true; }
  const st = { g: 1, h: 1, gs: { s: 1, sxz: 1, stretch: 1, late: 1, seed: null, leaf: 1 }, phase: rng() * 10 };
  const cb = spec.cb ?? 0;
  const mapPt = (p) => {
    const q = p.clone();
    q.y = q.y < cb ? q.y * st.gs.stretch : q.y + (st.gs.stretch - 1) * cb;
    body.updateMatrix(); return q.applyMatrix4(body.matrix);
  };
  function applyGrowth() {
    const gs = { s: 1, sxz: null, stretch: 1, late: 1, seed: null, leaf: 1, ...(spec.grow ? spec.grow(st.g) : {}) };
    st.gs = gs;
    const sxz = (gs.sxz ?? gs.s) * jit, sy = gs.s * jit;
    body.scale.set(sxz, sy, sxz);
    u.uStretch.value = gs.stretch; u.uLate.value = gs.late;
    main.visible = gs.seed == null || gs.both === true;
    if (seed) { seed.visible = gs.seed != null; if (seed.visible) seed.scale.setScalar(gs.seed * jit); }
    applyHealth();
    spec.onGrowth && spec.onGrowth(st.g, gs, u);
  }
  function applyHealth() {
    const h = st.h;
    u.uHealth.value = h;
    u.uLeafShow.value = Math.min(st.gs.leaf ?? 1, lerp(0.3, 1.0001, smoothstep(0, 0.85, h)));
    u.uDroop.value = (1 - h) * (spec.droop ?? 0.5);
  }
  const visual = {
    object,
    trunkRadius: (spec.trunkR || 0.05) * jit,
    setGrowth(g) { st.g = clamp(g); applyGrowth(); },
    setHealth(h) { st.h = clamp(h); applyHealth(); },
    setSeason() {},
    setBloom(b) { u.uBloom.value = clamp(b); },
    setFruit(f) { u.uFruit.value = clamp(f); },
    setNightGlow(n) { if (spec.glow) u.uGlow.value = clamp(n) * spec.glow; spec.onGlow && spec.onGlow(n); },
    update(dt, t, wind = 0) {
      u.uTime.value = t;
      const sw = spec.sway ?? 0.01; const w = clamp(wind);
      const a = (0.25 + w) * sw;
      const ph = t * (0.55 + 0.6 * w) + st.phase;
      // wind blows roughly along world +X; express in body-local frame
      const bx = a * (0.6 + 0.4 * Math.sin(ph)) * (0.3 + w) + a * 0.35 * Math.sin(ph * 2.3);
      const bz = a * 0.45 * Math.sin(ph * 1.7 + 1.3);
      const c = Math.cos(-yaw), s = Math.sin(-yaw);
      u.uBend.value.set(bx * c - bz * s, bx * s + bz * c);
      u.uFlutter.value = 0.15 + 0.85 * w;
      spec.onUpdate && spec.onUpdate(dt, t, w, u, body, st);
    },
    crown() {
      if (spec.crownFn) return spec.crownFn(st, u);
      if (st.gs.seed != null && !(st.gs.both)) {
        const c = spec.seedCrown || { top: 1.6, bottom: 0.6, radius: 0.5, density: 0.3 };
        const k = st.gs.seed * jit;
        return { top: c.top * k, bottom: c.bottom * k, radius: c.radius * k, density: c.density };
      }
      const c = spec.crown;
      const top = mapPt(new V3(0, c.top, 0)).y, bottom = mapPt(new V3(0, c.bottom, 0)).y;
      const leafFrac = clamp(u.uLeafShow.value);
      return { top, bottom, radius: c.radius * (st.gs.sxz ?? st.gs.s) * jit, density: c.density * (0.35 + 0.65 * leafFrac) * (spec.crownDensityG ? spec.crownDensityG(st.g) : 1) };
    },
    attachPoints() {
      if (!spec.attach || (st.gs.seed != null && !st.gs.both)) return [];
      const rot = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), yaw);
      return spec.attach.filter(a => (a.minG ?? 0) <= st.g).map(a => ({ pos: mapPt(a.pos), normal: a.normal.clone().applyQuaternion(rot) }));
    },
    perchPoints() {
      if (!spec.perch || (st.gs.seed != null && !st.gs.both)) return [];
      return spec.perch.filter(p => (p.minG ?? 0) <= st.g).map(p => mapPt(p.pos || p));
    },
    fall(p) { u.uDroop.value = Math.max(u.uDroop.value, p * 0.4); },
    dispose() {
      mat.dispose(); depth.dispose(); // geometry is shared per species variant – kept in cache
      spec.onDispose && spec.onDispose();
      object.removeFromParent();
    },
    _u: u, _mat: mat,
  };
  applyGrowth();
  return visual;
}
export const variantOf = (opts) => ((opts.seed >>> 0) || 0) % 3;
export const vrng = (name, v) => makeRng(hashString(name) + v * 7919 + 13);

// Plank buttress fin along +X from the trunk: concave top edge, thin, slightly sinuous.
export function finGeo(len, h, thick, r0, rng) {
  const n = 6, pos = [];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const x = lerp(r0 * 0.6, len, t);
    const y = h * Math.pow(1 - t, 1.9) + 0.05;
    const z = Math.sin(t * 3.2 + rng() * 0.5) * 0.18 * len * 0.15;
    const th = thick * (1 - 0.75 * t);
    pts.push({ x, y, z, th });
  }
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < n; i++) {
    const A = pts[i], B = pts[i + 1];
    for (const sd of [-1, 1]) {
      const a = [A.x, -0.15, A.z + sd * A.th], b = [B.x, -0.15, B.z + sd * B.th], c = [B.x, B.y, B.z + sd * B.th * 0.5], d = [A.x, A.y, A.z + sd * A.th * 0.5];
      if (sd > 0) quad(a, b, c, d); else quad(a, d, c, b);
    }
    quad([A.x, A.y, A.z + A.th * 0.5], [B.x, B.y, B.z + B.th * 0.5], [B.x, B.y, B.z - B.th * 0.5], [A.x, A.y, A.z - A.th * 0.5]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

// Foliage clump set: list of {p, r, sy} → each clump = a cluster of small lumpy sub-blobs + a fringe of leaf
// triangles, all with normals pointing out from the clump centre (soft, puffy stylised shading) and a
// sun-lit colour gradient (bright warm tops, deep cool undersides).
const _subBlob = [];
function subBlob(i) { if (!_subBlob[i]) _subBlob[i] = blob(1, 0, 0.35, 1, i * 7.3); return _subBlob[i]; }
export function addClumps(gb, rng, clumps, { top, bottom, subs = 5, fringe = 8, spread = 0.1, fringeCol = null }) {
  const tc0 = new THREE.Color(top), bc = new THREE.Color(bottom);
  clumps.forEach((c) => {
    const tc = jitterColor(tc0, rng, 0.02, 0.06, 0.05);
    const sy = c.sy ?? 0.6, rank = c.rank ?? (0.05 + rng() * 0.95);
    const colFn = (col, p, n) => {
      const ry = (p.y - c.p.y) / (c.r * sy);
      const k = clamp(0.45 + 0.4 * n.y + 0.25 * ry + (hash3(p.x * 0.9, p.y * 1.3, p.z * 0.7) - 0.5) * spread * 4);
      col.copy(bc).lerp(tc, k);
    };
    const n = c.subs ?? subs;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng() * 0.8;
      const rr = i === 0 ? 0 : c.r * rng.range(0.38, 0.55);
      const q = c.p.clone().add(new V3(Math.cos(a) * rr, (i === 0 ? 0.15 : rng.range(-0.25, 0.3)) * c.r * sy, Math.sin(a) * rr));
      const br = c.r * (i === 0 ? 0.62 : rng.range(0.45, 0.58));
      const m = M().compose(q, new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 0.5, rng() * TAU, 0)), new V3(br, br * Math.min(1, sy * 1.25), br));
      gb.add(subBlob(i % 4), { m, colFn, leaf: 2, rank: Math.min(0.99, rank + i * 0.01), centre: q, outC: c.p, outK: 0.7, flutter: 0.3 });
    }
    // leaf fringe: little triangles poking out of the surface, breaking the silhouette
    const fpos = [];
    const nf = c.fringe ?? fringe;
    for (let i = 0; i < nf; i++) {
      const d = new V3(rng.range(-1, 1), rng.range(-0.55, 1), rng.range(-1, 1)).normalize();
      const base = c.p.clone().add(new V3(d.x * c.r * 0.82, d.y * c.r * sy * 0.82, d.z * c.r * 0.82));
      const t = new V3().crossVectors(d, new V3(0, 1, 0)); if (t.lengthSq() < 0.01) t.set(1, 0, 0); t.normalize();
      const L = c.r * rng.range(0.22, 0.3), W = L * 0.5;
      const dd = d.clone().add(new V3(0, -0.35, 0)).normalize();
      const tip = base.clone().addScaledVector(dd, L), mid = base.clone().addScaledVector(dd, L * 0.45);
      const l = mid.clone().addScaledVector(t, W), r = mid.clone().addScaledVector(t, -W);
      fpos.push(...base.toArray(), ...l.toArray(), ...tip.toArray(), ...base.toArray(), ...tip.toArray(), ...r.toArray());
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fg.computeVertexNormals();
    gb.add(fg, { colFn: fringeCol ? (col, p, nn) => { colFn(col, p, nn); col.lerp(new THREE.Color(fringeCol), 0.25); } : colFn, leaf: 2, rank, centre: c.p, outC: c.p, outK: 0.85, flutter: 1 });
  });
}
