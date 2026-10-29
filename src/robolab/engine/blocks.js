// The blocks of the robot lab: what each block is (kind), its family (colour on the screen), the picture it shows
// (icon: our own line picture; emo: a clear colour picture for the youngest, Avi 29.10; moves keep their arrows),
// its words (f = full text, k = the beginners' vocalised text), which tools may use it and its parameter.
// The screen (src/robolab/ui/) draws them from this table; run.js runs them; the test tool checks every lesson.
import { ahead, cellAt, canEnter } from './world.js';

export const FAMILIES = {
  move:    { f: 'תנועה',      k: 'תְּנוּעָה',      color: '#3b82c4' },
  act:     { f: 'פעולות',     k: 'פְּעֻלּוֹת',     color: '#3f9a4a' },
  control: { f: 'חזרות ותנאים', k: 'חֲזָרוֹת וּתְנָאִים', color: '#e08a2b' },
  event:   { f: 'אירועים',    k: 'אֵרוּעִים',     color: '#d4a915' },
  mine:    { f: 'הבלוקים שלי', k: 'הַבְּלוֹקִים שֶׁלִּי', color: '#8a5cc4' },
  count:   { f: 'מונים',      k: 'מוֹנִים',       color: '#c4504a' },
  team:    { f: 'צוות',       k: 'צֶוֶת',         color: '#2a9a9a' },
  fun:     { f: 'הפתעות',     k: 'הַפְתָּעוֹת',     color: '#d66aa8' },
};

