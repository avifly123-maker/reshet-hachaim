// Amazon plants: the understory, the epiphytes and the forest floor (moved unchanged from amazon-plants.js).
// Exports heliconia, bromeliad, orchid, liana, fern, glowfungus, waterlily: each (opts) => PlantVisual.
// Needs: kit.js, visual.js.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, jitterColor } from '../../core/util.js';
import { V3, TAU, GB, M, orient, place, sweep, curveOf, leafBlade, hash3, blob, bead, octa, starFlower, trunkGeo, barkCol, leafCol } from './kit.js';
import { cached, makeVisual, variantOf, vrng } from './visual.js';

// ═════════════════════════════ HELICONIA (lobster-claw) ═════════════════════════════
function addHeliInflo(gb, rng, base, dir, { hanging, n = 7, size = 0.24, red = '#e0262f', tip = '#ffd23a', rank = 0 }) {
  // zig-zag rachis with alternating boat-shaped bracts
  let p = base.clone(); const d = dir.clone().normalize();
  const side = new V3().crossVectors(d, new V3(0, 1, 0)); if (side.lengthSq() < 0.01) side.set(1, 0, 0); side.normalize();
  const r = new THREE.Color(red), y = new THREE.Color(tip), g = new THREE.Color('#5c9a3a');
  for (let i = 0; i < n; i++) {
    const s = size * (1 - i * 0.07); const sd = i % 2 ? 1 : -1;
    const next = p.clone().addScaledVector(d, s * 0.62).addScaledVector(side, sd * s * 0.12);
    gb.add(new THREE.CylinderGeometry(0.018, 0.02, 1, 3).translate(0, 0.5, 0), { m: orient(p, next.clone().sub(p), 0, new V3(1, p.distanceTo(next), 1)), col: hanging ? '#b0281c' : '#9a2418', reveal: 1, centre: base, rank: rank + i * 0.06 });
    // bract: a flattened cone opening upward (hanging) / outward
    const bd = side.clone().multiplyScalar(sd).addScaledVector(d, hanging ? -0.15 : 0.35).add(new V3(0, hanging ? 0.75 : 0.15, 0)).normalize();
    const cone = new THREE.ConeGeometry(s * 0.34, s * 1.7, 5, 3, true).rotateX(Math.PI).translate(0, s * 0.8, 0).scale(1, 1, 0.45);
    gb.add(cone, { m: orient(next, bd, Math.atan2(d.x, d.z)), colLocal: true, colFn: (c, lp) => { const k = clamp(lp.y / (s * 1.6)); c.copy(r).lerp(y, smoothstep(0.85, 1.0, k) * 0.85); }, reveal: 1, centre: next, rank: rank + i * 0.06 });
    p = next;
  }
}
function buildHeliconia(v) {
  const rng = vrng('heliconia', v);
  const gb = new GB(rng); const H = 2.6;
  const ns = 6;
  const tops = [];
  for (let i = 0; i < ns; i++) {
    const a = (i / ns) * TAU + rng.range(-0.3, 0.3); const off = rng.range(0.1, 0.35);
    const b = new V3(Math.cos(a) * off, 0, Math.sin(a) * off);
    const h = rng.range(0.8, 1.35);
    const top = b.clone().add(new V3(Math.cos(a) * 0.3, h, Math.sin(a) * 0.3));
    // pseudostem / petiole
    gb.add(trunkGeo(curveOf([b, b.clone().lerp(top, 0.5), top]), { r0: 0.04, r1: 0.022, segs: 3, radial: 4, flare: 0.3, noise: 0 }), { col: '#4f7d2f', cj: [0.02, 0.05, 0.05], leaf: 1, flutter: 0.2, rank: i / ns, centre: b });
    // paddle leaf, slightly torn & tilted outward
    const L = rng.range(1.15, 1.5);
    gb.add(leafBlade(L, L * 0.38, { segs: 5, bend: 0.22, fold: 0.1, shape: 'paddle' }), { m: place(top, Math.atan2(Math.cos(a), Math.sin(a)) + rng.range(-0.3, 0.3), -rng.range(0.35, 0.7), rng.range(-0.25, 0.25)), colFn: leafCol('#3f8a32', rng, { tip: '#77b04a' }), leaf: 1, rank: i / ns, centre: top });
    tops.push({ b, a });
  }
  // inflorescences
  const hanging = v !== 1;
  for (let k = 0; k < 4; k++) {
    const t = tops[(k * 2 + (k > 2 ? 1 : 0)) % ns]; const a = t.a + 0.6;
    const base = t.b.clone().add(new V3(Math.cos(a) * 0.12, hanging ? rng.range(1.5, 1.9) : rng.range(0.8, 1.1), Math.sin(a) * 0.12));
    gb.add(new THREE.CylinderGeometry(0.02, 0.025, 1, 4).translate(0, 0.5, 0), { m: orient(t.b, base.clone().sub(t.b), 0, new V3(1, t.b.distanceTo(base), 1)), col: '#5a8a34', reveal: 1, centre: t.b, rank: k * 0.15 });
    const dir = hanging ? new V3(Math.cos(a) * 0.15, -1, Math.sin(a) * 0.15) : new V3(Math.cos(a) * 0.2, 1, Math.sin(a) * 0.2);
    addHeliInflo(gb, rng, base, dir, { hanging, n: hanging ? 8 : 7, size: hanging ? 0.2 : 0.22, red: v === 2 ? '#c4180f' : '#b80a1c', tip: v === 1 ? '#e8b010' : '#f0c020', rank: k * 0.15 });
  }
  return { geo: gb.build(), tris: gb.tris, H };
}
export function heliconia(opts) {
  const v = variantOf(opts);
  const d = cached('heliconia' + v, () => buildHeliconia(v));
  return makeVisual({
    name: 'heliconia', geo: d.geo, H: d.H, trunkR: 0.2, sway: 0.03, droop: 0.7,
    crown: { top: 2.5, bottom: 0.6, radius: 1.3, density: 0.4 },
    grow(g) { const s = lerp(0.25, 1, Math.pow(g, 0.8)); return { s, sxz: s * lerp(1.15, 1, g) }; },
  }, opts);
}

