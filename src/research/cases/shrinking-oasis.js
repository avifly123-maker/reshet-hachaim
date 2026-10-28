// תעלומה (מתקדמים, המדבר): נווה המדבר שהולך ונעלם.
// The spring pool of the oasis gets smaller every year, and the ibex and the sandgrouse that drink there every day are
// leaving. Three causes in a loop: (1) a big new grove of date palms was planted around the spring and watered by
// flooding, so the palms drink most of the water; (2) a camel herd stays by the water and eats the shrubs around it;
// (3) without shrubs the wind blows sand into the pool and fills it. Less water and fewer shrubs make the herd crowd
// even closer to the spring. The usual route: drip lines for the palms, a trough for the camels far from the spring,
// and sand fences. Other ways: moving part of the palms away, a fence round the spring, white broom bushes. Traps:
// more palms ("more dates!"), digging the pool deeper (the sand fills it again), bringing ibex (no water for them),
// a fog net alone (too little water), moving the camels without a place to go (they come back).
// Facts (desert.js + docs/sources.md "המדבר"): the date palm needs much water close to its roots; drip irrigation gives
// water right at the roots and saves water; ibex and sandgrouse drink almost every day; overgrazing bares the soil and
// lets the wind move sand; sand fences and shrubs stop blowing sand; a fog net gathers a little water from morning fog.
// Advanced level: plain Hebrew, three causes in a loop, several traps, the clock restarts.

