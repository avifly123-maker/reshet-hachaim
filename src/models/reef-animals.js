// Reef animals (1.3) – procedural models until the Blender models are made (the rule: animals come from Blender;
// these keep the zone playable meanwhile, and withRigged() replaces each one as soon as art/rigged/reef/<id>.json exists).
// Contract: CONTRACT.md §4 (AnimalVisual). Fish use the flying behaviour (src/sim/species.js turns 'swim' into it):
// 'fly' / 'hover' / 'glide' = swimming, 'perch' = resting by a coral, 'eat' = nibbling, 'sleep' = still.
// Origin: fish at the body centre (like flyers); crawlers (goby, shrimp, octopus, urchin, starfish, ray, hermit crab)
// at the ground contact, facing +Z.
import * as THREE from 'three';
import { makeRng, clamp, lerp, smoothstep, damp, mergeGeometries } from '../core/util.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const col = (h) => new THREE.Color(h);

function colorize(g, fn) {
  const p = g.attributes.position, a = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), c); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
// a body lofted along +Z: prof(t) → [halfWidth, halfHeight, yOffset], t from tail (0) to nose (1)
function loftBody(L, prof, seg = 12, rings = 14) {
  const pos = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, z = -L / 2 + t * L, [w, h, yo] = prof(t);
    for (let j = 0; j < seg; j++) { const a = (j / seg) * TAU; pos.push(Math.cos(a) * w, yo + Math.sin(a) * h, z); }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = (i + 1) * seg + (j + 1) % seg, d = (i + 1) * seg + j; idx.push(a, b, c, a, c, d); }
  const tail = pos.length / 3; pos.push(0, prof(0)[2], -L / 2 - 0.001); const nose = pos.length / 3; pos.push(0, prof(1)[2], L / 2 + 0.001);
  for (let j = 0; j < seg; j++) { idx.push(tail, (j + 1) % seg, j); idx.push(nose, rings * seg + j, rings * seg + (j + 1) % seg); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a flat fin from a list of [y, z] points (x = 0 plane), both sides
function fin(pts, x = 0) {
  const pos = [];
  for (let i = 1; i < pts.length - 1; i++) { const a = pts[0], b = pts[i], c = pts[i + 1]; pos.push(x, a[0], a[1], x, b[0], b[1], x, c[0], c[1]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
function finMat(hex, opacity = 0.9) { return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, side: THREE.DoubleSide, transparent: opacity < 1, opacity, vertexColors: false }); }
const bodyMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05 });
function eyes(L, H, z, y, r = 0.06) {
  const g = []; for (const sx of [1, -1]) { const e = new THREE.SphereGeometry(r * L, 8, 6); e.translate(sx * 0.32 * H, y, z); g.push(e); }
  return colorize(mergeGeometries(g), (x, y2, z2, c) => c.set('#111111'));
}

