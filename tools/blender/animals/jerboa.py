# ירבוע (Jaculus jaculus) – modelled on its own: a small sandy body carried half upright on very long back legs (a big
# thigh, a long shin and a long narrow foot), tiny front paws held under the chin, a big round head with huge dark eyes
# and long ears grown from the skull, a tail longer than the body that ends in a black and white tuft and balances the
# hops. Sandy back, white belly, a pale stripe across the hip. It moves by hopping.
own('jerboa')   # modelled on its own: no family tweaks from the kit
blobs = [
    dict(t='ell', c=(0, 0.075, -0.02), r=(0.04, 0.044, 0.054), rot=(-30, 0, 0), bone='hips'),     # the haunches
    dict(t='ell', c=(0, 0.1, 0.02), r=(0.028, 0.032, 0.034), rot=(-35, 0, 0), bone='chest'),
    dict(t='ell', c=(0, 0.128, 0.05), r=(0.027, 0.026, 0.03), bone='head'),                       # a big round head
    dict(t='cap', a=(0, 0.125, 0.062), b2=(0, 0.117, 0.083), r=(0.017, 0.008), bone='head'),       # the short snout
]
bones = [('hips', None, (0, 0.07, -0.05), (0, 0.09, 0.0)), ('chest', 'hips', (0, 0.09, 0.0), (0, 0.115, 0.035)),
         ('head', 'chest', (0, 0.118, 0.04), (0, 0.118, 0.085))]
for sx, L in ((1, 'l'), (-1, 'r')):
    hip = Vector((sx * 0.026, 0.07, -0.03)); knee = Vector((sx * 0.03, 0.05, 0.012)); ank = Vector((sx * 0.03, 0.012, -0.045)); toe = Vector((sx * 0.031, 0.004, 0.02))
    blobs += [dict(t='ell', c=tuple((hip + knee) / 2), r=(0.016, 0.03, 0.024), rot=(40, 0, 0), bone='h' + L),       # the big thigh
              dict(t='cap', a=tuple(knee), b2=tuple(ank), r=(0.009, 0.0055), bone='h' + L + '2'),                 # the long shin
              dict(t='cap', a=tuple(ank), b2=tuple(toe), r=(0.0055, 0.004), bone='h' + L + '3', foot=True)]       # the long foot
    bones += [('h' + L, 'hips', tuple(hip), tuple(knee)), ('h' + L + '2', 'h' + L, tuple(knee), tuple(ank)), ('h' + L + '3', 'h' + L + '2', tuple(ank), tuple(toe))]
    sh = Vector((sx * 0.014, 0.095, 0.035)); paw = Vector((sx * 0.012, 0.082, 0.052))
    blobs.append(dict(t='cap', a=tuple(sh), b2=tuple(paw), r=(0.005, 0.0035), bone='f' + L))
    bones.append(('f' + L, 'chest', tuple(sh), tuple(paw)))
TAILP = [(0, 0.07, -0.065), (0, 0.06, -0.13), (0, 0.045, -0.2), (0, 0.032, -0.27), (0, 0.03, -0.32)]
bones += chain('tail', TAILP, 'hips')
E = blob_ears(blobs, bones, base=(0.013, 0.148, 0.04), d=(0.35, 1, -0.35), H=0.052, w=0.016, t=0.003, tip=0.5, n=5, turn=25)
EYE['jerboa'] = ('#0a0806', 'round', 0.92, 0.75)

SAND, SAND2, WHITE, PINK, STRIPE = srgb('#d4a870'), srgb('#bb8e58'), srgb('#f6f0e6'), srgb('#e4b2a4'), srgb('#efe2c8')
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    n = noise.noise(Vector((x * 120, y * 120, z * 120)))
    c = mix(SAND, SAND2, 0.35 + 0.3 * n)
    if e: return mix(c, PINK, e[2] * 0.8)
    c = mix(c, WHITE, smooth(-0.2, -0.6, N.y) * 0.85)                                       # white belly and the inside of the legs
    if y < 0.03: c = mix(c, WHITE, 0.6)                                                     # pale feet
    hs = abs((y - 0.072) - (z + 0.03) * 0.5)                                               # the pale hip stripe, a soft curve
    if abs(x) > 0.02: c = mix(c, STRIPE, smooth(0.008, 0.002, hs) * smooth(-0.07, -0.04, z) * smooth(0.0, -0.02, z) * 0.6)
    if z > 0.06 and y < 0.122: c = mix(c, WHITE, 0.6)                                       # white chin and lips
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.018, 0.135, 0.068), 0.0075, 'head', '#0a0806', (sx, 0.15, 0.6))
    parts.append(whiskers((sx * 0.008, 0.115, 0.082), sx, 'head', 5, 0.04, srgb('#3a3028')))
nose = Part('nose', bone='head', mat=1, color=srgb('#c98d86')); nose.add(*ellipsoid((0, 0.117, 0.085), (0.004, 0.0035, 0.003), 8, 5)); parts.append(nose)
parts.append(tail_part('tail', 4, TAILP, 0.004, 0.0028, 6, 24, colfn=lambda t: mix(SAND2, srgb('#1a1612'), smooth(0.7, 0.78, t)) if t < 0.9 else WHITE))
tuft = Part('tuft', bone='tail4', color=WHITE); tuft.add(*ellipsoid((0, 0.03, -0.33), (0.012, 0.01, 0.032), 8, 6)); parts.append(tuft)

def S(x): return math.sin(TAU * x)
def hop(ph, h=0.02, amp=1.0):
    k = max(0.0, S(ph)); ext = 40 * amp * k                      # the legs open and kick, the body flies, the tail balances
    return {'hips': ((-8 * k, 0, 0), (0, h * k, 0)), 'hl': (-ext, 0, 0), 'hr': (-ext, 0, 0), 'hl2': (ext * 1.2, 0, 0), 'hr2': (ext * 1.2, 0, 0),
            'hl3': (-ext * 0.8, 0, 0), 'hr3': (-ext * 0.8, 0, 0), 'tail1': (8 * k, 0, 0), 'tail2': (6 * k, 0, 0), 'head': (6 * k, 0, 0)}
def walk(ph): return hop(ph, 0.02, 0.8)
def run(ph): return hop(ph, 0.05, 1.2)
def idle(ph):
    return {'head': (6 * S(ph * 3), 12 * S(ph), 0), 'earL': (8 * max(0, S(ph * 2)), 0, 0), 'earR': (8 * max(0, S(ph * 2 + 0.4)), 0, 0), 'tail3': (0, 6 * S(ph), 0)}
def eat(ph):      # the front paws bring a seed to the mouth
    return {'head': (14 + 6 * S(ph * 4), 0, 0), 'fl': (-30 + 10 * S(ph * 4), 0, 0), 'fr': (-30 + 10 * S(ph * 4), 0, 0)}
def sleep(ph):    # curled up, the tail around the body
    return {'hips': ((25, 0, 0), (0, -0.02, 0)), 'chest': (30, 0, 0), 'head': (35, 0, 0), 'tail1': (0, 40, 0), 'tail2': (0, 40, 0), 'tail3': (0, 40, 0)}
SPEC = dict(id='jerboa', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0024, tris=2000, smooth=12,
            actions={'idle': (120, idle), 'walk': (14, walk), 'run': (10, run), 'eat': (60, eat), 'sleep': (90, sleep)},
            meta=dict(height=0.2, length=0.42, speeds={'walk': 0.7, 'run': 2.5}, map={'swim': 'walk', 'sit': 'eat'}))
