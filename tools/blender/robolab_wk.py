# The robot workshop's parts (1.4.3, set 3e). Runs in the robolab_kit namespace (exec after robolab_kit.py):
#   exec(open(r'...\robolab_wk.py').read(), ns)   then rl_build() / rl_wk_preview(path) / rl_export(path)
# Three chassis bases without wheels (wk_s, wk_m, wk_l) and the parts the workshop shows on them: wheel sets, tracks,
# floats, a propeller, front tools, arm tools, sensors and extras. Blender axes: Z up, the robot faces -Y.
# Sockets (the same names on the three chassis, placed by its size):
#   wfl wfr wbl wbr  wheels, at ground level (z 0) beside the body; a wheel part puts its own axle at its radius, so
#                    small and big wheels both stand on the ground; right sockets are turned half a turn (mirror)
#   tl tr            tracks or floats, one per side (same rule)
#   front nose eyes  low front: a front tool (pusher, fork, scoop, brush); a colour or touch sensor; the distance eyes
#   arm              top front right: claw, arms, crane, hook, net
#   back deck top head   top: seed box, tank, pad, solar / gyro / light, beacon, antenna / camera
#   rear under belly probe   propeller; caster; ballast; the humidity probe
# The game's rules of the look: no cross or plus shapes (bolts in rings of five, a fork has prongs and a bar behind them
# only, never crossed bars), friendly round edges.

SLOT_COL.setdefault('wood', (0.85, 0.66, 0.38))   # the game's SLOT_LOOK.wood (#d9a862)
SLOT_ROUGH.setdefault('wood', 0.7)
# round 7 (Avi: "a real machine, a shine on every facet"): painted metal, gunmetal for the dark parts, shining steel
SLOT_COL['dark'] = (0.2, 0.22, 0.25)
SLOT_ROUGH.update({'body': 0.3, 'trim': 0.3, 'accent': 0.28, 'dark': 0.38, 'metal': 0.22})
if '_mat0' not in globals(): _mat0 = mat   # the kit's own (running this file twice must not wrap it twice)
def mat(slot):
    m = _mat0(slot); b = _bsdf(m)
    if slot in ('body', 'trim', 'accent', 'cream'):
        try: b.inputs['Coat Weight'].default_value = 0.18; b.inputs['Coat Roughness'].default_value = 0.1
        except Exception: pass
    if slot == 'dark': b.inputs['Metallic'].default_value = 0.55
    if slot == 'metal': b.inputs['Metallic'].default_value = 1.0
    if slot not in ('glow', 'glass') and not m.get('grit'): _grit(m, b, slot)
    return m

