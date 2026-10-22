// The per-frame update: sun and moon position, sky colours and rain greying, lights, lightning flash, fog and haze, the
// sea of mist, wind / wetness / vitality, the grove's seasons (grass, flowers, thistles, pool level), light shafts and
// motes, pollen, mist banks, rain, fire and scorch, canopy gaps, birds, and the sky following the camera.
// Exports: createUpdate(envCtx) → { update, state, gaps, sunDir, night }.
// The shared context is called envCtx here because update(dt, ctx) already uses ctx for the frame's input (time of day,
// rain, wind, season, shafts, fire ...). It reads nearly every part; envCtx.updateTreeShadowStrength (tree-shadows.js) is
// looked up at call time because that part is created after this one.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, damp } from '../../core/util.js';
import { TAU, MAX_SHAFTS, MAX_FIRES, MAX_SCORCH, MAX_GAPS, C, tmpC, tmpC2, V3, bump } from './common.js';
import { SKY_C, samplePalette, sampleYear } from './palettes.js';

export function createUpdate(envCtx) {
  const {
    isAmazon, biome, quality, pipeline, U, skyU, sky, G, sun, sunLight, hemi, fog, farMat, farCrowns,
    mistSeaU, mistSea, mistSea2, waterU, waterMeshes, WL, pools, scatterRefs, shaftU, shaftMesh,
    shaftGeo, shaftData, moteU, moteMesh, heightAt, pollenU, mistU, rainU, rainMesh, boltMesh, boltMat,
    makeBolt, fireU, scorch, flames, smoke, embers, birds
  } = envCtx;
  // ───────────────────────────── state & update
  let flashT = 99;   // lightning flash clock (was declared next to the bolt, weather.js)
  const state = { wet: 0, vital: 1, rain: 0, flash: 0, mistAmt: 0.3, drought: 0, lastQuality: quality };
  const gaps = [];
  const sunDir = V3(0, 1, 0), moonDir = V3(0, -1, 0);
  const tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const Y = V3(0, 1, 0); const _down = V3();
  const night = { v: 0 };
  const cZen = C('#000'), cHor = C('#000'), cGnd = C('#000'), cFog = C('#000');
  const sunWarm = C('#ff8a40'), sunGold = C('#ffc98a'), sunNoon = C('#fff3e0'), moonCol = C('#b6c8ff');
  const greyRain = C('#8a939e');   // a soft grey winter sky, not a gloomy one

  function computeSun(dayFrac) {
    const th = TAU * (dayFrac - 0.25);
    const maxEl = isAmazon ? 1.15 : 1.0;  // noon elevation (rad) ≈ 66° / 57°
    const el = Math.asin(Math.sin(th)) * maxEl / (Math.PI / 2);
    const az = th; // east (+x) → west (−x)
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), -0.42 * Math.cos(el)).normalize();
    // re-normalise keeps y close to sin(el)
    moonDir.set(-sunDir.x * 0.9, -sunDir.y, 0.35).normalize();
    if (moonDir.y < 0.15) moonDir.y = 0.15 + (moonDir.y - 0.15) * 0.3;
    moonDir.normalize();
    return Math.asin(clamp(sunDir.y, -1, 1));
  }

  // constant colours used every frame: parsed once (no per-frame allocations / garbage collection pauses)
  const _ccache = new Map(), _cWhite = new THREE.Color();
  const CC = (h) => { let c = _ccache.get(h); if (!c) { c = new THREE.Color(h); _ccache.set(h, c); } return c; };
  function update(dt, ctx = {}) {
    dt = Math.min(dt || 0.016, 0.1);
    const t = ctx.t !== undefined ? ctx.t : (U.uTime.value + dt);
    U.uTime.value = t;
    const dayFrac = ctx.dayFrac !== undefined ? ctx.dayFrac : 0.5;
    const cam = ctx.camera || pipeline.camera;
    const rain = clamp(ctx.rain || 0), wind = clamp(ctx.wind !== undefined ? ctx.wind : 0.2);
    const vitality = ctx.vitality !== undefined ? clamp(ctx.vitality) : 1;
    const drought = clamp(ctx.drought || 0);

    // sun & sky
    const elev = computeSun(dayFrac);
    sun.direction.copy(sunDir); sun.elevation = elev;
    const e = sunDir.y;
    const pal = SKY_C[biome];
    samplePalette(pal, e, 'zen', cZen); samplePalette(pal, e, 'hor', cHor); samplePalette(pal, e, 'gnd', cGnd); samplePalette(pal, e, 'fog', cFog);
    state.rain = damp(state.rain, rain, 1.5, dt);
    const rn = state.rain;
    if (rn > 0.001) {
      const lum = 0.35 + 0.65 * smoothstep(-0.1, 0.3, e);
      tmpC.copy(greyRain).multiplyScalar(lum);
      cZen.lerp(tmpC, rn * 0.75); cHor.lerp(tmpC, rn * 0.6); cFog.lerp(tmpC, rn * 0.65); cGnd.lerp(tmpC, rn * 0.6);
    }
    night.v = smoothstep(0.02, -0.16, e);
    // sun colour
    const sc = tmpC2;
    if (e < 0.12) sc.copy(sunWarm).lerp(sunGold, smoothstep(-0.02, 0.12, e));
    else sc.copy(sunGold).lerp(sunNoon, smoothstep(0.12, 0.5, e));
    if (!isAmazon) sc.lerp(tmpC.set('#ffe2b0'), 0.35 * smoothstep(0.1, 0.5, e));   // warm clear Mediterranean sun
    else sc.lerp(tmpC.set('#fff0c0'), 0.2 * smoothstep(0.1, 0.5, e));
    U.uSunCol.value.copy(sc);
    skyU.uZen.value.copy(cZen); skyU.uHor.value.copy(cHor); skyU.uGnd.value.copy(cFog);
    skyU.uSunCol.value.copy(sc).multiplyScalar(1 - rn * 0.85);
    skyU.uSunAmt.value = smoothstep(-0.12, 0.02, e) * (1 - rn * 0.8);
    skyU.uMoonDir.value.copy(moonDir);
    skyU.uNight.value = night.v * (1 - rn * 0.9);
    skyU.uCloud.value = clamp((isAmazon ? 0.45 : 0.2) + rn * 0.8);
    skyU.uCloudCol.value.copy(cHor).lerp(CC('#ffffff'), 0.5 * (1 - night.v)).multiplyScalar(lerp(1, 0.55, rn));
    {   // distant landscape lighting: daylight tinted by the sun, dim blue at night, hazier in rain and morning mist
      const day = smoothstep(-0.05, 0.16, e);
      skyU.uPanoTint.value.setRGB(1, 1, 1).lerp(sc, 0.3 * day).multiplyScalar(0.16 + 0.84 * day * (1 - 0.3 * rn)).lerp(CC('#4a5d8e'), 0.5 * night.v);
      skyU.uPanoHazeAdd.value = clamp(rn * 0.55 + (isAmazon ? 0.12 : 0.05) * bump(dayFrac, 0.19, 0.25, 0.32, 0.42) + 0.15 * night.v);
    }

    // lights
    const dayAmt = smoothstep(-0.05, 0.16, e);
    const sunI = (isAmazon ? 3.0 : 3.35) * dayAmt * (1 - 0.6 * rn);
    // moonlight: bright enough to read the plants and animals at the darkest hour, still clearly night (Avi, 19.10)
    const moonI = (isAmazon ? 2.2 : 1.9) * night.v * (1 - 0.5 * rn);
    const useSun = e > -0.04;
    const ld = useSun ? sunDir : moonDir;
    sunLight.position.copy(ld).multiplyScalar(130);
    sunLight.target.position.set(0, 0, 0);
    if (useSun) { sunLight.color.copy(sc); sunLight.intensity = sunI; }
    else { sunLight.color.copy(moonCol); sunLight.intensity = moonI; }
    // hemisphere
    const hemiSky = tmpC.copy(cZen).lerp(cHor, 0.45);
    hemi.color.copy(hemiSky).lerp(CC('#ffffff'), 0.15 * dayAmt);
    hemi.groundColor.set(isAmazon ? '#56622a' : '#a0623e').multiplyScalar(0.25 + 0.75 * dayAmt).lerp(CC('#34436a'), night.v * 0.75);
    if (isAmazon) hemi.color.lerp(CC('#cfe0b0'), 0.18 * dayAmt);   // humid golden-green skylight
    // an overcast sky gives soft light from everywhere: the sky light grows a little as the sun hides (winter rain stays grey, not gloomy)
    hemi.intensity = lerp((1.35 + 0.4 * bump(e, -0.05, 0.02, 0.1, 0.25)) * (isAmazon ? 1.0 : 1.05), isAmazon ? 3.0 : 2.5, night.v) * (1 + 0.22 * rn * dayAmt - 0.1 * rn * night.v);
    // night: a bluish-silver glow in the air, so the island never goes black
    if (night.v > 0) hemi.color.lerp(CC('#8aa4e6'), night.v * 0.85);

    // lightning
    if (ctx.lightning) { flashT = 0; makeBolt(cam); }
    if (flashT < 1.2) {
      flashT += dt;
      const f = Math.exp(-flashT * 7) * (0.7 + 0.3 * Math.sin(flashT * 70)) + (flashT > 0.12 && flashT < 0.5 ? 0.55 * Math.exp(-(flashT - 0.12) * 9) : 0);
      state.flash = clamp(f, 0, 1.2);
      boltMesh.visible = flashT < 0.35; boltMat.opacity = clamp(1 - flashT / 0.35);
    } else { state.flash = 0; boltMesh.visible = false; }
    hemi.intensity += state.flash * 2.4;
    skyU.uFlash.value = state.flash * 0.35;

    // fog
    fog.color.copy(cFog).lerp(CC('#c8d4ff'), state.flash * 0.3);
    const haze = isAmazon ? 1 : 0;
    const morning = bump(dayFrac, 0.19, 0.25, 0.32, 0.42);
    const camDist = Math.max(cam.position.length(), 55);
    const fogNear = lerp(isAmazon ? camDist + 15 : camDist + 60, camDist * 0.45, rn) - morning * haze * camDist * 0.3;
    const fogFar = lerp(isAmazon ? camDist + 420 : camDist + 600, camDist + 160, rn) - morning * haze * 80;
    farMat.userData.haze.value = (isAmazon ? 0.16 : 0.12) + rn * 0.3 + morning * haze * 0.2 + night.v * 0.3;
    if (!isAmazon) farMat.userData.haze.value *= 0.6;   // dry clear Mediterranean air
    if (farCrowns) farCrowns.material.userData.haze.value = farMat.userData.haze.value * 0.85;
    fog.near = fogNear; fog.far = fogFar;
    mistSeaU.uLit.value.copy(cHor).lerp(sc, 0.3 * dayAmt).lerp(CC('#ffffff'), 0.45 * dayAmt).multiplyScalar(lerp(1.08, 0.6, rn));
    mistSeaU.uShade.value.copy(cZen).lerp(cHor, 0.45).multiplyScalar(0.72);
    mistSeaU.uDensity.value = (isAmazon ? 0.4 + morning * 0.18 : 0.3 + morning * 0.15) + rn * 0.4;
    mistSea2.position.y = (isAmazon ? -24 : -22) + Math.sin(t * 0.05) * 0.6;
    { const k = (mistSea.position.y + 4) / Math.max(sunDir.y, 0.15); mistSeaU.uIsland.value.set(sunDir.x * k, sunDir.z * k, 44 * (1 + (1 - Math.max(sunDir.y, 0.15)) * 0.4)); if (sunDir.y < 0) mistSeaU.uIsland.value.z = 0.001; }

    // light level for unlit shaders
    const lightLvl = 0.22 + 0.95 * dayAmt * (1 - 0.4 * rn) + 0.4 * night.v;
    U.uLightCol.value.copy(hemiSky).lerp(sc, 0.4 * dayAmt).multiplyScalar(lightLvl).lerp(_cWhite.setRGB(lightLvl, lightLvl, lightLvl), 0.4);
    U.uSkyCol.value.copy(cHor).lerp(cZen, 0.4).multiplyScalar(0.95);
    waterU.uNight.value = night.v;

    // wind / wet / vitality
    U.uWind.value = damp(U.uWind.value, wind, 1.2, dt);
    state.wet = rn > state.wet ? damp(state.wet, rn, 1.0, dt) : damp(state.wet, rn, 0.04, dt);
    U.uWet.value = state.wet;
    envCtx.updateTreeShadowStrength();   // tree-shadows.js (created after this part)
    state.vital = damp(state.vital, vitality, 1.2, dt);
    U.uVital.value = state.vital;
    state.drought = damp(state.drought, drought, 1.0, dt);

    // seasons (grove)
    if (!isAmazon) {
      const si = ['winter', 'spring', 'summer', 'autumn'].indexOf(ctx.season || 'spring');
      const p = (si < 0 ? 1 : si) + clamp(ctx.seasonFrac || 0);
      const y = sampleYear(p);
      const dr = state.drought;
      const dryC = CC('#c4a160');
      G.uGrass.value.copy(y.grass).lerp(dryC, dr * 0.75);
      G.uGrass2.value.copy(y.dry).lerp(CC('#b08e58'), dr * 0.75);
      G.uCoverAmt.value = y.cover * (1 - dr * 0.25);
      G.uSoilWet.value = Math.max(y.soilWet * (1 - dr), state.wet * 0.8);
      // grass tufts colour & height
      if (scatterRefs.grass) {
        const gm = scatterRefs.grass.material;
        gm.color.copy(G.uGrass.value).multiplyScalar(1.05);
        gm.userData.uniforms.uScale.value = lerp(0.85, 1.1, smoothstep(0.2, 1.3, p) * (1 - smoothstep(2.6, 3.6, p))) * (1 - dr * 0.2);
      }
      const bloomK = (1 - dr * 0.85) * lerp(0.5, 1, state.vital);
      if (scatterRefs.flower) {
        const b = scatterRefs.flower.material.userData.uniforms.uBloom.value;
        b.set(bump(p, 0.35, 0.75, 1.45, 1.85) * bloomK,      // red anemone: mid-winter → early spring
          bump(p, 1.0, 1.25, 1.75, 2.05) * bloomK,          // yellow (chrysanthemum): spring
          bump(p, 0.7, 1.0, 1.6, 1.9) * bloomK,             // white: late winter / spring
          bump(p, 2.65, 2.85, 3.2, 3.45) * (1 - dr * 0.3)); // tall white squill-like: end of summer
      }
      if (scatterRefs.thistle) {
        const tm = scatterRefs.thistle.material;
        const grow = smoothstep(1.1, 1.8, p) * (1 - smoothstep(3.5, 3.95, p));
        tm.userData.uniforms.uScale.value = Math.max(0.0001, grow * (1 + dr * 0.1));
        tm.color.set('#7a9a42').lerp(CC('#c6a76a'), smoothstep(1.7, 2.2, p) + dr);
      }
      if (scatterRefs.bush) scatterRefs.bush.material.color.set('#ffffff').lerp(CC('#d8c8a0'), smoothstep(2.0, 2.8, p) * (1 - smoothstep(3.3, 3.9, p)) * 0.35 + dr * 0.3);
      // pool shrinks a little in summer / drought
      const low = smoothstep(2.0, 2.9, p) * (1 - smoothstep(3.4, 3.95, p)) * 0.18 + dr * 0.22;
      if (waterMeshes[0]) { waterMeshes[0].position.y = WL - low; const s = 1 - low * 0.6; waterMeshes[0].scale.set(s, 1, s); waterMeshes[0].position.x = pools[0].x * (1 - s); waterMeshes[0].position.z = pools[0].z * (1 - s); }
    } else {
      G.uSoilWet.value = 0.35 + state.wet * 0.5;
      G.uCoverAmt.value = 0.85 * (1 - state.drought * 0.3);
    }

    // shafts
    const shafts = ctx.shafts || [];
    const elevFade = smoothstep(0.06, 0.32, e) * (1 - 0.92 * rn);
    shaftU.uGlobal.value = elevFade;
    shaftU.uCol.value.copy(sc).lerp(CC('#fff2d0'), 0.25);
    G.uSpotCol.value.copy(sc).multiplyScalar(0.6 * elevFade);
    let ni = 0;
    const down = _down.copy(sunDir).negate();
    moteU.uDir.value.copy(down);
    for (let i = 0; i < MAX_SHAFTS; i++) {
      const s = shafts[i];
      const spot = G.uSpots.value[i];
      if (!s || elevFade <= 0.001 || !(s.strength > 0)) { spot.w = 0; moteU.uInfo.value[i].set(0, 0, 0, 0); continue; }
      const yTop = s.yTop !== undefined ? s.yTop : 30;
      let gh = heightAt(s.x, s.z);
      let L = 0, lx = s.x, lz = s.z;
      for (let k = 0; k < 3; k++) {
        L = Math.max(1, (yTop - gh) / Math.max(sunDir.y, 0.08));
        L = Math.min(L, 140);
        lx = s.x + down.x * L; lz = s.z + down.z * L; gh = Math.max(heightAt(lx, lz), -1.5);
      }
      const str = clamp(s.strength);
      const rad = Math.max(0.5, s.radius || 2);
      tmpQ.setFromUnitVectors(Y, sunDir);
      const layers = [0.5, 0.9, 1.7];
      for (let l = 0; l < 3; l++) {
        tmpS.set(rad * layers[l], L, rad * layers[l]);
        tmpM.compose(tmpP.set(s.x, yTop, s.z), tmpQ, tmpS);
        shaftMesh.setMatrixAt(ni, tmpM);
        shaftData[ni * 3] = str; shaftData[ni * 3 + 1] = l; shaftData[ni * 3 + 2] = (i * 0.37) % 1;
        ni++;
      }
      spot.set(lx, lz, rad * 1.5 + 0.5, str * 0.9);
      moteU.uTop.value[i].set(s.x, yTop, s.z, rad * 0.9);
      moteU.uInfo.value[i].set(L, str * elevFade, 0, 0);
    }
    shaftMesh.count = ni;
    if (ni > 0) { shaftMesh.instanceMatrix.needsUpdate = true; shaftGeo.attributes.aShaft.needsUpdate = true; }
    shaftMesh.visible = ni > 0; moteMesh.visible = ni > 0;

    // pixel scale for points
    const rnd = pipeline.renderer; const dh = rnd.getContext().drawingBufferHeight;
    U.uPx.value = dh / (2 * Math.tan(THREE.MathUtils.degToRad((cam.fov || 45) / 2)));

    // ambient particles
    pollenU.uDay.value = dayAmt * (1 - rn) * (isAmazon ? 0.8 : 1);
    let nightMotes = 0;
    if (isAmazon) nightMotes = 0.6;
    else { const s = ctx.season || 'spring'; nightMotes = s === 'spring' ? 1 : s === 'summer' ? 0.8 : 0.15; }
    pollenU.uNightA.value = Math.max(night.v, clamp(ctx.nightGlow || 0) * 0.8) * nightMotes * (1 - rn) * (0.5 + 0.5 * state.vital);

    // mist banks
    const mistTarget = isAmazon ? 0.08 + morning * 0.75 + rn * 0.5 + night.v * 0.25 : 0.05 + morning * (ctx.season === 'winter' ? 0.5 : 0.15) + rn * 0.4;
    state.mistAmt = damp(state.mistAmt, mistTarget, 0.5, dt);
    mistU.uAmt.value = state.mistAmt;
    mistU.uCol.value.copy(cHor).lerp(CC('#ffffff'), 0.35 * dayAmt).lerp(sc, 0.2 * dayAmt).multiplyScalar(0.55 + 0.5 * dayAmt).lerp(CC('#7088c0'), 0.4 * night.v);   // moonlit mist

    // rain
    rainU.uAmt.value = rn; rainMesh.visible = rn > 0.01;
    rainU.uCol.value.copy(U.uLightCol.value).multiplyScalar(1.1).lerp(CC('#ffffff'), state.flash);

    // fire & scorch
    const fires = ctx.fire || [];
    let anyFire = false;
    for (let i = 0; i < MAX_FIRES; i++) {
      const f = fires[i];
      if (f && f.intensity > 0) {
        anyFire = true;
        const r = f.r || 3;
        fireU.uFireA.value[i].set(f.x, heightAt(f.x, f.z), f.z, r);
        fireU.uFireB.value[i].set(clamp(f.intensity), 0, 0, 0);
        G.uFires.value[i].set(f.x, f.z, r, clamp(f.intensity));
        let sp = scorch.find(s => Math.hypot(s.x - f.x, s.z - f.z) < Math.max(s.r, r) * 0.6);
        if (!sp) {
          if (scorch.length >= MAX_SCORCH) { scorch.sort((a, b) => a.a - b.a); scorch.shift(); }
          sp = { x: f.x, z: f.z, r, a: 0 }; scorch.push(sp);
        }
        sp.r = Math.max(sp.r, r * 1.1); sp.a = Math.min(1, sp.a + dt * 0.25 * f.intensity); sp.hot = true;
      } else {
        fireU.uFireB.value[i].set(0, 0, 0, 0); G.uFires.value[i].set(0, 0, 0, 0);
      }
    }
    for (let i = scorch.length - 1; i >= 0; i--) { const s = scorch[i]; if (!s.hot) s.a -= dt / 360; s.hot = false; if (s.a <= 0) scorch.splice(i, 1); }
    for (let i = 0; i < MAX_SCORCH; i++) { const s = scorch[i]; if (s) U.uScorch.value[i].set(s.x, s.z, s.r, s.a); else U.uScorch.value[i].set(0, 0, 0, 0); }
    flames.visible = smoke.visible = embers.visible = anyFire;

    // gaps
    for (let i = 0; i < MAX_GAPS; i++) { const g = gaps[i]; if (g) G.uGaps.value[i].set(g.x, g.z, g.r, g.a); else G.uGaps.value[i].set(0, 0, 0, 0); }

    // birds by vitality (day only)
    birds.material.uniforms.uCount.value = Math.round(lerp(0, 10, state.vital) * dayAmt * (1 - rn));

    // sky follows camera
    sky.position.copy(cam.position);
  }
  return { update, state, gaps, sunDir, night };
}
