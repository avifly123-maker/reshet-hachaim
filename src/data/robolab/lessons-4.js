// מעבדת הרובוטים – chapter 7 (עבודת צוות: tools that work together). The tools take turns, one action each, so two
// programs run at the same time. The robot can launch the drone from its back (שגר רחפן) and the drone lands back on it;
// a signal (שלח אות / חכה לאות) lets one tool wait for the other. Avi (29.10): the advanced level is a robot that sends
// a drone to do a job and come back, and tools that cooperate.
const fw = (n = 1) => Array.from({ length: n }, () => ({ b: 'fwd' }));
const R = { b: 'right' }, L = { b: 'left' };
const REP = (n, body) => ({ b: 'repeat', n, body });
const IF = (c, then, els = []) => ({ b: 'if', c, then, else: els });

export const LESSONS_4 = [
  {
    id: 'l7-1', ch: 7, zone: 'grove', concept: 'team',
    title: { f: 'הרחפן יוצא מהגב', k: 'הָרַחְפָן יוֹצֵא מֵהַגַּב' },
    say: [{ f: 'הרובוט לא יכול לעבור בין העצים, אבל הרחפן עף מעליהם. הרובוט משגר את הרחפן, הרחפן מצלם את הינשוף וחוזר לנחות על הרובוט.', k: 'הָרוֹבּוֹט לֹא יָכוֹל לַעֲבֹר בֵּין הָעֵצִים, אֲבָל הָרַחְפָן עָף מֵעֲלֵיהֶם. הָרוֹבּוֹט מְשַׁגֵּר אֶת הָרַחְפָן, הָרַחְפָן מְצַלֵּם אֶת הַיַּנְשׁוּף וְחוֹזֵר לִנְחֹת עַל הָרוֹבּוֹט.' }],
    tools: ['robot', 'drone'], blocks: ['fwd', 'back', 'right', 'left', 'photo', 'launch', 'land'],
    map: { rows: ['########', '#..TT..#', '########'] }, home: { x: 1, y: 1 },
    tools0: { robot: { x: 1, y: 1, dir: 1 }, drone: { x: 1, y: 1, dir: 1, parked: true } },
    items: [{ t: 'animal', kind: 'owl', x: 6, y: 1 }],
    goal: { all: [{ t: 'done', item: 'animals' }, { t: 'landed' }] }, par: 9,
    solutions: [{ robot: [{ b: 'fwd' }, { b: 'launch' }], drone: [...fw(3), { b: 'photo' }, { b: 'back' }, { b: 'back' }, { b: 'back' }, { b: 'land' }] },
      { robot: [{ b: 'fwd' }, { b: 'launch' }], drone: [...fw(2), { b: 'photo' }, R, R, ...fw(2), { b: 'land' }] }],
    wrong: [{ robot: [...fw(4)] }, { robot: [{ b: 'fwd' }, { b: 'launch' }], drone: [...fw(3), { b: 'photo' }] }],
  },
  {
    id: 'l7-2', ch: 7, zone: 'desert', concept: 'team',
    title: { f: 'חכה לאות', k: 'חַכֵּה לְאוֹת' },
    say: [{ f: 'הרחפן קרוב, הרובוט רחוק. אם הרחפן ינחת מוקדם, לא יהיה עליו רובוט. הרובוט ישלח אות כשהוא בבית, והרחפן יחכה לאות.', k: 'הָרַחְפָן קָרוֹב, הָרוֹבּוֹט רָחוֹק. אִם הָרַחְפָן יִנְחַת מֻקְדָּם, לֹא יִהְיֶה עָלָיו רוֹבּוֹט. הָרוֹבּוֹט יִשְׁלַח אוֹת כְּשֶׁהוּא בַּבַּיִת, וְהָרַחְפָן יְחַכֶּה לְאוֹת.' }],
    tools: ['robot', 'drone'], blocks: ['fwd', 'right', 'left', 'land', 'send', 'waitmsg'],
    map: { rows: ['#######', '#ssss.#', '#sTTs.#', '#....s#', '#######'] }, home: { x: 5, y: 1 },
    tools0: { robot: { x: 1, y: 1, dir: 1 }, drone: { x: 5, y: 3, dir: 0 } },
    goal: { all: [{ t: 'home', tool: 'robot' }, { t: 'landed' }] }, par: 8,
    solutions: [{ robot: [...fw(4), { b: 'send', m: 'a' }], drone: [{ b: 'waitmsg', m: 'a' }, ...fw(2), { b: 'land' }] },
      { robot: [...fw(3), { b: 'send', m: 'b' }, { b: 'fwd' }], drone: [{ b: 'waitmsg', m: 'b' }, ...fw(2), { b: 'land' }] }],
    wrong: [{ robot: [...fw(4)], drone: [...fw(2), { b: 'land' }] }],
  },
  {
    id: 'l7-3', ch: 7, zone: 'desert', concept: 'team',
    title: { f: 'שניים עובדים יחד', k: 'שְׁנַיִם עוֹבְדִים יַחַד' },
    say: [{ f: 'יש מעט זמן: הרובוט משקה את השתילים, ובאותו זמן הרחפן מכבה את האש. כל אחד מקבל תוכנית משלו.', k: 'יֵשׁ מְעַט זְמַן: הָרוֹבּוֹט מַשְׁקֶה אֶת הַשְּׁתִילִים, וּבְאוֹתוֹ זְמַן הָרַחְפָן מְכַבֶּה אֶת הָאֵשׁ. כָּל אֶחָד מְקַבֵּל תָּכְנִית מִשֶּׁלּוֹ.' }],
    tools: ['robot', 'drone'], blocks: ['fwd', 'water', 'spray', 'repeat', 'if'],
    map: { rows: ['########', '#ssssss#', '########', '#ssssss#', '########'] }, home: { x: 1, y: 1 },
    tools0: { robot: { x: 1, y: 1, dir: 1 }, drone: { x: 1, y: 3, dir: 1 } },
    items: [{ t: 'thirsty', x: 3, y: 1 }, { t: 'thirsty', x: 5, y: 1 }, { t: 'fire', x: 4, y: 3 }, { t: 'fire', x: 6, y: 3 }],
    goal: { all: [{ t: 'done', item: 'thirsty' }, { t: 'done', item: 'fires' }, { t: 'steps', max: 9 }] }, par: 10,
    solutions: [{ robot: [...fw(2), { b: 'water' }, ...fw(2), { b: 'water' }], drone: [...fw(2), { b: 'spray' }, ...fw(2), { b: 'spray' }] },
      { robot: [REP(4, [{ b: 'fwd' }, IF('thirsty', [{ b: 'water' }])])], drone: [REP(5, [IF('fire', [{ b: 'spray' }]), { b: 'fwd' }])] }],
    wrong: [{ robot: [...fw(2), { b: 'water' }, ...fw(2), { b: 'water' }] }],
  },
  {
    id: 'l7-4', ch: 7, zone: 'amazon', concept: 'team',
    title: { f: 'משימת צילום מעל הצמרות', k: 'מְשִׂימַת צִלּוּם מֵעַל הַצַּמָּרוֹת' },
    say: [{ f: 'הרובוט נוסע לקצה השביל ומשגר את הרחפן. הרחפן מצלם שני קופים מעל העצים, חוזר ונוחת על הרובוט.', k: 'הָרוֹבּוֹט נוֹסֵעַ לִקְצֵה הַשְּׁבִיל וּמְשַׁגֵּר אֶת הָרַחְפָן. הָרַחְפָן מְצַלֵּם שְׁנֵי קוֹפִים מֵעַל הָעֵצִים, חוֹזֵר וְנוֹחֵת עַל הָרוֹבּוֹט.' }],
    tools: ['robot', 'drone'], blocks: ['fwd', 'right', 'left', 'photo', 'launch', 'land', 'repeat'],
    map: { rows: ['#######', '#...TT#', '####TT#', '####TT#', '#######'] }, home: { x: 1, y: 1 },
    tools0: { robot: { x: 1, y: 1, dir: 1 }, drone: { x: 1, y: 1, dir: 1, parked: true } },
    items: [{ t: 'animal', kind: 'howler', x: 5, y: 1 }, { t: 'animal', kind: 'howler', x: 5, y: 3 }],
    goal: { all: [{ t: 'done', item: 'animals' }, { t: 'landed' }] }, par: 16,
    solutions: [{ robot: [...fw(2), { b: 'launch' }], drone: [...fw(2), { b: 'photo' }, R, ...fw(2), { b: 'photo' }, R, R, ...fw(2), L, ...fw(2), { b: 'land' }] },
      { robot: [...fw(2), { b: 'launch' }], drone: [{ b: 'fwd' }, { b: 'photo' }, { b: 'fwd' }, R, { b: 'fwd' }, { b: 'photo' }, R, R, { b: 'fwd' }, L, ...fw(2), { b: 'land' }] }],
    wrong: [{ robot: [...fw(2), { b: 'launch' }], drone: [...fw(2), { b: 'photo' }, R, ...fw(2), { b: 'photo' }] }],
  },
];
