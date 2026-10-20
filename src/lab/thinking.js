// מעבדת רובו־דע – "חושבים כמו חוקרים": four small experiments, each one habit of scientific thinking, learnt by doing.
//   fair     (the greenhouse)  הניסוי ההוגן      change one thing at a time; two changes at once and nobody can tell which did it
//   float    (the aquarium)    צף או שוקע?       guess before you test; a wrong guess is a discovery (fresh water and Dead Sea water)
//   (המשקל הרועד, the wobbly scale, was removed in 1.3.1 at Avi's request; an old 'measure' record in a save is ignored)
//   observe  (the cabinet)     ראינו או חשבנו?   what we saw and what we think happened; then a check that decides
//   cause    (the room)        ביחד או בגלל?     two things that rise together; an experiment shows what causes what
// Each activity is a panel over the rendered room, with רובו־דע's voice on a strip at its foot (his face changes).
// Facts are in docs/sources.md (the lab, "חושבים כמו חוקרים"). Progress: labProgress().think (src/lab/progress.js).
// Badges: lab:fair, lab:float, lab:observe, lab:cause, and lab:thinker for all four (src/data/badges.js).
import { esc, icon } from '../ui/ui.js';
import { thinkUpdate, thinkOf } from './progress.js';
import { grant as grantBadge } from '../core/badges-store.js';
import { labKids, fmt, readMs } from './level.js';
import { THINK_K } from './kids-text.js';   // the beginners' words: fully vocalised, short bubbles
import { OBS_CASES, OBS_T } from './observe-cases.js';   // ראינו או חשבנו? (1.3.1: 19 finds)
import { picHTML, hasPic, PICS_CSS } from './lab-pics.js';

export const THINK = [
  { id: 'fair', name: 'הניסוי ההוגן', habit: 'משנים רק דבר אחד בכל פעם', st: 'greenhouse', where: 'בחממה', ic: 'sprout' },
  { id: 'float', name: 'צף או שוקע?', habit: 'מנחשים לפני שבודקים', st: 'aquarium', where: 'באקווריום', ic: 'drop' },
  { id: 'observe', name: 'ראינו או חשבנו?', habit: 'מפרידים בין מה שראינו למה שחשבנו', st: 'cabinet', where: 'בארון האוסף', ic: 'binoc' },
  { id: 'cause', name: 'ביחד או בגלל?', habit: 'ביחד זה עוד לא בגלל', st: 'home', where: 'בחדר', ic: 'web' },
];
export const thinkById = (id) => THINK.find((a) => a.id === id) || null;
// an activity's name, habit and place in the words of the child's level
const named = (a, kids) => (kids && a ? { ...a, ...THINK_K.items[a.id] } : a);
export const thinkDone = (id) => !!thinkOf(id).done;

// רובו־דע's face on the voice strip
const FACE = {
  happy: '<path d="M8 13q2-3 4 0M14.5 13q2-3 4 0" stroke="#7ff0ff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M10.5 17q2.5 1.6 5 0" stroke="#7ff0ff" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  wow: '<circle cx="10" cy="12.5" r="2.4" fill="#7ff0ff"/><circle cx="16.5" cy="12.5" r="2.4" fill="#7ff0ff"/><circle cx="13.2" cy="17.3" r="1.3" fill="none" stroke="#7ff0ff" stroke-width="1.3"/>',
  oops: '<path d="M7.8 12.5h4.4M14.3 12.5h4.4" stroke="#7ff0ff" stroke-width="2.4" stroke-linecap="round"/><path d="M10.5 17.2q1.4-1.2 2.7 0t2.7 0" stroke="#7ff0ff" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  curious: '<circle cx="10" cy="12" r="1.8" fill="#7ff0ff"/><circle cx="16.5" cy="11.5" r="2.4" fill="#7ff0ff"/><path d="M11.5 17h3.5" stroke="#7ff0ff" stroke-width="1.5" stroke-linecap="round"/>',
};
const face = (e) => `<svg class="lt-face" viewBox="0 0 26 26" aria-hidden="true"><rect x="2" y="4" width="22" height="18" rx="7" fill="#e9eef2"/><rect x="4.5" y="7" width="17" height="11.5" rx="5" fill="#1d2b36"/>${FACE[e] || FACE.happy}<circle cx="13" cy="3" r="1.6" fill="#3fa9c9"/></svg>`;
const arrow = (up) => `<svg class="lt-arr ${up ? 'up' : 'down'}" viewBox="0 0 20 20" aria-hidden="true"><path d="${up ? 'M10 3l6 7h-4v7H8v-7H4z' : 'M10 17l6-7h-4V3H8v7H4z'}"/></svg>`;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function finish(id) {
  const first = !thinkOf(id).done;
  thinkUpdate(id, (r) => { r.done = r.done || Date.now(); });
  try { grantBadge('lab:' + id); } catch (e) { /* */ }
  if (THINK.every((a) => thinkDone(a.id))) { try { grantBadge('lab:thinker'); } catch (e) { /* */ } }
  return first;
}

// ───────────────────────────────────────── the frame of every activity: a title, the habit, the work, and his voice
function shell(root, a0, { robot, audio, onClose, back }) {
  injectCss();
  const kids = labKids(), a = named(a0, kids), SK = THINK_K.shell;
  const el = document.createElement('div'); el.className = `lb-panel lt lt-p-${a.id}${kids ? ' kids' : ''}`; root.appendChild(el);
  el.innerHTML = `<header class="lt-head"><div class="lt-ttl"><small>${kids ? SK.tag : 'חושבים כמו חוקרים'} · ${esc(a.where)}</small><h2>${esc(a.name)}</h2></div>
      <p class="lt-habit">${icon('bulb')}<span>${esc(a.habit)}</span></p><button class="lb-btn lt-back">${esc(back || (kids ? SK.back : 'חזרה לחדר'))}</button></header>
    <div class="lt-body"></div><div class="lt-voice" aria-live="polite">${face('happy')}<p></p></div>`;
  const body = el.querySelector('.lt-body'), voice = el.querySelector('.lt-voice');
  let alive = true; const timers = [];
  const later = (fn, ms) => { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); };
  // a list (the beginners' texts) is a few short lines: each one appears after the one before it was read
  const talk = (text, expr = 'happy') => {
    const parts = (Array.isArray(text) ? text : [text]).map(String).filter(Boolean);
    let delay = 0;
    const lines = parts.map((t, i) => { const d = delay; delay += readMs(t); return `<span class="lt-part" style="animation-delay:${i ? d : 0}ms">${esc(t)}</span>`; });
    voice.innerHTML = `${face(expr)}<p class="${parts.length > 1 ? 'lt-parts' : ''}"><b>${kids ? SK.robo : 'רובו־דע:'}</b> ${lines.join(' ')}</p>`;
    voice.classList.remove('pop'); void voice.offsetWidth; voice.classList.add('pop');
    const len = parts.join(' ').length;
    robot && robot.say && robot.say(expr, Math.min(4, 0.8 + len * 0.045));
  };
  const sfx = (n) => { try { audio && audio.play(n); } catch (e) { /* */ } };
  const close = () => { if (!alive) return; alive = false; timers.forEach(clearTimeout); el.remove(); onClose && onClose(); };
  el.querySelector('.lt-back').onclick = close;
  return { el, body, talk, sfx, later, close, alive: () => alive, kids };
}