// ═════════════════════════════ BROMELIAD (tank bromeliad) ═════════════════════════════
function buildBromeliad(v) {
  const rng = vrng('bromeliad', v);
  const gb = new GB(rng); const H = 0.9;
  const leafColors = ['#3d7530', '#577a26', '#2f6a3c'];
  const blushC = new THREE.Color(['#c2384f', '#d0473a', '#b3346a'][v]);
  const rings = [{ n: 7, len: 0.62, tilt: 0.95, y: 0.06 }, { n: 6, len: 0.55, tilt: 0.55, y: 0.1 }, { n: 5, len: 0.42, tilt: 0.28, y: 0.14 }];
  let rk = 0;
  rings.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const a = (i / r.n) * TAU + ri * 0.45 + rng.range(-0.1, 0.1);
      const g = leafBlade(r.len * rng.range(0.9, 1.1), 0.16, { segs: 4, bend: ri === 0 ? 0.55 : 0.28, fold: 0.45, shape: 'strap' });
      const base = new V3(Math.cos(a) * 0.05, r.y, Math.sin(a) * 0.05);
      const lc = jitterColor(leafColors[v], rng, 0.02, 0.06, 0.05);
      gb.add(g, { m: place(base, Math.atan2(Math.cos(a), Math.sin(a)), -(Math.PI / 2 - r.tilt), 0), colLocal: true,
        colFn: (c, lp) => { const k = clamp(lp.z / r.len); c.copy(lc); if (ri === 2) c.lerp(blushC, (1 - k) * 0.8); else c.lerp(new THREE.Color('#d7d29a'), (1 - k) * 0.25); },
        leaf: 1, rank: rk, centre: base, flutter: 0.3 });
      rk += 0.05;
    }
  });
  // central red bracts (bloom) + water tank disc
  const tank = new THREE.CircleGeometry(0.075, 7).rotateX(-Math.PI / 2).translate(0, 0.2, 0);
  gb.add(tank, { col: '#7fb3c9' });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.2; const base = new V3(Math.cos(a) * 0.04, 0.14, Math.sin(a) * 0.04);
    gb.add(leafBlade(0.42, 0.14, { segs: 5, bend: 0.25, fold: 0.4, shape: 'lance' }), { m: place(base, Math.atan2(Math.cos(a), Math.sin(a)), -0.9, 0), col: '#f0304a', cj: [0.02, 0.05, 0.06], reveal: 1, centre: new V3(0, 0.2, 0), rank: i / 7 });
  }
  for (let i = 0; i < 5; i++) { const a = rng() * TAU; const q = new V3(Math.cos(a) * 0.035, 0.25 + rng() * 0.08, Math.sin(a) * 0.035); gb.add(octa(0.03, 1.8), { m: M().setPosition(q), col: '#7a3db8', reveal: 1, centre: new V3(0, 0.2, 0), rank: 0.5 + i * 0.1 }); }
  // tiny holdfast roots
  for (let i = 0; i < 4; i++) { const a = i * 1.6; gb.add(new THREE.CylinderGeometry(0.008, 0.012, 0.18, 3).translate(0, -0.09, 0), { m: orient(new V3(0, 0.03, 0), new V3(Math.cos(a), -1.2, Math.sin(a)), 0), col: '#7a6a4a' }); }
  return { geo: gb.build(), tris: gb.tris, H };
}
export function bromeliad(opts) {
  const v = variantOf(opts);
  const d = cached('bromeliad' + v, () => buildBromeliad(v));
  return makeVisual({
    name: 'bromeliad', geo: d.geo, H: 0.9, trunkR: 0.06, sway: 0.01, droop: 0.4, noJitter: false,
    crown: { top: 0.75, bottom: 0.05, radius: 0.5, density: 0.2 },
    grow(g) { const s = lerp(0.35, 1.25, Math.pow(g, 0.9)); return { s }; },
  }, opts);
}

