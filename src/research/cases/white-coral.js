// תעלומה (מתקדמים, השונית): האלמוג הלבן.
// In late summer the corals of the bay turn white, and fewer of them colour up again each year. The water is warm, and
// nobody can cool the sea. But the corals of Eilat stand warm water better than most corals in the world, as long as
// the water around them is clean. Here it is not: (1) after the wadi bank was bared, every flood washes mud into the
// bay, the mud clouds the water and settles on the corals; (2) the fish-farm cages in the bay feed the water, and the
// algae grow fast and cover the weak corals; (3) the warm water itself, which cannot be changed. Each cause makes the
// others worse: a coral that is fighting mud and algae turns white faster in the heat, a white coral that dies is soon
// covered by algae, and young corals cannot settle under mud and algae. Fixing one cause is not enough; the whole web
// must be mended and then held for a long while (the clock restarts at this level).
// Traps: the algae-scraping robot (the algae come back while the cages stay), planting corals from the nursery while
// mud and algae still cover them, bringing grazing fish (no room for more), fixing only the mud or only the cages.
// Dilemma: a sediment pond in the wadi (stops the mud at once, costly) or replanting the wadi bank (cheap, slow: the
// plants must grow before they hold the soil).
// Facts (docs/sources.md): the corals of the northern Gulf of Aqaba are unusually tolerant of warm water (Fine,
// Gildor & Genin 2013); extra nutrients make corals bleach at lower temperatures (Wooldridge 2009); the fish farms in
// the northern Gulf of Eilat were removed in 2008 after the reef suffered (Loya 2004 and the government decision);
// sediment from floods smothers corals and cuts their light (Rogers 1990).
// Advanced level: plain Hebrew, three causes in a loop, several traps, the clock restarts.