// ═════════════════════════════════════════ 1. הניסוי ההוגן (the greenhouse)
// Two pots of bean seeds. Light, water and soil can be set for each. Three weeks later the seedlings show what they got.
// Real behaviour (docs/sources.md): in the dark a seedling grows taller but pale, thin and weak (etiolation); too little
// water and it wilts; too much and the roots have no air; sand keeps little water and food. Two plants given the same
// never come out exactly the same (a little natural variation).
const VARS = [
  { id: 'light', name: 'אור', the: 'האור', opts: [['sun', 'שמש'], ['dark', 'ארון חשוך']] },
  { id: 'water', name: 'מים', the: 'המים', opts: [['little', 'מעט'], ['mid', 'במידה'], ['much', 'הרבה מאוד']] },
  { id: 'soil', name: 'אדמה', the: 'האדמה', opts: [['garden', 'אדמת גן'], ['sand', 'חול']] },
];
function growPot(p) {
  let h = 14, leaves = 6, green = 1, droop = 0, pale = 0, note = 'ירוק וחזק', nk = 'ok';
  if (p.soil === 'sand') { h *= 0.8; leaves = 4; green = 0.8; note = 'קטן, ירוק בהיר'; nk = 'sand'; }
  if (p.water === 'much') { h *= 0.65; leaves = Math.min(leaves, 4); green *= 0.62; note = 'העלים מצהיבים'; nk = 'much'; }
  if (p.water === 'little') { h *= 0.55; leaves = Math.min(leaves, 4); droop = 1; note = 'נבול וצמא'; nk = 'little'; }
  if (p.light === 'dark') { h *= 1.5; leaves = 2; pale = 1; note = 'גבוה, צהוב ודק'; nk = 'dark'; }
  h += (Math.random() - 0.5) * 1.2;
  return { h: Math.round(h * 10) / 10, leaves, green, droop, pale, note, nk };
}
// a pot: the painting of the seedling it grew (art/lab-items/fair-<result>.webp; before growing, the seed), what it gets
// as small signs on the picture, and a ruler with the height. No colour says "good" before the plants have grown.
// Until those paintings exist (art/lab-items/manifest.json lists them), the pot is drawn as before 1.3.1 (potSVG), not
// left as an empty tile with its name.
function potSVG(p, g) {
  const soil = p.soil === 'sand' ? '#e2c48a' : '#5a3b22';
  const bg = p.light === 'dark' ? '<rect x="8" y="6" width="144" height="196" rx="10" fill="#2a2420"/>' : '<circle cx="132" cy="28" r="14" fill="#ffd45a"/><circle cx="132" cy="28" r="22" fill="#ffd45a" opacity=".25"/>';
  const wet = p.water === 'much' ? '<path d="M48 160h64v6H48z" fill="#6fb6e8" opacity=".85"/>' : '';
  let plant = '';
  if (g) {
    const len = Math.min(150, g.h * 6.2), top = 160 - len;
    const col = g.pale ? '#d9d27a' : `hsl(${Math.round(70 + 45 * g.green)},${Math.round(30 + 35 * g.green)}%,${Math.round(46 - 8 * g.green)}%)`;
    const bend = g.droop ? 22 : 0;
    plant = `<path d="M80 160 Q${80 + bend * 0.4} ${top + len * 0.5} ${80 + bend} ${top + bend * 0.5}" stroke="${g.pale ? '#cfc77a' : '#4a8a3a'}" stroke-width="${g.pale ? 2.2 : 4}" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < g.leaves; i++) {
      const kk = 0.35 + 0.65 * (i + 1) / g.leaves, y = 160 - len * kk + (g.droop ? bend * kk * 0.5 : 0), x = 80 + bend * kk * kk;
      const s = (g.pale ? 0.5 : 1) * (0.7 + 0.3 * kk), side = i % 2 ? 1 : -1, tilt = side * (g.droop ? 70 : 35);
      plant += `<ellipse cx="${x + side * 12 * s}" cy="${y}" rx="${13 * s}" ry="${5.5 * s}" fill="${col}" transform="rotate(${tilt} ${x} ${y})"/>`;
    }
  } else plant = '<ellipse cx="80" cy="151" rx="8" ry="5" fill="#efe6c8" stroke="#8a6a3a" stroke-width="1.5"/>';
  return `<svg class="lp-ph" viewBox="0 0 160 210" role="img" aria-label="עציץ" style="--lph:40;width:100%;height:100%">${bg}${plant}
    <path d="M44 160h72l-8 44H52z" fill="#c8693a"/><path d="M40 156h80v10H40z" fill="#d97a48"/><path d="M46 158h68v4H46z" fill="${soil}"/>${wet}</svg>`;
}
function potHTML(p, g, k, label) {
  const ref = g ? 'fair-' + g.nk : 'fair-seed';
  if (!hasPic(ref)) return potHTML0(p, g, potSVG(p, g));
  return potHTML0(p, g, picHTML(ref, label));
}
function potHTML0(p, g, pic) {
  const drops = { little: 1, mid: 2, much: 3 }[p.water] || 2;
  const H = 25, h = g ? Math.max(0, Math.min(H, g.h)) : 0;
  return `<div class="lt-potpic ${p.light === 'dark' ? 'dark' : ''} ${g ? 'grown' : ''}">${pic}
    <span class="lt-cond"><i class="${p.light}">${icon(p.light === 'dark' ? 'moon' : 'sun')}</i><i class="w">${[...Array(drops)].map(() => icon('drop')).join('')}</i><i class="s ${p.soil}"></i></span>
    ${g ? `<span class="lt-ruler" aria-hidden="true"><i style="height:${(h / H * 100).toFixed(0)}%"></i></span>` : ''}</div>`;
}
export function openFair(root, ctx) {
  const a = thinkById('fair'); const S = shell(root, a, ctx);
  const k = S.kids, K = THINK_K.fair;
  const VS = k ? VARS.map((v) => ({ ...v, name: K.vars[v.id].name, the: K.vars[v.id].the, opts: v.opts.map(([o]) => [o, K.vars[v.id].opts[o]]) })) : VARS;
  const pots = [{ light: 'sun', water: 'mid', soil: 'garden' }, { light: 'sun', water: 'mid', soil: 'garden' }];
  let grown = null, busy = false, jokeI = 0;
  const diffs = () => VS.filter((v) => pots[0][v.id] !== pots[1][v.id]);
  function render() {
    const R = thinkOf('fair'); const d = diffs();
    const potCard = (i) => `<section class="lt-potc"><b>${k ? K.pot : 'עציץ'} ${i ? 'ב' : 'א'}</b>${potHTML(pots[i], grown && grown[i], k, (k ? K.pot : 'עציץ') + ' ' + (i ? 'ב' : 'א'))}<small class="lt-note ${grown ? (grown[i].nk === 'ok' ? 'good' : 'weak') : ''}">${grown ? `${grown[i].h.toLocaleString('he-IL')} ס"מ · ${esc(k ? K.notes[grown[i].nk] : grown[i].note)}` : k ? K.seed : 'זרע באדמה'}</small>
      ${VS.map((v) => `<div class="lt-seg" role="group" aria-label="${v.name}"><span>${v.name}</span>${v.opts.map(([k, t]) => `<button data-pot="${i}" data-v="${v.id}" data-o="${k}" class="${pots[i][v.id] === k ? 'on' : ''}" ${busy ? 'disabled' : ''}>${t}</button>`).join('')}</div>`).join('')}</section>`;
    // the tag only says what differs; its colour (fair or not) shows after growing
    const tc = grown ? (d.length === 1 ? 'ok' : d.length ? 'many' : 'same') : 'same';
    const tag = k ? (d.length === 0 ? `<span class="lt-tag ${tc}">${K.same}</span>` : d.length === 1 ? `<span class="lt-tag ${tc}">${fmt(K.one, { the: d[0].the })}</span>` : `<span class="lt-tag ${tc}">${fmt(K.many, { list: d.map((v) => v.the).join(K.and) })}</span>`)
      : d.length === 0 ? `<span class="lt-tag ${tc}">אין הבדל בין העציצים</span>` : d.length === 1 ? `<span class="lt-tag ${tc}">שונה רק ${d[0].the}</span>` : `<span class="lt-tag ${tc}">שונים ${d.map((v) => v.the).join(' וגם ')}</span>`;
    S.body.innerHTML = `<div class="lt-fair">${potCard(0)}
      <section class="lt-mid">${tag}<button class="lt-go" data-act="grow" ${busy ? 'disabled' : ''}>${icon('sprout')}${grown ? (k ? K.again : 'לגדל שוב') : (k ? K.grow : 'לגדל שלושה שבועות')}</button>
        <div class="lt-book"><small>${k ? K.book : 'המחברת: מה גילינו בניסוי הוגן'}</small>${VS.map((v) => `<span class="${R[v.id] ? 'on' : ''}">${R[v.id] ? icon('check') : ''}${v.name}${R[v.id] ? '' : '?'}</span>`).join('')}</div></section>
      ${potCard(1)}</div>`;
  }
  function grow() {
    if (busy) return; busy = true; grown = null; render(); S.sfx('click');
    S.talk(k ? K.growing : 'מגדלים... שלושה שבועות עוברים מהר כשאתם רובוט.', 'curious');
    S.later(() => {
      grown = [growPot(pots[0]), growPot(pots[1])]; busy = false; render(); S.sfx('discover');
      S.body.querySelectorAll('.lt-potpic').forEach((s) => s.classList.add('grow'));
      const d = diffs();
      if (d.length === 0) {
        const dh = Math.abs(grown[0].h - grown[1].h).toLocaleString('he-IL');
        if (k) { S.talk(fmt(K.sameRes, { dh }), 'curious'); return; }
        S.talk(`שני העציצים קיבלו בדיוק אותו דבר, ולכן גדלו כמעט אותו דבר. ההבדל הקטן, ${dh} ס"מ, הוא סתם: גם שני נבטים תאומים לא יוצאים זהים. עכשיו שנו דבר אחד, ונראה מה הוא עושה.`, 'curious');
        return;
      }
      if (d.length > 1) {
        thinkUpdate('fair', (r) => { r.mixed = (r.mixed || 0) + 1; });
        const j = ['אולי בכלל זה בגלל שסיפרתי לעציץ א בדיחה?', 'אולי עציץ ב קם הבוקר על צד שמאל?', 'אולי זה בגלל שהשקיתי אחד מהם עם חיוך?'][jokeI % 3];
        if (k) { S.talk(fmt(K.mixed, { list: d.map((v) => v.the).join(K.or), joke: K.jokes[jokeI++ % K.jokes.length] }), 'oops'); S.sfx('invalid'); return; }
        jokeI++;
        S.talk(`העציצים יצאו שונים! אבל מי עשה את זה: ${d.map((v) => v.the).join(' או ')}? ${j} שינינו ${d.length === 2 ? 'שני' : 'שלושה'} דברים ביחד, אז אי אפשר לדעת. ניסוי הוגן משנה רק דבר אחד.`, 'oops');
        S.sfx('invalid');
        return;
      }
      const v = d[0], vals = new Set([pots[0][v.id], pots[1][v.id]]);
      let line = '', expr = 'wow', kl = null;
      if (k) kl = v.id === 'light' ? K.light : v.id === 'soil' ? K.soil : vals.has('little') && vals.has('much') ? K.both : vals.has('much') ? K.much : K.little;
      if (v.id === 'light') line = 'בארון החשוך הנבט גבוה יותר! אבל הוא צהוב, דק וחלש. הוא נמתח למעלה כדי לחפש אור. גבוה זה לא תמיד בריא.';
      else if (v.id === 'soil') line = 'בחול הנבט קטן יותר, והעלים בהירים. החול לא שומר הרבה מים ומזון, ואדמת גן שומרת יותר.';
      else if (vals.has('little') && vals.has('much')) { line = 'שניהם חלשים: אחד צמא, והשני מוצף. אולי הכי טוב באמצע? נסו מים במידה מול אחד מהם.'; expr = 'curious'; }
      else if (vals.has('much')) { line = 'הרבה מאוד מים, והנבט נחלש! השורשים צריכים גם אוויר, ובאדמה מוצפת אין להם.'; thinkUpdate('fair', (r) => { r.toomuch = 1; }); }
      else line = 'עם מעט מים הנבט קטן ונבול. בלי מספיק מים קשה לגדול.';
      thinkUpdate('fair', (r) => { r[v.id] = 1; });
      const R = thinkOf('fair'); render(); S.body.querySelectorAll('.lt-potpic').forEach((s) => s.classList.add('grow'));
      if (VARS.every((x) => R[x.id]) && !R.done) {
        finish('fair'); S.sfx('mission');
        if (k) S.talk([fmt(K.fairOne, { the: v.the }), ...kl, K.full], 'wow');
        else S.talk(`ניסוי הוגן! שינינו רק את ${v.the}. ${line} ועכשיו המחברת מלאה: גיליתם מה עושים האור, המים והאדמה, כל אחד בניסוי הוגן משלו.`, 'wow');
      } else if (k) S.talk([fmt(K.fairOne, { the: v.the }), ...kl], expr);
      else S.talk(`ניסוי הוגן! שינינו רק את ${v.the}, ולכן ברור מה עשה את ההבדל. ${line}`, expr);
    }, 1400);
  }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.act === 'grow') { grow(); return; }
    if (b.dataset.pot != null) { pots[+b.dataset.pot][b.dataset.v] = b.dataset.o; grown = null; S.sfx('click'); render(); }
  });
  render();
  if (k) S.talk(thinkOf('fair').done ? K.introDone : K.intro, 'happy');
  else if (thinkOf('fair').done) S.talk('המחברת כבר מלאה! אבל חוקרים לא מפסיקים לבדוק. נסו שילובים אחרים, ונראה אם תצליחו להפתיע אותי.', 'happy');
  else S.talk('שני עציצים, ובכל אחד זרע של שעועית. מה עוזר לנבט לגדול? שנו משהו באחד העציצים, ואז לחצו "לגדל שלושה שבועות".', 'happy');
  return { close: S.close, debug: { pots, grow, diffs } };
}

