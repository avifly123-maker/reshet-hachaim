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
//   isOpen(part) → bool                 lockInfo(part) → { stage, name, text } (the words for a veiled part); lockWords(part) → text
//   check() → [newly reached stages]    fires window 'wol-stage' ({ detail: { stage, parts } }) once per stage
//   markUsed(part), wasUsed(part), markIntro(part), introSeen(part)
//   playMode() / setPlayMode(m)         'experience' | 'full'   (beginners always play their own simple mode)
//   textSize() / setTextSize(s)         'normal' | 'large' | 'xlarge'   (applies a class on <html>, see applyTextSize)
//   voiceOn() / setVoice(on)            רובו־דע speaks his lines (src/audio/voice.js)
//   allOpen() / unlockAll(code) / lockAgain()   the instructors' switch; INSTRUCTOR_CODE (Avi gives it to the instructors; docs/JOURNEY.md)
// Events listened to: 'wol-badge' (a badge), 'wol-progress' (a mission, a lab activity, a solved mystery…) → check().
import { rankOf } from '../game/rank.js';   // the island's rank (stage 6; game/rank.js has no three.js)
import { K as KEY, zoneKey, saveKey, readPlayer, writePlayer, readPlayerRaw, readDeviceRaw, writeDeviceRaw, removeDevice, playerKey, playerMode as levelNow } from './storage.js';

const K = KEY.journey;
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
  // 1.4: the desert, a hard zone, opens at the expert stage (docs/PLAN-1.4.md section 3)
  'zone:desert': { stage: 6, v14: true, name: 'המדבר', kname: 'הַמִּדְבָּר', where: 'start' },
};

// need: a list of ways (any one is enough). Keys: missions (done in all zones), badges (owned), lab (lab activities).
// Beginners ('kids') have their own, easier numbers. The numbers are a first proposal, tuned by a full playthrough.
// 25.10 (Avi): the stages went by too fast (10 missions in half an hour, and most missions give a badge too, so
// "missions or badges" was one road). Each stage now asks for several things together, among them the part that the
// stage before opened: the album's cards, a card game, the lab, the reef, a mystery, an invention, an island's rank.
// Keys: missions (all zones), amazon / grove / reef (missions in that zone), cards (in the album), cardgame (חוט הקשר or
// מחזיקים את היער played), lab (lab activities), solved (mysteries healed), invent (inventions and inventors' problems
// solved), rank (the best island rank reached: 0 = the first, 3 = the last; RANKS in game/rank.js).
export const STAGES = [
  { n: 1, id: 'observer', name: 'מתבונן', kname: 'מִתְבּוֹנֵן', need: null, kneed: null },
  { n: 2, id: 'collector', name: 'אספן', kname: 'אַסְפָן', need: [{ missions: 3 }], kneed: [{ missions: 2 }] },
  { n: 3, id: 'keeper', name: 'שומר', kname: 'שׁוֹמֵר', need: [{ missions: 8, cards: 12 }], kneed: [{ missions: 5, cards: 8 }] },
  { n: 4, id: 'researcher', name: 'חוקר', kname: 'חוֹקֵר', need: [{ missions: 15, amazon: 5, grove: 5, cards: 20, cardgame: 1 }], kneed: [{ missions: 9, amazon: 3, grove: 3, cards: 12, cardgame: 1 }] },
  { n: 5, id: 'inventor', name: 'ממציא', kname: 'מַמְצִיא', need: [{ lab: 3, reef: 4 }], kneed: [{ lab: 2, reef: 2 }] },
  { n: 6, id: 'expert', name: 'מומחה', kname: 'מֻמְחֶה', need: [{ missions: 30, solved: 1, invent: 1, rank: 2 }], kneed: [{ missions: 15, solved: 1, rank: 1 }] },
  // 1.4 (docs/PLAN-1.4.md section 3): two more stages. They are on the map from 1.4.0, marked `soon`: a soon stage is
  // never reached and opens nothing, until the parts it opens are built (the programming world comes in a later round
  // of 1.4). Then `soon` goes, the new keys get their counters in metrics(), and the stage opens its parts:
  //   7 מתכנת: 6 desert missions, 12 programming lessons (code), a mystery solved in the desert or the savanna (solvedNew)
  //   8 יזם: 10 robot missions (robot), a desert island at the second rank (drank), two inventions (invent)
  { n: 7, id: 'programmer', name: 'מתכנת', kname: 'מְתַכְנֵת', soon: true, need: [{ desert: 6, code: 12, solvedNew: 1 }], kneed: [{ desert: 3, code: 6, solvedNew: 1 }] },
  { n: 8, id: 'entrepreneur', name: 'יזם', kname: 'יַזָּם', soon: true, need: [{ robot: 10, drank: 1, invent: 2 }], kneed: [{ robot: 5, drank: 1, invent: 1 }] },
];
// the last stage a child can reach in this version (the soon ones are only shown on the map)
export const LAST = STAGES.filter((st) => !st.soon).length;

