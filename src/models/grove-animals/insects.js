// Grove animals: the insects, the harvester-ant colony and the firefly swarm (moved unchanged from grove-animals.js).
// Exports buildBee, buildButterfly, insectAnim (their animator), makeHarvesterAnts (ColonyVisual), makeFireflies
// (SwarmVisual), and releaseCaches(), which lives here because it resets this file's glow texture (a let binding
// can only be reassigned in the module that declares it). Needs: kit.js, animators.js.
import * as THREE from 'three';
import { makeRng, hashString, clamp, lerp, damp, smoothstep, cachedMaterial, disposeDeep, releaseMaterials } from '../../core/util.js';
import { TAU, V3, MAT, h3, wobble, colorize, paintG, loft, ell, stick, plate, mirrorX, merge, SPECS } from './kit.js';

// ---------------------------------------------------------------- INSECTS
export function buildBee(rng) {
  const amber = '#dc9a28', black = '#1c140e';
  const abd = colorize(loft([0, 1, 2, 3, 4, 5, 6, 7].map(i => { const z = lerp(-0.095, 0.015, i / 7); const r = 0.044 * Math.sin(lerp(0.35, 2.6, i / 7)); return { p: [0, -0.005 - i * 0.001, z], r: [r, r * 0.92] }; }), 10, { tipEnd: 0.012, raw: true }),
    (c, n, k, ud) => { const seg = Math.floor(k / (2 * ud.sides)); if (seg >= ud.segs) return black; return (seg === 1 || seg === 3 || seg === 5) ? black : amber; }, rng, 0.04);
  const thorax = colorize(wobble(ell(0.034, 0.032, 0.036, 0, 0.004, 0.042, 8, 6), 0.002, 1), (c, n) => n.y > 0.3 ? '#8f6a38' : '#b48a50', rng, 0.06);
  const head = colorize(ell(0.026, 0.026, 0.02, 0, 0, 0.088, 7, 5), (c, n) => Math.abs(n.x) > 0.55 ? '#120d0a' : '#3a2a1c', rng, 0.04);
  const ant = [1, -1].map(sd => paintG(stick([sd * 0.01, 0.018, 0.1], [sd * 0.028, 0.045, 0.13], 0.003, 0.002, 3), black, rng));
  const legs = [];
  for (const sd of [1, -1]) for (let i = 0; i < 3; i++) { const z = 0.03 + i * 0.016; legs.push(paintG(stick([sd * 0.02, -0.015, z], [sd * 0.05, -0.05, z - 0.02 + i * 0.01], 0.004, 0.002, 3), i === 2 ? '#3a2a10' : black, rng)); }
  const body = merge([abd, thorax, head, ...ant, ...legs]);
  const wing = (sd) => {
    const g = colorize(new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2).scale(0.045, 1, 0.02).translate(0.045, 0, -0.008).rotateY(-0.35), (c, n) => '#e4f0ff', rng, 0.03);
    const g2 = colorize(new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2).scale(0.028, 1, 0.013).translate(0.03, -0.001, -0.03).rotateY(-0.5), () => '#d6e6f8', rng, 0.02);
    const m = merge([g, g2]); return (sd < 0 ? mirrorX(m) : m).translate(sd * 0.018, 0.034, 0.05);
  };
  return {
    height: 0.1, length: 0.2,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0, 0] },
      { name: 'wingL', geom: wing(1), pivot: [0.018, 0.034, 0.05], parent: 'body', mat: MAT.clearWing, noShadow: true },
      { name: 'wingR', geom: wing(-1), pivot: [-0.018, 0.034, 0.05], parent: 'body', mat: MAT.clearWing, noShadow: true },
    ],
  };
}

