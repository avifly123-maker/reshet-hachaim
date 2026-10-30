#!/usr/bin/env python3
"""Blender animal exports (art/rigged/<zone>/<id>.json, from tools/blender/animal_kit.py) → src/data/rigged-<zone>.js"""
import json, glob, os

def rescale(d):
    """1.4: a desert animal built on a relative's model carries meta.scale (tools/blender/desert_kit.py): scale the
    model to the real animal here. The positions are stored inside the box, so scaling the box, the bones and the root
    motion of every clip scales the whole animal; normals and textures do not change."""
    k = (d.get('meta') or {}).pop('scale', None)
    if not k or k == 1: return d
    for key in ('height', 'length'):
        if d['meta'].get(key): d['meta'][key] = round(d['meta'][key] * k, 4)
    d['box'] = [round(x * k, 5) for x in d['box']]
    if d.get('lod1'): d['lod1']['box'] = [round(x * k, 5) for x in d['lod1']['box']]
    for b in d['bones']: b['t'] = [round(x * k, 5) for x in b['t']]
    for c in d['clips'].values():
        if c.get('r'): c['r'] = [round(x * k, 5) for x in c['r']]
    return d
for zone in ('grove', 'amazon', 'reef', 'desert', 'savanna'):   # 1.4.2: the savanna
    m = {}
    for f in sorted(glob.glob(f'art/rigged/{zone}/*.json')):
        d = rescale(json.load(open(f))); m[d['id']] = d
    with open(f'src/data/rigged-{zone}.js', 'w') as fh:
        fh.write(f'// Blender animal models of this zone (skinned mesh + action clips). Built by tools/build-rigged.py\n')
        fh.write('export const RIGGED = ' + json.dumps(m, separators=(',', ':')) + ';\n')
    print(zone, sorted(m), os.path.getsize(f'src/data/rigged-{zone}.js') // 1024, 'KB')
