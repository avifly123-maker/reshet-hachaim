// A new badge drops in over whatever is open (the forest, the hub, the lab): the medallion, its name and how it was
// earned. One at a time; a click or 5 seconds closes it. Listens to the 'wol-badge' event (src/core/badges-store.js).
import { badgeHTML, BADGE_CSS } from './badge-art.js';
import { badgeById } from '../data/badges.js';

export function startBadgeToasts(root, audio) {
  if (!document.getElementById('wol-badge-css')) {
    const st = document.createElement('style'); st.id = 'wol-badge-css';
    st.textContent = BADGE_CSS + `
#ui.wol .bdg-pop{position:absolute;left:50%;top:14%;z-index:400;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.4em;padding:1.1em 1.8em 1.2em;border-radius:1.2em;
  background:radial-gradient(ellipse at 50% 30%,rgba(60,48,22,.96),rgba(24,20,10,.96));box-shadow:0 1.2em 2.6em rgba(0,0,0,.55),inset 0 0 0 2px rgba(246,207,114,.4);color:#fbf3d8;pointer-events:auto;cursor:pointer;
  animation:bdg-drop .8s cubic-bezier(.2,1.4,.4,1) both}
#ui.wol .bdg-pop.out{animation:bdg-out .35s ease-in both}
#ui.wol .bdg-pop h4{margin:0;font-family:var(--serif);font-size:1.15em;color:#f6cf72;letter-spacing:.02em}
#ui.wol .bdg-pop .bdg{--bs:8.6em}
#ui.wol .bdg-pop .bdg-med{animation:bdg-spin 1.1s .2s ease-out both}
#ui.wol .bdg-pop p{margin:0;max-width:22em;text-align:center;color:#e6dcbc;font-size:.95em}
#ui.wol .bdg-pop .rays{position:absolute;left:50%;top:44%;width:22em;height:22em;margin:-11em 0 0 -11em;border-radius:50%;pointer-events:none;z-index:-1;
  background:repeating-conic-gradient(rgba(246,207,114,.16) 0 7deg,transparent 7deg 20deg);animation:bdg-rays 9s linear infinite;-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}
@keyframes bdg-drop{from{opacity:0;transform:translate(-50%,-60px) scale(.7)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes bdg-out{to{opacity:0;transform:translate(-50%,-20px) scale(.92)}}
@keyframes bdg-spin{from{transform:rotateY(180deg) scale(.6)}to{transform:none}}
@keyframes bdg-rays{to{transform:rotate(360deg)}}
/* low screens: a smaller medallion, high up, so the HUD and the middle of the forest stay free */
@media (max-height:620px){#ui.wol .bdg-pop{top:10px;padding:.6em 1.3em .75em;gap:.25em}#ui.wol .bdg-pop .bdg{--bs:5.6em}#ui.wol .bdg-pop h4{font-size:1em}#ui.wol .bdg-pop p{font-size:.86em;max-width:19em}
  #ui.wol .bdg-pop .rays{width:14em;height:14em;margin:-7em 0 0 -7em}}
@media (prefers-reduced-motion: reduce){#ui.wol .bdg-pop,#ui.wol .bdg-pop .bdg-med,#ui.wol .bdg-pop .rays{animation:none}}`;
    document.head.appendChild(st);
  }
  const queue = []; let busy = false, waitT = 0;
  function next() {
    if (busy || !queue.length) return;
    // a mission banner ("משימה הושלמה!") is showing: the badge waits until it is gone, so they never cover each other
    if (root.querySelector('.mission-banner')) { if (!waitT) waitT = setTimeout(() => { waitT = 0; next(); }, 300); return; }
    const b = badgeById(queue.shift()); if (!b) { next(); return; }
    busy = true;
    const el = document.createElement('div'); el.className = 'bdg-pop'; el.setAttribute('role', 'status');
    el.innerHTML = `<i class="rays"></i><h4>תג חדש!</h4>${badgeHTML(b)}<p>${b.how}</p>`;
    root.appendChild(el);
    try { audio && audio.play('mission'); } catch (e) { /* */ }
    let done = false;
    const close = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.remove(); busy = false; next(); }, 360); };
    el.addEventListener('click', close); setTimeout(close, 5200);
  }
  // a short pause first: the mission that gave the badge puts up its banner right after the grant
  window.addEventListener('wol-badge', (e) => { queue.push(e.detail); setTimeout(next, 80); });
}
