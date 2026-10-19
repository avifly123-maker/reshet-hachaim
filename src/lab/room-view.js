// The look-around room of the lab (Avi, 19.10: "a wider room, arrows to move around a little, and when we click the
// microscope the robot turns, faces it and walks to it").
// The room is an equirectangular panorama rendered in Blender from the room's centre (tools/blender/lab_hd.py
// lab_hd_pano, or env.png until that render exists; tools/build-lab.py → LAB_ART.pano). The camera stands exactly at
// that centre, so it may turn freely: the picture is a sphere around the eye, and the live things (רובו־דע, the fish)
// still sit on it in the right place. One fullscreen quad looks the picture up by the direction of each pixel: no sphere
// mesh, no seams, one texture.
// This file holds the view (picture, turning, input) and the robot's walks round the room; lab.js decides when.
import * as THREE from 'three';

const D2R = Math.PI / 180;
export const HFOV = 96;                     // degrees across the screen: wide, to take in the room (narrower on a tall screen: vfov ≤ VMAX)
const VMIN = 44, VMAX = 72;
export const PITCH = [-30, 12];             // gentle limits on looking down and up (degrees)
// the inventors table in the middle of the room (lab_hd.py table(): an oval 2.5 × 1.5 m round Blender (0, 0.3), top at
// 0.82 + its rim): the robot walks round it, and a robot behind it is partly hidden from the eye (the depth proxies do it)
const TABLE = { cx: 0, cz: -0.3, ax: 1.25, az: 0.75, top: 0.86 };
const MIN_R = 1.95;                         // a walk keeps this far from the room's centre (the eye stands 0.6 m from it)
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (k) => k * k * (3 - 2 * k);

// the yaw of a point seen from p (0 = toward -z, the windows; positive to the right, toward +x)
export const yawOf = (p, from) => Math.atan2(p.x - from.x, -(p.z - from.z));

