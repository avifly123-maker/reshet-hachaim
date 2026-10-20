# reef_props.py – the reef's technology, modelled in Blender (exec into its own namespace after the kits):
#   rov      רובוט צולל      – an underwater survey robot (the reef's "monitoring drone"): yellow frame, white float,
#                              two lights (eye), a camera dome, vertical thrusters (rotor0/1 spin)
#   uwcam    מצלמה תת־ימית   – a camera in a waterproof housing on a weighted tripod (eye = the lens port, led)
#   nursery  משתלת אלמוגים   – a "coral tree": a frame of white pipes held up by a float, coral fragments hanging on lines
#   reefball שונית מלאכותית  – a concrete dome full of holes, young corals and algae already settling on it
#   buoy     מצוף עגינה      – base (a ring bolted into the sand) · rope (unit length, stretched by the game) · float
#   sensor   מצוף חיישנים    – base · rope · float (yellow spar buoy, solar panel, antenna) · led
# Export: reef/props_reef.json = {'tools': {id: {'id.part': {p, n, c, i}}}} in three's axes (y up), the format of
# art/props/props_export.json, merged by tools/build-props.py. Preview: reef/pv/props.jpg.
import bpy, bmesh, math, json, os, random
from mathutils import Vector, Matrix

FD = os.path.join(os.path.dirname(D), 'reef'); os.makedirs(os.path.join(FD, 'pv'), exist_ok=True)
TAU = math.tau

def hexc(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

class Part:
    def __init__(self, name): self.name = name; self.bm = bmesh.new(); self.col = self.bm.loops.layers.color.new('Col')
    def _paint(self, faces, c):
        for f in faces:
            for l in f.loops: l[self.col] = (c[0], c[1], c[2], 1.0)
    def _new(self, fn, mat, c, **kw):
        before = set(self.bm.faces)
        fn(self.bm, matrix=mat, **kw)
        new = [f for f in self.bm.faces if f not in before]; self._paint(new, hexc(c)); return new
    def box(self, size, at=(0, 0, 0), c='#ffffff', rot=None, bevel=0.0):
        M = Matrix.Translation(at) @ (rot or Matrix()) @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        return self._new(bmesh.ops.create_cube, M, c, size=1.0)
    def cyl(self, r1, r2, h, at=(0, 0, 0), c='#ffffff', rot=None, seg=16, cap=True):
        M = Matrix.Translation(at) @ (rot or Matrix())
        return self._new(bmesh.ops.create_cone, M, c, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h)
    def sph(self, r, at=(0, 0, 0), c='#ffffff', scale=(1, 1, 1), sub=2):
        M = Matrix.Translation(at) @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1))
        return self._new(bmesh.ops.create_icosphere, M, c, subdivisions=sub, radius=r)
    def tube(self, pts, r, c='#ffffff', seg=8):
        for a, b in zip(pts, pts[1:]):
            a, b = Vector(a), Vector(b); d = b - a
            rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
            self.cyl(r, r, d.length, at=tuple((a + b) / 2), c=c, rot=rot, seg=seg)
            self.sph(r, at=tuple(b), c=c, sub=1)
    def export(self, smooth=False):
        bm = self.bm; bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.normal_update()
        P = []; N = []; C = []; I = []
        for f in bm.faces:
            for l in f.loops:
                v = l.vert.co; n = l.vert.normal if smooth else f.normal; c = l[self.col]
                P += [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]; N += [round(n.x, 3), round(n.z, 3), round(-n.y, 3)]
                C += [int(c[0] * 255), int(c[1] * 255), int(c[2] * 255)]; I.append(len(I))
        return dict(p=P, n=N, c=C, i=I)
    def to_object(self, coll, loc):
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me)
        o = bpy.data.objects.new(self.name, me); coll.objects.link(o); o.location = loc; return o

RX = lambda a: Matrix.Rotation(math.radians(a), 4, 'X')
RY = lambda a: Matrix.Rotation(math.radians(a), 4, 'Y')
RZ = lambda a: Matrix.Rotation(math.radians(a), 4, 'Z')

