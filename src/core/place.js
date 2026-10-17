// The island is only how the place is drawn: in words the children are in the grove, the rainforest or the reef.
// setPlace(biomeId) is called when a zone starts; zoneWord(form) gives the right word with its preposition.
let cur = 'grove';
const WORDS = {
  grove:  { the: 'החורש', in: 'בחורש', to: 'אל החורש', lamed: 'לחורש', from: 'מהחורש', all: 'כל החורש' },
  amazon: { the: 'יער הגשם', in: 'ביער הגשם', to: 'אל יער הגשם', lamed: 'ליער הגשם', from: 'מיער הגשם', all: 'כל יער הגשם' },
  reef: { the: 'השונית', in: 'בשונית', to: 'אל השונית', lamed: 'לשונית', from: 'מהשונית', all: 'כל השונית' },
};
export function setPlace(id) { if (WORDS[id]) cur = id; }
export function zoneWord(form = 'the') { return WORDS[cur][form] || WORDS[cur].the; }
