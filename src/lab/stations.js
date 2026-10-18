// מעבדת רובו־דע – the two working stations, as panels over the rendered room:
//   the microscope   (a tray of samples, three magnifications, a focus knob; find what is hidden, three times)
//   the inventors table (four steps: the problem, a creature from nature, a prototype, a test in the flow tank)
// Robo-Da only asks questions; he never gives the answer. Plain Hebrew, short lines.
import { esc } from '../ui/ui.js';
import { SAMPLES, sampleById, ZOOMS } from './samples.js';
import { labProgress, markFound, addTry, invent } from './progress.js';

// ───────────────────────────────────────────── the microscope
export function openMicroscope(root, { say, thumbs, audio, onDone, onClose, start }) {
  const el = document.createElement('div'); el.className = 'lb-panel lb-scope'; root.appendChild(el);
  let cur = (start && sampleById(start)) || SAMPLES[0], level = 0, focus = 18, hintI = 0;   // start: a sample asked for by a research question
  const prog = () => labProgress();
  function render() {
    const P = prog(); const found = new Set(P.found[cur.id] || []);
    const svgBody = cur.view(level);
    const sharp = Math.abs(focus - cur.focus);
    const blur = Math.min(9, sharp * 0.3);
    const marks = level === cur.zoom ? cur.targets.map((t, i) => found.has(i) ? `<g class="lb-mark"><circle cx="${t.x}" cy="${t.y}" r="${t.r * 0.8}" fill="none" stroke="#f2b84a" stroke-width="6"/><circle cx="${t.x + t.r * 0.62}" cy="${t.y - t.r * 0.62}" r="13" fill="#4f9a3c"/><path d="M${t.x + t.r * 0.62 - 6} ${t.y - t.r * 0.62} l4 4 l8 -9" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>` : '').join('') : '';
    const n = Math.min(3, found.size);
    el.innerHTML = `
      <section class="lb-side">
        <h2>המיקרוסקופ</h2>
        <div class="lb-card"><small>הדגימה: ${esc(cur.name)}</small><p>${esc(cur.task)}</p>
          <div class="lb-dots">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}<b>${n} מתוך 3</b></div></div>
        ${P.seen[cur.id] ? `<div class="lb-card lb-found"><small>גילוי</small><p>${esc(cur.found)}</p></div>` : ''}
        <button class="lb-btn lb-hint">רמז מרובו־דע</button>
      </section>
      <div class="lb-eye-wrap">
        <div class="lb-eye"><svg viewBox="0 0 400 400" style="filter:blur(${blur.toFixed(1)}px)">${svgBody}</svg>
          <svg class="lb-eye-marks" viewBox="0 0 400 400">${marks}</svg><div class="lb-eye-vig"></div></div>
        <div class="lb-zooms" role="group" aria-label="הגדלה">${ZOOMS.map((z, i) => `<button data-z="${i}" class="${i === level ? 'on' : ''}">${z}</button>`).join('')}</div>
      </div>
      <section class="lb-side">
        <label class="lb-focus">מיקוד<input type="range" min="0" max="100" value="${focus}"></label>
        <h3>מגש הדגימות</h3>
        <div class="lb-tray">${SAMPLES.map((s) => `<button data-s="${s.id}" class="${s === cur ? 'on' : ''} ${P.seen[s.id] ? 'done' : ''}">${thumbs[s.species] ? `<img src="${thumbs[s.species]}" alt="">` : ''}<span>${esc(s.name)}</span></button>`).join('')}
          <div class="lb-locked"><span>עוד דגימות יגיעו מהתעלומות ומהסביבות</span></div></div>
        <button class="lb-btn lb-back">חזרה לחדר</button>
      </section>`;
    el.querySelector('.lb-back').onclick = close;
    el.querySelector('.lb-hint').onclick = () => { say(cur.hints[hintI++ % cur.hints.length], 'curious'); };
    el.querySelectorAll('[data-z]').forEach((b) => b.onclick = () => { level = +b.dataset.z; audio && audio.play('click'); render(); });
    el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { cur = sampleById(b.dataset.s); level = 0; focus = 18; hintI = 0; audio && audio.play('click'); render(); say('דגימה חדשה. קודם מכוונים את המיקוד עד שהתמונה חדה.', 'happy'); });
    const rg = el.querySelector('input[type=range]');
    rg.oninput = () => { focus = +rg.value; const s = el.querySelector('.lb-eye svg'); const d = Math.abs(focus - cur.focus); s.style.filter = `blur(${Math.min(9, d * 0.3).toFixed(1)}px)`; };
    el.querySelector('.lb-eye').onclick = (e) => click(e);
  }
  function click(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width * 400, y = (e.clientY - box.top) / box.height * 400;
    if (Math.abs(focus - cur.focus) > 7) { say('התמונה מטושטשת. סובבו את כפתור המיקוד.', 'curious'); audio && audio.play('invalid'); return; }
    if (level < cur.zoom) { say('צריך להגדיל עוד.', 'curious'); return; }
    const P = prog(); const found = new Set(P.found[cur.id] || []);
    const i = cur.targets.findIndex((t, k) => !found.has(k) && Math.hypot(t.x - x, t.y - y) < t.r);
    if (i < 0) { if (found.size < 3) say('לא כאן. חפשו עוד.', 'curious'); return; }
    if (found.size >= 3) return;
    const was = !!P.seen[cur.id];
    const O = markFound(cur.id, i, 3);
    audio && audio.play('discover');
    if (!was && O.seen[cur.id]) { say(cur.found + ' ' + cur.idea, 'wow'); onDone && onDone(cur); }
    else say(['יפה! עוד אחד.', 'מצאתם! נשאר עוד קצת.'][found.size % 2], 'happy');
    render();
  }
  function close() { el.remove(); onClose && onClose(); }
  render();
  say('ברוכים הבאים למיקרוסקופ. בחרו דגימה, הגדילו, וסובבו את המיקוד עד שהתמונה חדה.', 'happy');
  return { close };
}