// ═════════════════════════════════════════ 2. צף או שוקע? (the aquarium)
// A glass tank: fresh water, or water from the Dead Sea (very salty: about 1.24 kg a litre). Guess first, then drop.
const ITEMS_ALL = [
  { id: 'apple', name: 'תפוח', the: 'התפוח', to: 'לתפוח', g: 'm', f: [1, 1], why: 'בערך רבע מהתפוח הוא אוויר, ולכן הוא צף.' },
  { id: 'coin', name: 'מטבע', the: 'המטבע', to: 'למטבע', g: 'm', f: [0, 0], why: 'המטבע קטן, אבל הוא כבד מאוד בשביל הגודל שלו.', joke: 'המטבע שלי! טוב, לפחות עכשיו אני יודע איפה הוא.' },
  { id: 'egg', name: 'ביצה', the: 'הביצה', to: 'לביצה', g: 'f', f: [0, 1], why: ['במים מתוקים הביצה שוקעת.', 'מי ים המלח מלאים במלח. הם כבדים יותר, ודוחפים חזק יותר למעלה. לכן הביצה צפה.'] },
  { id: 'pumice', name: 'אבן ספוג', the: 'אבן הספוג', to: 'לאבן הספוג', g: 'f', f: [1, 1], why: 'יש באבן הזאת המון בועות אוויר קטנות. אבן שצפה!' },
  { id: 'orange', name: 'תפוז', the: 'התפוז', to: 'לתפוז', g: 'm', f: [1, 1], why: 'בקליפה של התפוז יש המון כיסי אוויר קטנים, והם מחזיקים אותו למעלה כמו מצוף.' },
  { id: 'peeled', name: 'תפוז קלוף', the: 'התפוז הקלוף', to: 'לתפוז הקלוף', g: 'm', f: [0, 1], why: ['בלי הקליפה ובלי כיסי האוויר שבה, התפוז שוקע!', 'במי ים המלח גם תפוז בלי קליפה צף. המים המלוחים דוחפים חזק.'] },
  { id: 'ice', name: 'קוביית קרח', the: 'קוביית הקרח', to: 'לקוביית הקרח', g: 'f', f: [1, 1], why: 'קרח קל יותר ממים, ולכן הוא צף.' },
  { id: 'pebble', name: 'חלוק אבן', the: 'חלוק האבן', to: 'לחלוק האבן', g: 'm', f: [0, 0], why: 'חלוק האבן כבד מדי, אפילו בשביל מי ים המלח.' },
];
const WATERS_ALL = [{ id: 0, name: 'מים מתוקים', in: 'במים מתוקים' }, { id: 1, name: 'מי ים המלח', in: 'במי ים המלח' }];
const verb = (it, fl) => (it.kv ? it.kv[fl ? 1 : 0] : it.g === 'f' ? (fl ? 'תצוף' : 'תשקע') : (fl ? 'יצוף' : 'ישקע'));
const past = (it, fl) => (it.kn ? it.kn[fl ? 1 : 0] : it.g === 'f' ? (fl ? 'צפה' : 'שוקעת') : (fl ? 'צף' : 'שוקע'));   // present tense
function itemSVG(id) {
  const S = {
    apple: '<circle cx="20" cy="22" r="13" fill="#d93a32"/><circle cx="15" cy="18" r="3.5" fill="#f08a80" opacity=".7"/><path d="M20 10q1-5 4-6" stroke="#6a4a22" stroke-width="2" fill="none"/><path d="M22 8q6-4 9 0q-5 3-9 0z" fill="#5aa845"/>',
    coin: '<ellipse cx="20" cy="22" rx="13" ry="13" fill="#e8b84a" stroke="#a87a1a" stroke-width="2"/><circle cx="20" cy="22" r="8" fill="none" stroke="#a87a1a" stroke-width="1.5"/>',
    egg: '<ellipse cx="20" cy="22" rx="10" ry="13" fill="#f6efe2" stroke="#c9b898" stroke-width="1.5"/>',
    pumice: '<path d="M7 24q-2-9 8-12q10-4 16 4q5 8-3 13q-11 5-21-5z" fill="#c9c4b8" stroke="#8a8478" stroke-width="1.5"/><circle cx="14" cy="21" r="1.6" fill="#8a8478"/><circle cx="22" cy="17" r="1.3" fill="#8a8478"/><circle cx="25" cy="25" r="1.8" fill="#8a8478"/><circle cx="17" cy="28" r="1.2" fill="#8a8478"/>',
    orange: '<circle cx="20" cy="22" r="13" fill="#f08a1c"/><circle cx="15" cy="18" r="1" fill="#c86a0c"/><circle cx="24" cy="20" r="1" fill="#c86a0c"/><circle cx="19" cy="27" r="1" fill="#c86a0c"/><circle cx="26" cy="27" r="1" fill="#c86a0c"/><path d="M20 9l2-3" stroke="#5aa845" stroke-width="2"/>',
    peeled: '<circle cx="20" cy="22" r="11.5" fill="#f6b25a"/><path d="M20 10.5q-7 11.5 0 23M20 10.5q7 11.5 0 23M20 10.5q-13 11.5 0 23M20 10.5q13 11.5 0 23" stroke="#f9d9a6" stroke-width="1.4" fill="none"/>',
    ice: '<rect x="8" y="10" width="24" height="24" rx="4" fill="#cdeefc" stroke="#7ab8d8" stroke-width="1.5"/><path d="M12 15h8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>',
    pebble: '<ellipse cx="20" cy="23" rx="14" ry="10" fill="#8a8f96"/><ellipse cx="16" cy="20" rx="5" ry="2.5" fill="#aab0b6"/>',
  };
  return `<svg class="lt-item" viewBox="0 0 40 40" aria-hidden="true">${S[id] || ''}</svg>`;
}
export function openFloat(root, ctx) {
  const a = thinkById('float'); const S = shell(root, a, ctx);
  const k = S.kids, K = THINK_K.float;
  // beginners: the same things and the same physics, in vocalised words (kv / kn: the verbs for the item's gender)
  const ITEMS = k ? ITEMS_ALL.map((it) => ({ ...it, ...K.items[it.id], kv: K.verb[it.g], kn: K.now[it.g] })) : ITEMS_ALL;
  const WATERS = k ? WATERS_ALL.map((w, i) => ({ ...w, ...K.waters[i] })) : WATERS_ALL;
  let cur = null, water = 0, guess = null, phase = 'pick', lastFl = null;
  const key = (it, w) => it.id + ':' + w;
  function render() {
    const R = thinkOf('float'); const res = R.res || {};
    const tank = `<svg class="lt-tank w${water}" viewBox="0 0 300 190" role="img" aria-label="מכל מים">
      <rect x="20" y="20" width="260" height="160" rx="10" fill="rgba(255,255,255,.06)" stroke="#bfe6ff" stroke-width="3"/>
      <rect x="23" y="60" width="254" height="117" rx="7" class="lt-water"/>
      <path d="M23 60q30-6 63 0t64 0t64 0t63 0" stroke="#e8f7ff" stroke-width="2" fill="none" opacity=".8"/>
      ${water ? '<g fill="#f4f1e6" opacity=".9"><rect x="40" y="166" width="9" height="7" rx="1"/><rect x="58" y="169" width="6" height="5" rx="1"/><rect x="200" y="167" width="10" height="7" rx="1"/><rect x="236" y="169" width="7" height="5" rx="1"/><rect x="140" y="170" width="8" height="5" rx="1"/></g>' : ''}
      ${cur && phase !== 'pick' ? `<g class="lt-drop ${phase === 'drop' || phase === 'res' ? (lastFl ? 'fl' : 'sk') : ''}"><g transform="translate(125 -6) scale(1.25)">${itemSVG(cur.id).replace('<svg class="lt-item" viewBox="0 0 40 40" aria-hidden="true">', '').replace('</svg>', '')}</g></g>` : ''}
    </svg>`;
    const cell = (it, w) => { const v = res[key(it, w)]; return `<td class="${v == null ? '' : v ? 'f' : 's'}">${v == null ? '<i>?</i>' : arrow(!!v)}</td>`; };
    S.body.innerHTML = `<div class="lt-float">
      <section class="lt-shelf"><small>${k ? K.shelf : 'בחרו משהו לזרוק למים'}</small><div>${ITEMS.map((it) => `<button data-it="${it.id}" class="${cur === it ? 'on' : ''}" ${phase === 'drop' ? 'disabled' : ''}>${itemSVG(it.id)}<span>${it.name}</span></button>`).join('')}</div></section>
      <section class="lt-tankc"><div class="lt-seg lt-wseg" role="group" aria-label="איזה מים">${WATERS.map((w) => `<button data-w="${w.id}" class="${water === w.id ? 'on' : ''}" ${phase === 'drop' ? 'disabled' : ''}>${w.name}</button>`).join('')}</div>${tank}
        <div class="lt-guess">${cur ? (phase === 'pick' ? `<span>${k ? fmt(K.ask, { to: esc(cur.to) }) : `מה יקרה ${esc(cur.to)}?`}</span><button data-g="1">${arrow(true)}${verb(cur, 1)}</button><button data-g="0">${arrow(false)}${verb(cur, 0)}</button>`
          : phase === 'res' ? `<button data-act="again">${icon('undo')}${k ? K.again : 'עוד ניסוי'}</button>` : `<span>${k ? K.falling : 'נופל למים...'}</span>`) : `<span>${k ? K.first : 'קודם בוחרים, אחר כך מנחשים'}</span>`}</div></section>
      <section class="lt-table"><small>${k ? K.found : 'מה גילינו'}</small><table><thead><tr><th></th><th>${k ? K.sweet : 'מתוקים'}</th><th>${k ? K.dead : 'ים המלח'}</th></tr></thead><tbody>${ITEMS.map((it) => `<tr><th>${it.name}</th>${cell(it, 0)}${cell(it, 1)}</tr>`).join('')}</tbody></table>
        <div class="lt-surp">${icon('sparkle')}<b>${R.surprises || 0}</b> ${k ? K.surprises : 'הפתעות'}</div></section></div>`;
  }
  function drop(g) {
    guess = g; phase = 'drop'; lastFl = !!cur.f[water]; render(); S.sfx('click');
    S.later(() => {
      phase = 'res';
      const k = key(cur, water); const R0 = thinkOf('float'); const fresh = !(R0.res && k in R0.res);
      const right = guess === (lastFl ? 1 : 0);
      const R = thinkUpdate('float', (r) => { r.res = r.res || {}; r.res[k] = lastFl ? 1 : 0; if (fresh) { r.tests = (r.tests || 0) + 1; if (!right) r.surprises = (r.surprises || 0) + 1; } });
      render();
      const why = Array.isArray(cur.why) ? cur.why[water] : cur.why;
      if (S.kids) {
        if (right) { S.sfx('quizRight'); S.talk([...fmt(K.right, { the: cur.the, now: past(cur, lastFl), in: WATERS[water].in, why }), ...(cur.joke && !lastFl ? [cur.joke] : [])], 'happy'); }
        else { S.sfx('discover'); S.talk(fmt(K.wrong, { he: K.he[cur.g], verb: verb(cur, !lastFl), the: cur.the, now: past(cur, lastFl), why }), 'wow'); }
      } else if (right) { S.sfx('quizRight'); S.talk(`צדקתם! ${cur.the} ${past(cur, lastFl)} ${WATERS[water].in}. ${why}${cur.joke && !lastFl ? ' ' + cur.joke : ''}`, 'happy'); }
      else { S.sfx('discover'); S.talk(`הפתעה! ניחשתם ש${cur.g === 'f' ? 'היא' : 'הוא'} ${verb(cur, !lastFl)}, אבל ${cur.the} ${past(cur, lastFl)}. טעות כזאת היא גילוי! ${why}`, 'wow'); }
      const all = ITEMS.every((it) => [0, 1].every((w) => R.res && key(it, w) in R.res));
      if (((R.surprises || 0) >= 3 || all) && !R.done) {
        finish('float'); S.sfx('mission');
        if (S.kids) S.later(() => S.talk(all && (R.surprises || 0) < 3 ? K.doneAll : K.doneThree, 'wow'), 4200);
        else S.later(() => S.talk(all && (R.surprises || 0) < 3 ? 'בדקתם הכול! ולא סתם בדקתם: ניחשתם קודם, ואז בדקתם. ככה עושים חוקרים.' : 'כבר שלוש הפתעות! כל ניחוש שלא הצליח לימד אותנו משהו חדש. ככה עושים חוקרים: מנחשים, בודקים, ומשנים את הדעה.', 'wow'), 4200);
      }
    }, 1500);
  }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || phase === 'drop') return;
    if (b.dataset.it) { cur = ITEMS.find((x) => x.id === b.dataset.it); phase = 'pick'; S.sfx('click'); render(); S.talk(k ? fmt(K.pick, { to: cur.to, in: WATERS[water].in }) : `מה יקרה ${cur.to} ${WATERS[water].in}? נחשו קודם, ורק אחר כך נבדוק.`, 'curious'); return; }
    if (b.dataset.w != null) { water = +b.dataset.w; if (phase === 'res') phase = 'pick'; S.sfx('click'); render(); if (water) S.talk(k ? K.salty : 'מי ים המלח מלוחים מאוד, הרבה יותר ממי הים הרגילים. האם זה ישנה משהו?', 'curious'); return; }
    if (b.dataset.g != null && cur) { drop(+b.dataset.g); return; }
    if (b.dataset.act === 'again') { phase = 'pick'; render(); S.talk(k ? K.next : 'מה עכשיו? אפשר לבחור משהו אחר, או להחליף את המים.', 'happy'); }
  });
  render();
  S.talk(k ? K.intro : 'מכל מים, ומדף של דברים. לפני שזורקים, מנחשים: יצוף או ישקע? ניחוש שלא הצליח הוא לא כישלון, הוא הפתעה.', 'happy');
  return { close: S.close, debug: { pickItem: (id, w) => { cur = ITEMS.find((x) => x.id === id); water = w || 0; phase = 'pick'; render(); }, drop } };
}

