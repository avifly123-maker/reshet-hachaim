// שולחן הבנייה (1.4.4 set 4, docs/PLAN-1.4.4.md "שבעה מקומות בסדנה" 3–4): what a prototype is built from, and how
// every piece moves the six tests of the test hall. A prototype = one shape + one material + up to four add-ons
// (mechanisms and ideas from nature). The test hall (src/workshop/engine.js) adds the numbers: base 30, clamped 0..100.
//   tests: wind (מנהרת רוח: drag and steadiness), water (מיכל מים: floating, no leaks), heat (תא חום: cooling and
//   insulation), sand (ארגז חול: not sinking, holding on), drop (מגדל הנפילה: does the egg inside survive), noise
//   (מד רעש: how quiet it is for the animals: high = quiet)
// A nature add-on names the album card it comes from (`card`) and the fact behind it (docs/sources.md "שולחן הבנייה").
export const TESTS = [
  { id: 'wind', n: 'מנהרת רוח', k: 'מִנְהֶרֶת רוּחַ', d: 'אוויר חלק ויציבות', kd: 'שֶׁלֹּא יָעוּף', fail: 'fly', failF: 'עף עם הרוח!', failK: 'עָף עִם הָרוּחַ!' },
  { id: 'water', n: 'מיכל מים', k: 'מְכַל מַיִם', d: 'צף ולא דולף', kd: 'שֶׁיָּצוּף', fail: 'sink', failF: 'שקע עם בועות!', failK: 'שָׁקַע! בְּלוּב בְּלוּב!' },
  { id: 'heat', n: 'תא חום', k: 'תָּא חֹם', d: 'נשאר קריר בשמש', kd: 'שֶׁיִּשָּׁאֵר קָרִיר', fail: 'melt', failF: 'התנפח מהחום!', failK: 'הִתְנַפֵּחַ מֵהַחֹם!' },
  { id: 'sand', n: 'ארגז חול', k: 'אַרְגַּז חוֹל', d: 'לא שוקע ונאחז', kd: 'שֶׁלֹּא יִשְׁקַע בַּחוֹל', fail: 'bury', failF: 'נבלע בחול!', failK: 'נִבְלַע בַּחוֹל!' },
  { id: 'drop', n: 'מגדל הנפילה', k: 'מִגְדַּל הַנְּפִילָה', d: 'הביצה בפנים שורדת', kd: 'שֶׁהַבֵּיצָה לֹא תִּשָּׁבֵר', fail: 'crack', failF: 'הביצה נשברה! איכס!', failK: 'הַבֵּיצָה נִשְׁבְּרָה!' },
  { id: 'noise', n: 'מד רעש', k: 'מַד רַעַשׁ', d: 'שקט לבעלי החיים', kd: 'שֶׁיִּהְיֶה שָׁקֵט', fail: 'shake', failF: 'רעש! כל החיות ברחו!', failK: 'רַעַשׁ! הַחַיּוֹת בָּרְחוּ!' },
];
export const TEST_IDS = TESTS.map((t) => t.id);
const v = (wind = 0, water = 0, heat = 0, sand = 0, drop = 0, noise = 0) => ({ wind, water, heat, sand, drop, noise });

