# צבוע מנומר (Crocuta crocuta, spotted hyena) – savanna, kit v6, traced from a side photo (Commons "Spotted Hyena (Crocuta
# crocuta) walking to the waterhole", mirrored, refs/README.md "h1", 1.11.2026): modelled at a shoulder height of 0.85
# model units (1 px = 3.94 mm; z = (px - 200) × PX forward, y = (266 - py) × PX up) and scaled by meta.scale to 0.8 m.
# The photo: high strong shoulders and a back that slopes down to low hindquarters, a deep chest, a thick neck with a
# short bristly mane along the back, a big broad head with a short blunt muzzle, round ears, fairly long front legs and
# shorter hind legs, a short tail with a dark bushy tip. Sandy-grey coat with dark brown round spots, a dark muzzle.
own('hyena')
ANAT['hyena'] = ('cat', dict(arm=0.13, sh=(0.11, 0.6, 0.2), fa0=0.085, fa1=0.065, wr=0.062, can=0.055, th=(0.11, 0.55, 0.19),
                             gas0=0.1, gas1=0.065, hock=0.065, mt=0.055, paw=(0.075, 0.045, 0.1)))
EYE['hyena'] = ('#3a2412', 'round', 0.82, 0.5)
PX = 0.00394
def ph(x, y): return ((x - 200) * PX, (266 - y) * PX)
def P3(x, y, X=0.0): z, yy = ph(x, y); return (X, yy, z)
TRUNK = []
for x, t, b in ((305, 70, 145), (285, 52, 152), (260, 52, 158), (235, 55, 165), (210, 58, 172), (185, 60, 178), (160, 63, 180),
                (135, 67, 176), (110, 72, 168), (88, 80, 160), (70, 96, 148)):
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
TAIL = [P3(68, 100), P3(64, 140), P3(62, 175), P3(62, 198)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.13 + 0.025 * smooth(-0.3, 0.3, z))     # broad at the shoulders, narrow behind
blobs += [
    dict(t='cap', a=P3(292, 92), b2=P3(342, 86), r=(0.115, 0.09), bone='neck'),          # the thick neck
    dict(t='ell', c=P3(356, 84), r=(0.085, 0.085, 0.09), bone='head'),                     # the broad skull
    dict(t='ell', c=P3(360, 100), r=(0.08, 0.055, 0.07), bone='head'),                      # the strong cheeks
    dict(t='cap', a=P3(368, 94), b2=P3(400, 106), r=(0.058, 0.045), bone='head'),          # the short blunt muzzle
    dict(t='ell', c=P3(375, 114), r=(0.05, 0.03, 0.055), bone='head'),                      # the jaw
    dict(t='cap', a=P3(150, 58), b2=P3(320, 50), r=(0.022, 0.018), bone='chest'),          # the short bristly mane
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.03, 0.026), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.026, 0.03), bone='tail2'),
    dict(t='ell', c=TAIL[3], r=(0.04, 0.055, 0.04), bone='tail3'),                          # the dark bushy tip
]
bones = [('hips', None, P3(70, 96), P3(200, 62)), ('chest', 'hips', P3(200, 62), P3(300, 62)),
         ('neck', 'chest', P3(300, 86), P3(346, 84)), ('head', 'neck', P3(348, 82), P3(404, 108))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', P3(288, 118, sx * 0.075), P3(294, 210, sx * 0.075)), ('f' + L + '2', 'f' + L, P3(294, 210, sx * 0.075), P3(300, 266, sx * 0.075)),
              ('h' + L, 'hips', P3(108, 108, sx * 0.07), P3(92, 212, sx * 0.072)), ('h' + L + '2', 'h' + L, P3(92, 212, sx * 0.072), P3(102, 266, sx * 0.072))]
    blobs += [dict(t='ell', c=P3(306, 258, sx * 0.075), r=(0.045, 0.03, 0.06), bone='f' + L + '2', foot=True),
              dict(t='ell', c=P3(108, 258, sx * 0.072), r=(0.042, 0.03, 0.056), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.06, 0.11, 0.08), th=(0.075, 0.13, 0.1))
E = blob_ears(blobs, bones, base=(0.045, ph(345, 62)[1], ph(345, 62)[0]), d=(0.35, 1, -0.2), H=0.085, w=0.06, t=0.012, tip=0.95, turn=20)

SAND, SAND2, SPOT, DARK, CREAM = srgb('#a89a78'), srgb('#948664'), srgb('#4a3a28'), srgb('#2a2018'), srgb('#c8bc9c')
SPOTS = []
import random as _rnd
_r = _rnd.Random(7)
for i in range(70):   # round spots on the flanks, the shoulders and the legs (not on the neck and the head)
    SPOTS.append(Vector((_r.choice((1, -1)) * 0.2, 0.15 + _r.random() * 0.6, -0.55 + _r.random() * 0.95)))
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    if e: return mix(DARK, CREAM, 0.5 * e[2])
    n = noise.noise(Vector((x * 14, y * 14, z * 14))); n2 = noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(SAND, SAND2, 0.4 + 0.3 * n + 0.15 * n2)
    if z < 0.45:
        for s in SPOTS:
            if s.x * x < 0: continue
            d = Vector((0, y - s.y, z - s.z)).length
            if d < 0.04: c = mix(c, SPOT, smooth(0.04, 0.022, d) * 0.85); break
    if z > 0.5 and y < ph(0, 95)[1]: c = mix(c, DARK, smooth(0.6, 0.72, z) * 0.85)            # the dark muzzle
    if y > ph(0, 60)[1] and abs(x) < 0.04 and z < 0.5: c = mix(c, mix(SAND2, DARK, 0.4), 0.6) # the darker mane
    if y < 0.06 and abs(x) > 0.04: c = mix(c, DARK, 0.6)                                        # the paws
    if y < 0.4 and z < -0.5 and abs(x) < 0.05: c = mix(c, DARK, 0.85)                           # the tail tip
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.06, ph(0, 82)[1], ph(372, 0)[0]), 0.014, 'head', '#3a2412', (sx, 0.25, 0.7))
nose = Part('nose', bone='head', mat=1, color=srgb('#141010')); nose.add(*ellipsoid((0, ph(0, 104)[1], ph(404, 0)[0]), (0.03, 0.022, 0.02), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=38, run_amp=40, bob=0.02, drop=0.35, head_eat=32, neck_eat=36, look=22, tailsw=12, earflick=20,
                                frames=dict(walk=32, run=16, idle=150, eat=60, sleep=130)))
SPEC = dict(id='hyena', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.008, tris=5200, smooth=12, actions=acts,
            meta=dict(height=1.1, length=1.9, scale=0.94, speeds={'walk': 1.4, 'run': 9.0}, map={'sit': 'idle', 'swim': 'walk'}))
