// Selecting a plant or animal and its species card: the card's info (speciesInfo, the quiz with shuffled answers, the
// one clicked entity: take out / let go, uproot), the panel, the nearest entity of a species, the glowing links
// (selected, the whole web, the experiment's broken links, short-lived highlights), and picking with the pointer
// (pick, groundHit). Owns ctx.panelId and ctx.webMode.
// Gives ctx: hurtText, select, uproot, showPanel, refreshPanel, nearestOf, rebuildLinks, pick, groundHit.
// Takes from ctx: the names destructured at the top of createSelection;
// functions of later parts through late(): refreshTray.
// Shared state it reads or changes: ctx.tour, ctx.panelId, ctx.lightDirty, ctx.webMode.
import { TORAH, sourcesOn } from '../../core/edition.js';
import { SHIRA } from '../../data/torah.js';
import * as THREE from 'three';
import { CARD_ART } from '../../data/card-art.js';
import { RELATION_TYPES, gw, activeNameFor } from '../../data/common.js';
import { makeRng } from '../../core/util.js';
import { zoneWord } from '../../core/place.js';
import { _v, _w, _ray, _ndc, late } from './common.js';

export function createSelection(ctx) {
  const { W, markers, ui, audio, reg, alive, thumbs, biome, camera, tmpLinks, links, canvas, env } = ctx;
  const refreshTray = late(ctx, 'refreshTray');   // made by a later part

  // ─────────────────────────────────────────── selection, panel, hover
  // what happened to an injured animal and what to do (panel and hover label)
  function hurtText(a) {
    return `${a.injured.cause}. ` + (a.injured.saving ? 'רובוט הצלה בדרך' : `שלחו רובוט הצלה! גוררים אותו מלשונית טכנולוגיה ${gw(a.sp.id, 'לידו', 'לידה', 'לידם', 'לידן')}`);
  }
  function select(e) {
    W.selected = e || null;
    if (!e) { markers.select(null); W.selectedSpecies = null; ui.hideSpecies(); rebuildLinks(); return; }
    W.selectedSpecies = e.sp.id;
    showPanel(e.sp.id, true);
    audio.play('select');
    rebuildLinks();
  }
  // answer order is shuffled per species, so the right answer is not always the first one
  const quizCache = new Map();
  function shuffledQuestion(sp) {
    const q = sp.question; if (!q || !q.options) return null;
    if (quizCache.has(sp.id)) return quizCache.get(sp.id);
    const rng = makeRng([...sp.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) >>> 0);
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (order[0] === q.answer && order.length > 1 && rng() < 0.8) [order[0], order[1]] = [order[1], order[0]];
    const out = { q: q.q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
    quizCache.set(sp.id, out); return out;
  }
  function speciesInfo(id) {
    const sp = reg.byId.get(id);
    const ents = [...W.plants.filter(p => p.sp.id === id && alive(p)), ...W.animals.filter(a => a.sp.id === id && alive(a) && !a.leaving)];
    let status = '';
    let health = null;
    if (ents.length) {
      if (sp.isPlant) {
        health = ents.reduce((s, p) => s + p.health, 0) / ents.length;
        const lt = ents.reduce((s, p) => s + p.light, 0) / ents.length;
        const g = ents.reduce((s, p) => s + p.growth, 0) / ents.length;
        status = `אור: ${Math.round(lt * 100)}% · גדילה: ${Math.round(g * 100)}%`;
        if (lt < (sp.lightNeed ?? 0.5) * 0.6) status += ' · צריך יותר אור!';
        if (ents.some(p => p.bloom > 0.5)) status += ' · פורח';
        if (ents.some(p => p.fruit > 0.5)) status += ' · יש פירות';
      } else {
        const anims = ents.filter(a => a.type === 'animal');
        if (anims.length) { health = anims.reduce((s, a) => s + a.energy, 0) / anims.length; status = health < 0.3 ? 'רעב – מחפש אוכל' : health < 0.6 ? 'קצת רעב' : 'שבע ומרוצה'; }
        else { health = 1; status = 'פעילה'; }
        if (!ents.some(a => a.isActive?.())) status += sp.active === 'night' ? ' · ' + gw(sp.id, 'ישן – מתעורר', 'ישנה – מתעוררת', 'ישנים – מתעוררים', 'ישנות – מתעוררות') + ' בלילה' : ' · ' + gw(sp.id, 'נח', 'נחה', 'נחים', 'נחות') + ' עכשיו';
        // an injured one: say what happened and what to do, first (the "!" alone did not explain it)
        const hurt = anims.find(a => a.injured);
        if (hurt) status = `❗ ${hurtText(hurt)}`;
      }
    }
    const rels = reg.panelRelations(id).map(r => ({
      targetId: r.targetId, targetName: reg.byId.get(r.targetId)?.name || r.targetId, type: r.type, typeName: r.typeName,
      text: r.text, discovered: W.discovered.has(r.key), present: W.countAlive(r.targetId) > 0,
    }));
    return {
      id, name: sp.name, nameEn: sp.nameEn, color: sp.color, thumb: thumbs[id] || null, art: CARD_ART[id] || null, kindName: sp.kindName, layerName: sp.layerName, activeName: sp.isAnimal ? activeNameFor(sp.id, sp.active) : '',
      fact: sp.fact, more: sp.more, alive: ents.length > 0, count: ents.length, health, status: ents.length ? status : (W.unlocked.has(id) ? `עדיין לא ${zoneWord('in')} – גררו אותו מהמגש` : 'נעול – השלימו משימות כדי לפתוח'),
      relations: rels, canRemove: ents.length > 0, one: oneInfo(id), tour: ctx.tour ? ctx.tour.labelFor(id) : '', question: shuffledQuestion(sp), questionDone: W.quizDone.has(id),
      // חוויה: a short card (name, painting, one fact, who it lives with); the experiment button only when a mission asks for it
      xp: !!W.xp, hurt: (() => { const a = W.animals.find(x => x.sp.id === id && x.injured && alive(x)); return a ? hurtText(a) : ''; })(),
      expNeeded: W.missions?.current()?.goal?.type === 'experiment',
      shira: TORAH && sourcesOn() ? SHIRA[biome.id + ':' + id] || null : null,   // torah edition: its line in פרק שירה
    };
  }
  // the one plant or animal the player clicked: it can be taken out, moved (a plant on the ground) or let go (an animal)
  function oneInfo(id) {
    const e = W.selected;
    if (W.research || !e || e.sp.id !== id || !alive(e) || e.removed || W.experiment) return null;
    if (e.isPlant) return { kind: 'plant', canMove: !e.host && !e.falling && !e.fallen && e.sp.kind !== 'water-plant', refund: refundOf(e.sp), strong: !!e.strong };
    if (e.leaving || e.type !== 'animal') return null;
    return { kind: 'animal', refund: refundOf(e.sp) };
  }
  const refundOf = (sp) => Math.floor((sp.cost || 0) / 2);
  function uproot(e) {
    if (!e || !alive(e) || W.research) return;
    const sp = e.sp, back = refundOf(sp);
    if (e.isPlant) {
      for (const q of W.plants.slice()) if (q.host === e && alive(q)) { W.onPlantDied(q, 'uproot'); q.alive = false; W.removeEntity(q); }   // what grew on it comes out with it
      markers.burst(_v.set(e.x, e.y + 0.6, e.z), '#c8a878', 26, { size: 0.45, speed: 2.5 });
      W.onPlantDied(e, 'uproot'); e.alive = false; W.removeEntity(e); W.stats.uprooted = (W.stats.uprooted || 0) + 1;
      const still = /בעל חיים/.test(sp.kindName || '');   // a coral or a sponge is an animal that stays in place
      ui.toast(still ? `${sp.name} ${gw(sp.id, 'הוצא', 'הוצאה', 'הוצאו', 'הוצאו')} מ${zoneWord()}. יש עכשיו מקום פנוי.${back ? ` (+${back} נקודות)` : ''}`
        : `${sp.name} ${gw(sp.id, 'נעקר', 'נעקרה', 'נעקרו', 'נעקרו')} מ${zoneWord()}. יש עכשיו מקום לצמח אחר.${back ? ` (+${back} נקודות)` : ''}`, 'info');
    } else {
      e.leave(); W.stats.letGo = (W.stats.letGo || 0) + 1;
      ui.toast(`${sp.name} ${gw(sp.id, 'יצא', 'יצאה', 'יצאו', 'יצאו')} מ${zoneWord()} לחפש בית אחר.${back ? ` (+${back} נקודות)` : ''}`, 'info');
    }
    W.points += back; audio.play('remove'); select(null); ui.hideSpecies(); ctx.panelId = null; refreshTray(); ctx.lightDirty = true;
  }

  ctx.panelId = null;
  function showPanel(id, fresh) { ctx.panelId = id; const info = speciesInfo(id); if (fresh) ui.showSpecies(info); else ui.updateSpecies(info); }
  function refreshPanel() { if (ctx.panelId) showPanel(ctx.panelId, false); }

  function nearestOf(id, pos) {
    let best = null, bd = Infinity;
    for (const e of [...W.plants, ...W.animals]) { if (e.sp.id !== id || !alive(e)) continue; const p = e.isPlant ? _w.set(e.x, e.y, e.z) : e.pos; const d = p.distanceTo(pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  // links for the selected species, or the whole web
  ctx.webMode = false;
  function rebuildLinks() {
    const list = [];
    const addLink = (A, B, type, broken = false, strength = 1) => {
      const a = A.focusPoint(new THREE.Vector3()), b = B.focusPoint(new THREE.Vector3());
      if (a.distanceTo(b) < 0.3) return;
      const cd = camera.position.distanceTo(a.clone().lerp(b, 0.5));
      list.push({ a, b, color: new THREE.Color(RELATION_TYPES[type]?.color || '#fff'), broken, strength, width: Math.max(0.07, cd * 0.0042) });
    };
    const sel = W.selected;
    if (sel && alive(sel)) {
      const ents = [sel];
      for (const r of reg.panelRelations(sel.sp.id)) {
        const other = nearestOf(r.targetId, sel.isPlant ? _w.set(sel.x, sel.y, sel.z).clone() : sel.pos);
        if (!other) continue;
        const known = W.discovered.has(r.key);
        // energy flows from food to eater; pollinator → flower etc.
        if (r.dir === 'out') { if (r.type === 'eats') addLink(other, sel, r.type, false, known ? 1 : 0.45); else addLink(sel, other, r.type, false, known ? 1 : 0.45); }
        else { if (r.type === 'eats') addLink(sel, other, r.type, false, known ? 1 : 0.45); else addLink(other, sel, r.type, false, known ? 1 : 0.45); }
      }
    }
    if (ctx.webMode) {
      const present = new Set(W.aliveSpecies());
      for (const e of reg.edges) {
        if (!present.has(e.from) || !present.has(e.to)) continue;
        const A = W.animals.find(a => a.sp.id === e.from && alive(a)) || W.plants.find(p => p.sp.id === e.from && alive(p));
        const B = W.animals.find(a => a.sp.id === e.to && alive(a)) || W.plants.find(p => p.sp.id === e.to && alive(p));
        if (!A || !B) continue;
        if (sel && (A.sp.id === sel.sp.id || B.sp.id === sel.sp.id)) continue;
        if (e.type === 'eats') addLink(B, A, e.type, false, W.discovered.has(e.key) ? 0.8 : 0.35); else addLink(A, B, e.type, false, W.discovered.has(e.key) ? 0.8 : 0.35);
      }
    }
    // experiment: broken links from the missing species' last positions
    if (W.experiment) {
      for (const d of W.experiment.ghosts) list.push(d);
    }
    for (const L of tmpLinks) if (W.simT < L.until && alive(L.from) && alive(L.to)) { if (L.type === 'eats') addLink(L.to, L.from, L.type, false, 1.2); else addLink(L.from, L.to, L.type, false, 1.2); }
    links.set(list);
  }

  // pointer → world
  function pick(clientX, clientY, { plants = true, animals = true } = {}) {
    const rect = canvas.getBoundingClientRect();
    _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    let best = null, bestT = Infinity;
    if (animals) {
      for (const a of W.animals) {
        if (!alive(a) || a.leaving) continue;
        a.focusPoint(_v); const p = _v.clone().project(camera);
        if (p.z > 1) continue;
        const sx = (p.x + 1) / 2 * rect.width, sy = (1 - p.y) / 2 * rect.height;
        const d = Math.hypot(sx - (clientX - rect.left), sy - (clientY - rect.top));
        const rad = 26 + Math.min(40, (a.vis.length || 1) * a.obj.scale.x * 300 / Math.max(5, camera.position.distanceTo(_v)));
        if (d < rad) { const t = camera.position.distanceTo(_v) + d * 0.05; if (t < bestT) { bestT = t; best = a; } }
      }
      if (best) return best;
    }
    if (plants) {
      const ro = _ray.ray.origin, rd = _ray.ray.direction;
      for (const p of W.plants) {
        if (!alive(p)) continue;
        const c = p.vis.crown(); const s = p.obj.scale.x;
        const cy = p.y + (c.top + c.bottom) / 2 * s; const cr = Math.max(0.5, c.radius * s * 0.8, (c.top - c.bottom) * s * 0.45);
        // ray-sphere
        _v.set(p.x - ro.x, cy - ro.y, p.z - ro.z); const tca = _v.dot(rd); if (tca < 0) continue;
        const d2 = _v.lengthSq() - tca * tca;
        if (d2 < cr * cr) { const t = tca - Math.sqrt(cr * cr - d2); if (t < bestT) { bestT = t; best = p; } }
        // trunk
        if (p.isTree) {
          const ty = p.y + c.bottom * s * 0.5; _v.set(p.x - ro.x, ty - ro.y, p.z - ro.z); const tc = _v.dot(rd); const dd = _v.lengthSq() - tc * tc;
          const tr = Math.max(0.7, (p.vis.trunkRadius || 0.3) * 2.2); if (tc > 0 && dd < tr * tr && tc < bestT) { bestT = tc; best = p; }
        }
      }
    }
    return best;
  }
  function groundHit(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    const hits = _ray.intersectObjects([...env.groundMeshes, ...env.waterMeshes], false);
    if (!hits.length) return null;
    const h = hits[0].point; return { x: h.x, z: h.z, y: h.y, water: env.waterMeshes.includes(hits[0].object) };
  }
  return { hurtText, select, uproot, showPanel, refreshPanel, nearestOf, rebuildLinks, pick, groundHit };
}
