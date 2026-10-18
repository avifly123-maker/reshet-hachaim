# lab_hd.py – מעבדת רובו־דע in full quality: the room is modelled and lit in Blender and rendered with Cycles, one
# picture per station (like the Eilat panorama); in the game the robot and the fish are drawn live on top, with the
# same cameras. Exec into its own namespace after bridge/session.py (it needs D = the animals folder).
#   lab_hd_build()                       builds scene 'lab_hd' (geometry, materials, lights, cameras)
#   lab_hd_render(station, pct, samples, final)   async Cycles render → lab/st_<station>.png (final) or animals/pv/lab_<station>.png
#   lab_hd_cams()                        lab/lab_cams.json: every station's camera (three's axes), the robot spot, the aquarium box
# Layout (metres, Z up, the game gets x, z, -y): a round wood-and-glass field station, radius 5 m, on the shore of
# the Gulf of Eilat (the Blender panorama of the gulf is outside the windows).
#   windows 30°..150° (+Y)   microscope desk 58°   atlas lectern 122°   aquarium 185°   cabinet 318°   greenhouse 0°
#   door 270°   inventors table in the centre   the robot's charging pad 235°
# No cross shapes: window bars only vertical, no shelf dividers in the middle, doors with a round window, no clock.
import bpy, bmesh, math, json, os, random, time
import numpy as np
from mathutils import Vector, Matrix

ROOT = os.path.dirname(D)
LD = os.path.join(ROOT, 'lab'); os.makedirs(LD, exist_ok=True)
PV = os.path.join(D, 'pv')
TAU = math.tau
R = 5.0; H = 3.0; SILL, HEAD = 0.75, 2.65
WIN = (30.0, 150.0); DOOR = (263.0, 277.0)
PANO_ROT = 180.0      # degrees: which way of the gulf the windows look at

def V(*a): return Vector(a)
def polar(a, r, z=0.0): a = math.radians(a); return Vector((r * math.cos(a), r * math.sin(a), z))
T = lambda x, y, z: Matrix.Translation((x, y, z))
TV = lambda v: Matrix.Translation(v)
RX = lambda a: Matrix.Rotation(math.radians(a), 4, 'X')
RY = lambda a: Matrix.Rotation(math.radians(a), 4, 'Y')
RZ = lambda a: Matrix.Rotation(math.radians(a), 4, 'Z')
def S(x, y=None, z=None): return Matrix.Diagonal((x, x if y is None else y, x if z is None else z, 1))
I4 = Matrix()
def place(a, r, z=0.0): return TV(polar(a, r, z)) @ RZ(a - 90)     # local -Y faces the room centre
def sgnpow(x, e): return math.copysign(abs(x) ** e, x)

# ═══════════════════════════════════════════ geometry builder (pure python, so it can be checked outside Blender)
OBJS = []
class Obj:
    def __init__(self, name, mat, M=I4, bevel=0.0, seg=3, sub=0, smooth=True, sharp=40, angle=40):
        self.name, self.mat, self.M = name, mat, M
        self.bevel, self.seg, self.sub, self.smooth, self.sharp, self.angle = bevel, seg, sub, smooth, sharp, angle
        self.V, self.F, self.UV = [], [], {}
        self.json = None; self.disp = None
    # all prims take a local matrix L (inside the object's frame)
    def _rows(self, rows, L, closed=True, flip=False, uv=False):
        base = len(self.V); w = len(rows[0]); n = len(rows)
        for row in rows:
            for p in row: self.V.append(L @ Vector(p))
        for j in range(n - 1):
            for i in range(w if closed else w - 1):
                a = base + j * w + i; b = base + j * w + (i + 1) % w
                f = [a, b, b + w, a + w]
                if flip: f = f[::-1]
                self.F.append(f)
                if uv:
                    uu = lambda k: (((k - base) % w) / (w - 1 if not closed else w), ((k - base) // w) / (n - 1))
                    self.UV[len(self.F) - 1] = [uu(k) for k in f]
        return self
    def box(self, size, L=I4):
        x, y, z = (s / 2 for s in size)
        b = len(self.V)
        for p in ((-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z), (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)): self.V.append(L @ Vector(p))
        for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)): self.F.append([b + k for k in f])
        return self
    def prism(self, poly, h, L=I4):
        """extrude a polygon [(x, y)] (counter-clockwise) up by h"""
        b = len(self.V); n = len(poly)
        for z in (0, h):
            for x, y in poly: self.V.append(L @ Vector((x, y, z)))
        self.F.append([b + k for k in range(n)][::-1]); self.F.append([b + n + k for k in range(n)])
        for k in range(n): self.F.append([b + k, b + (k + 1) % n, b + n + (k + 1) % n, b + n + k])
        return self
    def lathe(self, prof, L=I4, seg=48, a0=0.0, a1=None, cap=False):
        full = a1 is None
        a1 = TAU if full else a1
        cnt = seg if full else seg + 1
        rows = [[(r * math.cos(a0 + (a1 - a0) * i / seg), r * math.sin(a0 + (a1 - a0) * i / seg), z) for i in range(cnt)] for r, z in prof]
        return self._rows(rows, L, closed=full)
    def cyl(self, r, h, L=I4, seg=32, r2=None, caps=True):
        r2 = r if r2 is None else r2
        prof = [(r, -h / 2), (r2, h / 2)]
        if caps: prof = [(0.0, -h / 2)] + prof + [(0.0, h / 2)]
        return self.lathe(prof, L, seg)
    def sphere(self, r, L=I4, seg=32, rings=16, sc=(1, 1, 1)):
        rows = [[(r * sc[0] * math.sin(math.pi * j / rings) * math.cos(TAU * i / seg), r * sc[1] * math.sin(math.pi * j / rings) * math.sin(TAU * i / seg), -r * sc[2] * math.cos(math.pi * j / rings)) for i in range(seg)] for j in range(rings + 1)]
        return self._rows(rows, L)
    def superell(self, a, b, c, e1, e2, L=I4, nu=48, nv=24):
        rows = []
        for j in range(nv + 1):
            v = -math.pi / 2 + math.pi * j / nv; cv = sgnpow(math.cos(v), e1)
            rows.append([(a * cv * sgnpow(math.cos(TAU * i / nu), e2), b * cv * sgnpow(math.sin(TAU * i / nu), e2), c * sgnpow(math.sin(v), e1)) for i in range(nu)])
        return self._rows(rows, L)
    def tube(self, pts, r, L=I4, seg=12, r1=None):
        pts = [Vector(p) for p in pts]; n = len(pts); rows = []
        for k, p in enumerate(pts):
            d = (pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]).normalized(); q = d.to_track_quat('Z', 'Y')
            rr = r if r1 is None else r + (r1 - r) * k / (n - 1)
            rows.append([tuple(p + q @ Vector((rr * math.cos(TAU * i / seg), rr * math.sin(TAU * i / seg), 0))) for i in range(seg)])
        return self._rows(rows, L)
    def grid(self, fn, nu, nv, L=I4, uv=False, flip=False):
        rows = [[fn(i / nu, j / nv) for i in range(nu + 1)] for j in range(nv + 1)]
        return self._rows(rows, L, closed=False, uv=uv, flip=flip)
    def plane(self, w, h, L=I4, uv=True, nu=1, nv=1):
        return self.grid(lambda u, v: (-w / 2 + w * u, -h / 2 + h * v, 0.0), nu, nv, L, uv=uv)
    def disk(self, r, L=I4, seg=48, rings=1):
        rows = [[(r * (1 - j / rings) * math.cos(TAU * i / seg), r * (1 - j / rings) * math.sin(TAU * i / seg), 0.0) for i in range(seg)] for j in range(rings + 1)]
        return self._rows(rows, L)

def O(name, mat, M=I4, **kw):
    o = Obj(name, mat, M, **kw); OBJS.append(o); return o

# ═══════════════════════════════════════════ the room
def shell():
    # floor: one big disc under everything (planks come from the material)
    O('floor', 'floor').disk(R + 0.2, seg=128, rings=6)
    # upper walls: plaster, a ring of 3° columns with openings for the windows and the door
    up = O('wall', 'plaster', smooth=True)
    seg = 120
    for k in range(seg):
        a0, a1 = 360.0 * k / seg, 360.0 * (k + 1) / seg; am = (a0 + a1) / 2
        spans = [(0.95, H)]
        if WIN[0] <= am <= WIN[1]: spans = [(HEAD, H)]
        if DOOR[0] <= am <= DOOR[1]: spans = [(2.2, H)]
        pa, pb = polar(a0, R), polar(a1, R)
        for z0, z1 in spans:
            up.grid(lambda u, v, pa=pa, pb=pb, z0=z0, z1=z1: (pa.x + (pb.x - pa.x) * u, pa.y + (pb.y - pa.y) * u, z0 + (z1 - z0) * v), 1, 4, flip=True)
    # wainscot: vertical boards (bevelled, so the joints show) up to the chair rail, to the sill under the windows
    ws = O('wainscot', 'wood_wainscot', bevel=0.004, seg=2)
    for k in range(seg):
        a0, a1 = 360.0 * k / seg, 360.0 * (k + 1) / seg; am = (a0 + a1) / 2
        if DOOR[0] - 1 <= am <= DOOR[1] + 1: continue
        top = SILL - 0.04 if WIN[0] <= am <= WIN[1] else 0.95
        w = 2 * R * math.sin(math.radians(1.5))
        ws.box((w - 0.002, 0.022, top), TV(polar(am, R - 0.012, top / 2)) @ RZ(am - 90))
    # mouldings: skirting, chair rail, cornice (arcs that stop at the openings)
    def arcs(prof, mat, gaps, name):
        o = O(name, mat, smooth=True)
        cuts = sorted(gaps); start = cuts[-1][1] - 360
        for g0, g1 in cuts:
            o.lathe(prof, I4, max(8, int((g0 - start) / 2)), math.radians(start), math.radians(g0)); start = g1
        return o
    arcs([(R - 0.001, 0.0), (R - 0.025, 0.0), (R - 0.025, 0.1), (R - 0.016, 0.13), (R - 0.001, 0.13)], 'wood_dark', [DOOR], 'skirting')
    arcs([(R - 0.024, 0.91), (R - 0.042, 0.925), (R - 0.042, 0.95), (R - 0.03, 0.965), (R - 0.024, 0.985)], 'wood_dark', [DOOR, WIN], 'rail')
    O('cornice', 'wood_dark', smooth=True).lathe([(R - 0.001, H - 0.16), (R - 0.03, H - 0.13), (R - 0.06, H - 0.05), (R - 0.07, H), (R - 0.001, H)], seg=180)
    # windows: a deep curved sill, a header beam, vertical bars only, glass panes
    a0, a1 = math.radians(WIN[0]), math.radians(WIN[1])
    O('sill', 'wood_light', smooth=True, bevel=0.006).lathe([(R + 0.06, SILL - 0.045), (R - 0.3, SILL - 0.045), (R - 0.3, SILL), (R + 0.06, SILL)], seg=90, a0=a0, a1=a1)
    O('header', 'wood_dark', smooth=True, bevel=0.006).lathe([(R + 0.04, HEAD), (R - 0.09, HEAD), (R - 0.09, HEAD + 0.1), (R + 0.04, HEAD + 0.1)], seg=90, a0=a0, a1=a1)
    nwin = 10; da = (WIN[1] - WIN[0]) / nwin
    bars = O('winbars', 'wood_dark', bevel=0.008, seg=3)
    gl = O('winglass', 'glass_window', smooth=False)
    for k in range(nwin + 1):
        a = WIN[0] + da * k
        bars.box((0.075, 0.13, HEAD - SILL), TV(polar(a, R - 0.03, (SILL + HEAD) / 2)) @ RZ(a - 90))
    for k in range(nwin):
        am = WIN[0] + da * (k + 0.5); w = 2 * (R - 0.03) * math.sin(math.radians(da / 2))
        gl.plane(w - 0.06, HEAD - SILL - 0.02, TV(polar(am, R - 0.02, (SILL + HEAD) / 2)) @ RZ(am - 90) @ RX(90), uv=False)
    # the door: boards, a round window, a brass handle, a frame
    Md = TV(polar(270, R - 0.03)) @ RZ(270 - 90)
    dw = 2 * R * math.sin(math.radians((DOOR[1] - DOOR[0]) / 2))
    door = O('door', 'wood_warm', bevel=0.004, seg=2)
    for k in range(6):
        x = -dw / 2 + dw * (k + 0.5) / 6
        if abs(x) < 0.27:
            door.box((dw / 6 - 0.004, 0.05, 1.3), Md @ T(x, 0, 0.65)); door.box((dw / 6 - 0.004, 0.05, 0.4), Md @ T(x, 0, 2.0))
        else: door.box((dw / 6 - 0.004, 0.05, 2.2), Md @ T(x, 0, 1.1))
    O('doorring', 'brass', smooth=True, bevel=0.003).lathe([(0.2, -0.035), (0.21, 0.0), (0.2, 0.035), (0.165, 0.035), (0.165, -0.035), (0.2, -0.035)], Md @ T(0, 0, 1.52) @ RX(90), 48)
    O('doorglass', 'glass_window', smooth=False).disk(0.168, Md @ T(0, 0, 1.52) @ RX(90), 40)
    O('doorknob', 'brass', smooth=True).sphere(0.035, Md @ T(dw / 2 - 0.12, -0.05, 1.05), 20, 10)
    fr = O('doorframe', 'wood_dark', bevel=0.006)
    fr.box((dw + 0.2, 0.1, 0.1), Md @ T(0, -0.01, 2.25))
    for s in (-1, 1): fr.box((0.1, 0.1, 2.25), Md @ T(s * (dw / 2 + 0.05), -0.01, 1.125))
    # roof: a cone of boards (rings in the material), rafters ending at a compression ring, a glass skylight dome
    r1, z1 = 1.15, 4.3
    O('roof', 'roof', smooth=True).grid(lambda u, v: ((R + (r1 - R) * v) * math.cos(TAU * u), (R + (r1 - R) * v) * math.sin(TAU * u), H + (z1 - H) * v), 160, 12)
    slope = math.degrees(math.atan2(z1 - H, R - r1)); Lr = math.hypot(R - r1, z1 - H)
    raf = O('rafters', 'wood_dark', bevel=0.012, seg=3)
    for k in range(16):
        a = 360.0 * k / 16 + 11.25
        raf.box((Lr, 0.11, 0.17), TV(polar(a, (R + r1) / 2, (H + z1) / 2 - 0.11)) @ RZ(a) @ RY(slope))
    O('ring', 'wood_dark', smooth=True, bevel=0.01).lathe([(r1 + 0.14, z1 - 0.3), (r1 + 0.14, z1 + 0.03), (r1 - 0.02, z1 + 0.03), (r1 - 0.02, z1 - 0.3), (r1 + 0.14, z1 - 0.3)], seg=96)
    O('skylight', 'glass_window', smooth=True).superell(r1, r1, 0.4, 0.9, 1.0, T(0, 0, z1 + 0.03), 64, 16)
    # the rug under the table (rings in its material)
    O('rug', 'rug', smooth=True, bevel=0.006).cyl(1.8, 0.012, T(0, 0.3, 0.006), 128)

