// Technology tools the player can drag onto the island:
// monitoring drone, camera trap, rescue robot, water-from-air generator, seed-ball drone, forest listener.
// Each tool teaches something real that people use today to watch over and repair nature.
import * as THREE from 'three';
import { clamp, makeRng } from '../core/util.js';
import { gw } from '../data/common.js';
import { toolProp } from '../world/props.js';

const svg = (body, bg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${bg}"/>${body}</svg>`);
const ICONS = {
  drone: svg('<rect x="24" y="28" width="16" height="9" rx="3" fill="#33414d"/><circle cx="32" cy="37" r="3" fill="#6fd0ff"/><path d="M24 30L14 22M40 30l10-8M24 35l-10 8M40 35l10 8" stroke="#33414d" stroke-width="3"/><g fill="#9fb4c4"><ellipse cx="14" cy="21" rx="8" ry="2.5"/><ellipse cx="50" cy="21" rx="8" ry="2.5"/><ellipse cx="14" cy="44" rx="8" ry="2.5"/><ellipse cx="50" cy="44" rx="8" ry="2.5"/></g>', '#d9eef7'),
  camera: svg('<path d="M32 40v16M26 56h12" stroke="#5b4a32" stroke-width="3"/><rect x="18" y="20" width="28" height="22" rx="4" fill="#4d6b3a"/><circle cx="32" cy="31" r="7" fill="#22303a"/><circle cx="32" cy="31" r="3.5" fill="#7fc8ff"/><circle cx="41" cy="24" r="2" fill="#ff5a4a"/>', '#e3efd6'),
  rescue: svg('<rect x="16" y="26" width="32" height="16" rx="5" fill="#f2f2ee"/><path d="M29 30h6v3h3v6h-3v3h-6v-3h-3v-6h3z" fill="#e5483b"/><circle cx="22" cy="45" r="5" fill="#33414d"/><circle cx="42" cy="45" r="5" fill="#33414d"/><rect x="28" y="16" width="8" height="10" rx="2" fill="#9fb4c4"/><circle cx="32" cy="19" r="2.5" fill="#6fd0ff"/>', '#fde3df'),
  watergen: svg('<rect x="18" y="22" width="28" height="30" rx="3" fill="#f4f6f7" stroke="#b5c3cc" stroke-width="1.5"/><circle cx="32" cy="34" r="8" fill="#c9d6de"/><path d="M32 27v14M25 34h14" stroke="#7d8f9b" stroke-width="2"/><path d="M15 21l17-9 17 9z" fill="#2c4f7a"/><path d="M32 44c-3 4-3 6 0 7 3-1 3-3 0-7z" fill="#3aa8e8"/>', '#dff1fb'),
  seeddrone: svg('<rect x="24" y="22" width="16" height="9" rx="3" fill="#5d4a2e"/><path d="M24 24L14 17M40 24l10-7" stroke="#5d4a2e" stroke-width="3"/><g fill="#c8b58c"><ellipse cx="14" cy="16" rx="8" ry="2.5"/><ellipse cx="50" cy="16" rx="8" ry="2.5"/></g><g fill="#7b5a36"><circle cx="26" cy="40" r="3"/><circle cx="34" cy="45" r="3"/><circle cx="40" cy="38" r="3"/><circle cx="30" cy="51" r="3"/></g><path d="M34 45c0-4 3-6 6-6" stroke="#5fae4a" stroke-width="2" fill="none"/>', '#efe6d2'),
  nestbox: svg('<path d="M14 58V8" stroke="#6b4a32" stroke-width="7"/><path d="M22 26l13-10 13 10z" fill="#8a5a32"/><rect x="24" y="26" width="22" height="24" rx="2" fill="#c8955a"/><circle cx="35" cy="36" r="4.5" fill="#3a2814"/><path d="M35 44v4" stroke="#6b4a32" stroke-width="2"/>', '#f3e7d2'),
  insecthotel: svg('<path d="M14 26L32 12l18 14z" fill="#8a5a32"/><rect x="16" y="26" width="32" height="26" fill="#c8955a"/><g fill="#6b4a32"><circle cx="22" cy="32" r="2.2"/><circle cx="28" cy="32" r="2.2"/><circle cx="34" cy="32" r="2.2"/><circle cx="40" cy="32" r="2.2"/><circle cx="25" cy="39" r="2.2"/><circle cx="31" cy="39" r="2.2"/><circle cx="37" cy="39" r="2.2"/></g><rect x="18" y="44" width="28" height="6" fill="#d9c08a"/><ellipse cx="48" cy="18" rx="3" ry="2" fill="#f2c14e"/><path d="M46 16l-2-2M50 16l2-2" stroke="#333" stroke-width="1"/>', '#fbefd8'),
  weather: svg('<path d="M32 56V20" stroke="#7d8f9b" stroke-width="3"/><path d="M32 22h12M32 22l-8-6M32 22l-8 6" stroke="#7d8f9b" stroke-width="2"/><g fill="#2c4f7a"><circle cx="44" cy="22" r="3"/><circle cx="24" cy="16" r="3"/><circle cx="24" cy="28" r="3"/></g><rect x="22" y="38" width="20" height="10" rx="2" fill="#f4f6f7" stroke="#b5c3cc"/><path d="M26 43h12" stroke="#3aa8e8" stroke-width="2"/><path d="M20 56h24" stroke="#5b4a32" stroke-width="3"/>', '#e6f1f6'),
  listener: svg('<path d="M14 58V8" stroke="#6b4a32" stroke-width="8"/><rect x="22" y="22" width="20" height="22" rx="3" fill="#3c4a54"/><path d="M20 20l24-6v6l-24 6z" fill="#2c4f7a"/><path d="M46 28c4 3 4 9 0 12M50 25c6 5 6 13 0 18" stroke="#ffb547" stroke-width="2.5" fill="none"/><circle cx="32" cy="36" r="3" fill="#8fd067"/>', '#e6eef2'),
};

export const TOOL_DEFS = [
  { id: 'drone', name: 'רחפן ניטור', cost: 20, max: 99, needs: 0, color: '#4aa3d6',
    fact: 'רחפן ניטור טס מעל היער, סופר צמחים ובעלי חיים ומגלה איפה יש בעיה: מי רעב, מי בצל, ולמי חסר שותף.',
    hint: 'גררו לכל מקום באי – הרחפן יטוס סיבוב וידווח' },
  { id: 'camera', name: 'מצלמת שטח', cost: 15, max: 6, needs: 0, color: '#5a8a3e',
    fact: 'מצלמת שטח מצלמת לבד כל בעל חיים שעובר לידה, גם בלילה. כך חוקרים מגלים בעלי חיים ביישניים שכמעט אף פעם לא רואים.',
    hint: 'שימו ליד שביל או ליד מקור מזון' },
  { id: 'rescue', name: 'רובוט הצלה', cost: 15, max: 99, needs: 2, color: '#e5483b',
    fact: 'רובוט ההצלה מגיע לבעל חיים פגוע, מטפל בו ומחזיר אותו לטבע.',
    hint: 'גררו ליד בעל חיים פגוע (סימן אדום)' },
  { id: 'watergen', name: 'מחולל מים מהאוויר', cost: 30, max: 3, needs: 2, color: '#3aa8e8',
    fact: 'המכשיר מקרר את האוויר ואוסף ממנו טיפות מים, כמו טל של בוקר. ככל שהאוויר לח יותר – הוא מפיק יותר מים.',
    hint: 'שימו ליד עצים וצמחים שצריכים מים' },
  { id: 'seeddrone', name: 'רחפן זריעה', cost: 25, max: 99, needs: 4, color: '#8a6a3e',
    fact: 'רחפן זריעה מפזר כדורי זרעים עטופים באדמה ובדשן על שטח חשוף. כך משקמים יער אחרי שריפה או כריתה.',
    hint: 'גררו אל שטח חשוף' },
  { id: 'listener', name: 'מאזין יער', cost: 30, max: 2, needs: 4, color: '#ffb547',
    fact: 'מאזין היער הוא חיישן קטן עם לוח סולארי שנתלה על עץ. הוא מקשיב לקולות היער, וכשהוא שומע מסור חשמלי – הוא שולח התרעה לשומרי היער.',
    hint: 'גררו אל עץ גבוה' },
  { id: 'nestbox', name: 'תיבת קינון', cost: 15, max: 4, needs: 6, color: '#c8955a', host: true,
    fact: 'תיבת קינון היא בית מעץ לציפורים. בישראל תולים תיבות קינון לתנשמות בשדות – והתנשמות צדות עכברים במקום שישתמשו ברעל.',
    hint: 'גררו אל עץ – ציפורים יקננו בה, והמשפחות שלהן יגדלו' },
  { id: 'insecthotel', name: 'מלון חרקים', cost: 15, max: 3, needs: 6, color: '#d9a441',
    fact: 'מלון חרקים בנוי מגזעים עם חורים וקנים חלולים. דבורי בר ופרפרים מוצאים בו מחסה – והם מאביקים את הפרחים מסביב.',
    hint: 'שימו ליד פרחים – המאביקים שליד המלון יתרבו' },
  { id: 'weather', name: 'תחנת מזג אוויר', cost: 25, max: 1, needs: 6, color: '#7d8f9b',
    fact: 'תחנת מזג אוויר מודדת רוח, חום ולחות, ומזהירה מראש מפני בצורת, שריפה או שיטפון. כשיודעים מראש – אפשר להתכונן.',
    hint: 'שימו במקום פתוח – היא תקטין את הנזק של אירועי מזג אוויר' },
];
export const TOOL_ICONS = ICONS;
// field camera: photo range / cone, scan range for the lock-on, tilt limits, motion (rad/s), lens height above the ground
export const CAM = { range: 11, half: 0.8, view: 16, pitchMin: -0.4, pitchMax: 0.32, sweep: 0.22, turnMax: 1.3, eyeY: 1.35 * 1.3 + 0.04 };

// ─────────────────────────────────────────── device models (simple, readable from far)
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1, ...o });
function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; }
function cyl(r1, r2, h, mat, seg = 12) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.castShadow = true; return m; }
function makeDrone(seed = false) {
  // the Blender model (src/world/props.js); the blades spin, a faint disc shows their blur
  const g = toolProp('drone', { tint: seed ? '#b8935e' : null });
  if (!g) return makeDroneSimple(seed);
  for (const r of g.userData.rotors) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.01, 20), new THREE.MeshBasicMaterial({ color: '#d8e6ee', transparent: true, opacity: 0.22, depthWrite: false }));
    r.add(disc);
  }
  if (seed) { const pod = cyl(0.3, 0.22, 0.42, M('#c8a86a')); pod.position.y = -0.42; g.add(pod); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(1.3);
  return g;
}
function makeDroneSimple(seed = false) {
  const g = new THREE.Group();
  const body = box(1.2, 0.45, 1.2, M(seed ? '#6b5434' : '#33414d')); g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), M('#6fd0ff', { emissive: '#2a8fd0', emissiveIntensity: 0.8 })); eye.position.set(0, -0.15, 0.55); g.add(eye);
  g.userData.rotors = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const arm = box(0.12, 0.1, 1.1, M('#222a30')); arm.position.set(x * 0.55, 0.05, z * 0.55); arm.rotation.y = Math.atan2(x, z); g.add(arm);
    const rot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 16), new THREE.MeshBasicMaterial({ color: '#cfe2ee', transparent: true, opacity: 0.45 })); rot.position.set(x * 0.95, 0.18, z * 0.95); g.add(rot); g.userData.rotors.push(rot);
  }
  if (seed) { const pod = cyl(0.4, 0.3, 0.5, M('#c8a86a')); pod.position.y = -0.45; g.add(pod); }
  g.scale.setScalar(1.3);
  return g;
}
function makeCamera() {
  const g = new THREE.Group();
  const post = cyl(0.07, 0.09, 1.1, M('#5b4a32')); post.position.y = 0.55; g.add(post);
  // the head turns on the post (yaw) and nods a little (pitch): it always faces where the camera looks
  const head = new THREE.Group(); head.position.y = 1.35; head.rotation.order = 'YXZ'; g.add(head);
  const b = box(0.6, 0.75, 0.45, M('#4d6b3a', { roughness: 0.9 })); head.add(b);
  const lens = cyl(0.17, 0.17, 0.12, M('#1a242b')); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.03, 0.27); head.add(lens);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M('#ff4a3a', { emissive: '#ff2a1a', emissiveIntensity: 1.2 })); led.position.set(0.2, 0.27, 0.23); head.add(led);
  g.userData.led = led; g.userData.head = head;
  g.scale.setScalar(1.3);
  return g;
}
function makeRobot() {
  const g = toolProp('robot');
  if (!g) return makeRobotSimple();
  for (const c of g.children) c.position.y -= 0.04;   // tracks on the ground
  g.scale.setScalar(1.25);
  return g;
}
function makeRobotSimple() {
  const g = new THREE.Group();
  const body = box(1.3, 0.6, 1.0, M('#f2f2ee')); body.position.y = 0.6; g.add(body);
  const crossM = M('#e5483b', { emissive: '#a01a10', emissiveIntensity: 0.3 });
  const c1 = box(0.5, 0.08, 0.16, crossM); c1.position.set(0, 0.92, 0); const c2 = box(0.16, 0.08, 0.5, crossM); c2.position.set(0, 0.92, 0); g.add(c1, c2);
  for (const [x, z] of [[0.55, 0.42], [-0.55, 0.42], [0.55, -0.42], [-0.55, -0.42]]) { const w = cyl(0.28, 0.28, 0.2, M('#2b343b')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.28, z); g.add(w); }
  const neck = cyl(0.06, 0.06, 0.45, M('#9fb4c4')); neck.position.set(0, 1.1, 0.3); g.add(neck);
  const head = box(0.4, 0.28, 0.3, M('#9fb4c4')); head.position.set(0, 1.4, 0.32); g.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), M('#6fd0ff', { emissive: '#2a8fd0', emissiveIntensity: 1 })); eye.position.set(0, 1.42, 0.48); g.add(eye);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), M('#ff5a4a', { emissive: '#ff2010', emissiveIntensity: 1.5 })); beacon.position.set(0, 1.62, 0.32); g.add(beacon);
  g.userData.beacon = beacon;
  g.scale.setScalar(1.25);
  return g;
}
function makeWatergen() {
  const g = new THREE.Group();
  const body = box(1.2, 1.5, 0.9, M('#f4f6f7', { roughness: 0.4 })); body.position.y = 0.75; g.add(body);
  const fan = cyl(0.42, 0.42, 0.06, M('#7d8f9b'), 20); fan.rotation.x = Math.PI / 2; fan.position.set(0, 0.95, 0.47); g.add(fan);
  const blades = box(0.75, 0.06, 0.04, M('#c9d6de')); blades.position.set(0, 0.95, 0.51); g.add(blades); g.userData.fan = blades;
  const panel = box(1.6, 0.06, 1.1, M('#2c4f7a', { metalness: 0.4, roughness: 0.3 })); panel.position.y = 1.75; panel.rotation.x = -0.35; g.add(panel);
  const tank = cyl(0.3, 0.3, 0.7, M('#3aa8e8', { transparent: true, opacity: 0.75, roughness: 0.2 })); tank.position.set(0.85, 0.35, 0); g.add(tank);
  g.scale.setScalar(1.15);
  return g;
}
function makeListener() {
  const g = new THREE.Group();
  const strap = cyl(0.62, 0.62, 0.12, M('#3b2c1e'), 14); g.add(strap);
  const b = box(0.55, 0.65, 0.3, M('#3c4a54')); b.position.set(0, 0, 0.72); g.add(b);
  const panel = box(0.8, 0.05, 0.55, M('#2c4f7a', { metalness: 0.4, roughness: 0.3 })); panel.position.set(0, 0.45, 0.8); panel.rotation.x = -0.6; g.add(panel);
  const ant = cyl(0.02, 0.02, 0.8, M('#222')); ant.position.set(0.2, 0.6, 0.72); g.add(ant);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#8fd067', { emissive: '#4fbf27', emissiveIntensity: 1.4 })); led.position.set(0, 0.05, 0.89); g.add(led);
  g.userData.led = led;
  g.scale.setScalar(1.3);
  return g;
}
function makeNestbox() {
  const g = toolProp('nestbox');
  if (!g) return makeNestboxSimple();
  g.scale.setScalar(1.3); return g;
}
function makeNestboxSimple() {
  const g = new THREE.Group();
  const strap = cyl(0.62, 0.62, 0.1, M('#3b2c1e'), 14); g.add(strap);
  const b = box(0.6, 0.75, 0.55, M('#c8955a', { roughness: 0.9 })); b.position.set(0, 0, 0.85); g.add(b);
  const roof = box(0.8, 0.08, 0.75, M('#8a5a32')); roof.position.set(0, 0.42, 0.85); roof.rotation.x = -0.25; g.add(roof);
  const hole = cyl(0.13, 0.13, 0.05, M('#2a1c0e')); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.08, 1.14); g.add(hole);
  g.scale.setScalar(1.3); return g;
}
function makeInsectHotel() {
  const g = new THREE.Group();
  const legs = M('#6b4a32');
  for (const x of [-0.5, 0.5]) { const l = box(0.1, 0.6, 0.1, legs); l.position.set(x, 0.3, 0); g.add(l); }
  const body = box(1.3, 1.1, 0.6, M('#c8955a', { roughness: 0.95 })); body.position.y = 1.15; g.add(body);
  const front = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), M('#4a3018'));
  for (let i = 0; i < 12; i++) { const h = front.clone(); h.position.set(-0.45 + (i % 4) * 0.3, 0.85 + Math.floor(i / 4) * 0.28, 0.31); g.add(h); }
  const roof = box(1.55, 0.1, 0.8, M('#8a5a32')); roof.position.y = 1.78; g.add(roof);
  g.scale.setScalar(1.2); return g;
}
function makeWeather() {
  const g = new THREE.Group();
  const pole = cyl(0.06, 0.08, 3.2, M('#9aa8b2')); pole.position.y = 1.6; g.add(pole);
  const box1 = box(0.6, 0.5, 0.4, M('#f4f6f7')); box1.position.set(0, 1.2, 0.2); g.add(box1);
  const spin = new THREE.Group(); spin.position.y = 3.2; g.add(spin);
  for (let i = 0; i < 3; i++) { const arm = box(0.7, 0.04, 0.04, M('#7d8f9b')); arm.position.x = 0.35; const cup = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI), M('#2c4f7a')); cup.position.x = 0.7; const a = new THREE.Group(); a.add(arm, cup); a.rotation.y = i * Math.PI * 2 / 3; spin.add(a); }
  g.userData.spin = spin;
  const vane = box(0.05, 0.25, 0.6, M('#e5483b')); vane.position.set(0, 2.85, -0.2); g.add(vane);
  g.scale.setScalar(1.2); return g;
}
export function toolModel(id) {
  if (id === 'nestbox') return makeNestbox();
  if (id === 'insecthotel') return makeInsectHotel();
  if (id === 'weather') return makeWeather();
  return id === 'drone' ? makeDrone() : id === 'seeddrone' ? makeDrone(true) : id === 'camera' ? makeCamera() : id === 'rescue' ? makeRobot() : id === 'watergen' ? makeWatergen() : makeListener();
}

