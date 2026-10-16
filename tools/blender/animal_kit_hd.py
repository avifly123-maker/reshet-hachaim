
# animal_kit_hd.py – v2 ("museum diorama") pipeline on top of animal_kit.py. Exec it into the kit's namespace.
# 1. the body is built twice from the same blobs: a DENSE sculpt (fine voxels, ~140k triangles) and a GAME mesh
#    (the dense one decimated with left/right symmetry, ~1.8x the old budget).
# 2. the dense body gets skin relief (fur streaks and clumps / overlapping feathers / scales) along the hair flow
#    (from the bones), and is painted vertex by vertex with the species' paint() – far finer than the game mesh.
# 3. Cycles bakes dense → game: colour (with soft ambient occlusion multiplied in) and a tangent-space normal map,
#    both 512 px, onto a UV layout of the game mesh.
# 4. a far-distance LOD = the game mesh decimated again (keeps UVs and skin weights), same textures.
# 5. export v2: positions, UVs, normals, skin, two LODs, two WebP textures, the same bones and clips as v1.
import bpy, bmesh, math, os, base64, struct, json, time, tempfile
from mathutils import Vector, kdtree, noise
import numpy as np

HD = dict(k=0.5, hi_tris=140000, game_mult=1.8, game_min=1600, game_max=6500, tex=512, ao=16, lod1=0.34, lod1_min=500,
          q_col=82, q_nrm=80, ao_mix=0.5)
BIRDS = {'owl', 'jay', 'blackbird', 'hoopoe', 'chukar', 'toucan', 'macaw', 'harpy', 'hummingbird'}
SCALY = {'agama', 'chameleon', 'tortoise'}
SMOOTHSKIN = {'dartfrog', 'butterfly', 'morpho'}
_HD = globals().get('_HD', {})   # survives a re-exec of this module

def skin_of(spec):
    if spec.get('skin'): return spec['skin']
    sid = spec['id']
    if sid in BIRDS: return 'feather'
    if sid in SCALY: return 'scale'
    if sid in SMOOTHSKIN: return 'smooth'
    return 'fur'

def _blob_mesh(blobs, fine):
    V = []; F = []
    for bl in blobs:
        if bl.get('noBody') or bl.get('neg'): continue
        if bl['t'] == 'ell':
            vv, ff = ellipsoid(bl['c'], bl['r'], 40 if fine else 24, 24 if fine else 14, bl.get('rot'))
        else:
            r = bl['r']; r0, r1 = (r, r) if not isinstance(r, (list, tuple)) else r
            vv, ff = capsule_mesh(bl['a'], bl['b2'], r0, r1, seg=24 if fine else 14, ring=8 if fine else 5, mid=12 if fine else 6)
        o = len(V); V += vv; F += [tuple(i + o for i in f) for f in ff]
    return V, F

def _apply(o):
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    old = o.data; o.modifiers.clear(); o.data = me
    if old.users == 0: bpy.data.meshes.remove(old)
    return o

def _polys(o):
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    return len(o.evaluated_get(dg).data.polygons)


