// Leafy crown helper — replaces "lumpy blob" crowns with soft clusters of alpha-tested leaf cards.
//   makeLeafTexture(kind)  → cached 256px CanvasTexture: a few simple leaf shapes, transparent background.
//                            kinds: 'small' (oak / carob / mastic…), 'palmate' (kapok / cecropia…),
//                            'pinnate' (terebinth…), 'needle' (pine tufts), 'long' (narrow leaves), 'frond' (palm / fern leaflet strip)
//   buildFoliage({ clusters, cardsPerCluster, color, rng, ... }) → one merged BufferGeometry of randomly oriented quads
//                            around each cluster centre, with fake-AO vertex colours and crown-outward normals.
//                            Extra per-vertex attributes aCenter (vec3, cluster centre) & aRank (float, cluster rank)
//                            let a species' own shader collapse / thin / recolour cards cluster by cluster.
//   makeFoliageMaterials({ map, roughness }) → { mat, depth } (MeshStandardMaterial + leafy-shadow depth material)
import * as THREE from 'three';
import { makeRng, clamp, lerp, disposeDeep } from '../core/util.js';

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------------------------
// Leaf textures (near-white leaves so the vertex colour carries the hue; value variation gives leaf definition)
const _tex = new Map();
export function makeLeafTexture(kind = 'small') {
  if (_tex.has(kind)) return _tex.get(kind);
  let tex;
  if (typeof document === 'undefined') { // node tests: 1×1 opaque white
    tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); tex.needsUpdate = true;
  } else {
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d'); const rng = makeRng(kind.length * 977 + 3);
    const shade = (l) => `rgb(${Math.round(232 * l)},${Math.round(242 * l)},${Math.round(214 * l)})`;
    // one leaf: base at (0,0) pointing +y, length L, width W
    const leaf = (x, y, ang, L, W, l, pointy = 0.5) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(W, L * 0.15, W * 0.9, L * (1 - pointy * 0.5), 0, L);
      g.bezierCurveTo(-W * 0.9, L * (1 - pointy * 0.5), -W, L * 0.15, 0, 0);
      g.fillStyle = shade(l); g.fill();
      g.lineWidth = 1.2; g.strokeStyle = shade(l * 0.72); g.stroke();
      g.beginPath(); g.moveTo(0, L * 0.05); g.lineTo(0, L * 0.85); g.lineWidth = 1.4; g.strokeStyle = shade(l * 0.8); g.stroke();
      g.restore();
    };
    const C = S / 2;
    if (kind === 'palmate') {
      // 4 palmate leaves (5–7 radiating leaflets) overlapping in a rosette
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + rng.range(-0.3, 0.3), d = i < 1 ? 4 : rng.range(26, 50);
        const cx = C + Math.cos(a) * d, cy = C + Math.sin(a) * d, n = rng.int(5, 7), l = rng.range(0.78, 1.0);
        const face = a + Math.PI / 2 + rng.range(-0.4, 0.4);
        for (let j = 0; j < n; j++) {
          const la = face + (j - (n - 1) / 2) * (2.6 / n);
          leaf(cx, cy, la + Math.PI, rng.range(52, 72) * (1 - Math.abs(j - (n - 1) / 2) * 0.12), rng.range(11, 15), l * rng.range(0.92, 1.05), 0.7);
        }
      }
    } else if (kind === 'needle') { // pine: tufts of radiating needles
      g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const a = rng() * TAU, d = i ? rng.range(25, 70) : 0;
        const cx = C + Math.cos(a) * d, cy = C + Math.sin(a) * d;
        for (let j = 0; j < 26; j++) {
          const na = rng() * TAU, L = rng.range(26, 48), l = rng.range(0.7, 1.0);
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(na) * L, cy + Math.sin(na) * L);
          g.lineWidth = 3.2; g.strokeStyle = shade(l); g.stroke();
        }
      }
    } else if (kind === 'pinnate') { // terebinth / carob: compound leaves (rachis + leaflet pairs)
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + rng.range(-0.3, 0.3), ox = C + Math.cos(a) * rng.range(4, 22), oy = C + Math.sin(a) * rng.range(4, 22);
        const L = rng.range(80, 100), n = 5, l = rng.range(0.78, 1.0);
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a) * L, oy + Math.sin(a) * L); g.lineWidth = 2; g.strokeStyle = shade(l * 0.7); g.stroke();
        for (let j = 0; j < n; j++) {
          const t = (j + 0.6) / (n + 0.2), px = ox + Math.cos(a) * L * t, py = oy + Math.sin(a) * L * t;
          for (const sd of [-1, 1]) leaf(px, py, a - Math.PI / 2 + sd * 1.0, rng.range(24, 30) * (1 - t * 0.25), rng.range(8, 10), l * rng.range(0.92, 1.05), 0.5);
        }
        leaf(ox + Math.cos(a) * L, oy + Math.sin(a) * L, a - Math.PI / 2, 24, 9, l, 0.5);
      }
    } else if (kind === 'frond') { // one side of a pinnate frond: slender leaflets from the rachis (v=0, canvas bottom) to the tip (v=1)
      for (let i = 0; i < 26; i++) {
        const x = (i + 0.5) / 26 * S + rng.range(-2, 2), l = rng.range(0.78, 1.0);
        leaf(x, S + 4, Math.PI + 0.22 + rng.range(-0.06, 0.06), S * rng.range(0.9, 1.0), rng.range(5.5, 7), l, 0.9);
      }
    } else if (kind === 'long') {
      for (let i = 0; i < 16; i++) {
        const a = rng() * TAU, d = rng.range(10, 70);
        leaf(C + Math.cos(a) * d * 0.6, C + Math.sin(a) * d * 0.6, a - Math.PI / 2 + rng.range(-0.5, 0.5), rng.range(55, 80), rng.range(8, 11), rng.range(0.75, 1.0), 0.8);
      }
    } else { // 'small': dense spray of small ovate leaves
      for (let i = 0; i < 44; i++) {
        const a = rng() * TAU, d = Math.pow(rng(), 0.7) * 80;
        const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
        leaf(x, y, a - Math.PI / 2 + rng.range(-0.8, 0.8), rng.range(30, 44), rng.range(11, 16), rng.range(0.72, 1.0), 0.4);
      }
    }
    tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  }
  _tex.set(kind, tex);
  return tex;
}

