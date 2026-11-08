// The code's boundaries, checked (1.4.4 stability set; docs/RULES-CODE.md). Part of tools/check-all.sh.
//   node tools/check-bounds.mjs
// It reads every import in src/ and fails when:
//   1. a pure engine (numbers only, tested in node) reaches three.js, the DOM layer (src/ui, src/learn) or a screen,
//      directly or through what it imports;
//   2. the core (src/core) has an import cycle;
//   3. one area reaches into another area's inner files: a file of src/<area>/ may import another area only through
//      that area's entry (index.js) or a module the other area lists as shared (SHARED below). The few crossings that
//      were there before this check are listed in KNOWN with a reason; the list may only shrink;
//   4. product code reads a window.__* name it did not set itself (the game's parts meet through core/services.js;
//      window.__* is for the headless tests), except the switches only a test sets (TEST_SWITCHES).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.m?js$/.test(e.name)) files.push(p); } })(SRC);

// ── the import graph (static and dynamic imports, re-exports)
const graph = new Map();
const RX = /(?:^|[\s;])(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8'), out = new Set();
  for (const m of s.matchAll(RX)) {
    const spec = m[1] || m[2] || m[3];
    if (spec.startsWith('.')) { let t = path.resolve(path.dirname(f), spec); if (!fs.existsSync(t) && fs.existsSync(t + '.js')) t += '.js'; if (fs.existsSync(t) && fs.statSync(t).isDirectory()) t = path.join(t, 'index.js'); out.add(t); }
    else out.add(spec);   // a package: 'three', 'three/addons/…', '@three.ez/…'
  }
  graph.set(f, out);
}
const errors = [];
const err = (m) => errors.push(m);

// ── 1. pure engines
const PURE = [
  'src/robolab/engine/', 'src/research/model.js', 'src/research/runner.js', 'src/sim/species.js',
  'src/game/savanna/grass.js', 'src/game/savanna/herds.js', 'src/game/savanna/pop.js', 'src/game/savanna/seasons.js', 'src/game/savanna/stability.js',
  'src/weekly/jar-model.js', 'src/weekly/race-model.js', 'src/workshop/engine.js', 'src/core/storage-keys.js',
];
const isPure = (f) => PURE.some((p) => (p.endsWith('/') ? rel(f).startsWith(p) : rel(f) === p));
const FORBIDDEN = (dep) => (typeof dep === 'string' && !path.isAbsolute(dep) ? /^three|^@three/.test(dep) : /^src\/(ui|learn)\//.test(rel(dep)));
for (const f of files.filter(isPure)) {
  const seen = new Set(), stack = [[f, [rel(f)]]];
  while (stack.length) {
    const [cur, trail] = stack.pop();
    for (const d of graph.get(cur) || []) {
      if (FORBIDDEN(d)) { err(`pure engine ${rel(f)} reaches ${path.isAbsolute(d) ? rel(d) : d} (${trail.join(' → ')})`); continue; }
      if (path.isAbsolute(d) && !seen.has(d) && graph.has(d)) { seen.add(d); stack.push([d, [...trail, rel(d)]]); }
    }
  }
  const s = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
  if (/\bdocument\.|\bwindow\./.test(s)) err(`pure engine ${rel(f)} touches document or window`);
}

// ── 2. no cycles in the core
const core = files.filter((f) => rel(f).startsWith('src/core/'));
{
  const state = new Map();
  const visit = (f, trail) => {
    state.set(f, 1);
    for (const d of graph.get(f) || []) {
      if (!path.isAbsolute(d) || !rel(d).startsWith('src/core/')) continue;
      if (state.get(d) === 1) err(`import cycle in the core: ${[...trail, rel(d)].join(' → ')}`);
      else if (!state.get(d)) visit(d, [...trail, rel(d)]);
    }
    state.set(f, 2);
  };
  for (const f of core) if (!state.get(f)) visit(f, [rel(f)]);
}

// ── 3. areas meet through their entries
const AREAS = ['robolab', 'workshop', 'weekly', 'lab', 'research', 'learn'];
const areaOf = (f) => { const m = rel(f).match(/^src\/([^/]+)\//); return m && AREAS.includes(m[1]) ? m[1] : null; };
// modules an area offers to the others on purpose (besides its index.js)
const SHARED = new Set([
  'src/robolab/progress.js', 'src/lab/progress.js', 'src/research/progress.js', 'src/workshop/progress.js',
  'src/robolab/engine/world.js', 'src/robolab/engine/run.js', 'src/robolab/engine/blocks.js', 'src/robolab/engine/plan.js', 'src/robolab/engine/level.js', 'src/robolab/engine/build.js',
  'src/robolab/three/parts3d.js', 'src/workshop/nitzotz.js', 'src/research/cases/index.js',
  'src/robolab/ui/editor.js',          // the block editor: the weekly robot race reuses it
  'src/robolab/three/field-cells.js',  // mud, hills, logs and water cells: also the weekly race's lane
  'src/robolab/three/models.js',       // the simple tool and item models: also the weekly race
  'src/lab/clue-cases.js',             // the clue facts: the weekly detective reuses them
  'src/lab/room-view.js',              // the panorama room view: the inventors' workshop room too
]);
// crossings that were there when this check was written (8.11.2026); fix one when its code is touched, then remove it here
const KNOWN = new Set([]);
for (const f of files) {
  const a = areaOf(f); if (!a) continue;
  for (const d of graph.get(f) || []) {
    if (!path.isAbsolute(d)) continue;
    const b = areaOf(d); if (!b || b === a) continue;
    const r = rel(d);
    if (r === `src/${b}/index.js` || SHARED.has(r)) continue;
    const k = `${rel(f)} > ${r}`;
    if (!KNOWN.has(k)) err(`${rel(f)} reaches into ${b}: ${r} (use src/${b}/index.js or list it in SHARED on purpose)`);
  }
}

// ── 4. window.__* is for the tests
const TEST_SWITCHES = new Set(['__filmWatch', '__noRender', '__tech', '__timeScale', '__failLoadAt']);
// debug lines that read another module's test handle on purpose (headless tools only)
const DEBUG_READS = new Set(['src/robolab/index.js:__game']);
const setters = new Map();
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/window\.(__[A-Za-z_]+)\s*=(?!=)/g)) { if (!setters.has(m[1])) setters.set(m[1], new Set()); setters.get(m[1]).add(f); }
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    for (const m of code.matchAll(/window\.(__[A-Za-z_]+)(\s*=(?!=))?/g)) {
      const n = m[1];
      if (m[2] || TEST_SWITCHES.has(n) || DEBUG_READS.has(`${rel(f)}:${n}`)) continue;
      if ((setters.get(n) || new Set()).has(f)) continue;   // its own handle
      err(`${rel(f)}:${i + 1}: reads window.${n} (set in ${[...(setters.get(n) || [])].map(rel).join(', ') || 'nowhere'}); use core/services.js`);
    }
  });
}

if (errors.length) { for (const e of errors) console.log('ERROR ' + e); console.log(`check-bounds: ${errors.length} error(s)`); process.exit(1); }
console.log(`check-bounds: OK (${files.length} files; ${files.filter(isPure).length} pure engines; core without cycles; areas meet through their entries; window.__* only for tests)`);
