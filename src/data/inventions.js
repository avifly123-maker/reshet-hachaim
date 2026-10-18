// "הממציאים": problems people really solved by learning from a creature (docs/sources.md, section הממציאים),
// the traits each card brings to the workbench, and what רובו־דע says when a try works, half works or flops.
// A card's traits come from TRAITS by species id, else from its kind (DEFAULT_TRAITS).

export const TRAIT = {
  slick: 'עור חלק במים', quiet: 'מעוף שקט', hover: 'עומד באוויר', antisting: 'לא נצרב', lightstrong: 'קל וחזק',
  shine: 'צבע מנצנץ', grip: 'אחיזה עדינה', opens: 'נפתח ונסגר לבד', glow: 'מאיר בלי חום', wave: 'שוחה בגלים',
  pulse: 'שוחה בפעימות', colorshift: 'משנה צבע', ribs: 'צלעות חזקות', hexa: 'בונה משושים', nightsee: 'רואה בחושך',
  fast: 'מהיר', hide: 'מסתתר', climb: 'מטפס', spines: 'קוצים', armor: 'שריון', float: 'צף', dig: 'חופר',
  filter: 'מסנן מים', team: 'עובדים יחד', strong: 'חזק', patient: 'סבלני ואיטי', loud: 'קולני', memory: 'זוכר מקומות',
  tall: 'גבוה', hold: 'נאחז', swim: 'שוחה', fly: 'עף', bloom: 'פורח', shelter: 'נותן מחסה', sun: 'אוהב שמש', machine: 'מכונה',
};

// species id → traits (the first one is the strongest)
export const TRAITS = {
  // אמזונס
  kapok: ['tall', 'float'], brazilnut: ['armor', 'tall'], fig: ['hold', 'climb'], cecropia: ['team', 'tall'], acai: ['tall'],
  heliconia: ['shine', 'bloom'], bromeliad: ['shelter', 'bloom'], orchid: ['shine', 'bloom'], liana: ['hold', 'climb'], fern: ['shelter'],
  glowfungus: ['glow'], waterlily: ['ribs', 'float'], leafcutter: ['team', 'strong'], orchidbee: ['shine', 'fly'], morpho: ['shine', 'fly'],
  hummingbird: ['hover', 'fast'], dartfrog: ['shine'], toucan: ['lightstrong', 'loud'], macaw: ['loud', 'shine'], sloth: ['patient', 'hold'],
  agouti: ['memory', 'dig'], howler: ['loud', 'climb'], jaguar: ['fast', 'nightsee', 'strong'], harpy: ['strong', 'fast'],
  capybara: ['swim', 'patient'], tapir: ['strong', 'swim'], fruitbat: ['nightsee', 'fly'], anteater: ['dig', 'strong'],
  kinkajou: ['nightsee', 'climb'], coati: ['climb', 'team'],
  // חורש
  oak: ['tall', 'strong'], terebinth: ['tall'], carob: ['tall', 'patient'], pine: ['opens', 'tall'], mastic: ['shelter'], buckthorn: ['shelter'],
  sage: ['bloom'], rockrose: ['bloom', 'sun'], cyclamen: ['bloom'], anemone: ['bloom', 'shine'], mushroom: ['shelter'],
  honeybee: ['hexa', 'team'], butterfly: ['shine', 'fly'], harvesterant: ['team', 'memory'], firefly: ['glow', 'fly'],
  jay: ['memory', 'fly'], blackbird: ['loud', 'fly'], chameleon: ['colorshift', 'grip', 'hide'], agama: ['sun', 'fast'],
  spinymouse: ['spines', 'fast'], porcupine: ['spines', 'armor'], hedgehog: ['spines', 'armor'], hyrax: ['grip', 'sun', 'climb'],
  gazelle: ['fast'], fox: ['nightsee', 'fast'], owl: ['quiet', 'nightsee'], hoopoe: ['dig', 'fly'], tortoise: ['armor', 'patient'], chukar: ['hide', 'fast'],
  // שונית
  reefshark: ['slick', 'fast', 'swim'], octopus: ['grip', 'colorshift', 'hide'], clownfish: ['antisting', 'swim'], jellyfish: ['pulse', 'float'],
  stingray: ['wave', 'hide'], turtle: ['armor', 'swim', 'patient'], parrotfish: ['strong', 'swim'], cleaner: ['team', 'swim'], moray: ['hide', 'strong'],
  grouper: ['strong', 'swim'], butterflyfish: ['shine', 'swim'], lionfish: ['spines', 'shine'], urchin: ['spines', 'armor'], goby: ['team', 'hide'],
  shrimp: ['dig', 'team'], starfish: ['grip', 'patient'], hermit: ['armor', 'hide'], surgeonfish: ['fast', 'swim'], seaanemone: ['shelter'],
  sponge: ['filter'], clam: ['armor', 'filter'], seagrass: ['hold', 'shelter'], branching: ['shelter'], brain: ['ribs', 'shelter'], table: ['shelter'],
  softcoral: ['shelter'], firecoral: ['shelter'], seafan: ['filter', 'shelter'], algae: ['sun'], plankton: ['float'],
  // technology cards
  rov: ['machine', 'nightsee', 'swim'], uwcam: ['machine', 'nightsee'], camera: ['machine', 'nightsee'], drone: ['machine', 'hover'], seeddrone: ['machine', 'hover'],
  buoy: ['machine', 'float'], sensor: ['machine', 'float'], weather: ['machine'], watergen: ['machine'], listener: ['machine', 'quiet'], rescue: ['machine', 'strong'],
  nursery: ['machine', 'shelter'], reefball: ['shelter', 'armor'], nestbox: ['shelter'], insecthotel: ['shelter', 'team'],
};
const KIND_TRAITS = { tree: ['tall'], palm: ['tall'], shrub: ['shelter'], herb: ['bloom'], vine: ['hold'], epiphyte: ['bloom'], fungus: ['shelter'],
  'water-plant': ['float'], coral: ['shelter'], fish: ['swim'], bird: ['fly'], insect: ['fly'], mammal: ['fast'], reptile: ['sun'] };
