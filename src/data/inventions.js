// "הממציאים": problems people really solved (or are solving now) by learning from a creature (docs/sources.md,
// section הממציאים), the traits each card brings to the workbench, and what רובו־דע says when a try works,
// half works or flops. A card's traits come from TRAITS by species id, else from its kind (KIND_TRAITS).
//
// A problem has either one `key` trait (any card with it solves the problem) or `need: [a, b]`: a combination,
// two traits from two different cards (the first time a child solves one, the badge inv:pair). `half` traits help
// a little. `real` (and `real2` for a combination) is the creature people really learned from; `fact` says what
// really happened. `clue` is the first hint (a question), `show` what the test showed when it failed or half
// worked, `part` (combinations only) what the test showed with only one of the two traits.
// `theme` groups the problems for browsing (THEMES); `kids: true` problems are the beginners' set; `sea` / `land`
// make a creature from the wrong place flop in a funny way.
// Old saves keep working: the ids of the first 14 problems never change (the hub stores solved ids).

export const TRAIT = {
  slick: 'עור חלק במים', quiet: 'מעוף שקט', hover: 'עומד באוויר', antisting: 'לא נצרב', lightstrong: 'קל וחזק',
  shine: 'צבע מנצנץ', grip: 'אחיזה עדינה', opens: 'נפתח ונסגר לבד', glow: 'מאיר בלי חום', wave: 'שוחה בגלים',
  pulse: 'שוחה בפעימות', colorshift: 'משנה צבע', ribs: 'צלעות חזקות', hexa: 'בונה משושים', nightsee: 'רואה בחושך',
  fast: 'מהיר', hide: 'מסתתר', climb: 'מטפס', spines: 'קוצים', armor: 'שריון', float: 'צף', dig: 'חופר',
  filter: 'מסנן מים', team: 'עובדים יחד', strong: 'חזק', patient: 'סבלני ואיטי', loud: 'קולני', memory: 'זוכר מקומות',
  tall: 'גבוה', hold: 'נאחז', swim: 'שוחה', fly: 'עף', bloom: 'פורח', shelter: 'נותן מחסה', sun: 'אוהב שמש', machine: 'מכונה',
  // added with the big inventors update (1.3)
  cushion: 'בולם מכות', foamcore: 'קצף בתוך צינור', tough: 'קליפה שלא נסדקת', wovenhard: 'שיניים ארוגות',
  mycel: 'חוטים מתחת לאדמה', hollowfiber: 'סיב חלול', coil: 'מתלפף', wrap: 'לשון עוטפת', suction: 'כפות יניקה',
  tail: 'זנב לאיזון', dome: 'שריון עגול', walk: 'הולך ביבשה', paddle: 'סנפירי חתירה', softwing: 'כנף עור רכה',
  basking: 'כנפיים שאוספות שמש', lightspread: 'מפזר אור', snap: 'צבת עם בועה', lantern: 'פה עם חמש שיניים',
  germguard: 'חיידקים שומרים', skinchem: 'חומר מיוחד בעור', regrow: 'עור שחוזר וגדל', microskin: 'דוגמה זעירה בעור',
  pace: 'יודעות כמה לשלוח', dance: 'ריקוד שמספר',
  // 1.3.1 (open inventions): colours from pigment (not structure), slimy skin, stinging arms, sticky tube feet
  bright: 'צבעים עזים', slime: 'עור חלקלק', sting: 'זרועות צורבות', tubefeet: 'רגליים דביקות',
};

