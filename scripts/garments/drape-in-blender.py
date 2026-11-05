"""Drape a GarmentCode garment on an AYE Rocketbox body in Blender, weight it to the
body's Bip01 skeleton and export a skinned GLB.

Run with Blender's Python (a Blender install, or `pip install bpy==4.2.0` in
Python 3.11):

  python scripts/garments/drape-in-blender.py \
      --body <rocketbox.glb, uncompressed (scripts/garments/decompress-glb.mjs)> \
      --garment <GarmentCode *_boxmesh.obj> --lens <GarmentCode *_orig_lens.pickle> \
      --gc-body <GarmentCode body .obj the pattern was sized for> \
      --color "#e2661a" --out <garment.glb> [--frames 90] [--preview out.png]

What it does:
1. Imports the AYE body (armature in its bind pose) and the garment.
2. Scales and places the garment with GarmentCode's own body: matched height,
   feet and centre, and turned to face the same way as the AYE body.
3. Sews: GarmentCode lays the panels out round the body with the seams
   stretched across the gaps. The cloth's rest shape (a shape key) is relaxed to
   GarmentCode's true edge lengths, so Blender's cloth pulls each seam closed
   while it drapes over the AYE body (collision).
4. Takes the draped mesh, copies the body's bone weights onto it (nearest
   face, interpolated), keeps four per vertex and exports it with the armature
   as a skinned GLB. AYE binds it to the character's own skeleton by bone name
   (world/glbGarment.ts), so only vertex positions and weights cross over.
"""
import argparse
import os
import pickle
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser()
    p.add_argument('--body', required=True)
    p.add_argument('--garment', required=True)
    p.add_argument('--lens', required=True)
    p.add_argument('--gc-body', required=True)
    p.add_argument('--color', default='#d0d0d0')
    p.add_argument('--texture', default=None, help='optional fabric image, tiled over the garment')
    p.add_argument('--out', required=True)
    p.add_argument('--frames', type=int, default=90)
    p.add_argument('--preview', default=None)
    p.add_argument('--fit', type=float, default=1.0, help='below 1 for a stretch fabric that hugs the body (0.9 = 10%% smaller at rest); sleeves keep their size')
    return p.parse_args(argv)


