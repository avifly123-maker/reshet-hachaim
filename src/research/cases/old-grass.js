// תעלומה (בינוני, הסוואנה): העדרים שלא נשארים.
// After the rains the zebras come to the plain, eat a little and move on. For years nobody let a fire pass here, and no
// big grazers come any more, so the old tall grass stands dry and thick: it shades the new green shoots, and the old
// stalks are poor food. The usual fix: a small fire under control, and fresh grass grows from the roots. Another way:
// bring buffalo back (they eat the tall coarse grass and open it for the zebras). Traps: planting more grass (it only
// adds to the old grass), a water trough (water is not what is missing), bringing zebras (they leave, little to eat),
// cutting the bushes, a fence to keep the zebras in.
// Facts (savanna.js + docs/sources.md "הסוואנה"): after fire the grass regrows from its roots and the fresh shoots draw
// grazers; old dry grass is poor food; buffalo eat tall coarse grass and open the sward for short-grass grazers
// (grazing succession); park managers in Africa burn on purpose in small patches.
// Middle level: plain Hebrew, two linked causes, traps, other ways, surprises, a dilemma.

export const OLD_GRASS = {
  id: 'old-grass',
  zone: 'savanna',
  level: 'middle',
  order: 5,
  title: 'העדרים שלא נשארים',
  plainTitle: 'העדרים שלא נשארים',
  call: 'אחרי הגשמים הזברות מגיעות למישור, אוכלות קצת וממשיכות הלאה. למה הן לא נשארות?',
  callMore: 'העשב כאן גבוה וצפוף. אז למה אין לזברות מה לאכול?',
  holdSeconds: 180,
  model: {
    vars: [
      { id: 'old', kind: 'stock', init: 90 },      // old dry tall grass from the years before
      { id: 'fresh', kind: 'plant', init: 3 },     // fresh green grass, the zebras' food
      { id: 'zebras', kind: 'animal', init: 2, need: 0.05, birth: 0.02, death: 0.006, hungry: 0.35, leaveHungry: 0.06, cap: 9, arrive: 0.06, arriveIf: 0.4, food: true },
      { id: 'buffalo', kind: 'animal', init: 0, need: 0.4, birth: 0.006, death: 0.002, hungry: 0.2, leaveHungry: 0.02, cap: 6 },
      { id: 'shrubs', kind: 'plant', init: 4 },
      { id: 'trough', kind: 'stock', init: 0 },
      { id: 'fence', kind: 'stock', init: 0 },
    ],
    flows: [
      // new green shoots grow from the roots, but old stalks shade them
      { type: 'produce', from: 'fresh', to: 'fresh', rate: 0.12, byCap: 30 },
      { type: 'consume', eater: 'old', food: 'fresh', need: 0.012, half: 6 },
      // green grass that nobody eats grows old and dry
      { type: 'mature', from: 'fresh', to: 'old', rate: 0.002, cap: 140 },
      { type: 'decay', of: 'old', rate: 0.0005 },
      // the zebras eat the fresh grass; the buffalo eat the tall coarse grass
      { type: 'consume', eater: 'zebras', food: 'fresh', need: 0.05, half: 6 },
      { type: 'consume', eater: 'buffalo', food: 'old', need: 0.4, half: 15 },
      { type: 'produce', from: 'shrubs', to: 'shrubs', rate: 0.004, byCap: 10 },
    ],
  },
  lights: [
    { light: 'life', id: 'zebras', min: 6 },
    { light: 'regen', id: 'fresh', min: 10 },
    { light: 'env', id: 'old', max: 50 },
  ],
  lightNames: { life: 'זברות', regen: 'עשב ירוק', env: 'מעט עשב ישן' },
  board: [
    { id: 'zebras', name: 'זברות', species: 'zebra', tool: 'drone' },
    { id: 'fresh', name: 'עשב ירוק וצעיר', species: 'stargrass', tool: 'quadrat' },
    { id: 'old', name: 'עשב ישן ויבש', icon: 'grass', tool: 'quadrat' },
    { id: 'buffalo', name: 'תאואים', species: 'buffalo', tool: 'drone' },
    { id: 'shrubs', name: 'שיחים', species: 'whistling', tool: 'drone' },
  ],
  visual: [
    { id: 'zebras', species: 'zebra', scale: 'sqrt', max: 8 },
    { id: 'buffalo', species: 'buffalo', max: 6 },
    { id: 'fresh', species: 'stargrass', plant: 'adult', max: 14 },
    { id: 'shrubs', species: 'whistling', plant: 'adult', max: 8 },
  ],
  tools: [
    { id: 'drone', kind: 'drone', name: 'רחפן', icon: 'drone', tell: 'הרחפן סופר זברות, תאואים ושיחים במישור.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע בודקים כמה עשב ירוק יש, וכמה עשב ישן ויבש.' },
  ],
  ideas: [
    { id: 'fire', title: 'אש קטנה ושמורה', icon: 'burnt', amounts: [1], cost: 12, max: 2, effect: { add: { old: -50, shrubs: -1 } } },
    { id: 'buffalo', title: 'להחזיר תאואים', icon: 'species:buffalo', amounts: [2], cost: 9, max: 3, effect: { add: { buffalo: 1 } } },
    { id: 'grass', title: 'לשתול עוד עשב', icon: 'grass', amounts: [3], cost: 4, effect: { add: { old: 5, fresh: 0.6 } } },
    { id: 'trough', title: 'שוקת מים לזברות', icon: 'watering', amounts: [1], cost: 6, max: 1, effect: { add: { trough: 1 } } },
    { id: 'zebras', title: 'להביא עוד זברות', icon: 'species:zebra', amounts: [3], cost: 5, effect: { add: { zebras: 1 } } },
    { id: 'cut', title: 'לגזום את השיחים', icon: 'cutplants', amounts: [1], cost: 6, max: 2, effect: { add: { shrubs: -2 } } },
    { id: 'fence', title: 'גדר שתשאיר את הזברות', icon: 'parkfence', amounts: [1], cost: 8, max: 1, effect: { add: { fence: 1 } } },
    { id: 'mow', title: 'לכסח פס של עשב', icon: 'thin', amounts: [1], cost: 7, max: 1, effect: { add: { old: -15 } } },
  ],
  after: {
    fire: 'אש קטנה עברה במישור ושרפה עשב יבש. השורשים נשארו באדמה.',
    buffalo: 'התאואים הגיעו. נראה מה הם אוכלים.',
    grass: { test: 'old', above: 50, no: 'העשב החדש גדל, אבל מתחת לעשב הישן הוא לא מקבל אור.', ok: 'העשב החדש גדל ירוק.' },
    trough: 'השוקת מלאה. הזברות שותות, ואז ממשיכות הלאה.',
    zebras: { test: 'fresh', below: 8, no: 'הזברות הגיעו, אבל אין להן הרבה עשב ירוק.', ok: 'הזברות הגיעו ומצאו עשב ירוק.' },
    cut: 'גזמנו כמה שיחים. אבל העשב הישן עדיין עומד.',
    fence: 'הגדר עומדת. הזברות שבתוכה רעבות.',
    mow: 'כיסחנו פס אחד. מעט עשב ירוק צומח שם.',
  },
  surprises: [
    { id: 'green', idea: 'fire', test: 'fresh', above: 9, text: 'כמה ימים אחרי האש, המישור השחור מתכסה בעשב ירוק וטרי. הזברות מריחות אותו מרחוק!' },
    { id: 'buff', idea: 'buffalo', test: 'old', below: 60, text: 'התאואים אוכלים את העשב הגבוה והקשה, ומתחתיו צומח עשב צעיר.' },
    { id: 'left', idea: 'zebras', test: 'zebras', below: 3, text: 'רוב הזברות שהבאנו עזבו. בין העשב הישן היה להן מעט מאוד לאכול.' },
    { id: 'stay', test: 'zebras', above: 7, text: 'הזברות כבר לא ממשיכות הלאה. הן נשארות, ומביאות איתן עוד זברות.' },
  ],
  mainFix: ['fire'],
  hints: [
    'הזברות אוכלות עשב ירוק וצעיר. כמה יש ממנו? בדקו בריבוע דגימה.',
    'כמה שנים לא עברה כאן אש? גם התאואים כבר לא מגיעים.',
    'מה קורה לעשב ירוק שאף אחד לא אוכל? הוא מזדקן ומתייבש.',
    'אחרי אש, העשב צומח מחדש מהשורשים.',
  ],
  guesses: [
    { id: 'old', text: 'העשב הישן מסתיר את העשב הירוק, ואף אחד לא פותח אותו', icon: 'grass', right: true },
    { id: 'water', text: 'אין לזברות מים', icon: 'watering' },
    { id: 'lions', text: 'האריות מבריחים את הזברות', icon: 'species:lion' },
    { id: 'shrubs', text: 'השיחים תפסו את המישור', icon: 'species:whistling' },
  ],
  dilemma: {
    at: 60,
    title: 'אש או תאואים?',
    text: 'צריך לפתוח את העשב הישן. אפשר בשתי דרכים.',
    options: [
      { idea: 'fire', plus: 'מהירה, והעשב הירוק צומח מיד', minus: 'צריך לשמור עליה היטב, והמישור שחור כמה ימים' },
      { idea: 'buffalo', plus: 'התאואים נשארים ושומרים על המרעה', minus: 'לוקח הרבה זמן' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'העשב הישן נפתח, עשב ירוק צמח מהשורשים, והזברות נשארות במישור.',
  learned: 'גם עשב צריך להתחדש: אש קטנה או עדר גדול פותחים מקום לחדש.',
  realStory: 'בפארקים באפריקה שורפים בכוונה חלקות קטנות של עשב יבש, כל פעם במקום אחר. אחרי האש צומח עשב ירוק, והעדרים באים אליו. גם תאואים וזברות שאוכלים עשב גבוה פותחים את המרעה למי שבא אחריהם.',
  stars: { thrift: 18 },
  budget: 70,
  tests: {
    within: 800,
    traps: {
      'more grass': [{ t: 30, idea: 'grass' }, { t: 40, idea: 'grass' }],
      'a water trough': [{ t: 30, idea: 'trough' }],
      'more zebras': [{ t: 30, idea: 'zebras' }, { t: 40, idea: 'zebras' }],
      'cutting the bushes': [{ t: 30, idea: 'cut' }, { t: 40, idea: 'cut' }],
      'a fence': [{ t: 30, idea: 'fence' }, { t: 40, idea: 'zebras' }],
      'mowing one strip': [{ t: 30, idea: 'mow' }],
    },
    fixes: {
      'a small fire': [{ t: 30, idea: 'fire' }],
      'buffalo': [{ t: 30, idea: 'buffalo' }, { t: 35, idea: 'buffalo' }],
      'zebras, then a fire': [{ t: 30, idea: 'zebras' }, { t: 60, idea: 'fire' }],
      'mowing, then buffalo': [{ t: 30, idea: 'mow' }, { t: 40, idea: 'buffalo' }, { t: 50, idea: 'buffalo' }],
    },
  },
  scene: {
    dayFrac: 0.4,
    decor: [['umbrella', 1, 2], ['redoat', 2, 4], ['termitemound', 0, 1]],
  },
};
