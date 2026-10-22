// חוטים (1.3.2): the parts of the game feed each other. A thread opens when the child has done something in one
// part (an invention, a solved mystery, a photo, an event lived on the island…) and changes something in another part
// (a tool upgrade, a new event choice, a marked microscope sample, a recommended mystery…). Like core/journey.js,
// what the child did is read from the saves the game already keeps; this store only remembers what was announced.
// The threads themselves are data: src/data/threads.js. רובו־דע's words: src/data/guide/threads.js.
//
// Storage (per player, core/profiles.js): 'web-of-life-threads' = { v: 1,
//   shown: { <threadId>: time }   (רובו־דע announced it),   open: { <threadId>: time }   (it was open once: it stays open,
//   even if a forest is started anew or an old photo drops out),   used: { quadrat: time }   (a research tool used in a
//   mystery: the research session fires wol-progress { kind: 'tool', id }),   ph: { <speciesId>: 1 }   (photographed) }
//   init: time (the first announcement round of this player)
// Read (never written): web-of-life-lab, web-of-life-research, web-of-life-<zone> ({ done, discovered, placed }),
//   web-of-life-save-<zone>[-kids] (events lived: save.events, save.report days ev), web-of-life-photos ([{ sp, zone }]),
//   web-of-life-cards (the hub: games.inventors.solved / robots).
//
// API (also window.__threads)
//   active() → [thread]               the open threads for this player and play mode ('experience' and beginners: the six
//                                     'exp' threads only; 'full': all)
//   all() → [{ t, open }]             every thread of this play mode, open or not (the journey map)
//   has(id) → bool
//   toolBoost(tool, zone) → {}        merged upgrades of an island tool, e.g. toolBoost('drone', 'reef') → { speed: 1.25,
//                                     hover: true }; numbers of the same key multiply. Keys: drone speed/hover/share,
//                                     camera night/shy, rescue speed/heal, watergen output, nestbox storm, buoy range,
//                                     weather (reef sensor buoy) murky. {} = no boost.
//   eventBoost(eventId) → {}          e.g. eventBoost('r_flood') → { shorter: 0.6 } (murky water ends sooner)
//   choicesFor(eventId) → [choice]    new choices for an island event: { id, label, outcome, effects, thread } in the
//                                     player's words (beginners: with nikud); add them to the event's own choices
//   reveals(zone) → { links: [relation keys], marks: [{ tool, species }] }   links to show as discovered on the island
//   measures() → Set('notebook'|'quadrat'|'experiment')                      research tools the island now has
//   robotsOut() → [{ name, mission, wins, of, at }]                          the child's robots that work on the island
//   sampleMarked(sampleId), markedSamples()     microscope samples "מהאי שלכם" (photographed on the island)
//   questionMarked(speciesId)                   an atlas question about a creature whose relation was found on the island
//   problemWaiting(problemId), problemsWaiting()  inventors problems "מחכות לכם" (all missions of their zone done)
//   recommended() → [{ caseId, thread }]        mysteries רובו־דע recommends (an event lived), not solved yet
//   stamps(speciesId, zone) → ['seen','photo','scope','invent','case','source']   the card's stamps (a subset, in order)
//   setSourceCheck(fn)                         the hub registers (spId, zone) → bool for the 'source' stamp (torah edition)
//   fresh() → [thread]   opened since last shown;   markShown(ids?);   announce({ modal }) → id | null (one thread)
// Events listened to: 'wol-progress', 'wol-badge' (announce a little later), 'wol-journey' (a player switch: re-read).
import { key as profileKey } from './profiles.js';
import { playMode, readJSON, writeJSON, ZONES } from './journey.js';
import { THREADS, SAMPLE_OF, PHOTO_SAMPLE, QUESTION_SPECIES, CASE_SPECIES, REGULAR, STAMPS } from '../data/threads.js';
import { GUIDE } from '../data/guide-lines.js';

