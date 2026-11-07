// services.js – the shared services of a page (from 1.4.1): a part asks for them when it needs them (they may be missing
// while the page starts, or in a test page, so every reader allows null). In 1.3.3 the guide and the app are still the
// window handles main.js and robo-guide.js set, so the readers fall back to them.
//   setService(name, value)   svcGuide()   svcApp()
const S = Object.create(null);
export function setService(name, value) { S[name] = value; }
export const svcGuide = () => S.guide || (typeof window !== 'undefined' && window.__guide) || null;
export const svcApp = () => S.app || (typeof window !== 'undefined' && window.__app) || null;