// species id → traits (the first one is the strongest; the cards show the first three)
export const TRAITS = {
  // אמזונס
  kapok: ['hollowfiber', 'tall', 'float'], brazilnut: ['tough', 'armor', 'tall'], fig: ['hold', 'coil', 'climb'], cecropia: ['team', 'tall'], acai: ['tall'],
  heliconia: ['bright', 'bloom'], bromeliad: ['shelter', 'bloom'], orchid: ['bright', 'bloom'], liana: ['coil', 'hold', 'climb'], fern: ['shelter'],
  glowfungus: ['glow', 'mycel'], waterlily: ['ribs', 'float'], leafcutter: ['germguard', 'team', 'strong'], orchidbee: ['shine', 'hover', 'fly'], morpho: ['shine', 'fly'],
  hummingbird: ['hover', 'fast'], dartfrog: ['skinchem', 'bright'], toucan: ['lightstrong', 'foamcore', 'loud'], macaw: ['loud', 'shine'], sloth: ['patient', 'hold'],
  agouti: ['memory', 'dig'], howler: ['loud', 'climb'], jaguar: ['fast', 'nightsee', 'strong'], harpy: ['strong', 'fast'],
  capybara: ['swim', 'patient', 'walk'], tapir: ['strong', 'swim', 'walk'], fruitbat: ['softwing', 'nightsee', 'fly'], anteater: ['dig', 'strong', 'walk'],
  kinkajou: ['nightsee', 'climb'], coati: ['climb', 'team'],
  // חורש
  oak: ['tall', 'strong'], terebinth: ['tall'], carob: ['tall', 'patient'], pine: ['opens', 'tall'], mastic: ['shelter'], buckthorn: ['shelter'],
  sage: ['bloom'], rockrose: ['bloom', 'sun'], cyclamen: ['bloom'], anemone: ['bloom', 'bright'], mushroom: ['mycel', 'shelter'],
  honeybee: ['hexa', 'dance', 'team'], butterfly: ['basking', 'shine', 'fly'], harvesterant: ['pace', 'team', 'memory'], firefly: ['glow', 'fly'],
  jay: ['memory', 'fly'], blackbird: ['loud', 'fly'], chameleon: ['colorshift', 'wrap', 'grip', 'hide'], agama: ['tail', 'sun', 'fast'],
  spinymouse: ['regrow', 'spines', 'fast'], porcupine: ['foamcore', 'spines', 'armor'], hedgehog: ['cushion', 'spines', 'armor'], hyrax: ['suction', 'sun', 'climb', 'walk'],
  gazelle: ['fast', 'walk'], fox: ['nightsee', 'fast'], owl: ['quiet', 'nightsee'], hoopoe: ['germguard', 'dig', 'fly'], tortoise: ['dome', 'armor', 'patient', 'walk'], chukar: ['hide', 'fast'],
  // שונית
  reefshark: ['slick', 'microskin', 'fast', 'swim'], octopus: ['grip', 'suction', 'colorshift', 'hide'], clownfish: ['antisting', 'swim'], jellyfish: ['pulse', 'sting', 'float'],
  stingray: ['wave', 'hide'], turtle: ['paddle', 'armor', 'swim', 'patient'], parrotfish: ['wovenhard', 'strong', 'swim'], cleaner: ['team', 'swim'], moray: ['slime', 'hide', 'strong'],
  grouper: ['strong', 'swim'], butterflyfish: ['bright', 'swim'], lionfish: ['spines', 'bright'], urchin: ['lantern', 'tubefeet', 'spines', 'armor'], goby: ['team', 'hide'],
  shrimp: ['snap', 'dig', 'team'], starfish: ['tubefeet', 'regrow', 'grip', 'patient'], hermit: ['armor', 'hide'], surgeonfish: ['fast', 'swim'], seaanemone: ['sting', 'shelter'],
  sponge: ['filter'], clam: ['lightspread', 'armor', 'filter'], seagrass: ['hold', 'shelter'], branching: ['shelter'], brain: ['ribs', 'shelter'], table: ['shelter'],
  softcoral: ['shelter'], firecoral: ['sting', 'shelter'], seafan: ['filter', 'shelter'], algae: ['sun'], plankton: ['float'],
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

// the shelves of the workbench: a child browses the problems by theme
export const THEMES = [
  { id: 'water', name: 'מים וים', icon: 'drop' },
  { id: 'air', name: 'באוויר', icon: 'wind' },
  { id: 'build', name: 'בנייה', icon: 'box' },
  { id: 'matter', name: 'חומרים', icon: 'sparkle' },
  { id: 'robots', name: 'רובוטים', icon: 'gear' },
  { id: 'energy', name: 'אור ושמש', icon: 'sun' },
  { id: 'health', name: 'רפואה', icon: 'pill' },
  { id: 'nets', name: 'רשתות', icon: 'net' },
];

// the problems. key: the trait that solves it (or need: two traits from two cards); half: traits that help a little.
// real: the creature people really learned from; fact: what really happened (docs/sources.md).
export const PROBLEMS = [
  { id: 'swim', theme: 'water', kids: true, sea: true, icon: 'drop', title: 'בגד שחייה מהיר', ask: 'השחיינים רוצים לגלוש במים מהר יותר. ממי אפשר ללמוד?', key: 'slick', half: ['fast', 'swim', 'wave', 'microskin'],
    real: 'reefshark', fact: 'העור של הכריש מכוסה בקשקשים זעירים עם חריצים, והמים זורמים עליו בקלות. לפי הרעיון הזה תפרו בגדי שחייה מהירים, ועל מטוסים מדביקים יריעה עם חריצים כאלה כדי לחסוך בדלק.',
    clue: 'מי בשונית שוחה מהר מאוד, והעור שלו מכוסה קשקשים זעירים?', show: { fail: 'השחיין בבגד החדש שחה בדיוק כמו קודם.', half: 'הבגד עזר קצת, אבל המים עדיין מתחככים בו.' } },
  { id: 'quiet', theme: 'air', kids: true, land: true, icon: 'wind', title: 'רכבת מהירה ושקטה', ask: 'הרכבת המהירה עושה רעש גדול. איך מנמיכים את הרעש?', key: 'quiet', half: ['fly', 'patient', 'softwing'],
    real: 'owl', fact: 'לנוצות של התנשמת יש שוליים משוננים, וכך היא עפה בלי רעש. מהנדסים ביפן עיצבו לפי זה חלק ברכבת המהירה, והרעש ירד.',
    clue: 'מי עף בלילה בלי שאפשר לשמוע אותו בכלל?', show: { fail: 'הרכבת עברה ברעש גדול, בדיוק כמו קודם.', half: 'הרעש ירד קצת, אבל הוא עדיין חזק מדי.' } },
  { id: 'hover', theme: 'air', kids: true, land: true, icon: 'drone', title: 'רחפן קטן שעומד באוויר', ask: 'צריך רחפן קטנטן שיעמוד במקום אחד באוויר, כמו מסוק זעיר.', key: 'hover', half: ['fly', 'fast', 'softwing'],
    real: 'hummingbird', fact: 'יונק הדבש מנפנף בכנפיים מהר מאוד ויכול לעמוד במקום. בשנת 2011 בנו רחפן קטן בגודל של יונק דבש, שמנפנף בכנפיים כמוהו.',
    clue: 'מי עומד באוויר מול פרח ושותה ממנו צוף?', show: { fail: 'הרחפן נפל כמו אבן.', half: 'הרחפן עף, אבל לא מצליח לעמוד במקום אחד.' } },
  { id: 'sting', theme: 'health', kids: true, sea: true, icon: 'shield', title: 'קרם נגד צריבת מדוזות', ask: 'בים יש מדוזות שצורבות. איך שוחים בלי להיצרב?', key: 'antisting', half: ['armor', 'hide'],
    real: 'clownfish', fact: 'השושנון חי בין זרועות שושנת הים ולא נצרב, בזכות ריר מיוחד על העור שלו. חוקרים בישראל פיתחו קרם שמגן מצריבת מדוזות, בהשראת השושנון.',
    clue: 'מי גר בין הזרועות הצורבות של שושנת הים?', show: { fail: 'בבדיקה עם מדוזה, העור עדיין נצרב.', half: 'הצריבה הייתה חלשה יותר, אבל עדיין הרגישו אותה.' } },
  { id: 'roof', theme: 'build', kids: true, icon: 'leaf', title: 'גג ענק, קל וחזק', ask: 'רוצים לבנות אולם זכוכית ענק. איך הגג יחזיק בלי להיות כבד?', key: 'ribs', half: ['float', 'lightstrong', 'hexa', 'foamcore'],
    real: 'waterlily', fact: 'לעלה הענק של הוויקטוריה האמזונית יש צלעות עבות מתחת, והוא נושא משקל רב. גנן אנגלי בנה לפי הצלעות האלה בית זכוכית, ואחר כך אולם זכוכית ענק.',
    clue: 'איזה עלה ענק צף על המים ונושא משקל רב?', show: { fail: 'הגג קרס מהמשקל של עצמו.', half: 'הגג החזיק, אבל הוא כבד מדי.' } },
  { id: 'color', theme: 'matter', kids: true, icon: 'sparkle', title: 'צבע שלא דוהה', ask: 'צבע רגיל דוהה בשמש. אפשר לעשות צבע מבריק בלי צבע?', key: 'shine', half: ['colorshift', 'bloom'],
    real: 'morpho', fact: 'הכחול של פרפר המורפו לא בא מצבע. הקשקשים בכנף בנויים כך שהאור חוזר מהם כחול ומבריק. לפי הרעיון הזה מפתחים בדים וחומרים צבעוניים בלי צבע.',
    clue: 'איזה פרפר כחול ומבריק, אבל אין בכנפיים שלו צבע כחול?', show: { fail: 'אחרי שבוע בשמש הצבע דהה ונעשה אפור.', half: 'הצבע מבריק, אבל הוא דוהה קצת בשמש.' } },
  { id: 'grip', theme: 'robots', kids: true, icon: 'hand', title: 'יד רובוט שתופסת בעדינות', ask: 'הרובוט צריך להרים ביצה בלי לשבור אותה, וגם אבן כבדה.', key: 'grip', half: ['hold', 'strong', 'suction', 'wrap'],
    real: 'octopus', fact: 'הזרוע של התמנון מתעגלת סביב חפץ ונצמדת אליו בעזרת כפות היניקה. לפיה בנו יד רובוט רכה שתופסת חפצים בעדינות.',
    clue: 'למי יש שמונה זרועות שמתעגלות סביב כל דבר?', show: { fail: 'היד מחצה את הביצה. אופס.', half: 'היד הרימה את האבן, אבל הביצה נסדקה קצת.' } },
  { id: 'wing', theme: 'build', kids: true, icon: 'feather', title: 'חומר קל וחזק', ask: 'צריך חומר קל מאוד שלא נשבר, בשביל כנף או קסדה.', key: 'lightstrong', half: ['ribs', 'hexa', 'armor', 'foamcore'],
    real: 'toucan', fact: 'המקור של הטוקן גדול מאוד אבל קל. בפנים יש קצף של עצם עם חללים, ובחוץ קליפה דקה וחזקה. מהנדסים חוקרים אותו כדי לבנות חומרים קלים וחזקים.',
    clue: 'למי יש מקור ענק, ובכל זאת הוא לא כבד לו?', show: { fail: 'החומר נשבר בבדיקה הראשונה.', half: 'החומר חזק, אבל כבד מדי בשביל כנף.' } },
  { id: 'panel', theme: 'air', icon: 'hexa', title: 'לוח קל למטוס', ask: 'הלוחות במטוס צריכים להיות חזקים וגם קלים מאוד.', key: 'hexa', half: ['lightstrong', 'ribs', 'team', 'foamcore'],
    real: 'honeybee', fact: 'הדבורים בונות חלות דבש ממשושים. מבנה כזה חזק מאוד ושוקל מעט. לוחות בצורת חלת דבש נמצאים היום במטוסים ובמכוניות.',
    clue: 'מי בונה בתים קטנים בצורת משושה?', show: { fail: 'הלוח התכופף כמו קרטון רטוב.', half: 'הלוח קל, אבל לא מספיק חזק.' } },
  { id: 'lamp', theme: 'energy', icon: 'bulb', title: 'נורה שמאירה יותר', ask: 'הנורה מבזבזת אור בתוך עצמה. איך מוציאים ממנה יותר אור?', key: 'glow', half: ['shine', 'lightspread'],
    real: 'firefly', fact: 'בפנס של הגחלילית יש קשקשים זעירים עם שוליים משוננים, והם עוזרים לאור לצאת. חוקרים עשו נורה עם צורה דומה, והיא האירה חזק יותר.',
    clue: 'מי מאיר בלילה בלי להתחמם?', show: { fail: 'הנורה האירה בדיוק כמו קודם.', half: 'יצא קצת יותר אור, אבל רק לצד אחד.' } },
  { id: 'robotswim', theme: 'water', sea: true, icon: 'drop', title: 'רובוט ים שחוסך חשמל', ask: 'רובוט צריך לשחות זמן רב בים בלי להיגמר לו החשמל.', key: 'pulse', half: ['float', 'wave', 'patient'],
    real: 'jellyfish', fact: 'המדוזה שוחה בפעימות: מתכווצת, נפתחת וגולשת. חוקרים בנו רובוט שוחה בצורת מדוזה, שמתקדם בפעימות כמוה.',
    clue: 'מי שוחה בפעימות רכות, כמו מטרייה שנפתחת ונסגרת?', show: { fail: 'הסוללה נגמרה אחרי חמש דקות.', half: 'הרובוט שחה יותר זמן, אבל עדיין לא מספיק.' } },
  { id: 'glide', theme: 'water', sea: true, icon: 'wave', title: 'רובוט שגולש בשקט בין הדגים', ask: 'רוצים לצלם דגים בלי להבריח אותם. הרובוט צריך לשחות בשקט וברכות.', key: 'wave', half: ['quiet', 'hide', 'pulse'],
    real: 'stingray', fact: 'חתול הים שוחה בגל רך שעובר לאורך הסנפירים הרחבים שלו. חברה גרמנית בנתה רובוט שוחה עם סנפירים רחבים כאלה, בהשראת המנטה, שהיא קרובה של חתול הים.',
    clue: 'מי שוחה בגל רך שעובר לאורך הגוף השטוח שלו?', show: { fail: 'הרובוט עשה רעש, וכל הדגים ברחו.', half: 'הרובוט שקט יותר, אבל הוא עדיין מבהיל קצת את הדגים.' } },
  { id: 'cloth', theme: 'matter', icon: 'leaf', title: 'בד שנפתח כשחם', ask: 'כשמזיעים, הבגד צריך לפתוח חורים קטנים לאוויר, ולסגור אותם כשקר.', key: 'opens', half: ['bloom', 'shelter'],
    real: 'pine', fact: 'האצטרובל של האורן נפתח כשיבש ונסגר כשרטוב. ממציאים באנגליה פיתחו בד שהסיבים שלו נפתחים ונסגרים לפי הלחות, בהשראת האצטרובל.',
    clue: 'מה בחורש נפתח כשהוא יבש, ונסגר כשהוא רטוב?', show: { fail: 'הבד נשאר סגור, והיה חם מאוד.', half: 'הבד נפתח, אבל שכח להיסגר כשהתקרר.' } },
  { id: 'camo', theme: 'matter', icon: 'eye', title: 'מעיל שמשנה צבע', ask: 'צריך כיסוי שמשנה את הצבע שלו לפי הסביבה, כדי שלא יראו אותו.', key: 'colorshift', half: ['hide', 'shine'],
    real: 'chameleon', fact: 'בעור של הזיקית יש גבישים זעירים, וכשהיא מזיזה אותם הצבע משתנה. חוקרים לומדים את זה כדי לפתח חומרים שמשנים צבע.',
    clue: 'מי בחורש משנה צבע לפי המקום שבו הוא עומד?', show: { fail: 'הכיסוי נשאר באותו צבע, וכולם ראו אותו.', half: 'הכיסוי שינה צבע, אבל לצבע הלא נכון.' } },

  // ── מים וים
  { id: 'lifevest', theme: 'water', kids: true, icon: 'drop', title: 'חגורת הצלה שלא שוקעת', ask: 'צריך למלא חגורת הצלה בחומר קל, שיצוף גם אחרי זמן רב במים.', key: 'hollowfiber', half: ['float', 'foamcore'],
    real: 'kapok', fact: 'בפרי של הקפוק יש סיבים דקים וחלולים. כמעט כל סיב מלא באוויר, והמים לא נספגים בו. פעם מילאו בסיבים האלה חגורות הצלה. הם גם סופגים שמן ולא מים, ולכן בודקים אותם לניקוי נפט מהים.',
    clue: 'איזה עץ ענק עוטף את הזרעים שלו בצמר רך וקל?', show: { fail: 'החגורה שקעה לאט לאט לקרקעית הבריכה.', half: 'החגורה צפה, אבל אחרי שעה במים היא נעשתה כבדה.' } },
  { id: 'plasma', theme: 'water', icon: 'drop', title: 'לנקות מים בבועה', ask: 'רוצים לנקות מים מחיידקים בלי לשפוך לתוכם חומרים. אולי בעזרת בועה?', key: 'snap', half: ['loud', 'strong'],
    real: 'shrimp', fact: 'החסילון סוגר את הצבת שלו כל כך מהר, שנוצרת במים בועה. כשהבועה מתפוצצת יש קול חזק והבזק קטן של אור, ולרגע חם שם מאוד. חוקרים בטקסס הדפיסו צבת גדולה כמו של החסילון, ובעזרתה יוצרים במים את אותו הבזק. אולי כך ינקו מים מחיידקים.',
    clue: 'מי בשונית עושה קליק חזק כמו יריה, בעזרת הצבת?', show: { fail: 'המים נשארו בדיוק כמו שהיו. אף בועה לא הופיעה.', half: 'הופיעו בועות קטנות, אבל הן לא חזקות מספיק.' } },

  // ── באוויר
  { id: 'batbot', theme: 'air', land: true, icon: 'drone', title: 'רחפן רך שלא מזיק', ask: 'רחפן עם מדחפים מהירים יכול להזיק כשהוא נתקל במשהו. איך בונים רחפן רך ובטוח?', key: 'softwing', half: ['fly', 'hover'],
    real: 'fruitbat', fact: 'לעטלף יש כנף של עור דק וגמיש, והוא משנה את הצורה שלה באוויר. כך הוא פונה בקלות. חוקרים בנו רובוט עטלף ששוקל 93 גרם, עם כנפיים מעור מלאכותי דק. הוא מנפנף לאט, ולכן הוא שקט ובטוח יותר מרחפן עם מדחפים.',
    clue: 'מי עף בלילה עם כנפיים של עור?', show: { fail: 'הרחפן נתקל בווילון ונתקע בו.', half: 'הרחפן עף, אבל הכנפיים הקשות שלו נשברו בפגיעה הראשונה.' } },
  { id: 'safedrone', theme: 'air', land: true, icon: 'drone', title: 'רחפן שעומד ליד העץ', ask: 'צריך רחפן שיעמוד במקום אחד ליד עץ, ואם הוא נוגע בענף, שלא ישבור כלום.', need: ['hover', 'softwing'], half: ['fly', 'fast'],
    real: 'hummingbird', real2: 'fruitbat', fact: 'שני רעיונות אמיתיים בשילוב אחד: יונק הדבש עומד במקום באוויר, ולפיו בנו רחפן זעיר שמנפנף בכנפיים. העטלף עף עם כנף רכה וגמישה, ולפיו בנו רובוט עטלף שלא מזיק כשהוא נתקל במשהו.',
    clue: 'צריך שני יצורים: אחד שעומד באוויר, ואחד שיש לו כנף רכה.',
    part: { hover: 'הרחפן עמד במקום יפה מאוד, אבל כשנגע בענף הוא שבר אותו. חסרה כנף רכה.', softwing: 'הכנף הרכה לא שוברת כלום, אבל הרחפן לא מצליח לעמוד במקום. הוא כל הזמן נסחף.' },
    show: { fail: 'הרחפן לא התרומם בכלל.', half: 'הרחפן התרומם, אבל לא עמד במקום ולא נזהר מהענפים.' } },

  // ── בנייה
  { id: 'quill', theme: 'build', icon: 'feather', title: 'קורה קלה שלא מתכופפת', ask: 'צריך קורה ארוכה למטוס. היא צריכה להיות קלה מאוד, אבל לא להתכופף.', key: 'foamcore', half: ['lightstrong', 'hexa', 'ribs', 'spines'],
    real: 'porcupine', fact: 'הקולמוס של הדורבן ארוך וקל, ובכל זאת הוא לא מתכופף בקלות. מבחוץ יש לו קליפה קשה, ובפנים קצף של תאים קטנים. חוקרים בדקו קולמוסים של דורבן ובנו לפיהם לוחות קלים, בשביל מטוסים ומכוניות.',
    clue: 'למי יש קוצים ארוכים, ובתוכם קצף קל?', show: { fail: 'הקורה התכופפה כמו אטרייה מבושלת.', half: 'הקורה חזקה, אבל כבדה מדי למטוס.' } },
  { id: 'nutshell', theme: 'build', icon: 'box', title: 'קופסה שלא נסדקת', ask: 'צריך חומר קל לקופסה, שגם אם היא נופלת ונחבטת, הוא לא נסדק.', key: 'tough', half: ['armor', 'lightstrong', 'foamcore', 'cushion'],
    real: 'brazilnut', fact: 'הפרי של אגוז ברזיל עגול וכבד, והקליפה שלו עבה וקשה מאוד. בתוך הקליפה יש סיבים ותאים קשים שמונעים ממנה להיסדק. חוקרים בברזיל בנו לפי הקליפה הזאת חומר חדש: קל, חזק, ושלא נסדק בקלות.',
    clue: 'איזה פרי ביער כל כך קשה, שרק מעט בעלי חיים מצליחים לפתוח אותו?', show: { fail: 'הקופסה נפלה מהשולחן ונסדקה לשתיים.', half: 'הקופסה לא נשברה, אבל היא כבדה כמו אבן.' } },
  { id: 'helmet', theme: 'build', kids: true, land: true, icon: 'shield', title: 'קסדה שבולמת מכה', ask: 'כשנופלים, הקסדה צריכה לבלום את המכה, כדי שהראש לא יקבל אותה.', key: 'cushion', half: ['spines', 'armor', 'foamcore'],
    real: 'hedgehog', fact: 'כל קוץ של הקיפוד הוא צינור דק וחלול, ובפנים יש לו מחיצות קטנות שמחזקות אותו. כשהקיפוד נופל, הקוצים מתכופפים קצת ובולמים את המכה. חוקרים באוניברסיטה באמריקה בנו לפי זה ריפוד לקסדה, עם "קוצים" מפלסטיק, והוא בלם מכות טוב יותר מקסדות רגילות.',
    clue: 'מי מתגלגל לכדור, ויש לו מאות קוצים?', show: { fail: 'שמנו קסדה על אבטיח והפלנו אותו. האבטיח נסדק.', half: 'הקסדה חזקה, אבל היא לא בולמת. המכה עוברת דרכה אל האבטיח.' } },
  { id: 'package', theme: 'build', land: true, icon: 'box', title: 'אריזה לביצים שנעלמת באדמה', ask: 'צריך אריזה ששומרת על ביצים בדרך, ואחר כך אפשר לקבור אותה בגינה, והיא נעלמת.', need: ['mycel', 'cushion'], half: ['shelter', 'spines', 'tough'],
    real: 'mushroom', real2: 'hedgehog', fact: 'שני רעיונות אמיתיים בשילוב אחד: מהחוטים של הפטרייה מגדלים חומר אריזה במקום קלקר, והוא נרקב באדמה. ומהקוצים של הקיפוד למדו לבנות ריפוד שבולם מכות.',
    clue: 'צריך שניים: משהו שגדל בחוטים מתחת לאדמה, ומשהו שבולם מכות.',
    part: { mycel: 'האריזה נעלמה יפה באדמה, אבל בדרך שתי ביצים נסדקו. חסר ריפוד שבולם מכות.', cushion: 'הביצים הגיעו שלמות, אבל האריזה מפלסטיק, והיא לא נעלמת באדמה. חסר חומר שנרקב.' },
    show: { fail: 'כל הביצים נשברו, והאריזה נשארה בגינה.', half: 'הביצים כמעט שלמות, אבל האריזה לא נעלמת באדמה.' } },

  // ── חומרים
  { id: 'tooth', theme: 'matter', icon: 'hexa', title: 'חומר שלא נשחק', ask: 'חלקים במכונה מתחככים כל היום ונשחקים. איך עושים חומר שכמעט לא נשחק?', key: 'wovenhard', half: ['strong', 'armor', 'tough'],
    real: 'parrotfish', fact: 'התוכינון נוגס באלמוגים ובסלעים, והשיניים שלו מחזיקות מעמד. בתוך כל שן יש גבישים דקים מאוד שארוגים זה בזה, כמו חוטים בבד, ושן ששחוקה מתחלפת בחדשה. חוקרים בדקו את השיניים בקרני רנטגן, וחושבים שמבנה ארוג כזה יעזור לבנות חומרים חזקים במיוחד.',
    clue: 'מי בשונית נוגס באלמוג הקשה, ואחר כך מוציא אותו כחול?', show: { fail: 'אחרי יום של חיכוך, החלק נשחק לגמרי.', half: 'החלק קשה, אבל הוא נסדק אחרי כמה מכות.' } },
  { id: 'mycelium', theme: 'matter', icon: 'leaf', title: 'קלקר שגדל לבד', ask: 'קלקר נשאר באדמה שנים רבות מאוד. אפשר לעשות חומר אריזה שנעלם באדמה?', key: 'mycel', half: ['shelter', 'hold'],
    real: 'mushroom', fact: 'הפטרייה שאנחנו רואים היא רק חלק קטן. מתחת לאדמה יש לה רשת של חוטים דקים. חברה באמריקה מערבבת את החוטים האלה עם שאריות של צמחים, והם גדלים בתוך תבנית כחמישה ימים. כך נוצרת אריזה במקום קלקר, ואפשר לשים אותה בקומפוסט בבית.',
    clue: 'מי מתחת לאדמה מחבר הכול ברשת של חוטים דקים?', show: { fail: 'החומר התפורר ברגע שנגענו בו.', half: 'החומר החזיק, אבל הוא לא נעלם באדמה.' } },

  // ── רובוטים
  { id: 'tongue', theme: 'robots', icon: 'hand', title: 'יד שתופסת כל צורה', ask: 'במפעל יש מסמרים, ברגים וכדורים בצורות שונות. צריך יד רובוט אחת שתתפוס את כולם.', key: 'wrap', half: ['grip', 'hold', 'suction'],
    real: 'chameleon', fact: 'הזיקית יורה את הלשון שלה אל החרק. קצה הלשון נכנס פנימה באמצע, והשוליים ממשיכים קדימה ועוטפים את החרק מכל הצדדים. חברה בגרמניה בנתה לפי זה תפסן: כיפה רכה מסיליקון שעוטפת כל חפץ, ואפילו כמה חפצים יחד.',
    clue: 'מי תופס חרקים בלשון ארוכה מאוד?', show: { fail: 'היד הפילה את הכדור ואת הבורג.', half: 'היד תפסה את הכדור, אבל הברגים הקטנים נשמטו ממנה.' } },
  { id: 'tailbot', theme: 'robots', land: true, icon: 'jump', title: 'רובוט קופץ שלא נופל על האף', ask: 'הרובוט קופץ מסלע לסלע, ובאוויר הוא מסתובב ונוחת על האף. מה יעזור לו?', key: 'tail', half: ['fast', 'climb', 'hover'],
    real: 'agama', fact: 'חוקרים צילמו לטאה מקרובי החרדון כשהיא קופצת. כשהרגליים החליקו בקפיצה, הלטאה הרימה את הזנב, וכך הגוף לא הסתובב קדימה. לפי זה בנו מכונית צעצוע עם זנב וחיישן קטן. כשהזנב זז בזמן הנכון, היא נשארה ישרה באוויר.',
    clue: 'מי מטפס על סלעים, קופץ, ויש לו זנב ארוך?', show: { fail: 'הרובוט קפץ, הסתובב באוויר ונחת על הגב.', half: 'הרובוט קפץ יפה, אבל עדיין נחת קצת על האף.' } },
  { id: 'righting', theme: 'robots', kids: true, land: true, icon: 'gear', title: 'רובוט שהתהפך על הגב', ask: 'הרובוט נפל ונשאר על הגב, עם הגלגלים למעלה. איך הוא יחזור לעמוד לבד?', key: 'dome', half: ['armor', 'patient'],
    real: 'tortoise', fact: 'לצבי יבשה רבים יש שריון גבוה ומעוגל. אם צב כזה מתהפך על הגב, צורת השריון עוזרת לו להתגלגל בחזרה, עם קצת עזרה מהרגליים. מתמטיקאים מהונגריה מצאו צורה שתמיד חוזרת לעמוד לבד, וקראו לה גומבוץ. הם השוו אותה לשריון של הצב.',
    clue: 'למי יש שריון גבוה ועגול, כמו כיפה?', show: { fail: 'הרובוט שכב על הגב ונופף בגלגלים.', half: 'הרובוט התנדנד, אבל לא הצליח להתהפך.' } },
  { id: 'tendril', theme: 'robots', icon: 'spiral', title: 'רובוט שמטפס כמו צמח', ask: 'צריך רובוט רך שיטפס על עמוד או על ענף בלי ידיים, כמו צמח.', key: 'coil', half: ['hold', 'climb', 'grip'],
    real: 'liana', fact: 'צמחים מטפסים רבים נאחזים בקנוקנות: חוטים דקים שמתלפפים סביב ענף. חוקרים באיטליה בנו רובוט רך בצורת קנוקנת. הוא מתלפף ונפתח בעזרת נוזל שזורם בתוכו, כמו המים בצמח, וסוללה קטנה מפעילה אותו.',
    clue: 'איזה צמח מטפס על העצים עד לאור, בלי גזע עבה?', show: { fail: 'הרובוט נשאר שוכב ליד העמוד.', half: 'הרובוט נאחז בעמוד, אבל החליק למטה.' } },
  { id: 'marsclaw', theme: 'robots', icon: 'claw', title: 'יד לרובוט חלל', ask: 'רובוט חלל צריך לאסוף מעט אדמה מכוכב רחוק, בדיוק מהמקום הנכון, בלי לפזר את כל השאר.', key: 'lantern', half: ['dig', 'grip', 'strong'],
    real: 'urchin', fact: 'לקיפוד הים יש פה מיוחד עם חמש שיניים, שמסודרות כמו כוכב. הוא פותח אותן החוצה, סוגר פנימה, ומגרד אצות מהסלע. חוקרים מקליפורניה בנו לפי זה יד לרובוט עם חמש "שיניים", ובדקו אותה על חול ועל אדמה שדומה לאדמה של מאדים.',
    clue: 'מי הולך לאט על סלעי השונית, ויש לו פה מתחת לגוף?', show: { fail: 'היד דחפה את החול לכל הצדדים ולא אספה כלום.', half: 'היד אספה חול, אבל חצי ממנו נשפך בדרך.' } },
  { id: 'amphibot', theme: 'robots', icon: 'gear', title: 'רובוט לים וליבשה', ask: 'צריך רובוט שיצא מהים אל החוף, וימשיך ללכת על החול.', need: ['paddle', 'walk'], half: ['swim', 'armor'],
    real: 'turtle', real2: 'tortoise', fact: 'חוקרים באמריקה בנו באמת רובוט כזה, וקראו לו "צב". הם למדו משני צבים: לצב הים יש סנפירים שטוחים לשחייה, ולצב היבשה יש רגליים עבות להליכה. הרגליים של הרובוט משנות צורה: שטוחות במים, ועגולות על היבשה.',
    clue: 'צריך שני יצורים: אחד ששוחה בסנפירים, ואחד שהולך על היבשה.',
    part: { paddle: 'במים הרובוט שחה יפה, אבל על החוף הסנפירים רק גררו אותו בחול.', walk: 'על החוף הרובוט הלך מצוין, אבל במים הוא רק בעט ושקע.' },
    show: { fail: 'הרובוט נשאר על שפת המים ולא זז.', half: 'הרובוט זז קצת, גם במים וגם בחול, אבל לאט מאוד.' } },
  { id: 'handy', theme: 'robots', icon: 'hand', title: 'יד לדברים רטובים ומשונים', ask: 'הרובוט צריך להרים מהאקווריום אבנים חלקות ורטובות, וגם צדפים בצורות משונות.', need: ['suction', 'wrap'], half: ['grip', 'hold'],
    real: 'octopus', real2: 'chameleon', fact: 'שני רעיונות אמיתיים בשילוב אחד: כפות היניקה של התמנון נצמדות גם לדברים רטובים, ולפיהן עשו מדבקה שנדבקת מתחת למים. והלשון של הזיקית עוטפת כל צורה, ולפיה בנו תפסן רך.',
    clue: 'צריך שניים: מישהו עם כפות יניקה, ומישהו שעוטף בלשון.',
    part: { suction: 'כפות היניקה נצמדו לאבנים החלקות, אבל הצדפים המשונים נשמטו.', wrap: 'היד עטפה את הצדפים, אבל האבנים הרטובות החליקו ממנה.' },
    show: { fail: 'הכול החליק בחזרה לאקווריום. פלופ.', half: 'היד הרימה כמה דברים, אבל כמעט הכול נשמט באמצע.' } },
  { id: 'stunt', theme: 'robots', land: true, icon: 'jump', title: 'רובוט קפצן שקם לבד', ask: 'הרובוט קופץ מעל מכשולים. צריך שלא יסתובב באוויר, ואם בכל זאת נפל, שיקום לבד.', need: ['tail', 'dome'], half: ['armor', 'fast'],
    real: 'agama', real2: 'tortoise', fact: 'שני רעיונות אמיתיים בשילוב אחד: לטאה מקרובי החרדון מזיזה את הזנב בקפיצה ונשארת ישרה, ולפי זה בנו מכונית צעצוע עם זנב. ושריון גבוה ועגול, כמו של צב יבשה, עוזר לחזור לעמוד אחרי שמתהפכים.',
    clue: 'צריך שניים: מישהו עם זנב לאיזון, ומישהו עם שריון עגול.',
    part: { tail: 'הקפיצות היו ישרות ויפות, אבל כשהרובוט מעד על אבן, הוא נשאר על הגב.', dome: 'כל פעם שנפל, הרובוט התגלגל וקם. הבעיה: הוא נופל כמעט בכל קפיצה.' },
    show: { fail: 'הרובוט קפץ, נפל, ונשאר לשכב.', half: 'הרובוט קפץ קצת יותר טוב, אבל עדיין נופל ולא קם.' } },
  { id: 'slothbot', theme: 'robots', land: true, icon: 'sun', title: 'רובוט שומר יער לשנה שלמה', ask: 'צריך רובוט שיהיה תלוי בין העצים, וימדוד את האוויר ואת החום שנה שלמה, בלי שיחליפו לו סוללה.', need: ['patient', 'sun'], half: ['hold', 'climb'],
    real: 'sloth', fact: 'חוקרים באמריקה בנו רובוט עצלן. הוא זוחל לאט על כבל בין העצים, ונטען מהשמש. הוא זז רק כשהוא צריך להגיע לאור, וכך הוא חוסך כוח, בדיוק כמו העצלן. הוא יכול לעבוד שנה ואפילו יותר.',
    clue: 'צריך שניים: מישהו איטי וסבלני, ומישהו שאוהב שמש.',
    part: { patient: 'הרובוט זז לאט וחסך כוח, אבל אחרי חודש הסוללה בכל זאת נגמרה. חסר משהו שייתן לו כוח מהשמש.', sun: 'הרובוט נטען בשמש, אבל רץ הלוך וחזור כל היום ובזבז הכול. חסר משהו שיאט אותו.' },
    show: { fail: 'הרובוט נפל מהכבל ביום הראשון.', half: 'הרובוט נשאר על הכבל, אבל הכוח שלו נגמר אחרי שבוע.' } },

  // ── אור ושמש
  { id: 'solar', theme: 'energy', kids: true, land: true, icon: 'sun', title: 'פאנל סולרי שנותן יותר חשמל', ask: 'פאנל סולרי הופך אור שמש לחשמל. איך מקבלים ממנו יותר חשמל, בלי שיהיה כבד?', key: 'basking', half: ['sun', 'shine', 'lightspread'],
    real: 'butterfly', fact: 'בבוקר קריר, פרפר הכרוב הלבן פותח את הכנפיים בצורת V. הכנפיים הלבנות מחזירות את אור השמש אל הגוף שלו, והוא מתחמם מהר ויכול לעוף. חוקרים באנגליה סידרו מראות סביב פאנל סולרי באותה צורה, וקיבלו כמעט 50 אחוז יותר חשמל.',
    clue: 'מי פותח כנפיים בשמש של הבוקר, לפני שהוא עף?', show: { fail: 'הפאנל נתן חשמל בדיוק כמו קודם.', half: 'הפאנל נתן קצת יותר, אבל נעשה כבד מאוד.' } },
  { id: 'algaefarm', theme: 'energy', sea: true, icon: 'sun', title: 'חוות אצות שמקבלת אור', ask: 'בבריכות גדלות אצות שאפשר להכין מהן דלק. האור לא מגיע לאצות שבעומק. איך מפזרים אליהן את האור?', key: 'lightspread', half: ['sun', 'shine', 'filter'],
    real: 'clam', fact: 'צדפת הענק מגדלת בתוכה אצות זעירות, כמו האלמוג. בגוף שלה יש תאים מנצנצים שמפזרים את אור השמש החזק, כך שהוא מגיע לכל האצות שבפנים. חוקרים באמריקה מנסים לבנות חומר שמפזר אור באותה דרך, כדי לנצל טוב יותר את אור השמש.',
    clue: 'מי בשונית פותח קליפה גדולה, ובפנים הוא צבעוני ומנצנץ?', show: { fail: 'האצות למעלה קיבלו את כל האור, והאצות למטה נשארו בצל.', half: 'האור התפזר קצת, אבל רובו עדיין נעצר למעלה.' } },
  { id: 'solarfarm', theme: 'energy', icon: 'sun', title: 'תחנת שמש קטנה וחכמה', ask: 'רוצים תחנת שמש קטנה וקלה: לאסוף הרבה אור, ולפזר אותו בדיוק למקום שצריך.', need: ['basking', 'lightspread'], half: ['sun', 'shine'],
    real: 'butterfly', real2: 'clam', fact: 'שני רעיונות אמיתיים בשילוב אחד: מהכנפיים של פרפר הכרוב הלבן למדו לסדר מראות שאוספות אור אל הפאנל. ומצדפת הענק לומדים איך לפזר אור חזק, כך שיגיע לכל מקום.',
    clue: 'צריך שניים: מישהו שאוסף אור בכנפיים, ומישהו שמפזר אור.',
    part: { basking: 'המראות אספו הרבה אור, אבל הוא נפל כולו על נקודה אחת וחימם אותה יותר מדי.', lightspread: 'האור התפזר יפה לכל מקום, אבל לא היה ממנו מספיק.' },
    show: { fail: 'התחנה נתנה קצת חשמל, ואז נכבתה.', half: 'התחנה עבדה, אבל רק בצהריים.' } },

  // ── רפואה
  { id: 'germfree', theme: 'health', icon: 'shield', title: 'משטח שחיידקים לא נדבקים אליו', ask: 'בבית חולים רוצים משטחים שחיידקים לא יוכלו להיאחז בהם, בלי לשפוך עליהם חומרים.', key: 'microskin', half: ['slick', 'armor'],
    real: 'reefshark', fact: 'חוקרים ניסו למנוע מאצות להידבק לאוניות. הם שמו לב שעל לווייתנים מצטברים צדפים ואצות, ועל כרישים כמעט לא. הם העתיקו את הדוגמה הזעירה שעל עור הכריש, וגילו שגם חיידקים מתקשים להיאחז בה. בבדיקה נשארו עליה הרבה פחות חיידקים מאשר על פלסטיק חלק.',
    clue: 'למי בים יש עור נקי, שאצות כמעט לא נדבקות אליו?', show: { fail: 'החיידקים התיישבו על המשטח כמו בבית.', half: 'המשטח חלק, ובכל זאת החיידקים נאחזו בו.' } },
  { id: 'antifungal', theme: 'health', icon: 'pill', title: 'תרופה חדשה נגד פטריות מזיקות', ask: 'יש פטריות זעירות שגורמות למחלות קשות, והתרופות הישנות לא תמיד עובדות. איפה מחפשים תרופה חדשה?', key: 'germguard', half: ['team', 'shelter'],
    real: 'leafcutter', fact: 'הנמלים הגוזרות מגדלות פטרייה בקן ואוכלות אותה. פטרייה אחרת, מזיקה, מנסה לפגוע בגינה שלהן. על הגוף של הנמלים יש שכבה לבנה של חיידקים טובים, והם מייצרים חומרים שעוצרים את הפטרייה המזיקה. חוקרים בברזיל ובאמריקה בודקים את החומרים האלה, כדי למצוא תרופות חדשות. גם הדוכיפת מורחת על הביצים שלה חיידקים טובים, שעוצרים חיידקים אחרים.',
    clue: 'מי מגדל גינה של פטריות בתוך הקן, ושומר עליה ממחלות?', show: { fail: 'הפטרייה המזיקה המשיכה לגדול בצלחת הניסוי.', half: 'הפטרייה המזיקה גדלה קצת לאט יותר, אבל לא נעצרה.' } },
  { id: 'painkiller', theme: 'health', icon: 'pill', title: 'תרופה חדשה נגד כאב', ask: 'רופאים מחפשים תרופה חזקה נגד כאב, שלא תזיק לגוף. אולי לטבע יש רעיון?', key: 'skinchem', half: ['antisting'],
    real: 'dartfrog', fact: 'בעור של צפרדע חץ קטנה מאקוודור מצאו חוקרים חומר שמונע כאב, והוא חזק מאוד. הבעיה: החומר הזה מסוכן. לכן חוקרים בנו חומר דומה ועדין יותר, ובדקו אותו כתרופה. החיפוש עדיין נמשך.',
    clue: 'למי ביער יש צבעים עזים שאומרים לכולם: זהירות, לא לאכול אותי?', show: { fail: 'הכאב בבדיקה נשאר בדיוק כמו קודם.', half: 'הכאב ירד קצת, אבל רק לרגע.' } },
  { id: 'heal', theme: 'health', land: true, icon: 'pill', title: 'פצע שנסגר בלי צלקת', ask: 'אחרי פצע גדול נשארת צלקת. רופאים רוצים לעזור לעור לחזור להיות כמו שהיה.', key: 'regrow', half: ['antisting', 'patient'],
    real: 'spinymouse', fact: 'כשטורף תופס קוצן, חתיכה מהעור שלו יכולה להשתחרר, והקוצן בורח. אחר כך העור חוזר וגדל, יחד עם השערות, כמעט בלי צלקת. חוקרים לומדים את הקוצנים, כדי להבין איך לעזור לפצעים להחלים טוב יותר.',
    clue: 'מי בחורש בורח מטורפים, ומשאיר אצלם חתיכה קטנה מעצמו?', show: { fail: 'העור בבדיקה החלים, אבל נשארה צלקת גדולה.', half: 'הצלקת קטנה יותר, אבל עדיין רואים אותה.' } },
  { id: 'bandage', theme: 'health', icon: 'shield', title: 'פלסטר שנדבק גם לעור רטוב', ask: 'פלסטר רגיל לא נדבק כשהעור רטוב, וכואב כשמורידים אותו. איך עושים פלסטר אחר?', key: 'suction', half: ['grip', 'hold'],
    real: 'octopus', fact: 'בתוך כל כף יניקה של התמנון יש בליטה קטנה, והיא עוזרת לכף להיצמד חזק. חוקרים בקוריאה עשו מדבקה עם הרבה כפות זעירות כאלה. היא נדבקת גם לעור רטוב וגם מתחת למים, בלי דבק בכלל, ואפשר להדביק ולהוריד אותה אלף פעמים.',
    clue: 'למי יש זרועות מלאות בכפות יניקה?', show: { fail: 'הפלסטר נפל ברגע שהעור נרטב.', half: 'הפלסטר נדבק, אבל כאב להוריד אותו.' } },

  // ── רשתות
  { id: 'anternet', theme: 'nets', icon: 'net', title: 'רשת מחשבים שלא נתקעת', ask: 'כשהרבה מחשבים שולחים מידע יחד, הרשת נתקעת, כמו פקק תנועה. איך יודעים כמה לשלוח?', key: 'pace', half: ['team', 'memory', 'dance'],
    real: 'harvesterant', fact: 'נמלי קציר באריזונה יוצאות לאסוף זרעים. כשהנמלים חוזרות מהר עם זרעים, יוצאות עוד נמלים. כשהן חוזרות לאט או בלי כלום, יוצאות פחות. חוקרים מאוניברסיטת סטנפורד גילו שזה כמעט בדיוק הכלל שלפיו האינטרנט מחליט כמה מידע לשלוח.',
    clue: 'מי אוסף זרעים לקן, ויודע מתי לשלוח עוד עובדים?', show: { fail: 'כל המחשבים שלחו יחד, והרשת נתקעה.', half: 'הרשת עבדה, אבל לאט מאוד.' } },
  { id: 'beeserver', theme: 'nets', icon: 'net', title: 'מחשבים שמתחלקים בעבודה', ask: 'באתר אינטרנט גדול יש הרבה מחשבים. צריך להחליט איזה מחשב יעבוד על מה, כשכל רגע משהו משתנה.', key: 'dance', half: ['team', 'pace', 'memory'],
    real: 'honeybee', fact: 'דבורה שמצאה פרחים טובים חוזרת לכוורת ורוקדת. הריקוד מספר לדבורות האחרות לאן לעוף, וכך יותר דבורות הולכות לפרחים הטובים, בלי שאף אחת מנהלת אותן. חוקרים באמריקה ובאנגליה בנו לפי זה דרך לחלק עבודה בין מחשבים, וחברות גדולות משתמשות בה היום.',
    clue: 'מי חוזר הביתה ורוקד, כדי לספר לחברים איפה יש אוכל?', show: { fail: 'מחשב אחד עבד קשה מאוד, וכל השאר ישנו.', half: 'העבודה התחלקה, אבל לא לפי מה שהיה צריך.' } },
];
// ── open inventions (1.3.1): more than one way to solve a problem. Scoring is by the TRAITS of the cards on the bench
// (src/data/invent-score.js), never by a card id:
//   · a route is a set of traits that solves the problem: the problem's own (`key`, or `need` for a combination) or
//     one of its `alt` routes. An alt route is a different idea that really works (a creative solution): `why` says why
//     it works, `fact` (optional) is a true fact about it (docs/sources.md, "open inventions"). A route of two traits
//     may come from two cards or from one card that has both.
//   · `want` says in plain words what the problem needs, without naming a creature: the gentle first hint, and the
//     "what is still missing" line of a partial result (an object by trait for a combination).
//   · `half` (when given here) replaces the problem's half list: traits that became an alt route leave it.
// tools/check-inventions.mjs runs every card and every pair of cards against every problem.
const ROUTES = {
  swim: { want: 'משהו שעוזר לבגד להחליק במים, עם פחות חיכוך.',
    alt: [{ t: ['slime'], why: 'בגד עם שכבה חלקלקה, כמו העור של המורנה: המים מתחככים בו פחות.', fact: 'חוקרים מצאו שהריר שעל העור של דגים מקטין את החיכוך עם המים.' }] },
  quiet: { want: 'משהו שעושה פחות רעש, או בולע את הרעש.',
    alt: [{ t: ['mycel'], why: 'קירות מחומר רך של חוטי פטרייה לאורך המסילה: חומר רך ומלא חורים בולע חלק מהרעש.', fact: 'יש היום לוחות שבולעים רעש, והם עשויים מחוטי פטרייה. תולים אותם על קירות, כדי שיהיה שקט יותר.' }] },
  hover: { want: 'מישהו שיודע לעמוד במקום אחד באוויר.' },
  sting: { want: 'משהו שהזרועות הצורבות לא יכולות לעבור דרכו.',
    alt: [{ t: ['armor', 'swim'], why: 'חליפה דקה שמכסה את כל העור, כמו שריון שאפשר לשחות בו: הזרועות הצורבות לא מגיעות לעור.', fact: 'יש מקומות שבהם שוחים בחליפות דקות וצמודות שמכסות את כל הגוף, כדי להגן מצריבות של מדוזות.' }] },
  roof: { want: 'מבנה שנותן חוזק גדול עם מעט חומר.', half: ['float', 'lightstrong', 'foamcore'],
    alt: [{ t: ['hexa'], why: 'גג שבנוי ממשושים, כמו חלת דבש: הוא חזק מאוד ושוקל מעט.', fact: 'בחממות הענק של "פרויקט עדן" באנגליה, הכיפות בנויות ממסגרת קלה של משושים.' },
      { t: ['dome'], why: 'גג בצורת כיפה, כמו שריון הצב: הכיפה מפזרת את המשקל לכל הצדדים, ולכן היא מחזיקה הרבה.' }] },
  color: { want: 'משהו שהצבע שלו בא מהצורה של החלקים הזעירים, ולא מצבע.', half: ['bright', 'bloom'],
    alt: [{ t: ['colorshift'], why: 'בעור שמשנה צבע יש גם תאים זעירים שמחזירים אור בצבעים. גם כך מקבלים צבע מבריק בלי צבע.' }] },
  grip: { want: 'משהו שתופס חזק, אבל ברכות.', half: ['hold', 'strong', 'tubefeet', 'wrap'],
    alt: [{ t: ['suction'], why: 'כפות יניקה רכות: הן נצמדות לביצה בלי למעוך אותה, וגם לאבן חלקה.' }] },
  wing: { want: 'חומר שהוא גם קל מאוד וגם חזק.', half: ['ribs', 'armor', 'tough'],
    alt: [{ t: ['foamcore'], why: 'קצף קל בתוך צינור קשה, כמו בקוץ של הדורבן: הרבה חוזק ומעט משקל.', fact: 'חוקרים בנו לוחות קלים למטוסים ולמכוניות, לפי הקולמוס של הדורבן.' },
      { t: ['hexa'], why: 'מבנה של משושים, כמו חלת דבש: חזק מאוד ושוקל מעט. לוחות כאלה נמצאים במטוסים.' }] },
  panel: { want: 'מבנה חזק שרובו אוויר.', half: ['ribs', 'team', 'tough'],
    alt: [{ t: ['foamcore'], why: 'לוח עם קצף קל בפנים וקליפה חזקה בחוץ, כמו הקולמוס של הדורבן.', fact: 'לפי הקולמוס של הדורבן בנו חוקרים לוחות קלים, בשביל מטוסים ומכוניות.' },
      { t: ['lightstrong'], why: 'קליפה דקה וחזקה, ובפנים קצף עם חללים, כמו במקור של הטוקן: חזק וקל.' }] },
  lamp: { want: 'משהו שעוזר לאור לצאת החוצה, במקום להיתקע בפנים.', half: ['shine', 'bright'],
    alt: [{ t: ['lightspread'], why: 'שכבה שמפזרת את האור, כמו התאים המנצנצים של צדפת הענק: האור לא נתקע בפנים, ויוצא לכל הכיוונים.' }] },
  robotswim: { want: 'דרך לזוז במים בלי לבזבז הרבה כוח.', half: ['float', 'patient', 'paddle'],
    alt: [{ t: ['wave'], why: 'סנפירים רחבים שזזים בגל רך, כמו של חתול הים: תנועה כזאת חוסכת כוח.', fact: 'חברה בגרמניה בנתה רובוט כזה בהשראת המנטה, קרובה של חתול הים. הוא צורך מעט מאוד חשמל.' },
      { t: ['float', 'patient'], why: 'רובוט שעולה ויורד רק בעזרת שינוי בציפה, וגולש לאט קדימה. כמעט לא צריך מנוע.', fact: 'כך עובדים "רחפני ים" אמיתיים: הם עולים ויורדים, גולשים לאט, ונשארים בים שבועות ואפילו חודשים.' }] },
  glide: { want: 'תנועה רכה ושקטה במים, בלי מדחף רועש.', half: ['quiet', 'hide', 'slime'],
    alt: [{ t: ['pulse'], why: 'רובוט רך שזז בפעימות, כמו מדוזה: הוא שקט ועדין, והדגים לא בורחים ממנו.', fact: 'חוקרים בפלורידה בנו מדוזות רובוטיות רכות, כדי לחקור שוניות בלי לפגוע בהן.' }] },
  cloth: { want: 'משהו שנפתח ונסגר לבד, לפי מה שקורה סביבו.',
    alt: [{ t: ['coil'], why: 'חוטים שמתלפפים ונפתחים: כשהחוט מתלפף, נפתח רווח לאוויר.', fact: 'כך באמת עובד הבד החכם: הסיבים שלו מתכרבלים כשהם נרטבים מזיעה, ונפתחים רווחים בבד.' }] },
  camo: { want: 'משהו שמשנה את המראה שלו לפי מה שמסביב.', half: ['hide', 'shine', 'bright'] },
  lifevest: { want: 'חומר שיש בו הרבה אוויר סגור, שהמים לא נכנסים אליו.', half: ['float'],
    alt: [{ t: ['foamcore'], why: 'קצף מלא בבועות אוויר קטנות, כמו בתוך הקולמוס של הדורבן: המים לא נכנסים לבועות, והחגורה צפה.', fact: 'רוב חגורות ההצלה היום ממולאות בקצף. לפני כן מילאו אותן בסיבי קפוק.' }] },
  plasma: { want: 'דרך להיפטר מחיידקים בלי לשפוך חומרים למים.',
    alt: [{ t: ['filter'], why: 'מסננת דקה מאוד, כמו בספוג: היא עוצרת גם חיידקים זעירים, והמים יוצאים נקיים יותר.', fact: 'הספוג שואב מים דרך חורים זעירים, ותופס ואוכל גם חיידקים קטנטנים.' }] },
  batbot: { want: 'משהו רך, שלא מזיק כשהוא נתקל במשהו.',
    alt: [{ t: ['fly', 'cushion'], why: 'רחפן עם ריפוד רך מסביב, כמו הקוצים של הקיפוד: כשהוא נתקל במשהו, הריפוד בולם את המכה.' }] },
  safedrone: { want: { hover: 'מישהו שעומד במקום אחד באוויר.', softwing: 'משהו רך, שלא שובר ענפים כשהוא נוגע בהם.' },
    alt: [{ t: ['hover', 'cushion'], why: 'רחפן שעומד במקום, עם ריפוד רך מסביב: גם אם הוא נוגע בענף, הריפוד בולם, ושום דבר לא נשבר.' }] },
  quill: { want: 'מבנה ארוך וקל, שלא מתכופף.', half: ['hexa', 'ribs', 'spines'],
    alt: [{ t: ['lightstrong'], why: 'קליפה קשה בחוץ וקצף קל בפנים, כמו במקור של הטוקן: אותו רעיון, וגם הוא עובד.' },
      { t: ['hollowfiber'], why: 'צינור חלול מתכופף פחות ממוט מלא שיש לו אותו משקל. לכן גם צינור חלול הוא קורה טובה.' }] },
  nutshell: { want: 'חומר שלא נסדק, גם כשמכים בו.', half: ['armor', 'lightstrong', 'foamcore'],
    alt: [{ t: ['cushion'], why: 'ריפוד שמתכופף ובולם את המכה, כמו הקוצים של הקיפוד: המכה לא מגיעה לקופסה, והיא לא נסדקת.' }] },
  helmet: { want: 'משהו שבולם את המכה, ולא מעביר אותה הלאה.', half: ['spines', 'armor'],
    alt: [{ t: ['foamcore'], why: 'קצף עם הרבה תאים קטנים, כמו בתוך הקולמוס: כשמכים בו, התאים נמעכים ובולמים את המכה.', fact: 'ברוב קסדות האופניים יש שכבה של קצף. בזמן נפילה הקצף נמעך, והראש נעצר לאט יותר.' }] },
  package: { want: { mycel: 'חומר מהטבע, שנעלם באדמה.', cushion: 'משהו שבולם מכות.' },
    alt: [{ t: ['mycel', 'foamcore'], why: 'מגדלים את חוטי הפטרייה בצורה של קצף קל, כמו בתוך הקולמוס: הוא בולם מכות, ואחר כך נרקב באדמה.' },
      { t: ['mycel', 'hollowfiber'], why: 'קופסה מחוטי פטרייה, ובפנים צמר רך של סיבי קפוק: שניהם חומרים מהטבע, והם נרקבים באדמה.' }] },
  tooth: { want: 'חומר שנשאר חזק וחד, גם אחרי הרבה חיכוך.',
    alt: [{ t: ['lantern'], why: 'שיניים כמו של קיפוד הים: כשהן נשחקות, הן מתחדדות במקום להתקהות.', fact: 'חוקרים בקליפורניה גילו שהשיניים של קיפוד ים מתחדדות לבד בזמן שהן נשחקות. הם חושבים שאפשר לבנות כך כלי חיתוך.' }] },
  mycelium: { want: 'חומר מהטבע, שנרקב באדמה.',
    alt: [{ t: ['hollowfiber'], why: 'למלא את האריזה בצמר של סיבי קפוק: זה חומר מצמח, רך וקל, והוא נרקב באדמה.' }] },
  tongue: { want: 'משהו שמתאים את עצמו לכל צורה.', half: ['grip', 'hold', 'suction', 'tubefeet'],
    alt: [{ t: ['coil'], why: 'זרוע רכה שמתלפפת סביב החפץ, כמו קנוקנת: היא נצמדת לכל צורה.' }] },
  tailbot: { want: 'משהו שעוזר לגוף להישאר ישר באוויר.',
    alt: [{ t: ['softwing'], why: 'כנפיים כבדות שנפתחות ונסגרות באוויר, כמו של העטלף: כשמזיזים אותן, הגוף מסתובב בחזרה ונשאר ישר.', fact: 'חוקרים גילו שעטלפים מסתובבים באוויר בעזרת התנועה של הכנפיים הכבדות שלהם. הם כתבו שזה יכול לעזור גם לרובוטים מעופפים.' }] },
  righting: { want: 'צורה או חלק שעוזרים לרובוט להתהפך בחזרה.',
    alt: [{ t: ['tail'], why: 'זנב חזק שדוחף את הקרקע: הוא מרים צד אחד של הגוף, והרובוט מתגלגל בחזרה.' }] },
  tendril: { want: 'משהו שנאחז בעמוד בלי ידיים.', half: ['hold', 'climb', 'grip'],
    alt: [{ t: ['suction'], why: 'כפות יניקה שנצמדות לעמוד, אחת אחרי השנייה: כך אפשר לטפס גם בלי ידיים.' },
      { t: ['tubefeet'], why: 'הרבה רגליים קטנות ודביקות, כמו של הקוצנון: כל אחת נצמדת ומשתחררת, והרובוט זוחל למעלה.' }] },
  marsclaw: { want: 'משהו שאוסף מעט, בדיוק מהמקום הנכון.',
    alt: [{ t: ['dig', 'grip'], why: 'כף חפירה קטנה, ויד עדינה שסוגרת אותה מלמעלה: אוספים מעט אדמה, ושום דבר לא נשפך.' }] },
  amphibot: { want: { paddle: 'משהו ששוחה טוב במים.', walk: 'משהו שהולך טוב על היבשה.' },
    alt: [{ t: ['swim', 'walk'], why: 'רובוט ששוחה כמו יצור מים והולך כמו יצור יבשה. הקפיברה, למשל, עושה את שניהם, ועוברת מהמים אל החוף.' }] },
  handy: { want: { suction: 'משהו שנצמד לדברים רטובים וחלקים.', wrap: 'משהו שעוטף כל צורה.' },
    alt: [{ t: ['suction', 'grip'], why: 'זרוע אחת שגם נצמדת וגם מתעגלת סביב החפץ, כמו הזרוע של התמנון: היא מרימה גם אבנים רטובות וגם צדפים משונים.' }] },
  stunt: { want: { tail: 'משהו ששומר על הגוף ישר בקפיצה.', dome: 'משהו שעוזר לקום אחרי נפילה.' },
    alt: [{ t: ['softwing', 'dome'], why: 'כנפי עור כבדות מייצבות את הגוף באוויר, כמו אצל העטלף, ושריון עגול עוזר לקום אחרי נפילה.' }] },
  slothbot: { want: { patient: 'משהו שזז לאט וחוסך כוח.', sun: 'משהו שמקבל כוח מהשמש.' },
    alt: [{ t: ['patient', 'basking'], why: 'רובוט איטי, עם כנפיים שאוספות אור שמש כמו של פרפר: הוא חוסך כוח וגם נטען.' }] },
  solar: { want: 'משהו שאוסף יותר אור אל הפאנל.', half: ['sun', 'shine'],
    alt: [{ t: ['lightspread'], why: 'שכבה שמפזרת את האור על כל הפאנל, כמו בצדפת הענק: כל חלק בפאנל מקבל אור, ופחות אור הולך לאיבוד.', fact: 'חוקרים בפנסילבניה לומדים את צדפת הענק, כדי לנצל טוב יותר את אור השמש.' }] },
  algaefarm: { want: 'משהו שמעביר את האור גם לעומק.', half: ['sun', 'shine', 'filter'],
    alt: [{ t: ['basking'], why: 'מראות בצורת כנפיים פתוחות, שמחזירות את אור השמש פנימה ולמטה, אל האצות שבעומק.' },
      { t: ['hollowfiber'], why: 'צינורות חלולים ומבריקים מבפנים, שמובילים את אור השמש למטה, כמו סיב חלול.', fact: 'יש בניינים שמכניסים בהם אור שמש לחדרים פנימיים, דרך צינורות שמבריקים מבפנים.' }] },
  solarfarm: { want: { basking: 'משהו שאוסף הרבה אור.', lightspread: 'משהו שמפזר את האור למקום שצריך.' },
    alt: [{ t: ['basking', 'hollowfiber'], why: 'מראות אוספות את האור, וצינורות חלולים ומבריקים מובילים אותו בדיוק למקום שצריך.', fact: 'יש בניינים שמכניסים בהם אור שמש לחדרים פנימיים, דרך צינורות שמבריקים מבפנים.' }] },
  germfree: { want: 'משטח שחיידקים מתקשים להיאחז בו, או משהו ששומר עליו.',
    alt: [{ t: ['germguard'], why: 'מנקים עם חיידקים טובים, כמו החיידקים ששומרים על הנמלים: הם תופסים את המקום, ולחיידקים המזיקים נשאר פחות מקום.', fact: 'בכמה בתי חולים באיטליה ניקו משטחים בעזרת חיידקים טובים, ועל המשטחים נמצאו הרבה פחות חיידקים מזיקים.' }] },
  antifungal: { want: 'יצור שיש לו חומר שעוצר פטריות מזיקות.',
    alt: [{ t: ['skinchem'], why: 'בעור של צפרדעים יש חומרים שעוצרים חיידקים ופטריות. גם שם אפשר לחפש תרופה.', fact: 'בעור של צפרדע אחת מאפריקה מצאו חומרים שעוצרים פטרייה מזיקה.' },
      { t: ['mycel'], why: 'גם פטריות מייצרות חומרים נגד פטריות אחרות. אולי שם יש תרופה?', fact: 'תרופה אמיתית נגד פטריות בעור מייצרים מעובש, שהוא סוג של פטרייה.' }] },
  painkiller: { want: 'יצור שיש לו חומר מיוחד שפועל על הגוף.',
    alt: [{ t: ['sting'], why: 'החומרים הצורבים של בעלי חיים פועלים על העצבים. לכן חוקרים מחפשים בהם גם תרופות נגד כאב.', fact: 'בשושנת ים, מהסוג שהשושנון גר בה, מצאו חוקרים חומרים שהקטינו כאב בבדיקות.' }] },
  heal: { want: 'יצור שהגוף שלו יודע לבנות מחדש חלקים שנפגעו.' },
  bandage: { want: 'משהו שנצמד גם במים, ומשתחרר בקלות.',
    alt: [{ t: ['tubefeet'], why: 'רגליים קטנות כמו של הקוצנון: הן נדבקות לסלע מתחת למים, ומשתחררות בלי לקרוע כלום.', fact: 'חוקרים לומדים את הרגליים הקטנות של כוכבי ים. הן נדבקות ומשתחררות שוב ושוב, ואולי ילמדו מהן לעשות דבק חדש.' }] },
  anternet: { want: 'מישהו שיודע לשלוח עוד עובדים, רק כשיש בשבילם עבודה.', half: ['team', 'memory'],
    alt: [{ t: ['dance'], why: 'כמו הדבורים: מי שחזר עם הצלחה מספר לאחרים, ורק אז יוצאים עוד. כך הרשת לא נעמסת.' }] },
  beeserver: { want: 'מישהו שמחלק עבודה בלי מנהל, לפי מה שקורה עכשיו.', half: ['team', 'memory'],
    alt: [{ t: ['pace'], why: 'כמו נמלי הקציר: שולחים עוד עובדים לאן שהעבודה מצליחה, ופחות לאן שהיא לא מצליחה.' }] },
};
for (const p of PROBLEMS) { const r = ROUTES[p.id] || {}; p.want = r.want || ''; p.alt = r.alt || []; if (r.half) p.half = r.half; }

export const problemById = (id) => PROBLEMS.find((p) => p.id === id) || null;
export const problemNeeds = (p) => (p.need ? p.need : [p.key]);

// wild pairs: two cards whose traits make something funny but logical (when nothing on the bench solves the problem)
export const WILD = [
  { t: ['spines', 'float'], text: 'יצא כדור קוצני שצף על המים. אף דג לא מתקרב אליו, אבל זה לא פותר את הבעיה.' },
  { t: ['patient', 'fast'], text: 'ההמצאה רצה מהר מאוד, ואז עצרה לנוח שעה. ושוב רצה, ושוב נחה.' },
  { t: ['glow', 'hide'], text: 'ניסינו להתחבא ולהאיר באותו הזמן. כולם מצאו אותנו בגלל האור.' },
  { t: ['loud', 'quiet'], text: 'ההמצאה שתקה דקה, ואז צעקה. ושוב שתקה. אף אחד לא הבין מה היא רוצה.' },
  { t: ['fly', 'dig'], text: 'ההמצאה עפה למעלה, אחר כך חפרה בור, ונעלמה בתוכו.' },
  { t: ['armor', 'float'], text: 'יצאה סירה קטנה עם שריון. היא צפה מצוין, אבל לא פתרה את הבעיה.' },
  { t: ['spines', 'grip'], text: 'היד תופסת חזק מאוד, אבל דוקרת כל דבר שהיא תופסת.' },
  { t: ['colorshift', 'loud'], text: 'ההמצאה משנה צבע בכל פעם שהיא צועקת. יפה מאוד, ולא מועיל בכלל.' },
  { t: ['swim', 'sun'], text: 'ההמצאה שחתה אל החוף ונשכבה בשמש. נראה שהיא יצאה לחופשה.' },
  { t: ['tall', 'hide'], text: 'ניסינו להסתיר משהו גבוה מאוד. הראש שלו עדיין מציץ מעל העצים.' },
  { t: ['nightsee', 'sun'], text: 'ההמצאה רואה בחושך, אבל אוהבת רק שמש. היא לא מחליטה מתי לעבוד.' },
  { t: ['strong', 'patient'], text: 'ההמצאה חזקה מאוד, אבל עד שהיא מתחילה להרים, עובר יום שלם.' },
  { t: ['team', 'hide'], text: 'כל הצוות התחבא יחד. עכשיו אף אחד לא יודע איפה כולם.' },
  { t: ['bloom', 'machine'], text: 'יצאה מכונה עם פרחים. היא נראית נהדר, ולא עושה כלום.' },
];

// what רובו־דע says. {n} = the card's name; {m|f|mp|fp} picks the words for the name's gender and number
export const SAY = {
  win: ['יש! {n} {פתר|פתרה|פתרו|פתרו} את הבעיה!', 'וואו! {n} {הוא|היא|הם|הן} בדיוק מה שהיה חסר!', 'הבדיקה הצליחה! {n} {מלמד|מלמדת|מלמדים|מלמדות} אותנו משהו חדש.', 'מושלם! הבעיה נפתרה.'],
  winPair: ['שילוב חכם! שני היצורים עזרו יחד.', 'שניים יחד עובדים טוב יותר מאחד. בדיוק כמו ברשת החיים!'],
  combo: ['שילוב! כל אחד מהשניים הביא חלק אחר, ויחד זה עבד.', 'שני רעיונות, המצאה אחת. בדיוק כך ממציאים!'],
  wild: ['רגע, רגע... זה עבד?! לא האמנתי! איזה רעיון מפתיע.', 'אני צריך לעדכן את הספרים. מי חשב ששני אלה יעבדו יחד?'],
  half: ['כמעט! {n} {עזר|עזרה|עזרו|עזרו} קצת, אבל עוד לא מספיק.', 'יש התקדמות! {n} {נותן|נותנת|נותנים|נותנות} רעיון, אבל חסר עוד משהו.', 'חצי הצלחה. אולי נוסיף עוד יצור לשילוב?'],
  part: ['חצי מהשילוב כבר כאן!', 'יש לנו חלק אחד. מה חסר?'],
  odd: ['תוצאה משונה!', 'זה לא מה שתכננו...', 'רשמתי ביומן: ניסוי מצחיק.'],
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
  // open inventions (1.3.1): two good ideas that are not a full solution yet, and a creative route that works
  good: ['חשיבה טובה! יש כאן שני דברים שעוזרים.', 'כיוון טוב מאוד! עוד צעד קטן, ויש המצאה.'],
  creative: ['רעיון יצירתי שעובד!', 'לא חשבתי על זה, וזה עובד באמת! רעיון יצירתי.'],
};

// ── the robot workshop (1.3.1): a goal first, then a body (one card) and 2 to 4 traits from other cards.
// Every trait adds weight (TRAIT_W, default 1) and the body has its own weight (bodyWeight): a robot with four traits
// is good at more things, but heavier, and in some tests weight hurts. The body brings its first two traits free.
// A test (TRIALS) is scored by src/data/invent-score.js robotTest(): a `good` trait is the main help, an `ok` trait helps a
// little, a `bad` trait hurts; `heavy` says how much weight above 4 hurts here, `busy` how much each trait beyond two
// hurts (more motors make more noise, more parts make a bigger robot). `need` names what helps (the "what was missing"
// line of the breakdown), `load` why the weight or the size hurt. Mission ids and test ids are kept in saves.
export const TRAIT_W = { armor: 2, dome: 2, tough: 2, strong: 2, tall: 2, machine: 2, lightstrong: 0, foamcore: 0, hollowfiber: 0, float: 0 };
const BODY_KIND_W = { tree: 4, palm: 4, coral: 3, shrub: 2, sessile: 2, colony: 1, swarm: 1, herb: 1, vine: 1, epiphyte: 1, fungus: 1, 'water-plant': 1, seaplant: 1, animal: 2 };
const BODY_W = { jaguar: 3, tapir: 3, capybara: 3, anteater: 3, gazelle: 3, grouper: 3, turtle: 3, tortoise: 3, reefshark: 3,
  hummingbird: 1, orchidbee: 1, morpho: 1, dartfrog: 1, honeybee: 1, butterfly: 1, firefly: 1, spinymouse: 1, goby: 1, cleaner: 1, shrimp: 1, clownfish: 1, agama: 1, chameleon: 1, plankton: 1 };
export function bodyWeight(card) {
  if (!card) return 0;
  if (card.type === 'tool') return 3;
  const id = String(card.id || '').split(':').pop();
  return BODY_W[id] || BODY_KIND_W[card.skind] || 2;
}
export const traitWeight = (t) => (t in TRAIT_W ? TRAIT_W[t] : 1);

export const TRIALS = [
  { id: 'swim', title: 'שחייה', icon: 'drop', good: ['swim', 'slick', 'slime', 'paddle', 'wave', 'pulse'], ok: ['float', 'fast', 'hollowfiber'], heavy: 2,
    need: 'משהו ששוחה, או עור חלק במים', load: 'במים, רובוט כבד שוקע ומאט.',
    fun: { fail: 'שקע לקרקעית ושלח בועות.', half: 'שחה, אבל בעיגולים.', win: 'חתך את המים כמו חץ!' } },
  { id: 'branch', title: 'אחיזה בענף', icon: 'tree', good: ['grip', 'hold', 'coil', 'wrap'], ok: ['climb', 'suction', 'tubefeet', 'tail'], heavy: 3,
    need: 'משהו שנאחז בענף או מתלפף סביבו', load: 'ענף דק מתכופף מתחת לרובוט כבד.',
    fun: { fail: 'החליק למטה כמו במגלשה.', half: 'נתלה על הענף, והענף התכופף.', win: 'נאחז בענף ולא זז!' } },
  { id: 'sand', title: 'הליכה בחול', icon: 'sand', good: ['walk', 'dig'], ok: ['fast', 'patient', 'strong'], heavy: 2,
    need: 'משהו שהולך ביבשה או חופר', load: 'בחול, רובוט כבד שוקע עמוק.',
    fun: { fail: 'שקע בחול ונשאר תקוע.', half: 'הלך, אבל כל צעד לקח רגע.', win: 'עבר את הדיונה בקלות!' } },
  { id: 'quiet', title: 'שקט בלילה', icon: 'moon', good: ['quiet', 'softwing', 'patient'], ok: ['hide', 'slime'], bad: ['loud', 'machine'], busy: 12,
    need: 'משהו שזז בשקט', load: 'כל תכונה נוספת היא עוד מנוע, ועוד מנוע עושה עוד רעש.',
    fun: { fail: 'כולם התעוררו מהרעש.', half: 'כמעט שקט, רק חרק קצת.', win: 'עבר בשקט, ואף אחד לא שמע!' } },
  { id: 'heat', title: 'חום חזק', icon: 'sun', good: ['sun', 'dig'], ok: ['patient', 'shine', 'dome'], bad: ['basking'],
    need: 'משהו שאוהב שמש, או מסתתר מתחת לאדמה', load: '',
    fun: { fail: 'התחמם מדי ונכבה.', half: 'החזיק מעמד, אבל נח בצל.', win: 'עבד גם בצהריים הכי חמים!' } },
  { id: 'cold', title: 'קור ושלג', icon: 'thermo', good: ['team', 'dig', 'basking'], ok: ['patient', 'shelter', 'armor'],
    need: 'משהו שאוסף חום מהשמש, מתחבא במחילה, או מתחמם יחד עם אחרים', load: '',
    fun: { fail: 'קפא במקום, כמו גלידה.', half: 'רעד מקור, אבל המשיך.', win: 'נשאר חם ועבד כל הלילה!' } },
  { id: 'wall', title: 'טיפוס על קיר', icon: 'wall', good: ['suction', 'tubefeet', 'climb'], ok: ['grip', 'hold', 'tail'], heavy: 3,
    need: 'משהו שנצמד או מטפס', load: 'על קיר, כל תוספת מושכת את הרובוט למטה.',
    fun: { fail: 'החליק למטה ונחת על הגב.', half: 'טיפס עד האמצע ונח.', win: 'הגיע עד למעלה!' } },
  { id: 'carry', title: 'נשיאת משא', icon: 'box', good: ['strong', 'team'], ok: ['walk', 'armor', 'tall', 'wovenhard'],
    need: 'משהו חזק, או צוות שעובד יחד', load: '',
    fun: { fail: 'הרים את המשא... בדמיון.', half: 'הרים, והלך כמו עצלן.', win: 'הרים בקלות ועוד ביקש עוד!' } },
  { id: 'gap', title: 'מעבר בסדק צר', icon: 'gap', good: ['hide', 'coil', 'slime'], ok: ['dig', 'patient'], bad: ['armor', 'dome', 'spines', 'tall'], heavy: 1, busy: 15,
    need: 'משהו קטן שיודע להשתחל ולהסתתר', load: 'כל תכונה נוספת מגדילה את הרובוט, והסדק צר.',
    fun: { fail: 'נתקע בכניסה לסדק.', half: 'עבר, אבל השאיר שם בורג.', win: 'השתחל פנימה כמו תמנון!' } },
  { id: 'glide', title: 'גלישה באוויר', icon: 'wind', good: ['fly', 'softwing', 'hover'], ok: ['lightstrong', 'foamcore', 'hollowfiber', 'basking'], heavy: 4,
    need: 'משהו שעף, או כנף רחבה וקלה', load: 'באוויר, כל תוספת מושכת למטה.',
    fun: { fail: 'נפל ישר למטה. בום.', half: 'גלש קצת, ונחת מוקדם.', win: 'גלש רחוק ונחת בעדינות!' } },
  { id: 'dark', title: 'ראייה בחושך', icon: 'eye', good: ['nightsee', 'glow'], ok: ['memory', 'quiet'],
    need: 'משהו שרואה בחושך או מאיר', load: '',
    fun: { fail: 'נתקל בעץ ואמר "סליחה".', half: 'מצא, אבל רק את הדרך חזרה.', win: 'מצא הכול בחושך!' } },
  { id: 'clean', title: 'ניקוי משטח בשונית', icon: 'wave', good: ['lantern', 'wovenhard', 'filter'], ok: ['tubefeet', 'suction', 'team', 'patient'], heavy: 1,
    need: 'משהו שמגרד אצות או מסנן מים', load: 'רובוט כבד עלול לשבור את האלמוגים.',
    fun: { fail: 'הסתובב במקום, והאצות נשארו.', half: 'ניקה פינה אחת ונח.', win: 'השונית נקייה ומבריקה!' } },
];

// the goals: the child picks one before building; each needs some of the tests (all of them: the big test)
export const MISSIONS = [
  { id: 'reef', title: 'לנקות את השונית', ask: 'אצות מכסות את האלמוגים. צריך רובוט שישחה, ינקה בעדינות, ויגיע גם לסדקים.', tests: ['swim', 'clean', 'gap'], art: 'reef:urchin' },
  { id: 'cave', title: 'לספור עטלפים במערה', ask: 'במערה חשוך ושקט. צריך רובוט שרואה בחושך, לא מעיר אף אחד, ומטפס על הקירות.', tests: ['dark', 'quiet', 'wall'], art: 'amazon:fruitbat' },
  { id: 'fire', title: 'להציל זרעים מהשריפה', ask: 'אחרי שריפה בחורש, צריך לאסוף זרעים מהאדמה החמה ולהביא אותם למשתלה.', tests: ['heat', 'carry', 'sand'], art: 'grove:oak' },
  { id: 'nest', title: 'לבדוק קן בצמרת', ask: 'רוצים לדעת אם יש ביצים בקן גבוה, בלי להבהיל את הציפורים.', tests: ['branch', 'quiet', 'glide'], art: 'grove:jay' },
  { id: 'snow', title: 'משלוח להר המושלג', ask: 'בחורף, תחנת המחקר בהר מכוסה שלג. צריך להביא לשם ציוד, במעלה סלע תלול.', tests: ['cold', 'carry', 'wall'], art: 'grove:hyrax' },
  { id: 'deep', title: 'מערה מתחת למים', ask: 'בשונית יש מערה חשוכה עם כניסה צרה. מה יש בפנים?', tests: ['swim', 'dark', 'gap'], art: 'reef:moray' },
  { id: 'all', title: 'המבחן הגדול', ask: 'כל שתים עשרה הבדיקות. אין רובוט שמצליח בכולן. בכמה תצליחו?', tests: TRIALS.map((t) => t.id), art: 'reef:octopus', free: true },
];

// what רובו־דע says about a test and about a mission
export const ROBOT_SAY = {
  helped: 'עזר:', hurt: 'הכביד:', weight: 'משקל {w}.', bad: 'הפריע:', missing: 'חסר:',
  missionAll: 'המשימה הצליחה בגדול! הרובוט עבר את כל הבדיקות בהצטיינות.',
  missionWin: 'המשימה הצליחה! עוד שיפור קטן, ואולי זה יהיה מושלם.',
  missionFail: 'המשימה עוד לא הצליחה. הבדיקה הקשה: {t}.',
  tipNeed: 'אולי תכונה אחרת? בבדיקה הזאת עוזר {need}.',
  tipHeavy: 'הרובוט כבד מדי בשביל הבדיקה הזאת. נסו פחות תכונות, או תכונות קלות יותר.',
  free: 'הרובוט עבר {n} מתוך 12 בדיקות. אין רובוט שעובר את כולן: כל תכונה עוזרת במשהו ומכבידה במשהו אחר.',
  lean: 'רק שתי תכונות, והמשימה הצליחה! לפעמים פחות זה יותר.',
};

