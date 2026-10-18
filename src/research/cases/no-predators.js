// תעלומה (מתקדמים, יער הגשם): היער שנשאר בלי טורפים.
// A patch of rain forest was cut off from the big forest by a wide road, and the tallest kapok and Brazil nut trees
// are still being felled. The jaguar needs a very big area and cannot reach the patch; the harpy eagle needs a tall
// tree with a wide crown for its nest and finds none. With no hunters left, the howler monkeys and the agoutis
// multiply: the monkeys strip the young leaves and the saplings, the agoutis eat almost every seed and seedling, and
// the old trees, weakened, die faster than new ones grow. Three causes in one loop: (1) the patch is cut off (no way in
// for the jaguar); (2) the nest trees are going (no home for the harpy eagle); (3) without young trees there will be
// no tall trees later, and the harpy will never come back. The clock restarts at this level, so the forest must hold.
// Ways that heal: a strip of trees along the stream that runs under the road bridge (cheap, slow) or a crossing for
// animals under the road (fast, costly); stopping the felling of the tall kapoks, or of the tall Brazil nut trees
// (the harpy nests in both). Traps: bringing a jaguar or a harpy with no room, moving monkeys or agoutis away (they
// breed back, and with no agoutis nobody buries seeds), fruit for the monkeys (more monkeys), planting saplings while
// the herbivores are many, fences round a few seedlings (they grow inside, nothing changes outside).
// Dilemma: the monkeys are stripping the trees now: move half of them (fast, they come back) or stop the felling of
// the tall trees (slow: the harpy eagle needs time to find them).
// Facts (docs/sources.md): on the small islands of Lago Guri, Venezuela, cut off by a dam lake in 1986, the predators
// (jaguars, harpy eagles) were gone, and plant eaters became 10 to 100 times more common than on the mainland (howler
// monkeys about 1,000 per km² against 20 to 40); seedlings and saplings of canopy trees were severely reduced
// (Terborgh et al. 2001, Duke press release, PBS "Strange Days"); the jaguar needs about 250 km² in the Amazon, and
// forest along rivers serves as a corridor (Pesquisa FAPESP); the harpy eagle nests in the tallest emergent trees,
// most often the kapok and often the Brazil nut, and most nest trees are timber trees (Miranda et al.; Mongabay 2020);
// its diet is mostly sloths, with monkeys too (Aguiar-Silva et al. 2014); the agouti buries seeds it forgets.
// Advanced level: plain Hebrew, three causes in a loop, several traps, the clock restarts. No hunting is shown: a
// hunter that finds no room leaves the patch, and the animals that are "moved" are carried to another forest.

