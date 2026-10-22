#!/usr/bin/env python3
"""Regression screenshots (1.3.2): the same screens before and after a change that must not change behaviour
(splitting a big file, a clean-up). Each scenario runs in a fresh page, closes רובו־דע's bubbles, takes its shots
and records page errors.

  python3 tools/regress.py dist/index.html shots/regress/before [--size 800x460] [--only name,name]
  python3 tools/regress.py --compare shots/regress/before shots/regress/after

--compare prints the mean pixel difference of every pair and writes side-by-side pictures of the ones that moved
(start screen and hub screens are still pictures, so they should match closely; forests move, so only a large
difference there means something)."""
import sys, json, asyncio, pathlib, argparse
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

QUIET = """(() => { try { window.__guide && window.__guide.close(); } catch (e) { }
  document.querySelectorAll('#rguide button').forEach((b) => /דלג/.test(b.textContent) && b.click());
  document.querySelectorAll('.coach button, .howto button').forEach((b) => /דלג|הבנתי|סגירה/.test(b.textContent) && b.click()); return 1; })()"""
OPEN = "window.__journey && window.__journey.unlockAll('2580'); 1"

# name: list of steps (js / wait / shot / click selector); every scenario starts on a fresh start screen
SCEN = {
  'start': [{'wait': 6}, {'q': 1}, {'shot': 'start'}],
  'settings': [{'wait': 6}, {'q': 1}, {'click': '.st-gear'}, {'wait': 1.5}, {'q': 1}, {'shot': 'settings'}],
  'players': [{'js': "const P = window.__profiles; ['יוסי', 'מוישי', 'שמוליק'].forEach((n) => P.add(n)); location.reload(); 1"}, {'wait': 10}, {'q': 1},
              {'click': '.st-who'}, {'wait': 1.5}, {'q': 1}, {'shot': 'players'}],
  'map': [{'wait': 6}, {'q': 1}, {'click': '.st-jbar'}, {'wait': 2}, {'q': 1}, {'shot': 'map'}],
  'tabs': [{'wait': 6}, {'js': OPEN}, {'wait': 2.5}, {'q': 1}, {'js': "document.querySelectorAll('[data-tab]').forEach((b) => b.dataset.tab === 'sci' && b.click()); 1"}, {'wait': 1}, {'q': 1}, {'shot': 'tab-sci'},
           {'js': "document.querySelectorAll('[data-tab]').forEach((b) => b.dataset.tab === 'learn' && b.click()); 1"}, {'wait': 1}, {'q': 1}, {'shot': 'tab-learn'}],
  'hub': [{'wait': 4}, {'js': OPEN}, {'js': "window.__noRender = true; window.__app.bus.emit('ui:learn', {}); 1"}, {'wait': 12}, {'q': 1}, {'wait': 1}, {'q': 1}, {'shot': 'hub-home'},
          {'js': "window.__wolLearn._go('album'); 1"}, {'wait': 2}, {'q': 1}, {'shot': 'hub-album'},
          {'js': "window.__wolLearn._go('setup'); 1"}, {'wait': 2}, {'q': 1}, {'shot': 'hub-quiz'},
          {'js': "window.__wolLearn._go('badges'); 1"}, {'wait': 2}, {'q': 1}, {'shot': 'hub-badges'},
          {'js': "window.__wolLearn._go('frames'); 1"}, {'wait': 2}, {'q': 1}, {'shot': 'hub-frames'},
          {'js': "window.__wolLearn._go('webpuzzle'); 1"}, {'wait': 3}, {'q': 1}, {'shot': 'hub-webpuzzle'},
          {'js': "window.__wolLearn._go('keepforest'); 1"}, {'wait': 3}, {'q': 1}, {'shot': 'hub-keepforest'},
          {'js': "window.__wolLearn._go('inventors'); 1"}, {'wait': 4}, {'q': 1}, {'shot': 'hub-inventors'},
          {'js': "window.__ivDebug && window.__ivDebug.view('robots'); 1"}, {'wait': 2}, {'q': 1}, {'shot': 'hub-robots'}],
  'research': [{'wait': 4}, {'js': OPEN}, {'js': "window.__app.bus.emit('ui:research'); 1"}, {'wait': 10}, {'q': 1}, {'wait': 1}, {'q': 1}, {'shot': 'research'}],
  'lab': [{'wait': 4}, {'js': OPEN}, {'js': "window.__app.openLab(); 1"}, {'wait': 20}, {'q': 1}, {'wait': 2}, {'q': 1}, {'shot': 'lab'}],
  'amazon': [{'wait': 4}, {'js': "window.__app.bus.emit('start:biome', { id: 'amazon' }); 1"}, {'until': 'window.__game && window.__game.debug'}, {'wait': 18}, {'q': 1}, {'wait': 1}, {'q': 1}, {'shot': 'amazon'},
             {'js': "document.querySelector('[data-a=\"menu\"], .km-btn, .tb-menu') && document.querySelector('[data-a=\"menu\"], .km-btn, .tb-menu').click(); 1"}, {'wait': 1}, {'shot': 'amazon-menu'}],
  'grove': [{'wait': 4}, {'js': "window.__app.bus.emit('start:biome', { id: 'grove' }); 1"}, {'until': 'window.__game && window.__game.debug'}, {'wait': 18}, {'q': 1}, {'wait': 1}, {'q': 1}, {'shot': 'grove'}],
  'reef': [{'wait': 4}, {'js': OPEN}, {'js': "window.__app.bus.emit('start:biome', { id: 'reef' }); 1"}, {'until': 'window.__game && window.__game.debug'}, {'wait': 18}, {'q': 1}, {'wait': 1}, {'q': 1}, {'shot': 'reef'}],
  'kids': [{'wait': 4}, {'js': "document.querySelector(\"[data-mode='kids']\") && document.querySelector(\"[data-mode='kids']\").click(); 1"}, {'wait': 3}, {'q': 1}, {'shot': 'kids-start'},
           {'js': "window.__app.bus.emit('start:biome', { id: 'grove' }); 1"}, {'until': 'window.__game && window.__game.debug'}, {'wait': 18}, {'q': 1}, {'wait': 1}, {'q': 1}, {'shot': 'kids-grove'}],
}