export function createRoomView({ url, eye, renderer }) {
  const EYE = new THREE.Vector3().fromArray(eye || [0, 1.3, 0.6]);
  const loader = new THREE.TextureLoader();
  let tex = null, loaded = false;
  const U = { tPano: { value: null }, uInvProj: { value: new THREE.Matrix4() }, uRot: { value: new THREE.Matrix3() }, uReady: { value: 0 } };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: `uniform sampler2D tPano; uniform mat4 uInvProj; uniform mat3 uRot; uniform float uReady; varying vec2 vNdc;
      void main(){
        vec4 v = uInvProj * vec4(vNdc, 1.0, 1.0); vec3 d = normalize(uRot * (v.xyz / v.w));
        vec2 uv = vec2(0.5 + atan(d.x, -d.z) * 0.15915494, 0.5 + asin(clamp(d.y, -1.0, 1.0)) * 0.31830989);
        vec4 c = texture2D(tPano, uv);
        gl_FragColor = mix(vec4(0.23, 0.2, 0.16, 1.0), c, uReady);
        #include <colorspace_fragment>
      }`,
  }));
  quad.frustumCulled = false; quad.renderOrder = -1001; quad.name = 'lab-pano';
  function load() {
    if (tex) return;
    tex = loader.load(url, () => { loaded = true; U.uReady.value = 1; });
    tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.RepeatWrapping;   // the seam behind the eye blends across
    U.tPano.value = tex;
  }

  // ── turning: yaw and pitch follow their targets softly (no jumps, no spin)
  const S = { yaw: -38 * D2R, pitch: -10 * D2R, yawT: -38 * D2R, pitchT: -10 * D2R, fovMul: 1, rate: 6, hold: 0, holdT: 0, holdBase: 0, drag: null, turned: false };
  const clampP = (p) => Math.max(PITCH[0] * D2R, Math.min(PITCH[1] * D2R, p));
  function face(yaw, pitch, now) {
    S.yawT = S.yaw + wrap(yaw - S.yaw); if (pitch != null) S.pitchT = clampP(pitch);
    if (now) { S.yaw = S.yawT; S.pitch = S.pitchT; }
  }
  const _at = new THREE.Vector3();
  function vfovFor(aspect) { const v = 2 * Math.atan(Math.tan(HFOV * D2R / 2) / aspect) / D2R; return Math.max(VMIN, Math.min(VMAX, v)); }
  function apply(camera, W, H, dt) {
    if (S.hold) {   // an arrow held down keeps turning, gently
      S.holdT += dt; if (S.holdT > 0.22) { S.yawT += S.hold * 55 * D2R * dt; S.turned = true; }
    }
    const k = 1 - Math.exp(-dt * (S.drag ? 16 : S.rate));
    S.yaw += (S.yawT - S.yaw) * k; S.pitch += (S.pitchT - S.pitch) * k;
    camera.clearViewOffset();
    camera.position.copy(EYE); camera.up.set(0, 1, 0);
    const cp = Math.cos(S.pitch);
    camera.lookAt(_at.set(EYE.x + Math.sin(S.yaw) * cp, EYE.y + Math.sin(S.pitch), EYE.z - Math.cos(S.yaw) * cp));
    camera.aspect = W / H; camera.fov = vfovFor(W / H) * S.fovMul; camera.near = 0.05; camera.far = 200;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    U.uInvProj.value.copy(camera.projectionMatrixInverse); U.uRot.value.setFromMatrix4(camera.matrixWorld);
  }
  // the arrows: a click turns a step, holding keeps turning (dir −1 = to the left, +1 = to the right)
  function holdStart(dir) { S.hold = dir; S.holdT = 0; S.holdBase = S.yawT; }
  function holdEnd() { if (!S.hold) return; if (S.holdT <= 0.22) { S.yawT = S.holdBase + S.hold * 40 * D2R; S.turned = true; } S.hold = 0; }
  function step(dyaw, dpitch) { S.yawT += dyaw * D2R; S.pitchT = clampP(S.pitchT + dpitch * D2R); S.turned = true; }
  // dragging grabs the room: drag to the right and the room comes along to the right (the view turns left)
  function dragStart(x, y, W, H) { S.drag = { x, y, yaw: S.yawT, pitch: S.pitchT, W, H, moved: 0 }; }
  function dragMove(x, y, camera) {
    const d = S.drag; if (!d) return;
    const vf = camera.fov * D2R, hf = 2 * Math.atan(Math.tan(vf / 2) * d.W / d.H);
    d.moved = Math.max(d.moved, Math.hypot(x - d.x, y - d.y));
    S.yawT = d.yaw - (x - d.x) * hf / d.W; S.pitchT = clampP(d.pitch + (y - d.y) * vf / d.H);
    if (d.moved > 6) S.turned = true;
  }
  function dragEnd() { const m = S.drag ? S.drag.moved : 0; S.drag = null; return m; }

  // ── the robot's walks: round the table, never through it, and never right up to the eye
  function clearR(th) {   // the distance from the room's centre along th at which the robot clears the table
    const cx = Math.sin(th), cz = -Math.cos(th), A = TABLE.ax + 0.42, B = TABLE.az + 0.42;
    const a = (cx * cx) / (A * A) + (cz * cz) / (B * B), b = 2 * (-TABLE.cz) * cz / (B * B), c = (TABLE.cz * TABLE.cz) / (B * B) - 1;
    return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  }
  function plan(from, to) {
    const ra = Math.hypot(from.x, from.z), rb = Math.hypot(to.x, to.z);
    const ta = Math.atan2(from.x, -from.z), dth = wrap(Math.atan2(to.x, -to.z) - ta);
    const N = 48, pts = [], cum = [0];
    for (let i = 0; i <= N; i++) {
      const s = i / N, th = ta + dth * s, bump = Math.min(1, Math.sin(Math.PI * s) * 2.4);
      const r = Math.max(ra + (rb - ra) * s, bump * Math.max(MIN_R, clearR(th)));
      pts.push(new THREE.Vector3(r * Math.sin(th), 0, -r * Math.cos(th)));
      if (i) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    }
    // the ends are exact: the robot starts where he stands and stops on his spot
    pts[0].set(from.x, 0, from.z); pts[N].set(to.x, 0, to.z);
    return { pts, cum, len: cum[N] };
  }
  function at(path, d, out) {
    const { pts, cum } = path; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const k = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return out.lerpVectors(pts[i - 1], pts[i], Math.max(0, Math.min(1, k)));
  }
  // how much of the robot (0.15 to 0.85 m above the floor) the table hides from the eye
  function hiddenFrac(p) {
    let hid = 0, n = 0;
    const ex = EYE.x - TABLE.cx, ez = EYE.z - TABLE.cz, dx = p.x - EYE.x, dz = p.z - EYE.z;
    const a = (dx / TABLE.ax) ** 2 + (dz / TABLE.az) ** 2, b = 2 * (ex * dx / TABLE.ax ** 2 + ez * dz / TABLE.az ** 2), c = (ex / TABLE.ax) ** 2 + (ez / TABLE.az) ** 2 - 1;
    const disc = b * b - 4 * a * c;
    for (let h = 0.15; h < 0.9; h += 0.1) {
      n++; if (disc <= 0) continue;
      const t1 = (-b - Math.sqrt(disc)) / (2 * a), t2 = (-b + Math.sqrt(disc)) / (2 * a);
      if (t2 <= 0 || t1 >= 1) continue;
      const y = EYE.y + (h - EYE.y) * Math.min(t2, 1);   // the sight line falls: its lowest point over the table is where it leaves it
      if (y < TABLE.top) hid++;
    }
    return hid / n;
  }
  // where the robot waits after a station, in sight of the eye: a little toward the middle when the table allows
  function restSpot(from, viewYaw) {
    const r0 = Math.hypot(from.x, from.z), th0 = Math.atan2(from.x, -from.z);
    const cand = [];
    for (const dr of [0.9, 0.6, 0.3]) if (r0 - dr >= MIN_R) cand.push([r0 - dr, th0]);
    cand.push([r0, th0]);
    const ok = (r, th) => {
      const p = new THREE.Vector3(r * Math.sin(th), 0, -r * Math.cos(th));
      if (p.distanceTo(EYE) < 1.7 || r < Math.max(MIN_R, clearR(th)) - 0.05 && r !== r0) return null;
      if (Math.abs(wrap(yawOf(p, EYE) - viewYaw)) > 30 * D2R) return null;
      return hiddenFrac(p) <= 0.35 ? p : null;
    };
    for (const [r, th] of cand) { const p = ok(r, th); if (p) return p; }
    return new THREE.Vector3(from.x, 0, from.z);
  }

  return {
    EYE, quad, S, load, face, apply, step, holdStart, holdEnd, dragStart, dragMove, dragEnd, plan, at, hiddenFrac, restSpot, vfovFor,
    get loaded() { return loaded; },
    dispose() { if (tex) tex.dispose(); },   // the GPU copy only: the picture stays decoded and goes up again on the next visit
  };
}
