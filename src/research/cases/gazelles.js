// תעלומה (מתקדמים, החורש): הצבאים נעלמים.
// Fewer gazelles are seen in the grove each year, and almost no fawns. Three causes in one loop: (1) jackals: the
// open garbage and the leftovers by the farm feed many more jackals than the grove can feed, and they find the hidden
// fawns; (2) the road along the grove: gazelles are hit by cars when they cross it; (3) the road and the fences cut
// the herd off, so no gazelles come from other herds to make up for the losses. Moving jackals away does not hold
// while the garbage is there (new ones come); a fence along the road saves gazelles from the cars but closes the last
// way in. Ways that heal: closed bins with a passage for animals under the road (the herd heals and new gazelles come
// in), or closed bins, a fence along the road and gazelles brought from a big herd, or a fenced park with gazelles
// brought in, as in the Gazelle Valley in Jerusalem. Traps: moving jackals away, bringing gazelles while jackals and
// cars still take them, warning signs alone, a fenced park with nobody brought in, the garbage left open.
// Dilemma: the jackals are many: move them away (fast, others come) or close the garbage (slow: jackals leave as
// their food runs out).
// Facts (docs/sources.md): about 5,000 mountain gazelles are left in Israel, the species' last stronghold; roads,
// railways and fences cut herds apart; road collisions grew from 14 to 86 a year (2009 to 2017); golden jackals and
// wolves fed by people's garbage and farm leftovers take fawns, most in their first month; invasive plants such as
// the tree of heaven take the place of the plants gazelles eat; the study asks for wildlife crossings, corridors and
// less garbage (Yom-Tov et al., Oryx 2020, via Times of Israel). Gazelle Valley, Jerusalem: a ring road cut the
// gazelles off, dogs and jackals took them and cars hit them, until three were left; a fenced park of about 25 ha
// and a dozen gazelles brought in grew to about 80 (Phys.org / AFP 2021).
// Advanced level: plain Hebrew, three causes in a loop, several traps, the clock restarts. Gentle wording: jackals
// "find the fawns", gazelles "are hit on the road"; nothing of it is shown, and no jackal is on the island.

