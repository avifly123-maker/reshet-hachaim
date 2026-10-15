// UI gallery / test harness. Build: node build.mjs tests/ui-test.js scratch/ui.html --dev
import { createUI } from '../src/ui/ui.js';
import { makeBus } from '../src/core/util.js';

/* ---------- fake 3D world backdrop (2D canvas painting) */
const cv = document.getElementById('game');
function paintBg(night = false) {
  const W = (cv.width = innerWidth), H = (cv.height = innerHeight), g = cv.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H);
  if (night) { sky.addColorStop(0, '#0b1430'); sky.addColorStop(0.6, '#1b2c4a'); sky.addColorStop(1, '#0f1d18'); }
  else { sky.addColorStop(0, '#9fcbe6'); sky.addColorStop(0.55, '#d9e8d0'); sky.addColorStop(1, '#7da36a'); }
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // mist sea
  g.fillStyle = night ? 'rgba(120,140,180,.18)' : 'rgba(255,255,255,.45)';
  g.beginPath(); g.ellipse(W / 2, H * 0.72, W * 0.7, H * 0.16, 0, 0, Math.PI * 2); g.fill();
  // island
  g.fillStyle = night ? '#2b2a26' : '#6b4a2e';
  g.beginPath(); g.moveTo(W * 0.18, H * 0.6); g.quadraticCurveTo(W * 0.5, H * 1.05, W * 0.82, H * 0.6); g.fill();
  g.fillStyle = night ? '#1f3b26' : '#5c9a45';
  g.beginPath(); g.ellipse(W / 2, H * 0.6, W * 0.32, H * 0.12, 0, 0, Math.PI * 2); g.fill();
  // trees
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = W / 2 + Math.cos(a) * W * 0.28 * d, y = H * 0.6 + Math.sin(a) * H * 0.1 * d;
    const hgt = 40 + r() * 160 * (H / 800);
    g.fillStyle = night ? '#2a2018' : '#5a3d24'; g.fillRect(x - 3, y - hgt, 6, hgt);
    g.fillStyle = night ? `hsl(${130 + r() * 20} 30% ${14 + r() * 8}%)` : `hsl(${95 + r() * 40} 45% ${26 + r() * 18}%)`;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * 40, y - hgt + (r() - 0.5) * 20, 18 + r() * 22, 0, Math.PI * 2); g.fill(); }
  }
  // light shaft
  if (!night) { const sh = g.createLinearGradient(W * 0.55, 0, W * 0.48, H * 0.7); sh.addColorStop(0, 'rgba(255,240,180,.35)'); sh.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = sh; g.beginPath(); g.moveTo(W * 0.56, 0); g.lineTo(W * 0.6, 0); g.lineTo(W * 0.52, H * 0.66); g.lineTo(W * 0.47, H * 0.66); g.fill(); }
}
paintBg();