export const SHRINKING_OASIS = {
  id: 'shrinking-oasis',
  zone: 'desert',
  level: 'advanced',
  order: 4,
  title: 'נווה המדבר שהולך ונעלם',
  plainTitle: 'נווה המדבר שהולך ונעלם',
  call: 'הבריכה של המעיין קטנה משנה לשנה. היעלים והקטות, ששותים כאן כל יום, הולכים ומתמעטים.',
  callMore: 'המעיין נובע כמו תמיד. אז לאן הולכים המים?',
  holdSeconds: 240,
  model: {
    vars: [
      { id: 'spring', kind: 'stock', init: 1 },
      { id: 'pool', kind: 'stock', init: 40 },
      { id: 'palms', kind: 'plant', init: 14 },       // date palms watered by flooding the ground
      { id: 'dripPalms', kind: 'plant', init: 0 },    // date palms on drip lines
      { id: 'camels', kind: 'animal', init: 6, need: 0.02, birth: 0, death: 0, cap: { of: 'open', per: 6 }, leaveCrowded: 0.15, arrive: 0.2, arriveIf: 0 },
      { id: 'open', kind: 'stock', init: 1, min: 0 },   // how open the spring is to the herd (1 open, 0 kept away)
      { id: 'shrubs', kind: 'plant', init: 4 },
      { id: 'sand', kind: 'stock', init: 40 },
      { id: 'fences', kind: 'stock', init: 0 },
      { id: 'fog', kind: 'stock', init: 0 },
      { id: 'wind', kind: 'stock', init: 1 },
      { id: 'ibex', kind: 'animal', init: 3, need: 0.2, birth: 0.015, death: 0.006, hungry: 0.5, leaveHungry: 0.06, cap: 9, arrive: 0.15, arriveIf: 0.53, food: true },
      { id: 'grouse', kind: 'animal', init: 5, need: 0.1, birth: 0.02, death: 0.008, hungry: 0.5, leaveHungry: 0.06, cap: 16, arrive: 0.25, arriveIf: 0.53, food: true },
    ],
    flows: [
      { type: 'produce', from: 'spring', to: 'pool', rate: 6, byCap: 100 },
      { type: 'produce', from: 'fog', to: 'pool', rate: 0.4, byCap: 100 },
      { type: 'decay', of: 'pool', rate: 0.01 },   // the sun dries it
      // the palms drink: flooding loses much water to the sun, a drip line gives only what the roots need
      { type: 'consume', eater: 'palms', food: 'pool', need: 0.32, half: 20 },
      { type: 'consume', eater: 'dripPalms', food: 'pool', need: 0.06, half: 20 },
      // the animals drink
      { type: 'consume', eater: 'ibex', food: 'pool', need: 0.2, half: 40, cost: 0.4 },
      { type: 'consume', eater: 'grouse', food: 'pool', need: 0.1, half: 40, cost: 0.3 },
      // the herd eats the shrubs round the spring; shrubs spread slowly
      { type: 'consume', eater: 'camels', food: 'shrubs', need: 0.02, half: 2 },
      { type: 'produce', from: 'shrubs', to: 'shrubs', rate: 0.012, byCap: 14 },
      // the wind brings sand; shrubs and fences stop it; the sand that is left fills the pool
      { type: 'produce', from: 'wind', to: 'sand', rate: 2.2, byCap: 80 },
      { type: 'consume', eater: 'shrubs', food: 'sand', need: 0.3, half: 20 },
      { type: 'consume', eater: 'fences', food: 'sand', need: 1.4, half: 20 },
      { type: 'consume', eater: 'sand', food: 'pool', need: 0.006, half: 30 },
    ],
  },
  lights: [
    { light: 'life', id: 'ibex', min: 5 },
    { light: 'life', id: 'grouse', min: 8 },
    { light: 'regen', id: 'shrubs', min: 7 },
    { light: 'env', id: 'pool', min: 42 },
  ],
  lightNames: { life: 'יעלים וקטות', regen: 'שיחים', env: 'מים בבריכה' },
  board: [
    { id: 'pool', name: 'מים בבריכה', icon: 'pools', tool: 'probe' },
    { id: 'palms', name: 'דקלים בהשקיית הצפה', species: 'datepalm', tool: 'drone' },
    { id: 'camels', name: 'גמלים ליד המעיין', species: 'camel', tool: 'cam' },
    { id: 'shrubs', name: 'שיחים סביב המעיין', species: 'retama', tool: 'drone' },
    { id: 'sand', name: 'חול שנכנס לבריכה', icon: 'sandwind', tool: 'probe' },
    { id: 'ibex', name: 'יעלים', species: 'ibex', tool: 'cam' },
    { id: 'grouse', name: 'קטות', species: 'sandgrouse', tool: 'cam' },
  ],
  visual: [
    { id: 'palms', species: 'datepalm', plant: 'adult', max: 14 },
    { id: 'shrubs', species: 'retama', plant: 'adult', max: 12 },
    { id: 'camels', species: 'camel', scale: 'sqrt', max: 6 },
    { id: 'ibex', species: 'ibex', scale: 'sqrt', max: 6 },
    { id: 'grouse', species: 'sandgrouse', scale: 'sqrt', max: 8 },
  ],
  tools: [
    { id: 'cam', kind: 'daycam', near: 'datepalm', name: 'מצלמת שטח', icon: 'camera', tell: 'המצלמה סופרת מי בא לשתות במעיין.' },
    { id: 'drone', kind: 'drone', name: 'רחפן', icon: 'drone', tell: 'הרחפן סופר דקלים ושיחים מלמעלה.' },
    { id: 'probe', kind: 'probe', name: 'מד מים וחול', icon: 'weather', tell: 'המד בודק כמה מים יש בבריכה, וכמה חול נכנס אליה.' },
  ],
  ideas: [
    { id: 'drip', title: 'קווי טפטוף לדקלים', icon: 'drip', amounts: [1], cost: 14, max: 2, effect: { add: { palms: -7, dripPalms: 7 } }, tech: true, place: 'drip' },
    { id: 'thin', title: 'להעביר חלק מהדקלים לשדה רחוק', icon: 'thin', amounts: [1], cost: 8, max: 2, effect: { add: { palms: -4 } } },
    { id: 'trough', title: 'שוקת לגמלים, רחוק מהמעיין', icon: 'watering', amounts: [1], cost: 10, max: 1, effect: { add: { open: -0.75 } } },
    { id: 'springfence', title: 'גדר סביב המעיין (רק לגמלים)', icon: 'parkfence', amounts: [1], cost: 16, max: 1, effect: { add: { open: -0.85 } } },
    { id: 'sandfence', title: 'גדר חול', icon: 'sandfence', amounts: [1], cost: 8, max: 3, effect: { add: { fences: 1 } }, tech: true, place: 'sandfence' },
    { id: 'retama', title: 'לשתול שיחי רותם', icon: 'species:retama', amounts: [3], cost: 6, max: 3, effect: { add: { shrubs: 1 } } },
    { id: 'move', title: 'להעביר את הגמלים למקום אחר', icon: 'species:camel', amounts: [3], cost: 4, effect: { add: { camels: -1 } } },
    { id: 'palms', title: 'לשתול עוד דקלים (עוד תמרים!)', icon: 'species:datepalm', amounts: [3], cost: 5, effect: { add: { palms: 1 } } },
    { id: 'dig', title: 'לחפור את הבריכה עמוק יותר', icon: 'pools', amounts: [1], cost: 7, effect: { add: { pool: 25 } } },
    { id: 'ibex', title: 'להביא יעלים', icon: 'species:ibex', amounts: [3], cost: 5, effect: { add: { ibex: 1 } } },
    { id: 'fognet', title: 'רשת ערפל', icon: 'fognet', amounts: [1], cost: 10, max: 2, effect: { add: { fog: 1 } }, tech: true, place: 'fognet' },
  ],
  after: {
    drip: 'הדקלים מקבלים עכשיו מים בטפטוף, ישר לשורשים. נבדוק את הבריכה.',
    thin: 'חלק מהדקלים עברו לשדה רחוק, שיש בו באר משלו.',
    trough: { test: 'pool', below: 30, no: 'הגמלים הלכו לשוקת. אבל הבריכה עדיין נמוכה.', ok: 'הגמלים שותים עכשיו בשוקת הרחוקה, ורועים שם.' },
    springfence: 'הגדר עוצרת את הגמלים. היעלים קופצים מעליה, והקטות עפות מעליה.',
    sandfence: 'גדר החול עומדת בין המדבר הפתוח לבריכה.',
    retama: { test: 'camels', below: 2.5, no: 'הרתמים נשתלו, והגמלים רחוקים. יש להם סיכוי לגדול.', ok: 'הרתמים נשתלו. הגמלים כבר מסתכלים עליהם.' },
    move: { test: 'open', below: 0.5, no: 'הגמלים הועברו, ואין להם סיבה לחזור.', ok: 'הגמלים הועברו. אבל המעיין עדיין פתוח, וגמלים צמאים חוזרים אליו.' },
    palms: 'נשתלו עוד דקלים. כל דקל שותה הרבה.',
    dig: 'הבריכה עמוקה יותר. נראה כמה זמן זה יחזיק.',
    ibex: { test: 'pool', below: 35, no: 'היעלים הגיעו, אבל אין מספיק מים לכולם.', ok: 'היעלים הגיעו ושותים.' },
    fognet: 'הרשת אוספת טיפות ערפל בבוקר. כל טיפה עוזרת, אבל זה מעט מים.',
  },
  surprises: [
    { id: 'more-palms', idea: 'palms', test: 'pool', below: 25, text: 'הדקלים החדשים שותים כל כך הרבה, שהבריכה ירדה עוד יותר.' },
    { id: 'dig-fill', idea: 'dig', test: 'pool', below: 40, text: 'החול חזר ומילא את הבור החדש. כל עוד הרוח מביאה חול, בריכה עמוקה לא מחזיקה.' },
    { id: 'camels-back', idea: 'move', test: 'camels', above: 4.5, text: 'הגמלים חזרו למעיין. גמל צמא מוצא מים גם ממרחק גדול.' },
    { id: 'drip-water', idea: 'drip', test: 'pool', above: 55, text: 'הבריכה מתמלאת! הטפטוף נותן לדקלים בדיוק מה שהם צריכים, ושאר המים נשארים בבריכה.' },
    { id: 'shrubs-back', test: 'shrubs', above: 6, text: 'השיחים חוזרים לגדול סביב המעיין, והחול נעצר לפני הבריכה.' },
    { id: 'grouse-back', test: 'grouse', above: 10, text: 'להקות של קטות מגיעות שוב בבוקר לשתות. האבא טובל את הנוצות ולוקח מים לגוזלים.' },
  ],
  mainFix: ['drip', 'trough', 'sandfence'],
  hints: [
    'מי שותה מהבריכה? שימו מצלמת שטח, ובדקו גם את הדקלים.',
    'דקל תמר שותה הרבה מאוד. איך משקים את הדקלים כאן?',
    'מי אוכל את השיחים סביב המעיין? ומה קורה לחול כשאין שיחים?',
    'נסו לחשוב על לולאה: פחות שיחים, יותר חול, פחות מים, והעדר מתקרב עוד יותר למעיין.',
  ],
  guesses: [
    { id: 'loop', text: 'הדקלים שותים את המים, הגמלים אוכלים את השיחים, והחול ממלא את הבריכה', icon: 'pools', right: true },
    { id: 'spring', text: 'המעיין נחלש', icon: 'pools' },
    { id: 'heat', text: 'השנים חמות יותר, והשמש מייבשת את הבריכה', icon: 'hotsun' },
    { id: 'animals', text: 'יש יותר מדי יעלים וקטות', icon: 'species:ibex' },
  ],
  dilemma: {
    at: 60,
    title: 'מה קודם: הדקלים או הגמלים?',
    text: 'המים הולכים לאיבוד בשני מקומות. אפשר להתחיל באחד.',
    options: [
      { idea: 'drip', plus: 'הבריכה מתמלאת מהר', minus: 'יקר, והשיחים עדיין נאכלים' },
      { idea: 'trough', plus: 'השיחים מקבלים הזדמנות לגדול', minus: 'המים בבריכה עולים לאט' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'הדקלים מקבלים מים בטפטוף, הגמלים שותים ורועים רחוק, השיחים עוצרים את החול, והבריכה מלאה. היעלים והקטות חוזרים כל יום.',
  learned: 'במדבר כל טיפה נחשבת: מי שחוסך מים במקום אחד, נותן חיים במקום אחר.',
  realStory: 'בערבה מגדלים תמרים בעזרת טפטוף, שנותן מים ישר לשורשים וחוסך הרבה מים. רעייה של עדרים גדולים ליד מקורות מים חושפת את האדמה, והרוח מתחילה להזיז חול. גדרות חול ושיחים עוצרים אותו.',
  source: 'mayim',
  stars: { thrift: 34 },
  budget: 80,
  tests: {
    within: 1300,
    traps: {
      'more palms': [{ t: 30, idea: 'palms' }, { t: 40, idea: 'palms' }],
      'digging the pool': [{ t: 30, idea: 'dig' }, { t: 120, idea: 'dig' }],
      'bringing ibex': [{ t: 30, idea: 'ibex' }, { t: 40, idea: 'ibex' }],
      'fog nets alone': [{ t: 30, idea: 'fognet' }, { t: 35, idea: 'fognet' }],
      'moving the camels': [{ t: 30, idea: 'move' }, { t: 40, idea: 'move' }],
      'drip only': [{ t: 30, idea: 'drip' }, { t: 35, idea: 'drip' }],
      'trough and sand fences only': [{ t: 30, idea: 'trough' }, { t: 35, idea: 'sandfence' }, { t: 40, idea: 'sandfence' }],
    },
    fixes: {
      'drip, trough, sand fence': [{ t: 30, idea: 'drip' }, { t: 35, idea: 'trough' }, { t: 40, idea: 'sandfence' }],
      'thinning the palms, a spring fence, white broom': [{ t: 30, idea: 'thin' }, { t: 35, idea: 'thin' }, { t: 40, idea: 'springfence' }, { t: 45, idea: 'retama' }, { t: 50, idea: 'retama' }],
      'drip twice, trough, white broom': [{ t: 30, idea: 'drip' }, { t: 35, idea: 'drip' }, { t: 40, idea: 'trough' }, { t: 45, idea: 'retama' }],
    },
  },
  scene: {
    dayFrac: 0.38,
    decor: [['saltbush', 1, 2], ['tamarisk', 1, 1], ['zygophyllum', 1, 2], ['caper', 0, 1]],
  },
};
