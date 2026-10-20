// מעבדת רובו־דע – the aquarium's own world (19.10): two open experiments beside "צף או שוקע?" (thinking.js).
//   שונית בקופסה   build a little reef tank (eight places): corals, algae and animals; a week runs on simple rules taken
//                   from the reef data of the game (who lives where, who eats what) and ends in one of eight endings
//   יום ולילה       three dials (day or night, the water's heat, the sun): click things in the tank to find ten secrets
// Facts: docs/sources.md ("The lab's stations"). Progress: labProgress().st.minireef / .daynight. Badges lab:minireef, lab:night.
import { esc, icon } from '../ui/ui.js';
import { stationShell, addCss } from './station-kit.js';
import { COMMON_T, MENU_T, REEF_T, NIGHT_T } from './station-text.js';
import { stUpdate, stOf } from './progress.js';
import { grant as grantBadge } from '../core/badges-store.js';

// ───────────────────────────────────────── drawings shared by both
export function coralSVG(kind, x, y, s = 1, pale = 0, night = false) {
  const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const W = '#f4f1ea';
  // at night every polyp opens a ring of little tentacles (a ring of dots: no crossing lines)
  const polyps = (pts) => (night ? pts.map(([px, py]) => `<g class="aq-pol"><circle cx="${px}" cy="${py}" r="1.6" fill="#ffd8b0"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = k * Math.PI / 4 + 0.39; return `<circle cx="${(px + Math.cos(a) * 4.2).toFixed(1)}" cy="${(py + Math.sin(a) * 4.2).toFixed(1)}" r="1.1" fill="#ffe9c8"/>`; }).join('')}</g>`).join('') : '');
  if (kind === 'branching') {
    const c = mix('#c8705a', W, pale);
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0V-26M0 -14L-14 -30M0 -18L12 -36M-14 -30L-20 -44M-14 -30L-8 -46M12 -36L6 -50M12 -36L22 -48M0 -26L-2 -42" stroke="${c}" stroke-width="7" stroke-linecap="round" fill="none"/>
      ${polyps([[-20, -44], [-8, -46], [6, -50], [22, -48], [-2, -42]])}</g>`;
  }
  if (kind === 'brain') {
    const c = mix('#9aaa5a', W, pale), d = mix('#6a7a3a', '#d8d4c8', pale);
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-34 0Q-34 -36 0 -38Q34 -36 34 0Z" fill="${c}"/>
      <path d="M-26 -8q8-10 16-2t16-4t16 2M-22 -20q10-8 20-2t20-2M-12 -30q8-4 22 0" stroke="${d}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="14" cy="-8" rx="7" ry="5" fill="#2a2a22"/>${polyps([[-20, -16], [0, -28], [22, -20]])}</g>`;
  }
  if (kind === 'table') {
    const c = mix('#7aa8a0', W, pale);
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-4 0V-26h8V0z" fill="${mix('#5a7a74', '#d8d4c8', pale)}"/><path d="M-40 -28Q0 -40 40 -28Q0 -22 -40 -28Z" fill="${c}"/>${polyps([[-26, -31], [0, -35], [26, -31]])}</g>`;
  }
  if (kind === 'seaanemone') {
    let t = ''; for (let k = 0; k < 11; k++) { const a = -Math.PI * (0.12 + 0.76 * k / 10); const L = 22 + (k % 3) * 4; t += `<path d="M0 -6Q${(Math.cos(a) * L * 0.5).toFixed(1)} ${(-8 + Math.sin(a) * L * 0.6).toFixed(1)} ${(Math.cos(a) * L).toFixed(1)} ${(-6 + Math.sin(a) * L).toFixed(1)}" stroke="#b87ad8" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="${(Math.cos(a) * L).toFixed(1)}" cy="${(-6 + Math.sin(a) * L).toFixed(1)}" r="2.6" fill="#e8c4ff"/>`; }
    return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-3" rx="12" ry="6" fill="#8a4aa8"/>${t}</g>`;
  }
  if (kind === 'algae') {
    const lush = s > 1.2;
    let f = ''; for (let k = 0; k < (lush ? 16 : 9); k++) { const xx = -30 + k * (60 / (lush ? 15 : 8)); f += `<path d="M${xx.toFixed(1)} -10q${k % 2 ? 5 : -5} -10 ${k % 3 ? 2 : -2} ${-(lush ? 26 : 16)}" stroke="#4f9a3a" stroke-width="3" fill="none" stroke-linecap="round"/>`; }
    return `<g transform="translate(${x} ${y})"><ellipse cx="-10" cy="-6" rx="24" ry="12" fill="#8a8478"/><ellipse cx="16" cy="-4" rx="18" ry="10" fill="#9a948a"/>${f}</g>`;
  }
  return '';
}
let clipN = 0;
const medal = (href, x, y, r, cls = '', id = '') => {
  if (!href) return `<g class="ar-an ${cls}"><circle cx="${x}" cy="${y}" r="${r}" fill="#ffd978" stroke="#fff" stroke-width="2"/></g>`;
  const c = 'arc' + (++clipN);
  return `<g class="ar-an ${cls}" ${id ? `data-an="${id}"` : ''}><clipPath id="${c}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath><circle cx="${x}" cy="${y}" r="${r + 2}" fill="#fff"/>`
    + `<image href="${href}" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" clip-path="url(#${c})" preserveAspectRatio="xMidYMid slice"/></g>`;
};

