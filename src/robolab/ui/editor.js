// מעבדת הרובוטים – the program editor: a palette of big picture blocks (by family colour) and the program, read from
// top to bottom, written right to left. A tap on a palette block puts it at the cursor (the glowing slot); a tap on a
// slot moves the cursor there, so blocks go inside a "חזור" or an "אם" too. Each placed block has small buttons:
// up, down, remove. Numbers change with arrows, a sensor or a block of mine is picked from a short list.
//   const E = createEditor(el, { lesson, kids, onChange })
//   E.program()   → { robot, drone, sub, defs }   (node ids are kept for lighting the running block)
//   E.light(nid)  E.clear()  E.set(program)
import { BLOCKS, FAMILIES, SENSORS, SIGNALS } from '../engine/blocks.js';
import { icon } from './icons.js';

let UID = 1;
const nid = () => 'n' + (UID++);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TOOL_NAMES = { robot: { f: 'רובוט', k: 'רוֹבּוֹט' }, drone: { f: 'רחפן', k: 'רַחְפָן' }, sub: { f: 'צוללן', k: 'צוֹלְלָן' } };
const DEF_NAMES = { row: { f: 'שורה', k: 'שׁוּרָה' }, side: { f: 'צלע', k: 'צֵלָע' }, nurse: { f: 'משתלה', k: 'מִשְׁתָּלָה' }, out: { f: 'לכבות', k: 'לְכַבּוֹת' }, mine: { f: 'הבלוק שלי', k: 'הַבְּלוֹק שֶׁלִּי' } };

function withIds(list) { return (list || []).map((nd) => ({ ...nd, id: nid(), body: nd.body ? withIds(nd.body) : undefined, then: nd.then ? withIds(nd.then) : undefined, else: nd.else ? withIds(nd.else) : undefined })); }
const newNode = (b) => {
  const B = BLOCKS[b], nd = { b, id: nid() };
  if (B.kind === 'repeat') { nd.n = 3; nd.body = []; }
  if (B.kind === 'until') { nd.c = 'home'; nd.body = []; }
  if (B.kind === 'if') { nd.c = 'tree'; nd.then = []; nd.else = []; }
  if (B.param === 'm') nd.m = 'a';
  return nd;
};