async def run(build, out, size, only):
    from apphost import mount
    from playwright.async_api import async_playwright
    W, H = map(int, size.split('x')); out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    report = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        for name, steps in SCEN.items():
            if only and name not in only: continue
            pg = await b.new_page(viewport={'width': W, 'height': H}); pg.set_default_timeout(180000)
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
            pg.on('console', lambda m: m.type == 'error' and errs.append('console: ' + m.text[:300]))
            try:
                await pg.goto(await mount(pg, build)); await pg.wait_for_function('window.__app && window.__journey', timeout=240000)
                for s in steps:
                    if 'wait' in s: await pg.wait_for_timeout(int(s['wait'] * 1000))
                    if 'q' in s: await pg.evaluate(QUIET)
                    if 'js' in s: await pg.evaluate(s['js'])
                    if 'until' in s: await pg.wait_for_function(s['until'], timeout=240000)
                    if 'click' in s:
                        box = await pg.evaluate('''(q) => { const e = [...document.querySelectorAll(q)].find((x) => x.offsetParent !== null || x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }''', s['click'])
                        if box: await pg.mouse.click(*box)
                        else: errs.append('no element ' + s['click'])
                    if 'shot' in s: await pg.screenshot(path=str(out / (s['shot'] + '.png')))
            except Exception as e: errs.append('runner: ' + str(e)[:300])
            report[name] = errs; print(name, 'errors:', len(errs), (errs[:2] if errs else ''), flush=True)
            await pg.close()
        await b.close()
    (out / 'errors.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))

def compare(a, b):
    from PIL import Image, ImageChops
    import numpy as np
    a, b = pathlib.Path(a), pathlib.Path(b); moved = 0
    for pa in sorted(a.glob('*.png')):
        pb = b / pa.name
        if not pb.exists(): print(f'{pa.name:24} MISSING in {b}'); moved += 1; continue
        A = np.asarray(Image.open(pa).convert('RGB'), np.float32); B = np.asarray(Image.open(pb).convert('RGB'), np.float32)
        if A.shape != B.shape: print(f'{pa.name:24} SIZE {A.shape} vs {B.shape}'); moved += 1; continue
        d = np.abs(A - B).mean() / 255 * 100
        live = pa.stem in ('amazon', 'grove', 'reef', 'kids-grove', 'amazon-menu', 'lab')
        flag = d > (6 if live else 1.0)
        print(f'{pa.name:24} {d:5.2f}%{"  <-- look" if flag else ""}')
        if flag:
            moved += 1; c = Image.new('RGB', (A.shape[1] * 2 + 8, A.shape[0]), 'red'); c.paste(Image.open(pa).convert('RGB'), (0, 0)); c.paste(Image.open(pb).convert('RGB'), (A.shape[1] + 8, 0))
            c.save(b / ('diff-' + pa.name))
    ea = json.loads((a / 'errors.json').read_text()) if (a / 'errors.json').exists() else {}
    eb = json.loads((b / 'errors.json').read_text()) if (b / 'errors.json').exists() else {}
    for k in sorted(set(ea) | set(eb)):
        if len(eb.get(k, [])) > len(ea.get(k, [])): print('MORE ERRORS in', k, eb[k][:3]); moved += 1
    print('to look at:', moved)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('a'); ap.add_argument('b'); ap.add_argument('--compare', action='store_true')
    ap.add_argument('--size', default='800x460'); ap.add_argument('--only', default='')
    o = ap.parse_args()
    if o.compare: compare(o.a, o.b)
    else: asyncio.run(run(o.a, o.b, o.size, set(filter(None, o.only.split(',')))))
