// Talking with רובו־דע (1.4.3, Avi 4.11): a small conversation anywhere in the game: jokes (a set-up, the child's
// "why?", the punch line), surprising facts, riddles with three answers, "tell me about yourself", and his own
// questions back to the child. The words are src/data/guide/chat.js (voiced, nikud for beginners); this file only
// walks them. It speaks through the guide's bubbles (src/ui/robo-guide.js), so one queue keeps him from talking over
// another bubble or over קוּבִּי, Escape ends the talk, and a bubble closed from outside ends it too ('abort').
//
//   openChat({ place })   place: the zone the child is in ('amazon' … 'savanna'), or 'lab' / 'hub' / 'start'
//                         jokes, facts and riddles of that place come first, then of the open zones and of anywhere
// Nothing is saved: the order turns in memory, from a random start, so a new day brings other jokes first.
import { svcGuide } from '../core/services.js';
import { isOpen, playMode } from '../core/journey.js';
import { CHAT, CHAT_GUIDE } from '../data/guide/chat.js';

const ZONE_PART = { amazon: 'zone:amazon', grove: 'zone:grove', reef: 'zone:reef', desert: 'zone:desert', savanna: 'zone:savanna' };
// 1.3.3 carries the talk without the worlds of 1.4: the desert, the savanna and the robot lab are never open here
const OURS = new Set(['amazon', 'grove', 'reef']);
const open = (z) => { if (!OURS.has(z)) return false; try { return isOpen(ZONE_PART[z]); } catch (e) { return false; } };
const kids = () => playMode() === 'kids';
const w = (x) => (kids() ? x.k : x.f);
const line = (id) => (CHAT_GUIDE['chat:' + id] || [])[0];
const rnd = (n) => Math.floor(Math.random() * n);

// each pool turns in its own order (a cursor per list, from a random start); two of three times the place's own
const cursor = {};
const next = (key, list) => { cursor[key] = cursor[key] == null ? rnd(list.length) : cursor[key] + 1; return list[cursor[key] % list.length]; };
function pick(pool, kind, place) {
  const ok = pool.filter((x) => !x.zone || open(x.zone));
  const here = ok.filter((x) => x.zone === place), rest = ok.filter((x) => x.zone !== place);
  const n = cursor[kind] = (cursor[kind] || 0) + 1;
  if (here.length && (n % 3 !== 0 || !rest.length)) return next(kind + ':here:' + place, here);
  return next(kind + ':rest:' + place, rest);
}

// the questions about him: those not asked yet first (in a turning order), then all again
const asked = new Set();
function meOffer() {
  const rot = (l) => { const k = rnd(l.length || 1); return l.map((_, i) => l[(k + i) % l.length]); };
  const left = CHAT.me.filter((m) => !asked.has(m.id)), done = CHAT.me.filter((m) => asked.has(m.id));
  if (!left.length) asked.clear();
  return [...rot(left), ...rot(done)].slice(0, CHAT.meShown);
}

let running = false;

export function openChat({ place = 'start' } = {}) {
  const g = svcGuide(); if (!g || running) return null;
  running = true;
  const done = talk(g, place).catch(() => { }).finally(() => { running = false; });
  return done;
}

const menu = () => Object.entries(CHAT.topics).map(([id, t]) => ({ id: 't:' + id, label: w(t), kind: id === 'bye' ? 'quiet' : (id === 'joke' ? 'primary' : 'plain') }));
const ENDS = new Set(['abort', 'skip', 'done', 'none', 'seen', 'queued']);

async function talk(g, place) {
  const say = (ids, actions) => g.say(ids.map(line).filter(Boolean), { force: true, ...(actions ? { actions } : {}) })   // the child asked for this talk: the quiet switch does not hold it back;
  let r = await say([CHAT.opens[rnd(CHAT.opens.length)]], menu());
  let askN = rnd(CHAT.asksBack.length), jokeRun = 0, answers = 0, saidLong = false;
  // his reactions to the talk itself: after three jokes in a row, and once in a long talk
  const react = (topic) => {
    jokeRun = topic === 'joke' ? jokeRun + 1 : 0; answers++;
    if (jokeRun === CHAT.react.jokes) return ['react.jokes'];
    if (!saidLong && answers >= CHAT.react.long) { saidLong = true; return ['react.long']; }
    return [];
  };
  for (let guard = 0; guard < 200; guard++) {
    if (!r || ENDS.has(r)) return;
    const t = String(r).replace(/^t:/, '');
    if (t === 'bye') { await say(['bye']); return; }
    if (t === 'joke') {
      const j = pick(CHAT.jokes, 'joke', place);
      r = await say(['j.' + j.id], [{ id: 'punch', label: w(CHAT.asks[j.ask]), kind: 'primary' }]);
      if (r !== 'punch') return;
      r = await say(['j.' + j.id + '.p', ...react('joke')], menu());
    } else if (t === 'fact') {
      const f = pick(CHAT.facts, 'fact', place);
      r = await say(['f.' + f.id, ...react('fact')], menu());
    } else if (t === 'riddle') {
      const q = pick(CHAT.riddles, 'riddle', place);
      const order = [0, 1, 2].sort(() => Math.random() - 0.5);
      r = await say(['r.' + q.id], order.map((i) => ({ id: 'a' + i, label: w(q.opts[i]), kind: 'plain' })));
      if (!/^a\d$/.test(r)) return;
      r = await say(['r.' + q.id + (r === 'a0' ? '.y' : '.n'), ...react('riddle')], menu());
    } else if (t === 'me') {
      const offer = meOffer();
      r = await say(['me'], [...offer.map((m) => ({ id: 'm:' + m.id, label: w(m.q), kind: 'plain' })), { id: 'back', label: w(CHAT.back), kind: 'quiet' }]);
      if (r === 'back') { r = await say([CHAT.opens[rnd(CHAT.opens.length)]], menu()); continue; }
      const m = CHAT.me.find((x) => 'm:' + x.id === r); if (!m) return;
      asked.add(m.id);
      const lab = open('robolab');   // קוּבִּי is named only to a player who has met him
      const ids = m.lines ? (lab ? m.lines : m.before || m.lines) : [m.kubi && lab ? m.kubi : m.id];
      r = await say([...ids.map((x) => 'me.' + x), ...react('me')], menu());
    } else if (t === 'ask') {
      const a = CHAT.asksBack[askN++ % CHAT.asksBack.length];
      const opts = a.opts.filter((o) => !a.zones || open(o.id));
      r = await say(['ask.' + a.id], opts.map((o) => ({ id: 'o:' + o.id, label: w(o.w), kind: 'plain' })));
      const o = opts.find((x) => 'o:' + x.id === r); if (!o) return;
      r = await say(['ask.' + a.id + '.' + o.id, ...react('ask')], menu());
    } else return;
  }
}
