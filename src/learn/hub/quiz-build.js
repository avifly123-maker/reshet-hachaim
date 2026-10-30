// מרכז הלמידה – building a quiz round: the question generators (from the species data), the hand-written bank
// (data/quiz-bank.js), the torah edition's "מן המקורות" round, and the "asked lately" order (S.seen).
// Exports: SEEN_MAX, seenMap, setSeen (the quiz sets the player's list before a round), buildTorahRound,
// buildRound(level, biomeSel). No DOM.
// Needs: the cards (cards.js), helpers and icons (base.js), the zone data.
import { CARD_ART } from '../../data/card-art.js';
import { DIET_PARTS, activeNameFor, defName, gw } from '../../data/common.js';
import { QBANK } from '../../data/quiz-bank.js';
import { TQUIZ_ALL } from '../../data/torah-quiz.js';
import { TOOL_DEFS, TOOL_ICONS } from '../../game/tool-defs.js';
import { BIOMES, BIOME_IN, EASY_PARTS, EASY_PART_LABEL, IC, PART_ICON, ROUND, firstSentence, leaksName, maskName, pick, sample, shuffle, stemOf, uniq } from './base.js';
import { CARD, SP, SPK, TOOL_SHORT, animalsIn, spOf } from './cards.js';
import { ZONE_IDS } from '../../data/zones.js';
// the answer words and icons of "where does it live?" for each zone (a zone without an entry here fails validate-zones' quiz check)
const WHERE_OPT = { amazon: ['באמזונס', () => IC.rain], grove: ['בחורש', () => IC.tree], reef: ['בשונית', () => IC.drop], desert: ['במדבר', () => IC.sun] };

/* ───────────────────────────────────────────── variety across visits
   Each player keeps a list of the questions asked lately (S.seen in the hub's own store, oldest first; old saves have
   none). A round prefers questions that are not on it; when a bank is used up, it starts again from the oldest ones. */
