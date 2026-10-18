// תעלומה (מתחילים, יער הגשם): איפה הצפרדעים?
// Once there were many poison dart frogs here; now only a few grown frogs are left and not one tadpole. The dart frog
// carries each tadpole on its back up to a little pool of rain water inside a bromeliad. The old kapok fell, and almost
// all the bromeliads on its branches fell with it, so the frogs have nowhere to raise tadpoles. One cause.
// The fix the child can discover: bromeliads on the branches of the trees that are left; they fill with rain, the
// frogs nearby come and bring their tadpoles, and the tadpoles grow into frogs. Bringing frogs with no pools,
// bringing insects (the frogs have plenty to eat), or watering the ground (the water soaks in) look
// helpful and do not work. Little cups of water on the trees work for a moment and dry up: the dilemma (fast, or
// lasting).
// Facts (amazon.js + docs/sources.md): the dart frog brings its tadpoles to the water inside a bromeliad; the
// bromeliad's leaves hold rain water; dart frogs eat ants and small insects of the forest floor and are active by
// day; in a field study in the Amazon of Peru, a small poison frog put its tadpoles into little tubes of water that
// researchers set up, and chose pools with more water and with no other tadpoles in them.
// All beginner texts are fully vocalised (ניקוד מלא) for ages 6 to 8 (tools/validate-research.mjs checks it).

