// מסע החוקר (1.3.2): the game opens step by step. Six stages (ranks of a young researcher); each opens two or three
// parts of the game. What the child has done is NOT saved again here: it is read from what the game already keeps
// (missions done per zone, badges, the lab, the mysteries, the album), so old saves count from the first moment.
// This store only keeps what is new: which stage announcements were shown, which parts were used, the child's
// play mode (חוויה / מלא), text size and the voice of רובו־דע.
//
// Storage (per player, see core/profiles.js):  'web-of-life-journey' = {
//   v: 1, created: time, legacy: bool (the player had progress before 1.3.2: every part is open for them),
//   shown: { <stageId>: time }   (the stage-up moment was shown),  used: { <partId>: time },
//   intro: { <partId>: time }   (רובו־דע presented the part),  mode: 'experience'|'full', text: 'normal'|'large'|'xlarge', voice: bool,
//   best: n   (the best stage ever reached: a stage never closes again),  done: { <zone>: [missionId] }   (every mission
//   done so far: a new forest or the other level overwrites web-of-life-<zone>.done, a mission done once still counts) }
// Device-wide: 'web-of-life-allopen' = '1' – the instructors' switch (everything open on this computer, behind a code).
//
// API
//   PARTS, STAGES                      the registry (ids below are used by every screen that locks something)
//   state() → { stage, stageId, metrics, next: { stage, need: [text], progress 0..1 } | null, legacy, allOpen }
//   isOpen(part) → bool                 lockInfo(part) → { stage, name, text } (the words for a veiled part)
//   check() → [newly reached stages]    fires window 'wol-stage' ({ detail: { stage, parts } }) once per stage
//   markUsed(part), wasUsed(part), markIntro(part), introSeen(part)
//   playMode() / setPlayMode(m)         'experience' | 'full'   (beginners always play their own simple mode)
//   textSize() / setTextSize(s)         'normal' | 'large' | 'xlarge'   (applies a class on <html>, see applyTextSize)
//   voiceOn() / setVoice(on)            רובו־דע speaks his lines (src/audio/voice.js)
//   allOpen() / unlockAll(code) / lockAgain()   the instructors' switch; INSTRUCTOR_CODE (Avi gives it to the instructors; docs/JOURNEY.md)
// Events listened to: 'wol-badge' (a badge), 'wol-progress' (a mission, a lab activity, a solved mystery…) → check().
import { key as profileKey } from './profiles.js';

const K = 'web-of-life-journey';
const ALL_OPEN = 'web-of-life-allopen';
export const INSTRUCTOR_CODE = '2580';

