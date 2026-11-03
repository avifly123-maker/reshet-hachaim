// סדנת הרובוט (1.4.3, set 4; Avi, 3.11: "missions that grow from the island he built: his trees, his animals, what
// really lives there; islands change from child to child"). A template is written by hand: what it needs on the
// island (from the cards' relations: who pollinates, who spreads seeds, who eats which fruit), its story, and what it
// tests in the robot. The field is made from the island: his trees stand where they stand, his plants are the
// mission's flowers and fruit, his water and bridges and slopes are the field's ground, and the ground beside the
// water is mud. A planner (engine/plan.js) checks every mission before a child sees it: robots of those open to him
// must do it (three ways, at least two robots). Nothing here changes the island; it only reads it. Pure.
//   makeMission(view, { zone, species, step, seed, tpl, shape, id }) → a mission level, or null when this island
//     cannot give that template now (the workshop then uses the practice island: practiceView)
//   islandMissions(view, { zone, species, step, seed }) → every mission this island gives now (tests, the F strip)
//   view = { plants: [{ id, x, z, g, tree }], animals: [{ id, x, z }], isWater, isPlaceable, heightAt?, bridgeAt?, radius, sea }
//   viewFromSave(save, species)  a saved island (terrain read as open dry ground: a first check before it loads)
//   practiceView(zone, species)  the practice island of a zone: made-up, the same for every child (practice-islands.js)
import { planLevel } from './engine/plan.js';
import { runLevel } from './engine/run.js';
import { levelOf } from './engine/level.js';
import { missionBuild } from './missions.js';
import { PARTS, CHASSIS } from '../data/robolab/workshop.js';
import { PRACTICE } from '../data/robolab/practice-islands.js';
import { nameK } from '../data/inventions-kids.js';

const CS = 4;   // a field cell, in metres (the lessons' fields use about the same)
const T2 = (f, k) => ({ f, k });
const nm = (sp) => T2(sp.name, nameK(sp.name));
const NUM_M = { 1: T2('אחד', 'אֶחָד'), 2: T2('שני', 'שְׁנֵי'), 3: T2('שלושה', 'שְׁלוֹשָׁה'), 4: T2('ארבעה', 'אַרְבָּעָה'), 5: T2('חמישה', 'חֲמִשָּׁה'), 6: T2('שישה', 'שִׁשָּׁה') };
const BIG = new Set(['tree', 'palm', 'cactus']);           // plants that stand in the robot's way
const SEA_BIG = new Set(['coral', 'sessile']);
export const isBig = (sp, sea) => !!sp && (sea ? SEA_BIG.has(sp.kind) : BIG.has(sp.kind));
const isPlant = (sp) => !!sp && sp.kind !== 'animal' && sp.kind !== 'colony' && sp.kind !== 'swarm';

export function viewFromSave(save, species) {
  const by = new Map(species.map((s) => [s.id, s])), sea = save.biome === 'reef';
  return {
    plants: (save.plants || []).filter((p) => by.has(p.id) && (p.h == null || p.h > 0)).map((p) => ({ id: p.id, x: p.x, z: p.z, g: p.g == null ? 1 : p.g, tree: isBig(by.get(p.id), sea) })),
    animals: (save.animals || []).filter((a) => by.has(a.id)).map((a) => ({ id: a.id, x: a.x, z: a.z })),
    isWater: () => false, isPlaceable: () => true, radius: 38, sea,
  };
}
// a practice island: the plants and animals of a zone placed by its table (src/data/robolab/practice-islands.js)
export function practiceView(zone, species) {
  const P = PRACTICE[zone]; if (!P) return null;
  const by = new Map(species.map((s) => [s.id, s])), sea = zone === 'reef';
  return {
    plants: P.plants.filter(([id]) => by.has(id)).map(([id, x, z, g = 0.9]) => ({ id, x, z, g, tree: isBig(by.get(id), sea) })),
    animals: P.animals.filter(([id]) => by.has(id)).map(([id, x, z]) => ({ id, x, z })),
    isWater: (x, z) => (P.water || []).some(([wx, wz, r]) => Math.hypot(x - wx, z - wz) < r), isPlaceable: () => true, radius: 38, sea, practice: true,
  };
}

