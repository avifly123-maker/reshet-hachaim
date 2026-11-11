// 1.4.2, the savanna: the migrating herds (pure numbers; drawn by src/world/herd-crowd.js). A herd is one moving group
// (Avi's plan: "a herd is drawn as one group, to spare the computer"): where it is, where it goes, how many, what it
// eats. Herds come in from the south-west edge when the rains have made the grass green, graze the grass map in their
// own band (zebras first, wildebeest after them: grass.js BANDS), move on when a place is eaten, and leave across the
// river to the north-east when the dry season has dried the grass. The child does not steer them, only prepares for them.
// Predators are gentle (Avi, 30.10): a short chase and the herd scatters; now and then one animal less, never shown.
//   createHerds({ grass, edge, isWater, rnd })
//   arrive(kind, n) → herd;  leaveAll();  step(dt, { night, lions: [{x,z}], crocs: [{x,z}] }) → [happenings]
//   list (the herds), save(), load(o)
// Happenings: { type: 'arrive' | 'left' | 'move' | 'cross' | 'chase' | 'lost', herd, by? }.
export const HERD_KIND = {
  zebra: { band: 'tall', speed: 1.7, eat: 0.012, spread: 5.5 },
  wildebeest: { band: 'mid', speed: 1.5, eat: 0.014, spread: 6.5 },
};

export function createHerds({ grass, edge = 56, isWater = () => false, rnd = Math.random } = {}) {
  const list = [];
  let uid = 1;
  const ENTER = Math.PI * 1.25, EXIT = Math.PI * 0.25;   // south-west in, north-east out (across the river)
  const edgePt = (a, k = 1) => ({ x: Math.cos(a) * edge * k, z: Math.sin(a) * edge * k });
  // the best place to graze for this band among a few candidates (a little randomness, so herds spread over the plain)
  function bestSpot(h) {
    const band = HERD_KIND[h.kind].band;
    let best = null, bs = -1;
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * edge * 0.78, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (isWater(x, z)) continue;
      const c = grass.at(x, z);
      const fit = band === 'tall' ? c.h : band === 'mid' ? 1 - Math.abs(c.h - 0.5) * 1.6 : (1 - c.h) * c.g;
      const s = fit * (0.5 + 0.5 * c.g) - Math.hypot(x - h.x, z - h.z) * 0.004 + rnd() * 0.05;
      if (s > bs) { bs = s; best = { x, z }; }
    }
    return best || { x: 0, z: 0 };
  }
  function arrive(kind, n) {
    const a = ENTER + (rnd() - 0.5) * 0.5, p = edgePt(a, 1.08);
    const h = { id: uid++, kind, n, x: p.x, z: p.z, hx: -Math.cos(a), hz: -Math.sin(a), state: 'enter', t: 0, full: 0, hungry: 0, scatter: 0, crossing: false, gone: false };
    const tgt = bestSpot(h); h.tx = tgt.x; h.tz = tgt.z;
    list.push(h);
    return h;
  }
  function leaveAll() {
    for (const h of list) if (h.state !== 'leave') { h.state = 'leave'; const p = edgePt(EXIT + (rnd() - 0.5) * 0.6, 1.12); h.tx = p.x; h.tz = p.z; }
  }
  function step(dt, { night = 0, lions = [], crocs = [] } = {}) {
    const out = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const h = list[i], K = HERD_KIND[h.kind];
      h.t += dt; h.scatter = Math.max(0, h.scatter - dt * 0.15);
      const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz);
      const moving = h.state === 'enter' || h.state === 'move' || h.state === 'leave';
      if (moving) {
        const v = K.speed * (1 + h.scatter * 1.5) * dt;
        if (d > 0.5) { h.hx += (dx / d - h.hx) * Math.min(1, dt * 0.8); h.hz += (dz / d - h.hz) * Math.min(1, dt * 0.8); const L = Math.hypot(h.hx, h.hz) || 1; h.hx /= L; h.hz /= L; h.x += h.hx * v; h.z += h.hz * v; }
        if (d < 2) {
          if (h.state === 'leave') { list.splice(i, 1); out.push({ type: 'left', herd: h }); continue; }
          if (h.state === 'enter') out.push({ type: 'arrive', herd: h });
          h.state = 'graze'; h.hungry = 0;
        }
      } else if (h.state === 'graze') {
        // the herd drifts slowly while it eats; when its band is used up here it walks on to a better place
        h.x += h.hx * 0.15 * dt; h.z += h.hz * 0.15 * dt;
        const want = K.eat * h.n * dt, got = grass.eat(h.x, h.z, K.band, want, K.spread);
        h.full = h.full * 0.98 + (want > 0 ? got / want : 1) * 0.02;
        h.hungry = got < want * 0.35 ? h.hungry + dt : Math.max(0, h.hungry - dt * 0.5);
        if (h.hungry > 12) { const tgt = bestSpot(h); h.tx = tgt.x; h.tz = tgt.z; h.state = 'move'; out.push({ type: 'move', herd: h }); }
      }
      // crossing the river: the crocodiles wait there
      const wet = isWater(h.x, h.z);
      if (wet && !h.crossing) { h.crossing = true; out.push({ type: 'cross', herd: h }); }
      else if (!wet && h.crossing) h.crossing = false;
      // predators: a short chase and the herd scatters (never more than one lost, and only now and then)
      const near = (ps, r) => ps.find((p) => Math.hypot(p.x - h.x, p.z - h.z) < r);
      const lion = night > 0.4 ? near(lions, 9) : null, croc = h.crossing ? near(crocs, 7) : null;
      const by = lion ? 'lion' : croc ? 'croc' : null;
      if (by && h.scatter < 0.2) {
        h.scatter = 1; out.push({ type: 'chase', herd: h, by });
        if (h.n > 3 && rnd() < 0.35) { h.n--; out.push({ type: 'lost', herd: h, by }); }
        if (h.state === 'graze') { const tgt = bestSpot(h); h.tx = tgt.x; h.tz = tgt.z; h.state = 'move'; }
      }
    }
    return out;
  }
  return {
    list, arrive, leaveAll, step,
    count: (kind) => list.filter((h) => !kind || h.kind === kind).reduce((s, h) => s + h.n, 0),
    save: () => list.map((h) => ({ k: h.kind, n: h.n, x: +h.x.toFixed(1), z: +h.z.toFixed(1), s: h.state, tx: +h.tx.toFixed(1), tz: +h.tz.toFixed(1) })),
    load(arr) { list.length = 0; for (const o of arr || []) { if (!HERD_KIND[o.k]) continue; list.push({ id: uid++, kind: o.k, n: o.n, x: o.x, z: o.z, hx: 1, hz: 0, state: o.s || 'graze', tx: o.tx ?? o.x, tz: o.tz ?? o.z, t: 0, full: 0.5, hungry: 0, scatter: 0, crossing: false }); } },
  };
}
