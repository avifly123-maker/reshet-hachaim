// Desert plants (1.4): small shared shapes – a ribbed cactus body and a seedling.
import * as THREE from 'three';
import { clamp } from '../../core/util.js';
import { V3, Col, UP, TAU, card, tube, jit } from '../grove-plants/kit.js';

// a ribbed body along `axis` from `base`, length L; radius rFn(t) (t 0..1 along it); `ribs` pleats of relative `depth`;
// colour colFn(t, rib 0..1); `rank` 0..1 (the shader's thinning order: a cactus body keeps one rank so it never thins
// apart; health still dries its colour). Spines: short pale ticks on the rib crests.
export function ribbed(geo, base, axis, L, rFn, ribs, depth, colFn, rank = 0.5, o = {}) {
  const n = Math.max(4, Math.round(L / 0.12)), seg = ribs * 2;
  const ax = axis.clone().normalize();
  const side = (Math.abs(ax.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0)).cross(ax).normalize(), side2 = new V3().crossVectors(ax, side);
  const rings = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = base.clone().addScaledVector(ax, L * t), r = rFn(t), ring = [];
    for (let j = 0; j < seg; j++) {
      const a = j / seg * TAU, crest = j % 2 === 0;
      const rr = r * (crest ? 1 : 1 - depth);
      const dir = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(side2, Math.sin(a));
      const col = colFn(t, j / seg).multiplyScalar(crest ? 1.08 : 0.78);
      ring.push({ p: c.clone().addScaledVector(dir, rr), n: dir, c: col });
    }
    rings.push(ring);
  }
  const ce = base.clone().addScaledVector(ax, L * 0.5);
  for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) {
    const a = rings[i][j], b = rings[i][(j + 1) % seg], c = rings[i + 1][(j + 1) % seg], d = rings[i + 1][j];
    geo.tri(a.p, b.p, c.p, a.n, b.n, c.n, a.c, b.c, c.c, ce, rank);
    geo.tri(a.p, c.p, d.p, a.n, c.n, d.n, a.c, c.c, d.c, ce, rank);
  }
  // the top: a soft dome
  const last = rings[n], tip = base.clone().addScaledVector(ax, L + rFn(1) * 0.15);
  for (let j = 0; j < seg; j++) { const a = last[j], b = last[(j + 1) % seg]; geo.tri(a.p, b.p, tip, a.n, b.n, ax, a.c, b.c, a.c, ce, rank); }
  // spines
  if (o.spines !== false) {
    const sc = new Col(o.spine || '#e8dcc0');
    for (let i = 1; i < n; i += 2) for (let j = 0; j < seg; j += 2) {
      const p = rings[i][j].p, d = rings[i][j].n;
      const q = p.clone().addScaledVector(d, 0.06).addScaledVector(ax, 0.02), w = side.clone().multiplyScalar(0.008);
      geo.tri(p.clone().add(w), p.clone().sub(w), q, d, d, d, sc, sc, sc, ce, rank);
    }
  }
}

// a seedling for the first days of a tree: a thin stem and two or three small leaves (or a tiny cactus nub)
export function seedling(geo, rng, leaf, stem, h = 0.5, palm = false, cactus = false) {
  if (cactus) {
    ribbed(geo, new V3(0, 0, 0), UP, h * 0.4, () => 0.08, 8, 0.15, () => new Col(leaf), 0.5, { spines: false });
    return;
  }
  const pts = [new V3(0, 0, 0), new V3(0.01, h * 0.5, 0), new V3(0, h, 0.01)];
  tube(geo, pts, [0.018, 0.014, 0.01], 3, () => new Col(stem), {});
  const nL = palm ? 3 : 4;
  for (let i = 0; i < nL; i++) {
    const a = i / nL * TAU + rng(), d = new V3(Math.cos(a), palm ? 0.9 : 0.35, Math.sin(a)).normalize();
    card(geo, pts[2].clone().addScaledVector(d, palm ? 0.14 : 0.07), UP, palm ? 0.28 : 0.13, palm ? 0.04 : 0.06, rng, jit(leaf, rng, 0.08), pts[2], 0.5, { t: d, fold: palm ? 0.5 : 0.2 });
  }
}
