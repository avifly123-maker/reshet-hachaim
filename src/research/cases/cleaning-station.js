// תעלומה (בינוני, השונית): תחנת הניקוי נסגרה.
// Many reef fish look scratched and tired, and fewer and fewer fish stay on the reef. The cleaner wrasses that kept a
// cleaning station on a big coral head (fish come there to have tiny parasites picked off) are gone. Two causes, one
// tied to the other: boats drop their anchors on the reef and break the coral heads, so the cleaners have no station
// and leave; without them the parasites multiply and the fish leave too. The anchors keep falling, so new corals are
// broken again. The fix: stop the anchors (mooring buoys, or closing the bay to boats), and then the corals grow back,
// the cleaners return by themselves and the fish follow. The traps: bringing cleaners while there is no coral head for
// a station, or planting corals from the nursery while the anchors still fall. The dilemma: closing the bay stops the
// anchors at once but uses most of the budget; buoys are cheaper and slower.
// Facts (reef.js + docs/sources.md): the cleaner wrasse keeps a cleaning station and picks parasites off visiting
// fish; on reefs where cleaners were removed there were fewer fish and fewer kinds of fish; anchors break corals,
// and in Eilat mooring buoys let boats tie up without dropping an anchor on the reef.
// Middle level: plain Hebrew, two linked causes, a trap, a dilemma.

