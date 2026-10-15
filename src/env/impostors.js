// Far-forest impostors: a few of the game's own tree models are rendered once (at environment creation) from VIEWS yaw
// angles into a small atlas (colour + view-space normal), then drawn on the distant land as camera-facing quads that pick
// the atlas view matching the camera's angle around each tree. One draw call, two triangles per tree.
// Core module: it knows nothing about zones – the caller passes in builders of plant visuals ({ object, dispose }).
import * as THREE from 'three';

export const IMP_VIEWS = 8;
export const IMP_MAX_ROWS = 8;
const TAU = Math.PI * 2;
const PAD = 2;                      // empty pixels around every cell (keeps the colour dilation and mips from bleeding)

const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const S2L = new Float32Array(256); for (let i = 0; i < 256; i++) S2L[i] = s2l(i / 255);

// The plant's own material (with its own shader patch, so growth / seasons / leaf cards look exactly as in the game),
// writing its unlit colour to attachment 0 and its view-space normal to attachment 1.
function bakeMaterial(src) {
  const m = src.clone();
  m.userData = src.userData;                         // clone() JSON-copies userData – the patches need the real uniforms
  const orig = src.onBeforeCompile, key = src.customProgramCacheKey();
  m.onBeforeCompile = function (sh, r) {
    if (orig) orig.call(this, sh, r);
    sh.fragmentShader = 'layout(location = 1) out highp vec4 pc_fragNrm;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
      '#include <dithering_fragment>\ngl_FragColor = vec4(diffuseColor.rgb, 1.0);\npc_fragNrm = vec4(normalize(normal) * 0.5 + 0.5, 1.0);');
  };
  m.customProgramCacheKey = () => 'imp-bake|' + key;
  m.transparent = false; m.depthWrite = true; m.depthTest = true;
  return m;
}