// ───────────────────────────── fish
// spec: { L, H (body height / length), W (width / length), color(t, up, c), fin, tail, dorsal?, extra? }
function makeFish(spec, opts) {
  const rng = opts.rng || makeRng(opts.seed || 1);
  const { L, H, W } = spec;
  const object = new THREE.Group();
  const body = new THREE.Group(); object.add(body);
  const prof = spec.prof || ((t) => { const k = Math.sin(Math.PI * Math.pow(t, 0.85)); return [Math.max(0.01, W * L * k), Math.max(0.01, H * L * 0.5 * k), 0]; });
  const bg = colorize(loftBody(L, prof, 12, 16), (x, y, z, c) => spec.color((z + L / 2) / L, y / (H * L * 0.5 + 1e-6), c, x));
  const parts = [bg, eyes(L, W * L * 2.2, L * 0.33, H * L * 0.12, spec.eye || 0.05)];
  const m = bodyMat();
  const mesh = new THREE.Mesh(mergeGeometries(parts), m); mesh.castShadow = true; body.add(mesh);
  // dorsal and anal fins (static), pectorals (paddle), tail (beats)
  const fm = finMat(spec.fin || '#f2c14e', spec.finOpacity ?? 0.85);
  const hH = H * L * 0.5;
  const dorsal = new THREE.Mesh(fin(spec.dorsal || [[hH * 0.85, -L * 0.25], [hH * 1.5, -L * 0.05], [hH * 1.35, L * 0.12], [hH * 0.9, L * 0.2]]), fm); body.add(dorsal);
  const anal = new THREE.Mesh(fin([[-hH * 0.8, -L * 0.28], [-hH * 1.25, -L * 0.12], [-hH * 0.85, -L * 0.02]]), fm); body.add(anal);
  const pecs = [];
  for (const sx of [1, -1]) {
    const pg = fin(spec.pec || [[0, 0], [-hH * 0.2, -L * 0.18], [hH * 0.3, -L * 0.16]]); pg.rotateZ(sx * 1.2);
    const p = new THREE.Mesh(pg, fm); p.position.set(sx * W * L * 0.8, -hH * 0.2, L * 0.12); body.add(p); pecs.push(p);
  }
  const tailPivot = new THREE.Group(); tailPivot.position.z = -L / 2 + 0.01; body.add(tailPivot);
  const tg = fin(spec.tail || [[0, 0], [hH * 1.0, -L * 0.28], [0, -L * 0.18], [-hH * 1.0, -L * 0.28]]);
  const tailMesh = new THREE.Mesh(tg, finMat(spec.tailCol || spec.fin || '#f2c14e', spec.finOpacity ?? 0.9)); tailPivot.add(tailMesh);
  if (spec.extra) spec.extra(body, L, H, W, rng);
  const st = { ph: rng() * TAU, beat: 0 };
  return {
    type: 'animal', object, height: H * L, length: L, speeds: { fly: spec.speed || 2.5 },
    actions: ['idle', 'fly', 'hover', 'glide', 'perch', 'eat', 'sleep'],
    update(dt, s) {
      const a = s.action || 'hover';
      const fast = a === 'fly' ? clamp(0.6 + (s.speed || 0) * 0.25, 0.6, 2.2) : a === 'sleep' ? 0.15 : a === 'perch' ? 0.45 : a === 'glide' ? 0.3 : 0.7;
      st.beat = damp(st.beat, fast, 4, dt);
      st.ph += dt * (4 + st.beat * 7);
      tailPivot.rotation.y = Math.sin(st.ph) * (0.25 + 0.3 * st.beat);
      body.rotation.y = -Math.sin(st.ph - 0.6) * 0.07 * st.beat;
      for (let i = 0; i < 2; i++) pecs[i].rotation.y = (i ? -1 : 1) * (0.3 + 0.25 * Math.sin(st.ph * 0.7 + i));
      body.position.y = a === 'eat' ? -0.05 * L + Math.sin(st.ph * 1.5) * 0.02 * L : 0;
      body.rotation.x = a === 'eat' ? 0.35 : damp(body.rotation.x, 0, 3, dt);
    },
    dispose() { object.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }); object.removeFromParent(); },
  };
}

