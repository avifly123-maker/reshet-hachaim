#!/usr/bin/env python3
"""Depth proxies for the lab: the big furniture of tools/blender/lab_hd.py as plain triangles (no Blender needed: the
geometry builder there is pure python), so the live robot and fish hide behind the table, the desks and the cabinets
exactly where the Cycles pictures show them.  → art/lab/proxy.json  (built into src/data/lab-robot.js by build-lab.py)
usage: python3 tools/lab-proxy.py   (needs: pip install mathutils)"""
import sys, types, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.modules['bpy'] = types.ModuleType('bpy'); sys.modules['bmesh'] = types.ModuleType('bmesh')
g = {'D': str(ROOT / 'tmp' / 'animals'), '__name__': 'lab_hd'}
import os; os.makedirs(ROOT / 'tmp' / 'lab', exist_ok=True)
exec(compile((ROOT / 'tools/blender/lab_hd.py').read_text(), 'lab_hd.py', 'exec'), g)
KEEP = ('tabletop', 'apron', 'legs', 'shelf', 'bins', 'sdesk', 'sdesklegs', 'mstool', 'mstoolpole', 'lectbase', 'lectpost', 'lecttop', 'bookcase',
        'aqcab', 'aqpanels', 'aqtrim', 'aqlid', 'cab', 'cabcrown', 'ghtable', 'ghlegs', 'ghlower', 'stool205', 'stool335', 'stoolleg205', 'stoolleg335',
        'cplantpot', 'gplantpot', 'gplant2pot', 'bcplantpot', 'doorframe', 'door', 'rail', 'wainscot', 'sill', 'winbars')
P, I = [], []
for o in g['build_geometry']():
    if o.name not in KEEP or o.json: continue
    base = len(P) // 3
    for v in o.V:
        w = o.M @ v; P += [round(w.x, 3), round(w.z, 3), round(-w.y, 3)]
    for f in o.F:
        for t in range(1, len(f) - 1): I += [base + f[0], base + f[t], base + f[t + 1]]
out = ROOT / 'art/lab/proxy.json'; json.dump({'p': P, 'i': I}, open(out, 'w'))
print('proxy', len(P) // 3, 'verts', len(I) // 3, 'tris')