const ALL = ['robot', 'drone', 'sub'];
// kind: 'act' = one step on the map; 'repeat' / 'until' / 'if' / 'call' = control (costs no step)
export const BLOCKS = {
  fwd:       { kind: 'act', fam: 'move', icon: 'fwd', f: 'קדימה', k: 'קָדִימָה', tools: ALL },
  back:      { kind: 'act', fam: 'move', icon: 'back', f: 'אחורה', k: 'אָחוֹרָה', tools: ALL },
  right:     { kind: 'act', fam: 'move', icon: 'right', f: 'פנה ימינה', k: 'פְּנֵה יָמִינָה', tools: ALL },
  left:      { kind: 'act', fam: 'move', icon: 'left', f: 'פנה שמאלה', k: 'פְּנֵה שְׂמֹאלָה', tools: ALL },
  wait:      { kind: 'act', fam: 'move', icon: 'wait', emo: '⏱️', f: 'חכה רגע', k: 'חַכֵּה רֶגַע', tools: ALL },
  plant:     { kind: 'act', fam: 'act', icon: 'plant', emo: '🌱', f: 'שתול זרע', k: 'שְׁתֹל זֶרַע', tools: ['robot', 'drone'] },
  pick:      { kind: 'act', fam: 'act', icon: 'pick', emo: '🍎', f: 'קטוף פרי', k: 'קְטֹף פְּרִי', tools: ['robot', 'drone'] },
  water:     { kind: 'act', fam: 'act', icon: 'water', emo: '💧', f: 'השקה', k: 'הַשְׁקֵה', tools: ['robot', 'drone'] },
  spray:     { kind: 'act', fam: 'act', icon: 'spray', emo: '🚿', f: 'כבה אש', k: 'כַּבֵּה אֵשׁ', tools: ['drone', 'robot'] },
  photo:     { kind: 'act', fam: 'act', icon: 'photo', emo: '📷', f: 'צלם', k: 'צַלֵּם', tools: ALL },
  collect:   { kind: 'act', fam: 'act', icon: 'collect', emo: '🧺', f: 'אסוף', k: 'אֱסֹף', tools: ALL },
  coral:     { kind: 'act', fam: 'act', icon: 'coral', emo: '🪸', f: 'שתול אלמוג', k: 'שְׁתֹל אַלְמֹג', tools: ['sub'] },
  repeat:    { kind: 'repeat', fam: 'control', icon: 'repeat', emo: '🔁', f: 'חזור', k: 'חֲזֹר', param: 'n', tools: ALL },
  until:     { kind: 'until', fam: 'control', icon: 'until', emo: '⏳', f: 'חזור עד ש', k: 'חֲזֹר עַד שֶׁ', param: 'c', tools: ALL },
  if:        { kind: 'if', fam: 'control', icon: 'if', emo: '❓', f: 'אם', k: 'אִם', param: 'c', tools: ALL },
  call:      { kind: 'call', fam: 'mine', icon: 'mine', emo: '🧩', f: 'הבלוק שלי', k: 'הַבְּלוֹק שֶׁלִּי', param: 'f', tools: ALL },
  add:       { kind: 'act', fam: 'count', icon: 'add', emo: '🔢', f: 'הוסף אחד למונה', k: 'הוֹסֵף אֶחָד לַמּוֹנֶה', tools: ALL },
  report:    { kind: 'act', fam: 'count', icon: 'report', emo: '📢', f: 'דווח', k: 'דַּוֵּחַ', tools: ALL },
  reset:     { kind: 'act', fam: 'count', icon: 'reset', emo: '🔄', f: 'אפס מונה', k: 'אַפֵּס מוֹנֶה', tools: ALL },
  launch:    { kind: 'act', fam: 'team', icon: 'launch', emo: '🚀', f: 'שגר רחפן', k: 'שַׁגֵּר רַחְפָן', tools: ['robot'] },
  land:      { kind: 'act', fam: 'team', icon: 'land', emo: '🛬', f: 'נחת על הרובוט', k: 'נְחַת עַל הָרוֹבּוֹט', tools: ['drone'] },
  // the tools talk (Avi, 29.10): a signal goes to everyone on the field, today the three tools, later stations, sensors
  // and other bodies (engine/world.js W.listen). The signal is one of SIGNALS, chosen on the block (param m).
  send:      { kind: 'act', fam: 'team', icon: 'send', emo: '📡', f: 'שלח אות', k: 'שְׁלַח אוֹת', tools: ALL, param: 'm' },
  waitmsg:   { kind: 'waitmsg', fam: 'team', icon: 'waitmsg', emo: '📻', f: 'חכה לאות', k: 'חַכֵּה לְאוֹת', tools: ALL, param: 'm' },
  // events (chapter 5): a hat block starts a handler of its own under the tool's program (editor.js); 'stop' ends a program
  when_sunset: { kind: 'hat', fam: 'event', icon: 'sunset', emo: '🌅', ev: 'sunset', f: 'כשהשמש שוקעת', k: 'כְּשֶׁהַשֶּׁמֶשׁ שׁוֹקַעַת', tools: ALL },
  when_animal: { kind: 'hat', fam: 'event', icon: 'photo', emo: '👀', ev: 'see_animal', f: 'כשאני רואה בעל חיים', k: 'כְּשֶׁאֲנִי רוֹאֶה בַּעַל חַיִּים', tools: ALL },
  when_low:    { kind: 'hat', fam: 'event', icon: 'low', emo: '🔋', ev: 'battery_low', f: 'כשהסוללה חלשה', k: 'כְּשֶׁהַסּוֹלְלָה חַלָּשָׁה', tools: ['drone'] },
  when_msg:    { kind: 'hat', fam: 'event', icon: 'waitmsg', emo: '📻', ev: 'msg', param: 'm', f: 'כשמגיע אות', k: 'כְּשֶׁמַּגִּיעַ אוֹת', tools: ALL },
  stop:        { kind: 'stop', fam: 'event', icon: 'stop', emo: '🛑', f: 'עצור', k: 'עֲצֹר', tools: ALL },
  fireworks: { kind: 'act', fam: 'fun', icon: 'fireworks', emo: '🎆', f: 'זיקוקים!', k: 'זִקּוּקִים!', tools: ALL },
  dance:     { kind: 'act', fam: 'fun', icon: 'dance', emo: '🎶', f: 'ריקוד ניצחון', k: 'רִקּוּד נִצָּחוֹן', tools: ALL },
  beep:      { kind: 'act', fam: 'fun', icon: 'beep', emo: '🔔', f: 'צפצף', k: 'צַפְצֵף', tools: ALL },
  lights:    { kind: 'act', fam: 'fun', icon: 'lights', emo: '💡', f: 'אורות צבעוניים', k: 'אוֹרוֹת צִבְעוֹנִיִּים', tools: ALL },
  sneeze:    { kind: 'act', fam: 'fun', icon: 'sneeze', emo: '💨', f: 'התעטש', k: 'הִתְעַטֵּשׁ', tools: ALL },
};

// the signals the tools send each other: a colour and a shape each (easy to tell apart without reading)
export const SIGNALS = {
  a: { f: 'אות כתום', k: 'אוֹת כָּתֹם', color: '#e8873a', shape: 'circle' },
  b: { f: 'אות כחול', k: 'אוֹת כָּחֹל', color: '#3b82c4', shape: 'triangle' },
  c: { f: 'אות ירוק', k: 'אוֹת יָרֹק', color: '#3f9a4a', shape: 'star' },
};

