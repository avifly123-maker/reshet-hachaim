// מחזיקים את הסביבה – a turn: placing a card (gold threads, the rare bonus, the owl's words), using a tool, skipping, the
// end of a turn, an event (flip, resolve: ready / keystone / a card wilts) and going on; then hints (bestMove), the
// hint button and auto play (autoStep, used by the debug hook).
// Gives K: place, canUse, useTool, skip, resolve, cont, bestMove, hintText, showHint, autoStep.
// Takes from K: ctx, root, legal, totals, C, rareGain, $, esc, Y, reef, keystone, isKey, keyCharged, evName, needOf,
//   draw, turnsToEvent, kids, tipOf, later, check, weakest, canopyCard, slotRow, healthy, ROWN.
// Functions of later parts through late(): msg, say, render, thresholds, finish.
// Shared state it reads or changes: K.S, K.sel, K.quiet.
import { genderOf, gw, prefName } from '../../../data/common.js';
import { dn, HAND, late, mid, moreLife, rnd } from './data.js';
import { EV } from './events.js';
import { I } from './icons.js';

export function createTurn(K) {
  const { ctx, root, legal, totals, C, rareGain, $, esc, Y, reef, keystone, isKey, keyCharged, evName, needOf, draw,
    turnsToEvent, kids, tipOf, later, check, weakest, canopyCard, slotRow, healthy, ROWN } = K;
  const msg = late(K, 'msg'), say = late(K, 'say'), render = late(K, 'render'),
    thresholds = late(K, 'thresholds'), finish = late(K, 'finish');   // made by a later part

  /* ── actions */
  function place(hi, k) {
    if (!K.S || K.S.phase !== 'play') return false;
    const ref = K.S.hand[hi]; if (!ref) return false;
    const lg = legal(ref); if (!lg.slots.includes(k)) return false;
    const before = new Set(totals().th.map((t) => t.key));
    const old = K.S.board[k];
    if (old) K.S.discard.push(old.ref);
    if (old && !old.wilted) K.S.swaps = (K.S.swaps || 0) + 1;
    K.S.board[k] = { ref, wilted: false, fresh: true };
    K.S.hand.splice(hi, 1); K.sel = null;
    const T = totals();
    const fresh = T.th.filter((t) => !before.has(t.key));
    const c = C(ref);
    const rb = rareGain(ref, fresh);
    if (C(ref).rarity === 'rare') K.S.rareDone.add(ref.uid);
    fresh.rb = rb; K.S.bonus += rb; K.S.rareBonus += rb;
    if (fresh.length) {
      ctx.sfx('link');
      const gain = fresh.reduce((s, t) => s + t.w, 0) + rb;
      msg('ok', `${I.thread}<span>${esc(fresh.slice(0, 2).map((t) => t.e.text).join(' '))} <b>${moreLife(gain)}</b>${rb ? ' <span class="kf-rbm">(כולל נקודה נוספת מהקלף הנדיר)</span>' : ''}</span>`);
      const o = fresh[0]; const other = C(K.S.board[o.i === k ? o.j : o.i].ref);
      say(`יפה! <b>${esc(dn(c))}</b> ו<b>${esc(dn(other))}</b> ${genderOf(c.sp.id)[0] === 'f' && genderOf(other.sp.id)[0] === 'f' ? 'קשורות' : 'קשורים'} – ${Y('היער מתחזק', 'השונית מתחזקת')}.`);
    } else {
      ctx.sfx('click');
      msg('tip', `${I.life}<span>${esc(dn(c))} ${c.sp.animal ? gw(c.sp.id, 'הגיע', 'הגיעה', 'הגיעו', 'הגיעו') + Y(' ליער', ' לשונית') : reef() ? gw(c.sp.id, 'גדל', 'גדלה', 'גדלים', 'גדלות') + ' בשונית' : gw(c.sp.id, 'נשתל', 'נשתלה', 'נשתלו', 'נשתלו') + ' ביער'}. ${old && !old.wilted ? 'הקלף הקודם חזר לחפיסה.' : ''}</span>`);
      say(old && old.wilted ? 'הקלף הנובל פינה מקום לחדש. כל הכבוד!' : `גם זה טוב. נסו למצוא קלף שקשור למי שכבר ${Y('ביער', 'בשונית')} – כך נמתח חוט זהב.`);
    }
    // first time a keystone comes to the forest: the owl tells what it can do
    const intro = isKey(ref) && !K.S.keyIntro.has(ref.uid);
    if (intro) K.S.keyIntro.add(ref.uid);
    endTurn(fresh);
    if (intro && K.S.phase === 'play' && keyCharged(ref)) say(`<small>${I.key} מין מפתח!</small><b>${esc(dn(c))}</b> ${gw(c.sp.id, 'הוא מין מפתח: הרבה יצורים צריכים אותו', 'היא מין מפתח: הרבה יצורים צריכים אותה', 'הם מין מפתח: הרבה יצורים צריכים אותם', 'הן מין מפתח: הרבה יצורים צריכים אותן')}. ${Y('אם היער לא יהיה מוכן', 'אם השונית לא תהיה מוכנה')} לאירוע – ${gw(c.sp.id, 'הוא ישמור', 'היא תשמור', 'הם ישמרו', 'הן ישמרו')} ${Y('עליו', 'עליה')}, פעם אחת.`);
    return true;
  }
  function canUse(ref) {
    const c = C(ref); if (!c || c.type !== 'tool') return { ok: false };
    const t = c.tool.id;
    const wilt = (animal) => K.S.board.some((b) => b && b.wilted && !!C(b.ref).sp.animal === animal);
    if ((t === 'seeddrone' || t === 'nursery') && !wilt(false)) return { ok: false, why: 'אין עכשיו צמח נובל' };
    if (t === 'rescue' && !wilt(true)) return { ok: false, why: 'אין עכשיו בעל חיים נובל' };
    if ((t === 'weather' || t === 'camera' || t === 'sensor' || t === 'uwcam') && K.S.evIdx >= K.S.events.length) return { ok: false, why: 'אין עוד אירועים' };
    if (t === 'nestbox' && K.S.nest) return { ok: false, why: 'תיבת קינון כבר פועלת' };
    if (t === 'insecthotel' && K.S.insect) return { ok: false, why: 'מלון חרקים כבר פועל' };
    if (t === 'reefball' && K.S.fish) return { ok: false, why: 'שונית מלאכותית כבר מונחת' };
    return { ok: true };
  }
  function useTool(hi) {
    if (!K.S || K.S.phase !== 'play') return false;
    const ref = K.S.hand[hi]; const c = ref && C(ref); if (!c || c.type !== 'tool') return false;
    const u = canUse(ref); if (!u.ok) { msg('no', `${I.bulb}<span>${esc(u.why || 'אי אפשר עכשיו')}</span>`); return false; }
    K.S.hand.splice(hi, 1); K.S.used.push(ref); K.sel = null;
    const t = c.tool.id; let text = '';
    const revive = (animal) => {
      let best = -1, bs = -1;
      K.S.board.forEach((b, k) => { if (b && b.wilted && !!C(b.ref).sp.animal === animal) { const s = C(b.ref).stats.links; if (s > bs) { bs = s; best = k; } } });
      if (best >= 0) { K.S.board[best].wilted = false; K.S.board[best].fresh = true; return dn(C(K.S.board[best].ref)); }
      return '';
    };
    if (t === 'drip') { K.S.waterBoost += 4; text = 'קו הטפטוף נותן מים ישר לשורשים: עוד 4 מים לאירוע הבא.'; }
    else if (t === 'fognet') { K.S.waterBoost += 2; K.S.revealed.add(K.S.evIdx); const ev = K.S.events[K.S.evIdx]; text = `רשת הערפל אספה מים בבוקר: עוד 2 מים. ${ev ? 'מה בדרך: ' + evName(ev) + '.' : ''}`; }
    else if (t === 'sandfence') { K.S.watch = true; text = 'גדר החול במקום: היא עוצרת חול ושומרת על השיחים מעדר שרועה יותר מדי.'; }
    else if (t === 'watergen') { K.S.waterBoost += 4; text = 'המחולל אוסף מים מהאוויר: עוד 4 מים לאירוע הבא.'; }
    else if (t === 'weather') { K.S.revealed.add(K.S.evIdx); const ev = K.S.events[K.S.evIdx]; text = `תחנת מזג האוויר מזהירה: ${evName(ev)}! ${EV[ev.id].good ? '' : 'צריך: ' + needOf(ev)}`; }
    else if (t === 'sensor') { K.S.revealed.add(K.S.evIdx); const ev = K.S.events[K.S.evIdx]; text = `מצוף החיישנים מזהיר: ${evName(ev)}! ${EV[ev.id].good ? '' : 'צריך: ' + needOf(ev)}`; }
    else if (t === 'uwcam') { for (let i = K.S.evIdx; i < Math.min(K.S.events.length, K.S.evIdx + 3); i++) K.S.revealed.add(i); K.S.watch = true; text = 'המצלמה התת־ימית מגלה מה מחכה לשונית, ושומרת עליה.'; }
    else if (t === 'rov') { draw(2); K.S.watch = true; text = 'הרובוט הצולל שוחה לאורך השונית: שלפתם 2 קלפים, והוא שומר עליה.'; }
    else if (t === 'buoy') { K.S.watch = true; text = 'מצוף העגינה במקום: סירות ייקשרו אליו ולא יטילו עוגן על האלמוגים.'; }
    else if (t === 'nursery') { text = `משתלת האלמוגים החזירה לחיים את ${revive(false)}!`; }
    else if (t === 'reefball') { K.S.fish = true; text = 'שונית מלאכותית הונחה על החול: מעכשיו חוטים של דגים שווים פי 2.'; }
    else if (t === 'camera') { for (let i = K.S.evIdx; i < Math.min(K.S.events.length, K.S.evIdx + 3); i++) K.S.revealed.add(i); K.S.watch = true; text = 'המצלמה מגלה מה מחכה ליער, ושומרת עליו.'; }
    else if (t === 'drone') { draw(2); K.S.watch = true; text = 'הרחפן טס מעל היער: שלפתם 2 קלפים, והוא שומר על היער.'; }
    else if (t === 'listener') { K.S.watch = true; text = 'מאזין היער מקשיב. אם יבואו לכרות או לסלול כביש – הוא יזעיק עזרה.'; }
    else if (t === 'seeddrone') { text = `רחפן הזריעה החזיר לחיים את ${revive(false)}!`; }
    else if (t === 'rescue') { text = `רובוט ההצלה החזיר לחיים את ${revive(true)}!`; }
    else if (t === 'nestbox') { K.S.nest = true; text = 'תיבת קינון נתלתה: מעכשיו חוטים של ציפורים שווים פי 2.'; }
    else if (t === 'insecthotel') { K.S.insect = true; text = 'מלון חרקים נפתח: מעכשיו חוטים של חרקים שווים פי 2.'; }
    ctx.sfx('discover');
    msg('ok', `${I.check}<span>${esc(text)}</span>`);
    say(`כלי הוא עזרה מהירה – אחריו עדיין אפשר לשים קלף ${Y('ביער', 'בשונית')}.`);
    render();
    return true;
  }
  function skip() {
    if (!K.S || K.S.phase !== 'play') return;
    K.sel = null; ctx.sfx('click');
    // put one card back so the hand refreshes
    if (K.S.hand.length) K.S.discard.push(K.S.hand.shift());
    msg('tip', `${I.skip}<span>דילגתם על התור: קלף אחד חזר לחפיסה וקיבלתם קלף אחר.</span>`);
    endTurn([]);
  }
  function endTurn(fresh) {
    K.S.turn++;
    if (K.S.turn % 2 === 0 && K.S.evIdx < K.S.events.length) startEvent(fresh);
    else { draw(HAND - K.S.hand.length); preEventTip(); render(fresh); }
  }
  function preEventTip() {
    if (K.S.evIdx >= K.S.events.length) return;
    const ev = K.S.events[K.S.evIdx];
    if (turnsToEvent() === 1 || kids) {
      const known = K.S.revealed.has(K.S.evIdx);
      if (turnsToEvent() === 1) say(`<small>${known ? 'אני יודע מה בא:' : Y('הרוח לוחשת לי...', 'הגלים לוחשים לי...')}</small>${esc(tipOf(ev.id))}`);
    }
    if (kids) { const h = bestMove(); if (h && turnsToEvent() !== 1) say(hintText(h)); }
    const left = K.S.events.length - K.S.evIdx, t1 = thresholds()[0], life = totals().life;
    if (left <= 2 && life < t1) say(`<small>שימו לב!</small>${Y('ליער', 'לשונית')} יש עכשיו ${life} חִיּוּת. כדי ${Y('שיחזיק', 'שתחזיק')} מעמד צריך לפחות <b>${t1}</b> בסוף – חברו חוטי זהב!`);
  }
  function startEvent(fresh) {
    K.S.phase = 'event';
    const ev = K.S.events[K.S.evIdx];
    K.S.cur = { ev, shown: false, res: null };
    render(fresh);
    // flip, then resolve
    later(() => {
      if (!K.S || !K.S.cur || K.S.cur.ev !== ev) return;
      const f = $('.kf-evtop .wl-flip'); if (f) f.classList.add('is-up');
      ctx.sfx('select');
      later(() => resolve(), 850);
    }, 450);
  }
  function resolve() {
    if (!K.S || K.S.phase !== 'event' || !K.S.cur || K.S.cur.res) return;
    const ev = K.S.cur.ev; const D = EV[ev.id];
    let res;
    if (D.good) {
      if (ev.id === 'rain') { K.S.bonus += 2; res = { ok: true, good: true, text: Y('היער שמח בגשם', 'השונית שמחה במים הצלולים') + ': ' + moreLife(2) + '!' }; }
      else { draw(2); res = { ok: true, good: true, text: Y('פריחה!', 'לילה של הטלה!') + ' שלפתם 2 קלפים.' }; }
    } else {
      const c = check(ev);
      if (c.ok) {
        K.S.bonus += 1;
        if (c.guard) K.S.watch = false;
        res = { ok: true, have: c.have, text: (c.guard ? 'כלי השמירה הזעיק עזרה בזמן. ' : '') + Y('היער החזיק מעמד!', 'השונית החזיקה מעמד!') + ' ' + moreLife(1) + '.' };
      } else if (keystone() >= 0) {
        // a keystone species holds the forest together: nothing wilts, no −1 (once per keystone card)
        const k = keystone(); const b = K.S.board[k]; const kc = C(b.ref);
        K.S.keyUsed.add(b.ref.uid); K.S.keySaves++; b.fx = 'key';
        const head = `${dn(kc)} ${gw(kc.sp.id, 'הוא', 'היא', 'הם', 'הן')} מין מפתח – ${gw(kc.sp.id, 'הוא שמר', 'היא שמרה', 'הם שמרו', 'הן שמרו')} על ${Y('היער', 'השונית')}!`;
        res = { ok: true, key: k, have: c.have, head, text: `${dn(kc)} ${gw(kc.sp.id, 'שמר', 'שמרה', 'שמרו', 'שמרו')} על ${Y('היער', 'השונית')}.` };
      } else {
        const k = ev.id === 'treefall' ? (weakest([0]) >= 0 ? weakest([0]) : weakest()) : weakest();
        K.S.bonus -= 1;
        let nm = '';
        if (k >= 0) { K.S.board[k].wilted = true; const wc = C(K.S.board[k].ref); nm = `${dn(wc)} ${gw(wc.sp.id, 'נבל', 'נבלה', 'נבלו', 'נבלו')} קצת`; }
        res = { ok: false, have: c.have, wilted: k, text: nm ? `${nm}. \u2066−1\u2069 חִיּוּת` : Y('היער עוד קטן', 'השונית עוד קטנה') + ' – \u2066−1\u2069 חִיּוּת' };
      }
    }
    K.S.waterBoost = 0;
    K.S.cur.res = res;
    K.S.results.push(res.good ? 'gd' : res.key != null ? 'key' : res.ok ? 'ok' : 'no');
    ctx.sfx(res.ok ? 'mission' : 'click');
    if (res.key != null) say(`<small>${I.key} מין מפתח</small>הרבה יצורים ${Y('ביער', 'בשונית')} צריכים אותו – לכן הוא מחזיק את כל ${Y('היער', 'השונית')}.`);
    else if (res.ok) say(res.good ? 'איזו מתנה מהטבע!' : Y('<b>היער החזיק מעמד!</b> כל הכבוד ששמרתם עליו.', '<b>השונית החזיקה מעמד!</b> כל הכבוד ששמרתם עליה.'));
    else say(res.wilted >= 0 ? `לא נורא! קלף נובל אפשר להחזיר לחיים עם <b>${Y('רחפן זריעה', 'משתלת אלמוגים')}</b> או <b>רובוט הצלה</b> – או לשים עליו קלף חדש.` : 'לא נורא, ממשיכים לבנות.');
    render();
    if (res.key != null && !K.quiet) {
      ctx.toast(`${I.key}<span>${esc(res.head)}</span>`);
      later(() => ctx.sfx('discover'), 380);
      const sl = root.querySelector(`.kf-slot[data-s="${res.key}"]`), bd = $('.kf-board');
      if (sl) ctx.confetti(sl, 26, ['#f6cf72', '#e79aab', '#b9a8e0', '#fff1c4']);
      if (sl && bd) { // "מין מפתח!" rises from the card
        const r1 = sl.getBoundingClientRect(), r0 = bd.getBoundingClientRect();
        const f = document.createElement('div'); f.className = 'kf-float kf-kfloat'; f.innerHTML = `${I.key}<span>מין מפתח!</span>`;
        f.style.left = (r1.left - r0.left + r1.width / 2) + 'px'; f.style.top = (r1.top - r0.top + r1.height * 0.3) + 'px';
        bd.appendChild(f); later(() => f.remove(), 2000);
      }
    } else if (res.ok && !res.good && !K.quiet) { const b = $('.kf-board'); if (b) ctx.confetti(b, 14); }
  }
  function cont() {
    if (!K.S || K.S.phase !== 'event' || !K.S.cur || !K.S.cur.res) return false;
    K.S.evIdx++; K.S.cur = null;
    if (K.S.evIdx >= K.S.events.length) { finish(); return true; }
    // the forest can also give out in the middle: every card wilted (or still nothing planted after 2 events)
    const any = K.S.board.some(Boolean), alive2 = K.S.board.some((b) => b && !b.wilted);
    if (!alive2 && (any || K.S.evIdx >= 2)) { K.S.lost = 'wilted'; finish(); return true; }
    K.S.phase = 'play';
    draw(HAND - K.S.hand.length);
    preEventTip();
    render();
    return true;
  }

  /* ── hints / auto play */
  function bestMove() {
    if (!K.S || K.S.phase !== 'play') return null;
    const nextEv = K.S.events[K.S.evIdx];
    const kind = nextEv && !EV[nextEv.id].good ? EV[nextEv.id].kind : null;
    const base = totals();
    let best = null;
    K.S.hand.forEach((ref, hi) => {
      const c = C(ref); if (c.type !== 'species') return;
      const lg = legal(ref);
      for (const k of lg.slots) {
        const nb = K.S.board.slice(); nb[k] = { ref, wilted: false };
        const T = totals(nb);
        const rb = rareGain(ref, T.th.filter((t) => t.i === k || t.j === k));
        let sc = (T.tw - base.tw + rb) * 3 + (c.stats.light + mid(c) + c.stats.links) * 0.15;
        if (kind === 'water' || kind === 'shelter') sc += mid(c) * 0.5;
        if (kind === 'light') sc += c.stats.light * 0.5;
        if (kind === 'canopy' && canopyCard(c) && slotRow(k) === 0 && !healthy(k)) sc += 3;
        if (kind === 'floor' && !c.sp.animal && slotRow(k) === 2 && !healthy(k)) sc += 3;
        if (kind === 'mid' && slotRow(k) === 1 && !healthy(k)) sc += 2.5;
        if (K.S.board[k] && !K.S.board[k].wilted) sc -= 1.5;
        if (K.S.board[k] && K.S.board[k].wilted) sc += 0.8;
        const newT = T.th.filter((t) => (t.i === k || t.j === k));
        if (!best || sc > best.sc) best = { hi, k, sc, ref, link: newT[0] };
      }
    });
    return best;
  }
  function hintText(h) {
    const c = C(h.ref);
    const r = ROWN()[slotRow(h.k)];
    if (h.link) { const o = C(K.S.board[h.link.i === h.k ? h.link.j : h.link.i].ref); return `נסו לשים את <b>${esc(dn(c))}</b> ב${esc(r)} – ${gw(c.sp.id, 'הוא קשור', 'היא קשורה', 'הם קשורים', 'הן קשורות')} <b>${esc(prefName('ל', o.sp.id, o.name))}</b>!`; }
    return `נסו לשים את <b>${esc(dn(c))}</b> ב${esc(r)}.`;
  }
  function showHint() {
    const h = bestMove(); if (!h) { say('אין כרגע קלף לשים – אפשר להפעיל כלי או לדלג.'); return; }
    root.querySelectorAll('.hint').forEach((e) => e.classList.remove('hint'));
    const hc = root.querySelector(`.kf-hc[data-i="${h.hi}"]`), sl = root.querySelector(`.kf-slot[data-s="${h.k}"]`);
    if (hc) hc.classList.add('hint'); if (sl) sl.classList.add('hint');
    ctx.sfx('select'); say(hintText(h));
    later(() => { root.querySelectorAll('.hint').forEach((e) => e.classList.remove('hint')); }, 3200);
  }
  function autoStep(mode) {
    if (!K.S) return false;
    if (mode === 'random' && K.S.phase === 'play') {
      const opts = [];
      K.S.hand.forEach((r, i) => { const c = C(r); if (c.type === 'tool') { if (canUse(r).ok && Math.random() < 0.5) opts.push(() => useTool(i)); } else legal(r).slots.forEach((k) => opts.push(() => place(i, k))); });
      if (!opts.length) { skip(); return true; }
      return opts[rnd(opts.length)]();
    }
    if (K.S.phase === 'event') { if (!K.S.cur.res) resolve(); return cont(); }
    if (K.S.phase !== 'play') return false;
    const nextEv = K.S.events[K.S.evIdx];
    // useful tools first
    for (let i = 0; i < K.S.hand.length; i++) {
      const c = C(K.S.hand[i]); if (c.type !== 'tool' || !canUse(K.S.hand[i]).ok) continue;
      const t = c.tool.id;
      const soon = turnsToEvent() === 1 && nextEv;
      if ((t === 'watergen' || t === 'drip') && !(soon && nextEv.id === 'drought')) continue;
      if ((t === 'listener' || t === 'buoy' || t === 'sandfence') && K.S.watch) continue;
      useTool(i); return true;
    }
    const m = bestMove();
    if (m) return place(m.hi, m.k);
    skip(); return true;
  }

  return { place, canUse, useTool, skip, resolve, cont, bestMove, hintText, showHint, autoStep };
}
