// מעבדת הרובוטים – chapter 8 (אתגרים): the same kind of jobs, now with few blocks (maxBlocks) and everything learned
// together: loops, a block of mine, sensors, counting and two tools.
const fw = (n = 1) => Array.from({ length: n }, () => ({ b: 'fwd' }));
const R = { b: 'right' }, L = { b: 'left' };
const REP = (n, body) => ({ b: 'repeat', n, body });
const IF = (c, then, els = []) => ({ b: 'if', c, then, else: els });
const UNTIL = (c, body) => ({ b: 'until', c, body });
const row = (t, xs, y = 1, extra = {}) => xs.map((x) => ({ t, x, y, ...extra }));

export const LESSONS_6 = [
  {
    id: 'l8-1', ch: 8, zone: 'grove', concept: 'puzzle',
    title: { f: 'חורשה בשלושה עשר בלוקים', k: 'חֻרְשָׁה בִּשְׁלוֹשָׁה עָשָׂר בְּלוֹקִים' },
    say: [{ f: 'שלוש שורות של מקומות שתילה, ולכל היותר שלושה עשר בלוקים. בלוק משלכם לשורה אחת יעזור.', k: 'שָׁלוֹשׁ שׁוּרוֹת שֶׁל מְקוֹמוֹת שְׁתִילָה, וּלְכָל הַיּוֹתֵר שְׁלוֹשָׁה עָשָׂר בְּלוֹקִים. בְּלוֹק מִשֶּׁלָּכֶם לְשׁוּרָה אַחַת יַעֲזֹר.' }],
    tools: ['robot'], blocks: ['fwd', 'right', 'left', 'plant', 'repeat', 'until', 'call'],
    map: { rows: ['#######', '#.....#', '#.....#', '#.....#', '#######'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    items: [...row('seed', [2, 3, 4, 5], 1), ...row('seed', [4, 3, 2, 1], 2), ...row('seed', [2, 3, 4, 5], 3)], maxBlocks: 13,
    goal: { all: [{ t: 'done', item: 'seeds' }] }, par: 13,
    solutions: [{ defs: { row: [REP(4, [{ b: 'fwd' }, { b: 'plant' }])] }, robot: [{ b: 'call', f: 'row' }, R, { b: 'fwd' }, R, { b: 'call', f: 'row' }, L, { b: 'fwd' }, L, { b: 'call', f: 'row' }] },
      { defs: { row: [UNTIL('blocked', [{ b: 'fwd' }, { b: 'plant' }])] }, robot: [{ b: 'call', f: 'row' }, R, { b: 'fwd' }, R, { b: 'call', f: 'row' }, L, { b: 'fwd' }, L, { b: 'call', f: 'row' }] }],
    wrong: [{ robot: [REP(4, [{ b: 'fwd' }, { b: 'plant' }]), R, { b: 'fwd' }, R, REP(4, [{ b: 'fwd' }, { b: 'plant' }]), L, { b: 'fwd' }, L, REP(4, [{ b: 'fwd' }, { b: 'plant' }])] }],
  },
  {
    id: 'l8-2', ch: 8, zone: 'desert', concept: 'puzzle',
    title: { f: 'סיור בוואדי', k: 'סִיּוּר בַּוָּאדִי' },
    say: [{ f: 'הרחפן עובר לאורך הוואדי: מכבה כל אש, משקה כל שיח צמא, ולא מבזבז אף טיפה. לכל היותר שישה בלוקים.', k: 'הָרַחְפָן עוֹבֵר לְאֹרֶךְ הַוָּאדִי: מְכַבֶּה כָּל אֵשׁ, מַשְׁקֶה כָּל שִׂיחַ צָמֵא, וְלֹא מְבַזְבֵּז אַף טִפָּה. לְכָל הַיּוֹתֵר שִׁשָּׁה בְּלוֹקִים.' }],
    tools: ['drone'], blocks: ['fwd', 'spray', 'water', 'repeat', 'until', 'if'],
    map: { rows: ['##########', '#ssssssss#', '##########'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } },
    variants: [{ items: [...row('fire', [4]), ...row('thirsty', [2, 7])] }, { items: [...row('fire', [3, 8]), ...row('thirsty', [5])] }],
    goal: { all: [{ t: 'done', item: 'fires' }, { t: 'done', item: 'thirsty' }, { t: 'nooops' }] }, par: 6, maxBlocks: 6,
    solutions: [{ drone: [REP(7, [{ b: 'fwd' }, IF('fire', [{ b: 'spray' }]), IF('thirsty', [{ b: 'water' }])])] },
      { drone: [UNTIL('blocked', [{ b: 'fwd' }, IF('fire', [{ b: 'spray' }]), IF('thirsty', [{ b: 'water' }])])] }],
    wrong: [{ drone: [REP(7, [{ b: 'fwd' }, IF('fire', [{ b: 'spray' }])])] }],
  },
  {
    id: 'l8-3', ch: 8, zone: 'reef', concept: 'puzzle',
    title: { f: 'ספירת אלמוגים חדשים', k: 'סְפִירַת אַלְמֻגִּים חֲדָשִׁים' },
    say: [{ f: 'הצוללן שותל אלמוג צעיר בכל מקום שמחכה לו, סופר כמה שתל, ומדווח. הכול בשבעה בלוקים.', k: 'הַצּוֹלְלָן שׁוֹתֵל אַלְמֹג צָעִיר בְּכָל מָקוֹם שֶׁמְּחַכֶּה לוֹ, סוֹפֵר כַּמָּה שָׁתַל, וּמְדַוֵּחַ. הַכֹּל בְּשִׁבְעָה בְּלוֹקִים.' }],
    tools: ['sub'], blocks: ['fwd', 'coral', 'add', 'report', 'repeat', 'until', 'if'],
    map: { rows: ['#########', '#~~~~~~~#', '#########'] }, home: { x: 1, y: 1 }, tools0: { sub: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: row('coral', [3, 5, 6]), goal: { all: [{ t: 'done', item: 'corals' }, { t: 'report', n: 3 }, { t: 'nooops' }] } },
      { items: row('coral', [2, 7]), goal: { all: [{ t: 'done', item: 'corals' }, { t: 'report', n: 2 }, { t: 'nooops' }] } },
    ],
    goal: { all: [{ t: 'done', item: 'corals' }] }, par: 6, maxBlocks: 7,
    solutions: [{ sub: [REP(6, [{ b: 'fwd' }, IF('coralspot', [{ b: 'coral' }, { b: 'add' }])]), { b: 'report' }] },
      { sub: [UNTIL('blocked', [{ b: 'fwd' }, IF('coralspot', [{ b: 'add' }, { b: 'coral' }])]), { b: 'report' }] }],
    wrong: [{ sub: [REP(6, [{ b: 'fwd' }, IF('coralspot', [{ b: 'coral' }])]), { b: 'report' }] }],
  },
  {
    id: 'l8-4', ch: 8, zone: 'amazon', concept: 'puzzle',
    title: { f: 'המשימה הגדולה', k: 'הַמְּשִׂימָה הַגְּדוֹלָה' },
    say: [{ f: 'הרובוט שותל לאורך השביל. בסוף הוא משגר את הרחפן, שמצלם את הקוף מעל העצים וחוזר לנחות. הכול יחד!', k: 'הָרוֹבּוֹט שׁוֹתֵל לְאֹרֶךְ הַשְּׁבִיל. בַּסּוֹף הוּא מְשַׁגֵּר אֶת הָרַחְפָן, שֶׁמְּצַלֵּם אֶת הַקּוֹף מֵעַל הָעֵצִים וְחוֹזֵר לִנְחֹת. הַכֹּל יַחַד!' }],
    tools: ['robot', 'drone'], blocks: ['fwd', 'right', 'left', 'plant', 'photo', 'launch', 'land', 'repeat', 'if'],
    map: { rows: ['#########', '#....TT.#', '#########'] }, home: { x: 1, y: 1 },
    tools0: { robot: { x: 1, y: 1, dir: 1 }, drone: { x: 1, y: 1, dir: 1, parked: true } },
    items: [...row('seed', [2, 3, 4]), { t: 'animal', kind: 'howler', x: 7, y: 1 }],
    goal: { all: [{ t: 'done', item: 'seeds' }, { t: 'done', item: 'animals' }, { t: 'landed' }] }, par: 10,
    solutions: [{ robot: [REP(3, [{ b: 'fwd' }, { b: 'plant' }]), { b: 'launch' }], drone: [{ b: 'fwd' }, { b: 'photo' }, R, R, { b: 'fwd' }, { b: 'land' }] },
      { robot: [REP(3, [{ b: 'fwd' }, IF('spot', [{ b: 'plant' }])]), { b: 'launch' }], drone: [...fw(2), { b: 'photo' }, L, L, ...fw(2), { b: 'land' }] }],
    wrong: [{ robot: [REP(3, [{ b: 'fwd' }, { b: 'plant' }])] }],
  },
];
