// The island's cross-section (the "skirt" under the ground): rock strata colours, the skirt mesh and its shader, and
// skirtPoint() for placing things on the cliff. Also creates the shared root material used by roots.js.
// Exports: createIslandEdge(ctx) → { skirt, skirtPoint, rootMat }.
// Needs from ctx: noise, noiseB, isAmazon, ground, heightAt, track, U, biome, root.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../../core/util.js';
import { TAU, tmpC, tmpC2, V3, patchMaterial } from './common.js';

export function createIslandEdge(ctx) {
  const { noise, noiseB, isAmazon, ground, heightAt, track, U, biome, root } = ctx;
  // ───────────────────────────── island cross-section (skirt)
  function strataColor(depth, theta, out) {
    const n = noiseB(Math.cos(theta) * 3 + depth * 0.05, Math.sin(theta) * 3) * 0.5 + 0.5;
    const d = depth + (noise(theta * 4.0, depth * 0.3) * 1.3);
    if (isAmazon) {
      if (d < 0.8) out.set('#2a1e14');
      else if (d < 2.2) out.set('#4d3420');
      else if (d < 4.6) out.set('#9a4626');
      else if (d < 5.4) out.set('#c8833e');
      else if (d < 7.8) out.set('#a3542c');
      else if (d < 8.6) out.set('#d29a52');
      else if (d < 11.5) out.set('#7a4a30');
      else if (d < 12.2) out.set('#b9875a');
      else { const b = Math.floor((d - 12.2) / 2.4) % 3; out.set(b === 0 ? '#6a5848' : b === 1 ? '#7d6650' : '#5a4c40'); }
    } else {
      if (d < 0.7) out.set('#6a3a24');
      else if (d < 2.2) out.set('#84462c');
      else if (d < 2.6) out.set('#6e3820');
      else {
        const band = Math.floor((d - 2.6) / 1.35);
        const pal = ['#cdbf9f', '#b09c78', '#d8cbb0', '#a08a68', '#c4b190', '#8f7c5e', '#bba783'];
        out.set(pal[band % pal.length]);
        const fr = ((d - 2.6) / 1.35) % 1;
        if (fr < 0.1) out.multiplyScalar(0.62);
        if (Math.floor((d - 2.6) / 4.1) % 3 === 1) out.lerp(tmpC2.set('#c08a5a'), 0.25);
      }
    }
    out.multiplyScalar(0.85 + 0.3 * n);
    return out;
  }

  function skirtProfile(ff, th) {
    const cliff = 0.2 + 0.08 * noiseB(Math.cos(th) * 2.3, Math.sin(th) * 2.3);
    if (ff < cliff) return 1 - 0.06 * ff / cliff;
    const u = (ff - cliff) / (1 - cliff);
    const lobes = 1 + 0.18 * noise(Math.cos(th) * 3 + 2, Math.sin(th) * 3 - 1);
    return 0.94 * Math.pow(Math.max(0, 1 - Math.pow(u, 1.25 * lobes)), 0.75);
  }
  function buildSkirt() {
    const NS = ground.NS, NK = 26;
    const pos = [], col = [], idx = [], dep = [];
    const topY = [];
    const depthTot = [];
    for (let j = 0; j < NS; j++) {
      const th = ground.thetas[j], er = ground.ers[j];
      const x = Math.cos(th) * er, z = Math.sin(th) * er;
      topY.push(heightAt(x, z));
      depthTot.push(27 + 7 * (noiseB(Math.cos(th) * 2 + 1, Math.sin(th) * 2) * 0.5 + 0.5));
    }
    for (let k = 0; k <= NK; k++) {
      const f = k / NK;
      for (let j = 0; j < NS; j++) {
        const th = ground.thetas[j], er = ground.ers[j];
        let y, r;
        if (k === 0) { y = topY[j]; r = er; }
        else if (k === 1) { y = topY[j] - 0.45; r = er + 0.25; }
        else {
          const ff = (k - 1) / (NK - 1);
          const depth = Math.pow(ff, 1.15) * depthTot[j];
          y = topY[j] - 0.45 - depth;
          const prof = skirtProfile(ff, th);
          const jag = noise(th * 7 + 1, ff * 9) * 1.3 + noiseB(th * 19, ff * 20) * 0.5;
          r = er * prof + jag * (0.4 + 2.0 * ff * (1 - ff)) + (k < 5 ? 0.3 : 0);
          y += noiseB(th * 11 + 3, ff * 13) * 0.6 * ff;
          if (k === NK) { r = 0; y = -36 - 2 * noise(1, 1); }
        }
        pos.push(Math.cos(th) * Math.max(r, 0), y, Math.sin(th) * Math.max(r, 0));
        const depth = topY[j] - y;
        dep.push(depth);
        const ao = lerp(1.0, 0.7, smoothstep(4, 32, depth));
        col.push(ao, ao, ao);
      }
    }
    for (let k = 0; k < NK; k++) {
      const a0 = k * NS, b0 = (k + 1) * NS;
      for (let j = 0; j < NS; j++) {
        const j1 = (j + 1) % NS;
        idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1));
    g.setIndex(idx);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose();
    return { geom: ng, topY, depthTot };
  }
  const skirt = buildSkirt();
  // strata gradient texture: depth 0..48 m → colour
  const strataTex = (() => {
    const n = 512; const d = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) { strataColor(i / n * 48, 0, tmpC); tmpC.convertLinearToSRGB(); d.set([tmpC.r * 255, tmpC.g * 255, tmpC.b * 255, 255], i * 4); }
    const t = new THREE.DataTexture(d, n, 1); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return track(t);
  })();
  const rootMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true }));
  const skirtMat = track(patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true }), 'skirt-' + biome,
    { ...U, uStrata: { value: strataTex }, uAmazon: { value: isAmazon ? 1 : 0 } }, {
      vertexPre: 'attribute float aDepth; varying float vDepth;',
      vertexBegin: 'vDepth = aDepth;',
      fragPre: 'uniform sampler2D uStrata; uniform sampler2D uNoise; uniform float uAmazon; varying float vDepth;',
      fragColor: /* glsl */`
        float ang = atan(vWPos.z, vWPos.x);
        vec4 nz = texture2D(uNoise, vec2(ang * 1.3, vWPos.y * 0.035));
        vec4 nz2 = texture2D(uNoise, vec2(ang * 5.0, vWPos.y * 0.12));
        float dd = vDepth + (nz.r - 0.5) * 1.4 + (nz2.g - 0.5) * 0.35;
        vec3 sc = texture2D(uStrata, vec2(clamp(dd / 48.0, 0.0, 1.0), 0.5)).rgb;
        sc *= 0.88 + 0.24 * nz2.b;
        if (uAmazon > 0.5) { float moss = smoothstep(0.45, 0.6, nz2.a + 0.35 * (1.0 - smoothstep(0.0, 5.0, vDepth))) * (1.0 - smoothstep(2.0, 7.0, vDepth)); sc = mix(sc, vec3(0.13, 0.2, 0.06) * (0.8 + 0.5 * nz.g), moss * 0.85); }
        diffuseColor.rgb *= sc;`,
    }));
  const skirtMesh = new THREE.Mesh(track(skirt.geom), skirtMat);
  skirtMesh.castShadow = true; skirtMesh.receiveShadow = false; skirtMesh.name = 'island-edge';
  root.add(skirtMesh);

  // skirt surface point helper (approx) for roots/rocks
  function skirtPoint(theta, depth) {
    const j = Math.round(theta / TAU * ground.NS) % ground.NS;
    const er = ground.ers[(j + ground.NS) % ground.NS];
    const ff = clamp(depth / skirt.depthTot[(j + ground.NS) % ground.NS]);
    const prof = skirtProfile(ff, theta);
    const r = er * prof;
    return V3(Math.cos(theta) * r, skirt.topY[(j + ground.NS) % ground.NS] - 0.45 - depth, Math.sin(theta) * r);
  }
  return { skirt, skirtPoint, rootMat };
}
