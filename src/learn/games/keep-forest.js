import { relVerb, dietVerb, notTogether, gw, genderOf, defName, prefName, joinObj } from '../../data/common.js';
import { icon } from '../../ui/ui.js';
import { tileIcon } from '../../ui/icons-hub.js';
// "מחזיקים את היער" – solitaire mini-game for the learning hub (single player, gentle, cooperative).
// The player builds a small forest (3 layers × 3 slots) from album cards; every 2 turns "nature" flips an
// event card (drought, heat, flood...). A forest that is ready holds on; otherwise its weakest card wilts a little.
// Every real relation between two cards on the board is a glowing gold thread = +1 vitality (חִיּוּת).
// Rarity matters: an epic card is a keystone species ("מין מפתח") – once per run, when the forest is not ready
// for an event, the keystone on the board holds it (nothing wilts, no −1). A rare card adds +1 for its first gold thread.
//
// export function mountKeepForest(root, ctx, opts) → { destroy() }
// Debug hook: window.__kfDebug = { state(), place(handIdx, slot), tool(handIdx), cont(), auto(n), start(biome), hint() }

const CSS_ID = 'wl-keepforest-css';
const BIOMES = ['amazon', 'grove', 'reef'];
const BNAME = { amazon: 'אמזונס', grove: 'חורש', reef: 'שונית' };
const ROWS = ['חופה', 'קומת ביניים', 'קרקע'];
const ROW_SHORT = ['חופה', 'ביניים', 'קרקע'];
// the reef has its own three rows: shallow water (corals that love light), the slope, the sea floor
const ROWS_REEF = ['מים רדודים', 'מדרון השונית', 'קרקעית'];
const ROW_SHORT_REEF = ['רדודים', 'מדרון', 'קרקעית'];
const ROW_SUB = { amazon: ['עצים גבוהים ומטפסים', 'דקלים ושיחים', 'שרכים, פטריות ומים'], grove: ['עצי החורש', 'שיחים', 'פרחים ופטריות'], reef: ['אלמוגים שאוהבים הרבה אור', 'אלמוגים רכים ומניפות ים', 'עשב ים, אצות וספוגים'] };
const LAYER_ROW = { emergent: 0, canopy: 0, understory: 1, floor: 2, water: 2, shallow: 0, open: 0, slope: 1, sand: 2 };
// a few reef species get a row of their own in this game, so every row has a few fixed cards (all of these do live there)
const KF_ROW = { 'reef:brain': 1, 'reef:seaanemone': 1, 'reef:sponge': 2, 'reef:algae': 2 };
const layerRow = (sp) => KF_ROW[sp.key] ?? LAYER_ROW[sp.layer];
const BIRDS = new Set(['toucan', 'macaw', 'hummingbird', 'harpy', 'jay', 'blackbird', 'owl', 'hoopoe', 'chukar']);
const INSECTS = new Set(['leafcutter', 'orchidbee', 'morpho', 'honeybee', 'butterfly', 'harvesterant', 'firefly']);
const FISH = new Set(['clownfish', 'parrotfish', 'surgeonfish', 'cleaner', 'butterflyfish', 'lionfish', 'moray', 'grouper', 'goby', 'stingray', 'reefshark']);
// the shared devices have a reef look of their own (רובוט צולל, מצלמה תת־ימית, מצוף חיישנים), so the dry-land ones stay out of the reef
const LAND_TWIN = new Set(['drone', 'camera', 'weather']);
const toolOk = (c, b) => (c.tool.zones ? c.tool.zones.includes(b) : !(b === 'reef' && LAND_TWIN.has(c.tool.id)));
// vitality needed at the end: [1 star (= the forest held on), 2 stars, 3 stars]. Below the first one the run is lost.
const STAR_T = { full: [10, 15, 21], kids: [6, 10, 15] }; // raised with the rarity powers (keystones + rare bonus), see sim()
const MIN_DECK = 12, TOPUP = 14, HAND = 4, HAND_MAX = 6;
const DECK_MAX = 20; // a big album is trimmed to a well-connected deck for one run
const LAYER_NEED = [2, 2, 2]; // plants per forest layer a deck should hold (missing ones are borrowed)

/* ───────────────────────────── icons (inline SVG) */
const sv = (body) => `<svg class="wl-ic" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const I = {
  sun: sv('<circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5 5l1.8 1.8M17.2 17.2L19 19M5 19l1.8-1.8M17.2 6.8L19 5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" fill="none"/>'),
  heat: sv('<path d="M10 4.5a2 2 0 0 1 4 0v9.2a4.5 4.5 0 1 1-4 0z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="17.5" r="2.6" fill="currentColor"/><path d="M12 9v7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M17 5h3M17 8.5h2.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  fire: sv('<path d="M12 2.5c1 3.5 5.8 6.2 5.8 11.2a5.8 5.8 0 0 1-11.6 0c0-3.1 1.8-4.8 2.9-6.8.3 1.7 1 2.7 2.1 3.2C11.5 7.6 11.3 5.1 12 2.5z" fill="currentColor"/><path d="M12 13c.8 1.5 2.4 2.4 2.4 4.2a2.4 2.4 0 0 1-4.8 0c0-1.3.9-2.4 2.4-4.2z" fill="#fff3c4" fill-opacity=".85"/>'),
  wind: sv('<path d="M3 8.5h11.5a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  rain: sv('<path d="M6.5 13.5a4 4 0 0 1 .6-8 5.2 5.2 0 0 1 9.9 1.3 3.4 3.4 0 0 1 .4 6.7z" fill="currentColor"/><path d="M8 16.5l-1 3M12 16.5l-1 3M16 16.5l-1 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  cloud: sv('<path d="M6.5 18a4.5 4.5 0 0 1 .4-9 6 6 0 0 1 11.3 1.6A3.8 3.8 0 0 1 17.7 18z" fill="currentColor"/>'),
  stump: sv('<path d="M6 20.5V11h12v9.5z" fill="currentColor"/><ellipse cx="12" cy="11" rx="6" ry="2.6" fill="currentColor"/><ellipse cx="12" cy="11" rx="4" ry="1.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1"/><path d="M4 20.5h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 6.5l2.5-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  road: sv('<path d="M8.5 21L10.6 3h2.8l2.1 18z" fill="currentColor"/><path d="M12 5v2.2M12 10v2.4M12 15.4V18" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'),
  fall: sv('<path d="M3.5 20.5h17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5.5 19.2l9.5-5.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="17" cy="11.5" r="4.6" fill="currentColor"/><circle cx="13.6" cy="9.2" r="3.2" fill="currentColor"/>'),
  flower: sv('<g fill="currentColor"><circle cx="12" cy="6.3" r="3.6"/><circle cx="17.4" cy="10.2" r="3.6"/><circle cx="15.4" cy="16.6" r="3.6"/><circle cx="8.6" cy="16.6" r="3.6"/><circle cx="6.6" cy="10.2" r="3.6"/></g><circle cx="12" cy="11.6" r="2.8" fill="#fff6c8"/>'),
  drop: sv('<path d="M12 2.6C8.2 8 5.6 11.4 5.6 14.7a6.4 6.4 0 0 0 12.8 0C18.4 11.4 15.8 8 12 2.6z" fill="currentColor"/>'),
  life: sv('<path d="M12 21v-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 13C12 8.5 9 6 4 6c0 4.5 3 7 8 7zM12 11.5c0-4 2.6-6.6 7.5-6.6 0 4-2.6 6.6-7.5 6.6z" fill="currentColor"/>'),
  thread: sv('<path d="M4 18C8 6 16 18 20 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="4" cy="18" r="2.4" fill="currentColor"/><circle cx="20" cy="6" r="2.4" fill="currentColor"/>'),
  star: sv('<path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5-4.8-4.5 6.5-.8z" fill="currentColor"/>'),
  check: sv('<path d="M4.5 12.5l4.8 4.8L19.5 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  wilt: sv('<path d="M12 21v-7c0-3 1.5-5 4.5-6.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16.5 7.5c2.5.3 3.8 2.3 3.6 5-2.6-.2-4-2.1-3.6-5zM12 14c-3.4.6-6 0-7.5-2.6 3-1.2 5.6-.6 7.5 2.6z" fill="currentColor"/>'),
  swap: sv('<path d="M5 9h12l-3.5-3.5M19 15H7l3.5 3.5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  eye: sv('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  bulb: sv('<path d="M12 2.8a6.6 6.6 0 0 0-3.8 12c.8.6 1.3 1.4 1.3 2.3h5c0-.9.5-1.7 1.3-2.3A6.6 6.6 0 0 0 12 2.8z" fill="currentColor"/><path d="M9.6 19.4h4.8M10.4 21.6h3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  skip: sv('<path d="M5 6l7 6-7 6zM12 6l7 6-7 6z" fill="currentColor"/>'),
  quest: sv('<circle cx="12" cy="12" r="9.6" fill="currentColor"/><path d="M9.3 9.4a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8v.6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.4" fill="#fff"/>'),
  gear: sv('<circle cx="12" cy="12" r="3.4" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  target: sv('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>'),
  key: sv('<circle cx="8.2" cy="8.2" r="5" fill="none" stroke="currentColor" stroke-width="2.7"/><path d="M11.8 11.8l8.6 8.6M16.4 16.4l2.7-2.7M18.9 18.9l2.3-2.3" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>'),
  anchor: sv('<circle cx="12" cy="4.6" r="2.4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v13.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4.2 13.5c.4 4.4 3.8 7 7.8 7s7.4-2.6 7.8-7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M2.6 15.4l1.6-2.4 2.3 1.7M21.4 15.4l-1.6-2.4-2.3 1.7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  deck: sv('<rect x="4" y="5" width="12" height="16" rx="2" fill="currentColor" opacity=".55"/><rect x="8" y="3" width="12" height="16" rx="2" fill="currentColor"/>'),
};
// the owl companion "שומר היער" (no human figures)
const OWL = `<svg class="kf-owlsvg" viewBox="0 0 100 110" aria-hidden="true">
  <path d="M8 98h84" stroke="#6b4a24" stroke-width="7" stroke-linecap="round"/><path d="M70 98l10-9" stroke="#6b4a24" stroke-width="4" stroke-linecap="round"/><ellipse cx="82" cy="87" rx="6" ry="3.4" fill="#7cc46a" transform="rotate(-35 82 87)"/>
  <path d="M24 30L20 10l16 10zM76 30l4-20-16 10z" fill="#7a5530"/>
  <ellipse cx="50" cy="58" rx="31" ry="38" fill="#9a6d3d"/>
  <ellipse cx="50" cy="70" rx="19" ry="23" fill="#e9d3a6"/>
  <path d="M38 64q4 3 8 0M46 72q4 3 8 0M54 64q4 3 8 0M42 80q4 3 8 0M50 80q4 3 8 0" stroke="#b8925a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M19 52q-6 22 8 38q3-20-8-38zM81 52q6 22-8 38q-3-20 8-38z" fill="#7a5530"/>
  <circle cx="37" cy="40" r="13" fill="#fbf3dc"/><circle cx="63" cy="40" r="13" fill="#fbf3dc"/>
  <g class="kf-eyes"><circle cx="38" cy="41" r="6" fill="#2a2016"/><circle cx="62" cy="41" r="6" fill="#2a2016"/><circle cx="40" cy="39" r="2" fill="#fff"/><circle cx="64" cy="39" r="2" fill="#fff"/></g>
  <path d="M46 49l4 8 4-8z" fill="#f0a63a"/>
  <path d="M40 96l-3 4M44 96v5M56 96v5M60 96l3 4" stroke="#f0a63a" stroke-width="3" stroke-linecap="round"/>