// sensors for 'if' and 'until': what the tool sees right now
const free = (W, T, tool) => { const [x, y] = ahead(W, T); return canEnter(W, tool, x, y); };
const toolName = (W, T) => Object.keys(W.tools).find((k) => W.tools[k] === T);
export const SENSORS = {
  path:      { f: 'הדרך פנויה', k: 'הַדֶּרֶךְ פְּנוּיָה', test: (W, T) => free(W, T, toolName(W, T)) },
  blocked:   { f: 'יש מכשול לפניי', k: 'יֵשׁ מִכְשׁוֹל לְפָנַי', test: (W, T) => !free(W, T, toolName(W, T)) },
  tree:      { f: 'יש עץ לפניי', k: 'יֵשׁ עֵץ לְפָנַי', test: (W, T) => { const [x, y] = ahead(W, T); return cellAt(W, x, y) === 'T'; } },
  water:     { f: 'יש מים לפניי', k: 'יֵשׁ מַיִם לְפָנַי', test: (W, T) => { const [x, y] = ahead(W, T); return cellAt(W, x, y) === '~'; } },
  spot:      { f: 'אני על מקום שתילה', k: 'אֲנִי עַל מְקוֹם שְׁתִילָה', test: (W, T) => !!W.itemAt(T.x, T.y, 'seed') },
  fruit:     { f: 'יש כאן פרי', k: 'יֵשׁ כָּאן פְּרִי', test: (W, T) => !!W.itemAt(T.x, T.y, 'fruit') },
  thirsty:   { f: 'יש כאן צמח צמא', k: 'יֵשׁ כָּאן צֶמַח צָמֵא', test: (W, T) => !!W.itemAt(T.x, T.y, 'thirsty') },
  fire:      { f: 'יש אש לפניי', k: 'יֵשׁ אֵשׁ לְפָנַי', test: (W, T) => { const [x, y] = ahead(W, T); return !!(W.itemAt(x, y, 'fire') || W.itemAt(T.x, T.y, 'fire')); } },
  animal:    { f: 'אני רואה בעל חיים', k: 'אֲנִי רוֹאֶה בַּעַל חַיִּים', test: (W, T) => { for (let k = 0; k <= 2; k++) { const [x, y] = ahead(W, T, k); if (W.itemAt(x, y, 'animal')) return true; } return false; } },
  here_animal: { f: 'יש כאן בעל חיים', k: 'יֵשׁ כָּאן בַּעַל חַיִּים', test: (W, T) => !!W.itemAt(T.x, T.y, 'animal') || W.items.some((it) => it.t === 'animal' && it.done && it.x === T.x && it.y === T.y) },
  coralspot: { f: 'כאן מחכה אלמוג צעיר', k: 'כָּאן מְחַכֶּה אַלְמֹג צָעִיר', test: (W, T) => !!W.itemAt(T.x, T.y, 'coral') },
  net:       { f: 'יש כאן רשת', k: 'יֵשׁ כָּאן רֶשֶׁת', test: (W, T) => !!(W.itemAt(T.x, T.y, 'net') || W.itemAt(T.x, T.y, 'trash')) },
  home:      { f: 'הגעתי הביתה', k: 'הִגַּעְתִּי הַבַּיְתָה', test: (W, T) => !!W.home && T.x === W.home.x && T.y === W.home.y },
  low:       { f: 'הסוללה חלשה', k: 'הַסּוֹלְלָה חַלָּשָׁה', test: (W, T) => T.battery > 0 && T.battery <= 3 },
};

// the events a program can wait for ("כש…"): the screen shows them as hat blocks
export const EVENTS = {
  sunset:      { f: 'כשהשמש שוקעת', k: 'כְּשֶׁהַשֶּׁמֶשׁ שׁוֹקַעַת' },
  see_animal:  { f: 'כשאני רואה בעל חיים', k: 'כְּשֶׁאֲנִי רוֹאֶה בַּעַל חַיִּים' },
  battery_low: { f: 'כשהסוללה חלשה', k: 'כְּשֶׁהַסּוֹלְלָה חַלָּשָׁה' },
  msg:         { f: 'כשמגיע אות', k: 'כְּשֶׁמַּגִּיעַ אוֹת', param: 'm' },   // runs its body, then the tool goes back to its program
};
