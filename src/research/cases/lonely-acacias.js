// תעלומה (בינוני, המדבר): השיטות שלא מתחדשות.
// The old acacias in the valley drop pods every year, but almost no young acacia grows. Two causes, linked: a new road
// with a fence along it cut the valley off, so the dorcas gazelles that lived here can no longer come and go (a small
// herd needs a big range), and few are left; and the gazelles are the ones that eat the pods. A seed that passes through
// a gazelle sprouts well far from its tree; a seed that stays on the ground under the tree is eaten by small seed beetles.
// The usual fix: a passage under the road, and the gazelles come back by themselves. Another way: a green bridge over
// the road. Traps: bringing gazelles into the small cut-off valley (they leave again), scattering more seeds (the
// beetles eat them), a water trough (dorcas gazelles hardly drink: they get their water from plants), planting nursery
// seedlings (they grow, but the gazelles are still missing).
// Facts (desert.js + docs/sources.md "המדבר"): dorcas gazelles eat acacia leaves and pods and spread the seeds; passing
// through a large herbivore scarifies acacia seeds and helps them sprout; seed beetles (bruchids) infest acacia seeds
// and lower germination (Three-way interactions between Acacia, large mammalian herbivores and bruchid beetles, a
// review); dorcas gazelles rarely drink; roads and fences cut gazelle herds apart (as in "הצבאים נעלמים").
// Middle level: plain Hebrew, two linked causes, traps, other ways, surprises, a dilemma.