const FISH = {
  // Red Sea anemonefish: orange, two white bars edged in black, yellowish fins
  clownfish: { L: 0.36, H: 0.5, W: 0.16, fin: '#f0a020', tailCol: '#f4c040', speed: 1.6,
    color: (t, up, c) => { c.set('#d8641e'); const bar = (u, w) => smoothstep(w, w * 0.5, Math.abs(t - u)); const b = Math.max(bar(0.74, 0.07), bar(0.47, 0.06)); const edge = Math.max(bar(0.74, 0.1), bar(0.47, 0.09)) - b; c.lerp(col('#1a1a1a'), clamp(edge * 1.6)).lerp(col('#fbf8f0'), b); c.multiplyScalar(0.92 + 0.12 * up); } },
  // parrotfish: blue-green with pink scale edges and a pale beak
  parrotfish: { L: 0.85, H: 0.36, W: 0.13, fin: '#3ab8d0', tailCol: '#e06a9a', speed: 2.2,
    color: (t, up, c) => { c.set('#2fb59a').lerp(col('#4ab0e0'), clamp(0.5 + 0.5 * up)); c.lerp(col('#e88aa8'), 0.25 * (0.5 + 0.5 * Math.sin(t * 60) * Math.sin(up * 9))); if (t > 0.92) c.lerp(col('#f2ede0'), 0.8); } },
  // sohal surgeonfish: grey-blue with dark horizontal stripes and an orange spot by the tail
  surgeonfish: { L: 0.62, H: 0.48, W: 0.09, fin: '#1a2030', tailCol: '#1a2a40', speed: 2.4,
    color: (t, up, c) => { c.set('#8a9aac'); c.lerp(col('#1a2030'), 0.55 * smoothstep(0.6, 0.9, Math.sin(up * 14))); if (t < 0.14 && t > 0.06 && Math.abs(up) < 0.4) c.set('#f08a24'); c.lerp(col('#e8ecf0'), smoothstep(-0.2, -0.9, up) * 0.6); } },
  // bluestreak cleaner wrasse: slender, a black stripe widening to the tail, pale top
  cleaner: { L: 0.3, H: 0.24, W: 0.08, fin: '#2a5ab0', tailCol: '#1a3a90', speed: 1.8,
    color: (t, up, c) => { c.set('#f2e8c8').lerp(col('#4a8ad6'), smoothstep(0.5, 0.0, t)); const w = lerp(0.12, 0.38, 1 - t); c.lerp(col('#101418'), smoothstep(w, w * 0.6, Math.abs(up))); } },
  // butterflyfish (Chaetodon): a tall flat disc, yellow with a dark eye band
  butterflyfish: { L: 0.42, H: 0.8, W: 0.06, fin: '#f2d04a', tailCol: '#f2d04a', speed: 1.6, eye: 0.045,
    prof: (t) => { const k = Math.sin(Math.PI * Math.pow(t, 0.75)); return [Math.max(0.01, 0.06 * 0.42 * k), Math.max(0.01, 0.8 * 0.42 * 0.5 * Math.pow(k, 0.6)), 0]; },
    color: (t, up, c) => { c.set('#f6d64a').lerp(col('#fff6d0'), 0.3 * (0.5 + 0.5 * Math.sin(t * 40 + up * 10))); if (Math.abs(t - 0.8) < 0.035) c.set('#2a2018'); if (t < 0.25 && up < 0.2) c.lerp(col('#d0402a'), 0.5); } },
  // devil firefish (lionfish): red-brown and white stripes, big fan fins
  lionfish: { L: 0.6, H: 0.38, W: 0.12, fin: '#e8c0a8', tailCol: '#e0b8a0', finOpacity: 0.75, speed: 1.2,
    color: (t, up, c) => { c.set('#f6ece0').lerp(col('#a8321e'), smoothstep(-0.2, 0.4, Math.sin(t * 46 + up * 2))); },
    pec: [[0, 0], [-0.25, -0.3], [0.05, -0.36], [0.25, -0.22]],
    dorsal: [[0.1, -0.2], [0.42, -0.12], [0.2, -0.02], [0.45, 0.05], [0.18, 0.12], [0.36, 0.17], [0.1, 0.2]] },
  // roving coral grouper: red-orange with small blue spots
  grouper: { L: 1.0, H: 0.32, W: 0.12, fin: '#c8442a', tailCol: '#b03a24', speed: 2.6,
    color: (t, up, c) => { c.set('#d8502e').lerp(col('#f08060'), smoothstep(-0.2, -0.9, up) * 0.4); const sp = Math.sin(t * 90) * Math.sin(up * 22); if (sp > 0.82) c.set('#4ab8f0'); } },
};