const K = 'web-of-life-threads';
const pk = (b) => profileKey(b);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// ─────────────────────────────── the store (in memory too: threads work when storage is blocked)
let mem = null;
function store() {
  if (mem && mem._key === pk(K)) return mem;
  const s = readJSON(pk(K), null);
  const o = s && typeof s === 'object' && s.v === 1 ? s : { v: 1 };
  mem = { v: 1, shown: obj(o.shown), open: obj(o.open), used: obj(o.used), ph: obj(o.ph), init: o.init || 0, _key: pk(K) };
  return mem;
}
function save() { const o = { ...store() }; delete o._key; writeJSON(pk(K), o); }

// ─────────────────────────────── what the child has done (a snapshot, kept for a moment: lists ask many times)
let snapT = 0, snapK = '', snapV = null;
function snap() {
  const now = Date.now();
  if (snapV && snapK === pk(K) && now - snapT < 400) return snapV;
  const L = readJSON(pk('web-of-life-lab'), {}) || {};
  const lab = { inventions: obj(L.inventions), solved: obj(L.solved), seen: obj(L.seen), think: obj(L.think) };
  const cases = obj((readJSON(pk('web-of-life-research'), {}) || {}).cases);
  const hub = obj((readJSON(pk('web-of-life-cards'), {}) || {}).games);
  const inv = obj(hub.inventors);
  const hubSolved = obj(inv.solved);
  const robots = (Array.isArray(inv.robots) ? inv.robots : []).filter((r) => r && r.name);
  const zones = {}, events = new Set();
  for (const z of ZONES) {
    const o = readJSON(pk('web-of-life-' + z), null) || {};
    zones[z] = { done: new Set(Array.isArray(o.done) ? o.done : []), discovered: Array.isArray(o.discovered) ? o.discovered : [], placed: new Set(Array.isArray(o.placed) ? o.placed : []) };
    for (const sk of ['web-of-life-save-' + z, 'web-of-life-save-' + z + '-kids']) {
      const sv = readJSON(pk(sk), null); if (!sv || typeof sv !== 'object') continue;
      for (const e of Array.isArray(sv.events) ? sv.events : []) if (e && e.id) events.add(e.id);
      const rep = obj(sv.report); for (const d of [...(Array.isArray(rep.days) ? rep.days : []), rep.cur]) for (const p of (d && Array.isArray(d.ev) ? d.ev : [])) if (Array.isArray(p) && p[0]) events.add(p[0]);
    }
  }
  const S0 = store(); let phChanged = false;
  const photos = readJSON(pk('web-of-life-photos'), null);
  for (const p of Array.isArray(photos) ? photos : []) { const sp = p && (p.sp || p.species); if (sp && !S0.ph[sp]) { S0.ph[sp] = 1; phChanged = true; } }
  if (phChanged) save();
  snapV = { lab, cases, hubSolved, robots, zones, events, ph: S0.ph, used: S0.used };
  snapT = now; snapK = pk(K);
  return snapV;
}
const solvedProblem = (s, id) => !!(s.lab.solved[id] || s.hubSolved[id]);
const anyCase = (s) => Object.keys(s.cases).length > 0;
function zoneDone(s, z) {
  const R = REGULAR[z]; if (!R) return false; const d = s.zones[z].done;
  const full = [...Array(R[1])].every((_, i) => d.has(R[0] + (i + 1)));
  const kids = [...Array(R[2])].every((_, i) => d.has('k' + (i + 1)));
  return full || kids;
}
// species whose relation was found on the island (any zone)
function islandLinkSpecies(s) {
  const out = new Set();
  for (const z of ZONES) for (const k of s.zones[z].discovered) { const p = String(k).split('>'); if (p[0]) out.add(p[0]); if (p[1]) out.add(p[1]); }
  return out;
}
const photoSamples = (s) => new Set(Object.keys(s.ph).map((sp) => SAMPLE_OF[sp] || PHOTO_SAMPLE[sp]).filter(Boolean));

