# גמל חד־דבשתי (Camelus dromedarius) – tall, long legs and a long neck, one hump of fat on the back, sandy tan coat,
# wide soft feet, small ears, long eyelashes. Built on the gazelle (gazelle.py): no horns, a hump, the head carried
# further forward on a longer neck, camel colours, scaled up by meta.scale.
base('gazelle', globals()); derive('gazelle', 'camel')
D_HEAD = Vector((0, -0.04, 0.2))
def _mv(p): return tuple(Vector(p) + D_HEAD)
for bl in blobs:
    if bl.get('bone') in ('head', 'earL', 'earR'):
        for k in ('c', 'a', 'b2'):
            if k in bl: bl[k] = _mv(bl[k])
bones = [(n, par, (_mv(h) if n in ('head', 'earL', 'earR') else h), (_mv(t) if n in ('head', 'earL', 'earR', 'neck') else t)) for (n, par, h, t) in bones]
for bl in blobs:
    if bl.get('bone') == 'neck' and bl['t'] == 'cap': bl['b2'] = _mv(bl['b2']); bl['r'] = (0.07, 0.048)
parts = [p for p in parts if p.tag not in ('horn', 'ear')]
for p in parts:
    if p.bone in ('head',): p.v = [_mv(v) for v in p.v]
blobs.append(dict(t='ell', c=(0, 1.13, -0.06), r=(0.1, 0.13, 0.17), bone='chest', keep=True))      # the hump
blobs.append(dict(t='ell', c=(0, 1.33, 0.75), r=(0.035, 0.03, 0.045), bone='head'))               # the soft upper lip
for sx in (1, -1):
    parts.append(ear_part((sx * 0.045, 1.4, 0.66), (sx * 0.6, 1, -0.3), 0.025, 0.05, 'ear' + ('L' if sx > 0 else 'R'), srgb('#b08a5a'), srgb('#d8c09a'), thick=0.006, cup=0.3))
FAWN, FAWN2, CHOC, WHITE, DARK = srgb('#cda26a'), srgb('#b88c56'), srgb('#c09060'), srgb('#e6d2ac'), srgb('#6a5034')
SPEC = dict(SPEC, id='camel', bones=bones, blobs=blobs, parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=1.2, speeds={'walk': 1.1, 'run': 5.0})
