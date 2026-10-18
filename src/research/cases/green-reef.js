// תעלומה (מתחילים, השונית): השונית הירוקה.
// Green turf algae cover the corals and almost no young corals settle. The fish that graze the algae (parrotfish and
// surgeonfish) sleep at night in holes in the reef; a storm broke the big branching corals, the holes are gone, and
// so only a few grazers stay. The fix the child can discover: an artificial reef (a place to hide), and the grazers
// come back by themselves, eat the algae, and young corals find clean rock to settle on. Bringing fish with nowhere to
// hide, or planting young corals from the nursery into the algae, look helpful and then fail. A robot that scrapes the
// algae works at once, and then the algae grow back: that is the dilemma of the case (fast, or lasting).
// Facts (reef.js + docs/sources.md): parrotfish and surgeonfish eat algae and keep space free for corals; many reef
// fish shelter in holes and branches of the reef at night; artificial reefs in Eilat are quickly settled by reef
// fish; young corals settle on clean rock, not on rock covered with algae.
// All beginner texts are fully vocalised (ניקוד מלא) for ages 6 to 8 (tools/validate-research.mjs checks it).

export const GREEN_REEF = {
  id: 'green-reef',
  zone: 'reef',
  level: 'kids',
  order: 3,
  title: 'הַשּׁוּנִית הַיְּרֻקָּה',
  plainTitle: 'השונית הירוקה',
  call: 'אַצּוֹת יְרֻקּוֹת מְכַסּוֹת אֶת הָאַלְמוֹגִים.',
  callMore: 'שׁוֹמְרֵי הַשּׁוּנִית רוֹאִים הַרְבֵּה אַצּוֹת, וְכִמְעַט אֵין אַלְמוֹגִים צְעִירִים. מָה קָרָה כָּאן?',
  holdSeconds: 60,
  model: {
    vars: [
      { id: 'grazers', kind: 'animal', init: 2, need: 0.4, birth: 0.02, death: 0.006, hungry: 0.35, leaveHungry: 0.05,
        cap: { of: 'holes', per: 6, plus: 1 }, leaveCrowded: 0.1, arrive: 0.3, arriveIf: 0.3, food: true },
      { id: 'holes', kind: 'stock', init: 0.3 },
      { id: 'corals', kind: 'plant', init: 8 },
      { id: 'young', kind: 'plant', init: 0 },
      { id: 'algae', kind: 'stock', init: 300 },
      { id: 'rock', kind: 'stock', init: 1 },   // bare rock: algae always come back from it, they are never all eaten
    ],
    flows: [
      // algae grow fast on bare rock, up to a carpet
      { type: 'produce', from: 'algae', to: 'algae', rate: 0.04, byCap: 500 },
      { type: 'produce', from: 'rock', to: 'algae', rate: 2, byCap: 500 },
      { type: 'consume', eater: 'grazers', food: 'algae', need: 0.4, half: 30, cost: 1.5 },
      // young corals settle where the grazers keep the rock clean
      { type: 'produce', from: 'corals', to: 'young', rate: 0.03, help: { id: 'grazers', half: 8 }, byCap: 24 },
      // a carpet of algae smothers young corals, and slowly the old ones too
      { type: 'consume', eater: 'algae', food: 'young', need: 0.0008, half: 4 },
      { type: 'consume', eater: 'algae', food: 'corals', need: 0.000012, half: 4 },
      { type: 'mature', from: 'young', to: 'corals', rate: 1 / 160, cap: 18 },
      // branching corals that grow (where the rock is grazed clean) make new holes to hide in
      { type: 'produce', from: 'corals', to: 'holes', rate: 0.0003, help: { id: 'grazers', half: 10 }, byCap: 6 },
      { type: 'decay', of: 'holes', rate: 0.0008 },   // old broken branches crumble into rubble
      { type: 'decay', of: 'young', rate: 0.003 },
      { type: 'decay', of: 'corals', rate: 0.0002 },
    ],
  },
  lights: [
    { light: 'life', id: 'grazers', min: 9 },
    { light: 'life', id: 'corals', min: 6 },
    { light: 'regen', id: 'young', min: 3 },
    { light: 'env', id: 'algae', max: 120 },
  ],
  lightNames: { life: 'חַיִּים', regen: 'אַלְמוֹגִים צְעִירִים', env: 'מְעַט אַצּוֹת' },
  board: [
    { id: 'grazers', name: 'דָּגִים שֶׁאוֹכְלִים אַצּוֹת', species: 'parrotfish', tool: 'reefcam' },
    { id: 'corals', name: 'אַלְמוֹגִים', species: 'branching', tool: 'rov' },
    { id: 'holes', name: 'מְקוֹמוֹת מַחֲבוֹא', icon: 'holes', tool: 'rov' },
    { id: 'algae', name: 'אַצּוֹת', species: 'algae', tool: 'quadrat' },
    { id: 'young', name: 'אַלְמוֹגִים צְעִירִים', icon: 'sprout', tool: 'quadrat' },
  ],
  visual: [
    { id: 'grazers', species: 'parrotfish', scale: 'sqrt', max: 8 },
    { id: 'grazers', species: 'surgeonfish', scale: 'sqrt', max: 5 },
    { id: 'corals', species: 'branching', plant: 'adult', max: 14 },
    { id: 'young', species: 'branching', plant: 'young', max: 10 },
    { id: 'algae', species: 'algae', plant: 'adult', per: 20, max: 16 },
  ],
  tools: [
    { id: 'reefcam', kind: 'daycam', near: 'branching', name: 'מַצְלֵמָה תַּת־יַמִּית', icon: 'uwcam', tell: 'הַמַּצְלֵמָה סוֹפֶרֶת אֶת הַדָּגִים שֶׁאוֹכְלִים אַצּוֹת.' },
    { id: 'rov', kind: 'drone', name: 'רוֹבּוֹט צוֹלֵל', icon: 'rov', tell: 'הָרוֹבּוֹט סוֹפֵר אַלְמוֹגִים וּמְקוֹמוֹת מַחֲבוֹא.' },
    { id: 'quadrat', name: 'רִבּוּעַ דְּגִימָה', icon: 'quadrat', tell: 'בָּרִבּוּעַ סוֹפְרִים אַצּוֹת וְאַלְמוֹגִים צְעִירִים.' },
  ],
  ideas: [
    { id: 'reefball', title: 'שׁוּנִית מְלָאכוּתִית', icon: 'reefball', amounts: [1], cost: 8, max: 3, effect: { add: { holes: 1.8 } }, tech: true, place: 'reefball' },
    { id: 'fish', title: 'לְהָבִיא תּוּכִינוֹנִים', icon: 'species:parrotfish', amounts: [5], cost: 5, effect: { add: { grazers: 1 } } },
    { id: 'robot', title: 'רוֹבּוֹט שֶׁמְּגָרֵד אַצּוֹת', icon: 'rov', amounts: [1], cost: 12, max: 2, effect: { add: { algae: -220 } }, tech: true },
    { id: 'nursery', title: 'לִשְׁתֹּל אַלְמוֹגִים מֵהַמִּשְׁתָּלָה', icon: 'nursery', amounts: [4], cost: 8, effect: { add: { young: 1 } }, place: 'nursery' },
  ],
  after: {
    reefball: 'הַשּׁוּנִית הַמְּלָאכוּתִית מְחַכָּה לַדָּגִים.',
    fish: { test: 'holes', below: 1.5, no: 'הַתּוּכִינוֹנִים לֹא מָצְאוּ אֵיפֹה לְהִסְתַּתֵּר בַּלַּיְלָה, וְעָזְבוּ.', ok: 'הַתּוּכִינוֹנִים מָצְאוּ מַחֲבוֹא וְנִשְׁאֲרוּ.' },
    robot: 'הָרוֹבּוֹט גֵּרֵד אֶת הָאַצּוֹת. אֲבָל אַצּוֹת גְּדֵלוֹת מַהֵר מְאוֹד...',
    nursery: 'הָאַלְמוֹגִים הַקְּטַנִּים נִשְׁתְּלוּ, אֲבָל הָאַצּוֹת מְכַסּוֹת גַּם אוֹתָם.',
  },
  hints: [
    'מִי אוֹכֵל אֶת הָאַצּוֹת? שִׂימוּ מַצְלֵמָה תַּת־יַמִּית.',
    'הַתּוּכִינוֹן יָשֵׁן בַּלַּיְלָה בְּתוֹךְ חוֹר בַּשּׁוּנִית. כַּמָּה מְקוֹמוֹת מַחֲבוֹא נִשְׁאֲרוּ?',
    'סְעָרָה שָׁבְרָה אֶת הָאַלְמוֹגִים הַגְּדוֹלִים, וְהַחוֹרִים נֶעֶלְמוּ.',
  ],
  guesses: [
    { id: 'holes', text: 'לַדָּגִים אֵין אֵיפֹה לְהִסְתַּתֵּר', icon: 'holes', right: true },
    { id: 'few', text: 'יֵשׁ מְעַט מִדַּי אַלְמוֹגִים', icon: 'species:branching' },
    { id: 'robot', text: 'צָרִיךְ לְגָרֵד אֶת הָאַצּוֹת', icon: 'rov' },
  ],
  // the dilemma of the case: fast, or lasting
  dilemma: {
    at: 40,
    title: 'מָה עוֹשִׂים עִם הָאַצּוֹת?',
    text: 'יֵשׁ שְׁתֵּי דְּרָכִים. אַחַת מְהִירָה, וְאַחַת לוֹקַחַת זְמַן.',
    options: [
      { idea: 'robot', plus: 'הָאַצּוֹת נֶעֱלָמוֹת מִיָּד', minus: 'הֵן חוֹזְרוֹת, וְזֶה יָקָר' },
      { idea: 'reefball', plus: 'נוֹתֶנֶת בַּיִת לַדָּגִים', minus: 'צָרִיךְ לְחַכּוֹת' },
    ],
    later: 'עוֹד לֹא. קֹדֶם נִמְדֹּד.',
  },
  solved: 'הַדָּגִים מָצְאוּ מַחֲבוֹא, רָעוּ אֶת הָאַצּוֹת, וְהָאַלְמוֹגִים הַצְּעִירִים קִבְּלוּ מָקוֹם לִגְדֹּל.',
  learned: 'הַדָּג צָרִיךְ בַּיִת, וְהָאַלְמוֹג צָרִיךְ אֶת הַדָּג.',
  realStory: 'בְּשׁוּנִית שֶׁיֵּשׁ בָּהּ הַרְבֵּה דָּגִים שֶׁאוֹכְלִים אַצּוֹת, הָאַלְמוֹגִים נִשְׁאָרִים נְקִיִּים. בְּאֵילַת שָׂמִים בַּיָּם שׁוּנִיּוֹת מְלָאכוּתִיּוֹת, וְדָגִים בָּאִים לָגוּר בָּהֶן.',
  source: 'leovdah',
  stars: { thrift: 16 },   // one or two artificial reefs, nothing wasted
  budget: 60,
  tests: {
    within: 600,
    traps: {
      'fish with nowhere to hide': [{ t: 30, idea: 'fish' }, { t: 40, idea: 'fish' }],
      'the robot scrapes the algae': [{ t: 30, idea: 'robot' }],
      'the robot twice': [{ t: 30, idea: 'robot' }, { t: 140, idea: 'robot' }],
      'young corals from the nursery': [{ t: 30, idea: 'nursery' }, { t: 40, idea: 'nursery' }],
    },
    fixes: {
      'one artificial reef': [{ t: 30, idea: 'reefball' }],
      'two artificial reefs': [{ t: 30, idea: 'reefball' }, { t: 35, idea: 'reefball' }],
      'the robot, then an artificial reef': [{ t: 30, idea: 'robot' }, { t: 60, idea: 'reefball' }],
      'fish first, then an artificial reef': [{ t: 30, idea: 'fish' }, { t: 120, idea: 'reefball' }],
    },
  },
  scene: {
    dayFrac: 0.4,   // late morning: the grazers are out
    decor: [['table', 1, 2], ['brain', 1, 2], ['softcoral', 1, 3], ['seagrass', 1, 4], ['sponge', 1, 2], ['seaanemone', 1, 1]],
  },
};
