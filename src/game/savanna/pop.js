// 1.4.3, the savanna: the resident herds as numbers (Avi, 2.11: "the savanna is built on this balance": the grass, the
// herds that eat it and the predators that keep the herds in check). Pure numbers, no three.js: tests/savanna/ runs it.
// Each herd species (zebra, wildebeest, impala, buffalo) has one resident herd. The animals the child placed are its
// heart (members: real animals with a full model, missions count them); around them lives `n`, the rest of the herd,
// drawn as a crowd (src/world/herd-crowd.js). The herd has its own centre: it walks to fresh grass in its own band
// (grass.js BANDS), to water in the dry season, and the game moves its members' home after it (savanna/index.js).
//   createPop({ grass, nearWater(x,z) → { x, z, d }, edge, rnd })
//   ensure(kind, members, seed) → herd (made the first time a member is on the island)
//   step(dt, { members: { kind: [{x,z}] }, wet, dryK, night, preds: [{ id, kind, x, z, hungry }] }) → [happenings]
//   herd(kind), list(), total(kind, members), save(), load(o)
// Happenings: { type: 'born' | 'left' | 'thirst' | 'kill' | 'overgrazed', kind, n?, by?, pred? }.
// The rates are per game second; a savanna year is six days (BIOME.year), a day about 270 s of game time.
import { BANDS } from './grass.js';

export const POP_KIND = {
  zebra: { band: 'tall', eat: 0.0065, cap: 50, birth: 0.0011, water: 1, start: 3 },
  wildebeest: { band: 'mid', eat: 0.007, cap: 70, birth: 0.0013, water: 1, start: 4 },
  impala: { band: 'short', eat: 0.004, cap: 50, birth: 0.0012, water: 0.6, start: 3 },
  buffalo: { band: 'tall', eat: 0.01, cap: 35, birth: 0.0008, water: 1.3, start: 2 },
};
// who hunts whom, and where: lions at night anywhere on the plain, hyenas at any hour, crocodiles only at the water's edge
export const HUNTERS = {
  lion: { prey: ['zebra', 'wildebeest', 'impala', 'buffalo'], reach: 16, night: true, rate: 0.03 },
  hyena: { prey: ['wildebeest', 'zebra', 'impala'], reach: 13, night: false, rate: 0.02 },
  crocodile: { prey: ['wildebeest', 'zebra'], reach: 9, night: false, rate: 0.025, water: true },
};
const KILL_CD = 70;   // a fed predator rests before it hunts again (game seconds)

