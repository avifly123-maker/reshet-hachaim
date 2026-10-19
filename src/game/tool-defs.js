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
  { id: 'seeddrone', zones: ['amazon', 'grove'], name: 'רחפן זריעה', cost: 25, max: 99, needs: 4, color: '#8a6a3e',
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
];
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
  const d = TOOL_DEFS.find(t => t.id === id); if (!d) return null;
  const k = biome === 'reef' ? REEF_SKIN[id] : null;
  return k ? { ...d, ...k } : d;
}
export const toolInZone = (d, biome) => !d.zones || d.zones.includes(biome);
// cards for the album: the reef versions of the shared devices (their own name, picture and fact)
export const REEF_TOOL_CARDS = ['drone', 'camera', 'weather'].map((id) => { const d = toolDef(id, 'reef'); return { ...d, id: d.icon, zones: ['reef'] }; });
// field camera: photo range / cone, scan range for the lock-on, tilt limits, motion (rad/s), lens height above the ground
export const CAM = { range: 11, half: 0.8, view: 16, pitchMin: -0.4, pitchMax: 0.32, sweep: 0.22, turnMax: 1.3, eyeY: 1.35 * 1.3 + 0.04 };
