// מירוץ הרובוטים (1.4.4 set 7): the event's screen. The course in 3D (race3d.js) fills the middle; beside it, the
// robots to choose from (the ready ones and the child's own from the robot workshop, each with what ground it can
// cross) and the lab's program editor with four blocks (forward, right, left, repeat). One program and one robot must
// pass the whole course (Avi, 4.11). A run that fails says why, in words; a run that finishes shows the steps and the
// blocks, the child's two personal records, and from then on the best run drives beside him as a ghost.
//   openRace(o)   o: the weekly opener's object (src/ui/weekly-ui.js launch)
import { RACE_VERSIONS, RACE_BOTS, RACE_BLOCKS, RACE_UI, SEGMENTS } from '../data/weekly/race.js';
import { raceLevel, runRace, segOfX } from './race-model.js';
import { createRace3D } from './race3d.js';
import { createEditor } from '../robolab/ui/editor.js';
import { statsOf, checkBuild } from '../robolab/engine/build.js';
import { planLevel } from '../robolab/engine/plan.js';
import { PRESETS } from '../data/robolab/workshop.js';
import { WK_ICONS } from '../data/robolab/wk-icons.js';
import { myRobots } from '../robolab/progress.js';
import { ZONE_LOOK } from '../data/zones.js';
import { icon } from '../ui/ui/icons.js';
import { esc } from '../ui/ui/helpers.js';
import { svcGuide } from '../core/services.js';
import { raceTutorial } from '../ui/tutorials.js';

const GROUNDS = [['mud', 'm', 'בוץ', 'בֹּץ'], ['sand', 's', 'חול', 'חוֹל'], ['slope', 'h', 'גבעה', 'גִּבְעָה'], ['narrow', 'n', 'גשר צר', 'גֶּשֶׁר צַר'], ['water', 'w', 'מים', 'מַיִם']];
// what ground a robot can cross (the engine's own rules, engine/world.js groundProblem and canEnter)
function canCross(st, g) {
  if (!st) return false;
  if (g === 'water') return !!st.floats;
  if (st.grip[g] < 0.5) return false;
  if (g === 'slope') return st.force >= 1;
  if (g === 'narrow') return st.precision >= 0.7;
  return true;
}