function polyAt(pts, v) { // interpolate along open polyline by fraction of length
  const L = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(d); tot += d; }
  let s = v * tot; for (let i = 0; i < L.length; i++) { if (s <= L[i] || i === L.length - 1) { const f = clamp(s / L[i]); return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; } s -= L[i]; }
  return pts[pts.length - 1];
}
export function buildButterfly(rng) {
  const yel = '#f3d34a', blk = '#15110e', blue = '#3f7fe0', org = '#e8571e';
  const fore = [[0.004, 0.012], [0.05, 0.05], [0.11, 0.074], [0.165, 0.066], [0.16, 0.03], [0.13, 0.0], [0.07, -0.014], [0.004, -0.004]];
  const hind = [[0.004, -0.004], [0.075, -0.014], [0.118, -0.04], [0.118, -0.08], [0.096, -0.104], [0.084, -0.158], [0.07, -0.114], [0.045, -0.1], [0.004, -0.032]];
  const fan = (outline, colFn) => plate((u, v) => { const o = polyAt(outline, v); const r = Math.pow(u, 0.9); return [0.004 + (o[0] - 0.004) * r, 0.004 * Math.sin(u * Math.PI), 0.004 + (o[1] - 0.004) * r]; }, 6, 14, 0.002, colFn, rng, 0.03);
  const foreG = fan(fore, (u, v, top) => {
    if (u > 0.78) return (Math.floor(v * 14) % 2 && top) ? '#f6dc6a' : blk;          // black margin with yellow lunules
    if (u < 0.3) return top ? blk : '#3a3020';                                         // dark base
    if (v < 0.42 && u > 0.35 && Math.floor(v * 10) % 2 === 0) return blk;              // costal bars
    return top ? yel : '#f0dc80';
  });
  const hindG = fan(hind, (u, v, top) => {
    if (v > 0.6 && v < 0.74 && u > 0.55) return blk;                                   // swallow tail
    if (v > 0.8 && u > 0.6 && u < 0.95) return u > 0.75 ? org : blue;                  // eyespot (orange, blue-ringed)
    if (u > 0.9) return blk;                                                           // outer margin
    if (u > 0.7) return (Math.floor(v * 9) % 2 === 0 && v < 0.6) ? blue : blk;        // blue lunules on a black band
    if (u < 0.3) return top ? blk : '#3a3020';
    if (u > 0.4 && u < 0.5 && v > 0.15 && v < 0.85) return blk;                       // vein band
    return top ? yel : '#f0dc80';
  });
  const wingL = merge([foreG, hindG]);
  const wingR = mirrorX(wingL.clone());
  const body = merge([
    colorize(loft([{ p: [0, 0, -0.06], r: 0.006 }, { p: [0, 0, -0.02], r: 0.01 }, { p: [0, 0.002, 0.02], r: 0.011 }, { p: [0, 0.002, 0.035], r: 0.008 }], 6, { tipStart: 0.006 }), (c, n) => n.y < -0.3 && c.z < -0.02 ? '#d8b840' : blk, rng, 0.04),
    paintG(ell(0.009, 0.009, 0.009, 0, 0.004, 0.042, 6, 4), blk, rng),
    ...[1, -1].map(sd => paintG(stick([sd * 0.004, 0.008, 0.046], [sd * 0.02, 0.04, 0.085], 0.0018, 0.0014, 3), blk, rng)),
    ...[1, -1].map(sd => paintG(ell(0.0035, 0.0035, 0.006, sd * 0.02, 0.04, 0.087, 4, 3), blk, rng)),
  ]);
  return {
    height: 0.08, length: 0.35,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0, 0] },
      { name: 'wingL', geom: wingL.translate(0.006, 0.004, 0.0), pivot: [0.006, 0.004, 0], parent: 'body' },
      { name: 'wingR', geom: wingR.translate(-0.006, 0.004, 0.0), pivot: [-0.006, 0.004, 0], parent: 'body' },
    ],
  };
}

