// תעלומה 1 (מתחילים, החורש): יותר מדי קוצנים.
// The old carob in whose hollow the barn owls nested has fallen. With no owls, the spiny mice multiply and eat
// almost every seed the sage drops, so no young shrubs come up and the old ones slowly age away.
// The fix the child can discover: a nest box (a place to live) and then owls, which come in by themselves once there
// is room. Bringing owls with no place to nest, moving mice away, sowing more seeds or planting more sage all look
// helpful for a moment and then fail – each in its own way.
// Facts: barn owls eat mostly rodents and nest in hollows and in nest boxes; Israel's barn owl project (Sde Eliyahu,
// 1983 on) hangs nest boxes so owls hunt rodents instead of poison; the spiny mouse lives among rocks, comes out at
// night and eats seeds (grove.js + docs/sources.md).
// All beginner texts are fully vocalised (ניקוד מלא) for ages 6 to 8 (tools/validate-research.mjs checks it).

// grove seasons: one season per game day (game.js DAY_LEN); the model uses the game's season while playing and this
// clock in tests
export const SEASON_LEN = 270;
const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
export const seasonAt = (t, start = 0) => SEASONS[(Math.floor(t / SEASON_LEN) + start) % 4];

export const MICE_OWL = {
  id: 'mice-owl',
  zone: 'grove',
  level: 'kids',
  order: 1,
  title: 'יוֹתֵר מִדַּי קוֹצָנִים',
  plainTitle: 'יותר מדי קוצנים',
  call: 'הַקּוֹצָנִים אוֹכְלִים אֶת כָּל הַזְּרָעִים, וְאֵין שִׂיחִים חֲדָשִׁים.',
  callMore: 'שׁוֹמְרֵי הַחֹרֶשׁ רוֹאִים רַק שִׂיחֵי מַרְוָה זְקֵנִים. אֵין אַף שִׂיחַ צָעִיר. מָה קָרָה כָּאן?',
  holdSeconds: 60,
  // ── the model
  model: {
    vars: [
      { id: 'mice', kind: 'animal', init: 120, need: 0.25, birth: 0.012, death: 0.005, hungry: 0.35, leaveHungry: 0.05,
        cap: 260, arrive: 0.15, arriveIf: 0.45, food: true },
      { id: 'owl', kind: 'animal', init: 0, need: 0.15, birth: 0.008, death: 0.002, hungry: 0.5, leaveHungry: 0.06,
        cap: { of: 'nests', per: 4 }, leaveCrowded: 0.07, arrive: 0.035, arriveIf: 0.3, food: true, preyHalf: 15 },
      { id: 'nests', kind: 'stock', init: 0 },
      { id: 'sage', kind: 'plant', init: 9 },
      { id: 'young', kind: 'plant', init: 0 },
      { id: 'seeds', kind: 'stock', init: 60 },
    ],
    flows: [
      { type: 'produce', from: 'sage', to: 'seeds', rate: 3.2, byCap: 2500, season: { winter: 0.6, spring: 1.5, summer: 1.1, autumn: 0.7 } },
      { type: 'consume', eater: 'mice', food: 'seeds', need: 0.25, half: 140 },
      { type: 'prey', pred: 'owl', prey: 'mice', attack: 0.02, handling: 2.2, refuge: 12 },   // mice hide among the rocks: a few are never caught
      { type: 'germinate', from: 'seeds', to: 'young', rate: 0.0035, yield: 0.02, season: { winter: 1.6, spring: 1.1, summer: 0.55, autumn: 0.9 } },
      { type: 'mature', from: 'young', to: 'sage', rate: 1 / 110, cap: 26 },
      { type: 'decay', of: 'young', rate: 0.004 },
      { type: 'decay', of: 'sage', rate: 0.0009 },
      { type: 'decay', of: 'seeds', rate: 0.002 },
    ],
  },
  // what the balance meter checks (life / renewal / environment)
  lights: [
    { light: 'life', id: 'mice', min: 8, max: 75 },
    { light: 'life', id: 'owl', min: 0.9 },
    { light: 'life', id: 'sage', min: 6 },
    { light: 'regen', id: 'young', min: 2 },
    { light: 'env', id: 'seeds', min: 250 },
  ],
  lightNames: { life: 'חַיִּים', regen: 'צְמִיחָה חֲדָשָׁה', env: 'זְרָעִים בָּאֲדָמָה' },
  // how each number is called on the board, and which tool reveals it
  board: [
    { id: 'mice', name: 'קוֹצָנִים', species: 'spinymouse', tool: 'nightcam' },
    { id: 'owl', name: 'תִּנְשָׁמוֹת', species: 'owl', tool: 'nightcam' },
    { id: 'sage', name: 'שִׂיחֵי מַרְוָה', species: 'sage', tool: 'drone' },
    { id: 'nests', name: 'מְקוֹמוֹת קִנּוּן', icon: 'nestbox', tool: 'drone' },
    { id: 'young', name: 'שִׂיחִים צְעִירִים', icon: 'sprout', tool: 'quadrat' },
    { id: 'seeds', name: 'זְרָעִים בָּאֲדָמָה', icon: 'seed', tool: 'quadrat', scale: 0.1 },
  ],
  // how the island shows the numbers: how many figures stand for how many animals
  visual: [
    { id: 'mice', species: 'spinymouse', scale: 'sqrt', max: 16 },
    { id: 'owl', species: 'owl', max: 8 },
    { id: 'sage', species: 'sage', plant: 'adult', max: 26 },
    { id: 'young', species: 'sage', plant: 'young', max: 14 },
  ],
  // research tools on the table (they reveal numbers; once placed they keep measuring)
  tools: [
    { id: 'nightcam', name: 'מַצְלֵמַת לַיְלָה', icon: 'camera', tell: 'הַמַּצְלֵמָה סוֹפֶרֶת מִי יוֹצֵא בַּלַּיְלָה.' },
    { id: 'drone', name: 'רַחְפַן סְפִירָה', icon: 'drone', tell: 'הָרַחְפָן סוֹפֵר שִׂיחִים וּמְחַפֵּשׂ מְקוֹמוֹת לְקַנֵּן.' },
    { id: 'quadrat', name: 'רִבּוּעַ דְּגִימָה', icon: 'quadrat', tell: 'בָּרִבּוּעַ סוֹפְרִים זְרָעִים וְנִבְטִים בָּאֲדָמָה.' },
  ],
  // ideas on the table: things to DO, each with its own effect (the model does the rest)
  ideas: [
    { id: 'owl', title: 'לְהָבִיא תִּנְשָׁמוֹת', icon: 'species:owl', amounts: [1, 5], cost: 4, perUnit: true, effect: { add: { owl: 1 } } },
    { id: 'nestbox', title: 'לִתְלוֹת תֵּבַת קִנּוּן', icon: 'nestbox', amounts: [1], cost: 8, max: 4, effect: { add: { nests: 1 } }, tech: true },
    { id: 'move-mice', title: 'לְהַעֲבִיר קוֹצָנִים לְמָקוֹם אַחֵר', icon: 'species:spinymouse', amounts: [20], cost: 6, effect: { add: { mice: -1 } } },
    { id: 'plant-sage', title: 'לִשְׁתֹּל שִׂיחֵי מַרְוָה', icon: 'species:sage', amounts: [5], cost: 8, effect: { add: { sage: 1 } } },
    { id: 'seed-drone', title: 'רַחְפַן זְרִיעָה', icon: 'seeddrone', amounts: [1], cost: 8, effect: { add: { seeds: 600 } }, tech: true },
  ],
  // what happened after an idea: a short line the child reads once the result shows (said by the "notebook")
  after: {
    owl: { noNest: 'הַתִּנְשָׁמוֹת לֹא מָצְאוּ מָקוֹם לְקַנֵּן, וְעָזְבוּ.', ok: 'הַתִּנְשָׁמוֹת מָצְאוּ בַּיִת וְנִשְׁאֲרוּ.' },
    nestbox: 'תֵּבַת הַקִּנּוּן מְחַכָּה לְדַיָּרִים.',
    'move-mice': 'קוֹצָנִים חֲדָשִׁים הִגִּיעוּ מִבַּחוּץ.',
    'plant-sage': 'יֵשׁ יוֹתֵר שִׂיחִים, אֲבָל אֵין צְעִירִים חֲדָשִׁים.',
    'seed-drone': 'הַקּוֹצָנִים מָצְאוּ אֲרוּחָה גְּדוֹלָה.',
  },
  // renewable hint bulbs: each hint opens in order
  hints: [
    'מִי יוֹצֵא בַּלַּיְלָה? שִׂימוּ מַצְלֵמַת לַיְלָה.',
    'מִי צָד קוֹצָנִים בַּלַּיְלָה? מָה רָאֲתָה הַמַּצְלֵמָה?',
    'לַתִּנְשֶׁמֶת אֵין אֵיפֹה לְקַנֵּן. הַחֲרוּב הַזָּקֵן נָפַל.',
  ],
  // the child's guess in the notebook: one of three pictures
  guesses: [
    { id: 'hunter', text: 'אֵין מִי שֶׁצָּד אֶת הַקּוֹצָנִים', icon: 'species:owl', right: true },
    { id: 'rain', text: 'אֵין מַסְפִּיק גֶּשֶׁם', icon: 'rain' },
    { id: 'old', text: 'הַשִּׂיחִים זְקֵנִים מִדַּי', icon: 'species:sage' },
  ],
  solved: 'תִּנְשָׁמוֹת צָדוֹת קוֹצָנִים, וְכָךְ נִשְׁאֲרִים זְרָעִים לְשִׂיחִים חֲדָשִׁים.',
  learned: 'טוֹרֵף שׁוֹמֵר עַל אִזּוּן.',
  realStory: 'בְּיִשְׂרָאֵל תּוֹלִים אַלְפֵי תֵּבוֹת קִנּוּן לְתִנְשָׁמוֹת. הַתִּנְשָׁמוֹת צָדוֹת עַכְבְּרֵי שָׂדֶה, וְהַחַקְלָאִים מִשְׁתַּמְּשִׁים בְּפָחוֹת רַעַל.',
  source: 'tachlit',   // torah edition: the source card earned when the case is solved
  stars: { thrift: 20 },   // third star: solved spending at most this much (one or two nest boxes, no traps)
  budget: 60,
  // the solvability checks (tests/research/solvable.mjs): model seconds, ideas by id
  tests: {
    within: 480,
    traps: {
      'owls with no place to nest': [{ t: 30, idea: 'owl', n: 5 }],
      'moving mice away': [{ t: 30, idea: 'move-mice' }, { t: 40, idea: 'move-mice' }, { t: 50, idea: 'move-mice' }],
      'sowing seeds from a drone': [{ t: 30, idea: 'seed-drone' }],
      'planting more sage': [{ t: 30, idea: 'plant-sage' }, { t: 40, idea: 'plant-sage' }],
    },
    fixes: {
      'one nest box': [{ t: 30, idea: 'nestbox' }],
      'a nest box and an owl': [{ t: 30, idea: 'nestbox' }, { t: 35, idea: 'owl', n: 1 }],
      'owls first, then a nest box': [{ t: 30, idea: 'owl', n: 5 }, { t: 120, idea: 'nestbox' }],
    },
  },
  // the island: what stands there at the start (decor is not part of the model)
  scene: {
    season: 0,   // winter
    dayFrac: 0.6,   // late afternoon: the night (and the night camera) comes soon
    decor: [['oak', 0.95, 4], ['carob', 1, 2], ['mastic', 1, 4], ['rockrose', 1, 3], ['cyclamen', 1, 4]],
    stump: true,   // the fallen old carob
  },
};
