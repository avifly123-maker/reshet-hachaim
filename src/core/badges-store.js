// The badges (תגים) a player owns, and the album frame they chose – per player, under 'web-of-life-badges'.
// grant(earn) gives every badge whose `earn` matches (src/data/badges.js) and tells the page: a 'wol-badge' event,
// which main.js shows as a medallion that drops in. Anything can grant: the forest (expert missions), the hub's
// games, the lab, the research world.
import { key as profileKey } from './profiles.js';
import { BADGES, FRAMES, badgesFor } from '../data/badges.js';
const K = 'web-of-life-badges';

function read() {
  try { const o = JSON.parse(localStorage.getItem(profileKey(K)) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}
function write(o) { try { localStorage.setItem(profileKey(K), JSON.stringify(o)); } catch (e) { /* storage full or blocked */ } }

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
  return fresh;
}
export function groupCount(group) { const own = ownedBadges(); return BADGES.filter((b) => (group === 'all' || b.group === group) && own[b.id]).length; }
export function frameOpen(f) { return !f.need || groupCount(f.group || 'all') >= f.need; }
export function openFrames() { return FRAMES.filter(frameOpen); }
export function chosenFrame() { const id = read().frame || 'none'; const f = FRAMES.find((x) => x.id === id); return f && frameOpen(f) ? id : 'none'; }
export function chooseFrame(id) { const f = FRAMES.find((x) => x.id === id); if (!f || !frameOpen(f)) return false; const o = read(); o.frame = id; write(o); return true; }
