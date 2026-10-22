// חוקרי הטבע – the research centre: the mysteries (תעלומות) by level, with the stars each player earned.
// Opened from the start screen; picking a mystery calls onPick(caseId) and main.js builds its island.
import { icon, esc } from '../ui/ui.js';
import { tileIcon } from '../ui/icons-hub.js';
import { ISLAND_ART } from '../data/island-art.js';
import { CASES } from './cases/index.js';
import { researchProgress } from './progress.js';
import { RESEARCH_NAME } from './texts.js';
import { howto, howtoButton } from '../ui/howto.js';
import { CARD_ART } from '../data/card-art.js';
import { BABA_DA_LOGO } from '../data/logo.js';
import { isOpen, introSeen } from '../core/journey.js';
import { lockWords, lockTip } from '../ui/journey-map.js';

// "איך משחקים": four short cards the first time the research centre opens (replay with the "?" button). Vocalised,
// so beginners read them too. Pictures: the card paintings.
const HOWTO = [
  { img: CARD_ART.spinymouse, text: 'בְּכָל תַּעֲלוּמָה מַשֶּׁהוּ בַּטֶּבַע יָצָא מֵאִזּוּן. צָרִיךְ לְגַלּוֹת לָמָּה.' },
  { img: CARD_ART.camera, text: 'מוֹדְדִים: כְּלֵי מֶחְקָר סוֹפְרִים מִי חַי בַּמָּקוֹם וְכַמָּה.' },
  { img: CARD_ART.owl, text: 'מְנַחֲשִׁים: כּוֹתְבִים בַּמַּחְבֶּרֶת מָה גּוֹרֵם לְמָה.' },
  { img: CARD_ART.nestbox, text: 'מְנַסִּים רַעְיוֹן, רוֹאִים מָה קָרָה, וּמְבִינִים לָמָּה. גַּם נִסָּיוֹן שֶׁלֹּא הִצְלִיחַ מְלַמֵּד.' },
];
const TUTORIAL_CASE = 'mice-owl';   // the guided mystery (session.js)

// what comes next (design: the research centre plan, 2026-10-15): shown greyed, so the child sees the world is bigger
const SOON = {
  kids: [],
  middle: [],
  advanced: [],
};
const LEVELS = [
  { id: 'kids', name: 'מתחילים', sub: 'סיבה אחת, רמזים, מנוקד', ic: 'sprout' },
  { id: 'middle', name: 'בינוני', sub: 'שתי סיבות ומלכודת', ic: 'binoc' },
  { id: 'advanced', name: 'מתקדמים', sub: 'רשת שלמה, איזון לאורך זמן', ic: 'web' },
];
const ZONE_NAME = { grove: 'החורש', amazon: 'האמזונס', reef: 'השונית' };

