// A lesson or puzzle (src/data/robolab/) as a level the engine runs: the parts the engine needs, nothing else.
export function levelOf(L) {
  return { map: L.map, items: L.items || [], home: L.home || null, tools: L.tools0 || {}, events: L.events || null, goal: L.goal, par: L.par || 0, maxTicks: L.maxTicks || 0 };
}
// A level may come in a few variants (L.variants = [{ items?, map?, tools0?, home? }]): the same program must work in
// all of them, so a fixed list of steps is not enough and the child needs a sensor and an "if" (chapter 4 on).
export function levelsOf(L) {
  if (!L.variants || !L.variants.length) return [levelOf(L)];
  return L.variants.map((v) => levelOf({ ...L, ...v }));
}
// the blocks a program uses (for the test that a solution sticks to the lesson's palette)
export function usedBlocks(program) {
  const s = new Set();
  const walk = (list) => { for (const nd of list || []) { s.add(nd.b); walk(nd.body); walk(nd.then); walk(nd.else); } };
  for (const k of ['robot', 'drone', 'sub']) walk(program[k]);
  for (const k in (program.defs || {})) walk(program.defs[k]);
  for (const h of program.on || []) walk(h.body);
  return s;
}