def rov():
    body = Part('body'); eye = Part('eye'); led = Part('led'); r0 = Part('rotor0'); r1 = Part('rotor1')
    Y, W, Wh, D = '#f2c21a', '#f4f4f0', '#2a3038', '#1c2228'
    # the frame: four rails and cross bars (yellow), the white float block on top, the electronics bottle
    for x in (-0.42, 0.42):
        for z in (0.12, 0.55):
            body.box((0.06, 1.0, 0.06), at=(x, 0, z), c=Y, bevel=0.01)
        body.box((0.06, 0.06, 0.5), at=(x, 0.47, 0.33), c=Y); body.box((0.06, 0.06, 0.5), at=(x, -0.47, 0.33), c=Y)
    for z in (0.12, 0.55):
        body.box((0.9, 0.06, 0.06), at=(0, 0.47, z), c=Y); body.box((0.9, 0.06, 0.06), at=(0, -0.47, z), c=Y)
    body.box((0.92, 1.02, 0.2), at=(0, 0, 0.68), c=W, bevel=0.04)                    # syntactic-foam float
    body.box((0.5, 0.2, 0.1), at=(0, 0, 0.82), c=Y, bevel=0.02)                       # handle
    body.cyl(0.13, 0.13, 0.7, at=(0, 0.02, 0.33), c='#c8ccd2', rot=RX(90), seg=20)    # electronics bottle
    body.sph(0.14, at=(0, 0.4, 0.33), c='#a8d8f0', sub=2)                             # camera dome
    body.cyl(0.05, 0.05, 0.04, at=(0, 0.47, 0.33), c=D, rot=RX(90))
    for x in (-0.3, 0.3):                                                             # rear thrusters (ducts)
        body.cyl(0.11, 0.11, 0.18, at=(x, -0.52, 0.3), c=D, rot=RX(90), seg=16, cap=False)
        body.cyl(0.03, 0.03, 0.18, at=(x, -0.52, 0.3), c='#606870', rot=RX(90))
    for x, rp in ((-0.32, r0), (0.32, r1)):                                           # vertical thrusters: ducts + spinning props
        body.cyl(0.12, 0.12, 0.12, at=(x, 0.0, 0.62), c=D, seg=16, cap=False)
        for k in range(3):
            rp.box((0.2, 0.05, 0.012), at=(x, 0, 0.62), c='#3a4048', rot=RZ(k * 120) @ RX(18))
        rp.cyl(0.03, 0.03, 0.05, at=(x, 0, 0.62), c='#3a4048')
    for x in (-0.22, 0.22):                                                           # the two lights
        body.cyl(0.07, 0.07, 0.08, at=(x, 0.46, 0.5), c=D, rot=RX(90))
        eye.cyl(0.055, 0.055, 0.02, at=(x, 0.51, 0.5), c='#e8f6ff', rot=RX(90))
    led.sph(0.03, at=(0.36, 0.35, 0.8), c='#ff3a2a', sub=1)
    body.tube([(0, -0.4, 0.75), (0, -0.7, 0.95), (0.1, -1.0, 1.4)], 0.018, c='#f08a1a')   # the tether going up
    return [body, eye, led, r0, r1]

def uwcam():
    body = Part('body'); eye = Part('eye'); led = Part('led')
    D, G = '#2a3038', '#5a6a72'
    for a in (0, 120, 240):                                                           # weighted tripod
        d = Vector((math.sin(math.radians(a)), math.cos(math.radians(a)), 0))
        body.tube([(0, 0, 0.75), tuple(d * 0.42 + Vector((0, 0, 0.03)))], 0.025, c=G)
        body.cyl(0.07, 0.08, 0.06, at=tuple(d * 0.42 + Vector((0, 0, 0.03))), c='#3a3a3a')
    body.cyl(0.04, 0.04, 0.12, at=(0, 0, 0.8), c=G)
    body.cyl(0.17, 0.17, 0.42, at=(0, 0.0, 1.0), c=D, rot=RX(90), seg=24)            # the housing
    body.cyl(0.19, 0.19, 0.05, at=(0, 0.2, 1.0), c='#1a1e22', rot=RX(90), seg=24)
    body.cyl(0.19, 0.19, 0.05, at=(0, -0.2, 1.0), c='#1a1e22', rot=RX(90), seg=24)
    eye.sph(0.13, at=(0, 0.22, 1.0), c='#7ac8e8', scale=(1, 0.55, 1), sub=2)          # the dome port
    body.box((0.08, 0.06, 0.06), at=(0, -0.05, 1.2), c='#3a4048')
    led.sph(0.025, at=(0.12, 0.1, 1.17), c='#ff3a2a', sub=1)
    return [body, eye, led]

