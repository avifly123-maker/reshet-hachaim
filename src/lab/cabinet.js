// מעבדת רובו־דע – the cabinet's own world (19.10), beside "המשקל הרועד" and "ראינו או חשבנו?" (thinking.js).
//   האוסף שלנו         the shelves: six things that are always there, and shelves that fill from the rest of the game
//                       (microscope samples, solved mysteries, jars from the deep expedition, patents from the inventors,
//                       clues solved here); every thing opens big, with a magnifying glass
//   ממיינים כמו חוקרים   the child sorts eight things by a rule of their own and רובו־דע guesses it; then he sorts and the
//                       child guesses; two rules can fit the same boxes
//   מי השאיר את זה?     seven clues from the grove and the reef; two magnifying glasses each; who left it?
// Facts: docs/sources.md ("The lab's stations"). Progress: labProgress().st.collection / .sort / .clues (and the stores
// of the other games, read only). Badges lab:collect (20 things), lab:sort, lab:clues.
import { esc, icon } from '../ui/ui.js';
import { stationShell, addCss } from './station-kit.js';
import { COMMON_T, MENU_T, COLL_T, SORT_T, CLUES_T } from './station-text.js';
import { stUpdate, stOf, labProgress } from './progress.js';
import { SAMPLES } from './samples.js';
import { SAMPLES_K } from './kids-text.js';
import { CASES } from '../research/cases/index.js';
import { researchProgress } from '../research/progress.js';
import { PROBLEMS } from '../data/inventions.js';
import { PROBLEMS_K } from '../data/inventions-kids.js';
import { grant as grantBadge, tally, hasBadge } from '../core/badges-store.js';

