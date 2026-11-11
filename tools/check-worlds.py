"""The built worlds under load (5.11, Avi: "for every world we build: memory leaks, weight, loading and long runs").
Opens and closes every world again and again, plays in it a little, stays in it, and measures:
  open   how long until it is ready (ms)
  load   what it holds while open: JS heap (MB), renderer geometries / textures / shader programs, page elements
  run    frames per second while it stays open (SwiftShader: compare worlds and rounds, not with a real PC)
  leak   after it closed and a full garbage collection: the growth from the end of round 1 to the end of the last round
The first round warms the caches; with three rounds or more growth is read from round 2 on, and must stay flat.

  python3 tools/check-worlds.py dist/index.html [rounds=3] [world ...]     → a table, exit code 1 if something grows or breaks

Worlds: workshop (ניצוץ's workshop: room, build table, test hall), robolab (the robot lab: home, robot workshop, garage, one
3D lesson), weekly-glitch, weekly-jar, weekly-detective, weekly-race, lab (the lab of רובו־דע), hub (the learning hub).
A new world gets a line in WORLDS: how to open it, when it is ready, what to do in it, how to close it."""
import sys, json, asyncio, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info']
SEEN = ("['stage:1','g:wktut','g:wmtut','g:wmtut:run','g:rltut','g:rltut:ev','g:gartut','g:sbtut','g:labtut','g:hubtut','g:album','g:learn',"
        "'g:lab:news','g:start:chat','g:start:howstages','g:start:settings','g:weektut','g:journey','g:nztut','g:nztut:machine','g:nztut:mixer','g:nztut:cards',"
        "'g:nztut:build','g:nztut:test','g:nztut:orders','g:dettut','g:racetut','g:gltut','g:jartut'].forEach((k) => window.__journey.markIntro(k));"
        " window.__journey.markTrained(); window.__journey.unlockAll('2580'); try { window.__weekly.setDate(new Date(2026, 10, 2, 10)); } catch (e) {} 1")
QUIET = ("(() => { try { window.__guide && window.__guide.close(); } catch (e) { } document.querySelectorAll('.bdg-pop button').forEach((b) => b.click());"
         " document.querySelectorAll('button').forEach((b) => /^דלג/.test(b.textContent.trim()) && b.click()); return 1; })()")
# every WebGL context of the page (the game's and each world's own small renderers): live buffers, textures and programs,
# counted from the calls themselves, only over contexts that are still alive (a context that was collected frees its own)
GLHOOK = """(() => { const refs = []; window.__glRefs = refs;
  const hook = (P) => { if (!P) return; const wrap = (name, key, d) => { const f = P[name]; P[name] = function (...a) { const r = f.apply(this, a); const n = this.__n || (this.__n = { buf: 0, tex: 0, prog: 0 }); if (d > 0 ? r : a[0]) n[key] += d; return r; }; };
    wrap('createBuffer', 'buf', 1); wrap('deleteBuffer', 'buf', -1); wrap('createTexture', 'tex', 1); wrap('deleteTexture', 'tex', -1); wrap('createProgram', 'prog', 1); wrap('deleteProgram', 'prog', -1); };
  hook(window.WebGLRenderingContext && WebGLRenderingContext.prototype); hook(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) { const c = gc.call(this, t, ...a); if (c && /webgl/.test(t) && !c.__reg) { c.__reg = 1; refs.push(new WeakRef(c)); } return c; };
})()"""
SAMPLE = """(() => { if (window.gc) { window.gc(); window.gc(); }
  const r = window.__app && window.__app.pipe && window.__app.pipe.renderer, m = r ? r.info.memory : {};
  return { heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1, geo: m.geometries | 0, tex: m.textures | 0,
           prog: r && r.info.programs ? r.info.programs.length : 0, nodes: document.getElementsByTagName('*').length,
           canv: document.querySelectorAll('canvas').length, ...(() => { const o = { ctx: 0, gbuf: 0, gtex: 0, gprog: 0 };
             for (const w of window.__glRefs || []) { const c = w.deref(); if (!c || c.isContextLost()) continue; o.ctx++; const n = c.__n || {}; o.gbuf += n.buf | 0; o.gtex += n.tex | 0; o.gprog += n.prog | 0; }
             return o; })() }; })()"""
