// The tray / HUD cards: species (sorted by kind, layer and cost), strong corals waiting in the nursery, the tools;
// a tool that just opened is presented by רובו־דע (W.roboTool).
// Gives ctx: refreshTray.
// Takes from ctx: the names destructured at the top of createTray.
// Shared state it reads or changes: ctx.tools.
import { CARD_ART } from '../../data/card-art.js';

export function createTray(ctx) {
  const { biome, missions, W, thumbs, reg, ui, robo } = ctx;

  // ─────────────────────────────────────────── tray / HUD
  function trayCards() {
    const order = { emergent: 0, canopy: 1, understory: 2, floor: 3, water: 4, air: 5 };
    const list = biome.species.slice().sort((a, b) => (a.isPlant === b.isPlant ? 0 : a.isPlant ? -1 : 1) || (order[a.layer] ?? 9) - (order[b.layer] ?? 9) || a.cost - b.cost);
    return list.map(sp => {
      const m = missions.missions.find(mm => (mm.reward?.unlock || []).includes(sp.id));
      return {
        id: sp.id, name: sp.name, kind: sp.kind, tab: sp.showAs === 'animal' ? 'animals' : undefined, layer: sp.layer, layerName: sp.layerName, cost: sp.cost,
        locked: !W.unlocked.has(sp.id), lockText: m ? `משימה: ${m.title}` : 'נפתח באירוע',
        canAfford: W.points >= sp.cost, alive: W.countAlive(sp.id), thumb: thumbs[sp.id] || null, color: sp.color,
        isNew: W.unlocked.has(sp.id) && sp.unlock !== 'start' && !W.seenNew.has(sp.id),
      };
    });
  }
  // strong young corals waiting in the coral nurseries: one card per kind, before the corals planted from the tray
  function nurseryCards() {
    if (!ctx.tools || W.biomeId !== 'reef') return [];
    return [...ctx.tools.nurseryStock()].map(([sid, n]) => {
      const sp = reg.byId.get(sid);
      return { id: 'nursery:' + sid, name: sp.name + ' חזק', kind: sp.kind, layer: 'nursery', layerName: 'מהמשתלה', cost: 0, locked: false, canAfford: true,
        alive: n, thumb: thumbs[sid] || CARD_ART[sid] || null, color: '#e889a8', isNew: !!W.nurseryNew, nursery: true };
    });
  }
  let toolLocks = null;   // which tools were still locked: a tool that opens now is presented by רובו־דע
  function refreshTray() {
    if (W.research) return;
    const sp = trayCards(), ns = nurseryCards(), tc = ctx.tools && !W.training ? ctx.tools.cards() : [];   // the training field: plants and animals only
    if (ctx.tools) {
      const now = {}; for (const c of tc) now[c.id] = c.locked;
      const opened = toolLocks ? tc.filter(c => toolLocks[c.id] && !c.locked) : [];
      if (opened.length && opened.length <= 2 && W.missionsOn) for (const c of opened) W.roboTool(c.id.slice(5));   // many at once (the rescue robot opened them all): no parade
      toolLocks = now;
    }
    ui.setTray(ctx.tools ? [...ns, ...sp, ...tc] : sp);
  }
  // רובו־דע presents a tool once (src/data/guide/zone.js 'zone:tool:<id>'; the reef's own machines have their own lines)
  const REEF_TOOL = { drone: 'rov', camera: 'uwcam', weather: 'sensor' };
  W.roboTool = (id) => robo('zone:tool:' + (W.biomeId === 'reef' && REEF_TOOL[id] ? REEF_TOOL[id] : id));
  return { refreshTray };
}
