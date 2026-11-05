// מעבדת הרובוטים – chapter 9 (משימות רחפן, 1.4.4 set 8): the drone on real field jobs, for those who finished the
// challenges. Three new things in the engine (engine/world.js):
//   a camera trap (level.beeps): when an animal passes it, it sends a signal; the drone hovers until it comes, then flies
//   to it and photographs (the "when a signal comes" hat of chapter 5, now from the field itself);
//   night with a heat camera (level.night): only warm animals are seen; a cold one (a lizard, a scorpion, a crocodile)
//   stays dark, so it is not counted and not photographed;
//   a herd that walks (an animal item with a path): photograph it from two cells away; nearer, it runs off.
const fw = (n = 1) => Array.from({ length: n }, () => ({ b: 'fwd' }));
const R = { b: 'right' };
const IF = (c, then, els = []) => ({ b: 'if', c, then, else: els });
const UNTIL = (c, body) => ({ b: 'until', c, body });
const REP = (n, body) => ({ b: 'repeat', n, body });
const ON = (ev, tool, body, m) => ({ ev, tool, body, ...(m ? { m } : {}) });
const A = (x, kind, extra = {}) => ({ t: 'animal', x, y: 1, kind, ...extra });
const WAIT = (n) => REP(n, [{ b: 'wait' }]);

