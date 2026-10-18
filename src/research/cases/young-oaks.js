// תעלומה (בינוני, החורש): החורש שלא מתחדש.
// The grove has only old oaks. Every autumn the jays bury acorns, every winter oak seedlings come up, and soon they are
// gone. Two causes, one tied to the other: when the new road was built, piles of big boulders were left at the edge of
// the grove; rock hyraxes live in rock crevices, so the piles gave them many new homes right next to food, and so many
// hyraxes now live here that they eat almost every seedling. Moving hyraxes away does not hold (new ones move into the
// empty piles), a fox catches almost nothing (the hyrax on guard calls, and they all slip into the rocks), a fence is
// climbed, food spread for the hyraxes brings more of them, and more acorns, jays or planted oak saplings only feed
// them. The usual route: clear the rock piles, and the hyraxes go back to a normal number among the natural rocks.
// Another way: tree shelters around the seedlings (fast, costly); or clear some piles and shelter some seedlings.
// Facts (grove.js + docs/sources.md): the jay buries acorns and some of them grow into oaks; rock hyraxes depend on
// rock crevices for refuge, and in Israel boulders left by roads and building gave them new homes and helped them
// spread; next to rock heaps hyraxes strip the leaves of young trees; a sentinel hyrax calls and the group escapes
// into the rocks, so ground predators rarely catch them in our region; rock piles were sealed in Jerusalem to keep
// hyraxes away; tube shelters protect young oaks from browsing animals.
// Middle level: plain Hebrew, two linked causes, traps, other ways, surprises, a dilemma.