export function insectAnim(kind) {
  return (n, spec, rng) => {
    const st = { ph: rng() * TAU, t: rng() * 100, open: 0 };
    return (dt, s) => {
      const a = s.action || 'idle'; st.t += dt; const t = st.t;
      const air = a === 'fly' || a === 'hover' || a === 'glide';
      if (kind === 'bee') {
        const flapping = air || a === 'walk';
        st.ph += dt * (flapping ? 26 : 0) * TAU;
        const flap = flapping ? 0.25 + 0.75 * Math.sin(st.ph) : -0.05;
        const fold = flapping ? 0 : 1;
        n.wingL.rotation.set(0, fold * 0.55, flap * 0.9); n.wingR.rotation.set(0, -fold * 0.55, -flap * 0.9);
        n.rig.position.y = air ? Math.sin(t * 5.5) * 0.012 + Math.sin(t * 1.7) * 0.01 : 0;
        n.rig.rotation.x = air ? (a === 'hover' ? -0.15 : 0.15) + Math.sin(t * 3) * 0.04 : (a === 'eat' ? 0.35 : 0);
        n.rig.rotation.z = air ? Math.sin(t * 2.3) * 0.08 : 0;
        n.body.position.z = (a === 'eat') ? Math.sin(t * 6) * 0.004 : 0;
      } else { // butterfly
        let target;
        if (air) { st.ph += dt * (a === 'glide' ? 1.2 : 6.5) * TAU; target = a === 'glide' ? 0.15 + Math.sin(st.ph) * 0.1 : 0.45 + 0.85 * Math.sin(st.ph); }
        else if (a === 'eat' || a === 'sleep') { st.ph += dt * 0.35 * TAU; target = 1.38 - (a === 'eat' ? Math.max(0, Math.sin(st.ph)) * 0.4 : 0); }
        else { st.ph += dt * 0.25 * TAU; target = 0.15 + Math.max(0, Math.sin(st.ph)) ** 2 * 1.1; } // basking: open, slow close
        st.open = air ? target : damp(st.open, target, 5, dt);
        n.wingL.rotation.set(0, 0, st.open); n.wingR.rotation.set(0, 0, -st.open);
        n.rig.position.y = air ? -Math.sin(st.ph) * 0.025 + Math.sin(t * 1.3) * 0.02 : 0;
        n.rig.rotation.x = air ? -0.25 : -0.05;
        n.rig.rotation.z = air ? Math.sin(t * 1.1) * 0.12 : 0;
      }
    };
  };
}

// ---------------------------------------------------------------- COLONY: harvester ants (Messor)
function antGeometry(rng) {
  return cachedGeom('ant', () => {
    const c1 = '#1d130e', c2 = '#2c1710';
    const parts = [
      paintG(ell(0.02, 0.017, 0.028, 0, 0.026, -0.035, 6, 4), c1, rng, 0.03),
      paintG(ell(0.007, 0.007, 0.008, 0, 0.022, -0.008, 4, 3), c1, rng, 0.03),
      paintG(ell(0.011, 0.011, 0.02, 0, 0.026, 0.008, 5, 3), c2, rng, 0.03),
      paintG(ell(0.019, 0.016, 0.018, 0, 0.028, 0.038, 6, 4), c2, rng, 0.03),
    ];
    for (const dz of [-0.008, 0.006, 0.02]) parts.push(paintG(new THREE.BoxGeometry(0.07, 0.004, 0.005).translate(0, 0.012, dz), c1, rng, 0.03));
    parts.push(...[1, -1].map(sd => paintG(stick([sd * 0.008, 0.035, 0.052], [sd * 0.02, 0.042, 0.075], 0.0025, 0.0015, 3), c1, rng, 0)));
    return merge(parts);
  });
}
const GEOMS = new Map();
function cachedGeom(key, fn) { if (!GEOMS.has(key)) GEOMS.set(key, fn()); return GEOMS.get(key); }

