#!/usr/bin/env python3
"""ניצוץ from Blender, headless in the container (pip install --break-system-packages bpy==5.2.2):
builds the puppet (tools/blender/nitzotz.py, in the robolab_kit.py namespace), exports art/workshop/nitzotz_export.json,
and with --preview <png> renders a quick look. Then: python3 tools/build-nitzotz.py
usage: python3 tools/nitzotz-build.py [--preview out.png] [--samples 48]"""
import sys, pathlib, argparse
ROOT = pathlib.Path(__file__).resolve().parent.parent
import bpy
ap = argparse.ArgumentParser(); ap.add_argument('--preview'); ap.add_argument('--samples', type=int, default=48); ap.add_argument('--size', type=int, default=700)
ap.add_argument('--cam', default='0.9,-2.6,0.62'); ap.add_argument('--portrait', action='store_true')
a = ap.parse_args()
ns = {'__name__': 'nz'}
exec(open(ROOT / 'tools/blender/robolab_kit.py', encoding='utf-8').read(), ns)
exec(open(ROOT / 'tools/blender/nitzotz.py', encoding='utf-8').read(), ns)
sc = ns['_coll']()[0]
try: bpy.context.window.scene = sc
except Exception: pass
print(ns['nz_build']())
print(ns['nz_export'](str(ROOT / 'art/workshop/nitzotz_export.json')))
if a.preview:
    ns['nz_materials']()
    print(ns['nz_preview'](a.preview, size=a.size, samples=a.samples, cam=tuple(float(x) for x in a.cam.split(',')), transparent=a.portrait))
