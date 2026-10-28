# ירבוע (Jaculus jaculus) – a small sandy rodent that hops on long back legs; tiny front paws held under the chin, big
# eyes and ears, a very long tail ending in a black and white tuft that balances the hops. Built on the spiny mouse
# (spinymouse.py): long back feet, a longer tufted tail, bigger ears, sandy colours, no spines.
base('spinymouse', globals()); derive('spinymouse', 'jerboa')
parts = [p for p in parts if p.tag not in ('spine', 'tail', 'ear')]
# long back legs: a big thigh and a long foot flat on the ground
blobs = [bl for bl in blobs if bl.get('bone') not in ('hl', 'hr')]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [dict(t='ell', c=(sx * 0.034, 0.058, -0.06), r=(0.022, 0.036, 0.036), bone='h' + L),
              dict(t='cap', a=(sx * 0.036, 0.04, -0.08), b2=(sx * 0.037, 0.008, -0.07), r=(0.008, 0.005), bone='h' + L),
              dict(t='cap', a=(sx * 0.037, 0.006, -0.075), b2=(sx * 0.038, 0.004, 0.005), r=(0.006, 0.005), bone='h' + L)]
# a longer tail with a tuft
TAILP = [(0, 0.055, -0.095), (0, 0.05, -0.17), (0, 0.04, -0.25), (0, 0.03, -0.33), (0, 0.028, -0.4)]
bones = [b for b in bones if not b[0].startswith('tail')] + chain('tail', TAILP, 'hips')
parts.append(tail_part('tail', 4, TAILP, 0.005, 0.003, 6, 22, colfn=lambda t: mix(srgb('#c8a070'), srgb('#1a1612'), smooth(0.8, 0.9, t)) if t < 0.93 else srgb('#f4efe6')))
tuft = Part('tuft', bone='tail4', color=srgb('#f4efe6')); tuft.add(*ellipsoid((0, 0.028, -0.405), (0.009, 0.008, 0.022), 8, 6)); parts.append(tuft)
for sx in (1, -1):
    parts.append(ear_part((sx * 0.022, 0.093, 0.075), (sx * 0.5, 1, -0.2), 0.022, 0.05, 'head', srgb('#d0a878'), srgb('#f0c8b8'), thick=0.003, cup=0.45))
BACK, BACK2, BELLY = srgb('#d4aa74'), srgb('#b88c58'), srgb('#f6efe4')
SPEC = dict(SPEC, id='jerboa', bones=bones, blobs=blobs, parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=1.05, speeds={'walk': 0.8, 'run': 2.6})
