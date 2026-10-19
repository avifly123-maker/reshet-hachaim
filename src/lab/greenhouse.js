// מעבדת רובו־דע – the greenhouse's own world (19.10): two open experiments beside "הניסוי ההוגן" (thinking.js).
//   מגדלים חמנייה      six weeks: every week the child chooses where the pot stands and how much water it gets, and
//                       answers the guests (a snail, aphids, the bees); six endings, and a sticker for the ladybirds
//   זרעים יוצאים לדרך   build a seed (a gadget and a size) and test it in the wind, on a fox, with a bird and in a stream;
//                       no seed wins everything
// Facts: docs/sources.md ("The lab's stations"). Heights and distances are game values.
// Progress: labProgress().st.grow / .seeds. Badges lab:grow (four endings), lab:seeds (all four tests won).
import { esc, icon } from '../ui/ui.js';
import { stationShell, addCss } from './station-kit.js';
import { COMMON_T, MENU_T, GROW_T, SEEDS_T } from './station-text.js';
import { stUpdate, stOf } from './progress.js';
import { grant as grantBadge } from '../core/badges-store.js';

// ═════════════════════════════════════════ 1. מגדלים חמנייה
const G_ENDS = ['seeds', 'fewseeds', 'weak', 'dry', 'wet', 'snail'];
const EVENT_AT = { 2: 'snail', 3: 'aphids', 5: 'bees' };
function sunflowerSVG(g) {
  const shadeBg = g.place === 'shade';
  const bg = shadeBg ? '<rect width="300" height="260" fill="#d8ccb0"/><rect width="300" height="260" fill="#3a2a1a" opacity=".22"/>'
    : '<rect width="300" height="260" fill="#f6ecd2"/><rect x="200" y="14" width="86" height="110" rx="6" fill="#bfe4f6" stroke="#8a6a3a" stroke-width="5"/><path d="M243 14V124" stroke="#8a6a3a" stroke-width="4"/><circle cx="262" cy="40" r="11" fill="#ffd45a"/><path d="M200 124L120 230H280L286 124Z" fill="#fff6c8" opacity=".35"/>';
  const soil = '#5a3b22';
  let plant = '';
  const lean = shadeBg ? -10 : 8;   // toward the light (the window is on the right side of the picture)
  if (g.eaten) plant = '<path d="M150 196v-8" stroke="#6aa84f" stroke-width="3" stroke-linecap="round"/><path d="M146 190h8" stroke="#8a6a3a" stroke-width="2"/>';
  else if (g.week === 0) plant = '<ellipse cx="150" cy="196" rx="7" ry="4" fill="#3a3028" stroke="#efe6c8" stroke-width="1.2"/>';
  else {
    const h = Math.min(165, 14 + g.h * 2.2), top = 198 - h;
    const fall = g.end === 'weak';
    const pale = g.shade >= 2, dry = g.dryNow, wet = g.wetNow;
    const stemC = pale ? '#c8c27a' : '#4a8a3a', leafC = wet ? '#c8c44a' : pale ? '#d9d27a' : dry ? '#7a9a4a' : '#4f9a3a';
    const tx = 150 + (fall ? -70 : lean), ty = fall ? 186 : top;
    plant += `<path d="M150 198Q${150 + lean * 0.3} ${(198 + ty) / 2} ${tx} ${ty}" stroke="${stemC}" stroke-width="${pale ? 3 : 5.5}" fill="none" stroke-linecap="round"/>`;
    const nLeaves = Math.min(8, 2 + g.week * 1.2) | 0;
    for (let i = 0; i < nLeaves; i++) {
      const k = 0.25 + 0.7 * (i + 1) / nLeaves; const x = 150 + (tx - 150) * k * k, y = 198 + (ty - 198) * k; const side = i % 2 ? 1 : -1;
      const droop = dry ? 55 : 25, sz = (pale ? 0.6 : 1) * (0.8 + 0.3 * (1 - k));
      plant += `<ellipse cx="${(x + side * 13 * sz).toFixed(1)}" cy="${y.toFixed(1)}" rx="${(15 * sz).toFixed(1)}" ry="${(7 * sz).toFixed(1)}" fill="${leafC}" transform="rotate(${side * droop} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    if (g.aphids) for (let i = 0; i < 9; i++) plant += `<circle cx="${(150 + (tx - 150) * 0.6 + (i % 3) * 5 - 5).toFixed(1)}" cy="${(198 + (ty - 198) * (0.5 + (i / 3 | 0) * 0.07)).toFixed(1)}" r="1.8" fill="#8ac048"/>`;
    if (g.lady) for (const [dx, dy] of [[-12, 30], [10, 46]]) plant += `<g transform="translate(${tx + dx} ${ty + dy})"><circle r="4.5" fill="#d8302a"/><path d="M0 -4.5V4.5" stroke="#111" stroke-width="1"/><circle cx="-2" cy="-1" r="1" fill="#111"/><circle cx="2" cy="1.5" r="1" fill="#111"/></g>`;
    if (g.week >= 4 && !fall) {   // a bud, then the flower
      if (g.week === 4) plant += `<circle cx="${tx}" cy="${ty}" r="8" fill="#6a9a3a"/>`;
      else {
        const r = g.small ? 15 : 20; let pet = '';
        for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; pet += `<ellipse cx="${(tx + Math.cos(a) * (r + 6)).toFixed(1)}" cy="${(ty + Math.sin(a) * (r + 6)).toFixed(1)}" rx="8" ry="3.6" fill="#f6c02a" transform="rotate(${(a * 180 / Math.PI).toFixed(0)} ${(tx + Math.cos(a) * (r + 6)).toFixed(1)} ${(ty + Math.sin(a) * (r + 6)).toFixed(1)})"/>`; }
        let seeds = '';
        const n = g.week >= 6 ? (g.bees ? 26 : 7) : 0;
        for (let k = 0; k < n; k++) { const a = k * 2.4, d = Math.sqrt(k / 26) * (r - 3); seeds += `<ellipse cx="${(tx + Math.cos(a) * d).toFixed(1)}" cy="${(ty + Math.sin(a) * d).toFixed(1)}" rx="1.8" ry="1.2" fill="#2a1a0a"/>`; }
        plant += `${pet}<circle cx="${tx}" cy="${ty}" r="${r}" fill="#6a3a12"/>${seeds}`;
        if (g.beesNow) plant += `<g class="gh-bee"><ellipse cx="${tx + 30}" cy="${ty - 20}" rx="5" ry="3.5" fill="#e8b020"/><path d="M${tx + 28} ${ty - 23}v6M${tx + 31} ${ty - 23}v6" stroke="#2a1a0a" stroke-width="1.2"/><ellipse cx="${tx + 30}" cy="${ty - 25}" rx="3" ry="2" fill="#fff" opacity=".8"/></g>`;
      }
    } else if (fall && g.week >= 4) plant += `<circle cx="${tx}" cy="${ty}" r="10" fill="#c8a42a"/>`;
  }
  const snail = g.snail ? `<g class="gh-snail" transform="translate(${g.eaten ? 168 : 162} ${g.eaten ? 196 : 186})"><path d="M-14 8q8-5 24-2q6 1 8 4H-16z" fill="#c8b48a"/><circle r="9" fill="#b07a3a"/><path d="M0 0m-5 0a5 5 0 1 0 5-5a3 3 0 1 0 3 3" stroke="#6a4a1a" stroke-width="1.5" fill="none"/></g>` : '';
  return `<svg class="gh-view" viewBox="0 0 300 260" role="img" aria-label="${esc('חמנייה')}">${bg}${plant}${snail}
    <path d="M118 198h64l-7 46h-50z" fill="#c8693a"/><path d="M114 192h72v10h-72z" fill="#d97a48"/><path d="M120 194h60v4h-60z" fill="${soil}"/>
    ${g.wetNow ? '<path d="M122 197h56" stroke="#6fb6e8" stroke-width="3"/>' : ''}</svg>`;
}
export function openGrow(root, ctx) {
  addCss('gh-css', GH_CSS);
  const S = stationShell(root, { cls: 'grow', ic: 'sprout', title: GROW_T.title, small: MENU_T.greenhouse.title, sub: GROW_T.sub, ...ctx });
  const { T, O } = S;
  let g, place, water, ev, busy = false;
  function reset() { g = { week: 0, h: 0, shade: 0, dry: 0, wet: 0, dryNow: false, wetNow: false, snail: false, eaten: false, aphids: false, lady: false, small: false, bees: false, beesNow: false, place: 'sun', end: null }; place = 'sun'; water = 'mid'; ev = null; }
  reset();
  function render() {
    const P = stOf('grow'); const ends = P.ends || {};
    const seg = (key, val, opts) => Object.keys(opts).map((k) => `<button data-${key}="${k}" class="${val === k ? 'on' : ''}" ${busy || ev || g.end ? 'disabled' : ''}>${esc(O(opts[k]))}</button>`).join('');
    const E = ev && GROW_T.events[ev];
    S.body.innerHTML = `<div class="gh-wrap">
      <section class="gh-mid"><div class="gh-weeks">${[1, 2, 3, 4, 5, 6].map((w) => `<i class="${w <= g.week ? 'on' : ''} ${EVENT_AT[w] ? 'ev' : ''}">${w}</i>`).join('')}</div>${sunflowerSVG(g)}
        <small class="gh-h">${g.week ? esc(O(GROW_T.week, { n: g.week })) + ' · ' + esc(O(GROW_T.height, { h: Math.round(g.h) })) : ''}</small></section>
      <section class="gh-ctl">
        ${E ? `<div class="gh-ev ls-card"><b>${esc(O(E.ask))}</b><div class="gh-evopts">${Object.keys(E.opts).map((k) => `<button class="ls-soft" data-ev="${k}">${esc(O(E.opts[k]))}</button>`).join('')}</div></div>`
          : g.end ? `<div class="gh-ev ls-card gh-end"><small>${esc(O(COMMON_T.thisEnd))}</small><b>${esc(O(GROW_T.ends[g.end].name))}</b></div><button class="ls-go" data-act="restart">${icon('sprout')}${esc(O(GROW_T.restart))}</button>`
          : `<div class="ls-seg" role="group"><span>${esc(O(GROW_T.place))}</span>${seg('pl', place, GROW_T.places)}</div>
             <div class="ls-seg" role="group"><span>${esc(O(GROW_T.water))}</span>${seg('wa', water, GROW_T.waters)}</div>
             <button class="ls-go" data-act="next" ${busy ? 'disabled' : ''}>${icon('hourglass')}${esc(O(GROW_T.next))}</button>`}
        <small>${esc(O(COMMON_T.endings))}</small><div class="ls-ends">${G_ENDS.map((e) => `<span class="${ends[e] ? 'on' : ''} ${g.end === e ? 'now' : ''}">${ends[e] ? esc(O(GROW_T.ends[e].name)) : '?'}</span>`).join('')}</div>
        ${P.lady ? `<span class="gh-stk on">${esc(O(GROW_T.sticker))}</span>` : ''}</section></div>`;
  }
  function finish(end) {
    g.end = end; g.beesNow = false;
    const R = stUpdate('grow', (r) => { r.ends = r.ends || {}; r.ends[end] = (r.ends[end] || 0) + 1; if (g.lady && end !== 'snail') r.lady = 1; });
    if (Object.keys(R.ends).length >= 4) { try { grantBadge('lab:grow'); } catch (e) { /* */ } }
    render(); S.sfx(end === 'seeds' ? 'mission' : end === 'fewseeds' ? 'quizRight' : 'discover');
    S.talk(T(GROW_T.ends[end].say), end === 'seeds' ? 'wow' : end === 'fewseeds' ? 'curious' : 'oops');
  }
  function next() {
    if (busy || ev || g.end) return;
    busy = true; S.sfx('click'); render();
    S.later(() => {
      busy = false; g.week++; g.place = place; g.beesNow = false;
      g.h += place === 'shade' ? 12 : 8; if (water === 'little') g.h -= 4; if (water === 'much') g.h -= 3;
      if (place === 'shade') g.shade++;
      g.dry = water === 'little' ? g.dry + 1 : 0; g.wet = water === 'much' ? g.wet + 1 : 0;
      g.dryNow = water === 'little'; g.wetNow = water === 'much';
      if (g.dry >= 2) { finish('dry'); return; }
      if (g.wet >= 2) { finish('wet'); return; }
      if (g.week >= 6) { finish(g.shade >= 3 ? 'weak' : g.bees ? 'seeds' : 'fewseeds'); return; }
      ev = EVENT_AT[g.week] || null;
      if (ev === 'snail') g.snail = true;
      if (ev === 'aphids') g.aphids = true;
      render();
      if (ev) S.talk(T(GROW_T.events[ev].ask), 'curious');
      else S.talk(T(place === 'shade' ? GROW_T.say.shade : water === 'little' ? GROW_T.say.little : water === 'much' ? GROW_T.say.much : GROW_T.say.good), place === 'shade' || water !== 'mid' ? 'curious' : 'happy');
    }, 800);
  }
  function answer(k) {
    const e = ev; ev = null; S.sfx('click');
    if (e === 'snail') {
      if (k === 'stay') { busy = true; render(); S.talk(T(GROW_T.say.snailStay), 'curious'); S.later(() => { busy = false; g.eaten = true; g.h = 1; finish('snail'); }, 1800); return; }
      g.snail = false; render(); S.talk(T(GROW_T.say.snailMove), 'happy'); return;
    }
    if (e === 'aphids') {
      if (k === 'lady') { g.lady = true; g.aphids = false; S.talk(T(GROW_T.say.lady), 'wow'); }
      else if (k === 'wash') { g.aphids = false; S.talk(T(GROW_T.say.wash), 'happy'); }
      else { g.small = true; S.talk(T(GROW_T.say.none), 'curious'); }
      render(); return;
    }
    if (e === 'bees') { g.bees = k === 'open'; g.beesNow = g.bees; render(); S.talk(T(g.bees ? GROW_T.say.open : GROW_T.say.closed), g.bees ? 'wow' : 'curious'); }
  }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.ev) { answer(b.dataset.ev); return; }
    if (b.dataset.act === 'next') { next(); return; }
    if (b.dataset.act === 'restart') { reset(); S.sfx('click'); render(); S.talk(T(GROW_T.intro), 'happy'); return; }
    if (b.dataset.pl) { place = b.dataset.pl; S.sfx('click'); render(); return; }
    if (b.dataset.wa) { water = b.dataset.wa; S.sfx('click'); render(); }
  });
  render(); S.talk(T(GROW_T.intro), 'happy');
  return { close: S.close, debug: { set: (pl, wa) => { place = pl; water = wa; render(); }, next, answer, get state() { return { ...g, ev }; } } };
}

// ═════════════════════════════════════════ 2. זרעים יוצאים לדרך
const GADGETS = ['none', 'wing', 'fluff', 'hooks', 'fruit', 'float', 'spring'];
const TESTS = ['wind', 'fur', 'bird', 'water'];
const GOAL = 8;
const DIST = {
  wind: { 'fluff-small': 40, 'fluff-big': 0.6, 'wing-small': 15, 'wing-big': 5, 'none-small': 2, 'none-big': 0.3, 'hooks-small': 1.5, 'hooks-big': 0.3, 'fruit-small': 0.5, 'fruit-big': 0.2, 'float-small': 1, 'float-big': 0.3 },
  fur: { 'hooks-small': 60, 'hooks-big': 4, 'fluff-small': 3 },
  bird: { 'fruit-small': 80, 'fruit-big': 0.3 },
  water: { 'float-big': 200, 'float-small': 50, 'fluff-small': 2 },
};
export function seedResult(gadget, size, test) {
  const key = `${gadget}-${size}`;
  if (gadget === 'spring') return { m: 6, kind: 'near', why: test === 'bird' ? 'spring:bird' : 'spring' };
  const m = (DIST[test] || {})[key] ?? (test === 'bird' ? 0 : 0.3);
  const why = SEEDS_T.why[`${key}:${test}`] ? `${key}:${test}` : null;
  const kind = m >= GOAL ? 'far' : test === 'bird' && gadget !== 'fruit' ? 'ignore' : test === 'water' && m < 1 ? 'sink' : test === 'fur' && m < 1 ? 'fall' : m < 1 ? 'plop' : 'near';
  return { m, kind, why };
}
function seedSVG(gadget, size, s = 1) {
  const r = size === 'big' ? 7 : 4.5;
  const body = `<ellipse cx="0" cy="0" rx="${r}" ry="${r * 0.7}" fill="#6a4a22"/>`;
  const G = {
    none: '',
    wing: `<path d="M${r - 1} -1Q${r + 14} -12 ${r + 26} -4Q${r + 14} 2 ${r - 1} 2Z" fill="#c8a46a" stroke="#8a6a3a" stroke-width="1"/>`,
    fluff: `<path d="M0 ${-r}V${-r - 14}" stroke="#d8d0c0" stroke-width="1.2"/>${[...Array(9)].map((_, k) => { const a = -Math.PI * (0.1 + 0.8 * k / 8); return `<path d="M0 ${-r - 14}l${(Math.cos(a) * 11).toFixed(1)} ${(Math.sin(a) * 11).toFixed(1)}" stroke="#f4f0e6" stroke-width="1.4" stroke-linecap="round"/>`; }).join('')}`,
    hooks: [...Array(7)].map((_, k) => { const a = k * Math.PI * 2 / 7 + 0.3; const x = Math.cos(a) * (r + 1), y = Math.sin(a) * (r + 1); return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * 5).toFixed(1)} ${(Math.sin(a) * 5).toFixed(1)}q2 -2 0 -3" stroke="#8a5a2a" stroke-width="1.3" fill="none"/>`; }).join(''),
    fruit: `<circle cx="0" cy="0" r="${r + 5}" fill="#c8304a"/><circle cx="-2" cy="-3" r="${(r + 5) * 0.3}" fill="#f08aa0" opacity=".7"/>`,
    float: `<ellipse cx="0" cy="0" rx="${r + 8}" ry="${r + 5}" fill="#b8925a" stroke="#7a5a2a" stroke-width="1.5"/><ellipse cx="2" cy="-2" rx="${r + 2}" ry="${r}" fill="#e8dcc0" opacity=".6"/>`,
    spring: `<path d="M-${r + 6} 0Q0 -${r + 9} ${r + 6} 0Q0 ${r + 9} -${r + 6} 0Z" fill="#8ab84a" stroke="#4a7a2a" stroke-width="1.5"/><path d="M-${r} 0h${2 * r}" stroke="#4a7a2a" stroke-width="1" stroke-dasharray="2 2"/>`,
  };
  const under = gadget === 'fruit' || gadget === 'float' || gadget === 'spring';
  return `<g transform="scale(${s})">${under ? G[gadget] + body : body + G[gadget]}</g>`;
}
const X0 = 360, X1 = 24;
const xOf = (m) => X0 - Math.min(1, Math.log10(1 + m) / Math.log10(201)) * (X0 - X1);
export function openSeeds(root, ctx) {
  addCss('gh-css', GH_CSS);
  const S = stationShell(root, { cls: 'seeds', ic: 'leaf', title: SEEDS_T.title, small: MENU_T.greenhouse.title, sub: SEEDS_T.sub, ...ctx });
  const { T, O } = S;
  const thumbs = ctx.thumbs || {};
  let gadget = 'none', size = 'small', test = null, last = null, busy = false, runs = [];
  const P = () => stOf('seeds');
  function track() {
    const goalX = xOf(GOAL);
    const deco = test === 'wind' ? '<g stroke="#9fc8e0" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"><path d="M330 30q-30-8-60 0t-60 0"/><path d="M300 52q-30-8-60 0t-60 0"/><path d="M340 70q-30-8-60 0"/></g>'
      : test === 'water' ? '<path d="M0 92Q100 84 200 92T400 90V112H0z" fill="#5aa8d8" opacity=".75"/>'
      : test === 'fur' && thumbs.fox ? `<g class="gh-walk"><image href="${thumbs.fox}" x="300" y="40" width="44" height="44" clip-path="inset(0 round 22px)"/></g>`
      : test === 'bird' && thumbs.blackbird ? `<g class="gh-fly"><image href="${thumbs.blackbird}" x="320" y="12" width="40" height="40" clip-path="inset(0 round 20px)"/></g>` : '';
    const ticks = [0, 1, 5, 10, 50, 200].map((m) => `<path d="M${xOf(m).toFixed(1)} 96v6" stroke="#8a7a50" stroke-width="1.5"/><text x="${xOf(m).toFixed(1)}" y="114" text-anchor="middle" class="gh-tk">${m}</text>`).join('');
    const land = last ? xOf(last.m) : X0;
    return `<svg class="gh-track" viewBox="0 0 400 120" role="img" aria-label="${esc(O(SEEDS_T.tests))}"><rect width="400" height="120" fill="#eaf4e0"/>${deco}
      <path d="M0 96H400" stroke="#8a7a50" stroke-width="2"/>${ticks}
      <path d="M${goalX.toFixed(1)} 20V96" stroke="#e0a43a" stroke-width="3" stroke-dasharray="6 4"/><text x="${goalX.toFixed(1)}" y="16" text-anchor="middle" class="gh-tk gh-goal">${GOAL}</text>
      <g transform="translate(372 96)"><path d="M0 0V-46" stroke="#4a8a3a" stroke-width="4"/><circle cx="0" cy="-52" r="9" fill="#f6c02a"/><circle cx="0" cy="-52" r="4.5" fill="#6a3a12"/><ellipse cx="-8" cy="-26" rx="9" ry="4" fill="#4f9a3a" transform="rotate(-30 -8 -26)"/></g>
      <g class="gh-seed" style="transform:translate(${land.toFixed(1)}px,${last ? (last.kind === 'sink' ? 102 : 92) : 46}px)">${seedSVG(gadget, size, 1.3)}</g></svg>`;
  }
  function render() {
    const won = P().won || {};
    const nWon = TESTS.filter((t) => won[t]).length;
    S.body.innerHTML = `<div class="gs-wrap">
      <section class="gs-bench"><b>${esc(O(SEEDS_T.build))}</b>
        <svg class="gs-prev" viewBox="-40 -34 80 60" aria-hidden="true">${seedSVG(gadget, size, 1.6)}</svg>
        <div class="ls-seg" role="group"><span>${esc(O(SEEDS_T.size))}</span>${['small', 'big'].map((k) => `<button data-sz="${k}" class="${size === k ? 'on' : ''}" ${busy ? 'disabled' : ''}>${esc(O(SEEDS_T.sizes[k]))}</button>`).join('')}</div>
        <small>${esc(O(SEEDS_T.gadget))}</small><div class="gs-gad">${GADGETS.map((k) => `<button data-g="${k}" class="${gadget === k ? 'on' : ''}" ${busy ? 'disabled' : ''}><svg viewBox="-22 -20 44 36" aria-hidden="true">${seedSVG(k, 'small', 0.9)}</svg><span>${esc(O(SEEDS_T.gadgets[k]))}</span></button>`).join('')}</div></section>
      <section class="gs-mid"><div class="gs-tests">${TESTS.map((t) => `<button data-t="${t}" class="${test === t ? 'on' : ''} ${won[t] ? 'won' : ''}" ${busy ? 'disabled' : ''}>${won[t] ? icon('check') : ''}${esc(O(SEEDS_T.testNames[t]))}</button>`).join('')}</div>
        ${track()}<small>${esc(O(SEEDS_T.goal, { m: GOAL }))}</small></section>
      <section class="gs-side"><small>${esc(O(SEEDS_T.table))} · ${esc(O(SEEDS_T.won, { n: nWon }))}</small>
        <table><thead><tr><th></th>${TESTS.map((t) => `<th>${esc(O(SEEDS_T.testNames[t]))}</th>`).join('')}</tr></thead>
        <tbody>${runs.slice(0, 6).map((r) => `<tr><th><svg viewBox="-22 -20 44 36" aria-hidden="true">${seedSVG(r.g, r.s, 0.8)}</svg></th>${TESTS.map((t) => { const x = r.res[t]; return `<td class="${x ? (x.m >= GOAL ? 'far' : 'no') : ''}">${x ? (x.m >= GOAL ? icon('check') : '') + (x.m < 1 ? '0' : Math.round(x.m)) : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></section></div>`;
  }
  function runTest(t) {
    if (busy) return; test = t; busy = true; last = null; render(); S.sfx('click');
    const res = seedResult(gadget, size, t);
    // fly: a few steps to the landing point
    const seed = S.el.querySelector('.gh-seed'); const x1 = xOf(res.m), y1 = res.kind === 'sink' ? 102 : 92;
    const t0 = performance.now(), dur = 1300;
    const step = (now) => {
      if (!S.alive()) return; const k = Math.min(1, (now - t0) / dur);
      const x = X0 + (x1 - X0) * k, y = 46 + (y1 - 46) * k - Math.sin(k * Math.PI) * Math.min(40, 10 + res.m);
      if (seed) seed.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      if (k < 1) requestAnimationFrame(step); else land();
    };
    requestAnimationFrame(step);
    function land() {
      busy = false; last = res;
      let row = runs[0] && runs[0].g === gadget && runs[0].s === size ? runs[0] : null;
      if (!row) { row = { g: gadget, s: size, res: {} }; runs.unshift(row); }
      row.res[t] = res;
      const first = !(P().won || {})[t] && res.m >= GOAL;
      const R = stUpdate('seeds', (r) => { r.tries = (r.tries || 0) + 1; if (res.m >= GOAL) { r.won = r.won || {}; r.won[t] = r.won[t] || `${gadget}-${size}`; } });
      render(); S.sfx(res.m >= GOAL ? 'quizRight' : 'click');
      const m = res.m < 1 ? 0 : Math.round(res.m);
      const lines = [T(SEEDS_T.res[res.kind], { m })];
      if (res.why) lines.push(T(SEEDS_T.why[res.why]));
      const all = TESTS.every((x) => (R.won || {})[x]);
      if (first && all) { try { grantBadge('lab:seeds'); } catch (e) { /* */ } S.sfx('mission'); lines.push(T(SEEDS_T.allWon)); }
      S.talk(lines.flat(), res.m >= GOAL ? 'wow' : res.kind === 'near' ? 'curious' : 'oops');
    }
  }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.g) { gadget = b.dataset.g; last = null; S.sfx('click'); render(); if (!test) S.talk(T(SEEDS_T.pickTest), 'curious'); return; }
    if (b.dataset.sz) { size = b.dataset.sz; last = null; S.sfx('click'); render(); return; }
    if (b.dataset.t) runTest(b.dataset.t);
  });
  render(); S.talk(T(SEEDS_T.intro), 'happy');
  return { close: S.close, debug: { set: (g, s) => { gadget = g; size = s; render(); }, test: runTest, result: seedResult } };
}

