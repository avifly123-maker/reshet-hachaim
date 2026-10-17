// תעלומה 2 (מתחילים, החורש): הפרחים שלא נותנים זרעים.
// The rockrose blooms, but almost no seeds form and no young shrubs come up. The dry old trunk full of holes, where
// the wild bees lived, has crumbled away: with nowhere to live only a few bees stay, few flowers are pollinated, and so
// few seeds fall. The fix the child can discover: an insect hotel (a place to live), and then the bees come back by
// themselves. Bringing bees with no place to live, planting more rockrose or sowing seeds from a drone all look
// helpful for a moment and then fail.
// Facts: rockrose flowers are visited by bees for their pollen (grove.js); many wild bees nest in holes in dry wood and
// in hollow stems, and insect hotels give them such holes (tools.js insecthotel fact, docs/sources.md); flowers make
// seeds only when pollen is carried from flower to flower.
// All beginner texts are fully vocalised (ניקוד מלא) for ages 6 to 8 (tools/validate-research.mjs checks it).

export const FLOWERS_BEES = {
  id: 'flowers-bees',
  zone: 'grove',
  level: 'kids',
  order: 2,
  title: 'הַפְּרָחִים שֶׁלֹּא נוֹתְנִים זְרָעִים',
  plainTitle: 'הפרחים שלא נותנים זרעים',
  call: 'הַלּוֹטֶם פּוֹרֵחַ, אֲבָל כִּמְעַט אֵין זְרָעִים.',
  callMore: 'שׁוֹמְרֵי הַחֹרֶשׁ רוֹאִים הַרְבֵּה פְּרָחִים, אֲבָל אַף שִׂיחַ צָעִיר. מָה קָרָה כָּאן?',
  holdSeconds: 60,
  model: {
    vars: [
      { id: 'bees', kind: 'animal', init: 2, need: 0.3, birth: 0.02, death: 0.006, hungry: 0.35, leaveHungry: 0.05,
        cap: { of: 'nests', per: 12, plus: 1 }, leaveCrowded: 0.08, arrive: 0.3, arriveIf: 0.3, food: true },
      { id: 'nests', kind: 'stock', init: 0 },
      { id: 'rockrose', kind: 'plant', init: 10 },
      { id: 'young', kind: 'plant', init: 0 },
      { id: 'nectar', kind: 'stock', init: 40 },
      { id: 'seeds', kind: 'stock', init: 40 },
    ],
    flows: [
      { type: 'produce', from: 'rockrose', to: 'nectar', rate: 2, byCap: 400, season: { winter: 0.5, spring: 1.6, summer: 1, autumn: 0.6 } },
      { type: 'consume', eater: 'bees', food: 'nectar', need: 0.3, half: 50 },
      // a flower gives seeds only when bees carry pollen to it
      { type: 'produce', from: 'rockrose', to: 'seeds', rate: 2.2, help: { id: 'bees', half: 20 }, byCap: 3000, season: { winter: 0.4, spring: 1.5, summer: 1.1, autumn: 0.6 } },
      { type: 'germinate', from: 'seeds', to: 'young', rate: 0.0035, yield: 0.02, season: { winter: 1.6, spring: 1.1, summer: 0.55, autumn: 0.9 } },
      { type: 'mature', from: 'young', to: 'rockrose', rate: 1 / 110, cap: 26 },
      { type: 'decay', of: 'young', rate: 0.004 },
      { type: 'decay', of: 'rockrose', rate: 0.0011 },
      { type: 'decay', of: 'seeds', rate: 0.002 },
      { type: 'decay', of: 'nectar', rate: 0.05 },
    ],
  },
  lights: [
    { light: 'life', id: 'bees', min: 12 },
    { light: 'life', id: 'rockrose', min: 6 },
    { light: 'regen', id: 'young', min: 2 },
    { light: 'env', id: 'seeds', min: 250 },
  ],
  lightNames: { life: 'חַיִּים', regen: 'צְמִיחָה חֲדָשָׁה', env: 'זְרָעִים בָּאֲדָמָה' },
  board: [
    { id: 'bees', name: 'דְּבוֹרִים וּפַרְפָּרִים', species: 'honeybee', tool: 'flowercam' },
    { id: 'rockrose', name: 'שִׂיחֵי לוֹטֶם', species: 'rockrose', tool: 'drone' },
    { id: 'nests', name: 'מְקוֹמוֹת לָגוּר לִדְבוֹרִים', icon: 'insecthotel', tool: 'drone' },
    { id: 'young', name: 'שִׂיחִים צְעִירִים', icon: 'sprout', tool: 'quadrat' },
    { id: 'seeds', name: 'זְרָעִים בָּאֲדָמָה', icon: 'seed', tool: 'quadrat', scale: 0.1 },
  ],
  visual: [
    { id: 'bees', species: 'honeybee', scale: 'sqrt', max: 10 },
    { id: 'bees', species: 'butterfly', scale: 'sqrt', max: 4 },
    { id: 'rockrose', species: 'rockrose', plant: 'adult', max: 26 },
    { id: 'young', species: 'rockrose', plant: 'young', max: 14 },
  ],
  tools: [
    { id: 'flowercam', kind: 'daycam', near: 'rockrose', name: 'מַצְלֵמַת פְּרָחִים', icon: 'camera', tell: 'הַמַּצְלֵמָה סוֹפֶרֶת מִי בָּא לַפְּרָחִים.' },
    { id: 'drone', name: 'רַחְפַן סְפִירָה', icon: 'drone', tell: 'הָרַחְפָן סוֹפֵר שִׂיחִים וּמְקוֹמוֹת לָגוּר.' },
    { id: 'quadrat', name: 'רִבּוּעַ דְּגִימָה', icon: 'quadrat', tell: 'בָּרִבּוּעַ סוֹפְרִים זְרָעִים וְנִבְטִים בָּאֲדָמָה.' },
  ],
  ideas: [
    { id: 'bees', title: 'לְהָבִיא דְּבוֹרִים', icon: 'species:honeybee', amounts: [5], cost: 5, effect: { add: { bees: 1 } } },
    { id: 'hotel', title: 'לִבְנוֹת מָלוֹן חֲרָקִים', icon: 'insecthotel', amounts: [1], cost: 8, max: 3, effect: { add: { nests: 1 } }, tech: true, place: 'insecthotel' },
    { id: 'plant', title: 'לִשְׁתֹּל שִׂיחֵי לוֹטֶם', icon: 'species:rockrose', amounts: [5], cost: 8, effect: { add: { rockrose: 1 } } },
    { id: 'seed-drone', title: 'רַחְפַן זְרִיעָה', icon: 'seeddrone', amounts: [1], cost: 8, effect: { add: { seeds: 600 } }, tech: true },
  ],
  after: {
    bees: { noNest: 'הַדְּבוֹרִים לֹא מָצְאוּ מָקוֹם לָגוּר, וְעָזְבוּ.', ok: 'הַדְּבוֹרִים מָצְאוּ בַּיִת וְנִשְׁאֲרוּ.' },
    hotel: 'הַמָּלוֹן מְחַכֶּה לַדְּבוֹרִים.',
    plant: 'יֵשׁ יוֹתֵר פְּרָחִים, אֲבָל עֲדַיִן כִּמְעַט אֵין זְרָעִים.',
    'seed-drone': 'צָמְחוּ כַּמָּה שִׂיחִים קְטַנִּים, אֲבָל הַפְּרָחִים עֲדַיִן לֹא נוֹתְנִים זְרָעִים.',
  },
  hints: [
    'מִי בָּא לַפְּרָחִים? שִׂימוּ מַצְלֵמַת פְּרָחִים.',
    'בְּלִי דְּבוֹרִים, הַפֶּרַח לֹא נוֹתֵן זְרָעִים. לָמָּה יֵשׁ כָּל כָּךְ מְעַט דְּבוֹרִים?',
    'הַגֶּזַע הַיָּבֵשׁ עִם הַחוֹרִים הִתְפּוֹרֵר. שָׁם גָּרוּ הַדְּבוֹרִים.',
  ],
  guesses: [
    { id: 'home', text: 'לַדְּבוֹרִים אֵין אֵיפֹה לָגוּר', icon: 'insecthotel', right: true },
    { id: 'rain', text: 'אֵין מַסְפִּיק גֶּשֶׁם', icon: 'rain' },
    { id: 'few', text: 'יֵשׁ מְעַט מִדַּי שִׂיחִים', icon: 'species:rockrose' },
  ],
  solved: 'הַדְּבוֹרִים מַעֲבִירוֹת אֲבָקָה מִפֶּרַח לְפֶרַח, וְכָךְ הַפְּרָחִים נוֹתְנִים זְרָעִים.',
  learned: 'פֶּרַח צָרִיךְ דְּבוֹרָה, וּדְבוֹרָה צְרִיכָה בַּיִת.',
  realStory: 'הַרְבֵּה דְּבוֹרֵי בָּר גָּרוֹת בְּחוֹרִים בְּעֵצִים יְבֵשִׁים וּבְקָנִים חֲלוּלִים. בְּגִנּוֹת וּבְשָׂדוֹת בּוֹנִים לָהֶן מְלוֹנוֹת חֲרָקִים, וְהֵן מַאֲבִיקוֹת אֶת הַפְּרָחִים מִסָּבִיב.',
  source: 'rabu',
  stars: { thrift: 16 },   // one or two insect hotels, nothing wasted
  budget: 60,
  tests: {
    within: 480,
    traps: {
      'bees with no place to live': [{ t: 30, idea: 'bees' }, { t: 40, idea: 'bees' }],
      'planting more rockrose': [{ t: 30, idea: 'plant' }, { t: 40, idea: 'plant' }],
      'sowing seeds from a drone': [{ t: 30, idea: 'seed-drone' }],
    },
    fixes: {
      'one insect hotel': [{ t: 30, idea: 'hotel' }],
      'an insect hotel and bees': [{ t: 30, idea: 'hotel' }, { t: 35, idea: 'bees' }],
      'bees first, then an insect hotel': [{ t: 30, idea: 'bees' }, { t: 120, idea: 'hotel' }],
    },
  },
  scene: {
    season: 1,   // spring: the rockrose is in flower
    dayFrac: 0.32,   // morning: the bees are out
    decor: [['oak', 0.95, 4], ['carob', 1, 2], ['mastic', 1, 4], ['sage', 1, 3], ['anemone', 1, 5], ['cyclamen', 1, 3]],
    stump: true,   // the crumbled old trunk where the bees lived
  },
};
