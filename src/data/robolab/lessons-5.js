// מעבדת הרובוטים – chapter 5 (אירועים: when something happens, the tool reacts). A hat block "כש…" holds a handler
// under the tool's program: when its moment comes the tool stops what it does, runs the handler, then goes on (unless
// the handler says "עצור"). The sunset comes at another time in each variant, so the reaction must come from the event.
const fw = (n = 1) => Array.from({ length: n }, () => ({ b: 'fwd' }));
const R = { b: 'right' }, L = { b: 'left' };
const IF = (c, then, els = []) => ({ b: 'if', c, then, else: els });
const UNTIL = (c, body) => ({ b: 'until', c, body });
const REP = (n, body) => ({ b: 'repeat', n, body });
const row = (t, xs, y = 1, extra = {}) => xs.map((x) => ({ t, x, y, ...extra }));
const ON = (ev, tool, body, m) => ({ ev, tool, body, ...(m ? { m } : {}) });

export const LESSONS_5 = [
  {
    id: 'l5-1', ch: 5, zone: 'grove', concept: 'event',
    title: { f: 'כשהשמש שוקעת', k: 'כְּשֶׁהַשֶּׁמֶשׁ שׁוֹקַעַת' },
    say: [{ f: 'הרובוט שותל לאורך השביל. כשהשמש שוקעת הוא מפסיק, חוזר הביתה ועוצר. כל יום השמש שוקעת בזמן אחר.', k: 'הָרוֹבּוֹט שׁוֹתֵל לְאֹרֶךְ הַשְּׁבִיל. כְּשֶׁהַשֶּׁמֶשׁ שׁוֹקַעַת הוּא מַפְסִיק, חוֹזֵר הַבַּיְתָה וְעוֹצֵר. כָּל יוֹם הַשֶּׁמֶשׁ שׁוֹקַעַת בִּזְמַן אַחֵר.' }],
    tools: ['robot'], blocks: ['fwd', 'right', 'left', 'plant', 'until', 'if', 'when_sunset', 'stop'],
    map: { rows: ['##########', '#........#', '##########'] }, home: { x: 1, y: 1 }, tools0: { robot: { x: 1, y: 1, dir: 1 } },
    items: row('seed', [3, 5, 7]),
    variants: [
      { events: { sunset: 7 }, goal: { all: [{ t: 'some', item: 'seeds', n: 2 }, { t: 'home', tool: 'robot' }, { t: 'steps', max: 15 }] } },
      { events: { sunset: 4 }, goal: { all: [{ t: 'some', item: 'seeds', n: 1 }, { t: 'home', tool: 'robot' }, { t: 'steps', max: 10 }] } },
    ],
    goal: { all: [{ t: 'home', tool: 'robot' }] }, par: 11,
    solutions: [
      { robot: [UNTIL('blocked', [{ b: 'fwd' }, IF('spot', [{ b: 'plant' }])])], on: [ON('sunset', 'robot', [R, R, UNTIL('home', [{ b: 'fwd' }]), { b: 'stop' }])] },
      { robot: [UNTIL('blocked', [{ b: 'fwd' }, IF('spot', [{ b: 'plant' }])])], on: [ON('sunset', 'robot', [L, L, UNTIL('home', [{ b: 'fwd' }]), { b: 'stop' }])] },
    ],
    wrong: [{ robot: [UNTIL('blocked', [{ b: 'fwd' }, IF('spot', [{ b: 'plant' }])]), R, R, UNTIL('home', [{ b: 'fwd' }])] }],
  },
  {
    id: 'l5-2', ch: 5, zone: 'grove', concept: 'event',
    title: { f: 'כשאני רואה צבי', k: 'כְּשֶׁאֲנִי רוֹאֶה צְבִי' },
    say: [{ f: 'הרחפן מסייר מעל העמק. בכל פעם שהוא רואה צבי, הוא עוצר לרגע לצלם, וממשיך בסיור.', k: 'הָרַחְפָן מְסַיֵּר מֵעַל הָעֵמֶק. בְּכָל פַּעַם שֶׁהוּא רוֹאֶה צְבִי, הוּא עוֹצֵר לְרֶגַע לְצַלֵּם, וּמַמְשִׁיךְ בַּסִּיּוּר.' }],
    tools: ['drone'], blocks: ['fwd', 'photo', 'repeat', 'when_animal'],
    map: { rows: ['##########', '#........#', '##########'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } },
    variants: [{ items: row('animal', [4, 8], 1, { kind: 'gazelle' }) }, { items: row('animal', [3, 6], 1, { kind: 'gazelle' }) }, { items: row('animal', [7], 1, { kind: 'gazelle' }) }],
    goal: { all: [{ t: 'done', item: 'animals' }, { t: 'nooops' }] }, par: 4,
    solutions: [{ drone: [REP(7, [{ b: 'fwd' }])], on: [ON('see_animal', 'drone', [{ b: 'photo' }])] }, { drone: [...fw(7)], on: [ON('see_animal', 'drone', [{ b: 'photo' }])] }],
    wrong: [{ drone: [REP(7, [{ b: 'fwd' }, { b: 'photo' }])] }],
  },
  {
    id: 'l5-3', ch: 5, zone: 'desert', concept: 'event',
    title: { f: 'כשמגיע אות', k: 'כְּשֶׁמַּגִּיעַ אוֹת' },
    say: [{ f: 'לרחפן אין תוכנית רגילה בכלל. הוא רק מקשיב: כשמגיע אות מהרובוט, הוא עף אליו ונוחת עליו.', k: 'לָרַחְפָן אֵין תָּכְנִית רְגִילָה בִּכְלָל. הוּא רַק מַקְשִׁיב: כְּשֶׁמַּגִּיעַ אוֹת מֵהָרוֹבּוֹט, הוּא עָף אֵלָיו וְנוֹחֵת עָלָיו.' }],
    tools: ['robot', 'drone'], blocks: ['fwd', 'right', 'left', 'land', 'send', 'when_msg'],
    map: { rows: ['#######', '#ssss.#', '#sTTs.#', '#....s#', '#######'] }, home: { x: 5, y: 1 },
    tools0: { robot: { x: 1, y: 1, dir: 1 }, drone: { x: 5, y: 3, dir: 0 } },
    goal: { all: [{ t: 'home', tool: 'robot' }, { t: 'landed' }] }, par: 9,
    solutions: [{ robot: [...fw(4), { b: 'send', m: 'a' }], on: [ON('msg', 'drone', [...fw(2), { b: 'land' }], 'a')] },
      { robot: [...fw(4), { b: 'send', m: 'c' }], on: [ON('msg', 'drone', [...fw(2), { b: 'land' }], 'c')] }],
    wrong: [{ robot: [...fw(4), { b: 'send', m: 'a' }], on: [ON('msg', 'drone', [...fw(2), { b: 'land' }], 'b')] }],
  },
];