def nursery():
    body = Part('body'); rng = random.Random(5)
    P, Fl = '#f2f2ee', '#f08a1a'
    body.tube([(0, 0, 0.0), (0, 0, 2.3)], 0.045, c=P)                                 # the trunk pipe
    body.cyl(0.16, 0.2, 0.18, at=(0, 0, 0.09), c='#9a9a94')                           # the anchor block
    body.sph(0.22, at=(0, 0, 2.45), c=Fl, sub=2)                                      # the float holding it up
    for k, h in enumerate((0.75, 1.3, 1.85)):                                         # three tiers of branches
        for j in range(4):
            a = math.radians(j * 90 + k * 45); d = Vector((math.cos(a), math.sin(a), 0)); L = 0.62 - 0.1 * k
            body.tube([(0, 0, h), tuple(d * L + Vector((0, 0, h)))], 0.032, c=P)
            for t in (0.35, 0.7, 1.0):                                                # fragments hanging on lines
                q = d * L * t + Vector((0, 0, h)); body.tube([tuple(q), tuple(q - Vector((0, 0, 0.12)))], 0.005, c='#d8d8d0', seg=4)
                col = rng.choice(['#c890d8', '#e89aa8', '#88c0e0', '#d8c070', '#9ad07a'])
                base = q - Vector((0, 0, 0.14))
                for b in range(4):
                    ang = rng.uniform(0, TAU); dd = Vector((math.cos(ang) * 0.5, math.sin(ang) * 0.5, -0.9)).normalized()
                    body.tube([tuple(base), tuple(base + dd * rng.uniform(0.06, 0.11))], 0.012, c=col, seg=5)
    return [body]

def reefball():
    from mathutils import noise
    body = Part('body'); life = Part('life'); rng = random.Random(9)
    holes = [(TAU * k / 7 + rng.uniform(-0.2, 0.2), rng.uniform(0.25, 0.75)) for k in range(7)] + [(0, 1.45)]
    # the dome as a thick shell with round openings: built from rings so the holes can be cut in the colour
    rings, seg = 18, 64
    def at(i, j, R):
        th = (math.pi / 2) * i / rings; ph = TAU * j / seg
        return Vector((math.cos(ph) * math.cos(th) * R, math.sin(ph) * math.cos(th) * R, math.sin(th) * R * 0.95))
    def hole(p):
        ph = math.atan2(p.y, p.x); el = math.asin(max(-1, min(1, p.z / 0.72)))
        for (a, e) in holes:
            if math.hypot((ph - a + math.pi) % TAU - math.pi, (el - e) * 1.3) < 0.24: return True
        return False
    for R, inner in ((0.75, False), (0.63, True)):
        vs = [[body.bm.verts.new(at(i, j, R)) for j in range(seg)] for i in range(rings + 1)]
        for i in range(rings):
            for j in range(seg):
                q = [vs[i][j], vs[i][(j + 1) % seg], vs[i + 1][(j + 1) % seg], vs[i + 1][j]]
                c = sum((v.co for v in q), Vector()) / 4
                if hole(c): continue
                f = body.bm.faces.new(q[::-1] if inner else q)
                n = noise.noise(c * 6)
                col = (0.62 + 0.08 * n, 0.6 + 0.07 * n, 0.56 + 0.06 * n) if not inner else (0.3, 0.3, 0.3)
                if not inner and noise.noise(c * 3 + Vector((4, 4, 4))) > 0.25: col = (0.78, 0.48, 0.52)   # coralline crust
                for l in f.loops: l[body.col] = (col[0], col[1], col[2], 1)
    for k in range(9):                                                                # young corals and algae settling
        ph = rng.uniform(0, TAU); el = rng.uniform(0.2, 1.3)
        p = Vector((math.cos(ph) * math.cos(el) * 0.75, math.sin(ph) * math.cos(el) * 0.75, math.sin(el) * 0.72))
        col = rng.choice(['#c890d8', '#e8a060', '#88c0e0', '#7ab04a', '#d8c070'])
        if k % 3 == 0: life.sph(0.08, at=tuple(p * 1.02), c=col, scale=(1, 1, 0.6), sub=2)
        else:
            for b in range(4):
                d = (p.normalized() + Vector((rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5), rng.uniform(-0.2, 0.4)))).normalized()
                life.tube([tuple(p), tuple(p + d * rng.uniform(0.07, 0.13))], 0.016, c=col, seg=5)
    return [body, life]

