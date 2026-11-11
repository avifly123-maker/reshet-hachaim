// 1.4.2: the savanna's systems in the game (a part of createGame, like water.js for the desert; only the savanna has it).
// It ties the pure models of this folder to the island:
//   seasons.js    the year: rains and dry season (W.season 'wet' | 'dry', W.seasonFrac, W.dryK for the water)
//   grass.js      the grass map: grows and greens in the rains, straw in the dry season, eaten in bands, burnt by fire;
//                 drawn by the environment's tall grass (env.setGrassMap)
//   herds.js      the migration: zebra and wildebeest herds come with the green grass and leave when it dries, crossing
//                 the river; lions and crocodiles follow them (gently: a chase, the herd scatters); drawn as crowds
//                 (src/world/herd-crowd.js)
//   fire          dry tall grass burns: a fire moves with the wind and renews the grass; it never crosses green or short
//                 grass, a river or a bare patch (W.fires, the shared fire visuals and plants.js burnFire)
//   elephants     the elephant as an engineer: it pushes over young trees and shrubs and opens room for grass; with no
//                 elephants and no fire for a whole year, the thorn shrubs spread over the grass
//   pop.js        1.4.3: the resident herds as numbers (zebra, wildebeest, impala, buffalo): the child's animals are
//                 each herd's heart, the rest of the herd is a number that grows with grass and rain, leaves in hunger
//                 and thirst, and feeds the lions, hyenas and crocodiles; drawn as crowds around them
//   stability.js  the meter (W.stability 0..1, the bar beside the HUD): does the island come back to balance
// Gives ctx: savanna (null in every other zone): { tick, effect, serialize, restore, dispose, grass, herds, pop, stability }.
// Takes from ctx (at call time): W, env, biome, ui, amb, robo, reg, alive, spawnPlant, findSpotNear, rig, audio.
import * as THREE from 'three';
import { clamp } from '../../core/util.js';
import { seasonAt, rainsGate, grassWet } from './seasons.js';
import { createGrass } from './grass.js';
import { createHerds, HERD_KIND } from './herds.js';
import { createStability } from './stability.js';
import { createPop, POP_KIND } from './pop.js';
import { createHerdCrowd } from '../../world/herd-crowd.js';
import { SEASON_NAMES } from '../../data/common.js';

const GRAZERS = new Set(Object.keys(POP_KIND));   // the herd species (pop.js)
const HUNTER_IDS = new Set(['lion', 'hyena', 'crocodile']);
const BROWSE_TREES = new Set(['umbrella', 'whistling', 'marula', 'kigelia']);   // what an elephant pushes over (never the baobab or the fig)

