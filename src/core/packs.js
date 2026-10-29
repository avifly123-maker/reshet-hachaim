// Packs: the parts of the game that only some screens need, loaded on demand.
//   zone packs  – 'amazon', 'grove', 'reef', 'desert' (src/packs/<id>.js): a zone's content + species models
//   'hub'       – the learning hub and its card games (src/packs/hub.js)
//   'lab'       – the lab of רובו־דע in the science centre (src/packs/lab.js)
//   'game'      – the building game itself (src/packs/game.js: island, simulation, tools), loaded with the first zone
// Desktop build (node build.mjs --desktop): every pack is its own ES module file next to core.js and import() fetches
// it over the app:// protocol the first time it is asked for. Single-file build (node build.mjs): esbuild inlines the
// packs into the one HTML file and import() just runs the inlined module – the same code path, resolved at once.
//
// loadPack(name) → Promise<module>   (cached: the second call returns the same promise)
// loadedPack(name) → module | null   (synchronous peek, for callers that can skip a frame of waiting)
// releasePack(name)                  the pack's screen closed: drop the pack's own caches (its module stays loaded –
//                                    code is small; the big parts, geometry and pictures, are what gets freed)
// preloadPack(name, delay)           load in idle time, never throws (not used yet: e.g. warm the next zone of a
//                                    tour; zone packs load in ~20–60 ms, so the game simply loads them on the click)

const LOADERS = {
  amazon: () => import('../packs/amazon.js'),
  grove: () => import('../packs/grove.js'),
  reef: () => import('../packs/reef.js'),
  desert: () => import('../packs/desert.js'),   // 1.4
  game: () => import('../packs/game.js'),   // the building game (island, simulation, tools): with the first zone
  hub: () => import('../packs/hub.js'),
  lab: () => import('../packs/lab.js'),
  research: () => import('../packs/research.js'),
  robolab: () => import('../packs/robolab.js'),   // מעבדת הרובוטים (1.4.1)   // the words of a running mystery (חוקרי הטבע)
};

const pending = new Map();   // name → Promise<module>
const loaded = new Map();    // name → module

export function loadPack(name) {
  if (pending.has(name)) return pending.get(name);
  const load = LOADERS[name];
  if (!load) return Promise.reject(new Error('unknown pack: ' + name));
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const p = load().then((mod) => {
    loaded.set(name, mod);
    try { (window.__packTimes = window.__packTimes || {})[name] = Math.round(performance.now() - t0); } catch (e) { /* no window */ }
    return mod;
  }, (err) => {
    pending.delete(name);   // a failed load (e.g. a missing file) may be retried
    throw err;
  });
  pending.set(name, p);
  return p;
}

export const loadedPack = (name) => loaded.get(name) || null;

export function releasePack(name) {
  const mod = loaded.get(name);
  if (mod && typeof mod.release === 'function') { try { mod.release(); } catch (e) { console.warn('pack release failed', name, e); } }
}

export function preloadPack(name, delay = 0) {
  const go = () => { loadPack(name).catch(() => { /* loaded again (and reported) when really needed */ }); };
  const idle = () => (typeof requestIdleCallback === 'function' ? requestIdleCallback(go, { timeout: 4000 }) : setTimeout(go, 200));
  if (delay > 0) setTimeout(idle, delay); else idle();
}
