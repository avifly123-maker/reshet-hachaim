// "דוח החוקר" – the researcher's daily field report.
// Records a compact log for every in-game day (W.day), keeps it in the forest save (last 30 days), turns a day into
// simple Hebrew for the report screen (src/ui/report.js), and exports it (desktop: PDF file, browser: window.print()).
//
// Saved shape (save.report = { v, days: [Day], cur: Day }), every field optional so old saves just start empty:
//   Day = { d: day, s: season|null, v0, v1, vl: lowest vitality,  pl / an: plant / animal counts at the end,
//           sp: { speciesId: count }, s0: [species alive when the day began], nw: [arrived], lo: [no longer here],
//           ev: [[eventId, choiceId]], ms: [missionId], dc: [relation keys discovered], nd: discoveries count,
//           po / di / bi / gr / de / lv: pollinations, seed dispersals, births, plants grown up, plants wilted, animals left,
//           wx: { r: rain, st: storm, dr: drought 0..1, ht: heat, fl: flood, fi: fire }, bl: [species that bloomed],
//           ac: [species that were active: ate / pollinated / carried seeds], ch: { k, a, b, n } biggest problem,
//           fx: species of the day's fact, n: the child's own note }
import { zoneWord } from '../core/place.js';
import { createReportUI } from '../ui/report.js';
import { SEASON_NAMES, gw, defName } from '../data/common.js';
import { CARD_ART } from '../data/card-art.js';
import * as profiles from '../core/profiles.js';
import { TORAH, sourcesOn } from '../core/edition.js';
import { DAILY } from '../data/torah.js';

const KEEP_DAYS = 30;
const NOTE_MAX = 800;
const r2 = (x) => Math.round((+x || 0) * 100) / 100;
const uniq = (a) => [...new Set(a)];
const firstSentence = (t) => { const s = String(t || '').trim(); const m = s.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : s).trim(); };

