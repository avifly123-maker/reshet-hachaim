// סדנת הרובוט (1.4.3, set 4): the workshop's missions. The child chooses a robot from the garage (or the one on the
// bench) and takes it to a mission on its zone's island; the engine runs the program with that robot's parts and
// numbers (engine/build.js), so the build matters as much as the program. Every mission is built on a slot of
// mission-kinds.js SLOTS (zone, form, what it tests). tools/validate-robot-missions.mjs checks every mission:
//   - at least three ways that work, with at least two different robots; an empty program fails; every `wrong` fails
//   - the robots of the ways use only parts open at the mission's step (workshop.js earn 'wk:<n>' ≤ step)
//   - one way can be built by a beginner (a ready robot with other wheels, tools and sensors only), unless kids: false
//   - texts have a full form (f) and a vocalised one (k)
// A mission is a robot-lab level (the same fields as the lessons: map, items, tools0, home, goal, blocks, par) plus:
//   mission: true, slot: index in SLOTS[zone], step: the workshop step it opens at (and whose parts its ways use),
//   need: what kind of robot fits (a hint shown before leaving), end: the last words, after it is done,
//   ways: [{ robot, prog }]   robot = a ready robot key, or { from: <preset>, ...overrides } (missionBuild below)
//   wrong: [{ robot?, prog }] (robot: the first way's when left out)
// Missions open one after another in each zone, once the workshop reached their step (src/robolab/missions.js).
const fw = (n = 1) => Array.from({ length: n }, () => ({ b: 'fwd' }));
const R = { b: 'right' }, L = { b: 'left' };
const REP = (n, body) => ({ b: 'repeat', n, body });
const UNTIL = (c, body) => ({ b: 'until', c, body });
const IF = (c, then, els = []) => ({ b: 'if', c, then, else: els });
const row = (t, xs, y, extra = {}) => xs.map((x) => ({ t, x, y, ...extra }));

