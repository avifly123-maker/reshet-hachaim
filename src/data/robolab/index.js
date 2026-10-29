// מעבדת הרובוטים – all levels (lessons and puzzles) in one list, and the chapters they belong to.
import { LESSONS_1 } from './lessons-1.js';
import { LESSONS_2 } from './lessons-2.js';
import { LESSONS_3 } from './lessons-3.js';
import { LESSONS_4 } from './lessons-4.js';
import { LESSONS_5 } from './lessons-5.js';
import { PUZZLES as PZ } from './puzzles.js';
// the eight chapters (docs/PLAN-1.4.md 7.2): title, the idea in a few words, colour of the chapter card
export const CHAPTERS = [
  { n: 1, color: '#3b82c4', title: { f: 'סדר פעולות', k: 'סֵדֶר פְּעֻלּוֹת' }, idea: { f: 'הרובוט עושה בדיוק מה שכתוב, לפי הסדר', k: 'הָרוֹבּוֹט עוֹשֶׂה בְּדִיּוּק מָה שֶׁכָּתוּב, לְפִי הַסֵּדֶר' } },
  { n: 2, color: '#e08a2b', title: { f: 'חזרות', k: 'חֲזָרוֹת' }, idea: { f: 'לולאה עושה את אותו דבר שוב ושוב', k: 'לוּלָאָה עוֹשָׂה אֶת אוֹתוֹ דָּבָר שׁוּב וָשׁוּב' } },
  { n: 3, color: '#8a5cc4', title: { f: 'הבלוק שלי', k: 'הַבְּלוֹק שֶׁלִּי' }, idea: { f: 'בונים בלוק חדש מכמה בלוקים', k: 'בּוֹנִים בְּלוֹק חָדָשׁ מִכַּמָּה בְּלוֹקִים' } },
  { n: 4, color: '#3f9a4a', title: { f: 'תנאים וחיישנים', k: 'תְּנָאִים וְחַיְשָׁנִים' }, idea: { f: 'הרובוט מסתכל ומחליט', k: 'הָרוֹבּוֹט מִסְתַּכֵּל וּמַחְלִיט' } },
  { n: 5, color: '#d4a915', title: { f: 'אירועים', k: 'אֵרוּעִים' }, idea: { f: 'כשמשהו קורה, הרובוט מגיב', k: 'כְּשֶׁמַּשֶּׁהוּ קוֹרֶה, הָרוֹבּוֹט מֵגִיב' } },
  { n: 6, color: '#c4504a', title: { f: 'מונים ומשתנים', k: 'מוֹנִים וּמִשְׁתַּנִּים' }, idea: { f: 'סופרים וזוכרים מספרים', k: 'סוֹפְרִים וְזוֹכְרִים מִסְפָּרִים' } },
  { n: 7, color: '#2a9a9a', title: { f: 'עבודת צוות', k: 'עֲבוֹדַת צֶוֶת' }, idea: { f: 'רובוט ורחפן עובדים יחד', k: 'רוֹבּוֹט וְרַחְפָן עוֹבְדִים יַחַד' } },
  { n: 8, color: '#d66aa8', title: { f: 'אתגרים', k: 'אֶתְגָּרִים' }, idea: { f: 'פחות בלוקים, יותר כוכבים', k: 'פָּחוֹת בְּלוֹקִים, יוֹתֵר כּוֹכָבִים' } },
];
export const LESSONS = [...LESSONS_1, ...LESSONS_2, ...LESSONS_5, ...LESSONS_3, ...LESSONS_4];
export const PUZZLES = [...PZ];
export const ALL_LEVELS = [...LESSONS, ...PUZZLES];