def pendant(x, y):
    zc = 2.35
    O('cord%g' % x, 'black', smooth=True).cyl(0.005, 4.2 - zc - 0.2, T(x, y, zc + 0.2 + (4.2 - zc - 0.2) / 2), 8, caps=False)
    O('cap%g' % x, 'brass', smooth=True).lathe([(0.0, 0.26), (0.03, 0.26), (0.034, 0.2), (0.022, 0.19), (0.0, 0.19)], T(x, y, zc), 32)
    O('shade%g' % x, 'enamel_teal', smooth=True).lathe([(0.025, 0.19), (0.05, 0.18), (0.12, 0.12), (0.18, 0.035), (0.2, 0.0), (0.195, -0.004)], T(x, y, zc), 64)
    O('shadein%g' % x, 'enamel_white', smooth=True).lathe([(0.193, -0.002), (0.176, 0.033), (0.117, 0.115), (0.048, 0.172), (0.024, 0.18)], T(x, y, zc), 64)
    O('bulb%g' % x, 'bulb', smooth=True).sphere(0.05, T(x, y, zc + 0.06), 24, 12, sc=(1, 1, 1.15))

def gear(name, r, teeth, h, L):
    poly = []
    for k in range(teeth * 4):
        a = TAU * k / (teeth * 4); rr = r if (k % 4) in (0, 1) else r * 0.86
        poly.append((rr * math.cos(a), rr * math.sin(a)))
    g = O(name, 'brass', bevel=0.0015, seg=2, smooth=True); g.prism(poly, h, L)
    O(name + 'hub', 'brass', smooth=True).cyl(r * 0.25, h * 1.6, L @ T(0, 0, h / 2), 24)

def table():
    M0 = T(0, 0.3, 0)
    O('tabletop', 'wood_warm', bevel=0.012, seg=4, smooth=True).cyl(1.0, 0.055, M0 @ T(0, 0, 0.82) @ S(1.25, 0.75, 1), 96)
    O('apron', 'wood_dark', smooth=True).cyl(0.93, 0.07, M0 @ T(0, 0, 0.76) @ S(1.25, 0.75, 1), 96, caps=False)
    legs = O('legs', 'wood_dark', smooth=True)
    prof = [(0.0, 0.0), (0.04, 0.0), (0.045, 0.03), (0.03, 0.08), (0.034, 0.4), (0.042, 0.45), (0.038, 0.52), (0.048, 0.68), (0.05, 0.74), (0.0, 0.75)]
    for sx, sy in ((-0.86, -0.42), (0.86, -0.42), (-0.86, 0.42), (0.86, 0.42)): legs.lathe(prof, M0 @ T(sx, sy, 0.0), 32)
    O('shelf', 'wood_warm', bevel=0.008, smooth=True).cyl(0.9, 0.03, M0 @ T(0, 0, 0.2) @ S(1.15, 0.62, 1), 80)
    bins = O('bins', 'plastic_bins', bevel=0.01, seg=3)
    for k in range(4): bins.box((0.34, 0.26, 0.14), M0 @ T(-0.55 + k * 0.37, 0.0, 0.29))
    top = 0.85
    # the blueprint and a notebook
    O('blueprint', 'img_blueprint', smooth=False).plane(0.84, 0.58, M0 @ T(-0.3, -0.04, top + 0.001) @ RZ(-5))
    O('notebook', 'leather_green', bevel=0.003).box((0.22, 0.3, 0.018), M0 @ T(0.95, -0.25, top + 0.009) @ RZ(14))
    O('nbpages', 'img_notes', smooth=False).plane(0.2, 0.28, M0 @ T(0.95, -0.25, top + 0.0185) @ RZ(14))
    # the underwater robot model waiting for its shark-skin coat
    Mr = M0 @ T(0.38, 0.2, top) @ RZ(28)
    rov = O('rovframe', 'paint_yellow', bevel=0.004)
    for x in (-0.13, 0.13):
        for z in (0.03, 0.13): rov.box((0.022, 0.34, 0.022), Mr @ T(x, 0, z))
        for y in (-0.16, 0.16): rov.box((0.022, 0.022, 0.12), Mr @ T(x, y, 0.08))
    O('rovfloat', 'plastic_white', bevel=0.012, seg=3).box((0.3, 0.36, 0.055), Mr @ T(0, 0, 0.17))
    O('rovbottle', 'metal', smooth=True).cyl(0.045, 0.28, Mr @ T(0, 0.0, 0.08) @ RX(90), 32)
    O('rovdome', 'glass_clear', smooth=True).sphere(0.048, Mr @ T(0, -0.15, 0.08), 24, 12)
    for x in (-0.09, 0.09): O('rovthr%g' % x, 'black', smooth=True).lathe([(0.03, -0.03), (0.034, 0.0), (0.03, 0.03), (0.026, 0.03), (0.026, -0.03), (0.03, -0.03)], Mr @ T(x, 0.19, 0.08) @ RX(90), 24)
    # the flow tank (מכל הזרם)
    Mt = M0 @ T(0.15, -0.36, top) @ RZ(3)
    O('tankbase', 'black', bevel=0.006).box((0.74, 0.25, 0.035), Mt @ T(0, 0, 0.0175))
    O('tankglass', 'glass_clear', smooth=False).box((0.7, 0.21, 0.22), Mt @ T(0, 0, 0.145))
    O('tankwater', 'water_tank', smooth=False).box((0.69, 0.2, 0.17), Mt @ T(0, 0, 0.12))
    O('pump', 'metal', smooth=True, bevel=0.003).cyl(0.045, 0.1, Mt @ T(-0.42, 0, 0.085), 32)
    O('pumpcap', 'paint_teal', smooth=True).cyl(0.047, 0.03, Mt @ T(-0.42, 0, 0.15), 32)
    # gears, a tray of parts, pencils, a magnifier
    gear('gearA', 0.075, 14, 0.018, M0 @ T(-0.78, 0.25, top))
    gear('gearB', 0.048, 10, 0.016, M0 @ T(-0.64, 0.33, top) @ RZ(9))
    O('tray', 'wood_dark', bevel=0.004).box((0.3, 0.2, 0.04), M0 @ T(-0.78, -0.22, top + 0.02))
    parts = O('trayparts', 'plastic_mix', smooth=True)
    rng = random.Random(4)
    for k in range(12): parts.sphere(0.014, M0 @ T(-0.88 + 0.018 * k, -0.22 + rng.uniform(-0.06, 0.06), top + 0.046), 12, 6, sc=(1, 1, 0.8))
    pen = O('pencils', 'paint_yellow', smooth=True, sharp=30)
    for k in range(3):
        L = M0 @ T(-0.5 + 0.025 * k, 0.36, top + 0.006) @ RZ(68 + 9 * k) @ RY(90)
        pen.cyl(0.0055, 0.17, L, 6)
    tips = O('penciltips', 'wood_light', smooth=True)
    for k in range(3): tips.cyl(0.0055, 0.022, M0 @ T(-0.5 + 0.025 * k, 0.36, top + 0.006) @ RZ(68 + 9 * k) @ RY(90) @ T(0, 0, 0.096), 6, r2=0.0)
    # the desk lamp
    Ml = M0 @ T(0.92, 0.28, top)
    O('lampbase', 'paint_teal', smooth=True, bevel=0.004).lathe([(0.0, 0.0), (0.08, 0.0), (0.085, 0.012), (0.06, 0.024), (0.02, 0.03), (0.0, 0.03)], Ml, 40)
    O('lamparm', 'metal', smooth=True).tube([(0, 0, 0.03), (0.04, 0, 0.3), (-0.08, 0, 0.44)], 0.009, Ml, 12)
    O('lamphead', 'paint_teal', smooth=True).lathe([(0.012, 0.0), (0.03, -0.005), (0.07, -0.07), (0.074, -0.082), (0.068, -0.082)], Ml @ T(-0.09, 0, 0.45) @ RY(-28), 40)
    O('lampbulb', 'bulb', smooth=True).sphere(0.024, Ml @ T(-0.11, 0, 0.405), 16, 8)
    # stools
    for a in (205, 335):
        p = Vector((1.62 * math.cos(math.radians(a)), 0.3 + 1.05 * math.sin(math.radians(a)), 0))
        O('stool%d' % a, 'fabric_teal', smooth=True, bevel=0.01, seg=4).cyl(0.2, 0.07, TV(p) @ T(0, 0, 0.5), 48)
        lg = O('stoolleg%d' % a, 'wood_dark', smooth=True)
        for k in range(3): lg.tube([(0.14 * math.cos(TAU * k / 3), 0.14 * math.sin(TAU * k / 3), 0.47), (0.2 * math.cos(TAU * k / 3), 0.2 * math.sin(TAU * k / 3), 0.0)], 0.017, TV(p), 10)
    for x in (-0.75, 0.0, 0.75): pendant(x, 0.3)