export const CLEANING_STATION = {
  id: 'cleaning-station',
  zone: 'reef',
  level: 'middle',
  order: 2,
  title: 'תחנת הניקוי נסגרה',
  plainTitle: 'תחנת הניקוי נסגרה',
  call: 'הדגים בשונית נראים שרוטים ועייפים, ויש פחות ופחות דגים.',
  callMore: 'שומרי השונית שמו לב שהנקאים, שתמיד חיכו לדגים ליד אלמוג המוח הגדול, נעלמו. מה קרה כאן?',
  holdSeconds: 180,
  model: {
    vars: [
      { id: 'fish', kind: 'animal', init: 30, need: 0.3, birth: 0.012, death: 0.004, hungry: 0.3, leaveHungry: 0.05,
        cap: 90, leaveCrowded: 0.1, arrive: 0.35, arriveIf: 0.4, food: true },
      { id: 'cleaners', kind: 'animal', init: 0.6, need: 0.4, birth: 0.015, death: 0.005, hungry: 0.3, leaveHungry: 0.06,
        cap: { of: 'corals', per: 0.45 }, leaveCrowded: 0.15, arrive: 0.1, arriveIf: 0.3, food: true },
      { id: 'parasites', kind: 'stock', init: 900 },
      { id: 'corals', kind: 'plant', init: 4 },
      { id: 'young', kind: 'plant', init: 0 },
      { id: 'anchors', kind: 'stock', init: 1 },
      { id: 'sea', kind: 'stock', init: 1 },
      { id: 'plankton', kind: 'stock', init: 400 },
    ],
    flows: [
      // the open sea brings plankton: food for the fish
      { type: 'produce', from: 'sea', to: 'plankton', rate: 40, byCap: 600 },
      { type: 'consume', eater: 'fish', food: 'plankton', need: 0.3, half: 60 },
      // fish carry tiny parasites; the cleaners pick them off and eat them
      { type: 'produce', from: 'fish', to: 'parasites', rate: 0.6, byCap: 3000 },
      { type: 'consume', eater: 'cleaners', food: 'parasites', need: 0.4, half: 150, cost: 45 },
      // many parasites wear the fish out, and they leave the reef for a cleaner place
      { type: 'consume', eater: 'parasites', food: 'fish', need: 0.0018, half: 30 },
      // an anchor that falls on the reef breaks coral heads, young ones first
      { type: 'consume', eater: 'anchors', food: 'corals', need: 0.016, half: 3 },
      { type: 'consume', eater: 'anchors', food: 'young', need: 0.14, half: 1 },
      { type: 'produce', from: 'corals', to: 'young', rate: 0.02, byCap: 12 },
      { type: 'mature', from: 'young', to: 'corals', rate: 1 / 120, cap: 12 },
      { type: 'decay', of: 'young', rate: 0.002 },
      { type: 'decay', of: 'parasites', rate: 0.01 },
      { type: 'decay', of: 'plankton', rate: 0.02 },
    ],
  },
  lights: [
    { light: 'life', id: 'fish', min: 45 },
    { light: 'life', id: 'cleaners', min: 3 },
    { light: 'regen', id: 'young', min: 2 },
    { light: 'env', id: 'parasites', max: 500 },
  ],
  lightNames: { life: 'דגים ונקאים', regen: 'אלמוגים צעירים', env: 'מעט טפילים' },
  board: [
    { id: 'fish', name: 'דגי השונית', species: 'butterflyfish', tool: 'reefcam' },
    { id: 'cleaners', name: 'נקאים', species: 'cleaner', tool: 'reefcam' },
    { id: 'parasites', name: 'טפילים על הדגים', icon: 'parasites', tool: 'reefcam', scale: 0.1 },
    { id: 'corals', name: 'ראשי אלמוג גדולים', species: 'brain', tool: 'rov' },
    { id: 'anchors', name: 'עוגנים ביום', icon: 'anchor', tool: 'rov', scale: 4 },
    { id: 'young', name: 'אלמוגים צעירים', icon: 'sprout', tool: 'quadrat' },
  ],
  visual: [
    { id: 'fish', species: 'butterflyfish', scale: 'sqrt', max: 8 },
    { id: 'fish', species: 'surgeonfish', scale: 'sqrt', max: 5 },
    { id: 'fish', species: 'grouper', scale: 'sqrt', max: 2 },
    { id: 'cleaners', species: 'cleaner', max: 6 },
    { id: 'corals', species: 'brain', plant: 'adult', max: 12 },
    { id: 'young', species: 'brain', plant: 'young', max: 8 },
  ],
  tools: [
    { id: 'reefcam', kind: 'daycam', near: 'brain', name: 'מצלמה תת־ימית', icon: 'uwcam', tell: 'המצלמה ליד אלמוג המוח סופרת דגים, נקאים, ודגים שמתגרדים בסלעים.' },
    { id: 'rov', kind: 'drone', name: 'רובוט צולל', icon: 'rov', tell: 'הרובוט שוחה לאורך השונית, סופר ראשי אלמוג וסופר כמה עוגנים נופלים ביום.' },
    { id: 'quadrat', name: 'ריבוע דגימה', icon: 'quadrat', tell: 'בריבוע סופרים אלמוגים צעירים על הסלע.' },
  ],
  ideas: [
    { id: 'buoys', title: 'מצופי עגינה', icon: 'buoy', amounts: [1], cost: 7, max: 3, effect: { add: { anchors: -0.36 } }, tech: true, place: 'buoy' },
    { id: 'close', title: 'לסגור את המפרץ לסירות', icon: 'anchor', amounts: [1], cost: 34, max: 1, effect: { add: { anchors: -1 } } },
    { id: 'cleaners', title: 'להביא נקאים', icon: 'species:cleaner', amounts: [3], cost: 5, effect: { add: { cleaners: 1 } } },
    { id: 'nursery', title: 'לשתול אלמוגים מהמשתלה', icon: 'nursery', amounts: [3], cost: 9, max: 2, effect: { add: { young: 1 } }, place: 'nursery' },
    { id: 'fish', title: 'להביא דגים', icon: 'species:butterflyfish', amounts: [10], cost: 5, effect: { add: { fish: 1 } } },
  ],
  after: {
    buoys: { test: 'anchors', below: 0.05, no: 'הסירות נקשרות למצוף. אבל עדיין יש סירות שמטילות עוגן על השונית.', ok: 'עכשיו כל הסירות נקשרות למצופים. אף עוגן לא נופל על האלמוגים.' },
    close: 'המפרץ נסגר לסירות. אף עוגן לא נופל על השונית.',
    cleaners: { test: 'corals', below: 6, no: 'הנקאים לא מצאו אלמוג גדול לפתוח בו תחנה, ועזבו.', ok: 'הנקאים מצאו אלמוג ופתחו תחנת ניקוי.' },
    nursery: { test: 'anchors', below: 0.05, no: 'שתלנו אלמוגים צעירים, אבל העוגנים שוברים גם אותם.', ok: 'האלמוגים הצעירים נשתלו, ואין עוגנים שישברו אותם.' },
    fish: 'דגים חדשים הגיעו, אבל גם עליהם עולים טפילים.',
  },
  hints: [
    'מי מנקה את הדגים? הציבו מצלמה תת־ימית ליד אלמוג המוח.',
    'הנקאי פותח תחנה ליד ראש אלמוג גדול. כמה ראשי אלמוג נשארו?',
    'משהו שובר את האלמוגים כל יום. הרובוט הצולל יכול לראות מה נופל מלמעלה.',
    'גם אחרי שהעוגנים מפסיקים ליפול, לאלמוגים לוקח זמן לגדול.',
  ],
  guesses: [
    { id: 'anchors', text: 'העוגנים שוברים את האלמוגים, ולכן לנקאים אין תחנה', icon: 'anchor', right: true },
    { id: 'cleaners', text: 'הנקאים עזבו בלי סיבה', icon: 'species:cleaner' },
    { id: 'food', text: 'אין מספיק אוכל לדגים', icon: 'species:plankton' },
    { id: 'heat', text: 'המים חמים מדי', icon: 'sensor' },
  ],
  dilemma: {
    at: 60,
    title: 'סירות מעל השונית',
    text: 'כל יום מגיעות סירות, ועוגנים נופלים על האלמוגים. מה עושים?',
    options: [
      { idea: 'close', plus: 'אף עוגן לא נופל, כבר מהיום', minus: 'יקר מאוד, ונשאר מעט תקציב' },
      { idea: 'buoys', plus: 'הסירות נקשרות למצוף ולא לאלמוג', minus: 'צריך כמה מצופים, ולוקח זמן' },
    ],
    later: 'עוד לא. קודם נמדוד.',
  },
  solved: 'העוגנים הפסיקו לשבור את האלמוגים, ראשי האלמוג גדלו, הנקאים פתחו שוב תחנת ניקוי, והדגים חזרו לשונית.',
  learned: 'לפעמים הבעיה של הדגים מתחילה בסלע: בלי אלמוג אין תחנה, ובלי תחנה אין ניקוי.',
  realStory: 'בשונית שהוציאו ממנה את הנקאים, חוקרים מצאו אחרי זמן פחות דגים ופחות סוגי דגים. באילת קושרים את הסירות למצופי עגינה, כדי שהעוגנים לא ישברו אלמוגים.',
  source: 'tikun',
  stars: { thrift: 22 },   // two or three buoys; the nursery on top, or closing the bay, cost more
  budget: 60,
  tests: {
    within: 700,
    traps: {
      'cleaners with no coral head': [{ t: 30, idea: 'cleaners' }, { t: 40, idea: 'cleaners' }],
      'corals while the anchors fall': [{ t: 30, idea: 'nursery' }, { t: 40, idea: 'nursery' }],
      'bringing fish': [{ t: 30, idea: 'fish' }, { t: 40, idea: 'fish' }],
      'one buoy only': [{ t: 30, idea: 'buoys' }],
      'cleaners and corals, anchors still falling': [{ t: 30, idea: 'nursery' }, { t: 35, idea: 'cleaners' }, { t: 45, idea: 'cleaners' }],
    },
    fixes: {
      'three buoys': [{ t: 30, idea: 'buoys' }, { t: 35, idea: 'buoys' }, { t: 40, idea: 'buoys' }],
      'closing the bay': [{ t: 30, idea: 'close' }],
      'three buoys and the nursery': [{ t: 30, idea: 'buoys' }, { t: 35, idea: 'buoys' }, { t: 40, idea: 'buoys' }, { t: 45, idea: 'nursery' }],
      'cleaners first, then buoys': [{ t: 30, idea: 'cleaners' }, { t: 100, idea: 'buoys' }, { t: 105, idea: 'buoys' }, { t: 110, idea: 'buoys' }],
    },
  },
  scene: {
    dayFrac: 0.38,
    decor: [['table', 1, 2], ['branching', 1, 3], ['softcoral', 1, 2], ['seafan', 1, 2], ['seagrass', 1, 3], ['sponge', 1, 2]],
  },
};
