// מפת המסע (1.3.2): the six stages of מסע החוקר as a trail on a field map, from the right. Each stage shows its
// medallion, its name and the parts it opens (open, or veiled with what opens them); the current stage glows, the trail
// is walked up to it, and a stage already reached can be seen again (its short scene, then רובו־דע's words).
//
//   openJourneyMap(host, { onPart(part), emit, onClose }) → { close, el }
//   stageEmblem(n)          the stage's emblem (SVG, 24 x 24 stroke icon) – the start screen's journey bar uses it too
//   STAGE_COLOR[n]          the medallion colour of each stage
//   lockWords(part)         short words for a veiled part ("פותחים בשלב 4: חוקר"), beginners with nikud
//   lockTip(part)           רובו־דע says in one bubble what opens a veiled part (and what is still missing)
//   partLabel(part)         the part's name (beginners: with nikud)
// The threads between the parts (חוטים, wave 3: src/ui/threads-ui.js) are drawn over the trail (soft lines between the
// part tiles, dashed while not open) and listed as chips in `.jm-threads`; new ones are announced when the map opens.
import { icon } from './ui/icons.js';
import { esc } from './ui/helpers.js';   // not the ui.js barrel: it would close an import cycle (ui → start → settings → ui)
import * as J from '../core/journey.js';
import { TORAH } from '../core/edition.js';
import { BABA_DA_LOGO } from '../data/logo.js';
import { STAGE_LINES } from '../data/guide-lines.js';
import { mountMapThreads } from './threads-ui.js';
import { svcGuide } from '../core/services.js';

const kids = () => J.playMode() === 'kids';
const t = (f, k) => (kids() ? k : f);

