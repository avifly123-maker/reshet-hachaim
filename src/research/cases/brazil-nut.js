// תעלומה (בינוני, יער הגשם): אגוזי הברזיל שלא נותנים פרי.
// The Brazil nut trees flower, but almost no fruit falls and no young Brazil nut trees come up. Two causes, one tied
// to the other: the orchids on the branches are almost gone, so the big orchid bees left, so the lidded flowers are
// not pollinated and few fruits form; with little fruit the agoutis left too, and nobody opens the hard fruits and
// buries the seeds. The fix: orchids on the trees bring the bees back, the fruit comes, and the agoutis come back by
// themselves. The trap: bringing agoutis (or bees) first: with nothing to eat (or no orchids) they leave again.
// Facts (amazon.js + docs/sources.md): the Brazil nut flower has a lid that only big strong bees can lift; orchid bees
// collect scents from orchids; the agouti is one of the few animals that can open the hard fruit, and it buries seeds
// it later forgets; Brazil nut trees planted in rows gave very little fruit, and nearly all Brazil nuts are still
// gathered from wild trees in the forest.
// Middle level: plain Hebrew, two linked causes, one trap.

export const BRAZIL_NUT = {
  id: 'brazil-nut',
  zone: 'amazon',
  level: 'middle',
  order: 1,
  title: 'אגוזי הברזיל שלא נותנים פרי',
  plainTitle: 'אגוזי הברזיל שלא נותנים פרי',
  call: 'עצי אגוז הברזיל פורחים, אבל כמעט אין פירות, ואין אף עץ צעיר.',
  callMore: 'שומרי היער מצאו מעט מאוד פירות על הקרקע. גם האגוטים, שבדרך כלל מסתובבים כאן, כמעט נעלמו. מה קרה כאן?',
  holdSeconds: 180,
  model: {
    vars: [
      { id: 'bees', kind: 'animal', init: 2, need: 0.3, birth: 0.02, death: 0.006, hungry: 0.35, leaveHungry: 0.05,
        cap: { of: 'orchids', per: 1.6, also: [{ of: 'corridor', per: 9 }] }, leaveCrowded: 0.08, arrive: 0.25, arriveIf: 0.25, food: true },
      // honeybees: too small to lift the lid of the Brazil nut flower; they find little here and leave
      { id: 'honeybees', kind: 'animal', init: 0, need: 0.3, birth: 0, death: 0.01, hungry: 0.35, leaveHungry: 0.12, food: true },
      { id: 'agouti', kind: 'animal', init: 1, need: 0.25, birth: 0.015, death: 0.006, hungry: 0.35, leaveHungry: 0.06,
        cap: 14, leaveCrowded: 0.1, arrive: 0.12, arriveIf: 0.55, food: true },
      { id: 'orchids', kind: 'plant', init: 1 },
      { id: 'brazil', kind: 'plant', init: 6 },
      { id: 'young', kind: 'plant', init: 0 },
      { id: 'flowers', kind: 'stock', init: 60 },
      { id: 'pods', kind: 'stock', init: 8 },
      { id: 'buried', kind: 'stock', init: 0 },
      { id: 'corridor', kind: 'stock', init: 0 },      // a strip of forest that joins this patch to the big forest
      { id: 'corn', kind: 'stock', init: 0 },          // corn put out for the agoutis
      { id: 'cornbury', kind: 'stock', init: 0 },      // corn the agoutis buried (nothing grows a Brazil nut tree from it)
    ],
    flows: [
      { type: 'produce', from: 'brazil', to: 'flowers', rate: 4, byCap: 300 },
      { type: 'consume', eater: 'bees', food: 'flowers', need: 0.3, half: 40 },
      // a lidded flower becomes a fruit only when a big bee lifts the lid and carries pollen
      { type: 'produce', from: 'brazil', to: 'pods', rate: 2.5, help: { id: 'bees', half: 12 }, byCap: 600 },
      // the agouti opens fruits and buries some seeds it never comes back for
      { type: 'consume', eater: 'agouti', food: 'pods', need: 0.25, half: 60, cache: { to: 'buried', share: 1.5 } },
      // fed agoutis stay, and bury corn instead of Brazil nuts
      { type: 'consume', eater: 'agouti', food: 'corn', need: 0.25, half: 30, cache: { to: 'cornbury', share: 1 } },
      { type: 'decay', of: 'corn', rate: 0.004 },
      { type: 'decay', of: 'cornbury', rate: 0.01 },
      // honeybees take a little nectar from the open flowers of the forest, but cannot open the lidded ones
      { type: 'consume', eater: 'honeybees', food: 'flowers', need: 0.05, half: 400 },
      // the bees carry orchid pollen too: with bees around, new orchids take hold on the branches
      { type: 'produce', from: 'orchids', to: 'orchids', rate: 0.004, help: { id: 'bees', half: 6 }, byCap: 16 },
      { type: 'germinate', from: 'buried', to: 'young', rate: 0.01, yield: 0.06 },
      { type: 'mature', from: 'young', to: 'brazil', rate: 1 / 500, cap: 12 },
      { type: 'decay', of: 'young', rate: 0.003 },
      { type: 'decay', of: 'pods', rate: 0.03 },   // fruits rot, or other animals carry them off
      { type: 'decay', of: 'buried', rate: 0.004 },
      { type: 'decay', of: 'flowers', rate: 0.05 },
      { type: 'decay', of: 'orchids', rate: 0.0004 },
      { type: 'decay', of: 'brazil', rate: 0.0003 },
    ],
  },
  lights: [
    { light: 'life', id: 'bees', min: 6 },
    { light: 'life', id: 'agouti', min: 4 },
    { light: 'life', id: 'brazil', min: 5 },
    { light: 'regen', id: 'young', min: 2 },
    { light: 'env', id: 'pods', min: 60 },
  ],
  lightNames: { life: 'חיים', regen: 'עצים צעירים', env: 'פירות על הקרקע' },
  board: [
    { id: 'bees', name: 'דבורות סחלבים', species: 'orchidbee', tool: 'forestcam' },
    { id: 'agouti', name: 'אגוטים', species: 'agouti', tool: 'forestcam' },
    { id: 'brazil', name: 'עצי אגוז ברזיל', species: 'brazilnut', tool: 'drone' },
    { id: 'orchids', name: 'סחלבים על העצים', species: 'orchid', tool: 'drone' },
    { id: 'pods', name: 'פירות על הקרקע', icon: 'seed', tool: 'quadrat' },
    { id: 'young', name: 'עצים צעירים', icon: 'sprout', tool: 'quadrat' },
  ],
  visual: [
    { id: 'bees', species: 'orchidbee', scale: 'sqrt', max: 8 },
    { id: 'agouti', species: 'agouti', max: 8 },
    { id: 'brazil', species: 'brazilnut', plant: 'adult', max: 10 },
    { id: 'young', species: 'brazilnut', plant: 'young', max: 8 },
    { id: 'orchids', species: 'orchid', plant: 'adult', max: 12 },
  ],
  tools: [
    { id: 'forestcam', kind: 'daycam', near: 'brazilnut', name: 'מצלמת שטח', icon: 'camera', tell: 'המצלמה סופרת מי מבקר בפרחים ומי אוסף פירות מתחת לעץ.' },
    { id: 'drone', name: 'רחפן ספירה', icon: 'drone', tell: 'הרחפן סופר עצים וסחלבים על הענפים.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים פירות ועצים צעירים על הקרקע.' },
  ],
  ideas: [
    { id: 'orchids', title: 'לשתול סחלבים על העצים', icon: 'species:orchid', amounts: [4], cost: 6, max: 4, effect: { add: { orchids: 1 } } },
    { id: 'bees', title: 'להביא דבורות סחלבים', icon: 'species:orchidbee', amounts: [5], cost: 5, effect: { add: { bees: 1 } } },
    { id: 'agouti', title: 'להביא אגוטים', icon: 'species:agouti', amounts: [3], cost: 6, effect: { add: { agouti: 1 } } },
    { id: 'seedlings', title: 'לשתול שתילי אגוז ברזיל', icon: 'species:brazilnut', amounts: [3], cost: 9, effect: { add: { young: 1 } } },
    { id: 'seed-drone', title: 'רחפן זריעה', icon: 'seeddrone', amounts: [1], cost: 8, effect: { add: { buried: 60 } }, tech: true },
    { id: 'corridor', title: 'לחבר את חלקת היער ליער הגדול', icon: 'corridor', amounts: [1], cost: 22, max: 1, effect: { add: { corridor: 1 } } },
    { id: 'honeybees', title: 'להביא כוורת של דבורי דבש', icon: 'hive', amounts: [20], cost: 4, max: 2, effect: { add: { honeybees: 1 } } },
    { id: 'corn', title: 'לפזר תירס לאגוטים', icon: 'corn', amounts: [1], cost: 3, max: 3, effect: { add: { corn: 250, agouti: 3 } } },
  ],
  after: {
    orchids: 'הסחלבים נאחזו בענפים. מי יגיע אליהם?',
    bees: { test: 'orchids', below: 2, no: 'הדבורות לא מצאו סחלבים, ועזבו.', ok: 'הדבורות מצאו סחלבים ונשארו.' },
    agouti: { test: 'pods', below: 40, no: 'האגוטים לא מצאו מספיק פירות, ועזבו.', ok: 'האגוטים מצאו פירות ונשארו.' },
    seedlings: 'השתילים גדלים, אבל העצים הגדולים עדיין כמעט לא נותנים פרי.',
    'seed-drone': 'כמה עצים קטנים נבטו, אבל הפירות עדיין חסרים.',
    corridor: { test: 'bees', below: 6, no: 'רצועת היער מחברת אותנו ליער הגדול. דבורות הסחלבים מעופפות רחוק, אבל עוד לא הגיעו.', ok: 'דבורות סחלבים מהיער הגדול עפות לאורך הרצועה ומבקרות בפרחים שלנו!' },
    honeybees: 'דבורי הדבש זמזמו מסביב לפרחים של אגוז הברזיל, ניסו להיכנס... ולא הצליחו להרים את המכסה. הן קטנות מדי.',
    corn: { test: 'young', below: 1, no: 'האגוטים שבעים ושמחים, ונשארו. הם טומנים בשקדנות... תירס. מתירס לא יצמח עץ אגוז ברזיל.', ok: 'האגוטים נשארו, ויש גם פירות לטמון.' },
  },
  // surprises: a line in the notebook (and the experiment log) when the numbers turn, after an idea was tried
  surprises: [
    { id: 'corn-full', idea: 'corn', test: 'cornbury', above: 40, text: 'הפתעה: האגוטים טמנו כל כך הרבה תירס, שאפשר לגדל שדה. אבל אף עץ אגוז ברזיל לא נבט.' },
    { id: 'honey-gone', idea: 'honeybees', test: 'honeybees', below: 4, text: 'דבורי הדבש עזבו לחפש פרחים פתוחים. הפרחים של אגוז הברזיל נשארו סגורים.' },
    { id: 'corridor-orchids', idea: 'corridor', test: 'orchids', above: 2.5, text: 'הפתעה טובה: הדבורות שהגיעו מהיער הגדול האביקו גם סחלבים, ועכשיו יש יותר סחלבים על הענפים.' },
    { id: 'pods-up', test: 'pods', above: 120, text: 'הרבה פירות נופלים עכשיו מהעצים. מי יפתח אותם?' },
  ],
  mainFix: ['orchids'],
  hints: [
    'מי מבקר בפרחים של אגוז ברזיל? הציבו מצלמת שטח.',
    'לפרח של אגוז ברזיל יש מכסה. רק דבורה גדולה וחזקה מצליחה להרים אותו.',
    'דבורות הסחלבים צריכות סחלבים. כמה סחלבים נשארו על העצים?',
    'גם כשיש פירות, מי פותח אותם וטומן את הזרעים באדמה?',
  ],
  guesses: [
    { id: 'orchids', text: 'אין סחלבים, ולכן אין דבורות שמאביקות את הפרחים', icon: 'species:orchid', right: true },
    { id: 'agouti', text: 'האגוטים עזבו, ולכן אין עצים צעירים', icon: 'species:agouti' },
    { id: 'rain', text: 'אין מספיק גשם', icon: 'rain' },
    { id: 'old', text: 'העצים זקנים מדי', icon: 'species:brazilnut' },
  ],
  solved: 'הסחלבים החזירו את הדבורות, הדבורות האביקו את הפרחים, והאגוטים חזרו לאסוף פירות ולטמון זרעים. כך גדלים עצי אגוז ברזיל חדשים.',
  learned: 'לפעמים הסיבה רחוקה: עץ ענק צריך פרח קטן שגדל על ענף אחר.',
  realStory: 'עצי אגוז ברזיל ששתלו בשורות, רחוק מהיער, כמעט לא נתנו פירות. התברר שהם צריכים את הדבורות הגדולות של היער, והדבורות צריכות סחלבים. לכן עד היום כמעט את כל אגוזי הברזיל אוספים מעצי בר בתוך היער.',
  source: 'chesed',
  stars: { thrift: 18 },   // orchids, maybe bees too; agoutis or seedlings first are the waste
  budget: 60,
  tests: {
    within: 600,
    traps: {
      'agoutis first': [{ t: 30, idea: 'agouti' }, { t: 40, idea: 'agouti' }],
      'bees with no orchids': [{ t: 30, idea: 'bees' }, { t: 40, idea: 'bees' }],
      'planting seedlings': [{ t: 30, idea: 'seedlings' }, { t: 40, idea: 'seedlings' }],
      'sowing nuts from a drone': [{ t: 30, idea: 'seed-drone' }],
      'agoutis and seedlings': [{ t: 30, idea: 'agouti' }, { t: 40, idea: 'seedlings' }, { t: 50, idea: 'agouti' }],
      'honeybees': [{ t: 30, idea: 'honeybees' }, { t: 40, idea: 'honeybees' }],
      'corn for the agoutis': [{ t: 30, idea: 'corn' }, { t: 60, idea: 'corn' }, { t: 90, idea: 'corn' }],
      'honeybees and corn': [{ t: 30, idea: 'honeybees' }, { t: 35, idea: 'corn' }, { t: 120, idea: 'corn' }],
    },
    fixes: {
      'orchids': [{ t: 30, idea: 'orchids' }],
      'orchids and bees': [{ t: 30, idea: 'orchids' }, { t: 35, idea: 'bees' }],
      'agoutis first, then orchids': [{ t: 30, idea: 'agouti' }, { t: 120, idea: 'orchids' }],
      'a corridor to the big forest': [{ t: 30, idea: 'corridor' }],
      'corn first, then the corridor': [{ t: 30, idea: 'corn' }, { t: 90, idea: 'corridor' }],
    },
  },
  scene: {
    dayFrac: 0.34,   // morning: bees and agoutis are out by day
    decor: [['kapok', 1, 2], ['fig', 1, 1], ['acai', 1, 3], ['heliconia', 1, 4], ['fern', 1, 5], ['bromeliad', 1, 3]],
  },
};
