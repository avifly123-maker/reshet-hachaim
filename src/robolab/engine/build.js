// סדנת הרובוט (1.4.3, set 2): what a robot built from parts can do. Pure numbers, no DOM, no three.js: the workshop
// screen, the run engine (world.js, only for a level that comes with a build) and the tests all read it.
//   checkBuild(build) → { ok, problems: [{ code, part?, n? }] }     the building rules (data/robolab/workshop.js RULES)
//   statsOf(build)    → the robot's numbers (below), or null when the build breaks a rule
//   partsFor(what)    → the parts that give a block or a sensor (for "מה קרה?": "you need a claw or a short arm")
//   partsForGround(g), FORCE_PARTS, PRECISION_PARTS → the parts that help on a ground, with a slope, on a narrow log
// build = { chassis, wheels, drive, gear?, motors: [extra], tools: [on the tool points], mechs: [], sensors: [], extras: [] }
//
// The numbers, kept simple enough to explain to a child:
//   mass      grams, everything together
//   speed     how far one move takes it: 1 = one cell a step; below 0.6 a move takes 2 steps, below 0.3 it takes 3
//   force     strength for climbing and pushing (drive motor power × gear ÷ weight)
//   grip      by ground ('ground', 'sand', 'mud', 'slope', 'narrow'): 0..1; below 0.5 the robot is stuck there
//   precision how exact a turn is (0..1): a narrow log or bridge needs 0.7
//   battery   what it starts with; drain per move and per tool action; recharge (solar) every 5 steps in daylight
//   lift, push, carry, reach   what its tools and mechanisms can do; seeds and water: how many uses its tanks hold
//   blocks / sees / hears      the blocks it may run, the conditions it can test, the events it can hear
import { CHASSIS, PARTS, BASE_BLOCKS, BASE_SEES, BASE_HEARS, RULES } from '../../data/robolab/workshop.js';

const P = (id) => PARTS[id] || null;
const list = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);

export function checkBuild(b) {
  const out = [];
  const add = (code, extra) => out.push({ code, ...extra });
  if (!b || !CHASSIS[b.chassis]) { add('chassis'); return { ok: false, problems: out }; }
  const ch = CHASSIS[b.chassis];
  const all = [b.wheels, b.drive, b.gear, ...list(b.motors), ...list(b.tools), ...list(b.mechs), ...list(b.sensors), ...list(b.extras)].filter(Boolean);
  for (const id of all) if (!P(id)) add('unknown', { part: id });
  if (!P(b.wheels) || P(b.wheels).set !== 'wheels') add('wheels');
  else if (ch.onlyWheels && !ch.onlyWheels.includes(b.wheels)) add('chwheels', { part: b.wheels });   // the tall robot stands on tracks only
  const isMotor = (id) => !!(P(id) && P(id).fam === 'motor' && P(id).rpm);
  if (!isMotor(b.drive)) add('drive');
  if (b.gear && !(P(b.gear) && P(b.gear).gear)) add('gear', { part: b.gear });
  const motors = 2 + list(b.motors).length + (list(b.extras).some((id) => P(id) && P(id).motorized) ? 1 : 0);
  if (motors > RULES.motors) add('motors', { n: motors });
  for (const id of list(b.motors)) if (!isMotor(id)) add('notmotor', { part: id });
  if (list(b.sensors).length > RULES.sensors) add('sensors', { n: list(b.sensors).length });
  for (const id of list(b.sensors)) if (!(P(id) && P(id).fam === 'sensor')) add('notsensor', { part: id });
  if (list(b.tools).length > ch.toolPoints) add('toolpoints', { n: list(b.tools).length });
  for (const id of list(b.tools)) if (!(P(id) && (P(id).fam === 'tool' || P(id).fam === 'team'))) add('nottool', { part: id });
  for (const id of list(b.mechs)) if (!(P(id) && P(id).mech)) add('notmech', { part: id });
  // a tool that moves needs a motor of its own (beyond the two drive motors); a mechanism runs on its tool's motor,
  // except the crane, which winds its cable with a motor of its own
  const needMotor = list(b.tools).filter((id) => P(id) && P(id).motor).length + list(b.mechs).filter((id) => P(id) && P(id).motor).length;
  if (needMotor > list(b.motors).length) add('toolmotor', { n: needMotor - list(b.motors).length });
  const size = all.filter((id) => id !== b.drive).reduce((s, id) => s + ((P(id) && P(id).size) || 0), 0);   // the drive motors sit inside the chassis
  if (size > ch.room) add('room', { n: size - ch.room });
  return { ok: !out.length, problems: out };
}