export const GAZELLES = {
  id: 'gazelles',
  zone: 'grove',
  level: 'advanced',
  order: 4,
  title: 'הצבאים נעלמים',
  plainTitle: 'הצבאים נעלמים',
  call: 'פעם ראו כאן עדר גדול של צבאים. היום רואים רק מעט צבאים, וכמעט אין עופרים.',
  callMore: 'בלילה שומעים הרבה תנים ליד הרפת. ליד החורש עובר כביש, ומשני צדיו יש גדרות. לאן נעלמים הצבאים?',
  holdSeconds: 240,
  model: {
    vars: [
      { id: 'gazelle', kind: 'animal', init: 14, need: 0.12, birth: 0, death: 0.003, hungry: 0.35, leaveHungry: 0.03,
        cap: 45, leaveCrowded: 0.05, arrive: 0.09, arriveIf: 0.3, arriveBy: 'link', food: true },
      { id: 'fawns', kind: 'plant', init: 1 },          // fawns hidden in the bushes in their first weeks
      { id: 'jackal', kind: 'animal', init: 30, need: 0.2, birth: 0.012, death: 0.006, hungry: 0.45, leaveHungry: 0.06,
        cap: 55, leaveCrowded: 0.1, arrive: 0.4, arriveIf: 0.45, food: true, preyHalf: 40 },
      { id: 'garbage', kind: 'stock', init: 420 },      // open garbage and leftovers by the farm
      { id: 'dump', kind: 'stock', init: 1 },
      { id: 'wild', kind: 'stock', init: 120 },         // what a jackal finds in the grove itself (mice, fruit, insects)
      { id: 'soil', kind: 'stock', init: 1 },
      { id: 'grass', kind: 'stock', init: 420 },        // grass, young leaves and shoots that gazelles eat
      { id: 'weeds', kind: 'stock', init: 1 },          // tree of heaven, an invasive tree that takes the grass's place
      { id: 'road', kind: 'stock', init: 1 },           // how dangerous the road is for a gazelle that crosses it
      { id: 'hits', kind: 'stock', init: 2 },           // gazelles hit on the road lately
      { id: 'link', kind: 'stock', init: 0.12 },        // the way to other herds: almost closed by the road and fences
      { id: 'park', kind: 'stock', init: 0 },           // a fenced park, like the Gazelle Valley in Jerusalem
    ],
    flows: [
      // gazelles eat grass and young leaves; the invasive trees take part of the place where they grow
      { type: 'produce', from: 'soil', to: 'grass', rate: 8, byCap: 800, season: { winter: 1.2, spring: 1.5, summer: 0.6, autumn: 0.7 } },
      { type: 'consume', eater: 'gazelle', food: 'grass', need: 0.12, half: 100 },
      { type: 'consume', eater: 'weeds', food: 'grass', need: 1.2, half: 100 },
      { type: 'decay', of: 'grass', rate: 0.002 },
      // fawns: born to the herd, hidden in the bushes, grown up after some weeks
      { type: 'produce', from: 'gazelle', to: 'fawns', rate: 0.02, byCap: 40 },
      { type: 'mature', from: 'fawns', to: 'gazelle', rate: 1 / 50 },
      { type: 'decay', of: 'fawns', rate: 0.004 },
      // jackals: garbage, what the grove offers, and fawns (a fence round a park keeps them away from the fawns)
      { type: 'consume', eater: 'jackal', food: 'garbage', need: 0.2, half: 100 },
      { type: 'consume', eater: 'jackal', food: 'wild', need: 0.2, half: 60 },
      { type: 'produce', from: 'dump', to: 'garbage', rate: 12, byCap: 600 },
      { type: 'decay', of: 'garbage', rate: 0.01 },
      { type: 'produce', from: 'soil', to: 'wild', rate: 1, byCap: 150 },
      { type: 'prey', pred: 'jackal', prey: 'fawns', attack: 0.004, handling: 1, refuge: 0.2, refugeOf: { of: 'park', per: 80 } },
      { type: 'prey', pred: 'jackal', prey: 'gazelle', attack: 0.00005, handling: 3, refuge: 3, refugeOf: { of: 'park', per: 100 } },
      // the road
      { type: 'consume', eater: 'road', food: 'gazelle', need: 0.1, half: 8, cache: { to: 'hits', share: 1 } },
      { type: 'decay', of: 'hits', rate: 0.006 },
    ],
  },
  lights: [
    { light: 'life', id: 'gazelle', min: 25 },
    { light: 'life', id: 'jackal', max: 25 },
    { light: 'regen', id: 'fawns', min: 3 },
    { light: 'env', id: 'garbage', max: 80 },
    { light: 'env', id: 'grass', min: 120 },
  ],
  lightNames: { life: 'צבאים ותנים', regen: 'עופרים', env: 'בלי אשפה פתוחה, מספיק מזון לצבאים' },
  board: [
    { id: 'gazelle', name: 'צבאים', species: 'gazelle', tool: 'forestcam' },
    { id: 'fawns', name: 'עופרים', icon: 'fawn', tool: 'drone' },
    { id: 'jackal', name: 'תנים', icon: 'jackal', tool: 'nightcam' },
    { id: 'garbage', name: 'אשפה פתוחה ושאריות ליד הרפת', icon: 'garbage', tool: 'drone', scale: 0.1 },
    { id: 'hits', name: 'צבאים שנפגעו בכביש לאחרונה', icon: 'road', tool: 'drone' },
    { id: 'grass', name: 'עשב ועלים לצבאים', icon: 'grass', tool: 'quadrat', scale: 0.1 },
  ],
  visual: [
    { id: 'gazelle', species: 'gazelle', scale: 'sqrt', max: 9 },
  ],
  tools: [
    { id: 'forestcam', kind: 'daycam', near: 'oak', name: 'מצלמת שטח', icon: 'camera', tell: 'בבוקר המצלמה סופרת את הצבאים שיוצאים לרעות.' },
    { id: 'nightcam', name: 'מצלמת לילה', icon: 'camera', tell: 'בלילה המצלמה סופרת מי מסתובב בחורש וליד הרפת.' },
    { id: 'drone', name: 'רחפן ספירה', icon: 'drone', tell: 'מצלמת החום של הרחפן מוצאת עופרים שמסתתרים בין השיחים. הרחפן עף גם מעל הרפת ולאורך הכביש.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע מודדים כמה עשב ועלים יש לצבאים.' },
  ],
  ideas: [
    { id: 'bins', title: 'לסגור את האשפה ואת השאריות ליד הרפת', icon: 'bins', amounts: [1], cost: 10, max: 1, effect: { add: { dump: -1 } } },
    { id: 'move-jackals', title: 'להעביר 15 תנים למקום אחר', icon: 'jackal', amounts: [1], cost: 6, effect: { add: { jackal: -15 } } },
    { id: 'crossing', title: 'מעבר לחיות מתחת לכביש, וגדר שמובילה אליו', icon: 'underpass', amounts: [1], cost: 24, max: 1, effect: { add: { road: -0.85, link: 0.88 } } },
    { id: 'roadfence', title: 'גדר לאורך הכביש', icon: 'fence', amounts: [1], cost: 8, max: 1, effect: { add: { road: -0.85, link: -0.12 } } },
    { id: 'signs', title: 'שלטים שמזהירים נהגים מפני צבאים', icon: 'sign', amounts: [1], cost: 3, max: 1, effect: { add: { road: -0.2 } } },
    { id: 'bring', title: 'להביא צבאים מעדר גדול', icon: 'species:gazelle', amounts: [10], cost: 1.2, perUnit: true, max: 2, effect: { add: { gazelle: 1 } } },
    { id: 'park', title: 'גדר סביב כל החורש, כמו בעמק הצבאים', icon: 'parkfence', amounts: [1], cost: 26, max: 1, effect: { add: { park: 1, road: -1, link: -1 } } },
    { id: 'weeds', title: 'לעקור את עצי האילנתה הפולשים', icon: 'weeds', amounts: [1], cost: 4, max: 1, effect: { add: { weeds: -1 } } },
  ],
  after: {
    bins: { test: 'jackal', below: 20, no: 'הפחים סגורים, ורוב התנים כבר הלכו לחפש אוכל במקום אחר.', ok: 'הפחים סגורים, והשאריות ליד הרפת מכוסות. התנים עוד מחפשים, אבל מוצאים פחות.' },
    'move-jackals': 'חמישה עשר תנים הועברו רחוק מכאן. האשפה ליד הרפת עדיין פתוחה.',
    crossing: 'המעבר מתחת לכביש מוכן, וגדר נמוכה מובילה אליו את הצבאים.',
    roadfence: 'לאורך הכביש יש גדר. צבאים כבר לא קופצים לכביש. אבל הם גם לא יכולים לעבור לצד השני.',
    signs: 'לאורך הכביש יש שלטים חדשים: "זהירות, צבאים".',
    bring: { test: 'jackal', below: 25, no: 'הגיעו עשרה צבאים מעדר גדול, והם מתחילים להכיר את החורש.', ok: 'הגיעו עשרה צבאים מעדר גדול. אבל התנים והכביש עדיין כאן.' },
    park: 'סביב כל החורש יש גדר, כמו בעמק הצבאים בירושלים. תנים ומכוניות לא נכנסים. גם צבאים מבחוץ לא.',
    weeds: 'עצי האילנתה נעקרו. במקומם יצמח עשב.',
  },
  surprises: [
    { id: 'jackals-back', idea: 'move-jackals', test: 'jackal', above: 45, text: 'הפתעה: אחרי כמה לילות שוב יש הרבה תנים. תנים חדשים הגיעו בשביל האשפה.' },
    { id: 'jackals-leave', idea: 'bins', test: 'jackal', below: 20, text: 'בלילה שומעים הרבה פחות יללות. בלי אשפה, רוב התנים הלכו לחפש אוכל במקום אחר.' },
    { id: 'brought-lost', idea: 'bring', test: 'gazelle', below: 12, text: 'חלק מהצבאים שהבאנו נפגעו בכביש, ואת רוב העופרים שלהם מצאו התנים.' },
    { id: 'fence-cut', idea: 'roadfence', test: 'hits', below: 1.5, text: 'כבר הרבה זמן אף צבי לא נפגע בכביש. אבל גם אף צבי חדש לא הגיע: הגדר סגרה את הדרך.' },
    { id: 'park-safe', idea: 'park', test: 'fawns', above: 6, text: 'בתוך הגדר העופרים בטוחים מתנים וממכוניות. אבל אף צבי מעדר אחר לא יכול להיכנס.' },
    { id: 'signs-night', idea: 'signs', test: 'hits', above: 3, text: 'השלטים עוזרים קצת ביום. בלילה קשה לראות צבי שקופץ לכביש.' },
    { id: 'crossing-cam', idea: 'crossing', test: 'gazelle', above: 18, text: 'המצלמה במעבר צילמה בלילה צבי שעבר מתחת לכביש! הוא הגיע מעדר אחר.' },
    { id: 'first-fawns', test: 'fawns', above: 3, text: 'בין השיחים שוכב עופר קטן, בשקט, ומחכה. עכשיו יותר עופרים גדלים.' },
    { id: 'weeds-grass', idea: 'weeds', test: 'grass', above: 600, text: 'איפה שעמדו עצי האילנתה צומח עכשיו עשב, והצבאים באים לרעות בו.' },
  ],
  mainFix: ['bins', 'crossing'],
  hints: [
    'מי מסתובב בלילה ליד הרפת? מצלמת לילה תספור.',
    'מה התנים אוכלים? אם האוכל נשאר, יבואו תנים חדשים.',
    'עופר קטן שוכב בשקט בין השיחים. לרחפן יש מצלמת חום שיכולה למצוא אותו.',
    'מאיפה יבואו צבאים חדשים, כשהכביש והגדרות סוגרים את הדרך?',
    'גדר יכולה לשמור על הצבאים, אבל היא גם סוגרת את הדרך. מה עדיף כאן?',
  ],
  guesses: [
    { id: 'all', text: 'תנים שאוכלים מהאשפה, הכביש, וגדרות שסוגרות את הדרך לעדרים אחרים', icon: 'jackal', right: true },
    { id: 'food', text: 'אין מספיק אוכל לצבאים', icon: 'grass' },
    { id: 'moved', text: 'הצבאים עברו לגור במקום אחר', icon: 'species:gazelle' },
    { id: 'jackals', text: 'רק התנים. צריך להרחיק אותם', icon: 'jackal' },
  ],
  dilemma: {
    at: 50,
    title: 'יותר מדי תנים',
    text: 'בכל לילה יש ליד הרפת עשרות תנים, והעופרים נעלמים. מה עושים קודם?',
    options: [
      { idea: 'move-jackals', plus: 'כבר הלילה יהיו פחות תנים', minus: 'האשפה נשארת, ותנים אחרים יבואו' },
      { idea: 'bins', plus: 'בלי אשפה, התנים ילכו בעצמם', minus: 'לוקח כמה שבועות עד שהם הולכים' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'האשפה סגורה ורוב התנים הלכו, הצבאים עוברים בבטחה מתחת לכביש, ועופרים גדלים בין השיחים. העדר גדל שוב.',
  learned: 'צבאים לא נעלמים מסיבה אחת. כשמתקנים את האוכל של התנים, את הכביש ואת הדרך לעדרים אחרים, העדר חוזר לגדול.',
  realStory: 'בירושלים נשארו לפני כמה שנים רק שלושה צבאים בעמק אחד. כביש סגר את הדרך החוצה, כלבים ותנים צדו אותם, ומכוניות פגעו בהם. גידרו את העמק, הביאו אליו 12 צבאים, והיום חיים שם כ־80. בכל ישראל נשארו כ־5,000 צבאים ארץ־ישראליים, וזה המקום האחרון בעולם שבו חיים עוד הרבה צבאים כאלה.',
  source: 'tzvaim',
  stars: { thrift: 34 },   // closed bins (10) and the crossing (24) = 34; bins, a road fence and gazelles brought in = 30
  budget: 70,
  tests: {
    within: 1100,
    traps: {
      'moving jackals away': [{ t: 30, idea: 'move-jackals' }, { t: 60, idea: 'move-jackals' }],
      'bringing gazelles': [{ t: 30, idea: 'bring' }, { t: 35, idea: 'bring' }],
      'only the bins': [{ t: 30, idea: 'bins' }],
      'only the crossing': [{ t: 30, idea: 'crossing' }],
      'bins, signs and new gazelles': [{ t: 30, idea: 'bins' }, { t: 33, idea: 'signs' }, { t: 36, idea: 'bring' }],
      'bins and new gazelles, the road open': [{ t: 30, idea: 'bins' }, { t: 33, idea: 'bring' }, { t: 36, idea: 'bring' }],
      'a park, but the garbage stays': [{ t: 30, idea: 'park' }, { t: 33, idea: 'bring' }],
      'moving jackals and a crossing': [{ t: 30, idea: 'move-jackals' }, { t: 33, idea: 'crossing' }, { t: 60, idea: 'move-jackals' }],
      'pulling out the invasive trees': [{ t: 30, idea: 'weeds' }, { t: 33, idea: 'signs' }],
    },
    fixes: {
      'closed bins and a crossing': [{ t: 30, idea: 'bins' }, { t: 33, idea: 'crossing' }],
      'bins, a road fence and new gazelles': [{ t: 30, idea: 'bins' }, { t: 33, idea: 'roadfence' }, { t: 36, idea: 'bring' }],
      'bins and a park, like Gazelle Valley': [{ t: 30, idea: 'bins' }, { t: 33, idea: 'park' }, { t: 36, idea: 'bring' }],
      'the crossing first, the bins later': [{ t: 30, idea: 'crossing' }, { t: 200, idea: 'bins' }],
      'moving jackals first, then the right way': [{ t: 30, idea: 'move-jackals' }, { t: 60, idea: 'bins' }, { t: 63, idea: 'crossing' }],
      'bins and a road fence, and patience': [{ t: 30, idea: 'bins' }, { t: 33, idea: 'roadfence' }],
    },
  },
  scene: {
    season: 1,   // spring: the fawns are born
    dayFrac: 0.3,   // early morning: gazelles graze
    decor: [['oak', 1, 2], ['carob', 1, 2], ['buckthorn', 1, 3], ['mastic', 1, 3], ['anemone', 1, 4], ['cyclamen', 1, 3]],
  },
};
