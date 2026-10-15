// HQ trees: the existing oak / kapok builders with their faceted blob crowns swapped for soft leaf-card foliage
// (src/models/foliage.js). Trunks, limbs, fruit, flowers, seedlings and the whole PlantVisual API are the originals';
// the foliage mesh reuses each species' own shader patch + uniforms, so growth, health browning/thinning, oak seasons,
// leaf collapse by rank and wind sway keep working unchanged.
import * as THREE from 'three';
// The base libraries (grove-plants.js / amazon-plants.js) are passed in by each zone pack (see groveHQ / amazonHQ below),
// so loading one zone never pulls in the other zone's models.
import { makeRng, disposeDeep } from '../core/util.js';
import { makeLeafTexture, buildFoliage, clustersFromGeometry, densifyClusters } from './foliage.js';
import { renderQuality } from '../core/util.js';
// crown filling scales with the render tier (weak computers keep the lighter crowns)
const crownK = () => ({ min: 0, low: 0, medium: 0.75 }[renderQuality()] ?? 1);

// foliage geometry cached per source (variant) geometry (a Map, not a WeakMap: releaseCaches() must reach the GPU copies)
const _cache = new Map();
function cachedFor(src, build) { if (!_cache.has(src)) _cache.set(src, build()); return _cache.get(src); }

// Build a material pair that runs the species' own onBeforeCompile patch on top of the leaf map.
function patchedMaterials(srcMat, srcDepth, userData, map, roughness) {
  const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness, metalness: 0 });
  Object.assign(mat.userData, userData); mat.onBeforeCompile = srcMat.userData.obcOrig || srcMat.onBeforeCompile;
  const depth = new THREE.MeshDepthMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
  Object.assign(depth.userData, userData); depth.onBeforeCompile = srcDepth.onBeforeCompile;
  return { mat, depth };
}