// is the thread's "from" done?
function isMet(t, s) {
  const f = t.from;
  switch (f.kind) {
    case 'invention': return !!(s.lab.inventions[f.id] || solvedProblem(s, f.id));
    case 'case': if (f.tool) return !!s.used[f.tool]; return f.id === '*' ? anyCase(s) : !!s.cases[f.id];
    case 'photo': return photoSamples(s).size > 0;
    case 'link': { const sp = islandLinkSpecies(s); return QUESTION_SPECIES.some((x) => sp.has(x)); }
    case 'event': return (f.ids || [f.id]).some((id) => s.events.has(id));
    case 'zone': return zoneDone(s, f.id);
    case 'robot': return s.robots.length > 0;
    case 'think': return !!(s.lab.think[f.id] && s.lab.think[f.id].done);
    default: return false;
  }
}
const modeOk = (t) => playMode() === 'full' || t.mode === 'exp';
// open = met now, or met once before (kept in the store)
function openSet() {
  const s = snap(), S0 = store(); let changed = false; const out = new Set();
  for (const t of THREADS) {
    if (S0.open[t.id]) { out.add(t.id); continue; }
    if (isMet(t, s)) { S0.open[t.id] = Date.now(); changed = true; out.add(t.id); }
  }
  if (changed) save();
  return out;
}

export function all() { const o = openSet(); return THREADS.filter(modeOk).map((t) => ({ t, open: o.has(t.id) })); }
export function active() { const o = openSet(); return THREADS.filter((t) => modeOk(t) && o.has(t.id)); }
export const has = (id) => active().some((t) => t.id === id);

export function toolBoost(tool, zone) {
  const out = {};
  for (const t of active()) {
    const e = t.to.kind === 'tool' && t.effect; if (!e || e.tool !== tool || (e.zone && zone && e.zone !== zone)) continue;
    if (typeof e.value === 'number' && typeof out[e.key] === 'number') out[e.key] *= e.value; else out[e.key] = e.value;
  }
  return out;
}
export function eventBoost(eventId) {
  const out = {};
  for (const t of active()) { const e = t.effect; if (e && e.event === eventId && typeof e.value === 'number' && t.to.kind === 'tool') out.shorter = (out.shorter || 1) * e.value; }
  return out;
}
const words = (v) => (v && typeof v === 'object' && 'f' in v ? (playMode() === 'kids' ? v.k || v.f : v.f) : v);
export function choicesFor(eventId) {
  return active().filter((t) => t.to.kind === 'choice' && t.effect && t.effect.event === eventId)
    .map((t) => { const c = t.effect.choice; return { id: c.id, label: words(c.label), outcome: words(c.outcome), effects: c.effects.map((x) => ({ ...x })), thread: t.id }; });
}
export function reveals(zone) {
  const links = [], marks = [];
  for (const t of active()) if (t.to.kind === 'reveal' && t.effect && t.effect.zone === zone) { links.push(...t.effect.links); if (t.effect.mark) marks.push({ ...t.effect.mark }); }
  return { links, marks };
}
export function measures() { return new Set(active().filter((t) => t.to.kind === 'measure').map((t) => t.effect.what)); }
export function robotsOut() { return has('robot-out') ? snap().robots.slice() : []; }

export function markedSamples() { return has('photo-scope') ? photoSamples(snap()) : new Set(); }
export const sampleMarked = (id) => markedSamples().has(id);
export function questionMarked(spId) { return has('link-atlas') && islandLinkSpecies(snap()).has(spId); }
export function problemsWaiting() {
  const s = snap(), out = new Set();
  for (const t of active()) if (t.to.kind === 'problem') for (const id of t.to.ids || []) if (!solvedProblem(s, id)) out.add(id);
  return out;
}
export const problemWaiting = (id) => problemsWaiting().has(id);
export function recommended() {
  const s = snap();
  return active().filter((t) => t.to.kind === 'case' && !s.cases[t.to.id]).map((t) => ({ caseId: t.to.id, thread: t }));
}