// ── the field: a rectangle of cells over the island that holds the chosen things, read cell by cell
function layField(view, want, step, { pad = 1, maxW = 9, maxH = 7 } = {}) {
  const xs = want.map((p) => p.x), zs = want.map((p) => p.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const cols = Math.round((x1 - x0) / CS) + 1 + pad * 2, rows = Math.round((z1 - z0) / CS) + 1 + pad * 2;
  if (cols > maxW || rows > maxH) return null;
  const OX = (x0 + x1) / 2, OZ = (z0 + z1) / 2;
  const wx = (c) => OX + (c - (cols - 1) / 2) * CS, wz = (r) => OZ + (r - (rows - 1) / 2) * CS;
  const R = (view.radius || 38) - CS * 0.5, h = CS / 2;
  const inCell = (p, X, Z) => Math.abs(p.x - X) < h && Math.abs(p.z - Z) < h;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      const X = wx(c), Z = wz(r);
      if (Math.hypot(X, Z) > R && !want.some((p) => inCell(p, X, Z))) { line += '#'; continue; }
      if (view.plants.some((p) => p.tree && p.g > 0.3 && inCell(p, X, Z))) { line += 'T'; continue; }
      if (!view.sea && view.isWater(X, Z)) { line += view.bridgeAt && view.bridgeAt(X, Z) ? 'n' : '~'; continue; }
      if (!view.isPlaceable(X, Z)) { line += 'R'; continue; }
      // a steep cell of the island is a slope (it needs strength: open from the workshop's step 3)
      if (step >= 3 && view.heightAt && Math.abs(view.heightAt(X + h, Z) - view.heightAt(X - h, Z)) + Math.abs(view.heightAt(X, Z + h) - view.heightAt(X, Z - h)) > 1.6) { line += 'h'; continue; }
      line += '.';
    }
    grid.push(line);
  }
  const at = (r, c) => (grid[r] || '')[c];
  const set = (r, c, ch) => { grid[r] = grid[r].slice(0, c) + ch + grid[r].slice(c + 1); };
  // his water's edge: shallow water a robot with floats can cross (step 4 on), and soft mud on the shore
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => at(r + dr, c + dc));
    if (at(r, c) === '~' && step >= 4 && nb.some((q) => q && '.mh'.includes(q))) set(r, c, 'w');
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (at(r, c) === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => '~w'.includes(at(r + dr, c + dc) || 'x'))) set(r, c, 'm');
  const cellOf = (x, z) => ({ x: Math.round((x - OX) / CS + (cols - 1) / 2) + 1, y: Math.round((z - OZ) / CS + (rows - 1) / 2) + 1 });
  const map = ['#'.repeat(cols + 2), ...grid.map((l) => '#' + l + '#'), '#'.repeat(cols + 2)];
  const kinds = {};   // the big plants on the field (the practice island draws them by kind)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (at(r, c) === 'T') { const p = view.plants.find((q) => q.tree && q.g > 0.3 && inCell(q, wx(c), wz(r))); if (p) kinds[(c + 1) + ',' + (r + 1)] = p.id; }
  // the smaller plants on the field (the practice island grows them too, so it looks like an island and not a board)
  const flora = view.plants.filter((p) => !(p.tree && p.g > 0.3)).map((p) => ({ ...cellOf(p.x, p.z), id: p.id, g: p.g })).filter((q) => q.x >= 1 && q.y >= 1 && q.x <= cols && q.y <= rows);
  return { rows: map, cellOf, place: { OX, OZ, CS }, kinds, flora, ch: (x, y) => (map[y] || '')[x] || '#' };
}
// the open cells of a field (where an item may go), and the cells next to one
const OPEN = '.mh';
const openCells = (F) => { const out = []; F.rows.forEach((row, y) => [...row].forEach((c, x) => { if (OPEN.includes(c)) out.push({ x, y }); })); return out; };
const near = (F, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter((q) => OPEN.includes(F.ch(q.x, q.y)));
// the most of `pts` that fit one field together with `first` (nearest first)
function cluster(view, first, pts, step, max) {
  const rest = pts.filter((p) => p !== first).sort((a, b) => Math.hypot(a.x - first.x, a.z - first.z) - Math.hypot(b.x - first.x, b.z - first.z));
  let take = [first], F = layField(view, take, step);
  if (!F) return null;
  for (const p of rest) { if (take.length >= max) break; const G = layField(view, [...take, p], step); if (G) { take = [...take, p]; F = G; } }
  return { F, take };
}
// a start for the robot: an open cell on the bottom edge of the field first, away from the jobs
function startCell(F, items) {
  for (let y = F.rows.length - 2; y >= 1; y--) {
    const cs = []; for (let x = 1; x < F.rows[0].length - 1; x++) if ('.'.includes(F.ch(x, y)) && !items.some((it) => it.x === x && it.y === y)) cs.push(x);
    if (cs.length) return { x: cs[Math.floor(cs.length / 2)], y };
  }
  return null;
}
const unique = (items) => new Set(items.map((it) => it.x + ',' + it.y)).size === items.length;
const shuffled = (arr, rnd) => arr.map((p) => [rnd(), p]).sort((a, b) => a[0] - b[0]).map((q) => q[1]);

// ── the templates. make(ctx) → { F, items, say, title, need, end, goal, blocks } | null, ctx = { view, sp, by, rnd, step }
// tools: the parts its robots carry (candidates()); step: the workshop step it opens at (its tools' step)
const TEMPLATES = {
  // האבקה מלאכותית: two or more of his plants of a kind that an animal of the zone pollinates
  pollinate: { title: T2('האבקה מלאכותית', 'הַאֲבָקָה מְלָאכוּתִית'), need: T2('מברשת עדינה, שלוקחת אבקה בלי לפצוע את הפרח.', 'מִבְרֶשֶׁת עֲדִינָה, שֶׁלּוֹקַחַת אַבְקָה בְּלִי לִפְצֹעַ אֶת הַפֶּרַח.'),
    step: 3, tools: ['brush'], tests: ['pollen'], make({ view, sp, by, rnd, step }) {
    const who = new Map();
    for (const a of sp) for (const r of a.relations || []) if (r.type === 'pollinates' && by.has(r.target)) { if (!who.has(r.target)) who.set(r.target, []); who.get(r.target).push(a); }
    for (const id of shuffled([...who.keys()], rnd)) {
      const ps = view.plants.filter((p) => p.id === id && p.g >= 0.5); if (ps.length < 2) continue;
      for (const src of shuffled(ps, rnd)) {
        const C = cluster(view, src, ps, step, 4); if (!C || C.take.length < 2) continue;
        const items = C.take.map((p, i) => ({ t: 'flower', kind: id, plant: id, ...C.F.cellOf(p.x, p.z), ...(i === 0 ? { src: true } : {}) }));
        if (!unique(items) || items.some((it) => C.F.ch(it.x, it.y) === '#')) continue;
        const P = by.get(id), A = who.get(id)[0], n = items.length;
        return { F: C.F, items, subject: id,
          say: T2(`כאן גדלים ${NUM_M[n].f} צמחים של ${P.name}. בדרך כלל האבקה עוברת מפרח לפרח עם ${A.name}. היום הרובוט לוקח אבקה מהפרח המסומן בצהוב ומביא אותה אל הצמחים המסומנים בוורוד.`,
            `כָּאן גְּדֵלִים ${NUM_M[n].k} צְמָחִים שֶׁל ${nm(P).k}. בְּדֶרֶךְ כְּלָל הָאַבְקָה עוֹבֶרֶת מִפֶּרַח לְפֶרַח עִם ${nm(A).k}. הַיּוֹם הָרוֹבּוֹט לוֹקֵחַ אַבְקָה מֵהַפֶּרַח הַצָּהֹב וּמֵבִיא אוֹתָהּ אֶל הַפְּרָחִים הַוְּרֻדִּים.`),
          end: T2('האבקה הגיעה לכל הצמחים. עכשיו יוכלו להתפתח בהם פירות וזרעים.', 'הָאַבְקָה הִגִּיעָה לְכָל הַצְּמָחִים. עַכְשָׁו יוּכְלוּ לִגְדֹּל בָּהֶם פֵּרוֹת וּזְרָעִים.'),
          blocks: ['pollen'], goal: [{ t: 'done', item: 'flowers' }] };
      }
    }
    return null;
  } },
  // מאכל לבעלי החיים: fruit fallen under his tree, a feeder by an animal of his that eats that fruit (diet)
  feed: { title: T2('ארוחה מהעץ', 'אֲרוּחָה מֵהָעֵץ'), need: T2('מלקחיים או כף, שאוספים פרי בלי למעוך אותו.', 'מֶלְקָחַיִם אוֹ כַּף, שֶׁאוֹסְפִים פְּרִי בְּלִי לִמְעֹךְ אוֹתוֹ.'),
    step: 1, tools: ['claw'], tests: ['pick', 'drop'], make({ view, sp, by, rnd, step }) {
    const pairs = [];
    for (const a of sp) for (const d of a.diet || []) if (d.part === 'fruit' && by.has(d.id)) pairs.push([a, by.get(d.id)]);
    for (const [A, P] of shuffled(pairs, rnd)) {
      const trees = view.plants.filter((p) => p.id === P.id && p.g >= 0.6), animals = view.animals.filter((q) => q.id === A.id);
      if (!trees.length || (!animals.length && !view.practice)) continue;
      for (const t of shuffled(trees, rnd)) {
        const who = animals.length ? animals.slice().sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[0] : { x: t.x + CS * 3, z: t.z };
        const F = layField(view, [t, who], step); if (!F) continue;
        const tc = F.cellOf(t.x, t.z), fruitAt = shuffled(near(F, tc.x, tc.y), rnd).slice(0, 2);
        // one feeder for each fruit, by the animal's place (open cells, none where a fruit lies)
        const ac = F.cellOf(who.x, who.z), free = [ac, ...near(F, ac.x, ac.y)].filter((q) => OPEN.includes(F.ch(q.x, q.y)) && !fruitAt.some((f) => f.x === q.x && f.y === q.y));
        if (!fruitAt.length || free.length < fruitAt.length) continue;
        const items = [...fruitAt.map((q) => ({ t: 'fruit', plant: P.id, ...q })), ...free.slice(0, fruitAt.length).map((q) => ({ t: 'feeder', kind: A.id, animal: A.id, ...q }))];
        if (!unique(items)) continue;
        return { F, items, subject: A.id,
          say: T2(`פירות נשרו מ${P.name}. הפירות האלה הם אוכל של ${A.name}. הרובוט קוטף אותם מהאדמה ומגיש אותם בכלי האוכל, ליד המקום של ${A.name}.`,
            `פֵּרוֹת נָשְׁרוּ מִ${nm(P).k}. הַפֵּרוֹת הָאֵלֶּה הֵם אֹכֶל שֶׁל ${nm(A).k}. הָרוֹבּוֹט קוֹטֵף אוֹתָם וּמַגִּישׁ אוֹתָם בִּכְלִי הָאֹכֶל.`),
          end: T2('הפירות מחכים בכלי האוכל.', 'הַפֵּרוֹת מְחַכִּים בִּכְלִי הָאֹכֶל.'),
          blocks: ['pick', 'drop'], goal: [{ t: 'done', item: 'feeders' }] };
      }
    }
    return null;
  } },
  // פיזור זרעים: fruit under his tree, of a kind an animal spreads (relation disperses); the seeds go far from it,
  // where the young trees will not grow in their parent's shade
  disperse: { title: T2('זרעים למקום חדש', 'זְרָעִים לְמָקוֹם חָדָשׁ'), need: T2('מלקחיים לפרי, ומיכל זרעים לשתילה.', 'מֶלְקָחַיִם לַפְּרִי, וּמְכַל זְרָעִים לַשְּׁתִילָה.'),
    step: 1, tools: ['claw', 'seedbox'], tests: ['pick', 'plant'], make({ view, sp, by, rnd, step }) {
    const pairs = [];
    for (const a of sp) for (const r of a.relations || []) if (r.type === 'disperses' && by.has(r.target) && isPlant(by.get(r.target))) pairs.push([a, by.get(r.target)]);
    for (const [A, P] of shuffled(pairs, rnd)) {
      const trees = view.plants.filter((p) => p.id === P.id && p.g >= 0.6);
      for (const t of shuffled(trees, rnd)) {
        const F = layField(view, [t, { x: t.x + CS * 4, z: t.z + CS * 2 }], step) || layField(view, [t, { x: t.x - CS * 4, z: t.z - CS * 2 }], step); if (!F) continue;
        const tc = F.cellOf(t.x, t.z), fruitAt = shuffled(near(F, tc.x, tc.y), rnd).slice(0, 1);
        const far = shuffled(openCells(F).filter((q) => Math.abs(q.x - tc.x) + Math.abs(q.y - tc.y) >= 4 && F.ch(q.x, q.y) === '.'), rnd).slice(0, 3);
        if (!fruitAt.length || far.length < 2) continue;
        const items = [...fruitAt.map((q) => ({ t: 'fruit', plant: P.id, ...q })), ...far.map((q) => ({ t: 'seed', ...q }))];
        if (!unique(items)) continue;
        return { F, items, subject: P.id,
          say: T2(`${A.name} מפזר בדרך כלל את הזרעים של ${P.name}. זרעים שנופלים ממש מתחת לעץ גדלים בצל שלו. הרובוט אוסף פרי מתחת לעץ ושותל זרעים במקומות המסומנים, רחוק ממנו.`,
            `${nm(A).k} מְפַזֵּר בְּדֶרֶךְ כְּלָל אֶת הַזְּרָעִים שֶׁל ${nm(P).k}. זְרָעִים שֶׁנּוֹפְלִים מִתַּחַת לָעֵץ גְּדֵלִים בַּצֵּל שֶׁלּוֹ. הָרוֹבּוֹט אוֹסֵף פְּרִי וְשׁוֹתֵל זְרָעִים רָחוֹק מִמֶּנּוּ.`),
          end: T2('הזרעים באדמה, רחוק מעץ האם. שם יהיה להם אור לגדול.', 'הַזְּרָעִים בָּאֲדָמָה, רָחוֹק מֵעֵץ הָאֵם. שָׁם יִהְיֶה לָהֶם אוֹר.'),
          blocks: ['pick', 'plant'], goal: [{ t: 'done', item: 'fruit' }, { t: 'done', item: 'seeds' }] };
      }
    }
    return null;
  } },
  // ספירה: his animals of one kind on the field; the robot photographs each one, counts and reports
  count: { title: T2('כמה יש כאן?', 'כַּמָּה יֵשׁ כָּאן?'), need: T2('מחזיק מצלמה כדי לצלם, ומשואה כדי לדווח.', 'מַחֲזִיק מַצְלֵמָה וּמַשּׂוּאָה.'),
    step: 2, tools: ['cammount', 'beacon'], tests: ['photo', 'report'], make({ view, by, rnd, step }) {
    const kinds = {}; for (const a of view.animals) if (by.has(a.id)) (kinds[a.id] = kinds[a.id] || []).push(a);
    for (const id of shuffled(Object.keys(kinds).filter((k) => kinds[k].length >= 2), rnd)) {
      for (const a0 of shuffled(kinds[id], rnd)) {
        const C = cluster(view, a0, kinds[id], step, 5); if (!C || C.take.length < 2) continue;
        const items = C.take.map((a) => { const q = C.F.cellOf(a.x, a.z); return OPEN.includes(C.F.ch(q.x, q.y)) ? q : near(C.F, q.x, q.y)[0]; }).filter(Boolean).map((q) => ({ t: 'animal', kind: id, ...q }));
        if (items.length < 2 || !unique(items)) continue;
        const A = by.get(id), n = items.length;
        return { F: C.F, items, subject: id,
          say: T2(`בשטח הזה מסתובבים כמה בעלי חיים מסוג ${A.name}. כמה בדיוק? הרובוט מצלם כל אחד, מוסיף אחד למונה, ובסוף מדווח את המספר.`, `בַּשֶּׁטַח מִסְתּוֹבְבִים כַּמָּה בַּעֲלֵי חַיִּים מִסּוּג ${nm(A).k}. הָרוֹבּוֹט מְצַלֵּם כָּל אֶחָד, סוֹפֵר, וּבַסּוֹף מְדַוֵּחַ.`),
          end: T2(`ספרתם ${NUM_M[n] ? NUM_M[n].f : n}. עכשיו יודעים כמה חיים כאן.`, 'סְפַרְתֶּם נָכוֹן!'),
          blocks: ['photo', 'add', 'report'], goal: [{ t: 'done', item: 'animals' }, { t: 'report', n }] };
      }
    }
    return null;
  } },
  // השקיה: his young plants (they need water while their roots are short)
  water: { title: T2('מים לצעירים', 'מַיִם לַצְּעִירִים'), need: T2('מתזה למים. לכל מיכל יש מספר השקיות מוגבל.', 'מַתָּזָה לְמַיִם.'),
    step: 2, tools: ['sprayer'], tests: ['water'], make({ view, by, rnd, step }) {
    if (view.sea) return null;
    const young = view.plants.filter((p) => p.g < 0.6 && isPlant(by.get(p.id)));
    for (const p0 of shuffled(young, rnd)) {
      const C = cluster(view, p0, young, step, 4); if (!C || C.take.length < 2) continue;
      const items = C.take.map((p) => ({ t: 'thirsty', plant: p.id, ...C.F.cellOf(p.x, p.z) })).filter((it) => OPEN.includes(C.F.ch(it.x, it.y)));
      if (items.length < 2 || !unique(items)) continue;
      return { F: C.F, items, subject: p0.id,
        say: T2(`כאן גדלים ${NUM_M[items.length].f} צמחים צעירים. השורשים שלהם עוד קצרים, והם צריכים מים. הרובוט משקה כל אחד מהם.`, `כָּאן גְּדֵלִים ${NUM_M[items.length].k} צְמָחִים צְעִירִים. הַשָּׁרָשִׁים שֶׁלָּהֶם עוֹד קְצָרִים. הָרוֹבּוֹט מַשְׁקֶה אוֹתָם.`),
        end: T2('הצמחים הצעירים שתו, והם ממשיכים לגדול.', 'הַצְּמָחִים שָׁתוּ, וְהֵם מַמְשִׁיכִים לִגְדֹּל.'),
        blocks: ['water'], goal: [{ t: 'done', item: 'thirsty' }] };
    }
    return null;
  } },
  // אחרי הסערה: branches fell between his trees; the robot lifts them off the way
  clear: { title: T2('אחרי הסערה', 'אַחֲרֵי הַסְּעָרָה'), need: T2('וו או מזלג הרמה, שמרימים ענף.', 'וָו אוֹ מַזְלֵג הֲרָמָה.'),
    step: 3, tools: ['hook'], tests: ['lift'], make({ view, rnd, step }) {
    if (view.sea) return null;
    const trees = view.plants.filter((p) => p.tree && p.g > 0.5);
    for (const t of shuffled(trees, rnd)) {
      const C = cluster(view, t, trees, step, 4); if (!C || C.take.length < 2) continue;
      const cand = shuffled(openCells(C.F).filter((q) => C.F.ch(q.x, q.y) === '.' && near(C.F, q.x, q.y).length >= 2 && C.F.rows.some(() => true)), rnd);
      const logs = cand.filter((q) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => C.F.ch(q.x + dx, q.y + dy) === 'T')).slice(0, 3);
      if (logs.length < 2) continue;
      const items = logs.map((q) => ({ t: 'log', ...q }));
      return { F: C.F, items, subject: 'storm',
        say: T2('בלילה הייתה רוח חזקה, וענפים נפלו בין העצים. הרובוט מרים את כל הענפים מהדרך.', 'בַּלַּיְלָה הָיְתָה רוּחַ חֲזָקָה, וַעֲנָפִים נָפְלוּ. הָרוֹבּוֹט מֵרִים אֶת כָּל הָעֲנָפִים.'),
        end: T2('הדרך פנויה, ובעלי החיים יכולים לעבור.', 'הַדֶּרֶךְ פְּנוּיָה!'),
        blocks: ['lift'], goal: [{ t: 'done', item: 'logs' }] };
    }
    return null;
  } },
  // אש ליד העצים: small fires by his trees, put out before they spread (a rescue against the clock by itself)
  fire: { title: T2('אש ליד העצים', 'אֵשׁ לְיַד הָעֵצִים'), need: T2('מתזה למים, ורובוט שמגיע מהר.', 'מַתָּזָה לְמַיִם, וְרוֹבּוֹט מָהִיר.'),
    step: 2, tools: ['sprayer'], tests: ['spray', 'steps'], rescue: true, make({ view, rnd, step }) {
    if (view.sea) return null;
    const trees = view.plants.filter((p) => p.tree && p.g > 0.5);
    for (const t of shuffled(trees, rnd)) {
      const C = cluster(view, t, trees, step, 3); if (!C) continue;
      const by = []; for (const p of C.take) { const q = C.F.cellOf(p.x, p.z); const n = near(C.F, q.x, q.y).find((o) => !by.some((b) => b.x === o.x && b.y === o.y)); if (n) by.push(n); }
      if (by.length < 2) continue;
      return { F: C.F, items: by.slice(0, 3).map((q) => ({ t: 'fire', ...q })), subject: 'fire',
        say: T2('מוקדי אש קטנים התחילו ליד העצים. הרובוט מכבה אותם מהר, לפני שהאש תגיע לעצים.', 'אֵשׁ קְטַנָּה הִתְחִילָה לְיַד הָעֵצִים. הָרוֹבּוֹט מְכַבֶּה אוֹתָהּ מַהֵר.'),
        end: T2('האש כבתה, והעצים בטוחים.', 'הָאֵשׁ כָּבְתָה!'),
        blocks: ['spray'], goal: [{ t: 'done', item: 'fires' }] };
    }
    return null;
  } },
  // רשתות על השונית: old fishing nets caught by his corals; the robot gathers them gently
  nets: { title: T2('רשתות על השונית', 'רְשָׁתוֹת עַל הַשּׁוּנִית'), need: T2('כף או רשת איסוף.', 'כַּף אוֹ רֶשֶׁת אִסּוּף.'),
    step: 1, tools: ['scoop'], tests: ['collect', 'gentle'], make({ view, rnd, step }) {
    if (!view.sea) return null;
    const corals = view.plants.filter((p) => p.tree && p.g > 0.4);
    for (const t of shuffled(corals, rnd)) {
      const C = cluster(view, t, corals, step, 4); if (!C) continue;
      const by = []; for (const p of C.take) { const q = C.F.cellOf(p.x, p.z); const n = near(C.F, q.x, q.y).find((o) => !by.some((b) => b.x === o.x && b.y === o.y)); if (n) by.push(n); }
      if (by.length < 2) continue;
      return { F: C.F, items: by.slice(0, 4).map((q) => ({ t: 'net', ...q })), subject: 'nets',
        say: T2('רשתות דייגים ישנות נתקעו ליד האלמוגים. הרובוט אוסף אותן בעדינות, בלי לשבור אלמוג.', 'רְשָׁתוֹת יְשָׁנוֹת נִתְקְעוּ לְיַד הָאַלְמֻגִּים. הָרוֹבּוֹט אוֹסֵף אוֹתָן בַּעֲדִינוּת.'),
        end: T2('השונית נקייה, והדגים שוחים חופשי.', 'הַשּׁוּנִית נְקִיָּה!'),
        blocks: ['collect'], goal: [{ t: 'done', item: 'nets' }] };
    }
    return null;
  } },
  // עשב ים: young seagrass planted on the sand between his corals (seagrass beds feed turtles and shelter fish)
  seagrass: { title: T2('שותלים עשב ים', 'שׁוֹתְלִים עֵשֶׂב יָם'), need: T2('מיכל שתילים.', 'מְכַל שְׁתִילִים.'),
    step: 1, tools: ['seedbox'], tests: ['plant'], make({ view, by, rnd, step }) {
    if (!view.sea || !by.has('seagrass')) return null;
    const corals = view.plants.filter((p) => p.tree && p.g > 0.4);
    for (const t of shuffled(corals, rnd)) {
      const C = cluster(view, t, corals, step, 3); if (!C) continue;
      const spots = shuffled(openCells(C.F).filter((q) => C.F.ch(q.x, q.y) === '.'), rnd).slice(0, 3);
      if (spots.length < 3) continue;
      const S = by.get('seagrass');
      return { F: C.F, items: spots.map((q) => ({ t: 'seed', plant: 'seagrass', ...q })), subject: 'seagrass',
        say: T2(`על החול בין האלמוגים חסר ${S.name}. הרובוט שותל אותו בשלושה מקומות.`, `עַל הַחוֹל בֵּין הָאַלְמֻגִּים חָסֵר ${nm(S).k}. הָרוֹבּוֹט שׁוֹתֵל אוֹתוֹ.`),
        end: T2('עשב הים התחיל לגדול על החול.', 'עֵשֶׂב הַיָּם הִתְחִיל לִגְדֹּל.'),
        blocks: ['plant'], goal: [{ t: 'done', item: 'seeds' }] };
    }
    return null;
  } },
};
export const TEMPLATE_IDS = Object.keys(TEMPLATES);
export const templateInfo = (id) => (TEMPLATES[id] ? { title: TEMPLATES[id].title, need: TEMPLATES[id].need, step: TEMPLATES[id].step, tools: TEMPLATES[id].tools } : null);
export const templateStep = (id) => (TEMPLATES[id] ? TEMPLATES[id].step : 9);

