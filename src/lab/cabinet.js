// מעבדת רובו־דע – the cabinet's own world (19.10; big update 1.3.1), beside "ראינו או חשבנו?" (thinking.js; the wobbly scale was removed in 1.3.1).
//   האוסף שלנו         the shelves: six things that are always there, and shelves that fill from the rest of the game
//                       (microscope samples, solved mysteries, jars from the deep expedition, patents from the inventors as
//                       certificates, clues solved here); every thing opens big, with a magnifying glass
//   ממיינים כמו חוקרים   a pool of about a hundred creatures and things (sort-data.js); each round takes 8 to 10 of them. The
//                       child sorts by a rule of their own into two or three boxes and רובו־דע guesses it; or he sorts by one
//                       of sixteen rules and the child guesses. Two rules can fit the same boxes.
//   מי השאיר את זה?     25 cases in the three zones (clue-cases.js): paintings of what was found, a magnifying glass for the
//                       details, suspects with their card paintings, ruling out one by one, and who it really was
// Pictures: card paintings for creatures, the lab's own paintings for the rest (lab-pics.js; a soft tile until they exist).
// Facts: docs/sources.md ("The lab's stations"). Progress: labProgress().st.collection / .sort / .clues. Badges lab:collect,
// lab:sort, lab:sortrules, lab:clues, lab:clues-all.
import { esc, icon } from '../ui/ui.js';
import { stationShell, addCss } from './station-kit.js';
import { COMMON_T, MENU_T, COLL_T, SORT_T, CLUES_T } from './station-text.js';
import { stUpdate, stOf, labProgress } from './progress.js';
import { SAMPLES } from './samples.js';
import { SAMPLES_K } from './kids-text.js';
import { CASES } from '../research/cases/index.js';
import { researchProgress } from '../research/progress.js';
import { PROBLEMS, TRAIT, problemNeeds } from '../data/inventions.js';
import { PROBLEMS_K, TRAIT_K } from '../data/inventions-kids.js';
import { grant as grantBadge, tally, hasBadge } from '../core/badges-store.js';
import { picHTML, picSrc, frameArt, PICS_CSS } from './lab-pics.js';
import { POOL, RULES, SETS, attrOf, rulesOfSet, SORT2_T, speciesName } from './sort-data.js';
import { CLUE_CASES, SUS, ZONES_T, CAB_T } from './clue-cases.js';
import { FINDS_T, JARS_T } from './station-text.js';
import { MISSIONS } from '../data/inventions.js';
import { MISSIONS_K } from '../data/inventions-kids.js';
import { key as profileKey } from '../core/profiles.js';
import { BABA_DA_LOGO } from '../data/logo.js';

// ───────────────────────────────────────── 1.3.2: soft shadows of what is not found yet (never a "?"), one shape per kind
// of thing; a mystery's find has its own shape (FIND_SHAPE). Plain filled shapes, drawn in one soft colour; no crossing bars.
const SHAPES = {
  box: '<path fill-rule="evenodd" d="M24 46L50 20l26 26v38H24zM42 56a8 8 0 1 0 16 0a8 8 0 1 0-16 0z"/>',
  reeds: [26, 37, 48, 59, 70].map((x, i) => `<rect x="${x}" y="${28 + (i % 2) * 6}" width="9" height="${54 - (i % 2) * 6}" rx="4.5"/>`).join(''),
  pod: '<circle cx="50" cy="56" r="28"/><path d="M43 31q7-12 14 0z"/>',
  ball: '<path fill-rule="evenodd" d="M16 80Q16 28 50 26Q84 28 84 80zM34 58a6 6 0 1 0 12 0a6 6 0 1 0-12 0zM56 50a6 6 0 1 0 12 0a6 6 0 1 0-12 0z"/>',
  buoy: '<circle cx="50" cy="38" r="20"/><rect x="47.5" y="56" width="5" height="22" rx="2"/><ellipse cx="50" cy="82" rx="16" ry="5"/>',
  coral: '<path d="M46 88V64Q30 56 28 34Q28 24 34 24Q38 26 37 36Q38 50 46 54V32Q46 22 50 20Q54 22 54 32V54Q62 50 63 36Q62 26 66 24Q72 24 72 34Q70 56 54 64V88z"/>',
  tuft: '<path d="M12 82Q50 60 88 30" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="62" rx="12" ry="8"/><ellipse cx="56" cy="50" rx="10" ry="7"/><ellipse cx="74" cy="38" rx="9" ry="6"/>',
  rosette: [-56, -28, 0, 28, 56].map((a) => `<ellipse cx="50" cy="52" rx="8" ry="30" transform="rotate(${a} 50 84)"/>`).join(''),
  sprout: '<rect x="47.5" y="46" width="5" height="40" rx="2"/><path d="M50 54Q30 52 22 32Q44 32 50 54z"/><path d="M50 48Q66 42 76 24Q56 26 50 48z"/><ellipse cx="50" cy="86" rx="14" ry="4"/>',
  leaf: [-72, -48, -24, 0, 24, 48, 72].map((a) => `<ellipse cx="50" cy="40" rx="7" ry="26" transform="rotate(${a} 50 66)"/>`).join('') + '<rect x="47.5" y="62" width="5" height="26" rx="2"/>',
  feather: '<path d="M50 12Q74 30 68 64Q58 82 50 88Q42 82 32 64Q26 30 50 12z"/><rect x="48" y="80" width="4" height="12" rx="2"/>',
  branch: '<path d="M14 84Q48 62 86 22" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="38" cy="58" rx="10" ry="5" transform="rotate(-50 38 58)"/><ellipse cx="62" cy="46" rx="10" ry="5" transform="rotate(30 62 46)"/><circle cx="72" cy="56" r="5"/><circle cx="80" cy="50" r="5"/><circle cx="46" cy="72" r="5"/>',
  track: '<path d="M30 28Q46 24 47 50Q46 76 36 80Q24 72 27 50z"/><path d="M70 28Q54 24 53 50Q54 76 64 80Q76 72 73 50z"/>',
  jar: '<path d="M30 28h40v8q8 6 8 16v30q0 8-8 8h-40q-8 0-8-8v-30q0-10 8-16z"/><rect x="28" y="18" width="44" height="10" rx="2"/>',
  robot: '<rect x="30" y="24" width="40" height="28" rx="11"/><rect x="26" y="56" width="48" height="30" rx="11"/><rect x="47.5" y="10" width="5" height="16" rx="2"/><circle cx="50" cy="10" r="5"/>',
  photo: '<path fill-rule="evenodd" d="M16 24h68v54H16zM24 70l18-24 12 14 8-8 16 18z"/>',
  bird: '<path d="M14 60Q36 38 60 46Q70 32 84 38Q76 42 74 50Q68 72 44 74Q28 74 14 60z"/>',
  round: '<circle cx="50" cy="52" r="32"/>',
  table: '<ellipse cx="50" cy="44" rx="40" ry="14"/><rect x="43" y="50" width="14" height="22" rx="5"/><ellipse cx="50" cy="80" rx="26" ry="9"/>',
  paw: '<ellipse cx="50" cy="66" rx="20" ry="16"/><ellipse cx="24" cy="42" rx="8" ry="10"/><ellipse cx="40" cy="30" rx="8" ry="10"/><ellipse cx="60" cy="30" rx="8" ry="10"/><ellipse cx="76" cy="42" rx="8" ry="10"/>',
  cone: '<ellipse cx="50" cy="56" rx="22" ry="32"/><rect x="47" y="14" width="6" height="12" rx="3"/>',
  oneleaf: '<path d="M18 80Q14 30 70 16Q86 14 84 30Q78 76 18 80z"/>',
  patent: '<rect x="20" y="10" width="60" height="80" rx="4"/>',
};
const FIND_SHAPE = { 'mice-owl': 'box', 'flowers-bees': 'rosette', 'brazil-nut': 'pod', 'green-reef': 'ball', 'cleaning-station': 'coral', 'white-coral': 'table',
  'the-trap': 'feather', frogs: 'leaf', 'young-oaks': 'sprout', leafcutters: 'oneleaf', 'no-predators': 'paw', 'summer-fire': 'cone', gazelles: 'track' };