// ───────────────────────────────────────────── the inventors table: the shark-skin coat
const CHOICES = [
  { id: 'smooth', name: 'משטח חלק', result: 0, line: 'חלק לגמרי. המים מתחככים בו כמו קודם.' },
  { id: 'along', name: 'חריצים זעירים לאורך הזרם', result: 8, line: 'החריצים מכוונים את המים, והם פחות מתחככים ברובוט.' },
  { id: 'across', name: 'חריצים זעירים לרוחב הזרם', result: -5, line: 'החריצים עומדים מול המים ומעכבים אותם.' },
  { id: 'bumps', name: 'בליטות גדולות', result: -12, line: 'בליטות גדולות עוצרות את המים.' },
];
const CREATURES = [
  { id: 'reefshark', name: 'כריש שונית', ok: true },
  { id: 'octopus', name: 'תמנון', q: 'התמנון נדבק ומתכווץ. האם זה עוזר להחליק במים?' },
  { id: 'turtle', name: 'צב ים ירוק', q: 'לצב יש שריון קשה. האם השריון שלו עוזר לו לשחות מהר?' },
  { id: 'urchin', name: 'קיפוד ים', q: 'קיפוד הים זז לאט על הסלע. מי בשונית שוחה הכי מהר?' },
];
const GOAL = 5;
export function openInventors(root, { say, thumbs, audio, onInvented, onClose, goScope }) {
  const el = document.createElement('div'); el.className = 'lb-panel lb-inv'; root.appendChild(el);
  let step = 1, creature = null, choice = null, tests = [];
  const P0 = labProgress(); if (P0.inventions.sharkskin) step = 5;
  const steps = ['הבעיה', 'מחפשים בטבע', 'בונים אב טיפוס', 'בודקים ומשפרים'];
  function render() {
    const P = labProgress();
    const skinSeen = !!P.seen.sharkskin;
    const bar = `<ol class="lb-steps">${steps.map((s, i) => `<li class="${i + 1 < step ? 'done' : i + 1 === step ? 'on' : ''}"><span>${i + 1}</span><b>${s}</b></li>`).join('')}</ol>`;
    let left = `<div class="lb-card"><small class="lb-red">קלף אתגר</small><h3>הרובוט הצולל איטי מדי</h3><p>הוא לא מספיק לסרוק את כל השונית לפני שהסוללה נגמרת. איך הוא יחליק במים בקלות?</p></div>`;
    if (creature) left += `<div class="lb-card lb-pick">${thumbs[creature.id] ? `<img src="${thumbs[creature.id]}" alt="">` : ''}<div><small>בחרתם מהטבע</small><b>${esc(creature.name)}</b><span>העור שלו מכוסה קשקשים זעירים דמויי שיניים.</span></div></div>`;
    let mid = '';
    if (step === 1) {
      mid = `<div class="lb-board"><h3>מה הבעיה?</h3><p class="lb-big">הרובוט הצולל דוחף את המים, והמים מתחככים בגוף שלו. ככה הוא מבזבז כוח.</p>
        <p>מי בטבע שוחה מהר מאוד, ובקלות?</p><button class="lb-btn lb-go">לחפש בטבע</button></div>`;
    } else if (step === 2) {
      mid = `<div class="lb-board"><h3>בחרו יצור מהשונית</h3><div class="lb-creatures">${CREATURES.map((c) => `<button data-c="${c.id}">${thumbs[c.id] ? `<img src="${thumbs[c.id]}" alt="">` : ''}<span>${esc(c.name)}</span></button>`).join('')}</div></div>`;
    } else if (step === 3 || step === 4) {
      mid = `<div class="lb-board lb-blue"><h3>אב טיפוס: ציפוי לרובוט</h3>${rovSketch(choice)}
        <div class="lb-choices">${CHOICES.map((c) => `<button data-ch="${c.id}" class="${choice && choice.id === c.id ? 'on' : ''}">${esc(c.name)}</button>`).join('')}</div>
        ${choice ? `<button class="lb-btn lb-test">לבדוק במכל הזרם</button>` : '<p>בחרו איזה משטח לשים על הרובוט.</p>'}</div>`;
    } else {
      mid = `<div class="lb-board lb-patent"><small>פטנט חדש!</small><h3>ציפוי עור כריש</h3>
        <p class="lb-big">הרובוט הצולל בשונית שוחה עכשיו מהר יותר. הוא סורק את כל השונית בפחות זמן.</p>
        <p>החריצים הזעירים, כמו על הקשקשים של הכריש, מכוונים את המים לאורך הגוף.</p></div>`;
    }
    const right = `<div class="lb-test-box"><b>מכל הזרם</b>${tankSVG(tests.length ? tests[tests.length - 1] : null)}
      ${tests.map((t, i) => `<div class="lb-row"><span>ניסיון ${i + 1}: ${esc(t.c.name)}</span><span class="${t.c.result >= GOAL ? 'good' : t.c.result < 0 ? 'bad' : ''}">${t.c.result > 0 ? t.c.result + '% פחות חיכוך' : t.c.result < 0 ? -t.c.result + '% יותר חיכוך' : 'בלי שינוי'}</span></div>
        <div class="lb-meter"><i style="width:${Math.max(4, 50 + t.c.result * 4)}%" class="${t.c.result >= GOAL ? 'good' : t.c.result < 0 ? 'bad' : ''}"></i></div>`).join('')}
      <small>היעד: לפחות ${GOAL}% פחות חיכוך</small></div>`;
    el.innerHTML = `<header><h2>שולחן הממציאים</h2><p>תכונה של יצור פותרת בעיה. ארבעה שלבים, וכל ניסיון מקרב אותנו.</p><button class="lb-btn lb-back">חזרה לחדר</button></header>
      ${bar}<div class="lb-cols"><section>${left}</section><section>${mid}</section><section>${right}</section></div>`;
    el.querySelector('.lb-back').onclick = close;
    const go = el.querySelector('.lb-go'); if (go) go.onclick = () => { step = 2; say('מי שוחה מהר מכולם בשונית? חשבו על העור שלו.', 'curious'); render(); };
    el.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
      const c = CREATURES.find((x) => x.id === b.dataset.c);
      if (!c.ok) { say(c.q, 'curious'); audio && audio.play('invalid'); return; }
      if (!skinSeen) { say('בחירה טובה! אבל מה יש על העור של הכריש? בואו נבדוק קודם במיקרוסקופ.', 'curious'); goScope && goScope(); return; }
      creature = c; step = 3; audio && audio.play('discover'); say('ראינו במיקרוסקופ חריצים זעירים על הקשקשים. איזה משטח נבנה לרובוט?', 'happy'); render();
    });
    el.querySelectorAll('[data-ch]').forEach((b) => b.onclick = () => { choice = CHOICES.find((x) => x.id === b.dataset.ch); step = Math.max(step, 3); audio && audio.play('click'); render(); });
    const tb = el.querySelector('.lb-test'); if (tb) tb.onclick = test;
  }
  function test() {
    step = 4; tests.push({ c: choice }); addTry('sharkskin', choice.id, choice.result);
    render();
    const box = el.querySelector('.lb-tank'); if (box) box.classList.add('run');
    setTimeout(() => {
      if (choice.result >= GOAL) {
        say(choice.line + ' עברנו את היעד! זה ההמצאה שלנו.', 'wow'); audio && audio.play('mission');
        setTimeout(() => { const first = invent('sharkskin'); step = 5; render(); onInvented && onInvented('sharkskin', first); }, 1600);
      } else {
        say(choice.line + ' עוד לא הגענו ליעד. מה אפשר לשנות?', 'curious');
      }
    }, 1400);
  }
  function close() { el.remove(); onClose && onClose(); }
  render();
  if (step === 5) say('את הפטנט הזה כבר המצאתם. הרובוט הצולל בשונית שוחה מהר יותר.', 'happy');
  else say('בשולחן הממציאים לוקחים רעיון מהטבע ופותרים בעיה. בואו נתחיל.', 'happy');
  return { close };
}

