# חילזון מדבר (Sphincterochila zonata) – a round chalk-white shell that sends the sun back, a pale grey body that
# comes out only after rain. Most of the year it sleeps inside the shell. The shell is one tube that winds round a
# low cone (no cross shapes anywhere).
own('desertsnail')   # modelled on its own: no family tweaks from the kit
WHITE, CREAM, GREY, GREY2 = srgb('#f6f3ec'), srgb('#e4ddcc'), srgb('#9a948a'), srgb('#7a746a')
bones = [('body', None, (0, 0.006, -0.03), (0, 0.006, 0.03)), ('head', 'body', (0, 0.008, 0.03), (0, 0.014, 0.055))]
blobs = [dict(t='cap', a=(0, 0.006, -0.036), b2=(0, 0.009, 0.03), r=(0.0045, 0.0105), bone='body'),   # the foot, thin at the tail
         dict(t='ell', c=(0, 0.007, 0.0), r=(0.012, 0.006, 0.03), bone='body'),                      # the flat sole
         dict(t='ell', c=(0.004, 0.017, 0.01), r=(0.011, 0.008, 0.009), bone='body'),                 # the body going into the shell
         dict(t='ell', c=(0, 0.013, 0.041), r=(0.0085, 0.0085, 0.011), bone='head')]
parts = []
# the shell: one smooth closed dome (Sphincterochila is round, with a low spire), dense enough to carry real
# geometry: the suture between the whorls is a groove cut along a logarithmic spiral seen from above, the inner
# whorls rise a little (the low spire), and the colour follows the whorls (chalk white with two faint brown bands
# on each, the bands that give zonata its name). The opening is a thick cream lip at the front, low on the right,
# and the body goes into it, so the shell never looks hollow.
SC, SR = Vector((0, 0.03, -0.01)), (0.026, 0.021, 0.026)
GRW = 1.75                                                   # each whorl is this much wider than the one inside it
def whorl(P):
    q = P - SC; rho = math.hypot(q.x, q.z) / SR[0]
    if rho < 1e-4: return 0.0, rho
    phi = math.atan2(q.z, q.x) / TAU
    return (-math.log(max(rho, 1e-4)) / math.log(GRW) - phi), rho
AD = Vector((0.3, -0.55, 0.78)).normalized()               # where the opening faces: forward, down, a little right
ACOS = 0.8                                                    # how big the opening is (cosine of its angular radius)
def shell_part(seg=64, ring=40):
    V, F = ellipsoid(tuple(SC), SR, seg, ring)
    C = []; out = []
    for v in V:
        P = Vector(v); q = P - SC; u, rho = whorl(P)
        top = max(0.0, q.y / SR[1])
        f = u % 1.0; dist = min(f, 1 - f)
        on = smooth(0.15, 0.4, top) * smooth(0.02, 0.1, rho)       # the coils show on the upper side
        groove = smooth(0.14, 0.0, dist) * on
        bulge = math.sin(math.pi * f) * on                           # each whorl is rounded between two seams
        n = q.normalized() if q.length > 1e-6 else Vector((0, 1, 0))
        hole = smooth(ACOS - 0.04, ACOS + 0.02, n.dot(AD))              # the opening, filled by the body
        P = P - n * (0.0014 * groove - 0.0007 * bulge + 0.003 * hole) + Vector((0, 0.003, 0)) * smooth(0.5, 0.0, rho) * top
        out.append(tuple(P))
        c = mix(WHITE, CREAM, 0.15 + 0.3 * noise.noise(P * 500))
        band = smooth(0.15, 0.45, top + 0.35)
        c = mix(c, srgb('#b9a585'), 0.4 * smooth(0.07, 0.0, abs(f - 0.33)) * band)
        c = mix(c, srgb('#cbb999'), 0.3 * smooth(0.05, 0.0, abs(f - 0.62)) * band)
        c = mix(c, srgb('#8f8572'), 0.7 * groove)
        C.append(mix(c, GREY2, hole))
    return out, F, C
sh = Part('shell', bone='body', mat=1); sh.add(*shell_part()); parts.append(sh)
# the lip of the opening: a thick cream ring lying on the shell round the opening
lip = Part('lip', bone='body', color=srgb('#efe7d6'))
LU = AD.cross(Vector((0, 1, 0))).normalized(); LW = LU.cross(AD).normalized()
sa = math.sqrt(1 - ACOS * ACOS); pts = []
for i in range(33):
    a = TAU * i / 32; d = (AD * ACOS + (LU * math.cos(a) + LW * math.sin(a)) * sa).normalized()
    pts.append(tuple(SC + Vector((d.x * SR[0], d.y * SR[1], d.z * SR[2])) * 1.01))
lip.add(*tube(pts, [0.0017] * 33, 8, False, False)); parts.append(lip)
eye = Part('stalk', bone='head', color=GREY2)
for sx in (1, -1):                       # the long upper pair with the small dark eyes at the tips, and a short lower pair
    b = Vector((sx * 0.0035, 0.018, 0.047))
    eye.add(*tube([tuple(b), tuple(b + Vector((sx * 0.003, 0.008, 0.005))), tuple(b + Vector((sx * 0.005, 0.014, 0.008)))], [0.0013, 0.0010, 0.0008], 6))
    tip = ellipsoid(tuple(b + Vector((sx * 0.0052, 0.0148, 0.0084))), (0.0013, 0.0013, 0.0013), 6, 4)
    eye.add(*tip, [srgb('#2a2622')] * len(tip[0]))
    c = Vector((sx * 0.004, 0.009, 0.05))
    eye.add(*tube([tuple(c), tuple(c + Vector((sx * 0.002, -0.001, 0.004)))], [0.0009, 0.0006], 5))
parts.append(eye)
def paint(P, N, tag):
    return mix(GREY, GREY2, 0.4 + 0.3 * noise.noise(P * 300))
def S(x): return math.sin(TAU * x)
def walk(ph): return {'head': (4 * S(ph), 6 * S(ph * 0.5), 0), 'body': ((0, 0, 0), (0, 0, 0))}
def idle(ph): return {'head': (6 * S(ph), 10 * S(ph * 0.5), 0)}
def eat(ph): return {'head': (15 + 8 * S(ph * 2), 0, 0)}
def sleep(ph): return {'head': (-40, 0, 0)}      # pulled back into the shell
SPEC = dict(id='desertsnail', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=False, res=0.0015, tris=1200, skin='shell',
            noLids=True, actions={'walk': (60, walk), 'idle': (90, idle), 'eat': (48, eat), 'sleep': (90, sleep)},
            meta=dict(rough=0.3, height=0.07, length=0.08, speeds={'walk': 0.02, 'run': 0.03}, map={'run': 'walk', 'sit': 'sleep', 'swim': 'walk', 'climb': 'walk'}))