// ═════════════════════════════ ORCHID (epiphytic) ═════════════════════════════
function orchidFlower(r) {
  // 5 soft tepals + a ruffled lip (labellum), each a small curved grid with smooth normals — built facing +Z
  const P = [], I = [];
  const sheet = (ang, L, W, cup, curl, lip = false) => {
    const NU = 5, NV = 4, o = P.length / 3, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, w = W * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * u)), lip ? 0.5 : 0.75) + W * 0.05;
      for (let j = 0; j <= NV; j++) {
        const v = j / NV * 2 - 1;
        const along = L * u, across = w * v;
        const z = cup * W * v * v + curl * L * u * u + (lip ? 0.06 * r * Math.sin(v * 9 + u * 5) * u : 0) + 0.015 * r;
        P.push(ca * along - sa * across, sa * along + ca * across, z);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = o + i * (NV + 1) + j, b = a + NV + 1; I.push(a, b, b + 1, a, b + 1, a + 1);
    }
  };
  for (let i = 0; i < 5; i++) {
    const wide = i % 2 === 1;
    sheet(Math.PI / 2 + (i - 2) * 1.05, r * (wide ? 1 : 0.9), r * (wide ? 0.46 : 0.24), 0.25, 0.12);
  }
  sheet(-Math.PI / 2, r * 0.85, r * 0.42, 0.55, 0.35, true);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  g.computeVertexNormals();
  return g.toNonIndexed();
}
function buildOrchid(v) {
  const rng = vrng('orchid', v);
  const gb = new GB(rng); const H = 0.6;
  // pseudobulbs + thick strap leaves
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + rng() * 0.4; const b = new V3(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05);
    gb.add(bead(0.045, 1.6, 0), { m: M().setPosition(b.clone().add(new V3(0, 0.06, 0))), col: '#7a9a45', cj: [0.02, 0.05, 0.05] });
    for (let k = 0; k < 2; k++) {
      const la = a + (k - 0.5) * 0.7; const base = b.clone().add(new V3(0, 0.12, 0));
      gb.add(leafBlade(rng.range(0.3, 0.38), 0.09, { segs: 3, bend: 0.35, fold: 0.3, shape: 'strap' }), { m: place(base, Math.atan2(Math.cos(la), Math.sin(la)), -rng.range(0.5, 0.9), 0), colFn: leafCol('#3f7d34', rng), leaf: 1, rank: (i * 2 + k) / 6, centre: base, flutter: 0.4 });
    }
  }
  // aerial roots (silvery velamen)
  for (let i = 0; i < 6; i++) {
    const a = rng() * TAU; const p0 = new V3(0, 0.03, 0);
    const p1 = new V3(Math.cos(a) * 0.12, -0.03, Math.sin(a) * 0.12), p2 = new V3(Math.cos(a) * 0.2, -rng.range(0.06, 0.18), Math.sin(a) * 0.2);
    gb.add(trunkGeo(curveOf([p0, p1, p2]), { r0: 0.009, r1: 0.006, segs: 3, radial: 3, flare: 0, noise: 0, cap: false }), { col: '#cfd3c2' });
  }
  // arching flower spray
  const fc = [['#f7f2f7', '#d4387f'], ['#d23a9a', '#f6d34a'], ['#f2f0ea', '#c9459b']][v];
  const a = rng() * TAU; const d = new V3(Math.cos(a), 0, Math.sin(a));
  const sp = curveOf([new V3(0, 0.1, 0), d.clone().multiplyScalar(0.15).add(new V3(0, 0.42, 0)), d.clone().multiplyScalar(0.38).add(new V3(0, 0.52, 0)), d.clone().multiplyScalar(0.55).add(new V3(0, 0.38, 0))]);
  gb.add(trunkGeo(sp, { r0: 0.007, r1: 0.005, segs: 5, radial: 3, flare: 0, noise: 0, cap: false }), { col: '#5d6b34' });
  for (let i = 0; i < 8; i++) {
    const t = 0.3 + i * 0.095; const q = sp.getPointAt(Math.min(1, t)).add(new V3(0, -0.03, 0));
    const fr = 0.095 * (1 - i * 0.045);
    const yaw = Math.atan2(d.x, d.z) + (i % 2 ? 0.9 : -0.9);
    gb.add(orchidFlower(fr), { m: place(q, yaw, 0.15, 0), colLocal: true, colFn: (c, lp) => { const rr = Math.hypot(lp.x, lp.y) / fr; if (lp.y < -fr * 0.2) c.set(fc[1]).multiplyScalar(0.85 + 0.25 * rr); else c.set(fc[0]).lerp(new THREE.Color(fc[1]), 0.35 * Math.max(0, 1 - rr * 1.6)); }, reveal: 1, centre: q, rank: i / 8 });
  }
  return { geo: gb.build(), tris: gb.tris, H };
}
export function orchid(opts) {
  const v = variantOf(opts);
  const d = cached('orchid' + v, () => buildOrchid(v));
  return makeVisual({
    name: 'orchid', geo: d.geo, H: 0.6, trunkR: 0.05, sway: 0.02, droop: 0.4,
    crown: { top: 0.5, bottom: 0.0, radius: 0.35, density: 0.1 },
    grow(g) { return { s: lerp(0.35, 1.2, Math.pow(g, 0.9)) }; },
  }, opts);
}

