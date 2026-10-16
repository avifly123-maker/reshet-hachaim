# Blender session bootstrap for the animal pipeline (run once after Blender starts, through the MCP bridge):
#   exec(open(r'C:\Users\avifl\Documents\reshet-hachaim-blender\animals\session.py', encoding='utf-8').read())
# Loads animal_kit.py + animal_kit_hd.py into one namespace (bpy.app.driver_namespace['wol_ns']) and adds:
#   load(sid)                      – the spec of animals/<sid>.py, built in that namespace
#   run(ids, views, act, pct, export) – build each animal, render views [(yaw, pitch)], write out/<sid>.json if export
#   head_job(sid) / walk_job(sid, frames, act, yaw, pitch, pct) – close-ups and clip frames
#   Q (job queue: (fn, args, kwargs, tag)), RES (results), take() / clear() – Blender calls must answer within 60 s, so
#   long builds run from a timer, one job at a time, with a pause between jobs; take() only copies results (a call that
#   times out must not lose them), clear() empties RES.
#   Renders go to animals/pv and exports to animals/out, both in the connected folder: progress is checked by listing
#   those folders with the device tools, not by calling Blender while it is busy (such calls wait and time out).
#   After each animal everything built for it is removed (cleanup), so memory does not grow over a long queue.
#   A keep-awake timer stops Windows from sleeping while jobs run.
# Be gentle with the owner's computer: one job at a time, the bake uses all cores but two, no calls while a job runs.
import bpy, os, json, base64, time, traceback, tempfile, ctypes

D = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else r'C:\Users\avifl\Documents\reshet-hachaim-blender\animals'
if not os.path.exists(os.path.join(D, 'animal_kit.py')): D = r'C:\Users\avifl\Documents\reshet-hachaim-blender\animals'
TMP = os.path.join(D, 'pv'); os.makedirs(TMP, exist_ok=True)
os.makedirs(os.path.join(D, 'out'), exist_ok=True)

ns = bpy.app.driver_namespace.get('wol_ns') or {'__name__': 'wol_kit'}
for f in ('animal_kit.py', 'animal_kit_hd.py'):
    p = os.path.join(D, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
bpy.app.driver_namespace['wol_ns'] = ns
ns['D'] = D; ns['TMP'] = TMP

def load(sid):
    g = dict(ns); p = os.path.join(D, sid + '.py')
    exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), g)
    sp = g['SPEC']
    if 'wcol' in g and 'wcol' not in sp: sp['wcol'] = g['wcol']
    return sp

def _b64(path): return base64.b64encode(open(path, 'rb').read()).decode()

def cleanup(sid):
    for name in ('A_' + sid, 'HD_' + sid):
        c = bpy.data.collections.get(name)
        if not c: continue
        for o in list(c.all_objects): bpy.data.objects.remove(o, do_unlink=True)
        for ch in list(c.children_recursive): bpy.data.collections.remove(ch)
        bpy.data.collections.remove(c)
    for im in list(bpy.data.images):
        if sid in im.name and im.users == 0: bpy.data.images.remove(im)
    ns['REG'].pop(sid, None); ns.get('_HD', {}).pop(sid, None)
    try: bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    except Exception: pass

def run(ids, views=((40, 10),), act=None, pct=50, export=False):
    try: return _run(ids, views, act, pct, export)
    finally:
        for sid in ids: cleanup(sid)

def _run(ids, views, act, pct, export):
    sc = ns['scene'](); out = {}
    for sid in ids:
        ns['build_hd'](load(sid))
        acts = ns['REG'][sid]['spec'].get('actions', {})
        a = act or ('perch' if 'perch' in acts else 'idle')
        sc.render.resolution_percentage = pct
        for i, (yaw, pitch) in enumerate(views):
            path = os.path.join(TMP, 'r_%s_%d.jpg' % (sid, i)); ns['shot'](sid, path, a, 30, yaw, pitch)
            out['b64_%s_%d' % (sid, i)] = _b64(path)
        sc.render.resolution_percentage = 100
        if export:
            js = ns['export_hd'](sid)
            with open(os.path.join(D, 'out', sid + '.json'), 'w', encoding='utf-8') as fh: fh.write(js)
            out['len_' + sid] = len(js)
    return out

HEADS = {}
def head_job(sid, pct=50):
    sc = ns['scene'](); sc.render.resolution_percentage = pct
    ns['build_hd'](load(sid))
    meta = ns['REG'][sid]['spec'].get('meta', {})
    H = HEADS.get(sid)
    if H: tgt, dist = H[:3], H[3]
    else:
        hb = next((b for b in ns['REG'][sid]['spec']['bones'] if b[0] == 'head'), None)
        tgt = tuple((hb[2][k] + hb[3][k]) / 2 for k in range(3)) if hb else (0, meta.get('height', 0.5) * 0.7, 0)
        dist = meta.get('length', 0.5) * 0.45
    path = os.path.join(TMP, 'hd_head_%s.jpg' % sid); ns['shot'](sid, path, 'idle', 30, 6, 0, dist, tgt)
    sc.render.resolution_percentage = 100
    return {'b64_' + sid: _b64(path)}

def walk_job(sid, frames=(1, 5, 9, 13), act='walk', yaw=90, pitch=4, pct=35):
    sc = ns['scene'](); sc.render.resolution_percentage = pct
    ns['build_hd'](load(sid)); out = {}
    for i, f in enumerate(frames):
        path = os.path.join(TMP, 'w_%s_%s_%d.jpg' % (sid, act, f)); ns['shot'](sid, path, act, f, yaw, pitch)
        out['b64_%s_%s%d' % (sid, act, i)] = _b64(path)
    sc.render.resolution_percentage = 100
    return out

ns.setdefault('Q', []); ns.setdefault('RES', {}); ns['BUSY'] = False
def _job_fn():
    Q = ns['Q']
    if not Q: ns['BUSY'] = False; return 1.0
    ns['BUSY'] = True
    fn, args, kw, tag = Q.pop(0); t0 = time.time()
    try: r = fn(*args, **kw) or {}
    except Exception: r = {'err_' + tag: traceback.format_exc()[-1500:]}
    r['t_' + tag] = round(time.time() - t0, 1)
    ns['RES'].update(r)
    return 8.0      # a pause between jobs keeps the Blender window and the computer responsive

def enqueue(fn, *args, tag='job', **kw): ns['Q'].append((fn, args, kw, tag))

def take(prefix=None, maxchars=700000):
    R = ns['RES']; out = {}; n = 0
    for k in list(R.keys()):
        if prefix and not k.startswith(prefix): continue
        v = R[k]; L = len(v) if isinstance(v, str) else 10
        if n + L > maxchars and out: break
        out[k] = v; n += L
    out['queue'] = len(ns['Q']); out['busy'] = ns['BUSY']
    return out

def clear(prefix=None):
    for k in [k for k in ns['RES'] if not prefix or k.startswith(prefix)]: ns['RES'].pop(k)

def _keep_awake():
    try: ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001 | 0x00000002)
    except Exception: pass
    return 60.0

ns.update(load=load, run=run, cleanup=cleanup, clear=clear, head_job=head_job, walk_job=walk_job, HEADS=HEADS, enqueue=enqueue, take=take, _job_fn=_job_fn)
for fn in (_job_fn, _keep_awake):
    if not bpy.app.timers.is_registered(fn): bpy.app.timers.register(fn, first_interval=1.0, persistent=True)
bpy.app.driver_namespace['wol_keep_awake'] = _keep_awake