export const STAGE_COLOR = { 1: '#5f9a3e', 2: '#c98a2b', 3: '#2f7f6f', 4: '#2f6f9a', 5: '#b0602c', 6: '#a8433c', 7: '#6a55a8', 8: '#a8861e', 9: '#3e7a8a' };
// emblems: an eye (observer), cards (collector), a shield with a leaf (keeper), a lens (researcher), a bulb (inventor),
// a star (expert), code brackets (programmer), a rocket (entrepreneur), a cog (engineer, 1.4.2). Stroke icons, no crossing bars anywhere.
const EMB = {
  1: '<path d="M2.6 12s3.6-6.2 9.4-6.2 9.4 6.2 9.4 6.2-3.6 6.2-9.4 6.2S2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3"/><circle class="f" cx="12" cy="12" r="1.1"/>',
  2: '<rect x="8.4" y="3.6" width="10.4" height="14.6" rx="2" transform="rotate(9 13.6 10.9)"/><rect x="4.6" y="5.6" width="10.4" height="14.6" rx="2" transform="rotate(-7 9.8 12.9)"/><path d="M7.6 15.4c.4-3 2.4-4.8 5.2-5-.2 3-2.2 4.8-5.2 5z"/>',
  3: '<path d="M12 2.8l7.4 2.9v5.6c0 4.9-3.2 8.3-7.4 10-4.2-1.7-7.4-5.1-7.4-10V5.7z"/><path d="M8.6 15.2c.2-3.9 2.9-6.4 6.8-6.6-.1 3.9-2.8 6.5-6.8 6.6z"/><path d="M8.6 15.2l3.6-3.4"/>',
  4: '<circle cx="10.4" cy="10.4" r="6"/><path d="M14.8 14.8l5.4 5.4" stroke-width="2.6"/><path d="M7.6 8.6a3.4 3.4 0 0 1 2.6-1.9"/>',
  5: '<path d="M12 2.8a6.4 6.4 0 0 0-3.8 11.5c.7.6 1.1 1.4 1.1 2.3h5.4c0-.9.4-1.7 1.1-2.3A6.4 6.4 0 0 0 12 2.8z"/><path d="M9.6 19.2h4.8M10.6 21.6h2.8"/><path d="M10.2 11.6l1.8 1.6 1.8-1.6"/>',
  6: '<path d="M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9z"/>',
  7: '<path d="M8.4 7.2L3.6 12l4.8 4.8"/><path d="M15.6 7.2l4.8 4.8-4.8 4.8"/><path d="M13.6 5.4l-3.2 13.2"/>',
  8: '<path d="M12 2.6c2.9 2.1 4.3 5.3 4.3 9v4.4H7.7v-4.4c0-3.7 1.4-6.9 4.3-9z"/><circle cx="12" cy="9.8" r="1.8"/><path d="M7.7 12.8l-2.7 2.9v3.1l2.7-1.6M16.3 12.8l2.7 2.9v3.1l-2.7-1.6"/><path d="M10.2 18.8l1.8 2.4 1.8-2.4"/>',
  // 1.4.2: the engineer – a cog: a ring and six short teeth around it (they never meet in the middle)
  9: '<circle cx="12" cy="12" r="5.2"/><circle class="f" cx="12" cy="12" r="1.6"/><path d="M12 3.2v2.6M12 18.2v2.6M19.6 7.6l-2.3 1.3M6.7 15.1l-2.3 1.3M19.6 16.4l-2.3-1.3M6.7 8.9L4.4 7.6"/>',
};
// a folded paper map (the journey bar's corner): three panels, the folds meet the edges only
export const mapIcon = (cls = '') => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path class="f" d="M3 6.6l5.6-2.4 6.8 2.4L21 4.2v13.2l-5.6 2.4-6.8-2.4L3 19.8z" fill="currentColor" fill-opacity=".18" stroke="none"/><path d="M3 6.6l5.6-2.4 6.8 2.4L21 4.2v13.2l-5.6 2.4-6.8-2.4L3 19.8z"/><path d="M8.6 4.2v13.2M15.4 6.6v13.2"/></svg>`;
export const stageEmblem = (n) => `<svg class="jm-emb" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${EMB[n] || EMB[1]}</svg>`;

export function partLabel(part) { const P = J.PARTS[part]; return P ? t(P.name, P.kname) : ''; }
const quoted = (s) => (/[?!]$/.test(s) ? `"${s}"` : s);

// short words on a veiled thing (gender-neutral: "פותחים", so they fit every part's name): core/journey.js lockWords
export const lockWords = (part) => J.lockWords(part);
// one bubble of רובו־דע: what opens it, and how far it is
export function lockTip(part, opts = {}) {
  const g = svcGuide(); const P = J.PARTS[part]; if (!g || !P) return;
  const name = quoted(partLabel(part));
  let f, k;
  if (P.after && J.stageNow() >= P.stage) {
    const A = J.PARTS[P.after];
    f = `את ${name} פותחים אחרי שמנסים את ${A.name}.`; k = `אֶת ${name} פּוֹתְחִים אַחֲרֵי שֶׁמְּנַסִּים אֶת ${A.kname}.`;
  } else {
    const st = J.state(); const n = P.stage;
    f = `את ${name} פותחים בשלב ${n}: ${J.STAGES[n - 1].name}.`; k = `אֶת ${name} פּוֹתְחִים בְּשָׁלָב ${n}: ${J.STAGES[n - 1].kname}.`;
    if (st.next && st.next.stage === n && st.next.need.length) { const w = st.next.need[0]; f += ` ${w}, ואתם שם!`; k += ` ${w}, וְאַתֶּם שָׁם!`; }
    else { f += ' ממשיכים במסע, ונגיע לשם!'; k += ' מַמְשִׁיכִים בַּמַּסָּע, וְנַגִּיעַ לְשָׁם!'; }
  }
  try { if (opts.emit) opts.emit('ui:click'); } catch (e) { }
  g.tip({ f, k, expr: 'curious' }, { ms: 7000 });
}

// the parts on the map (the verse game belongs to the torah edition only)
const partsOf = (n) => J.partsOf(n).filter((p) => p !== 'versematch' || TORAH);

// a stage with many parts gets two columns of tiles (the map never scrolls on 800x460): its grid span
const MANY_PARTS = 5;   // more parts than this: two columns
const spanOf = (n) => (partsOf(n).length > MANY_PARTS ? 2 : 1);
// the width of a stage on the map: its columns, and a narrow one for a stage still to come (no parts to show)
const SOON_W = 0.45;
const widthOf = (S) => (S.soon ? SOON_W : spanOf(S.n));
// the trail through the medallions, right to left, in a 600 x 60 box (each stage at the middle of its columns)
function trailSVG(stage, progress) {
  const spans = J.STAGES.map(widthOf), cols = spans.reduce((a, b) => a + b, 0);
  const mid = spans.map((sp, i) => spans.slice(0, i).reduce((a, b) => a + b, 0) + sp / 2);
  const X = (i) => 600 - mid[i] * (600 / cols), Y = (i) => (i % 2 ? 36 : 24);
  const seg = (i) => `M${X(i)} ${Y(i)} C${X(i) - 50} ${Y(i)}, ${X(i + 1) + 50} ${Y(i + 1)}, ${X(i + 1)} ${Y(i + 1)}`;
  let walked = '', ahead = '', part = '';
  for (let i = 0; i < J.STAGES.length - 1; i++) { if (i + 1 < stage) walked += seg(i) + ' '; else ahead += seg(i) + ' '; }
  if (stage < J.LAST) part = `<path class="jm-tr-part" d="${seg(stage - 1)}" pathLength="1" stroke-dasharray="${Math.max(0.001, progress).toFixed(3)} 1"/>`;
  return `<svg class="jm-trail" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
    <path class="jm-tr-bed" d="${walked}${ahead}"/>${ahead ? `<path class="jm-tr-ahead" d="${ahead}"/>` : ''}${walked ? `<path class="jm-tr-walk" d="${walked}"/>` : ''}${part}</svg>`;
}

export function openJourneyMap(host, { onPart, emit, onClose } = {}) {
  const old = host.querySelector(':scope > .jm'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'jm'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t('מפת המסע', 'מַפַּת הַמַּסָּע'));
  host.appendChild(el);
  const click = () => { try { emit && emit('ui:click'); } catch (e) { } };

  function render() {
    const st = J.state(); const cur = st.stage;
    const next = st.next;
    const nextHTML = next
      ? `<div class="jm-next"><span class="jm-nmed" style="--c:${STAGE_COLOR[next.stage]}">${stageEmblem(next.stage)}</span>
          <div class="jm-ntxt"><b>${t(`הדרך לשלב ${next.stage}: ${next.name}`, `הַדֶּרֶךְ לְשָׁלָב ${next.stage}: ${next.name}`)}</b>
          <span class="jm-bar"><i style="width:${Math.round(next.progress * 100)}%"></i></span>
          <small>${esc(next.need.join(t(', או ', ', אוֹ ')))}</small></div></div>`
      : `<div class="jm-next done"><span class="jm-nmed" style="--c:${STAGE_COLOR[J.LAST]}">${stageEmblem(J.LAST)}</span><div class="jm-ntxt"><b>${t('הגעתם לשלב האחרון. אתם מומחים!', 'הִגַּעְתֶּם לַשָּׁלָב הָאַחֲרוֹן. אַתֶּם מֻמְחִים!')}</b></div></div>`;
    const note = st.allOpen ? t('מצב מדריכים: כל החלקים פתוחים במחשב הזה.', 'כָּל הַחֲלָקִים פְּתוּחִים בַּמַּחְשֵׁב הַזֶּה.')
      : st.legacy ? t('שיחקתם עוד לפני המסע, ולכן הכול פתוח לכם.', 'שִׂחַקְתֶּם עוֹד לִפְנֵי הַמַּסָּע, וְלָכֵן הַכֹּל פָּתוּחַ לָכֶם.') : '';
    el.dataset.stage = String(cur);
    el.innerHTML = `<div class="jm-bg" aria-hidden="true"></div>
      <div class="jm-sheet">
        <header class="jm-head">
          <button class="jm-back" data-jm="close">${icon('arrowR')}<span>${t('חזרה', 'חֲזָרָה')}</span></button>
          <div class="jm-title"><small>${t('מסע החוקר', 'מַסַּע הַחוֹקֵר')}</small><h1>${t('מפת המסע', 'מַפַּת הַמַּסָּע')}</h1></div>
          <div class="jm-logo"><img src="${BABA_DA_LOGO}" alt="בבא דע"></div>
        </header>
        <div class="jm-path">
          ${trailSVG(cur, next ? next.progress : 1)}
          <ol class="jm-stages" style="grid-template-columns:${J.STAGES.map((S) => `minmax(0, ${widthOf(S)}fr)`).join(' ')}">${J.STAGES.map((S) => {
            const n = S.n, cls = (n < cur ? 'done' : n === cur ? 'cur' : 'ahead') + (S.soon ? ' soon' : '');
            const parts = partsOf(n), many = spanOf(n) > 1;
            return `<li class="jm-st ${cls}${many ? ' many' : ''}" data-n="${n}" style="--c:${STAGE_COLOR[n]}">
              <div class="jm-medw"><span class="jm-med">${stageEmblem(n)}</span><i class="jm-num">${n}</i>
                ${n <= cur ? `<button class="jm-replay" data-replay="${n}" aria-label="${esc(t(`לראות שוב את שלב ${n}`, `לִרְאוֹת שׁוּב אֶת שָׁלָב ${n}`))}" title="${esc(t('לראות שוב', 'לִרְאוֹת שׁוּב'))}">${icon('play')}</button>` : ''}</div>
              <b class="jm-name">${esc(t(S.name, S.kname))}</b>
              ${n === cur ? `<small class="jm-here">${t('אתם כאן', 'אַתֶּם כָּאן')}</small>` : S.soon ? `<small class="jm-sn jm-soon">${t('בקרוב', 'בְּקָרוֹב')}</small>` : `<small class="jm-sn">${t('שלב', 'שָׁלָב')} ${n}</small>`}
              <ul class="jm-parts">${parts.map((p) => { const open = J.isOpen(p); return `<li><button class="jm-part${open ? '' : ' jv'}" data-part="${p}"
                title="${esc(open ? partLabel(p) : lockWords(p))}"><i class="jm-dot"></i><span>${esc(partLabel(p))}</span></button></li>`; }).join('')}</ul>
            </li>`; }).join('')}</ol>
        </div>
        <footer class="jm-foot">${nextHTML}${note ? `<p class="jm-note">${esc(note)}</p>` : ''}<div class="jm-threads" aria-live="polite"></div></footer>
      </div>`;
  }
  let threads = null;
  const drawThreads = () => { try { threads = mountMapThreads(el, { emit }); } catch (e) { console.error(e); } };
  render(); drawThreads();

  let busy = false;
  async function replay(n) {
    if (busy) return; busy = true; click();
    el.classList.add('replaying');
    try { if (typeof window.__stageScene === 'function') await Promise.resolve(window.__stageScene(n)).catch(() => { }); } catch (e) { }
    el.classList.remove('replaying');
    const g = svcGuide();
    try { if (g) await g.say(STAGE_LINES[n] || [], { modal: true, place: 'center' }); } catch (e) { }
    busy = false;
  }
  el.addEventListener('click', (e) => {
    if (busy) return;
    if (e.target.closest('[data-jm="close"]')) { close(); return; }
    const r = e.target.closest('[data-replay]'); if (r) { replay(+r.dataset.replay); return; }
    const p = e.target.closest('[data-part]'); if (!p) return;
    const part = p.dataset.part;
    if (!J.isOpen(part)) { lockTip(part, { emit }); return; }
    click();
    if (onPart && onPart(part) === true) close();
  });
  // bubble phase: an open bubble of רובו־דע takes Escape first (robo-guide.js stops it in the capture phase)
  const onKey = (e) => { if (e.key === 'Escape' && !(svcGuide() && svcGuide().isOpen())) { e.preventDefault(); close(); } };
  addEventListener('keydown', onKey);
  const repaint = () => { if (el.isConnected) { render(); drawThreads(); } };
  addEventListener('wol-journey', repaint);
  addEventListener('wol-stage-done', repaint);
  function close() {
    if (!el.isConnected) return;
    removeEventListener('keydown', onKey); removeEventListener('wol-journey', repaint); removeEventListener('wol-stage-done', repaint);
    el.classList.add('out'); setTimeout(() => el.remove(), 220);
    try { onClose && onClose(); } catch (e) { console.error(e); }
  }
  requestAnimationFrame(() => { try { el.querySelector('.jm-back').focus({ preventScroll: true }); } catch (e) { } });
  // the first visit: רובו־דע shows how to read the map
  // then the threads that opened since רובו־דע last spoke: their lines glow while he says them
  setTimeout(() => {
    if (!el.isConnected || !svcGuide()) return;
    Promise.resolve(svcGuide().intro('start:map', { modal: true })).then(() => { if (el.isConnected && threads) return threads.announceFresh(); }).catch((e) => console.error(e));
  }, 450);
  return { close, el, repaint };
}
