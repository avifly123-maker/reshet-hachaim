#!/usr/bin/env python3
"""Save-compatibility guard. python3 tools/check-old-saves.py <build.html | desktop app folder> [--make]
--make : play a little (both biomes, cards, a 2nd player) on the CURRENT build and store all localStorage keys in
         tests/fixtures/saves-<version>.json (do this once per released version).
default: load every fixture into a fresh page of the given build and check the forests, players and albums restore."""
import sys, json, glob, asyncio, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from apphost import mount
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
build = sys.argv[1]; make = '--make' in sys.argv
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

async def page(p):
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width': 1280, 'height': 800})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); return b, pg, errs

async def do_make(p):
    b, pg, errs = await page(p)
    url = await mount(pg, build); await pg.goto(url); await pg.wait_for_timeout(2500)
    for biome, ids in (('amazon', ['kapok', 'fig', 'heliconia', 'toucan', 'agouti']), ('grove', ['oak', 'carob', 'sage', 'jay', 'hedgehog'])):
        await pg.evaluate(f"window.__app.bus.emit('start:biome',{{id:'{biome}'}})"); await pg.wait_for_timeout(9000)
        await pg.wait_for_function("window.__game && window.__game.debug", timeout=180000); await pg.wait_for_timeout(2000)
        await pg.evaluate("""(ids) => { const W = window.__game, d = W.debug; d.unlockAll(); W.points = 1e5;
            document.querySelectorAll('.coach button').forEach(b => /דלג/.test(b.textContent) && b.click());
            for (const id of ids) for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, r = 8 + Math.random() * 22; if (typeof d.place(id, Math.cos(a) * r, Math.sin(a) * r) === 'object') break; }
            for (let k = 0; k < 6; k++) { d.auto(); d.ff(10); } }""", ids)
        await pg.evaluate("window.__app.bus.emit('ui:save')"); await pg.wait_for_timeout(800)
        await pg.evaluate("window.__app.bus.emit('ui:home'); window.__app.bus.emit('ui:exit')"); await pg.wait_for_timeout(1500)
    for _ in range(24):   # 1.3.1: the hub loads when opened (ask again until the start screen takes it)
        await pg.evaluate("window.__app.bus.emit('ui:learn', {})"); await pg.wait_for_timeout(10000)
        if await pg.evaluate("!!(window.__wolLearn && window.__wolLearn._collect)"): break
    await pg.evaluate("window.__wolLearn.open(); window.__wolLearn._collect(25); window.__wolLearn.close()")
    await pg.evaluate("const P = window.__profiles; const q = P.add('יוסף', 'fox'); P.setCurrent(P.list()[0].id)")
    keys = await pg.evaluate("Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('web-of-life')).map(k => [k, localStorage.getItem(k)]))")
    ver = json.load(open(ROOT / 'desktop' / 'package.json'))['version']
    out = ROOT / 'tests' / 'fixtures' / f'saves-{ver}.json'
    json.dump({'version': ver, 'keys': keys}, open(out, 'w'), ensure_ascii=False, indent=1)
    print('wrote', out, len(keys), 'keys; errors:', errs[:3]); await b.close()

async def do_check(p):
    bad = 0
    for f in sorted(glob.glob(str(ROOT / 'tests' / 'fixtures' / 'saves-*.json'))):
        fx = json.load(open(f)); b, pg, errs = await page(p)
        await pg.goto(await mount(pg, build)); await pg.wait_for_timeout(1500)
        await pg.evaluate("(k) => { localStorage.clear(); for (const [a, v] of Object.entries(k)) localStorage.setItem(a, v); location.reload(); }", fx['keys'])
        await pg.wait_for_timeout(3000)
        await pg.wait_for_function("window.__profiles && window.__app", timeout=60000)   # the bigger 1.3 page can take longer to start
        players = await pg.evaluate("window.__profiles.list().length")
        res = {'players': players}
        for biome in ('amazon', 'grove'):
            saved = await pg.evaluate(f"!!localStorage.getItem(window.__profiles.key('web-of-life-save-{biome}'))")
            await pg.evaluate(f"window.__app.bus.emit('start:biome',{{id:'{biome}'}})"); await pg.wait_for_timeout(2500)
            # accept "continue the saved forest" if the game asks
            await pg.evaluate("""() => { const b = [...document.querySelectorAll('button')].find(x => /להמשיך|המשך/.test(x.textContent)); if (b) b.click(); }""")
            await pg.wait_for_timeout(9000)
            n = await pg.evaluate("window.__game ? window.__game.plants.length + window.__game.animals.length : -1")
            res[biome] = {'had_save': saved, 'entities': n}
            await pg.evaluate("window.__app.bus.emit('ui:home'); window.__app.bus.emit('ui:exit')"); await pg.wait_for_timeout(1500)
        await pg.evaluate("window.__app.bus.emit('ui:learn', {})"); await pg.wait_for_function("window.__wolLearn && window.__wolLearn._state", timeout=240000)
        cards = await pg.evaluate("window.__wolLearn.open(); const n = Object.keys(window.__wolLearn._state().owned).length; window.__wolLearn.close(); n")
        res['cards'] = cards; res['errors'] = errs[:3]
        ok = players >= 2 and cards >= 20 and not errs and all((not res[b]['had_save']) or res[b]['entities'] > 10 for b in ('amazon', 'grove'))
        bad += not ok; print(('OK  ' if ok else 'FAIL'), pathlib.Path(f).name, json.dumps(res, ensure_ascii=False))
        await b.close()
    sys.exit(1 if bad else 0)

async def main():
    async with async_playwright() as p:
        await (do_make(p) if make else do_check(p))
asyncio.run(main())