// ═════════════════════════════════════════ 1. שונית בקופסה
const PLACES = ['branching', 'brain', 'table', 'seaanemone', 'algae'];
const ANIMALS = ['clownfish', 'goby', 'shrimp', 'cleaner', 'butterflyfish', 'parrotfish', 'surgeonfish', 'urchin', 'moray', 'lionfish', 'octopus'];
const FISH = new Set(['clownfish', 'goby', 'butterflyfish', 'parrotfish', 'surgeonfish', 'moray', 'lionfish']);   // clients of the cleaning station
const SLOTS = 8;
const ENDS = ['thriving', 'small', 'algae', 'hunters', 'homeless', 'hungry', 'nibbled', 'quiet'];
// a week in the box: the rules of src/data/reef.js (the clownfish lives in the anemone, the goby with the pistol shrimp,
// small fish hide in branching coral, the moray and the octopus in a hole of the brain coral, the lionfish rests under
// the table coral and eats small fish, the moray hunts the octopus, grazers keep the algae down, the butterflyfish eats
// polyps of branching and table corals, the cleaner needs clients)
export function simulateReef(sel) {
  const has = (id) => sel.has(id);
  const fate = {}, ev = [], safe = new Set(), exposed = [];
  const A = ANIMALS.filter(has);
  let branches = has('branching') ? 3 : 0, hole = has('brain') ? 1 : 0, algaeWin = false, nibbled = false;
  if (has('clownfish')) { if (has('seaanemone')) { safe.add('clownfish'); ev.push(['clownHome']); } else { fate.clownfish = 'homeless'; exposed.push('clownfish'); ev.push(['clownLost']); } }
  if (has('shrimp')) { if (has('goby')) { safe.add('shrimp'); safe.add('goby'); ev.push(['gobyPair']); } else ev.push(['shrimpAlone']); }
  for (const id of ['goby', 'cleaner', 'butterflyfish', 'shrimp']) {
    if (!has(id) || safe.has(id)) continue;
    if (branches > 0) { branches--; safe.add(id); ev.push(['hide', { who: id }]); } else { exposed.push(id); if (has('lionfish')) ev.push(['noHide', { who: id }]); }
  }
  if (has('moray')) { if (hole) { hole--; ev.push(['morayHole']); } else { fate.moray = 'homeless'; ev.push(['morayNoHole']); } }
  if (has('octopus')) {
    if (has('moray')) { fate.octopus = 'eaten'; ev.push(['morayOcto']); }
    else if (hole) { hole--; ev.push(['octoHole']); } else { fate.octopus = 'homeless'; ev.push(['octoNoHole']); }
  } else if (has('moray')) { fate.moray = fate.moray || 'hungry'; ev.push(['morayHungry']); }
  if (has('lionfish')) {
    if (has('table')) ev.push(['lionShade']);
    const prey = exposed.filter((id) => ['goby', 'shrimp', 'cleaner', 'clownfish'].includes(id));
    if (prey.length) for (const p of prey) { fate[p] = 'eaten'; ev.push(['eaten', { who: p }]); }
    else { fate.lionfish = 'hungry'; ev.push(['lionHungry']); }
  }
  const grazers = ['parrotfish', 'surgeonfish', 'urchin'].filter(has);
  const food = has('algae') ? 2 : 1;   // a thin film of algae grows on any glass; a patch of algae feeds two grazers
  grazers.forEach((g, i) => { if (i < food) ev.push(['grazeOk', { who: g }]); else { fate[g] = 'hungry'; ev.push(['grazeHungry', { who: g }]); } });
  if (has('algae') && !grazers.length && A.length) { algaeWin = true; ev.push(['algaeWin']); }
  if (has('butterflyfish') && fate.butterflyfish !== 'eaten') {
    const c = ['branching', 'table'].filter(has).length;
    if (c >= 2) ev.push(['butterOk']); else if (c === 1) { nibbled = true; ev.push(['butterOne']); } else { fate.butterflyfish = 'hungry'; ev.push(['butterNone']); }
  }
  if (has('cleaner') && fate.cleaner !== 'eaten') {
    const clients = A.filter((id) => FISH.has(id) && fate[id] !== 'eaten').length;
    if (clients >= 2) ev.push(['cleanBusy']); else { fate.cleaner = 'bored'; ev.push(['cleanBored']); }
  }
  if (!A.length) ev.push(['quiet']);
  const any = (f) => Object.values(fate).includes(f);
  const end = !A.length ? 'quiet' : algaeWin ? 'algae' : any('eaten') ? 'hunters' : any('homeless') ? 'homeless' : any('hungry') || any('bored') ? 'hungry' : nibbled ? 'nibbled' : A.length >= 4 ? 'thriving' : 'small';
  for (const id of A) fate[id] = fate[id] || 'ok';
  return { fate, ev, end, safe };
}