export const LONELY_ACACIAS = {
  id: 'lonely-acacias',
  zone: 'desert',
  level: 'middle',
  order: 4,
  title: 'השיטות שלא מתחדשות',
  plainTitle: 'השיטות שלא מתחדשות',
  call: 'השיטות הזקנות בעמק מפילות תרמילים כל שנה, אבל כמעט אף שיטה צעירה לא גדלה.',
  callMore: 'פעם היו כאן הרבה שיטות צעירות. מה השתנה בעמק?',
  holdSeconds: 180,
  model: {
    vars: [
      { id: 'gazelles', kind: 'animal', init: 3, need: 0.3, birth: 0.02, death: 0.008, hungry: 0.3, leaveHungry: 0.05,
        cap: { of: 'range', per: 2, plus: 1 }, leaveCrowded: 0.15, arrive: 0.25, arriveIf: 0.3, arriveBy: 'passage', food: true },
      { id: 'range', kind: 'stock', init: 1 },     // how much land the herd can walk to (the valley alone, or more)
      { id: 'passage', kind: 'stock', init: 0 },   // a way across the road (0 closed, 1 open)
      { id: 'pods', kind: 'stock', init: 60 },     // acacia pods and seeds on the ground under the trees
      { id: 'sown', kind: 'stock', init: 0 },      // seeds that passed through a gazelle, far from their tree
      { id: 'acacia', kind: 'plant', init: 6 },
      { id: 'young', kind: 'plant', init: 0.5 },
      { id: 'trough', kind: 'stock', init: 0 },    // a water trough (nothing drinks much from it)
    ],
    flows: [
      { type: 'produce', from: 'acacia', to: 'pods', rate: 0.5, byCap: 200 },
      // the gazelles eat pods; part of the seeds pass through and land far away, ready to sprout
      { type: 'consume', eater: 'gazelles', food: 'pods', need: 0.3, half: 20, cache: { to: 'sown', share: 0.6 } },
      { type: 'germinate', from: 'sown', to: 'young', rate: 0.02 },
      // a seed left on the ground under its tree rarely sprouts: the seed beetles eat most of them
      { type: 'germinate', from: 'pods', to: 'young', rate: 0.0003 },
      { type: 'decay', of: 'pods', rate: 0.03 },
      { type: 'decay', of: 'sown', rate: 0.01 },
      { type: 'mature', from: 'young', to: 'acacia', rate: 1 / 180, cap: 14 },
      { type: 'decay', of: 'young', rate: 0.004 },
      { type: 'decay', of: 'acacia', rate: 0.002 },
    ],
  },
  lights: [
    { light: 'life', id: 'gazelles', min: 6 },
    { light: 'life', id: 'acacia', min: 5 },
    { light: 'regen', id: 'young', min: 4 },
    { light: 'env', id: 'range', min: 2.5 },
  ],
  lightNames: { life: 'חיים', regen: 'שיטות צעירות', env: 'דרך פתוחה' },
  board: [
    { id: 'gazelles', name: 'צבאים', species: 'dorcas', tool: 'cam' },
    { id: 'acacia', name: 'שיטות גדולות', species: 'acacia', tool: 'drone' },
    { id: 'young', name: 'שיטות צעירות', icon: 'sapling', tool: 'quadrat' },
    { id: 'pods', name: 'תרמילים וזרעים על הקרקע', icon: 'pods', tool: 'quadrat' },
    { id: 'range', name: 'שטח שהצבאים יכולים להגיע אליו', icon: 'road', tool: 'drone' },
  ],
  visual: [
    { id: 'gazelles', species: 'dorcas', scale: 'sqrt', max: 8 },
    { id: 'acacia', species: 'acacia', plant: 'adult', max: 12 },
    { id: 'young', species: 'acacia', plant: 'young', max: 10 },
  ],
  tools: [
    { id: 'cam', kind: 'daycam', near: 'acacia', name: 'מצלמת שטח', icon: 'camera', tell: 'המצלמה סופרת את הצבאים שבאים לאכול מתחת לשיטות.' },
    { id: 'drone', kind: 'drone', name: 'רחפן', icon: 'drone', tell: 'הרחפן סופר שיטות, ומראה עד לאן הצבאים יכולים להגיע.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים תרמילים, זרעים ושיטות קטנות.' },
  ],
  ideas: [
    { id: 'underpass', title: 'מעבר לצבאים מתחת לכביש', icon: 'underpass', amounts: [1], cost: 15, max: 1, effect: { add: { passage: 1, range: 2.5 } }, tech: true },
    { id: 'bridge', title: 'גשר ירוק מעל הכביש', icon: 'road', amounts: [1], cost: 28, max: 1, effect: { add: { passage: 1, range: 2.5 } }, tech: true },
    { id: 'gazelles', title: 'להביא צבאים לעמק', icon: 'species:dorcas', amounts: [4], cost: 5, effect: { add: { gazelles: 1 } } },
    { id: 'seeds', title: 'לפזר זרעי שיטה', icon: 'species:acacia', amounts: [1], cost: 4, effect: { add: { pods: 80 } } },
    { id: 'trough', title: 'שוקת מים לצבאים', icon: 'watering', amounts: [1], cost: 6, max: 1, effect: { add: { trough: 1 } } },
    { id: 'beetletrap', title: 'מלכודות לחיפושיות הזרעים', icon: 'bugs', amounts: [1], cost: 5, max: 2, effect: { add: { pods: 25 } } },
    { id: 'gap', title: 'לפתוח פרצה בגדר', icon: 'parkfence', amounts: [1], cost: 6, max: 1, effect: { add: { passage: 0.3, range: 0.6 } } },
    { id: 'saplings', title: 'לשתול שתילי שיטה מהמשתלה', icon: 'sapling', amounts: [4], cost: 9, effect: { add: { young: 1 } } },
  ],
  after: {
    underpass: 'המעבר מוכן. עכשיו מחכים לראות אם הצבאים ימצאו אותו.',
    bridge: 'הגשר מכוסה בחול ובשיחים, כמו המשך של המדבר. נחכה לצבאים.',
    gazelles: { test: 'range', below: 2, no: 'הצבאים הגיעו לעמק, אבל העמק קטן מדי לעדר, והדרך החוצה סגורה.', ok: 'הצבאים הגיעו, ויש להם לאן ללכת.' },
    seeds: 'הזרעים פוזרו מתחת לשיטות. נבדוק מה יקרה להם.',
    trough: 'השוקת מלאה. אבל הצבאים כמעט לא שותים ממנה.',
    beetletrap: 'המלכודות תפסו כמה חיפושיות. אבל הזרעים עדיין נשארים מתחת לעצים.',
    gap: 'נפתחה פרצה בגדר. מעט צבאים מעזים לחצות את הכביש, וזה מסוכן להם.',
    saplings: 'השתילים נשתלו וגדלים. אבל מי ישתול את השיטות של השנה הבאה?',
  },
  surprises: [
    { id: 'herd-left', idea: 'gazelles', test: 'gazelles', below: 3.5, text: 'רוב הצבאים שהבאנו עזבו. עדר צבאים צריך שטח גדול, והעמק סגור בכביש ובגדר.' },
    { id: 'beetles', idea: 'seeds', test: 'pods', below: 70, text: 'חיפושיות זעירות נכנסו לתוך הזרעים ואכלו אותם. רק מעט מאוד נבטו.' },
    { id: 'back', idea: 'underpass', test: 'gazelles', above: 5, text: 'צבאים חדשים עברו מתחת לכביש! הם אוכלים תרמילים, והזרעים יוצאים במקום אחר, רחוק מהעץ.' },
    { id: 'back2', idea: 'bridge', test: 'gazelles', above: 5, text: 'צבאים חוצים את הגשר הירוק. העדר גדל שוב.' },
    { id: 'sprouts', test: 'young', above: 3, text: 'שיטות קטנות מופיעות בכל העמק, גם רחוק מהעצים הגדולים. את הזרעים שלהן הביאו הצבאים.' },
  ],
  mainFix: ['underpass'],   // the usual route: a passage under the road
  hints: [
    'מי אוכל את התרמילים של השיטה? שימו מצלמת שטח מתחת לעצים.',
    'מה קורה לזרע שנשאר על הקרקע מתחת לעץ? בדקו בריבוע דגימה.',
    'כשסללו את הכביש החדש, הקימו לידו גדר ארוכה.',
    'זרע של שיטה שעבר דרך הבטן של צבי נובט טוב יותר.',
  ],
  guesses: [
    { id: 'road', text: 'הכביש סגר את הדרך, ומעט צבאים נשארו לפזר זרעים', icon: 'road', right: true },
    { id: 'water', text: 'לצבאים אין מים', icon: 'watering' },
    { id: 'seeds', text: 'השיטות לא מפילות מספיק זרעים', icon: 'species:acacia' },
    { id: 'old', text: 'השיטות זקנות מדי', icon: 'sapling' },
  ],
  dilemma: {
    at: 60,
    title: 'מעבר או גשר?',
    text: 'הצבאים לא יכולים לחצות את הכביש. אפשר לבנות להם דרך. איזו?',
    options: [
      { idea: 'underpass', plus: 'זול, ומוכן מהר', minus: 'צבאים צריכים זמן כדי להתרגל לעבור בו' },
      { idea: 'bridge', plus: 'רחב ומכוסה בשיחים, כמו המשך של המדבר', minus: 'יקר מאוד' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'הצבאים חוזרים לעמק ויוצאים ממנו, אוכלים תרמילים ומפזרים זרעים. שיטות צעירות גדלות בכל העמק.',
  learned: 'עץ במדבר צריך חבר שמסתובב: הצבי לוקח את הזרע רחוק, והשיטה נותנת לו אוכל וצל.',
  realStory: 'בערבה ובנגב שיטות רבות זקנות, וכמעט אין שיטות צעירות. חוקרים מצאו שזרע שעבר דרך בעל חיים גדול נובט טוב יותר, ושחיפושיות זעירות אוכלות הרבה מהזרעים שנשארים על הקרקע. בכמה מקומות בארץ בנו מעברים לבעלי חיים מתחת לכבישים ומעליהם.',
  source: 'shittim',
  stars: { thrift: 16 },
  budget: 70,
  tests: {
    within: 800,
    traps: {
      'bringing gazelles': [{ t: 30, idea: 'gazelles' }, { t: 40, idea: 'gazelles' }],
      'scattering seeds': [{ t: 30, idea: 'seeds' }, { t: 40, idea: 'seeds' }, { t: 50, idea: 'seeds' }],
      'a water trough': [{ t: 30, idea: 'trough' }],
      'nursery seedlings': [{ t: 30, idea: 'saplings' }, { t: 40, idea: 'saplings' }],
      'beetle traps': [{ t: 30, idea: 'beetletrap' }, { t: 40, idea: 'beetletrap' }],
      'a gap in the fence': [{ t: 30, idea: 'gap' }],
      'gazelles and a trough': [{ t: 30, idea: 'trough' }, { t: 35, idea: 'gazelles' }, { t: 45, idea: 'gazelles' }],
    },
    fixes: {
      'a passage under the road': [{ t: 30, idea: 'underpass' }],
      'a green bridge': [{ t: 30, idea: 'bridge' }],
      'seedlings, then a passage': [{ t: 30, idea: 'saplings' }, { t: 60, idea: 'underpass' }],
      'gazelles first, then a bridge': [{ t: 30, idea: 'gazelles' }, { t: 90, idea: 'bridge' }],
    },
  },
  scene: {
    dayFrac: 0.42,
    decor: [['retama', 1, 3], ['saltbush', 1, 2], ['zygophyllum', 1, 2], ['caper', 0, 1]],
  },
};
