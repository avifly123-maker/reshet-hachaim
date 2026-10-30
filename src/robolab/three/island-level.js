// מעבדת הרובוטים – a mission on the player's own island (Avi, 29.10: the advanced lessons and challenges happen in
// the environments the player designed). The island is the player's saved forest, loaded as a controlled place
// (nothing is saved back). This file looks at it and makes a level: a grid laid over a part of the island where his
// own trees stand (they become obstacles the robot must go round, the drone flies over them), rocks and water are
// read from the ground, and a mission is chosen that fits the zone. Every mission is checked to be reachable.
//   makeIslandLevel({ W, env }, zone, { kind, seed }) → level (with place: { OX, OZ, CS } and ownIsland: true) | null
const KINDS = {
  grove: ['plant', 'water', 'fire'], amazon: ['plant', 'fruit', 'water'], desert: ['water', 'fire', 'plant'], reef: ['coral', 'net'],
};
const T2 = (f, k) => ({ f, k });
const SAY = {
  plant: T2('זה האי שלך! בין העצים שגידלת יש מקומות שתילה מוכנים. תכנתו את הרובוט לשתול בכולם, בלי להיתקע בעצים.', 'זֶה הָאִי שֶׁלְּךָ! בֵּין הָעֵצִים שֶׁגִּדַּלְתָּ יֵשׁ מְקוֹמוֹת שְׁתִילָה מוּכָנִים. תַּכְנְתוּ אֶת הָרוֹבּוֹט לִשְׁתֹּל בְּכֻלָּם, בְּלִי לְהִתָּקַע בָּעֵצִים.'),
  water: T2('באי שלך יש שתילים צמאים. הרובוט ישקה רק את מי שצמא, וימצא דרך בין העצים.', 'בָּאִי שֶׁלְּךָ יֵשׁ שְׁתִילִים צְמֵאִים. הָרוֹבּוֹט יַשְׁקֶה רַק אֶת מִי שֶׁצָּמֵא, וְיִמְצָא דֶּרֶךְ בֵּין הָעֵצִים.'),
  fire: T2('שריפות קטנות פרצו באי שלך! הרחפן עף מעל העצים ומכבה את כולן, בלי לבזבז מים.', 'שְׂרֵפוֹת קְטַנּוֹת פָּרְצוּ בָּאִי שֶׁלְּךָ! הָרַחְפָן עָף מֵעַל הָעֵצִים וּמְכַבֶּה אֶת כֻּלָּן, בְּלִי לְבַזְבֵּז מַיִם.'),
  fruit: T2('פירות נשרו בין העצים שלך. הרובוט אוסף אותם לבעלי החיים.', 'פֵּרוֹת נָשְׁרוּ בֵּין הָעֵצִים שֶׁלְּךָ. הָרוֹבּוֹט אוֹסֵף אוֹתָם לְבַעֲלֵי הַחַיִּים.'),
  coral: T2('בשונית שלך יש מקומות לאלמוגים צעירים. הצוללן שותל בכולם, ועוקף את האלמוגים שכבר גדלים.', 'בַּשּׁוּנִית שֶׁלְּךָ יֵשׁ מְקוֹמוֹת לְאַלְמֻגִּים צְעִירִים. הַצּוֹלְלָן שׁוֹתֵל בְּכֻלָּם, וְעוֹקֵף אֶת הָאַלְמֻגִּים שֶׁכְּבָר גְּדֵלִים.'),
  net: T2('רשתות ישנות נתקעו בשונית שלך. הצוללן אוסף את כולן.', 'רְשָׁתוֹת יְשָׁנוֹת נִתְקְעוּ בַּשּׁוּנִית שֶׁלְּךָ. הַצּוֹלְלָן אוֹסֵף אֶת כֻּלָּן.'),
};
const TITLE = {
  plant: T2('שותלים באי שלי', 'שׁוֹתְלִים בָּאִי שֶׁלִּי'), water: T2('משקים באי שלי', 'מַשְׁקִים בָּאִי שֶׁלִּי'), fire: T2('מכבים אש באי שלי', 'מְכַבִּים אֵשׁ בָּאִי שֶׁלִּי'),
  fruit: T2('אוספים פירות באי שלי', 'אוֹסְפִים פֵּרוֹת בָּאִי שֶׁלִּי'), coral: T2('שותלים אלמוגים בשונית שלי', 'שׁוֹתְלִים אַלְמֻגִּים בַּשּׁוּנִית שֶׁלִּי'), net: T2('מנקים את השונית שלי', 'מְנַקִּים אֶת הַשּׁוּנִית שֶׁלִּי'),
};
const ITEM = { plant: 'seed', water: 'thirsty', fire: 'fire', fruit: 'fruit', coral: 'coral', net: 'net' };
const GOAL_ITEM = { plant: 'seeds', water: 'thirsty', fire: 'fires', fruit: 'fruit', coral: 'corals', net: 'nets' };
const TOOL = { plant: 'robot', water: 'robot', fruit: 'robot', fire: 'drone', coral: 'sub', net: 'sub' };
const ACT = { plant: 'plant', water: 'water', fire: 'spray', fruit: 'pick', coral: 'coral', net: 'collect' };
const SENSOR = { plant: 'spot', water: 'thirsty', fire: 'fire', fruit: 'fruit', coral: 'coralspot', net: 'net' };