export function createSavanna(ctx) {
  const { W, env, biome } = ctx;
  if (biome.id !== 'savanna') return { savanna: null };
  const year = biome.year || { wet: 3, dry: 3 };
  const edge = env.edgeRadius || env.radius + 6;
  const S = (env.radius || 50) * 46 / 38;   // the grass map's half side: the same square as the environment's (scatter.js)
  const grass = createGrass({ S, N: 32, land: (x, z) => Math.hypot(x, z) < edge - 1.5 && !env.isWater(x, z), seed: 7 });
  const herds = createHerds({ grass, edge, isWater: (x, z) => env.isWater(x, z) });
  const stability = createStability();
  // the water the herds walk to: the river and the waterholes, sampled once on a coarse grid (pop.js asks for the nearest)
  const WATER = [];
  for (let x = -edge; x <= edge; x += 3) for (let z = -edge; z <= edge; z += 3) if (Math.hypot(x, z) < edge && env.isWater(x, z)) WATER.push(x, z);
  function nearWater(x, z) {
    let b = 1e9, bx = 0, bz = 0;
    for (let i = 0; i < WATER.length; i += 2) { const d = (WATER[i] - x) ** 2 + (WATER[i + 1] - z) ** 2; if (d < b) { b = d; bx = WATER[i]; bz = WATER[i + 1]; } }
    return { x: bx, z: bz, d: Math.sqrt(b) };
  }
  const pop = createPop({ grass, nearWater, edge });
  const live = !W.research && !W.training;   // a mystery, a robot lesson or the training field has its own rules
  const crowd = createHerdCrowd(env.root, env, { builders: ctx.animalBuilders || {}, quality: () => (ctx.pipe && ctx.pipe.quality) || 'medium', renderer: ctx.pipe && ctx.pipe.renderer });
  const map = new Uint8Array(32 * 32 * 4);
  const st = { late: false, season: null, year: -1, migOn: false, arrived: -1, wildeArrived: -1, left: -1, fireYear: 0, lastFireYear: -1, notes: {} };
  const amb = (t, k) => ctx.amb && ctx.amb(t, k);
  const once = (key, t, k = 'info') => { if (st.notes[key]) return; st.notes[key] = 1; amb(t, k); };
  let mapT = 0, stabT = 0, grazeT = 0, eleT = 20, fireT = 0, popT = 0;
  W.stability = stability.value;

  // ─────────────────────────────────── the stability bar (beside the HUD; RTL)
  const bar = document.createElement('div');
  bar.className = 'sv-stab'; bar.setAttribute('role', 'meter'); bar.setAttribute('aria-label', 'יציבות הסוואנה');
  bar.innerHTML = '<b>יציבות</b><span class="sv-st-bar"><i></i></span>';
  bar.title = 'האם הסוואנה חוזרת לאיזון אחרי כל שינוי';
  const style = document.createElement('style');
  style.textContent = `#ui .sv-stab{position:absolute;top:calc(var(--hudH,58px) + 8px);right:12px;direction:rtl;display:flex;align-items:center;gap:6px;
    padding:4px 10px;border-radius:12px;background:rgba(40,30,18,.62);color:#f6ead2;font:600 calc(13px*var(--ts,1)) system-ui,sans-serif;pointer-events:auto;z-index:3}
    #ui .sv-stab .sv-st-bar{width:96px;height:9px;border-radius:5px;background:rgba(255,255,255,.18);overflow:hidden;display:block}
    #ui .sv-stab .sv-st-bar i{display:block;height:100%;width:50%;border-radius:5px;background:linear-gradient(90deg,#d8a040,#8ac04a);transition:width .8s}
    #ui .sv-stab.low .sv-st-bar i{background:linear-gradient(90deg,#c8502a,#e0a040)}
    #ui .sv-stab{cursor:pointer}
    #ui .sv-herds{position:absolute;top:-6px;right:calc(100% + 10px);min-width:150px;padding:6px 10px;border-radius:10px;background:rgba(40,30,18,.9);
      direction:rtl;display:grid;grid-template-columns:auto auto auto;gap:2px 10px;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.3)}
    #ui .sv-herds[hidden]{display:none}
    #ui .sv-herds b{grid-column:1/-1;font-size:.92em;opacity:.85;margin-bottom:2px}
    #ui .sv-herds .n{text-align:left;font-variant-numeric:tabular-nums}
    #ui .sv-herds .up{color:#9ad46a}#ui .sv-herds .down{color:#f0a060}#ui .sv-herds .same{opacity:.5}
    #ui .hud .sv-stab.h-item{position:relative;top:auto;right:auto;background:none;padding:0 6px;border-radius:0}
    #ui .hud .sv-stab.h-item .sv-herds{top:calc(100% + 8px);right:0}`;
  // 1.4.2 (Avi, 1.11): the bar sat over the missions panel; it lives in the HUD now, beside the season (fallback: the corner)
  const uiRoot = document.getElementById('ui');
  if (uiRoot && !W.research && !W.training) {
    uiRoot.appendChild(style);
    const hud = uiRoot.querySelector('.hud'), sp = hud && hud.querySelector('.speed');
    if (sp) { bar.classList.add('h-item'); hud.insertBefore(bar, sp); } else uiRoot.appendChild(bar);
  }
  // 1.4.3 (Avi: "manage the numbers of the animals"): a press on the bar shows the herds and the hunters, how many and
  // which way each is going. It never opens by itself and closes after a few seconds, so it covers nothing for long.
  const list = document.createElement('div'); list.className = 'sv-herds'; list.hidden = true; bar.appendChild(list);
  const HERD_NAMES = { zebra: 'זברות', wildebeest: 'גנו', impala: 'אימפלות', buffalo: 'תאואים' };
  const HUNTER_NAMES = { lion: 'אריות', hyena: 'צבועים', crocodile: 'תנינים' };
  const lastN = {}; let listT = 0;
  function paintList() {
    const cnt = {}; for (const a of W.animals) if (ctx.alive(a) && !a.leaving && !a.visitor) cnt[a.sp.id] = (cnt[a.sp.id] || 0) + 1;
    const row = (name, n, k) => { const d = n - (lastN[k] ?? n); lastN[k] = n; const c = d > 0 ? 'up' : d < 0 ? 'down' : 'same', ar = d > 0 ? '▲' : d < 0 ? '▼' : '•'; return `<span>${name}</span><span class="n">${n}</span><span class="${c}">${ar}</span>`; };
    let html = '<b>העדרים</b>';
    for (const k in HERD_NAMES) { const n = pop.total(k, cnt[k] || 0); if (n) html += row(HERD_NAMES[k], n, k); }
    for (const k in HUNTER_NAMES) if (cnt[k]) html += row(HUNTER_NAMES[k], cnt[k], k);
    list.innerHTML = html.length > 20 ? html : '<b>עוד אין כאן עדרים</b>';
  }
  bar.addEventListener('click', (e) => { e.stopPropagation(); list.hidden = !list.hidden; if (!list.hidden) { paintList(); listT = 8; } });
  function paintBar() {
    const i = bar.querySelector('i'); if (i) i.style.width = Math.round(stability.value * 100) + '%';
    bar.classList.toggle('low', stability.value < 0.35);
  }

  // ─────────────────────────────────── 1.4.2 (Avi, 1.11): the plain pushes back
  // Grass that runs out: a grazer standing where its band of grass is eaten, dry or burnt grows hungry faster (on top of
  // the desert's thirst, water.js). Lions and hyenas compete: when the hyenas are twice the lions they steal the kills
  // and the lions go hungry; when the lions outnumber them, they chase the hyenas off. W.thirstK is the hook the animals
  // already read (world/animals.js); it stays 1 in a mystery, the training field and the robot lab.
  const BAND_NEED = { zebra: 0.5, wildebeest: 0.3, buffalo: 0.3, impala: 0.12 };
  const rival = { lionK: 1, hyenaK: 1 };
  const baseThirst = W.thirstK || (() => 1);
  const calmPlace = () => W.research || W.training;
  W.thirstK = (a) => {
    let k = baseThirst(a);
    if (calmPlace()) return k;
    const need = BAND_NEED[a.sp.id];
    if (need) { const g = grass.at(a.pos.x, a.pos.z); if (g.h < need) { k *= 1 + 1.4 * (1 - g.h / need); if (a.energy < 0.4) once('grass-low', 'העשב כאן נגמר, והרועים רעבים. שתלו עוד עשב, פזרו אותו, או הביאו פחות רועים.', 'warn'); } }
    if (a.sp.id === 'lion') k *= rival.lionK; else if (a.sp.id === 'hyena') k *= rival.hyenaK;
    return k;
  };
  function rivalTick() {
    let L = 0, Hy = 0;
    for (const a of W.animals) { if (!ctx.alive(a) || a.leaving) continue; if (a.sp.id === 'lion') L++; else if (a.sp.id === 'hyena') Hy++; }
    rival.lionK = L > 0 && Hy >= 2 && Hy >= 2 * L ? 1.8 : 1;
    rival.hyenaK = Hy > 0 && L > Hy ? 1.5 : 1;
    if (rival.lionK > 1) once('hy-steal', 'הצבועים רבים מהאריות, והם גונבים מהם את הטרף. האריות רעבים.', 'warn');
    if (rival.hyenaK > 1) once('li-chase', 'האריות רבים מהצבועים, ומגרשים אותם מהטרף. הצבועים רעבים.', 'warn');
  }

  // ─────────────────────────────────── the year
  function seasonTick() {
    const s = seasonAt(W.day, W.dayFrac, year), Y = year.wet + year.dry, yi = Math.floor((W.day - 1) / Y);
    W.season = s.season; W.seasonFrac = s.frac; W.dryK = s.dryK; W.svWet = s.wet;
    // a drought holds the first shower back until it is over (rainsGate, seasons.js)
    const gate = rainsGate(st, s.season, (W.droughtT || 0) > 0);
    if (gate === 'rain') {
      W.rainTarget = 0.85; W.rainT = Math.max(W.rainT || 0, 35);   // the rains begin with a real shower
      amb('הגשמים הגיעו! העשב מוריק, ובורות המים מתמלאים.', 'good');
    } else if (gate === 'held') amb('עונת הגשמים הגיעה, אבל השמיים עדיין בהירים. הגשמים מתעכבים.', 'warn');
    if (st.season && st.season !== s.season) {
      if (!W.xp && !W.viewMode) ctx.ui?.toast?.(`הגיעה עונת ה${SEASON_NAMES[s.season]}`, 'info');
      if (s.season === 'wet') {
        // a whole dry season passed: was the island stable through it? (missions: goal 'stable')
        if (stability.value >= 0.5) W.stats.stableSeasons = (W.stats.stableSeasons || 0) + 1;
        // a year with no fire and no elephants: the thorn shrubs spread over the grass
        if (st.lastFireYear < yi - 1 && !elephants().length) encroach();
      } else {
        amb('עונת היובש התחילה. העשב יצהיב, ובורות המים יתכווצו.', 'info');
      }
      if (ctx.robo && W.xp && !W.research) ctx.robo('zone:season:' + s.season, { key: null, force: true });
    }
    st.season = s.season;
    // the migration: once it began (the event, or from the second year), every year with the green grass
    if (!st.migOn && yi >= 1) st.migOn = true;
    if (st.migOn && !W.research && !W.training) {
      if (s.season === 'wet' && s.frac > 0.3 && st.arrived !== yi) { st.arrived = yi; arrive('zebra'); }
      if (s.season === 'wet' && s.frac > 0.55 && st.wildeArrived !== yi) { st.wildeArrived = yi; arrive('wildebeest'); }
      if (s.season === 'dry' && s.frac > 0.35 && st.left !== yi && herds.list.length) { st.left = yi; herds.leaveAll(); amb('העשב התייבש, והעדרים יוצאים לדרך. בשנה הבאה, עם הגשמים, הם יחזרו.', 'info'); }
    }
  }
  function arrive(kind, herdsN = 1) {
    const g = grass.stats();
    const n = Math.round(clamp(6 + g.h * 10, 5, 16));   // a greener, taller plain draws a bigger herd
    for (let i = 0; i < herdsN; i++) herds.arrive(kind, n);
    if (kind === 'zebra') once('mig1', 'הנדידה הגיעה! עדרי זברות נכנסים מקצה המישור. הן אוכלות את העשב הגבוה.', 'good');
    else once('mig2', 'אחרי הזברות מגיעים הגנו. הם אוכלים את העלים הרכים שהזברות השאירו.', 'good');
  }
  const elephants = () => W.animals.filter((a) => a.sp.id === 'elephant' && ctx.alive(a) && !a.leaving);

  // ─────────────────────────────────── fire in the dry grass
  // a grass fire is one of W.fires with { grass: true, vx, vz }: it moves with the wind and burns the grass map under it
  function startFire(size = 1) {
    let best = null, bs = 0;
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * (edge - 16), x = Math.cos(a) * r, z = Math.sin(a) * r;
      const c = grass.canBurn(x, z); if (c > bs) { bs = c; best = { x, z }; }
    }
    if (!best || bs < 0.15) { amb('העשב ירוק או קצר מדי, והאש כבתה לבד.', 'info'); return null; }
    const wa = Math.random() * Math.PI * 2, f = { x: best.x, z: best.z, r: 3 + size * 2, intensity: 0, t: 0, dur: 40 + size * 20, grass: true, vx: Math.cos(wa) * 0.9, vz: Math.sin(wa) * 0.9 };
    grass.burn(f.x, f.z, 2.5);   // where it is lit, the grass burns at once
    W.fires.push(f); st.lastFireYear = Math.floor((W.day - 1) / (year.wet + year.dry));
    if (ctx.rig && ctx.rig.focusOn && !W.research) ctx.rig.focusOn(new THREE.Vector3(f.x, 3, f.z), 44);
    return f;
  }
  function fireTick(dt) {
    for (const f of W.fires) {
      if (!f.grass) continue;
      f.x += f.vx * dt; f.z += f.vz * dt;
      if (f.intensity > 0.4) grass.burn(f.x, f.z, f.r * 0.8);
      // the fire goes out where nothing dry is left to burn (green or short grass, water, the edge)
      const fuel = grass.canBurn(f.x + f.vx * 3, f.z + f.vz * 3);
      if ((fuel < 0.05 || Math.hypot(f.x, f.z) > edge - 2 || env.isWater(f.x, f.z)) && f.t > 4) f.dur = Math.min(f.dur, f.t + 8);
      // it spreads sideways into dry grass now and then (a few fires at most)
      if (f.intensity > 0.8 && W.fires.length < 5 && Math.random() < dt * 0.04) {
        const a = Math.atan2(f.vz, f.vx) + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6);
        const x = f.x + Math.cos(a) * f.r * 1.6, z = f.z + Math.sin(a) * f.r * 1.6;
        if (grass.canBurn(x, z) > 0.3) W.fires.push({ x, z, r: f.r * 0.8, intensity: 0, t: 0, dur: f.dur * 0.6, grass: true, vx: f.vx, vz: f.vz });
      }
    }
  }
  function stopFires() { for (const f of W.fires) if (f.grass) f.dur = Math.min(f.dur, f.t + 5); }

  // ─────────────────────────────────── the elephant as an engineer, and the shrubs when nothing opens the plain
  function elephantTick() {
    const els = elephants(); if (!els.length) return;
    const trees = W.plants.filter((p) => ctx.alive(p) && BROWSE_TREES.has(p.sp.id));
    if (trees.length <= 2) { once('ele-few', 'הפילים מחפשים עצים ושיחים, ומעט מאוד נשארו. כשיש יותר מדי פילים, העצים נעלמים.', 'warn'); return; }
    for (const e of els) {
      if (Math.random() > 0.45) continue;
      const dev = ctx.tools && ctx.tools.tech && ctx.tools.tech.desert;   // 1.4.2: a beehive fence keeps the elephants off
      const near = trees.filter((p) => Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < 14 && (p.sp.kind === 'shrub' || p.growth < 0.75) && !(dev && dev.guardAt(p.x, p.z) > 0.4));
      if (!near.length) continue;
      const p = near[(Math.random() * near.length) | 0];
      if (p.sp.kind === 'shrub' || p.growth < 0.45) { p.die('elephant'); once('ele-open', `הפיל הפיל ${p.sp.name} ופתח מקום לעשב. כך הסוואנה נשארת פתוחה.`, 'good'); }
      else { p.health = Math.max(0.3, p.health - 0.25); once('ele-bark', 'הפיל קילף קליפה של עץ ואכל אותה. עץ אחד יחזיק מעמד, אבל הרבה פילים על מעט עצים זה קשה.', 'info'); }
    }
  }
  function encroach() {
    const sp = ctx.reg.byId.get('whistling'); if (!sp) return;
    let n = 0;
    for (let i = 0; i < 3; i++) { const s = ctx.randomPlaceSpot && ctx.randomPlaceSpot(sp); if (s && ctx.spawnPlant(sp, s.x, s.z, { growth: 0.3, wild: true })) n++; }
    if (n) amb('שנה שלמה בלי אש ובלי פילים: השיחים הקוצניים מתפשטים ותופסים את מקום העשב.', 'warn');
  }

  // ─────────────────────────────────── the resident herds (pop.js)
  const HERD_WORDS = { zebra: 'הזברות', wildebeest: 'הגנו', impala: 'האימפלות', buffalo: 'התאואים' };
  const HUNT_WORDS = { lion: 'האריות לקחו', hyena: 'הצבועים לקחו', crocodile: 'התנין לקח' };
  const noteT = {};
  const note = (key, text, kind = 'info', gap = 150) => { if (W.simT - (noteT[key] ?? -1e9) < gap) return; noteT[key] = W.simT; amb(text, kind); };
  const firstRobo = (key) => { if (st.notes['robo:' + key]) return; st.notes['robo:' + key] = 1; if (ctx.robo) ctx.robo(key); };
  const _home = { x: 0, z: 0 };
  function popTick(dt) {
    const members = {}, preds = [];
    for (const a of W.animals) {
      if (!ctx.alive(a) || a.leaving || a.visitor) continue;
      if (GRAZERS.has(a.sp.id)) (members[a.sp.id] = members[a.sp.id] || []).push(a.pos);
      else if (HUNTER_IDS.has(a.sp.id)) preds.push({ id: a.uid, kind: a.sp.id, x: a.pos.x, z: a.pos.z, hungry: a.energy < 0.75 && !a.injured, a });
    }
    for (const k in members) pop.ensure(k, members[k]);   // a herd is made the first time its animals are on the island
    const ev = pop.step(dt, { members, wet: W.svWet ?? 1, dryK: W.dryK || 0, night: W.nightGlow || 0, preds });
    for (const e of ev) {
      const H = HERD_WORDS[e.kind];
      if (e.type === 'born') note('born:' + e.kind, `עדר ${H} גדל, כי יש הרבה עשב ירוק.`, 'good', 200);
      else if (e.type === 'left') { note('left:' + e.kind, `חלק מעדר ${H} עזב לחפש עשב במקום אחר.`, 'warn'); firstRobo('zone:sv:left'); }
      else if (e.type === 'thirst') { note('thirst:' + e.kind, `חלק מעדר ${H} עזב לחפש מים.`, 'warn'); firstRobo('zone:sv:left'); }
      else if (e.type === 'overgrazed') { note('over:' + e.kind, `עדר ${H} אכל את העשב עד האדמה. העדר יעבור למקום אחר, והעשב יצמח שוב בגשם.`, 'warn', 240); firstRobo('zone:sv:over'); }
      else if (e.type === 'kill') {
        const p = preds.find((q) => q.id === e.pred); if (p) { p.a.energy = 1; p.a.eatCD = 25; }   // the hunter is fed (and so it may raise young: update.js births)
        note('kill:' + e.by, `${HUNT_WORDS[e.by]} חיה אחת מעדר ${H}. עכשיו הם שבעים, והעדר קטן קצת.`, 'info', 200); firstRobo('zone:sv:hunt');
      }
    }
    // the herd's animals live where their herd grazes: their home walks after its centre
    for (const a of W.animals) {
      if (!GRAZERS.has(a.sp.id) || !ctx.alive(a) || a.leaving || !a.home) continue;
      const h = pop.herd(a.sp.id); if (!h) continue;
      _home.x = h.x + (((a.uid * 37) % 9) - 4); _home.z = h.z + (((a.uid * 53) % 9) - 4);
      if (Math.hypot(a.home.x - _home.x, a.home.z - _home.z) > 5) { a.home.x += (_home.x - a.home.x) * 0.25; a.home.z += (_home.z - a.home.z) * 0.25; a.home.y = env.heightAt(a.home.x, a.home.z); }
    }
  }
  // what the crowd draws: the migrating herds (herds.js) and the rest of each resident herd around its animals
  const _rows = [];
  function crowdGroups() {
    _rows.length = 0;
    for (const h of herds.list) _rows.push(h);
    if (live) for (const h of pop.list()) if (h.n > 0) _rows.push({ id: 100 + Object.keys(POP_KIND).indexOf(h.kind), kind: h.kind, n: h.n, x: h.x, z: h.z, hx: h.tx - h.x || 0.01, hz: h.tz - h.z || 0.01, state: Math.hypot(h.tx - h.x, h.tz - h.z) > 1 ? 'move' : 'graze', scatter: 0, spread: pop.spreadOf(h, 0), resident: true });
    return _rows;
  }
  W.herdCount = (id) => { const h = live && pop.herd(id); return h ? h.n : 0; };   // the rest of a herd beyond the animals the child placed
  W.herdAlive = () => (live ? pop.list().filter((h) => h.n > 0).map((h) => h.kind) : []);   // ecology.js aliveSpecies

  // ─────────────────────────────────── each frame
  function tick(dt, rdt) {
    seasonTick();
    if (dt <= 0) { crowd.update(crowdGroups(), rdt, W.simT, { spreadOf: (k) => (HERD_KIND[k] ? HERD_KIND[k].spread : 6) }); return; }
    grass.step(dt, { wet: grassWet(W.svWet, W.droughtT > 0 ? W.drought : 0), rain: W.rain || 0 });
    // the player's own grazers eat their band too (lightly), so the grazing order shows on the plain
    grazeT += dt;
    if (grazeT >= 1) {
      // (the herd species eat as whole herds in pop.js; in a mystery or a lesson their animals still graze lightly here)
      if (!live) for (const a of W.animals) if (GRAZERS.has(a.sp.id) && ctx.alive(a) && !a.leaving) grass.eat(a.pos.x, a.pos.z, a.sp.graze || 'mid', 0.01 * grazeT, 3);
      // thorn shrubs shade the grass around them
      for (const p of W.plants) if (p.sp.id === 'whistling' && ctx.alive(p) && p.growth > 0.4) grass.eat(p.x, p.z, 'mid', 0.006 * grazeT, 2.5);
      grazeT = 0;
    }
    // the herds and what happens to them
    const lions = W.animals.filter((a) => a.sp.id === 'lion' && ctx.alive(a)).map((a) => ({ x: a.pos.x, z: a.pos.z }));
    const crocs = W.animals.filter((a) => a.sp.id === 'crocodile' && ctx.alive(a)).map((a) => ({ x: a.pos.x, z: a.pos.z }));
    for (const ev of herds.step(dt, { night: W.nightGlow || 0, lions, crocs })) {
      if (ev.type === 'cross') once('cross', 'העדר חוצה את הנהר! זה הרגע המסוכן בנדידה.', 'info');
      else if (ev.type === 'chase') once('chase-' + ev.by, ev.by === 'lion' ? 'אריות התקרבו בחושך, והעדר התפזר בריצה. הם יתאספו שוב בבוקר.' : 'תנין חיכה במים, והעדר מיהר לצאת לגדה השנייה.', 'info');
      else if (ev.type === 'move') once('move', 'העדר אכל את העשב כאן, וממשיך למקום אחר במישור.', 'info');
    }
    if (live) { popT += dt; if (popT >= 1) { popTick(popT); popT = 0; } }
    crowd.update(crowdGroups(), rdt, W.simT, { spreadOf: (k) => (HERD_KIND[k] ? HERD_KIND[k].spread : 6) });
    // fire
    fireTick(dt);
    if (W.season === 'dry' && W.seasonFrac > 0.5) {   // a dry thunderstorm: a lightning fire now and then (once a year at most)
      fireT += dt;
      const yi = Math.floor((W.day - 1) / (year.wet + year.dry));
      if (fireT > 60 && st.lastFireYear !== yi && st.migOn && !W.research && Math.random() < dt * 0.002 && grass.stats().h > 0.45) { fireT = 0; startFire(1); amb('ברק הצית את העשב היבש! אש קטנה מחדשת את העשב, אבל צריך לשמור על העצים הצעירים.', 'warn'); }
    }
    // elephants
    eleT -= dt; if (eleT <= 0) { eleT = 35; elephantTick(); }
    // the stability meter
    stabT -= dt;
    if (stabT <= 0) {
      stabT = 3;
      if (!calmPlace()) rivalTick();
      let grazers = herds.count() * 0.3, preds = 0, trees = 0;
      for (const a of W.animals) { if (!ctx.alive(a) || a.leaving) continue; if (GRAZERS.has(a.sp.id)) grazers++; if (HUNTER_IDS.has(a.sp.id)) preds++; }
      for (const h of pop.list()) grazers += h.n;   // the resident herds (pop.js)
      for (const p of W.plants) if (ctx.alive(p) && p.isTree && p.growth > 0.4) trees++;
      const g = grass.stats();
      W.stability = stability.sample({ grass: g.h * (0.5 + 0.5 * Math.max(g.g, 0.4)), grazers, trees, predators: preds, kinds: W.aliveSpecies().length });
      paintBar();
      if (!list.hidden) { listT -= 3; if (listT <= 0) list.hidden = true; else paintList(); }
    }
    // the grass map to the environment
    mapT -= rdt;
    if (mapT <= 0) { mapT = 0.5; if (env.setGrassMap) env.setGrassMap(grass.toMap(map)); }
  }

  function effect(fx) {
    if (fx.type === 'migrate') { st.migOn = true; const yi = Math.floor((W.day - 1) / (year.wet + year.dry)); st.arrived = yi; arrive('zebra', Math.max(1, Math.min(2, (fx.herds || 2) - 1))); st.wildeArrived = -1; return true; }
    if (fx.type === 'grassfire') { if (fx.size > 0) startFire(fx.size); else stopFires(); return true; }
    return false;
  }
  function serialize() { return { g: grass.save(), h: herds.save(), p: pop.save(), s: stability.save(), m: st.migOn ? 1 : 0, a: st.arrived, w: st.wildeArrived, l: st.left, f: st.lastFireYear }; }
  function restore(o) {
    if (!o) return;
    grass.load(o.g); herds.load(o.h); pop.load(o.p); stability.load(o.s);   // a save from before 1.4.3 has no p: the herds are made from the animals on the island
    st.migOn = !!o.m; st.arrived = o.a ?? -1; st.wildeArrived = o.w ?? -1; st.left = o.l ?? -1; st.lastFireYear = o.f ?? -1;
    W.stability = stability.value; paintBar();
  }
  function dispose() { crowd.dispose(); bar.remove(); style.remove(); if (W.thirstK !== baseThirst) W.thirstK = baseThirst; }
  paintBar();
  const api = { tick, effect, serialize, restore, dispose, grass, herds, pop, crowd, stability, startFire, debug: { st, arrive, encroach, elephantTick } };
  W.savanna = api;   // the tests (tests/play/savanna.json) read it through window.__game.savanna
  return { savanna: api };
}
