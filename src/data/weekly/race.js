// מירוץ הרובוטים (1.4.4 set 7): eight courses. A course is five stretches, one from each island, laid one after the
// other on a lane three cells wide; the robot starts on the left of the middle row and must stop on the finish cell at
// the end (engine/world.js cells: 'T' tree, 'R' rock, 'm' mud, 'h' slope, 'n' a narrow log, 'w' shallow water, 's' sand,
// '#' a ditch). A stretch has its hard way (straight through: mud, sand, slope or a log, for a robot made for it) and,
// in most, a longer easy way round. One program and one robot must pass the whole course (Avi, 4.11). Every course is
// proved by tests/weekly/race.mjs: the planner (engine/plan.js) finds a way for at least one of the ready robots.
// Records are the child's own: the fewest steps and the fewest blocks; the best run comes back as a ghost.
const L = (f, k) => ({ f, k });
// rows: top, middle, bottom (each six cells); the middle row's two ends are always open, so the stretches join
export const SEGMENTS = {
  am1: { zone: 'amazon', rows: ['T.TT.T', '..mm..', 'T....T'], name: L('בוץ ביער הגשם', 'בֹּץ בְּיַעַר הַגֶּשֶׁם') },
  am2: { zone: 'amazon', rows: ['TmmmmT', '.mTTm.', 'TmmmmT'], name: L('ביצה בין העצים', 'בִּצָּה בֵּין הָעֵצִים') },
  gr1: { zone: 'grove', rows: ['R....R', '..hh..', 'RRhhRR'], name: L('גבעה בחורש', 'גִּבְעָה בַּחֹרֶשׁ') },
  gr2: { zone: 'grove', rows: ['hhhhhh', '..RR..', 'hhhhhh'], name: L('מדרון סלעים', 'מִדְרוֹן סְלָעִים') },
  rf1: { zone: 'reef', rows: ['wwwwww', '..nn..', 'wwwwww'], name: L('גשר מעל המים', 'גֶּשֶׁר מֵעַל הַמַּיִם') },
  rf2: { zone: 'reef', rows: ['wwwwww', '..nn..', 'w.mm.w'], name: L('גשר או בוץ בחוף', 'גֶּשֶׁר אוֹ בֹּץ בַּחוֹף') },
  de1: { zone: 'desert', rows: ['ssssss', '.ssss.', '......'], name: L('דיונות', 'דְּיוּנוֹת') },
  de2: { zone: 'desert', rows: ['RssssR', '.ssss.', 'RssssR'], name: L('ים של חול', 'יָם שֶׁל חוֹל') },
  sv1: { zone: 'savanna', rows: ['..##..', '..nn..', '..mm..'], name: L('מעבר הנהר', 'מַעֲבַר הַנָּהָר') },
  sv2: { zone: 'savanna', rows: ['.T..T.', '......', 'T..T..'], name: L('מישור פתוח', 'מִישׁוֹר פָּתוּחַ') },
};
// the ready robots every child may race with (engine PRESETS); the child's own robots from the robot workshop join them
export const RACE_BOTS = ['gardener', 'digger', 'tall'];
export const RACE_BLOCKS = ['fwd', 'left', 'right', 'repeat'];
export const RACE_BATTERY = 3;   // a race battery: three times the robot's own (level.batteryK)
export const RACE_VERSIONS = [
  { id: 'r1', title: L('מסלול הפתיחה', 'מַסְלוּל הַפְּתִיחָה'), segs: ['sv2', 'am1', 'gr1', 'de1', 'rf2'], guest: { zone: 'savanna', id: 'giraffe', name: 'ג׳ירפה', kname: 'גִ׳ירָפָה' } },
  { id: 'r2', title: L('גשר החבלים', 'גֶּשֶׁר הַחֲבָלִים'), segs: ['am1', 'gr1', 'rf1', 'de1', 'sv2'], guest: { zone: 'reef', id: 'turtle', name: 'צב ים ירוק', kname: 'צַב יָם יָרֹק' } },
  { id: 'r3', title: L('בוץ וחול', 'בֹּץ וְחוֹל'), segs: ['am2', 'gr2', 'rf2', 'de2', 'sv1'], guest: { zone: 'amazon', id: 'harpy', name: 'עיט הרפיה', kname: 'עֵיט הַרְפְּיָה' } },
  { id: 'r4', title: L('הדרך הארוכה', 'הַדֶּרֶךְ הָאֲרֻכָּה'), segs: ['am1', 'gr2', 'rf2', 'de1', 'sv2'], guest: { zone: 'grove', id: 'jay', name: 'עורבני', kname: 'עוֹרְבָנִי' } },
  { id: 'r5', title: L('מהמדבר לנהר', 'מֵהַמִּדְבָּר לַנָּהָר'), segs: ['de2', 'am2', 'sv1', 'gr1', 'rf2'], guest: { zone: 'desert', id: 'eagleowl', name: 'אוח מדבר', kname: 'אוֹחַ מִדְבָּר' } },
  { id: 'r6', title: L('שני גשרים', 'שְׁנֵי גְּשָׁרִים'), segs: ['am1', 'gr1', 'de1', 'sv1', 'rf1'], guest: { zone: 'savanna', id: 'elephant', name: 'פיל', kname: 'פִּיל' } },
  { id: 'r7', title: L('הנהר קודם', 'הַנָּהָר קֹדֶם'), segs: ['sv1', 'de1', 'am1', 'rf2', 'gr1'], guest: { zone: 'reef', id: 'octopus', name: 'תמנון', kname: 'תְּמָנוּן' } },
  { id: 'r8', title: L('המירוץ הגדול', 'הַמֵּרוֹץ הַגָּדוֹל'), segs: ['sv2', 'de2', 'rf2', 'am2', 'gr2'], guest: { zone: 'grove', id: 'owl', name: 'תנשמת', kname: 'תִּנְשֶׁמֶת' } },
];
// the screen's words
export const RACE_UI = {
  bots: L('הרובוט', 'הָרוֹבּוֹט'), mine: L('שלי', 'שֶׁלִּי'), go: L('יוצאים לדרך!', 'יוֹצְאִים!'), stop: L('עצירה', 'עֲצִירָה'),
  ghost: L('רוח', 'רוּחַ'), best: L('השיאים שלכם', 'הַשִּׂיאִים שֶׁלָּכֶם'), steps: L('צעדים', 'צְעָדִים'), blocks: L('בלוקים', 'בְּלוֹקִים'),
  none: L('עוד אין', 'עוֹד אֵין'), won: L('עברתם את כל המסלול!', 'עֲבַרְתֶּם אֶת הַמַּסְלוּל!'), rec: L('שיא חדש!', 'שִׂיא חָדָשׁ!'),
  done: L('סיום', 'סִיּוּם'), more: L('לנסות לשבור שיא', 'לְנַסּוֹת שׁוּב'), view: L('מבט', 'מַבָּט'),
  speed: L('מהירות', 'מְהִירוּת'), grip: L('אחיזה', 'אֲחִיזָה'),
  why: {
    stuck: L('הרובוט שקע. האחיזה שלו לא מספיקה לקרקע הזאת. נסו דרך אחרת, או רובוט עם גלגלים רחבים או זחלים.', 'הָרוֹבּוֹט שָׁקַע. נַסּוּ דֶּרֶךְ אַחֶרֶת אוֹ רוֹבּוֹט אַחֵר.'),
    slip: L('הרובוט החליק מהגשר הצר. צריך רובוט מדויק יותר, או דרך אחרת.', 'הָרוֹבּוֹט הֶחֱלִיק מֵהַגֶּשֶׁר.'),
    weak: L('אין לרובוט מספיק כוח לעלות בגבעה. נסו רובוט חזק יותר, או לעקוף.', 'אֵין לָרוֹבּוֹט כֹּחַ לַעֲלוֹת.'),
    sink: L('המים עמוקים מדי לרובוט בלי מצופים. מצאו גשר או דרך מסביב.', 'הַמַּיִם עֲמֻקִּים מִדַּי.'),
    flat: L('הסוללה נגמרה. רובוט כבד או דרך ארוכה מדי.', 'הַסּוֹלְלָה נִגְמְרָה.'),
    bump: L('הרובוט נתקע בעץ או בסלע. סובבו אותו לפני כן.', 'הָרוֹבּוֹט נִתְקַע בְּעֵץ אוֹ בְּסֶלַע.'),
    edge: L('הרובוט הגיע לשפת המסלול, או לתעלה. אין שם דרך.', 'אֵין שָׁם דֶּרֶךְ.'),
    short: L('התוכנית נגמרה לפני קו הסיום. הוסיפו עוד צעדים.', 'הַתָּכְנִית נִגְמְרָה לִפְנֵי הַסּוֹף.'),
    any: L('משהו השתבש. נסו שוב.', 'נַסּוּ שׁוּב.'),
  },
};