// ═════════════════════════════════════════ 4. ראינו או חשבנו? (the cabinet)
// Finds from all three zones (observe-cases.js, 19 of them; beginners see eight). Sort each sentence: did we see it, or do we
// think it? Then choose a way to check, and see what was true. Five solved fill the notebook (the badge); all of them, one more.
export function openObserve(root, ctx) {
  const a = thinkById('observe'); const S = shell(root, a, ctx);
  const k = S.kids, K = THINK_K.observe;
  const W = (v) => (v && typeof v === 'object' && 'f' in v ? (k ? v.k : v.f) : v);   // a pair in the child's words
  const ONE = (v) => [].concat(W(v)).join(' ');
  const LIST = OBS_CASES.filter((c) => !k || c.kids);
  let ci = 0, placed = {}, stage = 'sort', order = [], checkOrder = [];
  const solvedN = () => { const R = thinkOf('observe'); return LIST.filter((x) => R[x.id]).length; };
  function render() {
    const R = thinkOf('observe'); const sc = LIST[ci];
    const saw = k ? K.saw : 'ראינו', thought = k ? K.thought : 'חשבנו';
    const all = sc.cards.every((_, i) => placed[i]);
    S.body.innerHTML = `<div class="lt-obs2">
      <p class="lt-explain">${icon('binoc')}<span>${esc(ONE(OBS_T.explain))}</span></p>
      <nav class="lt-strip">${LIST.map((x, i) => `<button data-sc="${i}" class="${i === ci ? 'on' : ''} ${R[x.id] ? 'done' : ''}" title="${esc(ONE(x.title))}">${picHTML(x.pic, ONE(x.title))}${R[x.id] ? `<i class="ok">${icon('check')}</i>` : ''}</button>`).join('')}</nav>
      <div class="lt-obs-main">
        <section class="lt-pic2"><h3>${esc(ONE(sc.title))} <small>${esc(fmt(ONE(OBS_T.of), { n: ci + 1, all: LIST.length }))}</small></h3><p>${esc(ONE(sc.intro))}</p>
          <div class="lt-figs ${stage === 'reveal' && sc.after ? 'two' : ''}"><figure>${picHTML(sc.pic, ONE(sc.title))}</figure>
            ${stage === 'reveal' && sc.after ? `<figure class="after">${picHTML(sc.after, '', { thumbs: ctx.thumbs })}<figcaption>${esc(ONE(OBS_T.camera))}</figcaption></figure>` : ''}</div></section>
        <section class="lt-sort">${stage === 'sort' ? `<small>${k ? K.sort : 'כל משפט: ראינו אותו בעיניים, או שרק חשבנו?'}</small>
          ${order.map((i) => { const t = ONE(sc.cards[i][0]); const p = placed[i]; return `<div class="lt-card ${p ? 'ok ' + p : ''}" data-ci="${i}"><span>${esc(t)}</span>${p ? `<em>${p === 'see' ? icon('binoc') + saw : icon('bulb') + thought}</em>` : `<button data-k="see">${icon('binoc')}${saw}</button><button data-k="think">${icon('bulb')}${thought}</button>`}</div>`; }).join('')}
          ${all ? `<button class="lt-go" data-act="checks">${k ? K.how : 'איך נבדוק מה קרה באמת?'}</button>` : ''}`
        : stage === 'check' ? `<small>${k ? K.howShort : 'איך נבדוק?'}</small>${checkOrder.map((i) => `<button class="lt-check" data-chk="${i}">${esc(ONE(sc.checks[i][0]))}</button>`).join('')}`
        : `<div class="lt-reveal">${icon('search')}<div>${[].concat(W(sc.reveal)).map((t) => `<p>${esc(t)}</p>`).join('')}</div></div>${LIST.length > 1 ? `<button class="lt-go" data-act="nextsc">${k ? K.next : 'לממצא הבא'}</button>` : ''}`}</section></div></div>`;
    const on = S.body.querySelector('.lt-strip .on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* */ }
  }
  function open(i) {
    ci = (i + LIST.length) % LIST.length; placed = {}; stage = 'sort';
    order = [0, 1, 2, 3].sort(() => Math.random() - 0.5); checkOrder = [0, 1, 2].sort(() => Math.random() - 0.5);
    render(); const sc = LIST[ci];
    S.talk(k ? fmt(K.open, { intro: ONE(sc.intro) }) : ONE(sc.intro) + ' מה ראינו בעיניים, ומה אנחנו רק חושבים?', 'curious');
  }
  function nextOpen() { const R = thinkOf('observe'); for (let d = 1; d <= LIST.length; d++) { const j = (ci + d) % LIST.length; if (!R[LIST[j].id]) return j; } return (ci + 1) % LIST.length; }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const sc = LIST[ci];
    if (b.dataset.sc != null) { S.sfx('click'); open(+b.dataset.sc); return; }
    if (b.dataset.act === 'nextsc') { S.sfx('click'); open(nextOpen()); return; }
    if (b.dataset.k) {
      const i = +b.closest('[data-ci]').dataset.ci; const want = sc.cards[i][1];
      if (b.dataset.k === want) {
        placed[i] = want; S.sfx('place'); render();
        if (sc.cards.every((_, j) => placed[j])) S.talk(k ? K.allPlaced : 'יופי! שני דברים ראינו, ושני דברים חשבנו. המחשבות יכולות להיות נכונות, ויכולות להיות לא. איך נדע?', 'happy');
        else if (k) S.talk(want === 'see' ? K.seeOk : K.thinkOk, 'happy');
        else S.talk(want === 'see' ? 'נכון, את זה רואים ממש. זו תצפית.' : 'נכון, את זה לא ראינו. זה מה שאנחנו חושבים שקרה. זו פרשנות.', 'happy');
      } else {
        S.sfx('invalid'); const c = b.closest('.lt-card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
        if (k) S.talk(want === 'think' ? K.notSeen : K.isSeen, 'oops');
        else S.talk(want === 'think' ? 'רגע, ראינו את זה בעיניים? לא ממש. זה מה שאנחנו חושבים שקרה.' : 'את זה דווקא רואים ממש בתמונה. זה מה שראינו.', 'oops');
      }
      return;
    }
    if (b.dataset.act === 'checks') { stage = 'check'; S.sfx('click'); render(); S.talk(k ? K.checks : 'יש כמה דרכים. איזו מהן באמת תגלה לנו מה קרה?', 'curious'); return; }
    if (b.dataset.chk != null) {
      const [, ok, line] = sc.checks[+b.dataset.chk];
      if (!ok) { S.sfx('click'); S.talk(W(line), 'oops'); return; }
      stage = 'reveal'; S.sfx('discover');
      const R = thinkUpdate('observe', (r) => { r[sc.id] = 1; }); render();
      const n = solvedN();
      if (n >= Math.min(5, LIST.length) && !R.done) { finish('observe'); S.sfx('mission'); S.talk([...[].concat(W(sc.reveal)), ...[].concat(W(OBS_T.enough))], 'wow'); }
      else if (n >= LIST.length) { try { grantBadge('lab:observe-all'); } catch (err) { /* */ } S.sfx('mission'); S.talk([...[].concat(W(sc.reveal)), ...[].concat(W(OBS_T.all))], 'wow'); }
      else S.talk(W(sc.reveal), 'wow');
    }
  });
  const first = LIST.findIndex((x) => !thinkOf('observe')[x.id]); open(first < 0 ? 0 : first);
  return { close: S.close, debug: { open, get stage() { return stage; }, get list() { return LIST.map((x) => x.id); }, solve: () => { const sc = LIST[ci]; sc.cards.forEach((c, i) => { placed[i] = c[1]; }); stage = 'check'; render(); S.body.querySelector(`[data-chk="0"]`)?.click(); } } };
}