// storage: core/storage.js (reading never throws; a write that fails keeps the visit going)
const isKids = () => levelNow() === 'kids';

// ─────────────────────────────── what the child has done (read from the game's own saves)
import { ZONE_IDS as ZONES } from '../data/zones.js';
export { ZONES };   // the zones whose saves count (core/threads.js reads the same)
// the missions done in a zone: what its save says now, joined with what this store remembers (a new forest, or the other
// level, overwrites web-of-life-<zone>.done; a mission done once still counts)
function doneIn(z, kept) {
  const o = readPlayer(zoneKey(z), null);
  const ids = new Set(o && Array.isArray(o.done) ? o.done : []);
  for (const id of (kept && Array.isArray(kept[z]) ? kept[z] : [])) ids.add(id);
  return ids;
}
export function metrics() {
  let missions = 0; const per = {};
  const kept = (readPlayer(K, null) || {}).done;
  for (const z of ZONES) { per[z] = doneIn(z, kept).size; missions += per[z]; }
  const b = readPlayer(KEY.badges, {}); const badges = b && b.own ? Object.keys(b.own).length : 0;
  const L = readPlayer(KEY.lab, {}) || {};
  const n = (o) => (o && typeof o === 'object' ? Object.keys(o).length : 0);
  let found = 0; for (const k in (L.found || {})) found += Array.isArray(L.found[k]) ? L.found[k].length : 0;
  const lab = found + n(L.inventions) + n(L.qs) + n(L.think) + n(L.st) + n(L.solved);
  const R = readPlayer(KEY.research, {}) || {}; const cases = n(R.cases);
  let solved = 0; for (const id in (R.cases || {})) { const c = R.cases[id]; if (c && Array.isArray(c.stars) && c.stars[0]) solved++; }
  const C = readPlayer(KEY.cards, {}) || {}; const cards = n(C.owned);
  const used = ((readPlayer(K, null) || {}).used) || {};
  const cardgame = (used.webpuzzle ? 1 : 0) + (used.keepforest ? 1 : 0);
  const m = { missions, amazon: per.amazon, grove: per.grove, reef: per.reef, desert: per.desert, badges, lab, cases, solved, cards, cardgame, invent: n(L.inventions) + n(L.solved) };
  // the island rank reads the forests' saves: only when a stage asks for it (check() runs often)
  let rank = null;
  Object.defineProperty(m, 'rank', { enumerable: true, get() {
    if (rank == null) { rank = 0; const kids = levelNow() === 'kids'; for (const z of ZONES) { try { rank = Math.max(rank, rankOf(z, kids).i); } catch (e) { } } }
    return rank; } });
  return m;
}

// ─────────────────────────────── the store
let mem = null;   // in memory too: the journey works when storage is blocked
function store() {
  const s = readPlayer(K, null);
  if (s && typeof s === 'object' && s.v === 1) { mem = s; return s; }
  if (mem && mem._key === playerKey(K)) return mem;
  // first visit of this player to 1.3.2: someone who already played keeps everything open and plays the full mode
  const m = metrics();
  // a saved forest counts too (a child who planted but never finished a mission or opened a pack)
  // (both slots: the full level's web-of-life-save-<zone> and the beginners' web-of-life-save-<zone>-kids, see game/game/save.js)
  let forest = false;
  for (const z of ZONES) for (const kids of [false, true]) if (readPlayerRaw(saveKey(z, kids))) forest = true;
  const legacy = forest || m.missions + m.badges + m.lab + m.cases + m.cards > 0;
  const fresh = { v: 1, created: Date.now(), legacy, shown: {}, used: {}, intro: {}, mode: legacy ? 'full' : 'experience', text: 'large', voice: true };
  if (legacy) for (const st of STAGES) if (reached(st, m)) fresh.shown[st.id] = Date.now();   // no parade of old stages
  writePlayer(K, fresh); mem = { ...fresh, _key: playerKey(K) };
  return fresh;
}
function save(s) { const o = { ...s }; delete o._key; writePlayer(K, o); mem = { ...o, _key: playerKey(K) }; }
// the best stage this player ever reached: it never drops (the store's `best`, and every stage already announced)
function bestStage(s) {
  let b = Math.max(1, +(s && s.best) || 1);
  for (const st of STAGES) if (s && s.shown && s.shown[st.id]) b = Math.max(b, st.n);
  return Math.min(b, STAGES.length);
}
function reached(st, m) { if (st.soon) return false; const need = isKids() ? st.kneed : st.need; if (!need) return true; return need.some((w) => Object.keys(w).every((k) => (m[k] || 0) >= w[k])); }

