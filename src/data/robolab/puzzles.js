// מעבדת הרובוטים – puzzles (חידות): playful challenges next to the lessons (Avi, 29.10: not a course only). Each opens
// after a lesson (`after`). Kinds: a broken program to fix (start0: it fails as given), few blocks (maxBlocks), a
// celebration that must happen (goal 'fun'). Badges for solving them (src/robolab/badges.js).
const fw = (n = 1) => Array.from({ length: n }, () => ({ b: 'fwd' }));
const R = { b: 'right' }, L = { b: 'left' };
const REP = (n, body) => ({ b: 'repeat', n, body });
const IF = (c, then, els = []) => ({ b: 'if', c, then, else: els });
const row = (t, xs, y = 1, extra = {}) => xs.map((x) => ({ t, x, y, ...extra }));

export const PUZZLES = [
  {
    id: 'p1', puzzle: true, after: 'l1-3', zone: 'grove', concept: 'puzzle',
    title: { f: 'הרובוט המבולבל', k: 'הָרוֹבּוֹט הַמְּבֻלְבָּל' },
    say: [{ f: 'מישהו כתב לרובוט תוכנית, אבל הוא פנה לצד הלא נכון. מצאו את הבלוק השגוי ותקנו.', k: 'מִישֶׁהוּ כָּתַב לָרוֹבּוֹט תָּכְנִית, אֲבָל הוּא פָּנָה לַצַּד הַלֹּא נָכוֹן. מִצְאוּ אֶת הַבְּלוֹק הַשָּׁגוּי וְתַקְּנוּ.' }],
    tools: ['robot'], blocks: ['fwd', 'right', 'left', 'plant'],
    map: { rows: ['######', '#...T#', '#T#..#', '#T#..#', '######'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    items: [{ t: 'seed', x: 3, y: 3 }],
    start0: { robot: [...fw(2), L, ...fw(2), { b: 'plant' }] },
    goal: { all: [{ t: 'done', item: 'seeds' }] }, par: 6,
    solutions: [{ robot: [...fw(2), R, ...fw(2), { b: 'plant' }] }, { robot: [...fw(2), L, L, L, ...fw(2), { b: 'plant' }] }],
  },
  {
    id: 'p2', puzzle: true, after: 'l1-6', zone: 'grove', concept: 'puzzle',
    title: { f: 'מסיבה בכל שתיל', k: 'מְסִבָּה בְּכָל שָׁתִיל' },
    say: [{ f: 'הרובוט שמח כל כך כשהוא שותל, שאחרי כל שתיל הוא רוקד. שלושה שתילים, שלושה ריקודים!', k: 'הָרוֹבּוֹט שָׂמֵחַ כָּל כָּךְ כְּשֶׁהוּא שׁוֹתֵל, שֶׁאַחֲרֵי כָּל שָׁתִיל הוּא רוֹקֵד. שְׁלוֹשָׁה שְׁתִילִים, שְׁלוֹשָׁה רִקּוּדִים!' }],
    tools: ['robot'], blocks: ['fwd', 'plant', 'dance', 'fireworks', 'beep'],
    map: { rows: ['########', '#......#', '########'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    items: row('seed', [2, 4, 6]),
    goal: { all: [{ t: 'done', item: 'seeds' }, { t: 'fun', n: 3 }] }, par: 11,
    solutions: [{ robot: [{ b: 'fwd' }, { b: 'plant' }, { b: 'dance' }, ...fw(2), { b: 'plant' }, { b: 'dance' }, ...fw(2), { b: 'plant' }, { b: 'dance' }] },
      { robot: [{ b: 'fwd' }, { b: 'plant' }, { b: 'beep' }, ...fw(2), { b: 'plant' }, { b: 'fireworks' }, ...fw(2), { b: 'plant' }, { b: 'dance' }] }],
    wrong: [{ robot: [{ b: 'fwd' }, { b: 'plant' }, ...fw(2), { b: 'plant' }, ...fw(2), { b: 'plant' }] }],
  },
  {
    id: 'p3', puzzle: true, after: 'l2-3', zone: 'amazon', concept: 'puzzle',
    title: { f: 'ארבעה בלוקים בלבד', k: 'אַרְבָּעָה בְּלוֹקִים בִּלְבַד' },
    say: [{ f: 'שמונה זרעים בשורה, ומותר להשתמש רק בארבעה בלוקים. איך זה אפשרי?', k: 'שְׁמוֹנָה זְרָעִים בְּשׁוּרָה, וּמֻתָּר לְהִשְׁתַּמֵּשׁ רַק בְּאַרְבָּעָה בְּלוֹקִים. אֵיךְ זֶה אֶפְשָׁרִי?' }],
    tools: ['robot'], blocks: ['fwd', 'plant', 'repeat'],
    map: { rows: ['###########', '#.........#', '###########'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    items: row('seed', [2, 3, 4, 5, 6, 7, 8, 9]), maxBlocks: 4,
    goal: { all: [{ t: 'done', item: 'seeds' }] }, par: 3,
    solutions: [{ robot: [REP(8, [{ b: 'fwd' }, { b: 'plant' }])] }, { robot: [REP(2, [REP(4, [{ b: 'fwd' }, { b: 'plant' }])])] }],
    wrong: [{ robot: [...fw(1), { b: 'plant' }, ...fw(1), { b: 'plant' }, ...fw(1), { b: 'plant' }] }],
  },
  {
    id: 'p4', puzzle: true, after: 'l2-6', zone: 'desert', concept: 'puzzle',
    title: { f: 'שני באגים', k: 'שְׁנֵי בָּאגִים' },
    say: [{ f: 'בתוכנית הזאת יש שתי טעויות: הלולאה חוזרת מספר לא נכון של פעמים, ובתוכה יש בלוק לא נכון. מצאו את שתיהן.', k: 'בַּתָּכְנִית הַזֹּאת יֵשׁ שְׁתֵּי טָעֻיּוֹת: הַלּוּלָאָה חוֹזֶרֶת מִסְפָּר לֹא נָכוֹן שֶׁל פְּעָמִים, וּבְתוֹכָהּ יֵשׁ בְּלוֹק לֹא נָכוֹן. מִצְאוּ אֶת שְׁתֵּיהֶן.' }],
    tools: ['robot'], blocks: ['fwd', 'water', 'plant', 'repeat'],
    map: { rows: ['########', '#ssssss#', '########'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    items: row('thirsty', [2, 3, 4, 5, 6]),
    start0: { robot: [REP(4, [{ b: 'fwd' }, { b: 'plant' }])] },
    goal: { all: [{ t: 'done', item: 'thirsty' }, { t: 'nooops' }] }, par: 3,
    solutions: [{ robot: [REP(5, [{ b: 'fwd' }, { b: 'water' }])] }, { robot: [REP(4, [{ b: 'fwd' }, { b: 'water' }]), { b: 'fwd' }, { b: 'water' }] }],
  },
  {
    id: 'p5', puzzle: true, after: 'l4-2', zone: 'reef', concept: 'puzzle',
    title: { f: 'צלילה בערפל', k: 'צְלִילָה בָּעֲרָפֶל' },
    say: [{ f: 'המים עכורים, והאלמוגים הצעירים מחכים כל פעם במקום אחר. תוכנית אחת צריכה לשתול את כולם, בכל צלילה.', k: 'הַמַּיִם עֲכוּרִים, וְהָאַלְמֻגִּים הַצְּעִירִים מְחַכִּים כָּל פַּעַם בְּמָקוֹם אַחֵר. תָּכְנִית אַחַת צְרִיכָה לִשְׁתֹּל אֶת כֻּלָּם, בְּכָל צְלִילָה.' }],
    tools: ['sub'], blocks: ['fwd', 'right', 'coral', 'repeat', 'until', 'if'],
    map: { rows: ['#######', '#~~~~~#', '#~~~~~#', '#######'] }, home: { x: 1, y: 1 }, tools0: { sub: { x: 1, y: 1, dir: 1 } },
    variants: [{ items: [...row('coral', [3], 1), ...row('coral', [2, 5], 2)] }, { items: [...row('coral', [2, 5], 1), ...row('coral', [4], 2)] }],
    goal: { all: [{ t: 'done', item: 'corals' }, { t: 'nooops' }] }, par: 13,
    solutions: [{ sub: [REP(4, [{ b: 'fwd' }, IF('coralspot', [{ b: 'coral' }])]), R, { b: 'fwd' }, IF('coralspot', [{ b: 'coral' }]), R, REP(4, [{ b: 'fwd' }, IF('coralspot', [{ b: 'coral' }])])] },
      { sub: [{ b: 'until', c: 'blocked', body: [{ b: 'fwd' }, IF('coralspot', [{ b: 'coral' }])] }, R, { b: 'fwd' }, IF('coralspot', [{ b: 'coral' }]), R, { b: 'until', c: 'blocked', body: [{ b: 'fwd' }, IF('coralspot', [{ b: 'coral' }])] }] }],
    wrong: [{ sub: [REP(4, [{ b: 'fwd' }, { b: 'coral' }]), R, { b: 'fwd' }, { b: 'coral' }, R, REP(4, [{ b: 'fwd' }, { b: 'coral' }])] }],
  },
];
