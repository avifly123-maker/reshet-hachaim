// התקלה במעבדה (1.4.4 set 5, docs/PLAN-1.4.4.md "ארבעת האירועים השבועיים" 1): קוּבִּי pressed the wrong button and
// creatures from several zones landed on one island. Each grows slowly weaker out of its place (a gentle sign, never a
// death: a creature that runs out of strength is carried home by רובו־דע and counts as missed). The child sends each one
// through the gate of its own zone; one that is home already stays. A wrong gate tells why it cannot live there.
// What it teaches: every creature fits its place (no language of change over time).
// The table: every creature's need (`need`, one of NEEDS) and what each zone lacks for that need (LACK[need][zone]).
// A creature's home is its album card's zone (data/workshop/nature-cards.js). Facts: docs/sources.md "התקלה במעבדה".
// what each creature needs, as a noun phrase (the screen writes "{name} · מה שצריך: {need}", the same for every gender)
export const NEEDS = {
  sea: { f: 'מים מלוחים של ים', k: 'מֵי יָם מְלוּחִים' },
  wet: { f: 'יער לח, עם גשם כמעט כל השנה', k: 'יַעַר רָטֹב, עִם גֶּשֶׁם כָּל הַשָּׁנָה' },
  dry: { f: 'חום, יובש וחול של מדבר', k: 'חֹם וְחוֹל שֶׁל מִדְבָּר' },
  grass: { f: 'מרחבים פתוחים של עשב לאכול', k: 'הַרְבֵּה עֵשֶׂב פָּתוּחַ' },
  oak: { f: 'עצי אלון, עם בלוטים לטמון לחורף', k: 'עֲצֵי אַלּוֹן עִם בַּלּוּטִים' },
  medit: { f: 'חורף גשום, קיץ יבש, וצל של סלעים ושיחים', k: 'חֹרֶף גָּשׁוּם וְקַיִץ יָבֵשׁ' },
};
// the feminine names among the creatures (for the one verb the screen uses: נרדם / נרדמה)
export const FEM = new Set(['dartfrog', 'cyclamen', 'anemone', 'jellyfish', 'zebra', 'impala', 'heliconia', 'darkling']);
// what each zone lacks for a need (a zone that is home for the need has none)
export const LACK = {
  sea: { amazon: ['יש שם נהר, אבל המים מתוקים', 'הַמַּיִם שָׁם מְתוּקִים'], grove: ['אין שם ים בכלל', 'אֵין שָׁם יָם'], desert: ['אין שם מים בכלל', 'אֵין שָׁם מַיִם'], savanna: ['יש שם בורות מים ונהר, אבל המים מתוקים', 'הַמַּיִם שָׁם מְתוּקִים'] },
  wet: { grove: ['הקיץ שם ארוך ויבש', 'הַקַּיִץ שָׁם יָבֵשׁ'], reef: ['זה ים, לא יער', 'זֶה יָם, לֹא יַעַר'], desert: ['יבש מדי, כמעט אין שם גשם', 'יָבֵשׁ מִדַּי'], savanna: ['בעונת היובש הכול מתייבש, ואין שם יער סבוך', 'בַּקַּיִץ הַכֹּל מִתְיַבֵּשׁ'] },
  dry: { amazon: ['רטוב ולח מדי, והאדמה בוצית', 'רָטֹב מִדַּי'], grove: ['החורף שם גשום וקר מדי בשבילו', 'הַחֹרֶף שָׁם גָּשׁוּם מִדַּי'], reef: ['זה ים', 'זֶה יָם'], savanna: ['אין שם חולות עמוקים, ובגשמים הכול רטוב', 'אֵין שָׁם חוֹל עָמֹק'] },
  grass: { amazon: ['זה יער סבוך, וכמעט אין עשב בין העצים', 'זֶה יַעַר סָבוּךְ, בְּלִי עֵשֶׂב'], grove: ['יש שם שיחים וסלעים, בלי מרחבי עשב גדולים', 'יֵשׁ שָׁם שִׂיחִים, לֹא מִישׁוֹר עֵשֶׂב'], reef: ['זה ים', 'זֶה יָם'], desert: ['כמעט אין שם עשב', 'אֵין שָׁם עֵשֶׂב'] },
  oak: { amazon: ['אין שם עצי אלון', 'אֵין שָׁם אַלּוֹנִים'], reef: ['זה ים', 'זֶה יָם'], desert: ['אין שם עצי אלון', 'אֵין שָׁם אַלּוֹנִים'], savanna: ['אין שם עצי אלון', 'אֵין שָׁם אַלּוֹנִים'] },
  medit: { amazon: ['גשום ולח שם כל השנה', 'גָּשׁוּם שָׁם כָּל הַשָּׁנָה'], reef: ['זה ים', 'זֶה יָם'], desert: ['יבש מדי, כמעט בלי גשם', 'יָבֵשׁ מִדַּי'], savanna: ['חם מאוד, ובלי חורף קריר', 'חַם מְאֹד, בְּלִי חֹרֶף'] },
};
// the creatures of the event and their need (their home zone comes from their card)
export const CREATURES = {
  dartfrog: 'wet', toucan: 'wet', sloth: 'wet', morpho: 'wet', kinkajou: 'wet', heliconia: 'wet', howler: 'wet',
  jay: 'oak', cyclamen: 'medit', anemone: 'medit', oak: 'medit',
  clownfish: 'sea', parrotfish: 'sea', octopus: 'sea', turtle: 'sea', jellyfish: 'sea', starfish: 'sea',
  fennec: 'dry', jerboa: 'dry', scorpion: 'dry', darkling: 'dry', uromastyx: 'dry', sandcat: 'dry',
  zebra: 'grass', wildebeest: 'grass', impala: 'grass', buffalo: 'grass',
};
// eight versions: the island they landed on, who landed (the first four for beginners), the rare guest
export const GLITCH_VERSIONS = [
  { id: 'g1', land: 'grove', title: 'נחיתה בחורש', ktitle: 'נְחִיתָה בַּחֹרֶשׁ', list: ['dartfrog', 'fennec', 'clownfish', 'jay', 'zebra', 'octopus'], guest: { zone: 'grove', id: 'owl', name: 'תנשמת', kname: 'תִּנְשֶׁמֶת' } },
  { id: 'g2', land: 'desert', title: 'בלגן במדבר', ktitle: 'בָּלָגָן בַּמִּדְבָּר', list: ['toucan', 'jerboa', 'turtle', 'cyclamen', 'wildebeest', 'scorpion'], guest: { zone: 'desert', id: 'eagleowl', name: 'אוח מדבר', kname: 'אוֹחַ מִדְבָּר' } },
  { id: 'g3', land: 'savanna', title: 'הפתעה בסוואנה', ktitle: 'הַפְתָּעָה בַּסַּוַואנָה', list: ['sloth', 'parrotfish', 'impala', 'darkling', 'anemone', 'jellyfish'], guest: { zone: 'savanna', id: 'giraffe', name: 'ג׳ירפה', kname: 'גִ׳ירָפָה' } },
  { id: 'g4', land: 'amazon', title: 'מי נחת באמזונס?', ktitle: 'מִי נָחַת בָּאֲמָזוֹנָס?', list: ['morpho', 'starfish', 'fennec', 'buffalo', 'jay', 'kinkajou'], guest: { zone: 'amazon', id: 'harpy', name: 'עיט הרפיה', kname: 'עֵיט הַרְפְּיָה' } },
  { id: 'g5', land: 'reef', title: 'נחיתה רטובה', ktitle: 'נְחִיתָה רְטֻבָּה', list: ['clownfish', 'zebra', 'uromastyx', 'heliconia', 'oak', 'turtle'], guest: { zone: 'reef', id: 'turtle', name: 'צב ים ירוק', kname: 'צַב יָם יָרֹק' } },
  { id: 'g6', land: 'grove', title: 'הכפתור האדום, שוב', ktitle: 'הַכַּפְתּוֹר הָאָדֹם, שׁוּב', list: ['sandcat', 'cyclamen', 'octopus', 'howler', 'wildebeest', 'jerboa'], guest: { zone: 'grove', id: 'owl', name: 'תנשמת', kname: 'תִּנְשֶׁמֶת' } },
  { id: 'g7', land: 'desert', title: 'יותר מדי אורחים', ktitle: 'יוֹתֵר מִדַּי אוֹרְחִים', list: ['darkling', 'dartfrog', 'parrotfish', 'impala', 'anemone', 'jellyfish', 'sloth'], guest: { zone: 'desert', id: 'eagleowl', name: 'אוח מדבר', kname: 'אוֹחַ מִדְבָּר' } },
  { id: 'g8', land: 'savanna', title: 'התקלה הגדולה', ktitle: 'הַתַּקָּלָה הַגְּדוֹלָה', list: ['buffalo', 'starfish', 'toucan', 'scorpion', 'jay', 'kinkajou', 'turtle'], guest: { zone: 'savanna', id: 'giraffe', name: 'ג׳ירפה', kname: 'גִ׳ירָפָה' } },
];