// where each one sits in the tank (viewBox 400 x 260; sand from y 232)
const SPOT = { algae: [44, 236], branching: [116, 236], brain: [190, 236], table: [268, 236], seaanemone: [345, 236] };
const FREE = { clownfish: [300, 70], goby: [160, 92], shrimp: [210, 120], cleaner: [250, 104], butterflyfish: [130, 64], parrotfish: [60, 110], surgeonfish: [96, 70],
  urchin: [30, 196], moray: [350, 120], lionfish: [230, 60], octopus: [330, 170] };
function homeSpot(id, R) {
  const f = R.fate[id];
  if (f === 'homeless') return id === 'moray' ? [372, 52] : id === 'octopus' ? [24, 40] : [380, 34];
  if (id === 'clownfish') return [345, 196];
  if ((id === 'goby' || id === 'shrimp') && R.safe.has('goby') && R.safe.has('shrimp')) return id === 'goby' ? [222, 222] : [242, 236];
  if (R.safe.has(id) && ['goby', 'cleaner', 'butterflyfish', 'shrimp'].includes(id)) return [[104, 196], [128, 188], [116, 214]][['goby', 'cleaner', 'butterflyfish', 'shrimp'].indexOf(id) % 3];
  if (id === 'moray') return [204, 228];
  if (id === 'octopus') return [176, 214];
  if (id === 'lionfish') return [268, 196];
  if (id === 'urchin') return [40, 206];
  return FREE[id];
}

