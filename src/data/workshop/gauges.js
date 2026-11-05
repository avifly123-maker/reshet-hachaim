// מה הלקוח מודד (1.4.4, Avi 5.11: "a stronger link between the problem and the measurement: real quantities from a
// simple model, with a clear reason"). The six stations of the test hall still give a score 0..100; here every score
// is also told as a quantity a child can picture (how many degrees inside, how many centimetres it sank), and every
// order has the one quantity its client cares about (how far the road is seen, how many litres a day…).
// The model is simple on purpose: a straight line from the station's score. The client's target is the same line at
// the order's minimum score, so "the number reached the target" and "the test passed" are always the same thing.
//   UNITS[test]  : the station's own quantity        f(score) → number;  better: 'up' | 'down'
//   GAUGES[id]   : the client's quantity              from: which of the order's tests it reads (default: the first)
//                  f(score, has) → number            has(addonId) tells if a piece is on the prototype
// Words: n (full), k (beginners, vocalised), u / uk (the unit).
const r = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
export const UNITS = {
  wind: { n: 'זז ברוח', k: 'זָז בָּרוּחַ', u: 'ס״מ', uk: 'ס״מ', better: 'down', f: (s) => r((100 - s) * 0.6) },
  water: { n: 'מים שנכנסו', k: 'מַיִם שֶׁנִּכְנְסוּ', u: 'כוסות', uk: 'כּוֹסוֹת', better: 'down', f: (s) => r((100 - s) / 8) },
  heat: { n: 'חום בפנים', k: 'חֹם בִּפְנִים', u: 'מעלות', uk: 'מַעֲלוֹת', better: 'down', f: (s) => r(48 - s * 0.26) },
  sand: { n: 'שקע בחול', k: 'שָׁקַע בַּחוֹל', u: 'ס״מ', uk: 'ס״מ', better: 'down', f: (s) => r((100 - s) * 0.3) },
  drop: { n: 'נופל בלי לשבור', k: 'נוֹפֵל בְּלִי לִשְׁבֹּר', u: 'מטר', uk: 'מֶטֶר', better: 'up', f: (s) => r1(s / 20) },
  noise: { n: 'רעש', k: 'רַעַשׁ', u: 'דציבל', uk: 'דֶּצִיבֶּל', better: 'down', f: (s) => r(95 - s * 0.6) },
};
const light = (has) => has('glow') || has('reflect');
export const GAUGES = {
  see: { n: 'מרחק שרואים אותו בלילה', k: 'מֵאֵיפֹה רוֹאִים אוֹתוֹ', u: 'מטר', uk: 'מֶטֶר', better: 'up', f: (s, has) => (light(has) ? r(40 + s * 1.2) : r(s / 6)) },
  fuel: { n: 'חיסכון בדלק', k: 'חִסָּכוֹן בְּדֶלֶק', u: '%', uk: '%', better: 'up', f: (s, has) => Math.max(0, r((s - 40) * 0.45) + (has('sharkskin') ? 6 : 0)) },
  collect: { n: 'מים שנאספים ביום', k: 'מַיִם בְּכָל יוֹם', u: 'ליטר', uk: 'לִיטֶר', better: 'up', f: (s, has) => (has('fogcatch') ? r(4 + s * 0.3) : 0) },
  cool: { n: 'חום בפנים, בצהרי היום', k: 'חֹם בִּפְנִים', u: 'מעלות', uk: 'מַעֲלוֹת', better: 'down', f: (s) => r(48 - s * 0.26) },
  protect: { n: 'גובה שהוא נופל ממנו בלי שבר', k: 'מֵאֵיזֶה גֹּבַהּ הוּא נוֹפֵל', u: 'מטר', uk: 'מֶטֶר', better: 'up', f: (s) => r1(s / 20) },
  dry: { n: 'מים שנכנסים בשעת גשם', k: 'מַיִם שֶׁנִּכְנָסִים', u: 'כוסות', uk: 'כּוֹסוֹת', better: 'down', f: (s) => r((100 - s) / 8) },
  float: { n: 'משקל שהוא מחזיק על המים', k: 'כַּמָּה הוּא מַחֲזִיק עַל הַמַּיִם', u: 'ק״ג', uk: 'ק״ג', better: 'up', f: (s) => r(s * 0.4) },
  grip: { n: 'כמה הוא שוקע בחול', k: 'כַּמָּה הוּא שׁוֹקֵעַ', u: 'ס״מ', uk: 'ס״מ', better: 'down', f: (s) => r((100 - s) * 0.3) },
  steady: { n: 'תזוזה ברוח חזקה', k: 'כַּמָּה הוּא זָז בָּרוּחַ', u: 'ס״מ', uk: 'ס״מ', better: 'down', f: (s) => r((100 - s) * 0.6) },
  quiet: { n: 'רעש ליד הבית', k: 'רַעַשׁ', u: 'דציבל', uk: 'דֶּצִיבֶּל', better: 'down', f: (s) => r(95 - s * 0.6) },
  keepaway: { n: 'לילות בלי ביקור', k: 'לֵילוֹת בְּלִי בִּקּוּר', u: 'מתוך 10', uk: 'מִתּוֹךְ 10', better: 'up', f: (s, has) => (has('buzz') || has('glow') ? Math.min(10, r(s / 9)) : r(s / 40)) },
};
