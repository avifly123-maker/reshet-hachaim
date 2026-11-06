// A new badge drops in over whatever is open (the forest, the hub, the lab): the medallion, its name and how it was
// earned. One at a time; a click or 5 seconds closes it. Listens to the 'wol-badge' event (src/core/badges-store.js).
// 1.4.3: the technology cards come through the same queue ('wol-techcard', src/robolab/tech.js), so a card and a badge
// never cover each other; several cards earned together are shown as one (the first card and "ועוד N").
import { badgeHTML, BADGE_CSS } from './badge-art.js';
import { badgeById } from '../data/badges.js';
import { TECH_BY } from '../data/robolab/tech-cards.js';
// 1.4.3 closing: the technology card's face (and its paintings) load only when the first card is shown
let TC = null, tcLoad = null;
const loadTC = () => tcLoad || (tcLoad = import('./tech-card.js').then((m) => { TC = m; }));
import { svcGuide } from '../core/services.js';
import { playerMode } from '../core/storage.js';

export function startBadgeToasts(root, audio) {
  if (!document.getElementById('wol-badge-css')) {
    const st = document.createElement('style'); st.id = 'wol-badge-css';
    st.textContent = BADGE_CSS + `
#ui.wol .bdg-pop{position:absolute;left:50%;top:14%;z-index:var(--z-badge);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.4em;padding:1.1em 1.8em 1.2em;border-radius:1.2em;
  background:radial-gradient(ellipse at 50% 30%,rgba(60,48,22,.96),rgba(24,20,10,.96));box-shadow:0 1.2em 2.6em rgba(0,0,0,.55),inset 0 0 0 2px rgba(246,207,114,.4);color:#fbf3d8;pointer-events:auto;cursor:pointer;
  animation:bdg-drop .8s cubic-bezier(.2,1.4,.4,1) both}
#ui.wol .bdg-pop.out{animation:bdg-out .35s ease-in both}
#ui.wol .bdg-pop h4{margin:0;font-family:var(--serif);font-size:1.15em;color:#f6cf72;letter-spacing:.02em}
#ui.wol .bdg-pop .bdg{--bs:8.6em}
#ui.wol .bdg-pop.tech{background:radial-gradient(ellipse at 50% 30%,rgba(26,54,86,.97),rgba(12,24,40,.97));box-shadow:0 1.2em 2.6em rgba(0,0,0,.55),inset 0 0 0 2px rgba(120,190,255,.45)}
#ui.wol .bdg-pop.tech h4{color:#9fd3ff}
#ui.wol .bdg-pop.tech .tc-card{pointer-events:none}
#ui.wol .bdg-pop .bdg-med{animation:bdg-spin 1.1s .2s ease-out both}
#ui.wol .bdg-pop p{margin:0;max-width:22em;text-align:center;color:#e6dcbc;font-size:.95em}
#ui.wol .bdg-pop .rays{position:absolute;left:50%;top:44%;width:22em;height:22em;margin:-11em 0 0 -11em;border-radius:50%;pointer-events:none;z-index:-1;
  background:repeating-conic-gradient(rgba(246,207,114,.16) 0 7deg,transparent 7deg 20deg);animation:bdg-rays 9s linear infinite;-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}
#ui.wol .bdg-pop.many{left:14px;top:auto;bottom:72px;transform:none;padding:.7em 1.1em .8em;animation:bdg-side .6s cubic-bezier(.2,1.4,.4,1) both}
#ui.wol .bdg-pop.many.out{animation:bdg-sideout .35s ease-in both}
#ui.wol .bdg-pop .bdg-two{display:flex;align-items:center;gap:.5em}
#ui.wol .bdg-pop.many .bdg{--bs:5.2em}
#ui.wol .bdg-pop .bdg-more{display:grid;place-items:center;min-width:3.2em;height:3.2em;padding:0 .4em;border-radius:1.6em;background:linear-gradient(#ffd76a,#e8952a);color:#3a2108;font-size:.95em;box-shadow:0 3px 0 #8a5418}
@keyframes bdg-side{from{opacity:0;transform:translateY(40px) scale(.8)}to{opacity:1;transform:none}}
@keyframes bdg-sideout{to{opacity:0;transform:translateY(20px)}}
@keyframes bdg-drop{from{opacity:0;transform:translate(-50%,-60px) scale(.7)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes bdg-out{to{opacity:0;transform:translate(-50%,-20px) scale(.92)}}
@keyframes bdg-spin{from{transform:rotateY(180deg) scale(.6)}to{transform:none}}
@keyframes bdg-rays{to{transform:rotate(360deg)}}
/* low screens: a smaller medallion, high up, so the HUD and the middle of the forest stay free */
@media (max-height:620px){#ui.wol .bdg-pop.tech .tc-card{font-size:.78em}#ui.wol .bdg-pop{top:10px;padding:.6em 1.3em .75em;gap:.25em}#ui.wol .bdg-pop .bdg{--bs:5.6em}#ui.wol .bdg-pop h4{font-size:1em}#ui.wol .bdg-pop p{font-size:.86em;max-width:19em}
  #ui.wol .bdg-pop .rays{width:14em;height:14em;margin:-7em 0 0 -7em}}
@media (prefers-reduced-motion: reduce){#ui.wol .bdg-pop,#ui.wol .bdg-pop .bdg-med,#ui.wol .bdg-pop .rays{animation:none}}`;
    document.head.appendChild(st);
  }
  const queue = []; let busy = false, waitT = 0;
  // a technology card waits while רובו־דע speaks (the workshop's tutorial): one voice and one picture at a time
  const guideTalks = () => { try { const g = svcGuide(); return !!(g && g.isOpen()); } catch (e) { return false; } };
  function next() {
    if (busy || !queue.length) return;
    // a mission banner ("משימה הושלמה!") is showing: the badge waits until it is gone, so they never cover each other
    // 1.4.3: also the robot workshop's step card, the robot lab's opening film, and any screen that holds them for a
    // while ([data-hold-toasts]: the workshop during its tutorial, whose bubbles have short gaps between steps)
    if (root.querySelector('.mission-banner') || document.querySelector('.ss') || document.querySelector('.wk-steps:not([hidden]), .rl-intro, [data-hold-toasts]') || (queue[0] && queue[0].tech && guideTalks())) { if (!waitT) waitT = setTimeout(() => { waitT = 0; next(); }, 300); return; }
    if (queue[0] && queue[0].tech && !TC) { loadTC().then(() => next(), () => { queue.shift(); next(); }); return; }
    const item = queue.shift();
    let html = '', tech = false, many = false;
    if (item && item.tech) {
      const ids = [item.tech]; while (queue.length && queue[0] && queue[0].tech) ids.push(queue.shift().tech);
      const c = TECH_BY.get(ids[0]); if (!c) { next(); return; }
      const kids = playerMode() === 'kids'; tech = true; TC.ensureTechCSS();
      const more = ids.length - 1;
      html = `<i class="rays"></i><h4>${kids ? 'קְלַף טֶכְנוֹלוֹגְיָה חָדָשׁ!' : 'קלף טכנולוגיה חדש!'}</h4>${TC.techCardHTML(c, { kids })}<p>${more > 0 ? (kids ? `וְעוֹד ${more}. ` : `ועוד ${more}. `) : ''}${kids ? 'מְחַכֶּה לָכֶם בָּאַלְבּוֹם, בַּלַּשּׁוֹנִית "טֶכְנוֹלוֹגְיָה".' : 'מחכה לכם באלבום, בלשונית "טכנולוגיה".'}</p>`;
    } else {
      // 6.11 (Avi): many badges at once are one note in the corner: "קיבלתם N תגים!", the first two medallions, and the
      // rest wait in "התגים שלי" (instead of a long row of drops one after another)
      const ids = [item]; for (let i = 0; i < queue.length; i++) if (queue[i] && !queue[i].tech) { ids.push(queue[i]); queue.splice(i--, 1); }
      const list = [...new Set(ids)].map(badgeById).filter(Boolean); if (!list.length) { next(); return; }
      if (list.length === 1) { const b = list[0]; html = `<i class="rays"></i><h4>תג חדש!</h4>${badgeHTML(b)}<p>${b.how}</p>`; }
      else {
        many = true; const kids = playerMode() === 'kids', n = list.length;
        html = `<h4>${kids ? `קִבַּלְתֶּם ${n} תָּגִים!` : `קיבלתם ${n} תגים!`}</h4><div class="bdg-two">${list.slice(0, 2).map((b) => badgeHTML(b)).join('')}${n > 2 ? `<b class="bdg-more">${kids ? `וְעוֹד ${n - 2}` : `ועוד ${n - 2}`}</b>` : ''}</div><p>${kids ? 'כֻּלָּם מְחַכִּים בַּ"תָּגִים שֶׁלִּי"' : 'כולם מחכים ב"התגים שלי"'}</p>`;
      }
    }
    busy = true;
    const el = document.createElement('div'); el.className = 'bdg-pop' + (tech ? ' tech' : '') + (many ? ' many' : ''); el.setAttribute('role', 'status');
    el.innerHTML = html;
    root.appendChild(el);
    try { audio && audio.play('mission'); } catch (e) { /* */ }
    try { window.__flourish && window.__flourish.badge(el); } catch (e) { /* */ }   // round sparks round the medallion (src/ui/flourish.js)
    let done = false;
    const close = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.remove(); busy = false; next(); }, 360); };
    el.addEventListener('click', close); setTimeout(close, 5200);
  }
  // a short pause first: the mission that gave the badge puts up its banner right after the grant
  window.addEventListener('wol-badge', (e) => { queue.push(e.detail); setTimeout(next, 80); });
  window.addEventListener('wol-techcard', (e) => { queue.push({ tech: e.detail }); setTimeout(next, 80); });
}