export const FROGS = {
  id: 'frogs',
  zone: 'amazon',
  level: 'kids',
  order: 4,
  title: 'אֵיפֹה הַצְּפַרְדְּעִים?',
  plainTitle: 'איפה הצפרדעים?',
  call: 'פַּעַם הָיוּ כָּאן הַרְבֵּה צְפַרְדְּעֵי חֵץ. עַכְשָׁו כִּמְעַט אֵין.',
  callMore: 'שׁוֹמְרֵי הַיַּעַר מוֹצְאִים רַק כַּמָּה צְפַרְדְּעִים גְּדוֹלוֹת, וְאַף לֹא רֹאשָׁן אֶחָד. מָה קָרָה כָּאן?',
  holdSeconds: 60,
  model: {
    vars: [
      // the frogs stay where there are pools for their tadpoles; new frogs come only from tadpoles, or from nearby
      // when there is room (pools) here
      { id: 'frogs', kind: 'animal', init: 4, need: 0.2, birth: 0, death: 0.003, hungry: 0.3, leaveHungry: 0.05,
        cap: { of: 'pools', per: 0.4, plus: 1 }, leaveCrowded: 0.04, arrive: 0.06, arriveIf: 0.3, food: true },
      { id: 'tadpoles', kind: 'stock', init: 0 },
      { id: 'brom', kind: 'plant', init: 0.25 },     // one small bromeliad is left
      { id: 'pools', kind: 'stock', init: 5 },       // rain water in the bromeliads, up on the trees
      { id: 'bugs', kind: 'stock', init: 220 },      // ants and small insects on the forest floor
      { id: 'floor', kind: 'stock', init: 1 },
      { id: 'puddle', kind: 'stock', init: 0 },      // water on the ground (it soaks in)
    ],
    flows: [
      { type: 'produce', from: 'floor', to: 'bugs', rate: 20, byCap: 300 },
      { type: 'consume', eater: 'frogs', food: 'bugs', need: 0.2, half: 40 },
      // every rain fills the bromeliads' leaves again
      { type: 'produce', from: 'brom', to: 'pools', rate: 0.6, byCap: 60 },
      { type: 'decay', of: 'pools', rate: 0.02 },
      // a frog carries a tadpole up to a pool; the more water, the more tadpoles
      { type: 'produce', from: 'frogs', to: 'tadpoles', rate: 0.05, help: { id: 'pools', half: 25 }, byCap: 14 },
      { type: 'mature', from: 'tadpoles', to: 'frogs', rate: 1 / 50, cap: 18 },
      { type: 'decay', of: 'tadpoles', rate: 0.01 },
      { type: 'decay', of: 'puddle', rate: 0.05 },
      { type: 'decay', of: 'brom', rate: 0.0006 },
    ],
  },
  lights: [
    { light: 'life', id: 'frogs', min: 6 },
    { light: 'regen', id: 'tadpoles', min: 3 },
    { light: 'env', id: 'pools', min: 20 },
  ],
  lightNames: { life: 'צְפַרְדְּעִים', regen: 'רֹאשָׁנִים', env: 'מַיִם עַל הָעֵצִים' },
  board: [
    { id: 'frogs', name: 'צְפַרְדְּעֵי חֵץ', species: 'dartfrog', tool: 'forestcam' },
    { id: 'bugs', name: 'חֲרָקִים קְטַנִּים', icon: 'bugs', tool: 'quadrat', scale: 0.1 },
    { id: 'brom', name: 'בְּרוֹמֶלְיוֹת', species: 'bromeliad', tool: 'drone' },
    { id: 'pools', name: 'בְּרֵכוֹת קְטַנּוֹת עַל הָעֵצִים', icon: 'pools', tool: 'polecam', scale: 0.25 },
    { id: 'tadpoles', name: 'רֹאשָׁנִים', icon: 'tadpole', tool: 'polecam' },
  ],
  visual: [
    { id: 'frogs', species: 'dartfrog', max: 8 },
    { id: 'brom', species: 'bromeliad', plant: 'adult', max: 10 },
  ],
  tools: [
    { id: 'forestcam', kind: 'daycam', near: 'heliconia', name: 'מַצְלֵמַת שָׂדֶה', icon: 'camera', tell: 'הַמַּצְלֵמָה סוֹפֶרֶת צְפַרְדְּעִים עַל קַרְקַע הַיַּעַר.' },
    { id: 'quadrat', name: 'רִבּוּעַ דְּגִימָה', icon: 'quadrat', tell: 'בָּרִבּוּעַ סוֹפְרִים נְמָלִים וַחֲרָקִים קְטַנִּים עַל הָאֲדָמָה.' },
    { id: 'drone', name: 'רַחְפַן סְפִירָה', icon: 'drone', tell: 'הָרַחְפָן טָס בֵּין הָעֵצִים וְסוֹפֵר בְּרוֹמֶלְיוֹת עַל הָעֲנָפִים.' },
    { id: 'polecam', kind: 'probe', name: 'מַצְלֵמָה עַל מוֹט', icon: 'polecam', tell: 'מַצְלֵמָה קְטַנָּה עַל מוֹט אָרֹךְ מְצִיצָה לְתוֹךְ הַבְּרוֹמֶלְיוֹת, וְסוֹפֶרֶת מַיִם וְרֹאשָׁנִים.' },
  ],
  ideas: [
    { id: 'brom', title: 'לִשְׁתֹּל בְּרוֹמֶלְיוֹת עַל הָעֲנָפִים', icon: 'species:bromeliad', amounts: [3], cost: 8, max: 3, effect: { add: { brom: 1 } } },
    { id: 'frogs', title: 'לְהָבִיא צְפַרְדְּעִים', icon: 'species:dartfrog', amounts: [5], cost: 5, effect: { add: { frogs: 1 } } },
    { id: 'cups', title: 'כּוֹסוֹת מַיִם עַל הָעֵצִים', icon: 'cups', amounts: [1], cost: 6, max: 2, effect: { add: { pools: 26 } } },
    { id: 'bugs', title: 'לְהָבִיא חֲרָקִים לַצְּפַרְדְּעִים', icon: 'bugs', amounts: [1], cost: 4, max: 3, effect: { add: { bugs: 300 } } },
    { id: 'water', title: 'לְהַשְׁקוֹת אֶת הָאֲדָמָה', icon: 'watering', amounts: [1], cost: 4, max: 3, effect: { add: { puddle: 60 } } },
  ],
  after: {
    brom: 'הַבְּרוֹמֶלְיוֹת נֶאֶחְזוּ בָּעֲנָפִים. בַּגֶּשֶׁם הֵן מִתְמַלְּאוֹת בְּמַיִם.',
    frogs: { test: 'pools', below: 15, no: 'הַצְּפַרְדְּעִים לֹא מָצְאוּ מַיִם לָרֹאשָׁנִים, וְעָזְבוּ.', ok: 'הַצְּפַרְדְּעִים מָצְאוּ בְּרֵכוֹת לָרֹאשָׁנִים, וְנִשְׁאֲרוּ.' },
    cups: { test: 'pools', below: 20, no: 'צְפַרְדֵּעַ הֵבִיאָה רֹאשָׁן לַכּוֹס! אֲבָל בְּכוֹס קְטַנָּה יֵשׁ מְעַט מַיִם, וְהֵם הִתְיַבְּשׁוּ מַהֵר.', ok: 'צְפַרְדֵּעַ הֵבִיאָה רֹאשָׁן לַכּוֹס!' },
    bugs: 'הַצְּפַרְדְּעִים אָכְלוּ וְשָׂבְעוּ. אֲבָל רֹאשָׁנִים חֲדָשִׁים לֹא הוֹפִיעוּ.',
    water: 'הַמַּיִם נִבְלְעוּ בָּאֲדָמָה. לְמַעְלָה, עַל הָעֵצִים, עֲדַיִן אֵין בְּרֵכוֹת.',
  },
  hints: [
    'צְפַרְדֵּעַ הַחֵץ יוֹצֵאת בַּיּוֹם. שִׂימוּ מַצְלֵמַת שָׂדֶה וְסִפְרוּ.',
    'אֵיפֹה גְּדֵלִים הָרֹאשָׁנִים? הַצְּפַרְדֵּעַ נוֹשֵׂאת אוֹתָם עַל הַגַּב, לְמַעְלָה, אֶל הָעֵץ.',
    'הַקַּפּוֹק הַזָּקֵן נָפַל, וְאִתּוֹ נָפְלוּ כִּמְעַט כָּל הַבְּרוֹמֶלְיוֹת. כַּמָּה בְּרֵכוֹת נִשְׁאֲרוּ לְמַעְלָה?',
  ],
  guesses: [
    { id: 'pools', text: 'אֵין לָרֹאשָׁנִים בְּרֵכוֹת מַיִם', icon: 'pools', right: true },
    { id: 'food', text: 'אֵין לַצְּפַרְדְּעִים מָה לֶאֱכֹל', icon: 'bugs' },
    { id: 'rain', text: 'אֵין מַסְפִּיק גֶּשֶׁם', icon: 'rain' },
  ],
  dilemma: {
    at: 40,
    title: 'אֵיךְ נוֹתְנִים לָרֹאשָׁנִים מַיִם?',
    text: 'יֵשׁ שְׁתֵּי דְּרָכִים. אַחַת מְהִירָה, וְאַחַת שֶׁנִּשְׁאֶרֶת.',
    options: [
      { idea: 'cups', plus: 'מַיִם עַל הָעֵץ כְּבָר עַכְשָׁו', minus: 'בְּכוֹס קְטַנָּה הַמַּיִם מִתְיַבְּשִׁים' },
      { idea: 'brom', plus: 'בַּיִת שֶׁמִּתְמַלֵּא בְּכָל גֶּשֶׁם', minus: 'צָרִיךְ לְחַכּוֹת קְצָת' },
    ],
    later: 'עוֹד לֹא. קֹדֶם נִמְדֹּד.',
  },
  solved: 'הַבְּרוֹמֶלְיוֹת אָסְפוּ מֵי גֶּשֶׁם, הַצְּפַרְדְּעִים הֵבִיאוּ אֲלֵיהֶן רֹאשָׁנִים, וְהָרֹאשָׁנִים גָּדְלוּ וְהָיוּ לִצְפַרְדְּעִים.',
  learned: 'גַּם בְּרֵכָה קְטַנָּה עַל עָנָף הִיא בַּיִת.',
  realStory: 'בְּיַעַר הַגֶּשֶׁם שֶׁל פֶּרוּ שָׂמוּ חוֹקְרִים צִנּוֹרוֹת קְטַנִּים עִם מַיִם. צְפַרְדְּעֵי חֵץ קְטַנּוֹת הֵבִיאוּ אֲלֵיהֶם רֹאשָׁנִים, וּבָחֲרוּ בְּמָקוֹם שֶׁיֵּשׁ בּוֹ הַרְבֵּה מַיִם וְאֵין בּוֹ רֹאשָׁנִים אֲחֵרִים.',
  source: 'lashevet',
  stars: { thrift: 16 },   // one or two plantings of bromeliads, nothing wasted
  budget: 50,
  tests: {
    within: 480,
    traps: {
      'frogs with no pools': [{ t: 30, idea: 'frogs' }, { t: 40, idea: 'frogs' }],
      'cups of water': [{ t: 30, idea: 'cups' }],
      'cups of water twice': [{ t: 30, idea: 'cups' }, { t: 60, idea: 'cups' }],
      'insects for the frogs': [{ t: 30, idea: 'bugs' }, { t: 40, idea: 'bugs' }],
      'watering the ground': [{ t: 30, idea: 'water' }, { t: 40, idea: 'water' }],
      'frogs and insects': [{ t: 30, idea: 'frogs' }, { t: 35, idea: 'bugs' }, { t: 45, idea: 'frogs' }],
    },
    fixes: {
      'bromeliads': [{ t: 30, idea: 'brom' }],
      'bromeliads and frogs': [{ t: 30, idea: 'brom' }, { t: 35, idea: 'frogs' }],
      'cups first, then bromeliads': [{ t: 30, idea: 'cups' }, { t: 100, idea: 'brom' }],
      'frogs first, then bromeliads': [{ t: 30, idea: 'frogs' }, { t: 120, idea: 'brom' }],
    },
  },
  scene: {
    dayFrac: 0.36,   // morning: the dart frogs are out by day
    decor: [['fig', 1, 2], ['brazilnut', 1, 2], ['acai', 1, 2], ['heliconia', 1, 4], ['fern', 1, 5], ['orchid', 1, 2]],
    stump: true,     // the old kapok that fell with the bromeliads
  },
};
