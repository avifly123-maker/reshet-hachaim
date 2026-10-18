// תעלומה (בינוני, יער הגשם): הנמלים שאכלו את היער.
// At the edge of the forest there are leaf-cutter ant nests everywhere, and no young tree gets past a few leaves. Two
// causes, one tied to the other, and a loop: the big trees at the edge were cut, the sun came in, and soft sun-loving
// plants spread there; leaf-cutter ants like those soft leaves best, so many more colonies grow at the edge; and the
// many ants cut the young forest trees too, so the edge never closes and the sun keeps coming in. The ants are part of
// the forest (the lights want some nests), only too many.
// The usual route: plant forest trees at the edge; the ants cut some of them, but enough grow, the edge gets shade, the
// soft plants and with them most of the nests fade. Another way: cecropias with their guard ants (the leaf-cutters
// leave them alone) shade the edge fast. A shade net works while it lasts and then tears; with forest trees under it,
// it is a fast start. Traps: anteaters (each nest only a minute), moving nests (new queens fly in), cutting the soft
// plants (they grow back in the sun, and the hungry ants turn to the young trees), leaves spread for the ants (more
// food, more nests), a fence (ants walk under it), seeds from a drone (the seedlings are cut).
// Facts (amazon.js + docs/sources.md): leaf-cutter colonies are much denser in forest fragments, gaps and young
// secondary forest, where pioneer plants abound, and fewer again as the forest regrows and shade trees replace the
// pioneers; in the areas the ants forage, there are about half as many seedlings; Azteca ants in cecropias keep
// leaf-cutters off; the giant anteater eats at each nest about a minute and moves on.
// Middle level: plain Hebrew, two linked causes, traps, other ways, surprises, a dilemma.