// ───────────────────────────────────────── drawings (viewBox 0 0 100 100), also used as pictures in the zoom view
const D = {
  cone: '<ellipse cx="50" cy="54" rx="24" ry="34" fill="#8a5a2a"/>' + [...Array(5)].map((_, r) => [...Array(4)].map((__, c) => `<path d="M${30 + c * 13 + (r % 2) * 6} ${28 + r * 12}q6 -7 12 0q-6 5 -12 0z" fill="#b07a3a" stroke="#5a3a1a" stroke-width="1.2"/>`).join('')).join('') + '<path d="M50 20V12" stroke="#6a4a2a" stroke-width="4"/>',
  acorn: '<ellipse cx="50" cy="60" rx="20" ry="26" fill="#b8843a"/><ellipse cx="44" cy="54" rx="5" ry="10" fill="#d8a85a" opacity=".6"/><path d="M27 42Q50 22 73 42Q50 50 27 42Z" fill="#7a5a2a"/><g stroke="#5a3a1a" stroke-width="1.2"><path d="M33 38l6 4M42 33l5 5M52 32l3 6M61 34l1 6M68 38l-2 5"/></g><path d="M50 28V18" stroke="#5a3a1a" stroke-width="4" stroke-linecap="round"/>',
  jayfeather: '<path d="M50 92L50 10" stroke="#5a5a5a" stroke-width="2"/><path d="M50 14Q74 30 70 64Q60 82 50 88Q40 82 30 64Q26 30 50 14Z" fill="#7ab8e8"/>' + [...Array(7)].map((_, k) => `<path d="M32 ${30 + k * 8}Q40 ${27 + k * 8} 47.5 ${27 + k * 8}M52.5 ${27 + k * 8}Q60 ${27 + k * 8} 68 ${30 + k * 8}" stroke="#16202a" stroke-width="2.4" fill="none"/>`).join('') + '<path d="M50 14Q74 30 70 64" stroke="#fff" stroke-width="1.5" fill="none" opacity=".5"/>',
  carob: '<path d="M14 70Q30 30 70 22Q88 20 86 30Q70 36 48 56Q30 74 18 80Q10 80 14 70Z" fill="#4a2a14"/><path d="M22 70Q38 46 76 28" stroke="#6a4a2a" stroke-width="2" fill="none"/>' + [...Array(6)].map((_, k) => `<ellipse cx="${26 + k * 9}" cy="${66 - k * 7}" rx="2.5" ry="2" fill="#7a5a3a"/>`).join(''),
  quill: '<path d="M14 86L86 14" stroke="#f2efe6" stroke-width="7" stroke-linecap="round"/>' + [...Array(6)].map((_, k) => `<path d="M${20 + k * 12} ${80 - k * 12}l7 -7" stroke="#16161a" stroke-width="7.5" stroke-linecap="butt"/>`).join('') + '<path d="M84 16l5 -5" stroke="#16161a" stroke-width="3" stroke-linecap="round"/>',
  pineseed: '<path d="M30 70Q34 30 70 18Q78 26 66 46Q52 66 36 74Z" fill="#c8a46a" stroke="#8a6a3a" stroke-width="1.5"/><path d="M36 70Q48 46 68 24" stroke="#8a6a3a" stroke-width="1" fill="none"/><ellipse cx="32" cy="74" rx="9" ry="6" fill="#4a3220" transform="rotate(-30 32 74)"/>',
  shell: '<path d="M50 84L18 42Q22 18 50 14Q78 18 82 42Z" fill="#f2d8c8" stroke="#c8987a" stroke-width="2"/>' + [...Array(7)].map((_, k) => `<path d="M50 84L${22 + k * 9.3} ${36 - Math.sin(k / 6 * Math.PI) * 18}" stroke="#d8a88a" stroke-width="2"/>`).join('') + '<path d="M38 84h24l-4 8h-16z" fill="#e8c4b0"/>',
  sponge: '<path d="M22 80Q14 50 26 30Q40 16 58 22Q82 28 80 54Q78 80 60 84Q40 88 22 80Z" fill="#e8c04a"/>' + [[34, 40], [52, 34], [64, 50], [44, 58], [30, 66], [58, 70], [48, 46]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="5" fill="#b8902a"/>`).join(''),
  seagrass: [...Array(6)].map((_, k) => `<path d="M${30 + k * 8} 90Q${26 + k * 9} 50 ${34 + k * 7 + (k % 2 ? 6 : -6)} ${14 + (k % 3) * 8}" stroke="${k % 2 ? '#4f9a3a' : '#6ab84a'}" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('') + '<path d="M20 90h60" stroke="#c8b48a" stroke-width="5" stroke-linecap="round"/>',
  owlfeather: '<path d="M50 92L50 10" stroke="#a89878" stroke-width="2"/><path d="M50 12Q76 30 72 64Q62 84 50 88Q38 84 28 64Q24 30 50 12Z" fill="#f2e6cc"/>' + [[42, 34], [58, 42], [44, 56], [60, 62], [50, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#8a6a4a"/>`).join('') + [...Array(10)].map((_, k) => `<path d="M${30 - (k % 2)} ${30 + k * 5}l-5 -2" stroke="#f2e6cc" stroke-width="2" stroke-linecap="round"/>`).join(''),
};
const svgUrl = (body, vb = '0 0 100 100') => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`);
const folder = (col) => `<path d="M14 30h26l6 8h40v46H14z" fill="${col}"/><path d="M14 42h72v42H14z" fill="${col}" opacity=".85"/><path d="M24 56h40M24 66h30" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
const ZONE_COL = { amazon: '#2f7a4a', grove: '#8a6a2a', reef: '#1f7a9a' };
const scroll = '<path d="M24 22h52v56H24z" fill="#fbf2d8" stroke="#c8a46a" stroke-width="2"/><path d="M20 18q4 -6 8 0v64q-4 6 -8 0z M72 18q4 -6 8 0v64q-4 6 -8 0z" fill="#e0c48a"/><path d="M32 36h36M32 46h30M32 56h34" stroke="#8a6a3a" stroke-width="3" stroke-linecap="round"/><circle cx="62" cy="68" r="7" fill="#d8302a"/>';
const jar = (k) => `<path d="M30 28h40v8q8 6 8 16v30q0 8 -8 8h-40q-8 0 -8 -8v-30q0 -10 8 -16z" fill="#dff0f4" stroke="#8ab0c0" stroke-width="2"/><path d="M28 22h44v8h-44z" fill="#8a6a3a"/><path d="M24 62q26 -8 52 0v20q0 6 -6 6h-40q-6 0 -6 -6z" fill="${['#5ab8a8', '#e0a43a', '#8a5ab8', '#d8606a'][k % 4]}" opacity=".7"/>`;

// ═════════════════════════════════════════ 1. האוסף שלנו
const START = ['cone', 'acorn', 'jayfeather', 'carob', 'quill', 'pineseed'];
// every shelf with its things, from the stores of the whole game (read only)
export function collection(kids, thumbs = {}) {
  const O = (v, x) => { const s = v && typeof v === 'object' && 'f' in v ? (kids ? v.k : v.f) : v; const t = Array.isArray(s) ? s.join(' ') : String(s ?? ''); return x ? t.replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m)) : t; };
  const P = labProgress();
  const shelves = [];
  shelves.push({ id: 'start', items: START.map((id) => ({ key: 'start:' + id, name: O(COLL_T.items[id].name), from: O(COLL_T.items[id].from), fact: O(COLL_T.items[id].fact), img: svgUrl(D[id]) })), ghosts: 0 });
  const seen = SAMPLES.filter((s) => P.seen[s.id]);
  shelves.push({ id: 'scope', items: seen.map((s) => { const K = kids ? (SAMPLES_K[s.id] || s) : s; return { key: 'scope:' + s.id, name: K.name, fact: K.found, img: thumbs[s.species] || svgUrl(D.shell), round: true }; }), ghosts: SAMPLES.length - seen.length });
  const R = researchProgress().cases || {};
  const solved = CASES.filter((c) => R[c.id]);
  shelves.push({ id: 'cases', items: solved.map((c) => { const st = (R[c.id].stars || []).filter(Boolean).length; return { key: 'case:' + c.id, name: kids ? c.title : (c.plainTitle || c.title), fact: O(COLL_T.caseText, { stars: st }), img: svgUrl(folder(ZONE_COL[c.zone] || '#5a4a8a')) }; }), ghosts: CASES.length - solved.length });
  let n = 0; try { n = tally('deep:samples'); } catch (e) { /* */ }
  const jars = [...Array(Math.min(n, 10))].map((_, k) => ({ key: 'jar:' + k, name: O(COLL_T.jar, { n }), fact: O(COLL_T.jarText, { n }), img: svgUrl(jar(k)) }));
  let rare = false; try { rare = hasBadge('b_deeprare'); } catch (e) { /* */ }
  if (rare) jars.push({ key: 'jar:rare', name: O(COLL_T.rare), fact: O(COLL_T.rareText), img: svgUrl(jar(2) + '<circle cx="50" cy="66" r="9" fill="#ffd978" stroke="#fff" stroke-width="2"/>') });
  shelves.push({ id: 'jars', items: jars, ghosts: jars.length ? 0 : 3 });
  const pats = Object.keys(P.solved || {}).map((id) => PROBLEMS.find((p) => p.id === id)).filter(Boolean);
  const patItems = pats.map((p) => ({ key: 'pat:' + p.id, name: kids ? ((PROBLEMS_K[p.id] || {}).title || p.title) : p.title, fact: O(COLL_T.patentText), img: svgUrl(scroll) }));
  if (P.inventions && P.inventions.sharkskin && !pats.some((p) => p.id === 'swim')) patItems.unshift({ key: 'pat:sharkskin', name: O(COLL_T.sharkskin), fact: O(COLL_T.patentText), img: svgUrl(scroll) });
  shelves.push({ id: 'patents', items: patItems, ghosts: patItems.length ? 0 : 3 });
  const cs = (stOf('clues').solved) || {};
  const clueItems = CLUE_IDS.filter((id) => cs[id]).map((id) => ({ key: 'clue:' + id, name: O(CLUES_T.clues[id].name), fact: O(CLUES_T.clues[id].yes), img: svgUrl(CLUE_PIC[id], '0 0 200 120'), wide: true }));
  shelves.push({ id: 'clues', items: clueItems, ghosts: CLUE_IDS.length - clueItems.length });
  const count = shelves.reduce((a, s) => a + s.items.length, 0);
  return { shelves, count };
}
export function collectionCount() { try { return collection(false).count; } catch (e) { return START.length; } }
export function shelfPeek(thumbs) {   // a few things for the cabinet's menu
  const { shelves } = collection(false, thumbs);
  const all = shelves.flatMap((s) => s.items);
  return `<div class="ls-shelfpeek">${all.slice(0, 9).map((it) => `<img src="${it.img}" alt="">`).join('')}</div>`;
}

export function openCollection(root, ctx) {
  addCss('cb-css', CB_CSS);
  const S = stationShell(root, { cls: 'coll', ic: 'satchel', title: COLL_T.title, small: MENU_T.cabinet.title, sub: '', ...ctx });
  const { T, O, kids } = S;
  const thumbs = ctx.thumbs || {};
  let C = collection(kids, thumbs), zoomed = null;
  S.el.querySelector('.ls-sub').textContent = O(COLL_T.sub, { n: C.count });
  function render() {
    S.body.innerHTML = `<div class="cb-shelves">${C.shelves.map((s) => `<section class="cb-shelf ${s.items.length ? '' : 'empty'}"><h3>${esc(O(COLL_T.shelves[s.id].name))} <small>${s.ghosts ? esc(O(COMMON_T.of, { n: s.items.length, all: s.items.length + s.ghosts })) : s.items.length}</small></h3>
        <div class="cb-row">${s.items.map((it, i) => `<button class="cb-it ${it.round ? 'round' : ''} ${it.wide ? 'wide' : ''}" data-k="${esc(it.key)}"><img src="${it.img}" alt=""><span>${esc(it.name)}</span></button>`).join('')}
        ${s.ghosts ? [...Array(Math.min(s.ghosts, s.items.length ? 2 : 3))].map(() => '<i class="cb-ghost">?</i>').join('') + (COLL_T.shelves[s.id].how ? `<em class="cb-how">${icon('lock')}${esc(O(COLL_T.shelves[s.id].how))}</em>` : '') : ''}</div></section>`).join('')}</div>
      ${zoomed ? zoomHTML(zoomed) : ''}`;
    if (zoomed) wireZoom();
  }
  function zoomHTML(it) {
    return `<div class="cb-zoom" role="dialog" aria-label="${esc(it.name)}"><div class="cb-zcard">
      <div class="cb-zpic ${it.wide ? 'wide' : ''}" style="background-image:url('${it.img}')"><i class="cb-lens" hidden style="background-image:url('${it.img}')"></i></div>
      <div class="cb-ztx"><h3>${esc(it.name)}</h3>${it.from ? `<small>${esc(O(COLL_T.from))} ${esc(it.from)}</small>` : ''}<p>${esc(it.fact || '')}</p>
        <small class="cb-lhelp">${icon('search')}${esc(O(COLL_T.lensHelp))}</small>
        <button class="ls-soft" data-act="unzoom">${icon('arrowR')}${esc(O(COMMON_T.close))}</button></div></div></div>`;
  }
  function wireZoom() {
    const pic = S.el.querySelector('.cb-zpic'), lens = S.el.querySelector('.cb-lens');
    const move = (e) => {
      const b = pic.getBoundingClientRect(); const x = e.clientX - b.left, y = e.clientY - b.top;
      if (x < 0 || y < 0 || x > b.width || y > b.height) { lens.hidden = true; return; }
      lens.hidden = false; const L = lens.offsetWidth || 120, Z = 2.6;
      lens.style.left = (x - L / 2) + 'px'; lens.style.top = (y - L / 2) + 'px';
      lens.style.backgroundSize = `${b.width * Z}px ${b.height * Z}px`;
      lens.style.backgroundPosition = `${-(x * Z - L / 2)}px ${-(y * Z - L / 2)}px`;
    };
    pic.addEventListener('pointermove', move); pic.addEventListener('pointerdown', move);
    pic.addEventListener('pointerleave', () => { lens.hidden = true; });
  }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) { if (zoomed && e.target.classList.contains('cb-zoom')) { zoomed = null; render(); } return; }
    if (b.dataset.act === 'unzoom') { zoomed = null; S.sfx('click'); render(); return; }
    if (b.dataset.k) {
      zoomed = C.shelves.flatMap((s) => s.items).find((it) => it.key === b.dataset.k); S.sfx('select'); render();
      S.talk(T(COLL_T.look), 'curious');
      const R = stUpdate('collection', (r) => { r.looked = r.looked || {}; r.looked[b.dataset.k] = 1; });
      void R;
    }
  });
  S.el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && zoomed) { zoomed = null; render(); } });
  render();
  const prev = stOf('collection').max || 0;
  stUpdate('collection', (r) => { r.max = Math.max(r.max || 0, C.count); });
  if (C.count >= 20) { try { grantBadge('lab:collect'); } catch (e) { /* */ } }
  S.talk(C.count >= 20 ? T(COLL_T.many, { n: C.count }) : prev ? T(COLL_T.firstOpen, { n: C.count }) : T(COLL_T.intro), 'happy');
  return { close: S.close, debug: { get count() { return C.count; }, zoom: (k) => { zoomed = C.shelves.flatMap((s) => s.items).find((it) => it.key === k) || null; render(); } } };
}

