// Learning hub test harness. Build: node build.mjs tests/learn-test.js scratch/learn.html --dev
// Screens: window.__wolLearn._go('home'|'setup'|'quiz'|'end'|'album'|'pack'|'duel', {level, biome})
import { createLearningHub } from '../src/learn/hub.js';
const ui = document.getElementById('ui');
ui.className = 'wol';           // same root class as the real game UI (tests the CSS specificity guard)
const cv = document.getElementById('game');
cv.width = innerWidth; cv.height = innerHeight;
const g = cv.getContext('2d'); g.fillStyle = '#5c9a45'; g.fillRect(0, 0, cv.width, cv.height);
const hub = createLearningHub(ui, { onClose: () => console.log('hub closed'), audio: { play: () => {} } });
hub.open();
window.hub = hub;