/* ---------- fake thumbnails (simple drawn critters/plants on transparent bg) */
function thumb(kind, c1, c2) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.translate(64, 64);
  if (kind === 'tree') { g.fillStyle = '#6b4a2e'; g.fillRect(-6, 0, 12, 50); g.fillStyle = c1; [[-22, -10, 28], [20, -12, 26], [0, -30, 32]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }); g.fillStyle = c2; g.beginPath(); g.arc(8, -36, 14, 0, 7); g.fill(); }
  else if (kind === 'flower') { g.strokeStyle = '#4a8a34'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 55); g.quadraticCurveTo(-6, 20, 0, -5); g.stroke(); g.fillStyle = c1; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.ellipse(Math.cos(a) * 18, -14 + Math.sin(a) * 18, 14, 9, a, 0, 7); g.fill(); } g.fillStyle = c2; g.beginPath(); g.arc(0, -14, 9, 0, 7); g.fill(); }
  else if (kind === 'bird') { g.fillStyle = c1; g.beginPath(); g.ellipse(0, 6, 34, 24, -0.3, 0, 7); g.fill(); g.beginPath(); g.arc(22, -18, 16, 0, 7); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(32, -22); g.quadraticCurveTo(62, -16, 58, -2); g.lineTo(32, -10); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(24, -22, 5, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(25, -22, 2.5, 0, 7); g.fill(); }
  else { g.fillStyle = c1; g.beginPath(); g.ellipse(0, 10, 38, 22, 0, 0, 7); g.fill(); g.beginPath(); g.arc(-34, -6, 16, 0, 7); g.fill(); g.fillStyle = c2; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-20 + (i % 3) * 18, 0 + Math.floor(i / 3) * 10, 4, 0, 7); g.fill(); } g.fillStyle = c1; [-24, -8, 10, 26].forEach((x) => g.fillRect(x, 26, 7, 22)); }
  return c.toDataURL();
}
const T = {
  kapok: thumb('tree', '#4f8f3e', '#7ab85a'), fig: thumb('tree', '#3d7a34', '#a33a4a'), heliconia: thumb('flower', '#e84a2b', '#f6c64a'),
  orchid: thumb('flower', '#d78bd8', '#f8e7f7'), toucan: thumb('bird', '#1a1a1a', '#f59a23'), macaw: thumb('bird', '#d6362a', '#f2c230'),
  jaguar: thumb('cat', '#d9a441', '#3a2a16'), morpho: thumb('flower', '#2f6fe0', '#9ad0ff'),
};