def microscope():
    M0 = place(58, 4.18)
    O('sdesk', 'wood_warm', bevel=0.01, seg=3).box((1.45, 0.66, 0.05), M0 @ T(0, 0, 0.78))
    d = O('sdesklegs', 'wood_dark', bevel=0.006)
    for sx in (-0.66, 0.66): d.box((0.06, 0.6, 0.755), M0 @ T(sx, 0, 0.3775))
    d.box((1.26, 0.03, 0.4), M0 @ T(0, 0.27, 0.55))
    top = 0.805
    Mm = M0 @ T(0, 0.04, top) @ S(1.5)
    O('mbase', 'enamel_white', smooth=True, bevel=0.004).superell(0.12, 0.16, 0.025, 0.25, 0.35, Mm @ T(0, 0.02, 0.025), 48, 16)
    O('mlight', 'bulb_soft', smooth=True).cyl(0.026, 0.01, Mm @ T(0, -0.06, 0.054), 32)
    O('marm', 'enamel_white', smooth=True).tube([(0, 0.11, 0.04), (0, 0.13, 0.12), (0, 0.125, 0.22), (0, 0.1, 0.31), (0, 0.06, 0.37)], 0.034, Mm, 24)
    O('mstage', 'black', smooth=True, bevel=0.003).cyl(0.085, 0.014, Mm @ T(0, -0.06, 0.17), 64)
    O('mstagearm', 'black', bevel=0.003).box((0.04, 0.1, 0.02), Mm @ T(0, 0.03, 0.17))
    O('mslide', 'glass_clear', smooth=False).box((0.075, 0.025, 0.002), Mm @ T(0, -0.065, 0.178))
    O('mcond', 'black', smooth=True).cyl(0.02, 0.05, Mm @ T(0, -0.06, 0.135), 32)
    O('mturret', 'chrome', smooth=True).lathe([(0.0, 0.0), (0.045, 0.004), (0.05, 0.016), (0.03, 0.032), (0.0, 0.034)], Mm @ T(0, -0.04, 0.27) @ RX(22) @ RX(180), 48)
    for k, c in enumerate(('band_red', 'band_yellow', 'band_blue')):
        L = Mm @ T(0, -0.04, 0.27) @ RX(22) @ RZ(120 * k) @ T(0.028, 0, -0.01) @ RY(14) @ RX(180)
        O('mobj%d' % k, 'chrome', smooth=True).lathe([(0.0, 0.0), (0.012, 0.0), (0.013, 0.03), (0.01, 0.05), (0.006, 0.055), (0.0, 0.055)], L, 24)
        O('mband%d' % k, c, smooth=True).cyl(0.0132, 0.005, L @ T(0, 0, 0.02), 24, caps=False)
    O('mhead', 'enamel_white', smooth=True).superell(0.045, 0.06, 0.04, 0.4, 0.4, Mm @ T(0, 0.0, 0.37), 32, 16)
    O('mtube', 'enamel_white', smooth=True).cyl(0.022, 0.12, Mm @ T(0, -0.04, 0.43) @ RX(-35), 32)
    O('meyepiece', 'rubber', smooth=True).lathe([(0.0, 0.0), (0.018, 0.0), (0.02, 0.03), (0.024, 0.045), (0.016, 0.047), (0.0, 0.046)], Mm @ T(0, -0.075, 0.48) @ RX(-35), 32)
    for s in (-1, 1):
        O('mknob%d' % s, 'black', smooth=True, bevel=0.002).lathe([(0.0, 0.0), (0.03, 0.0), (0.032, 0.006), (0.032, 0.016), (0.03, 0.022), (0.0, 0.022)], Mm @ T(s * 0.034, 0.13, 0.13) @ RY(s * 90), 40)
        O('mknobf%d' % s, 'chrome', smooth=True).cyl(0.016, 0.03, Mm @ T(s * 0.06, 0.13, 0.13) @ RY(90), 24)
    # sample box, petri dishes, notebook, magnifier
    O('slidebox', 'wood_dark', bevel=0.004).box((0.32, 0.2, 0.045), M0 @ T(-0.46, -0.06, top + 0.0225))
    sl = O('slides', 'glass_clear', smooth=False)
    for k in range(7): sl.box((0.028, 0.15, 0.003), M0 @ T(-0.58 + 0.04 * k, -0.06, top + 0.047) @ RX(8))
    lab = O('slidelabels', 'plastic_mix', smooth=False)
    for k in range(7): lab.box((0.024, 0.03, 0.0035), M0 @ T(-0.58 + 0.04 * k, -0.11, top + 0.05) @ RX(8))
    for k, (x, y) in enumerate(((0.42, -0.05), (0.55, 0.08))):
        O('petri%d' % k, 'glass_clear', smooth=True).lathe([(0.0, 0.0), (0.06, 0.0), (0.062, 0.002), (0.062, 0.016), (0.058, 0.016), (0.058, 0.004), (0.0, 0.004)], M0 @ T(x, y, top), 48)
    O('mnote', 'leather_blue', bevel=0.003).box((0.22, 0.29, 0.016), M0 @ T(0.3, 0.16, top + 0.008) @ RZ(-8))
    O('mnotep', 'img_notes', smooth=False).plane(0.2, 0.27, M0 @ T(0.3, 0.16, top + 0.0165) @ RZ(-8))
    O('magring', 'brass', smooth=True).lathe([(0.058, -0.006), (0.066, -0.006), (0.068, 0.0), (0.066, 0.006), (0.058, 0.006), (0.058, -0.006)], M0 @ T(0.52, -0.2, top + 0.007), 48)
    O('maglens', 'glass_clear', smooth=True).superell(0.059, 0.059, 0.005, 1, 1, M0 @ T(0.52, -0.2, top + 0.007), 48, 8)
    O('maghandle', 'wood_dark', smooth=True).cyl(0.012, 0.12, M0 @ T(0.6, -0.27, top + 0.012) @ RZ(-45) @ RY(90), 16)
    p = polar(58, 3.45)
    O('mstool', 'leather_brown', smooth=True, bevel=0.01, seg=4).cyl(0.2, 0.06, TV(p) @ T(0, 0, 0.56), 48)
    O('mstoolpole', 'chrome', smooth=True).cyl(0.03, 0.5, TV(p) @ T(0, 0, 0.28), 24)
    O('mstoolbase', 'black', smooth=True, bevel=0.006).lathe([(0.0, 0.0), (0.24, 0.0), (0.24, 0.015), (0.05, 0.04), (0.0, 0.04)], TV(p), 48)

def book_page_curve(w, h, s, L):
    """an open page: a curved sheet from the spine outward (s = -1 left, +1 right)"""
    return lambda u, v: (s * w * u, -h / 2 + h * v, 0.02 * math.sin(math.pi * u) + 0.012 * (1 - u))

def atlas():
    M0 = place(122, 3.95)
    O('lectbase', 'wood_dark', smooth=True, bevel=0.006).lathe([(0.0, 0.0), (0.26, 0.0), (0.27, 0.02), (0.22, 0.05), (0.0, 0.05)], M0, 48)
    O('lectpost', 'wood_dark', smooth=True).lathe([(0.0, 0.05), (0.06, 0.05), (0.05, 0.12), (0.04, 0.2), (0.045, 0.6), (0.055, 0.85), (0.08, 0.95), (0.0, 0.96)], M0, 32)
    Mt = M0 @ T(0, 0.0, 1.0) @ RX(22)
    O('lecttop', 'wood_warm', bevel=0.008).box((0.72, 0.5, 0.04), Mt)
    O('lectlip', 'wood_dark', bevel=0.004).box((0.72, 0.025, 0.05), Mt @ T(0, -0.26, 0.03))
    O('bookcover', 'leather_green', bevel=0.004, seg=3).box((0.66, 0.46, 0.012), Mt @ T(0, 0, 0.027))
    O('bookblock', 'paper_edge', bevel=0.002).box((0.62, 0.42, 0.03), Mt @ T(0, 0, 0.045))
    for s, img in ((-1, 'img_page_l'), (1, 'img_page_r')):
        O('page%d' % s, img, smooth=True).grid(book_page_curve(0.31, 0.42, s, None), 16, 2, Mt @ T(0, 0, 0.06), uv=True, flip=(s < 0))
    # the bookcase beside it
    Mb = place(141, R - 0.24)
    bc = O('bookcase', 'wood_dark', bevel=0.006)
    bc.box((1.24, 0.38, 0.045), Mb @ T(0, 0, 2.0)); bc.box((1.24, 0.38, 0.08), Mb @ T(0, 0, 0.04))
    for s in (-1, 1): bc.box((0.045, 0.38, 2.02), Mb @ T(s * 0.6, 0, 1.01))
    O('bcback', 'wood_warm').box((1.16, 0.015, 1.96), Mb @ T(0, 0.18, 1.0))
    rng = random.Random(3)
    sh = O('bcshelves', 'wood_dark', bevel=0.004)
    books = {c: O('books_' + c, 'book_' + c, bevel=0.003, seg=2) for c in ('green', 'blue', 'red', 'ochre', 'teal', 'brown', 'cream')}
    for k in range(5):
        z = 0.08 + 0.4 * k
        sh.box((1.16, 0.36, 0.03), Mb @ T(0, 0, z))
        if k == 4: continue
        x = -0.56
        while x < 0.5:
            bw = rng.uniform(0.03, 0.065); bh = rng.uniform(0.24, 0.33); c = rng.choice(list(books))
            if rng.random() < 0.08:   # a little stack lying flat
                for j in range(3): books[rng.choice(list(books))].box((0.2, 0.26, 0.035), Mb @ T(x + 0.1, 0.02, z + 0.033 + j * 0.036) @ RZ(rng.uniform(-6, 6)))
                x += 0.23; continue
            lean = rng.uniform(5, 12) if rng.random() < 0.07 else 0
            books[c].box((bw - 0.003, 0.24, bh), Mb @ T(x + bw / 2, 0.02, z + 0.015 + bh / 2) @ RY(lean))
            x += bw + (0.03 if lean else 0)
    shell_spiral('bcshell', Mb @ T(0.3, 0.0, 1.68 + 0.015) @ RZ(30), 0.06)
    pot_plant('bcplant', Mb @ T(-0.32, 0.0, 2.025), 0.45, random.Random(31))

def coral(name, cid, var, L, height):
    o = O(name, 'vcol', smooth=True); o.json = (cid, var, height); o.M = L; return o

def aquarium():
    M0 = place(185, 4.3)   # back corners stay inside the round wall (R 5)
    W_, Dp, Ht, base = 2.8, 0.8, 1.35, 0.8
    O('aqcab', 'wood_dark', bevel=0.008, seg=3).box((W_ + 0.08, Dp + 0.08, base - 0.02), M0 @ T(0, 0, (base - 0.02) / 2))
    pan = O('aqpanels', 'wood_warm', bevel=0.012, seg=3)
    for k in range(4): pan.box((W_ / 4 - 0.07, 0.025, base - 0.2), M0 @ T(-W_ / 2 + W_ / 8 + k * W_ / 4, -Dp / 2 - 0.045, (base - 0.02) / 2))
    kn = O('aqknobs', 'brass', smooth=True)
    for k in range(4): kn.sphere(0.018, M0 @ T(-W_ / 2 + W_ / 8 + k * W_ / 4 + (0.27 if k % 2 == 0 else -0.27), -Dp / 2 - 0.07, (base - 0.02) / 2), 16, 8)
    zt = base + Ht
    trim = O('aqtrim', 'black', bevel=0.004)
    for z, hh in ((base + 0.03, 0.06), (zt - 0.03, 0.06)):
        for s in (-1, 1):
            trim.box((W_ + 0.02, 0.03, hh), M0 @ T(0, s * Dp / 2, z)); trim.box((0.03, Dp + 0.02, hh), M0 @ T(s * W_ / 2, 0, z))
    ag = O('aqglass', 'glass_pane', smooth=False)   # front and both ends: a back pane would mirror the room inside the water
    ag.plane(W_, Ht - 0.02, M0 @ T(0, -Dp / 2, base + Ht / 2) @ RX(90), uv=False)
    for sx in (-1, 1): ag.plane(Dp, Ht - 0.02, M0 @ T(sx * W_ / 2, 0, base + Ht / 2) @ RZ(90) @ RX(90), uv=False)
    O('aqwater', 'water_aq', smooth=False).box((W_ - 0.02, Dp - 0.02, Ht - 0.2), M0 @ T(0, 0, base + 0.01 + (Ht - 0.2) / 2))
    O('aqback', 'aq_back', smooth=False).plane(W_ - 0.04, Ht - 0.1, M0 @ T(0, Dp / 2 - 0.015, base + Ht / 2) @ RX(90), uv=True)
    ends = O('aqends', 'aq_back', smooth=False)   # the backdrop goes round the ends too: the close camera looks out through them
    for sx in (-1, 1): ends.plane(Dp - 0.04, Ht - 0.1, M0 @ T(sx * (W_ / 2 - 0.015), 0, base + Ht / 2) @ RZ(90) @ RX(90), uv=True)
    O('aqlid', 'black', bevel=0.006).box((W_ + 0.08, Dp + 0.08, 0.07), M0 @ T(0, 0, zt + 0.035))
    O('aqlight', 'lightstrip', smooth=False).box((W_ - 0.3, 0.03, 0.006), M0 @ T(0, 0.05, zt - 0.004))
    # the sand bed
    def sz(x, y): return 0.1 + 0.05 * math.sin(x * 2.4 + 0.5) * math.cos(y * 3.0) + 0.03 * math.sin(x * 6.1) + 0.04 * (y / Dp + 0.5)
    O('aqsand', 'sand', smooth=True).grid(lambda u, v: (-W_ / 2 + 0.01 + (W_ - 0.02) * u, -Dp / 2 + 0.01 + (Dp - 0.02) * v, sz(-W_ / 2 + W_ * u, -Dp / 2 + Dp * v)), 80, 24, M0 @ T(0, 0, base))
    # rocks, then corals from the reef's own Blender models (src/data/reef-flora.js comes from the same files)
    rng = random.Random(11)
    rocks = O('aqrocks', 'rock', smooth=True); rocks.disp = 0.25
    for x, y, s in ((-1.05, 0.18, 0.2), (-0.35, 0.22, 0.24), (0.4, 0.2, 0.2), (1.0, 0.15, 0.17), (0.05, -0.05, 0.12)):
        rocks.superell(s * 1.4, s, s * 0.75, 0.8, 0.9, M0 @ T(x, y, base + sz(x, y) + s * 0.3), 32, 16)
    picks = [('branching', 0, -1.0, 0.18, 0.42), ('brain', 0, -0.35, 0.05, 0.26), ('table', 1, 0.38, 0.22, 0.34), ('softcoral', 0, 0.95, 0.02, 0.36),
             ('seafan', 0, -0.62, 0.28, 0.55), ('seaanemone', 0, 0.12, -0.12, 0.2), ('branching', 2, 0.7, -0.08, 0.3), ('sponge', 0, 1.18, 0.28, 0.4),
             ('seagrass', 0, -1.2, -0.15, 0.28), ('seagrass', 1, 0.3, -0.2, 0.24), ('brain', 1, -0.75, -0.12, 0.2), ('softcoral', 1, -0.05, 0.3, 0.34)]
    for k, (cid, var, x, y, h) in enumerate(picks):
        coral('aqc%d' % k, cid, var, M0 @ T(x, y, base + sz(x, y) - 0.01) @ RZ(rng.uniform(0, 360)), h)
    bub = O('aqbubbles', 'glass_clear', smooth=True)
    for k in range(14):
        bub.sphere(0.006 + 0.003 * (k % 3), M0 @ T(1.25 + 0.01 * math.sin(k * 1.7), 0.3, base + 0.2 + 0.07 * k), 12, 6)