// ───────────────────────────── the moray: a long body in segments that undulate
function makeMoray(opts) {
  const rng = opts.rng || makeRng(opts.seed || 1);
  const object = new THREE.Group(), N = 8, L = 1.7, segL = L / N;
  const m = bodyMat(); const segs = [];
  let parent = object;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, r0 = 0.09 * (1 - 0.55 * t0), r1 = 0.09 * (1 - 0.55 * (i + 1) / N);
    const g = new THREE.CylinderGeometry(r1, r0, segL * 1.08, 10, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0, -segL / 2);
    let geo;
    if (i === 0) { const head = new THREE.SphereGeometry(0.1, 10, 8); head.scale(0.85, 0.9, 1.5); head.translate(0, 0.01, 0.05); const g2 = mergeGeometries([g, head, eyes(1, 0.22, 0.12, 0.05, 0.022)]); colorize(g2, (x, y, z, c) => c.set('#6e7a3a').lerp(col('#2a2a12'), smoothstep(0.6, 0.9, Math.sin(x * 40) * Math.sin(z * 37 + 1)))); geo = g2; }
    else { colorize(g, (x, y, z, c) => c.set('#6e7a3a').lerp(col('#2a2a12'), smoothstep(0.6, 0.9, Math.sin(x * 40 + i) * Math.sin(z * 37 + i * 3)))); geo = g; }
    const s = new THREE.Mesh(geo, m); s.castShadow = true;
    const piv = new THREE.Group(); piv.position.z = i === 0 ? L / 2 - 0.15 : -segL; piv.add(s); parent.add(piv); parent = piv; segs.push(piv);
  }
  const st = { ph: rng() * TAU };
  return {
    type: 'animal', object, height: 0.2, length: L, speeds: { fly: 1.4 }, actions: ['idle', 'fly', 'hover', 'perch', 'eat', 'sleep'],
    update(dt, s) {
      const a = s.action, sp = a === 'fly' ? 1 : a === 'sleep' ? 0.1 : 0.35;
      st.ph += dt * (2 + 4 * sp);
      for (let i = 1; i < N; i++) segs[i].rotation.y = Math.sin(st.ph - i * 0.9) * 0.28 * sp;
      // breathing: the mouth opens and closes (the head bobs a little)
      segs[0].rotation.x = Math.sin(st.ph * 0.6) * 0.04;
    },
    dispose() { object.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); m.dispose(); object.removeFromParent(); },
  };
}

// ───────────────────────────── the green turtle: shell, head, four flippers
function makeTurtle(opts) {
  const rng = opts.rng || makeRng(opts.seed || 1);
  const object = new THREE.Group();
  const shell = new THREE.SphereGeometry(0.62, 18, 10, 0, TAU, 0, Math.PI * 0.55); shell.scale(0.85, 0.42, 1.05);
  const belly = new THREE.CircleGeometry(0.55, 18); belly.rotateX(Math.PI / 2); belly.scale(0.9, 1, 1.1);
  const head = new THREE.SphereGeometry(0.17, 10, 8); head.scale(0.9, 0.8, 1.2); head.translate(0, 0.02, 0.72);
  const g = mergeGeometries([colorize(shell, (x, y, z, c) => { c.set('#7a6a3a').lerp(col('#4a5a2a'), 0.5 + 0.5 * Math.sin(x * 9) * Math.sin(z * 8)); c.lerp(col('#2a2a18'), smoothstep(0.85, 0.95, Math.abs(Math.sin(x * 6 + z * 2)))); }),
    colorize(belly, (x, y, z, c) => c.set('#e8dcb0')), colorize(head, (x, y, z, c) => c.set('#8a8a5a')), eyes(1, 0.22, 0.83, 0.06, 0.03)]);
  const m = bodyMat(); const body = new THREE.Mesh(g, m); body.castShadow = true; object.add(body);
  const fm = new THREE.MeshStandardMaterial({ color: '#7a7a4a', roughness: 0.7, side: THREE.DoubleSide });
  const flips = [];
  for (const [sx, z, len] of [[1, 0.28, 0.62], [-1, 0.28, 0.62], [1, -0.4, 0.3], [-1, -0.4, 0.3]]) {
    const fg = new THREE.CylinderGeometry(0.0, 0.1, len, 4, 1); fg.rotateZ(sx * Math.PI / 2); fg.scale(1, 0.25, 1); fg.translate(sx * len / 2, 0, 0);
    const piv = new THREE.Group(); piv.position.set(sx * 0.42, -0.02, z); piv.add(new THREE.Mesh(fg, fm)); object.add(piv); flips.push({ piv, sx, front: z > 0 });
  }
  const st = { ph: rng() * TAU };
  return {
    type: 'animal', object, height: 0.5, length: 1.4, speeds: { fly: 1.6 }, actions: ['idle', 'fly', 'hover', 'perch', 'eat', 'sleep'],
    update(dt, s) {
      const sp = s.action === 'fly' ? 1 : s.action === 'sleep' ? 0.05 : 0.35;
      st.ph += dt * (1.2 + 1.6 * sp);
      for (const f of flips) { f.piv.rotation.z = f.sx * Math.sin(st.ph + (f.front ? 0 : 1.2)) * (f.front ? 0.6 : 0.3) * sp; f.piv.rotation.y = f.sx * 0.3 * Math.cos(st.ph) * sp; }
    },
    dispose() { object.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); m.dispose(); fm.dispose(); object.removeFromParent(); },
  };
}

