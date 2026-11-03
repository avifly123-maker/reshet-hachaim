// סדנת הרובוט (1.4.3, docs/PLAN-1.4.3.md set 2, docs/PLAN-1.4.md 7.3): the parts a child builds a robot from, with the
// numbers that matter in our simple engine (src/robolab/engine/build.js). Pure data. The rules follow the competition:
// one controller (in every chassis, with its two drive motors), up to four motors in all, up to four sensors, the tool
// points of the chassis, and a size that must fit the start area. Every part adds weight; some use more battery.
// A part is not an album card (Avi, 2.11): the robot kinds and key technologies get a card series of their own later.
//   fam   chassis | move | motor | tool | sensor | team
//   size  room it takes on the chassis;  mass  grams;  earn  as in parts.js ('start' | 'lesson:<id>' | 'chapter:<n>' |
//         'stars:<n>' | 'puzzles:<n>' | 'mission:<id>' | 'badge:<id>')
//   mesh  the Blender part it is drawn with today (src/data/robolab/parts.js ids), when there is one
// Blocks a part gives (`gives`) are the engine's actions (engine/blocks.js); sensors (`sees`) are its conditions.

export const FAMILIES = {
  chassis: { f: 'שלדה וכוח', k: 'שִׁלְדָּה וְכֹחַ' },
  move: { f: 'תנועה', k: 'תְּנוּעָה' },
  motor: { f: 'מנועים ומנגנונים', k: 'מְנוֹעִים וּמַנְגְּנוֹנִים' },
  tool: { f: 'כלים', k: 'כֵּלִים' },
  sensor: { f: 'חיישנים', k: 'חַיְשָׁנִים' },
  team: { f: 'תקשורת וצוות', k: 'תִּקְשֹׁרֶת וְצֶוֶת' },
};

// the chassis: room, tool points, battery, its own weight (the controller and two drive motors are part of it)
export const CHASSIS = {
  ch_s: { fam: 'chassis', f: 'שלדה קטנה', k: 'שִׁלְדָּה קְטַנָּה', mass: 320, room: 6, toolPoints: 2, battery: 60, earn: 'start' },
  ch_m: { fam: 'chassis', f: 'שלדה בינונית', k: 'שִׁלְדָּה בֵּינוֹנִית', mass: 460, room: 9, toolPoints: 2, battery: 80, earn: 'start' },
  ch_l: { fam: 'chassis', f: 'שלדה גדולה', k: 'שִׁלְדָּה גְּדוֹלָה', mass: 650, room: 12, toolPoints: 3, battery: 100, earn: 'chapter:4' },
};

