// סדנת הרובוט (1.4.3, set 4; Avi, 3.11: "missions that grow from the island he built: his trees, his animals, what
// really lives there"). A template is written by hand (what it needs on the island, its story, what it tests in the
// robot); the field is made from the child's own island: his trees stand where they stand, his flowers are the
// mission's flowers, his water is the field's water, and the ground beside the water turns to mud. A planner
// (engine/plan.js) checks every mission before a child sees it: it must be done by at least two different robots of
// those open to him. Nothing here changes the island; it only reads it. Pure (no DOM, no three.js).
//   islandMissions(view, { zone, species, step, seed }) → [mission levels] (the ones this island can give now);
//     when there is none, .later is the workshop step at which a template opens (0: this island gives none yet)
//   view = { plants: [{ id, x, z, g, tree }], animals: [{ id, x, z }], isWater(x, z), isPlaceable(x, z), radius, sea }
//   species = the zone's species (data/<zone>.js BIOME.species: id, name, kind, relations)
//   viewFromSave(save, species)   the same view from a saved island (the tests; terrain read as open dry ground)
import { planLevel } from './engine/plan.js';
import { levelOf } from './engine/level.js';
import { missionBuild } from './missions.js';
import { PARTS, CHASSIS } from '../data/robolab/workshop.js';
import { nameK } from '../data/inventions-kids.js';

const CS = 4;   // a field cell, in metres (the lessons' fields use about the same)
const T2 = (f, k) => ({ f, k });
const nm = (sp) => ({ f: sp.name, k: nameK(sp.name) });
// a count of plants (masculine: צמחים), in words for two to six
const NUM_M = { 2: T2('שני', 'שְׁנֵי'), 3: T2('שלושה', 'שְׁלוֹשָׁה'), 4: T2('ארבעה', 'אַרְבָּעָה'), 5: T2('חמישה', 'חֲמִשָּׁה'), 6: T2('שישה', 'שִׁשָּׁה') };

export function viewFromSave(save, species) {
  const by = new Map(species.map((s) => [s.id, s]));
  return {
    plants: (save.plants || []).filter((p) => by.has(p.id) && (p.h == null || p.h > 0)).map((p) => ({ id: p.id, x: p.x, z: p.z, g: p.g == null ? 1 : p.g, tree: by.get(p.id).kind === 'tree' })),
    animals: (save.animals || []).map((a) => ({ id: a.id, x: a.x, z: a.z })),
    isWater: () => false, isPlaceable: () => true, radius: 38, sea: save.biome === 'reef',
  };
}

// the robots a mission is tried with: the ready robots the child may have, with the tool the job needs, on the wheels
// open at his step. A mission needs two of them to succeed (one way is never the only way).
function candidates(step, tool) {
  const open = (id) => +(String((PARTS[id] || CHASSIS[id] || {}).earn || 'wk:9').split(':')[1]) <= step;
  const out = [];
  for (const wheels of ['wheel_m', 'wheel_l', 'wheel_wide', 'tracks', 'wheel_s']) {
    if (!open(wheels) || !open(tool)) continue;
    out.push({ name: wheels, build: missionBuild({ from: 'gardener', wheels, tools: [tool, 'seedbox'].slice(0, PARTS[tool].size > 1 ? 1 : 2), sensors: ['color', 'distance'] }) });
  }
  return out;
}