// ───────────────────────────── crawlers on the sea floor (origin at the ground)
function crawler(build, { length, height, walk = 0.3, run, anim }) {
  return (opts) => {
    const rng = opts.rng || makeRng(opts.seed || 1);
    const object = new THREE.Group();
    const parts = build(rng, object);
    const st = { ph: rng() * TAU };
    return {
      type: 'animal', object, height, length, speeds: { walk, run: run || walk * 2.2 }, actions: ['idle', 'walk', 'run', 'eat', 'sleep'],
      update(dt, s) { const mv = s.action === 'walk' || s.action === 'run' ? 1 : 0; st.ph += dt * (1 + 5 * mv); anim && anim(parts, st.ph, mv, s, dt); },
      dispose() { object.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); object.removeFromParent(); },
    };
  };
}
const goby = crawler((rng, obj) => {
  const f = makeFish({ L: 0.3, H: 0.24, W: 0.09, fin: '#e8c070', speed: 1, color: (t, up, c) => { c.set('#f0d8a0').lerp(col('#c8902a'), smoothstep(0.5, 0.9, Math.sin(t * 30))); } }, { rng });
  f.object.position.y = 0.06; obj.add(f.object); return { f };
}, { length: 0.3, height: 0.12, walk: 0.5, anim: (p, ph, mv, s, dt) => p.f.update(dt, { action: mv ? 'fly' : 'perch', speed: mv }) });
const shrimp = crawler((rng, obj) => {
  const g = []; for (let i = 0; i < 6; i++) { const seg = new THREE.SphereGeometry(0.05 - i * 0.004, 8, 6); seg.scale(1, 0.8, 1.1); seg.translate(0, 0.05 + i * 0.004, 0.12 - i * 0.05); g.push(seg); }
  const claw = new THREE.SphereGeometry(0.05, 8, 6); claw.scale(0.8, 0.6, 1.6); claw.translate(0.06, 0.04, 0.2); g.push(claw);
  const m = new THREE.Mesh(colorize(mergeGeometries(g), (x, y, z, c) => c.set('#e88a6a').lerp(col('#f6d0b0'), smoothstep(0.03, 0.08, y))), bodyMat());
  m.castShadow = true; obj.add(m); return { m };
}, { length: 0.3, height: 0.1, walk: 0.4, anim: (p, ph, mv) => { p.m.rotation.y = Math.sin(ph * 3) * 0.05 * mv; } });
const octopus = crawler((rng, obj) => {
  const mantle = new THREE.SphereGeometry(0.22, 14, 10); mantle.scale(1, 1.2, 1.3); mantle.translate(0, 0.32, -0.08);
  const m = bodyMat(); const body = new THREE.Mesh(mergeGeometries([colorize(mantle, (x, y, z, c) => c.set('#a85a8a').lerp(col('#e8b0c0'), 0.3 + 0.3 * Math.sin(x * 20) * Math.sin(z * 18))), eyes(1, 0.3, 0.06, 0.32, 0.03)]), m);
  body.castShadow = true; obj.add(body);
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, piv = new THREE.Group(); piv.position.set(Math.cos(a) * 0.12, 0.16, Math.sin(a) * 0.12 + 0.02); piv.rotation.y = -a + Math.PI / 2;
    const ag = new THREE.CylinderGeometry(0.008, 0.045, 0.55, 6, 4); ag.rotateX(Math.PI / 2); ag.translate(0, 0, 0.27);
    const am = new THREE.Mesh(colorize(ag, (x, y, z, c) => c.set('#b8689a')), m); piv.add(am); obj.add(piv); arms.push(piv);
  }
  return { body, arms };
}, { length: 0.8, height: 0.5, walk: 0.5, anim: (p, ph, mv) => { p.arms.forEach((a, i) => { a.rotation.x = 0.35 + Math.sin(ph * 1.5 + i * 0.8) * (0.15 + 0.2 * mv); }); p.body.rotation.x = Math.sin(ph) * 0.05; } });
const urchin = crawler((rng, obj) => {
  const parts = [new THREE.SphereGeometry(0.14, 10, 8)];
  const n = 60;
  for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 1.4, r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.39996; const d = V3(Math.cos(th) * r, Math.max(-0.2, y), Math.sin(th) * r).normalize(); const sp = new THREE.ConeGeometry(0.012, 0.42, 3); sp.translate(0, 0.21 + 0.13, 0); sp.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d)); parts.push(sp); }
  const g = mergeGeometries(parts); g.translate(0, 0.14, 0);
  const m = new THREE.Mesh(colorize(g, (x, y, z, c) => c.set('#1a1424')), bodyMat()); m.castShadow = true; obj.add(m); return { m };
}, { length: 0.5, height: 0.5, walk: 0.08, anim: (p, ph, mv) => { p.m.rotation.y += mv * 0.002; } });
const starfish = crawler((rng, obj) => {
  const shape = new THREE.Shape(); const n = 13;
  for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * TAU, r = i % 2 ? 0.16 : 0.34; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, 0.03, 0);
  const parts = [g];
  for (let i = 0; i < 40; i++) { const a = rng() * TAU, r = Math.sqrt(rng()) * 0.3; const sp = new THREE.ConeGeometry(0.012, 0.09, 3); sp.translate(Math.cos(a) * r, 0.12, Math.sin(a) * r); parts.push(sp); }
  const m = new THREE.Mesh(colorize(mergeGeometries(parts), (x, y, z, c) => c.set('#8a4a7a').lerp(col('#d07a9a'), smoothstep(0.08, 0.14, y))), bodyMat()); m.castShadow = true; obj.add(m); return { m };
}, { length: 0.7, height: 0.15, walk: 0.06, anim: (p, ph, mv) => { p.m.rotation.y += mv * 0.001; } });
const stingray = crawler((rng, obj) => {
  const disc = new THREE.SphereGeometry(0.42, 18, 8); disc.scale(1, 0.14, 1.1); disc.translate(0, 0.07, 0);
  const tail = new THREE.ConeGeometry(0.035, 0.7, 5); tail.rotateX(-Math.PI / 2); tail.translate(0, 0.06, -0.75);
  const g = mergeGeometries([colorize(disc, (x, y, z, c) => { c.set('#b8a888'); if (y > 0.07 && Math.sin(x * 30) * Math.sin(z * 27) > 0.85) c.set('#3a8ad6'); }), colorize(tail, (x, y, z, c) => c.set('#8a7a5a')), eyes(1, 0.25, 0.22, 0.12, 0.025)]);
  const m = new THREE.Mesh(g, bodyMat()); m.castShadow = true; obj.add(m); return { m, g, base: g.attributes.position.array.slice() };
}, { length: 1.0, height: 0.15, walk: 0.6, anim: (p, ph, mv) => { const a = p.g.attributes.position.array, b = p.base; for (let i = 0; i < a.length; i += 3) { const x = b[i], z = b[i + 2]; a[i + 1] = b[i + 1] + Math.sin(ph * 2 - z * 4) * 0.05 * Math.abs(x) * (0.3 + mv); } p.g.attributes.position.needsUpdate = true; } });
const hermit = crawler((rng, obj) => {
  const parts = [];
  for (let i = 0; i < 6; i++) { const s = new THREE.SphereGeometry(0.15 - i * 0.02, 10, 8); s.translate(0, 0.14 + i * 0.045, -0.05 - i * 0.025); parts.push(s); }
  const shellG = colorize(mergeGeometries(parts), (x, y, z, c) => c.set('#e0c8a0').lerp(col('#a07850'), 0.5 + 0.5 * Math.sin(y * 50)));
  const crab = new THREE.SphereGeometry(0.07, 8, 6); crab.scale(1.2, 0.8, 1); crab.translate(0, 0.08, 0.12);
  const legs = []; for (const sx of [1, -1]) for (let k = 0; k < 2; k++) { const l = new THREE.CylinderGeometry(0.012, 0.012, 0.14, 4); l.rotateZ(sx * 1.1); l.translate(sx * 0.08, 0.05, 0.1 + k * 0.05); legs.push(l); }
  const g = mergeGeometries([shellG, colorize(mergeGeometries([crab, ...legs]), (x, y, z, c) => c.set('#d9503a')), eyes(1, 0.12, 0.18, 0.12, 0.02)]);
  const m = new THREE.Mesh(g, bodyMat()); m.castShadow = true; obj.add(m); return { m };
}, { length: 0.35, height: 0.3, walk: 0.25, anim: (p, ph, mv) => { p.m.position.y = Math.abs(Math.sin(ph * 2)) * 0.01 * mv; } });

