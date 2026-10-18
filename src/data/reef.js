// רשת החיים – the coral reef of the Gulf of Eilat (Red Sea). Version 1.3 (in development).
// The story of this zone is partnerships: the coral and the tiny algae inside it, the anemonefish and its anemone,
// the goby and the shrimp, the grouper and the moray that hunt together, the cleaner and the big fish.
// Every fact here was checked against the sources listed per species (see also docs/sources.md, "Reef").
// Hebrew names marked "לבדוק שם" in docs/PLAN-1.3.md still need a check against a Hebrew source.
// Corals, sponges, anemones and giant clams are animals, but in the game they are placed and grow like plants
// (kinds 'coral' / 'sessile', in PLANT_KINDS); the card says what they really are.
// Relation convention: see src/data/common.js (relation is written on the acting / benefiting species).

import { zoneHeader } from './zones.js';

const W = 'https://en.wikipedia.org/wiki/';

export const BIOME = {
  ...zoneHeader('reef'),

  layers: [
    { id: 'shallow', name: 'השונית הרדודה', desc: 'קרוב לפני המים יש הכי הרבה אור. כאן גדלים רוב האלמוגים, וכאן הכי צפוף וצבעוני.', yRange: [3, 9] },
    { id: 'slope', name: 'מדרון השונית', desc: 'ככל שיורדים, האור נחלש והמים כחולים יותר. אלמוגים שמסתפקים בפחות אור גדלים כאן.', yRange: [0, 3] },
    { id: 'sand', name: 'קרקעית החול', desc: 'בין גושי השונית יש חול לבן ומרבדים של עשב ים. כאן מחפשים מזון חתולי הים והצבים.', yRange: [-1.5, 0.5] },
    { id: 'open', name: 'המים הפתוחים', desc: 'מעל השונית שוחות להקות של דגים. בלילה עולה לכאן הפלנקטון.', yRange: [9, 16] },
  ],

  species: [
    // ───────────────────────── CORALS AND WHAT STAYS IN PLACE ─────────────────────────
    {
      id: 'branching', name: 'אלמוג שיח', nameEn: 'Branching coral (Stylophora pistillata)', kind: 'coral', kindLabel: 'אלמוג · בעל חיים',
      layer: 'shallow', lightNeed: 0.8, shadeTolerant: false, growth: 'fast',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 14, groupSize: [1, 2], maxCount: 9, unlock: 'start',
      fact: 'האלמוג הוא בעל חיים! הוא בנוי מהרבה פוליפים זעירים, ובתוך כל פוליפ חיות אצות קטנטנות שמייצרות לו מזון מאור השמש.',
      more: 'אלמוג השיח הוא מהאלמוגים הנפוצים בשונית של אילת. הוא גדל מהר יחסית, והענפים שלו הם מחבוא לדגים קטנים. ' +
        'בלילה הפוליפים מוציאים זרועות קטנות ותופסים פלנקטון מהמים.',
      question: { q: 'מאיפה האלמוג מקבל את רוב המזון שלו?', options: ['מאצות זעירות שחיות בתוכו ומשתמשות באור השמש', 'מהחול', 'מדגים גדולים'], answer: 0 },
      color: '#e8a0b4', sources: [W + 'Stylophora_pistillata', W + 'Zooxanthellae'],
    },
    {
      id: 'brain', name: 'אלמוג מוח', nameEn: 'Brain coral (Platygyra)', kind: 'coral', kindLabel: 'אלמוג · בעל חיים',
      layer: 'shallow', lightNeed: 0.7, shadeTolerant: false, growth: 'slow',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 22, groupSize: [1, 1], maxCount: 5, unlock: 'r5',
      fact: 'אלמוג המוח גדל לאט מאוד, רק כמה מילימטרים בשנה. גוש גדול יכול להיות בן מאות שנים!',
      more: 'התעלות המתפתלות על פני הגוש נראות כמו קפלים של מוח, ומכאן השם. אלמוגי גוש כאלה הם "הלבנים" שמהן בנויה השונית, ' +
        'ובחורים שבהם מסתתרים סרטנים, תמנונים ומורנות.',
      question: { q: 'למה גוש גדול של אלמוג מוח הוא דבר יקר כל כך?', options: ['כי לוקח לו מאות שנים לגדול', 'כי הוא צבעוני', 'כי הוא זז מהר'], answer: 0 },
      color: '#c9b46a', sources: [W + 'Brain_coral', W + 'Platygyra'],
    },
    {
      id: 'table', name: 'אלמוג שולחן', nameEn: 'Table coral (Acropora)', kind: 'coral', kindLabel: 'אלמוג · בעל חיים',
      layer: 'shallow', lightNeed: 0.9, shadeTolerant: false, growth: 'medium',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 20, groupSize: [1, 1], maxCount: 4, unlock: 'r9',
      fact: 'אלמוג השולחן נראה כמו שולחן רחב על רגל אחת. מתחת לשולחן נוצר צל, ושם נחים דגים.',
      more: 'הענפים הדקים שלו מתחברים למשטח שטוח ורחב שתופס הרבה אור. הוא צריך מים צלולים ורדודים. ' +
        'בגלל הצורה שלו, גלים חזקים בסערה יכולים לשבור אותו.',
      question: { q: 'מה מוצאים דגים מתחת לאלמוג שולחן?', options: ['צל ומחסה', 'חול חם', 'פירות'], answer: 0 },
      color: '#9fc27a', sources: [W + 'Acropora', W + 'Acropora_cytherea'],
    },
    {
      id: 'firecoral', name: 'אלמוג אש', nameEn: 'Fire coral (Millepora)', kind: 'coral', kindLabel: 'בעל חיים צורב',
      layer: 'shallow', lightNeed: 0.85, shadeTolerant: false, growth: 'fast',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 12, groupSize: [1, 2], maxCount: 5, unlock: 'r7',
      fact: 'מי שנוגע באלמוג האש מרגיש כוויה, כמו מאש! יש לו תאים צורבים זעירים.',
      more: 'למרות השם, הוא בכלל לא אלמוג אמיתי. הוא קרוב משפחה של המדוזות, ובונה שלד של גיר כמו אלמוג. ' +
        'הצבע שלו צהוב חום, ובקצוות הענפים לבן.',
      question: { q: 'למה כדאי לא לגעת באלמוג אש?', options: ['כי הוא צורב', 'כי הוא נשבר ממגע', 'כי הוא חם מאוד'], answer: 0 },
      color: '#d9b84a', sources: [W + 'Millepora'],
    },
    {
      id: 'softcoral', name: 'אלמוג רך', nameEn: 'Pulsing soft coral (Xenia)', kind: 'coral', kindLabel: 'אלמוג רך · בעל חיים',
      layer: 'slope', lightNeed: 0.6, shadeTolerant: true, growth: 'fast',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 10, groupSize: [1, 3], maxCount: 8, unlock: 'r3',
      fact: 'הפוליפים של האלמוג הרך נפתחים ונסגרים כל הזמן, כמו ידיים קטנות שפותחות וסוגרות את האצבעות.',
      more: 'לאלמוג רך אין שלד קשה של אבן, רק מחטים קטנות של גיר בתוך הגוף. לכן הוא גמיש ומתנועע עם הזרם. ' +
        'החוקרים עוד בודקים למה הפוליפים שלו פועמים.',
      question: { q: 'מה ההבדל בין אלמוג רך לאלמוג אבן?', options: ['לאלמוג רך אין שלד קשה של אבן', 'אלמוג רך הוא צמח', 'אלמוג רך חי על היבשה'], answer: 0 },
      color: '#c7a3d9', sources: [W + 'Xenia_(coral)', W + 'Alcyonacea'],
    },
    {
      id: 'seafan', name: 'מניפת ים', nameEn: 'Sea fan (gorgonian)', kind: 'coral', kindLabel: 'אלמוג · בעל חיים',
      layer: 'slope', lightNeed: 0.4, shadeTolerant: true, growth: 'slow',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 16, groupSize: [1, 1], maxCount: 4, unlock: 'r8',
      fact: 'מניפת הים גדלה רחבה ושטוחה, ותמיד עומדת מול הזרם. כך עובר דרכה הכי הרבה מים עם מזון.',
      more: 'היא בנויה מהרבה פוליפים על שלד גמיש. המים זורמים דרך הרשת הדקה שלה, והפוליפים תופסים פלנקטון. ' +
        'היא אוהבת מקומות עמוקים יותר, עם זרם.',
      question: { q: 'למה מניפת הים עומדת מול הזרם?', options: ['כדי לתפוס כמה שיותר מזון מהמים', 'כדי להסתתר', 'כדי לקבל צל'], answer: 0 },
      color: '#d9603a', sources: [W + 'Gorgonian', W + 'Sea_fan'],
    },
    {
      id: 'sponge', name: 'ספוג', nameEn: 'Sponge (Porifera)', kind: 'sessile', kindLabel: 'בעל חיים שלא זז',
      layer: 'slope', lightNeed: 0.2, shadeTolerant: true, growth: 'medium',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 8, groupSize: [1, 2], maxCount: 6, unlock: 'r3',
      fact: 'הספוג הוא בעל חיים בלי ראש, בלי פה ובלי לב! המים נכנסים דרך חורים קטנים בגוף שלו, והוא מסנן מהם מזון.',
      more: 'כל היום הספוג שואב מים ומסנן אותם, וכך הוא מנקה את המים בשונית. ' +
        'לספוגים יש הרבה צורות וצבעים: כדורים, צינורות ושכבות על הסלע.',
      question: { q: 'איך הספוג עוזר לשונית?', options: ['הוא מסנן ומנקה את המים', 'הוא מגרש דגים', 'הוא בונה חול'], answer: 0 },
      color: '#e07a3a', sources: [W + 'Sponge'],
    },
    {
      id: 'seaanemone', name: 'שושנת ים', nameEn: 'Sea anemone (Heteractis magnifica)', kind: 'sessile', kindLabel: 'בעל חיים צורב',
      layer: 'shallow', lightNeed: 0.75, shadeTolerant: false, growth: 'medium',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 12, groupSize: [1, 1], maxCount: 6, unlock: 'start',
      fact: 'שושנת הים נראית כמו פרח, אבל היא בעל חיים! יש לה זרועות רכות שצורבות כל מי שנוגע בהן.',
      more: 'בתוך הזרועות חי השושנון. השכבה הדקה שעל העור שלו מגינה עליו, והשושנה לא צורבת אותו. ' +
        'גם בתוך שושנת הים חיות אצות זעירות, כמו באלמוג.',
      question: { q: 'למה שושנת הים לא צורבת את השושנון?', options: ['שכבה דקה על העור שלו מגינה עליו', 'הוא קטן מדי', 'הוא ישן כל הזמן'], answer: 0 },
      color: '#9ad06a', sources: [W + 'Heteractis_magnifica', W + 'Amphiprion_bicinctus'],
    },
    {
      id: 'clam', name: 'צדפת ענק', nameEn: 'Giant clam (Tridacna maxima)', kind: 'sessile', kindLabel: 'בעל חיים שלא זז',
      layer: 'shallow', lightNeed: 0.85, shadeTolerant: false, growth: 'slow',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [], cost: 18, groupSize: [1, 1], maxCount: 4, unlock: 'r10',
      fact: 'השפה הצבעונית של צדפת הענק מלאה באצות זעירות. בזכות אור השמש הן מייצרות לה מזון, בדיוק כמו באלמוג.',
      more: 'צדפת הענק נאחזת בסלע ולא זזה כל החיים. היא גם מסננת מזון מהמים. ' +
        'הצבעים שלה, כחול, ירוק וסגול, שונים מצדפה לצדפה.',
      question: { q: 'מה דומה בין צדפת הענק לאלמוג?', options: ['בשניהם חיות אצות זעירות שמייצרות מזון מאור', 'שניהם שוחים', 'שניהם צמחים'], answer: 0 },
      color: '#4a9ad6', sources: [W + 'Tridacna_maxima', W + 'Giant_clam'],
    },
    {
      id: 'seagrass', name: 'עשב ים', nameEn: 'Seagrass (Halophila stipulacea)', kind: 'seaplant', kindLabel: 'צמח ים',
      layer: 'sand', lightNeed: 0.6, shadeTolerant: false, growth: 'fast',
      relations: [], cost: 6, groupSize: [2, 3], maxCount: 12, unlock: 'start',
      fact: 'עשב הים הוא לא אצה. זה צמח אמיתי, עם שורשים, עלים ואפילו פרחים קטנים, שגדל מתחת למים!',
      more: 'מרבדים של עשב ים גדלים על החול בין גושי השונית. הם מחזיקים את החול במקום, ונותנים מזון ומחסה. ' +
        'צב הים הירוק רועה בהם כמו פרה באחו.',
      question: { q: 'מי אוכל עשב ים?', options: ['צב הים הירוק', 'הזהרון', 'שושנת הים'], answer: 0 },
      color: '#5aa04a', sources: [W + 'Halophila_stipulacea', W + 'Seagrass'],
    },
    {
      id: 'algae', name: 'אצות', nameEn: 'Turf algae', kind: 'seaplant', kindLabel: 'אצות',
      layer: 'shallow', lightNeed: 0.7, shadeTolerant: false, growth: 'fast',
      relations: [], cost: 4, groupSize: [2, 3], maxCount: 10, unlock: 'r2',
      fact: 'אצות גדלות מהר מאוד. כשאין מספיק דגים שאוכלים אותן, הן מכסות את האלמוגים ומסתירות מהם את האור.',
      more: 'האצות הן מזון חשוב לדגי התוכינון, למנתחנים ולקיפודי הים. ' +
        'כשיש מספיק "רועים", האצות נשארות קצרות והאלמוגים גדלים. כך נשמר האיזון בשונית.',
      question: { q: 'מה קורה לאלמוגים כשאין מי שיאכל את האצות?', options: ['האצות מכסות אותם ומסתירות את האור', 'האלמוגים גדלים מהר יותר', 'לא קורה כלום'], answer: 0 },
      color: '#7a9a3a', sources: [W + 'Turf_algae', W + 'Coral_reef'],
    },
    {
      id: 'plankton', name: 'פלנקטון', nameEn: 'Plankton', kind: 'seaplant', kindLabel: 'יצורים זעירים',
      layer: 'open', lightNeed: 0.15, shadeTolerant: true, growth: 'fast',   // a drifting cloud: placed and grows like a plant, eaten without being hunted
      relations: [], cost: 6, groupSize: [1, 1], maxCount: 4, unlock: 'r7',
      fact: 'פלנקטון הם יצורים זעירים שנסחפים במים. חלק מהם זוהרים בחושך כשמזיזים את המים!',
      more: 'בלילה עולים הרבה יצורים זעירים מהמעמקים אל השונית. אז האלמוגים פותחים את הפוליפים ותופסים אותם. ' +
        'הפלנקטון הוא תחילת שרשרת המזון בים.',
      question: { q: 'מתי האלמוגים פותחים את הפוליפים כדי לתפוס פלנקטון?', options: ['בעיקר בלילה', 'רק בצהריים', 'אף פעם'], answer: 0 },
      color: '#7ad6e0', sources: [W + 'Plankton', W + 'Bioluminescence'],
    },

    // ───────────────────────── ANIMALS THAT MOVE ─────────────────────────
    {
      id: 'clownfish', name: 'שושנון ים סוף', nameEn: 'Red Sea anemonefish (Amphiprion bicinctus)', kind: 'animal',
      layer: 'shallow', locomotion: 'swim', active: 'day',
      diet: [{ id: 'plankton', part: 'plankton' }, { id: 'algae', part: 'algae' }],
      relations: [
        { target: 'seaanemone', type: 'home', text: 'השושנון גר בין הזרועות של שושנת הים, ושם אף טורף לא מעז להתקרב.' },
        { target: 'seaanemone', type: 'partner', text: 'השושנון מגרש פרפרונים שרוצים לאכול את שושנת הים. כל אחד שומר על השני.' },
      ],
      cost: 12, groupSize: [2, 3], maxCount: 8, unlock: 'r1',
      fact: 'השושנון חי בתוך שושנת ים צורבת, והיא לא פוגעת בו! שכבה דקה על העור שלו מגינה עליו.',
      more: 'השושנון כמעט לא מתרחק מהשושנה שלו. הוא מגן עליה מדגים שרוצים לאכול אותה, והיא מגינה עליו מטורפים. ' +
        'זו אחת השותפויות המפורסמות בים.',
      question: { q: 'מה השושנון נותן לשושנת הים?', options: ['הוא מגרש דגים שרוצים לאכול אותה', 'הוא מביא לה חול', 'הוא מצל עליה'], answer: 0 },
      color: '#f08a24', sources: [W + 'Amphiprion_bicinctus', W + 'Clownfish'],
    },
    {
      id: 'parrotfish', name: 'תוכינון', nameEn: 'Parrotfish (Scaridae)', kind: 'animal',
      layer: 'shallow', locomotion: 'swim', active: 'day',
      diet: [{ id: 'algae', part: 'algae' }],
      relations: [{ target: 'branching', type: 'partner', text: 'התוכינון מגרד אצות מעל האלמוגים, וכך האצות לא מכסות אותם.' }],
      cost: 16, groupSize: [1, 2], maxCount: 6, unlock: 'r2',
      fact: 'לתוכינון יש שיניים מחוברות שנראות כמו מקור של תוכי. הוא מגרד אצות מהסלע, ומה שהוא בולע יוצא ממנו כחול לבן!',
      more: 'הרבה מהחול הלבן שליד השוניות נוצר בזכות דגי התוכינון. בלילה יש תוכינונים שישנים בתוך שק שקוף שהם מייצרים מריר, ' +
        'כמו שק שינה שמסתיר את הריח שלהם.',
      question: { q: 'איך התוכינון עוזר לאלמוגים?', options: ['הוא אוכל את האצות שמכסות אותם', 'הוא שותל אותם', 'הוא מביא להם אור'], answer: 0 },
      color: '#3ab8a0', sources: [W + 'Parrotfish'],
    },
    {
      id: 'surgeonfish', name: 'מנתחן', nameEn: 'Sohal surgeonfish (Acanthurus sohal)', kind: 'animal',
      layer: 'shallow', locomotion: 'swim', active: 'day',
      diet: [{ id: 'algae', part: 'algae' }],
      relations: [],
      cost: 12, groupSize: [1, 2], maxCount: 6, unlock: 'r3',
      fact: 'ליד הזנב של המנתחן יש קוץ חד כמו סכין של רופא. מכאן השם שלו.',
      more: 'המנתחן הזה חי רק בים סוף ובמפרץ הפרסי. כל מנתחן שומר על "גינת אצות" משלו בשונית הרדודה, ומגרש ממנה דגים אחרים.',
      question: { q: 'מה המנתחן אוכל?', options: ['אצות', 'אלמוגים', 'פלנקטון בלבד'], answer: 0 },
      color: '#5a6ad6', sources: [W + 'Sohal_surgeonfish'],
    },
    {
      id: 'cleaner', name: 'נקאי אילתי', nameEn: 'Bluestreak cleaner wrasse (Labroides dimidiatus)', kind: 'animal',
      layer: 'shallow', locomotion: 'swim', active: 'day',
      diet: [],
      relations: [
        { target: 'grouper', type: 'partner', text: 'הנקאי מנקה את הדקר מטפילים, והדקר לא אוכל אותו. כל אחד מרוויח.' },
        { target: 'parrotfish', type: 'partner', text: 'גם דגי התוכינון באים לתחנת הניקוי של הנקאי.' },
      ],
      cost: 14, groupSize: [1, 2], maxCount: 4, unlock: 'r4',
      fact: 'הנקאי פותח "תחנת ניקוי". דגים גדולים באים, פותחים פה, והוא מנקה להם טפילים, אפילו מבפנים!',
      more: 'דגים עומדים בתור לתחנת הניקוי. הנקאי מסמן בריקוד שהוא מנקה, ואפילו טורפים גדולים לא אוכלים אותו. ' +
        'כשהשפרנונים נעלמים משונית, הדגים שם נעשים חולים יותר.',
      question: { q: 'למה הדקר לא אוכל את הנקאי?', options: ['כי הנקאי מנקה אותו מטפילים', 'כי הנקאי מהיר מדי', 'כי הדקר לא רעב'], answer: 0 },
      color: '#3a8ad6', sources: [W + 'Bluestreak_cleaner_wrasse', W + 'Cleaning_station'],
    },
    {
      id: 'butterflyfish', name: 'פרפרון', nameEn: 'Butterflyfish (Chaetodon)', kind: 'animal',
      layer: 'shallow', locomotion: 'swim', active: 'day',
      diet: [{ id: 'branching', part: 'polyps' }, { id: 'table', part: 'polyps' }],
      relations: [],
      cost: 10, groupSize: [2, 2], maxCount: 6, unlock: 'r9',
      fact: 'לפרפרון יש חרטום דק וארוך. בעזרתו הוא מוציא פוליפים קטנים מתוך האלמוג.',
      more: 'פרפרונים שוחים בזוגות. הרבה מהם אוכלים כמעט רק אלמוגים, ולכן כשיש הרבה פרפרונים בשונית, זה סימן שהאלמוגים בריאים. ' +
        'החוקרים סופרים אותם כדי לדעת מה מצב השונית.',
      question: { q: 'מה אומר לחוקרים שיש הרבה פרפרונים בשונית?', options: ['שהאלמוגים בריאים', 'שיש הרבה אצות', 'שהמים קרים'], answer: 0 },
      color: '#f2d04a', sources: [W + 'Butterflyfish', W + 'Chaetodon_paucifasciatus'],
    },
    {
      id: 'lionfish', name: 'זהרון', nameEn: 'Devil firefish (Pterois miles)', kind: 'animal',
      layer: 'shallow', locomotion: 'swim', active: 'night',
      diet: [{ id: 'goby', part: 'animals' }, { id: 'shrimp', part: 'animals' }],
      relations: [{ target: 'table', type: 'shelter', text: 'ביום הזהרון נח בצל, מתחת לאלמוג שולחן.' }],
      cost: 22, groupSize: [1, 1], maxCount: 3, unlock: 'r7',
      fact: 'לזהרון יש סנפירים ארוכים כמו נוצות, ובקצה שלהם קוצים עם רעל. לכן אף אחד לא מתקרב אליו.',
      more: 'הזהרון צד בערב ובלילה. הוא פורש את הסנפירים כמו רשת ודוחק דגים קטנים לפינה. ' +
        'בים סוף הוא חלק מהרשת, אבל לים התיכון הוא הגיע רק בשנים האחרונות, ושם אין לו מי שישמור על האיזון.',
      question: { q: 'למה הזהרון מסוכן לגעת בו?', options: ['יש לו קוצים עם רעל בסנפירים', 'הוא נושך חזק', 'הוא חשמלי'], answer: 0 },
      color: '#c8473a', sources: [W + 'Pterois_miles'],
    },
    {
      id: 'moray', name: 'מורנה', nameEn: 'Giant moray (Gymnothorax javanicus)', kind: 'animal',
      layer: 'slope', locomotion: 'swim', active: 'night',
      diet: [{ id: 'octopus', part: 'animals' }],
      relations: [{ target: 'brain', type: 'shelter', text: 'המורנה גרה בחור בתוך גוש של אלמוג, ורק הראש שלה מציץ החוצה.' }],
      cost: 24, groupSize: [1, 1], maxCount: 2, unlock: 'r5',
      fact: 'המורנה פותחת וסוגרת את הפה כל הזמן. היא לא מאיימת, כך היא נושמת: היא מזרימה מים לזימים.',
      more: 'המורנה מתגנבת לתוך חורים צרים בשונית, למקומות שדגים אחרים לא מגיעים אליהם. ' +
        'בים סוף ראו מורנות צדות ביחד עם הדקר: כל אחד מגיע למקום אחר, ויחד הם מצליחים יותר.',
      question: { q: 'למה המורנה פותחת וסוגרת את הפה?', options: ['כדי לנשום', 'כדי לאיים', 'כדי לשיר'], answer: 0 },
      color: '#7a8a4a', sources: [W + 'Giant_moray', 'https://doi.org/10.1371/journal.pbio.0040431'],
    },
    {
      id: 'grouper', name: 'דקר', nameEn: 'Roving coral grouper (Plectropomus pessuliferus)', kind: 'animal',
      layer: 'slope', locomotion: 'swim', active: 'day',
      diet: [{ id: 'goby', part: 'animals' }],
      relations: [{ target: 'moray', type: 'partner', text: 'הדקר מנענע את הראש ליד המחבוא של המורנה, ומזמין אותה לצוד ביחד.' }],
      cost: 24, groupSize: [1, 1], maxCount: 2, unlock: 'r4',
      fact: 'הדקר יודע "לקרוא" למורנה: הוא מנענע את הראש ליד המחבוא שלה, ושניהם יוצאים לצוד ביחד!',
      more: 'כשדג קטן בורח מהדקר לתוך חור בשונית, המורנה נכנסת אחריו. וכשהוא בורח מהמורנה אל המים הפתוחים, הדקר מחכה שם. ' +
        'החוקרים שראו את זה בים סוף הופתעו לגלות עבודת צוות בין שני מינים שונים.',
      question: { q: 'איך הדקר והמורנה עוזרים זה לזה?', options: ['הם צדים ביחד, כל אחד במקום אחר', 'הם ישנים ביחד', 'הם בונים קן'], answer: 0 },
      color: '#c85a4a', sources: [W + 'Plectropomus_pessuliferus', 'https://doi.org/10.1371/journal.pbio.0040431'],
    },
    {
      id: 'goby', name: 'גובי', nameEn: 'Shrimp goby (Cryptocentrus)', kind: 'animal',
      layer: 'sand', locomotion: 'ground', active: 'day',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [{ target: 'shrimp', type: 'partner', text: 'הגובי שומר בפתח המחילה של החסילון. כשמגיעה סכנה, הוא מנפנף בזנב, ושניהם בורחים פנימה.' }],
      cost: 8, groupSize: [1, 1], maxCount: 5, unlock: 'r6',
      fact: 'הגובי והחסילון גרים באותה מחילה בחול. החסילון חופר, והגובי שומר!',
      more: 'החסילון כמעט לא רואה. כשהוא יוצא מהמחילה, הוא שומר שאחד המחושים שלו ייגע בגובי. ' +
        'אם הגובי מרגיש סכנה, הוא מנפנף בזנב, והחסילון מבין מיד שצריך להיכנס.',
      question: { q: 'מה הגובי נותן לחסילון?', options: ['שמירה מפני סכנה', 'מזון', 'צל'], answer: 0 },
      color: '#e8c070', sources: [W + 'Cryptocentrus', W + 'Alpheidae'],
    },
    {
      id: 'shrimp', name: 'חסילון', nameEn: 'Pistol shrimp (Alpheus)', kind: 'animal',
      layer: 'sand', locomotion: 'ground', active: 'day',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [{ target: 'goby', type: 'home', text: 'החסילון חופר מחילה בחול, ונותן לגובי מקום לגור בו.' }],
      cost: 8, groupSize: [1, 1], maxCount: 5, unlock: 'r6',
      fact: 'לחסילון יש צבת אחת גדולה. כשהוא סוגר אותה מהר, נשמעת נקישה חזקה כמו ירייה!',
      more: 'הנקישה יוצרת בועה קטנה במים, והבועה מהממת דגים קטנים. ' +
        'בשונית חיים המון חסילונים כאלה, ומתחת למים שומעים את הנקישות שלהם כמו רעש של שמן מבעבע.',
      question: { q: 'מה החסילון נותן לגובי?', options: ['מחילה לגור בה', 'מזון', 'אור'], answer: 0 },
      color: '#e89070', sources: [W + 'Alpheidae', W + 'Cryptocentrus'],
    },
    {
      id: 'turtle', name: 'צב ים ירוק', nameEn: 'Green sea turtle (Chelonia mydas)', kind: 'animal',
      layer: 'sand', locomotion: 'swim', active: 'day',
      diet: [{ id: 'seagrass', part: 'leaves' }, { id: 'algae', part: 'algae' }, { id: 'jellyfish', part: 'animals' }],
      relations: [],
      cost: 30, groupSize: [1, 1], maxCount: 2, unlock: 'r3',
      fact: 'צב הים הירוק נושם אוויר! הוא עולה לפני המים כדי לנשום, ויכול להישאר מתחת למים זמן רב.',
      more: 'הצב הבוגר אוכל בעיקר עשב ים ואצות, ובזכותו מרבדי עשב הים נשארים קצרים ובריאים. ' +
        'השם "ירוק" בא מצבע השומן שמתחת לשריון, לא מהשריון עצמו.',
      question: { q: 'למה צב הים עולה לפני המים?', options: ['כדי לנשום אוויר', 'כדי להתייבש', 'כדי לאכול ציפורים'], answer: 0 },
      color: '#6a8a4a', sources: [W + 'Green_sea_turtle'],
    },
    {
      id: 'octopus', name: 'תמנון', nameEn: 'Day octopus (Octopus cyanea)', kind: 'animal',
      layer: 'slope', locomotion: 'ground', active: 'day',
      diet: [{ id: 'hermit', part: 'animals' }, { id: 'shrimp', part: 'animals' }],
      relations: [{ target: 'brain', type: 'shelter', text: 'התמנון מסתתר במחבוא בין הסלעים ובתוך גושי אלמוג.' }],
      cost: 20, groupSize: [1, 1], maxCount: 2, unlock: 'r8',
      fact: 'התמנון משנה צבע ומרקם בתוך שנייה, ונעלם על רקע הסלע! יש לו שמונה זרועות עם מאות כוסות יניקה.',
      more: 'התמנון חכם מאוד. הוא פותח קונכיות, מסתתר בחורים צרים, ובורח בעזרת ענן של דיו. ' +
        'בשונית הוא צד סרטנים וחסילונים.',
      question: { q: 'איך התמנון מתחבא?', options: ['הוא משנה צבע ומרקם', 'הוא קופץ מהמים', 'הוא בונה קן'], answer: 0 },
      color: '#a85a8a', sources: [W + 'Octopus_cyanea'],
    },
    {
      id: 'urchin', name: 'קיפוד ים', nameEn: 'Long-spined sea urchin (Diadema setosum)', kind: 'animal',
      layer: 'shallow', locomotion: 'ground', active: 'night',
      diet: [{ id: 'algae', part: 'algae' }],
      relations: [{ target: 'brain', type: 'shelter', text: 'ביום קיפוד הים מסתתר בחורים בסלע, ובלילה יוצא לגרד אצות.' }],
      cost: 8, groupSize: [2, 3], maxCount: 8, unlock: 'r2',
      fact: 'לקיפוד הים יש קוצים ארוכים ודקים. הוא הולך לאט על רגליים זעירות, ומגרד אצות מהסלע.',
      more: 'קיפודי הים הם "מכסחי הדשא" של השונית: הם אוכלים אצות בלילה ומפנים מקום לאלמוגים צעירים. ' +
        'אבל כשיש יותר מדי קיפודים, הם מגרדים גם את הסלע של השונית.',
      question: { q: 'מה קיפוד הים עושה בלילה?', options: ['מגרד אצות מהסלע', 'צד דגים', 'ישן בחול'], answer: 0 },
      color: '#3a2a4a', sources: [W + 'Diadema_setosum'],
    },
    {
      id: 'starfish', name: 'קוצנון', nameEn: 'Coral-eating starfish (Acanthaster)', kind: 'animal',
      layer: 'shallow', locomotion: 'ground', active: 'night',
      diet: [{ id: 'table', part: 'polyps' }, { id: 'branching', part: 'polyps' }],
      relations: [],
      cost: 14, groupSize: [1, 1], maxCount: 4, unlock: 'r9',
      fact: 'הקוצנון הוא כוכב ים גדול ומלא קוצים, שאוכל אלמוגים. הוא מוציא את הקיבה שלו החוצה ומעכל את האלמוג!',
      more: 'קוצנון אחד או שניים הם חלק מהשונית. אבל לפעמים מופיעים פתאום מאות קוצנונים, והם עלולים לאכול חלק גדול מהאלמוגים. ' +
        'לקוצים שלו יש רעל, ולכן אסור לגעת בהם.',
      question: { q: 'מתי הקוצנון מסכן את השונית?', options: ['כשיש פתאום הרבה מאוד קוצנונים', 'כשיש קוצנון אחד', 'אף פעם'], answer: 0 },
      color: '#8a4a7a', sources: [W + 'Crown-of-thorns_starfish'],
    },
    {
      id: 'stingray', name: 'חתול ים', nameEn: 'Bluespotted ribbontail ray (Taeniura lymma)', kind: 'animal',
      layer: 'sand', locomotion: 'ground', active: 'day',
      diet: [{ id: 'shrimp', part: 'animals' }],
      relations: [{ target: 'table', type: 'shelter', text: 'חתול הים נח מתחת לאלמוג שולחן או מתחת לבליטה של סלע.' }],
      cost: 18, groupSize: [1, 1], maxCount: 2, unlock: 'r8',
      fact: 'לחתול הים יש גוף שטוח עם נקודות כחולות. הוא מחפש מזון בחול, ובזנב שלו יש קוץ ארסי.',
      more: 'כשהמים עולים, חתול הים יוצא מהמחבוא ושוחה אל החול כדי לחפש חסילונים, צדפות ותולעים. ' +
        'הנקודות הכחולות מזהירות טורפים שיש לו קוץ.',
      question: { q: 'איפה חתול הים מחפש מזון?', options: ['בחול', 'בצמרות', 'על פני המים'], answer: 0 },
      color: '#6a7a8a', sources: [W + 'Bluespotted_ribbontail_ray'],
    },
    {
      id: 'hermit', name: 'סרטן נזיר', nameEn: 'Hermit crab (Paguroidea)', kind: 'animal',
      layer: 'sand', locomotion: 'ground', active: 'night',
      diet: [{ id: 'algae', part: 'dead' }],
      relations: [],
      cost: 6, groupSize: [1, 2], maxCount: 6, unlock: 'r8',
      fact: 'לסרטן הנזיר אין שריון קשה על הבטן. לכן הוא גר בקונכייה ריקה של חילזון, וסוחב אותה איתו לכל מקום.',
      more: 'כשהסרטן גדל, הקונכייה נעשית צרה מדי, והוא מחפש קונכייה חדשה וגדולה יותר. ' +
        'סרטני הנזיר אוכלים שאריות, וכך עוזרים לנקות את קרקעית השונית.',
      question: { q: 'מה סרטן הנזיר עושה כשהוא גדל?', options: ['עובר לקונכייה גדולה יותר', 'בונה קונכייה', 'מפסיק לאכול'], answer: 0 },
      color: '#d9803a', sources: [W + 'Hermit_crab'],
    },
    {
      id: 'jellyfish', name: 'מדוזה', nameEn: 'Moon jellyfish (Aurelia aurita)', kind: 'animal',
      layer: 'open', locomotion: 'swim', active: 'day',
      diet: [{ id: 'plankton', part: 'plankton' }],
      relations: [],
      cost: 8, groupSize: [1, 3], maxCount: 6, unlock: 'r8',
      fact: 'המדוזה בנויה כמעט כולה ממים. אין לה מוח, אין לה לב ואין לה עצמות!',
      more: 'המדוזה שוחה כשהיא מכווצת את הפעמון שלה ומשחררת אותו, אבל בעיקר היא נסחפת עם הזרם. ' +
        'היא אוכלת פלנקטון שנדבק לשוליים ולזרועות שלה. צבי ים אוכלים מדוזות.',
      question: { q: 'ממה בנויה המדוזה ברובה?', options: ['ממים', 'מעצמות', 'מאבן'], answer: 0 },
      color: '#c8b8e8', sources: [W + 'Aurelia_aurita'],
    },
    {
      id: 'reefshark', name: 'כריש שונית', nameEn: 'Blacktip reef shark (Carcharhinus melanopterus)', kind: 'animal',
      layer: 'open', locomotion: 'swim', active: 'day',
      diet: [{ id: 'surgeonfish', part: 'animals' }, { id: 'octopus', part: 'animals' }],
      relations: [],
      cost: 35, groupSize: [1, 1], maxCount: 1, unlock: 'r11',
      fact: 'כריש השונית מכירים לפי הקצוות השחורים של הסנפירים. הוא שוחה בשקט לאורך שפת השונית.',
      more: 'כריש השונית הוא טורף שנמצא בראש שרשרת המזון. הוא תופס בעיקר דגים חלשים או חולים, ' +
        'וכך עוזר לשמור על להקות דגים בריאות. בשונית שיש בה כרישים, יש בדרך כלל גם הרבה דגים אחרים.',
      question: { q: 'איך מזהים את כריש השונית?', options: ['לפי הקצוות השחורים של הסנפירים', 'לפי הפסים הכחולים', 'לפי הקוצים על הגב'], answer: 0 },
      color: '#7a7a6a', sources: [W + 'Blacktip_reef_shark'],
    },
  ],

  // ───────────────────────── MISSIONS ─────────────────────────
  missions: [
    { id: 'r1', title: 'שונית מתחילה באלמוג', text: 'כל שונית מתחילה באלמוגים קטנים. שתלו 3 אלמוגי שיח במים הרדודים, שם יש הכי הרבה אור.', hint: 'גררו אלמוג שיח מהמגש אל השונית, קרוב לגב השונית.', after: null, goal: { type: 'place', species: 'branching', count: 3 }, reward: { points: 25, unlock: ['clownfish'] } },
    { id: 'r2', title: 'בית בתוך שושנה', text: 'השושנון חי בתוך שושנת ים צורבת. שתלו שושנת ים, הביאו שושנונים, וגלו את השותפות ביניהם.', hint: 'הציבו את השושנונים ממש ליד שושנת הים.', after: 'r1', goal: { type: 'link', from: 'clownfish', to: 'seaanemone' }, reward: { points: 30, unlock: ['algae', 'parrotfish', 'urchin'] } },
    { id: 'r3', title: 'רועי האצות', text: 'אצות גדלות מהר, ובלי מי שיאכל אותן הן מכסות את האלמוגים. הביאו תוכינון, וגלו את הקשר בינו לבין האצות.', hint: 'הציבו את התוכינון ליד אצות שגדלות על השונית.', after: 'r2', goal: { type: 'link', from: 'parrotfish', to: 'algae' }, reward: { points: 30, unlock: ['softcoral', 'sponge', 'surgeonfish', 'turtle'] } },
    { id: 'r4', title: 'אחו מתחת למים', text: 'צב הים הירוק רועה בעשב ים. שתלו מרבד של עשב ים על החול, והביאו צב.', hint: 'עשב הים גדל על החול, בין גושי השונית.', after: 'r3', goal: { type: 'link', from: 'turtle', to: 'seagrass' }, reward: { points: 35, unlock: ['cleaner', 'grouper'] } },
    { id: 'r5', title: 'תחנת ניקוי', text: 'הנקאי פותח תחנת ניקוי לדגים גדולים. הביאו נקאי ודקר, וגלו את השותפות ביניהם.', hint: 'הציבו את הנקאי ליד המקום שבו הדקר שוחה.', after: 'r4', goal: { type: 'link', from: 'cleaner', to: 'grouper' }, reward: { points: 35, unlock: ['brain', 'moray'] } },
    { id: 'r6', title: 'צדים ביחד', text: 'בים סוף גילו חוקרים שהדקר והמורנה צדים ביחד. שתלו אלמוג מוח שתהיה בו מחבוא למורנה, וגלו את הקשר בין הדקר למורנה.', hint: 'המורנה גרה בחורים של אלמוג המוח. הציבו אותה לידו.', after: 'r5', goal: { type: 'link', from: 'grouper', to: 'moray' }, reward: { points: 40, unlock: ['goby', 'shrimp'] } },
    { id: 'r7', title: 'שומר ובונה', text: 'הגובי והחסילון גרים באותה מחילה. הביאו את שניהם אל החול, וגלו את השותפות ביניהם.', hint: 'הציבו אותם על החול, קרוב זה לזה.', after: 'r6', goal: { type: 'link', from: 'goby', to: 'shrimp' }, reward: { points: 40, unlock: ['plankton', 'lionfish', 'firecoral'] } },
    { id: 'r8', title: 'השונית בלילה', text: 'בלילה השונית מתעוררת: הפלנקטון עולה, והאלמוגים פותחים את הפוליפים. הביאו פלנקטון וחכו ללילה.', hint: 'בלילה חפשו את האור הכחול של הפלנקטון.', after: 'r7', goal: { type: 'observeNight' }, reward: { points: 40, unlock: ['octopus', 'hermit', 'stingray', 'seafan', 'jellyfish'] } },
    { id: 'r9', title: 'שרשרת מזון בים', text: 'פלנקטון מאכיל חסילון, וחסילון מאכיל טורף. בנו שרשרת מזון של 3 חוליות.', hint: 'למשל: פלנקטון ← חסילון ← תמנון.', after: 'r8', goal: { type: 'chain', length: 3 }, reward: { points: 45, unlock: ['table', 'butterflyfish', 'starfish'] } },
    { id: 'r10', title: 'שונית בריאה', text: 'שמרו על שונית בריאה, עם הרבה מינים וקשרים, במשך דקה אחת.', hint: 'בדקו שיש מי שאוכל את האצות, ושלאלמוגים יש אור.', after: 'r9', goal: { type: 'health', min: 0.7, seconds: 60 }, reward: { points: 80, unlock: ['clam'] } },
    { id: 'r11', title: 'עין מתחת למים', text: 'שלחו רובוט צולל לסרוק את השונית ולמצוא מה צריך תיקון.', hint: 'פתחו את לשונית "טכנולוגיה" במגש וגררו את הרובוט הצולל אל השונית.', after: 'r10', goal: { type: 'tool', tool: 'drone', count: 1 }, reward: { points: 30, unlock: ['reefshark'] } },
    { id: 'r12', title: 'צלמים מתחת למים', text: 'הציבו מצלמות שטח ליד השונית. צלמו 4 מינים שונים.', hint: 'מצלמה ליד שושנת ים או ליד אלמוג גדול תצלם יותר דגים.', after: 'r11', goal: { type: 'photos', count: 4 }, reward: { points: 35, unlock: [] } },
    { id: 'r13', title: 'שונית מלאה חיים', text: 'האתגר הגדול: הגיעו ל-20 מינים שחיים ביחד בשונית אחת.', hint: 'בדקו בדוח של רחפן הניטור מי חסר למי.', after: 'r12', goal: { type: 'speciesAlive', count: 20 }, reward: { points: 120, unlock: [] } },
  ],

  // ───────────────────────── EVENTS ─────────────────────────
  events: [
    {
      id: 'r_heat', title: 'המים מתחממים!',
      text: 'בקיץ חם במיוחד המים בשונית התחממו. כשהמים חמים מדי, האצות הזעירות עוזבות את האלמוגים, והאלמוגים מלבינים. מה עושים?',
      trigger: { type: 'mission', id: 'r6' },
      start: [{ type: 'heat', seconds: 45 }],
      choices: [
        { id: 'clean', label: 'לשמור על מים נקיים ועל דגים שאוכלים אצות', outcome: 'כשהמים חזרו להיות קרירים, האצות הזעירות חזרו לאלמוגים והם התאוששו. האלמוגים של אילת עמידים לחום יותר מרוב האלמוגים בעולם, ושונית נקייה ומאוזנת מתאוששת מהר יותר.', effects: [{ type: 'boost', species: 'branching', amount: 0.3 }, { type: 'points', amount: 15 }] },
        { id: 'nursery', label: 'לשתול אלמוגים צעירים ממשתלה', outcome: 'שתלתם שברי אלמוג שגדלו במשתלה. במקומות רבים בעולם משקמים כך שוניות שנפגעו.', effects: [{ type: 'plant', species: 'branching', count: 2, where: 'any' }] },
      ],
    },
    {
      id: 'r_flood', title: 'שיטפון מהמדבר',
      text: 'גשם חזק ירד בהרים שליד אילת, ושיטפון הביא בוץ אל הים. המים נעשו עכורים, ולאלמוגים מגיע פחות אור.',
      trigger: { type: 'day', day: 3 },
      start: [{ type: 'flood', seconds: 40 }],
      choices: [
        { id: 'seagrass', label: 'לשתול עשב ים שיחזיק את החול והבוץ', outcome: 'השורשים של עשב הים תפסו את הבוץ, והמים התבהרו מהר יותר.', effects: [{ type: 'plant', species: 'seagrass', count: 3, where: 'any' }] },
        { id: 'wait', label: 'לחכות שהמים יתבהרו', outcome: 'הזרם לקח את הבוץ לאט לאט, והמים חזרו להיות צלולים. האלמוגים קיבלו שוב אור.', effects: [{ type: 'points', amount: 10 }] },
      ],
    },
    {
      id: 'r_starfish', title: 'הרבה קוצנונים!',
      text: 'פתאום הגיעו לשונית הרבה קוצנונים, והם אוכלים את האלמוגים. מה עושים?',
      trigger: { type: 'mission', id: 'r10' },
      start: [{ type: 'add', species: 'starfish', count: 3 }],
      choices: [
        { id: 'move', label: 'להעביר את רוב הקוצנונים למקום אחר', outcome: 'צוללנים זהירים העבירו את רוב הקוצנונים, והאלמוגים ניצלו. קוצנון אחד או שניים הם חלק מהשונית, אבל כשיש מאות, האלמוגים בסכנה.', effects: [{ type: 'remove', species: 'starfish', count: 3 }, { type: 'points', amount: 10 }] },
        { id: 'wait', label: 'לחכות ולראות', outcome: 'הקוצנונים אכלו חלק מהאלמוגים. אחרי זמן מה רובם המשיכו הלאה, והשונית התחילה לגדול שוב, לאט.', effects: [{ type: 'points', amount: 5 }] },
      ],
    },
    {
      id: 'r_anchor', title: 'עוגן על השונית',
      text: 'סירה של מבקרים הגיעה לשונית והטילה עוגן כבד. העוגן נפל על האלמוגים ושבר כמה מהם. אלמוג גדל לאט מאוד, ושבר כזה לוקח שנים לתקן. מה עושים?',
      trigger: { type: 'day', day: 5 },
      start: [{ type: 'anchor', count: 2 }],
      choices: [
        { id: 'replant', label: 'להדביק את שברי האלמוג חזרה לסלע', outcome: 'צוללנים אספו את השברים והדביקו אותם לסלע בדבק מיוחד לשוניות. רוב השברים נאחזו והמשיכו לגדול.', effects: [{ type: 'plant', species: 'branching', count: 2, where: 'any' }] },
        { id: 'buoys', label: 'להציב מצופי עגינה, שהסירות ייקשרו אליהם', outcome: 'מעכשיו הסירות נקשרות למצופים ולא מטילות עוגן. מצוף עגינה נמצא בלשונית "טכנולוגיה".', effects: [{ type: 'points', amount: 10 }] },
      ],
    },
    {
      id: 'r_spawn', title: 'לילה של ביצים',
      text: 'בלילות של הקיץ, כמה ימים אחרי הירח המלא, האלמוגים משחררים יחד מיליוני ביצים קטנטנות. הן עולות למים כמו שלג הפוך! רוצים לראות מה יקרה להן?',
      trigger: { type: 'mission', id: 'r9' },
      start: [],
      choices: [
        { id: 'watch', label: 'להסתכל ולחכות', outcome: 'רוב הביצים נאכלו בידי דגים או נסחפו. אבל כמה מהן הפכו לאלמוגים זעירים, שנאחזו בסלע והתחילו לגדול.', effects: [{ type: 'plant', species: 'branching', count: 1, where: 'any' }, { type: 'points', amount: 10 }] },
        { id: 'collect', label: 'לאסוף כמה ביצים למשתלה', outcome: 'חוקרים באמת אוספים ביצי אלמוגים בלילות כאלה, מגדלים אותם במשתלה, ושותלים אחר כך בשונית. האלמוגים הצעירים נשתלו!', effects: [{ type: 'plant', species: 'branching', count: 2, where: 'any' }] },
      ],
    },
    {
      id: 'r_algae', title: 'האצות משתלטות',
      text: 'האצות על השונית גדלות מהר מאוד, ומתחילות לכסות את האלמוגים. מי יכול לעזור?',
      trigger: { type: 'mission', id: 'r4' },
      start: [{ type: 'plant', species: 'algae', count: 3, where: 'any' }],
      choices: [
        { id: 'grazers', label: 'להביא דגים שרועים אצות', outcome: 'תוכינונים ומנתחנים רעו את האצות, והאלמוגים קיבלו שוב אור. דגים רועים שומרים על השונית נקייה.', effects: [{ type: 'add', species: 'parrotfish', count: 1 }, { type: 'add', species: 'surgeonfish', count: 1 }] },
        { id: 'urchins', label: 'להביא קיפודי ים', outcome: 'קיפודי הים גרדו את האצות מהסלעים בלילה, ופינו מקום לאלמוגים צעירים.', effects: [{ type: 'add', species: 'urchin', count: 2 }] },
      ],
    },
  ],

  tips: [
    'האלמוג הוא בעל חיים, ובתוכו חיות אצות זעירות שמייצרות לו מזון מאור השמש.',
    'אלמוגים צריכים מים צלולים ורדודים, כי בלי אור האצות שבתוכם לא מייצרות מזון.',
    'השושנון חי בתוך שושנת ים צורבת. שכבה דקה על העור שלו מגינה עליו.',
    'הרבה מהחול הלבן שליד השוניות נוצר בזכות דגי התוכינון.',
    'עשב הים הוא צמח אמיתי, עם שורשים ופרחים, ולא אצה.',
    'בתחנת ניקוי דגים גדולים עומדים בתור, והנקאי מנקה אותם.',
    'בים סוף ראו דקרים ומורנות צדים ביחד.',
    'בלילה האלמוגים פותחים את הפוליפים ותופסים פלנקטון.',
    'החסילון חופר, הגובי שומר, ושניהם גרים באותה מחילה.',
    'האלמוגים של מפרץ אילת עמידים לחום יותר מרוב האלמוגים בעולם.',
    'צב הים נושם אוויר, ועולה לפני המים כדי לנשום.',
    'אלמוג אש הוא בכלל לא אלמוג אמיתי, אבל הוא צורב כמו אש.',
    'במשתלת אלמוגים מגדלים שברי אלמוג קטנים, ושותלים אותם אחר כך בשונית.',
    'סירות שנקשרות למצוף עגינה לא מטילות עוגן על האלמוגים.',
  ],
};
