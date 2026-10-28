// Rocks, roots and hanging vines: the merged rock outcrops (plus edge rocks and rim boulders), the roots that stick out of
// the cliff, and the swaying vines / moss beards on the island's edge.
// Exports: createRocks(ctx) → { rockMesh, vinesMesh }.
// Needs from ctx: noiseB, seed, rocks, isAmazon, heightAt, skirtPoint, edgeR, WL, waterDist, track, root, rootMat, ground,
// skirt, U.
import * as THREE from 'three';
import { DESERT } from './desert-look.js';
import { makeRng, lerp, smoothstep, mergeGeometries } from '../../core/util.js';
import { TAU, C, tmpC, V3, patchMaterial } from './common.js';

export function createRocks(ctx) {
  const {
    noiseB, seed, rocks, isAmazon, isDesert, heightAt, skirtPoint, edgeR, WL, waterDist, track, root, rootMat,
    ground, skirt, U
  } = ctx;
  // ───────────────────────────── rocks (merged)
  function rockGeom(r, rr, flat, limestone) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position; const n = p.count;
    const k1 = rr() * 10, k2 = rr() * 10;
    for (let i = 0; i < n; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = 1 + 0.22 * noiseB(x * 1.7 + k1, z * 1.7 + y * 1.3 + k2);
      x *= d; z *= d; y *= d;
      if (limestone) { y = Math.round(y * 3.2) / 3.2 * 0.8 + y * 0.2; }  // stepped strata look
      p.setXYZ(i, x * r, y * r * flat, z * r);
    }
    g.computeVertexNormals();
    const cols = new Float32Array(n * 3);
    const nr = g.attributes.normal;
    for (let i = 0; i < n; i++) {
      const ny = nr.getY(i);
      if (limestone && isDesert) {   // sandstone: warm reds and creams, darker desert varnish on the tops
        tmpC.set(DESERT.rockA).lerp(C(DESERT.rockB), rr() * 0.6);
        if (ny < -0.2) tmpC.multiplyScalar(0.72);
        const v = noiseB(p.getX(i) * 1.3 + k1, p.getZ(i) * 1.3);
        if (v > 0.45) tmpC.lerp(C(DESERT.rockLight), 0.45);
        else if (v < -0.45 && ny > 0.2) tmpC.lerp(C(DESERT.rockDark), 0.5);
      } else if (limestone) {
        tmpC.set('#d9d0bb').lerp(C('#b3a68c'), rr() * 0.6);
        if (ny < -0.2) tmpC.multiplyScalar(0.7);
        const lich = noiseB(p.getX(i) * 1.3 + k1, p.getZ(i) * 1.3);
        if (lich > 0.45) tmpC.lerp(C('#c9a24a'), 0.45);
        else if (lich < -0.5) tmpC.lerp(C('#7d8466'), 0.5);
      } else {
        tmpC.set('#6b675c').lerp(C('#4f4c44'), rr());
        if (ny > 0.25) tmpC.lerp(C('#4a6e24'), smoothstep(0.25, 0.7, ny) * 0.9);
      }
      cols[i * 3] = tmpC.r; cols[i * 3 + 1] = tmpC.g; cols[i * 3 + 2] = tmpC.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }
  {
    const parts = [];
    const rr = makeRng(seed * 101 + 7);
    for (const rk of rocks) {
      const nb = isAmazon ? 2 + Math.floor(rr() * 2) : 3 + Math.floor(rr() * 4);
      let top = -99;
      for (let b = 0; b < nb; b++) {
        const a = rr() * TAU, dd = b === 0 ? 0 : rk.r * (0.35 + 0.45 * rr());
        const bx = rk.x + Math.cos(a) * dd, bz = rk.z + Math.sin(a) * dd;
        const br = (b === 0 ? rk.r * 0.75 : rk.r * (0.35 + 0.3 * rr()));
        const flat = isAmazon ? 0.7 + rr() * 0.2 : 0.55 + rr() * 0.3;
        const g = rockGeom(br, rr, flat, !isAmazon);
        const m = new THREE.Matrix4().compose(V3(bx, heightAt(bx, bz) - br * flat * 0.3, bz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rr() * 0.3 - 0.15, rr() * TAU, rr() * 0.3 - 0.15)), V3(1, 1, 1));
        g.applyMatrix4(m);
        parts.push(g);
        top = Math.max(top, heightAt(bx, bz) - br * flat * 0.3 + br * flat * 1.05);
        rk.boulders.push({ x: bx, z: bz, r: br });
      }
      rk.top = top;
    }
    // edge rocks protruding from the skirt
    const nEdge = isAmazon ? 26 : 40;
    for (let i = 0; i < nEdge; i++) {
      const th = rr() * TAU, depth = 0.8 + rr() * (isAmazon ? 6 : 8);
      const p = skirtPoint(th, depth);
      const br = 0.6 + rr() * (isAmazon ? 1.4 : 1.1);
      const g = rockGeom(br, rr, isAmazon ? 0.8 : 0.45 + rr() * 0.2, !isAmazon);
      g.applyMatrix4(new THREE.Matrix4().compose(p.addScaledVector(V3(Math.cos(th), 0, Math.sin(th)), br * 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rr() * TAU, 0)), V3(1, 1, 1)));
      parts.push(g);
    }
    // rim boulders on the lip
    const nRim = isAmazon ? 10 : 22;
    for (let i = 0; i < nRim; i++) {
      const th = rr() * TAU; const er = edgeR(th) - 1.2 - rr() * 3;
      const x = Math.cos(th) * er, z = Math.sin(th) * er;
      if (WL !== null && waterDist(x, z) < 3) continue;
      const br = 0.6 + rr() * 1.4;
      const g = rockGeom(br, rr, 0.6, !isAmazon);
      g.applyMatrix4(new THREE.Matrix4().compose(V3(x, heightAt(x, z) - br * 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rr() * TAU, 0)), V3(1, 1, 1)));
      parts.push(g);
    }
    const merged = mergeGeometries(parts); parts.forEach(p => p.dispose());
    const rockMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, flatShading: true }));
    var rockMesh = new THREE.Mesh(track(merged), rockMat);
    rockMesh.castShadow = rockMesh.receiveShadow = true; rockMesh.name = 'rocks';
    root.add(rockMesh);
  }

  // ───────────────────────────── roots & hanging vines on the edge
  {
    const rr = makeRng(seed * 211 + 3);
    const parts = [];
    const nRoots = isAmazon ? 46 : 22;
    for (let i = 0; i < nRoots; i++) {
      const th = rr() * TAU, depth = 0.3 + rr() * (isAmazon ? 4 : 2.5);
      const p0 = skirtPoint(th, depth);
      const out = V3(Math.cos(th), 0, Math.sin(th));
      const len = 1.5 + rr() * (isAmazon ? 5 : 2.5);
      const p1 = p0.clone().addScaledVector(out, len * 0.45).add(V3(0, -len * 0.2, 0));
      const p2 = p0.clone().addScaledVector(out, len * 0.3).add(V3((rr() - 0.5) * 1.5, -len, (rr() - 0.5) * 1.5));
      p0.addScaledVector(out, -0.6);
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const rad = (isAmazon ? 0.1 : 0.06) + rr() * 0.12;
      const tg = new THREE.TubeGeometry(curve, 8, rad, 5, false);
      // taper
      const pa = tg.attributes.position; const n = pa.count;
      for (let v = 0; v < n; v++) {
        const seg = Math.floor(v / 6) / 8; const c = curve.getPoint(Math.min(seg, 1));
        const x = pa.getX(v), y = pa.getY(v), z = pa.getZ(v);
        const k = lerp(1, 0.15, seg);
        pa.setXYZ(v, c.x + (x - c.x) * k, c.y + (y - c.y) * k, c.z + (z - c.z) * k);
      }
      tg.computeVertexNormals();
      const cc = tmpC.set(isAmazon ? '#4b3424' : '#55392a').multiplyScalar(0.8 + rr() * 0.4);
      const ca = new Float32Array(n * 3); for (let v = 0; v < n; v++) { ca[v * 3] = cc.r; ca[v * 3 + 1] = cc.g; ca[v * 3 + 2] = cc.b; }
      tg.setAttribute('color', new THREE.BufferAttribute(ca, 3));
      tg.deleteAttribute('uv');
      parts.push(tg);
    }
    const merged = mergeGeometries(parts); parts.forEach(p => p.dispose());
    const m = new THREE.Mesh(track(merged), rootMat);
    m.castShadow = true; m.name = 'roots';
    root.add(m);
  }

  // hanging vines / moss beards (own geometry with sway attribute)
  let vinesMesh = null;
  {
    const rr = makeRng(seed * 307 + 1);
    const nV = isAmazon ? 150 : isDesert ? 0 : 34;   // the desert's edge has no hanging plants
    const pos = [], col = [], hang = [], idx = [];
    for (let i = 0; i < nV; i++) {
      const th = rr() * TAU;
      const j = Math.round(th / TAU * ground.NS) % ground.NS;
      const er = ground.ers[j];
      const y0 = skirt.topY[j] - 0.1 - rr() * 0.6;
      const r0 = er + 0.15;
      const len = isAmazon ? 1.5 + rr() * rr() * 11 : 0.6 + rr() * 1.4;
      const w = isAmazon ? 0.18 + rr() * 0.4 : 0.25 + rr() * 0.3;
      const segs = 7;
      const out = V3(Math.cos(th), 0, Math.sin(th));
      const side = V3(-Math.sin(th), 0, Math.cos(th));
      const base = pos.length / 3;
      const cA = C(isAmazon ? (rr() < 0.3 ? '#6f8a3a' : '#3f5f22') : '#9a8a5a');
      const cB = C(isAmazon ? (rr() < 0.5 ? '#9ab04e' : '#56782c') : '#c2ae78');
      const bend = (rr() - 0.5) * 0.6;
      for (let s = 0; s <= segs; s++) {
        const f = s / segs;
        const y = y0 - f * len;
        const ww = w * (1 - f * 0.7) * (isAmazon && rr() < 0.2 ? 1.6 : 1);
        const curlOut = Math.sin(f * 2.5) * 0.4 + 0.1;
        const c = V3(Math.cos(th) * (r0 + curlOut) + side.x * bend * f, y, Math.sin(th) * (r0 + curlOut) + side.z * bend * f);
        // skirt goes inward with depth – vine hangs straight so it naturally separates
        for (const sgn of [-1, 1]) {
          const p = c.clone().addScaledVector(side, sgn * ww * 0.5).addScaledVector(out, (rr() - 0.5) * 0.1);
          pos.push(p.x, p.y, p.z);
          tmpC.copy(cA).lerp(cB, f).multiplyScalar(0.85 + rr() * 0.3);
          col.push(tmpC.r, tmpC.g, tmpC.b); hang.push(f * len);
        }
      }
      for (let s = 0; s < segs; s++) { const a = base + s * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aHang', new THREE.Float32BufferAttribute(hang, 1));
    g.setIndex(idx); g.computeVertexNormals();
    const mat = track(patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), 'vines', U, {
      vertexPre: 'attribute float aHang;',
      vertexBegin: 'float _ph = position.x * 0.2 + position.z * 0.17; transformed.x += sin(uTime * 0.9 + _ph) * aHang * (0.03 + 0.06 * uWind); transformed.z += cos(uTime * 0.7 + _ph) * aHang * (0.03 + 0.06 * uWind);',
      fragColor: 'diffuseColor.rgb = vitalGrade(diffuseColor.rgb);',
    }));
    vinesMesh = new THREE.Mesh(track(g), mat); vinesMesh.castShadow = true; vinesMesh.name = 'vines';
    root.add(vinesMesh);
  }
  return { rockMesh, vinesMesh };
}
