// אירוע השבוע (1.4.4 set 1, docs/PLAN-1.4.4.md): every week one event is open, from Sunday to Thursday (Avi, 4.11).
// Four kinds take turns (התקלה במעבדה, הצנצנת הסגורה, הבלש של השבוע, מירוץ הרובוטים), each with 8 to 10 versions in
// src/data/weekly.js. No internet, no comparing children (only personal records), no pressure: a version a child missed
// comes back the next time its kind comes round, because the version of the week is the first one this child has not
// done yet. It opens at stage 8 (Avi, 4.11), together with ניצוץ's workshop; the instructors' switch opens every event
// on any day. The prize: a badge, and a rare guest who stays on one of the child's islands (src/game/guests.js).
//
// Storage (per player, core/storage.js K.weekly): {
//   v: 1,
//   weeks: { <weekNo>: { kind, ver, state, started: time, done: time | 0, score } }   the child's own record of a week
//   done: { '<kind>:<ver>': time },  best: { <kind>: score },  n: number of events finished,
//   guests: [{ zone, id, name, kname, t, from: '<kind>:<ver>' }]   rare guests who stay on his islands (one per species and island)
// }
// Time: weeks are counted from a Sunday (local time); `now()` can be moved for tests (__weekly.setDate).
//
// API
//   weekNo(date), dayOf(date) 0 = Sunday, openDay(date)         the clock
//   current() → { week, day, open, daysLeft, kind, ver, ready, rec, done }   this week's event for this player
//   record(week?) / saveState(state)                            the child's state inside the event (an event saves its own)
//   finish({ win, score }) → { first, record, badges: [earn], guest }   ends this week's event; the caller grants badges
//   guestsOf(zone) → [{ id, t, from }]                          the guests living on an island
//   eventsDone(), bestOf(kind), anyOpen() (stage 8 or the instructors' switch)
//   openAny(kind, ver) → a record for an instructor's free choice (any event, any day)
import { K, readPlayer, writePlayer } from './storage.js';
import { isOpen as journeyOpen, allOpen } from './journey.js';
import { WEEK_KINDS, versionsOf, addVersions } from '../data/weekly.js';

const KEY = K.weekly;
const DAY = 24 * 3600 * 1000;
const OPEN_DAYS = 5;   // Sunday (0) to Thursday (4)

// ─────────────────────────────── the clock
let shift = 0;   // tests: setDate moves "now" without touching the computer's clock
export const now = () => new Date(Date.now() + shift);
export function setDate(d) { shift = d == null ? 0 : new Date(d).getTime() - Date.now(); return now(); }
// the week of a date: whole weeks since the first Sunday of 1970 (4.1.1970), in local time
const SUNDAY0 = new Date(1970, 0, 4).getTime();
const localDays = (d) => Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - SUNDAY0 + 12 * 3600 * 1000) / DAY);
export const weekNo = (d = now()) => Math.floor(localDays(d) / 7);
export const dayOf = (d = now()) => d.getDay();
export const openDay = (d = now()) => dayOf(d) < OPEN_DAYS;

// ─────────────────────────────── storage
const blank = () => ({ v: 1, weeks: {}, done: {}, best: {}, n: 0, guests: [] });
function read() {
  const o = readPlayer(KEY, null);
  if (!o || typeof o !== 'object') return blank();
  return Object.assign(blank(), o, { weeks: o.weeks || {}, done: o.done || {}, best: o.best || {}, guests: Array.isArray(o.guests) ? o.guests : [] });
}
const write = (o) => { try { writePlayer(KEY, o); } catch (e) { /* a full disk keeps the event going */ } };

// ─────────────────────────────── which event, this week
// The kinds take turns by the week; inside a kind, the versions in their order starting from where the cycle is, and
// the first one this child has not finished is his (so a missed version comes back the next time round).
export function scheduleFor(week, doneMap = {}, begun = []) {
  const kind = WEEK_KINDS[((week % WEEK_KINDS.length) + WEEK_KINDS.length) % WEEK_KINDS.length].id;
  const vers = versionsOf(kind);
  if (!vers.length) return { kind, ver: null, ready: false };
  // a version the child began in an earlier week and did not win comes back first (no pressure: it waits for him)
  const back = begun.find((b) => b.kind === kind && !doneMap[kind + ':' + b.ver] && vers.some((v) => v.id === b.ver));
  if (back) return { kind, ver: back.ver, ready: true, back: true };
  const start = Math.floor(week / WEEK_KINDS.length) % vers.length;
  for (let i = 0; i < vers.length; i++) {
    const v = vers[(start + i) % vers.length];
    if (!doneMap[kind + ':' + v.id]) return { kind, ver: v.id, ready: true };
  }
  return { kind, ver: vers[start].id, ready: true, again: true };   // all done: the cycle's own version, for a new record
}

