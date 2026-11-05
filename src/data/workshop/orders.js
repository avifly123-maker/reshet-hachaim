// הזמנות עבודה (1.4.4 set 4, docs/PLAN-1.4.4.md "שבעה מקומות בסדנה" 5; Avi 4.11: about half from our own world).
// A client, a need, and the tests the prototype must pass. Every order wants at least one idea from nature (the
// build engine's `hasNature`); `need`: at least one of these add-ons must be on it (the heart of the idea).
// lv: 1 easy (the beginners get only these; `k` = their words, fully vocalised), 2 two tests, 3 harder numbers.
// who: an album card id (a client from the islands) or a world client drawn in src/workshop/art.js (clientSVG).
// tests/workshop/orders.mjs proves every order has at least two different working prototypes and that a plain one fails.
// { id, z: 'world' | zone, who, lv, f, k?, tests: { <test>: min }, need?, hint (the nature idea, one line) }
export const ORDERS = [
  // ── our own world (15)
  { id: 'road', z: 'world', who: 'road', lv: 1, f: 'הכביש בכפר חשוך בלילה, והנהגים לא רואים איפה הוא נגמר.', k: 'הַכְּבִישׁ חָשׁוּךְ בַּלַּיְלָה. צָרִיךְ שֶׁיִּרְאוּ אוֹתוֹ!', tests: { wind: 45 }, need: ['reflect', 'glow'], hint: 'עיני חתול מחזירות את האור של הפנסים.' },
  { id: 'phone', z: 'world', who: 'phone', lv: 1, f: 'טלפון נופל מהשולחן ונשבר. צריך כיסוי שישמור עליו.', k: 'טֶלֶפוֹן נוֹפֵל וְנִשְׁבָּר. צָרִיךְ כִּסּוּי!', tests: { drop: 65 }, hint: 'קוצים של קיפוד בולמים נפילה.' },
  { id: 'slide', z: 'world', who: 'slide', lv: 1, f: 'המגלשה בגן מתחממת בשמש, ואי אפשר לגלוש בצהריים.', k: 'הַמַּגְלֵשָׁה חַמָּה מִדַּי בַּשֶּׁמֶשׁ!', tests: { heat: 60 }, hint: 'לפנק יש אוזניים גדולות שמוציאות חום.' },
  { id: 'eggs', z: 'world', who: 'eggs', lv: 1, f: 'הביצים מהלול מגיעות לחנות שבורות.', k: 'הַבֵּיצִים מַגִּיעוֹת שְׁבוּרוֹת!', tests: { drop: 70 }, hint: 'חלת הדבש קלה וחזקה גם יחד.' },
  { id: 'roof', z: 'world', who: 'roof', lv: 1, f: 'הגשם דולף מהגג של המחסן.', k: 'הַגֶּשֶׁם נִכְנָס מֵהַגַּג!', tests: { water: 65 }, hint: 'קשקשים מונחים זה על זה, והמים מחליקים מהם.' },
  { id: 'ship', z: 'world', who: 'ship', lv: 2, f: 'ספינה גדולה צריכה לשוט חלק יותר ולשרוף פחות דלק.', tests: { water: 70, wind: 55 }, need: ['sharkskin'], hint: 'העור של הכריש בנוי משיניים קטנטנות שעוזרות לו להחליק במים.' },
  { id: 'school', z: 'world', who: 'school', lv: 2, f: 'בית ספר במדבר צריך מים לשתייה ולגינה.', tests: { heat: 55 }, need: ['fogcatch'], hint: 'חיפושית במדבר נמיב אוספת טיפות ערפל על הגב.' },
  { id: 'office', z: 'world', who: 'building', lv: 2, f: 'בניין משרדים חם מדי בקיץ, והמזגנים עובדים כל היום.', tests: { heat: 75 }, hint: 'בתל של טרמיטים האוויר זורם במנהרות ומקרר.' },
  { id: 'umbrella', z: 'world', who: 'umbrella', lv: 2, f: 'מטרייה שלא מתהפכת ברוח חזקה.', tests: { wind: 60, water: 55 }, hint: 'עור חלק כמו של כריש עוזר לרוח לעבור.' },
  { id: 'tent', z: 'world', who: 'tent', lv: 2, f: 'האוהלים בחוף עפים ברוח ושוקעים בחול.', tests: { wind: 55, sand: 60 }, hint: 'פתי היניקה של התמנון נאחזים חזק.' },
  { id: 'window', z: 'world', who: 'window', lv: 2, f: 'לנקות חלונות גבוהים בלי סולם.', tests: { wind: 60 }, need: ['suction'], hint: 'התמנון נדבק לסלע בפתי היניקה שלו.' },
  { id: 'bank', z: 'world', who: 'bank', lv: 2, f: 'שטר כסף שלא נהרס בכביסה, ושאפשר לבדוק שהוא אמיתי.', tests: { water: 60 }, need: ['uvglow'], hint: 'עקרב זוהר באור סגול. גם בשטרות יש סימנים שזוהרים רק באור כזה.' },
  { id: 'train', z: 'world', who: 'train', lv: 3, f: 'רכבת מהירה עושה רעש גדול כשהיא יוצאת ממנהרה.', tests: { wind: 75, noise: 55 }, hint: 'הנוצות של התנשמת שקטות מאוד.' },
  { id: 'library', z: 'world', who: 'library', lv: 3, f: 'המאוורר בספרייה מקרר טוב, אבל רועש מדי.', tests: { heat: 70, noise: 60 }, need: ['fan'], hint: 'נוצות רכות של תנשמת שקטות באוויר.' },
  { id: 'helmet', z: 'world', who: 'helmet', lv: 3, f: 'קסדה לאופניים: קלה, חזקה, ושהרוח לא תעצור אותה.', tests: { drop: 80, wind: 55 }, hint: 'שריון של צב וחלת דבש: חזקים בלי להיות כבדים.' },
  // ── the islands (15: three from each zone)
  { id: 'frogs', z: 'amazon', who: 'dartfrog', lv: 1, f: 'הצפרדעים צריכות לחצות את הנהר כשהמים עולים.', k: 'הַצְּפַרְדְּעִים צְרִיכוֹת לַחֲצוֹת אֶת הַנָּהָר.', tests: { water: 70 }, hint: 'העלה הענק של ויקטוריה צף בזכות הצלעות שלו.' },
  { id: 'sloth', z: 'amazon', who: 'sloth', lv: 2, f: 'העצלן צריך גשר בין העצים, שלא ירעיש ולא יפיל אותו.', tests: { noise: 60, drop: 55 }, hint: 'התנשמת עפה בשקט בזכות הנוצות.' },
  { id: 'bats', z: 'amazon', who: 'fruitbat', lv: 2, f: 'עטלפי הפירות נרטבים בגשמים הגדולים ומתקררים.', tests: { water: 60, heat: 45 }, hint: 'קשקשים שומרים על היבש שבפנים.' },
  { id: 'turtles', z: 'grove', who: 'tortoise', lv: 2, f: 'הצבים צריכים לחצות את הכביש בלילה, והנהגים לא רואים אותם.', tests: { sand: 55 }, need: ['reflect', 'glow'], hint: 'גחלילית מאירה בחושך בלי חום.' },
  { id: 'owlbox', z: 'grove', who: 'owl', lv: 1, f: 'התנשמות צריכות תיבת קינון שלא מתחממת בקיץ.', k: 'הַתִּנְשָׁמוֹת צְרִיכוֹת תֵּבָה קְרִירָה.', tests: { heat: 65 }, hint: 'בתל של טרמיטים יש מנהרות שמקררות.' },
  { id: 'bees', z: 'grove', who: 'honeybee', lv: 1, f: 'הדבורים צריכות שוקת מים שלא יטבעו בה.', k: 'הַדְּבוֹרִים צְרִיכוֹת שֹׁקֶת שֶׁלֹּא יִטְבְּעוּ.', tests: { water: 65 }, hint: 'הצלעות של ויקטוריה מחזיקות אותה על המים.' },
  { id: 'mooring', z: 'reef', who: 'brain', lv: 2, f: 'העוגנים של הסירות שוברים את האלמוגים. צריך מצוף לקשור אליו.', tests: { water: 70, drop: 50 }, hint: 'הצלעות של ויקטוריה צפות, והשריון של הצב חזק.' },
  { id: 'seaturtle', z: 'reef', who: 'turtle', lv: 2, f: 'צבי הים לא רואים את הרשתות בלילה ונתקעים בהן.', tests: { water: 60 }, need: ['glow', 'reflect'], hint: 'אור קטן של גחלילית אפשר לראות מרחוק.' },
  { id: 'shade', z: 'reef', who: 'clownfish', lv: 3, f: 'המים מתחממים, והשונית צריכה צל שצף.', tests: { heat: 80, water: 60 }, hint: 'מנהרות של טרמיטים מקררות, וצלעות של ויקטוריה צפות.' },
  { id: 'trough', z: 'desert', who: 'ibex', lv: 2, f: 'המים בשוקת של היעלים מתאדים בשמש.', tests: { heat: 65, water: 55 }, hint: 'האוזניים של הפנק מוציאות חום החוצה.' },
  { id: 'burrow', z: 'desert', who: 'jerboa', lv: 1, f: 'המחילה של הירבוע מתמלאת בחול.', k: 'הַמְּחִלָּה שֶׁל הַיַּרְבּוֹעַ מִתְמַלֵּאת בְּחוֹל.', tests: { sand: 65 }, hint: 'כף הרגל הרחבה של הגמל לא שוקעת בחול.' },
  { id: 'antpath', z: 'desert', who: 'desertant', lv: 2, f: 'נמלות המדבר צריכות שביל שלא שוקע ושלא נשרף בשמש.', tests: { heat: 55, sand: 60 }, hint: 'כף רגל של גמל, ומנהרות של טרמיטים.' },
  { id: 'elephants', z: 'savanna', who: 'elephant', lv: 2, f: 'הפילים אוכלים את השדות של הכפר.', tests: { wind: 45 }, need: ['buzz'], hint: 'פילים מתרחקים מזמזום של דבורים.' },
  { id: 'waterhole', z: 'savanna', who: 'zebra', lv: 3, f: 'בור המים מתייבש בעונת היובש, והעדר צמא.', tests: { heat: 70, water: 65 }, hint: 'מנהרות של טרמיטים מקררות, וחלת דבש שומרת.' },
  { id: 'weaver', z: 'savanna', who: 'weaver', lv: 3, f: 'הקן של האורג נופל מהעץ בסערה.', tests: { wind: 65, drop: 60 }, hint: 'פתי יניקה נאחזים, וקפיץ בולם.' },
];
export const orderOf = (id) => ORDERS.find((o) => o.id === id) || null;
