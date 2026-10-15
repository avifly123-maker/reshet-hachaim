// חוקרי היער – the population model under a mystery ("תעלומה").
// Plain numbers, no three.js: every species is a count ("140 spiny mice") and every non-living part of the place is a
// stock ("seeds in the soil", "nest sites"). The 3D island only shows a sample of these numbers (research/sync.js),
// so a child can bring 20 owls without the computer slowing down.
//
// A case describes its model as data: variables and flows. The flows are the verbs of the web:
//   produce   adults make something every second (shrubs → seeds)
//   consume   an animal eats from a stock (mice ← seeds), with a saturating appetite
//   prey      a hunter eats another animal (owls ← mice), Holling type II (a hunter cannot eat without end)
//   germinate seeds become seedlings (more in rainy seasons)
//   mature    seedlings become adults, while there is room
//   decay     a plain loss (old shrubs die, seeds rot)
// Animals then grow or shrink by how well fed they are, leave when hungry or when there is no room (nest sites,
// shelter), and come in from outside when there is food and room – so moving animals away without fixing the cause
// does not hold. Time is in model seconds; the case tunes every rate so a change shows within a minute or two.
// The same case always starts the same way (no randomness), so groups and test runs can be compared.

export const MODEL_DT = 0.25;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createModel(def) {
  const vars = {};
  for (const v of def.vars) vars[v.id] = { ...v };
  const s = { t: 0, v: {}, sat: {}, log: [], flags: {} };
  for (const v of def.vars) { s.v[v.id] = v.init ?? 0; s.sat[v.id] = 1; }
  const seasonOf = typeof def.season === 'function' ? def.season : () => null;

  // capacity of an animal: a fixed number, or tied to a stock ("2 owls per nest site")
  function capOf(v) {
    if (v.cap == null) return Infinity;
    if (typeof v.cap === 'number') return v.cap;
    return (s.v[v.cap.of] || 0) * (v.cap.per ?? 1) + (v.cap.plus ?? 0);
  }

  function step(dt, ctx = {}) {
    const season = ctx.season ?? seasonOf(s.t);
    const sf = (f) => (f && season && f[season] != null ? f[season] : 1);
    const d = {}; for (const id in s.v) d[id] = 0;
    const eaten = {}; for (const id in s.v) eaten[id] = 0;
    for (const f of def.flows) {
      switch (f.type) {
        case 'produce': { d[f.to] += f.rate * s.v[f.from] * sf(f.season) * (f.byCap ? clamp(1 - s.v[f.to] / f.byCap, 0, 1) : 1); break; }
        case 'consume': {
          const N = s.v[f.eater], F = Math.max(0, s.v[f.food]);
          const got = f.need * N * F / (F + f.half);           // what the eaters get per second
          d[f.food] -= got * (f.cost ?? 1);
          eaten[f.eater] += got; break;
        }
        case 'prey': {
          const P = s.v[f.pred], N = Math.max(0, s.v[f.prey] - (f.refuge || 0));   // a refuge (rocks, burrows) keeps a few out of reach
          const kills = f.attack * P * N / (1 + f.attack * f.handling * N);
          d[f.prey] -= kills; eaten[f.pred] += kills; break;
        }
        case 'germinate': { const g = f.rate * Math.max(0, s.v[f.from]) * sf(f.season); d[f.from] -= g; d[f.to] += g * (f.yield ?? 1); break; }
        case 'mature': {
          const room = f.cap ? clamp(1 - s.v[f.to] / f.cap, 0, 1) : 1;
          const m = f.rate * Math.max(0, s.v[f.from]); d[f.from] -= m; d[f.to] += m * room; break;
        }
        case 'decay': { d[f.of] -= f.rate * Math.max(0, s.v[f.of]); break; }
      }
    }
    // animals: births by how well fed, deaths, leaving and arriving
    for (const v of def.vars) {
      if (v.kind !== 'animal') continue;
      const N = s.v[v.id];
      const need = v.need ?? 1;
      const sat = N > 0.01 ? clamp(eaten[v.id] / (need * N), 0, 1) : (v.food ? clamp(foodHint(v), 0, 1) : 1);
      s.sat[v.id] = sat;
      d[v.id] += N * ((v.birth ?? 0) * sat - (v.death ?? 0));
      if (sat < (v.hungry ?? 0.3)) d[v.id] -= N * (v.leaveHungry ?? 0.05) * ((v.hungry ?? 0.3) - sat) / (v.hungry ?? 0.3);
      const cap = capOf(v);
      if (N > cap) d[v.id] -= (N - cap) * (v.leaveCrowded ?? 0.25);
      // arrivals from outside: only with food and room
      if (v.arrive && N < cap && (v.food ? foodHint(v) : 1) > (v.arriveIf ?? 0.5)) d[v.id] += v.arrive * Math.min(1, cap - N);
    }
    for (const id in s.v) {
      const lo = vars[id].min ?? 0;
      const nv = s.v[id] + d[id] * dt;
      if (Number.isFinite(nv)) s.v[id] = Math.max(lo, nv);   // one bad number must not poison the whole run
    }
    s.t += dt;
  }
  // how much food an animal would find right now (for arrivals and for an empty population)
  function foodHint(v) {
    let best = 0;
    for (const f of def.flows) {
      if (f.type === 'consume' && f.eater === v.id) { const F = Math.max(0, s.v[f.food]); best = Math.max(best, F / (F + f.half)); }
      if (f.type === 'prey' && f.pred === v.id) { const N = Math.max(0, s.v[f.prey] - (f.refuge || 0)); best = Math.max(best, N / (N + (v.preyHalf ?? 20))); }
    }
    return best;
  }

  function run(seconds, ctx) { const n = Math.max(1, Math.round(seconds / MODEL_DT)); for (let i = 0; i < n; i++) step(seconds / n, ctx); }
  function add(id, amount) { if (!(id in s.v)) return; s.v[id] = Math.max(vars[id].min ?? 0, s.v[id] + amount); }
  function set(id, value) { if (id in s.v) s.v[id] = Math.max(vars[id].min ?? 0, value); }
  return { def, state: s, vars, step, run, add, set, capOf: (id) => capOf(vars[id]), get: (id) => s.v[id], sat: (id) => s.sat[id] };
}

// the three lights of the balance meter. Each case lists its checks: { light, id, min?, max? }
export function lightsOf(model, checks) {
  const out = { life: true, regen: true, env: true };
  for (const c of checks) {
    const v = model.get(c.id);
    const ok = (c.min == null || v >= c.min) && (c.max == null || v <= c.max);
    if (!ok) out[c.light] = false;
  }
  return out;
}
export const allGreen = (L) => L.life && L.regen && L.env;