// 1.3.2: simple stand-ins for the two that had only a Blender model, so a missing or broken model never stops the reef
// blacktip reef shark: a long grey body, white belly, a tall dorsal fin and a tail with a longer upper lobe, black tips
FISH.reefshark = { L: 1.7, H: 0.2, W: 0.1, fin: '#6a7078', tailCol: '#5a6068', speed: 3.2, eye: 0.025,
  prof: (t) => { const k = Math.sin(Math.PI * Math.pow(t, 0.7)); return [Math.max(0.01, 0.1 * 1.7 * k), Math.max(0.01, 0.2 * 1.7 * 0.5 * k), 0]; },
  color: (t, up, c) => { c.set('#8a9098').lerp(col('#f2f0ea'), smoothstep(-0.1, -0.6, up)); if (t > 0.94) c.lerp(col('#5a6068'), 0.4); },
  dorsal: [[0.12, -0.2], [0.42, -0.1], [0.14, 0.06]],
  tail: [[0, 0], [0.42, -0.5], [0.1, -0.24], [-0.22, -0.4]],
  pec: [[0, 0], [-0.24, -0.32], [-0.02, -0.08]],
  extra(body, L) {   // the black fin tips that give it its name
    const m = new THREE.MeshStandardMaterial({ color: '#16181c', roughness: 0.6, side: THREE.DoubleSide });
    const d = new THREE.Mesh(fin([[0.36, -0.12], [0.42, -0.1], [0.34, -0.06]]), m); body.add(d);
  } };
