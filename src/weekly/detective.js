// הבלש של השבוע (1.4.4 set 7): the event's screen. A detective's cork board: five clue photos pinned to it, one more each
// day from Sunday to Thursday (a locked one is a card turned over, with the day it comes); the open clue is shown big
// beside the board (a painting, the same painting under a magnifying glass, a green night-camera photo, a sound wave,
// a page of the notebook). Below, the suspects in round frames: a tap pins "my guess" on one, and it can move until the
// end. When all five clues are in, "לפענח" asks: right, and the case is closed; wrong, and the board says which clue
// showed it is not him, and he is set aside.
//   openDetective(o)   o: the weekly opener's object (src/ui/weekly-ui.js launch)
import { DETECTIVE_VERSIONS, DET_UI } from '../data/weekly/detective.js';
import { SUS } from '../lab/clue-cases.js';
import { current } from '../core/weekly.js';
import { CARD_ART } from '../data/card-art.js';
import { LAB_ITEMS } from '../data/lab-items-art.js';
import { icon } from '../ui/ui/icons.js';
import { esc } from '../ui/ui/helpers.js';
import { svcGuide } from '../core/services.js';
import { detectiveTutorial } from '../ui/tutorials.js';

const DAYS = [['ראשון', 'רִאשׁוֹן'], ['שני', 'שֵׁנִי'], ['שלישי', 'שְׁלִישִׁי'], ['רביעי', 'רְבִיעִי'], ['חמישי', 'חֲמִישִׁי']];
const KIND_ICON = { find: 'search', look: 'search', night: 'moon', sound: 'sound', note: 'book' };
const picOf = (p) => (!p ? '' : p.startsWith('card:') ? CARD_ART[p.slice(5)] || '' : LAB_ITEMS[p] || '');