const SHELF_SHAPE = { scope: 'round', jars: 'jar', patents: 'patent', robots: 'robot', photos: 'photo', visitors: 'bird', clues: 'pod', cases: 'pod' };
export const shadowHTML = (shape, cls = '') => `<i class="cb-ghost ${cls}" aria-hidden="true"><svg viewBox="0 0 100 100"><g fill="currentColor">${SHAPES[shape] || SHAPES.round}</g></svg></i>`;
// what other parts of the game keep (read only; a missing store is an empty shelf)
function readStore(base) { try { const t = localStorage.getItem(profileKey(base)); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
const hubGames = () => { const S = readStore('web-of-life-cards'); return (S && S.games) || {}; };
// the expedition's samples by id, once it keeps them (hub store games.expedition.found: { id: count } or [id]); else null
export function expeditionFound() {
  const f = (hubGames().expedition || {}).found;
  if (!f) return null;
  const ids = Array.isArray(f) ? f : Object.keys(f).filter((k) => f[k]);
  return ids.filter((id) => JARS_T[id]);
}
// the robot workshop's builds: the hub already keeps the last eight (web-of-life-cards games.inventors.robots)
export function robotsBuilt() {
  const a = [].concat((hubGames().inventors || {}).robots || []);
  const seen = new Set(); return a.filter((r) => r && r.name && !seen.has(r.name + '|' + r.at) && seen.add(r.name + '|' + r.at));
}
// a robot drawn from its name: the colours and the antenna change, the face is רובו־דע's visor
function robotSvg(seed) {
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const COL = ['#e0a43a', '#2c9a92', '#d8606a', '#5a8ad8', '#8a5ab8', '#4f8a3f'][h % 6], C2 = ['#263440', '#3a2a14', '#1d5e66'][(h >> 3) % 3];
  const ant = (h >> 5) % 2 ? '<rect x="48" y="8" width="4" height="14" rx="2" fill="#5a6a74"/><circle cx="50" cy="8" r="5" fill="#ffd978"/>' : '<path d="M42 22Q44 10 50 8Q56 10 58 22z" fill="#ffd978"/>';
  const legs = (h >> 7) % 2 ? '<circle cx="36" cy="88" r="7" fill="#3a4650"/><circle cx="64" cy="88" r="7" fill="#3a4650"/>' : '<rect x="33" y="80" width="8" height="12" rx="3" fill="#3a4650"/><rect x="59" y="80" width="8" height="12" rx="3" fill="#3a4650"/>';
  return `${ant}${legs}<rect x="26" y="52" width="48" height="32" rx="12" fill="${COL}"/><rect x="30" y="20" width="40" height="30" rx="12" fill="#f3f1ea" stroke="${C2}" stroke-width="2"/>
    <rect x="35" y="27" width="30" height="16" rx="7" fill="#0a1016"/><circle cx="44" cy="35" r="3" fill="#8ff2ff"/><circle cx="56" cy="35" r="3" fill="#8ff2ff"/>
    <circle cx="50" cy="68" r="6" fill="#fff" opacity=".7"/><rect x="16" y="56" width="10" height="20" rx="5" fill="${COL}"/><rect x="74" y="56" width="10" height="20" rx="5" fill="${COL}"/>`;
}

// ───────────────────────────────────────── the old drawings: only a stand-in for the six shelf things until their paintings exist
const D = {
  cone: '<ellipse cx="50" cy="54" rx="24" ry="34" fill="#8a5a2a"/>' + [...Array(5)].map((_, r) => [...Array(4)].map((__, c) => `<path d="M${30 + c * 13 + (r % 2) * 6} ${28 + r * 12}q6 -7 12 0q-6 5 -12 0z" fill="#b07a3a" stroke="#5a3a1a" stroke-width="1.2"/>`).join('')).join('') + '<path d="M50 20V12" stroke="#6a4a2a" stroke-width="4"/>',
  acorn: '<ellipse cx="50" cy="60" rx="20" ry="26" fill="#b8843a"/><ellipse cx="44" cy="54" rx="5" ry="10" fill="#d8a85a" opacity=".6"/><path d="M27 42Q50 22 73 42Q50 50 27 42Z" fill="#7a5a2a"/><g stroke="#5a3a1a" stroke-width="1.2"><path d="M33 38l6 4M42 33l5 5M52 32l3 6M61 34l1 6M68 38l-2 5"/></g><path d="M50 28V18" stroke="#5a3a1a" stroke-width="4" stroke-linecap="round"/>',
  jayfeather: '<path d="M50 92L50 10" stroke="#5a5a5a" stroke-width="2"/><path d="M50 14Q74 30 70 64Q60 82 50 88Q40 82 30 64Q26 30 50 14Z" fill="#7ab8e8"/>' + [...Array(7)].map((_, k) => `<path d="M32 ${30 + k * 8}Q40 ${27 + k * 8} 47.5 ${27 + k * 8}M52.5 ${27 + k * 8}Q60 ${27 + k * 8} 68 ${30 + k * 8}" stroke="#16202a" stroke-width="2.4" fill="none"/>`).join(''),
  carob: '<path d="M14 70Q30 30 70 22Q88 20 86 30Q70 36 48 56Q30 74 18 80Q10 80 14 70Z" fill="#4a2a14"/><path d="M22 70Q38 46 76 28" stroke="#6a4a2a" stroke-width="2" fill="none"/>',
  quill: '<path d="M14 86L86 14" stroke="#f2efe6" stroke-width="7" stroke-linecap="round"/>' + [...Array(6)].map((_, k) => `<path d="M${20 + k * 12} ${80 - k * 12}l7 -7" stroke="#16161a" stroke-width="7.5" stroke-linecap="butt"/>`).join(''),
  pineseed: '<path d="M30 70Q34 30 70 18Q78 26 66 46Q52 66 36 74Z" fill="#c8a46a" stroke="#8a6a3a" stroke-width="1.5"/><ellipse cx="32" cy="74" rx="9" ry="6" fill="#4a3220" transform="rotate(-30 32 74)"/>',
};
const svgUrl = (body, vb = '0 0 100 100') => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`);
const folder = (col) => `<path d="M14 30h26l6 8h40v46H14z" fill="${col}"/><path d="M14 42h72v42H14z" fill="${col}" opacity=".85"/><path d="M24 56h40M24 66h30" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
const ZONE_COL = { amazon: '#2f7a4a', grove: '#8a6a2a', reef: '#1f7a9a' };
const jar = (k) => `<path d="M30 28h40v8q8 6 8 16v30q0 8 -8 8h-40q-8 0 -8 -8v-30q0 -10 8 -16z" fill="#dff0f4" stroke="#8ab0c0" stroke-width="2"/><path d="M28 22h44v8h-44z" fill="#8a6a3a"/><path d="M24 62q26 -8 52 0v20q0 6 -6 6h-40q-6 0 -6 -6z" fill="${['#5ab8a8', '#e0a43a', '#8a5ab8', '#d8606a'][k % 4]}" opacity=".7"/>`;
// the six shelf things and their paintings (art/lab-items)
const START = ['cone', 'acorn', 'jayfeather', 'carob', 'quill', 'pineseed'];
const START_PIC = { cone: 'pine-cone', acorn: 'acorn', jayfeather: 'jay-feather', carob: 'carob-pod', quill: 'porcupine-quill', pineseed: 'pine-seed' };
// ═════════════════════════════════════════ 1. האוסף שלנו
// the clues that were solved (the seven old ids of 1.3.0 count as their cases)
const OLD_CLUE = { tracks: 'g-gazelle', owlfeather: 'g-owl', jayfeather: 'g-jay', quill: 'g-porcupine', shells: 'r-octopus', husks: 'g-ants', bites: 'r-parrotfish' };
export function cluesSolved() {
  const s = (stOf('clues').solved) || {}; const out = {};
  for (const [k, v] of Object.entries(s)) out[OLD_CLUE[k] || k] = Math.max(out[OLD_CLUE[k] || k] || 0, v || 1);
  return out;
}
// a patent: the problem, its number, the creature the idea came from, and the trait
function patentOf(p, kids) {
  const O = (v) => (v && typeof v === 'object' && 'f' in v ? (kids ? v.k : v.f) : v);
  const idx = PROBLEMS.indexOf(p);
  const traits = problemNeeds(p).map((t) => (kids ? TRAIT_K[t] || TRAIT[t] : TRAIT[t])).filter(Boolean);
  const nm = speciesName(p.real);
  return { id: p.id, real: p.real, no: 101 + Math.max(0, idx), title: kids ? ((PROBLEMS_K[p.id] || {}).title || p.title) : p.title,
    idea: traits.join(kids ? ' וְ' : ' ו'), who: nm ? O(nm) : '' };
}
export function patentHTML(pt, kids, { big = false } = {}) {
  const O = (v, x) => { let s = v && typeof v === 'object' && 'f' in v ? (kids ? v.k : v.f) : v; s = Array.isArray(s) ? s.join(' ') : String(s); return x ? s.replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m)) : s; };
  const fr = frameArt();
  return `<div class="pt-cert ${big ? 'big' : ''} ${fr ? 'framed' : ''}" ${fr ? `style="background-image:url('${fr}')"` : ''}>
    <div class="pt-in"><img class="pt-logo" src="${BABA_DA_LOGO}" alt="בבא דע"><small class="pt-no">${esc(O(CAB_T.patentNo, { n: pt.no }))}</small>
      <div class="pt-pic">${picHTML('card:' + pt.real, pt.who)}</div>
      <b class="pt-name">${esc(pt.title)}</b>
      ${big ? `<span class="pt-line"><em>${esc(O(CAB_T.idea))}:</em> ${esc(pt.idea)}</span><span class="pt-line"><em>${esc(O(CAB_T.learnt))}</em> ${esc(pt.who)}</span>` : `<span class="pt-line">${esc(pt.who)}</span>`}
      <i class="pt-seal" aria-hidden="true">${icon('leaf')}</i><i class="pt-rib" aria-hidden="true"></i></div></div>`;
}
// every shelf with its things, from the stores of the whole game (read only)
export function collection(kids, thumbs = {}) {
  const O = (v, x) => { const s = v && typeof v === 'object' && 'f' in v ? (kids ? v.k : v.f) : v; const t = Array.isArray(s) ? s.join(' ') : String(s ?? ''); return x ? t.replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m)) : t; };
  const P = labProgress();
  const shelves = [];
  shelves.push({ id: 'start', items: START.map((id) => ({ key: 'start:' + id, name: O(COLL_T.items[id].name), from: O(COLL_T.items[id].from), fact: O(COLL_T.items[id].fact), img: picSrc(START_PIC[id]) || svgUrl(D[id]), svg: !picSrc(START_PIC[id]) })), ghosts: 0 });
  const seen = SAMPLES.filter((s) => P.seen[s.id]);
  shelves.push({ id: 'scope', items: seen.map((s) => { const K = kids ? (SAMPLES_K[s.id] || s) : s; return { key: 'scope:' + s.id, name: K.name, fact: K.found, img: thumbs[s.species] || picSrc('card:' + s.species) || svgUrl(D.acorn), round: true }; }), ghosts: SAMPLES.length - seen.length });
  // the mysteries: a painted find for each one solved (a soft tile with its name until the painting exists); the others
  // wait as soft shadows of their own shapes
  const R = researchProgress().cases || {};
  const solved = CASES.filter((c) => R[c.id]);
  const T2 = (v) => { const s = v && typeof v === 'object' && 'f' in v ? (kids ? v.k : v.f) : v; return Array.isArray(s) ? s.join(' ') : String(s ?? ''); };
  shelves.push({ id: 'cases', items: solved.map((c) => {
    const st = (R[c.id].stars || []).filter(Boolean).length, F = FINDS_T[c.id];
    const title = kids ? c.title : (c.plainTitle || c.title);
    if (!F) return { key: 'case:' + c.id, name: title, fact: O(st === 1 ? COLL_T.caseText1 : st ? COLL_T.caseText : COLL_T.caseText0, { stars: st }), img: svgUrl(folder(ZONE_COL[c.zone] || '#5a4a8a')), svg: true };
    const src = picSrc('find-' + c.id);
    return { key: 'case:' + c.id, name: O(F.name), sub: title, from: O(F.from), fact: O(st === 1 ? COLL_T.caseText1 : st ? COLL_T.caseText : COLL_T.caseText0, { stars: st }), learn: T2(F.learn), pic: 'find-' + c.id, img: src || '', zone: c.zone };
  }), ghosts: CASES.length - solved.length, gshapes: CASES.filter((c) => !R[c.id]).map((c) => FIND_SHAPE[c.id] || 'pod') });
  // the expedition's jars: by sample when the expedition keeps them (rendered jars art/lab-items/jar-<id>), else by count
  const byId = expeditionFound();
  let jars;
  if (byId) {
    // a jar's painting when it exists (art/lab-items/jar-<id>.webp), else the soft tile with its name
    jars = byId.map((id) => { const J = JARS_T[id]; return { key: 'jar:' + id, name: O(J.name), fact: O(J.fact), pic: 'jar-' + id, img: picSrc('jar-' + id) }; });
    shelves.push({ id: 'jars', items: jars, ghosts: Object.keys(JARS_T).length - jars.length });
  } else {
    let n = 0; try { n = tally('deep:samples'); } catch (e) { /* */ }
    jars = [...Array(Math.min(n, 10))].map((_, k) => ({ key: 'jar:' + k, name: O(COLL_T.jar, { n }), fact: O(COLL_T.jarText, { n }), img: svgUrl(jar(k)), svg: true }));
    let rare = false; try { rare = hasBadge('b_deeprare'); } catch (e) { /* */ }
    if (rare) jars.push({ key: 'jar:rare', name: O(COLL_T.rare), fact: O(COLL_T.rareText), img: svgUrl(jar(2) + '<circle cx="50" cy="66" r="9" fill="#ffd978" stroke="#fff" stroke-width="2"/>'), svg: true });
    shelves.push({ id: 'jars', items: jars, ghosts: jars.length ? 0 : 3 });
  }
  // patents: certificates (the creature's painting, the invention, its number)
  const pats = Object.keys(P.solved || {}).map((id) => PROBLEMS.find((p) => p.id === id)).filter(Boolean).sort((a, b) => PROBLEMS.indexOf(a) - PROBLEMS.indexOf(b));
  const patItems = pats.map((p) => { const pt = patentOf(p, kids); return { key: 'pat:' + p.id, name: pt.title, fact: '', patent: pt }; });
  if (P.inventions && P.inventions.sharkskin && !pats.some((p) => p.id === 'swim')) {
    const pt = patentOf(PROBLEMS.find((p) => p.id === 'swim'), kids); pt.title = O(COLL_T.sharkskin); pt.no = 100;
    patItems.unshift({ key: 'pat:sharkskin', name: pt.title, fact: '', patent: pt });
  }
  shelves.push({ id: 'patents', items: patItems, ghosts: Math.max(0, PROBLEMS.length - patItems.length) });
  // robots built in the workshop (the hub keeps the last eight)
  const robots = robotsBuilt().slice(0, 12).map((r, i) => {
    const M = MISSIONS.find((m) => m.id === r.mission); const title = M ? (kids ? (MISSIONS_K[M.id] || M).title : M.title) : '';
    return { key: 'robot:' + i, name: r.name, from: O(COLL_T.robotFrom), fact: title ? O(COLL_T.robotText, { mission: title, wins: r.wins || 0, of: r.of || 0 }) : '', img: svgUrl(robotSvg(r.name + r.mission)), svg: true };
  });
  shelves.push({ id: 'robots', items: robots, ghosts: robots.length ? 0 : 2 });
  // photos from the islands (wave 3: the photo mode keeps them per player in web-of-life-photos)
  const zoneName = (z) => (ZONES_T[z] ? O(ZONES_T[z]) : '');
  const nameOf = (sp, fb) => { const n = sp && speciesName(sp); return n ? O(n) : (fb || ''); };
  const ph = readStore('web-of-life-photos');
  const photos = (Array.isArray(ph) ? ph : []).filter((p) => p && p.img).slice().sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 12)
    .map((p, i) => ({ key: 'photo:' + (p.id || i), name: nameOf(p.sp, p.name), fact: zoneName(p.zone) ? O(COLL_T.photoText, { zone: zoneName(p.zone) }) : '', img: p.img }));
  shelves.push({ id: 'photos', items: photos, ghosts: photos.length ? 0 : 2 });
  // rare visitors (wave 3: web-of-life-visitors, a list or a map by id)
  const vs = readStore('web-of-life-visitors');
  const vlist = Array.isArray(vs) ? vs : vs && typeof vs === 'object' ? Object.entries(vs).map(([id, v]) => ({ id, ...(v && typeof v === 'object' ? v : {}) })) : [];
  const visitors = vlist.filter(Boolean).slice(0, 12).map((v, i) => { const sp = v.sp || v.id; const src = v.img || picSrc('card:' + sp, thumbs);
    return { key: 'visit:' + (v.id || i), name: nameOf(sp, v.name), fact: zoneName(v.zone) ? O(COLL_T.visitText, { zone: zoneName(v.zone) }) : '', pic: 'card:' + sp, img: src || '', round: !!src }; });
  shelves.push({ id: 'visitors', items: visitors, ghosts: visitors.length ? 0 : 2 });
  // clues solved in "מי השאיר את זה?" (their first painting)
  const cs = cluesSolved();
  const pool = CLUE_CASES.filter((c) => !kids || c.kids || cs[c.id]);
  const clueItems = pool.filter((c) => cs[c.id]).map((c) => ({ key: 'clue:' + c.id, name: O(c.title), fact: O(c.yes), pic: c.pics[0], img: picSrc(c.pics[0]) }));
  shelves.push({ id: 'clues', items: clueItems, ghosts: pool.length - clueItems.length });
  const count = shelves.reduce((a, s) => a + s.items.length, 0);
  return { shelves, count };
}
export function collectionCount() { try { return collection(false).count; } catch (e) { return START.length; } }
export function shelfPeek(thumbs) {   // a few things for the cabinet's menu
  const { shelves } = collection(false, thumbs);
  const all = shelves.flatMap((s) => s.items).filter((it) => it.img);
  return `<div class="ls-shelfpeek">${all.slice(0, 9).map((it) => `<img src="${it.img}" alt="">`).join('')}</div>`;
}

