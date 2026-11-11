// The badges (תגים) a player owns, and the album frame they chose – per player, under 'web-of-life-badges'.
// grant(earn) gives every badge whose `earn` matches (src/data/badges.js) and tells the page: a 'wol-badge' event,
// which main.js shows as a medallion that drops in. Anything can grant: the forest (expert missions), the hub's
// games, the lab, the research world.
import { K as KEY, readPlayer, writePlayer } from './storage.js';
import { BADGES, FRAMES, badgesFor } from '../data/badges.js';
const K = KEY.badges;

function read() {
  const o = readPlayer(K, {}); return o && typeof o === 'object' ? o : {};
}
function write(o) { writePlayer(K, o); }   // storage full or blocked: the badge stays for this visit only

export function ownedBadges() { return read().own || {}; }
export function hasBadge(id) { return !!ownedBadges()[id]; }
// counters for badges that need a tally (inventions, failures, samples…)
export function tally(key, add = 0) {
  const o = read(); o.n = o.n || {};
  if (add) { o.n[key] = (o.n[key] || 0) + add; write(o); }
  return o.n[key] || 0;
}
export function grant(earn) {
  const o = read(); o.own = o.own || {};
  const fresh = [];
  for (const b of badgesFor(earn)) if (!o.own[b.id]) { o.own[b.id] = Date.now(); fresh.push(b); }
  if (!fresh.length) return [];
  write(o);
  for (const b of fresh) { try { window.dispatchEvent(new CustomEvent('wol-badge', { detail: b.id })); } catch (e) { /* */ } }
  if (!String(earn).startsWith('rare:')) checkRare();
  return fresh;
}
// 1.4.4 set 9: the rare badges (src/data/rare-badges.js) are read from the badges a child owns. Rare badges never count
// for other rare badges, and badges of the torah edition only are never needed.
const plain = (b) => b.group !== 'rare' && !b.torah;
export function rareMet(cond, own = ownedBadges()) {
  const inG = (g) => BADGES.filter((b) => plain(b) && b.group === g);
  const got = (list) => list.filter((b) => own[b.id]).length;
  if (cond.total) return got(BADGES.filter(plain)) >= cond.total;
  if (cond.group) { const L = inG(cond.group); if (!L.length) return false; return got(L) >= (cond.part === 'all' ? L.length : Math.ceil(L.length / 2)); }
  if (cond.groups) { const ok = cond.groups.filter((g) => got(inG(g)) >= (cond.each || 1)).length; return ok >= (cond.atLeast || cond.groups.length); }
  return false;
}
export function checkRare() {
  const own = ownedBadges(), out = [];
  for (const b of BADGES) if (b.group === 'rare' && !own[b.id] && b.cond && rareMet(b.cond, own)) out.push(...grant(b.earn));
  return out;
}
export function groupCount(group) { const own = ownedBadges(); return BADGES.filter((b) => (group === 'all' || b.group === group) && own[b.id]).length; }
export function frameOpen(f) { return !f.need || groupCount(f.group || 'all') >= f.need; }
export function openFrames() { return FRAMES.filter(frameOpen); }
export function chosenFrame() { const id = read().frame || 'none'; const f = FRAMES.find((x) => x.id === id); return f && frameOpen(f) ? id : 'none'; }
export function chooseFrame(id) { const f = FRAMES.find((x) => x.id === id); if (!f || !frameOpen(f)) return false; const o = read(); o.frame = id; write(o); return true; }
// headless tests: grant badges and read what is owned (tests/play/rare-badges.json)
try { if (typeof window !== 'undefined') window.__badges = { grant, ownedBadges, checkRare, groupCount }; } catch (e) { /* */ }
