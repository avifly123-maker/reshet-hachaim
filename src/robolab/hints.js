// Hints in the robot lab's lessons (Avi, 7.11: "a hint button and hints in Kubi's programming lessons").
// Three hints for every level, made from the level's own data, so every lesson, puzzle and workshop mission has them
// without a line written by hand for each:
//   1. the idea: what this kind of lesson asks for (by its concept) and how to look at the field
//   2. the start: the first part of the shortest program that works (its blocks as small chips), loops and
//      conditions shown closed ("…")
//   3. more of the way: about two thirds of it, open, with the event handlers and "my blocks" it needs
// The way comes from L.solutions (lessons and puzzles: every one is checked by tools/validate-robolab.mjs) or from
// L.ways (workshop missions: their planner's ways). The sandbox has no hints (there is nothing to solve).
// Pure: words and HTML only; index.js shows them in the stage's hint box. Checked by tests/robolab/hints.mjs.
import { BLOCKS, SENSORS, SIGNALS } from './engine/blocks.js';
import { icon } from './ui/icons.js';

const W = (kids, f, k) => (kids ? k : f);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// hint 1 by the lesson's concept (the same words for every lesson of that kind)
const IDEA = {
  step: { f: 'ספרו כמה משבצות יש עד הזרע. כל "קדימה" הוא משבצת אחת.', k: 'סִפְרוּ כַּמָּה מִשְׁבָּצוֹת יֵשׁ עַד הַזֶּרַע. כָּל "קָדִימָה" הוּא מִשְׁבֶּצֶת אַחַת.' },
  turn: { f: 'דמיינו שאתם הרובוט. לאן החץ שלו מצביע? ימינה שלו זה לא תמיד ימינה שלכם.', k: 'דַּמְיְנוּ שֶׁאַתֶּם הָרוֹבּוֹט. לְאָן הַחֵץ שֶׁלּוֹ מַצְבִּיעַ? יָמִינָה שֶׁלּוֹ זֶה לֹא תָּמִיד יָמִינָה שֶׁלָּכֶם.' },
  path: { f: 'עברו עם האצבע על המסך, משבצת אחרי משבצת, בדרך שעוקפת את המכשול. כל צעד הוא בלוק.', k: 'עִבְרוּ עִם הָאֶצְבַּע עַל הַמָּסָךְ, מִשְׁבֶּצֶת אַחֲרֵי מִשְׁבֶּצֶת. כָּל צַעַד הוּא בְּלוֹק.' },
  order: { f: 'מה צריך לקרות קודם? סדרו את הפעולות לפי הדרך: מה שפוגשים ראשון, עושים ראשון.', k: 'מָה צָרִיךְ לִקְרוֹת קֹדֶם? מָה שֶׁפּוֹגְשִׁים רִאשׁוֹן, עוֹשִׂים רִאשׁוֹן.' },
  sub: { f: 'הצוללן שוחה רק במים. חפשו את שביל המים בין הסלעים.', k: 'הַצּוֹלְלָן שׂוֹחֶה רַק בַּמַּיִם. חַפְּשׂוּ אֶת שְׁבִיל הַמַּיִם.' },
  drone: { f: 'הרחפן עף מעל הכול, אבל הסוללה קטנה. חפשו את הדרך הקצרה ביותר.', k: 'הָרַחְפָן עָף מֵעַל הַכֹּל. חַפְּשׂוּ אֶת הַדֶּרֶךְ הַקְּצָרָה.' },
  loop: { f: 'מה חוזר על עצמו? מצאו את החלק שקורה שוב ושוב, ושימו אותו פעם אחת בתוך "חזור".', k: 'מָה חוֹזֵר עַל עַצְמוֹ? שִׂימוּ אֶת זֶה פַּעַם אַחַת בְּתוֹךְ "חֲזֹר".' },
  nested: { f: 'יש חזרה בתוך חזרה: שורה שחוזרת, ובתוכה צעד שחוזר. התחילו מהחזרה הקטנה.', k: 'יֵשׁ חֲזָרָה בְּתוֹךְ חֲזָרָה. הַתְחִילוּ מֵהַחֲזָרָה הַקְּטַנָּה.' },
  function: { f: 'יש חלק שקורה כמה פעמים במקומות שונים. בנו אותו פעם אחת ב"הבלוק שלי", והשתמשו בו בכל מקום.', k: 'יֵשׁ חֵלֶק שֶׁקּוֹרֶה כַּמָּה פְּעָמִים. בְּנוּ אוֹתוֹ פַּעַם אַחַת בְּ"הַבְּלוֹק שֶׁלִּי".' },
  cond: { f: 'הרובוט לא יודע מראש מה יש בכל משבצת. "אם" נותן לו לבדוק ולהחליט לבד בכל צעד.', k: 'הָרוֹבּוֹט לֹא יוֹדֵעַ מָה יֵשׁ בְּכָל מִשְׁבֶּצֶת. "אִם" נוֹתֵן לוֹ לִבְדֹּק וּלְהַחְלִיט.' },
  event: { f: 'מה צריך לקרות כשהאירוע מגיע? כתבו את זה מתחת לבלוק האירוע, בנפרד מהתוכנית הרגילה.', k: 'מָה קוֹרֶה כְּשֶׁהָאֵרוּעַ מַגִּיעַ? כִּתְבוּ אֶת זֶה מִתַּחַת לִבְלוֹק הָאֵרוּעַ.' },
  counter: { f: 'בכל פעם שהרובוט מוצא משהו, הוא מוסיף אחד למונה. בסוף הדרך הוא מדווח.', k: 'כָּל פַּעַם שֶׁהָרוֹבּוֹט מוֹצֵא מַשֶּׁהוּ, הוּא מוֹסִיף אֶחָד. בַּסּוֹף הוּא מְדַוֵּחַ.' },
  team: { f: 'לכל כלי יש תוכנית משלו. מי מתחיל? מי מחכה למי? אות עוזר להם לתאם.', k: 'לְכָל כְּלִי יֵשׁ תָּכְנִית מִשֶּׁלּוֹ. מִי מַתְחִיל? מִי מְחַכֶּה?' },
  puzzle: { f: 'התוכנית כמעט נכונה. הפעילו אותה לאט, ותראו באיזה בלוק הרובוט מתחיל לטעות.', k: 'הַתָּכְנִית כִּמְעַט נְכוֹנָה. הַפְעִילוּ לְאַט, וְתִרְאוּ אֵיפֹה הוּא טוֹעֶה.' },
  mission: { f: 'לפני התוכנית, בדקו את הרובוט: האם יש לו את החלק שהמשימה צריכה? אחר כך תכננו את הדרך.', k: 'קֹדֶם בִּדְקוּ אֶת הָרוֹבּוֹט: יֵשׁ לוֹ אֶת הַחֵלֶק הַנָּכוֹן?' },
};
const IDEA_ANY = { f: 'הסתכלו על המטרה למעלה, ועברו עם האצבע על הדרך של הרובוט במסך, צעד אחרי צעד.', k: 'הִסְתַּכְּלוּ עַל הַמַּטָּרָה, וְעִבְרוּ עִם הָאֶצְבַּע עַל הַדֶּרֶךְ, צַעַד אַחֲרֵי צַעַד.' };
const LOOK = { f: 'אפשר להפעיל "לאט" ולראות איפה זה נתקע.', k: 'אֶפְשָׁר לְהַפְעִיל "לְאַט" וְלִרְאוֹת אֵיפֹה זֶה נִתְקָע.' };
const TOOL = { robot: { f: 'רובוט', k: 'רוֹבּוֹט' }, drone: { f: 'רחפן', k: 'רַחְפָן' }, sub: { f: 'צוללן', k: 'צוֹלְלָן' } };

