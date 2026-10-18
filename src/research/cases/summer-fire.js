// תעלומה (מתקדמים, החורש): אש בקיץ.
// Every summer a fire starts by the road and runs into the grove, and every year it is bigger. Three causes in one
// loop: (1) the undergrowth is thick and dry, because the herds that used to graze here are gone; (2) the grove is a
// dense plantation of pines in rows, and after each fire the pine seeds come up as a thicket of young pines, more fuel
// for the next summer; (3) nothing stops a fire between the road and the grove (no fuel break). The oaks, terebinths
// and carobs are few, and they grow back from their roots after a fire, but the next fire comes before they grow up.
// Ways that heal: a herd that grazes the undergrowth every day (one is enough, two are slower: the goats browse the
// young oaks too); thinning the young pines again and again; and something that stops a fire at the road: a fuel
// break, or a lookout tower that sees the smoke early, or a belt of mastic bushes that burn poorly. Traps: clearing
// everything with a bulldozer (it grows back by the next summer, and the seedlings are crushed), pulling weeds and
// leaving them on the ground (dry fuel, just as before), planting many more pines, three herds (no young oaks left),
// planting broadleaf trees instead of thinning, any one or two causes fixed alone.
// Dilemma: summer is coming: the bulldozer (the undergrowth is gone at once, it grows back) or a herd (slow, every day).
// Facts (docs/sources.md): grazing by goats and cattle made Israel's first fuel break at Ramat Hanadiv (1990) and has
// proved itself as a way to prevent fires; after 1948 the herds shrank and there is much more dry vegetation; after the
// 2010 Carmel fire fuel breaks were made between forests and towns, with grazing; weeds pulled and left in the field did
// not help (Ramat Hanadiv); the Aleppo pine's cones open in the heat and its seeds come up thick after a fire, and the
// young pines must be thinned; oaks, terebinths and arbutus grow back from the roots (Izhaki, Haifa University); heavy
// goat grazing lowers the number of oak seedlings (Lempesi et al. 2017); heat makes rockrose seeds sprout (Cistaceae,
// Luna 2020); the jay buries acorns.
// Advanced level: plain Hebrew, three causes in a loop, several traps, the clock restarts. Gentle: the fire shows only
// as a few embers by the road (scene.embers) and as trees that are gone; no animal is ever in it.

const FIRE = { summer: 1, autumn: 0.35, winter: 0, spring: 0 };   // fires break out in the dry season only
const GROW = { winter: 1.5, spring: 1.6, summer: 0.15, autumn: 0.6 };   // the undergrowth grows with the rain

