// מעבדת רובו־דע – the frame of the three station worlds (the aquarium, the greenhouse, the cabinet; 19.10):
//   stationShell()     a working panel with a title, a back button (to the station's menu), the work, and רובו־דע's voice
//                      on a strip at its foot, so his words never cover the work
//   openStationMenu()  what a station offers: a column of activity cards beside the station's picture
// Texts come in pairs { f, k } (src/lab/station-text.js); tx() picks the child's level. Styles are injected once.
import { esc, icon } from '../ui/ui.js';
import { labKids, fmt, readMs } from './level.js';
import { COMMON_T, MENU_T } from './station-text.js';

// a text of the child's level: a pair { f, k } (or a plain string), with {name} filled in
export function tx(v, kids, vars) {
  if (v == null) return '';
  const s = v && typeof v === 'object' && !Array.isArray(v) && 'f' in v ? (kids ? v.k : v.f) : v;
  return vars ? fmt(s, vars) : s;
}
// one line (a list of bubbles joined), for labels and buttons
export const one = (v, kids, vars) => { const s = tx(v, kids, vars); return Array.isArray(s) ? s.join(' ') : String(s); };
export const pick = (a) => a[Math.floor(Math.random() * a.length)];

// רובו־דע's face on the voice strip (the same faces as the thinking corner)
const FACE = {
  happy: '<path d="M8 13q2-3 4 0M14.5 13q2-3 4 0" stroke="#7ff0ff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M10.5 17q2.5 1.6 5 0" stroke="#7ff0ff" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  wow: '<circle cx="10" cy="12.5" r="2.4" fill="#7ff0ff"/><circle cx="16.5" cy="12.5" r="2.4" fill="#7ff0ff"/><circle cx="13.2" cy="17.3" r="1.3" fill="none" stroke="#7ff0ff" stroke-width="1.3"/>',
  oops: '<path d="M7.8 12.5h4.4M14.3 12.5h4.4" stroke="#7ff0ff" stroke-width="2.4" stroke-linecap="round"/><path d="M10.5 17.2q1.4-1.2 2.7 0t2.7 0" stroke="#7ff0ff" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  curious: '<circle cx="10" cy="12" r="1.8" fill="#7ff0ff"/><circle cx="16.5" cy="11.5" r="2.4" fill="#7ff0ff"/><path d="M11.5 17h3.5" stroke="#7ff0ff" stroke-width="1.5" stroke-linecap="round"/>',
};
export const face = (e) => `<svg class="ls-face" viewBox="0 0 26 26" aria-hidden="true"><rect x="2" y="4" width="22" height="18" rx="7" fill="#e9eef2"/><rect x="4.5" y="7" width="17" height="11.5" rx="5" fill="#1d2b36"/>${FACE[e] || FACE.happy}<circle cx="13" cy="3" r="1.6" fill="#3fa9c9"/></svg>`;

// the voice strip: a list (the beginners' texts) is a few short lines, each one shown after the one before it was read
export function voiceStrip(voice, kids, robot) {
  return (text, expr = 'happy') => {
    const parts = (Array.isArray(text) ? text : [text]).map(String).filter(Boolean);
    let delay = 0;
    const lines = parts.map((t, i) => { const d = delay; delay += readMs(t); return `<span class="ls-part" style="animation-delay:${i ? d : 0}ms">${esc(t)}</span>`; });
    voice.innerHTML = `${face(expr)}<p><b>${esc(one(COMMON_T.robo, kids))}</b> ${lines.join(' ')}</p>`;
    voice.classList.remove('pop'); void voice.offsetWidth; voice.classList.add('pop');
    const len = parts.join(' ').length;
    try { robot && robot.say && robot.say(expr, Math.min(4, 0.8 + len * 0.045)); } catch (e) { /* */ }
  };
}

// ───────────────────────────────────────── a working panel (title, small, sub: text pairs or plain strings; back: a string)
export function stationShell(root, { cls = '', title, small, sub, back, robot, audio, onClose, ic = 'leaf' }) {
  injectCss();
  const kids = labKids();
  const el = document.createElement('div'); el.className = `lb-panel ls ls-${cls}${kids ? ' kids' : ''}`; root.appendChild(el);
  el.innerHTML = `<header class="ls-head"><span class="ls-ic">${icon(ic)}</span><div class="ls-ttl"><small>${esc(one(small || '', kids))}</small><h2>${esc(one(title, kids))}</h2></div>
      <p class="ls-sub">${esc(one(sub || '', kids))}</p><button class="lb-btn ls-back">${icon('arrowR')}<span>${esc(back || one(COMMON_T.room, kids))}</span></button></header>
    <div class="ls-body"></div><div class="ls-voice" aria-live="polite">${face('happy')}<p></p></div>`;
  const body = el.querySelector('.ls-body'), voice = el.querySelector('.ls-voice');
  let alive = true; const timers = [];
  const later = (fn, ms) => { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); return t; };
  const talk = voiceStrip(voice, kids, robot);
  const sfx = (n) => { try { audio && audio.play(n); } catch (e) { /* */ } };
  const close = () => { if (!alive) return; alive = false; timers.forEach(clearTimeout); el.remove(); onClose && onClose(); };
  el.querySelector('.ls-back').onclick = () => { sfx('click'); close(); };
  // the text of the child's level, and a one-line label
  const T = (v, vars) => tx(v, kids, vars), O = (v, vars) => one(v, kids, vars);
  return { el, body, talk, sfx, later, close, alive: () => alive, kids, T, O };
}

