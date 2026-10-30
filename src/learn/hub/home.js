// מרכז הלמידה – the home page of the hub (album in the middle, quiz / badges / frames on one side, the card games on
// the other), the badges screen with its zoom, the frames screen, and the settings window (torah edition switch).
// Exports: createHomeScreens(ctx) → { renderHome, bzoom, openSettings, renderBadges, renderFrames }.
// Needs from ctx (index.js): main, modal, S, sfx, locked, srcOn, collection, MODE, opensLeft (packs.js).
import { chosenFrame, openFrames, ownedBadges } from '../../core/badges-store.js';
import { sourcesOn } from '../../core/edition.js';
import { PARTS as JPARTS, lockInfo } from '../../core/journey.js';
import { BADGES, BADGE_GROUPS, FRAMES } from '../../data/badges.js';
import { CARD_ART } from '../../data/card-art.js';
import { badgeHTML } from '../../ui/badge-art.js';
import { TILE_TONE, tileIcon } from '../../ui/icons-hub.js';
import { SOURCES_T } from '../../ui/settings.js';
import { icon } from '../../ui/ui.js';
import { IC, IC_CURTAIN, OPEN_PER_DAY, esc } from './base.js';
import { cardHTML } from './card-html.js';
import { CARD, spOf } from './cards.js';

// the hub's icons (src/ui/icons-hub.js): the tile of each badge group
const BGROUP_IC = { amazon: 'amazon', grove: 'grove', reef: 'reef', desert: 'desert', lab: 'invent', deep: 'dive', research: 'research', sources: 'scroll' };

