// תעלומה (מתקדמים, הסוואנה): יותר מדי פילים.
// In a fenced park many water troughs were dug so the visitors would see animals all year. The elephants stay by the
// water and no longer walk away in the dry season, and there are more and more of them in one place: they push over
// the acacias and eat every young tree, so the giraffes have little to browse and the weavers lose their nesting trees.
// The usual fix: close some of the troughs (the elephants spread out to the river and further, and the trees rest).
// Another way: open a corridor in the fence to the next park, so the herd can walk away as it once did. Traps: more
// water (more elephants stay), planting saplings (eaten), a fence round a few trees (too few), bringing giraffes (they
// leave hungry), moving some elephants away by truck (others come to the water), cutting the bushes.
// Facts (savanna.js + docs/sources.md "הסוואנה"): artificial water points keep elephants in one area all year and
// raise their impact on trees (Kruger closed many of its water points for this reason); fences cut elephants off from
// their old routes, and corridors between parks let them move; elephants push over and debark trees and eat saplings;
// giraffes browse acacias; weavers nest on acacias.
// Advanced level: two causes, a balance that must hold without pause, many traps, surprises and two routes.

export const TOO_MANY_ELEPHANTS = {
  id: 'too-many-elephants',
  zone: 'savanna',
  level: 'advanced',
  order: 5,
  title: 'יותר מדי פילים',
  plainTitle: 'יותר מדי פילים',
  call: 'בפארק נעלמות השיטות. הג׳ירפות רעבות, והאורגים לא מוצאים עצים לקנים.',
  callMore: 'פעם הפילים עברו כאן בעונת היובש והמשיכו הלאה. עכשיו הם כבר לא עוזבים. למה?',
  holdSeconds: 200,
  model: {
    vars: [
      // how many elephants this part of the park holds: the water troughs keep them here, and the fence keeps them in
      { id: 'hold', kind: 'stock', init: 14 },
      { id: 'elephants', kind: 'animal', init: 12, need: 0.08, birth: 0.012, death: 0.003, hungry: 0.2, leaveHungry: 0.03,
        cap: { of: 'hold', per: 1 }, leaveCrowded: 0.08, arrive: 0.25, arriveIf: 0.2, food: true },
      { id: 'trees', kind: 'plant', init: 7 },
      { id: 'young', kind: 'plant', init: 1 },
      { id: 'grass', kind: 'plant', init: 14 },
      { id: 'giraffes', kind: 'animal', init: 2, need: 0.08, birth: 0.02, death: 0.006, hungry: 0.35, leaveHungry: 0.06, cap: 8, arrive: 0.06, arriveIf: 0.45, food: true },
      { id: 'cages', kind: 'stock', init: 0 },
    ],
    flows: [
      { type: 'produce', from: 'trees', to: 'young', rate: 0.05, byCap: 12 },
      { type: 'mature', from: 'young', to: 'trees', rate: 1 / 80, cap: 16 },
      { type: 'decay', of: 'young', rate: 0.003 },
      { type: 'decay', of: 'trees', rate: 0.001 },
      { type: 'produce', from: 'grass', to: 'grass', rate: 0.1, byCap: 30 },
      // the elephants eat grass, push over trees and eat the young ones
      { type: 'consume', eater: 'elephants', food: 'grass', need: 0.05, half: 8 },
      { type: 'consume', eater: 'elephants', food: 'trees', need: 0.003, half: 4 },
      { type: 'consume', eater: 'elephants', food: 'young', need: 0.022, half: 2 },
      // the giraffes browse the acacias (they take leaves, the tree stays)
      { type: 'consume', eater: 'giraffes', food: 'trees', need: 0.08, half: 4, cost: 0.005 },
    ],
  },
  lights: [
    { light: 'life', id: 'giraffes', min: 5 },
    { light: 'life', id: 'trees', min: 8 },
    { light: 'regen', id: 'young', min: 4 },
    { light: 'env', id: 'elephants', max: 7 },
  ],
  lightNames: { life: 'עצים וג׳ירפות', regen: 'עצים צעירים', env: 'מספר פילים מתאים' },
  board: [
    { id: 'elephants', name: 'פילים', species: 'elephant', tool: 'drone' },
    { id: 'trees', name: 'שיטות גדולות', species: 'umbrella', tool: 'drone' },
    { id: 'young', name: 'עצים צעירים', icon: 'sapling', tool: 'quadrat' },
    { id: 'giraffes', name: 'ג׳ירפות', species: 'giraffe', tool: 'cam' },
    { id: 'grass', name: 'עשב', species: 'redoat', tool: 'quadrat' },
    { id: 'hold', name: 'כמה פילים המים והגדר מחזיקים כאן', icon: 'pools', tool: 'drone' },
  ],
  visual: [
    { id: 'elephants', species: 'elephant', scale: 'sqrt', max: 6 },
    { id: 'giraffes', species: 'giraffe', scale: 'sqrt', max: 5 },
    { id: 'trees', species: 'umbrella', plant: 'adult', max: 12 },
    { id: 'young', species: 'umbrella', plant: 'young', max: 10 },
  ],
  tools: [
    { id: 'drone', kind: 'drone', name: 'רחפן', icon: 'drone', tell: 'הרחפן סופר פילים ועצים, ומראה איפה השוקות והגדר.' },
    { id: 'cam', kind: 'daycam', near: 'umbrella', name: 'מצלמת שטח', icon: 'camera', tell: 'המצלמה ליד השיטות סופרת את הג׳ירפות שבאות לאכול.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים עצים צעירים ובודקים את העשב.' },
  ],
  ideas: [
    { id: 'close', title: 'לסגור חלק מהשוקות', icon: 'pools', amounts: [1], cost: 10, max: 2, effect: { add: { hold: -4 } } },
    { id: 'corridor', title: 'לפתוח מעבר בגדר לפארק השכן', icon: 'parkfence', amounts: [1], cost: 26, max: 1, effect: { add: { hold: -8 } }, tech: true },
    { id: 'water', title: 'לחפור עוד שוקות מים', icon: 'watering', amounts: [1], cost: 8, max: 2, effect: { add: { hold: 4 } } },
    { id: 'saplings', title: 'לשתול שתילי שיטה', icon: 'sapling', amounts: [4], cost: 8, effect: { add: { young: 1 } } },
    { id: 'cages', title: 'גדר סביב כמה עצים', icon: 'fence', amounts: [1], cost: 7, max: 2, effect: { add: { cages: 1, trees: 0.5 } } },
    { id: 'giraffes', title: 'להביא ג׳ירפות', icon: 'species:giraffe', amounts: [2], cost: 8, effect: { add: { giraffes: 1 } } },
    { id: 'truck', title: 'להעביר כמה פילים במשאית', icon: 'herd', amounts: [3], cost: 14, max: 2, effect: { add: { elephants: -1 } } },
    { id: 'grass', title: 'לשתול עוד עשב לפילים', icon: 'grass', amounts: [3], cost: 4, effect: { add: { grass: 1 } } },
  ],
  after: {
    close: 'סגרנו חלק מהשוקות. נראה מה יעשו הפילים בעונת היובש.',
    corridor: 'המעבר בגדר פתוח. נחכה לראות אם הפילים ימצאו אותו.',
    water: 'השוקות החדשות מלאות. פילים מכל הפארק מגיעים לשתות.',
    saplings: { test: 'elephants', above: 8, no: 'השתילים נשתלו, והפילים אכלו את רובם תוך כמה ימים.', ok: 'השתילים נשתלו וגדלים.' },
    cages: 'כמה עצים מוגנים עכשיו בגדר. שאר העצים עדיין פתוחים לפילים.',
    giraffes: { test: 'trees', below: 8, no: 'הג׳ירפות הגיעו, אבל נשארו מעט עצים עם עלים.', ok: 'הג׳ירפות הגיעו ומצאו עלים.' },
    truck: 'כמה פילים הועברו לפארק אחר. נראה אם יגיעו אחרים במקומם.',
    grass: 'העשב גדל. הפילים אוכלים אותו, ועדיין מפילים עצים.',
  },
  surprises: [
    { id: 'more', idea: 'water', test: 'elephants', above: 14, text: 'עוד ועוד פילים מגיעים לשוקות החדשות. יש מים כל השנה, אז אין להם סיבה לעזוב.' },
    { id: 'back', idea: 'truck', test: 'elephants', above: 11, text: 'הפילים שהועברו עזבו, אבל פילים אחרים הגיעו לשתות מהשוקות, והמקום התמלא שוב.' },
    { id: 'spread', idea: 'close', test: 'elephants', below: 8, text: 'בלי שוקות, הפילים הולכים בעונת היובש אל הנהר ולמקומות רחוקים. העצים מקבלים מנוחה.' },
    { id: 'walk', idea: 'corridor', test: 'elephants', below: 8, text: 'פילים עוברים במעבר לפארק השכן, כמו שעשו לפני שבנו את הגדר.' },
    { id: 'sprouts', test: 'young', above: 6, text: 'שיטות צעירות צומחות שוב, והפילים לא מספיקים לאכול את כולן.' },
  ],
  mainFix: ['close'],
  hints: [
    'כמה פילים יש כאן? ספרו אותם ברחפן, בעונת הגשמים וביובש.',
    'פילים צריכים לשתות כל יום. מה יקרה למקום שיש בו מים כל השנה?',
    'פעם הפילים עזבו בעונת היובש. מה עוצר אותם עכשיו?',
    'מה קורה לשתילים קטנים כשיש הרבה פילים?',
  ],
  guesses: [
    { id: 'water', text: 'השוקות והגדר משאירות יותר מדי פילים במקום אחד', icon: 'pools', right: true },
    { id: 'rain', text: 'לא ירד מספיק גשם', icon: 'hotsun' },
    { id: 'giraffes', text: 'הג׳ירפות אוכלות את כל העצים', icon: 'species:giraffe' },
    { id: 'old', text: 'השיטות זקנות מדי', icon: 'sapling' },
  ],
  dilemma: {
    at: 60,
    title: 'לסגור שוקות או לפתוח מעבר?',
    text: 'צריך שהפילים לא יישארו כולם במקום אחד. יש שתי דרכים.',
    options: [
      { idea: 'close', plus: 'זול, ועובד בעונת היובש הבאה', minus: 'המבקרים יראו פחות פילים ליד הדרך' },
      { idea: 'corridor', plus: 'הפילים חוזרים לדרך הישנה שלהם', minus: 'יקר, וצריך לתאם עם הפארק השכן' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'הפילים חוזרים ללכת בעונת היובש, העצים מקבלים מנוחה, שיטות צעירות גדלות, והג׳ירפות חוזרות.',
  learned: 'פיל הוא מהנדס של הסוואנה, אבל רק כשהוא ממשיך ללכת. כשכל הפילים נשארים במקום אחד, הם הורסים אותו.',
  source: 'zman',
  realStory: 'בפארק קרוגר בדרום אפריקה חפרו בעבר הרבה שוקות, והפילים נשארו ליד המים כל השנה. מאוחר יותר סגרו רבות מהשוקות, ופתחו מעברים בין פארקים, כדי שהפילים יוכלו ללכת כמו פעם.',
  stars: { thrift: 22 },
  budget: 80,
  tests: {
    within: 850,
    traps: {
      'more water': [{ t: 30, idea: 'water' }],
      'saplings': [{ t: 30, idea: 'saplings' }, { t: 40, idea: 'saplings' }],
      'tree cages': [{ t: 30, idea: 'cages' }, { t: 40, idea: 'cages' }],
      'giraffes': [{ t: 30, idea: 'giraffes' }, { t: 40, idea: 'giraffes' }],
      'moving elephants by truck': [{ t: 30, idea: 'truck' }, { t: 40, idea: 'truck' }],
      'more grass': [{ t: 30, idea: 'grass' }, { t: 40, idea: 'grass' }],
      'cages and saplings': [{ t: 30, idea: 'cages' }, { t: 40, idea: 'saplings' }],
    },
    fixes: {
      'closing troughs': [{ t: 30, idea: 'close' }, { t: 35, idea: 'close' }],
      'a corridor': [{ t: 30, idea: 'corridor' }],
      'a truck, then a corridor': [{ t: 30, idea: 'truck' }, { t: 60, idea: 'corridor' }],
      'cages, then closing troughs': [{ t: 30, idea: 'cages' }, { t: 50, idea: 'close' }, { t: 55, idea: 'close' }],
    },
  },
  scene: {
    dayFrac: 0.42,
    decor: [['baobab', 0, 1], ['redoat', 2, 4], ['whistling', 0, 2]],
  },
};