export const WHITE_CORAL = {
  id: 'white-coral',
  zone: 'reef',
  level: 'advanced',
  order: 1,
  title: 'האלמוג הלבן',
  plainTitle: 'האלמוג הלבן',
  call: 'בסוף הקיץ האלמוגים במפרץ מלבינים, ובכל שנה פחות מהם חוזרים לצבע שלהם.',
  callMore: 'אי אפשר לקרר את הים. אבל האלמוגים של אילת עמדו בחום כבר הרבה שנים. מה השתנה כאן?',
  holdSeconds: 240,
  model: {
    vars: [
      { id: 'corals', kind: 'plant', init: 9 },
      { id: 'white', kind: 'plant', init: 5 },
      { id: 'young', kind: 'plant', init: 0.4 },
      { id: 'grazers', kind: 'animal', init: 26, need: 0.3, birth: 0.012, death: 0.004, hungry: 0.3, leaveHungry: 0.05,
        cap: { of: 'corals', per: 2.2, plus: 8 }, leaveCrowded: 0.12, arrive: 0.2, arriveIf: 0.3, food: true },
      { id: 'algae', kind: 'stock', init: 450 },
      { id: 'mud', kind: 'stock', init: 60 },
      { id: 'bare', kind: 'stock', init: 1 },          // the bared wadi bank: every flood takes soil from it
      { id: 'saplings', kind: 'plant', init: 0 },
      { id: 'bank', kind: 'plant', init: 0 },          // plants on the wadi bank: they hold the soil and catch the mud
      { id: 'nutr', kind: 'stock', init: 70 },         // what the fish-farm cages add to the water
      { id: 'cages', kind: 'stock', init: 1 },
      { id: 'heat', kind: 'stock', init: 1 },          // the warm summer sea: nothing in the mystery changes it
    ],
    flows: [
      // mud: the bare bank sends it with every flood, the bank plants catch it, it settles and is carried away slowly
      { type: 'produce', from: 'bare', to: 'mud', rate: 3.2, byCap: 160 },
      { type: 'consume', eater: 'bank', food: 'mud', need: 1.2, half: 10 },
      { type: 'decay', of: 'mud', rate: 0.03 },
      { type: 'mature', from: 'saplings', to: 'bank', rate: 1 / 90, cap: 8 },
      { type: 'decay', of: 'saplings', rate: 0.001 },
      // the cages feed the water; the water clears slowly once they are gone
      { type: 'produce', from: 'cages', to: 'nutr', rate: 2.2, byCap: 150 },
      { type: 'decay', of: 'nutr', rate: 0.025 },
      // algae: grow on their own, much faster in fed water; grazing fish eat them
      { type: 'produce', from: 'algae', to: 'algae', rate: 0.022, byCap: 1600, help: { id: 'nutr', half: 40 } },
      { type: 'produce', from: 'algae', to: 'algae', rate: 0.008, byCap: 1600 },
      { type: 'produce', from: 'heat', to: 'algae', rate: 3, byCap: 1600 },
      { type: 'consume', eater: 'grazers', food: 'algae', need: 0.3, half: 30, cost: 0.6 },
      { type: 'decay', of: 'algae', rate: 0.004 },
      // bleaching: the heat turns corals white; mud and algae make it much faster (cache moves the coral to 'white')
      { type: 'consume', eater: 'heat', food: 'corals', need: 0.0035, half: 4, cache: { to: 'white', share: 1 } },
      { type: 'consume', eater: 'mud', food: 'corals', need: 0.0003, half: 4, cache: { to: 'white', share: 1 } },
      { type: 'consume', eater: 'algae', food: 'corals', need: 0.00003, half: 4, cache: { to: 'white', share: 1 } },
      // a white coral colours up again when the water is clean, or dies (and the algae take its place)
      { type: 'mature', from: 'white', to: 'corals', rate: 1 / 150, cap: 24 },
      { type: 'consume', eater: 'mud', food: 'white', need: 0.0001, half: 2 },
      { type: 'consume', eater: 'algae', food: 'white', need: 0.00001, half: 2 },
      { type: 'decay', of: 'white', rate: 0.002 },
      // young corals: settle from the adults, smothered by mud and algae, grow up in time
      { type: 'produce', from: 'corals', to: 'young', rate: 0.05, byCap: 12 },
      { type: 'consume', eater: 'mud', food: 'young', need: 0.003, half: 1 },
      { type: 'consume', eater: 'algae', food: 'young', need: 0.0004, half: 1 },
      { type: 'mature', from: 'young', to: 'corals', rate: 1 / 100, cap: 24 },
      { type: 'decay', of: 'young', rate: 0.002 },
      { type: 'decay', of: 'corals', rate: 0.0003 },
    ],
  },
  lights: [
    { light: 'life', id: 'corals', min: 12 },
    { light: 'life', id: 'grazers', min: 30 },
    { light: 'regen', id: 'young', min: 2 },
    { light: 'env', id: 'white', max: 1.8 },
    { light: 'env', id: 'mud', max: 25 },
    { light: 'env', id: 'algae', max: 250 },
  ],
  lightNames: { life: 'אלמוגים ודגים', regen: 'אלמוגים צעירים', env: 'מים נקיים, מעט אצות ומעט אלמוגים לבנים' },
  board: [
    { id: 'corals', name: 'אלמוגים בצבע', species: 'branching', tool: 'rov' },
    { id: 'white', name: 'אלמוגים לבנים', icon: 'bleach', tool: 'rov' },
    { id: 'young', name: 'אלמוגים צעירים', icon: 'sprout', tool: 'quadrat' },
    { id: 'grazers', name: 'דגים שאוכלים אצות', species: 'surgeonfish', tool: 'reefcam' },
    { id: 'algae', name: 'אצות על הסלע', species: 'algae', tool: 'quadrat', scale: 0.1 },
    { id: 'mud', name: 'בוץ במים', icon: 'mud', tool: 'sensor' },
    { id: 'nutr', name: 'מזון לאצות במים', icon: 'drop', tool: 'sensor' },
    { id: 'bank', name: 'צמחים על גדת הוואדי', icon: 'sprout', tool: 'sensor' },
  ],
  visual: [
    { id: 'corals', species: 'branching', plant: 'adult', max: 14 },
    { id: 'white', species: 'branching', plant: 'white', max: 10 },
    { id: 'young', species: 'branching', plant: 'young', max: 8 },
    { id: 'grazers', species: 'surgeonfish', scale: 'sqrt', max: 8 },
    { id: 'algae', species: 'algae', plant: 'adult', per: 80, max: 14 },
  ],
  tools: [
    { id: 'reefcam', kind: 'daycam', near: 'branching', name: 'מצלמה תת־ימית', icon: 'uwcam', tell: 'המצלמה סופרת את הדגים שאוכלים אצות.' },
    { id: 'rov', kind: 'drone', name: 'רובוט צולל', icon: 'rov', tell: 'הרובוט שוחה לאורך השונית וסופר אלמוגים בצבע ואלמוגים לבנים.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים אצות ואלמוגים צעירים.' },
    { id: 'sensor', kind: 'probe', place: 'sensor', name: 'מצוף חיישנים', icon: 'sensor', tell: 'המצוף מודד את המים: כמה בוץ יש בהם וכמה מזון לאצות. הוא גם מצלם את הוואדי שמעל המפרץ.' },
  ],
  ideas: [
    { id: 'pond', title: 'בריכת שיקוע בוואדי', icon: 'mud', amounts: [1], cost: 30, max: 1, effect: { add: { bare: -0.85 } } },
    { id: 'replant', title: 'לשתול צמחים על גדת הוואדי', icon: 'sprout', amounts: [4], cost: 3, perUnit: true, max: 2, effect: { add: { saplings: 1 } } },
    { id: 'cages', title: 'להעביר את כלובי הדגים לים הפתוח', icon: 'cage', amounts: [1], cost: 18, max: 1, effect: { add: { cages: -1 } } },
    { id: 'robot', title: 'רובוט שמגרד אצות', icon: 'rov', amounts: [1], cost: 8, max: 3, effect: { add: { algae: -350 } }, tech: true },
    { id: 'nursery', title: 'לשתול אלמוגים מהמשתלה', icon: 'nursery', amounts: [3], cost: 9, max: 2, effect: { add: { young: 1 } }, place: 'nursery' },
    { id: 'fish', title: 'להביא מנתחנים', icon: 'species:surgeonfish', amounts: [10], cost: 5, effect: { add: { grazers: 1 } } },
  ],
  after: {
    pond: 'הבריכה עוצרת את הבוץ של השיטפון לפני שהוא מגיע לים.',
    replant: { test: 'bank', below: 2, no: 'השתילים נקלטו, אבל הם עוד קטנים. בינתיים הבוץ עדיין זורם לים.', ok: 'הצמחים על הגדה גדלו ותופסים את הבוץ.' },
    cages: 'הכלובים עברו לים הפתוח. המים במפרץ יתנקו לאט.',
    robot: { test: 'nutr', below: 30, no: 'הרובוט גירד את האצות, אבל המים עדיין מלאים מזון לאצות, והן צומחות שוב.', ok: 'הרובוט גירד את האצות, והן כבר לא צומחות כל כך מהר.' },
    nursery: { test: 'mud', below: 25, no: 'האלמוגים הצעירים נשתלו, אבל הבוץ והאצות מכסים אותם.', ok: 'האלמוגים הצעירים נשתלו במים נקיים.' },
    fish: 'הגיעו עוד דגים. כשאין מספיק שונית, חלק מהם עוזבים.',
  },
  hints: [
    'לא כל האלמוגים מלבינים באותה מהירות. בדקו את המים במצוף החיישנים.',
    'מאיפה מגיע הבוץ? אחרי שיטפון הוואדי צבע המים משתנה.',
    'אצות צריכות מזון. מי מוסיף מזון למים של המפרץ?',
    'אלמוג לבן עוד חי. אם המים נקיים, הוא יכול לחזור לצבע שלו.',
    'ברמה הזו צריך לתקן הכול יחד, ואז לחכות בסבלנות.',
  ],
  guesses: [
    { id: 'all', text: 'החום מחליש את האלמוגים, והבוץ והאצות מוסיפים עוד', icon: 'bleach', right: true },
    { id: 'heat', text: 'רק החום, ואין מה לעשות', icon: 'sensor' },
    { id: 'algae', text: 'רק האצות', icon: 'species:algae' },
    { id: 'fish', text: 'אין מספיק דגים', icon: 'species:surgeonfish' },
  ],
  dilemma: {
    at: 70,
    title: 'הבוץ מהוואדי',
    text: 'בכל שיטפון הוואדי שוטף בוץ אל המפרץ. איך עוצרים אותו?',
    options: [
      { idea: 'pond', plus: 'הבוץ נעצר כבר בשיטפון הבא', minus: 'יקר, ונשאר פחות תקציב' },
      { idea: 'replant', plus: 'זול, והצמחים מחזיקים את האדמה לשנים', minus: 'לוקח זמן עד שהצמחים גדלים' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'הבוץ נעצר, המים במפרץ נקיים, האצות ירדו, והאלמוגים חזרו לצבע שלהם. גם בקיץ חם הם מחזיקים מעמד.',
  learned: 'את החום לא יכולנו לשנות. אבל כשהמים נקיים, האלמוגים חזקים מספיק לעמוד בו.',
  realStory: 'האלמוגים בצפון מפרץ אילת עומדים בחום טוב יותר מאלמוגים במקומות אחרים בעולם. בשנת 2008 הוציאו את כלובי דגי המאכל מהמפרץ, כדי לשמור על השונית.',
  source: 'chamato',
  stars: { thrift: 34 },   // the cages and replanting the bank (18 + 2×4×3 = 42 is over; one planting round 12 → 30)
  budget: 70,
  tests: {
    within: 1000,
    traps: {
      'the robot only': [{ t: 30, idea: 'robot' }, { t: 60, idea: 'robot' }, { t: 90, idea: 'robot' }],
      'only the cages': [{ t: 30, idea: 'cages' }],
      'only the mud (pond)': [{ t: 30, idea: 'pond' }],
      'only the mud (planting)': [{ t: 30, idea: 'replant' }, { t: 35, idea: 'replant' }],
      'nursery in muddy water': [{ t: 30, idea: 'nursery' }, { t: 40, idea: 'nursery' }],
      'more fish': [{ t: 30, idea: 'fish' }, { t: 40, idea: 'fish' }, { t: 50, idea: 'fish' }],
      'robot and nursery': [{ t: 30, idea: 'robot' }, { t: 40, idea: 'nursery' }, { t: 60, idea: 'robot' }],
    },
    fixes: {
      'cages and planting': [{ t: 30, idea: 'cages' }, { t: 40, idea: 'replant' }],
      'cages and the pond': [{ t: 30, idea: 'cages' }, { t: 40, idea: 'pond' }],
      'planting first, cages later': [{ t: 30, idea: 'replant' }, { t: 35, idea: 'replant' }, { t: 160, idea: 'cages' }],
      'cages, planting and a robot': [{ t: 30, idea: 'cages' }, { t: 35, idea: 'replant' }, { t: 45, idea: 'robot' }],
    },
  },
  scene: {
    dayFrac: 0.42,
    decor: [['brain', 1, 2], ['table', 1, 1], ['softcoral', 1, 2], ['seafan', 1, 2], ['seagrass', 1, 3], ['sponge', 1, 1]],
  },
};
