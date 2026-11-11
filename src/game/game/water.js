// 1.4: water and wind on an island that has a water story (the desert; data/desert.js `thirst`, `stores`, `drinks`).
// Only zones whose species carry water needs use it (W.waterOn); the other zones keep their old rules unchanged.
//   W.waterAt(x, z)      0..1 how much water reaches the roots here: a little everywhere, much by the spring and in the
//                        wadi after a flood, more after rain, less in drought; the devices add theirs (drip line, fog net)
//   W.plantWater(p, dt)  the water a plant gets (0..1, read by world/plants.js): what it needs (thirst) against what is
//                        here, plus its own store (a cactus fills up after rain and drinks from itself for a long time)
//   W.thirstK(a)         how much faster an animal grows hungry when it must drink and no water is near (the ibex, the
//                        sandgrouse); 1 for animals that get their water from food
//   W.shelterAt(x, z)    0..1 shelter from blowing sand (a sand fence, grown shrubs and trees close by)
//   tick(dt)             sandstorms (young plants in the open are buried a little), the locust swarm (leaves eaten),
//                        the wet ground after rain and the drying wadi; sets W.dust for the environment's haze
// Gives ctx: water. Takes from ctx: W, env, reg, amb. Devices: ctx.tools.tech.desert (world/desert-tech.js) at call time.
import { clamp, smoothstep } from '../../core/util.js';

export function createWater(ctx) {
  const { W, env, amb } = ctx;
  W.waterOn = W.biome.species.some((s) => s.thirst != null);
  if (!W.waterOn) return { water: null };
  W.wetGround = 0; W.wadiWet = 0; W.sandT = 0; W.locustT = 0; W.dust = 0;
  const devices = () => ctx.tools?.tech?.desert || null;
  const wadiAt = (x, z) => (env.nearWadi ? env.nearWadi(x, z) : 0);

  W.waterAt = (x, z) => {
    const spring = env.waterDist ? smoothstep(14, 1.5, env.waterDist(x, z)) : 0;
    let w = 0.12 + 0.82 * spring + 0.45 * W.wetGround + 0.55 * W.wadiWet * wadiAt(x, z) - 0.25 * (W.drought || 0) - 0.12 * (W.heat || 0) - 0.3 * (W.dryK || 0);   // 1.4.2: the savanna's dry season (W.dryK, savanna/seasons.js)
    const d = devices(); if (d) w += d.waterAt(x, z);
    return clamp(w);
  };
  W.plantWater = (p, dt) => {
    const sp = p.sp, need = sp.thirst ?? 0.5, keep = sp.stores ?? 0;
    const here = W.waterAt(p.x, p.z);
    if (p.store == null) p.store = keep * 0.8;
    // the store fills when there is more water than the plant needs, and empties slowly when there is less
    if (here > need) p.store = Math.min(1, p.store + (here - need) * dt * 0.05);
    else p.store = Math.max(0, p.store - (need - here) * dt * 0.01 * (1.15 - keep));
    const got = here + p.store * keep;
    return clamp(got / Math.max(0.05, need));
  };
  W.thirstK = (a) => {
    const kind = a.sp.drinks;
    if (!kind || kind === 'never') return 1;
    const near = env.waterDist ? env.waterDist(a.pos.x, a.pos.z) < (kind === 'daily' ? 26 : 40) : false;
    const dev = devices();
    const fed = near || (dev && dev.waterAt(a.pos.x, a.pos.z) > 0.3);
    return fed ? 1 : kind === 'daily' ? 1.9 : 1.2;
  };
  W.shelterAt = (x, z) => {
    let s = 0;
    const dev = devices(); if (dev) s = Math.max(s, dev.shelterAt(x, z));
    for (const p of W.plants) {
      if (!p.alive || p.removed || p.growth < 0.6) continue;
      if (!(p.sp.kind === 'shrub' || p.sp.kind === 'tree')) continue;
      const d = Math.hypot(p.x - x, p.z - z); if (d < 4.5) s = Math.max(s, 0.75 * (1 - d / 4.5) + 0.25);
    }
    if (W.plants.some((p) => p.alive && p.sp.id === 'crust' && Math.hypot(p.x - x, p.z - z) < 3)) s = Math.max(s, 0.5);   // the living crust holds the sand
    return clamp(s);
  };

  let warned = false;
  function tick(dt) {
    // rain soaks the ground; it dries again in a few game minutes. A flood fills the wadi bed.
    W.wetGround = W.rain > 0.3 ? Math.min(1, W.wetGround + dt * 0.08) : Math.max(0, W.wetGround - dt * 0.004);
    W.wadiWet = (W.flood || 0) > 0 ? Math.min(1, W.wadiWet + dt * 0.2) : Math.max(0, W.wadiWet - dt * 0.003);
    // a sandstorm: strong wind and dust; young plants in the open are slowly buried
    if (W.sandT > 0) {
      W.sandT -= dt; W.wind = Math.max(W.wind, 0.95);
      for (const p of W.plants) {
        if (!p.alive || p.removed || p.growth > 0.4 || p.sp.kind === 'cactus') continue;
        const open = 1 - W.shelterAt(p.x, p.z);
        if (open > 0.05) p.damage(open * dt * 0.012);
      }
      if (!warned) { warned = true; amb('סופת חול! שתילים קטנים בשטח פתוח נקברים בחול. שיחים וגדרות עוצרים אותו.', 'warn'); }
    } else warned = false;
    W.dust = W.sandT > 0 ? Math.min(1, (W.dust || 0) + dt * 0.5) : Math.max(0, (W.dust || 0) - dt * 0.25);
    // a locust swarm: leaves of shrubs, herbs and young trees are eaten
    if (W.locustT > 0) {
      W.locustT -= dt;
      for (const p of W.plants) if (p.alive && !p.removed && p.sp.kind !== 'cactus' && p.sp.kind !== 'palm') p.damage(dt * 0.004);
    }
  }
  return { water: { tick } };
}