def shell_spiral(name, L, size):
    """a coiled sea shell: a tube along a growing spiral that rises (a whelk)"""
    pts, rs = [], []
    for k in range(60):
        t = k / 59; a = t * TAU * 2.6; g = math.exp(1.25 * t) / math.exp(1.25)
        pts.append(Vector((size * 0.55 * g * math.cos(a), size * 0.55 * g * math.sin(a), size * 1.2 * (1 - t) ** 1.2)))
    o = O(name, 'shell_cream', smooth=True)
    o.tube(pts, size * 0.05, L, 20, r1=size * 0.42)
    return o

def scallop(name, L, size):
    o = O(name, 'shell_pink', smooth=True)
    def f(u, v):
        a = math.radians(-70 + 140 * u); r = size * v
        rib = 0.06 * size * abs(math.sin(u * math.pi * 9)) * v
        return (r * math.sin(a), r * math.cos(a) * 0.95, rib + 0.25 * size * v * (1 - v) + 0.05 * size * math.cos(a) * v)
    o.grid(f, 72, 12, L)
    return o

def feather(name, L, size, mat):
    o = O(name, mat, smooth=True)
    def f(u, v):
        s = -1 + 2 * u; t = v
        w = size * 0.16 * math.sin(math.pi * min(1, t * 1.15)) ** 0.7 * (1.0 if s > 0 else 0.75)
        return (s * w, size * t, 0.015 * size * math.sin(math.pi * t) - 0.01 * size * s * s)
    o.grid(f, 12, 30, L)
    O(name + 'shaft', 'shell_cream', smooth=True).tube([L @ V(0, size * t, 0.015 * size * math.sin(math.pi * t) + 0.001) for t in (i / 8 for i in range(9))], 0.0025, I4, 8)
    return o

def pine_cone(name, L, size):
    O(name + 'core', 'wood_dark', smooth=True).superell(size * 0.18, size * 0.18, size * 0.5, 1, 1, L @ T(0, 0, size * 0.5), 16, 10)
    o = O(name, 'pinecone', smooth=True)
    n = 70; gold = math.radians(137.5)
    for k in range(n):
        t = k / n; z = size * (0.05 + 0.9 * t); r = size * 0.33 * math.sin(math.pi * (0.12 + 0.8 * t))
        a = k * gold
        o.superell(size * 0.11, size * 0.075, size * 0.03, 0.8, 0.8, L @ T(r * math.cos(a), r * math.sin(a), z) @ RZ(math.degrees(a)) @ RY(-35), 12, 6)
    return o

def jar(name, L, seedmat, rng):
    O(name, 'glass_clear', smooth=True).lathe([(0.0, 0.0), (0.06, 0.0), (0.065, 0.01), (0.065, 0.15), (0.05, 0.17), (0.045, 0.185), (0.0, 0.185)], L, 40)
    O(name + 'cork', 'cork', smooth=True, bevel=0.003).cyl(0.047, 0.03, L @ T(0, 0, 0.192), 32)
    s = O(name + 'seeds', seedmat, smooth=True)
    for k in range(40):
        a = rng.uniform(0, TAU); r = rng.uniform(0, 0.05); z = rng.uniform(0.012, 0.09)
        s.superell(0.011, 0.008, 0.007, 0.9, 0.9, L @ T(r * math.cos(a), r * math.sin(a), z) @ RZ(rng.uniform(0, 360)) @ RX(rng.uniform(0, 90)), 10, 6)

def leaf_blade(o, base, d, up, L_, W_, curl=0.25, fold=0.25, nu=10, nv=18, Lm=I4):
    side = d.cross(up).normalized(); upn = side.cross(d).normalized()
    def f(u, v):
        s = -1 + 2 * u; t = v
        w = W_ * math.sin(math.pi * t) ** 0.75 * (1 - 0.2 * t)
        p = base + d * (L_ * t) - upn * (curl * L_ * t * t) + side * (s * w) + upn * (abs(s) * w * fold)
        return tuple(p)
    o.grid(f, nu, nv, Lm)

def pot_plant(name, L, size, rng, leafmat='leaf_dark'):
    O(name + 'pot', 'terracotta', smooth=True, bevel=0.004).lathe([(0.0, 0.0), (0.12, 0.0), (0.15, 0.2), (0.165, 0.21), (0.165, 0.24), (0.15, 0.24), (0.14, 0.22), (0.0, 0.22)], L @ S(size / 0.45), 40)
    O(name + 'soil', 'soil', smooth=True).disk(0.142, L @ S(size / 0.45) @ T(0, 0, 0.215), 32, 3)
    lv = O(name + 'leaves', leafmat, smooth=True); st = O(name + 'stems', 'stem', smooth=True)
    top = Vector((0, 0, 0.215)); k_ = size / 0.45
    for k in range(9):
        a = TAU * k / 9 + rng.uniform(-0.3, 0.3); el = math.radians(rng.uniform(30, 65)); Lh = rng.uniform(0.18, 0.32)
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        tip = top + d * Lh
        st.tube([top, top + d * Lh * 0.5 + Vector((0, 0, 0.03)), tip], 0.004, L @ S(k_), 6)
        dd = (Vector((math.cos(a), math.sin(a), 0)) * 0.8 + Vector((0, 0, 0.3))).normalized()
        leaf_blade(lv, tip, dd, Vector((0, 0, 1)), rng.uniform(0.14, 0.2), rng.uniform(0.045, 0.06), 0.25, 0.2, 8, 14, L @ S(k_))

def big_plant(name, p, rng, h=1.5):
    L = TV(p)
    O(name + 'pot', 'ceramic_cream', smooth=True, bevel=0.005).lathe([(0.0, 0.0), (0.16, 0.0), (0.22, 0.12), (0.24, 0.38), (0.25, 0.4), (0.25, 0.43), (0.235, 0.43), (0.225, 0.41), (0.0, 0.41)], L, 48)
    O(name + 'soil', 'soil', smooth=True).disk(0.225, L @ T(0, 0, 0.405), 40, 3)
    st = O(name + 'stems', 'bark', smooth=True); lv = O(name + 'leaves', 'leaf_glossy', smooth=True)
    for s in range(3):
        a0 = TAU * s / 3 + rng.uniform(-0.3, 0.3); lean = Vector((math.cos(a0) * 0.12, math.sin(a0) * 0.12, 1)).normalized()
        H_ = h * rng.uniform(0.75, 1.0)
        pts = [Vector((0.03 * math.cos(a0), 0.03 * math.sin(a0), 0.4)) + lean * (H_ - 0.4) * t + Vector((0.04 * math.sin(t * 5 + s), 0.04 * math.cos(t * 4 + s), 0)) * t for t in (i / 8 for i in range(9))]
        st.tube(pts, 0.012, L, 8, r1=0.007)
        n = 9
        for k in range(n):
            t = 0.35 + 0.65 * k / (n - 1); i = min(7, int(t * 8)); base = pts[i] + (pts[i + 1] - pts[i]) * (t * 8 - i)
            a = a0 + k * 2.4; el = math.radians(rng.uniform(-10, 35))
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
            pt = O(name + 'pet%d_%d' % (s, k), 'stem', smooth=True); pt.tube([base, base + d * 0.05], 0.004, L, 6)
            leaf_blade(lv, base + d * 0.05, d, Vector((0, 0, 1)), rng.uniform(0.24, 0.32) * (1.15 - 0.3 * t), rng.uniform(0.075, 0.095), 0.3, 0.12, 10, 18, L)

def cabinet():
    M0 = place(318, R - 0.3)
    Wc, Dc, Hc = 1.8, 0.46, 2.2
    c = O('cab', 'wood_dark', bevel=0.008, seg=3)
    c.box((Wc + 0.04, Dc + 0.04, 0.06), M0 @ T(0, 0, Hc + 0.03)); c.box((Wc, Dc, 0.12), M0 @ T(0, 0, 0.06))
    for s in (-1, 1): c.box((0.05, Dc, Hc), M0 @ T(s * (Wc / 2 - 0.025), 0, Hc / 2))
    O('cabcrown', 'wood_dark', smooth=True, bevel=0.006).box((Wc + 0.1, Dc + 0.08, 0.05), M0 @ T(0, 0, Hc + 0.085))
    O('cabback', 'cab_back', bevel=0.0).box((Wc - 0.1, 0.02, Hc - 0.12), M0 @ T(0, Dc / 2 - 0.01, Hc / 2 + 0.06))
    sh = O('cabshelves', 'wood_warm', bevel=0.004)
    shelves = [0.5, 0.9, 1.3, 1.7]
    for z in [0.12] + shelves: sh.box((Wc - 0.1, Dc - 0.05, 0.025), M0 @ T(0, 0, z))
    # two glass doors, swung wide open on their side hinges (the collection is open to look at; and no bar in front of the shelves)
    fr = O('cabdoors', 'wood_dark', bevel=0.005)
    gl = O('cabglass', 'glass_pane', smooth=False)
    dw = Wc / 2 - 0.02
    for s in (-1, 1):
        Mh = M0 @ T(s * (Wc / 2 - 0.01), -Dc / 2 - 0.02, 0) @ RZ(-s * 118)     # the hinge, the door open outward
        cx = -s * dw / 2
        for x in (cx - dw / 2 + 0.025, cx + dw / 2 - 0.025): fr.box((0.05, 0.03, Hc - 0.14), Mh @ T(x, 0, Hc / 2 + 0.05))
        for z in (0.15, Hc - 0.03): fr.box((dw, 0.03, 0.05), Mh @ T(cx, 0, z))
        gl.plane(dw - 0.08, Hc - 0.22, Mh @ T(cx, 0.002, Hc / 2 + 0.06) @ RX(90), uv=False)
        O('cabknob%d' % s, 'brass', smooth=True).sphere(0.02, Mh @ T(cx - s * (dw / 2 - 0.07), -0.025, 1.1), 16, 8)
    rng = random.Random(5)
    Z = lambda z: z + 0.0125
    # shelf 1: sea shells
    z = Z(0.5)
    shell_spiral('cshell1', M0 @ T(-0.6, 0.0, z) @ RY(90) @ RZ(20), 0.09)
    scallop('cscal1', M0 @ T(-0.3, 0.0, z + 0.005) @ RX(-10), 0.11)
    shell_spiral('cshell2', M0 @ T(0.05, 0.02, z) @ RY(80) @ RZ(160), 0.07)
    scallop('cscal2', M0 @ T(0.32, 0.02, z + 0.005) @ RZ(20) @ RX(-15), 0.09)
    shell_spiral('cshell3', M0 @ T(0.62, 0.0, z) @ RY(95) @ RZ(80), 0.08)
    # shelf 2: jars of seeds, acorns, a pine cone
    z = Z(0.9)
    for k, sm in enumerate(('seed_brown', 'seed_tan', 'seed_red')): jar('cjar%d' % k, M0 @ T(-0.62 + k * 0.18, 0.03, z), sm, rng)
    ac = O('acorns', 'acorn', smooth=True); cups = O('acorncups', 'wood_dark', smooth=True)
    for k in range(4):
        L = M0 @ T(0.1 + 0.07 * k, -0.06, z + 0.02) @ RY(80) @ RZ(30 * k)
        ac.superell(0.016, 0.016, 0.024, 0.9, 1, L, 16, 10); cups.lathe([(0.0, -0.002), (0.016, 0.0), (0.019, 0.01), (0.012, 0.016), (0.0, 0.016)], L @ T(0, 0, 0.014), 16)
    pine_cone('cpine', M0 @ T(0.58, 0.03, z), 0.15)
    # shelf 3: feathers, pressed leaves in frames
    z = Z(1.3)
    for k, (mat, ang) in enumerate((('feather_owl', 20), ('feather_jay', -10), ('feather_white', 8))):
        feather('cfeather%d' % k, M0 @ T(-0.66 + 0.15 * k, 0.12, z + 0.01) @ RZ(ang) @ RX(-75), 0.3, mat)
    for k in range(3):
        Mf = M0 @ T(0.08 + 0.25 * k, 0.15, z + 0.16) @ RX(-12)
        O('cframe%d' % k, 'wood_warm', bevel=0.004).box((0.2, 0.02, 0.28), Mf)
        O('cprint%d' % k, 'img_leaf%d' % k, smooth=False).plane(0.16, 0.24, Mf @ T(0, -0.0105, 0) @ RX(90), uv=True)
    # shelf 4: coral pieces, a sponge, a nest with eggs
    z = Z(1.7)
    for k, cid in enumerate(('branching', 'table', 'brain')):
        coral('ccoral%d' % k, cid, k % 3, M0 @ T(-0.62 + 0.24 * k, 0.02, z) @ RZ(rng.uniform(0, 360)), 0.16)
    O('cnest', 'nest', smooth=True).lathe([(0.0, 0.01), (0.07, 0.015), (0.11, 0.05), (0.12, 0.08), (0.105, 0.085), (0.08, 0.04), (0.0, 0.035)], M0 @ T(0.5, 0.0, z), 40)
    eg = O('ceggs', 'egg', smooth=True)
    for k in range(3): eg.superell(0.024, 0.024, 0.032, 1, 1, M0 @ T(0.48 + 0.03 * k, 0.01 * (k - 1), z + 0.06) @ RY(70 + 10 * k), 20, 12)
    big_plant('cplant', polar(300, R - 0.62), random.Random(9), 1.45)

