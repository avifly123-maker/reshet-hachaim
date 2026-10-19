// תגים: the prizes of the expert missions, the inventors game, the deep expedition, the lab and the mysteries
// (no card packs: the album already gets plenty). Each badge is drawn as a medallion around a card painting.
// earn: 'mission:<id>' (an expert mission in a zone) | 'inv:<key>' (הממציאים; 'inv:theme:<shelf>' a whole shelf) | 'deep:<key>' (משלחת לעומק)
//       | 'lab:<key>' (the lab of רובו־דע) | 'research:<key>' (חוקרי הטבע)
// art: a CARD_ART key (the card painting inside the medallion)
// Frames for the album cards open when a player has enough badges of a group (FRAMES).

export const BADGE_GROUPS = [
  { id: 'amazon', name: 'יער הגשם של האמזונס', short: 'אמזונס', col: '#2f7a4a', col2: '#e8c050' },
  { id: 'grove', name: 'החורש הארץ־ישראלי', short: 'חורש', col: '#8a6a2a', col2: '#e8202a' },
  { id: 'reef', name: 'שונית האלמוגים של אילת', short: 'שונית', col: '#1f7a9a', col2: '#f08a24' },
  { id: 'lab', name: 'הממציאים והמעבדה', short: 'מעבדה', col: '#5a4a8a', col2: '#f6cf72' },
  { id: 'deep', name: 'משלחת לעומק', short: 'משלחת', col: '#163a5a', col2: '#6fd0ff' },
  { id: 'research', name: 'חוקרי הטבע', short: 'חוקרים', col: '#3a5a2a', col2: '#f6cf72' },
];