export function openMiniReef(root, ctx) {
  addCss('aq-css', AQ_CSS);
  const S = stationShell(root, { cls: 'reef', ic: 'drop', title: REEF_T.title, small: MENU_T.aquarium.title, sub: REEF_T.sub, ...ctx });
  const { T, O } = S;
  const thumbs = ctx.thumbs || {};
  const sel = new Set(); let R = null, busy = false;
  const name = (id) => O(REEF_T.names[id]);
  function tankSVG() {
    const night = false;
    const algaeLush = sel.has('algae') && R && R.end === 'algae';
    let g = `<rect x="0" y="0" width="400" height="260" fill="url(#arWater)"/><path d="M0 232Q100 224 200 232T400 230V260H0z" fill="#e8d8b0"/>`;
    for (const p of PLACES) if (sel.has(p)) g += p === 'algae' ? coralSVG('algae', ...SPOT.algae, algaeLush ? 1.6 : 1) : coralSVG(p, ...SPOT[p], 1, R && R.end === 'nibbled' && p !== 'brain' ? 0.55 : 0, night);
    if (algaeLush) { let a = ''; for (let k = 0; k < 26; k++) { const x = 70 + k * 9.5, h = 18 + (k * 37 % 23); a += `<path d="M${x} 236q${k % 2 ? 6 : -6} ${-h / 2} ${k % 3 - 1} ${-h}" stroke="${k % 2 ? '#4f9a3a' : '#6ab84a'}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`; } g += `<g class="ar-algae">${a}<ellipse cx="190" cy="212" rx="120" ry="16" fill="#4f9a3a" opacity=".45"/></g>`; }
    if (sel.has('shrimp')) g += '<ellipse cx="236" cy="236" rx="12" ry="4" fill="#5a4a30"/>';
    for (const id of ANIMALS) if (sel.has(id)) {
      const [x, y] = R ? homeSpot(id, R) : FREE[id];
      const f = R ? R.fate[id] : null;
      g += f === 'eaten' ? `<circle class="ar-gone" cx="${x}" cy="${y}" r="15" fill="none" stroke="#8aa8b8" stroke-width="2" stroke-dasharray="4 4"/>`
        : medal(thumbs[id], x, y, 15, `${R ? 'res' : 'swim'} f-${f || 'ok'}`, id);
      if (f === 'hungry' || f === 'bored' || f === 'homeless') g += `<g class="ar-mark"><circle cx="${x + 13}" cy="${y - 13}" r="8" fill="${f === 'homeless' ? '#e0a43a' : '#c86a3a'}"/><text x="${x + 13}" y="${y - 9.5}" text-anchor="middle" class="ar-mk">${f === 'homeless' ? '?' : f === 'bored' ? 'z' : '…'}</text></g>`;
    }
    return `<svg class="ar-tank" viewBox="0 0 400 260" role="img" aria-label="${esc(O(REEF_T.title))}"><defs><linearGradient id="arWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ab8e0"/><stop offset="1" stop-color="#1d6a98"/></linearGradient></defs>${g}
      <rect x="1.5" y="1.5" width="397" height="257" rx="8" fill="none" stroke="#bfe6ff" stroke-width="3"/></svg>`;
  }
  function render() {
    const P = stOf('minireef'); const ends = P.ends || {};
    const chip = (id) => `<button class="ar-chip ${sel.has(id) ? 'on' : ''}" data-p="${id}" ${busy ? 'disabled' : ''} aria-pressed="${sel.has(id)}">${thumbs[id] ? `<img class="ls-medal" src="${thumbs[id]}" alt="">` : ''}<span>${esc(name(id))}</span></button>`;
    const diary = R ? R.ev.map(([k, v]) => { const who = v && v.who ? name(v.who) : ''; return `<li>${esc(O(REEF_T.ev[k], { who }))}</li>`; }).join('') : '';
    S.body.innerHTML = `<div class="ar-wrap">
      <section class="ar-pal"><small>${esc(O(REEF_T.slots, { n: sel.size, max: SLOTS }))}</small>
        <b>${esc(O(REEF_T.places))}</b><div class="ar-chips">${PLACES.map(chip).join('')}</div>
        <b>${esc(O(REEF_T.animals))}</b><div class="ar-chips">${ANIMALS.map(chip).join('')}</div></section>
      <section class="ar-mid">${tankSVG()}
        <div class="ar-acts"><button class="ls-go" data-act="run" ${busy ? 'disabled' : ''}>${icon('hourglass')}${esc(R ? O(REEF_T.change) : O(REEF_T.run))}</button>
        <button class="ls-soft" data-act="reset" ${busy ? 'disabled' : ''}>${icon('undo')}${esc(O(REEF_T.reset))}</button></div></section>
      <section class="ar-side">${R ? `<div class="ar-end e-${R.end}"><small>${esc(O(COMMON_T.thisEnd))}</small><h3>${esc(O(REEF_T.ends[R.end].name))}</h3></div><small>${esc(O(REEF_T.diary))}</small><ul class="ar-diary">${diary}</ul>` : ''}
        <small>${esc(O(COMMON_T.endings))}</small>
        <div class="ls-ends">${ENDS.map((e) => `<span class="${ends[e] ? 'on' : ''} ${R && R.end === e ? 'now' : ''}">${ends[e] ? esc(O(REEF_T.ends[e].name)) : '?'}</span>`).join('')}</div></section></div>`;
  }
  function run() {
    if (busy) return;
    if (R) { R = null; render(); S.talk(T(REEF_T.changeSay), 'curious'); return; }   // "משנים משהו": back to building
    if (!sel.size) { S.talk(T(REEF_T.empty), 'curious'); S.sfx('invalid'); return; }
    busy = true; render(); S.sfx('click'); S.talk(T(REEF_T.running), 'curious');
    S.el.querySelector('.ar-tank').classList.add('run');
    S.later(() => {
      busy = false; R = simulateReef(sel);
      const first = !(stOf('minireef').ends || {}).thriving && R.end === 'thriving';
      stUpdate('minireef', (r) => { r.ends = r.ends || {}; r.ends[R.end] = (r.ends[R.end] || 0) + 1; r.runs = (r.runs || 0) + 1; });
      render(); S.sfx(R.end === 'thriving' ? 'mission' : R.end === 'small' ? 'quizRight' : 'discover');
      if (R.end === 'thriving') { try { grantBadge('lab:minireef'); } catch (e) { /* */ } }
      const say = T(REEF_T.ends[R.end].say);
      S.talk(first ? [].concat(say, T(REEF_T.firstGood)) : say, R.end === 'thriving' || R.end === 'small' ? 'wow' : R.end === 'quiet' ? 'happy' : 'oops');
    }, 1700);
  }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.act === 'run') { run(); return; }
    if (b.dataset.act === 'reset') { sel.clear(); R = null; S.sfx('click'); render(); S.talk(T(REEF_T.intro), 'happy'); return; }
    const p = b.dataset.p; if (!p) return;
    if (sel.has(p)) { sel.delete(p); S.sfx('click'); }
    else if (sel.size >= SLOTS) { S.sfx('invalid'); S.talk(T(REEF_T.full), 'oops'); return; }
    else { sel.add(p); S.sfx('place'); if (REEF_T.add[p]) S.talk(T(REEF_T.add[p]), 'curious'); }
    R = null; render();
  });
  render(); S.talk(T(REEF_T.intro), 'happy');
  return { close: S.close, debug: { sel, run: () => run(), get result() { return R; }, put: (ids) => { sel.clear(); ids.forEach((i) => sel.add(i)); R = null; render(); } } };
}

