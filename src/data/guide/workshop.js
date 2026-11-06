// ניצוץ's words in his inventors' workshop (1.4.4 set 3). He speaks through the guide's bubbles (speaker 'nitzotz',
// src/ui/robo-guide.js). Since 6.11 he has a voice: Gemini TTS clips per id (tools/build-nitzotz-voice.py →
// src/data/nitzotz-voice.js); a new line without a clip is shown written only. ids start with "nz." (tools/check-sync.mjs
// does not ask them for a recording of רובו־דע). He is a character of an entrepreneur's enthusiasm (Avi, 5.11): eager, quick, makes up words,
// loves crazy ideas, speaks in the masculine, and to the child in the plural. { id, f, k (full nikud), at?, expr? }
// expr: happy | wow (he lights up) | think | proud | oops (a blown fuse) | excited | curious
// Keys: nztut:* the hands-on tutorials (src/ui/tutorials.js); nz:react:* his reactions (one line is picked).
export const NITZ_GUIDE = {
  // ── the room, the first visit
  'nztut:hello': [
    { id: 'nz.hello.1', expr: 'wow', f: 'בזזזט! הנה אתם! אני ניצוץ, ופה הסדנה שלי. כאן ממציאים!', k: 'בְּזזזט! הִנֵּה אַתֶּם! אֲנִי נִיצוֹץ, וּפֹה מַמְצִיאִים!' },
    { id: 'nz.hello.2', expr: 'excited', f: 'כל רעיון מדליק אותי. רעיון חכם, רעיון מצחיק, רעיון משוגע. כולם!', k: 'כָּל רַעְיוֹן מַדְלִיק אוֹתִי. חָכָם, מַצְחִיק, מְשֻׁגָּע. כֻּלָּם!' },
  ],
  'nztut:board': [
    { id: 'nz.board.1', expr: 'proud', at: '.ws-board', f: 'זה לוח שיטות החשיבה. כל שיטה שתנסו, כמו לפשט או לשפר גרסה, ממלאת פס.', k: 'זֶה לוּחַ שִׁיטוֹת הַחֲשִׁיבָה. כָּל שִׁיטָה שֶׁתְּנַסּוּ מְמַלֵּאת פַּס.' },
    { id: 'nz.board.2', expr: 'happy', f: 'להיות יצירתי זה כמו שריר. מתאמנים, והוא גדל. ואני? אני מאיר יותר!', k: 'כְּכָל שֶׁמִּתְאַמְּנִים, אֲנִי מֵאִיר יוֹתֵר!' },
  ],
  'nztut:look': [
    { id: 'nz.look.1', expr: 'happy', at: '.wr3-turn.r', f: 'זו הסדנה שלי, למעלה בין צמרות יער הגשם! גררו את החדר או לחצו על החצים כדי להסתובב.', k: 'זוֹ הַסַּדְנָה שֶׁלִּי, בֵּין הָעֵצִים! גִּרְרוּ אוֹ לַחֲצוּ עַל הַחִצִּים.' },
  ],
  'nztut:go': [
    { id: 'nz.go.1', expr: 'excited', at: '.ws-st[data-st=machine]', f: 'מתחילים במכונת הרעיונות! לחצו עליה.', k: 'מַתְחִילִים בִּמְכוֹנַת הָרַעְיוֹנוֹת! לַחֲצוּ עָלֶיהָ.' },
  ],
  // ── the idea machine
  'nzmach:thing': [
    { id: 'nz.mach.thing.1', expr: 'happy', at: '.wm-things', f: 'קודם שמים במכונה חפץ. בחרו אחד, כל אחד!', k: 'שָׂמִים בַּמְּכוֹנָה חֵפֶץ. בַּחֲרוּ אֶחָד!' },
  ],
  'nzmach:lever': [
    { id: 'nz.mach.lever.1', expr: 'excited', at: '.wm-levers', f: 'עכשיו מושכים בידית. כל ידית משנה את החפץ בדרך אחרת. משכו!', k: 'עַכְשָׁו מוֹשְׁכִים בַּיָּדִית. מִשְׁכוּ!' },
  ],
  'nzmach:rate': [
    { id: 'nz.mach.rate.1', expr: 'curious', at: '.wm-rate', f: 'יצאה המצאה! מה דעתכם? עובד, מצחיק, או שווה לשפר?', k: 'יָצְאָה הַמְצָאָה! עוֹבֵד, מַצְחִיק, אוֹ שָׁוֶה לְשַׁפֵּר?' },
  ],
  'nzmach:end': [
    { id: 'nz.mach.end.1', expr: 'wow', f: 'זהו! אותו חפץ, ידית אחרת, והמצאה חדשה לגמרי. נסו את כולן!', k: 'אוֹתוֹ חֵפֶץ, יָדִית אַחֶרֶת, הַמְצָאָה חֲדָשָׁה!' },
  ],
  // ── the nature mixer
  'nzmix:spin': [
    { id: 'nz.mix.spin.1', expr: 'excited', at: '.wx-spin', f: 'מערבל הטבע! גלגל של יצורים, גלגל של בעיות. סובבו!', k: 'גַּלְגַּל שֶׁל יְצוּרִים, גַּלְגַּל שֶׁל בְּעָיוֹת. סוֹבְבוּ!' },
  ],
  'nzmix:pick': [
    { id: 'nz.mix.pick.1', expr: 'think', at: '.wx-traits', f: 'איך היצור הזה יכול לפתור את הבעיה? בחרו את התכונה שלו שתעזור.', k: 'אֵיזוֹ תְּכוּנָה שֶׁל הַיְּצוּר תַּעֲזֹר? בַּחֲרוּ.' },
  ],
  'nzmix:end': [
    { id: 'nz.mix.end.1', expr: 'proud', f: 'ככה ממציאים אמיתיים עובדים: מסתכלים על הטבע ושואלים "איך הוא עושה את זה?"', k: 'מַמְצִיאִים מִסְתַּכְּלִים עַל הַטֶּבַע וְשׁוֹאֲלִים: אֵיךְ הוּא עוֹשֶׂה אֶת זֶה?' },
  ],
  // ── the constraint cards
  'nzcard:draw': [
    { id: 'nz.card.draw.1', expr: 'excited', at: '.wc-draw', f: 'קלפי אילוץ! כל קלף נותן משימה קצרה עם שעון. שלפו קלף!', k: 'כָּל קְלָף נוֹתֵן מְשִׂימָה קְצָרָה. שִׁלְפוּ קְלָף!' },
  ],
  'nzcard:end': [
    { id: 'nz.card.end.1', expr: 'wow', f: 'מגבלה בכלל לא מפריעה לרעיונות. היא מוציאה אותם החוצה!', k: 'מִגְבָּלָה עוֹזֶרֶת לִמְצֹא רַעְיוֹנוֹת!' },
  ],
  // ── reactions (one is picked each time)
  'nz:react:works': [
    { id: 'nz.r.works.1', expr: 'proud', f: 'עובד! את זה אפשר לבנות!', k: 'עוֹבֵד! אֶת זֶה בּוֹנִים!' },
    { id: 'nz.r.works.2', expr: 'wow', f: 'בזזט! רעיון שעובד, הנורה שלי מתחממת!', k: 'בְּזזט! רַעְיוֹן שֶׁעוֹבֵד!' },
    { id: 'nz.r.works.3', expr: 'happy', f: 'מעולה! רושם בפנקס הרעיונות.', k: 'מְעֻלֶּה! רוֹשֵׁם בַּפִּנְקָס.' },
  ],
  'nz:react:funny': [
    { id: 'nz.r.funny.1', expr: 'excited', f: 'חחח! זה הולך ישר לתיבת השיגעונות!', k: 'חַחַח! לְתֵבַת הַשִּׁגְעוֹנוֹת!' },
    { id: 'nz.r.funny.2', expr: 'oops', f: 'זה כל כך משוגע, שנשרף לי הפיוז. רגע... חזרתי!', k: 'נִשְׂרַף לִי הַפְּיוּז! רֶגַע... חָזַרְתִּי!' },
    { id: 'nz.r.funny.3', expr: 'excited', f: 'משוגע לגמרי. בדיוק כמו שאני אוהב!', k: 'מְשֻׁגָּע לְגַמְרֵי! אוֹהֵב!' },
  ],
  'nz:react:improve': [
    { id: 'nz.r.improve.1', expr: 'think', f: 'שווה לשפר! נסו את אותו חפץ עם ידית אחרת.', k: 'שָׁוֶה לְשַׁפֵּר! נַסּוּ יָדִית אַחֶרֶת.' },
    { id: 'nz.r.improve.2', expr: 'think', f: 'גרסה ב׳ בדרך! ממציאים טובים אף פעם לא עוצרים בגרסה הראשונה.', k: 'גִּרְסָה ב׳ בַּדֶּרֶךְ!' },
  ],
  'nz:react:good': [
    { id: 'nz.r.good.1', expr: 'wow', f: 'בול! בדיוק ככה הטבע פותר את זה!', k: 'בּוּל! כָּךְ הַטֶּבַע פּוֹתֵר אֶת זֶה!' },
    { id: 'nz.r.good.2', expr: 'proud', f: 'יש! הטבע המציא את זה קודם, ואתם גיליתם!', k: 'יֵשׁ! גִּלִּיתֶם אֶת הַסּוֹד שֶׁל הַטֶּבַע!' },
  ],
  'nz:react:ok': [
    { id: 'nz.r.ok.1', expr: 'happy', f: 'כמעט! זה יעזור קצת. אולי יש תכונה שתעזור עוד יותר?', k: 'כִּמְעַט! אוּלַי תְּכוּנָה אַחֶרֶת?' },
  ],
  'nz:react:wild': [
    { id: 'nz.r.wild.1', expr: 'excited', f: 'רעיון פרוע! אף אחד עוד לא חשב על זה. נקודת מקוריות!', k: 'רַעְיוֹן פָּרוּעַ! נְקֻדַּת מְקוֹרִיּוּת!' },
    { id: 'nz.r.wild.2', expr: 'curious', f: 'הממ, משונה... אבל אולי דווקא זה יעבוד? רשמתי!', k: 'מְשֻׁנֶּה... אֲבָל אוּלַי? רָשַׁמְתִּי!' },
  ],
  'nz:react:roundwin': [
    { id: 'nz.r.win.1', expr: 'wow', f: 'עמדתם בקלף! הניצוצות עפים!', k: 'עֲמַדְתֶּם בַּקְּלָף!' },
    { id: 'nz.r.win.2', expr: 'proud', f: 'זה היה מהיר! עוד קלף?', k: 'מָהִיר! עוֹד קְלָף?' },
  ],
  'nz:react:roundlose': [
    { id: 'nz.r.lose.1', expr: 'happy', f: 'הזמן נגמר, אבל כל הרעיונות נשמרו. עוד סיבוב?', k: 'הַזְּמַן נִגְמַר. הָרַעְיוֹנוֹת נִשְׁמְרוּ!' },
  ],
  // ── set 4: the build table, the test hall, the orders
  'nzbuild:pick': [
    { id: 'nz.build.pick.1', expr: 'excited', at: '.wb-drawer', f: 'שולחן הבנייה! בוחרים צורה, חומר, ועד ארבע תוספות. נסו להוסיף משהו מהטבע!', k: 'בּוֹחֲרִים צוּרָה, חֹמֶר, וְתוֹסָפוֹת. נַסּוּ מַשֶּׁהוּ מֵהַטֶּבַע!' },
  ],
  'nzbuild:go': [
    { id: 'nz.build.go.1', expr: 'wow', at: '.wb-go', f: 'מוכן? לוקחים אותו לאולם הבדיקות!', k: 'לוֹקְחִים אוֹתוֹ לִבְדִיקָה!' },
  ],
  'nztest:run': [
    { id: 'nz.test.run.1', expr: 'think', at: '.wt-stations', f: 'שש עמדות בדיקה. לחצו על עמדה, או על "כל הבדיקות".', k: 'לַחֲצוּ עַל עֶמְדָּה, אוֹ "לִבְדֹּק הַכֹּל".' },
  ],
  'nztest:end': [
    { id: 'nz.test.end.1', expr: 'excited', f: 'נכשל? מעולה! עכשיו יודעים מה לשפר. כל ממציא נכשל הרבה לפני שזה עובד.', k: 'נִכְשַׁל? מְעֻלֶּה! עַכְשָׁו יוֹדְעִים מָה לְשַׁפֵּר.' },
  ],
  'nzord:pick': [
    { id: 'nz.ord.pick.1', expr: 'proud', at: '.wo-board', f: 'לקוחות! מהעולם שלנו ומהאיים. כל הזמנה היא בעיה אמיתית. בחרו אחת.', k: 'לָקוֹחוֹת! כָּל הַזְמָנָה הִיא בְּעָיָה. בַּחֲרוּ אַחַת.' },
  ],
  // ── ממציא צעיר (6.11): the beginners' walk, from an order to a certificate in three steps
  'nzkids:pick': [
    { id: 'nz.kids.pick.1', expr: 'proud', at: '.wo-board', f: 'לקוחות! כל פתק הוא בעיה קטנה. בחרו פתק אחד.', k: 'לָקוֹחוֹת! כָּל פֶּתֶק הוּא בְּעָיָה קְטַנָּה. בַּחֲרוּ פֶּתֶק אֶחָד.' },
  ],
  'nzkids:go': [
    { id: 'nz.kids.go.1', expr: 'excited', at: '.wo-go', f: 'יש לנו לקוח! לחצו "בונים!".', k: 'יֵשׁ לָנוּ לָקוֹחַ! לַחֲצוּ "בּוֹנִים!".' },
  ],
  'nzkids:shape': [
    { id: 'nz.kids.shape.1', expr: 'happy', at: '.wb-items', f: 'קודם צורה. איזו צורה תתאים?', k: 'קֹדֶם צוּרָה. אֵיזוֹ צוּרָה תַּתְאִים?' },
  ],
  'nzkids:nature': [
    { id: 'nz.kids.nature.1', expr: 'wow', at: '.wb-tabs [data-wbtab=nature]', f: 'עכשיו רעיון מהטבע! לחצו כאן ובחרו חיה או צמח.', k: 'עַכְשָׁו רַעְיוֹן מֵהַטֶּבַע! לַחֲצוּ כָּאן וּבַחֲרוּ חַיָּה אוֹ צֶמַח.' },
  ],
  'nzkids:check': [
    { id: 'nz.kids.check.1', expr: 'excited', at: '.wb-go', f: 'את השאר אני מוסיף. לחצו "לבדוק!".', k: 'אֶת הַשְּׁאָר אֲנִי מוֹסִיף. לַחֲצוּ "לִבְדֹּק!".' },
  ],
  'nz:react:patent': [
    { id: 'nz.r.patent.1', expr: 'wow', f: 'בזזזט! פטנט! השם שלכם רשום עכשיו בספר הממציאים!', k: 'פָּטֶנְט! אַתֶּם מַמְצִיאִים!' },
    { id: 'nz.r.patent.2', expr: 'excited', f: 'חותמת, תעודה, והכול! תביאו אותו ליריד!', k: 'תְּעוּדָה! בּוֹאוּ לַיָּרִיד!' },
  ],
  'nz:react:record': [
    { id: 'nz.r.record.1', expr: 'wow', f: 'שיא חדש! שברתם את השיא של עצמכם!', k: 'שִׂיא חָדָשׁ!' },
  ],
};