// ═════════════════════════════ LIANA (woody vine on a host) ═════════════════════════════
function buildLiana(v, hh, hr) {
  const rng = vrng('liana', v + hh * 31 + hr * 7);
  const gb = new GB(rng);
  const turns = Math.max(1.5, hh / 7) * (v === 1 ? 0.8 : 1);
  const a0 = rng() * TAU, n = Math.ceil(hh * 1.6);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const a = a0 + turns * TAU * t;
    const r = hr * (1 + 0.4 * Math.pow(1 - t, 6)) * lerp(1, 0.6, t) + 0.14 + (i === 0 ? 0.5 : 0) + 0.04 * Math.sin(i * 1.7);
    pts.push(new V3(Math.cos(a) * r, -0.15 + t * (hh - 0.6), Math.sin(a) * r));
  }
  // final leap outward into the light
  const last = pts[pts.length - 1]; const la = a0 + turns * TAU;
  const out = new V3(Math.cos(la), 0, Math.sin(la));
  pts.push(last.clone().addScaledVector(out, 1.4).add(new V3(0, 1.2, 0)));
  const vc = curveOf(pts);
  gb.add(sweep(vc, Math.min(120, n * 2), 5, (t, a) => lerp(0.16, 0.06, t) * (1 + 0.25 * Math.sin(t * 60 + a * 2)), true), { colFn: barkCol('#6a5a3c', '#3e3424', rng, 0.4) });
  // a second, thinner twining stem
  const pts2 = pts.slice(0, Math.floor(pts.length * 0.75)).map((p, i) => { const q = p.clone(); const a = Math.atan2(p.z, p.x) + 0.35; const r = Math.hypot(p.x, p.z) + 0.04; q.x = Math.cos(a) * r; q.z = Math.sin(a) * r; return q; });
  if (pts2.length > 3) gb.add(sweep(curveOf(pts2), Math.min(60, pts2.length), 3, (t) => lerp(0.04, 0.02, t)), { col: '#5b5236' });
  // heart-shaped leaves along the vine (sparser low, denser high)
  const leafN = Math.min(80, Math.floor(hh * 2.4));
  for (let i = 0; i < leafN; i++) {
    const t = Math.pow((i + rng()) / leafN, 0.8) * 0.97;
    const p = vc.getPointAt(t); const rad = new V3(p.x, 0, p.z).normalize();
    const yaw = Math.atan2(rad.x, rad.z) + rng.range(-0.8, 0.8);
    const L = rng.range(0.5, 0.75) * (0.8 + 0.4 * t);
    gb.add(leafBlade(L, L * 0.75, { segs: 2, bend: 0.3, fold: 0.15 }), { m: place(p, yaw, -rng.range(0.1, 0.7), 0), colFn: leafCol(t > 0.7 ? '#4e9a38' : '#3e7d32', rng), leaf: 1, rank: rng() * 0.9 + 0.05, centre: p });
  }
  // the burst at the top: a crowd of leaves + some flowers
  const top = vc.getPointAt(1);
  const burst = [];
  for (let i = 0; i < 30; i++) {
    const d = new V3(rng.range(-1, 1), rng.range(-0.3, 1), rng.range(-1, 1)).normalize();
    const p = top.clone().addScaledVector(d, rng.range(0.3, 1.6)).addScaledVector(out, 0.6);
    burst.push(p);
    const L = rng.range(0.7, 1.0);
    gb.add(leafBlade(L, L * 0.75, { segs: 2, bend: 0.3, fold: 0.15 }), { m: place(p, Math.atan2(d.x, d.z), -rng.range(-0.2, 0.6), 0), colFn: leafCol('#5aa83e', rng, { tip: '#8cc65a' }), leaf: 1, rank: rng(), centre: p });
  }
  for (let i = 0; i < 9; i++) {
    const p = burst[i * 2].clone().add(new V3(0, 0.15, 0));
    gb.add(starFlower(0.26, 5, 0.7), { m: orient(p, new V3(rng.range(-0.5, 0.5), 1, rng.range(-0.5, 0.5)), 0), col: v === 2 ? '#f0e15a' : '#e46aa8', cj: [0.02, 0.06, 0.05], reveal: 1, centre: p });
    const q = burst[i * 2 + 1].clone().add(new V3(0, -0.2, 0));
    gb.add(bead(0.16, 1.3, 0), { m: M().setPosition(q), col: '#7a4a2c', cj: [0.03, 0.08, 0.08], reveal: 2, centre: q });
  }
  return { geo: gb.build(), tris: gb.tris, top, out };
}
export function liana(opts) {
  const v = variantOf(opts);
  const hh = Math.max(4, Math.round(opts.hostHeight ?? 20)), hr = Math.round((opts.hostRadius ?? 0.6) * 10) / 10;
  const d = cached(`liana${v}_${hh}_${hr}`, () => buildLiana(v, hh, hr));
  const topY = d.top.y;
  const vis = makeVisual({
    name: 'liana', geo: d.geo, H: topY + 1, trunkR: 0.11, sway: 0.008, droop: 0.5, noJitter: true,
    grow(g) { return { s: 1 }; },
    onGrowth(g, gs, u) { u.uClip.value = g >= 0.999 ? 1e6 : lerp(1.2, topY + 2.5, Math.pow(g, 0.9)); },
    crownFn(st, u) {
      const clip = Math.min(u.uClip.value, topY + 2);
      if (clip < topY) return { top: clip, bottom: Math.max(0, clip - 2), radius: (opts.hostRadius ?? 0.6) + 0.4, density: 0.15 };
      return { top: topY + 1.1, bottom: topY - 1, radius: 1.6, density: 0.45 * u.uLeafShow.value };
    },
  }, opts);
  vis.object.children[0].rotation.y = 0; // spiral stays attached to the host
  return vis;
}