// the robots a mission is tried with: ready robots with the template's tools, on each set of wheels open at the
// child's step (and with floats from step 4): all a beginner can build too
function candidates(step, tools) {
  const open = (id) => +(String((PARTS[id] || CHASSIS[id] || {}).earn || 'wk:9').split(':')[1]) <= step;
  if (!tools.every(open)) return [];
  const out = [];
  const sensors = ['color', 'distance', ...(tools.includes('cammount') ? ['camera'] : [])];
  for (const wheels of ['wheel_m', 'wheel_l', 'wheel_wide', 'tracks', 'wheel_s', 'omni']) {
    if (!open(wheels)) continue;
    // the same wheels with another tool beside the one the job needs: another robot, another weight and speed
    for (const extra of [null, 'seedbox', 'scoop', 'claw']) {
      if (extra && (tools.includes(extra) || tools.length >= 2 || !open(extra))) continue;
      const toolset = extra ? [...tools, extra] : tools.slice(0, 2);
      out.push({ name: wheels + (extra ? '+' + extra : ''), spec: { from: 'gardener', wheels, tools: toolset, sensors } });
    }
  }
  // few parts open yet (the first steps): the same robot with other sensors is another robot too
  for (const sens of [['color'], ['distance']]) if (out.length < 3) out.push({ name: out[0] ? out[0].name + '/' + sens[0] : sens[0], spec: { ...(out[0] || { spec: { from: 'gardener', tools } }).spec, sensors: sens } });
  // other wheels before other tools, six at most (each is planned: enough to know, not more)
  const seen = new Set(), pickOrder = [...out.filter((c) => !c.name.includes('+')), ...out.filter((c) => c.name.includes('+'))];
  return pickOrder.filter((c) => { const k = JSON.stringify(c.spec); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6).map((c) => ({ ...c, build: missionBuild(c.spec) }));
}

const SHAPE_SAY = {
  rescue: T2('צריך להספיק מהר: יש מספר צעדים מוגבל.', 'צָרִיךְ לְהַסְפִּיק מַהֵר!'),
  reverse: T2('קוּבִּי כבר כתב תוכנית, אבל יש בה טעות אחת. מצאו אותה ותקנו.', 'קוּבִּי כָּתַב תָּכְנִית, וְיֵשׁ בָּהּ טָעוּת אַחַת. מִצְאוּ וְתַקְּנוּ.'),
  change: T2('שימו לב: באמצע העבודה יקרה עוד משהו.', 'שִׂימוּ לֵב: בָּאֶמְצַע יִקְרֶה עוֹד מַשֶּׁהוּ.'),
};

export function makeMission(view, { zone, species, step = 1, seed = 1, tpl, shape = null, id = null } = {}) {
  const Tm = TEMPLATES[tpl]; if (!Tm || step < Tm.step || !view) return null;
  let s = (seed % 2147483646) + 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const by = new Map(species.map((q) => [q.id, q]));
  const m = Tm.make({ view, sp: species, by, rnd, step }); if (!m) return null;
  const home = startCell(m.F, m.items); if (!home) return null;
  const M = {
    id: id || `wi-${zone}-${tpl}-${m.subject || ''}`, mission: true, island: !view.practice, zone, tpl, shape, step: Tm.step, concept: 'mission',
    title: Tm.title, say: [m.say], need: Tm.need, end: m.end, tools: ['robot'],
    blocks: ['fwd', 'back', 'right', 'left', ...m.blocks, 'wait', 'repeat', 'if', 'until'],
    map: { rows: m.F.rows }, home, tools0: { robot: { x: home.x, y: home.y, dir: 0 } }, items: m.items, goal: { all: m.goal.slice() }, par: 0,
    ...(view.practice ? { cells: m.F.kinds, flora: m.F.flora.filter((q) => !m.items.some((it) => it.plant && it.x === q.x && it.y === q.y && it.t !== 'fruit')) } : { ownIsland: true, place: m.F.place }),
  };
  // the planner tries the robots open to him: three ways, at least two robots, or the mission is not offered
  const plan = (L, c) => planLevel(levelOf(L), c.build);
  let wins = candidates(step, Tm.tools).map((c) => ({ c, r: plan(M, c) })).filter((q) => q.r);
  if (wins.length < 3) return null;
  // the form of the mission (mission-kinds.js SHAPES)
  if (shape === 'change') {   // the last job comes in the middle of the run: a fire starts, a fruit falls, a seedling wilts
    const best = Math.min(...wins.map((q) => q.r.ticks)), it = M.items[M.items.length - 1];
    if (it.t === 'feeder' || (it.t === 'flower' && it.src)) return null;
    it.appear = Math.max(4, Math.round(best * 0.45));
    wins = wins.map((q) => ({ c: q.c, r: plan(M, q.c) })).filter((q) => q.r);
  }
  if (shape === 'rescue' || Tm.rescue) {   // against the clock: a little more than the quickest robot needs
    const sorted = wins.map((q) => q.r.ticks).sort((a, b) => a - b), lim = Math.ceil(sorted[Math.min(1, sorted.length - 1)] * 1.25) + 2;
    M.goal.all.push({ t: 'steps', max: lim });
    wins = wins.filter((q) => runOk(M, q.c, q.r.prog));
  }
  if (wins.length < 3) return null;
  if (shape === 'reverse') {   // a program with one mistake (a turn the wrong way) for the child to find
    const p = wins[0].r.prog.robot, i = p.findIndex((nd) => nd.b === 'right' || nd.b === 'left');
    if (i < 0) return null;
    const bad = { robot: p.map((nd, j) => (j === i ? { b: nd.b === 'right' ? 'left' : 'right' } : { ...nd })) };
    if (runOk(M, wins[0].c, bad)) return null;
    M.start0 = bad;
  }
  if (SHAPE_SAY[shape]) M.say.push(SHAPE_SAY[shape]);
  M.ways = wins.map((q) => ({ robot: q.c.spec, name: q.c.name, prog: q.r.prog }));
  M.par = Math.min(...wins.map((q) => countBlocks(q.r.prog.robot)));
  return M;
}
const countBlocks = (list) => list.length;
const runOk = (M, c, prog) => runLevel([{ ...levelOf(M), build: { robot: c.build } }], prog).ok;

export function islandMissions(view, { zone, species, step = 1, seed = 1 } = {}) {
  return TEMPLATE_IDS.map((tpl) => makeMission(view, { zone, species, step, seed, tpl })).filter(Boolean);
}