// ═════════════════════════════════════════ 2. יום ולילה
const DISC = ['cocoon', 'moray', 'polyps', 'urchin', 'cleaner', 'tough', 'pale', 'sun', 'back', 'long'];
const NIGHT_D = new Set(['cocoon', 'moray', 'polyps', 'urchin', 'cleaner']);
function fishSVG(x, y, s, body, fin, flip, extra = '') {
  return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path d="M14 0L24 -8V8Z" fill="${fin}"/><ellipse cx="0" cy="0" rx="16" ry="9" fill="${body}"/>${extra}<circle cx="-9" cy="-2" r="2.2" fill="#fff"/><circle cx="-9.5" cy="-2" r="1.2" fill="#111"/></g>`;
}
export function openDayNight(root, ctx) {
  addCss('aq-css', AQ_CSS);
  const S = stationShell(root, { cls: 'night', ic: 'moon', title: NIGHT_T.title, small: MENU_T.aquarium.title, sub: NIGHT_T.sub, ...ctx });
  const { T, O } = S;
  let night = false, temp = 0, sun = 0, bleach = 0, hot = 0, weeks = 0, busy = false;
  const P = () => stOf('daynight'); const found = () => P().found || {};
  function discover(id) {
    const fresh = !found()[id];
    const R = stUpdate('daynight', (r) => { r.found = r.found || {}; r.found[id] = r.found[id] || Date.now(); });
    render();
    S.talk(T(NIGHT_T.d[id].say), ['pale', 'long'].includes(id) ? 'oops' : 'wow');
    if (fresh) {
      S.sfx('discover');
      const n = Object.keys(R.found).length;
      if (n >= 8) { try { grantBadge('lab:night'); } catch (e) { /* */ } }
      if (n === DISC.length) { S.sfx('mission'); S.later(() => S.talk(T(NIGHT_T.lines.allFound), 'wow'), 4800); }
    }
    return fresh;
  }
  function tank() {
    const pale = Math.min(1, bleach / 3);
    const dark = night ? '<rect width="400" height="260" fill="#0a1a3a" opacity=".55" pointer-events="none"/><circle cx="350" cy="34" r="14" fill="#f6f0c8" opacity=".9" pointer-events="none"/><circle cx="356" cy="30" r="12" fill="#0a1a3a" opacity=".55" pointer-events="none"/>' : '';
    const sunRays = !night && sun ? '<g opacity=".35" fill="#fff8c8" pointer-events="none"><path d="M60 0L90 0L150 232L110 232Z"/><path d="M200 0L230 0L280 232L240 232Z"/><path d="M320 0L345 0L380 232L350 232Z"/></g>' : '';
    // the animals: day or night
    const parrot = night
      ? `<g class="aq-hit" data-w="parrot"><ellipse cx="96" cy="176" rx="30" ry="20" fill="#dff4ff" opacity=".45" stroke="#fff" stroke-width="1.5"/>${fishSVG(96, 176, 1.1, '#3aa89a', '#2a7a8a', false)}</g>`
      : `<g class="aq-hit aq-swim" data-w="parrot">${fishSVG(150, 92, 1.2, '#3aa89a', '#2a7a8a', false, '<path d="M-16 -1q-4 3 0 5" stroke="#f2f2e8" stroke-width="2.5" fill="none"/>')}</g>`;
    const moray = night
      ? `<g class="aq-hit" data-w="moray"><path d="M196 216q30-24 70-8t60-30" stroke="transparent" stroke-width="18" fill="none"/><path d="M196 216q30-24 70-8t60-30" stroke="#6a7a3a" stroke-width="11" fill="none" stroke-linecap="round"/><circle cx="324" cy="176" r="2.4" fill="#fff"/></g>`
      : `<g class="aq-hit" data-w="moray"><circle cx="212" cy="220" r="16" fill="transparent"/><path d="M204 228q6-10 14-12" stroke="#6a7a3a" stroke-width="11" fill="none" stroke-linecap="round"/><circle cx="216" cy="214" r="2" fill="#fff"/></g>`;
    const urchin = night ? `<g class="aq-hit" data-w="urchin" transform="translate(58 200)">${spines()}</g>` : `<g class="aq-hit" data-w="urchin" transform="translate(30 224) scale(.6)">${spines()}</g>`;
    function spines() { let s = '<circle r="22" fill="transparent"/><circle r="9" fill="#2a1a2a"/>'; for (let k = 0; k < 14; k++) { const a = k * Math.PI / 7; s += `<path d="M${(Math.cos(a) * 8).toFixed(1)} ${(Math.sin(a) * 8).toFixed(1)}L${(Math.cos(a) * 18).toFixed(1)} ${(Math.sin(a) * 18).toFixed(1)}" stroke="#2a1a2a" stroke-width="2" stroke-linecap="round"/>`; } return s; }
    const cleaner = night ? `<g class="aq-hit" data-w="cleaner"><circle cx="134" cy="202" r="16" fill="transparent"/>${fishSVG(132, 204, 0.6, '#5aa0e0', '#1d4a8a', true, '<path d="M-14 0H14" stroke="#111" stroke-width="2.4"/>')}<text x="146" y="194" class="aq-z">z</text></g>`
      : `<g class="aq-hit aq-swim2" data-w="cleaner"><circle cx="240" cy="150" r="16" fill="transparent"/>${fishSVG(240, 150, 0.6, '#5aa0e0', '#1d4a8a', true, '<path d="M-14 0H14" stroke="#111" stroke-width="2.4"/>')}</g>`;
    const butter = night ? '' : `<g class="aq-swim">${fishSVG(300, 110, 0.9, '#f6d23a', '#e0a43a', true, '<path d="M2 -9V9" stroke="#2a2a2a" stroke-width="2.2"/>')}</g>`;
    const clown = `<g>${fishSVG(346, 204, 0.55, '#f08a2a', '#d06a1a', true, '<path d="M-4 -9V9M8 -7V7" stroke="#fff" stroke-width="2.6"/>')}</g>`;
    return `<svg class="aq-tank ${night ? 'night' : 'day'}" viewBox="0 0 400 260" role="img" aria-label="${esc(O(NIGHT_T.title))}"><defs><linearGradient id="aqW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${temp === 2 ? '#7ac8d8' : '#5ab8e0'}"/><stop offset="1" stop-color="#1d6a98"/></linearGradient></defs>
      <rect width="400" height="260" fill="url(#aqW)"/>${sunRays}<path d="M0 232Q100 224 200 232T400 230V260H0z" fill="#e8d8b0"/>
      ${coralSVG('algae', 50, 236, 1)}<g class="aq-hit" data-w="coral">${coralSVG('branching', 130, 236, 1, pale, night)}${coralSVG('brain', 210, 236, 1, pale, night)}${coralSVG('table', 286, 236, 0.9, pale, night)}</g>
      ${coralSVG('seaanemone', 346, 236, 0.9)}${clown}${moray}${urchin}${parrot}${cleaner}${butter}${dark}
      <rect x="1.5" y="1.5" width="397" height="257" rx="8" fill="none" stroke="#bfe6ff" stroke-width="3"/></svg>`;
  }
  function render() {
    const F = found(); const n = DISC.filter((d) => F[d]).length;
    const seg = (key, val, opts) => opts.map((t, i) => `<button data-${key}="${i}" class="${val === i ? 'on' : ''}" ${busy ? 'disabled' : ''}>${esc(O(t))}</button>`).join('');
    S.body.innerHTML = `<div class="aq-wrap">
      <section class="aq-ctl">
        <div class="aq-dn"><button data-dn="0" class="${night ? '' : 'on'}">${icon('sun')}${esc(O(NIGHT_T.day))}</button><button data-dn="1" class="${night ? 'on' : ''}">${icon('moon')}${esc(O(NIGHT_T.night))}</button></div>
        <div class="ls-seg" role="group"><span>${esc(O(NIGHT_T.temp))}</span>${seg('t', temp, NIGHT_T.temps)}</div>
        <div class="ls-seg" role="group"><span>${esc(O(NIGHT_T.sun))}</span>${seg('s', sun, NIGHT_T.suns)}</div>
        <button class="ls-go" data-act="week" ${busy ? 'disabled' : ''}>${icon('hourglass')}${esc(O(NIGHT_T.week))}</button>
        <div class="aq-meter"><small>${esc(O(NIGHT_T.coral))}</small><i><s style="width:${Math.round((1 - Math.min(1, bleach / 3)) * 100)}%"></s></i></div>
        <small>${weeks} ${esc(O(NIGHT_T.weeks))}</small></section>
      <section class="aq-mid">${tank()}</section>
      <section class="aq-found"><small>${esc(O(NIGHT_T.found))} · ${esc(O(NIGHT_T.of, { n, all: DISC.length }))}</small>
        <ul>${DISC.map((d) => `<li class="${F[d] ? 'on' : ''}">${F[d] ? icon('check') + esc(O(NIGHT_T.d[d].name)) : `<span>${esc(O(NIGHT_D.has(d) ? NIGHT_T.hints.night : NIGHT_T.hints.heat))}</span>`}</li>`).join('')}</ul></section></div>`;
  }
  function week() {
    if (busy) return; busy = true; S.sfx('click'); render();
    S.el.querySelector('.aq-tank').classList.add('run');
    S.later(() => {
      busy = false; weeks++;
      let said = false;
      if (temp === 2) {
        hot++; const was = bleach; bleach = Math.min(3, bleach + (sun ? 2 : 1)); render();
        if (bleach >= 3 && !found().long) said = discover('long');
        else if (sun && !found().sun && was < 3) said = discover('sun');
        else if (!found().pale) said = discover('pale');
        if (!said) S.talk(T(bleach >= 3 ? NIGHT_T.lines.stillWhite : NIGHT_T.d.pale.say), 'oops');
      } else {
        hot = 0;
        if (bleach > 0) { bleach = Math.max(0, bleach - 1); render(); if (!found().back) discover('back'); else S.talk(T(NIGHT_T.lines.healing), 'happy'); }
        else { render(); if (temp === 1 && !found().tough) discover('tough'); else S.talk(T(temp === 1 ? NIGHT_T.d.tough.say : NIGHT_T.lines.weekCool), 'happy'); }
      }
    }, 900);
  }
  S.el.addEventListener('click', (e) => {
    const hit = e.target.closest('.aq-hit');
    if (hit && !busy) {
      const w = hit.dataset.w; S.sfx('click');
      if (night) { const d = w === 'parrot' ? 'cocoon' : w === 'coral' ? 'polyps' : w; if (NIGHT_T.d[d]) discover(d); render(); }
      else S.talk(T(NIGHT_T.dayLines[w]), 'curious');
      return;
    }
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.dn != null) { const was = night; night = b.dataset.dn === '1'; S.sfx('click'); render(); if (was !== night) S.talk(T(night ? (Object.keys(found()).some((d) => NIGHT_D.has(d)) ? NIGHT_T.lines.nightAgain : NIGHT_T.lines.nightFirst) : NIGHT_T.lines.dayAgain), 'curious'); return; }
    if (b.dataset.t != null) { temp = +b.dataset.t; S.sfx('click'); render(); if (temp === 2) S.talk(T(NIGHT_T.lines.hotDial), 'curious'); return; }
    if (b.dataset.s != null) { sun = +b.dataset.s; S.sfx('click'); render(); return; }
    if (b.dataset.act === 'week') week();
  });
  render(); S.talk(T(NIGHT_T.intro), 'happy');
  return { close: S.close, debug: { set: (o) => { if ('night' in o) night = o.night; if ('temp' in o) temp = o.temp; if ('sun' in o) sun = o.sun; render(); }, week, click: (w) => S.el.querySelector(`.aq-hit[data-w="${w}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true })), get bleach() { return bleach; } } };
}

// ───────────────────────────────────────── styles of the aquarium's activities
const AQ_CSS = `
#ui.wol .ar-wrap,#ui.wol .aq-wrap{display:grid;grid-template-columns:minmax(190px,250px) minmax(0,1fr) minmax(190px,250px);gap:12px;height:100%;min-height:0}
#ui.wol .ar-pal,#ui.wol .ar-side,#ui.wol .aq-ctl,#ui.wol .aq-found{display:flex;flex-direction:column;gap:6px;min-height:0;overflow:auto;padding:2px}
#ui.wol .ar-pal b{font-family:var(--serif);font-size:1.02em;margin-top:2px}
#ui.wol .ar-chips{display:grid;grid-template-columns:1fr 1fr;gap:5px}
#ui.wol .ar-chip{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:12px;border:2px solid #d8c79a;background:#fff;font:inherit;font-size:.84em;font-weight:700;color:#2a1a0e;cursor:pointer;text-align:right;min-height:38px}
#ui.wol .ar-chip.on{border-color:#1d6680;background:#e2f2fa;box-shadow:inset 0 0 0 1px #1d6680}
#ui.wol .ar-chip .ls-medal{width:26px;height:26px}
#ui.wol .ar-mid,#ui.wol .aq-mid{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;min-height:0}
#ui.wol .ar-tank,#ui.wol .aq-tank{width:100%;flex:1;min-height:120px;max-height:330px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.25)}
#ui.wol .ar-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
#ui.wol .ar-tank .swim{animation:arBob 3s ease-in-out infinite}
#ui.wol .ar-tank .ar-an:nth-child(2n) {animation-delay:-1.2s}
@keyframes arBob{0%,100%{transform:translate(0,0)}50%{transform:translate(-6px,3px)}}
#ui.wol .ar-tank.run .ar-an{animation:arBob 1s ease-in-out infinite}
#ui.wol .ar-tank .res{transition:transform .6s}
#ui.wol .ar-tank .f-eaten{opacity:.2}
#ui.wol .ar-gone{animation:arGone 1.2s ease-out}
@keyframes arGone{from{opacity:1;stroke:#fff}to{opacity:1}}
#ui.wol .ar-mk{font:800 12px sans-serif;fill:#fff}
#ui.wol .ar-end{padding:8px 10px;border-radius:12px;background:#fff;box-shadow:0 3px 0 #d8c79a}
#ui.wol .ar-end h3{margin:2px 0 0;font-family:var(--serif)}
#ui.wol .ar-end.e-thriving,#ui.wol .ar-end.e-small{background:#eaf6dc;box-shadow:0 3px 0 #a8c48a}
#ui.wol .ar-diary{margin:0;padding:0 16px 0 0;display:flex;flex-direction:column;gap:4px;font-size:.88em;line-height:1.35}
#ui.wol .ls.kids .ar-diary{line-height:1.6}
/* day and night */
#ui.wol .aq-dn{display:flex;gap:6px}
#ui.wol .aq-dn button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:8px;border-radius:12px;border:2px solid #c9b98a;background:#fff;font:inherit;font-weight:800;cursor:pointer;color:#2a1a0e}
#ui.wol .aq-dn button.on{background:#263440;border-color:#263440;color:#ffd978}
#ui.wol .aq-dn .ic{width:18px;height:18px}
#ui.wol .aq-meter i{display:flex;height:12px;border-radius:7px;background:#f4f1ea;border:2px solid #d8c79a;overflow:hidden}
#ui.wol .aq-meter s{display:block;height:100%;background:#c8705a;transition:width .6s}
#ui.wol .aq-tank .aq-hit{cursor:pointer}
#ui.wol .aq-tank .aq-hit:hover{filter:brightness(1.15) drop-shadow(0 0 4px #fff)}
#ui.wol .aq-tank .aq-swim{animation:arBob 4s ease-in-out infinite}
#ui.wol .aq-tank .aq-swim2{animation:arBob 3s ease-in-out infinite reverse}
#ui.wol .aq-tank.run{animation:aqRun .9s ease-in-out}
@keyframes aqRun{50%{filter:brightness(.6)}}
#ui.wol .aq-z{font:700 13px sans-serif;fill:#cfe8ff}
#ui.wol .aq-found ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
#ui.wol .aq-found li{display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:10px;background:rgba(255,255,255,.55);border:2px dashed #c9b98a;font-weight:700;font-size:.86em;color:#8a7a50}
#ui.wol .aq-found li.on{background:#eaf6dc;border:2px solid #8ab86a;color:#2c5a2a}
#ui.wol .aq-found li .ic{width:15px;height:15px;flex:none}
@media (max-width:900px),(max-height:620px){
  #ui.wol .ar-wrap,#ui.wol .aq-wrap{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(140px,180px);gap:8px}
  #ui.wol .ar-chips{grid-template-columns:1fr 1fr;gap:3px}
  #ui.wol .ar-chip{min-height:30px;padding:2px 4px;font-size:.72em;gap:3px}
  #ui.wol .ar-chip .ls-medal{width:22px;height:22px}
  #ui.wol .aq-found li{padding:3px 6px;font-size:.78em}
  #ui.wol .aq-dn button{padding:5px}
}
`;
