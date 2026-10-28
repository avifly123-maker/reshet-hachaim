# חילזון מדבר (Sphincterochila zonata) – a round chalk-white shell that sends the sun back, a pale grey body that
# comes out only after rain. Most of the year it sleeps inside the shell. The shell is one tube that winds round a
# low cone (no cross shapes anywhere).
WHITE, CREAM, GREY, GREY2 = srgb('#f6f3ec'), srgb('#e4ddcc'), srgb('#9a948a'), srgb('#7a746a')
bones = [('body', None, (0, 0.006, -0.03), (0, 0.006, 0.03)), ('head', 'body', (0, 0.008, 0.03), (0, 0.014, 0.055))]
blobs = [dict(t='cap', a=(0, 0.008, -0.03), b2=(0, 0.01, 0.04), r=(0.012, 0.013), bone='body'),     # the foot
         dict(t='ell', c=(0, 0.016, 0.046), r=(0.009, 0.009, 0.012), bone='head')]
parts = []
# the shell: a tube that grows as it winds round and down a low cone
pts, rad = [], []
for i in range(70):
    t = i / 69; a = t * math.pi * 2 * 2.6; R = 0.004 + 0.018 * t
    pts.append((math.cos(a) * R * 0.95, 0.052 - 0.026 * t, -0.008 + math.sin(a) * R))
    rad.append(0.003 + 0.013 * t)
sh = Part('shell', bone='body', mat=1); sh.add(*tube(pts, rad, 10)); parts.append(sh)
eye = Part('stalk', bone='head')
for sx in (1, -1):
    b = Vector((sx * 0.004, 0.022, 0.052))
    eye.add(*tube([tuple(b), tuple(b + Vector((sx * 0.004, 0.012, 0.006)))], [0.0016, 0.0013], 5))
    eye.add(*ellipsoid(tuple(b + Vector((sx * 0.0045, 0.0135, 0.0068))), (0.0022, 0.0022, 0.0022), 6, 4))
parts.append(eye)
def paint(P, N, tag):
    if tag == 'shell':
        c = mix(WHITE, CREAM, 0.3 + 0.3 * noise.noise(P * 400))
        return c
    return mix(GREY, GREY2, 0.4 + 0.3 * noise.noise(P * 300))
def S(x): return math.sin(TAU * x)
def walk(ph): return {'head': (4 * S(ph), 6 * S(ph * 0.5), 0), 'body': ((0, 0, 0), (0, 0, 0))}
def idle(ph): return {'head': (6 * S(ph), 10 * S(ph * 0.5), 0)}
def eat(ph): return {'head': (15 + 8 * S(ph * 2), 0, 0)}
def sleep(ph): return {'head': (-40, 0, 0)}      # pulled back into the shell
SPEC = dict(id='desertsnail', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.0015, tris=1200, skin='shell',
            noLids=True, actions={'walk': (60, walk), 'idle': (90, idle), 'eat': (48, eat), 'sleep': (90, sleep)},
            meta=dict(rough=0.3, height=0.07, length=0.08, speeds={'walk': 0.02, 'run': 0.03}, map={'run': 'walk', 'sit': 'sleep', 'swim': 'walk', 'climb': 'walk'}))
