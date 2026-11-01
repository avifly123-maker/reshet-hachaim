# צבוע מנומר (Crocuta crocuta, spotted hyena) – savanna, kit v6, traced from a side photo (Commons "Spotted Hyena (Crocuta
# crocuta) walking to the waterhole", mirrored, refs/README.md "h1", 1.11.2026): modelled at a shoulder height of 0.85
# model units (1 px = 3.94 mm; z = (px - 200) × PX forward, y = (266 - py) × PX up) and scaled by meta.scale to 0.8 m.
# The photo: high strong shoulders and a back that slopes down to low hindquarters, a deep chest, a thick neck with a
# short bristly mane along the back, a big broad head with a short blunt muzzle, round ears, fairly long front legs and
# shorter hind legs, a short tail with a dark bushy tip. Sandy-grey coat with dark brown round spots, a dark muzzle.
own('hyena')
ANAT['hyena'] = ('cat', dict(arm=0.12, sh=(0.07, 0.5, 0.12), fa0=0.098, fa1=0.068, wr=0.06, can=0.052, th=(0.05, 0.3, 0.08),   # round 3-5 (Avi: "not so nice"):
                             gas0=0.095, gas1=0.06, hock=0.056, mt=0.05, paw=(0.065, 0.038, 0.09)))   # a small haunch, so the back slopes down to the rump as in the photo
EYE['hyena'] = ('#3a2412', 'round', 0.82, 0.5)
PX = 0.00394
def ph(x, y): return ((x - 200) * PX, (266 - y) * PX)
def P3(x, y, X=0.0): z, yy = ph(x, y); return (X, yy, z)
TRUNK = []
for x, t, b in ((305, 66, 142), (285, 46, 158), (260, 46, 164), (235, 50, 166), (210, 55, 166), (185, 61, 164), (160, 67, 163),
                (135, 73, 163), (110, 79, 162), (88, 86, 160), (72, 96, 152), (60, 110, 140)):   # round 8 (Avi, 1.11: "strong and muscular behind"):
                                                                                       # a full deep body to the end, a round rump, the belly level
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
TAIL = [P3(72, 106), P3(64, 140), P3(60, 172), P3(58, 198)]   # round 8: hangs close to the round rump, bushy all along (the photos)
blobs = trunk_from_profile(TRUNK, lambda z: 0.14 + 0.03 * smooth(-0.45, 0.25, z), n=34)   # broad deep chest, narrow rump     # broad at the shoulders, narrow behind
blobs += [
    dict(t='cap', a=P3(282, 92), b2=P3(340, 78), r=(0.14, 0.11), bone='neck'),           # the thick strong neck, carried forward and up
    dict(t='cap', a=P3(292, 60), b2=P3(342, 62), r=(0.075, 0.065), bone='neck'),          # round 9: the bristly crest, one line from the withers to the head
    dict(t='ell', c=P3(352, 80), r=(0.12, 0.115, 0.12), bone='head'),                      # the big broad skull
    dict(t='ell', c=P3(360, 98), r=(0.1, 0.07, 0.085), bone='head'),                       # the strong cheeks and jaw muscles
    dict(t='cap', a=P3(362, 88), b2=P3(404, 104), r=(0.068, 0.046), bone='head'),          # the blunt muzzle (round 9: tapering, not a bulb)
    dict(t='ell', c=P3(375, 114), r=(0.05, 0.03, 0.055), bone='head'),                      # the jaw
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.045, 0.05), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.05, 0.06), bone='tail2'),
    dict(t='ell', c=P3(59, 190), r=(0.055, 0.1, 0.05), bone='tail3'),                     # the dark bushy tip, a tuft and not a ball
]
bones = [('hips', None, P3(70, 106), P3(200, 62)), ('chest', 'hips', P3(200, 62), P3(300, 62)),
         ('neck', 'chest', P3(296, 90), P3(344, 76)), ('head', 'neck', P3(346, 74), P3(404, 100))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', P3(288, 118, sx * 0.075), P3(294, 210, sx * 0.075)), ('f' + L + '2', 'f' + L, P3(294, 210, sx * 0.075), P3(300, 266, sx * 0.075)),
              ('h' + L, 'hips', P3(112, 112, sx * 0.07), P3(84, 206, sx * 0.072)), ('h' + L + '2', 'h' + L, P3(84, 206, sx * 0.072), P3(100, 266, sx * 0.072))]   # round 9: the hock bent back
    blobs += [dict(t='ell', c=P3(306, 258, sx * 0.075), r=(0.036, 0.026, 0.042), bone='f' + L + '2', foot=True),
              dict(t='ell', c=P3(104, 259, sx * 0.072), r=(0.034, 0.025, 0.04), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.06, 0.12, 0.08), th=(0.06, 0.11, 0.09), sh_t=0.3, th_t=0.4)   # round 8: big thighs