function buildNest(rng) {
  return cachedGeom('ant-nest', () => {
    const prof = [[0.0, -0.03], [0.07, -0.02], [0.13, 0.05], [0.24, 0.1], [0.42, 0.07], [0.65, 0.03], [0.9, 0.0]].map(([r, y]) => new THREE.Vector2(r, y));
    const crater = colorize(wobble(new THREE.LatheGeometry(prof, 16), 0.012, 4), (c, n) => {
      const r = Math.hypot(c.x, c.z); if (r < 0.1) return '#140c07'; if (r < 0.2) return '#5a3e2a';
      if (r > 0.7) return '#9a7a58';
      return (h3(c.x * 300, 0, c.z * 300, 9) & 3) === 0 ? '#c8a878' : '#b8966a';
    }, rng, 0.06);
    const husks = [];
    for (let i = 0; i < 150; i++) {
      const a = rng() * TAU, r = 0.25 + Math.pow(rng(), 1.3) * 0.75;
      const g = new THREE.TetrahedronGeometry(1, 0).scale(0.03 + rng() * 0.015, 0.008, 0.012 + rng() * 0.008).rotateY(rng() * TAU);
      const y = r < 0.65 ? lerp(0.08, 0.02, (r - 0.3) / 0.35) : 0.01;
      g.translate(Math.cos(a) * r, y, Math.sin(a) * r);
      husks.push(paintG(g, rng.pick(['#ecd9a0', '#e2c784', '#d4b46e', '#f2e6bd']), rng, 0.06));
    }
    // a few dropped seeds near entrance
    for (let i = 0; i < 10; i++) { const a = rng() * TAU, r = 0.12 + rng() * 0.25; husks.push(paintG(ell(0.016, 0.012, 0.022, Math.cos(a) * r, 0.06, Math.sin(a) * r, 5, 3), '#e8d9a8', rng, 0.05)); }
    return merge([crater, ...husks]);
  });
}

