// Camera: kid-friendly orbit controls + smooth "layer" views (from the sky down to the forest floor) + follow mode.
// Gentle input: slow rotate/zoom with damping, zoom toward the cursor, distance & tilt limits (never under the island),
// target kept on the island, camera kept above the ground. Extra inputs: on-screen pad (see ui/camera-pad.js) via
// rig.nudge / rig.hold, keyboard (arrows, + / −, Home), double-click on the ground = fly there, slow idle auto-orbit.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clamp } from '../core/util.js';

const MIN_D = 6, MAX_D = 140, MIN_POLAR = 0.18, FAR_POLAR = 1.36;
const DAMP = 0.075;   // OrbitControls damping per 60 Hz frame (rescaled by dt in update)
const IDLE_ORBIT_AFTER = 25, IDLE_ORBIT_SPEED = 0.035;   // seconds, rad/s
// step sizes (one click) and hold speeds (per second) for the pad / keyboard
const STEP = { rot: 0.5, tilt: 0.2, zoom: 0.25 }, RATE = { rot: 1.1, tilt: 0.65, zoom: 0.9 };

export function createCameraRig(camera, dom, env) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true; controls.dampingFactor = DAMP;
  controls.minDistance = MIN_D; controls.maxDistance = MAX_D;
  controls.minPolarAngle = MIN_POLAR; controls.maxPolarAngle = 1.42;
  controls.rotateSpeed = 0.42; controls.zoomSpeed = 0.55; controls.panSpeed = 0.5;
  controls.screenSpacePanning = false;
  if ('zoomToCursor' in controls) controls.zoomToCursor = true;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const R = env.radius || 38;
  let anim = null, follow = null, layer = 'all', layerPolar = 1.42, minD = MIN_D, maxD = MAX_D;
  const _off = new THREE.Vector3(), _fp = new THREE.Vector3(), _sph = new THREE.Spherical();
  // pad / keyboard motion: pulses (one step, eased out) + holds (continuous, eased in)
  const pulse = { rot: 0, tilt: 0, zoom: 0 }, holdDir = { rot: 0, tilt: 0, zoom: 0 }, holdV = { rot: 0, tilt: 0, zoom: 0 };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let lastInput = now(), orbitV = 0;   // idle time uses the wall clock (frame dt is capped on slow machines)

  const VIEWS = {
    all: { target: [0, -3, 0], dist: 104, elev: 0.62, polar: 1.42 },
    emergent: { target: [0, 30, 0], dist: 62, elev: 0.28, polar: 1.5 },
    canopy: { target: [0, 20, 0], dist: 50, elev: 0.16, polar: 1.6 },
    understory: { target: [0, 6, 0], dist: 30, elev: 0.06, polar: 1.75 },
    floor: { target: [0, 4.5, 0], dist: 20, elev: -0.12, polar: 1.95 },
    shrub: { target: [0, 3, 0], dist: 26, elev: 0.12, polar: 1.7 },
    water: { target: [0, 1, 0], dist: 30, elev: 0.3, polar: 1.6 },
  };
  const overviewDist = () => VIEWS.all.dist * (api.distScale || 1);

  function goTo(target, pos, dur = 1.6) {
    anim = { t: 0, dur, t0: controls.target.clone(), p0: camera.position.clone(), t1: target.clone(), p1: pos.clone() };
    lastInput = now(); orbitV = 0;
    for (const k in pulse) { pulse[k] = 0; holdV[k] = 0; }   // a flight cancels pending pad steps
  }
  function setLayer(id, yRange, opts = {}) {
    layer = id; follow = null;
    const v = { ...(VIEWS[id] || VIEWS.all) };
    if (yRange && id !== 'all') { const mid = (yRange[0] + yRange[1]) / 2; v.target = [0, Math.max(2.5, mid), 0]; }
    if (id === 'water' && env.water) {
      const p = env.water.path?.[Math.floor((env.water.path.length || 1) / 2)] || env.water.pools?.[0] || { x: 0, z: 0 };
      v.target = [p.x, (env.waterLevel ?? 0) + 1, p.z];
    }
    layerPolar = v.polar;
    let az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
    if (opts.target) v.target = [opts.target.x, v.target[1], opts.target.z];
    const t = new THREE.Vector3(...v.target);
    if (id === 'all') v.dist *= api.distScale;
    const horiz = Math.cos(v.elev) * v.dist, vert = Math.sin(v.elev) * v.dist;
    const at = (a) => new THREE.Vector3(t.x + Math.sin(a) * horiz, t.y + vert, t.z + Math.cos(a) * horiz);
    let p = at(az);
    if (opts.blocked) {   // look for a free spot (not inside a trunk / water / off the island)
      for (let k = 0; k < 24 && opts.blocked(p.x, p.z); k++) { az += (k % 2 ? 1 : -1) * (k + 1) * 0.26; p = at(az); }
    }
    if (opts.camAt) p = new THREE.Vector3(opts.camAt.x, env.heightAt(opts.camAt.x, opts.camAt.z) + 1.7, opts.camAt.z);
    if (id === 'floor' || id === 'understory') p.y = Math.max(p.y, env.heightAt(p.x, p.z) + 1.8);
    if (opts.camAt) t.y = env.heightAt(t.x, t.z) + 4.5;
    goTo(t, p, 1.8);
  }
  function reset() { setLayer('all'); }
  function followEntity(e, dist) {
    follow = e;
    if (dist) {   // fly in close first, then keep following
      e.focusPoint(_fp);
      const dir = _off.subVectors(camera.position, controls.target).normalize();
      if (dir.y < 0.25) { dir.y = 0.35; dir.normalize(); }
      const p = _fp.clone().addScaledVector(dir, dist);
      p.y = Math.max(p.y, env.heightAt(p.x, p.z) + 1.5);
      goTo(_fp.clone(), p, 1.2);
    }
  }
  function focusOn(point, dist = 16) {
    follow = null;
    const dir = _off.subVectors(camera.position, controls.target).normalize();
    const p = point.clone().addScaledVector(dir, dist);
    p.y = Math.max(p.y, env.heightAt(p.x, p.z) + 2);
    goTo(point.clone(), p, 1.2);
  }

  // ── user input bookkeeping
  function poke() { lastInput = now(); orbitV = 0; }
  function grab() { poke(); anim = null; }
  /** one smooth step: kind 'rot' (+1 = island turns left) | 'tilt' (+1 = from above) | 'zoom' (+1 = closer) */
  function nudge(kind, dir) { if (!(kind in pulse)) return; grab(); pulse[kind] += dir * STEP[kind]; }
  /** continuous motion while held; dir 0 releases */
  function hold(kind, dir) { if (!(kind in holdDir)) return; if (dir) grab(); else poke(); holdDir[kind] = dir || 0; }
  function releaseAll() { for (const k in holdDir) holdDir[k] = 0; }

  // max tilt depends on distance: close-up layer views may look up from the floor, far views never dip below the rim
  function polarLimit(dist) {
    const far = Math.min(layerPolar, FAR_POLAR);
    const u = clamp((dist - 26) / 34);
    return layerPolar + (far - layerPolar) * u;
  }
  function keepAboveGround() {
    const p = camera.position, r = Math.hypot(p.x, p.z);
    const gh = r < R + 4 ? Math.max(env.heightAt(p.x, p.z), r > R - 2 ? 0 : -50) : 0;
    const minY = gh + (r < R + 4 ? 1.3 : 2);
    if (p.y < minY) p.y = minY;
  }

  // ── driver: an immersive view (field camera, animal-eye tour) takes over the camera completely.
  // setDriver(fn) saves the orbit view and disables the orbit controls; fn(dt) then places the camera every frame.
  // setDriver(null) gives the camera back exactly where the player left it.
  let driver = null, saved = null;
  function setDriver(fn) {
    if (fn && !driver) saved = { p: camera.position.clone(), t: controls.target.clone(), fov: camera.fov, near: camera.near, follow };
    driver = fn || null;
    controls.enabled = !driver;
    releaseAll(); for (const k in pulse) { pulse[k] = 0; holdV[k] = 0; }
    anim = null; poke();
    if (!driver && saved) {
      camera.position.copy(saved.p); controls.target.copy(saved.t); camera.up.set(0, 1, 0);
      camera.fov = saved.fov; camera.near = saved.near; camera.updateProjectionMatrix();
      follow = saved.follow && saved.follow.alive && !saved.follow.removed ? saved.follow : null;
      camera.lookAt(controls.target); saved = null;
    }
  }

  function update(dt) {
    if (driver) { driver(Math.min(dt || 0, 0.1)); return; }
    // frame-rate independent damping: 0.075 per 1/60 s, so a release glides the same wall-clock time at 60 or 6 fps
    // (uses the raw dt, clamped to 0.25 s, so the 0.1 s cap below doesn't stretch the glide on very slow PCs)
    const dDt = clamp(dt || 0, 1 / 240, 0.25);
    controls.dampingFactor = clamp(1 - Math.pow(1 - DAMP, dDt * 60), 0.02, 0.9);
    dt = Math.min(dt || 0, 0.1);
    if (anim) {
      anim.t += dt; const u = clamp(anim.t / anim.dur); const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      if (follow && follow.alive) { follow.focusPoint(_fp); anim.t1.copy(_fp); }
      controls.target.lerpVectors(anim.t0, anim.t1, e); camera.position.lerpVectors(anim.p0, anim.p1, e);
      controls.minDistance = 0.5; controls.maxDistance = 1e4; controls.maxPolarAngle = Math.PI - 0.05;
      if (u >= 1) {
        anim = null;
        const d = camera.position.distanceTo(controls.target);
        minD = Math.min(MIN_D, d); maxD = Math.max(MAX_D, overviewDist() * 1.08, d);
      }
    } else if (follow) {
      if (!follow.alive || follow.removed) follow = null;
      else {
        follow.focusPoint(_fp);
        const d = _off.subVectors(_fp, controls.target);
        controls.target.add(d.multiplyScalar(Math.min(1, dt * 3)));
        camera.position.add(d);
      }
    }

    if (!anim) {
      // pad / keyboard / idle orbit, applied in spherical coordinates around the target
      let dRot = 0, dTilt = 0, dZoom = 0;
      for (const k of ['rot', 'tilt', 'zoom']) {
        const take = pulse[k] * Math.min(1, dt * 7); pulse[k] -= take;
        if (Math.abs(pulse[k]) < 1e-4) pulse[k] = 0;
        holdV[k] += (holdDir[k] * RATE[k] - holdV[k]) * Math.min(1, dt * (holdDir[k] ? 5 : 9));
        if (Math.abs(holdV[k]) < 1e-4) holdV[k] = 0;
        const v = take + holdV[k] * dt;
        if (k === 'rot') dRot = v; else if (k === 'tilt') dTilt = v; else dZoom = v;
      }
      if (now() - lastInput > IDLE_ORBIT_AFTER * 1000 && layer === 'all' && !follow && camera.position.distanceTo(controls.target) > overviewDist() * 0.6) orbitV += (IDLE_ORBIT_SPEED - orbitV) * Math.min(1, dt * 0.4);
      else orbitV = 0;
      dRot += orbitV * dt;
      if (dRot || dTilt || dZoom) {
        _off.subVectors(camera.position, controls.target); _sph.setFromVector3(_off);
        _sph.theta += dRot;
        _sph.radius = clamp(_sph.radius * Math.exp(-dZoom), minD, maxD);
        _sph.phi = clamp(_sph.phi - dTilt, MIN_POLAR, polarLimit(_sph.radius));
        _off.setFromSpherical(_sph); camera.position.copy(controls.target).add(_off);
      }
      const d = camera.position.distanceTo(controls.target);
      if (d >= MIN_D) minD = MIN_D;
      if (d <= Math.max(MAX_D, overviewDist() * 1.08)) maxD = Math.max(MAX_D, overviewDist() * 1.08);
      controls.minDistance = minD; controls.maxDistance = maxD;
      controls.maxPolarAngle = Math.max(MIN_POLAR + 0.05, polarLimit(d));
    }

    controls.update();
    // keep target on the island & camera above ground
    const tgt = controls.target;
    const r = Math.hypot(tgt.x, tgt.z), rMax = R + 4; if (r > rMax) { tgt.x *= rMax / r; tgt.z *= rMax / r; }
    tgt.y = clamp(tgt.y, -3, 42);
    keepAboveGround();
  }
  // stop animations / idle orbit when the user grabs the camera
  controls.addEventListener('start', grab);

  // ── keyboard: arrows rotate / tilt, + / − zoom, Home = whole island
  const KEYS = { ArrowLeft: ['rot', 1], ArrowRight: ['rot', -1], ArrowUp: ['tilt', 1], ArrowDown: ['tilt', -1], '+': ['zoom', 1], '=': ['zoom', 1], '-': ['zoom', -1], '_': ['zoom', -1], NumpadAdd: ['zoom', 1], NumpadSubtract: ['zoom', -1] };
  const keyTimers = new Map();
  const typing = (t) => t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable);
  const keyOf = (e) => KEYS[e.code] ? e.code : e.key;
  function onKeyDown(e) {
    poke();
    if (driver || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;   // an immersive view handles its own keys
    if (e.key === 'Home') { e.preventDefault(); releaseAll(); reset(); return; }
    const k = keyOf(e), m = KEYS[k]; if (!m) return;
    e.preventDefault();
    if (e.repeat || keyTimers.has(k)) return;
    nudge(m[0], m[1]);
    keyTimers.set(k, setTimeout(() => { if (keyTimers.has(k)) hold(m[0], m[1]); }, 260));
  }
  function onKeyUp(e) {
    const k = keyOf(e), m = KEYS[k]; if (!m || !keyTimers.has(k)) return;
    clearTimeout(keyTimers.get(k)); keyTimers.delete(k);
    if (holdDir[m[0]] === m[1]) hold(m[0], 0);
  }
  function onBlur() { for (const t of keyTimers.values()) clearTimeout(t); keyTimers.clear(); releaseAll(); }
  // any interaction anywhere stops the idle orbit
  const onAny = () => poke();
  // double-click on the ground: fly over and look at that spot
  const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
  function onDblClick(e) {
    if (driver) return;
    const meshes = env.groundMeshes || []; if (!meshes.length) return;
    const rect = dom.getBoundingClientRect();
    _ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    const hit = _ray.intersectObjects(meshes, false)[0]; if (!hit) return;
    const cur = camera.position.distanceTo(controls.target);
    focusOn(new THREE.Vector3(hit.point.x, hit.point.y + 2, hit.point.z), clamp(cur * 0.6, 16, 45));
  }
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur);
  window.addEventListener('pointerdown', onAny, true); window.addEventListener('wheel', onAny, { capture: true, passive: true });
  dom.addEventListener('dblclick', onDblClick);
  const baseDispose = controls.dispose.bind(controls);
  controls.dispose = () => {
    onBlur();
    window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur);
    window.removeEventListener('pointerdown', onAny, true); window.removeEventListener('wheel', onAny, { capture: true });
    dom.removeEventListener('dblclick', onDblClick);
    baseDispose();
  };

  const api = {
    controls, update, setLayer, reset, followEntity, focusOn, goTo, distScale: 1,
    get layer() { return layer; }, get following() { return follow; }, stopFollow() { follow = null; },
    nudge, hold, releaseAll, poke, setDriver,
    get driven() { return !!driver; },
    get idleOrbiting() { return orbitV > 0; },
  };
  return api;
}