export const NO_PREDATORS = {
  id: 'no-predators',
  zone: 'amazon',
  level: 'advanced',
  order: 3,
  title: 'היער שנשאר בלי טורפים',
  plainTitle: 'היער שנשאר בלי טורפים',
  call: 'בחלקת היער הזאת כבר אין יגואר ואין עיט הרפיה. הקופים והאגוטים התרבו מאוד, ועצים צעירים כמעט אין.',
  callMore: 'שומרי היער אומרים שהקופים היללנים כבר כמעט לא צועקים: יש כל כך הרבה מהם. הקרקע מתחת לעצים ריקה. מה חסר כאן?',
  holdSeconds: 240,
  model: {
    vars: [
      { id: 'jaguar', kind: 'animal', init: 0, need: 0.1, birth: 0.004, death: 0.0012, hungry: 0.4, leaveHungry: 0.05,
        cap: { of: 'corridor', per: 2.4, plus: 0.3 }, leaveCrowded: 0.07, arrive: 0.035, arriveIf: 0.3, food: true, preyHalf: 25 },
      { id: 'harpy', kind: 'animal', init: 0, need: 0.1, birth: 0.003, death: 0.0012, hungry: 0.4, leaveHungry: 0.05,
        cap: { of: 'tallK', per: 1.3, also: [{ of: 'tallB', per: 1.3 }] }, leaveCrowded: 0.07, arrive: 0.035, arriveIf: 0.3, food: true, preyHalf: 20 },
      { id: 'howler', kind: 'animal', init: 90, need: 0.2, birth: 0.012, death: 0.003, hungry: 0.35, leaveHungry: 0.03,
        cap: 220, leaveCrowded: 0.05, food: true },
      { id: 'agouti', kind: 'animal', init: 70, need: 0.2, birth: 0.014, death: 0.004, hungry: 0.35, leaveHungry: 0.03,
        cap: 180, leaveCrowded: 0.05, food: true },
      { id: 'trees', kind: 'plant', init: 14 },        // the canopy trees of the patch
      { id: 'young', kind: 'plant', init: 0.5 },       // saplings
      { id: 'leaves', kind: 'stock', init: 300 },      // young leaves in the canopy
      { id: 'seeds', kind: 'stock', init: 140 },       // fruits and seeds on the forest floor
      { id: 'buried', kind: 'stock', init: 4 },        // seeds the agoutis buried and forgot
      { id: 'tallK', kind: 'stock', init: 0.25 },      // tall kapoks with a wide crown: harpy nest trees
      { id: 'fellK', kind: 'stock', init: 1 },         // the felling of the tall kapoks
      { id: 'tallB', kind: 'stock', init: 0.2 },       // tall Brazil nut trees: the harpy nests in them too
      { id: 'fellB', kind: 'stock', init: 1 },
      { id: 'corridor', kind: 'stock', init: 0 },      // a way between the patch and the big forest
      { id: 'strip', kind: 'stock', init: 0 },         // young trees planted along the stream, not yet a corridor
      { id: 'plots', kind: 'stock', init: 0 },         // fenced plots that keep the plant eaters away from a few seedlings
      { id: 'fenced', kind: 'plant', init: 0 },        // seedlings inside the fenced plots
      { id: 'fruit', kind: 'stock', init: 0 },         // fruit put out for the monkeys
    ],
    flows: [
      // the canopy: leaves and seeds
      { type: 'produce', from: 'trees', to: 'leaves', rate: 2, byCap: 600 },
      { type: 'produce', from: 'trees', to: 'seeds', rate: 1.5, byCap: 700 },
      { type: 'decay', of: 'leaves', rate: 0.004 },
      { type: 'decay', of: 'seeds', rate: 0.01 },
      // howler monkeys: young leaves, the leaves of saplings, and (many of them) the crowns of weak trees
      { type: 'consume', eater: 'howler', food: 'leaves', need: 0.2, half: 80 },
      { type: 'consume', eater: 'howler', food: 'fruit', need: 0.2, half: 40 },
      { type: 'decay', of: 'fruit', rate: 0.003 },
      { type: 'consume', eater: 'howler', food: 'young', need: 0.006, half: 2 },
      { type: 'consume', eater: 'howler', food: 'trees', need: 0.00008, half: 6 },
      // agoutis: eat seeds and bury a few they forget; they nibble seedlings too
      { type: 'consume', eater: 'agouti', food: 'seeds', need: 0.2, half: 60, cache: { to: 'buried', share: 0.2 } },
      { type: 'consume', eater: 'agouti', food: 'young', need: 0.004, half: 2 },
      { type: 'consume', eater: 'agouti', food: 'buried', need: 0.04, half: 60 },   // many agoutis dig up the hidden seeds again
      { type: 'germinate', from: 'buried', to: 'young', rate: 0.01, yield: 0.3 },
      { type: 'decay', of: 'buried', rate: 0.004 },
      // inside the fenced plots seedlings come up from the seed bank, out of reach
      { type: 'produce', from: 'plots', to: 'fenced', rate: 0.06, byCap: 20 },
      { type: 'mature', from: 'fenced', to: 'young', rate: 1 / 60 },   // they grow out of the plant eaters' reach and join the saplings
      // saplings grow up slowly; old trees die
      { type: 'mature', from: 'young', to: 'trees', rate: 1 / 180, cap: 30 },
      { type: 'decay', of: 'young', rate: 0.002 },
      { type: 'decay', of: 'trees', rate: 0.0003 },
      // the hunters
      { type: 'prey', pred: 'jaguar', prey: 'agouti', attack: 0.03, handling: 0.6, refuge: 12 },
      { type: 'prey', pred: 'harpy', prey: 'howler', attack: 0.03, handling: 0.6, refuge: 12 },
      // big trees that are not felled grow tall wide crowns (in the mystery's quick time); the felling takes them first
      { type: 'produce', from: 'trees', to: 'tallK', rate: 0.0006, byCap: 1.5 },
      { type: 'produce', from: 'trees', to: 'tallB', rate: 0.0004, byCap: 1 },
      { type: 'consume', eater: 'fellK', food: 'tallK', need: 0.02, half: 0.3 },
      { type: 'consume', eater: 'fellB', food: 'tallB', need: 0.02, half: 0.3 },
      // the planted strip becomes a corridor when its trees grow up
      { type: 'mature', from: 'strip', to: 'corridor', rate: 1 / 120, cap: 1.2 },
    ],
  },
  lights: [
    { light: 'life', id: 'jaguar', min: 0.8 },
    { light: 'life', id: 'harpy', min: 0.8 },
    { light: 'life', id: 'howler', min: 8, max: 45 },
    { light: 'life', id: 'agouti', min: 6, max: 40 },
    { light: 'life', id: 'trees', min: 10 },
    { light: 'regen', id: 'young', min: 2.5 },
    { light: 'env', id: 'leaves', min: 350 },
  ],
  lightNames: { life: 'טורפים וצמחונים', regen: 'עצים צעירים', env: 'עלים צעירים בצמרות' },
  board: [
    { id: 'jaguar', name: 'יגוארים', species: 'jaguar', tool: 'nightcam' },
    { id: 'harpy', name: 'עיטי הרפיה', species: 'harpy', tool: 'drone' },
    { id: 'howler', name: 'קופים יללנים', species: 'howler', tool: 'forestcam' },
    { id: 'agouti', name: 'אגוטים', species: 'agouti', tool: 'forestcam' },
    { id: 'trees', name: 'עצים גדולים', species: 'kapok', tool: 'drone' },
    { id: 'tallK', name: 'קפוקים ענקיים לקן', icon: 'talltree', tool: 'drone', scale: 4 },
    { id: 'leaves', name: 'עלים צעירים בצמרות', icon: 'canopy', tool: 'drone', scale: 0.1 },
    { id: 'young', name: 'עצים צעירים', icon: 'sprout', tool: 'quadrat' },
  ],
  visual: [
    { id: 'jaguar', species: 'jaguar', max: 2 },
    { id: 'harpy', species: 'harpy', max: 2 },
    { id: 'howler', species: 'howler', scale: 'sqrt', max: 12 },
    { id: 'agouti', species: 'agouti', scale: 'sqrt', max: 10 },
    { id: 'trees', species: 'kapok', plant: 'adult', max: 9 },
    { id: 'young', species: 'kapok', plant: 'young', max: 10 },
  ],
  tools: [
    { id: 'forestcam', kind: 'daycam', near: 'kapok', name: 'מצלמת שטח', icon: 'camera', tell: 'המצלמה סופרת ביום את הקופים בצמרות ואת האגוטים על הקרקע.' },
    { id: 'nightcam', name: 'מצלמת לילה', icon: 'camera', tell: 'בלילה המצלמה מצלמת את מי שעובר ליד הנחל. אולי גם יגואר.' },
    { id: 'drone', name: 'רחפן ספירה', icon: 'drone', tell: 'הרחפן עף מעל הצמרות. הוא סופר עצים, עצים ענקיים שאפשר לבנות עליהם קן, עיטים ועלים צעירים.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים עצים צעירים על הקרקע.' },
  ],
  ideas: [
    { id: 'strip', title: 'לשתול עצים לאורך הנחל, מתחת לגשר של הכביש', icon: 'corridor', amounts: [1], cost: 8, max: 1, effect: { add: { strip: 1 } } },
    { id: 'crossing', title: 'מעבר לחיות מתחת לכביש', icon: 'underpass', amounts: [1], cost: 26, max: 1, effect: { add: { corridor: 1 } }, tech: true },
    { id: 'protectK', title: 'להפסיק לכרות את עצי הקפוק הגבוהים', icon: 'species:kapok', amounts: [1], cost: 6, max: 1, effect: { add: { fellK: -1 } } },
    { id: 'protectB', title: 'לשמור על עצי אגוז הברזיל הגבוהים', icon: 'species:brazilnut', amounts: [1], cost: 6, max: 1, effect: { add: { fellB: -1 } } },
    { id: 'jaguar', title: 'להביא יגואר', icon: 'species:jaguar', amounts: [1], cost: 8, effect: { add: { jaguar: 1 } } },
    { id: 'harpy', title: 'להביא זוג עיטי הרפיה', icon: 'species:harpy', amounts: [2], cost: 4, perUnit: true, effect: { add: { harpy: 1 } } },
    { id: 'move-howlers', title: 'להעביר 40 קופים ליער אחר', icon: 'species:howler', amounts: [1], cost: 8, effect: { add: { howler: -40 } } },
    { id: 'move-agoutis', title: 'להעביר 30 אגוטים ליער אחר', icon: 'species:agouti', amounts: [1], cost: 6, effect: { add: { agouti: -30 } } },
    { id: 'fruit', title: 'לתת לקופים פירות, שיעזבו את העלים', icon: 'fruitpile', amounts: [1], cost: 4, max: 2, effect: { add: { fruit: 600 } } },
    { id: 'nursery', title: 'לשתול עצים צעירים מהמשתלה', icon: 'sprout', amounts: [4], cost: 2, perUnit: true, max: 2, effect: { add: { young: 1 } } },
    { id: 'plots', title: 'לגדר כמה חלקות קטנות של נבטים', icon: 'plots', amounts: [1], cost: 3, max: 2, effect: { add: { plots: 1 } } },
  ],
  after: {
    strip: { test: 'corridor', below: 0.6, no: 'השתילים לאורך הנחל נקלטו. כשיגדלו, תהיה כאן רצועת יער שעוברת מתחת לגשר.', ok: 'רצועת היער לאורך הנחל כבר גבוהה. מתחת לגשר יש שביל של חיות.' },
    crossing: 'המעבר מתחת לכביש מוכן. חיות יכולות לעבור בו בלי לחצות את הכביש.',
    protectK: { test: 'tallK', below: 0.6, no: 'הפסיקו לכרות את הקפוקים הגבוהים. ייקח זמן עד שהצמרות שלהם יהיו רחבות מספיק לקן.', ok: 'יש שוב קפוקים ענקיים עם צמרת רחבה. מקום טוב לקן.' },
    protectB: { test: 'tallB', below: 0.6, no: 'עצי אגוז הברזיל הגבוהים נשארים לעמוד. הם גדלים לאט.', ok: 'יש שוב עצי אגוז ברזיל ענקיים. גם עליהם עיט ההרפיה בונה קן.' },
    jaguar: { test: 'corridor', below: 0.5, no: 'היגואר הסתובב בחלקה כמה ימים. השטח קטן מדי בשבילו, והוא כבר מחפש דרך החוצה.', ok: 'היגואר נשאר. לאורך הנחל הוא יכול לצאת ליער הגדול ולחזור.' },
    harpy: { test: 'harpy', below: 1, no: 'העיטים חיפשו עץ ענק לקן, לא מצאו ועזבו.', ok: 'העיטים מצאו עץ ענק עם צמרת רחבה, ונשארו.' },
    'move-howlers': 'ארבעים קופים עברו ליער אחר. בינתיים נשארו יותר עלים.',
    'move-agoutis': 'שלושים אגוטים עברו ליער אחר. מי ייקח את מקומם?',
    fruit: 'הקופים שמחו מאוד בפירות.',
    nursery: { test: 'howler', below: 30, no: 'השתילים נשתלו, אבל הקופים והאגוטים כבר אכלו את רובם.', ok: 'השתילים גדלים, והקופים והאגוטים כמעט לא נוגעים בהם.' },
    plots: 'סביב כמה חלקות קטנות יש עכשיו גדר. נבדוק מה צומח בפנים.',
  },
  surprises: [
    { id: 'plots-inside', idea: 'plots', test: 'fenced', above: 2.4, text: 'בתוך הגדר צמחו הרבה נבטים, ובחוץ כמעט אין. האדמה טובה. מישהו אוכל את הנבטים בחוץ.' },
    { id: 'jaguar-left', idea: 'jaguar', test: 'jaguar', below: 0.6, text: 'היגואר יצא מהחלקה. יגואר צריך שטח ענק, הרבה יותר גדול מהחלקה שלנו.' },
    { id: 'harpy-left', idea: 'harpy', test: 'harpy', below: 0.6, text: 'עיטי ההרפיה עזבו. בלי עץ ענק עם צמרת רחבה אין להם איפה לבנות קן.' },
    { id: 'howlers-back', idea: 'move-howlers', test: 'howler', above: 110, text: 'הפתעה: יש שוב הרבה קופים. נולדו גורים, ואין מי שיצוד אותם.' },
    { id: 'fruit-boom', idea: 'fruit', test: 'howler', above: 150, text: 'הפתעה: עם כל הפירות האלה נולדו עוד ועוד קופים. עכשיו הם אוכלים גם את הפירות וגם את העלים.' },
    { id: 'agouti-buried', idea: 'move-agoutis', test: 'buried', below: 25, text: 'פחות אגוטים, ופחות זרעים טמונים באדמה. האגוטים לא רק אוכלים זרעים. הם גם שותלים אותם.' },
    { id: 'nursery-eaten', idea: 'nursery', test: 'young', below: 1, text: 'השתילים מהמשתלה נעלמו. על הקרקע נשארו רק גבעולים אכולים.' },
    { id: 'jaguar-tracks', idea: 'strip', test: 'corridor', above: 0.6, text: 'רצועת היער לאורך הנחל כבר גבוהה, ובבוץ ליד הגשר יש עקבות גדולות של יגואר!' },
    { id: 'harpy-nest', test: 'tallK', above: 0.8, text: 'הצמרת של אחד הקפוקים הענקיים רחבה עכשיו, ועליה נבנה קן ענק מענפים. עיטי ההרפיה חזרו.' },
    { id: 'howlers-loud', test: 'howler', below: 30, text: 'שומעים שוב בבוקר את הקופים היללנים צועקים, כמו ביער הגדול.' },
  ],
  mainFix: ['strip', 'protectK', 'plots'],
  hints: [
    'מי צד קופים ואגוטים ביער גדול? כדאי לספור גם בלילה.',
    'יגואר צריך שטח ענק. איך הוא יגיע לכאן מהיער הגדול?',
    'עיט ההרפיה בונה קן רק על עץ ענק עם צמרת רחבה. כמה עצים כאלה נשארו?',
    'גדר קטנה סביב חלקת נבטים היא ניסוי: מה צומח כשאף אחד לא אוכל?',
    'ברמה הזאת צריך לתקן את כל הרשת, ואז לחכות בסבלנות.',
  ],
  guesses: [
    { id: 'hunters', text: 'אין טורפים, ולכן הצמחונים אוכלים את העצים הצעירים', icon: 'species:jaguar', right: true },
    { id: 'agouti', text: 'האגוטים אשמים. צריך להוציא אותם מהיער', icon: 'species:agouti' },
    { id: 'rain', text: 'אין מספיק גשם', icon: 'rain' },
    { id: 'old', text: 'העצים זקנים מדי', icon: 'species:kapok' },
  ],
  dilemma: {
    at: 60,
    title: 'הקופים מקרחים את העצים',
    text: 'בכל בוקר יש פחות עלים צעירים בצמרות. צריך לעשות משהו עכשיו.',
    options: [
      { idea: 'move-howlers', plus: 'מיד יהיו פחות קופים', minus: 'גורים ייוולדו, ואין מי שיצוד אותם' },
      { idea: 'protectK', plus: 'עיט ההרפיה יוכל לבנות קן ולצוד קופים', minus: 'לוקח זמן עד שהצמרות מתרחבות והעיט מגיע' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'היגואר מגיע לאורך הנחל, עיטי ההרפיה מקננים על העצים הענקיים, הקופים והאגוטים כבר לא משתלטים, ועצים צעירים צומחים שוב.',
  learned: 'טורף גדול שומר על כל היער: הוא לא נותן לצמחונים להתרבות בלי סוף, וכך נשאר מקום לעצים צעירים.',
  realStory: 'בשנת 1986 סכר גדול בוונצואלה הציף עמק, והגבעות הפכו לאיים באגם גורי. באיים הקטנים לא נשארו יגוארים ועיטי הרפיה. אחרי כמה שנים היו שם פי 10 עד פי 100 צמחונים מאשר ביבשה, וכמעט לא צמחו עצים צעירים.',
  source: 'kfirim',
  stars: { thrift: 22 },   // the strip (8), the kapoks (6), one or two fenced plots (3 each) = 17 to 20
  budget: 70,
  tests: {
    within: 1100,
    traps: {
      'bring a jaguar': [{ t: 30, idea: 'jaguar' }, { t: 40, idea: 'jaguar' }],
      'bring harpy eagles': [{ t: 30, idea: 'harpy' }, { t: 40, idea: 'harpy' }],
      'move the monkeys away': [{ t: 30, idea: 'move-howlers' }, { t: 120, idea: 'move-howlers' }],
      'move the agoutis away': [{ t: 30, idea: 'move-agoutis' }, { t: 35, idea: 'move-howlers' }],
      'fruit for the monkeys': [{ t: 30, idea: 'fruit' }, { t: 60, idea: 'fruit' }],
      'saplings from the nursery': [{ t: 30, idea: 'nursery' }, { t: 40, idea: 'nursery' }],
      'only fenced plots': [{ t: 30, idea: 'plots' }, { t: 35, idea: 'plots' }],
      'hunters back, nobody guards the seedlings': [{ t: 30, idea: 'strip' }, { t: 35, idea: 'protectK' }],
      'hunters back, then the nursery': [{ t: 30, idea: 'strip' }, { t: 35, idea: 'protectK' }, { t: 300, idea: 'nursery' }, { t: 310, idea: 'nursery' }],
      'no nest trees': [{ t: 30, idea: 'strip' }, { t: 35, idea: 'plots' }, { t: 40, idea: 'harpy' }],
      'no way in for the jaguar': [{ t: 30, idea: 'protectK' }, { t: 35, idea: 'protectB' }, { t: 40, idea: 'plots' }, { t: 45, idea: 'jaguar' }],
    },
    fixes: {
      'the stream, the kapoks, a fenced plot': [{ t: 30, idea: 'strip' }, { t: 35, idea: 'protectK' }, { t: 40, idea: 'plots' }],
      'the crossing and the Brazil nut trees': [{ t: 30, idea: 'crossing' }, { t: 35, idea: 'protectB' }, { t: 40, idea: 'plots' }],
      'the stream and the Brazil nut trees': [{ t: 30, idea: 'strip' }, { t: 35, idea: 'protectB' }, { t: 40, idea: 'plots' }, { t: 45, idea: 'plots' }],
      'moving monkeys first, then the right way': [{ t: 30, idea: 'move-howlers' }, { t: 60, idea: 'strip' }, { t: 65, idea: 'protectK' }, { t: 70, idea: 'plots' }],
      'everything for the tall trees': [{ t: 30, idea: 'crossing' }, { t: 35, idea: 'protectK' }, { t: 40, idea: 'protectB' }, { t: 45, idea: 'plots' }],
    },
  },
  scene: {
    dayFrac: 0.3,   // morning: the monkeys are in the crowns, the agoutis on the ground
    decor: [['fig', 1, 1], ['acai', 1, 3], ['cecropia', 1, 2], ['heliconia', 1, 3], ['fern', 1, 4], ['liana', 1, 2]],
  },
};