// ═════════════════════════════════════════ 2. ממיינים כמו חוקרים
// what every thing is (seeds and colour split the eight the same way: two rules can fit one sorting)
const SORT_ITEMS = {
  feather: { kingdom: 'b', home: 'a', feel: 'b', shape: 'a', seeds: 'b', color: 'b', pic: 'jayfeather' },
  shell: { kingdom: 'b', home: 'b', feel: 'a', shape: 'b', seeds: 'b', color: 'b', pic: 'shell' },
  acorn: { kingdom: 'a', home: 'a', feel: 'a', shape: 'b', seeds: 'a', color: 'a', pic: 'acorn' },
  cone: { kingdom: 'a', home: 'a', feel: 'a', shape: 'b', seeds: 'a', color: 'a', pic: 'cone' },
  quill: { kingdom: 'b', home: 'a', feel: 'a', shape: 'a', seeds: 'b', color: 'b', pic: 'quill' },
  carob: { kingdom: 'a', home: 'a', feel: 'a', shape: 'a', seeds: 'a', color: 'a', pic: 'carob' },
  sponge: { kingdom: 'b', home: 'b', feel: 'b', shape: 'b', seeds: 'b', color: 'b', pic: 'sponge' },
  seagrass: { kingdom: 'a', home: 'b', feel: 'b', shape: 'a', seeds: 'b', color: 'b', pic: 'seagrass' },
};
const RULES = ['kingdom', 'home', 'feel', 'shape', 'seeds', 'color'];
const IDS = Object.keys(SORT_ITEMS);
// which rules give exactly these two boxes (either way round)
export function rulesFor(boxA) {
  const A = new Set(boxA);
  return RULES.filter((r) => { const ra = new Set(IDS.filter((id) => SORT_ITEMS[id][r] === 'a')); const same = (X) => X.size === A.size && [...X].every((x) => A.has(x)); return same(ra) || same(new Set(IDS.filter((id) => !ra.has(id)))); });
}
export function openSort(root, ctx) {
  addCss('cb-css', CB_CSS);
  const S = stationShell(root, { cls: 'sort', ic: 'cards', title: SORT_T.title, small: MENU_T.cabinet.title, sub: SORT_T.sub, ...ctx });
  const { T, O } = S;
  let mode = 'you', where = {}, picked = null, phase = 'sort', guessed = null, roboRule = null, lastRule = null;
  const name = (id) => O(SORT_T.items[id]);
  const P = () => stOf('sort');
  function roboSort() {
    const choices = RULES.filter((r) => r !== lastRule); roboRule = choices[Math.floor(Math.random() * choices.length)]; lastRule = roboRule;
    where = {}; for (const id of IDS) where[id] = SORT_ITEMS[id][roboRule] === 'a' ? 'A' : 'B';
    phase = 'guessRobo'; guessed = null;
  }
  function render() {
    const R = P();
    const thing = (id) => `<button class="cb-thing ${picked === id ? 'on' : ''}" data-id="${id}" ${mode === 'robo' ? 'disabled' : ''} aria-pressed="${picked === id}"><img src="${svgUrl(D[SORT_ITEMS[id].pic])}" alt=""><span>${esc(name(id))}</span></button>`;
    const box = (b) => `<div class="cb-box b${b}" data-box="${b}" role="button" tabindex="0" aria-label="${esc(O(SORT_T.boxName, { x: b === 'A' ? 'א' : 'ב' }))}"><b>${esc(O(b === 'A' ? SORT_T.boxA : SORT_T.boxB))}</b><div>${IDS.filter((id) => where[id] === b).map(thing).join('')}</div></div>`;
    const table = IDS.filter((id) => !where[id]);
    const ruleBtns = (attr) => `<div class="cb-rules">${RULES.map((r) => `<button class="ls-soft" data-${attr}="${r}">${esc(O(SORT_T.rules[r].name))}</button>`).join('')}${attr === 'mine' ? `<button class="ls-soft" data-mine="secret">${esc(O(SORT_T.secret))}</button>` : ''}</div>`;
    S.body.innerHTML = `<div class="cb-sort">
      <nav class="cb-modes"><button data-mode="you" class="${mode === 'you' ? 'on' : ''}">${esc(O(SORT_T.modeYou))}</button><button data-mode="robo" class="${mode === 'robo' ? 'on' : ''}">${esc(O(SORT_T.modeRobo))}</button>
        <small>${esc(O(SORT_T.score, { a: R.robotGuessed || 0, b: R.childGuessed || 0 }))}</small></nav>
      <div class="cb-boxes">${box('A')}${box('B')}</div>
      ${table.length ? `<div class="cb-table" data-box="T"><small>${esc(O(SORT_T.table))} · ${esc(O(SORT_T.tapHelp))}</small><div>${table.map(thing).join('')}</div></div>` : ''}
      <div class="cb-acts">${mode === 'you' && phase === 'sort' ? `<button class="ls-go" data-act="guess">${icon('bulb')}${esc(O(SORT_T.guess))}</button><button class="ls-soft" data-act="clear">${icon('undo')}${esc(O(SORT_T.clear))}</button>` : ''}
        ${mode === 'you' && phase === 'ask' ? `<small>${esc(O(SORT_T.whatRule))}</small>${ruleBtns('mine')}` : ''}
        ${mode === 'robo' && phase === 'guessRobo' ? `<small>${esc(O(SORT_T.whatRule))}</small>${ruleBtns('rr')}` : ''}
        ${mode === 'robo' && phase === 'roboDone' ? `<button class="ls-go" data-act="robonew">${icon('cards')}${esc(O(SORT_T.roboNew))}</button>` : ''}
        ${mode === 'you' && phase === 'done' ? `<button class="ls-soft" data-act="clear">${icon('undo')}${esc(O(SORT_T.clear))}</button>` : ''}</div></div>`;
  }
  function badgeCheck() { const R = P(); if ((R.robotGuessed || 0) >= 1 && (R.childGuessed || 0) >= 2) { try { grantBadge('lab:sort'); } catch (e) { /* */ } } }
  function guess() {
    const A = IDS.filter((id) => where[id] === 'A'), B = IDS.filter((id) => where[id] === 'B');
    if (A.length + B.length < IDS.length) { S.talk(T(SORT_T.notAll), 'curious'); S.sfx('invalid'); return; }
    if (!A.length || !B.length) { S.talk(T(SORT_T.oneBox), 'oops'); S.sfx('invalid'); return; }
    const fit = rulesFor(A);
    S.sfx('click');
    if (fit.length === 1) {
      phase = 'done'; stUpdate('sort', (r) => { r.robotGuessed = (r.robotGuessed || 0) + 1; }); render(); S.sfx('quizRight');
      S.talk(T(SORT_T.gotIt, { rule: O(SORT_T.rules[fit[0]].name) }), 'wow'); badgeCheck();
    } else if (fit.length > 1) {
      phase = 'done'; stUpdate('sort', (r) => { r.robotGuessed = (r.robotGuessed || 0) + 1; r.two = 1; }); render(); S.sfx('discover');
      S.talk(T(SORT_T.two, { a: O(SORT_T.rules[fit[0]].name), b: O(SORT_T.rules[fit[1]].name) }), 'curious'); badgeCheck();
    } else { phase = 'ask'; render(); S.talk(T(SORT_T.giveUp), 'oops'); }
  }
  function mine(r) {
    if (r === 'secret') { phase = 'done'; stUpdate('sort', (x) => { x.secret = (x.secret || 0) + 1; }); render(); S.talk(T(SORT_T.secretSay), 'happy'); return; }
    // which item breaks the rule the child names: the box that holds most of the rule's first group is its box
    const A = IDS.filter((id) => where[id] === 'A');
    const aIsA = A.filter((id) => SORT_ITEMS[id][r] === 'a').length >= A.length / 2;
    const bad = IDS.find((id) => (where[id] === 'A') !== (aIsA ? SORT_ITEMS[id][r] === 'a' : SORT_ITEMS[id][r] === 'b'));
    if (!bad) { phase = 'done'; render(); S.talk(T(SORT_T.fits), 'happy'); return; }
    picked = bad; render();
    S.talk(T(SORT_T.breaks, { item: name(bad), box: O(where[bad] === 'A' ? SORT_T.boxA : SORT_T.boxB) }), 'curious');
  }
  function roboGuess(r) {
    const A = IDS.filter((id) => where[id] === 'A'); const fit = rulesFor(A);
    if (fit.includes(r)) {
      phase = 'roboDone'; stUpdate('sort', (x) => { x.childGuessed = (x.childGuessed || 0) + 1; }); render(); S.sfx('quizRight');
      S.talk(T(r === roboRule ? SORT_T.roboRight : SORT_T.roboAlso), 'wow'); badgeCheck();
    } else {
      const bad = IDS.find((id) => { const g = SORT_ITEMS[id][r]; const ga = IDS.filter((x) => where[x] === 'A' && SORT_ITEMS[x][r] === g).length; const gb = IDS.filter((x) => where[x] === 'B' && SORT_ITEMS[x][r] === g).length; return (where[id] === 'A') !== (ga >= gb); }) || IDS[0];
      S.sfx('quizWrong'); S.talk(T(SORT_T.roboWrong, { item: name(bad) }), 'curious');
      const el = S.el.querySelector(`.cb-thing[data-id="${bad}"]`); if (el) { el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint'); }
    }
  }
  function moveTo(b) { if (!picked || mode !== 'you') return; if (b === 'T') delete where[picked]; else where[picked] = b; phase = 'sort'; S.sfx('place'); if (picked === 'sponge' && !P().sponge && b !== 'T') { stUpdate('sort', (r) => { r.sponge = 1; }); S.talk(T(SORT_T.spongeFact), 'wow'); } picked = null; render(); }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && b.dataset.mode) { mode = b.dataset.mode; picked = null; S.sfx('click'); if (mode === 'robo') { roboSort(); render(); S.talk(T(SORT_T.roboIntro), 'curious'); } else { where = {}; phase = 'sort'; render(); S.talk(T(SORT_T.intro), 'happy'); } return; }
    if (b && b.dataset.id && mode === 'you') {
      if (picked === b.dataset.id) { picked = null; render(); return; }
      if (picked && b.closest('[data-box]') && where[b.dataset.id] !== where[picked]) { moveTo(b.closest('[data-box]').dataset.box); return; }
      picked = b.dataset.id; S.sfx('click'); render(); return;
    }
    if (b && b.dataset.act === 'guess') { guess(); return; }
    if (b && b.dataset.act === 'clear') { where = {}; phase = 'sort'; picked = null; S.sfx('click'); render(); return; }
    if (b && b.dataset.act === 'robonew') { roboSort(); render(); S.talk(T(SORT_T.roboIntro), 'curious'); return; }
    if (b && b.dataset.mine) { mine(b.dataset.mine); return; }
    if (b && b.dataset.rr) { roboGuess(b.dataset.rr); return; }
    const box = e.target.closest('[data-box]'); if (box) moveTo(box.dataset.box);
  });
  S.el.addEventListener('keydown', (e) => { const box = e.target.closest && e.target.closest('.cb-box'); if (box && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); moveTo(box.dataset.box); } });
  render(); S.talk(T(SORT_T.intro), 'happy');
  return { close: S.close, debug: { put: (id, b) => { where[id] = b; render(); }, guess, mine, roboGuess, robo: () => { mode = 'robo'; roboSort(); render(); return roboRule; }, rulesFor } };
}

