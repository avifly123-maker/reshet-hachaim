// רובו־דע presents the parts of the start area (1.3.2). Keys: part ids of src/core/journey.js PARTS, or 'start:<place>'.
// { id: 'start.<key>.<n>', f, k (full nikud), at?, expr? } – short bubbles, one idea each, up to about 15 words.
//   journey         the journey bar on the start screen (src/ui/ui.js renderStart), the first visit of a player
//   start:map       מפת המסע, the first time it opens (src/ui/journey-map.js)
//   start:settings  the settings sheet, the first time it opens (src/ui/settings.js; lines whose `at` is not on screen,
//                   e.g. the play mode row for beginners, are left out)
//   start:go        after a stage moment: "go there now?" and the ring on the new button (stage 2..6)
//   start:tips      single bubbles (settings: hear the explanations again)
export const START_GUIDE = {
  journey: [
    { id: 'start.journey.1', at: '.st-jbar', expr: 'happy', f: 'כאן רואים באיזה שלב של המסע אתם.', k: 'כָּאן רוֹאִים בְּאֵיזֶה שָׁלָב שֶׁל הַמַּסָּע אַתֶּם.' },
    { id: 'start.journey.2', at: '.jb-prog', f: 'הפס מתמלא כשמשלימים משימות ומקבלים תגים.', k: 'הַפַּס מִתְמַלֵּא כְּשֶׁמַּשְׁלִימִים מְשִׂימוֹת וּמְקַבְּלִים תָּגִים.' },
    { id: 'start.journey.3', at: '.st-jbar', f: 'לחצו כאן, ותראו את כל מפת המסע.', k: 'לַחֲצוּ כָּאן, וְתִרְאוּ אֶת כָּל מַפַּת הַמַּסָּע.' },
    { id: 'start.journey.4', at: '.st-gear', expr: 'curious', f: 'בכפתור הזה משנים את גודל האותיות ואת הקול שלי.', k: 'בַּכַּפְתּוֹר הַזֶּה מְשַׁנִּים אֶת גֹּדֶל הָאוֹתִיּוֹת וְאֶת הַקּוֹל שֶׁלִּי.' },
  ],
  'start:map': [
    { id: 'start.map.1', at: '.jm-stages', expr: 'happy', f: 'זו מפת המסע: שישה שלבים, מימין לשמאל.', k: 'זוֹ מַפַּת הַמַּסָּע: שִׁשָּׁה שְׁלַבִּים, מִיָּמִין לִשְׂמֹאל.' },
    { id: 'start.map.2', at: '.jm-st.cur .jm-medw', f: 'השלב שזוהר הוא השלב שלכם עכשיו.', k: 'הַשָּׁלָב שֶׁזּוֹהֵר הוּא הַשָּׁלָב שֶׁלָּכֶם עַכְשָׁו.' },
    { id: 'start.map.3', at: '.jm-st.cur .jm-parts', f: 'מתחת לכל שלב רואים מה הוא פותח במשחק.', k: 'מִתַּחַת לְכָל שָׁלָב רוֹאִים מָה הוּא פּוֹתֵחַ בַּמִּשְׂחָק.' },
    { id: 'start.map.4', at: '.jm-next', expr: 'curious', f: 'וכאן כתוב מה עוד חסר כדי להגיע לשלב הבא.', k: 'וְכָאן כָּתוּב מָה עוֹד חָסֵר כְּדֵי לְהַגִּיעַ לַשָּׁלָב הַבָּא.' },
  ],
  'start:settings': [
    { id: 'start.settings.1', at: '.set-row[data-row="text"]', expr: 'happy', f: 'כאן בוחרים כמה גדולות יהיו האותיות.', k: 'כָּאן בּוֹחֲרִים כַּמָּה גְּדוֹלוֹת יִהְיוּ הָאוֹתִיּוֹת.' },
    { id: 'start.settings.2', at: '.set-row[data-row="voice"]', f: 'כאן מדליקים או מכבים את הקול שלי.', k: 'כָּאן מַדְלִיקִים אוֹ מְכַבִּים אֶת הַקּוֹל שֶׁלִּי.' },
    { id: 'start.settings.3', at: '.set-row[data-row="mode"]', f: 'במצב חוויה יש ביער פחות מילים, ובמצב מלא כל הפרטים.', k: 'בְּמַצַּב חֲוָיָה יֵשׁ בַּיַּעַר פָּחוֹת מִלִּים, וּבְמַצַּב מָלֵא כָּל הַפְּרָטִים.' },
    { id: 'start.settings.4', at: '.set-row[data-row="again"]', expr: 'curious', f: 'שכחתם משהו? כאן אפשר לשמוע שוב את כל ההסברים.', k: 'שְׁכַחְתֶּם מַשֶּׁהוּ? כָּאן אֶפְשָׁר לִשְׁמֹעַ שׁוּב אֶת כָּל הַהֶסְבֵּרִים.' },
  ],
  'start:go': [
    { id: 'start.go.ask', expr: 'happy', f: 'רוצים ללכת לשם עכשיו?', k: 'רוֹצִים לָלֶכֶת לְשָׁם עַכְשָׁו?' },
    { id: 'start.go.2', at: '[data-learn="album"]', f: 'הנה אלבום הקלפים. לחצו כדי להיכנס!', k: 'הִנֵּה אַלְבּוֹם הַקְּלָפִים. לַחֲצוּ כְּדֵי לְהִכָּנֵס!' },
    { id: 'start.go.3', at: '[data-learn="keepforest"]', f: 'הנה משחקי הקלפים החדשים. לחצו ונשחק!', k: 'הִנֵּה מִשְׂחֲקֵי הַקְּלָפִים הַחֲדָשִׁים. לַחֲצוּ וּנְשַׂחֵק!' },
    { id: 'start.go.4', at: '[data-lab]', f: 'הנה המעבדה שלי. לחצו כדי להיכנס!', k: 'הִנֵּה הַמַּעְבָּדָה שֶׁלִּי. לַחֲצוּ כְּדֵי לְהִכָּנֵס!' },
    { id: 'start.go.5', at: '[data-research]', f: 'הנה חוקרי הטבע. תעלומות מחכות לכם!', k: 'הִנֵּה חוֹקְרֵי הַטֶּבַע. תַּעֲלוּמוֹת מְחַכּוֹת לָכֶם!' },
    { id: 'start.go.6', at: '[data-learn="expedition"]', f: 'הנה משלחת לעומק. צוללים עם הקלפים!', k: 'הִנֵּה מִשְׁלַחַת לָעֹמֶק. צוֹלְלִים עִם הַקְּלָפִים!' },
  ],
  'start:tips': [
    { id: 'start.again.1', expr: 'happy', f: 'אסביר שוב כל חלק כשתיכנסו אליו.', k: 'אַסְבִּיר שׁוּב כָּל חֵלֶק כְּשֶׁתִּכָּנְסוּ אֵלָיו.' },
  ],
};
