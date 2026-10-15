# Scripted headless session: python3 tools/play.py page.html|app-folder script.json [w h]
# An app folder (node build.mjs --desktop) is served as the desktop app serves it – see tools/apphost.py.
# script: [{"js": "..."} | {"wait": seconds} | {"shot": "out.png"} | {"click": [x,y]} ]
import sys, json, asyncio, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from apphost import mount
from playwright.async_api import async_playwright
target = sys.argv[1]; steps = json.load(open(sys.argv[2]))
W = int(sys.argv[3]) if len(sys.argv) > 3 else 1280; H = int(sys.argv[4]) if len(sys.argv) > 4 else 800
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': W, 'height': H})
        msgs = []
        pg.on('console', lambda m: msgs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: msgs.append(f'[pageerror] {e}'))
        await pg.goto(await mount(pg, target))
        for s in steps:
            if 'js' in s:
                try:
                    r = await pg.evaluate(s['js'])
                    if r is not None: print('eval:', str(r)[:2000])
                except Exception as e: print('JS ERROR', e)
            if 'wait' in s: await pg.wait_for_timeout(int(s['wait']*1000))
            if 'shot' in s: await pg.screenshot(path=s['shot']); print('shot', s['shot'])
            if 'click' in s: await pg.mouse.click(*s['click'])
            if 'drag' in s:
                (x0,y0,x1,y1) = s['drag']; await pg.mouse.move(x0,y0); await pg.mouse.down(); await pg.mouse.move((x0+x1)/2,(y0+y1)/2, steps=5); await pg.mouse.move(x1,y1, steps=8); await pg.wait_for_timeout(300); await pg.mouse.up()
        seen=set()
        for m in msgs:
            if m in seen: continue
            seen.add(m); print(m[:400])
        await b.close()
asyncio.run(main())
