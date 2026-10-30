// מחזיקים את הסביבה – the end of a run (stars by vitality, the saved best, a pack for the first three stars, the summary
// box with a tip when the run was lost) and "איך משחקים?", the illustrated rules (shown the first time and from the ?).
// Gives K: thresholds, starsFor, finish, showHow, hideHow.
// Takes from K: ctx, root, kids, $, Y, totals, ST, save, esc, ROWSH.
// Functions of later parts through late(): render.
// Shared state it reads or changes: K.S, K.biome, K.quiet.
import { icon } from '../../../ui/ui.js';
import { late, layerRow, linksFor, STAR_T } from './data.js';
import { I } from './icons.js';

export function createFinish(K) {
  const { ctx, root, kids, $, Y, totals, ST, save, esc, ROWSH } = K;
  const render = late(K, 'render');   // made by a later part

  /* ── finish */
  const thresholds = () => (kids ? STAR_T.kids : STAR_T.full);
  function starsFor(life) {
    const [t1, t2, t3] = thresholds();
    return life >= t3 ? 3 : life >= t2 ? 2 : life >= t1 ? 1 : 0;
  }
  function loseTip(T) {
    const fails = K.S.results.filter((r) => r === 'no').length, hard = K.S.results.filter((r) => r !== 'gd').length;
    if (K.S.lost === 'wilted') return `כשקלף נובל, שימו עליו קלף חדש – כך ${Y('היער נשאר חי', 'השונית נשארת חיה')}.`;
    if ((K.S.swaps || 0) >= 2) return 'לא כדאי להחליף קלף שכבר מחובר בחוט זהב – שימו קלפים חדשים במקומות ריקים.';
    if (T.threads < 4) return `חפשו קלפים שקשורים למי שכבר ${Y('ביער', 'בשונית')} – כל חוט זהב נותן חִיּוּת.`;
    if (fails * 2 >= hard) return `הסתכלו בצד מה האירוע הבא צריך, והכינו את ${Y('היער', 'השונית')} מראש.`;
    return `נסו לחבר עוד חוטי זהב, ולהכין את ${Y('היער', 'השונית')} לפני כל אירוע.`;
  }
  function finish() {
    K.S.phase = 'end';
    const T = totals();
    const stars = K.S.lost ? 0 : starsFor(T.life);
    K.S.stars = stars;
    if (K.quiet) return; // simulated runs: no storage, no UI
    const lost = stars === 0;
    const [t1, t2, t3] = thresholds();
    const prev = ST.best[K.S.biome] || 0;
    ST.best[K.S.biome] = Math.max(prev, stars); ST.biome = K.S.biome; ST.runs = (ST.runs || 0) + 1;
    let gotPack = false;
    if (stars === 3 && !ST.pack[K.S.biome]) { ST.pack[K.S.biome] = 1; gotPack = true; }
    save();
    if (gotPack) ctx.grantPack(1);
    ctx.sfx(lost ? 'click' : 'mission');
    render();
    const held = K.S.results.filter((r) => r === 'ok').length, hard = K.S.results.filter((r) => r !== 'gd').length;
    const nextT = stars === 1 ? t2 : stars === 2 ? t3 : 0;
    const d = $('.kf-done'); if (!d) return;
    const sum = `<div class="kf-sum"><span>${I.life} חִיּוּת ${T.life}</span><span>${I.thread} ${T.threads} חוטי זהב</span><span>${ctx.STAT_ICON.light} אור ${T.light}</span><span>${Y(ctx.STAT_ICON.water, ctx.STAT_ICON.shelter)} ${Y('מים', 'מחסה')} ${T.water}</span>${K.S.keySaves ? `<span class="kf-skey">${I.key} מין מפתח שמר ${K.S.keySaves === 1 ? 'פעם אחת' : K.S.keySaves + ' פעמים'}</span>` : ''}</div>`;
    d.innerHTML = lost ? `<div class="kf-dbox paper lost">
      <div class="kf-stars">${[0, 1, 2].map(() => `<span>${I.star}</span>`).join('')}</div>
      <h2>${Y('היער נחלש', 'השונית נחלשה')} מדי – נסו שוב!</h2>
      <p>${K.S.lost === 'wilted' ? Y('כל הקלפים ביער נבלו, והיער לא החזיק מעמד.', 'כל הקלפים בשונית נבלו, והשונית לא החזיקה מעמד.') : `בסוף היו ${Y('ליער', 'לשונית')} ${T.life} חִיּוּת. כדי ${Y('שהיער יחזיק', 'שהשונית תחזיק')} מעמד צריך לפחות ${t1}.`}</p>
      ${sum}
      <div class="kf-tip">${I.bulb}<span><b>טיפ:</b> ${esc(loseTip(T))}</span></div>
      <div class="kf-btns">
        <button class="wl-btn go" data-a="again">${icon('again')}נסו שוב</button>
        <button class="wl-btn" data-a="how">${I.quest}<span>איך משחקים?</span></button>
        <button class="wl-btn" data-a="setup">${icon('place')}בחירת מקום</button>
      </div></div>`
      : `<div class="kf-dbox paper">
      <div class="kf-stars">${[0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}">${I.star}</span>`).join('')}</div>
      <h2>${stars === 3 ? Y('ניצחתם! יער חזק ומלא חיים!', 'ניצחתם! שונית חזקה ומלאה חיים!') : stars === 2 ? Y('ניצחתם! היער שלכם פורח!', 'ניצחתם! השונית שלכם פורחת!') : Y('ניצחתם! היער החזיק מעמד!', 'ניצחתם! השונית החזיקה מעמד!')}</h2>
      <p>${Y('היער עבר', 'השונית עברה')} את כל ${K.S.events.length} האירועים, ${Y('והיה מוכן', 'והייתה מוכנה')} ל-${held} מתוך ${hard} אתגרים.</p>
      ${sum}
      <p>${nextT ? `ל-${stars + 1} כוכבים צריך ${nextT} חִיּוּת – עוד ${nextT - T.life}. נסו לחבר עוד חוטי זהב!` : 'שלושה כוכבים – כל הכבוד!'}</p>
      ${gotPack ? `<div class="kf-pack">${I.star}<span>שלושה כוכבים ראשונים ${Y('ביער הזה', 'בשונית')} – קיבלתם חבילת קלפים!</span></div>` : ''}
      ${K.S.borrowed ? `<p style="font-size:.95em">הקלפים השאולים חזרו לערכת ההתחלה. קלפים משלכם מקבלים בחידון ובחבילות.</p>` : ''}
      <div class="kf-btns">
        <button class="wl-btn go" data-a="again">${icon('again')}עוד סיבוב</button>
        <button class="wl-btn" data-a="setup">${icon('place')}בחירת מקום</button>
        <button class="wl-btn gold" data-a="album">${icon('album')}לאלבום</button>
      </div></div>`;
    d.hidden = false;
    if (!lost) ctx.confetti(d.querySelector('.kf-dbox'), stars * 12);
  }

  /* ── "איך משחקים?" – illustrated rules (shown the first time, and from the ? button) */
  function howHTML() {
    const N = kids ? 5 : 8;
    const [t1, t2, t3] = thresholds();
    const b = K.S ? K.S.biome : K.biome;
    const L = linksFor(ctx, b);
    const sp = ctx.CARDS.filter((c) => c.biome === b && c.type === 'species');
    let pair = null;
    for (const a of sp) { if (pair) break; if (!a.art) continue; for (const c of sp) if (c !== a && c.art && L.get(a.sp.id, c.sp.id) && a.sp.animal !== c.sp.animal) { pair = [a, c]; break; } }
    pair = pair || sp.slice(0, 2);
    const plant = sp.find((c) => !c.sp.animal && layerRow(c.sp) === 0 && c.art) || sp[0];
    const tool = ctx.CARD.get(b === 'reef' ? 'tool:buoy' : 'tool:watergen') || ctx.CARDS.find((c) => c.type === 'tool');
    const st = (n) => `<span class="kf-hst">${Array.from({ length: n }, () => I.star).join('')}</span>`;
    const pics = {
      place: `<div class="kf-hp kf-hp-rows">${ROWSH().map((w) => `<i>${w}</i>`).join('')}<div class="kf-hcard">${ctx.cardHTML(plant)}</div></div>`,
      thread: `<div class="kf-hp kf-hp-pair">${ctx.cardHTML(pair[0])}<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M2 20Q30 -4 58 20" stroke="#f0b44c" stroke-width="4" fill="none" stroke-linecap="round"/></svg>${ctx.cardHTML(pair[1])}<b>${I.star}</b></div>`,
      event: `<div class="kf-hp kf-hp-ev"><div class="kf-hev">${Y(I.sun, I.cloud)}<small>${Y('בצורת', 'מים עכורים')}</small></div><div class="kf-hneed"><span>${Y(I.drop + 'מים', ctx.STAT_ICON.shelter + 'מחסה')}</span><span>${I.sun}אור</span><span>${I.thread}קשרים</span></div></div>`,
      tool: `<div class="kf-hp kf-hp-tool">${tool ? ctx.cardHTML(tool) : ''}<b>1</b></div>`,
      stars: `<div class="kf-hp kf-hp-stars"><span>${st(1)}<b>${t1}</b></span><span>${st(2)}<b>${t2}</b></span><span>${st(3)}<b>${t3}</b></span></div>`,
    };
    const steps = kids ? [
      ['place', 'שמים קלף', Y('בכל תור שמים קלף אחד ביער. צמח גדל רק בקומה שלו.', 'בכל תור שמים קלף אחד בשונית. אלמוג או צמח גדל רק בשורה שלו.')],
      ['thread', 'חוט זהב', 'יצורים שקשורים זה לזה מקבלים חוט זהב. כל חוט נותן עוד נקודת חִיּוּת.'],
      ['stars', 'כוכבים', `כל 2 תורות הטבע מביא אירוע. בסוף מקבלים כוכבים לפי החִיּוּת.`],
    ] : [
      ['place', 'שמים קלף', Y('בכל תור שמים קלף אחד ביער. צמח גדל רק בקומה שלו: חופה, ביניים או קרקע.', 'בכל תור שמים קלף אחד בשונית. אלמוג או צמח גדל רק בשורה שלו: מים רדודים, מדרון או קרקעית.')],
      ['thread', 'חוט זהב', 'יצורים שקשורים בטבע מקבלים חוט זהב. כל חוט נותן עוד נקודת חִיּוּת.'],
      ['event', 'הטבע מביא אירוע', Y('כל 2 תורות הטבע הופך קלף ומראה מה היער צריך. יער מוכן מקבל עוד נקודה, ואם לא – קלף אחד נובל.', 'כל 2 תורות הטבע הופך קלף ומראה מה השונית צריכה. שונית מוכנה מקבלת עוד נקודה, ואם לא – קלף אחד נובל.')],
      ['tool', 'כלים עוזרים', 'קלפי טכנולוגיה עוזרים פעם אחת, ולא תופסים את התור.'],
      ['stars', 'כוכבים בסוף', `בסוף מקבלים כוכבים לפי החִיּוּת של ${Y('היער', 'השונית')}.`],
    ];
    const first = !ST.seenHow;
    return `<div class="kf-how" role="dialog" aria-label="איך משחקים">
      <div class="kf-hbox paper${kids ? ' kids' : ''}">
        <div class="kf-hgoal">${I.target}<div><small>המטרה</small><b>${Y('לשמור על היער חי ובריא', 'לשמור על השונית חיה ובריאה')} במשך ${N} אירועים של הטבע</b></div></div>
        <ol class="kf-hsteps">${steps.map(([p, t, x], i) => `<li>${pics[p]}<h4><span>${i + 1}</span>${t}</h4><p>${x}</p></li>`).join('')}</ol>
        <div class="kf-hrar">
          <span class="kf-hr e"><i class="kf-key">${I.key}</i><span><b>נדיר מאוד = מין מפתח.</b> ${Y('אם היער לא מוכן לאירוע – הוא שומר עליו', 'אם השונית לא מוכנה לאירוע – הוא שומר עליה')}, פעם אחת.</span></span>
          <span class="kf-hr r"><i class="kf-rb">${I.star}</i><span><b>נדיר:</b> אם הוא מתחבר בחוט זהב כשמניחים אותו – עוד נקודת חִיּוּת אחת.</span></span>
        </div>
        <div class="kf-hlose">${I.wilt}<span><b>אפשר גם להפסיד:</b> ${kids ? `אם בסוף יש ${Y('ליער', 'לשונית')} פחות מ-${t1} חִיּוּת – ${Y('היער לא החזיק', 'השונית לא החזיקה')} מעמד, ומנסים שוב.` : `אם החִיּוּת של ${Y('היער', 'השונית')} יורדת מתחת ל-${t1} בסוף, או ש${Y('כל היער נובל – היער לא החזיק', 'כל השונית נובלת – השונית לא החזיקה')} מעמד. לא נורא, מנסים שוב!`}</span></div>
        <div class="kf-hleg">
          <span><i class="kf-borrow kf-lb">שאול</i>קלף שקיבלתם בהשאלה לסיבוב הזה (עוד אין לכם אותו באלבום)</span>
          ${kids ? `<span><i class="kf-lt">${I.bulb}רמז</i>שומר היער מראה קלף טוב</span>` : `<span><i class="kf-lt">${I.skip}דילוג</i>מחזירים קלף אחד לחפיסה ומוותרים על התור</span><span><i class="kf-lt w">${I.wilt}נובל</i>קלף חלש שלא נותן חִיּוּת – אפשר לשים עליו קלף חדש</span>`}
        </div>
        <button class="wl-btn go" data-a="howok">${icon('check')}${first && K.S ? 'הבנתי – מתחילים!' : 'הבנתי'}</button>
      </div></div>`;
  }
  function showHow() {
    const host = $('.wl-screen'); if (!host) return;
    const old = host.querySelector('.kf-how'); if (old) old.remove();
    host.insertAdjacentHTML('beforeend', howHTML());
    ctx.sfx('select');
  }
  function hideHow() {
    root.querySelectorAll('.kf-how').forEach((e) => e.remove());
    if (!ST.seenHow) { ST.seenHow = 1; save(); }
    ctx.sfx('click');
  }

  return { thresholds, starsFor, finish, showHow, hideHow };
}
