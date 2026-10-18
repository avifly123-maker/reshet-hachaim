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
        hint: 'גררו הליקוניה מהמגש אל יער הגשם, פעמיים.',
        after: null,
        goal: { type: 'place', species: 'heliconia', count: 2 },
        reward: { points: 20, unlock: ['sloth'] },
      },
      {
        id: 'k2',
        title: 'יונק הדבש בא לבקר',
        text: 'יונק הדבש מאביק פרחים, וכך יגדלו פירות. תנו לו להאביק 2 פעמים את ההליקוניות.',
        hint: 'גררו יונק דבש אל יער הגשם, ליד ההליקוניות.',
        after: 'k1',
        goal: { type: 'pollinate', species: 'heliconia', count: 2 },
        reward: { points: 25, unlock: ['toucan'] },
      },
      {
        id: 'k3',
        title: 'ארוחה לעצלן',
        text: 'העצלן אוהב לאכול עלים של צקרופיה. הביאו עצלן אל העץ.',
        hint: 'גררו עצלן אל יער הגשם, ממש ליד עץ צקרופיה.',
        after: 'k2',
        goal: { type: 'link', from: 'sloth', to: 'cecropia' },
        reward: { points: 25, unlock: ['acai'] },
      },
      {
        id: 'k4',
        title: 'הטוקן שותל עצים',
        text: 'הטוקן אוכל פירות ומפיל את הזרעים במקום אחר. שם צומח עץ חדש!',
        hint: 'גררו טוקן אל יער הגשם, ליד דקל אסאי עם פירות.',
        after: 'k3',
        goal: { type: 'disperse', count: 1 },
        reward: { points: 30, unlock: ['agouti'] },
      },
      {
        id: 'k5',
        title: 'חבר קטן בקרקעית',
        text: 'האגוטי הוא חיה קטנה וחמודה. הוא אוהב פירות של דקל אסאי.',
        hint: 'גררו אגוטי אל יער הגשם, ליד דקל אסאי.',
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
        hint: 'גררו מצלמת שטח מהלשונית "טכנולוגיה" אל יער הגשם, ליד החיות.',
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
        hint: 'גררו כלנית מהמגש אל מקום פתוח בחורש, פעמיים.',
        after: null,
        goal: { type: 'place', species: 'anemone', count: 2 },
        reward: { points: 20, unlock: ['hyrax'] },
      },
      {
        id: 'k2',
        title: 'הדבורה עובדת',
        text: 'הדבורה מאביקה פרחים, וכך יגדלו זרעים. תנו לדבורים להאביק 2 פעמים את המרווה.',
        hint: 'גררו דבורת דבש אל החורש, ליד שיח מרווה.',
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
        hint: 'גררו עורבני אל החורש, ליד עץ אלון גדול.',
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
        hint: 'גררו צבי אל החורש, ליד עץ אלון.',
        after: 'k5',
        goal: { type: 'link', from: 'gazelle', to: 'oak' },
        reward: { points: 30, unlock: [] },
      },
      {
        id: 'k7',
        title: 'רחפן עוזר',
        text: 'הרחפן עף מעל החורש ובודק שהכול בסדר. שלחו רחפן אחד.',
        hint: 'גררו רחפן מהלשונית "טכנולוגיה" אל החורש.',
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
  // 1.3 (in development): the reef of Eilat
  reef: {
    intro: 'מתחת למים יש שונית צבעונית של אלמוגים ודגים. בואו נבנה יחד שונית קטנה!',
    // "plants": branching coral, sea anemone, seagrass, algae
    // animals: anemonefish (lives in the anemone), parrotfish (eats algae), green turtle (eats seagrass), sea urchin
    species: ['branching', 'seaanemone', 'seagrass', 'algae', 'clownfish', 'parrotfish', 'turtle', 'urchin'],
    start: ['branching', 'seaanemone', 'seagrass', 'clownfish'],
    missions: [
      { id: 'k1', title: 'אלמוגים ורודים', text: 'האלמוג הוא בעל חיים שבונה את השונית. שתלו 2 אלמוגי שיח.', hint: 'גררו אלמוג שיח מהמגש אל השונית, פעמיים.', after: null, goal: { type: 'place', species: 'branching', count: 2 }, reward: { points: 20, unlock: ['algae'] } },
      { id: 'k2', title: 'בית בתוך שושנה', text: 'השושנון גר בתוך שושנת ים. הביאו שושנון ליד שושנת הים.', hint: 'גררו שושנון אל השונית, ממש ליד שושנת הים.', after: 'k1', goal: { type: 'link', from: 'clownfish', to: 'seaanemone' }, reward: { points: 25, unlock: ['parrotfish'] } },
      { id: 'k3', title: 'דג אוכל אצות', text: 'התוכינון אוכל אצות ושומר על האלמוגים. שתלו אצות והביאו תוכינון.', hint: 'גררו תוכינון אל השונית, ליד האצות.', after: 'k2', goal: { type: 'link', from: 'parrotfish', to: 'algae' }, reward: { points: 25, unlock: ['turtle'] } },
      { id: 'k4', title: 'הצב רועה בעשב', text: 'צב הים אוכל עשב ים. שתלו עשב ים והביאו צב.', hint: 'גררו צב ים אל השונית, ליד עשב הים.', after: 'k3', goal: { type: 'link', from: 'turtle', to: 'seagrass' }, reward: { points: 30, unlock: ['urchin'] } },
      { id: 'k5', title: 'קיפוד שמגרד אצות', text: 'קיפוד הים מגרד אצות מהסלע. הביאו קיפוד ים אל האצות.', hint: 'גררו קיפוד ים אל השונית, ליד האצות.', after: 'k4', goal: { type: 'link', from: 'urchin', to: 'algae' }, reward: { points: 30, unlock: [] } },
      { id: 'k6', title: 'רובוט צולל עוזר', text: 'הרובוט הצולל שוחה לאורך השונית ובודק שהכול בסדר. שלחו רובוט צולל אחד.', hint: 'גררו רובוט צולל מהלשונית "טכנולוגיה" אל השונית.', after: 'k5', goal: { type: 'tool', tool: 'drone', count: 1 }, reward: { points: 40, unlock: [] } },
    ],
    tips: [
      'האלמוג הוא בעל חיים, לא אבן ולא צמח.',
      'השושנון גר בתוך שושנת ים.',
      'צב הים נושם אוויר.',
      'התוכינון אוכל אצות.',
      'קיפוד הים יוצא בלילה.',
      'עשב ים הוא צמח עם שורשים.',
    ],
  },
};
