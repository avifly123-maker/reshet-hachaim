// תעלומה (מתחילים, הסוואנה): השיחים שמשתלטים.
// The thorny bushes spread over the plain, the grass shrinks, and the zebras leave because there is little to eat. The
// elephants that used to pass here and push the bushes over no longer come. The fix the child can discover: bring the
// elephants back (lasting), or cut the bushes (fast and costly). Planting more grass, or bringing more zebras, look
// helpful and then fail: the bushes keep spreading over the grass, and the zebras have too little to eat.
// Facts (savanna.js + docs/sources.md "הסוואנה"): without elephants (and fire) bushes and trees spread and the grass is
// pushed back (bush encroachment); elephants break and uproot bushes and open space for grass; zebras eat grass.
// All beginner texts are fully vocalised (ניקוד מלא) for ages 6 to 8 (tools/validate-research.mjs checks it).

export const THORNY_PLAIN = {
  id: 'thorny-plain',
  zone: 'savanna',
  level: 'kids',
  order: 5,
  title: 'הַשִּׂיחִים שֶׁמִּשְׁתַּלְּטִים',
  plainTitle: 'השיחים שמשתלטים',
  call: 'שִׂיחִים קוֹצָנִיִּים מְכַסִּים אֶת הַמִּישׁוֹר, וְהַזֶּבְּרוֹת עוֹזְבוֹת.',
  callMore: 'פַּעַם הָיָה כָּאן הַרְבֵּה עֵשֶׂב. לְאָן הוּא נֶעֱלַם?',
  holdSeconds: 60,
  model: {
    vars: [
      { id: 'shrubs', kind: 'plant', init: 9 },
      { id: 'grass', kind: 'plant', init: 6 },
      { id: 'zebras', kind: 'animal', init: 3, need: 0.06, birth: 0.02, death: 0.006, hungry: 0.35, leaveHungry: 0.06, cap: 10, arrive: 0.15, arriveIf: 0.45, food: true },
      { id: 'elephants', kind: 'animal', init: 0, need: 0.3, birth: 0.002, death: 0.001, hungry: 0.15, leaveHungry: 0.01, cap: 3 },
    ],
    flows: [
      // the bushes spread over the plain, and where they stand the grass does not grow
      { type: 'produce', from: 'shrubs', to: 'shrubs', rate: 0.008, byCap: 16 },
      { type: 'produce', from: 'grass', to: 'grass', rate: 0.12, byCap: 24 },
      { type: 'consume', eater: 'shrubs', food: 'grass', need: 0.08, half: 6 },
      // the zebras eat the grass
      { type: 'consume', eater: 'zebras', food: 'grass', need: 0.06, half: 6 },
      // the elephants push the bushes over (and eat some grass)
      { type: 'consume', eater: 'elephants', food: 'shrubs', need: 0.25, half: 3 },
      { type: 'consume', eater: 'elephants', food: 'grass', need: 0.05, half: 6 },
      { type: 'decay', of: 'shrubs', rate: 0.001 },
    ],
  },
  lights: [
    { light: 'life', id: 'zebras', min: 5 },
    { light: 'regen', id: 'grass', min: 10 },
    { light: 'env', id: 'shrubs', max: 5 },
  ],
  lightNames: { life: 'זֶבְּרוֹת', regen: 'עֵשֶׂב', env: 'מְעַט שִׂיחִים' },
  board: [
    { id: 'zebras', name: 'זֶבְּרוֹת', species: 'zebra', tool: 'drone' },
    { id: 'grass', name: 'עֵשֶׂב', species: 'redoat', tool: 'quadrat' },
    { id: 'shrubs', name: 'שִׂיחִים קוֹצָנִיִּים', species: 'whistling', tool: 'drone' },
    { id: 'elephants', name: 'פִּילִים', species: 'elephant', tool: 'drone' },
  ],
  visual: [
    { id: 'zebras', species: 'zebra', scale: 'sqrt', max: 8 },
    { id: 'grass', species: 'redoat', plant: 'adult', max: 14 },
    { id: 'shrubs', species: 'whistling', plant: 'adult', max: 14 },
    { id: 'elephants', species: 'elephant', max: 3 },
  ],
  tools: [
    { id: 'drone', kind: 'drone', name: 'רַחְפָן', icon: 'drone', tell: 'הָרַחְפָן סוֹפֵר מִלְמַעְלָה זֶבְּרוֹת, פִּילִים וְשִׂיחִים.' },
    { id: 'quadrat', name: 'רִבּוּעַ דְּגִימָה', icon: 'quadrat', tell: 'בָּרִבּוּעַ בּוֹדְקִים כַּמָּה עֵשֶׂב יֵשׁ.' },
  ],
  ideas: [
    { id: 'elephants', title: 'לְהַחְזִיר אֶת הַפִּילִים', icon: 'species:elephant', amounts: [1], cost: 10, max: 2, effect: { add: { elephants: 1 } } },
    { id: 'cut', title: 'לִגְזֹם אֶת הַשִּׂיחִים', icon: 'cutplants', amounts: [1], cost: 12, max: 2, effect: { add: { shrubs: -4.5 } } },
    { id: 'grass', title: 'לִשְׁתֹּל עוֹד עֵשֶׂב', icon: 'grass', amounts: [3], cost: 4, effect: { add: { grass: 1 } } },
    { id: 'zebras', title: 'לְהָבִיא עוֹד זֶבְּרוֹת', icon: 'species:zebra', amounts: [3], cost: 5, effect: { add: { zebras: 1 } } },
  ],
  after: {
    elephants: 'הַפִּילִים חָזְרוּ. נִרְאֶה מָה הֵם עוֹשִׂים לַשִּׂיחִים.',
    cut: 'גָּזַמְנוּ הַרְבֵּה שִׂיחִים. נִרְאֶה אִם הֵם יַחְזְרוּ.',
    grass: { test: 'shrubs', above: 8, no: 'הָעֵשֶׂב הֶחָדָשׁ לֹא גָּדַל. הַשִּׂיחִים תּוֹפְסִים אֶת הַמָּקוֹם.', ok: 'הָעֵשֶׂב הֶחָדָשׁ גָּדֵל, כִּי יֵשׁ לוֹ מָקוֹם.' },
    zebras: 'הַזֶּבְּרוֹת הִגִּיעוּ. אֲבָל יֵשׁ לָהֶן מְעַט עֵשֶׂב...',
  },
  hints: [
    'מִי תּוֹפֵס אֶת הַמָּקוֹם שֶׁל הָעֵשֶׂב? סִפְרוּ אֶת הַשִּׂיחִים.',
    'פַּעַם עָבְרוּ כָּאן פִּילִים. כַּמָּה פִּילִים יֵשׁ עַכְשָׁו?',
    'מָה עוֹשֶׂה פִּיל לְשִׂיחַ? הוּא שׁוֹבֵר אוֹתוֹ.',
  ],
  guesses: [
    { id: 'shrubs', text: 'הַשִּׂיחִים תּוֹפְסִים אֶת מְקוֹם הָעֵשֶׂב', icon: 'species:whistling', right: true },
    { id: 'rain', text: 'אֵין מַסְפִּיק גֶּשֶׁם', icon: 'watering' },
    { id: 'zebras', text: 'הַזֶּבְּרוֹת אוֹכְלוֹת יוֹתֵר מִדַּי', icon: 'species:zebra' },
  ],
  dilemma: {
    at: 40,
    title: 'אֵיךְ פּוֹתְחִים אֶת הַמִּישׁוֹר?',
    text: 'יֵשׁ שְׁתֵּי דְּרָכִים. אַחַת מְהִירָה, וְאַחַת לוֹקַחַת זְמַן.',
    options: [
      { idea: 'cut', plus: 'הַשִּׂיחִים נֶעֱלָמִים מִיָּד', minus: 'זֶה עוֹלֶה הַרְבֵּה' },
      { idea: 'elephants', plus: 'הַפִּילִים שׁוֹמְרִים עַל הַמִּישׁוֹר כָּל הַזְּמַן', minus: 'צָרִיךְ לְחַכּוֹת' },
    ],
    later: 'עוֹד לֹא. קֹדֶם נִמְדֹּד.',
  },
  solved: 'הַשִּׂיחִים נִשְׁבְּרוּ, הָעֵשֶׂב חָזַר לִגְדֹּל, וְהַזֶּבְּרוֹת חָזְרוּ לִרְעוֹת.',
  learned: 'גַּם הַפִּיל הַגָּדוֹל שׁוֹמֵר עַל הָעֵשֶׂב הַקָּטָן.',
  realStory: 'בְּמָקוֹם שֶׁאֵין בּוֹ פִּילִים, הַשִּׂיחִים מִתְפַּשְּׁטִים וְהָעֵשֶׂב נִדְחָק. הַפִּילִים שׁוֹבְרִים שִׂיחִים וּפוֹתְחִים מָקוֹם לָעֵשֶׂב.',
  stars: { thrift: 16 },
  budget: 60,
  tests: {
    within: 600,
    traps: {
      'more grass': [{ t: 30, idea: 'grass' }, { t: 40, idea: 'grass' }],
      'more zebras': [{ t: 30, idea: 'zebras' }, { t: 40, idea: 'zebras' }],
      'grass and zebras': [{ t: 30, idea: 'grass' }, { t: 40, idea: 'zebras' }],
    },
    fixes: {
      'the elephants come back': [{ t: 30, idea: 'elephants' }, { t: 35, idea: 'elephants' }],
      'cutting the bushes': [{ t: 30, idea: 'cut' }, { t: 35, idea: 'cut' }],
      'cutting and one elephant': [{ t: 30, idea: 'cut' }, { t: 40, idea: 'elephants' }],
    },
  },
  scene: {
    dayFrac: 0.45,
    decor: [['umbrella', 1, 2], ['stargrass', 1, 3], ['termitemound', 0, 1]],
  },
};
