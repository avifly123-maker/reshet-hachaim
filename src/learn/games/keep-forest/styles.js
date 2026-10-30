// מחזיקים את היער – the game's CSS, injected once into <head> and scoped under #wol-learn.wol-learn (the hub's id-weighted
// rules win otherwise).
// Exports: injectCss(). Needs nothing.

const CSS_ID = 'wl-keepforest-css';

/* ───────────────────────────── CSS */
const CSS = `
.kf-pick{justify-content:center;gap:1em;padding:0 2em .8em}
.kf-phead{text-align:center}
.kf-phead h1{font-family:var(--serif);font-size:2.6em;line-height:1;color:#f6eed0;text-shadow:0 3px 22px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;gap:.3em}
.kf-phead h1 .wl-ic{width:.9em;height:.9em;color:var(--leaf)}
.kf-phead p{margin-top:.4em;font-family:var(--serif);font-size:calc(1.15em * var(--tsr,1));color:#e2dcbd}
.kf-biomes{display:flex;gap:1.4em;justify-content:center}
.kf-bt{width:min(19em,30vw);border-radius:20px;padding:.8em 1em .9em;display:flex;flex-direction:column;align-items:center;gap:.4em;border:3px solid transparent!important;transition:transform .15s,border-color .2s}
.kf-bt:hover{transform:translateY(-3px)}
.kf-bt.on{border-color:var(--leaf2)!important;box-shadow:0 0 0 4px rgba(143,208,103,.5),var(--shadow)}
.kf-bt h2{font-family:var(--serif);font-size:1.9em;line-height:1;color:#1f2c1a}
.kf-bt .kf-fan{display:flex;justify-content:center;height:calc(min(4.6em,9vh) * 1.42 + .3em);align-items:center}
.kf-bt .kf-fan .wl-card{--cw:min(4.6em,9vh);margin:0 -.5em}
.kf-bt .kf-fan .wl-card:nth-child(1){transform:rotate(7deg)}.kf-bt .kf-fan .wl-card:nth-child(3){transform:rotate(-7deg)}.kf-bt .kf-fan .wl-card:nth-child(2){z-index:2;transform:translateY(-.3em)}
.kf-fan .wl-card::after{display:none!important;animation:none!important}
.kf-slot .wl-card::after,.kf-ghost .wl-card::after{display:none!important;animation:none!important}
.kf-bt p{font-size:.98em;color:var(--ink2);font-weight:700;text-align:center;line-height:1.3}
.kf-bt p b{color:#2f6a26}
.kf-bt>p{font-size:calc(.98em * var(--tsr,1))}
.kf-bt .kf-best{display:flex;gap:.1em;color:rgba(80,70,40,.22)}.kf-bt .kf-best .on{color:var(--amber2)}
.kf-pick{position:relative}
.kf-goalbox{width:min(46em,94%);border-radius:20px;padding:.7em 1.3em .8em;display:flex;flex-direction:column;gap:.55em;align-items:center}
.kf-hgoal{display:flex;align-items:center;gap:.6em;text-align:right}
.kf-hgoal .wl-ic{flex:none;width:2.4em;height:2.4em;color:#c46a1c}
.kf-hgoal small{display:block;font-weight:800;color:#8a5a12;font-size:.85em;line-height:1.2}
.kf-hgoal b{font-family:var(--serif);font-size:1.35em;line-height:1.15;color:#1f2c1a}
.kf-gline{display:flex;flex-wrap:wrap;gap:.4em .55em;justify-content:center;align-items:center}
.kf-gs{display:inline-flex;align-items:center;gap:.25em;padding:.12em .6em;border-radius:99px;background:rgba(80,70,40,.1);font-weight:800;color:#5a4a2a;white-space:nowrap;transition:background .3s}
.kf-gs i{display:inline-flex;color:#d98e26}
.kf-gs .wl-ic{width:1em;height:1em}
.kf-gs.on{background:linear-gradient(180deg,#fff2c4,#f8d98a);color:#3a2608;box-shadow:0 0 .6em rgba(240,180,76,.6)}
.kf-glose{display:inline-flex;align-items:center;gap:.3em;font-weight:700;color:#7a4a22;font-size:.95em}
.kf-glose .wl-ic{width:1.3em;height:1.3em;color:#a0703a}
.kf-pbtns{display:flex;gap:.8em;align-items:center}
.kf-pbtns .wl-btn .wl-ic{width:1.3em;height:1.3em}
/* how to play */
.kf-how{position:absolute;inset:0;z-index:30;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:.5em;background:rgba(8,20,12,.66);backdrop-filter:blur(3px);animation:wl-in .25s both}
.kf-hbox{width:min(64em,98%);max-height:100%;overflow:auto;border-radius:22px;padding:.9em 1.3em 1em;display:flex;flex-direction:column;align-items:center;gap:.6em;animation:wl-pop .4s cubic-bezier(.2,.9,.3,1.25) both}
.kf-hbox.kids{width:min(48em,98%)}
.kf-hbox.kids .kf-hgoal b{font-size:1.5em}
.kf-hsteps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);gap:.6em;width:100%}
.kf-hbox.kids .kf-hsteps{grid-template-columns:repeat(3,1fr)}
.kf-hsteps li{display:flex;flex-direction:column;align-items:center;gap:.3em;text-align:center;background:rgba(95,174,74,.12);border-radius:14px;padding:.5em .5em .6em}
.kf-hsteps h4{display:flex;align-items:center;gap:.35em;margin:0;font-family:var(--serif);font-size:1.15em;line-height:1.1;color:#1f2c1a}
.kf-hsteps h4 span{flex:none;width:1.5em;height:1.5em;border-radius:50%;background:var(--leaf2);color:#10260b;display:grid;place-items:center;font-family:var(--sans);font-size:.85em;font-weight:900}
.kf-hsteps p{margin:0;font-size:.95em;line-height:1.35;color:#2c3524}
.kf-hsteps li>p{font-size:calc(.95em * var(--tsr,1))}
.kf-hbox.kids .kf-hsteps p{font-size:1.08em}
.kf-hp{position:relative;height:6.2em;width:100%;display:flex;align-items:center;justify-content:center}
.kf-hp .wl-card{--cw:3.4em;box-shadow:0 .3em .6em rgba(0,0,0,.3)}
.kf-hp .wl-card::after{display:none!important}
.kf-hp-rows{flex-direction:column;align-items:stretch;gap:.15em;padding:0 .3em}
.kf-hp-rows i{flex:1;display:flex;align-items:center;padding:0 .5em;border-radius:6px;font-style:normal;font-size:.75em;font-weight:800;color:#2c3524}
.kf-hp-rows i:nth-child(1){background:rgba(95,174,74,.35)}.kf-hp-rows i:nth-child(2){background:rgba(143,190,90,.3)}.kf-hp-rows i:nth-child(3){background:rgba(150,110,60,.3)}
.kf-hcard{position:absolute;left:14%;top:-.3em;transform:rotate(-5deg)}
.kf-hcard .wl-card{--cw:3em}
.kf-hp-pair svg{width:2.4em;height:1.3em;margin:0 -.35em;align-self:flex-start;margin-top:1.6em;position:relative;z-index:1;filter:drop-shadow(0 0 3px rgba(255,200,90,.9))}
.kf-hp-pair b,.kf-hp-tool b{position:absolute;top:-.55em;left:50%;transform:translateX(-50%);z-index:2;padding:0 .45em;border-radius:99px;background:linear-gradient(180deg,#fff2c4,#f8d98a);font-weight:900;color:#8a5a12;font-size:.95em}
.kf-hp-tool b{top:auto;bottom:0;left:30%}
.kf-hev{flex:none;width:3.6em;height:5.1em;border-radius:.5em;background:linear-gradient(150deg,#ffe9a8,#e8a43a 45%,#9c6512);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2em;box-shadow:0 .3em .6em rgba(0,0,0,.3)}
.kf-hev .wl-ic{width:2em;height:2em;color:#fff6d8}
.kf-hev small{font-weight:800;font-size:.75em;color:#fff}
.kf-hneed{display:flex;flex-direction:column;gap:.2em;margin-inline-start:.45em}
.kf-hneed span{display:flex;align-items:center;gap:.2em;padding:.05em .45em;border-radius:99px;background:rgba(240,180,76,.28);font-size:.75em;font-weight:800;color:#3a2608;white-space:nowrap}
.kf-hneed .wl-ic{width:1.1em;height:1.1em;color:#b96f12}
.kf-hp-stars{flex-direction:column;gap:.2em}
.kf-hp-stars span{display:flex;align-items:center;gap:.4em;font-weight:800;color:#5a4a2a}
.kf-hst{display:inline-flex;color:#d98e26;min-width:3.3em;justify-content:flex-start}
.kf-hst .wl-ic{width:1.1em;height:1.1em}
.kf-hp-stars b{font-size:1.1em;color:#1f2c1a}
.kf-hlose{display:flex;align-items:center;gap:.5em;width:100%;padding:.4em .9em;border-radius:12px;background:#f3e6cf;color:#5a3b22;font-size:1em;line-height:1.35}
.kf-hlose .wl-ic{flex:none;width:1.7em;height:1.7em;color:#a0703a}
.kf-hleg{display:flex;flex-wrap:wrap;gap:.35em 1.2em;justify-content:center;font-size:.88em;font-weight:600;color:var(--ink2)}
.kf-hleg span{display:flex;align-items:center;gap:.45em}
.kf-hleg .kf-lb{position:static;transform:rotate(-6deg);font-style:normal;flex:none}
.kf-lt{flex:none;display:inline-flex;align-items:center;gap:.2em;padding:.1em .55em;border-radius:99px;background:#e8dfc6;color:#2c3524;font-style:normal;font-weight:800}
.kf-lt.w{background:#7a6a4a;color:#fbf6e5}
.kf-lt .wl-ic{width:1em;height:1em}
.kf-hbox>.wl-btn{font-size:1.15em;padding:.35em 2.2em}
.kf-pick .wl-btn.go{font-size:1.3em;padding:.45em 2.4em}
/* game */
.kf-game{position:relative;width:100%;padding:0 1em .35em;align-items:stretch;gap:.35em}
.kf-bar{flex:none;display:flex;align-items:center;gap:.5em;min-height:2.5em}
.kf-stat{display:flex;align-items:center;gap:.35em;padding:.25em .8em;border-radius:99px;background:rgba(246,240,220,.12);border:1px solid rgba(246,240,220,.2);font-weight:800;color:#f3ecd2;white-space:nowrap}
.kf-stat b{font-size:1.2em;min-width:1.1em;text-align:center}
.kf-stat small{font-weight:700;opacity:.85}
.kf-stat.s-light .wl-ic{color:#f0b44c}.kf-stat.s-water .wl-ic{color:#6cc0f0}.kf-stat.s-thr .wl-ic{color:#f6cf72}
.kf-stat.s-life{background:linear-gradient(180deg,#a2dc78,#5fae4a);color:#10260b;border-color:#3f8a33;box-shadow:0 3px 0 #2f6a26}
.kf-stat.s-life .wl-ic{color:#1d4a17}
.kf-stat .kf-boost{font-size:.8em;color:#9fdcff}
.kf-stat.bump{animation:wl-bump .6s}
.kf-flags{display:flex;gap:.3em}
.kf-goal{display:flex;align-items:center;gap:.35em;padding:.15em .25em;padding-inline-start:.75em;border-radius:99px;background:rgba(246,240,220,.1);border:1px solid rgba(246,240,220,.22);white-space:nowrap}
.kf-gev{font-weight:800;color:#f3ecd2;font-size:.92em}
.kf-goal .kf-gs{font-size:.84em;padding:.1em .5em;background:rgba(246,240,220,.1);color:#e2dcbd}
.kf-goal .kf-gs i{color:rgba(246,240,220,.4)}
.kf-goal .kf-gs.on{background:linear-gradient(180deg,#fff2c4,#f8d98a);color:#3a2608}
.kf-goal .kf-gs.on i{color:#d98e26}
.kf-goal.low .kf-stat.s-life{background:linear-gradient(180deg,#f8d98a,#e8a43a);border-color:#b96f12;box-shadow:0 3px 0 #8a5a12;color:#3a2608}
.kf-goal.low .kf-stat.s-life .wl-ic{color:#8a5a12}
.kf-bar .kf-q{width:2.4em;padding:0!important;display:grid;place-items:center}
.kf-bar .kf-q .wl-ic{width:1.45em;height:1.45em;color:#2f6a26}
.kf-flag{display:flex;align-items:center;gap:.25em;padding:.2em .6em;border-radius:99px;background:rgba(240,180,76,.22);color:#f8d98a;font-size:.85em;font-weight:800;white-space:nowrap}
.kf-sp{flex:1}
.kf-bar .wl-btn{min-height:2.4em;padding:.25em 1em;font-size:.95em}
.kf-mid{flex:1;min-height:0;display:flex;gap:.8em}
.kf-board{position:relative;flex:1;min-width:0;border-radius:20px;padding:.35em .6em;display:flex;flex-direction:column;justify-content:space-around;gap:.25em}
.kf-row{position:relative;flex:1;min-height:0;display:flex;align-items:center;gap:.6em;border-radius:14px;padding:0 .4em}
.kf-row[data-r="0"]{background:linear-gradient(270deg,rgba(95,174,74,.22),rgba(95,174,74,.05))}
.kf-row[data-r="1"]{background:linear-gradient(270deg,rgba(143,190,90,.2),rgba(143,190,90,.04))}
.kf-row[data-r="2"]{background:linear-gradient(270deg,rgba(150,110,60,.22),rgba(150,110,60,.05))}
.kf-rl{flex:none;width:6.6em;display:flex;flex-direction:column;gap:.05em}
.kf-rl b{font-family:var(--serif);font-size:1.3em;line-height:1.05;color:#1f2c1a}
.kf-rl small{font-size:.8em;line-height:1.2;color:var(--ink2);font-weight:600}
.kf-slots{flex:1;display:flex;justify-content:space-evenly;align-items:center}
.kf-slot{--cw:min(6em,11.4vh);position:relative;width:var(--cw);height:calc(var(--cw) * 1.42);border-radius:.8em;transition:transform .2s}
.kf-slot.empty{border:3px dashed rgba(79,120,60,.45);background:rgba(255,255,255,.3);display:grid;place-items:center;color:rgba(79,120,60,.5)}
.kf-slot.empty .wl-ic{width:2em;height:2em}
.kf-slot .wl-card{--cw:min(6em,11.4vh);cursor:pointer}
.kf-slot.fresh .wl-card{animation:kf-land .5s cubic-bezier(.2,.9,.3,1.3) both}
.kf-slot.wilted .wl-card{filter:grayscale(.95) brightness(.88) sepia(.25);opacity:.72}
.kf-wb{position:absolute;bottom:-.2em;left:50%;transform:translateX(-50%);z-index:4;display:flex;align-items:center;gap:.2em;padding:.1em .55em;border-radius:99px;background:#7a6a4a;color:#fbf6e5;font-size:.72em;font-weight:800;white-space:nowrap}
.kf-wb .wl-ic{width:1.1em;height:1.1em}
.kf-slot.ok{cursor:pointer}
.kf-slot.ok::after{content:"";position:absolute;inset:-.25em;border-radius:1em;border:3px solid var(--leaf2);box-shadow:0 0 1em rgba(143,208,103,.8);animation:kf-breath 1.4s ease-in-out infinite;pointer-events:none;z-index:5}
.kf-slot.ok.empty{background:rgba(143,208,103,.35)}
.kf-slot.swap::after{border-color:var(--amber2);box-shadow:0 0 1em rgba(240,180,76,.8)}
.kf-slot.hot{transform:scale(1.07)}
.kf-slot.hint::after{content:"";position:absolute;inset:-.3em;border-radius:1em;border:3px solid var(--amber);box-shadow:0 0 1.2em rgba(240,180,76,.95);animation:kf-breath 1s ease-in-out infinite;pointer-events:none;z-index:5}
.kf-sw{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:6;display:none;width:2.2em;height:2.2em;border-radius:50%;background:var(--amber);color:#3a2608;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.kf-slot.swap .kf-sw{display:grid}
.kf-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:3}
.kf-svg path{fill:none;stroke-linecap:round}
.kf-svg .th{stroke:#f0b44c;stroke-width:4;opacity:.9;filter:drop-shadow(0 0 3px rgba(255,200,90,.95))}
.kf-svg .th.w2{stroke-width:6.5;stroke:#ffd36b}
.kf-svg .th.new{stroke-dasharray:var(--len) var(--len);animation:kf-draw .8s ease-out both,kf-glow 1.6s .8s ease-in-out 2}
.kf-svg circle{fill:#ffe39a;filter:drop-shadow(0 0 3px rgba(255,200,90,.95))}
/* side */
.kf-side{flex:none;width:15.5em;display:flex;flex-direction:column;gap:.45em;min-height:0;overflow:hidden}
.kf-evhead{display:flex;align-items:center;justify-content:space-between;color:#f3ecd2;font-weight:800;font-size:.95em}
.kf-dots{display:flex;gap:.25em}
.kf-dots i{width:.8em;height:.8em;border-radius:50%;background:rgba(246,240,220,.2)}
.kf-dots i.ok{background:var(--leaf)}.kf-dots i.no{background:#c9a26a}.kf-dots i.gd{background:#9fdcff}.kf-dots i.cur{box-shadow:0 0 0 .18em var(--amber)}
.kf-evtop{display:flex;gap:.6em;align-items:center}
.kf-evtop .wl-flip{--cw:min(6.4em,12vh);flex:none}
.kf-evf{position:absolute;inset:0;border-radius:.8em;padding:.32em;background:linear-gradient(150deg,#ffe9a8,#e8a43a 45%,#9c6512);box-shadow:0 .5em 1.2em rgba(0,0,0,.35)}
.kf-evf.good{background:linear-gradient(150deg,#d6f1ff,#5fb3d9 45%,#2c5f8f)}
.kf-evf>div{height:100%;border-radius:.55em;background:#f6efd8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4em;padding:.4em;text-align:center}
.kf-evf .wl-ic{width:5em;height:5em;color:#c46a1c}
.kf-evf.good .wl-ic{color:#2c7fb8}
.kf-evf b{font-family:var(--serif);font-size:1.25em;line-height:1.05;color:#1f2c1a}
.kf-peek{flex:1;min-width:0;display:flex;flex-direction:column;gap:.3em;color:#e2dcbd;font-size:.92em;font-weight:700;line-height:1.25}
.kf-peek .kf-when{font-size:1.05em;color:#f6eed0}
.kf-pk{display:flex;align-items:center;gap:.3em;padding:.15em .5em;border-radius:99px;background:rgba(246,240,220,.12);font-size:.9em;white-space:nowrap;overflow:hidden}
.kf-pk .wl-ic{color:var(--amber);width:1.15em;height:1.15em}
.kf-info{border-radius:16px;padding:.6em .8em;display:flex;flex-direction:column;gap:.3em;min-height:0;flex:0 1 auto;overflow-y:auto}
.kf-cont{flex:none;display:flex;justify-content:center}.kf-cont:empty{display:none}
.kf-info h3{font-family:var(--serif);font-size:1.35em;line-height:1.1;color:#1f2c1a;display:flex;align-items:center;gap:.3em}
.kf-info h3 .wl-ic{color:#c46a1c}
.kf-info p{font-size:calc(.95em * var(--tsr,1));line-height:1.35;color:#2c3524}
.kf-need{display:flex;align-items:center;gap:.4em;font-weight:800;color:#3a2608;background:rgba(240,180,76,.2);border-radius:10px;padding:.25em .55em;font-size:.95em}
.kf-need .wl-ic{color:#b96f12}
.kf-res{display:flex;align-items:center;gap:.4em;font-family:var(--serif);font-weight:700;font-size:calc(1.15em * var(--tsr,1));line-height:1.2;border-radius:10px;padding:.3em .55em;animation:wl-rise .35s both}
.kf-res.ok{background:linear-gradient(180deg,#e3f5d3,#c8eab0);color:#1d4a17}
.kf-res.no{background:#f3e6cf;color:#5a3b22}
.kf-res .wl-ic{width:1.4em;height:1.4em}
.kf-cont .wl-btn{min-height:2.5em;padding:.3em 1.4em;font-size:1em;margin-top:.15em}
.kf-owl{margin-top:auto;flex:none;display:flex;align-items:flex-end;gap:.3em}
.kf-owlsvg{flex:none;width:4.6em;height:5em;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))}
.kf-owlsvg .kf-eyes{animation:kf-blink 5s infinite;transform-origin:50px 41px}
.kf-bub{position:relative;flex:1;min-width:0;margin-bottom:1.4em;padding:.5em .75em;border-radius:14px 14px 14px 4px;background:#fbf6e5;color:#2c3524;font-weight:700;font-size:calc(.93em * var(--tsr,1));line-height:1.3;box-shadow:0 4px 12px rgba(0,0,0,.25);animation:wl-rise .35s both}
.kf-bub b{color:#2f6a26}
.kf-bub small{display:block;color:#8a5a12;font-weight:800;margin-bottom:.1em}
/* message + hand */
.kf-msg{flex:none;min-height:2.1em;display:flex;align-items:center;justify-content:center}
.kf-msg>div{display:flex;align-items:center;gap:.5em;max-width:96%;padding:.25em 1.2em;border-radius:99px;font-family:var(--serif);font-weight:700;font-size:1.06em;line-height:1.25;animation:wl-rise .35s both}
.kf-msg .ok{background:linear-gradient(180deg,#fff2c4,#f8d98a);color:#3a2608}
.kf-msg .ok .wl-ic{color:#b96f12}
.kf-msg .tip{color:#e2dcbd;font-family:var(--sans);font-weight:600}
.kf-msg .tip .wl-ic{color:var(--amber)}
.kf-msg .no{background:#fbf6e5;color:#5a3b22}
.kf-bottom{flex:none;display:flex;align-items:flex-end;gap:.8em}
.kf-deck{flex:none;width:6.6em;display:flex;flex-direction:column;align-items:center;gap:.2em;color:#e2dcbd;font-weight:800;font-size:.9em;padding-bottom:.6em;text-align:center;line-height:1.2}
.kf-deck .wl-ic{width:2.4em;height:2.4em;color:#8fd067}
.kf-hand{flex:1;display:flex;gap:.7em;justify-content:center;align-items:flex-end;min-height:calc(min(6.2em,11.6vh) * 1.42 + 2.1em)}
.kf-hc{position:relative;display:flex;flex-direction:column;align-items:center;gap:.2em;cursor:grab;touch-action:none;transition:transform .2s,opacity .2s}
.kf-hc .wl-card{--cw:min(6.2em,11.6vh);pointer-events:none}
.kf-hc:hover{transform:translateY(-.4em)}
.kf-hc.sel{transform:translateY(-.8em)}
.kf-hc.sel .wl-card{box-shadow:0 0 0 .22em var(--leaf),0 0 1.2em rgba(143,208,103,.8),0 .5em 1.2em rgba(0,0,0,.35)}
.kf-hc.hint .wl-card{box-shadow:0 0 0 .22em var(--amber),0 0 1.4em rgba(240,180,76,.9)}
.kf-hc.hint{animation:kf-breath 1s ease-in-out infinite}
.kf-hc.lift{opacity:.25}
.kf-hc.off{opacity:.55}
.kf-chip{width:calc(min(6.2em,11.6vh) + .8em);height:2.35em;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:.2em;padding:.1em .55em;border-radius:99px;background:rgba(246,240,220,.16);color:#f3ecd2;font-size:.74em;font-weight:800;line-height:1.1;text-align:center}
.kf-chip.tool{background:#d8ecfa;color:#1d3f5f;border-radius:8px}
.kf-chip .wl-ic{width:1.1em;height:1.1em}
.kf-borrow{position:absolute;bottom:.25em;left:-.4em;z-index:3;padding:.08em .5em;border-radius:99px;background:#7d8f9b;color:#fff;font-size:.72em;font-weight:900;transform:rotate(-8deg);box-shadow:0 2px 5px rgba(0,0,0,.3)}
.kf-use{position:absolute;bottom:20%;left:50%;transform:translateX(-50%);z-index:4;white-space:nowrap;min-height:2.3em!important;padding:.2em .9em!important;font-size:.95em!important}
.kf-acts{flex:none;width:6.6em;display:flex;flex-direction:column;gap:.4em;align-items:stretch;padding-bottom:.6em}
.kf-acts .wl-btn{min-height:2.4em;padding:.25em .5em;font-size:.86em;line-height:1.15}
.kf-ghost{position:fixed;z-index:60;/* inside the hub (its own layer): 60 only counts there */pointer-events:none;transform:translate(-50%,-50%) rotate(-3deg) scale(1.06);filter:drop-shadow(0 14px 18px rgba(0,0,0,.4))}
.kf-ghost .wl-card{--cw:min(6.2em,11.6vh)}
.kf-float{position:absolute;z-index:8;pointer-events:none;font-weight:900;font-size:1.3em;color:#ffe39a;text-shadow:0 2px 6px rgba(0,0,0,.6);animation:kf-up 1.2s ease-out both}
/* end */
.kf-done{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(8,20,12,.6);backdrop-filter:blur(3px);animation:wl-in .3s both}
.kf-done[hidden]{display:none}
.kf-dbox{width:min(40em,94%);border-radius:22px;padding:1.2em 1.6em 1.3em;display:flex;flex-direction:column;align-items:center;gap:.6em;text-align:center;animation:wl-pop .45s cubic-bezier(.2,.9,.3,1.25) both}
.kf-dbox h2{font-family:var(--serif);font-size:2.1em;line-height:1.05;color:#1f2c1a}
.kf-dbox p{color:var(--ink2);font-size:calc(1.08em * var(--tsr,1))}
.kf-stars{display:flex;gap:.3em;color:rgba(80,70,40,.2)}
.kf-stars .wl-ic{width:3em;height:3em}
.kf-stars .on{color:var(--amber);filter:drop-shadow(0 4px 10px rgba(217,142,38,.55));animation:wl-star .6s cubic-bezier(.2,.9,.3,1.4) both}
.kf-stars .on:nth-child(2){animation-delay:.15s}.kf-stars .on:nth-child(3){animation-delay:.3s}
.kf-sum{display:flex;gap:.6em;flex-wrap:wrap;justify-content:center}
.kf-sum span{display:flex;align-items:center;gap:.3em;padding:.25em .8em;border-radius:99px;background:rgba(95,174,74,.15);font-weight:800;color:#1f2c1a}
.kf-sum .wl-ic{color:var(--moss)}
.kf-pack{display:flex;align-items:center;gap:.4em;font-weight:800;color:#8a5a12}
.kf-dbox.lost h2{color:#5a3b22}
.kf-tip{display:flex;align-items:center;gap:.5em;padding:.45em .9em;border-radius:12px;background:rgba(240,180,76,.22);color:#3a2608;font-size:1.02em;line-height:1.35;text-align:right}
.kf-tip .wl-ic{flex:none;width:1.5em;height:1.5em;color:#b96f12}
.kf-btns .wl-btn .wl-ic{width:1.2em;height:1.2em}
.kf-btns{display:flex;gap:.7em;flex-wrap:wrap;justify-content:center;margin-top:.2em}
.kf-key{position:absolute;top:-.55em;left:-.5em;z-index:6;width:2em;height:2em;border-radius:50%;display:grid;place-items:center;pointer-events:none;color:#5a1838;
  background:radial-gradient(circle at 38% 32%,#fff3c4,#f6cf72 45%,#e79aab 85%);box-shadow:0 0 0 .14em #fff6dc,0 0 .9em .2em rgba(246,207,114,.85),0 .2em .4em rgba(0,0,0,.3);animation:kf-keyglow 1.8s ease-in-out infinite}
.kf-key .wl-ic{width:1.25em;height:1.25em}
.kf-key.used{background:#cfc6ae;color:#7a6f58;box-shadow:0 0 0 .14em #f3ecd6,0 .15em .3em rgba(0,0,0,.25);animation:none;opacity:.85}
.kf-rb{position:absolute;top:-.45em;left:-.45em;z-index:6;padding:.05em .45em;border-radius:99px;pointer-events:none;font-style:normal;font-weight:900;font-size:.82em;line-height:1.4;direction:ltr;color:#4a2c06;
  background:linear-gradient(180deg,#ffe9a8,#e8a43a);box-shadow:0 0 0 .12em #fff6dc,0 .15em .35em rgba(0,0,0,.3)}
.kf-hc .kf-key,.kf-hc .kf-rb{top:1.9em}
.kf-rb .wl-ic,.kf-hp-pair b .wl-ic{width:1em;height:1em;vertical-align:-.12em}
.kf-slot.keyfire .wl-card{animation:kf-keypop .9s cubic-bezier(.2,.9,.3,1.3) both}
.kf-slot.keyfire::before{content:"";position:absolute;inset:-.5em;border-radius:1.2em;z-index:5;pointer-events:none;border:3px solid #f6cf72;box-shadow:0 0 1.4em .4em rgba(246,207,114,.9),inset 0 0 1em rgba(231,154,171,.7);animation:kf-keyring 1.6s ease-out 2 both}
.kf-rbm{font-family:var(--sans);font-size:.85em;color:#8a5a12}
.kf-kfloat{display:flex;align-items:center;gap:.25em;white-space:nowrap;padding:.15em .7em;border-radius:99px;font-size:1.15em;color:#4a1c34;text-shadow:none;background:linear-gradient(90deg,#fff2c4,#f6cf72,#f3c3cf);box-shadow:0 0 1em rgba(246,207,114,.9),0 .2em .5em rgba(0,0,0,.3);animation:kf-up 2s ease-out both}
.kf-kfloat .wl-ic{width:1.1em;height:1.1em;color:#b3306a}
.kf-res b{font-weight:900}
.kf-res.key{background:linear-gradient(90deg,#fff2c4,#f6d6de);color:#4a1c34}
.kf-res.key .wl-ic{color:#b3306a}
.kf-dots i.key{background:linear-gradient(135deg,#f6cf72,#e79aab)}
.kf-sum .kf-skey{background:linear-gradient(90deg,#fff2c4,#f6d6de)}.kf-sum .kf-skey .wl-ic{color:#b3306a}
.kf-hrar{display:flex;gap:.6em;width:100%}
.kf-hr{flex:1;display:flex;align-items:center;gap:.6em;padding:.35em .8em;border-radius:12px;font-size:calc(.98em * var(--tsr,1));line-height:1.3;color:#2c3524}
.kf-hr.e{background:linear-gradient(90deg,rgba(246,207,114,.3),rgba(231,154,171,.22))}.kf-hr.r{background:rgba(240,180,76,.18)}
.kf-hr b{color:#1f2c1a}
.kf-hr .kf-key,.kf-hr .kf-rb{position:static;flex:none;animation:none}
.kf-hr .kf-key{width:1.9em;height:1.9em}
@keyframes kf-keyglow{0%,100%{box-shadow:0 0 0 .14em #fff6dc,0 0 .6em .1em rgba(246,207,114,.6),0 .2em .4em rgba(0,0,0,.3)}50%{box-shadow:0 0 0 .14em #fff6dc,0 0 1.2em .35em rgba(246,207,114,.95),0 .2em .4em rgba(0,0,0,.3)}}
@keyframes kf-keyring{0%{opacity:0;transform:scale(.85)}25%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
@keyframes kf-keypop{0%{transform:scale(1)}35%{transform:scale(1.14) rotate(-2deg)}100%{transform:none}}
@keyframes kf-draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes kf-glow{0%,100%{opacity:.9}50%{opacity:1;stroke-width:7}}
@keyframes kf-land{0%{transform:scale(1.25);opacity:.4}100%{transform:none;opacity:1}}
@keyframes kf-breath{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes kf-blink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes kf-up{0%{opacity:0;transform:translate(-50%,0) scale(.6)}20%{opacity:1;transform:translate(-50%,-.4em) scale(1.1)}100%{opacity:0;transform:translate(-50%,-2.6em) scale(1)}}
@media (max-height:820px){.kf-side.resolved .kf-evtop{display:none}}
@media (max-height:520px){.kf-side{gap:.3em}.kf-evtop .wl-flip{--cw:min(4.8em,11vh)}.kf-evf .wl-ic{width:3.4em;height:3.4em}.kf-info{padding:.4em .6em;min-height:3.4em}.kf-info h3{font-size:1.05em}.kf-info p{font-size:.84em;line-height:1.3}
  .kf-owlsvg{width:2.6em!important;height:2.9em!important}.kf-bub{margin-bottom:.2em;padding:.35em .6em;font-size:.82em;max-height:4.6em;overflow-y:auto;scrollbar-width:thin}}
/* (a screen up to 720 px high: the side panel and the owl keep their words' size, the board has no room for more) */
@media (max-height:720px){.kf-phead h1{font-size:2.1em}.kf-hsteps p{font-size:.9em}.kf-hsteps li>p{font-size:calc(.9em * var(--tsr,1))}.kf-hp{height:5.6em}.kf-side{width:14.5em}.kf-owlsvg{width:3.8em;height:4.2em}}
@media (min-height:521px) and (max-height:720px){.kf-info p{font-size:.95em}.kf-bub{font-size:.93em}}
/* round 2: gentle colour – each forest card in its own paper */
.kf-bt[data-b="amazon"]{--paper:#dbe5d6}.kf-bt[data-b="amazon"] h2{color:#1f5f58}
.kf-bt[data-b="grove"]{--paper:#ece0c4}.kf-bt[data-b="grove"] h2{color:#55601f}
.kf-bt[data-b="reef"]{--paper:#d3e7ec}.kf-bt[data-b="reef"] h2{color:#1d6680}
.kf-bt[data-b="reef"].on{border-color:#2a8ac0!important;box-shadow:0 0 0 4px rgba(64,160,210,.45),var(--shadow)}
.kf-bt[data-b="desert"]{--paper:#f0e0c0}.kf-bt[data-b="desert"] h2{color:#8a5a22}
.kf-bt[data-b="desert"].on{border-color:#c08a3a!important;box-shadow:0 0 0 4px rgba(214,160,80,.45),var(--shadow)}
.kf-bt[data-b="amazon"].on{border-color:#3f8f84!important;box-shadow:0 0 0 4px rgba(79,163,154,.45),var(--shadow)}
.kf-bt[data-b="grove"].on{border-color:#b07a12!important;box-shadow:0 0 0 4px rgba(236,199,126,.55),var(--shadow)}
.kf-goalbox{--paper:#ece6d0}
.kf-gline .kf-gs:nth-child(1){background:rgba(140,195,220,.25)}.kf-gline .kf-gs:nth-child(2){background:rgba(242,207,91,.28)}.kf-gline .kf-gs:nth-child(3){background:rgba(231,154,171,.25)}
`;
export function injectCss() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const st = document.createElement('style'); st.id = CSS_ID;
  st.textContent = CSS.replace(/(^|[,{}\n])\s*\.kf-/g, '$1#wol-learn.wol-learn .kf-');
  document.head.appendChild(st);
}