export function makeHarvesterAnts(opts = {}) {
  const seed = opts.seed ?? 1; const rng = makeRng(hashString('harvesterant') + seed);
  const object = new THREE.Group(); object.name = 'harvesterant';
  const nest = new THREE.Mesh(buildNest(makeRng(77)), MAT.std()); nest.receiveShadow = true; nest.castShadow = false; object.add(nest);
  const N = 90;
  const ants = new THREE.InstancedMesh(antGeometry(makeRng(5)), MAT.std(), N); ants.castShadow = false; ants.receiveShadow = true;
  ants.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ants.frustumCulled = false;
  const seeds = new THREE.InstancedMesh(cachedGeom('ant-seed', () => paintG(ell(0.016, 0.011, 0.022, 0, 0, 0, 5, 3), '#ecdcae', makeRng(3), 0)), MAT.std(), N);
  seeds.instanceMatrix.setUsage(THREE.DynamicDrawUsage); seeds.frustumCulled = false;
  object.add(ants, seeds);
  const ant = Array.from({ length: N }, (_, i) => ({ off: i / N + rng() * 0.004, lane: 0.04 + rng() * 0.05, spd: 0.85 + rng() * 0.3, wig: rng() * TAU, mill: i < 10 }));
  let trail = null, cum = [], total = 1;
  const setLocal = (pts) => {
    trail = pts; cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    total = Math.max(0.01, cum[cum.length - 1]);
  };
  setLocal([new V3(0, 0.02, 0), new V3(0.8, 0, 1.2), new V3(0.6, 0, 2.6), new V3(1.4, 0, 3.8), new V3(1.2, 0, 5)]);
  const P = new V3(), T = new V3(), S = new V3(), up = new V3(0, 1, 0), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(1, 1, 1), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const sample = (d) => {
    d = clamp(d, 0, total);
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const f = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    P.lerpVectors(trail[i - 1], trail[i], f); T.subVectors(trail[i], trail[i - 1]).normalize();
  };
  let time = 0;
  return {
    type: 'colony', object, height: 0.25, length: 2,
    setTrail(pointsWorld) {
      if (!pointsWorld || pointsWorld.length < 2) return;
      object.updateWorldMatrix(true, false);
      const inv = object.matrixWorld.clone().invert();
      let pts = pointsWorld.map(p => new V3(p.x, p.y, p.z).applyMatrix4(inv));
      if (pts[pts.length - 1].length() < pts[0].length()) pts.reverse();
      if (pts[0].length() > 0.3) pts.unshift(new V3(0, pts[0].y, 0));
      pts[0].y = Math.max(pts[0].y, 0.02);
      setLocal(pts);
    },
    update(dt, s = {}) {
      dt = clamp(dt || 0, 0, 0.1); time += dt;
      const act = clamp(s.activity ?? 1); const night = s.night || 0;
      const speed = 0.32 * (0.55 + 0.45 * act) * (1 - 0.4 * night);
      const visible = Math.max(6, Math.round(N * (0.15 + 0.85 * act)));
      for (let i = 0; i < N; i++) {
        const A = ant[i];
        if (i >= visible) { ants.setMatrixAt(i, zero); seeds.setMatrixAt(i, zero); continue; }
        let carry = false;
        if (A.mill) { // ants milling around the entrance
          const a = time * 0.6 * A.spd + A.off * TAU * 3, r = 0.16 + 0.12 * Math.sin(time * 0.4 + i);
          P.set(Math.cos(a) * r, 0.07, Math.sin(a) * r); T.set(-Math.sin(a), 0, Math.cos(a));
        } else {
          const u = ((A.off + time * speed * A.spd / (2 * total)) % 1 + 1) % 1;
          let d; let lane;
          if (u < 0.5) { d = u * 2 * total; lane = A.lane; } else { d = (1 - (u - 0.5) * 2) * total; lane = -A.lane; carry = true; }
          sample(d); if (carry) T.negate();
          S.crossVectors(up, T).normalize();
          const near = smoothstep(0.5, 0.0, d);
          P.addScaledVector(S, lane * (1 - near * 0.8) + Math.sin(time * 7 + A.wig) * 0.01);
          if (d < 0.6) P.y = Math.max(P.y, lerp(0.09, 0.0, d / 0.6)); // climb the crater rim
        }
        e.set(0, Math.atan2(T.x, T.z) + Math.sin(time * 14 + A.wig) * 0.15, 0); q.setFromEuler(e);
        P.y += Math.abs(Math.sin(time * 22 + A.wig)) * 0.004;
        m.compose(P, q, sc); ants.setMatrixAt(i, m);
        if (carry) { S.set(0, 0.04, 0.075).applyQuaternion(q).add(P); m.compose(S, q, sc); seeds.setMatrixAt(i, m); } else seeds.setMatrixAt(i, zero);
      }
      ants.instanceMatrix.needsUpdate = true; seeds.instanceMatrix.needsUpdate = true;
    },
    dispose() { object.removeFromParent(); ants.dispose(); seeds.dispose(); },
  };
}

