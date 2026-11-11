// הצנצנת הסגורה (1.4.4 set 6): a tiny closed world in numbers, no three.js. The child picks up to six creatures,
// seals the lid, and the jar lives five jar-days (Sunday to Thursday). Plants make air from light; animals use air and
// make waste; cleaners (decomposers and filter feeders) turn waste back into food for the plants. A jar holds when
// every part of the circle is there in the right amounts: the lesson of sealed bottle gardens (docs/sources.md).
//   simulate(spec, version) → { days: [{ P, O, M, N, G }], ok, why, day }   why: 'air' | 'murk' | 'starve' | 'overgrow' | 'empty' | null
//   spec: [creature ids]   version: { light, pool: { <id>: { role, w } } }
// roles: prod (makes air and food), graze (eats plants), clean (eats waste: decomposers, filter feeders), hunt (eats grazers)
export const DAYS = 5, STEPS = 6;
export function simulate(spec, version) {
  const pool = version.pool, L = version.light;
  const n = { prod: 0, graze: 0, clean: 0, hunt: 0 };
  for (const id of spec) { const c = pool[id]; if (c) n[c.role] += c.w || 1; }
  let P = 2 + n.prod * 0.8, O = 6, M = 1, N = 3, G = n.graze;   // plants, air, waste, nutrients, grazers alive
  const days = []; let why = null, day = DAYS;
  if (!n.prod) why = 'empty'; else if (!n.graze && !n.hunt && !n.clean) why = 'empty';
  for (let d = 0; d < DAYS && !why; d++) {
    for (let s = 0; s < STEPS && !why; s++) {
      const grow = L * n.prod * (N > 0.5 ? 1 : 0.35) * 0.32;
      const eat = Math.min(P, G * 0.24);
      const hunt = n.hunt ? Math.min(G, n.hunt * 0.06) : 0;
      P += grow - eat; N -= grow * 0.32; G -= hunt;
      O += P * 0.11 * L - (G + n.hunt + n.clean * 0.6) * 0.17 - M * 0.04;
      M += G * 0.16 + n.hunt * 0.2 + (P > 9 ? (P - 9) * 0.4 : 0) - n.clean * 0.24;
      N += Math.min(M, n.clean * 0.2) + 0.02;
      P = Math.max(0, Math.min(12, P)); O = Math.max(0, Math.min(10, O)); M = Math.max(0, M); N = Math.max(0, Math.min(8, N)); G = Math.max(0, G);
      if (O < 1.5) why = 'air'; else if (M > 7) why = 'murk'; else if (n.graze && P < 0.3) why = 'starve'; else if (P >= 12) why = 'overgrow'; else if (n.graze && G < 0.35 && n.hunt) why = 'starve';
      if (why) day = d;
    }
    days.push({ P: +P.toFixed(2), O: +O.toFixed(2), M: +M.toFixed(2), N: +N.toFixed(2), G: +G.toFixed(2) });
  }
  return { days, ok: !why, why, day };
}
