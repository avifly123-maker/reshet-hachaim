#!/usr/bin/env python3
"""Record the savanna's opening film (src/game/savanna/film.js) frame by frame, so a slow headless renderer still gives
smooth motion, and lay its music (art/music/savanna.ogg) under it.
    node build.mjs && python3 tools/record-savanna-film.py dist/index.html out.mp4 [--fps 24] [--size 1280x720] [--q high]"""
import sys, asyncio, pathlib, subprocess, shutil, argparse
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from apphost import mount
from playwright.async_api import async_playwright
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
ROOT = pathlib.Path(__file__).resolve().parent.parent


async def main(o):
    W, H = map(int, o.size.split('x'))
    tmp = pathlib.Path(o.out).with_suffix('.frames')
    if not o.start: shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width': W, 'height': H})
        pg.on('pageerror', lambda e: print('page error', e))
        await pg.goto(await mount(pg, o.build)); await pg.wait_for_function('window.__app && window.__journey', timeout=120000)
        await pg.wait_for_timeout(3000)
        # a player who has seen the film (so it does not start by itself), then the film from its button
        await pg.evaluate("window.__guide && window.__guide.close(); window.__journey.unlockAll('2580'); window.__journey.markTrained(); window.__journey.markIntro('g:svfilm'); window.__journey.markIntro('g:savannatut'); 1")
        await pg.evaluate("window.__app.bus.emit('start:biome', { id: 'savanna' }); 1")
        await pg.wait_for_function('window.__game && window.__game.savanna && window.__game.debug', timeout=300000)
        await pg.evaluate(f"window.__app.bus.emit('quality',{{q:'{o.q}'}}); 1")
        await pg.wait_for_timeout(16000)
        await pg.evaluate("[...document.querySelectorAll('button')].filter(b=>/דלג/.test(b.textContent)&&b.offsetParent).forEach(b=>b.click()); window.__guide && window.__guide.close(); 1")
        await pg.wait_for_timeout(1500)
        await pg.evaluate("document.querySelector('#ui .tb[data-a=svfilm]').click(); 1")
        await pg.wait_for_function('window.__svFilm && window.__svFilm.t >= 0', timeout=60000)
        await pg.evaluate(f"window.__svFilm.fix({1 / o.fps}); 1")
        await pg.wait_for_timeout(1200)   # the shaders of the cast are compiled before the first frame
        total = await pg.evaluate('window.__svFilm.length')
        n = int(total * o.fps)
        if o.start:   # resume an interrupted recording: run the film to that frame without pictures
            await pg.evaluate(f'window.__svFilm.step({o.start})')
            await pg.wait_for_function('window.__svFilm.budget <= 0', timeout=3600000, polling=1000)
        for i in range(o.start, n):
            await pg.evaluate('window.__svFilm.step(1)')
            await pg.wait_for_function('window.__svFilm.budget <= 0', timeout=60000)
            await pg.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
            await pg.screenshot(path=str(tmp / f'{i:05d}.jpg'), type='jpeg', quality=90)
            if i % 48 == 0: print('frame', i, '/', n, flush=True)
        await b.close()
    music = ROOT / 'art' / 'music' / 'savanna.ogg'
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', str(o.fps), '-i', str(tmp / '%05d.jpg')]
    if music.exists(): cmd += ['-i', str(music), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k', '-shortest']
    cmd += ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', o.out]
    subprocess.run(cmd, check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print('wrote', o.out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('build'); ap.add_argument('out')
    ap.add_argument('--fps', type=int, default=24); ap.add_argument('--size', default='1280x720'); ap.add_argument('--q', default='high')
    ap.add_argument('--start', type=int, default=0, help='resume from this frame (the frames already made are kept)')
    asyncio.run(main(ap.parse_args()))