// ─────────────────────────────── card stamps
let sourceCheck = null;
export function setSourceCheck(fn) { sourceCheck = typeof fn === 'function' ? fn : null; }
export function stamps(spId, zone) {
  const s = snap(), out = [];
  const zs = zone ? [zone] : ZONES;
  const seen = zs.some((z) => s.zones[z] && (s.zones[z].placed.has(spId) || s.zones[z].discovered.some((k) => { const p = String(k).split('>'); return p[0] === spId || p[1] === spId; })));
  const smp = SAMPLE_OF[spId];
  const got = {
    seen,
    photo: !!s.ph[spId],
    scope: !!(smp && s.lab.seen[smp]),
    invent: !!(s.lab.inventions[spId] || (spId === 'reefshark' && s.lab.inventions.sharkskin)),
    case: Object.keys(s.cases).some((id) => { const c = CASE_SPECIES[id]; return c && (!zone || c[0] === zone) && c.indexOf(spId) > 0; }),
    source: !!(sourceCheck && (() => { try { return sourceCheck(spId, zone); } catch (e) { return false; } })()),
  };
  for (const k of STAMPS) if (got[k]) out.push(k);
  return out;
}

// ─────────────────────────────── announcing (רובו־דע, once per thread)
// the first time a player meets the threads (e.g. one who played long before 1.3.2), many may be open at once:
// רובו־דע announces three of them (the simple ones first); the others are on the map without a parade
export function fresh() {
  const S0 = store(); let f = active().filter((t) => !S0.shown[t.id]);
  if (!S0.init) {
    S0.init = Date.now();
    if (f.length > 3) { const keep = new Set([...f.filter((t) => t.mode === 'exp'), ...f].slice(0, 3)); for (const t of f) if (!keep.has(t)) S0.shown[t.id] = Date.now(); f = f.filter((t) => keep.has(t)); }
    save();
  }
  return f;
}
export function markShown(ids) {
  const S0 = store(); const list = ids ? [].concat(ids) : fresh().map((t) => t.id);
  for (const id of list) if (!S0.shown[id]) S0.shown[id] = Date.now();
  save();
}
export const lineOf = (id) => ((GUIDE['threads:' + id] || [])[0] || null);
// one fresh thread, as a short tip (or a modal bubble); the lab has its own robot, so the guide waits until it closes
let stageBusy = 0;   // until when a stage moment (its scene, then רובו־דע's words) is on: the thread waits for it
export function announce({ modal = false } = {}) {
  const g = typeof window !== 'undefined' && window.__guide; if (!g) return null;
  if (Date.now() < stageBusy || document.querySelector('#ui .lb.on, #ui .jm')) return null;   // the lab has its own robot; the map announces by itself
  const f = fresh(); if (!f.length) return null;
  const t = f.find((x) => x.mode === 'exp') || f[0];
  const ln = lineOf(t.id); markShown(t.id);
  if (!ln) return null;
  try { window.dispatchEvent(new CustomEvent('wol-thread', { detail: { id: t.id } })); } catch (e) { }
  if (modal) g.say([ln], { modal: true, place: 'center' }); else g.tip(ln, { ms: 9000 });
  return t.id;
}
let soonT = 0;
export function announceSoon(ms = 1800) { clearTimeout(soonT); soonT = setTimeout(() => { try { announce(); } catch (e) { console.error(e); } }, ms); }
export function noteUsed(what) { const S0 = store(); if (S0.used[what]) return; S0.used[what] = Date.now(); save(); snapV = null; }
export function reload() { mem = null; snapV = null; }

if (typeof window !== 'undefined') {
  window.addEventListener('wol-progress', (e) => {
    const d = e && e.detail; snapV = null;
    if (d && d.kind === 'tool' && d.id) noteUsed(d.id);
    announceSoon();
  });
  window.addEventListener('wol-badge', () => { snapV = null; announceSoon(); });
  window.addEventListener('wol-journey', () => { reload(); });
  window.addEventListener('wol-stage', (e) => { if (e && e.detail && !e.detail.legacy) stageBusy = Date.now() + 40000; });
  window.addEventListener('wol-stage-done', () => { stageBusy = 0; announceSoon(1200); });
  window.__threads = { active, all, has, toolBoost, eventBoost, choicesFor, reveals, measures, robotsOut, markedSamples, sampleMarked, questionMarked,
    problemsWaiting, problemWaiting, recommended, stamps, fresh, markShown, announce, announceSoon, noteUsed, reload, THREADS };
}