export const anyOpen = () => { try { return allOpen() || journeyOpen('weekly'); } catch (e) { return false; } };

export function current() {
  const d = now(), week = weekNo(d), day = dayOf(d), o = read();
  const rec = o.weeks[week] || null;
  // a week the child already started keeps its event, even if the schedule's data changed meanwhile
  const begun = Object.keys(o.weeks).map(Number).filter((k) => k >= 0 && k < week).sort((a, b) => a - b).map((k) => o.weeks[k]).filter((r) => r && !r.done && !r.free);
  const sch = rec ? { kind: rec.kind, ver: rec.ver, ready: !!versionsOf(rec.kind).find((v) => v.id === rec.ver) } : scheduleFor(week, o.done, begun);
  return { week, day, open: day < OPEN_DAYS, daysLeft: Math.max(0, OPEN_DAYS - day), kind: sch.kind, ver: sch.ver, ready: sch.ready, again: !!sch.again, rec, done: !!(rec && rec.done) };
}

// the child opens this week's event: its record is made once (the state an event keeps lives in it)
export function begin() {
  const c = current(); if (!c.ready) return null;
  const o = read();
  if (!o.weeks[c.week]) {
    o.weeks[c.week] = { kind: c.kind, ver: c.ver, state: null, started: now().getTime(), done: 0, score: 0 };
    // keep the last twelve weeks only
    const ks = Object.keys(o.weeks).map(Number).sort((a, b) => b - a);
    ks.slice(12).forEach((k) => delete o.weeks[k]);
    write(o);
  }
  return o.weeks[c.week];
}
export const record = (week = weekNo()) => read().weeks[week] || null;
export function saveState(state, week = weekNo()) {
  const o = read(); const r = o.weeks[week]; if (!r) return false;
  r.state = state; write(o); return true;
}

// the event ends. `win`: the child did what the event asked (a balanced jar on Thursday, the right suspect, a robot that
// finished the course…); `score`: the event's own number for a personal record (higher is better).
export function finish({ win, score = 0, week = weekNo(), guest = null } = {}) {
  const o = read(); const r = o.weeks[week]; if (!r) return null;
  const key = r.kind + ':' + r.ver;
  const first = !!win && !o.done[key];
  const record_ = score > (o.best[r.kind] || 0);
  if (win) { r.done = r.done || now().getTime(); o.done[key] = o.done[key] || now().getTime(); }
  r.score = Math.max(r.score || 0, score);
  if (record_) o.best[r.kind] = score;
  if (first) o.n = (o.n || 0) + 1;
  const badges = [];
  if (first) {
    badges.push('weekly:first', 'weekly:' + r.kind);
    if (WEEK_KINDS.every((k) => Object.keys(o.done).some((x) => x.startsWith(k.id + ':')))) badges.push('weekly:all4');
    if (o.n >= 8) badges.push('weekly:8');
    if (o.n >= 20) badges.push('weekly:20');
  }
  if (record_ && o.best[r.kind] && Object.keys(o.done).filter((x) => x.startsWith(r.kind + ':')).length >= 2) badges.push('weekly:record');
  // the guest of this version, once: it comes to live on the island named by the version (or the one the child chose)
  let g = null;
  if (first && guest && guest.zone && guest.id && !o.guests.some((x) => x.zone === guest.zone && x.id === guest.id)) {
    g = { zone: guest.zone, id: guest.id, name: guest.name || '', kname: guest.kname || '', t: now().getTime(), from: key };
    o.guests.push(g);
  }
  write(o);
  try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'weekly', event: key, win: !!win } })); } catch (e) { }
  return { first, record: record_, badges, guest: g };
}

export const guestsOf = (zone) => read().guests.filter((g) => g.zone === zone);
export const allGuests = () => read().guests.slice();
export const eventsDone = () => read().n || 0;
export const doneMap = () => Object.assign({}, read().done);
export const bestOf = (kind) => read().best[kind] || 0;

// the instructors' switch: any event, any day (a record of its own, outside the weeks, so the child's week is kept)
export function openAny(kind, ver) {
  if (!allOpen()) return null;
  const v = versionsOf(kind).find((x) => x.id === ver); if (!v) return null;
  const o = read(); const wk = -1 - WEEK_KINDS.findIndex((k) => k.id === kind) * 100 - versionsOf(kind).indexOf(v);
  o.weeks[wk] = { kind, ver, state: null, started: now().getTime(), done: 0, score: 0, free: true };
  write(o);
  return { week: wk, rec: o.weeks[wk] };
}

try {
  window.__weekly = { now, setDate, weekNo, dayOf, openDay, current, begin, record, saveState, finish, guestsOf, allGuests, eventsDone, doneMap, bestOf, scheduleFor, anyOpen, openAny,
    reset: () => write(blank()), addVersions };
} catch (e) { /* node */ }
