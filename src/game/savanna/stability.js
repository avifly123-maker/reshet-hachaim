// 1.4.2, the savanna: the stability meter (pure numbers; Avi, 28.10: "the challenge is not to answer every event but to
// keep the system stable: that it comes back to balance after each change"). Every few seconds the game gives it the
// things that matter (grass, grazers, trees, predators, the kinds alive). It keeps a slow average of each one (the
// island's own normal) and a quick one (now). Far from the normal, or something gone to nothing, lowers the meter; coming
// back raises it again. One simple number 0..1 for the child's bar, and `recovered` counts the comebacks (missions).
//   createStability() → { sample(v), value, recovered, low, save(), load(o) }
//   v = { grass: 0..1, grazers: n, trees: n, predators: n, kinds: n }
import { clamp } from '../../core/util.js';

const KEYS = ['grass', 'grazers', 'trees', 'predators'];
export function createStability() {
  const slow = {}, fast = {};
  let value = 0.6, recovered = 0, low = false, n = 0;
  function sample(v) {
    n++;
    let dev = 0, gone = 0, w = 0;
    for (const k of KEYS) {
      const x = Math.max(0, v[k] || 0);
      slow[k] = slow[k] == null ? x : slow[k] + (x - slow[k]) * 0.02;   // the island's normal: a slow average (≈ a year)
      fast[k] = fast[k] == null ? x : fast[k] + (x - fast[k]) * 0.25;   // now
      const base = Math.max(k === 'grass' ? 0.2 : 1, slow[k]);
      const wk = k === 'grass' ? 2 : 1; w += wk;
      dev += wk * Math.min(1, Math.abs(fast[k] - slow[k]) / base);
      if (slow[k] > (k === 'grass' ? 0.15 : 0.9) && fast[k] < slow[k] * 0.15) gone += wk;   // something important went to almost nothing
    }
    dev /= w; gone /= w;
    const rich = clamp((v.kinds || 0) / 10);   // a richer web holds better
    const grassOK = clamp(((fast.grass ?? 0) - 0.12) / 0.3);
    const target = clamp((1 - dev * 1.6 - gone * 0.8) * (0.7 + 0.3 * rich) * (0.4 + 0.6 * grassOK));
    value += (target - value) * (n < 6 ? 0.5 : 0.08);
    if (value < 0.35) low = true;
    else if (low && value > 0.55) { low = false; recovered++; }
    return value;
  }
  return {
    sample,
    get value() { return value; }, get recovered() { return recovered; }, get low() { return low; },
    save: () => ({ v: +value.toFixed(3), r: recovered, l: low ? 1 : 0, s: { ...slow } }),
    load(o) { if (!o) return; value = o.v ?? value; recovered = o.r || 0; low = !!o.l; Object.assign(slow, o.s || {}); Object.assign(fast, o.s || {}); n = 10; },
  };
}