export function openDetective(o) {
  const kids = !!o.kids, W = (f, k) => (kids ? k : f), T = (x) => (x ? (kids && x.k ? x.k : x.f) : '');
  const V = o.version || DETECTIVE_VERSIONS[0];
  const today = () => { try { return Math.max(0, current().day); } catch (e) { return 0; } };
  const st0 = (o.rec && o.rec.state) || {};
  const S = { hyp: st0.hyp || null, at: st0.at || 0, out: Array.isArray(st0.out) ? st0.out : [], wrong: st0.wrong || 0, seen: st0.seen || 0, sel: null, solved: !!st0.solved, peek: 0, clicks: 0 };
  const shown = () => Math.min(5, Math.max(today() + 1, S.peek));
  const el = document.createElement('div'); el.className = 'wd'; el.dir = 'rtl';
  o.host.appendChild(el);
  let tut = null, verdict = null;
  const save = () => { try { o.save({ hyp: S.hyp, at: S.at, out: S.out, wrong: S.wrong, seen: Math.max(S.seen, shown()), solved: S.solved, ver: V.id }); } catch (e) { } };
  const name = (id) => T(SUS[id]) || id;

  // one clue as a photo pinned to the board (open) or a card turned over (locked)
  function cardHTML(c, i, n) {
    const rot = [-4, 3, -2, 4, -3][i];
    if (i >= n) return `<div class="wd-card locked" style="--r:${rot}deg"><i class="wd-pin"></i><span class="wd-back">${icon('lock')}<b>${esc(W(DET_UI.day.f.replace('{n}', i + 1), DET_UI.day.k.replace('{n}', i + 1)))}</b><small>${esc(DAYS[i][kids ? 1 : 0])}</small></span></div>`;
    const isNew = i === n - 1 && i >= S.seen;
    return `<button type="button" class="wd-card k-${c.kind}${S.sel === i ? ' on' : ''}${isNew ? ' new' : ''}" data-dc="${i}" style="--r:${rot}deg"><i class="wd-pin"></i>${photoHTML(c, true)}<span class="wd-cap">${icon(KIND_ICON[c.kind])}${esc(T(DET_UI[c.kind]))}</span></button>`;
  }
  // the photo of a clue, by its kind (small on the board, big in the panel)
  function photoHTML(c, small) {
    const src = picOf(c.pic);
    if (c.kind === 'night') return `<span class="wd-ph night">${src ? `<img src="${src}" alt="" draggable="false">` : ''}<i class="wd-scan"></i><em class="wd-rec">02:${String(10 + V.id.charCodeAt(1) % 40).padStart(2, '0')}</em>${src ? '' : `<b class="wd-none">${esc(T(DET_UI.nobody))}</b>`}</span>`;
    if (c.kind === 'sound') return `<span class="wd-ph sound">${Array.from({ length: small ? 9 : 18 }, (_, k) => `<i style="--h:${(0.25 + 0.75 * Math.abs(Math.sin(k * 1.7 + V.id.length))).toFixed(2)};--d:${(-k * 0.13).toFixed(2)}s"></i>`).join('')}</span>`;
    if (c.kind === 'note') return `<span class="wd-ph note"><span>${esc(T(c))}</span></span>`;
    return `<span class="wd-ph ${c.kind}"><img src="${src}" alt="" draggable="false">${c.kind === 'look' ? '<i class="wd-lens"></i>' : ''}</span>`;
  }
  function paint() {
    const n = shown(), all = n >= 5;
    if (S.sel == null || S.sel >= n) S.sel = n - 1;
    const c = V.clues[S.sel];
    const t = Math.min(4, today());
    el.innerHTML = `<header class="wd-top"><button type="button" class="wg-x" data-dx>${icon('close')}<span>${W('יציאה', 'יְצִיאָה')}</span></button>
        <div><h2>${esc(T(V.title))}</h2><p>${esc(T(V.story))}</p></div>
        <ol class="wj-week wd-week">${DAYS.map((d, i) => `<li class="${i === t ? 'today' : ''}${i < n ? ' seen' : ''}">${esc(d[kids ? 1 : 0])}</li>`).join('')}</ol></header>
      <div class="wd-body"><div class="wd-cork"><div class="wd-cards">${V.clues.map((q, i) => cardHTML(q, i, n)).join('')}</div></div>
        <div class="wd-panel"><div class="wd-big">${photoHTML(c, false)}</div>
          <p class="wd-txt"><b>${icon(KIND_ICON[c.kind])} ${esc(T(DET_UI[c.kind]))}, ${esc(W(DET_UI.day.f.replace('{n}', S.sel + 1), DET_UI.day.k.replace('{n}', S.sel + 1)))}:</b> ${esc(T(c))}</p></div></div>
      <footer class="wd-foot"><div class="wd-sus" role="list">${V.sus.map((id) => { const out = S.out.includes(id); return `<button type="button" class="wd-s${S.hyp === id ? ' hyp' : ''}${out ? ' out' : ''}" data-ds="${id}" ${out || S.solved ? 'disabled' : ''}><span class="wd-fr"><img src="${CARD_ART[id] || ''}" alt=""></span><b>${esc(name(id))}</b>${S.hyp === id ? `<em>${esc(T(DET_UI.mine))}</em>` : out ? `<em class="no">${esc(T(DET_UI.wrong))}</em>` : ''}</button>`; }).join('')}</div>
        <div class="wd-act">${S.hyp ? '' : `<p>${esc(T(DET_UI.pick))}</p>`}${all ? `<button type="button" class="wd-solve" data-dsolve ${S.hyp && !S.solved ? '' : 'disabled'}>${icon('search')} ${esc(T(DET_UI.solve))}</button>` : `<p class="wd-wait">${esc(W(DET_UI.wait.f.replace('{n}', 5 - n), DET_UI.wait.k))}</p>`}</div></footer>
      ${verdict || ''}`;
    if (n > S.seen) { S.seen = n; save(); }
  }
  function solve() {
    if (!S.hyp) return;
    if (S.hyp === V.sus[0]) {
      S.solved = true; save();
      const score = Math.max(20, 100 - S.wrong * 20 + (5 - S.at) * 8);
      verdict = `<div class="wd-verdict ok"><div class="wd-vcard"><span class="wd-fr big"><img src="${CARD_ART[V.sus[0]] || ''}" alt=""></span><h3>${esc(T(DET_UI.right))}</h3><p>${esc(T(V.yes))}</p><button type="button" data-ddone>${esc(T(DET_UI.done))}</button></div></div>`;
      paint(); try { o.emit && o.emit('ui:click'); } catch (e) { }
      el.querySelector('[data-ddone]').onclick = () => { close(); o.done({ win: true, score }); };
      return;
    }
    const N = V.no[S.hyp] || { f: '', k: '', by: 0 };
    S.out.push(S.hyp); S.wrong++; const was = S.hyp; S.hyp = null; save();
    verdict = `<div class="wd-verdict no"><div class="wd-vcard"><span class="wd-fr big"><img src="${CARD_ART[was] || ''}" alt=""></span><h3>${esc(T(DET_UI.wrong))}: ${esc(name(was))}</h3><p>${esc(T(N))}</p>
      <p class="wd-by">${esc(W(`רמז ${N.by + 1} הראה את זה.`, `רֶמֶז ${N.by + 1} הֶרְאָה אֶת זֶה.`))} ${esc(T(DET_UI.again))}</p><button type="button" data-dok>${W('בסדר', 'בְּסֵדֶר')}</button></div></div>`;
    S.sel = N.by; paint();
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.dx != null) { close(); return; }
    if (d.dok != null) { verdict = null; paint(); return; }
    if (d.dc != null) { S.sel = +d.dc; paint(); return; }
    if (d.ds) { S.hyp = S.hyp === d.ds ? null : d.ds; S.at = shown(); save(); paint(); try { o.emit && o.emit('ui:click'); } catch (e2) { } return; }
    if (d.dsolve != null) { solve(); }
  });
  function close() { if (tut && tut.stop) tut.stop(); el.remove(); }
  paint();
  try { const g = svcGuide(); if (g && !S.solved) tut = detectiveTutorial({ guide: g, ev: { state: () => ({ sel: S.sel, hyp: S.hyp, clicks: S.clicks }) } }); } catch (e) { }
  el.addEventListener('click', (e) => { if (e.target.closest('[data-dc]')) S.clicks++; }, true);
  try { window.__det = { state: () => ({ ...S, shown: shown(), ver: V.id, tut: (tut && tut.step) || null }), peek: (n) => { S.peek = n; paint(); }, repaint: paint }; } catch (e) { }
  return { close, el };
}
