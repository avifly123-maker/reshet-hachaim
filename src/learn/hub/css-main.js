// מרכז הלמידה – the hub's CSS, first half: the frame of the hub, buttons, quiz, album, cards, flips, pack opening,
// torah edition parts. Scoped under .wol-learn (styles.js raises it to #wol-learn.wol-learn).
// Exports: CSS_MAIN (one string; styles.js joins it with CSS_MORE). Needs nothing.
/* ───────────────────────────────────────────── CSS */
const LEAF_BG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><g fill="#cfe8b0" fill-opacity=".05"><path d="M30 70C26 40 46 18 84 16c2 38-22 58-54 54z"/><path d="M150 40c-4-22 10-38 38-40 2 28-16 42-38 40z"/><path d="M120 170c-6-34 18-58 60-60 2 42-24 64-60 60z"/><path d="M20 190c-2-18 10-30 30-32 2 22-12 34-30 32z"/></g><g stroke="#cfe8b0" stroke-opacity=".05" stroke-width="2" fill="none"><path d="M30 70L70 30M150 40l26-26M120 170l46-46"/></g></svg>');
export const CSS_MAIN = `
.wol-learn{--ink:#1e2a1c;--ink2:#4a5640;--paper:#e2dfc4;--paper2:#d3cfac;--edge:#a59c74;--cream:#e9e6cc;--leaf:#a9cf6a;--leaf2:#5f9a3e;--moss:#2c4f26;--amber:#e6a93c;--amber2:#a86e17;--berry:#c8473a;--sky:#86c6ee;
  --sans:"wol-text","Segoe UI","Arial Hebrew","Noto Sans Hebrew",Arial,"Liberation Sans",sans-serif;
  --serif:"wol-display","wol-text","Segoe UI",Arial,serif;
  --shadow:0 10px 30px rgba(6,18,10,.35),0 2px 6px rgba(6,18,10,.25);
  position:fixed;inset:0;z-index:var(--z-hub);pointer-events:auto;direction:rtl;display:flex;flex-direction:column;overflow:hidden;
  font-family:var(--sans);color:var(--cream);font-size:clamp(13px,min(1.18vw,2.3vh),19px);line-height:1.4;
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;
  background:radial-gradient(110% 85% at 85% -15%,#4b8a3f 0%,transparent 55%),radial-gradient(80% 70% at -5% 115%,#6b5323 0%,transparent 60%),linear-gradient(180deg,#1e3d28 0%,#12271b 100%);
  animation:wl-in .35s ease-out both}
.wol-learn[hidden]{display:none!important}
.wol-learn *{box-sizing:border-box}
.wol-learn h1,.wol-learn h2,.wol-learn h3,.wol-learn p{margin:0}
.wol-learn::before{content:"";position:absolute;inset:0;background:url("${LEAF_BG}");background-size:22em;pointer-events:none}
.wol-learn button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0;-webkit-tap-highlight-color:transparent}
.wol-learn button:focus-visible{outline:3px solid var(--amber);outline-offset:3px}
.wol-learn button:disabled{cursor:default}
.wol-learn .wl-ic{width:1.25em;height:1.25em;display:inline-block;vertical-align:middle;flex:none}
.wol-learn .paper{color:var(--ink);background:radial-gradient(120% 80% at 100% 0%,rgba(255,255,255,.45),transparent 55%),radial-gradient(90% 70% at 0% 100%,rgba(186,160,100,.22),transparent 60%),repeating-linear-gradient(0deg,rgba(120,100,60,.035) 0 1px,transparent 1px 3px),var(--paper);
  border:1px solid var(--edge);box-shadow:var(--shadow),inset 0 0 0 4px rgba(255,255,255,.22),inset 0 0 40px rgba(160,130,70,.18)}
/* top bar */
.wol-learn .wl-top{position:relative;display:flex;align-items:center;gap:.9em;padding:.8em 1.4em;min-height:4.4em;flex:none}
.wol-learn .wl-back{display:flex;align-items:center;gap:.4em;padding:.55em 1.1em .55em 1.25em;border-radius:99px;background:rgba(246,240,220,.12);border:1px solid rgba(246,240,220,.22);font-weight:700;font-size:1.05em;min-height:2.9em;transition:background .2s}
.wol-learn .wl-back:hover{background:rgba(246,240,220,.22)}
.wol-learn .wl-crumb{font-family:var(--serif);font-size:1.5em;font-weight:700;color:#f3ecd2;text-shadow:0 2px 10px rgba(0,0,0,.35)}
.wol-learn .wl-sp{flex:1}
.wol-learn .wl-chip{display:flex;align-items:center;gap:.45em;padding:.45em 1em;border-radius:99px;background:linear-gradient(180deg,#f6cf72,#e09a2c);color:#3a2608;font-weight:800;box-shadow:0 3px 0 #a86c18,0 6px 14px rgba(0,0,0,.25);min-height:2.6em}
.wol-learn .wl-chip.bump{animation:wl-bump .6s}
.wol-learn .wl-who{display:flex;align-items:center;gap:.5em;padding:.25em .3em .25em 1em;border-radius:99px;background:rgba(246,240,220,.1);border:1px solid rgba(246,240,220,.18);color:#f3ecd2;font-weight:700;min-height:2.6em;max-width:13em;pointer-events:none}
.wol-learn .wl-who:empty{display:none}
.wol-learn .wl-who>span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wol-learn .wl-who .av{position:relative;flex:none;display:block;width:2.1em;height:2.1em;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #e9e6cc,0 2px 6px rgba(0,0,0,.3)}
.wol-learn .wl-logo{height:2.7em;width:auto;background:rgba(255,255,255,.94);border-radius:.7em;padding:.3em .7em;box-shadow:0 3px 10px rgba(0,0,0,.25)}
.wol-learn .wl-main{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
.wol-learn .wl-screen{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;animation:wl-rise .35s ease-out both}
/* buttons */
.wol-learn .wl-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;min-height:3.1em;padding:.5em 1.4em;border-radius:99px;font-weight:800;font-size:1.08em;
  background:#fbf6e5;color:var(--ink);border:2px solid var(--edge);box-shadow:0 3px 0 var(--edge),0 8px 18px rgba(0,0,0,.2);transition:transform .12s,filter .2s}
.wol-learn .wl-btn:hover:not(:disabled){transform:translateY(-2px)}
.wol-learn .wl-btn:active:not(:disabled){transform:translateY(1px)}
.wol-learn .wl-btn.go{background:linear-gradient(180deg,#a2dc78,#5fae4a);border-color:#3f8a33;color:#10260b;box-shadow:0 4px 0 #2f6a26,0 10px 22px rgba(0,0,0,.28)}
.wol-learn .wl-btn.gold{background:linear-gradient(180deg,#f8d98a,#e8a43a);border-color:#b97a1e;color:#3a2608;box-shadow:0 4px 0 #9c6512,0 10px 22px rgba(0,0,0,.28)}
.wol-learn .wl-btn:disabled{filter:grayscale(.8) opacity(.55)}
.wol-learn .wl-btn .wl-badgeN{min-width:1.6em;height:1.6em;border-radius:99px;background:var(--berry);color:#fff;font-size:.85em;display:inline-grid;place-items:center;padding:0 .35em}
/* home */
.wol-learn .wl-meter{height:.7em;border-radius:99px;background:rgba(80,70,40,.15);overflow:hidden;margin-top:.35em}
.wol-learn .wl-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--leaf2),var(--leaf))}
/* setup */
.wol-learn .wl-setup{width:min(54em,94%);margin:auto;border-radius:24px;padding:1.6em 2em 1.8em;display:flex;flex-direction:column;gap:1.1em}
.wol-learn .wl-setup h2{font-family:var(--serif);font-size:calc(2.2em * var(--tsd,1));line-height:1;color:#1f2c1a}
.wol-learn .wl-step h3{font-size:1.1em;color:var(--ink2);margin-bottom:.5em}
.wol-learn .wl-choices{display:grid;grid-template-columns:repeat(var(--n,2),1fr);gap:.9em}
.wol-learn .wl-choice{display:flex;align-items:center;gap:.8em;padding:.8em 1.1em;border-radius:18px;background:#fbf6e5;border:2.5px solid var(--edge);box-shadow:0 3px 0 var(--edge);text-align:right;min-height:4.6em;transition:transform .12s,border-color .2s,background .2s}
.wol-learn .wl-choice:hover{transform:translateY(-2px)}
.wol-learn .wl-choice.sel{background:#e6f4d6;border-color:var(--leaf2);box-shadow:0 3px 0 #3f8a33,0 0 0 4px rgba(143,208,103,.45)}
.wol-learn .wl-choice .wl-cic{width:3em;height:3em;border-radius:50%;display:grid;place-items:center;flex:none;background:rgba(95,174,74,.18);color:var(--moss);overflow:hidden}
.wol-learn .wl-choice .wl-cic .wl-ic{width:1.8em;height:1.8em}
.wol-learn .wl-choice .wl-cic img{width:115%;height:115%;object-fit:contain}
.wol-learn .wl-choice b{display:block;font-size:calc(1.3em * var(--tsr,1));color:#1f2c1a}
.wol-learn .wl-choice small{display:block;color:var(--ink2);font-size:calc(.92em * var(--tsr,1))}
.wol-learn .wl-setup .wl-btn.go{align-self:center;font-size:1.3em;padding:.5em 2.4em}
/* quiz */
.wol-learn .wl-quiz{gap:.9em;padding:0 1.6em 1.4em}
.wol-learn .wl-prog{display:flex;align-items:center;gap:.25em;padding:.3em .9em;border-radius:99px;background:rgba(0,0,0,.18)}
.wol-learn .wl-pl{width:1.9em;height:1.9em;color:rgba(246,240,220,.2);transition:color .3s,transform .3s;display:grid;place-items:center}
.wol-learn .wl-pl .wl-ic{width:100%;height:100%}
.wol-learn .wl-pl.ok{color:var(--leaf);transform:scale(1.08)}
.wol-learn .wl-pl.no{color:#b98a55}
.wol-learn .wl-pl.cur{color:var(--amber);animation:wl-pulse 1.4s ease-in-out infinite}
.wol-learn .wl-pnum{margin-inline-start:.6em;font-weight:700;color:#e2dcbd;white-space:nowrap}
.wol-learn .wl-qwrap{flex:0 1 calc(31em * var(--tsr,1));min-height:0;width:min(64em,100%);perspective:1600px;display:flex;margin-bottom:auto}
.wol-learn .wl-qcard{flex:1;min-height:0;border-radius:24px;padding:1.5em 1.8em;display:grid;grid-template-columns:17em 1fr;gap:1.8em;align-items:stretch;transform-origin:50% 50%;animation:wl-flipin .55s cubic-bezier(.2,.8,.3,1.1) both}
.wol-learn .wl-qcard.noart{grid-template-columns:1fr}
.wol-learn .wl-qart{position:relative;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;box-shadow:inset 0 0 0 2px rgba(201,184,141,.6);min-height:0}
.wol-learn .wl-qart img{width:100%;flex:1;min-height:0;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(40,30,10,.25));animation:wl-pop .6s .15s cubic-bezier(.2,.9,.3,1.3) both}
.wol-learn .wl-qart.tool img{width:72%}
.wol-learn .wl-qart .wl-anm{margin:.2em 0 .7em;padding:.2em .9em;border-radius:99px;background:rgba(255,255,255,.75);font-family:var(--serif);font-weight:700;font-size:calc(1.25em * var(--tsr,1));color:#1f2c1a}
.wol-learn .wl-qbody{display:flex;flex-direction:column;justify-content:flex-start;gap:.9em;min-height:0;overflow:auto;padding:.2em}
/* centred while it fits, and the question stays reachable when it does not (justify-content:center would clip the top) */
.wol-learn .wl-qbody>:first-child{margin-top:auto}
.wol-learn .wl-qbody>:last-child{margin-bottom:auto}
.wol-learn .wl-quiz.torah .wl-qbody>:first-child{margin-top:0}
.wol-learn .wl-qtag{align-self:flex-start;font-size:calc(.9em * var(--tsr,1));font-weight:800;color:var(--moss);background:rgba(95,174,74,.16);padding:.2em .8em;border-radius:99px}
.wol-learn .wl-q{font-family:var(--serif);font-size:calc(2em * var(--tsd,1));line-height:1.15;color:#1f2c1a}
.wol-learn .wl-quiz.easy .wl-q{font-size:calc(2.9em * var(--tsd,1))}
.wol-learn .wl-sub{font-family:var(--serif);font-size:calc(1.3em * var(--tsd,1));line-height:1.5;color:#2c3524;padding:.6em .9em;border-right:4px solid var(--amber);border-radius:4px 12px 12px 4px;background:rgba(240,180,76,.14)}
.wol-learn .wl-blank{display:inline-block;min-width:3.2em;border-bottom:3px dashed var(--amber2);text-align:center;color:var(--amber2);font-weight:800}
.wol-learn .wl-opts{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:.8em}
.wol-learn .wl-opts.stack{grid-template-columns:1fr}
.wol-learn .wl-opt{position:relative;display:flex;align-items:center;justify-content:center;gap:.55em;min-height:4.2em;padding:.5em .9em;border-radius:18px;background:#fbf6e5;border:2.5px solid var(--edge);box-shadow:0 4px 0 var(--edge);
  font-size:calc(1.22em * var(--tsr,1));font-weight:800;color:var(--ink);text-align:center;line-height:1.2;transition:transform .12s,background .25s,border-color .25s,opacity .3s}
.wol-learn .wl-opts.stack .wl-opt{justify-content:flex-start;text-align:right;min-height:3.3em;font-size:calc(1.12em * var(--tsd,1))}
.wol-learn .wl-quiz.easy .wl-opt{min-height:5.6em;font-size:calc(1.6em * var(--tsd,1))}
.wol-learn .wl-quiz.easy .wl-opts.stack .wl-opt{min-height:3em;font-size:calc(1.4em * var(--tsd,1))}
.wol-learn .wl-opt:hover:not(:disabled){transform:translateY(-3px);border-color:#a99863}
.wol-learn .wl-opt:active:not(:disabled){transform:translateY(1px)}
.wol-learn .wl-opt img{width:2.4em;height:2.4em;object-fit:contain;flex:none;border-radius:50%;background:radial-gradient(circle,#fff 30%,rgba(255,255,255,0) 72%)}
.wol-learn .wl-quiz.easy .wl-opt img{width:2.1em;height:2.1em}
.wol-learn .wl-opt img.pt{width:2.7em;height:2.7em;object-fit:cover;border-radius:.6em;background:none;box-shadow:0 0 0 2px rgba(255,255,255,.7),0 2px 5px rgba(40,30,10,.25)}
.wol-learn .wl-quiz.easy .wl-opt img.pt{width:2.5em;height:2.5em}
.wol-learn .wl-qart.paint{background:#2a3a24;justify-content:flex-end}
.wol-learn .wl-qart.paint img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 45%;filter:none}
.wol-learn .wl-qart.paint .wl-anm{position:relative;z-index:1;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.wol-learn .wl-opt i{display:grid;place-items:center;width:1.7em;height:1.7em;flex:none;color:var(--moss)}
.wol-learn .wl-opt i .wl-ic{width:100%;height:100%}
.wol-learn .wl-opt.t-day i{color:#e09a2c}.wol-learn .wl-opt.t-night i{color:#3c4f8a}.wol-learn .wl-opt.t-amazon i{color:#2f6a8a}.wol-learn .wl-opt.t-grove i{color:#4d7a2e}.wol-learn .wl-opt.t-reef i{color:#1f8ab0}.wol-learn .wl-opt.t-desert i{color:#c0802e}
.wol-learn .wl-opt.t-yes i{color:#3f8a33}.wol-learn .wl-opt.t-no i{color:#b8463a}
.wol-learn .wl-opt.ok{background:#e3f5d3;border-color:var(--leaf2);box-shadow:0 4px 0 #3f8a33;animation:wl-glow 1.2s ease-out both}
.wol-learn .wl-opt.no{background:#f7e0d6;border-color:#d39380;box-shadow:0 4px 0 #b9705c;animation:wl-shake .5s both}
.wol-learn .wl-opt.dim{opacity:.45}
.wol-learn .wl-opt .wl-mark{position:absolute;top:-.55em;left:-.55em;width:1.7em;height:1.7em;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:.8em;box-shadow:0 2px 6px rgba(0,0,0,.25);animation:wl-pop .4s both}
.wol-learn .wl-opt.ok .wl-mark{background:var(--leaf2)}.wol-learn .wl-opt.no .wl-mark{background:#c45a45}
.wol-learn .wl-fb{display:flex;align-items:center;gap:1em;padding:.75em 1em;border-radius:16px;animation:wl-rise .35s both}
.wol-learn .wl-fb.ok{background:rgba(95,174,74,.15);box-shadow:inset 0 0 0 2px rgba(95,174,74,.35)}
.wol-learn .wl-fb.no{background:rgba(240,180,76,.16);box-shadow:inset 0 0 0 2px rgba(217,142,38,.35)}
.wol-learn .wl-fbt{flex:1;min-width:0}
.wol-learn .wl-fbt b{display:block;font-size:calc(1.2em * var(--tsr,1));color:#1f2c1a}
.wol-learn .wl-fbt p{font-family:var(--serif);font-size:calc(1.08em * var(--tsr,1));line-height:1.45;color:#2c3524}
.wol-learn .wl-quiz.easy .wl-fbt p{font-size:calc(1.15em * var(--tsr,1))}
.wol-learn .wl-gotpack{display:inline-flex;align-items:center;gap:.35em;margin-top:.35em;padding:.2em .8em;border-radius:99px;background:linear-gradient(180deg,#f8d98a,#e8a43a);color:#3a2608;font-weight:800;font-size:.95em;animation:wl-bump .7s both}
/* end */
.wol-learn .wl-end{width:min(40em,92%);margin:auto;border-radius:26px;padding:1.8em 2em 2em;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.9em}
.wol-learn .wl-stars{display:flex;gap:.5em;align-items:flex-end}
.wol-learn .wl-stars span{width:4.6em;height:4.6em;color:#d7cba6;display:grid;place-items:center}
.wol-learn .wl-stars span:nth-child(2){width:5.8em;height:5.8em}
.wol-learn .wl-stars span .wl-ic{width:100%;height:100%}
.wol-learn .wl-stars span.on{color:var(--amber);filter:drop-shadow(0 4px 10px rgba(217,142,38,.55));animation:wl-star .6s cubic-bezier(.2,.9,.3,1.4) both}
.wol-learn .wl-end h2{font-family:var(--serif);font-size:calc(2.4em * var(--tsd,1));line-height:1.05;color:#1f2c1a}
.wol-learn .wl-end p{font-size:calc(1.2em * var(--tsr,1));color:var(--ink2)}
.wol-learn .wl-row{display:flex;gap:.8em;flex-wrap:wrap;justify-content:center}
/* album */
/* album: one slim bar of navigation on top, the rest of the page is cards */
.wol-learn .wl-album{align-items:stretch;padding:0 1.6em 0;gap:.6em;animation:none;min-width:0}
.wol-learn .wl-abar{flex:none;display:flex;align-items:center;gap:.6em;flex-wrap:nowrap;padding:.35em .6em .35em .7em;border-radius:18px;min-width:0}
.wol-learn .wl-abar .wl-btn{min-height:2.45em;padding:.2em .95em;font-size:.98em;gap:.4em;white-space:nowrap;flex:none;box-shadow:0 3px 0 var(--edge),0 5px 12px rgba(0,0,0,.16)}
.wol-learn .wl-abar .wl-btn.gold{box-shadow:0 3px 0 #9c6512,0 5px 12px rgba(0,0,0,.2)}
.wol-learn .wl-abar .wl-btn.go{box-shadow:0 3px 0 #2f6a26,0 5px 12px rgba(0,0,0,.2)}
.wol-learn .wl-abar .wl-btn .wl-ic{width:1.3em;height:1.3em}
.wol-learn .wl-count{flex:none;display:flex;flex-direction:column;min-width:0}
.wol-learn .wl-count b{font-size:1.08em;line-height:1.15;color:#1f2c1a;white-space:nowrap}
.wol-learn .wl-count .wl-meter{height:.5em;margin-top:.25em}
.wol-learn .wl-tabs{flex:0 1 auto;min-width:0;display:flex;gap:.2em;background:rgba(80,70,40,.1);padding:.2em;border-radius:99px;overflow-x:auto;scrollbar-width:none}
.wol-learn .wl-tabs::-webkit-scrollbar{display:none}
.wol-learn .wl-tab{flex:none;padding:.3em .85em;border-radius:99px;font-weight:700;color:var(--ink2);min-height:2.15em;white-space:nowrap}
.wol-learn .wl-tab.sel{background:#fbf6e5;color:#1f2c1a;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.wol-learn .wl-setsbtn .wl-ic{color:#7a5a12}
.wol-learn .wl-setsc{font-size:.8em;font-weight:900;padding:.1em .5em;border-radius:99px;background:rgba(80,70,40,.12);color:var(--ink2);direction:ltr}
.wol-learn .wl-setsbtn.on,.wol-learn .wl-setsbtn[aria-expanded="true"]{background:linear-gradient(180deg,#fff6d6,#f3d88e)}
.wol-learn .wl-abody{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;gap:.55em}
.wol-learn .wl-grid{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:grid;grid-template-columns:repeat(auto-fill,minmax(10.6em,1fr));gap:1.25em .9em;padding:.5em .5em 2em;align-content:start;justify-items:center;scrollbar-width:thin;scrollbar-color:rgba(246,240,220,.35) transparent;overscroll-behavior:contain}
.wol-learn .wl-grid .wl-card{--cw:10em;cursor:pointer}
.wol-learn .wl-grid .wl-card.anim,.wol-learn .wl-grid .wl-scard.anim{animation:wl-rise .4s both;animation-delay:calc(var(--d,0) * 22ms)}
.wol-learn .wl-grid .wl-card:not(.is-locked):hover{transform:translateY(-4px) scale(1.03);z-index:2}
/* a heading row in the grid: one part of the album */
.wol-learn .wl-gsec{--gc:#2f7a5a;grid-column:1/-1;justify-self:stretch;display:flex;align-items:center;gap:.7em;padding:.2em .2em 0;color:#f3ecd2;min-width:0}
.wol-learn .wl-gsec:not(:first-child){margin-top:.6em}
.wol-learn .wl-gsec b{flex:none;font-family:var(--serif);font-size:1.3em;line-height:1.2;padding:.1em .8em;border-radius:99px;background:var(--gc);color:#fff;box-shadow:inset 0 -.15em 0 rgba(0,0,0,.18),0 3px 10px rgba(0,0,0,.25)}
.wol-learn .wl-gsec .wl-gsub{flex:none;font-weight:700;color:#e2dcbd;white-space:nowrap}
.wol-learn .wl-gsec small{flex:none;font-weight:800;font-size:.95em;color:#f3ecd2;opacity:.85;white-space:nowrap}
.wol-learn .wl-gsec i{flex:1;height:2px;min-width:1em;background:linear-gradient(270deg,rgba(246,240,220,.35),rgba(246,240,220,0))}
/* card */
.wol-learn .wl-card{--cw:12em;position:relative;width:10em;height:14.2em;font-size:calc(var(--cw) / 10);border-radius:.8em;padding:.32em;flex:none;
  background:linear-gradient(150deg,#9fd57a,#4f9a3e 45%,#2f5a2a);box-shadow:0 .5em 1.2em rgba(0,0,0,.35),inset 0 0 0 .08em rgba(255,255,255,.35);transition:transform .2s;text-align:right;color:var(--ink)}
.wol-learn .wl-card .wl-ic{width:1em;height:1em}
.wol-learn .wl-card.r-rare{background:linear-gradient(150deg,#ffe9a8,#e8a43a 45%,#9c6512)}
.wol-learn .wl-card.r-epic{background:linear-gradient(150deg,#ffd27a,#d0503a 35%,#7a2148 70%,#f0b44c)}
.wol-learn .wl-card.r-tech{background:linear-gradient(150deg,#bfe6ff,#4aa3d6 45%,#24476e)}
.wol-learn .wl-card.r-epic::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.55) 45%,transparent 60%);background-size:250% 100%;mix-blend-mode:soft-light;animation:wl-sheen 3.2s linear infinite}
.wol-learn .wl-cin{position:relative;height:100%;border-radius:.55em;overflow:hidden;display:flex;flex-direction:column;
  background:radial-gradient(120% 70% at 100% 0%,rgba(255,255,255,.5),transparent 55%),repeating-linear-gradient(0deg,rgba(120,100,60,.04) 0 1px,transparent 1px 3px),#f3ecd6}
.wol-learn .r-tech .wl-cin{background:radial-gradient(120% 70% at 100% 0%,rgba(255,255,255,.6),transparent 55%),repeating-linear-gradient(90deg,rgba(40,90,140,.06) 0 1px,transparent 1px 8px),repeating-linear-gradient(0deg,rgba(40,90,140,.06) 0 1px,transparent 1px 8px),#e8f1f6}
.wol-learn .wl-ctop{display:flex;align-items:center;gap:.3em;padding:.32em .5em .16em}
.wol-learn .wl-cname{flex:1;min-width:0;font-family:var(--serif);font-weight:700;font-size:1.12em;line-height:1.05;color:#1f2c1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wol-learn .wl-cname.l{font-size:.95em}.wol-learn .wl-cname.xl{font-size:.74em}
.wol-learn .wl-badge{flex:none;font-size:.58em;font-weight:800;padding:.2em .65em;border-radius:99px;color:#fff}
.wol-learn .b-amazon{background:#2f7a5a}.wol-learn .b-grove{background:#9a7a2e}.wol-learn .b-reef{background:#1f8ab0}.wol-learn .b-tech{background:#2c5f8f}
.wol-learn .wl-cart{position:relative;margin:0 .4em;height:4.6em;flex:none;border-radius:.45em;display:grid;place-items:center;overflow:hidden;box-shadow:inset 0 0 0 .08em rgba(150,130,80,.45)}
.wol-learn .wl-cart img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 .25em .3em rgba(40,30,10,.25))}
.wol-learn .wl-cart.tool img{width:74%;height:74%}
.wol-learn .wl-cart.paint{height:4.75em;background:#2a3a24;box-shadow:inset 0 0 0 .08em rgba(150,130,80,.55),0 .1em .25em rgba(40,30,10,.25)}
.wol-learn .wl-cart.paint img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 45%;filter:none}
.wol-learn .wl-cart b{font-family:var(--serif);font-size:3em;color:rgba(40,50,30,.5)}
.wol-learn .wl-ctype{display:flex;align-items:center;justify-content:space-between;gap:.3em;padding:.28em .55em .1em;font-size:.6em;font-weight:700;color:var(--ink2)}
.wol-learn .wl-gems{display:flex;gap:.04em;color:#3f8a33;cursor:help}
.wol-learn .r-rare .wl-gems{color:#d98e26}.wol-learn .r-epic .wl-gems{color:#b3306a}.wol-learn .r-tech .wl-gems{color:#2c5f8f}
.wol-learn .wl-gem{display:flex;color:rgba(80,70,40,.2)}
.wol-learn .wl-gem.on,.wol-learn .wl-gem.t{color:inherit;filter:drop-shadow(0 .05em .08em rgba(40,30,10,.3))}
.wol-learn .wl-gem .wl-ic{width:1.15em;height:1.15em}
.wol-learn .wl-badge{cursor:help}
.wol-learn .wl-stats{display:flex;gap:.22em;padding:.22em .4em}
.wol-learn .wl-st{flex:1;display:flex;flex-direction:column;align-items:center;padding:.18em 0 .12em;border-radius:.4em;background:rgba(80,70,40,.08);transition:background .3s,box-shadow .3s,transform .3s}
.wol-learn .wl-st i{display:flex;align-items:center;gap:.15em;font-size:.75em;line-height:1}
.wol-learn .wl-st b{font-size:.9em;line-height:1;color:#1f2c1a;margin-top:.08em}
.wol-learn .wl-st small{font-size:.46em;line-height:1.3;font-weight:700;color:var(--ink2)}
.wol-learn .s-light i{color:#e09a2c}.wol-learn .s-water i{color:#2d8fd0}.wol-learn .s-shelter i{color:#c0703a}.wol-learn .s-links i{color:#4d8a3a}
.wol-learn .wl-st.hl{background:rgba(240,180,76,.4);box-shadow:0 0 0 .1em #e09a2c;transform:scale(1.08)}
.wol-learn .wl-cfact{flex:1 1 auto;min-height:0;margin:.1em .5em 0;font-family:var(--serif);font-size:.48em;line-height:1.24;color:#2c3524;overflow:hidden}
.wol-learn .wl-crar{margin-top:auto;font-size:.5em;font-weight:800;letter-spacing:.04em;text-align:center;padding:0 0 .4em;color:var(--ink2);cursor:help}
.wol-learn .r-rare .wl-crar{color:#9c6512}.wol-learn .r-epic .wl-crar{color:#8a2452}.wol-learn .r-tech .wl-crar{color:#24476e}
.wol-learn .wl-new{position:absolute;top:-.55em;left:-.5em;z-index:3;font-size:.85em;font-weight:900;color:#fff;background:var(--berry);padding:.2em .7em;border-radius:99px;transform:rotate(-10deg);box-shadow:0 .2em .5em rgba(0,0,0,.3);animation:wl-pop .5s .2s both}
.wol-learn .wl-cnt{position:absolute;bottom:-.4em;left:-.4em;font-size:.75em;font-weight:900;background:#1f2c1a;color:var(--cream);padding:.1em .55em;border-radius:99px}
.wol-learn .wl-card.is-locked{background:linear-gradient(150deg,#3c5a3a,#1e3324);cursor:default}
.wol-learn .is-locked .wl-cin{background:repeating-linear-gradient(45deg,rgba(255,255,255,.03) 0 .5em,transparent .5em 1em),#203a2a;display:grid;place-items:center}
.wol-learn .wl-sil{position:absolute;inset:1.2em .8em 2.6em;display:grid;place-items:center}
.wol-learn .wl-sil img{width:100%;height:100%;object-fit:contain;filter:brightness(0);opacity:.42}
.wol-learn .wl-qm{position:relative;font-family:var(--serif);font-size:4em;color:rgba(246,240,220,.55);text-shadow:0 .05em .2em rgba(0,0,0,.4)}
.wol-learn .wl-lockb{position:absolute;bottom:.7em;left:0;right:0;text-align:center;font-size:.62em;font-weight:800;color:rgba(246,240,220,.6)}
.wol-learn .wl-cback{background:linear-gradient(150deg,#c8e6a8,#5fae4a 40%,#1f4a28)}
.wol-learn .wl-cback .wl-cin{display:flex;align-items:center;justify-content:center;gap:.5em;background:radial-gradient(circle at 50% 42%,rgba(240,180,76,.35),transparent 45%),repeating-radial-gradient(circle at 50% 42%,rgba(255,255,255,.06) 0 .3em,transparent .3em .9em),#1f4a2c;color:var(--cream)}
.wol-learn .wl-emb{width:5em;height:5em;border-radius:50%;display:grid;place-items:center;background:rgba(246,240,220,.12);box-shadow:0 0 0 .2em rgba(240,180,76,.6),0 0 1.5em rgba(240,180,76,.4);color:#f6cf72}
.wol-learn .wl-emb .wl-ic{width:3.2em;height:3.2em}
.wol-learn .wl-cback span{font-family:var(--serif);font-weight:700;font-size:1.25em}
/* flip */
.wol-learn .wl-flip{--cw:12em;position:relative;width:10em;height:14.2em;perspective:1200px;font-size:calc(var(--cw) / 10)}
.wol-learn .wl-fin{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.3,.8,.3,1.15)}
.wol-learn .wl-flip.is-up .wl-fin{transform:rotateY(180deg)}
.wol-learn .wl-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.wol-learn .wl-ffront{transform:rotateY(180deg)}
.wol-learn .wl-face>.wl-card{font-size:1em;width:100%;height:100%}
/* pack */
.wol-learn .wl-packs{justify-content:center;gap:1.2em;padding:0 2em 2em}
.wol-learn .wl-ptitle{text-align:center;font-family:var(--serif);font-size:2em;color:#f6eed0;text-shadow:0 2px 14px rgba(0,0,0,.4)}
.wol-learn .wl-psub{text-align:center;color:#e2dcbd;font-size:1.1em;margin-top:.2em;min-height:1.4em}
.wol-learn .wl-stage{position:relative;width:100%;height:25em;display:flex;align-items:center;justify-content:center}
.wol-learn .wl-rays{position:absolute;left:50%;top:50%;width:46em;height:46em;margin:-23em;border-radius:50%;pointer-events:none;opacity:0;transition:opacity 1s;
  background:repeating-conic-gradient(from 0deg,rgba(255,236,170,.32) 0 7deg,transparent 7deg 22deg);
  -webkit-mask:radial-gradient(circle,#000 8%,transparent 66%);mask:radial-gradient(circle,#000 8%,transparent 66%)}
.wol-learn .wl-stage:not(.lit) .wl-rays{display:none}
.wol-learn .wl-stage.lit .wl-rays{animation:wl-fadein .8s ease-out both,wl-spin 26s linear infinite}
.wol-learn .wl-pack{--glow:0;position:relative;z-index:1;width:13em;height:18em;border-radius:1.3em;cursor:pointer;perspective:700px;
  background:linear-gradient(160deg,rgba(255,255,255,.3),transparent 40%),radial-gradient(90% 60% at 50% 100%,rgba(240,180,76,.25),transparent 70%),linear-gradient(180deg,#4f9a3e,#2f5a2a 70%,#1e3d28);
  box-shadow:0 1.4em 2.6em rgba(0,0,0,.45),inset 0 0 0 .35em rgba(246,240,220,.28),0 0 calc(var(--glow) * 3.2em) calc(var(--glow) * .9em) rgba(255,214,120,calc(var(--glow) * .75));
  display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:1.5em;color:var(--cream);animation:wl-float 3s ease-in-out infinite;
  transition:transform .6s cubic-bezier(.5,0,.7,.4),opacity .6s,box-shadow .3s}
.wol-learn .wl-pack:disabled{cursor:default}
.wol-learn .wl-pin{position:absolute;left:1.2em;right:1.2em;top:.25em;height:2.4em;border-radius:50%;background:radial-gradient(closest-side,#fff6d0,rgba(255,214,120,.7) 45%,transparent);opacity:0;transition:opacity .4s .15s}
.wol-learn .wl-pflap{position:absolute;left:0;right:0;top:0;height:7.4em;border-radius:1.3em 1.3em 0 0;transform-origin:50% 0;transition:transform .55s cubic-bezier(.3,.6,.3,1.2);
  background:linear-gradient(180deg,#78bd5a,#4a8a3a);clip-path:polygon(0 0,100% 0,100% 22%,50% 100%,0 22%)}
.wol-learn .wl-ptw{position:absolute;left:50%;width:.55em;margin-left:-.275em;border-radius:.3em;transition:transform .5s cubic-bezier(.3,.7,.4,1),opacity .5s;
  background:repeating-linear-gradient(135deg,#e8d6a6 0 .3em,#b89660 .3em .55em);box-shadow:0 .1em .2em rgba(0,0,0,.25)}
.wol-learn .wl-ptw.a{top:0;height:7.4em}.wol-learn .wl-ptw.b{top:7.4em;bottom:4.9em}
.wol-learn .wl-pseal{position:absolute;top:5em;left:50%;width:4.8em;height:4.8em;margin-left:-2.4em;border-radius:50%;display:grid;place-items:center;color:#6b3f0c;z-index:2;
  background:radial-gradient(circle at 38% 32%,#ffe39a,#f0b44c 45%,#c4801e 80%,#9a5d12);box-shadow:0 .25em .5em rgba(0,0,0,.35),inset 0 0 0 .28em rgba(154,93,18,.55),inset 0 0 0 .42em rgba(255,227,154,.5);
  transition:transform .55s cubic-bezier(.3,.6,.4,1),opacity .55s}
.wol-learn .wl-pseal>.wl-ic{width:2.7em;height:2.7em}
.wol-learn .wl-pcrk{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:#fff8d6;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 .25em #ffe9a0)}
.wol-learn .wl-pcrk path{stroke-dasharray:40;stroke-dashoffset:40;transition:stroke-dashoffset .3s ease-out}
.wol-learn .crk1 .wl-pcrk .c1,.wol-learn .crk2 .wl-pcrk .c1,.wol-learn .crk2 .wl-pcrk .c2,.wol-learn .crk3 .wl-pcrk path{stroke-dashoffset:0}
.wol-learn .wl-pack b{font-family:var(--serif);font-size:1.9em;line-height:1}
.wol-learn .wl-pack small{font-weight:700;opacity:.85}
.wol-learn .wl-pack.hit{animation:wl-phit .38s cubic-bezier(.3,.7,.4,1.4)}
.wol-learn .wl-pack.crk2.hit{animation:wl-phit2 .45s cubic-bezier(.3,.7,.4,1.4)}
.wol-learn .wl-pack.open{animation:none}
.wol-learn .wl-pack.open .wl-pflap{transform:rotateX(-165deg)}
.wol-learn .wl-pack.open .wl-pin{opacity:1}
.wol-learn .wl-pack.open .wl-pseal{transform:translate(4em,-5em) rotate(160deg) scale(.6);opacity:0}
.wol-learn .wl-pack.open .wl-ptw.a{transform:translateY(-3em) rotate(-25deg);opacity:0}
.wol-learn .wl-pack.open .wl-ptw.b{transform:translateY(3em) rotate(18deg);opacity:0}
.wol-learn .wl-pack.gone{transform:translateY(9em) scale(.85);opacity:0}
.wol-learn .wl-flash{position:absolute;left:50%;top:50%;z-index:1;width:30em;height:30em;margin:-15em;border-radius:50%;background:radial-gradient(circle,rgba(255,240,190,.95),rgba(240,180,76,.35) 40%,transparent 70%);pointer-events:none;animation:wl-flash .8s ease-out both}
/* pack v2: a foil bag rendered in Blender (src/data/pack-art.js: body + the strip above the tear line) */
.wol-learn .wl-pack.v2{width:14em;height:21em;border-radius:0;background:none;box-shadow:none;padding:0;color:inherit;z-index:3;
  --rx:0deg;--ry:0deg;--rc:255,214,120;transform-style:preserve-3d;animation:wl-pkidle 4.2s ease-in-out infinite;
  filter:drop-shadow(0 1.3em 1.4em rgba(0,0,0,.45)) drop-shadow(0 0 calc(var(--glow) * 2.6em) rgba(var(--rc),calc(var(--glow) * .9)))}
.wol-learn .wl-pack.v2 .wl-pk3{position:absolute;inset:0;transform:rotateX(var(--rx)) rotateY(var(--ry));transition:transform .25s ease-out;transform-style:preserve-3d}
.wol-learn .wl-pk-body,.wol-learn .wl-pk-strip{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat;overflow:hidden;
  -webkit-mask-size:100% 100%;mask-size:100% 100%;transition:transform .7s cubic-bezier(.25,.8,.3,1),opacity .7s}
.wol-learn .wl-pk-sheen{position:absolute;inset:-20% -60%;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.55) 47%,rgba(255,240,200,.25) 52%,transparent 60%);
  mix-blend-mode:overlay;transform:translateX(-60%);animation:wl-pksheen 4.2s ease-in-out infinite}
.wol-learn .wl-pk-tear{position:absolute;left:4%;right:4%;height:.5em;margin-top:-.25em;border-radius:.3em;pointer-events:none;
  background:linear-gradient(90deg,rgba(var(--rc),.0),rgba(255,255,255,.95) 50%,rgba(var(--rc),.0));box-shadow:0 0 .8em .25em rgba(var(--rc),.9);
  clip-path:inset(0 0 0 100%);transition:clip-path .45s ease-out}
.wol-learn .wl-pack.v2.crk1 .wl-pk-tear{clip-path:inset(0 0 0 62%)}
.wol-learn .wl-pack.v2.crk2 .wl-pk-tear{clip-path:inset(0 0 0 28%)}
.wol-learn .wl-pack.v2.crk3 .wl-pk-tear{clip-path:inset(0 0 0 0)}
.wol-learn .wl-pk-beam{position:absolute;left:8%;right:8%;bottom:calc(100% - var(--tear));height:26em;transform-origin:50% 100%;transform:scaleY(0);opacity:0;pointer-events:none;
  background:linear-gradient(0deg,rgba(255,255,255,.95),rgba(var(--rc),.55) 30%,transparent 85%);clip-path:polygon(8% 100%,92% 100%,100% 0,0 0);filter:blur(2px);
  transition:transform .5s cubic-bezier(.2,.8,.3,1),opacity .5s}
.wol-learn .wl-pack.v2.hit{animation:wl-pkshake .36s ease-in-out}
.wol-learn .wl-pack.v2.crk2.hit{animation:wl-pkshake2 .42s ease-in-out}
.wol-learn .wl-pack.v2.crk3.hit{animation:wl-pkshake2 .3s ease-in-out infinite}
.wol-learn .wl-pack.v2.open{animation:none}
.wol-learn .wl-pack.v2.open .wl-pk-strip{transform:translate(-4.5em,-7em) rotate(-24deg);opacity:0}
.wol-learn .wl-pack.v2.open .wl-pk-tear{opacity:0;transition:opacity .2s}
.wol-learn .wl-pack.v2.open .wl-pk-beam{transform:scaleY(1);opacity:1}
.wol-learn .wl-pack.v2.open .wl-pk-sheen{animation:none;opacity:0}
.wol-learn .wl-pack.v2.gone{transform:translateY(12em) scale(.92);opacity:0;transition:transform .8s cubic-bezier(.5,0,.7,.4),opacity .8s}
.wol-learn .wl-pack.v2.gone .wl-pk-beam{opacity:0}
.wol-learn .wl-stage.v2 .wl-flip{z-index:2}
.wol-learn .wl-stage.v2 .wl-flip.rise:not(.out){transform:translateY(-8.4em) scale(.72)}
.wol-learn .wl-stage.v2 .wl-flip.rise.k0:not(.out){transform:translateY(-8em) translateX(.9em) scale(.72) rotate(5deg)}
.wol-learn .wl-stage.v2 .wl-flip.rise.k2:not(.out){transform:translateY(-8em) translateX(-.9em) scale(.72) rotate(-5deg)}
.wol-learn .wl-stage.v2 .wl-flip.out{z-index:4}
@keyframes wl-pkidle{0%,100%{transform:translateY(0) rotateZ(-1.2deg)}50%{transform:translateY(-.55em) rotateZ(1.2deg)}}
@keyframes wl-pksheen{0%,45%{transform:translateX(-60%)}75%,100%{transform:translateX(60%)}}
@keyframes wl-pkshake{0%,100%{transform:none}25%{transform:translateX(-.25em) rotate(-2deg) scale(1.02)}55%{transform:translateX(.25em) rotate(2deg)}80%{transform:translateX(-.1em)}}
@keyframes wl-pkshake2{0%,100%{transform:scale(1.03)}25%{transform:translateX(-.35em) rotate(-3deg) scale(1.05)}55%{transform:translateX(.35em) rotate(3deg) scale(1.04)}80%{transform:translateX(-.15em) scale(1.05)}}
@media (prefers-reduced-motion: reduce){.wol-learn .wl-pack.v2,.wol-learn .wl-pk-sheen{animation:none}}
/* torah edition: sources in the quiz, the album page of source cards, the switch on the hub home */
.wol-learn .wl-src{margin:.6em 0 .2em;padding:.55em .9em;border-radius:.8em;background:linear-gradient(180deg,#fbf3dc,#f2e5c0);border:1px solid rgba(160,120,50,.35);text-align:center;color:#3a2e18}
.wol-learn .wl-src .t{margin:0;font-family:var(--serif);font-size:1.15em;line-height:1.95}
.wol-learn .wl-src small{display:block;color:#8a6a3a;font-size:.85em}
.wol-learn .wl-src .n{margin:.3em 0 0;font-size:.9em;color:#5a4a2a}
.wol-learn .wl-src.shira{margin:.8em 0}
.wol-learn .wl-gotpack.src{background:linear-gradient(180deg,#fbf0d0,#efd9a0);color:#5a3a10}
.wol-learn .wl-gotpack.src .wl-ic{width:1.2em;height:1.2em}
.wol-learn .wl-pk-wait{display:grid;place-items:center;width:9em;height:12em;border-radius:1em;background:rgba(246,240,220,.08);box-shadow:inset 0 0 0 3px rgba(246,240,220,.2)}
.wol-learn .wl-pk-wait .wl-ic{width:4.5em;height:4.5em;color:#f6cf72;opacity:.8}
.wol-learn .wl-scard{--sc:#b8892e;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4em;min-height:13.5em;padding:1.2em .9em;border-radius:1em;cursor:pointer;
  color:#3a2a10;text-align:center;font:inherit;border:0;
  background:radial-gradient(120% 80% at 50% 0%,rgba(255,255,255,.65),transparent 60%),linear-gradient(180deg,#fbf3dc,#ecdcb0);
  box-shadow:0 0 0 .3em #fff8e6,0 0 0 .45em var(--sc),0 .6em 1.2em rgba(0,0,0,.3);animation:wl-fadein .5s ease-out both;animation-delay:calc(var(--d,0) * 60ms)}
.wol-learn .wl-scard .wl-sci{display:grid;place-items:center;width:3.6em;height:3.6em;border-radius:50%;background:var(--sc);color:#fff8e6;box-shadow:inset 0 0 0 .25em rgba(255,255,255,.35)}
.wol-learn .wl-scard .wl-sci .wl-ic{width:2em;height:2em}
.wol-learn .wl-scard b{font-family:var(--serif);font-size:1.25em;line-height:1.5}
.wol-learn .wl-scard small{font-size:.85em;opacity:.8;line-height:1.35}
.wol-learn .wl-scard.locked{filter:saturate(.2);opacity:.75}
.wol-learn .wl-scard.locked b{opacity:.7}
.wol-learn .wl-scard:not(.locked):hover{transform:translateY(-.2em)}
.wol-learn .wl-scard.big{width:13em;min-height:18em;cursor:default;animation:none}
.wol-learn .wl-grid .wl-scard{width:10em;height:14.2em;min-height:0;overflow:hidden;border-radius:.8em;box-shadow:0 0 0 .2em #fff8e6,0 0 0 .34em var(--sc),0 .5em 1.2em rgba(0,0,0,.35);animation:none}
.wol-learn .wl-grid .wl-scard.art{padding:.45em .45em .6em;gap:.2em}
.wol-learn .wl-grid .wl-scard .wl-sart{aspect-ratio:1.55;border-radius:.55em}
.wol-learn .wl-grid .wl-scard.art .wl-sci{width:2.5em;height:2.5em;margin-top:-1.45em}
.wol-learn .wl-grid .wl-scard.art .wl-sci .wl-ic{width:1.35em;height:1.35em}
.wol-learn .wl-grid .wl-scard b{font-size:1.08em;line-height:1.3;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;flex:none}
.wol-learn .wl-grid .wl-scard small{font-size:.8em;line-height:1.3;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
.wol-learn .wl-grid .wl-scard:not(.locked):hover{transform:translateY(-4px) scale(1.03);z-index:2}
.wol-learn .wl-scard.art{justify-content:flex-start;padding:.55em .55em .9em;gap:.25em}
.wol-learn .wl-sart{position:relative;display:block;width:100%;aspect-ratio:1.45;border-radius:.65em;overflow:hidden;flex:none;box-shadow:inset 0 0 0 .12em rgba(80,50,10,.35)}
.wol-learn .wl-sart img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.wol-learn .wl-sart.none{display:grid;place-items:center;background:radial-gradient(circle at 28% 22%,rgba(255,248,230,.5),rgba(255,248,230,0) 58%),radial-gradient(circle at 80% 90%,rgba(40,25,5,.25),rgba(40,25,5,0) 55%),var(--sc)}
.wol-learn .wl-sart.none i{display:grid;place-items:center;width:42%;aspect-ratio:1;border-radius:50%;background:rgba(255,248,230,.16);box-shadow:0 0 0 .35em rgba(255,248,230,.1)}
.wol-learn .wl-sart.none .wl-ic{width:62%;height:62%;color:rgba(255,248,230,.85)}
.wol-learn .wl-scard.art .wl-sci{width:2.8em;height:2.8em;margin-top:-1.6em;position:relative;box-shadow:inset 0 0 0 .2em rgba(255,255,255,.35),0 0 0 .2em #fbf3dc}
.wol-learn .wl-scard.art .wl-sci .wl-ic{width:1.5em;height:1.5em}
.wol-learn .wl-scard.art b{font-size:1.15em;line-height:1.35}
.wol-learn .wl-scard.locked .wl-sart img{filter:blur(.35em) grayscale(.6);transform:scale(1.15)}
.wol-learn .wl-scard.big.art{width:min(17em,44vh);min-height:0}
.wol-learn .wl-scard.big .wl-sart{aspect-ratio:1}
.wol-learn .wl-smtext{max-width:34em}
.wol-learn .wl-sstory p{margin:.4em 0;font-family:var(--serif);font-size:1.1em;line-height:2}
.wol-learn .wl-slesson{margin:.6em 0;font-weight:700}
.wol-learn .wl-srcsw{display:flex;align-items:center;gap:.8em;margin:0 auto 1em;padding:.6em 1em;border-radius:1em;border:0;font:inherit;color:#3a2a10;cursor:pointer;max-width:34em;width:100%;text-align:right}
.wol-learn .wl-srcsw>.wl-ic{width:1.8em;height:1.8em;color:#b8892e;flex:none}
.wol-learn .wl-srcsw span{flex:1;display:flex;flex-direction:column}
.wol-learn .wl-srcsw small{opacity:.8}
.wol-learn .wl-srcsw .sw{position:relative;width:2.6em;height:1.5em;border-radius:1em;background:#b6b294;flex:none;transition:background .2s}
.wol-learn .wl-srcsw .sw::after{content:"";position:absolute;top:.2em;right:.2em;width:1.1em;height:1.1em;border-radius:50%;background:#fbfaf0;transition:right .2s}
.wol-learn .wl-srcsw.on .sw{background:#5fae4a}
.wol-learn .wl-srcsw.on .sw::after{right:1.3em}
.wol-learn .wl-quiz.torah .wl-qtag{background:#b8892e;color:#fff8e6}
.wol-learn .wl-quiz.torah .wl-opt.dim{display:none}
.wol-learn .wl-quiz.torah .wl-qwrap{flex-basis:36em}
.wol-learn .wl-quiz.torah .wl-qbody{justify-content:flex-start}
/* cards out of the pack: inside → rise → spread (right to left) */
.wol-learn .wl-stage .wl-flip{--cw:13em;position:absolute;z-index:2;left:50%;top:50%;margin:-7.1em 0 0 -5em;opacity:0;outline:none;
  transition:transform .75s cubic-bezier(.2,.9,.3,1.15),opacity .35s;transform:translateY(4em) scale(.5)}
.wol-learn .wl-stage .wl-flip.rise{opacity:1;transform:translateY(-3.2em) scale(.72)}
.wol-learn .wl-stage .wl-flip.rise.k0{transform:translateY(-3.2em) translateX(.5em) scale(.72) rotate(4deg)}
.wol-learn .wl-stage .wl-flip.rise.k2{transform:translateY(-3.2em) translateX(-.5em) scale(.72) rotate(-4deg)}
.wol-learn .wl-stage .wl-flip.out.k0{transform:translateX(11.5em) translateY(.8em) rotate(5deg)}
.wol-learn .wl-stage .wl-flip.out.k1{transform:translateY(-.4em)}
.wol-learn .wl-stage .wl-flip.out.k2{transform:translateX(-11.5em) translateY(.8em) rotate(-5deg)}
.wol-learn .wl-stage .wl-flip.out:not(.is-up){cursor:pointer}
.wol-learn .wl-stage .wl-flip.out:not(.is-up):not(.tease):hover .wl-fin,.wol-learn .wl-stage .wl-flip.out:not(.is-up):focus-visible .wl-fin{transform:translateY(-.5em) scale(1.04);transition-duration:.25s}
.wol-learn .wl-stage .wl-flip:focus-visible .wl-fback .wl-card{outline:.18em solid var(--amber);outline-offset:.2em}
/* rarity hint glowing through the back of the card */
.wol-learn .wl-flip .wl-fback{border-radius:.8em;transition:box-shadow .4s}
.wol-learn .wl-stage .wl-flip.out:not(.is-up).h-common .wl-fback{box-shadow:0 0 1.2em .1em rgba(183,224,142,.45)}
.wol-learn .wl-stage .wl-flip.out:not(.is-up).h-tech .wl-fback{box-shadow:0 0 1.6em .3em rgba(140,195,220,.7);animation:wl-hint 1.8s ease-in-out infinite}
.wol-learn .wl-stage .wl-flip.out:not(.is-up).h-rare .wl-fback{box-shadow:0 0 1.8em .4em rgba(246,207,114,.8);animation:wl-hint 1.4s ease-in-out infinite}
.wol-learn .wl-stage .wl-flip.out:not(.is-up).h-epic .wl-fback{box-shadow:0 0 2em .5em rgba(231,154,171,.8),0 0 3.4em .9em rgba(185,168,224,.55);animation:wl-hint 1s ease-in-out infinite}
.wol-learn .wl-stage .wl-flip.tease .wl-fin{animation:wl-tease .3s ease-in-out infinite}
.wol-learn .wl-stage .wl-flip.tease.h-epic .wl-fin{animation-duration:.2s}
.wol-learn .wl-flip:not(.is-up) .wl-new{animation:none;opacity:0}
.wol-learn .wl-flip.is-up .wl-new{animation:wl-stamp .5s .5s cubic-bezier(.3,1.6,.5,1) both}
/* reveal burst behind the card */
.wol-learn .wl-burst{position:absolute;left:50%;top:50%;width:26em;height:26em;margin:-13em;border-radius:50%;z-index:-1;pointer-events:none;
  -webkit-mask:radial-gradient(circle,#000 18%,transparent 64%);mask:radial-gradient(circle,#000 18%,transparent 64%);animation:wl-burst 1.4s ease-out both}
.wol-learn .wl-burst.b-common{background:repeating-conic-gradient(rgba(183,224,142,.55) 0 8deg,transparent 8deg 30deg)}
.wol-learn .wl-burst.b-tech{background:repeating-conic-gradient(rgba(140,195,220,.65) 0 8deg,transparent 8deg 24deg)}
.wol-learn .wl-burst.b-rare,.wol-learn .wl-burst.b-epic{animation:wl-burst2 2.2s ease-out both,wl-spin 12s linear infinite}
.wol-learn .wl-burst.b-rare{background:repeating-conic-gradient(rgba(246,207,114,.75) 0 7deg,transparent 7deg 18deg)}
.wol-learn .wl-burst.b-epic{width:32em;height:32em;margin:-16em;background:repeating-conic-gradient(rgba(246,207,114,.8) 0 6deg,transparent 6deg 12deg,rgba(231,154,171,.75) 12deg 18deg,transparent 18deg 24deg,rgba(185,168,224,.75) 24deg 30deg,transparent 30deg 36deg)}
.wol-learn .wl-rsay{position:absolute;left:50%;top:-2.35em;z-index:4;white-space:nowrap;font-family:var(--serif);font-weight:700;font-size:1.05em;padding:.2em .9em;border-radius:99px;transform:translateX(-50%);pointer-events:none;animation:wl-say .6s .35s cubic-bezier(.3,1.6,.5,1) both;box-shadow:0 .3em .8em rgba(0,0,0,.3)}
.wol-learn .wl-rsay.s-rare{background:linear-gradient(180deg,#ffe9a8,#e8a43a);color:#4a2c06}
.wol-learn .wl-rsay.s-epic{background:linear-gradient(90deg,#f6cf72,#e79aab,#b9a8e0);color:#3a1630}
.wol-learn .wl-rsay.s-tech{background:linear-gradient(180deg,#dbeaf0,#8cc3dc);color:#1f3f58}`;
