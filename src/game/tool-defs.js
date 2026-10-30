// Technology tools: their plain data – the card icons (small SVG pictures), names, prices, facts and hints, and the
// reef's own versions of the shared devices. No three.js here: the learning hub (album cards) and the research world
// read it without loading the 3D models; src/game/tools.js (the tools system) imports and re-exports all of it.

const svg = (body, bg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${bg}"/>${body}</svg>`);
const ICONS = {
  drone: svg('<rect x="24" y="28" width="16" height="9" rx="3" fill="#33414d"/><circle cx="32" cy="37" r="3" fill="#6fd0ff"/><path d="M24 30L14 22M40 30l10-8M24 35l-10 8M40 35l10 8" stroke="#33414d" stroke-width="3"/><g fill="#9fb4c4"><ellipse cx="14" cy="21" rx="8" ry="2.5"/><ellipse cx="50" cy="21" rx="8" ry="2.5"/><ellipse cx="14" cy="44" rx="8" ry="2.5"/><ellipse cx="50" cy="44" rx="8" ry="2.5"/></g>', '#d9eef7'),
  camera: svg('<path d="M32 40v16M26 56h12" stroke="#5b4a32" stroke-width="3"/><rect x="18" y="20" width="28" height="22" rx="4" fill="#4d6b3a"/><circle cx="32" cy="31" r="7" fill="#22303a"/><circle cx="32" cy="31" r="3.5" fill="#7fc8ff"/><circle cx="41" cy="24" r="2" fill="#ff5a4a"/>', '#e3efd6'),
  rescue: svg('<rect x="16" y="26" width="32" height="16" rx="5" fill="#f2f2ee"/><circle cx="32" cy="34" r="6" fill="#e5483b"/><path d="M32 30.5v4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="32" cy="37.3" r="1.2" fill="#fff"/><circle cx="22" cy="45" r="5" fill="#33414d"/><circle cx="42" cy="45" r="5" fill="#33414d"/><rect x="28" y="16" width="8" height="10" rx="2" fill="#9fb4c4"/><circle cx="32" cy="19" r="2.5" fill="#6fd0ff"/>', '#fde3df'),
  watergen: svg('<rect x="18" y="22" width="28" height="30" rx="3" fill="#f4f6f7" stroke="#b5c3cc" stroke-width="1.5"/><circle cx="32" cy="34" r="8" fill="#c9d6de"/><path d="M32 34v-6.5M32 34l5.6 3.3M32 34l-5.6 3.3" stroke="#7d8f9b" stroke-width="2.2" stroke-linecap="round"/><path d="M15 21l17-9 17 9z" fill="#2c4f7a"/><path d="M32 44c-3 4-3 6 0 7 3-1 3-3 0-7z" fill="#3aa8e8"/>', '#dff1fb'),
  seeddrone: svg('<rect x="24" y="22" width="16" height="9" rx="3" fill="#5d4a2e"/><path d="M24 24L14 17M40 24l10-7" stroke="#5d4a2e" stroke-width="3"/><g fill="#c8b58c"><ellipse cx="14" cy="16" rx="8" ry="2.5"/><ellipse cx="50" cy="16" rx="8" ry="2.5"/></g><g fill="#7b5a36"><circle cx="26" cy="40" r="3"/><circle cx="34" cy="45" r="3"/><circle cx="40" cy="38" r="3"/><circle cx="30" cy="51" r="3"/></g><path d="M34 45c0-4 3-6 6-6" stroke="#5fae4a" stroke-width="2" fill="none"/>', '#efe6d2'),
  nestbox: svg('<path d="M14 58V8" stroke="#6b4a32" stroke-width="7"/><path d="M22 26l13-10 13 10z" fill="#8a5a32"/><rect x="24" y="26" width="22" height="24" rx="2" fill="#c8955a"/><circle cx="35" cy="36" r="4.5" fill="#3a2814"/><path d="M35 44v4" stroke="#6b4a32" stroke-width="2"/>', '#f3e7d2'),
  insecthotel: svg('<path d="M14 26L32 12l18 14z" fill="#8a5a32"/><rect x="16" y="26" width="32" height="26" fill="#c8955a"/><g fill="#6b4a32"><circle cx="22" cy="32" r="2.2"/><circle cx="28" cy="32" r="2.2"/><circle cx="34" cy="32" r="2.2"/><circle cx="40" cy="32" r="2.2"/><circle cx="25" cy="39" r="2.2"/><circle cx="31" cy="39" r="2.2"/><circle cx="37" cy="39" r="2.2"/></g><rect x="18" y="44" width="28" height="6" fill="#d9c08a"/><ellipse cx="48" cy="18" rx="3" ry="2" fill="#f2c14e"/><path d="M46 16l-2-2M50 16l2-2" stroke="#333" stroke-width="1"/>', '#fbefd8'),
  weather: svg('<path d="M32 56V20" stroke="#7d8f9b" stroke-width="3"/><path d="M32 22h12M32 22l-8-6M32 22l-8 6" stroke="#7d8f9b" stroke-width="2"/><g fill="#2c4f7a"><circle cx="44" cy="22" r="3"/><circle cx="24" cy="16" r="3"/><circle cx="24" cy="28" r="3"/></g><rect x="22" y="38" width="20" height="10" rx="2" fill="#f4f6f7" stroke="#b5c3cc"/><path d="M26 43h12" stroke="#3aa8e8" stroke-width="2"/><path d="M20 56h24" stroke="#5b4a32" stroke-width="3"/>', '#e6f1f6'),
  listener: svg('<path d="M14 58V8" stroke="#6b4a32" stroke-width="8"/><rect x="22" y="22" width="20" height="22" rx="3" fill="#3c4a54"/><path d="M20 20l24-6v6l-24 6z" fill="#2c4f7a"/><path d="M46 28c4 3 4 9 0 12M50 25c6 5 6 13 0 18" stroke="#ffb547" stroke-width="2.5" fill="none"/><circle cx="32" cy="36" r="3" fill="#8fd067"/>', '#e6eef2'),
  // the reef (1.3)
  rov: svg('<rect x="17" y="24" width="30" height="18" rx="3" fill="#f2c21a"/><rect x="19" y="20" width="26" height="6" rx="2" fill="#f4f4f0"/><circle cx="32" cy="33" r="5" fill="#a8d8f0"/><g fill="#e8f6ff"><circle cx="22" cy="36" r="2.5"/><circle cx="42" cy="36" r="2.5"/></g><path d="M32 20c0-6 6-10 12-12" stroke="#f08a1a" stroke-width="2" fill="none"/>', '#cfeaf2'),
  uwcam: svg('<path d="M32 40l-9 14M32 40l9 14M32 40v14" stroke="#5a6a72" stroke-width="2.5"/><rect x="18" y="22" width="28" height="18" rx="8" fill="#2a3038"/><circle cx="44" cy="31" r="6" fill="#7ac8e8"/><circle cx="24" cy="26" r="1.8" fill="#ff3a2a"/>', '#cfeaf2'),
  nursery: svg('<path d="M32 12v42" stroke="#f2f2ee" stroke-width="3"/><path d="M32 30l-11-8M32 30l11-8M32 40l-13-8M32 40l13-8M32 50l-11-8M32 50l11-8" stroke="#f2f2ee" stroke-width="2.5" stroke-linecap="round"/><g fill="#e889a8"><circle cx="21" cy="26" r="2.2"/><circle cx="45" cy="36" r="2.2"/><circle cx="21" cy="46" r="2.2"/></g><g fill="#88c0e0"><circle cx="43" cy="26" r="2.2"/><circle cx="19" cy="36" r="2.2"/><circle cx="43" cy="46" r="2.2"/></g><circle cx="32" cy="11" r="4" fill="#f08a1a"/><rect x="27" y="52" width="10" height="4" fill="#9a9a94"/>', '#d8f0f4'),
  reefball: svg('<path d="M10 50a22 22 0 0 1 44 0z" fill="#a8a29a"/><g fill="#4a4a48"><circle cx="22" cy="42" r="4"/><circle cx="36" cy="38" r="4"/><circle cx="46" cy="46" r="3"/><circle cx="30" cy="31" r="3"/></g><path d="M14 46l3-5M48 36l3-3" stroke="#e889a8" stroke-width="2.5"/><path d="M8 50h48" stroke="#d8c8a0" stroke-width="3"/>', '#d8f0f4'),
  buoy: svg('<path d="M8 22h48" stroke="#5ab0d8" stroke-width="2"/><circle cx="32" cy="20" r="9" fill="#f4f4f0"/><rect x="23" y="18" width="18" height="4" fill="#2a6ad8"/><path d="M32 29v22" stroke="#e8d8a8" stroke-width="2"/><rect x="26" y="50" width="12" height="5" rx="1" fill="#8a8a84"/><path d="M14 50l6 4" stroke="#e889a8" stroke-width="3"/>', '#cfeaf2'),
  sensor: svg('<path d="M8 34h48" stroke="#5ab0d8" stroke-width="2"/><rect x="24" y="28" width="16" height="10" rx="3" fill="#f2c21a"/><path d="M32 28V12" stroke="#f2c21a" stroke-width="3"/><rect x="22" y="18" width="14" height="7" fill="#1c3a6a" transform="rotate(-15 29 21)"/><circle cx="32" cy="11" r="2" fill="#ffb020"/><path d="M32 38v12" stroke="#c0c0b8" stroke-width="3"/><rect x="29" y="49" width="6" height="4" fill="#3a4048"/>', '#cfeaf2'),
  // 1.4: the desert's devices (src/world/desert-tech.js). No cross shapes: a ring, an arch with a hexagonal net, slats.
  drip: svg('<ellipse cx="30" cy="42" rx="20" ry="8" fill="none" stroke="#1d2226" stroke-width="3.5"/><g fill="#2a6ad8"><circle cx="12" cy="42" r="2.6"/><circle cx="22" cy="49" r="2.6"/><circle cx="38" cy="49" r="2.6"/><circle cx="48" cy="42" r="2.6"/></g><rect x="46" y="16" width="10" height="16" rx="3" fill="#3a8ab8"/><path d="M30 20c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z" fill="#7ad0ff"/>', '#f2e2c4'),
  fognet: svg('<path d="M12 50V34a20 20 0 0 1 40 0v16" fill="none" stroke="#8a8f92" stroke-width="3.5"/><path d="M16 34a16 16 0 0 1 32 0z" fill="#f0f4f0" opacity=".85"/><g fill="#3aa8e8"><circle cx="24" cy="40" r="2.2"/><circle cx="32" cy="43" r="2.2"/><circle cx="40" cy="40" r="2.2"/></g><rect x="50" y="40" width="8" height="12" rx="2" fill="#e8ecef"/>', '#d8e8ec'),
  sandfence: svg('<path d="M8 52c16-6 32-6 48 0" fill="none" stroke="#c8a070" stroke-width="5"/><g fill="#a8784a"><rect x="12" y="22" width="5" height="26" rx="1"/><rect x="22" y="20" width="5" height="26" rx="1"/><rect x="32" y="19" width="5" height="26" rx="1"/><rect x="42" y="20" width="5" height="26" rx="1"/></g><path d="M12 22c12-4 24-4 35-2" fill="none" stroke="#e6d4aa" stroke-width="2"/>', '#f2dcb4'),
  // 1.3.2 (area G): the new technologies (src/world/tech.js). No cross shapes: no rods meeting at right angles.
  canopybot: svg('<circle cx="27" cy="18" r="12" fill="#4f9a45"/><circle cx="39" cy="21" r="8" fill="#63b056"/><rect x="23" y="24" width="8" height="32" rx="2" fill="#7a5532"/><rect x="31" y="33" width="15" height="13" rx="6.5" fill="#f3f1ea" stroke="#b9c3c2"/><rect x="34" y="36" width="9" height="5" rx="2.5" fill="#1d2b36"/><circle cx="36.6" cy="38.5" r="1.2" fill="#8ff2ff"/><circle cx="40.4" cy="38.5" r="1.2" fill="#8ff2ff"/><path d="M50 34a7 7 0 0 1 0 11M54 31a11 11 0 0 1 0 17" stroke="#2c9a92" stroke-width="2" fill="none" stroke-linecap="round"/>', '#dff1e6'),
  lidar: svg('<g fill="#2f7a5a"><rect x="11" y="42" width="8" height="14" rx="3"/><rect x="21" y="30" width="8" height="26" rx="3"/><rect x="33" y="37" width="8" height="19" rx="3"/><rect x="45" y="26" width="8" height="30" rx="3"/></g><path d="M32 19L15 41M32 19L25 29M32 19L37 36M32 19L49 25" stroke="#3ccf8e" stroke-width="1.5" opacity=".85"/><g><circle cx="15" cy="42" r="2.4" fill="#2fc0a8"/><circle cx="25" cy="30" r="2.4" fill="#9be15d"/><circle cx="37" cy="37" r="2.4" fill="#57d28a"/><circle cx="49" cy="26" r="2.4" fill="#ffd34d"/></g><ellipse cx="32" cy="14" rx="13" ry="4.5" fill="#f3f1ea" stroke="#2c9a92" stroke-width="2"/><ellipse cx="32" cy="12" rx="5" ry="3" fill="#f3f1ea"/><circle cx="32" cy="18" r="2.2" fill="#7dffb0"/>', '#e4f0f7'),
  thermal: svg('<defs><radialGradient id="th"><stop offset="0" stop-color="#fff6c0"/><stop offset=".45" stop-color="#ffb347"/><stop offset="1" stop-color="#ff5a3a" stop-opacity="0"/></radialGradient></defs><path d="M47 9a8 8 0 1 0 7 12a6.5 6.5 0 1 1 -7 -12z" fill="#f4e6a8"/><path d="M21 18L9 52h25z" fill="#ffb347" opacity=".2"/><ellipse cx="22" cy="45" rx="11" ry="7" fill="url(#th)"/><ellipse cx="40" cy="49" rx="7" ry="5" fill="url(#th)"/><ellipse cx="21" cy="15" rx="10" ry="3.6" fill="#f3f1ea" stroke="#2c9a92" stroke-width="2"/><circle cx="21" cy="18.5" r="2.2" fill="#ff8a3a"/>', '#1f2a44'),
  firetower: svg('<path d="M27 56l3-33h4l3 33z" fill="#f3f1ea" stroke="#b9c3c2"/><rect x="29" y="38" width="6" height="3" fill="#2c9a92"/><rect x="22" y="14" width="20" height="9" rx="3" fill="#f3f1ea" stroke="#2c9a92" stroke-width="2"/><rect x="25" y="16.5" width="14" height="4" rx="2" fill="#1d2b36"/><path d="M20 14l12-8 12 8z" fill="#2c9a92"/><path d="M42 18l15 6V11z" fill="#ffd166" opacity=".55"/><path d="M50 55c-5 0-6.5-5-3.5-9 .5 2.5 2 3 2 3 0-4 3-6 3-8.5 2 3 5.5 6 4.5 10.5-.7 3-3 4-6 4z" fill="#ff8a3a"/>', '#f6e9d6'),
  reefspeaker: svg('<path d="M12 55a20 10 0 0 1 40 0z" fill="#e8dcc0"/><rect x="30" y="40" width="4" height="9" fill="#9aa6a8"/><circle cx="32" cy="31" r="11" fill="#f3f1ea" stroke="#2c9a92" stroke-width="3"/><circle cx="32" cy="31" r="5.5" fill="#1d2b36"/><circle cx="32" cy="31" r="2.2" fill="#2c9a92"/><path d="M46 25a9 9 0 0 1 0 12M51 21a15 15 0 0 1 0 20" stroke="#2c9a92" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M9 18c4-4 9-4 12 0-3 4-8 4-12 0zM9 18l-4-3v6z" fill="#f2a33a"/><path d="M14 30c3-3 6-3 8 0-2 3-5 3-8 0zM14 30l-3-2v4z" fill="#f2c94a"/>', '#cfeaf2'),
  spawnbot: svg('<path d="M8 56c2-6 6-6 6-12M15 56c0-4 4-6 6-10" stroke="#e889a8" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="18" y="34" width="30" height="14" rx="7" fill="#f3f1ea" stroke="#b9c3c2"/><rect x="39" y="37" width="7" height="6" rx="3" fill="#1d2b36"/><circle cx="42.5" cy="40" r="1.3" fill="#8ff2ff"/><path d="M24 34l-3-10h14l-3 10z" fill="#ffffff" stroke="#2c9a92" stroke-width="2"/><g fill="#ff9cc0"><circle cx="26" cy="17" r="2.2"/><circle cx="34" cy="11" r="2"/><circle cx="20" cy="8" r="1.8"/><circle cx="44" cy="20" r="2.2"/></g><g fill="#ffc39a"><circle cx="40" cy="9" r="1.8"/><circle cx="14" cy="16" r="2"/><circle cx="50" cy="12" r="1.6"/></g>', '#ece4f4'),
};

export const TOOL_DEFS = [
  { id: 'drone', name: 'רחפן ניטור', cost: 20, max: 99, needs: 0, color: '#4aa3d6',
    fact: 'רחפן ניטור טס מעל היער, סופר צמחים ובעלי חיים ומגלה איפה יש בעיה: מי רעב, מי בצל, ולמי חסר שותף.',
    hint: 'גררו לכל מקום ביער – הרחפן יטוס סיבוב וידווח' },
  { id: 'camera', name: 'מצלמת שטח', cost: 15, max: 6, needs: 0, color: '#5a8a3e',
    fact: 'מצלמת שטח מצלמת לבד כל בעל חיים שעובר לידה, גם בלילה. כך חוקרים מגלים בעלי חיים ביישניים שכמעט אף פעם לא רואים.',
    hint: 'שימו ליד שביל או ליד מקור מזון' },
  { id: 'rescue', name: 'רובוט הצלה', cost: 15, max: 99, needs: 2, color: '#e5483b',
    fact: 'רובוט ההצלה מגיע לבעל חיים פגוע, מטפל בו ומחזיר אותו לטבע.',
    hint: 'גררו ליד בעל חיים פגוע (סימן אדום)' },
  { id: 'watergen', zones: ['amazon', 'grove'], name: 'מחולל מים מהאוויר', cost: 30, max: 3, needs: 2, color: '#3aa8e8',
    fact: 'המכשיר מקרר את האוויר ואוסף ממנו טיפות מים, כמו טל של בוקר. ככל שהאוויר לח יותר – הוא מפיק יותר מים.',
    hint: 'שימו ליד עצים וצמחים שצריכים מים' },
  { id: 'seeddrone', zones: ['amazon', 'grove', 'desert'], name: 'רחפן זריעה', cost: 25, max: 99, needs: 4, color: '#8a6a3e',
    fact: 'רחפן זריעה מפזר כדורי זרעים עטופים באדמה ובדשן על שטח חשוף. כך משקמים יער אחרי שריפה או כריתה.',
    hint: 'גררו אל שטח חשוף' },
  { id: 'listener', zones: ['amazon', 'grove'], name: 'מאזין יער', cost: 30, max: 2, needs: 4, color: '#ffb547',
    fact: 'מאזין היער הוא חיישן קטן עם לוח סולארי שנתלה על עץ. הוא מקשיב לקולות היער, וכשהוא שומע מסור חשמלי – הוא שולח התרעה לשומרי היער.',
    hint: 'גררו אל עץ גבוה' },
  { id: 'nestbox', zones: ['amazon', 'grove'], name: 'תיבת קינון', cost: 15, max: 4, needs: 6, color: '#c8955a', host: true,
    fact: 'תיבת קינון היא בית מעץ לציפורים. בישראל תולים תיבות קינון לתנשמות בשדות – והתנשמות צדות עכברים במקום שישתמשו ברעל.',
    hint: 'גררו אל עץ – ציפורים יקננו בה, והמשפחות שלהן יגדלו' },
  { id: 'insecthotel', zones: ['amazon', 'grove'], name: 'מלון חרקים', cost: 15, max: 3, needs: 6, color: '#d9a441',
    fact: 'מלון חרקים בנוי מגזעים עם חורים וקנים חלולים. דבורי בר ופרפרים מוצאים בו מחסה – והם מאביקים את הפרחים מסביב.',
    hint: 'שימו ליד פרחים – המאביקים שליד המלון יתרבו' },
  { id: 'weather', name: 'תחנת מזג אוויר', cost: 25, max: 1, needs: 6, color: '#7d8f9b',
    fact: 'תחנת מזג אוויר מודדת רוח, חום ולחות, ומזהירה מראש מפני בצורת, שריפה או שיטפון. כשיודעים מראש – אפשר להתכונן.',
    hint: 'שימו במקום פתוח – היא תקטין את הנזק של אירועי מזג אוויר' },
  // the reef (1.3): devices people really use to watch over and repair coral reefs
  // the nursery is the only source of strong young corals (1.3.1, Avi: give it meaning): fragments of corals that stood
  // the heat grow on its branches, and the child transplants them (tray card "<coral> חזק") where the reef was hurt.
  // Sources: docs/sources.md, "Coral nursery" (Eilat mid-water nursery, Shafir et al. 2006; heat-tolerant parents, Palumbi lab)
  { id: 'nursery', zones: ['reef'], name: 'משתלת אלמוגים', cost: 25, max: 3, needs: 3, color: '#e889a8',
    fact: 'משתלת אלמוגים היא "עץ" של צינורות במים, ועליו תלויים שברי אלמוג קטנים. במשתלה מגדלים שברים מאלמוגים שעמדו בחום, והם גדלים שם מהר. כך עושים גם במפרץ אילת.',
    hint: 'שימו על החול. כל זמן מה יגדל בה אלמוג חזק, ויופיע במגש. גררו אותו למקום שבו השונית נפגעה' },
  { id: 'reefball', zones: ['reef'], name: 'שונית מלאכותית', cost: 20, max: 4, needs: 5, color: '#a8a29a',
    fact: 'שונית מלאכותית היא כיפה של בטון מיוחד עם הרבה חורים. דגים מתחבאים בחורים, ואלמוגים צעירים נאחזים בבטון וגדלים עליו.',
    hint: 'שימו על החול – דגים קטנים שליד השונית המלאכותית יתרבו יותר' },
  { id: 'buoy', zones: ['reef'], name: 'מצוף עגינה', cost: 15, max: 3, needs: 4, color: '#2a6ad8',
    fact: 'סירה שמטילה עוגן על השונית שוברת אלמוגים. מצוף עגינה קשור לטבעת שקבועה בחול, והסירות נקשרות אליו במקום להטיל עוגן.',
    hint: 'שימו על החול ליד השונית – סירות ייקשרו אליו ולא יטילו עוגן על האלמוגים' },
  // 1.4, the desert: ideas people use in dry lands (src/world/desert-tech.js; docs/sources.md "המדבר")
  { id: 'drip', zones: ['desert'], name: 'קו טפטוף', cost: 20, max: 4, needs: 13, color: '#2a6ad8', tech: true,
    fact: 'בהשקיה בטפטוף המים יוצאים לאט, טיפה אחרי טיפה, בדיוק ליד השורש. כך כמעט שום מים לא הולכים לאיבוד. הטפטוף פותח בישראל.',
    hint: 'שימו ליד שתילים צעירים או במקום רחוק מהמעיין' },
  { id: 'fognet', zones: ['desert'], name: 'רשת ערפל', cost: 25, max: 3, needs: 14, color: '#3aa8e8', tech: true,
    fact: 'רשת ערפל היא רשת דקה שעומדת מול הרוח. טיפות זעירות של ערפל נתפסות בה, מתחברות לטיפות גדולות וזורמות למיכל. כך אוספים מים גם בלי גשם.',
    hint: 'שימו ליד שיחים. הרשת אוספת הכי הרבה בבוקר, כשיש ערפל' },
  { id: 'sandfence', zones: ['desert'], name: 'גדר חול', cost: 15, max: 4, needs: 16, color: '#a8784a', tech: true,
    fact: 'גדר חול בנויה מלוחות עם רווחים. היא מאטה את הרוח, והחול שהרוח נושאת נופל מאחוריה במקום לקבור את השתילים.',
    hint: 'שימו ליד שתילים צעירים, בצד שממנו הרוח באה' },
];
// 1.3.2 (area G): six new technologies, one idea each from real research (docs/sources.md "Technologies on the island").
// Kept apart from TOOL_DEFS: the learning hub builds album cards and quiz questions from TOOL_DEFS, and these have no
// card paintings or quiz lines yet. The island uses ISLAND_TOOLS (both lists); toolDef() finds either.
// The models and what they do: src/world/tech.js.
export const TECH_DEFS = [
  { id: 'canopybot', zones: ['amazon'], name: 'רובוט הצמרת', cost: 30, max: 2, needs: 8, color: '#2c9a92', host: true, tech: true,
    fact: 'רובוט הצמרת מטפס לאט על הגזע של עץ גבוה, ובודק מי גר בכל קומה של היער. חוקרים בונים רובוטים כאלה, כי קשה מאוד להגיע אל הצמרות.',
    hint: 'גררו אל עץ גבוה, והרובוט יטפס ויספור מי גר בכל קומה' },
  { id: 'lidar', zones: ['amazon'], name: 'רחפן לידאר', cost: 30, max: 1, needs: 10, color: '#3ccf8e', tech: true,
    fact: 'רחפן לידאר שולח למטה הבזקים קטנים של אור, ומודד כמה זמן לוקח להם לחזור. כך הוא מצייר מפה של הגובה של כל עץ ביער.',
    hint: 'שימו במקום פתוח. הרחפן ימריא לבד וימדוד את גובה העצים' },
  { id: 'thermal', zones: ['grove'], name: 'רחפן מצלמת חום', cost: 30, max: 1, needs: 8, color: '#ff8a3a', tech: true,
    fact: 'מצלמת חום רואה את החום שבעלי חיים מפיצים, גם בחושך. חוקרים שולחים רחפנים כאלה בלילה, כדי לספור בעלי חיים בלי להפריע להם.',
    hint: 'שימו במקום פתוח. בלילה הרחפן ימריא ויספור את בעלי החיים החמים' },
  { id: 'firetower', zones: ['grove'], name: 'מגדל תצפית אש', cost: 35, max: 1, needs: 7, color: '#e8743a', tech: true,
    fact: 'ממגדל תצפית גבוה רואים עשן מרחוק. כשמגלים שריפה מוקדם, הכבאים מגיעים כשהיא עוד קטנה. גם ביערות בארץ יש תצפיות אש.',
    hint: 'שימו במקום פתוח. כשיש שריפה, המגדל יגלה את העשן מוקדם' },
  { id: 'reefspeaker', zones: ['reef'], name: 'רמקול שונית בריאה', cost: 25, max: 2, needs: 7, color: '#2a9ab8', tech: true,
    fact: 'דגים צעירים מחפשים בית לפי הקולות של שונית בריאה. חוקרים השמיעו קולות כאלה ברמקול ליד שונית פגועה, ויותר דגים צעירים הגיעו אליה.',
    hint: 'שימו על החול ליד מקום שבו השונית נפגעה. הקולות יקראו לדגים צעירים' },
  { id: 'spawnbot', zones: ['reef'], name: 'רובוט אלמוגים צעירים', cost: 30, max: 1, needs: 8, color: '#e889a8', tech: true,
    fact: 'אחרי לילה של ביצים, חוקרים מגדלים מהביצים אלמוגים זעירים. רובוט מיוחד מפזר אותם במקומות שבהם השונית נפגעה.',
    hint: 'שימו על החול. בלילה הרובוט יפזר אלמוגים צעירים במקומות שנפגעו' },
];
export const ISLAND_TOOLS = [...TOOL_DEFS, ...TECH_DEFS];
export const TOOL_ICONS = ICONS;
// on the reef the shared devices are their underwater versions: the same job, another machine
const REEF_SKIN = {
  drone: { name: 'רובוט צולל', icon: 'rov', fact: 'רובוט צולל הוא רובוט קטן עם מצלמה ואורות שצולל לאורך השונית. חוקרים שולחים אותו לספור דגים ואלמוגים ולמצוא איפה יש בעיה, בלי להפריע לבעלי החיים.', hint: 'גררו לכל מקום בשונית – הרובוט יצלול סיבוב וידווח' },
  camera: { name: 'מצלמה תת־ימית', icon: 'uwcam', fact: 'מצלמה תת־ימית בתוך קופסה אטומה למים מצלמת לבד כל דג שעובר לידה, גם בלילה. כך מגלים מי מבקר בשונית כשאין צוללנים.', hint: 'שימו ליד שושנת ים או ליד אלמוג גדול' },
  weather: { name: 'מצוף חיישנים', icon: 'sensor', fact: 'מצוף חיישנים צף מעל השונית ומודד את חום המים ואת הצלילות שלהם. כשהמים מתחממים מדי הוא מתריע מראש, ואפשר להיערך.', hint: 'שימו במקום פתוח – הוא יקטין את הנזק של מים חמים ושל שיטפון' },
  rescue: { fact: 'רובוט ההצלה מגיע לבעל חיים פגוע, משחרר אותו מרשת או מחוט דיג, ומחזיר אותו לים.' },
};
/** the definition of a tool as it looks in this zone (name, icon, fact and hint change on the reef) */
export function toolDef(id, biome) {
  const d = ISLAND_TOOLS.find(t => t.id === id); if (!d) return null;
  const k = biome === 'reef' ? REEF_SKIN[id] : null;
  return k ? { ...d, ...k } : d;
}
export const toolInZone = (d, biome) => !d.zones || d.zones.includes(biome);
// cards for the album: the reef versions of the shared devices (their own name, picture and fact)
export const REEF_TOOL_CARDS = ['drone', 'camera', 'weather'].map((id) => { const d = toolDef(id, 'reef'); return { ...d, id: d.icon, zones: ['reef'] }; });
// field camera: photo range / cone, scan range for the lock-on, tilt limits, motion (rad/s), lens height above the ground
export const CAM = { range: 11, half: 0.8, view: 16, pitchMin: -0.4, pitchMax: 0.32, sweep: 0.22, turnMax: 1.3, eyeY: 1.35 * 1.3 + 0.04 };
