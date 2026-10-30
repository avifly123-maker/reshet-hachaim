// מעבדת הרובוטים – chapter 6 (מונים ומשתנים: counting and remembering numbers). A counter starts at 0; "הוסף 1" adds,
// "דווח" sends the number to the base, "אפס" starts again. The variants have different numbers of things, so the
// report must come from counting, not from guessing (each variant has its own goal).
const fw = (n = 1) => Array.from({ length: n }, () => ({ b: 'fwd' }));
const R = { b: 'right' };
const IF = (c, then, els = []) => ({ b: 'if', c, then, else: els });
const REP = (n, body) => ({ b: 'repeat', n, body });
const row = (t, xs, y = 1, extra = {}) => xs.map((x) => ({ t, x, y, ...extra }));
const ADD = { b: 'add' }, REPORT = { b: 'report' }, RESET = { b: 'reset' };

export const LESSONS_3 = [
  {
    id: 'l6-1', ch: 6, zone: 'grove', concept: 'counter',
    title: { f: 'כמה צבאים בעמק?', k: 'כַּמָּה צְבָאִים בָּעֵמֶק?' },
    say: [{ f: 'חוקרים סופרים צבאים כדי לדעת אם הם בסדר. הרחפן עף מעל העמק, מוסיף 1 על כל צבי, ובסוף מדווח.', k: 'חוֹקְרִים סוֹפְרִים צְבָאִים כְּדֵי לָדַעַת אִם הֵם בְּסֵדֶר. הָרַחְפָן עָף מֵעַל הָעֵמֶק, מוֹסִיף 1 עַל כָּל צְבִי, וּבַסּוֹף מְדַוֵּחַ.' }],
    tools: ['drone'], blocks: ['fwd', 'add', 'report', 'repeat', 'if'],
    map: { rows: ['#########', '#.......#', '#########'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: row('animal', [3, 6], 1, { kind: 'gazelle' }), goal: { all: [{ t: 'report', n: 2 }] } },
      { items: row('animal', [2, 4, 7], 1, { kind: 'gazelle' }), goal: { all: [{ t: 'report', n: 3 }] } },
      { items: row('animal', [5], 1, { kind: 'gazelle' }), goal: { all: [{ t: 'report', n: 1 }] } },
    ],
    goal: { all: [{ t: 'report', n: 2 }] }, par: 5,
    solutions: [{ drone: [REP(6, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT] }, { drone: [REP(3, [{ b: 'fwd' }, IF('here_animal', [ADD]), { b: 'fwd' }, IF('here_animal', [ADD])]), REPORT] }],
    wrong: [{ drone: [ADD, ADD, REPORT] }, { drone: [REP(6, [{ b: 'fwd' }, ADD]), REPORT] }],
  },
  {
    id: 'l6-2', ch: 6, zone: 'amazon', concept: 'counter',
    title: { f: 'סופרים את הקטיף', k: 'סוֹפְרִים אֶת הַקָּטִיף' },
    say: [{ f: 'הרובוט קוטף פירות לבעלי החיים. על כל פרי שנקטף הוא מוסיף 1, ובסוף מדווח כמה אסף.', k: 'הָרוֹבּוֹט קוֹטֵף פֵּרוֹת לְבַעֲלֵי הַחַיִּים. עַל כָּל פְּרִי שֶׁנִּקְטַף הוּא מוֹסִיף 1, וּבַסּוֹף מְדַוֵּחַ כַּמָּה אָסַף.' }],
    tools: ['robot'], blocks: ['fwd', 'pick', 'add', 'report', 'repeat', 'if'],
    map: { rows: ['########', '#......#', '########'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: row('fruit', [2, 5]), goal: { all: [{ t: 'done', item: 'fruit' }, { t: 'report', n: 2 }, { t: 'nooops' }] } },
      { items: row('fruit', [3, 4, 6]), goal: { all: [{ t: 'done', item: 'fruit' }, { t: 'report', n: 3 }, { t: 'nooops' }] } },
      { items: row('fruit', [2, 3, 4, 5]), goal: { all: [{ t: 'done', item: 'fruit' }, { t: 'report', n: 4 }, { t: 'nooops' }] } },
    ],
    goal: { all: [{ t: 'report', n: 2 }] }, par: 6,
    solutions: [{ robot: [REP(5, [{ b: 'fwd' }, IF('fruit', [{ b: 'pick' }, ADD])]), REPORT] }, { robot: [REP(5, [{ b: 'fwd' }, IF('fruit', [ADD, { b: 'pick' }])]), REPORT] }],
    wrong: [{ robot: [REP(5, [{ b: 'fwd' }, IF('fruit', [{ b: 'pick' }])]), REPORT] }],
  },
  {
    id: 'l6-3', ch: 6, zone: 'reef', concept: 'counter',
    title: { f: 'דגי תוכי בשתי שורות', k: 'דְּגֵי תֻּכִּי בִּשְׁתֵּי שׁוּרוֹת' },
    say: [{ f: 'דגי התוכי מנקים את האלמוגים מאצות. הצוללן סופר אותם בשתי שורות, ומדווח את המספר של כולן יחד.', k: 'דְּגֵי הַתֻּכִּי מְנַקִּים אֶת הָאַלְמֻגִּים מֵאַצּוֹת. הַצּוֹלְלָן סוֹפֵר אוֹתָם בִּשְׁתֵּי שׁוּרוֹת, וּמְדַוֵּחַ אֶת הַמִּסְפָּר שֶׁל כֻּלָּן יַחַד.' }],
    tools: ['sub'], blocks: ['fwd', 'right', 'add', 'report', 'repeat', 'if'],
    map: { rows: ['#######', '#~~~~~#', '#~~~~~#', '#######'] }, home: { x: 1, y: 1 }, tools0: { sub: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: [...row('animal', [3], 1, { kind: 'parrotfish' }), ...row('animal', [2, 4], 2, { kind: 'parrotfish' })], goal: { all: [{ t: 'report', n: 3 }] } },
      { items: [...row('animal', [2, 5], 1, { kind: 'parrotfish' }), ...row('animal', [1], 2, { kind: 'parrotfish' })], goal: { all: [{ t: 'report', n: 3 }] } },
      { items: [...row('animal', [4], 1, { kind: 'parrotfish' }), ...row('animal', [5, 3, 1], 2, { kind: 'parrotfish' })], goal: { all: [{ t: 'report', n: 4 }] } },
    ],
    goal: { all: [{ t: 'report', n: 3 }] }, par: 14,
    solutions: [{ sub: [REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), R, { b: 'fwd' }, IF('here_animal', [ADD]), R, REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT] },
      { sub: [REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), R, { b: 'fwd' }, R, IF('here_animal', [ADD]), REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT] }],
    wrong: [{ sub: [REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT] }],
  },
  {
    id: 'l6-4', ch: 6, zone: 'grove', concept: 'counter',
    title: { f: 'שתי ספירות, שני דיווחים', k: 'שְׁתֵּי סְפִירוֹת, שְׁנֵי דִּוּוּחִים' },
    say: [{ f: 'החוקרים רוצים מספר נפרד לכל שורה. אחרי הדיווח הראשון מאפסים את המונה, וסופרים מחדש.', k: 'הַחוֹקְרִים רוֹצִים מִסְפָּר נִפְרָד לְכָל שׁוּרָה. אַחֲרֵי הַדִּוּוּחַ הָרִאשׁוֹן מְאַפְּסִים אֶת הַמּוֹנֶה, וְסוֹפְרִים מֵחָדָשׁ.' }],
    tools: ['drone'], blocks: ['fwd', 'right', 'add', 'report', 'reset', 'repeat', 'if'],
    map: { rows: ['#######', '#.....#', '#.....#', '#######'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: [...row('animal', [2, 4], 1, { kind: 'gazelle' }), ...row('animal', [3], 2, { kind: 'gazelle' })], goal: { all: [{ t: 'reports', list: [2, 1] }] } },
      { items: [...row('animal', [5], 1, { kind: 'gazelle' }), ...row('animal', [1, 2, 4], 2, { kind: 'gazelle' })], goal: { all: [{ t: 'reports', list: [1, 3] }] } },
    ],
    goal: { all: [{ t: 'reports', list: [2, 1] }] }, par: 16,
    solutions: [{ drone: [REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT, RESET, R, { b: 'fwd' }, R, IF('here_animal', [ADD]), REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT] },
      { drone: [REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT, R, { b: 'fwd' }, R, RESET, IF('here_animal', [ADD]), REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT] }],
    wrong: [{ drone: [REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT, R, { b: 'fwd' }, R, IF('here_animal', [ADD]), REP(4, [{ b: 'fwd' }, IF('here_animal', [ADD])]), REPORT] }],
  },
];
