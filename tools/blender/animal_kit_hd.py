
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
    K = dict(LEG_KINDS[kind]); K.update(over)
    bb = {b[0]: (Vector(b[2]), Vector(b[3])) for b in spec['bones']}
    if not LEGBONES <= set(bb): return spec
    keep = []
    for bl in spec['blobs']:
        if bl.get('bone') in LEGBONES and not (keep_feet and bl.get('foot')): continue
        keep.append(bl)
    out = keep; f = scale
    def cap(a, b, r0, r1, bone): out.append(dict(t='cap', a=tuple(a), b2=tuple(b), r=(r0, r1), bone=bone))
    def ell(c, r, bone, rot=None):
        d = dict(t='ell', c=tuple(c), r=tuple(r), bone=bone)
        if rot: d['rot'] = rot
        out.append(d)
    for L in ('l', 'r'):
        # ── foreleg
        S, E = bb['f' + L]; _, G = bb['f' + L + '2']
        H = max(0.05, S.y - G.y) * f
        up = (S - E).length
        ell(S + (E - S) * 0.3 + Vector((0, 0.03 * H, -0.035 * H)), (K['sh'][0] * H, up * K['sh'][1], K['sh'][2] * H), 'f' + L)   # shoulder / triceps mass
        cap(S, E, K['arm'] * H, K['fa0'] * H * 1.05, 'f' + L)
        ell(E + Vector((0, 0.01 * H, -K['fa0'] * H * 0.55)), (K['fa0'] * H * 0.7,) * 3, 'f' + L + '2')                      # point of the elbow
        W = E + (G - E) * K['wrist_t']
        cap(E, W, K['fa0'] * H, K['fa1'] * H, 'f' + L + '2')
        ell(W, (K['wr'] * H, K['wr'] * H * 1.2, K['wr'] * H), 'f' + L + '2')
        if K['fet_t']:
            F = E + (G - E) * K['fet_t']
            cap(W, F, K['can'] * H, K['can'] * H * 0.95, 'f' + L + '2')
            ell(F, (K['fet'] * H, K['fet'] * H * 1.1, K['fet'] * H * 1.05), 'f' + L + '2')
            cap(F, G + Vector((0, 0.03 * H, 0.03 * H)), K['can'] * H * 0.9, K['can'] * H * 0.8, 'f' + L + '2')
        else:
            cap(W, G + Vector((0, K['paw'][1] * H, 0)), K['can'] * H, K['can'] * H * 0.95, 'f' + L + '2')
            pw = K['paw']; ell(G + Vector((0, pw[1] * H * 0.9, pw[2] * H * 0.35)), (pw[0] * H, pw[1] * H, pw[2] * H), 'f' + L + '2')
        # ── hind leg
        Hp, Kn = bb['h' + L]; _, G = bb['h' + L + '2']
        H = max(0.05, Hp.y - G.y) * f
        th = K['th']; tl = (Kn - Hp).length
        ell(Hp + (Kn - Hp) * 0.42 + Vector((0, 0.03 * H, -0.04 * H)), (th[0] * H, tl * th[1], th[2] * H), 'h' + L)        # haunch
        cap(Hp, Kn, th[0] * H * 0.75, K['gas0'] * H * 1.1, 'h' + L)
        ell(Kn + Vector((0, 0, 0.02 * H)), (K['gas0'] * H * 0.85,) * 3, 'h' + L + '2')                                        # stifle
        Hk = Kn + (G - Kn) * K['hock_t'] + Vector((0, 0, -K['hback'] * H))
        cap(Kn, Hk, K['gas0'] * H, K['gas1'] * H, 'h' + L + '2')
        ell(Hk + Vector((0, 0.01 * H, -K['hock'] * H * 0.45)), (K['hock'] * H * 0.75, K['hock'] * H * 1.1, K['hock'] * H), 'h' + L + '2')   # point of the hock
        if K['fet_t']:
            F = G + Vector((0, 0.1 * H, -0.01 * H))
            cap(Hk, F, K['mt'] * H, K['mt'] * H * 0.95, 'h' + L + '2')
            ell(F, (K['fet'] * H, K['fet'] * H * 1.1, K['fet'] * H * 1.05), 'h' + L + '2')
            cap(F, G + Vector((0, 0.03 * H, 0.03 * H)), K['mt'] * H * 0.9, K['mt'] * H * 0.8, 'h' + L + '2')
        else:
            pw = K['paw']
            cap(Hk, G + Vector((0, pw[1] * H, 0)), K['mt'] * H, K['mt'] * H * 0.95, 'h' + L + '2')
            ell(G + Vector((0, pw[1] * H * 0.9, pw[2] * H * 0.3)), (pw[0] * H, pw[1] * H, pw[2] * H * 1.05), 'h' + L + '2')
    hb = next((b for b in out if b.get('bone') == 'hips' and b['t'] == 'ell'), None)
    cb = next((b for b in out if b.get('bone') == 'chest' and b['t'] == 'ell'), None)
    if hb and cb and not spec.get('noSpine'):
        r = 0.86 * min(hb['r'][1], cb['r'][1], hb['r'][0] * 1.2, cb['r'][0] * 1.2)
        cap(Vector(hb['c']) + Vector((0, 0.08 * r, 0)), Vector(cb['c']) + Vector((0, 0.08 * r, 0)), r, r, 'hips')
    spec['blobs'] = out
    return spec