export const LESSONS_9 = [
  {
    id: 'l9-1', ch: 9, zone: 'grove', concept: 'drone',
    title: { f: 'מלכודת מצלמה', k: 'מַלְכֹּדֶת מַצְלֵמָה' },
    say: [{ f: 'בשביל עומדת מלכודת מצלמה. כשצבי עובר לידה, היא שולחת אות. הרחפן מחכה באוויר, ורק כשמגיע האות הוא טס לשם ומצלם.', k: 'כְּשֶׁצְּבִי עוֹבֵר, הַמַּצְלֵמָה שׁוֹלַחַת אוֹת. אָז הָרַחְפָן טָס וּמְצַלֵּם.' }],
    tools: ['drone'], blocks: ['fwd', 'wait', 'photo', 'repeat', 'until', 'when_msg', 'stop'],
    map: { rows: ['###########', '#.........#', '###########'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: [A(6, 'gazelle', { appear: 4 })], beeps: [{ at: 4, x: 6, y: 1, m: 'a' }] },
      { items: [A(8, 'gazelle', { appear: 9 })], beeps: [{ at: 9, x: 8, y: 1, m: 'a' }] },
      { items: [A(4, 'gazelle', { appear: 14 })], beeps: [{ at: 14, x: 4, y: 1, m: 'a' }] },
    ],
    goal: { all: [{ t: 'done', item: 'animals' }, { t: 'nooops' }] }, par: 7,
    solutions: [{ drone: [WAIT(20)], on: [ON('msg', 'drone', [UNTIL('here_animal', [{ b: 'fwd' }]), { b: 'photo' }, { b: 'stop' }], 'a')] },
      { drone: [WAIT(30)], on: [ON('msg', 'drone', [UNTIL('here_animal', [{ b: 'fwd' }]), { b: 'photo' }, { b: 'stop' }], 'a')] }],
    wrong: [{ drone: [REP(8, [{ b: 'fwd' }, IF('here_animal', [{ b: 'photo' }])])] }],
  },
  {
    id: 'l9-2', ch: 9, zone: 'savanna', concept: 'drone',
    title: { f: 'שתי מלכודות, שני אותות', k: 'שְׁתֵּי מַלְכֹּדוֹת, שְׁנֵי אוֹתוֹת' },
    say: [{ f: 'הרחפן באמצע. מלכודת אחת מימין שולחת אות א, ומלכודת משמאל שולחת אות ב. לכל אות תגובה משלו.', k: 'אוֹת א: יָמִינָה. אוֹת ב: שְׂמֹאלָה. לְכָל אוֹת תְּגוּבָה מִשֶּׁלּוֹ.' }],
    tools: ['drone'], blocks: ['fwd', 'right', 'wait', 'photo', 'repeat', 'until', 'when_msg', 'stop'],
    map: { rows: ['###########', '#.........#', '###########'] }, home: { x: 5, y: 1 }, tools0: { drone: { x: 5, y: 1, dir: 1 } },
    variants: [
      { items: [A(8, 'zebra', { appear: 3 })], beeps: [{ at: 3, x: 8, y: 1, m: 'a' }] },
      { items: [A(2, 'impala', { appear: 5 })], beeps: [{ at: 5, x: 2, y: 1, m: 'b' }] },
      { items: [A(9, 'zebra', { appear: 8 })], beeps: [{ at: 8, x: 9, y: 1, m: 'a' }] },
    ],
    goal: { all: [{ t: 'done', item: 'animals' }, { t: 'nooops' }] }, par: 14,
    solutions: [{ drone: [WAIT(20)], on: [ON('msg', 'drone', [UNTIL('here_animal', [{ b: 'fwd' }]), { b: 'photo' }, { b: 'stop' }], 'a'), ON('msg', 'drone', [R, R, UNTIL('here_animal', [{ b: 'fwd' }]), { b: 'photo' }, { b: 'stop' }], 'b')] },
      { drone: [WAIT(30)], on: [ON('msg', 'drone', [R, R, UNTIL('here_animal', [{ b: 'fwd' }]), { b: 'photo' }, { b: 'stop' }], 'b'), ON('msg', 'drone', [UNTIL('here_animal', [{ b: 'fwd' }]), { b: 'photo' }, { b: 'stop' }], 'a')] }],
    wrong: [{ drone: [WAIT(20)], on: [ON('msg', 'drone', [UNTIL('here_animal', [{ b: 'fwd' }]), { b: 'photo' }, { b: 'stop' }], 'a')] }],
  },
  {
    id: 'l9-3', ch: 9, zone: 'desert', concept: 'drone',
    title: { f: 'ספירת לילה', k: 'סְפִירַת לַיְלָה' },
    say: [{ f: 'לילה במדבר. למצלמת החום של הרחפן נראים רק בעלי חיים חמים. החרדון והעקרב קרים, והם נשארים חשוכים. ספרו את מי שרואים, ודווחו.', k: 'בַּלַּיְלָה רוֹאִים רַק חַיּוֹת חַמּוֹת. סִפְרוּ אוֹתָן וְדַוְּחוּ.' }],
    tools: ['drone'], blocks: ['fwd', 'repeat', 'if', 'until', 'add', 'report'],
    map: { rows: ['##########', '#ssssssss#', '##########'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } }, night: true,
    variants: [
      { items: [A(3, 'fennec'), A(5, 'uromastyx', { cold: true }), A(7, 'jerboa')], goal: { all: [{ t: 'report', n: 2 }] } },
      { items: [A(2, 'jerboa'), A(4, 'scorpion', { cold: true }), A(6, 'fennec'), A(8, 'jerboa')], goal: { all: [{ t: 'report', n: 3 }] } },
      { items: [A(4, 'uromastyx', { cold: true }), A(8, 'fennec')], goal: { all: [{ t: 'report', n: 1 }] } },
    ],
    par: 5,
    solutions: [{ drone: [REP(7, [{ b: 'fwd' }, IF('here_animal', [{ b: 'add' }])]), { b: 'report' }] }, { drone: [UNTIL('blocked', [{ b: 'fwd' }, IF('here_animal', [{ b: 'add' }])]), { b: 'report' }] }],
    wrong: [{ drone: [REP(7, [{ b: 'fwd' }, { b: 'add' }]), { b: 'report' }] }],
  },
  {
    id: 'l9-4', ch: 9, zone: 'savanna', concept: 'drone',
    title: { f: 'צילום במצלמת חום', k: 'צִלּוּם בְּמַצְלֵמַת חֹם' },
    say: [{ f: 'לילה ליד הנהר. צלמו כל בעל חיים חם שהרחפן רואה, בלי צילום אחד מבוזבז. התנין קר בלילה, והמצלמה לא רואה אותו.', k: 'צַלְּמוּ כָּל חַיָּה חַמָּה. אֶת הַתַּנִּין הַקַּר לֹא רוֹאִים.' }],
    tools: ['drone'], blocks: ['fwd', 'photo', 'repeat', 'if', 'until'],
    map: { rows: ['###########', '#.........#', '###########'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } }, night: true,
    variants: [
      { items: [A(3, 'impala'), A(5, 'crocodile', { cold: true }), A(8, 'zebra')], goal: { all: [{ t: 'some', item: 'animals', n: 2 }, { t: 'nooops' }] } },
      { items: [A(2, 'crocodile', { cold: true }), A(6, 'wildebeest'), A(7, 'crocodile', { cold: true }), A(9, 'impala')], goal: { all: [{ t: 'some', item: 'animals', n: 2 }, { t: 'nooops' }] } },
    ],
    par: 4,
    solutions: [{ drone: [REP(8, [{ b: 'fwd' }, IF('here_animal', [{ b: 'photo' }])])] }, { drone: [UNTIL('blocked', [{ b: 'fwd' }, IF('here_animal', [{ b: 'photo' }])])] }],
    wrong: [{ drone: [REP(8, [{ b: 'fwd' }, { b: 'photo' }])] }],
  },
  {
    id: 'l9-5', ch: 9, zone: 'savanna', concept: 'drone',
    title: { f: 'בעקבות העדר', k: 'בְּעִקְבוֹת הָעֵדֶר' },
    say: [{ f: 'עדר זברות הולך לאט אל המים. הרחפן הולך אחריו ומצלם שלוש פעמים. אם הוא מתקרב יותר משני משבצות, העדר נבהל ובורח. כשרואים אותו לפנים, מצלמים. כשלא, מתקדמים.', k: 'אַל תִּתְקָרְבוּ לָעֵדֶר! רוֹאִים אוֹתוֹ? מְצַלְּמִים. לֹא רוֹאִים? מִתְקַדְּמִים.' }],
    tools: ['drone'], blocks: ['fwd', 'wait', 'photo', 'repeat', 'if'],
    map: { rows: ['############', '#..........#', '############'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: [A(4, 'zebra', { path: [[4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1]], every: 3 })] },
      { items: [A(5, 'zebra', { path: [[5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1]], every: 2 })] },
    ],
    goal: { all: [{ t: 'shots', n: 3 }] }, par: 5,
    solutions: [{ drone: [REP(14, [IF('animal', [{ b: 'photo' }], [{ b: 'fwd' }])])] }, { drone: [REP(10, [IF('animal', [{ b: 'photo' }, { b: 'wait' }], [{ b: 'fwd' }])])] }],
    wrong: [{ drone: [REP(7, [{ b: 'fwd' }, { b: 'photo' }])] }],
  },
  {
    id: 'l9-6', ch: 9, zone: 'savanna', concept: 'drone',
    title: { f: 'העדר מגיע למים', k: 'הָעֵדֶר מַגִּיעַ לַמַּיִם' },
    say: [{ f: 'מלכודת המצלמה ליד הדרך שולחת אות כשהעדר עובר. רק אז הרחפן יוצא אחריו: מצלם מרחוק ולא מתקרב.', k: 'כְּשֶׁמַּגִּיעַ אוֹת, הוֹלְכִים אַחֲרֵי הָעֵדֶר, וּמְצַלְּמִים מֵרָחוֹק.' }],
    tools: ['drone'], blocks: ['fwd', 'wait', 'photo', 'repeat', 'if', 'when_msg'],
    map: { rows: ['############', '#..........#', '############'] }, home: { x: 1, y: 1 }, tools0: { drone: { x: 1, y: 1, dir: 1 } },
    variants: [
      { items: [A(4, 'wildebeest', { path: [[4, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1]], every: 3, appear: 3 })], beeps: [{ at: 3, x: 4, y: 1, m: 'a' }] },
      { items: [A(4, 'wildebeest', { path: [[4, 1], [4, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1]], every: 3, appear: 6 })], beeps: [{ at: 6, x: 4, y: 1, m: 'a' }] },
    ],
    goal: { all: [{ t: 'shots', n: 3 }] }, par: 7,
    solutions: [{ drone: [WAIT(40)], on: [ON('msg', 'drone', [REP(16, [IF('animal', [{ b: 'photo' }], [{ b: 'fwd' }])])], 'a')] },
      { drone: [WAIT(30)], on: [ON('msg', 'drone', [REP(12, [IF('animal', [{ b: 'photo' }, { b: 'wait' }], [{ b: 'fwd' }])])], 'a')] }],
    wrong: [{ drone: [REP(16, [IF('animal', [{ b: 'photo' }], [{ b: 'fwd' }])])] }],
  },
];
