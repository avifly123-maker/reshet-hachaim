// How a robot-lab prize is earned, in words (full and with nikud). No data imports: the learning hub's album uses it for
// the technology cards (src/ui/tech-card.js) without loading the lab. The rules themselves are in earn.js `earned`.
export function earnWords(earn, kids) {
  const [k, v] = String(earn || '').split(':');
  const w = (f, kk) => (kids ? kk : f);
  if (k === 'lesson') return w('נפתח אחרי השיעור ' + v.replace('l', '').replace('-', '.'), 'נִפְתָּח אַחֲרֵי הַשִּׁעוּר ' + v.replace('l', '').replace('-', '.'));
  if (k === 'chapter') return w('נפתח כשמסיימים את פרק ' + v, 'נִפְתָּח כְּשֶׁמְּסַיְּמִים אֶת פֶּרֶק ' + v);
  if (k === 'stars') return w('נפתח ב־' + v + ' כוכבים', 'נִפְתָּח בְּ־' + v + ' כּוֹכָבִים');
  if (k === 'puzzles') return w('נפתח אחרי ' + v + ' חידות', 'נִפְתָּח אַחֲרֵי ' + v + ' חִידוֹת');
  if (k === 'wk') return [null, w('נפתח בכניסה הראשונה לסדנת הרובוט', 'נִפְתָּח בַּכְּנִיסָה הָרִאשׁוֹנָה לְסַדְנַת הָרוֹבּוֹט'), w('נפתח אחרי הניסוי הראשון במסלול', 'נִפְתָּח אַחֲרֵי הַנִּסּוּי הָרִאשׁוֹן בַּמַּסְלוּל'), w('נפתח אחרי שלושה ניסויים מוצלחים', 'נִפְתָּח אַחֲרֵי שְׁלוֹשָׁה נִסּוּיִים מֻצְלָחִים'),
    w('נפתח אחרי שלוש משימות רובוט', 'נִפְתָּח אַחֲרֵי שָׁלוֹשׁ מְשִׂימוֹת רוֹבּוֹט'), w('נפתח אחרי שמונה משימות רובוט', 'נִפְתָּח אַחֲרֵי שְׁמוֹנֶה מְשִׂימוֹת רוֹבּוֹט')][+v] || '';
  if (k === 'isl') return w('נפתח אחרי משימה באי שלכם', 'נִפְתָּח אַחֲרֵי מְשִׂימָה בָּאִי שֶׁלָּכֶם');
  return '';
}
