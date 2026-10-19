// חוקרי הטבע – words built from the model: "what happened and why" after an experiment, the sentence under a graph,
// and the links between the creatures (who eats whom, who needs what) for the researcher's notebook.
// Everything comes from the case's own model (flows, caps) and from the model's account of why each number moved
// (model.track(), see model.js), so a new mystery gets its explanations without new words.
// Names agree with their verbs through `forms` (src/research/explain-data.js): 'mp' masculine plural (the default),
// 'fp' feminine plural, 'ms' / 'fs' singular. Beginners read everything vocalised.

const F = { mp: 0, fp: 1, ms: 2, fs: 3 };
// verbs in four forms: masculine plural, feminine plural, masculine singular, feminine singular
const V = {
  // present (the links)
  hunt: ['צָדִים', 'צָדוֹת', 'צָד', 'צָדָה'],
  eat: ['אוֹכְלִים', 'אוֹכְלוֹת', 'אוֹכֵל', 'אוֹכֶלֶת'],
  need: ['צְרִיכִים', 'צְרִיכוֹת', 'צָרִיךְ', 'צְרִיכָה'],
  give: ['נוֹתְנִים', 'נוֹתְנוֹת', 'נוֹתֵן', 'נוֹתֶנֶת'],
  grow: ['צוֹמְחִים', 'צוֹמְחוֹת', 'צוֹמֵחַ', 'צוֹמַחַת'],
  // past (what happened)
  rose: ['עָלוּ', 'עָלוּ', 'עָלָה', 'עָלְתָה'],
  fell: ['יָרְדוּ', 'יָרְדוּ', 'יָרַד', 'יָרְדָה'],
  stayed: ['נִשְׁאֲרוּ', 'נִשְׁאֲרוּ', 'נִשְׁאַר', 'נִשְׁאֲרָה'],
  left: ['עָזְבוּ', 'עָזְבוּ', 'עָזַב', 'עָזְבָה'],
  bred: ['הִתְרַבּוּ', 'הִתְרַבּוּ', 'הִתְרַבָּה', 'הִתְרַבְּתָה'],
  came: ['הִגִּיעוּ', 'הִגִּיעוּ', 'הִגִּיעַ', 'הִגִּיעָה'],
  ate: ['אָכְלוּ', 'אָכְלוּ', 'אָכַל', 'אָכְלָה'],
  hunted: ['צָדוּ', 'צָדוּ', 'צָד', 'צָדָה'],
  gave: ['נָתְנוּ', 'נָתְנוּ', 'נָתַן', 'נָתְנָה'],
  grew: ['צָמְחוּ', 'צָמְחוּ', 'צָמַח', 'צָמְחָה'],
  was: ['הָיוּ', 'הָיוּ', 'הָיָה', 'הָיְתָה'],
};
export const unvocal = (s) => String(s).replace(/[֑-ׇ]/g, (c) => (c === '־' ? c : ''));   // keeps the maqaf
const KIDS = {
  hungry: '{n} {left}, כִּי לֹא הָיָה מַסְפִּיק אֹכֶל.',
  crowdedOf: '{n} {left}, כִּי לֹא {was} מַסְפִּיק {s}.',
  crowded: '{n} {left}, כִּי לֹא הָיָה מָקוֹם לְעוֹד.',
  hunted: '{x} {hunted} הַרְבֵּה {n}.',
  ate: '{x} {ate} הַרְבֵּה {n}.',
  because: '{n} {fell} בִּגְלַל {x}.',
  bred: '{n} {bred}, כִּי הָיָה הַרְבֵּה אֹכֶל.',
  came: '{n} {came} מִבַּחוּץ, כִּי הָיָה אֹכֶל וּמָקוֹם.',
  gave: '{x} {gave} הַרְבֵּה {n}.',
  grew: '{n} {grew} מִתּוֹךְ {x}.',
  after: 'אַחֲרֵי הָרַעְיוֹן "{i}", {n} {v} מִ־{a} לְ־{b}.',
  afterSame: 'אַחֲרֵי הָרַעְיוֹן "{i}", {n} {stayed} בְּעֵרֶךְ {a}.',
  since: 'מֵאָז שֶׁמָּדַדְנוּ, {n} {v} מִ־{a} לְ־{b}.',
  sinceSame: 'מֵאָז שֶׁמָּדַדְנוּ, {n} {stayed} בְּעֵרֶךְ {a}.',
  link: '{a} {v} {b}',
  linkGrow: '{b} {v} מִתּוֹךְ {a}',
};
const PLAIN = {
  hungry: '{n} {left}, כי לא היה מספיק אוכל.',
  crowdedOf: '{n} {left}, כי לא {was} מספיק {s}.',
  crowded: '{n} {left}, כי לא היה מקום לעוד.',
  hunted: '{x} {hunted} הרבה {n}.',
  ate: '{x} {ate} הרבה {n}.',
  because: '{n} {fell} בגלל {x}.',
  bred: '{n} {bred}, כי היה הרבה אוכל.',
  came: '{n} {came} מבחוץ, כי היה אוכל ומקום.',
  gave: '{x} {gave} הרבה {n}.',
  grew: '{n} {grew} מתוך {x}.',
  after: 'אחרי הרעיון "{i}", {n} {v} מ־{a} ל־{b}.',
  afterSame: 'אחרי הרעיון "{i}", {n} {stayed} בערך {a}.',
  since: 'מאז שמדדנו, {n} {v} מ־{a} ל־{b}.',
  sinceSame: 'מאז שמדדנו, {n} {stayed} בערך {a}.',
  link: '{a} {v} {b}',
  linkGrow: '{b} {v} מתוך {a}',
};
export const KIDS_EXPLAIN = KIDS;   // validate-research checks the nikud

