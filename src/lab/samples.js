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


// more samples (Avi, 18.10: many more creatures to study). Facts in docs/sources.md (הממציאים).
const hexPath = (x, y, s) => { let d = ''; for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; d += (k ? 'L' : 'M') + f(x + Math.cos(a) * s) + ' ' + f(y + Math.sin(a) * s); } return d + 'z'; };

const MORPHO = {
  id: 'morphowing', species: 'morpho', name: 'כנף של פרפר מורפו', zone: 'amazon', zoom: 2, focus: 58,
  task: 'מצאו שלושה קשקשים עם "סולמות" זעירים.',
  hints: ['הכנף מכוסה קשקשים, כמו רעפים על גג.', 'בהגדלה הכי גדולה, על כל קשקש יש פסים דקים כמו סולם.'],
  found: 'על הקשקשים יש מבנים זעירים כמו סולמות. האור חוזר מהם כחול ומבריק, בלי שום צבע כחול בכנף.',
  idea: 'אפשר לעשות צבע מבריק בלי צבע, רק בעזרת הצורה של החומר.',
  targets: [],
  view(level) {
    const r = rnd(51 + level);
    if (level === 0) {
      return `<defs><radialGradient id="mw" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#7fd8ff"/><stop offset=".6" stop-color="#2a6ad8"/><stop offset="1" stop-color="#14306a"/></radialGradient>${grain('g0', 0.03, 0.25)}</defs>
        <rect width="400" height="400" fill="#101828"/><path d="M40 360 Q60 60 360 40 Q380 260 160 380z" fill="url(#mw)"/><path d="M40 360 Q190 210 360 40" stroke="#0e2244" stroke-width="5" fill="none"/><rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      let g = ''; for (let row = 0; row < 14; row++) for (let c = 0; c < 10; c++) { const x = c * 44 + (row % 2) * 22 - 10, y = row * 30 - 10, h = 190 + r() * 30;
        g += `<path d="M${f(x)} ${f(y)} q22 -8 44 0 v34 q-22 10 -44 0z" fill="hsl(${f(h)} 80% ${f(48 + r() * 12)}%)" stroke="#0e2244" stroke-width="1.4"/>`; }
      return `<rect width="400" height="400" fill="#0e1830"/>${g}`;
    }
    const pts = [[110, 100], [290, 120], [200, 250], [80, 320], [320, 330]];
    MORPHO.targets = pts.map(([x, y]) => ({ x, y, r: 50 }));
    let g = '';
    for (const [x, y] of pts) { g += `<rect x="${x - 34}" y="${y - 48}" width="68" height="96" rx="14" fill="url(#ms)" stroke="#0e2244" stroke-width="2"/>`;
      for (let k = 0; k < 9; k++) g += `<path d="M${x - 26} ${y - 40 + k * 10} h52" stroke="#bff0ff" stroke-width="2.2" opacity=".75"/>`;
      for (let k = 0; k < 4; k++) g += `<path d="M${x - 22 + k * 14} ${y - 44} v88" stroke="#0e2244" stroke-width="1.6" opacity=".6"/>`; }
    return `<defs><linearGradient id="ms" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fd0ff"/><stop offset="1" stop-color="#1c4fb0"/></linearGradient>${grain('g2', 0.05, 0.2)}</defs>
      <rect width="400" height="400" fill="#0c1426"/>${Array.from({ length: 30 }, () => `<rect x="${f(r() * 380)}" y="${f(r() * 380)}" width="40" height="56" rx="10" fill="#1a3a7a" opacity=".45"/>`).join('')}${g}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const FIREFLY = {
  id: 'fireflylamp', species: 'firefly', name: 'פנס של גחלילית', zone: 'grove', zoom: 2, focus: 66,
  task: 'מצאו שלושה קשקשים עם שוליים משוננים.',
  hints: ['הפנס נמצא בקצה הבטן של הגחלילית.', 'בהגדלה הכי גדולה, השוליים של הקשקשים לא חלקים. הם כמו מסור.'],
  found: 'על הפנס יש קשקשים עם שוליים משוננים. השיניים הקטנות עוזרות לאור לצאת החוצה במקום להיתקע בפנים.',
  idea: 'אם נעשה נורה עם שוליים כאלה, יותר אור ייצא ממנה.',
  targets: [],
  view(level) {
    const r = rnd(61 + level);
    if (level === 0) {
      return `<defs><radialGradient id="fl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f6ff9a"/><stop offset=".6" stop-color="#b8e040"/><stop offset="1" stop-color="#1a2410" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="400" fill="#0c1208"/><ellipse cx="200" cy="200" rx="170" ry="120" fill="url(#fl)"/><path d="M40 200 Q200 120 360 200" stroke="#3a3a20" stroke-width="18" fill="none" opacity=".6"/>`;
    }
    if (level === 1) {
      let g = ''; for (let row = 0; row < 12; row++) for (let c = 0; c < 9; c++) { const x = c * 48 + (row % 2) * 24 - 10, y = row * 36; g += `<path d="M${x} ${y} l20 -10 l20 10 v22 l-20 10 l-20 -10z" fill="#e2f070" opacity="${f(0.55 + r() * 0.4)}" stroke="#6a7a20" stroke-width="1.5"/>`; }
      return `<rect width="400" height="400" fill="#202a10"/>${g}`;
    }
    const pts = [[100, 110], [280, 90], [190, 230], [320, 300], [80, 320]];
    FIREFLY.targets = pts.map(([x, y]) => ({ x, y, r: 52 }));
    const saw = (x, y) => { let d = `M${x - 50} ${y + 10}`; for (let k = 0; k < 10; k++) d += ` l5 -12 l5 12`; return `<path d="M${x - 50} ${y + 10} h100 v34 h-100z" fill="#d8ec66"/><path d="${d}" fill="#f4ffb0" stroke="#6a7a20" stroke-width="2"/>`; };
    return `<defs>${grain('g2', 0.05, 0.25)}</defs><rect width="400" height="400" fill="#1a2210"/>
      <rect width="400" height="400" fill="#f4ffb0" opacity=".06"/>${pts.map(([x, y]) => saw(x, y)).join('')}
      ${Array.from({ length: 25 }, () => `<path d="M${f(r() * 380)} ${f(r() * 380)} h50 v26 h-50z" fill="#9aaa40" opacity=".35"/>`).join('')}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const TOUCAN = {
  id: 'toucanbeak', species: 'toucan', name: 'מקור של טוקן', zone: 'amazon', zoom: 2, focus: 44,
  task: 'מצאו שלושה חללים גדולים בתוך המקור.',
  hints: ['חתכו את המקור באמצע (כאילו), והסתכלו פנימה.', 'בפנים יש קצף של עצם: הרבה חללים קטנים וגדולים.'],
  found: 'המקור חלול כמעט כולו: קצף של עצם עם חללים, וקליפה דקה וחזקה מבחוץ. לכן הוא גדול אבל קל.',
  idea: 'חומר עם חללים בפנים וקליפה חזקה בחוץ יכול להיות קל וחזק.',
  targets: [],
  view(level) {
    const r = rnd(71 + level);
    if (level === 0) {
      return `<defs><linearGradient id="tb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd23a"/><stop offset=".7" stop-color="#ff8a1a"/><stop offset="1" stop-color="#1a1a1a"/></linearGradient></defs>
        <rect width="400" height="400" fill="#16301e"/><path d="M30 140 Q250 90 380 210 Q250 260 30 250z" fill="url(#tb)"/><path d="M30 196 Q230 200 380 210" stroke="#7a3a10" stroke-width="3" fill="none"/>`;
    }
    if (level === 1) {
      let c = ''; for (let i = 0; i < 70; i++) c += `<circle cx="${f(20 + r() * 360)}" cy="${f(20 + r() * 360)}" r="${f(8 + r() * 18)}" fill="#3a2410" opacity=".55"/>`;
      return `<rect width="400" height="400" fill="#f2d28a"/>${c}<rect x="0" y="0" width="400" height="22" fill="#ffb03a"/><rect x="0" y="378" width="400" height="22" fill="#ffb03a"/>`;
    }
    const pts = [[110, 120], [270, 110], [200, 250], [90, 300], [310, 300]];
    TOUCAN.targets = pts.map(([x, y]) => ({ x, y, r: 54 }));
    let web = ''; for (let i = 0; i < 90; i++) { const x = r() * 400, y = r() * 400; web += `<path d="M${f(x)} ${f(y)} l${f(-20 + r() * 40)} ${f(-20 + r() * 40)}" stroke="#d8b070" stroke-width="${f(3 + r() * 5)}" stroke-linecap="round"/>`; }
    return `<rect width="400" height="400" fill="#f4dcaa"/>${web}${pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="46" ry="36" fill="#2a1a0a"/><ellipse cx="${x - 10}" cy="${y - 8}" rx="22" ry="14" fill="#4a2a10" opacity=".7"/>`).join('')}
      ${Array.from({ length: 50 }, () => `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(4 + r() * 8)}" fill="#3a2410" opacity=".6"/>`).join('')}`;
  },
};

const CHAMELEON = {
  id: 'chameleonskin', species: 'chameleon', name: 'עור של זיקית', zone: 'grove', zoom: 2, focus: 70,
  task: 'מצאו שלוש קבוצות של גבישים זעירים מסודרים בשורות.',
  hints: ['הצבע של הזיקית לא בא רק מצבע בעור.', 'בהגדלה הכי גדולה רואים כדורים זעירים בשורות, כמו ביצים בתבנית.'],
  found: 'בעור של הזיקית יש גבישים זעירים מסודרים בשורות. כשהיא מקרבת או מרחיקה אותם, הצבע שלה משתנה.',
  idea: 'חומר שהחלקים הזעירים שלו זזים יכול לשנות צבע לבד.',
  targets: [],
  view(level) {
    const r = rnd(81 + level);
    if (level === 0) {
      let sc = ''; for (let i = 0; i < 160; i++) sc += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(9 + r() * 7)}" fill="hsl(${f(80 + r() * 50)} 55% ${f(36 + r() * 18)}%)"/>`;
      return `<rect width="400" height="400" fill="#3a5a22"/>${sc}`;
    }
    if (level === 1) {
      let c = ''; for (let row = 0; row < 10; row++) for (let k = 0; k < 10; k++) c += `<path d="${hexPath(k * 42 + (row % 2) * 21, row * 40, 22)}" fill="hsl(${f(90 + row * 6)} 60% ${f(40 + r() * 15)}%)" stroke="#20300f" stroke-width="2"/>`;
      return `<rect width="400" height="400" fill="#20300f"/>${c}`;
    }
    const pts = [[110, 110], [280, 110], [190, 250], [80, 320], [310, 320]];
    CHAMELEON.targets = pts.map(([x, y]) => ({ x, y, r: 50 }));
    let g = '';
    for (const [x, y] of pts) for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) g += `<circle cx="${x - 27 + a * 18}" cy="${y - 27 + b * 18}" r="7" fill="url(#cg)"/>`;
    for (let i = 0; i < 70; i++) g += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(4 + r() * 3)}" fill="#7ab040" opacity=".35"/>`;
    return `<defs><radialGradient id="cg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f6ffd0"/><stop offset=".6" stop-color="#7ad0a0"/><stop offset="1" stop-color="#2a6a5a"/></radialGradient></defs>
      <rect width="400" height="400" fill="#2a3a1a"/>${g}`;
  },
};

