// מעבדת הרובוטים – lessons on the savanna (1.4.2; Avi, 1.11: "there are no robot lessons in the desert and the savanna").
// Each one is a sister of a grove lesson (the same field, the same solutions and wrong programs, so every check holds):
// another zone, another animal and its own words. index.js puts each right after the lesson it comes from.
// Kubi's voice for these lines (kl_<id>) is recorded on Avi's PC (tools/voice/kubi-lines.mjs); until then they are words only.
import { LESSONS_1 } from './lessons-1.js';
import { LESSONS_3 } from './lessons-3.js';
import { LESSONS_5 } from './lessons-5.js';

const ALL = [...LESSONS_1, ...LESSONS_3, ...LESSONS_5];
const T = (f, k) => ({ f, k });
const deep = (o) => JSON.parse(JSON.stringify(o));
// animals in the items and variants become the savanna's
const swapKind = (o, kind) => { if (Array.isArray(o)) o.forEach((x) => swapKind(x, kind)); else if (o && typeof o === 'object') { if (o.t === 'animal') o.kind = kind; Object.values(o).forEach((v) => swapKind(v, kind)); } return o; };

function sister(from, id, { title, say, kind }) {
  const L = ALL.find((q) => q.id === from); if (!L) throw new Error('robolab savanna: no lesson ' + from);
  const S = { ...L, id, zone: 'savanna', title, say, from };
  for (const k of ['map', 'variants', 'items', 'goal', 'home', 'tools0']) if (L[k] !== undefined) S[k] = deep(L[k]);
  if (kind) { swapKind(S.variants, kind); swapKind(S.items, kind); }
  return S;
}

export const LESSONS_SAVANNA = [
  sister('l2-3', 'ls2-3', { kind: 'zebra',
    title: T('הרחפן מצלם זברות', 'הָרַחְפָן מְצַלֵּם זֶבְּרוֹת'),
    say: [T('זברות רועות בשורה במישור. הרחפן מצלם אותן מלמעלה, גבוה מספיק כדי לא להבהיל את העדר.', 'זֶבְּרוֹת רוֹעוֹת בְּשׁוּרָה בַּמִּישׁוֹר. הָרַחְפָן מְצַלֵּם אוֹתָן מִלְמַעְלָה, גָּבוֹהַּ מַסְפִּיק כְּדֵי לֹא לְהַבְהִיל אֶת הָעֵדֶר.')] }),
  sister('l2-5', 'ls2-5', {
    title: T('שתי שורות של שיטות', 'שְׁתֵּי שׁוּרוֹת שֶׁל שִׁטִּים'),
    say: [T('בסוואנה שותלים שיטות, כדי שיהיה צל לבעלי החיים. לולאה בתוך לולאה: שורה, פנייה, ועוד שורה.', 'בַּסַּוָּנָה שׁוֹתְלִים שִׁטִּים, כְּדֵי שֶׁיִּהְיֶה צֵל לְבַעֲלֵי הַחַיִּים. לוּלָאָה בְּתוֹךְ לוּלָאָה: שׁוּרָה, פְּנִיָּה, וְעוֹד שׁוּרָה.')] }),
  sister('l5-2', 'ls5-2', { kind: 'zebra',
    title: T('כשאני רואה זברה', 'כְּשֶׁאֲנִי רוֹאֶה זֶבְּרָה'),
    say: [T('הרחפן מסייר מעל המישור. בכל פעם שהוא רואה זברה, הוא עוצר לרגע לצלם, וממשיך בסיור.', 'הָרַחְפָן מְסַיֵּר מֵעַל הַמִּישׁוֹר. בְּכָל פַּעַם שֶׁהוּא רוֹאֶה זֶבְּרָה, הוּא עוֹצֵר לְרֶגַע לְצַלֵּם, וּמַמְשִׁיךְ בַּסִּיּוּר.')] }),
  sister('l6-1', 'ls6-1', { kind: 'zebra',
    title: T('כמה זברות במישור?', 'כַּמָּה זֶבְּרוֹת בַּמִּישׁוֹר?'),
    say: [T('כשהעשב מתמעט, חוקרים סופרים את הזברות. הרחפן עף מעל המישור, מוסיף 1 על כל זברה, ובסוף מדווח.', 'כְּשֶׁהָעֵשֶׂב מִתְמַעֵט, חוֹקְרִים סוֹפְרִים אֶת הַזֶּבְּרוֹת. הָרַחְפָן עָף מֵעַל הַמִּישׁוֹר, מוֹסִיף 1 עַל כָּל זֶבְּרָה, וּבַסּוֹף מְדַוֵּחַ.')] }),
];
