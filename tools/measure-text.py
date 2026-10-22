# How much does the forest say? (1.3.2, Avi: "too many things happen with a lot of text")
# Plays a zone headless for a stretch of game time with a simple bot player and counts every message that reaches the
# screen (toasts, link discoveries, mission banners, events and their outcomes, dialogs, the end-of-day prompt, the coach,
# the "איך משחקים" cards, the bubbles of רובו־דע, the injured-animal bar) and its words.
#   python3 tools/measure-text.py dist/index.html [seconds=3600] [zones=amazon,grove,reef] [modes=full,experience] [out.json]
# Prints one line per run: messages and words, in total and per game minute. Every run is a new player (fresh storage).
# The bot: every 20 game seconds it closes what is open (events take their first choice, as debug.auto() does), places the
# species the current mission asks for, reveals a link the mission asks for, sometimes places another unlocked species,
# and gets 40 life points a minute (a patient child who lets the forest earn).
import sys, json, asyncio, pathlib, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from apphost import mount
from playwright.async_api import async_playwright

target = sys.argv[1]
SECS = int(sys.argv[2]) if len(sys.argv) > 2 else 3600
ZONES = (sys.argv[3] if len(sys.argv) > 3 else 'amazon,grove,reef').split(',')
MODES = (sys.argv[4] if len(sys.argv) > 4 else 'full,experience').split(',')
OUT = sys.argv[5] if len(sys.argv) > 5 else None

SETUP = r'''(mode) => {
  const A = window.__app, J = A.journey, ui = A.ui;
  try { J.setPlayMode(mode); } catch (e) { }
  const C = window.__count = { n: 0, w: 0, kinds: {} };
  const words = (s) => String(s || '').replace(/[֑-ׇ]/g, '').split(/\s+/).filter((x) => /[א-תA-Za-z0-9]/.test(x)).length;
  const add = (kind, text) => { const w = words(text); C.n++; C.w += w; const k = C.kinds[kind] || (C.kinds[kind] = { n: 0, w: 0 }); k.n++; k.w += w; };
  window.__countAdd = add;
  const wrap = (name, f) => { const o = ui[name]; if (!o) return; ui[name] = function (...a) { try { f(...a); } catch (e) { } return o.apply(this, a); }; };
  wrap('toast', (t) => add('toast', t));
  wrap('discovery', (d) => add('discovery', 'גילית קשר חדש! ' + d.fromName + ' ' + (d.typeName || '') + ' ' + d.toName + ' ' + (d.text || '')));
  wrap('missionDone', (m) => add('mission', 'משימה הושלמה! ' + (m.title || '') + ' ' + (m.note || '') + ' ' + (m.rewardText || '')));
  wrap('showEvent', (e) => add('event', e.title + ' ' + e.text + ' ' + (e.choices || []).map((c) => c.label).join(' ')));
  wrap('showOutcome', (o) => add('outcome', o.title + ' ' + o.text));
  wrap('showDialog', (d) => add('dialog', d.title + ' ' + d.text + ' ' + (d.buttons || []).map((b) => b.label).join(' ')));
  wrap('coach', (c) => { if (c) add('coach', c.text); });
  const seenInjury = new Set();
  wrap('setInjured', (list) => { for (const x of list || []) if (!seenInjury.has(x.uid)) { seenInjury.add(x.uid); add('injured', x.name + ' ' + x.cause); } });
  const G = window.__guide;
  if (G) { const o = G.say; G.say = function (lines, opts = {}) { try { if (!(opts.key && !opts.force && J.introSeen(opts.key))) for (const l of lines || []) add('robo', J.playMode() === 'kids' ? (l.k || l.f) : (l.f || l.k)); } catch (e) { } return o.call(this, lines, opts); }; }
  new MutationObserver((recs) => { for (const r of recs) for (const n of r.addedNodes) if (n.classList && n.classList.contains('rep-prompt')) add('report', n.textContent); })
    .observe(document.getElementById('ui'), { childList: true, subtree: true });
  return 'ok';
}'''