// ─────────────────────────────── the parts of the game that open along the way
// where: 'start' (start screen), 'hub' (learning hub), 'lab' (a station of the lab), 'zone', 'research', 'game' (inside a game)
export const PARTS = {
  'zone:amazon': { stage: 1, name: 'האמזונס', kname: 'הָאָמָזוֹנָס', where: 'start' },
  'zone:grove': { stage: 1, name: 'החורש', kname: 'הַחֹרֶשׁ', where: 'start' },
  journey: { stage: 1, name: 'מפת המסע', kname: 'מַפַּת הַמַּסָּע', where: 'start' },
  album: { stage: 2, name: 'אלבום הקלפים', kname: 'אַלְבּוֹם הַקְּלָפִים', where: 'hub' },
  quiz: { stage: 2, name: 'החידון', kname: 'הַחִידוֹן', where: 'hub' },
  learn: { stage: 2, name: 'מרכז הלמידה', kname: 'מֶרְכַּז הַלְּמִידָה', where: 'start' },
  webpuzzle: { stage: 3, name: 'חוט הקשר', kname: 'חוּט הַקֶּשֶׁר', where: 'hub' },
  keepforest: { stage: 3, name: 'מחזיקים את היער', kname: 'מַחֲזִיקִים אֶת הַיַּעַר', where: 'hub' },
  badges: { stage: 3, name: 'התגים שלי', kname: 'הַתָּגִים שֶׁלִּי', where: 'hub' },
  'zone:reef': { stage: 4, name: 'השונית', kname: 'הַשּׁוּנִית', where: 'start' },
  science: { stage: 4, name: 'המרכז המדעי', kname: 'הַמֶּרְכָּז הַמַּדָּעִי', where: 'start' },
  lab: { stage: 4, name: 'המעבדה של רובו־דע', kname: 'הַמַּעְבָּדָה שֶׁל רוֹבּוֹ־דַּע', where: 'start' },
  'lab:scope': { stage: 4, name: 'המיקרוסקופ', kname: 'הַמִּיקְרוֹסְקוֹפּ', where: 'lab' },
  'lab:atlas': { stage: 4, name: 'האטלס', kname: 'הָאַטְלָס', where: 'lab' },
  'lab:table': { stage: 5, name: 'שולחן הממציאים', kname: 'שֻׁלְחַן הַמַּמְצִיאִים', where: 'lab' },
  inventors: { stage: 5, name: 'הממציאים', kname: 'הַמַּמְצִיאִים', where: 'hub' },
  robots: { stage: 5, name: 'סדנת הרובוטים', kname: 'סַדְנַת הָרוֹבּוֹטִים', where: 'lab' },
  research: { stage: 5, name: 'חוקרי הטבע', kname: 'חוֹקְרֵי הַטֶּבַע', where: 'start' },
  // the other stations of the lab open one after the other: each after the previous one was used, or at stage 6
  'lab:greenhouse': { stage: 5, name: 'החממה', kname: 'הַחֲמָמָה', where: 'lab' },
  'lab:aquarium': { stage: 5, after: 'lab:greenhouse', name: 'האקווריום', kname: 'הָאַקְוַרְיוּם', where: 'lab' },
  'lab:cabinet': { stage: 5, after: 'lab:aquarium', name: 'ארון הממצאים', kname: 'אֲרוֹן הַמִּמְצָאִים', where: 'lab' },
  frames: { stage: 6, name: 'מסגרות לקלפים', kname: 'מִסְגָּרוֹת לַקְּלָפִים', where: 'hub' },
  expedition: { stage: 6, name: 'משלחת לעומק', kname: 'מִשְׁלַחַת לָעֹמֶק', where: 'hub' },
  duel: { stage: 6, name: 'מי חזק ברשת?', kname: 'מִי חָזָק בָּרֶשֶׁת?', where: 'hub' },
  versematch: { stage: 6, name: 'מה הפסוק מלמד?', kname: 'מָה הַפָּסוּק מְלַמֵּד?', where: 'hub' },
  experts: { stage: 6, name: 'משימות המומחים', kname: 'מְשִׂימוֹת הַמֻּמְחִים', where: 'zone' },
};

// need: a list of ways (any one is enough). Keys: missions (done in all zones), badges (owned), lab (lab activities).
// Beginners ('kids') have their own, easier numbers. The numbers are a first proposal, tuned by a full playthrough.
export const STAGES = [
  { n: 1, id: 'observer', name: 'מתבונן', kname: 'מִתְבּוֹנֵן', need: null, kneed: null },
  { n: 2, id: 'collector', name: 'אספן', kname: 'אַסְפָן', need: [{ missions: 1 }], kneed: [{ missions: 1 }] },
  { n: 3, id: 'keeper', name: 'שומר', kname: 'שׁוֹמֵר', need: [{ missions: 4 }, { badges: 2 }], kneed: [{ missions: 3 }, { badges: 2 }] },
  { n: 4, id: 'researcher', name: 'חוקר', kname: 'חוֹקֵר', need: [{ missions: 7 }, { badges: 4 }], kneed: [{ missions: 5 }, { badges: 3 }] },
  { n: 5, id: 'inventor', name: 'ממציא', kname: 'מַמְצִיא', need: [{ lab: 2 }, { badges: 7 }], kneed: [{ lab: 1 }, { badges: 5 }] },
  { n: 6, id: 'expert', name: 'מומחה', kname: 'מֻמְחֶה', need: [{ missions: 12 }, { badges: 10 }], kneed: [{ missions: 8 }, { badges: 7 }] },
];

const ls = () => { try { return window.localStorage || null; } catch (e) { return null; } };
function readJSON(k, fb) { try { const s = ls(); const t = s && s.getItem(k); return t ? JSON.parse(t) : fb; } catch (e) { return fb; } }
function writeJSON(k, v) { try { const s = ls(); if (s) s.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked: the journey still works this visit */ } }
const pk = (base) => profileKey(base);
const isKids = () => { try { return (ls() && ls().getItem(pk('web-of-life-mode'))) === 'kids'; } catch (e) { return false; } };