export const SHAPES = [
  { id: 'box', n: 'קופסה', k: 'קֻפְסָה', fx: v(-5, 10, 0, 0, 0, 0) },
  { id: 'ball', n: 'כדור', k: 'כַּדּוּר', fx: v(10, 15, 0, -10, 5, 0) },
  { id: 'tube', n: 'צינור', k: 'צִנּוֹר', fx: v(15, 5, 10, -5, -5, 0) },
  { id: 'cone', n: 'חץ', k: 'חֵץ', fx: v(25, -5, 0, -10, -10, 0) },
  { id: 'plate', n: 'משטח רחב', k: 'מִשְׁטָח רָחָב', fx: v(-20, 5, 5, 25, -5, 0) },
  { id: 'dome', n: 'כיפה', k: 'כִּפָּה', fx: v(15, 10, 5, 5, 10, 0) },
];
export const MATERIALS = [
  { id: 'wood', n: 'עץ', k: 'עֵץ', col: '#c58a4a', fx: v(0, 20, 10, 0, 0, 5) },
  { id: 'cloth', n: 'בד', k: 'בַּד', col: '#e07a8a', fx: v(-10, -25, 5, 0, 5, 15) },
  { id: 'metal', n: 'מתכת', k: 'מַתֶּכֶת', col: '#a8b4c0', fx: v(10, -15, -10, -10, -5, -20) },
  { id: 'rubber', n: 'גומי', k: 'גּוּמִי', col: '#3a9a6a', fx: v(0, 10, 0, 5, 20, 10) },
  { id: 'glass', n: 'זכוכית', k: 'זְכוּכִית', col: '#9fd8f0', fx: v(5, 5, -15, 0, -30, 0) },
];
// add-ons: mech = mechanisms, nature = ideas from nature (card: the album card it comes from)
export const ADDONS = [
  { id: 'spring', kind: 'mech', n: 'קפיץ', k: 'קְפִיץ', fx: v(0, 0, 0, 0, 25, -5) },
  { id: 'wheel', kind: 'mech', n: 'גלגלים', k: 'גַּלְגַּלִּים', fx: v(-5, 0, 0, -15, 0, -5) },
  { id: 'pipe', kind: 'mech', n: 'צינורית אוויר', k: 'צִנּוֹרִית', fx: v(0, -5, 15, 0, 0, 0) },
  { id: 'pump', kind: 'mech', n: 'משאבה', k: 'מַשְׁאֵבָה', fx: v(0, 15, 0, 0, 0, -10) },
  { id: 'fan', kind: 'mech', n: 'מאוורר', k: 'מְאַוְרֵר', fx: v(-5, 0, 20, 0, 0, -15) },
  { id: 'chute', kind: 'mech', n: 'מצנח', k: 'מַצְנֵחַ', fx: v(-20, 0, 0, 0, 25, 0) },
  { id: 'spines', kind: 'nature', card: 'hedgehog', n: 'קוצים של קיפוד', k: 'קוֹצִים שֶׁל קִפּוֹד', fx: v(0, 0, 0, 5, 15, 0) },
  { id: 'scales', kind: 'nature', card: 'crocodile', n: 'קשקשים של תנין', k: 'קַשְׂקַשִּׂים שֶׁל תַּנִּין', fx: v(5, 10, 0, 0, 5, 0) },
  { id: 'suction', kind: 'nature', card: 'octopus', n: 'פתי יניקה של תמנון', k: 'פִּיּוֹת שֶׁל תְּמָנוּן', fx: v(10, 0, 0, 10, 0, 0) },
  { id: 'bigears', kind: 'nature', card: 'fennec', n: 'אוזניים גדולות של פנק', k: 'אָזְנַיִם שֶׁל פֶּנֶק', fx: v(-5, 0, 25, 0, 0, 0) },
  { id: 'honeycomb', kind: 'nature', card: 'honeybee', n: 'חלת דבש', k: 'חַלַּת דְּבַשׁ', fx: v(0, 5, 10, 0, 15, 0) },
  { id: 'shell', kind: 'nature', card: 'tortoise', n: 'שריון של צב', k: 'שִׁרְיוֹן שֶׁל צָב', fx: v(0, -5, 0, 0, 20, 0) },
  { id: 'softwing', kind: 'nature', card: 'owl', n: 'נוצות של תנשמת', k: 'נוֹצוֹת שֶׁל תִּנְשֶׁמֶת', fx: v(0, 0, 0, 0, 0, 30) },
  { id: 'ribs', kind: 'nature', card: 'waterlily', n: 'צלעות של ויקטוריה', k: 'צְלָעוֹת שֶׁל וִיקְטוֹרְיָה', fx: v(0, 20, 0, 0, 5, 0) },
  { id: 'widefoot', kind: 'nature', card: 'camel', n: 'כף רגל של גמל', k: 'רֶגֶל שֶׁל גָּמָל', fx: v(0, 0, 0, 25, 0, 0) },
  { id: 'airtunnels', kind: 'nature', card: 'termitemound', n: 'מנהרות של טרמיטים', k: 'מִנְהָרוֹת שֶׁל טֶרְמִיטִים', fx: v(0, 0, 25, 0, 0, 0) },
  { id: 'sharkskin', kind: 'nature', card: 'reefshark', n: 'עור של כריש', k: 'עוֹר שֶׁל כָּרִישׁ', fx: v(15, 10, 0, 0, 0, 0) },
  { id: 'fogcatch', kind: 'nature', card: 'darkling', n: 'גב של חיפושית ערפל', k: 'גַּב שֶׁל חִפּוּשִׁית', fx: v(0, 0, 5, 0, 0, 0) },
  { id: 'glow', kind: 'nature', card: 'firefly', n: 'אור של גחלילית', k: 'אוֹר שֶׁל גַּחְלִילִית', fx: v(0, 0, 0, 0, 0, 0) },
  { id: 'reflect', kind: 'nature', card: 'sandcat', n: 'עיניים מחזירות אור של חתול', k: 'עֵינַיִם שֶׁל חָתוּל', fx: v(0, 0, 0, 0, 0, 0) },
  { id: 'uvglow', kind: 'nature', card: 'scorpion', n: 'זוהר סגול של עקרב', k: 'זֹהַר שֶׁל עַקְרָב', fx: v(0, 5, 0, 0, 0, 0) },
  { id: 'buzz', kind: 'nature', card: 'honeybee', n: 'כוורת מזמזמת', k: 'כַּוֶּרֶת מְזַמְזֶמֶת', fx: v(0, 0, 0, 0, 0, -5) },
];
export const MAX_ADDONS = 4;
export const shapeOf = (id) => SHAPES.find((x) => x.id === id) || null;
export const materialOf = (id) => MATERIALS.find((x) => x.id === id) || null;
export const addonOf = (id) => ADDONS.find((x) => x.id === id) || null;
