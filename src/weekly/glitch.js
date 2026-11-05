// התקלה במעבדה (1.4.4 set 5): the event's screen. A painted island (the zone's own picture) with the creatures that
// landed on it, each in a round frame with a ring of strength that empties slowly; five gates round it, each a glowing
// portal with its island inside. Pick a creature, then a gate. The right gate: it flies home with sparks. A wrong gate:
// it bounces back and the gate says why it cannot live there. The landing island's own gate is "נשאר כאן".
// No death on the screen: a creature that runs out of strength falls asleep and רובו־דע carries it home (a miss).
//   openGlitch(o)   o: the weekly opener's object (src/ui/weekly-ui.js launch): host, version, kids, save, done
import { CREATURES, NEEDS, LACK, FEM, GLITCH_VERSIONS } from '../data/weekly/glitch.js';
import { NATURE_CARDS } from '../data/workshop/nature-cards.js';
import { CARD_ART } from '../data/card-art.js';
import { ISLAND_ART } from '../data/island-art.js';
import { KUBI_ART } from '../data/kubi-art.js';
import { ZONE_LOOK } from '../data/zones.js';
import { icon } from '../ui/ui/icons.js';
import { esc } from '../ui/ui/helpers.js';
import { svcGuide } from '../core/services.js';
import { glitchTutorial } from '../ui/tutorials.js';

const ZONES = ['amazon', 'grove', 'reef', 'desert', 'savanna'];
const ZIN = { amazon: ['ביער האמזונס', 'בְּיַעַר הָאֲמָזוֹנָס'], grove: ['בחורש', 'בַּחֹרֶשׁ'], reef: ['בשונית', 'בַּשּׁוּנִית'], desert: ['במדבר', 'בַּמִּדְבָּר'], savanna: ['בסוואנה', 'בַּסַּוַואנָה'] };
const ZTO = { amazon: 'ליער האמזונס', grove: 'לחורש', reef: 'לשונית', desert: 'למדבר', savanna: 'לסוואנה' };
const ZNAME = { amazon: ['יער האמזונס', 'יַעַר הָאֲמָזוֹנָס'], grove: ['החורש', 'הַחֹרֶשׁ'], reef: ['השונית', 'הַשּׁוּנִית'], desert: ['המדבר', 'הַמִּדְבָּר'], savanna: ['הסוואנה', 'הַסַּוַואנָה'] };