// ───────────────────────────────────────── the station's menu
// items: [{ id, ic, state: 'done' | 'mid' | '' , isNew }]; extra: HTML under the title (the cabinet's shelf preview)
export function openStationMenu(root, { st, items, onPick, robot, audio, onClose, extra = '', vars = {} }) {
  injectCss();
  const kids = labKids(), M = MENU_T[st], I = MENU_T.items;
  const O = (v, x) => one(v, kids, x);
  const el = document.createElement('div'); el.className = `lb-panel ls ls-menu ls-m-${st}${kids ? ' kids' : ''}`; root.appendChild(el);
  el.innerHTML = `<header class="ls-head"><div class="ls-ttl"><small>${esc(O(MENU_T.pick))}</small><h2>${esc(O(M.title))}</h2></div></header>
    <p class="ls-msub">${esc(O(M.sub, vars))}</p>${extra}
    <div class="ls-body"><div class="ls-mlist">${items.map((a) => `<button class="ls-mcard ${a.state || ''}" data-a="${a.id}"><span class="ls-mic">${icon(a.ic || 'leaf')}</span>
      <span class="ls-mtx"><b>${esc(O(I[a.id].name))}</b><span>${esc(O(I[a.id].line))}</span></span>
      <small>${a.state === 'done' ? icon('check') + esc(O(COMMON_T.done)) : a.state === 'mid' ? esc(O(COMMON_T.mid)) : a.isNew ? `<i class="ls-new">${esc(O(COMMON_T.fresh))}</i>` : ''}</small></button>`).join('')}</div></div>
    <div class="ls-voice" aria-live="polite">${face('happy')}<p></p></div>`;
  const talk = voiceStrip(el.querySelector('.ls-voice'), kids, robot);
  let alive = true;
  const close = () => { if (!alive) return; alive = false; el.remove(); onClose && onClose(); };
  el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { try { audio && audio.play('select'); } catch (e) { /* */ } const id = b.dataset.a; onPick && onPick(id); });
  talk(tx(M.hello, kids, vars), 'happy');
  return { close, talk, el, menu: true };
}