// the ways that work for this level, shortest first (blocks counted the way the editor counts them)
const count = (xs) => (xs || []).reduce((n, nd) => n + 1 + count(nd.body) + count(nd.then) + count(nd.else), 0);
const size = (p) => ['robot', 'drone', 'sub'].reduce((n, k) => n + count(p[k]), 0) + (p.on || []).reduce((n, h) => n + 1 + count(h.body), 0)
  + Object.values(p.defs || {}).reduce((n, d) => n + count(d), 0);
export function waysOf(L) {
  const list = (L.solutions || (L.ways || []).map((w) => w.prog) || []).filter(Boolean);
  return list.slice().sort((a, b) => size(a) - size(b));
}

// one block as a chip; control blocks show their body, or "…" when closed
function chip(nd, kids, open) {
  const B = BLOCKS[nd.b]; if (!B) return '';
  const pic = B.emo ? `<i>${B.emo}</i>` : `<i class="ic">${icon(B.icon)}</i>`;
  let word = W(kids, B.f, B.k);
  if (nd.b === 'repeat') word += ` ${nd.n || ''} ${W(kids, 'פעמים', 'פְּעָמִים')}`;
  if ((nd.b === 'if' || nd.b === 'until') && SENSORS[nd.c]) word += (nd.b === 'until' ? '' : ' ') + W(kids, SENSORS[nd.c].f, SENSORS[nd.c].k);
  if (nd.m && SIGNALS[nd.m]) word += ' · ' + W(kids, SIGNALS[nd.m].f, SIGNALS[nd.m].k);
  const head = `<span class="rh-b f-${B.fam}">${pic}${esc(word)}</span>`;
  const inner = (xs) => (open ? row(xs, kids, true) : '<span class="rh-more">…</span>');
  if (nd.body) return `<span class="rh-grp">${head}<span class="rh-in">${inner(nd.body)}</span></span>`;
  if (nd.then) return `<span class="rh-grp">${head}<span class="rh-in">${inner(nd.then)}</span>${nd.else && nd.else.length ? `<span class="rh-else">${W(kids, 'אחרת', 'אַחֶרֶת')}</span><span class="rh-in">${inner(nd.else)}</span>` : ''}</span>`;
  return head;
}
const row = (xs, kids, open) => (xs || []).map((nd) => chip(nd, kids, open)).join('');