export function createResearchHub(root, { onPick, onClose, onLab }) {
  const el = document.createElement('div');
  el.className = 'rs-hub';
  root.appendChild(el);
  function render() {
    const prog = researchProgress().cases;
    // מסע החוקר (1.3.2): the mysteries open with the part 'research', the lab entry with 'lab'; veiled, never hidden
    const rsOpen = isOpen('research'), labOpen = isOpen('lab');
    const veil = (open, part) => (open ? '' : ` jv" data-part="${part}" title="${esc(lockWords(part))}`);
    const starRow = (id) => { const s = (prog[id] && prog[id].stars) || []; return `<span class="rs-h-stars">${[0, 1, 2].map((i) => `<i class="${s[i] ? 'on' : ''}">★</i>`).join('')}</span>`; };
    el.innerHTML = `<div class="rs-h-bg"></div><div class="rs-h-inner">
      <header class="rs-h-head"><button class="rs-h-back">${icon('arrowR')}<span>חזרה</span></button>
        <div><small class="rs-h-centre">המרכז המדעי</small><h1>${esc(RESEARCH_NAME)}</h1><p>תעלומות בטבע: מודדים, משערים, מנסים ומאזנים</p>
          <div class="rs-h-help">${howtoButton()}<button class="rs-h-tut${veil(rsOpen, 'research')}">${icon('play')}<span>הַדְרָכָה: תַּעֲלוּמָה עִם רוֹבּוֹ־דַּע</span></button></div></div>
        <div class="rs-h-logo"><img src="${BABA_DA_LOGO}" alt="בבא דע"></div></header>
      ${rsOpen ? '' : `<p class="rs-h-veil">${icon('sprout')}<span>${esc(lockWords('research'))}</span></p>`}
      ${LEVELS.map((L) => {
        const mine = CASES.filter((c) => c.level === L.id).sort((a, b) => a.order - b.order);
        const soon = SOON[L.id] || [];
        return `<section class="rs-h-level"><h2>${icon(L.ic)}<span>${esc(L.name)}</span><small>${esc(L.sub)}</small></h2><div class="rs-h-cases">
          ${mine.map((c) => `<button class="rs-h-case${veil(rsOpen, 'research')}" data-case="${c.id}"><div class="rs-h-art"><img src="${ISLAND_ART[c.zone] || ''}" alt=""><span class="rs-h-zone">${esc(ZONE_NAME[c.zone] || '')}</span></div>
            <div class="rs-h-body"><b>${esc(c.title)}</b><p>${esc(c.call)}</p>${starRow(c.id)}</div></button>`).join('')}
          ${soon.map((c) => `<div class="rs-h-case soon"><div class="rs-h-art"><img src="${ISLAND_ART[c.zone] || ''}" alt=""><span class="rs-h-zone">${esc(ZONE_NAME[c.zone] || '')}</span></div>
            <div class="rs-h-body"><b>${esc(c.title)}</b><p>בקרוב</p></div></div>`).join('')}
        </div></section>`;
      }).join('')}
      <section class="rs-h-level rs-h-lab"><h2>${icon('flask')}<span>מעבדת החוקרים</span><small>רובו־דע מחכה לכם: מיקרוסקופ, שולחן ממציאים ואטלס</small></h2>
        <div class="rs-h-cases"><button class="rs-h-case rs-h-labgo${veil(labOpen, 'lab')}"><div class="rs-h-body"><b>${tileIcon('lab', 'rs-h-tic')}המעבדה של רובו־דע</b><p>${labOpen ? 'מגדילים במיקרוסקופ, ממציאים בעזרת הטבע, ומשדרגים את הכלים בסביבות.' : esc(lockWords('lab'))}</p></div></button></div></section>
      </div>`;
    el.querySelector('.rs-h-back').addEventListener('click', close);
    // a veiled button: רובו־דע says what opens it
    const gate = (b, fn) => b.addEventListener('click', () => { if (b.classList.contains('jv')) lockTip(b.dataset.part); else fn(); });
    el.querySelectorAll('[data-case]').forEach((b) => gate(b, () => { close(); onPick(b.dataset.case); }));
    const lab = el.querySelector('.rs-h-labgo'); if (lab) gate(lab, () => { close(); onLab && onLab(); });
    el.querySelector('.howto-replay').addEventListener('click', () => howto(root, HOWTO, { key: 'research', force: true }));
    gate(el.querySelector('.rs-h-tut'), () => { close(); onPick(TUTORIAL_CASE, { tutorial: true }); });
  }
  // the first entry: רובו־דע presents the centre (his bubbles take the place of the four how-to cards, which stay on
  // the "?" button); a player who already met him there gets the how-to cards once, as before
  function open() {
    render(); el.classList.add('on');
    const g = window.__guide;
    if (g && isOpen('research') && !introSeen('g:research')) setTimeout(() => { if (el.classList.contains('on')) g.intro('research', { modal: true }); }, 450);
    else if (isOpen('research')) howto(root, HOWTO, { key: 'research' });
  }
  function close() { if (!el.classList.contains('on')) return; el.classList.remove('on'); onClose && onClose(); }
  // a part opened or another player was chosen while the centre is open: draw it again
  addEventListener('wol-journey', () => { if (el.classList.contains('on')) render(); });
  return { open, close, isOpen: () => el.classList.contains('on') };
}
