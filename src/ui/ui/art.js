// Drawings in SVG made from code: the web-of-life emblem (loading screen), the painted biome picture (biomeArt, not
// used at the moment), the day dial's sky colours and the names of the parts of the day (HUD), and the start screen's
// canopy, wax seal and vine flourish.
// Exports: emblem, biomeArt, skyColor, partOfDay, leafPath, canopySVG, waxSeal, VINE.
import { esc, hashStr, mix, rngOf } from './helpers.js';

/* web-of-life emblem: seven nodes woven together around a leaf */
export function emblem(size = 120, cls = 'emblem') {
  const n = 7, R = 42, pts = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; pts.push([60 + R * Math.cos(a), 60 + R * Math.sin(a)]); }
  let lines = '';
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 3) % n], [x3, y3] = pts[(i + 1) % n];
    lines += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q60 60 ${x2.toFixed(1)} ${y2.toFixed(1)}" class="em-w"/>`;
    lines += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(60 + (x1 + x3 - 120) * 0.62).toFixed(1)} ${(60 + (y1 + y3 - 120) * 0.62).toFixed(1)} ${x3.toFixed(1)} ${y3.toFixed(1)}" class="em-r"/>`;
  }
  const cols = ['#9fd36f', '#f0b44c', '#7cc4b4', '#e98bc4', '#9fd36f', '#f0d055', '#d29a5c'];
  const nodes = pts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="${cols[i]}" class="em-n"/>`).join('');
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="54" class="em-ring"/>${lines}
    <path d="M60 76c-9-4-12-12-9-22 4-9 11-12 18-13-1 9-2 17-6 24-1 4-2 7-3 11z" fill="#8fd067"/>
    <path d="M60 76c1-9 3-17 8-25" stroke="#2f5a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>${nodes}</svg>`;
}

