// מעבדת רובו־דע – שאלות חקר: the research questions of the atlas (data: src/data/lab-questions.js).
// Three steps for every question: a guess (what do I think?), an investigation (the microscope, the inventors table,
// or an observation told by רובו־דע) and then the answer, with what the guess turned out to be.
// The answers stay in the atlas (per player, web-of-life-lab `qs`). Badges: lab:q5, lab:q20, lab:qall, lab:open.
// The panel refreshes itself while open, so a problem solved in the hub's inventors game shows up on return.
import { esc } from '../ui/ui.js';
import { QUESTIONS } from '../data/lab-questions.js';
import { PROBLEMS } from '../data/inventions.js';
import { SAMPLES } from './samples.js';
import { labProgress, setQuestion } from './progress.js';
import { grant as grantBadge } from '../core/badges-store.js';
import { labKids, fmt } from './level.js';
import { QUEST_K, QUEST_UI_K, SAMPLES_K } from './kids-text.js';
import { PROBLEMS_K } from '../data/inventions-kids.js';
import { questionMarked } from '../core/threads.js';   // חוטים: a relation found on the island marks its creature's question
import { markHTML } from '../ui/threads-ui.js';

const ZONES = [['amazon', 'אמזונס'], ['grove', 'חורש'], ['reef', 'שונית']];

