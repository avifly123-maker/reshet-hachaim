// מחזיקים את היער – deck building and a new run: the player's cards for a place (a big album is trimmed to a well
// connected deck), borrowed starter cards when the deck is small or a layer has no plants, the events of a run and what
// each needs, newRun() (the run's state K.S) and draw().
// Gives K: biomeInfo, newRun, draw.
// Takes from K: ctx, kids, C.
// Shared state it reads or changes: K.S, K.seenThreads, K.uidN.
import { DECK_MAX, HAND, HAND_MAX, LAYER_NEED, layerRow, linksFor, mid, MIN_DECK, shuffle, toolOk, TOPUP } from './data.js';
import { challengesFor } from './events.js';

export function createDeck(K) {
  const { ctx, kids, C } = K;

  /* ── deck building */
  function usable(b) {
    const owned = ctx.owned() || {};
    const all = ctx.CARDS.filter((c) => owned[c.id] > 0 && (c.biome === b || (c.type === 'tool' && toolOk(c, b))));
    if (all.length <= DECK_MAX) return all;
    // trim: up to 4 tools + the species with the most links to the rest of the collection (a little random each run)
    const L = linksFor(ctx, b);
    const sp = all.filter((c) => c.type === 'species');
    const tools = shuffle(all.filter((c) => c.type === 'tool')).slice(0, 4);
    const sc = new Map(sp.map((c) => [c, sp.reduce((s, d) => s + (d !== c && L.get(c.sp.id, d.sp.id) ? 1 : 0), 0) + Math.random() * 3]));
    const keep = [];
    for (let r = 0; r < 3; r++) keep.push(...sp.filter((c) => !c.sp.animal && layerRow(c.sp) === r).sort((x, y) => sc.get(y) - sc.get(x)).slice(0, LAYER_NEED[r]));
    const rest = sp.filter((c) => !keep.includes(c)).sort((x, y) => sc.get(y) - sc.get(x));
    while (keep.length < DECK_MAX - tools.length && rest.length) keep.push(rest.shift());
    return [...keep, ...tools];
  }
  function starter(b, mine, n, layersOnly = false) {
    const L = linksFor(ctx, b);
    const have = new Set(mine.map((c) => c.id));
    const out = [];
    const tools = mine.filter((c) => c.type === 'tool').length;
    if (!layersOnly) for (const id of (b === 'reef' ? ['tool:buoy', 'tool:nursery', 'tool:rov'] : ['tool:watergen', 'tool:listener', 'tool:seeddrone'])) {
      if (out.length >= Math.max(0, Math.min(n, 2 - tools))) break;
      if (!have.has(id) && ctx.CARD.get(id)) { out.push(ctx.CARD.get(id)); have.add(id); }
    }
    const inDeck = () => [...mine, ...out].filter((c) => c.type === 'species');
    const cand = () => ctx.CARDS.filter((c) => c.biome === b && c.type === 'species' && !have.has(c.id));
    const score = (c) => inDeck().reduce((s, d) => s + (L.get(c.sp.id, d.sp.id) ? 0.6 : 0), 0) + L.deg(c.sp.id) * 0.1 + Math.random() * 1.6;
    const take = (c) => { out.push(c); have.add(c.id); };
    // make sure every forest layer has at least a plant or two
    const need = LAYER_NEED;
    for (let r = 0; r < 3; r++) {
      while (out.length < n && inDeck().filter((c) => !c.sp.animal && layerRow(c.sp) === r).length < need[r]) {
        const list = cand().filter((c) => !c.sp.animal && layerRow(c.sp) === r).sort((x, y) => score(y) - score(x));
        if (!list.length) break; take(list[0]);
      }
    }
    while (out.length < n) {
      const list = cand().sort((x, y) => score(y) - score(x));
      if (!list.length) break; take(list[0]);
    }
    return out;
  }
  function biomeInfo(b) {
    const mine = usable(b);
    // a deck needs plants in every layer, or whole events can't be met: borrow the missing ones
    const deficit = [0, 1, 2].reduce((s, r) => s + Math.max(0, LAYER_NEED[r] - mine.filter((c) => c.type === 'species' && !c.sp.animal && layerRow(c.sp) === r).length), 0);
    const small = mine.length < MIN_DECK;
    const add = small ? Math.max(TOPUP - mine.length, deficit) : deficit;
    return { mine, add, layersOnly: !small };
  }

  /* ── a new run */
  function buildEvents(b) {
    const N = kids ? 5 : 8;
    const nGood = kids ? 1 : 2;
    let ch = shuffle(challengesFor(b)).slice(0, N - nGood);
    const firstI = ch.findIndex((id) => ['drought', 'hunters', 'clouds', 'heat'].includes(id));
    if (firstI > 0) { const [f] = ch.splice(firstI, 1); ch.unshift(f); }
    const goods = shuffle(['rain', 'bloom']).slice(0, nGood);
    const list = ch.slice();
    if (kids) list.splice(2, 0, goods[0]); else { list.splice(2, 0, goods[0]); list.splice(5, 0, goods[1]); }
    const sp = ctx.CARDS.filter((c) => c.biome === b && c.type === 'species');
    const avgW = sp.reduce((s, c) => s + mid(c), 0) / sp.length;
    const avgL = sp.reduce((s, c) => s + c.stats.light, 0) / sp.length;
    return list.map((id, i) => ({ id, i, need: reqOf(id, i, avgW, avgL) }));
  }
  function reqOf(id, i, avgW, avgL) {
    const E = Math.min(9, 2 * (i + 1)) * 0.8; // roughly how many cards are in the forest by then
    const k = kids ? 0.6 : 1;
    switch (id) {
      case 'drought': return Math.max(2, Math.round(E * avgW * 0.7 * k));
      case 'hunters': return Math.max(2, Math.round(E * avgW * 0.7 * k));
      case 'clouds': return Math.max(2, Math.round(E * avgL * 0.7 * k));
      case 'heat': return kids ? 1 : (i < 3 ? 1 : 2);
      case 'flood': return kids ? 1 : (i < 4 ? 1 : 2);
      case 'storm': return Math.max(1, Math.round(E * 0.5 * k));
      case 'logging': return Math.max(2, Math.round(E * 0.95 * k));
      case 'road': return Math.max(1, Math.round(E * 0.55 * k));
      case 'treefall': return kids ? 1 : (i < 3 ? 1 : 2);
      default: return 0;
    }
  }
  function newRun(b) {
    const { mine, add, layersOnly } = biomeInfo(b);
    const refs = mine.map((c) => ({ uid: K.uidN++, id: c.id, borrowed: false }));
    if (add > 0) starter(b, mine, add, layersOnly).forEach((c) => refs.push({ uid: K.uidN++, id: c.id, borrowed: true }));
    // shuffle until the first hand has at least two forest cards (one of them a plant)
    let deck = shuffle(refs);
    for (let t = 0; t < 30; t++) {
      const h = deck.slice(0, HAND).map(C);
      if (h.filter((c) => c.type === 'species').length >= 2 && h.some((c) => c.type === 'species' && !c.sp.animal)) break;
      deck = shuffle(refs);
    }
    K.S = { biome: b, L: linksFor(ctx, b), deck, discard: [], used: [], hand: [], board: Array(9).fill(null), turn: 0,
      events: buildEvents(b), evIdx: 0, results: [], revealed: new Set(), bonus: 0, watch: false, waterBoost: 0, nest: false, insect: false,
      fish: false, phase: 'play', cur: null, lost: null, swaps: 0, keyUsed: new Set(), keyIntro: new Set(), rareDone: new Set(), keySaves: 0, rareBonus: 0, stars: 0, borrowed: refs.filter((r) => r.borrowed).length, owned: mine.length, says: null };
    K.seenThreads = new Set();
    draw(HAND);
  }
  function draw(n) {
    for (let k = 0; k < n && K.S.hand.length < HAND_MAX; k++) {
      if (!K.S.deck.length && K.S.discard.length) K.S.deck = shuffle(K.S.discard.splice(0));
      if (!K.S.deck.length) return;
      K.S.hand.push(K.S.deck.shift());
    }
  }

  return { biomeInfo, newRun, draw };
}