// ═════════════════════════════════════════ 5. ביחד או בגלל? (the room)
// Two things counted week after week rise and fall together. Is one the cause of the other, is something else behind
// both, or is it chance? Doing something (an experiment) shows it.
const CASES_ALL = [
  { id: 'snails', title: 'חלזונות ופטריות', a: 'חלזונות', b: 'פטריות', ca: '#8a5a2a', cb: '#8a5ab8', weeks: 10,
    story: 'בחורש ספרנו כל שבוע חלזונות ופטריות. בשבועות שיש הרבה חלזונות, יש גם הרבה פטריות!',
    A: [2, 3, 9, 10, 4, 2, 8, 11, 3, 2], B: [1, 2, 7, 9, 3, 1, 6, 9, 2, 1],
    tests: [['להביא לחורש עוד חלזונות', 1, 0, 'הבאנו עוד חלזונות. והפטריות? לא השתנו בכלל.'], ['לקטוף את כל הפטריות', 0, -1, 'קטפנו את הפטריות. החלזונות לא שמו לב.'], ['להשקות את החורש בממטרה', 1, 1, 'השקינו את החורש, ופתאום יצאו גם חלזונות וגם פטריות!']],
    opts: { ab: 'החלזונות מגדלים פטריות', ba: 'הפטריות מביאות חלזונות', third: 'משהו אחר גורם לשניהם', chance: 'סתם במקרה' }, answer: 'third',
    right: 'נכון! האדמה הרטובה אחרי גשם גורמת לשניהם: החלזונות יוצאים, והפטריות צומחות. החלזונות לא מגדלים פטריות, הם פשוט אוהבים את אותו מזג אוויר.',
    wrong: { ab: 'אם החלזונות מגדלים פטריות, אז כשהבאנו עוד חלזונות היו צריכות לצמוח עוד פטריות. מה ראינו בניסוי?', ba: 'אם הפטריות מביאות חלזונות, אז כשקטפנו אותן החלזונות היו הולכים. מה ראינו?', chance: 'סתם במקרה? זה קורה שוב ושוב, כמעט כל שבוע. כנראה משהו מחבר ביניהם.' } },
  { id: 'bees', title: 'פרחים ודבורים', a: 'פרחים', b: 'דבורים', ca: '#d0508a', cb: '#c88a10', weeks: 10,
    story: 'באביב ספרנו פרחים ודבורים בחורש. ככל שיש יותר פרחים, יש גם יותר דבורים.',
    A: [2, 4, 7, 12, 18, 22, 20, 15, 9, 5], B: [1, 3, 5, 9, 14, 17, 16, 12, 7, 3],
    tests: [['לשתול עוד פרחים', 1, 1, 'שתלנו עוד פרחים, ותוך יום הגיעו עוד דבורים!'], ['להביא עוד כוורת', 0, 1, 'הבאנו כוורת. יש יותר דבורים, אבל השבוע לא צמחו עוד פרחים.']],
    opts: { ab: 'הפרחים מביאים דבורים', ba: 'הדבורים מגדלות פרחים', third: 'משהו אחר גורם לשניהם', chance: 'סתם במקרה' }, answer: 'ab',
    right: 'נכון! בפרחים יש צוף ואבקה, והדבורים באות אליהם. וגם להפך, אבל לאט: הדבורים מאביקות את הפרחים, ומהזרעים יצמחו פרחים בשנה הבאה. זה חוט של הרשת!',
    wrong: { ba: 'אם הדבורים מגדלות פרחים, אז כשהבאנו כוורת היו צריכים לצמוח עוד פרחים. מה ראינו בניסוי?', third: 'יכול להיות שגם האביב עוזר לשניהם. אבל מה קרה כששתלנו עוד פרחים, באותו שבוע?', chance: 'סתם במקרה? הם עולים ויורדים יחד כל העונה. ומה הראה הניסוי?' } },
  { id: 'antenna', title: 'האנטנה של רובו־דע', a: 'צחצוח אנטנה', b: 'גשם', ca: '#2c9a92', cb: '#3a6ab8', weeks: 4,
    story: 'רובו־דע שם לב: בשבועות שהוא מצחצח את האנטנה, יורד גשם! הוא בדק את זה ארבעה שבועות.',
    A: [3, 0, 2, 3], B: [4, 0, 3, 5],
    tests: [['לצחצח את האנטנה כל יום, שבוע שלם', 1, 0, 'צחצחתי כל יום. האנטנה מבריקה, וירד גשם רק כמו בשבוע רגיל.'], ['לא לצחצח בכלל, ולחכות', -1, 0, 'לא צחצחתי בכלל. ובכל זאת ירד גשם, בדיוק כמו בשבוע רגיל.']],
    opts: { ab: 'הצחצוח מביא גשם', ba: 'הגשם גורם לצחצח', third: 'משהו אחר גורם לשניהם', chance: 'סתם במקרה' }, answer: 'chance',
    right: 'אוי. אז זה היה סתם במקרה. ארבעה שבועות זה מעט מדי, ובחורף יורד גשם בכל מקרה. ואני כבר הזמנתי משחת צחצוח מיוחדת לאנטנות...',
    wrong: { ab: 'גם אני קיוויתי! אבל כשצחצחתי כל יום, לא ירד גשם. מה זה אומר?', ba: 'הגשם גורם לי לצחצח? לא, אני מצחצח מתי שבא לי. תסתכלו על הניסויים.', third: 'מה יכול לגרום גם לצחצוח וגם לגשם? אני לא מצחצח לפי מזג האוויר. אולי זה משהו פשוט יותר?' } },
];
function chartSVG(c, week1) {
  const n = c.weeks, max = Math.max(...c.A, ...c.B) * 1.15;
  const X = (i) => 270 - i * (240 / (n - 1));   // RTL: the first week on the right
  const Y = (v) => 118 - v / max * 100;
  const line = (arr, col) => `<path d="${arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('')}" stroke="${col}" stroke-width="3.2" fill="none" stroke-linejoin="round"/>${arr.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.6" fill="${col}"/>`).join('')}`;
  return `<svg class="lt-chart" viewBox="0 0 300 140" role="img" aria-label="גרף: ${esc(c.a)} ו${esc(c.b)}"><path d="M20 118H286" stroke="#9a8a60" stroke-width="1.5"/>
    ${Array.from({ length: n }, (_, i) => `<text x="${X(i).toFixed(1)}" y="133" text-anchor="middle" class="lt-wk">${i + 1}</text>`).join('')}
    ${line(c.A, c.ca)}${line(c.B, c.cb)}<text x="286" y="12" text-anchor="start" class="lt-wk">${week1 || 'שבוע 1 מימין'}</text></svg>`;
}
export function openCause(root, ctx) {
  const a = thinkById('cause'); const S = shell(root, a, ctx);
  const k = S.kids, K = THINK_K.cause;
  // beginners: the same three cases and numbers, in vocalised words
  const CASES = k ? CASES_ALL.map((c) => { const t = K.cases[c.id]; return { ...c, title: t.title, a: t.a, b: t.b, story: t.story, opts: t.opts, right: t.right, wrong: t.wrong,
    tests: c.tests.map(([, da, db], i) => [t.tests[i][0], da, db, t.tests[i][1]]) }; }) : CASES_ALL;
  let ci = 0, done = [], answered = null;
  const effect = (d) => (d > 0 ? `${arrow(true)}${k ? K.up : 'עלה'}` : d < 0 ? `${arrow(false)}${k ? K.down : 'ירד'}` : `<i class="eq">=</i>${k ? K.same : 'לא השתנה'}`);
  function render() {
    const R = thinkOf('cause'); const c = CASES[ci];
    S.body.innerHTML = `<div class="lt-cause">
      <nav class="lt-tabs">${CASES.map((x, i) => `<button data-cs="${i}" class="${i === ci ? 'on' : ''} ${R[x.id] ? 'done' : ''}">${R[x.id] ? icon('check') : ''}${x.title}</button>`).join('')}</nav>
      <section class="lt-graph">${[].concat(c.story).map((t) => `<p>${esc(t)}</p>`).join('')}${chartSVG(c, k ? K.week1 : null)}<div class="lt-keys"><span><i style="background:${c.ca}"></i>${esc(c.a)}</span><span><i style="background:${c.cb}"></i>${esc(c.b)}</span></div></section>
      <section class="lt-tests"><small>${k ? K.tests : 'ניסויים: לעשות משהו, ולראות מה קורה'}</small>
        ${c.tests.map(([t, da, db], i) => `<div class="lt-test ${done.includes(i) ? 'did' : ''}"><button data-t="${i}" ${done.includes(i) ? 'disabled' : ''}>${icon('flask')}${esc(t)}</button>${done.includes(i) ? `<span><b>${esc(c.a)}:</b> ${effect(da)}</span><span><b>${esc(c.b)}:</b> ${effect(db)}</span>` : ''}</div>`).join('')}
        <small>${k ? K.what : 'אז מה קורה כאן?'}</small><div class="lt-ans">${Object.entries(c.opts).map(([k, t]) => `<button data-an="${k}" class="${answered === k ? (k === c.answer ? 'right' : 'wrong') : ''}">${esc(t)}</button>`).join('')}</div></section></div>`;
  }
  function openCase(i) { ci = i; done = []; answered = null; render(); S.talk(k ? [...CASES[i].story, K.ask] : CASES[i].story + ' האם אחד מהם גורם לשני? אולי כדאי לעשות ניסוי.', 'curious'); }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = CASES[ci];
    if (b.dataset.cs != null) { S.sfx('click'); openCase(+b.dataset.cs); return; }
    if (b.dataset.t != null) { const i = +b.dataset.t; if (!done.includes(i)) done.push(i); answered = null; S.sfx('discover'); render(); S.talk(c.tests[i][3], c.id === 'antenna' ? 'oops' : 'wow'); return; }
    if (b.dataset.an) {
      const an = b.dataset.an;
      if (!done.length) { S.sfx('click'); S.talk(k ? K.first : 'רגע! קודם עושים ניסוי, ורק אחר כך מחליטים מה גורם למה.', 'curious'); return; }
      answered = an;
      if (an === c.answer) {
        const R = thinkUpdate('cause', (r) => { r[c.id] = 1; }); S.sfx('quizRight'); render();
        S.talk(c.right, c.id === 'antenna' ? 'oops' : 'wow');
        if (CASES.every((x) => R[x.id]) && !R.done && k) { finish('cause'); S.sfx('mission'); S.later(() => S.talk(K.done, 'wow'), 5200); }
        else if (CASES.every((x) => R[x.id]) && !R.done) { finish('cause'); S.sfx('mission'); S.later(() => S.talk('פתרתם את שלושתם! שני דברים שקורים ביחד הם רק רמז. כדי לדעת מה גורם למה, עושים ניסוי.', 'wow'), 5200); }
      } else {
        S.sfx('quizWrong'); render();
        S.talk(done.length ? c.wrong[an] : k ? K.before : 'לפני שעונים, אולי נעשה ניסוי? ככה בודקים מה גורם למה.', 'curious');
      }
    }
  });
  openCase(0);
  return { close: S.close, debug: { openCase, test: (i) => S.el.querySelector(`[data-t="${i}"]`)?.click(), answer: (k) => S.el.querySelector(`[data-an="${k}"]`)?.click() } };
}

// ═════════════════════════════════════════ the menu: all four, or the ones of one station
export function openThinkMenu(root, { only, onPick, robot, audio, onClose, title }) {
  injectCss();
  const kids = labKids(), M = THINK_K.menu;
  const list = THINK.filter((a) => !only || only.includes(a.id)).map((a) => named(a, kids));
  const el = document.createElement('div'); el.className = 'lb-panel lt lt-menu' + (only ? ' few' : '') + (kids ? ' kids' : ''); root.appendChild(el);
  const n = THINK.filter((a) => thinkDone(a.id)).length;   // (a 'measure' record of an old save is not in THINK: not counted)
  if (n === THINK.length) { try { grantBadge('lab:thinker'); } catch (e) { /* */ } }   // a save that had all but the removed scale
  el.innerHTML = `<header class="lt-head"><div class="lt-ttl"><small>${kids ? M.small : 'המעבדה של רובו־דע'}</small><h2>${esc(title || (kids ? M.title : 'חושבים כמו חוקרים'))}</h2></div>
      <p class="lt-habit">${kids ? (only ? M.few : fmt(M.all, { n })) : only ? 'שני ניסויים קטנים מחכים כאן.' : `ארבעה ניסויים קטנים. בכל אחד לומדים הרגל אחד של חוקרים. מותר לטעות, ככה מגלים. (${n} מתוך ${THINK.length})`}</p><button class="lb-btn lt-back">${kids ? THINK_K.shell.back : 'חזרה לחדר'}</button></header>
    <div class="lt-body"><div class="lt-grid">${list.map((a) => { const r = thinkOf(a.id); const st = r.done ? 'done' : Object.keys(r).length ? 'mid' : '';
      return `<button class="lt-mcard ${st}" data-a="${a.id}"><span class="lt-mic">${icon(a.ic)}</span><b>${esc(a.name)}</b><span>${esc(a.habit)}</span><small>${esc(a.where)}${st === 'done' ? ' · ' + icon('check') + (kids ? M.done : 'הושלם') : st === 'mid' ? ' · ' + (kids ? M.mid : 'בדרך') : ''}</small></button>`; }).join('')}</div></div>`;
  let alive = true;
  const close = () => { if (!alive) return; alive = false; el.remove(); onClose && onClose(); };
  el.querySelector('.lt-back').onclick = close;
  el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { try { audio && audio.play('select'); } catch (e) { /* */ } const id = b.dataset.a; close(); onPick && onPick(id); });
  return { close };
}
export const OPEN = { fair: openFair, float: openFloat, observe: openObserve, cause: openCause };

// ───────────────────────────────────────── styles (scoped like lab.css: #ui.wol), injected once
function injectCss() {
  if (document.getElementById('lt-css')) return;
  const st = document.createElement('style'); st.id = 'lt-css';
  st.textContent = PICS_CSS + `
