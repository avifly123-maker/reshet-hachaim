// The main update, every frame: time of day and seasons, weather, fires, the environment, light, plants, animals,
// tools, births, vitality and points, auto-save, missions, the experiment clock, the HUD, links, the selection
// marker, the hover label, immersive views, the camera, audio; and the injured-animal list and edge arrows
// (W.onHurt), weather, seasons, the pines after a fire, births and hunger warnings.
// Gives ctx: update.
// Takes from ctx: the names destructured at the top of createUpdate.
// Shared state it reads or changes: ctx.session, ctx.report, ctx.shafts, ctx.lightDirty, ctx.tools,
// ctx.pendingEvent, ctx.coachStep, ctx.moments, ctx.webMode, ctx.lastMove, ctx.dragState, ctx.moving, ctx.mv,
// ctx.down, ctx.fieldcam, ctx.tour, ctx.after, ctx.disposed.
import * as THREE from 'three';
import { CARD_ART } from '../../data/card-art.js';
import { SEASON_NAMES, gw } from '../../data/common.js';
import { clamp, smoothstep, damp, SEASONS } from '../../core/util.js';
import { DAY_LEN, animalCap, _v } from './common.js';

export function createUpdate(ctx) {
  const { W, alive, reg, ui, biome, guide, robo, roboOne, env, audio, amb, camera, updateLight, saveGame, missions,
    endExperiment, refreshPanel, refreshTray, tmpLinks, rebuildLinks, links, markers, select, pipe, placeMoveHandle,
    pick, canvas, hurtText, rig, fitViewToUI, startIntro, thumbs, findSpotNear, spawnPlant, spawnAnimal } = ctx;

  // ─────────────────────────────────────────── main update
  let autoSaveT = 40, fitT = 0, hudT = 0, simTickT = 0, vitT = 0, birthT = 0, weatherT = 0, panelT = 0, hungryWarn = {}, prevNight = 0, coachStarted = false, lightningT = 0;
  let lightT = 0, linksT = 0, hoverT = 0;   // (declared with the light, links and pointer state before the split; only the update uses them)
  function computeVitality() {
    const present = W.aliveSpecies();
    const richness = Math.min(1, present.length / 10);
    const pl = W.plants.filter(alive);
    const ph = pl.length ? pl.reduce((s, p) => s + p.health, 0) / pl.length : 0.3;
    const an = W.animals.filter(a => alive(a) && a.type === 'animal' && !a.leaving);
    const fed = an.length ? an.reduce((s, a) => s + clamp(a.energy / 0.55), 0) / an.length : 0.7;
    const ps = new Set(present); let act = 0; for (const e of reg.edges) if (ps.has(e.from) && ps.has(e.to)) act++;
    const linkScore = Math.min(1, act / Math.max(4, present.length * 1.3));
    let v = 0.3 * richness + 0.3 * ph + 0.22 * fed + 0.18 * linkScore;
    if (!pl.length) v *= 0.4;
    if (W.road && !W.road.bridge) v -= 0.12;
    return clamp(v);
  }

  function update(rdt, t) {
    const dt = ui.isModalOpen() || (ctx.session && ctx.session.paused()) ? 0 : rdt * W.speed;   // a mystery's notebook (intro, lab, the end) stops the clock too
    W.lastTickDt = dt;
    W.simT += dt;
    // time of day / seasons
    const prevFrac = W.dayFrac;
    W.dayFrac = (W.dayFrac + dt / DAY_LEN * (1 + 3 * W.nightGlow)) % 1;   // nights pass quickly
    if (W.dayFrac < prevFrac) {
      const ended = ctx.report ? ctx.report.dayEnded() : null; W.day++;
      if (biome.id === 'grove') { const i = (SEASONS.indexOf(W.season) + 1) % 4; W.season = SEASONS[i]; if (!W.xp) ui.toast(`הגיעה עונת ה${SEASON_NAMES[W.season]}`, 'info'); seasonBegins(W.season); }
      ctx.report?.dayBegan(ended);   // the full mode offers to write "דוח החוקר"; חוויה has no daily report:
      if (W.xp && !W.research && !(guide() && guide().isOpen())) {   // רובו־דע says one line at the end of the day instead
        if (biome.id === 'grove') robo('zone:season:' + W.season, { key: null, force: true });
        else if (W.day % 3 === 0 && W.simT - (W._roboT ?? -999) > 150) roboOne('zone:dayend', W.day / 3);   // every third day, and only after a quiet while
      }
    }
    W.seasonFrac = W.dayFrac;
    // weather
    weatherUpdate(dt, rdt);
    ctx.report?.tick(dt);
    // env
    const night = 1 - smoothstep(-0.12, 0.14, env.sun.elevation ?? 0.5);
    W.nightGlow = night;
    if (night > 0.6 && prevNight <= 0.6) { audio.play('night'); if (W.plants.some(p => p.sp.id === 'glowfungus' && alive(p)) && !W._glowNoted) { W._glowNoted = true; amb('לילה! הפטריות הזוהרות מאירות את קרקעית היער.', 'good'); } }
    if (night < 0.3 && prevNight >= 0.3) audio.play('dawn');
    prevNight = night;
    // fires
    for (const f of W.fires) { f.t += dt; f.intensity = f.t < 4 ? f.t / 4 : f.t > f.dur - 8 ? Math.max(0, (f.dur - f.t) / 8) : 1; }
    if (W.fires.length && W.fires.every(f => f.t >= f.dur)) { W.fires = []; afterFire(); }
    const summerDry = biome.id === 'grove' ? (W.season === 'summer' ? 0.45 + W.seasonFrac * 0.2 : W.season === 'autumn' ? 0.35 * (1 - W.seasonFrac) : 0) : 0;
    env.update(rdt, {
      t, dayFrac: W.dayFrac, season: W.season, seasonFrac: W.seasonFrac, rain: W.rain, wind: W.wind, nightGlow: night, camera,
      vitality: W.vitality, drought: Math.max(W.drought, summerDry), flood: W.flood || 0, heat: W.heat || 0, fire: W.fires.filter(f => f.intensity > 0).map(f => ({ x: f.x, z: f.z, r: f.r, intensity: f.intensity })),
      lightning: W._flash ? (W._flash = false, true) : false, shafts: W.experiment ? ctx.shafts : ctx.shafts,
    });
    // light (expensive) ~ every 0.6 s or when dirty
    lightT -= rdt;
    if (ctx.lightDirty || lightT <= 0) { lightT = 0.6; ctx.lightDirty = false; updateLight(); }
    // plants
    simTickT += dt;
    if (simTickT >= 0.25) { const st = simTickT; simTickT = 0; for (const p of W.plants.slice()) p.tick(st, W); }
    for (const p of W.plants.slice()) if (!p.removed) p.frame(rdt, t, W);
    // animals
    for (const a of W.animals.slice()) if (!a.removed) { if (a.injured) ctx.tools.updateInjured(a, rdt, t); else a.update(dt, rdt, t); }
    ctx.tools.update(dt, rdt, t);
    // births
    birthT += dt;
    if (birthT > 8) { birthT = 0; if (!W.research) { births(); hungerWarnings(); } }
    // vitality & points
    vitT += dt;
    if (vitT >= 1) {
      W.vitality = damp(W.vitality, computeVitality(), 1.5, vitT);
      W.income = (0.08 + 0.022 * W.aliveSpecies().length * W.vitality) * (W.kids ? 2 : 1);   // points per second – kept low so every purchase is a decision
      W.points += vitT * W.income;
      vitT = 0;
    }
    autoSaveT -= rdt; if (autoSaveT <= 0) { if (W.experiment || ctx.pendingEvent) autoSaveT = 5; else { autoSaveT = 40; if (W.simT > 10) saveGame(true); } }
    // missions & events (start only after the welcome tutorial)
    if (!W.missionsOn && !W.research && (ctx.coachStep < 0 && coachStarted && W.simT > 4)) W.missionsOn = true;
    if (ctx.session) ctx.session.update(dt, rdt, t);
    if (W.missionsOn) missions.tick();
    ctx.moments?.tick(rdt);
    if (W.experiment) {
      W.experiment.t += rdt;
      const left = Math.max(0, Math.ceil(W.experiment.dur - W.experiment.t));
      ui.setExperiment({ active: true, name: W.experiment.sp.name, secondsLeft: left });
      if (W.experiment.t >= W.experiment.dur) endExperiment();
    }
    // HUD
    hudT -= rdt;
    if (hudT <= 0) {
      hudT = 0.25;
      ui.setHUD({ points: Math.floor(W.points), vitality: W.vitality, speciesAlive: W.aliveSpecies().length, speciesTotal: biome.species.length, dayFrac: W.dayFrac, day: W.day, season: W.season ? SEASON_NAMES[W.season] : null, seasonId: W.season, speed: W.speed, isNight: night > 0.6 });
      ui.setMissions(W.missionsOn ? missions.list() : []);
      ui.setInjured(injuredList());
      panelT -= 0.25; if (panelT <= 0) { panelT = 1; refreshPanel(); refreshTray(); }
    }
    // links (selected / web / temp)
    linksT -= rdt;
    for (let i = tmpLinks.length - 1; i >= 0; i--) if (W.simT > tmpLinks[i].until) tmpLinks.splice(i, 1);
    if (linksT <= 0) { linksT = 0.2; if (W.selected || ctx.webMode || W.experiment || tmpLinks.length) rebuildLinks(); else links.set([]); }
    links.update(t);
    // selection marker
    if (W.selected && alive(W.selected)) { const e = W.selected; e.focusPoint(_v); const gy = env.heightAt(_v.x, _v.z); const r = e.isPlant ? Math.max(0.8, e.vis.crown().radius * e.obj.scale.x * (e.isTree ? 0.35 : 1)) : Math.max(0.6, (e.vis.length || 1) * e.obj.scale.x * 0.6); markers.select(_v, r, gy); }
    else if (W.selected) select(null);
    const px = pipe.renderer.getContext().drawingBufferHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
    markers.update(rdt, t, camera, px);
    // hover label
    hoverT -= rdt;
    placeMoveHandle();
    if (hoverT <= 0 && ctx.lastMove && !ctx.dragState && !ctx.moving && !ctx.mv && !ctx.down && !W.viewMode) {
      hoverT = 0.12;
      const fc = ctx.fieldcam && ctx.fieldcam.pickAt(ctx.lastMove.x, ctx.lastMove.y);
      const h = fc ? null : pick(ctx.lastMove.x, ctx.lastMove.y);
      if (fc) { ui.showHover({ x: ctx.lastMove.x, y: ctx.lastMove.y, name: 'מצלמת שטח', sub: 'לחצו כדי להסתכל דרכה, או גררו כדי להזיז' }); canvas.style.cursor = 'pointer'; }
      else if (h) { const sub = h.injured ? '❗ ' + hurtText(h) : h.isPlant ? `${h.sp.kindName}${h.growth < 0.95 ? ` · גדל ${Math.round(h.growth * 100)}%` : ''}` : (h.state === 'sleep' ? gw(h.sp.id, 'ישן', 'ישנה', 'ישנים', 'ישנות') : h.state === 'eat' ? gw(h.sp.id, 'אוכל', 'אוכלת', 'אוכלים', 'אוכלות') : h.energy < 0.3 ? gw(h.sp.id, 'רעב', 'רעבה', 'רעבים', 'רעבות') : h.sp.kindName); ui.showHover({ x: ctx.lastMove.x, y: ctx.lastMove.y, name: h.sp.name, sub }); canvas.style.cursor = 'pointer'; }
      else { ui.hideHover(); canvas.style.cursor = ''; }
    }
    if (ctx.fieldcam) ctx.fieldcam.update(rdt);
    if (ctx.tour) ctx.tour.update(dt, rdt);
    if (ctx.after) ctx.after.update(dt, rdt, t);   /* H */
    rig.update(rdt);
    fitT -= rdt; if (fitT <= 0) { fitT = 0.5; fitViewToUI(false); }
    // audio ambience
    audio.update({ dayFrac: W.dayFrac, season: W.season, rain: W.rain, wind: W.wind, vitality: W.vitality, night, cameraHeight: camera.position.y, fire: W.fires.length ? 1 : 0, speed: dt > 0 ? W.speed : 0 });
    if (!coachStarted) { coachStarted = true; if (!W.research) setTimeout(() => { if (!ctx.disposed) startIntro(); }, 900); }
    if (W.animals.some(a => a.injured) || hurtArrowsOn) updateHurtArrows();
  }

  // injured animals (1.3.2, Avi: the alert got lost): the red bar at the top (ui.setInjured), an arrow at the screen's
  // edge when the animal is out of view, רובו־דע the first time and once more before it leaves (tools.js calls W.onHurt)
  function injuredList() {
    if (W.research) return [];
    return W.animals.filter(a => a.injured && alive(a)).map(a => ({ uid: a.injured.uid, id: a.sp.id, name: a.sp.name, cause: a.injured.cause, color: a.sp.color,
      thumb: CARD_ART[a.sp.id] || thumbs[a.sp.id] || null, saving: !!a.injured.saving, left: clamp(1 - a.injured.t / a.injured.max) }));
  }
  W.onHurt = (kind) => {
    if (W.research) return;
    if (kind === 'new') {
      // his bubble rises above the tray while he explains, so the technology tab and the rescue robot stay clickable
      const root = document.getElementById('ui'); if (root) root.classList.add('rg-lift');
      Promise.resolve(robo('zone:hurt')).finally(() => { if (root) root.classList.remove('rg-lift'); });
    }
    else if (kind === 'remind') robo('zone:hurtlate', { key: null, force: true });
  };
  let hurtArrowsOn = false; const _ha = new THREE.Vector3();
  function updateHurtArrows() {
    const out = [];
    if (!W.viewMode && !W.research) {
      const r = canvas.getBoundingClientRect();
      const root = document.getElementById('ui');
      const trayH = root ? parseFloat(getComputedStyle(root).getPropertyValue('--trayH')) || 0 : 0;
      for (const a of W.animals) {
        if (!a.injured || !alive(a)) continue;
        a.focusPoint(_ha); _ha.y += 1.4; _ha.project(camera);
        const behind = _ha.z > 1; let x = _ha.x, y = _ha.y; if (behind) { x = -x; y = -y; }
        const sx0 = (x + 1) / 2 * r.width + r.left, sy0 = (1 - y) / 2 * r.height + r.top;
        if (!behind && sx0 > r.left + 40 && sx0 < r.right - 40 && sy0 > r.top + 60 && sy0 < r.bottom - trayH - 30) continue;   // in view: the "!" over it is enough
        const k = 1 / Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.86, 1e-3);
        const ex = x * k, ey = y * k;
        let sx = (ex + 1) / 2 * r.width + r.left, sy = (1 - ey) / 2 * r.height + r.top;
        sx = clamp(sx, r.left + 34, r.right - 34); sy = clamp(sy, r.top + 96, r.bottom - trayH - 34);
        out.push({ uid: a.injured.uid, x: Math.round(sx), y: Math.round(sy), ang: Math.round(Math.atan2(-y, x) * 180 / Math.PI) });
      }
    }
    hurtArrowsOn = out.length > 0;
    ui.setHurtArrows(out);
  }

  function weatherUpdate(dt, rdt) {
    weatherT -= dt;
    if (weatherT <= 0) {
      weatherT = 20;
      if (W.rainT <= 0 && W.droughtT <= 0) {
        let chance = 0;
        if (biome.id === 'amazon') chance = W.dayFrac > 0.5 && W.dayFrac < 0.72 ? 0.35 : 0.06;
        else if (biome.id === 'reef') chance = 0.04;   // a passing shower only ruffles the surface
        else chance = W.season === 'winter' ? 0.35 : W.season === 'autumn' ? 0.12 : W.season === 'spring' ? 0.1 : 0;
        if (Math.random() < chance) { W.rainTarget = 0.6 + Math.random() * 0.35; W.rainT = 25 + Math.random() * 35; }
      }
    }
    if (W.rainT > 0) { W.rainT -= dt; if (W.rainT <= 0) W.rainTarget = 0; }
    W.rain = damp(W.rain, W.rainTarget, 0.5, dt || rdt * 0.2);
    if (W.droughtT > 0) { W.droughtT -= dt; if (W.droughtT <= 0) W.drought = 0; } else W.drought = damp(W.drought, 0, 0.2, dt);
    if (W.floodT > 0) { W.floodT -= dt; if (W.floodT <= 0) W.flood = 0; }
    if (W.heatT > 0) { W.heatT -= dt; if (W.heatT <= 0) W.heat = 0; }
    if (W.stormT > 0) { W.stormT -= dt; lightningT -= dt; if (lightningT <= 0 && W.rain > 0.6) { lightningT = 4 + Math.random() * 6; W._flash = true; audio.play('thunder'); } if (W.stormT <= 0) W.storm = 0; }
    W.wind = 0.2 + W.rain * 0.35 + W.storm * 0.45;
    W.growBoost = W.rain > 0.3 ? 1.15 : 1;
    // mushrooms after rain (grove), new ferns etc.
    if (W.rain > 0.5 && biome.id === 'grove' && W.unlocked.has('mushroom') && Math.random() < dt * 0.02 && W.countAlive('mushroom') < (reg.byId.get('mushroom')?.maxCount || 4)) {
      const trees = W.plants.filter(p => alive(p) && p.isTree);
      if (trees.length) { const tr = trees[(Math.random() * trees.length) | 0]; const s = findSpotNear(reg.byId.get('mushroom'), tr.x, tr.z, 4); if (s) { spawnPlant(reg.byId.get('mushroom'), s.x, s.z, { growth: 0.6 }); if (!W._mushNoted) { W._mushNoted = true; amb('אחרי הגשם צצו פטריות ליד העצים!', 'good'); } } }
    }
  }
  function seasonBegins(s) {
    if (s === 'winter') { W.rainTarget = 0.8; W.rainT = 30; }
    if (s === 'summer') amb('קיץ: אין גשם עד הסתיו. הכלניות והרקפות נחות מתחת לאדמה, והחורש חוסך מים.', 'info');
  }
  function afterFire() {
    const pine = reg.byId.get('pine');
    if (W._pineSeeds && pine) { for (let i = 0; i < W._pineSeeds; i++) { const s = findSpotNear(pine, W._pineAt.x, W._pineAt.z, 6); if (s) spawnPlant(pine, s.x, s.z, { growth: 0.05 }); } amb('האצטרובלים של האורן נפתחו בחום – ונבטו אורנים חדשים!', 'good'); W._pineSeeds = 0; }
    ctx.lightDirty = true;
  }
  function births() {
    const groups = new Map();
    for (const a of W.animals) { if (!alive(a) || a.leaving || a.type !== 'animal') continue; if (!groups.has(a.sp.id)) groups.set(a.sp.id, []); groups.get(a.sp.id).push(a); }
    for (const [id, arr] of groups) {
      const sp = reg.byId.get(id);
      if (arr.length >= sp.maxCount || W.animals.length >= animalCap(sp)) continue;
      if (arr.length < 2 && !sp.isInsect) continue;
      if (!arr.some(a => a.isActive())) continue;
      const avg = arr.reduce((s, a) => s + a.energy, 0) / arr.length;
      const bird = sp.locomotion === 'flying' && !sp.isInsect && !sp.swims && id !== 'fruitbat';
      const nearHotel = sp.isInsect && (W.insectHotels || []).some(h => arr.some(a => Math.hypot(a.pos.x - h.x, a.pos.z - h.z) < 14));
      const nearReefBall = sp.swims && (W.reefBalls || []).some(h => arr.some(a => Math.hypot(a.pos.x - h.x, a.pos.z - h.z) < 12));
      const bonus = (bird && W.nestboxes ? 0.18 : 0) + (nearHotel ? 0.2 : 0) + (nearReefBall ? 0.2 : 0);
      if (avg < 0.66 - bonus * 0.5 || Math.random() > 0.22 + bonus) continue;
      const parent = arr.find(a => a.energy > 0.7) || arr[0];
      const p = parent.pos.clone(); if (parent.loco !== 'flying') { p.x += (Math.random() - 0.5) * 2; p.z += (Math.random() - 0.5) * 2; }
      if (!env.isPlaceable(p.x, p.z) && parent.loco !== 'flying' && parent.loco !== 'arboreal') continue;
      if (parent.loco === 'ground') p.y = env.heightAt(p.x, p.z);
      const baby = spawnAnimal(sp, p, { baby: !sp.isInsect });
      if (baby) { parent.energy -= 0.15; W.stats.births++; W.points += 1; markers.burst(baby.focusPoint(_v), '#b6ffb0', 12, { size: 0.35 }); audio.play('pop'); if (Math.random() < 0.6) amb(sp.isInsect ? `${gw(sp.id, 'עוד', 'עוד', 'עוד', 'עוד')} ${sp.name} ${gw(sp.id, 'הצטרף', 'הצטרפה', 'הצטרפו', 'הצטרפו')}!` : `משפחת ה${sp.name} גדלה!`, 'good'); }
    }
  }
  function hungerWarnings() {
    for (const a of W.animals) {
      if (!alive(a) || a.type !== 'animal' || a.energy > 0.22 || !a.sp.diet2.length) continue;
      const k = a.sp.id; if (W.simT - (hungryWarn[k] || -999) < 70) continue;
      hungryWarn[k] = W.simT;
      const foods = a.sp.diet2.map(e => reg.byId.get(e.to)?.name).filter(Boolean).slice(0, 3).join(', ');
      amb(`ה${a.sp.name} ${gw(a.sp.id,'רעב! הוא אוכל','רעבה! היא אוכלת','רעבים! הם אוכלים','רעבות! הן אוכלות')}: ${foods}.`, 'warn');
    }
  }
  return { update };
}
