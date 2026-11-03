// סדנת הרובוט (1.4.3 set 4): the practice island of each zone, where a template mission opens when the child's own
// island cannot give it (src/robolab/island-missions.js practiceView). Made by tools/make-practice-islands.mjs: small
// groups of the zone's plants ([id, x, z, growth]) and animals ([id, x, z]), the same for every child.
export const PRACTICE = {
  amazon: {
    plants: [['heliconia',21.4,-3.4,1], ['heliconia',25,1,0.99], ['heliconia',17.9,3.6,0.99], ['fig',12.1,13.3,0.94], ['kapok',-21.8,4.1,0.96], ['kapok',-14.1,5.4,0.88], ['kapok',-19.5,9.5,0.97], ['acai',1.2,-13.2,0.3], ['acai',1.3,-16.5,0.3], ['acai',-1.4,-11.7,0.3], ['cecropia',22.9,-4.1,0.83], ['cecropia',22.8,-3,0.8]],
    animals: [['toucan',-16.8,17.3], ['capybara',-6.1,-16.8], ['capybara',-13.1,-9.3], ['capybara',-16.4,-16.8]],
    water: [],
  },
  grove: {
    plants: [['sage',21.4,-3.4,1], ['sage',25,1,0.99], ['sage',17.9,3.6,0.99], ['oak',12.1,13.3,0.94], ['oak',12.8,18.7,0.85], ['mastic',-4.2,8.4,0.83], ['carob',-3.2,-15.4,0.3], ['carob',0.1,-9.1,0.3], ['carob',5.5,-9,0.3], ['pine',19.5,-8,0.92], ['pine',19.9,-9.2,0.83]],
    animals: [['blackbird',-23.7,0], ['gazelle',-13.2,-8.6], ['gazelle',-18.8,-8.3], ['gazelle',-22.7,-13.6]],
    water: [],
  },
  reef: {
    plants: [['brain',21.4,-3.4,1], ['brain',25,1,0.99], ['brain',17.9,3.6,0.99], ['table',1.1,15.6,0.94], ['table',1.8,21,0.85], ['table',-4.3,13,0.91], ['branching',7.3,-16.9,0.81], ['branching',6.4,-17,0.8]],
    animals: [['parrotfish',-10,1.5], ['parrotfish',-16.3,-1.8], ['parrotfish',-15.9,1.3]],
    water: [],
  },
  desert: {
    plants: [['caper',21.4,-3.4,1], ['caper',25,1,0.99], ['caper',17.9,3.6,0.99], ['acacia',9.8,14.4,0.94], ['acacia',10.5,19.8,0.85], ['datepalm',-12.6,0,0.97], ['datepalm',-16.9,0.4,0.81], ['saltbush',12.4,-10.8,0.3], ['saltbush',12.5,-14.2,0.3], ['saltbush',9.8,-9.3,0.3]],
    animals: [['dorcas',-7.5,6.4], ['dorcas',-12.6,12.6], ['dorcas',-5.2,7.9], ['fennec',-14.1,-25.1]],
    water: [],
  },
  savanna: {
    plants: [['marula',21.4,-3.4,1], ['marula',25,1,0.99], ['umbrella',-23.4,-4,0.96], ['umbrella',-15.6,-2.7,0.88], ['umbrella',-21,1.4,0.97], ['baobab',2.8,-20.5,0.86], ['baobab',2.7,-20.7,0.81], ['umbrella',12.4,-10.8,0.3], ['umbrella',12.5,-14.2,0.3], ['umbrella',9.8,-9.3,0.3]],
    animals: [['baboon',13,18.5], ['zebra',-15.9,17.6], ['zebra',-10.2,20], ['zebra',-17,14.3]],
    water: [],
  },
};
