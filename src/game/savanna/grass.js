// 1.4.2, the savanna: the grass of the whole island, cell by cell (pure numbers, no three.js: tests/savanna/ runs it).
// Each cell keeps h (height / how much grass, 0..1), g (green, 0..1) and b (burnt, 0..1). The rains green the grass and
// make it grow; the dry season turns it to straw (it stays standing: food, and fuel for a fire). Grazers eat their own
// band of it (Bell's grazing succession: the zebra the tall coarse tops, the wildebeest the middle leaves, the impala the
// short fresh grass), so each herd prepares the grass for the next one. A fire burns dry tall grass to the ground; after
// it the grass grows back green and short, the best food of all for the short grazers.
//   createGrass({ S, N, land(x, z) })   S: the half side of the square the map covers (the island ±S); N cells a side
//   step(dt, { wet: 0..1, rain: 0..1 })   grow or dry
//   eat(x, z, band, amount, r)  → how much was eaten (0..amount): band 'tall' | 'mid' | 'short'
//   burn(x, z, r) → cells newly burnt;  canBurn(x, z) → 0..1 (dry tall grass burns, green or short grass does not)
//   at(x, z) → { h, g, b };  stats() → { h, g, b, tall, short } averages over the land;  toMap(out Uint8Array N*N*4)
export const BANDS = {
  tall: { lo: 0.55, hi: 1.01, cut: 0.42 },    // zebras: only where the grass is still tall, down to the middle
  mid: { lo: 0.25, hi: 0.85, cut: 0.2 },      // wildebeest: the leafy middle, down to short
  short: { lo: 0.04, hi: 0.5, cut: 0.03, green: 0.3 },   // impala: short and fresh (green) grass
};

export function createGrass({ S = 50, N = 32, land = () => true, seed = 1 } = {}) {
  const n = N * N, H = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), L = new Uint8Array(n);
  const cs = (2 * S) / N;
  let rs = (seed * 9301 + 49297) % 233280;
  const rnd = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, x = -S + (i + 0.5) * cs, z = -S + (j + 0.5) * cs;
    L[k] = land(x, z) ? 1 : 0;
    H[k] = L[k] ? 0.55 + 0.35 * rnd() : 0; G[k] = L[k] ? 0.9 : 0; B[k] = 0;
  }
  const idx = (x, z) => { const i = Math.floor((x + S) / cs), j = Math.floor((z + S) / cs); return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i; };
  const around = (x, z, r, fn) => {
    const i0 = Math.max(0, Math.floor((x - r + S) / cs)), i1 = Math.min(N - 1, Math.floor((x + r + S) / cs));
    const j0 = Math.max(0, Math.floor((z - r + S) / cs)), j1 = Math.min(N - 1, Math.floor((z + r + S) / cs));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * N + i; if (!L[k]) continue;
      const cx = -S + (i + 0.5) * cs, cz = -S + (j + 0.5) * cs, d = Math.hypot(cx - x, cz - z);
      if (d <= r + cs * 0.5) fn(k, d);
    }
  };

  function step(dt, { wet = 1, rain = 0 } = {}) {
    if (dt <= 0) return;
    const grow = (0.0025 + 0.004 * rain) * wet;             // grass grows in the rains (faster while it rains): about a day from bare to tall
    const greenUp = (0.03 + 0.06 * rain) * wet;              // and greens fast
    const dry = 0.006 * (1 - wet);                           // the dry season: green fades over a day or two
    for (let k = 0; k < n; k++) {
      if (!L[k]) continue;
      G[k] = Math.max(0, Math.min(1, G[k] + (greenUp * (1 - G[k]) - dry * G[k] * 1.5) * dt));
      H[k] = Math.min(1, H[k] + grow * G[k] * (1 - H[k] * 0.6) * dt);
      B[k] = Math.max(0, B[k] - (0.0015 + 0.02 * rain * wet + 0.004 * G[k]) * dt);   // the black ground greens over
    }
  }
  function eat(x, z, band, amount, r = 4) {
    const bd = BANDS[band] || BANDS.mid; let got = 0;
    around(x, z, r, (k) => {
      if (got >= amount) return;
      if (H[k] < bd.lo || H[k] > bd.hi) return;
      if (bd.green && G[k] < bd.green) return;
      const take = Math.min(amount - got, Math.max(0, H[k] - bd.cut) * 0.25);
      H[k] -= take; got += take * (0.5 + 0.5 * G[k]);   // green grass feeds better than straw
    });
    return got;
  }
  const canBurnK = (k) => (L[k] ? Math.max(0, H[k] - 0.3) / 0.7 * Math.max(0, 1 - G[k] * 1.6) * (1 - B[k]) : 0);
  function canBurn(x, z) { const k = idx(x, z); return k < 0 ? 0 : canBurnK(k); }
  function burn(x, z, r) {
    let c = 0;
    around(x, z, r, (k) => { if (canBurnK(k) <= 0.05) return; H[k] = 0.04; G[k] = 0; B[k] = 1; c++; });
    return c;
  }
  function at(x, z) { const k = idx(x, z); return k < 0 ? { h: 0, g: 0, b: 0 } : { h: H[k], g: G[k], b: B[k] }; }
  function stats() {
    let h = 0, g = 0, b = 0, tall = 0, short = 0, m = 0;
    for (let k = 0; k < n; k++) { if (!L[k]) continue; m++; h += H[k]; g += G[k]; b += B[k]; if (H[k] > 0.55) tall++; if (H[k] < 0.3) short++; }
    m = Math.max(1, m); return { h: h / m, g: g / m, b: b / m, tall: tall / m, short: short / m };
  }
  function toMap(out) {
    for (let k = 0; k < n; k++) { out[k * 4] = Math.round(H[k] * 255); out[k * 4 + 1] = Math.round(G[k] * 255); out[k * 4 + 2] = Math.round(B[k] * 255); out[k * 4 + 3] = 255; }
    return out;
  }
  // the save: the three layers, rounded to bytes
  function save() { return { N, h: Array.from(H, (v) => Math.round(v * 100)), g: Array.from(G, (v) => Math.round(v * 100)), b: Array.from(B, (v) => Math.round(v * 100)) }; }
  function load(o) {
    if (!o || o.N !== N || !Array.isArray(o.h) || o.h.length !== n) return false;
    for (let k = 0; k < n; k++) { if (!L[k]) continue; H[k] = (o.h[k] || 0) / 100; G[k] = (o.g[k] || 0) / 100; B[k] = (o.b[k] || 0) / 100; }
    return true;
  }
  return { N, S, cs, step, eat, burn, canBurn, at, stats, toMap, save, load, cells: { H, G, B, L } };
}