export function openRace(o) {
  const kids = !!o.kids, W = (f, k) => (kids ? k : f), T = (x) => (x ? (kids && x.k ? x.k : x.f) : '');
  const V = o.version || RACE_VERSIONS[0];
  const level = raceLevel(V);
  const mine = (() => { try { return myRobots().filter((r) => r && r.build && checkBuild(r.build).ok); } catch (e) { return []; } })();
  const bots = [...RACE_BOTS.map((id) => ({ id, name: T(PRESETS[id]), build: PRESETS[id].build, ready: true })), ...mine.map((r) => ({ id: r.id, name: r.name, build: r.build, ready: false }))];
  const st0 = (o.rec && o.rec.state) || {};
  const S = { bot: bots.some((b) => b.id === st0.bot) ? st0.bot : null, prog: st0.prog || null, best: st0.best || null, bestB: st0.bestB || null, runs: st0.runs || 0, won: !!st0.won, speed: 2, picks: st0.bot ? 1 : 0, blocks: 0, last: null };
  const el = document.createElement('div'); el.className = 'wr'; el.dir = 'rtl';
  o.host.appendChild(el);
  let tut = null, R3 = null, E = null, playing = false;
  const save = () => { try { o.save({ bot: S.bot, prog: E ? E.program() : S.prog, best: S.best, bestB: S.bestB, runs: S.runs, won: S.won, ver: V.id }); } catch (e) { } };
  const botOf = (id) => bots.find((b) => b.id === id) || null;

  el.innerHTML = `<header class="wr-top"><button type="button" class="wg-x" data-rx>${icon('close')}<span>${W('יציאה', 'יְצִיאָה')}</span></button>
      <div><h2>${esc(T(V.title))}</h2><p>${esc(W('תוכנית אחת ורובוט אחד צריכים לעבור את כל חמשת הקטעים.', 'רוֹבּוֹט אֶחָד וְתָכְנִית אַחַת לְכָל הַמַּסְלוּל.'))}</p></div>
      <div class="wr-recs"></div></header>
    <div class="wr-body"><aside class="wr-side"><div class="wr-bots" role="list"></div><div class="rl-ed wr-ed"></div></aside>
      <main class="wr-main"><div class="wr-view"><canvas class="wr-cv"></canvas><ol class="wr-segs">${V.segs.map((id, i) => `<li data-seg="${i}" style="--zc:${(ZONE_LOOK[SEGMENTS[id].zone] || {}).color || '#888'}">${esc(T(SEGMENTS[id].name))}</li>`).join('')}</ol>
        <div class="wr-msg" hidden></div></div>
        <div class="wr-bar"><button type="button" class="wr-go" data-rgo>${icon('play')} ${esc(T(RACE_UI.go))}</button>
          <button type="button" class="wr-sp" data-rsp>×${S.speed}</button><button type="button" class="wr-vw" data-rvw>${icon('binoc')} ${esc(T(RACE_UI.view))}</button></div></main></div>`;

  function recsHTML() {
    const b = S.best, bb = S.bestB;
    return `<span class="wr-rec"><small>${esc(T(RACE_UI.best))}</small></span><span class="wr-rec"><b>${b ? b.steps : '–'}</b><small>${esc(T(RACE_UI.steps))}</small></span><span class="wr-rec"><b>${bb ? bb.blocks : '–'}</b><small>${esc(T(RACE_UI.blocks))}</small></span>`;
  }
  function botsHTML() {
    return bots.map((b) => {
      const s = statsOf(b.build), sp = s ? Math.round(100 / s.stepsPerMove) : 0;
      return `<button type="button" class="wr-bot${S.bot === b.id ? ' on' : ''}${b.ready ? '' : ' mine'}" data-rbot="${b.id}" role="listitem">
        <span class="wr-bpic">${WK_ICONS[b.build.chassis] ? `<img src="${WK_ICONS[b.build.chassis]}" alt="">` : icon('robot')}${WK_ICONS[b.build.wheels] ? `<img class="wh" src="${WK_ICONS[b.build.wheels]}" alt="">` : ''}</span>
        <b>${esc(b.name)}${b.ready ? '' : ` <em>${esc(T(RACE_UI.mine))}</em>`}</b>
        <span class="wr-speed" title="${esc(T(RACE_UI.speed))}"><u style="width:${sp}%"></u></span>
        <span class="wr-gr">${GROUNDS.map(([g, c, f, k]) => `<i class="g-${c}${canCross(s, g) ? ' ok' : ''}" title="${esc(kids ? k : f)}">${esc((kids ? k : f).split(' ')[0])}</i>`).join('')}</span></button>`;
    }).join('');
  }
  function paintSide() { el.querySelector('.wr-bots').innerHTML = botsHTML(); el.querySelector('.wr-recs').innerHTML = recsHTML(); }
  paintSide();
  E = createEditor(el.querySelector('.wr-ed'), { lesson: { tools: ['robot'], blocks: RACE_BLOCKS }, kids, onChange: () => { S.blocks = countOf(); save(); hideMsg(); } });
  const countOf = () => { const p = E.program().robot || []; let n = 0; const walk = (L) => (L || []).forEach((q) => { n++; walk(q.body); }); walk(p); return n; };
  if (S.prog) { try { E.set(S.prog); S.blocks = countOf(); } catch (e) { } }
  try { R3 = createRace3D(el.querySelector('.wr-cv'), { level, segs: V.segs, kids }); } catch (e) { console.error(e); }
  if (R3 && S.bot) R3.setRobot(botOf(S.bot).build); else if (R3) R3.setRobot(bots[0].build);

  const msg = (html) => { const m = el.querySelector('.wr-msg'); m.innerHTML = html; m.hidden = false; };
  function hideMsg() { const m = el.querySelector('.wr-msg'); if (m) m.hidden = true; }
  function go() {
    if (playing) return;
    if (!S.bot) { el.querySelector('.wr-bots').classList.remove('nudge'); void el.offsetWidth; el.querySelector('.wr-bots').classList.add('nudge'); return; }
    const prog = E.program(); if (!(prog.robot || []).length) { msg(`<p>${esc(W('קודם כותבים תוכנית: לחצו על הבלוקים.', 'קֹדֶם כּוֹתְבִים תָּכְנִית.'))}</p>`); return; }
    const B = botOf(S.bot), r = runRace(V, B.build, prog);
    S.runs++; S.last = r; playing = true; hideMsg(); save();
    el.classList.add('running');
    const ghostRun = S.best && S.best.path;
    const onEnd = () => {
      playing = false; el.classList.remove('running');
      if (r.ok) {
        const recS = !S.best || r.steps < S.best.steps, recB = !S.bestB || r.blocks < S.bestB.blocks;
        if (recS) S.best = { steps: r.steps, blocks: r.blocks, bot: S.bot, path: r.path };
        if (recB) S.bestB = { blocks: r.blocks, steps: r.steps, bot: S.bot };
        S.won = true; save(); paintSide();
        msg(`<div class="wr-win"><h3>${esc(T(RACE_UI.won))}</h3><p><b>${r.steps}</b> ${esc(T(RACE_UI.steps))}${recS ? ` <em>${esc(T(RACE_UI.rec))}</em>` : ''} · <b>${r.blocks}</b> ${esc(T(RACE_UI.blocks))}${recB ? ` <em>${esc(T(RACE_UI.rec))}</em>` : ''}</p>
          <div><button type="button" data-rmore>${icon('undo')} ${esc(T(RACE_UI.more))}</button><button type="button" class="ok" data-rdone>${esc(T(RACE_UI.done))}</button></div></div>`);
        try { o.emit && o.emit('ui:click'); } catch (e) { }
      } else {
        const why = RACE_UI.why[r.why] || RACE_UI.why.any;
        msg(`<div class="wr-fail"><p>${esc(T(why))}</p><button type="button" data-rok>${W('לנסות שוב', 'לְנַסּוֹת שׁוּב')}</button></div>`);
      }
    };
    if (R3) { R3.setRobot(B.build); R3.play(r.path, ghostRun, { speed: S.speed, ok: r.ok, onEnd, ghostBuild: S.best ? (botOf(S.best.bot) || {}).build : null }); } else onEnd();
  }
  const score = () => { const b = S.best, bb = S.bestB; return b ? Math.max(100, 1000 - b.steps * 4 - (bb ? bb.blocks : b.blocks) * 6) : 0; };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.rx != null) { close(); return; }
    if (d.rbot) { if (playing) return; S.bot = d.rbot; S.picks++; save(); paintSide(); if (R3) { R3.reset(); R3.setRobot(botOf(S.bot).build); } hideMsg(); return; }
    if (d.rgo != null) { go(); return; }
    if (d.rsp != null) { S.speed = S.speed >= 4 ? 1 : S.speed * 2; b.textContent = '×' + S.speed; return; }
    if (d.rvw != null) { if (R3) R3.view(); return; }
    if (d.rok != null || d.rmore != null) { hideMsg(); if (R3 && !playing) { R3.reset(); } return; }
    if (d.rdone != null) { close(); o.done({ win: true, score: score() }); }
  });
  function close() { if (tut && tut.stop) tut.stop(); if (R3) R3.dispose(); el.remove(); }
  try { const g = svcGuide(); if (g && !S.won) tut = raceTutorial({ guide: g, ev: { state: () => ({ picks: S.picks, blocks: S.blocks, runs: S.runs }) } }); } catch (e) { }
  try {
    window.__race = {
      state: () => ({ bot: S.bot, blocks: S.blocks, runs: S.runs, won: S.won, best: S.best && { steps: S.best.steps, blocks: S.best.blocks }, bestB: S.bestB, last: S.last && { ok: S.last.ok, why: S.last.why, steps: S.last.steps }, playing, tut: (tut && tut.step) || null, ver: V.id }),
      pick: (id) => { const btn = el.querySelector(`[data-rbot="${id}"]`); if (btn) btn.click(); },
      // the planner's program for a robot (tests): set into the editor
      plan: (id) => { const B = botOf(id || S.bot); const p = B && planLevel(level, B.build); if (p) { E.set(p.prog); S.blocks = countOf(); save(); } return !!p; },
      go, segOfX, speed: (n) => { S.speed = n; },
    };
  } catch (e) { }
  return { close, el };
}
