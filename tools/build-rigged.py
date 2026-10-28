#!/usr/bin/env python3
"""Blender animal exports (art/rigged/<zone>/<id>.json, from tools/blender/animal_kit.py) → src/data/rigged-<zone>.js"""
import json, glob, os
for zone in ('grove', 'amazon', 'reef', 'desert'):
    m = {}
    for f in sorted(glob.glob(f'art/rigged/{zone}/*.json')):
        d = json.load(open(f)); m[d['id']] = d
    with open(f'src/data/rigged-{zone}.js', 'w') as fh:
        fh.write(f'// Blender animal models of this zone (skinned mesh + action clips). Built by tools/build-rigged.py\n')
        fh.write('export const RIGGED = ' + json.dumps(m, separators=(',', ':')) + ';\n')
    print(zone, sorted(m), os.path.getsize(f'src/data/rigged-{zone}.js') // 1024, 'KB')
