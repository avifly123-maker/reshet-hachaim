# חילזון מדבר (Sphincterochila zonata) – a round chalk-white shell that sends the sun back, a pale grey body that
# comes out only after rain. Most of the year it sleeps inside the shell. The shell is one tube that winds round a
# low cone (no cross shapes anywhere).
own('desertsnail')   # modelled on its own: no family tweaks from the kit
WHITE, CREAM, GREY, GREY2 = srgb('#f6f3ec'), srgb('#e4ddcc'), srgb('#9a948a'), srgb('#7a746a')
bones = [('body', None, (0, 0.006, -0.03), (0, 0.006, 0.03)), ('head', 'body', (0, 0.008, 0.03), (0, 0.014, 0.055))]
blobs = [dict(t='cap', a=(0, 0.008, -0.03), b2=(0, 0.01, 0.04), r=(0.012, 0.013), bone='body'),     # the foot
         dict(t='ell', c=(0, 0.016, 0.046), r=(0.009, 0.009, 0.012), bone='head')]
parts = []
# the shell: a round, slightly flattened ball with a low spire on top and the opening at the front, low down; the
# spiral seam between the whorls is painted, so the shell reads as one smooth chalky dome
sh = Part('shell', bone='body', mat=1)
sh.add(*ellipsoid((0, 0.034, -0.008), (0.026, 0.023, 0.026), 26, 18))
sh.add(*ellipsoid((0, 0.055, -0.009), (0.01, 0.007, 0.01), 12, 8))           # the low spire
parts.append(sh)
lip = Part('lip', bone='body', color=srgb('#d8cfbe')); lip.add(*ellipsoid((0, 0.022, 0.018), (0.016, 0.012, 0.005), 12, 8)); parts.append(lip)
eye = Part('stalk', bone='head')
for sx in (1, -1):
    b = Vector((sx * 0.004, 0.022, 0.052))
    eye.add(*tube([tuple(b), tuple(b + Vector((sx * 0.004, 0.012, 0.006)))], [0.0016, 0.0013], 5))
    eye.add(*ellipsoid(tuple(b + Vector((sx * 0.0045, 0.0135, 0.0068))), (0.0022, 0.0022, 0.0022), 6, 4))
parts.append(eye)
def paint(P, N, tag):
    if tag == 'shell':
        c = mix(WHITE, CREAM, 0.25 + 0.25 * noise.noise(P * 400))
        th = math.atan2(P.z + 0.008, P.x) / (2 * math.pi); h = (P.y - 0.034) / 0.026
        f = (th + h * 1.6) % 1.0                                   # the spiral seam between the whorls
        c = mix(c, srgb('#a89e8a'), smooth(0.045, 0.0, min(f, 1 - f)) * smooth(-0.5, 0.1, h) * 0.9)
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
