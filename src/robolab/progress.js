// מעבדת הרובוטים – what each player solved (per player, src/core/storage.js K.robolab).
// { done: { <levelId>: { stars, blocks, t } }, seen: { intro: 1, ... }, fun: n (funny blocks pressed, for a badge),
//   look: { robot|drone|sub: { parts: { socket: partId }, paint: { body, trim, accent } } } (the garage),
//   robots: [{ id, name, build }] (1.4.3: the robot workshop's garage, up to 8), wk: { tests, passed, missions, step, trials },
//   tc: { <techCardId>: time } (1.4.3: the technology cards, src/robolab/tech.js) }
// Writes fire 'wol-progress' { kind: 'robolab' } so מסע החוקר and the badges can count.
import { K, readPlayer, writePlayer, removePlayer } from '../core/storage.js';

const EMPTY = () => ({ done: {}, seen: {}, fun: 0, look: {}, isl: 0, robots: [], wk: { tests: 0, passed: 0, missions: 0, step: 0, trials: {} }, tc: {} });
export const MAX_ROBOTS = 8;
const WK0 = () => ({ tests: 0, passed: 0, missions: 0, step: 0, trials: {} });
export function roboProgress() {
  const o = readPlayer(K.robolab, null);
  if (!o || typeof o !== 'object') return EMPTY();
  const wk = o.wk && typeof o.wk === 'object' ? { ...WK0(), ...o.wk, trials: { ...(o.wk.trials || {}) } } : WK0();
  return { done: o.done && typeof o.done === 'object' ? o.done : {}, seen: o.seen && typeof o.seen === 'object' ? o.seen : {}, fun: o.fun | 0, look: o.look && typeof o.look === 'object' ? o.look : {}, isl: o.isl | 0,
    robots: Array.isArray(o.robots) ? o.robots.filter((r) => r && r.id && r.build).slice(0, MAX_ROBOTS) : [], wk,
    tc: o.tc && typeof o.tc === 'object' ? o.tc : {} };
}
function save(o, detail, quiet = false) {
  writePlayer(K.robolab, o);
  if (quiet) return;   // what was seen, the funny-block count: nothing for the journey or the badges to count
  try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'robolab', ...(detail || {}) } })); } catch (e) { }
}
// a solved level: keeps the best stars and the fewest blocks; returns { first, better }
export function markSolved(id, stars, blocks) {
  const o = roboProgress(); const was = o.done[id];
  const first = !was, better = !!was && (stars > was.stars || (stars === was.stars && blocks < was.blocks));
  if (first || better) o.done[id] = { stars: Math.max(stars, was ? was.stars : 0), blocks: was ? Math.min(blocks, was.blocks) : blocks, t: Date.now() };
  save(o, { id, first }); return { first, better };
}
export function markSeen(key) { const o = roboProgress(); if (!o.seen[key]) { o.seen[key] = 1; save(o, null, true); } }
export function addFun(n = 1) { const o = roboProgress(); o.fun += n; save(o, null, true); return o.fun; }
export const solvedCount = (pred) => { const d = roboProgress().done; return Object.keys(d).filter((id) => !pred || pred(id)).length; };

// the player's design of one tool (the garage, src/robolab/garage.js)
export const toolLook = (tool) => { const L = roboProgress().look[tool]; return L && typeof L === 'object' ? { parts: { ...(L.parts || {}) }, paint: { ...(L.paint || {}) } } : { parts: {}, paint: {} }; };
export function setToolLook(tool, look) { const o = roboProgress(); o.look[tool] = { parts: { ...(look.parts || {}) }, paint: { ...(look.paint || {}) } }; save(o, { look: tool }); }
// a mission done on the player's own island (they are made anew each time, so only the count is kept)
export function addIsland() { const o = roboProgress(); o.isl += 1; save(o, { island: true }); return o.isl; }

// 2.11 (Avi): a lesson opens empty every time, and its stars and rank stay. The program lives only in the open editor
// while the child is in the lesson (run, fail, fix); leaving the lesson drops it. 1.4.1 and 1.4.2 kept drafts under
// K.robolabDraft (29.10): they are removed for the player when the lab opens.
export function dropDrafts() { if (readPlayer(K.robolabDraft, null) != null) removePlayer(K.robolabDraft); }

// ── 1.4.3, the robot workshop: the garage (up to MAX_ROBOTS named robots) and what was done there
export const myRobots = () => roboProgress().robots;
export function saveRobot(r) {
  const o = roboProgress(); const i = o.robots.findIndex((q) => q.id === r.id);
  const rec = { id: r.id, name: String(r.name || '').slice(0, 18), build: r.build };
  if (i >= 0) o.robots[i] = rec; else if (o.robots.length < MAX_ROBOTS) o.robots.push(rec); else return false;
  save(o, null, true); return true;
}
export function deleteRobot(id) { const o = roboProgress(); o.robots = o.robots.filter((q) => q.id !== id); save(o, null, true); }
// a run on the test track: counted, and the ground it passed is kept; returns the workshop step reached (it never goes back)
export function addTrial(ground, passed, stepOf) {
  const o = roboProgress(); o.wk.tests++; if (passed) { o.wk.passed++; o.wk.trials[ground] = 1; }
  const was = o.wk.step, now = Math.max(was, stepOf(o.wk)); o.wk.step = now;
  save(o, { workshop: true }); return { was, now };
}
export function wkState() { return roboProgress().wk; }

// ── 1.4.3, the technology cards (src/data/robolab/tech-cards.js): which the player owns, read also by the learning hub
export const ownedTechCards = () => roboProgress().tc;
export function addTechCards(ids) {
  if (!ids.length) return;
  const o = roboProgress(); const t = Date.now(); ids.forEach((id) => { if (!o.tc[id]) o.tc[id] = t; }); save(o, null, true);
}