// free the GPU memory of a model we built (own geometries and materials).
// Textures are never disposed here (the badge texture is shared), and sprites keep three's shared quad geometry.
// opts.geometryOnly: the materials are shared with other live objects (e.g. stumps) – keep them.
export function disposeObject(obj, opts = {}) {
  if (!obj) return;
  if (obj.parent) obj.parent.remove(obj);
  const seen = new Set();
  obj.traverse(o => {
    if (!o.isMesh && !o.isSprite && !o.isLine && !o.isPoints) return;
    if (!o.isSprite && o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    if (opts.geometryOnly) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && !seen.has(m)) { seen.add(m); m.dispose(); }
  });
}

// floating "!" badge (sprite) used for drone findings and injured animals
const badgeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#e5483b'; x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#fff'; x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
// injured animals get their own sign (a white first-aid cross), so it is not mixed up with a drone finding
const aidTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#e5483b'; x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#fff'; x.fillRect(26, 14, 12, 36); x.fillRect(14, 26, 36, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
function makeBadge(aid) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: aid ? aidTex : badgeTex, depthTest: false, transparent: true })); s.scale.setScalar(1.6); s.renderOrder = 20; return s; }

// ─────────────────────────────────────────── the tools system
export function createTools(ctx) {
  const { W, env, scene, markers, ui, audio, rig, reg } = ctx;
  // ground height including the river logs (the rescue robot and an injured animal stand on a log, not on the riverbed)
  const deckY = (x, z) => { const h = env.heightAt(x, z), b = env.bridgeAt ? env.bridgeAt(x, z) : null; return b !== null && b > h ? b : h; };
  const group = new THREE.Group(); group.name = 'tools'; scene.add(group);
  const placed = [];       // persistent devices {id, x, z, mesh, host?}
  const flights = [];      // drones in the air
  const robots = [];       // rescue robots on their way
  const badges = [];       // {sprite, follow, until}
  W.photos = W.photos || new Set();
  const told = new Set();
  const humidity = () => {
    if (W.biomeId === 'amazon') return 1;
    const s = { winter: 0.9, spring: 0.75, autumn: 0.6, summer: 0.45 }[W.season] ?? 0.7;
    return clamp(s + W.nightGlow * 0.2 + W.rain * 0.2);
  };

  function count(id) { return placed.filter(p => p.id === id).length; }
  function unlocked(def) { if (W.kids && !['drone', 'camera'].includes(def.id)) return false; return (W.missions?.doneCount || 0) >= def.needs || W.allToolsUnlocked; }

  function cards() {
    return TOOL_DEFS.filter(d => !W.kids || ['drone', 'camera'].includes(d.id)).map(d => ({
      id: 'tool:' + d.id, name: d.name, kind: 'tool', layer: null, layerName: '', cost: d.cost,
      locked: !unlocked(d), lockText: `נפתח אחרי ${d.needs} משימות`, canAfford: W.points >= d.cost && count(d.id) < d.max,
      alive: d.max < 99 ? count(d.id) : 0, thumb: ICONS[d.id], color: d.color, isNew: false,
    }));
  }

  // where can it go?
  function check(id, hit) {
    const d = TOOL_DEFS.find(t => t.id === id);
    if (!hit) return { ok: false, reason: 'גררו אל האי' };
    if (!unlocked(d)) return { ok: false, reason: `נפתח אחרי ${d.needs} משימות` };
    if (W.points < d.cost) return { ok: false, reason: 'אין מספיק נקודות חיים' };
    if (count(id) >= d.max) return { ok: false, reason: `אפשר להציב עד ${d.max}` };
    if (Math.hypot(hit.x, hit.z) > env.radius + 0.5) return { ok: false, reason: 'קרוב מדי לקצה' };
    if (id === 'rescue') {
      const a = injuredNear(hit.x, hit.z, 12);
      if (a) return { ok: true, target: a, text: `לטפל ב${a.sp.name}` };
      const waiting = W.animals.filter(x => x.injured && x.alive && !x.leaving);
      return { ok: false, reason: waiting.some(x => !x.injured.saving) ? 'גררו קרוב יותר לבעל החיים הפגוע' : waiting.length ? 'רובוט הצלה כבר בדרך' : 'אין כרגע בעל חיים פגוע' };
    }
    if (id === 'listener' || id === 'nestbox') {
      let best = null, bd = 5;
      for (const p of W.plants) { if (!p.alive || p.removed || !p.isTree || p.growth < 0.5 || p.falling) continue; const dd = Math.hypot(p.x - hit.x, p.z - hit.z); if (dd < bd) { bd = dd; best = p; } }
      return best ? { ok: true, host: best, text: `על ה${best.sp.name}` } : { ok: false, reason: 'גררו אל עץ גבוה' };
    }
    if (id === 'drone') return { ok: true, text: 'הרחפן יטוס ויסרוק את היער' };
    if (env.isWater(hit.x, hit.z)) return { ok: false, reason: 'זה מים' };
    if (W.onRoad && W.onRoad(hit.x, hit.z, 0.5)) return { ok: false, reason: 'לא על הכביש' };
    if (id === 'seeddrone') return W.maxPlants && W.plants.length >= W.maxPlants ? { ok: false, reason: 'היער מלא – אין מקום לעוד צמחים כרגע' } : { ok: true, text: 'כאן יפוזרו כדורי זרעים' };
    if (id === 'watergen') { const h = humidity(); return { ok: true, text: `לחות באוויר: ${Math.round(h * 100)}%` }; }
    return { ok: true };
  }

  function use(id, hit, chk) {
    const d = TOOL_DEFS.find(t => t.id === id);
    W.points -= d.cost;
    W.stats.toolUse = W.stats.toolUse || {}; W.stats.toolUse[id] = (W.stats.toolUse[id] || 0) + 1;
    audio.play('place');
    if (!told.has(id)) { told.add(id); ui.toast(d.fact, 'info'); }
    if (id === 'drone') return launchSurvey(hit);
    if (id === 'seeddrone') return launchSeeding(hit);
    if (id === 'rescue') return sendRobot(hit, chk.target);
    const p = addDevice(id, hit.x, hit.z, chk.host);
    markers.burst(new THREE.Vector3(p.x, env.heightAt(p.x, p.z) + 1.5, p.z), d.color, 18, { size: 0.45 });
  }

  function addDevice(id, x, z, host, saved) {
    const mesh = toolModel(id);
    const p = { id, x, z, mesh, host: host || null, t: 0, cool: 0 };
    if (id === 'camera') {
      // facing (yaw: 0 = +z), tilt, and auto-scan mode; a new camera faces the island's centre and starts scanning
      p.yaw = Number.isFinite(saved?.yaw) ? saved.yaw : Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.6;
      p.pitch = -0.06; p.auto = saved?.auto !== 0; p.turn = 0; p.tilt = 0; p.lock = null; p.lockT = 0; p.lockCool = 0; p.scanT = 0;
      p.recent = new Map(); p.sweepDir = Math.random() < 0.5 ? 1 : -1;
    }
    if ((id === 'listener' || id === 'nestbox') && host) {
      p.x = host.x; p.z = host.z;
      const y = host.y + Math.max(3, (host.vis.crown().bottom || 6) * host.obj.scale.x * 0.55);
      mesh.position.set(host.x, y, host.z);
      mesh.scale.multiplyScalar(Math.max(1, (host.vis.trunkRadius || 0.5) * 1.3));
    } else mesh.position.set(x, env.heightAt(x, z) - 0.02, z);
    mesh.rotation.y = id === 'camera' ? 0 : Math.random() * Math.PI * 2;
    if (id === 'camera') { mesh.userData.head.rotation.set(-p.pitch, p.yaw, 0); p.num = placed.filter(q => q.id === 'camera').length + 1; }
    if (id === 'listener' || id === 'nestbox') mesh.rotation.y = Math.atan2(rig.controls.object.position.x - p.x, rig.controls.object.position.z - p.z);
    group.add(mesh); placed.push(p);
    if (id === 'listener') W.listener = true;
    return p;
  }

  // ───── monitoring drone: flies a loop, then reports what needs attention
  function launchSurvey(hit) {
    const mesh = makeDrone(); group.add(mesh);
    const start = new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z) + 1.5, hit.z);
    flights.push({ kind: 'survey', mesh, t: 0, dur: 11, start, a0: Math.atan2(hit.z, hit.x) });
    ui.toast('רחפן הניטור המריא – סורק את היער...', 'info');
  }
  function surveyReport() {
    const lines = [], marks = [];
    const plants = W.plants.filter(p => p.alive && !p.removed && !p.dying);
    const dark = plants.filter(p => p.sp.kind !== 'fungus' && p.light < (p.sp.lightNeed ?? 0.5) * 0.55 && p.health < 0.85);
    let moveBtn = false;
    if (dark.length) {
      lines.push(`🌑 ${dark.length} צמחים לא מקבלים מספיק אור: ${[...new Set(dark.map(p => p.sp.name))].slice(0, 4).join(', ')}.`); marks.push(...dark.slice(0, 4));
      const young = dark.filter(p => p.growth < 0.6 && !p.host);
      if (young.length) { lines.push(`   ← אפשר להעביר ${young.length} שתילים צעירים למקום מואר (כפתור למטה).`); moveBtn = true; }
      if (dark.some(p => p.growth >= 0.6)) lines.push('   ← צמח גדול בצל: שתלו לידו צמחים שאוהבים צל (שרך, רקפת), או חכו שעץ ייפול ויפתח חלון אור.');
    }
    const thirsty = plants.filter(p => p.health < 0.5 && !dark.includes(p));
    if (thirsty.length) { lines.push(`💧 ${thirsty.length} צמחים חלשים או צמאים: ${[...new Set(thirsty.map(p => p.sp.name))].slice(0, 4).join(', ')}.`); marks.push(...thirsty.slice(0, 3)); }
    const hungry = W.animals.filter(a => a.alive && !a.leaving && a.type === 'animal' && a.energy < 0.35 && a.sp.diet2.length);
    for (const sid of [...new Set(hungry.map(a => a.sp.id))].slice(0, 3)) { const sp = reg.byId.get(sid); lines.push(`🍽 ה${sp.name} ${gw(sid,'רעב','רעבה','רעבים','רעבות')}. ${gw(sid,'הוא אוכל','היא אוכלת','הם אוכלים','הן אוכלות')}: ${sp.diet2.map(e => reg.byId.get(e.to)?.name).filter(Boolean).slice(0, 3).join(', ')}.`); }
    marks.push(...hungry.slice(0, 3));
    const present = new Set(W.aliveSpecies());
    for (const sid of present) {
      const sp = reg.byId.get(sid); if (!sp?.isPlant) continue;
      if (sp.pollinators.length && !sp.pollinators.some(x => present.has(x))) lines.push(`🌸 ל${sp.name} אין מאביק באי. מי יכול לעזור: ${sp.pollinators.map(x => reg.byId.get(x)?.name).join(', ')}.`);
      else if (sp.dispersers.length && !sp.dispersers.some(x => present.has(x))) lines.push(`🌱 אין מי שיפיץ את הזרעים של ה${sp.name}: ${sp.dispersers.map(x => reg.byId.get(x)?.name).join(', ')}.`);
    }
    const inj = W.animals.filter(a => a.injured);
    for (const a of inj) lines.push(`🚑 ${a.sp.name} ${a.injured.cause}. ${a.injured.saving ? 'רובוט הצלה כבר בדרך.' : 'שלחו רובוט הצלה!'}`);
    if (W.road && !W.road.bridge) lines.push('🛣 הכביש חותך את היער לשניים. לחצו עליו כדי לתקן.');
    const wg = TOOL_DEFS.find(t => t.id === 'watergen');
    if ((W.drought > 0.2 || (W.biomeId === 'grove' && W.season === 'summer')) && unlocked(wg) && count('watergen') < wg.max) lines.push('☀ האדמה יבשה. מחולל מים מהאוויר ליד העצים יעזור.');
    for (const m of marks.slice(0, 8)) addBadge(m, 30);
    W.points += 3;
    const ok = lines.length === 0;
    const buttons = [{ id: 'ok', label: 'תודה, רחפן!' }];
    if (moveBtn) buttons.unshift({ id: 'move-shaded', label: 'העבירו את השתילים המוצלים לאור (10 נקודות)' });
    ui.showDialog({ title: 'דוח רחפן הניטור', text: ok ? 'הרחפן סרק את כל היער – הכול נראה טוב! כל המינים מקבלים מה שהם צריכים.' : 'הרחפן מצא כמה דברים שכדאי לטפל בהם (הם מסומנים ב-! אדום):\n\n' + lines.slice(0, 9).join('\n'), buttons });
    audio.play('discover');
  }

  // ───── seed-ball drone
  function launchSeeding(hit) {
    const mesh = makeDrone(true); group.add(mesh);
    const a = Math.atan2(hit.z, hit.x);
    const start = new THREE.Vector3(Math.cos(a) * 50, 25, Math.sin(a) * 50);
    const target = new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z) + 9, hit.z);
    flights.push({ kind: 'seed', mesh, t: 0, dur: 6, start, target, dropped: false });
  }
  function dropSeeds(f) {
    const pool = (W.biomeId === 'amazon' ? ['cecropia', 'fig', 'brazilnut', 'kapok', 'acai', 'heliconia'] : ['oak', 'carob', 'terebinth', 'mastic', 'sage', 'rockrose'])
      .filter(id => W.unlocked.has(id) || reg.byId.get(id)?.unlock === 'start');
    let n = 0;
    for (let i = 0; i < 6 && n < 4; i++) {
      const sp = reg.byId.get(pool[(Math.random() * pool.length) | 0]); if (!sp) continue;
      const s = ctx.findSpotNear(sp, f.target.x, f.target.z, 6); if (!s) continue;
      const p = ctx.spawnPlant(sp, s.x, s.z, { growth: 0.06 }); if (!p) continue;
      W.everPlaced.add(sp.id); n++; W.stats.seeded = (W.stats.seeded || 0) + 1;
      markers.burst(new THREE.Vector3(s.x, env.heightAt(s.x, s.z) + 0.4, s.z), '#a07a4a', 12, { size: 0.35, speed: 1.2 });
    }
    ui.toast(n ? `רחפן הזריעה פיזר כדורי זרעים – ${n} שתילים חדשים נובטים!` : 'אין כאן מקום פנוי לשתילים', n ? 'good' : 'warn');
    if (n) W.points += 2;
  }

  // ───── injured animals + rescue robot
  let injuryT = 120;
  function injuredNear(x, z, r) { let best = null, bd = r; for (const a of W.animals) if (a.injured && !a.injured.saving && a.alive && !a.leaving) { const d = Math.hypot(a.pos.x - x, a.pos.z - z); if (d < bd) { bd = d; best = a; } } return best; }
  function maybeInjure(dt) {
    if (W.kids || W.day < 2 || W.animals.some(a => a.injured)) return;
    if (W.missions?.current()?.goal?.type === 'rescue') injuryT = Math.min(injuryT, 25);
    injuryT -= dt; if (injuryT > 0) return;
    injuryT = 150 + Math.random() * 120;
    const cand = W.animals.filter(a => a.alive && !a.leaving && !a.touring && a.type === 'animal' && a.visible && (a.loco === 'ground' || a.loco === 'flying') && !a.sp.isInsect && (a.loco !== 'flying' || !a.perch));
    if (!cand.length) return;
    const a = cand[(Math.random() * cand.length) | 0];
    let cause;
    const g = (m, f, mp, fp) => gw(a.sp.id, m, f, mp, fp);
    if (W.road && !W.road.bridge && a.loco === 'ground') cause = g('נפגע כשניסה', 'נפגעה כשניסתה', 'נפגעו כשניסו', 'נפגעו כשניסו') + ' לחצות את הכביש';
    else if (a.loco === 'flying') cause = g('נתקע', 'נתקעה', 'נתקעו', 'נתקעו') + ' ברשת ישנה שמישהו השאיר ביער';
    else cause = [g('נפצע', 'נפצעה', 'נפצעו', 'נפצעו') + ' ברגל מחתיכת זכוכית שנזרקה', g('נתקע', 'נתקעה', 'נתקעו', 'נתקעו') + ' בשקית ניילון'][(Math.random() * 2) | 0];
    if (a.loco === 'flying') { a.path = null; a.perch = null; a.pos.y = env.heightAt(a.pos.x, a.pos.z) + 0.3; }
    a.injured = { t: 0, max: 80, cause };
    a.state = 'sleep'; a.action = 'sleep';
    removeBadge(a);   // a drone "!" on it would block the first-aid sign
    addBadge(a, 999, true);
    // the alert says plainly what happened and what to do; it stays long enough for a young reader
    ui.toast(`🚑 ${a.sp.name} ${cause}! שלחו רובוט הצלה: גררו אותו מלשונית טכנולוגיה אל הצלב האדום.`, 'warn', 9000);
    audio.play('event');
    if (!unlocked(TOOL_DEFS.find(t => t.id === 'rescue'))) { W.allToolsUnlocked = true; }   // the rescue robot must be available when needed
  }
  function sendRobot(hit, a) {
    const mesh = makeRobot(); group.add(mesh);
    const p = new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z), hit.z);
    mesh.position.copy(p);
    if (a.injured) a.injured.saving = true;   // only one robot per injured animal
    robots.push({ mesh, a, phase: 'go', t: 0 });
  }
  function updateInjured(a, rdt, t) {
    // an event (or anything else) made it leave: drop the injury so the normal update can play the leaving animation
    if (!a.alive || a.leaving || a.dying) { a.injured = null; removeBadge(a); return; }
    addBadge(a, 999, true);   // e.g. after an experiment hid it, the badge comes back
    a.injured.t += W.lastTickDt;
    a.obj.position.set(a.pos.x, a.groundY(a.pos.x, a.pos.z) + (a.loco === 'flying' ? 0.2 : 0), a.pos.z);
    a.vis.update(rdt, { action: 'sleep', speed: 0, t, night: W.nightGlow });
    if (a.injured.t > a.injured.max && !a.injured.saving) {
      a.injured = null; removeBadge(a); a.leave();
      ui.toast(`${a.sp.name} ${gw(a.sp.id,'לא קיבל עזרה בזמן ועזב','לא קיבלה עזרה בזמן ועזבה','לא קיבלו עזרה בזמן ועזבו','לא קיבלו עזרה בזמן ועזבו')} את היער.`, 'bad');
    }
  }

  // ───── badges
  function addBadge(ent, secs, pulse) {
    if (badges.some(b => b.follow === ent)) return;
    const s = makeBadge(!!ent.injured); group.add(s);
    badges.push({ sprite: s, follow: ent, until: W.simT + secs, pulse });
  }
  function removeBadge(ent) { for (let i = badges.length - 1; i >= 0; i--) if (badges[i].follow === ent) { disposeObject(badges[i].sprite); badges.splice(i, 1); } }

  // ───── field cameras: 360° head, auto scan with a short lock-on, photos of what is in front of the lens
  const hooks = { onShot: null };
  const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const _f = new THREE.Vector3();
  /** lens position of a placed camera (world) */
  function camEye(p, out = new THREE.Vector3()) { return out.set(p.x + Math.sin(p.yaw) * 0.42, env.heightAt(p.x, p.z) + CAM.eyeY, p.z + Math.cos(p.yaw) * 0.42); }
  const camOK = (a) => a.alive && !a.removed && !a.leaving && a.type === 'animal';
  /** where an animal is seen from the camera: horizontal distance, bearing offset from the facing, height difference */
  function bearing(p, a, eyeY) {
    a.focusPoint(_f);
    const dx = _f.x - p.x, dz = _f.z - p.z, d = Math.hypot(dx, dz);
    return { d, off: wrapA(Math.atan2(dx, dz) - p.yaw), dy: _f.y - eyeY };
  }
  function pickTarget(p) {
    const eyeY = env.heightAt(p.x, p.z) + CAM.eyeY;
    let best = null, bs = Infinity;
    for (const a of W.animals) {
      if (!camOK(a)) continue;
      const until = p.recent.get(a); if (until && until > W.simT) continue;
      const b = bearing(p, a, eyeY);
      if (b.d > CAM.view || b.d < 0.6 || Math.abs(b.dy) > 14) continue;
      const moving = (a.speed || 0) > 0.15;
      const key = a.sp.id + (W.nightGlow > 0.5 ? ':night' : '');
      // near + moving + not photographed yet wins; a small bias toward what is already in view keeps the swings calm
      const s = b.d + (moving ? 0 : 5) + (W.photos.has(key) ? 4 : 0) + Math.abs(b.off) * 1.5;
      if (s < bs) { bs = s; best = a; }
    }
    return best;
  }
  function aimCamera(p, dt) {
    if (p.auto) {
      p.scanT -= dt; p.lockCool -= dt;
      const eyeY = env.heightAt(p.x, p.z) + CAM.eyeY;
      if (p.lock && (!camOK(p.lock) || bearing(p, p.lock, eyeY).d > CAM.view + 3)) { p.lock = null; p.lockCool = 1; }
      if (p.lock) { p.lockT -= dt; if (p.lockT <= 0) { p.recent.set(p.lock, W.simT + 10); p.lock = null; p.lockCool = 1.6; } }
      if (!p.lock && p.lockCool <= 0 && p.scanT <= 0) {
        p.scanT = 0.4;
        if (p.recent.size > 24) for (const [k, v] of p.recent) if (v < W.simT) p.recent.delete(k);
        p.lock = pickTarget(p); if (p.lock) p.lockT = 4 + Math.random() * 1.5;
      }
      if (p.lock) {
        const b = bearing(p, p.lock, eyeY);
        p.yaw += clamp(b.off * 2.6, -CAM.turnMax, CAM.turnMax) * dt;
        const pt = clamp(Math.atan2(b.dy, Math.max(0.5, b.d)), CAM.pitchMin, CAM.pitchMax);
        p.pitch += (pt - p.pitch) * Math.min(1, dt * 3);
      } else {
        p.yaw += CAM.sweep * p.sweepDir * dt;
        p.pitch += (-0.06 - p.pitch) * Math.min(1, dt * 1.5);
      }
    }
    p.yaw = wrapA(p.yaw); p.pitch = clamp(p.pitch, CAM.pitchMin, CAM.pitchMax);
    p.mesh.userData.head.rotation.set(-p.pitch, p.yaw, 0);
  }
  /** the animal in the photo cone (the locked one first, else the nearest) */
  function cameraSees(p) {
    const eyeY = env.heightAt(p.x, p.z) + CAM.eyeY;
    let best = null, bd = Infinity;
    for (const a of W.animals) {
      if (!camOK(a)) continue;
      const b = bearing(p, a, eyeY);
      if (b.d > CAM.range || Math.abs(b.off) > CAM.half || Math.abs(b.dy) > 12) continue;
      const s = a === p.lock ? -1 : b.d;
      if (s < bd) { bd = s; best = a; }
    }
    return best;
  }

  // ───── per-frame
  const _v = new THREE.Vector3();
  function update(dt, rdt, t) {
    // drones
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i]; f.t += rdt;
      for (const r of f.mesh.userData.rotors) r.rotation.y += rdt * 40;
      if (f.kind === 'survey') {
        const u = clamp(f.t / f.dur);
        const rise = Math.min(1, f.t / 1.5);
        const ang = f.a0 + u * Math.PI * 2, R = 24;
        const tx = Math.cos(ang) * R, tz = Math.sin(ang) * R, ty = 32;
        const k = Math.min(1, f.t / 2.5);
        f.mesh.position.set(f.start.x + (tx - f.start.x) * k, f.start.y + (ty - f.start.y) * rise, f.start.z + (tz - f.start.z) * k);
        f.mesh.rotation.y = -ang; f.mesh.rotation.z = 0.15;
        if (Math.random() < rdt * 3) markers.burst(_v.set(f.mesh.position.x, env.heightAt(f.mesh.position.x, f.mesh.position.z) + 0.5, f.mesh.position.z), '#6fd0ff', 4, { size: 0.3, speed: 0.6, up: 0.3 });
        if (u >= 1) { disposeObject(f.mesh); flights.splice(i, 1); surveyReport(); }
      } else {
        const u = clamp(f.t / f.dur);
        if (u < 0.6) f.mesh.position.lerpVectors(f.start, f.target, u / 0.6);
        else if (!f.dropped) { f.dropped = true; dropSeeds(f); }
        else f.mesh.position.lerpVectors(f.target, new THREE.Vector3(-f.start.x, 30, -f.start.z), (u - 0.6) / 0.4);
        f.mesh.rotation.y = Math.atan2(f.target.x - f.start.x, f.target.z - f.start.z);
        if (u >= 1) { disposeObject(f.mesh); flights.splice(i, 1); }
      }
    }
    // rescue robots
    for (let i = robots.length - 1; i >= 0; i--) {
      const r = robots[i]; r.t += rdt; const a = r.a;
      if (r.mesh.userData.beacon) r.mesh.userData.beacon.material.emissiveIntensity = 0.8 + Math.sin(t * 10) * 0.8;
      if (r.phase === 'go') {
        if (!a.alive || !a.injured || a.leaving) { r.phase = 'leave'; r.t = 0; continue; }
        a.injured.saving = true;
        const dx = a.pos.x - r.mesh.position.x, dz = a.pos.z - r.mesh.position.z, d = Math.hypot(dx, dz);
        r.mesh.rotation.y = Math.atan2(dx, dz);
        if (d > 1.6) { const s = Math.min(d, 5 * rdt); r.mesh.position.x += dx / d * s; r.mesh.position.z += dz / d * s; r.mesh.position.y = deckY(r.mesh.position.x, r.mesh.position.z); }
        else { r.phase = 'heal'; r.t = 0; }
      } else if (r.phase === 'heal') {
        if (!a.alive || !a.injured || a.leaving) { r.phase = 'leave'; r.t = 0; continue; }   // healed by someone else, or gone
        if (Math.random() < rdt * 8) markers.burst(a.focusPoint(_v), '#9fffb0', 6, { size: 0.4, speed: 1 });
        if (r.t > 3) {
          a.injured = null; removeBadge(a); a.energy = 1; a.state = 'idle'; a.timer = 0.5;
          W.points += 8; W.stats.rescues = (W.stats.rescues || 0) + 1;
          ui.toast(`ה${a.sp.name} ${gw(a.sp.id,'טופל וחזר','טופלה וחזרה','טופלו וחזרו','טופלו וחזרו')} לחיות ביער! (+8)`, 'good'); audio.play('mission');
          r.phase = 'leave'; r.t = 0;
        }
      } else {
        r.mesh.position.y += rdt * 0.6; r.mesh.scale.multiplyScalar(1 - rdt * 1.5);
        if (r.t > 1.5) { disposeObject(r.mesh); robots.splice(i, 1); }
      }
    }
    // devices
    for (const p of placed) {
      p.t += rdt;
      if (p.id === 'camera') {
        p.mesh.userData.led.material.emissiveIntensity = (Math.sin(t * 3) > 0.6) ? 1.6 : 0.2;
        aimCamera(p, dt);
        p.cool -= dt; if (p.cool > 0) continue;
        // it photographs what is in front of the lens (the same cone the camera view shows)
        const a = cameraSees(p);
        if (a) {
          p.cool = 6;
          markers.burst(_v.set(p.x, env.heightAt(p.x, p.z) + 2, p.z), '#ffffff', 10, { size: 0.6, speed: 0.4, life: 0.4 });
          const key = a.sp.id + (W.nightGlow > 0.5 ? ':night' : '');
          const fresh = !W.photos.has(key);
          if (fresh) {
            W.photos.add(key); W.points += 3; audio.play('points');
            ui.toast(`📷 מצלמת השטח צילמה: ${a.sp.name}${W.nightGlow > 0.5 ? ' – בלילה!' : ''} (+3)`, 'good');
          }
          if (hooks.onShot) hooks.onShot(p, a, fresh);
        }
      } else if (p.id === 'watergen') {
        const h = humidity();
        if (p.mesh.children[2]) p.mesh.children[2].rotation.z += rdt * (2 + 8 * h);
        if (Math.random() < rdt * 2 * h) markers.burst(_v.set(p.x, env.heightAt(p.x, p.z) + 0.6, p.z), '#5cc4ff', 3, { size: 0.28, speed: 0.4, up: 0.2, life: 0.8 });
      } else if (p.id === 'weather') { if (p.mesh.userData.spin) p.mesh.userData.spin.rotation.y += rdt * (2 + W.wind * 8); }
      else if (p.id === 'nestbox' || p.id === 'listener') {
        // only a really dead host takes the device with it; a host hidden by an experiment just hides it for a while
        if (p.host && (!p.host.alive || p.host.dying || p.host.falling)) { disposeObject(p.mesh); p.dead = true; continue; }
        p.hidden = !!(p.host && p.host.removed);
        p.mesh.visible = !p.hidden;
        if (p.id === 'listener' && !p.hidden) p.mesh.userData.led.material.emissiveIntensity = (Math.sin(t * 2) > 0.8) ? 2 : 0.3;
      }
    }
    for (let i = placed.length - 1; i >= 0; i--) if (placed[i].dead) placed.splice(i, 1);
    W.listener = placed.some(p => p.id === 'listener' && !p.hidden);
    W.weatherStation = placed.some(p => p.id === 'weather');
    W.nestboxes = placed.filter(p => p.id === 'nestbox' && !p.hidden).length;
    W.insectHotels = placed.filter(p => p.id === 'insecthotel');
    // badges follow their entity
    for (let i = badges.length - 1; i >= 0; i--) {
      const b = badges[i], e = b.follow;
      if (W.simT > b.until || !e.alive || e.removed) { disposeObject(b.sprite); badges.splice(i, 1); continue; }
      e.focusPoint(_v); const top = e.isPlant ? e.topY() + 1.2 : _v.y + 1.4;
      b.sprite.position.set(_v.x, top, _v.z);
      const s = b.pulse ? 1.5 + Math.sin(t * 6) * 0.3 : 1.4; b.sprite.scale.setScalar(s);
    }
    maybeInjure(dt);
  }

  // water from the air: extra water for plants near a generator (0..1)
  W.waterBonusAt = (x, z) => {
    let b = 0; const h = humidity();
    for (const p of placed) if (p.id === 'watergen') { const d = Math.hypot(p.x - x, p.z - z); if (d < 11) b = Math.max(b, (1 - d / 11) * 0.5 + 0.5); }
    return b * (0.4 + 0.6 * h);
  };

  function serialize() { return { devices: placed.map(p => ({ id: p.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), ...(p.id === 'camera' ? { yaw: +p.yaw.toFixed(2), auto: p.auto ? 1 : 0 } : {}) })), photos: [...W.photos], told: [...told] }; }
  function restore(S, findHost) {
    if (!S) return;
    for (const k of S.photos || []) W.photos.add(k);
    for (const k of S.told || []) told.add(k);
    for (const d of S.devices || []) { const needsHost = d.id === 'listener' || d.id === 'nestbox'; const host = needsHost ? findHost(d.x, d.z) : null; if (needsHost && !host) continue; addDevice(d.id, d.x, d.z, host, d); }
  }
  function dispose() {
    disposeObject(group);
    placed.length = 0; flights.length = 0; robots.length = 0; badges.length = 0;
  }
  // does a device (nest box, forest listener) hang on this plant?
  function hostsDevice(plant) { return placed.some(p => p.host === plant && !p.dead); }
  return { cards, hostsDevice, check, use, update, updateInjured, serialize, restore, dispose, model: toolModel, defs: TOOL_DEFS, humidity,
    cameras: () => placed.filter(p => p.id === 'camera'), camEye, cameraSees, hooks };
}
