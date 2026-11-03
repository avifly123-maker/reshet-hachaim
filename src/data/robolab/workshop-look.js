// How a workshop build looks (1.4.3, set 3e): the Blender chassis and the part meshes on its sockets
// (tools/blender/robolab_wk.py → src/data/robolab-parts.js). A catalogue part with no entry has no picture of its own
// (motors, gears, levers: they are inside the body). Each entry: [mesh, ...sockets in order of preference]; a part
// takes the first free socket, so two front tools never sit in one place (the second one is simply not drawn).
export const WK_BASE = { ch_s: 'wk_s', ch_m: 'wk_m', ch_l: 'wk_l' };
// the wheel set goes on all four wheel sockets; tracks and floats on both sides, the right one a mirror of the left
// (a turned part would put the raised sprocket of the tracks in front: Avi, 3.11)
export const WK_WHEELS = { wheel_s: 'wh_s', wheel_m: 'wh_m', wheel_l: 'wh_l', wheel_wide: 'wh_wide', omni: 'omni' };
export const WK_SIDES = { tracks: ['tracks', 'tracks_r'], float: ['float', 'float_r'] };
export const WK_LOOK = {
  // tools
  pusher: ['pusher', 'front'], fork: ['fork', 'front'], scoop: ['scoop', 'front'], brush: ['brush', 'front'],
  claw: ['claw2', 'arm'], arm_short: ['claw2', 'arm'], arm_long: ['arm_long', 'arm'], arm_fold: ['arm_fold', 'arm'],
  crane: ['crane', 'arm'], hook: ['hook', 'arm'], net: ['net', 'arm'],
  seedbox: ['seedbox', 'back', 'deck'], sprayer: ['sprayer', 'back', 'deck'], cammount: ['cammount', 'head', 'top'],
  // sensors
  color: ['color', 'nose'], touch: ['touch', 'nose'], distance: ['distance', 'eyes'], camera: ['cammount', 'head', 'top'],
  gyro: ['gyro', 'deck', 'top'], light: ['light', 'top', 'deck'], humidity: ['humidity', 'probe'],
  // extras and the team
  caster: ['caster', 'under'], ballast: ['ballast', 'belly'], solar: ['solar', 'back', 'deck'], beacon: ['beacon', 'top', 'deck'],
  link: ['antenna', 'top', 'deck'], dronepad: ['drone_pad', 'back', 'deck'], propeller: ['propeller', 'rear'],
};
export function wkLook(b) {
  const parts = {};
  if (WK_SIDES[b.wheels]) { [parts.tl, parts.tr] = WK_SIDES[b.wheels]; }
  else if (WK_WHEELS[b.wheels]) for (const s of ['wfl', 'wfr', 'wbl', 'wbr']) parts[s] = WK_WHEELS[b.wheels];
  for (const id of [...(b.tools || []), ...(b.mechs || []), ...(b.sensors || []), ...(b.extras || [])]) {
    if (id === 'float' && !parts.tl) { [parts.tl, parts.tr] = WK_SIDES.float; continue; }
    const L = WK_LOOK[id]; if (!L) continue;
    const s = L.slice(1).find((q) => !parts[q]); if (s) parts[s] = L[0];
  }
  return { base: WK_BASE[b.chassis] || 'wk_m', parts };
}
// the sockets a part would take on this build (the glow when a part is picked in the workshop)
export function socketsOf(id, b) {
  if (WK_WHEELS[id]) return ['wfl', 'wfr', 'wbl', 'wbr'];
  if (WK_SIDES[id]) return ['tl', 'tr'];
  const L = WK_LOOK[id]; if (!L) return [];
  const used = wkLook(b).parts;
  const mine = Object.keys(used).filter((s) => used[s] === L[0]);
  return mine.length ? mine : L.slice(1, 2);
}