const CSS_ID = 'lb-quest-css';
function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const st = document.createElement('style'); st.id = CSS_ID;
  st.textContent = `
#ui.wol .lb-quest { background: linear-gradient(180deg, rgba(251, 246, 228, .98), rgba(239, 230, 200, .98)); display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
#ui.wol .lb-quest header { display: flex; align-items: center; gap: 14px; flex: none; }
#ui.wol .lb-quest header p { flex: 1; margin: 0; color: #5a4a30; font-weight: 700; }
#ui.wol .lb-q-cols { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(230px, 340px) minmax(0, 1fr); gap: 16px; }
#ui.wol .lb-q-side { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
#ui.wol .lb-q-zones { display: flex; gap: 6px; flex: none; }
#ui.wol .lb-q-zones button { flex: 1; padding: 7px 10px; border-radius: 999px; border: 2px solid #c9b98a; background: #fffaf0; color: #5a4a30; font: inherit; font-weight: 800; cursor: pointer; }
#ui.wol .lb-q-zones button.on { background: #2c4f26; border-color: #2c4f26; color: #fff6dc; }
#ui.wol .lb-q-list { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; min-height: 0; padding: 2px 4px 2px 2px; }
#ui.wol .lb-q-list button { display: grid; grid-template-columns: 40px 1fr; grid-template-rows: auto auto; column-gap: 9px; align-items: center; text-align: right; padding: 7px 9px; border-radius: 12px; border: 2px solid transparent; background: #fff; color: #2a1a0e; font: inherit; cursor: pointer; box-shadow: 0 2px 0 #d8c79a; }
#ui.wol .lb-q-list button img { grid-row: span 2; width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
#ui.wol .lb-q-list button span { font-weight: 700; font-size: .92em; line-height: 1.25; }
#ui.wol .lb-q-list button small { font-size: .74em; font-weight: 800; color: #8a7a50; }
#ui.wol .lb-q-list button.on { border-color: #e0a43a; }
#ui.wol .lb-q-list button.done small { color: #3a7a2a; } #ui.wol .lb-q-list button.done { background: #f1f8e8; }
#ui.wol .lb-q-list button.open small { color: #5a3a88; } #ui.wol .lb-q-list button.open { background: #f4eefa; }
#ui.wol .lb-q-list button.wait small { color: #a8641a; }
#ui.wol .lb-q-main { overflow-y: auto; min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 2px 4px 2px 2px; }
#ui.wol .lb-q-empty { margin: auto; text-align: center; color: #5a4a30; font-size: 1.05em; }
#ui.wol .lb-q-head { display: flex; align-items: center; gap: 12px; }
#ui.wol .lb-q-head img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0, 0, 0, .2); flex: none; }
#ui.wol .lb-q-head h3 { margin: 0; color: #2c4f26; font-size: 1.3em; line-height: 1.25; }
#ui.wol .lb-q-step { padding: 9px 12px; border-radius: 12px; background: #fff; box-shadow: 0 2px 0 #d8c79a; }
#ui.wol .lb-q-step > b { display: flex; align-items: center; gap: 8px; font-family: var(--serif); font-size: 1.05em; }
#ui.wol .lb-q-step > b i { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #c9b98a; color: #fff; font-style: normal; font-size: .85em; }
#ui.wol .lb-q-step.on > b i { background: #e0a43a; } #ui.wol .lb-q-step.ok > b i { background: #4f8a3f; }
#ui.wol .lb-q-step.off { opacity: .62; }
#ui.wol .lb-q-step p { margin: 6px 0 0; line-height: 1.45; }
#ui.wol .lb-q-step small { display: block; margin-top: 4px; color: #8a7a50; }
#ui.wol .lb-q-guess { display: flex; flex-direction: column; gap: 6px; margin-top: 7px; }
#ui.wol .lb-q-guess button { text-align: right; padding: 8px 12px; border-radius: 10px; border: 2px solid #c9b98a; background: #fffaf0; color: #2a1a0e; font: inherit; font-weight: 700; cursor: pointer; min-height: 36px; }
#ui.wol .lb-q-guess button:hover { border-color: #e0a43a; background: #fff3d8; }
#ui.wol .lb-q-go { margin-top: 7px; }
#ui.wol .lb-q-go:disabled { filter: grayscale(1); opacity: .6; cursor: default; }
#ui.wol .lb-q-watch { padding: 8px 10px; border-radius: 10px; background: #263440; color: #eaf6fa; }
#ui.wol .lb-q-step.ans { background: #f1f8e8; box-shadow: 0 2px 0 #a8c48a; }
#ui.wol .lb-q-verdict { font-weight: 800; } #ui.wol .lb-q-verdict.yes { color: #2f6a2a; } #ui.wol .lb-q-verdict.no { color: #a8641a; } #ui.wol .lb-q-verdict.open { color: #5a3a88; }
#ui.wol .lb-q-lock { color: #8a7a50; }
#ui.wol .lb-atlas .lb-qbtn { background: #2c4f26; color: #fff6dc; box-shadow: 0 3px 0 #1a3016, 0 6px 16px rgba(0, 0, 0, .25); }
@media (max-width: 860px) { #ui.wol .lb-q-cols { grid-template-columns: minmax(200px, 36%) minmax(0, 1fr); gap: 10px; } #ui.wol .lb-quest h2 { font-size: 1.4em; } #ui.wol .lb-q-list button { grid-template-columns: 1fr; } #ui.wol .lb-q-list button img { display: none; } #ui.wol .lb-q-head img { width: 46px; height: 46px; } #ui.wol .lb-q-head h3 { font-size: 1.1em; } }
@media (max-height: 520px) { #ui.wol .lb-quest { padding: 10px 14px; gap: 6px; } #ui.wol .lb-quest header p { font-size: .85em; } }
`;
  document.head.appendChild(st);
}

const sampleName = (id, kids) => (kids && SAMPLES_K[id] ? SAMPLES_K[id].name : (SAMPLES.find((s) => s.id === id) || {}).name || '');
const problemTitle = (id, kids) => (kids && PROBLEMS_K[id] ? PROBLEMS_K[id].title : (PROBLEMS.find((p) => p.id === id) || {}).title || '');
// beginners: a smaller set of the easiest questions, fully vocalised (src/lab/kids-text.js); same ids, same progress
const KIDS_QS = QUESTIONS.filter((q) => QUEST_K[q.id]).map((q) => ({ ...q, ...QUEST_K[q.id] }));
export const questionsFor = (kids) => (kids ? KIDS_QS : QUESTIONS);