// the field: a rectangle of cells over the island that holds the chosen things, read cell by cell
function layField(view, want, { pad = 1, maxW = 12, maxH = 8 } = {}) {
  let x0 = Math.min(...want.map((p) => p.x)), x1 = Math.max(...want.map((p) => p.x));
  let z0 = Math.min(...want.map((p) => p.z)), z1 = Math.max(...want.map((p) => p.z));
  const cols = Math.round((x1 - x0) / CS) + 1 + pad * 2, rows = Math.round((z1 - z0) / CS) + 1 + pad * 2;
  if (cols > maxW || rows > maxH) return null;
  const OX = (x0 + x1) / 2, OZ = (z0 + z1) / 2;
  const wx = (c) => OX + (c - (cols - 1) / 2) * CS, wz = (r) => OZ + (r - (rows - 1) / 2) * CS;
  const R = (view.radius || 38) - CS * 0.5;   // a cell this far out is the island's edge (but never a cell a wanted plant stands in)
  const grid = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      const X = wx(c), Z = wz(r), h = CS / 2;
      if (Math.hypot(X, Z) > R && !want.some((p) => Math.abs(p.x - X) < h && Math.abs(p.z - Z) < h)) { line += '#'; continue; }
      const tree = view.plants.some((p) => p.tree && p.g > 0.3 && Math.abs(p.x - X) < h && Math.abs(p.z - Z) < h);
      line += tree ? 'T' : view.isWater(X, Z) ? '~' : !view.isPlaceable(X, Z) ? 'R' : '.';
    }
    grid.push(line);
  }
  // the ground beside his water is soft: mud the robot must go round (or cross on tracks)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => (grid[r + dr] || '')[c + dc] === '~')) grid[r] = grid[r].slice(0, c) + 'm' + grid[r].slice(c + 1);
  const cellOf = (x, z) => ({ c: Math.round((x - OX) / CS + (cols - 1) / 2), r: Math.round((z - OZ) / CS + (rows - 1) / 2) });
  return { rows: ['#'.repeat(cols + 2), ...grid.map((l) => '#' + l + '#'), '#'.repeat(cols + 2)], cellOf: (x, z) => { const q = cellOf(x, z); return { x: q.c + 1, y: q.r + 1 }; }, place: { OX, OZ, CS }, nc: cols, nr: rows };
}

// a start for the robot: an open cell on the edge of the field (the bottom row first), as far as possible from the jobs
function startCell(F, items) {
  const rows = F.rows, open = (x, y) => '.s'.includes((rows[y] || '')[x]);
  for (let y = rows.length - 2; y >= 1; y--) {
    const cs = []; for (let x = 1; x < rows[0].length - 1; x++) if (open(x, y) && !items.some((it) => it.x === x && it.y === y)) cs.push(x);
    if (cs.length) return { x: cs[Math.floor(cs.length / 2)], y };
  }
  return null;
}

// ── the templates
const TEMPLATES = [
  {
    // האבקה מלאכותית: two or more of his plants of a kind that an animal of the zone pollinates (a relation of the cards)
    id: 'pollinate', step: 3, tool: 'brush', tests: ['pollen', 'gentle'],
    make(view, sp, rnd) {
      const by = new Map(sp.map((s) => [s.id, s]));
      const who = new Map();   // plant id → the animals that pollinate it
      for (const a of sp) for (const r of a.relations || []) if (r.type === 'pollinates' && by.has(r.target)) { if (!who.has(r.target)) who.set(r.target, []); who.get(r.target).push(a); }
      const kinds = [...who.keys()].map((id) => ({ id, ps: view.plants.filter((p) => p.id === id && p.g >= 0.5) })).filter((k) => k.ps.length >= 2);
      const out = [];
      for (const k of kinds) {
        // the flower that gives pollen, and up to three of its kind near it (each plant is tried as the giver, in a
        // shuffled order, until a field fits on the island with every flower in a cell of its own)
        const order = k.ps.map((p) => [rnd(), p]).sort((a, b) => a[0] - b[0]).map((q) => q[1]);
        let F = null, items = null, use = [];
        for (const src of order) {
          const near = k.ps.filter((p) => p !== src).sort((a, b) => Math.hypot(a.x - src.x, a.z - src.z) - Math.hypot(b.x - src.x, b.z - src.z)).slice(0, 3);
          for (use = near; use.length; use = use.slice(0, -1)) {
            F = layField(view, [src, ...use]); if (!F) continue;
            items = [src, ...use].map((p, i) => ({ t: 'flower', kind: k.id, ...F.cellOf(p.x, p.z), ...(i === 0 ? { src: true } : {}) }));
            const onField = items.every((it) => !'#'.includes((F.rows[it.y] || '#')[it.x] || '#'));
            if (onField && new Set(items.map((it) => it.x + ',' + it.y)).size === items.length) break;   // two plants in one cell: not a fair field
            F = null;
          }
          if (F) break;
        }
        if (!F) continue;
        const P = by.get(k.id), A = who.get(k.id)[0], n = use.length + 1;
        out.push({
          kind: 'pollinate', plant: k.id, F, items,
          title: T2('האבקה מלאכותית באי שלי', 'הַאֲבָקָה מְלָאכוּתִית בָּאִי שֶׁלִּי'),
          say: [T2(`באי שלך גדלים ${NUM_M[n].f} צמחים של ${P.name}. בדרך כלל האבקה עוברת מפרח לפרח עם ${A.name}. היום הרובוט שלכם עוזר: הוא לוקח אבקה מהפרח המסומן ומביא אותה אל שאר הצמחים מאותו מין.`,
            `בָּאִי שֶׁלְּךָ גְּדֵלִים ${NUM_M[n].k} צְמָחִים שֶׁל ${nm(P).k}. בְּדֶרֶךְ כְּלָל הָאַבְקָה עוֹבֶרֶת מִפֶּרַח לְפֶרַח עִם ${nm(A).k}. הַיּוֹם הָרוֹבּוֹט שֶׁלָּכֶם עוֹזֵר: הוּא לוֹקֵחַ אַבְקָה מֵהַפֶּרַח הַמְּסֻמָּן וּמֵבִיא אוֹתָהּ אֶל שְׁאָר הַצְּמָחִים מֵאוֹתוֹ מִין.`)],
          need: T2('מברשת עדינה, שלוקחת אבקה בלי לפצוע את הפרח.', 'מִבְרֶשֶׁת עֲדִינָה, שֶׁלּוֹקַחַת אַבְקָה בְּלִי לִפְצֹעַ אֶת הַפֶּרַח.'),
          end: T2('האבקה הגיעה לכל הצמחים. עכשיו יוכלו להתפתח בהם פירות וזרעים.', 'הָאַבְקָה הִגִּיעָה לְכָל הַצְּמָחִים. עַכְשָׁו יוּכְלוּ לְהִתְפַּתֵּחַ בָּהֶם פֵּרוֹת וּזְרָעִים.'),
          blocks: ['fwd', 'back', 'right', 'left', 'pollen', 'repeat', 'if'],
          goal: { all: [{ t: 'done', item: 'flowers' }] },
        });
      }
      return out;
    },
  },
];