// ─────────────────────────────── what the child has done (read from the game's own saves)
const ZONES = ['amazon', 'grove', 'reef'];
// the missions done in a zone: what its save says now, joined with what this store remembers (a new forest, or the other
// level, overwrites web-of-life-<zone>.done; a mission done once still counts)
function doneIn(z, kept) {
  const o = readJSON(pk('web-of-life-' + z), null);
  const ids = new Set(o && Array.isArray(o.done) ? o.done : []);
  for (const id of (kept && Array.isArray(kept[z]) ? kept[z] : [])) ids.add(id);
  return ids;
}
export function metrics() {
  let missions = 0;
  const kept = (readJSON(pk(K), null) || {}).done;
  for (const z of ZONES) missions += doneIn(z, kept).size;
  const b = readJSON(pk('web-of-life-badges'), {}); const badges = b && b.own ? Object.keys(b.own).length : 0;
  const L = readJSON(pk('web-of-life-lab'), {}) || {};
  const n = (o) => (o && typeof o === 'object' ? Object.keys(o).length : 0);
  let found = 0; for (const k in (L.found || {})) found += Array.isArray(L.found[k]) ? L.found[k].length : 0;
  const lab = found + n(L.inventions) + n(L.qs) + n(L.think) + n(L.st) + n(L.solved);
  const R = readJSON(pk('web-of-life-research'), {}) || {}; const cases = n(R.cases);
  const C = readJSON(pk('web-of-life-cards'), {}) || {}; const cards = n(C.owned);
  return { missions, badges, lab, cases, cards };
}

// ─────────────────────────────── the store
let mem = null;   // in memory too: the journey works when storage is blocked
function store() {
  const s = readJSON(pk(K), null);
  if (s && typeof s === 'object' && s.v === 1) { mem = s; return s; }
  if (mem && mem._key === pk(K)) return mem;
  // first visit of this player to 1.3.2: someone who already played keeps everything open and plays the full mode
  const m = metrics();
  // a saved forest counts too (a child who planted but never finished a mission or opened a pack)
  let forest = false; for (const z of ZONES) { try { if (localStorage.getItem(pk('web-of-life-save-' + z))) forest = true; } catch (e) { } }
  const legacy = forest || m.missions + m.badges + m.lab + m.cases + m.cards > 0;
  const fresh = { v: 1, created: Date.now(), legacy, shown: {}, used: {}, intro: {}, mode: legacy ? 'full' : 'experience', text: 'large', voice: true };
  if (legacy) for (const st of STAGES) if (reached(st, m)) fresh.shown[st.id] = Date.now();   // no parade of old stages
  writeJSON(pk(K), fresh); mem = { ...fresh, _key: pk(K) };
  return fresh;
}
function save(s) { const o = { ...s }; delete o._key; writeJSON(pk(K), o); mem = { ...o, _key: pk(K) }; }
// the best stage this player ever reached: it never drops (the store's `best`, and every stage already announced)
function bestStage(s) {
  let b = Math.max(1, +(s && s.best) || 1);
  for (const st of STAGES) if (s && s.shown && s.shown[st.id]) b = Math.max(b, st.n);
  return Math.min(b, STAGES.length);
}
function reached(st, m) { const need = isKids() ? st.kneed : st.need; if (!need) return true; return need.some((w) => Object.keys(w).every((k) => (m[k] || 0) >= w[k])); }

export const allOpen = () => { try { return (ls() && ls().getItem(ALL_OPEN)) === '1'; } catch (e) { return false; } };
export function unlockAll(code) { if (String(code).trim() !== INSTRUCTOR_CODE) return false; try { ls() && ls().setItem(ALL_OPEN, '1'); } catch (e) { } notify(); return true; }
export function lockAgain() { try { ls() && ls().removeItem(ALL_OPEN); } catch (e) { } notify(); }

export function stageNow(m = metrics()) { let s = 1; for (const st of STAGES) if (reached(st, m)) s = st.n; else break; return Math.max(s, bestStage(store())); }

export function state() {
  const m = metrics(), s = store(), stage = stageNow(m), kids = isKids();
  const nx = STAGES.find((st) => st.n === stage + 1) || null;
  let next = null;
  if (nx) {
    const need = (kids ? nx.kneed : nx.need) || [];
    const words = need.map((w) => Object.keys(w).map((k) => needWord(k, w[k], m[k] || 0, kids)).join(' ו'));
    const progress = Math.max(0, ...need.map((w) => Math.min(...Object.keys(w).map((k) => Math.min(1, (m[k] || 0) / w[k])))));
    next = { stage: nx.n, name: kids ? nx.kname : nx.name, need: words, progress };
  }
  const st = STAGES[stage - 1];
  return { stage, stageId: st.id, name: kids ? st.kname : st.name, metrics: m, next, legacy: !!s.legacy, allOpen: allOpen(), kids };
}
function needWord(k, n, have, kids) {
  const left = Math.max(0, n - have);
  if (k === 'missions') return left === 1 ? (kids ? 'עוֹד מְשִׂימָה אַחַת' : 'עוד משימה אחת') : (kids ? `עוֹד ${left} מְשִׂימוֹת` : `עוד ${left} משימות`);
  if (k === 'badges') return left === 1 ? (kids ? 'עוֹד תָּג אֶחָד' : 'עוד תג אחד') : (kids ? `עוֹד ${left} תָּגִים` : `עוד ${left} תגים`);
  if (k === 'lab') return left === 1 ? (kids ? 'עוֹד גִּלּוּי אֶחָד בַּמַּעְבָּדָה' : 'עוד גילוי אחד במעבדה') : (kids ? `עוֹד ${left} גִּלּוּיִים בַּמַּעְבָּדָה` : `עוד ${left} גילויים במעבדה`);
  return '';
}

