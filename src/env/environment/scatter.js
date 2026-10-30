// Instanced ground scatter: the swaying scatter material, placement helpers (slopeQuat, samplePoints, onRock, dryLand,
// addScatter) and the zone's scatter sets (amazon: leaf litter, ferns, moss, big leaves, bushes, pebbles; grove: grass,
// seasonal flowers, thistles, pebbles, limestone chunks, garrigue shrubs). The random stream rrS continues in props.js.
// Exports: createScatter(ctx) → { scatterMeshes, scatterMaterial, slopeQuat, samplePoints, onRock, dryLand, rrS, scatterRefs }.
// Needs from ctx: U, qual, root, track, seed, isAmazon and terrain.js's heightAt, edgeR, rocks, WL, waterDist, nearBridge,
// coverAt, rockInfluence.
import * as THREE from 'three';
import { makeRng, makeNoise2D, smoothstep } from '../../core/util.js';
import { R, K, TAU, C, tmpC, V3, patchMaterial } from './common.js';
import { SAVANNA } from './savanna-look.js';
import { leafLitterGeom, fernGeom, upNormals, pebbleGeom, bigLeafGeom, blobGeom, grassTuftGeom, flowerGeom, thistleGeom } from './scatter-geoms.js';

export function createScatter(ctx) {
  const {
    U, qual, root, track, seed, isAmazon, isDesert, isSavanna, heightAt, edgeR, rocks, WL, waterDist, nearBridge, coverAt,
    rockInfluence
  } = ctx;
  // ───────────────────────────── ground scatter (instanced)
  const scatterMeshes = [];
  const SU = { ...U, uScale: { value: 1 }, uBloom: { value: new THREE.Vector4(0, 0, 0, 0) }, uSwayK: { value: 1 } };

  // 1.4.2, the savanna: one small texture holds the grass of the whole island, cell by cell (r = height, g = green,
  // b = burnt), written by the game (src/game/savanna/grass.js through env.setGrassMap). The tall grass reads it per tuft.
  const GM_N = 32;
  const grassMap = isSavanna ? track(new THREE.DataTexture(new Uint8Array(GM_N * GM_N * 4).fill(160), GM_N, GM_N, THREE.RGBAFormat)) : null;
  if (grassMap) { grassMap.magFilter = THREE.LinearFilter; grassMap.minFilter = THREE.LinearFilter; grassMap.needsUpdate = true; }
  const GU = grassMap ? { uGrassMap: { value: grassMap }, uGrassR: { value: 46 * K } } : {};
  function setGrassMap(cells) {   // cells: Uint8Array GM_N * GM_N * 4 (row z, column x; the island's square ±46K)
    if (!grassMap || !cells || cells.length !== grassMap.image.data.length) return;
    grassMap.image.data.set(cells); grassMap.needsUpdate = true;
  }

  function scatterMaterial(key, { sway = 1, extra = {}, flat = false, rough = 0.9, side = THREE.FrontSide, kinds = false, cards = false, grass = false } = {}) {
    const uniforms = { ...U, uSway: { value: sway }, uScale: { value: 1 }, ...extra, ...(grass ? GU : {}) };
    // cards: thin double-sided foliage whose (up-bent) normals must NOT be flipped on back faces
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0, flatShading: flat, side: cards ? THREE.DoubleSide : side });
    patchMaterial(mat, 'scatter-' + key, uniforms, {
      instanced: true,
      vertexPre: 'uniform float uSway; uniform float uScale;' + (kinds ? ' attribute float aKind; uniform vec4 uBloom;' : '') + (grass ? ' uniform sampler2D uGrassMap; uniform float uGrassR; varying vec3 vGm;' : ''),
      vertexBegin: /* glsl */`
        float _s = uScale ${kinds ? '* (aKind < 0.5 ? uBloom.x : aKind < 1.5 ? uBloom.y : aKind < 2.5 ? uBloom.z : uBloom.w)' : ''};
        transformed *= _s;
        vec3 _ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        ${grass ? `vec4 _gm = texture2D(uGrassMap, _ip.xz / (2.0 * uGrassR) + 0.5); vGm = _gm.rgb;
        transformed.y *= 0.1 + 1.25 * _gm.r; transformed.xz *= 0.55 + 0.6 * _gm.r;` : ''}
        float _ph = _ip.x * 0.37 + _ip.z * 0.29;
        float _h = max(transformed.y, 0.0) * uSway;
        float _g = sin(uTime * (1.4 + uWind * 2.2) + _ph) + 0.5 * sin(uTime * 3.1 + _ph * 1.7);
        transformed.x += _g * _h * (0.05 + 0.28 * uWind);
        transformed.z += cos(uTime * (1.1 + uWind * 1.8) + _ph * 1.3) * _h * (0.03 + 0.16 * uWind);`,
      colorVertex: kinds ? /* glsl */`
        vColor = vec4(1.0);
        vColor.rgb *= color.rgb;
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb = mix(vColor.rgb, vColor.rgb * instanceColor.rgb, step(0.985, color.r) * step(0.985, color.b));
        #endif` : null,
      fragPre: grass ? ' varying vec3 vGm;' : '',
      fragColor: /* glsl */`
        ${grass ? 'diffuseColor.rgb *= mix(vec3(1.18, 1.0, 0.62), vec3(0.72, 1.02, 0.5), vGm.g); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.065, 0.05), vGm.b * 0.85);' : ''}
        diffuseColor.rgb = vitalGrade(diffuseColor.rgb) * (1.0 - 0.25 * uWet);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.045, 0.04), scorchAt(vWPos.xz) * 0.92);`,
      fragRough: 'roughnessFactor = mix(roughnessFactor, 0.35, uWet * 0.7);',
      cards,
    });
    mat.userData.uniforms = uniforms;
    return track(mat);
  }

  function slopeQuat(x, z, yaw, follow = 1) {
    const e = 0.5;
    const nx = heightAt(x - e, z) - heightAt(x + e, z), nz = heightAt(x, z - e) - heightAt(x, z + e);
    const n = V3(nx * follow, 2 * e, nz * follow).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), n);
    return q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw));
  }

  function samplePoints(n, rmin, rmax, accept, rr) {
    // 1.4.2: radii are given for the usual island; a bigger one (K) spreads them out and keeps the same density
    if (K !== 1) { n = Math.round(n * K * K); rmin *= K; rmax *= K; }
    const out = []; let tries = 0;
    while (out.length < n && tries < n * 30) {
      tries++;
      const th = rr() * TAU; const er = edgeR(th);
      const lo = Math.min(rmin, er), hi = Math.min(rmax, er - 0.4);
      if (hi <= lo) continue;
      const r = Math.sqrt(lo * lo + rr() * (hi * hi - lo * lo));
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      if (accept && !accept(x, z, r, er)) continue;
      out.push({ x, z, r, er });
    }
    return out;
  }
  const onRock = (x, z, pad = 0) => rocks.some(rk => rk.boulders.some(b => Math.hypot(x - b.x, z - b.z) < b.r * 0.95 + pad));
  const dryLand = (pad = 0.3) => (x, z) => (WL === null || waterDist(x, z) > pad) && !onRock(x, z) && !nearBridge(x, z, 0.6);

  function addScatter(name, geom, mat, items, { castShadow = false, colors = null, kinds = null } = {}) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geom, mat, items.length);
    const m = new THREE.Matrix4();
    items.forEach((it, i) => {
      m.compose(it.p, it.q, it.s);
      mesh.setMatrixAt(i, m);
      if (it.c) mesh.setColorAt(i, it.c);
    });
    if (kinds) geom.setAttribute('aKind', new THREE.InstancedBufferAttribute(new Float32Array(kinds), 1));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow && qual.shadowScatter; mesh.receiveShadow = true;
    mesh.name = 'scatter-' + name; mesh.userData.fullCount = items.length;
    mesh.frustumCulled = false;
    root.add(mesh); scatterMeshes.push(mesh); track(geom);
    return mesh;
  }


  // Build scatter -----------------------------------------------------------
  const sd = qual.scatter * (ctx.bare ? 0.12 : 1); const N = (n) => Math.max(1, Math.round(n * sd));
  const rrS = makeRng(seed * 977 + 13);
  const scatterRefs = {};
  if (isAmazon) {
    // leaf litter
    {
      const pts = samplePoints(N(5000), 0, 46, dryLand(0.2), rrS);
      const pal = ['#7a4a26', '#8d5a2c', '#5e3a20', '#9a6a32', '#6b4a2a', '#a5562a', '#556030'].map(C);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) + 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(0.25 + rrS() * 0.35), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.8 + rrS() * 0.4) }));
      scatterRefs.litter = addScatter('litter', leafLitterGeom(), scatterMaterial('litter', { sway: 0, cards: true, rough: 0.95 }), items);
    }
    // small ferns (denser at rim and near water)
    {
      const pts = samplePoints(N(900), 0, 46, (x, z, r) => dryLand(0.4)(x, z) && (rrS() < 0.35 + smoothstep(R - 4, R + 3, r) * 0.65 + (waterDist(x, z) < 5 ? 0.4 : 0)), rrS);
      const geo = upNormals(fernGeom(makeRng(5)), 0.6);
      const pal = ['#3d6a24', '#4f7a2a', '#2f5a20', '#5a8a32'].map(C);
      const items = pts.map(p => { const big = smoothstep(R - 2, R + 4, p.r); return { p: V3(p.x, heightAt(p.x, p.z) - 0.05, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.5), s: V3(1, 1, 1).multiplyScalar((0.7 + rrS() * 0.7) * (1 + big * 0.9)), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.85 + rrS() * 0.3) }; });
      scatterRefs.fern = addScatter('fern', geo, scatterMaterial('fern', { sway: 0.5, cards: true, rough: 0.8 }), items);
    }
    // moss clumps
    {
      const pts = samplePoints(N(420), 0, 46, dryLand(0.1), rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.05, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(0.4 + rrS() * 0.7, 0.35 + rrS() * 0.3, 0.4 + rrS() * 0.7), c: C(rrS() < 0.5 ? '#3f6420' : '#58782a').multiplyScalar(0.8 + rrS() * 0.3) }));
      scatterRefs.moss = addScatter('moss', pebbleGeom(makeRng(9), 0.5, 1), scatterMaterial('moss', { sway: 0, flat: true }), items);
    }
    // big leafy plants at the rim & river banks
    {
      const pts = samplePoints(N(260), 25, 46, (x, z, r) => dryLand(0.6)(x, z) && (r > R + 1 || waterDist(x, z) < 3.5), rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.05, p.z), q: new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(1.1 + rrS() * 1.3), c: C(rrS() < 0.5 ? '#3e7a2a' : '#2f6424').multiplyScalar(0.85 + rrS() * 0.3) }));
      scatterRefs.bigleaf = addScatter('bigleaf', upNormals(bigLeafGeom(makeRng(17)), 0.55), scatterMaterial('bigleaf', { sway: 0.35, cards: true, rough: 0.7 }), items, { castShadow: true });
    }
    // rim bushes (frame the diorama)
    {
      const pts = samplePoints(N(220), R + 1.5, 46, dryLand(0.8), rrS);
      const pal = ['#2c5a20', '#3a6a24', '#24501c', '#4a7a2a'].map(C);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.2, p.z), q: new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rrS() * TAU), s: V3(1, 0.8 + rrS() * 0.5, 1).multiplyScalar(1.4 + rrS() * 1.8), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.85 + rrS() * 0.3) }));
      scatterRefs.bush = addScatter('bush', blobGeom(makeRng(21), 6, 0.7), scatterMaterial('bush', { sway: 0.08, flat: true, rough: 0.85 }), items, { castShadow: true });
    }
    // river pebbles
    {
      const pts = samplePoints(N(260), 0, 46, (x, z) => { const d = waterDist(x, z); return d > -0.8 && d < 1.2; }, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z), p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(0.1 + rrS() * 0.25), c: C(rrS() < 0.5 ? '#7a7062' : '#5a5448').multiplyScalar(0.8 + rrS() * 0.4) }));
      scatterRefs.pebble = addScatter('pebble', pebbleGeom(makeRng(3)), scatterMaterial('pebble', { sway: 0, flat: true }), items);
    }
  } else if (isSavanna) {
    // 1.4.2, the savanna: a sea of tall grass (its height, green and burnt patches come from the game's grass map), short
    // lawn grass between, a few white and yellow flowers after the rains, granite gravel by the kopje, red-earth pebbles,
    // reeds by the river, and low thorny bushes at the rim
    {
      const pts = samplePoints(N(11000), 0, 46, (x, z) => dryLand(0.5)(x, z) && rrS() < 0.45 + coverAt(x, z) * 0.7, rrS);
      const geo = grassTuftGeom(10, makeRng(37));
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.04, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.3), s: V3(1.5, 1.5 + rrS() * 1.0, 1.5).multiplyScalar(0.55 + rrS() * 0.35), c: tmpC.setHSL(0, 0, 0.82 + rrS() * 0.3).clone() }));
      upNormals(geo, 1);
      scatterRefs.grass = addScatter('grass', geo, scatterMaterial('sav-grass', { sway: 1.2, cards: true, rough: 0.92, grass: true }), items);
    }
    {
      const pts = samplePoints(N(2600), 0, 46, (x, z) => dryLand(0.3)(x, z) && rrS() < 0.5, rrS);
      const geo = grassTuftGeom(4, makeRng(43));
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.5), s: V3(1, 0.45 + rrS() * 0.3, 1).multiplyScalar(0.35 + rrS() * 0.25), c: tmpC.setHSL(0, 0, 0.8 + rrS() * 0.25).clone() }));
      upNormals(geo, 1);
      scatterRefs.lawn = addScatter('lawn', geo, scatterMaterial('lawn', { sway: 0.6, cards: true, rough: 0.9 }), items);
    }
    {
      const pts = samplePoints(N(900), 0, 45, (x, z) => dryLand(0.4)(x, z) && rocks.every(rk => Math.hypot(x - rk.x, z - rk.z) > rk.r), rrS);
      const kinds = []; const cols = { 0: C('#f4f0ea'), 1: C('#f2c41e'), 2: C('#e88a3a'), 3: C('#b46ad8') };
      const fn = makeNoise2D(seed + 77);
      const items = pts.map(p => { const v = fn(p.x * 0.07, p.z * 0.07); const k = v > 0.2 ? 0 : v > -0.1 ? 1 : v > -0.35 ? 2 : 3; kinds.push(k); return { p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.3), s: V3(1, 1, 1).multiplyScalar(0.8 + rrS() * 0.5), c: cols[k].clone() }; });
      scatterRefs.flower = addScatter('flower', upNormals(flowerGeom(), 0.8), scatterMaterial('flower', { sway: 1, cards: true, kinds: true, rough: 0.6, extra: { uBloom: { value: new THREE.Vector4(1, 1, 1, 1) } } }), items, { kinds });
    }
    {
      const pts = samplePoints(N(1000), 0, 46, (x, z) => (WL === null || waterDist(x, z) > -0.6) && !onRock(x, z) && rrS() < 0.25 + rockInfluence(x, z) * 1.2, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(0.05 + rrS() * 0.15), c: C(rrS() < 0.5 ? '#a8604a' : rrS() < 0.6 ? '#9a9286' : '#6a5a4a').multiplyScalar(0.8 + rrS() * 0.35) }));
      scatterRefs.pebble = addScatter('pebble', pebbleGeom(makeRng(3)), scatterMaterial('pebble', { sway: 0, flat: true }), items);
    }
    {
      const pts = samplePoints(N(300), 0, 46, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.1 + rockInfluence(x, z) * 1.8, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.1, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 0.7 + rrS() * 0.5, 1).multiplyScalar(0.3 + rrS() * 0.6), c: C(SAVANNA.rockA).multiplyScalar(0.8 + rrS() * 0.3) }));
      scatterRefs.chunk = addScatter('chunk', pebbleGeom(makeRng(8), 0.75, 0), scatterMaterial('chunk', { sway: 0, flat: true }), items, { castShadow: true });
    }
    {   // reeds along the river and the waterholes
      const pts = samplePoints(N(700), 0, 46, (x, z) => { const d = waterDist(x, z); return d > 0.1 && d < 1.8 && !nearBridge(x, z, 0.8); }, rrS);
      const geo = grassTuftGeom(6, makeRng(53));
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.05, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.2), s: V3(1, 2.6 + rrS() * 1.2, 1).multiplyScalar(0.45 + rrS() * 0.3), c: C(rrS() < 0.5 ? '#6a8a3a' : '#8a9a4a').multiplyScalar(0.9 + rrS() * 0.2) }));
      upNormals(geo, 1);
      scatterRefs.reed = addScatter('reed', geo, scatterMaterial('reed', { sway: 0.8, cards: true, rough: 0.85 }), items);
    }
    {
      const pts = samplePoints(N(140), 38 + 1.2, 46, dryLand(0.8), rrS);   // (radii of the usual island: samplePoints scales them)
      const pal = ['#6a6a3a', '#7a7444', '#5a5a32', '#8a7a4a'].map(C);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.15, p.z), q: new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rrS() * TAU), s: V3(1, 0.55 + rrS() * 0.3, 1).multiplyScalar(0.8 + rrS() * 1.0), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.85 + rrS() * 0.3) }));
      scatterRefs.bush = addScatter('bush', blobGeom(makeRng(21), 5, 0.6), scatterMaterial('bush', { sway: 0.05, flat: true, rough: 0.9 }), items, { castShadow: true });
    }
  } else if (isDesert) {
    // the desert: sparse dry tufts (green after rain, by update.js), flowers that open only after rain, flint and
    // sandstone pebbles, sandstone chunks by the outcrops, a few low grey shrubs at the rim
    {
      const pts = samplePoints(N(1800), 0, 46, (x, z) => dryLand(0.25)(x, z) && rrS() < 0.08 + coverAt(x, z) * 0.9, rrS);
      const geo = grassTuftGeom(5, makeRng(31));
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.4), s: V3(1, 0.6 + rrS() * 0.6, 1).multiplyScalar(0.3 + rrS() * 0.3), c: tmpC.setHSL(0, 0, 0.82 + rrS() * 0.3).clone() }));
      upNormals(geo, 1);
      scatterRefs.grass = addScatter('grass', geo, scatterMaterial('grass', { sway: 1, cards: true, rough: 0.9 }), items);
    }
    {
      const pts = samplePoints(N(1600), 0, 45, (x, z) => dryLand(0.3)(x, z) && rocks.every(rk => Math.hypot(x - rk.x, z - rk.z) > rk.r * 0.9), rrS);
      const kinds = []; const cols = { 0: C('#b46ad8'), 1: C('#f2c41e'), 2: C('#f4f0ea'), 3: C('#ec6aa0') };
      const fn = makeNoise2D(seed + 99);
      const items = pts.map(p => {
        const v = fn(p.x * 0.08, p.z * 0.08);
        const k = v > 0.15 ? 1 : v > -0.1 ? (rrS() < 0.5 ? 0 : 2) : 3;
        kinds.push(k);
        return { p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.3), s: V3(1, 1, 1).multiplyScalar(0.8 + rrS() * 0.5), c: cols[k].clone() };
      });
      scatterRefs.flower = addScatter('flower', upNormals(flowerGeom(), 0.8), scatterMaterial('flower', { sway: 1, cards: true, kinds: true, rough: 0.6, extra: { uBloom: { value: new THREE.Vector4(0, 0, 0, 0) } } }), items, { kinds });
    }
    {
      const pts = samplePoints(N(1300), 0, 46, (x, z) => (WL === null || waterDist(x, z) > -0.6) && !onRock(x, z) && rrS() < 0.3 + rockInfluence(x, z), rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(0.05 + rrS() * 0.14), c: C(rrS() < 0.55 ? '#d8a878' : rrS() < 0.5 ? '#5a4a3e' : '#b07048').multiplyScalar(0.8 + rrS() * 0.35) }));
      scatterRefs.pebble = addScatter('pebble', pebbleGeom(makeRng(3)), scatterMaterial('pebble', { sway: 0, flat: true }), items);
    }
    {
      const pts = samplePoints(N(320), 0, 46, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.2 + rockInfluence(x, z) * 1.6, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.08, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 0.6 + rrS() * 0.5, 1).multiplyScalar(0.25 + rrS() * 0.5), c: C('#cc8c5c').multiplyScalar(0.8 + rrS() * 0.3) }));
      scatterRefs.chunk = addScatter('chunk', pebbleGeom(makeRng(8), 0.6, 0), scatterMaterial('chunk', { sway: 0, flat: true }), items, { castShadow: true });
    }
    {
      const pts = samplePoints(N(110), R + 1.2, 46, dryLand(0.8), rrS);
      const pal = ['#8a9070', '#9a9a78', '#7a8062', '#a8a080'].map(C);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.15, p.z), q: new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rrS() * TAU), s: V3(1, 0.6 + rrS() * 0.3, 1).multiplyScalar(0.6 + rrS() * 0.8), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.85 + rrS() * 0.3) }));
      scatterRefs.bush = addScatter('bush', blobGeom(makeRng(21), 5, 0.65), scatterMaterial('bush', { sway: 0.06, flat: true, rough: 0.9 }), items, { castShadow: true });
    }
  } else {
    // grass tufts
    {
      const pts = samplePoints(N(8000), 0, 46, (x, z, r) => dryLand(0.25)(x, z) && rrS() < 0.25 + coverAt(x, z) * 0.85, rrS);
      const geo = grassTuftGeom(6, makeRng(31));
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.4), s: V3(1, 0.7 + rrS() * 0.7, 1).multiplyScalar(0.35 + rrS() * 0.35), c: tmpC.setHSL(0, 0, 0.82 + rrS() * 0.3).clone() }));
      upNormals(geo, 1);
      scatterRefs.grass = addScatter('grass', geo, scatterMaterial('grass', { sway: 1, cards: true, rough: 0.9 }), items);
    }
    // flowers by season
    {
      const pts = samplePoints(N(2200), 0, 45, (x, z) => dryLand(0.3)(x, z) && rocks.every(rk => Math.hypot(x - rk.x, z - rk.z) > rk.r * 0.9), rrS);
      const kinds = []; const cols = { 0: C('#e8202a'), 1: C('#f2c41e'), 2: C('#f4f0ea'), 3: C('#f0eadc') };
      const fn = makeNoise2D(seed + 99);
      const items = pts.map(p => {
        // clustered patches: kind chosen by noise so colours form drifts
        const v = fn(p.x * 0.08, p.z * 0.08);
        const k = v > 0.0 ? (rrS() < 0.85 ? 0 : 2) : v > -0.25 ? (rrS() < 0.5 ? 1 : 2) : (rrS() < 0.6 ? 1 : 3);
        kinds.push(k);
        const c = cols[k].clone(); if (k === 0 && rrS() < 0.12) c.set('#d8e0f8'); if (k === 0 && rrS() < 0.1) c.set('#a83a8a');
        return { p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.3), s: V3(1, 1, 1).multiplyScalar((k === 3 ? 1.6 : 0.9) + rrS() * 0.6), c };
      });
      scatterRefs.flower = addScatter('flower', upNormals(flowerGeom(), 0.8), scatterMaterial('flower', { sway: 1, cards: true, kinds: true, rough: 0.6, extra: { uBloom: { value: new THREE.Vector4(1, 1, 1, 1) } } }), items, { kinds });
    }
    // thistles (summer/autumn)
    {
      const pts = samplePoints(N(420), 0, 46, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.6, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.3), s: V3(1, 1, 1).multiplyScalar(0.7 + rrS() * 0.7), c: tmpC.setHSL(0, 0, 0.85 + rrS() * 0.25).clone() }));
      scatterRefs.thistle = addScatter('thistle', upNormals(thistleGeom(makeRng(41)), 0.7), scatterMaterial('thistle', { sway: 0.6, cards: true }), items);
    }
    // pebbles (terra rossa / limestone)
    {
      const pts = samplePoints(N(900), 0, 46, (x, z) => (WL === null || waterDist(x, z) > -0.6) && !onRock(x, z) && rrS() < 0.25 + rockInfluence(x, z), rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(0.06 + rrS() * 0.16), c: C(rrS() < 0.65 ? '#d6cbb2' : '#9a5a3a').multiplyScalar(0.8 + rrS() * 0.35) }));
      scatterRefs.pebble = addScatter('pebble', pebbleGeom(makeRng(3)), scatterMaterial('pebble', { sway: 0, flat: true }), items);
    }
    // limestone chunks
    {
      const pts = samplePoints(N(300), 0, 46, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.3 + rockInfluence(x, z) * 1.5, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.08, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 0.6 + rrS() * 0.5, 1).multiplyScalar(0.25 + rrS() * 0.5), c: C('#ddd3bc').multiplyScalar(0.8 + rrS() * 0.3) }));
      scatterRefs.chunk = addScatter('chunk', pebbleGeom(makeRng(8), 0.6, 0), scatterMaterial('chunk', { sway: 0, flat: true }), items, { castShadow: true });
    }
    // garrigue shrubs at the rim
    {
      const pts = samplePoints(N(200), R + 1.2, 46, dryLand(0.8), rrS);
      const pal = ['#4a5e2a', '#5a6a32', '#3e5426', '#6a7038'].map(C);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.15, p.z), q: new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rrS() * TAU), s: V3(1, 0.7 + rrS() * 0.4, 1).multiplyScalar(0.9 + rrS() * 1.3), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.85 + rrS() * 0.3) }));
      scatterRefs.bush = addScatter('bush', blobGeom(makeRng(21), 5, 0.65), scatterMaterial('bush', { sway: 0.06, flat: true, rough: 0.85 }), items, { castShadow: true });
    }
  }
  return { scatterMeshes, scatterMaterial, slopeQuat, samplePoints, onRock, dryLand, rrS, scatterRefs, setGrassMap, GM_N };
}