/* ---------- mock data */
const BIOMES = [
  { id: 'amazon', name: 'יער הגשם באמזונס', subtitle: 'המאבק על האור', intro: 'ביער הגשם העצים מתחרים מי יגיע ראשון אל השמש. שתלו עצי ענק, פתחו פתחים של אור, ומצאו מי גר בכל קומה של היער.', palette: ['#1e5a3a', '#3f8f4e', '#f2c14e'] },
  { id: 'grove', name: 'החורש הארץ-ישראלי', subtitle: 'ארבע עונות של חיים', intro: 'בחורש החורף מביא גשם, האביב מביא פריחה, והקיץ יבש וחם. עזרו לצמחים ולבעלי החיים לעבור את כל העונות בשלום.', palette: ['#4a5e2a', '#8aa04a', '#e8b04a'] },
];
const LAYERS = [{ id: 'emergent', name: 'צמרות הענק' }, { id: 'canopy', name: 'חופת היער' }, { id: 'understory', name: 'קומת הביניים' }, { id: 'floor', name: 'קרקעית היער' }];
const LN = Object.fromEntries(LAYERS.map((l) => [l.id, l.name]));
const C = (id, name, kind, layer, cost, extra = {}) => ({ id, name, kind, layer, layerName: LN[layer], cost, locked: false, lockText: '', canAfford: true, alive: 0, thumb: T[id] || null, color: extra.color || '#6a9', isNew: false, ...extra });
const CARDS = [
  C('kapok', 'קפוק', 'tree', 'emergent', 40, { alive: 2, color: '#4f8f3e' }),
  C('brazilnut', 'אגוז ברזיל', 'tree', 'emergent', 45, { color: '#6c8d3a', canAfford: false }),
  C('fig', 'פיקוס חונק', 'tree', 'canopy', 30, { alive: 1, color: '#3d7a34' }),
  C('cecropia', 'צקרופיה', 'tree', 'canopy', 18, { color: '#8fb85a' }),
  C('acai', 'דקל אסאי', 'palm', 'understory', 15, { alive: 4, color: '#517a2c' }),
  C('heliconia', 'הליקוניה', 'herb', 'understory', 8, { alive: 6, color: '#e84a2b', isNew: true }),
  C('orchid', 'סחלב', 'epiphyte', 'canopy', 10, { color: '#d78bd8' }),
  C('bromeliad', 'ברומליה', 'epiphyte', 'canopy', 10, { color: '#d65a6b', locked: true, lockText: 'משימה 3' }),
  C('fern', 'שרך', 'herb', 'floor', 4, { alive: 9, color: '#5aa04a' }),
  C('glowfungus', 'פטרייה זוהרת', 'fungus', 'floor', 6, { color: '#9ee07a', locked: true, lockText: 'גלו קשר פירוק' }),
  C('waterlily', 'ויקטוריה', 'water-plant', 'floor', 12, { color: '#5fae7a' }),
  C('liana', 'ליאנה', 'vine', 'canopy', 9, { color: '#6a9a3a' }),
  C('toucan', 'טוקן', 'animal', 'canopy', 20, { alive: 3, color: '#f59a23' }),
  C('macaw', 'תוכי ארה', 'animal', 'emergent', 25, { color: '#d6362a', isNew: true }),
  C('jaguar', 'יגואר', 'animal', 'floor', 60, { color: '#d9a441', canAfford: false }),
  C('morpho', 'פרפר מורפו', 'animal', 'understory', 8, { alive: 5, color: '#2f6fe0' }),
  C('leafcutter', 'נמלים קוטעות עלים', 'colony', 'floor', 12, { alive: 1, color: '#a0502a' }),
  C('sloth', 'עצלן', 'animal', 'canopy', 22, { color: '#8a7a5a' }),
  C('harpy', 'עיט הרפי', 'animal', 'emergent', 70, { color: '#6a6a72', locked: true, lockText: 'משימה 6' }),
  C('dartfrog', 'צפרדע חץ', 'animal', 'floor', 9, { color: '#2a7de1' }),
  C('hummingbird', 'יונק דבש', 'animal', 'understory', 10, { alive: 2, color: '#3fb88a' }),
];
const MISSIONS = [
  { id: 'm1', title: 'שתלו עץ ענק', text: 'גררו עץ קפוק אל האי וחכו שיגדל. עצי הענק מגיעים הכי גבוה ביער.', hint: 'הקפוק נמצא בלשונית צמחים, בקומת צמרות הענק.', progress: 1, done: true },
  { id: 'm2', title: 'פתחו פתח של אור', text: 'דאגו שקצת אור שמש יגיע עד קרקעית היער, כדי שצמחים קטנים יוכלו לגדול.', hint: 'הפעילו את "מפת אור" וחפשו כתמים צהובים.', progress: 0.62, done: false },
  { id: 'm3', title: 'מצאו מאביק לסחלב', text: 'הסחלב צריך חבר מיוחד שיעביר את האבקה שלו מפרח לפרח.', hint: 'חפשו דבורה בצבע ירוק מבריק.', progress: 0.15, done: false },
];
const SPECIES = {
  id: 'toucan', name: 'טוקן', nameEn: 'Toco toucan', color: '#f59a23', thumb: T.toucan, kindName: 'בעל חיים', layerName: 'חופת היער', activeName: 'פעיל ביום',
  fact: 'למקור הענק של הטוקן יש פנים חלולים, ולכן הוא קל מאוד – והטוקן יכול לקטוף פירות מקצה ענף דק.',
  more: 'הטוקן בולע פירות שלמים, ומפזר את הזרעים במקום אחר ביער. כך עוזר לעצים חדשים לצמוח רחוק מעץ האם. הוא ישן בחורים בגזעי עצים ומקפל את הזנב מעל הגב.',
  alive: 3, count: 3, health: 0.78, status: 'שבע ובריא', canRemove: true,
  relations: [
    { targetId: 'fig', targetName: 'פיקוס חונק', type: 'eats', typeName: 'אוכל', text: 'הטוקן אוכל את הפירות המתוקים של הפיקוס.', discovered: true, present: true },
    { targetId: 'acai', targetName: 'דקל אסאי', type: 'disperses', typeName: 'מפזר זרעים', text: 'הטוקן בולע פירות אסאי ומפזר את הזרעים ברחבי היער.', discovered: true, present: true },
    { targetId: 'kapok', targetName: 'קפוק', type: 'home', typeName: 'בית', text: 'בחורים בגזע הקפוק הטוקן מוצא מקום לישון.', discovered: true, present: false },
    { targetId: 'harpy', targetName: 'עיט הרפי', type: 'eats', typeName: 'טורף', text: '', discovered: false, present: false },
  ],
  question: { q: 'למה המקור הגדול של הטוקן לא כבד לו?', options: ['כי הוא עשוי מנוצות', 'כי הוא חלול מבפנים', 'כי הטוקן חזק מאוד'], answer: 1 }, questionDone: false,
};
const JOURNAL = {
  stats: { discovered: 9, total: 27, relationsFound: 14, relationsTotal: 52 },
  species: [
    ['kapok', 'קפוק', '#4f8f3e', 'עץ ענק שגובהו יכול להגיע לגובה של בניין בן עשרים קומות.', 3, 6], ['fig', 'פיקוס חונק', '#3d7a34', 'מתחיל את חייו על ענף של עץ אחר ושולח שורשים אל האדמה.', 4, 7],
    ['toucan', 'טוקן', '#f59a23', 'המקור שלו ארוך וקל מאוד.', 2, 4], ['heliconia', 'הליקוניה', '#e84a2b', 'הפרחים האדומים שלה מושכים יונקי דבש.', 1, 3],
    ['macaw', 'תוכי ארה', '#d6362a', 'יכול לפצח אגוזים קשים במקור החזק שלו.', 1, 4], ['jaguar', 'יגואר', '#d9a441', 'שוחה מצוין וצד ליד הנהר.', 0, 3],
    ['orchid', 'סחלב', '#d78bd8', 'גדל על ענפים גבוהים ולא באדמה.', 2, 3], ['morpho', 'פרפר מורפו', '#2f6fe0', 'הכנפיים שלו מבריקות בכחול כשהוא עף.', 1, 2],
    ['fern', 'שרך', '#5aa04a', 'אוהב צל ולחות בקרקעית היער.', 0, 2],
  ].map(([id, name, color, fact, f, t]) => ({ id, name, color, fact, thumb: T[id] || null, discovered: true, relationsFound: f, relationsTotal: t }))
    .concat(Array.from({ length: 9 }, (_, i) => ({ id: 'u' + i, name: '', discovered: false }))),
};

