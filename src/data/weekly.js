// אירוע השבוע (1.4.4): the four kinds that take turns, and the versions of each (docs/PLAN-1.4.4.md "ארבעת האירועים
// השבועיים"). The versions are filled by sets 5 to 7; a kind with no versions yet is shown as coming soon and the
// schedule skips nothing (its week simply has no event). Words: `name` for the full level, `kname` with full nikud.
// A version: { id, title, ktitle, guest: { zone, id } (the rare guest who comes to live on that island), ...the event's
// own data }. Facts in a version need a source in docs/sources.md like everything else.
export const WEEK_KINDS = [
  { id: 'glitch', icon: 'bolt', name: 'התקלה במעבדה', kname: 'הַתַּקָּלָה בַּמַּעְבָּדָה',
    blurb: 'קוּבִּי לחץ על הכפתור הלא נכון, ויצורים מכמה סביבות נחתו על אי אחד. מי צריך לחזור לאן?',
    kblurb: 'קוּבִּי לָחַץ עַל הַכַּפְתּוֹר הַלֹּא נָכוֹן! יְצוּרִים נָחֲתוּ בַּמָּקוֹם הַלֹּא נָכוֹן. מִי צָרִיךְ לַחֲזֹר לְאָן?' },
  { id: 'jar', icon: 'jar', name: 'הצנצנת הסגורה', kname: 'הַצִּנְצֶנֶת הַסְּגוּרָה',
    blurb: 'עד שישה יצורים בצנצנת אחת. סוגרים את המכסה, ואסור לגעת. האם ביום חמישי היא עוד תהיה חיה ומאוזנת?',
    kblurb: 'שָׂמִים יְצוּרִים בְּצִנְצֶנֶת וְסוֹגְרִים. הַאִם בְּיוֹם חֲמִישִׁי הִיא עוֹד תִּהְיֶה חַיָּה?' },
  { id: 'detective', icon: 'search', name: 'הבלש של השבוע', kname: 'הַבַּלָּשׁ שֶׁל הַשָּׁבוּעַ',
    blurb: 'כל יום רמז אחד, חמישה בסך הכול. מה קרה כאן? אפשר לשנות את הניחוש עד הסוף.',
    kblurb: 'כָּל יוֹם רֶמֶז אֶחָד. מָה קָרָה כָּאן? אֶפְשָׁר לְשַׁנּוֹת אֶת הַנִּחוּשׁ עַד הַסּוֹף.' },
  { id: 'race', icon: 'flag', name: 'מירוץ הרובוטים', kname: 'מֵרוֹץ הָרוֹבּוֹטִים',
    blurb: 'מסלול מכשולים מקטעים של חמשת האיים. תוכנית אחת ורובוט אחד צריכים לעבור את כולו.',
    kblurb: 'מַסְלוּל מִכְשׁוֹלִים מִכָּל הָאִיִּים. תָּכְנִית אַחַת וְרוֹבּוֹט אֶחָד צְרִיכִים לַעֲבֹר אוֹתוֹ.' },
];
export const kindOf = (id) => WEEK_KINDS.find((k) => k.id === id) || null;

// the versions of each kind (sets 5 to 7 fill them; tests may add their own through addVersions)
import { GLITCH_VERSIONS } from './weekly/glitch.js';   // set 5
import { JAR_VERSIONS } from './weekly/jar.js';         // set 6
import { DETECTIVE_VERSIONS } from './weekly/detective.js';   // set 7
import { RACE_VERSIONS } from './weekly/race.js';       // set 7
export const VERSIONS = { glitch: GLITCH_VERSIONS.slice(), jar: JAR_VERSIONS.slice(), detective: DETECTIVE_VERSIONS.slice(), race: RACE_VERSIONS.slice() };
export const versionsOf = (kind) => VERSIONS[kind] || [];
export function addVersions(kind, list) { (VERSIONS[kind] = VERSIONS[kind] || []).push(...list); }

// the screen's words (full level / beginners)
export const WEEK_UI = {
  title: { f: 'אירוע השבוע', k: 'אֵירוּעַ הַשָּׁבוּעַ' },
  open: { f: 'פתוח עד יום חמישי', k: 'פָּתוּחַ עַד יוֹם חֲמִישִׁי' },
  left: { f: 'נשארו {n} ימים', k: 'נִשְׁאֲרוּ {n} יָמִים' },
  lastDay: { f: 'היום היום האחרון!', k: 'הַיּוֹם הַיּוֹם הָאַחֲרוֹן!' },
  closed: { f: 'השבוע נגמר. ביום ראשון מחכה אירוע חדש.', k: 'הַשָּׁבוּעַ נִגְמַר. בְּיוֹם רִאשׁוֹן מְחַכֶּה אֵירוּעַ חָדָשׁ.' },
  soon: { f: 'האירוע הזה עוד בהכנה. בשבוע הבא יהיה אירוע אחר.', k: 'הָאֵירוּעַ הַזֶּה עוֹד בַּהֲכָנָה.' },
  start: { f: 'להתחיל', k: 'לְהַתְחִיל' },
  cont: { f: 'להמשיך', k: 'לְהַמְשִׁיךְ' },
  done: { f: 'הצלחתם השבוע!', k: 'הִצְלַחְתֶּם הַשָּׁבוּעַ!' },
  again: { f: 'לנסות לשבור שיא', k: 'לְנַסּוֹת לִשְׁבֹּר שִׂיא' },
  best: { f: 'השיא שלכם', k: 'הַשִּׂיא שֶׁלָּכֶם' },
  guests: { f: 'אורחים שגרים באיים שלכם', k: 'אוֹרְחִים שֶׁגָּרִים בָּאִיִּים שֶׁלָּכֶם' },
  noGuests: { f: 'כל אירוע שמצליחים בו מביא אורח נדיר שנשאר לגור באחד האיים.', k: 'כָּל אֵירוּעַ מֵבִיא אוֹרֵחַ נָדִיר לָאִי.' },
  history: { f: 'האירועים שעשיתם', k: 'הָאֵירוּעִים שֶׁעֲשִׂיתֶם' },
  staff: { f: 'למדריכים: כל האירועים פתוחים', k: 'לַמַּדְרִיכִים: כָּל הָאֵירוּעִים פְּתוּחִים' },
  close: { f: 'סגירה', k: 'סְגִירָה' },
  days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
};
