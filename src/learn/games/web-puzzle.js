import { relVerb, dietVerb, notTogether, defName, joinObj } from '../../data/common.js';
import { icon } from '../../ui/ui.js';
import { tileIcon } from '../../ui/icons-hub.js';
// "חוט הקשר" – web puzzle mini-game for the learning hub (single player).
// Each level shows a small web of species cards: some fixed (face up) and some empty slots, joined by
// relation threads. The player drags (or taps) a card from the hand into a slot so that every thread is true.
// Levels are generated procedurally but deterministically from the real relation graph (per biome + index).
//
// export function mountWebPuzzle(root, ctx, opts) → { destroy() }
// Debug hook: window.__wpDebug = { solve(), wrong(), level(), open(biome, idx), levels(biome) }

const CSS_ID = 'wl-webpuzzle-css';
const LEVELS = 12;
const BIOMES = ['amazon', 'grove', 'reef'];
const BNAME = { amazon: 'אמזונס', grove: 'חורש', reef: 'שונית' };
const HOWTO = 'גררו קלף למקום הריק כך שכל החוטים יהיו נכונים';
const PACK_EVERY = 4; // one card pack for every 4 levels (per biome) that reach 3 stars

/* ───────────────────────────── icons (inline SVG – no emoji fonts needed offline) */
const sv = (body) => `<svg class="wl-ic" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const TYPE_IC = {
  pollinates: sv('<g fill="currentColor"><circle cx="12" cy="6.3" r="3.6"/><circle cx="17.4" cy="10.2" r="3.6"/><circle cx="15.4" cy="16.6" r="3.6"/><circle cx="8.6" cy="16.6" r="3.6"/><circle cx="6.6" cy="10.2" r="3.6"/></g><circle cx="12" cy="11.6" r="2.8" fill="#fff6c8"/>'),
  disperses: sv('<path d="M12 21v-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 13C12 8.5 9 6 4 6c0 4.5 3 7 8 7zM12 11.5c0-4 2.6-6.6 7.5-6.6 0 4-2.6 6.6-7.5 6.6z" fill="currentColor"/>'),
  home: sv('<path d="M3.5 11.5L12 4l8.5 7.5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V20h12v-9.5" fill="currentColor"/><rect x="10" y="14" width="4" height="6" fill="#fff" fill-opacity=".6"/>'),
  shelter: sv('<path d="M12 22v-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="9" r="6" fill="currentColor"/><circle cx="7" cy="12.5" r="4" fill="currentColor"/><circle cx="17" cy="12.5" r="4" fill="currentColor"/>'),
  decomposes: sv('<path d="M3.5 12a8.5 6.5 0 0 1 17 0z" fill="currentColor"/><path d="M9.5 12h5v6.5a2.5 2.5 0 0 1-5 0z" fill="currentColor" opacity=".6"/>'),
  partner: sv('<circle cx="8" cy="12" r="6" fill="currentColor" opacity=".55"/><circle cx="16" cy="12" r="6" fill="currentColor"/>'),
  climbs: sv('<path d="M7 21C7 14 9 8 16 3" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M9 14c-3.5 0-5-2-5-4.5 3 0 5 1.6 5 4.5zM11 9.5c0-3 2-4.8 5-4.8 0 3-2 4.8-5 4.8zM10 17.5c2.8-.6 5 .4 6 2.6-2.8.6-5-.4-6-2.6z" fill="currentColor"/>'),
  eats: sv('<path d="M7 3v7a2 2 0 0 0 4 0V3M9 3v18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16.5 3c-2 1.5-2.5 4-2.5 7 0 1.5 1 2.5 2.5 2.5V21" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
};
const TYPE_LABEL = { pollinates: 'מאביק', disperses: 'מפיץ זרעים', home: 'בונה בית', shelter: 'מסתתר', decomposes: 'מפרק', partner: 'עוזרים זה לזה', climbs: 'גדל על', eats: 'אוכל' };
const IC_STAR = sv('<path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5-4.8-4.5 6.5-.8z" fill="currentColor"/>');
const IC_LOCK = sv('<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="2.4" fill="none"/>');
const IC_BULB = sv('<path d="M12 2.8a6.6 6.6 0 0 0-3.8 12c.8.6 1.3 1.4 1.3 2.3h5c0-.9.5-1.7 1.3-2.3A6.6 6.6 0 0 0 12 2.8z" fill="currentColor"/><path d="M9.6 19.4h4.8M10.4 21.6h3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>');
const IC_THREAD = sv('<path d="M4 18C8 6 16 18 20 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="4" cy="18" r="2.4" fill="currentColor"/><circle cx="20" cy="6" r="2.4" fill="currentColor"/>');
const IC_LEAF = sv('<path d="M4.5 19.5C3.6 11 9 4 20.5 3.6 20.8 14.8 13.6 20.4 4.5 19.5z" fill="currentColor"/>');

/* ───────────────────────────── deterministic random */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rshuffle = (R, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function wpick(R, items, wf) { let tot = 0; const w = items.map((x) => { const v = Math.max(0, wf(x)); tot += v; return v; }); if (!tot) return null; let r = R() * tot; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }

/* ───────────────────────────── relation graph per biome */
function buildGraph(ctx, biome) {
  const sp = ctx.SP.filter((s) => s.biome === biome);
  const byId = new Map(sp.map((s) => [s.id, s]));
  const edges = []; const seen = new Set();
  const add = (e) => { const k = e.from + '>' + e.to + '>' + e.type; if (seen.has(k)) return; seen.add(k); edges.push(e); };
  for (const s of sp) {
    for (const r of s.relations || []) if (byId.has(r.target) && r.target !== s.id && ctx.RELATION_TYPES[r.type]) add({ from: s.id, to: r.target, type: r.type, text: r.text || '' });
  }
  for (const s of sp) {
    for (const d of s.diet || []) {
      if (!byId.has(d.id) || d.id === s.id) continue;
      const verb = dietVerb(d.part, s.id);
      add({ from: s.id, to: d.id, type: 'eats', part: d.part, text: d.text || `${defName(s.id, s.name)} ${joinObj(verb, d.id, byId.get(d.id).name)}.` });
    }
  }
  const pk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const pairs = new Map(); const adj = new Map(sp.map((s) => [s.id, new Set()]));
  for (const e of edges) {
    const k = pk(e.from, e.to); if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(e);
    adj.get(e.from).add(e.to); adj.get(e.to).add(e.from);
  }
  // does a relation of this type exist from → to ? ('partner' works both ways)
  const find = (type, from, to) => edges.find((e) => e.type === type && ((e.from === from && e.to === to) || (type === 'partner' && e.from === to && e.to === from))) || null;
  const ids = sp.map((s) => s.id).filter((id) => adj.get(id).size > 0);
  return { biome, byId, edges, pairs, pk, adj, find, ids, deg: (id) => adj.get(id).size };
}

/* ───────────────────────────── level generation */
function params(idx, kids) {
  let nE, nF, nD;
  if (idx < 3) { nE = 1; nF = idx === 0 ? 2 : 3; nD = 3; }
  else if (idx < 7) { nE = idx < 5 ? 2 : 3; nF = 3; nD = 2; }
  else { nE = idx < 9 ? 3 : idx < 11 ? 4 : 5; nF = idx < 9 ? 3 : 4; nD = Math.max(1, Math.min(3, 6 - nE)); }
  if (kids) { nE = Math.min(nE, 2); nD = Math.min(nD, 1); nF = Math.min(nF, 3); }
  return { nE, nF, nD, maxL: idx < 3 ? 2 : 3 };
}
// would card `cid` in slot k make every thread touching k true? → { ok, bad:[line], good:[{line,edge}] }
function checkSlot(G, lv, k, cid, filled) {
  const bad = [], good = [];
  for (const ln of lv.lines) {
    if (ln.a !== k && ln.b !== k) continue;
    const o = ln.a === k ? ln.b : ln.a;
    const oid = lv.nodes[o].fixed ? lv.nodes[o].id : (filled && filled[o]);
    if (!oid) continue;
    const from = ln.from === k ? cid : oid, to = ln.from === k ? oid : cid;
    const e = from !== to && G.find(ln.type, from, to);
    if (e) good.push({ line: ln, edge: e }); else bad.push(ln);
  }
  return { ok: bad.length === 0 && good.length > 0, bad, good };
}

function genLevel(G, idx, kids, usedAns, usedStart) {
  const base = params(idx, kids);
  for (let att = 0; att < 90; att++) {
    const P = { ...base };
    if (att >= 45) P.nE = Math.max(1, P.nE - 1);
    if (att >= 70) { P.nF = Math.max(2, P.nF - 1); P.nD = Math.max(1, P.nD - 1); }
    const R = rng(hashStr(`${G.biome}|${idx}|${kids ? 1 : 0}|${att}`));
    // 1) grow a connected core of fixed cards (prefer well-connected species, new starting points)
    const start = wpick(R, G.ids, (id) => G.deg(id) * (usedStart.has(id) ? 0.15 : 1));
    const F = [start]; const tree = [];
    while (F.length < P.nF) {
      const fr = [];
      for (const f of F) for (const n of G.adj.get(f)) if (!F.includes(n)) fr.push([n, f]);
      if (!fr.length) break;
      const [n, f] = wpick(R, fr, ([x]) => 1 + G.deg(x));
      F.push(n); tree.push([f, n]);
    }
    if (F.length < P.nF) continue;
    // 2) empty slots: species next to the core, preferring answers not used in earlier levels
    const cand = G.ids.filter((id) => !F.includes(id) && F.some((f) => G.adj.get(id).has(f)));
    const E = [];
    const pool = cand.slice();
    while (E.length < P.nE && pool.length) {
      const c = wpick(R, pool, (id) => (0.6 + F.filter((f) => G.adj.get(id).has(f)).length) * (usedAns.has(id) ? 0.2 : 1));
      E.push(c); pool.splice(pool.indexOf(c), 1);
    }
    if (E.length < P.nE) continue;
    const ids = [...F, ...E];
    const nodes = ids.map((id, i) => ({ id, fixed: i < F.length }));
    const ni = (id) => ids.indexOf(id);
    // 3) threads: core tree (+1 extra core link on bigger webs) and up to maxL threads per slot
    const pickEdge = (a, b) => {
      const list = G.pairs.get(G.pk(a, b)) || [];
      const nice = list.filter((e) => e.type !== 'eats');
      const from = nice.length && R() < 0.8 ? nice : list;
      return from[Math.floor(R() * from.length)] || list[0];
    };
    const lines = []; const has = new Set();
    const addLine = (a, b) => {
      const key = G.pk(a, b); if (has.has(key)) return; const e = pickEdge(a, b); if (!e) return; has.add(key);
      lines.push({ a: ni(a), b: ni(b), type: e.type, from: ni(e.from), to: ni(e.to), edge: e });
    };
    for (const [f, n] of tree) addLine(f, n);
    if (idx >= 7) { const extra = []; for (const a of F) for (const b of F) if (a < b && G.adj.get(a).has(b) && !has.has(G.pk(a, b))) extra.push([a, b]); if (extra.length) addLine(...extra[Math.floor(R() * extra.length)]); }
    for (const e of E) {
      const nb = rshuffle(R, F.filter((f) => G.adj.get(e).has(f))).slice(0, P.maxL);
      for (const f of nb) addLine(e, f);
    }
    const lv = { biome: G.biome, idx, nodes, lines };
    const slots = nodes.map((n, i) => (n.fixed ? -1 : i)).filter((i) => i >= 0);
    if (!slots.every((k) => checkSlot(G, lv, k, nodes[k].id).ok)) continue;
    // 4) uniqueness among the answers themselves
    if (slots.some((k) => slots.some((j) => j !== k && checkSlot(G, lv, k, nodes[j].id).ok))) continue;
    // 5) plausible decoys that fit no slot
    const answers = slots.map((k) => nodes[k].id);
    const animalAns = answers.map((id) => !!G.byId.get(id).animal);
    const dpool = G.ids.filter((id) => !ids.includes(id) && !slots.some((k) => checkSlot(G, lv, k, id).ok))
      .map((id) => {
        const s = G.byId.get(id);
        let sc = R() * 2.2;
        if (animalAns.includes(!!s.animal)) sc += 2;
        if (F.some((f) => G.adj.get(id).has(f))) sc += 2.5; // linked to the web, just not this way
        return { id, sc };
      }).sort((x, y) => y.sc - x.sc);
    const decoys = dpool.slice(0, P.nD).map((d) => d.id);
    if (decoys.length < Math.min(1, P.nD)) continue;
    lv.hand = rshuffle(R, [...answers, ...decoys]);
    lv.answers = answers; lv.decoys = decoys; lv.slots = slots;
    lv.pos = layout(R, nodes.length, lines);
    lv.sig = ids.slice().sort().join(',');
    return lv;
  }
  return null;
}

/* hex-ish grid layout chosen by local search: short threads, no crossings, no thread running under a card */
function layout(R, N, lines) {
  // two staggered rows use the wide board best and leave tall gaps for the threads
  const rows = 2, cols = Math.max(2, Math.ceil((N + 1) / 2));
  const P = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) P.push({ x: (c + (r % 2 ? 0.5 : 0)) / (cols - 0.5), y: r });
  const AX = 3.4; // board aspect (inner area)
  const pt = (p) => ({ x: p.x * AX, y: p.y });
  const segD = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y; const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
  const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x);
  const cross = (a, b, c, d) => (ccw(a, c, d) > 0) !== (ccw(b, c, d) > 0) && (ccw(a, b, c) > 0) !== (ccw(a, b, d) > 0);
  const score = (as) => {
    const q = as.map((k) => pt(P[k])); let s = 0;
    for (const l of lines) {
      const a = q[l.a], b = q[l.b]; s += Math.hypot(a.x - b.x, a.y - b.y);
      if (Math.abs(a.y - b.y) > 0.6 && Math.abs(a.x - b.x) < 0.3) s += 2; // steep: card blocks it
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      for (let i = 0; i < N; i++) { if (i === l.a || i === l.b) continue; if (segD(q[i], a, b) < 0.3) s += 6; if (Math.hypot(q[i].x - m.x, q[i].y - m.y) < 0.4) s += 2; }
    }
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
      const L = lines[i], M = lines[j]; if (L.a === M.a || L.a === M.b || L.b === M.a || L.b === M.b) continue;
      if (cross(q[L.a], q[L.b], q[M.a], q[M.b])) s += 4;
    }
    return s;
  };
  let best = null, bestS = Infinity;
  for (let rs = 0; rs < 6; rs++) {
    let as = rshuffle(R, P.map((_, i) => i)).slice(0, N); let cur = score(as);
    for (let it = 0; it < 350; it++) {
      const nx = as.slice(); const i = Math.floor(R() * N);
      if (R() < 0.5) { const j = Math.floor(R() * N); [nx[i], nx[j]] = [nx[j], nx[i]]; }
      else { const free = P.map((_, k) => k).filter((k) => !nx.includes(k)); if (!free.length) continue; nx[i] = free[Math.floor(R() * free.length)]; }
      const s = score(nx); if (s <= cur) { as = nx; cur = s; }
    }
    if (cur < bestS) { bestS = cur; best = as; }
  }
  return best.map((k) => ({ x: P[k].x, y: P[k].y }));
}

const CACHE = new Map();
function levelsFor(ctx, biome, kids) {
  const key = biome + (kids ? ':k' : '');
  if (CACHE.has(key)) return CACHE.get(key);
  const G = buildGraph(ctx, biome);
  const usedAns = new Set(), usedStart = new Set(), sigs = new Set(); const out = [];
  for (let i = 0; i < LEVELS; i++) {
    let lv = genLevel(G, i, kids, usedAns, usedStart);
    if (lv && sigs.has(lv.sig)) { const lv2 = genLevel(G, i + 100, kids, usedAns, usedStart); if (lv2 && !sigs.has(lv2.sig)) lv = { ...lv2, idx: i }; }
    if (!lv) continue;
    lv.idx = out.length; sigs.add(lv.sig); usedStart.add(lv.nodes[0].id); lv.answers.forEach((a) => usedAns.add(a));
    out.push(lv);
  }
  const res = { G, levels: out };
  CACHE.set(key, res);
  return res;
}

/* ───────────────────────────── CSS */
const CSS = `
.wp-pick{justify-content:center;gap:1.1em;padding:0 2em 1.6em}
.wp-phead{text-align:center}
.wp-phead h1{font-family:var(--serif);font-size:2.7em;line-height:1;color:#f6eed0;text-shadow:0 3px 22px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;gap:.3em}
.wp-phead h1 .wl-ic{width:.9em;height:.9em;color:var(--amber)}
.wp-phead p{margin-top:.45em;font-family:var(--serif);font-size:calc(1.15em * var(--tsr,1));color:#e2dcbd}
.wp-tabs{display:flex;gap:.8em;justify-content:center}
.wp-tab{min-width:9em;padding:.55em 1.6em;border-radius:99px;font-weight:800;font-size:1.15em;background:rgba(246,240,220,.12);border:2px solid rgba(246,240,220,.25)!important;color:#f3ecd2;display:flex;align-items:center;justify-content:center;gap:.5em}
.wp-tab.on{background:linear-gradient(180deg,#a2dc78,#5fae4a);border-color:#3f8a33!important;color:#10260b;box-shadow:0 4px 0 #2f6a26}
.wp-tab small{font-size:.8em;opacity:.85}
.wp-grid{width:min(52em,94%);border-radius:22px;padding:1.3em 1.4em;display:grid;grid-template-columns:repeat(6,1fr);gap:.9em}
.wp-lvl{position:relative;aspect-ratio:1/1.05;border-radius:16px;background:#fbf6e5;border:2px solid var(--edge)!important;box-shadow:0 3px 0 var(--edge),0 6px 14px rgba(0,0,0,.15);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.25em;transition:transform .15s}
.wp-lvl:hover:not(:disabled){transform:translateY(-3px)}
.wp-lvl b{font-family:var(--serif);font-size:2.2em;line-height:1;color:#1f2c1a}
.wp-lvl .wp-st{display:flex;gap:.1em;color:rgba(80,70,40,.22)}
.wp-lvl .wp-st .wl-ic{width:1.05em;height:1.05em}
.wp-lvl .wp-st .on{color:var(--amber2)}
.wp-lvl.next{border-color:var(--leaf2)!important;box-shadow:0 3px 0 #3f8a33,0 0 0 4px rgba(143,208,103,.5);animation:wp-breath 1.8s ease-in-out infinite}
.wp-lvl.lock{background:#d9cfb0;opacity:.75}
.wp-lvl.lock b{color:#8a7e5c}
.wp-lvl.lock .wl-ic{width:1.5em;height:1.5em;color:#8a7e5c}
.wp-total{color:#e2dcbd;font-weight:800;display:flex;align-items:center;justify-content:center;gap:.5em}
.wp-total .wl-ic{color:var(--amber)}
/* level */
.wp-game{position:relative;width:100%;padding:0 1.1em .25em;align-items:stretch;gap:.3em}
.wp-bar{display:flex;align-items:center;gap:.8em;min-height:2.7em;flex:none}
.wp-lv{font-family:var(--serif);font-weight:700;font-size:1.3em;color:#f6eed0;white-space:nowrap}
.wp-how{display:flex;align-items:center;gap:.4em;color:#e2dcbd;font-weight:700;font-size:calc(1.02em * var(--tsr,1));padding:.3em .9em;border-radius:99px;background:rgba(246,240,220,.1);min-width:0}
.wp-how .wl-ic{color:var(--amber);flex:none}
.wp-sp{flex:1}
.wp-bar .wl-btn{min-height:2.5em;padding:.3em 1.1em;font-size:.98em}
.wp-mist{display:flex;gap:.15em;color:var(--amber)}
.wp-mist .wl-ic{width:1.2em;height:1.2em}
.wp-mist .off{color:rgba(246,240,220,.25)}
.wp-board{position:relative;flex:1;min-height:0;border-radius:22px;overflow:hidden}
.wp-board::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 70% at 15% 20%,rgba(143,208,103,.22),transparent 70%),radial-gradient(50% 60% at 90% 85%,rgba(95,174,74,.18),transparent 70%)}
.wp-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.wp-svg path{fill:none;stroke-linecap:round;transition:stroke .4s,stroke-width .3s,opacity .3s}
.wp-svg .known{stroke-width:3.2;opacity:.75}
.wp-svg .open{stroke-width:3.4;stroke-dasharray:9 7;opacity:.95}
.wp-svg .gold{stroke:#e8a43a!important;stroke-width:5;filter:drop-shadow(0 0 4px rgba(240,180,76,.95));stroke-dasharray:var(--len) var(--len);animation:wp-draw .7s ease-out both}
.wp-svg .bad{stroke:#d9774f!important;stroke-width:4;stroke-dasharray:6 6;opacity:1}
.wp-node{position:absolute;transform:translate(-50%,-50%);z-index:2}
.wp-node .wl-card{--cw:min(6.5em,12.5vh)}
.wp-node.fresh .wl-card{animation:wp-land .5s cubic-bezier(.2,.9,.3,1.3) both}
.wp-node.ok .wl-card{box-shadow:0 0 0 .2em #f0b44c,0 0 1.4em rgba(240,180,76,.85),0 .5em 1.2em rgba(0,0,0,.35)}
.wp-node.badn .wl-card{animation:wp-shake .5s both;filter:saturate(.6)}
.wp-slot{--cw:min(6.5em,12.5vh);width:var(--cw);height:calc(var(--cw) * 1.42);border-radius:.8em;border:3px dashed rgba(79,120,60,.55);background:rgba(255,255,255,.35);display:grid;place-items:center;transition:background .2s,border-color .2s,transform .2s;cursor:pointer}
.wp-slot b{font-family:var(--serif);font-size:calc(var(--cw) * .42);line-height:1;color:rgba(79,120,60,.55)}
.wp-slot.hot,.wp-slot.armed:hover{background:rgba(143,208,103,.35);border-color:var(--leaf2);transform:scale(1.05)}
.wp-slot.armed{border-color:var(--leaf2);animation:wp-breath 1.6s ease-in-out infinite}
.wp-slot.hint{border-color:var(--amber2);background:rgba(240,180,76,.3);animation:wp-breath 1s ease-in-out infinite}
.wp-pill{position:absolute;transform:translate(-50%,-50%);z-index:3;display:flex;align-items:center;gap:.3em;padding:.18em .7em .18em .55em;border-radius:99px;background:#fbf6e5;border:2px solid var(--c)!important;color:#1f2c1a;font-weight:800;font-size:.86em;white-space:nowrap;box-shadow:0 2px 6px rgba(40,30,10,.2);transition:background .3s,border-color .3s}
.wp-pill .wl-ic{color:var(--c);width:1.2em;height:1.2em}
.wp-pill.gold{background:linear-gradient(180deg,#fff2c4,#f8d98a);border-color:#d98e26!important}
.wp-pill.bad{border-color:#d9774f!important;background:#fde3d6}
.wp-msg{flex:none;min-height:2.6em;display:flex;align-items:center;justify-content:center}
.wp-msg>div{display:flex;align-items:center;gap:.55em;max-width:96%;padding:.4em 1.3em;border-radius:99px;font-family:var(--serif);font-weight:700;font-size:calc(1.1em * var(--tsr,1));line-height:1.3;animation:wl-rise .35s both}
.wp-msg .ok{background:linear-gradient(180deg,#fff2c4,#f8d98a);color:#3a2608}
.wp-msg .ok .wl-ic{color:#b96f12}
.wp-msg .no{background:#fbf6e5;color:#5a3b22}
.wp-msg .no .wl-ic{color:#d9774f}
.wp-msg .tip{color:#e2dcbd;font-family:var(--sans);font-weight:600;font-size:1em}
.wp-hand{flex:none;display:flex;gap:.9em;justify-content:center;align-items:flex-end;padding:.2em .5em .1em;min-height:calc(min(6.8em,13.2vh) * 1.42 + .4em)}
.wp-hc{position:relative;cursor:grab;touch-action:none;transition:transform .2s,opacity .2s}
.wp-hc .wl-card{--cw:min(6.8em,13.2vh);pointer-events:none}
.wp-hc:hover{transform:translateY(-.5em)}
.wp-hc.sel{transform:translateY(-.9em)}
.wp-hc.sel .wl-card{box-shadow:0 0 0 .22em var(--leaf),0 0 1.2em rgba(143,208,103,.8),0 .5em 1.2em rgba(0,0,0,.35)}
.wp-hc.hint .wl-card{box-shadow:0 0 0 .22em var(--amber),0 0 1.4em rgba(240,180,76,.9);animation:wp-breath 1s ease-in-out infinite}
.wp-hc.lift{opacity:.25}
.wp-hc.gone{visibility:hidden}
.wp-ghost{position:fixed;z-index:60;/* inside the hub (its own layer): 60 only counts there */pointer-events:none;transform:translate(-50%,-50%) rotate(-3deg) scale(1.06);filter:drop-shadow(0 14px 18px rgba(0,0,0,.4))}
.wp-ghost .wl-card{--cw:min(6.8em,13.2vh)}
.wp-ghost.fly{transition:left .45s cubic-bezier(.3,.8,.3,1.1),top .45s cubic-bezier(.3,.8,.3,1.1),transform .45s}
/* finished */
.wp-done{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(8,20,12,.6);backdrop-filter:blur(3px);animation:wl-in .3s both}
.wp-done[hidden]{display:none}
.wp-dbox{width:min(50em,96%);max-height:96%;border-radius:22px;padding:1.2em 1.6em 1.3em;display:flex;flex-direction:column;align-items:center;gap:.65em;text-align:center;animation:wl-pop .45s cubic-bezier(.2,.9,.3,1.25) both}
.wp-dbox h2{font-family:var(--serif);font-size:2.1em;line-height:1.05;color:#1f2c1a}
.wp-dbox p{color:var(--ink2);font-size:calc(1.05em * var(--tsr,1))}
.wp-stars{display:flex;gap:.3em;color:rgba(80,70,40,.2)}
.wp-stars .wl-ic{width:3em;height:3em}
.wp-stars .on{color:var(--amber);filter:drop-shadow(0 4px 10px rgba(217,142,38,.55));animation:wl-star .6s cubic-bezier(.2,.9,.3,1.4) both}
.wp-stars .on:nth-child(2){animation-delay:.15s}.wp-stars .on:nth-child(3){animation-delay:.3s}
.wp-earned{display:flex;flex-direction:column;align-items:center;gap:.45em;width:100%;padding:.6em .8em;border-radius:16px;background:rgba(95,174,74,.12)}
.wp-earn{display:flex;align-items:center;gap:.4em;font-weight:800;color:#1d4a17!important}
.wp-earn .wl-ic{color:var(--moss)}
.wp-earn.soft{font-weight:700;color:var(--ink2)!important}
.wp-got{display:flex;justify-content:center;padding:.2em .3em .3em}
.wp-got .wl-card{--cw:min(7.4em,15vh)}
.wp-pack{display:flex;align-items:center;gap:.5em;font-weight:800;color:#8a5a12}
.wp-pack.big{font-size:1.15em;padding:.25em 1em;border-radius:99px;background:linear-gradient(180deg,#fff2c4,#f8d98a);color:#3a2608;animation:wl-pop .5s .3s both}
.wp-pack.big .wl-ic{color:#d98e26}
.wp-pips{display:inline-flex;gap:.12em}
.wp-pips i{display:inline-flex;color:rgba(80,70,40,.22)}
.wp-pips i .wl-ic{width:1.1em;height:1.1em;color:inherit}
.wp-pips i.on{color:var(--amber2)}
.wp-pips i.new{animation:wl-star .7s .5s cubic-bezier(.2,.9,.3,1.4) both}
.wp-total .wp-pips i{color:rgba(246,240,220,.25)}
.wp-total .wp-pips i.on{color:var(--amber)}
.wp-btns{display:flex;gap:.7em;flex-wrap:wrap;justify-content:center;margin-top:.2em}
@keyframes wp-draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes wp-land{0%{transform:scale(1.25);opacity:.4}100%{transform:none;opacity:1}}
@keyframes wp-shake{0%,100%{transform:none}20%{transform:translateX(-6px) rotate(-2deg)}40%{transform:translateX(5px) rotate(2deg)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
@keyframes wp-breath{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@media (max-height:720px){.wp-phead h1{font-size:2.2em}.wp-grid{padding:1em}.wp-lvl b{font-size:1.8em}}
/* round 2: gentle colour – Amazon teal, Grove ochre; level tiles carry a soft hue on top */
.wp-tab.on[data-b="amazon"]{background:#8fcfc0;border-color:#3f8f84!important;color:#10302b;box-shadow:0 4px 0 #2f6f66}
.wp-tab.on[data-b="grove"]{background:#ecc77e;border-color:#a8741e!important;color:#3a2608;box-shadow:0 4px 0 #8a5a12}
.wp-tab.on[data-b="reef"]{background:#8ccfe6;border-color:#2a8ac0!important;color:#0e3346;box-shadow:0 4px 0 #1f6f98}
.wp-lvl{border-top-width:5px!important}
.wp-lvl:nth-child(6n+1){border-top-color:#8cc3dc!important}.wp-lvl:nth-child(6n+2){border-top-color:#f2cf5b!important}
.wp-lvl:nth-child(6n+3){border-top-color:#e79aab!important}.wp-lvl:nth-child(6n+4){border-top-color:#b9a8e0!important}
.wp-lvl:nth-child(6n+5){border-top-color:#a9cf6a!important}.wp-lvl:nth-child(6n){border-top-color:#e0a070!important}
.wp-lvl.next{border-color:var(--leaf2)!important}
.wp-earned{background:rgba(140,195,220,.18)}
`;
function injectCss() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const st = document.createElement('style'); st.id = CSS_ID;
  st.textContent = CSS.replace(/(^|[,{}\n])\s*\.wp-/g, '$1#wol-learn.wol-learn .wp-');
  document.head.appendChild(st);
}

/* ───────────────────────────── the game */
export function mountWebPuzzle(root, ctx, opts = {}) {
  injectCss();
  const esc = ctx.esc;
  const kids = !!ctx.kids();
  const ST = Object.assign({ stars: {}, pack: {}, biome: 'amazon' }, ctx.store('webpuzzle') || {});
  ST.stars = ST.stars || {}; ST.pack = ST.pack || {};
  // packs given per biome by the "every 4 three-star levels" rule. Older saves got a pack for every 3-star level,
  // so they start counted as already paid up to their current milestone.
  if (!ST.packs3) { ST.packs3 = {}; for (const b of BIOMES) ST.packs3[b] = Math.floor(threeIn(b) / PACK_EVERY); }
  function threeIn(b) { return Object.keys(ST.stars).filter((k) => k.startsWith(b + ':') && ST.stars[k] >= 3).length; }
  const save = () => ctx.store('webpuzzle', ST);
  let biome = BIOMES.includes(opts.biome) ? opts.biome : (BIOMES.includes(ST.biome) ? ST.biome : 'amazon');
  let G = null, lv = null, filled = {}, mistakes = 0, busy = false, sel = null, done = false;
  let ro = null, drag = null, ghosts = [];
  const offs = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
  const $ = (s) => root.querySelector(s);
  const card = (id) => ctx.CARD.get(G.biome + ':' + id) || ctx.CARD.get(id);
  const nm = (id) => (G.byId.get(id) || {}).name || id;
  const lkey = (b, i) => b + ':' + i;
  const unlocked = (b, i) => i === 0 || (ST.stars[lkey(b, i - 1)] || 0) > 0;

  // "עוד 2 שלבים עם 3 כוכבים לחבילה הבאה" + 4 little pips
  function packInfo(b) {
    const n = threeIn(b), total = levelsFor(ctx, b, kids).levels.length;
    const inRow = n % PACK_EVERY, left = PACK_EVERY - inRow;
    return { n, inRow, left, possible: total - n >= left };
  }
  function packLine(b, cls, fresh = false) {
    const P = packInfo(b);
    if (!P.possible) return `<div class="${cls}">${IC_STAR}<span>כל הכבוד! אספתם את כל חבילות הקלפים של ${BNAME[b]} בחוט הקשר</span></div>`;
    return `<div class="${cls}"><span class="wp-pips" aria-hidden="true">${Array.from({ length: PACK_EVERY }, (_, k) => `<i class="${k < P.inRow ? 'on' : ''}${fresh && k === P.inRow - 1 ? ' new' : ''}">${IC_STAR}</i>`).join('')}</span><span>${P.left === 1 ? 'עוד שלב אחד' : `עוד ${P.left} שלבים`} עם 3 כוכבים לחבילת הקלפים הבאה</span></div>`;
  }

  /* ── level picker */
  function renderPicker() {
    done = false; lv = null; cleanupDrag();
    ctx.setTitle('חוט הקשר');
    const L = levelsFor(ctx, biome, kids).levels;
    const total = (b) => levelsFor(ctx, b, kids).levels.reduce((s, l) => s + (ST.stars[lkey(b, l.idx)] || 0), 0);
    const nextI = L.findIndex((l) => !ST.stars[lkey(biome, l.idx)] && unlocked(biome, l.idx));
    root.innerHTML = `<section class="wl-screen wp-pick">
      <div class="wp-phead"><h1>${tileIcon('thread', 'wl-tic')}חוט הקשר</h1><p>מחברים את היצורים ברשת: מי מאביק, מי מפיץ זרעים, מי גר אצל מי?</p></div>
      ${packLine(biome, 'wp-total')}
      <div class="wp-tabs">${BIOMES.map((b) => `<button class="wp-tab${b === biome ? ' on' : ''}" data-b="${b}">${icon(b)}${BNAME[b]} <small>${IC_STAR} ${total(b)}/${levelsFor(ctx, b, kids).levels.length * 3}</small></button>`).join('')}</div>
      <div class="wp-grid paper">${L.map((l) => {
        const s = ST.stars[lkey(biome, l.idx)] || 0, open = unlocked(biome, l.idx);
        return `<button class="wp-lvl${open ? '' : ' lock'}${l.idx === nextI ? ' next' : ''}" data-i="${l.idx}" ${open ? '' : 'disabled'} aria-label="שלב ${l.idx + 1}">
          <b>${l.idx + 1}</b>${open ? `<span class="wp-st">${[0, 1, 2].map((k) => `<span class="${k < s ? 'on' : ''}">${IC_STAR}</span>`).join('')}</span>` : IC_LOCK}</button>`;
      }).join('')}</div>
    </section>`;
  }

  /* ── a level */
  function startLevel(i) {
    const pack = levelsFor(ctx, biome, kids);
    G = pack.G; lv = pack.levels[i]; if (!lv) return renderPicker();
    filled = {}; mistakes = 0; busy = false; sel = null; done = false; cleanupDrag();
    ST.biome = biome; save(); ctx.markUsed && ctx.markUsed('webpuzzle');   // מסע החוקר: a puzzle is being played
    ctx.setTitle(`חוט הקשר · ${BNAME[biome]} · שלב ${lv.idx + 1}`);
    root.innerHTML = `<section class="wl-screen wp-game">
      <div class="wp-bar">
        <span class="wp-how">${IC_THREAD}<span>${HOWTO}</span></span>
        <span class="wp-sp"></span>
        <span class="wp-mist" title="כוכבים"></span>
        ${kids ? `<button class="wl-btn gold" data-a="hint">${IC_BULB}<span>רמז</span></button>` : ''}
        <button class="wl-btn" data-a="levels">${icon('levels')}<span>שלבים</span></button>
      </div>
      <div class="wp-board paper"><svg class="wp-svg" xmlns="http://www.w3.org/2000/svg"></svg><div class="wp-layer"></div></div>
      <div class="wp-msg"></div>
      <div class="wp-hand"></div>
      <div class="wp-done" hidden></div>
    </section>`;
    const layer = $('.wp-layer');
    layer.innerHTML = lv.nodes.map((n, k) => `<div class="wp-node" data-k="${k}">${n.fixed ? ctx.cardHTML(card(n.id)) : `<div class="wp-slot" data-k="${k}" role="button" aria-label="מקום ריק"><b>?</b></div>`}</div>`).join('')
      + lv.lines.map((l, j) => { const t = ctx.RELATION_TYPES[l.type] || {}; return `<button class="wp-pill" data-j="${j}" style="--c:${t.color || '#7fae4f'}">${TYPE_IC[l.type] || ''}<span>${esc(TYPE_LABEL[l.type] || t.name || '')}</span></button>`; }).join('');
    $('.wp-svg').innerHTML = lv.lines.map((l, j) => `<path data-j="${j}" stroke="${(ctx.RELATION_TYPES[l.type] || {}).color || '#7fae4f'}"/>`).join('');
    renderHand(); updateMist(); setLines();
    msg('tip', `${IC_LEAF}<span>${kids ? 'בחרו קלף מלמטה ושימו אותו בסימן השאלה' : 'כל חוט מספר על קשר בין שני יצורים. החץ מראה מי עושה למי'}</span>`);
    placeNodes();
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => placeNodes()); ro.observe($('.wp-board')); }
  }
  function renderHand() {
    const used = new Set(Object.values(filled));
    $('.wp-hand').innerHTML = lv.hand.filter((id) => !used.has(id)).map((id) => `<div class="wp-hc${sel === id ? ' sel' : ''}" data-id="${id}" role="button" aria-label="${esc(nm(id))}">${ctx.cardHTML(card(id))}</div>`).join('');
  }
  function updateMist() {
    const s = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const m = $('.wp-mist'); if (m) m.innerHTML = [0, 1, 2].map((k) => `<span class="${k < s ? '' : 'off'}">${IC_STAR}</span>`).join('');
  }
  function lineState(l) {
    const nf = (k) => lv.nodes[k].fixed || filled[k];
    if (lv.nodes[l.a].fixed && lv.nodes[l.b].fixed) return 'known';
    return nf(l.a) && nf(l.b) ? 'gold' : 'open';
  }
  function setLines(badSet) {
    const svg = $('.wp-svg'); if (!svg) return;
    lv.lines.forEach((l, j) => {
      const st = badSet && badSet.has(j) ? 'bad' : lineState(l);
      const p = svg.querySelector(`path[data-j="${j}"]`), pill = root.querySelector(`.wp-pill[data-j="${j}"]`);
      if (p && !p.classList.contains(st)) p.setAttribute('class', st);
      if (pill) { pill.classList.toggle('gold', st === 'gold'); pill.classList.toggle('bad', st === 'bad'); }
    });
  }
  // position cards / threads / pills in board pixels
  function placeNodes() {
    const board = $('.wp-board'); if (!board || !lv) return;
    const W = board.clientWidth, H = board.clientHeight;
    const any = board.querySelector('.wp-node > *'); if (!any) return;
    const cw = any.offsetWidth || 90, ch = any.offsetHeight || 128;
    const px = cw / 2 + Math.max(14, W * 0.03), py = ch / 2 + 12;
    const cols = Math.max(2, Math.ceil((lv.nodes.length + 1) / 2));
    const iw = Math.max(1, Math.min(W - 2 * px, cols * cw * 3)), ih = Math.max(1, H - 2 * py);
    const ox = (W - iw) / 2;
    const C = lv.pos.map((p) => ({ x: W - (ox + p.x * iw), y: py + p.y * ih })); // RTL: first column on the right
    board.querySelectorAll('.wp-node').forEach((el) => { const c = C[+el.dataset.k]; el.style.left = c.x + 'px'; el.style.top = c.y + 'px'; });
    const svg = $('.wp-svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const clip = (a, b, pad) => { // point where segment a→b leaves card rect around a
      const dx = b.x - a.x, dy = b.y - a.y; const hx = cw / 2 + pad, hy = ch / 2 + pad;
      const t = Math.min(dx ? hx / Math.abs(dx) : Infinity, dy ? hy / Math.abs(dy) : Infinity, 0.45);
      return { x: a.x + dx * t, y: a.y + dy * t };
    };
    lv.lines.forEach((l, j) => {
      const A = C[l.from], B = C[l.from === l.a ? l.b : l.a];
      const s = clip(A, B, 4), e = clip(B, A, 7);
      // arrow head at the target end
      const ang = Math.atan2(e.y - s.y, e.x - s.x), L = 13, w = 0.5;
      const h1 = { x: e.x - L * Math.cos(ang - w), y: e.y - L * Math.sin(ang - w) }, h2 = { x: e.x - L * Math.cos(ang + w), y: e.y - L * Math.sin(ang + w) };
      const p = svg.querySelector(`path[data-j="${j}"]`);
      p.setAttribute('d', `M${s.x.toFixed(1)} ${s.y.toFixed(1)}L${e.x.toFixed(1)} ${e.y.toFixed(1)}M${h1.x.toFixed(1)} ${h1.y.toFixed(1)}L${e.x.toFixed(1)} ${e.y.toFixed(1)}L${h2.x.toFixed(1)} ${h2.y.toFixed(1)}`);
      p.style.setProperty('--len', Math.ceil(Math.hypot(e.x - s.x, e.y - s.y) + 2 * L + 4));
      const pill = root.querySelector(`.wp-pill[data-j="${j}"]`);
      if (pill) { pill.style.left = ((s.x + e.x) / 2) + 'px'; pill.style.top = ((s.y + e.y) / 2) + 'px'; }
    });
  }
  function msg(kind, html) { const m = $('.wp-msg'); if (m) m.innerHTML = `<div class="${kind}">${html}</div>`; }

  function negSentence(l, k, cid) {
    const o = l.a === k ? l.b : l.a; const oid = lv.nodes[o].fixed ? lv.nodes[o].id : filled[o];
    const from = l.from === k ? cid : oid, to = l.from === k ? oid : cid;
    const verb = relVerb(l.type, from);
    const dn = (id) => defName(id, nm(id));
    if (l.type === 'partner') return `${dn(cid)} ו${dn(oid)} ${notTogether(cid, oid)}`;
    return `${dn(from)} לא ${joinObj(verb, to, nm(to))}`;
  }

  function place(cid, k, fromEl) {
    if (busy || done || !lv || lv.nodes[k].fixed || filled[k]) return false;
    sel = null;
    root.querySelectorAll('.wp-slot.armed').forEach((s) => s.classList.remove('armed'));
    const res = checkSlot(G, lv, k, cid, filled);
    const nodeEl = root.querySelector(`.wp-node[data-k="${k}"]`);
    const handEl = root.querySelector(`.wp-hc[data-id="${cid}"]`);
    if (res.ok) {
      filled[k] = cid;
      nodeEl.innerHTML = ctx.cardHTML(card(cid)); nodeEl.classList.add('fresh', 'ok');
      renderHand(); setLines(); placeNodes();
      ctx.sfx('link');
      const texts = res.good.map((g) => g.edge.text).filter(Boolean).slice(0, 2);
      msg('ok', `${IC_THREAD}<span>${esc(texts.join(' '))}</span>`);
      if (lv.slots.every((s) => filled[s])) finish();
      return true;
    }
    // gentle miss: the card shows in the slot, wiggles, and floats back to the hand
    mistakes++; updateMist(); busy = true;
    if (handEl) handEl.classList.add('gone');
    nodeEl.innerHTML = ctx.cardHTML(card(cid)); nodeEl.classList.add('badn');
    const badIdx = new Set(res.bad.map((l) => lv.lines.indexOf(l)));
    setLines(badIdx); placeNodes();
    ctx.sfx('click');
    const first = res.bad[0];
    msg('no', `${IC_LEAF}<span>${esc(first ? negSentence(first, k, cid) : 'זה לא מתאים כאן')}... נסו קלף אחר</span>`);
    const myLv = lv;
    ctx.later(() => {
      if (lv !== myLv || !nodeEl.isConnected) { busy = false; return; }
      const r = nodeEl.getBoundingClientRect();
      nodeEl.classList.remove('badn');
      nodeEl.innerHTML = `<div class="wp-slot" data-k="${k}" role="button" aria-label="מקום ריק"><b>?</b></div>`;
      setLines();
      const g = makeGhost(cid, r.left + r.width / 2, r.top + r.height / 2);
      const h = root.querySelector(`.wp-hc[data-id="${cid}"]`);
      const hr = h ? h.getBoundingClientRect() : r;
      requestAnimationFrame(() => { g.classList.add('fly'); g.style.left = (hr.left + hr.width / 2) + 'px'; g.style.top = (hr.top + hr.height / 2) + 'px'; g.style.transform = 'translate(-50%,-50%)'; });
      ctx.later(() => { killGhost(g); if (h) h.classList.remove('gone'); busy = false; }, 480);
    }, 750);
    return false;
  }

  function finish() {
    done = true;
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const key = lkey(biome, lv.idx);
    const prev = ST.stars[key] || 0;
    const firstSolve = prev === 0;
    ST.stars[key] = Math.max(prev, stars);
    // packs only at milestones: every PACK_EVERY levels of this biome with 3 stars
    const P = packInfo(biome);
    const earned = Math.floor(P.n / PACK_EVERY);
    const gotPack = earned > (ST.packs3[biome] || 0);
    if (gotPack) ST.packs3[biome] = earned;
    const newThree = stars === 3 && prev < 3;
    save();
    // at most ONE new card, and only the first time the level is solved: an answer card the player doesn't own yet first
    let got = null;
    if (firstSolve) {
      const own = ctx.owned() || {};
      const order = [...lv.answers, ...lv.nodes.filter((n) => n.fixed).map((n) => n.id)];
      const id = order.map((x) => G.biome + ':' + x).find((x) => ctx.CARD.get(x) && !own[x]);
      if (id) { ctx.addCards([id]); got = id; }
    }
    if (gotPack) ctx.grantPack(1);
    ctx.sfx('mission');
    const board = $('.wp-board');
    ctx.confetti(board, 26);
    const L = levelsFor(ctx, biome, kids).levels;
    const hasNext = lv.idx + 1 < L.length;
    const cardLine = got ? `<p class="wp-earn">${IC_LEAF}<span>קלף חדש לאלבום!</span></p><div class="wp-got">${ctx.cardHTML(ctx.CARD.get(got), { isNew: true })}</div>`
      : firstSolve ? `<p class="wp-earn soft">${IC_LEAF}<span>כל הקלפים של השלב הזה כבר באלבום שלכם.</span></p>`
      : `<p class="wp-earn soft">${IC_LEAF}<span>את השלב הזה כבר פתרתם – הקלפים שלו כבר באלבום</span></p>`;
    const packHtml = gotPack ? `<div class="wp-pack big">${IC_STAR}<span>${PACK_EVERY} שלבים עם 3 כוכבים – קיבלתם חבילת קלפים!</span></div>`
      : packLine(biome, 'wp-pack', newThree);
    ctx.later(() => {
      const d = $('.wp-done'); if (!d) return;
      d.innerHTML = `<div class="wp-dbox paper">
        <div class="wp-stars">${[0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}">${IC_STAR}</span>`).join('')}</div>
        <h2>כל הכבוד! הרשת שלמה</h2>
        <p>${stars === 3 ? 'בלי אף טעות – כל החוטים נכונים!' : stars === 2 ? 'כמעט בלי טעויות. יפה מאוד! בלי טעויות מקבלים 3 כוכבים.' : 'הצלחתם! אפשר לנסות שוב ולקבל עוד כוכבים.'}</p>
        <div class="wp-earned">${cardLine}${packHtml}</div>
        <div class="wp-btns">
          ${hasNext ? `<button class="wl-btn go" data-a="next">לשלב הבא${icon('arrowL')}</button>` : ''}
          <button class="wl-btn" data-a="again">${icon('again')}שוב</button>
          <button class="wl-btn" data-a="levels">${icon('levels')}בחירת שלב</button>
          <button class="wl-btn gold" data-a="album">${icon('album')}לאלבום</button>
        </div></div>`;
      d.hidden = false;
    }, 900);
  }

  function hint() {
    if (!lv || done || busy) return;
    const k = lv.slots.find((s) => !filled[s]); if (k == null) return;
    const id = lv.nodes[k].id;
    root.querySelectorAll('.hint').forEach((e) => e.classList.remove('hint'));
    const h = root.querySelector(`.wp-hc[data-id="${id}"]`), s = root.querySelector(`.wp-slot[data-k="${k}"]`);
    if (h) h.classList.add('hint'); if (s) s.classList.add('hint');
    ctx.sfx('select');
    msg('tip', `${IC_BULB}<span>הקלף המאיר מתאים למקום המאיר</span>`);
    ctx.later(() => { if (h) h.classList.remove('hint'); if (s) s.classList.remove('hint'); }, 3200);
  }

  /* ── drag & tap */
  function makeGhost(cid, x, y) {
    const g = document.createElement('div'); g.className = 'wp-ghost';
    g.innerHTML = ctx.cardHTML(card(cid)); g.style.left = x + 'px'; g.style.top = y + 'px';
    (ctx.root() || root).appendChild(g); ghosts.push(g); return g;
  }
  function killGhost(g) { if (g && g.parentNode) g.parentNode.removeChild(g); ghosts = ghosts.filter((x) => x !== g); }
  function slotAt(x, y) {
    const els = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
    for (const e of els) { const s = e && e.closest && e.closest('.wp-slot'); if (s && root.contains(s)) return s; }
    // forgiving drop: nearest empty slot within reach
    let best = null, bd = Infinity;
    root.querySelectorAll('.wp-slot').forEach((s) => { const r = s.getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y); if (d < Math.max(r.width, r.height) * 0.9 && d < bd) { bd = d; best = s; } });
    return best;
  }
  function cleanupDrag() {
    if (drag) { if (drag.ghost) killGhost(drag.ghost); if (drag.el) drag.el.classList.remove('lift'); }
    drag = null;
    root.querySelectorAll && root.querySelectorAll('.wp-slot.hot').forEach((s) => s.classList.remove('hot'));
  }
  function onDown(e) {
    const h = e.target.closest && e.target.closest('.wp-hc');
    if (!h || !root.contains(h) || busy || done || e.button > 0) return;
    e.preventDefault();
    drag = { id: h.dataset.id, el: h, x0: e.clientX, y0: e.clientY, ghost: null, hot: null, pid: e.pointerId };
  }
  function onMove(e) {
    if (!drag || (drag.pid != null && e.pointerId !== drag.pid)) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.ghost) {
      if (Math.hypot(dx, dy) < 7) return;
      drag.ghost = makeGhost(drag.id, e.clientX, e.clientY); drag.el.classList.add('lift'); ctx.sfx('select');
    }
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
    const s = slotAt(e.clientX, e.clientY);
    if (s !== drag.hot) { if (drag.hot) drag.hot.classList.remove('hot'); drag.hot = s; if (s) s.classList.add('hot'); }
  }
  function onUp(e) {
    if (!drag || (drag.pid != null && e.pointerId !== drag.pid)) return;
    const d = drag; drag = null;
    if (d.hot) d.hot.classList.remove('hot');
    if (!d.ghost) { // a tap: select this card (tap a slot next)
      sel = sel === d.id ? null : d.id; ctx.sfx('click');
      root.querySelectorAll('.wp-hc').forEach((x) => x.classList.toggle('sel', x.dataset.id === sel));
      root.querySelectorAll('.wp-slot').forEach((s) => s.classList.toggle('armed', !!sel));
      if (sel) msg('tip', `${IC_LEAF}<span>עכשיו לחצו על מקום ריק ברשת</span>`);
      return;
    }
    const s = slotAt(e.clientX, e.clientY);
    killGhost(d.ghost); d.el.classList.remove('lift');
    if (s) place(d.id, +s.dataset.k);
  }
  function onClick(e) {
    const t = e.target.closest && e.target.closest('[data-a],[data-b],[data-i],.wp-slot,.wp-pill');
    if (!t || !root.contains(t)) return;
    if (t.classList.contains('wp-slot')) { if (sel) place(sel, +t.dataset.k); else msg('tip', `${IC_LEAF}<span>${kids ? 'בחרו קלף מלמטה' : 'בחרו קלף מלמטה וגררו אותו לכאן'}</span>`); return; }
    if (t.classList.contains('wp-pill')) {
      const l = lv && lv.lines[+t.dataset.j]; if (!l) return;
      const st = lineState(l);
      if (st === 'open') { msg('tip', `${TYPE_IC[l.type] || ''}<span>החוט הזה מחכה לקלף: ${esc((ctx.RELATION_TYPES[l.type] || {}).name || '')}</span>`); return; }
      const fid = (k) => (lv.nodes[k].fixed ? lv.nodes[k].id : filled[k]);
      const e2 = G.find(l.type, fid(l.from), fid(l.from === l.a ? l.b : l.a)) || l.edge;
      msg('ok', `${IC_THREAD}<span>${esc(e2.text)}</span>`); return;
    }
    if (t.dataset.b) { if (t.dataset.b !== biome) { biome = t.dataset.b; ST.biome = biome; save(); ctx.sfx('click'); renderPicker(); } return; }
    if (t.dataset.i != null && t.classList.contains('wp-lvl')) { ctx.sfx('click'); startLevel(+t.dataset.i); return; }
    const a = t.dataset.a;
    if (a === 'levels') { ctx.sfx('click'); if (ro) { ro.disconnect(); ro = null; } renderPicker(); }
    else if (a === 'hint') hint();
    else if (a === 'next') { ctx.sfx('click'); if (ro) { ro.disconnect(); ro = null; } startLevel(lv.idx + 1); }
    else if (a === 'again') { ctx.sfx('click'); if (ro) { ro.disconnect(); ro = null; } startLevel(lv.idx); }
    else if (a === 'album') { ctx.sfx('click'); ctx.toAlbum(); }
  }
  on(root, 'pointerdown', onDown);
  // capture phase: the hub stops pointer events from bubbling past #wol-learn
  on(window, 'pointermove', onMove, true);
  on(window, 'pointerup', onUp, true);
  on(window, 'pointercancel', () => cleanupDrag(), true);
  on(root, 'click', onClick);
  on(window, 'resize', () => placeNodes());

  // debug hook for scripted tests
  const dbg = {
    level: () => lv && { biome, idx: lv.idx, nodes: lv.nodes.map((n) => (n.fixed ? '' : '?') + n.id), lines: lv.lines.map((l) => `${lv.nodes[l.from].id} ${l.type} ${lv.nodes[l.from === l.a ? l.b : l.a].id}`), answers: lv.answers, decoys: lv.decoys, hand: lv.hand, filled: { ...filled }, mistakes, done },
    solve: () => { if (!lv) return false; busy = false; for (const k of lv.slots) if (!filled[k]) place(lv.nodes[k].id, k); return done; },
    wrong: () => { if (!lv || !lv.decoys.length) return false; const k = lv.slots.find((s) => !filled[s]); return k != null && place(lv.decoys[0], k) === false; },
    open: (b, i = 0) => { if (BIOMES.includes(b)) biome = b; startLevel(i); return !!lv; },
    picker: () => { renderPicker(); return true; },
    levels: (b = biome) => levelsFor(ctx, b, kids).levels.map((l) => ({ idx: l.idx, n: l.nodes.length, empty: l.slots.length, hand: l.hand.length, lines: l.lines.length })),
  };
  try { window.__wpDebug = dbg; } catch (e) { /* no window */ }

  if (opts.level != null) startLevel(+opts.level); else renderPicker();

  return {
    destroy() {
      cleanupDrag(); ghosts.slice().forEach(killGhost);
      offs.forEach((f) => f()); offs.length = 0;
      if (ro) { ro.disconnect(); ro = null; }
      lv = null;
      try { if (window.__wpDebug === dbg) delete window.__wpDebug; } catch (e) { /* */ }
    },
  };
}

// exported for offline validation (node)
export const _internals = { buildGraph, levelsFor, checkSlot, params };
