// מערבל הטבע (1.4.4 set 3, docs/PLAN-1.4.4.md "שבעה מקומות בסדנה" 2): a wheel of nature's cards against a wheel of
// problems. The child spins, gets a pair (say, an elephant's trunk and "to clean a high window") and picks which of the
// creature's traits could solve it. Each problem leans on one of the robot workshop's tests (src/data/inventions.js
// TRIALS): a trait the test calls good makes an idea that works, one it calls ok half works, any other trait is a wild
// idea (it still counts: ניצוץ loves wild ideas, and far pairs are worth more originality).
// A problem: { id, f, k, trial, cat }   cat: the kind of idea (ideas.js CATS)
export const PROBLEMS = [
  { id: 'window', f: 'לנקות חלון גבוה בבניין', k: 'לְנַקּוֹת חַלּוֹן גָּבוֹהַּ', trial: 'wall', cat: 'home' },
  { id: 'coolhouse', f: 'לשמור על הבית קריר בקיץ', k: 'לִשְׁמֹר עַל הַבַּיִת קָרִיר בַּקַּיִץ', trial: 'heat', cat: 'home' },
  { id: 'warmtent', f: 'לחמם אוהל בלילה קר', k: 'לְחַמֵּם אֹהֶל בַּלַּיְלָה', trial: 'cold', cat: 'home' },
  { id: 'heavybag', f: 'להעלות שק כבד במעלה הגבעה', k: 'לְהַעֲלוֹת שַׂק כָּבֵד בַּגִּבְעָה', trial: 'carry', cat: 'move' },
  { id: 'key', f: 'להוציא מפתח שנפל לסדק צר', k: 'לְהוֹצִיא מַפְתֵּחַ מִסֶּדֶק צַר', trial: 'gap', cat: 'home' },
  { id: 'nightwalk', f: 'למצוא את הדרך בלילה בלי פנס', k: 'לִמְצֹא אֶת הַדֶּרֶךְ בַּלַּיְלָה', trial: 'dark', cat: 'sound' },
  { id: 'boat', f: 'לנקות סירה מאצות שנדבקו אליה', k: 'לְנַקּוֹת סִירָה מֵאַצּוֹת', trial: 'clean', cat: 'water' },
  { id: 'fastswim', f: 'לשחות מהר מקצה הבריכה לקצה', k: 'לִשְׂחוֹת מַהֵר בַּבְּרֵכָה', trial: 'swim', cat: 'water' },
  { id: 'dune', f: 'לעבור דיונה של חול רך', k: 'לַעֲבֹר דְּיוּנָה שֶׁל חוֹל', trial: 'sand', cat: 'move' },
  { id: 'valley', f: 'לרדת מהר מהגבעה אל העמק', k: 'לָרֶדֶת מַהֵר אֶל הָעֵמֶק', trial: 'glide', cat: 'move' },
  { id: 'windy', f: 'להיאחז בענף כשנושבת רוח חזקה', k: 'לְהֵאָחֵז בְּעָנָף בָּרוּחַ', trial: 'branch', cat: 'shield' },
  { id: 'library', f: 'לעבוד בספרייה בלי להפריע לאף אחד', k: 'לַעֲבֹד בְּשֶׁקֶט בַּסִּפְרִיָּה', trial: 'quiet', cat: 'sound' },
  { id: 'nest', f: 'לצלם קן בלי להבהיל את הגוזלים', k: 'לְצַלֵּם קֵן בְּלִי לְהַבְהִיל', trial: 'quiet', cat: 'nature' },
  { id: 'drain', f: 'לפתוח צינור שנסתם', k: 'לִפְתֹּחַ צִנּוֹר סָתוּם', trial: 'gap', cat: 'water' },
  { id: 'roof', f: 'לטפס לגג כדי להחזיר כדור', k: 'לְטַפֵּס לַגַּג לְהָבִיא כַּדּוּר', trial: 'wall', cat: 'fun' },
  { id: 'pool', f: 'לנקות את המסננת של הבריכה', k: 'לְנַקּוֹת אֶת הַמְּסַנֶּנֶת שֶׁל הַבְּרֵכָה', trial: 'clean', cat: 'water' },
];
export const problemOf = (id) => PROBLEMS.find((p) => p.id === id) || null;