export const PARTS = {
  // ── chassis and power
  caster: { fam: 'chassis', f: 'כדור עזר', k: 'כַּדּוּר עֵזֶר', mass: 30, size: 1, precision: 0.1, earn: 'start' },
  ballast: { fam: 'chassis', f: 'משקולת איזון', k: 'מִשְׁקֹלֶת אִזּוּן', mass: 200, size: 1, steady: 1, earn: 'chapter:3' },
  solar: { fam: 'chassis', f: 'לוח סולארי', k: 'לוּחַ סוֹלָרִי', mass: 90, size: 2, recharge: 1, earn: 'stars:20', mesh: 'solar' },

  // ── wheels and ways of moving (one set per robot). r: wheel size (speed), grip by ground, turn: how exact a turn is
  wheel_s: { fam: 'move', set: 'wheels', f: 'גלגלים קטנים', k: 'גַּלְגַּלִּים קְטַנִּים', mass: 40, size: 1, r: 0.7, turn: 0.7, grip: { ground: 1, sand: 0.2, mud: 0.3, slope: 0.6, narrow: 1 }, earn: 'start' },
  wheel_m: { fam: 'move', set: 'wheels', f: 'גלגלים בינוניים', k: 'גַּלְגַּלִּים בֵּינוֹנִיִּים', mass: 70, size: 1, r: 1, turn: 0.6, grip: { ground: 1, sand: 0.35, mud: 0.4, slope: 0.6, narrow: 0.8 }, earn: 'start' },
  wheel_l: { fam: 'move', set: 'wheels', f: 'גלגלים גדולים', k: 'גַּלְגַּלִּים גְּדוֹלִים', mass: 110, size: 2, r: 1.3, turn: 0.5, grip: { ground: 1, sand: 0.45, mud: 0.6, slope: 0.7, narrow: 0.5 }, earn: 'chapter:2' },
  wheel_wide: { fam: 'move', set: 'wheels', f: 'גלגלים רחבים לחול', k: 'גַּלְגַּלִּים רְחָבִים לְחוֹל', mass: 120, size: 2, r: 1, turn: 0.5, grip: { ground: 0.9, sand: 0.9, mud: 0.6, slope: 0.6, narrow: 0.4 }, earn: 'lesson:l4-1' },
  tracks: { fam: 'move', set: 'wheels', f: 'זחלים', k: 'זְחָלִים', mass: 220, size: 3, r: 0.8, turn: 0.4, drain: 1, grip: { ground: 1, sand: 0.8, mud: 0.9, slope: 1, narrow: 0.6 }, earn: 'chapter:5' },
  omni: { fam: 'move', set: 'wheels', f: 'גלגלים לכל הכיוונים', k: 'גַּלְגַּלִּים לְכָל הַכִּוּוּנִים', mass: 90, size: 1, r: 0.9, turn: 0.9, grip: { ground: 0.8, sand: 0.2, mud: 0.2, slope: 0.4, narrow: 1 }, earn: 'stars:30' },
  float: { fam: 'move', f: 'מצוף', k: 'מָצוֹף', mass: 80, size: 2, floats: true, earn: 'chapter:6' },
  propeller: { fam: 'move', f: 'מדחף', k: 'מַדְחֵף', mass: 60, size: 1, motorized: true, swims: true, earn: 'chapter:6' },

  // ── motors (the two drive motors come with the chassis: build.drive picks their kind) and mechanisms
  motor_big: { fam: 'motor', motor: true, f: 'מנוע גדול', k: 'מָנוֹעַ גָּדוֹל', mass: 80, size: 1, power: 3, rpm: 1, earn: 'start' },
  motor_med: { fam: 'motor', motor: true, f: 'מנוע בינוני', k: 'מָנוֹעַ בֵּינוֹנִי', mass: 45, size: 1, power: 2, rpm: 2, earn: 'start' },
  gear_fast: { fam: 'motor', gear: true, f: 'גלגלי שיניים למהירות', k: 'גַּלְגַּלֵּי שִׁנַּיִם לִמְהִירוּת', mass: 20, size: 1, speedK: 1.6, forceK: 0.6, earn: 'chapter:2' },
  gear_strong: { fam: 'motor', gear: true, f: 'גלגלי שיניים לכוח', k: 'גַּלְגַּלֵּי שִׁנַּיִם לְכֹחַ', mass: 20, size: 1, speedK: 0.6, forceK: 1.6, earn: 'chapter:2' },
  worm: { fam: 'motor', mech: true, f: 'בורג אינסופי', k: 'בֹּרֶג אֵינְסוֹפִי', mass: 30, size: 1, liftK: 1.5, holds: true, earn: 'chapter:4' },
  rack: { fam: 'motor', mech: true, f: 'מוט שיניים', k: 'מוֹט שִׁנַּיִם', mass: 35, size: 1, liftK: 1.4, earn: 'chapter:3' },
  crane: { fam: 'motor', mech: true, motor: true, f: 'מנוף וכבל', k: 'מָנוֹף וְכֶבֶל', mass: 110, size: 2, liftK: 2, reach: 1, earn: 'chapter:5' },
  lever: { fam: 'motor', mech: true, f: 'מנוף פשוט', k: 'מָנוֹף פָּשׁוּט', mass: 25, size: 1, liftK: 1.3, earn: 'start' },
  spring: { fam: 'motor', mech: true, f: 'קפיץ משגר', k: 'קְפִיץ מְשַׁגֵּר', mass: 25, size: 1, reach: 2, throws: true, earn: 'puzzles:3' },

  // ── tools on the tool points. gives: the blocks it lets the robot do; lift / push / carry: how much; motor: needs one
  pusher: { fam: 'tool', f: 'דחפן', k: 'דַּחְפָּן', mass: 60, size: 1, push: 2, gives: ['push'], earn: 'start' },
  fork: { fam: 'tool', f: 'מזלג הרמה', k: 'מַזְלֵג הֲרָמָה', mass: 90, size: 2, lift: 2, carry: 1, motor: true, gives: ['lift', 'collect'], earn: 'chapter:3' },
  scoop: { fam: 'tool', f: 'כף', k: 'כַּף', mass: 70, size: 1, carry: 3, gives: ['collect'], earn: 'start', mesh: 'bin' },
  hook: { fam: 'tool', f: 'וו', k: 'וָו', mass: 30, size: 1, lift: 1, gives: ['collect', 'lift'], earn: 'chapter:2' },
  claw: { fam: 'tool', f: 'מלקחיים', k: 'מֶלְקָחַיִם', mass: 70, size: 1, lift: 1, gentle: true, motor: true, gives: ['pick', 'collect'], earn: 'start', mesh: 'grabber' },
  arm_short: { fam: 'tool', f: 'זרוע קצרה', k: 'זְרוֹעַ קְצָרָה', mass: 60, size: 1, lift: 1, motor: true, gives: ['pick'], earn: 'start' },
  arm_long: { fam: 'tool', f: 'זרוע ארוכה', k: 'זְרוֹעַ אֲרֻכָּה', mass: 120, size: 2, lift: 1, reach: 1, motor: true, gives: ['pick'], earn: 'chapter:3' },
  arm_fold: { fam: 'tool', f: 'זרוע מתקפלת', k: 'זְרוֹעַ מִתְקַפֶּלֶת', mass: 100, size: 1, lift: 1, reach: 1, motor: true, gives: ['pick'], earn: 'chapter:5' },
  brush: { fam: 'tool', f: 'מברשת', k: 'מִבְרֶשֶׁת', mass: 40, size: 1, gentle: true, motor: true, gives: ['collect'], earn: 'chapter:2' },
  seedbox: { fam: 'tool', f: 'מיכל זרעים', k: 'מְכַל זְרָעִים', mass: 60, size: 1, seeds: 6, gives: ['plant'], earn: 'start', mesh: 'planter' },
  sprayer: { fam: 'tool', f: 'מתזה למים', k: 'מַתָּזָה לְמַיִם', mass: 90, size: 2, water: 8, gives: ['water', 'spray'], earn: 'lesson:l1-4', mesh: 'water_tank' },
  net: { fam: 'tool', f: 'רשת איסוף', k: 'רֶשֶׁת אִסּוּף', mass: 40, size: 1, carry: 5, gentle: true, gives: ['collect'], earn: 'chapter:2' },
  cammount: { fam: 'tool', f: 'מחזיק מצלמה', k: 'מַחֲזִיק מַצְלֵמָה', mass: 30, size: 1, gives: ['photo'], earn: 'start' },

  // ── sensors (up to four): sees = the conditions they give (engine/blocks.js SENSORS), events they can hear
  gyro: { fam: 'sensor', f: "ג'ירוסקופ", k: 'גִּ\'ירוֹסְקוֹפּ', mass: 15, size: 1, precision: 0.3, sees: [], earn: 'chapter:4' },
  color: { fam: 'sensor', f: 'חיישן צבע', k: 'חַיְשַׁן צֶבַע', mass: 15, size: 1, sees: ['spot', 'fruit', 'thirsty', 'coralspot', 'net', 'home'], earn: 'start' },
  distance: { fam: 'sensor', f: 'חיישן מרחק', k: 'חַיְשַׁן מֶרְחָק', mass: 15, size: 1, sees: ['path', 'blocked', 'tree', 'water'], earn: 'start' },
  touch: { fam: 'sensor', f: 'חיישן מגע', k: 'חַיְשַׁן מַגָּע', mass: 10, size: 1, sees: ['blocked'], earn: 'start' },
  humidity: { fam: 'sensor', f: 'חיישן לחות', k: 'חַיְשַׁן לַחוּת', mass: 15, size: 1, sees: ['thirsty', 'water'], earn: 'chapter:3' },
  light: { fam: 'sensor', f: 'חיישן אור', k: 'חַיְשַׁן אוֹר', mass: 10, size: 1, sees: [], hears: ['sunset'], earn: 'chapter:5' },
  camera: { fam: 'sensor', f: 'מצלמה', k: 'מַצְלֵמָה', mass: 30, size: 1, sees: ['animal', 'here_animal', 'fire'], hears: ['see_animal'], earn: 'start', mesh: 'cam' },

  // ── team
  dronepad: { fam: 'team', f: 'משגר ונחתת לרחפן', k: 'מְשַׁגֵּר וּנְחִתַּת לְרַחְפָן', mass: 90, size: 2, gives: ['launch'], earn: 'chapter:3', mesh: 'drone_pad' },
  link: { fam: 'team', f: 'קשר בין רובוטים', k: 'קֶשֶׁר בֵּין רוֹבּוֹטִים', mass: 20, size: 1, gives: ['send', 'waitmsg'], hears: ['msg'], earn: 'chapter:7' },
  beacon: { fam: 'team', f: 'משואה', k: 'מַשּׂוּאָה', mass: 25, size: 1, gives: ['report'], sees: ['home'], earn: 'start', mesh: 'antenna' },
};

