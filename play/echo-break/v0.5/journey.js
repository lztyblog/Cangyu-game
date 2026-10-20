(function(root){'use strict';
const Core=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.EchoCore;
const {Game,MOVES,clamp}=Core;
const LESSONS=[
 ['triple','基础连段','裂步三连','J J J','finisher','JJJ','轻点三次 J；第三击后要收势，可防御、闪步或重新找机会。'],
 ['launch','基础连段','挑空','J J K','launch','JJK','前两次轻击接重击，将木桩挑空。'],
 ['rush','技能分支','穿隙连袭','J K J','rush','JKJ','轻击、折身肘、突进连袭。'],
 ['pulse','技能分支','折光波刃','J K K','pulse','JKK','前两击要命中，再用波刃完成连段。'],
 ['spin','技能分支','回风三旋','K J J','spin','KJJ','重击起手，接靠击和三次旋踢。'],
 ['crescent','技能分支','踏月升袭','K J K','crescent','KJK','重、轻、重，把双方带到空中。'],
 ['quake','技能分支','坠星震荡','K K J','quake','KKJ','两次重击衔接震荡，注意按键节奏。'],
 ['dragon','技能分支','破阵升龙','K K K','dragon','KKK','重击起手较慢，看到命中再接下一下。'],
 ['airspin','空中追击','凌空回环','空中 J J J','airspin','JJK JUMP JJJ','J J K 挑空 → 空格跳跃 → J J J。'],
 ['meteor','空中追击','流星落阵','空中 J J K','meteor','JJK JUMP JJK','J J K 挑空 → 空格跳跃 → J J K，落地追加震荡。'],
 ['block','攻守转换','普通防御','','','', '看到起手就按住 I，提前防住两次。'],
 ['parry','攻守转换','精准拆招','','','', '重拳即将命中前瞬间按 I，成功后松开，练习两次。'],
 ['ultimate','攻守转换','万象归一','','ultimate','', '精准拆招三次蓄满能量，靠近按 U。完成两次大招。']
].map(([id,chapter,title,route,move,sequence,hint])=>({id,chapter,title,route,move,sequence,hint,kind:id==='block'||id==='parry'?id:id==='ultimate'?'ultimate':'combo',target:2}));
const LEVELS=[
 {name:'初上擂台',tag:'01 / 基础实战',foe:1,desc:'较慢的拳脚与清楚的收招，先把连段打出来。',drill:'enemyheavy',profile:{intro:true,hp:180,hpRatio:1,tempo:.78,damage:.80,wait:1.8,cooldown:1.35,reaction:.36,phases:false,enemy:{name:'初阶陪练',title:'观察，接近，再出手'}}},
 {name:'距离之争',tag:'02 / 控距追击',foe:0,desc:'长波会拉距、退步射击，用追击打开局面。',drill:'foepulse',grant:'pulse',profile:{hp:234,hpRatio:1.3,tempo:.86,damage:1.0,wait:1.45,cooldown:1.15,reaction:.30,phases:false}},
 {name:'攻守转换',tag:'03 / 连续进攻',foe:1,desc:'连拳、重击和突进。防住一轮，再把节奏抢回来。',drill:'foerush',grant:'rush',profile:{hp:306,hpRatio:1.7,tempo:.94,damage:1.16,wait:1.15,cooldown:1.05,reaction:.24,recovery:.88,phases:false}},
 {name:'虚实换位',tag:'04 / 半血变阵',foe:1,desc:'无影加入虚晃和换边，观察轨迹后再应对。',drill:'crossrush',grant:'rush',profile:{hp:396,hpRatio:2.2,tempo:1,damage:1.32,wait:1,reaction:.20,recovery:.75,breakAfter:5,phaseAt:.55}},
 {name:'余震封路',tag:'05 / 两段震荡',foe:2,desc:'重砸、横扫、短冲与延迟余震，练习跳过或打断。',drill:'faultline',grant:'quake',profile:{hp:504,hpRatio:2.8,tempo:1.05,damage:1.48,wait:.95,cooldown:.95,reaction:.18,recovery:.65,breakAfter:4,phaseAt:.6}},
 {name:'冠军考验',tag:'06 / 三式合流',foe:2,desc:'镜会切换控距、压制和封路，也会在长连段的空当防守。',drill:'faultline',profile:{champion:true,hp:630,hpRatio:3.5,tempo:1.1,damage:1.64,wait:.85,cooldown:.90,reaction:.17,recovery:.55,breakAfter:3,phaseAt:.5,enemy:{name:'镜 · 无相',title:'三种架势，一个对手',phaseName:'三式合流',phaseTip:'观察当前架势，连续重复波刃会引来压近；换招抓收招。',tip:'会轮换长波、无影、重山的打法，长连段中注意他重新站稳的时机。',lesson:'先观察当前架势。跳过余震、拆下波刃；长连段被守住后，先收势再寻找机会。'}}}
];
function clean(raw){const x=raw&&typeof raw==='object'?raw:{};const lessons={};for(const l of LESSONS)lessons[l.id]=clamp(Math.floor(Number(x.lessons&&x.lessons[l.id])||0),0,2);const taught=LESSONS.every(l=>lessons[l.id]===2);const cleared=taught?clamp(Math.floor(Number(x.cleared)||0),0,6):0;return{version:4,lessons,cleared,easy:!!x.easy,lastLevel:clamp(Math.floor(Number(x.lastLevel)||0),0,Math.min(cleared,5)),records:x.records&&typeof x.records==='object'?Object.fromEntries(Object.entries(x.records).filter(([k,v])=>/^[0-5]$/.test(k)&&v&&Number.isFinite(v.combo)).map(([k,v])=>[k,{combo:clamp(Math.floor(v.combo),0,999),time:clamp(Number(v.time)||0,0,99999)}])):{}};}
class Journey{
 constructor(raw){this.data=clean(raw);}
 get taught(){return LESSONS.every(l=>this.data.lessons[l.id]===2);}
 get free(){return this.taught&&this.data.cleared===6;}
 get firstLesson(){return LESSONS.findIndex(l=>this.data.lessons[l.id]<2);}
 canLesson(i){return Number.isInteger(i)&&i>=0&&i<LESSONS.length&&(this.firstLesson<0||i<=this.firstLesson);}
 canLevel(i){return this.taught&&Number.isInteger(i)&&i>=0&&i<6&&i<=this.data.cleared;}
 lesson(id){if(!(id in this.data.lessons))return false;this.data.lessons[id]=Math.min(2,this.data.lessons[id]+1);return true;}
 clear(i,stats={}){if(!this.canLevel(i))return false;this.data.cleared=Math.max(this.data.cleared,i+1);const old=this.data.records[i]||{combo:0,time:Infinity};this.data.records[i]={combo:Math.max(old.combo,Math.floor(stats.combo||0)),time:Math.min(old.time,Math.max(0,stats.time||0))};this.data.lastLevel=Math.min(5,this.data.cleared);return true;}
 mastered(){return [...new Set(LEVELS.slice(0,this.data.cleared).map(l=>l.grant).filter(Boolean))];}
 serialize(){return JSON.stringify(this.data);}
 static parse(s){const r=JSON.parse(s);if(!r||r.version!==4||!r.lessons||typeof r.lessons!=='object'||!Number.isFinite(r.cleared))throw Error('不是本游戏的进度文件（支持 v0.4 / v0.5）');return new Journey(r);}
}
function profileFor(i){return JSON.parse(JSON.stringify(LEVELS[i].profile));}
class Teacher{
 constructor(game,index,count=0){this.game=game;this.index=index;this.lesson=LESSONS[index];this.count=count>=2?0:count;this.review=count>=2;this.events=[];this.demo=true;this.done=false;this.pending=null;this.used=new Set();this.reset();}
 event(type,data={}){this.events.push({type,...data});}
 reset(){const g=this.game;g.startRound(0);g.intro=0;g.dummy=true;g.sync=0;g.borrowCharges=0;g.p.x=450;g.e.x=525;g.p.maxHp=g.p.hp=9999;g.e.maxHp=g.e.hp=10000;g.enemyDef.name=this.lesson.kind==='combo'?'教学木桩':'拆招陪练';g.controls={left:false,right:false,guard:false,up:false,down:false};g.events=[];this.clock=0;this.strikeAt=.65;this.pending=null;this.demoIndex=0;this.demoSent=null;this.demoFinished=false;this.demoProof=false;this.demoCooldown=0;this.attempt=false;this.idleClock=0;}
 practice(){this.demo=false;this.reset();this.event('ready');}
 replay(){this.demo=true;this.reset();}
 feed(e){if(this.demo){if(this.lesson.kind==='block'&&e.type==='block'&&e.player)this.demoProof=true;return;}if(this.done||this.pending)return;const l=this.lesson;
  let ok=false,id=e.actionId;
  if(l.kind==='combo')ok=e.type==='hit'&&e.player&&e.move===l.move&&e.inputRoute===l.route&&e.prefixGood;
  else if(l.kind==='block')ok=e.type==='block'&&e.player;
  else if(l.kind==='parry')ok=e.type==='parry'&&e.player;
  else ok=e.type==='hit'&&e.player&&e.move==='ultimate';
  if(ok&&(!id||!this.used.has(id))){if(id)this.used.add(id);this.pending={id,age:0};this.event('connected');}
 }
 demoCombo(dt){const g=this.game,l=this.lesson;const seq=l.sequence.includes('JUMP')?['J','J','K','jump',...l.sequence.split('JUMP ')[1].split('')]:l.sequence.split('');
  if(this.demoIndex>=seq.length){if(!g.p.action)this.demoFinished=true;return;}
  const next=seq[this.demoIndex];if(this.demoSent){if(next==='jump'){if(g.p.y>38){this.demoSent=null;this.demoIndex++;}}else{const a=g.p.action;if(a&&a.uid!==this.demoSent.old){this.demoSent.uid=a.uid;if(this.demoIndex===seq.length-1){if(a.connected&&a.t>.12){this.demoIndex++;this.demoSent=null;}}else{const m=MOVES[a.name],lock=m.ticks?m.ticks.at(-1)+.03:.115;if(a.confirmed&&a.t>lock){this.demoIndex++;this.demoSent=null;}}}}return;}
  if(this.clock>.18){g.command(next==='J'?'light':next==='K'?'heavy':'jump');this.demoSent={old:g.p.action?g.p.action.uid:0};}
 }
 defense(dt){const g=this.game,l=this.lesson;
  if(this.clock>=this.strikeAt&&!g.e.action&&g.e.stun<=0&&!g.p.action){g.e.x=g.p.x+85;g.e.y=0;g.e.vx=0;g.e.face=-1;g.p.face=1;g.begin(g.e,'enemyheavy');this.strikeAt=this.clock+1.8;}
  if(this.demo){const a=g.e.action;g.controls.guard=!!(a&&(l.kind==='block'?a.t>.08:a.t>.34&&a.t<.54));if(l.kind==='ultimate'&&g.sync>=100&&!g.p.action){g.controls.guard=false;g.command('burst');}if(l.kind==='block'&&this.demoProof||l.kind==='parry'&&g.stats.parries>this.demoStartParries||l.kind==='ultimate'&&g.stats.ultimates>this.demoStartUltimates){if(!g.p.action&&!g.e.action)this.demoFinished=true;}}
 }
 tick(dt){const g=this.game;if(this.done)return;if(g.freeze<=0)this.clock+=dt;
  if(this.clock<dt*2){this.demoStartParries=g.stats.parries;this.demoStartUltimates=g.stats.ultimates;}
  if(this.demo){if(this.lesson.kind==='combo')this.demoCombo(dt);else this.defense(dt);if(this.demoFinished){this.demoCooldown+=dt;if(this.demoCooldown>.65)this.practice();}return;}
  if(this.pending){this.pending.age+=dt;if(!g.p.action&&this.pending.age>.25&&g.e.stun<=0){this.count++;this.event('success',{id:this.lesson.id,count:this.count});if(this.count>=2){this.done=true;g.controls.guard=false;this.event('complete');}else this.reset();}return;}
  if(this.lesson.kind!=='combo')this.defense(dt);
  if(this.lesson.kind==='combo'){if(g.p.action)this.attempt=true;if(this.attempt&&!g.p.action&&g.routeAge>1.15&&g.p.y===0&&g.e.y===0){this.reset();this.event('retry');}}
 }
}
const API={Journey,Teacher,LESSONS,LEVELS,profileFor};if(typeof module!=='undefined'&&module.exports)module.exports=API;root.EchoJourney=API;
})(typeof window!=='undefined'?window:globalThis);