// ---------------------------------------------------------------- SWARM: fireflies
let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const S = 64; const d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2);
    const a = clamp(Math.exp(-r * r * 5) * 0.6 + Math.exp(-r * r * 60) * 1.0);
    const i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
  }
  _glowTex = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); _glowTex.needsUpdate = true; _glowTex.magFilter = THREE.LinearFilter; _glowTex.minFilter = THREE.LinearFilter;
  return _glowTex;
}
export function makeFireflies(opts = {}) {
  const seed = opts.seed ?? 1; const rng = makeRng(hashString('firefly') + seed);
  const N = 12;
  const object = new THREE.Group(); object.name = 'firefly';
  const bodyGeom = cachedGeom('firefly-body', () => {
    const r = makeRng(9);
    return merge([paintG(ell(0.014, 0.011, 0.03, 0, 0, 0.0, 5, 4), '#2a2018', r, 0), paintG(ell(0.012, 0.01, 0.014, 0, -0.002, -0.03, 5, 3), '#d8e070', r, 0),
      paintG(ell(0.01, 0.009, 0.01, 0, 0.002, 0.03, 4, 3), '#c8603a', r, 0)]);
  });
  const bodies = new THREE.InstancedMesh(bodyGeom, MAT.std(), N); bodies.frustumCulled = false; bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pg.boundingSphere = new THREE.Sphere(new V3(0, 1.3, 0), 3);
  const glowMat = cachedMaterial('grove-animals:fireflyglow', () => new THREE.PointsMaterial({ size: 1.1, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  const glow = new THREE.Points(pg, glowMat); glow.frustumCulled = false; glow.renderOrder = 2;
  object.add(bodies, glow);
  const F = Array.from({ length: N }, () => ({
    cx: (rng() * 2 - 1) * 1.1, cz: (rng() * 2 - 1) * 1.1, cy: 0.5 + rng() * 1.4, ax: 0.3 + rng() * 0.5, az: 0.3 + rng() * 0.5, ay: 0.15 + rng() * 0.25,
    fx: 0.1 + rng() * 0.15, fz: 0.1 + rng() * 0.15, fy: 0.15 + rng() * 0.2, p: rng() * TAU, period: 1.6 + rng() * 2.4, bp: rng() * 10,
  }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), P = new V3(), sc = new V3(), Pn = new V3();
  let time = rng() * 50; let nightW = 0;
  const update = (dt, s = {}) => {
    dt = clamp(dt || 0, 0, 0.1); time += dt;
    const night = s.night || 0; const act = clamp(s.activity ?? 1);
    nightW = damp(nightW, smoothstep(0.5, 0.75, night), 2, dt);
    const visible = Math.max(3, Math.round(N * (0.3 + 0.7 * act)));
    for (let i = 0; i < N; i++) {
      const f = F[i]; const t = time + f.p * 10;
      P.set(f.cx + Math.sin(t * f.fx * TAU * 0.3 + f.p) * f.ax, f.cy + Math.sin(t * f.fy * TAU * 0.3 + f.p * 2) * f.ay, f.cz + Math.cos(t * f.fz * TAU * 0.3 + f.p * 3) * f.az);
      Pn.set(f.cx + Math.sin((t + 0.1) * f.fx * TAU * 0.3 + f.p) * f.ax, P.y, f.cz + Math.cos((t + 0.1) * f.fz * TAU * 0.3 + f.p * 3) * f.az);
      e.set(0, Math.atan2(Pn.x - P.x, Pn.z - P.z), 0); q.setFromEuler(e);
      const on = i < visible ? 1 : 0;
      sc.setScalar(on * 1.0); m.compose(P, q, sc); bodies.setMatrixAt(i, m);
      // blink: short bright flash every period, with a faint ember between flashes
      const ph = ((time + f.bp) % f.period) / f.period;
      const flash = Math.pow(Math.max(0, Math.sin(clamp(ph / 0.22) * Math.PI)), 2);
      const b = on * nightW * (0.12 + 3.2 * flash);
      pos[i * 3] = P.x; pos[i * 3 + 1] = P.y - 0.02; pos[i * 3 + 2] = P.z;
      col[i * 3] = 0.8 * b; col[i * 3 + 1] = 1.0 * b; col[i * 3 + 2] = 0.3 * b;
    }
    bodies.instanceMatrix.needsUpdate = true; pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    glow.visible = nightW > 0.01;
  };
  update(0, {});
  return { type: 'swarm', object, height: 2.2, length: 3, update, dispose() { object.removeFromParent(); bodies.dispose(); pg.dispose(); } };
}

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() {
  disposeDeep([SPECS, GEOMS, _glowTex]); SPECS.clear(); GEOMS.clear(); _glowTex = null;
  releaseMaterials('grove-animals:');
}