export function createFieldReport({ W, reg, biome, light, missions, thumbs, ui, bus, audio, saved }) {
  const kids = biome.mode === 'kids';
  const root = document.getElementById('ui');
  let days = [], cur = null;
  let stats0 = null, sampleT = 0;

  // ───────────────────────────── counting what lives in the forest
  // entities hidden by a running "what if it disappears?" experiment still belong to the forest
  const counted = (e) => e.alive && !e.dying && !e.leaving && (!e.removed || (!!W.experiment && W.experiment.ents.includes(e)));
  function census() {
    const sp = {}; let pl = 0, an = 0;
    for (const p of W.plants) if (counted(p) && !p.fallen) { sp[p.sp.id] = (sp[p.sp.id] || 0) + 1; pl++; }
    for (const a of W.animals) if (counted(a)) { sp[a.sp.id] = (sp[a.sp.id] || 0) + 1; an++; }
    return { sp, pl, an };
  }
  const pollTotal = () => Object.values(W.stats.pollinations || {}).reduce((s, n) => s + n, 0);
  const statsNow = () => ({ po: pollTotal(), di: W.stats.dispersals || 0, bi: W.stats.births || 0 });

  function newDay() {
    const c = census();
    return { d: W.day, s: W.season || null, v0: r2(W.vitality), v1: r2(W.vitality), vl: r2(W.vitality), s0: Object.keys(c.sp),
      ev: [], ms: [], dc: [], nd: 0, po: 0, di: 0, bi: 0, gr: 0, de: 0, lv: 0, wx: {}, bl: [], ac: [], n: '',
      _st: statsNow() };   // counters at the start of the day (not shown)
  }
  // bring the counters of the running day up to date (the stats are global totals)
  function syncCounters(day) {
    const st = statsNow(), b = day._st || st;
    day.po = Math.max(0, st.po - b.po); day.di = Math.max(0, st.di - b.di); day.bi = Math.max(0, st.bi - b.bi);
  }

  // ───────────────────────────── restore (old saves: nothing → start empty)
  function cleanDay(x) {
    if (!x || typeof x !== 'object' || !Number.isFinite(+x.d)) return null;
    const arr = (a) => Array.isArray(a) ? a.filter(v => typeof v === 'string' || Array.isArray(v)).slice(0, 40) : [];
    return { ...x, d: +x.d, ev: arr(x.ev), ms: arr(x.ms), dc: arr(x.dc), nw: arr(x.nw), lo: arr(x.lo), bl: arr(x.bl), ac: arr(x.ac), s0: arr(x.s0),
      sp: x.sp && typeof x.sp === 'object' ? x.sp : {}, wx: x.wx && typeof x.wx === 'object' ? x.wx : {}, n: typeof x.n === 'string' ? x.n.slice(0, NOTE_MAX) : '' };
  }
  if (saved && typeof saved === 'object') {
    days = (Array.isArray(saved.days) ? saved.days : []).map(cleanDay).filter(Boolean).filter(d => d.d < W.day).slice(-KEEP_DAYS);
    const c = cleanDay(saved.cur);
    if (c && c.d === W.day) { cur = c; if (!cur._st) cur._st = statsNow(); }
  }
  if (!cur) cur = newDay();

  // ───────────────────────────── recording hooks (called from game.js)
  const push = (arr, v, max = 12) => { if (!arr.includes(v) && arr.length < max) arr.push(v); };
  const api = {
    event(id, choice) { cur.ev.push([id, choice]); if (cur.ev.length > 8) cur.ev.shift(); },
    mission(id) { push(cur.ms, id); },
    observe(fromId, toId, key, isNew) {
      push(cur.ac, fromId, 16);
      if (isNew) { cur.nd++; push(cur.dc, key, 6); }
    },
    mature() { cur.gr++; },
    plantDied() { cur.de++; },
    animalLeft() { cur.lv++; },
    // weather, vitality and blooming are sampled about once per game second
    tick(dt) {
      if (dt <= 0) return;
      sampleT += dt; if (sampleT < 1) return; sampleT = 0;
      const wx = cur.wx;
      if (W.rain > 0.45) wx.r = 1;
      if (W.storm > 0.5) wx.st = 1;
      const summerDry = biome.id === 'grove' && W.season === 'summer' ? 0.5 : 0;
      wx.dr = Math.max(wx.dr || 0, r2(Math.max(W.drought, summerDry)));
      if (W.heat > 0) wx.ht = 1;
      if (W.flood > 0) wx.fl = 1;
      if (W.fires.some(f => f.intensity > 0.2)) wx.fi = 1;
      cur.vl = Math.min(cur.vl ?? 1, r2(W.vitality));
      for (const p of W.plants) if (p.bloom > 0.45 && counted(p)) push(cur.bl, p.sp.id, 14);
    },
    // the day is over (called right before W.day++): close it, keep it, and offer to write the report
    dayEnded() {
      closeDay(cur);
      days.push(cur); while (days.length > KEEP_DAYS) days.shift();
      const ended = cur.d;
      cur = null;
      return ended;
    },
    dayBegan(ended) {
      cur = newDay();
      if (ended != null) promptEnded(ended);
    },
    serialize() {
      const strip = (d) => { const o = { ...d }; delete o._live; return o; };
      return { v: 1, days: days.map(strip), cur: cur ? strip(cur) : null };
    },
    open(day) { openReport(day ?? W.day); },
    isOpen: () => view.isOpen(),
    get days() { return days; }, get cur() { return cur; },
    describe: (d) => describe(d ?? W.day),
    dispose() { view.dispose(); },
  };

  function closeDay(day) {
    syncCounters(day);
    const c = census();
    day.v1 = r2(W.vitality); day.pl = c.pl; day.an = c.an; day.sp = c.sp;
    const s0 = new Set(day.s0 || []), s1 = new Set(Object.keys(c.sp));
    day.nw = [...s1].filter(id => !s0.has(id));
    day.lo = [...s0].filter(id => !s1.has(id));
    day.ch = challengeNow(day);
    day.fx = pickFact(day, c.sp);
    return day;
  }

  // ───────────────────────────── the biggest problem of the day, from the simulation's own state
  function challengeNow(day) {
    const C = [];
    const wx = day.wx || {};
    const alivePl = W.plants.filter(p => counted(p) && !p.falling);
    const dormant = (sp) => biome.id === 'grove' && sp.seasons && (sp.seasons.dormant || []).includes(W.season);
    if (wx.fi) C.push({ k: 'fire', w: 0.95 });
    if (W.road && !W.road.bridge) C.push({ k: 'road', w: 0.88 });
    if ((wx.dr || 0) > 0.35 || wx.ht) C.push({ k: biome.id === 'grove' && W.season === 'summer' && !wx.ht && (wx.dr || 0) < 0.55 ? 'summer' : 'drought', w: 0.55 + (wx.dr || 0) * 0.35 });
    if (wx.fl) C.push({ k: 'flood', w: 0.6 });
    // plants that do not get enough light (the struggle for light)
    const shaded = alivePl.filter(p => p.sp.kind !== 'fungus' && p.sp.kind !== 'water-plant' && !dormant(p.sp) && p.light < (p.sp.lightNeed ?? 0.5) * 0.6);
    if (shaded.length >= 2) {
      const ids = uniq(shaded.map(p => p.sp.id));
      C.push({ k: 'dark', a: ids.slice(0, 3), n: shaded.length, w: 0.45 + Math.min(0.4, shaded.length * 0.05) + (biome.id === 'amazon' ? 0.05 : 0) });
    }
    // flowers that bloomed today with none of their pollinators on the island
    const present = new Set(Object.keys(census().sp));
    const lonely = uniq((day.bl || []).filter(id => { const sp = reg.byId.get(id); return sp && sp.pollinators.length && present.has(id) && !sp.pollinators.some(x => present.has(x)); }));
    if (lonely.length) {
      const helpers = uniq(lonely.flatMap(id => reg.byId.get(id).pollinators)).sort((a, b) => (W.unlocked.has(b) - W.unlocked.has(a)));
      C.push({ k: 'pollinators', a: lonely.slice(0, 3), b: helpers.slice(0, 2), w: 0.72 });
    }
    // hungry animals
    const hungry = W.animals.filter(a => counted(a) && a.type === 'animal' && a.energy < 0.3 && a.sp.diet2.length);
    if (hungry.length) {
      const ids = uniq(hungry.map(a => a.sp.id));
      const food = uniq(ids.flatMap(id => reg.byId.get(id).diet2.map(e => e.to))).filter(id => reg.byId.has(id));
      C.push({ k: 'hungry', a: ids.slice(0, 3), b: food.slice(0, 3), w: 0.6 + Math.min(0.25, hungry.length * 0.05) });
    }
    // fruit that nobody carries away
    const grownFruit = alivePl.filter(p => p.growth > 0.6 && p.sp.dispersers.length && !p.sp.dispersers.some(x => present.has(x)));
    if (grownFruit.length >= 2) { const ids = uniq(grownFruit.map(p => p.sp.id)); C.push({ k: 'dispersers', a: ids.slice(0, 2), b: uniq(ids.flatMap(id => reg.byId.get(id).dispersers)).slice(0, 2), w: 0.4 }); }
    const nAnimals = W.animals.filter(counted).length;
    if (!nAnimals) C.push({ k: 'noanimals', w: 0.58 });
    if (present.size < 5) C.push({ k: 'few', n: present.size, w: 0.5 });
    if ((day.v1 ?? W.vitality) < 0.3) C.push({ k: 'weak', w: 0.52 });
    C.sort((a, b) => b.w - a.w);
    const top = C[0];
    if (!top) return { k: 'ok' };
    delete top.w; return top;
  }

  // ───────────────────────────── one fact about a species that was active today
  function pickFact(day, sp) {
    const prev = new Set(days.slice(-4).map(d => d.fx).filter(Boolean));
    const alive = Object.keys(sp || census().sp);
    let pool = (day.ac || []).filter(id => alive.includes(id) && reg.byId.get(id)?.fact);
    if (!pool.length) pool = alive.filter(id => reg.byId.get(id)?.fact);
    if (!pool.length) return null;
    const fresh = pool.filter(id => !prev.has(id));
    const list = fresh.length ? fresh : pool;
    return list[(day.d * 7 + 3) % list.length];
  }

  // ───────────────────────────── turning a day into words (for the screen and the printout)
  const nm = (id) => reg.byId.get(id)?.name || id;
  const names = (ids, max = 4) => { const n = ids.map(nm); return n.length > max ? n.slice(0, max).join(', ') + ` ועוד ${n.length - max}` : n.join(', '); };
  const isPlant = (id) => !!reg.byId.get(id)?.isPlant;
  const pick = (k, full) => kids ? k : full;

  function happenings(d) {
    const out = [];
    const prev = days.find(x => x.d === d.d - 1);
    if (biome.id === 'grove' && d.s && prev && prev.s && prev.s !== d.s) out.push({ ic: 'season', t: `התחילה עונת ה${SEASON_NAMES[d.s]}.` });
    for (const [eid, cid] of d.ev || []) {
      const e = missions.events.find(x => x.id === eid); if (!e) continue;
      if (cid === 'listener') { out.push({ ic: 'event', t: 'מאזין היער שמע מסור חשמלי, ושומרי היער עצרו את הכריתה בזמן.' }); continue; }
      const c = e.choices.find(x => x.id === cid);
      out.push({ ic: 'event', t: e.title, sub: c ? (kids ? `בחרתם: ${c.label}.` : `בחרתם: ${c.label}. ${firstSentence(c.outcome)}`) : '' });
    }
    for (const mid of d.ms || []) { const m = missions.missions.find(x => x.id === mid); if (m) out.push({ ic: 'mission', t: `השלמתם משימה: ${m.title}` }); }
    if (d.nw && d.nw.length) out.push({ ic: 'new', t: pick(`חדשים ${zoneWord('in')}: ${names(d.nw)}`, `מינים חדשים ${zoneWord('in')}: ${names(d.nw)}.`) });
    if (d.nd) {
      const ed = (d.dc || []).map(k => reg.edges.find(e => e.key === k)).filter(Boolean);
      if (ed.length && !kids) out.push({ ic: 'link', t: d.nd === 1 ? 'גיליתם קשר חדש ברשת החיים:' : `גיליתם ${d.nd} קשרים חדשים ברשת החיים. למשל:`, sub: ed[0].text });
      else out.push({ ic: 'link', t: d.nd === 1 ? 'גיליתם קשר חדש ברשת החיים!' : `גיליתם ${d.nd} קשרים חדשים ברשת החיים!` });
    }
    if (biome.id === 'grove' && (d.bl || []).length) {
      const fl = d.bl.filter(id => isPlant(id) && reg.byId.get(id)?.kind !== 'fungus');
      if (fl.length) out.push({ ic: 'bloom', t: `פרחו היום: ${names(fl)}.` });
    }
    if (d.po) out.push({ ic: 'bloom', t: pick(d.po === 1 ? 'פרח אחד קיבל אבקה.' : `${d.po} פרחים קיבלו אבקה.`, d.po === 1 ? 'פעם אחת הועברה אבקה מפרח לפרח.' : `${d.po} פעמים הועברה אבקה מפרח לפרח.`) });
    if (d.di) out.push({ ic: 'seed', t: d.di === 1 ? 'בעל חיים אחד הפיץ זרע למקום חדש.' : `בעלי החיים הפיצו ${d.di} זרעים למקומות חדשים.` });
    if (d.bi) out.push({ ic: 'paw', t: d.bi === 1 ? `נולד ${zoneWord('in')} צאצא חדש.` : `נולדו ${zoneWord('in')} ${d.bi} צאצאים חדשים.` });
    if (d.gr) out.push({ ic: 'tree', t: biome.id === 'reef' ? (d.gr === 1 ? 'אלמוג או צמח אחד גדל עד הסוף.' : `${d.gr} אלמוגים וצמחים גדלו עד הסוף.`) : d.gr === 1 ? 'צמח אחד גדל עד הסוף.' : `${d.gr} צמחים גדלו עד הסוף.` });
    if (d.lo && d.lo.length) out.push({ ic: 'gone', t: pick(`כבר לא ${zoneWord('in')}: ${names(d.lo)}`, `כבר לא נמצאים ${zoneWord('in')}: ${names(d.lo)}.`) });
    else if (d.de >= 2 && !kids) out.push({ ic: 'gone', t: biome.id === 'reef' ? `${d.de} אלמוגים וצמחים נחלשו.` : `${d.de} צמחים נחלשו ונבלו.` });
    if (!out.length) out.push({ ic: 'calm', t: pick(`יום שקט ${zoneWord('in')}.`, `יום שקט ${zoneWord('in')}. זה זמן טוב להתבונן ולגלות קשרים.`) });
    return kids ? out.slice(0, 4) : out.slice(0, 7);
  }

  function challengeText(ch) {
    const a = ch.a || [], b = ch.b || [];
    if (biome.id === 'reef') {   // the reef has its own words: water, corals, the sea floor
      switch (ch.k) {
        case 'drought': return { t: 'מים חמים', p: 'המים בשונית התחממו, וחלק מהאלמוגים נחלשו.', tip: 'מצוף חיישנים מזהיר מראש. אלמוגי אילת עמידים לחום יותר מאלמוגים בים אחרים.' };
        case 'flood': return { t: 'שיטפון מהוואדי', p: 'שיטפון ירד מההרים והביא בוץ לים, והמים נעשו עכורים.', tip: 'עשב ים מחזיק את החול בקרקעית.' };
        case 'dark': return { t: 'חסר אור', p: `${ch.n} אלמוגים וצמחים לא מקבלים מספיק אור, כי אלמוגים גדולים מצלים עליהם${a.length ? ` (${names(a, 3)})` : ''}.`, tip: 'אלמוגים שאוהבים אור גדלים במים הרדודים, ואלמוגים רכים מסתדרים גם במדרון.' };
        case 'weak': return { t: 'השונית חלשה', p: 'החיוניות של השונית נמוכה: חלק מהאלמוגים חלשים ובעלי החיים לא שבעים.', tip: 'בדקו בכרטיס של כל מין מה חסר לו.' };
        case 'ok': return { t: 'השונית מאוזנת', p: 'לא מצאנו היום בעיה גדולה. כל הכבוד, חוקרים!', tip: 'נסו לגלות עוד קשר אחד ברשת החיים.', good: true };
        default: break;
      }
    }
    switch (ch.k) {
      case 'fire': return { t: 'אש ביער', p: pick('הייתה אש ביער. הצמחים יצמחו שוב לאט.', 'שריפה פגעה בחלק מהיער. עכשיו צריך זמן: חלק מהצמחים יצמחו מהשורשים, ואחרים מזרעים.'), tip: 'שתלו צמחים במקום הריק, וחכו שהיער יתאושש.' };
      case 'road': return { t: 'כביש חוצה את היער', p: 'בעלי החיים שהולכים על הקרקע לא יכולים לעבור מצד לצד, והיער חתוך לשניים.', tip: 'לחצו על הכביש כדי לבנות מעבר אקולוגי.' };
      case 'summer': return { t: 'קיץ יבש', p: 'בקיץ לא יורד גשם. הצמחים חוסכים מים, והרקפות והכלניות נחות מתחת לאדמה.', tip: 'עצים ירוקי עד כמו האלון והחרוב נותנים צל ומחסה בימים החמים.' };
      case 'drought': return { t: 'יובש וחום', p: 'כמעט לא היו מים ביער, והצמחים הקטנים התייבשו ראשונים.', tip: biome.id === 'amazon' ? 'חופה צפופה של עצים שומרת על לחות מתחתיה.' : 'עצים ושיחים ירוקי עד עוזרים ליער לעבור את היובש.' };
      case 'flood': return { t: 'הצפה', p: 'הנהר עלה, והצמחים שליד המים קיבלו יותר מדי מים.', tip: 'דקלי אסאי מסתדרים טוב ליד מים.' };
      case 'dark': return { t: 'חסר אור בקרקעית', p: `${ch.n} צמחים לא מקבלים מספיק אור, כי העצים הגבוהים מסתירים להם את השמש${a.length ? ` (${names(a, 3)})` : ''}.`, tip: 'שתלו צמחים שאוהבים צל, או חכו לפתח של אור בחופה.' };
      case 'pollinators': return { t: 'פרחים בלי מאביקים', p: `${names(a, 3)} ${a.length === 1 ? gw(a[0], 'פרח', 'פרחה', 'פרחו', 'פרחו') : 'פרחו'}, אבל אף אחד לא מעביר אבקה בין הפרחים, ולכן כמעט לא יהיו פירות.`, tip: b.length ? `אפשר להביא ${b.length === 1 ? 'את ' + defName(b[0], nm(b[0])) : names(b, 2)}.` : 'חפשו במגש מי שותה צוף.' };
      case 'hungry': return { t: 'בעלי חיים רעבים', p: `${names(a, 3)} ${a.length === 1 ? gw(a[0], 'רעב', 'רעבה', 'רעבים', 'רעבות') : 'רעבים'} ולא ${a.length === 1 ? gw(a[0], 'מוצא', 'מוצאת', 'מוצאים', 'מוצאות') : 'מוצאים'} מספיק אוכל.`, tip: b.length ? `${a.length === 1 ? gw(a[0], 'הוא אוכל', 'היא אוכלת', 'הם אוכלים', 'הן אוכלות') : 'הם אוכלים'}: ${names(b, 3)}. שתלו או הביאו עוד.` : `הביאו עוד אוכל ${zoneWord('lamed')}.` };
      case 'dispersers': return { t: 'פירות שאף אחד לא מפזר', p: `ל${names(a, 2)} יש פירות, אבל אין ${zoneWord('in')} מי שיאכל אותם ויפזר את הזרעים רחוק.`, tip: b.length ? `אפשר להביא: ${names(b, 2)}.` : '' };
      case 'noanimals': return { t: 'אין עדיין בעלי חיים', p: `${zoneWord('in')} יש צמחים, אבל אין מי שיאכל, יאביק ויפזר זרעים.`, tip: 'גררו בעל חיים ראשון מהמגש.' };
      case 'few': return { t: 'מעט מינים', p: `${zoneWord('in')} חיים רק ${ch.n} מינים. מקום עם הרבה מינים שונים חזק יותר.`, tip: `הוסיפו מין חדש שקשור לאחד המינים שכבר ${zoneWord('in')}.` };
      case 'weak': return { t: 'היער חלש', p: 'החיוניות של היער נמוכה: חלק מהצמחים חלשים ובעלי החיים לא שבעים.', tip: 'בדקו בכרטיס של כל מין מה חסר לו.' };
      default: return { t: 'היער מאוזן', p: 'לא מצאנו היום בעיה גדולה. כל הכבוד, חוקרים!', tip: 'נסו לגלות עוד קשר אחד ברשת החיים.', good: true };
    }
  }

  const WX = { r: 'גשם', st: 'סערה', ht: 'חום', fl: 'הצפה', fi: 'אש' };
  function weatherList(d) {
    const wx = d.wx || {}, out = [];
    if (wx.fi) out.push({ k: 'fire', t: WX.fi });
    if (wx.st) out.push({ k: 'storm', t: WX.st }); else if (wx.r) out.push({ k: 'rain', t: WX.r });
    if (wx.fl) out.push({ k: 'flood', t: WX.fl });
    if (wx.ht) out.push({ k: 'heat', t: WX.ht });
    if ((wx.dr || 0) > 0.35 && !wx.ht) out.push({ k: 'dry', t: 'יובש' });
    if (!out.length) out.push({ k: 'sun', t: biome.id === 'amazon' ? 'חם ולח' : biome.id === 'reef' ? 'מים צלולים' : 'נעים' });
    return out;
  }

  // the full display model of one day (the running day is computed live)
  // a source that fits the day: one whose species lived in the forest that day (the day's fact species first);
  // otherwise one of the general ones. The same day always shows the same source.
  function dailySource(d, ids) {
    const have = new Set(ids);
    const fit = DAILY.filter(x => x.sp.length && (x.sp.includes(d.fx) || x.sp.some(id => have.has(id))));
    const first = fit.filter(x => x.sp.includes(d.fx));
    const pool = first.length ? first : fit.length ? fit : DAILY.filter(x => !x.sp.length);
    return pool[(d.d * 7 + 3) % pool.length];
  }
  function describe(dayN) {
    const live = dayN === W.day;
    let d = live ? cur : days.find(x => x.d === dayN);
    if (!d) return null;
    if (live) { d = { ...cur, wx: { ...cur.wx } }; closeDay(d); }
    const sp = d.sp || {};
    const ids = Object.keys(sp).sort((x, y) => (isPlant(y) - isPlant(x)) || (sp[y] - sp[x]));
    const chips = ids.map(id => ({ id, name: nm(id), count: sp[id], plant: isPlant(id), thumb: thumbs[id] || null, color: reg.byId.get(id)?.color, isNew: (d.nw || []).includes(id) }));
    const fs = d.fx && reg.byId.get(d.fx);
    // vitality at the end of each day (the running day: right now); a window of up to 10 days around the shown day
    const all = [...days.map(x => ({ d: x.d, v: x.v1 })), ...(cur ? [{ d: cur.d, v: r2(W.vitality), live: true }] : [])].filter(p => Number.isFinite(p.v));
    const at = Math.max(0, all.findIndex(p => p.d === d.d));
    const end = Math.min(all.length, Math.max(at + 1, Math.min(all.length, at + 4))), start = Math.max(0, end - 10);
    const spark = all.slice(start, end).map(p => ({ ...p, sel: p.d === d.d }));
    const known = [...days.map(x => x.d), ...(cur ? [cur.d] : [])];
    const player = (() => { try { return profiles.current()?.name || ''; } catch (e) { return ''; } })();
    return {
      kids, biomeId: biome.id, forest: biome.name, player, day: d.d, live,
      season: d.s ? SEASON_NAMES[d.s] : null, seasonId: d.s || null,
      weather: weatherList(d),
      counts: { plants: d.pl || 0, animals: d.an || 0, species: ids.length, total: biome.species.length },
      chips, lost: (d.lo || []).map(nm),
      happenings: happenings(d),
      challenge: challengeText(d.ch || { k: 'ok' }),
      fact: fs ? { id: fs.id, name: fs.name, text: kids ? firstSentence(fs.fact) : fs.fact, art: CARD_ART[fs.id] || null, thumb: thumbs[fs.id] || null, color: fs.color } : null,
      source: TORAH && sourcesOn() ? dailySource(d, ids) : null,   // torah edition: "מקור היום"
      vit: { start: d.v0, end: d.v1, spark },
      note: d.n || '',
      prev: known.filter(x => x < d.d).pop() ?? null,
      next: known.find(x => x > d.d) ?? null,
      first: known[0], count: known.length,
    };
  }

  // ───────────────────────────── the screen
  const view = createReportUI(root, {
    describe: (n) => describe(n),
    onNote(dayN, text) {
      const t = String(text || '').slice(0, NOTE_MAX);
      const d = dayN === W.day ? cur : days.find(x => x.d === dayN);
      if (d) d.n = t;
    },
    onClose() { try { audio.play('click'); } catch (e) { } W.saveGame?.(true); },
    onExport: exportPDF,
  });
  function openReport(dayN) {
    ui.cancelDrag?.();
    try { audio.play('select'); } catch (e) { }
    view.open(dayN);
  }
  function promptEnded(dayN) {
    const n = days.find(x => x.d === dayN);
    if (!n) return;
    view.prompt(kids ? `יום ${dayN} נגמר! רוצים לכתוב מה ראיתם?` : `יום ${dayN} הסתיים – רוצים לכתוב את דוח החוקר?`, () => openReport(dayN));
  }

  // ───────────────────────────── export: desktop → PDF file in Documents, browser → print dialog
  const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
  async function exportPDF(model) {
    W.saveGame?.(true);
    const desk = window.wolDesktop;
    if (desk && typeof desk.saveReportPDF === 'function') {
      const base = safeName(`${model.forest}${model.player ? ` (${model.player})` : ''}-יום-${model.day}`);
      try {
        const r = await desk.saveReportPDF(base);
        if (r && r.ok) { ui.toast(`הדוח נשמר: מסמכים ← רשת החיים – דוחות ← ${r.name || base + '.pdf'}`, 'good'); try { audio.play('points'); } catch (e) { } return; }
        ui.toast('לא הצלחתי לשמור את הדוח כקובץ. אפשר לנסות שוב.', 'bad');
      } catch (e) { ui.toast('לא הצלחתי לשמור את הדוח כקובץ. אפשר לנסות שוב.', 'bad'); }
      return;
    }
    try { window.print(); } catch (e) { ui.toast('ההדפסה לא זמינה במחשב הזה', 'warn'); }
  }

  return api;
}