function rovSketch(choice) {
  const id = choice && choice.id;
  let tex = '';
  if (id === 'along') for (let k = 0; k < 10; k++) tex += `<path d="M${70 + k * 24} ${78 - k * 1.4} l16 -2 M${70 + k * 24} ${122 + k * 1.4} l16 2" stroke="#1d4f88" stroke-width="2"/>`;
  if (id === 'across') for (let k = 0; k < 10; k++) tex += `<path d="M${76 + k * 24} ${70 - k * 1.2} l0 12 M${76 + k * 24} ${118 + k * 1.2} l0 12" stroke="#1d4f88" stroke-width="2"/>`;
  if (id === 'bumps') for (let k = 0; k < 7; k++) tex += `<circle cx="${80 + k * 34}" cy="${76 - k}" r="7" fill="#9fb7d6" stroke="#1d4f88" stroke-width="1.5"/><circle cx="${80 + k * 34}" cy="${124 + k}" r="7" fill="#9fb7d6" stroke="#1d4f88" stroke-width="1.5"/>`;
  return `<svg class="lb-sketch" viewBox="0 0 420 200" role="img" aria-label="שרטוט של הרובוט הצולל">
    <path d="M30 100 Q120 40 280 60 L390 92 L280 128 Q120 156 30 100z" fill="#dbe8f6" stroke="#2f5f9a" stroke-width="3"/>${tex}
    <circle cx="330" cy="92" r="12" fill="#6fd0ff" stroke="#2f5f9a" stroke-width="2"/>
    <g stroke="#2f9a95" stroke-width="2" fill="none" stroke-dasharray="6 6"><path d="M0 34 Q200 24 420 40"/><path d="M0 170 Q200 180 420 164"/></g></svg>`;
}
function tankSVG(t) {
  const r = t ? t.c.result : 0;
  const lines = [0, 1, 2, 3, 4].map((k) => { const y = 30 + k * 22, wob = r < 0 ? 10 : r > 0 ? 2 : 5; return `<path class="lb-flow" d="M0 ${y} q40 ${-wob} 80 0 t80 0 t80 0 t80 0" stroke="#7fd0f0" stroke-width="2" fill="none" stroke-dasharray="10 8"/>`; }).join('');
  return `<svg class="lb-tank ${t ? 'has' : ''}" viewBox="0 0 320 150"><rect x="2" y="12" width="316" height="126" rx="8" fill="#123a4e" stroke="#9fd8ff" stroke-width="2"/>${lines}
    <path d="M110 75 Q150 50 200 58 L240 72 L200 88 Q150 98 110 75z" fill="#f2c21a" stroke="#2a2a2a" stroke-width="2"/></svg>`;
}
