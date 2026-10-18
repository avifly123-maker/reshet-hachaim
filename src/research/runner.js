// חוקרי הטבע – the rules of a mystery, shared by the game (session.js) and the solvability tests (tests/research/):
// what an idea costs, the budget and the per-idea limits, how the balance clock counts. One place, so a test that
// passes means the same thing on screen.
import { createModel, lightsOf, allGreen } from './model.js';

export function createRunner(C) {
  const model = createModel(C.model);
  const acts = [];
  let spent = 0, held = 0, solved = false;
  const ideaOf = (id) => C.ideas.find((i) => i.id === id) || null;
  const used = (id) => acts.filter((a) => a.id === id).length;
  const costOf = (idea, n) => (idea.perUnit ? idea.cost * n : idea.cost);
  const budgetLeft = () => (C.budget ?? Infinity) - spent;
  // can the child do this now? → null, or 'budget' / 'max' / 'unknown'
  function blocked(id, n) {
    const idea = ideaOf(id); if (!idea) return 'unknown';
    if (costOf(idea, n) > budgetLeft()) return 'budget';
    if (idea.max && used(id) >= idea.max) return 'max';
    return null;
  }
  // the idea's effect on the numbers (the island's look is session.js's business)
  function apply(id, n) {
    const why = blocked(id, n); if (why) return why;
    const idea = ideaOf(id);
    for (const [k, v] of Object.entries(idea.effect.add || {})) model.add(k, v * n);
    spent += costOf(idea, n);
    acts.push({ t: model.state.t, id, n });
    return null;
  }
  // advance the model; the clock runs while all three lights are green, waits (beginners, middle) or restarts
  // (advanced) when one goes red
  function step(dt, season) {
    model.run(dt, { season });
    const L = lightsOf(model, C.lights);
    if (!solved) {
      if (allGreen(L)) held += dt; else if (C.level === 'advanced') held = 0;
      if (held >= C.holdSeconds) { held = C.holdSeconds; solved = true; }
    }
    return L;
  }
  // surprises: lines the case shows once when the numbers turn ({ id, idea?, test, above? | below?, text }); an idea
  // in `idea` must have been tried first, so a surprise follows from what the child did
  const fired = new Set();
  // A surprise fires only when the number really turns: it must first be seen on the other side of its line (after its idea
  // was tried), so a value that was already past the line never claims a cause that is not true.
  const armed = new Set();
  function surprises() {
    const out = [];
    for (const S of C.surprises || []) {
      if (fired.has(S.id)) continue;
      if (S.idea && !used(S.idea)) continue;
      const v = model.get(S.test);
      const past = (S.above != null && v > S.above) || (S.below != null && v < S.below);
      if (!past) { armed.add(S.id); continue; }
      if (armed.has(S.id)) { fired.add(S.id); out.push(S); }
    }
    return out;
  }
  // was it healed some other way than the case's main fix (C.mainFix: the ideas of the usual route)?
  const otherWay = () => !!(C.mainFix && C.mainFix.length && !C.mainFix.every((id) => used(id) >= C.mainFix.filter((x) => x === id).length));
  return {
    model, acts, apply, blocked, step, used, costOf, budgetLeft, ideaOf, surprises, fired, otherWay,
    get spent() { return spent; }, get held() { return held; }, get solved() { return solved; },
  };
}
