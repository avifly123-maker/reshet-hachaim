# צבוע מנומר (Crocuta crocuta, spotted hyena) – savanna, kit v6, traced from a side photo (Commons "Spotted Hyena (Crocuta
# crocuta) walking to the waterhole", mirrored, refs/README.md "h1", 1.11.2026): modelled at a shoulder height of 0.85
# model units (1 px = 3.94 mm; z = (px - 200) × PX forward, y = (266 - py) × PX up) and scaled by meta.scale to 0.8 m.
# The photo: high strong shoulders and a back that slopes down to low hindquarters, a deep chest, a thick neck with a
# short bristly mane along the back, a big broad head with a short blunt muzzle, round ears, fairly long front legs and
# shorter hind legs, a short tail with a dark bushy tip. Sandy-grey coat with dark brown round spots, a dark muzzle.
own('hyena')
ANAT['hyena'] = ('cat', dict(arm=0.12, sh=(0.07, 0.5, 0.12), fa0=0.085, fa1=0.062, wr=0.058, can=0.052, th=(0.05, 0.3, 0.08),   # round 3-5 (Avi: "not so nice"):
                             gas0=0.08, gas1=0.056, hock=0.056, mt=0.05, paw=(0.065, 0.038, 0.09)))   # a small haunch, so the back slopes down to the rump as in the photo
EYE['hyena'] = ('#3a2412', 'round', 0.82, 0.5)
PX = 0.00394
def ph(x, y): return ((x - 200) * PX, (266 - y) * PX)
def P3(x, y, X=0.0): z, yy = ph(x, y); return (X, yy, z)
TRUNK = []
for x, t, b in ((305, 70, 142), (285, 48, 158), (260, 50, 162), (235, 54, 158), (210, 58, 150), (185, 63, 142), (160, 69, 136),
                (135, 76, 132), (110, 85, 130), (88, 96, 128), (72, 108, 124)):   # round 7 (Avi: "the belly and the hind part"): the chest is the deepest, the belly
                                                                                       # rises evenly to the flank (no sagging pot belly), the rump is small but rounded
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
TAIL = [P3(70, 108), P3(64, 145), P3(62, 178), P3(62, 202)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.095 + 0.06 * smooth(-0.35, 0.3, z), n=34)   # broad deep chest, narrow rump     # broad at the shoulders, narrow behind
blobs += [
    dict(t='cap', a=P3(282, 92), b2=P3(340, 78), r=(0.14, 0.11), bone='neck'),           # the thick strong neck, carried forward and up
    dict(t='ell', c=P3(352, 80), r=(0.12, 0.115, 0.12), bone='head'),                      # the big broad skull
    dict(t='ell', c=P3(360, 98), r=(0.1, 0.07, 0.085), bone='head'),                       # the strong cheeks and jaw muscles
    dict(t='cap', a=P3(362, 88), b2=P3(400, 102), r=(0.07, 0.058), bone='head'),           # the short blunt muzzle
    dict(t='ell', c=P3(375, 114), r=(0.05, 0.03, 0.055), bone='head'),                      # the jaw
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.035, 0.03), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.032, 0.04), bone='tail2'),
    dict(t='ell', c=P3(62, 196), r=(0.042, 0.085, 0.04), bone='tail3'),                     # the dark bushy tip, a tuft and not a ball
]
bones = [('hips', None, P3(70, 106), P3(200, 62)), ('chest', 'hips', P3(200, 62), P3(300, 62)),
         ('neck', 'chest', P3(296, 90), P3(344, 76)), ('head', 'neck', P3(346, 74), P3(404, 100))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', P3(288, 118, sx * 0.075), P3(294, 210, sx * 0.075)), ('f' + L + '2', 'f' + L, P3(294, 210, sx * 0.075), P3(300, 266, sx * 0.075)),
              ('h' + L, 'hips', P3(108, 108, sx * 0.07), P3(92, 212, sx * 0.072)), ('h' + L + '2', 'h' + L, P3(92, 212, sx * 0.072), P3(102, 266, sx * 0.072))]
    blobs += [dict(t='ell', c=P3(306, 258, sx * 0.075), r=(0.04, 0.03, 0.05), bone='f' + L + '2', foot=True),
              dict(t='ell', c=P3(108, 258, sx * 0.072), r=(0.038, 0.028, 0.046), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.06, 0.12, 0.08), th=(0.035, 0.065, 0.05), sh_t=0.3, th_t=0.3)
E = blob_ears(blobs, bones, base=(0.06, ph(343, 54)[1], ph(343, 54)[0]), d=(0.35, 1, -0.2), H=0.1, w=0.075, t=0.014, tip=0.98, turn=20)   # big round ears

SAND, SAND2, SPOT, DARK, CREAM = srgb('#72644a'), srgb('#5c503c'), srgb('#2a1e14'), srgb('#201810'), srgb('#9a8c6c')
SPOTS = []
import random as _rnd
_r = _rnd.Random(7)
for i in range(200):   # round spots on the flanks, the shoulders and the legs (not on the neck and the head)
    SPOTS.append(Vector((_r.choice((1, -1)) * 0.2, 0.08 + _r.random() * 0.62, -0.55 + _r.random() * 1.0)))
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
            if d < 0.03: c = mix(c, SPOT, smooth(0.03, 0.016, d) * 0.85); break
    if z > ph(380, 0)[0]: c = mix(c, DARK, smooth(ph(380, 0)[0], ph(395, 0)[0], z) * 0.85)     # the dark tip of the muzzle
    if abs(x) < 0.05 and N.y > 0.6 and -0.3 < z < ph(330, 0)[0]: c = mix(c, mix(SAND2, srgb('#8a5a2a'), 0.5), 0.7)   # the reddish mane along the back
    if y < 0.06 and abs(x) > 0.04: c = mix(c, DARK, 0.6)                                        # the paws
    if y < 0.4 and z < -0.5 and abs(x) < 0.05: c = mix(c, DARK, 0.85)                           # the tail tip
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.075, ph(0, 76)[1], ph(372, 0)[0]), 0.017, 'head', '#3a2412', (sx, 0.25, 0.7))
nose = Part('nose', bone='head', mat=1, color=srgb('#141010')); nose.add(*ellipsoid((0, ph(0, 100)[1], ph(406, 0)[0]), (0.035, 0.026, 0.022), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=38, run_amp=40, bob=0.02, drop=0.35, head_eat=32, neck_eat=36, look=22, tailsw=12, earflick=20,
                                frames=dict(walk=32, run=16, idle=150, eat=60, sleep=130)))
SPEC = dict(id='hyena', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.008, tris=5200, smooth=12, actions=acts,
            meta=dict(height=1.1, length=1.9, scale=0.94, speeds={'walk': 1.4, 'run': 9.0}, map={'sit': 'idle', 'swim': 'walk'}))
