// מעבדת הרובוטים – chapter 4 (תנאים וחיישנים: the robot looks and decides). Each lesson has a few variants: the same
// map with the items in other places, and the same program must work in all of them, so a fixed list of steps fails
// and the child needs a sensor with "אם" or "עד ש". `wrong` lists programs that must fail (tools/validate-robolab.mjs).
const fw = (n = 1) => Array.from({ length: n }, () => ({ b: 'fwd' }));
const R = { b: 'right' }, L = { b: 'left' };
const IF = (c, then, els = []) => ({ b: 'if', c, then, else: els });
const REP = (n, body) => ({ b: 'repeat', n, body });
const UNTIL = (c, body) => ({ b: 'until', c, body });
const row = (t, xs, y = 1, extra = {}) => xs.map((x) => ({ t, x, y, ...extra }));

export const LESSONS_2 = [
  {
    id: 'l4-1', ch: 4, zone: 'amazon', concept: 'cond',
    title: { f: 'יש פה פרי?', k: 'יֵשׁ פֹּה פְּרִי?' },
    say: [{ f: 'בכל פעם הפירות במקום אחר. הרובוט יבדוק בכל משבצת: אם יש פרי, הוא קוטף. אם אין, ממשיך.', k: 'בְּכָל פַּעַם הַפֵּרוֹת בְּמָקוֹם אַחֵר. הָרוֹבּוֹט יִבְדֹּק בְּכָל מִשְׁבֶּצֶת: אִם יֵשׁ פְּרִי, הוּא קוֹטֵף. אִם אֵין, מַמְשִׁיךְ.' }],
    tools: ['robot'], blocks: ['fwd', 'pick', 'repeat', 'until', 'if'],
    map: { rows: ['########', '#......#', '########'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    variants: [{ items: row('fruit', [3, 5]) }, { items: row('fruit', [2, 4, 6]) }, { items: row('fruit', [6]) }],
    goal: { all: [{ t: 'done', item: 'fruit' }, { t: 'nooops' }] }, par: 4,
    solutions: [{ robot: [REP(5, [{ b: 'fwd' }, IF('fruit', [{ b: 'pick' }])])] }, { robot: [UNTIL('blocked', [{ b: 'fwd' }, IF('fruit', [{ b: 'pick' }])])] }],
    wrong: [{ robot: [REP(5, [{ b: 'fwd' }, { b: 'pick' }])] }, { robot: [...fw(2), { b: 'pick' }, ...fw(2), { b: 'pick' }] }],
  },
  {
    id: 'l4-2', ch: 4, zone: 'desert', concept: 'cond',
    title: { f: 'מי צמא?', k: 'מִי צָמֵא?' },
    say: [{ f: 'במדבר חוסכים מים. משקים רק צמח שצמא, ולא מבזבזים מים על חול.', k: 'בַּמִּדְבָּר חוֹסְכִים מַיִם. מַשְׁקִים רַק צֶמַח שֶׁצָּמֵא, וְלֹא מְבַזְבְּזִים מַיִם עַל חוֹל.' }],
    tools: ['robot'], blocks: ['fwd', 'water', 'repeat', 'if'],
    map: { rows: ['#########', '#sssssss#', '#########'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    variants: [{ items: row('thirsty', [2, 5, 7]) }, { items: row('thirsty', [3, 4]) }, { items: row('thirsty', [6]) }],
    goal: { all: [{ t: 'done', item: 'thirsty' }, { t: 'nooops' }] }, par: 4,
    solutions: [{ robot: [REP(6, [{ b: 'fwd' }, IF('thirsty', [{ b: 'water' }])])] }, { robot: [REP(3, [{ b: 'fwd' }, IF('thirsty', [{ b: 'water' }]), { b: 'fwd' }, IF('thirsty', [{ b: 'water' }])])] }],
    wrong: [{ robot: [REP(6, [{ b: 'fwd' }, { b: 'water' }])] }],
  },
  {
    id: 'l4-3', ch: 4, zone: 'grove', concept: 'cond',
    title: { f: 'עד שמגיעים לגדר', k: 'עַד שֶׁמַּגִּיעִים לַגָּדֵר' },
    say: [{ f: 'הרובוט לא תמיד מתחיל באותו מקום. "חזור עד ש" נוסע שוב ושוב, עד שיש מכשול לפניו.', k: 'הָרוֹבּוֹט לֹא תָּמִיד מַתְחִיל בְּאוֹתוֹ מָקוֹם. "חֲזֹר עַד שֶׁ" נוֹסֵעַ שׁוּב וָשׁוּב, עַד שֶׁיֵּשׁ מִכְשׁוֹל לְפָנָיו.' }],
    tools: ['robot'], blocks: ['fwd', 'right', 'left', 'plant', 'until'],
    map: { rows: ['#########', '#.......#', '#######.#', '#######.#', '#########'] }, home: { x: 1, y: 1 },
    items: [{ t: 'seed', x: 7, y: 3 }],
    variants: [{ tools0: { robot: { x: 1, y: 1, dir: 1 } } }, { tools0: { robot: { x: 3, y: 1, dir: 1 } } }, { tools0: { robot: { x: 5, y: 1, dir: 1 } } }],
    goal: { all: [{ t: 'done', item: 'seeds' }] }, par: 6,
    solutions: [{ robot: [UNTIL('blocked', [{ b: 'fwd' }]), R, UNTIL('blocked', [{ b: 'fwd' }]), { b: 'plant' }] },
      { robot: [UNTIL('blocked', [{ b: 'fwd' }]), R, ...fw(2), { b: 'plant' }] }],
    wrong: [{ robot: [...fw(6), R, ...fw(2), { b: 'plant' }] }],
  },
  {
    id: 'l4-4', ch: 4, zone: 'desert', concept: 'cond',
    title: { f: 'רחפן מחפש אש', k: 'רַחְפָן מְחַפֵּשׂ אֵשׁ' },
    say: [{ f: 'הרחפן עף לאורך הוואדי. אם יש אש לפניו, הוא מתיז מים. אם אין, הוא שומר את המים.', k: 'הָרַחְפָן עָף לְאֹרֶךְ הַוָּאדִי. אִם יֵשׁ אֵשׁ לְפָנָיו, הוּא מַתִּיז מַיִם. אִם אֵין, הוּא שׁוֹמֵר אֶת הַמַּיִם.' }],
    tools: ['drone'], blocks: ['fwd', 'spray', 'repeat', 'if'],
    map: { rows: ['#########', '#sTsssTs#', '#########'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } },
    variants: [{ items: row('fire', [4, 7]) }, { items: row('fire', [3]) }, { items: row('fire', [5, 6]) }],
    goal: { all: [{ t: 'done', item: 'fires' }, { t: 'nooops' }] }, par: 4,
    solutions: [{ drone: [REP(6, [IF('fire', [{ b: 'spray' }]), { b: 'fwd' }])] }, { drone: [REP(6, [{ b: 'fwd' }, IF('fire', [{ b: 'spray' }])])] }],
    wrong: [{ drone: [REP(6, [{ b: 'fwd' }, { b: 'spray' }])] }],
  },
  {
    id: 'l4-5', ch: 4, zone: 'reef', concept: 'cond',
    title: { f: 'רשתות ישנות', k: 'רְשָׁתוֹת יְשָׁנוֹת' },
    say: [{ f: 'רשתות דייגים ישנות נתקעות על האלמוגים. הצוללן עובר בשתי שורות ואוסף רק איפה שיש רשת.', k: 'רִשְׁתוֹת דַּיָּגִים יְשָׁנוֹת נִתְקָעוֹת עַל הָאַלְמֻגִּים. הַצּוֹלְלָן עוֹבֵר בִּשְׁתֵּי שׁוּרוֹת וְאוֹסֵף רַק אֵיפֹה שֶׁיֵּשׁ רֶשֶׁת.' }],
    tools: ['sub'], blocks: ['fwd', 'right', 'left', 'collect', 'repeat', 'if'],
    map: { rows: ['########', '#~~~~~~#', '#~~~~~~#', '########'] }, home: { x: 1, y: 1 }, tools0: { sub: { x: 1, y: 1, dir: 1 } },
    variants: [{ items: [...row('net', [3, 6], 1), ...row('net', [2], 2)] }, { items: [...row('net', [4], 1), ...row('net', [5, 3], 2)] }, { items: [...row('net', [2, 5], 1), ...row('net', [6, 1], 2)] }],
    goal: { all: [{ t: 'done', item: 'nets' }, { t: 'nooops' }] }, par: 13,
    solutions: [{ sub: [REP(5, [{ b: 'fwd' }, IF('net', [{ b: 'collect' }])]), R, { b: 'fwd' }, IF('net', [{ b: 'collect' }]), R, REP(5, [{ b: 'fwd' }, IF('net', [{ b: 'collect' }])])] },
      { sub: [REP(5, [{ b: 'fwd' }, IF('net', [{ b: 'collect' }])]), R, { b: 'fwd' }, R, IF('net', [{ b: 'collect' }]), REP(5, [{ b: 'fwd' }, IF('net', [{ b: 'collect' }])])] }],
    wrong: [{ sub: [REP(5, [{ b: 'fwd' }, { b: 'collect' }]), R, { b: 'fwd' }, { b: 'collect' }, R, REP(5, [{ b: 'fwd' }, { b: 'collect' }])] }],
  },
  {
    id: 'l4-6', ch: 4, zone: 'amazon', concept: 'cond',
    title: { f: 'אם כן, ואם לא', k: 'אִם כֵּן, וְאִם לֹא' },
    say: [{ f: 'בכל משבצת יש או מקום שתילה או שתיל צמא. "אם" שותל, ו"אם לא" משקה.', k: 'בְּכָל מִשְׁבֶּצֶת יֵשׁ אוֹ מְקוֹם שְׁתִילָה אוֹ שָׁתִיל צָמֵא. "אִם" שׁוֹתֵל, וְ"אִם לֹא" מַשְׁקֶה.' }],
    tools: ['robot'], blocks: ['fwd', 'plant', 'water', 'repeat', 'if'],
    map: { rows: ['#######', '#.....#', '#######'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: [...row('seed', [2, 4]), ...row('thirsty', [3, 5])] },
      { items: [...row('seed', [3]), ...row('thirsty', [2, 4, 5])] },
      { items: [...row('seed', [2, 3, 5]), ...row('thirsty', [4])] },
    ],
    goal: { all: [{ t: 'done', item: 'seeds' }, { t: 'done', item: 'thirsty' }, { t: 'nooops' }] }, par: 5,
    solutions: [{ robot: [REP(4, [{ b: 'fwd' }, IF('spot', [{ b: 'plant' }], [{ b: 'water' }])])] }, { robot: [REP(4, [{ b: 'fwd' }, IF('thirsty', [{ b: 'water' }], [{ b: 'plant' }])])] }],
    wrong: [{ robot: [REP(4, [{ b: 'fwd' }, { b: 'plant' }, { b: 'water' }])] }],
  },
];