def world_bbox(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        e = o.evaluated_get(dg)
        m = e.to_mesh()
        mw = o.matrix_world
        pts += [mw @ v.co for v in m.vertices]
        e.to_mesh_clear()
    a = np.array([[p.x, p.y, p.z] for p in pts])
    return a, a.min(0), a.max(0)


def arm_axis(points, lo, hi):
    """0 if the arms (the widest span at shoulder height) run along X, 1 if along Y."""
    h = hi[2] - lo[2]
    sh = points[(points[:, 2] > lo[2] + 0.78 * h) & (points[:, 2] < lo[2] + 0.84 * h)]
    return 0 if np.ptp(sh[:, 0]) > np.ptp(sh[:, 1]) else 1


def facing_of_skeleton(armature):
    """The unit vector a Rocketbox body faces: from the feet to the toes (Bip01 Foot -> Toe0), level."""
    mw = armature.matrix_world
    bones = {b.name.lower().replace(' ', '').replace('_', ''): b for b in armature.data.bones}
    v = Vector((0, 0, 0))
    for side in ('l', 'r'):
        foot, toe = bones.get(f'bip01{side}foot'), bones.get(f'bip01{side}toe0')
        if foot and toe:
            v += (mw @ toe.head_local) - (mw @ foot.head_local)
    v.z = 0
    if v.length < 1e-6:
        raise SystemExit('no Bip01 foot and toe bones: is this a Rocketbox body?')
    v.normalize()
    return np.array(v[:])


# GarmentCode's bodies and patterns face +Z with Y up (the SMPL convention); imported with
# forward_axis='NEGATIVE_Z', up_axis='Y' that is -Y in Blender
GC_FACING = np.array([0.0, -1.0, 0.0])


def shoulder_height(points, lo, hi):
    """Height of the shoulders above the feet: the top of the body just outside the neck and head."""
    h = hi[2] - lo[2]
    ax = arm_axis(points, lo, hi)
    c = (lo[ax] + hi[ax]) / 2
    side = points[(np.abs(points[:, ax] - c) > 0.09 * h) & (np.abs(points[:, ax] - c) < 0.12 * h)]
    return side[:, 2].max() - lo[2]


def smooth(X, edges, pts, nrm, arm, sleeve, thickness, iters=12):
    """Even out small dents (Laplacian smoothing), keeping every point at least `thickness` off
    the body; sleeves keep clear of the arms, the rest of the trunk."""
    from scipy.spatial import cKDTree
    a, b = edges[:, 0], edges[:, 1]
    cnt = np.maximum(np.bincount(np.r_[a, b], minlength=len(X)), 1)[:, None]
    groups = [(np.flatnonzero(sleeve), np.arange(len(pts))), (np.flatnonzero(~sleeve), np.flatnonzero(~arm))]
    trees = [(who, ids, cKDTree(pts[ids])) for who, ids in groups if len(who)]
    X = X.copy()
    for _ in range(iters):
        acc = np.zeros_like(X)
        np.add.at(acc, a, X[b]); np.add.at(acc, b, X[a])
        X = 0.5 * X + 0.5 * acc / cnt
        for who, ids, tree in trees:
            _, k = tree.query(X[who]); k = ids[k]
            depth = ((X[who] - pts[k]) * nrm[k]).sum(1)
            h = depth < thickness
            X[who[h]] += (thickness - depth[h])[:, None] * nrm[k][h]
    return X


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def skirt_weights(out, armature, skirt, X):
    """A skirt can't take the legs' own weights (it would split round each leg like trousers when
    the person strides): as AYE's built gowns do (lib/garmentMath.ts skirtInfluences), it hangs
    from the pelvis at the waist and is shared between the thighs, then the calves, toward the hem,
    by which side of the body each point is on."""
    mw = armature.matrix_world
    bone = lambda n: next(b for b in armature.data.bones if b.name.lower().replace(' ', '').replace('_', '') == n)
    pel, lth, rth, lca, rca = (bone(n) for n in ('bip01pelvis', 'bip01lthigh', 'bip01rthigh', 'bip01lcalf', 'bip01rcalf'))
    hip = (mw @ pel.head_local).z
    knee_z = ((mw @ lca.head_local).z + (mw @ rca.head_local).z) / 2
    lpos, rpos = np.array((mw @ lth.head_local)[:]), np.array((mw @ rth.head_local)[:])
    across = (lpos - rpos); across[2] = 0; half = np.linalg.norm(across); across /= half
    mid = (lpos + rpos) / 2
    idx = np.flatnonzero(skirt)
    hem = X[idx, 2].min()
    depth = np.clip((hip - X[idx, 2]) / max(hip - hem, 1e-6), 0, 1)
    knee = np.clip((hip - knee_z) / max(hip - hem, 1e-6), 0, 1.0001)
    # Side: -1 right .. +1 left, by the point's offset across the hips over the skirt's half-width there
    off = (X[idx] - mid) @ across
    width = np.maximum(np.abs(off).max(), 1e-6)
    side = np.clip(off / (0.9 * width), -1, 1)
    # A pencil skirt lies close to the thighs: they carry most of it from mid-thigh down (so it
    # follows them when the person sits), shared across the middle so it doesn't split in a stride
    leg = 0.92 * smoothstep(0.02, 0.45, depth)
    calf = 0.45 * smoothstep(knee, min(1, knee + 0.35), depth) if knee < 1 else np.zeros_like(depth)
    left = np.clip(0.5 + side * 0.75, 0, 1)
    thigh, shin = leg * (1 - calf), leg * calf
    w = {pel.name: 1 - leg, lth.name: thigh * left, rth.name: thigh * (1 - left), lca.name: shin * left, rca.name: shin * (1 - left)}
    ids = [int(i) for i in idx]
    # Over each thigh the body's own weights (copied from the skin beneath) are kept in part: they
    # follow the leg exactly, so a seated lap doesn't show through. Down the middle, between the
    # legs, only the shared weights above apply, so a stride doesn't split the skirt.
    own = 0.6 * smoothstep(0.25, 0.7, np.abs(side))
    names = {vg.index: vg.name for vg in out.vertex_groups}
    mesh = out.data
    final = []
    for n, i in enumerate(ids):
        mine = {names[g.group]: g.weight for g in mesh.vertices[i].groups}
        total = sum(mine.values()) or 1
        mix = {k: (1 - own[n]) * w[k][n] for k in w}
        for k, x in mine.items():
            mix[k] = mix.get(k, 0) + own[n] * x / total
        final.append(mix)
    for vg in out.vertex_groups:
        vg.remove(ids)
    for i, mix in zip(ids, final):
        for name, x in mix.items():
            if x > 1e-4:
                vg = out.vertex_groups.get(name) or out.vertex_groups.new(name=name)
                vg.add([i], float(x), 'REPLACE')
    print(f'skirt: {len(ids)} vertices weighted from the pelvis to the thighs and calves, not each leg on its own')


def carry(Xg, edges, gp, gn, pts, arm, sleeve, smooth=30):
    """Move a garment draped on one body onto another standing in the same place: each vertex
    moves as the nearest point of the first body moves to the second (sleeves to the arms,
    the rest to the trunk), smoothed over the cloth so it bends rather than tears."""
    from scipy.spatial import cKDTree
    _, k = cKDTree(gp).query(Xg)
    D = np.zeros_like(Xg)
    for who, ids in ((np.flatnonzero(sleeve), np.arange(len(pts))), (np.flatnonzero(~sleeve), np.flatnonzero(~arm))):
        if len(who):
            _, j = cKDTree(pts[ids]).query(gp[k[who]])
            D[who] = pts[ids[j]] - gp[k[who]]
    a, b = edges[:, 0], edges[:, 1]
    cnt = np.maximum(np.bincount(np.r_[a, b], minlength=len(Xg)), 1)[:, None]
    for _ in range(smooth):
        acc = np.zeros_like(D)
        np.add.at(acc, a, D[b]); np.add.at(acc, b, D[a])
        D = 0.5 * D + 0.5 * acc / cnt
    return Xg + D


def body_surface(meshes, all_meshes=False, armature=None):
    """Points and outward normals densely covering the body (vertices and face centres), world space.

    Also says which points the arms carry (for GarmentCode-style panel collision: only
    sleeves meet the arms). Only the skin and clothes: the hair, lashes and other see-through cards (an "opacity"
    material) are thin sheets whose normals don't point out of the body.
    """
    dg = bpy.context.evaluated_depsgraph_get()
    P, N, A = [], [], []
    for ob in meshes:
        e = ob.evaluated_get(dg)
        m = e.to_mesh()
        mw = ob.matrix_world
        rot = mw.to_3x3().normalized()
        cards = {i for i, slot in enumerate(ob.material_slots) if slot.material and 'opacity' in slot.material.name.lower()}
        # How much of each vertex the arms drive (upper arm, forearm, hand, fingers)
        arm_groups = set() if all_meshes else {vg.index for vg in ob.vertex_groups if any(k in vg.name.lower() for k in ('upperarm', 'forearm', 'hand', 'finger'))}
        arm = np.array([sum(g.weight for g in v.groups if g.group in arm_groups) for v in m.vertices])
        used = set()
        for f in m.polygons:
            if f.material_index in cards:
                continue
            P.append((mw @ f.center)[:]); N.append((rot @ f.normal).normalized()[:])
            A.append(arm[list(f.vertices)].mean())
            used.update(f.vertices)
        for i in used:
            v = m.vertices[i]
            P.append((mw @ v.co)[:]); N.append((rot @ v.normal).normalized()[:])
            A.append(arm[i])
        e.to_mesh_clear()
    P, N, A = np.array(P), np.array(N), np.array(A) > 0.5
    if armature is not None:
        # Rocketbox bodies are dressed meshes with inner layers (inside a collar, a cuff) whose
        # normals face into the body: keep only surface that faces away from its nearest bone
        mw = armature.matrix_world
        segs = np.array([[(mw @ b.head_local)[:], (mw @ b.tail_local)[:]] for b in armature.data.bones
                         if (b.tail_local - b.head_local).length > 1e-4])
        h, t = segs[:, 0], segs[:, 1]
        best = np.full(len(P), np.inf); out = np.zeros_like(P)
        for i in range(len(segs)):
            d = t[i] - h[i]
            u = np.clip(((P - h[i]) @ d) / (d @ d), 0, 1)
            v = P - (h[i] + u[:, None] * d)
            dist = np.einsum('ij,ij->i', v, v)
            closer = dist < best
            best[closer] = dist[closer]; out[closer] = v[closer]
        facing = np.einsum('ij,ij->i', out, N) / (np.linalg.norm(out, axis=1) + 1e-9)
        keep = facing > -0.1
        print(f'body: {int((~keep).sum())} of {len(P)} surface points face inward (inner layers), left out')
        P, N, A = P[keep], N[keep], A[keep]
    return P, N, A


def drape(X0, edges, rest, pts, nrm, steps, thickness=0.006, iters=12, arm=None, sleeve=None, hang=None):
    """Position-based cloth: Verlet with gravity, edge-length constraints and body collision.

    Two phases, as GarmentCode's own simulator does: first the seams are pulled closed with
    no gravity (until they are within 20% of their sewn length), then the cloth hangs under
    gravity. Edges are solved in Gauss-Seidel passes; contact with the body stops a
    point (friction), so the sewn garment rests on the shoulders and hips.

    As in GarmentCode's simulator, panels only collide with the body parts they dress: the
    bodice and skirt pass the arms (`arm`: body points the arms carry) and only sleeves
    (`sleeve`: cloth vertices) meet them, so side seams can close under the arms.
    """
    from scipy.spatial import cKDTree
    arm = np.zeros(len(pts), bool) if arm is None else arm
    sleeve = np.zeros(len(X0), bool) if sleeve is None else sleeve
    trees = [(cKDTree(pts), np.flatnonzero(sleeve), np.arange(len(pts))),
             (cKDTree(pts[~arm]), np.flatnonzero(~sleeve), np.flatnonzero(~arm))]
    X = X0.copy()
    prev = X.copy()
    a, b = edges[:, 0], edges[:, 1]
    g = np.array([0, 0, -9.8]) * (1 / 60) ** 2

    def collide(X, prev, friction):
        hit = np.zeros(len(X), bool)
        for tree, who, ids in trees:
            if not len(who):
                continue
            _, k = tree.query(X[who])
            k = ids[k]
            depth = ((X[who] - pts[k]) * nrm[k]).sum(1)
            h = depth < thickness
            w = who[h]
            n = nrm[k][h]
            push = (thickness - depth[h])[:, None] * n
            if friction:
                # Static friction: a touching point keeps only its movement away from the body,
                # so cloth rests on a sloping shoulder instead of sliding down it
                dx = X[w] - prev[w]
                X[w] = prev[w] + np.maximum((dx * n).sum(1), 0)[:, None] * n + push
                prev[w] = X[w]
            else:
                X[w] += push
                prev[w] += push
            hit[w] = True
        return hit

    # Edges in groups that share no vertex: each group is solved exactly at once (Gauss-Seidel
    # by colour), which stays stiff on a whole garment where averaged passes sag
    colour = np.full(len(edges), -1)
    used = [set() for _ in range(len(X))]
    for e, (i, j) in enumerate(edges):
        c = 0
        while c in used[i] or c in used[j]:
            c += 1
        colour[e] = c
        used[i].add(c); used[j].add(c)
    groups = [np.flatnonzero(colour == c) for c in range(colour.max() + 1)]

    def solve(X, prev, friction, lift=1.0):
        hit = None
        for _ in range(iters):
            for grp in groups:
                i, j = a[grp], b[grp]
                d = X[j] - X[i]
                L = np.linalg.norm(d, axis=1) + 1e-9
                corr = ((L - rest[grp]) / L)[:, None] * d * 0.5
                # No point moves more than 3 mm at once, and the body is checked after every pass,
                # so cloth can't tunnel through it (it is far thicker than that)
                m = np.linalg.norm(corr, axis=1, keepdims=True)
                corr *= np.minimum(1, 0.003 / np.maximum(m, 1e-9))
                corr[:, 2] *= lift
                X[i] += corr
                X[j] -= corr
            hit = collide(X, prev, friction)
        return X, hit

    def clamp(v, most=0.004):
        n = np.linalg.norm(v, axis=1, keepdims=True)
        return v * np.minimum(1, most / np.maximum(n, 1e-9))

    def stretch(X):
        r = np.linalg.norm(X[b] - X[a], axis=1) / np.maximum(rest, 1e-9)
        return np.percentile(r, 99)

    # 1. Sew
    for step in range(steps * 6):
        vel = clamp((X - prev) * 0.7)
        prev = X.copy()
        X = X + vel
        collide(X, prev, False)
        # While sewing, panels close round the body more than they slide up or down it, so a
        # shoulder seam closes over the shoulders instead of pulling the bodice down past them
        X, _ = solve(X, prev, False, lift=0.2)
        if step % 20 == 0:
            s99 = stretch(X)
            print(f'  sewing step {step}: 99th percentile edge ratio {s99:.2f}', flush=True)
            if s99 < 1.2:
                break
    print(f'sewn after {step + 1} steps; 99th percentile edge ratio {stretch(X):.2f}')
    # 2. Hang under gravity
    hang = steps if hang is None else hang
    hit = np.zeros(len(X), bool)
    for step in range(hang):
        vel = clamp((X - prev) * 0.98 + g)
        prev = X.copy()
        X = X + vel
        collide(X, prev, True)
        X, hit = solve(X, prev, True)
    print(f'hung for {hang} steps; 99th percentile edge ratio {stretch(X):.2f}; {int(hit.sum())} points touching the body')
    return X


def main():
    o = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=o.body)
    arm_ob = next(ob for ob in bpy.data.objects if ob.type == 'ARMATURE')
    if arm_ob.animation_data:
        arm_ob.animation_data.action = None
    arm_ob.data.pose_position = "REST"
    # Only the person: the importer also makes an icosphere to draw the bones with
    body_meshes = [ob for ob in bpy.data.objects if ob.type == 'MESH' and any(m.type == 'ARMATURE' for m in ob.modifiers)]
    body = max(body_meshes, key=lambda ob: len(ob.data.vertices))
    bpts, blo, bhi = world_bbox(body_meshes)

    # GarmentCode's own body (to place the garment) and the garment, in centimetres, Y up
    bpy.ops.wm.obj_import(filepath=o.gc_body, forward_axis='NEGATIVE_Z', up_axis='Y')
    gcb = bpy.context.selected_objects[0]
    bpy.ops.wm.obj_import(filepath=o.garment, forward_axis='NEGATIVE_Z', up_axis='Y')
    g = bpy.context.selected_objects[0]
    gpts, glo, ghi = world_bbox([gcb])
    # Sized by the shoulders, which carry the garment (the two bodies' necks and heads differ)
    sb, sg = shoulder_height(bpts, blo, bhi), shoulder_height(gpts, glo, ghi)
    s = sb / sg
    print(f'shoulders: AYE body {sb:.3f} m, GarmentCode body {sg:.3f} m (heights {bhi[2] - blo[2]:.3f}, {ghi[2] - glo[2]:.3f}); scale {s:.3f}')
    # GarmentCode's bodies are in metres, its garments in centimetres
    _, galo, gahi = world_bbox([g])
    g.scale = (0.01, 0.01, 0.01) if (gahi[2] - galo[2]) > 10 * (ghi[2] - glo[2]) else (1, 1, 1)
    bpy.context.view_layer.update()
    fb, fg = facing_of_skeleton(arm_ob), GC_FACING
    angle = np.arctan2(fb[1], fb[0]) - np.arctan2(fg[1], fg[0])
    turn = Matrix.Rotation(angle, 4, 'Z')
    print(f'facing: AYE body {fb}, GarmentCode body {fg}, turning the garment {np.degrees(angle):.0f} degrees')
    centre = lambda lo, hi: Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]))
    place = Matrix.Translation(centre(blo, bhi)) @ turn @ Matrix.Scale(s, 4) @ Matrix.Translation(-centre(glo, ghi))
    for ob in (gcb, g):
        ob.matrix_world = place @ ob.matrix_world
    bpy.context.view_layer.update()
    gc_pts, gc_nrm, _ = body_surface([gcb], all_meshes=True)
    # GarmentCode's body has no skeleton: its arms are what lies outside the shoulders, above the hips
    h = bhi[2] - blo[2]
    lat = arm_axis(bpts, blo, bhi)
    mid = (blo[lat] + bhi[lat]) / 2
    gc_arm = (np.abs(gc_pts[:, lat] - mid) > 0.11 * h) & (gc_pts[:, 2] > blo[2] + 0.52 * h)
    bpy.data.objects.remove(gcb)

    # Rest shape: GarmentCode's sewn edge lengths (its own simulator's rest lengths), in the
    # object's own units (centimetres, as in GarmentCode's files)
    me = g.data
    V = np.array([v.co[:] for v in me.vertices])
    edges = np.array([e.vertices[:] for e in me.edges])
    rest = np.linalg.norm(V[edges[:, 1]] - V[edges[:, 0]], axis=1)
    lens = pickle.load(open(o.lens, 'rb'))
    index = {(min(a, b), max(a, b)): i for i, (a, b) in enumerate(edges)}
    matched = 0
    for (a, b), L in lens.items():
        i = index.get((min(a, b), max(a, b)))
        if i is not None and L > 0:
            rest[i] = L
            matched += 1
    stretched = np.linalg.norm(V[edges[:, 1]] - V[edges[:, 0]], axis=1) / np.maximum(rest, 1e-9)
    print(f'seams: {matched} of {len(lens)} GarmentCode edges matched; {int((stretched > 1.5).sum())} stretched over 1.5x before sewing')

    mw = np.array(g.matrix_world)
    Vw = (np.c_[V, np.ones(len(V))] @ mw.T)[:, :3]
    unit = np.linalg.norm(mw[:3, 0])  # object units (cm) to metres, as placed
    rest_m = rest * unit
    pts, nrm, arm = body_surface(body_meshes, armature=arm_ob)
    # Only sleeves meet the arms; the bodice can pass the outside of the shoulder (|lateral| over 0.115 h)
    arm &= np.abs(pts[:, lat] - mid) > 0.115 * h
    seg = o.garment.replace('_boxmesh.obj', '_sim_segmentation.txt')
    labels = open(seg).read().split() if os.path.exists(seg) else []
    sleeve = np.array(['sleeve' in l for l in labels]) if len(labels) == len(V) else np.zeros(len(V), bool)
    print(f'panels: {int(sleeve.sum())} sleeve vertices meet the arms')

    # Sew and hang on GarmentCode's own body (its panels are laid out for it, and it is a clean,
    # closed surface), then carry the garment onto the AYE body and let it settle there.
    print('draping on the GarmentCode body')
    Dg = drape(Vw, edges, rest_m, gc_pts, gc_nrm, o.frames, arm=gc_arm, sleeve=sleeve, iters=40)
    Dw = carry(Dg, edges, gc_pts, gc_nrm, pts, arm, sleeve)
    print('settling on the AYE body')
    # A stretch fabric (--fit under 1) is cut smaller than the body and hugs it; sleeves keep their size
    # Only round the body (edges running mostly level): the length and the hem stay where they are
    dirs = Dw[edges[:, 1]] - Dw[edges[:, 0]]
    level = np.abs(dirs[:, 2]) < 0.5 * np.linalg.norm(dirs, axis=1)
    snug = rest_m * np.where(level & ~(sleeve[edges[:, 0]] | sleeve[edges[:, 1]]), o.fit, 1.0)
    Dw = drape(Dw, edges, snug, pts, nrm, 5 if o.fit >= 1 else 40, arm=arm, sleeve=sleeve, iters=40, hang=0, thickness=0.01)
    # Smooth out small dents, and keep 1.2 cm off the body so it doesn't show through when the person moves
    Dw = smooth(Dw, edges, pts, nrm, arm, sleeve, thickness=0.012)

    inv = np.linalg.inv(mw)
    after = (np.c_[Dw, np.ones(len(Dw))] @ inv.T)[:, :3]
    draped = me.copy()
    out = bpy.data.objects.new('garment', draped)
    bpy.context.scene.collection.objects.link(out)
    out.matrix_world = g.matrix_world.copy()
    for idx, p in enumerate(after):
        draped.vertices[idx].co = Vector(p)
    bpy.data.objects.remove(g)
    seam = np.linalg.norm(Dw[edges[:, 1]] - Dw[edges[:, 0]], axis=1) / np.maximum(rest_m, 1e-9)
    print(f'seams: {int((seam > 1.5).sum())} edges still stretched over 1.5x after draping; median edge ratio {np.median(seam):.2f}, 99th percentile {np.percentile(seam, 99):.2f}')
    from scipy.spatial import cKDTree
    d, k = cKDTree(pts).query(Dw)
    inside = int((((Dw - pts[k]) * nrm[k]).sum(1) < 0).sum())
    print(f'fit: {inside} of {len(Dw)} cloth vertices inside the AYE body; median gap {np.median(d) * 100:.1f} cm; '
          f'hem at {Dw[:, 2].min() - blo[2]:.2f} m, top at {Dw[:, 2].max() - blo[2]:.2f} m above the feet')
    if os.environ.get('AYE_DRAPE_DUMP'):
        np.savez(os.environ['AYE_DRAPE_DUMP'], X=Vw, D=Dw, edges=edges, rest=rest_m, pts=pts, nrm=nrm, arm=arm, sleeve=sleeve)

    # Weights from the body
    for name in [vg.name for vg in body.vertex_groups]:
        out.vertex_groups.new(name=name)
    dt = out.modifiers.new('Weights', 'DATA_TRANSFER')
    dt.object = body
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'
    dt.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = out
    bpy.ops.object.select_all(action='DESELECT')
    out.select_set(True)
    bpy.ops.object.modifier_apply(modifier=dt.name)
    skirt = np.array(['skirt' in l for l in labels]) if len(labels) == len(V) else np.zeros(len(V), bool)
    if skirt.any():
        skirt_weights(out, arm_ob, skirt, Dw)
    bpy.ops.object.vertex_group_limit_total(limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    # Under the armature, in its space
    mw = out.matrix_world.copy()
    out.parent = arm_ob
    out.matrix_world = mw
    am = out.modifiers.new('Armature', 'ARMATURE')
    am.object = arm_ob

    # Cloth material: the photo's fabric colour (and an optional fabric image)
    mat = bpy.data.materials.new('fabric')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    hexc = o.color.lstrip('#')
    srgb = [int(hexc[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Roughness'].default_value = 0.82
    if o.texture:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(o.texture)
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    out.data.materials.clear()
    out.data.materials.append(mat)
    for poly in out.data.polygons:
        poly.use_smooth = True

    if o.preview:
        render_preview(o.preview, [out] + body_meshes, Vector(fb.tolist()))

    bpy.ops.object.select_all(action='DESELECT')
    out.select_set(True)
    arm_ob.select_set(True)
    bpy.context.view_layer.objects.active = arm_ob
    bpy.ops.export_scene.gltf(filepath=o.out, export_format='GLB', use_selection=True, export_skins=True,
                              export_animations=False, export_morph=False, export_yup=True)
    print(f'wrote {o.out}: {len(draped.vertices)} vertices, {len(draped.polygons)} faces')


def render_preview(path, objs, front):
    scene = bpy.context.scene
    pts, lo, hi = world_bbox(objs)
    h = hi[2] - lo[2]
    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    c = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2] + h * 0.55))
    # In front of the person, a little to one side
    side = Vector((-front.y, front.x, 0))
    cam.location = c + front * h * 1.9 + side * h * 0.6 + Vector((0, 0, h * 0.1))
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = 50
    scene.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3
    sun.rotation_euler = (0.8, 0.2, 0.6)
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new('w')
    world.color = (0.5, 0.5, 0.52)
    scene.world = world
    # Cycles on the CPU: needs no display (Workbench and EEVEE need OpenGL)
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    scene.render.resolution_x, scene.render.resolution_y = 600, 900
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
