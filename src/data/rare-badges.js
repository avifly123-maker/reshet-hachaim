// תגים למצטיינים (from 1.4.4 set 9; 1.3.3 carries the ones its own worlds can give): metal medallions rendered in
// Blender (tools/blender/medals.py → art/medals → tools/build-medals.py → src/data/medal-art.js). They are earned by what a
// child has already done elsewhere, read from his own badges (src/core/badges-store.js checkRare runs after every new
// badge), so nothing new has to be counted:
//   bronze: first steps across the game (badges in many places, a total);
//   silver: half of the badges of one world;
//   gold:   every badge of one world (badges of the torah edition only are not needed), or a hundred in all.
// cond: { group, part: 'all' | 'half' } | { total: n } | { groups: [ids], each: n }
// metal: bronze | silver | gold;  emblem: leaf acorn wave sun gear bulb flask lens star (one picture each)
const R = (id, metal, emblem, name, how, cond) => ({ id: 'r_' + id, group: 'rare', rare: { metal, emblem }, name, how, earn: 'rare:' + id, cond });
const ZONES = ['amazon', 'grove', 'reef'];
export const RARE_BADGES = [
  // ── bronze: wide first steps
  R('three', 'bronze', 'leaf', 'מטייל בין האיים', 'תג אחד לפחות בכל שלושת האיים', { groups: ZONES, each: 1 }),
  R('t10', 'bronze', 'star', 'עשרה תגים', 'עשרה תגים בסך הכול', { total: 10 }),
  R('t25', 'bronze', 'gear', 'עשרים וחמישה תגים', 'עשרים וחמישה תגים בסך הכול', { total: 25 }),
  R('deep', 'bronze', 'wave', 'צולל ותיק', 'שני תגים במשלחת לעומק', { groups: ['deep'], each: 2 }),
  R('think', 'bronze', 'lens', 'שואל שאלות', 'שלושה תגים של חוקרי הטבע', { groups: ['research'], each: 3 }),
  R('t50', 'bronze', 'acorn', 'חמישים תגים', 'חמישים תגים בסך הכול', { total: 50 }),
  // ── silver: half of one world
  R('h_amazon', 'silver', 'leaf', 'חצי יער גשם', 'חצי מהתגים של האמזונס', { group: 'amazon', part: 'half' }),
  R('h_grove', 'silver', 'acorn', 'חצי חורש', 'חצי מהתגים של החורש', { group: 'grove', part: 'half' }),
  R('h_reef', 'silver', 'wave', 'חצי שונית', 'חצי מהתגים של השונית', { group: 'reef', part: 'half' }),
  R('h_lab', 'silver', 'flask', 'חצי מעבדה', 'חצי מהתגים של הממציאים והמעבדה', { group: 'lab', part: 'half' }),
  R('h_research', 'silver', 'lens', 'חצי חוקרי טבע', 'חצי מהתגים של חוקרי הטבע', { group: 'research', part: 'half' }),
  // ── gold: a whole world
  R('a_amazon', 'gold', 'leaf', 'שומר יער הגשם', 'כל התגים של האמזונס', { group: 'amazon', part: 'all' }),
  R('a_grove', 'gold', 'acorn', 'שומר החורש', 'כל התגים של החורש', { group: 'grove', part: 'all' }),
  R('a_reef', 'gold', 'wave', 'שומר השונית', 'כל התגים של השונית', { group: 'reef', part: 'all' }),
  R('a_lab', 'gold', 'flask', 'מדען המעבדה', 'כל התגים של הממציאים והמעבדה', { group: 'lab', part: 'all' }),
  R('a_research', 'gold', 'lens', 'חוקר טבע מומחה', 'כל התגים של חוקרי הטבע', { group: 'research', part: 'all' }),
  R('t90', 'gold', 'star', 'תשעים תגים', 'תשעים תגים בסך הכול', { total: 90 }),
];
