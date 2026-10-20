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
    const starRow = (id) => { const s = (prog[id] && prog[id].stars) || []; return `<span class="rs-h-stars">${[0, 1, 2].map((i) => `<i class="${s[i] ? 'on' : ''}">★</i>`).join('')}</span>`; };
    el.innerHTML = `<div class="rs-h-bg"></div><div class="rs-h-inner">
      <header class="rs-h-head"><button class="rs-h-back">${icon('arrowR')}<span>חזרה</span></button>
        <div><small class="rs-h-centre">המרכז המדעי</small><h1>${esc(RESEARCH_NAME)}</h1><p>תעלומות בטבע: מודדים, משערים, מנסים ומאזנים</p>
          <div class="rs-h-help">${howtoButton()}<button class="rs-h-tut">${icon('play')}<span>הַדְרָכָה: תַּעֲלוּמָה עִם רוֹבּוֹ־דַּע</span></button></div></div>
        <div class="rs-h-badge">${icon('flask')}</div></header>
      ${LEVELS.map((L) => {
        const mine = CASES.filter((c) => c.level === L.id).sort((a, b) => a.order - b.order);
        const soon = SOON[L.id] || [];
        return `<section class="rs-h-level"><h2>${icon(L.ic)}<span>${esc(L.name)}</span><small>${esc(L.sub)}</small></h2><div class="rs-h-cases">
          ${mine.map((c) => `<button class="rs-h-case" data-case="${c.id}"><div class="rs-h-art"><img src="${ISLAND_ART[c.zone] || ''}" alt=""><span class="rs-h-zone">${esc(ZONE_NAME[c.zone] || '')}</span></div>
            <div class="rs-h-body"><b>${esc(c.title)}</b><p>${esc(c.call)}</p>${starRow(c.id)}</div></button>`).join('')}
          ${soon.map((c) => `<div class="rs-h-case soon"><div class="rs-h-art"><img src="${ISLAND_ART[c.zone] || ''}" alt=""><span class="rs-h-zone">${esc(ZONE_NAME[c.zone] || '')}</span></div>
            <div class="rs-h-body"><b>${esc(c.title)}</b><p>בקרוב</p></div></div>`).join('')}
        </div></section>`;
      }).join('')}
      <section class="rs-h-level rs-h-lab"><h2>${icon('flask')}<span>מעבדת החוקרים</span><small>רובו־דע מחכה לכם: מיקרוסקופ, שולחן ממציאים ואטלס</small></h2>
        <div class="rs-h-cases"><button class="rs-h-case rs-h-labgo"><div class="rs-h-body"><b>${tileIcon('lab', 'rs-h-tic')}המעבדה של רובו־דע</b><p>מגדילים במיקרוסקופ, ממציאים בעזרת הטבע, ומשדרגים את הכלים בסביבות.</p></div></button></div></section>
      </div>`;
    el.querySelector('.rs-h-back').addEventListener('click', close);
    el.querySelectorAll('[data-case]').forEach((b) => b.addEventListener('click', () => { close(); onPick(b.dataset.case); }));
    const lab = el.querySelector('.rs-h-labgo'); if (lab) lab.addEventListener('click', () => { close(); onLab && onLab(); });
    el.querySelector('.howto-replay').addEventListener('click', () => howto(root, HOWTO, { key: 'research', force: true }));
    el.querySelector('.rs-h-tut').addEventListener('click', () => { close(); onPick(TUTORIAL_CASE, { tutorial: true }); });
  }
  function open() { render(); el.classList.add('on'); howto(root, HOWTO, { key: 'research' }); }
  function close() { if (!el.classList.contains('on')) return; el.classList.remove('on'); onClose && onClose(); }
  return { open, close, isOpen: () => el.classList.contains('on') };
}
