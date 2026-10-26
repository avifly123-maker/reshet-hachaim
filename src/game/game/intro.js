// The first minutes in a zone: the "איך משחקים" cards (showHowto), the step-by-step coach, the points counter's
// explanation (a click on it), and startIntro (cards, coach or רובו־דע). Owns ctx.howtoBox and ctx.coachStep.
// Gives ctx: showHowto, startCoach, coachNext, explainPoints, ptsEl, startIntro.
// Takes from ctx: the names destructured at the top of createIntro.
// Shared state it reads or changes: ctx.howtoBox, ctx.disposed, ctx.coachStep.
import { CARD_ART } from '../../data/card-art.js';
import { K, readPlayerRaw, writePlayerRaw } from '../../core/storage.js';
import { howto } from '../../ui/howto.js';
import { zoneHowto, HOWTO_LABELS } from '../../data/howto-cards.js';
import { zoneWord } from '../../core/place.js';

export function createIntro(ctx) {
  const { W, biome, thumbs, ui, on, missions, robo } = ctx;

  // "איך משחקים": four short cards the first time the child enters this zone (src/ui/howto.js, src/data/howto-cards.js);
  // the step-by-step coach (first forest only) follows them. The menu's "איך משחקים" shows them again.
  ctx.howtoBox = null;
  function showHowto(force, after) {
    if (W.research || (ctx.howtoBox && ctx.howtoBox.open)) return null;
    const cards = zoneHowto(biome.id, W.kids, (id) => CARD_ART[id] || thumbs[id] || null);
    ctx.howtoBox = howto(document.getElementById('ui'), cards, { key: 'zone-' + biome.id, force, onClose: () => { ctx.howtoBox = null; if (after && !ctx.disposed) after(); }, labels: W.kids ? HOWTO_LABELS.kids : HOWTO_LABELS.full, title: (W.kids ? HOWTO_LABELS.kids : HOWTO_LABELS.full).title });
    return ctx.howtoBox;
  }

  // tutorial
  const COACH = [
    { text: `ברוכים הבאים ל${biome.name}! ${biome.id === 'amazon' ? 'כאן כל צמח נאבק כדי להגיע אל האור.' : biome.id === 'reef' ? 'כאן כמעט כולם חיים בשותפות: האלמוג והאצות שבתוכו, השושנון ושושנת הים.' : 'כאן העונות מחליטות מתי פורחים, מתי אוכלים ומתי חוסכים מים.'}`, target: null },
    { text: `גררו צמח מהמגש ${zoneWord('to')}. הטבעת הירוקה אומרת שאפשר לשתול, ואחוז האור מראה כמה שמש מגיעה לשם.`, target: 'tray' },
    { text: 'כל צמח ובעל חיים עולה נקודות חיים. הנקודות מצטברות לבד כשהיער חי ובריא, ועוד יותר כשמשלימים משימות ומגלים קשרים. לחיצה על המונה מסבירה הכול.', target: 'hud' },
    { text: 'כאן המשימות שלכם. כל משימה פותחת צמחים, בעלי חיים וכלים חדשים.', target: 'missions' },
    { text: `בלשונית "טכנולוגיה" יש כלים ששומרים על היער: רחפן ניטור, מצלמת שטח, רובוט הצלה ועוד. גוררים אותם ${zoneWord('to')} בדיוק כמו צמחים.`, target: 'tray' },
    { text: 'רוצים לרדת אל תוך היער? בחרו קומה וראו איך האור משתנה מהצמרת ועד הקרקעית.', target: 'layers' },
    { text: '"מפת אור" מראה איפה יש שמש ואיפה צל. "רשת החיים" מראה את כל הקשרים. לחצו על כל צמח או בעל חיים כדי להכיר אותו.', target: 'toolbar' },
  ];
  ctx.coachStep = -1;
  function startCoach(force) {
    const done = readPlayerRaw(K.coach) === '1';
    if (done && !force) return;
    ctx.coachStep = 0; showCoach();
  }
  function showCoach() { const c = COACH[ctx.coachStep]; if (!c) { ui.hideCoach(); ctx.coachStep = -1; writePlayerRaw(K.coach, '1'); return; } ui.coach({ ...c, step: ctx.coachStep + 1, total: COACH.length }); }
  function coachNext() { if (ctx.coachStep < 0) return; ctx.coachStep++; showCoach(); }

  // the points counter explains how life points are earned
  function explainPoints() {
    const perMin = Math.round((W.income || 0.2) * 60);
    ui.showDialog({ title: 'איך צוברים נקודות חיים?', text:
      'נקודות חיים הן האנרגיה של היער. בהן קונים צמחים ובעלי חיים.\n\n' +
      `• היער מייצר נקודות לבד, כל הזמן. ככל שיש יותר מינים חיים והיער בריא יותר – מהר יותר. עכשיו: בערך ${perMin} נקודות בדקה.\n` +
      '• משימה שהושלמה: 25 עד 100 נקודות.\n' +
      '• גילוי קשר חדש ברשת החיים: 5 נקודות.\n' +
      '• עץ שגדל עד הסוף: 4 · זרע שבעל חיים שתל: 2 · צאצא חדש: 2 · האבקה של פרח: 1.\n' +
      '• תשובה נכונה לשאלה בכרטיס של מין: 5 נקודות.\n\n' +
      `טיפ: אם אין מספיק נקודות, הריצו את הזמן מהר יותר (⏩) ותנו ${zoneWord('lamed')} לעבוד.`,
      buttons: [{ id: 'ok', label: 'הבנתי' }] });
  }
  const ptsEl = document.querySelector('#ui .h-pts');
  if (ptsEl) { ptsEl.style.cursor = 'pointer'; ptsEl.style.pointerEvents = 'auto'; ptsEl.title = 'לחצו כדי לראות איך צוברים נקודות'; ptsEl.addEventListener('click', explainPoints); }
  on('drag:denied', ({ reason }) => { if (reason === 'cost') setTimeout(() => ui.toast('לחצו על מונה נקודות החיים למעלה כדי לראות איך צוברים עוד', 'info'), 1200); });

  // the first minute in a zone: "איך משחקים" cards, the coach (a player who never saw it), or רובו־דע (1.3.2)
  const coachSeen = () => readPlayerRaw(K.coach) === '1';
  function startIntro() {
    const fresh = missions.doneCount === 0;
    if (W.xp) { if (fresh) robo('zone:' + biome.id, { tip: false }); return; }   // חוויה: רובו־דע instead of the cards and the coach
    if (W.kids) { const after = W.restored ? null : () => startCoach(false); if (!showHowto(false, after) && after) after(); return; }
    const after = () => { if (ctx.disposed) return; if (!W.restored && !coachSeen()) startCoach(false); else if (fresh) robo('zone:' + biome.id, { tip: false }); };
    if (!showHowto(false, after)) after();
    // 25.10 (Avi): once per player, after a while in the full mode: the חוויה mode has much less to read (the satchel)
    const modeTip = () => {
      if (ctx.disposed || W.xp || W.kids || W.research) return;
      if (W.calmBusy && W.calmBusy()) { setTimeout(modeTip, 20000); return; }
      robo('zone:mode');
    };
    setTimeout(modeTip, 120000);
  }
  return { showHowto, startCoach, coachNext, explainPoints, ptsEl, startIntro };
}