/* ---------- create */
const bus = makeBus();
const log = [];
const origEmit = bus.emit;
bus.emit = (n, p) => { log.push([n, p]); if (log.length > 200) log.shift(); console.log('emit', n, JSON.stringify(p || {})); return origEmit(n, p); };
window.busLog = log;
const ui = createUI(document.getElementById('ui'), bus);
window.ui = ui;

// a little wiring so the gallery behaves like the game
bus.on('start:biome', () => { ui.hideStart(); inGame(); });
bus.on('time:speed', ({ speed }) => { hud.speed = speed; ui.setHUD(hud); });
bus.on('species:select', ({ id }) => ui.showSpecies({ ...SPECIES, id, name: id }));
bus.on('relation:reveal', () => setTimeout(() => { SPECIES.relations[3].discovered = true; SPECIES.relations[3].text = 'עיט ההרפי צד טוקנים מהאוויר.'; ui.updateSpecies({ ...SPECIES }); ui.discovery({ fromName: 'עיט הרפי', toName: 'טוקן', typeName: 'טורף', text: 'עיט ההרפי צד בעלי חיים בחופת היער.', color: '#ec6a58' }); }, 300));
bus.on('ui:journal', () => ui.showJournal(JOURNAL));
bus.on('drag:move', ({ x }) => ui.setDragHint(x < innerWidth / 2 ? { valid: true, text: 'אפשר לשתול כאן – יש אור' } : { valid: false, text: 'חשוך מדי לצמח הזה' }));
bus.on('drag:end', () => ui.setDragHint(null));

const hud = { points: 128, vitality: 0.72, speciesAlive: 11, speciesTotal: 27, dayFrac: 0.38, season: null, seasonId: null, speed: 1, isNight: false };
function inGame(biome = 'amazon') {
  ui.setBiome({ id: biome, name: biome === 'grove' ? BIOMES[1].name : BIOMES[0].name, layers: LAYERS, hasSeasons: biome === 'grove' });
  ui.setLayers(LAYERS, 'all');
  ui.setHUD(hud);
  ui.setTray(CARDS);
  ui.setMissions(MISSIONS);
  ui.setToggles({ lightmap: false, web: true, sound: true, quality: 'medium' });
}
function reset() {
  ui.hideLoading(); ui.hideStart(); ui.hideSpecies(); ui.hideCoach(); ui.hideJournal(); ui.hideDialog(); ui.hideHover(); ui.setExperiment({ active: false });
  ui.cancelDrag(); ui.hideEvent(); ui.hideOutcome();
}

