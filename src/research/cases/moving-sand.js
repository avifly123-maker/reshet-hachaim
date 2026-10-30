// תעלומה (מתחילים, המדבר): החול שקובר את השתילים.
// The old acacias drop seeds and little acacias sprout, but every windy day the sand blows over them and buries them,
// so no young acacia grows up. The white broom bushes (retama) that used to hold the sand were cut for firewood, and
// now nothing stops the wind. The fix the child can discover: a sand fence, or white broom bushes planted again (they
// slow the wind, the sand drops beside them, and in their shade little plants grow). Planting more seedlings in the
// open, or watering them, look helpful and then fail: the sand buries them too.
// Facts (desert.js + docs/sources.md "המדבר"): sand fences slow the wind and make the sand drop; shrubs hold sand and
// under the white broom the ground is cooler and moister, so small plants grow there; in a sandstorm young plants in
// the open are buried.
// All beginner texts are fully vocalised (ניקוד מלא) for ages 6 to 8 (tools/validate-research.mjs checks it).

export const MOVING_SAND = {
  id: 'moving-sand',
  zone: 'desert',
  level: 'kids',
  order: 4,
  title: 'הַחוֹל שֶׁקּוֹבֵר אֶת הַשְּׁתִילִים',
  plainTitle: 'החול שקובר את השתילים',
  call: 'הַשִּׁטִּים הַזְּקֵנוֹת מַפִּילוֹת זְרָעִים, אֲבָל אַף שִׁטָּה צְעִירָה לֹא גְּדֵלָה.',
  callMore: 'שִׁטִּים קְטַנּוֹת נוֹבְטוֹת, וְאַחַר כָּךְ נֶעֱלָמוֹת. לְאָן הֵן הוֹלְכוֹת?',
  holdSeconds: 60,
  model: {
    vars: [
      { id: 'acacia', kind: 'plant', init: 5 },
      { id: 'young', kind: 'plant', init: 1 },
      { id: 'shrubs', kind: 'plant', init: 0.5 },
      { id: 'fences', kind: 'stock', init: 0 },
      { id: 'sand', kind: 'stock', init: 75 },
      { id: 'wind', kind: 'stock', init: 1 },   // the wind blows all the time; only what stops it changes
    ],
    flows: [
      // the wind brings sand, up to a deep cover
      { type: 'produce', from: 'wind', to: 'sand', rate: 3, byCap: 100 },
      // shrubs and fences slow the wind: the sand drops beside them and stays
      { type: 'consume', eater: 'shrubs', food: 'sand', need: 0.45, half: 20 },
      { type: 'consume', eater: 'fences', food: 'sand', need: 2.2, half: 20 },
      // the old acacias drop seeds, and little acacias sprout
      { type: 'produce', from: 'acacia', to: 'young', rate: 0.03, byCap: 16 },
      // blowing sand buries the little ones
      { type: 'consume', eater: 'sand', food: 'young', need: 0.003, half: 2 },
      { type: 'mature', from: 'young', to: 'acacia', rate: 1 / 150, cap: 12 },
      // white broom bushes spread slowly once they are there
      { type: 'produce', from: 'shrubs', to: 'shrubs', rate: 0.003, byCap: 10 },
      { type: 'decay', of: 'acacia', rate: 0.0015 },
      { type: 'decay', of: 'young', rate: 0.002 },
    ],
  },
  lights: [
    { light: 'life', id: 'acacia', min: 4 },
    { light: 'regen', id: 'young', min: 4 },
    { light: 'env', id: 'sand', max: 35 },
  ],
  lightNames: { life: 'שִׁטִּים', regen: 'שִׁטִּים צְעִירוֹת', env: 'מְעַט חוֹל עָף' },
  board: [
    { id: 'acacia', name: 'שִׁטִּים גְּדוֹלוֹת', species: 'acacia', tool: 'drone' },
    { id: 'young', name: 'שִׁטִּים צְעִירוֹת', icon: 'sapling', tool: 'quadrat' },
    { id: 'shrubs', name: 'שִׂיחֵי רֹתֶם', species: 'retama', tool: 'drone' },
    { id: 'sand', name: 'חוֹל שֶׁהָרוּחַ מְעִיפָה', icon: 'sandwind', tool: 'windmeter' },
  ],
  visual: [
    { id: 'acacia', species: 'acacia', plant: 'adult', max: 10 },
    { id: 'young', species: 'acacia', plant: 'young', max: 10 },
    { id: 'shrubs', species: 'retama', plant: 'adult', max: 10 },
  ],
  tools: [
    { id: 'drone', kind: 'drone', name: 'רַחְפָן', icon: 'drone', tell: 'הָרַחְפָן סוֹפֵר שִׁטִּים וְשִׂיחִים מִלְמַעְלָה.' },
    { id: 'quadrat', name: 'רִבּוּעַ דְּגִימָה', icon: 'quadrat', tell: 'בָּרִבּוּעַ סוֹפְרִים שִׁטִּים קְטַנּוֹת.' },
    { id: 'windmeter', kind: 'probe', name: 'מַד רוּחַ וָחוֹל', icon: 'weather', tell: 'הַמַּד בּוֹדֵק כַּמָּה חוֹל הָרוּחַ מְעִיפָה.' },
  ],
  ideas: [
    { id: 'fence', title: 'גֶּדֶר חוֹל', icon: 'sandfence', amounts: [1], cost: 8, max: 3, effect: { add: { fences: 1 } }, tech: true, place: 'sandfence' },
    { id: 'retama', title: 'לִשְׁתֹּל שִׂיחֵי רֹתֶם', icon: 'species:retama', amounts: [3], cost: 6, max: 3, effect: { add: { shrubs: 1 } } },
    { id: 'seedlings', title: 'לִשְׁתֹּל עוֹד שִׁטִּים קְטַנּוֹת', icon: 'sapling', amounts: [4], cost: 5, effect: { add: { young: 1 } } },
    { id: 'water', title: 'לְהַשְׁקוֹת אֶת הַשְּׁתִילִים', icon: 'watering', amounts: [1], cost: 4, effect: { add: { young: 0.5 } } },
  ],
  after: {
    fence: 'הַגָּדֵר עוֹמֶדֶת. נִרְאֶה מָה קוֹרֶה לַחוֹל.',
    retama: 'הָרְתָמִים נִשְׁתְּלוּ. הֵם יִגְדְּלוּ לְאַט.',
    seedlings: { test: 'sand', above: 40, no: 'הַשְּׁתִילִים הַחֲדָשִׁים נִקְבְּרוּ בַּחוֹל, כְּמוֹ הַקּוֹדְמִים.', ok: 'הַשְּׁתִילִים הַחֲדָשִׁים נִשְׁאֲרוּ, כִּי הַחוֹל נִרְגַּע.' },
    water: 'הַשְּׁתִילִים שָׁתוּ. אֲבָל הָרוּחַ עוֹד מְבִיאָה חוֹל...',
  },
  hints: [
    'לְאָן נֶעֶלְמוּ הַשִּׁטִּים הַקְּטַנּוֹת? בִּדְקוּ כַּמָּה חוֹל הָרוּחַ מְעִיפָה.',
    'פַּעַם הָיוּ כָּאן הַרְבֵּה שִׂיחֵי רֹתֶם. כַּמָּה נִשְׁאֲרוּ?',
    'מָה עוֹצֵר אֶת הָרוּחַ? שִׂיחַ גָּדוֹל אוֹ גָּדֵר.',
  ],
  guesses: [
    { id: 'sand', text: 'הַחוֹל קוֹבֵר אֶת הַשְּׁתִילִים', icon: 'sandwind', right: true },
    { id: 'thirst', text: 'לַשְּׁתִילִים אֵין מַיִם', icon: 'watering' },
    { id: 'seeds', text: 'הַשִּׁטִּים לֹא מַפִּילוֹת זְרָעִים', icon: 'species:acacia' },
  ],
  // the dilemma of the case: fast, or lasting
  dilemma: {
    at: 40,
    title: 'אֵיךְ עוֹצְרִים אֶת הַחוֹל?',
    text: 'יֵשׁ שְׁתֵּי דְּרָכִים. אַחַת מְהִירָה, וְאַחַת לוֹקַחַת זְמַן.',
    options: [
      { idea: 'fence', plus: 'עוֹצֶרֶת אֶת הַחוֹל מִיָּד', minus: 'הִיא עוֹלָה הַרְבֵּה' },
      { idea: 'retama', plus: 'הַשִּׂיחִים גְּדֵלִים וּמִתְרַבִּים', minus: 'צָרִיךְ לְחַכּוֹת' },
    ],
    later: 'עוֹד לֹא. קֹדֶם נִמְדֹּד.',
  },
  solved: 'הָרוּחַ נֶחְלְשָׁה, הַחוֹל נָפַל לְיַד הַשִּׂיחִים וְהַגָּדֵר, וְהַשִּׁטִּים הַקְּטַנּוֹת גָּדְלוּ.',
  learned: 'שִׂיחַ קָטָן שׁוֹמֵר עַל עֵץ גָּדוֹל.',
  realStory: 'בַּמִּדְבָּר מַעֲמִידִים גְּדֵרוֹת חוֹל, וְשׁוֹתְלִים שִׂיחִים שֶׁמַּחְזִיקִים אֶת הַחוֹל. בַּצֵּל שֶׁל הָרֹתֶם צוֹמְחִים צְמָחִים קְטַנִּים.',
  source: 'shita',
  stars: { thrift: 16 },
  budget: 60,
  tests: {
    within: 600,
    traps: {
      'more seedlings in the open': [{ t: 30, idea: 'seedlings' }, { t: 40, idea: 'seedlings' }],
      'watering the seedlings': [{ t: 30, idea: 'water' }, { t: 50, idea: 'water' }, { t: 70, idea: 'water' }],
    },
    fixes: {
      'two sand fences': [{ t: 30, idea: 'fence' }, { t: 35, idea: 'fence' }],
      'white broom bushes': [{ t: 30, idea: 'retama' }, { t: 35, idea: 'retama' }, { t: 40, idea: 'retama' }],
      'a fence and white broom': [{ t: 30, idea: 'fence' }, { t: 40, idea: 'retama' }],
    },
  },
  scene: {
    dayFrac: 0.45,
    decor: [['saltbush', 1, 2], ['zygophyllum', 1, 2], ['blooms', 0, 2], ['barrelcactus', 0, 1]],
  },
};