/* painted biome illustration (layered silhouettes from palette) */
export function biomeArt(b) {
  const pal = b.palette && b.palette.length ? b.palette : ['#1d4a2c', '#4f8f3e', '#f2c14e'];
  const [c1, c2, c3] = [pal[0], pal[1] || pal[0], pal[2] || '#f2c14e'];
  const rnd = rngOf(hashStr(b.id || 'x'));
  const W = 400, H = 230;
  const sky1 = mix(c3, '#fff8e6', 0.45), sky2 = mix(c2, '#dff0e0', 0.62);
  const ridge = (y0, amp, step, col, op = 1) => {
    let d = `M0 ${H} L0 ${y0}`; let x = 0;
    while (x < W) { const nx = Math.min(W, x + step * (0.7 + rnd() * 0.6)); const cy = y0 - amp * (0.4 + rnd()); d += ` Q${((x + nx) / 2).toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${(y0 + (rnd() - 0.5) * amp * 0.3).toFixed(1)}`; x = nx; }
    return `<path d="${d} L${W} ${H} Z" fill="${col}" opacity="${op}"/>`;
  };
  const crown = (x, y, r, col, k = 5) => { let s = ''; for (let i = 0; i < k; i++) s += `<circle cx="${(x + (rnd() - 0.5) * r * 1.6).toFixed(1)}" cy="${(y + (rnd() - 0.5) * r * 0.7).toFixed(1)}" r="${(r * (0.55 + rnd() * 0.4)).toFixed(1)}" fill="${col}"/>`; return s; };
  const umbrella = (x, base, top, w, col) => `<path d="M${x} ${base} L${x - 1.5} ${top + 4} L${x + 1.5} ${top + 4} Z" fill="${col}"/><path d="M${x - 2} ${top + 10} q-8 -6 -14 -8 M${x + 2} ${top + 12} q8 -6 14 -9" stroke="${col}" stroke-width="2" fill="none"/>` +
    `<ellipse cx="${x}" cy="${top}" rx="${w}" ry="${w * 0.28}" fill="${col}"/>` + crown(x, top - 4, w * 0.45, col, 4);
  const palm = (x, base, hgt, col) => {
    let s = `<path d="M${x} ${base} Q${x + 6} ${base - hgt / 2} ${x + 2} ${base - hgt}" stroke="${col}" stroke-width="3.2" fill="none"/>`;
    const tx = x + 2, ty = base - hgt;
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; const L = 20 + rnd() * 8; const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.5 + 8; s += `<path d="M${tx} ${ty} Q${((tx + ex) / 2).toFixed(1)} ${(ty - 8).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${col}" stroke-width="3" fill="none"/>`; }
    return s;
  };
  let art = `<defs><linearGradient id="sk-${esc(b.id)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>
    <radialGradient id="sg-${esc(b.id)}"><stop offset="0" stop-color="${c3}" stop-opacity=".85"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sk-${esc(b.id)})"/>
    <circle cx="300" cy="62" r="70" fill="url(#sg-${esc(b.id)})"/><circle cx="300" cy="62" r="22" fill="${mix(c3, '#fff', 0.35)}"/>`;
  const far = mix(c2, sky2, 0.55), mid = mix(c2, sky2, 0.22), near = c1;
  const birds = () => { let s = ''; for (let i = 0; i < 3; i++) { const x = 60 + rnd() * 160, y = 40 + rnd() * 40, w = 5 + rnd() * 3; s += `<path d="M${x - w} ${y} q${w / 2} -${w / 2} ${w} 0 q${w / 2} -${w / 2} ${w} 0" stroke="${mix(c1, sky1, 0.3)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; } return s; };
  if (/grove|חורש|med/i.test(b.id)) {
    art += `<g class="ba-far">${ridge(150, 40, 110, far)}</g>`;
    let trees = '';
    for (let i = 0; i < 9; i++) { const x = 15 + i * 46 + rnd() * 20; trees += crown(x, 150 + rnd() * 10, 13 + rnd() * 6, mid, 6); }
    trees += `<path d="M320 175 L321 110" stroke="${mid}" stroke-width="3"/>` + crown(318, 104, 16, mid, 5) + crown(334, 96, 12, mid, 4);
    art += `<g class="ba-mid">${ridge(168, 22, 90, mid)}${trees}</g>`;
    let rocks = '';
    for (let i = 0; i < 4; i++) { const x = 40 + rnd() * 320, y = 196 + rnd() * 14; rocks += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(10 + rnd() * 12).toFixed(0)}" ry="${(5 + rnd() * 4).toFixed(0)}" fill="${mix('#e9dfc6', c2, 0.25)}"/>`; }
    let flowers = '';
    for (let i = 0; i < 26; i++) flowers += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(204 + rnd() * 24).toFixed(0)}" r="${(1.6 + rnd() * 1.6).toFixed(1)}" fill="${i % 3 ? '#e4473b' : '#f6e9f0'}"/>`;
    art += `<g class="ba-near">${ridge(198, 14, 70, near)}${rocks}${crown(40, 196, 20, near, 7)}${crown(372, 190, 24, near, 7)}${flowers}</g>` + birds();
  } else if (/reef/.test(b.id)) {
    // the reef: a band of sea surface, the blue water below with light rays, coral heads and a few fish
    art += `<rect y="96" width="${W}" height="${H - 96}" fill="${mix('#1f86b0', c1, 0.25)}"/><rect y="96" width="${W}" height="10" fill="#bfeaf5" opacity=".7"/>`;
    for (let i = 0; i < 5; i++) { const x = 30 + i * 85 + rnd() * 20; art += `<path d="M${x} 106 L${x + 26} 106 L${x + 60} ${H} L${x + 10} ${H} Z" fill="#e8fbff" opacity=".12"/>`; }
    let reef = '';
    for (let i = 0; i < 7; i++) { const x = 20 + i * 60 + rnd() * 20, y = 200 + rnd() * 16, r = 16 + rnd() * 14; reef += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.7).toFixed(0)}" fill="${['#e8a0b4', '#c9b46a', '#9fc27a', '#c7a3d9'][i % 4]}"/>`; }
    for (let i = 0; i < 4; i++) { const x = 50 + rnd() * 300; reef += `<path d="M${x} 214 l0 -28 m0 10 l-10 -14 m10 6 l12 -16" stroke="#d9603a" stroke-width="3" fill="none" stroke-linecap="round"/>`; }
    let fish = '';
    for (let i = 0; i < 6; i++) { const x = 40 + rnd() * 320, y = 130 + rnd() * 60, sz = 6 + rnd() * 5; fish += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><ellipse rx="${sz.toFixed(1)}" ry="${(sz * 0.55).toFixed(1)}" fill="${i % 2 ? '#f08a24' : '#f2d04a'}"/><path d="M${sz.toFixed(1)} 0 l${(sz * 0.7).toFixed(1)} -${(sz * 0.5).toFixed(1)} l0 ${sz.toFixed(1)} z" fill="${i % 2 ? '#f08a24' : '#f2d04a'}"/></g>`; }
    art += `<path d="M0 ${H} L0 212 C80 204 160 214 240 208 S360 204 400 210 L400 ${H} Z" fill="#efe2bf"/>` + `<g class="ba-near">${reef}</g>` + `<g class="ba-mid">${fish}</g>`;
  } else {
    art += `<g class="ba-far">${ridge(140, 26, 60, far)}${umbrella(90, 150, 64, 34, far)}${umbrella(250, 150, 52, 40, far)}</g>`;
    let canopy = ''; for (let i = 0; i < 12; i++) canopy += crown(i * 36 + rnd() * 10, 150 + rnd() * 14, 18 + rnd() * 6, mid, 5);
    art += `<g class="ba-mid">${ridge(160, 18, 50, mid)}${canopy}${umbrella(175, 170, 82, 36, mid)}</g>`;
    art += `<path d="M150 ${H} C190 214 230 212 270 200 S360 192 400 196 L400 206 C350 204 300 214 260 222 S200 ${H} 190 ${H} Z" fill="${mix('#cfeaf2', c2, 0.25)}" opacity=".85"/>`;
    art += `<g class="ba-near">${ridge(206, 10, 50, near)}${palm(28, 220, 92, near)}${palm(368, 226, 104, near)}${crown(70, 214, 18, near, 6)}${crown(330, 214, 16, near, 6)}</g>` + birds();
  }
  return `<svg class="biome-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${art}</svg>`;
}