def buoy(sensor=False):
    base = Part('base'); rope = Part('rope'); fl = Part('float'); parts = [base, rope, fl]
    base.cyl(0.2, 0.24, 0.12, at=(0, 0, 0.06), c='#8a8a84'); base.cyl(0.08, 0.08, 0.04, at=(0, 0, 0.13), c='#5a5a58')
    bm = base.bm
    base.tube([(0.0, -0.07, 0.15), (0.0, -0.07, 0.24), (0.0, 0.07, 0.24), (0.0, 0.07, 0.15)], 0.018, c='#c0c0b8')   # the ring
    rope.cyl(0.02, 0.02, 1.0, at=(0, 0, 0.5), c='#e8d8a8' if not sensor else '#3a3a3a', seg=8)
    if not sensor:
        fl.sph(0.42, at=(0, 0, 0.0), c='#f4f4f0', sub=3)
        fl.cyl(0.43, 0.43, 0.1, at=(0, 0, 0.0), c='#2a6ad8', seg=32)
        fl.tube([(0, 0, -0.42), (0, 0, -0.55)], 0.03, c='#c0c0b8')
    else:
        led = Part('led'); parts.append(led)
        fl.cyl(0.38, 0.38, 0.32, at=(0, 0, 0.0), c='#f2c21a', seg=32)                 # the float
        fl.cyl(0.08, 0.08, 1.1, at=(0, 0, 0.7), c='#f2c21a')                           # the mast
        fl.box((0.5, 0.36, 0.03), at=(0, 0, 0.62), c='#1c3a6a', rot=RX(20))            # solar panel
        fl.cyl(0.012, 0.012, 0.5, at=(0.06, 0, 1.45), c='#3a3a3a')                    # antenna
        fl.cyl(0.05, 0.05, 0.6, at=(0, 0, -0.45), c='#c0c0b8')                         # sensor probe below
        fl.box((0.18, 0.18, 0.06), at=(0, 0, -0.78), c='#3a4048')
        led.sph(0.05, at=(0, 0, 1.28), c='#ffb020', sub=1)
    return parts

DEVICES = dict(rov=rov, uwcam=uwcam, nursery=nursery, reefball=reefball, buoy=lambda: buoy(False), sensor=lambda: buoy(True))
SMOOTH = {'rov': {'eye'}, 'uwcam': {'eye'}, 'nursery': set(), 'reefball': {'life'}, 'buoy': {'float'}, 'sensor': set()}

def props_job(preview=True):
    out = {'tools': {}}
    sc = bpy.data.scenes.get('reef_flora') or bpy.data.scenes.new('reef_flora')
    coll = bpy.data.collections.get('RF_props')
    if coll:
        for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)
    else:
        coll = bpy.data.collections.new('RF_props'); sc.collection.children.link(coll)
    objs = []
    for k, (did, fn) in enumerate(DEVICES.items()):
        parts = fn(); out['tools'][did] = {}
        for p in parts:
            out['tools'][did][did + '.' + p.name] = p.export(smooth=p.name in SMOOTH.get(did, set()))
            if preview: objs.append(p.to_object(coll, ((k - 2.5) * 2.0, 0, 0 if did not in ('buoy', 'sensor') or p.name != 'float' else 1.2)))
            p.bm.free()
    with open(os.path.join(FD, 'props_reef.json'), 'w') as fh: json.dump(out, fh, separators=(',', ':'))
    if preview and objs:
        mat = bpy.data.materials.get('RF_vcol') or bpy.data.materials.new('RF_vcol'); mat.use_nodes = True
        nt = mat.node_tree; bsdf = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
        if not any(n.bl_idname == 'ShaderNodeVertexColor' for n in nt.nodes):
            vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
        for o in objs: o.data.materials.append(mat)
        cam = bpy.data.objects.get('RFcam')
        if cam:
            sc.camera = cam; cam.location = (0, -11, 3.2); cam.rotation_euler = (math.radians(78), 0, 0)
            sc.render.resolution_x, sc.render.resolution_y = 1200, 420
            sc.render.filepath = os.path.join(FD, 'pv', 'props.jpg'); sc.render.image_settings.file_format = 'JPEG'
            prev = bpy.context.window.scene; bpy.context.window.scene = sc
            for c in sc.collection.children: c.hide_render = c.name != 'RF_props'
            bpy.ops.render.render(write_still=True, scene=sc.name)
            for c in sc.collection.children: c.hide_render = False
            bpy.context.window.scene = prev
        for o in objs:
            me = o.data; bpy.data.objects.remove(o, do_unlink=True); bpy.data.meshes.remove(me)
    return {'props': list(out['tools'].keys())}