// is the investigation of a question done?
export function investigated(q, P = labProgress()) {
  if (q.how.scope) return !!P.seen[q.how.scope];
  if (q.how.invent) return !!P.solved[q.how.invent];
  return !!(P.qs[q.id] && P.qs[q.id].watched);
}
// answered = guessed and investigated
export function answered(q, P = labProgress()) { const s = P.qs[q.id]; return !!(s && s.g != null && investigated(q, P)); }
export const answeredCount = (P = labProgress(), kids = false) => questionsFor(kids).filter((q) => answered(q, P)).length;
// questions "מהאי שלכם" still open (חוטים: a relation of their creature was found on the island)
export function islandQuestions(kids = false, P = labProgress()) { try { return questionsFor(kids).filter((q) => questionMarked(q.sp) && !answered(q, P)).length; } catch (e) { return 0; } }

function grantFor(P) {
  const n = answeredCount(P);
  if (n >= 5) grantBadge('lab:q5');
  if (n >= 20) grantBadge('lab:q20');
  if (n >= QUESTIONS.length) grantBadge('lab:qall');
  if (QUESTIONS.some((q) => q.open && answered(q, P))) grantBadge('lab:open');
}

// the guesses in a mixed order (fixed per question, so it does not jump between visits): the right one is not always first
function guessOrder(q) {
  const h = (str) => { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  return q.guesses.map((_, i) => i).sort((a, b) => h(q.id + ':' + a) - h(q.id + ':' + b));
}

export function openQuestions(root, { say, thumbs = {}, audio, onClose, onBack, goScope, goInvent, start }) {
  injectCss();
  const kids = labKids(), K = QUEST_UI_K, QS = questionsFor(kids);
  const el = document.createElement('div'); el.className = 'lb-panel lb-quest' + (kids ? ' kids' : ''); root.appendChild(el);
  let zone = 'amazon', cur = null, last = '', alive = true;
  if (start) { cur = QS.find((q) => q.id === start) || null; if (cur) zone = cur.zone; }
  // a question "מהאי שלכם" (not answered yet): the list shows it, and the panel opens on its zone
  const isl = (q, P = labProgress()) => { try { return questionMarked(q.sp) && !answered(q, P); } catch (e) { return false; } };
  if (!start) { const m = QS.find((q) => isl(q)); if (m) zone = m.zone; }
  const status = (q, P) => { const s = P.qs[q.id] || {}; if (answered(q, P)) return q.open ? ['open', 'שאלה פתוחה'] : ['done', kids ? K.done : 'יש תשובה']; if (s.g != null) return ['wait', kids ? K.wait : 'מחכה לבדיקה']; return ['new', kids ? K.fresh : 'חדשה']; };

  function detail(q, P) {
    if (!q) return kids ? `<div class="lb-q-empty">${K.empty.map((t) => `<p>${t}</p>`).join('')}</div>` : `<div class="lb-q-empty"><p>בחרו שאלה מהרשימה.</p><p>קודם מנחשים, אחר כך חוקרים, ורק אז מגלים את התשובה.</p></div>`;
    const s = P.qs[q.id] || {}, done = investigated(q, P), got = s.g != null;
    const img = thumbs[q.sp] ? `<img src="${thumbs[q.sp]}" alt="">` : '';
    let h = `<div class="lb-q-head">${img}<h3>${esc(q.q)}</h3></div>`;
    // 1 · the guess
    h += `<section class="lb-q-step ${got ? 'ok' : 'on'}"><b><i>1</i>${kids ? K.step1 : 'מה הניחוש שלכם?'}</b>`;
    if (!got) h += `<div class="lb-q-guess">${guessOrder(q).map((i) => `<button data-g="${i}">${esc(q.guesses[i])}</button>`).join('')}</div>`;
    else h += `<p>${kids ? K.yours : 'הניחוש שלכם:'} <em>${esc(q.guesses[s.g])}</em></p>`;
    h += `</section>`;
    // 2 · the investigation
    const how = kids ? (q.how.scope ? fmt(K.howScope, { name: esc(sampleName(q.how.scope, kids)) }) : q.how.invent ? fmt(K.howInvent, { name: esc(problemTitle(q.how.invent, kids)) }) : K.howWatch)
      : q.how.scope ? `להסתכל במיקרוסקופ: ${esc(sampleName(q.how.scope))}` : q.how.invent ? `לנסות בשולחן הממציאים: ${esc(problemTitle(q.how.invent))}` : 'להסתכל עם רובו־דע';
    h += `<section class="lb-q-step ${done ? 'ok' : got ? 'on' : 'off'}"><b><i>2</i>${kids ? K.step2 : 'חוקרים'}</b>`;
    if (q.how.watch && s.watched) h += `<p class="lb-q-watch">${esc(q.how.watch)}</p>`;
    else if (done) h += `<p>${q.how.scope ? (kids ? K.didScope : 'מצאתם במיקרוסקופ את מה שצריך.') : (kids ? K.didInvent : 'פתרתם את הבעיה בשולחן הממציאים.')}</p>`;
    else h += `<button class="lb-btn lb-q-go" ${got ? '' : 'disabled'}>${how}</button>${got ? '' : `<small>${kids ? K.guessFirst : 'קודם בוחרים ניחוש.'}</small>`}`;
    h += `</section>`;
    // 3 · the answer
    h += `<section class="lb-q-step ${got && done ? 'ok ans' : 'off'}"><b><i>3</i>${q.open ? 'מה יודעים עד היום' : kids ? K.step3 : 'התשובה'}</b>`;
    if (got && done) {
      const verdict = q.open ? (s.g === q.idea ? 'גם חוקרים חושבים כך, אבל זה עוד לא בטוח.' : 'רעיון מעניין! גם אותו אפשר לבדוק.')
        : s.g === q.right ? (kids ? K.yes : 'הניחוש שלכם היה נכון!') : (kids ? K.no : 'הפתעה! הניחוש היה אחר. כך לומדים.');
      h += `<p class="lb-q-verdict ${q.open ? 'open' : s.g === q.right ? 'yes' : 'no'}">${verdict}</p><p>${esc(q.a)}</p>`;
    } else h += `<p class="lb-q-lock">${kids ? K.lock : 'התשובה תיפתח אחרי הניחוש והבדיקה.'}</p>`;
    return h + `</section>`;
  }
  function render(force) {
    if (!alive) return;
    const P = labProgress();
    const key = JSON.stringify([zone, cur && cur.id, P.qs, P.seen, P.solved]);
    if (!force && key === last) return; last = key;
    const list = QS.filter((q) => q.zone === zone);
    const n = answeredCount(P, kids);
    const keep = el.querySelector('.lb-q-list'), scroll = keep ? keep.scrollTop : 0;   // the list keeps its place when a question is picked
    el.innerHTML = `<header><h2>${kids ? K.title : 'שאלות חקר'}</h2><p>${kids ? fmt(K.count, { n, all: QS.length }) : `${n} מתוך ${QUESTIONS.length} שאלות קיבלו תשובה`}</p><button class="lb-btn lb-back">${kids ? K.back : 'חזרה לאטלס'}</button></header>
      <div class="lb-q-cols"><div class="lb-q-side"><nav class="lb-q-zones">${ZONES.map(([z, t]) => `<button data-z="${z}" class="${z === zone ? 'on' : ''}">${kids ? K.zones[z] : t}${QS.some((q) => q.zone === z && isl(q, P)) ? ' <i class="th-dot" aria-hidden="true"></i>' : ''}</button>`).join('')}</nav>
        <div class="lb-q-list">${list.map((q) => { const [k, t] = status(q, P); const mk = isl(q, P); return `<button data-q="${q.id}" class="${cur === q ? 'on' : ''} ${k}${mk ? ' th-isl' : ''}">${mk ? markHTML('island') : ''}${thumbs[q.sp] ? `<img src="${thumbs[q.sp]}" alt="">` : ''}<span>${esc(q.q)}</span><small>${t}</small></button>`; }).join('')}</div></div>
        <div class="lb-q-main">${detail(cur, P)}</div></div>`;
    const lst = el.querySelector('.lb-q-list'); if (lst && scroll) lst.scrollTop = scroll;
    el.querySelector('.lb-back').onclick = () => { close(); onBack && onBack(); };
    el.querySelectorAll('[data-z]').forEach((b) => b.onclick = () => { zone = b.dataset.z; cur = null; const l = el.querySelector('.lb-q-list'); if (l) l.scrollTop = 0; audio && audio.play('click'); render(true); });
    el.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { cur = QS.find((q) => q.id === b.dataset.q); audio && audio.play('click'); render(true); const S = labProgress().qs[cur.id]; if (!S || S.g == null) say(kids ? K.sayPick : 'מה אתם חושבים? בחרו ניחוש. מותר לטעות!', 'curious'); });
    el.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => {
      setQuestion(cur.id, { g: +b.dataset.g }); audio && audio.play('select');
      const P2 = labProgress();
      if (answered(cur, P2)) { setQuestion(cur.id, { done: Date.now() }); say(kids ? K.sayAlready : 'כבר בדקתם את זה קודם! עכשיו אפשר לראות את התשובה.', 'wow'); grantFor(labProgress()); }
      else if (kids) say(cur.how.scope ? K.sayScope : cur.how.invent ? K.sayInvent : K.sayWatch, 'happy');
      else say(cur.how.scope ? 'ניחוש רשום. עכשיו בואו נבדוק במיקרוסקופ.' : cur.how.invent ? 'ניחוש רשום. עכשיו ננסה לפתור בעיה בשולחן הממציאים.' : 'ניחוש רשום. עכשיו נסתכל יחד.', 'happy');
      render(true);
    });
    const go = el.querySelector('.lb-q-go');
    if (go) go.onclick = () => {
      const q = cur; if (!q) return;
      if (q.how.watch) { setQuestion(q.id, { watched: Date.now(), done: Date.now() }); audio && audio.play('discover'); say(q.open ? 'הסתכלנו. ומה למדנו? שאלה פתוחה היא שאלה טובה מאוד!' : kids ? K.goWatch : 'הסתכלנו. עכשיו התשובה פתוחה.', 'wow'); grantFor(labProgress()); render(true); return; }
      if (q.how.scope) { say(kids ? K.goScope : 'הולכים למיקרוסקופ. מצאו את שלושת הדברים שמסתתרים בדגימה.', 'happy'); goScope && goScope(q.how.scope, q.id); return; }
      if (q.how.invent) { say(kids ? K.goInvent : 'לשולחן הממציאים! פתרו את הבעיה, ואחר כך חזרו לאטלס.', 'happy'); goInvent && goInvent(q.how.invent, q.id); }
    };
  }
  // the answers of questions investigated elsewhere (the microscope, the hub's inventors game) open on their own
  const tick = setInterval(() => {
    if (!alive) return;
    const P = labProgress();
    for (const q of QUESTIONS) { const s = P.qs[q.id]; if (s && s.g != null && !s.done && investigated(q, P)) { setQuestion(q.id, { done: Date.now() }); grantFor(labProgress()); } }
    render(false);
  }, 1200);
  function close() { if (!alive) return; alive = false; clearInterval(tick); el.remove(); onClose && onClose(); }
  render(true);
  if (kids) say(answeredCount(undefined, true) ? K.helloBack : K.hello, 'curious');
  else say(answeredCount() ? 'ברוכים השבים לשאלות החקר. איזו שאלה נחקור היום?' : 'כל יצור מעורר שאלות. בחרו שאלה, נחשו, ואז נחקור יחד.', 'curious');
  try { window.__lqDebug = { pick: (id) => { cur = QS.find((q) => q.id === id) || null; if (cur) zone = cur.zone; render(true); }, guess: (i) => { const b = el.querySelector(`[data-g="${i}"]`); if (b) b.click(); }, go: () => { const b = el.querySelector('.lb-q-go'); if (b) b.click(); }, count: () => answeredCount(undefined, kids), list: () => QS.map((q) => q.id), zone: (z) => { zone = z; render(true); } }; } catch (e) { /* */ }
  return { close };
}
