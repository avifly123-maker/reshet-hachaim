# Headless check of the animal-eye tour (1.3.2):
#   python3 tools/tour-check.py dist/index.html <zone> [full|kids] [shot-prefix] [ids,to,shoot]
# Places every species of the zone, rides every animal on the island for a few seconds with keys held (forward, a turn,
# up), and prints one line per animal: how far it moved, its states, and how many frames the camera spent inside
# something solid (ground, trunk, coral, scenery). Optional screenshots of chosen tours at 800x460.
import sys, json, subprocess, pathlib, tempfile
root = pathlib.Path(__file__).resolve().parent.parent
page, zone = sys.argv[1], sys.argv[2]
kids = len(sys.argv) > 3 and sys.argv[3] == 'kids'
shot = sys.argv[4] if len(sys.argv) > 4 else ''
shoot = sys.argv[5].split(',') if len(sys.argv) > 5 else []
helper = (root / 'tests/play/tour-helper.js').read_text()
steps = [{'wait': 2}]
if kids:
    steps.append({'js': "window.__app.bus.emit('start:mode',{mode:'kids'}); 1"})
steps += [
    {'js': f"window.__app.bus.emit('start:biome',{{id:'{zone}'}}); 1"}, {'wait': 14},
    {'js': helper},
    {'js': "window.__tt.setup()"},
    {'js': "(() => { const d = window.__game.debug; d.auto(); d.ff(20); d.auto(); const t = d.tour(); return JSON.stringify({ ride: t.presentSpecies(), look: t.presentLook() }); })()"},
    # one console line per ride (play.py prints them at the end; an eval result is cut at 2000 characters)
    {'js': "(() => { const t = window.__game.debug.tour(); let n = 0; for (const id of [...t.presentSpecies(), ...t.presentLook()]) { n++; try { console.log('TOUR ' + JSON.stringify(window.__tt.ride(id))); } catch (e) { console.log('TOUR ' + id + ' ERR ' + e); } } return 'rides ' + n + ', absent ' + JSON.stringify(t.absentSpecies().map(id => id + ': ' + t.bringLine(id))); })()"},
]
if shoot:   # clean pictures: no guide bubble and no toasts over the view
    steps.append({'js': "(() => { const st = document.createElement('style'); st.textContent = '#rguide, .toast { display: none !important; }'; document.head.appendChild(st); return 1; })()"})
for sid in shoot:
    steps.append({'js': "window.__app.bus.emit('quality',{q:'medium'}); 1"})
    steps.append({'js': f"(() => {{ const d = window.__game.debug, t = d.tour(); d.auto(); t.start('{sid}'); const k = (c, on) => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', {{ code: c, key: c }})); k('ArrowUp', 1); d.ff(2.5); k('ArrowUp', 0); d.ff(0.6); return t.riding ? 'riding {sid} ' + t.mode : 'no {sid}'; }})()"})
    steps.append({'wait': 3})
    steps.append({'shot': f'{shot}-{sid}.png'})
    steps.append({'js': "window.__game.debug.tour().stop(); 1"})
f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False)
json.dump(steps, f); f.close()
subprocess.run(['python3', str(root / 'tools/play.py'), page, f.name, '800', '460'])
