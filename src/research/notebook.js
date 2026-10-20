// חוקרי הטבע – מחברת החוקר: one notebook with four pages, so a child can look, think and draw conclusions calmly:
//   מדידות   every measurement in its own row (the creature's card painting and a big number); the graph shows ONE line,
//            a tap on another row adds a second line to compare; the moment of each idea is marked on the line and a
//            short sentence says what changed after it. Beginners see bars (before / after the idea / now) instead.
//   השערות   the case's hypothesis cards (cause → effect, two pictures): choose one, rule others out
//   קשרים    who eats whom and who needs what, built from the case's model, with the numbers measured so far
//   ניסויים  every try, what we saw and why (the experiment log)
// Plain DOM inside the research modal; the session gives the data (rows with their history, ideas, guesses, links).
import { icon, esc } from '../ui/ui.js';

const COLS = ['#c8473a', '#2f74c0'];

export function notebookHTML(d, tab, sel, o) {
  const { T, kids, pic } = o;
  const tabs = [['measure', T('tabMeasure'), 'search'], ['hyp', T('tabHyp'), 'pencil'], ['links', T('tabLinks'), 'web'], ['log', T('tabLog'), 'book']];
  const head = `<header><h2>${icon('book')}${esc(T('notebook'))}</h2><button class="rs-x" aria-label="${esc(T('close'))}">${icon('close')}</button></header>
    <nav class="nb-tabs" role="tablist">${tabs.map(([id, name, ic]) => `<button class="nb-tab${tab === id ? ' on' : ''}" data-tab="${id}" role="tab">${icon(ic)}<span>${esc(name)}</span>${id === 'hyp' && d.guess ? '<i class="nb-dot"></i>' : ''}</button>`).join('')}</nav>`;
  let body = '';
  if (tab === 'measure') body = measureHTML(d, sel, o);
  else if (tab === 'hyp') body = hypHTML(d, o);
  else if (tab === 'links') body = linksHTML(d, o);
  else body = logHTML(d, o);
  return `<div class="rs-lab-desk nb-desk${kids ? ' kids' : ''}">${head}<div class="nb-page paper nb-p-${tab}">${body}</div></div>`;
}

// ───────────── measurements
function measureHTML(d, sel, o) {
  const { T, kids, pic } = o;
  const rows = d.rows.map((r) => {
    const i = sel.indexOf(r.id);
    if (!r.known) return `<li class="nb-row u">${pic(r.thumb, r.icon, 'nb-pic')}<span class="nb-name">${esc(r.name)}</span>
      <button class="nb-measure" data-tool="${r.tool ? r.tool.id : ''}">${r.tool ? pic(null, r.tool.icon, 'nb-tpic') : ''}<span>${esc(T('toMeasure'))}</span></button></li>`;
    return `<li><button class="nb-row k${i >= 0 ? ' sel s' + i : ''}" data-row="${r.id}" style="${i >= 0 ? `--c:${COLS[i]}` : ''}">${pic(r.thumb, r.icon, 'nb-pic')}<span class="nb-name">${esc(r.name)}</span>
      <b class="nb-val">${r.value}</b><i class="nb-tr t${r.trend}">${r.trend > 0 ? '▲' : r.trend < 0 ? '▼' : ''}</i></button></li>`;
  }).join('');
  const chosen = sel.map((id) => d.rows.find((r) => r.id === id && r.known)).filter(Boolean);
  let graph;
  if (!chosen.length) graph = `<div class="rs-nodata">${pic(null, 'quadrat')}<p>${esc(T('noData'))}</p></div>`;
  else graph = kids ? barsHTML(d, chosen, o) : linesHTML(d, chosen, o);
  const lines = chosen.map((r, i) => `<p class="nb-say" style="--c:${COLS[i]}">${pic(r.thumb, r.icon, 'nb-spic')}<span>${esc(r.say)}</span></p>`).join('');
  return `<p class="nb-sub">${esc(T('measureSub'))}</p><div class="nb-meas"><ul class="nb-rows">${rows}</ul>
    <div class="nb-graphbox">${graph}${lines}</div></div>`;
}

