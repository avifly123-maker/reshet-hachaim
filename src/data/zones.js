// רשת החיים – zone registry (always loaded, part of the core).
// Only what the start screen needs to draw a zone's card lives here; everything else about a zone (its content,
// species models, missions, tips) is in the zone's pack (src/packs/<id>.js), loaded on demand by core/packs.js.
// src/data/<id>.js spreads its entry back into BIOME, so BIOME.id / name / subtitle / intro are unchanged.
// A new zone = an entry here + src/data/<id>.js + src/packs/<id>.js + a loader line in src/core/packs.js.

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
  // 1.3 (in development): the coral reef of the Gulf of Eilat (src/data/reef.js, docs/PLAN-1.3.md)
  reef: {
    id: 'reef',
    name: 'שונית האלמוגים של אילת',
    subtitle: 'שותפויות',
    intro:
      'מתחת למים של מפרץ אילת יש עולם צבעוני של אלמוגים ודגים. בשונית כמעט כולם חיים בשותפות: ' +
      'האלמוג והאצות הזעירות שבתוכו, השושנון ושושנת הים, הגובי והחסילון, הדקר והמורנה. ' +
      'בנו שונית בריאה, שמרו על האיזון בין האצות לאלמוגים – וגלו את השותפויות של הים.',
    palette: ['#0b4a6e', '#2fa3b8', '#f08a24'],
    dev: true,   // still being built: the start screen marks it
  },
};

// the zone's start-screen fields, as they appear in BIOME (palette is a start-screen detail only)
export const zoneHeader = (id) => { const { palette, ...rest } = ZONES[id]; return rest; };
