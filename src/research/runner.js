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
  return {
    model, acts, apply, blocked, step, used, costOf, budgetLeft, ideaOf,
    get spent() { return spent; }, get held() { return held; }, get solved() { return solved; },
  };
}
