// חוקרי היער – the words of the research screens.
// Beginners (ages 6 to 8) read everything fully vocalised (ניקוד מלא); the other levels read plain Hebrew like the
// rest of the game. tools/validate-research.mjs checks that every beginner string carries nikud.
// {zone} is the place: "הַחֹרֶשׁ" / "הַיַּעַר".

export const RESEARCH_NAME = 'חוקרי היער';     // the whole world of mysteries (start screen, picker)
export const CASE_WORD = 'תעלומה';              // one mystery

const KIDS = {
  zone_grove: 'הַחֹרֶשׁ', zone_amazon: 'הַיַּעַר',
  board: 'מָה מָדַדְנוּ',
  unknown: 'צָרִיךְ לִמְדֹּד',
  tools: 'כְּלֵי מֶחְקָר',
  ideas: 'רַעֲיוֹנוֹת עַל הַשֻּׁלְחָן',
  budget: 'תַּקְצִיב',
  noBudget: 'אֵין מַסְפִּיק תַּקְצִיב',
  noRoom: 'אֵין מָקוֹם לְעוֹד',
  see: 'לִרְאוֹת מָה קוֹרֶה',
  seeing: 'מְחַכִּים לַתּוֹצָאָה...',
  toNight: 'קָדִימָה עַד הַלַּיְלָה',
  camWaits: 'הַמַּצְלֵמָה תִּסְפֹּר בַּלַּיְלָה.',
  camCounted: 'הַמַּצְלֵמָה סָפְרָה בַּלַּיְלָה:',
  droneCounted: 'הָרַחְפָן סָפַר:',
  quadratCounted: 'בָּרִבּוּעַ מָצָאנוּ:',
  measuring: 'מוֹדְדִים...',
  hint: 'רֶמֶז',
  hintWait: 'הָרֶמֶז הַבָּא יִהְיֶה מוּכָן בְּעוֹד רֶגַע.',
  noMoreHints: 'זֶה הָיָה הָרֶמֶז הָאַחֲרוֹן. אַתֶּם יְכוֹלִים!',
  meter: 'מַד הָאִזּוּן',
  balanced: '{zone} מְאֻזָּן! עוֹד {n} שְׁנִיּוֹת',
  notYet: 'כְּשֶׁשָּׁלֹשׁ הַנּוּרוֹת יְרֻקּוֹת, הַשָּׁעוֹן מַתְחִיל.',
  clockWaits: 'הַשָּׁעוֹן מְחַכֶּה: נוּרָה אַחַת לֹא יְרֻקָּה.',
  lab: 'מַעְבָּדָה',
  labTitle: 'הַמַּעְבָּדָה',
  graphs: 'מְדִידוֹת',
  noData: 'עוֹד לֹא מָדַדְנוּ. שִׂימוּ כְּלִי מֶחְקָר.',
  myGuess: 'הַהַשְׁעָרָה שֶׁלִּי: מָה קָרָה כָּאן?',
  guessSaved: 'רָשַׁמְנוּ בַּמַּחְבֶּרֶת. עַכְשָׁו נִבְדֹּק!',
  close: 'סְגִירָה',
  back: 'חֲזָרָה',
  start: 'יוֹצְאִים לַחֲקֹר',
  solvedTitle: 'הַתַּעֲלוּמָה נִפְתְּרָה!',
  starHealed: 'הֶחָזַרְנוּ אֶת הָאִזּוּן',
  starGuess: 'הַשְׁעָרָה נְכוֹנָה',
  starThrift: 'בְּלִי לְבַזְבֵּז',
  realWorld: 'גַּם בָּעוֹלָם:',
  learned: 'לָמַדְנוּ:',
  more: 'עוֹד תַּעֲלוּמוֹת',
  stay: 'לְהִשָּׁאֵר וְלִרְאוֹת',
  packWon: 'קִבַּלְתֶּם חֲבִילַת קְלָפִים!',
  sourceWon: 'וְגַם קְלַף מָקוֹר:',
  exit: 'יְצִיאָה',
  timeLine: 'זְמַן',
  tStart: 'הַהַתְחָלָה',
  tNow: 'עַכְשָׁו',
  newCase: 'תַּעֲלוּמָה חֲדָשָׁה',
  count: 'כַּמּוּת',
};
const PLAIN = {
  zone_grove: 'החורש', zone_amazon: 'היער',
  board: 'מה מדדנו', unknown: 'צריך למדוד', tools: 'כלי מחקר', ideas: 'רעיונות על השולחן', budget: 'תקציב',
  noBudget: 'אין מספיק תקציב', noRoom: 'אין מקום לעוד', see: 'לראות מה קורה', seeing: 'מחכים לתוצאה...',
  toNight: 'קדימה עד הלילה', camWaits: 'המצלמה תספור בלילה.', camCounted: 'המצלמה ספרה בלילה:', droneCounted: 'הרחפן ספר:',
  quadratCounted: 'בריבוע מצאנו:', measuring: 'מודדים...', hint: 'רמז', hintWait: 'הרמז הבא יהיה מוכן בעוד רגע.',
  noMoreHints: 'זה היה הרמז האחרון.', meter: 'מד האיזון', balanced: '{zone} מאוזן! עוד {n} שניות',
  notYet: 'כששלוש הנורות ירוקות, השעון מתחיל.', clockWaits: 'השעון מחכה: נורה אחת לא ירוקה.', lab: 'מעבדה', labTitle: 'המעבדה', graphs: 'מדידות',
  noData: 'עוד לא מדדנו. הציבו כלי מחקר.', myGuess: 'ההשערה שלי: מה קרה כאן?', guessSaved: 'רשמנו במחברת. עכשיו נבדוק!',
  close: 'סגירה', back: 'חזרה', start: 'יוצאים לחקור', solvedTitle: 'התעלומה נפתרה!', starHealed: 'החזרנו את האיזון',
  starGuess: 'השערה נכונה', starThrift: 'בלי לבזבז', realWorld: 'גם בעולם:', learned: 'למדנו:', more: 'עוד תעלומות',
  stay: 'להישאר ולראות', packWon: 'קיבלתם חבילת קלפים!', sourceWon: 'וגם קלף מקור:', exit: 'יציאה', timeLine: 'זמן', tStart: 'ההתחלה', tNow: 'עכשיו',
  newCase: 'תעלומה חדשה', count: 'כמות',
};
export function textsFor(level, zone) {
  const T = level === 'kids' ? KIDS : PLAIN;
  const z = T['zone_' + zone] || T.zone_grove;
  return (key, vars = {}) => String(T[key] ?? PLAIN[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => (k === 'zone' ? z : vars[k] ?? ''));
}
export const KIDS_TEXTS = KIDS;
