// מעבדת רובו־דע – the microscope's samples. Each one is drawn as SVG at three magnifications (×10, ×100, ×1000); at
// one of them something is hidden that the child has to find (three times), with the focus knob set right.
// Facts (docs/sources.md, the lab): shark skin is covered with tiny tooth-like scales (dermal denticles) with ridges
// that run along the flow; the barn owl's flight feathers have a comb-like fringe on the leading edge that quiets the
// flight; the honeybee carries pollen in a basket of hairs on its hind leg; reef corals hold tiny algae in their
// tissue, which give them food and colour.
// Everything is drawn here (offline, no pictures to load). Coordinates: viewBox 0 0 400 400.

const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const f = (n) => n.toFixed(1);

// soft organic texture used under every view
const grain = (id, freq, op) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="7"/>
  <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${op} 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;

function denticle(x, y, s, rot, shade) {
  // a shark skin scale: a rounded shield with three to five ridges, pointing to the tail (the flow runs left → right)
  const ridges = [-0.42, -0.2, 0, 0.2, 0.42].map((k) => `<path d="M${f(-s * 0.55)} ${f(k * s)} Q${f(s * 0.1)} ${f(k * s * 0.85)} ${f(s * 0.62)} ${f(k * s * 0.55)}" stroke="#2e4652" stroke-width="${f(s * 0.07)}" stroke-linecap="round" fill="none" opacity=".75"/>`).join('');
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">
    <path d="M${f(-s * 0.7)} ${f(-s * 0.55)} Q${f(-s * 0.2)} ${f(-s * 0.75)} ${f(s * 0.55)} ${f(-s * 0.35)} Q${f(s * 0.95)} 0 ${f(s * 0.55)} ${f(s * 0.35)} Q${f(-s * 0.2)} ${f(s * 0.75)} ${f(-s * 0.7)} ${f(s * 0.55)} Q${f(-s * 0.85)} 0 ${f(-s * 0.7)} ${f(-s * 0.55)}z"
      fill="url(#dg)" stroke="#33505c" stroke-width="${f(s * 0.05)}" opacity="${shade}"/>${ridges}
    <path d="M${f(-s * 0.55)} ${f(-s * 0.45)} Q${f(0)} ${f(-s * 0.62)} ${f(s * 0.5)} ${f(-s * 0.3)}" stroke="#e8f4f4" stroke-width="${f(s * 0.06)}" fill="none" opacity=".55"/></g>`;
}

const SHARK = {
  id: 'sharkskin', species: 'reefshark', name: 'עור של כריש שונית', zone: 'reef', zoom: 2, focus: 64,
  task: 'מצאו שלושה קשקשים קטנים שנראים כמו שיניים.',
  hints: ['בהגדלה הכי גדולה רואים כל קשקש לחוד.', 'שימו לב לחריצים שעל כל קשקש. לאיזה כיוון הם פונים?'],
  found: 'כל הקשקשים מכוסים בחריצים, וכולם פונים לאותו כיוון: הכיוון שבו המים זורמים.',
  idea: 'אולי אם נכסה את הרובוט הצולל בחריצים כאלה, הוא יחליק במים כמו כריש?',
  targets: [],
  view(level) {
    const r = rnd(11 + level);
    if (level === 0) {
      let dots = ''; for (let i = 0; i < 900; i++) dots += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(0.8 + r() * 1.3)}" fill="#4d6a78" opacity="${f(0.25 + r() * 0.35)}"/>`;
      return `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa9b4"/><stop offset="1" stop-color="#6d8894"/></linearGradient>${grain('g0', 0.02, 0.35)}</defs>
        <rect width="400" height="400" fill="url(#sk)"/><rect width="400" height="400" fill="#000" filter="url(#g0)"/>${dots}`;
    }
    if (level === 1) {
      let g = ''; for (let row = 0; row < 16; row++) for (let c = 0; c < 15; c++) {
        const x = c * 28 + (row % 2) * 14 - 6 + r() * 3, y = row * 26 - 4 + r() * 3; g += denticle(x, y, 13, -6 + r() * 12, 0.9);
      }
      return `<defs><radialGradient id="dg" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#cfe2e6"/><stop offset=".6" stop-color="#93b2bc"/><stop offset="1" stop-color="#5e7d89"/></radialGradient></defs>
        <rect width="400" height="400" fill="#4a6470"/>${g}`;
    }
    const pts = [[90, 110], [240, 80], [345, 170], [150, 230], [290, 280], [70, 340], [210, 360], [370, 360]];
    SHARK.targets = pts.map(([x, y]) => ({ x, y, r: 52 }));
    return `<defs><radialGradient id="dg" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#e2f0f2"/><stop offset=".55" stop-color="#9dbcc6"/><stop offset="1" stop-color="#58798a"/></radialGradient>${grain('g2', 0.05, 0.25)}</defs>
      <rect width="400" height="400" fill="#3c5662"/><rect width="400" height="400" fill="#000" filter="url(#g2)"/>
      ${pts.map(([x, y], i) => denticle(x, y, 58, -8 + (i * 37) % 16, 1)).join('')}`;
  },
};