// sources: [{ id, build: () => visual }]   → { albedo, normal, rows: [{ id, halfW, below, above, uHalf, v0, v1, mean }], ms }
export function bakeImpostors(renderer, sources, { cell = 128, elev = 0.38 } = {}) {
  const t0 = performance.now();
  const progs0 = renderer && renderer.info && renderer.info.programs ? renderer.info.programs.length : 0;
  const V = IMP_VIEWS, rows = Math.min(sources.length, IMP_MAX_ROWS);
  if (!renderer || !renderer.capabilities || !renderer.capabilities.isWebGL2 || rows < 1) throw new Error('impostors: no WebGL2 renderer / sources');
  const W = cell * V, H = cell * rows;
  if (W > renderer.capabilities.maxTextureSize || H > renderer.capabilities.maxTextureSize) throw new Error('impostors: atlas too big');
  const rt = new THREE.WebGLRenderTarget(W, H, { count: 2, type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true });
  rt.textures[0].colorSpace = THREE.SRGBColorSpace;  // colour stored sRGB-encoded (better precision in the darks)
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const prev = { rt: renderer.getRenderTarget(), clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), auto: renderer.autoClear };
  const temps = [], mats = [];
  const meta = [];
  const inner = cell - PAD * 2;
  try {
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
    renderer.autoClear = false;
    for (let r = 0; r < rows; r++) {
      const vis = sources[r].build();
      temps.push(vis);
      const obj = vis.object;
      obj.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        if (Array.isArray(o.material)) { o.material = o.material.map((mm) => { const b = bakeMaterial(mm); mats.push(b); return b; }); return; }
        const b = bakeMaterial(o.material); mats.push(b); o.material = b;
        o.castShadow = o.receiveShadow = false; o.frustumCulled = false;
      });
      scene.add(obj); obj.updateMatrixWorld(true);
      // tight bounds from the vertices (a bounding cylinder around the trunk axis)
      let rad = 0.3, y0 = 0, y1 = 0.5;
      const pv = new THREE.Vector3();
      obj.traverseVisible((o) => {
        const p = o.isMesh && o.geometry && o.geometry.attributes.position; if (!p) return;
        for (let i = 0; i < p.count; i++) { pv.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); rad = Math.max(rad, Math.hypot(pv.x, pv.z)); y0 = Math.min(y0, pv.y); y1 = Math.max(y1, pv.y); }
      });
      rad = rad * 1.06 + 0.1; y1 = y1 * 1.04 + 0.1;
      const cy = (y0 + y1) / 2;
      const ce = Math.cos(elev), se = Math.sin(elev);
      const bot = (y0 - cy) * ce - rad * se, top = (y1 - cy) * ce + rad * se;
      cam.left = -rad; cam.right = rad; cam.bottom = bot; cam.top = top;   // non-square texels are fine for impostors
      const D = Math.max(rad, y1 - y0) * 3 + 10; cam.near = 0.1; cam.far = D * 2;
      cam.updateProjectionMatrix();
      for (let k = 0; k < V; k++) {
        const th = k / V * TAU;
        cam.position.set(Math.cos(th) * ce * D, cy + se * D, Math.sin(th) * ce * D);
        cam.up.set(0, 1, 0); cam.lookAt(0, cy, 0); cam.updateMatrixWorld(true);
        rt.viewport.set(k * cell + PAD, r * cell + PAD, inner, inner);
        rt.scissor.copy(rt.viewport); rt.scissorTest = true;
        renderer.setRenderTarget(rt);
        renderer.render(scene, cam);
      }
      scene.remove(obj);
      // world size of one pixel and the projected trunk base (the pivot), in this camera's "up" coordinate
      meta.push({ id: sources[r].id, pxX: 2 * rad / inner, pxY: (top - bot) / inner, bot, ubase: (0 - cy) * ce });
    }
    rt.scissorTest = false;
    const t1 = performance.now();
    const progs = (renderer.info.programs ? renderer.info.programs.length : 0) - progs0;   // extra shader programs the bake compiled
    // read back, crop, measure, dilate
    const A = new Uint8Array(W * H * 4), N = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, A, undefined, 0);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, N, undefined, 1);
    const t2 = performance.now();
    const out = [];
    for (let r = 0; r < rows; r++) {
      const m = meta[r];
      let xmax = 0, ymin = inner, ymax = -1, cnt = 0; const mean = [0, 0, 0];
      const cx = inner / 2;
      for (let k = 0; k < V; k++) {
        let cr = 0, cg = 0, cb = 0, cc = 0, nr = 0, ng = 0, nb = 0;
        for (let y = 0; y < inner; y++) for (let x = 0; x < inner; x++) {
          const i = ((r * cell + PAD + y) * W + k * cell + PAD + x) * 4;
          if (A[i + 3] < 128) continue;
          cc++; cr += S2L[A[i]]; cg += S2L[A[i + 1]]; cb += S2L[A[i + 2]];
          nr += N[i]; ng += N[i + 1]; nb += N[i + 2];
          xmax = Math.max(xmax, Math.abs(x + 0.5 - cx)); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
        }
        if (cc < 12) throw new Error('impostors: empty view ' + m.id + '/' + k);
        cnt += cc; mean[0] += cr; mean[1] += cg; mean[2] += cb;
        fillCell(A, N, W, r * cell, k * cell, cell, [cr / cc, cg / cc, cb / cc], [nr / cc, ng / cc, nb / cc]);
      }
      const uHalf = (xmax + 1) / cell;                        // half width as a fraction of the cell
      const v0 = (PAD + ymin - 0.5) / cell, v1 = (PAD + ymax + 1.5) / cell;
      const upAt = (pixY) => m.bot + (pixY - PAD) * m.pxY;    // cell pixel row → camera "up" coordinate
      const below = m.ubase - upAt(PAD + ymin - 0.5), above = upAt(PAD + ymax + 1.5) - m.ubase;
      out.push({ id: m.id, halfW: (xmax + 1) * m.pxX, below: Math.max(0, below), above: Math.max(0.5, above), uHalf, v0, v1,
        mean: new THREE.Color(mean[0] / cnt, mean[1] / cnt, mean[2] / cnt) });
    }
    const mk = (data, srgb) => {
      const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.flipY = false; t.needsUpdate = true;
      return t;
    };
    return { albedo: mk(A, true), normal: mk(N, false), rows: out, cell, size: [W, H], ms: performance.now() - t0, parts: { render: t1 - t0, read: t2 - t1, process: performance.now() - t2 }, programs: progs };
  } finally {
    renderer.setRenderTarget(prev.rt); renderer.setClearColor(prev.clear, prev.alpha); renderer.autoClear = prev.auto;
    for (const v of temps) { try { v.dispose(); } catch (e) { } }
    for (const m of mats) m.dispose();
    rt.dispose();
  }
}

