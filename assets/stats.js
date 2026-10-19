(()=>{'use strict';
const cfg=window.CANGYU_STATS;if(!cfg)return;
const games=['borrow-a-bump','give-yourself-a-path','ghost-signal','borrowed-fire'],key='cangyu-stats-v1:',online=location.origin===cfg.siteOrigin&&location.pathname.startsWith(cfg.sitePath),memory=new Map();
function read(k,fallback){try{const s=localStorage.getItem(key+k);return s?JSON.parse(s):fallback;}catch{return memory.has(k)?memory.get(k):fallback;}}
function write(k,v){memory.set(k,v);try{localStorage.setItem(key+k,JSON.stringify(v));}catch{}}
function uuid(){return globalThis.crypto?.randomUUID?.()||'anon_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+'_'+Math.random().toString(36).slice(2);}
let visitor=read('visitor',null);if(typeof visitor!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(visitor)){visitor=uuid();write('visitor',visitor);}
let queue=read('pending',[]);if(!Array.isArray(queue))queue=[];queue=queue.filter(e=>e&&typeof e.id==='string'&&e.visitor===visitor&&['visit','play','download'].includes(e.kind)).slice(-200);
let sending=false,refreshing=false,snapshot=null;
function status(text){for(const el of document.querySelectorAll('[data-stats-status]'))el.textContent=text;}
function valid(d){return d&&d.schema===1&&d.site&&['visits','visitors'].every(k=>Number.isSafeInteger(d.site[k])&&d.site[k]>=0)&&d.games&&games.every(g=>d.games[g]&&['plays','players','downloads','downloaders'].every(k=>Number.isSafeInteger(d.games[g][k])&&d.games[g][k]>=0));}
function paint(d){snapshot=d;for(const el of document.querySelectorAll('[data-stat]')){const source=el.dataset.game?d.games[el.dataset.game]:d.site,value=source?.[el.dataset.stat];if(Number.isSafeInteger(value))el.textContent=value.toLocaleString('zh-CN');}}
const cached=read('snapshot',null);if(valid(cached)){paint(cached);status('上次统计 · 正在更新');}
async function network(path,init={}){const controller=typeof AbortController!=='undefined'?new AbortController():null,t=controller?setTimeout(()=>controller.abort(),8000):null;try{return await fetch(cfg.endpoint+path,{cache:'no-store',credentials:'omit',...init,...(controller?{signal:controller.signal}:{})});}finally{if(t)clearTimeout(t);}}
async function refresh(){if(!online||refreshing||document.hidden)return;refreshing=true;try{const r=await network('/api/stats');if(!r.ok)throw Error();const d=await r.json();if(!valid(d))throw Error();paint(d);write('snapshot',d);status('每 10 秒更新 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}));}catch{status(snapshot?'暂时无法更新 · 显示上次统计':'统计暂不可用 · 游玩与下载不受影响');}finally{refreshing=false;}}
function syncQueue(){const other=read('pending',[]);if(Array.isArray(other))queue=[...new Map([...other,...queue].filter(e=>e&&e.visitor===visitor&&typeof e.id==='string').map(e=>[e.id,e])).values()].slice(-200);}
async function flush(){syncQueue();if(!online||sending||!queue.length)return;sending=true;let changed=false;try{while(queue.length){const e=queue[0],r=await network('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e),keepalive:true});if(!r.ok){if([400,409,413].includes(r.status)){const done=e.id;syncQueue();queue=queue.filter(e=>e.id!==done);write('pending',queue);continue;}throw Error();}const d=await r.json();if(d.ok!==true)throw Error();const done=e.id;syncQueue();queue=queue.filter(e=>e.id!==done);write('pending',queue);changed=true;}}catch{status(snapshot?'暂时无法更新 · 显示上次统计':'统计暂不可用 · 游玩与下载不受影响');}finally{sending=false;if(changed)refresh();}}
function record(kind,game,id=uuid()){if(!online||!(kind==='visit'?game==='site':games.includes(game)))return;syncQueue();if(!queue.some(e=>e.id===id)){queue.push({id,kind,game,visitor});queue=queue.slice(-200);write('pending',queue);}flush();}
function session(){if(!online)return;const now=Date.now();let s=read('session',null);if(!s||typeof s.id!=='string'||!Number.isFinite(s.last)||now-s.last>1800000)s={id:'visit_'+visitor.slice(0,48)+'_'+Math.floor(now/1800000),last:now};s.last=now;write('session',s);record('visit','site',s.id);}
const played=new Set();function play(game){if(played.has(game)||!games.includes(game))return;played.add(game);session();record('play',game);}
function download(e){if(!e.isTrusted||e.defaultPrevented||!((e.type==='click'&&e.button===0)||(e.type==='auxclick'&&e.button===1)))return;const a=e.target.closest?.('a[download]');if(!a)return;const href=a.getAttribute('href')||'',m=href.match(/(?:^|\/)downloads\/(borrow-a-bump|give-yourself-a-path|ghost-signal|borrowed-fire)\/[^?#]+\.zip(?:[?#]|$)/);if(!m)return;session();record('download',m[1]);}
document.addEventListener('click',download);document.addEventListener('auxclick',download);
let lastActivity=0;function activity(){if(Date.now()-lastActivity>60000){lastActivity=Date.now();session();}}
document.addEventListener('pointerdown',e=>{if(e.isTrusted)activity();},{passive:true});document.addEventListener('keydown',e=>{if(e.isTrusted)activity();});
window.addEventListener('online',()=>{session();flush();refresh();});window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(!document.hidden){session();flush();refresh();}});
window.CangyuStats={play,refresh,activity};
if(online){session();refresh();setInterval(()=>{if(!document.hidden){flush();refresh();}},cfg.refreshMs||10000);}else status('统计在正式网站上自动更新');
})();