export function createExplainer(C, X) {
  const kids = C.level === 'kids';
  const TT = kids ? KIDS : PLAIN;
  const forms = (X && X.forms) || {};
  const vars = Object.fromEntries(C.model.vars.map((v) => [v.id, v]));
  const row = (id) => C.board.find((b) => b.id === id) || null;
  const form = (id) => F[forms[id] || 'mp'];
  const verb = (k, id) => { const w = V[k][form(id)]; return kids ? w : unvocal(w); };
  const fill = (key, o) => TT[key].replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? o[k] : V[k] ? verb(k, o.id) : ''));
  const shownV = (b, v) => Math.round((v || 0) * (b.scale ?? 1));

  // why one number went down (dir < 0) or up (dir > 0), from the model's account; null when there is nothing to say
  function reason(b, dir, acc, before = {}, after = {}) {
    const a = acc && acc[b.id]; if (!a) return null;
    const v = vars[b.id] || {};
    const flowOf = (pred) => C.model.flows.find(pred);
    const c = [];
    if (dir < 0) {
      if (v.kind === 'animal') c.push(['hungry', a.hungry], ['crowded', a.crowded]);
      for (const [w, x] of Object.entries(a.by || {})) c.push(['by:' + w, x]);
    } else {
      // newcomers from outside count first when they are a fair part of the rise (an empty place fills up that way)
      if (v.kind === 'animal') c.push(['bred', a.born - (a.died || 0) * 0.5], ['came', a.arrived * 2.5]);
      for (const [w, x] of Object.entries(a.from || {})) if (w !== b.id) c.push(['from:' + w, x]);
    }
    c.sort((p, q) => q[1] - p[1]);
    let first = true;
    for (const [k, x] of c) {
      if (!(x > 0.05)) break;
      // a fall is told by its biggest cause only: naming a smaller one would point at the wrong culprit
      if (dir < 0 && !first) return null;
      first = false;
      if (dir < 0 && k.startsWith('by:')) {
        const w = k.slice(3), wr = row(w);
        if (!wr) return null;
        // a hunter that never got to one whole animal on the board (a passing visitor) is not named: the child sees 0 of them
        if ((vars[w] || {}).kind === 'animal' && Math.max(before[w] || 0, after[w] || 0) < 0.5) return null;
        if ((vars[w] || {}).kind !== 'animal') return fill('because', { n: b.name, x: wr.name, id: b.id });
      }
      if (k === 'hungry') return fill('hungry', { n: b.name, id: b.id });
      if (k === 'crowded') {
        const of = v.cap && typeof v.cap === 'object' ? v.cap.of : null, s = of && row(of);
        return s ? fill('crowdedOf', { n: b.name, id: b.id, s: s.name, was: verb('was', of) }) : fill('crowded', { n: b.name, id: b.id });
      }
      if (k === 'bred') return fill('bred', { n: b.name, id: b.id });
      if (k === 'came') return fill('came', { n: b.name, id: b.id });
      const w = k.slice(k.indexOf(':') + 1), wr = row(w);
      if (!wr) continue;   // taken or given by something the child does not know by name (a hidden stock): say nothing
      if (k.startsWith('by:')) {
        const hunt = !!flowOf((f) => f.type === 'prey' && f.pred === w && f.prey === b.id);
        return fill(hunt ? 'hunted' : 'ate', { n: b.name, x: wr.name, id: w });
      }
      const fl = flowOf((f) => (f.type === 'produce' || f.type === 'germinate' || f.type === 'mature') && f.from === w && f.to === b.id);
      if (!fl) continue;
      if (fl.type === 'produce') return fill('gave', { n: b.name, x: wr.name, id: w });
      return fill('grew', { n: b.name, x: wr.name, id: b.id });
    }
    return null;
  }

  // what changed between two moments: the rows that moved most (by how much they moved for their size), with numbers
  // and a reason. `known`: ids the child measured (others show "?").
  function changes(before, after, acc, known, max = kids ? 3 : 4) {
    const out = [];
    for (const b of C.board) {
      const bv = shownV(b, before[b.id]), av = shownV(b, after[b.id]);
      const d = av - bv;
      if (Math.abs(d) < Math.max(1, 0.15 * Math.abs(bv))) continue;
      out.push({ id: b.id, b, before: bv, after: av, dir: Math.sign(d), rel: Math.abs(d) / Math.max(1, Math.abs(bv)), known: !known || known.has(b.id), why: reason(b, Math.sign(d), acc, before, after) });
    }
    // measured rows first (their numbers can be shown), then the biggest change
    out.sort((p, q) => (q.known - p.known) || (q.rel - p.rel));
    return out.slice(0, max);
  }

  // the sentence under a graph: after the last idea (or since it was measured), from a to b
  function trend(b, a, z, ideaTitle) {
    const o = { n: b.name, id: b.id, a, b: z, i: ideaTitle };
    const same = Math.abs(z - a) < Math.max(1, 0.08 * Math.abs(a));
    if (same) return fill(ideaTitle ? 'afterSame' : 'sinceSame', o);
    return fill(ideaTitle ? 'after' : 'since', { ...o, v: verb(z > a ? 'rose' : 'fell', b.id) });
  }

  // the links between the creatures and things on the board, from the model: [{ a, b, text, kind }]
  function links() {
    const out = [], seen = new Set();
    const add = (a, b, kind) => {
      const ra = row(a), rb = row(b); if (!ra || !rb || a === b) return;
      const k = a + '>' + b; if (seen.has(k)) return; seen.add(k);
      const text = kind === 'grow' ? fill('linkGrow', { a: ra.name, b: rb.name, v: verb('grow', b) })
        : fill('link', { a: ra.name, b: rb.name, v: verb(kind, a) });
      out.push({ a, b, kind, text });
    };
    for (const v of C.model.vars) {
      if (v.kind !== 'animal' || !v.cap || typeof v.cap !== 'object') continue;
      add(v.id, v.cap.of, 'need'); for (const x of v.cap.also || []) add(v.id, x.of, 'need');
    }
    for (const f of C.model.flows) {
      if (f.type === 'prey') add(f.pred, f.prey, 'hunt');
      else if (f.type === 'consume' && (vars[f.eater] || {}).kind === 'animal') add(f.eater, f.food, 'eat');
      else if (f.type === 'produce') { if (f.help) add(f.to === f.from ? f.from : f.from, f.help.id, 'need'); if (f.from !== f.to) add(f.from, f.to, 'give'); }
      else if (f.type === 'germinate' || f.type === 'mature') add(f.from, f.to, 'grow');
    }
    return out;
  }
  return { changes, trend, links, reason, why: (ideaId) => (X && X.why && X.why[ideaId]) || null, hyp: (gid) => (X && X.hyp && X.hyp[gid]) || null };
}
