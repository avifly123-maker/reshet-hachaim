// מחזיקים את הסביבה – the board's rules: which row a card goes to and which slots are legal, the gold threads between
// cards and the totals (light, water / shelter, threads, vitality), the rarity powers (keystone, rare bonus), whether the
// forest is ready for an event (check) and which card wilts (weakest).
// Gives K: rowOfCard, slotRow, healthy, rowSlots, legal, totals, isKey, keyCharged, rareReady, rareGain, keystone,
//   evName, turnsToEvent, check, weakest.
// Takes from K: C, canopyCard, Y.
// Shared state it reads or changes: K.S.
import { BIRDS, FISH, INSECTS, layerRow, mid } from './data.js';
import { EV } from './events.js';

export function createBoard(K) {
  const { C, canopyCard, Y } = K;

  /* ── board helpers */
  const rowOfCard = (c) => (c && c.type === 'species' ? (layerRow(c.sp) ?? 2) : -1);
  const slotRow = (k) => Math.floor(k / 3);
  const healthy = (k) => K.S.board[k] && !K.S.board[k].wilted;
  const free = (k) => !K.S.board[k] || K.S.board[k].wilted;
  const rowSlots = (r) => [r * 3, r * 3 + 1, r * 3 + 2];
  function legal(ref) {
    const c = C(ref); if (!c || c.type !== 'species') return { slots: [], swap: false };
    const r = rowOfCard(c);
    let f = rowSlots(r).filter(free);
    if (f.length) return { slots: f, swap: false };
    if (c.sp.animal) { f = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(free); if (f.length) return { slots: f, swap: false }; }
    return { slots: rowSlots(r), swap: true };
  }
  function threadsOf(board) {
    const out = [];
    for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) {
      const a = board[i], b = board[j]; if (!a || !b || a.wilted || b.wilted) continue;
      const ca = C(a.ref), cb = C(b.ref);
      const e = K.S.L.get(ca.sp.id, cb.sp.id); if (!e) continue;
      let w = 1;
      if (K.S.nest && (BIRDS.has(ca.sp.id) || BIRDS.has(cb.sp.id))) w++;
      if (K.S.insect && (INSECTS.has(ca.sp.id) || INSECTS.has(cb.sp.id))) w++;
      if (K.S.fish && (FISH.has(ca.sp.id) || FISH.has(cb.sp.id))) w++;
      out.push({ i, j, e, w, key: a.ref.uid + '-' + b.ref.uid });
    }
    return out;
  }
  function totals(board = K.S.board) {
    let light = 0, water = 0;
    board.forEach((b) => { if (b && !b.wilted) { const c = C(b.ref); light += c.stats.light; water += mid(c); } });
    const th = threadsOf(board);
    const tw = th.reduce((s, t) => s + t.w, 0);
    return { light, water, threads: th.length, tw, life: Math.max(0, tw + K.S.bonus), th };
  }
  // rarity powers
  const isKey = (ref) => C(ref).rarity === 'epic';
  const keyCharged = (ref) => isKey(ref) && !K.S.keyUsed.has(ref.uid);
  const rareReady = (ref) => C(ref).rarity === 'rare' && !K.S.rareDone.has(ref.uid);
  // a rare card that ties a gold thread as it is placed gets +1 (each rare card once per run)
  const rareGain = (ref, newThreads) => (newThreads.length && rareReady(ref) ? 1 : 0);
  // the charged keystone that steps in when the forest is not ready: a healthy epic card, the best connected first
  function keystone() {
    const th = totals().th; let best = -1, bs = -1;
    for (let k = 0; k < 9; k++) {
      if (!healthy(k) || !keyCharged(K.S.board[k].ref)) continue;
      const n = th.filter((t) => t.i === k || t.j === k).length;
      if (n > bs) { bs = n; best = k; }
    }
    return best;
  }
  const plantsIn = (r) => rowSlots(r).filter((k) => healthy(k) && !C(K.S.board[k].ref).sp.animal).length;
  const cardsIn = (r) => rowSlots(r).filter(healthy).length;
  const canopyIn = () => rowSlots(0).filter((k) => healthy(k) && canopyCard(C(K.S.board[k].ref))).length;
  const evName = (ev) => EV[ev.id].name[K.S.biome];
  const turnsToEvent = () => 2 - (K.S.turn % 2);

  function check(ev) {
    const T = totals(); const n = ev.need;
    switch (EV[ev.id].kind) {
      case 'water': { const have = T.water + K.S.waterBoost; return { ok: have >= n, have: `מים: ${have}` }; }
      case 'light': return { ok: T.light >= n, have: `אור: ${T.light}` };
      case 'shelter': return { ok: T.water >= n, have: `מחסה: ${T.water}` };
      case 'canopy': { const h = canopyIn(); return { ok: h >= n, have: `${Y('צמחים בחופה', 'אלמוגים במים הרדודים')}: ${h}` }; }
      case 'floor': { const h = plantsIn(2); return { ok: h >= n, have: `${Y('צמחים בקרקע', 'בקרקעית')}: ${h}` }; }
      case 'mid': { const h = cardsIn(1); return { ok: h >= n, have: `${Y('קלפים בביניים', 'קלפים במדרון')}: ${h}` }; }
      case 'threads': return { ok: T.threads >= n, have: `חוטי זהב: ${T.threads}` };
      case 'watch': return K.S.watch ? { ok: true, have: 'כלי שמירה פעיל', guard: true } : { ok: T.life >= n, have: `חִיּוּת: ${T.life}` };
      case 'watchThreads': return K.S.watch ? { ok: true, have: 'כלי שמירה פעיל', guard: true } : { ok: T.threads >= n, have: `חוטי זהב: ${T.threads}` };
      default: return { ok: true, have: '' };
    }
  }
  function weakest(rows) {
    let best = -1, bs = Infinity;
    for (let k = 0; k < 9; k++) {
      if (!healthy(k) || (rows && !rows.includes(slotRow(k)))) continue;
      const c = C(K.S.board[k].ref); const s = c.stats.light + mid(c) + c.stats.links + Math.random() * 0.1;
      if (s < bs) { bs = s; best = k; }
    }
    return best;
  }

  return { rowOfCard, slotRow, healthy, rowSlots, legal, totals, isKey, keyCharged, rareReady, rareGain, keystone,
    evName, turnsToEvent, check, weakest };
}
