// קלפי אילוץ (1.4.4 set 3, docs/PLAN-1.4.4.md "שבעה מקומות בסדנה" 6): a card is drawn, and the child has a short
// round to answer it at the idea machine or the nature mixer. A constraint makes thinking more creative, not less.
// Every round keeps a personal record (the time it took), never a comparison with others. The cards that ask for a
// build ("only three parts", "no metal") come with the build table (set 4).
// A card: { id, f, k?, at: 'machine' | 'mixer' | 'build', sec, goal, levers?, adv? }
//   build goals (set 4): { pass: n, test?, noMetal?, maxAdd?, nature? } = n different tests passed in the hall
//   goal: { ideas: n } | { cats: n } | { cat: id, n } | { works: n } | { funny: n } | { improve: n } | { thing: n }
//         | { allLevers: true } | { mixWorks: n } | { mixWild: n } | { mixZones: n } | { mixMine: n }
//   levers: the only levers that work in this round; adv: only at the full level (it needs levers beginners do not have)
//   k: the beginners' words (fully vocalised); a card without k is not given to beginners
export const CONSTRAINTS = [
  { id: 'minute', f: 'דקה של רעיונות: שישה רעיונות בתוך דקה.', k: 'אַרְבָּעָה רַעְיוֹנוֹת בְּדַקָּה וָחֵצִי!', at: 'machine', sec: 60, ksec: 90, goal: { ideas: 6 }, kgoal: { ideas: 4 } },
  { id: 'kinds', f: 'מכל הכיוונים: רעיונות מארבעה סוגים שונים.', k: 'רַעְיוֹנוֹת מִשְּׁלוֹשָׁה סוּגִים שׁוֹנִים.', at: 'machine', sec: 90, ksec: 120, goal: { cats: 4 }, kgoal: { cats: 3 } },
  { id: 'size', f: 'רק גודל: מותר רק להגדיל ולהקטין. ארבעה רעיונות.', at: 'machine', sec: 90, goal: { ideas: 4 }, levers: ['grow', 'shrink'], adv: true },
  { id: 'upside', f: 'הכול הפוך: רק הידית "הפוך", בשלושה חפצים שונים.', k: 'הַכֹּל הָפוּךְ: רַק "הוֹפְכִים", בִּשְׁלוֹשָׁה חֲפָצִים.', at: 'machine', sec: 90, goal: { things: 3 }, levers: ['flip'] },
  { id: 'onething', f: 'חפץ אחד, הרבה דרכים: חמישה רעיונות מאותו חפץ.', k: 'חֵפֶץ אֶחָד, אַרְבַּע דְּרָכִים!', at: 'machine', sec: 120, goal: { thing: 5 }, kgoal: { thing: 4 } },
  { id: 'animals', f: 'בשביל בעלי החיים: שלושה רעיונות שעוזרים לטבע.', k: 'שְׁנֵי רַעְיוֹנוֹת שֶׁעוֹזְרִים לַטֶּבַע.', at: 'machine', sec: 120, goal: { cat: 'nature', n: 3 }, kgoal: { cat: 'nature', n: 2 } },
  { id: 'works', f: 'רק מה שעובד: ארבעה רעיונות שסימנתם "עובד".', k: 'שְׁלוֹשָׁה רַעְיוֹנוֹת שֶׁעוֹבְדִים.', at: 'machine', sec: 120, goal: { works: 4 }, kgoal: { works: 3 } },
  { id: 'funny', f: 'הכי מצחיק: שלושה רעיונות מצחיקים לתיבת השיגעונות.', k: 'שְׁלוֹשָׁה רַעְיוֹנוֹת מַצְחִיקִים!', at: 'machine', sec: 90, goal: { funny: 3 } },
  { id: 'nature4', f: 'הטבע מלמד: ארבעה רעיונות בידית "כמו בטבע".', k: 'שְׁלוֹשָׁה רַעְיוֹנוֹת "כְּמוֹ בַּטֶּבַע".', at: 'machine', sec: 120, goal: { ideas: 4 }, kgoal: { ideas: 3 }, levers: ['nature'] },
  { id: 'nomaterial', f: 'בלי חומרים חדשים: חמישה רעיונות, ואסור להחליף חומר.', at: 'machine', sec: 120, goal: { ideas: 5 }, levers: ['grow', 'shrink', 'flip', 'join', 'remove', 'reuse', 'nature'], adv: true },
  { id: 'twolevers', f: 'שתי ידיות בלבד: "חבר עם" ו"הורד חלק". ארבעה רעיונות.', at: 'machine', sec: 120, goal: { ideas: 4 }, levers: ['join', 'remove'], adv: true },
  { id: 'water', f: 'מים לכולם: שלושה רעיונות מסוג מים.', k: 'שְׁנֵי רַעְיוֹנוֹת שֶׁל מַיִם.', at: 'machine', sec: 120, goal: { cat: 'water', n: 3 }, kgoal: { cat: 'water', n: 2 } },
  { id: 'safe', f: 'בטוח זה בטוח: שני רעיונות של הגנה ובטיחות.', k: 'רַעְיוֹן אֶחָד שֶׁל הֲגַנָּה.', at: 'machine', sec: 120, goal: { cat: 'shield', n: 2 }, kgoal: { cat: 'shield', n: 1 } },
  { id: 'music', f: 'מוזיקה! שני רעיונות של קול ואור.', k: 'רַעְיוֹן אֶחָד שֶׁל קוֹל.', at: 'machine', sec: 120, goal: { cat: 'sound', n: 2 }, kgoal: { cat: 'sound', n: 1 } },
  { id: 'improve', f: 'עוד גרסה: שלושה רעיונות שסימנתם "שווה לשפר".', k: 'שְׁנֵי רַעְיוֹנוֹת "שָׁוֶה לְשַׁפֵּר".', at: 'machine', sec: 120, goal: { improve: 3 }, kgoal: { improve: 2 } },
  { id: 'home', f: 'בית חכם: שלושה רעיונות לבית.', k: 'שְׁנֵי רַעְיוֹנוֹת לַבַּיִת.', at: 'machine', sec: 120, goal: { cat: 'home', n: 3 }, kgoal: { cat: 'home', n: 2 } },
  { id: 'road', f: 'בדרכים: שלושה רעיונות של תנועה.', k: 'שְׁנֵי רַעְיוֹנוֹת שֶׁל תְּנוּעָה.', at: 'machine', sec: 120, goal: { cat: 'move', n: 3 }, kgoal: { cat: 'move', n: 2 } },
  { id: 'ten', f: 'עשר בשלוש: עשרה רעיונות בשלוש דקות.', k: 'שִׁשָּׁה רַעְיוֹנוֹת בְּשָׁלוֹשׁ דַּקּוֹת.', at: 'machine', sec: 180, goal: { ideas: 10 }, kgoal: { ideas: 6 } },
  { id: 'alllevers', f: 'כל הידיות: למשוך בכל שמונה הידיות.', at: 'machine', sec: 180, goal: { allLevers: true }, adv: true },
  { id: 'allkinds', f: 'כל הסוגים: רעיונות מכל שמונת הסוגים.', at: 'machine', sec: 240, goal: { cats: 8 }, adv: true },
  { id: 'mixfast', f: 'מערבל מהיר: שלושה פתרונות שעובדים בדקה וחצי.', k: 'שְׁנֵי פִּתְרוֹנוֹת שֶׁעוֹבְדִים.', at: 'mixer', sec: 90, ksec: 120, goal: { mixWorks: 3 }, kgoal: { mixWorks: 2 } },
  { id: 'mixwild', f: 'מערבל משוגע: שלושה רעיונות פרועים, שאף אחד לא חשב עליהם.', k: 'שְׁנֵי רַעְיוֹנוֹת מְשֻׁגָּעִים!', at: 'mixer', sec: 90, goal: { mixWild: 3 }, kgoal: { mixWild: 2 } },
  { id: 'mixzones', f: 'מסביב לעולם: פתרונות שעובדים עם קלפים משלוש סביבות.', k: 'פִּתְרוֹנוֹת מִשְּׁתֵּי סְבִיבוֹת.', at: 'mixer', sec: 150, goal: { mixZones: 3 }, kgoal: { mixZones: 2 } },
  { id: 'mixmine', f: 'הקלפים שלי: שלושה פתרונות שעובדים, רק מהקלפים באלבום שלכם.', k: 'שְׁנֵי פִּתְרוֹנוֹת מֵהַקְּלָפִים שֶׁלָּכֶם.', at: 'mixer', sec: 150, goal: { mixMine: 3 }, kgoal: { mixMine: 2 } },
  // set 4: at the build table (goal.pass = how many different tests must be passed at the hall during the round)
  { id: 'three', f: 'רק שלושה חלקים: אב טיפוס עם שלוש תוספות לכל היותר, שעובר שתי בדיקות.', k: 'רַק שְׁלוֹשָׁה חֲלָקִים, וּבְדִיקָה אַחַת עוֹבֶרֶת.', at: 'build', sec: 150, ksec: 180, goal: { pass: 2, maxAdd: 3 }, kgoal: { pass: 1, maxAdd: 3 } },
  { id: 'nometal', f: 'בלי מתכת: אב טיפוס שעובר את מגדל הנפילה, ובלי מתכת.', k: 'בְּלִי מַתֶּכֶת! הַבֵּיצָה לֹא נִשְׁבֶּרֶת.', at: 'build', sec: 150, ksec: 180, goal: { pass: 1, test: 'drop', noMetal: true } },
  { id: 'quiet', f: 'בשביל החיות: אב טיפוס שקט, שעובר את מד הרעש.', k: 'שֶׁיִּהְיֶה שָׁקֵט לַחַיּוֹת!', at: 'build', sec: 120, ksec: 150, goal: { pass: 1, test: 'noise' } },
  { id: 'natureonly', f: 'רק מהטבע: שלוש בדיקות עוברות, ובאב הטיפוס רעיון מהטבע.', at: 'build', sec: 180, goal: { pass: 3, nature: true }, adv: true },
  { id: 'onepart', f: 'חלק אחד בלבד: תוספת אחת, ושתי בדיקות עוברות.', at: 'build', sec: 150, goal: { pass: 2, maxAdd: 1 }, adv: true },
  { id: 'floatfast', f: 'צף מהר: אב טיפוס שעובר את מיכל המים, בתוך דקה.', k: 'שֶׁיָּצוּף! בְּתוֹךְ דַּקָּה וָחֵצִי.', at: 'build', sec: 60, ksec: 90, goal: { pass: 1, test: 'water' } },
];
export const constraintOf = (id) => CONSTRAINTS.find((c) => c.id === id) || null;