// the first part of a list: n = how many top blocks; a single loop opens and shows part of its body instead
function part(xs, share, kids, open) {
  if (!xs || !xs.length) return '';
  if (xs.length === 1 && xs[0].body && open) {
    const nd = xs[0], inner = nd.body.slice(0, Math.max(1, Math.ceil(nd.body.length * share)));
    return chip({ ...nd, body: inner }, kids, true) + (inner.length < nd.body.length ? '<span class="rh-more">…</span>' : '');
  }
  const n = Math.max(1, Math.ceil(xs.length * share));
  return row(xs.slice(0, n), kids, open) + (n < xs.length ? '<span class="rh-more">…</span>' : '');
}

function wayHTML(p, share, open, kids) {
  const tools = ['robot', 'drone', 'sub'].filter((k) => p[k] && p[k].length);
  const multi = tools.length > 1 || (p.on || []).length;
  let h = '';
  for (const [name, body] of Object.entries(p.defs || {})) {
    if (!open) continue;
    h += `<div class="rh-row"><b>🧩 ${esc(W(kids, 'הבלוק שלי', 'הַבְּלוֹק שֶׁלִּי'))} "${esc(name)}"</b>${row(body, kids, true)}</div>`;
  }
  for (const k of tools) h += `<div class="rh-row">${multi ? `<b>${icon(k)} ${esc(W(kids, TOOL[k].f, TOOL[k].k))}</b>` : ''}${part(p[k], share, kids, open)}</div>`;
  if (open) for (const ev of p.on || []) {
    const hat = Object.keys(BLOCKS).find((b) => BLOCKS[b].kind === 'hat' && BLOCKS[b].ev === ev.ev);
    if (!hat) continue;
    const B = BLOCKS[hat];
    h += `<div class="rh-row"><b>${B.emo || ''} ${esc(W(kids, B.f, B.k))}${ev.m && SIGNALS[ev.m] ? ' · ' + esc(W(kids, SIGNALS[ev.m].f, SIGNALS[ev.m].k)) : ''}</b>${part(ev.body, share, kids, true)}</div>`;
  }
  return h;
}

