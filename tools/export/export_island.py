# python3 tools/export/export_island.py <exp.html> <biome> <out.glb>  — plant a showcase island and save it as binary glTF
import sys, json, asyncio, base64, pathlib
from playwright.async_api import async_playwright
page_path, biome, out = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3]
show = open(pathlib.Path(__file__).with_name('showcase.js')).read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        pg.on('pageerror', lambda e: print('[pageerror]', e))
        await pg.goto(page_path.as_uri()); await pg.wait_for_timeout(2000)
        await pg.evaluate(f"window.__app.bus.emit('start:biome',{{id:'{biome}'}})"); await pg.wait_for_timeout(10000)
        fix = "const W=window.__game; W.rain=0; W.rainTarget=0; W.rainT=1e9; W.points=1e6; W.drought=0; W.droughtT=0; W.heat=0;"
        await pg.evaluate("document.querySelectorAll('.coach button').forEach(b=>/דלג/.test(b.textContent)&&b.click()); " + fix)
        print(await pg.evaluate(show))
        await pg.evaluate(fix + " if (W.season) { W.season='spring'; W.seasonFrac=0.4; } W.dayFrac=0.38; W.speed=1;")
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__game.speed=0")
        r = await pg.evaluate("window.__exportIsland()")
        print(json.dumps(r)[:400])
        data = base64.b64decode(await pg.evaluate("window.__islandB64"))
        open(out, 'wb').write(data); print('saved', out, len(data))
        await b.close()
asyncio.run(main())