/* day-dial colours */
export function skyColor(f) {
  const e = -Math.cos(f * Math.PI * 2); // 1 noon, -1 midnight
  const dawn = f < 0.5 ? '#f49a5e' : '#e9796b';
  if (e > 0.25) return mix(dawn, '#86c6ee', Math.min(1, (e - 0.25) / 0.35));
  if (e > -0.15) return mix('#1c2b58', dawn, (e + 0.15) / 0.4);
  return mix('#0c1530', '#1c2b58', Math.max(0, (e + 1) / 0.85));
}
export function partOfDay(f) {
  if (f < 0.2 || f >= 0.83) return 'לילה';
  if (f < 0.3) return 'זריחה';
  if (f < 0.44) return 'בוקר';
  if (f < 0.58) return 'צהריים';
  if (f < 0.7) return 'אחר הצהריים';
  return 'שקיעה';
}

/* layered canopy silhouettes for the start screen (top: hanging leaves and vines, bottom: ferns) */
export function leafPath(x, y, L, w, rot) {
  return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})" d="M0 0C${w} ${(-L * 0.3).toFixed(1)} ${(w * 0.6).toFixed(1)} ${(-L * 0.8).toFixed(1)} 0 ${-L}C${(-w * 0.6).toFixed(1)} ${(-L * 0.8).toFixed(1)} ${-w} ${(-L * 0.3).toFixed(1)} 0 0Z"/>`;
}
export function canopySVG(where) {
  const r = rngOf(where === 'top' ? 77 : 1234), W = 1600;
  if (where === 'top') {
    const H = 260; let far = `M0 0H${W}V60`;
    for (let x = W; x > 0; x -= 70 + r() * 60) far += ` Q${(x - 40).toFixed(0)} ${(120 + r() * 90).toFixed(0)} ${(x - 90).toFixed(0)} ${(60 + r() * 40).toFixed(0)}`;
    far += ' V0Z';
    let mid = '', near = '', vines = '';
    for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * 70; mid += leafPath(x, y, 60 + r() * 50, 16 + r() * 12, 150 + r() * 60); }
    for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * 34; near += leafPath(x, y, 40 + r() * 46, 12 + r() * 10, 140 + r() * 80); }
    for (let i = 0; i < 9; i++) {
      const x = 60 + r() * (W - 120), len = 120 + r() * 110, sway = (r() - 0.5) * 40;
      vines += `<path d="M${x.toFixed(0)} 0Q${(x + sway).toFixed(0)} ${(len / 2).toFixed(0)} ${(x - sway / 2).toFixed(0)} ${len.toFixed(0)}" fill="none" stroke="currentColor" stroke-width="2.4"/>`;
      for (let k = 1; k < 6; k++) { const t = k / 6, vx = x + sway * Math.sin(t * Math.PI) * 0.6, vy = len * t; vines += leafPath(vx, vy, 12 + r() * 8, 5, k % 2 ? 230 : 130); }
    }
    return `<svg class="st-canopy top" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <path class="cf" d="${far}"/><g class="cm">${mid}</g><g class="cn">${near}</g><g class="cv">${vines}</g></svg>`;
  }
  const H = 220; let mound = `M0 ${H}V150`;
  for (let x = 0; x < W; x += 90 + r() * 80) mound += ` Q${(x + 50).toFixed(0)} ${(110 + r() * 40).toFixed(0)} ${(x + 110).toFixed(0)} ${(145 + r() * 20).toFixed(0)}`;
  mound += ` V${H}Z`;
  let ferns = '';
  for (let i = 0; i < 26; i++) {
    const x = r() * W, h = 70 + r() * 110, lean = (r() - 0.5) * 90;
    const ex = x + lean, ey = H - h;
    ferns += `<path d="M${x.toFixed(0)} ${H}Q${(x + lean * 0.2).toFixed(0)} ${(H - h * 0.6).toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}" fill="none" stroke="currentColor" stroke-width="2.2"/>`;
    for (let k = 1; k < 9; k++) {
      const t = k / 9, px = x + lean * (0.2 * 2 * t * (1 - t) + t * t), py = H - h * (2 * t * (1 - t) * 0.6 + t * t), L = (1 - t * 0.8) * (14 + h * 0.08);
      ferns += leafPath(px, py, L, L * 0.28, -70 + lean * 0.1) + leafPath(px, py, L, L * 0.28, 70 + lean * 0.1);
    }
  }
  // a few small flowers in the undergrowth – soft rose, sun and lavender, never bright
  const FL = ['#d98fa0', '#e8c65e', '#a99ad2', '#e8a37a'];
  let flowers = '';
  for (let i = 0; i < 22; i++) {
    const x = r() * W, y = H - 6 - r() * 46, s = 3 + r() * 2.4, c = FL[i % FL.length];
    let petals = ''; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + i; petals += `<circle cx="${(x + Math.cos(a) * s).toFixed(1)}" cy="${(y + Math.sin(a) * s).toFixed(1)}" r="${(s * 0.62).toFixed(1)}" fill="${c}"/>`; }
    flowers += `<path d="M${x.toFixed(1)} ${(y + s).toFixed(1)}V${H}" stroke="#08140d" stroke-width="1.6"/>${petals}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s * 0.45).toFixed(1)}" fill="#f4e7b0"/>`;
  }
  return `<svg class="st-canopy bottom" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path class="cf" d="${mound}"/><g class="cn">${ferns}</g><g class="fl">${flowers}</g></svg>`;
}
/* honey-wax seal pressed with the web of life */
export function waxSeal(size = 120) {
  const n = 18, R = 54; let d = '';
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, a2 = ((i + 0.5) / n) * Math.PI * 2; const p = [60 + R * Math.cos(a), 60 + R * Math.sin(a)], q = [60 + (R + 5) * Math.cos(a2), 60 + (R + 5) * Math.sin(a2)]; d += (i ? ` Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ` : `M`) + `${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }
  const k = 7, pts = []; for (let i = 0; i < k; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / k; pts.push([60 + 30 * Math.cos(a), 60 + 30 * Math.sin(a)]); }
  let lines = ''; for (let i = 0; i < k; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 3) % k], [x3, y3] = pts[(i + 1) % k]; lines += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}Q60 60 ${x2.toFixed(1)} ${y2.toFixed(1)}M${x1.toFixed(1)} ${y1.toFixed(1)}L${x3.toFixed(1)} ${y3.toFixed(1)}"/>`; }
  return `<svg class="wax" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <path d="${d}Z" class="wx-out"/><circle cx="60" cy="60" r="41" class="wx-in"/><circle cx="60" cy="60" r="36" class="wx-ring"/>
    <g class="wx-web">${lines}</g>${pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" class="wx-n"/>`).join('')}
    <path d="M60 72c-7-3-9-9-7-17 3-7 9-9 14-10-1 7-2 13-5 19l-2 8z" class="wx-leaf"/></svg>`;
}
/* hand-drawn vine flourish under the title */
export const VINE = (() => { const r = rngOf(9); let leaves = ''; for (let i = 1; i < 12; i++) { const x = i * 30, y = 14 + Math.sin(i * 1.1) * 6; leaves += leafPath(x, y, 9 + r() * 5, 3.5, i % 2 ? -50 : 230); } return `<svg class="st-vine" viewBox="0 0 360 28" aria-hidden="true"><path d="M2 14C40 4 70 24 110 14S180 4 220 14 300 24 358 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><g fill="currentColor">${leaves}</g></svg>`; })();