const GH_CSS = `
#ui.wol .gh-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,320px);gap:14px;height:100%;min-height:0}
#ui.wol .gh-mid{display:flex;flex-direction:column;align-items:center;gap:6px;min-height:0}
#ui.wol .gh-view{width:100%;flex:1;min-height:120px;max-height:340px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.18)}
#ui.wol .gh-weeks{display:flex;gap:6px;direction:rtl}
#ui.wol .gh-weeks i{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;border:2px dashed #b9a77a;font-style:normal;font-weight:800;font-size:.85em;color:#8a7a50}
#ui.wol .gh-weeks i.ev{border-color:#e0a43a}
#ui.wol .gh-weeks i.on{border:2px solid #4f8a3f;background:#4f8a3f;color:#fff}
#ui.wol .gh-ctl{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto;padding:2px}
#ui.wol .gh-ev b{display:block;font-size:1.02em;line-height:1.4;margin-bottom:6px}
#ui.wol .gh-evopts{display:flex;flex-direction:column;gap:6px}
#ui.wol .gh-end b{font-family:var(--serif);font-size:1.2em}
#ui.wol .gh-stk{display:inline-block;margin-top:4px;padding:3px 10px;border-radius:999px;background:#ffe8e4;border:2px solid #d8302a;color:#8a1a12;font-weight:800;font-size:.82em}
#ui.wol .gh-bee{animation:arBob 1.2s ease-in-out infinite}
#ui.wol .gh-snail{animation:ghCrawl 3s ease-in-out infinite alternate}
@keyframes ghCrawl{to{transform:translate(4px,0)}}
#ui.wol .ls.kids .gh-ev b{line-height:1.65}
/* seeds */
#ui.wol .gs-wrap{display:grid;grid-template-columns:minmax(200px,260px) minmax(0,1fr) minmax(190px,250px);gap:12px;height:100%;min-height:0}
#ui.wol .gs-bench,#ui.wol .gs-side{display:flex;flex-direction:column;gap:6px;min-height:0;overflow:auto;padding:2px}
#ui.wol .gs-prev{width:100%;height:76px;background:#fff;border-radius:12px;box-shadow:0 3px 0 #d8c79a}
#ui.wol .gs-gad{display:grid;grid-template-columns:1fr 1fr;gap:5px}
#ui.wol .gs-gad button{display:flex;align-items:center;gap:4px;padding:3px 6px;border-radius:12px;border:2px solid #d8c79a;background:#fff;font:inherit;font-size:.82em;font-weight:700;color:#2a1a0e;cursor:pointer;text-align:right}
#ui.wol .gs-gad button.on{border-color:#2c7a5a;background:#e4f4ea}
#ui.wol .gs-gad svg{width:30px;height:26px;flex:none}
#ui.wol .gs-mid{display:flex;flex-direction:column;gap:8px;min-width:0;min-height:0;align-items:stretch}
#ui.wol .gs-tests{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
#ui.wol .gs-tests button{display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:8px 4px;border-radius:12px;border:2px solid #263440;background:#fff;color:#263440;font:inherit;font-weight:800;cursor:pointer}
#ui.wol .gs-tests button.on{background:#263440;color:#ffd978}
#ui.wol .gs-tests button.won:not(.on){border-color:#4f8a3f;background:#eaf6dc;color:#2c5a2a}
#ui.wol .gs-tests .ic{width:15px;height:15px}
#ui.wol .gh-track{width:100%;flex:1;min-height:100px;max-height:260px;border-radius:12px;box-shadow:0 3px 0 #d8c79a}
#ui.wol .gh-tk{font:700 10px sans-serif;fill:#8a7a50}
#ui.wol .gh-goal{fill:#c8891a;font-size:12px}
#ui.wol .gh-walk{animation:ghWalk 1.4s linear}
@keyframes ghWalk{from{transform:translate(0,0)}to{transform:translate(-120px,0)}}
#ui.wol .gh-fly{animation:ghFly 1.4s ease-in}
@keyframes ghFly{from{transform:translate(0,30px)}to{transform:translate(-200px,-10px)}}
#ui.wol .gs-side table{width:100%;border-collapse:collapse;font-size:.8em;background:#fff;border-radius:10px;overflow:hidden}
#ui.wol .gs-side th,#ui.wol .gs-side td{padding:2px 3px;text-align:center;border-bottom:1px solid #e8dcc0}
#ui.wol .gs-side tbody th svg{width:30px;height:24px}
#ui.wol .gs-side td.far{background:#eaf6dc;color:#2c5a2a;font-weight:800}
#ui.wol .gs-side td.no{color:#a8641a}
#ui.wol .gs-side td .ic{width:12px;height:12px}
@media (max-width:900px),(max-height:620px){
  #ui.wol .gh-wrap{grid-template-columns:minmax(0,1fr) minmax(200px,260px);gap:8px}
  #ui.wol .gs-wrap{grid-template-columns:minmax(190px,230px) minmax(0,1fr) minmax(140px,180px);gap:8px}
  #ui.wol .gs-gad{grid-template-columns:1fr 1fr;gap:3px}
  #ui.wol .gs-gad button{padding:1px 6px;font-size:.76em}
  #ui.wol .gs-gad svg{width:24px;height:20px}
  #ui.wol .gs-prev{height:54px}
  #ui.wol .gs-tests button{padding:5px 2px;font-size:.84em}
  #ui.wol .gh-weeks i{width:22px;height:22px}
}
`;
