// הצנצנת הסגורה (1.4.4 set 6): eight jars. Each has its kind (sea water, forest floor, desert sand), its light, and a
// shelf of creatures to choose from; the model is src/weekly/jar-model.js. A role tells what a creature does in the
// circle; `w` is how much of the jar it takes (a mouse is far too big for a jar: w 3). tests/weekly/jar.mjs proves
// every jar can hold and can break. Facts: docs/sources.md "הצנצנת הסגורה".
export const ROLES = {
  prod: { f: 'צמח: עושה אוויר ואוכל מאור', k: 'צֶמַח: עוֹשֶׂה אֲוִיר', short: ['צמח', 'צֶמַח'], col: '#3a9a4a' },
  graze: { f: 'אוכל צמחים', k: 'אוֹכֵל צְמָחִים', short: ['אוכל צמחים', 'אוֹכֵל צְמָחִים'], col: '#e8952a' },
  clean: { f: 'מנקה: הופך פסולת למזון לצמחים', k: 'מְנַקֶּה', short: ['מנקה', 'מְנַקֶּה'], col: '#8a5a2a' },
  hunt: { f: 'צייד: אוכל אוכלי צמחים', k: 'צַיָּד', short: ['צייד', 'צַיָּד'], col: '#c8402f' },
};
const P = (role, w) => ({ role, ...(w ? { w } : {}) });
const SEA = { algae: P('prod'), seagrass: P('prod'), plankton: P('prod'), urchin: P('graze'), goby: P('graze'), clownfish: P('graze', 2), hermit: P('clean'), sponge: P('clean'), clam: P('clean'), starfish: P('hunt') };
const RAIN = { fern: P('prod'), bromeliad: P('prod'), orchid: P('prod'), heliconia: P('prod'), glowfungus: P('clean'), leafcutter: P('graze', 2), morpho: P('graze'), dartfrog: P('hunt'), agouti: P('graze', 3) };
const GROVE = { cyclamen: P('prod'), anemone: P('prod'), sage: P('prod'), mushroom: P('clean'), harvesterant: P('graze'), butterfly: P('graze'), firefly: P('hunt'), spinymouse: P('graze', 3) };
const SAND = { crust: P('prod'), blooms: P('prod'), anastatica: P('prod'), zygophyllum: P('prod'), darkling: P('clean'), desertsnail: P('graze'), scorpion: P('hunt'), jerboa: P('graze', 3) };
const pick = (o, ids) => Object.fromEntries(ids.map((id) => [id, o[id]]));
// kind: 'sea' | 'forest' | 'sand' (the jar's look); light: 1 a sunny window sill, .7 a bright room, .45 a shady corner
export const JAR_VERSIONS = [
  { id: 'j1', kind: 'sea', light: 0.7, title: 'צנצנת ים', ktitle: 'צִנְצֶנֶת יָם', pool: pick(SEA, ['algae', 'seagrass', 'urchin', 'goby', 'hermit', 'sponge', 'clownfish']), guest: { zone: 'reef', id: 'turtle', name: 'צב ים ירוק', kname: 'צַב יָם יָרֹק' } },
  { id: 'j2', kind: 'forest', light: 0.45, title: 'יער גשם קטנטן', ktitle: 'יַעַר גֶּשֶׁם קְטַנְטַן', pool: pick(RAIN, ['fern', 'bromeliad', 'orchid', 'glowfungus', 'morpho', 'dartfrog', 'agouti']), guest: { zone: 'amazon', id: 'harpy', name: 'עיט הרפיה', kname: 'עֵיט הַרְפְּיָה' } },
  { id: 'j3', kind: 'sand', light: 1, title: 'מדבר בצנצנת', ktitle: 'מִדְבָּר בְּצִנְצֶנֶת', pool: pick(SAND, ['crust', 'blooms', 'anastatica', 'darkling', 'desertsnail', 'scorpion', 'jerboa']), guest: { zone: 'desert', id: 'eagleowl', name: 'אוח מדבר', kname: 'אוֹחַ מִדְבָּר' } },
  { id: 'j4', kind: 'forest', light: 0.7, title: 'פינת חורש', ktitle: 'פִּנַּת חֹרֶשׁ', pool: pick(GROVE, ['cyclamen', 'anemone', 'sage', 'mushroom', 'harvesterant', 'butterfly', 'spinymouse']), guest: { zone: 'grove', id: 'owl', name: 'תנשמת', kname: 'תִּנְשֶׁמֶת' } },
  { id: 'j5', kind: 'sea', light: 1, title: 'שונית על אדן החלון', ktitle: 'שׁוּנִית עַל הַחַלּוֹן', pool: pick(SEA, ['algae', 'plankton', 'seagrass', 'clam', 'sponge', 'goby', 'urchin', 'starfish']), guest: { zone: 'reef', id: 'turtle', name: 'צב ים ירוק', kname: 'צַב יָם יָרֹק' } },
  { id: 'j6', kind: 'forest', light: 0.7, title: 'האמזונס בבקבוק', ktitle: 'הָאֲמָזוֹנָס בְּבַקְבּוּק', pool: pick(RAIN, ['fern', 'heliconia', 'bromeliad', 'glowfungus', 'leafcutter', 'morpho', 'dartfrog']), guest: { zone: 'amazon', id: 'harpy', name: 'עיט הרפיה', kname: 'עֵיט הַרְפְּיָה' } },
  { id: 'j7', kind: 'sand', light: 0.7, title: 'חולות בפינה מוצלת', ktitle: 'חוֹלוֹת בַּצֵּל', pool: pick(SAND, ['crust', 'zygophyllum', 'blooms', 'darkling', 'desertsnail', 'scorpion']), guest: { zone: 'desert', id: 'eagleowl', name: 'אוח מדבר', kname: 'אוֹחַ מִדְבָּר' } },
  { id: 'j8', kind: 'sea', light: 0.45, title: 'ים בפינה חשוכה', ktitle: 'יָם בַּפִּנָּה הַחֲשׁוּכָה', pool: pick(SEA, ['algae', 'seagrass', 'plankton', 'urchin', 'hermit', 'clam', 'clownfish', 'starfish']), guest: { zone: 'reef', id: 'turtle', name: 'צב ים ירוק', kname: 'צַב יָם יָרֹק' } },
];
export const JAR_MIN = { full: 3, kids: 2 };   // at least this many creatures; at most six
// what broke, in רובו־דע's words, and the day's notes for the jar's diary
export const WHY = {
  air: { f: 'לא היה מספיק אוויר. יותר מדי בעלי חיים, מעט מדי צמחים, או מעט מדי אור.', k: 'לֹא הָיָה מַסְפִּיק אֲוִיר. יוֹתֵר מִדַּי חַיּוֹת, אוֹ מְעַט צְמָחִים.' },
  murk: { f: 'הפסולת הצטברה, ואין מי שינקה אותה. מנקים הופכים פסולת למזון לצמחים.', k: 'הַפְּסֹלֶת הִצְטַבְּרָה. צָרִיךְ מְנַקֶּה!' },
  starve: { f: 'הצמחים נגמרו: יותר מדי אוכלי צמחים, או צייד שאכל את כולם.', k: 'הַצְּמָחִים נִגְמְרוּ. יוֹתֵר מִדַּי אוֹכְלִים.' },
  overgrow: { f: 'הצמחים מילאו את כל הצנצנת והתחילו להירקב. אין מי שיאכל אותם.', k: 'הַצְּמָחִים מִלְּאוּ הַכֹּל. אֵין מִי שֶׁיֹּאכַל אוֹתָם.' },
  empty: { f: 'כדי שיהיה מעגל, צריך גם צמחים וגם בעלי חיים.', k: 'צָרִיךְ גַּם צְמָחִים וְגַם חַיּוֹת.' },
  ok: { f: 'הצנצנת חיה ומאוזנת! הצמחים עושים אוויר, בעלי החיים אוכלים, והמנקים הופכים את הפסולת שוב למזון.', k: 'הַצִּנְצֶנֶת חַיָּה! כֻּלָּם עוֹזְרִים זֶה לָזֶה.' },
};