#ui.wol .lb-panel.lt{inset:84px 12px 12px;display:flex;flex-direction:column;gap:8px;padding:12px 16px;background:linear-gradient(180deg,rgba(251,246,228,.97),rgba(238,228,198,.97));z-index:4}
#ui.wol .lt-head{display:flex;align-items:center;gap:14px;flex:none}
#ui.wol .lt-ttl small{display:block;color:#1d6680;font-weight:700;font-size:.8em}
#ui.wol .lt-ttl h2{font-size:1.5em;line-height:1.05;white-space:nowrap}
#ui.wol .lt-habit{flex:1;margin:0;display:flex;align-items:center;gap:6px;color:#5a4420;font-weight:700;font-size:.95em;line-height:1.3}
#ui.wol .lt-habit .ic{width:20px;height:20px;flex:none;color:#c8891a}
#ui.wol .lt-body{flex:1;min-height:0;overflow:auto}
#ui.wol .lt-voice{flex:none;display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:14px;background:#263440;color:#eaf6fa;min-height:44px;box-shadow:inset 0 0 0 1px rgba(127,240,255,.25)}
#ui.wol .lt-voice.pop{animation:ltPop .3s ease-out}
#ui.wol .lt-voice p{margin:0;line-height:1.4;font-size:.98em}
#ui.wol .lt-voice b{color:#7ff0ff}
#ui.wol .lt-face{width:40px;height:40px;flex:none}
@keyframes ltPop{from{opacity:.4;transform:translateY(4px)}to{opacity:1;transform:none}}
#ui.wol .lt .lt-go{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 18px;border:0;border-radius:999px;font:inherit;font-weight:800;color:#2a1a06;background:linear-gradient(180deg,#ffe08a,#e8a43a);box-shadow:0 3px 0 #9c6519;cursor:pointer}
#ui.wol .lt .lt-go:disabled{filter:grayscale(1) brightness(.85);cursor:default}
#ui.wol .lt .lt-go .ic{width:18px;height:18px}
#ui.wol .lt small{font-weight:700;color:#6a5a30}
#ui.wol .lt-seg{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
#ui.wol .lt-seg>span{min-width:3em;font-weight:700;font-size:.85em;color:#5a4420}
#ui.wol .lt-seg button{padding:4px 10px;border-radius:999px;border:2px solid #c9b98a;background:#fff;color:#2a1a0e;font:inherit;font-size:.85em;font-weight:700;cursor:pointer}
#ui.wol .lt-seg button.on{background:#263440;border-color:#263440;color:#ffe9a8}
#ui.wol .lt-tabs{display:flex;gap:6px;flex-wrap:wrap}
#ui.wol .lt-tabs button{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:999px;border:2px solid #c9b98a;background:#fff8e6;font:inherit;font-weight:700;cursor:pointer;color:#2a1a0e}
#ui.wol .lt-tabs button.on{background:#263440;border-color:#263440;color:#fff}
#ui.wol .lt-tabs button.done:not(.on){background:#eaf6dc;border-color:#8ab86a}
#ui.wol .lt-tabs .ic{width:16px;height:16px}
@keyframes ltShake{0%,100%{transform:none}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
#ui.wol .lt .shake{animation:ltShake .35s 2}
/* fair */
#ui.wol .lt-fair{display:grid;grid-template-columns:1fr minmax(170px,230px) 1fr;gap:12px;height:100%;min-height:250px}
#ui.wol .lt-potc{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:16px;background:linear-gradient(180deg,#fffdf6,#f6eedb);box-shadow:0 3px 0 #d8c79a,0 6px 14px rgba(60,40,10,.12);min-height:0}
#ui.wol .lt-potc>b{font-family:var(--serif);font-size:1.1em}
#ui.wol .lt-potpic{position:relative;flex:none;width:min(100%,260px,max(96px,calc(100vh - 360px)));aspect-ratio:1;border-radius:14px;overflow:hidden;box-shadow:inset 0 0 0 2px rgba(138,100,32,.25)}
#ui.wol .lt-potpic>img,#ui.wol .lt-potpic>.lp-ph{width:100%;height:100%;border-radius:14px}
#ui.wol .lt-potpic.dark:not(.grown)::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 60%,rgba(20,16,12,.35),rgba(20,16,12,.8));pointer-events:none}
#ui.wol .lt-potpic.grow>img,#ui.wol .lt-potpic.grow>.lp-ph{animation:ltGrow .8s ease-out both}
@keyframes ltGrow{from{transform:scale(.9);opacity:.2;filter:blur(3px)}to{transform:none;opacity:1;filter:none}}
#ui.wol .lt-cond{position:absolute;top:6px;right:6px;display:flex;flex-direction:column;gap:3px;z-index:1}
#ui.wol .lt-cond i{display:flex;align-items:center;justify-content:center;gap:1px;min-width:24px;height:24px;padding:0 4px;border-radius:999px;background:rgba(255,255,255,.88);box-shadow:0 1px 3px rgba(0,0,0,.25)}
#ui.wol .lt-cond .ic{width:15px;height:15px}
#ui.wol .lt-cond i.sun{color:#d8901a}#ui.wol .lt-cond i.dark{color:#3a3a6a;background:#d8d4e8}
#ui.wol .lt-cond i.w{color:#2a7ab8}#ui.wol .lt-cond i.w .ic{width:11px;height:11px}
#ui.wol .lt-cond i.s{width:24px;background:radial-gradient(circle,#5a3b22 0 40%,transparent 42%),rgba(255,255,255,.88)}
#ui.wol .lt-cond i.s.sand{background:radial-gradient(circle,#e2c48a 0 40%,transparent 42%),rgba(255,255,255,.88)}
#ui.wol .lt-ruler{position:absolute;bottom:8px;left:8px;width:10px;height:70%;border-radius:5px;background:repeating-linear-gradient(0deg,rgba(255,255,255,.9) 0 9%,rgba(240,232,210,.9) 9% 10%);box-shadow:0 1px 3px rgba(0,0,0,.3);display:flex;align-items:flex-end;overflow:hidden}
#ui.wol .lt-ruler i{display:block;width:100%;background:linear-gradient(180deg,#e8a43a,#c8781a);transition:height .8s ease-out}
#ui.wol .lt-cm{font:700 15px sans-serif;fill:#2a1a0e}
#ui.wol .lt-note{padding:2px 10px;border-radius:999px;background:#ece4cc;color:#5a4420!important;text-align:center}
#ui.wol .lt-note.good{background:#d8f0cc;color:#2c5a2a!important}
#ui.wol .lt-note.weak{background:#ffe6c8;color:#8a4a12!important}
#ui.wol .lt-mid{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center}
#ui.wol .lt-tag{padding:6px 12px;border-radius:12px;font-weight:800;font-size:.92em}
#ui.wol .lt-tag.same{background:#ece4cc;color:#6a5a30}
#ui.wol .lt-tag.ok{background:#d8f0cc;color:#2c5a2a}
#ui.wol .lt-tag.many{background:#ffe0c8;color:#9a3a12}
#ui.wol .lt-book{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px;border-radius:12px;background:#fff;border:2px dashed #c9b98a}
#ui.wol .lt-book small{width:100%}
#ui.wol .lt-book span{display:inline-flex;align-items:center;gap:3px;padding:3px 10px;border-radius:999px;border:2px dashed #b9a77a;color:#8a7a50;font-weight:800}
#ui.wol .lt-book span.on{border:2px solid #4f8a3f;background:#eaf6dc;color:#2c5a2a}
#ui.wol .lt-book .ic{width:15px;height:15px}
/* float */
#ui.wol .lt-float{display:grid;grid-template-columns:minmax(150px,200px) 1fr minmax(170px,210px);gap:12px;height:100%}
#ui.wol .lt-shelf>div{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px}
#ui.wol .lt-shelf button{display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px;border-radius:12px;border:2px solid #c9b98a;background:#fff;font:inherit;font-size:.8em;font-weight:700;cursor:pointer;color:#2a1a0e}
#ui.wol .lt-shelf button.on{border-color:#1d6680;background:#e2f2fa}
#ui.wol .lt-item{width:34px;height:34px}
#ui.wol .lt-tankc{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
#ui.wol .lt-tank{width:100%;max-height:230px;flex:1;min-height:110px}
#ui.wol .lt-tank .lt-water{fill:#5aa8d8;opacity:.75}
#ui.wol .lt-tank.w1 .lt-water{fill:#4ab8b0;opacity:.8}
#ui.wol .lt-drop{transform:translateY(0)}
#ui.wol .lt-drop.fl{animation:ltFloat 1.4s cubic-bezier(.3,.7,.4,1) forwards}
#ui.wol .lt-drop.sk{animation:ltSink 1.4s cubic-bezier(.4,.1,.6,1) forwards}
@keyframes ltFloat{0%{transform:translateY(0)}35%{transform:translateY(72px)}60%{transform:translateY(46px)}80%{transform:translateY(54px)}100%{transform:translateY(50px)}}
@keyframes ltSink{0%{transform:translateY(0)}30%{transform:translateY(60px)}100%{transform:translateY(128px)}}
#ui.wol .lt-guess{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;min-height:40px;font-weight:700}
#ui.wol .lt-guess button{display:inline-flex;align-items:center;gap:4px;padding:7px 16px;border-radius:999px;border:0;background:#263440;color:#fff;font:inherit;font-weight:800;cursor:pointer}
#ui.wol .lt-arr{width:16px;height:16px;fill:currentColor}
#ui.wol .lt-arr.up{color:#3a9a5a}#ui.wol .lt-arr.down{color:#c0503a}
#ui.wol .lt-guess .lt-arr{color:#7ff0ff}
#ui.wol .lt-table table{width:100%;border-collapse:collapse;font-size:.82em;margin-top:2px}
#ui.wol .lt-table th,#ui.wol .lt-table td{padding:2px 4px;text-align:center;border-bottom:1px solid #e0d4b0}
#ui.wol .lt-table tbody th{text-align:right;font-weight:700}
#ui.wol .lt-table td i{color:#b9a77a;font-style:normal}
#ui.wol .lt-surp{display:flex;align-items:center;gap:5px;margin-top:6px;font-weight:800;color:#8a5a12}
#ui.wol .lt-surp .ic{width:18px;height:18px;color:#e0a43a}
/* observe */
#ui.wol .lt-obs{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,1fr);grid-template-rows:auto 1fr;gap:8px 14px;height:100%}
#ui.wol .lt-obs .lt-tabs{grid-column:1 / -1}
#ui.wol .lt-pic{display:flex;flex-direction:column;gap:4px;min-height:0}
#ui.wol .lt-pic p{margin:0;font-weight:700}
#ui.wol .lt-pic svg,#ui.wol .lt-cam{width:100%;max-height:210px;border-radius:12px;box-shadow:0 3px 0 #d8c79a}
#ui.wol .lt-obs2{display:flex;flex-direction:column;gap:6px;height:100%;min-height:0}
#ui.wol .lt-explain{display:flex;align-items:center;gap:6px;margin:0;padding:4px 10px;border-radius:10px;background:#e2f2fa;color:#1d4a6a;font-weight:700;font-size:.9em;line-height:1.3;flex:none}
#ui.wol .lt-explain .ic{width:18px;height:18px;flex:none}
#ui.wol .lt-strip{display:flex;gap:5px;overflow-x:auto;flex:none;padding-bottom:2px}
#ui.wol .lt-strip button{position:relative;flex:none;width:42px;height:42px;padding:0;border-radius:9px;border:2px solid #e8dcc0;background:#fff;overflow:hidden;cursor:pointer}
#ui.wol .lt-strip button img,#ui.wol .lt-strip button .lp-ph{width:100%;height:100%;border-radius:0}
#ui.wol .lt-strip button .lp-ph span{font-size:.45em;padding:1px}
#ui.wol .lt-strip button.on{border-color:#263440;box-shadow:0 0 0 2px #263440}
#ui.wol .lt-strip button.done:not(.on){border-color:#6aa84f}
#ui.wol .lt-strip .ok{position:absolute;top:1px;left:1px;display:grid;place-items:center;width:15px;height:15px;border-radius:50%;background:#4f8a3f;color:#fff}
#ui.wol .lt-strip .ok .ic{width:11px;height:11px}
#ui.wol .lt-obs-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,1fr);gap:12px}
#ui.wol .lt-pic2{display:flex;flex-direction:column;gap:3px;min-height:0}
#ui.wol .lt-pic2 h3{margin:0;font-family:var(--serif);font-size:1.15em}
#ui.wol .lt-pic2 h3 small{font-family:inherit;font-size:.65em;color:#8a7a50}
#ui.wol .lt-pic2>p{margin:0;font-weight:700;line-height:1.35}
#ui.wol .lt-figs{flex:1;min-height:0;display:flex;gap:8px;align-items:flex-start}
#ui.wol .lt-figs figure{position:relative;margin:0;aspect-ratio:1;max-height:100%;flex:1 1 0;max-width:min(100%,250px);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 3px 0 #d8c79a,0 4px 12px rgba(60,40,10,.18)}
#ui.wol .lt-figs.two figure{max-width:48%}
#ui.wol .lt-figs figure img,#ui.wol .lt-figs figure .lp-ph{width:100%;height:100%;border-radius:0}
#ui.wol .lt-figs figure.after{animation:ltPop .5s ease-out;box-shadow:0 0 0 3px #6aa84f,0 4px 12px rgba(60,40,10,.18)}
#ui.wol .lt-figs figcaption{position:absolute;bottom:0;inset-inline:0;padding:2px 6px;background:rgba(38,52,64,.82);color:#fff;font-weight:800;font-size:.78em;text-align:center}
#ui.wol .lt.kids .lt-explain{line-height:1.6}
#ui.wol .lt-cam{position:relative;overflow:hidden;aspect-ratio:300/170;background:#000}
#ui.wol .lt-cam img{width:100%;height:100%;object-fit:cover;filter:grayscale(.6) brightness(.85) sepia(.3) hue-rotate(60deg)}
#ui.wol .lt-cam span{position:absolute;top:6px;right:8px;color:#bfffbf;font-weight:700;font-size:.8em;font-variant-numeric:tabular-nums}
#ui.wol .lt-sort{display:flex;flex-direction:column;gap:6px;min-height:0}
#ui.wol .lt-card{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:12px;background:#fff;box-shadow:0 2px 0 #d8c79a}
#ui.wol .lt-card>span{flex:1;font-weight:700;line-height:1.3}
#ui.wol .lt-card button{display:inline-flex;align-items:center;gap:3px;padding:4px 10px;border-radius:999px;border:2px solid #c9b98a;background:#fff8e6;font:inherit;font-size:.85em;font-weight:800;cursor:pointer;color:#2a1a0e}
#ui.wol .lt-card .ic{width:15px;height:15px}
#ui.wol .lt-card em{display:inline-flex;align-items:center;gap:3px;font-style:normal;font-weight:800;font-size:.85em;padding:3px 10px;border-radius:999px}
#ui.wol .lt-card.see{background:#e2f2fa}#ui.wol .lt-card.see em{background:#1d6680;color:#fff}
#ui.wol .lt-card.think{background:#fff3d8}#ui.wol .lt-card.think em{background:#c8891a;color:#fff}
#ui.wol .lt-check{padding:8px 12px;border-radius:12px;border:2px solid #263440;background:#fff;font:inherit;font-weight:800;text-align:right;cursor:pointer;color:#263440}
#ui.wol .lt-check:hover{background:#e8f0f4}
#ui.wol .lt-reveal{display:flex;gap:8px;padding:10px;border-radius:12px;background:#eaf6dc;border:2px solid #8ab86a}
#ui.wol .lt-reveal .ic{width:22px;height:22px;flex:none;color:#2c5a2a}
#ui.wol .lt-reveal p{margin:0;line-height:1.45;font-weight:600}
#ui.wol .lt-reveal p+p{margin-top:4px}
#ui.wol .lt-voice .lt-part{animation:ltPart .4s ease-out both}
@keyframes ltPart{from{opacity:0}to{opacity:1}}
#ui.wol .lt.kids .lt-voice p,#ui.wol .lt.kids .lt-reveal p{line-height:1.7}
#ui.wol .lt.kids .lt-card span,#ui.wol .lt.kids .lt-check,#ui.wol .lt.kids .lt-graph p,#ui.wol .lt.kids .lt-pic p,#ui.wol .lt.kids .lt-habit{line-height:1.6}
#ui.wol .lt-sort .lt-go{align-self:flex-start}
/* cause */
#ui.wol .lt-cause{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(250px,1fr);grid-template-rows:auto 1fr;gap:8px 14px;height:100%}
#ui.wol .lt-cause .lt-tabs{grid-column:1 / -1}
#ui.wol .lt-graph{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:14px;background:#fff;background-image:linear-gradient(rgba(60,110,170,.08) 1px,transparent 1px);background-size:100% 18px;box-shadow:0 3px 0 #d8c79a;min-height:0}
#ui.wol .lt-graph p{margin:0;font-weight:700;line-height:1.35}
#ui.wol .lt-chart{width:100%;max-height:260px;flex:1;min-height:90px}
#ui.wol .lt-wk{font:700 9px sans-serif;fill:#8a7a50}
#ui.wol .lt-keys{display:flex;gap:14px;font-weight:800;font-size:.9em}
#ui.wol .lt-keys i{display:inline-block;width:14px;height:5px;border-radius:3px;margin-inline-end:5px;vertical-align:middle}
#ui.wol .lt-tests{display:flex;flex-direction:column;gap:5px;min-height:0}
#ui.wol .lt-test{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:5px 8px;border-radius:12px;background:#fff;box-shadow:0 2px 0 #d8c79a}
#ui.wol .lt-test button{display:inline-flex;align-items:center;gap:5px;border:0;background:none;font:inherit;font-weight:800;cursor:pointer;color:#1d4a6a;text-align:right;padding:2px}
#ui.wol .lt-test button .ic{width:17px;height:17px;flex:none}
#ui.wol .lt-test.did{background:#eef6fa}
#ui.wol .lt-test.did button{color:#4a5a66}
#ui.wol .lt-test>span{display:inline-flex;align-items:center;gap:3px;font-size:.88em}
#ui.wol .lt-test .eq{font-style:normal;font-weight:900;color:#8a7a50;width:16px;text-align:center}
#ui.wol .lt-ans{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#ui.wol .lt-ans button{padding:7px 10px;border-radius:12px;border:2px solid #5a4a8a;background:#fff;color:#3a2a6a;font:inherit;font-weight:800;cursor:pointer;line-height:1.25}
#ui.wol .lt-ans button.right{background:#4f8a3f;border-color:#4f8a3f;color:#fff}
#ui.wol .lt-ans button.wrong{background:#ffe0c8;border-color:#c86a3a;color:#7a2a0a}
/* menu */
#ui.wol .lt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
#ui.wol .lt-mcard{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px;border-radius:16px;border:2px solid #d8c79a;background:#fff;font:inherit;text-align:right;cursor:pointer;color:#2a1a0e;box-shadow:0 3px 0 #d8c79a;transition:transform .15s}
#ui.wol .lt-mcard:hover{transform:translateY(-3px);border-color:#e0a43a}
#ui.wol .lt-mcard b{font-family:var(--serif);font-size:1.2em}
#ui.wol .lt-mcard>span:not(.lt-mic){font-size:.92em;line-height:1.3;color:#5a4420}
#ui.wol .lt-mcard small{display:inline-flex;align-items:center;gap:3px;margin-top:auto}
#ui.wol .lt-mcard small .ic{width:14px;height:14px}
#ui.wol .lt-mcard.done{background:#f2f9ea;border-color:#8ab86a}
#ui.wol .lt-mic{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#263440;color:#ffd978}
#ui.wol .lt-mic .ic{width:22px;height:22px}
#ui.wol .lt-menu.few{inset:auto 12px 96px auto;width:min(520px,calc(100vw - 24px))}
@media (max-width:900px),(max-height:620px){
  #ui.wol .lb-panel.lt{inset:72px 8px 8px;padding:8px 10px;gap:6px}
  #ui.wol .lt-ttl h2{font-size:1.2em}
  #ui.wol .lt-habit{font-size:.85em}
  #ui.wol .lt-voice{padding:5px 10px;min-height:38px}
  #ui.wol .lt-voice p{font-size:.88em;line-height:1.3}
  #ui.wol .lt-face{width:32px;height:32px}
  #ui.wol .lt-fair{grid-template-columns:1fr minmax(140px,180px) 1fr;gap:8px}
  #ui.wol .lt-potc{padding:5px;gap:3px}
  #ui.wol .lt-cond i{min-width:20px;height:20px}
  #ui.wol .lt-cond .ic{width:12px;height:12px}
  #ui.wol .lt-explain{font-size:.8em;padding:3px 8px}
  #ui.wol .lt-strip button{width:34px;height:34px}
  #ui.wol .lt-pic2 h3{font-size:1em}
  #ui.wol .lt-obs-main{grid-template-columns:minmax(0,.9fr) minmax(250px,1.1fr);gap:8px}
  #ui.wol .lt-float{grid-template-columns:minmax(130px,160px) 1fr minmax(150px,180px);gap:8px}
  #ui.wol .lt-item{width:26px;height:26px}
  #ui.wol .lt-seg button{padding:3px 7px;font-size:.78em}
  #ui.wol .lt-seg>span{font-size:.78em;min-width:2.6em}
  #ui.wol .lt-menu.few{inset:auto 8px 84px auto}
  #ui.wol .lt-card{padding:4px 6px}
  #ui.wol .lt-ans button,#ui.wol .lt-check{padding:4px 8px;font-size:.85em}
  #ui.wol .lt-tank{max-height:150px}
  #ui.wol .lt-cause{grid-template-columns:minmax(0,1fr) minmax(300px,1.15fr);gap:6px 10px}
  #ui.wol .lt-test{padding:3px 6px;gap:2px 8px}
  #ui.wol .lt-test button,#ui.wol .lt-test>span{font-size:.88em}
  #ui.wol .lt-tests{gap:4px}
  #ui.wol .lt-graph p,#ui.wol .lt-pic p{font-size:.9em}
  #ui.wol .lt .lt-go{padding:6px 14px}
}
`;
  document.head.appendChild(st);
}
