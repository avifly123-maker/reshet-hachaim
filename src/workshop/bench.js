// שולחן הבנייה ואולם הבדיקות (1.4.4 set 4): the child builds a prototype in 3D from a shape, a material and up to
// four add-ons (mechanisms and ideas from nature, each with its album painting), names it with ניצוץ's funny names,
// and takes it to the six stations, where it passes or fails in a short funny animation (src/workshop/proto3d.js).
// With an order (office.js) the ticket rides along: what the client needs, which tests and how much, versions א', ב'…
//   const B = createBench(ctx)   B.build(main) · B.test(main) · B.leave() · B.state()
//   ctx: { kids, T, W, say(key), act(x), sfx(n), after(), go(place), order() → order|null, setOrder(id|null),
//          onTests(results, proto), onPatent(order|null, proto, sc) }
import { SHAPES, MATERIALS, ADDONS, TESTS, MAX_ADDONS, shapeOf, materialOf, addonOf } from '../data/workshop/build-parts.js';
import { scores, checkOrder, protoOk, hasNature, PASS } from './engine.js';
import { readWs, saveProto, recordTests } from './progress.js';
import { createStage } from './proto3d.js';
import { shapeSVG, mechSVG, testSVG, clientSVG } from './art.js';
import { CARD_ART } from '../data/card-art.js';
import { NATURE_CARDS } from '../data/workshop/nature-cards.js';
import { icon } from '../ui/ui/icons.js';
import { esc } from '../ui/ui/helpers.js';

const HEB = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳'];
// ניצוץ's names: the shape in its joined form + what the nature idea is + a playful ending (no adjectives: no gender trouble)
const SHAPE_JOIN = { box: ['קופסת', 'קֻפְסַת'], ball: ['כדור', 'כַּדּוּר'], tube: ['צינור', 'צִנּוֹר'], cone: ['חץ', 'חֵץ'], plate: ['משטח', 'מִשְׁטַח'], dome: ['כיפת', 'כִּפַּת'] };
const NOUN = { spines: ['קוצים', 'קוֹצִים'], scales: ['קשקשים', 'קַשְׂקַשִּׂים'], suction: ['יניקה', 'יְנִיקָה'], bigears: ['אוזניים', 'אָזְנַיִם'], honeycomb: ['חלת דבש', 'חַלַּת דְּבַשׁ'], shell: ['שריון', 'שִׁרְיוֹן'], softwing: ['נוצות', 'נוֹצוֹת'], ribs: ['צלעות', 'צְלָעוֹת'], widefoot: ['רגלי גמל', 'רַגְלֵי גָּמָל'], airtunnels: ['מנהרות', 'מִנְהָרוֹת'], sharkskin: ['כריש', 'כָּרִישׁ'], fogcatch: ['ערפל', 'עֲרָפֶל'], glow: ['גחלילית', 'גַּחְלִילִית'], reflect: ['עיני חתול', 'עֵינֵי חָתוּל'], uvglow: ['עקרב', 'עַקְרָב'], buzz: ['דבורים', 'דְּבוֹרִים'], spring: ['קפיצים', 'קְפִיצִים'], wheel: ['גלגלים', 'גַּלְגַּלִּים'], pipe: ['צינוריות', 'צִנּוֹרִיּוֹת'], pump: ['משאבה', 'מַשְׁאֵבָה'], fan: ['רוח', 'רוּחַ'], chute: ['מצנח', 'מַצְנֵחַ'] };
const ENDS = [['', ''], [' 3000', ' 3000'], [' טורבו', ' טוּרְבּוֹ'], [' מיני', ' מִינִי'], [' מגה', ' מֶגָה'], [' פלוס', ' פְּלוּס']];
export function nameIdeas(proto, kids) {
  const p = protoOk(proto), j = SHAPE_JOIN[p.shape][kids ? 1 : 0];
  const nouns = p.add.map((a) => NOUN[a]).filter(Boolean).map((n) => n[kids ? 1 : 0]);
  const out = [];
  for (const n of nouns.length ? nouns : [(materialOf(p.mat)[kids ? 'k' : 'n'])]) for (const e of ENDS) out.push(j + ' ' + n + e[kids ? 1 : 0]);
  return out;
}

