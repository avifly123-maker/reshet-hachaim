// Missions (goals + rewards) and events (decisions with ecological consequences).
import { zoneWord } from '../core/place.js';
import { TORAH, sourcesOn } from '../core/edition.js';
import { TORAH_MISSIONS } from '../data/torah.js';

// torah edition (sources on, not in the beginners' mode): missions from the sources join the chain, each one right
// after the mission it names (the mission that used to follow comes after it)
function withTorahMissions(list, extra) {
  const out = list.map(m => ({ ...m }));
  for (const t of extra || []) {
    const i = out.findIndex(m => m.id === t.insertAfter); if (i < 0) continue;
    for (const m of out) if (m.after === t.insertAfter) m.after = t.id;
    const { insertAfter, ...rest } = t;
    out.splice(i + 1, 0, { ...rest, after: insertAfter });
  }
  return out;
}

export function createMissions(W) {
  const B = W.biome;
  const base = TORAH && sourcesOn() && !W.kids ? withTorahMissions(B.missions, TORAH_MISSIONS[W.biomeId]) : B.missions;
  const missions = base.map(m => ({ ...m, done: false, progress: 0, started: false, t0: 0, healthT: 0, seasonsN: 0, lastSeason: null }));
  const events = B.events.map(e => ({ ...e, fired: false, resolved: false, resolvedAt: -1 }));
  const queue = [];
  let lastDay = 0;

  // expert missions (משימות מומחים) open only when every regular mission of the zone is done
  const regularDone = () => missions.every(m => m.expert || m.done);
  function current() { return missions.find(m => !m.done && (!m.expert || regularDone()) && (!m.after || missions.find(x => x.id === m.after)?.done)); }

  function start(m) {
    if (m.started) return;
    m.started = true; m.t0 = W.simT;
    // a mission that was running before the game was saved keeps its starting point (restored from the save)
    if (!W.stats.missionStart[m.id]) W.stats.missionStart[m.id] = { pollinations: { ...W.stats.pollinations }, dispersals: W.stats.dispersals, experiments: W.stats.experiments, rescues: W.stats.rescues || 0, seeded: W.stats.seeded || 0,
      toolUse: { ...(W.stats.toolUse || {}) }, uprooted: W.stats.uprooted || 0, moved: W.stats.moved || 0, letGo: W.stats.letGo || 0, t: W.simT };
    for (const e of events) if (!e.fired && e.trigger.type === 'mission' && e.trigger.id === m.id) fire(e, e.trigger.delay ?? 6);
  }

  function fire(e, delay = 0) {
    if (e.fired) return; e.fired = true;
    const item = { e, at: W.simT + delay };
    const i = queue.findIndex(q => q.at > item.at);   // keep the queue in time order
    if (i < 0) queue.push(item); else queue.splice(i, 0, item);
  }

  function aliveCount(id) { return W.countAlive(id); }

  function evalGoal(m) {
    const g = m.goal; const S = W.stats; const base = S.missionStart[m.id] || { pollinations: {}, dispersals: 0, experiments: 0 };
    switch (g.type) {
      case 'place': return Math.min(1, W.countPlaced(g.species) / g.count);   // only what the player placed, not the wild forest
      case 'speciesAlive': return Math.min(1, W.aliveSpecies().length / g.count);
      case 'link': return W.linkDiscovered(g.from, g.to) ? 1 : (aliveCount(g.from) > 0) * 0.4 + (aliveCount(g.to) > 0) * 0.4;
      case 'chain': return Math.min(1, W.longestChain() / g.length);
      case 'health': {
        if (W.vitality >= g.min) m.healthT += W.lastTickDt; else m.healthT = Math.max(0, m.healthT - W.lastTickDt * 2);
        return Math.min(1, m.healthT / g.seconds);
      }
      case 'growTo': return Math.min(1, W.plants.filter(p => p.sp.id === g.species && p.alive && !p.removed && !p.wild && p.growth >= g.min).length / (g.count || 1));
      case 'grow': return Math.min(1, W.plants.filter(p => p.sp.id === g.species && p.alive && !p.removed && !p.wild && p.growth >= 0.95).length / g.count);
      case 'floorLight': { if (!W.treeFallen || !W.gapPos) return 0; const v = W.light.floorAt(W.gapPos.x, W.gapPos.z); return Math.min(1, v / Math.max(0.05, g.min)); }
      case 'pollinate': return Math.min(1, ((S.pollinations[g.species] || 0) - (base.pollinations[g.species] || 0)) / g.count);
      case 'disperse': return Math.min(1, (S.dispersals - base.dispersals) / g.count);
      case 'discover': return Math.min(1, W.discovered.size / g.count);
      case 'observeNight': return W.nightGlow > 0.6 && W.animals.some(a => a.visible && a.isActive() && (a.sp.active === 'night')) || (W.nightGlow > 0.6 && W.plants.some(p => p.alive && (p.sp.id === 'glowfungus' || p.sp.id === 'mushroom'))) ? 1 : W.nightGlow * 0.5;
      case 'survive': {
        const e = events.find(x => x.id === g.event);
        if (!e || !e.resolved) return 0;
        if (W.vitality >= 0.45) m.healthT += W.lastTickDt; else m.healthT = Math.max(0, m.healthT - W.lastTickDt);
        return Math.min(1, 0.3 + 0.7 * m.healthT / 60);
      }
      case 'bloom': return W.plants.some(p => p.sp.id === g.species && p.alive && !p.wild && p.bloom > 0.5) ? 1 : W.countPlaced(g.species) > 0 ? 0.4 : 0;   // blooming in its own season (winter–spring)
      case 'experiment': return S.experiments - base.experiments > 0 ? 1 : 0;
      case 'tool': return Math.min(1, ((S.toolUse || {})[g.tool] || 0) / g.count);
      case 'photos': return Math.min(1, new Set([...(W.photos || [])].map(k => k.split(':')[0])).size / g.count);
      case 'rescue': return Math.min(1, ((S.rescues || 0) - (base.rescues || 0)) / g.count);
      case 'seeded': return Math.min(1, ((S.seeded || 0) - (base.seeded || 0)) / g.count);
      case 'all': {   // expert missions: every part at once, then (optionally) kept for `hold` seconds
        const p = Math.min(...g.parts.map(q => evalPart(q, m)));
        if (!g.hold) return p;
        if (p >= 0.999) m.healthT += W.lastTickDt; else m.healthT = Math.max(0, m.healthT - W.lastTickDt * 2);
        return p < 0.999 ? p * 0.8 : 0.8 + 0.2 * Math.min(1, m.healthT / g.hold);
      }
      default: return 0;
    }
  }

  // one part of an expert mission (0..1). "since the mission began" counts use the snapshot taken in start().
  function evalPart(q, m) {
    const S = W.stats, base = S.missionStart[m.id] || {}, since = base.t ?? m.t0;
    const live = (id) => W.animals.filter(a => a.sp.id === id && a.alive && !a.leaving && !a.removed);
    switch (q.type) {
      case 'alive': return Math.min(1, W.countAlive(q.species) / q.count);
      case 'atMost': { const n = W.countAlive(q.species); return n <= q.max ? 1 : Math.max(0, 1 - (n - q.max) / Math.max(1, q.max)); }
      case 'fed': { const as = live(q.species); if (!as.length) return 0; const e = as.reduce((t, a) => t + a.energy, 0) / as.length; return Math.min(1, e / q.min); }
      case 'did': { const k = q.stat === 'reshaped' ? ['uprooted', 'moved'] : [q.stat]; const n = k.reduce((t, x) => t + (S[x] || 0) - (base[x] || 0), 0); return Math.min(1, n / q.count); }
      case 'toolSince': return Math.min(1, (((S.toolUse || {})[q.tool] || 0) - ((base.toolUse || {})[q.tool] || 0)) / q.count);
      case 'tool': return Math.min(1, ((S.toolUse || {})[q.tool] || 0) / q.count);
      case 'young': return Math.min(1, W.plants.filter(p => p.sp.id === q.species && p.alive && !p.removed && (p.bornT ?? -1) >= since && p.growth >= q.min).length / q.count);
      case 'sownBy': return Math.min(1, W.plants.filter(p => p.sp.id === q.species && p.alive && !p.removed && p.sownBy === q.by && (p.bornT ?? -1) >= since).length / q.count);
      case 'plantLight': return Math.min(1, W.plants.filter(p => p.sp.id === q.species && p.alive && !p.removed && p.growth > 0.15 && p.light >= q.min).length / q.count);
      case 'growTo': return Math.min(1, W.plants.filter(p => p.sp.id === q.species && p.alive && !p.removed && !p.wild && p.growth >= q.min).length / (q.count || 1));
      case 'pollinate': return Math.min(1, ((S.pollinations[q.species] || 0) - ((base.pollinations || {})[q.species] || 0)) / q.count);
      case 'swimKinds': return Math.min(1, new Set(W.animals.filter(a => a.alive && !a.leaving && a.sp.swims).map(a => a.sp.id)).size / q.count);
      case 'kinds': return Math.min(1, W.aliveSpecies().length / q.count);
      case 'link': return W.linkDiscovered(q.from, q.to) ? 1 : 0;
      case 'calm': return Math.min(1, (W.simT - Math.max(S.lossT ?? -1e9, since)) / q.seconds);   // nobody withered or left hungry
      case 'eventDone': { const e = events.find(x => x.id === q.event); if (!e || !e.resolved) return 0; return q.after ? Math.min(1, (W.simT - e.resolvedAt) / q.after) : 1; }   // after: and that long since
      case 'seasons': {   // whole seasons with at least `kinds` species alive all the time (falling below starts the count again)
        if (W.aliveSpecies().length < (q.kinds || 0)) { m.seasonsN = 0; m.lastSeason = W.season; return 0; }
        if (m.lastSeason == null) m.lastSeason = W.season;
        if (W.season !== m.lastSeason) { m.lastSeason = W.season; m.seasonsN++; }
        return Math.min(1, m.seasonsN / q.count);
      }
      default: return 0;
    }
  }
  // the parts of the running expert mission as a checklist for the missions panel
  function checks(m) {
    const g = m.goal || {};
    if (g.type !== 'all') return null;
    const out = g.parts.map(q => ({ label: q.label, ok: evalPart(q, m) >= 0.999 }));
    if (g.hold) out.push({ label: g.holdLabel || `להחזיק הכול ${g.hold} שניות`, ok: m.progress >= 0.999, hold: Math.round(Math.min(1, m.healthT / g.hold) * 100) });
    return out;
  }

  // "how do I do it?" – one plain line per kind of goal, shown under the mission's own hint
  const nm = (id) => (W.reg && W.reg.byId.get(id)?.name) || '';
  function howTo(m) {
    const g = m.goal || {};
    const find = (id) => id ? ` כדי לראות איפה ${nm(id)} ${zoneWord('in')}, פתחו את הקלף שלו במגש ולחצו "איפה?".` : '';
    switch (g.type) {
      case 'link': return `איך עושים: לחצו על ${nm(g.from)} ${zoneWord('in')} או על הקלף שלו במגש. בכרטיס שנפתח, ברשימה "קשרים ברשת", מצאו את ${nm(g.to)} ולחצו "גלה את הקשר". שניהם צריכים להיות ${zoneWord('in')}.`;
      case 'chain': return `איך עושים: הביאו ${zoneWord('to')} צמח, בעל חיים שאוכל אותו, ובעל חיים שאוכל את בעל החיים הזה. בכרטיס של כל אחד, ב"קשרים ברשת", רואים מי אוכל את מי.`;
      case 'discover': return 'איך עושים: לחצו על צמח או על בעל חיים, ובכרטיס שלו לחצו "גלה את הקשר" ליד קשר שעוד לא גיליתם.';
      case 'place': case 'grow': case 'growTo': case 'bloom': return `איך עושים: גררו ${nm(g.species)} מהמגש אל היער.` + find(g.species);
      case 'pollinate': return 'איך עושים: מאביקים צריכים להיות קרובים לפרחים.' + find(g.species);
      case 'experiment': return 'איך עושים: לחצו על צמח או על בעל חיים, ובכרטיס שלו לחצו "מה יקרה אם ייעלם?".';
      case 'tool': case 'photos': case 'rescue': case 'seeded': return 'איך עושים: הכלים נמצאים בלשונית "טכנולוגיה" במגש. גוררים אותם אל היער כמו צמח.';
      default: return '';
    }
  }
  // a mission that is already true the moment it starts (the link was found before, the chain already lives in the
  // forest) – say so plainly instead of a silent tick
  function autoReason(m) {
    const g = m.goal || {};
    switch (g.type) {
      case 'link': return `הקשר בין ${nm(g.from)} ל${nm(g.to)} כבר התגלה קודם.`;
      case 'chain': return `כבר יש ${zoneWord('in')} שרשרת מזון של ${g.length} חוליות לפחות.`;
      case 'discover': return 'כבר גיליתם מספיק קשרים.';
      case 'place': case 'grow': return `כבר היו ${zoneWord('in')} מספיק פרטים של ${nm(g.species)}.`;
      case 'speciesAlive': return `כבר חיים ${zoneWord('in')} ${g.count} מינים לפחות.`;
      default: return `מה שהמשימה ביקשה כבר קיים ${zoneWord('in')}.`;
    }
  }

  let nextAt = 0;
  function tick() {
    const m = W.simT >= nextAt ? current() : null;
    if (m) {
      start(m);
      m.progress = evalGoal(m);
      if (m.progress >= 0.999) {
        m.done = true;
        if (W.simT - m.t0 < 3) m.autoNote = autoReason(m);
        W.missionCompleted(m);
        nextAt = W.simT + 10;
      }
    }
    // day & random triggers
    if (W.day !== lastDay) {
      lastDay = W.day;
      for (const e of events) {
        if (e.fired) continue;
        if (e.trigger.type === 'day' && W.day >= e.trigger.day) fire(e, 20);
        else if (e.trigger.type === 'random' && (!e.trigger.season || e.trigger.season === W.season) && W.day >= 3 && Math.random() < e.trigger.chancePerDay * 1.6) fire(e, 30 + Math.random() * 60);
      }
    }
    // dispatch queued events (one at a time, never during a modal/drag)
    if (queue.length && !W.isBusy() && W.simT >= queue[0].at) {
      const { e } = queue.shift();
      if (eventApplicable(e)) W.runEvent(e);
      else {
        e.fired = false;
        // a mission waits for its own event – try again a bit later instead of getting stuck
        const m = e.trigger.type === 'mission' && missions.find(x => x.id === e.trigger.id);
        if (m && m.started && !m.done) fire(e, 30);
      }
    }
  }

  function eventApplicable(e) {
    // skip events that would act on species not present (e.g. a disease of a tree that isn't planted)
    for (const fx of e.start || []) {
      if ((fx.type === 'remove' || fx.type === 'boost') && fx.species && W.countAlive(fx.species) === 0) return false;
      if (fx.type === 'logging' && W.protected) return false;
      if (fx.type === 'road' && W.road) return false;
      if (fx.type === 'treeFall' && !W.plants.some(p => p.isTree && p.alive && p.growth > 0.5 && (fx.target === 'tallest' || p.sp.id === fx.target))) return false;
    }
    return true;
  }

  function list() {
    const out = [];
    const doneList = missions.filter(m => m.done);
    const last = doneList[doneList.length - 1];
    if (last) out.push({ id: last.id, title: last.title, text: last.text, hint: last.hint, progress: 1, done: true, note: last.autoNote || '', expert: !!last.expert });
    const c = current();
    if (c) out.push({ id: c.id, title: c.title, text: c.text, hint: c.hint, how: c.how || howTo(c), progress: c.progress, done: false, expert: !!c.expert, checks: checks(c) });
    const next = c && missions.find(m => m.after === c.id);
    if (next) out.push({ id: next.id, title: next.title, text: 'המשימה הבאה תיפתח אחרי שתסיימו את הנוכחית.', hint: '', progress: 0, done: false, locked: true, expert: !!next.expert });
    return out;
  }

  // progress of missions that are running but not done yet (the starting counters and the health/survive timers)
  function serializeProgress() {
    const out = {};
    for (const m of missions) {
      if (m.done || !m.started) continue;
      const base = W.stats.missionStart[m.id];
      out[m.id] = { h: +(m.healthT || 0).toFixed(1), base: base || null, ...(m.seasonsN ? { s: m.seasonsN, ls: m.lastSeason } : {}) };
    }
    return out;
  }
  function restoreProgress(P) {
    if (!P) return;
    for (const m of missions) {
      const r = P[m.id]; if (!r || m.done) continue;
      m.healthT = isFinite(r.h) ? r.h : 0;
      if (r.s) { m.seasonsN = r.s; m.lastSeason = r.ls ?? null; }
      if (r.base) W.stats.missionStart[m.id] = r.base;
    }
  }

  function doneList() { return missions.filter(m => m.done).map(m => ({ id: m.id, title: m.title, text: m.text, note: m.autoNote || '', expert: !!m.expert })); }

  return { missions, events, tick, list, doneList, current, fire, serializeProgress, restoreProgress, resolve(e) { e.resolved = true; e.resolvedAt = W.simT; }, get doneCount() { return missions.filter(m => m.done).length; } };
}