for sx in (1, -1):   # round 8: the powerful hindquarters of the photo: the round gluteal mass and the thick thigh above the stifle
    blobs += [dict(t='ell', c=P3(84, 120, sx * 0.075), r=(0.075, 0.085, 0.095), bone='hips'),
              dict(t='ell', c=P3(104, 150, sx * 0.085), r=(0.065, 0.1, 0.1), bone='hl' if sx > 0 else 'hr')]
E = blob_ears(blobs, bones, base=(0.06, ph(343, 54)[1], ph(343, 54)[0]), d=(0.15, 1, -0.15), H=0.13, w=0.095, t=0.016, tip=0.9, turn=35)   # big round ears (round 8: bigger, as in the photo)

SAND, SAND2, SPOT, DARK, CREAM = srgb('#7e6e52'), srgb('#625440'), srgb('#2a1e14'), srgb('#201810'), srgb('#9a8c6c')
SPOTS = []
import random as _rnd
_r = _rnd.Random(7)
for i in range(340):   # round 11: spots of every size, denser and darker behind and on the legs, fading at the shoulders (the photos)
    z0 = -0.6 + (_r.random() ** 0.7) * 1.05; dens = smooth(0.45, -0.2, z0)
    if _r.random() > 0.35 + 0.65 * dens: continue
    SPOTS.append((Vector((_r.choice((1, -1)) * 0.2, 0.06 + _r.random() * 0.62, z0)), 0.014 + _r.random() * 0.022, 0.45 + 0.5 * dens))
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    if e: return mix(DARK, CREAM, 0.5 * e[2])
    n = noise.noise(Vector((x * 14, y * 14, z * 14))); n2 = noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(SAND, SAND2, 0.4 + 0.3 * n + 0.15 * n2)
    if z < 0.45:
        wob = 0.006 * noise.noise(Vector((x * 90, y * 90, z * 90)))   # ragged edges, not stamped circles
        for s, rad, k in SPOTS:
            if s.x * x < 0: continue
            d = Vector((0, (y - s.y) * 0.85, z - s.z)).length + wob
            if d < rad: c = mix(c, SPOT, smooth(rad, rad * 0.5, d) * k); break
    if z > ph(380, 0)[0]: c = mix(c, DARK, smooth(ph(380, 0)[0], ph(395, 0)[0], z) * 0.85)     # the dark tip of the muzzle
    if abs(x) < 0.05 and N.y > 0.6 and -0.3 < z < ph(330, 0)[0]: c = mix(c, mix(SAND2, srgb('#8a5a2a'), 0.5), 0.7)   # the reddish mane along the back
    if y < 0.06 and abs(x) > 0.04: c = mix(c, DARK, 0.6)                                        # the paws
    if y < 0.4 and z < -0.5 and abs(x) < 0.05: c = mix(c, DARK, 0.85)                           # the tail tip
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.075, ph(0, 76)[1], ph(372, 0)[0]), 0.017, 'head', '#3a2412', (sx, 0.25, 0.7))
nose = Part('nose', bone='head', mat=1, color=srgb('#141010')); nose.add(*ellipsoid((0, ph(0, 101)[1], ph(408, 0)[0]), (0.028, 0.02, 0.018), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=38, run_amp=40, bob=0.02, drop=0.35, head_eat=32, neck_eat=36, look=22, tailsw=12, earflick=20,
                                frames=dict(walk=32, run=16, idle=150, eat=60, sleep=130)))
blobs = organic(blobs, 17)   # 1.11 (Avi): not two mirrored halves of clean parts
SPEC = dict(id='hyena', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.008, tris=5200, smooth=16, actions=acts,
            meta=dict(height=1.1, length=1.9, scale=0.94, speeds={'walk': 1.4, 'run': 9.0}, map={'sit': 'idle', 'swim': 'walk'}))
