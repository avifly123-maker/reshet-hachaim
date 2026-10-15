# Usage: python3 tools/shot.py page.html out.png [wait_seconds] [width] [height] [js_to_eval_before_shot]
# Renders a page headlessly WITH WebGL (SwiftShader) and saves a screenshot; prints console errors.
import sys, asyncio, pathlib
from playwright.async_api import async_playwright
page_path = pathlib.Path(sys.argv[1]).resolve()
out = sys.argv[2]
wait = float(sys.argv[3]) if len(sys.argv) > 3 else 4
w = int(sys.argv[4]) if len(sys.argv) > 4 else 1280
h = int(sys.argv[5]) if len(sys.argv) > 5 else 800
js = sys.argv[6] if len(sys.argv) > 6 else None
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h})
        msgs = []
        pg.on('console', lambda m: msgs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: msgs.append(f'[pageerror] {e}'))
        await pg.goto(page_path.as_uri())
        await pg.wait_for_timeout(int(wait * 1000))
        if js:
            r = await pg.evaluate(js)
            if r is not None: print('eval:', r)
            await pg.wait_for_timeout(1500)
        await pg.screenshot(path=out)
        for m in msgs[-40:]: print(m)
        await b.close()
asyncio.run(main())