export function traitsOf(card) {
  const id = String(card.id || '').split(':').pop();
  if (TRAITS[id]) return TRAITS[id];
  if (card.type === 'tool') return ['machine'];
  return KIND_TRAITS[card.skind || card.spKind] || ['patient'];
}

// the problems. key: the trait that solves it; half: traits that help a little.
// real: the creature people really learned from; fact: what really happened (docs/sources.md).
export const PROBLEMS = [
  { id: 'swim', icon: 'drop', title: 'בגד שחייה מהיר', ask: 'השחיינים רוצים לגלוש במים מהר יותר. ממי אפשר ללמוד?', key: 'slick', half: ['fast', 'swim', 'wave'],
    real: 'reefshark', fact: 'העור של הכריש מכוסה בקשקשים זעירים עם חריצים, והמים זורמים עליו בקלות. לפי הרעיון הזה תפרו בגדי שחייה מהירים וצבעו ספינות.' },
  { id: 'quiet', icon: 'wind', title: 'רכבת מהירה ושקטה', ask: 'הרכבת המהירה עושה רעש גדול. איך מנמיכים את הרעש?', key: 'quiet', half: ['fly', 'patient'],
    real: 'owl', fact: 'לנוצות של התנשמת יש שוליים משוננים, וכך היא עפה בלי רעש. מהנדסים ביפן עיצבו לפי זה חלק ברכבת המהירה, והרעש ירד.' },
  { id: 'hover', icon: 'drone', title: 'רחפן קטן שעומד באוויר', ask: 'צריך רחפן קטנטן שיעמוד במקום אחד באוויר, כמו מסוק זעיר.', key: 'hover', half: ['fly', 'fast'],
    real: 'hummingbird', fact: 'יונק הדבש מנפנף בכנפיים מהר מאוד ויכול לעמוד במקום. בשנת 2011 בנו רחפן קטן בגודל של יונק דבש, שמנפנף בכנפיים כמוהו.' },
  { id: 'sting', icon: 'shield', title: 'קרם נגד צריבת מדוזות', ask: 'בים יש מדוזות שצורבות. איך שוחים בלי להיצרב?', key: 'antisting', half: ['armor', 'hide'],
    real: 'clownfish', fact: 'השושנון חי בין זרועות שושנת הים ולא נצרב, בזכות ריר מיוחד על העור שלו. חוקרים בישראל פיתחו קרם שמגן מצריבת מדוזות, בהשראת השושנון.' },
  { id: 'roof', icon: 'leaf', title: 'גג ענק, קל וחזק', ask: 'רוצים לבנות אולם זכוכית ענק. איך הגג יחזיק בלי להיות כבד?', key: 'ribs', half: ['float', 'lightstrong', 'hexa'],
    real: 'waterlily', fact: 'לעלה הענק של הוויקטוריה האמזונית יש צלעות עבות מתחת, והוא נושא משקל רב. גנן אנגלי בנה לפי הצלעות האלה בית זכוכית, ואחר כך אולם זכוכית ענק.' },
  { id: 'color', icon: 'sparkle', title: 'צבע שלא דוהה', ask: 'צבע רגיל דוהה בשמש. אפשר לעשות צבע מבריק בלי צבע?', key: 'shine', half: ['colorshift', 'bloom'],
    real: 'morpho', fact: 'הכחול של פרפר המורפו לא בא מצבע. הקשקשים בכנף בנויים כך שהאור חוזר מהם כחול ומבריק. לפי הרעיון הזה מפתחים בדים וחומרים צבעוניים בלי צבע.' },
  { id: 'grip', icon: 'hand', title: 'יד רובוט שתופסת בעדינות', ask: 'הרובוט צריך להרים ביצה בלי לשבור אותה, וגם אבן כבדה.', key: 'grip', half: ['hold', 'strong'],
    real: 'octopus', fact: 'הזרוע של התמנון מתעגלת סביב חפץ ונצמדת אליו בעזרת כפות היניקה. לפיה בנו יד רובוט רכה שתופסת חפצים בעדינות.' },
  { id: 'wing', icon: 'feather', title: 'חומר קל וחזק', ask: 'צריך חומר קל מאוד שלא נשבר, בשביל כנף או קסדה.', key: 'lightstrong', half: ['ribs', 'hexa', 'armor'],
    real: 'toucan', fact: 'המקור של הטוקן גדול מאוד אבל קל. בפנים יש קצף של עצם עם חללים, ובחוץ קליפה דקה וחזקה. מהנדסים חוקרים אותו כדי לבנות חומרים קלים וחזקים.' },
  { id: 'panel', icon: 'hexa', title: 'לוח קל למטוס', ask: 'הלוחות במטוס צריכים להיות חזקים וגם קלים מאוד.', key: 'hexa', half: ['lightstrong', 'ribs', 'team'],
    real: 'honeybee', fact: 'הדבורים בונות חלות דבש ממשושים. מבנה כזה חזק מאוד ושוקל מעט. לוחות בצורת חלת דבש נמצאים היום במטוסים ובמכוניות.' },
  { id: 'lamp', icon: 'bulb', title: 'נורה שמאירה יותר', ask: 'הנורה מבזבזת אור בתוך עצמה. איך מוציאים ממנה יותר אור?', key: 'glow', half: ['shine'],
    real: 'firefly', fact: 'בפנס של הגחלילית יש קשקשים זעירים עם שוליים משוננים, והם עוזרים לאור לצאת. חוקרים עשו נורה עם צורה דומה, והיא האירה חזק יותר.' },
  { id: 'robotswim', icon: 'drop', title: 'רובוט ים שחוסך חשמל', ask: 'רובוט צריך לשחות זמן רב בים בלי להיגמר לו החשמל.', key: 'pulse', half: ['float', 'wave', 'patient'],
    real: 'jellyfish', fact: 'המדוזה שוחה בפעימות: מתכווצת, נפתחת וגולשת. חוקרים בנו רובוט שוחה בצורת מדוזה, שמתקדם בפעימות כמוה.' },
  { id: 'glide', icon: 'wave', title: 'רובוט שגולש בשקט בין הדגים', ask: 'רוצים לצלם דגים בלי להבריח אותם. הרובוט צריך לשחות בשקט וברכות.', key: 'wave', half: ['quiet', 'hide', 'pulse'],
    real: 'stingray', fact: 'חתול הים שוחה בגל רך שעובר לאורך הסנפירים הרחבים שלו. חברה גרמנית בנתה רובוט שוחה בצורה הזאת.' },
  { id: 'cloth', icon: 'leaf', title: 'בד שנפתח כשחם', ask: 'כשמזיעים, הבגד צריך לפתוח חורים קטנים לאוויר, ולסגור אותם כשקר.', key: 'opens', half: ['bloom', 'shelter'],
    real: 'pine', fact: 'האצטרובל של האורן נפתח כשיבש ונסגר כשרטוב. ממציאים באנגליה פיתחו בד שהסיבים שלו נפתחים ונסגרים לפי הלחות, בהשראת האצטרובל.' },
  { id: 'camo', icon: 'eye', title: 'מעיל שמשנה צבע', ask: 'צריך כיסוי שמשנה את הצבע שלו לפי הסביבה, כדי שלא יראו אותו.', key: 'colorshift', half: ['hide', 'shine'],
    real: 'chameleon', fact: 'בעור של הזיקית יש גבישים זעירים, וכשהיא מזיזה אותם הצבע משתנה. חוקרים לומדים את זה כדי לפתח חומרים שמשנים צבע.' },
];