export function createEditor(el, { lesson, kids, onChange }) {
  const T = (o) => (kids && o.k ? o.k : o.f);
  const tools = lesson.tools || ['robot'];
  const hasDefs = (lesson.blocks || []).includes('call');
  const prog = { robot: [], drone: [], sub: [], defs: {} };
  for (const [k, body] of Object.entries(lesson.defs0 || {})) prog.defs[k] = withIds(body);
  if (hasDefs && !Object.keys(prog.defs).length) prog.defs.mine = [];
  let tab = tools[0];                           // 'robot' | 'drone' | 'sub' | 'def:<name>'
  let cursor = null;                             // { list: Array, i: number }
  const listOf = () => (tab.startsWith('def:') ? prog.defs[tab.slice(4)] : prog[tab]);
  const setCursorEnd = () => { const L = listOf(); cursor = { list: L, i: L.length }; };
  setCursorEnd();

  el.innerHTML = `<div class="rl-pal" role="toolbar" aria-label="בלוקים"></div><div class="rl-prog"><div class="rl-tabs" role="tablist"></div><div class="rl-code" aria-live="polite"></div></div>`;
  const palEl = el.querySelector('.rl-pal'), tabsEl = el.querySelector('.rl-tabs'), codeEl = el.querySelector('.rl-code');

  function blockFace(b) {
    const B = BLOCKS[b], F = FAMILIES[B.fam];
    return `<span class="rl-ic">${icon(B.icon)}</span><span class="rl-bt">${esc(T(B))}</span>`;
  }
  function renderPalette() {
    const fams = {};
    for (const b of lesson.blocks || []) { const B = BLOCKS[b]; if (!B) continue; if (b === 'call' && !hasDefs) continue; (fams[B.fam] = fams[B.fam] || []).push(b); }
    palEl.innerHTML = Object.entries(fams).map(([f, bs]) => `<div class="rl-fam" style="--fc:${FAMILIES[f].color}"><small>${esc(T(FAMILIES[f]))}</small>${bs.map((b) => `<button type="button" class="rl-blk" data-add="${b}" style="--fc:${FAMILIES[f].color}">${blockFace(b)}</button>`).join('')}</div>`).join('');
  }
  function renderTabs() {
    const tb = tools.map((k) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${tab === k}">${icon(k)}<span>${esc(T(TOOL_NAMES[k]))}</span></button>`);
    if (hasDefs) for (const d of Object.keys(prog.defs)) tb.push(`<button type="button" role="tab" class="rl-deftab" data-tab="def:${d}" aria-selected="${tab === 'def:' + d}">${icon('mine')}<span>${esc(T(DEF_NAMES[d] || { f: d, k: d }))}</span></button>`);
    tabsEl.innerHTML = tb.join('');
  }
  const slot = (list, i) => `<button type="button" class="rl-slot${cursor && cursor.list === list && cursor.i === i ? ' on' : ''}" data-slot="${i}" aria-label="לשים כאן"></button>`;
  const lists = new Map(); let LID = 0;
  function renderList(list) {
    const id = 'L' + (LID++); lists.set(id, list);
    let h = `<div class="rl-list" data-list="${id}">` + slot(list, 0);
    list.forEach((nd, i) => {
      const B = BLOCKS[nd.b] || BLOCKS.fwd, col = FAMILIES[B.fam].color;
      let param = '';
      if (B.kind === 'repeat') param = `<span class="rl-num"><button type="button" data-dn="${nd.id}" aria-label="פחות">${icon('down')}</button><b>${nd.n}</b><button type="button" data-up="${nd.id}" aria-label="עוד">${icon('up')}</button><small>${kids ? 'פְּעָמִים' : 'פעמים'}</small></span>`;
      if (B.kind === 'if' || B.kind === 'until') param = `<select data-sens="${nd.id}">${Object.entries(SENSORS).map(([k, S]) => `<option value="${k}"${nd.c === k ? ' selected' : ''}>${esc(T(S))}</option>`).join('')}</select>`;
      if (B.param === 'm') param = `<span class="rl-sig">${Object.entries(SIGNALS).map(([k, S]) => `<button type="button" class="rl-sigb${nd.m === k ? ' on' : ''}" data-sig="${k}" data-n="${nd.id}" style="--sc:${S.color}" aria-label="${esc(T(S))}" title="${esc(T(S))}"><i class="sh-${S.shape}"></i></button>`).join('')}</span>`;
      if (B.kind === 'call') param = `<select data-fn="${nd.id}">${Object.keys(prog.defs).map((d) => `<option value="${d}"${nd.f === d ? ' selected' : ''}>${esc(T(DEF_NAMES[d] || { f: d, k: d }))}</option>`).join('')}</select>`;
      h += `<div class="rl-node${B.kind === 'act' ? '' : ' ctl'}" data-node="${nd.id}" style="--fc:${col}"><div class="rl-head">${blockFace(nd.b)}${param}<span class="rl-tools"><button type="button" data-mv="-1" data-n="${nd.id}" aria-label="למעלה">${icon('up')}</button><button type="button" data-mv="1" data-n="${nd.id}" aria-label="למטה">${icon('down')}</button><button type="button" data-del="${nd.id}" aria-label="להוריד">${icon('del')}</button></span></div>`;
      if (nd.body) h += `<div class="rl-in">${renderList(nd.body)}</div>`;
      if (nd.then) h += `<div class="rl-in"><small>${kids ? 'אִם כֵּן' : 'אם כן'}</small>${renderList(nd.then)}<small>${kids ? 'וְאִם לֹא' : 'ואם לא'}</small>${renderList(nd.else)}</div>`;
      h += `</div>` + slot(list, i + 1);
    });
    return h + '</div>';
  }
  function render() {
    lists.clear(); LID = 0;
    renderTabs();
    const L = listOf();
    codeEl.innerHTML = renderList(L) + (L.length ? '' : `<p class="rl-hint">${kids ? 'לַחֲצוּ עַל בְּלוֹק כְּדֵי לְהוֹסִיף אוֹתוֹ' : 'לחצו על בלוק כדי להוסיף אותו לתוכנית'}</p>`);
    const on = codeEl.querySelector('.rl-slot.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function find(list, id, parent = null) {
    for (let i = 0; i < list.length; i++) {
      const nd = list[i]; if (nd.id === id) return { list, i, nd };
      for (const k of ['body', 'then', 'else']) if (nd[k]) { const r = find(nd[k], id); if (r) return r; }
    }
    return null;
  }
  const findAny = (id) => { for (const k of [...tools]) { const r = find(prog[k], id); if (r) return r; } for (const d in prog.defs) { const r = find(prog.defs[d], id); if (r) return r; } return null; };
  const changed = () => { render(); if (onChange) onChange(); };

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
    if (t.dataset.add) {
      const nd = newNode(t.dataset.add);
      if (nd.b === 'call') nd.f = Object.keys(prog.defs)[0];
      if (!cursor) setCursorEnd();
      cursor.list.splice(cursor.i, 0, nd);
      cursor = nd.body ? { list: nd.body, i: 0 } : nd.then ? { list: nd.then, i: 0 } : { list: cursor.list, i: cursor.i + 1 };
      t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
      return changed();
    }
    if (t.dataset.tab) { tab = t.dataset.tab; setCursorEnd(); return render(); }
    if (t.dataset.slot != null) { const L = lists.get(t.closest('.rl-list').dataset.list); cursor = { list: L, i: +t.dataset.slot }; return render(); }
    if (t.dataset.del) { const r = findAny(t.dataset.del); if (r) { r.list.splice(r.i, 1); if (cursor && cursor.list === r.list && cursor.i > r.i) cursor.i--; if (!lists.size || !cursor) setCursorEnd(); } return changed(); }
    if (t.dataset.mv) { const r = findAny(t.dataset.n); if (r) { const j = r.i + (+t.dataset.mv); if (j >= 0 && j < r.list.length) { r.list.splice(r.i, 1); r.list.splice(j, 0, r.nd); } } return changed(); }
    if (t.dataset.sig) { const r = findAny(t.dataset.n); if (r) r.nd.m = t.dataset.sig; return changed(); }
    if (t.dataset.up || t.dataset.dn) { const r = findAny(t.dataset.up || t.dataset.dn); if (r) r.nd.n = Math.max(1, Math.min(9, r.nd.n + (t.dataset.up ? 1 : -1))); return changed(); }
  });
  el.addEventListener('change', (e) => {
    const s = e.target;
    if (s.dataset.sens) { const r = findAny(s.dataset.sens); if (r) r.nd.c = s.value; changed(); }
    if (s.dataset.fn) { const r = findAny(s.dataset.fn); if (r) r.nd.f = s.value; changed(); }
  });

  renderPalette(); render();
  const clean = (list) => (list || []).map((nd) => { const o = { ...nd }; for (const k of ['body', 'then', 'else']) if (o[k]) o[k] = clean(o[k]); return o; });
  return {
    program: () => ({ robot: clean(prog.robot), drone: clean(prog.drone), sub: clean(prog.sub), defs: Object.fromEntries(Object.entries(prog.defs).map(([k, v]) => [k, clean(v)])) }),
    light: (id) => { codeEl.querySelectorAll('.rl-node.run').forEach((n) => n.classList.remove('run')); if (id) { const n = codeEl.querySelector(`[data-node="${id}"]`); if (n) { n.classList.add('run'); n.scrollIntoView({ block: 'nearest' }); } } },
    clear: () => { prog.robot = []; prog.drone = []; prog.sub = []; for (const k in prog.defs) if (!(lesson.defs0 || {})[k]) prog.defs[k] = []; setCursorEnd(); changed(); },
    set: (p) => { for (const k of ['robot', 'drone', 'sub']) prog[k] = withIds(p[k] || []); for (const [k, v] of Object.entries(p.defs || {})) prog.defs[k] = withIds(v); setCursorEnd(); changed(); },
    count: () => { let n = 0; const w = (l) => { for (const nd of l || []) { n++; w(nd.body); w(nd.then); w(nd.else); } }; for (const k of tools) w(prog[k]); for (const d in prog.defs) { n++; w(prog.defs[d]); } return n; },
  };
}