const OCTOPUS = {
  id: 'octosucker', species: 'octopus', name: 'זרוע של תמנון', zone: 'reef', zoom: 2, focus: 48,
  task: 'מצאו שלוש כפות יניקה.',
  hints: ['הזרוע של התמנון מלאה עיגולים.', 'כל כף יניקה היא עיגול עם טבעת ושקע באמצע.'],
  found: 'לאורך הזרוע יש שורות של כפות יניקה. כל אחת נצמדת לבד, והתמנון יכול לתפוס גם אבן כבדה וגם דבר עדין.',
  idea: 'יד רובוט רכה עם כפות יניקה קטנות יכולה לתפוס בעדינות.',
  targets: [],
  view(level) {
    const r = rnd(91 + level);
    if (level === 0) {
      let d = ''; for (let k = 0; k < 14; k++) d += `<circle cx="${60 + k * 22}" cy="${f(250 - Math.sin(k / 3) * 60)}" r="${f(10 - k * 0.4)}" fill="#f2c8a8"/>`;
      return `<rect width="400" height="400" fill="#123a4a"/><path d="M40 260 Q200 120 380 200" stroke="#c86a4a" stroke-width="70" stroke-linecap="round" fill="none"/>${d}`;
    }
    const pts = level === 1 ? [[100, 120], [260, 110], [180, 250], [320, 280], [80, 320]] : [[110, 120], [270, 110], [190, 250], [90, 320], [310, 310]];
    if (level === 2) OCTOPUS.targets = pts.map(([x, y]) => ({ x, y, r: 56 }));
    const sucker = (x, y, s) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#f2c8a8" stroke="#b86a4a" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${f(s * 0.62)}" fill="#e8a888" stroke="#a85a3a" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${f(s * 0.25)}" fill="#6a2a1a"/>
      ${Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2; return `<path d="M${f(x + Math.cos(a) * s * 0.66)} ${f(y + Math.sin(a) * s * 0.66)} L${f(x + Math.cos(a) * s * 0.92)} ${f(y + Math.sin(a) * s * 0.92)}" stroke="#c87a5a" stroke-width="2"/>`; }).join('')}`;
    return `<rect width="400" height="400" fill="#b85a3a"/>${Array.from({ length: 40 }, () => `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(6 + r() * 10)}" fill="#8a3a22" opacity=".4"/>`).join('')}${pts.map(([x, y]) => sucker(x, y, level === 1 ? 46 : 52)).join('')}`;
  },
};

// the biomimicry samples (1.3, the big inventors update): each one is the key of a problem in "הממציאים" or of a
// research question in the atlas. Facts in docs/sources.md (הממציאים).
const HEDGEHOG = {
  id: 'hedgehogspine', species: 'hedgehog', name: 'קוץ של קיפוד', zone: 'grove', zoom: 2, focus: 55,
  task: 'מצאו שלוש מחיצות בתוך הקוץ החלול.',
  hints: ['כאילו חתכנו את הקוץ לאורכו. הגדילו הכי הרבה.', 'הקוץ חלול, אבל לא ריק לגמרי. מה מחזיק אותו מבפנים?'],
  found: 'הקוץ הוא צינור דק וחלול. בפנים יש מחיצות קטנות ופסים לאורכו, והם לא נותנים לו להימעך.',
  idea: 'צינור חלול עם מחיצות יכול לבלום מכה בלי להישבר.',
  targets: [],
  view(level) {
    const r = rnd(101 + level);
    if (level === 0) {
      let sp = ''; for (let i = 0; i < 70; i++) { const x = 20 + r() * 360, y = 40 + r() * 340, a = -0.9 + r() * 0.5, L = 70 + r() * 50;
        sp += `<path d="M${f(x)} ${f(y)} l${f(Math.cos(a) * L)} ${f(Math.sin(a) * L)}" stroke="#f1e2c4" stroke-width="5" stroke-linecap="round"/><path d="M${f(x + Math.cos(a) * L * 0.45)} ${f(y + Math.sin(a) * L * 0.45)} l${f(Math.cos(a) * L * 0.3)} ${f(Math.sin(a) * L * 0.3)}" stroke="#5a3a20" stroke-width="5.4"/>`; }
      return `<rect width="400" height="400" fill="#3a2a1c"/>${sp}`;
    }
    if (level === 1) {
      let b = ''; for (let k = 0; k < 9; k++) b += `<rect x="${30 + k * 40}" y="150" width="${k % 2 ? 40 : 40}" height="100" fill="${k % 3 === 1 ? '#6a4628' : '#efe0c0'}"/>`;
      return `<rect width="400" height="400" fill="#20160e"/>${b}<rect x="30" y="150" width="360" height="100" rx="50" fill="none" stroke="#c9b48a" stroke-width="6"/>
        <path d="M30 200 L0 200" stroke="#efe0c0" stroke-width="40"/>`;
    }
    // a lengthwise cut: two thin walls, ridges along the wall, and plates across the hollow
    const xs = [70, 150, 230, 310];
    HEDGEHOG.targets = [{ x: 70, y: 200, r: 42 }, { x: 150, y: 200, r: 42 }, { x: 230, y: 200, r: 42 }, { x: 310, y: 200, r: 42 }];
    let g = `<rect x="0" y="92" width="400" height="216" fill="#2a1e12"/><rect x="0" y="92" width="400" height="22" fill="url(#hw)"/><rect x="0" y="286" width="400" height="22" fill="url(#hw)"/>`;
    for (let k = 0; k < 7; k++) g += `<path d="M0 ${f(128 + k * 24)} H400" stroke="#8a6a42" stroke-width="2.2" opacity=".55"/>`;
    for (const x of xs) g += `<path d="M${x} 114 C${x - 9} 160 ${x + 9} 240 ${x} 286" stroke="#f3e4c4" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 30; i++) g += `<circle cx="${f(r() * 400)}" cy="${f(120 + r() * 160)}" r="${f(1 + r() * 2)}" fill="#c9a87a" opacity=".5"/>`;
    return `<defs><linearGradient id="hw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4da"/><stop offset="1" stop-color="#c9a87a"/></linearGradient>${grain('g2', 0.05, 0.2)}</defs>
      <rect width="400" height="400" fill="#120c06"/>${g}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const SLOTH = {
  id: 'slothhair', species: 'sloth', name: 'שערה של עצלן', zone: 'amazon', zoom: 2, focus: 42,
  task: 'מצאו שלוש קבוצות של אצות ירוקות בסדקים של השערה.',
  hints: ['השערה לא חלקה. יש בה סדקים לרוחב.', 'בתוך הסדקים מסתתר משהו ירוק.'],
  found: 'בשערה של העצלן יש סדקים קטנים לרוחב, ובהם גרות אצות ירוקות. לכן הפרווה נראית לפעמים ירקרקה.',
  idea: 'גם שערה יכולה להיות בית לשותפים קטנים.',
  targets: [],
  view(level) {
    const r = rnd(111 + level);
    if (level === 0) {
      let h = ''; for (let i = 0; i < 160; i++) { const x = r() * 420 - 10, y = r() * 400; h += `<path d="M${f(x)} ${f(y)} q${f(20 + r() * 20)} ${f(30 + r() * 20)} ${f(10 + r() * 30)} ${f(70 + r() * 30)}" stroke="hsl(${f(60 + r() * 40)} ${f(20 + r() * 20)}% ${f(30 + r() * 20)}%)" stroke-width="${f(2 + r() * 2)}" fill="none" stroke-linecap="round"/>`; }
      return `<rect width="400" height="400" fill="#4a4030"/>${h}`;
    }
    if (level === 1) {
      let h = ''; for (let k = 0; k < 6; k++) { const y = 40 + k * 64; h += `<rect x="-10" y="${y}" width="420" height="34" rx="17" fill="#8a7454"/>`;
        for (let c = 0; c < 9; c++) { const x = 20 + c * 44 + r() * 10; h += `<path d="M${f(x)} ${y + 2} l6 30" stroke="#3a3020" stroke-width="3"/>`; if (r() < 0.5) h += `<circle cx="${f(x + 4)}" cy="${y + 17}" r="4" fill="#6aa04a"/>`; } }
      return `<rect width="400" height="400" fill="#2a2418"/>${h}`;
    }
    const cracks = [70, 140, 210, 280, 340];
    SLOTH.targets = [[70, 200], [210, 200], [340, 200], [140, 200], [280, 200]].map(([x, y]) => ({ x, y, r: 40 }));
    let g = `<rect x="-10" y="110" width="420" height="180" rx="80" fill="url(#sh)"/>`;
    for (const x of cracks) {
      g += `<path d="M${x - 14} 112 L${x - 4} 200 L${x - 14} 288 L${x + 14} 288 L${x + 4} 200 L${x + 14} 112z" fill="#3a2e1c"/>`;
      for (let k = 0; k < 7; k++) g += `<circle cx="${f(x - 6 + r() * 12)}" cy="${f(130 + r() * 140)}" r="${f(5 + r() * 3)}" fill="url(#al)"/>`;
    }
    return `<defs><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8ae84"/><stop offset=".5" stop-color="#a68a62"/><stop offset="1" stop-color="#6e5a3e"/></linearGradient>
      <radialGradient id="al" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#d8f5a0"/><stop offset=".6" stop-color="#5aa03a"/><stop offset="1" stop-color="#2a5a1a"/></radialGradient>${grain('g2', 0.05, 0.2)}</defs>
      <rect width="400" height="400" fill="#1e1a12"/>${g}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const KAPOK = {
  id: 'kapokfibre', species: 'kapok', name: 'סיב של קפוק', zone: 'amazon', zoom: 2, focus: 60,
  task: 'מצאו שלושה סיבים חתוכים, וראו מה יש בתוכם.',
  hints: ['בהגדלה הכי גדולה רואים את הסיבים חתוכים, כמו צינורות.', 'הסתכלו באמצע של כל סיב. מה ממלא אותו?'],
  found: 'כל סיב של קפוק הוא צינור דק עם דופן דקה, וכמעט כולו מלא באוויר. לכן הוא קל מאוד וצף על המים.',
  idea: 'חומר מלא באוויר יכול לצוף זמן רב.',
  targets: [],
  view(level) {
    const r = rnd(121 + level);
    if (level === 0) {
      let c = ''; for (let i = 0; i < 60; i++) c += `<circle cx="${f(60 + r() * 280)}" cy="${f(60 + r() * 280)}" r="${f(30 + r() * 40)}" fill="#fbf8f0" opacity="${f(0.25 + r() * 0.3)}"/>`;
      return `<rect width="400" height="400" fill="#5a4a32"/>${c}<ellipse cx="200" cy="370" rx="160" ry="30" fill="#3a2e1c"/>`;
    }
    if (level === 1) {
      let c = ''; for (let i = 0; i < 40; i++) { const y = r() * 400, a = -0.4 + r() * 0.8; c += `<path d="M-20 ${f(y)} Q200 ${f(y + Math.sin(a) * 120)} 420 ${f(y + a * 100)}" stroke="#f6f2e4" stroke-width="${f(4 + r() * 3)}" fill="none" opacity=".75"/>`; }
      return `<rect width="400" height="400" fill="#2a3a46"/>${c}`;
    }
    const pts = [[100, 110], [270, 100], [190, 230], [80, 310], [310, 300]];
    KAPOK.targets = pts.map(([x, y]) => ({ x, y, r: 50 }));
    let g = '';
    for (let i = 0; i < 12; i++) { const y = r() * 400; g += `<path d="M-20 ${f(y)} Q200 ${f(y - 30 + r() * 60)} 420 ${f(y + r() * 40 - 20)}" stroke="#e8e2d0" stroke-width="16" fill="none" opacity=".35"/>`; }
    for (const [x, y] of pts) g += `<circle cx="${x}" cy="${y}" r="44" fill="#f4efe0" stroke="#b9ae90" stroke-width="2"/><circle cx="${x}" cy="${y}" r="39" fill="url(#ka)"/>
      <circle cx="${x - 12}" cy="${y - 12}" r="9" fill="#fff" opacity=".55"/>`;
    return `<defs><radialGradient id="ka" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#d8eef8"/><stop offset="1" stop-color="#9ac4dc"/></radialGradient>${grain('g2', 0.05, 0.15)}</defs>
      <rect width="400" height="400" fill="#24323c"/>${g}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const PARROT = {
  id: 'parrottooth', species: 'parrotfish', name: 'שן של תוכינון', zone: 'reef', zoom: 2, focus: 68,
  task: 'מצאו שלושה מקומות שבהם צרורות של גבישים נארגים זה בזה.',
  hints: ['המקור של התוכינון בנוי מהרבה שיניים קטנות וצמודות.', 'בהגדלה הכי גדולה, הגבישים נראים כמו חוטים בקליעה.'],
  found: 'בתוך השן יש גבישים דקים מאוד, ארוגים זה בזה כמו חוטים בבד. לכן השן קשה מאוד ולא נסדקת בקלות.',
  idea: 'חוטים דקים ששזורים יחד חזקים יותר מגוש אחד.',
  targets: [],
  view(level) {
    const r = rnd(131 + level);
    if (level === 0) {
      let t = ''; for (let row = 0; row < 6; row++) for (let c = 0; c < 9; c++) t += `<ellipse cx="${f(30 + c * 44 + (row % 2) * 22)}" cy="${f(120 + row * 34)}" rx="20" ry="15" fill="hsl(${f(165 + r() * 15)} 45% ${f(62 + r() * 10)}%)" stroke="#1a5a50" stroke-width="2"/>`;
      return `<rect width="400" height="400" fill="#1a6a8a"/><path d="M0 100 Q200 60 400 100 V340 Q200 380 0 340z" fill="#3aa08a"/>${t}`;
    }
    if (level === 1) {
      let t = ''; for (let row = 0; row < 8; row++) for (let c = 0; c < 8; c++) t += `<path d="${hexPath(c * 54 + (row % 2) * 27, row * 50, 28)}" fill="hsl(${f(170 + r() * 10)} 30% ${f(78 + r() * 10)}%)" stroke="#5a8a80" stroke-width="2.5"/>`;
      return `<rect width="400" height="400" fill="#4a7a72"/>${t}`;
    }
    // a basket weave: bundles that go over and under each other
    let g = '';
    const S = 80;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const x = i * S - 40, y = j * S - 40, hor = (i + j) % 2 === 0;
      for (let k = 0; k < 5; k++) g += hor ? `<rect x="${x + 4}" y="${f(y + 8 + k * 13)}" width="${S - 8}" height="10" rx="5" fill="url(#pt)"/>` : `<rect x="${f(x + 8 + k * 13)}" y="${y + 4}" width="10" height="${S - 8}" rx="5" fill="url(#pt2)"/>`;
    }
    PARROT.targets = [[120, 120], [280, 120], [200, 200], [120, 280], [280, 280]].map(([x, y]) => ({ x, y, r: 40 }));
    return `<defs><linearGradient id="pt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6fbf4"/><stop offset="1" stop-color="#9ac4b8"/></linearGradient>
      <linearGradient id="pt2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8f4ee"/><stop offset="1" stop-color="#7aa89c"/></linearGradient>${grain('g2', 0.06, 0.18)}</defs>
      <rect width="400" height="400" fill="#2a4a44"/>${g}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const URCHIN = {
  id: 'urchinteeth', species: 'urchin', name: 'הפה של קיפוד ים', zone: 'reef', zoom: 2, focus: 50,
  task: 'מצאו שלוש מתוך חמש השיניים שבפה של קיפוד הים.',
  hints: ['הפה נמצא מתחת לגוף, באמצע.', 'השיניים מסודרות כמו כוכב, ונפגשות במרכז.'],
  found: 'לקיפוד הים יש פה עם חמש שיניים, מסודרות כמו כוכב. הוא פותח אותן, סוגר, ומגרד אצות מהסלע.',
  idea: 'יד עם חמש "שיניים" שנסגרות יחד יכולה לאסוף אדמה בדיוק מהמקום הנכון.',
  targets: [],
  view(level) {
    const r = rnd(141 + level);
    if (level === 0) {
      let s = ''; for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, L = 120 + r() * 70; s += `<path d="M200 200 L${f(200 + Math.cos(a) * L)} ${f(200 + Math.sin(a) * L)}" stroke="#151018" stroke-width="${f(2 + r() * 2)}" stroke-linecap="round"/>`; }
      return `<rect width="400" height="400" fill="#c8b48a"/>${s}<circle cx="200" cy="200" r="70" fill="#241a2a"/><circle cx="185" cy="185" r="16" fill="#4a3a5a" opacity=".6"/>`;
    }
    if (level === 1) {
      let d = ''; for (let i = 0; i < 160; i++) { const a = r() * Math.PI * 2, R0 = 80 + r() * 110; d += `<circle cx="${f(200 + Math.cos(a) * R0)}" cy="${f(200 + Math.sin(a) * R0)}" r="${f(3 + r() * 3)}" fill="#e8a8b8"/>`; }
      return `<rect width="400" height="400" fill="#3a2a40"/>${d}<circle cx="200" cy="200" r="64" fill="#5a4060"/>${[0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; return `<path d="M200 200 L${f(200 + Math.cos(a - 0.25) * 52)} ${f(200 + Math.sin(a - 0.25) * 52)} L${f(200 + Math.cos(a + 0.25) * 52)} ${f(200 + Math.sin(a + 0.25) * 52)}z" fill="#f4ecd8"/>`; }).join('')}`;
    }
    // five teeth, each a long curved blade, meeting in the middle like a star
    URCHIN.targets = [0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; return { x: 200 + Math.cos(a) * 105, y: 200 + Math.sin(a) * 105, r: 50 }; });
    let g = '<circle cx="200" cy="200" r="185" fill="#4a3050"/>';
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + k * Math.PI * 2 / 5, c = Math.cos(a), s = Math.sin(a), px = -s, py = c;
      g += `<path d="M${f(200 + c * 16)} ${f(200 + s * 16)} L${f(200 + c * 160 + px * 34)} ${f(200 + s * 160 + py * 34)} Q${f(200 + c * 178)} ${f(200 + s * 178)} ${f(200 + c * 160 - px * 34)} ${f(200 + s * 160 - py * 34)}z" fill="url(#ut)" stroke="#7a6a50" stroke-width="2"/>`
        + `<path d="M${f(200 + c * 30)} ${f(200 + s * 30)} L${f(200 + c * 150)} ${f(200 + s * 150)}" stroke="#b8a888" stroke-width="3" opacity=".6"/>`;
    }
    return `<defs><radialGradient id="ut" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#d8c8a8"/></radialGradient>${grain('g2', 0.05, 0.2)}</defs>
      <rect width="400" height="400" fill="#2a1a30"/>${g}<circle cx="200" cy="200" r="14" fill="#1a1020"/><rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const MYCEL = {
  id: 'mycelium', species: 'mushroom', name: 'חוטי פטרייה', zone: 'grove', zoom: 2, focus: 36,
  task: 'מצאו שלושה מקומות שבהם חוט אחד מתפצל לשניים.',
  hints: ['מתחת לפטרייה, באדמה, יש רשת לבנה ודקה.', 'חפשו מקום שבו חוט אחד נפרד לשני חוטים.'],
  found: 'רוב הפטרייה היא רשת של חוטים דקים מאוד באדמה. החוטים מתפצלים ומתחברים, ומחברים יחד חתיכות של עלים ואדמה.',
  idea: 'מחוטים כאלה אפשר לגדל חומר אריזה.',
  targets: [],
  view(level) {
    const r = rnd(151 + level);
    if (level === 0) {
      let c = ''; for (let i = 0; i < 70; i++) c += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(6 + r() * 16)}" fill="hsl(${f(20 + r() * 15)} 40% ${f(18 + r() * 14)}%)"/>`;
      for (let i = 0; i < 40; i++) c += `<circle cx="${f(100 + r() * 200)}" cy="${f(100 + r() * 200)}" r="${f(8 + r() * 20)}" fill="#f4efe4" opacity="${f(0.15 + r() * 0.25)}"/>`;
      return `<rect width="400" height="400" fill="#3a2a1a"/>${c}`;
    }
    if (level === 1) {
      let w = ''; for (let i = 0; i < 70; i++) { const x = r() * 400, y = r() * 400; w += `<path d="M${f(x)} ${f(y)} q${f(-40 + r() * 80)} ${f(-40 + r() * 80)} ${f(-60 + r() * 120)} ${f(-60 + r() * 120)}" stroke="#f6f0e2" stroke-width="1.6" fill="none" opacity=".8"/>`; }
      return `<rect width="400" height="400" fill="#4a3420"/>${w}`;
    }
    // thick threads (hyphae) that branch in a Y, with little walls inside
    const forks = [[110, 130], [290, 120], [200, 250], [90, 320], [320, 310]];
    MYCEL.targets = forks.map(([x, y]) => ({ x, y, r: 46 }));
    let g = '';
    for (const [x, y] of forks) {
      const a = -1.2 + r() * 0.4;
      g += `<path d="M${x} ${y} L${f(x - 120)} ${f(y + 90)}" stroke="url(#hy)" stroke-width="16" stroke-linecap="round"/>`
        + `<path d="M${x} ${y} L${f(x + Math.cos(a) * 110)} ${f(y + Math.sin(a) * 110)}" stroke="url(#hy)" stroke-width="13" stroke-linecap="round"/>`
        + `<path d="M${x} ${y} L${f(x + 120)} ${f(y + 20)}" stroke="url(#hy)" stroke-width="13" stroke-linecap="round"/>`
        + `<circle cx="${x}" cy="${y}" r="10" fill="#fffaf0"/>`;
    }
    for (let i = 0; i < 26; i++) g += `<ellipse cx="${f(r() * 400)}" cy="${f(r() * 400)}" rx="${f(10 + r() * 14)}" ry="${f(6 + r() * 8)}" fill="#6a4a2a" opacity=".5"/>`;
    return `<defs><linearGradient id="hy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#d8ccb4"/></linearGradient>${grain('g2', 0.05, 0.2)}</defs>
      <rect width="400" height="400" fill="#2a1c10"/>${g}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const CLAM = {
  id: 'clammantle', species: 'clam', name: 'שפה של צדפת ענק', zone: 'reef', zoom: 2, focus: 62,
  task: 'מצאו שלוש קבוצות של תאים מנצנצים.',
  hints: ['השפה הצבעונית של הצדפה מלאה בנקודות.', 'בהגדלה הכי גדולה, חפשו תאים שמחזירים אור כמו מראות קטנות.'],
  found: 'בשפה של צדפת הענק יש תאים מנצנצים. הם מפזרים את אור השמש, כך שהוא מגיע לאצות הזעירות שגרות בפנים.',
  idea: 'אולי חומר שמפזר אור יעזור לגדל אצות בבריכות.',
  targets: [],
  view(level) {
    const r = rnd(161 + level);
    if (level === 0) {
      let s = ''; for (let i = 0; i < 90; i++) s += `<circle cx="${f(r() * 400)}" cy="${f(130 + r() * 140)}" r="${f(3 + r() * 6)}" fill="hsl(${f(170 + r() * 60)} 80% ${f(60 + r() * 20)}%)"/>`;
      return `<rect width="400" height="400" fill="#c8c0a8"/><path d="M0 120 Q50 90 100 120 T200 120 T300 120 T400 120 V280 Q350 310 300 280 T200 280 T100 280 T0 280z" fill="#3a2a8a"/>${s}`;
    }
    if (level === 1) {
      let s = ''; for (let i = 0; i < 120; i++) { const x = r() * 400, y = r() * 400; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(6 + r() * 4)}" fill="#8a6a2a" opacity=".7"/>`; if (r() < 0.25) s += `<circle cx="${f(x + 8)}" cy="${f(y - 6)}" r="4" fill="#bff6ff"/>`; }
      return `<rect width="400" height="400" fill="#2a2a6a"/>${s}`;
    }
    // columns of brown algae with shiny cells on top that scatter the light down
    const pts = [[90, 90], [240, 80], [340, 170], [160, 200], [80, 310], [290, 300]];
    CLAM.targets = pts.map(([x, y]) => ({ x, y, r: 46 }));
    let g = '';
    for (let c = 0; c < 9; c++) { const x = 20 + c * 46; for (let k = 0; k < 9; k++) g += `<circle cx="${f(x + r() * 6)}" cy="${f(20 + k * 46)}" r="${f(12 + r() * 4)}" fill="url(#zz)" opacity=".85"/>`; }
    for (const [x, y] of pts) for (let k = 0; k < 6; k++) { const a = k * 1.05, d = k ? 20 : 0; g += `<ellipse cx="${f(x + Math.cos(a) * d)}" cy="${f(y + Math.sin(a) * d)}" rx="11" ry="8" fill="url(#ir)" stroke="#e8ffff" stroke-width="1.5"/>`; }
    return `<defs><radialGradient id="zz" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e8c87a"/><stop offset=".7" stop-color="#8a5a1a"/><stop offset="1" stop-color="#4a2a08"/></radialGradient>
      <linearGradient id="ir" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff6ff"/><stop offset=".5" stop-color="#7a9aff"/><stop offset="1" stop-color="#e0a8ff"/></linearGradient>${grain('g2', 0.04, 0.18)}</defs>
      <rect width="400" height="400" fill="#1c1a40"/>${g}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const LEAFBAC = {
  id: 'leafbac', species: 'leafcutter', name: 'נמלה גוזרת עלים', zone: 'amazon', zoom: 2, focus: 46,
  task: 'מצאו שלושה כתמים לבנים של חיידקים טובים על הגוף של הנמלה.',
  hints: ['הסתכלו על הגוף של הנמלה, מתחת לראש.', 'הכתמים הלבנים הם לא אבק. בהגדלה רואים שהם חוטים זעירים.'],
  found: 'על הגוף של הנמלה יש שכבה לבנה של חיידקים טובים. הם מייצרים חומרים ששומרים על גינת הפטריות של הנמלים.',
  idea: 'אולי מהחומרים האלה אפשר יהיה להכין תרופות חדשות.',
  targets: [],
  view(level) {
    const r = rnd(171 + level);
    if (level === 0) {
      return `<rect width="400" height="400" fill="#2a3a1a"/><path d="M200 40 L330 120 L300 230 L170 200z" fill="#5aa040" stroke="#3a7a2a" stroke-width="4"/><path d="M200 40 L240 180" stroke="#3a7a2a" stroke-width="3"/>
        <ellipse cx="150" cy="270" rx="34" ry="28" fill="#8a3a1a"/><ellipse cx="205" cy="280" rx="26" ry="22" fill="#9a4a24"/><ellipse cx="262" cy="292" rx="42" ry="32" fill="#7a3216"/>
        <path d="M150 250 L190 150 M150 262 L120 200" stroke="#7a3216" stroke-width="6" stroke-linecap="round"/>${[0, 1, 2].map((k) => `<path d="M${190 + k * 22} 296 l-20 50 M${200 + k * 22} 296 l16 50" stroke="#6a2a12" stroke-width="5" stroke-linecap="round"/>`).join('')}
        <ellipse cx="205" cy="272" rx="18" ry="8" fill="#f6f2e8" opacity=".75"/>`;
    }
    if (level === 1) {
      let s = ''; for (let i = 0; i < 30; i++) s += `<circle cx="${f(120 + r() * 160)}" cy="${f(130 + r() * 140)}" r="${f(6 + r() * 12)}" fill="#f6f2e8" opacity="${f(0.5 + r() * 0.4)}"/>`;
      return `<rect width="400" height="400" fill="#4a1e0c"/><ellipse cx="200" cy="200" rx="170" ry="120" fill="#8a3a1a"/>${s}${Array.from({ length: 14 }, () => `<path d="M${f(r() * 400)} ${f(r() * 400)} l${f(-10 + r() * 20)} 30" stroke="#5a2410" stroke-width="3"/>`).join('')}`;
    }
    const pts = [[110, 120], [280, 110], [200, 240], [90, 300], [310, 300]];
    LEAFBAC.targets = pts.map(([x, y]) => ({ x, y, r: 48 }));
    let g = '';
    for (let i = 0; i < 60; i++) g += `<path d="${hexPath(r() * 400, r() * 400, 16 + r() * 8)}" fill="#7a3216" opacity=".45"/>`;
    for (const [x, y] of pts) for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, L = 12 + r() * 26; g += `<path d="M${x} ${y} q${f(Math.cos(a + 0.6) * L * 0.6)} ${f(Math.sin(a + 0.6) * L * 0.6)} ${f(Math.cos(a) * L)} ${f(Math.sin(a) * L)}" stroke="#fbf8f0" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; }
    return `<defs>${grain('g2', 0.05, 0.22)}</defs><rect width="400" height="400" fill="#9a4220"/>${g}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

// 1.4, the desert. The yellow fattail scorpion's back is covered with small bumps and grooves, so blowing sand hardly
// wears it (Han et al. 2012, Langmuir); the white shell of the Negev desert snail is built of thin layers of chalky
// crystals that send most of the sunlight back (Schmidt-Nielsen, Taylor & Shkolnik 1971). No cross shapes: the plates
// are rounded bands, the bumps are round domes, the shell's lines are spirals.
const SCORP = {
  id: 'scorpionback', species: 'scorpion', name: 'שריון של עקרב', zone: 'desert', zoom: 2, focus: 55,
  task: 'מצאו שלוש בליטות גדולות על השריון.',
  hints: ['בהגדלה הכי גדולה רואים שהשריון לא חלק.', 'בין הבליטות יש חריצים. איפה הבליטות הכי גדולות?'],
  found: 'על השריון יש בליטות וחריצים זעירים. החול שהרוח מעיפה מחליק עליהם, ולכן הוא כמעט לא שוחק את השריון.',
  idea: 'משטח עם בליטות כאלה יכול להגן על מכונות במדבר.',
  targets: [],
  view(level) {
    const r = rnd(41 + level);
    if (level === 0) {
      let plates = '';
      for (let k = 0; k < 7; k++) { const y = 70 + k * 40, w = 230 - Math.abs(k - 3) * 18; plates += `<rect x="${f(200 - w / 2)}" y="${y}" width="${f(w)}" height="34" rx="16" fill="url(#sc)" stroke="#8a6420" stroke-width="3"/>`; }
      return `<defs><linearGradient id="sc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2d27a"/><stop offset="1" stop-color="#c89a3a"/></linearGradient>${grain('g0', 0.05, 0.18)}</defs>
        <rect width="400" height="400" fill="#e6cfa0"/>${plates}<rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      let d = ''; for (let k = 0; k < 260; k++) { const x = r() * 400, y = r() * 400, rr = 3 + r() * 5; d += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="#e8c26a" stroke="#9a7228" stroke-width="1.2"/>`; }
      return `<rect width="400" height="400" fill="#c89a40"/>${d}`;
    }
    // the bumps: rows of round domes with grooves between; three big ones to find
    let d = '', tips = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
      const x = 30 + col * 56 + (row % 2) * 28, y = 30 + row * 56, big = (row * 7 + col) % 17 === 5;
      const rr = big ? 27 : 13 + r() * 5;
      d += `<ellipse cx="${f(x)}" cy="${f(y + 4)}" rx="${f(rr)}" ry="${f(rr * 0.9)}" fill="#7a5418" opacity=".55"/>`;
      d += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="url(#bm)"/><ellipse cx="${f(x - rr * 0.3)}" cy="${f(y - rr * 0.35)}" rx="${f(rr * 0.35)}" ry="${f(rr * 0.22)}" fill="#fff6d0" opacity=".7"/>`;
      if (big) tips.push({ x, y, r: 34 });
    }
    SCORP.targets = tips.slice(0, 3);
    return `<defs><radialGradient id="bm" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f8dc8a"/><stop offset="1" stop-color="#b08430"/></radialGradient>${grain('g2', 0.08, 0.14)}</defs>
      <rect width="400" height="400" fill="#8a6422"/>${d}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const SNAIL = {
  id: 'snailshell', species: 'desertsnail', name: 'קונכייה של חילזון מדבר', zone: 'desert', zoom: 2, focus: 47,
  task: 'מצאו שלושה גבישים לבנים שהאור חוזר מהם.',
  hints: ['הקונכייה בנויה משכבות דקות. הסתכלו בהגדלה הכי גדולה.', 'חפשו גבישים שהאור מבריק עליהם במיוחד.'],
  found: 'הקונכייה בנויה משכבות דקות של גבישים לבנים. האור פוגע בהם וחוזר החוצה, ולכן החילזון לא מתחמם מדי בשמש.',
  idea: 'גג לבן ומבריק יכול לשמור על בית קריר.',
  targets: [],
  view(level) {
    const r = rnd(61 + level);
    if (level === 0) {
      // the whorls: one spiral line that winds in from the rim to the centre
      let pts = ''; for (let k = 0; k <= 160; k++) { const t = k / 160, a = t * Math.PI * 7, rr = 138 * (1 - t * 0.93); pts += `${k ? 'L' : 'M'}${f(200 + Math.cos(a) * rr)} ${f(205 + Math.sin(a) * rr * 0.93)}`; }
      const sp = `<path d="${pts}" stroke="#bdb5a4" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      return `<defs><radialGradient id="sh" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d8d2c4"/></radialGradient>${grain('g0', 0.05, 0.12)}</defs>
        <rect width="400" height="400" fill="#c8a870"/><ellipse cx="200" cy="205" rx="150" ry="140" fill="url(#sh)"/>${sp}<rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      let l = ''; for (let k = 0; k < 40; k++) { const y = k * 10 + r() * 4; l += `<path d="M0 ${f(y)} Q200 ${f(y + 8 - r() * 16)} 400 ${f(y + 4)}" stroke="#d6cfc0" stroke-width="${f(2 + r() * 3)}" fill="none"/>`; }
      return `<rect width="400" height="400" fill="#f4f1ea"/>${l}`;
    }
    // thin stacked plates of chalky crystal; three of them catch the light
    let c = '', tips = [];
    for (let row = 0; row < 10; row++) for (let col = 0; col < 6; col++) {
      const x = col * 72 + (row % 2) * 36 - 20, y = row * 40 + 10, bright = (row * 6 + col) % 19 === 7;
      c += `<rect x="${f(x)}" y="${f(y)}" width="68" height="34" rx="12" fill="${bright ? '#ffffff' : (r() < 0.5 ? '#ece6da' : '#e0d8c8')}" stroke="#c4bba8" stroke-width="2"/>`;
      if (bright) { c += `<rect x="${f(x - 3)}" y="${f(y - 3)}" width="74" height="40" rx="14" fill="#fff8d8" opacity=".55"/><ellipse cx="${f(x + 34)}" cy="${f(y + 13)}" rx="26" ry="8" fill="#fffef4"/><circle cx="${f(x + 52)}" cy="${f(y + 10)}" r="5" fill="#fff"/><path d="M${f(x + 10)} ${f(y + 26)} q24 -8 48 0" stroke="#f6e7a8" stroke-width="3" fill="none"/>`; tips.push({ x: x + 34, y: y + 17, r: 34 }); }
    }
    SNAIL.targets = tips.slice(0, 3);
    return `<defs>${grain('g2', 0.07, 0.1)}</defs><rect width="400" height="400" fill="#bdb4a2"/>${c}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

