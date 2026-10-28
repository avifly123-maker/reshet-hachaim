// חוקרי הטבע – pictures for the ideas and board rows of the mysteries "איפה הצפרדעים?", "החורש שלא מתחדש" and
// "הנמלים שאכלו את היער". Same style as R_ICONS in ui.js (a coloured disc, a simple drawing); ui.js merges them in.
// No cross shapes: rails end at the posts, a net is a sheet with dots, the sun has no rays.
const svgURL = (body, bg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${bg}"/>${body}</svg>`);

export const CASE_ICONS = {
  // ants and small insects on the forest floor
  bugs: svgURL('<path d="M10 48h44" stroke="#8a5a32" stroke-width="3"/><g fill="#5a3a22"><circle cx="16" cy="40" r="2.6"/><circle cx="21" cy="40" r="2"/><circle cx="25.5" cy="40" r="3"/>'
    + '<circle cx="36" cy="30" r="2.6"/><circle cx="41" cy="30" r="2"/><circle cx="45.5" cy="30" r="3"/></g><g fill="#7a9a3a"><ellipse cx="30" cy="20" rx="5" ry="3.5"/></g>'
    + '<path d="M14 38c-2-3-2-5 0-7M34 28c-2-3-2-5 0-7" stroke="#5a3a22" stroke-width="1.4" fill="none"/>', '#efe6d2'),
  // a bromeliad rosette holding a little pool of rain water
  pools: svgURL('<g fill="#d1495b"><path d="M32 50c-10-2-18-10-20-22 8 4 14 10 20 22z"/><path d="M32 50c10-2 18-10 20-22-8 4-14 10-20 22z"/></g>'
    + '<g fill="#e8707e"><path d="M32 50c-5-6-7-16-4-28 4 8 5 18 4 28z"/><path d="M32 50c5-6 7-16 4-28-4 8-5 18-4 28z"/></g><ellipse cx="32" cy="36" rx="8" ry="3.5" fill="#3a8fd0"/>'
    + '<ellipse cx="30" cy="35.3" rx="3" ry="1" fill="#bfe3ff"/>', '#e6f1f8'),
  // a tadpole in a drop of water
  tadpole: svgURL('<path d="M32 10c-9 12-15 21-15 29a15 15 0 0 0 30 0c0-8-6-17-15-29z" fill="#9fd0f0"/><ellipse cx="29" cy="40" rx="6" ry="5" fill="#3a3028"/>'
    + '<path d="M34 41c4 1 6-2 9 0s4 3 6 1" stroke="#3a3028" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="27" cy="38.5" r="1.2" fill="#fff"/>', '#e6f1f8'),
  // little cups of water standing on a branch
  cups: svgURL('<path d="M8 40c14-3 34-3 48 1" stroke="#7a5530" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<path d="M17 25h12l-2 13h-8z" fill="#f4f6f7" stroke="#b5c3cc" stroke-width="1.2"/><path d="M18 28h10" stroke="#3a8fd0" stroke-width="3"/>'
    + '<path d="M36 26h12l-2 13h-8z" fill="#f4f6f7" stroke="#b5c3cc" stroke-width="1.2"/><path d="M37 29h10" stroke="#3a8fd0" stroke-width="3"/>', '#e3efd6'),
  // a bucket pouring water on the ground
  watering: svgURL('<path d="M10 52h44" stroke="#8a5a32" stroke-width="3"/><ellipse cx="36" cy="50" rx="14" ry="3" fill="#3a8fd0" fill-opacity=".55"/>'
    + '<path d="M14 18l16 4-3 14-14-4z" fill="#9fb4c4" stroke="#6e7a86" stroke-width="1.5"/><path d="M28 30c4 4 6 9 7 16" stroke="#3a8fd0" stroke-width="3.5" fill="none" stroke-linecap="round"/>', '#e6f1f8'),
  // a small camera on a long pole, peeking into a bromeliad
  polecam: svgURL('<path d="M14 54L38 22" stroke="#7d8f9b" stroke-width="3" stroke-linecap="round"/><rect x="35" y="12" width="14" height="10" rx="3" fill="#33414d"/>'
    + '<circle cx="45" cy="17" r="3" fill="#7fc8ff"/><g fill="#d1495b"><path d="M46 46c-6-1-9-5-10-10 4 2 7 5 10 10z"/><path d="M46 46c6-1 9-5 10-10-4 2-7 5-10 10z"/></g>', '#e6f1f8'),
  // a pile of big boulders
  rocks: svgURL('<path d="M8 50h48" stroke="#a37a4c" stroke-width="3"/><g stroke="#6e6a64" stroke-width="1.5"><ellipse cx="22" cy="43" rx="11" ry="7" fill="#a8a29a"/>'
    + '<ellipse cx="42" cy="44" rx="10" ry="6" fill="#b8b2aa"/><ellipse cx="32" cy="32" rx="10" ry="7" fill="#9a948c"/><ellipse cx="45" cy="30" rx="6" ry="4.5" fill="#aaa49c"/></g>'
    + '<path d="M28 31c2-2 5-2 7 0" stroke="#5a5650" stroke-width="1.5" fill="none"/>', '#f1e9d6'),
  // an acorn
  acorn: svgURL('<path d="M32 12v6" stroke="#6b4a2a" stroke-width="3" stroke-linecap="round"/><path d="M19 27c0-6 6-10 13-10s13 4 13 10z" fill="#8a6038"/>'
    + '<path d="M21 27h22c0 12-5 21-11 21s-11-9-11-21z" fill="#c8955a"/><path d="M24 29c0 7 2 12 5 15" stroke="#e0b47a" stroke-width="2" fill="none"/>'
    + '<g fill="#6b4a2a"><circle cx="25" cy="23" r="1.3"/><circle cx="31" cy="21" r="1.3"/><circle cx="37" cy="23" r="1.3"/></g>', '#f1e5cf'),
  // a young tree
  sapling: svgURL('<path d="M32 50V32" stroke="#7a5530" stroke-width="4"/><circle cx="32" cy="26" r="11" fill="#4f8a3f"/><circle cx="27" cy="23" r="5" fill="#6fbf4a"/>'
    + '<path d="M14 51h36" stroke="#8a5a32" stroke-width="3.5"/>', '#e6f2da'),
  // a tube shelter round a young oak
  shelter: svgURL('<path d="M12 51h40" stroke="#8a5a32" stroke-width="3.5"/><rect x="24" y="22" width="16" height="29" rx="3" fill="#bfe0c8" fill-opacity=".85" stroke="#6a9a7a" stroke-width="1.5"/>'
    + '<path d="M32 40V18" stroke="#3f8f2e" stroke-width="2.5"/><path d="M32 22c-2-6-7-8-12-7 0 5 5 8 12 7zM32 19c2-6 7-8 12-7 0 5-5 8-12 7z" fill="#6fbf4a"/>', '#e6f2da'),
  // a fence: posts, with the rails ending at each post
  fence: svgURL('<path d="M8 51h48" stroke="#8a5a32" stroke-width="3"/><g fill="#a8743a"><rect x="12" y="22" width="5" height="29" rx="1.5"/><rect x="29.5" y="22" width="5" height="29" rx="1.5"/><rect x="47" y="22" width="5" height="29" rx="1.5"/></g>'
    + '<g stroke="#c8955a" stroke-width="3"><path d="M17 30h12.5M34.5 30H47M17 42h12.5M34.5 42H47"/></g>', '#f1e9d6'),
  // a heap of greens spread on the ground
  feed: svgURL('<path d="M10 50h44" stroke="#8a5a32" stroke-width="3"/><path d="M14 50c2-10 10-16 18-16s16 6 18 16z" fill="#8fbf5a"/>'
    + '<g fill="#5f9a3a"><ellipse cx="24" cy="41" rx="5" ry="2.5" transform="rotate(-20 24 41)"/><ellipse cx="38" cy="40" rx="5" ry="2.5" transform="rotate(25 38 40)"/><ellipse cx="31" cy="36" rx="4.5" ry="2.2"/></g>'
    + '<g fill="#e8a03a"><circle cx="20" cy="47" r="1.8"/><circle cx="44" cy="46" r="1.8"/><circle cx="33" cy="45" r="1.6"/></g>', '#f1e9d6'),
  // soft sun-loving plants under the sun (a plain disc, no rays)
  softplants: svgURL('<circle cx="46" cy="18" r="7" fill="#ffd23f"/><circle cx="46" cy="18" r="10" fill="#ffd23f" fill-opacity=".3"/><path d="M10 52h44" stroke="#8a5a32" stroke-width="3"/>'
    + '<g fill="#7ccf5a"><path d="M20 52c-8-6-10-14-8-22 6 4 9 12 8 22z"/><path d="M28 52c2-10 8-16 16-18-1 8-7 15-16 18z"/><path d="M34 52c-4-8-3-15 2-21 3 7 2 14-2 21z"/></g>', '#fbf1d6'),
  // a tree crown and the shade it casts
  shade: svgURL('<ellipse cx="34" cy="49" rx="20" ry="5" fill="#3a5a3a" fill-opacity=".45"/><path d="M30 48V30" stroke="#7a5530" stroke-width="4"/>'
    + '<circle cx="30" cy="24" r="13" fill="#3f7a3a"/><circle cx="24" cy="20" r="6" fill="#5f9a4a"/><circle cx="50" cy="14" r="5" fill="#ffd23f"/>', '#e6f2da'),
  // a shade net on two poles (a sheet with dots, no grid)
  shadenet: svgURL('<path d="M14 52V22M50 52V22" stroke="#7d8f9b" stroke-width="3"/><path d="M12 22c8-4 32-4 40 0v6c-8-4-32-4-40 0z" fill="#3a6a4a"/>'
    + '<g fill="#8fbf7a"><circle cx="20" cy="23" r="1"/><circle cx="26" cy="22" r="1"/><circle cx="32" cy="21.6" r="1"/><circle cx="38" cy="22" r="1"/><circle cx="44" cy="23" r="1"/></g>'
    + '<path d="M10 52h44" stroke="#8a5a32" stroke-width="3"/><g fill="#7ccf5a"><path d="M24 52c-4-4-5-8-4-12 3 3 4 7 4 12z"/><path d="M38 52c4-4 5-8 4-12-3 3-4 7-4 12z"/></g>', '#e6f2da'),
  // plants cut short, the cut leaves lying by them
  cutplants: svgURL('<path d="M10 50h44" stroke="#8a5a32" stroke-width="3"/><g stroke="#5f9a3a" stroke-width="3" stroke-linecap="round"><path d="M20 50v-8M30 50v-10M40 50v-7"/></g>'
    + '<g fill="#7ccf5a"><ellipse cx="18" cy="30" rx="7" ry="3" transform="rotate(-15 18 30)"/><ellipse cx="34" cy="26" rx="7" ry="3" transform="rotate(10 34 26)"/><ellipse cx="46" cy="32" rx="6" ry="2.6" transform="rotate(-25 46 32)"/></g>', '#fbf1d6'),
  // a heap of leaves by an ant nest
  leafpile: svgURL('<path d="M8 50h48" stroke="#8a5a32" stroke-width="3"/><path d="M34 50c2-7 7-11 13-11s9 4 10 11z" fill="#c8955a"/><circle cx="46" cy="44" r="2" fill="#5a3a22"/>'
    + '<g fill="#5f9a3a"><ellipse cx="18" cy="44" rx="8" ry="3.5" transform="rotate(-10 18 44)"/><ellipse cx="22" cy="38" rx="7" ry="3" transform="rotate(20 22 38)"/></g>'
    + '<g fill="#8fcf5a"><ellipse cx="14" cy="38" rx="6" ry="2.6" transform="rotate(-30 14 38)"/><ellipse cx="27" cy="44" rx="6" ry="2.6" transform="rotate(15 27 44)"/></g>', '#efe6d2'),
  // 1.4, the desert: wind blowing sand over a low dune (curved streaks and grains, nothing crossing)
  sandwind: svgURL('<path d="M6 50c10-8 22-10 34-6 6 2 12 2 18-1v13H6z" fill="#e0b46a"/>'
    + '<g stroke="#a8743a" stroke-width="3" fill="none" stroke-linecap="round"><path d="M10 22c10-4 22-4 30 0"/><path d="M16 31c10-3 20-3 30 1"/><path d="M8 40c8-2 14-2 20 0"/></g>'
    + '<g fill="#c8904a"><circle cx="46" cy="22" r="2"/><circle cx="52" cy="27" r="1.6"/><circle cx="50" cy="35" r="1.8"/><circle cx="34" cy="40" r="1.5"/></g>', '#fbeccf'),
  // acacia pods: two curly brown pods on the sand (no crossing shapes)
  pods: svgURL('<path d="M8 52h48" stroke="#c8a070" stroke-width="3"/><path d="M14 44c4-10 10-4 14-12s10-6 12-14" stroke="#9a6a3a" stroke-width="6" fill="none" stroke-linecap="round"/>'
    + '<path d="M30 48c6-2 8-8 14-8s8-4 10-8" stroke="#b07a42" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="#5a3a22"><circle cx="18" cy="40" r="1.4"/><circle cx="25" cy="34" r="1.4"/><circle cx="33" cy="26" r="1.4"/></g>', '#f6ead6'),
};