export function statsOf(b) {
  if (!checkBuild(b).ok) return null;
  const ch = CHASSIS[b.chassis], W = P(b.wheels), D = P(b.drive), G = b.gear ? P(b.gear) : null;
  const parts = [W, D, G, ...list(b.motors).map(P), ...list(b.tools).map(P), ...list(b.mechs).map(P), ...list(b.sensors).map(P), ...list(b.extras).map(P)].filter(Boolean);
  const mass = ch.mass + parts.reduce((s, p) => s + (p.mass || 0), 0) + (D.mass || 0);   // D is in parts once: + once more for the second drive motor
  const heavy = Math.sqrt(600 / mass);                                      // a heavier robot is slower and weaker
  const speed = +(D.rpm * (G ? G.speedK : 1) * W.r * heavy * 0.55).toFixed(2);
  const force = +(D.power * (G ? G.forceK : 1) * heavy * 0.5).toFixed(2);
  const steady = parts.some((p) => p.steady);
  const grip = {};
  for (const k of ['ground', 'sand', 'mud', 'slope', 'narrow']) grip[k] = +Math.min(1, W.grip[k] + (steady && (k === 'slope' || k === 'mud') ? 0.15 : 0)).toFixed(2);
  const precision = +Math.min(1, W.turn + (ch.precision || 0) + parts.reduce((s, p) => s + (p.precision || 0), 0)).toFixed(2);
  const liftK = Math.max(1, ...list(b.mechs).map((id) => P(id).liftK || 1));
  const tools = list(b.tools).map(P);
  const lift = +(Math.max(ch.lift || 0, ...tools.map((t) => t.lift || 0)) * liftK).toFixed(2);   // a chassis with arms (the tall robot) lifts by itself
  const push = Math.max(0, ...tools.map((t) => t.push || 0)) * (force >= 1 ? 1 : 0.5);
  const carry = tools.reduce((s, t) => s + (t.carry || 0), 0);
  const reach = Math.max(ch.reach || 0, ...tools.map((t) => t.reach || 0), ...list(b.mechs).map((id) => P(id).reach || 0));
  const blocks = new Set(BASE_BLOCKS), sees = new Set(BASE_SEES), hears = new Set(BASE_HEARS);
  for (const x of ch.gives || []) blocks.add(x);
  for (const p of parts) { for (const x of p.gives || []) blocks.add(x); for (const x of p.sees || []) sees.add(x); for (const x of p.hears || []) hears.add(x); }
  const moveDrain = 1 + (mass > 900 ? 1 : 0) + (W.drain || 0);
  return {
    mass, speed, force, grip, precision, lift, push, carry, reach,
    stepsPerMove: speed >= 0.6 ? 1 : speed >= 0.3 ? 2 : 3,
    battery: ch.battery, moveDrain, actDrain: 1, recharge: parts.some((p) => p.recharge) ? 1 : 0,
    seeds: tools.reduce((s, t) => s + (t.seeds || 0), 0), water: tools.reduce((s, t) => s + (t.water || 0), 0),
    gentle: !!ch.gentle || tools.some((t) => t.gentle), floats: parts.some((p) => p.floats), swims: parts.some((p) => p.floats) && parts.some((p) => p.swims),
    blocks, sees, hears,
  };
}

// which parts would give this block or this sensor (for the explanation after a run, and for the workshop's hints)
export function partsFor(what) {
  return Object.entries(PARTS).filter(([, p]) => (p.gives || []).includes(what) || (p.sees || []).includes(what) || (p.hears || []).includes(what)).map(([id]) => id);
}

// which parts help on a kind of ground (wheels that hold there), with strength (motors and gears) or with precision
export function partsForGround(g) { return Object.entries(PARTS).filter(([, p]) => p.set === 'wheels' && p.grip[g] >= 0.5).map(([id]) => id); }
export const FORCE_PARTS = Object.entries(PARTS).filter(([, p]) => p.forceK > 1 || p.power >= 3).map(([id]) => id);
export const PRECISION_PARTS = Object.entries(PARTS).filter(([, p]) => p.precision || (p.set === 'wheels' && p.turn >= 0.7)).map(([id]) => id);

// 1.4.3 set 3 (Avi: "fit to the zones: is there shallow water, for example"): where a part helps and where it does not,
// worked out from its numbers and the ground of each zone (data/robolab/workshop-text.js ZONE_GROUND), never by hand.
//   helpsOn(id) → the grounds the part helps on ('sand', 'mud', 'slope', 'narrow', 'shallow')
//   fitOf(id)   → { helps: [{ zone, ground: [...] }], stuck: [{ zone, ground: [...] }] }  (stuck: wheels that do not hold there)
export function helpsOn(id) {
  const p = PARTS[id]; if (!p) return [];
  if (p.set === 'wheels') return ['sand', 'mud', 'slope', 'narrow'].filter((g) => p.grip[g] >= 0.75);   // holds well there (0.5 only just)
  const out = [];
  if (p.floats || p.swims) out.push('shallow');
  if (p.steady) out.push('slope', 'mud');
  if (FORCE_PARTS.includes(id)) out.push('slope');
  if (PRECISION_PARTS.includes(id)) out.push('narrow');
  return [...new Set(out)];
}
export function fitOf(id, zoneGround) {
  const p = PARTS[id], helps = helpsOn(id), out = { helps: [], stuck: [] };
  for (const [zone, Z] of Object.entries(zoneGround)) {
    const h = Z.ground.filter((g) => helps.includes(g));
    if (h.length) out.helps.push({ zone, ground: h });
    if (p && p.set === 'wheels') { const s = Z.ground.filter((g) => g !== 'shallow' && p.grip[g] < 0.5); if (s.length) out.stuck.push({ zone, ground: s }); }
  }
  return out;
}
