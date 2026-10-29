// מעבדת הרובוטים – the parts that click onto the tools, and the colours (Avi, 29.10: the tools are built from parts so
// more can be connected later; the player designs his tools and earns parts and colours).
// Each part: the tool it fits, the socket, a name, what it lets the tool do (blocks), and how it is earned.
//   earn: 'start' (from the beginning) | 'lesson:<id>' | 'chapter:<n>' (all lessons of a chapter) | 'stars:<n>' | 'puzzles:<n>'
// The meshes are in src/data/robolab-parts.js (Blender: tools/blender/robolab_kit.py), by the same ids.
export const SOCKETS = {
  robot: { head: { f: 'ראש', k: 'רֹאשׁ' }, back: { f: 'גב', k: 'גַּב' }, arm: { f: 'זרוע', k: 'זְרוֹעַ' }, top: { f: 'למעלה', k: 'לְמַעְלָה' }, side_l: { f: 'צד שמאל', k: 'צַד שְׂמֹאל' }, side_r: { f: 'צד ימין', k: 'צַד יָמִין' } },
  drone: { belly: { f: 'בטן', k: 'בֶּטֶן' }, top: { f: 'למעלה', k: 'לְמַעְלָה' }, front: { f: 'חזית', k: 'חֲזִית' } },
  sub: { front: { f: 'חזית', k: 'חֲזִית' }, top: { f: 'למעלה', k: 'לְמַעְלָה' }, side_l: { f: 'צד שמאל', k: 'צַד שְׂמֹאל' }, side_r: { f: 'צד ימין', k: 'צַד יָמִין' } },
};
export const PARTS = {
  head_screen: { tool: 'robot', socket: 'head', f: 'ראש מסך', k: 'רֹאשׁ מָסָךְ', earn: 'start' },
  head_dome: { tool: 'robot', socket: 'head', f: 'כיפת זכוכית', k: 'כִּפַּת זְכוּכִית', earn: 'chapter:2' },
  bin: { tool: 'robot', socket: 'back', f: 'סל איסוף', k: 'סַל אִסּוּף', gives: ['pick', 'collect'], earn: 'start' },
  drone_pad: { tool: 'robot', socket: 'back', f: 'משטח לרחפן', k: 'מִשְׁטָח לָרַחְפָן', gives: ['launch'], earn: 'chapter:3' },
  water_tank: { tool: 'robot', socket: 'back', f: 'מכל מים', k: 'מְכַל מַיִם', gives: ['water', 'spray'], earn: 'lesson:l1-4' },
  grabber: { tool: 'robot', socket: 'arm', f: 'זרוע תופסת', k: 'זְרוֹעַ תּוֹפֶסֶת', gives: ['pick', 'collect'], earn: 'start' },
  planter: { tool: 'robot', socket: 'arm', f: 'שותל זרעים', k: 'שׁוֹתֵל זְרָעִים', gives: ['plant'], earn: 'start' },
  antenna: { tool: 'robot', socket: 'top', f: 'אנטנה', k: 'אַנְטֶנָּה', gives: ['report'], earn: 'start' },
  beacon: { tool: 'robot', socket: 'top', f: 'פנס מהבהב', k: 'פַּנָּס מְהַבְהֵב', gives: ['lights'], earn: 'stars:10' },
  solar: { tool: 'robot', socket: 'top', f: 'לוח סולארי', k: 'לוּחַ סוֹלָרִי', earn: 'stars:20' },
  fin: { tool: 'robot', socket: 'side_l', also: ['side_r'], f: 'כנפונים', k: 'כְּנָפוֹנִים', earn: 'puzzles:2' },
  cam: { tool: 'drone', socket: 'belly', f: 'מצלמה', k: 'מַצְלֵמָה', gives: ['photo'], earn: 'start' },
  spray: { tool: 'drone', socket: 'belly', f: 'מתז מים', k: 'מַתָּז מַיִם', gives: ['spray', 'water'], earn: 'lesson:l1-6' },
  claw: { tool: 'drone', socket: 'belly', f: 'וו הרמה', k: 'וָו הֲרָמָה', gives: ['collect', 'pick'], earn: 'chapter:2' },
  sub_fin: { tool: 'sub', socket: 'top', f: 'סנפיר', k: 'סְנַפִּיר', earn: 'start' },
  sub_claw: { tool: 'sub', socket: 'front', f: 'צבת צלילה', k: 'צְבַת צְלִילָה', gives: ['coral', 'collect'], earn: 'start' },
  sub_lamp: { tool: 'sub', socket: 'front', f: 'פנס צלילה', k: 'פַּנַּס צְלִילָה', gives: ['photo', 'lights'], earn: 'lesson:l2-4' },
  thruster: { tool: 'sub', socket: 'side_l', also: ['side_r'], f: 'מנועי צד', k: 'מְנוֹעֵי צַד', earn: 'stars:15' },
};
// what each tool wears before the player designs it
export const DEFAULT_LOOK = {
  robot: { head: 'head_screen', back: 'bin', arm: 'grabber', top: 'antenna' },
  drone: { belly: 'cam' },
  sub: { top: 'sub_fin', front: 'sub_claw' },
};
// colours for body / trim / accent (earned like the parts)
export const PAINTS = [
  { id: 'orange', c: '#f2731f', f: 'כתום', k: 'כָּתֹם', earn: 'start' },
  { id: 'teal', c: '#1a9e99', f: 'טורקיז', k: 'טוּרְקִיז', earn: 'start' },
  { id: 'sun', c: '#ffc72e', f: 'צהוב שמש', k: 'צָהֹב שֶׁמֶשׁ', earn: 'start' },
  { id: 'sky', c: '#3b82c4', f: 'כחול שמיים', k: 'כָּחֹל שָׁמַיִם', earn: 'start' },
  { id: 'leaf', c: '#3f9a4a', f: 'ירוק עלה', k: 'יָרֹק עָלֶה', earn: 'chapter:1' },
  { id: 'cream', c: '#f5f0e6', f: 'שמנת', k: 'שַׁמֶּנֶת', earn: 'chapter:1' },
  { id: 'plum', c: '#7a4fb0', f: 'סגול', k: 'סָגֹל', earn: 'chapter:2' },
  { id: 'coral', c: '#f06a6a', f: 'אלמוג', k: 'אַלְמֻג', earn: 'lesson:l1-5' },
  { id: 'sand', c: '#d8b27a', f: 'חול', k: 'חוֹל', earn: 'lesson:l1-4' },
  { id: 'night', c: '#24324a', f: 'כחול לילה', k: 'כָּחֹל לַיְלָה', earn: 'stars:25' },
  { id: 'silver', c: '#c3ccd4', f: 'כסף', k: 'כֶּסֶף', earn: 'puzzles:3' },
  { id: 'gold', c: '#e0a82e', f: 'זהב', k: 'זָהָב', earn: 'stars:40' },
];
// the parts a lesson's tools wear on its field: the default look, with the parts its blocks need
export function lookFor(tool, blocks = []) {
  const look = { ...(DEFAULT_LOOK[tool] || {}) };
  for (const [id, P] of Object.entries(PARTS)) {
    if (P.tool !== tool || !P.gives) continue;
    if (P.gives.some((b) => blocks.includes(b)) && !(PARTS[look[P.socket]] && (PARTS[look[P.socket]].gives || []).some((b) => blocks.includes(b)))) look[P.socket] = id;
  }
  if (tool === 'robot' && blocks.includes('launch')) look.back = 'drone_pad';
  return look;
}