export const allOpen = () => readDeviceRaw(KEY.allopen) === '1';
export function unlockAll(code) { if (String(code).trim() !== INSTRUCTOR_CODE) return false; writeDeviceRaw(KEY.allopen, '1'); notify(); return true; }
export function lockAgain() { removeDevice(KEY.allopen); notify(); }

export function stageNow(m = metrics()) { let s = 1; for (const st of STAGES) if (reached(st, m)) s = st.n; else break; return Math.max(s, bestStage(store())); }

export function state() {
  const m = metrics(), s = store(), stage = stageNow(m), kids = isKids();
  const nx = STAGES.find((st) => st.n === stage + 1) || null;
  let next = null;
  if (nx && nx.soon) next = { stage: nx.n, name: kids ? nx.kname : nx.name, need: [kids ? 'נִפְתָּח בַּגִּרְסָה הַבָּאָה' : 'נפתח בגרסה הבאה'], progress: 0, soon: true };
  else if (nx) {
    const need = (kids ? nx.kneed : nx.need) || [];
    const words = need.map((w) => wayWords(w, m, kids));
    const progress = Math.max(0, ...need.map((w) => wayProgress(w, m)));
    next = { stage: nx.n, name: kids ? nx.kname : nx.name, need: words, progress };
  }
  const st = STAGES[stage - 1];
  return { stage, stageId: st.id, name: kids ? st.kname : st.name, metrics: m, next, legacy: !!s.legacy, allOpen: allOpen(), kids };
}
// the words of one thing still missing ('' when it is done)
const ZONE_IN = { amazon: ['באמזונס', 'בָּאָמָזוֹנָס'], grove: ['בחורש', 'בַּחֹרֶשׁ'], reef: ['בשונית', 'בַּשּׁוּנִית'], desert: ['במדבר', 'בַּמִּדְבָּר'] };
const RANK_WORDS = [null, ['אי אחד בדרגה השנייה (כמו חורש פורח)', 'אִי אֶחָד בַּדַּרְגָּה הַשְּׁנִיָּה (כְּמוֹ חֹרֶשׁ פּוֹרֵחַ)'],
  ['אי אחד בדרגה השלישית (כמו חורש עבות)', 'אִי אֶחָד בַּדַּרְגָּה הַשְּׁלִישִׁית (כְּמוֹ חֹרֶשׁ עָבוֹת)'], ['אי אחד בדרגה הרביעית', 'אִי אֶחָד בַּדַּרְגָּה הָרְבִיעִית']];