export const SUMMER_FIRE = {
  id: 'summer-fire',
  zone: 'grove',
  level: 'advanced',
  order: 3,
  title: 'אש בקיץ',
  plainTitle: 'אש בקיץ',
  call: 'בכל קיץ פורצת שריפה ליד הכביש ונכנסת לחורש. ובכל שנה היא גדולה יותר.',
  callMore: 'אחרי כל שריפה צומחים המון אורנים קטנים, צפופים מאוד. האלונים מתחילים לצמוח מחדש, ואז מגיעה השריפה הבאה. מה הופך את האש לכל כך גדולה?',
  holdSeconds: 240,
  model: {
    vars: [
      { id: 'pine', kind: 'plant', init: 16 },          // the pine plantation, in rows
      { id: 'pineYoung', kind: 'plant', init: 14 },     // young pines, a thicket since the last fire
      { id: 'cones', kind: 'stock', init: 0 },          // pine seeds the heat let out of the cones
      { id: 'oak', kind: 'plant', init: 5 },            // oaks, terebinths and carobs
      { id: 'oakYoung', kind: 'plant', init: 1 },       // young broadleaf trees and shoots from the roots
      { id: 'jay', kind: 'animal', init: 2, need: 0.1, birth: 0.01, death: 0.003, hungry: 0.35, leaveHungry: 0.04,
        cap: { of: 'oak', per: 0.5 }, leaveCrowded: 0.08, arrive: 0.06, arriveIf: 0.3, food: true },
      { id: 'acorns', kind: 'stock', init: 40 },
      { id: 'brush', kind: 'stock', init: 720 },        // thick dry undergrowth: the fuel
      { id: 'soil', kind: 'stock', init: 1 },           // the shrubs and grasses grow back from the soil with the rain
      { id: 'spark', kind: 'stock', init: 1 },          // fires start by the road in the dry season
      { id: 'flame', kind: 'stock', init: 0 },          // how much is burning now
      { id: 'burnt', kind: 'stock', init: 10 },         // burnt ground (it turns green again slowly)
      { id: 'rockrose', kind: 'plant', init: 1 },       // rockrose comes up after a fire: the heat wakes its seeds
      { id: 'herd', kind: 'stock', init: 0 },           // grazing herds (goats and cattle)
      { id: 'thinning', kind: 'stock', init: 0 },       // thinning the young pines, again every few years
      { id: 'breaks', kind: 'stock', init: 0 },         // a fuel break along the road
      { id: 'tower', kind: 'stock', init: 0 },          // a lookout tower: smoke is seen while the fire is small
      { id: 'belt', kind: 'plant', init: 0 },           // a belt of mastic bushes along the road (they burn poorly)
      { id: 'beltYoung', kind: 'plant', init: 0 },
    ],
    flows: [
      // the undergrowth: grows back from the soil with the rain; pine needles pile up under the pines
      { type: 'produce', from: 'soil', to: 'brush', rate: 3.2, byCap: 1000, season: GROW },
      { type: 'produce', from: 'pine', to: 'brush', rate: 0.06, byCap: 1000 },
      { type: 'decay', of: 'brush', rate: 0.0015 },
      // fires: dry undergrowth on the ground, the thicket of young pines that carries the fire up, the pine crowns
      { type: 'produce', from: 'spark', to: 'flame', rate: 0.7, help: { id: 'brush', half: 1500 }, season: FIRE },
      { type: 'produce', from: 'spark', to: 'flame', rate: 0.6, help: { id: 'pineYoung', half: 15 }, season: FIRE },
      { type: 'produce', from: 'spark', to: 'flame', rate: 0.08, season: FIRE },   // by the road something always catches
      { type: 'produce', from: 'spark', to: 'flame', rate: 0.15, help: { id: 'pine', half: 30 }, season: FIRE },
      { type: 'decay', of: 'flame', rate: 0.5 },
      // a fuel break or a belt of mastic stops a small fire at the road; from the tower it is seen while it is small
      { type: 'consume', eater: 'breaks', food: 'flame', need: 0.35, half: 0.1 },
      { type: 'consume', eater: 'belt', food: 'flame', need: 0.35, half: 0.1 },
      { type: 'consume', eater: 'tower', food: 'flame', need: 0.3, half: 0.1 },
      { type: 'mature', from: 'beltYoung', to: 'belt', rate: 1 / 100, cap: 1 },
      { type: 'produce', from: 'flame', to: 'burnt', rate: 1 },
      { type: 'decay', of: 'burnt', rate: 0.006 },
      // what the fire does: pines die, but their cones open and the seeds come up thick in winter; young pines just die;
      // oaks and young oaks grow back from the roots; the undergrowth burns and grows back with the rain
      { type: 'consume', eater: 'flame', food: 'pine', need: 0.05, half: 4, cache: { to: 'cones', share: 10 } },
      { type: 'germinate', from: 'cones', to: 'pineYoung', rate: 0.02, season: { winter: 1.5, spring: 0.8, summer: 0, autumn: 0.3 } },
      { type: 'decay', of: 'cones', rate: 0.002 },
      { type: 'consume', eater: 'flame', food: 'pineYoung', need: 0.25, half: 3 },
      { type: 'consume', eater: 'flame', food: 'oak', need: 0.02, half: 3, cache: { to: 'oakYoung', share: 1 } },
      { type: 'consume', eater: 'flame', food: 'oakYoung', need: 0.06, half: 2, cache: { to: 'oakYoung', share: 0.6 } },
      { type: 'consume', eater: 'flame', food: 'brush', need: 10, half: 1000 },
      { type: 'produce', from: 'flame', to: 'rockrose', rate: 0.6, byCap: 12 },
      { type: 'decay', of: 'rockrose', rate: 0.003 },
      // herds graze the undergrowth every day; goats browse young trees too
      { type: 'consume', eater: 'herd', food: 'brush', need: 4, half: 80 },
      { type: 'consume', eater: 'herd', food: 'oakYoung', need: 0.09, half: 10 },
      // thinning takes out most of the young pines every few years, so they do not grow into a thicket
      { type: 'consume', eater: 'thinning', food: 'pineYoung', need: 0.12, half: 4 },
      // acorns and jays: the jay buries acorns and forgets some of them
      { type: 'produce', from: 'oak', to: 'acorns', rate: 1.2, byCap: 300, season: { winter: 0.4, spring: 0.2, summer: 0.6, autumn: 2 } },
      { type: 'decay', of: 'acorns', rate: 0.01 },
      { type: 'consume', eater: 'jay', food: 'acorns', need: 0.1, half: 30, cache: { to: 'oakYoung', share: 0.2 } },
      // trees: young pines and oaks grow up while there is room; pines also seed a little without fire
      { type: 'produce', from: 'pine', to: 'pineYoung', rate: 0.004, byCap: 40 },
      { type: 'mature', from: 'pineYoung', to: 'pine', rate: 1 / 400, cap: 20 },
      { type: 'mature', from: 'oakYoung', to: 'oak', rate: 1 / 220, cap: 20 },
      { type: 'decay', of: 'pineYoung', rate: 0.001 },
      { type: 'decay', of: 'oakYoung', rate: 0.0015 },
      { type: 'decay', of: 'pine', rate: 0.0006 },
      { type: 'decay', of: 'oak', rate: 0.0003 },
    ],
  },
  lights: [
    { light: 'life', id: 'pine', min: 8 },
    { light: 'life', id: 'oak', min: 6 },
    { light: 'life', id: 'jay', min: 2 },
    { light: 'regen', id: 'oakYoung', min: 3 },
    { light: 'regen', id: 'pineYoung', max: 10 },
    { light: 'env', id: 'brush', max: 320 },
    { light: 'env', id: 'burnt', max: 18 },
  ],
  lightNames: { life: 'עצים בחורש', regen: 'צעירים, בלי סבך של אורנים', env: 'מעט סבך יבש, מעט אדמה שרופה' },
  board: [
    { id: 'pine', name: 'אורנים', species: 'pine', tool: 'drone' },
    { id: 'pineYoung', name: 'אורנים צעירים', icon: 'pinesprout', tool: 'quadrat' },
    { id: 'oak', name: 'אלונים, אלות וחרובים', species: 'oak', tool: 'drone' },
    { id: 'oakYoung', name: 'אלונים צעירים', icon: 'sprout', tool: 'quadrat' },
    { id: 'jay', name: 'עורבנים', species: 'jay', tool: 'forestcam' },
    { id: 'brush', name: 'סבך יבש', icon: 'brush', tool: 'quadrat', scale: 0.1 },
    { id: 'burnt', name: 'אדמה שרופה', icon: 'burnt', tool: 'drone' },
  ],
  visual: [
    { id: 'pine', species: 'pine', plant: 'adult', max: 12 },
    { id: 'pineYoung', species: 'pine', plant: 'young', max: 14 },
    { id: 'oak', species: 'oak', plant: 'adult', max: 9 },
    { id: 'oakYoung', species: 'oak', plant: 'young', max: 8 },
    { id: 'rockrose', species: 'rockrose', plant: 'adult', max: 8 },
    { id: 'jay', species: 'jay', max: 4 },
  ],
  tools: [
    { id: 'forestcam', kind: 'daycam', near: 'oak', name: 'מצלמת שטח', icon: 'camera', tell: 'המצלמה סופרת את העורבנים שבאים לאסוף בלוטים מהאלונים.' },
    { id: 'drone', name: 'רחפן ספירה', icon: 'drone', tell: 'הרחפן סופר אורנים, אלונים, ואת האדמה השרופה מהשריפה האחרונה.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע מודדים כמה סבך יבש יש על הקרקע, וסופרים אורנים צעירים ואלונים צעירים.' },
  ],
  ideas: [
    { id: 'herd', title: 'עדר עיזים ובקר שרועה בחורש', icon: 'herd', amounts: [1], cost: 8, max: 3, effect: { add: { herd: 1 } } },
    { id: 'breaks', title: 'קו חיץ בין הכביש לחורש', icon: 'firebreak', amounts: [1], cost: 12, max: 1, effect: { add: { breaks: 1 } } },
    { id: 'thin', title: 'לדלל את האורנים הצעירים הצפופים', icon: 'thin', amounts: [1], cost: 6, max: 1, effect: { add: { thinning: 1, pineYoung: -6 } } },
    { id: 'broadleaf', title: 'לשתול אלונים, אלות וחרובים', icon: 'species:oak', amounts: [4], cost: 2, perUnit: true, max: 2, effect: { add: { oakYoung: 1 } } },
    { id: 'tower', title: 'מגדל תצפית שרואה עשן מרחוק', icon: 'tower', amounts: [1], cost: 10, max: 1, effect: { add: { tower: 1 } } },
    { id: 'belt', title: 'לשתול רצועה של אלת המסטיק לאורך הכביש', icon: 'species:mastic', amounts: [1], cost: 7, max: 1, effect: { add: { beltYoung: 1 } } },
    { id: 'pines', title: 'לשתול עוד הרבה אורנים', icon: 'species:pine', amounts: [10], cost: 1, perUnit: true, max: 2, effect: { add: { pineYoung: 1 } } },
    { id: 'bulldozer', title: 'לפנות את כל הסבך בדחפור', icon: 'bulldozer', amounts: [1], cost: 10, max: 1, effect: { add: { brush: -600, oakYoung: -1.5, rockrose: -1 } } },
    { id: 'pull', title: 'לעקור עשבים ולהשאיר אותם בשטח', icon: 'weeds', amounts: [1], cost: 3, max: 2, effect: { add: { brush: 40 } } },
  ],
  after: {
    herd: { test: 'herd', below: 2.5, no: 'העדר רועה בחורש כל יום ואוכל את העשב והשיחים היבשים.', ok: 'שלושה עדרים בחורש. הם אוכלים הרבה סבך, וגם הרבה דברים אחרים.' },
    breaks: 'לאורך הכביש יש עכשיו רצועה רחבה בלי סבך יבש. לאש יהיה קשה לעבור בה.',
    thin: 'דיללו את האורנים הצעירים. בין העצים שנשארו יש עכשיו מרווח.',
    broadleaf: 'השתילים נשתלו. אלונים, אלות וחרובים גדלים לאט.',
    tower: 'על הגבעה עומד מגדל תצפית. ממנו רואים עשן מרחוק, כשהאש עוד קטנה.',
    belt: { test: 'belt', below: 0.6, no: 'השתילים של אלת המסטיק עוד קטנים. כשיגדלו, יעמדו כמו גדר ירוקה לאורך הכביש.', ok: 'שיחי המסטיק גדלו לאורך הכביש. הם בוערים לאט, ועוצרים אש קטנה.' },
    pines: 'נשתלו עוד הרבה אורנים. החורש נראה ירוק וצפוף.',
    bulldozer: 'הדחפור פינה את הסבך. הקרקע חשופה, וגם כמה שתילים צעירים נמחצו.',
    pull: 'העשבים נעקרו ונשארו לשכב על הקרקע. בשמש הם מתייבשים מהר.',
  },
  surprises: [
    { id: 'break-stopped', idea: 'breaks', test: 'flame', above: 0.04, text: 'שריפה פרצה ליד הכביש, הגיעה לקו החיץ ונעצרה. היא לא נכנסה לחורש.' },
    { id: 'tower-saw', idea: 'tower', test: 'flame', above: 0.04, text: 'מהמגדל ראו עשן קטן ליד הכביש, והאש כובתה כשהייתה עוד קטנה.' },
    { id: 'bulldozer-back', idea: 'bulldozer', test: 'brush', above: 420, text: 'הפתעה: הסבך צמח בחזרה, צפוף כמו קודם. השורשים נשארו באדמה, והגשם השקה אותם.' },
    { id: 'pull-dry', idea: 'pull', test: 'burnt', above: 25, text: 'הפתעה: העשבים היבשים שהשארנו על הקרקע בערו כמו נייר.' },
    { id: 'goats-too-many', idea: 'herd', test: 'herd', above: 2.5, text: 'שלושה עדרים! העיזים כבר לא מוצאות מספיק עשב, והן אוכלות גם את העלים של האלונים הצעירים.' },
    { id: 'pine-thicket', test: 'pineYoung', above: 22, text: 'הפתעה: איפה שהאש עברה צמחו מאות אורנים קטנים, צפופים כמו מברשת. בחום של האש האצטרובלים נפתחים, והזרעים נופלים.' },
    { id: 'rockrose', test: 'rockrose', above: 6, text: 'בשטח השרוף צצו המון שתילים של לוטם. החום של האש מעורר את הזרעים שלו.' },
    { id: 'jays', test: 'jay', above: 4, text: 'יותר עורבנים בחורש. הם טומנים בלוטים באדמה, שוכחים חלק מהם, ומהם צומחים אלונים.' },
    { id: 'oaks-sprout', test: 'oak', above: 7, text: 'האלונים גדלים. ליד גזעים שחורים משריפה ישנה צומחים ענפים ירוקים מהשורשים.' },
  ],
  mainFix: ['herd', 'breaks', 'thin'],
  hints: [
    'מה בוער בשריפה? בריבוע הדגימה אפשר למדוד כמה סבך יבש יש על הקרקע.',
    'פעם רעו כאן עדרים. מה הם אכלו?',
    'אחרי שריפה האצטרובלים של האורן נפתחים, וצומחים המון אורנים צפופים. מה עושים איתם?',
    'השריפה מתחילה ליד הכביש. מה יעצור אותה לפני שהיא נכנסת לחורש?',
    'יותר עיזים זה לא תמיד יותר טוב. מה עוד הן אוכלות?',
  ],
  guesses: [
    { id: 'fuel', text: 'סבך יבש, אורנים צפופים, ואין מה שיעצור את האש ליד הכביש', icon: 'brush', right: true },
    { id: 'heat', text: 'זה רק החום של הקיץ, ואין מה לעשות', icon: 'hotsun' },
    { id: 'pines', text: 'אין מספיק עצים. צריך לשתול עוד אורנים', icon: 'species:pine' },
    { id: 'oaks', text: 'האלונים הם שבוערים הכי מהר', icon: 'species:oak' },
  ],
  dilemma: {
    at: 60,
    title: 'הקיץ מתקרב',
    text: 'עוד מעט הקיץ, והסבך בחורש גבוה ויבש. מה עושים איתו?',
    options: [
      { idea: 'bulldozer', plus: 'מיד לא יהיה סבך בכלל', minus: 'הסבך יצמח בחזרה, והדחפור מוחץ גם שתילים' },
      { idea: 'herd', plus: 'העדר אוכל את הסבך כל יום, כל השנה', minus: 'לוקח זמן עד שהסבך יורד' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'העדר שומר על הסבך נמוך, האורנים הצעירים דוללו, ואש שפורצת ליד הכביש נעצרת לפני החורש. האלונים גדלים, והחורש ירוק גם בסוף הקיץ.',
  learned: 'אש צריכה חומר שבוער. כשיש פחות סבך יבש, פחות אורנים צפופים, ומשהו שעוצר את האש ליד הכביש, החורש עומד גם בקיץ.',
  realStory: 'ברמת הנדיב הכניסו בשנת 1990 עדר שרועה בחורש, וכך נוצר קו החיץ הראשון בישראל. אחרי השריפה הגדולה בכרמל בשנת 2010 עשו קווי חיץ בין היערות לבין היישובים, ועדרים רועים בהם. וגם אחרי שריפה החורש חוזר: האצטרובלים של האורן נפתחים בחום, והאלון צומח מחדש מהשורשים.',
  source: 'efes',
  stars: { thrift: 28 },   // one herd (8), the fuel break (12) and thinning (6) = 26; a second herd or a tower costs more
  budget: 70,
  tests: {
    within: 1300,
    traps: {
      'the bulldozer': [{ t: 30, idea: 'bulldozer' }, { t: 35, idea: 'breaks' }, { t: 40, idea: 'thin' }],
      'more pines': [{ t: 30, idea: 'pines' }, { t: 35, idea: 'pines' }],
      'weeds left on the ground': [{ t: 30, idea: 'pull' }, { t: 35, idea: 'pull' }, { t: 40, idea: 'breaks' }],
      'three herds': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'herd' }, { t: 36, idea: 'herd' }, { t: 39, idea: 'breaks' }, { t: 42, idea: 'thin' }],
      'herds and thinning, no fuel break': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'herd' }, { t: 36, idea: 'thin' }],
      'herds and a fuel break, no thinning': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'herd' }, { t: 36, idea: 'breaks' }],
      'a fuel break and thinning, no herd': [{ t: 30, idea: 'breaks' }, { t: 33, idea: 'thin' }],
      'a tower and mastic, no thinning': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'tower' }, { t: 36, idea: 'belt' }],
      'broadleaf instead of thinning': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'herd' }, { t: 36, idea: 'breaks' }, { t: 39, idea: 'broadleaf' }],
    },
    fixes: {
      'one herd, a fuel break, thinning': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'breaks' }, { t: 36, idea: 'thin' }],
      'two herds, a fuel break, thinning': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'herd' }, { t: 36, idea: 'breaks' }, { t: 39, idea: 'thin' }],
      'a lookout tower instead of a fuel break': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'tower' }, { t: 36, idea: 'thin' }],
      'a mastic belt instead of a fuel break': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'herd' }, { t: 36, idea: 'belt' }, { t: 39, idea: 'thin' }],
      'the bulldozer first, then the right way': [{ t: 30, idea: 'bulldozer' }, { t: 90, idea: 'herd' }, { t: 93, idea: 'breaks' }, { t: 96, idea: 'thin' }],
      'and planting broadleaf trees too': [{ t: 30, idea: 'herd' }, { t: 33, idea: 'breaks' }, { t: 36, idea: 'thin' }, { t: 39, idea: 'broadleaf' }],
    },
  },
  scene: {
    season: 1,   // spring: the summer and its fires are coming
    dayFrac: 0.45,
    decor: [['carob', 1, 1], ['terebinth', 1, 1], ['sage', 1, 4], ['cyclamen', 1, 3], ['anemone', 1, 3]],
    stump: true,   // a black trunk from last summer's fire
    embers: { id: 'flame', above: 0.04, angle: 0.6 },   // embers by the road while a fire burns (session.js)
  },
};
