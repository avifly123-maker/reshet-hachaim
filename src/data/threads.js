// חוטים (1.3.2): what a child does in one part of the game changes something in another part.
// Data only. The engine is src/core/threads.js; רובו־דע's words when a thread opens are in src/data/guide/threads.js
// (line id 'th.<id>'); tools/validate-threads.mjs checks every reference and that each fact has a source.
//
// THREADS = [{ id, mode, from, to, effect?, parts, name, hint, fact, src }]
//   mode: 'exp' = one of the six simple threads of the experience mode (and of beginners); 'full' = full mode only
//   from.kind: 'invention' (a lab invention, e.g. 'sharkskin', or an inventors problem solved: id from inventions.js
//              PROBLEMS), 'case' (a solved mystery: id, or '*' = any; `tool` = a research tool used in one),
//              'photo' (a species photographed on the island: '*' = any species that has a microscope sample),
//              'link' (a relation discovered: '*' = any relation of a species that has a research question),
//              'event' (ids: island events lived), 'zone' (id: all regular missions of the zone done),
//              'robot' (a robot built in the workshop), 'think' (a thinking-corner activity done: id)
//   to.kind:   'tool' (an island tool upgrade: effect = { tool, zone?, key, value }), 'choice' (a new event choice:
//              effect = { event, choice }), 'reveal' (links shown on the island: effect = { zone, links, mark? }),
//              'measure' (effect = { what: 'notebook'|'quadrat'|'experiment' }), 'sample' (microscope samples marked
//              "מהאי שלכם"), 'question' (atlas questions marked), 'case' (a mystery recommended), 'problem' (inventors
//              problems marked "מחכות לכם"), 'robotout' (the child's robot works on the island)
//   parts:  [from part, to part] of core/journey.js PARTS: where the thread is drawn on the journey map
//   name:   the thread's short name (map chips); hint: one line on what opens it (a closed thread on the map)
//   fact:   the real-world fact the thread leans on (or "game logic on …"); src: where it is checked (docs/sources.md)
// Every child-facing text is { f, k }: f plain, k for beginners with full nikud; plural address.

// the island species that have a microscope sample (src/lab/samples.js), for 'photo' → 'sample'
export const SAMPLE_OF = {
  reefshark: 'sharkskin', owl: 'owlfeather', honeybee: 'beeleg', branching: 'coralpolyp', morpho: 'morphowing',
  firefly: 'fireflylamp', toucan: 'toucanbeak', chameleon: 'chameleonskin', octopus: 'octosucker', hedgehog: 'hedgehogspine',
  sloth: 'slothhair', kapok: 'kapokfibre', parrotfish: 'parrottooth', urchin: 'urchinteeth', mushroom: 'mycelium',
  clam: 'clammantle', leafcutter: 'leafbac',
};
// a photo of these marks a sample of a near creature (a glowing fungus grows threads like every fungus)
export const PHOTO_SAMPLE = { glowfungus: 'mycelium' };
// the creatures that have a research question in the atlas (src/data/lab-questions.js `sp`), for 'link' → 'question'
export const QUESTION_SPECIES = ['agama', 'branching', 'brazilnut', 'butterfly', 'chameleon', 'clam', 'clownfish', 'coati', 'dartfrog', 'firefly',
  'fruitbat', 'glowfungus', 'harvesterant', 'hedgehog', 'honeybee', 'hoopoe', 'hummingbird', 'jellyfish', 'kapok', 'leafcutter', 'liana', 'morpho',
  'mushroom', 'octopus', 'owl', 'parrotfish', 'pine', 'porcupine', 'reefshark', 'shrimp', 'sloth', 'spinymouse', 'stingray', 'tortoise', 'toucan',
  'turtle', 'urchin', 'waterlily'];
