// 1.4.2: the savanna's systems without the game (pure numbers): node tests/savanna/systems.mjs (part of tools/check-all.sh
// through tools/validate-savanna.mjs). Each check is a rule from docs/PLAN-1.4.2.md that the numbers must keep.
import { createGrass, BANDS } from '../../src/game/savanna/grass.js';
import { createHerds } from '../../src/game/savanna/herds.js';
import { createStability } from '../../src/game/savanna/stability.js';
import { seasonAt } from '../../src/game/savanna/seasons.js';

const fails = [];
const ok = (c, msg) => { if (!c) fails.push(msg); };
let rs = 7; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
const land = (x, z) => Math.hypot(x, z) < 54;

// the year: three days of rain, then three of dry season, and it turns smoothly
{
  const a = seasonAt(1, 0.5), b = seasonAt(4, 0.1), c = seasonAt(6, 0.9), d = seasonAt(7, 0.0);
  ok(a.season === 'wet' && a.dryK === 0, 'day 1 is in the rains');
  ok(b.season === 'dry' && b.wet > 0.4, 'the first hours of the dry season are still moist');
  ok(c.season === 'dry' && c.dryK > 0.95 && c.wet === 0, 'the end of the dry season is fully dry');
  ok(d.season === 'wet', 'a new year begins with the rains');
}
// the grass: it greens and grows in the rains, turns to straw in the dry season, and stays standing
{
  const g = createGrass({ S: 60, N: 32, land, seed: 3 });
  for (let i = 0; i < 300; i++) g.step(1, { wet: 1, rain: 0.5 });
  const wet = g.stats();
  ok(wet.g > 0.95 && wet.h > 0.8, `rains: green ${wet.g.toFixed(2)}, tall ${wet.h.toFixed(2)}`);
  for (let i = 0; i < 600; i++) g.step(1, { wet: 0, rain: 0 });
  const dry = g.stats();
  ok(dry.g < 0.1, `dry season: the grass is straw (green ${dry.g.toFixed(2)})`);
  ok(dry.h > 0.75, 'dry grass stays standing (food, and fuel)');
  ok(g.canBurn(0, 0) > 0.5, 'dry tall grass can burn');
  // fire burns it to the ground; green short grass does not burn; after the rains it comes back green and short
  ok(g.burn(0, 0, 8) > 5, 'a fire burns the dry grass');
  ok(g.canBurn(0, 0) < 0.05, 'burnt ground does not burn again');
  for (let i = 0; i < 120; i++) g.step(1, { wet: 1, rain: 0.6 });
  const c = g.at(0, 0);
  ok(c.g > 0.8 && c.h < 0.55 && c.b < 0.5, `after the fire, the rains bring fresh short grass (h ${c.h.toFixed(2)} g ${c.g.toFixed(2)} b ${c.b.toFixed(2)})`);
  ok(g.eat(0, 0, 'short', 0.1, 4) > 0.03, 'the fresh short grass is food for the impala');
  ok(g.canBurn(0, 0) < 0.05, 'green grass does not burn');
}
// the grazing order: zebras eat the tall tops; the wildebeest can eat only once the grass is lower; the impala last
{
  const g = createGrass({ S: 60, N: 32, land, seed: 5 });
  for (let i = 0; i < 300; i++) g.step(1, { wet: 1, rain: 0.5 });
  const before = g.at(10, 10).h;
  ok(g.eat(10, 10, 'short', 0.2, 3) === 0, 'the impala find nothing in tall grass');
  let z = 0; for (let i = 0; i < 80; i++) z += g.eat(10, 10, 'tall', 0.05, 3);
  const after = g.at(10, 10).h;
  ok(z > 0.5 && after < before - 0.3 && after >= BANDS.tall.cut - 0.01, `zebras open the tall grass (${before.toFixed(2)} → ${after.toFixed(2)})`);
  let w = 0; for (let i = 0; i < 80; i++) w += g.eat(10, 10, 'mid', 0.05, 3);
  ok(w > 0.3, 'after the zebras the wildebeest find their middle band');
  let s = 0; for (let i = 0; i < 40; i++) s += g.eat(10, 10, 'short', 0.05, 3);
  ok(s > 0.05, 'and after them the impala find short green grass');
}
// the herds: they come in, graze, move on when a place is eaten, cross the river and leave; predators are gentle
{
  const g = createGrass({ S: 60, N: 32, land, seed: 9 });
  for (let i = 0; i < 300; i++) g.step(1, { wet: 1, rain: 0.5 });
  const river = (x, z) => Math.abs(x - z) < 3;   // a straight river across the plain
  const H = createHerds({ grass: g, edge: 56, isWater: river, rnd });
  const h = H.arrive('zebra', 12);
  let arrived = false, moved = false, crossed = false, left = false, chased = 0, lost = 0;
  for (let t = 0; t < 1200; t++) {
    for (const e of H.step(1, { night: 0.8, lions: [{ x: 0, z: 0 }], crocs: [{ x: 0, z: 0 }] })) {
      if (e.type === 'arrive') arrived = true; if (e.type === 'move') moved = true; if (e.type === 'cross') crossed = true;
      if (e.type === 'chase') chased++; if (e.type === 'lost') lost++;
    }
    g.step(1, { wet: 1, rain: 0 });
  }
  ok(arrived, 'the herd arrives and starts to graze');
  ok(moved, 'it moves on when its place is eaten');
  H.leaveAll();
  for (let t = 0; t < 400 && H.list.length; t++) for (const e of H.step(1, {})) { if (e.type === 'cross') crossed = true; if (e.type === 'left') left = true; }
  ok(crossed, 'it crosses the river');
  ok(left && !H.list.length, 'it leaves the island');
  ok(lost <= Math.max(1, chased) && h.n >= 3, `predators are gentle (${chased} chases, ${lost} lost, ${h.n} left of 12)`);
}
// stability: a steady island is stable; a big change drops it; it comes back when the island recovers
{
  const S = createStability();
  for (let i = 0; i < 200; i++) S.sample({ grass: 0.7, grazers: 8, trees: 6, predators: 1, kinds: 12 });
  const steady = S.value;
  ok(steady > 0.75, `a steady rich island is stable (${steady.toFixed(2)})`);
  for (let i = 0; i < 30; i++) S.sample({ grass: 0.05, grazers: 1, trees: 2, predators: 0, kinds: 6 });
  ok(S.value < 0.35, `a crash drops the meter (${S.value.toFixed(2)})`);
  for (let i = 0; i < 300; i++) S.sample({ grass: 0.7, grazers: 8, trees: 6, predators: 1, kinds: 12 });
  ok(S.value > 0.6 && S.recovered >= 1, `it comes back (${S.value.toFixed(2)}, ${S.recovered} comebacks)`);
  const poor = createStability();
  for (let i = 0; i < 200; i++) poor.sample({ grass: 0.7, grazers: 2, trees: 1, predators: 0, kinds: 3 });
  ok(poor.value < steady - 0.15, 'a poor island is less stable than a rich one');
}

if (fails.length) { console.log('savanna systems:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('savanna systems: all rules hold');
