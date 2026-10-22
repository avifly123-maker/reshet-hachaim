// חוטים (1.3.2): the threads engine against a made-up player, in node (no browser).
// Usage: node tests/threads/engine.mjs   (exit code 1 on a failed check)
const store = {};
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, get length() { return Object.keys(store).length; }, key: (i) => Object.keys(store)[i] };
globalThis.CustomEvent = class { constructor(n, o) { this.type = n; this.detail = o && o.detail; } };
const evs = {}; globalThis.addEventListener = (n, f) => (evs[n] = evs[n] || []).push(f); globalThis.dispatchEvent = (e) => (evs[e.type] || []).forEach((f) => f(e));
globalThis.document = { querySelector: () => null, documentElement: { classList: { add() { }, remove() { } } } };

const T = await import('../../src/core/threads.js');
const P = await import('../../src/core/profiles.js');
const J = await import('../../src/core/journey.js');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const S = (b, v) => localStorage.setItem(P.key(b), JSON.stringify(v));

ok(T.active().length === 0, 'a new player has no open thread');
S('web-of-life-lab', { inventions: { sharkskin: 1 }, solved: { hover: 1, lamp: 1, solar: 1 }, seen: { fireflylamp: true }, think: { fair: { done: 1 } } });
S('web-of-life-research', { cases: { 'mice-owl': { stars: [1, 1, 0] }, 'the-trap': { stars: [1] } } });
S('web-of-life-grove', { done: [...Array(21)].map((_, i) => 'g' + (i + 1)), discovered: ['owl>spinymouse>eats'], placed: ['owl', 'firefly'] });
S('web-of-life-save-grove', { events: [{ id: 'g_fire', r: 1 }] });
S('web-of-life-photos', [{ sp: 'firefly', zone: 'grove', img: 'x' }]);
S('web-of-life-cards', { games: { inventors: { robots: [{ name: 'רובי', mission: 'reef', at: 1 }] } } });
T.reload();
const exp = T.active().map((t) => t.id);
ok(J.playMode() === 'experience' && exp.length === 5 && !exp.includes('solar'), 'the experience mode opens only its simple threads: ' + exp);
J.setPlayMode('full'); T.reload();
const full = T.active().map((t) => t.id);
for (const id of ['solar', 'notebook', 'mice-owl', 'the-trap', 'fair', 'link-atlas', 'ev-fire', 'zone-grove']) ok(full.includes(id), 'full mode opens ' + id);
ok(!full.includes('grip') && !full.includes('quadrat'), 'nothing opens without its reason');
const d = T.toolBoost('drone', 'reef'); ok(d.speed === 1.25 && d.hover === true, 'drone on the reef: ' + JSON.stringify(d));
ok(!('speed' in T.toolBoost('drone', 'grove')), 'the shark-skin coat is for the reef only');
ok(T.toolBoost('camera', 'grove').night === 1.5 && T.toolBoost('watergen', 'amazon').output === 1.3, 'camera and water machine');
ok(Object.keys(T.toolBoost('rescue', 'grove')).length === 0, 'no boost = {}');
const ch = T.choicesFor('g_acorns'); ok(ch.length === 1 && ch[0].id === 'owlboxes' && ch[0].effects.length === 2, 'a new choice in the year of acorns');
ok(T.choicesFor('g_fire').length === 0, 'summer-fire not solved: no fire choice');
const rv = T.reveals('grove'); ok(rv.links.includes('owl>spinymouse>eats') && rv.marks[0].tool === 'nestbox', 'the owl link is shown');
ok(T.measures().has('notebook') && T.measures().has('experiment') && !T.measures().has('quadrat'), 'measures');
T.noteUsed('quadrat'); ok(T.measures().has('quadrat'), 'the quadrat after it was used in a mystery');
ok(T.sampleMarked('fireflylamp') && T.questionMarked('owl') && T.problemWaiting('quiet'), 'marks in the lab');
ok(T.recommended().some((r) => r.caseId === 'summer-fire'), 'a fire lived → "אש בקיץ" recommended');
ok(T.stamps('firefly', 'grove').join() === 'seen,photo,scope', 'firefly stamps: ' + T.stamps('firefly', 'grove'));
ok(T.stamps('owl', 'grove').includes('case') && T.stamps('reefshark', 'reef').includes('invent'), 'case and invent stamps');
ok(T.robotsOut().length === 1, 'the robot goes out');
const f = T.fresh(); ok(f.length === 3, 'the first round announces three: ' + f.length);
T.markShown(f[0].id); ok(T.fresh().length === 2, 'markShown');
// a forest started anew: what opened stays open
S('web-of-life-save-grove', { events: [] }); T.reload(); ok(T.has('ev-fire'), 'an open thread stays open');
if (bad) { console.log(`${bad} check(s) failed`); process.exit(1); }
console.log('threads engine OK');