export function createBench(ctx) {
  const { T, W } = ctx;
  let proto = protoOk(readWs().proto || { shape: 'box', mat: 'wood', add: [] });
  let tab = 'shape', stage = null, name = '', nameI = 0, running = false, last = {}, verdict = null, mainEl = null;
  const kids = () => ctx.kids();
  const nm = (o) => (kids() ? o.k : o.n);
  // the evidence (5.11, Avi: a patent only for tests actually run): the tests this very version of the prototype passed.
  // Any change to it (shape, material, a part) is a new version, and its tests start again.
  const protoKey = (p) => [p.shape, p.mat, ...(p.add || []).slice().sort()].join('|');
  let evidence = { key: protoKey(proto), passed: new Set() };
  const setProto = (p) => { proto = protoOk(p); saveProto(proto); last = {}; verdict = null; evidence = { key: protoKey(proto), passed: new Set() }; if (stage) stage.show(proto); };
  const freshName = () => { const L = nameIdeas(proto, kids()); name = L[nameI % L.length]; };

  function mountStage(cv) {
    if (stage) { stage.dispose(); stage = null; }
    const Q = (() => { try { return (window.__app && window.__app.quality) || 'medium'; } catch (e) { return 'medium'; } })();
    stage = createStage(cv, { weak: Q === 'min' || Q === 'low' });
    if (stage) stage.show(proto);
  }
  function leave() { if (stage) { stage.dispose(); stage = null; } mainEl = null; }

  // ── the order's ticket (both screens)
  function ticketHTML(order, sc) {
    if (!order) return '';
    const r = checkOrder(proto, order);
    const who = order.z === 'world' ? clientSVG(order.who) : (CARD_ART[order.who] ? `<img src="${CARD_ART[order.who]}" alt="">` : '');
    const steps = kids() ? [['need', 'הַצֹּרֶךְ', true], ['nature', 'רַעְיוֹן מֵהַטֶּבַע', r.nature], ['test', 'בְּדִיקָה', r.tests.every((t) => last[t.id] != null)]]
      : [['need', 'הצורך', true], ['nature', 'רעיון מהטבע', r.nature], ['need2', 'הלב של הרעיון', r.need], ['build', 'אב טיפוס', true], ['test', 'בדיקה', r.tests.every((t) => last[t.id] != null)], ['ok', 'עובר', r.ok && r.tests.every((t) => last[t.id] != null)]];
    return `<div class="wb-ticket"><span class="wb-who">${who}</span><div class="wb-tk"><b>${esc(T(order))}</b>
      <span class="wb-need">${r.tests.map((t) => `<i class="${sc && sc[t.id] != null ? (sc[t.id] >= t.min ? 'ok' : 'no') : ''}">${testSVG(t.id)}<small>${t.min}</small></i>`).join('')}${order.need ? `<em>${W('חייב:', 'חַיָּב:')} ${order.need.map((a) => esc(nm(addonOf(a)))).join(W(' או ', ' אוֹ '))}</em>` : ''}</span></div>
      <ol class="wb-steps">${steps.filter((s) => !(order.need ? false : s[0] === 'need2')).map(([id, n, on]) => `<li class="${on ? 'on' : ''}" data-step="${id}">${esc(n)}</li>`).join('')}</ol>
      <button type="button" class="wb-x" data-wbdrop title="${W('בלי הזמנה', 'בְּלִי הַזְמָנָה')}">${icon('close')}</button></div>`;
  }

  // ── the build table
  function tilesHTML() {
    if (tab === 'shape') return SHAPES.map((s) => `<button type="button" class="wb-tile${proto.shape === s.id ? ' on' : ''}" data-wbshape="${s.id}">${shapeSVG(s.id)}<b>${esc(nm(s))}</b></button>`).join('');
    if (tab === 'mat') return MATERIALS.map((m) => `<button type="button" class="wb-tile mat${proto.mat === m.id ? ' on' : ''}" data-wbmat="${m.id}"><i class="wb-sw m-${m.id}" style="--c:${m.col}"></i><b>${esc(nm(m))}</b></button>`).join('');
    const kind = tab === 'mech' ? 'mech' : 'nature';
    return ADDONS.filter((a) => a.kind === kind).map((a) => {
      const on = proto.add.includes(a.id), full = !on && proto.add.length >= MAX_ADDONS;
      const pic = kind === 'mech' ? mechSVG(a.id) : (CARD_ART[a.card] ? `<img src="${CARD_ART[a.card]}" alt="" loading="lazy">` : '');
      return `<button type="button" class="wb-tile ${kind}${on ? ' on' : ''}" data-wbadd="${a.id}" ${full ? 'disabled' : ''}>${pic}<b>${esc(nm(a))}</b>${on ? '<u class="wb-check"></u>' : ''}</button>`;
    }).join('');
  }
  function buildHTML() {
    const order = ctx.order();
    if (!name) freshName();
    return `<div class="wb">${ticketHTML(order, null)}
      <div class="wb-row"><div class="wb-stagebox"><div class="wb-bench" aria-hidden="true"></div><canvas class="wb-stage"></canvas>
          <div class="wb-name"><b>${esc(name)}</b><button type="button" data-wbname title="${W('שם אחר', 'שֵׁם אַחֵר')}">${icon('undo')}</button></div>
          <div class="wb-on">${proto.add.map((a) => `<button type="button" data-wbadd="${a}" title="${W('להוריד', 'לְהוֹרִיד')}">${esc(nm(addonOf(a)))} ${icon('close')}</button>`).join('')}<small>${proto.add.length}/${MAX_ADDONS}</small></div></div>
        <div class="wb-drawer"><div class="wb-tabs">${[['shape', W('צורה', 'צוּרָה')], ['mat', W('חומר', 'חֹמֶר')], ['mech', W('מנגנונים', 'מַנְגְּנוֹנִים')], ['nature', W('מהטבע', 'מֵהַטֶּבַע')]].map(([id, n]) => `<button type="button" data-wbtab="${id}" class="${tab === id ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>
          <div class="wb-items t-${tab}">${tilesHTML()}</div>
          <button type="button" class="wb-go" data-wbgo>${W('לאולם הבדיקות!', 'לִבְדִיקָה!')} ${icon('arrowL')}</button></div></div></div>`;
  }
  function build(main) {
    mainEl = main; main.innerHTML = buildHTML(); mountStage(main.querySelector('.wb-stage'));
  }
  const repaintBuild = () => {
    if (!mainEl || !mainEl.querySelector('.wb')) return;
    const keep = mainEl.querySelector('.wb-stage');
    const tmp = document.createElement('div'); tmp.innerHTML = buildHTML();
    // keep the live canvas: swap everything around it
    tmp.querySelector('.wb-stage').replaceWith(keep);
    mainEl.replaceChildren(...tmp.childNodes);
  };

  // ── the test hall
  function testHTML() {
    const order = ctx.order(), sc = last, need = order ? order.tests : null;
    const S = order ? (readWs().orders[order.id] || { versions: [] }) : null;
    const vers = S && S.versions.length ? `<div class="wt-vers">${S.versions.map((v, i) => `<span title="${HEB[i] || i + 1}"><b>${HEB[i] || i + 1}</b>${Object.keys(need).map((t) => `<i style="--h:${Math.round((v.sc[t] || 0))}%" class="${(v.sc[t] || 0) >= need[t] ? 'ok' : ''}"></i>`).join('')}</span>`).join('')}</div>` : '';
    return `<div class="wt">${ticketHTML(order, sc)}
      <div class="wt-row"><div class="wt-stagebox"><canvas class="wt-stage"></canvas><div class="wt-verdict">${verdict ? verdict : ''}</div><div class="wt-pname">${esc(name)}</div></div>
      <div class="wt-side"><div class="wt-stations">${TESTS.map((t) => { const s = sc[t.id], min = need ? need[t.id] : null, pass = s != null && s >= (min || PASS);
        return `<button type="button" class="wt-st${need && min == null ? ' dim' : ''}${need && min != null ? ' want' : ''}${s != null ? (pass ? ' ok' : ' no') : ''}" data-wtrun="${t.id}" ${running ? 'disabled' : ''}>${testSVG(t.id)}<span><b>${esc(nm(t))}</b><small>${esc(kids() ? t.kd : t.d)}</small></span>
          <em class="wt-bar"><u style="width:${s != null ? s : 0}%"></u>${min != null ? `<s style="inset-inline-start:${min}%"></s>` : `<s style="inset-inline-start:${PASS}%" class="std"></s>`}</em><strong>${s != null ? s : ''}</strong></button>`; }).join('')}</div>
        <div class="wt-acts"><button type="button" class="wt-all" data-wtall ${running ? 'disabled' : ''}>${icon('play')} ${need ? W('הבדיקות של ההזמנה', 'לִבְדֹּק הַכֹּל') : W('כל שש הבדיקות', 'לִבְדֹּק הַכֹּל')}</button>
          <button type="button" class="wt-back" data-wtbuild>${icon('pencil')} ${W('לשפר', 'לְשַׁפֵּר')}</button></div>${vers}</div></div></div>`;
  }
  function test(main) { mainEl = main; main.innerHTML = testHTML(); mountStage(main.querySelector('.wt-stage')); if (stage) stage.spin(true); }
  const repaintTest = () => {
    if (!mainEl || !mainEl.querySelector('.wt')) return;
    const keep = mainEl.querySelector('.wt-stage'); const tmp = document.createElement('div'); tmp.innerHTML = testHTML();
    tmp.querySelector('.wt-stage').replaceWith(keep); mainEl.replaceChildren(...tmp.childNodes);
  };
  async function run(list) {
    if (running) return; running = true; verdict = null; repaintTest();
    const sc = scores(proto), order = ctx.order(), results = [];
    for (const t of list) {
      const min = order && order.tests[t] != null ? order.tests[t] : PASS, pass = sc[t] >= min;
      const T0 = TESTS.find((x) => x.id === t);
      if (stage) { stage.spin(false); await stage.play(t, pass); }
      last[t] = sc[t]; results.push({ id: t, score: sc[t], pass });
      verdict = pass ? `<b class="ok">${W('עבר!', 'עָבַר!')}</b>` : `<b class="no">${esc(kids() ? T0.failK : T0.failF)}</b>`;
      ctx.sfx(pass ? 'good' : 'pop'); ctx.act(pass ? 'cheer' : (Math.random() < 0.4 ? 'fuse' : 'excited'));
      repaintTest();
      await new Promise((r) => setTimeout(r, 650));
      if (stage) stage.show(proto);
    }
    running = false;
    if (evidence.key !== protoKey(proto)) evidence = { key: protoKey(proto), passed: new Set() };
    for (const r of results) { if (r.pass) evidence.passed.add(r.id); else evidence.passed.delete(r.id); }
    recordTests(results, { orderId: order && order.id, proto });
    ctx.onTests(results, proto);
    const fails = results.filter((r) => !r.pass).length;
    if (order) {
      const r = checkOrder(proto, order);
      const missing = Object.keys(order.tests).filter((t) => !evidence.passed.has(t));
      if (r.ok && missing.length) {   // it would pass, but the client wants to see every test done on this very version
        verdict = `<b class="no">${W('עוד לא בדקתם: ', 'עוֹד לֹא בְּדַקְתֶּם: ')}${missing.map((t) => { const X = TESTS.find((x) => x.id === t); return esc(kids() ? X.k : X.n); }).join(W(', ', ', '))}</b>`;
        ctx.say('nz:react:ok'); repaintTest(); ctx.after(); return;
      }
      if (r.ok) { verdict = `<b class="ok big">${W('ההזמנה מוכנה!', 'הַהַזְמָנָה מוּכָנָה!')}</b>`; repaintTest(); ctx.onPatent(order, proto, sc, name); return; }
      verdict = `<b class="no">${!r.nature ? W('חסר רעיון מהטבע', 'חָסֵר רַעְיוֹן מֵהַטֶּבַע') : !r.need ? W('חסר הלב של הרעיון', 'חָסֵר חֵלֶק חָשׁוּב') : W('עוד לא. משפרים ובודקים שוב!', 'עוֹד לֹא. מְשַׁפְּרִים!')}</b>`;
      ctx.say(fails >= 2 ? 'nz:react:improve' : 'nz:react:ok');
    } else {
      const passed = results.filter((r) => r.pass).length;
      if (evidence.passed.size >= 3 && passed >= 1 && hasNature(proto)) { repaintTest(); ctx.onPatent(null, proto, sc, name); return; }   // three tests passed on this version (one run or several)
      ctx.say(fails ? 'nz:react:improve' : 'nz:react:works');
    }
    repaintTest(); ctx.after();
  }

  // ── clicks (the screen hands them over)
  function click(b) {
    const d = b.dataset;
    if (d.wbtab) { tab = d.wbtab; ctx.sfx('click'); repaintBuild(); return true; }
    if (d.wbshape) { setProto({ ...proto, shape: d.wbshape }); freshName(); ctx.sfx('pop'); ctx.act('hint'); repaintBuild(); return true; }
    if (d.wbmat) { setProto({ ...proto, mat: d.wbmat }); ctx.sfx('pop'); repaintBuild(); return true; }
    if (d.wbadd) {
      const on = proto.add.includes(d.wbadd);
      if (!on && proto.add.length >= MAX_ADDONS) return true;
      setProto({ ...proto, add: on ? proto.add.filter((a) => a !== d.wbadd) : [...proto.add, d.wbadd] });
      if (!on) { freshName(); ctx.sfx('pop'); ctx.act(addonOf(d.wbadd).kind === 'nature' ? 'idea' : 'explain'); } else ctx.sfx('click');
      repaintBuild(); return true;
    }
    if (d.wbname != null) { nameI++; freshName(); ctx.sfx('click'); ctx.act('excited'); repaintBuild(); return true; }
    if (d.wbgo != null) { ctx.sfx('click'); ctx.go('test'); return true; }
    if (d.wbdrop != null) { ctx.setOrder(null); last = {}; verdict = null; if (mainEl && mainEl.querySelector('.wt')) repaintTest(); else repaintBuild(); return true; }
    if (d.wtrun) { run([d.wtrun]); return true; }
    if (d.wtall != null) { const o = ctx.order(); run(o ? Object.keys(o.tests) : TESTS.map((t) => t.id)); return true; }
    if (d.wtbuild != null) { ctx.sfx('click'); ctx.go('build'); return true; }
    return false;
  }
  return {
    build, test, leave, click, pic: (n) => (stage ? stage.snapshot(n) : ''),
    setProto, get proto() { return proto; }, get name() { return name; },
    resetRun: () => { last = {}; verdict = null; },
    run: (list) => run(list),
    state: () => ({ proto, tab, name, running, last: { ...last }, sc: scores(proto), evidence: [...evidence.passed] }),
  };
}
// the nature cards a child owns that bring an add-on (the drawer marks them; the album takes part)
export const addonCards = () => ADDONS.filter((a) => a.card).map((a) => ({ id: a.id, card: NATURE_CARDS.find((c) => c.id === a.card) }));