export function openCollection(root, ctx) {
  addCss('cb-css', CB_CSS);
  const S = stationShell(root, { cls: 'coll', ic: 'satchel', title: COLL_T.title, small: MENU_T.cabinet.title, sub: '', ...ctx });
  const { T, O, kids } = S;
  const thumbs = ctx.thumbs || {};
  let C = collection(kids, thumbs), zoomed = null;
  S.el.querySelector('.ls-sub').textContent = O(COLL_T.sub, { n: C.count });
  const itemPic = (it) => (it.img ? `<img src="${it.img}" alt="">` : picHTML(it.pic, it.name));
  function render() {
    S.body.innerHTML = `<div class="cb-shelves">${C.shelves.map((s) => `<section class="cb-shelf ${s.items.length ? '' : 'empty'} sh-${s.id}"><h3>${esc(O(COLL_T.shelves[s.id].name))} <small>${s.ghosts ? esc(O(COMMON_T.of, { n: s.items.length, all: s.items.length + s.ghosts })) : s.items.length}</small></h3>
        <div class="cb-row ${s.id === 'patents' ? 'pt-row' : ''}">${s.items.map((it) => it.patent
          ? `<button class="cb-pt" data-k="${esc(it.key)}" aria-label="${esc(it.name)}">${patentHTML(it.patent, kids)}</button>`
          : `<button class="cb-it ${it.round ? 'round' : ''} ${it.svg ? 'svg' : ''}" data-k="${esc(it.key)}">${itemPic(it)}<span>${esc(it.name)}</span></button>`).join('')}
        ${s.ghosts ? [...Array(Math.min(s.ghosts, s.items.length ? 2 : 3))].map((_, i) => `<button class="cb-gbtn ${s.id === 'patents' ? 'pt' : ''}" data-g="${s.id}" aria-label="${esc(O(COLL_T.notYet))}">${shadowHTML((s.gshapes && s.gshapes[i]) || SHELF_SHAPE[s.id] || 'round', s.id === 'patents' ? 'pt' : '')}</button>`).join('') + (COLL_T.shelves[s.id].how ? `<em class="cb-how">${esc(O(COLL_T.shelves[s.id].how))}</em>` : '') : ''}</div></section>`).join('')}</div>
      ${zoomed ? zoomHTML(zoomed) : ''}`;
    if (zoomed && zoomed.img) wireZoom();
  }
  function zoomHTML(it) {
    if (it.patent) return `<div class="cb-zoom" role="dialog" aria-label="${esc(it.name)}"><div class="cb-zpat">${patentHTML(it.patent, kids, { big: true })}
      <button class="ls-soft" data-act="unzoom">${icon('arrowR')}${esc(O(COMMON_T.close))}</button></div></div>`;
    const pic = it.img ? `<div class="cb-zpic" style="background-image:url('${it.img}')"><i class="cb-lens" hidden style="background-image:url('${it.img}')"></i></div>` : `<div class="cb-zpic ph">${picHTML(it.pic, it.name)}</div>`;
    return `<div class="cb-zoom" role="dialog" aria-label="${esc(it.name)}"><div class="cb-zcard">${pic}
      <div class="cb-ztx">${it.sub ? `<small class="cb-zsub">${esc(it.sub)}</small>` : ''}<h3>${esc(it.name)}</h3>${it.from ? `<small>${esc(O(COLL_T.from))} ${esc(it.from)}</small>` : ''}${it.fact ? `<p>${esc(it.fact)}</p>` : ''}
        ${it.learn ? `<div class="cb-learn"><b>${esc(O(COLL_T.learnt))}</b> ${esc(it.learn)}</div>` : ''}
        ${it.img ? `<small class="cb-lhelp">${icon('search')}${esc(O(COLL_T.lensHelp))}</small>` : ''}
        <button class="ls-soft" data-act="unzoom">${icon('arrowR')}${esc(O(COMMON_T.close))}</button></div></div></div>`;
  }
  function wireZoom() {
    const pic = S.el.querySelector('.cb-zpic'), lens = S.el.querySelector('.cb-lens'); if (!pic || !lens) return;
    const move = (e) => {
      const b = pic.getBoundingClientRect(); const x = e.clientX - b.left, y = e.clientY - b.top;
      if (x < 0 || y < 0 || x > b.width || y > b.height) { lens.hidden = true; return; }
      lens.hidden = false; const Lw = lens.offsetWidth || 120, Z = 2.6;
      lens.style.left = (x - Lw / 2) + 'px'; lens.style.top = (y - Lw / 2) + 'px';
      lens.style.backgroundSize = `${b.width * Z}px ${b.height * Z}px`;
      lens.style.backgroundPosition = `${-(x * Z - Lw / 2)}px ${-(y * Z - Lw / 2)}px`;
    };
    pic.addEventListener('pointermove', move); pic.addEventListener('pointerdown', move);
    pic.addEventListener('pointerleave', () => { lens.hidden = true; });
  }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) { if (zoomed && e.target.classList.contains('cb-zoom')) { zoomed = null; render(); } return; }
    if (b.dataset.act === 'unzoom') { zoomed = null; S.sfx('click'); render(); return; }
    if (b.dataset.g) { S.sfx('click'); const how = COLL_T.shelves[b.dataset.g] && COLL_T.shelves[b.dataset.g].how; S.talk(how ? T(how) : T(COLL_T.notYet), 'curious'); return; }
    if (b.dataset.k) {
      zoomed = C.shelves.flatMap((s) => s.items).find((it) => it.key === b.dataset.k); S.sfx('select'); render();
      S.talk(T(COLL_T.look), 'curious');
      stUpdate('collection', (r) => { r.looked = r.looked || {}; r.looked[b.dataset.k] = 1; });
    }
  });
  S.el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && zoomed) { zoomed = null; render(); } });
  render();
  const prev = stOf('collection').max || 0;
  stUpdate('collection', (r) => { r.max = Math.max(r.max || 0, C.count); });
  if (C.count >= 20) { try { grantBadge('lab:collect'); } catch (e) { /* */ } }
  S.talk(C.count >= 20 ? T(COLL_T.many, { n: C.count }) : prev ? T(COLL_T.firstOpen, { n: C.count }) : T(COLL_T.intro), 'happy');
  return { close: S.close, debug: { get count() { return C.count; }, zoom: (k) => { zoomed = C.shelves.flatMap((s) => s.items).find((it) => it.key === k) || null; render(); } } };
}