# ───────────────────────────────────────── organic union: SDF with fillets in the hollows (Blender 5 grid nodes)
def _gn_tree(voxel, fillet):
    """a node tree per (voxel, fillet): mesh → SDF grid → fillet the hollows → mesh (values set on the nodes)"""
    name = 'HD_sdf_%.5f_%d' % (voxel, fillet)
    ng = bpy.data.node_groups.get(name)
    if ng: return ng
    ng = bpy.data.node_groups.new(name, 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; L = ng.links
    gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
    m2s = N.new('GeometryNodeMeshToSDFGrid'); m2s.inputs['Band Width'].default_value = 4; m2s.inputs['Voxel Size'].default_value = voxel
    fil = N.new('GeometryNodeSDFGridFillet'); fil.inputs['Iterations'].default_value = int(fillet)
    g2m = N.new('GeometryNodeGridToMesh'); g2m.inputs['Threshold'].default_value = 0.0; g2m.inputs['Adaptivity'].default_value = 0.0
    L.new(gi.outputs[0], m2s.inputs['Mesh']); L.new(m2s.outputs[0], fil.inputs['Grid'])
    L.new(fil.outputs[0], g2m.inputs['Grid']); L.new(g2m.outputs[0], go.inputs[0])
    return ng

def _sdf_union(o, voxel, fillet):
    m = o.modifiers.new('sdf', 'NODES'); m.node_group = _gn_tree(voxel, fillet)
    return m

def metabody(sc, coll, sid, blobs, res, tris, smooth_it=6):
    """v2: dense sculpt (kept for the bake) + game body (decimated from it with X symmetry)"""
    hc = collection(sc, 'HD_' + sid); hc.hide_render = True
    for lc in bpy.context.view_layer.layer_collection.children:
        pass
    k = HD['k']
    V, F = _blob_mesh(blobs, True)
    raw = bpy.data.meshes.new('hdraw_' + sid); raw.from_pydata([B(v) for v in V], [], F)
    o = bpy.data.objects.new('hd_' + sid, raw); hc.objects.link(o)
    if HD.get('sdf', True):
        _sdf_union(o, res * k, HD.get('fillet', 10) + smooth_it)
        sm = o.modifiers.new('sm', 'SMOOTH'); sm.factor = 0.5; sm.iterations = int(round(smooth_it * 0.6 / (k * k)))
    else:
        rm = o.modifiers.new('rm', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = res * k; rm.adaptivity = 0.0
        sm = o.modifiers.new('sm', 'SMOOTH'); sm.factor = 0.5; sm.iterations = int(round(smooth_it / (k * k)))
    o.modifiers.new('tr', 'TRIANGULATE')
    n0 = _polys(o)
    if n0 > HD['hi_tris']:
        dc = o.modifiers.new('dc', 'DECIMATE'); dc.ratio = HD['hi_tris'] / n0; dc.use_collapse_triangulate = True
        dc.use_symmetry = True; dc.symmetry_axis = 'X'
    _apply(o)
    # game body
    gt = int(max(HD['game_min'], min(HD['game_max'], tris * HD['game_mult'])))
    g = o.copy(); g.data = o.data.copy(); g.name = 'hdgame_' + sid; hc.objects.link(g)
    dc = g.modifiers.new('dc', 'DECIMATE'); dc.ratio = min(1.0, gt / max(1, len(g.data.polygons)))
    dc.use_collapse_triangulate = True; dc.use_symmetry = True; dc.symmetry_axis = 'X'
    _apply(g)
    verts = [T(v.co) for v in g.data.vertices]; faces = [tuple(p.vertices) for p in g.data.polygons]
    gm = g.data; bpy.data.objects.remove(g); bpy.data.meshes.remove(gm)
    _HD[sid] = dict(dense=o, coll=hc)
    return verts, faces

# ───────────────────────────────────────── skin relief
def _detail(P, N, f, skin, s):
    """displacement (metres) and groove 0..1 (darkening in the bake) at authoring point P"""
    if skin == 'fur':
        Q = P - f * (P.dot(f)) * 0.85
        st = noise.noise(Q * (1 / (0.007 * s)))
        cl = noise.noise(P * (1 / (0.035 * s)) + Vector((3.1, 7.7, 1.3)))
        return s * (0.0012 * st + 0.0022 * cl), max(0.0, min(1.0, 0.5 - 0.5 * st))
    if skin == 'feather':
        return _feather(P, N, f, s, 0.024, 0.62, 0.0012)
    if skin == 'scale':
        d, _ = worley(P, 1 / (0.014 * s), 9)
        e = min(1.0, d / 0.7)
        return s * 0.0028 * (1 - e * e), max(0.0, min(1.0, e ** 4))
    n = noise.noise(P * (1 / (0.03 * s)))
    return s * 0.0006 * n, 0.0


def _feather(P, N, f, s, L, w, amp):
    """overlapping feathers (shingles): rows along the flow f, scalloped edges; L = feather length / body length,
    w = feather width / length. Returns displacement and groove (dark line at each feather's edge)."""
    t = N.cross(f)
    if t.length < 1e-6: t = Vector((1, 0, 0))
    t.normalize(); fa = t.cross(N)
    a = P.dot(fa) / (L * s); b = P.dot(t) / (L * s * w)
    a += 0.35 * noise.noise(Vector((b * 0.45, a * 0.25, 1.7)))
    row = math.floor(a)
    u = b + 0.5 * (row % 2)
    du = abs((u % 1.0) - 0.5) * 2                     # 0 in the middle of a feather, 1 between two
    e = (a - row) + 0.3 * (1 - du * du)               # the edge bulges at each feather's middle: scallops
    h = e % 1.0
    barb = noise.noise(Vector((b * 9.0, a * 1.2, 0.5)))
    d = amp * s * (h - 0.5 + 0.12 * barb)
    g = max(0.0, min(1.0, smooth(0.78, 1.0, h) * 0.85 + 0.12 * (0.5 - 0.5 * barb)))
    return d, g

def _part_ranges(spec, nb):
    out = []; o = nb
    for part in spec.get('parts', []):
        out.append((part.tag, o, o + len(part.v), part)); o += len(part.v)
    return out

def _flow_of(name, h, t):
    d = Vector(t) - Vector(h)
    if d.length < 1e-9: return Vector((0, 0, -1))
    d.normalize()
    if name.startswith('tail') or d.y < -0.5: return d
    return -d

# ───────────────────────────────────────── natural colour: the layer on top of every species' own paint
TONE = dict(dorsal=0.14, ventral=0.08, feet=0.11, broad=0.09, patch=0.07, grain=0.07, warm=0.03)
def _tone(c, P, N, f, skin, s, ylo, yhi):
    """a real coat is never one flat colour: darker along the back and lighter underneath (countershading), a little
    darker toward the feet, broad soft cloudiness, smaller patches, a fine grain that follows the hair, and a slight
    warm / cool drift. Multiplies the species' colour, so its own pattern (spots, bands, masks) stays as it is."""
    T = TONE; k = {'fur': 1.0, 'feather': 0.75, 'scale': 1.1, 'smooth': 0.55}.get(skin, 1.0)
    h = max(1e-6, yhi - ylo); yr = (P.y - ylo) / h
    v = 1.0
    v *= 1.0 - T['dorsal'] * k * smooth(0.15, 0.85, N.y) * smooth(0.35, 0.75, yr)
    v *= 1.0 + T['ventral'] * k * smooth(-0.15, -0.75, N.y)
    v *= 1.0 - T['feet'] * k * smooth(0.3, 0.04, yr)
    n1 = noise.noise(P * (1 / (0.32 * s)) + Vector((11.3, 2.1, 5.7)))
    n2 = noise.noise(P * (1 / (0.09 * s)) + Vector((1.7, 9.2, 3.3)))
    Q = P - f * (P.dot(f)) * 0.9                          # stretched along the hair / feathers
    n3 = noise.noise(Q * (1 / (0.012 * s)) + Vector((4.4, 0.6, 8.8)))
    v *= 1.0 + k * (T['broad'] * n1 + T['patch'] * n2 + T['grain'] * n3)
    w = T['warm'] * k * noise.noise(P * (1 / (0.5 * s)) + Vector((7.0, 3.0, 1.0)))
    r, g, b = c[0] * v, c[1] * v, c[2] * v
    r += w; b -= w * 0.8
    return (max(0.0, min(1.0, r)), max(0.0, min(1.0, g)), max(0.0, min(1.0, b)))

def hd_paint(sid, nb):
    R = REG[sid]; spec = R['spec']; dense = _HD[sid]['dense']; me = dense.data
    meta = spec.get('meta', {}); s = max(0.05, meta.get('length', 1.0))
    skin = skin_of(spec)
    bones = {b[0]: _flow_of(b[0], b[2], b[3]) for b in spec['bones']}
    gflow = []
    for i in range(nb):
        f = Vector()
        for n, w in R['W'][i]: f += bones[n] * w
        gflow.append(f.normalized() if f.length > 1e-6 else Vector((0, 0, -1)))
    kd = kdtree.KDTree(nb)
    for i in range(nb): kd.insert(Vector(R['verts'][i]), i)
    kd.balance()
    paint = spec.get('paint')
    folds = [bl for bl in spec['blobs'] if bl.get('fold')]
    wcol = spec.get('wcol')
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nr = np.empty(n * 3, dtype=np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    cols = np.ones((n, 4), dtype=np.float32); disp = np.zeros(n, dtype=np.float32)
    gk = 0.22 if skin != 'smooth' else 0.0
    ys = co[:, 2]; ylo, yhi = float(ys.min()), float(ys.max())   # Blender z = authoring y
    for i in range(n):
        P = Vector((co[i, 0], co[i, 2], -co[i, 1])); N = Vector((nr[i, 0], nr[i, 2], -nr[i, 1]))
        _, gi, _ = kd.find(P)
        d, g = _detail(P, N, gflow[gi], skin, s)
        c = None
        for bl in folds:
            if P.x * bl['fold'] <= 0: continue
            q = blob_q(bl, P)
            if q < 1.12 and abs(P.x) > abs(bl['a'][0]) * 0.75:
                A = Vector(bl['a']); Bv = Vector(bl['b2']); ab = Bv - A
                t = max(0.0, min(1.0, (P - A).dot(ab) / ab.length_squared))
                d2, g2 = _feather(P, N, -ab.normalized(), s, 0.07, 0.3, 0.0013)
                m = smooth(1.12, 0.95, q)
                d = d * (1 - m) + d2 * m; g = g * (1 - m) + g2 * m
                if wcol:
                    cv = max(0.0, min(1.0, 0.5 - (P.y - (A.y + ab.y * t)) / (bl['r'][0] * 2.2)))
                    wc = wcol(0.25 + 0.75 * t, cv, True)
                    base = paint(P, N, 'body') if paint else wc
                    c = mix(base, wc, m)
                break
        disp[i] = d
        if c is None: c = paint(P, N, 'body') if paint else (0.6, 0.5, 0.4)
        if not spec.get('noTone'): c = _tone(c, P, N, gflow[gi], skin, s, ylo, yhi)
        k = 1.0 - gk * g
        cols[i, 0] = c[0] * k; cols[i, 1] = c[1] * k; cols[i, 2] = c[2] * k
    co = co + nr * disp[:, None]
    me.vertices.foreach_set('co', co.reshape(-1)); me.update()
    ca = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    # colour attributes store linear values; paint() returns display (sRGB) colours
    lin = np.where(cols[:, :3] <= 0.04045, cols[:, :3] / 12.92, ((cols[:, :3] + 0.055) / 1.055) ** 2.4)
    cols[:, :3] = lin
    ca.data.foreach_set('color', cols.reshape(-1))
    return dict(dense_verts=n, skin=skin)

# ───────────────────────────────────────── high mesh = dense body + the game mesh's parts

def _feather_parts(spec, me, nb, dn):
    """wings and tail fans: subdivide their faces and give them long flight feathers (flow toward the trailing edge)"""
    meta = spec.get('meta', {}); S = max(0.05, meta.get('length', 1.0))
    sel = set()
    for tag, a, b, part in _part_ranges(spec, nb):
        if tag in ('wing', 'tail'): sel.update(range(dn + (a - nb), dn + (b - nb)))
    if not sel: return
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    faces = [f for f in bm.faces if all(v.index in sel for v in f.verts)]
    edges = list({e for f in faces for e in f.edges})
    bmesh.ops.subdivide_edges(bm, edges=edges, cuts=3, use_grid_fill=True)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    bm.normal_update()
    newsel = {v for f in bm.faces if all((v.index in sel or v.index >= len(me.vertices)) for v in f.verts) for v in f.verts}
    col = bm.verts.layers.color.get('Col') if hasattr(bm.verts.layers, 'color') else None
    if col is None:
        try: col = bm.verts.layers.float_color.get('Col')
        except Exception: col = None
    for v in newsel:
        P = Vector(T(v.co)); N = Vector(T(v.normal))
        f = Vector((0, 0, -1))                       # toward the trailing edge / the tail's tip
        d, g = _feather(P, N, f, S, 0.08, 0.32, 0.0011)
        v.co = v.co + v.normal * d
        if col is not None:
            c = v[col]; k = 1.0 - 0.3 * g; v[col] = (c[0] * k, c[1] * k, c[2] * k, 1.0)
    bm.to_mesh(me); bm.free()


EYE = {   # species → (iris colour, pupil shape 'round' | 'slit' | 'bar', iris size, pupil size) – a real eye instead of a black button
    'gazelle': ('#4a2c14', 'bar', 0.86, 0.5), 'fox': ('#c88a1e', 'slit', 0.8, 0.4), 'jaguar': ('#c9a227', 'round', 0.8, 0.42),
    'owl': ('#140c08', 'round', 0.9, 0.7), 'harpy': ('#2a1a0a', 'round', 0.82, 0.5), 'tapir': ('#3a2414', 'round', 0.84, 0.55),
    'capybara': ('#2e1c10', 'round', 0.86, 0.6), 'agouti': ('#2e1c10', 'round', 0.86, 0.6), 'hyrax': ('#2a1a10', 'round', 0.86, 0.6),
    'coati': ('#3a2412', 'round', 0.84, 0.55), 'kinkajou': ('#4a2a10', 'round', 0.86, 0.6), 'howler': ('#5a3214', 'round', 0.8, 0.45),
    'sloth': ('#2a1a10', 'round', 0.86, 0.6), 'anteater': ('#2a1a10', 'round', 0.86, 0.6), 'spinymouse': ('#120c08', 'round', 0.9, 0.7),
    'porcupine': ('#160e08', 'round', 0.9, 0.7), 'hedgehog': ('#120c08', 'round', 0.9, 0.7), 'jay': ('#cfe6f2', 'round', 0.8, 0.45),
    'blackbird': ('#3a2410', 'round', 0.86, 0.62), 'hoopoe': ('#3a2410', 'round', 0.86, 0.6), 'chukar': ('#5a3a1a', 'round', 0.84, 0.55),
    'toucan': ('#c9d24a', 'round', 0.8, 0.45), 'macaw': ('#e8dc9a', 'round', 0.78, 0.4), 'hummingbird': ('#140c08', 'round', 0.9, 0.7),
    'agama': ('#8a5a1a', 'round', 0.8, 0.45), 'chameleon': ('#c8b030', 'round', 0.6, 0.3), 'tortoise': ('#3a2a14', 'round', 0.84, 0.5),
    'dartfrog': ('#0c0c10', 'round', 0.92, 0.75), 'fruitbat': ('#2a1a0e', 'round', 0.88, 0.65),
}
def _eye_parts(spec, me, nb, dn):
    """subdivide each eyeball and paint pupil, iris (with fine radial streaks and a dark ring) and the dark rim"""
    E = EYE.get(spec['id'])
    if not E: return
    iris, kind, isz, psz = srgb(E[0]), E[1], E[2], E[3]
    rng = _part_ranges(spec, nb); eyes = []; hls = []
    for i, (tag, a, b, part) in enumerate(rng):
        if tag == 'eye': eyes.append((a, b, part))
        if tag == 'hl': hls.append((a, b, part))
    if not eyes: return
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    col = bm.verts.layers.color.get('Col') if hasattr(bm.verts.layers, 'color') else None
    if col is None:
        try: col = bm.verts.layers.float_color.get('Col')
        except Exception: col = None
    def lin(c): return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
    info = []; eyeidx = set(); hlz = []
    for k, (a, b, part) in enumerate(eyes):
        idx = [dn + (i - nb) for i in range(a, b)]; eyeidx.update(idx)
        C = sum((bm.verts[i].co for i in idx), Vector()) / len(idx); r = max((bm.verts[i].co - C).length for i in idx)
        g = None
        if k < len(hls):
            ha, hb, _ = hls[k]; hv = [bm.verts[dn + (i - nb)].co for i in range(ha, hb)]
            H = sum(hv, Vector()) / len(hv); hlz.append((H.copy(), max((x - H).length for x in hv)))
            g = (H - C) - B((0, 0.45, 0.25)) * r * 0.5
        if g is None or g.length < 1e-6: g = Vector((1 if C.x >= 0 else -1, 0, 0))
        g.normalize()
        up = Vector((0, 0, 1)); side = g.cross(up).normalized() if abs(g.dot(up)) < 0.95 else Vector((1, 0, 0)); upv = side.cross(g).normalized()
        info.append((C.copy(), r, g, side, upv))
    faces = list({f for i in eyeidx for f in bm.verts[i].link_faces})
    bmesh.ops.subdivide_edges(bm, edges=list({e for f in faces for e in f.edges}), cuts=3, use_grid_fill=True)
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        for (C, r, g, side, upv) in info:
            d = v.co - C; L = d.length
            if not (0.6 * r < L < 1.08 * r): continue
            if any((v.co - H).length < hr * 1.15 for H, hr in hlz): break
            v.co = C + d / L * r
            if col is None: break
            u = d / L; ca = u.dot(g); x = u.dot(side); y = u.dot(upv)
            rad = math.sqrt(max(0.0, 1 - ca * ca)); xy = math.sqrt(x * x + y * y) + 1e-9
            if kind == 'slit': pr = rad * math.sqrt((x / xy / 0.35) ** 2 + (y / xy) ** 2)
            elif kind == 'bar': pr = rad * math.sqrt((x / xy) ** 2 + (y / xy / 0.38) ** 2)
            else: pr = rad
            irisR = isz * 0.75; pupR = irisR * psz
            ang = math.atan2(y, x); streak = 0.5 + 0.5 * math.sin(ang * 23 + 3 * math.sin(ang * 5))
            if ca < 0: c = srgb('#140e0a')
            elif pr < pupR: c = (0.015, 0.012, 0.01)
            elif rad < irisR:
                t = (rad - pupR) / max(1e-6, irisR - pupR)
                c = mix(mix(iris, tuple(min(1, x2 * 1.35) for x2 in iris), 0.5 * streak), mix(iris, (0.03, 0.02, 0.02), 0.7), smooth(0.7, 1.0, t))
            else: c = srgb('#1a120c') if rad < irisR * 1.12 else srgb('#2a1c12')
            v[col] = lin(c) + (1.0,)
            break
    bm.to_mesh(me); bm.free()

def hd_high(sid, nb):
    R = REG[sid]; dense = _HD[sid]['dense']; hc = _HD[sid]['coll']
    bm = bmesh.new(); bm.from_mesh(dense.data)
    col = bm.verts.layers.color.get('Col') if hasattr(bm.verts.layers, 'color') else None
    pv = R['verts'][nb:]; base = len(bm.verts); vs = []
    for v in pv: vs.append(bm.verts.new(B(v)))
    bm.verts.ensure_lookup_table()
    for f in R['faces']:
        if min(f) >= nb:
            try: bm.faces.new([vs[i - nb] for i in f])
            except ValueError: pass
    me = bpy.data.meshes.new('hdhigh_' + sid); bm.to_mesh(me); bm.free()
    ca = me.color_attributes.get('Col')
    # part colours
    dn = len(dense.data.vertices)
    for j, c in enumerate(R['cols'][nb:]):
        cc = [((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
        ca.data[dn + j].color = (cc[0], cc[1], cc[2], 1.0)
    for p in me.polygons: p.use_smooth = True
    if skin_of(R['spec']) == 'feather':
        _feather_parts(R['spec'], me, nb, dn)
    try: _eye_parts(R['spec'], me, nb, dn)
    except Exception as e: print('eyes', sid, e)
    o = bpy.data.objects.new('hdhigh_' + sid, me); hc.objects.link(o)
    _HD[sid]['high'] = o
    return o


def _grow_small_islands(me, spec, k):
    """eyes get k× the UV size (k² the texels) so an iris and a pupil fit in the texture"""
    nb = len(me.vertices) - sum(len(p.v) for p in spec.get('parts', []))
    eyev = set()
    for tag, a, b, part in _part_ranges(spec, nb):
        if tag in ('eye', 'hl'): eyev.update(range(a, b))
    if not eyev: return
    uv = me.uv_layers.active.data
    groups = {}
    for poly in me.polygons:
        if poly.vertices[0] not in eyev: continue
        key = min(poly.vertices)            # one key per part is enough: parts are closed shells
        for tag, a, b, part in _part_ranges(spec, nb):
            if a <= poly.vertices[0] < b: key = a; break
        groups.setdefault(key, []).extend(poly.loop_indices)
    for key, loops in groups.items():
        cx = sum(uv[l].uv.x for l in loops) / len(loops); cy = sum(uv[l].uv.y for l in loops) / len(loops)
        for l in set(loops):
            u = uv[l].uv; uv[l].uv = (cx + (u.x - cx) * k, cy + (u.y - cy) * k)

def _mat_src():
    m = bpy.data.materials.get('HD_src')
    if m: return m
    m = bpy.data.materials.new('HD_src'); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
    ca = m.node_tree.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
    m.node_tree.links.new(ca.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 1.0
    return m

def _img(name, size, noncolor):
    im = bpy.data.images.get(name)
    if im: bpy.data.images.remove(im)
    im = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color' if noncolor else 'sRGB'
    return im

def _bake_scene():
    sb = bpy.data.scenes.get('hdbake') or bpy.data.scenes.new('hdbake')
    sb.render.engine = 'CYCLES'; sb.cycles.device = 'CPU'
    # leave two cores to Windows and the Blender window, so the computer stays responsive during long bakes
    sb.render.threads_mode = 'FIXED'; sb.render.threads = max(2, (os.cpu_count() or 4) - 2)
    try: sb.view_settings.view_transform = 'Standard'
    except Exception: pass
    return sb

def hd_bake(sid):
    R = REG[sid]; game = R['mesh']; arm_o = R['arm']; high = _HD[sid]['high']
    size = HD['tex'] if R['spec'].get('meta', {}).get('length', 1) > 0.15 else 256
    sb = _bake_scene(); bc = bpy.data.collections.get('HDB') or bpy.data.collections.new('HDB')
    if bc.name not in sb.collection.children: sb.collection.children.link(bc)
    for o in list(bc.objects): bc.objects.unlink(o)
    bc.objects.link(high); bc.objects.link(game)
    am = game.modifiers.get('arm'); am_v = am.show_viewport; am.show_viewport = False; am.show_render = False
    # UVs on the game mesh
    me = game.data
    if not me.uv_layers: me.uv_layers.new(name='UV')
    vl = sb.view_layers[0]; prev = bpy.context.window.scene; bpy.context.window.scene = sb
    for o in sb.objects: o.select_set(False)
    game.select_set(True); vl.objects.active = game
    with bpy.context.temp_override(window=bpy.context.window, scene=sb, view_layer=vl, active_object=game, object=game, selected_objects=[game], selected_editable_objects=[game]):
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.012, area_weight=0.6, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        _grow_small_islands(me, R['spec'], 3.0)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        try: bpy.ops.uv.pack_islands(margin=0.006, rotate=True, scale=True)
        except Exception:
            try: bpy.ops.uv.pack_islands(margin=0.006, rotate=True)
            except Exception: pass
        bpy.ops.object.mode_set(mode='OBJECT')
    # materials for the bake
    high.data.materials.clear(); high.data.materials.append(_mat_src())
    keep = [m for m in me.materials]
    bm_ = bpy.data.materials.get('HD_dst') or bpy.data.materials.new('HD_dst'); bm_.use_nodes = True
    nt = bm_.node_tree; tn = nt.nodes.get('T') or nt.nodes.new('ShaderNodeTexImage'); tn.name = 'T'; nt.nodes.active = tn
    for i in range(len(me.materials)): me.materials[i] = bm_
    imgs = {'col': _img('hdcol_' + sid, size, False), 'nrm': _img('hdnrm_' + sid, size, True), 'ao': _img('hdao_' + sid, size, True)}
    meta = R['spec'].get('meta', {}); L = max(0.05, meta.get('length', 1.0))
    bk = sb.render.bake; bk.use_selected_to_active = True; bk.cage_extrusion = 0.015 * L; bk.max_ray_distance = 0.06 * L
    bk.margin = 6; bk.use_clear = True
    try: bk.margin_type = 'EXTEND'
    except Exception: pass
    high.select_set(True); game.select_set(True); vl.objects.active = game
    t0 = time.time(); times = {}
    with bpy.context.temp_override(window=bpy.context.window, scene=sb, view_layer=vl, active_object=game, object=game, selected_objects=[high, game], selected_editable_objects=[high, game]):
        for kind, typ, spp in (('col', 'DIFFUSE', 1), ('nrm', 'NORMAL', 1), ('ao', 'AO', HD['ao'])):
            tn.image = imgs[kind]; sb.cycles.samples = spp
            if typ == 'DIFFUSE': bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
            elif typ == 'NORMAL': bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
            else: bpy.ops.object.bake(type='AO')
            times[kind] = round(time.time() - t0, 1)
    bpy.context.window.scene = prev
    for i, m in enumerate(keep): me.materials[i] = m
    am.show_viewport = am_v; am.show_render = True
    bc.objects.unlink(high); bc.objects.unlink(game)
    # colour × soft occlusion
    c = np.empty(size * size * 4, dtype=np.float32); imgs['col'].pixels.foreach_get(c)
    a = np.empty(size * size * 4, dtype=np.float32); imgs['ao'].pixels.foreach_get(a)
    c = c.reshape(-1, 4); a = a.reshape(-1, 4)
    k = (1 - HD['ao_mix']) + HD['ao_mix'] * a[:, 0]
    c[:, 0] *= k; c[:, 1] *= k; c[:, 2] *= k
    imgs['col'].pixels.foreach_set(c.reshape(-1)); imgs['col'].update()
    _HD[sid]['imgs'] = imgs; _HD[sid]['size'] = size
    return times

# ───────────────────────────────────────── preview material (what the game will show)
def hd_preview_mats(sid):
    R = REG[sid]; me = R['mesh'].data; imgs = _HD[sid]['imgs']
    out = []
    for gloss in (False, True):
        name = 'HDprev_%s_%d' % (sid, gloss)
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        for n in list(nt.nodes):
            if n.bl_idname not in ('ShaderNodeBsdfPrincipled', 'ShaderNodeOutputMaterial'): nt.nodes.remove(n)
        bs = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = imgs['col']
        tnn = nt.nodes.new('ShaderNodeTexImage'); tnn.image = imgs['nrm']
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0
        nt.links.new(tc.outputs['Color'], bs.inputs['Base Color']); nt.links.new(tnn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bs.inputs['Normal'])
        bs.inputs['Roughness'].default_value = 0.15 if gloss else 0.8
        out.append(m)
    for i in range(len(me.materials)): me.materials[i] = out[min(i, 1)]

# ───────────────────────────────────────── LOD1
def hd_lod1(sid):
    R = REG[sid]; game = R['mesh']; hc = _HD[sid]['coll']
    prev = bpy.context.window.scene; bpy.context.window.scene = scene()
    o = game.copy(); o.data = game.data.copy(); o.name = 'hdlod1_' + sid; hc.objects.link(o)
    for m in list(o.modifiers): o.modifiers.remove(m)
    tri = sum(len(p.vertices) - 2 for p in o.data.polygons)
    dc = o.modifiers.new('dc', 'DECIMATE'); dc.ratio = max(HD['lod1_min'] / max(1, tri), HD['lod1'])
    dc.use_collapse_triangulate = True; dc.use_symmetry = True; dc.symmetry_axis = 'X'
    _apply(o); o.parent = None
    bpy.context.window.scene = prev
    _HD[sid]['lod1'] = o
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

# ───────────────────────────────────────── export v2
def _geom(o, names):
    """split vertices at UV seams; quantised positions (box), uv, normals, skin, indices grouped by material"""
    me = o.data; uvl = me.uv_layers.active.data
    me.calc_loop_triangles() if hasattr(me, 'calc_loop_triangles') else None
    gi = {g.index: g.name for g in o.vertex_groups}; idx = {n: i for i, n in enumerate(names)}
    key = {}; vpos = []; vuv = []; vn = []; vsk = []; tri_by = {0: [], 1: []}
    def vid(li):
        l = me.loops[li]; v = l.vertex_index; u = uvl[li].uv
        k = (v, round(u.x, 5), round(u.y, 5))
        if k in key: return key[k]
        key[k] = len(vpos); vv = me.vertices[v]
        vpos.append(T(vv.co)); vuv.append((u.x, u.y)); vn.append(T(vv.normal))
        ws = sorted([(gi[g.group], g.weight) for g in vv.groups if g.group in gi and g.weight > 0.003], key=lambda x: -x[1])[:4]
        if not ws: ws = [(names[0], 1.0)]
        s = sum(w for _, w in ws); vsk.append([(n, w / s) for n, w in ws])
        return key[k]
    for t in me.loop_triangles:
        m = 1 if me.polygons[t.polygon_index].material_index == 1 else 0
        tri_by[m] += [vid(li) for li in t.loops]
    mn = [min(v[i] for v in vpos) for i in range(3)]; mx = [max(v[i] for v in vpos) for i in range(3)]
    qp = []
    for v in vpos:
        for i in range(3): qp.append(int(round((v[i] - mn[i]) / max(1e-6, mx[i] - mn[i]) * 65535)) - 32768)
    uv = []
    for u in vuv: uv += [int(round(max(0, min(1, u[0])) * 65535)), int(round(max(0, min(1, u[1])) * 65535))]   # Blender's v (three: flipY)
    nn = []
    for n in vn:
        L = math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2) or 1
        nn += [int(round(n[i] / L * 127)) for i in range(3)]
    J = []; Wt = []
    for ws in vsk:
        ws = (ws + [(names[0], 0.0)] * 4)[:4]
        q = [int(round(w * 255)) for _, w in ws]; q[0] += 255 - sum(q)
        J += [idx[n] for n, _ in ws]; Wt += q
    I = []; groups = []
    for m in (0, 1):
        if tri_by[m]: groups.append([len(I), len(tri_by[m]), m]); I += tri_by[m]
    return {'box': [round(x, 5) for x in mn + mx], 'pos': _b64('h', qp), 'uv': _b64('H', uv), 'n': _b64('b', nn),
            'sk': _b64('B', J), 'sw': _b64('B', Wt), 'idx': _b64('H' if len(vpos) < 65536 else 'I', I), 'groups': groups,
            'nv': len(vpos), 'ntri': len(I) // 3}

def _webp(img, q):
    p = os.path.join(tempfile.gettempdir(), img.name + '.webp')
    img.file_format = 'WEBP'
    try: img.save(filepath=p, quality=q)
    except TypeError:
        img.filepath_raw = p; img.save()
    return base64.b64encode(open(p, 'rb').read()).decode()

def export_hd(sid):
    R = REG[sid]; spec = R['spec']; names = [b[0] for b in spec['bones']]
    out = json.loads(export(sid))
    for k in ('pos', 'col', 'sk', 'sw', 'idx', 'groups', 'box'): out.pop(k, None)
    out['v'] = 2
    out.update(_geom(R['mesh'], names))
    out['lod1'] = _geom(_HD[sid]['lod1'], names)
    imgs = _HD[sid]['imgs']
    out['tex'] = {'col': _webp(imgs['col'], HD['q_col']), 'nrm': _webp(imgs['nrm'], HD['q_nrm']), 'size': _HD[sid]['size']}
    out['skin'] = skin_of(spec)
    return json.dumps(out, separators=(',', ':'))


# ───────────────────────────────────────── anatomy: quadruped legs rebuilt from the leg bones (fl fl2 fr fr2 hl hl2 hr hr2)
# All radii are fractions of the leg height H (shoulder / hip joint above the ground). The bones are untouched, so every
# motion clip keeps working; only the flesh around them changes.
LEG_KINDS = {
    'ungulate': dict(arm=0.062, sh=(0.058, 0.5, 0.075), fa0=0.052, fa1=0.03, wrist_t=0.52, wr=0.036, can=0.019, fet_t=0.88, fet=0.027, paw=None,
                     th=(0.1, 0.72, 0.17), gas0=0.06, gas1=0.034, hock_t=0.46, hback=0.07, hock=0.036, mt=0.02),
    'cat':      dict(arm=0.13, sh=(0.12, 0.62, 0.17), fa0=0.105, fa1=0.08, wrist_t=0.84, wr=0.085, can=0.075, fet_t=None, fet=0, paw=(0.105, 0.06, 0.14),
                     th=(0.15, 0.78, 0.26), gas0=0.1, gas1=0.07, hock_t=0.7, hback=0.07, hock=0.068, mt=0.065),
    'canid':    dict(arm=0.09, sh=(0.08, 0.55, 0.11), fa0=0.075, fa1=0.05, wrist_t=0.8, wr=0.056, can=0.045, fet_t=None, fet=0, paw=(0.06, 0.04, 0.09),
                     th=(0.13, 0.75, 0.22), gas0=0.08, gas1=0.05, hock_t=0.62, hback=0.08, hock=0.05, mt=0.042),
    'rodent':   dict(arm=0.16, sh=(0.14, 0.55, 0.18), fa0=0.12, fa1=0.08, wrist_t=0.82, wr=0.085, can=0.07, fet_t=None, fet=0, paw=(0.09, 0.05, 0.13),
                     th=(0.2, 0.8, 0.3), gas0=0.13, gas1=0.08, hock_t=0.6, hback=0.05, hock=0.075, mt=0.07),
    'heavy':    dict(arm=0.13, sh=(0.12, 0.6, 0.16), fa0=0.1, fa1=0.075, wrist_t=0.72, wr=0.08, can=0.07, fet_t=None, fet=0, paw=(0.095, 0.05, 0.11),
                     th=(0.15, 0.78, 0.24), gas0=0.1, gas1=0.075, hock_t=0.6, hback=0.05, hock=0.075, mt=0.07),
}
LEGBONES = {'fl', 'fl2', 'fr', 'fr2', 'hl', 'hl2', 'hr', 'hr2'}
def _V(p): return Vector(p)
def anat_legs(spec, kind, scale=1.0, keep_feet=True, **over):
    """anatomical legs on the leg bones (fl fl2 fr fr2 hl hl2 hr hr2). v3: each lower leg is split at the wrist / hock
    into a third bone (fl3 …) that carries the cannon and the foot, so a step can bend three joints; the feet end in a
    real hoof (wider than the pastern, flat on the ground) or a rounded paw (wider and longer than the leg), never a point."""
    K = dict(LEG_KINDS[kind]); K.update(over)
    bb = {b[0]: (Vector(b[2]), Vector(b[3])) for b in spec['bones']}
    if not LEGBONES <= set(bb): return spec
    split = not spec.get('noLeg3')
    keep = []
    for bl in spec['blobs']:
        if bl.get('bone') in LEGBONES and not (keep_feet and bl.get('foot')): continue
        keep.append(bl)
    out = keep; f = scale; joints = {}
    def cap(a, b, r0, r1, bone): out.append(dict(t='cap', a=tuple(a), b2=tuple(b), r=(r0, r1), bone=bone))
    def ell(c, r, bone, rot=None):
        d = dict(t='ell', c=tuple(c), r=tuple(r), bone=bone)
        if rot: d['rot'] = rot
        out.append(d)
    def hoof(G, can, H, bone, back=0.0):
        hw, hh, hl = can * 1.2, max(can * 1.15, 0.012 * H), can * 1.45
        ell(G + Vector((0, hh * 0.95, hl * 0.25 - back)), (hw, hh, hl), bone)              # the hoof: wider than the pastern, flat on the ground
    def paw(G, can, H, pw, bone, fwd=0.35):
        w, h, l = max(pw[0] * H, can * 1.55), max(pw[1] * H, can * 0.85), max(pw[2] * H, can * 2.7)
        ell(G + Vector((0, h * 0.92, l * fwd)), (w, h, l), bone)                              # a rounded paw, toes forward
        ell(G + Vector((0, h * 1.6, -l * 0.25)), (w * 0.75, h * 1.2, l * 0.45), bone)        # heel / pastern pad behind
    for L in ('l', 'r'):
        # ── foreleg
        S, E = bb['f' + L]; _, G = bb['f' + L + '2']
        H = max(0.05, S.y - G.y) * f
        up = (S - E).length
        b2, b3 = 'f' + L + '2', ('f' + L + '3') if split else 'f' + L + '2'
        ell(S + (E - S) * 0.3 + Vector((0, 0.03 * H, -0.035 * H)), (K['sh'][0] * H, up * K['sh'][1], K['sh'][2] * H), 'f' + L)   # shoulder / triceps mass
        cap(S, E, K['arm'] * H, K['fa0'] * H * 1.05, 'f' + L)
        ell(E + Vector((0, 0.01 * H, -K['fa0'] * H * 0.55)), (K['fa0'] * H * 0.7,) * 3, b2)                      # point of the elbow
        W = E + (G - E) * K['wrist_t']
        cap(E, W, K['fa0'] * H, K['fa1'] * H, b2)
        ell(W, (K['wr'] * H, K['wr'] * H * 1.2, K['wr'] * H), b2)
        joints['f' + L] = (W, G)
        if K['fet_t']:
            F = E + (G - E) * K['fet_t']
            cap(W, F, K['can'] * H, K['can'] * H * 0.95, b3)
            ell(F, (K['fet'] * H, K['fet'] * H * 1.1, K['fet'] * H * 1.05), b3)
            cap(F, G + Vector((0, 0.05 * H, 0.03 * H)), K['can'] * H * 0.9, K['can'] * H * 0.85, b3)
            hoof(G, K['can'] * H, H, b3)
        else:
            cap(W, G + Vector((0, K['paw'][1] * H, 0)), K['can'] * H, K['can'] * H * 0.95, b3)
            paw(G, K['can'] * H, H, K['paw'], b3)
        # ── hind leg
        Hp, Kn = bb['h' + L]; _, G = bb['h' + L + '2']
        H = max(0.05, Hp.y - G.y) * f
        th = K['th']; tl = (Kn - Hp).length
        b2, b3 = 'h' + L + '2', ('h' + L + '3') if split else 'h' + L + '2'
        ell(Hp + (Kn - Hp) * 0.42 + Vector((0, 0.03 * H, -0.04 * H)), (th[0] * H, tl * th[1], th[2] * H), 'h' + L)        # haunch
        cap(Hp, Kn, th[0] * H * 0.75, K['gas0'] * H * 1.1, 'h' + L)
        ell(Kn + Vector((0, 0, 0.02 * H)), (K['gas0'] * H * 0.85,) * 3, b2)                                        # stifle
        Hk = Kn + (G - Kn) * K['hock_t'] + Vector((0, 0, -K['hback'] * H))
        cap(Kn, Hk, K['gas0'] * H, K['gas1'] * H, b2)
        ell(Hk + Vector((0, 0.01 * H, -K['hock'] * H * 0.45)), (K['hock'] * H * 0.75, K['hock'] * H * 1.1, K['hock'] * H), b2)   # point of the hock
        joints['h' + L] = (Hk, G)
        if K['fet_t']:
            F = G + Vector((0, 0.1 * H, -0.01 * H))
            cap(Hk, F, K['mt'] * H, K['mt'] * H * 0.95, b3)
            ell(F, (K['fet'] * H, K['fet'] * H * 1.1, K['fet'] * H * 1.05), b3)
            cap(F, G + Vector((0, 0.05 * H, 0.03 * H)), K['mt'] * H * 0.9, K['mt'] * H * 0.85, b3)
            hoof(G, K['mt'] * H, H, b3)
        else:
            pw = K['paw']
            cap(Hk, G + Vector((0, pw[1] * H, 0)), K['mt'] * H, K['mt'] * H * 0.95, b3)
            paw(G, K['mt'] * H, H, pw, b3, fwd=0.3)
    hb = next((b for b in out if b.get('bone') == 'hips' and b['t'] == 'ell'), None)
    cb = next((b for b in out if b.get('bone') == 'chest' and b['t'] == 'ell'), None)
    if hb and cb and not spec.get('noSpine'):
        r = 0.86 * min(hb['r'][1], cb['r'][1], hb['r'][0] * 1.2, cb['r'][0] * 1.2)
        cap(Vector(hb['c']) + Vector((0, 0.08 * r, 0)), Vector(cb['c']) + Vector((0, 0.08 * r, 0)), r, r, 'hips')
    spec['blobs'] = out
    if split: _split_legs(spec, joints)
    return spec

def _split_legs(spec, joints):
    """add the third leg bone (fl3 …: wrist / hock → ground) and give the walk a working foot"""
    bones = []
    for b in spec['bones']:
        n = b[0]
        if n[:2] in joints and n.endswith('2') and len(n) == 3:
            J, G = joints[n[:2]]
            bones.append((n, b[1], b[2], tuple(J)))
            bones.append((n[:2] + '3', n, tuple(J), b[3]))
        else: bones.append(b)
    spec['bones'] = bones
    for part in spec.get('parts', []):   # hooves / claws made as parts move to the foot bone
        if part.bone and len(part.bone) == 3 and part.bone[:2] in joints and part.bone.endswith('2'):
            J, _ = joints[part.bone[:2]]
            if sum(v[1] for v in part.v) / len(part.v) < J.y: part.bone = part.bone[:2] + '3'
    spec['actions'] = {k: (v[0], _foot_fn(k, v[1], spec.get('kneeMul', 1.25))) for k, v in spec['actions'].items()}

def _rx(v):
    if v is None: return 0.0
    if isinstance(v, (tuple, list)) and len(v) == 2 and isinstance(v[0], (tuple, list)): return v[0][0]
    return v[0]

def _foot_fn(name, fn, kmul):
    """the third leg bone in every clip: on the ground the foot stays flat (it undoes the leg's swing), in the air it
    folds back (the hoof / paw flicks up); the knees bend a little more than before in walk and run"""
    loco = name in ('walk', 'run', 'swim', 'trot')
    lying = name in ('sleep', 'sit', 'lie', 'rest')
    def f(ph):
        p = fn(ph)
        if p.get('_g'): return p      # the v4 gait already moves all three joints
        for leg in ('fl', 'fr', 'hl', 'hr'):
            if leg not in p and leg + '2' not in p and not loco:
                if not lying: p[leg + '3'] = (0, 0, 0)
                continue
            u = _rx(p.get(leg)); l = _rx(p.get(leg + '2'))
            if loco and leg + '2' in p:
                v = p[leg + '2']; l = l * kmul
                p[leg + '2'] = (l, v[1], v[2]) if not (isinstance(v[0], (tuple, list))) else ((l, v[0][1], v[0][2]), v[1])
            if lying: continue
            if loco:
                w = min(1.0, abs(l) / 30.0)
                p[leg + '3'] = (-(u + l) * (1 - w) + (42 if leg[0] == 'f' else 34) * w, 0, 0)
            else:
                p[leg + '3'] = (-(u + l), 0, 0)
        return p
    return f

# ───────────────────────────────────────── v4 gait: three joints, a real stance and swing
_quad0 = globals().get('_quad0') or quad_actions
def quad_actions(names, c=None):
    """the kit's clips, with walk and run legs replaced by a gait that has a stance (the foot on the ground, moving back
    at an even pace, a little give in the knee) and a swing (the knee folds, the foot curls up, then reaches forward and
    lands). Stance takes 62 % of a walk step and 40 % of a run step. The foot bone (fl3 …) keeps the paw flat on the
    ground, lifts the heel before the toes leave, folds in the air and opens just before landing."""
    acts = _quad0(names, c)
    C = dict(dict(amp=24, knee=34, run_amp=38, run_bound=False, gait=None), **(c or {}))
    has = set(names)
    if not {'fl', 'fr', 'hl', 'hr'} <= has: return acts
    two = 'fl2' in has
    def legs(ph, A, K, offs, duty):
        p = {}
        for leg, off in offs.items():
            u = (ph + off) % 1.0; front = leg[0] == 'f'
            if u < duty:
                st = u / duty; e = st * st * (3 - 2 * st) * 0.25 + st * 0.75
                ang = -A + 2 * A * e
                kn = K * 0.14 * math.sin(math.pi * st)
                curl = (0.45 if front else 0.4) * K * smooth(0.78, 1.0, st)
                flat = 1.0
            else:
                sw = (u - duty) / (1 - duty)
                ang = A - 2 * A * (0.5 - 0.5 * math.cos(math.pi * sw))
                kn = K * math.sin(math.pi * min(1.0, sw / 0.9)) ** 0.9
                curl = (1.3 if front else 1.1) * K * math.sin(math.pi * min(1.0, sw / 0.75)) - 10 * smooth(0.75, 1.0, sw)
                flat = 1.0 - math.sin(math.pi * sw)
            if not front: ang *= 0.9
            kk = kn if front else -kn * 0.85
            p[leg] = (ang, 0, 0)
            if two: p[leg + '2'] = (kk, 0, 0)
            p[leg + '3'] = (-(ang + kk) * flat + curl, 0, 0)
        p['_g'] = True
        return p
    if 'walk' in acts:
        fr, fn = acts['walk']
        offs = {'hl': 0, 'fl': 0.25, 'hr': 0.5, 'fr': 0.75} if C.get('gait') != 'trot' else {'hl': 0, 'fr': 0, 'hr': 0.5, 'fl': 0.5}
        def walk(ph, fn=fn, offs=offs):
            p = fn(ph); p.update(legs(ph, C['amp'], C['knee'] * 1.25, offs, 0.62))
            if 'neck' in has:   # the head nods with each front step and stays steady in between
                n0 = p.get('neck', (0, 0, 0)); n0 = n0[0] if isinstance(n0[0], (tuple, list)) else n0
                p['neck'] = (n0[0] + 3.5 * math.sin(TAU * (2 * ph + 0.1)), n0[1], n0[2])
                h0 = p.get('head', (0, 0, 0)); h0 = h0[0] if isinstance(h0[0], (tuple, list)) else h0
                p['head'] = (h0[0] - 2.5 * math.sin(TAU * (2 * ph + 0.1)), h0[1], h0[2])
            return p
        acts['walk'] = (fr, walk)
    if 'run' in acts:
        fr, fn = acts['run']
        offs = {'hl': 0, 'hr': 0.06, 'fl': 0.5, 'fr': 0.56} if C['run_bound'] else {'hl': 0, 'hr': 0.1, 'fl': 0.45, 'fr': 0.55}
        def run(ph, fn=fn, offs=offs):
            p = fn(ph); p.update(legs(ph, C['run_amp'], C['knee'] * 1.5, offs, 0.4)); return p
        acts['run'] = (fr, run)
    return acts

# ───────────────────────────────────────── v4 flight: a fast downstroke and a folding upstroke
_bird0 = globals().get('_bird0') or bird_actions
def bird_actions(names, c=None):
    """the kit's bird clips with a truer wing beat: the downstroke takes 40 % of the beat with the wing spread, the
    upstroke 60 % with the hand and the tip folded in; the tip trails the arm"""
    acts = _bird0(names, c)
    C = dict(dict(flap=55), **(c or {}))
    if 'fly' not in acts or 'wl1' not in set(names): return acts
    fr, fn0 = acts['fly']
    def fly(ph):
        p = fn0(ph); a = C['flap']
        if ph < 0.4: t = ph / 0.4; down = math.cos(math.pi * t); fold = 0.0
        else: t = (ph - 0.4) / 0.6; down = -math.cos(math.pi * t); fold = math.sin(math.pi * t)
        lag = math.cos(math.pi * min(1.0, (ph - 0.06) % 1.0 / 0.4)) if ph < 0.46 else down
        down = 0.8 * down + 0.2           # the beat goes from high above the back to a little below the body
        for L, s_ in (('l', 1), ('r', -1)):
            p['w%s1' % L] = (4 * down, s_ * 8 * fold, s_ * a * down)
            p['w%s2' % L] = (0, s_ * -32 * fold, s_ * a * 0.22 * lag)
            p['w%s3' % L] = (-8 * fold, s_ * 42 * fold, s_ * a * 0.3 * lag)
        return p
    acts['fly'] = (fr, fly)
    return acts

# species → leg type (+ tweaks); applied by build_hd
ANAT = {
    'gazelle': ('ungulate', {}), 'tapir': ('heavy', dict(wrist_t=0.7, hock_t=0.55)), 'jaguar': ('cat', dict(fa1=0.068, wr=0.074, can=0.06, mt=0.056, gas1=0.06)), 'fox': ('canid', {}),
    'coati': ('canid', dict(arm=0.13, fa0=0.1, fa1=0.07, paw=(0.07, 0.04, 0.11))), 'agouti': ('rodent', dict(fa0=0.08, fa1=0.05, can=0.04, wr=0.05, gas1=0.05, mt=0.04, paw=(0.06, 0.035, 0.09))),
    'capybara': ('heavy', {}), 'hyrax': ('rodent', {}), 'spinymouse': ('rodent', {}), 'porcupine': ('heavy', {}), 'anteater': ('heavy', dict(paw=(0.1, 0.06, 0.16))),
    'kinkajou': ('canid', dict(arm=0.13, fa0=0.1, fa1=0.07)),
}


def _bird_fold(spec):
    """folded wings as real volume along the body sides (shoulder → tail base); marked 'fold' for the painter"""
    bb = {b[0]: b for b in spec['bones']}
    if 'wl1' not in bb or 'tail' not in bb or spec.get('noFold'): return spec
    sh = Vector(bb['wl1'][2]); tl = Vector(bb['tail'][2])
    cb = next((b for b in spec['blobs'] if b.get('bone') == 'chest' and b['t'] == 'ell'), None)
    w = cb['r'][0] if cb else abs(sh.x)
    k = spec.get('foldK', 1.0)
    for sx in (1, -1):
        a = Vector((sx * w * 0.6, sh.y + 0.05 * w, sh.z - 0.05 * w)); b = Vector((sx * w * 0.42, tl.y + 0.2 * w, tl.z + 0.1 * w))
        spec['blobs'].append(dict(t='cap', a=tuple(a), b2=tuple(b), r=(w * 0.58 * k, w * 0.26 * k), bone='hips', fold=sx, w=0.6))
    return spec


def _lid(C, r, g, col, bone, wide=1.12, tall=0.82, tube=0.2, seg=18, ring=6):
    """an almond eyelid ring around the visible part of an eyeball (gaze g)"""
    up = Vector((0, 1, 0)); side = g.cross(up); side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0)); upv = side.cross(g).normalized()
    h = 0.42; R = r * math.sqrt(1 - h * h) * 1.02; c0 = C + g * r * h
    V = []; F = []
    for i in range(seg):
        a = TAU * i / seg; rad = side * math.cos(a) * R * wide + upv * math.sin(a) * R * tall; rn = rad.normalized()
        for j in range(ring):
            b = TAU * j / ring; V.append(tuple(c0 + rad + (rn * math.cos(b) + g * math.sin(b)) * r * tube))
    for i in range(seg):
        for j in range(ring):
            i2 = (i + 1) % seg; j2 = (j + 1) % ring; F.append((i * ring + j, i * ring + j2, i2 * ring + j2, i2 * ring + j))
    p = Part('lid', bone=bone, mat=0, color=col); p.add(V, F); return p

# ───────────────────────────────────────── body plans: the trunk's proportions by family
# Stations from the rump (t=0) to the brisket (t=1): (t, depth ×H, width ×W, centre shift ×H). H, W = the deepest / widest
# of the species' own hips and chest blobs, so each animal keeps its size and only the profile follows its family.
BODY = {
    # cats: rounded haunch, the waist tucked up high, deep chest with the shoulders standing out
    'felid':    [(.06, .92, .92, .04), (.2, 1.0, 1.0, .0), (.36, .86, .86, .08), (.5, .8, .82, .12), (.64, .95, .95, -.03), (.79, 1.04, 1.0, -.09), (.93, .95, .88, -.07)],
    # dogs and foxes: like the cats, a little longer and narrower, less extreme waist
    'canid':    [(.06, .92, .9, .04), (.2, .98, .96, .0), (.36, .86, .86, .06), (.5, .82, .84, .09), (.64, .95, .95, -.03), (.79, 1.02, .98, -.07), (.93, .94, .88, -.05)],
    # gazelles, goats, deer: a taut barrel (the belly full but held up), the rump high, a deep and narrow chest
    'ungulate': [(.06, .92, .88, .05), (.2, .98, .95, .02), (.36, .98, .96, .0), (.5, 1.0, 1.0, -.02), (.64, 1.02, .98, -.04), (.79, 1.02, .92, -.07), (.93, .92, .8, -.05)],
    # rodents and hyraxes: pear-shaped, the weight behind (big haunches), the chest small, sitting low
    'rodent':   [(.06, .94, .94, -.01), (.2, 1.0, 1.0, .0), (.36, 1.0, 1.0, .0), (.5, .97, .97, .0), (.64, .94, .94, .01), (.79, .92, .9, .02), (.93, .86, .84, .03)],
    # tapirs, anteaters: a long even barrel
    'heavy':    [(.06, .92, .92, .02), (.2, .98, .98, .0), (.36, 1.0, 1.0, .0), (.5, 1.0, 1.0, -.01), (.64, 1.0, .98, -.02), (.79, .98, .94, -.03), (.93, .9, .84, -.02)],
}
BODY_OF = {'fox': 'canid', 'coati': 'canid', 'kinkajou': 'canid', 'gazelle': 'ungulate', 'agouti': 'rodent', 'capybara': 'rodent',
           'hyrax': 'rodent', 'spinymouse': 'rodent', 'porcupine': 'rodent', 'tapir': 'heavy', 'anteater': 'heavy'}

def body_plan(spec, fam):
    """replace the trunk (the hips / chest ellipsoids) with a row of ellipsoids that follow the family's profile"""
    prof = BODY[fam]
    trunk = [b for b in spec['blobs'] if b.get('bone') in ('hips', 'chest') and b['t'] == 'ell' and not b.get('fold') and not b.get('keep')]
    if len(trunk) < 2: return spec
    z0 = min(b['c'][2] - b['r'][2] for b in trunk); z1 = max(b['c'][2] + b['r'][2] for b in trunk)
    rear = min(trunk, key=lambda b: b['c'][2]); front = max(trunk, key=lambda b: b['c'][2])
    span = z1 - z0
    spec['blobs'] = [b for b in spec['blobs'] if b not in trunk]
    def at(t):   # the profile between its stations (smooth step), so the row of ellipsoids makes one smooth trunk
        if t <= prof[0][0]: return prof[0][1:]
        for a, b in zip(prof, prof[1:]):
            if t <= b[0]:
                u = (t - a[0]) / (b[0] - a[0]); u = u * u * (3 - 2 * u)
                return tuple(a[j] + (b[j] - a[j]) * u for j in (1, 2, 3))
        return prof[-1][1:]
    n = 29; t0, t1 = prof[0][0], prof[-1][0]   # many, deeply overlapping: one smooth trunk, no rings
    for i in range(n):
        t = t0 + (t1 - t0) * i / (n - 1); ry, rx, dy = at(t)
        z = z0 + span * t
        k = (z - rear['c'][2]) / max(1e-6, front['c'][2] - rear['c'][2]); k = min(1.0, max(0.0, k))
        ks = k * k * (3 - 2 * k)   # the species' own sizes, rump → chest, shaped by the family profile
        H = rear['r'][1] + (front['r'][1] - rear['r'][1]) * ks; W = rear['r'][0] + (front['r'][0] - rear['r'][0]) * ks
        y = rear['c'][1] + (front['c'][1] - rear['c'][1]) * k + dy * H
        end = i in (0, n - 1)
        rz = span * (0.12 if end else 0.11)
        spec['blobs'].append(dict(t='ell', c=(0, y, z), r=(W * rx, H * ry, rz), bone='hips' if t < 0.5 else 'chest'))
    spec['noSpine'] = True
    return spec

# ───────────────────────────────────────── mouths
# species → (how far back the corner is ×head length, how far below the nose ×head length, line thickness ×head length,
# colour). The line follows the skin: each point is found by a ray against the blob union.
MOUTH = {
    'fox': (.42, .07, .009, '#3a2620'), 'jaguar': (.36, .1, .01, '#4a2e24'), 'gazelle': (.3, .06, .008, '#4a3428'),
    'tapir': (.2, .12, .009, '#2a201a'), 'capybara': (.24, .1, .009, '#3a2618'), 'agouti': (.28, .08, .009, '#3a2618'),
    'coati': (.32, .06, .009, '#33221a'), 'howler': (.28, .12, .011, '#1a1210'), 'kinkajou': (.3, .1, .01, '#3a2418'),
    'hyrax': (.26, .09, .01, '#2e1e14'), 'sloth': (.28, .12, .011, '#3a322c'), 'porcupine': (.24, .09, .009, '#1a120c'),
}
def _mouth(spec):
    m = MOUTH.get(spec['id'])
    if not m or spec.get('noMouth'): return spec
    from mathutils.bvhtree import BVHTree
    back, drop, thick, col = m
    hb = next((b for b in spec['bones'] if b[0] == 'head'), None)
    noses = [p for p in spec.get('parts', []) if p.tag == 'nose']
    if not hb or not noses: return spec
    Lh = (Vector(hb[3]) - Vector(hb[2])).length
    N = sum((sum((Vector(v) for v in p.v), Vector()) / len(p.v) for p in noses), Vector()) / len(noses)
    ny = min(min(v[1] for v in p.v) for p in noses)
    V, F = _blob_mesh(spec['blobs'], False); tree = BVHTree.FromPolygons([Vector(v) for v in V], F)
    r = Lh * thick; d = Lh * drop
    def front(y):   # the skin in front at height y, on the middle line
        h = tree.ray_cast(Vector((0, y, N.z + Lh)), Vector((0, 0, -1)), Lh * 3)
        return h[0]
    def side(sx, y, z):
        h = tree.ray_cast(Vector((sx * Lh, y, z)), Vector((-sx, 0, 0)), Lh * 2)
        return h[0]
    part = Part('mouth', bone='head', mat=0, color=srgb(col))
    lip = front(ny - d)
    if lip is None: return spec
    for sx in (1, -1):   # from the middle of the lip back to the corner: dips a little, then rises (a calm closed mouth)
        pts = []; rads = []
        for i in range(0, 11):
            s_ = i / 10; z = lip.z - r * 0.6 - Lh * back * s_
            y = lip.y - d * 0.55 * s_ + d * 0.5 * s_ * s_
            h = side(sx, y, z) if i else front(y)
            if h is None: break
            pts.append(h + (Vector((sx * r * 0.15, 0, 0)) if i else Vector((sx * r * 0.3, 0, r * 0.1))))
            rads.append(r * (0.5 + 0.5 * math.sin(math.pi * min(1.0, 0.15 + s_ * 0.85))))
        if len(pts) > 3:
            part.add(*tube(pts, rads, 5))
    if part.v: spec['parts'].append(part)
    return spec

def _set_eyes(spec, depth=0.38):
    """eyes sit IN the skull at a set depth: the gaze ray finds the skin over each eye (the blob union), the eyeball's
    centre goes eyeSink·r under it (so only a dome shows, never a buried eye or a bead on the skin); then an almond lid
    ring hides the seam, and the catch-light is put back onto the eyeball surface"""
    from mathutils.bvhtree import BVHTree
    parts = spec.get('parts', []); lids = []
    lidcol = srgb(spec.get('lidCol', '#24180f')); sink = spec.get('eyeSink', 0.3)
    V, F = _blob_mesh(spec['blobs'], False); tree = BVHTree.FromPolygons([Vector(v) for v in V], F)
    for i, part in enumerate(parts):
        if part.tag != 'eye' or getattr(part, '_set', False): continue
        C = sum((Vector(v) for v in part.v), Vector()) / len(part.v); r = max((Vector(v) - C).length for v in part.v)
        hl = parts[i + 1] if i + 1 < len(parts) and parts[i + 1].tag == 'hl' else None
        g = None
        if hl:
            H = sum((Vector(v) for v in hl.v), Vector()) / len(hl.v); g = (H - C) - Vector((0, 0.45, 0.25)) * r * 0.5
        if g is None or g.length < 1e-6: g = Vector((1 if C.x >= 0 else -1, 0, 0.6))
        g.normalize()
        hit = tree.ray_cast(C + g * r * 4, -g, r * 8)
        if hit[0] is not None and (hit[0] - C).length < r * 3.5:
            off = (hit[0] - g * r * sink) - C
        else:
            off = -g * r * depth * spec.get('eyeDepth', 1.0)
        part.v = [tuple(Vector(v) + off) for v in part.v]; part._set = True
        Cn = C + off
        if hl:
            d = (H - C).normalized(); Hn = Cn + d * r * 0.9
            hl.v = [tuple(Hn + (Vector(v) - H) * 0.7) for v in hl.v]; hl._set = True
        if skin_of(spec) in ('fur', 'scale') and not spec.get('noLids'):
            lids.append(_lid(Cn, r, g, lidcol, part.bone, **spec.get('lidShape', {})))
    parts += lids; spec['parts'] = parts
    # paired nostrils: flat dark openings, not beads
    for p in parts:
        if p.tag == 'nose' and getattr(p, '_set', False) is False:
            C = sum((Vector(v) for v in p.v), Vector()) / len(p.v)
            if abs(C.x) > 0.004: p.v = [tuple(C + Vector(((Vector(v) - C).x, (Vector(v) - C).y * 0.7, (Vector(v) - C).z * 0.45))) for v in p.v]
            p._set = True
    return spec

def _part(sp, tag, scale=None, move=None, color=None, bone=None):
    """scale (about its centre) / move / recolour the parts with this tag (or bone prefix)"""
    for p in sp.get('parts', []):
        if (tag and p.tag != tag) or (bone and not str(p.bone).startswith(bone)): continue
        C = sum((Vector(v) for v in p.v), Vector()) / len(p.v)
        if scale: p.v = [tuple(C + Vector([(Vector(v) - C)[k] * scale[k] for k in range(3)])) for v in p.v]
        if move: p.v = [tuple(Vector(v) + Vector(move)) for v in p.v]
        if color: p.color = srgb(color); p.c = [None] * len(p.v)
    return sp

def _smooth_tail(spec, radii, bone_prefix='tail'):
    """replace a tail made of separate blobs with one continuous tapered tube along the tail bones"""
    tb = sorted([b for b in spec['bones'] if b[0].startswith(bone_prefix) and b[0][len(bone_prefix):].isdigit()], key=lambda b: int(b[0][len(bone_prefix):]))
    spec['blobs'] = [bl for bl in spec['blobs'] if not str(bl.get('bone', '')).startswith(bone_prefix) or not str(bl.get('bone', ''))[len(bone_prefix):].isdigit()]
    pts = [Vector(tb[0][2])] + [Vector(b[3]) for b in tb]
    for i, b in enumerate(tb):
        spec['blobs'].append(dict(t='cap', a=tuple(pts[i]), b2=tuple(pts[i + 1]), r=(radii[i], radii[i + 1]), bone=b[0]))
    return spec

def _head_scale(spec, k, bone='head'):
    """enlarge the head blobs about the head bone's root (eyes and ears are parts: moved with it)"""
    hb = next(b for b in spec['bones'] if b[0] == bone); o = Vector(hb[2])
    for bl in spec['blobs']:
        if bl.get('bone') != bone: continue
        for key in ('c', 'a', 'b2'):
            if key in bl: bl[key] = tuple(o + (Vector(bl[key]) - o) * k)
        r = bl['r']; bl['r'] = tuple(x * k for x in r) if isinstance(r, (list, tuple)) else r * k
    for part in spec.get('parts', []):
        if part.bone == bone: part.v = [tuple(o + (Vector(v) - o) * k) for v in part.v]
    return spec


def _fox_head(sp):
    """a fox's head: flat sloping forehead, long narrow muzzle with a nose bridge, wide cheek ruffs"""
    sp['blobs'] = [b for b in sp['blobs'] if b.get('bone') != 'head']
    sp['blobs'] += [
        dict(t='ell', c=(0, 0.568, 0.345), r=(0.062, 0.052, 0.072), bone='head'),                 # cranium, lower and longer
        dict(t='ell', c=(0, 0.592, 0.37), r=(0.046, 0.026, 0.052), rot=(12, 0, 0), bone='head'),  # forehead sloping to the muzzle
        dict(t='cap', a=(0, 0.565, 0.375), b2=(0, 0.537, 0.478), r=(0.04, 0.016), bone='head'),  # muzzle and nose bridge
        dict(t='ell', c=(0, 0.546, 0.33), r=(0.084, 0.048, 0.052), bone='head'),                  # cheek ruffs
        dict(t='ell', c=(0, 0.527, 0.405), r=(0.028, 0.017, 0.055), bone='head'),                 # lower jaw
    ]
    return sp

def _add(sp, blobs):
    sp['blobs'] = sp['blobs'] + blobs; return sp

def _capy_head(sp):
    """a capybara's head: long, deep and flat-topped with a blunt square snout (not a ball)"""
    sp['blobs'] = [b for b in sp['blobs'] if b.get('bone') != 'head']
    sp['blobs'] += [
        dict(t='ell', c=(0, 0.6, 0.52), r=(0.11, 0.1, 0.14), bone='head'),                       # cranium
        dict(t='ell', c=(0, 0.555, 0.69), r=(0.098, 0.085, 0.125), bone='head'),                 # deep blunt snout
        dict(t='ell', c=(0, 0.6, 0.66), r=(0.07, 0.04, 0.13), bone='head'),                      # flat nose bridge
        dict(t='ell', c=(0, 0.52, 0.56), r=(0.122, 0.08, 0.09), bone='head'),                    # cheeks
        dict(t='ell', c=(0, 0.48, 0.63), r=(0.08, 0.055, 0.12), bone='head'),                    # lower jaw
    ]
    return _part(sp, None, move=(0, -0.01, 0), bone='ear')

def _jaguar_head(sp):
    """jaguar: bigger head with a nose bridge and a small nose; a cat's body line instead of a box: deep chest, high
    shoulder blades, the belly tucked up at the waist, a rounded rump; leaner lower legs (ANAT over below)"""
    _head_scale(sp, 1.14)
    sp['blobs'] = [b for b in sp['blobs'] if not (b.get('bone') == 'hips' and b['t'] == 'ell')]
    sp['noSpine'] = True
    sp = _add(sp, [
        dict(t='ell', c=(0, 0.62, -0.36), r=(0.155, 0.175, 0.19), bone='hips'),                # rounded rump
        dict(t='cap', a=(0, 0.63, -0.26), b2=(0, 0.62, 0.02), r=(0.14, 0.155), bone='hips'),   # waist, belly tucked up
        dict(t='ell', c=(0, 0.5, 0.12), r=(0.15, 0.17, 0.26), bone='chest'),                  # deep chest, belly line
        dict(t='ell', c=(0.075, 0.74, 0.24), r=(0.07, 0.05, 0.12), rot=(-15, 0, 0), bone='chest'),    # shoulder blades
        dict(t='ell', c=(-0.075, 0.74, 0.24), r=(0.07, 0.05, 0.12), rot=(-15, 0, 0), bone='chest'),
        dict(t='ell', c=(0, 0.64, 0.62), r=(0.11, 0.07, 0.08), bone='head'),                 # broad cheeks
        dict(t='cap', a=(0, 0.76, 0.64), b2=(0, 0.715, 0.765), r=(0.05, 0.03), bone='head'), # nose bridge
    ])
    return _part(sp, 'nose', scale=(0.72, 0.75, 0.7), move=(0, 0.004, -0.004), color='#6e4034')

def _seat_spines(sp, tag='spine', per=4, axis=(0.0, 0.062), embed=0.0015):
    """spines made of `per`-vertex items (base ring + tip) are moved onto the real skin: a ray from outside along each
    spine's radial direction finds the blob union, so none hide under the fur (they would bake as grey patches)"""
    from mathutils.bvhtree import BVHTree
    V, F = _blob_mesh(sp['blobs'], False); tree = BVHTree.FromPolygons([Vector(v) for v in V], F)
    for p in sp.get('parts', []):
        if p.tag != tag: continue
        vs = [Vector(v) for v in p.v]
        for i in range(0, len(vs) - per + 1, per):
            B = sum(vs[i:i + per - 1], Vector()) / (per - 1)
            n = Vector((B.x - axis[0], B.y - axis[1], 0))
            if n.length < 1e-6: continue
            n.normalize(); hit = tree.ray_cast(B + n * 0.1, -n, 0.2)
            if hit[0] is None: continue
            off = (hit[0] - n * embed) - B
            for k in range(i, i + per): vs[k] = vs[k] + off
        p.v = [tuple(v) for v in vs]
    return sp

TWEAK = {
    'fox': lambda sp: _part(_fox_head(_smooth_tail(sp, [0.035, 0.06, 0.082, 0.078, 0.06, 0.035])), 'nose', scale=(1.0, 1.0, 1.1), move=(0, 0.003, 0.01)),
    'jaguar': _jaguar_head,
    'capybara': _capy_head,
    'spinymouse': lambda sp: (sp.__setitem__('seatSpines', True) or sp),
}

# ───────────────────────────────────────── bees (one model: the honeybee and the orchid bee differ only in colour)
def bee_actions(sweep=68, flap=58):
    """fly: a fast beat; perch: the wings folded back over the abdomen, which pumps, antennae feeling around"""
    def wings(p, a, sw, a2=None):
        a2 = a if a2 is None else a2
        p['wl1'] = (0, sw, a); p['wr1'] = (0, -sw, -a); p['wl2'] = (0, sw * 1.05, a2); p['wr2'] = (0, -sw * 1.05, -a2); return p   # yaw: sweep back, roll: beat (roll first)
    def fly(ph):
        u = TAU * ph; a = 8 + flap * 0.5 * (1 + math.cos(u))
        return wings({'body': ((-10 + 3 * math.sin(u), 0, 0), (0, 0.002 * math.cos(u), 0)), 'abd': (6 + 4 * math.sin(u), 0, 0),
                      'antL': (-10, 0, 0), 'antR': (-10, 0, 0)}, a, 0, a - 6)
    def hover(ph):
        p = fly(ph); p['body'] = ((-4, 3 * _S(ph * 0.25), 0), (0, 0.003 * _S(ph * 0.5), 0)); return p
    def perch(ph):
        o = smooth(0.1, 0.2, ph) * smooth(0.5, 0.4, ph)        # now and then the wings open a little
        return wings({'body': ((0, 0, 0), None), 'abd': (4 * _S(ph * 6), 0, 0), 'antL': (8 * _S(ph * 3), 0, 6 * _S(ph * 2)),
                      'antR': (8 * _S(ph * 3 + 0.3), 0, -6 * _S(ph * 2 + 0.2))}, 16 + 10 * o, sweep * (1 - 0.3 * o))
    def sleep(ph): return wings({'body': ((0, 0, 0), None), 'abd': (2 * _S(ph), 0, 0)}, 16, sweep)
    return {'fly': (4, fly), 'hover': (4, hover), 'perch': (120, perch), 'sleep': (60, sleep)}

def bee_spec(sid, P, scale=2.2, meta=None):
    """P: colours – head, thorax, thorax2, abd, band, legs, wing, vein, eye, pollen (None = no pollen basket)"""
    k = scale; C = {n: srgb(v) if isinstance(v, str) else v for n, v in P.items()}
    K = lambda *v: tuple(x * k for x in v)
    blobs = [dict(t='ell', c=K(0, 0.012, 0.012), r=K(0.0125, 0.012, 0.0135), bone='body'),          # thorax
             dict(t='ell', c=K(0, 0.0125, 0.0245), r=K(0.0065, 0.0065, 0.004), bone='body'),        # neck
             dict(t='ell', c=K(0, 0.0125, 0.0315), r=K(0.0098, 0.0095, 0.0062), bone='body'),       # head
             dict(t='ell', c=K(0, 0.009, -0.0015), r=K(0.0055, 0.0055, 0.004), bone='abd'),         # waist
             dict(t='ell', c=K(0, 0.005, -0.023), r=K(0.0148, 0.0128, 0.024), rot=(9, 0, 0), bone='abd')]   # abdomen
    bones = [('body', None, K(0, 0.012, 0.0), K(0, 0.012, 0.04)), ('abd', 'body', K(0, 0.01, 0.0), K(0, 0.004, -0.042))]
    parts = []
    FORE = [(0.0, 0.003), (0.015, 0.0072), (0.035, 0.0075), (0.05, 0.003), (0.055, -0.002), (0.047, -0.0065), (0.026, -0.008), (0.008, -0.0045)]
    HIND = [(0.0, 0.002), (0.012, 0.004), (0.028, 0.0035), (0.036, 0.0), (0.032, -0.004), (0.016, -0.005), (0.004, -0.003)]
    def wtop(x, z, r):
        v = smooth(0.85, 0.97, abs(math.sin(math.atan2(z, x) * 5))) * smooth(0.15, 0.3, r)
        cell = 0.5 + 0.5 * math.sin(x * 900) * math.sin(z * 700)
        return mix(mix(mix(C['wing'], C['vein'], 0.08 * cell), C['vein'], 0.75 * v), C['vein'], 0.6 * smooth(0.88, 0.99, r))
    for sx, L in ((1, 'l'), (-1, 'r')):
        fw = bwing(L, sx, [(a * k, b * k) for a, b in FORE], wtop, wtop, root=K(sx * 0.007, 0.0225, 0.017)); fw.bone = 'w%s1' % L; parts.append(fw)
        hw = bwing(L, sx, [(a * k, b * k) for a, b in HIND], wtop, wtop, root=K(sx * 0.0075, 0.0215, 0.008)); hw.bone = 'w%s2' % L; parts.append(hw)
        bones += [('w%s1' % L, 'body', K(sx * 0.007, 0.0225, 0.017), K(sx * 0.06, 0.0225, 0.014)),
                  ('w%s2' % L, 'body', K(sx * 0.0075, 0.0215, 0.008), K(sx * 0.04, 0.0215, 0.005))]
        # compound eyes on the sides of the head, glossy
        e = Part('eye', bone='body', mat=1, color=C['eye']); e.add(*ellipsoid(K(sx * 0.0084, 0.0135, 0.033), K(0.003, 0.0058, 0.0042), 8, 6)); parts.append(e)
        # elbowed antennae
        a0, a1, a2 = Vector(K(sx * 0.0028, 0.0185, 0.0385)), Vector(K(sx * 0.0045, 0.0262, 0.0425)), Vector(K(sx * 0.0105, 0.029, 0.0545))
        an = Part('ant', bone='ant' + ('L' if sx > 0 else 'R'), color=C['legs']); an.add(*tube([a0, a1, a2], [0.0008 * k, 0.0008 * k, 0.0007 * k], 4)); parts.append(an)
        bones.append(('ant' + ('L' if sx > 0 else 'R'), 'body', tuple(a0), tuple(a2)))
        # six jointed legs from under the thorax, the hind pair longer
        for j, (z0, ln) in enumerate(((0.019, 1.0), (0.012, 1.1), (0.005, 1.35))):
            b0 = Vector(K(sx * 0.006, 0.004, z0)); kn = b0 + Vector(K(sx * 0.0075 * ln, -0.001, -0.0015 * j))
            ft = kn + Vector(K(sx * 0.003 * ln, -0.0085, (0.004 - 0.006 * j) * ln))
            lg = Part('leg', bone='body', color=C['legs']); lg.add(*tube([b0, kn, ft], [0.0013 * k, 0.0011 * k, 0.0008 * k], 4)); parts.append(lg)
            if j == 2 and C.get('pollen') is not None:
                pb = Part('pollen', bone='body', color=C['pollen']); pb.add(*ellipsoid(tuple(kn + (ft - kn) * 0.45), K(0.0026, 0.0034, 0.0026), 6, 5)); parts.append(pb)
    def paint(Pn, N, tag):
        x, y, z = Pn[0] / k, Pn[1] / k, Pn[2] / k
        n = noise.noise(Vector((x * 900, y * 900, z * 900)))
        if z > 0.0255: return mix(C['head'], C['thorax2'], 0.15 + 0.15 * n)
        if z > 0.001: return mix(C['thorax'], C['thorax2'], 0.4 + 0.3 * n + 0.3 * smooth(0.012, 0.022, y))
        t = (-z) / 0.04
        band = smooth(0.25, 0.5, math.sin(t * math.pi * 7.2 - 0.6)) * smooth(0.02, 0.12, t)
        c = mix(C['abd'], C['band'], band)
        if t > 0.9: c = mix(c, C['band'], 0.7)
        return mix(c, C['thorax2'], 0.1 * n)
    return dict(id=sid, bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0011 * k, tris=900, smooth=6,
                actions=bee_actions(), skin='fur', noLids=True, meta=meta or {})

def build_hd(spec, place=None, bake=True):
    t0 = time.time()
    if spec['id'] in TWEAK: TWEAK[spec['id']](spec)
    if skin_of(spec) == 'feather': _bird_fold(spec)
    if spec['id'] in BODY_OF and not spec.get('noBody'): body_plan(spec, BODY_OF[spec['id']])
    if spec.get('seatSpines'): _seat_spines(spec)   # after the body plan: the spines sit on the final skin
    if spec['id'] in EYE and not spec.get('noEyeSet'): _set_eyes(spec)
    _mouth(spec)
    if spec['id'] in ANAT and not spec.get('noAnat'):
        kind, over = ANAT[spec['id']]; anat_legs(spec, kind, **over)
    info = build(spec, place)
    sid = spec['id']; nb = info['body']
    # the game mesh keeps its skin weights in vertex groups (already set by build) – the LOD decimation carries them
    info.update(hd_paint(sid, nb)); t1 = time.time()
    hd_high(sid, nb)
    if bake:
        info['bake'] = hd_bake(sid); hd_preview_mats(sid)
        info['lod1_tris'] = hd_lod1(sid)
    info['secs'] = round(time.time() - t0, 1); info['paint_secs'] = round(t1 - t0, 1)
    return info

_shot0 = globals().get('_shot0') or shot
def shot(sid, path, action=None, frame=1, yaw=35, pitch=12, dist=None, target=None):
    meta = REG[sid]['spec'].get('meta', {}); off = meta.get('perchOffset', 0) if action in ('perch', 'idle', 'sleep', 'eat', 'walk') else 0
    g = bpy.data.objects.get('AKground'); z0 = g.location.z if g else 0
    if g: g.location.z = -off
    try: return _shot0(sid, path, action, frame, yaw, pitch, dist, target)
    finally:
        if g: g.location.z = z0
