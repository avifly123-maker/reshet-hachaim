// רשת החיים – zone registry (always loaded, part of the core).
// Only what the start screen needs to draw a zone's card lives here; everything else about a zone (its content,
// species models, missions, tips) is in the zone's pack (src/packs/<id>.js), loaded on demand by core/packs.js.
// src/data/<id>.js spreads its entry back into BIOME, so BIOME.id / name / subtitle / intro are unchanged.
// A new zone = an entry here + src/data/<id>.js + src/packs/<id>.js + a loader line in src/core/packs.js.
// 1.4: this is the one list of zones. Code that needs "every zone", a zone's short name, its colour or its mascot reads
// it from here (ZONE_IDS, ZONE_LOOK), never from its own copy. `node tools/validate-zones.mjs` checks that every zone
// listed here has everything a zone needs (data, pack, place words, quiz, card games).

export const ZONES = {
  amazon: {
    id: 'amazon',
    name: 'יער הגשם של האמזונס',
    subtitle: 'המאבק על האור',
    intro:
      'ביער הגשם הכול גדל גבוה, צפוף וירוק. העצים הגבוהים תופסים את אור השמש, ולמטה, בקרקעית, נשאר רק מעט אור. ' +
      'כאן כל צמח וכל בעל חיים קשור לאחרים: מי מאביק את מי, מי מפיץ את הזרעים של מי, ומי אוכל את מי. ' +
      'בנו יער עשיר, שמרו על האור – וגלו את רשת החיים.',
    palette: ['#0f3b2a', '#2f7d4a', '#f2c14e'],
  },
  grove: {
    id: 'grove',
    name: 'החורש הארץ-ישראלי',
    subtitle: 'מעגל העונות',
    intro:
      'בחורש של ארץ ישראל הכול קשור לעונות. בחורף יורד גשם והכול מוריק, באביב החורש מתמלא פרחים, ' +
      'בקיץ הכול יבש וחם, ובסתיו מחכים לגשם הראשון. כל צמח וכל בעל חיים יודע איך לעבור את השנה – ' +
      'וכולם קשורים זה לזה. בנו חורש עשיר ועקבו אחרי רשת החיים לאורך העונות.',
    palette: ['#5a3a22', '#7a9a4a', '#e8202a'],
  },
  // 1.3: the coral reef of the Gulf of Eilat (src/data/reef.js, docs/PLAN-1.3.md)
  reef: {
    id: 'reef',
    name: 'שונית האלמוגים של אילת',
    subtitle: 'שותפויות',
    intro:
      'מתחת למים של מפרץ אילת יש עולם צבעוני של אלמוגים ודגים. בשונית כמעט כולם חיים בשותפות: ' +
      'האלמוג והאצות הזעירות שבתוכו, השושנון ושושנת הים, הגובי והחסילון, הדקר והמורנה. ' +
      'בנו שונית בריאה, שמרו על האיזון בין האצות לאלמוגים – וגלו את השותפויות של הים.',
    palette: ['#0b4a6e', '#2fa3b8', '#f08a24'],
  },
  // 1.4: a conceptual desert with no single place (src/data/desert.js, docs/PLAN-1.4.md section 4)
  desert: {
    id: 'desert',
    name: 'המדבר',
    subtitle: 'המאבק על המים',
    intro:
      'במדבר כמעט לא יורד גשם, והשמש חמה מאוד. כל צמח וכל בעל חיים צריך למצוא מים ולשמור עליהם: ' +
      'בשורשים עמוקים, בגוף שאוגר מים, או בחיים בלילה כשקריר. הרוח מזיזה את החול, וליד המעיין צומח נווה מדבר. ' +
      'בנו מדבר חי, שמרו על כל טיפה – וגלו את רשת החיים במקום הכי יבש.',
    palette: ['#7a4a22', '#d8a85a', '#3a8a8a'],
  },
};

// The order of the zones everywhere (start screen, album tabs, quiz, card games).
export const ZONE_IDS = Object.keys(ZONES);

// How a zone is named and coloured outside its own island: short name (with nikud for beginners), "in the …" phrase,
// the album / badge colour, the animal that celebrates a mission (flourish.js), the small animals that decorate a
// photo (after.js), and whether the zone is under water.
export const ZONE_LOOK = {
  amazon: { short: 'אמזונס', shortK: 'אֲמָזוֹנָס', inside: 'ביער הגשם של האמזונס', color: '#2f7a5a', mascot: 'toucan', decor: 'morpho', sea: false },
  grove: { short: 'חורש', shortK: 'חֹרֶשׁ', inside: 'בחורש הארץ-ישראלי', color: '#9a7a2e', mascot: 'hoopoe', decor: 'butterfly', sea: false },
  reef: { short: 'שונית', shortK: 'שׁוּנִית', inside: 'בשונית האלמוגים של אילת', color: '#1f8ab0', mascot: 'clownfish', decor: 'butterflyfish', sea: true },
  desert: { short: 'מדבר', shortK: 'מִדְבָּר', inside: 'במדבר', color: '#b07a32', mascot: 'fennec', decor: 'hawkmoth', sea: false },
};
export const zoneShort = (id) => (ZONE_LOOK[id] || {}).short || '';

// the zone's start-screen fields, as they appear in BIOME (palette is a start-screen detail only)
export const zoneHeader = (id) => { const { palette, ...rest } = ZONES[id]; return rest; };
