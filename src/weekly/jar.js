// הצנצנת הסגורה (1.4.4 set 6): the event's screen. A big glass jar on a window sill; a shelf of creatures beside it,
// each with its painting and what it does in the circle. The child puts in two to six, closes the lid (a wax seal),
// and from then on the jar lives by the days that pass: one jar-day a day, and on Thursday everything is shown
// (Avi, 4.11: by the days, with a cap). The jar's water clears or clouds, the plants grow or fade, bubbles of air rise.
// A diary keeps a line a day. A broken jar can be emptied and closed again (the days count from the new seal).
//   openJar(o)   o: the weekly opener's object (src/ui/weekly-ui.js launch)
import { JAR_VERSIONS, JAR_MIN, ROLES, WHY } from '../data/weekly/jar.js';
import { simulate, DAYS } from './jar-model.js';
import { current } from '../core/weekly.js';
import { NATURE_CARDS } from '../data/workshop/nature-cards.js';
import { CARD_ART } from '../data/card-art.js';
import { icon } from '../ui/ui/icons.js';
import { WS_ART } from '../data/workshop-art.js';
import { esc } from '../ui/ui/helpers.js';
import { svcGuide } from '../core/services.js';
import { jarTutorial } from '../ui/tutorials.js';

const DAYN = [['ראשון', 'רִאשׁוֹן'], ['שני', 'שֵׁנִי'], ['שלישי', 'שְׁלִישִׁי'], ['רביעי', 'רְבִיעִי'], ['חמישי', 'חֲמִישִׁי']];
const NOTE = {
  good: [['הכול שקט ורגוע בצנצנת.', 'הַכֹּל שָׁקֵט.'], ['בועות אוויר קטנות עולות מהצמחים.', 'בּוּעוֹת קְטַנּוֹת עוֹלוֹת.'], ['הצמחים ירוקים, וכולם אוכלים.', 'הַצְּמָחִים יְרֻקִּים.']],
  murky: [['המים עכורים קצת. יש פסולת.', 'קְצָת עָכוּר.'], ['משהו מצטבר בתחתית.', 'מַשֶּׁהוּ מִצְטַבֵּר לְמַטָּה.']],
  lowair: [['האוויר נהיה כבד.', 'הָאֲוִיר כָּבֵד.']],
  lush: [['הצמחים גדלים מהר, אולי מהר מדי.', 'הַצְּמָחִים גְּדֵלִים מַהֵר.']],
  sparse: [['נשארו מעט צמחים.', 'נִשְׁאֲרוּ מְעַט צְמָחִים.']],
};