export const SEEN_MAX = 700;
let SEEN = new Map();   // question id → its place in S.seen (bigger = asked more recently); set when a round is built
export const setSeen = (m) => { SEEN = m; };   // the quiz (quiz.js startQuiz) sets it from the player's S.seen
const seenRank = (id) => (SEEN.has(id) ? SEEN.get(id) : -1);
export function seenMap(list) { const m = new Map(); (Array.isArray(list) ? list : []).forEach((id, i) => { if (typeof id === 'string') m.set(id, i); }); return m; }
// n items of list: the unseen ones first (in random order), then the ones asked longest ago.
// `forget` lists the whole bank when it ran out, so the next rounds go through it again.
function freshest(list, n, idOf) {
  const un = shuffle(list.filter((x) => !SEEN.has(idOf(x))));
  if (un.length >= n) return { pick: un.slice(0, n), forget: null };
  const old = list.filter((x) => SEEN.has(idOf(x))).sort((a, b) => seenRank(idOf(a)) - seenRank(idOf(b)));
  const k = n - un.length;
  return { pick: [...un, ...shuffle(old.slice(0, Math.max(k, Math.ceil(old.length / 3)))).slice(0, k)], forget: list.map(idOf) };
}
// "all places": the bank's picks are spread over the three places (each place keeps its own unseen-first order and
// starts again on its own when it runs out); the few 'all' questions get a slot now and then.
function freshestSpread(list, n, idOf) {
  const by = {};
  for (const x of list) (by[x.z] || (by[x.z] = [])).push(x);
  const zones = shuffle(ZONE_IDS.filter((z) => by[z] && by[z].length));
  const quota = {};
  if (by.all && Math.random() < 0.25 && n > 0) quota.all = 1;
  for (let k = 0, left = n - (quota.all || 0); left > 0 && zones.length; k++, left--) { const z = zones[k % zones.length]; quota[z] = (quota[z] || 0) + 1; }
  const pick = [], forget = [];
  let short = 0;
  for (const z of Object.keys(quota)) {
    const want = Math.min(quota[z], by[z].length);
    short += quota[z] - want;
    const r = freshest(by[z], want, idOf);
    pick.push(...r.pick); if (r.forget) forget.push(...r.forget);
  }
  if (short > 0) { const used = new Set(pick); const rest = freshest(list.filter((x) => !used.has(x)), short, idOf); pick.push(...rest.pick); }
  return { pick, forget: forget.length ? forget : null };
}
function hashId(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

/* ───────────────────────────────────────────── torah edition: the "מן המקורות" corner of the quiz */
const tqId = (t) => t.id || 'tq-' + hashId(t.q);
// a round: 6 easier questions first, then 4 harder ones (lvl 2)
export function buildTorahRound() {
  const easy = TQUIZ_ALL.filter((t) => (t.lvl || 1) === 1), hard = TQUIZ_ALL.filter((t) => (t.lvl || 1) !== 1);
  const nh = Math.min(hard.length, 4), ne = Math.min(easy.length, ROUND - nh);
  const a = freshest(easy, ne, tqId), b = freshest(hard, nh, tqId);
  const qs = [...a.pick, ...b.pick].map((t) => {
    const sp = t.art ? SPK.get(t.art) : null;
    return { tag: 'מן המקורות', q: t.q, art: sp || null, options: shuffle(t.o.map((label, i) => opt(label, i === 0))), fact: t.e, src: t.src, ref: t.ref, qid: tqId(t) };
  });
  qs.forget = [...(a.forget || []), ...(b.forget || [])];
  return qs;
}

/* ───────────────────────────────────────────── the hand-written bank (src/data/quiz-bank.js) */
const BANK_TAG = { amazon: 'יער הגשם', grove: 'החורש', reef: 'השונית', desert: 'המדבר', all: 'הידעת?' };
function bankQ(b) {
  let art = null;
  if (b.art && b.art.startsWith('tool:')) { const c = CARD.get(b.art); if (c) art = { id: c.id.slice(5), img: c.img, color: c.color, name: c.name, tool: true }; }
  else if (b.art) art = SPK.get(b.art) || null;
  const tf = typeof b.tf === 'boolean';
  const options = tf ? [opt('נכון', b.tf, { icon: IC.check, tone: 'yes' }), opt('לא נכון', !b.tf, { icon: IC.cross, tone: 'no' })]
    : b.o.map((label, i) => opt(label, i === 0));
  return { tag: b.tag || BANK_TAG[b.z] || 'הידעת?', q: b.q, art, hideName: !!b.hideName, options, fact: b.e, keepOrder: tf, qid: 'qb-' + b.id };
}

/* ───────────────────────────────────────────── quiz generators */
function opt(label, ok, extra = {}) { return { label, ok: !!ok, ...extra }; }
// GKEY: the generator now running; GPICK: the id of the question it built (generator + species), for S.seen
let GKEY = '', GPICK = '';
function freshFrom(list, used) {
  const c = list.filter((x) => !used.has(x.key || x.id)); if (!c.length) return null;
  // prefer a species this player was not asked about lately with this kind of question
  const id = (x) => GKEY + ':' + (x.key || x.id);
  const un = c.filter((x) => !SEEN.has(id(x)));
  let s;
  if (un.length) s = pick(un);
  else { const o = c.slice().sort((a, b) => seenRank(id(a)) - seenRank(id(b))); s = pick(o.slice(0, Math.max(1, Math.ceil(o.length / 3)))); }
  GPICK = id(s); return s;
}
// quiz pictures: the painted card art when there is one, else the model thumbnail
const nameOpt = (s, ok, withImg) => opt(s.name, ok, withImg ? (CARD_ART[s.id] ? { img: CARD_ART[s.id], paint: true } : { img: s.img }) : {});
const toolImg = (id) => (CARD_ART[id] ? { img: CARD_ART[id], paint: true } : { img: TOOL_ICONS[id] });

/* what an animal really eats – the modelled diet plus `alsoEats` from its card (data), so a real food is never a "wrong" answer */
const PLANT_PARTS = ['leaves', 'fruit', 'nectar', 'seeds', 'roots'];
function partsEaten(s) {
  const p = new Set([...(s.diet || []).map((d) => d.part), ...(s.alsoEats || []), ...(s.quizDiet || [])]);
  if (p.has('insects') || p.has('animals')) { p.add('insects'); p.add('animals'); } // insects are animals too – never contrast them
  return p;
}
const eatAnswers = (s) => uniq(s.quizDiet || (s.diet || []).map((d) => d.part)).filter((p) => EASY_PART_LABEL[p] && (s.quizDiet || EASY_PARTS.includes(p)));
const eatDistractors = (s) => { const p = partsEaten(s); return EASY_PARTS.filter((x) => !p.has(x)); };
// prey group of every animal (for the "menu" question)
const PREY_GROUP = {
  leafcutter: 'insect', orchidbee: 'insect', morpho: 'insect', honeybee: 'insect', butterfly: 'insect', harvesterant: 'insect', firefly: 'insect',
  hummingbird: 'bird', toucan: 'bird', macaw: 'bird', harpy: 'bird', jay: 'bird', blackbird: 'bird', owl: 'bird', hoopoe: 'bird', chukar: 'bird',
  dartfrog: 'frog', chameleon: 'reptile', agama: 'reptile', tortoise: 'reptile',
};
// which groups each eater may eat (wider than the game diet, from the cards and real life). 'plant' = any plant part.
const EATS_GROUPS = {
  orchidbee: ['plant'], hummingbird: ['plant', 'insect'], toucan: ['plant', 'insect', 'bird', 'reptile', 'frog'], macaw: ['plant'],
  sloth: ['plant', 'insect'], agouti: ['plant', 'insect'], howler: ['plant'], jaguar: ['mammal', 'reptile', 'bird', 'frog'],
  harpy: ['mammal', 'bird', 'reptile'], tapir: ['plant'], fruitbat: ['plant', 'insect'], anteater: ['insect'], kinkajou: ['plant', 'insect'],
  honeybee: ['plant'], butterfly: ['plant'], harvesterant: ['plant', 'insect'], jay: ['plant', 'insect', 'bird', 'mammal', 'reptile'],
  blackbird: ['plant', 'insect', 'reptile'], chameleon: ['plant', 'insect', 'reptile'], agama: ['plant', 'insect', 'reptile'],
  spinymouse: ['plant', 'insect'], porcupine: ['plant'], hedgehog: ['plant', 'insect', 'reptile', 'bird', 'frog', 'mammal'],
  hyrax: ['plant'], gazelle: ['plant'], fox: ['plant', 'insect', 'mammal', 'bird', 'reptile'], owl: ['mammal', 'bird', 'insect', 'reptile'],
  hoopoe: ['insect', 'reptile'], tortoise: ['plant'], chukar: ['plant', 'insect'],
};
const CARD_WORD = { howler: /קופים|קוף /, fruitbat: /עטלף|עטלפים/, firefly: /חיפושי/, leafcutter: /נמל/, harvesterant: /נמל/, honeybee: /דבור/, orchidbee: /דבור/,
  butterfly: /פרפר/, morpho: /פרפר/ };
const HUNTERS = new Set(['jaguar', 'harpy', 'fox', 'owl']);
const BIG = new Set(['jaguar', 'tapir', 'capybara', 'harpy', 'howler', 'sloth', 'anteater', 'coati', 'agouti', 'kinkajou',
  'gazelle', 'porcupine', 'fox', 'hyrax', 'owl', 'tortoise']);
const groupOf = (o) => (o.animal ? PREY_GROUP[o.id] || 'mammal' : 'plant');
function notFoodOf(s, o) {
  if ((s.diet || []).some((d) => d.id === o.id)) return false;
  const g = EATS_GROUPS[s.id]; if (!g) return false; // unknown eater – offer nothing as wrong
  if (!g.includes(groupOf(o))) return true;
  return o.animal && !HUNTERS.has(s.id) && BIG.has(o.id) && !BIG.has(s.id); // a small animal cannot eat a big one
}

const GEN = {
  // ── beginners
  who(pool, used) {
    const s = freshFrom(pool.filter((x) => x.img), used); if (!s) return null;
    const w0 = s.name.split(' ')[0];
    const others = sample(pool.filter((o) => o !== s && o.animal === s.animal && o.name.split(' ')[0] !== w0), 2);
    if (others.length < 2) return null; used.add(s.key);
    return { tag: '', q: 'מי זה?', art: s, hideName: true, options: [nameOpt(s, true), ...others.map((o) => nameOpt(o, false))], fact: firstSentence(s.fact) };
  },
  eat(pool, used) {
    const s = freshFrom(pool.filter((x) => x.animal && eatAnswers(x).length && eatDistractors(x).length >= 2), used); if (!s) return null;
    const ok = pick(eatAnswers(s));
    const wrong = sample(eatDistractors(s), 2);
    used.add(s.key);
    return { tag: s.name, q: gw(s.id, 'מה הוא אוכל?', 'מה היא אוכלת?', 'מה הם אוכלים?', 'מה הן אוכלות?'), art: s, options: [ok, ...wrong].map((p, i) => opt(EASY_PART_LABEL[p], i === 0, { icon: PART_ICON[p] })),
      fact: s.quizDiet ? firstSentence(s.fact) : dietSentence(s) };
  },
  when(pool, used) {
    const s = freshFrom(pool.filter((x) => x.animal && (x.active === 'day' || x.active === 'night')), used); if (!s) return null;
    used.add(s.key);
    return { tag: s.name, q: gw(s.id, 'מתי הוא פעיל?', 'מתי היא פעילה?', 'מתי הם פעילים?', 'מתי הן פעילות?'), art: s, options: [opt('ביום', s.active === 'day', { icon: IC.sun, tone: 'day' }), opt('בלילה', s.active === 'night', { icon: IC.moon, tone: 'night' })],
      fact: `${s.name} – ${activeNameFor(s.id, s.active)}.`, keepOrder: true };
  },
  where(pool, used) {
    const s = freshFrom(pool.filter((x) => x.img), used); if (!s) return null;
    used.add(s.key);
    return { tag: s.name, q: s.animal ? gw(s.id, 'איפה הוא גר?', 'איפה היא גרה?', 'איפה הם גרים?', 'איפה הן גרות?') : gw(s.id, 'איפה הוא גדל?', 'איפה היא גדלה?', 'איפה הם גדלים?', 'איפה הן גדלות?'), art: s,
      // 1.4: every zone of the list can be an answer: the right one and two others (three options, as before)
      options: [s.biome, ...shuffle(ZONE_IDS.filter((z) => z !== s.biome)).slice(0, 2)].map((z) => opt(WHERE_OPT[z][0], z === s.biome, { icon: WHERE_OPT[z][1](), tone: z })),
      fact: `את ${defName(s.id, s.name)} פוגשים ${BIOME_IN[s.biome]}.` };
  },
  // ── advanced
  rel(pool, used) {
    const pairs = [];
    for (const s of pool) for (const r of s.relations || []) {
      if (r.type !== 'pollinates' && r.type !== 'disperses') continue;
      const t = spOf(s.biome, r.target); if (t && !used.has(t.key)) pairs.push({ s, r, t });
    }
    if (!pairs.length) return null;
    const freshPairs = pairs.filter((p) => !SEEN.has('rel:' + p.t.key + ':' + p.s.key));
    const { s, r, t } = pick(freshPairs.length ? freshPairs : pairs);
    GPICK = 'rel:' + t.key + ':' + s.key;
    const doers = new Set(SP.filter((o) => o.biome === s.biome && (o.relations || []).some((x) => x.type === r.type && x.target === t.id)).map((o) => o.key));
    // never offer as "wrong" an animal that may really do it: flower visitors for pollination, fruit/seed eaters for seed spreading
    const maybe = (o) => r.type === 'pollinates'
      ? partsEaten(o).has('nectar')
      : (o.diet || []).some((d) => d.id === t.id) || partsEaten(o).has('fruit') || partsEaten(o).has('seeds');
    // …or a group the plant's own card names as helpers ("ציפורים", "קופים", "חיפושיות" …)
    const tText = (t.fact || '') + ' ' + (t.more || '');
    const named = (o) => { const w = CARD_WORD[o.id] || (groupOf(o) === 'bird' ? /ציפור/ : null); return !!w && w.test(tText); };
    const wrong = sample(animalsIn(s.biome).filter((o) => !doers.has(o.key) && !maybe(o) && !named(o)), 2); if (wrong.length < 2) return null;
    used.add(t.key); used.add(s.key);
    return { tag: 'קשרים ברשת', q: r.type === 'pollinates' ? `מי מאביק את ${defName(t.id, t.name)}?` : `מי מפיץ את הזרעים של ${defName(t.id, t.name)}?`, art: t,
      options: [nameOpt(s, true, true), ...wrong.map((o) => nameOpt(o, false, true))], fact: r.text };
  },
  menu(pool, used) {
    const s = freshFrom(pool.filter((x) => !x.quizDiet && (x.diet || []).some((d) => spOf(x.biome, d.id))), used); if (!s) return null;
    const ok = spOf(s.biome, pick(s.diet.filter((d) => spOf(s.biome, d.id))).id);
    // wrong answers only from a group this animal surely does not eat (plants for a pure hunter, big animals for a small eater ...)
    const safe = SP.filter((o) => o.biome === s.biome && o !== s && notFoodOf(s, o));
    const same = safe.filter((o) => o.animal === ok.animal);
    const wrong = same.length >= 2 ? sample(same, 2) : sample(safe, 2);
    if (wrong.length < 2) return null; used.add(s.key);
    return { tag: 'שרשרת המזון', q: `מה מופיע בתפריט של ${defName(s.id, s.name)}?`, art: s, options: [nameOpt(ok, true, true), ...wrong.map((o) => nameOpt(o, false, true))], fact: dietSentence(s) };
  },
  layer(pool, used) {
    // only what stays in one place (plants, corals, sponges): animals move between layers, so a "wrong" layer may be right
    const s = freshFrom(pool.filter((x) => !x.animal && x.layer && BIOMES[x.biome].layers.some((l) => l.id === x.layer)), used); if (!s) return null;
    const layers = BIOMES[s.biome].layers; const L = layers.find((l) => l.id === s.layer);
    // a plant that sits on a tree (bromeliad on the kapok) or an animal that lives in one can be met there too – never a "wrong" layer
    const near = new Set((s.relations || []).filter((r) => r.type === 'climbs' || r.type === 'home')
      .map((r) => (spOf(s.biome, r.target) || {}).layer).filter(Boolean));
    // reef life that grows in two zones (as "מחזיקים את היער" places it): brain coral and anemones also on the slope, sponges and algae also on the sand
    const ALSO = { 'reef:brain': 'slope', 'reef:seaanemone': 'slope', 'reef:sponge': 'sand', 'reef:algae': 'sand' };
    if (ALSO[s.key]) near.add(ALSO[s.key]);
    const wrong = sample(layers.filter((l) => l !== L && !near.has(l.id)), 2); if (!wrong.length) return null;
    used.add(s.key);
    const reef = s.biome === 'reef';
    return { tag: reef ? 'אזורי השונית' : 'קומות היער', q: reef ? `באיזה אזור בשונית אפשר למצוא את ${defName(s.id, s.name)}?` : `באיזו קומה ביער אפשר למצוא את ${defName(s.id, s.name)}?`,
      art: s, options: [opt(L.name, true), ...wrong.map((l) => opt(l.name, false))], fact: L.desc };
  },
  fact(pool, used) {
    const s = freshFrom(pool.filter((x) => x.fact && x.img), used); if (!s) return null;
    const masked = maskName(firstSentence(s.fact), s.name, s.id);
    if (leaksName(masked, s.name, s.id)) return null; // the name still shows (another form of it) – skip
    // no look-alike names as wrong answers ("פטריות" / "פטרייה זוהרת", "פרפר" / "פרפר מורפו") – the sentence may fit both
    const st0 = stemOf(s.name.split(' ')[0]);
    const wrong = sample(pool.filter((o) => o !== s && o.animal === s.animal && o.img && stemOf(o.name.split(' ')[0]) !== st0), 2); if (wrong.length < 2) return null;
    used.add(s.key);
    return { tag: 'הידעת?', q: 'על מי מדובר?', sub: masked, art: null, options: [nameOpt(s, true, true), ...wrong.map((o) => nameOpt(o, false, true))], fact: s.fact };
  },
  tf(pool, used) {
    const s = freshFrom(pool.filter((x) => x.img), used); if (!s) return null;
    used.add(s.key);
    let stmt, truth, fact;
    if (s.animal && (s.active === 'day' || s.active === 'night') && Math.random() < 0.6) {
      const says = Math.random() < 0.5 ? 'day' : 'night';
      stmt = `את ${defName(s.id, s.name)} פוגשים בעיקר ${says === 'day' ? 'ביום' : 'בלילה'}.`; truth = says === s.active; fact = `${s.name} – ${activeNameFor(s.id, s.active)}.`;
    } else {
      const says = ZONE_IDS[(Math.random() * ZONE_IDS.length) | 0];
      stmt = `את ${defName(s.id, s.name)} פוגשים ${BIOME_IN[says]}.`; truth = says === s.biome; fact = `את ${defName(s.id, s.name)} פוגשים ${BIOME_IN[s.biome]}. ${firstSentence(s.fact)}`;
    }
    return { tag: 'נכון או לא נכון?', q: stmt, art: s, options: [opt('נכון', truth, { icon: IC.check, tone: 'yes' }), opt('לא נכון', !truth, { icon: IC.cross, tone: 'no' })], fact, keepOrder: true };
  },
  own(pool, used) {
    const s = freshFrom(pool.filter((x) => x.question && Array.isArray(x.question.options) && x.question.options[x.question.answer] != null), used); if (!s) return null;
    used.add(s.key);
    return { tag: 'שאלה למחשבה', q: s.question.q, art: s, options: s.question.options.map((o, i) => opt(o, i === s.question.answer)), fact: s.fact };
  },
  tool(pool, used) {
    const t = freshFrom(TOOL_DEFS.map((d) => ({ ...d, key: 'tool:' + d.id })), used); if (!t) return null;
    used.add(t.key);
    const others = sample(TOOL_DEFS.filter((d) => d.id !== t.id), 2);
    const art = { id: t.id, img: TOOL_ICONS[t.id], color: t.color, name: t.name, tool: true };
    if (Math.random() < 0.5) {
      return { tag: 'טכנולוגיה ששומרת על הטבע', q: `מה עושה ${t.name}?`, art, options: [opt(TOOL_SHORT[t.id], true), ...others.map((d) => opt(TOOL_SHORT[d.id], false))], fact: t.fact };
    }
    const masked = maskName(firstSentence(t.fact), t.name, t.id);
    if (leaksName(masked, t.name, t.id)) return { tag: 'טכנולוגיה ששומרת על הטבע', q: `מה עושה ${t.name}?`, art, options: [opt(TOOL_SHORT[t.id], true), ...others.map((d) => opt(TOOL_SHORT[d.id], false))], fact: t.fact };
    return { tag: 'טכנולוגיה ששומרת על הטבע', q: 'איזה כלי עושה את זה?', sub: masked, art: null,
      options: [opt(t.name, true, toolImg(t.id)), ...others.map((d) => opt(d.name, false, toolImg(d.id)))], fact: t.fact };
  },
};
function dietSentence(s) {
  const names = (s.diet || []).map((d) => { const t = spOf(s.biome, d.id); return t ? t.name : null; }).filter(Boolean);
  if (names.length) return `האוכל של ${defName(s.id, s.name)}: ${names.join(', ')}.`;
  return `האוכל של ${defName(s.id, s.name)}: ${uniq((s.diet || []).map((d) => DIET_PARTS[d.part])).join(', ')}.`;
}
export function buildRound(level, biomeSel) {
  const pool = SP.filter((s) => biomeSel === 'both' || s.biome === biomeSel);
  // about half a round comes from the generators, the rest from the hand-written bank (4 for beginners, 5 for advanced)
  const bank = QBANK.filter((b) => b.lvl === level && (biomeSel === 'both' || b.z === biomeSel || b.z === 'all'));
  const plan = level === 'easy'
    ? (biomeSel === 'both' ? ['who', 'who', 'eat', 'when', 'where', 'where'] : ['who', 'who', 'who', 'eat', 'eat', 'when'])
    : shuffle(['rel', 'menu', 'layer', 'fact', 'tf', 'own', 'own', 'tool']).slice(0, 5);
  const fallback = level === 'easy' ? ['who', 'eat', 'when'] : ['own', 'fact', 'layer', 'tf'];
  const used = new Set(); const out = [];
  for (const k of plan) {
    let q = null;
    GKEY = k; for (let t = 0; t < 12 && !q; t++) { GPICK = ''; q = GEN[k](pool, used); }
    for (const f of fallback) { if (q) break; GKEY = f; for (let t = 0; t < 8 && !q; t++) { GPICK = ''; q = GEN[f](pool, used); } }
    if (q) { q.qid = q.qid || GPICK; out.push(q); }
  }
  // fill the round from the bank (more of it when a generator found nothing, e.g. in a small pool)
  const nb = Math.min(bank.length, Math.max(0, ROUND - out.length));
  const fromBank = biomeSel === 'both' ? freshestSpread(bank, nb, (b) => 'qb-' + b.id) : freshest(bank, nb, (b) => 'qb-' + b.id);
  for (const b of fromBank.pick) out.push(bankQ(b));
  for (const k of fallback) { while (out.length < ROUND) { GKEY = k; GPICK = ''; const q = GEN[k](pool, used); if (!q) break; q.qid = q.qid || GPICK; out.push(q); } }
  // shuffle question order, then answer positions (balanced so the right answer is not biased to any slot)
  const qs = shuffle(out).slice(0, ROUND);
  let bag = [];
  for (const q of qs) {
    if (q.keepOrder) continue;
    const n = q.options.length;
    if (!bag.length || bag.n !== n) { bag = shuffle([...Array(n).keys(), ...Array(n).keys()]); bag.n = n; }
    const pos = bag.pop();
    const right = q.options.find((o) => o.ok); const rest = shuffle(q.options.filter((o) => !o.ok));
    rest.splice(pos, 0, right); q.options = rest;
  }
  qs.forget = fromBank.forget || [];
  return qs;
}