// what רובו־דע says. {n} = the card's name; {m|f|mp|fp} picks the words for the name's gender and number
export const SAY = {
  win: ['יש! {n} {פתר|פתרה|פתרו|פתרו} את הבעיה!', 'וואו! {n} {הוא|היא|הם|הן} בדיוק מה שהיה חסר!', 'הבדיקה הצליחה! {n} {מלמד|מלמדת|מלמדים|מלמדות} אותנו משהו חדש.', 'מושלם! הבעיה נפתרה.'],
  winPair: ['שילוב חכם! שני היצורים עזרו יחד.', 'שניים יחד עובדים טוב יותר מאחד. בדיוק כמו ברשת החיים!'],
  wild: ['רגע, רגע... זה עבד?! לא האמנתי! איזה רעיון מטורף.', 'אני צריך לעדכן את הספרים. מי חשב ששני אלה יעבדו יחד?'],
  half: ['כמעט! {n} {עזר|עזרה|עזרו|עזרו} קצת, אבל עוד לא מספיק.', 'יש התקדמות! {n} {נותן|נותנת|נותנים|נותנות} רעיון, אבל חסר עוד משהו.', 'חצי הצלחה. אולי נוסיף עוד יצור לשילוב?'],
  failAnimal: [
    'ההמצאה בהשראת {n} נראית מצוין, אבל לא עובדת בכלל. ננסה שוב?',
    'ניסיתי לבנות לפי {n}. יצא משהו חמוד מאוד... וחסר תועלת לגמרי.',
    '{n} {הוא|היא|הם|הן} {יצור נפלא|יצור נפלא|יצורים נפלאים|יצורים נפלאים}, אבל לבעיה הזאת {הוא לא מתאים|היא לא מתאימה|הם לא מתאימים|הן לא מתאימות}.',
    'הבדיקה נכשלה, אבל למדנו משהו: {n} {מצטיין|מצטיינת|מצטיינים|מצטיינות} בדברים אחרים.',
  ],
  failPlant: [
    'ניסינו ללמוד מ{n}. בינתיים {הוא רק פורח וגדל|היא רק פורחת וגדלה|הם רק פורחים וגדלים|הן רק פורחות וגדלות}. יפה, אבל זה לא פותר את הבעיה.',
    'הרעיון שלנו: לחכות ש{n} {יגדל|תגדל|יגדלו|יגדלו}. הבעיה: זה ייקח כמה שנים.',
    '{n} {ירוק ושקט ונחמד|ירוקה ושקטה ונחמדה|ירוקים ושקטים ונחמדים|ירוקות ושקטות ונחמדות}, והבעיה עדיין לא נפתרה.',
  ],
  failTool: [
    'את {n} כבר בנו מהנדסים. כדי ללמוד מהטבע צריך יצור חי!',
    'שמתי את {n} על השולחן וחיכיתי. שום רעיון חדש לא יצא. צריך השראה מהטבע!',
  ],
  // a land creature on a sea problem, a sea creature on a land problem: the funniest flops
  oddWater: ['{n} {נכנס|נכנסה|נכנסו|נכנסו} למכל המים, {הסתכל|הסתכלה|הסתכלו|הסתכלו} מסביב... {ויצא|ויצאה|ויצאו|ויצאו} להתייבש.', 'בבריכת הניסוי {n} {צף על הגב ונהנה|צפה על הגב ונהנתה|צפו על הגב ונהנו|צפו על הגב ונהנו}. לא בדיוק מה שתכננו.'],
  oddLand: ['{n} מחוץ למים? {הוא מבקש|היא מבקשת|הם מבקשים|הן מבקשות} בנימוס לחזור לים.', 'ניסינו לבדוק את {n} על היבשה, ומהר מאוד {החזרנו אותו|החזרנו אותה|החזרנו אותם|החזרנו אותן} לאקווריום.'],
  // robots (the free workshop)
  trialWin: ['עבר בהצטיינות!', 'הצליח בקלות!', 'כמו אלוף!'],
  trialHalf: ['עבר, בקושי.', 'הצליח, אבל לאט.', 'כמעט נפל, ובסוף עבר.'],
  trialFail: ['לא הלך...', 'נתקע באמצע.', 'הלך לנוח.'],
};