// ═════════════════════════════════════════ 3. מי השאיר את זה?
const CLUE_IDS = ['tracks', 'owlfeather', 'jayfeather', 'quill', 'shells', 'husks', 'bites'];
const SUSPECTS = {
  tracks: ['gazelle', 'fox', 'porcupine', 'hyrax'], owlfeather: ['owl', 'jay', 'hoopoe', 'chukar'], jayfeather: ['jay', 'owl', 'blackbird', 'hoopoe'],
  quill: ['porcupine', 'hedgehog', 'agama', 'fox'], shells: ['octopus', 'moray', 'hermit', 'parrotfish'], husks: ['harvesterant', 'spinymouse', 'chukar', 'honeybee'],
  bites: ['parrotfish', 'urchin', 'surgeonfish', 'turtle'],
};
const heart = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-6 -9q-5 6 -3 14q2 3 6 2q-1-8-3-16z" fill="#4a3220"/><path d="M6 -9q5 6 3 14q-2 3-6 2q1-8 3-16z" fill="#4a3220"/></g>`;
const CLUE_PIC = {
  tracks: '<rect width="200" height="120" fill="#b08a5a"/><ellipse cx="34" cy="40" rx="40" ry="24" fill="#6aa8c8"/>' + [[176, 100, -70], [150, 86, -70], [124, 74, -68], [98, 62, -66]].map(([x, y, r]) => heart(x, y, r)).join(''),
  owlfeather: `<rect width="200" height="120" fill="#e8dcc0"/><g transform="translate(50 6) scale(1.08)">${D.owlfeather}</g><rect x="130" y="20" width="50" height="44" rx="4" fill="#a87a4a"/><circle cx="155" cy="40" r="8" fill="#3a2a1a"/>`,
  jayfeather: `<rect width="200" height="120" fill="#d8c8a0"/><g transform="translate(46 6) scale(1.08)">${D.jayfeather}</g><g transform="translate(130 60) scale(.5)">${D.acorn}</g><g transform="translate(150 70) scale(.4)">${D.acorn}</g>`,
  quill: `<rect width="200" height="120" fill="#c8a878"/><path d="M0 70Q100 50 200 74V120H0z" fill="#b8956a"/><g transform="translate(40 4) scale(1.1)">${D.quill}</g>`,
  shells: '<rect width="200" height="120" fill="#3a8ab0"/><path d="M0 90Q100 80 200 92V120H0z" fill="#e8d8b0"/><path d="M120 20Q170 10 196 30V96H120Q132 60 120 20Z" fill="#8a8478"/><path d="M150 52q8 6 4 22" stroke="#2a2a28" stroke-width="10" fill="none" stroke-linecap="round"/>'
    + [[110, 92], [96, 98], [124, 100], [84, 94], [104, 104], [70, 100]].map(([x, y], k) => `<g transform="translate(${x} ${y}) scale(.22) rotate(${k * 40})"><path d="M50 84L18 42Q22 18 50 14Q78 18 82 42Z" fill="#f2d8c8" stroke="#c8987a" stroke-width="4"/></g>`).join(''),
  husks: '<rect width="200" height="120" fill="#c8a878"/><ellipse cx="100" cy="66" rx="70" ry="34" fill="#d8bc8a"/><ellipse cx="100" cy="66" rx="9" ry="6" fill="#2a1a0a"/>'
    + [...Array(40)].map((_, k) => { const a = k * 2.4, d = 18 + (k % 7) * 6; return `<ellipse cx="${(100 + Math.cos(a) * d * 1.6).toFixed(1)}" cy="${(66 + Math.sin(a) * d * 0.8).toFixed(1)}" rx="3" ry="1.6" fill="#f2e6c0" transform="rotate(${k * 37} ${(100 + Math.cos(a) * d * 1.6).toFixed(1)} ${(66 + Math.sin(a) * d * 0.8).toFixed(1)})"/>`; }).join('')
    + '<path d="M106 62Q150 40 196 30" stroke="#8a6a3a" stroke-width="2" stroke-dasharray="3 3" fill="none"/>',
  bites: '<rect width="200" height="120" fill="#3a8ab0"/><path d="M0 96Q100 88 200 98V120H0z" fill="#f4f0e6"/><path d="M30 96Q40 40 100 34Q160 40 170 96Z" fill="#a8a090"/>'
    + [[70, 64], [96, 56], [124, 66], [104, 80], [80, 84]].map(([x, y]) => `<path d="M${x - 8} ${y}q8 -8 16 0" stroke="#f4f0e6" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M${x - 6} ${y + 4}q6 -5 12 0" stroke="#e8e2d4" stroke-width="2.5" fill="none"/>`).join('')
    + [...Array(18)].map((_, k) => `<circle cx="${20 + k * 9}" cy="${104 + (k % 3) * 3}" r="1.6" fill="#fff"/>`).join(''),
};
export function openClues(root, ctx) {
  addCss('cb-css', CB_CSS);
  const S = stationShell(root, { cls: 'clues', ic: 'search', title: CLUES_T.title, small: MENU_T.cabinet.title, sub: CLUES_T.sub, ...ctx });
  const { T, O } = S;
  const thumbs = ctx.thumbs || {};
  const P = () => stOf('clues');
  let ci = Math.max(0, CLUE_IDS.findIndex((id) => !(P().solved || {})[id])), looks = 0, wrong = new Set(), done = false;
  const sus = (id) => O(CLUES_T.names[id]);
  function render() {
    const solved = P().solved || {}; const id = CLUE_IDS[ci], C = CLUES_T.clues[id];
    S.body.innerHTML = `<div class="cl-wrap">
      <nav class="cl-tabs">${CLUE_IDS.map((x, i) => `<button data-c="${i}" class="${i === ci ? 'on' : ''} ${solved[x] ? 'done' : ''}" aria-label="${esc(O(CLUES_T.clues[x].name))}"><img src="${svgUrl(CLUE_PIC[x], '0 0 200 120')}" alt="">${solved[x] ? icon('check') : ''}</button>`).join('')}</nav>
      <section class="cl-pic"><b>${esc(O(C.name))}</b><p>${esc(O(C.what))}</p><img class="cl-big" src="${svgUrl(CLUE_PIC[id], '0 0 200 120')}" alt="${esc(O(C.name))}">
        <div class="cl-look"><button class="ls-soft" data-act="look" ${looks >= 2 || done ? 'disabled' : ''}>${icon('search')}${esc(O(CLUES_T.look))}</button>
          <span class="cl-lamps" aria-label="${esc(O(CLUES_T.lamps))}">${[0, 1].map((k) => `<i class="${k < 2 - looks ? 'on' : ''}">${icon('search')}</i>`).join('')}</span></div>
        <ul class="cl-details">${C.d.slice(0, looks).map((d) => `<li>${esc(O(d))}</li>`).join('')}</ul></section>
      <section class="cl-sus"><small>${esc(O(CLUES_T.who))}</small><div class="cl-grid">${SUSPECTS[id].map((s) => `<button data-s="${s}" class="${wrong.has(s) ? 'no' : ''} ${done && s === SUSPECTS[id][0] ? 'yes' : ''}" ${wrong.has(s) || done ? 'disabled' : ''}>${thumbs[s] ? `<img src="${thumbs[s]}" alt="">` : ''}<span>${esc(sus(s))}</span></button>`).join('')}</div>
        ${done ? `<p class="cl-shelf">${icon('check')}${esc(O(CLUES_T.toShelf))}</p>${CLUE_IDS.some((x) => !solved[x]) ? `<button class="ls-go" data-act="next">${esc(O(CLUES_T.next))}</button>` : ''}` : ''}</section></div>`;
  }
  function open(i) { ci = i; looks = 0; wrong = new Set(); done = !!(P().solved || {})[CLUE_IDS[ci]]; render(); S.talk(T(done ? CLUES_T.clues[CLUE_IDS[ci]].yes : CLUES_T.clues[CLUE_IDS[ci]].what), done ? 'happy' : 'curious'); }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const id = CLUE_IDS[ci], C = CLUES_T.clues[id];
    if (b.dataset.c != null) { S.sfx('click'); open(+b.dataset.c); return; }
    if (b.dataset.act === 'look') { if (looks >= 2) { S.talk(T(CLUES_T.noMore), 'oops'); return; } S.sfx('discover'); looks++; render(); S.talk(T(C.d[looks - 1]), 'curious'); return; }
    if (b.dataset.act === 'next') { const nx = CLUE_IDS.findIndex((x, i) => i > ci && !(P().solved || {})[x]); open(nx >= 0 ? nx : CLUE_IDS.findIndex((x) => !(P().solved || {})[x])); return; }
    if (b.dataset.s) {
      const s = b.dataset.s;
      if (s === SUSPECTS[id][0]) {
        done = true; const stars = Math.max(0, 2 - looks - wrong.size) + 1;
        const R = stUpdate('clues', (r) => { r.solved = r.solved || {}; r.solved[id] = Math.max(r.solved[id] || 0, stars); });
        render(); S.sfx('quizRight');
        const lines = [].concat(T(C.yes));
        if (CLUE_IDS.every((x) => R.solved[x])) { try { grantBadge('lab:clues'); } catch (err) { /* */ } S.sfx('mission'); lines.push(...[].concat(T(CLUES_T.all))); }
        S.talk(lines, 'wow');
      } else { wrong.add(s); S.sfx('quizWrong'); render(); S.talk(T(C.no[s]), 'oops'); }
    }
  });
  open(ci);
  return { close: S.close, debug: { open, answer: (s) => S.el.querySelector(`[data-s="${s}"]`)?.click() } };
}