export const LEAFCUTTERS = {
  id: 'leafcutters',
  zone: 'amazon',
  level: 'middle',
  order: 4,
  title: 'הנמלים שאכלו את היער',
  plainTitle: 'הנמלים שאכלו את היער',
  call: 'בשולי היער יש קני נמלים בכל מקום, ואף עץ צעיר לא מצליח לגדול.',
  callMore: 'שומרי היער רואים שורות ארוכות של נמלים גוזרות עלים, שסוחבות חתיכות עלים ירוקות. כל עץ צעיר נשאר בלי עלים. מה קרה כאן?',
  holdSeconds: 180,
  model: {
    vars: [
      // leaf-cutter colonies: they grow by how much soft leaf they find; new queens fly in and start nests where there is food
      { id: 'ants', kind: 'animal', init: 24, need: 0.3, birth: 0.012, death: 0.003, hungry: 0.35, leaveHungry: 0.06,
        cap: 40, leaveCrowded: 0.1, arrive: 0.15, arriveIf: 0.4, food: true },
      { id: 'light', kind: 'stock', init: 1 },         // the open edge: sun on the ground
      { id: 'soft', kind: 'plant', init: 40 },         // soft sun-loving plants at the edge
      { id: 'forest', kind: 'plant', init: 10 },       // the old forest behind the edge
      { id: 'tough', kind: 'stock', init: 15 },        // leaves of the old forest: tough, the ants cut a little of them
      { id: 'seedlings', kind: 'plant', init: 1 },     // young forest trees that come up from seed by themselves
      { id: 'saplings', kind: 'plant', init: 0 },      // young forest trees taller than a seedling
      { id: 'shade', kind: 'stock', init: 0 },         // shade over the edge, from growing trees
      { id: 'cecroY', kind: 'plant', init: 0 },        // young cecropias
      { id: 'cecro', kind: 'plant', init: 0 },         // grown cecropias (their guard ants keep the leaf-cutters off)
      { id: 'anteater', kind: 'animal', init: 0, need: 0.2, birth: 0, death: 0.002, hungry: 0.3, leaveHungry: 0.05,
        cap: 1.2, leaveCrowded: 0.04, food: true, preyHalf: 5 },
      { id: 'net', kind: 'stock', init: 0 },           // a shade net over the edge
      { id: 'leaves', kind: 'stock', init: 0 },        // leaves spread by the nests
      { id: 'fence', kind: 'stock', init: 0 },
    ],
    flows: [
      { type: 'produce', from: 'light', to: 'soft', rate: 3, byCap: 120 },
      { type: 'decay', of: 'soft', rate: 0.01 },
      // shade from the trees and from the net crowds the soft plants out
      { type: 'consume', eater: 'shade', food: 'soft', need: 0.8, half: 15 },
      { type: 'consume', eater: 'net', food: 'soft', need: 6, half: 15 },
      { type: 'decay', of: 'net', rate: 0.007 },      // wind and rain tear it
      // the ants cut soft leaves for their fungus garden, a little of the old forest, and the young forest trees too
      { type: 'consume', eater: 'ants', food: 'soft', need: 0.3, half: 30 },
      { type: 'produce', from: 'forest', to: 'tough', rate: 0.03, byCap: 100 },
      { type: 'consume', eater: 'ants', food: 'tough', need: 0.3, half: 30 },
      { type: 'consume', eater: 'ants', food: 'leaves', need: 0.3, half: 30 },
      { type: 'decay', of: 'leaves', rate: 0.01 },
      { type: 'consume', eater: 'ants', food: 'seedlings', need: 0.012, half: 5 },
      { type: 'consume', eater: 'ants', food: 'saplings', need: 0.005, half: 14 },
      // the old forest drops seeds; young trees grow up and, at the edge, start to shade it
      { type: 'produce', from: 'forest', to: 'seedlings', rate: 0.005, byCap: 40 },
      { type: 'mature', from: 'seedlings', to: 'saplings', rate: 1 / 100, cap: 40 },
      { type: 'decay', of: 'seedlings', rate: 0.004 },
      { type: 'produce', from: 'saplings', to: 'shade', rate: 0.025, byCap: 14 },
      { type: 'mature', from: 'cecroY', to: 'cecro', rate: 1 / 50, cap: 12 },
      { type: 'produce', from: 'cecro', to: 'shade', rate: 0.03, byCap: 14 },   // the cecropia grows fast
      { type: 'decay', of: 'shade', rate: 0.01 },   // shade lasts only while the trees stand
      // the giant anteater licks at a nest for about a minute, then walks on
      { type: 'prey', pred: 'anteater', prey: 'ants', attack: 0.002, handling: 60 },
    ],
  },
  lights: [
    { light: 'life', id: 'ants', min: 2 },
    { light: 'life', id: 'soft', min: 3 },
    { light: 'regen', id: 'saplings', min: 4 },
    { light: 'env', id: 'ants', max: 12 },
  ],
  lightNames: { life: 'חיים', regen: 'עצים צעירים', env: 'מעט קני נמלים' },
  board: [
    { id: 'ants', name: 'קני נמלים', species: 'leafcutter', tool: 'fieldcam' },
    { id: 'anteater', name: 'נמלנים', species: 'anteater', tool: 'fieldcam' },
    { id: 'soft', name: 'צמחים רכים בשוליים', icon: 'softplants', tool: 'drone' },
    { id: 'shade', name: 'צל בשוליים', icon: 'shade', tool: 'drone' },
    { id: 'cecro', name: 'צקרופיות', species: 'cecropia', tool: 'drone' },
    { id: 'saplings', name: 'עצים צעירים', icon: 'sapling', tool: 'quadrat' },
  ],
  visual: [
    { id: 'ants', species: 'leafcutter', scale: 'sqrt', max: 7 },
    { id: 'anteater', species: 'anteater', max: 2 },
    { id: 'soft', species: 'heliconia', plant: 'adult', per: 8, max: 12 },
    { id: 'saplings', species: 'brazilnut', plant: 'young', max: 8 },
    { id: 'cecro', species: 'cecropia', plant: 'adult', max: 6 },
    { id: 'cecroY', species: 'cecropia', plant: 'young', max: 6 },
  ],
  tools: [
    { id: 'fieldcam', kind: 'daycam', near: 'heliconia', name: 'מצלמת שטח', icon: 'camera', tell: 'המצלמה בשולי היער סופרת קני נמלים, ומי בא לאכול אותן.' },
    { id: 'drone', name: 'רחפן ספירה', icon: 'drone', tell: 'הרחפן מצלם את שולי היער מלמעלה: כמה צמחים רכים יש בשמש, וכמה עצים נותנים צל.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים עצים צעירים בשולי היער.' },
  ],
  ideas: [
    { id: 'forest', title: 'לשתול עצי יער בשוליים', icon: 'species:brazilnut', amounts: [4], cost: 8, max: 3, effect: { add: { saplings: 1 } } },
    { id: 'cecropia', title: 'לשתול צקרופיות עם נמלי השמירה שלהן', icon: 'species:cecropia', amounts: [3], cost: 9, max: 2, effect: { add: { cecroY: 1 } } },
    { id: 'net', title: 'רשת צל מעל השוליים', icon: 'shadenet', amounts: [1], cost: 14, max: 1, effect: { add: { net: 1 } }, tech: true },
    { id: 'anteater', title: 'להביא נמלנים', icon: 'species:anteater', amounts: [2], cost: 6, max: 2, effect: { add: { anteater: 1 } } },
    { id: 'move', title: 'להעביר קני נמלים למקום אחר', icon: 'species:leafcutter', amounts: [5], cost: 6, effect: { add: { ants: -1 } } },
    { id: 'cut', title: 'לקצוץ את הצמחים הרכים בשוליים', icon: 'cutplants', amounts: [1], cost: 4, max: 3, effect: { add: { soft: -55 } } },
    { id: 'leaves', title: 'לפזר עלים ליד הקנים, שלא ייגעו בעצים', icon: 'leafpile', amounts: [1], cost: 3, max: 3, effect: { add: { leaves: 300 } } },
    { id: 'fence', title: 'גדר רשת סביב העצים הצעירים', icon: 'fence', amounts: [1], cost: 8, max: 1, effect: { add: { fence: 1 } } },
    { id: 'seed-drone', title: 'רחפן זריעה (זרעי עצי יער)', icon: 'seeddrone', amounts: [1], cost: 8, effect: { add: { seedlings: 12 } }, tech: true },
  ],
  after: {
    // { test, below, no, ok }: `no` is shown when the measured number is below `below`
    forest: { test: 'saplings', below: 3, no: 'הנמלים מצאו את השתילים, וגזרו את רובם. צריך עוד עצים, או עזרה.', ok: 'העצים הצעירים נאחזו באדמה. הנמלים גזרו מהם קצת, אבל הם ממשיכים לגדול.' },
    cecropia: 'הצקרופיות נשתלו. בתוך הגזע החלול שלהן כבר גרות נמלים קטנות ששומרות עליהן.',
    net: 'רשת הצל נמתחה מעל השוליים. מתחתיה מוצל ונעים.',
    anteater: { test: 'ants', below: 10, no: 'הנמלן אכל מכמה קנים, ומעט קנים נשארו.', ok: 'הנמלן ליקק מכל קן בערך דקה, והמשיך לקן הבא. הנמלים כמעט לא הרגישו.' },
    move: { test: 'soft', below: 30, no: 'הקנים הועברו, והשוליים מוצלים. מלכות חדשות לא מוצאות כאן מספיק עלים רכים.', ok: 'הקנים הועברו לחלק אחר של היער. אבל השוליים שטופי השמש מחכים לקנים חדשים.' },
    cut: 'קצצנו את הצמחים הרכים. הנמלים נשארו בלי האוכל האהוב עליהן... ומחפשות אוכל אחר.',
    leaves: 'הנמלים סחבו את העלים לקן בשמחה. הפטרייה שלהן גדלה יפה.',
    fence: 'הנמלים עברו מתחת לגדר בשורה ישרה, ולא הסתכלו לצדדים.',
    'seed-drone': { test: 'saplings', below: 2, no: 'נבטים קטנים יצאו מהאדמה, והנמלים גזרו אותם בתוך כמה ימים.', ok: 'נבטים קטנים יצאו מהאדמה, וחלק מהם גדלים.' },
  },
  surprises: [
    { id: 'queens', idea: 'move', test: 'ants', above: 18, text: 'הפתעה: אחרי מעוף הכלולות, מלכות חדשות פתחו קנים בדיוק באותו מקום שטוף שמש.' },
    { id: 'cut-hungry', idea: 'cut', test: 'soft', above: 60, text: 'הצמחים הרכים צמחו מחדש בשמש, מהר מאוד. ובינתיים הנמלים הרעבות גזרו את העצים הצעירים.' },
    { id: 'leaves-boom', idea: 'leaves', test: 'ants', above: 26, text: 'הנמלים גידלו על העלים עוד פטרייה, והקנים גדלו. עכשיו יש עוד יותר קנים.' },
    { id: 'net-tear', idea: 'net', test: 'net', below: 0.3, text: 'רשת הצל נקרעה ברוח ובגשם. השמש חזרה לשוליים, ואיתה הצמחים הרכים.' },
    { id: 'anteater-left', idea: 'anteater', test: 'anteater', below: 0.6, text: 'הנמלן המשיך בדרכו אל היער הגדול. מספר הקנים בשוליים כמעט לא השתנה.' },
    { id: 'guards', idea: 'cecropia', test: 'cecro', above: 2.5, text: 'נמלה גוזרת עלים טיפסה על צקרופיה, ונמלי השמירה הקטנות גירשו אותה מיד.' },
    { id: 'shade', test: 'shade', above: 8, text: 'השוליים נעשים מוצלים. הצמחים הרכים מתמעטים, ואיתם גם קני הנמלים.' },
  ],
  mainFix: ['forest', 'forest'],   // the usual route: forest trees at the edge
  hints: [
    'איפה יש הכי הרבה קני נמלים? הציבו מצלמת שטח בשולי היער.',
    'הנמלים הגוזרות אוהבות במיוחד עלים רכים של צמחים שגדלים בשמש.',
    'פעם היו כאן עצים גדולים עד הקצה. אחרי שנכרתו, השמש נכנסה לשוליים.',
    'מה יכול להחזיר צל לשוליים? ואיזה עץ הנמלים הגוזרות לא מעיזות לגזור?',
  ],
  guesses: [
    { id: 'edge', text: 'השמש בשוליים מגדלת צמחים רכים, והם מאכילים המון קני נמלים', icon: 'softplants', right: true },
    { id: 'anteater', text: 'אין מספיק נמלנים שאוכלים את הנמלים', icon: 'species:anteater' },
    { id: 'bad', text: 'נמלים גוזרות מזיקות ליער, וצריך שלא יהיו בכלל', icon: 'species:leafcutter' },
    { id: 'rain', text: 'אין מספיק גשם', icon: 'rain' },
  ],
  dilemma: {
    at: 60,
    title: 'רשת צל או עצים?',
    text: 'השמש בשוליים מגדלת צמחים רכים, והנמלים מתרבות. מה עושים?',
    options: [
      { idea: 'net', plus: 'צל כבר מהיום', minus: 'יקרה, ונקרעת אחרי זמן' },
      { idea: 'forest', plus: 'צל שנשאר לשנים', minus: 'עצים גדלים לאט, והנמלים גוזרות חלק מהם' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'עצים חדשים החזירו צל לשולי היער. הצמחים הרכים התמעטו, מספר הקנים חזר להיות רגיל, והעצים הצעירים גדלים.',
  learned: 'הנמלים הגוזרות הן חלק מהיער. כשיש יותר מדי מהן, כדאי לבדוק מה מאכיל אותן.',
  realStory: 'חוקרים בברזיל מצאו שבשולי יער, באיים קטנים של יער ובמקומות שבהם היער רק מתחיל לחזור, יש הרבה יותר קני נמלים גוזרות. שם גדלים הרבה צמחים שאוהבים שמש, עם עלים רכים. כשהיער גדל וחוזר להיות מוצל, מספר הקנים יורד.',
  source: 'shnayim',
  stars: { thrift: 24 },   // two or three plantings of forest trees; the net or cecropias cost more
  budget: 70,
  tests: {
    within: 800,
    traps: {
      'anteaters': [{ t: 30, idea: 'anteater' }, { t: 40, idea: 'anteater' }],
      'moving nests away': [{ t: 30, idea: 'move' }, { t: 40, idea: 'move' }, { t: 50, idea: 'move' }],
      'cutting the soft plants': [{ t: 30, idea: 'cut' }, { t: 80, idea: 'cut' }],
      'leaves for the ants': [{ t: 30, idea: 'leaves' }, { t: 60, idea: 'leaves' }],
      'a fence': [{ t: 30, idea: 'fence' }],
      'seeds from a drone': [{ t: 30, idea: 'seed-drone' }, { t: 40, idea: 'seed-drone' }],
      'the shade net alone': [{ t: 30, idea: 'net' }],
      'one planting of forest trees': [{ t: 30, idea: 'forest' }],
      'anteaters and moving nests': [{ t: 30, idea: 'anteater' }, { t: 35, idea: 'move' }, { t: 40, idea: 'move' }],
    },
    fixes: {
      'forest trees, three plantings': [{ t: 30, idea: 'forest' }, { t: 35, idea: 'forest' }, { t: 40, idea: 'forest' }],
      'forest trees, two plantings': [{ t: 30, idea: 'forest' }, { t: 35, idea: 'forest' }],
      'cecropias': [{ t: 30, idea: 'cecropia' }, { t: 35, idea: 'cecropia' }],
      'the net and one planting': [{ t: 30, idea: 'net' }, { t: 35, idea: 'forest' }],
      'moving nests, then forest trees': [{ t: 30, idea: 'move' }, { t: 90, idea: 'forest' }, { t: 95, idea: 'forest' }],
    },
  },
  scene: {
    dayFrac: 0.38,
    decor: [['kapok', 1, 2], ['fig', 1, 2], ['acai', 1, 2], ['fern', 1, 4], ['bromeliad', 1, 2]],
  },
};
