# Renders the guide portraits of רובו־דע: python3 tools/robo-portrait/render.py  → art/robo/<frame>.png (transparent)
import asyncio, base64, json, pathlib, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'art' / 'robo'; OUT.mkdir(parents=True, exist_ok=True)
tmp = pathlib.Path('/tmp/claude-0/robo'); tmp.mkdir(parents=True, exist_ok=True)
subprocess.run(['npx', 'esbuild', str(ROOT / 'tools/robo-portrait/entry.js'), '--bundle', '--format=esm', '--outfile=' + str(tmp / 'bundle.js'), '--log-level=warning'], check=True, cwd=ROOT)
(tmp / 'index.html').write_text('<!doctype html><html><body style="margin:0;background:transparent"><script type="module" src="bundle.js"></script></body></html>')
FRAMES = {
  'idle-happy': ({}, {'expr': 'happy'}), 'idle-normal': ({}, {'expr': 'normal'}), 'idle-talk1': ({}, {'expr': 'normal', 'talk': 0.45}),
  'idle-talk2': ({}, {'expr': 'normal', 'talk': 1.0}), 'idle-blink': ({}, {'expr': 'normal', 'blink': 1}), 'idle-wow': ({'headNod': -0.05}, {'expr': 'wow'}),
  'idle-curious': ({'headTilt': 0.12}, {'expr': 'curious'}), 'idle-oops': ({'headTilt': -0.06}, {'expr': 'oops'}),
  'wave-happy': ({'wave': 0.3}, {'expr': 'happy'}), 'wave-talk1': ({'wave': 0.7}, {'expr': 'normal', 'talk': 0.5}),
  'wave-talk2': ({'wave': 0.3}, {'expr': 'normal', 'talk': 1.0}), 'wave-blink': ({'wave': 0.7}, {'expr': 'happy', 'blink': 1}),
}
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'])
    pg = await b.new_page(viewport={'width': 480, 'height': 576})
    pg.on('console', lambda m: print('[console]', m.text))
    pg.on('pageerror', lambda e: print('[pageerror]', e))
    await pg.goto('file://' + str(tmp / 'index.html'))
    await pg.wait_for_function('window.__ready === true', timeout=60000)
    print('box', await pg.evaluate('JSON.stringify(window.__box)'))
    for name, (pose, face) in FRAMES.items():
      url = await pg.evaluate('([p, f]) => window.renderFrame(p, f)', [pose, face])
      (OUT / (name + '.png')).write_bytes(base64.b64decode(url.split(',', 1)[1])); print('frame', name)
    await b.close()
asyncio.run(main())