// ═════════════════════════════ FERN ═════════════════════════════
function addFernFrond(gb, rng, base, dir, len, { rank, pairs = 11, col = '#3d8a35', late = -1, pivot }) {
  const d = dir.clone().normalize();
  const p1 = base.clone().addScaledVector(d, len * 0.4).add(new V3(0, len * 0.42, 0));
  const p2 = base.clone().addScaledVector(d, len * 0.8).add(new V3(0, len * 0.35, 0));
  const p3 = base.clone().addScaledVector(d, len * 1.05).add(new V3(0, len * 0.05, 0));
  const rc = curveOf([base, p1, p2, p3]);
  const ex = { leaf: 1, rank, centre: base, late, pivot };
  gb.add(trunkGeo(rc, { r0: 0.016, r1: 0.006, segs: 4, radial: 3, flare: 0, noise: 0, cap: false }), { col: '#4c6a2a', ...ex, flutter: 0.5 });
  const lc = jitterColor(col, rng, 0.02, 0.08, 0.06), tipc = lc.clone().offsetHSL(0.03, 0.05, 0.1);
  const pos = [], cols = [];
  for (let i = 0; i < pairs; i++) {
    const t = 0.15 + 0.83 * (i / (pairs - 1));
    const P = rc.getPointAt(t), T = rc.getTangentAt(t);
    const L = len * 0.26 * Math.pow(Math.sin(Math.PI * (0.1 + 0.88 * t)), 0.8);
    for (const sd of [-1, 1]) {
      const side = new V3().crossVectors(T, new V3(0, 1, 0)).normalize().multiplyScalar(sd);
      const dirL = side.clone().addScaledVector(T, 0.45).add(new V3(0, -0.15, 0)).normalize();
      const tip = P.clone().addScaledVector(dirL, L);
      const w = L * 0.28; const up = new V3(0, 1, 0);
      const m1 = P.clone().addScaledVector(dirL, L * 0.45).addScaledVector(T, w);
      const m2 = P.clone().addScaledVector(dirL, L * 0.45).addScaledVector(T, -w);
      pos.push(...P.toArray(), ...m1.toArray(), ...tip.toArray(), ...P.toArray(), ...tip.toArray(), ...m2.toArray());
      for (let k = 0; k < 6; k++) { const c = (k === 2 || k === 4) ? tipc : lc; cols.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  gb.add(g, { colFn: (c, p, n, uv, i) => c.setRGB(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]), ...ex, flutter: 1 });
}
function buildFern(v) {
  const rng = vrng('fern', v);
  const gb = new GB(rng);
  const nf = 9;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * TAU + rng.range(-0.2, 0.2);
    const up = rng.range(0.25, 0.9);
    addFernFrond(gb, rng, new V3(Math.cos(a) * 0.06, 0.02, Math.sin(a) * 0.06), new V3(Math.cos(a), up, Math.sin(a)), rng.range(1.0, 1.35),
      { rank: i / nf, pairs: 13, col: ['#2f7a2c', '#3c8434', '#256c30'][v] });
  }
  // fiddleheads (coiled young fronds) in the centre
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.4; const pts = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; if (t < 0.55) pts.push(new V3(Math.cos(a) * 0.05 * t, t * 0.5, Math.sin(a) * 0.05 * t)); else { const ang = (t - 0.55) * 14; const r = 0.07 * (1 - (t - 0.55) * 1.5); pts.push(new V3(Math.cos(a) * (0.03 + Math.sin(ang) * r), 0.28 + 0.07 + Math.cos(ang) * r, Math.sin(a) * (0.03 + Math.sin(ang) * r))); } }
    gb.add(sweep(curveOf(pts), 10, 3, (t) => lerp(0.016, 0.008, t)), { col: '#7aa83a', leaf: 1, rank: 0.2 + i * 0.25, centre: new V3(0, 0, 0), flutter: 0.2 });
  }
  return { geo: gb.build(), tris: gb.tris };
}
export function fern(opts) {
  const v = variantOf(opts);
  const d = cached('fern' + v, () => buildFern(v));
  return makeVisual({
    name: 'fern', geo: d.geo, H: 1.3, trunkR: 0.1, sway: 0.03, droop: 0.9,
    crown: { top: 1.25, bottom: 0.3, radius: 1.3, density: 0.35 },
    grow(g) { const s = lerp(0.35, 1.05, Math.pow(g, 0.85)); return { s, leaf: lerp(0.4, 1.001, smoothstep(0, 0.7, g)) }; },
  }, opts);
}

