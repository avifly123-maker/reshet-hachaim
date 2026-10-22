// Where things can stand and how much light they get: spacing, a free spot near a point or anywhere (randomPlaceSpot),
// a host tree for epiphytes and lianas, spawning plants and animals, the tray's placement check (checkPlace), a strong
// nursery coral (transplant), placing a group (place), and the crowns & light pass (updateLight: per-plant light, tree
// shadows, fallen fruit, the light floor and shafts). Owns ctx.crowns, ctx.lightDirty, ctx.shafts.
// Gives ctx: spacingOK, findSpotNear, spawnPlant, spawnAnimal, checkPlace, transplant, place, randomPlaceSpot,
// updateLight.
// Takes from ctx: the names destructured at the top of createPlacement;
// functions of later parts through late(): refreshTray.
// Shared state it reads or changes: ctx.lightDirty, ctx.crowns, ctx.tools, ctx.shafts.
import * as THREE from 'three';
import { SWIMMERS } from '../../sim/species.js';
import { Plant } from '../../world/plants.js';
import { Animal } from '../../world/animals.js';
import { gw, activeNameFor } from '../../data/common.js';
import { zoneWord } from '../../core/place.js';
import { animalCap, _v, late } from './common.js';

export function createPlacement(ctx) {
  const { W, alive, env, scene, light, ui, markers, audio } = ctx;
  const refreshTray = late(ctx, 'refreshTray');   // made by a later part

  // ─────────────────────────────────────────── spawning & placement
  function spacingOK(sp, x, z, ignore) {
    const k = sp.kind;
    for (const p of W.plants) {
      if (!alive(p) || p === ignore || p.host) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      const big = (k === 'tree' || k === 'palm'), pbig = p.isTree;
      const need = big && pbig ? (k === 'palm' || p.sp.kind === 'palm' ? 3.2 : 4.5) : big || pbig ? 1.4 : (k === 'shrub' || p.sp.kind === 'shrub' ? 1.3 : 0.7);
      if (d < need) return false;
    }
    return true;
  }
  function findSpotNear(sp, x, z, r, ignore) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, rr = r * (0.3 + Math.random() * 0.7);
      const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      if (sp.kind === 'water-plant' ? !env.isWater(px, pz) : !env.isPlaceable(px, pz)) continue;
      if (W.onRoad && W.onRoad(px, pz, 0.8)) continue;
      if (sp.needs?.rocks && !W.nearRock(px, pz, 3)) continue;
      if (!spacingOK(sp, px, pz, ignore)) continue;
      return { x: px, z: pz };
    }
    return null;
  }
  function hostAt(x, z, sp) {
    let best = null, bd = 4.5;
    for (const p of W.plants) {
      if (!alive(p) || !p.isTree || p.falling) continue;
      if (sp.id === 'liana') { if (p.growth < 0.6 || W.plants.some(q => q.host === p && q.sp.id === 'liana' && alive(q))) continue; }
      else { if (p.growth < 0.5 || !p.vis.attachPoints().length) continue; if (W.plants.filter(q => q.host === p && alive(q)).length >= 5) continue; }
      const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function spawnPlant(sp, x, z, opts = {}) {
    if (!opts.restore && !W.plantRoom(sp)) return null;   // a saved forest always comes back whole
    if (sp.needs?.host && !opts.host) { opts.host = hostAt(x, z, sp); if (!opts.host) return null; }
    if (opts.host && sp.kind === 'epiphyte' && !(opts.attachIdx >= 0)) { const used = new Set(W.plants.filter(q => q.host === opts.host).map(q => q.attachIdx)); const n = opts.host.vis.attachPoints().length; let idx = (Math.random() * n) | 0; for (let i = 0; i < n && used.has(idx); i++) idx = (idx + 1) % n; opts.attachIdx = idx; }
    const p = new Plant(W, sp, x, z, opts);
    p.bornT = W.simT;
    scene.add(p.obj); W.plants.push(p); ctx.lightDirty = true;
    if (opts.light === undefined) p.light = light.transmission(p.x, p.y + 1, p.z, ctx.crowns, light.noonSun, p);
    return p;
  }
  function spawnAnimal(sp, pos, opts = {}) {
    if (!opts.restore && W.animals.length >= animalCap(sp)) return null;
    const a = new Animal(W, sp, pos, opts);
    scene.add(a.obj); W.animals.push(a);
    return a;
  }

  // validity check for placing species at (x,z) from the tray
  function checkPlace(sp, hit, { nursery = false, free = false } = {}) {
    if (!hit) return { ok: false, reason: `גררו ${zoneWord('to')}` };
    const { x, z } = hit;
    if (nursery) {   // a strong coral from the nursery: already paid for, it only needs a good spot (best: where the reef was hurt)
      const c = checkPlace(sp, hit, { free: true });
      if (!c.ok) return c;
      const scar = scarNear(x, z);
      return scar ? { ...c, scar, warn: false, text: 'כאן השונית נפגעה. מקום טוב לאלמוג חזק!' } : c;
    }
    if (!free) {
      if (!W.unlocked.has(sp.id)) return { ok: false, reason: 'עוד נעול' };
      if (W.points < sp.cost) return { ok: false, reason: 'אין מספיק נקודות חיים' };
    }
    if (W.countPlaced(sp.id) >= sp.maxCount) return { ok: false, reason: `הגעתם למספר המרבי של ${sp.name} (${sp.maxCount}). אפשר ללחוץ על אחד מהם ולעקור או להוציא אותו` };
    if (Math.hypot(x, z) > env.radius + 0.5) return { ok: false, reason: 'קרוב מדי לקצה' };
    if (sp.isPlant && !W.plantRoom(sp)) return { ok: false, reason: 'אין מקום לעוד צמחים. לחצו על צמח ועקרו אותו כדי לפנות מקום' };
    if (!sp.isPlant && W.animals.length >= animalCap(sp)) return { ok: false, reason: 'אין מקום לעוד בעלי חיים. לחצו על בעל חיים כדי להוציא אותו' };
    if (sp.isPlant) {
      if (sp.kind === 'water-plant') return env.isWater(x, z) ? { ok: true, text: 'צמח מים – על הנהר' } : { ok: false, reason: 'צריך מים – גררו אל הנהר' };
      if (sp.needs?.host) { const h = hostAt(x, z, sp); return h ? { ok: true, host: h, text: `על ${h.sp.name}` } : { ok: false, reason: sp.id === 'liana' ? 'גררו אל עץ גבוה ובוגר' : 'גררו אל ענפים של עץ בוגר' }; }
      if (!env.isPlaceable(x, z)) return { ok: false, reason: env.isWater(x, z) ? 'זה מים' : 'אי אפשר לשתול כאן' };
      if (W.onRoad(x, z, 0.8)) return { ok: false, reason: 'אי אפשר לשתול על הכביש' };
      if (sp.needs?.rocks && !W.nearRock(x, z, 3)) return { ok: false, reason: 'צריך סלעים – גררו ליד הסלעים' };
      if (sp.needs?.water && !W.nearWater(x, z, 6)) return { ok: false, reason: 'צריך מים קרובים' };
      if (!spacingOK(sp, x, z)) return { ok: false, reason: 'צפוף מדי. אפשר להעביר או לעקור צמח שעומד קרוב' };
      const lv = light.transmission(x, env.heightAt(x, z) + 1, z, ctx.crowns, light.noonSun);
      const need = sp.lightNeed ?? 0.5;
      if (need > 0.55 && lv < 0.35) return { ok: true, warn: true, text: `מוצל כאן (${Math.round(lv * 100)}% אור) – יגדל לאט` };
      if (need < 0.35 && lv > 0.85) return { ok: true, warn: true, text: `חשוף לשמש (${Math.round(lv * 100)}% אור)` };
      return { ok: true, text: `אור כאן: ${Math.round(lv * 100)}%` };
    }
    if (sp.needs?.water && !W.nearWater(x, z, 8)) return { ok: false, reason: 'צריך להיות ליד המים' };
    if (sp.needs?.rocks && !W.nearRock(x, z, 4)) return { ok: false, reason: 'צריך סלעים – גררו ליד הסלעים' };
    if ((sp.locomotion || 'ground') !== 'flying' && env.isWater(x, z) && !SWIMMERS.has(sp.id)) return { ok: false, reason: 'זה מים' };
    if (sp.locomotion === 'arboreal' && !W.plants.some(p => alive(p) && (p.isTree || p.sp.kind === 'shrub') && p.growth > 0.4 && p.vis.perchPoints().length)) return { ok: false, reason: 'צריך קודם עצים או שיחים גדולים' };
    if (sp.diet2.length && !sp.diet2.some(e => W.countAlive(e.to) > 0)) return { ok: true, warn: true, text: 'אין כאן עדיין אוכל ' + gw(sp.id, 'בשבילו', 'בשבילה', 'בשבילם', 'בשבילן') };
    return { ok: true, text: sp.active === 'night' ? activeNameFor(sp.id, 'night') : '' };
  }

  const scarNear = (x, z, r = 3.5) => W.scars.find(s => Math.hypot(s.x - x, s.z - z) < r) || null;
  // a strong young coral from the nursery goes onto the reef: bigger than one planted from the tray (it grew on the
  // nursery's branches) and it bleaches much less in a heat wave (src/world/plants.js)
  function transplant(sp, hit, chk) {
    if (!ctx.tools || !ctx.tools.takeFromNursery(sp.id)) return null;
    const p = spawnPlant(sp, hit.x, hit.z, { growth: 0.5 });
    if (!p) { ui.toast('לא נמצא מקום לשתול כאן', 'warn'); return null; }
    p.strong = true; W.nurseryNew = 0;
    W.everPlaced.add(sp.id); W.stats.transplants = (W.stats.transplants || 0) + 1;
    markers.burst(p.focusPoint(_v), '#ffb0c8', 22, { size: 0.45 });
    audio.play('place');
    const scar = chk.scar && W.scars.includes(chk.scar) ? chk.scar : null;
    if (scar) {
      W.scars.splice(W.scars.indexOf(scar), 1); W.stats.scarsHealed = (W.stats.scarsHealed || 0) + 1; W.points += 5;
      markers.locate(null);
      ui.toast(`${sp.name} חזק נשתל במקום שבו השונית נפגעה. השונית מתחילה להתאושש! (+5)`, 'good');
    } else ui.toast(`${sp.name} חזק נשתל בשונית. הוא כבר גדול, ובגל חום הוא מלבין פחות.`, 'good');
    refreshTray();
    return p;
  }
  function place(sp, hit, chk) {
    W.points -= sp.cost;
    const [g0, g1] = sp.groupSize; const n = Math.max(1, Math.min(g0 + Math.floor(Math.random() * (g1 - g0 + 1)), sp.maxCount - W.countPlaced(sp.id)));
    const placed = [];
    if (sp.isPlant) {
      for (let i = 0; i < n; i++) {
        let x = hit.x, z = hit.z;
        if (i > 0) { const s = findSpotNear(sp, hit.x, hit.z, 2.2); if (!s) break; x = s.x; z = s.z; }
        const p = spawnPlant(sp, x, z, { host: chk.host }); if (p) placed.push(p);
        if (chk.host) break;
      }
    } else {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = i ? 1 + Math.random() * 1.8 : 0;
        let x = hit.x + Math.cos(a) * r, z = hit.z + Math.sin(a) * r;
        if (!env.isPlaceable(x, z) && !(SWIMMERS.has(sp.id) && env.isWater(x, z)) && sp.locomotion !== 'flying') { x = hit.x; z = hit.z; }
        const e = spawnAnimal(sp, new THREE.Vector3(x, env.heightAt(x, z), z)); if (e) placed.push(e);
      }
    }
    if (!placed.length) { W.points += sp.cost; audio.play('invalid'); ui.toast(sp.isPlant ? 'לא נמצא מקום לשתול כאן – הנקודות חזרו אליכם' : 'לא נמצא מקום כאן – הנקודות חזרו אליכם', 'warn'); refreshTray(); return placed; }
    W.everPlaced.add(sp.id); W.seenNew.add(sp.id);
    audio.play('place');
    for (const e of placed) markers.burst(e.focusPoint(_v), sp.color || '#bfffa0', 16, { size: 0.42 });
    // auto-discover structural relations right away (epiphyte on host)
    if (chk.host && placed[0]) W.observe(placed[0], chk.host, 'climbs');
    refreshTray();
    if (placed[0] && !W.selected) { /* leave selection alone */ }
    return placed;
  }

  function randomPlaceSpot(sp, ignore) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (env.radius - 2);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (sp.kind === 'water-plant') { if (env.isWater(x, z)) return { x, z }; continue; }
      if (!env.isPlaceable(x, z) || !spacingOK(sp, x, z, ignore)) continue;
      if (W.onRoad && W.onRoad(x, z, 0.8)) continue;
      if (sp.needs?.rocks && !W.nearRock(x, z, 3)) continue;
      return { x, z };
    }
    return null;
  }

  // ─────────────────────────────────────────── crowns & light
  const FALLEN_FRUIT = { oak: 'acorns', carob: 'carob_pods', brazilnut: 'brazil_pod' };
  ctx.crowns = []; ctx.lightDirty = true; ctx.shafts = [];
  function updateLight(force) {
    ctx.crowns = [];
    for (const p of W.plants) { if (p.removed) continue; const c = p.crown(); if (c && c.top > 1.2) ctx.crowns.push(c); }
    // per-plant light at the top of the plant (noon sun)
    for (const p of W.plants) {
      if (!alive(p)) continue;
      const top = p.sp.kind === 'fungus' ? 0.3 : Math.max(0.3, (p.topY() - p.y) * 0.92);
      p.light = light.transmission(p.x, p.y + top, p.z, ctx.crowns, light.noonSun, p);
    }
    const sun = env.sun.direction;
    const useSun = sun.y > 0.1 ? sun : light.noonSun;
    // soft crown shadows on the ground: trees, palms and shrubs (also the smaller crowns the light system skips)
    const shCrowns = [];
    for (const p of W.plants) { if (p.removed || !(p.isTree || p.sp.kind === 'shrub')) continue; const c = p.crown(); if (c) shCrowns.push(c); }
    env.setTreeShadows(shCrowns, sun.y > 0.05 ? sun : light.noonSun);
    // fallen fruit on the ground under fruiting trees (acorns, carob pods, Brazil-nut capsules) – Blender props
    if (env.setFallenFruit) {
      const ff = [];
      for (const p of W.plants) {
        const kind = FALLEN_FRUIT[p.sp.id];
        if (!kind || p.removed || !p.alive || p.fruit < 0.15) continue;
        const c = p.crown(); if (c) ff.push({ x: p.x, z: p.z, radius: c.radius, kind, amount: p.fruit });
      }
      env.setFallenFruit(ff);
    }
    light.computeFloor(ctx.crowns, useSun);
    light.noonFloorScore(ctx.crowns);
    ctx.shafts = sun.y > 0.08 ? light.findShafts(ctx.crowns, sun) : [];
    for (const sh of ctx.shafts) sh.strength *= 0.6;
  }
  return { spacingOK, findSpotNear, spawnPlant, spawnAnimal, checkPlace, transplant, place, randomPlaceSpot,
    updateLight };
}