export function isOpen(part) {
  const P = PARTS[part]; if (!P) return true;   // anything not in the registry is never locked
  if (allOpen()) return true;
  const s = store(); if (s.legacy) return true;
  const stage = stageNow();
  if (stage >= 6) return true;
  if (stage < P.stage) return false;
  if (P.after && !s.used[P.after] && !s.used[part]) return false;
  return true;
}
export function lockInfo(part) {
  const P = PARTS[part]; if (!P) return null;
  const kids = isKids(), st = STAGES[P.stage - 1];
  if (stageNow() >= P.stage && P.after) { const A = PARTS[P.after]; return { stage: P.stage, name: kids ? P.kname : P.name, text: kids ? `נִפְתָּח אַחֲרֵי ${A.kname}` : `נפתח אחרי ${A.name}` }; }
  return { stage: P.stage, name: kids ? P.kname : P.name, text: kids ? `נִפְתָּח בַּשָּׁלָב ${st.kname}` : `נפתח בשלב ${P.stage}: ${st.name}` };
}
export const partsOf = (stage) => Object.keys(PARTS).filter((p) => PARTS[p].stage === stage);

// newly reached stages, announced once each (oldest first)
export function check() {
  const s = store();
  // remember every mission done so far (the zone's save may be overwritten by a new forest or the other level)
  const kept = s.done && typeof s.done === 'object' ? s.done : {};
  for (const z of ZONES) kept[z] = [...doneIn(z, kept)];
  s.done = kept;
  const m = metrics(), best = bestStage(s); const out = [];
  for (const st of STAGES) {
    if (st.n === 1) { if (!s.shown[st.id]) { s.shown[st.id] = Date.now(); } continue; }
    const ok = st.n <= best || reached(st, m);
    if (ok && !s.shown[st.id]) { s.shown[st.id] = Date.now(); out.push(st.n); }
    if (!ok) break;
    s.best = Math.max(s.best || 1, st.n);
  }
  if (out.length) { save(s); for (const n of out) { try { window.dispatchEvent(new CustomEvent('wol-stage', { detail: { stage: n, parts: partsOf(n), legacy: !!s.legacy } })); } catch (e) { } } }
  else save(s);
  return out;
}
export function markUsed(part) { const s = store(); if (s.used[part]) return; s.used[part] = Date.now(); save(s); notify(); }
export const wasUsed = (part) => !!store().used[part];
export function markIntro(part) { const s = store(); s.intro[part] = Date.now(); save(s); }
export const introSeen = (part) => !!store().intro[part];
export function resetIntros() { const s = store(); s.intro = {}; save(s); }

export const playMode = () => (isKids() ? 'kids' : (store().mode === 'full' ? 'full' : 'experience'));
export function setPlayMode(m) { const s = store(); s.mode = m === 'full' ? 'full' : 'experience'; save(s); notify(); }
export const textSize = () => { const t = store().text; return t === 'normal' || t === 'xlarge' ? t : 'large'; };
export function setTextSize(t) { const s = store(); s.text = t; save(s); applyTextSize(); }
export function applyTextSize() { try { const r = document.documentElement; r.classList.remove('ts-normal', 'ts-large', 'ts-xlarge'); r.classList.add('ts-' + textSize()); } catch (e) { } }
export const voiceOn = () => store().voice !== false;
export function setVoice(on) { const s = store(); s.voice = !!on; save(s); }

// a player switch, a reset: forget the in-memory copy (the next read comes from that player's storage)
export function reload() { mem = null; applyTextSize(); }
function notify() { try { window.dispatchEvent(new CustomEvent('wol-journey')); } catch (e) { } }

if (typeof window !== 'undefined') {
  const later = () => setTimeout(() => { try { check(); } catch (e) { console.error(e); } }, 400);
  window.addEventListener('wol-badge', later);
  window.addEventListener('wol-progress', later);
  window.__journey = { state, isOpen, check, metrics, markUsed, playMode, setPlayMode, unlockAll, lockAgain, reload, PARTS, STAGES };
}