# round 11 (Avi: "less smooth, a certain roughness"): a fine grain on every surface (cast and painted metal is never a
# mirror): a small bump from a fine noise and a slow change of roughness; rubber gets a coarser grain. The game does the
# same in its shader (src/robolab/three/parts3d.js `grit`).
GRIT = {'rubber': (90, 0.6, 0.14), 'metal': (220, 0.16, 0.12), 'dark': (160, 0.3, 0.14), 'wood': (60, 0.4, 0.12)}
def _grit(m, b, slot):
    nt = m.node_tree; scale, bump, rvar = GRIT.get(slot, (180, 0.25, 0.14))
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = scale; n1.inputs['Detail'].default_value = 6
    nt.links.new(tc.outputs['Object'], n1.inputs['Vector'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.002
    nt.links.new(n1.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = scale / 9; n2.inputs['Detail'].default_value = 3
    nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange'); r0 = b.inputs['Roughness'].default_value
    mr.inputs['To Min'].default_value = max(0.05, r0 - rvar); mr.inputs['To Max'].default_value = min(1, r0 + rvar)
    nt.links.new(n2.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])
    m['grit'] = 1

WK_SIZE = {'s': (0.62, 0.82, 0.3), 'm': (0.8, 1.02, 0.34), 'l': (1.0, 1.3, 0.38)}
WK_BOTTOM = 0.2   # the body's underside above the ground, the same for every chassis (wheel brackets reach up to it)

# ── round 2 (3.11): the body is one soft shell (a superellipsoid: flat faces that turn round at every edge, like a
# moulded toy), split by a seam into an upper shell (body colour) and a lower one (trim), with a face plate in front,
# lamps set into rings, a side badge and a deck plate; nothing is a box with a bevel any more
def _sc(w, m): c = math.cos(w); return math.copysign(abs(c) ** m, c)
def _ss(w, m): s_ = math.sin(w); return math.copysign(abs(s_) ** m, s_)

def shell(name, a, b, c, slot, e1=0.25, e2=0.3, u0=-math.pi / 2, u1=math.pi / 2, seg=56, ring=20, inset=0.0, **k):
    """a part of a superellipsoid (half sizes a, b, c) between the latitudes u0 and u1; inset pulls it in a little"""
    bm = bmesh.new(); rows = []
    for j in range(ring + 1):
        u = u0 + (u1 - u0) * j / ring; row = []
        for i in range(seg):
            v = -math.pi + 2 * math.pi * i / seg
            row.append(bm.verts.new(((a - inset) * _sc(u, e1) * _sc(v, e2), (b - inset) * _sc(u, e1) * _ss(v, e2), c * _ss(u, e1))))
        rows.append(row)
    for j in range(ring):
        for i in range(seg):
            A, B = rows[j], rows[j + 1]
            f = (A[i], A[(i + 1) % seg], B[(i + 1) % seg], B[i])
            try: bm.faces.new(f)
            except ValueError: pass
    for j, top in ((0, False), (ring, True)):   # close an open end with a fan (a pole closes itself)
        r = rows[j]
        if abs(abs(u0 if j == 0 else u1) - math.pi / 2) < 1e-6: continue
        cz = r[0].co.z; cv = bm.verts.new((0, 0, cz))
        for i in range(seg):
            f = (r[i], r[(i + 1) % seg], cv) if top else (r[(i + 1) % seg], r[i], cv)
            bm.faces.new(f)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mk(name, bm, slot, **k)

def plate(name, a, b, t, slot, e=0.3, **k):
    """a flat rounded plate (a badge, a deck, a face panel): a very flat superellipsoid"""
    return shell(name, a, b, t / 2, slot, e1=0.5, e2=e, seg=40, ring=8, **k)

def lamp(name, r, parent, loc, axis='Y'):
    """a lamp set into the body: a dark ring and a glowing lens"""
    torus(name + '_ring', r, r * 0.28, 'dark', seg=28, rseg=8, axis=axis, parent=parent, loc=loc)
    o = sphere(name + '_lens', r * 0.95, 'glow', seg=20, ring=10, parent=parent, loc=loc)
    o.scale = (1, 0.45, 1) if axis == 'Y' else (1, 1, 0.45)
    return o

# ── round 4 (3.11, Avi: "a machine you can see is assembled, like a game's workshop"): hard surface. Every block is
# chamfered (edges cut at an angle, not rounded), big faces are split into recessed panels, armour plates sit on the
# hull with bolts in their corners, a frame shows under it, fenders cover the wheels, lamps sit in housings.
def hs_block(name, sx, sy, sz, slot, ch=0.018, top=(1.0, 1.0), nose=0.0, panels=0.0, pdepth=0.005, sharp=20, **k):
    """a chamfered block. top: the top face scaled (a sloped, faceted hull); nose: the front top edge pulled back (a
    wedge); panels: inset every big face by this much and press it in (panel lines)"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        x, y, z = v.co.x * sx, v.co.y * sy, v.co.z * sz
        if v.co.z > 0:
            x *= top[0]; y *= top[1]
            if v.co.y < 0: y += nose
        v.co = Vector((x, y, z))
    if ch: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=ch, segments=1, profile=0.5, affect='EDGES')
    if panels:
        big = [f for f in bm.faces if f.calc_area() > (panels * 6) ** 2]
        r = bmesh.ops.inset_individual(bm, faces=big, thickness=panels, depth=-pdepth, use_even_offset=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _mk(name, bm, slot, **k)
    try: o.data.set_sharp_from_angle(angle=math.radians(sharp))
    except Exception: pass
    return o

def bolts(pre, pts, r, parent, axis='Z', slot='metal'):
    """hex bolts with a washer under each"""
    for i, p in enumerate(pts):
        cyl('%s_w%d' % (pre, i), r * 1.45, r * 0.3, 'dark', seg=8, axis=axis, parent=parent, loc=p)
        o = cyl('%s_b%d' % (pre, i), r, r * 0.9, slot, seg=6, axis=axis, bev=r * 0.15, parent=parent, loc=p)
        try: o.data.set_sharp_from_angle(angle=math.radians(20))
        except Exception: pass

def bolt_row(pre, p0, p1, n, r, parent, axis='Z'):
    p0, p1 = Vector(p0), Vector(p1)
    bolts(pre, [tuple(p0.lerp(p1, i / max(1, n - 1))) for i in range(n)], r, parent, axis=axis)

def sweep(name, pts, r, slot, ring=8, **k):
    """a round tube along a path of points (a coil spring, a cable)"""
    bm = bmesh.new(); P = [Vector(p) for p in pts]; rings = []
    up = Vector((0, 0, 1))
    for i, p in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        a = t.cross(up if abs(t.dot(up)) < 0.95 else Vector((1, 0, 0))).normalized(); b = t.cross(a)
        rings.append([bm.verts.new(p + (a * math.cos(2 * math.pi * j / ring) + b * math.sin(2 * math.pi * j / ring)) * r) for j in range(ring)])
    for i in range(len(rings) - 1):
        for j in range(ring):
            bm.faces.new((rings[i][j], rings[i][(j + 1) % ring], rings[i + 1][(j + 1) % ring], rings[i + 1][j]))
    for R_, rev in ((rings[0], True), (rings[-1], False)):
        bm.faces.new(list(reversed(R_)) if rev else R_)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mk(name, bm, slot, **k)

def coil(name, at, r, h, turns, wire, slot, parent):
    n = int(turns * 10)
    pts = [(at[0] + math.cos(2 * math.pi * turns * i / n) * r, at[1] + math.sin(2 * math.pi * turns * i / n) * r, at[2] + h * i / n) for i in range(n + 1)]
    return sweep(name, pts, wire, slot, ring=5, parent=parent)

def armor(name, sx, sy, sz, slot, parent, loc, axis='X', rot=(0, 0, 0)):
    """a plate on the hull: chamfered, a panel line, a bolt in each corner"""
    o = hs_block(name, sx, sy, sz, slot, ch=min(sx, sy, sz) * 0.35, panels=min(sx, sy, sz) * 0 + 0.012, pdepth=0.003, parent=parent, loc=loc, rot=rot)
    if axis == 'X':   # the plate lies on a side (thin in X): a row of bolts along its top and bottom edges
        d = sx / 2 + 0.002; hy, hz = sy / 2 - 0.022, sz / 2 - 0.02; n = max(3, int(sy / 0.07))
        bolts(name, [(loc[0] + math.copysign(d, loc[0]), loc[1] - hy + 2 * hy * i / (n - 1), loc[2] + b_ * hz) for i in range(n) for b_ in (-1, 1)], 0.008, parent, axis='X')
    else:   # lies on top (thin in Z)
        hx, hy = sx / 2 - 0.022, sy / 2 - 0.022
        bolts(name, [(loc[0] + a_ * hx, loc[1] + b_ * hy, loc[2] + sz / 2 + 0.002) for a_ in (-1, 1) for b_ in (-1, 1)], 0.008, parent)
    return o

def lamp_housing(name, parent, loc, w=0.09, h=0.06):
    hs_block(name + '_house', w, 0.05, h, 'dark', ch=0.01, parent=parent, loc=loc)
    o = hs_block(name + '_lens', w * 0.74, 0.012, h * 0.6, 'glow', ch=0.004, parent=parent, loc=(loc[0], loc[1] - 0.026, loc[2]))
    return o

def build_wk(size):
    sx, sy, sz = WK_SIZE[size]
    R = group('base_wk_' + size)
    z0 = WK_BOTTOM + sz / 2
    # the frame under the hull: two rails and the ends (an H from below, never a cross)
    for k_ in (-1, 1):
        hs_block('wk%s_rail_%d' % (size, k_), 0.05, sy * 0.96, 0.06, 'dark', ch=0.01, parent=R, loc=(k_ * sx * 0.32, 0, WK_BOTTOM - 0.01))
    for e in (-1, 1):
        hs_block('wk%s_xm_%d' % (size, e), sx * 0.7, 0.05, 0.05, 'dark', ch=0.01, parent=R, loc=(0, e * sy * 0.44, WK_BOTTOM - 0.01))
    # the hull: a wedge nose, a faceted top, panel lines
    hs_block('wk%s_hull' % size, sx * 0.9, sy, sz * 0.72, 'body', ch=0.048, top=(0.86, 0.9), nose=0.07, panels=0.03, pdepth=0.012, parent=R, loc=(0, 0, WK_BOTTOM + sz * 0.36))
    # a front bumper with tow hooks, side skirts under the armour
    hs_block('wk%s_bumper' % size, sx * 0.84, 0.07, 0.07, 'dark', ch=0.018, top=(0.94, 0.8), parent=R, loc=(0, -sy * 0.53, WK_BOTTOM + 0.035))
    for k_ in (-1, 1):
        torus('wk%s_tow_%d' % (size, k_), 0.022, 0.008, 'metal', seg=16, rseg=6, axis='X', parent=R, loc=(k_ * sx * 0.3, -sy * 0.57, WK_BOTTOM + 0.03))
        hs_block('wk%s_skirt_%d' % (size, k_), 0.03, sy * 0.86, 0.05, 'dark', ch=0.01, parent=R, loc=(k_ * sx * 0.455, 0, WK_BOTTOM + 0.04))
    # the upper deck block (the equipment bay), a step back from the nose
    hs_block('wk%s_bay' % size, sx * 0.66, sy * 0.62, sz * 0.3, 'trim', ch=0.034, top=(0.9, 0.92), panels=0.024, pdepth=0.01, parent=R, loc=(0, sy * 0.1, WK_BOTTOM + sz * 0.86))
    # the mechanics under the hull, in view: a gearbox between the rails, cables along them, the battery tray
    hs_block('wk%s_gearbox' % size, sx * 0.3, sy * 0.24, 0.08, 'dark', ch=0.014, panels=0.012, parent=R, loc=(0, sy * 0.05, WK_BOTTOM - 0.03))
    bolt_row('wk%s_gbb' % size, (-sx * 0.12, sy * 0.05 - sy * 0.1, WK_BOTTOM + 0.012), (sx * 0.12, sy * 0.05 - sy * 0.1, WK_BOTTOM + 0.012), 4, 0.008, R)
    for k_ in (-1, 1):
        sweep('wk%s_cable_%d' % (size, k_), [(k_ * sx * 0.26, -sy * 0.4, WK_BOTTOM - 0.02), (k_ * sx * 0.27, -sy * 0.1, WK_BOTTOM - 0.035), (k_ * sx * 0.26, sy * 0.25, WK_BOTTOM - 0.02), (k_ * sx * 0.2, sy * 0.42, WK_BOTTOM + 0.0)], 0.01, 'accent', ring=6, parent=R)
    # metal corner guards on the hull's front corners, bolts along the hull's top edge and on the bay
    for k_ in (-1, 1):
        hs_block('wk%s_guard_%d' % (size, k_), 0.05, 0.05, sz * 0.6, 'metal', ch=0.012, parent=R, loc=(k_ * sx * 0.43, -sy * 0.47, WK_BOTTOM + sz * 0.36), rot=(0, 0, math.pi / 4))
        bolt_row('wk%s_gb_%d' % (size, k_), (k_ * sx * 0.43 + k_ * 0.02, -sy * 0.47 - 0.02, WK_BOTTOM + sz * 0.15), (k_ * sx * 0.43 + k_ * 0.02, -sy * 0.47 - 0.02, WK_BOTTOM + sz * 0.57), 3, 0.009, R, axis='Y')
        bolt_row('wk%s_tb_%d' % (size, k_), (k_ * sx * 0.37, -sy * 0.3, WK_BOTTOM + sz * 0.725), (k_ * sx * 0.37, sy * 0.38, WK_BOTTOM + sz * 0.725), 5, 0.009, R)
    bolt_row('wk%s_bayb' % size, (-sx * 0.24, -sy * 0.19, WK_BOTTOM + sz * 1.0), (sx * 0.24, -sy * 0.19, WK_BOTTOM + sz * 1.0), 4, 0.008, R)
    # intake vents on the hull's sides (slats), a hatch on the bay with its handle bar
    for k_ in (-1, 1):
        hs_block('wk%s_vent_%d' % (size, k_), 0.02, sy * 0.16, sz * 0.24, 'dark', ch=0.006, parent=R, loc=(k_ * sx * 0.405, sy * 0.33, WK_BOTTOM + sz * 0.5))
        for i in range(4): hs_block('wk%s_slat_%d_%d' % (size, k_, i), 0.012, sy * 0.15, 0.012, 'metal', ch=0.003, parent=R, loc=(k_ * (sx * 0.405 + 0.012), sy * 0.33, WK_BOTTOM + sz * (0.41 + i * 0.06)))
    hs_block('wk%s_hatch' % size, sx * 0.4, sy * 0.26, 0.012, 'trim', ch=0.004, parent=R, loc=(0, sy * 0.24, WK_BOTTOM + sz * 1.012))
    sweep('wk%s_handle' % size, [(-sx * 0.1, sy * 0.4, WK_BOTTOM + sz * 1.0), (-sx * 0.1, sy * 0.43, WK_BOTTOM + sz * 1.06), (sx * 0.1, sy * 0.43, WK_BOTTOM + sz * 1.06), (sx * 0.1, sy * 0.4, WK_BOTTOM + sz * 1.0)], 0.009, 'metal', ring=8, parent=R)
    # side armour, fenders over the wheels, a grille and two lamps in front
    for k_ in (-1, 1):
        armor('wk%s_side_%d' % (size, k_), 0.025, sy * 0.42, sz * 0.4, 'accent', R, (k_ * sx * 0.455, -sy * 0.02, WK_BOTTOM + sz * 0.38))
        lamp_housing('wk%s_lamp_%d' % (size, k_), R, (k_ * sx * 0.3, -sy * 0.47, WK_BOTTOM + sz * 0.42))
    hs_block('wk%s_grille' % size, sx * 0.34, 0.03, sz * 0.26, 'dark', ch=0.008, parent=R, loc=(0, -sy * 0.485, WK_BOTTOM + sz * 0.34))
    for i in range(4):   # slots in the grille
        hs_block('wk%s_slot%d' % (size, i), sx * 0.28, 0.01, 0.012, 'metal', ch=0.003, parent=R, loc=(0, -sy * 0.5 - 0.008, WK_BOTTOM + sz * (0.25 + i * 0.06)))
    # a rear battery pack with ribs, a hatch on the bay with its hinge
    hs_block('wk%s_batt' % size, sx * 0.5, 0.08, sz * 0.4, 'dark', ch=0.012, parent=R, loc=(0, sy * 0.5, WK_BOTTOM + sz * 0.36))
    for i in range(3): hs_block('wk%s_rib%d' % (size, i), sx * 0.46, 0.012, 0.016, 'metal', ch=0.003, parent=R, loc=(0, sy * 0.545, WK_BOTTOM + sz * (0.26 + i * 0.1)))
    for k_ in (-1, 1): cyl('wk%s_hinge_%d' % (size, k_), 0.014, sx * 0.12, 'metal', seg=12, axis='X', parent=R, loc=(k_ * sx * 0.16, sy * 0.4, WK_BOTTOM + sz * 1.01))
    top = WK_BOTTOM + sz * 1.01
    wx, wy = sx * 0.45 + 0.005, sy * 0.31
    socket(R, 'wfl', (-wx, -wy, 0)); socket(R, 'wbl', (-wx, wy, 0))
    socket(R, 'wfr', (wx, -wy, 0), (0, 0, math.pi)); socket(R, 'wbr', (wx, wy, 0), (0, 0, math.pi))
    socket(R, 'tl', (-wx - 0.01, 0, 0)); socket(R, 'tr', (wx + 0.01, 0, 0))   # tr takes the mirrored part (tracks_r, float_r)
    socket(R, 'front', (0, -sy / 2, WK_BOTTOM + 0.04))
    socket(R, 'nose', (-sx * 0.22, -sy / 2, WK_BOTTOM + 0.02))
    socket(R, 'eyes', (0, -sy * 0.47, WK_BOTTOM + sz * 0.62))
    socket(R, 'arm', (sx * 0.28, -sy * 0.3, WK_BOTTOM + sz * 0.72))
    socket(R, 'head', (-sx * 0.12, -sy * 0.12, top))
    socket(R, 'back', (0, sy * 0.24, top))
    socket(R, 'deck', (-sx * 0.28, -sy * 0.32, WK_BOTTOM + sz * 0.72))
    socket(R, 'top', (sx * 0.22, sy * 0.36, top))
    socket(R, 'rear', (0, sy / 2 + 0.04, z0))
    socket(R, 'under', (0, sy * 0.36, WK_BOTTOM - 0.04))
    socket(R, 'belly', (0, -sy * 0.05, WK_BOTTOM - 0.04))
    socket(R, 'probe', (-sx * 0.45, -sy * 0.3, z0))
    return R

def _bracket(P, pre, z_axle, x=0.0):
    """the suspension seen under the body: a hub motor with cooling fins on the axle, a shock absorber inside a coil
    spring from the axle up to the body, an arm to the frame"""
    top = WK_BOTTOM + 0.02; h = max(0.06, top - z_axle)
    cyl(pre + '_motor', 0.05, 0.07, 'dark', seg=8, bev=0.006, axis='X', parent=P, loc=(x + 0.02, 0, z_axle))
    for f in range(3): cyl(pre + '_fin%d' % f, 0.058, 0.008, 'metal', seg=8, axis='X', parent=P, loc=(x + 0.0 + f * 0.018, 0, z_axle))
    hs_block(pre + '_arm', 0.04, 0.14, 0.035, 'dark', ch=0.008, parent=P, loc=(x + 0.05, 0.03, z_axle + 0.02), rot=(0.25, 0, 0))
    _piston(pre + '_shock', (x + 0.06, -0.02, z_axle + 0.02), (x + 0.06, -0.02, z_axle + h + 0.02), 0.016, P)
    coil(pre + '_spring', (x + 0.06, -0.02, z_axle + 0.03), 0.026, h * 0.8, 4.5, 0.0055, 'accent', P)

def revolve(name, prof, slot, seg=48, mod=None, cap=False, **k):
    """a surface turned round the X axis. prof: [(x, r)] along the axle; mod(a, j, x, r) -> (dx, dr) shapes it by angle
    (tread blocks, spokes). cap: close both ends with a fan."""
    bm = bmesh.new(); rows = []
    for i in range(seg):
        a = 2 * math.pi * i / seg; ring = []
        for j, (x, r) in enumerate(prof):
            dx, dr = mod(a, j, x, r) if mod else (0, 0)
            rr = r + dr; ring.append(bm.verts.new((x + dx, math.cos(a) * rr, math.sin(a) * rr)))
        rows.append(ring)
    n = len(prof)
    for i in range(seg):
        A, B = rows[i], rows[(i + 1) % seg]
        for j in range(n - 1):
            bm.faces.new((A[j], A[j + 1], B[j + 1], B[j]))
    if cap:
        for j in (0, n - 1):
            c = bm.verts.new((prof[j][0], 0, 0))
            for i in range(seg):
                f = (rows[i][j], rows[(i + 1) % seg][j], c) if j == 0 else (rows[(i + 1) % seg][j], rows[i][j], c)
                bm.faces.new(f)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mk(name, bm, slot, **k)

def _smooth(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

def tyre(name, R, w, parent, loc, blocks=24, deep=0.022, balloon=False):
    """a tyre: round shoulders, a tread of staggered blocks (two rows), a soft sidewall down to the rim"""
    hw = w / 2; rin = R * (0.6 if not balloon else 0.5)
    sh = (0.32 if balloon else 0.16) * w   # shoulder roundness
    prof = [(-hw * 0.86, rin), (-hw, rin + (R - rin) * 0.25), (-hw, R - sh * 1.1)]
    for t in range(1, 6):   # the shoulder: a quarter circle
        q = t / 6 * math.pi / 2; prof.append((-hw + sh * (1 - math.cos(q)), R - sh + sh * math.sin(q) - sh * 0.1))
    tread = [(-hw + sh + (w - 2 * sh) * t / 9, R) for t in range(10)]
    prof += tread
    prof += [(-x, r) for (x, r) in reversed(prof[:len(prof) - len(tread)])]
    j0, j1 = len(prof) // 2 - 5, len(prof) // 2 + 4
    def mod(a, j, x, r):
        if not (j0 - 1 <= j <= j1 + 1): return (0, 0)
        side = 0 if x < 0 else 1
        u = (a / (2 * math.pi) * blocks + side * 0.5) % 1.0   # staggered left and right rows
        block = _smooth((0.42 - abs(u - 0.5)) / 0.08)
        groove = 1 - _smooth((abs(x) - 0.03 * w) / (0.05 * w))   # a groove round the middle
        return (0, -deep * (1 - block) - deep * 0.8 * groove)
    return revolve(name, prof, 'rubber', seg=max(36, blocks * 2), mod=mod, parent=parent, loc=loc)

def rim(name, R, w, parent, loc, spokes=5, slot='accent'):
    """the rim's outer face: a dish to the hub, five rounded spokes (pockets between them), a hub cap"""
    hw = w / 2
    prof = [(-hw * 0.84, R), (-hw * 0.9, R * 0.97), (-hw * 0.9, R * 0.86), (-hw * 0.72, R * 0.8), (-hw * 0.6, R * 0.62),
            (-hw * 0.56, R * 0.42), (-hw * 0.62, R * 0.3), (-hw * 0.82, R * 0.24), (-hw * 0.9, R * 0.16), (-hw * 0.94, R * 0.05), (-hw * 0.95, 0.001)]
    def mod(a, j, x, r):
        if not (3 <= j <= 6): return (0, 0)
        u = (a / (2 * math.pi) * spokes) % 1.0
        pocket = _smooth((0.3 - abs(u - 0.5)) / 0.12)   # between the spokes
        return (hw * 1.1 * pocket * (1 if j in (4, 5) else 0.55), 0)
    o = revolve(name, prof, slot, seg=spokes * 10, mod=mod, parent=parent, loc=loc)
    # the inner side, plain (seen only through the pockets)
    revolve(name + '_in', [(hw * 0.2, R * 0.96), (-hw * 0.1, R * 0.62), (-hw * 0.1, 0.001)], 'dark', seg=30, parent=parent, loc=loc)
    sphere(name + '_cap', R * 0.22, 'metal', sx=0.5, seg=24, ring=12, parent=parent, loc=(loc[0] - hw * 0.93, loc[1], loc[2]))
    bolts(name + '_lug', [(loc[0] - hw * 0.9, loc[1] + math.cos(2 * math.pi * k / 5 + 0.3) * R * 0.34, loc[2] + math.sin(2 * math.pi * k / 5 + 0.3) * R * 0.34) for k in range(5)], R * 0.06, parent, axis='X')
    return o

def _wheel(name, r, w, hub=0.55, slot_hub='accent', balloon=False, blocks=24):
    P = group('part_' + name)
    out = -w / 2 - 0.02   # the wheel stands outside the socket (toward -X on the left side)
    tyre(name + '_tyre', r, w, P, (out, 0, r), blocks=blocks, deep=r * 0.1, balloon=balloon)
    rim(name + '_rim', r * (0.6 if not balloon else 0.5), w, P, (out, 0, r), slot=slot_hub)
    _bracket(P, name, r)
    # a mudguard over the wheel: a chamfered arc plate, sized to this wheel, with its stay to the body
    curved_plate(name + '_guard', w + 0.04, r + 0.045, math.radians(25), math.radians(155), 0.018, 'trim', parent=P, loc=(out, 0, r), rot=(0, 0, 0))
    curved_plate(name + '_bead', 0.014, r + 0.05, math.radians(25), math.radians(155), 0.03, 'metal', seg=16, parent=P, loc=(out - (w + 0.04) / 2, 0, r))   # a steel edge on the guard
    hs_block(name + '_stay', 0.03, 0.04, 0.05, 'dark', ch=0.008, parent=P, loc=(0.0, 0, r + r * 0.7))
    return P

def part_wh_s(): return _wheel('wh_s', 0.13, 0.09, blocks=18)
def part_wh_m(): return _wheel('wh_m', 0.18, 0.12, blocks=22)
def part_wh_l(): return _wheel('wh_l', 0.25, 0.15, blocks=26)
def part_wh_wide(): return _wheel('wh_wide', 0.19, 0.28, balloon=True, blocks=20)

def part_omni():
    P = group('part_omni'); r = 0.17
    cyl('om_disc', r * 0.82, 0.08, 'trim', seg=28, axis='X', bev=0.01, parent=P, loc=(-0.06, 0, r))
    for k in range(9):   # little rollers round the rim (each turns sideways)
        a = k * 2 * math.pi / 9
        cyl('om_roll%d' % k, 0.035, 0.09, 'rubber', seg=12, axis='Y', parent=P, loc=(-0.06, math.cos(a) * r * 0.86, r + math.sin(a) * r * 0.86), rot=(a, 0, 0))
    cyl('om_hub', 0.05, 0.1, 'metal', seg=16, axis='X', parent=P, loc=(-0.06, 0, r))
    _bracket(P, 'om', r)
    return P

def _hull2(pts):
    """the convex hull of 2D points, counter-clockwise (monotone chain)"""
    pts = sorted(set(pts))
    def half(seq):
        h = []
        for p in seq:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (p[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (p[0] - h[-2][0]) <= 0: h.pop()
            h.append(p)
        return h
    lo, up = half(pts), half(reversed(pts))
    return lo[:-1] + up[:-1]

def _resample(loop, n):
    """n points evenly along a closed polyline"""
    seg = [(loop[i], loop[(i + 1) % len(loop)]) for i in range(len(loop))]
    lens = [math.dist(a, b) for a, b in seg]; tot = sum(lens); out = []; k = 0; acc = 0.0
    for m in range(n):
        d = tot * m / n
        while acc + lens[k] < d: acc += lens[k]; k += 1
        a, b = seg[k]; t = (d - acc) / max(1e-9, lens[k]); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out, tot

def belt(name, wheels, w, t, slot, parent, x=0.0, n=120):
    """a track belt round wheels [(y, z, r)]: the hull of the wheels plus the belt's thickness, as a closed band of
    width w (across X) and thickness t; returns the path (for the cleats)"""
    pts = [(y + math.cos(a) * (r + t), z + math.sin(a) * (r + t)) for (y, z, r) in wheels for a in [2 * math.pi * i / 48 for i in range(48)]]
    path, tot = _resample(_hull2(pts), n)
    bm = bmesh.new(); rings = []
    for (y, z) in path:   # each point: the outer and inner edge on both sides (inner = toward the hull's centre)
        cy = sum(p[0] for p in path) / n; cz = sum(p[1] for p in path) / n
        d = Vector((0, y - cy, z - cz)).normalized()
        o = Vector((0, y, z)); ii = o - d * t
        rings.append([bm.verts.new((x - w / 2, o.y, o.z)), bm.verts.new((x + w / 2, o.y, o.z)), bm.verts.new((x + w / 2, ii.y, ii.z)), bm.verts.new((x - w / 2, ii.y, ii.z))])
    for i in range(n):
        A, B = rings[i], rings[(i + 1) % n]
        for q in range(4): bm.faces.new((A[q], A[(q + 1) % 4], B[(q + 1) % 4], B[q]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _mk(name, bm, slot, parent=parent)
    try: o.data.set_sharp_from_angle(angle=math.radians(40))
    except Exception: pass
    return path, tot

def part_tracks():
    """3.11 (Avi: "like a tank"): a raised drive sprocket at the back, so the track slopes up behind; an idler in front,
    four road wheels on the ground, return rollers on top, cleats all round the belt, a guard with bolts"""
    P = group('part_tracks'); X = -0.1; W = 0.17
    wheels = [(-0.42, 0.13, 0.11),   # the idler in front
              (-0.24, 0.09, 0.08), (-0.08, 0.09, 0.08), (0.08, 0.09, 0.08), (0.24, 0.09, 0.08),   # road wheels
              (0.44, 0.38, 0.12)]   # the drive sprocket, high at the back (Avi, 3.11: higher, nicer proportions)
    path, tot = belt('tk_belt', wheels, W, 0.03, 'rubber', P, x=X)
    n = len(path); cy = sum(p[0] for p in path) / n; cz = sum(p[1] for p in path) / n
    for k in range(0, n, 3):   # a cleat every few points, standing out of the belt, across it
        y, z = path[k]; d = Vector((0, y - cy, z - cz)).normalized(); a = math.atan2(d.z, d.y)
        hs_block('tk_cleat%d' % k, W + 0.01, 0.022, 0.016, 'dark', ch=0.004, parent=P, loc=(X, y + d.y * 0.006, z + d.z * 0.006), rot=(a - math.pi / 2, 0, 0))
    for i, (y, z, r) in enumerate(wheels):
        if i == len(wheels) - 1:   # the sprocket: teeth (ten), a hub with bolts
            revolve('tk_sprocket', [(X - W / 2 - 0.012, 0.001), (X - W / 2 - 0.012, r * 0.9), (X - W / 2 + 0.02, r * 0.9), (X - W / 2 + 0.02, 0.001)], 'accent', seg=60,
                    mod=lambda a, j, xx, rr, r=r: (0, (r * 0.14 if (a / (2 * math.pi) * 10) % 1 < 0.5 else 0) if j in (1, 2) else 0), parent=P, loc=(0, y, z))
            bolts('tk_sb', [(X - W / 2 - 0.016, y + math.cos(2 * math.pi * q / 5) * r * 0.4, z + math.sin(2 * math.pi * q / 5) * r * 0.4) for q in range(5)], 0.01, P, axis='X')
        else:
            cyl('tk_wheel%d' % i, r * 0.92, 0.03, 'metal', seg=24, axis='X', bev=0.006, parent=P, loc=(X - W / 2 - 0.004, y, z))
            bolts('tk_wb%d' % i, [(X - W / 2 - 0.02, y, z)], 0.012, P, axis='X')
    top = lambda y: 0.27 + (y + 0.42) / 0.86 * (0.53 - 0.27)   # the line of the belt's top, idler to sprocket
    for y in (-0.16, 0.12):   # return rollers carrying the top of the belt
        cyl('tk_ret_%d' % int(y * 100), 0.035, 0.03, 'dark', seg=16, axis='X', parent=P, loc=(X - W / 2 - 0.004, y, top(y) - 0.065))
    # the side plate that holds the wheels, and the guard above the belt
    hs_block('tk_plate', 0.02, 0.78, 0.08, 'dark', ch=0.008, parent=P, loc=(X + W / 2 + 0.012, 0.0, 0.14))
    # the guard follows the top of the belt, from the idler up to the sprocket
    gy0, gz0, gy1, gz1 = -0.42, 0.31, 0.44, 0.57; ga = math.atan2(gz1 - gz0, gy1 - gy0)
    hs_block('tk_guard', 0.22, math.dist((gy0, gz0), (gy1, gz1)) * 0.92, 0.022, 'trim', ch=0.008, parent=P, loc=(X, (gy0 + gy1) / 2, (gz0 + gz1) / 2), rot=(ga, 0, 0))
    bolt_row('tk_gb', (X, gy0 + 0.06, gz0 + 0.06 * math.tan(ga) + 0.014), (X, gy1 - 0.08, gz1 - 0.08 * math.tan(ga) + 0.014), 6, 0.008, P)
    _bracket(P, 'tk', 0.13, x=-0.02)
    return P

def part_float():
    # a pontoon beside the body: a long chamfered hull with a pointed nose, two struts up to the body, a bolt row
    P = group('part_float')
    hs_block('fl_body', 0.16, 0.86, 0.14, 'cream', ch=0.035, top=(0.8, 0.94), nose=0.08, panels=0.02, pdepth=0.006, parent=P, loc=(-0.07, 0, 0.1))
    hs_block('fl_stripe', 0.165, 0.5, 0.03, 'trim', ch=0.008, parent=P, loc=(-0.07, 0, 0.12))
    for y in (-0.22, 0.22):
        hs_block('fl_strut_%d' % int(y * 100), 0.03, 0.05, 0.14, 'dark', ch=0.008, parent=P, loc=(-0.025, y, 0.215), rot=(0, 0.6, 0))
    bolt_row('fl_b', (-0.07, -0.3, 0.172), (-0.07, 0.3, 0.172), 5, 0.008, P)
    return P

def part_propeller():
    P = group('part_propeller')
    cyl('pr_shaft', 0.03, 0.14, 'metal', seg=12, axis='Y', parent=P, loc=(0, 0.07, 0))
    torus('pr_duct', 0.17, 0.03, 'trim', seg=36, rseg=8, axis='Y', parent=P, loc=(0, 0.17, 0))
    b = blade3('pr_blades', 0.15, 'dark', parent=P, loc=(0, 0.17, 0), rot=(math.pi / 2, 0, 0))
    return P

# ── round 3 (3.11): the tools and sensors in moulded shapes: capsules and curved plates instead of boxes
def capsule(name, p0, p1, r, slot, r1=None, seg=20, **k):
    """a rod with round ends from p0 to p1 (r1: a taper toward p1)"""
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
    r1 = r if r1 is None else r1
    prof = []
    for t in range(6):   # the round start
        q = -math.pi / 2 + t / 5 * math.pi / 2; prof.append((r * math.sin(q), r * math.cos(q)))
    for t in range(6):   # the round end
        q = t / 5 * math.pi / 2; prof.append((L + r1 * math.sin(q), r1 * math.cos(q)))
    prof[0] = (prof[0][0], 0.0005); prof[-1] = (prof[-1][0], 0.0005)
    o = revolve(name, prof, slot, seg=seg, **k)
    rot = Vector((1, 0, 0)).rotation_difference(d.normalized())
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot
    if 'parent' in k: o.location = p0 if 'loc' not in k else o.location
    else: o.location = p0
    return o

def curved_plate(name, w, R, a0, a1, t, slot, seg=16, **k):
    """a thick plate bent round the X axis (a blade, a bucket): from angle a0 to a1 at radius R, thickness t"""
    bm = bmesh.new(); xs = [-w / 2 + w * i / 8 for i in range(9)]
    def ring(rr):
        return [[bm.verts.new((x, math.cos(a0 + (a1 - a0) * j / seg) * rr, math.sin(a0 + (a1 - a0) * j / seg) * rr)) for j in range(seg + 1)] for x in xs]
    O, I = ring(R), ring(R - t)
    n = len(xs)
    for i in range(n - 1):
        for j in range(seg):
            bm.faces.new((O[i][j], O[i][j + 1], O[i + 1][j + 1], O[i + 1][j]))
            bm.faces.new((I[i][j], I[i + 1][j], I[i + 1][j + 1], I[i][j + 1]))
    for i in range(n - 1):   # the two long edges
        for j in (0, seg): bm.faces.new((O[i][j], O[i + 1][j], I[i + 1][j], I[i][j]))
    for i in (0, n - 1):   # the two ends
        for j in range(seg): bm.faces.new((O[i][j], I[i][j], I[i][j + 1], O[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _mk(name, bm, slot, **k); bevel(o, min(0.012, t * 0.4), 2)
    return o

def _front_arms(P, pre, y_to, w=0.5):
    for k in (-1, 1):
        capsule(pre + '_arm_%d' % k, (k * w / 2, 0.02, 0.03), (k * w / 2, y_to, 0.03), 0.028, 'dark', parent=P)

def part_pusher():
    # a dozer blade, concave toward the front, ribs behind it, pistons from the arms, a cutting edge
    P = group('part_pusher')
    for k in (-1, 1):
        _beam('pu_arm_%d' % k, (k * 0.25, 0.02, 0.03), (k * 0.25, -0.16, 0.03), 0.04, 0.05, 'dark', P)
        _piston('pu_pis_%d' % k, (k * 0.16, 0.02, 0.12), (k * 0.16, -0.17, 0.2), 0.014, P)
    curved_plate('pu_blade', 0.8, 0.3, math.radians(-32), math.radians(32), 0.035, 'accent', parent=P, loc=(0, -0.46, 0.12))
    for k in (-1, 0, 1): hs_block('pu_rib_%d' % k, 0.025, 0.04, 0.26, 'dark', ch=0.006, parent=P, loc=(k * 0.25, -0.175, 0.12))
    hs_block('pu_edge', 0.8, 0.035, 0.03, 'dark', ch=0.008, parent=P, loc=(0, -0.22, -0.035))

def part_fork():
    P = group('part_fork')
    for k in (-1, 1): _beam('fo_mast_%d' % k, (k * 0.2, 0.0, 0.0), (k * 0.2, -0.1, 0.0), 0.04, 0.05, 'dark', P)
    hs_block('fo_back', 0.5, 0.04, 0.26, 'trim', ch=0.014, panels=0.018, parent=P, loc=(0, -0.11, 0.1))
    for k in (-1, 1):   # two prongs, the bar only behind them
        hs_block('fo_prong_%d' % k, 0.05, 0.42, 0.025, 'metal', ch=0.008, top=(1, 0.95), parent=P, loc=(k * 0.15, -0.33, -0.02))
        hs_block('fo_heel_%d' % k, 0.05, 0.05, 0.16, 'metal', ch=0.008, parent=P, loc=(k * 0.15, -0.14, 0.05))

def part_scoop():
    # a bucket open to the front and up: a chamfered floor and back, two sides, a lip with teeth
    P = group('part_scoop')
    for k in (-1, 1): _beam('sc_arm_%d' % k, (k * 0.23, 0.0, 0.05), (k * 0.23, -0.14, 0.05), 0.04, 0.05, 'dark', P)
    hs_block('sc_floor', 0.54, 0.3, 0.03, 'trim', ch=0.008, parent=P, loc=(0, -0.3, -0.03), rot=(-0.1, 0, 0))
    hs_block('sc_back', 0.54, 0.03, 0.22, 'trim', ch=0.008, panels=0.016, parent=P, loc=(0, -0.15, 0.07), rot=(0.25, 0, 0))
    for k in (-1, 1): hs_block('sc_side_%d' % k, 0.025, 0.3, 0.2, 'trim', ch=0.008, top=(1, 0.6), nose=0.1, parent=P, loc=(k * 0.27, -0.28, 0.05))
    hs_block('sc_lip', 0.56, 0.04, 0.03, 'dark', ch=0.008, parent=P, loc=(0, -0.45, -0.045))
    for k in range(5): hs_block('sc_tooth%d' % k, 0.04, 0.06, 0.02, 'metal', ch=0.006, top=(0.5, 0.6), parent=P, loc=(-0.2 + k * 0.1, -0.49, -0.05))

def part_brush():
    P = group('part_brush')
    for k in (-1, 1): _beam('br_arm_%d' % k, (k * 0.31, 0.0, 0.05), (k * 0.31, -0.2, 0.02), 0.04, 0.05, 'dark', P)
    hs_block('br_hood', 0.66, 0.16, 0.03, 'trim', ch=0.01, parent=P, loc=(0, -0.2, 0.13), rot=(0.25, 0, 0))
    capsule('br_core', (-0.28, -0.2, 0.02), (0.28, -0.2, 0.02), 0.07, 'dark', parent=P)
    for k in range(5):   # five bristle strips round the roller (an odd number: from the end it is a star, never a cross)
        a = k * 2 * math.pi / 5
        capsule('br_strip%d' % k, (-0.27, -0.2 + math.cos(a) * 0.08, 0.02 + math.sin(a) * 0.08), (0.27, -0.2 + math.cos(a) * 0.08, 0.02 + math.sin(a) * 0.08), 0.026, 'accent', seg=10, parent=P)

def _joint(name, at, r, parent):
    cyl(name, r, r * 1.3, 'dark', seg=24, axis='X', bev=r * 0.25, parent=parent, loc=at)
    sphere(name + '_cap', r * 0.5, 'metal', sx=0.6, seg=16, ring=8, parent=parent, loc=(at[0] - r * 0.66, at[1], at[2]))

def _gripper(name, at, parent, s=1.0, open_=0.35):
    x, y, z = at
    capsule(name + '_palm', (x - 0.05 * s, y, z), (x + 0.05 * s, y, z), 0.035 * s, 'dark', parent=parent)
    for k in (-1, 1):   # two curved fingers, opening a little
        m = (x + k * 0.05 * s, y - 0.07 * s, z + 0.005)
        capsule(name + '_f1_%d' % k, (x + k * 0.04 * s, y - 0.01, z), m, 0.02 * s, 'trim', parent=parent)
        capsule(name + '_f2_%d' % k, m, (x + k * (0.03 - open_ * 0.04) * s, y - 0.14 * s, z - 0.01), 0.018 * s, 'trim', r1=0.01 * s, parent=parent)

def part_hook():
    P = group('part_hook')
    cyl('hk_turret', 0.07, 0.05, 'dark', seg=8, bev=0.012, parent=P, loc=(0, 0, 0.025))
    _beam('hk_post', (0, 0.0001, 0.04), (0, 0, 0.34), 0.06, 0.06, 'trim', P)
    _joint_hs('hk_j', (0, 0, 0.36), 0.035, P)
    _beam('hk_boom', (0, 0.04, 0.36), (0, -0.36, 0.38), 0.05, 0.05, 'trim', P)
    capsule('hk_rope', (0, -0.34, 0.36), (0, -0.34, 0.14), 0.006, 'dark', seg=8, parent=P)
    torus('hk_hook', 0.04, 0.012, 'accent', seg=24, rseg=8, axis='X', parent=P, loc=(0, -0.34, 0.1))

def part_net():
    P = group('part_net')
    capsule('nt_pole', (0, 0.05, 0.04), (0, -0.42, 0.22), 0.02, 'wood', parent=P)
    o = torus('nt_hoop', 0.14, 0.014, 'trim', seg=36, rseg=8, axis='Y', parent=P, loc=(0, -0.54, 0.26), rot=(-0.35, 0, 0))
    revolve('nt_bag', [(0, 0.13), (0.06, 0.12), (0.14, 0.07), (0.2, 0.001)], 'cream', seg=24, parent=P, loc=(0, -0.5, 0.25), rot=(0, 0, math.pi / 2))
    return P

def part_crane():
    P = group('part_crane')
    cyl('cr_turret', 0.12, 0.07, 'dark', seg=8, bev=0.015, parent=P, loc=(0, 0, 0.035))
    _beam('cr_tower', (0, 0.0001, 0.06), (0, 0, 0.42), 0.08, 0.08, 'accent', P)
    _joint_hs('cr_j1', (0, 0, 0.44), 0.05, P)
    _beam('cr_boom', (0, 0.12, 0.44), (0, -0.62, 0.56), 0.06, 0.07, 'accent', P)
    _piston('cr_pis', (0.05, 0.0, 0.2), (0.05, -0.2, 0.47), 0.018, P)
    capsule('cr_rope', (0, -0.6, 0.53), (0, -0.6, 0.27), 0.006, 'dark', seg=8, parent=P)
    hs_block('cr_block', 0.07, 0.05, 0.07, 'metal', ch=0.012, parent=P, loc=(0, -0.6, 0.23))
    torus('cr_hook', 0.03, 0.009, 'accent', seg=20, rseg=6, axis='X', parent=P, loc=(0, -0.6, 0.17))
    hs_block('cr_weight', 0.14, 0.1, 0.12, 'dark', ch=0.018, panels=0.014, parent=P, loc=(0, 0.17, 0.44))

def _joint_hs(name, at, r, parent):
    """a joint: two clevis plates on the sides and a chamfered pin with a cap"""
    for k in (-1, 1):
        hs_block(name + '_clevis_%d' % k, 0.014, r * 2.2, r * 2.0, 'dark', ch=0.005, parent=parent, loc=(at[0] + k * r * 0.95, at[1], at[2]))
    cyl(name + '_pin', r * 0.55, r * 2.3, 'metal', seg=16, axis='X', bev=0.004, parent=parent, loc=at)

def _beam(name, p0, p1, w, h, slot, parent):
    """a chamfered beam from p0 to p1 (in the YZ plane), with a panel line"""
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
    a = math.atan2(d.z, -d.y)   # pitch, toward -Y and up
    m = (p0 + p1) / 2
    return hs_block(name, w, L, h, slot, ch=min(w, h) * 0.28, panels=min(w, h) * 0.18, pdepth=0.003, parent=parent, loc=tuple(m), rot=(-a, 0, 0))

def _piston(name, p0, p1, r, parent):
    """a hydraulic piston: a fat cylinder and a thin shining rod"""
    p0, p1 = Vector(p0), Vector(p1); m = p0 + (p1 - p0) * 0.55
    capsule(name + '_cyl', p0, m, r, 'dark', seg=14, parent=parent)
    capsule(name + '_rod', m, p1, r * 0.5, 'metal', seg=12, parent=parent)

def _gripper_hs(name, at, parent, s=1.0):
    x, y, z = at
    hs_block(name + '_wrist', 0.09 * s, 0.06 * s, 0.07 * s, 'dark', ch=0.01, parent=parent, loc=(x, y - 0.02 * s, z))
    for k in (-1, 1):   # two jaws: a straight root and a bent tip, chamfered, a rubber pad inside
        hs_block(name + '_jaw_%d' % k, 0.022 * s, 0.1 * s, 0.05 * s, 'trim', ch=0.006, parent=parent, loc=(x + k * 0.04 * s, y - 0.1 * s, z), rot=(0, 0, k * 0.18))
        hs_block(name + '_tip_%d' % k, 0.02 * s, 0.06 * s, 0.045 * s, 'trim', ch=0.006, parent=parent, loc=(x + k * 0.03 * s, y - 0.17 * s, z), rot=(0, 0, -k * 0.35))
        hs_block(name + '_pad_%d' % k, 0.008 * s, 0.05 * s, 0.035 * s, 'rubber', ch=0.002, parent=parent, loc=(x + k * 0.025 * s, y - 0.17 * s, z), rot=(0, 0, -k * 0.35))

def _segarm(name, segs, s=1.0):
    """an arm of chamfered beams [(length, pitch)], a clevis joint at each bend, a piston along the first beam, a gripper"""
    P = group('part_' + name)
    cyl(name + '_base', 0.08, 0.05, 'dark', seg=8, bev=0.012, parent=P, loc=(0, 0, 0.025))   # an eight-sided turntable
    hs_block(name + '_tower', 0.07, 0.08, 0.08, 'trim', ch=0.014, parent=P, loc=(0, 0, 0.08))
    y, z = 0.0, 0.11; pts = [(0, y, z)]
    for i, (L, a) in enumerate(segs):
        dy, dz = -math.cos(a) * L, math.sin(a) * L
        _beam(name + '_seg%d' % i, (0, y, z), (0, y + dy, z + dz), 0.06 - i * 0.008, 0.07 - i * 0.01, 'trim', P)
        pts.append((0, y + dy, z + dz)); y += dy; z += dz
    for i, q in enumerate(pts): _joint_hs(name + '_j%d' % i, q, 0.04 - i * 0.004, P)
    if len(pts) > 2:   # the piston of the first beam: from the tower to the middle of the beam
        mid = Vector(pts[0]).lerp(Vector(pts[1]), 0.6)
        _piston(name + '_pis', (0.045, 0.04, 0.06), (0.045, mid.y, mid.z), 0.016, P)
    _gripper_hs(name + '_g', (0, y - 0.02, z), P, s=s)
    return P

def part_arm_long(): return _segarm('arm_long', [(0.32, 0.5), (0.34, -0.35)])
def part_arm_fold(): return _segarm('arm_fold', [(0.2, 1.15), (0.22, -0.9), (0.12, -0.25)], s=0.85)
def part_claw2(): return _segarm('claw2', [(0.26, 0.35), (0.16, -0.5)], s=0.9)

# ── on top
def part_seedbox():
    P = group('part_seedbox')
    hs_block('sb_box', 0.36, 0.28, 0.18, 'trim', ch=0.022, top=(1.08, 1.08), panels=0.02, pdepth=0.006, parent=P, loc=(0, 0, 0.1))
    hs_block('sb_lid', 0.4, 0.32, 0.03, 'accent', ch=0.01, parent=P, loc=(0, 0, 0.205))
    hs_block('sb_handle', 0.12, 0.025, 0.025, 'dark', ch=0.006, parent=P, loc=(0, -0.08, 0.232))
    lamp_housing('sb_window', P, (0, -0.15, 0.1), w=0.12, h=0.06)
    for k in range(3): sphere('sb_seed%d' % k, 0.022, 'wood', sz=1.3, seg=12, ring=8, parent=P, loc=(-0.05 + k * 0.05, -0.18, 0.1))
    hs_block('sb_chute', 0.06, 0.06, 0.12, 'dark', ch=0.01, top=(0.6, 0.6), parent=P, loc=(0.12, -0.09, -0.03))

def part_sprayer():
    P = group('part_sprayer')
    shell('spr_tank', 0.12, 0.2, 0.12, 'trim', e1=0.55, e2=0.55, parent=P, loc=(0, 0.02, 0.15))
    for k in (-1, 1): hs_block('spr_strap_%d' % k, 0.27, 0.03, 0.03, 'dark', ch=0.008, parent=P, loc=(0, 0.02 + k * 0.1, 0.03))
    for k in (-1, 1): hs_block('spr_band_%d' % k, 0.25, 0.022, 0.25, 'accent', ch=0.008, parent=P, loc=(0, 0.02 + k * 0.1, 0.15))
    hs_block('spr_pump', 0.1, 0.08, 0.08, 'dark', ch=0.012, panels=0.012, parent=P, loc=(0.0, -0.2, 0.1))
    capsule('spr_hose', (0.0, -0.24, 0.12), (0.06, -0.34, 0.18), 0.014, 'dark', seg=10, parent=P)
    capsule('spr_nozzle', (0.06, -0.34, 0.18), (0.06, -0.42, 0.18), 0.022, 'metal', r1=0.012, seg=14, parent=P)

def part_cammount():
    P = group('part_cammount')
    cyl('cm_foot', 0.05, 0.03, 'dark', seg=8, bev=0.008, parent=P, loc=(0, 0, 0.015))
    capsule('cm_pole', (0, 0, 0.02), (0, 0, 0.22), 0.02, 'metal', seg=12, parent=P)
    _joint_hs('cm_j', (0, 0, 0.24), 0.03, P)
    hs_block('cm_cam', 0.16, 0.12, 0.1, 'dark', ch=0.018, panels=0.014, pdepth=0.004, parent=P, loc=(0, 0.0, 0.3))
    hs_block('cm_hood', 0.14, 0.05, 0.02, 'dark', ch=0.006, parent=P, loc=(0, -0.075, 0.355))
    cyl('cm_barrel', 0.042, 0.05, 'metal', seg=24, axis='Y', bev=0.008, parent=P, loc=(0, -0.07, 0.3))
    lamp('cm_lens', 0.032, P, (0, -0.096, 0.3))

def part_gyro():
    P = group('part_gyro')
    hs_block('gy_box', 0.15, 0.15, 0.06, 'cream', ch=0.014, panels=0.012, parent=P, loc=(0, 0, 0.03))
    for k in (-1, 1): hs_block('gy_post_%d' % k, 0.02, 0.03, 0.09, 'dark', ch=0.005, parent=P, loc=(k * 0.06, 0, 0.1))
    torus('gy_ring', 0.055, 0.009, 'glow', seg=32, rseg=8, parent=P, loc=(0, 0, 0.12), rot=(0.5, 0, 0))
    sphere('gy_core', 0.028, 'accent', parent=P, loc=(0, 0, 0.12))

def part_light():
    P = group('part_light')
    cyl('li_base', 0.06, 0.035, 'dark', seg=8, bev=0.008, parent=P, loc=(0, 0, 0.018))
    sphere('li_dome', 0.05, 'glass', cut=0.0, parent=P, loc=(0, 0, 0.035))
    sphere('li_eye', 0.026, 'glow', parent=P, loc=(0, 0, 0.05))

def part_color():
    P = group('part_color')
    hs_block('co_box', 0.12, 0.08, 0.07, 'dark', ch=0.012, panels=0.01, parent=P, loc=(0, -0.04, 0))
    lamp('co_lens', 0.022, P, (0, -0.045, -0.037), axis='Z')

def part_distance():
    P = group('part_distance')
    hs_block('ds_plate', 0.28, 0.03, 0.11, 'dark', ch=0.012, panels=0.01, parent=P, loc=(0, -0.012, 0))
    for k in (-1, 1):
        cyl('ds_eye_%d' % k, 0.042, 0.045, 'metal', seg=24, axis='Y', bev=0.01, parent=P, loc=(k * 0.07, -0.045, 0))
        lamp('ds_lens_%d' % k, 0.03, P, (k * 0.07, -0.07, 0))

def part_touch():
    P = group('part_touch')
    hs_block('to_bar', 0.5, 0.05, 0.06, 'dark', ch=0.014, top=(0.96, 0.8), parent=P, loc=(0.11, -0.07, 0.02))
    for k in (-1, 1): _piston('to_spring_%d' % k, (0.11 + k * 0.16, 0.0, 0.02), (0.11 + k * 0.16, -0.05, 0.02), 0.012, P)
    hs_block('to_button', 0.06, 0.02, 0.03, 'accent', ch=0.006, parent=P, loc=(0.11, -0.1, 0.02))

def part_humidity():
    P = group('part_humidity')
    box('hu_box', 0.06, 0.1, 0.08, 'cream', r=0.015, parent=P, loc=(-0.03, 0, 0))
    cyl('hu_rod', 0.012, 0.36, 'metal', seg=8, parent=P, loc=(-0.08, -0.04, -0.16), rot=(0.25, 0.3, 0))
    sphere('hu_tip', 0.02, 'glow', parent=P, loc=(-0.13, -0.08, -0.33))
    return P

# ── extras
def part_caster():
    P = group('part_caster')
    cyl('ca_cup', 0.06, 0.05, 'dark', seg=20, parent=P, loc=(0, 0, 0.0))
    sphere('ca_ball', 0.055, 'metal', parent=P, loc=(0, 0, -0.05))
    cyl('ca_post', 0.02, 0.1, 'metal', seg=10, parent=P, loc=(0, 0, 0.06))
    return P

def part_ballast():
    P = group('part_ballast')
    for k in range(2): hs_block('ba_block%d' % k, 0.36 - k * 0.06, 0.2, 0.06, 'metal' if k == 0 else 'dark', ch=0.012, panels=0.012, parent=P, loc=(0, 0, -0.02 - k * 0.065))


# ── the mechanisms inside the body (round 10, for the workshop's icons; they are not drawn on the robot)
def gear_wheel(name, R, t, teeth, slot, parent, loc, axis='X'):
    """a spur gear: a toothed rim (rounded teeth), a hub and five round holes (never spokes in a cross)"""
    def mod(a, j, x, r):
        if j not in (1, 2): return (0, 0)
        u = (a / (2 * math.pi) * teeth) % 1.0
        return (0, R * 0.16 * _smooth((0.3 - abs(u - 0.5)) / 0.035))   # square teeth with a small round
    o = revolve(name, [(-t / 2, 0.001), (-t / 2, R), (t / 2, R), (t / 2, 0.001)], slot, seg=teeth * 6, mod=mod, parent=parent, loc=loc)
    if axis == 'Z': o.rotation_euler = (0, math.pi / 2, 0)
    cyl(name + '_hub', R * 0.28, t * 1.6, 'metal', seg=20, axis=axis, bev=0.004, parent=parent, loc=loc)
    return o

def part_motor_med():
    P = group('part_motor_med')
    hs_block('mm_case', 0.14, 0.2, 0.14, 'dark', ch=0.025, panels=0.014, parent=P, loc=(0, 0, 0.07))
    for i in range(4): cyl('mm_fin%d' % i, 0.078, 0.012, 'metal', seg=8, axis='Y', parent=P, loc=(0, 0.05 - i * 0.03, 0.07))
    cyl('mm_shaft', 0.014, 0.08, 'metal', seg=12, axis='Y', parent=P, loc=(0, -0.14, 0.07))
    hs_block('mm_label', 0.07, 0.06, 0.004, 'accent', ch=0.002, parent=P, loc=(0, 0.04, 0.142))
    bolts('mm_b', [(k * 0.05, -0.1, 0.07 + m * 0.05) for k in (-1, 1) for m in (-1, 1)], 0.007, P, axis='Y')
    return P

def part_motor_big():
    P = group('part_motor_big')
    hs_block('mb_case', 0.2, 0.28, 0.2, 'dark', ch=0.035, panels=0.018, parent=P, loc=(0, 0, 0.1))
    for i in range(5): cyl('mb_fin%d' % i, 0.11, 0.014, 'metal', seg=8, axis='Y', parent=P, loc=(0, 0.08 - i * 0.035, 0.1))
    cyl('mb_shaft', 0.02, 0.1, 'metal', seg=12, axis='Y', parent=P, loc=(0, -0.19, 0.1))
    hs_block('mb_label', 0.1, 0.08, 0.004, 'body', ch=0.002, parent=P, loc=(0, 0.05, 0.202))
    sweep('mb_cable', [(0.08, 0.12, 0.04), (0.14, 0.18, 0.02), (0.16, 0.24, 0.0)], 0.01, 'accent', ring=6, parent=P)
    return P

def part_gear_fast():   # a big gear driving a small one: faster
    P = group('part_gear_fast')
    gear_wheel('gf_big', 0.16, 0.035, 20, 'accent', P, (0, 0, 0.18))
    gear_wheel('gf_small', 0.08, 0.035, 10, 'trim', P, (0, -0.235, 0.18))
    hs_block('gf_plate', 0.02, 0.5, 0.36, 'dark', ch=0.01, panels=0.014, parent=P, loc=(0.035, -0.1, 0.18))
    return P

def part_gear_strong():   # a small gear driving a big one: stronger
    P = group('part_gear_strong')
    gear_wheel('gs_small', 0.08, 0.035, 10, 'accent', P, (0, 0, 0.18))
    gear_wheel('gs_big', 0.16, 0.035, 20, 'trim', P, (0, -0.235, 0.18))
    hs_block('gs_plate', 0.02, 0.5, 0.36, 'dark', ch=0.01, panels=0.014, parent=P, loc=(0.035, -0.1, 0.18))
    return P

def part_worm():
    P = group('part_worm')
    gear_wheel('wo_wheel', 0.13, 0.04, 18, 'trim', P, (0, 0, 0.14))
    coil('wo_screw', (0, 0, 0), 0.04, 0.3, 6, 0.014, 'metal', P)
    o = bpy.data.objects['wo_screw']; o.rotation_euler = (math.pi / 2, 0, 0); o.location = (0.0, 0.15, 0.31)
    cyl('wo_core', 0.03, 0.32, 'dark', seg=16, axis='Y', parent=P, loc=(0, 0.0, 0.31))
    return P

def part_rack():
    P = group('part_rack')
    hs_block('ra_bar', 0.05, 0.6, 0.05, 'metal', ch=0.01, parent=P, loc=(0, 0, 0.03))
    for i in range(12): hs_block('ra_tooth%d' % i, 0.05, 0.022, 0.025, 'metal', ch=0.005, top=(1, 0.5), parent=P, loc=(0, -0.27 + i * 0.049, 0.065))
    gear_wheel('ra_pinion', 0.07, 0.04, 10, 'accent', P, (0, 0, 0.15))
    return P

def part_lever():
    P = group('part_lever')
    hs_block('lv_base', 0.12, 0.12, 0.05, 'dark', ch=0.012, parent=P, loc=(0, 0, 0.025))
    hs_block('lv_post', 0.05, 0.04, 0.12, 'dark', ch=0.01, top=(0.7, 0.7), parent=P, loc=(0, 0, 0.1))
    _beam('lv_beam', (0, 0.28, 0.12), (0, -0.28, 0.22), 0.04, 0.04, 'accent', P)
    _joint_hs('lv_pin', (0, 0, 0.17), 0.03, P)
    return P

def part_spring_launch():
    P = group('part_spring_launch')
    hs_block('sl_base', 0.14, 0.1, 0.04, 'dark', ch=0.01, parent=P, loc=(0, 0, 0.02))
    coil('sl_coil', (0, 0, 0.04), 0.04, 0.2, 7, 0.007, 'accent', P)
    hs_block('sl_cap', 0.12, 0.12, 0.03, 'trim', ch=0.01, parent=P, loc=(0, 0, 0.26))
    return P

# ── a part for the right side made as the mirror of the left one (3.11, Avi: the tracks were reversed on the right;
# a turned part puts its back in front). The copy hangs under an empty scaled -1 in X; the export turns its triangles
# back round (a mirror reverses them).
def mirrored(src_fn, name):
    def build():
        src = src_fn()
        P = group('part_' + name); m = group(name + '_mirror', parent=P); m.scale = (-1, 1, 1)
        for ch in list(src.children): ch.parent = m
        bpy.data.objects.remove(src, do_unlink=True)
        return P
    return build

if '_mesh_slots0' not in globals(): _mesh_slots0 = _mesh_slots
def _mesh_slots(o, rel):
    out = _mesh_slots0(o, rel)
    if (rel @ mw(o)).determinant() < 0:   # mirrored: each triangle's corners in the other order (positions and normals)
        for S in out.values():
            p, n = S['p'], S['n']
            for t in range(0, len(p), 9):
                p[t + 3:t + 6], p[t + 6:t + 9] = p[t + 6:t + 9], p[t + 3:t + 6]
                n[t + 3:t + 6], n[t + 6:t + 9] = n[t + 6:t + 9], n[t + 3:t + 6]
    return out

WK_BASES = {'wk_s': lambda: build_wk('s'), 'wk_m': lambda: build_wk('m'), 'wk_l': lambda: build_wk('l')}
WK_PARTS = {
    'wh_s': part_wh_s, 'wh_m': part_wh_m, 'wh_l': part_wh_l, 'wh_wide': part_wh_wide, 'omni': part_omni,
    'tracks': part_tracks, 'float': part_float, 'tracks_r': mirrored(part_tracks, 'tracks_r'), 'float_r': mirrored(part_float, 'float_r'), 'propeller': part_propeller,
    'pusher': part_pusher, 'fork': part_fork, 'scoop': part_scoop, 'brush': part_brush,
    'claw2': part_claw2, 'sprayer': part_sprayer, 'hook': part_hook, 'net': part_net, 'crane': part_crane, 'arm_long': part_arm_long, 'arm_fold': part_arm_fold,
    'seedbox': part_seedbox, 'cammount': part_cammount, 'gyro': part_gyro, 'light': part_light,
    'color': part_color, 'distance': part_distance, 'touch': part_touch, 'humidity': part_humidity,
    'caster': part_caster, 'ballast': part_ballast,
    'motor_med': part_motor_med, 'motor_big': part_motor_big, 'gear_fast': part_gear_fast, 'gear_strong': part_gear_strong,
    'worm': part_worm, 'rack': part_rack, 'lever': part_lever, 'spring_launch': part_spring_launch,
}
BASES.update(WK_BASES); PARTS.update(WK_PARTS)

# a review line-up: the three chassis with different sets
WK_LOOKS = [
    ('wk_s', {'wfl': 'wh_s', 'wfr': 'wh_s', 'wbl': 'wh_s', 'wbr': 'wh_s', 'nose': 'color', 'eyes': 'distance', 'arm': 'claw2', 'back': 'seedbox', 'under': 'caster'}),
    ('wk_m', {'wfl': 'wh_wide', 'wfr': 'wh_wide', 'wbl': 'wh_wide', 'wbr': 'wh_wide', 'front': 'scoop', 'head': 'cammount', 'deck': 'gyro', 'back': 'sprayer', 'top': 'light', 'probe': 'humidity'}),
    ('wk_l', {'tl': 'tracks', 'tr': 'tracks_r', 'front': 'pusher', 'arm': 'crane', 'back': 'solar', 'top': 'beacon', 'belly': 'ballast', 'eyes': 'distance', 'nose': 'touch'}),
    ('wk_m', {'tl': 'float', 'tr': 'float_r', 'rear': 'propeller', 'arm': 'net', 'deck': 'gyro', 'head': 'cammount', 'back': 'drone_pad'}),
    ('wk_s', {'wfl': 'omni', 'wfr': 'omni', 'wbl': 'omni', 'wbr': 'omni', 'front': 'fork', 'arm': 'arm_fold', 'top': 'antenna'}),
    ('wk_l', {'wfl': 'wh_l', 'wfr': 'wh_l', 'wbl': 'wh_l', 'wbr': 'wh_l', 'front': 'brush', 'arm': 'hook', 'back': 'bin', 'head': 'cammount'}),
    ('wk_m', {'wfl': 'wh_m', 'wfr': 'wh_m', 'wbl': 'wh_m', 'wbr': 'wh_m', 'arm': 'arm_long', 'eyes': 'distance', 'back': 'seedbox'}),
]

def rl_wk_preview(path, pct=60, samples=24, which=None):
    """the line-up in two rows, from the front-left (as the game's turntable sees it)"""
    global LOOKS
    shc = _show_coll()
    for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    sc, c = _coll(); c.hide_render = True
    looks = WK_LOOKS if which is None else [WK_LOOKS[i] for i in which]
    shows = []
    for i, (base, look) in enumerate(looks):
        col, row = i % 4, i // 4
        shows.append(rl_assemble(base.replace('base_', ''), look, (-2.4 + col * 1.6, row * 1.8, 0)))
    for s in shows:
        for o in [s] + list(s.children_recursive): o.hide_render = False
    # rl_preview sets up the stage and renders; it would rebuild its own line-up, so the camera is set here instead
    stage = bpy.data.collections.get('RL_stage')
    cam = bpy.data.objects.get('rl_cam')
    if not stage or not cam:
        return {'need': 'run rl_preview once first'}
    cam.location = (-0.3, -6.6, 3.4); cam.rotation_euler = Euler((math.radians(64), 0, math.radians(-4))); cam.data.lens = 34
    sc.camera = cam
    sc.render.resolution_percentage = pct
    try: sc.eevee.taa_render_samples = samples
    except Exception: pass
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    return path

def _look_at(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def rl_wk_one(i, path, pct=50, samples=24, look=None):
    """one robot of the line-up (or a given (base, look)), close up from the front-left, like the workshop's turntable"""
    shc = _show_coll()
    for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    sc, c = _coll(); c.hide_render = True
    base, lk = look or WK_LOOKS[i]
    s = rl_assemble(base, lk, (0, 0, 0))
    for o in [s] + list(s.children_recursive): o.hide_render = False
    cam = bpy.data.objects.get('rl_cam')
    if not cam: return {'need': 'run rl_preview once first'}
    L = WK_SIZE.get(base[-1], (0.8, 1.2, 0.3))[1]; tall = base == 'wk_t'
    cam.location = (-1.25 * L / 1.02, -1.75 * L / 1.02, 1.0 * L / 1.02); cam.data.lens = 40
    if tall: cam.location = (-1.25, -2.9, 1.25)
    _look_at(cam, (0, 0, 0.8 if tall else 0.3))
    _review_light()
    sc.camera = cam; sc.render.resolution_x = 1200; sc.render.resolution_y = 900; sc.render.resolution_percentage = pct
    try: sc.eevee.taa_render_samples = samples
    except Exception: pass
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    return path

def rl_wk_part(pid, path, pct=50, samples=32, dist=1.0):
    """one part alone, close up (the review of a round; later the workshop's icons)"""
    shc = _show_coll()
    for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    sc, c = _coll(); c.hide_render = True
    P = bpy.data.objects['part_' + pid]
    root = _copy_tree(P, None); root.name = 'show_' + pid
    for o in [root] + list(root.children_recursive): o.hide_render = False
    dg = sc.view_layers[0].depsgraph; dg.update()
    pts = [mw(o) @ Vector(v) for o in [root] + list(root.children_recursive) if o.type == 'MESH' for v in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (lo + hi) / 2; size = max((hi - lo).length, 0.2)
    cam = bpy.data.objects.get('rl_cam')
    cam.location = ctr + Vector((-1.0, -1.25, 0.75)).normalized() * size * 1.35 * dist; cam.data.lens = 50
    _look_at(cam, ctr)
    sc.camera = cam; sc.render.resolution_x = 800; sc.render.resolution_y = 800; sc.render.resolution_percentage = pct
    try: sc.eevee.taa_render_samples = samples
    except Exception: pass
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    return path

def _review_light():
    """a three-light setup for the review pictures: a warm key, a cool fill, a rim from behind; soft shadows"""
    sc = bpy.data.scenes.get('robolab'); st = bpy.data.collections.get('RL_stage')
    def light(n, kind, energy, loc, color, size=1.0):
        o = bpy.data.objects.get(n)
        if not o:
            o = bpy.data.objects.new(n, bpy.data.lights.new(n, kind)); st.objects.link(o)
        o.data.energy = energy; o.data.color = color; o.location = loc
        if kind == 'AREA': o.data.size = size
        _look_at(o, (0, 0, 0.3)); return o
    light('rl_key', 'AREA', 260, (-2.2, -2.4, 2.6), (1.0, 0.95, 0.88), 2.0)
    light('rl_fill', 'AREA', 90, (2.6, -1.6, 1.2), (0.85, 0.92, 1.0), 3.0)
    light('rl_rim', 'AREA', 200, (0.6, 2.8, 2.0), (1.0, 1.0, 1.0), 1.5)
    sun = bpy.data.objects.get('rl_sun')
    if sun: sun.data.energy = 1.2
    try:
        sc.eevee.use_shadows = True; sc.eevee.use_raytracing = True
    except Exception: pass


ICON_VIEW = {'gear_fast': (-1.6, -0.5, 0.6), 'gear_strong': (-1.6, -0.5, 0.6), 'worm': (-1.5, -0.8, 0.7), 'rack': (-1.5, -0.6, 0.8), 'lever': (-1.6, -0.6, 0.6)}
def rl_wk_icon(kind, pid, path, px=256, samples=48):
    """a workshop icon: one part (kind 'part') or a bare chassis (kind 'base'), on a transparent background, from the
    front-left and a little above, lit like the review pictures"""
    shc = _show_coll()
    for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    sc, c = _coll(); c.hide_render = True
    src = bpy.data.objects[('part_' if kind == 'part' else 'base_') + pid]
    root = _copy_tree(src, None); root.name = 'show_' + pid
    for o in [root] + list(root.children_recursive): o.hide_render = False
    floor = bpy.data.objects.get('rl_floor')
    if floor: floor.hide_render = True
    sc.view_layers[0].depsgraph.update()
    pts = [mw(o) @ Vector(v) for o in [root] + list(root.children_recursive) if o.type == 'MESH' for v in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (lo + hi) / 2; size = max((hi - lo).length, 0.12)
    cam = bpy.data.objects.get('rl_cam')
    cam.location = ctr + Vector(ICON_VIEW.get(pid, (-1.0, -1.3, 0.8))).normalized() * size * 1.55; cam.data.lens = 50
    _look_at(cam, ctr); _review_light()
    sc.camera = cam; sc.render.film_transparent = True
    sc.render.resolution_x = px; sc.render.resolution_y = px; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    try: sc.eevee.taa_render_samples = samples
    except Exception: pass
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    sc.render.film_transparent = False
    if floor: floor.hide_render = False
    return path

# ── the workshop's front picture (round 10): three built robots on lit platforms in a workshop hall, Kubi beside them
def rl_wk_hero(path, px=(1600, 720), samples=64, kubi=True):
    sc, c = _coll()
    shc = _show_coll()
    for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    c.hide_render = True
    hc = bpy.data.collections.get('RL_hero')
    if hc:
        for o in list(hc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    else:
        hc = bpy.data.collections.new('RL_hero'); sc.collection.children.link(hc)
    def put(o):
        for coll in list(o.users_collection): coll.objects.unlink(o)
        hc.objects.link(o); o.hide_render = False; return o
    floor = bpy.data.objects.get('rl_floor')
    if floor: floor.hide_render = True
    # the hall: a dark floor with panel lines, a back wall of panels with a long window band, side shelves
    put(hs_block('h_floor', 14, 9, 0.1, 'dark', ch=0.0, loc=(0, 1.5, -0.05)))
    for i in range(-6, 7): put(hs_block('h_fl_%d' % i, 0.012, 9, 0.004, 'metal', ch=0.0, loc=(i * 1.0, 1.5, 0.002)))
    put(hs_block('h_wall', 14, 0.2, 4.4, 'dark', ch=0.02, loc=(0, 3.6, 2.2)))
    for i in range(-7, 8):   # wall panels between pillars, a stripe and a window band of light
        put(hs_block('h_pan_%d' % i, 0.9, 0.06, 2.6, 'trim' if i % 2 else 'cream', ch=0.02, panels=0.05, pdepth=0.015, loc=(i * 1.0, 3.48, 1.4)))
        put(hs_block('h_pil_%d' % i, 0.1, 0.12, 4.0, 'metal', ch=0.02, loc=(i * 1.0 + 0.5, 3.44, 2.0)))
    put(hs_block('h_band', 13, 0.05, 0.36, 'glow', ch=0.01, loc=(0, 3.42, 2.95)))
    put(hs_block('h_stripe', 13, 0.05, 0.08, 'accent', ch=0.01, loc=(0, 3.42, 0.25)))
    for k in (-1, 1):
        put(hs_block('h_shelf_%d' % k, 1.6, 0.5, 0.06, 'trim', ch=0.01, loc=(k * 4.4, 3.2, 1.2)))
        put(hs_block('h_shelf2_%d' % k, 1.6, 0.5, 0.06, 'trim', ch=0.01, loc=(k * 4.4, 3.2, 1.9)))
        for j in range(3): put(hs_block('h_box_%d_%d' % (k, j), 0.4, 0.35, 0.3, ('body', 'accent', 'trim')[j], ch=0.02, panels=0.02, loc=(k * 4.4 + (j - 1) * 0.5, 3.2, 1.38)))
        for j in range(4): put(cyl('h_can_%d_%d' % (k, j), 0.1, 0.25, 'metal', seg=16, bev=0.01, loc=(k * 4.4 + (j - 1.5) * 0.35, 3.2, 2.06)))
    # three platforms with a glowing ring
    spots = [(-2.3, 0.7, 'wk_l', 0.55), (0.0, 0.0, 'wk_m', -0.45), (2.3, 0.7, 'wk_m', -0.95)]
    looks = [WK_LOOKS[2][1], WK_LOOKS[0][1] | {'wfl': 'wh_m', 'wfr': 'wh_m', 'wbl': 'wh_m', 'wbr': 'wh_m'}, WK_LOOKS[1][1]]
    for i, (x, y, base, yaw) in enumerate(spots):
        put(cyl('h_plat_%d' % i, 0.95, 0.1, 'dark', seg=48, bev=0.02, loc=(x, y, 0.05)))
        put(torus('h_ring_%d' % i, 0.92, 0.018, 'glow', seg=64, rseg=8, loc=(x, y, 0.1)))
        r = rl_assemble(base, looks[i], (x, y, 0.1)); r.rotation_euler = (0, 0, yaw)
        for o in [r] + list(r.children_recursive): o.hide_render = False
    if kubi and bpy.data.objects.get('J:kubi'):
        k = _copy_tree(bpy.data.objects['J:kubi'], None); k.location = (-1.15, -1.25, 0); k.rotation_euler = (0, 0, 0.3); k.scale = (0.8, 0.8, 0.8)
        for o in [k] + list(k.children_recursive):
            o.hide_render = False
            if o.name.startswith('J:shoulder_r'): o.rotation_euler = (0, -2.4, 0)
            if o.name.startswith('J:elbow_r'): o.rotation_euler = (0, -0.5, 0)
            if o.name.startswith('S:face'):   # his face as the game draws it: two happy eyes and a smile, in light
                for kx in (-1, 1):
                    e = put(capsule('h_eye_%d' % kx, (kx * 0.08, -0.004, 0.02), (kx * 0.08, -0.004, 0.06), 0.028, 'glow', seg=16)); e.parent = o
                m = put(sweep('h_smile', [(math.cos(a) * 0.08, -0.004, -0.05 + math.sin(a) * 0.04) for a in [math.pi + 0.5 + t * (math.pi - 1.0) / 8 for t in range(9)]], 0.012, 'glow', ring=8)); m.parent = o
    cam = bpy.data.objects.get('rl_cam')
    cam.location = (0.2, -6.3, 1.75); cam.data.lens = 33; _look_at(cam, (0, 0.8, 0.62))
    _review_light()
    for n, e in (('rl_key', 900), ('rl_fill', 300), ('rl_rim', 700)):
        o = bpy.data.objects.get(n); o.data.energy = e
    bpy.data.objects['rl_key'].location = (-3.5, -4.0, 4.5); _look_at(bpy.data.objects['rl_key'], (0, 0.5, 0.4))
    bpy.data.objects['rl_rim'].location = (1.5, 3.0, 3.5); _look_at(bpy.data.objects['rl_rim'], (0, 0.5, 0.4))
    sc.camera = cam; sc.render.film_transparent = False
    sc.render.resolution_x, sc.render.resolution_y = px; sc.render.resolution_percentage = 100
    try: sc.eevee.taa_render_samples = samples
    except Exception: pass
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    for o in list(hc.all_objects): o.hide_render = True
    if floor: floor.hide_render = False
    return path

# ── Kubi's portraits for the guide's bubble (1.4.3: he leads the robot workshop's tutorial). Two frames (idle, wave),
# his screen left dark: the game draws his live face on it (src/ui/kubi-face.js), at the screen's place in the picture,
# which is written beside the frames (normalised x, y, w, h of the face plane, the same 0.4 x 0.287 m as three/kubi.js)
def kubi_portraits(outdir, px=(300, 446), samples=48):
    from bpy_extras.object_utils import world_to_camera_view
    sc, c = _coll()
    shc = _show_coll()
    for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    c.hide_render = True
    for n in ('RL_hero',):
        hc = bpy.data.collections.get(n)
        if hc:
            for o in hc.all_objects: o.hide_render = True
    floor = bpy.data.objects.get('rl_floor')
    if floor: floor.hide_render = True
    out = {}
    for pose in ('idle', 'wave'):
        for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
        k = _copy_tree(bpy.data.objects['J:kubi'], None); k.location = (0, 0, 0); k.rotation_euler = (0, 0, 0.32)
        for o in [k] + list(k.children_recursive):
            o.hide_render = False
            if pose == 'wave' and o.name.startswith('J:shoulder_r'): o.rotation_euler = (0, -2.4, 0)
            if pose == 'wave' and o.name.startswith('J:elbow_r'): o.rotation_euler = (0, -0.5, 0)
        cam = bpy.data.objects.get('rl_cam')
        cam.location = (0.55, -3.3, 0.85); cam.data.lens = 52; _look_at(cam, (0.02, 0, 0.62))
        _review_light()
        sc.camera = cam; sc.render.film_transparent = True
        sc.render.resolution_x, sc.render.resolution_y = px; sc.render.resolution_percentage = 100
        sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
        try: sc.eevee.taa_render_samples = samples
        except Exception: pass
        sc.view_layers[0].depsgraph.update()
        f = next(o for o in k.children_recursive if o.name.startswith('S:face'))
        M = mw(f); pts = [world_to_camera_view(sc, cam, M @ Vector((x, 0, z))) for x in (-0.2, 0.2) for z in (-0.1435, 0.1435)]
        xs = [p.x for p in pts]; ys = [1 - p.y for p in pts]
        out[pose] = {'x': round(min(xs), 4), 'y': round(min(ys), 4), 'w': round(max(xs) - min(xs), 4), 'h': round(max(ys) - min(ys), 4)}
        sc.render.filepath = outdir + '\\kubi_' + pose + '.png'
        bpy.ops.render.render(write_still=True, scene=sc.name)
    sc.render.film_transparent = False
    if floor: floor.hide_render = False
    json.dump({'w': px[0], 'h': px[1], 'screen': out}, open(outdir + '\\kubi_portraits.json', 'w'))
    return out

# ── the tall robot (Avi, 3.11): an original robot of our own on tracks: a tracked base, a waist, a chest, shoulders
# with mounting places, two arms with grippers, and a head. Three heads are drawn for Avi to choose from; none is a
# copy of any known robot. Sockets: tl tr (tracks), shl shr (on the shoulders), head, back, chest.
def build_tall():
    """round 2 (Avi: taller, a humanoid on tracks, built of parts you can see): a tracked base, hips with actuators, an
    exposed spine, a chest of layered plates over a frame, shoulder mounts, an exposed neck"""
    R = group('base_wk_t')
    # the tracked base and the hips
    hs_block('wt_base', 0.62, 0.8, 0.2, 'dark', ch=0.035, top=(0.9, 0.92), panels=0.024, pdepth=0.008, parent=R, loc=(0, 0, 0.26))
    bolt_row('wt_bb', (-0.24, -0.38, 0.31), (0.24, -0.38, 0.31), 5, 0.009, R, axis='Y')
    cyl('wt_turn', 0.18, 0.06, 'metal', seg=10, bev=0.012, parent=R, loc=(0, 0, 0.39))
    bolts('wt_tb', [(math.cos(2 * math.pi * k / 10) * 0.15, math.sin(2 * math.pi * k / 10) * 0.15, 0.423) for k in range(10)], 0.008, R)
    hs_block('wt_hips', 0.44, 0.3, 0.14, 'trim', ch=0.03, top=(0.9, 0.9), panels=0.018, parent=R, loc=(0, 0, 0.5))
    for k in (-1, 1):
        _piston('wt_hp_%d' % k, (k * 0.2, 0.06, 0.36), (k * 0.16, 0.04, 0.62), 0.02, R)
        hs_block('wt_hipguard_%d' % k, 0.04, 0.24, 0.12, 'accent', ch=0.012, parent=R, loc=(k * 0.235, 0, 0.5))
    # the spine: stacked discs on a column, two cables beside it
    cyl('wt_col', 0.045, 0.32, 'metal', seg=16, parent=R, loc=(0, 0.02, 0.73))
    for i in range(5): cyl('wt_disc%d' % i, 0.09 - (i % 2) * 0.015, 0.035, 'dark', seg=10, bev=0.006, parent=R, loc=(0, 0.02, 0.6 + i * 0.06))
    for k in (-1, 1): sweep('wt_cab_%d' % k, [(k * 0.1, 0.08, 0.56), (k * 0.13, 0.1, 0.7), (k * 0.1, 0.08, 0.86)], 0.012, 'accent', ring=6, parent=R)
    # the chest: a frame, a front plate and a breast plate over it, side plates, vents, a back pack with ribs
    hs_block('wt_frame', 0.5, 0.32, 0.4, 'dark', ch=0.03, parent=R, loc=(0, 0, 1.05))
    hs_block('wt_chest', 0.54, 0.3, 0.36, 'body', ch=0.05, top=(1.06, 0.92), panels=0.03, pdepth=0.012, parent=R, loc=(0, -0.03, 1.07))
    armor('wt_breast', 0.34, 0.03, 0.18, 'trim', R, (0, -0.19, 1.13), axis='Y')
    for i in range(4): hs_block('wt_vent%d' % i, 0.22, 0.012, 0.012, 'metal', ch=0.003, parent=R, loc=(0, -0.19, 0.93 + i * 0.022))
    for k in (-1, 1):
        armor('wt_side_%d' % k, 0.025, 0.22, 0.24, 'accent', R, (k * 0.29, -0.01, 1.05))
    hs_block('wt_pack', 0.38, 0.14, 0.34, 'trim', ch=0.03, panels=0.02, parent=R, loc=(0, 0.21, 1.06))
    for i in range(4): hs_block('wt_rib%d' % i, 0.34, 0.012, 0.016, 'metal', ch=0.003, parent=R, loc=(0, 0.285, 0.94 + i * 0.075))
    for k in (-1, 1): sweep('wt_pcab_%d' % k, [(k * 0.15, 0.26, 1.2), (k * 0.24, 0.18, 1.3), (k * 0.32, 0.04, 1.27)], 0.011, 'dark', ring=6, parent=R)
    # shoulders: a joint, a chamfered pad, a mounting plate with four bolts
    for k, n in ((-1, 'l'), (1, 'r')):
        _joint_hs('wt_sh_%s' % n, (k * 0.33, 0, 1.2), 0.065, R)
        hs_block('wt_pad_%s' % n, 0.18, 0.24, 0.09, 'trim', ch=0.024, top=(0.8, 0.9), panels=0.012, parent=R, loc=(k * 0.35, 0, 1.29))
        hs_block('wt_mount_%s' % n, 0.11, 0.13, 0.012, 'metal', ch=0.004, parent=R, loc=(k * 0.35, 0, 1.34))
        bolts('wt_mb_%s' % n, [(k * 0.35 + a * 0.038, b * 0.048, 1.347) for a in (-1, 1) for b in (-1, 1)], 0.006, R)
    # the neck: a collar, a column and two small pistons that tilt the head
    cyl('wt_collar', 0.1, 0.05, 'dark', seg=10, bev=0.01, parent=R, loc=(0, 0, 1.275))
    cyl('wt_neck', 0.04, 0.12, 'metal', seg=16, parent=R, loc=(0, 0, 1.34))
    for k in (-1, 1): _piston('wt_np_%d' % k, (k * 0.07, 0.02, 1.29), (k * 0.05, 0.0, 1.4), 0.01, R)
    socket(R, 'tl', (-0.32, 0, 0)); socket(R, 'tr', (0.32, 0, 0))
    socket(R, 'shl', (-0.35, 0, 1.352)); socket(R, 'shr', (0.35, 0, 1.352))
    socket(R, 'arm_l', (-0.4, 0, 1.2)); socket(R, 'arm_r', (0.4, 0, 1.2))
    socket(R, 'head', (0, 0, 1.4)); socket(R, 'back', (0, 0.28, 1.06)); socket(R, 'chest', (0, -0.2, 0.98))
    return R

def _tall_arm(name, k):
    """an arm from the shoulder (k = -1 left, 1 right, outward): an upper arm of a frame and a cover plate, an elbow,
    a forearm with a piston and a cable, a wrist, a gripper. Built for its side (a mirror), so both reach forward"""
    P = group('part_' + name); x = k * 0.06
    hs_block(name + '_ubone', 0.05, 0.06, 0.4, 'dark', ch=0.012, parent=P, loc=(x, 0, -0.2))
    hs_block(name + '_ucover', 0.1, 0.11, 0.28, 'trim', ch=0.024, panels=0.014, parent=P, loc=(x + k * 0.01, 0, -0.17))
    bolt_row(name + '_ub', (x + k * 0.062, -0.03, -0.08), (x + k * 0.062, -0.03, -0.27), 3, 0.007, P, axis='X')
    _joint_hs(name + '_elbow', (x, 0, -0.41), 0.052, P)
    hs_block(name + '_fore', 0.09, 0.34, 0.09, 'trim', ch=0.02, panels=0.012, parent=P, loc=(x, -0.18, -0.43))
    _piston(name + '_pis', (x + k * 0.055, 0.02, -0.25), (x + k * 0.055, -0.19, -0.4), 0.013, P)
    sweep(name + '_cab', [(x - k * 0.05, 0.0, -0.1), (x - k * 0.06, -0.05, -0.38), (x - k * 0.05, -0.3, -0.45)], 0.008, 'accent', ring=6, parent=P)
    cyl(name + '_wrist', 0.04, 0.05, 'metal', seg=10, axis='Y', bev=0.006, parent=P, loc=(x, -0.37, -0.43))
    _gripper_hs(name + '_g', (x, -0.41, -0.43), P, s=1.15)
    return P

def part_tall_arm_l(): return _tall_arm('tall_arm_l', -1)
def part_tall_arm_r(): return _tall_arm('tall_arm_r', 1)

def _head_box(P, pre, w, d, h, z0, slot='body', ch=0.04, top=(0.92, 0.92)):
    return hs_block(pre + '_shell', w, d, h, slot, ch=ch, top=top, panels=0.024, pdepth=0.01, parent=P, loc=(0, 0, z0 + h / 2))

def part_head_a():
    """head A, 'the wide screen': a broad chamfered head, a visor brim, a wide screen for drawn eyes, side lamps"""
    P = group('part_head_a')
    _head_box(P, 'ha', 0.4, 0.3, 0.22, 0.0)
    hs_block('ha_brim', 0.42, 0.08, 0.025, 'trim', ch=0.008, parent=P, loc=(0, -0.17, 0.215), rot=(0.25, 0, 0))
    hs_block('ha_rim', 0.34, 0.02, 0.14, 'dark', ch=0.01, parent=P, loc=(0, -0.152, 0.105))
    hs_block('ha_screen', 0.31, 0.012, 0.115, 'glass', ch=0.006, parent=P, loc=(0, -0.162, 0.105))
    for k in (-1, 1):   # two soft oval eyes on the screen and a smile line (the game can draw them live later)
        o = sphere('ha_eye_%d' % k, 0.03, 'glow', seg=16, ring=8, parent=P, loc=(k * 0.07, -0.17, 0.115)); o.scale = (1, 0.3, 1.35)
        lamp_housing('ha_side_%d' % k, P, (k * 0.215, -0.04, 0.12), w=0.04, h=0.06)
    sweep('ha_smile', [(math.cos(a) * 0.05, -0.17, 0.085 + math.sin(a) * 0.022) for a in [math.pi + 0.6 + t * (math.pi - 1.2) / 6 for t in range(7)]], 0.006, 'glow', ring=6, parent=P)
    capsule('ha_ant', (0.12, 0.08, 0.22), (0.15, 0.1, 0.34), 0.008, 'metal', seg=8, parent=P)
    sphere('ha_ant_tip', 0.018, 'accent', parent=P, loc=(0.15, 0.1, 0.35))
    return P

def part_head_b():
    """head B, 'the dome': a glass dome on a chamfered collar, a curved light bar inside that shows the mood, fins"""
    P = group('part_head_b')
    cyl('hb_collar', 0.16, 0.06, 'dark', seg=12, bev=0.012, parent=P, loc=(0, 0, 0.03))
    hs_block('hb_band', 0.34, 0.3, 0.06, 'body', ch=0.02, top=(0.95, 0.95), panels=0.014, parent=P, loc=(0, 0, 0.09))
    sphere('hb_dome', 0.15, 'glass', cut=0.0, seg=32, ring=12, parent=P, loc=(0, 0, 0.12))
    sweep('hb_bar', [(math.cos(a) * 0.09, -0.06 - math.sin(a) * 0.02, 0.2) for a in [0.3 + t * (math.pi - 0.6) / 10 for t in range(11)]], 0.014, 'glow', ring=8, parent=P)
    for k in (-1, 1):
        hs_block('hb_fin_%d' % k, 0.025, 0.14, 0.12, 'trim', ch=0.008, top=(1, 0.5), nose=0.04, parent=P, loc=(k * 0.18, 0.02, 0.17))
        lamp_housing('hb_lamp_%d' % k, P, (k * 0.1, -0.16, 0.09), w=0.05, h=0.035)
    return P

def part_head_c():
    """head C, 'the lantern': a six-sided chamfered head with one big round lens in a ring, a speaker grille, ears"""
    P = group('part_head_c')
    cyl('hc_shell', 0.16, 0.26, 'body', seg=6, bev=0.02, parent=P, loc=(0, 0, 0.13))
    o = bpy.data.objects['hc_shell']; o.rotation_euler = (0, 0, math.pi / 6)
    cyl('hc_cap', 0.13, 0.03, 'trim', seg=6, bev=0.008, parent=P, loc=(0, 0, 0.275))
    cyl('hc_ring', 0.075, 0.03, 'dark', seg=28, axis='Y', bev=0.008, parent=P, loc=(0, -0.148, 0.16))
    lamp('hc_lens', 0.055, P, (0, -0.16, 0.16))
    for i in range(3): hs_block('hc_grille%d' % i, 0.09, 0.01, 0.008, 'metal', ch=0.002, parent=P, loc=(0, -0.152, 0.06 + i * 0.016))
    for k in (-1, 1):
        cyl('hc_ear_%d' % k, 0.05, 0.04, 'trim', seg=8, axis='X', bev=0.008, parent=P, loc=(k * 0.165, 0, 0.16))
        sphere('hc_earled_%d' % k, 0.015, 'glow', parent=P, loc=(k * 0.19, 0, 0.16))
    return P

def compound_eye(name, r, parent, loc, sub=4, front=0.12, depth=0.82):
    """3.11 (Avi: "like a dragonfly's eye, of very many polygons"): a dome covered all over with polygon facets (the
    dual of a geodesic sphere: hexagons and a few pentagons), each facet slightly shrunk so dark seams show between
    them and each tilted to its own place, so the light breaks on every one; in a steel housing"""
    x0, y0, z0 = loc
    cyl(name + '_house', r * 1.12, r * 0.7, 'metal', seg=12, axis='Y', bev=r * 0.12, parent=parent, loc=(x0, y0 + r * 0.3, z0))
    torus(name + '_bezel', r * 1.05, r * 0.09, 'dark', seg=24, rseg=6, axis='Y', parent=parent, loc=(x0, y0 - r * 0.05, z0))
    d = sphere(name + '_under', r * 0.96, 'dark', seg=24, ring=12, parent=parent, loc=(x0, y0, z0)); d.scale = (1, depth, 1)
    ico = bmesh.new(); bmesh.ops.create_icosphere(ico, subdivisions=sub, radius=1.0)
    ico.faces.ensure_lookup_table()
    cent = {f.index: f.calc_center_median().normalized() for f in ico.faces}
    out = bmesh.new()
    for v in ico.verts:
        n = v.co.normalized()
        if n.y > -front: continue   # only the front of the dome (the eye looks forward, -Y)
        fs = list(v.link_faces)
        # order the faces round the vertex
        a0 = (cent[fs[0].index] - n * cent[fs[0].index].dot(n)).normalized(); b0 = n.cross(a0)
        fs.sort(key=lambda f: math.atan2((cent[f.index] - n).dot(b0), (cent[f.index] - n).dot(a0)))
        ring = [n.lerp(cent[f.index], 0.86).normalized() for f in fs]   # shrunk toward its centre: a seam
        bulge = 1.0 + 0.035 * ((hash(v.index) % 7) / 6.0)   # a little unevenness, like real lenses
        vs = [out.verts.new(Vector((p.x * r * bulge, p.y * r * depth * bulge, p.z * r * bulge))) for p in ring]
        c = out.verts.new(Vector((n.x * r * 1.03, n.y * r * depth * 1.03, n.z * r * 1.03)))   # its middle stands out a little (a convex lens)
        for k in range(len(vs)):
            f = out.faces.new((vs[k], vs[(k + 1) % len(vs)], c)); f.normal_update()
            if f.normal.dot(Vector((n.x, n.y * depth, n.z))) < 0: f.normal_flip()   # every facet faces out
    ico.free()
    o = _mk(name + '_facets', out, 'glow', parent=parent, loc=loc, smooth=False)
    return o

def part_head_d():
    """head D (round 2, Avi: a metal head, big eyes, almost no mouth or nose): a chamfered steel head of plates over a
    frame, a wide visor screen with two big eyes in light (the game can draw them live), a forehead plate with bolts,
    sensor ears, cheek vents and an antenna"""
    P = group('part_head_d')
    hs_block('hd_frame', 0.34, 0.28, 0.28, 'dark', ch=0.03, parent=P, loc=(0, 0.01, 0.15))
    hs_block('hd_shell', 0.38, 0.26, 0.24, 'metal', ch=0.05, top=(0.88, 0.9), panels=0.022, pdepth=0.01, parent=P, loc=(0, 0.0, 0.17))
    hs_block('hd_brow', 0.36, 0.06, 0.06, 'trim', ch=0.016, top=(0.95, 0.7), parent=P, loc=(0, -0.13, 0.28))
    bolt_row('hd_bb', (-0.13, -0.165, 0.28), (0.13, -0.165, 0.28), 4, 0.008, P, axis='Y')
    hs_block('hd_face', 0.32, 0.03, 0.14, 'dark', ch=0.014, panels=0.01, parent=P, loc=(0, -0.135, 0.17))
    for k in (-1, 1):   # 3.11 (Avi): eyes as lamps of many small lights, faceted like a dragonfly's eye
        compound_eye('hd_eye_%d' % k, 0.054, P, (k * 0.078, -0.152, 0.172))
        cyl('hd_ear_%d' % k, 0.05, 0.05, 'trim', seg=10, axis='X', bev=0.01, parent=P, loc=(k * 0.205, 0.0, 0.17))
        lamp('hd_earlamp_%d' % k, 0.025, P, (k * 0.232, 0.0, 0.17), axis='X')
        for i in range(3): hs_block('hd_cheek_%d_%d' % (k, i), 0.05, 0.01, 0.008, 'dark', ch=0.002, parent=P, loc=(k * 0.12, -0.137, 0.075 + i * 0.016))
    hs_block('hd_chin', 0.2, 0.05, 0.03, 'trim', ch=0.01, parent=P, loc=(0, -0.11, 0.045))
    capsule('hd_ant', (0.13, 0.07, 0.29), (0.16, 0.09, 0.42), 0.008, 'metal', seg=8, parent=P)
    sphere('hd_ant_tip', 0.018, 'accent', parent=P, loc=(0.16, 0.09, 0.43))
    # 3.11 (Avi): the same width and depth, less tall: every block of the head is pressed down; the eyes stay round
    for o in P.children:
        if '_eye_' in o.name: o.location.z = 0.172 * 0.78 + 0.004; continue
        o.location.z *= 0.78; o.scale.z *= 0.78
    return P

BASES['wk_t'] = build_tall
PARTS.update({'tall_arm_l': part_tall_arm_l, 'tall_arm_r': part_tall_arm_r, 'head_d': part_head_d, 'head_a': part_head_a, 'head_b': part_head_b, 'head_c': part_head_c})

def rl_tall_review(outdir, samples=48):
    looks = {h: {'tl': 'tracks', 'tr': 'tracks_r', 'arm_l': 'tall_arm_l', 'arm_r': 'tall_arm_r', 'head': h, 'shl': 'light', 'shr': 'cammount', 'back': 'seedbox'} for h in ('head_d',)}
    paths = []
    for h, look in looks.items():
        p = outdir + '\\tall_' + h + '.png'
        rl_wk_one(0, p, pct=60, samples=samples, look=('wk_t', look))
        paths.append(p)
    return paths

# ───────────────────────────────────────── round 12 (1.4.3 set 4): the lessons' three tools in the workshop's look
# The robot, the drone and the diving robot of the lessons, rebuilt hard-surface like the workshop's chassis (Avi, 3.11:
# "the lessons' robots more beautiful too"): chamfered blocks with panel lines, armour plates with bolts, a frame and
# mechanics in view, lamps in housings, real tyres and rims. The sockets keep their names and places, so every part of
# the design garage (garage.js) still sits where it did; the drone keeps three ducted three-blade rotors (rotor0..2)
# and the sub its three-blade propeller (prop).
def _rover_wheel(R, name, x, y, r=0.2, w=0.16, right=False):
    g = group(name, parent=R, loc=(x, y, r)); g.rotation_euler = (0, 0, math.pi if right else 0)
    tyre(name + '_tyre', r, w, g, (0, 0, 0), blocks=16, deep=r * 0.1)   # six wheels: a lighter tread than the workshop's four
    rim(name + '_rim', r * 0.6, w, g, (0, 0, 0))
    cyl(name + '_hubmotor', 0.07, 0.06, 'dark', seg=8, bev=0.006, axis='X', parent=g, loc=(w * 0.5 + 0.03, 0, 0))
    for f in range(3): cyl(name + '_fin%d' % f, 0.078, 0.008, 'metal', seg=8, axis='X', parent=g, loc=(w * 0.5 + 0.012 + f * 0.018, 0, 0))
    return g

def build_robot_hs():
    R = group('base_robot')
    z0 = 0.36   # the hull's underside
    # the frame under the hull (two rails and the ends: an H seen from below, never a cross)
    for k in (-1, 1): hs_block('rb_rail_%d' % k, 0.05, 1.06, 0.06, 'dark', ch=0.01, parent=R, loc=(k * 0.27, 0, z0 - 0.02))
    for e in (-1, 1): hs_block('rb_xm_%d' % e, 0.6, 0.05, 0.05, 'dark', ch=0.01, parent=R, loc=(0, e * 0.48, z0 - 0.02))
    hs_block('rb_gearbox', 0.26, 0.24, 0.08, 'dark', ch=0.014, panels=0.012, parent=R, loc=(0, 0.02, z0 - 0.05))
    # the hull: a wedge nose, a faceted top with panel lines, the cream deck on it
    hs_block('rb_hull', 0.84, 1.1, 0.3, 'body', ch=0.05, top=(0.86, 0.9), nose=0.08, panels=0.03, pdepth=0.012, parent=R, loc=(0, 0, z0 + 0.15))
    hs_block('rb_deck', 0.64, 0.78, 0.09, 'cream', ch=0.03, top=(0.92, 0.94), panels=0.022, pdepth=0.008, parent=R, loc=(0, 0.04, z0 + 0.345))
    hs_block('rb_hatch', 0.3, 0.24, 0.012, 'trim', ch=0.004, parent=R, loc=(0, 0.28, z0 + 0.396))
    for k in (-1, 1):
        armor('rb_side_%d' % k, 0.025, 0.62, 0.15, 'trim', R, (k * 0.425, -0.02, z0 + 0.15))
        hs_block('rb_stripe_%d' % k, 0.012, 0.36, 0.035, 'accent', ch=0.004, parent=R, loc=(k * 0.44, -0.08, z0 + 0.2))
        bolt_row('rb_tb_%d' % k, (k * 0.34, -0.36, z0 + 0.305), (k * 0.34, 0.42, z0 + 0.305), 6, 0.009, R)
        # the rocker bogie: a beam from front to back wheel, a pivot to the hull, a shock to the middle wheel
        hs_block('rb_rocker_%d' % k, 0.05, 0.94, 0.07, 'metal', ch=0.014, panels=0.01, parent=R, loc=(k * 0.52, 0, 0.3))
        cyl('rb_pivot_%d' % k, 0.05, 0.1, 'dark', seg=12, axis='X', bev=0.006, parent=R, loc=(k * 0.47, 0.06, 0.34))
        _piston('rb_shock_%d' % k, (k * 0.5, -0.1, 0.27), (k * 0.47, -0.05, z0 + 0.06), 0.016, R)
        for wy in (-0.42, 0, 0.42): _rover_wheel(R, 'rb_wheel_%d_%d' % (k, int(wy * 100)), k * 0.62, wy, right=k > 0)
        for wy in (-0.42, 0.42):   # mudguards over the front and back wheels, with a steel edge
            curved_plate('rb_guard_%d_%d' % (k, int(wy * 100)), 0.2, 0.25, math.radians(30), math.radians(150), 0.016, 'trim', parent=R, loc=(k * 0.62, wy, 0.2))
        # intake vents with slats on the hull's sides
        hs_block('rb_vent_%d' % k, 0.02, 0.16, 0.08, 'dark', ch=0.006, parent=R, loc=(k * 0.415, 0.36, z0 + 0.15))
        for i in range(3): hs_block('rb_slat_%d_%d' % (k, i), 0.012, 0.15, 0.012, 'metal', ch=0.003, parent=R, loc=(k * 0.427, 0.36, z0 + 0.12 + i * 0.03))
        # metal guards on the front corners, bolted
        hs_block('rb_cg_%d' % k, 0.05, 0.05, 0.2, 'metal', ch=0.012, parent=R, loc=(k * 0.4, -0.52, z0 + 0.14), rot=(0, 0, math.pi / 4))
    # the front: a bumper with tow hooks, a grille, two lamps in housings
    hs_block('rb_bumper', 0.78, 0.08, 0.09, 'dark', ch=0.02, top=(0.94, 0.8), parent=R, loc=(0, -0.6, z0 + 0.03))
    for k in (-1, 1): torus('rb_tow_%d' % k, 0.024, 0.009, 'metal', seg=16, rseg=6, axis='X', parent=R, loc=(k * 0.28, -0.645, z0 + 0.02))
    hs_block('rb_grille', 0.3, 0.03, 0.1, 'dark', ch=0.008, parent=R, loc=(0, -0.545, z0 + 0.14))
    for i in range(3): hs_block('rb_gslot%d' % i, 0.25, 0.01, 0.012, 'metal', ch=0.003, parent=R, loc=(0, -0.562, z0 + 0.11 + i * 0.03))
    for lx in (-0.26, 0.26): lamp_housing('rb_lamp_%d' % int(lx * 100), R, (lx, -0.53, z0 + 0.2), w=0.1, h=0.065)
    # the back: a battery pack with ribs, hinges of the hatch
    hs_block('rb_batt', 0.44, 0.08, 0.16, 'dark', ch=0.012, parent=R, loc=(0, 0.56, z0 + 0.14))
    for i in range(3): hs_block('rb_rib%d' % i, 0.4, 0.012, 0.016, 'metal', ch=0.003, parent=R, loc=(0, 0.605, z0 + 0.09 + i * 0.05))
    for k in (-1, 1): cyl('rb_hinge_%d' % k, 0.012, 0.08, 'metal', seg=12, axis='X', parent=R, loc=(k * 0.1, 0.405, z0 + 0.396))
    socket(R, 'head', (0, -0.22, 0.79))
    socket(R, 'back', (0, 0.26, 0.79))
    socket(R, 'arm', (0.36, -0.5, 0.62))
    socket(R, 'top', (-0.28, 0.42, 0.79))
    socket(R, 'side_l', (-0.48, 0.2, 0.62), (0, 0, math.pi / 2))
    socket(R, 'side_r', (0.48, 0.2, 0.62), (0, 0, -math.pi / 2))
    return R

def build_drone_hs():
    D = group('base_drone')
    # the core: a chamfered pod with panel lines, a cream canopy, an equipment bay under it
    hs_block('dr_core', 0.5, 0.58, 0.16, 'body', ch=0.05, top=(0.8, 0.78), nose=0.04, panels=0.028, pdepth=0.01, parent=D, loc=(0, 0, 0))
    hs_block('dr_canopy', 0.3, 0.34, 0.06, 'cream', ch=0.025, top=(0.8, 0.8), panels=0.018, pdepth=0.006, parent=D, loc=(0, -0.02, 0.1))
    hs_block('dr_bay', 0.3, 0.36, 0.05, 'dark', ch=0.012, panels=0.012, parent=D, loc=(0, 0, -0.1))
    bolt_row('dr_tb', (-0.18, -0.2, 0.082), (0.18, -0.2, 0.082), 4, 0.008, D)
    bolt_row('dr_bb', (-0.18, 0.2, 0.082), (0.18, 0.2, 0.082), 4, 0.008, D)
    lamp_housing('dr_lamp', D, (0, -0.3, 0.0), w=0.12, h=0.05)
    for i in range(3):
        a = i * 2 * math.pi / 3 + math.pi   # one arm forward (-Y), two behind: a triangle from above
        x, y = math.sin(a) * 0.8, math.cos(a) * 0.8
        ax, ay = math.sin(a) * 0.48, math.cos(a) * 0.48
        hs_block('dr_arm%d' % i, 0.09, 0.5, 0.06, 'trim', ch=0.016, panels=0.012, pdepth=0.003, parent=D, loc=(ax, ay, 0.02), rot=(0, 0, -a))
        bolts('dr_ab%d' % i, [(math.sin(a) * r_, math.cos(a) * r_, 0.052) for r_ in (0.3, 0.42, 0.56)], 0.008, D)
        # the motor pod with cooling fins, the duct round the rotor (a band and a lip, three struts to the pod)
        cyl('dr_motor%d' % i, 0.07, 0.1, 'dark', seg=8, bev=0.008, parent=D, loc=(x, y, 0.05))
        for f in range(3): cyl('dr_mfin%d_%d' % (i, f), 0.082, 0.008, 'metal', seg=8, parent=D, loc=(x, y, 0.015 + f * 0.022))
        o = torus('dr_duct%d' % i, 0.34, 0.035, 'cream', seg=48, rseg=10, parent=D, loc=(x, y, 0.06)); o.scale = (1, 1, 1.7)
        torus('dr_lip%d' % i, 0.355, 0.018, 'accent', seg=48, rseg=8, parent=D, loc=(x, y, 0.115))
        for s_ in range(3):
            b_ = a + s_ * 2 * math.pi / 3 + math.pi / 3
            hs_block('dr_strut%d_%d' % (i, s_), 0.016, 0.27, 0.02, 'dark', ch=0.004, parent=D, loc=(x + math.sin(b_) * 0.2, y + math.cos(b_) * 0.2, 0.04), rot=(0, 0, -b_))
        blade3('rotor%d' % i, 0.3, 'metal', parent=D, loc=(x, y, 0.12))
    # landing skids: two bent tubes under the pod
    for k in (-1, 1):
        sweep('dr_skid_%d' % k, [(k * 0.16, -0.24, -0.08), (k * 0.2, -0.22, -0.2), (k * 0.2, 0.22, -0.2), (k * 0.16, 0.24, -0.08)], 0.014, 'dark', ring=8, parent=D)
    socket(D, 'belly', (0, 0, -0.13))
    socket(D, 'top', (0, 0, 0.14))
    socket(D, 'front', (0, -0.32, 0.0))
    return D

def build_sub_hs():
    S = group('base_sub')
    # the pressure hull: a bullet turned round its long axis (built along X, turned so the nose looks -Y)
    prof = [(-0.86, 0.001), (-0.84, 0.12), (-0.79, 0.24), (-0.7, 0.33), (-0.56, 0.4), (-0.36, 0.43), (0.3, 0.43), (0.5, 0.39), (0.66, 0.31), (0.78, 0.2), (0.82, 0.12), (0.83, 0.001)]
    h = revolve('sb_hull', prof, 'body', seg=40, parent=S); h.rotation_euler = (0, 0, math.pi / 2)
    try: h.data.set_sharp_from_angle(angle=math.radians(30))
    except Exception: pass
    # armour bands round the hull, each bolted; a viewing window in the nose with its rim
    for i, by in enumerate((-0.42, 0.0, 0.36)):
        o = torus('sb_band%d' % i, 0.432, 0.022, 'trim', seg=48, rseg=6, axis='Y', parent=S, loc=(0, by, 0))
        bolts('sb_bb%d' % i, [(math.cos(t * 2 * math.pi / 10) * 0.45, by, math.sin(t * 2 * math.pi / 10) * 0.45) for t in range(10)], 0.008, S, axis='Y')
    w = sphere('sb_window', 0.27, 'glass', sy=0.5, parent=S, loc=(0, -0.74, 0.06))
    torus('sb_wrim', 0.27, 0.028, 'metal', seg=40, rseg=8, axis='Y', parent=S, loc=(0, -0.76, 0.06))
    bolts('sb_wb', [(math.cos(t * 2 * math.pi / 10) * 0.3, -0.75, 0.06 + math.sin(t * 2 * math.pi / 10) * 0.3) for t in range(10)], 0.008, S, axis='Y')
    # a small tower on top (chamfered, panels), a keel and two skids below, lamps in housings by the window
    hs_block('sb_tower', 0.2, 0.36, 0.14, 'trim', ch=0.03, top=(0.8, 0.82), nose=0.04, panels=0.018, pdepth=0.006, parent=S, loc=(0, 0.02, 0.47))
    hs_block('sb_keel', 0.08, 0.7, 0.1, 'dark', ch=0.02, panels=0.012, parent=S, loc=(0, 0.05, -0.45))
    for k in (-1, 1):
        hs_block('sb_skid_%d' % k, 0.05, 0.8, 0.04, 'metal', ch=0.012, parent=S, loc=(k * 0.26, 0.04, -0.4))
        lamp_housing('sb_lamp_%d' % k, S, (k * 0.2, -0.7, -0.2), w=0.08, h=0.06)
        armor('sb_side_%d' % k, 0.022, 0.4, 0.14, 'accent', S, (k * 0.43, -0.2, 0.0))
    # the tail: a duct with three struts round the three-blade propeller
    cyl('sb_tailcone', 0.16, 0.16, 'dark', seg=24, r2=0.08, axis='Y', parent=S, loc=(0, 0.86, 0))
    o = torus('sb_duct', 0.3, 0.045, 'accent', seg=48, rseg=10, axis='Y', parent=S, loc=(0, 0.95, 0)); o.scale = (1, 1.8, 1)
    for s_ in range(3):
        b_ = s_ * 2 * math.pi / 3 + math.pi / 2
        o = hs_block('sb_strut%d' % s_, 0.02, 0.03, 0.22, 'dark', ch=0.005, parent=S, loc=(math.cos(b_) * 0.19, 0.95, math.sin(b_) * 0.19)); o.rotation_euler = (0, -b_ + math.pi / 2, 0)
    blade3('prop', 0.26, 'metal', parent=S, loc=(0, 0.97, 0), rot=(math.pi / 2, 0, 0))
    socket(S, 'top', (0, 0.1, 0.42))
    socket(S, 'front', (0, -0.8, -0.2))
    socket(S, 'side_l', (-0.42, 0.15, 0), (0, 0, math.pi / 2))
    socket(S, 'side_r', (0.42, 0.15, 0), (0, 0, -math.pi / 2))
    return S

BASES.update({'robot': build_robot_hs, 'drone': build_drone_hs, 'sub': build_sub_hs})

# the lessons' tools' first parts in the same look (the parts every child sees on them: the design garage's defaults)
def part_head_screen_hs():
    P = group('part_head_screen')
    _piston('hs_neck', (0, 0, 0.0), (0, 0, 0.15), 0.035, P)
    cyl('hs_collar', 0.07, 0.03, 'dark', seg=8, bev=0.006, parent=P, loc=(0, 0, 0.015))
    hs_block('hs_head', 0.54, 0.38, 0.32, 'cream', ch=0.05, top=(0.92, 0.9), panels=0.026, pdepth=0.008, parent=P, loc=(0, 0, 0.32))
    hs_block('hs_bezel', 0.46, 0.04, 0.24, 'dark', ch=0.02, parent=P, loc=(0, -0.19, 0.33))
    hs_block('hs_screen', 0.4, 0.012, 0.19, 'glass', ch=0.012, parent=P, loc=(0, -0.212, 0.33))
    for ex in (-0.1, 0.1):
        o = sphere('hs_eye_%d' % int(ex * 100), 0.045, 'glow', parent=P, loc=(ex, -0.222, 0.35)); o.scale = (1, 0.35, 1)
    for sx in (-1, 1):   # ears: a chamfered pod with a ring of five bolts (never a cross)
        cyl('hs_ear_%d' % sx, 0.075, 0.05, 'trim', seg=8, axis='X', bev=0.01, parent=P, loc=(sx * 0.29, 0, 0.33))
        bolts('hs_eb_%d' % sx, [(sx * 0.318, math.cos(t * 2 * math.pi / 5) * 0.045, 0.33 + math.sin(t * 2 * math.pi / 5) * 0.045) for t in range(5)], 0.007, P, axis='X')
    bolt_row('hs_tb', (-0.2, 0.12, 0.482), (0.2, 0.12, 0.482), 4, 0.008, P)
    return P

def part_grabber_hs(): return _segarm('grabber', [(0.24, 0.25), (0.18, -0.55)], s=0.95)

def part_bin_hs():
    P = group('part_bin')
    hs_block('bin_box', 0.56, 0.4, 0.2, 'cream', ch=0.025, top=(1.04, 1.04), panels=0.02, pdepth=0.006, parent=P, loc=(0, 0, 0.1))
    hs_block('bin_rim', 0.6, 0.44, 0.03, 'trim', ch=0.01, parent=P, loc=(0, 0, 0.215))
    bolts('bin_b', [(a_ * 0.27, b_ * 0.19, 0.232) for a_ in (-1, 1) for b_ in (-1, 1)], 0.008, P)
    for i in range(3): sphere('bin_fruit%d' % i, 0.06, 'accent', parent=P, loc=(-0.12 + i * 0.12, 0.02 * i, 0.2))
    return P

def part_antenna_hs():
    P = group('part_antenna')
    hs_block('an_base', 0.08, 0.08, 0.04, 'dark', ch=0.01, parent=P, loc=(0, 0, 0.02))
    capsule('an_rod', (0, 0, 0.04), (0, 0, 0.42), 0.012, 'metal', seg=10, parent=P)
    coil('an_coil', (0, 0, 0.06), 0.022, 0.08, 3, 0.005, 'accent', P)
    sphere('an_tip', 0.035, 'glow', parent=P, loc=(0, 0, 0.44))
    return P

def part_cam_hs():
    P = group('part_cam')
    hs_block('cam_mount', 0.1, 0.1, 0.05, 'dark', ch=0.012, parent=P, loc=(0, 0, -0.025))
    for k in (-1, 1): hs_block('cam_yoke_%d' % k, 0.02, 0.06, 0.12, 'metal', ch=0.005, parent=P, loc=(k * 0.1, 0, -0.1))
    hs_block('cam_body', 0.16, 0.18, 0.12, 'dark', ch=0.025, panels=0.012, parent=P, loc=(0, 0, -0.13))
    cyl('cam_lens', 0.055, 0.06, 'metal', seg=16, axis='Y', bev=0.006, parent=P, loc=(0, -0.11, -0.13))
    cyl('cam_glass', 0.042, 0.012, 'glass', seg=24, axis='Y', parent=P, loc=(0, -0.145, -0.13))
    sphere('cam_glint', 0.012, 'glow', parent=P, loc=(0.02, -0.15, -0.115))
    return P

PARTS.update({'head_screen': part_head_screen_hs, 'grabber': part_grabber_hs, 'bin': part_bin_hs, 'antenna': part_antenna_hs, 'cam': part_cam_hs})
