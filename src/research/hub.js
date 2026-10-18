// חוקרי היער – the research centre: the mysteries (תעלומות) by level, with the stars each player earned.
// Opened from the start screen; picking a mystery calls onPick(caseId) and main.js builds its island.
import { icon, esc } from '../ui/ui.js';
import { ISLAND_ART } from '../data/island-art.js';
import { CASES } from './cases/index.js';
import { researchProgress } from './progress.js';
import { RESEARCH_NAME } from './texts.js';

// what comes next (design: the research centre plan, 2026-10-15): shown greyed, so the child sees the world is bigger
const SOON = {
  kids: [{ title: 'אֵיפֹה הַצְּפַרְדְּעִים?', zone: 'amazon' }],
  middle: [{ title: 'המלכודת', zone: 'grove' }, { title: 'החורש שלא מתחדש', zone: 'grove' }, { title: 'הנמלים שאכלו את היער', zone: 'amazon' }],
  advanced: [{ title: 'האלמוג הלבן', zone: 'reef' }, { title: 'היער שנשאר בלי טורפים', zone: 'amazon' }, { title: 'אש בקיץ', zone: 'grove' }, { title: 'הצבאים נעלמים', zone: 'grove' }],
};
const LEVELS = [
  { id: 'kids', name: 'מתחילים', sub: 'סיבה אחת, רמזים, מנוקד', ic: 'sprout' },
  { id: 'middle', name: 'בינוני', sub: 'שתי סיבות ומלכודת', ic: 'binoc' },
  { id: 'advanced', name: 'מתקדמים', sub: 'רשת שלמה, איזון לאורך זמן', ic: 'web' },
];
const ZONE_NAME = { grove: 'החורש', amazon: 'האמזונס', reef: 'השונית' };

export function createResearchHub(root, { onPick, onClose }) {
  const el = document.createElement('div');
  el.className = 'rs-hub';
  root.appendChild(el);
  function render() {
    const prog = researchProgress().cases;
    const starRow = (id) => { const s = (prog[id] && prog[id].stars) || []; return `<span class="rs-h-stars">${[0, 1, 2].map((i) => `<i class="${s[i] ? 'on' : ''}">★</i>`).join('')}</span>`; };
    el.innerHTML = `<div class="rs-h-bg"></div><div class="rs-h-inner">
      <header class="rs-h-head"><button class="rs-h-back">${icon('arrowL')}<span>חזרה</span></button>
        <div><small class="rs-h-centre">המרכז המדעי</small><h1>${esc(RESEARCH_NAME)}</h1><p>תעלומות בטבע: מודדים, משערים, מנסים ומאזנים</p></div>
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
        <div class="rs-h-cases"><div class="rs-h-case soon"><div class="rs-h-body"><b>המעבדה של רובו־דע</b><p>בקרוב</p></div></div></div></section>
      </div>`;
    el.querySelector('.rs-h-back').addEventListener('click', close);
    el.querySelectorAll('[data-case]').forEach((b) => b.addEventListener('click', () => { close(); onPick(b.dataset.case); }));
  }
  function open() { render(); el.classList.add('on'); }
  function close() { if (!el.classList.contains('on')) return; el.classList.remove('on'); onClose && onClose(); }
  return { open, close, isOpen: () => el.classList.contains('on') };
}
