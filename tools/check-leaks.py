"""Memory over a long session (1.4.3 closing): open and close the islands, the robot lab and the lab of רובו־דע again
and again, and see that nothing piles up. After every close the page runs a full garbage collection and records the
JS heap and what the renderer still holds (geometries, textures, shader programs). The first round warms the caches
(shared models, shaders); from the second round on the numbers should stay flat.

  python3 tools/check-leaks.py dist/index-torah.html [rounds]      → prints a table, exit code 1 if something grows

A round: amazon, grove, reef, desert, savanna (each ~20 s on the island), the robot lab's home with one 3D lesson,
the lab. Growth is judged from the end of round 1 to the end of the last round."""
import sys, json, asyncio, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc']
SEEN = ("['stage:1','g:wktut','g:wmtut','g:wmtut:run','g:rltut','g:rltut:ev','g:gartut','g:sbtut','g:svfilm','g:deserttut','g:savtut','g:labtut','g:hubtut',"
        "'g:lab:news','g:start:chat','g:start:howstages'].forEach((k) => window.__journey.markIntro(k)); window.__journey.markTrained(); window.__journey.unlockAll('2580'); 1")
QUIET = "(() => { try { window.__guide && window.__guide.close(); } catch (e) { } document.querySelectorAll('button').forEach((b) => /^דלג/.test(b.textContent.trim()) && b.click()); return 1; })()"
SAMPLE = """(() => { if (window.gc) { window.gc(); window.gc(); }
  const r = window.__app && window.__app.pipe && window.__app.pipe.renderer, m = r ? r.info.memory : {};
  return { heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1, geo: m.geometries | 0, tex: m.textures | 0,
           prog: r && r.info.programs ? r.info.programs.length : 0, nodes: document.getElementsByTagName('*').length }; })()"""

async def main(build, rounds):
    from apphost import mount
    from playwright.async_api import async_playwright
    rows, errs = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width': 800, 'height': 460}); pg.set_default_timeout(240000)
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(await mount(pg, build)); await pg.wait_for_function('window.__app && window.__journey', timeout=240000)
        await pg.wait_for_timeout(4000); await pg.evaluate(SEEN); await pg.evaluate(QUIET)
        async def home(): await pg.evaluate("window.__app.bus.emit('ui:home'); 1"); await pg.wait_for_timeout(5000); await pg.evaluate(QUIET)
        for r in range(1, rounds + 1):
            for z in ['amazon', 'grove', 'reef', 'desert', 'savanna']:
                await pg.evaluate("window.__app.bus.emit('start:biome', { id: '%s' }); 1" % z)
                await pg.wait_for_function('window.__game && window.__game.debug', timeout=240000)
                await pg.wait_for_timeout(20000); await pg.evaluate(QUIET)
                await pg.evaluate("window.__game && window.__game.debug && window.__game.debug.ff && window.__game.debug.ff(60); 1")
                await pg.wait_for_timeout(2000)
                await home()
            # the robot lab: its home and one lesson in 3D, then back to the start
            await pg.evaluate("window.__app.bus.emit('ui:robolab'); 1"); await pg.wait_for_function("!!document.querySelector('.rl-home')", timeout=120000)
            await pg.wait_for_timeout(2000); await pg.evaluate("const i=document.querySelector('.rl-intro [data-iskip]'); if(i) i.click(); 1"); await pg.evaluate(QUIET)
            await pg.evaluate("window.__rlDebug.open('l1-1'); 1"); await pg.wait_for_function('window.__rlDebug.in3d()', timeout=240000)
            await pg.wait_for_timeout(6000); await pg.evaluate(QUIET)
            await pg.evaluate("window.__rlDebug.open(); 1"); await pg.wait_for_timeout(3000)
            await pg.evaluate("const b=document.querySelector('.rl-exit, .rl-home [data-exit], .rl-back'); b && b.click(); 1"); await home()
            # the lab of רובו־דע
            await pg.evaluate("window.__app.openLab(); 1"); await pg.wait_for_timeout(15000); await pg.evaluate(QUIET)
            await pg.evaluate("const b=document.querySelector('.lb-exit'); b && b.click(); 1"); await home()
            s = await pg.evaluate(SAMPLE); s['round'] = r; rows.append(s); print(json.dumps(s), flush=True)
        await b.close()
    print('page errors:', len(errs), errs[:3])
    a, z = rows[0], rows[-1]
    grow = {k: z[k] - a[k] for k in ('heap', 'geo', 'tex', 'prog', 'nodes')}
    print('growth from round 1 to round %d:' % rounds, json.dumps(grow))
    # allowance: a few MB of heap and a handful of objects for caches that fill on demand
    bad = grow['heap'] > 25 or grow['geo'] > 40 or grow['tex'] > 15 or grow['nodes'] > 400 or errs
    print('LEAKS: FAIL' if bad else 'LEAKS: OK')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 3))