// the species each mystery is about (the card stamp 'case'): from the case's board (src/research/cases)
export const CASE_SPECIES = {
  'mice-owl': ['grove', 'spinymouse', 'owl', 'sage'],
  'flowers-bees': ['grove', 'honeybee', 'rockrose'],
  'brazil-nut': ['amazon', 'orchidbee', 'agouti', 'brazilnut', 'orchid'],
  'green-reef': ['reef', 'parrotfish', 'branching', 'algae'],
  'moving-sand': ['desert', 'acacia', 'retama'],
  'lonely-acacias': ['desert', 'dorcas', 'acacia'],
  'cleaning-station': ['reef', 'butterflyfish', 'cleaner', 'brain'],
  'white-coral': ['reef', 'branching', 'surgeonfish', 'algae'],
  'the-trap': ['grove', 'spinymouse', 'owl', 'fox'],
  frogs: ['amazon', 'dartfrog', 'bromeliad'],
  'young-oaks': ['grove', 'hyrax', 'jay', 'oak'],
  leafcutters: ['amazon', 'leafcutter', 'anteater', 'cecropia'],
  'no-predators': ['amazon', 'jaguar', 'harpy', 'howler', 'agouti', 'kapok'],
  'summer-fire': ['grove', 'pine', 'oak', 'jay'],
  gazelles: ['grove', 'gazelle'],
};
// the regular missions of each zone: [id prefix, count] in the full game and the beginners' count (k1…kN)
export const REGULAR = { amazon: ['a', 21, 7], grove: ['g', 21, 7], reef: ['r', 13, 6] };
// the card stamps, in the order they are drawn on a card (src/learn/hub/)
export const STAMPS = ['seen', 'photo', 'scope', 'invent', 'case', 'source'];
export const STAMP_NAME = {
  seen: { f: 'ראיתם באי', k: 'רְאִיתֶם בָּאִי' },
  photo: { f: 'צילמתם', k: 'צִלַּמְתֶּם' },
  scope: { f: 'במיקרוסקופ', k: 'בַּמִּיקְרוֹסְקוֹפּ' },
  invent: { f: 'המצאתם בזכותו', k: 'הִמְצֵאתֶם בִּזְכוּתוֹ' },
  case: { f: 'בתעלומה שפתרתם', k: 'בַּתַּעֲלוּמָה שֶׁפְּתַרְתֶּם' },
  source: { f: 'מן המקורות', k: 'מִן הַמְּקוֹרוֹת' },
};
// small words of the threads' screens
export const THREAD_WORDS = {
  fromIsland: { f: 'מהאי שלכם', k: 'מֵהָאִי שֶׁלָּכֶם' },
  waiting: { f: 'מחכה לכם', k: 'מְחַכָּה לָכֶם' },
  recommend: { f: 'רובו־דע ממליץ', k: 'רוֹבּוֹ־דַּע מַמְלִיץ' },
  threads: { f: 'חוטים בין החלקים', k: 'חוּטִים בֵּין הַחֲלָקִים' },
  open: { f: 'פתוחים', k: 'פְּתוּחִים' },
  of: { f: 'מתוך', k: 'מִתּוֹךְ' },
  stamps: { f: 'חותמות', k: 'חוֹתָמוֹת' },
};

