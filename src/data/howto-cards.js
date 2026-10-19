// "איך משחקים" cards (src/ui/howto.js): four short cards per place, each a card painting and one sentence.
// Beginners (מתחילים, ages 6 to 8) read them fully vocalised (ניקוד מלא). The pictures come from the caller's own tables
// (CARD_ART for a zone, LAB_ART for the lab), so this module holds words only.

const ZONE = {
  amazon: { place: 'היער', pic: ['kapok', 'fern', 'toucan', 'hummingbird'],
    second: { title: 'המאבק על האור', text: 'ביער הגשם כל צמח נאבק על אור, וצמחים שאוהבים צל גדלים טוב מתחת לעצים הגבוהים.' },
    kidsSecond: { title: 'כֻּלָּם רוֹצִים אוֹר', text: 'בְּיַעַר הַגֶּשֶׁם כָּל צֶמַח רוֹצֶה אוֹר. יֵשׁ צְמָחִים שֶׁאוֹהֲבִים צֵל.' } },
  grove: { place: 'החורש', pic: ['oak', 'cyclamen', 'hoopoe', 'gazelle'],
    second: { title: 'העונות קובעות', text: 'בחורש יש חורף גשום וקיץ יבש, ובכל עונה פורחים, אוכלים וחוסכים מים אחרת.' },
    kidsSecond: { title: 'עוֹנוֹת הַשָּׁנָה', text: 'בַּחֹרֶף יוֹרֵד גֶּשֶׁם, וּבַקַּיִץ חַם וְיָבֵשׁ. כָּל עוֹנָה מְשַׁנָּה אֶת הַחֹרֶשׁ.' } },
  reef: { place: 'השונית', pic: ['branching', 'clownfish', 'nursery', 'turtle'],
    first: 'גוררים אלמוג, דג או צמח ים מהמגש שלמטה, ומשחררים במקום שבו הטבעת ירוקה.',
    second: { title: 'שותפים בשונית', text: 'בשונית כמעט כולם חיים בשותפות, ולחיצה על מין מראה מי עוזר למי.' },
    third: { title: 'משתלת אלמוגים', text: 'בלשונית "טכנולוגיה" יש משתלת אלמוגים, ורק בה גדלים אלמוגים חזקים שמלבינים פחות בחום.' },
    kidsSecond: { title: 'חֲבֵרִים בַּשּׁוּנִית', text: 'בַּשּׁוּנִית כִּמְעַט כֻּלָּם עוֹזְרִים זֶה לָזֶה. מִי עוֹזֵר לְמִי?' } },
};

export const HOWTO_LABELS = { full: { title: 'איך משחקים?' }, kids: { title: 'אֵיךְ מְשַׂחֲקִים?', next: 'הַבָּא', done: 'מַתְחִילִים!', skip: 'דַּלְּגוּ' } };

/** the cards for a zone; art(id) gives a picture for a species or device id */
export function zoneHowto(zoneId, kids, art) {
  const Z = ZONE[zoneId]; if (!Z) return [];
  const img = (i) => art(Z.pic[i]) || '';
  if (kids) {
    return [
      { img: img(0), title: 'גּוֹרְרִים וּמְשַׁחְרְרִים', text: 'גִּרְרוּ צֶמַח אוֹ בַּעַל חַיִּים מֵהַמַּגָּשׁ, וְשַׁחְרְרוּ כְּשֶׁהַטַּבַּעַת יְרֻקָּה.' },
      { img: img(1), ...Z.kidsSecond },
      { img: img(2), title: 'לוֹחֲצִים וּמַכִּירִים', text: 'לַחֲצוּ עַל צֶמַח אוֹ עַל בַּעַל חַיִּים, וְתִרְאוּ מָה הוּא צָרִיךְ.' },
      { img: img(3), title: 'מְשִׂימוֹת', text: 'כָּל מְשִׂימָה פּוֹתַחַת דְּבָרִים חֲדָשִׁים. מֻתָּר לְנַסּוֹת וּמֻתָּר לִטְעוֹת!' },
    ];
  }
  return [
    { img: img(0), title: 'שותלים בגרירה', text: Z.first || 'גוררים צמח או בעל חיים מהמגש שלמטה, ומשחררים במקום שבו הטבעת ירוקה.' },
    { img: img(1), ...Z.second },
    Z.third ? { img: img(2), ...Z.third } : { img: img(2), title: 'לוחצים ומכירים', text: 'לחצו על צמח כדי להכיר אותו, ואם הוא לא במקום טוב, גררו אותו למקום אחר.' },
    { img: img(3), title: 'משימות וניסיונות', text: 'המשימות פותחות מינים וכלים חדשים, ומותר לנסות דרכים שונות, לטעות ולנסות שוב.' },
  ];
}

/** the cards for the lab of רובו־דע; pic(station) gives the station's rendered picture */
export function labHowto(kids, pic) {
  if (kids) {
    return [
      { img: pic('greenhouse'), title: 'הַמַּעְבָּדָה שֶׁל רוֹבּוֹ־דַּע', text: 'גִּרְרוּ כְּדֵי לְהִסְתַּכֵּל מִסָּבִיב, וְלַחֲצוּ עַל נְקֻדָּה כְּתֻמָּה כְּדֵי לְהִכָּנֵס.' },
      { img: pic('scope'), title: 'הַמִּיקְרוֹסְקוֹפּ', text: 'בַּמִּיקְרוֹסְקוֹפּ מַגְדִּילִים דְּבָרִים קְטַנִּים וּמְחַפְּשִׂים סוֹדוֹת.' },
      { img: pic('table'), title: 'שֻׁלְחַן הַמַּמְצִיאִים', text: 'כָּאן פּוֹתְרִים בְּעָיוֹת בְּעֶזְרַת הַטֶּבַע. מֻתָּר לִטְעוֹת!' },
      { img: pic('aquarium'), title: 'נִסּוּיִים', text: 'בַּחֲמָמָה וּבָאַקְוַרְיוּם עוֹשִׂים נִסּוּיִים קְטַנִּים.' },
    ];
  }
  return [
    { img: pic('greenhouse'), title: 'המעבדה של רובו־דע', text: 'גוררים כדי להסתכל מסביב, ולוחצים על נקודה כתומה כדי להיכנס לתחנה.' },
    { img: pic('scope'), title: 'המיקרוסקופ', text: 'מגדילים דגימה, מסובבים את כפתור החדות ומחפשים בה דברים קטנים ומפתיעים.' },
    { img: pic('table'), title: 'שולחן הממציאים', text: 'פותרים בעיות בעזרת רעיונות מבעלי חיים ומצמחים, ומותר לטעות ולנסות שוב.' },
    { img: pic('aquarium'), title: 'אקווריום, חממה וארון', text: 'עושים בהם ניסויים קטנים, ובכל אחד יש כמה דרכים וכמה סופים.' },
  ];
}