function needWord(k, n, have, kids) {
  const left = Math.max(0, n - have); if (!left) return '';
  const w = (f, kk) => (kids ? kk : f);
  if (k === 'missions') return left === 1 ? w('עוד משימה אחת', 'עוֹד מְשִׂימָה אַחַת') : w(`עוד ${left} משימות`, `עוֹד ${left} מְשִׂימוֹת`);
  if (ZONE_IN[k]) return (left === 1 ? w('עוד משימה אחת', 'עוֹד מְשִׂימָה אַחַת') : w(`עוד ${left} משימות`, `עוֹד ${left} מְשִׂימוֹת`)) + ' ' + w(...ZONE_IN[k]);
  if (k === 'badges') return left === 1 ? w('עוד תג אחד', 'עוֹד תָּג אֶחָד') : w(`עוד ${left} תגים`, `עוֹד ${left} תָּגִים`);
  if (k === 'lab') return left === 1 ? w('עוד גילוי אחד במעבדה', 'עוֹד גִּלּוּי אֶחָד בַּמַּעְבָּדָה') : w(`עוד ${left} גילויים במעבדה`, `עוֹד ${left} גִּלּוּיִים בַּמַּעְבָּדָה`);
  if (k === 'cards') return left === 1 ? w('עוד קלף אחד באלבום', 'עוֹד קְלָף אֶחָד בָּאַלְבּוֹם') : w(`עוד ${left} קלפים באלבום`, `עוֹד ${left} קְלָפִים בָּאַלְבּוֹם`);
  if (k === 'cardgame') return w('משחק קלפים אחד (חוט הקשר או מחזיקים את היער)', 'מִשְׂחַק קְלָפִים אֶחָד (חוּט הַקֶּשֶׁר אוֹ מַחֲזִיקִים אֶת הַיַּעַר)');
  if (k === 'solved') return left === 1 ? w('תעלומה פתורה אחת', 'תַּעֲלוּמָה פְּתוּרָה אַחַת') : w(`עוד ${left} תעלומות פתורות`, `עוֹד ${left} תַּעֲלוּמוֹת פְּתוּרוֹת`);
  if (k === 'invent') return left === 1 ? w('המצאה אחת', 'הַמְצָאָה אַחַת') : w(`עוד ${left} המצאות`, `עוֹד ${left} הַמְצָאוֹת`);
  if (k === 'rank') return w(...(RANK_WORDS[Math.min(3, n)] || RANK_WORDS[1]));
  return '';
}
// all that is missing for one way, joined: "עוד 3 משימות, עוד 5 קלפים באלבום ומשחק קלפים אחד"
function wayWords(w, m, kids) {
  // missions asked in a zone count for the total too: "עוד 5 משימות בחורש", not "עוד 5 משימות, עוד 5 משימות בחורש"
  const zoneLeft = Object.keys(ZONE_IN).reduce((a, z) => a + (w[z] ? Math.max(0, w[z] - (m[z] || 0)) : 0), 0);
  const has = (k) => (k === 'missions' && zoneLeft ? (m.missions || 0) + zoneLeft : m[k] || 0);
  const parts = Object.keys(w).map((k) => needWord(k, w[k], has(k), kids)).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  return parts.slice(0, -1).join(', ') + (kids ? ' וְ' : ' ו') + parts[parts.length - 1];
}
// how far along one way is: the average of its parts (each part counts up to its number)
function wayProgress(w, m) { const ks = Object.keys(w); return ks.reduce((a, k) => a + Math.min(1, (m[k] || 0) / w[k]), 0) / ks.length; }

export function isOpen(part) {
  const P = PARTS[part]; if (!P) return true;   // anything not in the registry is never locked
  if (allOpen()) return true;
  const s = store(); if (s.legacy && !P.v14) return true;   // a player from before 1.3.2: all of 1.3 open, the new parts by the stages
  const stage = stageNow();
  if (stage >= 6 && P.stage <= 6) return true;
  if (stage < P.stage) return false;
  if (P.after && !s.used[P.after] && !s.used[part]) return false;
  return true;
}
// text: what opens a veiled part, in words that fit every part's name ("פותחים בשלב 4: חוקר": no verb that has to agree
// with a masculine or feminine name). Every screen uses these words: the start screen and the map (lockWords), the
// learning hub's veils and tips, the lab's stations.
export function lockInfo(part) {
  const P = PARTS[part]; if (!P) return null;
  const kids = isKids(), st = STAGES[P.stage - 1], name = kids ? P.kname : P.name;
  if (stageNow() >= P.stage && P.after) { const A = PARTS[P.after]; return { stage: P.stage, name, text: kids ? `פּוֹתְחִים אַחֲרֵי ${A.kname}` : `פותחים אחרי ${A.name}` }; }
  return { stage: P.stage, name, text: kids ? `פּוֹתְחִים בְּשָׁלָב ${P.stage}: ${st.kname}` : `פותחים בשלב ${P.stage}: ${st.name}` };
}
export const lockWords = (part) => { const L = lockInfo(part); return L ? L.text : ''; };
export const partsOf = (stage) => Object.keys(PARTS).filter((p) => PARTS[p].stage === stage);

// newly reached stages, announced once each (oldest first)
export function check() {
  const s = store(), before = JSON.stringify(s);
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
  if (JSON.stringify(s) !== before) save(s);   // written only when something changed (check runs often)
  for (const n of out) { try { window.dispatchEvent(new CustomEvent('wol-stage', { detail: { stage: n, parts: partsOf(n), legacy: !!s.legacy } })); } catch (e) { } }
  return out;
}
export function markUsed(part) { const s = store(); if (s.used[part]) return; s.used[part] = Date.now(); save(s); notify(); setTimeout(() => { try { check(); } catch (e) { console.error(e); } }, 1500); }   // a card game played counts (stage 4)
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
  const CHECK_DELAY_MS = 400;   // after a badge or progress: let the game finish writing its own save first
  const later = () => setTimeout(() => { try { check(); } catch (e) { console.error(e); } }, CHECK_DELAY_MS);
  window.addEventListener('wol-badge', later);
  window.addEventListener('wol-progress', later);
  window.__journey = { state, isOpen, check, metrics, markUsed, playMode, setPlayMode, unlockAll, lockAgain, reload, PARTS, STAGES, LAST };
}