const S = {   // sources (docs/sources.md, section "חוטים")
  riblets: 'Bechert et al. 1997, J. Fluid Mech. 338: 59–87 (docs/sources.md, the lab)',
  hummingbird: 'https://en.wikipedia.org/wiki/AeroVironment_Nano_Hummingbird',
  anternet: 'Stanford "anternet" (harvester ants), docs/sources.md הממציאים: anternet',
  firefly: 'https://www.sciencedaily.com/releases/2013/01/130108112453.htm',
  chameleon: 'https://www.manep.ch/the-chameleon-reorganizes-its-nano-crystals-to-change-colors-2/ ; camera traps: https://en.wikipedia.org/wiki/Camera_trap',
  octopusGrip: 'https://techxplore.com/news/2017-03-octopus-tentacle-gripper.html',
  octopusPatch: 'docs/sources.md הממציאים: bandage (octopus-sucker adhesive patch, Korea)',
  butterfly: 'docs/sources.md הממציאים: solar (white butterfly V-shape, Exeter, almost 50% more power)',
  brazilnut: 'docs/sources.md הממציאים: nutshell (Brazil nut shell)',
  shrimp: 'docs/sources.md הממציאים: plasma (pistol shrimp claw, Texas)',
  notebook: 'docs/sources.md חוקרי הטבע (the mysteries measure, guess, try)',
  quadrat: 'https://en.wikipedia.org/wiki/Quadrat',
  owl: 'docs/sources.md grove, Barn owl and Spiny mouse lines (core.ac.uk/works/1444118 ; frontiersin frym.2023.1182137)',
  trap: 'Meyrom et al. 2009, Ardea 97(4); Boutin 1990 (docs/sources.md, "המלכודת"); acorns eaten by rodents (Palestine oak line)',
  fire: 'https://www.kkl-jnf.org/forestry-and-ecology/fire-prevention/maintaining-forests-to-prevent-fires/',
  buoy: 'https://en.wikipedia.org/wiki/Mooring_buoy',
  brazil: 'https://www.newworldencyclopedia.org/entry/Brazil_nut ; https://www.sciencedaily.com/releases/2003/12/031219073357.htm',
  fair: 'docs/sources.md חושבים כמו חוקרים (a fair test changes one thing at a time)',
  mycel: 'https://en.wikipedia.org/wiki/Mycelium ; https://en.wikipedia.org/wiki/Foxfire',
  atlas: 'src/data/lab-questions.js answers (each with its source in docs/sources.md)',
  heat: 'Fine, Gildor & Genin 2013, Global Change Biology (docs/sources.md, the reef)',
  frogs: 'https://www.tambopatalodge.com/en/jungle-blog/bromeliads-host-plants-for-amphibians-and-insects',
  gazelle: 'https://www.timesofisrael.com/mountain-gazelles-under-serious-threat-urgent-action-needed-study/',
  inventors: 'src/data/inventions.js facts (docs/sources.md הממציאים)',
  robots: 'docs/sources.md הממציאים, robot workshop',
};
const L = (f, k) => ({ f, k });