export function islandMissions(view, { zone, species, step = 1, seed = 1, only = null } = {}) {
  let s = (seed % 2147483646) + 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  const stats = { made: 0, home: 0, planned: [] };   // what was tried (tests and the F strip)
  let later = 0;   // templates that wait for a later workshop step (their tool is not open yet)
  for (const Tm of TEMPLATES) {
    if (only && Tm.id !== only) continue;
    if (step < Tm.step) { later = later ? Math.min(later, Tm.step) : Tm.step; continue; }
    for (const m of Tm.make(view, species, rnd)) {
      stats.made++;
      if (m.items.some((it) => (m.F.rows[it.y] || '')[it.x] === '#' || (m.F.rows[it.y] || '')[it.x] === undefined)) continue;   // a job beyond the island's edge
      const home = startCell(m.F, m.items); if (!home) continue;
      stats.home++;
      const M = {
        id: `wi-${zone}-${m.kind}-${m.plant || ''}`, mission: true, island: true, ownIsland: true, zone, template: Tm.id, step: Tm.step, concept: 'mission',
        title: m.title, say: m.say, need: m.need, end: m.end, tools: ['robot'], blocks: m.blocks,
        map: { rows: m.F.rows }, home, tools0: { robot: { x: home.x, y: home.y, dir: 0 } }, items: m.items, goal: m.goal, par: 0, place: m.F.place,
      };
      // the planner tries the robots open to him: two must succeed, or the mission is not offered
      const wins = candidates(step, Tm.tool).filter((c) => planLevel(levelOf(M), c.build));
      stats.planned.push(wins.length);
      if (wins.length < 2) continue;
      M.ways = wins.map((c) => ({ robot: c.build, name: c.name }));
      out.push(M);
    }
  }
  out.later = out.length ? 0 : later; out.stats = stats;   // none now: the step at which some may open (0: the island itself gives none)
  return out;
}
export const ISLAND_TEMPLATES = TEMPLATES.map((t) => ({ id: t.id, step: t.step, tool: t.tool, tests: t.tests }));