const OWL = {
  id: 'owlfeather', species: 'owl', name: 'נוצה של תנשמת', zone: 'grove', zoom: 2, focus: 38,
  task: 'מצאו שלוש "שיני מסרק" בשוליים של הנוצה.',
  hints: ['הסתכלו על הקצה הקדמי של הנוצה, בהגדלה הכי גדולה.', 'השוליים לא חלקים. הם נראים כמו מסרק דק.'],
  found: 'בשוליים של הנוצה יש שורה של קצוות רכים, כמו מסרק. הם מפרקים את הרוח, ולכן התנשמת עפה כמעט בלי קול.',
  idea: 'כנף או מדחף עם שוליים כאלה יכולים להיות שקטים יותר.',
  targets: [],
  view(level) {
    const r = rnd(21 + level);
    if (level === 0) {
      let bars = ''; for (let k = 0; k < 7; k++) bars += `<path d="M60 ${60 + k * 46} Q200 ${40 + k * 46} 360 ${70 + k * 46}" stroke="#9a6a3a" stroke-width="10" fill="none" opacity=".35"/>`;
      return `<defs><linearGradient id="fw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e2bf"/><stop offset="1" stop-color="#d8b680"/></linearGradient>${grain('g0', 0.04, 0.2)}</defs>
        <rect width="400" height="400" fill="#2a2018"/><path d="M40 380 Q120 120 380 20 Q300 220 60 400z" fill="url(#fw)"/>${bars}
        <path d="M45 385 Q190 190 375 25" stroke="#7a5a3a" stroke-width="6" fill="none"/><rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      let b = ''; for (let k = 0; k < 60; k++) { const y = -40 + k * 8; b += `<path d="M120 ${y} Q250 ${y + 40} 420 ${y + 30 + r() * 10}" stroke="${r() < 0.5 ? '#c99a5a' : '#e2c08a'}" stroke-width="2.2" fill="none"/>`; }
      return `<rect width="400" height="400" fill="#3a2a1a"/><rect x="100" y="0" width="22" height="400" fill="#8a6a42"/>${b}`;
    }
    // the leading edge: each barb ends in a free, hooked tip; side by side they make a soft comb
    let b = '', tips = [];
    for (let k = 0; k < 24; k++) {
      const y = -6 + k * 18;
      b += `<path d="M-10 ${y + 46} Q170 ${y + 24} 286 ${y + 2}" stroke="url(#bb)" stroke-width="9" stroke-linecap="round" fill="none"/>`;
      for (let j = 0; j < 9; j++) { const x = 20 + j * 30, yy = y + 42 - j * 4.6; b += `<path d="M${x} ${yy} q8 6 16 4" stroke="#b88a52" stroke-width="1.6" fill="none" opacity=".7"/>`; }
      b += `<path d="M284 ${y + 2} C312 ${y - 4} 334 ${y - 14} 346 ${y - 34} q4 -8 -2 -10" stroke="#f3dcaa" stroke-width="5" stroke-linecap="round" fill="none"/>`;
      if (k % 5 === 2) tips.push({ x: 334, y: y - 18, r: 36 });
    }
    OWL.targets = tips;
    return `<defs><linearGradient id="bb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6438"/><stop offset=".7" stop-color="#d9b47c"/><stop offset="1" stop-color="#f0d8a8"/></linearGradient>${grain('g2', 0.06, 0.16)}</defs>
      <rect width="400" height="400" fill="#241a10"/><rect x="330" width="70" height="400" fill="#3a3024" opacity=".5"/>${b}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const BEE = {
  id: 'beeleg', species: 'honeybee', name: 'רגל של דבורת דבש', zone: 'grove', zoom: 2, focus: 72,
  task: 'מצאו שלושה גרגרי אבקה בסל של הדבורה.',
  hints: ['ברגל האחורית יש "סל" של שערות.', 'גרגר אבקה נראה כמו כדור קטן עם קוצים.'],
  found: 'ברגל האחורית של הדבורה יש סל של שערות, והיא מביאה בו אבקה אל הכוורת.',
  idea: 'סל של שערות מחזיק הרבה גרגרים קטנים בלי שייפלו.',
  targets: [],
  view(level) {
    const r = rnd(31 + level);
    if (level === 0) {
      return `<defs><radialGradient id="pl" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#ffd25a"/><stop offset="1" stop-color="#e09a20"/></radialGradient></defs>
        <rect width="400" height="400" fill="#e9edf0"/><path d="M60 360 L170 210 L300 120 L360 40" stroke="#3a2a1a" stroke-width="22" stroke-linecap="round" fill="none"/>
        <ellipse cx="230" cy="170" rx="58" ry="38" transform="rotate(-38 230 170)" fill="url(#pl)"/>`;
    }
    if (level === 1) {
      let h = ''; for (let k = 0; k < 70; k++) { const x = 40 + r() * 320, y = 40 + r() * 320; h += `<path d="M${f(x)} ${f(y)} q${f(10 + r() * 20)} ${f(-20 - r() * 20)} ${f(30 + r() * 20)} ${f(-10)}" stroke="#4a3420" stroke-width="2" fill="none"/>`; }
      return `<rect width="400" height="400" fill="#efe8d8"/><ellipse cx="200" cy="200" rx="150" ry="110" fill="#f0b030"/>${h}`;
    }
    const pts = [[110, 120], [260, 100], [180, 230], [310, 250], [90, 300], [230, 340]];
    BEE.targets = pts.map(([x, y]) => ({ x, y, r: 44 }));
    const grainBall = (x, y, s) => { let sp = ''; for (let k = 0; k < 22; k++) { const a = k * 0.2856 * Math.PI * 1.0 + (k % 2) * 0.15; sp += `<path d="M${f(x + Math.cos(a) * s)} ${f(y + Math.sin(a) * s)} L${f(x + Math.cos(a) * s * 1.22)} ${f(y + Math.sin(a) * s * 1.22)}" stroke="#d08a10" stroke-width="3" stroke-linecap="round"/>`; }
      return `${sp}<circle cx="${x}" cy="${y}" r="${s}" fill="url(#pg)"/>`; };
    return `<defs><radialGradient id="pg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff2a0"/><stop offset=".6" stop-color="#f2b830"/><stop offset="1" stop-color="#b8780a"/></radialGradient></defs>
      <rect width="400" height="400" fill="#f3ead4"/>${Array.from({ length: 40 }, () => `<path d="M${f(r() * 400)} ${f(r() * 400)} q30 -30 70 -20" stroke="#6a4a2a" stroke-width="3" fill="none" opacity=".5"/>`).join('')}
      ${pts.map(([x, y]) => grainBall(x, y, 30)).join('')}`;
  },
};

const CORAL = {
  id: 'coralpolyp', species: 'branching', name: 'פוליפ של אלמוג', zone: 'reef', zoom: 2, focus: 50,
  task: 'מצאו שלוש קבוצות של אצות זעירות בתוך האלמוג.',
  hints: ['האלמוג הוא בעל חיים, ובתוכו גרות אצות קטנטנות.', 'חפשו נקודות חומות־זהובות בתוך הרקמה.'],
  found: 'בתוך האלמוג גרות אצות זעירות. הן נותנות לו מזון וצבע, והוא נותן להן בית.',
  idea: 'שותפות: שני יצורים שכל אחד עוזר לשני.',
  targets: [],
  view(level) {
    const r = rnd(41 + level);
    if (level === 0) {
      let c = ''; for (let i = 0; i < 60; i++) { const x = r() * 400, y = r() * 400; c += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(10 + r() * 6)}" fill="#c87a5a"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(4 + r() * 2)}" fill="#7a3a2a"/>`; }
      return `<rect width="400" height="400" fill="#e2a07a"/>${c}`;
    }
    if (level === 1) {
      const polyp = (x, y, s) => { let t = ''; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + 0.13; t += `<path d="M${f(x)} ${f(y)} Q${f(x + Math.cos(a + 0.3) * s * 0.7)} ${f(y + Math.sin(a + 0.3) * s * 0.7)} ${f(x + Math.cos(a) * s)} ${f(y + Math.sin(a) * s)}" stroke="#f2c8a8" stroke-width="${f(s * 0.12)}" stroke-linecap="round" fill="none" opacity=".85"/>`; }
        return `${t}<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.32)}" fill="#c8664a"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.12)}" fill="#6a2a1a"/>`; };
      return `<rect width="400" height="400" fill="#8a4a3a"/>${[[90, 90], [250, 70], [360, 180], [160, 220], [300, 320], [70, 330]].map(([x, y]) => polyp(x, y, 70)).join('')}`;
    }
    const pts = [[100, 110], [280, 90], [200, 220], [320, 290], [90, 310]];
    CORAL.targets = pts.map(([x, y]) => ({ x, y, r: 48 }));
    let cells = '';
    for (let i = 0; i < 40; i++) { const x = r() * 400, y = r() * 400; cells += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(26 + r() * 20)}" ry="${f(18 + r() * 14)}" fill="#f2c0a8" opacity=".35"/>`; }
    for (const [x, y] of pts) for (let k = 0; k < 7; k++) { const a = k * 0.9, d = k ? 18 : 0; cells += `<circle cx="${f(x + Math.cos(a) * d)}" cy="${f(y + Math.sin(a) * d)}" r="9" fill="url(#zx)"/>`; }
    return `<defs><radialGradient id="zx" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f2d27a"/><stop offset=".7" stop-color="#a8742a"/><stop offset="1" stop-color="#6a4418"/></radialGradient>${grain('g2', 0.03, 0.2)}</defs>
      <rect width="400" height="400" fill="#e8b49a"/>${cells}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

export const SAMPLES = [SHARK, OWL, BEE, CORAL];
export const sampleById = (id) => SAMPLES.find((s) => s.id === id) || null;
export const ZOOMS = ['פי 10', 'פי 100', 'פי 1000'];