// uncovered pixels of a cell: its mean colour / normal, then two 3×3 dilation passes of the real edge colours
// (so mip levels and bilinear filtering never pull black into the silhouettes); alpha stays 0 there
function fillCell(A, N, W, y0, x0, cell, meanLin, meanN) {
  const l2s = (c) => Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  const ms = meanLin.map(l2s);
  const cov = new Uint8Array(cell * cell);
  for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
    const i = ((y0 + y) * W + x0 + x) * 4;
    if (A[i + 3] >= 128) { cov[y * cell + x] = 1; continue; }
    A[i] = ms[0]; A[i + 1] = ms[1]; A[i + 2] = ms[2]; A[i + 3] = 0;
    N[i] = meanN[0]; N[i + 1] = meanN[1]; N[i + 2] = meanN[2]; N[i + 3] = 0;
  }
  for (let pass = 0; pass < 2; pass++) {
    const next = cov.slice();
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      if (cov[y * cell + x]) continue;
      let n = 0, a0 = 0, a1 = 0, a2 = 0, b0 = 0, b1 = 0, b2 = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cell || yy >= cell || !cov[yy * cell + xx]) continue;
        const j = ((y0 + yy) * W + x0 + xx) * 4;
        n++; a0 += A[j]; a1 += A[j + 1]; a2 += A[j + 2]; b0 += N[j]; b1 += N[j + 1]; b2 += N[j + 2];
      }
      if (!n) continue;
      const i = ((y0 + y) * W + x0 + x) * 4;
      A[i] = a0 / n; A[i + 1] = a1 / n; A[i + 2] = a2 / n; N[i] = b0 / n; N[i + 1] = b1 / n; N[i + 2] = b2 / n;
      next[y * cell + x] = 1;
    }
    cov.set(next);
  }
}