def greenhouse():
    M0 = place(0, 4.15)
    Wg, Dg = 1.6, 0.8
    O('ghtable', 'wood_light', bevel=0.008).box((Wg + 0.12, Dg + 0.12, 0.05), M0 @ T(0, 0, 0.75))
    tl = O('ghlegs', 'wood_dark', bevel=0.005)
    for sx in (-1, 1):
        for sy in (-1, 1): tl.box((0.06, 0.06, 0.725), M0 @ T(sx * (Wg / 2), sy * Dg / 2, 0.3625))
    O('ghlower', 'wood_light', bevel=0.005).box((Wg, Dg, 0.03), M0 @ T(0, 0, 0.22))
    z0, z1, zr = 0.775, 1.72, 2.02
    fr = O('ghframe', 'metal_white', bevel=0.003, seg=2)
    for sx in (-1, 1):
        for sy in (-1, 1): fr.box((0.03, 0.03, z1 - z0), M0 @ T(sx * Wg / 2, sy * Dg / 2, (z0 + z1) / 2))
    for s in (-1, 1):
        fr.box((Wg + 0.03, 0.03, 0.03), M0 @ T(0, s * Dg / 2, z1)); fr.box((0.03, Dg, 0.03), M0 @ T(s * Wg / 2, 0, z1))
        fr.box((Wg + 0.03, 0.03, 0.03), M0 @ T(0, s * Dg / 2, z0 + 0.015))
    # a flat glass lid (a gable roof's rafters would cross each other in the picture)
    g = O('ghglass', 'glass_pane', smooth=False)
    g.plane(Wg, z1 - z0, M0 @ T(0, -Dg / 2, (z0 + z1) / 2) @ RX(90), uv=False); g.plane(Wg, z1 - z0, M0 @ T(0, Dg / 2, (z0 + z1) / 2) @ RX(90), uv=False)
    for sx in (-1, 1): g.plane(Dg, z1 - z0, M0 @ T(sx * Wg / 2, 0, (z0 + z1) / 2) @ RZ(90) @ RX(90), uv=False)
    g.plane(Wg, Dg, M0 @ T(0, 0, z1), uv=False)
    # pots with seedlings of every age (seeds that grow in fast time)
    rng = random.Random(21)
    sd = O('ghseedlings', 'leaf_light', smooth=True); stm = O('ghstems', 'stem_light', smooth=True)
    lab = O('ghlabels', 'plastic_white', bevel=0.001)
    for k in range(8):
        x = -0.6 + (k % 4) * 0.4 + (0.12 if k >= 4 else 0); y = -0.17 if k < 4 else 0.17
        Mp = M0 @ T(x, y, z0)
        O('ghpot%d' % k, 'terracotta', smooth=True, bevel=0.003).lathe([(0.0, 0.0), (0.06, 0.0), (0.08, 0.11), (0.088, 0.115), (0.088, 0.13), (0.08, 0.13), (0.075, 0.12), (0.0, 0.12)], Mp, 32)
        O('ghsoil%d' % k, 'soil', smooth=True).disk(0.074, Mp @ T(0, 0, 0.118), 24, 2)
        hh = 0.03 + 0.045 * k
        top = Vector((0.006 * math.sin(k), 0.0, 0.12 + hh))
        stm.tube([Vector((0, 0, 0.118)), Vector((0.004 * math.sin(k), 0, 0.12 + hh * 0.5)), top], 0.0032, Mp, 6)
        for s in (-1, 1):
            leaf_blade(sd, top, Vector((s * 0.9, 0.0, 0.4)).normalized(), Vector((0, 0, 1)), 0.045 + 0.006 * k, 0.02 + 0.003 * k, 0.15, 0.2, 6, 8, Mp @ RZ(k * 40))
        if k >= 2:
            for j in range(min(6, k)):
                a = j * 2.4; d = Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, 0.6)).normalized()
                leaf_blade(sd, top - Vector((0, 0, 0.022 * (j + 1))), d, Vector((0, 0, 1)), 0.06 + 0.008 * k, 0.026 + 0.003 * k, 0.2, 0.25, 6, 10, Mp)
        lab.box((0.012, 0.003, 0.07), Mp @ T(0.05, -0.04, 0.15) @ RY(8))
    # a watering can
    Mw = M0 @ T(-0.66, -0.5, 0.775)
    O('wcan', 'metal_teal', smooth=True, bevel=0.003).lathe([(0.0, 0.0), (0.08, 0.0), (0.085, 0.01), (0.085, 0.15), (0.05, 0.19), (0.03, 0.2), (0.0, 0.2)], Mw, 40)
    O('wspout', 'metal_teal', smooth=True).tube([(0.07, 0, 0.04), (0.14, 0, 0.12), (0.2, 0, 0.2)], 0.011, Mw, 12, r1=0.007)
    O('whandle', 'metal_teal', smooth=True).tube([(-0.08, 0, 0.08), (-0.11, 0, 0.16), (-0.05, 0, 0.23), (0.02, 0, 0.2)], 0.008, Mw, 10)
    big_plant('gplant', polar(24, R - 0.6), random.Random(13), 1.3)
    big_plant('gplant2', polar(156, R - 0.6), random.Random(17), 1.5)

def dock():
    p = polar(235, 1.6)
    O('dock', 'dock', smooth=True, bevel=0.006).lathe([(0.0, 0.0), (0.42, 0.0), (0.43, 0.012), (0.41, 0.03), (0.0, 0.032)], TV(p), 72)
    O('dockring', 'glow_teal', smooth=True).lathe([(0.3, 0.033), (0.34, 0.033), (0.34, 0.036), (0.3, 0.036)], TV(p), 72)

def pictures():
    for k, (a, z, w, h) in enumerate(((228, 1.7, 0.95, 0.65), (296, 1.75, 0.6, 0.8), (205, 2.35, 0.7, 0.32))):
        M = TV(polar(a, R - 0.03, z)) @ RZ(a - 90)
        O('pframe%d' % k, 'wood_dark', bevel=0.006).box((w + 0.08, 0.035, h + 0.08), M)
        O('pmat%d' % k, 'paper', smooth=False).plane(w + 0.02, h + 0.02, M @ T(0, -0.018, 0) @ RX(90), uv=False)
        O('pimg%d' % k, 'img_wall%d' % k, smooth=False).plane(w - 0.06, h - 0.06, M @ T(0, -0.0185, 0) @ RX(90), uv=True)

def build_geometry():
    OBJS.clear()
    shell(); table(); microscope(); atlas(); aquarium(); cabinet(); greenhouse(); dock(); pictures()
    return OBJS

# ═══════════════════════════════════════════ stations (cameras), Blender axes
# id: (camera position, look-at point, lens mm, where the robot hovers in this view)
STATIONS = {
    'home': (polar(270, 3.75, 1.55), V(0, 1.0, 1.15), 22, polar(235, 1.6, 0.0)),
    'table': (V(0.0, -1.55, 1.62), V(0.05, 0.15, 0.86), 26, V(-1.25, -0.45, 0.0)),
    'scope': (polar(58, 2.55, 1.55), polar(58, 4.18, 1.08), 30, polar(72, 3.3, 0.0)),
    'atlas': (polar(130, 2.6, 1.5), polar(127, 4.1, 1.05), 28, polar(110, 3.15, 0.0)),
    'aquarium': (polar(185, 2.0, 1.35), polar(185, 4.3, 1.35), 24, polar(205, 3.2, 0.0)),
    'cabinet': (polar(318, 2.75, 1.45), polar(318, R - 0.3, 1.15), 26, polar(302, 3.55, 0.0)),
    'greenhouse': (polar(2, 2.2, 1.62), polar(0, 4.15, 1.22), 26, polar(20, 3.1, 0.0)),
}

# ═══════════════════════════════════════════ materials (Cycles, procedural)
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def _mat(name):
    m = bpy.data.materials.get('LH_' + name) or bpy.data.materials.new('LH_' + name)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(b.outputs[0], out.inputs['Surface'])
    return m, nt, b, out

def _set(b, **kw):
    names = {'color': 'Base Color', 'rough': 'Roughness', 'metal': 'Metallic', 'coat': 'Coat Weight', 'coat_rough': 'Coat Roughness',
             'trans': 'Transmission Weight', 'ior': 'IOR', 'sss': 'Subsurface Weight', 'sheen': 'Sheen Weight', 'spec': 'Specular IOR Level',
             'emit': 'Emission Color', 'estr': 'Emission Strength', 'alpha': 'Alpha'}
    for k, v in kw.items():
        n = names[k]
        if n not in b.inputs: continue
        if k in ('color', 'emit'): v = (*(lin(v) if isinstance(v, str) else v), 1)
        b.inputs[n].default_value = v

def plain(name, color, rough=0.5, **kw):
    m, nt, b, _ = _mat(name); _set(b, color=color, rough=rough, **kw); return m

def _tc(nt, scale=(1, 1, 1), rot=(0, 0, 0), kind='Object'):
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = scale; mp.inputs['Rotation'].default_value = rot
    nt.links.new(tc.outputs[kind], mp.inputs['Vector']); return mp.outputs['Vector']