// ═════════════════════════════════════════ 2. ממיינים כמו חוקרים
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const BOX = ['A', 'B', 'C'];
// a partition as a key that ignores the boxes' order
const partKey = (groups) => groups.filter((g) => g.length).map((g) => g.map((it) => it.id).sort().join(',')).sort().join('|');
const groupBy = (items, r) => { const g = {}; for (const it of items) (g[attrOf(it, r)] = g[attrOf(it, r)] || []).push(it); return g; };
// the rules of a round that fit every item on the table
export const applicable = (set, items) => rulesOfSet(set).filter((r) => items.every((it) => attrOf(it, r) != null));
// which rules give exactly these boxes
export function rulesFitting(set, items, where) {
  const key = partKey(BOX.map((b) => items.filter((it) => where[it.id] === b)));
  return applicable(set, items).filter((r) => partKey(Object.values(groupBy(items, r))) === key);
}
// a round for one rule: 8 to 10 items whose groups (2 or 3 of them) have at least two each
export function drawFor(set, rule, n) {
  const cand = POOL.filter(SETS[set]).filter((it) => attrOf(it, rule) != null);
  const g = groupBy(cand, rule);
  const keys = shuffle(Object.keys(g).filter((k) => g[k].length >= 2)).slice(0, 3);
  if (keys.length < 2) return null;
  const out = [];
  keys.forEach((k) => { shuffle(g[k]); out.push(...g[k].slice(0, 2)); });
  out.push(...shuffle(keys.flatMap((k) => g[k].slice(2))).slice(0, Math.max(0, n - out.length)));
  return { items: shuffle(out), keys };
}
const pickSet = () => { const r = Math.random(); return r < 0.38 ? 'living' : r < 0.74 ? 'animal' : 'thing'; };

