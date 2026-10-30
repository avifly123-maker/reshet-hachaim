// The distant land around and below the island: the far-land ring mesh (jungle plain or terraced hills) with its haze
// material, and the instanced far crowns (tree impostors baked from the zone's own trees, or simple faceted crowns).
// Exports: createFarLand(ctx) → { farMesh, farMat, farCrowns }.
// Needs from ctx: seed, isAmazon, quality, pano, farHills (sky.js), impostorTrees, pipeline, track, root.
import * as THREE from 'three';
import { desertFar } from './desert-look.js';
import { makeRng, makeNoise2D, clamp, smoothstep } from '../../core/util.js';
import { TAU, C, tmpC, V3, bump } from './common.js';
import { bakeImpostors, patchImpostorMaterial, impostorQuad } from '../impostors.js';

export function createFarLand(ctx) {
  const { seed, isAmazon, isDesert, quality, pano, farHills, impostorTrees, pipeline, track, root } = ctx;
  // ───────────────────────────── distant land (silhouettes below / around)
  let farMesh, farMat, farCrowns = null;
  const farRs = [];
  const fnRing = makeNoise2D(seed * 43 + 5);
  // amazon: a wall of jungle rising out of the mist around the island
  const jungleRing = (x, z, r) => 40 * bump(r, 62, 105, 170, 270) * (0.7 + 0.45 * fnRing(x * 0.02, z * 0.02));
  function makeHazeMat(key, opts) {
    const m = track(new THREE.MeshLambertMaterial(opts));
    m.userData.haze = { value: 0.35 };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uHaze = m.userData.haze;
      sh.fragmentShader = sh.fragmentShader.replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nuniform float uHaze;')
        .replace('#include <fog_fragment>', `#ifdef USE_FOG
          float fogF = clamp(smoothstep(fogNear * 0.6, fogFar * 1.1, vFogDepth) + uHaze, 0.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogF);
        #endif`);
    };
    m.customProgramCacheKey = () => 'env-haze-' + key;
    return m;
  }
  {
    const NS = 200, NRr = 46;
    const r0 = 4, r1 = 520;
    const pos = [], col = [], idx = [];
    const fn = makeNoise2D(seed * 41 + 2);
    // distant river on amazon plain
    const farRiver = (x, z) => { // signed distance to a meandering line
      const zz = z - (-30 + 70 * Math.sin(x * 0.006 + 1.2) + 18 * Math.sin(x * 0.019));
      return Math.abs(zz + 140);
    };
    for (let i = 0; i <= NRr; i++) {
      const f = i / NRr; const r = r0 + (r1 - r0) * Math.pow(f, 1.6);
      farRs.push(r);
      for (let j = 0; j < NS; j++) {
        const th = j / NS * TAU; const x = Math.cos(th) * r, z = Math.sin(th) * r;
        let y, c = tmpC;
        if (isAmazon) {
          const crowns = fn(x * 0.09, z * 0.09) * 1.8 + fn(x * 0.025 + 5, z * 0.025) * 5;
          y = -78 + crowns * 1.4 + jungleRing(x, z, r);
          const hills = (Math.max(0, fn(x * 0.006 + 9, z * 0.006 - 4)) * 70 + 30) * smoothstep(240, 420, r) * farHills;
          y += hills;
          const rd = farRiver(x, z);
          y -= smoothstep(16, 5, rd) * 6;
          c.set('#1a3a16').lerp(C('#3a6624'), fn(x * 0.07 + 3, z * 0.07) * 0.5 + 0.5);
          c.multiplyScalar(0.75 + 0.5 * ((Math.sin(x * 1.7 + z * 0.3) * Math.cos(z * 1.3 - x * 0.2)) * 0.5 + 0.5));
          if (fn(x * 0.15 + 30, z * 0.15) > 0.62) c.lerp(C('#a8a040'), 0.18);
          if (fn(x * 0.13 - 30, z * 0.13 + 9) > 0.66) c.lerp(C('#a45a70'), 0.15);
          if (rd < 9) c.set('#8a8a6a');
        } else if (isDesert) {
          y = desertFar(x, z, r, fn, farHills, c).y;
        } else {
          let hh = (fn(x * 0.008 + 3, z * 0.008) * 0.5 + 0.5) * 45 + fn(x * 0.03, z * 0.03) * 5;
          hh = hh * 0.6 + (hh * 0.8 + 45) * smoothstep(200, 400, r) * farHills;
          const st = 3.2; const fr = (hh / st) % 1;
          const terr = Math.floor(hh / st) * st + smoothstep(0.72, 1.0, fr) * st;
          y = -82 + terr;
          const riser = fr > 0.72;
          c.set(riser ? '#c4b898' : '#86783e').lerp(C(riser ? '#a89a7a' : '#5e6630'), fn(x * 0.05, z * 0.05 + 7) * 0.5 + 0.5);
          if (!riser && fn(x * 0.2 + 1, z * 0.2) > 0.2) c.lerp(C('#3a5226'), 0.6);  // olive / oak dots
        }
        pos.push(x, y, z); col.push(c.r, c.g, c.b);
      }
    }
    const ci = pos.length / 3; pos.push(0, pos[1], 0); col.push(col[0], col[1], col[2]);
    for (let j = 0; j < NS; j++) idx.push(ci, (j + 1) % NS, j);
    for (let i = 0; i < NRr; i++) {
      const a0 = i * NS, b0 = (i + 1) * NS;
      for (let j = 0; j < NS; j++) { const j1 = (j + 1) % NS; idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose();
    farMat = makeHazeMat('farland', { vertexColors: true, flatShading: true });
    farMesh = new THREE.Mesh(track(ng), farMat); farMesh.name = 'far-land';
    root.add(farMesh);

    // instanced crowns on the distant land (amazon: layered jungle canopy + emergents; grove: round dark maquis bushes)
    const nCrowns = Math.round((({ min: 0, low: 350, medium: 900, high: 1600 })[quality] ?? 900) * (isAmazon ? 2.2 : isDesert ? 0.25 : 1.4));   // the desert: a few far acacias
    if (nCrowns > 0) {
      const rr = makeRng(seed * 59 + 3);
      // sample the far-land surface by ray-free lookup: rebuild the height the same way as the loop above
      const farH = (x, z, r) => {
        if (isAmazon) {
          const rd = Math.abs(z - (-30 + 70 * Math.sin(x * 0.006 + 1.2) + 18 * Math.sin(x * 0.019)) + 140);
          return { y: -78 + (fn(x * 0.09, z * 0.09) * 1.8 + fn(x * 0.025 + 5, z * 0.025) * 5) * 1.4 + jungleRing(x, z, r) + (Math.max(0, fn(x * 0.006 + 9, z * 0.006 - 4)) * 70 + 30) * smoothstep(240, 420, r) * farHills - smoothstep(16, 5, rd) * 6, ok: rd > 12 };
        }
        if (isDesert) return desertFar(x, z, r, fn, farHills, null);
        let hh = (fn(x * 0.008 + 3, z * 0.008) * 0.5 + 0.5) * 45 + fn(x * 0.03, z * 0.03) * 5;
        hh = hh * 0.6 + (hh * 0.8 + 45) * smoothstep(200, 400, r) * farHills;
        const st = 3.2; const fr = (hh / st) % 1;
        return { y: -82 + Math.floor(hh / st) * st, ok: fr < 0.6 };
      };
      const geo = new THREE.IcosahedronGeometry(1, isAmazon ? 1 : 0);
      const items = [];
      let tries = 0;
      while (items.length < nCrowns && tries++ < nCrowns * 6) {
        const th = rr() * TAU;
        const r = isAmazon ? 72 + Math.pow(rr(), 1.5) * 220 : 85 + Math.pow(rr(), 1.1) * (pano ? 170 : 300);
        const x = Math.cos(th) * r, z = Math.sin(th) * r;
        const h = farH(x, z, r); if (!h.ok) continue;
        if (!isAmazon && fn(x * 0.2 + 1, z * 0.2) < -0.1 && rr() < 0.7) continue;   // clumped maquis
        const emergent = isAmazon && rr() < 0.07;
        const s = isAmazon ? (emergent ? 7 + rr() * 5 : 4 + rr() * 4) * (0.8 + r / 350) : (1.4 + rr() * 2.0) * (0.75 + r / 250);
        const lift = isAmazon ? (emergent ? s * 1.1 + 3 : s * 0.15) : -s * 0.45;
        const c = new THREE.Color();
        if (isAmazon) {
          c.set(rr() < 0.5 ? '#1f4a18' : '#2e5c1e').lerp(C('#163a12'), rr() * 0.7);
          if (emergent) c.lerp(C('#4e6e26'), 0.45);
          const k = rr(); if (k < 0.02) c.set('#a8962e'); else if (k < 0.032) c.set('#9a5a7e');   // a few flowering crowns
        } else if (isDesert) {
          c.set(rr() < 0.6 ? '#6a6a3a' : '#7a7442').lerp(C('#4a4a2a'), rr() * 0.4);
        } else {
          c.set(rr() < 0.6 ? '#2e4a22' : '#41582a').lerp(C('#26381c'), rr() * 0.5);
        }
        items.push({ x, y: h.y + lift, z, s, flat: isAmazon ? 0.55 + rr() * 0.2 : 0.7, c, yaw: rr() * TAU, ground: h.y, emergent });
      }
      // real tree impostors (the zone's own trees baked into a small atlas); simple faceted crowns if that is not possible
      if (impostorTrees && impostorTrees.length && pipeline.renderer) {
        let imp = null;
        try {
          imp = bakeImpostors(pipeline.renderer, impostorTrees, { cell: quality === 'high' ? 192 : 128 });
          track(imp.albedo); track(imp.normal);
          const rows = imp.rows, byRole = {};
          rows.forEach((row, i) => { const role = impostorTrees[i].role || 'tree'; (byRole[role] = byRole[role] || []).push(i); });
          const anyRole = (...names) => { for (const n of names) if (byRole[n]) return byRole[n]; return byRole[Object.keys(byRole)[0]]; };
          const ri = makeRng(seed * 61 + 9);   // own stream: the crown positions above stay exactly as they were
          const quad = track(impostorQuad());
          const aImp = new Float32Array(items.length * 3);
          const mesh = new THREE.InstancedMesh(quad, patchImpostorMaterial(makeHazeMat('farimp', {}), imp), items.length);
          const m4 = new THREE.Matrix4(), tint = new THREE.Color();
          // inner ring first: drawn roughly front-to-back from the island, so hidden tree pixels fail the depth test early
          items.slice().sort((a, b) => (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z)).forEach((it, i) => {
            let role;
            if (isAmazon) role = it.emergent ? 'emergent' : ri() < 0.14 ? 'palm' : 'canopy';
            else role = ri() < 0.6 ? 'bush' : 'tree';
            const list = isAmazon ? (role === 'emergent' ? anyRole('emergent', 'canopy') : role === 'palm' ? anyRole('palm', 'canopy') : anyRole('canopy', 'emergent'))
              : (role === 'bush' ? anyRole('bush', 'tree') : anyRole('tree', 'bush'));
            const row = list[Math.min(list.length - 1, Math.floor(ri() * list.length))], R = rows[row];
            // the old crown radius it.s sets the crown width; the tree is sunk into the far land so the canopy keeps its height
            const width = it.s * 2 * (isAmazon ? (role === 'palm' ? 0.85 : 1.2 + ri() * 0.25) : role === 'tree' ? 1.0 + ri() * 0.25 : 1.05 + ri() * 0.2);
            const sc = width / (2 * R.halfW), tall = R.above * sc;
            let base;
            if (isAmazon) base = (it.emergent ? it.ground + it.s * 1.9 + 3 : it.ground + it.s * (0.85 + ri() * 0.2)) - tall;
            else base = role === 'bush' ? it.ground - tall * 0.18 : it.ground - 0.4 - tall * 0.05;
            m4.makeScale(sc, sc, sc).setPosition(it.x, base, it.z);
            mesh.setMatrixAt(i, m4);
            // keep the far forest's palette (and so its blend with the painted horizon): each tree tinted to its crown's colour
            tint.setRGB(clamp(it.c.r / Math.max(R.mean.r, 1e-3), 0.1, 3), clamp(it.c.g / Math.max(R.mean.g, 1e-3), 0.1, 3), clamp(it.c.b / Math.max(R.mean.b, 1e-3), 0.1, 3));
            mesh.setColorAt(i, tint);
            aImp[i * 3] = it.yaw; aImp[i * 3 + 1] = row; aImp[i * 3 + 2] = Math.min(R.above * 0.6, (it.ground - base) / sc - R.above * 0.12);
          });
          quad.setAttribute('aImp', new THREE.InstancedBufferAttribute(aImp, 3));
          mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
          mesh.frustumCulled = false; mesh.name = 'far-crowns'; mesh.userData.impostors = true;
          farCrowns = mesh;
          if (typeof window !== 'undefined') window.__impBake = { ms: Math.round(imp.ms), parts: Object.fromEntries(Object.entries(imp.parts).map(([k, v]) => [k, Math.round(v)])), size: imp.size, programs: imp.programs, rows: rows.map(r => r.id) };
        } catch (e) {
          console.warn('far forest: tree impostors unavailable, using simple crowns –', e && e.message ? e.message : e);
          if (typeof window !== 'undefined') window.__impBake = { failed: String(e && e.message ? e.message : e) };
          farCrowns = null;
        }
      }
      if (!farCrowns) {
        farCrowns = new THREE.InstancedMesh(track(geo), makeHazeMat('farcrowns', { flatShading: true }), items.length);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
        items.forEach((it, i) => {
          q.setFromAxisAngle(V3(0, 1, 0), it.yaw);
          m4.compose(V3(it.x, it.y, it.z), q, V3(it.s, it.s * it.flat, it.s));
          farCrowns.setMatrixAt(i, m4); farCrowns.setColorAt(i, it.c);
        });
        farCrowns.instanceMatrix.needsUpdate = true; farCrowns.instanceColor.needsUpdate = true;
        farCrowns.frustumCulled = false; farCrowns.name = 'far-crowns';
      } else geo.dispose();
      root.add(farCrowns);
    }
  }
  return { farMesh, farMat, farCrowns };
}