// beginners: before the idea / right after it / now, as bars with big numbers
function barsHTML(d, chosen, o) {
  const { T, pic } = o;
  return `<div class="nb-bars">${chosen.map((r, i) => {
    const bars = [];
    if (r.ref) {
      bars.push([T('beforeIdea'), r.ref.before]);
      if (Math.round(r.ref.after) !== Math.round(r.ref.before)) bars.push([r.ref.ideaShort || '', r.ref.after, r.ref.pic]);
    } else bars.push([T('atStart'), r.first]);
    bars.push([T('nowBar'), r.value]);
    const max = Math.max(1, ...bars.map((b) => b[1]));
    return `<div class="nb-bgroup" style="--c:${COLS[i]}">${bars.map(([lab, v, p], k) => `<div class="nb-bar${k === bars.length - 1 ? ' now' : ''}">
      <b>${Math.round(v)}</b><i style="height:${Math.max(3, 100 * v / max).toFixed(1)}%"></i><span>${p ? `<img class="nb-bpic" src="${p}" alt="">` : ''}${esc(lab)}</span></div>`).join('')}
      <div class="nb-bname">${pic(r.thumb, r.icon, 'nb-spic')}<span>${esc(r.name)}</span></div></div>`;
  }).join('')}</div>`;
}

// middle and advanced: one line (or two to compare), time from right (the start) to left (now), ideas marked
function linesHTML(d, chosen, o) {
  const { T, pic, artOf } = o;
  const W0 = 600, H0 = 250, P = { l: 16, r: 16, t: 26, b: 12 };
  const t0 = Math.min(...chosen.map((r) => r.points.length ? r.points[0][0] : d.now));
  const span = Math.max(30, d.now - t0);
  const X = (t) => W0 - P.r - (t - t0) / span * (W0 - P.l - P.r);
  const flags = d.acts.filter((a) => a.t >= t0);
  const svgFlags = flags.map((a) => `<line x1="${X(a.t).toFixed(1)}" x2="${X(a.t).toFixed(1)}" y1="${P.t - 4}" y2="${H0 - P.b}" stroke="#8a7a52" stroke-width="1.5" stroke-dasharray="5 4"/>`).join('');
  const flagPics = flags.map((a) => a.pic ? `<img class="nb-flag" style="left:${(X(a.t) / W0 * 100).toFixed(2)}%" src="${a.pic}" alt="" title="${esc(a.title)}">` : '').join('');
  const labs = [];
  const svgLines = chosen.map((r, i) => {
    const max = Math.max(1, ...r.points.map((p) => p[1])) * 1.12;
    const Y = (v) => H0 - P.b - v / max * (H0 - P.t - P.b);
    const pts = r.points.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
    const last = r.points[r.points.length - 1] || [d.now, r.value], first = r.points[0] || last;
    labs.push({ i, y: Y(last[1]), v: Math.round(last[1]), side: 'l', r });
    labs.push({ i, y: Y(first[1]), v: Math.round(first[1]), side: 'r', r });
    return `<polyline points="${pts}" fill="none" stroke="${COLS[i]}" stroke-width="${i ? 3 : 3.6}" stroke-linejoin="round" stroke-linecap="round"${i ? ' stroke-dasharray="9 5"' : ''}/>
      <circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="5" fill="${COLS[i]}"/>`;
  }).join('');
  // number tags at both ends, pushed apart so two never overlap
  for (const side of ['l', 'r']) {
    const s = labs.filter((l) => l.side === side).sort((a, b) => a.y - b.y);
    for (let k = 1; k < s.length; k++) if (s[k].y - s[k - 1].y < 26) s[k].y = s[k - 1].y + 26;
  }
  const tags = labs.map((l) => `<span class="nb-tag ${l.side}" style="top:${(l.y / H0 * 100).toFixed(2)}%;--c:${COLS[l.i]}">${l.side === 'l' ? pic(l.r.thumb, l.r.icon, 'nb-tpic') : ''}<b>${l.v}</b></span>`).join('');
  return `<div class="nb-graph"><svg viewBox="0 0 ${W0} ${H0}" preserveAspectRatio="none" aria-hidden="true">
      <line x1="${P.l}" x2="${W0 - P.r}" y1="${H0 - P.b}" y2="${H0 - P.b}" stroke="#b9ab84" stroke-width="1.5"/>${svgFlags}${svgLines}</svg>${flagPics}${tags}
    <div class="rs-g-axis"><span class="rs-g-start">${esc(T('tStart'))}</span><i></i><span>${icon('hourglass')}${esc(T('tNow'))}</span></div></div>`;
}

