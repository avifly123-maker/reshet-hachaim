# Scripted headless session: python3 tools/play.py page.html|app-folder script.json [w h]
# An app folder (node build.mjs --desktop) is served as the desktop app serves it – see tools/apphost.py.
# script: [{"js": "..."} | {"wait": seconds} | {"until": "js condition", "timeout": s} | {"shot": "out.png"} | {"click": [x,y]} | {"move": [x,y]} | {"key": "Tab"} | {"clickSel": "css"} | {"hoverSel": "css"}
#          | {"drag": [x0,y0,x1,y1]} | {"dragJs": "js → [x0,y0,x1,y1]", "hold": s, "shotMid": "out.png"} ]
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
        pg.set_default_timeout(120000)   # a busy machine draws SwiftShader frames slowly: give screenshots time
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
            if 'until' in s:   # wait for a condition instead of a fixed time (a busy machine loads forests slowly)
                try: await pg.wait_for_function(s['until'], timeout=int(s.get('timeout', 240) * 1000))
                except Exception as e: print('UNTIL TIMEOUT', s['until'][:120])
            if 'shot' in s: await pg.screenshot(path=s['shot']); print('shot', s['shot'])
            if 'click' in s: await pg.mouse.click(*s['click'])
            if 'move' in s: await pg.mouse.move(*s['move'], steps=4)   # hover
            if 'clickSel' in s or 'hoverSel' in s:   # a real mouse click (or hover) on the centre of the first visible element
                sel = s.get('clickSel') or s.get('hoverSel')
                box = await pg.evaluate('''(q) => { const e = [...document.querySelectorAll(q)].find((x) => x.offsetParent !== null || x.getClientRects().length); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }''', sel)
                if box is None: print('NO ELEMENT', sel)
                elif 'clickSel' in s: await pg.mouse.click(*box)
                else: await pg.mouse.move(*box, steps=4)
            if 'key' in s: await pg.keyboard.press(s['key'])
            if 'drag' in s or 'dragJs' in s:   # dragJs: JS returning [x0,y0,x1,y1]; shotMid: a screenshot just before the button is let go
                pts = s['drag'] if 'drag' in s else await pg.evaluate(s['dragJs'])
                if not pts: print('NO DRAG POINTS'); continue
                (x0,y0,x1,y1) = pts; await pg.mouse.move(x0,y0); await pg.mouse.down(); await pg.mouse.move((x0+x1)/2,(y0+y1)/2, steps=5); await pg.mouse.move(x1,y1, steps=8); await pg.wait_for_timeout(int(s.get('hold', 0.3)*1000))
                if 'shotMid' in s: await pg.screenshot(path=s['shotMid']); print('shot', s['shotMid'])
                await pg.mouse.up()
        seen=set()
        for m in msgs:
            if m in seen: continue
            seen.add(m); print(m[:400])
        await b.close()
asyncio.run(main())