window.demo = function (name) {
  reset(); paintBg(false);
  const pt = document.querySelector('[data-tab="plants"]'); if (pt && pt.getAttribute('aria-selected') === 'false') pt.click();
  switch (name) {
    case 'loading': ui.setTips(['ציפורים שאוכלות פירות מפזרות את הזרעים למקומות חדשים.']); ui.setLoading(0.64, 'בונים את האי…'); break;
    case 'start': ui.showStart(BIOMES); break;
    case 'hud': inGame(); break;
    case 'animals': inGame(); document.querySelector('[data-tab="animals"]').click(); break;
    case 'grove': inGame('grove'); ui.setHUD({ ...hud, season: 'אביב', seasonId: 'spring', dayFrac: 0.55, points: 342 }); break;
    case 'night': paintBg(true); inGame(); ui.setHUD({ ...hud, dayFrac: 0.92, isNight: true, vitality: 0.24, points: 12 }); ui.toast('הלילה ירד – בעלי החיים של הלילה מתעוררים', 'info'); break;
    case 'species': inGame(); ui.showSpecies(SPECIES); ui.showHover({ x: innerWidth * 0.62, y: innerHeight * 0.45, name: 'תוכי ארה', sub: 'אוכל פירות · חופת היער' }); break;
    case 'species2': inGame(); ui.showSpecies(SPECIES); document.querySelector('.sp-scroll').scrollTop = 999; document.querySelector('[data-act="quiz"][data-i="0"]').click(); break;
    case 'event': inGame(); ui.showEvent({ id: 'storm', title: 'סערה גדולה מתקרבת', text: 'רוח חזקה נושבת מעל היער. עץ גבוה עלול ליפול ולפתוח חור בחופה. מה תעשו?', choices: [{ id: 'wait', label: 'נחכה ונראה מה יקרה' }, { id: 'plant', label: 'נשתול עוד עצים צעירים מסביב' }] }); break;
    case 'outcome': inGame(); ui.showOutcome({ title: 'העץ נפל – והאור נכנס', text: 'במקום שבו עמד העץ נפתח פתח של אור. עכשיו נבטים קטנים יכולים לגדול בקרקעית.' }); break;
    case 'dialog': inGame(); ui.showDialog({ title: 'לחזור למסך הפתיחה?', text: 'היער שבניתם יישמר ותוכלו לחזור אליו.', buttons: [{ id: 'yes', label: 'כן, חזרה' }, { id: 'no', label: 'להישאר ביער' }] }); break;
    case 'journal': inGame(); ui.showJournal(JOURNAL); break;
    case 'coach': inGame(); ui.coach({ text: 'כאן נמצאים הצמחים ובעלי החיים. גררו כרטיס אל האי כדי לשתול אותו.', target: 'tray', step: 2, total: 5 }); break;
    case 'coach2': inGame(); ui.coach({ text: 'בחרו קומה ביער כדי לראות רק אותה. כך קל לראות מי גר למעלה ומי למטה.', target: 'layers', step: 4, total: 5 }); break;
    case 'coach3': inGame(); ui.coach({ text: 'כאן רואים את נקודות החיים, כמה היער חי, ומה השעה ביום.', target: 'hud', step: 1, total: 5 }); break;
    case 'toasts': inGame(); ui.toast('נוספו 3 פרפרי מורפו', 'good'); ui.toast('אין מספיק נקודות חיים', 'warn'); ui.toast('העצלן רעב – אין לו עלים', 'bad');
      ui.discovery({ fromName: 'יונק דבש', toName: 'הליקוניה', typeName: 'מאביק', text: 'יונק הדבש שותה צוף מהפרח ומעביר אבקה לפרח הבא.', color: '#ec8cc4' });
      ui.floatText(innerWidth * 0.55, innerHeight * 0.5, '+5', '#ffe08a'); ui.floatText(innerWidth * 0.45, innerHeight * 0.55, '+12', '#b9ec8c'); break;
    case 'mission': inGame(); ui.missionDone({ title: 'פתחו פתח של אור', rewardText: '+30 נקודות חיים · נפתח: ברומליה' }); break;
    case 'experiment': inGame(); ui.setExperiment({ active: true, name: 'הדבורים', secondsLeft: 24 }); break;
    case 'drag': {
      inGame();
      const card = document.querySelector('.card[data-id="heliconia"]'); const r = card.getBoundingClientRect();
      const o = { bubbles: true, pointerId: 7, isPrimary: true, button: 0 };
      card.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: r.x + 20, clientY: r.y + 20 }));
      window.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: r.x + 40, clientY: r.y - 40 }));
      window.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: innerWidth * 0.42, clientY: innerHeight * 0.48 }));
      break;
    }
  }
  return log.map((l) => l[0]).slice(-6).join(',');
};