export function createPop({ grass, nearWater = () => ({ x: 0, z: 0, d: 0 }), edge = 50, rnd = Math.random } = {}) {
  const H = {};            // kind → herd
  const cd = {};           // predator id → the time it may hunt again
  let t = 0;
  const spreadOf = (h, m) => 5 + Math.sqrt(h.n + m) * 1.8;   // a herd spreads wide as it grazes
  // a better place for this band among a few candidates near the herd (it wanders, it does not jump across the plain)
  function bestSpot(h) {
    const band = POP_KIND[h.kind].band;
    let best = null, bs = -1;
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2, r = 6 + rnd() * 18, x = h.x + Math.cos(a) * r, z = h.z + Math.sin(a) * r;
      if (Math.hypot(x, z) > edge * 0.8) continue;
      const c = grass.at(x, z);
      if (c.h <= 0 && c.g <= 0) continue;   // water or no land
      const fit = band === 'tall' ? c.h : band === 'mid' ? 1 - Math.abs(c.h - 0.5) * 1.6 : (1 - c.h) * c.g;
      const s = fit * (0.5 + 0.5 * c.g) + rnd() * 0.05;
      if (s > bs) { bs = s; best = { x, z }; }
    }
    return best;
  }
  function ensure(kind, members = [], seed = true) {
    if (!POP_KIND[kind]) return null;
    if (H[kind]) return H[kind];
    let x = 0, z = 0;
    if (members.length) { for (const m of members) { x += m.x; z += m.z; } x /= members.length; z /= members.length; }
    H[kind] = { kind, n: seed ? POP_KIND[kind].start : 0, x, z, tx: x, tz: z, fed: 0.8, hungryT: 0, thirstT: 0, acc: 0, trend: 0, moveT: 0, notes: {} };
    return H[kind];
  }
  const once = (h, key, out, ev, gap = 120) => { if (t - (h.notes[key] ?? -1e9) < gap) return; h.notes[key] = t; out.push(ev); };

  function step(dt, { members = {}, wet = 1, dryK = 0, night = 0, preds = [] } = {}) {
    const out = [];
    if (dt <= 0) return out;
    t += dt;
    for (const kind in H) {
      const h = H[kind], K = POP_KIND[kind], mem = members[kind] || [], m = mem.length, P = h.n + m;
      if (P <= 0) continue;
      // the centre: it walks to its target slowly; the members follow it (the game moves their home)
      const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { const v = Math.min(d, 1.2 * dt); h.x += dx / d * v; h.z += dz / d * v; }
      // eat: the whole herd, in its own band, around its centre
      const want = K.eat * P * dt, got = grass.eat(h.x, h.z, K.band, want, spreadOf(h, m));
      const fedNow = want > 0 ? Math.min(1, got / want) : 1;
      h.fed += (fedNow - h.fed) * Math.min(1, dt * 0.05);
      // water: in the dry season the herd must drink; far from water it goes there, and thirst weakens it
      const w = nearWater(h.x, h.z), dry = dryK * K.water;
      if (dry > 0.3 && w.d > 16) {   // to the water's edge (not into it): a few metres short of the nearest water, on the herd's side
        h.thirstT += dt;
        if (h.moveT <= 0) { const k = Math.min(1, 6 / Math.max(1, w.d)); h.tx = w.x + (h.x - w.x) * k + (rnd() - 0.5) * 3; h.tz = w.z + (h.z - w.z) * k + (rnd() - 0.5) * 3; h.moveT = 30; }
      }
      else h.thirstT = Math.max(0, h.thirstT - dt * 2);
      const ok = h.fed * (h.thirstT > 60 ? 0.5 : 1);
      // grazed out here: walk on to fresher grass (after a while, so the herd is not restless)
      h.moveT -= dt;
      if (fedNow < 0.35 && h.moveT <= 0) { const s = bestSpot(h); if (s) { h.tx = s.x; h.tz = s.z; } h.moveT = 25; }
      // births in the rains when the herd is well fed; the herd's own room on the plain is its cap
      h.acc = h.acc || 0;
      if (wet > 0.5 && ok > 0.6 && P < K.cap) h.acc += P * K.birth * dt * (1 - P / K.cap) * (ok - 0.4) / 0.6;
      // hunger and thirst: a part of the herd leaves to look for grass and water elsewhere
      h.hungryT = ok < 0.3 ? h.hungryT + dt : Math.max(0, h.hungryT - dt);
      if (h.hungryT > 40 && h.n > 0) h.acc -= dt * Math.max(0.015, P * 0.0012);   // a few at a time, not the whole herd
      // whole animals only
      let born = 0, left = 0;
      while (h.acc >= 1 && h.n + m < K.cap) { h.acc -= 1; h.n++; born++; }
      while (h.acc <= -1 && h.n > 0) { h.acc += 1; h.n--; left++; }
      if (h.n === 0 && h.acc < 0) h.acc = 0;
      if (born) { h.trend = 1; once(h, 'born', out, { type: 'born', kind, n: born }); }
      if (left) { h.trend = -1; out.push({ type: h.thirstT > 60 ? 'thirst' : 'left', kind, n: left }); }
      // the grass under a big herd is eaten to the ground
      if (P >= 12 && grass.at(h.x, h.z).h < BANDS[K.band].cut + 0.06) once(h, 'over', out, { type: 'overgrazed', kind }, 200);   // down to what this band can still bite
    }
    // predators: a hungry hunter near a herd takes one animal from it (never shown, only told gently)
    for (const p of preds) {
      const R = HUNTERS[p.kind]; if (!R || !p.hungry || (cd[p.id] ?? -1e9) > t) continue;
      if (R.night && night < 0.4) continue;
      for (const kind of R.prey) {
        const h = H[kind]; if (!h || h.n <= 0) continue;
        if (Math.hypot(p.x - h.x, p.z - h.z) > R.reach + spreadOf(h, 0)) continue;
        if (R.water && nearWater(h.x, h.z).d > 6) continue;
        if (rnd() > R.rate * dt * Math.min(1, h.n / 6)) continue;   // a small herd is harder to find
        h.n--; h.trend = -1; cd[p.id] = t + KILL_CD;
        const s = bestSpot(h); if (s) { h.tx = s.x; h.tz = s.z; h.moveT = 20; }   // the herd moves away
        out.push({ type: 'kill', kind, by: p.kind, pred: p.id });
        break;
      }
    }
    return out;
  }
  function total(kind, m = 0) { return (H[kind] ? H[kind].n : 0) + m; }
  function save() { const o = {}; for (const k in H) { const h = H[k]; o[k] = [h.n, +h.x.toFixed(1), +h.z.toFixed(1), +h.fed.toFixed(2)]; } return o; }
  function load(o) {
    if (!o || typeof o !== 'object') return;
    for (const k in o) { if (!POP_KIND[k] || !Array.isArray(o[k])) continue; const [n, x, z, fed] = o[k]; const h = ensure(k, [], false); h.n = Math.max(0, n | 0); h.x = h.tx = +x || 0; h.z = h.tz = +z || 0; h.fed = fed ?? 0.8; }
  }
  return { ensure, step, herd: (k) => H[k] || null, list: () => Object.values(H), total, save, load, spreadOf };
}