// ═════════════════════════════ GLOW FUNGUS (bioluminescent mushrooms on a rotten log) ═════════════════════════════
function mushroomGeo(gb, rng, base, h, capR, { tilt = new V3(0, 1, 0), rank, capCol, gillCol, stemCol }) {
  const dir = tilt.clone().normalize();
  const top = base.clone().addScaledVector(dir, h);
  gb.add(trunkGeo(curveOf([base, base.clone().lerp(top, 0.5).add(new V3(0.01, 0, 0)), top]), { r0: capR * 0.22, r1: capR * 0.16, segs: 2, radial: 5, flare: 0.4, flareH: 0.2, noise: 0 }),
    { col: stemCol, cj: [0.02, 0.05, 0.05], leaf: 2, rank, centre: base, flutter: 0, reveal: 3 });
  // cap: lathe dome + flat gill underside
  const prof = [new THREE.Vector2(0.001, capR * 0.55), new THREE.Vector2(capR * 0.55, capR * 0.45), new THREE.Vector2(capR * 0.95, capR * 0.12), new THREE.Vector2(capR, -capR * 0.04)];
  const cap = new THREE.LatheGeometry(prof, 8);
  const m = orient(top, dir, rng() * 3);
  gb.add(cap, { m, nRef: top.clone().addScaledVector(dir, -capR), colLocal: true, colFn: (c, lp) => { c.set(capCol).lerp(new THREE.Color('#eef6d0'), (1 - clamp(lp.y / (capR * 0.55))) * 0.55); }, leaf: 2, rank, centre: base, flutter: 0, reveal: 3 });
  const gill = new THREE.CircleGeometry(capR * 0.98, 8).rotateX(Math.PI / 2).translate(0, -capR * 0.03, 0);
  gb.add(gill, { m, nRef: top.clone().addScaledVector(dir, capR), col: gillCol, leaf: 2, rank, centre: base, flutter: 0, reveal: 3 });
}
function buildGlowfungus(v) {
  const rng = vrng('glowfungus', v);
  const gb = new GB(rng);
  // rotten log piece, lying along X, half sunk
  const L = 1.5;
  const lc = curveOf([new V3(-L / 2, 0.12, 0), new V3(0, 0.15, 0.04), new V3(L / 2, 0.11, -0.02)]);
  gb.add(sweep(lc, 4, 7, (t, a) => 0.2 * (1 + 0.12 * Math.sin(a * 3 + t * 5)) * (1 - 0.15 * t), false), { colFn: (c, p, n, uv) => { c.set('#5a4430').lerp(new THREE.Color('#3f6a2a'), clamp(n.y * 0.8 + hash3(uv.x * 9, uv.y * 7, 1) * 0.4 - 0.25)); } });
  for (const e of [0, 1]) { // cut ends with rings
    const P = lc.getPointAt(e), T = lc.getTangentAt(e).multiplyScalar(e ? 1 : -1);
    gb.add(new THREE.CircleGeometry(0.19, 7), { m: orient(P, T, 0), colLocal: true, colFn: (c, lp) => { const r = Math.hypot(lp.x, lp.z); c.set('#8a6a44').lerp(new THREE.Color('#4a3524'), Math.pow(Math.abs(Math.sin(r * 60)), 3) * 0.6); } });
  }
  // moss patches
  for (let i = 0; i < 4; i++) { const q = lc.getPointAt(rng.range(0.1, 0.9)).add(new V3(0, 0.17, rng.range(-0.08, 0.08))); gb.add(blob(rng.range(0.1, 0.16), 0, 0.4, 0.35, i), { m: M().setPosition(q), col: '#4f8a2c', cj: [0.03, 0.08, 0.08] }); }
  // mushrooms on and beside the log
  const capCol = ['#b9b48a', '#a9b486', '#c2b98e'][v], gillCol = '#f0ffd8', stemCol = '#9c977c';
  const spots = [];
  for (let i = 0; i < 6; i++) { const t = rng.range(0.08, 0.92); const P = lc.getPointAt(t); const side = rng.sign(); const ang = rng.range(0.1, 0.9) * side; spots.push({ p: P.clone().add(new V3(0, Math.cos(ang) * 0.19, Math.sin(ang) * 0.19)), tilt: new V3(0, Math.cos(ang), Math.sin(ang) * 1.2), s: rng.range(0.7, 1.15) }); }
  for (let i = 0; i < 4; i++) { const x = rng.range(-0.6, 0.6), z = rng.sign() * rng.range(0.3, 0.55); spots.push({ p: new V3(x, 0, z), tilt: new V3(rng.range(-0.2, 0.2), 1, z * 0.4), s: rng.range(0.9, 1.4) }); }
  spots.forEach((sp, i) => mushroomGeo(gb, rng, sp.p, 0.2 * sp.s, 0.1 * sp.s, { tilt: sp.tilt, rank: i / spots.length, capCol, gillCol, stemCol }));
  return { geo: gb.build(), tris: gb.tris };
}
export function glowfungus(opts) {
  const v = variantOf(opts);
  const d = cached('glowfungus' + v, () => buildGlowfungus(v));
  return makeVisual({
    name: 'glowfungus', geo: d.geo, H: 0.5, trunkR: 0.2, sway: 0, droop: 0, glow: 1,
    look: { glowCol: '#6dff9e', roughness: 0.6 },
    crown: { top: 0.45, bottom: 0.0, radius: 0.8, density: 0.05 },
    grow(g) { return { s: lerp(0.75, 1.1, g), leaf: lerp(0.15, 1.001, smoothstep(0, 0.85, g)) }; },
    onUpdate(dt, t, w, u, body, st) { if (u.uGlow.value > 0) u.uGlowCol.value.setRGB(0.36, 1.0, 0.55).multiplyScalar(0.85 + 0.15 * Math.sin(t * 1.3 + st.phase)); },
  }, opts);
}