export function openGlitch(o) {
  const kids = !!o.kids, W = (f, k) => (kids ? k : f);
  const V = o.version || GLITCH_VERSIONS[0];
  const ids = kids ? V.list.slice(0, 4) : V.list.slice();
  const DRAIN = kids ? 150 : 95;   // seconds from full to asleep
  const cards = Object.fromEntries(ids.map((id) => [id, NATURE_CARDS.find((c) => c.id === id)]));
  const S = { sel: null, left: Object.fromEntries(ids.map((id, i) => [id, 1 + i * 0.04])), status: {}, tries: {}, mistakes: 0, picks: 0, t0: performance.now(), over: false };
  const el = document.createElement('div'); el.className = 'wg'; el.dir = 'rtl';
  o.host.appendChild(el);
  const nm = (id) => (kids ? cards[id].k : cards[id].n);
  const zn = (z) => ZNAME[z][kids ? 1 : 0];
  let raf = 0, last = performance.now(), msgT = 0, tut = null;

  function html() {
    const spots = [[50, 30], [26, 48], [74, 46], [38, 70], [64, 70], [50, 52], [18, 26]];
    return `<div class="wg-sky" aria-hidden="true"><i class="wg-spark s1"></i><i class="wg-spark s2"></i><i class="wg-spark s3"></i></div>
      <header class="wg-top"><button type="button" class="wg-x" data-gx>${icon('close')}<span>${W('יציאה', 'יְצִיאָה')}</span></button>
        <div><h2>${esc(W(V.title, V.ktitle))}</h2><p>${W('שלחו כל יצור בשער של הבית שלו', 'שִׁלְחוּ כָּל יְצוּר הַבַּיְתָה')}</p></div>
        <span class="wg-score"><b class="wg-home">0</b>/${ids.length}</span></header>
      <div class="wg-kubi"><img src="${KUBI_ART.frames.wave || KUBI_ART.frames.idle}" alt=""><p>${W('אופס! לחצתי על הכפתור הלא נכון!', 'אוּפְּס! לָחַצְתִּי עַל הַכַּפְתּוֹר הַלֹּא נָכוֹן!')}</p></div>
      <div class="wg-stage"><div class="wg-island"><img src="${ISLAND_ART['c_' + V.land] || ISLAND_ART[V.land]}" alt="" draggable="false">
          ${ids.map((id, i) => `<button type="button" class="wg-cr" data-gc="${id}" style="left:${spots[i][0]}%;top:${spots[i][1]}%;--d:${i * 0.12}s"><span class="wg-ring"><img src="${CARD_ART[id]}" alt=""></span><b>${esc(nm(id))}</b></button>`).join('')}</div>
        <div class="wg-gates">${ZONES.map((z) => `<button type="button" class="wg-gate${z === V.land ? ' here' : ''}" data-gg="${z}"><span class="wg-portal"><i></i><img src="${ISLAND_ART['c_' + z] || ''}" alt=""></span><b>${esc(z === V.land ? W('נשאר כאן', 'נִשְׁאָר כָּאן') : zn(z))}</b></button>`).join('')}</div></div>
      <div class="wg-msg" hidden></div><div class="wg-end" hidden></div>`;
  }
  el.innerHTML = html();
  const $ = (q) => el.querySelector(q);

  function paint() {
    for (const id of ids) {
      const b = el.querySelector(`[data-gc="${id}"]`); if (!b) continue;
      const st = S.status[id];
      b.style.setProperty('--s', String(Math.max(0, Math.min(1, S.left[id]))));
      b.classList.toggle('sel', S.sel === id); b.classList.toggle('weak', S.left[id] < 0.3 && !st);
    }
    el.classList.toggle('picking', !!S.sel);
    $('.wg-home').textContent = String(ids.filter((id) => S.status[id] === 'home').length);
  }
  function say(text, kind = 'info', at = null) {
    const m = $('.wg-msg'); m.hidden = false; m.className = 'wg-msg ' + kind; m.innerHTML = text;
    if (at) { const r = at.getBoundingClientRect(), R = el.getBoundingClientRect(); m.style.top = Math.max(60, r.top - R.top - 70) + 'px'; } else m.style.top = '';
    clearTimeout(msgT); msgT = setTimeout(() => { m.hidden = true; }, 4200);
  }
  function fly(b, gate, cls) {
    const r = b.getBoundingClientRect(), g = gate.getBoundingClientRect();
    b.style.setProperty('--fx', (g.left + g.width / 2 - (r.left + r.width / 2)) + 'px');
    b.style.setProperty('--fy', (g.top + g.height / 2 - (r.top + r.height / 2)) + 'px');
    b.classList.add(cls); b.disabled = true;
  }
  function send(id, z) {
    const c = cards[id], need = CREATURES[id], gate = el.querySelector(`[data-gg="${z}"]`), b = el.querySelector(`[data-gc="${id}"]`);
    S.tries[id] = (S.tries[id] || 0) + 1;
    if (z === c.z) {
      S.status[id] = 'home';
      fly(b, gate, z === V.land ? 'stay' : 'go'); gate.classList.add('flash'); setTimeout(() => gate.classList.remove('flash'), 700);
      say(`<b>${esc(nm(id))}</b> ${esc(W('בבית!', 'בַּבַּיִת!'))} ${esc(W('מה שצריך:', 'מָה שֶׁצָּרִיךְ:'))} ${esc(NEEDS[need][kids ? 'k' : 'f'])}.`, 'ok', null);
      try { o.emit && o.emit('ui:click'); } catch (e) { }
    } else {
      S.mistakes++;
      const L = LACK[need][z] || ['', ''];
      b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
      gate.classList.add('no'); setTimeout(() => gate.classList.remove('no'), 600);
      say(`<b>${esc(nm(id))}</b> · ${esc(W('מה שצריך:', 'מָה שֶׁצָּרִיךְ:'))} ${esc(NEEDS[need][kids ? 'k' : 'f'])}. ${esc(ZIN[z][kids ? 1 : 0])}: ${esc(L[kids ? 1 : 0])}.`, 'no', gate);
    }
    S.sel = null; paint(); check();
  }
  function check() {
    if (S.over) return;
    if (ids.every((id) => S.status[id])) {
      S.over = true; cancelAnimationFrame(raf);
      const home = ids.filter((id) => S.status[id] === 'home').length, first = ids.filter((id) => S.tries[id] === 1 && S.status[id] === 'home').length;
      const win = home === ids.length;
      const score = Math.max(0, first * 10 + home * 5 - S.mistakes * 2);
      const E = $('.wg-end'); E.hidden = false;
      E.innerHTML = `<div class="wg-endin ${win ? 'win' : ''}"><h3>${win ? W('כולם בבית!', 'כֻּלָּם בַּבַּיִת!') : W('כמעט!', 'כִּמְעַט!')}</h3>
        <p>${W(`${first} מתוך ${ids.length} הגיעו הביתה בניסיון הראשון.`, `${first} מִתּוֹךְ ${ids.length} בַּנִּסָּיוֹן הָרִאשׁוֹן.`)}${!win ? ' ' + W('מי שנרדם, רובו־דע החזיר הביתה. אפשר לנסות שוב השבוע.', 'רוֹבּוֹ־דַּע הֶחֱזִיר אֶת מִי שֶׁנִּרְדַּם.') : ''}</p>
        <div class="wg-endrow">${ids.map((id) => `<span class="${S.status[id]}"><img src="${CARD_ART[id]}" alt=""></span>`).join('')}</div>
        <button type="button" data-gdone>${W('סיום', 'סִיּוּם')}</button></div>`;
      try { o.save({ ver: V.id, first, home, mistakes: S.mistakes }); } catch (e) { }
      E.dataset.win = win ? '1' : ''; E.dataset.score = String(score);
    }
  }
  function frame(now) {
    if (S.over || !el.isConnected) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.2, (now - last) / 1000); last = now;
    if (tut && tut.step) return;   // the clock waits while קוּבִּי explains
    for (const id of ids) {
      if (S.status[id]) continue;
      S.left[id] -= dt / DRAIN;
      if (S.left[id] <= 0) {   // asleep: רובו־דע carries it home (gently)
        S.status[id] = 'asleep'; const b = el.querySelector(`[data-gc="${id}"]`); b.classList.add('asleep'); b.disabled = true;
        const f = FEM.has(id);
        say(W(`${nm(id)} ${f ? 'נרדמה' : 'נרדם'} מעייפות. רובו־דע ${f ? 'לוקח אותה' : 'לוקח אותו'} הביתה, ${ZTO[cards[id].z]}.`, `${nm(id)} ${f ? 'נִרְדְּמָה' : 'נִרְדַּם'}. רוֹבּוֹ־דַּע ${f ? 'לוֹקֵחַ אוֹתָהּ' : 'לוֹקֵחַ אוֹתוֹ'} הַבַּיְתָה.`), 'info');
        if (S.sel === id) S.sel = null;
        check();
      }
    }
    paint();
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.gx != null) { close(); return; }
    if (d.gdone != null) { const E = $('.wg-end'); close(); o.done({ win: E.dataset.win === '1', score: +E.dataset.score || 0 }); return; }
    if (d.gc && !S.status[d.gc]) { S.sel = S.sel === d.gc ? null : d.gc; if (S.sel) S.picks++; paint(); return; }
    if (d.gg && S.sel) { send(S.sel, d.gg); return; }
    if (d.gg && !S.sel) { say(W('קודם בוחרים יצור, ואז שער.', 'קֹדֶם בּוֹחֲרִים יְצוּר.'), 'info', b); }
  });
  function close() { S.over = true; cancelAnimationFrame(raf); if (tut && tut.stop) tut.stop(); el.remove(); }
  paint(); raf = requestAnimationFrame(frame);
  setTimeout(() => { const k = $('.wg-kubi'); if (k) k.classList.add('gone'); }, 3200);
  try { const g = svcGuide(); if (g) tut = glitchTutorial({ guide: g, ev: { state: () => ({ sel: S.sel, picks: S.picks, sent: Object.keys(S.status).length }) } }); } catch (e) { }
  try { window.__glitch = { state: () => ({ ...S, ids }), send, pick: (id) => { S.sel = id; paint(); }, drain: (id, v) => { S.left[id] = v; } }; } catch (e) { }
  return { close, el };
}
