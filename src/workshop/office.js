// הזמנות עבודה, משרד הפטנטים ויריד הממציאים (1.4.4 set 4). The orders hang on a cork board (clients from our world
// drawn by hand, clients from the islands with their album paintings); a ticket opens with the need, the tests and a
// hint from nature. A prototype that passes becomes a patent: ניצוץ stamps a certificate with its picture and name.
// At the fair the child's patents stand on a stall; animals from the islands come by and say what they think, and
// three judges give a star each: רובו־דע (kind to nature: quiet), קוּבִּי (it works, with room to spare), ניצוץ (original:
// a combination of nature ideas the child has not patented before).
//   const O = createOffice(ctx)   O.orders(main) · O.patents(main) · O.fair(main) · O.ceremony(order, proto, sc, name, pic) · O.click(b)
import { ORDERS, orderOf } from '../data/workshop/orders.js';
import { TESTS, addonOf } from '../data/workshop/build-parts.js';
import { readWs, addPatent, setStars, markOrder } from './progress.js';
import { clientSVG, testSVG } from './art.js';
import { CARD_ART } from '../data/card-art.js';
import { NATURE_CARDS } from '../data/workshop/nature-cards.js';
import { ROBO_ART } from '../data/robo-art.js';
import { KUBI_ART } from '../data/kubi-art.js';
import { NITZOTZ_ART } from '../data/nitzotz-art.js';
import { ZONE_LOOK } from '../data/zones.js';
import { icon } from '../ui/ui/icons.js';
import { esc } from '../ui/ui/helpers.js';

const LV = { 1: ['קל', 'קַל'], 2: ['בינוני', 'בֵּינוֹנִי'], 3: ['קשה', 'קָשֶׁה'] };
// what visitors at the fair say (one each; the animal's own name is shown above)
const VISIT = [
  ['זה בדיוק מה שהיה חסר לי!', 'זֶה בְּדִיּוּק מָה שֶׁחָסַר לִי!'], ['אפשר אחד גם לחברים שלי?', 'אֶפְשָׁר אֶחָד גַּם לַחֲבֵרִים?'],
  ['וואו! איך חשבתם על זה?', 'וָאוּ! אֵיךְ חֲשַׁבְתֶּם עַל זֶה?'], ['אני רואה שם משהו שלקחתם ממני!', 'יֵשׁ שָׁם מַשֶּׁהוּ שֶׁלִּי!'],
  ['מעניין... ומה הוא עושה בגשם?', 'וּמָה הוּא עוֹשֶׂה בַּגֶּשֶׁם?'], ['אני אספר על זה לכל העדר.', 'אֲסַפֵּר לְכֻלָּם!'],
];
// the three judges: who gives a star for what
export function judge(P) {
  const sc = P.sc || {}, o = P.order && orderOf(P.order);
  const robo = (sc.noise || 0) >= 50;
  const kubi = o ? Object.entries(o.tests).every(([t, min]) => (sc[t] || 0) >= min + 5) : Object.values(sc).filter((v) => v >= 60).length >= 4;
  // ניצוץ's star (5.11, Avi: never from the number of parts): an idea from nature put together in a way this child has
  // not patented before (the set of nature ideas is new among his earlier patents)
  const natOf = (x) => ((x.proto && x.proto.add) || []).filter((a) => (addonOf(a) || {}).kind === 'nature').sort().join('+');
  const mine = natOf(P);
  const nitz = !!mine && !readWs().patents.some((x) => x.no < P.no && natOf(x) === mine);
  return { robo, kubi, nitz, n: (robo ? 1 : 0) + (kubi ? 1 : 0) + (nitz ? 1 : 0) };
}