export function openSort(root, ctx) {
  addCss('cb-css', CB_CSS);
  const S = stationShell(root, { cls: 'sort', ic: 'cards', title: SORT_T.title, small: MENU_T.cabinet.title, sub: SORT_T.sub, ...ctx });
  const { T, O, kids } = S;
  let mode = 'you', set = 'animal', items = [], where = {}, nBox = 2, picked = null, phase = 'sort', roboRule = null, lastRule = null, labels = null;
  const name = (it) => O(it.name);
  const P = () => stOf('sort');
  const N = () => (kids ? 8 : 8 + rnd(3));
  function youRound(s) {
    set = s || pickSet(); items = shuffle(POOL.filter(SETS[set])).slice(0, N());
    where = {}; nBox = 2; picked = null; phase = 'sort'; labels = null;
  }
  function roboRound() {
    for (let t = 0; t < 30; t++) {
      const s = pickSet(); const rules = shuffle(rulesOfSet(s).filter((r) => r !== lastRule));
      for (const r of rules) {
        const d = drawFor(s, r, N()); if (!d) continue;
        set = s; roboRule = r; lastRule = r; items = d.items; nBox = d.keys.length; labels = null;
        where = {}; for (const it of items) where[it.id] = BOX[d.keys.indexOf(attrOf(it, r))];
        phase = 'guessRobo'; picked = null; return;
      }
    }
  }
  // the boxes' names by a rule (after it was guessed): the name of the group most of each box holds
  function labelBy(r) {
    labels = {};
    for (const b of BOX) { const inB = items.filter((it) => where[it.id] === b); if (inB.length) labels[b] = O(RULES[r].g[attrOf(inB[0], r)]); }
  }
  function render() {
    const R = P();
    const thing = (it, small) => `<button class="cs-it ${small ? 'sm' : ''} ${picked === it.id ? 'on' : ''}" data-id="${it.id}" ${mode === 'robo' ? 'tabindex="-1"' : ''} aria-pressed="${picked === it.id}" title="${esc(name(it))}">
      <span class="cs-pic">${picHTML(it.pic, name(it))}</span><span class="cs-nm">${esc(name(it))}</span></button>`;
    const boxName = (b) => (labels && labels[b]) || O(b === 'A' ? SORT_T.boxA : b === 'B' ? SORT_T.boxB : SORT2_T.boxC);
    const table = items.filter((it) => !where[it.id]);
    const box = (b) => `<div class="cs-box b${b} ${labels && labels[b] ? 'named' : ''}" data-box="${b}" role="button" tabindex="0" aria-label="${esc(boxName(b))}"><b>${esc(boxName(b))}</b><div>${items.filter((it) => where[it.id] === b).map((it) => thing(it, table.length > 0)).join('')}</div></div>`;
    const ruleList = (attr) => {
      let list = applicable(set, items); if (attr === 'rr' && roboRule && !list.includes(roboRule)) list.push(roboRule);
      return `<div class="cs-rules">${list.map((r) => `<button class="ls-soft" data-${attr}="${r}">${esc(O(RULES[r].name))}</button>`).join('')}${attr === 'mine' ? `<button class="ls-soft" data-mine="secret">${esc(O(SORT_T.secret))}</button>` : ''}</div>`;
    };
    const nRules = Object.keys(R.rules || {}).length;
    S.body.innerHTML = `<div class="cs-wrap">
      <nav class="cs-bar"><button data-mode="you" class="${mode === 'you' ? 'on' : ''}">${esc(O(SORT_T.modeYou))}</button><button data-mode="robo" class="${mode === 'robo' ? 'on' : ''}">${esc(O(SORT_T.modeRobo))}</button>
        <span class="cs-set">${icon('cards')}${esc(O(SORT2_T.set[set]))} · ${esc(O(SORT2_T.drawn, { n: items.length, all: POOL.filter(SETS[set]).length }))}</span>
        <small>${esc(O(SORT_T.score, { a: R.robotGuessed || 0, b: R.childGuessed || 0 }))}${nRules ? ' · ' + esc(O(SORT2_T.rulesSeen, { n: nRules })) : ''}</small>
        <button class="ls-soft cs-new" data-act="new">${icon('undo')}${esc(O(SORT2_T.newRound))}</button></nav>
      <div class="cs-main ${table.length ? '' : 'full'}">
        <section class="cs-table" data-box="T">${table.length ? `<small>${esc(O(SORT_T.table))} · ${esc(O(SORT_T.tapHelp))}</small>` : ''}<div>${table.map((it) => thing(it)).join('')}</div></section>
        <section class="cs-boxes n${nBox}">${BOX.slice(0, nBox).map(box).join('')}</section>
      </div>
      <div class="cs-acts">${mode === 'you' && phase === 'sort' ? `<button class="ls-go" data-act="guess">${icon('bulb')}${esc(O(SORT_T.guess))}</button><button class="ls-soft" data-act="boxes">${esc(O(nBox === 2 ? SORT2_T.third : SORT2_T.lessBox))}</button><button class="ls-soft" data-act="clear">${icon('undo')}${esc(O(SORT_T.clear))}</button>` : ''}
        ${mode === 'you' && phase === 'ask' ? `<small>${esc(O(SORT_T.whatRule))}</small>${ruleList('mine')}` : ''}
        ${mode === 'robo' && phase === 'guessRobo' ? `<small>${esc(O(SORT_T.whatRule))}</small>${ruleList('rr')}` : ''}
        ${mode === 'robo' && phase === 'roboDone' ? `<button class="ls-go" data-act="robonew">${icon('cards')}${esc(O(SORT_T.roboNew))}</button>` : ''}
        ${mode === 'you' && phase === 'done' ? `<button class="ls-go" data-act="new">${icon('cards')}${esc(O(SORT2_T.newRound))}</button><button class="ls-soft" data-act="clear">${icon('undo')}${esc(O(SORT_T.clear))}</button>` : ''}</div></div>`;
  }
  function note(r) {
    const R = stUpdate('sort', (x) => { x.rules = x.rules || {}; x.rules[r] = 1; });
    const n = Object.keys(R.rules).length;
    if (n >= 6) { const first = !hasBadge('b_sortrules'); try { grantBadge('lab:sortrules'); } catch (e) { /* */ } if (first) S.later(() => S.talk(T(SORT2_T.manyRules), 'wow'), 4200); }
  }
  function badgeCheck() { const R = P(); if ((R.robotGuessed || 0) >= 1 && (R.childGuessed || 0) >= 2) { try { grantBadge('lab:sort'); } catch (e) { /* */ } } }
  function guess() {
    const placed = items.filter((it) => where[it.id]);
    if (placed.length < items.length) { S.talk(T(SORT_T.notAll), 'curious'); S.sfx('invalid'); return; }
    if (new Set(placed.map((it) => where[it.id])).size < 2) { S.talk(T(SORT_T.oneBox), 'oops'); S.sfx('invalid'); return; }
    const fit = rulesFitting(set, items, where);
    S.sfx('click');
    if (fit.length) {
      phase = 'done'; labelBy(fit[0]); note(fit[0]);
      stUpdate('sort', (r) => { r.robotGuessed = (r.robotGuessed || 0) + 1; if (fit.length > 1) r.two = 1; }); render();
      if (fit.length === 1) { S.sfx('quizRight'); S.talk(T(SORT_T.gotIt, { rule: O(RULES[fit[0]].name) }), 'wow'); }
      else { S.sfx('discover'); S.talk(T(SORT_T.two, { a: O(RULES[fit[0]].name), b: O(RULES[fit[1]].name) }), 'curious'); }
      badgeCheck();
    } else { phase = 'ask'; render(); S.talk(T(SORT_T.giveUp), 'oops'); }
  }
  // the child names the rule: which thing breaks it (or which group would need a box of its own)
  function mine(r) {
    if (r === 'secret') { phase = 'done'; stUpdate('sort', (x) => { x.secret = (x.secret || 0) + 1; }); render(); S.talk(T(SORT_T.secretSay), 'happy'); return; }
    const g = groupBy(items, r); const major = {};
    for (const [v, list] of Object.entries(g)) { const c = {}; list.forEach((it) => { c[where[it.id]] = (c[where[it.id]] || 0) + 1; }); major[v] = Object.keys(c).sort((a, b) => c[b] - c[a])[0]; }
    const bad = items.find((it) => where[it.id] !== major[attrOf(it, r)]);
    if (bad) { picked = bad.id; render(); S.talk(T(SORT_T.breaks, { item: name(bad), box: (labels && labels[where[bad.id]]) || O(where[bad.id] === 'A' ? SORT_T.boxA : where[bad.id] === 'B' ? SORT_T.boxB : SORT2_T.boxC) }), 'curious'); return; }
    // no single thing is wrong, but two groups share a box
    const vals = Object.keys(g).sort((a, b) => g[a].length - g[b].length);
    const shared = vals.find((v) => vals.some((u) => u !== v && major[u] === major[v]));
    if (shared) { picked = g[shared][0].id; render(); S.talk(T(SORT2_T.merged, { item: name(g[shared][0]) }), 'curious'); return; }
    phase = 'done'; labelBy(r); note(r); render(); S.talk(T(SORT_T.fits), 'happy');
  }
  function roboGuess(r) {
    const fit = rulesFitting(set, items, where);
    if (fit.includes(r)) {
      phase = 'roboDone'; labelBy(r); note(r); stUpdate('sort', (x) => { x.childGuessed = (x.childGuessed || 0) + 1; }); render(); S.sfx('quizRight');
      S.talk(T(r === roboRule ? SORT_T.roboRight : SORT_T.roboAlso), 'wow'); badgeCheck();
    } else {
      // a thing that this rule would put elsewhere
      const ok = items.every((it) => attrOf(it, r) != null);
      let bad = items[0];
      if (ok) { const g = groupBy(items, r); bad = items.find((it) => g[attrOf(it, r)].some((o) => where[o.id] !== where[it.id])) || items[0]; }
      S.sfx('quizWrong'); S.talk(T(SORT_T.roboWrong, { item: name(bad) }), 'curious');
      const el = S.el.querySelector(`.cs-it[data-id="${bad.id}"]`); if (el) { el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint'); }
    }
  }
  function moveTo(b) {
    if (!picked || mode !== 'you' || phase === 'done') return;
    const it = items.find((x) => x.id === picked);
    if (b === 'T') delete where[picked]; else where[picked] = b;
    phase = 'sort'; labels = null; S.sfx('place'); picked = null; render();
    // a small surprise, once for each of these things
    if (it && b !== 'T' && SORT2_T.facts[it.id] && !(P().facts || {})[it.id]) { stUpdate('sort', (r) => { r.facts = r.facts || {}; r.facts[it.id] = 1; }); S.talk(T(SORT2_T.facts[it.id]), 'wow'); }
  }
  function startYou(s) { mode = 'you'; youRound(s); render(); S.talk(T(SORT2_T.youIntro, { set: O(SORT2_T.set[set]), n: items.length }), 'happy'); }
  function startRobo() { mode = 'robo'; roboRound(); render(); S.talk(T(SORT2_T.roboIntro, { n: items.length, boxes: nBox === 3 ? (kids ? 'שָׁלֹשׁ' : 'שלוש') : (kids ? 'שְׁתֵּי' : 'שתי') }), 'curious'); }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && b.dataset.mode) { S.sfx('click'); if (b.dataset.mode === 'robo') startRobo(); else startYou(); return; }
    if (b && b.dataset.act === 'new') { S.sfx('click'); if (mode === 'robo') startRobo(); else startYou(); return; }
    if (b && b.dataset.id && mode === 'you' && phase !== 'done') {
      if (picked === b.dataset.id) { picked = null; render(); return; }
      const inBox = b.closest('[data-box]');
      if (picked && inBox && where[b.dataset.id] !== where[picked]) { moveTo(inBox.dataset.box); return; }
      picked = b.dataset.id; S.sfx('click'); render(); return;
    }
    if (b && b.dataset.act === 'guess') { guess(); return; }
    if (b && b.dataset.act === 'boxes') { nBox = nBox === 2 ? 3 : 2; if (nBox === 2) for (const id of Object.keys(where)) if (where[id] === 'C') delete where[id]; S.sfx('click'); render(); return; }
    if (b && b.dataset.act === 'clear') { where = {}; phase = 'sort'; picked = null; labels = null; S.sfx('click'); render(); return; }
    if (b && b.dataset.act === 'robonew') { S.sfx('click'); startRobo(); return; }
    if (b && b.dataset.mine) { mine(b.dataset.mine); return; }
    if (b && b.dataset.rr) { roboGuess(b.dataset.rr); return; }
    const box = e.target.closest('[data-box]'); if (box) moveTo(box.dataset.box);
  });
  S.el.addEventListener('keydown', (e) => { const box = e.target.closest && e.target.closest('.cs-box'); if (box && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); moveTo(box.dataset.box); } });
  startYou('animal');
  return { close: S.close, debug: { put: (id, b) => { where[id] = b; render(); }, guess, mine, roboGuess, robo: () => { startRobo(); return roboRule; }, you: (s) => startYou(s),
    get items() { return items.map((it) => it.id); }, get set() { return set; }, get where() { return { ...where }; }, sortBy: (r) => { const g = Object.keys(groupBy(items, r)); nBox = Math.min(3, Math.max(2, g.length)); for (const it of items) where[it.id] = BOX[Math.min(2, g.indexOf(attrOf(it, r)))]; render(); }, rulesFitting: () => rulesFitting(set, items, where) } };
}