// ═════════════════════════════ GIANT WATER LILY (Victoria amazonica) ═════════════════════════════
function addPad(gb, rng, c, R, rank, rimH = 0.16) {
  const prof = [new THREE.Vector2(0, 0.02), new THREE.Vector2(R * 0.6, 0.015), new THREE.Vector2(R - 0.05, 0.03), new THREE.Vector2(R, rimH)];
  const top = new THREE.LatheGeometry(prof, 18);
  const tc = jitterColor('#5d9a3a', rng, 0.02, 0.06, 0.05), vein = new THREE.Color('#87b452'), rimIn = new THREE.Color('#9a6b3e');
  gb.add(top, { m: M().makeRotationY(rng() * TAU).setPosition(c), nRef: c.clone().add(new V3(0, -3, 0)), colLocal: true, colFn: (col, lp) => {
      const r = Math.hypot(lp.x, lp.z), a = Math.atan2(lp.z, lp.x);
      col.copy(tc).lerp(vein, Math.pow(Math.abs(Math.cos(a * 9)), 18) * clamp(r / R) * 0.7);
      if (lp.y > 0.05) col.lerp(rimIn, 0.55);
    }, leaf: 2, rank, centre: c, flutter: 0.15 });
  // red outer rim/underside, slightly outside
  const prof2 = [new THREE.Vector2(R * 0.8, -0.005), new THREE.Vector2(R + 0.012, 0.025), new THREE.Vector2(R + 0.015, rimH + 0.005)];
  gb.add(new THREE.LatheGeometry(prof2, 18), { m: M().setPosition(c), nRef: c.clone().add(new V3(0, 0.6, 0)), col: '#b2323a', cj: [0.02, 0.08, 0.06], leaf: 2, rank, centre: c, flutter: 0.15 });
}
function buildWaterlily(v) {
  const rng = vrng('waterlily', v);
  const gb = new GB(rng);
  addPad(gb, rng, new V3(0, 0, 0), 1.15, 0.05);
  const a1 = rng() * TAU;
  addPad(gb, rng, new V3(Math.cos(a1) * 2.0, 0.005, Math.sin(a1) * 2.0), 0.8, 0.4, 0.13);
  const a2 = a1 + rng.range(1.6, 2.4);
  addPad(gb, rng, new V3(Math.cos(a2) * 1.75, 0.01, Math.sin(a2) * 1.75), 0.45, 0.75, 0.08);
  // big flower between pads: white (first night) → pink (second), reveal by bloom
  const fa = a1 + (a2 - a1) * 0.5 + Math.PI;
  const fc = new V3(Math.cos(fa) * 1.45, 0.05, Math.sin(fa) * 1.45);
  const col = ['#f7f3ef', '#f3c3d6', '#f9eef2'][v], inner = v === 1 ? '#d94f86' : '#f2d0dc';
  const layers = [{ n: 9, L: 0.5, up: 0.3, c: col }, { n: 8, L: 0.38, up: 0.85, c: inner }];
  layers.forEach((ly, li) => {
    for (let i = 0; i < ly.n; i++) {
      const a = (i / ly.n) * TAU + li * 0.4;
      gb.add(leafBlade(ly.L, ly.L * 0.42, { segs: 2, bend: -0.12, fold: -0.2, shape: 'ellipse' }), { m: place(fc.clone().add(new V3(0, 0.05 + li * 0.04, 0)), Math.atan2(Math.cos(a), Math.sin(a)), -ly.up, 0), col: ly.c, cj: [0.01, 0.04, 0.03], reveal: 1, centre: fc, rank: li * 0.3 });
    }
  });
  gb.add(bead(0.09, 0.8, 0), { m: M().setPosition(fc.clone().add(new V3(0, 0.15, 0))), col: '#f4d96a', reveal: 1, centre: fc, rank: 0.5 });
  // spiny bud (fruit stage) — a dark prickly pod at the surface
  const bc = new V3(Math.cos(fa + 0.6) * 1.3, 0.02, Math.sin(fa + 0.6) * 1.3);
  gb.add(octa(0.13, 1.4), { m: M().setPosition(bc.clone().add(new V3(0, 0.12, 0))), col: '#6a3a3e', reveal: 2, centre: bc });
  return { geo: gb.build(), tris: gb.tris };
}
export function waterlily(opts) {
  const v = variantOf(opts);
  const d = cached('waterlily' + v, () => buildWaterlily(v));
  return makeVisual({
    name: 'waterlily', geo: d.geo, H: 0.3, trunkR: 1.0, sway: 0, droop: 0,
    look: { roughness: 0.55 },
    crown: { top: 0.2, bottom: 0, radius: 2.4, density: 0.9 },
    grow(g) { return { s: lerp(0.3, 1.0, Math.pow(g, 0.8)), leaf: lerp(0.3, 1.001, smoothstep(0.1, 0.8, g)) }; },
    onUpdate(dt, t, w, u, body, st) { body.position.y = 0.012 * Math.sin(t * 0.8 + st.phase); body.rotation.z = 0.006 * Math.sin(t * 0.6 + st.phase); },
  }, opts);
}
