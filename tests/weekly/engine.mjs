// אירוע השבוע (1.4.4 set 1): the clock, the turns of the kinds, a missed version coming back, finishing, badges, guests.
// node tests/weekly/engine.mjs   (part of tools/check-all.sh)
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), key: (i) => [...mem.keys()][i] || null, get length() { return mem.size; } };
globalThis.window = globalThis; globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } }; globalThis.dispatchEvent = () => true; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
const WK = await import('../../src/core/weekly.js');
const { WEEK_KINDS, addVersions, versionsOf } = await import('../../src/data/weekly.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

// test versions (the real ones come with sets 5 to 7)
for (const k of WEEK_KINDS) if (!versionsOf(k.id).length) addVersions(k.id, [1, 2, 3].map((i) => ({ id: 't' + i, title: k.id + i, guest: { zone: 'grove', id: 'owl' + k.id + i, name: 'ינשוף ' + i } })));

// the clock: Sunday 1.11.2026 to Saturday 7.11.2026 are one week; Sunday to Thursday open
const sun = new Date(2026, 10, 1, 10), thu = new Date(2026, 10, 5, 20), fri = new Date(2026, 10, 6, 9), nextSun = new Date(2026, 10, 8, 8);
ok(sun.getDay() === 0 && WK.weekNo(sun) === WK.weekNo(thu) && WK.weekNo(thu) === WK.weekNo(fri), 'Sunday to Saturday is one week');
ok(WK.weekNo(nextSun) === WK.weekNo(sun) + 1, 'the next Sunday is the next week');
ok(WK.openDay(sun) && WK.openDay(thu) && !WK.openDay(fri), 'open Sunday to Thursday, closed on Friday');

// the kinds take turns over four weeks
const w0 = WK.weekNo(sun);
const kinds = [0, 1, 2, 3].map((i) => WK.scheduleFor(w0 + i, {}).kind);
ok(new Set(kinds).size === 4, 'four weeks, four different kinds: ' + kinds.join(','));
ok(WK.scheduleFor(w0 + 4, {}).kind === kinds[0], 'the fifth week starts the turn again');

// a missed version comes back: the version of a week is the first one this child has not done
const s0 = WK.scheduleFor(w0, {});
const s4missed = WK.scheduleFor(w0 + 4, {});
const done1 = { [s0.kind + ':' + s0.ver]: 1 };
const s4done = WK.scheduleFor(w0 + 4, done1);
ok(s4done.ver !== s0.ver || s4missed.ver !== s0.ver, 'a finished version is not given again while others wait');
const allDone = Object.fromEntries(versionsOf(s0.kind).map((v) => [s0.kind + ':' + v.id, 1]));
ok(WK.scheduleFor(w0, allDone).again === true, 'when all are done: the cycle\'s own version, for a record');

// a week: begin on Sunday, save state on Tuesday, finish on Thursday
WK.setDate(sun);
let c = WK.current();
ok(c.open && c.daysLeft === 5 && c.ready && !c.rec, 'Sunday: open, five days, nothing begun');
const rec = WK.begin(); ok(!!rec && rec.kind === c.kind, 'begin makes the week\'s record');
WK.setDate(new Date(2026, 10, 3, 12)); WK.saveState({ jar: [1, 2] });
ok(JSON.stringify(WK.record().state) === '{"jar":[1,2]}', 'the event\'s state is kept');
WK.setDate(thu);
c = WK.current(); ok(c.daysLeft === 1 && c.kind === rec.kind, 'Thursday: the last day, the same event');
const ver = versionsOf(c.kind).find((v) => v.id === c.ver);
const r = WK.finish({ win: true, score: 7, guest: ver.guest });
ok(r.first && r.badges.includes('weekly:first') && r.badges.includes('weekly:' + c.kind), 'the first win: badges ' + r.badges.join(','));
ok(r.guest && WK.guestsOf('grove').length === 1, 'a guest comes to live on the island');
const r2 = WK.finish({ win: true, score: 5, guest: ver.guest });
ok(!r2.first && !r2.badges.length && WK.guestsOf('grove').length === 1, 'a second finish of the same version gives nothing again');
ok(WK.bestOf(c.kind) === 7 && WK.eventsDone() === 1, 'the record and the count');
WK.setDate(fri); c = WK.current(); ok(!c.open && c.done, 'Friday: closed, and the week is marked done');

// the next weeks: the other kinds, and all four give the badge
let all4 = false;
for (let i = 1; i <= 3; i++) {
  WK.setDate(new Date(2026, 10, 1 + i * 7, 10));
  const cc = WK.current(); WK.begin(); const vv = versionsOf(cc.kind).find((v) => v.id === cc.ver);
  const rr = WK.finish({ win: true, score: 3, guest: vv.guest });
  if (rr.badges.includes('weekly:all4')) all4 = true;
}
ok(all4, 'four kinds won: the "all four" badge');
ok(WK.allGuests().length === 4, 'four guests');
// a lost week does not close anything: a week without a win comes back later with the same version
WK.setDate(new Date(2026, 10, 29, 10)); const cA = WK.current(); WK.begin();
WK.setDate(new Date(2026, 11, 27, 10)); const cB = WK.current();
ok(cA.kind === cB.kind && cA.ver === cB.ver, 'a version not won comes back the next time its kind comes');
WK.setDate(null);
console.log(fails ? `weekly engine: ${fails} FAILED` : 'weekly engine OK');
process.exit(fails ? 1 : 0);