// ───────────── hypotheses
function hypHTML(d, o) {
  const { T, pic, kids } = o;
  return `<p class="nb-sub">${esc(T('hypSub'))}</p><div class="nb-hyps">${d.guesses.map((g) => {
    const st = d.guess === g.id ? 'mine' : d.ruled.has(g.id) ? 'out' : '';
    const pics = (g.pics || []).map((p) => pic(p.thumb, p.icon, 'nb-hpic'));
    const chain = pics.length > 1 ? `${pics[0]}<i class="nb-arrow" aria-hidden="true"></i>${pics[1]}` : pics[0] || '';
    return `<div class="nb-hyp ${st}" data-g="${g.id}"><div class="nb-chain">${chain}</div><p>${esc(g.text)}</p>
      ${st === 'mine' ? `<span class="nb-mine">${icon('check')}${esc(T('hypMine'))}</span>` : st === 'out' ? `<span class="nb-ruled">${esc(T('hypRuled'))}</span>` : ''}
      <div class="nb-hbtns">${st === 'mine' ? '' : `<button class="nb-pick" data-pick="${g.id}">${esc(T('hypPick'))}</button>`}
      ${st === 'out' ? `<button class="nb-out" data-back="${g.id}">${esc(T('hypBack'))}</button>` : st === 'mine' ? '' : `<button class="nb-out" data-out="${g.id}">${esc(T('hypOut'))}</button>`}</div></div>`;
  }).join('')}</div>`;
}

// ───────────── links between the creatures
function linksHTML(d, o) {
  const { T, pic } = o;
  const val = (r) => `<small class="nb-lv${r.known ? '' : ' u'}">${r.known ? r.value : '?'}</small>`;
  return `<p class="nb-sub">${esc(T('linksSub'))}</p><ul class="nb-links">${d.links.map((l) => `<li class="nb-link k-${l.kind}">
    <span class="nb-lend">${pic(l.ra.thumb, l.ra.icon, 'nb-lpic')}${val(l.ra)}</span><i class="nb-arrow" aria-hidden="true"></i><span class="nb-lend">${pic(l.rb.thumb, l.rb.icon, 'nb-lpic')}${val(l.rb)}</span>
    <p>${esc(l.text)}</p></li>`).join('')}</ul>`;
}

// ───────────── the experiment log
const LOG_IC = { idea: 'flask', result: 'binoc', surprise: 'sparkle', why: 'bulb', solved: 'check' };
function logHTML(d, o) {
  const { T, pic, kids } = o;
  const rows = []; let at = 0;
  for (const e of d.logs) {
    if (!kids && e.attempt !== at) { at = e.attempt; rows.push(`<li class="rs-lg-head">${esc(T('attempt', { n: at }))}</li>`); }
    if (e.kind === 'retry') continue;
    const ic = e.kind === 'idea' ? (e.thumb ? `<img class="rs-lg-pic" src="${e.thumb}" alt="">` : pic(null, e.icon, 'rs-lg-pic')) : `<span class="rs-lg-ic">${icon(LOG_IC[e.kind] || 'leaf')}</span>`;
    const tag = e.kind === 'idea' ? T('logTried') : e.kind === 'surprise' ? T('surprise') : e.kind === 'why' ? T('logWhy') : e.kind === 'solved' ? '' : T('logSaw');
    const txt = e.kind === 'surprise' ? String(e.text).replace(/^הפתעה[:!]\s*/, '') : e.text;
    rows.push(`<li class="rs-lg-${e.kind}">${ic}<div>${tag ? `<small>${esc(tag)}</small>` : ''}<p>${esc(txt)}</p></div></li>`);
  }
  return `<p class="nb-sub">${esc(kids ? T('logSubK') : T('logSub'))}</p>${rows.length ? `<ol class="rs-lg nb-lg">${rows.join('')}</ol>` : `<p class="rs-log-empty">${esc(kids ? T('logEmptyK') : T('logEmpty'))}</p>`}`;
}