export const YOUNG_OAKS = {
  id: 'young-oaks',
  zone: 'grove',
  level: 'middle',
  order: 3,
  title: 'החורש שלא מתחדש',
  plainTitle: 'החורש שלא מתחדש',
  call: 'בחורש יש רק אלונים זקנים. נבטים קטנים יוצאים מהאדמה, ונעלמים.',
  callMore: 'שומרי החורש רואים את העורבנים טומנים בלוטים כל סתיו, ובחורף נובטים אלונים קטנים. אבל אף אחד מהם לא גדל לעץ צעיר. מה קרה כאן?',
  holdSeconds: 180,
  model: {
    vars: [
      { id: 'oaks', kind: 'plant', init: 7 },
      { id: 'acorns', kind: 'stock', init: 160 },
      { id: 'jays', kind: 'animal', init: 3, need: 0.3, birth: 0.01, death: 0.004, hungry: 0.3, leaveHungry: 0.05,
        cap: { of: 'oaks', per: 0.6 }, leaveCrowded: 0.08, arrive: 0.04, arriveIf: 0.3, food: true },
      { id: 'buried', kind: 'stock', init: 60 },       // acorns the jays hid in the ground and did not come back for
      { id: 'seedlings', kind: 'plant', init: 2 },
      { id: 'saplings', kind: 'plant', init: 0 },      // young oaks that got past the seedling stage
      // the hyraxes live among rocks: a few natural crevices on the slope, and every boulder pile is a new home
      { id: 'hyrax', kind: 'animal', init: 15, need: 0.3, birth: 0.012, death: 0.004, hungry: 0.3, leaveHungry: 0.05,
        cap: { of: 'piles', per: 4, plus: 2 }, leaveCrowded: 0.06, arrive: 0.2, arriveIf: 0.35, food: true },
      { id: 'piles', kind: 'stock', init: 4 },
      { id: 'greens', kind: 'stock', init: 250 },      // herbs and leaves of shrubs
      { id: 'land', kind: 'stock', init: 1 },
      { id: 'feed', kind: 'stock', init: 0 },          // food spread for the hyraxes
      { id: 'shelters', kind: 'stock', init: 0 },      // tube shelters around seedlings (one shelter, one young oak)
      { id: 'fence', kind: 'stock', init: 0 },         // a fence round the grove (the hyraxes climb it)
      { id: 'fox', kind: 'animal', init: 0, need: 0.2, birth: 0, death: 0.003, hungry: 0.3, leaveHungry: 0.06,
        cap: 2, leaveCrowded: 0.1, food: true, preyHalf: 6 },
    ],
    flows: [
      // acorns ripen in autumn
      { type: 'produce', from: 'oaks', to: 'acorns', rate: 1.2, byCap: 600, season: { autumn: 3, winter: 0.8, spring: 0.3, summer: 0.3 } },
      { type: 'consume', eater: 'jays', food: 'acorns', need: 0.3, half: 40, cache: { to: 'buried', share: 0.8 } },
      { type: 'decay', of: 'acorns', rate: 0.02 },     // acorns left under the trees: eaten by mice and porcupines, or rotting
      { type: 'germinate', from: 'buried', to: 'seedlings', rate: 0.012, yield: 0.6, season: { winter: 1.6, spring: 1, summer: 0.4, autumn: 0.8 } },
      { type: 'decay', of: 'buried', rate: 0.002 },
      { type: 'mature', from: 'seedlings', to: 'saplings', rate: 1 / 120, cap: 30 },
      { type: 'decay', of: 'seedlings', rate: 0.004 },
      { type: 'decay', of: 'saplings', rate: 0.0005 },
      // the hyraxes eat herbs and leaves, and every soft oak seedling they find; a tube shelter keeps one young oak safe
      { type: 'produce', from: 'land', to: 'greens', rate: 15, byCap: 400, season: { winter: 1.3, spring: 1.5, summer: 0.6, autumn: 0.8 } },
      { type: 'consume', eater: 'hyrax', food: 'greens', need: 0.3, half: 60 },
      { type: 'consume', eater: 'hyrax', food: 'feed', need: 0.3, half: 30 },
      { type: 'decay', of: 'feed', rate: 0.004 },
      { type: 'prey', pred: 'hyrax', prey: 'seedlings', attack: 0.015, handling: 0.5, refugeOf: { of: 'shelters', per: 1 } },
      { type: 'prey', pred: 'hyrax', prey: 'saplings', attack: 0.0009, handling: 1, refugeOf: { of: 'shelters', per: 1 } },
      { type: 'decay', of: 'shelters', rate: 0.0005 },
      // a fox hunts, but the hyrax on guard calls and they all slip into the rocks: each pile hides many
      { type: 'prey', pred: 'fox', prey: 'hyrax', attack: 0.01, handling: 3, refuge: 3, refugeOf: { of: 'piles', per: 4 } },
      { type: 'decay', of: 'oaks', rate: 0.0001 },
    ],
  },
  lights: [
    { light: 'life', id: 'oaks', min: 5 },
    { light: 'life', id: 'jays', min: 2 },
    { light: 'life', id: 'hyrax', min: 2 },
    { light: 'regen', id: 'saplings', min: 3 },
    { light: 'env', id: 'seedlings', min: 3 },
  ],
  lightNames: { life: 'חיים', regen: 'אלונים צעירים', env: 'נבטים חדשים' },
  board: [
    { id: 'hyrax', name: 'שפני סלע', species: 'hyrax', tool: 'fieldcam' },
    { id: 'jays', name: 'עורבנים', species: 'jay', tool: 'fieldcam' },
    { id: 'oaks', name: 'עצי אלון', species: 'oak', tool: 'drone' },
    { id: 'piles', name: 'ערימות סלעים', icon: 'rocks', tool: 'drone' },
    { id: 'buried', name: 'בלוטים טמונים', icon: 'acorn', tool: 'quadrat' },
    { id: 'seedlings', name: 'נבטי אלון', icon: 'sprout', tool: 'quadrat' },
    { id: 'saplings', name: 'אלונים צעירים', icon: 'sapling', tool: 'quadrat' },
  ],
  visual: [
    { id: 'hyrax', species: 'hyrax', scale: 'sqrt', max: 9 },
    { id: 'jays', species: 'jay', max: 5 },
    { id: 'fox', species: 'fox', max: 2 },
    { id: 'oaks', species: 'oak', plant: 'adult', max: 8 },
    { id: 'saplings', species: 'oak', plant: 'young', max: 10 },
  ],
  tools: [
    { id: 'fieldcam', kind: 'daycam', near: 'oak', name: 'מצלמת שטח', icon: 'camera', tell: 'המצלמה ליד האלונים סופרת מי בא לאכול, ומי טומן בלוטים.' },
    { id: 'drone', name: 'רחפן ספירה', icon: 'drone', tell: 'הרחפן סופר עצי אלון, ומחפש ערימות סלעים בשולי החורש.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים בלוטים טמונים, נבטים ואלונים צעירים.' },
  ],
  ideas: [
    { id: 'piles', title: 'לפנות ערימת סלעים', icon: 'rocks', amounts: [1], cost: 6, max: 4, effect: { add: { piles: -1 } } },
    { id: 'shelters', title: 'מגיני שתילים סביב הנבטים', icon: 'shelter', amounts: [1], cost: 20, max: 1, effect: { add: { shelters: 8 } }, tech: true },
    { id: 'move', title: 'להעביר שפנים למקום אחר', icon: 'species:hyrax', amounts: [5], cost: 4, effect: { add: { hyrax: -1 } } },
    { id: 'fox', title: 'להביא שועלים', icon: 'species:fox', amounts: [2], cost: 5, max: 2, effect: { add: { fox: 1 } } },
    { id: 'fence', title: 'גדר סביב החורש', icon: 'fence', amounts: [1], cost: 10, max: 1, effect: { add: { fence: 1 } } },
    { id: 'feed', title: 'לפזר מזון לשפנים, רחוק מהנבטים', icon: 'feed', amounts: [1], cost: 3, max: 3, effect: { add: { feed: 300 } } },
    { id: 'saplings', title: 'לשתול שתילי אלון', icon: 'species:oak', amounts: [5], cost: 9, effect: { add: { saplings: 1 } } },
    { id: 'jays', title: 'להביא עורבנים', icon: 'species:jay', amounts: [3], cost: 5, effect: { add: { jays: 1 } } },
    { id: 'seed-drone', title: 'רחפן זריעה (בלוטים)', icon: 'seeddrone', amounts: [1], cost: 8, effect: { add: { buried: 120 } }, tech: true },
  ],
  after: {
    // { test, below, no, ok }: `no` is shown when the measured number is below `below`
    piles: { test: 'piles', below: 1.5, no: 'רוב הערימות פונו. לשפנים יש פחות מקומות מחבוא, וחלק מהם עברו לסלעים הטבעיים במדרון.', ok: 'פינינו ערימה. השפנים עברו לערימות שנשארו.' },
    shelters: 'כל נבט קיבל צינור מגן. השפנים מסתכלים עליו מבחוץ.',
    move: { test: 'piles', below: 1.5, no: 'השפנים הועברו, ובערימות שפונו אין להם לאן לחזור.', ok: 'השפנים הועברו לנחל רחוק. אבל ערימות הסלעים לא נשארו ריקות: שפנים חדשים הגיעו.' },
    fox: { test: 'piles', below: 1.5, no: 'השועל צד פה ושם. בין הסלעים הטבעיים אין הרבה מקומות להסתתר.', ok: 'השועל ניסה לצוד. השפן השומר קרא קריאת אזהרה, וכל השפנים נעלמו בין הסלעים.' },
    fence: 'השפנים טיפסו על הגדר בקלות, כמו על סלע. כפות הרגליים שלהם נצמדות כמו כוסות יניקה.',
    feed: 'השפנים אכלו ושבעו. ועכשיו יש להם כוח לגדל עוד גורים.',
    saplings: { test: 'shelters', below: 1, no: 'השתילים נשתלו יפה. השפנים מצאו אותם כבר למחרת.', ok: 'השתילים נשתלו בתוך המגינים.' },
    jays: 'עוד עורבנים טומנים בלוטים. אבל הנבטים עדיין נעלמים.',
    'seed-drone': 'הרחפן טמן המון בלוטים באדמה. כשהם נובטים, השפנים כבר מחכים.',
  },
  surprises: [
    { id: 'fox-left', idea: 'fox', test: 'fox', below: 0.6, text: 'השועל עזב רעב. בכל פעם שהתקרב, השפן השומר קרא, וכל השפנים נכנסו בין הסלעים. בסוף הלך לחפש קוצנים במקום אחר.' },
    { id: 'move-back', idea: 'move', test: 'hyrax', above: 13, text: 'שפנים חדשים כבר גרים בערימות הסלעים. מקום טוב לא נשאר ריק.' },
    { id: 'feed-boom', idea: 'feed', test: 'hyrax', above: 19, text: 'הפתעה: המזון הביא עוד ועוד שפנים. עכשיו יש יותר שפנים מאי פעם, וגם הם אוהבים נבטים.' },
    { id: 'drone-feast', idea: 'seed-drone', test: 'seedlings', above: 8, text: 'האדמה מלאה בנבטים קטנים! השפנים יוצאים מהסלעים לארוחה.' },
    { id: 'saplings-gone', idea: 'saplings', test: 'saplings', below: 2, text: 'השתילים שנשתלו נאכלו כמעט כולם. לשפנים יש תיאבון גדול לעלים רכים.' },
    { id: 'young-up', test: 'saplings', above: 3, text: 'אלונים צעירים מתחילים לגדול בחורש. את הבלוטים שלהם טמנו העורבנים בסתיו.' },
  ],
  mainFix: ['piles', 'piles', 'piles'],   // the usual route: clear most of the rock piles
  hints: [
    'מי אוכל את הנבטים הקטנים? הציבו מצלמת שטח ליד האלונים.',
    'שפני הסלע גרים בין סלעים. כמה מקומות מחבוא יש להם כאן?',
    'כשסללו את הכביש החדש, נשארו בשולי החורש ערימות של סלעים גדולים.',
    'מי שותל את האלונים? העורבני טומן בלוטים בסתיו, ושוכח חלק מהם.',
  ],
  guesses: [
    { id: 'piles', text: 'ערימות הסלעים הביאו המון שפנים, והם אוכלים את הנבטים', icon: 'rocks', right: true },
    { id: 'jays', text: 'אין מספיק עורבנים שטומנים בלוטים', icon: 'species:jay' },
    { id: 'rain', text: 'אין מספיק גשם', icon: 'rain' },
    { id: 'old', text: 'האלונים זקנים מדי', icon: 'species:oak' },
  ],
  dilemma: {
    at: 60,
    title: 'סלעים או מגינים?',
    text: 'השפנים גרים בערימות הסלעים, ואוכלים כמעט כל נבט. מה עושים?',
    options: [
      { idea: 'piles', plus: 'השפנים חוזרים למספר רגיל', minus: 'צריך לפנות כמה ערימות, ולוקח זמן' },
      { idea: 'shelters', plus: 'הנבטים מוגנים כבר מהיום', minus: 'יקר, וכל מגן שומר רק על נבט אחד' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'נבטי האלון שהעורבנים שתלו גדלים עכשיו לאלונים צעירים, והשפנים כבר לא אוכלים את כולם. החורש מתחדש.',
  learned: 'לפעמים בעיה של צמחים מתחילה בבית של מישהו אחר: ערימת סלעים אחת יכולה לשנות חורש שלם.',
  realStory: 'בהרים של ארץ ישראל השפנים התפשטו למקומות חדשים, כי סלילת כבישים ובנייה השאירו ערימות של סלעים גדולים, והשפנים גרים בין סלעים. ליד מטעים חדשים הם אוכלים את העלים של העצים הצעירים. בירושלים סגרו ערימות סלעים כדי שהשפנים לא יגורו ליד הבתים.',
  source: 'tikva',
  stars: { thrift: 18 },   // three piles cleared; the shelters, or fox and fence first, cost more
  budget: 70,
  tests: {
    within: 800,
    traps: {
      'moving hyraxes away': [{ t: 30, idea: 'move' }, { t: 40, idea: 'move' }],
      'a fox': [{ t: 30, idea: 'fox' }, { t: 40, idea: 'fox' }],
      'a fence': [{ t: 30, idea: 'fence' }],
      'food for the hyraxes': [{ t: 30, idea: 'feed' }, { t: 60, idea: 'feed' }],
      'planting oak saplings': [{ t: 30, idea: 'saplings' }, { t: 40, idea: 'saplings' }],
      'more jays': [{ t: 30, idea: 'jays' }, { t: 40, idea: 'jays' }],
      'acorns from a drone': [{ t: 30, idea: 'seed-drone' }],
      'one pile only': [{ t: 30, idea: 'piles' }],
      'two piles only': [{ t: 30, idea: 'piles' }, { t: 35, idea: 'piles' }],
      'moving hyraxes and a fence': [{ t: 30, idea: 'move' }, { t: 35, idea: 'fence' }, { t: 60, idea: 'move' }],
    },
    fixes: {
      'clearing three piles': [{ t: 30, idea: 'piles' }, { t: 35, idea: 'piles' }, { t: 40, idea: 'piles' }],
      'clearing all four piles': [{ t: 30, idea: 'piles' }, { t: 35, idea: 'piles' }, { t: 40, idea: 'piles' }, { t: 45, idea: 'piles' }],
      'tube shelters': [{ t: 30, idea: 'shelters' }],
      'two piles and tube shelters': [{ t: 30, idea: 'piles' }, { t: 35, idea: 'piles' }, { t: 40, idea: 'shelters' }],
      'moving hyraxes first, then the piles': [{ t: 30, idea: 'move' }, { t: 100, idea: 'piles' }, { t: 105, idea: 'piles' }, { t: 110, idea: 'piles' }],
    },
  },
  scene: {
    season: 3,      // autumn: the jays bury acorns
    dayFrac: 0.4,   // late morning: the hyraxes are out of their rocks
    decor: [['carob', 1, 2], ['terebinth', 1, 2], ['mastic', 1, 3], ['sage', 1, 3], ['rockrose', 1, 3], ['cyclamen', 1, 3]],
  },
};
