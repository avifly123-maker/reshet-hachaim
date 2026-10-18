// תעלומה (מתקדמים, החורש): המלכודת.
// At the edge of the grove the spiny mice grew many and ate the seeds. To save the seeds, poison bait boxes were set
// out. At first it seemed to work: fewer mice. But the barn owls and the foxes ate weak, poisoned mice, grew sick and
// left the grove. Now the mice are back, more than before (they breed fast and come in from the fields), and there
// is nobody left to hunt them. Three causes in one loop: (1) the poison is still out and lingers in the food chain;
// (2) the old hollow trees were cleared, so even a healthy owl has nowhere to nest; (3) the bushes along the field
// edge were cleared, so the fox has no cover to live and hunt from. The trap the case is named after: more poison
// brings the mice down for a moment and drives the hunters away for longer. Removing the poison is not enough by
// itself either: the poison stays in the food chain for a while, so owls brought too early fall sick too.
// The fix: take the poison away, hang nest boxes, plant a hedge, and wait patiently until the poison is gone; then
// the owls and the foxes return by themselves. The clock restarts at this level, so the balance must hold.
// Dilemma (early, while the poison is still out): more poison (fast, but the hunters pay) or nest boxes (slow, the
// owls need time).
// Facts (docs/sources.md): barn owls and foxes are harmed when they eat rodents that took poison (secondary
// poisoning, e.g. Newton et al. 1990 on barn owls); Israel's barn owl project hangs nest boxes so that owls, not
// poison, keep the rodents down (Meyrom et al. 2009); the spiny mouse eats seeds; foxes need cover.
// Advanced level: plain Hebrew, three causes in a loop, several traps, the clock restarts. No dead animals are shown:
// sick hunters leave the grove.

