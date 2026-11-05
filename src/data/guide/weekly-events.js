// The weekly events' tutorials (1.4.4 sets 5–6): קוּבִּי leads them, in writing only (Avi, 4.11: no new recordings of
// קוּבִּי in this version). Ids start with "kw." (tools/check-sync.mjs does not ask them for a voice).
// { id, f, k (full nikud), at?, expr? }
export const WEEK_EVENT_GUIDE = {
  'gltut:oops': [
    { id: 'kw.gl.oops.1', expr: 'oops', f: 'אופס. לחצתי על הכפתור האדום, ויצורים מכל הסביבות נחתו על אי אחד!', k: 'אוּפְּס! לָחַצְתִּי עַל הַכַּפְתּוֹר הָאָדֹם, וִיצוּרִים נָחֲתוּ בַּמָּקוֹם הַלֹּא נָכוֹן!' },
    { id: 'kw.gl.oops.2', expr: 'curious', f: 'כל יצור צריך את הבית שלו. מחוץ לבית הוא נחלש לאט. עזרו לי להשיב אותם הביתה!', k: 'כָּל יְצוּר צָרִיךְ אֶת הַבַּיִת שֶׁלּוֹ. עִזְרוּ לִי!' },
  ],
  'gltut:pick': [
    { id: 'kw.gl.pick.1', expr: 'normal', at: '.wg-island', f: 'בחרו יצור. הטבעת סביבו מראה כמה כוח נשאר לו.', k: 'בַּחֲרוּ יְצוּר.' },
  ],
  'gltut:gate': [
    { id: 'kw.gl.gate.1', expr: 'happy', at: '.wg-gates', f: 'עכשיו שער. ואם הוא כבר בבית, בוחרים "נשאר כאן".', k: 'עַכְשָׁו שַׁעַר. וְאִם הוּא בַּבַּיִת: "נִשְׁאָר כָּאן".' },
  ],
  'jartut:jar': [
    { id: 'kw.jar.jar.1', expr: 'curious', f: 'צנצנת סגורה היא עולם קטן. צמחים עושים אוויר, בעלי חיים אוכלים, ומנקים הופכים את הפסולת שוב למזון לצמחים.', k: 'צְמָחִים עוֹשִׂים אֲוִיר, חַיּוֹת אוֹכְלוֹת, וּמְנַקִּים מְנַקִּים.' },
  ],
  'jartut:pick': [
    { id: 'kw.jar.pick.1', expr: 'normal', at: '.wj-shelf', f: 'בחרו יצורים מהמדף. שימו לב מה כל אחד עושה במעגל.', k: 'בַּחֲרוּ יְצוּרִים מֵהַמַּדָּף.' },
  ],
  'jartut:seal': [
    { id: 'kw.jar.seal.1', expr: 'wow', at: '.wj-seal', f: 'מוכנים? סוגרים את המכסה. מעכשיו לא נוגעים, וכל יום תראו מה קרה.', k: 'סוֹגְרִים אֶת הַמִּכְסֶה. כָּל יוֹם תִּרְאוּ מָה קָרָה.' },
  ],
};
