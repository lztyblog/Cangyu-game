(()=>{'use strict';
const frame=document.querySelector('iframe'),game=document.body.dataset.gameId,seen=new WeakSet();if(!frame||!game)return;
function attach(){try{const doc=frame.contentDocument,win=frame.contentWindow;if(!doc||seen.has(doc))return;seen.add(doc);let started=false;
 function blocked(){if(game==='life-on-credit'){const v=win.CreditView;return !v||v.mode!=='play'||v.game?.status!=='fight';}if(game==='echo-break'){const v=win.EchoView;return !v||!v.game||v.menu||v.paused||v.game.status!=='fight'||(v.mode==='lesson'&&(v.teacher.demo||v.teacher.done));}return Array.from(doc.querySelectorAll('.overlay')).some(o=>!o.hidden&&win.getComputedStyle(o).display!=='none'&&win.getComputedStyle(o).visibility!=='hidden'&&o.getClientRects().length>0);}
 function start(e){if(!e.isTrusted||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select,[contenteditable=true]')||blocked())return;
  if(game==='echo-break'){if(e.type==='keydown'&&!/^(Key[WASDJKIUL]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft|ShiftRight)$/.test(e.code))return;if(e.type==='pointerdown'&&!e.target.closest?.('[data-hold],[data-action]'))return;}
  if(game!=='echo-break'&&e.type==='keydown'&&!/^(Key[WASDJKLQEFRCZ]|ShiftLeft|ShiftRight|Arrow(Up|Down|Left|Right)|Space)$/.test(e.code))return;
  if(game!=='echo-break'&&e.type==='pointerdown'&&!e.target.closest?.('#game,[data-hold],[data-act],[data-dir],#interact,#echo,#haul,#parcel,#rewind'))return;
  window.CangyuStats?.activity?.();if(started)return;started=true;window.CangyuStats?.play(game);
 }
 doc.addEventListener('keydown',start,true);doc.addEventListener('pointerdown',start,true);
 }catch{/* A game remains playable if analytics cannot attach. */}}
frame.addEventListener('load',attach);if(frame.contentDocument?.readyState==='complete')attach();
})();