// what every robot can do without a part: move and turn, wait, the counter (in the controller), the control blocks,
// the surprise blocks, and know when its battery is low
export const BASE_BLOCKS = ['fwd', 'back', 'right', 'left', 'wait', 'add', 'reset', 'repeat', 'until', 'if', 'call', 'stop',
  'fireworks', 'dance', 'beep', 'lights', 'sneeze'];
export const BASE_SEES = ['low'];
export const BASE_HEARS = ['battery_low'];

// the rules of a build (engine/build.js checks them)
export const RULES = { motors: 4, sensors: 4 };

// ready robots for beginners (Avi, 28.10: "a ready robot and three simple choices") and starting points for everyone
//   build = { chassis, wheels, drive, gear?, motors: [extra motors], tools: [on the tool points], mechs: [], sensors: [], extras: [] }
export const PRESETS = {
  gardener: { f: 'הגנן', k: 'הַגַּנָּן', build: { chassis: 'ch_m', wheels: 'wheel_m', drive: 'motor_med', motors: ['motor_med'], tools: ['seedbox', 'sprayer'], mechs: [], sensors: ['color', 'distance'], extras: ['caster'] } },
  picker: { f: 'הקוטף', k: 'הַקּוֹטֵף', build: { chassis: 'ch_m', wheels: 'wheel_m', drive: 'motor_med', motors: ['motor_med'], tools: ['claw', 'scoop'], mechs: ['lever'], sensors: ['color', 'distance'], extras: [] } },
  digger: { f: 'החזק', k: 'הֶחָזָק', build: { chassis: 'ch_l', wheels: 'tracks', drive: 'motor_big', gear: 'gear_strong', motors: ['motor_big'], tools: ['fork', 'pusher'], mechs: ['rack'], sensors: ['distance', 'touch'], extras: ['ballast'] } },
};
// the three choices a beginner makes on a ready robot
export const BEGINNER_CHOICES = ['wheels', 'tools', 'sensors'];