// keep only triangles whose first vertex passes keep(i) (non-indexed geometry)
function filterTriangles(geo, keep) {
  const out = new THREE.BufferGeometry(); const n = geo.attributes.position.count;
  const idx = []; for (let i = 0; i < n; i += 3) if (keep(i)) idx.push(i, i + 1, i + 2);
  for (const [name, a] of Object.entries(geo.attributes)) {
    const arr = new Float32Array(idx.length * a.itemSize);
    idx.forEach((v, j) => { for (let k = 0; k < a.itemSize; k++) arr[j * a.itemSize + k] = a.array[v * a.itemSize + k]; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  out.computeBoundingSphere(); out.computeBoundingBox(); out.boundingSphere.radius *= 1.35;
  return out;
}

// ─────────────────────────────── bark: furrowed relief drawn in the wood shader ───────────────────────────────
// The trunks carry their colours per vertex, too coarse for bark. This adds vertical furrows and small cracks on top,
// on the wood only: brownish-grey, not-too-bright surfaces (leaves are saturated, flowers bright, so they are left alone).
const BARK_NOISE = `
varying vec3 vBarkP;
float bkH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bkN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bkH(i), bkH(i + vec3(1,0,0)), f.x), mix(bkH(i + vec3(0,1,0)), bkH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bkH(i + vec3(0,0,1)), bkH(i + vec3(1,0,1)), f.x), mix(bkH(i + vec3(0,1,1)), bkH(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
const BARK_FRAG = `
{ vec3 bc = diffuseColor.rgb; float mx = max(max(bc.r, bc.g), bc.b), mn = min(min(bc.r, bc.g), bc.b);
  float isBark = (1.0 - smoothstep(0.09, 0.2, mx - mn)) * (1.0 - smoothstep(0.42, 0.6, mx));
  vec3 q = vBarkP * vec3(6.5, 1.3, 6.5);
  float n = bkN(q) * 0.62 + bkN(q * 2.4 + 3.1) * 0.28 + bkN(vBarkP * vec3(26.0, 7.0, 26.0)) * 0.14;
  float furrow = smoothstep(0.32, 0.72, n);
  diffuseColor.rgb *= mix(1.0, mix(0.52, 1.18, furrow), isBark); }`;
const barkOff = () => { const q = renderQuality(); return q === 'min' || q === 'low'; };
function addBark(mat) {
  if (!mat || mat.userData.barked) return;
  mat.userData.barked = true;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
  mat.userData.obcOrig = prev;
  mat.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    if (barkOff()) return;   // the weakest tiers skip the per-pixel noise
    // hooks that neither zone's own patch replaces (the grove patch rewrites begin_vertex / color_fragment)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBarkP;')
      .replace('#include <project_vertex>', 'vBarkP = position;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + BARK_NOISE)
      .replace('#include <alphamap_fragment>', BARK_FRAG + '\n#include <alphamap_fragment>');
  };
  // the program key must still tell the species' shader patches apart (grove and amazon woods share none of it)
  const own = prevKey && prevKey !== THREE.Material.prototype.customProgramCacheKey;
  const base = prev ? prev.toString() : '';
  mat.customProgramCacheKey = function () { return (own ? prevKey.call(this) : base) + (barkOff() ? '|nobark' : '|bark'); };
  mat.needsUpdate = true;
}

// ─────────────────────────────── GROVE (shared shader patch: aCenter / aRank) ───────────────────────────────
// Swap a grove tree's '<id>-leaves' mesh (blobs + cards) for leaf-card foliage placed on the same blobs.
function groveTree(GROVE, id, tex, fo, roughness = 0.85) {
  return (opts = {}) => {
    const v = GROVE[id](opts);
    const root = v.object.children.find(c => c.isGroup);
    const leaves = root.children.find(m => m.name === id + '-leaves');
    const geo = cachedFor(leaves.geometry, () => buildFoliage({
      clusters: densifyClusters(clustersFromGeometry(leaves.geometry, { centreAttr: 'aCenter', rankAttr: 'aRank', centroid: !!fo.centroid }),
        { amount: crownK() * (fo.dense ?? 1), fill: crownK() * (fo.fill ?? 1), rng: makeRng(31 + leaves.geometry.attributes.position.count) }),
      rng: makeRng(4242 + leaves.geometry.attributes.position.count), aoLo: 0.4, topLight: 0.55, warmTop: 0.2, outward: 0.6, ...fo,
    }));
    const { mat, depth } = patchedMaterials(leaves.material, leaves.customDepthMaterial, { U: leaves.material.userData.U }, makeLeafTexture(tex), roughness);
    const fol = new THREE.Mesh(geo, mat); fol.name = id + '-foliage';
    fol.customDepthMaterial = depth; fol.castShadow = fol.receiveShadow = true;
    root.remove(leaves); root.add(fol);
    for (const m of root.children) if (m.isMesh && m !== fol) addBark(m.material);
    const dispose = v.dispose;
    v.dispose = () => { mat.dispose(); depth.dispose(); dispose(); };
    return v;
  };
}

// ─────────────────────────────── AMAZON (shared shader patch: aC / aF / aP / aS) ───────────────────────────────
// clusterFilter(F, i) picks the source vertices whose aC centres become foliage clusters; dropFilter(F, i) removes
// source triangles (the old blob crown). flag = aF.x for the cards (2 = foliage clump: browning, no droop).
function amazonTree(AMAZON, id, tex, fo, { clusterFilter, dropFilter, roughness = 0.8 } = {}) {
  return (opts = {}) => {
    const v = AMAZON[id](opts);
    const body = v.object.children.find(c => c.isGroup);
    const main = body.children.find(m => m.isMesh);
    const d = cachedFor(main.geometry, () => {
      const src = main.geometry, F = src.attributes.aF, S = src.attributes.aS;
      let cb = 0; for (let i = 0; i < F.count; i++) if (F.getX(i) > 0.5) cb = Math.max(cb, S.getX(i)); // stretch anchor of the crown
      const clusters = densifyClusters(clustersFromGeometry(src, { centreAttr: 'aC', rankFromW: true, filter: i => clusterFilter(F, i) }),
        { amount: crownK() * (fo.dense ?? 1), fill: crownK() * (fo.fill ?? 1), rng: makeRng(57 + F.count) });
      const fg = buildFoliage({ clusters, rng: makeRng(777 + F.count), aoLo: 0.36, topLight: 0.55, warmTop: 0.2, outward: 0.6, normalUp: 0.35, ...fo });
      // translate to the amazon shader's attribute layout (aC centre+rank, aF flags, aP pivot, aS stretch anchor)
      const n = fg.attributes.position.count, P = fg.attributes.position, CE = fg.attributes.aCenter, RK = fg.attributes.aRank;
      const aC = new Float32Array(n * 4), aF = new Float32Array(n * 4), aP = new Float32Array(n * 3), aS = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        aC.set([CE.getX(i), CE.getY(i), CE.getZ(i), RK.getX(i)], i * 4); aF.set([2, 0, -1, 1], i * 4);
        aP.set([CE.getX(i), CE.getY(i), CE.getZ(i)], i * 3); aS[i] = Math.min(P.getY(i), cb);
      }
      fg.setAttribute('aC', new THREE.BufferAttribute(aC, 4)); fg.setAttribute('aF', new THREE.BufferAttribute(aF, 4));
      fg.setAttribute('aP', new THREE.BufferAttribute(aP, 3)); fg.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
      fg.deleteAttribute('aCenter'); fg.deleteAttribute('aRank');
      fg.boundingSphere.radius *= 1.15;
      return { wood: dropFilter ? filterTriangles(src, i => !dropFilter(F, i)) : src, foliage: fg };
    });
    main.geometry = d.wood;
    const { mat, depth } = patchedMaterials(v._mat, main.customDepthMaterial, { u: v._u }, makeLeafTexture(tex), roughness);
    addBark(main.material);
    const fol = new THREE.Mesh(d.foliage, mat); fol.name = id + '-foliage';
    fol.customDepthMaterial = depth; fol.castShadow = fol.receiveShadow = true;
    body.add(fol);
    const dispose = v.dispose;
    v.dispose = () => { mat.dispose(); depth.dispose(); dispose(); };
    return v;
  };
}
// Pinnate fronds (açaí, fern): the leaflet triangles of each frond are replaced by two textured ribbons (one per side)
// running rachis → leaflet tips along the original arch, so the frond keeps its exact shape but reads as many soft
// leaflets. Leaflets are found as 6-vertex groups (leaf 1, flutter = lw); pIdx / tIdx = rachis / tip vertex in a group.
function amazonFronds(AMAZON, id, { lw, pIdx, tIdx, bright = 1.3, roughness = 0.8 }) {
  return (opts = {}) => {
    const v = AMAZON[id](opts);
    const body = v.object.children.find(c => c.isGroup);
    const main = body.children.find(m => m.isMesh);
    const d = cachedFor(main.geometry, () => {
      const src = main.geometry, A = src.attributes, F = A.aF;
      const isLeaflet = (i) => F.getX(i) === 1 && Math.abs(F.getW(i) - lw) < 0.01;
      const fronds = new Map();
      for (let i = 0; i + 5 < F.count; i += isLeaflet(i) ? 6 : 3) { // leaflet triangles come in contiguous pairs
        if (!isLeaflet(i)) continue;
        const C = A.aC; const key = [C.getX(i), C.getY(i), C.getZ(i), C.getW(i)].map(x => x.toFixed(3)).join(',');
        if (!fronds.has(key)) fronds.set(key, []);
        fronds.get(key).push({ p: i + pIdx, t: i + tIdx });
      }
      const out = {}; for (const [name, a] of Object.entries(A)) out[name] = { size: a.itemSize, arr: [] };
      const push = (srcIdx, pos, nor, col, uv) => {
        for (const [name, a] of Object.entries(A)) {
          if (name === 'position') out[name].arr.push(pos.x, pos.y, pos.z);
          else if (name === 'normal') out[name].arr.push(nor.x, nor.y, nor.z);
          else if (name === 'color') out[name].arr.push(col.r, col.g, col.b);
          else for (let k = 0; k < a.itemSize; k++) out[name].arr.push(a.array[srcIdx * a.itemSize + k]);
        }
        (out.uv ||= { size: 2, arr: [] }).arr.push(uv[0], uv[1]);
      };
      const V = (i) => new THREE.Vector3().fromBufferAttribute(A.position, i);
      const col = (i, k) => new THREE.Color().fromBufferAttribute(A.color, i).multiplyScalar(bright * k);
      for (const list of fronds.values()) for (const side of [0, 1]) {
        const L = list.filter((_, j) => j % 2 === side); if (L.length < 2) continue;
        const base = V(L[0].p);
        for (let j = 0; j < L.length - 1; j++) {
          const a = L[j], b = L[j + 1];
          const pa = V(a.p), ta = V(a.t), pb = V(b.p), tb = V(b.t);
          const along = pb.clone().sub(pa), across = ta.clone().sub(pa);
          const n = new THREE.Vector3().crossVectors(along, across).normalize(); if (n.y < 0) n.negate();
          const out2 = pa.clone().sub(base).setY(0).normalize();
          n.multiplyScalar(0.6).add(out2.multiplyScalar(0.25)).add(new THREE.Vector3(0, 0.3, 0)).normalize();
          const ua = j / (L.length - 1), ub = (j + 1) / (L.length - 1);
          const quad = [[a.p, pa, 0.85, [ua, 0]], [b.p, pb, 0.85, [ub, 0]], [b.t, tb, 1.1, [ub, 1]], [a.p, pa, 0.85, [ua, 0]], [b.t, tb, 1.1, [ub, 1]], [a.t, ta, 1.1, [ua, 1]]];
          for (const [si, p, k, uv] of quad) push(si, p, n, col(si, k), uv);
        }
      }
      const fg = new THREE.BufferGeometry();
      for (const [name, o] of Object.entries(out)) fg.setAttribute(name, new THREE.Float32BufferAttribute(o.arr, o.size));
      fg.computeBoundingSphere(); fg.boundingSphere.radius *= 1.35;
      // drop the leaflet triangles from the source
      return { wood: filterTriangles(src, i => !isLeaflet(i)), foliage: fg };
    });
    main.geometry = d.wood;
    const { mat, depth } = patchedMaterials(v._mat, main.customDepthMaterial, { u: v._u }, makeLeafTexture('frond'), roughness);
    const fol = new THREE.Mesh(d.foliage, mat); fol.name = id + '-fronds';
    fol.customDepthMaterial = depth; fol.castShadow = fol.receiveShadow = true;
    body.add(fol);
    const dispose = v.dispose;
    v.dispose = () => { mat.dispose(); depth.dispose(); dispose(); };
    return v;
  };
}
// addClumps crowns: sub-blobs (leaf 2, flutter 0.3) give the volumes; the whole clump (blobs + fringe) is dropped
const CLUMP = { clusterFilter: (F, i) => F.getX(i) === 2 && F.getW(i) < 0.5, dropFilter: (F, i) => F.getX(i) === 2 };

// HQ builders for a zone, given that zone's base plant library: { id: builder } for the species that get HQ foliage.
export function groveHQ(GROVE) {
  return {
    oak: groveTree(GROVE, 'oak', 'small', { cardsPerCluster: 14, cardSize: 1.6, color: '#6c9a42', color2: '#5c883a' }),
    terebinth: groveTree(GROVE, 'terebinth', 'pinnate', { cardsPerCluster: 12, cardSize: 1.7, color: '#86ac4a', color2: '#78a044', outward: 0.5 }),
    carob: groveTree(GROVE, 'carob', 'small', { cardsPerCluster: 14, cardSize: 1.55, color: '#4c7e38', color2: '#5a8c40', aoLo: 0.45 }, 0.6),
    pine: groveTree(GROVE, 'pine', 'needle', { cardsPerCluster: 12, cardSize: 1.7, color: '#82aa8a', color2: '#729c7c', outward: 0.75, normalUp: 0.45, dense: 0.5, fill: 0 }, 0.9),
    mastic: groveTree(GROVE, 'mastic', 'small', { cardsPerCluster: 12, cardSize: 1.7, color: '#5e8a44', color2: '#527c3c' }, 0.75),
    buckthorn: groveTree(GROVE, 'buckthorn', 'small', { cardsPerCluster: 10, cardSize: 1.8, color: '#74a046', color2: '#689440' }),
    sage: groveTree(GROVE, 'sage', 'long', { cardsPerCluster: 14, cardSize: 1.7, color: '#c4d0b0', color2: '#b6c4a2', aoLo: 0.7, outward: 0.5, centroid: true }, 0.95),
    rockrose: groveTree(GROVE, 'rockrose', 'small', { cardsPerCluster: 9, cardSize: 1.7, color: '#8aa66a', color2: '#7c9a5e', aoLo: 0.55 }, 0.9),
  };
}
export function amazonHQ(AMAZON) {
  return {
    kapok: amazonTree(AMAZON, 'kapok', 'palmate', { cardsPerCluster: 12, cardSize: 1.85, color: '#74aa44', color2: '#5e9a3a' }, CLUMP),
    brazilnut: amazonTree(AMAZON, 'brazilnut', 'long', { cardsPerCluster: 12, cardSize: 1.7, color: '#6aa240', color2: '#58903a', aoLo: 0.38 }, CLUMP),
    fig: amazonTree(AMAZON, 'fig', 'small', { cardsPerCluster: 12, cardSize: 1.6, color: '#5a9638', color2: '#4a8432', aoLo: 0.36 }, { ...CLUMP, roughness: 0.65 }),
    // cecropia keeps its big umbrella leaves (they are its character); palmate cards fill each leaf rosette
    cecropia: amazonTree(AMAZON, 'cecropia', 'palmate', { cardsPerCluster: 4, cardSize: 1.3, color: '#5c9a42', color2: '#6aa64a', outward: 0.3, normalUp: 0.6, dense: 0, fill: 0 },
      { clusterFilter: (F, i) => F.getX(i) === 1 && F.getW(i) > 0.5 }),
    acai: amazonFronds(AMAZON, 'acai', { lw: 1.2, pIdx: 0, tIdx: 5 }),
    fern: amazonFronds(AMAZON, 'fern', { lw: 1, pIdx: 0, tIdx: 2 }),
    // heliconia's big paddle leaves are already single smooth blades (no blob crown) — kept as is
    heliconia: (o) => AMAZON.heliconia(o),
  };
}
// zone packs: the base library with its HQ species swapped in
export const withHQ = (base, hq) => { const o = { ...base }; for (const k of Object.keys(hq)) if (k in base) o[k] = hq[k]; return o; };
// Called by the zone pack when its zone closes: frees the derived foliage / trimmed trunk geometry (rebuilt on demand).
export function releaseCaches() { disposeDeep(_cache); _cache.clear(); }