export function createHomeScreens(ctx) {
  const { main, modal, S, sfx, locked, srcOn, collection } = ctx;
  const opensLeft = () => ctx.opensLeft();   // packs.js (made after this part)
  const K = (f, k) => (ctx.MODE === 'kids' ? k : f);   // beginners read these screens' words fully vocalised
  /* ── home (1.3.2): one page. Right: the quiz, my badges, my frames; middle: the album; left: the card games.
     A part that is not open yet (core/journey.js) is veiled: dimmed, a curtain, and the words of what opens it. */
  const HOME_GAMES = [
    { part: 'webpuzzle', ic: 'thread', name: 'חוט הקשר' },
    { part: 'keepforest', ic: 'keep', name: 'מחזיקים את הסביבה' },
    { part: 'duel', ic: 'strong', name: 'מי חזק ברשת?' },
    { part: 'inventors', ic: 'invent', name: 'הממציאים' },
    { part: 'expedition', ic: 'dive', name: 'משלחת לעומק' },
    { part: 'versematch', ic: 'scroll', name: 'מה הפסוק מלמד?', torah: true },
  ];
  const FRAME_SAMPLE = ['amazon:toucan', 'grove:owl', 'reef:clownfish', 'amazon:jaguar', 'grove:jay'];
  function renderHome() {
    const { total, have } = collection();
    const veiled = (p) => locked(p);
    const vc = (p) => (veiled(p) ? ' is-veiled' : '');
    const act = (p, a, extra = '') => (veiled(p) ? `data-wl="locked" data-part="${p}" aria-disabled="true"` : `data-wl="${a}" ${extra}`);
    const veil = (p) => { if (!veiled(p)) return ''; const L = lockInfo(p); return `<span class="wl-veil">${IC_CURTAIN}<span>${esc(L ? L.text : '')}</span></span>`; };
    const fan = ['amazon:jaguar', 'grove:owl', 'amazon:toucan'].map((id) => CARD.get(id)).filter(Boolean);
    const toucan = spOf('amazon', 'toucan');
    // my badges: the three newest
    const ownB = ownedBadges(), mine = vBadges().filter((b) => ownB[b.id]).sort((a, b) => ownB[b.id] - ownB[a.id]);
    // my frames: the chosen one on one of my cards
    const fr = chosenFrame(), frame = FRAMES.find((f) => f.id === fr), frOpen = openFrames().filter(visB).length, frAll = FRAMES.filter(visB).length;
    const sample = CARD.get(FRAME_SAMPLE.find((id) => S.owned[id]) || Object.keys(S.owned).find((id) => CARD.has(id)) || FRAME_SAMPLE[0]);
    const late = S.packs && !opensLeft();
    const games = HOME_GAMES.filter((g) => !g.torah || srcOn());
    const of = K('מתוך', 'מִתּוֹךְ');
    main.innerHTML = `<section class="wl-screen wl-home">
      <div class="wl-hside">
        <button class="wl-ht wl-hq paper${vc('quiz')}" ${act('quiz', 'setup')} aria-label="חידון">
          <span class="wl-hqart"><span class="wl-qbubble">${CARD_ART.toucan ? `<img src="${CARD_ART.toucan}" alt="">` : toucan && toucan.img ? `<img src="${toucan.img}" alt="">` : ''}</span><span class="wl-qbadge">${IC.quest}</span></span>
          <span class="wl-htx"><b class="wl-hh">${tileIcon('quiz', 'wl-tic')}${K('חידון', 'חִידוֹן')}</b><small>${K('עשר שאלות על היצורים. תשובה נכונה יכולה להביא חבילת קלפים!', 'עֶשֶׂר שְׁאֵלוֹת עַל הַיְּצוּרִים. תְּשׁוּבָה נְכוֹנָה יְכוֹלָה לְהָבִיא חֲבִילַת קְלָפִים!')}</small></span>
          ${veil('quiz')}</button>
        <button class="wl-ht wl-hb paper${vc('badges')}" ${act('badges', 'badges')} aria-label="התגים שלי">
          <span class="wl-hrow"><b class="wl-hh">${tileIcon('medal', 'wl-tic')}${K('התגים שלי', 'הַתָּגִים שֶׁלִּי')}</b><span class="wl-hn">${mine.length} ${of} ${vBadges().length}</span></span>
          <span class="wl-hbrow">${mine.length ? mine.slice(0, 3).map((b) => badgeHTML(b, { own: true })).join('') : `<span class="wl-hempty">${K('עוד אין לכם תגים. משחקים, חוקרים ומקבלים!', 'עוֹד אֵין לָכֶם תָּגִים. מְשַׂחֲקִים, חוֹקְרִים וּמְקַבְּלִים!')}</span>`}</span>
          ${veil('badges')}</button>
        <button class="wl-ht wl-hf paper${vc('frames')}" ${act('frames', 'frames')} aria-label="המסגרות שלי">
          <span class="wl-hfcard">${sample ? cardHTML(sample, { cls: fr !== 'none' ? 'fr-' + fr : '' }) : ''}</span>
          <span class="wl-htx"><b class="wl-hh">${tileIcon('frame', 'wl-tic')}${K('המסגרות שלי', 'הַמִּסְגָּרוֹת שֶׁלִּי')}</b>
            <small>${fr === 'none' || !frame ? K('עוד לא בחרתם מסגרת', 'עוֹד לֹא בְּחַרְתֶּם מִסְגֶּרֶת') : K('בחרתם: ', 'בְּחַרְתֶּם: ') + esc(frame.name)}</small>
            <small class="wl-hn">${frOpen} ${of} ${frAll} ${K('פתוחות', 'פְּתוּחוֹת')}</small></span>
          ${veil('frames')}</button>
      </div>
      <div class="wl-hmid">
        <button class="wl-ht wl-ha paper${vc('album')}" ${act('album', 'album')} aria-label="אלבום הקלפים">
          <span class="wl-hfan">${fan.map((c) => cardHTML(c)).join('')}</span>
          <span class="wl-hab"><b class="wl-hh big">${tileIcon('album', 'wl-tic')}${K('אלבום הקלפים', 'אַלְבּוֹם הַקְּלָפִים')}</b>
            <span class="wl-hcount">${K('אספתם', 'אֲסַפְתֶּם')} <b>${have}</b> ${of} <b>${total}</b> ${K('קלפים', 'קְלָפִים')}</span>
            <span class="wl-meter"><i style="width:${Math.round((have / total) * 100)}%"></i></span></span>
          ${veil('album')}</button>
        ${veiled('album') ? '' : S.packs ? `<button class="wl-btn gold wl-hpack" data-wl="pack" ${late ? 'disabled' : ''} title="${late ? 'היום כבר פתחתם ' + OPEN_PER_DAY + ' חבילות. מחר אפשר לפתוח עוד' : 'פתחו חבילה'}">${icon('pack')}<span>${late ? K('עוד חבילות מחר', 'עוֹד חֲבִילוֹת מָחָר') : K('פתחו חבילה', 'פִּתְחוּ חֲבִילָה')}</span><span class="wl-badgeN">${S.packs}</span></button>`
          : `<span class="wl-hnopack">${IC.quest}<span>${K('שחקו בחידון כדי להרוויח חבילות', 'שַׂחֲקוּ בַּחִידוֹן כְּדֵי לְהַרְוִיחַ חֲבִילוֹת')}</span></span>`}
      </div>
      <div class="wl-hgames">
        <h3 class="wl-hgh">${IC.cards}${K('משחקי קלפים', 'מִשְׂחֲקֵי קְלָפִים')}</h3>
        <div class="wl-hgrid n${games.length}">${games.map((g) => `<button class="wl-gt${vc(g.part)}" ${act(g.part, 'game', `data-g="${g.part}"`)} style="--tc:${TILE_TONE[g.ic] || '#3a4d5c'}" aria-label="${esc(g.name)}">${tileIcon(g.ic, 'wl-tic')}<b>${esc(ctx.MODE === 'kids' && JPARTS[g.part] ? JPARTS[g.part].kname : g.name)}</b>${veil(g.part)}</button>`).join('')}</div>
      </div>
    </section>`;
  }
  /* ── badges: the ones this edition shows (the torah edition's own only while "מקורות ופסוקים" is on) */
  const visB = (x) => !x.torah || srcOn();
  const vBadges = () => { const own = ownedBadges(); return BADGES.filter((b) => visB(b) && (!b.retired || own[b.id])); };   /* a retired badge shows only to who earned it */
  // a badge you can point at: it grows, and shows its name and how it is earned; a click (or a touch) opens it big
  const bzHTML = (b, own, cls = '') => `<button class="wl-bz ${cls}" data-wl="bzoom" data-b="${b.id}" aria-label="${esc(own ? b.name + ': ' + b.how : K('תג נעול: ', 'תָּג נָעוּל: ') + b.how)}">${badgeHTML(b, { own, peek: !own && cls.includes('next') })}
    <span class="wl-btip" aria-hidden="true"><b>${esc(own ? b.name : K('עוד לא: ', 'עוֹד לֹא: ') + b.name)}</b><small>${esc(b.how)}</small></span></button>`;
  function bzoom(id) {
    const b = BADGES.find((x) => x.id === id); if (!b) return;
    const own = ownedBadges(), g = BADGE_GROUPS.find((x) => x.id === b.group);
    sfx('select');
    const when = own[b.id] ? new Date(own[b.id]) : null;
    modal.innerHTML = `<div class="wl-bzbig">${badgeHTML(b, { own: !!own[b.id], peek: !own[b.id] })}</div>
      <div class="wl-mtext paper wl-bzt"><h3>${esc(own[b.id] ? b.name : K('תג נעול: ', 'תָּג נָעוּל: ') + b.name)}</h3>
        <p><b>${own[b.id] ? K('קיבלתם אותו על:', 'קִבַּלְתֶּם אוֹתוֹ עַל:') : K('איך מקבלים אותו:', 'אֵיךְ מְקַבְּלִים אוֹתוֹ:')}</b> ${esc(b.how)}</p>
        ${g ? `<p class="wl-bzg">${tileIcon(BGROUP_IC[g.id] || 'medal', 'wl-tic')}${esc(g.name)}</p>` : ''}
        ${when ? `<small>${K('התקבל ב־', 'הִתְקַבֵּל בְּ־')}${when.getDate()}.${when.getMonth() + 1}.${when.getFullYear()}</small>` : ''}
        <button class="wl-btn" data-wl="close">${icon('close')}${K('סגירה', 'סְגִירָה')}</button></div>`;
    modal.hidden = false;
  }
  /* ── settings (the gear in the top bar): the torah edition's "מקורות ופסוקים" switch lives here */
  function openSettings() {
    sfx('select');
    const on = sourcesOn();
    modal.innerHTML = `<div class="wl-mtext paper wl-settings"><h3>${icon('sliders')}הגדרות</h3>
      <button class="wl-srcsw${on ? ' on' : ''}" data-wl="srctoggle" role="switch" aria-checked="${on}">${icon(SOURCES_T.icon, 'wl-ic')}<span><b>${K(...SOURCES_T.name)}</b><small>${K(...SOURCES_T.about)}</small></span><i class="sw"></i></button>
      <button class="wl-btn" data-wl="close">${icon('check')}סיום</button></div>`;
    modal.hidden = false;
  }

  /* ── the badges (תגים); the frames they open have their own screen (1.3.2), linked from here */
  function renderBadges() {
    const own = ownedBadges();
    const frV = locked('frames');
    main.innerHTML = `<section class="wl-screen wl-badges">
      <div class="wl-bhead paper"><b>${tileIcon('medal', 'wl-tic')}${K('התגים שלי', 'הַתָּגִים שֶׁלִּי')}</b><span>${K('אספתם', 'אֲסַפְתֶּם')} ${vBadges().filter((b) => own[b.id]).length} ${K('מתוך', 'מִתּוֹךְ')} ${vBadges().length}</span>
        <button class="wl-btn${frV ? ' is-veiled' : ''}" ${frV ? 'data-wl="locked" data-part="frames"' : 'data-wl="frames"'}>${icon('frame')}<span>${K('המסגרות שלי', 'הַמִּסְגָּרוֹת שֶׁלִּי')}</span></button></div>
      ${BADGE_GROUPS.filter(visB).map((g) => { const list = vBadges().filter((b) => b.group === g.id); const have = list.filter((b) => own[b.id]).length;
        return `<section class="wl-bgroup" style="--bg1:${g.col};--bg2:${g.col2}"><h3><span>${tileIcon(BGROUP_IC[g.id] || 'medal', 'wl-tic')}${esc(g.name)}</span><small>${have} ${K('מתוך', 'מִתּוֹךְ')} ${list.length}</small></h3>
          <div class="wl-bgrid">${list.map((b) => bzHTML(b, !!own[b.id])).join('')}</div></section>`; }).join('')}
    </section>`;
  }
  /* ── my frames: choose the frame of the album cards (each group of badges opens one) */
  function renderFrames() {
    const cur = chosenFrame(), open = new Set(openFrames().map((f) => f.id));
    const sample = CARD.get(FRAME_SAMPLE.find((id) => S.owned[id]) || Object.keys(S.owned).find((id) => CARD.has(id)) || FRAME_SAMPLE[0]);
    const list = FRAMES.filter(visB);
    main.innerHTML = `<section class="wl-screen wl-framesx">
      <section class="wl-frames paper">
        <div class="wl-fprev">${sample ? cardHTML(sample, { cls: cur !== 'none' ? 'fr-' + cur : '' }) : ''}</div>
        <h3>${icon('frame')}${K('מסגרות לקלפים באלבום', 'מִסְגָּרוֹת לַקְּלָפִים בָּאַלְבּוֹם')}</h3>
        <p>${K('כל קבוצת תגים פותחת מסגרת. בחרו מסגרת, והיא תופיע על כל הקלפים שלכם באלבום. פתוחות:', 'כָּל קְבוּצַת תָּגִים פּוֹתַחַת מִסְגֶּרֶת. בַּחֲרוּ מִסְגֶּרֶת, וְהִיא תּוֹפִיעַ עַל כָּל הַקְּלָפִים שֶׁלָּכֶם בָּאַלְבּוֹם. פְּתוּחוֹת:')} ${list.filter((f) => open.has(f.id)).length} ${K('מתוך', 'מִתּוֹךְ')} ${list.length}</p>
        <div class="wl-frow">${list.map((f) => { const g = BADGE_GROUPS.find((x) => x.id === f.group);
          return `<button class="wl-frame fr-${f.id}${cur === f.id ? ' sel' : ''}" data-wl="frame" data-f="${f.id}" ${open.has(f.id) ? '' : 'disabled'}><span class="wl-fsw"></span><b>${esc(f.name)}</b><small>${open.has(f.id) ? (cur === f.id ? K('נבחרה', 'נִבְחֲרָה') : K('אפשר לבחור', 'אֶפְשָׁר לִבְחֹר')) : f.group === 'all' ? K(`נפתחת עם ${f.need} תגים`, `נִפְתַּחַת עִם ${f.need} תָּגִים`) : K(`נפתחת עם ${f.need} תגים של ${esc(g ? g.short : '')}`, `נִפְתַּחַת עִם ${f.need} תָּגִים שֶׁל ${esc(g ? g.short : '')}`)}</small></button>`; }).join('')}</div>
      </section>
    </section>`;
  }
  return { renderHome, bzoom, openSettings, renderBadges, renderFrames };
}