// moon jellyfish: a see-through bell that pulses, four pale rings and short soft tentacles
function makeJelly(opts) {
  const rng = opts.rng || makeRng(opts.seed || 1);
  const object = new THREE.Group(), body = new THREE.Group(); object.add(body);
  const bellG = new THREE.SphereGeometry(0.3, 18, 10, 0, TAU, 0, Math.PI * 0.5); bellG.scale(1, 0.6, 1);
  const bellM = new THREE.MeshStandardMaterial({ color: '#d8ccf0', roughness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const bell = new THREE.Mesh(bellG, bellM); body.add(bell);
  const ringM = new THREE.MeshStandardMaterial({ color: '#b48ad8', roughness: 0.4, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), ringM); const a = i * Math.PI / 2 + 0.6; r.rotation.x = Math.PI / 2; r.position.set(Math.cos(a) * 0.09, 0.12, Math.sin(a) * 0.09); body.add(r); }
  const tm = new THREE.MeshStandardMaterial({ color: '#e8e0f8', roughness: 0.5, transparent: true, opacity: 0.45, depthWrite: false });
  const tents = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, g = new THREE.CylinderGeometry(0.004, 0.008, 0.36, 4); g.translate(0, -0.18, 0); const t = new THREE.Mesh(g, tm); t.position.set(Math.cos(a) * 0.26, 0.01, Math.sin(a) * 0.26); body.add(t); tents.push(t); }
  const st = { ph: rng() * TAU };
  return {
    type: 'animal', object, height: 0.55, length: 0.6, speeds: { fly: 0.8 }, actions: ['idle', 'fly', 'hover', 'glide', 'perch', 'eat', 'sleep'],
    update(dt, s) {
      st.ph += dt * (s.action === 'sleep' ? 0.8 : 2.4);
      const p = Math.sin(st.ph);
      bell.scale.set(1 + 0.08 * p, 1 - 0.12 * p, 1 + 0.08 * p);
      tents.forEach((t, i) => { t.rotation.x = Math.sin(st.ph - 0.8 + i) * 0.18; t.rotation.z = Math.cos(st.ph * 0.7 + i) * 0.12; });
      body.position.y = 0.2 + p * 0.02;
    },
    dispose() { object.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }); object.removeFromParent(); },
  };
}

export const ANIMALS = {
  ...Object.fromEntries(Object.entries(FISH).map(([id, spec]) => [id, (opts) => makeFish(spec, opts)])),
  moray: makeMoray, turtle: makeTurtle, goby, shrimp, octopus, urchin, starfish, stingray, hermit, jellyfish: makeJelly,
};
export function releaseCaches() { /* each animal owns its geometry (procedural stand-ins until the Blender models) */ }