FPS = "new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n * 10000 / (performance.now() - t0)) / 10); }; requestAnimationFrame(f); })"
WEEK = "(() => { document.querySelector('.st-week').click(); setTimeout(() => { const d = document.querySelector('.wkv-staff'); if (d) d.open = true; const b = document.querySelector('[data-wk=any][data-k=%s]'); b && b.click(); }, 400); return 1; })()"
# name: (open js, ready js, [steps: (js, wait s)], close js)
WORLDS = {
  'workshop': ("window.__app.bus.emit('ui:workshop'); 1", "!!document.querySelector('.ws:not([hidden]) .ws-main[data-place=room]')",
               [("window.__wsDebug.go('machine'); 1", 2), ("window.__wsDebug.go('build'); 1", 4), ("window.__wsDebug.go('test'); window.__wsDebug.runTests(['wind', 'water']); 1", 8),
                ("window.__wsDebug.go('orders'); 1", 2), ("window.__wsDebug.go('room'); 1", 2)],
               "document.querySelector('[data-wsexit]').click(); 1"),
  'robolab': ("window.__app.bus.emit('ui:robolab'); 1", "!!document.querySelector('.rl-home')",
              [("const i=document.querySelector('.rl-intro [data-iskip]'); if(i) i.click(); window.__rlDebug.workshop(); 1", 6),
               ("window.__rlDebug.garage(); 1", 6), ("window.__rlDebug.open('l1-1'); 1", 12), ("window.__rlDebug.open(); 1", 3)],
              "const b=document.querySelector('.rl-exit, .rl-home [data-exit], .rl-back'); b && b.click(); 1"),
  'weekly-glitch': (WEEK % 'glitch', "!!document.querySelector('.wg')", [("1", 6)], "const b=document.querySelector('[data-gx]'); b && b.click(); 1"),
  'weekly-jar': (WEEK % 'jar', "!!document.querySelector('.wj')", [("1", 6)], "const b=document.querySelector('[data-jx]'); b && b.click(); 1"),
  'weekly-detective': (WEEK % 'detective', "!!document.querySelector('.wd')", [("1", 6)], "const b=document.querySelector('[data-dx]'); b && b.click(); 1"),
  'weekly-race': (WEEK % 'race', "!!document.querySelector('.wr canvas')", [("1", 8)], "const b=document.querySelector('[data-rx]'); b && b.click(); 1"),
  'lab': ("window.__app.bus.emit('ui:lab'); 1", "!!document.querySelector('.lb')", [("1", 12)], "const b=document.querySelector('.lb-exit'); b && b.click(); 1"),
  'hub': ("window.__app.bus.emit('ui:learn', {}); 1", "!!document.querySelector('#wol-learn:not([hidden]) .wl-home, #wol-learn:not([hidden]) .wl-ht')",
          [("window.__app.bus.emit('ui:learn', { screen: 'album' }); 1", 3), ("window.__app.bus.emit('ui:learn', { screen: 'badges' }); 1", 3)],
          "window.__wolLearn && window.__wolLearn.close && window.__wolLearn.close(); 1"),
}
# limits for growth over the rounds (after closing) and for one stay
LIMIT = {'heap': 12, 'geo': 20, 'tex': 10, 'prog': 12, 'nodes': 250, 'canv': 1, 'ctx': 1, 'gbuf': 60, 'gtex': 20, 'gprog': 12}
OPEN_MS = 30000