// ═════════════════════════════════════════ 3. מי השאיר את זה?
export function openClues(root, ctx) {
  addCss('cb-css', CB_CSS);
  const S = stationShell(root, { cls: 'clues', ic: 'search', title: CLUES_T.title, small: MENU_T.cabinet.title, sub: CLUES_T.sub, ...ctx });
  const { T, O, kids } = S;
  const LIST = CLUE_CASES.filter((c) => !kids || c.kids);
  const ZONES = ['grove', 'amazon', 'reef'];
  let zone = 'grove', cur = null, looks = 0, wrong = new Set(), out = new Set(), done = false;
  const sus = (id) => O(SUS[id]);
  function render() {
    const solved = cluesSolved(); const c = cur;
    const inZone = LIST.filter((x) => x.zone === zone);
    const nSolved = LIST.filter((x) => solved[x.id]).length;
    const notes = [...c.d.slice(0, looks).map((d) => `<li class="d">${icon('search')}<span>${esc(O(d))}</span></li>`),
      ...[...out, ...wrong].map((s) => `<li class="x"><b>${esc(sus(s))}</b><span>${esc(O(c.no[s]))}</span></li>`)];
    S.body.innerHTML = `<div class="cl2">
      <nav class="cl2-zones">${ZONES.map((z) => `<button data-z="${z}" class="${z === zone ? 'on' : ''} z-${z}">${esc(O(ZONES_T[z]))} <small>${LIST.filter((x) => x.zone === z && solved[x.id]).length}/${LIST.filter((x) => x.zone === z).length}</small></button>`).join('')}
        <small class="cl2-count">${esc(O(CAB_T.solvedOf, { n: nSolved, all: LIST.length }))}</small></nav>
      <nav class="cl2-cases">${inZone.map((x) => `<button data-c="${x.id}" class="${x === c ? 'on' : ''} ${solved[x.id] ? 'done' : ''}" title="${esc(O(x.title))}">${picHTML(x.pics[0], O(x.title))}${solved[x.id] ? `<i class="ok">${icon('check')}</i>` : ''}</button>`).join('')}</nav>
      <div class="cl2-main">
        <section class="cl2-scene"><h3>${esc(O(c.title))}</h3><p>${esc(O(c.what))}</p>
          <div class="cl2-pics n${c.pics.length}">${c.pics.map((p, i) => `<figure class="${i ? 'side' : 'big'}">${picHTML(p, O(c.title))}</figure>`).join('')}</div>
          <div class="cl2-look"><button class="ls-soft" data-act="look" ${looks >= c.d.length || done ? 'disabled' : ''}>${icon('search')}${esc(O(CAB_T.look2, { n: c.d.length - looks }))}</button></div></section>
        <section class="cl2-side">
          <div class="cl2-sus"><small>${esc(O(CLUES_T.who))}</small><div class="cl2-grid">${c.sus.map((s, i) => { const isOut = out.has(s) || wrong.has(s), yes = done && i === 0;
            return `<div class="cl2-s ${isOut ? 'no' : ''} ${yes ? 'yes' : ''}"><button class="cl2-acc" data-s="${s}" ${isOut || done ? 'disabled' : ''}>${picHTML('card:' + s, sus(s), { thumbs: ctx.thumbs })}<span>${esc(sus(s))}</span></button>
              ${!isOut && !done ? `<button class="cl2-out" data-out="${s}">${esc(O(CAB_T.out))}</button>` : ''}</div>`; }).join('')}</div></div>
          ${done ? `<div class="cl2-yes">${icon('check')}<p>${esc(O(c.yes))}</p></div>${LIST.some((x) => !solved[x.id]) ? `<button class="ls-go" data-act="next">${esc(O(CLUES_T.next))}</button>` : ''}`
            : `<div class="cl2-notes"><small>${esc(O(CAB_T.notes))}</small>${notes.length ? `<ul>${notes.join('')}</ul>` : `<em>${esc(O(CAB_T.noNotes))}</em>`}</div>`}
        </section></div></div>`;
  }
  function open(id) {
    cur = LIST.find((x) => x.id === id) || LIST[0]; zone = cur.zone; looks = 0; wrong = new Set(); out = new Set(); done = !!cluesSolved()[cur.id];
    render(); S.talk(T(done ? cur.yes : cur.what), done ? 'happy' : 'curious');
  }
  function firstOpen(z) { const s = cluesSolved(); const inZ = LIST.filter((x) => !z || x.zone === z); return (inZ.find((x) => !s[x.id]) || inZ[0]).id; }
  S.el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = cur;
    if (b.dataset.z) { S.sfx('click'); open(firstOpen(b.dataset.z)); return; }
    if (b.dataset.c) { S.sfx('click'); open(b.dataset.c); return; }
    if (b.dataset.act === 'look') { if (looks >= c.d.length) { S.talk(T(CLUES_T.noMore), 'oops'); return; } S.sfx('discover'); looks++; render(); S.talk(T(c.d[looks - 1]), 'curious'); return; }
    if (b.dataset.act === 'next') { S.sfx('click'); const s = cluesSolved(); const rest = LIST.filter((x) => !s[x.id]); const sameZone = rest.find((x) => x.zone === zone); open((sameZone || rest[0] || LIST[0]).id); if (!sameZone && rest.length) S.later(() => S.talk(T(CAB_T.allZone), 'happy'), 2600); return; }
    if (b.dataset.out) {
      const s = b.dataset.out;
      if (s === c.sus[0]) { S.sfx('invalid'); S.talk(T(CAB_T.outQ), 'curious'); const el = b.closest('.cl2-s'); if (el) { el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint'); } return; }
      out.add(s); S.sfx('place'); render(); S.talk(T(CAB_T.outOk, { why: O(c.no[s]) }), 'happy'); return;
    }
    if (b.dataset.s) {
      const s = b.dataset.s;
      if (s === c.sus[0]) {
        done = true; const stars = Math.max(1, 3 - wrong.size);
        const R = stUpdate('clues', (r) => { r.solved = r.solved || {}; r.solved[c.id] = Math.max(r.solved[c.id] || 0, stars); });
        render(); S.sfx('quizRight');
        const n = Object.keys(cluesSolved()).length; void R;
        const lines = [].concat(T(c.yes));
        if (n >= 8 && !hasBadge('b_clues')) { try { grantBadge('lab:clues'); } catch (err) { /* */ } S.sfx('mission'); lines.push(...[].concat(T(CAB_T.eight))); }
        if (LIST.every((x) => cluesSolved()[x.id])) { try { grantBadge('lab:clues-all'); } catch (err) { /* */ } S.sfx('mission'); lines.push(...[].concat(T(CLUES_T.all))); }
        S.talk(lines, 'wow');
      } else { wrong.add(s); S.sfx('quizWrong'); render(); S.talk(T(c.no[s]), 'oops'); }
    }
  });
  open(firstOpen(null));
  S.later(() => { if (!done && looks === 0) S.talk(T(CAB_T.clueIntro), 'happy'); }, 4200);
  return { close: S.close, debug: { open, answer: (s) => S.el.querySelector(`[data-s="${s}"]`)?.click(), get list() { return LIST.map((x) => x.id); } } };
}