def wood(name, light, dark, rough=0.42, scale=None, grain=12.0, coat=0.15, bump=0.012, rings=False):
    """wood: fine straight grain lines along the object's X (gently wavy), slow tone variation, a soft bump"""
    m, nt, b, _ = _mat(name); N, L = nt.nodes, nt.links
    vec = _tc(nt, scale or ((1, 1, 1) if rings else (0.22, 1.0, 1.0)))
    wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'RINGS' if rings else 'BANDS'
    if not rings: wv.bands_direction = 'Y'
    wv.inputs['Scale'].default_value = grain; wv.inputs['Distortion'].default_value = 5.0 if not rings else 1.5; wv.inputs['Detail'].default_value = 3.0
    wv.inputs['Detail Scale'].default_value = 1.0; L.new(vec, wv.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.5; nz.inputs['Detail'].default_value = 3; L.new(vec, nz.inputs['Vector'])
    mx = N.new('ShaderNodeMath'); mx.operation = 'MULTIPLY_ADD'; mx.inputs[1].default_value = 0.45
    L.new(wv.outputs['Fac'], mx.inputs[0]); L.new(nz.outputs['Fac'], mx.inputs[2])
    rp = N.new('ShaderNodeValToRGB'); cr = rp.color_ramp
    cr.elements[0].position = 0.35; cr.elements[0].color = (*lin(light), 1)
    cr.elements[1].position = 1.0; cr.elements[1].color = (*lin(dark), 1)
    L.new(mx.outputs[0], rp.inputs['Fac']); L.new(rp.outputs['Color'], b.inputs['Base Color'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.001
    L.new(wv.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    _set(b, rough=rough, coat=coat, coat_rough=0.15)
    return m

def floor_mat():
    """oak planks: a brick pattern for the boards (random tone each), wood grain inside, dark thin gaps"""
    m, nt, b, _ = _mat('floor'); N, L = nt.nodes, nt.links
    vec = _tc(nt)
    br = N.new('ShaderNodeTexBrick'); br.offset = 0.37; br.offset_frequency = 1; br.squash = 1.0
    br.inputs['Color1'].default_value = (*lin('#a26b3c'), 1); br.inputs['Color2'].default_value = (*lin('#c8935c'), 1)
    br.inputs['Mortar'].default_value = (*lin('#3a2416'), 1); br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = 0.0025; br.inputs['Bias'].default_value = 0.0
    br.inputs['Brick Width'].default_value = 1.4; br.inputs['Row Height'].default_value = 0.17
    L.new(vec, br.inputs['Vector'])
    # grain along the boards (X)
    mp2 = N.new('ShaderNodeMapping'); mp2.inputs['Scale'].default_value = (0.6, 10.0, 10.0); L.new(vec, mp2.inputs['Vector'])
    wv = N.new('ShaderNodeTexWave'); wv.bands_direction = 'X'; wv.inputs['Scale'].default_value = 3.0; wv.inputs['Distortion'].default_value = 7.0
    wv.inputs['Detail'].default_value = 3.0; L.new(mp2.outputs[0], wv.inputs['Vector'])
    mixg = N.new('ShaderNodeMix'); mixg.data_type = 'RGBA'; mixg.blend_type = 'MULTIPLY'; mixg.inputs[0].default_value = 0.35
    mr = N.new('ShaderNodeValToRGB'); mr.color_ramp.elements[0].color = (0.7, 0.7, 0.7, 1); mr.color_ramp.elements[1].color = (1, 1, 1, 1)
    L.new(wv.outputs['Fac'], mr.inputs['Fac'])
    L.new(br.outputs['Color'], mixg.inputs[6]); L.new(mr.outputs['Color'], mixg.inputs[7]); L.new(mixg.outputs[2], b.inputs['Base Color'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35; bp.inputs['Distance'].default_value = 0.002
    inv = N.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; L.new(br.outputs['Fac'], inv.inputs[1])
    L.new(inv.outputs[0], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    _set(b, rough=0.32, coat=0.35, coat_rough=0.12)
    return m

def plaster():
    m, nt, b, _ = _mat('plaster'); N, L = nt.nodes, nt.links
    vec = _tc(nt)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 40.0; nz.inputs['Detail'].default_value = 8; L.new(vec, nz.inputs['Vector'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.08; L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    nz2 = N.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 1.5; L.new(vec, nz2.inputs['Vector'])
    rp = N.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color = (*lin('#ece0c6'), 1); rp.color_ramp.elements[1].color = (*lin('#f6ecd6'), 1)
    L.new(nz2.outputs['Fac'], rp.inputs['Fac']); L.new(rp.outputs['Color'], b.inputs['Base Color'])
    _set(b, rough=0.85)
    return m

def roof_mat():
    m = wood('roof', '#ead0a0', '#d2ac78', rough=0.6, grain=7.0, coat=0.05, bump=0.02, rings=True)
    return m

def glass_soft(name, refl=0.35):
    """a pane you look through (aquarium front, cabinet doors): see-through with a weak, fresnel-weighted reflection"""
    m = bpy.data.materials.get('LH_' + name) or bpy.data.materials.new('LH_' + name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N, L = nt.nodes, nt.links
    out = N.new('ShaderNodeOutputMaterial'); tr = N.new('ShaderNodeBsdfTransparent'); gs = N.new('ShaderNodeBsdfGlossy'); gs.inputs['Roughness'].default_value = 0.03
    fr = N.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.5
    k = N.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; k.inputs[1].default_value = refl; L.new(fr.outputs[0], k.inputs[0])
    mx = N.new('ShaderNodeMixShader'); L.new(k.outputs[0], mx.inputs[0]); L.new(tr.outputs[0], mx.inputs[1]); L.new(gs.outputs[0], mx.inputs[2])
    L.new(mx.outputs[0], out.inputs['Surface']); return m

def glass(name, tint='#ffffff', rough=0.0, ior=1.45, window=False):
    """glass that lets the light through (shadow rays pass), so windows and jars do not darken the room"""
    m = bpy.data.materials.get('LH_' + name) or bpy.data.materials.new('LH_' + name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N, L = nt.nodes, nt.links
    out = N.new('ShaderNodeOutputMaterial'); gl = N.new('ShaderNodeBsdfGlass'); tr = N.new('ShaderNodeBsdfTransparent')
    gl.inputs['Color'].default_value = (*lin(tint), 1); gl.inputs['Roughness'].default_value = rough; gl.inputs['IOR'].default_value = ior
    lp = N.new('ShaderNodeLightPath'); mx = N.new('ShaderNodeMixShader')
    L.new(lp.outputs['Is Shadow Ray'], mx.inputs[0]); L.new(gl.outputs[0], mx.inputs[1]); L.new(tr.outputs[0], mx.inputs[2])
    if window:   # a window pane: mostly see-through, a soft reflection
        gs = N.new('ShaderNodeBsdfGlossy'); gs.inputs['Roughness'].default_value = 0.02
        fr = N.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.5
        mw = N.new('ShaderNodeMixShader'); L.new(fr.outputs[0], mw.inputs[0]); L.new(tr.outputs[0], mw.inputs[1]); L.new(gs.outputs[0], mw.inputs[2])
        L.new(mw.outputs[0], mx.inputs[1])
    L.new(mx.outputs[0], out.inputs['Surface'])
    return m

def water(name, absorb='#5ec2c8', density=0.9, scatter=0.04, clear=False):
    m = glass(name, '#ffffff', 0.0, 1.33); nt = m.node_tree; N, L = nt.nodes, nt.links
    if clear:   # only the water's colour, no surface of its own (the tank's glass is the surface)
        out0 = next(n for n in N if n.bl_idname == 'ShaderNodeOutputMaterial'); tr = N.new('ShaderNodeBsdfTransparent')
        L.new(tr.outputs[0], out0.inputs['Surface'])
    out = next(n for n in N if n.bl_idname == 'ShaderNodeOutputMaterial')
    ab = N.new('ShaderNodeVolumeAbsorption'); ab.inputs['Color'].default_value = (*lin(absorb), 1); ab.inputs['Density'].default_value = density
    sc = N.new('ShaderNodeVolumeScatter'); sc.inputs['Color'].default_value = (*lin('#bfe8ee'), 1); sc.inputs['Density'].default_value = scatter
    ad = N.new('ShaderNodeAddShader'); L.new(ab.outputs[0], ad.inputs[0]); L.new(sc.outputs[0], ad.inputs[1]); L.new(ad.outputs[0], out.inputs['Volume'])
    return m

def emission(name, color, strength):
    m, nt, b, out = _mat(name); _set(b, color=color, rough=0.4, emit=color, estr=strength); return m

def image_mat(name, img, rough=0.6, emit=0.0):
    m, nt, b, _ = _mat(name); N, L = nt.nodes, nt.links
    tn = N.new('ShaderNodeTexImage'); tn.image = img; uv = N.new('ShaderNodeUVMap'); uv.uv_map = 'UV'
    L.new(uv.outputs[0], tn.inputs['Vector']); L.new(tn.outputs['Color'], b.inputs['Base Color'])
    if emit: L.new(tn.outputs['Color'], b.inputs['Emission Color']); _set(b, estr=emit)
    _set(b, rough=rough); return m

def vcol_mat():
    m, nt, b, _ = _mat('vcol'); N, L = nt.nodes, nt.links
    vc = N.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; L.new(vc.outputs['Color'], b.inputs['Base Color'])
    _set(b, rough=0.7, sss=0.05); return m

def rug_mat():
    """woven rings: teal, cream, green, with a fibre bump"""
    m, nt, b, _ = _mat('rug'); N, L = nt.nodes, nt.links
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    ln = N.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'
    cmb = N.new('ShaderNodeCombineXYZ'); L.new(sep.outputs[0], cmb.inputs[0]); L.new(sep.outputs[1], cmb.inputs[1]); L.new(cmb.outputs[0], ln.inputs[0])
    rp = N.new('ShaderNodeValToRGB'); cr = rp.color_ramp; cr.interpolation = 'CONSTANT'
    stops = [(0.0, '#e9d5a6'), (0.52, '#d8b97c'), (0.56, '#e9d5a6'), (0.6, '#2f8f86'), (0.78, '#e9d5a6'), (0.82, '#3f7a52'), (0.94, '#e9d5a6'), (0.97, '#2f6a4a')]
    cr.elements[0].position = stops[0][0]; cr.elements[0].color = (*lin(stops[0][1]), 1)
    cr.elements[1].position = stops[1][0]; cr.elements[1].color = (*lin(stops[1][1]), 1)
    for p, c in stops[2:]: e = cr.elements.new(p); e.color = (*lin(c), 1)
    dv = N.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = 1.8
    L.new(ln.outputs['Value'], dv.inputs[0]); L.new(dv.outputs[0], rp.inputs['Fac'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 300.0; nz.inputs['Detail'].default_value = 4; L.new(tc.outputs['Object'], nz.inputs['Vector'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 0.25
    L.new(rp.outputs['Color'], mx.inputs[6]); L.new(nz.outputs['Color'], mx.inputs[7]); L.new(mx.outputs[2], b.inputs['Base Color'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.4; L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    _set(b, rough=0.95, sheen=0.5); return m

def noisy(name, c1, c2, scale=8.0, rough=0.8, bump=0.3, **kw):
    m, nt, b, _ = _mat(name); N, L = nt.nodes, nt.links
    vec = _tc(nt)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8; L.new(vec, nz.inputs['Vector'])
    rp = N.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color = (*lin(c1), 1); rp.color_ramp.elements[1].color = (*lin(c2), 1)
    L.new(nz.outputs['Fac'], rp.inputs['Fac']); L.new(rp.outputs['Color'], b.inputs['Base Color'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    _set(b, rough=rough, **kw); return m

def leaf_mat(name, c1, c2, rough=0.45, coat=0.0):
    """leaves: veins from stretched waves, a little light through them"""
    m, nt, b, _ = _mat(name); N, L = nt.nodes, nt.links
    vec = _tc(nt, (40, 40, 40))
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.15; nz.inputs['Detail'].default_value = 4; L.new(vec, nz.inputs['Vector'])
    rp = N.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color = (*lin(c1), 1); rp.color_ramp.elements[1].color = (*lin(c2), 1)
    L.new(nz.outputs['Fac'], rp.inputs['Fac']); L.new(rp.outputs['Color'], b.inputs['Base Color'])
    _set(b, rough=rough, coat=coat, sss=0.15)
    if 'Transmission Weight' in b.inputs: b.inputs['Transmission Weight'].default_value = 0.08
    return m

# generated pictures (numpy → bpy image): blueprint, notebook pages, atlas pages, pressed leaves, wall prints, aquarium back
def _img(name, arr):
    h, w = arr.shape[:2]
    im = bpy.data.images.get(name)
    if im and (im.size[0] != w or im.size[1] != h): bpy.data.images.remove(im); im = None
    im = im or bpy.data.images.new(name, w, h, alpha=False)
    a = np.ones((h, w, 4), np.float32); a[..., :3] = arr[..., :3]
    im.pixels.foreach_set(a.ravel()); im.pack(); return im

def _canvas(w, h, col):
    a = np.zeros((h, w, 3), np.float32); a[:] = lin(col); return a

def _line(a, x0, y0, x1, y1, col, wpx=2):
    h, w = a.shape[:2]; n = int(max(abs(x1 - x0) * w, abs(y1 - y0) * h)) + 1
    for k in range(n + 1):
        t = k / n; x = int((x0 + (x1 - x0) * t) * w); y = int((y0 + (y1 - y0) * t) * h)
        a[max(0, y - wpx // 2):y + (wpx + 1) // 2, max(0, x - wpx // 2):x + (wpx + 1) // 2] = col

def _ellipse(a, cx, cy, rx, ry, col, fill=True, wpx=2):
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]; d = ((xx / w - cx) / rx) ** 2 + ((yy / h - cy) / ry) ** 2
    if fill: a[d <= 1] = col
    else: a[(d <= 1) & (d >= (1 - wpx * 2.0 / (min(rx * w, ry * h) + 1)) ** 2)] = col

def _leaf_shape(a, cx, cy, L_, W_, ang, col, vein):
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]; x = xx / w - cx; y = yy / h - cy
    c, s = math.cos(ang), math.sin(ang); u = x * c + y * s; v = -x * s + y * c
    t = u / L_ + 0.5; wd = W_ * np.sin(np.clip(t, 0, 1) * math.pi) ** 0.8
    inside = (t > 0) & (t < 1) & (np.abs(v) < wd); a[inside] = col
    a[inside & (np.abs(v) < 0.004)] = vein
    for k in range(1, 7):
        tt = k / 7; vv = (u / L_ + 0.5 - tt) * L_ * 1.6
        a[inside & (np.abs(np.abs(v) - vv) < 0.003) & (np.abs(v) < wd * 0.9)] = vein

def make_images():
    I = {}
    W = lin('#e8f0fa'); a = _canvas(1024, 704, '#2c5f9e')
    for k in range(9): _line(a, 0.06, 0.08 + 0.1 * k, 0.94, 0.08 + 0.1 * k, lin('#3f74b4'), 1)
    _line(a, 0.04, 0.04, 0.96, 0.04, W, 3); _line(a, 0.04, 0.96, 0.96, 0.96, W, 3); _line(a, 0.04, 0.04, 0.04, 0.96, W, 3); _line(a, 0.96, 0.04, 0.96, 0.96, W, 3)
    for x0, y0, x1, y1 in ((0.2, 0.35, 0.78, 0.35), (0.2, 0.62, 0.78, 0.62), (0.2, 0.35, 0.2, 0.62), (0.78, 0.35, 0.78, 0.62), (0.15, 0.68, 0.83, 0.68),
                           (0.15, 0.68, 0.15, 0.72), (0.83, 0.68, 0.83, 0.72), (0.15, 0.72, 0.83, 0.72)):
        _line(a, x0, y0, x1, y1, W, 3)
    _ellipse(a, 0.81, 0.48, 0.05, 0.07, W, False, 2); _ellipse(a, 0.16, 0.45, 0.035, 0.08, W, False, 2)
    for k in range(14): _line(a, 0.24 + 0.038 * k, 0.37, 0.25 + 0.038 * k, 0.40, W, 1)   # the shark-skin ridges, all one way
    for k in range(5): _line(a, 0.6, 0.15 + 0.03 * k, 0.9, 0.15 + 0.03 * k, W, 1)
    I['blueprint'] = _img('lh_blueprint', a)
    a = _canvas(512, 704, '#f7f1e0')
    for k in range(20): _line(a, 0.1, 0.08 + 0.044 * k, 0.9, 0.08 + 0.044 * k, lin('#b8c8dc'), 1)
    for k in range(9): _line(a, 0.12, 0.83 - 0.044 * k, 0.12 + 0.75 * (0.5 + 0.5 * math.sin(k * 1.9)), 0.83 - 0.044 * k, lin('#4a5a78'), 2)
    _leaf_shape(a, 0.62, 0.22, 0.32, 0.07, 0.6, lin('#7aa85a'), lin('#4a7a3a'))
    I['notes'] = _img('lh_notes', a)
    for side, (col, shape) in enumerate((('#5a90c0', 'fish'), ('#c86a3a', 'bird'))):
        a = _canvas(512, 704, '#f6efdc')
        _ellipse(a, 0.5, 0.68, 0.34, 0.2, lin(col) if False else lin('#e9dfc6'))
        if shape == 'fish':
            _ellipse(a, 0.48, 0.68, 0.22, 0.09, lin(col)); _ellipse(a, 0.7, 0.68, 0.06, 0.07, lin(col)); _ellipse(a, 0.38, 0.69, 0.02, 0.025, lin('#f6efdc'))
        else:
            _ellipse(a, 0.5, 0.66, 0.16, 0.12, lin(col)); _ellipse(a, 0.38, 0.75, 0.08, 0.075, lin(col)); _ellipse(a, 0.36, 0.77, 0.016, 0.018, lin('#2a2a2a'))
            _leaf_shape(a, 0.62, 0.62, 0.25, 0.06, -0.3, lin(col), lin('#8a4a2a'))
        for k in range(10): _line(a, 0.12, 0.42 - 0.03 * k, 0.12 + 0.76 * (0.6 + 0.4 * math.sin(k * 2.3 + side)), 0.42 - 0.03 * k, lin('#6a5a48'), 2)
        I['page_' + 'lr'[side]] = _img('lh_page_' + 'lr'[side], a)
    for k, (c, v) in enumerate((('#5f9a48', '#3f6a30'), ('#a8b84a', '#6a7a2a'), ('#c46a2a', '#8a4a1a'))):
        a = _canvas(256, 384, '#f3ead2'); _leaf_shape(a, 0.5, 0.5, 0.7, 0.18 + 0.03 * k, math.pi / 2 + 0.2 * (k - 1), lin(c), lin(v))
        I['leaf%d' % k] = _img('lh_leaf%d' % k, a)
    # wall prints: three zones (forest green, grove ochre, reef blue), a pressed fern, a heron-like wader
    a = _canvas(960, 640, '#efe5cc')
    for k, c in enumerate(('#3f7a4a', '#c9a24a', '#3a8fb5')): _ellipse(a, 0.2 + 0.3 * k, 0.5, 0.12, 0.3, lin(c))
    for k, c in enumerate(('#2f6a3a', '#a8822a', '#2a6f95')): _ellipse(a, 0.2 + 0.3 * k, 0.45, 0.07, 0.15, lin(c))
    I['wall0'] = _img('lh_wall0', a)
    a = _canvas(480, 640, '#f2ead6')
    for k in range(9): _leaf_shape(a, 0.5 + (0.14 if k % 2 else -0.14) * (1 - k / 10), 0.2 + 0.075 * k, 0.26 * (1 - k / 14), 0.05, (0.5 if k % 2 else -0.5) + math.pi / 2 * 0, lin('#5a8a48'), lin('#3a6a30'))
    _line(a, 0.5, 0.1, 0.5, 0.9, lin('#4a6a3a'), 3)
    I['wall1'] = _img('lh_wall1', a)
    a = _canvas(700, 320, '#efe5cc')
    _ellipse(a, 0.5, 0.45, 0.42, 0.12, lin('#7ab8d8'))
    for k in range(6): _leaf_shape(a, 0.1 + 0.16 * k, 0.6, 0.12, 0.03, math.pi / 2, lin('#5a9a4a'), lin('#3a6a2a'))
    I['wall2'] = _img('lh_wall2', a)
    # aquarium back: deep blue at the bottom, light at the top, soft rays
    h, w = 512, 1024; yy, xx = np.mgrid[0:h, 0:w] / np.array([h, w])[:, None, None]
    a = np.zeros((h, w, 3), np.float32)
    top, bot = np.array(lin('#6ec4e0')), np.array(lin('#0e4a72'))
    a[:] = bot + (top - bot) * (yy[..., None] ** 1.3)
    ray = (np.sin(xx * 24 + yy * 6) * 0.5 + 0.5) ** 6 * yy * 0.25
    a += ray[..., None]
    I['aq'] = _img('lh_aqback', a)
    return I

def make_materials():
    I = make_images(); Mt = {}
    Mt['floor'] = floor_mat(); Mt['plaster'] = plaster(); Mt['roof'] = roof_mat()
    Mt['wood_warm'] = wood('wood_warm', '#c69862', '#ab7c4a')
    Mt['wood_dark'] = wood('wood_dark', '#6e4628', '#55331b', rough=0.38, coat=0.25)
    Mt['wood_light'] = wood('wood_light', '#dcb882', '#c69e68', rough=0.45)
    Mt['wood_wainscot'] = wood('wood_wainscot', '#93633a', '#7a5030', rough=0.4, scale=(1.0, 1.0, 0.2), coat=0.2)
    Mt['glass_window'] = glass('glass_window', window=True)
    Mt['glass_clear'] = glass('glass_clear', '#f4fbfa', 0.0)
    Mt['glass_pane'] = glass_soft('glass_pane', 0.3)
    Mt['water_tank'] = water('water_tank', '#7ccad8', 1.2, 0.02)
    Mt['water_aq'] = water('water_aq', '#5ab8c8', 0.55, 0.035, clear=True)
    Mt['brass'] = plain('brass', '#d0a24a', 0.25, metal=1.0)
    Mt['chrome'] = plain('chrome', '#dfe3e8', 0.12, metal=1.0)
    Mt['metal'] = plain('metal', '#b8bec6', 0.3, metal=1.0)
    Mt['metal_white'] = plain('metal_white', '#f1f1ec', 0.3, coat=0.3)
    Mt['metal_teal'] = plain('metal_teal', '#2f8f88', 0.35, metal=0.6, coat=0.3)
    Mt['black'] = plain('black', '#1d2024', 0.35)
    Mt['rubber'] = plain('rubber', '#141618', 0.7)
    Mt['enamel_white'] = plain('enamel_white', '#f4f2ec', 0.2, coat=0.6)
    Mt['enamel_teal'] = plain('enamel_teal', '#2c8c86', 0.25, coat=0.6)
    Mt['paint_teal'] = plain('paint_teal', '#2f9a92', 0.3, coat=0.4)
    Mt['paint_yellow'] = plain('paint_yellow', '#f2c21a', 0.35, coat=0.4)
    Mt['plastic_white'] = plain('plastic_white', '#f2f2ee', 0.35)
    Mt['plastic_bins'] = noisy('plastic_bins', '#3a8f88', '#2f7f78', 3, 0.45, 0.02)
    Mt['plastic_mix'] = noisy('plastic_mix', '#e0a43a', '#c44a3c', 30, 0.4, 0.0)
    for k, c in (('red', '#c0392b'), ('yellow', '#e8b020'), ('blue', '#2f6fd0')): Mt['band_' + k] = plain('band_' + k, c, 0.4)
    Mt['leather_green'] = noisy('leather_green', '#2f5a2a', '#24461f', 60, 0.6, 0.15)
    Mt['leather_blue'] = noisy('leather_blue', '#2f4f7a', '#24405f', 60, 0.6, 0.15)
    Mt['leather_brown'] = noisy('leather_brown', '#7a4a2a', '#5e361e', 60, 0.55, 0.15)
    Mt['fabric_teal'] = noisy('fabric_teal', '#2f8f86', '#287a72', 200, 0.9, 0.2, sheen=0.6)
    Mt['paper_edge'] = noisy('paper_edge', '#f2e9d2', '#e2d6b8', 400, 0.8, 0.05)
    Mt['paper'] = plain('paper', '#f4ecd8', 0.8)
    for k, c in (('green', '#2c4f26'), ('blue', '#2f5a8a'), ('red', '#9a3a2a'), ('ochre', '#c9a24a'), ('teal', '#2f8a84'), ('brown', '#6a4228'), ('cream', '#e8dcc0')):
        Mt['book_' + k] = noisy('book_' + k, c, c, 80, 0.55, 0.06)
    Mt['shell_cream'] = noisy('shell_cream', '#f2e2c8', '#d8b890', 18, 0.35, 0.05, coat=0.4)
    Mt['shell_pink'] = noisy('shell_pink', '#f0c8b8', '#d89a88', 14, 0.35, 0.05, coat=0.4)
    Mt['feather_owl'] = noisy('feather_owl', '#e8cfa0', '#b88a50', 25, 0.7, 0.05)
    Mt['feather_jay'] = noisy('feather_jay', '#4a7ad0', '#2a4a8a', 40, 0.6, 0.05)
    Mt['feather_white'] = plain('feather_white', '#f2efe6', 0.7)
    Mt['pinecone'] = noisy('pinecone', '#8a5a32', '#5a3a20', 20, 0.7, 0.2)
    Mt['acorn'] = noisy('acorn', '#a06a32', '#7a4a20', 20, 0.4, 0.05, coat=0.4)
    Mt['cork'] = noisy('cork', '#c8a070', '#a07a50', 120, 0.9, 0.4)
    for k, c in (('seed_brown', '#6a4428'), ('seed_tan', '#c8a87a'), ('seed_red', '#a03a2a')): Mt[k] = noisy(k, c, c, 30, 0.5, 0.05)
    Mt['nest'] = noisy('nest', '#8a6a42', '#5a4228', 90, 0.95, 0.8)
    Mt['egg'] = plain('egg', '#f2ebe0', 0.45)
    Mt['terracotta'] = noisy('terracotta', '#c46a3c', '#a85a32', 12, 0.85, 0.1)
    Mt['ceramic_cream'] = plain('ceramic_cream', '#efe6d2', 0.25, coat=0.5)
    Mt['soil'] = noisy('soil', '#4a3424', '#2e2016', 80, 0.95, 0.6)
    Mt['leaf_dark'] = leaf_mat('leaf_dark', '#3f7a32', '#4f8a3a')
    Mt['leaf_glossy'] = leaf_mat('leaf_glossy', '#2f5a24', '#3f6e2c', rough=0.3, coat=0.3)
    Mt['leaf_light'] = leaf_mat('leaf_light', '#6aa84a', '#86c25a', rough=0.5)
    Mt['stem'] = plain('stem', '#4a7a34', 0.6); Mt['stem_light'] = plain('stem_light', '#7aaa52', 0.6)
    Mt['bark'] = noisy('bark', '#6a5a42', '#4a3e2e', 60, 0.85, 0.4)
    Mt['sand'] = noisy('sand', '#e8d6ae', '#cdb88e', 60, 0.9, 0.4)
    Mt['rock'] = noisy('rock', '#9a8a78', '#6a5e52', 10, 0.85, 0.5)
    Mt['rug'] = rug_mat(); Mt['vcol'] = vcol_mat()
    Mt['cab_back'] = plain('cab_back', '#e8dcc0', 0.8)
    Mt['dock'] = plain('dock', '#2a3138', 0.35, coat=0.5)
    Mt['bulb'] = emission('bulb', '#fff1d0', 12.0)
    Mt['bulb_soft'] = emission('bulb_soft', '#fff6e0', 4.0)
    Mt['lightstrip'] = emission('lightstrip', '#e8f8ff', 3.0)
    Mt['glow_teal'] = emission('glow_teal', '#7fe8e0', 5.0)
    for k in ('blueprint', 'notes', 'page_l', 'page_r', 'leaf0', 'leaf1', 'leaf2', 'wall0', 'wall1', 'wall2'):
        Mt['img_' + k] = image_mat('img_' + k, I[k], 0.75)
    Mt['aq_back'] = image_mat('aq_back', I['aq'], 0.9, emit=0.6)
    return Mt

# ═══════════════════════════════════════════ realisation in Blender
def _scene():
    sc = bpy.data.scenes.get('lab_hd') or bpy.data.scenes.new('lab_hd')
    return sc

def _coll(sc, name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children: sc.collection.children.link(c)
    for o in list(c.objects):
        me = o.data; bpy.data.objects.remove(o, do_unlink=True)
        if me and getattr(me, 'users', 1) == 0 and isinstance(me, bpy.types.Mesh): bpy.data.meshes.remove(me)
    return c

_FLORA = {}
def flora_mesh(cid, var, height):
    key = (cid, var)
    if key not in _FLORA:
        d = json.load(open(os.path.join(ROOT, 'reef', 'flora', cid + '.json')))
        e = d['v'][min(var, len(d['v']) - 1)]
        p = np.array(e['p'], np.float32).reshape(-1, 3); idx = np.array(e['i'], np.int64).reshape(-1, 3)
        c = np.array(e['c'], np.float32).reshape(-1, 3) / 255.0
        me = bpy.data.meshes.new('lhf_%s_%d' % (cid, var))
        verts = np.stack([p[:, 0], -p[:, 2], p[:, 1]], 1)
        me.from_pydata(verts.tolist(), [], idx.tolist()); me.update()
        cl = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        ca.data.foreach_set('color', np.concatenate([cl, np.ones((len(cl), 1), np.float32)], 1).ravel())
        me.shade_smooth()
        _FLORA[key] = (me, float(e.get('h') or (p[:, 1].max() - p[:, 1].min())))
    return _FLORA[key]

def realize(o, coll, Mt):
    if o.json:
        cid, var, height = o.json
        me, h0 = flora_mesh(cid, var, height)
        ob = bpy.data.objects.new('lh.' + o.name, me); coll.objects.link(ob)
        ob.matrix_world = o.M @ S(height / max(h0, 1e-3))
        if not me.materials: me.materials.append(Mt['vcol'])
        return ob
    me = bpy.data.meshes.new('lh.' + o.name)
    me.from_pydata([tuple(v) for v in o.V], [], o.F); me.validate(); me.update()
    if o.UV:
        uv = me.uv_layers.new(name='UV')
        for f in me.polygons:
            if f.index in o.UV:
                for k, li in enumerate(f.loop_indices): uv.data[li].uv = o.UV[f.index][k]
    ob = bpy.data.objects.new('lh.' + o.name, me); coll.objects.link(ob)
    ob.matrix_world = o.M
    me.materials.append(Mt[o.mat])
    if o.smooth:
        me.shade_smooth()
        try: me.set_sharp_from_angle(angle=math.radians(o.sharp))
        except Exception: pass
    if o.bevel > 0:
        b = ob.modifiers.new('bev', 'BEVEL'); b.width = o.bevel; b.segments = o.seg; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(o.angle)
        try: b.harden_normals = True
        except Exception: pass
        if not o.smooth: me.shade_smooth()
    if o.disp:
        tex = bpy.data.textures.get('lh_clouds') or bpy.data.textures.new('lh_clouds', 'CLOUDS'); tex.noise_scale = 0.08
        sub = ob.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
        d = ob.modifiers.new('disp', 'DISPLACE'); d.texture = tex; d.strength = 0.03 * o.disp * 4; d.mid_level = 0.5
    if o.sub:
        sub = ob.modifiers.new('sub', 'SUBSURF'); sub.levels = o.sub; sub.render_levels = o.sub
    return ob

def lights(sc):
    for ob in [x for x in sc.collection.objects if x.type in ('LIGHT', 'CAMERA')]: bpy.data.objects.remove(ob, do_unlink=True)
    def add(name, kind, loc, energy, color, rot=None, **kw):
        ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = color
        for k, v in kw.items(): setattr(ld, k, v)
        ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.location = loc
        if rot is not None: ob.rotation_euler = rot
        return ob
    d = Vector((-0.3, -0.82, -0.5)).normalized()
    add('lh_sun', 'SUN', (0, 0, 20), 3.2, (1.0, 0.9, 0.76), d.to_track_quat('-Z', 'Y').to_euler(), angle=math.radians(2.5))
    for x in (-0.75, 0.0, 0.75): add('lh_pend%g' % x, 'POINT', (x, 0.3, 2.41), 45, (1.0, 0.78, 0.55), shadow_soft_size=0.04)
    aq = place(185, 4.3) @ Vector((0, -0.1, 2.12))
    a = add('lh_aq', 'AREA', aq, 70, (0.78, 0.94, 1.0), size=2.5, size_y=0.5, shape='RECTANGLE'); a.rotation_euler = (0, 0, math.radians(185 - 90))
    add('lh_desk', 'SPOT', tuple(T(0, 0.3, 0) @ Vector((0.81, 0.28, 1.25))), 25, (1.0, 0.85, 0.62), (Vector((0.9, 0.3, 0.85)) - Vector((0.8, 0.3, 1.3))).to_track_quat('-Z', 'Y').to_euler(), spot_size=math.radians(70), shadow_soft_size=0.03)
    add('lh_sky', 'AREA', (0, 0, 4.6), 320, (0.8, 0.9, 1.0), size=2.2)
    add('lh_bounce', 'AREA', (0, -2.6, 2.6), 60, (1.0, 0.92, 0.82), (math.radians(60), 0, 0), size=3.0)

def world(sc):
    """lighting sky + the Gulf of Eilat outside the windows (a cylinder far away with the Blender panorama, seen by the camera)"""
    w = bpy.data.worlds.get('lh_world') or bpy.data.worlds.new('lh_world'); w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
    N, L = nt.nodes, nt.links
    out = N.new('ShaderNodeOutputWorld'); bg = N.new('ShaderNodeBackground')
    sky = N.new('ShaderNodeTexSky')
    try: sky.sky_type = 'NISHITA'
    except Exception: pass
    for k, v in (('sun_elevation', math.radians(30)), ('sun_rotation', math.radians(110)), ('altitude', 40.0)):
        try: setattr(sky, k, v)
        except Exception: pass
    bg.inputs['Strength'].default_value = 0.35
    L.new(sky.outputs[0], bg.inputs[0]); L.new(bg.outputs[0], out.inputs[0]); sc.world = w
    # the panorama strip on a cylinder of radius 400 m around the room; sea below, so the windows never show emptiness
    for n in ('lh_pano', 'lh_sea'):
        ob = bpy.data.objects.get(n)
        if ob: bpy.data.objects.remove(ob, do_unlink=True)
    img = bpy.data.images.load(os.path.join(LD, 'lab_pano.png'), check_existing=True)
    lat0, lat1 = math.radians(-12), math.radians(16); Rc = 400.0; eye = 1.5
    seg = 256; V_, F_, UV_ = [], [], []
    for i in range(seg + 1):
        th = TAU * i / seg
        for z in (eye + Rc * math.tan(lat0), eye + Rc * math.tan(lat1)):
            V_.append((Rc * math.cos(th), Rc * math.sin(th), z))
    for i in range(seg): F_.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    me = bpy.data.meshes.new('lh_pano'); me.from_pydata(V_, [], F_); me.update()
    uv = me.uv_layers.new(name='UV')
    for f in me.polygons:
        for li in f.loop_indices:
            vi = me.loops[li].vertex_index; i = vi // 2; th = 360.0 * i / seg
            u = ((th - PANO_ROT + 90.0 + 180.0) / 360.0)
            uv.data[li].uv = (u, vi % 2)
    m = bpy.data.materials.get('LH_pano') or bpy.data.materials.new('LH_pano'); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
    o_ = t.nodes.new('ShaderNodeOutputMaterial'); tex = t.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.extension = 'REPEAT'
    uvn = t.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'UV'; t.links.new(uvn.outputs[0], tex.inputs['Vector'])
    em = t.nodes.new('ShaderNodeEmission'); t.links.new(tex.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = 1.0
    tr = t.nodes.new('ShaderNodeBsdfTransparent'); mx = t.nodes.new('ShaderNodeMixShader')
    lp = t.nodes.new('ShaderNodeLightPath'); mul = t.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    t.links.new(tex.outputs['Alpha'], mul.inputs[0]); t.links.new(lp.outputs['Is Camera Ray'], mul.inputs[1])
    t.links.new(mul.outputs[0], mx.inputs[0]); t.links.new(tr.outputs[0], mx.inputs[1]); t.links.new(em.outputs[0], mx.inputs[2])
    t.links.new(mx.outputs[0], o_.inputs['Surface'])
    me.materials.append(m)
    ob = bpy.data.objects.new('lh_pano', me); sc.collection.objects.link(ob)
    try: ob.visible_shadow = False; ob.visible_diffuse = False; ob.visible_glossy = True
    except Exception: pass
    zb = eye + Rc * math.tan(lat0)   # the sea meets the bottom of the panorama strip, in the strip's own hazy blue
    me2 = bpy.data.meshes.new('lh_sea'); me2.from_pydata([(-Rc, -Rc, zb), (Rc, -Rc, zb), (Rc, Rc, zb), (-Rc, Rc, zb)], [], [(0, 1, 2, 3)])
    sea = emission('sea', '#5d7389', 1.0); me2.materials.append(sea)
    so = bpy.data.objects.new('lh_sea', me2); sc.collection.objects.link(so)
    try: so.visible_shadow = False; so.visible_diffuse = False
    except Exception: pass

def cameras(sc):
    # the room seen from its centre, all around: reflections on the live robot in the game
    cd = bpy.data.cameras.get('lhc_env') or bpy.data.cameras.new('lhc_env'); cd.type = 'PANO'
    try: cd.panorama_type = 'EQUIRECTANGULAR'
    except Exception: pass
    ob = bpy.data.objects.new('lhc_env', cd); sc.collection.objects.link(ob); ob.location = (0, -0.6, 1.3); ob.rotation_euler = (math.radians(90), 0, 0)
    for k, (cam, at, lens, _r) in STATIONS.items():
        cd = bpy.data.cameras.get('lhc_' + k) or bpy.data.cameras.new('lhc_' + k); cd.lens = lens; cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
        cd.clip_start = 0.05; cd.clip_end = 3000
        ob = bpy.data.objects.new('lhc_' + k, cd); sc.collection.objects.link(ob)
        ob.location = cam; ob.rotation_euler = (at - cam).to_track_quat('-Z', 'Y').to_euler()

def render_setup(sc):
    r = sc.render; r.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.samples = 256; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.015
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    sc.cycles.max_bounces = 10; sc.cycles.diffuse_bounces = 4; sc.cycles.glossy_bounces = 4; sc.cycles.transmission_bounces = 10
    sc.cycles.volume_bounces = 1; sc.cycles.transparent_max_bounces = 16; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
    sc.cycles.sample_clamp_indirect = 8.0
    r.threads_mode = 'FIXED'; r.threads = max(1, (os.cpu_count() or 4) // 2)
    r.resolution_x, r.resolution_y = 2560, 1440
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.film_transparent = False
    try:
        sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        try: sc.view_settings.look = 'None'
        except Exception: pass
    sc.view_settings.exposure = 0.0

def lab_hd_build():
    t0 = time.time(); sc = _scene()
    coll = _coll(sc, 'LH')
    Mt = make_materials()
    build_geometry(); n = 0
    for o in OBJS:
        ob = realize(o, coll, Mt); n += len(ob.data.polygons)
    lights(sc); world(sc); cameras(sc); render_setup(sc)
    return {'lab_hd_build': len(OBJS), 'faces': n, 't': round(time.time() - t0, 1)}

def lab_hd_render(station='home', pct=25, samples=48, final=False):
    sc = _scene(); sc.camera = bpy.data.objects['lhc_' + station]
    sc.render.resolution_x, sc.render.resolution_y = (1024, 512) if station == 'env' else (2560, 1440)
    sc.render.resolution_percentage = 100 if station == 'env' else pct; sc.cycles.samples = samples
    name = 'env.png' if (final and station == 'env') else ('st_%s.png' if final else 'lab_%s.png') % station
    p = os.path.join(LD if final else PV, name)
    sc.render.filepath = p
    if os.path.exists(p): os.remove(p)
    bpy.context.window.scene = sc
    with bpy.context.temp_override(window=bpy.context.window_manager.windows[0]):
        return {'started': str(bpy.ops.render.render('INVOKE_DEFAULT', write_still=True)), 'file': p}

def lab_hd_cams():
    sc = _scene(); out = {'stations': {}, 'size': [2560, 1440]}
    for k, (cam, at, lens, rob) in STATIONS.items():
        fovh = 2 * math.atan(18.0 / lens); fovv = 2 * math.atan(math.tan(fovh / 2) * 1440 / 2560)
        out['stations'][k] = {'pos': [round(cam.x, 4), round(cam.z, 4), round(-cam.y, 4)],   # aimed at 'at' with no roll (three: lookAt)
                              'fov': round(math.degrees(fovv), 4), 'robot': [round(rob.x, 3), round(rob.z, 3), round(-rob.y, 3)],
                              'at': [round(at.x, 3), round(at.z, 3), round(-at.y, 3)]}
    aq = place(185, 4.3)
    c = aq @ Vector((0, 0, 1.47)); out['aquarium'] = {'centre': [round(c.x, 3), round(c.z, 3), round(-c.y, 3)], 'size': [2.5, 0.8, 0.55], 'yaw': 185 - 90}
    with open(os.path.join(LD, 'lab_cams.json'), 'w') as fh: json.dump(out, fh, indent=1)
    return {'cams': len(out['stations'])}


# a queue of final renders, one after the other (async renders; a timer starts the next when the last has finished)
RQ = {'list': [], 'cur': None, 'done': []}
def _rq_tick():
    if RQ['cur']:
        if bpy.app.is_job_running('RENDER') or not os.path.exists(RQ['cur']): return 4.0
        RQ['done'].append(RQ['cur']); RQ['cur'] = None
    if not RQ['list']: return None
    st, pct, samples = RQ['list'].pop(0)
    try: RQ['cur'] = lab_hd_render(st, pct, samples, True)['file']
    except Exception as e: RQ['done'].append('error %s: %s' % (st, e)); RQ['cur'] = None
    return 6.0

def lab_hd_render_all(stations=None, pct=75, samples=64):
    RQ['list'] = [(s, pct, samples) for s in (stations or list(STATIONS) + ['env'])]; RQ['done'] = []
    if not bpy.app.timers.is_registered(_rq_tick): bpy.app.timers.register(_rq_tick, first_interval=1.0)
    return {'queued': len(RQ['list'])}