async def main(build, rounds, only):
    from apphost import mount
    from playwright.async_api import async_playwright
    errs, res = [], {}
    names = only or list(WORLDS)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width': 800, 'height': 460}); pg.set_default_timeout(240000)
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.add_init_script(GLHOOK)
        await pg.goto(await mount(pg, build)); await pg.wait_for_function('window.__app && window.__journey', timeout=240000)
        await pg.wait_for_timeout(4000); await pg.evaluate(SEEN); await pg.evaluate("window.dispatchEvent(new CustomEvent('wol-journey')); 1"); await pg.evaluate(QUIET)
        async def home():
            await pg.evaluate("window.__app.bus.emit('ui:home'); 1"); await pg.wait_for_timeout(2500); await pg.evaluate(QUIET)
        base = await pg.evaluate(SAMPLE)
        for r in range(1, rounds + 1):
            for n in names:
                op, ready, steps, close = WORLDS[n]
                t0 = await pg.evaluate("performance.now()")
                await pg.evaluate(op)
                try:
                    await pg.wait_for_function(ready, timeout=OPEN_MS * 4)
                    ms = round(await pg.evaluate("performance.now()") - t0)
                except Exception as e:
                    errs.append(f'{n}: did not open ({str(e)[:80]})'); ms = -1
                await pg.wait_for_timeout(800); await pg.evaluate(QUIET)
                for js, w in steps:
                    try: await pg.evaluate(js)
                    except Exception as e: errs.append(f'{n}: step failed {str(e)[:100]}')
                    await pg.wait_for_timeout(int(w * 1000)); await pg.evaluate(QUIET)
                fps = await pg.evaluate(FPS)
                held = await pg.evaluate(SAMPLE)
                await pg.evaluate(close); await pg.wait_for_timeout(1200); await home()
                after = await pg.evaluate(SAMPLE)
                R = res.setdefault(n, {'open': [], 'fps': [], 'held': [], 'after': []})
                R['open'].append(ms); R['fps'].append(fps); R['held'].append(held); R['after'].append(after)
                print(f'round {r} {n:17s} open {ms:6d} ms  fps {fps:5.1f}  held heap {held["heap"]:4d} MB gl {held["ctx"]} ctx {held["gbuf"]:5d} buf {held["gtex"]:4d} tex  '
                      f'closed heap {after["heap"]:4d} gl {after["ctx"]} ctx {after["gbuf"]:5d} buf {after["gtex"]:4d} tex nodes {after["nodes"]:5d}', flush=True)
        await b.close()
    bad = []
    print('\nworld              open ms (worst)  fps (min)  weight while open (heap MB / gl buffers / gl textures over the start screen)   growth after closing (round %d → %d)' % (2 if rounds > 2 else 1, rounds))
    for n, R in res.items():
        b0 = R['after'][1] if len(R['after']) > 2 else R['after'][0]   # round 1 warms every world's caches (the hub keeps its page, packs load)
        g = {k: R['after'][-1][k] - b0[k] for k in LIMIT}
        w = {k: R['held'][-1][k] - base[k] for k in ('heap', 'gbuf', 'gtex')}
        over = [k for k in LIMIT if g[k] > LIMIT[k]]
        slow = max(R['open']) > OPEN_MS or min(R['open']) < 0
        if over or slow: bad.append(n)
        print(f'{n:17s}  {max(R["open"]):8d}        {min(R["fps"]):5.1f}      {w["heap"]:4d} / {w["gbuf"]:5d} / {w["gtex"]:4d}'
              f'                                {json.dumps(g)}{"  <-- " + ",".join(over + (["slow open"] if slow else [])) if over or slow else ""}')
    print('page errors:', len(errs), errs[:4])
    print('WORLDS: FAIL ' + ','.join(bad) if bad or errs else 'WORLDS: OK')
    sys.exit(1 if bad or errs else 0)

if __name__ == '__main__':
    a = sys.argv[1:]
    asyncio.run(main(a[0], int(a[1]) if len(a) > 1 and a[1].isdigit() else 3, [x for x in a[2:] if not x.isdigit()] if len(a) > 2 else None))
