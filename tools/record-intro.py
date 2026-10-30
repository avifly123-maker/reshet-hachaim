#!/usr/bin/env python3
"""Record the robot lab's opening film (src/robolab/intro.js) frame by frame, so a slow headless renderer still gives
smooth motion. With --voice <dir of ki_0..ki_4.wav> the beats take the lines' own lengths and the lines are laid on
the sound track.   python3 tools/record-intro.py dist/index-torah.html out.mp4 [--kids] [--fps 24] [--size 1280x720] [--voice dir]"""
import sys, asyncio, pathlib, subprocess, shutil, argparse, json, wave
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from apphost import mount
from playwright.async_api import async_playwright
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
MIN = [3.4, 3.6, 3.6, 3.6, 4.2]

def wav_len(p):   # float wavs too (Chatterbox)
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)

async def main(o):
    W, H = map(int, o.size.split('x'))
    lens = MIN[:]
    if o.voice:
        lens = [max(MIN[i], wav_len(pathlib.Path(o.voice) / f'ki_{i}.wav') + 0.7) for i in range(5)]
    tmp = pathlib.Path(o.out).with_suffix('.frames'); shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width': W, 'height': H})
        pg.on('pageerror', lambda e: print('page error', e))
        await pg.goto(await mount(pg, o.build)); await pg.wait_for_function('window.__app && window.__journey', timeout=120000)
        if o.kids: await pg.evaluate("localStorage.setItem(window.__profiles.key('web-of-life-mode'), 'kids')")
        await pg.wait_for_timeout(3000)
        await pg.evaluate("window.__guide && window.__guide.close(); window.__journey.unlockAll('2580'); window.__app.bus.emit('ui:robolab'); 1")
        await pg.wait_for_function("window.__rlDebug && document.querySelector('.rl-home')", timeout=120000)
        await pg.evaluate("window.__guide && window.__guide.close(); 1")
        await pg.evaluate(f"window.__rlDebug.film({json.dumps(lens)})"); await pg.wait_for_timeout(1500)
        total = await pg.evaluate("window.__rlFilm.length")
        n = int(total * o.fps)
        for i in range(n):
            await pg.evaluate(f"window.__rlFilm.seek({i / o.fps}, {1 / o.fps})")
            await pg.screenshot(path=str(tmp / f'{i:05d}.jpg'), type='jpeg', quality=90)
            if i % 48 == 0: print('frame', i, '/', n, flush=True)
        sfx = {}
        if o.voice:   # the tools' arrival sounds (src/audio/audio.js rlRobot, rlDrone, rlSub), rendered offline by the game itself
            import base64
            for k in ('rlRobot', 'rlDrone', 'rlSub'):
                data = await pg.evaluate(f"window.__renderSfx('{k}', 2.5)")
                p_ = tmp.parent / f'{k}.wav'; p_.write_bytes(base64.b64decode(data)); sfx[k] = p_
        await b.close()
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(o.fps), '-i', str(tmp / '%05d.jpg')]
    if o.voice:   # each line starts at its beat
        starts = []; at = 1.9
        for L in lens: starts.append(at); at += L
        for i in range(5): cmd += ['-i', str(pathlib.Path(o.voice) / f'ki_{i}.wav')]
        tracks = [(starts[i], i + 1) for i in range(5)]
        for j, k in enumerate(('rlRobot', 'rlDrone', 'rlSub')):   # beats 1, 2, 3 bring the robot, the drone, the sub
            cmd += ['-i', str(sfx[k])]; tracks.append((starts[j + 1], 6 + j))
        mix = ''.join(f'[{n}:a]aresample=44100,adelay={int(s * 1000)}|{int(s * 1000)}[a{q}];' for q, (s, n) in enumerate(tracks)) + ''.join(f'[a{q}]' for q in range(len(tracks))) + f'amix=inputs={len(tracks)}:normalize=0[a]'
        cmd += ['-filter_complex', mix, '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '128k']
    cmd += ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-movflags', '+faststart', o.out]
    subprocess.run(cmd, check=True); shutil.rmtree(tmp); print('wrote', o.out, round(total, 1), 's')

ap = argparse.ArgumentParser(); ap.add_argument('build'); ap.add_argument('out'); ap.add_argument('--kids', action='store_true')
ap.add_argument('--fps', type=int, default=24); ap.add_argument('--size', default='1280x720'); ap.add_argument('--voice')
asyncio.run(main(ap.parse_args()))
