// The packed geometry of tools/build-lab.py (רובו־דע and the lab's depth proxies): quantised positions (Int16 with an
// origin `o` and a step `s` per axis), Int8 normals, Uint16 uvs and indices, all base64. One decoder for every screen
// that shows him (the lab, the stage films, the island robot; 1.4.4 stability set: it was written three times).
// The caller owns the geometry it gets and frees it with its own scene.
import * as THREE from 'three';

export const b64bytes = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

export function decodePart(e) {
  const g = new THREE.BufferGeometry();
  const q = new Int16Array(b64bytes(e.p).buffer); const n = q.length / 3; const P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[3 * i + k] = e.o[k] + (q[3 * i + k] + 32767) * e.s[k];
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  if (e.n) { const nn = new Int8Array(b64bytes(e.n).buffer); const N = new Float32Array(nn.length); for (let i = 0; i < nn.length; i++) N[i] = nn[i] / 127; g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); }
  if (e.uv) { const uu = new Uint16Array(b64bytes(e.uv).buffer); const U = new Float32Array(uu.length); for (let i = 0; i < uu.length; i++) U[i] = uu[i] / 65535; g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); }
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(b64bytes(e.i).buffer), 1));
  if (!e.n) g.computeVertexNormals();
  return g;
}