STEP = r'''(stepSecs) => {
  const W = window.__game; if (!W) return { gone: true };
  const add = window.__countAdd;
  // what a child closes after reading: the "איך משחקים" cards (count their words), the coach, the guide's bubbles
  for (let k = 0; k < 8; k++) {
    const hb = document.querySelector('#howto'); if (!hb) break;
    add('howto', (hb.querySelector('.howto-txt') || hb).textContent);
    const nx = hb.querySelector('.howto-next') || hb.querySelector('[data-h]'); if (nx) nx.click(); else break;
  }
  try { window.__app.bus.emit('coach:skip'); } catch (e) { }
  try { window.__guide && window.__guide.close(); } catch (e) { }
  const d = W.debug; d.auto();
  // the bot player
  const M = W.missions && W.missions.current && W.missions.current();
  const g = M && M.goal || {};
  const rnd = () => { const a = Math.random() * 6.283, r = 6 + Math.random() * 22; return [Math.cos(a) * r, Math.sin(a) * r]; };
  W.points += 40 * stepSecs / 60;
  const tryPlace = (id) => { for (let i = 0; i < 6; i++) { const [x, z] = rnd(); const r = d.place(id, x, z); if (Array.isArray(r)) return true; } return false; };
  if (g.species && W.unlocked.has(g.species)) tryPlace(g.species);
  if (g.type === 'link') try { window.__app.bus.emit('relation:reveal', { from: g.from, to: g.to, type: (W.reg.edges.find((e) => (e.from === g.from && e.to === g.to) || (e.from === g.to && e.to === g.from)) || {}).type }); } catch (e) { }
  if (g.type === 'speciesAlive' || g.type === 'chain' || g.type === 'discover' || Math.random() < 0.35) {
    const un = W.biome.species.filter((s) => W.unlocked.has(s.id) && s.cost <= W.points && W.countAlive(s.id) < 3);
    if (un.length) tryPlace(un[(Math.random() * un.length) | 0].id);
  }
  const r = d.ff(stepSecs, 0.25);
  if (String(r).startsWith('modal')) d.auto();
  return { t: W.simT, done: W.missions.doneCount, n: window.__count.n, w: window.__count.w };
}'''

async def run(pw, zone, mode):
    b = await pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = await b.new_context(viewport={'width': 800, 'height': 460})
    pg = await ctx.new_page(); pg.set_default_timeout(300000)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(await mount(pg, target))
    await pg.wait_for_function('() => window.__app && window.__app.bus', timeout=120000)
    await pg.wait_for_timeout(1500)
    await pg.evaluate("() => { try { window.__guide && window.__guide.close(); } catch (e) { } }")
    await pg.evaluate(SETUP, mode)
    await pg.evaluate(f"() => window.__app.bus.emit('start:biome', {{ id: '{zone}' }})")
    await pg.wait_for_function('() => window.__game && window.__game.debug && window.__game.simT > 0.5', timeout=300000)
    await pg.wait_for_timeout(2500)   # the welcome cards / guide appear after ~1 s
    t0 = time.time(); last = None
    while True:
        r = await pg.evaluate(STEP, 20)
        if r.get('gone'): break
        last = r
        if r['t'] >= SECS: break
    kinds = await pg.evaluate('() => window.__count.kinds')
    await b.close()
    mins = max(1e-6, last['t'] / 60)
    res = {'zone': zone, 'mode': mode, 'minutes': round(mins, 1), 'missions': last['done'], 'messages': last['n'], 'words': last['w'],
           'msgPerMin': round(last['n'] / mins, 2), 'wordsPerMin': round(last['w'] / mins, 1), 'kinds': kinds, 'errors': errs[:5], 'realSecs': round(time.time() - t0)}
    print(json.dumps(res, ensure_ascii=False), flush=True)
    return res

async def main():
    out = []
    async with async_playwright() as pw:
        for z in ZONES:
            for m in MODES:
                out.append(await run(pw, z, m))
    if OUT: pathlib.Path(OUT).write_text(json.dumps(out, ensure_ascii=False, indent=1))

asyncio.run(main())
