// סדנת הרובוט (1.4.3, set 2): the table set 4 builds its missions from (Avi, 1.11: about 30 missions, six in each zone,
// each zone its own style, every mission a small story with stages, a surprise and an end; at least three ways that work).
// Pure data; tests/robolab/build.mjs checks it (every zone has six slots, every form appears, every slot names what it
// tests in the engine). The texts here are working titles for the development, not words the child sees yet.

// the forms a mission takes (they change from mission to mission inside a zone)
export const SHAPES = {
  rescue: { f: 'הצלה נגד השעון', test: ['steps'] },              // a goal with { t: 'steps', max }
  chain: { f: 'שרשרת פעולות', test: ['order'] },                  // several items, one after another, each needs its tool
  count: { f: 'ספירה ודיווח', test: ['report', 'reports'] },      // the counter and the report
  reverse: { f: 'חידה הפוכה', test: ['fix'] },                     // a robot and a program that fail: find what to change
  change: { f: 'משימה שמשתנה באמצע', test: ['event'] },           // an event (sunset, a signal, an animal) turns the plan
};

// what each zone is about, and what of the engine it leans on (build.js numbers, world.js cells and items, events)
export const ZONE_STYLES = {
  amazon: { f: 'גובה ושכבות', leans: ['drone', 'light', 'distance', 'mud', 'narrow'], why: 'רחפן עולה מקומה לקומה, רובוט בחושך של הקרקע, בוץ וגזעים צרים' },
  grove: { f: 'תזמון ועונות', leans: ['sunset', 'msg', 'fire', 'thirsty', 'humidity'], why: 'העיקר מתי, לא איפה: הגשם הראשון, שריפה, השקיה בזמן' },
  reef: { f: 'זרם ועדינות', leans: ['sub', 'gentle', 'coral', 'net'], why: 'צוללן נגד זרם, איסוף בלי לשבור אלמוג, מצוף ששולח הודעות' },
  desert: { f: 'חיסכון ותכנון', leans: ['battery', 'sand', 'solar', 'seeds', 'water'], why: 'סוללה ומים מוגבלים, חול, לילה, חזרה לטעינה' },
  savanna: { f: 'צוות ותצפית', leans: ['launch', 'land', 'link', 'camera', 'push'], why: 'רובוט שמשגר וקולט רחפן, שני כלים יחד, מעקב בלי להבהיל' },
};

// the levels (Avi, 28.10: learn first, then rising difficulty; time limits, caution leaves and points come slowly)
export const LEVELS = {
  kids: { f: 'מתחילים', build: 'preset', choices: 3, time: false, leaves: false },      // a ready robot (workshop.js PRESETS) and three choices
  middle: { f: 'בינוני', build: 'free', choices: null, time: false, leaves: true },     // the parts earned so far; caution leaves instead of failing
  expert: { f: 'מתקדמים', build: 'free', choices: null, time: true, leaves: true },     // a time limit, tokens, a change in the middle
};

// six slots in each zone: the form, a working title, and what in the engine it tests (so no two feel the same)
export const SLOTS = {
  amazon: [
    { shape: 'chain', t: 'מהקרקע לצמרת', tests: ['launch', 'land', 'light'] },
    { shape: 'rescue', t: 'גוזל שנפל', tests: ['steps', 'gentle', 'reach'] },
    { shape: 'count', t: 'כמה קופים בחופה', tests: ['camera', 'report'] },
    { shape: 'reverse', t: 'הרובוט ששקע בבוץ', tests: ['mud', 'fix'] },
    { shape: 'change', t: 'גשם של אחר הצהריים', tests: ['event', 'narrow'] },
    { shape: 'chain', t: 'זרעים לאגוטי', tests: ['seeds', 'distance'] },
  ],
  grove: [
    { shape: 'change', t: 'הגשם הראשון', tests: ['event', 'humidity'] },
    { shape: 'rescue', t: 'שריפה ביער', tests: ['steps', 'spray', 'water'] },
    { shape: 'chain', t: 'שתילה לפני החורף', tests: ['seeds', 'slope'] },
    { shape: 'count', t: 'ספירת כלניות', tests: ['color', 'reports'] },
    { shape: 'reverse', t: 'הרובוט שהשקה את השביל', tests: ['humidity', 'fix'] },
    { shape: 'change', t: 'עד השקיעה', tests: ['sunset', 'light'] },
  ],
  reef: [
    { shape: 'chain', t: 'משתלת אלמוגים', tests: ['coral', 'gentle'] },
    { shape: 'rescue', t: 'רשת על השונית', tests: ['steps', 'net', 'gentle'] },
    { shape: 'count', t: 'דגים בתחנת הניקוי', tests: ['camera', 'report'] },
    { shape: 'change', t: 'המצוף שולח אות', tests: ['msg', 'link'] },
    { shape: 'reverse', t: 'הצבת ששברה אלמוג', tests: ['gentle', 'fix'] },
    { shape: 'chain', t: 'מים רדודים, מים עמוקים', tests: ['float', 'propeller'] },
  ],
  desert: [
    { shape: 'chain', t: 'טפטוף לשיטות', tests: ['water', 'battery'] },
    { shape: 'rescue', t: 'לפני סופת החול', tests: ['steps', 'sand'] },
    { shape: 'reverse', t: 'הרובוט שנתקע בחול', tests: ['sand', 'fix'] },
    { shape: 'change', t: 'הלילה יורד', tests: ['sunset', 'solar', 'battery'] },
    { shape: 'count', t: 'עקבות בחול', tests: ['color', 'reports'] },
    { shape: 'chain', t: 'הביתה לטעינה', tests: ['battery', 'home'] },
  ],
  savanna: [
    { shape: 'chain', t: 'רחפן יוצא, רחפן חוזר', tests: ['launch', 'land'] },
    { shape: 'change', t: 'העדר עובר', tests: ['event', 'camera'] },
    { shape: 'chain', t: 'שני רובוטים וכוורת', tests: ['link', 'lift'] },
    { shape: 'rescue', t: 'סלעים בדרך למים', tests: ['push', 'steps'] },
    { shape: 'count', t: 'ספירת עדר מהאוויר', tests: ['camera', 'report'] },
    { shape: 'reverse', t: 'הרובוט שלא עלה על הגבעה', tests: ['slope', 'fix'] },
  ],
};
