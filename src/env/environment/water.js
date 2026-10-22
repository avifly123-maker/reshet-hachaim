// Water: the shared water shader, the amazon river ribbon, spring pool, fallen-log crossings (the log meshes) and the
// waterfall off the island's edge; the grove's spring pool.
// Exports: createWater(ctx) → { waterU, waterMeshes, waterfall }.
// Needs from ctx: U, isAmazon, track, root, seed, noise and the water layout from terrain.js (riverPts, riverHW, WL,
// springPool, poolShapeR, bridges, bridgeTops, riverExit, pools).
import * as THREE from 'three';
import { makeRng, clamp, smoothstep, mergeGeometries } from '../../core/util.js';
import { TAU, C, V3 } from './common.js';

export function createWater(ctx) {
  const {
    U, isAmazon, track, root, seed, noise, riverPts, riverHW, WL, springPool, poolShapeR, bridges,
    bridgeTops, riverExit, pools
  } = ctx;
  // ───────────────────────────── water
  const waterU = {
    uTime: U.uTime, uNoise: U.uNoise, uSunDir: U.uSunDir, uSunCol: U.uSunCol, uSky: U.uSkyCol, uLight: U.uLightCol, uWet: U.uWet,
    uDeep: { value: C(isAmazon ? '#2a3a1c' : '#174a52') }, uShallow: { value: C(isAmazon ? '#8a7440' : '#4a9a90') },
    uFlow: { value: isAmazon ? 1 : 0 }, uNight: { value: 0 },
    ...THREE.UniformsLib.fog,
  };
  const waterMat = track(new THREE.ShaderMaterial({
    uniforms: waterU, transparent: true, depthWrite: true, fog: true,
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec2 vUv2;
      #include <fog_pars_vertex>
      void main(){ vUv2 = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFlow, uWet, uNight; uniform sampler2D uNoise; uniform vec3 uSunDir, uSunCol, uSky, uLight, uDeep, uShallow;
      varying vec3 vW; varying vec2 vUv2;
      #include <fog_pars_fragment>
      void main(){
        vec2 fuv = uFlow > 0.5 ? vec2(vUv2.x * 0.35, vUv2.y * 0.05 - uTime * 0.09) : vW.xz * 0.06 + vec2(uTime * 0.004, 0.0);
        vec2 fuv2 = uFlow > 0.5 ? vec2(vUv2.x * 0.6 + 0.3, vUv2.y * 0.09 - uTime * 0.14) : vW.xz * 0.11 - vec2(0.0, uTime * 0.006);
        float n1 = texture2D(uNoise, fuv).r, n2 = texture2D(uNoise, fuv2).g;
        float rip = texture2D(uNoise, vW.xz * 0.9 + uTime * 0.3).r - 0.5;
        vec3 nrm = normalize(vec3((n1 - 0.5) * 0.5 + rip * uWet * 0.6, 1.0, (n2 - 0.5) * 0.5 + rip * uWet * 0.6));
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.06 + 0.94 * pow(1.0 - max(dot(nrm, V), 0.0), 4.0);
        float edge = uFlow > 0.5 ? abs(vUv2.x) : vUv2.x;
        vec3 base = mix(uDeep, uShallow, smoothstep(0.35, 1.0, edge) * 0.8 + n1 * 0.2);
        base = mix(base, vec3(0.16, 0.24, 0.34), uNight * 0.75) * uLight;
        vec3 col = mix(base, uSky, clamp(fres * 0.8, 0.0, 0.7));
        vec3 Hh = normalize(uSunDir + V);
        float spec = pow(max(dot(nrm, Hh), 0.0), 220.0);
        col += uSunCol * spec * 5.0 * smoothstep(-0.02, 0.1, uSunDir.y);
        // moon glint
        col += vec3(0.6, 0.7, 1.0) * pow(max(dot(nrm, normalize(vec3(-uSunDir.x, abs(uSunDir.y), -uSunDir.z) + V)), 0.0), 160.0) * uNight * 1.5;
        float foam = smoothstep(0.9, 1.05, edge) * smoothstep(0.5, 0.75, n2);
        if (uFlow > 0.5) foam += smoothstep(0.78, 0.95, n1 * n2 * 1.6) * 0.18;
        col = mix(col, uLight * 0.9, clamp(foam, 0.0, 1.0) * 0.55);
        float a = mix(0.82, 0.96, fres) * (1.0 - smoothstep(0.92, 1.05, edge) * 0.6);
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const waterMeshes = [];
  let waterfall = null, waterfallMat = null;
  if (isAmazon) {
    // river ribbon
    const pts = riverPts; const pos = [], uv = [], idx = [];
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const t = V3(b.x - a.x, 0, b.z - a.z).normalize(); const n = V3(-t.z, 0, t.x);
      if (i > 0) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      const w = riverHW * 1.18;
      pos.push(pts[i].x + n.x * w, WL, pts[i].z + n.z * w, pts[i].x - n.x * w, WL, pts[i].z - n.z * w);
      uv.push(-1.18, acc, 1.18, acc);
      if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const river = new THREE.Mesh(track(g), waterMat); river.name = 'river'; river.renderOrder = 1;
    root.add(river); waterMeshes.push(river);
    // spring pool
    const sp = springPool; const pg = new THREE.CircleGeometry(1, 40); pg.rotateX(-Math.PI / 2);
    const pp = pg.attributes.position; const puv = pg.attributes.uv;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), z = pp.getZ(i); const rr0 = Math.hypot(x, z);
      const wx = sp.x + x * sp.r * 1.12, wz = sp.z + z * sp.r * 1.12;
      const k = rr0 > 0 ? poolShapeR(sp, wx, wz) * 1.12 / sp.r : 1;
      pp.setXYZ(i, sp.x + x * sp.r * k, WL + 0.005, sp.z + z * sp.r * k);
      puv.setXY(i, rr0 * 0.0, 0);  // centre-ish → treat as calm
    }
    const pool = new THREE.Mesh(track(pg), waterMat); pool.renderOrder = 1; root.add(pool); waterMeshes.push(pool);

    // fallen-log crossings: an old trunk lying bank to bank, roots torn up at one end, mossy on top
    const logParts = [];
    const BARK = C('#86664a'), BARK2 = C('#5e4532'), MOSS = C('#6f9238'), MOSS2 = C('#9cb84c'), WOOD = C('#c49a6a');
    const colorize = (g, fn) => { const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3), col = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(col, p.getX(i), p.getY(i), p.getZ(i), n.getY(i), i); c.set([col.r, col.g, col.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
    bridges.forEach((b, bi) => {
      bridgeTops(b);
      const rr = makeRng(seed * 7 + bi * 131 + 3), ext = 0.7;
      const A = V3(b.ax, b.ta - b.r, b.az), B = V3(b.bx, b.tb - b.r, b.bz);
      const dir = B.clone().sub(A); const L0 = dir.length(); dir.normalize();
      const p0 = A.clone().addScaledVector(dir, -ext), len = L0 + ext * 2;
      const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir);
      const side = V3(1, 0, 0).applyQuaternion(q);
      // trunk: a tapering, knobbly cylinder along +y, then laid along the crossing
      const tg = new THREE.CylinderGeometry(1, 1, len, 16, 18, false);
      tg.translate(0, len / 2, 0);
      const tp = tg.attributes.position;
      for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i), u = y / len, a = Math.atan2(z, x);
        const rad = b.r * (1.12 - 0.3 * u) * (1 + 0.07 * noise(a * 1.6 + bi * 9, y * 1.3) + 0.04 * Math.sin(a * 7 + y * 2.3));
        const k = Math.hypot(x, z) > 1e-6 ? rad : 0;
        tp.setXYZ(i, Math.cos(a) * k, y, Math.sin(a) * k);
      }
      tg.computeVertexNormals();
      tg.applyQuaternion(q); tg.translate(p0.x, p0.y, p0.z);
      colorize(tg, (c, x, y, z, ny) => {
        const n1 = noise(x * 1.7 + 40, z * 1.7 - y * 2), n2 = noise(x * 6 - 11, z * 6 + y * 5);
        c.copy(BARK).lerp(BARK2, clamp(0.35 + 0.45 * n2));
        const moss = smoothstep(0.5, 0.9, ny) * clamp(0.25 + 0.7 * n1);
        c.lerp(n2 > 0.2 ? MOSS2 : MOSS, moss * 0.75);
        c.multiplyScalar(0.8 + 0.35 * clamp(ny * 0.5 + 0.5));   // darker underside
      });
      logParts.push(tg);
      // torn-up root plate at the A end: roots fanning out around the trunk foot
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU + rr() * 0.5, l = 0.9 + rr() * 0.8;
        const rd = side.clone().applyAxisAngle(dir, a).multiplyScalar(0.8).addScaledVector(dir, -0.45 - rr() * 0.4).normalize();
        const cg = new THREE.ConeGeometry(0.11 + rr() * 0.06, l, 6, 2);
        cg.translate(0, l / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), rd));
        const base = A.clone().addScaledVector(dir, -ext * 0.6).addScaledVector(rd, b.r * 0.6);
        cg.translate(base.x, base.y, base.z);
        logParts.push(colorize(cg, (c, x, y, z, ny) => c.copy(BARK2).lerp(BARK, 0.3 + 0.3 * noise(x * 5, z * 5))));
      }
      // broken branch stubs along the trunk, and a pale broken end at B
      for (let k = 0; k < 3; k++) {
        const u = 0.25 + k * 0.25 + (rr() - 0.5) * 0.1, a = (rr() < 0.5 ? -1 : 1) * (0.9 + rr() * 0.6);
        const sd = side.clone().applyAxisAngle(dir, a).addScaledVector(dir, 0.5).normalize(), l = 0.35 + rr() * 0.35;
        const cg = new THREE.CylinderGeometry(0.035, 0.08, l, 6, 1);
        cg.translate(0, l / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), sd));
        const base = p0.clone().addScaledVector(dir, ext + u * L0).addScaledVector(sd, b.r * 0.85);
        cg.translate(base.x, base.y, base.z);
        logParts.push(colorize(cg, (c) => c.copy(BARK)));
      }
      const end = new THREE.CircleGeometry(b.r * 0.8, 12);
      end.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), dir));
      const ep = B.clone().addScaledVector(dir, ext + 0.012); end.translate(ep.x, ep.y, ep.z);
      logParts.push(colorize(end, (c, x, y, z) => c.copy(WOOD).lerp(BARK, 0.25 * (1 + Math.sin(Math.hypot(x - ep.x, y - ep.y, z - ep.z) * 60)))));
    });
    if (logParts.length) {
      const lg = mergeGeometries(logParts.map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
      logParts.forEach(g => g.dispose());
      const logs = new THREE.Mesh(track(lg), track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 })));
      logs.name = 'river-logs'; logs.castShadow = true; logs.receiveShadow = true; root.add(logs);
    }

    // waterfall
    const E = riverExit; const D = E.dir; const S = V3(-D.z, 0, D.x);
    const NU = 8, NV = 40, H = 34;
    const wp = [], wuv = [], widx = [];
    for (let v = 0; v <= NV; v++) {
      const f = v / NV; const s = Math.sqrt(f * H / 4.9);
      const outD = 0.3 + s * 1.7; const drop = f * H;
      const width = riverHW * (0.95 + f * 0.55);
      for (let u = 0; u <= NU; u++) {
        const uu = u / NU * 2 - 1;
        const wob = Math.sin(uu * 3 + f * 6) * 0.15 * f;
        const p = V3(E.x, WL + 0.02 - drop, E.z).addScaledVector(D, outD + wob).addScaledVector(S, uu * width);
        wp.push(p.x, p.y, p.z); wuv.push(uu, f);
      }
    }
    for (let v = 0; v < NV; v++) for (let u = 0; u < NU; u++) { const a = v * (NU + 1) + u; widx.push(a, a + NU + 1, a + 1, a + 1, a + NU + 1, a + NU + 2); }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2)); wg.setIndex(widx); wg.computeVertexNormals();
    waterfallMat = track(new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uNoise: U.uNoise, uLight: U.uLightCol, uSunCol: U.uSunCol, ...THREE.UniformsLib.fog },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
      vertexShader: /* glsl */`varying vec2 vUv2; varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){ vUv2 = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`uniform float uTime; uniform sampler2D uNoise; uniform vec3 uLight, uSunCol; varying vec2 vUv2; varying vec3 vW;
        #include <fog_pars_fragment>
        void main(){
          float n = texture2D(uNoise, vec2(vUv2.x * 0.7, vUv2.y * 1.2 - uTime * 0.55)).r;
          float n2 = texture2D(uNoise, vec2(vUv2.x * 1.9 + 0.3, vUv2.y * 2.5 - uTime * 0.9)).g;
          float streak = smoothstep(0.3, 0.8, n * 0.6 + n2 * 0.6);
          vec3 col = mix(vec3(0.55, 0.6, 0.55), vec3(1.0), streak) * uLight * 1.1;
          float a = (0.55 + 0.45 * streak) * (1.0 - smoothstep(0.75, 1.0, abs(vUv2.x))) * (1.0 - smoothstep(0.55, 1.0, vUv2.y));
          a *= smoothstep(0.0, 0.02, vUv2.y) * 0.5 + 0.5;
          gl_FragColor = vec4(col, a * 0.9);
          #include <fog_fragment>
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    waterfall = new THREE.Mesh(track(wg), waterfallMat); waterfall.renderOrder = 4; waterfall.name = 'waterfall';
    root.add(waterfall);
  } else {
    const P = pools[0];
    const pg = new THREE.CircleGeometry(1, 48); pg.rotateX(-Math.PI / 2);
    const pp = pg.attributes.position; const puv = pg.attributes.uv;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), z = pp.getZ(i); const rr0 = Math.hypot(x, z);
      const wx = P.x + x * P.r, wz = P.z + z * P.r;
      const k = poolShapeR(P, wx, wz) * 1.1;
      pp.setXYZ(i, P.x + x * k, 0, P.z + z * k);
      puv.setXY(i, rr0, 0);
    }
    const pool = new THREE.Mesh(track(pg), waterMat); pool.position.y = WL; pool.renderOrder = 1; pool.name = 'spring';
    root.add(pool); waterMeshes.push(pool);
  }
  return { waterU, waterMeshes, waterfall };
}