// ───────────────────────────────────────── styles (scoped like lab.css: #ui.wol), injected once
function injectCss() {
  if (document.getElementById('ls-css')) return;
  const st = document.createElement('style'); st.id = 'ls-css';
  st.textContent = `
#ui.wol .lb-panel.ls{inset:84px 12px 12px;display:flex;flex-direction:column;gap:8px;padding:12px 16px;background:linear-gradient(180deg,rgba(251,246,228,.97),rgba(238,228,198,.97));z-index:4;overflow:hidden}
#ui.wol .ls-head{display:flex;align-items:center;gap:12px;flex:none}
#ui.wol .ls-ic{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#263440;color:#ffd978;flex:none}
#ui.wol .ls-ic .ic{width:22px;height:22px}
#ui.wol .ls-ttl small{display:block;color:#1d6680;font-weight:700;font-size:.8em}
#ui.wol .ls-ttl h2{font-size:1.5em;line-height:1.1;white-space:nowrap;margin:0}
#ui.wol .ls-sub{flex:1;margin:0;color:#5a4420;font-weight:700;font-size:calc(.95em * var(--tsr,1));line-height:1.3}
#ui.wol .ls-back .ic{width:18px;height:18px}
#ui.wol .ls-body{flex:1;min-height:0;overflow:auto}
#ui.wol .ls-voice{flex:none;display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:14px;background:#263440;color:#eaf6fa;min-height:44px;box-shadow:inset 0 0 0 1px rgba(127,240,255,.25)}
#ui.wol .ls-voice.pop{animation:lsPop .3s ease-out}
#ui.wol .ls-voice p{margin:0;line-height:1.4;font-size:calc(.98em * var(--tsr,1))}
#ui.wol .ls-voice b{color:#7ff0ff}
#ui.wol .ls-face{width:40px;height:40px;flex:none}
#ui.wol .ls-part{animation:lsPart .4s ease-out both}
@keyframes lsPop{from{opacity:.4;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes lsPart{from{opacity:0}to{opacity:1}}
#ui.wol .ls.kids .ls-voice p{line-height:1.7}
#ui.wol .ls.kids .ls-ttl h2{line-height:1.35}
#ui.wol .ls .ls-go{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 18px;border:0;border-radius:999px;font:inherit;font-weight:800;color:#2a1a06;background:linear-gradient(180deg,#ffe08a,#e8a43a);box-shadow:0 3px 0 #9c6519;cursor:pointer}
#ui.wol .ls .ls-go:disabled{filter:grayscale(1) brightness(.85);cursor:default}
#ui.wol .ls .ls-go .ic{width:18px;height:18px}
#ui.wol .ls .ls-soft{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;border:2px solid #c9b98a;background:#fff8e6;color:#2a1a0e;font:inherit;font-weight:800;cursor:pointer}
#ui.wol .ls .ls-soft .ic{width:16px;height:16px}
#ui.wol .ls small{font-weight:700;color:#6a5a30}
#ui.wol .ls-card{padding:8px 10px;border-radius:14px;background:#fff;box-shadow:0 3px 0 #d8c79a}
#ui.wol .ls-seg{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
#ui.wol .ls-seg>span{min-width:3.4em;font-weight:700;font-size:.85em;color:#5a4420}
#ui.wol .ls-seg button{padding:5px 11px;border-radius:999px;border:2px solid #c9b98a;background:#fff;color:#2a1a0e;font:inherit;font-size:.86em;font-weight:700;cursor:pointer}
#ui.wol .ls-seg button.on{background:#2c7a5a;border-color:#2c7a5a;color:#fff}
#ui.wol .ls-seg button:disabled{opacity:.5;cursor:default}
#ui.wol .ls-ends{display:flex;flex-wrap:wrap;gap:5px}
#ui.wol .ls-ends span{padding:3px 9px;border-radius:999px;border:2px dashed #c9b98a;color:#a8987a;font-size:.8em;font-weight:800}
#ui.wol .ls-ends span.on{border:2px solid #4f8a3f;background:#eaf6dc;color:#2c5a2a}
#ui.wol .ls-ends span.now{border-color:#e0a43a;background:#fff3d8;color:#8a5a12}
#ui.wol .ls-medal{width:30px;height:30px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.25)}
/* the menu: a column beside the station's picture */
#ui.wol .lb-panel.ls-menu{inset:84px 14px 96px auto;width:min(440px,46vw);padding:12px 14px}
#ui.wol .ls-msub{margin:-4px 0 0;color:#5a4420;font-weight:700}
#ui.wol .ls-mlist{display:flex;flex-direction:column;gap:8px}
#ui.wol .ls-mcard{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:16px;border:2px solid #d8c79a;background:#fff;font:inherit;text-align:right;cursor:pointer;color:#2a1a0e;box-shadow:0 3px 0 #d8c79a;transition:transform .15s}
#ui.wol .ls-mcard:hover,#ui.wol .ls-mcard:focus-visible{transform:translateY(-2px);border-color:#e0a43a}
#ui.wol .ls-mic{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#263440;color:#ffd978;flex:none}
#ui.wol .ls-mic .ic{width:23px;height:23px}
#ui.wol .ls-mtx{flex:1;display:flex;flex-direction:column;gap:1px;min-width:0}
#ui.wol .ls-mtx b{font-family:var(--serif);font-size:1.15em}
#ui.wol .ls-mtx span{font-size:calc(.88em * var(--tsr,1));color:#5a4420;line-height:1.3}
#ui.wol .ls-mcard small{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
#ui.wol .ls-mcard small .ic{width:14px;height:14px}
#ui.wol .ls-mcard.done{background:#f2f9ea;border-color:#8ab86a}
#ui.wol .ls-new{font-style:normal;padding:2px 8px;border-radius:999px;background:#e0a43a;color:#2a1a06}
#ui.wol .ls-shelfpeek{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:6px 8px;border-radius:12px;background:rgba(255,255,255,.6)}
#ui.wol .ls-shelfpeek img{width:30px;height:30px;border-radius:50%;object-fit:cover}
#ui.wol .ls-shelfpeek svg{width:30px;height:30px}
@media (max-width:900px),(max-height:620px){
  #ui.wol .lb-panel.ls{inset:70px 8px 8px;padding:8px 10px;gap:6px}
  #ui.wol .lb-panel.ls-menu{inset:70px 8px 84px auto;width:min(420px,58vw)}
  #ui.wol .ls-ttl h2{font-size:1.2em}
  #ui.wol .ls-sub{font-size:.85em}
  #ui.wol .ls-voice{padding:5px 10px;min-height:38px}
  #ui.wol .ls-voice p{font-size:.88em;line-height:1.3}
  #ui.wol .ls.kids .ls-voice p{line-height:1.55}
  #ui.wol .ls-face{width:32px;height:32px}
  #ui.wol .ls-ic{width:30px;height:30px}
  #ui.wol .ls-mcard{padding:6px 10px;gap:8px}
  #ui.wol .ls-mic{width:32px;height:32px}
  #ui.wol .ls-mtx b{font-size:1em}
  #ui.wol .ls .ls-go{padding:6px 14px}
  #ui.wol .ls-seg button{padding:3px 8px;font-size:.8em}
}
@media (max-height:520px){
  #ui.wol .lb-panel.ls-menu{inset:62px 8px 96px auto}
  #ui.wol .ls-msub{display:none}
  #ui.wol .ls-mtx span{display:none}
  #ui.wol .ls-sub{display:none}
}
`;
  document.head.appendChild(st);
}
export { injectCss as injectStationCss };
// an activity's own styles, once
export function addCss(id, text) { if (document.getElementById(id)) return; const st = document.createElement('style'); st.id = id; st.textContent = text; document.head.appendChild(st); }