export const MISSIONS = [
  // ── אמזונס: גובה ושכבות
  {
    id: 'wm-am-6', zone: 'amazon', slot: 5, step: 1, mission: true, concept: 'mission',
    title: { f: 'זרעים לאגוטי', k: 'זְרָעִים לָאָגוּטִי' },
    say: [{ f: 'האגוטי קובר אגוזים בקרקע היער ושוכח חלק מהם, ומהם צומחים עצים חדשים. היום הרובוט שלכם עוזר לו: שותלים שלושה זרעים במקומות המסומנים. שימו לב לבוץ!', k: 'הָאָגוּטִי קוֹבֵר אֱגוֹזִים בְּקַרְקַע הַיַּעַר וְשׁוֹכֵחַ חֵלֶק מֵהֶם, וּמֵהֶם צוֹמְחִים עֵצִים חֲדָשִׁים. הַיּוֹם הָרוֹבּוֹט שֶׁלָּכֶם עוֹזֵר לוֹ: שׁוֹתְלִים שְׁלוֹשָׁה זְרָעִים בַּמְּקוֹמוֹת הַמְּסֻמָּנִים. שִׂימוּ לֵב לַבֹּץ!' }],
    need: { f: 'רובוט עם מיכל זרעים. בבוץ גלגלים רגילים נתקעים, אז עוקפים אותו.', k: 'רוֹבּוֹט עִם מְכַל זְרָעִים. בַּבֹּץ גַּלְגַּלִּים רְגִילִים נִתְקָעִים, אָז עוֹקְפִים אוֹתוֹ.' },
    end: { f: 'שלושה זרעים באדמה. בעוד כמה שנים יעמדו כאן עצים צעירים.', k: 'שְׁלוֹשָׁה זְרָעִים בָּאֲדָמָה. בְּעוֹד כַּמָּה שָׁנִים יַעַמְדוּ כָּאן עֵצִים צְעִירִים.' },
    tools: ['robot'], blocks: ['fwd', 'back', 'right', 'left', 'plant', 'repeat', 'if'],
    map: { rows: ['#########', '#...mm..#', '#.......#', '#########'] }, home: { x: 1, y: 1 },
    tools0: { robot: { x: 1, y: 1, dir: 1 } },
    items: [{ t: 'seed', x: 2, y: 1 }, { t: 'seed', x: 5, y: 2 }, { t: 'seed', x: 7, y: 2 }],
    goal: { all: [{ t: 'done', item: 'seeds' }] }, par: 9,
    ways: [
      { robot: 'gardener', prog: { robot: [{ b: 'fwd' }, { b: 'plant' }, R, { b: 'fwd' }, L, ...fw(3), { b: 'plant' }, ...fw(2), { b: 'plant' }] } },
      { robot: 'gardener', prog: { robot: [{ b: 'fwd' }, { b: 'plant' }, R, { b: 'fwd' }, L, REP(5, [{ b: 'fwd' }, IF('spot', [{ b: 'plant' }])])] } },
      { robot: { from: 'gardener', tools: ['seedbox', 'scoop'], sensors: ['color'] }, prog: { robot: [R, { b: 'fwd' }, L, { b: 'fwd' }, L, { b: 'fwd' }, { b: 'plant' }, { b: 'back' }, R, ...fw(3), { b: 'plant' }, ...fw(2), { b: 'plant' }] } },
    ],
    wrong: [
      { prog: { robot: [{ b: 'fwd' }, { b: 'plant' }, ...fw(3)] } },                                     // straight into the mud
      { robot: 'picker', prog: { robot: [{ b: 'fwd' }, { b: 'plant' }] } },                               // no seed box
      { robot: { from: 'gardener', sensors: ['distance'] }, prog: { robot: [{ b: 'fwd' }, { b: 'plant' }, R, { b: 'fwd' }, L, REP(5, [{ b: 'fwd' }, IF('spot', [{ b: 'plant' }])])] } },   // no colour sensor to see the spots
    ],
  },

  // ── החורש: תזמון ועונות
  {
    id: 'wm-gr-2', zone: 'grove', slot: 1, step: 2, mission: true, concept: 'mission',
    title: { f: 'שריפה ביער', k: 'שְׂרֵפָה בַּיַּעַר' },
    say: [{ f: 'שלושה מוקדי אש קטנים התחילו בחורש. צריך לכבות אותם מהר, לפני שהאש תתפשט. איזה רובוט יגיע בזמן?', k: 'שְׁלוֹשָׁה מוֹקְדֵי אֵשׁ קְטַנִּים הִתְחִילוּ בַּחֹרֶשׁ. צָרִיךְ לְכַבּוֹת אוֹתָם מַהֵר, לִפְנֵי שֶׁהָאֵשׁ תִּתְפַּשֵּׁט. אֵיזֶה רוֹבּוֹט יַגִּיעַ בַּזְּמַן?' }],
    need: { f: 'מתזה למים. רובוט כבד מדי לא יגיע בזמן.', k: 'מַתָּזָה לְמַיִם. רוֹבּוֹט כָּבֵד מִדַּי לֹא יַגִּיעַ בַּזְּמַן.' },
    end: { f: 'האש כבתה, והחורש נשאר ירוק.', k: 'הָאֵשׁ כָּבְתָה, וְהַחֹרֶשׁ נִשְׁאַר יָרֹק.' },
    tools: ['robot'], blocks: ['fwd', 'right', 'left', 'spray', 'repeat', 'if'],
    map: { rows: ['########', '#......#', '#TTTTT.#', '#......#', '########'] }, home: { x: 1, y: 1 },
    tools0: { robot: { x: 1, y: 1, dir: 1 } },
    items: [{ t: 'fire', x: 3, y: 1 }, { t: 'fire', x: 6, y: 2 }, { t: 'fire', x: 3, y: 3 }],
    goal: { all: [{ t: 'done', item: 'fires' }, { t: 'steps', max: 17 }] }, par: 12,
    ways: [
      { robot: { from: 'gardener', tools: ['sprayer'] }, prog: { robot: [{ b: 'fwd' }, { b: 'spray' }, ...fw(4), R, { b: 'spray' }, ...fw(2), R, ...fw(2), { b: 'spray' }] } },
      { robot: { from: 'gardener', tools: ['sprayer'], sensors: ['camera', 'distance'] }, prog: { robot: [REP(5, [IF('fire', [{ b: 'spray' }]), { b: 'fwd' }]), R, { b: 'spray' }, ...fw(2), R, REP(3, [IF('fire', [{ b: 'spray' }]), { b: 'fwd' }])] } },
      { robot: { from: 'gardener', wheels: 'wheel_l', tools: ['sprayer', 'claw'] }, prog: { robot: [{ b: 'fwd' }, { b: 'spray' }, REP(4, [{ b: 'fwd' }]), R, { b: 'spray' }, REP(2, [{ b: 'fwd' }]), R, REP(2, [{ b: 'fwd' }]), { b: 'spray' }] } },
    ],
    wrong: [
      { robot: 'gardener', prog: { robot: [{ b: 'fwd' }, { b: 'spray' }] } },                                   // no sprayer
      { prog: { robot: [{ b: 'fwd' }, { b: 'spray' }, ...fw(4), R, { b: 'spray' }] } },                         // one fire left
      { prog: { robot: [{ b: 'fwd' }, { b: 'spray' }, R, R, R, R, ...fw(4), R, { b: 'spray' }, ...fw(2), R, ...fw(2), { b: 'spray' }] } },   // too slow: turning round on the way
    ],
  },

  // ── השונית: זרם ועדינות
  {
    id: 'wm-rf-3', zone: 'reef', slot: 2, step: 2, mission: true, concept: 'mission',
    title: { f: 'דגים בתחנת הניקוי', k: 'דָּגִים בְּתַחֲנַת הַנִּקּוּי' },
    say: [{ f: 'ליד החוף יש תחנת ניקוי: דגים באים אל הנקאי, והוא מנקה מהם טפילים. הרובוט נוסע על החוף, מסתכל אל המים וסופר כמה דגים מחכים בתור. בסוף מדווחים את המספר. בכל פעם מחכים מספר אחר של דגים.', k: 'לְיַד הַחוֹף יֵשׁ תַּחֲנַת נִקּוּי: דָּגִים בָּאִים אֶל הַנַּקַּאי, וְהוּא מְנַקֶּה מֵהֶם טַפִּילִים. הָרוֹבּוֹט נוֹסֵעַ עַל הַחוֹף, מִסְתַּכֵּל אֶל הַמַּיִם וְסוֹפֵר כַּמָּה דָּגִים מְחַכִּים בַּתּוֹר. בַּסּוֹף מְדַוְּחִים אֶת הַמִּסְפָּר. בְּכָל פַּעַם מְחַכִּים מִסְפָּר אַחֵר שֶׁל דָּגִים.' }],
    need: { f: 'מצלמה כדי לראות את הדגים, ומשואה כדי לדווח.', k: 'מַצְלֵמָה כְּדֵי לִרְאוֹת אֶת הַדָּגִים, וּמַשּׂוּאָה כְּדֵי לְדַוֵּחַ.' },
    end: { f: 'ספרתם נכון! עכשיו יודעים כמה דגים התחנה מנקה.', k: 'סְפַרְתֶּם נָכוֹן! עַכְשָׁו יוֹדְעִים כַּמָּה דָּגִים הַתַּחֲנָה מְנַקָּה.' },
    tools: ['robot'], blocks: ['fwd', 'right', 'left', 'repeat', 'until', 'if', 'add', 'report'],
    map: { rows: ['#########', '#~~~~~~~#', '#.......#', '#########'] }, home: { x: 1, y: 2 },
    tools0: { robot: { x: 1, y: 2, dir: 1 } },
    variants: [
      { items: row('animal', [2, 5, 6], 1, { kind: 'parrotfish' }), goal: { all: [{ t: 'report', n: 3 }] } },
      { items: row('animal', [3, 7], 1, { kind: 'parrotfish' }), goal: { all: [{ t: 'report', n: 2 }] } },
      { items: row('animal', [1, 4, 6, 7], 1, { kind: 'parrotfish' }), goal: { all: [{ t: 'report', n: 4 }] } },
    ],
    goal: { all: [{ t: 'report', n: 3 }] }, par: 9,
    ways: [
      { robot: { from: 'gardener', tools: ['beacon'], sensors: ['camera', 'distance'] }, prog: { robot: [REP(7, [L, IF('animal', [{ b: 'add' }]), R, IF('path', [{ b: 'fwd' }])]), { b: 'report' }] } },
      { robot: { from: 'gardener', tools: ['beacon'], sensors: ['camera', 'distance'] }, prog: { robot: [UNTIL('blocked', [L, IF('animal', [{ b: 'add' }]), R, { b: 'fwd' }]), L, IF('animal', [{ b: 'add' }]), { b: 'report' }] } },
      { robot: { from: 'gardener', wheels: 'wheel_s', tools: ['beacon', 'claw'], sensors: ['camera', 'touch'] }, prog: { robot: [UNTIL('blocked', [L, IF('animal', [{ b: 'add' }]), R, { b: 'fwd' }]), L, IF('animal', [{ b: 'add' }]), { b: 'report' }] } },
    ],
    wrong: [
      { prog: { robot: [{ b: 'add' }, { b: 'add' }, { b: 'add' }, { b: 'report' }] } },                       // counts without looking
      { robot: { from: 'gardener', tools: ['beacon'], sensors: ['distance'] }, prog: { robot: [REP(7, [L, IF('animal', [{ b: 'add' }]), R, IF('path', [{ b: 'fwd' }])]), { b: 'report' }] } },   // no camera
      { robot: { from: 'gardener', sensors: ['camera', 'distance'] }, prog: { robot: [REP(7, [L, IF('animal', [{ b: 'add' }]), R, IF('path', [{ b: 'fwd' }])]), { b: 'report' }] } },   // no beacon to report with
    ],
  },
];