// ---------------------------------------------------------------------------------------------------------------
// Card geometry
// clusters: [{ pos: Vector3, radius, sy? (vertical squash, default 0.8), rank? (0..1), color? }]
// opts: cardsPerCluster, cardSize (× radius), color (hex|Color), color2 (optional second hue, picked per cluster),
//       rng, centre (crown centre for normals/AO; default = clusters' bbox centre), crownR {x,y} (default = bbox half size),
//       aoLo (darkest factor deep inside, default 0.45), topLight (extra brightness on top, default 0.35),
//       outward (0..1 how much cards face outward vs random, default 0.55), normalUp (default 0.25)
export function buildFoliage({ clusters, cardsPerCluster = 6, cardSize = 1.25, color = '#4a6a30', color2 = null, rng = makeRng(7),
  centre = null, crownR = null, aoLo = 0.45, topLight = 0.35, outward = 0.55, normalUp = 0.25, warmTop = 0.12 } = {}) {
  const box = new THREE.Box3();
  for (const c of clusters) { const sy = c.sy ?? 0.8; box.expandByPoint(c.pos.clone().add(new V3(c.radius, c.radius * sy, c.radius))); box.expandByPoint(c.pos.clone().sub(new V3(c.radius, c.radius * sy, c.radius))); }
  const cc = centre || box.getCenter(new V3());
  const half = box.getSize(new V3()).multiplyScalar(0.5);
  const R = crownR || { x: Math.max(0.1, Math.max(half.x, half.z)), y: Math.max(0.1, half.y) };
  const c1 = new THREE.Color(color), c2 = new THREE.Color(color2 || color);
  const warm = new THREE.Color('#e8f070'), cool = new THREE.Color('#2a5a48'), sunny = new THREE.Color('#b8d860');
  const P = [], N = [], C = [], U = [], CE = [], RK = [];
  const t = new V3(), b = new V3(), d = new V3(), n = new V3(), q = new V3(), out = new V3();
  const col = new THREE.Color();
  const corners = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
  for (const cl of clusters) {
    const sy = cl.sy ?? 0.8, rank = cl.rank ?? rng();
    const base = (cl.color ? new THREE.Color(cl.color) : c1.clone().lerp(c2, rng()));
    const nCards = Math.max(1, Math.round(cardsPerCluster * (cl.cards ?? 1)));
    for (let i = 0; i < nCards; i++) {
      // position: mostly toward the cluster surface, never deep below it
      const u = rng() * 2 - 1, a = rng() * TAU, s = Math.sqrt(1 - u * u);
      d.set(Math.cos(a) * s, u, Math.sin(a) * s); if (d.y < -0.4) d.y *= 0.5;
      const rr = cl.radius * Math.pow(rng(), 0.4) * 0.78;
      const p = new V3(cl.pos.x + d.x * rr, cl.pos.y + d.y * rr * sy, cl.pos.z + d.z * rr);
      // crown-outward direction (ellipsoid-normalised)
      out.set((p.x - cc.x) / R.x, (p.y - cc.y) / R.y, (p.z - cc.z) / R.x);
      const radial = clamp(out.length()); out.normalize();
      // card facing: blend outward and random
      n.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize().lerp(out.clone().lerp(d, 0.4).normalize(), outward).normalize();
      t.set(0, 1, 0); if (Math.abs(n.y) > 0.9) t.set(1, 0, 0);
      b.crossVectors(n, t).normalize(); t.crossVectors(b, n).normalize();
      const rot = rng() * TAU, cs = Math.cos(rot), sn = Math.sin(rot);
      q.copy(t).multiplyScalar(cs).addScaledVector(b, sn); b.multiplyScalar(cs).addScaledVector(t, -sn); t.copy(q);
      const half2 = cl.radius * cardSize * 0.5 * rng.range(0.8, 1.15);
      // lighting normal: outward from crown centre, a bit of cluster bulge and up
      const ln = out.clone().multiplyScalar(0.7).addScaledVector(d, 0.3).addScaledVector(new V3(0, 1, 0), normalUp).normalize();
      // fake AO + sunlit top
      const top = clamp(out.y * 0.5 + 0.5);
      const shadeK = lerp(aoLo, 1, radial) * (1 - topLight * 0.5 + topLight * top) * rng.range(0.9, 1.08);
      col.copy(base).lerp(warm, warmTop * top * top);
      // leaf-to-leaf variety: some cards a touch yellower (young / sunlit), some bluer (old / shaded)
      const vj = rng(); if (vj < 0.18) col.lerp(sunny, 0.18 * top + 0.06); else if (vj > 0.8) col.lerp(cool, 0.14 * (1 - top) + 0.04);
      col.multiplyScalar(shadeK);
      const v = corners.map(([x, y, uu, vv]) => ({ p: p.clone().addScaledVector(t, x * half2).addScaledVector(b, y * half2), uu, vv }));
      // slight cup: pull corners back along the card normal so it is not perfectly flat
      for (const w of v) w.p.addScaledVector(n, -half2 * 0.12);
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const w = v[k];
        P.push(w.p.x, w.p.y, w.p.z); N.push(ln.x, ln.y, ln.z);
        // darker toward the lower corners (card base) for depth inside a clump
        const ck = w.vv ? 1.05 : 0.88;
        C.push(col.r * ck, col.g * ck, col.b * ck); U.push(w.uu, w.vv);
        CE.push(cl.pos.x, cl.pos.y, cl.pos.z); RK.push(rank);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setAttribute('aCenter', new THREE.Float32BufferAttribute(CE, 3));
  g.setAttribute('aRank', new THREE.Float32BufferAttribute(RK, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  g.boundingSphere.radius *= 1.2;
  return g;
}

// Plain materials for trees that don't have their own shader patch.
export function makeFoliageMaterials({ map = makeLeafTexture('small'), roughness = 0.85 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness, metalness: 0 });
  const depth = new THREE.MeshDepthMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
  return { mat, depth };
}

// Group a geometry's triangles by a centre attribute → ellipsoid clusters { pos, radius, sy, rank }.
// filter(i) (vertex index) selects the triangles to use. Useful to place foliage where an old blob crown was.
// centroid: true → cluster centre = mean of its vertices (for parts whose stored centre is a stem base, not the leaf mass).
export function clustersFromGeometry(geo, { centreAttr = 'aCenter', rankAttr = null, rankFromW = false, filter = () => true, centroid = false } = {}) {
  const ce = geo.attributes[centreAttr], pos = geo.attributes.position, rk = rankAttr ? geo.attributes[rankAttr] : null;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    if (!filter(i)) continue;
    const x = ce.getX(i), y = ce.getY(i), z = ce.getZ(i);
    const key = x.toFixed(3) + ',' + y.toFixed(3) + ',' + z.toFixed(3);
    let e = map.get(key);
    if (!e) { e = { pos: new V3(x, y, z), sxz: 0, sy: 0, n: 0, rank: rankFromW ? ce.getW(i) : rk ? rk.getX(i) : undefined }; map.set(key, e); }
    const dx = pos.getX(i) - x, dy = pos.getY(i) - y, dz = pos.getZ(i) - z;
    e.sxz += dx * dx + dz * dz; e.sy += dy * dy; e.n++;
  }
  if (centroid) { // second pass: recentre on the vertex mean and recompute spreads
    for (const e of map.values()) { e.m = new V3(); e.m2 = [0, 0]; }
    const keyOf = (i) => ce.getX(i).toFixed(3) + ',' + ce.getY(i).toFixed(3) + ',' + ce.getZ(i).toFixed(3);
    for (let i = 0; i < pos.count; i++) if (filter(i)) map.get(keyOf(i)).m.add(new V3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    for (const e of map.values()) e.m.multiplyScalar(1 / e.n);
    for (let i = 0; i < pos.count; i++) if (filter(i)) {
      const e = map.get(keyOf(i)); const dx = pos.getX(i) - e.m.x, dy = pos.getY(i) - e.m.y, dz = pos.getZ(i) - e.m.z;
      e.m2[0] += dx * dx + dz * dz; e.m2[1] += dy * dy;
    }
    for (const e of map.values()) { e.pos = e.m; e.sxz = e.m2[0]; e.sy = e.m2[1]; }
  }
  return [...map.values()].map(e => {
    const radius = Math.sqrt(e.sxz / e.n * 1.5), ry = Math.sqrt(e.sy / e.n * 3);
    return { pos: e.pos, radius, sy: clamp(ry / Math.max(1e-3, radius), 0.2, 1.5), rank: e.rank };
  });
}

// Fill a crown: the clusters taken from an old blob crown are few and far apart, so a crown read as tufts on bare
// branches. densifyClusters adds (1) bridge clusters between near neighbours, closing the gaps between tufts, and (2) a
// few sub-clusters around each one, rounding the volume. New clusters inherit rank (and so season / health behaviour)
// from their parents. amount 0 → unchanged; 1 → about 2.5× the clusters.
export function densifyClusters(clusters, { amount = 1, rng = makeRng(99), bridge = 2.6, fill = 0 } = {}) {
  if (!amount || clusters.length < 2) return clusters;
  const out = clusters.map(c => ({ ...c }));
  const avgR = clusters.reduce((s, c) => s + c.radius, 0) / clusters.length;
  // bridges to the 2 nearest neighbours that are close enough
  const seen = new Set();
  clusters.forEach((a, i) => {
    const near = clusters.map((b, j) => [j, a.pos.distanceTo(b.pos)]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 2);
    for (const [j, d] of near) {
      const key = i < j ? i + ':' + j : j + ':' + i;
      if (seen.has(key) || d > bridge * (a.radius + clusters[j].radius) * 0.5 || rng() > amount) continue;
      seen.add(key);
      const b = clusters[j], t = rng.range(0.4, 0.6);
      const pos = a.pos.clone().lerp(b.pos, t); pos.y += (a.radius + b.radius) * 0.12;     // crowns bulge upward between tufts
      out.push({ pos, radius: (a.radius + b.radius) * 0.5 * rng.range(0.8, 0.95), sy: ((a.sy ?? 0.8) + (b.sy ?? 0.8)) / 2,
                 rank: a.rank === undefined ? undefined : (t < 0.5 ? a.rank : b.rank), cards: 0.85 });
    }
  });
  // sub-clusters rounding each tuft (more on the outside and the top, where the light falls)
  const cen = clusters.reduce((s, c) => s.add(c.pos), new V3()).multiplyScalar(1 / clusters.length);
  for (const c of clusters) {
    const k = Math.round(amount * (1 + rng() * 1.2));
    for (let i = 0; i < k; i++) {
      const dir = c.pos.clone().sub(cen).setY(0).normalize().multiplyScalar(0.6)
        .add(new V3(rng() * 2 - 1, rng() * 0.8 + 0.3, rng() * 2 - 1).normalize()).normalize();
      const pos = c.pos.clone().addScaledVector(dir, c.radius * rng.range(0.45, 0.75));
      out.push({ pos, radius: c.radius * rng.range(0.6, 0.8), sy: c.sy, rank: c.rank, cards: 0.6 });
    }
  }
  // volume fill: crowns built on branch tips are thin umbrellas over bare branches; fill the crown's dome (its hull,
  // rounded upward and a little downward) wherever an original tuft is near, so the crown reads as one soft mass
  if (fill > 0) {
    const box = new THREE.Box3(); for (const c of clusters) box.expandByPoint(c.pos);
    const ctr = box.getCenter(new V3()), hs = box.getSize(new V3()).multiplyScalar(0.5);
    const Rx = Math.max(hs.x, hs.z) + avgR * 0.4, Ry = Math.max(hs.y + avgR * 0.5, Rx * 0.42 * fill);
    const target = Math.min(70, Math.round(clusters.length * 1.3 * fill));
    let tries = 0, added = 0;
    while (added < target && tries++ < target * 30) {
      const p = new V3(ctr.x + (rng() * 2 - 1) * Rx, ctr.y + (rng() * 2 - 1) * Ry, ctr.z + (rng() * 2 - 1) * Rx);
      const dy = (p.y - ctr.y) / Ry * (p.y < ctr.y ? 1.5 : 1);                         // flatter underside
      if (((p.x - ctr.x) / Rx) ** 2 + dy * dy + ((p.z - ctr.z) / Rx) ** 2 > 1) continue;
      let dmin = 1e9, near = null; for (const c of out) { const d = c.pos.distanceTo(p); if (d < dmin) { dmin = d; near = c; } }
      if (dmin < avgR * 0.75) continue;                                                     // already covered
      let dOrig = 1e9; for (const c of clusters) dOrig = Math.min(dOrig, c.pos.distanceTo(p));
      if (dOrig > avgR * 2.6) continue;                                                     // stay with the real crown
      out.push({ pos: p, radius: avgR * rng.range(0.8, 1.0), sy: near.sy, rank: near.rank, cards: 0.75 }); added++;
    }
  }
  return out;
}

// Called when a zone closes: frees the leaf textures (re-drawn on demand).
export function releaseCaches() { disposeDeep(_tex); _tex.clear(); }