window.selfTest = function () {
  const errs = [];
  const ok = (c, m) => { if (!c) errs.push(m); };
  log.length = 0; reset(); inGame();
  // click on card (no drag)
  const card = document.querySelector('.card[data-id="fern"]'); const r = card.getBoundingClientRect();
  const o = { bubbles: true, pointerId: 3, isPrimary: true, button: 0 };
  card.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: r.x + 10, clientY: r.y + 10 }));
  window.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: r.x + 12, clientY: r.y + 11 }));
  ok(log.some((l) => l[0] === 'card:click' && l[1].id === 'fern'), 'card:click');
  // drag to world
  card.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: r.x + 10, clientY: r.y + 10 }));
  window.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: 300, clientY: 300 }));
  window.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: 300, clientY: 300 }));
  ok(log.some((l) => l[0] === 'drag:start'), 'drag:start'); ok(log.some((l) => l[0] === 'drag:end' && l[1].cancelled === false), 'drag:end');
  // drag back onto tray → cancelled
  card.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: r.x + 10, clientY: r.y + 10 }));
  window.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: r.x + 40, clientY: r.y + 10 }));
  window.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: r.x + 40, clientY: r.y + 10 }));
  ok(log.filter((l) => l[0] === 'drag:end').pop()[1].cancelled === true, 'drag cancel over tray');
  // esc cancel
  card.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: r.x + 10, clientY: r.y + 10 }));
  window.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: 300, clientY: 200 }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  ok(log.filter((l) => l[0] === 'drag:end').pop()[1].cancelled === true, 'esc cancel');
  // locked card denied
  const lk = document.querySelector('.card[data-id="bromeliad"]'); const lr = lk.getBoundingClientRect();
  const n0 = log.filter((l) => l[0] === 'drag:start').length;
  lk.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: lr.x + 10, clientY: lr.y + 10 }));
  window.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: 300, clientY: 200 }));
  window.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: 300, clientY: 200 }));
  ok(log.filter((l) => l[0] === 'drag:start').length === n0, 'locked no drag');
  // speed + space
  document.querySelector('.speed [data-s="3"]').click(); ok(log.some((l) => l[0] === 'time:speed' && l[1].speed === 3), 'speed 3');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' })); ok(log.filter((l) => l[0] === 'time:speed').pop()[1].speed === 0, 'space pause');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' })); ok(log.filter((l) => l[0] === 'time:speed').pop()[1].speed === 3, 'space resume');
  // toggles
  document.querySelector('[data-a="lightmap"]').click(); ok(log.some((l) => l[0] === 'toggle:lightmap' && l[1].on === true), 'lightmap');
  document.querySelector('[data-a="web"]').click(); ok(log.some((l) => l[0] === 'toggle:web' && l[1].on === false), 'web');
  document.querySelector('[data-a="sound"]').click(); ok(log.some((l) => l[0] === 'audio:mute' && l[1].muted === true), 'mute');
  document.querySelector('[data-q="high"]').click(); ok(log.some((l) => l[0] === 'quality' && l[1].q === 'high'), 'quality');
  ['home', 'help', 'journal', 'reset'].forEach((a) => document.querySelector(`[data-a="${a}"]`).click());
  ok(['ui:home', 'ui:help', 'ui:journal', 'view:reset'].every((n) => log.some((l) => l[0] === n)), 'toolbar events');
  ok(ui.isModalOpen(), 'journal modal open');
  document.querySelector('.jc button').click(); ok(log.some((l) => l[0] === 'journal:select'), 'journal:select');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); ok(log.some((l) => l[0] === 'journal:close'), 'journal esc');
  // layers
  document.querySelector('.strata [data-id="canopy"]').click(); ok(log.some((l) => l[0] === 'view:layer' && l[1].id === 'canopy'), 'layer');
  // species
  ui.showSpecies(SPECIES);
  document.querySelector('[data-act="exp"]').click(); ok(log.some((l) => l[0] === 'species:experiment'), 'experiment');
  document.querySelector('[data-act="follow"]').click(); ok(log.some((l) => l[0] === 'species:follow'), 'follow');
  document.querySelector('[data-act="quiz"][data-i="1"]').click(); ok(log.some((l) => l[0] === 'quiz:answer' && l[1].correct === true), 'quiz');
  document.querySelector('[data-act="reveal"]').click(); ok(log.some((l) => l[0] === 'relation:reveal' && l[1].to === 'harpy'), 'reveal');
  document.querySelector('.rel-target').click(); ok(log.some((l) => l[0] === 'species:select'), 'select');
  document.querySelector('[data-act="close"]').click(); ok(log.some((l) => l[0] === 'species:close'), 'close');
  // event
  ui.showEvent({ id: 'e1', title: 'x', text: 'y', choices: [{ id: 'a', label: 'A' }] }); ok(ui.isModalOpen(), 'event modal');
  document.querySelector('.m-event .ev-choices button').click(); ok(log.some((l) => l[0] === 'event:choice' && l[1].eventId === 'e1' && l[1].choiceId === 'a'), 'event:choice');
  ui.showOutcome({ title: 'o', text: 't' }); document.querySelector('.m-outcome [data-close]').click(); ok(log.some((l) => l[0] === 'outcome:close'), 'outcome:close');
  ui.showDialog({ title: 'd', text: 't', buttons: [{ id: 'b1', label: 'B' }] }); document.querySelector('.m-dialog button[data-id]').click(); ok(log.some((l) => l[0] === 'dialog:button' && l[1].id === 'b1'), 'dialog');
  ui.coach({ text: 'c', target: 'tray', step: 1, total: 2 }); document.querySelector('[data-c="next"]').click(); document.querySelector('[data-c="skip"]').click();
  ok(log.some((l) => l[0] === 'coach:next') && log.some((l) => l[0] === 'coach:skip'), 'coach'); ui.hideCoach();
  ui.setExperiment({ active: true, name: 'דבורים', secondsLeft: 5 }); document.querySelector('.experiment button').click(); ok(log.some((l) => l[0] === 'experiment:end'), 'experiment:end');
  ui.setExperiment({ active: false });
  ui.showStart(BIOMES); document.querySelector('.biome-card').click(); ok(log.some((l) => l[0] === 'start:biome' && l[1].id === 'amazon'), 'start');
  // tray re-render keeps DOM nodes
  const el1 = document.querySelector('.card[data-id="kapok"]'); ui.setTray(CARDS.map((c) => c.id === 'kapok' ? { ...c, alive: 5 } : c));
  ok(document.querySelector('.card[data-id="kapok"]') === el1 && el1.querySelector('.c-alive').textContent === '5', 'tray diff');
  setTimeout(() => {}, 0);
  return errs.length ? 'FAIL: ' + errs.join(', ') : 'ALL OK (' + log.length + ' events)';
};

/* start state on load */
ui.setLoading(0.3, 'מכינים את היער…');
setTimeout(() => { ui.hideLoading(); ui.showStart(BIOMES); }, 400);
