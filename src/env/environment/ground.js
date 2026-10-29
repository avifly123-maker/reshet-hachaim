// The island's top surface: the ground uniforms G (soil, grass cover, light spots, fires, canopy gaps, overlay, Blender
// ground textures, soft tree shadows), the ground shader and the ground mesh.
// Exports: createGround(ctx) → { G, ground, groundMesh }.
// Needs from ctx: U, isAmazon, noiseTex, biome, quality, track, root, buildGround (terrain.js).
import * as THREE from 'three';
import { GROUND_TEX } from '../../data/ground-textures.js';
import { R, MAX_SHAFTS, MAX_FIRES, MAX_GAPS, C, patchMaterial } from './common.js';
import { DESERT } from './desert-look.js';

export function createGround(ctx) {
  const { U, isAmazon, isDesert, noiseTex, biome, quality, track, root, buildGround } = ctx;
  const G = {
    ...U,
    uGrass: { value: C(isAmazon ? '#3f6a24' : isDesert ? DESERT.grass : '#7da544') },
    uGrass2: { value: C(isAmazon ? '#6e4a2a' : isDesert ? DESERT.grass2 : '#8f9a48') },
    uCoverAmt: { value: ctx.bare ? 0.22 : 0.85 },   // the training field (1.3.3): mostly bare soil
    uSoilWet: { value: 0 },
    uDetail: { value: noiseTex },
    uSpots: { value: Array.from({ length: MAX_SHAFTS }, () => new THREE.Vector4(0, 0, 1, 0)) },
    uSpotCol: { value: C('#ffd9a0') },
    uFires: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uGaps: { value: Array.from({ length: MAX_GAPS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uOverlay: { value: null }, uOverlayOn: { value: 0 }, uR: { value: R },
    uAmazon: { value: isAmazon ? 1 : 0 },
    uDesert: { value: isDesert ? 1 : 0 }, uBedCol: { value: isDesert ? new THREE.Vector3(...DESERT.bedrock) : new THREE.Vector3(0.62, 0.56, 0.45) },
    // real surface textures baked in Blender: A = litter / grass, B = moss / limestone (albedo + normal map each)
    uGTexA: { value: null }, uGNrmA: { value: null }, uGTexB: { value: null }, uGNrmB: { value: null }, uGTexOn: { value: 0 },
    uGAvgA: { value: C('#808080') }, uGAvgB: { value: C('#808080') }, uGTile: { value: new THREE.Vector2(3, 4) }, uGNrmK: { value: 1 },
    // soft crown shadows painted into a top-down island texture (Blender-baked dappled sprite), see setTreeShadows()
    uTreeSh: { value: null }, uTreeShK: { value: 0 },
  };
  {
    const gt = GROUND_TEX && GROUND_TEX[biome];
    if (gt && gt.a && gt.an && gt.b && gt.bn && quality !== 'min') {
      const ld = new THREE.TextureLoader(); let n = 0;
      const done = () => { if (++n === 4) G.uGTexOn.value = 1; };
      const mk = (url, srgb) => { const t = ld.load(url, done); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = quality === 'high' ? 8 : 4; return track(t); };
      G.uGTexA.value = mk(gt.a, true); G.uGNrmA.value = mk(gt.an, false); G.uGTexB.value = mk(gt.b, true); G.uGNrmB.value = mk(gt.bn, false);
      G.uGAvgA.value.setRGB(...gt.avgA); G.uGAvgB.value.setRGB(...gt.avgB); G.uGTile.value.set(gt.tile[0], gt.tile[1]); G.uGNrmK.value = gt.nk ?? 1;
    }
  }
  const groundMat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), 'ground-' + biome, G, {
    vertexPre: 'attribute vec3 aCover; varying vec3 vCover;',
    vertexBegin: 'vCover = aCover;',
    fragPre: /* glsl */`
      varying vec3 vCover; uniform sampler2D uDetail; uniform vec3 uGrass, uGrass2, uSpotCol; uniform float uCoverAmt, uSoilWet, uOverlayOn, uR, uAmazon, uDesert; uniform vec3 uBedCol;
      uniform vec4 uSpots[${MAX_SHAFTS}]; uniform vec4 uFires[${MAX_FIRES}]; uniform vec4 uGaps[${MAX_GAPS}]; uniform sampler2D uOverlay;
      uniform sampler2D uGTexA, uGNrmA, uGTexB, uGNrmB; uniform float uGTexOn, uGNrmK; uniform vec3 uGAvgA, uGAvgB; uniform vec2 uGTile;
      uniform sampler2D uTreeSh; uniform float uTreeShK;
      float gDet; vec4 gOv; vec3 gNm;
      // anti-tiling: blend the texture with a rotated, larger copy of itself (normals rotated back)
      const mat2 GROT = mat2(0.8, -0.6, 0.6, 0.8);
      vec4 gSamp(sampler2D t, vec2 p){ return mix(texture2D(t, p), texture2D(t, GROT * p * 0.41 + 0.31), 0.38); }
      vec3 gNrm(sampler2D t, vec2 p){
        vec3 a = texture2D(t, p).xyz * 2.0 - 1.0;
        vec3 b = texture2D(t, GROT * p * 0.41 + 0.31).xyz * 2.0 - 1.0; b.xy = b.xy * GROT;
        return normalize(mix(a, b, 0.38));
      }`,
    fragColor: /* glsl */`
      vec4 dn = texture2D(uDetail, vWPos.xz * 0.13);
      vec4 dm = texture2D(uDetail, vWPos.xz * 0.021 + 0.37);
      gDet = dn.r;
      float cov = vCover.x + (dm.g - 0.5) * 0.9 + (dn.g - 0.5) * 0.35;
      cov = smoothstep(0.22, 0.6, cov) * uCoverAmt;
      float gap = 0.0;
      for (int i = 0; i < ${MAX_GAPS}; i++){ vec4 g = uGaps[i]; if (g.w <= 0.0) continue; gap = max(gap, g.w * (1.0 - smoothstep(g.z * 0.6, g.z * 1.2, length(vWPos.xz - g.xy)))); }
      vec4 df = texture2D(uDetail, vWPos.xz * 0.55 + 0.21);   // fine speckle (litter / pebbles / grass blades)
      vec4 tA = vec4(uGAvgA, 1.0), tB = vec4(uGAvgB, 1.0); vec3 nA = vec3(0.0, 0.0, 1.0), nB = vec3(0.0, 0.0, 1.0);
      if (uGTexOn > 0.5) {
        vec2 pa = vWPos.xz / uGTile.x, pb = vWPos.xz / uGTile.y;
        tA = gSamp(uGTexA, pa); tB = gSamp(uGTexB, pb); nA = gNrm(uGNrmA, pa); nB = gNrm(uGNrmB, pb);
      }
      vec3 dA = tA.rgb / max(uGAvgA, vec3(0.02)), dB = tB.rgb / max(uGAvgB, vec3(0.02));   // relative detail around the palette colour
      vec3 soil = diffuseColor.rgb * (0.78 + 0.42 * dn.r) * mix(1.0, 0.72, uSoilWet);
      soil *= 0.86 + 0.28 * df.r;
      float wetBank = vCover.z;
      vec3 gcol;
      if (uAmazon > 0.5) {
        // leaf litter (ochre/brown, speckled) with deep humid moss patches
        float moss = smoothstep(0.48, 0.62, dm.b + vCover.y * 0.25 + gap * 0.3 + wetBank * 0.25);
        vec3 litter = mix(uGrass2, uGrass2 * vec3(1.3, 0.92, 0.62), smoothstep(0.35, 0.7, df.g)) * (0.7 + 0.55 * dn.a);
        litter = mix(litter, litter * vec3(0.55, 0.5, 0.42), smoothstep(0.62, 0.8, df.b));   // dark wet leaves
        vec3 mossC = mix(uGrass * vec3(0.72, 0.9, 0.62), uGrass * vec3(1.1, 1.15, 0.8), dn.g) * (0.8 + 0.3 * df.a);
        if (uGTexOn > 0.5) {
          litter = mix(litter, uGrass2 * dA * (0.8 + 0.35 * dn.a), 0.85);
          mossC = mix(mossC, uGrass * vec3(0.9, 1.0, 0.75) * dB * (0.85 + 0.25 * df.a), 0.8);
          soil *= mix(vec3(1.0), dA, 0.35);
        }
        gcol = mix(litter, mossC, moss);
        gNm = normalize(mix(mix(vec3(0.0, 0.0, 1.0), nA, 0.5), mix(nA, nB, moss), cov));
        // large soft under-canopy darkness blotches
        gcol *= mix(1.0, 0.72, smoothstep(0.45, 0.75, dm.a) * (1.0 - gap));
        soil = mix(soil, soil * vec3(0.55, 0.5, 0.45), wetBank);   // dark wet mud by the river
      } else {
        gcol = mix(uGrass, uGrass2, smoothstep(0.35, 0.75, dm.b + vCover.y * 0.25)) * (0.82 + 0.36 * dn.g);
        gcol *= 0.88 + 0.24 * df.g;   // blade-scale variation
        gcol = mix(gcol, gcol * vec3(1.05, 1.12, 0.85), gap * 0.6);
        gcol = mix(gcol, gcol * vec3(0.8, 1.02, 0.8), wetBank * 0.7);   // lusher by the spring
        if (uGTexOn > 0.5) { gcol *= mix(vec3(1.0), dA, 0.75); soil *= mix(vec3(1.0), dA, 0.3); }
        gNm = normalize(mix(mix(vec3(0.0, 0.0, 1.0), nA, 0.45), nA, cov));
      }
      vec3 col = mix(soil, gcol, cov);
      if (uAmazon < 0.5) {
        // pale limestone bedrock breaking through the terra rossa, with dark cracks
        float bed = smoothstep(0.7, 0.78, dm.a + dn.b * 0.15 - cov * 0.3 + (1.0 - vCover.x) * 0.2);
        vec3 lime = uBedCol * (0.8 + 0.3 * df.r);
        if (uGTexOn > 0.5) lime = uBedCol * dB * (0.9 + 0.2 * df.r);
        lime *= 1.0 - 0.45 * smoothstep(0.03, 0.0, abs(df.b - 0.5)) ;
        col = mix(col, lime, bed * (1.0 - wetBank));
        gNm = normalize(mix(gNm, nB, bed * (1.0 - wetBank)));
      }
      if (uDesert > 0.5) {
        // wind ripples in the sand (fade where plants cover it), and darker gravel in the wadi bed
        float rip = sin(dot(vWPos.xz, vec2(0.83, 0.55)) * 3.4 + dm.r * 7.0 + dn.g * 1.5);
        col *= 1.0 + rip * 0.045 * (1.0 - cov);
      }
      col *= 1.0 + gap * 0.12;
      if (uTreeShK > 0.0) {
        float tsh = texture2D(uTreeSh, clamp((vWPos.xz + uR) / (2.0 * uR), 0.0, 1.0)).a;
        col *= 1.0 - tsh * uTreeShK * (1.0 - gap * 0.5);
      }
      col = vitalGrade(col);
      col *= 1.0 - 0.3 * uWet;
      float sc = scorchAt(vWPos.xz + (dn.rg - 0.5) * 2.0);
      col = mix(col, vec3(0.055, 0.045, 0.04) + 0.05 * dn.r, sc * 0.9);
      gOv = vec4(0.0);
      if (uOverlayOn > 0.5) {
        vec2 ouv = (vWPos.xz + uR) / (2.0 * uR);
        float inside = 1.0 - smoothstep(uR - 1.5, uR + 1.0, length(vWPos.xz));
        vec4 o = texture2D(uOverlay, clamp(ouv, 0.0, 1.0));
        gOv = vec4(o.rgb, o.a * inside * uOverlayOn);
        col = mix(col, o.rgb * 0.9, gOv.a * 0.6);
      }
      diffuseColor.rgb = col;`,
    fragRough: 'roughnessFactor = mix(roughnessFactor, 0.32, max(uWet * 0.85, vCover.z * uAmazon * 0.7));',
    // tilt the shading normal by the baked normal map (ground is near-horizontal: world X/Z are the tangent axes)
    fragNormal: /* glsl */`
      if (uGTexOn > 0.5) {
        vec3 gT = (viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz, gB = (viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz;
        gT = normalize(gT - normal * dot(normal, gT)); gB = normalize(gB - normal * dot(normal, gB));
        normal = normalize(gT * gNm.x * uGNrmK + gB * gNm.y * uGNrmK + normal * gNm.z);
      }`,
    fragEmissive: /* glsl */`
      float spot = 0.0;
      for (int i = 0; i < ${MAX_SHAFTS}; i++){ vec4 s = uSpots[i]; if (s.w <= 0.0) continue; float d = length(vWPos.xz - s.xy) + (gDet - 0.5) * s.z * 0.5; spot += s.w * (1.0 - smoothstep(s.z * 0.3, s.z, d)); }
      totalEmissiveRadiance += diffuseColor.rgb * uSpotCol * min(spot, 1.5);
      for (int i = 0; i < ${MAX_FIRES}; i++){ vec4 f = uFires[i]; if (f.w <= 0.0) continue; float d = length(vWPos.xz - f.xy); float gl = f.w * (1.0 - smoothstep(0.0, f.z * 2.6 + 2.0, d)); float core = f.w * (1.0 - smoothstep(f.z * 0.3, f.z * 0.9, d + (gDet - 0.5) * 1.5));
        totalEmissiveRadiance += vec3(1.0, 0.38, 0.08) * (gl * gl * 0.9) + vec3(1.0, 0.3, 0.05) * core * 1.2 * step(0.55, gDet + 0.2 * sin(uTime * 7.0 + vWPos.x)); }
      totalEmissiveRadiance += gOv.rgb * gOv.a * 0.22;`,
  });
  const ground = buildGround();
  const groundMesh = new THREE.Mesh(ground.geom, groundMat);
  groundMat.userData.G = G;   // debug/inspection handle
  groundMesh.receiveShadow = true; groundMesh.castShadow = true; groundMesh.name = 'ground';
  root.add(groundMesh); track(ground.geom); track(groundMat);
  return { G, ground, groundMesh };
}