// Turn a (haze-patched) MeshLambertMaterial into the impostor material. Its own onBeforeCompile (the haze) runs first.
// Instances: instanceMatrix = translation + uniform scale (no rotation); geometry attribute aImp = (yaw, atlas row,
// lowest drawn quad height in unscaled tree units – the trunk part hidden in the far land is skipped).
export function patchImpostorMaterial(mat, atlas, { alphaCut = 0.42 } = {}) {
  const rowsN = atlas.rows.length;
  const rowA = Array.from({ length: IMP_MAX_ROWS }, (_, i) => { const r = atlas.rows[i]; return r ? new THREE.Vector4(r.halfW, r.below, r.above, r.uHalf) : new THREE.Vector4(); });
  const rowB = Array.from({ length: IMP_MAX_ROWS }, (_, i) => { const r = atlas.rows[i]; return r ? new THREE.Vector4(r.v0, r.v1, i, 0) : new THREE.Vector4(); });
  const uni = { uImpAlb: { value: atlas.albedo }, uImpNrm: { value: atlas.normal }, uImpRowA: { value: rowA }, uImpRowB: { value: rowB }, uImpSize: { value: new THREE.Vector2(atlas.size[0], atlas.size[1]) } };
  mat.userData.impUniforms = uni;
  const haze = mat.onBeforeCompile;
  mat.onBeforeCompile = function (sh, r) {
    if (haze) haze.call(this, sh, r);
    Object.assign(sh.uniforms, uni);
    const V = IMP_VIEWS.toFixed(1), R = rowsN.toFixed(1);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aImp;
        uniform vec4 uImpRowA[${IMP_MAX_ROWS}]; uniform vec4 uImpRowB[${IMP_MAX_ROWS}];
        varying vec2 vImpUv0; varying vec2 vImpUv1; varying float vImpBlend;
        varying vec3 vImpR; varying vec3 vImpU; varying vec3 vImpF;`)
      .replace('#include <project_vertex>', `
        vec3 ipv = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
        float isc = length(instanceMatrix[0].xyz);
        vec3 iF = cameraPosition - ipv; iF = normalize(iF);
        vec3 iR = cross(vec3(0.0, 1.0, 0.0), iF); iR = length(iR) > 1e-4 ? normalize(iR) : vec3(1.0, 0.0, 0.0);
        vec3 iU = cross(iF, iR);
        int ir = int(aImp.y + 0.5);
        vec4 ra = uImpRowA[ir]; vec4 rb = uImpRowB[ir];
        float qy = mix(max(-ra.y, aImp.z), ra.z, position.y);    // aImp.z: the part buried in the far land is not drawn
        vec3 wpos = ipv + (iR * position.x * ra.x + iU * qy) * isc;
        // which baked views: the camera's angle around the tree in the tree's own (yawed) frame
        float vf = mod((atan(iF.z, iF.x) + aImp.x) / 6.2831853 * ${V}, ${V});
        float k0 = floor(vf); vImpBlend = smoothstep(0.3, 0.7, vf - k0); float k1 = mod(k0 + 1.0, ${V});   // cross-fade only near the switch
        vec2 cuv = vec2(0.5 + position.x * ra.w, mix(rb.x, rb.y, (qy + ra.y) / (ra.y + ra.z)));
        vImpUv0 = vec2((k0 + cuv.x) / ${V}, (rb.z + cuv.y) / ${R});
        vImpUv1 = vec2((k1 + cuv.x) / ${V}, (rb.z + cuv.y) / ${R});
        vImpR = (viewMatrix * vec4(iR, 0.0)).xyz; vImpU = (viewMatrix * vec4(iU, 0.0)).xyz; vImpF = (viewMatrix * vec4(iF, 0.0)).xyz;
        vec4 mvPosition = viewMatrix * vec4(wpos, 1.0);
        gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uImpAlb; uniform sampler2D uImpNrm; uniform vec2 uImpSize;
        varying vec2 vImpUv0; varying vec2 vImpUv1; varying float vImpBlend;
        varying vec3 vImpR; varying vec3 vImpU; varying vec3 vImpF;`)
      .replace('#include <map_fragment>', `
        // neighbouring views cross-fade by a screen-space dither: one texture fetch per atlas instead of two
        vec2 impDx = dFdx(vImpUv0) * uImpSize, impDy = dFdy(vImpUv0) * uImpSize;
        float impLod = max(0.0, 0.5 * log2(max(dot(impDx, impDx), dot(impDy, impDy))));
        float impPick = step(fract(dot(gl_FragCoord.xy, vec2(0.7548777, 0.5698403))), vImpBlend);
        vec2 impUv = mix(vImpUv0, vImpUv1, impPick);
        diffuseColor *= textureLod(uImpAlb, impUv, impLod);`)
      .replace('#include <alphatest_fragment>', `if (diffuseColor.a < ${alphaCut.toFixed(3)}) discard;`)
      .replace('#include <normal_fragment_begin>', `
        float faceDirection = 1.0;
        vec3 impN = textureLod(uImpNrm, impUv, impLod).xyz * 2.0 - 1.0;
        vec3 normal = normalize(vImpR * impN.x + vImpU * impN.y + vImpF * impN.z);
        vec3 nonPerturbedNormal = normal;`);
  };
  const key = mat.customProgramCacheKey();
  mat.customProgramCacheKey = () => key + '-imp' + rowsN;
  return mat;
}

// unit quad: x ∈ [-1, 1], y ∈ [0, 1] (the vertex shader scales / orients it per instance)
export function impostorQuad() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