export const THREADS = [
  // ─────────────── the lab → the island (tool upgrades)
  { id: 'sharkskin', mode: 'exp', from: { kind: 'invention', id: 'sharkskin' }, to: { kind: 'tool', id: 'drone' }, effect: { tool: 'drone', zone: 'reef', key: 'speed', value: 1.25 },
    parts: ['lab:table', 'zone:reef'], name: L('עור כריש לרובוט הצולל', 'עוֹר כָּרִישׁ לָרוֹבּוֹט הַצּוֹלֵל'),
    hint: L('המציאו בשולחן הממציאים ציפוי עור כריש.', 'הַמְצִיאוּ בְּשֻׁלְחַן הַמַּמְצִיאִים צִפּוּי עוֹר כָּרִישׁ.'),
    fact: 'Ridges along the flow, like shark skin denticles, cut friction in water by about 8%.', src: S.riblets },
  { id: 'hover', mode: 'exp', from: { kind: 'invention', id: 'hover' }, to: { kind: 'tool', id: 'drone' }, effect: { tool: 'drone', key: 'hover', value: true },
    parts: ['inventors', 'zone:amazon'], name: L('רחפן שעומד באוויר', 'רַחְפָן שֶׁעוֹמֵד בָּאֲוִיר'),
    hint: L('פתרו אצל הממציאים את "רחפן קטן שעומד באוויר".', 'פִּתְרוּ אֵצֶל הַמַּמְצִיאִים אֶת "רַחְפָן קָטָן שֶׁעוֹמֵד בָּאֲוִיר".'),
    fact: 'A flapping-wing drone the size of a hummingbird (Nano Hummingbird, 2011) hovers in one place; game logic: the monitoring drone hovers over an animal that needs help.', src: S.hummingbird },
  { id: 'anternet', mode: 'full', from: { kind: 'invention', id: 'anternet' }, to: { kind: 'tool', id: 'drone' }, effect: { tool: 'drone', key: 'share', value: true },
    parts: ['inventors', 'zone:grove'], name: L('רחפנים שמספרים זה לזה', 'רַחְפָנִים שֶׁמְּסַפְּרִים זֶה לָזֶה'),
    hint: L('פתרו את "רשת מחשבים שלא נתקעת".', 'פִּתְרוּ אֶת "רֶשֶׁת מַחְשְׁבִים שֶׁלֹּא נִתְקַעַת".'),
    fact: 'Harvester ants send out foragers by how fast others return, almost the rule the internet uses to share data; game logic: several drones share one report.', src: S.anternet },
  { id: 'lamp', mode: 'exp', from: { kind: 'invention', id: 'lamp' }, to: { kind: 'tool', id: 'camera' }, effect: { tool: 'camera', key: 'night', value: 1.5 },
    parts: ['inventors', 'zone:grove'], name: L('מצלמה שרואה בלילה', 'מַצְלֵמָה שֶׁרוֹאָה בַּלַּיְלָה'),
    hint: L('פתרו את "נורה שמאירה יותר".', 'פִּתְרוּ אֶת "נוּרָה שֶׁמְּאִירָה יוֹתֵר".'),
    fact: 'Firefly-lantern scales on an LED let out up to 55% more light; game logic: the field camera sees farther at night.', src: S.firefly },
  { id: 'camo', mode: 'full', from: { kind: 'invention', id: 'camo' }, to: { kind: 'tool', id: 'camera' }, effect: { tool: 'camera', key: 'shy', value: true },
    parts: ['inventors', 'zone:amazon'], name: L('מצלמה מוסתרת', 'מַצְלֵמָה מֻסְתֶּרֶת'),
    hint: L('פתרו את "מעיל שמשנה צבע".', 'פִּתְרוּ אֶת "מְעִיל שֶׁמְּשַׁנֶּה צֶבַע".'),
    fact: 'Chameleons change colour with tiny crystals in the skin; camera traps record animals without disturbing them; game logic: a hidden camera catches shy animals.', src: S.chameleon },
  { id: 'grip', mode: 'exp', from: { kind: 'invention', id: 'grip' }, to: { kind: 'tool', id: 'rescue' }, effect: { tool: 'rescue', key: 'speed', value: 1.4 },
    parts: ['inventors', 'zone:grove'], name: L('רובוט הצלה עדין', 'רוֹבּוֹט הַצָּלָה עָדִין'),
    hint: L('פתרו את "יד רובוט שתופסת בעדינות".', 'פִּתְרוּ אֶת "יַד רוֹבּוֹט שֶׁתּוֹפֶסֶת בַּעֲדִינוּת".'),
    fact: 'A soft gripper shaped like an octopus arm holds things gently (Festo, 2017); game logic: the rescue robot treats an injured animal faster.', src: S.octopusGrip },
  { id: 'bandage', mode: 'full', from: { kind: 'invention', id: 'bandage' }, to: { kind: 'tool', id: 'rescue' }, effect: { tool: 'rescue', key: 'heal', value: 1.5 },
    parts: ['inventors', 'zone:reef'], name: L('פלסטר שנדבק במים', 'פְּלַסְטֶר שֶׁנִּדְבָּק בַּמַּיִם'),
    hint: L('פתרו את "פלסטר שנדבק גם לעור רטוב".', 'פִּתְרוּ אֶת "פְּלַסְטֶר שֶׁנִּדְבָּק גַּם לְעוֹר רָטֹב".'),
    fact: 'A patch of tiny octopus-like suckers sticks to wet skin and under water; game logic: an injured animal recovers faster.', src: S.octopusPatch },
  { id: 'solar', mode: 'full', from: { kind: 'invention', id: 'solar' }, to: { kind: 'tool', id: 'watergen' }, effect: { tool: 'watergen', key: 'output', value: 1.3 },
    parts: ['inventors', 'zone:grove'], name: L('עוד מים מהאוויר', 'עוֹד מַיִם מֵהָאֲוִיר'),
    hint: L('פתרו את "פאנל סולרי שנותן יותר חשמל".', 'פִּתְרוּ אֶת "פָּאנֶל סוֹלָרִי שֶׁנּוֹתֵן יוֹתֵר חַשְׁמַל".'),
    fact: 'Mirrors in the V shape of a white butterfly\'s wings gave a solar panel almost 50% more power; game logic: more power, more water from the air.', src: S.butterfly },
  { id: 'nutshell', mode: 'full', from: { kind: 'invention', id: 'nutshell' }, to: { kind: 'tool', id: 'nestbox' }, effect: { tool: 'nestbox', key: 'storm', value: true },
    parts: ['inventors', 'zone:amazon'], name: L('תיבת קינון חזקה', 'תֵּבַת קִנּוּן חֲזָקָה'),
    hint: L('פתרו את "קופסה שלא נסדקת".', 'פִּתְרוּ אֶת "קֻפְסָה שֶׁלֹּא נִסְדֶּקֶת".'),
    fact: 'The Brazil nut fruit\'s hard shell does not crack, and a light tough material was modelled on it; game logic: nest boxes stand in a storm.', src: S.brazilnut },
  { id: 'plasma', mode: 'full', from: { kind: 'invention', id: 'plasma' }, to: { kind: 'tool', id: 'weather' }, effect: { tool: 'weather', zone: 'reef', key: 'murky', value: 0.6, event: 'r_flood' },
    parts: ['inventors', 'zone:reef'], name: L('מים צלולים מהר יותר', 'מַיִם צְלוּלִים מַהֵר יוֹתֵר'),
    hint: L('פתרו את "לנקות מים בבועה".', 'פִּתְרוּ אֶת "לְנַקּוֹת מַיִם בְּבוּעָה".'),
    fact: 'The pistol shrimp\'s collapsing bubble may one day help clean water (research); game logic: murky water on the reef clears sooner.', src: S.shrimp },

  // ─────────────── the mysteries → the island
  { id: 'notebook', mode: 'full', from: { kind: 'case', id: '*' }, to: { kind: 'measure', id: 'notebook' }, effect: { what: 'notebook' },
    parts: ['research', 'zone:grove'], name: L('מחברת החוקר באי', 'מַחְבֶּרֶת הַחוֹקֵר בָּאִי'),
    hint: L('פתרו תעלומה אחת בחוקרי הטבע.', 'פִּתְרוּ תַּעֲלוּמָה אַחַת בְּחוֹקְרֵי הַטֶּבַע.'),
    fact: 'Game logic: researchers keep numbers over time and draw them as a graph, as the mysteries teach.', src: S.notebook },
  { id: 'quadrat', mode: 'full', from: { kind: 'case', id: '*', tool: 'quadrat' }, to: { kind: 'measure', id: 'quadrat' }, effect: { what: 'quadrat' },
    parts: ['research', 'zone:grove'], name: L('ריבוע דגימה באי', 'רִבּוּעַ דְּגִימָה בָּאִי'),
    hint: L('מדדו בריבוע הדגימה בתעלומה.', 'מִדְדוּ בְּרִבּוּעַ הַדְּגִימָה בַּתַּעֲלוּמָה.'),
    fact: 'A quadrat is a square frame laid on the ground to count the plants and small animals inside it.', src: S.quadrat },
  { id: 'mice-owl', mode: 'full', from: { kind: 'case', id: 'mice-owl' }, to: { kind: 'reveal', id: 'grove' }, effect: { zone: 'grove', links: ['owl>spinymouse>eats'], mark: { tool: 'nestbox', species: 'owl' } },
    parts: ['research', 'zone:grove'], name: L('התנשמת והקוצן', 'הַתִּנְשֶׁמֶת וְהַקּוֹצָן'),
    hint: L('פתרו את התעלומה "יותר מדי קוצנים".', 'פִּתְרוּ אֶת הַתַּעֲלוּמָה "יוֹתֵר מִדַּי קוֹצָנִים".'),
    fact: 'Barn owls in Israel hunt spiny mice and nest in nest boxes (they build no nest).', src: S.owl },
  { id: 'the-trap', mode: 'full', from: { kind: 'case', id: 'the-trap' }, to: { kind: 'choice', id: 'g_acorns' },
    effect: { event: 'g_acorns', choice: { id: 'owlboxes',
      label: L('לתלות תיבות קינון לתנשמות, במקום רעל', 'לִתְלוֹת תֵּבוֹת קִנּוּן לְתִנְשָׁמוֹת, בִּמְקוֹם רַעַל'),
      outcome: L('כשיש המון בלוטים, יש גם המון עכברים. התנשמות שגרות בתיבות צדות אותם, בלי רעל שמזיק לכולם.', 'כְּשֶׁיֵּשׁ הָמוֹן בַּלּוּטִים, יֵשׁ גַּם הָמוֹן עַכְבָּרִים. הַתִּנְשָׁמוֹת שֶׁגָּרוֹת בַּתֵּבוֹת צָדוֹת אוֹתָם, בְּלִי רַעַל שֶׁמַּזִּיק לַכֹּל.'),
      effects: [{ type: 'unlock', species: 'owl' }, { type: 'add', species: 'owl', count: 1 }] } },
    parts: ['research', 'zone:grove'], name: L('תנשמות במקום רעל', 'תִּנְשָׁמוֹת בִּמְקוֹם רַעַל'),
    hint: L('פתרו את התעלומה "המלכודת".', 'פִּתְרוּ אֶת הַתַּעֲלוּמָה "הַמַּלְכֹּדֶת".'),
    fact: 'More food (a year of many acorns) raises rodent numbers; poison passes to owls; Israel hangs nest boxes so barn owls hunt the rodents instead.', src: S.trap },
  { id: 'summer-fire', mode: 'full', from: { kind: 'case', id: 'summer-fire' }, to: { kind: 'choice', id: 'g_fire' },
    effect: { event: 'g_fire', choice: { id: 'firebreak',
      label: L('להכין פס שמירה עם שיחי אלת המסטיק, שהאש לא תעבור', 'לְהָכִין פַּס שְׁמִירָה עִם שִׂיחֵי אֱלַת הַמַּסְטִיק, שֶׁהָאֵשׁ לֹא תַּעֲבֹר'),
      outcome: L('שיחי המסטיק נשארים ירוקים, וקשה להם להישרף. בשריפה הבאה האש תיעצר ליד הפס.', 'שִׂיחֵי הַמַּסְטִיק נִשְׁאָרִים יְרֻקִּים, וְקָשֶׁה לָהֶם לְהִשָּׂרֵף. בַּשְּׂרֵפָה הַבָּאָה הָאֵשׁ תֵּעָצֵר לְיַד הַפַּס.'),
      effects: [{ type: 'plant', species: 'mastic', count: 2, where: 'any' }] } },
    parts: ['research', 'zone:grove'], name: L('פס שמירה מפני אש', 'פַּס שְׁמִירָה מִפְּנֵי אֵשׁ'),
    hint: L('פתרו את התעלומה "אש בקיץ".', 'פִּתְרוּ אֶת הַתַּעֲלוּמָה "אֵשׁ בַּקַּיִץ".'),
    fact: 'KKL makes fuel breaks along roads and counts mastic among the shrubs that burn less; the green belt of mastic is the mystery\'s game logic.', src: S.fire },
  { id: 'cleaning-station', mode: 'full', from: { kind: 'case', id: 'cleaning-station' }, to: { kind: 'tool', id: 'buoy' }, effect: { tool: 'buoy', zone: 'reef', key: 'range', value: 1.5 },
    parts: ['research', 'zone:reef'], name: L('מצוף ששומר על יותר', 'מָצוֹף שֶׁשּׁוֹמֵר עַל יוֹתֵר'),
    hint: L('פתרו את התעלומה "תחנת הניקוי נסגרה".', 'פִּתְרוּ אֶת הַתַּעֲלוּמָה "תַּחֲנַת הַנִּקּוּי נִסְגְּרָה".'),
    fact: 'Anchors break corals and mooring buoys prevent it (Eilat Coral Beach reserve); the larger area is game logic.', src: S.buoy },
  { id: 'brazil-nut', mode: 'full', from: { kind: 'case', id: 'brazil-nut' }, to: { kind: 'reveal', id: 'amazon' }, effect: { zone: 'amazon', links: ['orchidbee>brazilnut>pollinates', 'agouti>brazilnut>disperses'] },
    parts: ['research', 'zone:amazon'], name: L('הסוד של אגוז הברזיל', 'הַסּוֹד שֶׁל אֱגוֹז הַבְּרָזִיל'),
    hint: L('פתרו את התעלומה "אגוזי הברזיל שלא נותנים פרי".', 'פִּתְרוּ אֶת הַתַּעֲלוּמָה "אֱגוֹזֵי הַבְּרָזִיל שֶׁלֹּא נוֹתְנִים פְּרִי".'),
    fact: 'Large bees, orchid bees among them, pollinate the Brazil nut flower; agoutis open the fruit and bury the seeds.', src: S.brazil },
  { id: 'fair', mode: 'full', from: { kind: 'think', id: 'fair' }, to: { kind: 'measure', id: 'experiment' }, effect: { what: 'experiment' },
    parts: ['lab', 'zone:grove'], name: L('ניסוי הוגן באי', 'נִסּוּי הוֹגֵן בָּאִי'),
    hint: L('עשו בחממה את "הניסוי ההוגן".', 'עֲשׂוּ בַּחֲמָמָה אֶת "הַנִּסּוּי הַהוֹגֵן".'),
    fact: 'A fair test changes one thing at a time and compares before and after.', src: S.fair },

  // ─────────────── the island → the lab and the mysteries
  { id: 'photo-scope', mode: 'exp', from: { kind: 'photo', id: '*' }, to: { kind: 'sample', id: '*' },
    parts: ['zone:grove', 'lab:scope'], name: L('מהמצלמה למיקרוסקופ', 'מֵהַמַּצְלֵמָה לַמִּיקְרוֹסְקוֹפּ'),
    hint: L('צלמו באי גחלילית, פטרייה או יצור אחר.', 'צַלְּמוּ בָּאִי גַּחְלִילִית, פִּטְרִיָּה אוֹ יְצוּר אַחֵר.'),
    fact: 'Every creature with a sample is the one the sample comes from (src/lab/samples.js); a glowing fungus grows threads (mycelium) like every fungus.', src: S.mycel },
  { id: 'link-atlas', mode: 'full', from: { kind: 'link', id: '*' }, to: { kind: 'question', id: '*' },
    parts: ['zone:amazon', 'lab:atlas'], name: L('קשר חדש, שאלה חדשה', 'קֶשֶׁר חָדָשׁ, שְׁאֵלָה חֲדָשָׁה'),
    hint: L('גלו באי קשר של יצור שיש עליו שאלת חקר.', 'גַּלּוּ בָּאִי קֶשֶׁר שֶׁל יְצוּר שֶׁיֵּשׁ עָלָיו שְׁאֵלַת חֵקֶר.'),
    fact: 'Game logic: a relation found on the island points to the research question about the same creature.', src: S.atlas },
  { id: 'ev-fire', mode: 'full', from: { kind: 'event', ids: ['g_fire', 'g_drought'] }, to: { kind: 'case', id: 'summer-fire' },
    parts: ['zone:grove', 'research'], name: L('אחרי הקיץ הקשה', 'אַחֲרֵי הַקַּיִץ הַקָּשֶׁה'),
    hint: L('כשהחורש שלכם יעבור שריפה או קיץ יבש.', 'כְּשֶׁהַחֹרֶשׁ שֶׁלָּכֶם יַעֲבֹר שְׂרֵפָה אוֹ קַיִץ יָבֵשׁ.'),
    fact: 'Dry vegetation in summer is the fuel of forest fires; the mystery "אש בקיץ" is about it.', src: S.fire },
  { id: 'ev-heat', mode: 'full', from: { kind: 'event', ids: ['r_heat', 'r_heatx'] }, to: { kind: 'case', id: 'white-coral' },
    parts: ['zone:reef', 'research'], name: L('מים חמים בשונית', 'מַיִם חַמִּים בַּשּׁוּנִית'),
    hint: L('כשהמים בשונית שלכם יתחממו.', 'כְּשֶׁהַמַּיִם בַּשּׁוּנִית שֶׁלָּכֶם יִתְחַמְּמוּ.'),
    fact: 'Warm water makes corals bleach; Eilat\'s corals stand more heat when the water is clean.', src: S.heat },
  { id: 'ev-dry', mode: 'full', from: { kind: 'event', ids: ['a_dry'] }, to: { kind: 'case', id: 'frogs' },
    parts: ['zone:amazon', 'research'], name: L('שבועות בלי גשם', 'שָׁבוּעוֹת בְּלִי גֶּשֶׁם'),
    hint: L('כשהיער שלכם יעבור שבועות בלי גשם.', 'כְּשֶׁהַיַּעַר שֶׁלָּכֶם יַעֲבֹר שָׁבוּעוֹת בְּלִי גֶּשֶׁם.'),
    fact: 'Dart frogs raise their tadpoles in the rainwater held by bromeliads.', src: S.frogs },
  { id: 'ev-anchor', mode: 'full', from: { kind: 'event', ids: ['r_anchor'] }, to: { kind: 'case', id: 'cleaning-station' },
    parts: ['zone:reef', 'research'], name: L('עוגן על השונית', 'עֹגֶן עַל הַשּׁוּנִית'),
    hint: L('כשסירה תטיל עוגן בשונית שלכם.', 'כְּשֶׁסִּירָה תַּטִּיל עֹגֶן בַּשּׁוּנִית שֶׁלָּכֶם.'),
    fact: 'Anchors break coral heads; the mystery "תחנת הניקוי נסגרה" is about it.', src: S.buoy },
  { id: 'ev-road', mode: 'full', from: { kind: 'event', ids: ['g_road'] }, to: { kind: 'case', id: 'gazelles' },
    parts: ['zone:grove', 'research'], name: L('כביש ליד החורש', 'כְּבִישׁ לְיַד הַחֹרֶשׁ'),
    hint: L('כשיסללו כביש ליד החורש שלכם.', 'כְּשֶׁיִּסְלְלוּ כְּבִישׁ לְיַד הַחֹרֶשׁ שֶׁלָּכֶם.'),
    fact: 'Roads and fences cut mountain gazelle herds apart in Israel.', src: S.gazelle },
  { id: 'zone-amazon', mode: 'full', from: { kind: 'zone', id: 'amazon' }, to: { kind: 'problem', ids: ['roof', 'color', 'lifevest'] },
    parts: ['zone:amazon', 'inventors'], name: L('ממציאים מהאמזונס', 'מַמְצִיאִים מֵהָאָמָזוֹנָס'),
    hint: L('השלימו את כל המשימות באמזונס.', 'הַשְׁלִימוּ אֶת כָּל הַמְּשִׂימוֹת בָּאָמָזוֹנָס.'),
    fact: 'The giant water lily, the morpho and the kapok all taught real inventions (see their problems).', src: S.inventors },
  { id: 'zone-grove', mode: 'full', from: { kind: 'zone', id: 'grove' }, to: { kind: 'problem', ids: ['quiet', 'helmet', 'righting'] },
    parts: ['zone:grove', 'inventors'], name: L('ממציאים מהחורש', 'מַמְצִיאִים מֵהַחֹרֶשׁ'),
    hint: L('השלימו את כל המשימות בחורש.', 'הַשְׁלִימוּ אֶת כָּל הַמְּשִׂימוֹת בַּחֹרֶשׁ.'),
    fact: 'The barn owl, the hedgehog and the tortoise all taught real inventions (see their problems).', src: S.inventors },
  { id: 'zone-reef', mode: 'full', from: { kind: 'zone', id: 'reef' }, to: { kind: 'problem', ids: ['swim', 'sting', 'grip'] },
    parts: ['zone:reef', 'inventors'], name: L('ממציאים מהשונית', 'מַמְצִיאִים מֵהַשּׁוּנִית'),
    hint: L('השלימו את כל המשימות בשונית.', 'הַשְׁלִימוּ אֶת כָּל הַמְּשִׂימוֹת בַּשּׁוּנִית.'),
    fact: 'The reef shark, the clownfish and the octopus all taught real inventions (see their problems).', src: S.inventors },
  { id: 'robot-out', mode: 'exp', from: { kind: 'robot', id: '*' }, to: { kind: 'robotout', id: '*' },
    parts: ['robots', 'zone:reef'], name: L('הרובוט שלכם באי', 'הָרוֹבּוֹט שֶׁלָּכֶם בָּאִי'),
    hint: L('בנו רובוט בסדנת הרובוטים.', 'בְּנוּ רוֹבּוֹט בְּסַדְנַת הָרוֹבּוֹטִים.'),
    fact: 'Game logic: the robot built from traits in the workshop goes out to help on the island.', src: S.robots },
];
export const threadById = (id) => THREADS.find((t) => t.id === id) || null;