export function createOffice(ctx) {
  const { T, W } = ctx;
  const kids = () => ctx.kids();
  let ticket = null, ceremony = null, fairT = 0;
  const who = (o) => (o.z === 'world' ? clientSVG(o.who) : (CARD_ART[o.who] ? `<img src="${CARD_ART[o.who]}" alt="">` : ''));
  const zoneName = (z) => (z === 'world' ? W('העולם שלנו', 'הָעוֹלָם שֶׁלָּנוּ') : ZONE_LOOK[z] ? (kids() ? ZONE_LOOK[z].shortK : ZONE_LOOK[z].short) : '');
  const list = () => ORDERS.filter((o) => !kids() || o.lv === 1);

  // ── the cork board
  // the board: a filter row (all, our world, each island) and big tickets: the client's picture beside the words,
  // the tests it needs as little pictures, the level as stars (Avi 5.11: lists with pictures and a bigger, nicer font)
  let filt = 'all';
  const ZF = [['all', 'הכול', 'הַכֹּל'], ['world', 'העולם שלנו', 'הָעוֹלָם שֶׁלָּנוּ'], ['amazon', 'אמזונס', 'אֲמָזוֹנָס'], ['grove', 'חורש', 'חֹרֶשׁ'], ['reef', 'שונית', 'שׁוּנִית'], ['desert', 'מדבר', 'מִדְבָּר'], ['savanna', 'סוואנה', 'סַוַואנָה']];
  function ordersHTML() {
    const S = readWs().orders;
    const notes = list().filter((o) => filt === 'all' || o.z === filt).map((o, i) => {
      const st = S[o.id] || {}, rot = ((i * 37) % 5) - 2;
      return `<button type="button" class="wo-note lv${o.lv}${st.done ? ' done' : ''}${st.versions && st.versions.length && !st.done ? ' wip' : ''}" data-woopen="${o.id}" style="--r:${rot * 0.6}deg;--d:${(i % 12) * 0.03}s">
        <i class="wo-pin"></i><span class="wo-who z-${o.z}">${who(o)}</span>
        <span class="wo-txt"><b>${esc(T(o))}</b>
          <span class="wo-tags"><em class="wo-zone z-${o.z}">${esc(zoneName(o.z))}</em><span class="wo-lv" title="${esc(LV[o.lv][0])}">${[1, 2, 3].map((k) => `<i class="${k <= o.lv ? 'on' : ''}"></i>`).join('')}</span>
          <span class="wo-tst">${Object.keys(o.tests).map((t) => testSVG(t)).join('')}</span></span></span>
        ${st.done ? `<em class="wo-stamp">${W('בוצע!', 'בֻּצַּע!')}</em>` : ''}</button>`;
    }).join('');
    const done = list().filter((o) => (S[o.id] || {}).done).length;
    const zones = kids() ? ZF.filter((z) => z[0] === 'all' || list().some((o) => o.z === z[0])) : ZF;
    return `<div class="wo"><div class="wo-head"><span class="wo-filt">${zones.map(([id, f, k]) => `<button type="button" data-wofilt="${id}" class="${filt === id ? 'on' : ''}${id !== 'all' && id !== 'world' ? ' z-' + id : ''}">${esc(kids() ? k : f)}</button>`).join('')}</span><span class="wo-count">${W('בוצעו', 'בֻּצְּעוּ')} <b>${done}</b> / ${list().length}</span></div>
      <div class="wo-board">${notes}</div>${ticket ? ticketHTML(orderOf(ticket)) : ''}</div>`;
  }
  function ticketHTML(o) {
    if (!o) return '';
    return `<div class="wo-ticket" role="dialog"><div class="wo-tcard"><button type="button" class="wo-tx" data-woclose>${icon('close')}</button>
      <div class="wo-thead"><span class="wo-who big z-${o.z}">${who(o)}</span><div><small>${W('לקוח', 'לָקוֹחַ')}: ${esc(o.z === 'world' ? W('העולם שלנו', 'הָעוֹלָם שֶׁלָּנוּ') : (NATURE_CARDS.find((c) => c.id === o.who) || {})[kids() ? 'k' : 'n'] || '')}</small><h3>${esc(T(o))}</h3></div></div>
      <div class="wo-tests">${Object.entries(o.tests).map(([t, min]) => { const X = TESTS.find((x) => x.id === t); return `<span>${testSVG(t)}<b>${esc(kids() ? X.k : X.n)}</b><small>${W('לפחות', 'לְפָחוֹת')} ${min}</small></span>`; }).join('')}</div>
      ${o.need ? `<p class="wo-must">${W('חייב להיות בו:', 'חַיָּב לִהְיוֹת בּוֹ:')} <b>${o.need.map((a) => esc(kids() ? addonOf(a).k : addonOf(a).n)).join(W(' או ', ' אוֹ '))}</b></p>` : ''}
      <details class="wo-hint"><summary>${icon('bulb')} ${W('רמז מהטבע', 'רֶמֶז מֵהַטֶּבַע')}</summary><p>${esc(o.hint)}</p></details>
      <button type="button" class="wo-go" data-wogo="${o.id}">${W('יאללה לבנות!', 'בּוֹנִים!')} ${icon('arrowL')}</button></div></div>`;
  }
  const orders = (main) => { main.innerHTML = ordersHTML(); };

  // ── the patent office: the wall of certificates
  function certHTML(P, big = false) {
    const st = P.stars || 0;
    return `<div class="wp-cert${big ? ' big' : ''}"><div class="wp-frame"><small>${W('תעודת פטנט', 'תְּעוּדַת פָּטֶנְט')} ${P.no}</small>
      ${P.pic ? `<img src="${P.pic}" alt="">` : '<i class="wp-nopic"></i>'}<b>${esc(P.name || '')}</b>
      ${P.order ? `<em>${esc(T(orderOf(P.order) || { f: '' }))}</em>` : ''}<span class="wp-stars">${[0, 1, 2].map((i) => `<i class="${i < st ? 'on' : ''}"></i>`).join('')}</span></div><u class="wp-seal" aria-hidden="true"></u></div>`;
  }
  function patentsHTML() {
    const L = readWs().patents.slice().reverse();
    return `<div class="wp"><div class="wo-head"><h2>${W('משרד הפטנטים', 'מִשְׂרַד הַפָּטֶנְטִים')}</h2><button type="button" class="wp-fairbtn" data-wpfair ${L.length ? '' : 'disabled'}>${icon('sparkle')} ${W('ליריד הממציאים', 'לַיָּרִיד')}</button></div>
      ${L.length ? `<div class="wp-wall">${L.map((P) => `<button type="button" class="wp-item" data-wppick="${P.no}">${certHTML(P)}</button>`).join('')}</div>`
      : `<div class="wp-empty">${testSVG('drop')}<p>${W('עוד אין פטנטים. אב טיפוס שעובר את הבדיקות מקבל כאן תעודה!', 'עוֹד אֵין פָּטֶנְטִים. אַב טִיפּוּס שֶׁעוֹבֵר בְּדִיקוֹת מְקַבֵּל תְּעוּדָה!')}</p></div>`}</div>`;
  }
  const patents = (main) => { main.innerHTML = patentsHTML(); };

  // ── the fair: one patent on the stall, three judges, visitors walking by
  let fairNo = null;
  function fairHTML() {
    const L = readWs().patents; const P = L.find((x) => x.no === fairNo) || L[L.length - 1];
    if (!P) return patentsHTML();
    fairNo = P.no;
    const J = judge(P);
    const o = P.order && orderOf(P.order), zone = o && o.z !== 'world' ? o.z : null;
    const pool = NATURE_CARDS.filter((c) => (!zone || c.z === zone) && CARD_ART[c.id] && !/tree|grass|coral/.test(c.id));
    const vis = [0, 1, 2].map((i) => pool[(P.no * 7 + i * 13 + fairT) % pool.length]).filter(Boolean);
    const jd = (art, on, n, why) => `<div class="wf-judge${on ? ' on' : ''}"><img src="${art}" alt=""><b>${esc(n)}</b><span class="wf-star"></span><small>${esc(why)}</small></div>`;
    return `<div class="wf"><div class="wo-head"><h2>${W('יריד הממציאים', 'יְרִיד הַמַּמְצִיאִים')}</h2>
        <span class="wf-pick">${L.slice(-8).map((x) => `<button type="button" data-wfpick="${x.no}" class="${x.no === P.no ? 'on' : ''}">${x.no}</button>`).join('')}</span></div>
      <div class="wf-scene"><div class="wf-flags" aria-hidden="true">${'<i></i>'.repeat(9)}</div>
        <div class="wf-stall">${certHTML({ ...P, stars: J.n }, true)}</div>
        <div class="wf-visitors">${vis.map((c, i) => `<div class="wf-vis" style="--d:${i * 1.6}s"><img src="${CARD_ART[c.id]}" alt=""><p><b>${esc(kids() ? c.k : c.n)}:</b> ${esc(VISIT[(P.no + i + fairT) % VISIT.length][kids() ? 1 : 0])}</p></div>`).join('')}</div>
        <div class="wf-judges">
          ${jd(ROBO_ART.frames['idle-happy'] || ROBO_ART.frames['idle-normal'], J.robo, W('רובו־דע', 'רוֹבּוֹ־דַּע'), W('טוב לטבע: שקט', 'שָׁקֵט לַחַיּוֹת'))}
          ${jd(KUBI_ART.frames.idle, J.kubi, W('קוּבִּי', 'קוּבִּי'), W('עובד, ויש עוד מקום', 'עוֹבֵד חָזָק'))}
          ${jd(NITZOTZ_ART.frames.idea || NITZOTZ_ART.frames.idle, J.nitz, W('ניצוץ', 'נִיצוֹץ'), W('מקורי: שילוב חדש מהטבע', 'שִׁלּוּב חָדָשׁ!'))}</div></div></div>`;
  }
  function fair(main) { main.innerHTML = fairHTML(); const L = readWs().patents; const P = L.find((x) => x.no === fairNo); if (P) { const J = judge(P); if ((P.stars || 0) !== J.n) setStars(P.no, J.n); ctx.act(J.n >= 2 ? 'cheer' : 'happy'); ctx.after(); } }

  // ── the ceremony: a prototype passed; stamp the certificate
  function ceremonyNow(order, proto, sc, name, pic) {
    const P = addPatent({ name, proto, order: order ? order.id : null, sc, pic, stars: 0 });
    if (order) markOrder(order.id, { done: true, patent: P.no });
    P.stars = judge(P).n; setStars(P.no, P.stars);
    ceremony = P;
    ctx.sfx('quizRight'); ctx.act('cheer'); ctx.say('nz:react:patent');
    ctx.after();
    return P;
  }
  function ceremonyHTML() {
    if (!ceremony) return '';
    return `<div class="wp-cer" role="dialog"><div class="wp-cerin"><h3>${W('פטנט חדש!', 'פָּטֶנְט חָדָשׁ!')}</h3>${certHTML(ceremony, true)}
      <div class="wp-cerbtn"><button type="button" data-wpfair>${icon('sparkle')} ${W('ליריד!', 'לַיָּרִיד!')}</button><button type="button" data-woback>${W('עוד הזמנות', 'עוֹד הַזְמָנוֹת')}</button></div></div></div>`;
  }

  function click(b) {
    const d = b.dataset;
    if (d.wofilt) { filt = d.wofilt; ctx.sfx('click'); ctx.go('orders'); return true; }
    if (d.woopen) { ticket = d.woopen; ctx.sfx('click'); ctx.act('explain'); ctx.go('orders'); return true; }
    if (d.woclose != null) { ticket = null; ctx.go('orders'); return true; }
    if (d.wogo) { ticket = null; ctx.setOrder(d.wogo); ctx.sfx('pop'); ctx.act('excited'); ctx.go('build'); return true; }
    if (d.woback != null) { ceremony = null; ctx.setOrder(null); ctx.go('orders'); return true; }
    if (d.wpfair != null) { ceremony = null; fairNo = null; fairT++; ctx.sfx('click'); ctx.go('fair'); return true; }
    if (d.wppick) { fairNo = +d.wppick; ctx.go('fair'); return true; }
    if (d.wfpick) { fairNo = +d.wfpick; fairT++; ctx.go('fair'); return true; }
    return false;
  }
  return {
    orders, patents, fair, click, ceremony: ceremonyNow, ceremonyHTML,
    get ticket() { return ticket; }, closeCeremony: () => { ceremony = null; },
    state: () => ({ ticket, ceremony: ceremony && ceremony.no, fairNo }),
  };
}