const CB_CSS = `
#ui.wol .cb-shelves{display:flex;flex-direction:column;gap:8px}
#ui.wol .cb-shelf{padding:6px 10px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.2));border-bottom:7px solid #b8895a;box-shadow:0 3px 0 #8a6a3a}
#ui.wol .cb-shelf h3{margin:0 0 4px;font-family:var(--serif);font-size:1.05em}
#ui.wol .cb-shelf h3 small{font-family:inherit;font-size:.8em}
#ui.wol .cb-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#ui.wol .cb-it{display:flex;flex-direction:column;align-items:center;gap:2px;width:86px;padding:4px;border:0;border-radius:12px;background:transparent;font:inherit;font-size:.78em;font-weight:700;color:#2a1a0e;cursor:zoom-in;line-height:1.2}
#ui.wol .cb-it img{width:60px;height:60px;object-fit:contain;filter:drop-shadow(0 3px 3px rgba(0,0,0,.25));transition:transform .2s}
#ui.wol .cb-it.round img{border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px #fff}
#ui.wol .cb-it.wide{width:110px}#ui.wol .cb-it.wide img{width:96px;height:58px;border-radius:8px;object-fit:cover}
#ui.wol .cb-it:hover img,#ui.wol .cb-it:focus-visible img{transform:scale(1.12) rotate(-3deg)}
#ui.wol .cb-ghost{display:grid;place-items:center;width:54px;height:54px;border-radius:12px;border:2px dashed #b9a77a;color:#b9a77a;font-style:normal;font-weight:900;font-size:1.3em}
#ui.wol .cb-how{display:inline-flex;align-items:center;gap:5px;font-style:normal;font-size:.82em;font-weight:700;color:#7a6a40;max-width:280px;line-height:1.3}
#ui.wol .cb-how .ic{width:15px;height:15px;flex:none}
#ui.wol .cb-zoom{position:absolute;inset:56px 0 0 0;display:grid;place-items:center;background:rgba(30,24,14,.55);z-index:5;border-radius:18px}
#ui.wol .cb-zcard{display:flex;gap:16px;align-items:center;max-width:min(760px,94%);max-height:94%;padding:14px;border-radius:18px;background:#fbf6e4;box-shadow:0 10px 30px rgba(0,0,0,.4)}
#ui.wol .cb-zpic{position:relative;width:min(300px,40vh);aspect-ratio:1;flex:none;border-radius:14px;background:#fff center/contain no-repeat;box-shadow:inset 0 0 0 2px #e8dcc0;touch-action:none;cursor:none}
#ui.wol .cb-zpic.wide{aspect-ratio:200/120;width:min(360px,46vh)}
#ui.wol .cb-lens{position:absolute;width:120px;height:120px;border-radius:50%;background-repeat:no-repeat;background-color:#fff;box-shadow:0 0 0 4px #3a2a14,0 0 0 7px #c8a46a,0 6px 16px rgba(0,0,0,.35);pointer-events:none}
#ui.wol .cb-ztx{display:flex;flex-direction:column;gap:6px;min-width:0}
#ui.wol .cb-ztx h3{margin:0;font-family:var(--serif);font-size:1.4em}
#ui.wol .cb-ztx p{margin:0;font-size:1.05em;line-height:1.5}
#ui.wol .ls.kids .cb-ztx p{line-height:1.75}
#ui.wol .cb-lhelp{display:inline-flex;align-items:center;gap:4px}
#ui.wol .cb-lhelp .ic{width:15px;height:15px}
#ui.wol .cb-ztx .ls-soft{align-self:flex-start}
/* sort */
#ui.wol .cb-sort{display:flex;flex-direction:column;gap:8px;min-height:0}
#ui.wol .cb-modes{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#ui.wol .cb-modes button{padding:5px 14px;border-radius:999px;border:2px solid #263440;background:#fff;color:#263440;font:inherit;font-weight:800;cursor:pointer}
#ui.wol .cb-modes button.on{background:#263440;color:#ffd978}
#ui.wol .cb-modes small{margin-inline-start:auto}
#ui.wol .cb-boxes{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#ui.wol .cb-box{min-height:96px;padding:6px 8px;border-radius:14px;border:3px dashed #b8895a;background:rgba(255,255,255,.55);cursor:pointer}
#ui.wol .cb-box.bA{border-color:#2c7a5a;background:rgba(228,244,234,.7)}#ui.wol .cb-box.bB{border-color:#8a5ab8;background:rgba(240,232,248,.7)}
#ui.wol .cb-box>b{display:block;font-family:var(--serif)}
#ui.wol .cb-box>div,#ui.wol .cb-table>div{display:flex;flex-wrap:wrap;gap:6px}
#ui.wol .cb-table{padding:6px 8px;border-radius:14px;background:rgba(184,137,90,.18)}
#ui.wol .cb-thing{display:flex;align-items:center;gap:5px;padding:3px 9px 3px 4px;border-radius:12px;border:2px solid #d8c79a;background:#fff;font:inherit;font-size:.85em;font-weight:700;color:#2a1a0e;cursor:pointer}
#ui.wol .cb-thing img{width:34px;height:34px}
#ui.wol .cb-thing.on{border-color:#e0a43a;box-shadow:0 0 0 3px rgba(224,164,58,.4);transform:translateY(-2px)}
#ui.wol .cb-thing:disabled{cursor:default;opacity:1}
#ui.wol .cb-thing.hint{animation:cbShake .35s 2;border-color:#c86a3a}
@keyframes cbShake{0%,100%{transform:none}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
#ui.wol .cb-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#ui.wol .cb-rules{display:flex;flex-wrap:wrap;gap:5px}
/* clues */
#ui.wol .cl-wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(220px,1fr);grid-template-rows:auto 1fr;gap:8px 14px;height:100%;min-height:0}
#ui.wol .cl-tabs{grid-column:1 / -1;display:flex;gap:6px;flex-wrap:wrap}
#ui.wol .cl-tabs button{position:relative;padding:2px;border-radius:10px;border:2px solid #c9b98a;background:#fff;cursor:pointer;line-height:0}
#ui.wol .cl-tabs button img{width:52px;height:31px;border-radius:7px;object-fit:cover}
#ui.wol .cl-tabs button.on{border-color:#263440;box-shadow:0 0 0 2px #263440}
#ui.wol .cl-tabs button.done{border-color:#4f8a3f}
#ui.wol .cl-tabs button .ic{position:absolute;top:-6px;left:-6px;width:18px;height:18px;border-radius:50%;background:#4f8a3f;color:#fff;padding:2px}
#ui.wol .cl-pic{display:flex;flex-direction:column;gap:5px;min-height:0}
#ui.wol .cl-pic b{font-family:var(--serif);font-size:1.15em}
#ui.wol .cl-pic p{margin:0;font-weight:700}
#ui.wol .cl-big{width:100%;max-height:200px;object-fit:contain;border-radius:12px;box-shadow:0 3px 0 #d8c79a;background:#fff}
#ui.wol .cl-look{display:flex;align-items:center;gap:8px}
#ui.wol .cl-lamps{display:flex;gap:4px}
#ui.wol .cl-lamps i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#e8dcc0;color:#b9a77a}
#ui.wol .cl-lamps i.on{background:#e0a43a;color:#2a1a06}
#ui.wol .cl-lamps .ic{width:15px;height:15px}
#ui.wol .cl-details{margin:0;padding:0 16px 0 0;font-weight:700;line-height:1.4;color:#1d4a6a}
#ui.wol .ls.kids .cl-details,#ui.wol .ls.kids .cl-pic p{line-height:1.65}
#ui.wol .cl-sus{display:flex;flex-direction:column;gap:6px;min-height:0}
#ui.wol .cl-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#ui.wol .cl-grid button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:14px;border:2px solid #d8c79a;background:#fff;font:inherit;font-weight:800;color:#2a1a0e;cursor:pointer}
#ui.wol .cl-grid img{width:62px;height:62px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px #fff,0 2px 6px rgba(0,0,0,.2)}
#ui.wol .cl-grid button:hover:not(:disabled){border-color:#e0a43a;transform:translateY(-2px)}
#ui.wol .cl-grid button.no{opacity:.45;filter:grayscale(1)}
#ui.wol .cl-grid button.yes{border-color:#4f8a3f;background:#eaf6dc}
#ui.wol .cl-shelf{display:flex;align-items:center;gap:5px;margin:0;color:#2c5a2a;font-weight:800}
#ui.wol .cl-shelf .ic{width:18px;height:18px}
@media (max-width:900px),(max-height:620px){
  #ui.wol .cb-it{width:70px}#ui.wol .cb-it img{width:44px;height:44px}
  #ui.wol .cb-it.wide{width:84px}#ui.wol .cb-it.wide img{width:76px;height:46px}
  #ui.wol .cb-ghost{width:40px;height:40px}
  #ui.wol .cb-zcard{gap:10px;padding:10px}
  #ui.wol .cb-zpic{width:min(220px,46vh)}
  #ui.wol .cb-ztx p{font-size:.92em}
  #ui.wol .cb-box{min-height:70px}
  #ui.wol .cb-thing img{width:26px;height:26px}
  #ui.wol .cb-thing{font-size:.78em}
  #ui.wol .cl-grid img{width:44px;height:44px}
  #ui.wol .cl-grid button{padding:4px}
  #ui.wol .cl-big{max-height:130px}
  #ui.wol .cl-tabs button img{width:42px;height:25px}
}
`;
