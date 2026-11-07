#!/usr/bin/env python3
"""Before/after pictures of the islands' look (1.4.4 set 10, Avi: "every improvement with pictures before and after,
also at the low quality levels"). For each zone and quality: morning, noon, evening, night from the island's own camera.
  python3 tools/atmo-shots.py <html> <outdir> [zones=amazon,grove,desert,savanna] [qualities=medium,low]
Writes <outdir>/<zone>-<quality>-<time>.png and a contact sheet <outdir>/sheet-<zone>.png."""
import sys, os, json, subprocess, tempfile
html, out = sys.argv[1], sys.argv[2]
zones = (sys.argv[3] if len(sys.argv) > 3 else 'amazon,grove,desert,savanna').split(',')
quals = (sys.argv[4] if len(sys.argv) > 4 else 'medium,low').split(',')
TIMES = [('morning', 0.3), ('noon', 0.5), ('evening', 0.72), ('night', 0.93)]
SEEN = ("['stage:1','g:svfilm','g:deserttut','g:savtut','g:hubtut','g:start:chat','g:start:howstages'].forEach((k) => window.__journey.markIntro(k));"
        " window.__journey.markTrained(); window.__journey.unlockAll('2580'); 1")
QUIET = "(() => { try { window.__guide && window.__guide.close(); } catch (e) { } document.querySelectorAll('button').forEach((b) => /^דלג/.test(b.textContent.trim()) && b.click()); return 1; })()"
# a planted island: every plant kind three times on a ring, then a few animals, grown for a while; a closer camera, no screen
PLANT = ("""(() => { const W = window.__game; W.points = 1e6; W.debug.unlockAll(); let n = 0;
  const pl = W.biome.species.filter((s) => s.kind !== 'animal' && !s.animal && s.type !== 'animal'), an = W.biome.species.filter((s) => !pl.includes(s));
  pl.forEach((s, i) => { for (let k = 0; k < 3; k++) { const a = (i * 3 + k) * 2.4, r = 6 + (k * 7 + i * 3) % 18; if (W.debug.place(s.id, Math.cos(a) * r, Math.sin(a) * r) && n++); } });
  an.slice(0, 6).forEach((s, i) => { const a = i * 1.1; W.debug.place(s.id, Math.cos(a) * 9, Math.sin(a) * 9); });
  return 1; })()""")
VIEW = "(() => { const r = window.__game.debug.rig; const t = r.controls.target.clone().set(0, 2.5, 0), p = t.clone().set(16, 11, 23); r.goTo(t, p, 0.05); document.getElementById('ui').style.opacity = '0'; return 1; })()"
os.makedirs(out, exist_ok=True)
for z in zones:
    steps = [{'wait': 4}, {'js': SEEN}, {'js': "window.__app.bus.emit('start:biome', { id: '%s' }); 1" % z}, {'until': 'window.__game && window.__game.debug', 'timeout': 180}, {'wait': 20}, {'js': QUIET}, {'js': PLANT}, {'wait': 2}, {'js': "window.__game.debug.ff(240); 1"}, {'wait': 2}, {'js': VIEW}, {'wait': 3}]
    for q in quals:
        steps += [{'js': "window.__app.bus.emit('quality', { q: '%s' }); 1" % q}, {'wait': 3}]
        for name, f in TIMES:
            steps += [{'js': "window.__game.dayFrac = %s; window.__game.rain = 0; window.__game.rainTarget = 0; %s; %s" % (f, QUIET, VIEW)}, {'wait': 2.5}, {'shot': f'{out}/{z}-{q}-{name}.png'}]
    fd, path = tempfile.mkstemp(suffix='.json'); os.write(fd, json.dumps(steps).encode()); os.close(fd)
    r = subprocess.run(['python3', 'tools/play.py', html, path, '800', '460'], capture_output=True, text=True, timeout=1500)
    if 'pageerror' in r.stdout or 'UNTIL TIMEOUT' in r.stdout: print(z, [l for l in r.stdout.splitlines() if 'pageerror' in l or 'UNTIL' in l][:3])
    from PIL import Image
    sheet = Image.new('RGB', (400 * len(TIMES), 230 * len(quals)))
    for qi, q in enumerate(quals):
        for ti, (name, _) in enumerate(TIMES):
            p = f'{out}/{z}-{q}-{name}.png'
            if os.path.exists(p): sheet.paste(Image.open(p).convert('RGB').resize((400, 230)), (ti * 400, qi * 230))
    sheet.save(f'{out}/sheet-{z}.png'); print('done', z, flush=True)