export function makeIslandLevel({ W, env }, zone, { kind = null, seed = Date.now() } = {}) {
  let s = (seed % 2147483646) + 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const kinds = KINDS[zone] || KINDS.grove;
  kind = kind && kinds.includes(kind) ? kind : kinds[Math.floor(rnd() * kinds.length)];
  const sea = !!env.underwater;
  const COLS = 7, ROWS = 5, CS = 4;
  const R = (env.radius || 38) - 1.5, lim = R - Math.hypot((COLS + 2) * CS / 2, (ROWS + 2) * CS / 2);
  const tall = (p) => p && p.alive && !p.removed && (sea ? p.sp && (p.sp.kind === 'coral' || p.sp.kind === 'sessile') : p.isTree);
  const plants = (W.plants || []).filter(tall);
  // read one cell of the island: a tree (or a big coral in the sea), rock, water or open ground
  function cellOf(cx, cz) {
    const h = CS / 2 - 0.3;
    if (plants.some((p) => Math.abs(p.x - cx) < h && Math.abs(p.z - cz) < h)) return 'T';
    if (sea) return env.isPlaceable && !env.isPlaceable(cx, cz) ? 'R' : '~';
    if (env.isWater && env.isWater(cx, cz)) return '~';
    if (env.isPlaceable && !env.isPlaceable(cx, cz)) return 'R';
    return '.';
  }
  // where to lay it: a place with some of the player's trees, but room to move
  let best = null;
  for (let oz = -lim; oz <= lim + 0.01; oz += 3) for (let ox = -lim; ox <= lim + 0.01; ox += 3) {
    if (Math.hypot(ox, oz) > lim) continue;
    const g = []; let trees = 0, open = 0;
    for (let y = 0; y < ROWS; y++) { let r = ''; for (let x = 0; x < COLS; x++) { const c = cellOf(ox + (x - (COLS - 1) / 2) * CS, oz + (y - (ROWS - 1) / 2) * CS); r += c; if (c === 'T') trees++; if (c === '.' || c === '~') open++; } g.push(r); }
    const want = sea ? 4 : 5;
    const score = Math.abs(trees - want) * 3 - open * 0.2 + Math.hypot(ox, oz) * 0.02 + rnd() * 0.5;
    if (open >= 14 && (!best || score < best.score)) best = { score, ox, oz, g };
  }
  if (!best) return null;
  const rows = ['#'.repeat(COLS + 2), ...best.g.map((r) => '#' + r + '#'), '#'.repeat(COLS + 2)];
  const tool = TOOL[kind];
  const walk = (c) => (tool === 'drone' ? c !== '#' : tool === 'sub' ? c === '~' : c === '.');
  // the start: an open cell on the field's near edge (the bottom row), the base under it
  const cell = (x, y) => (rows[y] || '')[x] || '#';
  const starts = []; for (let y = ROWS; y >= 1; y--) { for (let x = 1; x <= COLS; x++) if (walk(cell(x, y)) && (tool === 'drone' || cell(x, y) !== 'T')) starts.push({ x, y }); if (starts.length) break; }
  if (!starts.length) return null;
  const st = starts[Math.floor(rnd() * starts.length)];
  // reachable cells (the robot cannot go through trees, the sub through big corals)
  const seen = new Set([st.x + ',' + st.y]), q = [st];
  while (q.length) { const c = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = x + ',' + y; if (seen.has(k) || !walk(cell(x, y))) continue; seen.add(k); q.push({ x, y }); } }
  const free = [...seen].map((k) => k.split(',').map(Number)).filter(([x, y]) => !(x === st.x && y === st.y) && (tool !== 'robot' || cell(x, y) === '.'));
  if (free.length < 3) return null;
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  const n = Math.min(free.length, 3 + Math.floor(rnd() * 2));
  const items = free.slice(0, n).map(([x, y]) => ({ t: ITEM[kind], x, y }));
  const blocks = ['fwd', 'back', 'right', 'left', ACT[kind], 'repeat', 'until', 'if', 'call', 'fireworks', 'dance'];
  return {
    id: 'isl-' + zone + '-' + kind, ownIsland: true, zone, ch: 9, concept: 'island', kind,
    title: TITLE[kind], say: [SAY[kind]], tools: [tool], blocks,
    map: { rows }, home: { x: st.x, y: st.y }, tools0: { [tool]: { x: st.x, y: st.y, dir: 0 } },
    items, goal: { all: [{ t: 'done', item: GOAL_ITEM[kind] }, { t: 'nooops' }] }, par: 0,
    place: { OX: best.ox, OZ: best.oz, CS }, sensorHint: SENSOR[kind],
  };
}