// the three hints of a level: [{ title, html }]; empty for the sandbox or a level without a known way
export function hintsFor(L, kids) {
  if (!L || L.sandbox) return [];
  const idea = IDEA[L.concept] || IDEA_ANY;
  const out = [{ title: W(kids, 'רמז 1: הרעיון', 'רֶמֶז 1: הָרַעְיוֹן'), html: `<p>${esc(W(kids, idea.f, idea.k))}</p><p class="rh-sub">${esc(W(kids, LOOK.f, LOOK.k))}</p>` }];
  const best = waysOf(L)[0];
  if (!best) return out;
  out.push({ title: W(kids, 'רמז 2: ככה מתחילים', 'רֶמֶז 2: כָּכָה מַתְחִילִים'), html: `<p>${esc(W(kids, 'התחילו כך, ואת השאר נסו לבד:', 'הַתְחִילוּ כָּךְ, וְאֶת הַשְּׁאָר נַסּוּ לְבַד:'))}</p>${wayHTML(best, 1 / 3, false, kids)}` });
  const most = wayHTML(best, 2 / 3, true, kids), cut = most.includes('rh-more');   // a short way may show whole
  out.push({ title: W(kids, 'רמז 3: רוב הדרך', 'רֶמֶז 3: רֹב הַדֶּרֶךְ'),
    html: `<p>${esc(cut ? W(kids, 'זה רוב הדרך. מה חסר בסוף?', 'זֶה רֹב הַדֶּרֶךְ. מָה חָסֵר בַּסּוֹף?') : W(kids, 'ככה זה עובד. בנו את זה בעצמכם, הפעילו, ונסו להבין למה זה מצליח.', 'כָּכָה זֶה עוֹבֵד. בְּנוּ לְבַד, הַפְעִילוּ, וְנַסּוּ לְהָבִין לָמָּה.'))}</p>${most}` });
  return out;
}