// the free workshop: a robot built from one body and two traits, tested on five trials
export const TRIALS = [
  { id: 'water', title: 'מרוץ במים', icon: 'drop', good: ['slick', 'fast', 'swim', 'wave', 'pulse'], ok: ['float', 'patient'],
    fun: { fail: 'שקע לקרקעית ושלח בועות.', half: 'שחה, אבל בעיגולים.', win: 'חתך את המים כמו חץ!' } },
  { id: 'night', title: 'חיפוש בלילה', icon: 'moon', good: ['nightsee', 'glow'], ok: ['quiet', 'memory'],
    fun: { fail: 'נתקל בעץ ואמר "סליחה".', half: 'מצא, אבל רק את הדרך חזרה.', win: 'מצא הכול בחושך!' } },
  { id: 'climb', title: 'טיפוס על עץ', icon: 'tree', good: ['climb', 'grip', 'hold'], ok: ['hover', 'fly', 'patient'],
    fun: { fail: 'החליק למטה כמו במגלשה.', half: 'הגיע לענף הראשון ונח שם.', win: 'הגיע לצמרת!' } },
  { id: 'carry', title: 'הרמת משא', icon: 'box', good: ['strong', 'team'], ok: ['armor', 'tall'],
    fun: { fail: 'הרים את המשא... בדמיון.', half: 'הרים, והלך כמו עצלן.', win: 'הרים בקלות ועוד ביקש עוד!' } },
  { id: 'hide', title: 'מחבואים מטורף', icon: 'eye', good: ['hide', 'colorshift', 'armor', 'spines'], ok: ['patient', 'quiet', 'dig'],
    fun: { fail: 'התחבא מאחורי עלה קטנטן. רואים אותו.', half: 'התחבא טוב, אבל פיהק בקול.', win: 'אף אחד לא מצא אותו!' } },
];
