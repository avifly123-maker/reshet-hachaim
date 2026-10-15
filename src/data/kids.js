// רשת החיים – BEGINNERS mode (ages 6–8).
// A small, friendly subset of each biome: no hunters, a simple food web, very short missions.
// Species ids come from src/data/<biome>.js (no new species). Every pollinate / disperse / link
// goal uses a relation that already exists there (diet or relations). Checked by tools/validate-kids.mjs.
// Mission fields and goal types are the same as in the regular missions (see CONTRACT.md §5).

export const KIDS = {
  amazon: {
    intro: 'ביער הגשם הכול ירוק וגבוה. בואו נבנה יחד יער קטן ושמח!',
    // plants: kapok (tree), cecropia (tree), acai (palm), heliconia (flower)
    // animals: hummingbird (pollinator), toucan (seed carrier), sloth + agouti (cute plant eaters)
    species: ['kapok', 'cecropia', 'acai', 'heliconia', 'hummingbird', 'toucan', 'sloth', 'agouti'],
    start: ['kapok', 'cecropia', 'heliconia', 'hummingbird'],
    missions: [
      {
        id: 'k1',
        title: 'פרחים אדומים',
        text: 'ההליקוניה היא פרח אדום ויפה. שתלו 2 הליקוניות.',
        hint: 'גררו הליקוניה מהמגש אל האי, פעמיים.',
        after: null,
        goal: { type: 'place', species: 'heliconia', count: 2 },
        reward: { points: 20, unlock: ['sloth'] },
      },
      {
        id: 'k2',
        title: 'יונק הדבש בא לבקר',
        text: 'יונק הדבש מאביק פרחים, וכך יגדלו פירות. תנו לו להאביק 2 פעמים את ההליקוניות.',
        hint: 'גררו יונק דבש אל האי, ליד ההליקוניות.',
        after: 'k1',
        goal: { type: 'pollinate', species: 'heliconia', count: 2 },
        reward: { points: 25, unlock: ['toucan'] },
      },
      {
        id: 'k3',
        title: 'ארוחה לעצלן',
        text: 'העצלן אוהב לאכול עלים של צקרופיה. הביאו עצלן אל העץ.',
        hint: 'גררו עצלן אל האי, ממש ליד עץ צקרופיה.',
        after: 'k2',
        goal: { type: 'link', from: 'sloth', to: 'cecropia' },
        reward: { points: 25, unlock: ['acai'] },
      },
      {
        id: 'k4',
        title: 'הטוקן שותל עצים',
        text: 'הטוקן אוכל פירות ומפיל את הזרעים במקום אחר. שם צומח עץ חדש!',
        hint: 'גררו טוקן אל האי, ליד דקל אסאי עם פירות.',
        after: 'k3',
        goal: { type: 'disperse', count: 1 },
        reward: { points: 30, unlock: ['agouti'] },
      },
      {
        id: 'k5',
        title: 'חבר קטן בקרקעית',
        text: 'האגוטי הוא חיה קטנה וחמודה. הוא אוהב פירות של דקל אסאי.',
        hint: 'גררו אגוטי אל האי, ליד דקל אסאי.',
        after: 'k4',
        goal: { type: 'link', from: 'agouti', to: 'acai' },
        reward: { points: 30, unlock: [] },
      },
      {
        id: 'k6',
        title: 'עץ ענק',
        text: 'הקפוק מגיע גבוה מעל רוב העצים. גדלו קפוק אחד עד שיהיה גדול.',
        hint: 'שתלו קפוק במקום עם הרבה שמש, וחכו.',
        after: 'k5',
        goal: { type: 'grow', species: 'kapok', count: 1 },
        reward: { points: 30, unlock: [] },
      },
      {
        id: 'k7',
        title: 'צלמים ביער',
        text: 'מצלמה קטנה מצלמת את החיות. צלמו 2 חיות שונות.',
        hint: 'גררו מצלמת שטח מהלשונית "טכנולוגיה" אל האי, ליד החיות.',
        after: 'k6',
        goal: { type: 'photos', count: 2 },
        reward: { points: 40, unlock: [] },
      },
    ],
    tips: [
      'צמחים צריכים שמש כדי לגדול.',
      'יונק הדבש יכול לעמוד באוויר במקום אחד.',
      'העצלן זז לאט לאט על הענפים.',
      'לטוקן יש מקור גדול וצבעוני.',
      'האגוטי טומן זרעים באדמה, כמו אוצר.',
      'בלי צמחים אין אוכל לחיות.',
    ],
  },

  grove: {
    intro: 'בחורש של ארץ ישראל יש עצים, פרחים וחיות. בואו נבנה יחד חורש קטן!',
    // plants: oak (tree), sage (shrub), anemone + cyclamen (flowers)
    // animals: honeybee (pollinator), jay (seed carrier), hyrax + gazelle (cute plant eaters)
    species: ['oak', 'sage', 'anemone', 'cyclamen', 'honeybee', 'jay', 'hyrax', 'gazelle'],
    start: ['oak', 'sage', 'anemone', 'honeybee'],
    missions: [
      {
        id: 'k1',
        title: 'כלניות אדומות',
        text: 'בחורף פורחות כלניות אדומות. שתלו 2 כלניות במקום עם שמש.',
        hint: 'גררו כלנית מהמגש אל מקום פתוח באי, פעמיים.',
        after: null,
        goal: { type: 'place', species: 'anemone', count: 2 },
        reward: { points: 20, unlock: ['hyrax'] },
      },
      {
        id: 'k2',
        title: 'הדבורה עובדת',
        text: 'הדבורה מאביקה פרחים, וכך יגדלו זרעים. תנו לדבורים להאביק 2 פעמים את המרווה.',
        hint: 'גררו דבורת דבש אל האי, ליד שיח מרווה.',
        after: 'k1',
        goal: { type: 'pollinate', species: 'sage', count: 2 },
        reward: { points: 25, unlock: ['jay'] },
      },
      {
        id: 'k3',
        title: 'שפן הסלע רעב',
        text: 'שפן הסלע גר בין הסלעים. הוא אוהב לאכול עלים של מרווה.',
        hint: 'גררו שפן סלע אל הסלעים, קרוב למרווה.',
        after: 'k2',
        goal: { type: 'link', from: 'hyrax', to: 'sage' },
        reward: { points: 25, unlock: ['cyclamen'] },
      },
      {
        id: 'k4',
        title: 'העורבני שותל אלונים',
        text: 'העורבני טומן בלוטים באדמה ושוכח חלק מהם. מהבלוט צומח אלון חדש!',
        hint: 'גררו עורבני אל האי, ליד עץ אלון גדול.',
        after: 'k3',
        goal: { type: 'disperse', count: 1 },
        reward: { points: 30, unlock: ['gazelle'] },
      },
      {
        id: 'k5',
        title: 'רקפת בין הסלעים',
        text: 'הרקפת אוהבת לגדול בין הסלעים. שתלו 2 רקפות.',
        hint: 'גררו רקפת אל מקום בין הסלעים, פעמיים.',
        after: 'k4',
        goal: { type: 'place', species: 'cyclamen', count: 2 },
        reward: { points: 30, unlock: [] },
      },
      {
        id: 'k6',
        title: 'הצבי בא לאכול',
        text: 'הצבי רץ מהר מאוד. הוא אוהב לאכול עלים של אלון.',
        hint: 'גררו צבי אל האי, ליד עץ אלון.',
        after: 'k5',
        goal: { type: 'link', from: 'gazelle', to: 'oak' },
        reward: { points: 30, unlock: [] },
      },
      {
        id: 'k7',
        title: 'רחפן עוזר',
        text: 'הרחפן עף מעל החורש ובודק שהכול בסדר. שלחו רחפן אחד.',
        hint: 'גררו רחפן מהלשונית "טכנולוגיה" אל האי.',
        after: 'k6',
        goal: { type: 'tool', tool: 'drone', count: 1 },
        reward: { points: 40, unlock: [] },
      },
    ],
    tips: [
      'הכלנית פורחת בחורף.',
      'הדבורה מכינה דבש מצוף של פרחים.',
      'שפן הסלע אוהב לשבת על סלע חם.',
      'לרקפת יש עלים בצורת לב.',
      'העורבני אוהב בלוטים של אלון.',
      'האלון יכול לחיות הרבה מאוד שנים.',
    ],
  },
};