# species → leg type (+ tweaks); applied by build_hd
ANAT = {
    'gazelle': ('ungulate', {}), 'tapir': ('heavy', dict(wrist_t=0.7, hock_t=0.55)), 'jaguar': ('cat', {}), 'fox': ('canid', {}),
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


def _set_eyes(spec, depth=0.38):
    """eyes sit IN the skull: each eyeball (and its catch-light) moves back along its gaze, so only its front shows"""
    parts = spec.get('parts', [])
    for i, part in enumerate(parts):
        if part.tag != 'eye' or getattr(part, '_set', False): continue
        C = sum((Vector(v) for v in part.v), Vector()) / len(part.v); r = max((Vector(v) - C).length for v in part.v)
        hl = parts[i + 1] if i + 1 < len(parts) and parts[i + 1].tag == 'hl' else None
        g = None
        if hl:
            H = sum((Vector(v) for v in hl.v), Vector()) / len(hl.v); g = (H - C) - Vector((0, 0.45, 0.25)) * r * 0.5
        if g is None or g.length < 1e-6: g = Vector((1 if C.x >= 0 else -1, 0, 0.6))
        g.normalize(); off = -g * r * depth * spec.get('eyeDepth', 1.0)
        part.v = [tuple(Vector(v) + off) for v in part.v]; part._set = True
        if hl: hl.v = [tuple(Vector(v) + off) for v in hl.v]; hl._set = True
    return spec

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

TWEAK = {
    'fox': lambda sp: _fox_head(_smooth_tail(sp, [0.035, 0.06, 0.082, 0.078, 0.06, 0.035])),
    'jaguar': lambda sp: _add(_head_scale(sp, 1.14), [
        dict(t='ell', c=(0, 0.5, 0.12), r=(0.15, 0.17, 0.26), bone='chest'),                  # deep chest, belly line
        dict(t='ell', c=(0.075, 0.74, 0.24), r=(0.07, 0.05, 0.12), rot=(-15, 0, 0), bone='chest'),    # shoulder blades
        dict(t='ell', c=(-0.075, 0.74, 0.24), r=(0.07, 0.05, 0.12), rot=(-15, 0, 0), bone='chest'),
        dict(t='ell', c=(0, 0.62, 0.62), r=(0.12, 0.085, 0.085), bone='head'),               # broad cheeks
    ]),
}

def build_hd(spec, place=None, bake=True):
    t0 = time.time()
    if spec['id'] in TWEAK: TWEAK[spec['id']](spec)
    if skin_of(spec) == 'feather': _bird_fold(spec)
    if spec['id'] in EYE and not spec.get('noEyeSet'): _set_eyes(spec)
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