// ── a short written explanation the first time a child meets a concept (Avi, 7.11: "a few explanations the first time
// you meet a concept, like a loop inside a loop; in writing, no voice"). index.js shows it once per player (seen
// 'cx:<concept>') in the same box as the hints, with a small example made of the game's own block chips.
const N = (b, x = {}) => ({ b, ...x });
export const CONCEPT_CARD = {
  step: { t: { f: 'מושג חדש: פקודות לפי הסדר', k: 'מֻשָּׂג חָדָשׁ: פְּקֻדּוֹת לְפִי הַסֵּדֶר' },
    f: 'כל בלוק הוא פקודה אחת. הרובוט עושה אותן אחת אחרי השנייה, מלמעלה למטה, בדיוק כמו שכתוב.',
    k: 'כָּל בְּלוֹק הוּא פְּקֻדָּה אַחַת. הָרוֹבּוֹט עוֹשֶׂה אוֹתָן אַחַת אַחֲרֵי הַשְּׁנִיָּה, מִלְמַעְלָה לְמַטָּה.',
    ex: [N('fwd'), N('fwd'), N('plant')] },
  turn: { t: { f: 'מושג חדש: פנייה', k: 'מֻשָּׂג חָדָשׁ: פְּנִיָּה' },
    f: '"פנה ימינה" לא מזיז את הרובוט ממקומו. הוא רק מסתובב במקום, ו"קדימה" שאחריו לוקח אותו לכיוון החדש.',
    k: '"פְּנֵה יָמִינָה" לֹא מַזִּיז אֶת הָרוֹבּוֹט. הוּא רַק מִסְתּוֹבֵב, וְ"קָדִימָה" לוֹקֵחַ אוֹתוֹ לַכִּוּוּן הֶחָדָשׁ.',
    ex: [N('right'), N('fwd')] },
  path: { t: { f: 'מושג חדש: מסלול', k: 'מֻשָּׂג חָדָשׁ: מַסְלוּל' },
    f: 'מסלול הוא כל הצעדים מההתחלה עד המטרה. כשיש מכשול בדרך עוקפים אותו: פונים, מתקדמים, ופונים בחזרה.',
    k: 'מַסְלוּל הוּא כָּל הַצְּעָדִים עַד הַמַּטָּרָה. כְּשֶׁיֵּשׁ מִכְשׁוֹל, עוֹקְפִים אוֹתוֹ.',
    ex: [N('left'), N('fwd'), N('right')] },
  order: { t: { f: 'מושג חדש: קודם ואחר כך', k: 'מֻשָּׂג חָדָשׁ: קֹדֶם וְאַחַר כָּךְ' },
    f: 'הסדר חשוב. אותם בלוקים בסדר אחר עושים משהו אחר לגמרי. מה שהרובוט פוגש ראשון, הוא עושה ראשון.',
    k: 'הַסֵּדֶר חָשׁוּב. אוֹתָם בְּלוֹקִים בְּסֵדֶר אַחֵר עוֹשִׂים מַשֶּׁהוּ אַחֵר.',
    ex: [N('water'), N('fwd'), N('plant')] },
  sub: { t: { f: 'מושג חדש: הרובוט הצוללן', k: 'מֻשָּׂג חָדָשׁ: הָרוֹבּוֹט הַצּוֹלְלָן' },
    f: 'הצוללן הוא רובוט של מים. הוא עובר רק במשבצות של מים, וסלע עוצר אותו.',
    k: 'הַצּוֹלְלָן הוּא רוֹבּוֹט שֶׁל מַיִם. הוּא עוֹבֵר רַק בַּמַּיִם.' },
  drone: { t: { f: 'מושג חדש: הרחפן', k: 'מֻשָּׂג חָדָשׁ: הָרַחְפָן' },
    f: 'הרחפן עף מעל עצים וסלעים. כל צעד מוריד קצת מהסוללה, ולכן חשוב לחזור הביתה לפני שהיא נגמרת.',
    k: 'הָרַחְפָן עָף מֵעַל עֵצִים וּסְלָעִים. כָּל צַעַד מוֹרִיד קְצָת מֵהַסּוֹלְלָה.',
    ex: [N('fwd'), N('spray'), N('back')] },
  loop: { t: { f: 'מושג חדש: לולאה', k: 'מֻשָּׂג חָדָשׁ: לוּלָאָה' },
    f: 'לולאה היא הבלוק "חזור". שמים בתוכו כמה בלוקים, והרובוט עושה אותם שוב ושוב, כמה פעמים שכתוב. במקום לכתוב "קדימה, שתול" ארבע פעמים, כותבים את זה פעם אחת בתוך "חזור 4".',
    k: 'לוּלָאָה הִיא הַבְּלוֹק "חֲזֹר". שָׂמִים בְּתוֹכוֹ בְּלוֹקִים, וְהָרוֹבּוֹט עוֹשֶׂה אוֹתָם שׁוּב וָשׁוּב.',
    ex: [N('repeat', { n: 4, body: [N('fwd'), N('plant')] })] },
  nested: { t: { f: 'מושג חדש: לולאה בתוך לולאה', k: 'מֻשָּׂג חָדָשׁ: לוּלָאָה בְּתוֹךְ לוּלָאָה' },
    f: 'אפשר לשים "חזור" בתוך "חזור". בכל סיבוב של הלולאה החיצונית, הלולאה הפנימית רצה מההתחלה עד הסוף. בדוגמה: 3 צעדים ופנייה, וכל זה פעמיים. בסך הכול 6 צעדים ושתי פניות.',
    k: 'אֶפְשָׁר לָשִׂים "חֲזֹר" בְּתוֹךְ "חֲזֹר". בְּכָל סִבּוּב שֶׁל הַחִיצוֹנִית, הַפְּנִימִית רָצָה עַד הַסּוֹף.',
    ex: [N('repeat', { n: 2, body: [N('repeat', { n: 3, body: [N('fwd')] }), N('right')] })] },
  function: { t: { f: 'מושג חדש: הבלוק שלי', k: 'מֻשָּׂג חָדָשׁ: הַבְּלוֹק שֶׁלִּי' },
    f: '"הבלוק שלי" הוא בלוק שאתם בונים בעצמכם מכמה בלוקים. בונים אותו פעם אחת, ואז משתמשים בו כמו בכל בלוק אחר, כמה פעמים שרוצים.',
    k: '"הַבְּלוֹק שֶׁלִּי" הוּא בְּלוֹק שֶׁאַתֶּם בּוֹנִים לְבַד. בּוֹנִים פַּעַם אַחַת, וּמִשְׁתַּמְּשִׁים הַרְבֵּה פְּעָמִים.',
    ex: [N('call', { f: 'row' }), N('right'), N('call', { f: 'row' })] },
  cond: { t: { f: 'מושג חדש: תנאי', k: 'מֻשָּׂג חָדָשׁ: תְּנַאי' },
    f: '"אם" בודק משהו ברגע הזה, למשל אם יש פרי לפני הרובוט. אם כן, הוא עושה את מה שבתוכו. אם לא, הוא מדלג הלאה (או עושה את מה שב"אחרת").',
    k: '"אִם" בּוֹדֵק מַשֶּׁהוּ. אִם כֵּן, הָרוֹבּוֹט עוֹשֶׂה אֶת מָה שֶׁבְּתוֹכוֹ. אִם לֹא, הוּא מְדַלֵּג.',
    ex: [N('fwd'), N('if', { c: 'fruit', then: [N('pick')], else: [] })] },
  event: { t: { f: 'מושג חדש: אירוע', k: 'מֻשָּׂג חָדָשׁ: אֵרוּעַ' },
    f: 'אירוע הוא משהו שקורה באמצע הריצה, כמו שקיעה. מתחת לבלוק האירוע כותבים מה לעשות כשזה קורה. ברגע האירוע הרובוט עוזב את התוכנית הרגילה ועושה את מה שמתחת לאירוע.',
    k: 'אֵרוּעַ קוֹרֶה בְּאֶמְצַע הָרִיצָה, כְּמוֹ שְׁקִיעָה. מִתַּחַת לַבְּלוֹק כּוֹתְבִים מָה לַעֲשׂוֹת אָז.' },
  counter: { t: { f: 'מושג חדש: מונה', k: 'מֻשָּׂג חָדָשׁ: מוֹנֶה' },
    f: 'מונה הוא מספר שהרובוט זוכר. "הוסף אחד למונה" מגדיל אותו באחד, ו"דווח" אומר בסוף כמה ספר.',
    k: 'מוֹנֶה הוּא מִסְפָּר שֶׁהָרוֹבּוֹט זוֹכֵר. "הוֹסֵף אֶחָד" מַגְדִּיל אוֹתוֹ, וְ"דַּוֵּחַ" אוֹמֵר כַּמָּה.',
    ex: [N('fwd'), N('add'), N('report')] },
  team: { t: { f: 'מושג חדש: עבודת צוות', k: 'מֻשָּׂג חָדָשׁ: עֲבוֹדַת צֶוֶת' },
    f: 'כמה כלים עובדים יחד. לכל אחד יש תוכנית משלו, וכולם רצים באותו זמן. "שלח אות" ו"חכה לאות" עוזרים להם לחכות אחד לשני.',
    k: 'כַּמָּה כֵּלִים עוֹבְדִים יַחַד. לְכָל אֶחָד תָּכְנִית מִשֶּׁלּוֹ, וְכֻלָּם רָצִים בְּיַחַד.',
    ex: [N('send', { m: 'a' }), N('waitmsg', { m: 'a' })] },
  puzzle: { t: { f: 'מושג חדש: חידה', k: 'מֻשָּׂג חָדָשׁ: חִידָה' },
    f: 'בחידה יש כבר תוכנית, אבל יש בה טעות. מוצאים את הבלוק הלא נכון ומתקנים רק אותו, בלי לבנות הכול מחדש.',
    k: 'בַּחִידָה יֵשׁ תָּכְנִית עִם טָעוּת. מוֹצְאִים אֶת הַבְּלוֹק הַלֹּא נָכוֹן וּמְתַקְּנִים.' },
  mission: { t: { f: 'מושג חדש: משימה בסדנה', k: 'מֻשָּׂג חָדָשׁ: מְשִׂימָה בַּסַּדְנָה' },
    f: 'במשימה הרובוט שבניתם יוצא לעבוד. גם החלקים שלו חשובים, לא רק התוכנית: בלי מזלג אי אפשר להרים בול עץ, ועם גלגלים צרים שוקעים בבוץ.',
    k: 'בַּמְּשִׂימָה הָרוֹבּוֹט שֶׁבְּנִיתֶם יוֹצֵא לַעֲבֹד. גַּם הַחֲלָקִים שֶׁלּוֹ חֲשׁוּבִים.' },
};
export function conceptHTML(c, kids) {
  const C = CONCEPT_CARD[c]; if (!C) return null;
  return { title: W(kids, C.t.f, C.t.k), html: `<p>${esc(W(kids, C.f, C.k))}</p>${C.ex ? `<div class="rh-row rh-ex"><b>${esc(W(kids, 'לדוגמה', 'לְדֻגְמָה'))}</b>${row(C.ex, kids, true)}</div>` : ''}` };
}