// 1.4.2, the savanna
const ZEBRA = {
  id: 'zebrahair', species: 'zebra', name: 'פרווה של זברה', zone: 'savanna', zoom: 2, focus: 52,
  task: 'מצאו שלוש שערות לבנות בתוך הפס השחור.',
  hints: ['בהגדלה הכי גדולה רואים שהפס בנוי משערות רבות.', 'רוב השערות בפס השחור כהות. חפשו את הבהירות.'],
  found: 'הפסים של הזברה בנויים משערות שחורות ושערות לבנות. חוקרים מצאו שזבובים מתקשים לנחות על פסים כאלה.',
  idea: 'אולי בגד עם פסים ירחיק זבובים?',
  targets: [],
  view(level) {
    const r = rnd(71 + level);
    if (level === 0) {
      // the stripes: smooth black bands across a white coat
      let b = ''; for (let k = -2; k < 9; k++) { const x = k * 56; b += `<path d="M${f(x)} 0 C${f(x + 40)} 120 ${f(x - 20)} 260 ${f(x + 30)} 400 L${f(x + 58)} 400 C${f(x + 8)} 260 ${f(x + 68)} 120 ${f(x + 28)} 0 z" fill="#1e1c1a"/>`; }
      return `<defs>${grain('g0', 0.05, 0.14)}</defs><rect width="400" height="400" fill="#f2efe6"/>${b}<rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      // the edge of a stripe: dark hairs on one side, light hairs on the other
      let h = ''; for (let k = 0; k < 420; k++) { const x = r() * 400, y = r() * 400, dark = x + (r() - 0.5) * 60 < 210, a = 1.1 + r() * 0.4; h += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + Math.cos(a) * 26)}" y2="${f(y + Math.sin(a) * 26)}" stroke="${dark ? '#2a2622' : '#ece6d6'}" stroke-width="3" stroke-linecap="round"/>`; }
      return `<rect width="400" height="400" fill="#8a8274"/>${h}`;
    }
    // single hairs inside a black stripe; three of them are white
    let h = '', tips = [];
    for (let k = 0; k < 60; k++) {
      const x = 20 + (k % 10) * 38 + r() * 8, y = 20 + Math.floor(k / 10) * 64 + r() * 10, white = k % 23 === 6;
      h += `<path d="M${f(x)} ${f(y)} q14 26 6 52" stroke="${white ? '#fbf8ee' : '#24201c'}" stroke-width="${white ? 9 : 8}" fill="none" stroke-linecap="round"/>`;
      h += `<path d="M${f(x - 2)} ${f(y + 4)} q12 22 5 44" stroke="${white ? '#ffffff' : '#4a443c'}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`;
      if (white) tips.push({ x: x + 8, y: y + 26, r: 32 });
    }
    ZEBRA.targets = tips.slice(0, 3);
    return `<defs>${grain('g2', 0.07, 0.12)}</defs><rect width="400" height="400" fill="#5a544a"/>${h}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const MOUND = {
  id: 'moundwall', species: 'termitemound', name: 'קיר של תל טרמיטים', zone: 'savanna', zoom: 2, focus: 44,
  task: 'מצאו שלוש תעלות אוויר גדולות בקיר.',
  hints: ['הקיר נראה מלא, אבל בהגדלה רואים בו חורים.', 'התעלות הגדולות כהות ועמוקות יותר מהחורים הקטנים.'],
  found: 'קיר התל מלא תעלות וחורים זעירים. אוויר זורם בהם, וכך הקן בפנים לא מתחמם מדי.',
  idea: 'בניין עם תעלות כאלה יכול להתקרר כמעט בלי מזגן.',
  targets: [],
  view(level) {
    const r = rnd(83 + level);
    if (level === 0) {
      // the mound: a red earth tower with a few dark openings
      let o = ''; for (let k = 0; k < 9; k++) o += `<ellipse cx="${f(150 + r() * 100)}" cy="${f(90 + k * 30)}" rx="${f(4 + r() * 4)}" ry="${f(3 + r() * 3)}" fill="#4a2410"/>`;
      return `<defs><linearGradient id="md" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a4420"/><stop offset=".5" stop-color="#c06a3a"/><stop offset="1" stop-color="#7a3a1a"/></linearGradient>${grain('g0', 0.06, 0.2)}</defs>
        <rect width="400" height="400" fill="#e8d8a8"/><path d="M200 30 C230 40 250 120 270 230 C290 320 300 370 310 400 L90 400 C100 370 110 320 130 230 C150 120 170 40 200 30 z" fill="url(#md)"/>${o}<rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      // grains of earth glued together, with small pores between them
      let g = ''; for (let k = 0; k < 300; k++) { const x = r() * 400, y = r() * 400; g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(6 + r() * 8)}" fill="${r() < 0.5 ? '#b8603a' : '#a0502e'}" stroke="#6a3018" stroke-width="1.5"/>`; }
      return `<rect width="400" height="400" fill="#4a2010"/>${g}`;
    }
    // the wall up close: many tiny pores and three big air tunnels
    let d = '', tips = [];
    for (let k = 0; k < 90; k++) d += `<ellipse cx="${f(r() * 400)}" cy="${f(r() * 400)}" rx="${f(4 + r() * 5)}" ry="${f(3 + r() * 4)}" fill="#3a1a0a"/>`;
    for (const [x, y] of [[90, 110], [290, 170], [170, 300]]) {
      d += `<ellipse cx="${x}" cy="${y + 6}" rx="30" ry="24" fill="#c87a4a" opacity=".6"/><ellipse cx="${x}" cy="${y}" rx="26" ry="20" fill="#2a1006"/><ellipse cx="${x - 4}" cy="${y - 4}" rx="14" ry="10" fill="#120602"/>`;
      tips.push({ x, y, r: 34 });
    }
    MOUND.targets = tips;
    return `<defs>${grain('g2', 0.08, 0.16)}</defs><rect width="400" height="400" fill="#a85a34"/>${d}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

// 1.4.3 set 6 (Avi, 1.11: more of the desert and the savanna in the lab); facts in docs/sources.md ("המעבדה, 1.4.3")
const ELESKIN = {
  id: 'elephantskin', species: 'elephant', name: 'עור של פיל', zone: 'savanna', zoom: 2, focus: 61,
  task: 'מצאו שלושה מקומות שבהם הסדקים נפגשים ומלאים במים.',
  hints: ['בהגדלה הכי גדולה רואים שהעור מחולק לחלקות קטנות.', 'במקום שבו כמה סדקים נפגשים נשארים מים כחולים.'],
  found: 'העור של הפיל מלא סדקים זעירים. הם שומרים מים ובוץ הרבה יותר מעור חלק, וכשהמים מתאדים הפיל מתקרר.',
  idea: 'אולי בגד עם סדקים כאלה ישמור על הגוף קריר בשמש?',
  targets: [],
  view(level) {
    const r = rnd(91 + level);
    if (level === 0) {
      // grey wrinkled skin: long soft folds
      let w = ''; for (let k = 0; k < 16; k++) { const y = 10 + k * 25 + r() * 8; const c1 = f(y - 14 + r() * 28), c2 = f(y - 14 + r() * 28), e = f(y + r() * 10), sw = 2 + r() * 3;
        w += `<path d="M-10 ${f(y + 4)} C100 ${+c1 + 4} 260 ${+c2 + 4} 410 ${+e + 4}" stroke="#b4aea4" stroke-width="${f(sw * 1.6)}" fill="none" opacity=".45"/><path d="M-10 ${f(y)} C100 ${c1} 260 ${c2} 410 ${e}" stroke="#4e4a46" stroke-width="${f(sw)}" fill="none" opacity=".75"/>`; }
      return `<defs><radialGradient id="sk0" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#9e988e"/><stop offset="1" stop-color="#6e6860"/></radialGradient>${grain('g0', 0.05, 0.22)}</defs><rect width="400" height="400" fill="url(#sk0)"/>${w}<rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    // a net of cracks: the corners are shared, so the plates tile the skin with a dark crack between them
    const n = level === 1 ? 9 : 5, step = 400 / (n - 1), P = [];
    for (let i = 0; i <= n; i++) { P.push([]); for (let j = 0; j <= n; j++) P[i].push([i * step - step / 2 + (r() - 0.5) * step * 0.45, j * step - step / 2 + (r() - 0.5) * step * 0.45]); }
    const pl = (i, j) => [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]].map((q) => f(q[0]) + ' ' + f(q[1])).join(' L');
    let d = '';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      d += `<path d="M${pl(i, j)} z" fill="url(#pl${level})" stroke="#2e2a27" stroke-width="${level === 1 ? 4 : 7}" stroke-linejoin="round"/>`;
      if (r() < 0.35) { const [x0, y0] = P[i][j], [x1, y1] = P[i + 1][j + 1]; d += `<path d="M${f(x0 + (x1 - x0) * 0.2)} ${f(y0 + (y1 - y0) * 0.3)} q${f((x1 - x0) * 0.2)} ${f((y1 - y0) * 0.5)} ${f((x1 - x0) * 0.55)} ${f((y1 - y0) * 0.45)}" stroke="#4a4540" stroke-width="${level === 1 ? 1.6 : 2.4}" fill="none" opacity=".7"/>`; }
    }
    const shade = `<radialGradient id="pl${level}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#b9b3a7"/><stop offset=".7" stop-color="#9c968a"/><stop offset="1" stop-color="#7a746a"/></radialGradient>`;
    if (level === 1) return `<defs>${shade}${grain('g1', 0.09, 0.2)}</defs><rect width="400" height="400" fill="#2e2a27"/>${d}<rect width="400" height="400" fill="#000" filter="url(#g1)"/>`;
    // up close: water stays where the cracks meet
    const tips = [];
    for (const [i, j] of [[1, 2], [3, 1], [2, 3]]) { const [x, y] = P[i][j]; d += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="21" ry="16" fill="#6fb6d8" opacity=".88"/><ellipse cx="${f(x - 6)}" cy="${f(y - 5)}" rx="7" ry="4" fill="#e8f6fc" opacity=".85"/>`; tips.push({ x: Math.round(x), y: Math.round(y), r: 30 }); }
    ELESKIN.targets = tips;
    return `<defs>${shade}${grain('g2', 0.08, 0.18)}</defs><rect width="400" height="400" fill="#2e2a27"/>${d}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const ACACIA = {
  id: 'acacialeaf', species: 'umbrella', name: 'עלה של שיטה סוככנית', zone: 'savanna', zoom: 2, focus: 36,
  task: 'מצאו שלושה פתחי נשימה זעירים על העלעל.',
  hints: ['העלה בנוי מהרבה עלעלים קטנים. בהגדלה הכי גדולה רואים עלעל אחד.', 'פתח נשימה נראה כמו שתי שפתיים קטנות עם חריץ באמצע.'],
  found: 'העלה של השיטה בנוי מהרבה עלעלים זעירים, ובכל עלעל יש פתחי נשימה קטנים. לעלה קטן יש פחות שטח שממנו יוצאים מים, וכך העץ חוסך מים בעונה היבשה.',
  idea: 'אולי לוח שמש מחולק לחלקים קטנים יתחמם פחות?',
  targets: [],
  view(level) {
    const r = rnd(97 + level);
    if (level === 0) {
      // a leaf: a stem with many pairs of tiny leaflets
      let l = ''; for (let k = 0; k < 14; k++) { const y = 30 + k * 25; for (const sx of [-1, 1]) l += `<ellipse cx="${f(200 + sx * 26)}" cy="${f(y)}" rx="22" ry="8" transform="rotate(${sx * -18} ${f(200 + sx * 26)} ${f(y)})" fill="${r() < 0.5 ? '#6f9a3a' : '#5e8a32'}"/>`; }
      return `<rect width="400" height="400" fill="#efe6c8"/><path d="M200 10 L200 395" stroke="#7a6a3a" stroke-width="5"/>${l}`;
    }
    if (level === 1) {
      // a few leaflets close up, with their veins
      let l = ''; for (let k = 0; k < 5; k++) { const y = 50 + k * 75; l += `<ellipse cx="200" cy="${y}" rx="170" ry="30" fill="#6e9a3c" stroke="#4a6e22" stroke-width="3"/><path d="M40 ${y} L360 ${y}" stroke="#8fb85a" stroke-width="3"/>`; }
      return `<defs>${grain('g1', 0.06, 0.15)}</defs><rect width="400" height="400" fill="#3e5a1e"/>${l}<rect width="400" height="400" fill="#000" filter="url(#g1)"/>`;
    }
    // the skin of one leaflet: cells like paving stones, and three open breathing pores
    let c = '', tips = [];
    for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 7; gx++) { const x = gx * 60 + (gy % 2) * 30 - 20 + r() * 6, y = gy * 46 - 10 + r() * 6; c += `<rect x="${f(x)}" y="${f(y)}" width="56" height="42" rx="12" fill="${r() < 0.5 ? '#8cbc5a' : '#7eb04e'}" stroke="#4e7a2a" stroke-width="2.5"/>`; }
    for (const [x, y] of [[110, 120], [290, 200], [170, 310]]) { c += `<ellipse cx="${x}" cy="${y}" rx="22" ry="15" fill="#3e6a20"/><ellipse cx="${x - 9}" cy="${y}" rx="10" ry="13" fill="#a8d878"/><ellipse cx="${x + 9}" cy="${y}" rx="10" ry="13" fill="#a8d878"/><ellipse cx="${x}" cy="${y}" rx="3" ry="9" fill="#1e3a10"/>`; tips.push({ x, y, r: 30 }); }
    ACACIA.targets = tips;
    return `<defs>${grain('g2', 0.07, 0.12)}</defs><rect width="400" height="400" fill="#4e7a2a"/>${c}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const WEAVER = {
  id: 'weavernest', species: 'weaver', name: 'קן של אורג', zone: 'savanna', zoom: 2, focus: 47,
  task: 'מצאו שלושה קשרים שהאורג קשר במקור.',
  hints: ['בהגדלה רואים שהקן קלוע מרצועות של עשב.', 'קשר נראה כמו לולאה שרצועת העשב עוברת בתוכה.'],
  found: 'האורג קולע את הקן מרצועות של עשב ירוק, ובכמה מקומות הוא קושר קשרים אמיתיים במקור וברגליים. כך הקן תלוי על ענף ולא נופל ברוח.',
  idea: 'אולי נלמד ממנו לקלוע סלים ורשתות חזקים?',
  targets: [],
  view(level) {
    const r = rnd(103 + level);
    if (level === 0) {
      // a round nest hanging from a twig
      let g = ''; for (let k = 0; k < 120; k++) { const a = r() * Math.PI * 2, rr = 70 + r() * 48; g += `<path d="M${f(200 + Math.cos(a) * rr)} ${f(230 + Math.sin(a) * rr * 0.9)} q${f(r() * 40 - 20)} ${f(r() * 40 - 20)} ${f(r() * 50 - 25)} ${f(r() * 50 - 25)}" stroke="${['#c4b462', '#a89a4e', '#8c8038'][Math.floor(r() * 3)]}" stroke-width="${f(2 + r() * 2)}" fill="none" stroke-linecap="round"/>`; }
      return `<defs><radialGradient id="ns" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#c8b866"/><stop offset=".65" stop-color="#a0924a"/><stop offset="1" stop-color="#6e6430"/></radialGradient>${grain('g0', 0.06, 0.16)}</defs><rect width="400" height="400" fill="#cfe4f0"/><path d="M0 70 Q200 50 400 80" stroke="#6a4a2a" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M200 60 C196 84 204 100 200 122" stroke="#9a9048" stroke-width="6" fill="none"/><ellipse cx="200" cy="230" rx="120" ry="110" fill="url(#ns)"/>${g}<ellipse cx="200" cy="322" rx="27" ry="19" fill="#2e2a14"/><ellipse cx="200" cy="318" rx="20" ry="12" fill="#1e1c0c"/><rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      // woven strips, over and under: each crossing shows the strip that lies on top
      const S = 40, W = 30; let w = '';
      for (let k = 0; k < 11; k++) w += `<rect x="-10" y="${k * S + 5}" width="420" height="${W}" rx="10" fill="url(#hs)"/>`;
      for (let i = 0; i < 11; i++) for (let j = 0; j < 11; j++) if ((i + j) % 2) w += `<rect x="${i * S + 5}" y="${j * S - 6}" width="${W}" height="${S + 12}" rx="10" fill="url(#vs)" stroke="#5a5222" stroke-width="1.5"/>`;
      return `<defs><linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e8236"/><stop offset=".45" stop-color="#cbbc68"/><stop offset="1" stop-color="#7c7230"/></linearGradient><linearGradient id="vs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7e7430"/><stop offset=".5" stop-color="#b8aa58"/><stop offset="1" stop-color="#6e6428"/></linearGradient>${grain('g1', 0.07, 0.18)}</defs><rect width="400" height="400" fill="#3a3418"/>${w}<rect width="400" height="400" fill="#000" filter="url(#g1)"/>`;
    }
    // strips of grass up close, and three knots
    let w = '', tips = [];
    for (let k = 0; k < 9; k++) { const y = 20 + k * 46; w += `<path d="M-10 ${y} C120 ${y + 18} 280 ${y - 18} 410 ${y}" stroke="${k % 2 ? '#b8aa5a' : '#a29446'}" stroke-width="18" fill="none"/><path d="M-10 ${y - 5} C120 ${y + 13} 280 ${y - 23} 410 ${y - 5}" stroke="#d4c878" stroke-width="3" fill="none" opacity=".6"/>`; }
    for (const [x, y] of [[100, 112], [300, 204], [180, 296]]) { w += `<ellipse cx="${x}" cy="${y}" rx="24" ry="18" fill="none" stroke="#8a7c30" stroke-width="12"/><path d="M${x - 20} ${y + 14} L${x + 26} ${y - 22}" stroke="#c4b664" stroke-width="12" stroke-linecap="round"/><path d="M${x - 6} ${y - 18} q10 18 0 36" stroke="#6a5e20" stroke-width="4" fill="none"/>`; tips.push({ x, y, r: 32 }); }
    WEAVER.targets = tips;
    return `<defs>${grain('g2', 0.08, 0.14)}</defs><rect width="400" height="400" fill="#5a5224"/>${w}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const PAPYRUS = {
  id: 'papyrusstem', species: 'papyrus', name: 'גבעול של פפירוס', zone: 'savanna', zoom: 2, focus: 70,
  task: 'מצאו שלושה חללי אוויר גדולים בתוך הגבעול.',
  hints: ['זה חתך של הגבעול: חתכנו אותו לרוחב.', 'חללי האוויר הגדולים בהירים וריקים, ומסביבם תאים קטנים.'],
  found: 'בתוך הגבעול יש הרבה חללי אוויר. הם מעבירים אוויר לשורשים שבבוץ, ועוזרים לצמח לעמוד ישר. במצרים הקדומה עשו מהגבעול הזה נייר.',
  idea: 'אולי חומר בנייה עם חללי אוויר יהיה קל וחזק?',
  targets: [],
  view(level) {
    const r = rnd(107 + level);
    if (level === 0) {
      // a cut stem: a green triangle with a pale soft inside
      return `<defs>${grain('g0', 0.05, 0.18)}</defs><rect width="400" height="400" fill="#e8e4cc"/><path d="M200 40 L370 340 L30 340 z" fill="#4e8a2e" stroke="#2e5a1a" stroke-width="6" stroke-linejoin="round"/><path d="M200 70 L345 325 L55 325 z" fill="#e6efc8"/><rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      // soft tissue full of small holes
      let h = ''; for (let k = 0; k < 180; k++) h += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(6 + r() * 9)}" fill="#f8faea" stroke="#a6b878" stroke-width="2"/>`;
      return `<rect width="400" height="400" fill="#c4d49a"/>${h}`;
    }
    // star-shaped cells around three big air spaces
    let c = '', tips = [];
    for (let k = 0; k < 140; k++) c += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(9 + r() * 6)}" fill="#bcd08a" stroke="#7e9452" stroke-width="2"/>`;
    for (const [x, y] of [[110, 130], [290, 150], [200, 300]]) { c += `<ellipse cx="${x}" cy="${y}" rx="40" ry="34" fill="#fbfdf0" stroke="#7e9452" stroke-width="4"/>`; tips.push({ x, y, r: 40 }); }
    PAPYRUS.targets = tips;
    return `<defs>${grain('g2', 0.07, 0.12)}</defs><rect width="400" height="400" fill="#9cb468"/>${c}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const BEETLE = {
  id: 'beetleback', species: 'darkling', name: 'גב של חיפושית שחורה', zone: 'desert', zoom: 2, focus: 33,
  task: 'מצאו שלוש טיפות מים שנתפסו על הבליטות.',
  hints: ['בהגדלה הכי גדולה רואים בליטות קטנות על הגב.', 'הטיפות נתפסות דווקא על הבליטות, לא בחריצים שביניהן.'],
  found: 'אצל חיפושיות שחורות במדבר נמיב יש על הגב בליטות קטנות. בבוקר טיפות ערפל נתפסות עליהן, גדלות ומתגלגלות אל הפה.',
  idea: 'אולי רשת עם בליטות כאלה תאסוף מים מהערפל?',
  targets: [],
  view(level) {
    const r = rnd(109 + level);
    if (level === 0) {
      // the beetle's black back
      return `<defs><radialGradient id="bb" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#4a4640"/><stop offset="1" stop-color="#121010"/></radialGradient>${grain('g0', 0.05, 0.2)}</defs><rect width="400" height="400" fill="#e2cfa0"/><ellipse cx="200" cy="220" rx="140" ry="170" fill="url(#bb)"/><path d="M200 60 L200 390" stroke="#000" stroke-width="4"/><rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      // rows of bumps
      let b = ''; for (let k = 0; k < 140; k++) { const x = r() * 400, y = r() * 400; b += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(7 + r() * 5)}" fill="#3a3632"/><circle cx="${f(x - 2)}" cy="${f(y - 2)}" r="3" fill="#6a645c"/>`; }
      return `<rect width="400" height="400" fill="#1a1816"/>${b}`;
    }
    // big bumps; on three of them a drop of fog water
    let b = '', tips = [];
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 5; gx++) { const x = 40 + gx * 80 + (gy % 2) * 20, y = 40 + gy * 80; b += `<circle cx="${x}" cy="${y}" r="26" fill="#2e2a26"/><circle cx="${x - 7}" cy="${y - 8}" r="9" fill="#5a544c"/>`; }
    for (const [x, y] of [[120, 120], [260, 200], [140, 280]]) { b += `<circle cx="${x}" cy="${y - 4}" r="20" fill="#9fd6f0" opacity=".9"/><circle cx="${x - 6}" cy="${y - 11}" r="6" fill="#ffffff" opacity=".85"/>`; tips.push({ x, y, r: 30 }); }
    BEETLE.targets = tips;
    return `<defs>${grain('g2', 0.08, 0.14)}</defs><rect width="400" height="400" fill="#141210"/>${b}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const SALT = {
  id: 'saltleaf', species: 'saltbush', name: 'עלה של מלוח', zone: 'desert', zoom: 2, focus: 58,
  task: 'מצאו שלוש שלפוחיות מלח על העלה.',
  hints: ['בהגדלה רואים שהעלה מכוסה בנקודות לבנות.', 'השלפוחיות נראות כמו בלונים קטנים ושקופים על רגל קצרה.'],
  found: 'על העלה של המלוח יש שערות קטנות כמו בלונים, ושם הצמח שם את המלח שהוא מוציא מהמים. הן נותנות לעלה צבע כסוף, ומחזירות חלק מאור השמש.',
  idea: 'אולי מכונה במדבר תוכל לסלק מלח לשכבה חיצונית, כמו המלוח?',
  targets: [],
  view(level) {
    const r = rnd(113 + level);
    if (level === 0) {
      // a silvery grey-green leaf
      return `<defs>${grain('g0', 0.06, 0.2)}</defs><rect width="400" height="400" fill="#efe8d2"/><path d="M200 30 C320 90 340 250 200 380 C60 250 80 90 200 30 z" fill="#a6b49a" stroke="#6e7e62" stroke-width="5"/><path d="M200 40 L200 370" stroke="#8a9a7e" stroke-width="4"/><rect width="400" height="400" fill="#fff" opacity=".12"/><rect width="400" height="400" fill="#000" filter="url(#g0)"/>`;
    }
    if (level === 1) {
      // white dots all over
      let d = ''; for (let k = 0; k < 300; k++) d += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(3 + r() * 5)}" fill="#f4f6ee" opacity=".85"/>`;
      return `<rect width="400" height="400" fill="#7e9070"/>${d}`;
    }
    // the leaf's skin with salt bladders on short stalks; three are big and full
    let d = '', tips = [];
    for (let k = 0; k < 40; k++) { const x = r() * 400, y = r() * 400; d += `<path d="M${f(x)} ${f(y + 10)} l0 10" stroke="#5e7052" stroke-width="3"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(9 + r() * 5)}" fill="#e8eee0" opacity=".7" stroke="#b8c4ac" stroke-width="1.5"/>`; }
    for (const [x, y] of [[100, 140], [280, 110], [220, 300]]) { d += `<path d="M${x} ${y + 26} l0 16" stroke="#4e6044" stroke-width="5"/><circle cx="${x}" cy="${y}" r="28" fill="#fafcf6" stroke="#c8d2be" stroke-width="2"/><path d="M${x - 10} ${y - 4} l6 -6 l6 6 l-6 6 z M${x + 4} ${y + 6} l5 -5 l5 5 l-5 5 z" fill="#d8e0f0"/><circle cx="${x - 9}" cy="${y - 10}" r="6" fill="#fff"/>`; tips.push({ x, y, r: 34 }); }
    SALT.targets = tips;
    return `<defs>${grain('g2', 0.07, 0.12)}</defs><rect width="400" height="400" fill="#6e8262"/>${d}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

const GROUSE = {
  id: 'grousefeather', species: 'sandgrouse', name: 'נוצה מהבטן של קטה', zone: 'desert', zoom: 2, focus: 42,
  task: 'מצאו שלושה חוטים מתולתלים שמחזיקים טיפות מים.',
  hints: ['בהגדלה הכי גדולה רואים חוטים דקים שיוצאים מהנוצה.', 'החוטים המתולתלים מחזיקים טיפות כחולות בין הסלסולים.'],
  found: 'בנוצות הבטן של זכר הקטה יש חוטים דקים ומתולתלים. כשהוא נכנס למים הם נפתחים ומחזיקים מים כמו ספוג, והוא עף איתם רחוק אל הגוזלים.',
  idea: 'אולי ספוג כזה יעזור להעביר מים בלי שיישפכו?',
  targets: [],
  view(level) {
    const r = rnd(127 + level);
    if (level === 0) {
      // a soft buff feather
      let b = ''; for (let k = 0; k < 40; k++) { const y = 60 + k * 7; b += `<path d="M200 ${y} q-70 ${f(-10 + r() * 20)} -130 ${f(30 + r() * 20)} M200 ${y} q70 ${f(-10 + r() * 20)} 130 ${f(30 + r() * 20)}" stroke="#c8a878" stroke-width="3" fill="none"/>`; }
      return `<rect width="400" height="400" fill="#efe6d4"/><path d="M200 40 L200 380" stroke="#8a6a44" stroke-width="5"/>${b}`;
    }
    if (level === 1) {
      // barbs side by side
      let b = ''; for (let k = 0; k < 22; k++) { const x = k * 19; b += `<path d="M${x} 0 Q${x + 30} 200 ${x} 400" stroke="#b89868" stroke-width="7" fill="none"/>`; }
      return `<defs>${grain('g1', 0.07, 0.16)}</defs><rect width="400" height="400" fill="#7a5e3e"/>${b}<rect width="400" height="400" fill="#000" filter="url(#g1)"/>`;
    }
    // thin barbules, many coiled; three hold drops of water
    let b = '', tips = [];
    for (let k = 0; k < 7; k++) {
      const y = 30 + k * 56;
      let path = `M0 ${y}`; for (let t = 0; t < 40; t++) path += ` q5 ${t % 2 ? 9 : -9} 10 0`;
      b += `<path d="${path}" stroke="#c4a474" stroke-width="5" fill="none"/>`;
    }
    for (const [x, y] of [[90, 142], [270, 198], [170, 310]]) { b += `<ellipse cx="${x}" cy="${y}" rx="26" ry="16" fill="#8fd0f0" opacity=".85"/><circle cx="${x - 8}" cy="${y - 5}" r="5" fill="#fff" opacity=".85"/>`; tips.push({ x, y, r: 32 }); }
    GROUSE.targets = tips;
    return `<defs>${grain('g2', 0.08, 0.12)}</defs><rect width="400" height="400" fill="#5e4a32"/>${b}<rect width="400" height="400" fill="#000" filter="url(#g2)"/>`;
  },
};

export const SAMPLES = [SHARK, OWL, BEE, CORAL, MORPHO, FIREFLY, TOUCAN, CHAMELEON, OCTOPUS, HEDGEHOG, SLOTH, KAPOK, PARROT, URCHIN, MYCEL, CLAM, LEAFBAC, SCORP, SNAIL, ZEBRA, MOUND, ELESKIN, ACACIA, WEAVER, PAPYRUS, BEETLE, SALT, GROUSE];
export const sampleById = (id) => SAMPLES.find((s) => s.id === id) || null;
export const ZOOMS = ['פי 10', 'פי 100', 'פי 1000'];
