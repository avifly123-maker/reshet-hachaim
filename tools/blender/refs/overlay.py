"""Draw an animal spec's side silhouette over its reference photo, without Blender (kit v6 tracing aid).

    python3 tools/blender/refs/overlay.py tools/blender/animals/zebra.py photo.jpg x0 y0 m_per_px out.jpg

(x0, y0) is the photo pixel of the model's origin on the ground (z = 0, y = 0); m_per_px the photo's scale. The spec runs
with light stand-ins for the kit (needs `pip install mathutils`): the blobs are drawn as their side outlines (ellipses
and capsules, a plain union, so the real metaball body is a little fuller), the leg bones as lines, the photo half
faded under them. Good enough to see a wrong back line, belly, neck or leg length before a Blender run.
"""
import math, random, sys, types
from mathutils import Vector, Quaternion
from PIL import Image, ImageDraw

HERE = __file__.rsplit('/', 2)[0]


def kit_ns():
    ns = {'random': random, 'math': math, 'Vector': Vector, 'Quaternion': Quaternion, 'TAU': math.tau, 'ANAT': {}, 'EYE': {}}
    src = open(HERE + '/animal_kit.py', encoding='utf-8').read()
    for name in ('smooth', 'chain', 'bez'):          # pure helpers copied from the kit
        i = src.index('def %s(' % name); j = src.find('\ndef ', i + 1); exec(src[i:j if j > 0 else None], ns)
    dk = open(HERE + '/desert_kit.py', encoding='utf-8').read()
    for name in ('trunk_from_profile', 'cat_muscles', 'blob_ears', 'ear_paint'):
        i = dk.index('def %s(' % name); j = dk.find('\ndef ', i + 1); exec(dk[i:j if j > 0 else None], ns)

    class Part:
        def __init__(self, *a, **k): self.v = []; self.bone = k.get('bone'); self.tag = a[0] if a else ''
        def add(self, verts=(), faces=(), cols=None): self.v += [tuple(x) for x in verts]; return self
    ns.update(own=lambda s: s, srgb=lambda h: h, mix=lambda a, b, t: a, Part=Part, noise=types.SimpleNamespace(noise=lambda v: 0.0), Euler=None,
              eye_parts=lambda *a, **k: [], ellipsoid=lambda *a, **k: ([], []), tube=lambda pts, *a, **k: ([tuple(p) for p in pts], []),
              whiskers=lambda *a, **k: Part(), worley2=lambda *a, **k: (0, 1, 0), derive=lambda *a, **k: None, base=lambda *a, **k: None,
              quad_actions=lambda names, c=None: {'walk': (30, lambda ph: {})})
    return ns


def main():
    spec, photo, x0, y0, mpp, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
    ns = kit_ns(); exec(compile(open(spec, encoding='utf-8').read(), spec, 'exec'), ns)
    S = ns['SPEC']; im = Image.open(photo).convert('RGB'); k = 2
    im = Image.blend(im, Image.new('RGB', im.size, (255, 255, 255)), 0.45).resize((im.width * k, im.height * k))
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    P = lambda z, y: ((x0 + z / mpp) * k, (y0 - y / mpp) * k)
    col = (220, 30, 30, 70); edge = (200, 0, 0, 255)
    for b in S['blobs']:
        if b['t'] == 'ell':
            c = b['c']; r = b['r']; a = P(c[2] - r[2], c[1] + r[1]); bb = P(c[2] + r[2], c[1] - r[1])
            d.ellipse([a, bb], fill=col)
        elif b['t'] == 'cap':
            A, B = Vector(b['a']), Vector(b['b2']); r0, r1 = b['r']
            for i in range(13):
                t = i / 12; p = A.lerp(B, t); r = r0 + (r1 - r0) * t
                d.ellipse([P(p.z - r, p.y + r), P(p.z + r, p.y - r)], fill=col)
    for pt in S.get('parts', []):                       # parts (ears, horns, tusks…) as green dots
        for v in pt.v[::2]:
            if v[0] >= 0: q = P(v[2], v[1]); d.ellipse([q[0] - 1.5, q[1] - 1.5, q[0] + 1.5, q[1] + 1.5], fill=(0, 150, 0, 200))
    for name, par, a, b in S['bones']:
        if name[0] in 'fh' and name[1] in 'lr' and a[0] > 0:
            d.line([P(a[2], a[1]), P(b[2], b[1])], fill=(0, 0, 200, 255), width=5)
    im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
    # the outline of the union, for a crisp edge
    m = Image.new('L', im.size, 0); dm = ImageDraw.Draw(m)
    ImageDraw.Draw(im).text((6, 6), spec.rsplit('/', 1)[-1], fill=(200, 0, 0))
    im.save(out, quality=88)


if __name__ == '__main__':
    main()