export function openJar(o) {
  const kids = !!o.kids, W = (f, k) => (kids ? k : f);
  const V = o.version || JAR_VERSIONS[0];
  const ids = Object.keys(V.pool), min = kids ? JAR_MIN.kids : JAR_MIN.full;
  const card = (id) => NATURE_CARDS.find((c) => c.id === id) || { n: id, k: id };
  const nm = (id) => (kids ? card(id).k : card(id).n);
  const today = () => { try { return Math.min(4, Math.max(0, current().day)); } catch (e) { return 0; } };
  const st0 = (o.rec && o.rec.state) || {};
  const S = { pick: Array.isArray(st0.pick) ? st0.pick.filter((x) => V.pool[x]) : [], sealed: st0.sealed != null ? st0.sealed : null, tries: st0.tries || 0, done: !!st0.done };
  const el = document.createElement('div'); el.className = 'wj wj-' + V.kind; el.dir = 'rtl';
  o.host.appendChild(el);
  let tut = null;
  const save = () => { try { o.save({ pick: S.pick, sealed: S.sealed, tries: S.tries, done: S.done, ver: V.id }); } catch (e) { } };
  // how many jar-days can be seen now: one a day from the seal, all of them on Thursday (the cap)
  const shown = () => (S.sealed == null ? 0 : (today() >= 4 ? DAYS : Math.max(0, Math.min(DAYS, today() - S.sealed + 1))));
  const sim = () => simulate(S.pick, V);

  // the jar is a Blender render (tools/blender/workshop_art.py: jar_<kind>_<0 open | 1 shut>); the water's colour, the
  // bubbles of air and the creatures sit over its inside (points from the render: x 30.6–70%, y 39.4–66.3% of 420x520)
  function jarRig(r, k) {
    const d = r && k ? r.days[Math.min(k, r.days.length) - 1] : null;
    const broke = r && !r.ok && k > r.day;
    const murk = d ? Math.min(1, d.M / 7) : 0, air = d ? Math.min(1, d.O / 10) : 0.6, lush = d ? Math.min(1, d.P / 9) : 0.4;
    const tint = broke ? 'rgba(90,70,40,.45)' : `rgba(${Math.round(120 + murk * 40)},${Math.round(110 + lush * 50)},${Math.round(60 + (1 - murk) * 40)},${(murk * 0.5 + (lush > 0.9 ? 0.15 : 0)).toFixed(2)})`;
    const nb = Math.round(1 + air * 7);
    return `<span class="wj-rig${broke ? ' broke' : ''}"><img class="wj-img" src="${WS_ART.jar[V.kind + '_' + (S.sealed != null ? 1 : 0)] || ''}" alt="" draggable="false">
      <span class="wj-tint" style="background:${tint}"></span>
      <span class="wj-bubbles">${Array.from({ length: nb }, (_, i) => `<i style="left:${10 + (i * 37) % 80}%;animation-delay:${(-i * 0.55).toFixed(2)}s;--s:${0.6 + (i % 3) * 0.25}"></i>`).join('')}</span>
      <span class="wj-inside">${insideHTML(r, k)}</span>${broke ? '<span class="wj-crack"></span>' : ''}</span>`;
  }
  function insideHTML(r, k) {
    const d = r && k ? r.days[Math.min(k, r.days.length) - 1] : null;
    const broke = r && !r.ok && k > r.day;
    const spots = [[24, 70], [74, 72], [50, 52], [20, 34], [78, 36], [50, 18]];
    return S.pick.map((id, i) => { const role = V.pool[id].role; const fade = broke || (d && ((role === 'prod' && d.P < 1) || (role !== 'prod' && d.O < 2.5))) ? ' fade' : '';
      return `<span class="wj-in r-${role}${fade}" style="left:${spots[i][0]}%;top:${spots[i][1]}%;--d:${i * 0.4}s"><img src="${CARD_ART[id] || ''}" alt=""></span>`; }).join('');
  }
  function paint() {
    const r = S.pick.length ? sim() : null, k = shown();
    const end = S.sealed != null && k >= DAYS, broke = r && !r.ok && k > r.day;
    const diary = [];
    if (r && S.sealed != null) for (let i = 0; i < Math.min(k, DAYS); i++) {
      const d = r.days[i];   // jar-days are counted from the seal (a late seal shows several of them on Thursday)
      let key = 'good'; if (!d) break;
      if (d.M > 4) key = 'murky'; else if (d.O < 3) key = 'lowair'; else if (d.P > 9) key = 'lush'; else if (d.P < 1.2) key = 'sparse';
      const L = NOTE[key][(i + S.tries) % NOTE[key].length];
      diary.push(`<li class="n-${key}"><b>${esc(W('יום ' + (i + 1), 'יוֹם ' + (i + 1)))}:</b> ${esc(L[kids ? 1 : 0])}</li>`);
      if (!r.ok && i >= r.day) { diary.push(`<li class="n-broke"><b>${esc(W('הצנצנת נשברה', 'הַצִּנְצֶנֶת נִשְׁבְּרָה'))}</b></li>`); break; }
    }
    const t = today();
    el.innerHTML = `<header class="wj-top"><button type="button" class="wg-x" data-jx>${icon('close')}<span>${W('יציאה', 'יְצִיאָה')}</span></button>
        <div><h2>${esc(W(V.title, V.ktitle))}</h2><p>${esc(W(V.light >= 1 ? 'על אדן חלון שמשי' : V.light >= 0.7 ? 'בחדר מואר' : 'בפינה מוצלת', V.light >= 1 ? 'בַּשֶּׁמֶשׁ' : V.light >= 0.7 ? 'בְּחֶדֶר מוּאָר' : 'בַּצֵּל'))}</p></div>
        <ol class="wj-week">${DAYN.map((d, i) => `<li class="${i === t ? 'today' : ''}${S.sealed != null && i >= S.sealed && i - S.sealed < k ? (broke && i - S.sealed > r.day ? ' bad' : ' seen') : ''}">${esc(d[kids ? 1 : 0])}</li>`).join('')}</ol></header>
      <div class="wj-body"><div class="wj-shelf">${ids.map((id) => { const role = V.pool[id].role, on = S.pick.includes(id); return `<button type="button" class="wj-c r-${role}${on ? ' on' : ''}" data-jc="${id}" ${S.sealed != null ? 'disabled' : ''}><img src="${CARD_ART[id] || ''}" alt=""><b>${esc(nm(id))}</b><small style="--rc:${ROLES[role].col}">${esc(ROLES[role].short[kids ? 1 : 0])}</small></button>`; }).join('')}</div>
        <div class="wj-glass${S.sealed != null ? ' sealed' : ''}${broke ? ' broke' : ''}${end && r && r.ok ? ' won' : ''}">${jarRig(r, k)}
          <div class="wj-count">${S.pick.length}/6</div></div>
        <div class="wj-side">${S.sealed == null ? `<p class="wj-how">${esc(W(`שימו בצנצנת בין ${min} לשישה יצורים, וסגרו את המכסה. מאז אסור לגעת: הצנצנת תחיה יום אחרי יום, וביום חמישי נראה אם החזיקה.`, `שִׂימוּ ${min} עַד 6 יְצוּרִים וְסִגְרוּ אֶת הַמִּכְסֶה.`))}</p>
            <div class="wj-roles">${Object.entries(ROLES).map(([k2, R]) => `<span style="--rc:${R.col}"><i></i>${esc(kids ? R.k : R.f)}</span>`).join('')}</div>
            <button type="button" class="wj-seal" data-jseal ${S.pick.length >= min ? '' : 'disabled'}>${icon('lock')} ${W('לסגור את המכסה', 'לִסְגֹּר אֶת הַמִּכְסֶה')}</button>`
          : `<ul class="wj-diary">${diary.join('') || `<li>${esc(W('המכסה סגור. מחר יופיע היום הראשון ביומן.', 'הַמִּכְסֶה סָגוּר.'))}</li>`}</ul>
            ${end || broke ? `<div class="wj-verdict ${broke ? 'no' : 'ok'}"><b>${broke ? W('הצנצנת נשברה', 'נִשְׁבְּרָה') : W('הצנצנת החזיקה!', 'הִחְזִיקָה!')}</b><p>${esc((broke ? WHY[r.why] : WHY.ok)[kids ? 'k' : 'f'])}</p>
              ${broke ? `<button type="button" data-jagain>${icon('undo')} ${W('לרוקן ולנסות שוב', 'לְנַסּוֹת שׁוּב')}</button>` : `<button type="button" data-jdone>${W('סיום', 'סִיּוּם')}</button>`}</div>`
            : `<p class="wj-wait">${esc(W(`עוד ${DAYS - k} ימים ביומן. חזרו מחר!`, 'חִזְרוּ מָחָר!'))}</p>`}`}</div></div>`;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.jx != null) { close(); return; }
    if (d.jc && S.sealed == null) { const on = S.pick.includes(d.jc); if (!on && S.pick.length >= 6) return; S.pick = on ? S.pick.filter((x) => x !== d.jc) : [...S.pick, d.jc]; save(); paint(); return; }
    if (d.jseal != null) { S.sealed = today(); S.tries++; save(); paint(); try { o.emit && o.emit('ui:click'); } catch (e2) { } return; }
    if (d.jagain != null) { S.sealed = null; save(); paint(); return; }
    if (d.jdone != null) { const r = sim(); S.done = true; save(); close(); o.done({ win: r.ok, score: S.pick.length * 10 + new Set(S.pick.map((x) => V.pool[x].role)).size * 5 - (S.tries - 1) * 3 }); return; }
  });
  function close() { if (tut && tut.stop) tut.stop(); el.remove(); }
  paint();
  try { const g = svcGuide(); if (g && S.sealed == null) tut = jarTutorial({ guide: g, ev: { state: () => ({ picks: S.pick.length, sealed: S.sealed != null }) } }); } catch (e) { }
  try { window.__jar = { state: () => ({ ...S, shown: shown(), sim: S.pick.length ? sim() : null, tut: (tut && tut.step) || null }), pick: (list) => { S.pick = list.slice(); save(); paint(); }, seal: () => { S.sealed = today(); S.tries++; save(); paint(); }, repaint: paint }; } catch (e) { }
  return { close, el };
}