const CB_CSS = PICS_CSS + `
#ui.wol .cb-shelves{display:flex;flex-direction:column;gap:8px}
#ui.wol .cb-shelf{padding:6px 10px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.2));border-bottom:7px solid #b8895a;box-shadow:0 3px 0 #8a6a3a}
#ui.wol .cb-shelf h3{margin:0 0 4px;font-family:var(--serif);font-size:1.05em}
#ui.wol .cb-shelf h3 small{font-family:inherit;font-size:.8em}
#ui.wol .cb-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#ui.wol .cb-it{display:flex;flex-direction:column;align-items:center;gap:2px;width:86px;padding:4px;border:0;border-radius:12px;background:transparent;font:inherit;font-size:.78em;font-weight:700;color:#2a1a0e;cursor:zoom-in;line-height:1.2}
#ui.wol .cb-it img,#ui.wol .cb-it .lp-ph{width:60px;height:60px;border-radius:12px;object-fit:cover;box-shadow:0 2px 6px rgba(0,0,0,.22);transition:transform .2s}
#ui.wol .cb-it .lp-ph span{font-size:.7em}
#ui.wol .cb-it.svg img{object-fit:contain;box-shadow:none;border-radius:0;filter:drop-shadow(0 3px 3px rgba(0,0,0,.25))}
#ui.wol .cb-it.round img{border-radius:50%;box-shadow:0 0 0 3px #fff}
#ui.wol .cb-it:hover img,#ui.wol .cb-it:focus-visible img{transform:scale(1.12) rotate(-3deg)}
#ui.wol .cb-gbtn{display:grid;place-items:center;padding:0;border:0;background:transparent;cursor:help;border-radius:12px}
#ui.wol .cb-gbtn:focus-visible{outline:3px solid #e0a43a}
#ui.wol .cb-ghost{display:grid;place-items:center;width:60px;height:60px;border-radius:14px;color:rgba(90,66,30,.26);background:radial-gradient(circle at 50% 60%,rgba(90,66,30,.08),transparent 70%);font-style:normal}
#ui.wol .cb-ghost svg{width:84%;height:84%;filter:blur(.6px)}
#ui.wol .cb-gbtn:hover .cb-ghost{color:rgba(90,66,30,.32)}
#ui.wol .cb-ghost.pt{width:92px;height:120px;border-radius:6px}
#ui.wol .cb-ghost.pt svg{width:70%;height:70%}
#ui.wol .cb-zsub{color:#1d6680!important}
#ui.wol .cb-learn{padding:6px 10px;border-radius:10px;background:#eaf6dc;color:#2c4a22;font-size:.95em;line-height:1.4}
#ui.wol .cb-learn b{color:#3a6a2a}
#ui.wol .cb-how{display:inline-flex;align-items:center;gap:5px;font-style:normal;font-size:.82em;font-weight:700;color:#7a6a40;max-width:280px;line-height:1.3}
#ui.wol .cb-how .ic{width:15px;height:15px;flex:none}
#ui.wol .cb-zoom{position:absolute;inset:56px 0 0 0;display:grid;place-items:center;background:rgba(30,24,14,.55);z-index:5;border-radius:18px}
#ui.wol .cb-zcard{display:flex;gap:16px;align-items:center;max-width:min(760px,94%);max-height:94%;padding:14px;border-radius:18px;background:#fbf6e4;box-shadow:0 10px 30px rgba(0,0,0,.4)}
#ui.wol .cb-zpic{position:relative;width:min(300px,40vh);aspect-ratio:1;flex:none;border-radius:14px;background:#fff center/cover no-repeat;box-shadow:inset 0 0 0 2px #e8dcc0;touch-action:none;cursor:none;overflow:hidden}
#ui.wol .cb-zpic.ph{cursor:default}#ui.wol .cb-zpic.ph .lp-ph{width:100%;height:100%}
#ui.wol .cb-lens{position:absolute;width:120px;height:120px;border-radius:50%;background-repeat:no-repeat;background-color:#fff;box-shadow:0 0 0 4px #3a2a14,0 0 0 7px #c8a46a,0 6px 16px rgba(0,0,0,.35);pointer-events:none}
#ui.wol .cb-ztx{display:flex;flex-direction:column;gap:6px;min-width:0}
#ui.wol .cb-ztx h3{margin:0;font-family:var(--serif);font-size:1.4em}
#ui.wol .cb-ztx p{margin:0;font-size:1.05em;line-height:1.5}
#ui.wol .ls.kids .cb-ztx p{line-height:1.75}
#ui.wol .cb-lhelp{display:inline-flex;align-items:center;gap:4px}
#ui.wol .cb-lhelp .ic{width:15px;height:15px}
#ui.wol .cb-ztx .ls-soft{align-self:flex-start}
/* patents: certificates */
#ui.wol .pt-row{gap:12px;align-items:flex-start}
#ui.wol .cb-pt{padding:0;border:0;background:none;cursor:zoom-in;transition:transform .2s}
#ui.wol .cb-pt:hover,#ui.wol .cb-pt:focus-visible{transform:translateY(-3px) rotate(-1deg)}
#ui.wol .pt-cert{position:relative;width:96px;aspect-ratio:3/4;padding:7px;border-radius:5px;background:radial-gradient(ellipse at 50% 40%,#fdf6df,#f1e2b8 70%,#e2c88e);box-shadow:inset 0 0 0 2px #b8893a,inset 0 0 0 4px #f6e8c4,inset 0 0 0 5px #8a6420,0 3px 8px rgba(60,40,10,.35);color:#3a2a10;text-align:center;font-family:var(--serif)}
#ui.wol .pt-cert.framed{background:#f6ecd0 center/100% 100% no-repeat;box-shadow:0 3px 8px rgba(60,40,10,.35)}
#ui.wol .pt-in{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;padding:4px 4px 0;padding-bottom:20%;border:1px solid rgba(138,100,32,.45);border-radius:3px}
#ui.wol .pt-no{font-size:.56em!important;font-weight:800;letter-spacing:.02em;color:#8a6420!important}
#ui.wol .pt-logo{position:absolute;top:3px;left:4px;width:24%;height:auto;opacity:.92;pointer-events:none}
#ui.wol .pt-cert.big .pt-logo{top:6px;left:8px;width:20%}
#ui.wol .pt-pic{width:62%;aspect-ratio:1;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #b8893a,0 0 0 4px #f6e8c4,0 0 0 5px #8a6420;flex:none}
#ui.wol .pt-pic img,#ui.wol .pt-pic .lp-ph{width:100%;height:100%;border-radius:50%}
#ui.wol .pt-name{font-size:.62em;line-height:1.15;margin-top:3px}
#ui.wol .pt-line{font-size:.52em;line-height:1.2;color:#5a4420;font-family:inherit}
#ui.wol .pt-line em{font-style:normal;font-weight:800;color:#8a6420}
#ui.wol .pt-seal{position:absolute;bottom:6%;left:6%;display:grid;place-items:center;width:24%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e8605a,#a8221c 60%,#7a1410);box-shadow:0 1px 3px rgba(0,0,0,.4),inset 0 0 0 2px rgba(255,255,255,.18);color:#f4c0b0;z-index:2}
#ui.wol .pt-seal .ic{width:55%;height:55%}
#ui.wol .pt-rib{position:absolute;bottom:-2%;left:9%;width:18%;height:15%;z-index:1}
#ui.wol .pt-rib::before,#ui.wol .pt-rib::after{content:"";position:absolute;top:0;width:44%;height:100%;background:linear-gradient(180deg,#b8302a,#8a1a14);clip-path:polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)}
#ui.wol .pt-rib::before{left:0;transform:rotate(14deg);transform-origin:top center}
#ui.wol .pt-rib::after{right:0;transform:rotate(-14deg);transform-origin:top center}
#ui.wol .cb-zpat{display:flex;align-items:flex-end;gap:12px}
#ui.wol .pt-cert.big{width:min(300px,calc((100vh - 190px) * .75))}
#ui.wol .pt-cert.big .pt-in{gap:6px;padding:10px 12px 18%}
#ui.wol .pt-cert.big .pt-no{font-size:.82em!important}
#ui.wol .pt-cert.big .pt-name{font-size:1.25em}
#ui.wol .pt-cert.big .pt-line{font-size:.92em}
#ui.wol .pt-cert.big .pt-pic{width:56%}
/* sort */
#ui.wol .cs-wrap{display:flex;flex-direction:column;gap:6px;height:100%;min-height:0}
#ui.wol .cs-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#ui.wol .cs-bar>button[data-mode]{padding:5px 14px;border-radius:999px;border:2px solid #263440;background:#fff;color:#263440;font:inherit;font-weight:800;cursor:pointer}
#ui.wol .cs-bar>button.on{background:#263440;color:#ffd978}
#ui.wol .cs-set{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;background:#efe3c0;font-weight:800;font-size:.85em;color:#5a4420}
#ui.wol .cs-set .ic{width:15px;height:15px}
#ui.wol .cs-bar small{margin-inline-start:auto}
#ui.wol .cs-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:10px}
#ui.wol .cs-table{min-height:0;overflow:auto;padding:6px 8px;border-radius:14px;background:linear-gradient(180deg,#c89a62,#b0824c);box-shadow:inset 0 2px 0 rgba(255,255,255,.25),0 3px 0 #7a5228}
#ui.wol .cs-table>small{display:block;color:#fff8e6!important;margin-bottom:4px}
#ui.wol .cs-table>div{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px}
#ui.wol .cs-boxes{display:grid;gap:8px;min-height:0}
#ui.wol .cs-boxes.n2{grid-template-columns:1fr 1fr}#ui.wol .cs-boxes.n3{grid-template-columns:1fr 1fr 1fr}
#ui.wol .cs-box{display:flex;flex-direction:column;min-height:0;padding:6px;border-radius:14px;border:3px solid #9a7444;background:linear-gradient(180deg,#f8eed6,#ecdcb4);box-shadow:inset 0 6px 10px rgba(90,60,20,.18);cursor:pointer;overflow:auto}
#ui.wol .cs-box>b{display:block;font-family:var(--serif);font-size:.95em;color:#5a3a14;margin-bottom:4px}
#ui.wol .cs-box.named>b{color:#2c5a2a}
#ui.wol .cs-box.bA{border-color:#2c7a5a}#ui.wol .cs-box.bB{border-color:#7a5ab8}#ui.wol .cs-box.bC{border-color:#c8781a}
#ui.wol .cs-box>div{display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start}
#ui.wol .cs-it{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border-radius:12px;border:2px solid transparent;background:#fffaf0;font:inherit;font-size:.74em;font-weight:800;color:#2a1a0e;cursor:pointer;line-height:1.15;box-shadow:0 2px 0 rgba(90,60,20,.25);transition:transform .15s}
#ui.wol .cs-pic{width:56px;height:56px;border-radius:10px;overflow:hidden;flex:none}
#ui.wol .cs-pic img,#ui.wol .cs-pic .lp-ph{width:100%;height:100%;border-radius:10px}
#ui.wol .cs-pic .lp-ph span{font-size:.7em}
#ui.wol .cs-nm{max-width:72px;text-align:center;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
#ui.wol .cs-it.sm{flex-direction:row;padding:2px 6px 2px 2px;font-size:.7em}
#ui.wol .cs-it.sm .cs-pic{width:34px;height:34px;border-radius:8px}
#ui.wol .cs-it.sm .cs-nm{max-width:64px}
#ui.wol .cs-it:hover{transform:translateY(-2px)}
#ui.wol .cs-it.on{border-color:#e0a43a;box-shadow:0 0 0 3px rgba(224,164,58,.45);transform:translateY(-3px)}
#ui.wol .cs-it.hint{animation:cbShake .35s 2;border-color:#c86a3a}
@keyframes cbShake{0%,100%{transform:none}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
#ui.wol .cs-main.full{grid-template-columns:1fr}
#ui.wol .cs-main.full .cs-table{display:none}
#ui.wol .cs-main.full .cs-box>div{gap:6px}
#ui.wol .cs-main.full .cs-pic{width:84px;height:84px}
#ui.wol .cs-main.full .cs-nm{max-width:92px}
#ui.wol .cs-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;flex:none}
#ui.wol .cs-rules{display:flex;flex-wrap:wrap;gap:5px}
#ui.wol .cs-rules .ls-soft{padding:4px 10px;font-size:.86em}
/* clues */
#ui.wol .cl2{display:flex;flex-direction:column;gap:6px;height:100%;min-height:0}
#ui.wol .cl2-zones{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#ui.wol .cl2-zones button{padding:4px 14px;border-radius:999px;border:2px solid #c9b98a;background:#fff8e6;font:inherit;font-weight:800;color:#2a1a0e;cursor:pointer}
#ui.wol .cl2-zones button small{font-size:.75em;opacity:.8}
#ui.wol .cl2-zones button.on.z-grove{background:#8a6a2a;border-color:#8a6a2a;color:#fff}
#ui.wol .cl2-zones button.on.z-amazon{background:#2f7a4a;border-color:#2f7a4a;color:#fff}
#ui.wol .cl2-zones button.on.z-reef{background:#1f7a9a;border-color:#1f7a9a;color:#fff}
#ui.wol .cl2-zones button.on small{color:#fff!important}
#ui.wol .cl2-count{margin-inline-start:auto}
#ui.wol .cl2-cases{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;flex:none}
#ui.wol .cl2-cases button{position:relative;flex:none;width:48px;height:48px;padding:0;border-radius:10px;border:3px solid #e8dcc0;background:#fff;cursor:pointer;overflow:hidden}
#ui.wol .cl2-cases button img,#ui.wol .cl2-cases button .lp-ph{width:100%;height:100%;border-radius:0}
#ui.wol .cl2-cases button .lp-ph span{font-size:.5em;padding:2px}
#ui.wol .cl2-cases button.on{border-color:#263440;box-shadow:0 0 0 2px #263440}
#ui.wol .cl2-cases button.done:not(.on){border-color:#6aa84f}
#ui.wol .cl2-cases .ok{position:absolute;top:2px;left:2px;display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#4f8a3f;color:#fff}
#ui.wol .cl2-cases .ok .ic{width:12px;height:12px}
#ui.wol .cl2-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:12px}
#ui.wol .cl2-scene{display:flex;flex-direction:column;gap:4px;min-height:0}
#ui.wol .cl2-scene h3{margin:0;font-family:var(--serif);font-size:1.2em}
#ui.wol .cl2-scene>p{margin:0;font-weight:700;line-height:1.35}
#ui.wol .cl2-pics{flex:1;min-height:0;display:flex;gap:8px;align-items:flex-start}
#ui.wol .cl2-pics figure{margin:0;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 3px 0 #d8c79a,0 4px 12px rgba(60,40,10,.18);aspect-ratio:1;min-height:0}
#ui.wol .cl2-pics figure.big{flex:1 1 0;max-height:100%;max-width:min(100%,260px)}
#ui.wol .cl2-pics figure.side{flex:0 1 38%;max-width:150px}
#ui.wol .cl2-pics figure img,#ui.wol .cl2-pics figure .lp-ph{width:100%;height:100%;border-radius:0}
#ui.wol .cl2-look{flex:none}
#ui.wol .cl2-side{display:flex;flex-direction:column;gap:6px;min-height:0;overflow:auto}
#ui.wol .cl2-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#ui.wol .cl2-s{position:relative;display:flex;flex-direction:column;border-radius:14px;background:#fff;border:2px solid #d8c79a;overflow:hidden}
#ui.wol .cl2-acc{display:flex;align-items:center;gap:8px;padding:5px 8px;border:0;background:none;font:inherit;font-weight:800;color:#2a1a0e;cursor:pointer;text-align:right}
#ui.wol .cl2-acc img,#ui.wol .cl2-acc .lp-ph{width:58px;height:58px;border-radius:50%;flex:none;box-shadow:0 0 0 2px #fff,0 1px 5px rgba(0,0,0,.25)}
#ui.wol .cl2-acc:hover:not(:disabled){background:#fff3d8}
#ui.wol .cl2-out{align-self:stretch;padding:2px 6px;border:0;border-top:1px dashed #d8c79a;background:#f6efe0;font:inherit;font-size:.75em;font-weight:800;color:#8a5a3a;cursor:pointer}
#ui.wol .cl2-out:hover{background:#ffe6d0}
#ui.wol .cl2-s.no{opacity:.5;filter:grayscale(1)}
#ui.wol .cl2-s.no .cl2-acc span{text-decoration:line-through}
#ui.wol .cl2-s.yes{border-color:#4f8a3f;background:#eaf6dc}
#ui.wol .cl2-s.hint{animation:cbShake .35s 2}
#ui.wol .cl2-notes{padding:6px 8px;border-radius:12px;background:#fffdf4;border:2px dashed #c9b98a;background-image:linear-gradient(rgba(60,110,170,.09) 1px,transparent 1px);background-size:100% 20px}
#ui.wol .cl2-notes ul{margin:2px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px}
#ui.wol .cl2-notes li{display:flex;gap:5px;align-items:flex-start;font-size:.88em;line-height:1.3;font-weight:700}
#ui.wol .cl2-notes li .ic{width:14px;height:14px;flex:none;margin-top:2px;color:#1d6680}
#ui.wol .cl2-notes li.x b{flex:none;color:#8a3a1a;text-decoration:line-through}
#ui.wol .cl2-notes li.x span{color:#5a4420;font-weight:600}
#ui.wol .cl2-notes em{font-size:.85em;color:#8a7a50}
#ui.wol .cl2-yes{display:flex;gap:6px;padding:8px 10px;border-radius:12px;background:#eaf6dc;border:2px solid #8ab86a}
#ui.wol .cl2-yes .ic{width:20px;height:20px;flex:none;color:#2c5a2a}
#ui.wol .cl2-yes p{margin:0;font-weight:700;line-height:1.4}
#ui.wol .ls.kids .cl2-notes li,#ui.wol .ls.kids .cl2-yes p,#ui.wol .ls.kids .cl2-scene>p{line-height:1.65}
@media (max-width:900px),(max-height:620px){
  #ui.wol .cb-it{width:70px}#ui.wol .cb-it img,#ui.wol .cb-it .lp-ph{width:44px;height:44px}
  #ui.wol .cb-ghost{width:40px;height:40px}#ui.wol .cb-ghost.pt{width:76px;height:100px}
  #ui.wol .pt-cert{width:78px}
  #ui.wol .cb-zcard{gap:10px;padding:10px}
  #ui.wol .cb-zpic{width:min(220px,46vh)}
  #ui.wol .cb-ztx p{font-size:.92em}
  #ui.wol .cs-pic{width:44px;height:44px}
  #ui.wol .cs-table>div{grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:4px}
  #ui.wol .cs-it{font-size:.68em;padding:3px}
  #ui.wol .cs-nm{max-width:60px}
  #ui.wol .cs-it.sm .cs-pic{width:28px;height:28px}
  #ui.wol .cs-main.full .cs-pic{width:56px;height:56px}
  #ui.wol .cs-bar>button[data-mode]{padding:3px 10px;font-size:.88em}
  #ui.wol .cs-set{font-size:.78em}
  #ui.wol .cs-rules .ls-soft{padding:3px 8px;font-size:.78em}
  #ui.wol .cl2-cases button{width:38px;height:38px;border-width:2px}
  #ui.wol .cl2-zones button{padding:2px 10px;font-size:.88em}
  #ui.wol .cl2-acc{padding:3px 6px;gap:6px;font-size:.88em}
  #ui.wol .cl2-acc img,#ui.wol .cl2-acc .lp-ph{width:34px;height:34px}
  #ui.wol .cl2-scene h3{font-size:1.02em}
  #ui.wol .cl2-scene>p{font-size:.88em}
  #ui.wol .cl2-notes li{font-size:.8em}
  #ui.wol .cl2-yes p{font-size:.86em}
}
`;