export const BADGES = [
  // ── expert missions (src/data/<zone>.js, ids ax*, gx*, rx*: open after the regular missions)
  { id: 'b_ax1', group: 'amazon', art: 'harpy', name: 'שומר החופה', how: 'משימת מומחים "גג היער" באמזונס', earn: 'mission:ax1' },
  { id: 'b_ax2', group: 'amazon', art: 'kapok', name: 'פותח החלונות', how: 'משימת מומחים "לפנות מקום לאור" באמזונס', earn: 'mission:ax2' },
  { id: 'b_ax3', group: 'amazon', art: 'agouti', name: 'שותף האגוזים', how: 'משימת מומחים "שרשרת האגוז" באמזונס', earn: 'mission:ax3' },
  { id: 'b_ax4', group: 'amazon', art: 'jaguar', name: 'מאזן הטורפים', how: 'משימת מומחים "יער בלי רעב" באמזונס', earn: 'mission:ax4' },
  { id: 'b_gx1', group: 'grove', art: 'oak', name: 'מחדש החורש', how: 'משימת מומחים "דור חדש של אלונים" בחורש', earn: 'mission:gx1' },
  { id: 'b_gx2', group: 'grove', art: 'jay', name: 'שותל בלי ידיים', how: 'משימת מומחים "העורבני שותל" בחורש', earn: 'mission:gx2' },
  { id: 'b_gx3', group: 'grove', art: 'owl', name: 'שומר הלילה', how: 'משימת מומחים "לילה שקט" בחורש', earn: 'mission:gx3' },
  { id: 'b_gx4', group: 'grove', art: 'cyclamen', name: 'ארבע עונות', how: 'משימת מומחים "שנה שלמה" בחורש', earn: 'mission:gx4' },
  { id: 'b_rx1', group: 'reef', art: 'brain', name: 'בונה השונית', how: 'משימת מומחים "שונית מחדש" בשונית', earn: 'mission:rx1' },
  { id: 'b_rx2', group: 'reef', art: 'parrotfish', name: 'רועה האצות', how: 'משימת מומחים "אצות במידה" בשונית', earn: 'mission:rx2' },
  { id: 'b_rx3', group: 'reef', art: 'cleaner', name: 'מנהל התחנה', how: 'משימת מומחים "תחנת ניקוי עמוסה" בשונית', earn: 'mission:rx3' },
  { id: 'b_rx4', group: 'reef', art: 'turtle', name: 'מים צלולים', how: 'משימת מומחים "השונית שורדת חום" בשונית', earn: 'mission:rx4' },
  // ── הממציאים (src/learn/games/inventors.js) and the lab
  { id: 'b_inv1', group: 'lab', art: 'reefshark', name: 'הפטנט הראשון', how: 'ממציאים המצאה ראשונה במשחק "הממציאים"', earn: 'inv:first' },
  { id: 'b_inv5', group: 'lab', art: 'owl', name: 'ממציא חרוץ', how: 'חמש המצאות שונות ב"הממציאים"', earn: 'inv:five' },
  { id: 'b_invfail', group: 'lab', art: 'sloth', name: 'ממציא עקשן', how: 'עשרה ניסיונות שלא הצליחו, ולא ויתרתם', earn: 'inv:stubborn' },
  { id: 'b_invwild', group: 'lab', art: 'octopus', name: 'רעיון מפתיע', how: 'שילוב מפתיע שרובו־דע לא האמין שיעבוד', earn: 'inv:wild' },
  { id: 'b_invall', group: 'lab', art: 'hummingbird', name: 'מעבדה מלאה', how: 'כל הבעיות ב"הממציאים" נפתרו', earn: 'inv:all' },
  { id: 'b_scope', group: 'lab', art: 'honeybee', name: 'עין חדה', how: 'מוצאים את כל מה שמסתתר במיקרוסקופ', earn: 'lab:scope' },
  // ── חושבים כמו חוקרים (src/lab/thinking.js): one habit of scientific thinking each
  { id: 'b_fair', group: 'lab', art: 'sage', name: 'ניסוי הוגן', how: 'בחממה: מגלים מה עושים האור, המים והאדמה, כל אחד בניסוי הוגן', earn: 'lab:fair' },
  { id: 'b_float', group: 'lab', art: 'plankton', name: 'הופתעתי!', how: 'באקווריום: מנחשים לפני שבודקים, עד שלוש הפתעות', earn: 'lab:float' },
  // retired in 1.3.1 (Avi: the wobbly scale game was removed); kept so a badge already earned stays, shown only to who has it
  { id: 'b_measure', group: 'lab', art: 'pine', name: 'מודדים שוב', how: 'בארון האוסף: שלוש פעמים קרוב בעזרת המדידה האמצעית', earn: 'lab:measure', retired: true },
  { id: 'b_observe', group: 'lab', art: 'gazelle', name: 'עין של חוקר', how: 'בארון האוסף: מפרידים בין מה שראינו למה שחשבנו, ובודקים', earn: 'lab:observe' },
  { id: 'b_cause', group: 'lab', art: 'mushroom', name: 'ביחד או בגלל', how: 'בחדר: מגלים בניסוי מה גורם למה', earn: 'lab:cause' },
  { id: 'b_thinker', group: 'lab', art: 'firefly', name: 'חושבים כמו חוקרים', how: 'כל ארבעת הניסויים של רובו־דע', earn: 'lab:thinker' },
  // the station worlds (src/lab/aquarium.js, greenhouse.js, cabinet.js)
  { id: 'b_minireef', group: 'lab', art: 'clownfish', name: 'שונית בקופסה', how: 'באקווריום: שונית קטנה שכולם מוצאים בה בית ואוכל', earn: 'lab:minireef' },
  { id: 'b_night', group: 'lab', art: 'moray', name: 'משמרת לילה', how: 'באקווריום: שמונה גילויים של יום ולילה, חום ושמש', earn: 'lab:night' },
  { id: 'b_grow', group: 'lab', art: 'honeybee', name: 'גנן חוקר', how: 'בחממה: מגדלים חמנייה ומגיעים לארבעה סופים שונים', earn: 'lab:grow' },
  { id: 'b_seeds', group: 'lab', art: 'terebinth', name: 'זרעים מטיילים', how: 'בחממה: זרע שמגיע רחוק בכל אחת מארבע הבדיקות', earn: 'lab:seeds' },
  { id: 'b_collect', group: 'lab', art: 'blackbird', name: 'אספן', how: 'בארון האוסף: עשרים דברים על המדפים', earn: 'lab:collect' },
  { id: 'b_sort', group: 'lab', art: 'starfish', name: 'ממיין חכם', how: 'בארון האוסף: רובו־דע מנחש את הכלל שלכם, ואתם מנחשים את שלו', earn: 'lab:sort' },
  { id: 'b_clues', group: 'lab', art: 'fox', name: 'עקבות ורמזים', how: 'בארון האוסף: מגלים מי השאיר שמונה רמזים', earn: 'lab:clues' },
  // 1.3.1: the bigger cabinet games
  { id: 'b_cluesall', group: 'lab', art: 'jaguar', name: 'בלש הטבע', how: 'בארון האוסף: כל הרמזים בשלושת האזורים פוענחו', earn: 'lab:clues-all' },
  { id: 'b_sortrules', group: 'lab', art: 'hermit', name: 'הרבה דרכים למיין', how: 'בארון האוסף: ממיינים לפי שישה כללים שונים', earn: 'lab:sortrules' },
  { id: 'b_observeall', group: 'lab', art: 'sloth', name: 'בודקים כל מחשבה', how: 'בארון האוסף: כל הממצאים של "ראינו או חשבנו?" נבדקו', earn: 'lab:observe-all' },
  // the big inventors update (1.3): more inventions, combinations, the shelves (THEMES in src/data/inventions.js), research questions
  { id: 'b_inv10', group: 'lab', art: 'leafcutter', name: 'עשר המצאות', how: 'עשר המצאות שונות ב"הממציאים"', earn: 'inv:ten' },
  { id: 'b_inv25', group: 'lab', art: 'tortoise', name: 'ממציא ותיק', how: 'עשרים וחמש המצאות שונות ב"הממציאים"', earn: 'inv:many' },
  { id: 'b_invpair', group: 'lab', art: 'goby', name: 'שניים יחד', how: 'פותרים בעיה ששני קלפים, עם שתי תכונות, פותרים יחד', earn: 'inv:pair' },
  { id: 'b_thwater', group: 'lab', art: 'shrimp', name: 'ממציא המים', how: 'כל הבעיות במדף "מים וים"', earn: 'inv:theme:water' },
  { id: 'b_thair', group: 'lab', art: 'fruitbat', name: 'ממציא האוויר', how: 'כל הבעיות במדף "באוויר"', earn: 'inv:theme:air' },
  { id: 'b_thbuild', group: 'lab', art: 'brazilnut', name: 'בונה מהטבע', how: 'כל הבעיות במדף "בנייה"', earn: 'inv:theme:build' },
  { id: 'b_thmatter', group: 'lab', art: 'morpho', name: 'מומחה החומרים', how: 'כל הבעיות במדף "חומרים"', earn: 'inv:theme:matter' },
  { id: 'b_throbots', group: 'lab', art: 'agama', name: 'בונה הרובוטים', how: 'כל הבעיות במדף "רובוטים"', earn: 'inv:theme:robots' },
  { id: 'b_thenergy', group: 'lab', art: 'firefly', name: 'אור מהטבע', how: 'כל הבעיות במדף "אור ושמש"', earn: 'inv:theme:energy' },
  { id: 'b_thhealth', group: 'lab', art: 'dartfrog', name: 'מרפא מהטבע', how: 'כל הבעיות במדף "רפואה"', earn: 'inv:theme:health' },
  { id: 'b_thnets', group: 'lab', art: 'harvesterant', name: 'חכמת הנמלים', how: 'כל הבעיות במדף "רשתות"', earn: 'inv:theme:nets' },
  { id: 'b_q5', group: 'lab', art: 'toucan', name: 'שואל שאלות', how: 'חמש שאלות חקר באטלס של המעבדה קיבלו תשובה', earn: 'lab:q5' },
  { id: 'b_q20', group: 'lab', art: 'kinkajou', name: 'חוקר סקרן', how: 'עשרים שאלות חקר קיבלו תשובה', earn: 'lab:q20' },
  { id: 'b_qall', group: 'lab', art: 'mushroom', name: 'כל השאלות', how: 'כל שאלות החקר באטלס קיבלו תשובה', earn: 'lab:qall' },
  { id: 'b_qopen', group: 'lab', art: 'coati', name: 'שאלה פתוחה', how: 'חוקרים שאלה שגם המדענים עוד לא פתרו', earn: 'lab:open' },
  // ── משלחת לעומק (src/learn/games/expedition.js)
  { id: 'b_deep1', group: 'deep', art: 'clownfish', name: 'צוללן מתחיל', how: 'חוזרים בשלום ממשלחת ראשונה', earn: 'deep:first' },
  { id: 'b_deepcave', group: 'deep', art: 'moray', name: 'אל המערה', how: 'מגיעים עם הצוות עד המערה', earn: 'deep:cave' },
  { id: 'b_deepfull', group: 'deep', art: 'grouper', name: 'כולם חזרו', how: 'חוזרים מהעומק בלי לאבד אף קלף מהצוות', earn: 'deep:full' },
  { id: 'b_deep20', group: 'deep', art: 'jellyfish', name: 'אספן דגימות', how: 'מביאים למעבדה 20 דגימות בסך הכול', earn: 'deep:samples' },
  { id: 'b_deeprare', group: 'deep', art: 'stingray', name: 'גילוי נדיר', how: 'מוצאים בעומק את הממצא הנדיר', earn: 'deep:rare' },
  // ── חוקרי הטבע
  { id: 'b_rs1', group: 'research', art: 'spinymouse', name: 'חוקר צעיר', how: 'פותרים תעלומה ראשונה', earn: 'research:first' },
  { id: 'b_rs3', group: 'research', art: 'butterflyfish', name: 'שלושה כוכבים', how: 'תעלומה עם שלושה כוכבים', earn: 'research:stars' },
  { id: 'b_rsall', group: 'research', art: 'hoopoe', name: 'בלש הטבע', how: 'כל התעלומות נפתרו', earn: 'research:all' },
  { id: 'b_rsodd', group: 'research', art: 'chameleon', name: 'דרך משלכם', how: 'פותרים תעלומה בדרך שאינה הדרך הרגילה', earn: 'research:other' },
];

// card frames for the album: a group's frame opens with `need` of its badges ('all': badges of any group)
export const FRAMES = [
  { id: 'none', name: 'בלי מסגרת', need: 0, group: null },
  { id: 'leaf', name: 'עלי יער הגשם', need: 2, group: 'amazon' },
  { id: 'oak', name: 'ענפי אלון', need: 2, group: 'grove' },
  { id: 'coral', name: 'אלמוגים', need: 2, group: 'reef' },
  { id: 'brass', name: 'פליז של ממציאים', need: 2, group: 'lab' },
  { id: 'deep', name: 'מעמקי הים', need: 2, group: 'deep' },
  { id: 'gold', name: 'זהב', need: 12, group: 'all' },
];

export const badgeById = (id) => BADGES.find((b) => b.id === id) || null;
export const badgesFor = (earn) => BADGES.filter((b) => b.earn === earn);
