#!/usr/bin/env python3
"""Record the six stage scenes of מסע החוקר (src/ui/stage-scenes.js) as a film, frame by frame (so a slow headless
renderer still gives smooth motion).  python3 tools/record-scenes.py dist/index.html out.mp4 [--kids] [--fps 24] [--size 960x540] [--scenes 1,2]"""
import sys, asyncio, pathlib, subprocess, shutil, argparse
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from apphost import mount
from playwright.async_api import async_playwright
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
DUR = {1: 6.6, 2: 6.6, 3: 6.6, 4: 6.8, 5: 6.8, 6: 6.8}

async def main(o):
    W, H = map(int, o.size.split('x'))
    tmp = pathlib.Path(o.out).with_suffix('.frames'); shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)
    k = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width': W, 'height': H})
        pg.on('pageerror', lambda e: print('page error', e))
        await pg.goto(await mount(pg, o.build)); await pg.wait_for_function('window.__app && window.__stageScene', timeout=120000)
        if o.kids: await pg.evaluate("localStorage.setItem(window.__profiles.key('web-of-life-mode'), 'kids')")
        await pg.wait_for_timeout(1500)
        for n in [int(x) for x in o.scenes.split(',')]:
            await pg.evaluate("window.__stageScene.stop()"); await pg.wait_for_timeout(1200)   # a new player's own stage moment may be playing
            await pg.evaluate("window.__guide && window.__guide.close(); 1"); await pg.wait_for_timeout(300)
            await pg.evaluate(f"window.__stageDone = false; window.__stageScene({n}, {{ at: 0 }}).then(() => window.__stageDone = true); 1")
            await pg.wait_for_function("document.querySelector('.ss.ready')", timeout=300000); await pg.wait_for_timeout(3000)
            steps = int(DUR[n] * o.fps)
            for i in range(steps):
                t = i / o.fps
                await pg.evaluate(f"""(() => {{ window.__stageScene.seek({t}); const el = document.querySelector('.ss');
                    if (el && {t} >= {DUR[n]} - 1.95) el.classList.add('end'); }})()""")
                await pg.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")
                if i == int((DUR[n] - 1.95) * o.fps): await pg.wait_for_timeout(500)   # the end card fades in
                await pg.screenshot(path=str(tmp / f'{k:05d}.jpg'), type='jpeg', quality=90); k += 1
            await pg.evaluate("window.__stageScene.stop()"); await pg.wait_for_timeout(600)
            print('scene', n, steps, 'frames', flush=True)
        await b.close()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(o.fps), '-i', str(tmp / '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', o.out], check=True)
    shutil.rmtree(tmp); print('wrote', o.out)

ap = argparse.ArgumentParser(); ap.add_argument('build'); ap.add_argument('out'); ap.add_argument('--kids', action='store_true')
ap.add_argument('--fps', type=int, default=24); ap.add_argument('--size', default='960x540'); ap.add_argument('--scenes', default='1,2,3,4,5,6')
asyncio.run(main(ap.parse_args()))