</svg>`;

/* ───────────────────────────── helpers */
const rnd = (n) => Math.floor(Math.random() * n);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const dn = (c) => defName(c.sp ? c.sp.id : c.id, c.name); // definite name of a card / species: "הקפוק"
const pk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
// the middle number of a card: מים on land, מחסה at the reef (in the sea there is always water)
const mid = (c) => c.stats.water ?? c.stats.shelter ?? 0;

// every real relation between two species of a biome (both directions), one sentence per pair
const LINKS = new Map();
function linksFor(ctx, biome) {
  if (LINKS.has(biome)) return LINKS.get(biome);
  const sp = ctx.SP.filter((s) => s.biome === biome);
  const by = new Map(sp.map((s) => [s.id, s]));
  const pairs = new Map(); const deg = new Map(sp.map((s) => [s.id, 0]));
  const add = (a, b, text, type) => {
    if (a === b || !by.has(a) || !by.has(b) || !text) return;
    const k = pk(a, b); const cur = pairs.get(k);
    if (!cur) { deg.set(a, deg.get(a) + 1); deg.set(b, deg.get(b) + 1); }
    if (!cur || (cur.type === 'eats' && type !== 'eats')) pairs.set(k, { a, b, text, type });
  };
  for (const s of sp) for (const r of s.relations || []) {
    const t = by.get(r.target); if (!t) continue;
    const verb = relVerb(r.type, s.id);
    add(s.id, r.target, r.text || `${defName(s.id, s.name)} ${joinObj(verb, t.id, t.name)}.`, r.type);
  }
  for (const s of sp) for (const d of s.diet || []) {
    const t = by.get(d.id); if (!t) continue;
    add(s.id, d.id, d.text || `${defName(s.id, s.name)} ${joinObj(dietVerb(d.part, s.id), t.id, t.name)}.`, 'eats');
  }
  const res = { by, get: (a, b) => pairs.get(pk(a, b)) || null, deg: (id) => deg.get(id) || 0 };
  LINKS.set(biome, res);
  return res;
}

/* ───────────────────────────── events */
// kind: what the forest needs. All wording is gentle: nature is not an enemy.
const EV = {
  drought: { ic: 'sun', kind: 'water', name: { amazon: 'שנה יבשה', grove: 'בצורת' },
    story: { amazon: 'הגשם מתעכב והנהר יורד.', grove: 'קיץ ארוך בלי טיפת גשם.' }, need: (n) => `מים ${n} ומעלה`,
    tip: 'כדאי לשים משהו שאוהב מים – בצורת בדרך!' },
  hunters: { ic: 'eye', kind: 'shelter', name: { amazon: '', grove: '', reef: 'להקת ציידים' },
    story: { amazon: '', grove: '', reef: 'דקרים וזהרונים יצאו לצוד. דגים קטנים מסתתרים בין ענפי האלמוגים ובשושנות הים.' },
    need: (n) => `מחסה ${n} ומעלה`, tip: '', rtip: 'ציידים מתקרבים! אלמוגים ושושנות ים נותנים מחסה לדגים הקטנים.' },
  clouds: { ic: 'cloud', kind: 'light', name: { amazon: 'עננים כבדים', grove: 'חורף קר ומעונן', reef: 'מים עכורים' },
    story: { amazon: 'שבועות של עננים מסתירים את השמש.', grove: 'ימים קרים ואפורים, מעט שמש.', reef: 'רוח חזקה העלתה חול מהקרקעית, והמים נעשו עכורים. מעט אור מגיע לשונית.' }, need: (n) => `אור ${n} ומעלה`,
    rtip: 'בקרוב המים יהיו עכורים. יצורים שאוהבים אור יעזרו!', tip: 'בקרוב יהיו עננים. צמחים ויצורים שאוהבים אור יעזרו!' },
  heat: { ic: 'heat', kind: 'canopy', name: { amazon: 'חום כבד', grove: 'חום כבד', reef: 'גל חום בים' },
    story: { amazon: 'שמש חזקה במיוחד. עצי החופה נותנים צל לכולם.', grove: 'שרב חם! עצי החורש נותנים צל לכולם.', reef: 'המים התחממו. אלמוגי אילת עמידים לחום, ושונית עם הרבה אלמוגים במים הרדודים מחזיקה מעמד.' }, need: (n, b) => (b === 'reef' ? `${n === 1 ? 'אלמוג אחד' : n + ' אלמוגים'} במים הרדודים` : `${n === 1 ? 'צמח אחד' : n + ' צמחים'} בחופה`),
    rtip: 'גל חום בדרך. אלמוגים במים הרדודים יעזרו לשונית.', tip: 'חם מאוד בדרך. צמח בחופה ייתן צל לכל היער.' },
  storm: { ic: 'wind', kind: 'threads', name: { amazon: 'סערה חזקה', grove: 'שריפה קטנה בחורש', reef: 'סערה בים' },
    story: { amazon: 'רוח חזקה מטלטלת את היער. יער עם הרבה קשרים מתאושש מהר.', grove: 'אש קטנה בקצה החורש. כשיש הרבה קשרים – החורש מתחדש מהר.', reef: 'גלים גבוהים שוברים ענפים של אלמוגים. שונית עם הרבה קשרים מתאוששת מהר.' },
    need: (n) => `${n === 1 ? 'חוט זהב אחד' : n + ' חוטי זהב'}`, rtip: 'כדאי לחבר עוד חוטי זהב. הם יעזרו לשונית להתאושש.', tip: 'כדאי לחבר עוד חוטי זהב – הם יעזרו ליער להתאושש.' },
  flood: { ic: 'rain', kind: 'floor', name: { amazon: 'הנהר עלה על גדותיו', grove: 'גשם זלעפות', reef: 'שיטפון מהוואדי' },
    story: { amazon: 'הרבה מים זורמים בבת אחת. שורשים בקרקע מחזיקים את האדמה.', grove: 'מבול של גשם! שורשים בקרקע מחזיקים את האדמה.', reef: 'שיטפון ירד מההרים והביא בוץ לים. עשב הים מחזיק את החול, והספוגים מסננים את המים.' },
    need: (n, b) => (b === 'reef' ? `${n === 1 ? 'קלף אחד' : n + ' קלפים'} של עשב ים, אצות או ספוג בקרקעית` : `${n === 1 ? 'צמח אחד' : n + ' צמחים'} בקרקע`), rtip: 'שיטפון בדרך. עשב ים, אצות או ספוג בקרקעית יעזרו.', tip: 'הרבה מים בדרך. צמח בקומת הקרקע יחזיק את האדמה.' },
  logging: { ic: 'stump', ric: 'anchor', kind: 'watch', name: { amazon: 'עצים נכרתו', grove: 'עצים נכרתו', reef: 'עוגן על השונית' },
    story: { amazon: 'בקצה היער כורתים עצים. כלי שמירה מזעיק עזרה בזמן.', grove: 'בקצה החורש כורתים עצים. כלי שמירה מזעיק עזרה בזמן.', reef: 'סירה רוצה להטיל עוגן על האלמוגים. כלי שמירה מכוון אותה למקום אחר.' },
    need: (n) => `כלי שמירה, או חִיּוּת ${n}`, rtip: 'מצוף עגינה, רובוט צולל או מצלמה יכולים לשמור. גם שונית מלאה חִיּוּת מחזיקה מעמד.', tip: 'מאזין יער, רחפן או מצלמה יכולים לשמור – או יער מלא חִיּוּת.' },
  road: { ic: 'road', kind: 'watchThreads', name: { amazon: 'כביש חדש', grove: 'כביש חדש', reef: 'מזח חדש' },
    story: { amazon: 'מתכננים כביש ליד היער. כשרואים כמה קשרים יש בו – משנים את התוכנית.', grove: 'מתכננים כביש ליד החורש. כשרואים כמה קשרים יש בו – משנים את התוכנית.', reef: 'מתכננים מזח חדש ליד השונית. כשרואים כמה קשרים יש בה, בונים אותו במקום אחר.' },
    need: (n) => `כלי שמירה, או ${n} חוטי זהב`, rtip: 'מזח בתכנון. כלי שמירה או הרבה חוטי זהב ישכנעו לבנות אותו במקום אחר.', tip: 'כביש בתכנון. כלי שמירה או הרבה חוטי זהב ישכנעו לסלול אותו במקום אחר.' },
  treefall: { ic: 'fall', kind: 'mid', name: { amazon: 'עץ ענק נפל', grove: 'עץ זקן נפל', reef: 'אלמוג גדול נשבר' },
    story: { amazon: 'עץ זקן נפל ופתח חור בחופה. מי שבקומת הביניים יכול לגדול ולמלא אותו.', grove: 'עץ זקן נפל ופתח חור בחורש. מי שבקומת הביניים יכול לגדול ולמלא אותו.', reef: 'אלמוג שולחן ישן נשבר והשאיר מקום פנוי. מי שבמדרון יכול לגדול ולמלא אותו.' },
    need: (n, b) => `${n === 1 ? 'קלף אחד' : n + ' קלפים'} ${b === 'reef' ? 'במדרון' : 'בקומת הביניים'}`, rtip: 'אלמוג ישן נסדק... קלפים במדרון יעזרו למלא את המקום.', tip: 'עץ זקן מתנדנד... קלפים בקומת הביניים יעזרו למלא את החור.' },
  rain: { ic: 'rain', ric: 'drop', good: true, name: { amazon: 'שנה גשומה', grove: 'שנה גשומה', reef: 'ים שקט' },
    story: { amazon: 'גשם טוב ונעים. היער מקבל 2 חִיּוּת!', grove: 'גשמי ברכה בזמן. החורש מקבל 2 חִיּוּת!', reef: 'ים שקט ומים צלולים. השונית מקבלת 2 חִיּוּת!' }, need: () => 'מתנה: 2 חִיּוּת', rtip: 'הים נרגע, המים נעשים צלולים...', tip: 'אני מרגיש ריח של גשם טוב...' },
  bloom: { ic: 'flower', good: true, name: { amazon: 'פריחה', grove: 'פריחה', reef: 'לילה של הטלה' },
    story: { amazon: 'היער פורח! שולפים 2 קלפים.', grove: 'החורש פורח! שולפים 2 קלפים.', reef: 'בלילה אחד בקיץ האלמוגים משחררים ביצים קטנות למים. שולפים 2 קלפים.' }, need: () => 'מתנה: 2 קלפים', rtip: 'הלילה האלמוגים יטילו ביצים!', tip: 'הפרחים עומדים להיפתח!' },
};
const CHALLENGES = ['drought', 'clouds', 'heat', 'storm', 'flood', 'logging', 'road', 'treefall'];
// in the sea there is always water: no drought at the reef
const challengesFor = (b) => (b === 'reef' ? CHALLENGES.map((id) => (id === 'drought' ? 'hunters' : id)) : CHALLENGES);

/* ───────────────────────────── tools */
const TOOL_FX = {
  watergen: '\u2066+4\u2069 מים לאירוע הבא', weather: 'מגלה את האירוע הבא', drone: 'שולף 2 קלפים ושומר על היער',
  seeddrone: 'מחזיר צמח נובל', rescue: 'מחזיר בעל חיים נובל', listener: 'שומר מכריתה ומכביש',
  nestbox: 'חוטי ציפורים שווים פי 2', insecthotel: 'חוטי חרקים שווים פי 2', camera: 'מגלה 3 אירועים ושומרת',
  rov: 'שולף 2 קלפים ושומר על השונית', uwcam: 'מגלה 3 אירועים ושומרת', sensor: 'מגלה את האירוע הבא',
  nursery: 'מחזירה אלמוג או צמח נובל', reefball: 'חוטי דגים שווים פי 2', buoy: 'שומר מעוגן וממזח',
};

/* ───────────────────────────── CSS */
const CSS = `
.kf-pick{justify-content:center;gap:1em;padding:0 2em .8em}
.kf-phead{text-align:center}
.kf-phead h1{font-family:var(--serif);font-size:2.6em;line-height:1;color:#f6eed0;text-shadow:0 3px 22px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;gap:.3em}
.kf-phead h1 .wl-ic{width:.9em;height:.9em;color:var(--leaf)}
.kf-phead p{margin-top:.4em;font-family:var(--serif);font-size:1.15em;color:#e2dcbd}
.kf-biomes{display:flex;gap:1.4em;justify-content:center}
.kf-bt{width:min(19em,30vw);border-radius:20px;padding:.8em 1em .9em;display:flex;flex-direction:column;align-items:center;gap:.4em;border:3px solid transparent!important;transition:transform .15s,border-color .2s}
.kf-bt:hover{transform:translateY(-3px)}
.kf-bt.on{border-color:var(--leaf2)!important;box-shadow:0 0 0 4px rgba(143,208,103,.5),var(--shadow)}
.kf-bt h2{font-family:var(--serif);font-size:1.9em;line-height:1;color:#1f2c1a}
.kf-bt .kf-fan{display:flex;justify-content:center;height:calc(min(4.6em,9vh) * 1.42 + .3em);align-items:center}
.kf-bt .kf-fan .wl-card{--cw:min(4.6em,9vh);margin:0 -.5em}
.kf-bt .kf-fan .wl-card:nth-child(1){transform:rotate(7deg)}.kf-bt .kf-fan .wl-card:nth-child(3){transform:rotate(-7deg)}.kf-bt .kf-fan .wl-card:nth-child(2){z-index:2;transform:translateY(-.3em)}
.kf-fan .wl-card::after{display:none!important;animation:none!important}
.kf-slot .wl-card::after,.kf-ghost .wl-card::after{display:none!important;animation:none!important}
.kf-bt p{font-size:.98em;color:var(--ink2);font-weight:700;text-align:center;line-height:1.3}
.kf-bt p b{color:#2f6a26}
.kf-bt .kf-best{display:flex;gap:.1em;color:rgba(80,70,40,.22)}.kf-bt .kf-best .on{color:var(--amber2)}
.kf-pick{position:relative}
.kf-goalbox{width:min(46em,94%);border-radius:20px;padding:.7em 1.3em .8em;display:flex;flex-direction:column;gap:.55em;align-items:center}
.kf-hgoal{display:flex;align-items:center;gap:.6em;text-align:right}
.kf-hgoal .wl-ic{flex:none;width:2.4em;height:2.4em;color:#c46a1c}
.kf-hgoal small{display:block;font-weight:800;color:#8a5a12;font-size:.85em;line-height:1.2}
.kf-hgoal b{font-family:var(--serif);font-size:1.35em;line-height:1.15;color:#1f2c1a}
.kf-gline{display:flex;flex-wrap:wrap;gap:.4em .55em;justify-content:center;align-items:center}
.kf-gs{display:inline-flex;align-items:center;gap:.25em;padding:.12em .6em;border-radius:99px;background:rgba(80,70,40,.1);font-weight:800;color:#5a4a2a;white-space:nowrap;transition:background .3s}
.kf-gs i{display:inline-flex;color:#d98e26}
.kf-gs .wl-ic{width:1em;height:1em}
.kf-gs.on{background:linear-gradient(180deg,#fff2c4,#f8d98a);color:#3a2608;box-shadow:0 0 .6em rgba(240,180,76,.6)}
.kf-glose{display:inline-flex;align-items:center;gap:.3em;font-weight:700;color:#7a4a22;font-size:.95em}
.kf-glose .wl-ic{width:1.3em;height:1.3em;color:#a0703a}
.kf-pbtns{display:flex;gap:.8em;align-items:center}
.kf-pbtns .wl-btn .wl-ic{width:1.3em;height:1.3em}
/* how to play */
.kf-how{position:absolute;inset:0;z-index:30;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:.5em;background:rgba(8,20,12,.66);backdrop-filter:blur(3px);animation:wl-in .25s both}
.kf-hbox{width:min(64em,98%);max-height:100%;overflow:auto;border-radius:22px;padding:.9em 1.3em 1em;display:flex;flex-direction:column;align-items:center;gap:.6em;animation:wl-pop .4s cubic-bezier(.2,.9,.3,1.25) both}
.kf-hbox.kids{width:min(48em,98%)}
.kf-hbox.kids .kf-hgoal b{font-size:1.5em}
.kf-hsteps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);gap:.6em;width:100%}
.kf-hbox.kids .kf-hsteps{grid-template-columns:repeat(3,1fr)}
.kf-hsteps li{display:flex;flex-direction:column;align-items:center;gap:.3em;text-align:center;background:rgba(95,174,74,.12);border-radius:14px;padding:.5em .5em .6em}
.kf-hsteps h4{display:flex;align-items:center;gap:.35em;margin:0;font-family:var(--serif);font-size:1.15em;line-height:1.1;color:#1f2c1a}
.kf-hsteps h4 span{flex:none;width:1.5em;height:1.5em;border-radius:50%;background:var(--leaf2);color:#10260b;display:grid;place-items:center;font-family:var(--sans);font-size:.85em;font-weight:900}
.kf-hsteps p{margin:0;font-size:.95em;line-height:1.35;color:#2c3524}
.kf-hbox.kids .kf-hsteps p{font-size:1.08em}
.kf-hp{position:relative;height:6.2em;width:100%;display:flex;align-items:center;justify-content:center}
.kf-hp .wl-card{--cw:3.4em;box-shadow:0 .3em .6em rgba(0,0,0,.3)}
.kf-hp .wl-card::after{display:none!important}
.kf-hp-rows{flex-direction:column;align-items:stretch;gap:.15em;padding:0 .3em}
.kf-hp-rows i{flex:1;display:flex;align-items:center;padding:0 .5em;border-radius:6px;font-style:normal;font-size:.75em;font-weight:800;color:#2c3524}
.kf-hp-rows i:nth-child(1){background:rgba(95,174,74,.35)}.kf-hp-rows i:nth-child(2){background:rgba(143,190,90,.3)}.kf-hp-rows i:nth-child(3){background:rgba(150,110,60,.3)}
.kf-hcard{position:absolute;left:14%;top:-.3em;transform:rotate(-5deg)}
.kf-hcard .wl-card{--cw:3em}
.kf-hp-pair svg{width:2.4em;height:1.3em;margin:0 -.35em;align-self:flex-start;margin-top:1.6em;position:relative;z-index:1;filter:drop-shadow(0 0 3px rgba(255,200,90,.9))}
.kf-hp-pair b,.kf-hp-tool b{position:absolute;top:-.55em;left:50%;transform:translateX(-50%);z-index:2;padding:0 .45em;border-radius:99px;background:linear-gradient(180deg,#fff2c4,#f8d98a);font-weight:900;color:#8a5a12;font-size:.95em}
.kf-hp-tool b{top:auto;bottom:0;left:30%}
.kf-hev{flex:none;width:3.6em;height:5.1em;border-radius:.5em;background:linear-gradient(150deg,#ffe9a8,#e8a43a 45%,#9c6512);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2em;box-shadow:0 .3em .6em rgba(0,0,0,.3)}
.kf-hev .wl-ic{width:2em;height:2em;color:#fff6d8}
.kf-hev small{font-weight:800;font-size:.75em;color:#fff}
.kf-hneed{display:flex;flex-direction:column;gap:.2em;margin-inline-start:.45em}
.kf-hneed span{display:flex;align-items:center;gap:.2em;padding:.05em .45em;border-radius:99px;background:rgba(240,180,76,.28);font-size:.75em;font-weight:800;color:#3a2608;white-space:nowrap}
.kf-hneed .wl-ic{width:1.1em;height:1.1em;color:#b96f12}
.kf-hp-stars{flex-direction:column;gap:.2em}
.kf-hp-stars span{display:flex;align-items:center;gap:.4em;font-weight:800;color:#5a4a2a}
.kf-hst{display:inline-flex;color:#d98e26;min-width:3.3em;justify-content:flex-start}
.kf-hst .wl-ic{width:1.1em;height:1.1em}
.kf-hp-stars b{font-size:1.1em;color:#1f2c1a}
.kf-hlose{display:flex;align-items:center;gap:.5em;width:100%;padding:.4em .9em;border-radius:12px;background:#f3e6cf;color:#5a3b22;font-size:1em;line-height:1.35}
.kf-hlose .wl-ic{flex:none;width:1.7em;height:1.7em;color:#a0703a}
.kf-hleg{display:flex;flex-wrap:wrap;gap:.35em 1.2em;justify-content:center;font-size:.88em;font-weight:600;color:var(--ink2)}
.kf-hleg span{display:flex;align-items:center;gap:.45em}
.kf-hleg .kf-lb{position:static;transform:rotate(-6deg);font-style:normal;flex:none}
.kf-lt{flex:none;display:inline-flex;align-items:center;gap:.2em;padding:.1em .55em;border-radius:99px;background:#e8dfc6;color:#2c3524;font-style:normal;font-weight:800}
.kf-lt.w{background:#7a6a4a;color:#fbf6e5}
.kf-lt .wl-ic{width:1em;height:1em}
.kf-hbox>.wl-btn{font-size:1.15em;padding:.35em 2.2em}
.kf-pick .wl-btn.go{font-size:1.3em;padding:.45em 2.4em}
/* game */
.kf-game{position:relative;width:100%;padding:0 1em .35em;align-items:stretch;gap:.35em}
.kf-bar{flex:none;display:flex;align-items:center;gap:.5em;min-height:2.5em}
.kf-stat{display:flex;align-items:center;gap:.35em;padding:.25em .8em;border-radius:99px;background:rgba(246,240,220,.12);border:1px solid rgba(246,240,220,.2);font-weight:800;color:#f3ecd2;white-space:nowrap}
.kf-stat b{font-size:1.2em;min-width:1.1em;text-align:center}
.kf-stat small{font-weight:700;opacity:.85}
.kf-stat.s-light .wl-ic{color:#f0b44c}.kf-stat.s-water .wl-ic{color:#6cc0f0}.kf-stat.s-thr .wl-ic{color:#f6cf72}
.kf-stat.s-life{background:linear-gradient(180deg,#a2dc78,#5fae4a);color:#10260b;border-color:#3f8a33;box-shadow:0 3px 0 #2f6a26}
.kf-stat.s-life .wl-ic{color:#1d4a17}
.kf-stat .kf-boost{font-size:.8em;color:#9fdcff}
.kf-stat.bump{animation:wl-bump .6s}
.kf-flags{display:flex;gap:.3em}
.kf-goal{display:flex;align-items:center;gap:.35em;padding:.15em .25em;padding-inline-start:.75em;border-radius:99px;background:rgba(246,240,220,.1);border:1px solid rgba(246,240,220,.22);white-space:nowrap}
.kf-gev{font-weight:800;color:#f3ecd2;font-size:.92em}
.kf-goal .kf-gs{font-size:.84em;padding:.1em .5em;background:rgba(246,240,220,.1);color:#e2dcbd}
.kf-goal .kf-gs i{color:rgba(246,240,220,.4)}
.kf-goal .kf-gs.on{background:linear-gradient(180deg,#fff2c4,#f8d98a);color:#3a2608}
.kf-goal .kf-gs.on i{color:#d98e26}
.kf-goal.low .kf-stat.s-life{background:linear-gradient(180deg,#f8d98a,#e8a43a);border-color:#b96f12;box-shadow:0 3px 0 #8a5a12;color:#3a2608}
.kf-goal.low .kf-stat.s-life .wl-ic{color:#8a5a12}
.kf-bar .kf-q{width:2.4em;padding:0!important;display:grid;place-items:center}
.kf-bar .kf-q .wl-ic{width:1.45em;height:1.45em;color:#2f6a26}
.kf-flag{display:flex;align-items:center;gap:.25em;padding:.2em .6em;border-radius:99px;background:rgba(240,180,76,.22);color:#f8d98a;font-size:.85em;font-weight:800;white-space:nowrap}
.kf-sp{flex:1}
.kf-bar .wl-btn{min-height:2.4em;padding:.25em 1em;font-size:.95em}
.kf-mid{flex:1;min-height:0;display:flex;gap:.8em}
.kf-board{position:relative;flex:1;min-width:0;border-radius:20px;padding:.35em .6em;display:flex;flex-direction:column;justify-content:space-around;gap:.25em}
.kf-row{position:relative;flex:1;min-height:0;display:flex;align-items:center;gap:.6em;border-radius:14px;padding:0 .4em}
.kf-row[data-r="0"]{background:linear-gradient(270deg,rgba(95,174,74,.22),rgba(95,174,74,.05))}
.kf-row[data-r="1"]{background:linear-gradient(270deg,rgba(143,190,90,.2),rgba(143,190,90,.04))}
.kf-row[data-r="2"]{background:linear-gradient(270deg,rgba(150,110,60,.22),rgba(150,110,60,.05))}
.kf-rl{flex:none;width:6.6em;display:flex;flex-direction:column;gap:.05em}
.kf-rl b{font-family:var(--serif);font-size:1.3em;line-height:1.05;color:#1f2c1a}
.kf-rl small{font-size:.8em;line-height:1.2;color:var(--ink2);font-weight:600}
.kf-slots{flex:1;display:flex;justify-content:space-evenly;align-items:center}
.kf-slot{--cw:min(6em,11.4vh);position:relative;width:var(--cw);height:calc(var(--cw) * 1.42);border-radius:.8em;transition:transform .2s}
.kf-slot.empty{border:3px dashed rgba(79,120,60,.45);background:rgba(255,255,255,.3);display:grid;place-items:center;color:rgba(79,120,60,.5)}
.kf-slot.empty .wl-ic{width:2em;height:2em}
.kf-slot .wl-card{--cw:min(6em,11.4vh);cursor:pointer}
.kf-slot.fresh .wl-card{animation:kf-land .5s cubic-bezier(.2,.9,.3,1.3) both}
.kf-slot.wilted .wl-card{filter:grayscale(.95) brightness(.88) sepia(.25);opacity:.72}
.kf-wb{position:absolute;bottom:-.2em;left:50%;transform:translateX(-50%);z-index:4;display:flex;align-items:center;gap:.2em;padding:.1em .55em;border-radius:99px;background:#7a6a4a;color:#fbf6e5;font-size:.72em;font-weight:800;white-space:nowrap}
.kf-wb .wl-ic{width:1.1em;height:1.1em}
.kf-slot.ok{cursor:pointer}
.kf-slot.ok::after{content:"";position:absolute;inset:-.25em;border-radius:1em;border:3px solid var(--leaf2);box-shadow:0 0 1em rgba(143,208,103,.8);animation:kf-breath 1.4s ease-in-out infinite;pointer-events:none;z-index:5}
.kf-slot.ok.empty{background:rgba(143,208,103,.35)}
.kf-slot.swap::after{border-color:var(--amber2);box-shadow:0 0 1em rgba(240,180,76,.8)}
.kf-slot.hot{transform:scale(1.07)}
.kf-slot.hint::after{content:"";position:absolute;inset:-.3em;border-radius:1em;border:3px solid var(--amber);box-shadow:0 0 1.2em rgba(240,180,76,.95);animation:kf-breath 1s ease-in-out infinite;pointer-events:none;z-index:5}
.kf-sw{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:6;display:none;width:2.2em;height:2.2em;border-radius:50%;background:var(--amber);color:#3a2608;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.kf-slot.swap .kf-sw{display:grid}
.kf-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:3}
.kf-svg path{fill:none;stroke-linecap:round}
.kf-svg .th{stroke:#f0b44c;stroke-width:4;opacity:.9;filter:drop-shadow(0 0 3px rgba(255,200,90,.95))}
.kf-svg .th.w2{stroke-width:6.5;stroke:#ffd36b}
.kf-svg .th.new{stroke-dasharray:var(--len) var(--len);animation:kf-draw .8s ease-out both,kf-glow 1.6s .8s ease-in-out 2}
.kf-svg circle{fill:#ffe39a;filter:drop-shadow(0 0 3px rgba(255,200,90,.95))}
/* side */
.kf-side{flex:none;width:15.5em;display:flex;flex-direction:column;gap:.45em;min-height:0;overflow:hidden}
.kf-evhead{display:flex;align-items:center;justify-content:space-between;color:#f3ecd2;font-weight:800;font-size:.95em}
.kf-dots{display:flex;gap:.25em}
.kf-dots i{width:.8em;height:.8em;border-radius:50%;background:rgba(246,240,220,.2)}
.kf-dots i.ok{background:var(--leaf)}.kf-dots i.no{background:#c9a26a}.kf-dots i.gd{background:#9fdcff}.kf-dots i.cur{box-shadow:0 0 0 .18em var(--amber)}
.kf-evtop{display:flex;gap:.6em;align-items:center}
.kf-evtop .wl-flip{--cw:min(6.4em,12vh);flex:none}
.kf-evf{position:absolute;inset:0;border-radius:.8em;padding:.32em;background:linear-gradient(150deg,#ffe9a8,#e8a43a 45%,#9c6512);box-shadow:0 .5em 1.2em rgba(0,0,0,.35)}
.kf-evf.good{background:linear-gradient(150deg,#d6f1ff,#5fb3d9 45%,#2c5f8f)}
.kf-evf>div{height:100%;border-radius:.55em;background:#f6efd8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4em;padding:.4em;text-align:center}
.kf-evf .wl-ic{width:5em;height:5em;color:#c46a1c}
.kf-evf.good .wl-ic{color:#2c7fb8}
.kf-evf b{font-family:var(--serif);font-size:1.25em;line-height:1.05;color:#1f2c1a}
.kf-peek{flex:1;min-width:0;display:flex;flex-direction:column;gap:.3em;color:#e2dcbd;font-size:.92em;font-weight:700;line-height:1.25}
.kf-peek .kf-when{font-size:1.05em;color:#f6eed0}
.kf-pk{display:flex;align-items:center;gap:.3em;padding:.15em .5em;border-radius:99px;background:rgba(246,240,220,.12);font-size:.9em;white-space:nowrap;overflow:hidden}
.kf-pk .wl-ic{color:var(--amber);width:1.15em;height:1.15em}
.kf-info{border-radius:16px;padding:.6em .8em;display:flex;flex-direction:column;gap:.3em;min-height:0;flex:0 1 auto;overflow-y:auto}
.kf-cont{flex:none;display:flex;justify-content:center}.kf-cont:empty{display:none}
.kf-info h3{font-family:var(--serif);font-size:1.35em;line-height:1.1;color:#1f2c1a;display:flex;align-items:center;gap:.3em}
.kf-info h3 .wl-ic{color:#c46a1c}
.kf-info p{font-size:.95em;line-height:1.35;color:#2c3524}
.kf-need{display:flex;align-items:center;gap:.4em;font-weight:800;color:#3a2608;background:rgba(240,180,76,.2);border-radius:10px;padding:.25em .55em;font-size:.95em}
.kf-need .wl-ic{color:#b96f12}
.kf-res{display:flex;align-items:center;gap:.4em;font-family:var(--serif);font-weight:700;font-size:1.15em;line-height:1.2;border-radius:10px;padding:.3em .55em;animation:wl-rise .35s both}
.kf-res.ok{background:linear-gradient(180deg,#e3f5d3,#c8eab0);color:#1d4a17}
.kf-res.no{background:#f3e6cf;color:#5a3b22}
.kf-res .wl-ic{width:1.4em;height:1.4em}
.kf-cont .wl-btn{min-height:2.5em;padding:.3em 1.4em;font-size:1em;margin-top:.15em}
.kf-owl{margin-top:auto;flex:none;display:flex;align-items:flex-end;gap:.3em}
.kf-owlsvg{flex:none;width:4.6em;height:5em;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))}
.kf-owlsvg .kf-eyes{animation:kf-blink 5s infinite;transform-origin:50px 41px}
.kf-bub{position:relative;flex:1;min-width:0;margin-bottom:1.4em;padding:.5em .75em;border-radius:14px 14px 14px 4px;background:#fbf6e5;color:#2c3524;font-weight:700;font-size:.93em;line-height:1.3;box-shadow:0 4px 12px rgba(0,0,0,.25);animation:wl-rise .35s both}
.kf-bub b{color:#2f6a26}
.kf-bub small{display:block;color:#8a5a12;font-weight:800;margin-bottom:.1em}
/* message + hand */
.kf-msg{flex:none;min-height:2.1em;display:flex;align-items:center;justify-content:center}
.kf-msg>div{display:flex;align-items:center;gap:.5em;max-width:96%;padding:.25em 1.2em;border-radius:99px;font-family:var(--serif);font-weight:700;font-size:1.06em;line-height:1.25;animation:wl-rise .35s both}
.kf-msg .ok{background:linear-gradient(180deg,#fff2c4,#f8d98a);color:#3a2608}
.kf-msg .ok .wl-ic{color:#b96f12}
.kf-msg .tip{color:#e2dcbd;font-family:var(--sans);font-weight:600}
.kf-msg .tip .wl-ic{color:var(--amber)}
.kf-msg .no{background:#fbf6e5;color:#5a3b22}
.kf-bottom{flex:none;display:flex;align-items:flex-end;gap:.8em}
.kf-deck{flex:none;width:6.6em;display:flex;flex-direction:column;align-items:center;gap:.2em;color:#e2dcbd;font-weight:800;font-size:.9em;padding-bottom:.6em;text-align:center;line-height:1.2}
.kf-deck .wl-ic{width:2.4em;height:2.4em;color:#8fd067}
.kf-hand{flex:1;display:flex;gap:.7em;justify-content:center;align-items:flex-end;min-height:calc(min(6.2em,11.6vh) * 1.42 + 2.1em)}
.kf-hc{position:relative;display:flex;flex-direction:column;align-items:center;gap:.2em;cursor:grab;touch-action:none;transition:transform .2s,opacity .2s}
.kf-hc .wl-card{--cw:min(6.2em,11.6vh);pointer-events:none}
.kf-hc:hover{transform:translateY(-.4em)}
.kf-hc.sel{transform:translateY(-.8em)}
.kf-hc.sel .wl-card{box-shadow:0 0 0 .22em var(--leaf),0 0 1.2em rgba(143,208,103,.8),0 .5em 1.2em rgba(0,0,0,.35)}
.kf-hc.hint .wl-card{box-shadow:0 0 0 .22em var(--amber),0 0 1.4em rgba(240,180,76,.9)}
.kf-hc.hint{animation:kf-breath 1s ease-in-out infinite}
.kf-hc.lift{opacity:.25}
.kf-hc.off{opacity:.55}
.kf-chip{width:calc(min(6.2em,11.6vh) + .8em);height:2.35em;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:.2em;padding:.1em .55em;border-radius:99px;background:rgba(246,240,220,.16);color:#f3ecd2;font-size:.74em;font-weight:800;line-height:1.1;text-align:center}
.kf-chip.tool{background:#d8ecfa;color:#1d3f5f;border-radius:8px}
.kf-chip .wl-ic{width:1.1em;height:1.1em}
.kf-borrow{position:absolute;bottom:.25em;left:-.4em;z-index:3;padding:.08em .5em;border-radius:99px;background:#7d8f9b;color:#fff;font-size:.72em;font-weight:900;transform:rotate(-8deg);box-shadow:0 2px 5px rgba(0,0,0,.3)}
.kf-use{position:absolute;bottom:20%;left:50%;transform:translateX(-50%);z-index:4;white-space:nowrap;min-height:2.3em!important;padding:.2em .9em!important;font-size:.95em!important}
.kf-acts{flex:none;width:6.6em;display:flex;flex-direction:column;gap:.4em;align-items:stretch;padding-bottom:.6em}
.kf-acts .wl-btn{min-height:2.4em;padding:.25em .5em;font-size:.86em;line-height:1.15}
.kf-ghost{position:fixed;z-index:60;pointer-events:none;transform:translate(-50%,-50%) rotate(-3deg) scale(1.06);filter:drop-shadow(0 14px 18px rgba(0,0,0,.4))}
.kf-ghost .wl-card{--cw:min(6.2em,11.6vh)}
.kf-float{position:absolute;z-index:8;pointer-events:none;font-weight:900;font-size:1.3em;color:#ffe39a;text-shadow:0 2px 6px rgba(0,0,0,.6);animation:kf-up 1.2s ease-out both}
/* end */
.kf-done{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(8,20,12,.6);backdrop-filter:blur(3px);animation:wl-in .3s both}
.kf-done[hidden]{display:none}
.kf-dbox{width:min(40em,94%);border-radius:22px;padding:1.2em 1.6em 1.3em;display:flex;flex-direction:column;align-items:center;gap:.6em;text-align:center;animation:wl-pop .45s cubic-bezier(.2,.9,.3,1.25) both}
.kf-dbox h2{font-family:var(--serif);font-size:2.1em;line-height:1.05;color:#1f2c1a}
.kf-dbox p{color:var(--ink2);font-size:1.08em}
.kf-stars{display:flex;gap:.3em;color:rgba(80,70,40,.2)}
.kf-stars .wl-ic{width:3em;height:3em}
.kf-stars .on{color:var(--amber);filter:drop-shadow(0 4px 10px rgba(217,142,38,.55));animation:wl-star .6s cubic-bezier(.2,.9,.3,1.4) both}
.kf-stars .on:nth-child(2){animation-delay:.15s}.kf-stars .on:nth-child(3){animation-delay:.3s}
.kf-sum{display:flex;gap:.6em;flex-wrap:wrap;justify-content:center}
.kf-sum span{display:flex;align-items:center;gap:.3em;padding:.25em .8em;border-radius:99px;background:rgba(95,174,74,.15);font-weight:800;color:#1f2c1a}
.kf-sum .wl-ic{color:var(--moss)}
.kf-pack{display:flex;align-items:center;gap:.4em;font-weight:800;color:#8a5a12}
.kf-dbox.lost h2{color:#5a3b22}
.kf-tip{display:flex;align-items:center;gap:.5em;padding:.45em .9em;border-radius:12px;background:rgba(240,180,76,.22);color:#3a2608;font-size:1.02em;line-height:1.35;text-align:right}
.kf-tip .wl-ic{flex:none;width:1.5em;height:1.5em;color:#b96f12}
.kf-btns .wl-btn .wl-ic{width:1.2em;height:1.2em}
.kf-btns{display:flex;gap:.7em;flex-wrap:wrap;justify-content:center;margin-top:.2em}
.kf-key{position:absolute;top:-.55em;left:-.5em;z-index:6;width:2em;height:2em;border-radius:50%;display:grid;place-items:center;pointer-events:none;color:#5a1838;
  background:radial-gradient(circle at 38% 32%,#fff3c4,#f6cf72 45%,#e79aab 85%);box-shadow:0 0 0 .14em #fff6dc,0 0 .9em .2em rgba(246,207,114,.85),0 .2em .4em rgba(0,0,0,.3);animation:kf-keyglow 1.8s ease-in-out infinite}
.kf-key .wl-ic{width:1.25em;height:1.25em}
.kf-key.used{background:#cfc6ae;color:#7a6f58;box-shadow:0 0 0 .14em #f3ecd6,0 .15em .3em rgba(0,0,0,.25);animation:none;opacity:.85}
.kf-rb{position:absolute;top:-.45em;left:-.45em;z-index:6;padding:.05em .45em;border-radius:99px;pointer-events:none;font-style:normal;font-weight:900;font-size:.82em;line-height:1.4;direction:ltr;color:#4a2c06;
  background:linear-gradient(180deg,#ffe9a8,#e8a43a);box-shadow:0 0 0 .12em #fff6dc,0 .15em .35em rgba(0,0,0,.3)}
.kf-hc .kf-key,.kf-hc .kf-rb{top:1.9em}
.kf-slot.keyfire .wl-card{animation:kf-keypop .9s cubic-bezier(.2,.9,.3,1.3) both}
.kf-slot.keyfire::before{content:"";position:absolute;inset:-.5em;border-radius:1.2em;z-index:5;pointer-events:none;border:3px solid #f6cf72;box-shadow:0 0 1.4em .4em rgba(246,207,114,.9),inset 0 0 1em rgba(231,154,171,.7);animation:kf-keyring 1.6s ease-out 2 both}
.kf-rbm{font-family:var(--sans);font-size:.85em;color:#8a5a12}
.kf-kfloat{display:flex;align-items:center;gap:.25em;white-space:nowrap;padding:.15em .7em;border-radius:99px;font-size:1.15em;color:#4a1c34;text-shadow:none;background:linear-gradient(90deg,#fff2c4,#f6cf72,#f3c3cf);box-shadow:0 0 1em rgba(246,207,114,.9),0 .2em .5em rgba(0,0,0,.3);animation:kf-up 2s ease-out both}
.kf-kfloat .wl-ic{width:1.1em;height:1.1em;color:#b3306a}
.kf-res b{font-weight:900}
.kf-res.key{background:linear-gradient(90deg,#fff2c4,#f6d6de);color:#4a1c34}
.kf-res.key .wl-ic{color:#b3306a}
.kf-dots i.key{background:linear-gradient(135deg,#f6cf72,#e79aab)}
.kf-sum .kf-skey{background:linear-gradient(90deg,#fff2c4,#f6d6de)}.kf-sum .kf-skey .wl-ic{color:#b3306a}
.kf-hrar{display:flex;gap:.6em;width:100%}
.kf-hr{flex:1;display:flex;align-items:center;gap:.6em;padding:.35em .8em;border-radius:12px;font-size:.98em;line-height:1.3;color:#2c3524}
.kf-hr.e{background:linear-gradient(90deg,rgba(246,207,114,.3),rgba(231,154,171,.22))}.kf-hr.r{background:rgba(240,180,76,.18)}
.kf-hr b{color:#1f2c1a}
.kf-hr .kf-key,.kf-hr .kf-rb{position:static;flex:none;animation:none}
.kf-hr .kf-key{width:1.9em;height:1.9em}
@keyframes kf-keyglow{0%,100%{box-shadow:0 0 0 .14em #fff6dc,0 0 .6em .1em rgba(246,207,114,.6),0 .2em .4em rgba(0,0,0,.3)}50%{box-shadow:0 0 0 .14em #fff6dc,0 0 1.2em .35em rgba(246,207,114,.95),0 .2em .4em rgba(0,0,0,.3)}}
@keyframes kf-keyring{0%{opacity:0;transform:scale(.85)}25%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
@keyframes kf-keypop{0%{transform:scale(1)}35%{transform:scale(1.14) rotate(-2deg)}100%{transform:none}}
@keyframes kf-draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes kf-glow{0%,100%{opacity:.9}50%{opacity:1;stroke-width:7}}
@keyframes kf-land{0%{transform:scale(1.25);opacity:.4}100%{transform:none;opacity:1}}
@keyframes kf-breath{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes kf-blink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes kf-up{0%{opacity:0;transform:translate(-50%,0) scale(.6)}20%{opacity:1;transform:translate(-50%,-.4em) scale(1.1)}100%{opacity:0;transform:translate(-50%,-2.6em) scale(1)}}
@media (max-height:820px){.kf-side.resolved .kf-evtop{display:none}}
@media (max-height:520px){.kf-side{gap:.3em}.kf-evtop .wl-flip{--cw:min(4.8em,11vh)}.kf-evf .wl-ic{width:3.4em;height:3.4em}.kf-info{padding:.4em .6em;min-height:3.4em}.kf-info h3{font-size:1.05em}.kf-info p{font-size:.84em;line-height:1.3}
  .kf-owlsvg{width:2.6em!important;height:2.9em!important}.kf-bub{margin-bottom:.2em;padding:.35em .6em;font-size:.82em;max-height:4.6em;overflow-y:auto;scrollbar-width:thin}}
@media (max-height:720px){.kf-phead h1{font-size:2.1em}.kf-hsteps p{font-size:.9em}.kf-hp{height:5.6em}.kf-side{width:14.5em}.kf-owlsvg{width:3.8em;height:4.2em}}
/* round 2: gentle colour – each forest card in its own paper */
.kf-bt[data-b="amazon"]{--paper:#dbe5d6}.kf-bt[data-b="amazon"] h2{color:#1f5f58}
.kf-bt[data-b="grove"]{--paper:#ece0c4}.kf-bt[data-b="grove"] h2{color:#55601f}
.kf-bt[data-b="reef"]{--paper:#d3e7ec}.kf-bt[data-b="reef"] h2{color:#1d6680}
.kf-bt[data-b="reef"].on{border-color:#2a8ac0!important;box-shadow:0 0 0 4px rgba(64,160,210,.45),var(--shadow)}
.kf-bt[data-b="amazon"].on{border-color:#3f8f84!important;box-shadow:0 0 0 4px rgba(79,163,154,.45),var(--shadow)}
.kf-bt[data-b="grove"].on{border-color:#b07a12!important;box-shadow:0 0 0 4px rgba(236,199,126,.55),var(--shadow)}
.kf-goalbox{--paper:#ece6d0}
.kf-gline .kf-gs:nth-child(1){background:rgba(140,195,220,.25)}.kf-gline .kf-gs:nth-child(2){background:rgba(242,207,91,.28)}.kf-gline .kf-gs:nth-child(3){background:rgba(231,154,171,.25)}
`;
function injectCss() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const st = document.createElement('style'); st.id = CSS_ID;
  st.textContent = CSS.replace(/(^|[,{}\n])\s*\.kf-/g, '$1#wol-learn.wol-learn .kf-');
  document.head.appendChild(st);
}

/* ───────────────────────────── the game */
export function mountKeepForest(root, ctx, opts = {}) {
  injectCss();
  const esc = ctx.esc;
  const kids = !!ctx.kids();
  const ST = Object.assign({ best: {}, pack: {}, biome: 'amazon', runs: 0 }, ctx.store('keepforest') || {});
  ST.best = ST.best || {}; ST.pack = ST.pack || {};
  const save = () => ctx.store('keepforest', ST);
  let biome = BIOMES.includes(opts.biome) ? opts.biome : (BIOMES.includes(ST.biome) ? ST.biome : 'amazon');
  let S = null, alive = true, sel = null, drag = null, ghost = null, ro = null, seenThreads = new Set();
  let uidN = 1, quiet = false;
  const offs = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
  const $ = (s) => root.querySelector(s);
  const later = (fn, ms) => ctx.later(() => { if (alive) fn(); }, ms);
  const C = (ref) => ctx.CARD.get(ref.id);
  // words that follow the place: the forest (יער, masculine) or the reef (שונית, feminine)
  const reef = () => (S ? S.biome : biome) === 'reef';
  const Y = (f, r) => (reef() ? r : f);
  const ROWN = () => (reef() ? ROWS_REEF : ROWS);
  const ROWSH = () => (reef() ? ROW_SHORT_REEF : ROW_SHORT);
  const icOf = (D) => I[(reef() && D.ric) || D.ic];
  const tipOf = (id) => (reef() && EV[id].rtip) || EV[id].tip;
  const needOf = (ev) => EV[ev.id].need(ev.need, S ? S.biome : biome);
  // the 'canopy' of the reef is its corals in the shallow water
  const canopyCard = (c) => !c.sp.animal && (!reef() || c.sp.kind === 'coral');

  /* ── deck building */
  function usable(b) {
    const owned = ctx.owned() || {};
    const all = ctx.CARDS.filter((c) => owned[c.id] > 0 && (c.biome === b || (c.type === 'tool' && toolOk(c, b))));
    if (all.length <= DECK_MAX) return all;
    // trim: up to 4 tools + the species with the most links to the rest of the collection (a little random each run)
    const L = linksFor(ctx, b);
    const sp = all.filter((c) => c.type === 'species');
    const tools = shuffle(all.filter((c) => c.type === 'tool')).slice(0, 4);
    const sc = new Map(sp.map((c) => [c, sp.reduce((s, d) => s + (d !== c && L.get(c.sp.id, d.sp.id) ? 1 : 0), 0) + Math.random() * 3]));
    const keep = [];
    for (let r = 0; r < 3; r++) keep.push(...sp.filter((c) => !c.sp.animal && layerRow(c.sp) === r).sort((x, y) => sc.get(y) - sc.get(x)).slice(0, LAYER_NEED[r]));
    const rest = sp.filter((c) => !keep.includes(c)).sort((x, y) => sc.get(y) - sc.get(x));
    while (keep.length < DECK_MAX - tools.length && rest.length) keep.push(rest.shift());
    return [...keep, ...tools];
  }
  function starter(b, mine, n, layersOnly = false) {
    const L = linksFor(ctx, b);
    const have = new Set(mine.map((c) => c.id));
    const out = [];
    const tools = mine.filter((c) => c.type === 'tool').length;
    if (!layersOnly) for (const id of (b === 'reef' ? ['tool:buoy', 'tool:nursery', 'tool:rov'] : ['tool:watergen', 'tool:listener', 'tool:seeddrone'])) {
      if (out.length >= Math.max(0, Math.min(n, 2 - tools))) break;
      if (!have.has(id) && ctx.CARD.get(id)) { out.push(ctx.CARD.get(id)); have.add(id); }
    }
    const inDeck = () => [...mine, ...out].filter((c) => c.type === 'species');
    const cand = () => ctx.CARDS.filter((c) => c.biome === b && c.type === 'species' && !have.has(c.id));
    const score = (c) => inDeck().reduce((s, d) => s + (L.get(c.sp.id, d.sp.id) ? 0.6 : 0), 0) + L.deg(c.sp.id) * 0.1 + Math.random() * 1.6;
    const take = (c) => { out.push(c); have.add(c.id); };
    // make sure every forest layer has at least a plant or two
    const need = LAYER_NEED;
    for (let r = 0; r < 3; r++) {
      while (out.length < n && inDeck().filter((c) => !c.sp.animal && layerRow(c.sp) === r).length < need[r]) {
        const list = cand().filter((c) => !c.sp.animal && layerRow(c.sp) === r).sort((x, y) => score(y) - score(x));
        if (!list.length) break; take(list[0]);
      }
    }
    while (out.length < n) {
      const list = cand().sort((x, y) => score(y) - score(x));
      if (!list.length) break; take(list[0]);
    }
    return out;
  }
  function biomeInfo(b) {
    const mine = usable(b);
    // a deck needs plants in every layer, or whole events can't be met: borrow the missing ones
    const deficit = [0, 1, 2].reduce((s, r) => s + Math.max(0, LAYER_NEED[r] - mine.filter((c) => c.type === 'species' && !c.sp.animal && layerRow(c.sp) === r).length), 0);
    const small = mine.length < MIN_DECK;
    const add = small ? Math.max(TOPUP - mine.length, deficit) : deficit;
    return { mine, add, layersOnly: !small };
  }

  /* ── a new run */
  function buildEvents(b) {
    const N = kids ? 5 : 8;
    const nGood = kids ? 1 : 2;
    let ch = shuffle(challengesFor(b)).slice(0, N - nGood);
    const firstI = ch.findIndex((id) => ['drought', 'hunters', 'clouds', 'heat'].includes(id));
    if (firstI > 0) { const [f] = ch.splice(firstI, 1); ch.unshift(f); }
    const goods = shuffle(['rain', 'bloom']).slice(0, nGood);
    const list = ch.slice();
    if (kids) list.splice(2, 0, goods[0]); else { list.splice(2, 0, goods[0]); list.splice(5, 0, goods[1]); }
    const sp = ctx.CARDS.filter((c) => c.biome === b && c.type === 'species');
    const avgW = sp.reduce((s, c) => s + mid(c), 0) / sp.length;
    const avgL = sp.reduce((s, c) => s + c.stats.light, 0) / sp.length;
    return list.map((id, i) => ({ id, i, need: reqOf(id, i, avgW, avgL) }));
  }
  function reqOf(id, i, avgW, avgL) {
    const E = Math.min(9, 2 * (i + 1)) * 0.8; // roughly how many cards are in the forest by then
    const k = kids ? 0.6 : 1;
    switch (id) {
      case 'drought': return Math.max(2, Math.round(E * avgW * 0.7 * k));
      case 'hunters': return Math.max(2, Math.round(E * avgW * 0.7 * k));
      case 'clouds': return Math.max(2, Math.round(E * avgL * 0.7 * k));
      case 'heat': return kids ? 1 : (i < 3 ? 1 : 2);
      case 'flood': return kids ? 1 : (i < 4 ? 1 : 2);
      case 'storm': return Math.max(1, Math.round(E * 0.5 * k));
      case 'logging': return Math.max(2, Math.round(E * 0.95 * k));
      case 'road': return Math.max(1, Math.round(E * 0.55 * k));
      case 'treefall': return kids ? 1 : (i < 3 ? 1 : 2);
      default: return 0;
    }
  }
  function newRun(b) {
    const { mine, add, layersOnly } = biomeInfo(b);
    const refs = mine.map((c) => ({ uid: uidN++, id: c.id, borrowed: false }));
    if (add > 0) starter(b, mine, add, layersOnly).forEach((c) => refs.push({ uid: uidN++, id: c.id, borrowed: true }));
    // shuffle until the first hand has at least two forest cards (one of them a plant)
    let deck = shuffle(refs);
    for (let t = 0; t < 30; t++) {
      const h = deck.slice(0, HAND).map(C);
      if (h.filter((c) => c.type === 'species').length >= 2 && h.some((c) => c.type === 'species' && !c.sp.animal)) break;
      deck = shuffle(refs);
    }
    S = { biome: b, L: linksFor(ctx, b), deck, discard: [], used: [], hand: [], board: Array(9).fill(null), turn: 0,
      events: buildEvents(b), evIdx: 0, results: [], revealed: new Set(), bonus: 0, watch: false, waterBoost: 0, nest: false, insect: false,
      fish: false, phase: 'play', cur: null, lost: null, swaps: 0, keyUsed: new Set(), keyIntro: new Set(), rareDone: new Set(), keySaves: 0, rareBonus: 0, stars: 0, borrowed: refs.filter((r) => r.borrowed).length, owned: mine.length, says: null };
    seenThreads = new Set();
    draw(HAND);
  }
  function draw(n) {
    for (let k = 0; k < n && S.hand.length < HAND_MAX; k++) {
      if (!S.deck.length && S.discard.length) S.deck = shuffle(S.discard.splice(0));
      if (!S.deck.length) return;
      S.hand.push(S.deck.shift());
    }
  }

  /* ── board helpers */
  const rowOfCard = (c) => (c && c.type === 'species' ? (layerRow(c.sp) ?? 2) : -1);
  const slotRow = (k) => Math.floor(k / 3);
  const healthy = (k) => S.board[k] && !S.board[k].wilted;
  const free = (k) => !S.board[k] || S.board[k].wilted;
  const rowSlots = (r) => [r * 3, r * 3 + 1, r * 3 + 2];
  function legal(ref) {
    const c = C(ref); if (!c || c.type !== 'species') return { slots: [], swap: false };
    const r = rowOfCard(c);
    let f = rowSlots(r).filter(free);
    if (f.length) return { slots: f, swap: false };
    if (c.sp.animal) { f = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(free); if (f.length) return { slots: f, swap: false }; }
    return { slots: rowSlots(r), swap: true };
  }
  function threadsOf(board) {
    const out = [];
    for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) {
      const a = board[i], b = board[j]; if (!a || !b || a.wilted || b.wilted) continue;
      const ca = C(a.ref), cb = C(b.ref);
      const e = S.L.get(ca.sp.id, cb.sp.id); if (!e) continue;
      let w = 1;
      if (S.nest && (BIRDS.has(ca.sp.id) || BIRDS.has(cb.sp.id))) w++;
      if (S.insect && (INSECTS.has(ca.sp.id) || INSECTS.has(cb.sp.id))) w++;
      if (S.fish && (FISH.has(ca.sp.id) || FISH.has(cb.sp.id))) w++;
      out.push({ i, j, e, w, key: a.ref.uid + '-' + b.ref.uid });
    }
    return out;
  }
  function totals(board = S.board) {
    let light = 0, water = 0;
    board.forEach((b) => { if (b && !b.wilted) { const c = C(b.ref); light += c.stats.light; water += mid(c); } });
    const th = threadsOf(board);
    const tw = th.reduce((s, t) => s + t.w, 0);
    return { light, water, threads: th.length, tw, life: Math.max(0, tw + S.bonus), th };
  }
  // rarity powers
  const isKey = (ref) => C(ref).rarity === 'epic';
  const keyCharged = (ref) => isKey(ref) && !S.keyUsed.has(ref.uid);
  const rareReady = (ref) => C(ref).rarity === 'rare' && !S.rareDone.has(ref.uid);
  // a rare card that ties a gold thread as it is placed gets +1 (each rare card once per run)
  const rareGain = (ref, newThreads) => (newThreads.length && rareReady(ref) ? 1 : 0);
  // the charged keystone that steps in when the forest is not ready: a healthy epic card, the best connected first
  function keystone() {
    const th = totals().th; let best = -1, bs = -1;
    for (let k = 0; k < 9; k++) {
      if (!healthy(k) || !keyCharged(S.board[k].ref)) continue;
      const n = th.filter((t) => t.i === k || t.j === k).length;
      if (n > bs) { bs = n; best = k; }
    }
    return best;
  }
  const plantsIn = (r) => rowSlots(r).filter((k) => healthy(k) && !C(S.board[k].ref).sp.animal).length;
  const cardsIn = (r) => rowSlots(r).filter(healthy).length;
  const canopyIn = () => rowSlots(0).filter((k) => healthy(k) && canopyCard(C(S.board[k].ref))).length;
  const evName = (ev) => EV[ev.id].name[S.biome];
  const turnsToEvent = () => 2 - (S.turn % 2);

  function check(ev) {
    const T = totals(); const n = ev.need;
    switch (EV[ev.id].kind) {
      case 'water': { const have = T.water + S.waterBoost; return { ok: have >= n, have: `מים: ${have}` }; }
      case 'light': return { ok: T.light >= n, have: `אור: ${T.light}` };
      case 'shelter': return { ok: T.water >= n, have: `מחסה: ${T.water}` };
      case 'canopy': { const h = canopyIn(); return { ok: h >= n, have: `${Y('צמחים בחופה', 'אלמוגים במים הרדודים')}: ${h}` }; }
      case 'floor': { const h = plantsIn(2); return { ok: h >= n, have: `${Y('צמחים בקרקע', 'בקרקעית')}: ${h}` }; }
      case 'mid': { const h = cardsIn(1); return { ok: h >= n, have: `${Y('קלפים בביניים', 'קלפים במדרון')}: ${h}` }; }
      case 'threads': return { ok: T.threads >= n, have: `חוטי זהב: ${T.threads}` };
      case 'watch': return S.watch ? { ok: true, have: 'כלי שמירה פעיל', guard: true } : { ok: T.life >= n, have: `חִיּוּת: ${T.life}` };
      case 'watchThreads': return S.watch ? { ok: true, have: 'כלי שמירה פעיל', guard: true } : { ok: T.threads >= n, have: `חוטי זהב: ${T.threads}` };
      default: return { ok: true, have: '' };
    }
  }
  function weakest(rows) {
    let best = -1, bs = Infinity;
    for (let k = 0; k < 9; k++) {
      if (!healthy(k) || (rows && !rows.includes(slotRow(k)))) continue;
      const c = C(S.board[k].ref); const s = c.stats.light + mid(c) + c.stats.links + Math.random() * 0.1;
      if (s < bs) { bs = s; best = k; }
    }
    return best;
  }

  /* ── actions */
  function place(hi, k) {
    if (!S || S.phase !== 'play') return false;
    const ref = S.hand[hi]; if (!ref) return false;
    const lg = legal(ref); if (!lg.slots.includes(k)) return false;
    const before = new Set(totals().th.map((t) => t.key));
    const old = S.board[k];
    if (old) S.discard.push(old.ref);
    if (old && !old.wilted) S.swaps = (S.swaps || 0) + 1;
    S.board[k] = { ref, wilted: false, fresh: true };
    S.hand.splice(hi, 1); sel = null;
    const T = totals();
    const fresh = T.th.filter((t) => !before.has(t.key));
    const c = C(ref);
    const rb = rareGain(ref, fresh);
    if (C(ref).rarity === 'rare') S.rareDone.add(ref.uid);
    fresh.rb = rb; S.bonus += rb; S.rareBonus += rb;
    if (fresh.length) {
      ctx.sfx('link');
      const gain = fresh.reduce((s, t) => s + t.w, 0) + rb;
      msg('ok', `${I.thread}<span>${esc(fresh.slice(0, 2).map((t) => t.e.text).join(' '))} <b>\u2066+${gain}\u2069 חִיּוּת</b>${rb ? ' <span class="kf-rbm">(כולל <bdi dir="ltr">+1</bdi> לקלף נדיר)</span>' : ''}</span>`);
      const o = fresh[0]; const other = C(S.board[o.i === k ? o.j : o.i].ref);
      say(`יפה! <b>${esc(dn(c))}</b> ו<b>${esc(dn(other))}</b> ${genderOf(c.sp.id)[0] === 'f' && genderOf(other.sp.id)[0] === 'f' ? 'קשורות' : 'קשורים'} – ${Y('היער מתחזק', 'השונית מתחזקת')}.`);
    } else {
      ctx.sfx('click');
      msg('tip', `${I.life}<span>${esc(dn(c))} ${c.sp.animal ? gw(c.sp.id, 'הגיע', 'הגיעה', 'הגיעו', 'הגיעו') + Y(' ליער', ' לשונית') : reef() ? gw(c.sp.id, 'גדל', 'גדלה', 'גדלים', 'גדלות') + ' בשונית' : gw(c.sp.id, 'נשתל', 'נשתלה', 'נשתלו', 'נשתלו') + ' ביער'}. ${old && !old.wilted ? 'הקלף הקודם חזר לחפיסה.' : ''}</span>`);
      say(old && old.wilted ? 'הקלף הנובל פינה מקום לחדש. כל הכבוד!' : `גם זה טוב. נסו למצוא קלף שקשור למי שכבר ${Y('ביער', 'בשונית')} – כך נמתח חוט זהב.`);
    }
    // first time a keystone comes to the forest: the owl tells what it can do
    const intro = isKey(ref) && !S.keyIntro.has(ref.uid);
    if (intro) S.keyIntro.add(ref.uid);
    endTurn(fresh);
    if (intro && S.phase === 'play' && keyCharged(ref)) say(`<small>${I.key} מין מפתח!</small><b>${esc(dn(c))}</b> ${gw(c.sp.id, 'הוא מין מפתח: הרבה יצורים צריכים אותו', 'היא מין מפתח: הרבה יצורים צריכים אותה', 'הם מין מפתח: הרבה יצורים צריכים אותם', 'הן מין מפתח: הרבה יצורים צריכים אותן')}. ${Y('אם היער לא יהיה מוכן', 'אם השונית לא תהיה מוכנה')} לאירוע – ${gw(c.sp.id, 'הוא ישמור', 'היא תשמור', 'הם ישמרו', 'הן ישמרו')} ${Y('עליו', 'עליה')}, פעם אחת.`);
    return true;
  }
  function canUse(ref) {
    const c = C(ref); if (!c || c.type !== 'tool') return { ok: false };
    const t = c.tool.id;
    const wilt = (animal) => S.board.some((b) => b && b.wilted && !!C(b.ref).sp.animal === animal);
    if ((t === 'seeddrone' || t === 'nursery') && !wilt(false)) return { ok: false, why: 'אין עכשיו צמח נובל' };
    if (t === 'rescue' && !wilt(true)) return { ok: false, why: 'אין עכשיו בעל חיים נובל' };
    if ((t === 'weather' || t === 'camera' || t === 'sensor' || t === 'uwcam') && S.evIdx >= S.events.length) return { ok: false, why: 'אין עוד אירועים' };
    if (t === 'nestbox' && S.nest) return { ok: false, why: 'תיבת קינון כבר פועלת' };
    if (t === 'insecthotel' && S.insect) return { ok: false, why: 'מלון חרקים כבר פועל' };
    if (t === 'reefball' && S.fish) return { ok: false, why: 'שונית מלאכותית כבר מונחת' };
    return { ok: true };
  }
  function useTool(hi) {
    if (!S || S.phase !== 'play') return false;
    const ref = S.hand[hi]; const c = ref && C(ref); if (!c || c.type !== 'tool') return false;
    const u = canUse(ref); if (!u.ok) { msg('no', `${I.bulb}<span>${esc(u.why || 'אי אפשר עכשיו')}</span>`); return false; }
    S.hand.splice(hi, 1); S.used.push(ref); sel = null;
    const t = c.tool.id; let text = '';
    const revive = (animal) => {
      let best = -1, bs = -1;
      S.board.forEach((b, k) => { if (b && b.wilted && !!C(b.ref).sp.animal === animal) { const s = C(b.ref).stats.links; if (s > bs) { bs = s; best = k; } } });
      if (best >= 0) { S.board[best].wilted = false; S.board[best].fresh = true; return dn(C(S.board[best].ref)); }
      return '';
    };
    if (t === 'watergen') { S.waterBoost += 4; text = 'המחולל אוסף מים מהאוויר: \u2066+4\u2069 מים לאירוע הבא.'; }
    else if (t === 'weather') { S.revealed.add(S.evIdx); const ev = S.events[S.evIdx]; text = `תחנת מזג האוויר מזהירה: ${evName(ev)}! ${EV[ev.id].good ? '' : 'צריך: ' + needOf(ev)}`; }
    else if (t === 'sensor') { S.revealed.add(S.evIdx); const ev = S.events[S.evIdx]; text = `מצוף החיישנים מזהיר: ${evName(ev)}! ${EV[ev.id].good ? '' : 'צריך: ' + needOf(ev)}`; }
    else if (t === 'uwcam') { for (let i = S.evIdx; i < Math.min(S.events.length, S.evIdx + 3); i++) S.revealed.add(i); S.watch = true; text = 'המצלמה התת־ימית מגלה מה מחכה לשונית, ושומרת עליה.'; }
    else if (t === 'rov') { draw(2); S.watch = true; text = 'הרובוט הצולל שוחה לאורך השונית: שלפתם 2 קלפים, והוא שומר עליה.'; }
    else if (t === 'buoy') { S.watch = true; text = 'מצוף העגינה במקום: סירות ייקשרו אליו ולא יטילו עוגן על האלמוגים.'; }
    else if (t === 'nursery') { text = `משתלת האלמוגים החזירה לחיים את ${revive(false)}!`; }
    else if (t === 'reefball') { S.fish = true; text = 'שונית מלאכותית הונחה על החול: מעכשיו חוטים של דגים שווים פי 2.'; }
    else if (t === 'camera') { for (let i = S.evIdx; i < Math.min(S.events.length, S.evIdx + 3); i++) S.revealed.add(i); S.watch = true; text = 'המצלמה מגלה מה מחכה ליער, ושומרת עליו.'; }
    else if (t === 'drone') { draw(2); S.watch = true; text = 'הרחפן טס מעל היער: שלפתם 2 קלפים, והוא שומר על היער.'; }
    else if (t === 'listener') { S.watch = true; text = 'מאזין היער מקשיב. אם יבואו לכרות או לסלול כביש – הוא יזעיק עזרה.'; }
    else if (t === 'seeddrone') { text = `רחפן הזריעה החזיר לחיים את ${revive(false)}!`; }
    else if (t === 'rescue') { text = `רובוט ההצלה החזיר לחיים את ${revive(true)}!`; }
    else if (t === 'nestbox') { S.nest = true; text = 'תיבת קינון נתלתה: מעכשיו חוטים של ציפורים שווים פי 2.'; }
    else if (t === 'insecthotel') { S.insect = true; text = 'מלון חרקים נפתח: מעכשיו חוטים של חרקים שווים פי 2.'; }
    ctx.sfx('discover');
    msg('ok', `${I.check}<span>${esc(text)}</span>`);
    say(`כלי הוא עזרה מהירה – אחריו עדיין אפשר לשים קלף ${Y('ביער', 'בשונית')}.`);
    render();
    return true;
  }
  function skip() {
    if (!S || S.phase !== 'play') return;
    sel = null; ctx.sfx('click');
    // put one card back so the hand refreshes
    if (S.hand.length) S.discard.push(S.hand.shift());
    msg('tip', `${I.skip}<span>דילגתם על התור: קלף אחד חזר לחפיסה וקיבלתם קלף אחר.</span>`);
    endTurn([]);
  }
  function endTurn(fresh) {
    S.turn++;
    if (S.turn % 2 === 0 && S.evIdx < S.events.length) startEvent(fresh);
    else { draw(HAND - S.hand.length); preEventTip(); render(fresh); }
  }
  function preEventTip() {
    if (S.evIdx >= S.events.length) return;
    const ev = S.events[S.evIdx];
    if (turnsToEvent() === 1 || kids) {
      const known = S.revealed.has(S.evIdx);
      if (turnsToEvent() === 1) say(`<small>${known ? 'אני יודע מה בא:' : Y('הרוח לוחשת לי...', 'הגלים לוחשים לי...')}</small>${esc(tipOf(ev.id))}`);
    }
    if (kids) { const h = bestMove(); if (h && turnsToEvent() !== 1) say(hintText(h)); }
    const left = S.events.length - S.evIdx, t1 = thresholds()[0], life = totals().life;
    if (left <= 2 && life < t1) say(`<small>שימו לב!</small>${Y('ליער', 'לשונית')} יש עכשיו ${life} חִיּוּת. כדי ${Y('שיחזיק', 'שתחזיק')} מעמד צריך לפחות <b>${t1}</b> בסוף – חברו חוטי זהב!`);
  }
  function startEvent(fresh) {
    S.phase = 'event';
    const ev = S.events[S.evIdx];
    S.cur = { ev, shown: false, res: null };
    render(fresh);
    // flip, then resolve
    later(() => {
      if (!S || !S.cur || S.cur.ev !== ev) return;
      const f = $('.kf-evtop .wl-flip'); if (f) f.classList.add('is-up');
      ctx.sfx('select');
      later(() => resolve(), 850);
    }, 450);
  }
  function resolve() {
    if (!S || S.phase !== 'event' || !S.cur || S.cur.res) return;
    const ev = S.cur.ev; const D = EV[ev.id];
    let res;
    if (D.good) {
      if (ev.id === 'rain') { S.bonus += 2; res = { ok: true, good: true, text: Y('היער שמח בגשם', 'השונית שמחה במים הצלולים') + ': \u2066+2\u2069 חִיּוּת!' }; }
      else { draw(2); res = { ok: true, good: true, text: Y('פריחה!', 'לילה של הטלה!') + ' שלפתם 2 קלפים.' }; }
    } else {
      const c = check(ev);
      if (c.ok) {
        S.bonus += 1;
        if (c.guard) S.watch = false;
        res = { ok: true, have: c.have, text: (c.guard ? 'כלי השמירה הזעיק עזרה בזמן. ' : '') + Y('היער החזיק מעמד!', 'השונית החזיקה מעמד!') + ' \u2066+1\u2069 חִיּוּת' };
      } else if (keystone() >= 0) {
        // a keystone species holds the forest together: nothing wilts, no −1 (once per keystone card)
        const k = keystone(); const b = S.board[k]; const kc = C(b.ref);
        S.keyUsed.add(b.ref.uid); S.keySaves++; b.fx = 'key';
        const head = `${dn(kc)} ${gw(kc.sp.id, 'הוא', 'היא', 'הם', 'הן')} מין מפתח – ${gw(kc.sp.id, 'הוא שמר', 'היא שמרה', 'הם שמרו', 'הן שמרו')} על ${Y('היער', 'השונית')}!`;
        res = { ok: true, key: k, have: c.have, head, text: `${dn(kc)} ${gw(kc.sp.id, 'שמר', 'שמרה', 'שמרו', 'שמרו')} על ${Y('היער', 'השונית')}.` };
      } else {
        const k = ev.id === 'treefall' ? (weakest([0]) >= 0 ? weakest([0]) : weakest()) : weakest();
        S.bonus -= 1;
        let nm = '';
        if (k >= 0) { S.board[k].wilted = true; const wc = C(S.board[k].ref); nm = `${dn(wc)} ${gw(wc.sp.id, 'נבל', 'נבלה', 'נבלו', 'נבלו')} קצת`; }
        res = { ok: false, have: c.have, wilted: k, text: nm ? `${nm}. \u2066−1\u2069 חִיּוּת` : Y('היער עוד קטן', 'השונית עוד קטנה') + ' – \u2066−1\u2069 חִיּוּת' };
      }
    }
    S.waterBoost = 0;
    S.cur.res = res;
    S.results.push(res.good ? 'gd' : res.key != null ? 'key' : res.ok ? 'ok' : 'no');
    ctx.sfx(res.ok ? 'mission' : 'click');
    if (res.key != null) say(`<small>${I.key} מין מפתח</small>הרבה יצורים ${Y('ביער', 'בשונית')} צריכים אותו – לכן הוא מחזיק את כל ${Y('היער', 'השונית')}.`);
    else if (res.ok) say(res.good ? 'איזו מתנה מהטבע!' : Y('<b>היער החזיק מעמד!</b> כל הכבוד ששמרתם עליו.', '<b>השונית החזיקה מעמד!</b> כל הכבוד ששמרתם עליה.'));
    else say(res.wilted >= 0 ? `לא נורא! קלף נובל אפשר להחזיר לחיים עם <b>${Y('רחפן זריעה', 'משתלת אלמוגים')}</b> או <b>רובוט הצלה</b> – או לשים עליו קלף חדש.` : 'לא נורא, ממשיכים לבנות.');
    render();
    if (res.key != null && !quiet) {
      ctx.toast(`${I.key}<span>${esc(res.head)}</span>`);
      later(() => ctx.sfx('discover'), 380);
      const sl = root.querySelector(`.kf-slot[data-s="${res.key}"]`), bd = $('.kf-board');
      if (sl) ctx.confetti(sl, 26, ['#f6cf72', '#e79aab', '#b9a8e0', '#fff1c4']);
      if (sl && bd) { // "מין מפתח!" rises from the card
        const r1 = sl.getBoundingClientRect(), r0 = bd.getBoundingClientRect();
        const f = document.createElement('div'); f.className = 'kf-float kf-kfloat'; f.innerHTML = `${I.key}<span>מין מפתח!</span>`;
        f.style.left = (r1.left - r0.left + r1.width / 2) + 'px'; f.style.top = (r1.top - r0.top + r1.height * 0.3) + 'px';
        bd.appendChild(f); later(() => f.remove(), 2000);
      }
    } else if (res.ok && !res.good && !quiet) { const b = $('.kf-board'); if (b) ctx.confetti(b, 14); }
  }
  function cont() {
    if (!S || S.phase !== 'event' || !S.cur || !S.cur.res) return false;
    S.evIdx++; S.cur = null;
    if (S.evIdx >= S.events.length) { finish(); return true; }
    // the forest can also give out in the middle: every card wilted (or still nothing planted after 2 events)
    const any = S.board.some(Boolean), alive2 = S.board.some((b) => b && !b.wilted);
    if (!alive2 && (any || S.evIdx >= 2)) { S.lost = 'wilted'; finish(); return true; }
    S.phase = 'play';
    draw(HAND - S.hand.length);
    preEventTip();
    render();
    return true;
  }

  /* ── hints / auto play */
  function bestMove() {
    if (!S || S.phase !== 'play') return null;
    const nextEv = S.events[S.evIdx];
    const kind = nextEv && !EV[nextEv.id].good ? EV[nextEv.id].kind : null;
    const base = totals();
    let best = null;
    S.hand.forEach((ref, hi) => {
      const c = C(ref); if (c.type !== 'species') return;
      const lg = legal(ref);
      for (const k of lg.slots) {
        const nb = S.board.slice(); nb[k] = { ref, wilted: false };
        const T = totals(nb);
        const rb = rareGain(ref, T.th.filter((t) => t.i === k || t.j === k));
        let sc = (T.tw - base.tw + rb) * 3 + (c.stats.light + mid(c) + c.stats.links) * 0.15;
        if (kind === 'water' || kind === 'shelter') sc += mid(c) * 0.5;
        if (kind === 'light') sc += c.stats.light * 0.5;
        if (kind === 'canopy' && canopyCard(c) && slotRow(k) === 0 && !healthy(k)) sc += 3;
        if (kind === 'floor' && !c.sp.animal && slotRow(k) === 2 && !healthy(k)) sc += 3;
        if (kind === 'mid' && slotRow(k) === 1 && !healthy(k)) sc += 2.5;
        if (S.board[k] && !S.board[k].wilted) sc -= 1.5;
        if (S.board[k] && S.board[k].wilted) sc += 0.8;
        const newT = T.th.filter((t) => (t.i === k || t.j === k));
        if (!best || sc > best.sc) best = { hi, k, sc, ref, link: newT[0] };
      }
    });
    return best;
  }
  function hintText(h) {
    const c = C(h.ref);
    const r = ROWN()[slotRow(h.k)];
    if (h.link) { const o = C(S.board[h.link.i === h.k ? h.link.j : h.link.i].ref); return `נסו לשים את <b>${esc(dn(c))}</b> ב${esc(r)} – ${gw(c.sp.id, 'הוא קשור', 'היא קשורה', 'הם קשורים', 'הן קשורות')} <b>${esc(prefName('ל', o.sp.id, o.name))}</b>!`; }
    return `נסו לשים את <b>${esc(dn(c))}</b> ב${esc(r)}.`;
  }
  function showHint() {
    const h = bestMove(); if (!h) { say('אין כרגע קלף לשים – אפשר להפעיל כלי או לדלג.'); return; }
    root.querySelectorAll('.hint').forEach((e) => e.classList.remove('hint'));
    const hc = root.querySelector(`.kf-hc[data-i="${h.hi}"]`), sl = root.querySelector(`.kf-slot[data-s="${h.k}"]`);
    if (hc) hc.classList.add('hint'); if (sl) sl.classList.add('hint');
    ctx.sfx('select'); say(hintText(h));
    later(() => { root.querySelectorAll('.hint').forEach((e) => e.classList.remove('hint')); }, 3200);
  }
  function autoStep(mode) {
    if (!S) return false;
    if (mode === 'random' && S.phase === 'play') {
      const opts = [];
      S.hand.forEach((r, i) => { const c = C(r); if (c.type === 'tool') { if (canUse(r).ok && Math.random() < 0.5) opts.push(() => useTool(i)); } else legal(r).slots.forEach((k) => opts.push(() => place(i, k))); });
      if (!opts.length) { skip(); return true; }
      return opts[rnd(opts.length)]();
    }
    if (S.phase === 'event') { if (!S.cur.res) resolve(); return cont(); }
    if (S.phase !== 'play') return false;
    const nextEv = S.events[S.evIdx];
    // useful tools first
    for (let i = 0; i < S.hand.length; i++) {
      const c = C(S.hand[i]); if (c.type !== 'tool' || !canUse(S.hand[i]).ok) continue;
      const t = c.tool.id;
      const soon = turnsToEvent() === 1 && nextEv;
      if (t === 'watergen' && !(soon && nextEv.id === 'drought')) continue;
      if ((t === 'listener' || t === 'buoy') && S.watch) continue;
      useTool(i); return true;
    }
    const m = bestMove();
    if (m) return place(m.hi, m.k);
    skip(); return true;
  }

  /* ── finish */
  const thresholds = () => (kids ? STAR_T.kids : STAR_T.full);
  function starsFor(life) {
    const [t1, t2, t3] = thresholds();
    return life >= t3 ? 3 : life >= t2 ? 2 : life >= t1 ? 1 : 0;
  }
  function loseTip(T) {
    const fails = S.results.filter((r) => r === 'no').length, hard = S.results.filter((r) => r !== 'gd').length;
    if (S.lost === 'wilted') return `כשקלף נובל, שימו עליו קלף חדש – כך ${Y('היער נשאר חי', 'השונית נשארת חיה')}.`;
    if ((S.swaps || 0) >= 2) return 'לא כדאי להחליף קלף שכבר מחובר בחוט זהב – שימו קלפים חדשים במקומות ריקים.';
    if (T.threads < 4) return `חפשו קלפים שקשורים למי שכבר ${Y('ביער', 'בשונית')} – כל חוט זהב נותן חִיּוּת.`;
    if (fails * 2 >= hard) return `הסתכלו בצד מה האירוע הבא צריך, והכינו את ${Y('היער', 'השונית')} מראש.`;
    return `נסו לחבר עוד חוטי זהב, ולהכין את ${Y('היער', 'השונית')} לפני כל אירוע.`;
  }
  function finish() {
    S.phase = 'end';
    const T = totals();
    const stars = S.lost ? 0 : starsFor(T.life);
    S.stars = stars;
    if (quiet) return; // simulated runs: no storage, no UI
    const lost = stars === 0;
    const [t1, t2, t3] = thresholds();
    const prev = ST.best[S.biome] || 0;
    ST.best[S.biome] = Math.max(prev, stars); ST.biome = S.biome; ST.runs = (ST.runs || 0) + 1;
    let gotPack = false;
    if (stars === 3 && !ST.pack[S.biome]) { ST.pack[S.biome] = 1; gotPack = true; }
    save();
    if (gotPack) ctx.grantPack(1);
    ctx.sfx(lost ? 'click' : 'mission');
    render();
    const held = S.results.filter((r) => r === 'ok').length, hard = S.results.filter((r) => r !== 'gd').length;
    const nextT = stars === 1 ? t2 : stars === 2 ? t3 : 0;
    const d = $('.kf-done'); if (!d) return;
    const sum = `<div class="kf-sum"><span>${I.life} חִיּוּת ${T.life}</span><span>${I.thread} ${T.threads} חוטי זהב</span><span>${ctx.STAT_ICON.light} אור ${T.light}</span><span>${Y(ctx.STAT_ICON.water, ctx.STAT_ICON.shelter)} ${Y('מים', 'מחסה')} ${T.water}</span>${S.keySaves ? `<span class="kf-skey">${I.key} מין מפתח שמר ${S.keySaves === 1 ? 'פעם אחת' : S.keySaves + ' פעמים'}</span>` : ''}</div>`;
    d.innerHTML = lost ? `<div class="kf-dbox paper lost">
      <div class="kf-stars">${[0, 1, 2].map(() => `<span>${I.star}</span>`).join('')}</div>
      <h2>${Y('היער נחלש', 'השונית נחלשה')} מדי – נסו שוב!</h2>
      <p>${S.lost === 'wilted' ? Y('כל הקלפים ביער נבלו, והיער לא החזיק מעמד.', 'כל הקלפים בשונית נבלו, והשונית לא החזיקה מעמד.') : `בסוף היו ${Y('ליער', 'לשונית')} ${T.life} חִיּוּת. כדי ${Y('שהיער יחזיק', 'שהשונית תחזיק')} מעמד צריך לפחות ${t1}.`}</p>
      ${sum}
      <div class="kf-tip">${I.bulb}<span><b>טיפ:</b> ${esc(loseTip(T))}</span></div>
      <div class="kf-btns">
        <button class="wl-btn go" data-a="again">${icon('again')}נסו שוב</button>
        <button class="wl-btn" data-a="how">${I.quest}<span>איך משחקים?</span></button>
        <button class="wl-btn" data-a="setup">${icon('place')}בחירת מקום</button>
      </div></div>`
      : `<div class="kf-dbox paper">
      <div class="kf-stars">${[0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}">${I.star}</span>`).join('')}</div>
      <h2>${stars === 3 ? Y('ניצחתם! יער חזק ומלא חיים!', 'ניצחתם! שונית חזקה ומלאה חיים!') : stars === 2 ? Y('ניצחתם! היער שלכם פורח!', 'ניצחתם! השונית שלכם פורחת!') : Y('ניצחתם! היער החזיק מעמד!', 'ניצחתם! השונית החזיקה מעמד!')}</h2>
      <p>${Y('היער עבר', 'השונית עברה')} את כל ${S.events.length} האירועים, ${Y('והיה מוכן', 'והייתה מוכנה')} ל-${held} מתוך ${hard} אתגרים.</p>
      ${sum}
      <p>${nextT ? `ל-${stars + 1} כוכבים צריך ${nextT} חִיּוּת – עוד ${nextT - T.life}. נסו לחבר עוד חוטי זהב!` : 'שלושה כוכבים – כל הכבוד!'}</p>
      ${gotPack ? `<div class="kf-pack">${I.star}<span>שלושה כוכבים ראשונים ${Y('ביער הזה', 'בשונית')} – קיבלתם חבילת קלפים!</span></div>` : ''}
      ${S.borrowed ? `<p style="font-size:.95em">הקלפים השאולים חזרו לערכת ההתחלה. קלפים משלכם מקבלים בחידון ובחבילות.</p>` : ''}
      <div class="kf-btns">
        <button class="wl-btn go" data-a="again">${icon('again')}עוד סיבוב</button>
        <button class="wl-btn" data-a="setup">${icon('place')}בחירת מקום</button>
        <button class="wl-btn gold" data-a="album">${icon('album')}לאלבום</button>
      </div></div>`;
    d.hidden = false;
    if (!lost) ctx.confetti(d.querySelector('.kf-dbox'), stars * 12);
  }

  /* ── "איך משחקים?" – illustrated rules (shown the first time, and from the ? button) */
  function howHTML() {
    const N = kids ? 5 : 8;
    const [t1, t2, t3] = thresholds();
    const b = S ? S.biome : biome;
    const L = linksFor(ctx, b);
    const sp = ctx.CARDS.filter((c) => c.biome === b && c.type === 'species');
    let pair = null;
    for (const a of sp) { if (pair) break; if (!a.art) continue; for (const c of sp) if (c !== a && c.art && L.get(a.sp.id, c.sp.id) && a.sp.animal !== c.sp.animal) { pair = [a, c]; break; } }
    pair = pair || sp.slice(0, 2);
    const plant = sp.find((c) => !c.sp.animal && layerRow(c.sp) === 0 && c.art) || sp[0];
    const tool = ctx.CARD.get(b === 'reef' ? 'tool:buoy' : 'tool:watergen') || ctx.CARDS.find((c) => c.type === 'tool');
    const st = (n) => `<span class="kf-hst">${Array.from({ length: n }, () => I.star).join('')}</span>`;
    const pics = {
      place: `<div class="kf-hp kf-hp-rows">${ROWSH().map((w) => `<i>${w}</i>`).join('')}<div class="kf-hcard">${ctx.cardHTML(plant)}</div></div>`,
      thread: `<div class="kf-hp kf-hp-pair">${ctx.cardHTML(pair[0])}<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M2 20Q30 -4 58 20" stroke="#f0b44c" stroke-width="4" fill="none" stroke-linecap="round"/></svg>${ctx.cardHTML(pair[1])}<b dir="ltr">+1</b></div>`,
      event: `<div class="kf-hp kf-hp-ev"><div class="kf-hev">${Y(I.sun, I.cloud)}<small>${Y('בצורת', 'מים עכורים')}</small></div><div class="kf-hneed"><span>${Y(I.drop + 'מים', ctx.STAT_ICON.shelter + 'מחסה')}</span><span>${I.sun}אור</span><span>${I.thread}קשרים</span></div></div>`,
      tool: `<div class="kf-hp kf-hp-tool">${tool ? ctx.cardHTML(tool) : ''}<b>1</b></div>`,
      stars: `<div class="kf-hp kf-hp-stars"><span>${st(1)}<b>${t1}</b></span><span>${st(2)}<b>${t2}</b></span><span>${st(3)}<b>${t3}</b></span></div>`,
    };
    const steps = kids ? [
      ['place', 'שמים קלף', Y('בכל תור שמים קלף אחד ביער. צמח גדל רק בקומה שלו.', 'בכל תור שמים קלף אחד בשונית. אלמוג או צמח גדל רק בשורה שלו.')],
      ['thread', 'חוט זהב', 'יצורים שקשורים זה לזה מקבלים חוט זהב. כל חוט = \u2066+1\u2069 חִיּוּת.'],
      ['stars', 'כוכבים', `כל 2 תורות הטבע מביא אירוע. בסוף מקבלים כוכבים לפי החִיּוּת.`],
    ] : [
      ['place', 'שמים קלף', Y('בכל תור שמים קלף אחד ביער. צמח גדל רק בקומה שלו: חופה, ביניים או קרקע.', 'בכל תור שמים קלף אחד בשונית. אלמוג או צמח גדל רק בשורה שלו: מים רדודים, מדרון או קרקעית.')],
      ['thread', 'חוט זהב', 'יצורים שקשורים בטבע מקבלים חוט זהב. כל חוט = \u2066+1\u2069 חִיּוּת.'],
      ['event', 'הטבע מביא אירוע', Y('כל 2 תורות הטבע הופך קלף ומראה מה היער צריך. יער מוכן מקבל \u2066+1\u2069, ואם לא – קלף אחד נובל.', 'כל 2 תורות הטבע הופך קלף ומראה מה השונית צריכה. שונית מוכנה מקבלת \u2066+1\u2069, ואם לא – קלף אחד נובל.')],
      ['tool', 'כלים עוזרים', 'קלפי טכנולוגיה עוזרים פעם אחת, ולא תופסים את התור.'],
      ['stars', 'כוכבים בסוף', `בסוף מקבלים כוכבים לפי החִיּוּת של ${Y('היער', 'השונית')}.`],
    ];
    const first = !ST.seenHow;
    return `<div class="kf-how" role="dialog" aria-label="איך משחקים">
      <div class="kf-hbox paper${kids ? ' kids' : ''}">
        <div class="kf-hgoal">${I.target}<div><small>המטרה</small><b>${Y('לשמור על היער חי ובריא', 'לשמור על השונית חיה ובריאה')} במשך ${N} אירועים של הטבע</b></div></div>
        <ol class="kf-hsteps">${steps.map(([p, t, x], i) => `<li>${pics[p]}<h4><span>${i + 1}</span>${t}</h4><p>${x}</p></li>`).join('')}</ol>
        <div class="kf-hrar">
          <span class="kf-hr e"><i class="kf-key">${I.key}</i><span><b>נדיר מאוד = מין מפתח.</b> ${Y('אם היער לא מוכן לאירוע – הוא שומר עליו', 'אם השונית לא מוכנה לאירוע – הוא שומר עליה')}, פעם אחת.</span></span>
          <span class="kf-hr r"><i class="kf-rb">+1</i><span><b>נדיר:</b> אם הוא מתחבר בחוט זהב כשמניחים אותו – עוד <bdi dir="ltr">+1</bdi> חִיּוּת.</span></span>
        </div>
        <div class="kf-hlose">${I.wilt}<span><b>אפשר גם להפסיד:</b> ${kids ? `אם בסוף יש ${Y('ליער', 'לשונית')} פחות מ-${t1} חִיּוּת – ${Y('היער לא החזיק', 'השונית לא החזיקה')} מעמד, ומנסים שוב.` : `אם החִיּוּת של ${Y('היער', 'השונית')} יורדת מתחת ל-${t1} בסוף, או ש${Y('כל היער נובל – היער לא החזיק', 'כל השונית נובלת – השונית לא החזיקה')} מעמד. לא נורא, מנסים שוב!`}</span></div>
        <div class="kf-hleg">
          <span><i class="kf-borrow kf-lb">שאול</i>קלף שקיבלתם בהשאלה לסיבוב הזה (עוד אין לכם אותו באלבום)</span>
          ${kids ? `<span><i class="kf-lt">${I.bulb}רמז</i>שומר היער מראה קלף טוב</span>` : `<span><i class="kf-lt">${I.skip}דילוג</i>מחזירים קלף אחד לחפיסה ומוותרים על התור</span><span><i class="kf-lt w">${I.wilt}נובל</i>קלף חלש שלא נותן חִיּוּת – אפשר לשים עליו קלף חדש</span>`}
        </div>
        <button class="wl-btn go" data-a="howok">${icon('check')}${first && S ? 'הבנתי – מתחילים!' : 'הבנתי'}</button>
      </div></div>`;
  }
  function showHow() {
    const host = $('.wl-screen'); if (!host) return;
    const old = host.querySelector('.kf-how'); if (old) old.remove();
    host.insertAdjacentHTML('beforeend', howHTML());
    ctx.sfx('select');
  }
  function hideHow() {
    root.querySelectorAll('.kf-how').forEach((e) => e.remove());
    if (!ST.seenHow) { ST.seenHow = 1; save(); }
    ctx.sfx('click');
  }

  /* ── rendering */
  function msg(kind, html) { if (quiet) return; const m = $('.kf-msg'); if (m) m.innerHTML = `<div class="${kind}">${html}</div>`; if (S) S.lastMsg = { kind, html }; }
  function say(html) { if (S) S.says = html; if (quiet) return; const b = $('.kf-bub'); if (b) { b.innerHTML = html; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; } }

  // "⭐ 7 · ⭐⭐ 12 · ⭐⭐⭐ 17" – lit when reached (life = current vitality, or null on the setup screen)
  function goalStars(life = null) {
    return thresholds().map((t, i) => `<span class="kf-gs${life != null && life >= t ? ' on' : ''}" title="${i + 1} ${i ? 'כוכבים' : 'כוכב'} ב-${t} חִיּוּת"><i>${Array.from({ length: i + 1 }, () => I.star).join('')}</i>ב-${t}</span>`).join('');
  }
  function renderSetup() {
    S = null; sel = null; cleanupDrag();
    ctx.setTitle('מחזיקים את היער');
    const tile = (b) => {
      const { mine, add } = biomeInfo(b);
      const sp = mine.filter((c) => c.type === 'species');
      const show = (sp.length >= 3 ? sp : ctx.CARDS.filter((c) => c.biome === b && c.art)).slice(0, 3);
      const best = ST.best[b] || 0;
      return `<button class="kf-bt paper${b === biome ? ' on' : ''}" data-b="${b}">
        <h2>${tileIcon(b, 'wl-tic')}${BNAME[b]}</h2>
        <div class="kf-fan">${show.map((c) => ctx.cardHTML(c)).join('')}</div>
        <p>${mine.length ? `<b>${mine.length}</b> קלפים שלכם מתאימים` : 'עוד אין לכם קלפים מהמקום הזה'}${add ? `<br>ועוד ${add} קלפים שאולים מתוך ערכת ההתחלה` : ''}</p>
        <span class="kf-best">${[0, 1, 2].map((k) => `<span class="${k < best ? 'on' : ''}">${I.star}</span>`).join('')}</span>
      </button>`;
    };
    root.innerHTML = `<section class="wl-screen kf-pick">
      <div class="kf-phead"><h1>${tileIcon('keep', 'wl-tic')}מחזיקים את היער</h1><p>בונים יער מהקלפים שלכם, ועוזרים לו לעבור את מה שהטבע מביא.</p></div>
      <div class="kf-biomes">${BIOMES.map(tile).join('')}</div>
      <div class="kf-goalbox paper">
        <div class="kf-hgoal">${I.target}<div><small>המטרה</small><b>${Y('לשמור על היער חי ובריא', 'לשמור על השונית חיה ובריאה')} במשך ${kids ? 5 : 8} אירועים של הטבע</b></div></div>
        <div class="kf-gline">${goalStars()}<span class="kf-glose">${I.wilt}פחות מ-${thresholds()[0]} חִיּוּת בסוף – ${Y('היער לא החזיק', 'השונית לא החזיקה')} מעמד</span></div>
      </div>
      <div class="kf-pbtns"><button class="wl-btn" data-a="how">${I.quest}<span>איך משחקים?</span></button>
      <button class="wl-btn go" data-a="start">יוצאים ל${BNAME[biome]}!${icon('arrowL')}</button></div>
    </section>`;
  }

  function renderGame() {
    ctx.setTitle(`מחזיקים את היער · ${BNAME[S.biome]}`);
    root.innerHTML = `<section class="wl-screen kf-game">
      <div class="kf-bar"></div>
      <div class="kf-mid">
        <div class="kf-board paper">${[0, 1, 2].map((r) => `<div class="kf-row" data-r="${r}"><div class="kf-rl"><b>${ROWN()[r]}</b><small>${ROW_SUB[S.biome][r]}</small></div><div class="kf-slots">${rowSlots(r).map((k) => `<div class="kf-slot" data-s="${k}"></div>`).join('')}</div></div>`).join('')}<svg class="kf-svg" xmlns="http://www.w3.org/2000/svg"></svg></div>
        <aside class="kf-side"><div class="kf-evhead"></div><div class="kf-evtop"></div><div class="kf-info paper"></div><div class="kf-cont"></div>
          <div class="kf-owl">${OWL}<div class="kf-bub"></div></div></aside>
      </div>
      <div class="kf-msg"></div>
      <div class="kf-bottom"><div class="kf-deck"></div><div class="kf-hand"></div><div class="kf-acts"></div></div>
      <div class="kf-done" hidden></div>
    </section>`;
    if (typeof ResizeObserver !== 'undefined') { if (ro) ro.disconnect(); ro = new ResizeObserver(() => drawThreads(false)); ro.observe($('.kf-board')); }
    msg('tip', `${I.life}<span>${kids ? `בחרו קלף מלמטה ושימו אותו ${Y('ביער', 'בשונית')}` : `גררו קלף מהיד אל ${Y('היער', 'השונית')}, או לחצו על קלף ואחר כך על מקום`}</span>`);
    const hello = Y('שלום! אני שומר היער.', 'שלום! אני שומר היער, והיום אני שומר גם על השונית.');
    say(kids ? `${hello} בואו נבנה ${Y('יער חזק – כל חוט זהב נותן לו', 'שונית חזקה – כל חוט זהב נותן לה')} חִיּוּת.` : `${hello} כל חוט זהב בין יצורים נותן ${Y('ליער', 'לשונית')} חִיּוּת. בעוד 2 תורות הטבע יהפוך קלף ראשון.`);
    if (kids) { const h = bestMove(); if (h) say(hello + ' ' + hintText(h)); }
    render();
  }

  function render(fresh) {
    if (quiet || !S || !$('.kf-game')) return;
    const T = totals();
    // top bar
    const flags = [];
    if (S.watch) flags.push(`<span class="kf-flag">${I.eye} שומרים על ${Y('היער', 'השונית')}</span>`);
    if (S.nest) flags.push(`<span class="kf-flag">ציפורים פי 2</span>`);
    if (S.insect) flags.push(`<span class="kf-flag">חרקים פי 2</span>`);
    if (S.fish) flags.push(`<span class="kf-flag">דגים פי 2</span>`);
    $('.kf-bar').innerHTML = `
      <span class="kf-stat s-light" title="סכום האור של ${Y('היער', 'השונית')}">${ctx.STAT_ICON.light}<small>אור</small><b>${T.light}</b></span>
      <span class="kf-stat s-water" title="${Y('סכום המים של היער', 'סכום המחסה של השונית')}">${Y(ctx.STAT_ICON.water, ctx.STAT_ICON.shelter)}<small>${Y('מים', 'מחסה')}</small><b>${T.water}</b>${S.waterBoost ? `<span class="kf-boost">+${S.waterBoost}</span>` : ''}</span>
      <span class="kf-stat s-thr" title="חוטי זהב בין יצורים קשורים">${I.thread}<small>קשרים</small><b>${T.threads}</b></span>
      <span class="kf-goal${T.life < thresholds()[0] && S.events.length - S.evIdx <= 2 ? ' low' : ''}" title="המטרה: לעבור ${S.events.length} אירועים עם ${Y('יער חי', 'שונית חיה')}. הכוכבים נקבעים לפי החִיּוּת בסוף.">
        <span class="kf-gev">אירוע ${Math.min(S.evIdx + 1, S.events.length)} מתוך ${S.events.length}</span>
        <span class="kf-stat s-life${fresh && fresh.length ? ' bump' : ''}">${I.life}<small>חִיּוּת</small><b>${T.life}</b></span>
        ${goalStars(T.life)}
      </span>
      <span class="kf-flags">${flags.join('')}</span>
      <span class="kf-sp"></span>
      ${kids && S.phase === 'play' ? `<button class="wl-btn gold" data-a="hint">${I.bulb}<span>רמז</span></button>` : ''}
      <button class="wl-btn kf-q" data-a="how" title="איך משחקים?" aria-label="איך משחקים?">${I.quest}</button>
      <button class="wl-btn" data-a="setup">${icon('place')}<span>מקום אחר</span></button>`;
    renderBoard(fresh);
    renderSide();
    renderHand();
  }
  // rarity badge on a card: a glowing key while a keystone is charged (dim once used), "+1" while a rare bonus waits
  function rarBadge(ref, wilted) {
    const c = C(ref);
    if (c.rarity === 'epic') {
      const on = keyCharged(ref) && !wilted;
      return `<span class="kf-key${on ? '' : ' used'}" title="${on ? `מין מפתח: אם ${Y('היער לא מוכן לאירוע – שומר עליו', 'השונית לא מוכנה לאירוע – שומר עליה')} פעם אחת` : `מין מפתח: כבר שמר על ${Y('היער', 'השונית')} בסיבוב הזה`}">${I.key}</span>`;
    }
    if (c.rarity === 'rare' && rareReady(ref) && !wilted) return '<span class="kf-rb" title="קלף נדיר: אם הוא מתחבר בחוט זהב כשמניחים אותו – עוד \u2066+1\u2069 חִיּוּת">+1</span>';
    return '';
  }
  function renderBoard(fresh) {
    const lg = sel != null && S.phase === 'play' && S.hand[sel] ? legal(S.hand[sel]) : (drag && drag.moved && S.phase === 'play' && S.hand[drag.hi] ? legal(S.hand[drag.hi]) : null);
    root.querySelectorAll('.kf-slot').forEach((el) => {
      const k = +el.dataset.s; const b = S.board[k];
      const ok = lg && lg.slots.includes(k);
      el.className = `kf-slot${b ? '' : ' empty'}${b && b.wilted ? ' wilted' : ''}${b && b.fresh ? ' fresh' : ''}${b && b.fx === 'key' ? ' keyfire' : ''}${ok ? ' ok' : ''}${ok && b && !b.wilted ? ' swap' : ''}`;
      el.innerHTML = b ? `${ctx.cardHTML(C(b.ref))}${rarBadge(b.ref, b.wilted)}${b.wilted ? `<span class="kf-wb">${I.wilt}נובל</span>` : ''}<span class="kf-sw">${I.swap}</span>`
        : `${slotRow(k) === 0 ? ctx.IC.tree : slotRow(k) === 1 ? ctx.IC.seedling : ctx.IC.leaf}`;
      if (b) { b.fresh = false; b.fx = null; }
    });
    drawThreads(true, fresh);
  }
  function drawThreads(animate, fresh) {
    const board = $('.kf-board'), svg = $('.kf-svg'); if (!board || !svg || !S) return;
    const br = board.getBoundingClientRect(); if (!br.width) return;
    svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
    const T = totals();
    const ctr = (k) => { const el = root.querySelector(`.kf-slot[data-s="${k}"]`); const r = el.getBoundingClientRect(); return { x: r.left - br.left + r.width / 2, y: r.top - br.top + r.height / 2, w: r.width, h: r.height }; };
    const clip = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; const hx = a.w * 0.36, hy = a.h * 0.36; const t = Math.min(dx ? hx / Math.abs(dx) : Infinity, dy ? hy / Math.abs(dy) : Infinity, 0.45); return { x: a.x + dx * t, y: a.y + dy * t }; };
    let html = '';
    T.th.forEach((t, n) => {
      const A = ctr(t.i), B = ctr(t.j);
      let s = clip(A, B), e = clip(B, A);
      const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2; let L = Math.hypot(e.x - s.x, e.y - s.y);
      const bend = (n % 2 ? 1 : -1) * Math.min(40, L * 0.18);
      let cx = mx + (-(e.y - s.y) / (L || 1)) * bend, cy = my + ((e.x - s.x) / (L || 1)) * bend;
      const r1 = slotRow(t.i), r2 = slotRow(t.j);
      if (r1 === r2 && Math.abs(t.i - t.j) === 2) { // same row, card in between: arc through the gap between rows
        const up = r1 === 2; const dy = (up ? -1 : 1) * A.h * 0.5;
        s = { x: A.x, y: A.y + dy }; e = { x: B.x, y: B.y + dy }; cx = (A.x + B.x) / 2; cy = A.y + dy * 1.55; L = Math.abs(B.x - A.x) * 1.2;
      } else if (Math.abs(r1 - r2) === 2 && t.i % 3 === t.j % 3) { // straight down through the middle row: bow sideways
        cx = (s.x + e.x) / 2 + A.w * 0.9; cy = (s.y + e.y) / 2;
      }
      const isNew = animate && !seenThreads.has(t.key);
      html += `<path class="th${t.w > 1 ? ' w2' : ''}${isNew ? ' new' : ''}" style="--len:${Math.ceil(L * 1.2 + 10)}" d="M${s.x.toFixed(1)} ${s.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}"/><circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="4"/><circle cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="4"/>`;
    });
    svg.innerHTML = html;
    if (animate) {
      T.th.forEach((t) => seenThreads.add(t.key));
      if (fresh && fresh.length) {
        const t = fresh[0]; const A = ctr(t.i), B = ctr(t.j);
        const f = document.createElement('div'); f.className = 'kf-float';
        f.textContent = `\u2066+${fresh.reduce((s, x) => s + x.w, 0) + (fresh.rb || 0)}\u2069 חִיּוּת`;
        f.style.left = ((A.x + B.x) / 2) + 'px'; f.style.top = ((A.y + B.y) / 2) + 'px';
        board.appendChild(f); later(() => f.remove(), 1300);
      }
    }
  }
  function renderSide() {
    const N = S.events.length;
    const dots = S.events.map((e, i) => `<i class="${S.results[i] || ''}${i === S.evIdx ? ' cur' : ''}"></i>`).join('');
    $('.kf-evhead').innerHTML = `<span>אירוע ${Math.min(S.evIdx + 1, N)} מתוך ${N}</span><span class="kf-dots">${dots}</span>`;
    const top = $('.kf-evtop'), info = $('.kf-info'), cont = $('.kf-cont');
    cont.innerHTML = '';   // the continue button sits outside the info box so the owl below can never cover it
    const side = $('.kf-side'); side.classList.remove('resolved');
    const face = (ev) => { const D = EV[ev.id]; return `<div class="kf-evf${D.good ? ' good' : ''}"><div>${icOf(D)}<b>${esc(D.name[S.biome])}</b></div></div>`; };
    const flip = (ev, up) => `<div class="wl-flip${up ? ' is-up' : ''}"><div class="wl-fin"><div class="wl-face wl-fback">${ctx.backHTML()}</div><div class="wl-face wl-ffront">${ev ? face(ev) : ''}</div></div></div>`;
    if (S.phase === 'event' && S.cur) {
      const ev = S.cur.ev, D = EV[ev.id], r = S.cur.res;
      const existing = top.querySelector('.wl-flip');
      if (!existing || top.dataset.ev !== String(ev.i)) { top.innerHTML = flip(ev, false) + `<div class="kf-peek"><span class="kf-when">הטבע הופך קלף...</span></div>`; top.dataset.ev = String(ev.i); }
      else if (r) { existing.classList.add('is-up'); }
      if (r) {
        const pk = top.querySelector('.kf-peek'); if (pk) pk.innerHTML = `<span class="kf-when">${r.good ? 'מתנה מהטבע' : r.key != null ? 'מין מפתח עזר!' : r.ok ? Y('היער מוכן!', 'השונית מוכנה!') : Y('היער ילמד מזה', 'השונית תלמד מזה')}</span>`;
        // the outcome first: on small screens the story below may need scrolling, the result never does
        info.innerHTML = `<h3>${icOf(D)}${esc(D.name[S.biome])}</h3>
          <div class="kf-res ${r.key != null ? 'key' : r.ok ? 'ok' : 'no'}">${r.key != null ? I.key : r.ok ? I.check : I.wilt}<span>${r.key != null ? '<b>מין מפתח!</b> ' : ''}${esc(r.text)}</span></div>
          ${D.good ? '' : `<div class="kf-need">${I.bulb}<span>צריך: ${esc(needOf(ev))}${r.have ? ` · יש: ${esc(r.have.split(': ').pop())}` : ''}</span></div>`}
          <p>${esc(D.story[S.biome])}</p>`;
        // small screens: once the card has turned over, fold it away so the outcome has room (its name is the heading)
        later(() => { if (S && S.phase === 'event' && S.cur && S.cur.res) side.classList.add('resolved'); }, 1000);
        cont.innerHTML = `<button class="wl-btn go" data-a="cont">${S.evIdx + 1 >= N ? 'לסיכום' : 'ממשיכים'}${icon('arrowL')}</button>`;
      } else info.innerHTML = `<h3>${I.deck}<span>הטבע הופך קלף...</span></h3>`;
      return;
    }
    if (S.phase === 'end') { info.innerHTML = '<h3>הסיבוב הסתיים</h3>'; return; }
    // waiting for the next event
    const ev = S.events[S.evIdx];
    const known = S.revealed.has(S.evIdx);
    top.dataset.ev = '';
    const t2 = turnsToEvent();
    const peeks = [];
    for (let i = S.evIdx + 1; i < N; i++) if (S.revealed.has(i)) peeks.push(`<span class="kf-pk">${icOf(EV[S.events[i].id])}<span>אחר כך: ${esc(evName(S.events[i]))}</span></span>`);
    top.innerHTML = flip(known ? ev : null, known) + `<div class="kf-peek"><span class="kf-when">${t2 === 1 ? 'האירוע הבא – אחרי התור הזה!' : 'האירוע הבא בעוד 2 תורות'}</span>${peeks.join('')}</div>`;
    if (known) {
      const D = EV[ev.id];
      info.innerHTML = `<h3>${icOf(D)}${esc(D.name[S.biome])}</h3><p>${esc(D.story[S.biome])}</p>${D.good ? '' : `<div class="kf-need">${I.bulb}<span>צריך: ${esc(needOf(ev))}</span></div>`}`;
    } else {
      info.innerHTML = `<h3>${I.eye}<span>מה יביא הטבע?</span></h3><p>${t2 === 1 ? 'הקלף ייהפך אחרי התור הזה. שומר היער רומז מה בא.' : Y('תחנת מזג אוויר או מצלמת שטח יכולות לגלות מראש.', 'מצוף חיישנים או מצלמה תת־ימית יכולים לגלות מראש.')}</p>`;
    }
  }
  function renderHand() {
    const h = $('.kf-hand'); if (!h) return;
    h.innerHTML = S.hand.map((ref, i) => {
      const c = C(ref);
      let chip;
      if (c.type === 'tool') chip = `<span class="kf-chip tool">${esc(TOOL_FX[c.tool.id] || 'כלי עזר')}</span>`;
      else chip = `<span class="kf-chip">${c.sp.animal ? ctx.IC.paw : ctx.IC.leaf}<span>${c.sp.animal || (reef() && c.sp.kind === 'sessile') ? 'בעל חיים · ' : reef() && c.sp.kind === 'coral' ? 'אלמוג · ' : 'צמח · '}${ROWSH()[rowOfCard(c)]}</span></span>`;
      const off = c.type === 'tool' && !canUse(ref).ok;
      return `<div class="kf-hc${sel === i ? ' sel' : ''}${off ? ' off' : ''}" data-i="${i}" role="button" aria-label="${esc(c.name)}">${chip}${ctx.cardHTML(c)}${c.type === 'species' ? rarBadge(ref, false) : ''}${ref.borrowed ? '<span class="kf-borrow" title="קלף שאול: קיבלתם אותו בהשאלה לסיבוב הזה. עוד אין לכם אותו באלבום.">שאול</span>' : ''}${sel === i && c.type === 'tool' && !off ? '<button class="wl-btn gold kf-use" data-a="use">הפעלה</button>' : ''}</div>`;
    }).join('');
    const noSpecies = !S.hand.some((r) => C(r).type === 'species');
    $('.kf-deck').innerHTML = `${I.deck}<span>בחפיסה: ${S.deck.length}</span><span>תור ${S.turn + 1}</span>`;
    $('.kf-acts').innerHTML = S.phase === 'play' && (noSpecies || !kids) ? `<button class="wl-btn" data-a="skip" title="דילוג על התור: מחזירים קלף אחד לחפיסה ומקבלים קלף אחר. הטבע ממשיך">${I.skip}<span>דילוג על התור</span></button>` : '';
    root.querySelectorAll('.kf-bub').forEach((b) => { if (S.says != null && b.innerHTML !== S.says) b.innerHTML = S.says; });
  }

  /* ── selection, drag & tap */
  function selectCard(i) {
    if (!S || S.phase !== 'play') return;
    sel = sel === i ? null : i;
    ctx.sfx('click');
    if (sel != null) {
      const c = C(S.hand[sel]);
      if (c.type === 'tool') { const u = canUse(S.hand[sel]); msg('tip', `${I.bulb}<span>${esc(c.name)}: ${esc(TOOL_FX[c.tool.id])}. ${u.ok ? 'לחצו "הפעלה".' : esc(u.why)}</span>`); }
      else { const lg = legal(S.hand[sel]); msg('tip', `${I.life}<span>${lg.swap ? `הקומה מלאה – לחצו על קלף ב${ROWN()[rowOfCard(c)]} כדי להחליף אותו` : `עכשיו לחצו על מקום מסומן ${Y('ביער', 'בשונית')}`}</span>`); }
    }
    renderBoard(); renderHand();
  }
  function makeGhost(ref, x, y) {
    const g = document.createElement('div'); g.className = 'kf-ghost';
    g.innerHTML = ctx.cardHTML(C(ref)); g.style.left = x + 'px'; g.style.top = y + 'px';
    (ctx.root() || root).appendChild(g); return g;
  }
  function killGhost() { if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost); ghost = null; }
  function slotAt(x, y) {
    let best = null, bd = Infinity;
    root.querySelectorAll('.kf-slot.ok').forEach((s) => { const r = s.getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y); if (d < Math.max(r.width, r.height) * 0.85 && d < bd) { bd = d; best = s; } });
    return best;
  }
  function overBoard(x, y) { const b = $('.kf-board'); if (!b) return false; const r = b.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
  function cleanupDrag() {
    killGhost();
    if (drag && drag.el) drag.el.classList.remove('lift');
    drag = null;
    root.querySelectorAll && root.querySelectorAll('.kf-slot.hot').forEach((s) => s.classList.remove('hot'));
  }
  function onDown(e) {
    if (e.target.closest && e.target.closest('[data-a]')) return;
    const h = e.target.closest && e.target.closest('.kf-hc');
    if (!h || !root.contains(h) || !S || S.phase !== 'play' || e.button > 0) return;
    e.preventDefault();
    drag = { hi: +h.dataset.i, el: h, x0: e.clientX, y0: e.clientY, hot: null, pid: e.pointerId, moved: false };
  }
  function onMove(e) {
    if (!drag || (drag.pid != null && e.pointerId !== drag.pid)) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
      drag.moved = true; sel = null;
      ghost = makeGhost(S.hand[drag.hi], e.clientX, e.clientY); drag.el.classList.add('lift'); ctx.sfx('select');
      renderBoard();
      const el = root.querySelector(`.kf-hc[data-i="${drag.hi}"]`); if (el) { drag.el = el; el.classList.add('lift'); }
    }
    ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
    const s = slotAt(e.clientX, e.clientY);
    if (s !== drag.hot) { if (drag.hot) drag.hot.classList.remove('hot'); drag.hot = s; if (s) s.classList.add('hot'); }
  }
  function onUp(e) {
    if (!drag || (drag.pid != null && e.pointerId !== drag.pid)) return;
    const d = drag;
    if (!d.moved) { drag = null; selectCard(d.hi); return; }
    const s = slotAt(e.clientX, e.clientY);
    const ref = S.hand[d.hi]; const c = ref && C(ref);
    cleanupDrag();
    if (c && c.type === 'tool') { if (overBoard(e.clientX, e.clientY)) useTool(d.hi); else renderBoard(); return; }
    if (s) place(d.hi, +s.dataset.s);
    else { renderBoard(); renderHand(); msg('tip', `${I.life}<span>${c && !c.sp.animal ? `${esc(dn(c))} ${gw(c.sp.id, 'גדל', 'גדלה', 'גדלים', 'גדלות')} רק ב${ROWN()[rowOfCard(c)]}` : `גררו אל מקום מסומן ${Y('ביער', 'בשונית')}`}</span>`); }
  }
  function onClick(e) {
    if (e.target.classList && e.target.classList.contains('kf-how')) { hideHow(); return; }
    const t = e.target.closest && e.target.closest('[data-a],[data-b],.kf-slot');
    if (!t || !root.contains(t)) return;
    if (t.dataset.b) { if (t.dataset.b !== biome) { biome = t.dataset.b; ST.biome = biome; save(); ctx.sfx('click'); renderSetup(); } return; }
    if (t.classList.contains('kf-slot')) {
      if (!S) return;
      const k = +t.dataset.s;
      if (S.phase === 'play' && sel != null) {
        const c = C(S.hand[sel]);
        if (c.type === 'tool') { useTool(sel); return; }
        if (!place(sel, k)) msg('tip', `${I.life}<span>${!c.sp.animal ? `${esc(dn(c))} ${gw(c.sp.id, 'גדל', 'גדלה', 'גדלים', 'גדלות')} רק ב${ROWN()[rowOfCard(c)]}` : 'בחרו מקום מסומן'}</span>`);
        return;
      }
      const b = S.board[k];
      if (b) { // tell about this card's threads
        const th = totals().th.filter((x) => x.i === k || x.j === k);
        const c = C(b.ref);
        msg(th.length ? 'ok' : 'tip', `${th.length ? I.thread : I.life}<span>${th.length ? esc(th.slice(0, 2).map((x) => x.e.text).join(' ')) : `${esc(dn(c))}${b.wilted ? ' ' + gw(c.sp.id, 'נבל', 'נבלה', 'נבלו', 'נבלו') + ' קצת' : ''} – ${esc(c.short)}`}</span>`);
      }
      return;
    }
    const a = t.dataset.a;
    if (a === 'start') { ctx.sfx('click'); ST.biome = biome; save(); newRun(biome); renderGame(); if (!ST.seenHow) showHow(); }
    else if (a === 'how') showHow();
    else if (a === 'howok') hideHow();
    else if (a === 'setup') { ctx.sfx('click'); if (ro) { ro.disconnect(); ro = null; } renderSetup(); }
    else if (a === 'again') { ctx.sfx('click'); newRun(S ? S.biome : biome); renderGame(); }
    else if (a === 'album') { ctx.sfx('click'); ctx.toAlbum(); }
    else if (a === 'cont') { ctx.sfx('click'); cont(); }
    else if (a === 'hint') showHint();
    else if (a === 'skip') skip();
    else if (a === 'use') { if (sel != null) useTool(sel); }
  }
  on(root, 'pointerdown', onDown);
  // capture phase: the hub stops pointer events from bubbling past #wol-learn
  on(window, 'pointermove', onMove, true);
  on(window, 'pointerup', onUp, true);
  on(window, 'pointercancel', () => { cleanupDrag(); if (S) renderBoard(); }, true);
  on(root, 'click', onClick);
  on(window, 'resize', () => drawThreads(false));

  // debug hook for scripted tests
  const dbg = {
    state: () => S && (() => { const T = totals(); return {
      biome: S.biome, phase: S.phase, turn: S.turn, evIdx: S.evIdx, events: S.events.map((e) => e.id + ':' + e.need), results: S.results.slice(),
      hand: S.hand.map((r) => r.id + (r.borrowed ? '*' : '')), deck: S.deck.length, board: S.board.map((b) => (b ? b.ref.id.split(':')[1] + (b.wilted ? '~' : '') : '-')),
      light: T.light, water: T.water, threads: T.threads, life: T.life, stars: S.stars, lost: S.lost, bonus: S.bonus, borrowed: S.borrowed, owned: S.owned, watch: S.watch,
      threadTexts: T.th.map((t) => t.e.text) }; })(),
    place: (hi, k) => place(hi, k),
    tool: (hi) => useTool(hi),
    cont: () => { if (S && S.phase === 'event' && S.cur && !S.cur.res) resolve(); return cont(); },
    auto: (n = 1, mode, q) => { quiet = !!q; try { for (let i = 0; i < n && S && S.phase !== 'end'; i++) autoStep(mode); } finally { quiet = false; } if (q && S && S.phase === 'end') { /* no UI */ } else render(); return dbg.state(); },
    sim: (b, mode, runs = 50) => { const L = [], H = [0, 0, 0, 0]; let P = 0, hard = 0, RB = 0, KS = 0; for (let r = 0; r < runs; r++) { quiet = true; newRun(b); let g = 0; while (S.phase !== 'end' && g++ < 400) { if (S.phase === 'event' && S.evIdx + 1 >= S.events.length && S.cur) { if (!S.cur.res) resolve(); S.evIdx++; S.phase = 'end'; break; } autoStep(mode); } quiet = false; const T = totals(); L.push(T.life); H[S.lost ? 0 : starsFor(T.life)]++; P += S.results.filter((x) => x === 'ok').length; hard += S.results.filter((x) => x !== 'gd').length; RB += S.rareBonus; KS += S.keySaves; } renderSetup(); return `${b} ${mode || 'greedy'} life ${(L.reduce((a, c) => a + c, 0) / runs).toFixed(1)} [${Math.min(...L)}-${Math.max(...L)}] pass ${(P / hard).toFixed(2)} lose ${Math.round((100 * H[0]) / runs)}% stars(0/1/2/3) ${H.join('/')} rare+${(RB / runs).toFixed(1)} keysaves ${(KS / runs).toFixed(1)}`; },
    lives: (b, mode, runs = 100) => { const L = []; for (let r = 0; r < runs; r++) { quiet = true; newRun(b); let g = 0; while (S.phase !== 'end' && g++ < 400) { if (S.phase === 'event' && S.evIdx + 1 >= S.events.length && S.cur) { if (!S.cur.res) resolve(); S.evIdx++; S.phase = 'end'; break; } autoStep(mode); } quiet = false; L.push(totals().life); } renderSetup(); return L; },
    start: (b = biome) => { biome = b; newRun(b); renderGame(); return dbg.state(); },
    hint: () => { const h = bestMove(); return h && { hi: h.hi, slot: h.k }; },
    legal: (hi) => S && S.hand[hi] ? legal(S.hand[hi]) : null,
    // screenshot staging: board = 9 card ids (or null), hand = card ids, ev = id of the next event (need forced to n)
    stage: ({ board, hand, ev, need, turn } = {}) => {
      if (!S) return null;
      const ref = (id) => ({ uid: uidN++, id: id.includes(':') ? id : S.biome + ':' + id, borrowed: false });
      if (board) S.board = board.map((id) => (id ? { ref: ref(id), wilted: false } : null));
      if (hand) S.hand = hand.map(ref);
      if (ev) { S.events[S.evIdx] = { id: ev, i: S.evIdx, need: need != null ? need : S.events[S.evIdx].need }; }
      if (turn != null) S.turn = turn;
      render(); return dbg.state();
    },
  };
  try { window.__kfDebug = dbg; } catch (e) { /* no window */ }

  renderSetup();

  return {
    destroy() {
      alive = false;
      cleanupDrag();
      offs.forEach((f) => f()); offs.length = 0;
      if (ro) { ro.disconnect(); ro = null; }
      S = null;
      try { if (window.__kfDebug === dbg) delete window.__kfDebug; } catch (e) { /* */ }
    },
  };
}