export const THE_TRAP = {
  id: 'the-trap',
  zone: 'grove',
  level: 'advanced',
  order: 2,
  title: 'המלכודת',
  plainTitle: 'המלכודת',
  call: 'בשולי החורש שמו רעל לקוצנים. בהתחלה זה עזר. עכשיו יש יותר קוצנים מאשר קודם, ואין אף תנשמת.',
  callMore: 'גם השועלים כבר לא נראים בחורש. הזרעים נעלמים, ואין שיחים צעירים. מה הרעל עשה?',
  holdSeconds: 240,
  model: {
    vars: [
      { id: 'mice', kind: 'animal', init: 150, need: 0.25, birth: 0.014, death: 0.005, hungry: 0.35, leaveHungry: 0.05,
        cap: 300, arrive: 0.4, arriveIf: 0.4, food: true },
      { id: 'owl', kind: 'animal', init: 0, need: 0.15, birth: 0.008, death: 0.002, hungry: 0.5, leaveHungry: 0.06,
        cap: { of: 'nests', per: 3 }, leaveCrowded: 0.07, arrive: 0.035, arriveIf: 0.3, food: true, preyHalf: 15 },
      { id: 'fox', kind: 'animal', init: 0.3, need: 0.15, birth: 0.006, death: 0.002, hungry: 0.5, leaveHungry: 0.05,
        cap: { of: 'cover', per: 1.6, also: [{ of: 'piles', per: 1.3 }] }, leaveCrowded: 0.07, arrive: 0.02, arriveIf: 0.3, food: true, preyHalf: 20 },
      { id: 'nests', kind: 'stock', init: 0 },
      { id: 'cover', kind: 'stock', init: 0.3 },      // bushes along the field edge
      { id: 'bait', kind: 'stock', init: 1 },         // poison bait boxes
      { id: 'toxin', kind: 'stock', init: 40 },       // poison inside the food chain (sick mice)
      { id: 'sage', kind: 'plant', init: 9 },
      { id: 'young', kind: 'plant', init: 0 },
      { id: 'seeds', kind: 'stock', init: 80 },
      { id: 'fruit', kind: 'stock', init: 5 },        // berries on the field-edge bushes: the fox eats them too
      { id: 'snags', kind: 'stock', init: 0 },        // old hollow trees left standing: in time a hollow opens wide enough for an owl
      { id: 'piles', kind: 'stock', init: 0 },        // piles of branches at the field edge: cover for the fox, and for the mice too
      { id: 'feeder', kind: 'stock', init: 0 },       // a feeder that pours grain for the mice every day, so they leave the seeds alone
      { id: 'grain', kind: 'stock', init: 0 },
    ],
    flows: [
      { type: 'produce', from: 'sage', to: 'seeds', rate: 3.2, byCap: 2500, season: { winter: 0.6, spring: 1.5, summer: 1.1, autumn: 0.7 } },
      { type: 'consume', eater: 'mice', food: 'seeds', need: 0.25, half: 140 },
      { type: 'prey', pred: 'owl', prey: 'mice', attack: 0.02, handling: 2.2, refuge: 12, refugeOf: { of: 'piles', per: 40 } },
      { type: 'prey', pred: 'fox', prey: 'mice', attack: 0.014, handling: 2.6, refuge: 12, refugeOf: { of: 'piles', per: 40 } },
      { type: 'produce', from: 'feeder', to: 'grain', rate: 70, byCap: 2000 },
      { type: 'consume', eater: 'mice', food: 'grain', need: 0.25, half: 140 },
      { type: 'decay', of: 'grain', rate: 0.003 },
      { type: 'mature', from: 'snags', to: 'nests', rate: 1 / 120, cap: 6 },
      { type: 'produce', from: 'cover', to: 'fruit', rate: 2.5, byCap: 120 },
      { type: 'consume', eater: 'fox', food: 'fruit', need: 0.1, half: 20 },
      { type: 'decay', of: 'fruit', rate: 0.01 },
      // the bait kills mice, and part of every poisoned mouse stays in the food chain as poison
      { type: 'consume', eater: 'bait', food: 'mice', need: 1.6, half: 60, cache: { to: 'toxin', share: 0.6 } },
      // poison in the food chain makes the hunters sick: they leave the grove
      { type: 'consume', eater: 'toxin', food: 'owl', need: 0.0025, half: 0.5 },
      { type: 'consume', eater: 'toxin', food: 'fox', need: 0.0018, half: 0.5 },
      { type: 'decay', of: 'toxin', rate: 0.009 },
      { type: 'germinate', from: 'seeds', to: 'young', rate: 0.0035, yield: 0.02, season: { winter: 1.6, spring: 1.1, summer: 0.55, autumn: 0.9 } },
      { type: 'mature', from: 'young', to: 'sage', rate: 1 / 110, cap: 26 },
      { type: 'decay', of: 'young', rate: 0.004 },
      { type: 'decay', of: 'sage', rate: 0.0009 },
      { type: 'decay', of: 'seeds', rate: 0.002 },
    ],
  },
  lights: [
    { light: 'life', id: 'mice', min: 8, max: 80 },
    { light: 'life', id: 'owl', min: 1.5 },
    { light: 'life', id: 'fox', min: 1 },
    { light: 'life', id: 'sage', min: 6 },
    { light: 'regen', id: 'young', min: 2 },
    { light: 'env', id: 'toxin', max: 4 },
    { light: 'env', id: 'seeds', min: 200 },
  ],
  lightNames: { life: 'ציידים וקוצנים', regen: 'שיחים צעירים', env: 'חורש בלי רעל, זרעים באדמה' },
  board: [
    { id: 'mice', name: 'קוצנים', species: 'spinymouse', tool: 'nightcam' },
    { id: 'owl', name: 'תנשמות', species: 'owl', tool: 'nightcam' },
    { id: 'fox', name: 'שועלים', species: 'fox', tool: 'nightcam' },
    { id: 'bait', name: 'תיבות רעל', icon: 'poison', tool: 'drone', scale: 6 },
    { id: 'toxin', name: 'רעל בשרשרת המזון', icon: 'poison', tool: 'lab' },
    { id: 'nests', name: 'מקומות קינון', icon: 'nestbox', tool: 'drone' },
    { id: 'cover', name: 'שיחים בשולי השדה', icon: 'hedge', tool: 'drone', scale: 10 },
    { id: 'young', name: 'שיחים צעירים', icon: 'sprout', tool: 'quadrat' },
    { id: 'seeds', name: 'זרעים באדמה', icon: 'seed', tool: 'quadrat', scale: 0.1 },
  ],
  visual: [
    { id: 'mice', species: 'spinymouse', scale: 'sqrt', max: 16 },
    { id: 'owl', species: 'owl', max: 6 },
    { id: 'fox', species: 'fox', max: 4 },
    { id: 'sage', species: 'sage', plant: 'adult', max: 26 },
    { id: 'young', species: 'sage', plant: 'young', max: 14 },
  ],
  tools: [
    { id: 'nightcam', name: 'מצלמת לילה', icon: 'camera', tell: 'המצלמה סופרת מי יוצא בלילה: קוצנים, תנשמות ושועלים.' },
    { id: 'drone', name: 'רחפן ספירה', icon: 'drone', tell: 'הרחפן סופר תיבות רעל, מקומות קינון ושיחים בשולי השדה.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים זרעים ונבטים באדמה.' },
    { id: 'lab', kind: 'probe', name: 'בדיקת מעבדה', icon: 'flask', tell: 'בודקים במעבדה כמה רעל יש בקוצנים שבחורש. הרעל עובר למי שאוכל אותם.' },
  ],
  ideas: [
    { id: 'remove', title: 'להוציא את תיבות הרעל', icon: 'poison', amounts: [1], cost: 4, max: 1, effect: { add: { bait: -3 } } },   // all of them, however many were set out
    { id: 'more', title: 'להוסיף עוד רעל', icon: 'poison', amounts: [1], cost: 6, max: 2, effect: { add: { bait: 1 } } },
    { id: 'nestbox', title: 'לתלות תיבת קינון', icon: 'nestbox', amounts: [1], cost: 6, max: 4, effect: { add: { nests: 1 } }, tech: true },
    { id: 'hedge', title: 'לשתול שיחים בשולי השדה', icon: 'hedge', amounts: [1], cost: 7, max: 2, effect: { add: { cover: 1 } } },
    { id: 'owl', title: 'להביא תנשמות', icon: 'species:owl', amounts: [2], cost: 3, perUnit: true, effect: { add: { owl: 1 } } },
    { id: 'move-mice', title: 'להעביר קוצנים למקום אחר', icon: 'species:spinymouse', amounts: [40], cost: 6, effect: { add: { mice: -1 } } },
    { id: 'hollow', title: 'להשאיר עצים זקנים וחלולים', icon: 'hollow', amounts: [1], cost: 3, max: 2, effect: { add: { snags: 1 } } },
    { id: 'piles', title: 'ערימות ענפים בשולי השדה', icon: 'piles', amounts: [1], cost: 3, max: 2, effect: { add: { piles: 1 } } },
    { id: 'grain', title: 'מתקן גרעינים לקוצנים, שיעזבו את הזרעים', icon: 'seed', amounts: [1], cost: 5, max: 1, effect: { add: { feeder: 1, grain: 300 } } },
  ],
  after: {
    remove: { test: 'toxin', below: 4, no: 'התיבות יצאו מהחורש. אבל רעל עוד נשאר בקוצנים, וייקח זמן עד שייעלם.', ok: 'התיבות יצאו, והרעל כבר כמעט נעלם.' },
    more: 'הקוצנים ירדו לרגע. אבל עוד רעל עבר לציידים.',
    nestbox: { test: 'toxin', below: 4, no: 'תיבת הקינון תלויה. תנשמת שתגיע עכשיו עלולה לאכול קוצן מורעל.', ok: 'תיבת הקינון מחכה לתנשמת.' },
    hedge: 'השיחים בשולי השדה ייתנו לשועל מחסה.',
    owl: { test: 'toxin', below: 4, no: 'התנשמות אכלו קוצנים מורעלים, חלו ועזבו.', ok: 'התנשמות צדות, ואין רעל בקוצנים.' },
    'move-mice': 'קוצנים חדשים הגיעו מהשדות.',
    hollow: { test: 'nests', below: 1, no: 'העצים הזקנים נשארו לעמוד. חור גדול מספיק לתנשמת נפתח לאט, בעוד זמן.', ok: 'בעץ הזקן נפתח חור גדול. תנשמת יכולה לקנן בו.' },
    piles: { test: 'piles', below: 1.5, no: 'השועל מצא מחסה בין הענפים.', ok: 'הרבה ערימות ענפים... גם השועל וגם הקוצנים מסתתרים בהן.' },
    grain: { test: 'mice', below: 80, no: 'הקוצנים אכלו גרעינים.', ok: 'הקוצנים אכלו גרעינים, שבעו... והמליטו עוד ועוד גורים.' },
  },
  surprises: [
    { id: 'grain-boom', idea: 'grain', test: 'mice', above: 230, text: 'הפתעה: עם כל כך הרבה אוכל, נולדו המון קוצנים. כשהגרעינים ייגמרו, כולם יחפשו זרעים.' },
    { id: 'piles-hide', idea: 'piles', test: 'piles', above: 1.5, text: 'בתוך הענפים מסתתרים קוצנים. התנשמת והשועל מתקשים לתפוס אותם שם.' },
    { id: 'hollow-nest', idea: 'hollow', test: 'nests', above: 0.9, text: 'בעץ הזקן נפתח חור רחב. תנשמת כבר בודקת אותו.' },
    { id: 'owl-back', idea: 'remove', test: 'owl', above: 1.5, text: 'שמעתם? תנשמת צורחת בלילה. היא חזרה לחורש.' },
    { id: 'fox-back', test: 'fox', above: 1, text: 'שועל עבר בשולי השדה ונעלם בין השיחים.' },
  ],
  mainFix: ['remove', 'nestbox', 'hedge'],
  hints: [
    'כמה רעל יש בקוצנים? בדיקת המעבדה תראה.',
    'מי צד קוצנים בחורש? צריך לספור בלילה.',
    'תנשמת צריכה מקום לקנן, ושועל צריך שיחים להסתתר בהם.',
    'הרעל לא נעלם ביום אחד. גם אחרי שמוציאים את התיבות, צריך לחכות.',
    'עוד רעל הוא המלכודת: הקוצנים יורדים לרגע, והציידים עוזבים לזמן ארוך.',
  ],
  guesses: [
    { id: 'chain', text: 'הרעל עבר מהקוצנים לציידים, ואין להם בית', icon: 'poison', right: true },
    { id: 'little', text: 'שמו מעט מדי רעל', icon: 'poison' },
    { id: 'fields', text: 'הקוצנים באים מהשדות, ואין מה לעשות', icon: 'species:spinymouse' },
    { id: 'seeds', text: 'אין מספיק זרעים', icon: 'seed' },
  ],
  dilemma: {
    at: 50,
    title: 'הקוצנים אוכלים את הזרעים',
    text: 'שומרי השדה אומרים: הקוצנים אוכלים את כל הזרעים. צריך לעשות משהו עכשיו.',
    options: [
      { idea: 'more', plus: 'הקוצנים יירדו מהר', minus: 'עוד רעל יעבור לתנשמות ולשועלים' },
      { idea: 'nestbox', plus: 'תנשמת תצוד קוצנים כל לילה, בלי רעל', minus: 'לוקח זמן עד שהתנשמת מגיעה' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'הרעל יצא מהחורש, התנשמות קיננו בתיבות, השועלים חזרו לשיחים, והקוצנים לא משתלטים על הזרעים.',
  learned: 'רעל נראה כמו פתרון מהיר. אבל הוא עובר בשרשרת המזון ופוגע במי ששומר על האיזון.',
  realStory: 'בישראל תולים אלפי תיבות קינון לתנשמות בשדות. כך התנשמות צדות את המכרסמים, והחקלאים משתמשים בפחות רעל.',
  source: 'nefesh',
  stars: { thrift: 30 },   // remove the bait (4), two nest boxes (12) and one hedge planting (7) = 23; extra boxes or a second hedge cost more
  budget: 60,
  tests: {
    within: 1100,
    traps: {
      'more poison': [{ t: 30, idea: 'more' }],
      'owls into the poison': [{ t: 30, idea: 'owl' }, { t: 40, idea: 'nestbox' }],
      'moving mice away': [{ t: 30, idea: 'move-mice' }, { t: 40, idea: 'move-mice' }],
      'only removing the bait': [{ t: 30, idea: 'remove' }],
      'remove and nest boxes, no hedge': [{ t: 30, idea: 'remove' }, { t: 35, idea: 'nestbox' }, { t: 40, idea: 'nestbox' }],
      'nest boxes and a hedge, poison still out': [{ t: 30, idea: 'nestbox' }, { t: 35, idea: 'nestbox' }, { t: 40, idea: 'hedge' }],
      'grain for the mice': [{ t: 30, idea: 'grain' }],
      'too many branch piles': [{ t: 30, idea: 'remove' }, { t: 35, idea: 'nestbox' }, { t: 40, idea: 'nestbox' }, { t: 45, idea: 'piles' }, { t: 50, idea: 'piles' }],
      'hollow trees, poison still out': [{ t: 30, idea: 'hollow' }, { t: 35, idea: 'hollow' }, { t: 40, idea: 'hedge' }],
    },
    fixes: {
      'remove, nest boxes, a hedge': [{ t: 30, idea: 'remove' }, { t: 35, idea: 'nestbox' }, { t: 40, idea: 'nestbox' }, { t: 45, idea: 'hedge' }],
      'hedge first, remove later': [{ t: 30, idea: 'hedge' }, { t: 35, idea: 'nestbox' }, { t: 40, idea: 'nestbox' }, { t: 120, idea: 'remove' }],
      'more poison first, then the right way': [{ t: 30, idea: 'more' }, { t: 90, idea: 'remove' }, { t: 95, idea: 'nestbox' }, { t: 100, idea: 'nestbox' }, { t: 105, idea: 'hedge' }],
      'hollow trees instead of nest boxes': [{ t: 30, idea: 'remove' }, { t: 35, idea: 'hollow' }, { t: 40, idea: 'hollow' }, { t: 45, idea: 'hedge' }],
      'one branch pile instead of a hedge': [{ t: 30, idea: 'remove' }, { t: 35, idea: 'nestbox' }, { t: 40, idea: 'nestbox' }, { t: 45, idea: 'piles' }],
      'the cheap way: hollow trees and a pile': [{ t: 30, idea: 'remove' }, { t: 35, idea: 'hollow' }, { t: 40, idea: 'hollow' }, { t: 45, idea: 'piles' }],
    },
  },
  scene: {
    season: 1,   // spring
    dayFrac: 0.62,
    decor: [['oak', 0.95, 3], ['carob', 1, 1], ['mastic', 1, 4], ['rockrose', 1, 3], ['anemone', 1, 4]],
    stump: true,
  },
};
