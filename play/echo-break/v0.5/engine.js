(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const FOES=[
 {id:'pulse',name:'弦 · 长波',title:'走位控距，错拍出手',hp:200,color:'#ffbd69',phaseName:'错拍双波',phaseTip:'双波有间隔，第一发过去后还有第二发；出手后有长收招。',tip:'会后撤控距、退步射击和近身顶肘；追上他的收招再连击。',lesson:'半血后双波分两次到达。可以分别拆招，也可以跳过后突进抓收招。'},
 {id:'rush',name:'隙 · 无影',title:'试探虚晃，换边追击',hp:240,color:'#ff739e',phaseName:'虚实换位',phaseTip:'探步不一定出拳；绕背有箭头预告，突进后留有反击空当。',tip:'会靠近压制、连拳和退步试探。进攻落空后有明显收招。',lesson:'半血后会虚晃接换边突进。观察虚线箭头，等他真正出手再拆招。'},
 {id:'quake',name:'铸 · 重山',title:'推进封路，重砸留隙',hp:300,color:'#bd9dff',phaseName:'余震封路',phaseTip:'重砸之后稍晚还有贴地余震，跳过或拆招；也能打断余震的起手。',tip:'会推进、横扫和短冲；重砸前有红圈提示，跳开后抓收招。',lesson:'半血后重砸追加贴地余震。跳过震荡后靠近打断，或留意第二段地波。'}
];
const SKILLS={
 pulse:{name:'折光波刃',short:'远程穿刺',route:'J K K',color:'#ffbd69',desc:'连段中放出波刃；S + K 可直接起手。'},
 rush:{name:'穿隙连袭',short:'突进两连',route:'J K J',color:'#ff739e',desc:'向前突进两连击，最后一击击退。'},
 quake:{name:'坠星震荡',short:'范围震击',route:'K K J',color:'#bd9dff',desc:'震荡击飞周围地面目标。'},
 spin:{name:'回风三旋',short:'旋风三连',route:'K J J',color:'#7ef5d4',desc:'回身三次踢击，可打身后目标。'},
 crescent:{name:'踏月升袭',short:'升空两连',route:'K J K',color:'#93baff',desc:'两段升空追击，便于接空中连段。'},
 dragon:{name:'破阵升龙',short:'强力挑空',route:'K K K',color:'#ffd789',desc:'跃起重击挑空；W + K 可直接起手。'},
 airspin:{name:'凌空回环',short:'空中三旋',route:'空中 J J J',color:'#7ef5d4',desc:'在空中旋踢，连续追击。'},
 meteor:{name:'流星落阵',short:'俯冲震荡',route:'空中 J J K',color:'#d7b0ff',desc:'命中后向下坠落，落地追加一次震荡。'}
};
const ROUTES={JJJ:'finisher',JJK:'launch',JKJ:'rush',JKK:'pulse',KJJ:'spin',KJK:'crescent',KKJ:'quake',KKK:'dragon'};
const MOVES={
 jab:{label:'寸击',startup:.09,end:.27,active:.07,range:94,damage:3,stun:.28,push:75},
 cross:{label:'回身',startup:.105,end:.31,active:.07,range:108,damage:4,stun:.31,push:100},
 finisher:{label:'裂步',startup:.14,end:.72,active:.08,range:126,damage:6,stun:.20,push:185,attackRecovery:true},
 heavy:{label:'崩拳',startup:.29,end:.67,active:.10,range:126,damage:7,stun:.44,push:230,guard:28},
 launch:{label:'挑空',startup:.13,end:.45,active:.09,range:112,damage:28,stun:.55,push:110,lift:670,attackRecovery:true},
 air:{label:'追空',startup:.08,end:.25,active:.08,range:116,damage:6,stun:.32,push:90,lift:255},
 slam:{label:'坠击',startup:.17,end:.47,active:.09,range:135,damage:11,stun:.43,push:240,down:true,attackRecovery:true},
 hook:{label:'折身肘',startup:.13,end:.36,active:.08,range:117,damage:6,stun:.42,push:40},
 body:{label:'贴山靠',startup:.12,end:.35,active:.08,range:114,damage:6,stun:.40,push:45},
 hammer:{label:'断架锤',startup:.22,end:.53,active:.10,range:140,damage:8,stun:.64,push:60,guard:38},
 sweep:{label:'扫堂腿',startup:.15,end:.42,active:.09,range:130,damage:7,stun:.25,push:180,low:true,attackRecovery:true},
 pulse:{label:'折光波刃',startup:.27,end:.64,active:.02,projectile:true,attackRecovery:true},
 rush:{label:'穿隙连袭',startup:.19,end:.60,active:.10,range:125,damage:17,stun:.37,push:120,second:.37,secondDamage:18,attackRecovery:true},
 quake:{label:'坠星震荡',startup:.55,end:1.04,active:.10,range:235,damage:34,stun:.55,push:290,lift:350,ground:true,guard:48,attackRecovery:true},
 spin:{label:'回风三旋',startup:.12,end:.64,active:.08,range:157,damage:12,stun:.36,push:35,ticks:[.12,.27,.42],lastPush:240,omni:true,attackRecovery:true},
 crescent:{label:'踏月升袭',startup:.14,end:.66,active:.09,range:145,damage:18,stun:.46,push:60,lift:440,ticks:[.14,.33],selfLift:650,attackRecovery:true,airFollow:true},
 dragon:{label:'破阵升龙',startup:.21,end:.77,active:.10,range:150,damage:40,stun:.56,push:90,lift:740,selfLift:610,guard:48,attackRecovery:true,airFollow:true},
 airspin:{label:'凌空回环',startup:.09,end:.59,active:.08,range:155,damage:10,stun:.32,push:35,lift:160,ticks:[.09,.23,.37],lastPush:200,omni:true,attackRecovery:true,airFollow:true},
 meteor:{label:'流星落阵',startup:.14,end:.95,active:.10,range:147,damage:20,stun:.48,push:95,down:true,landing:true,attackRecovery:true},
 ultimate:{label:'万象归一',startup:.25,end:1.12,active:.08,range:265,damage:14,stun:.45,push:15,ticks:[.25,.44,.63,.84],lastDamage:32,lastPush:320,omni:true,lock:1.12},
 enemyjab:{label:'试探',startup:.23,end:.62,active:.09,range:105,damage:10,stun:.28,push:95},
 counterpalm:{label:'架势反击',startup:.19,end:.84,active:.09,range:125,damage:14,stun:.36,push:430},
 enemyheavy:{label:'破阵',startup:.46,end:.94,active:.10,range:136,damage:21,stun:.45,push:260,guard:42},
 foepulse:{label:'长波',startup:.42,end:.98,active:.02,projectile:true,shots:[.42],shotDamage:14},
 retreatshot:{label:'退步射击',startup:.44,end:1.05,active:.02,projectile:true,shots:[.44],shotDamage:13,backstep:.27},
 doublepulse:{label:'错拍双波',startup:.48,end:1.32,active:.02,projectile:true,shots:[.48,.82],shotDamage:12},
 lowpulse:{label:'贴地波刃',startup:.50,end:1.12,active:.02,projectile:true,shots:[.50],shotDamage:12,lowShot:true},
 foeupper:{label:'迎击肘',startup:.30,end:.83,active:.09,range:120,damage:12,stun:.34,push:180,lift:230},
 foerush:{label:'追步连袭',startup:.32,end:.99,active:.09,range:125,damage:10,stun:.34,push:65,ticks:[.32,.50],lastPush:220,dashStart:.14,dashEnd:.34,dashSpeed:790},
 foestring:{label:'贴身连拳',startup:.24,end:.88,active:.08,range:115,damage:8,stun:.29,push:30,ticks:[.24,.41],lastPush:155},
 feint:{label:'探步',startup:.31,end:.56,active:0,fake:true},
 crossrush:{label:'换边突进',startup:.57,end:1.19,active:.09,range:140,damage:17,stun:.40,push:240},
 foequake:{label:'蓄势重砸',startup:.68,end:1.32,active:.10,range:215,damage:22,stun:.48,push:240,lift:270,ground:true,guard:45,armorUntil:.46},
 cleave:{label:'横扫破架',startup:.46,end:1.04,active:.10,range:165,damage:19,stun:.43,push:290,guard:43},
 stomp:{label:'踏地',startup:.49,end:1.02,active:.09,range:145,damage:14,stun:.36,push:120,lift:210,ground:true,guard:32},
 chargetackle:{label:'沉肩短冲',startup:.54,end:1.24,active:.10,range:135,damage:18,stun:.41,push:270,guard:38,dashStart:.24,dashEnd:.52,dashSpeed:465},
 faultline:{label:'重砸·余震',startup:.75,end:1.68,active:.10,range:215,damage:19,stun:.43,push:220,lift:230,ground:true,guard:42,armorUntil:.46,waveAt:1.08},
 phase:{label:'变阵',startup:.72,end:.72,active:0,fake:true}
};
function fighter(x,isPlayer,hp){return {x,y:0,vx:0,vy:0,face:isPlayer?1:-1,isPlayer,hp,maxHp:hp,guard:100,guardAge:99,blocking:false,stun:0,inv:0,action:null,dash:0,dashCD:0,hitFlash:0,hitConfirm:0,airHits:0,aiWait:.7,decisions:0};}
class Game{
 constructor(options={}){this.seed=options.seed||10337;this.profile=options.profile||{};this.actionSerial=0;this.easy=!!options.easy;this.practice=!!options.practice;this.dummy=this.practice;this.events=[];this.stage=options.stage||0;this.perks={};this.learned=[];this.borrowed=null;this.borrowCharges=0;this.sync=0;this.maxCombo=0;this.combo=0;this.comboAge=0;this.comboDamage=0;this.time=0;this.elapsed=0;this.freeze=0;this.field=0;this.projectiles=[];this.followups=[];this.pending=[];this.controls={left:false,right:false,guard:false,down:false,up:false};this.stats={parries:0,hits:0,taken:0,skills:0,wall:0,ultimates:0,routes:{}};this.status='fight';this.result=null;this.startRound(this.stage);}
 rand(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/4294967296;}
 event(type,data={}){this.events.push({type,...data});}
 startRound(n){this.stage=n;this.enemyDef={...FOES[n],...(this.profile.enemy||{})};const max=(this.easy?220:180)+(this.perks.heart?25:0);if(this.profile.hpRatio)this.enemyDef.hp=Math.round(max*this.profile.hpRatio);else if(this.profile.hp)this.enemyDef.hp=this.profile.hp;this.p=fighter(320,true,max);this.e=fighter(880,false,this.enemyDef.hp);this.projectiles=[];this.followups=[];this.pending=[];this.route='';this.airRoute='';this.groundChain=[];this.airChain=[];this.routeAge=9;this.routeDisplay='';this.routeLife=0;this.lastSkill=null;this.combo=0;this.comboAge=0;this.freeze=0;this.field=0;this.intro=1.0;this.status='fight';this.result=null;this.roundTime=0;this.enemyPhase=this.profile.startPhase===2?2:1;this.initRival();this.checkpoint={sync:this.sync,borrowed:this.borrowed,charges:this.borrowCharges};this.event('round',{stage:n});}
 next(perk){if(this.status!=='won'||this.stage>=2)return false;if(perk)this.perks[perk]=true;this.startRound(this.stage+1);return true;}
 retry(){const c={...this.checkpoint};this.startRound(this.stage);this.sync=c.sync;this.borrowed=c.borrowed;this.borrowCharges=c.charges;this.checkpoint=c;}
 command(key){if(this.status!=='fight')return;if(key==='guard'){this.controls.guard=true;return;}if(key==='skill'||this.pending.length>=4)return;this.pending.push({key,low:!!this.controls.down,high:!!this.controls.up,ttl:.34});}
 begin(f,name){f.action={uid:++this.actionSerial,rivalStyle:f.isPlayer?null:this.enemyDef.id,name,t:0,hit:false,second:false,confirmed:false,connected:false,prefix:[],tickIndex:0,shotIndex:0,echoUsed:false,startX:f.x,startY:f.y,startFace:f.face,targetX:this.ai?this.ai.seen.x:this.p.x};f.blocking=false;f.guardAge=99;if(f===this.p){this.event('move',{name,label:MOVES[name].label});if(SKILLS[name]){this.stats.skills++;this.lastSkill=name;this.event('echo',{id:name});if(this.borrowCharges){f.action.echo=this.borrowed;this.borrowCharges--;this.event('resonance',{id:this.borrowed});}}}this.event('swing',{x:f.x,y:f.y,name,player:f.isPlayer});}
 canAct(f){return !f.action&&f.stun<=0&&f.dash<=0;}
 process(key,mod={}){const p=this.p,a=p.action,lock=a?(MOVES[a.name].lock||(MOVES[a.name].ticks?MOVES[a.name].ticks.at(-1)+.025:MOVES[a.name].second?MOVES[a.name].second+.025:.10)):0,hitCancel=a&&a.confirmed&&a.t>lock&&a.t<MOVES[a.name].end;
  if(p.stun>0||p.dash>0)return false;
  if(key==='burst'){if(this.sync<100){this.event('hint',{text:'大招由精准拆招积攒，通常成功三次蓄满'});return true;}if(Math.abs(p.x-this.e.x)>420){this.event('hint',{text:'靠近一点再放大招，冲刺距离有限'});return true;}this.sync=0;this.field=4;p.inv=1.14;p.face=this.e.x>=p.x?1:-1;p.dash=0;this.route='';this.airRoute='';this.begin(p,'ultimate');this.stats.ultimates++;this.event('burst',{x:p.x});return true;}
  if(key==='dash'){if(p.dashCD>0||a&&!hitCancel)return false;p.action=null;p.dash=.19;p.inv=.17;p.dashCD=this.perks.flow?.48:.72;const move=this.controls.left?-1:this.controls.right?1:p.face;p.vx=move*970;p.face=move;this.event('dash',{x:p.x,y:p.y});return true;}
  if(key==='jump'){if(p.y>1||a&&!hitCancel)return false;p.action=null;p.vy=740;p.y=1;this.route='';this.airRoute='';this.event('jump',{x:p.x});return true;}
  if(key==='light'||key==='heavy'){
   if(a&&(!hitCancel||(MOVES[a.name].attackRecovery&&!(MOVES[a.name].airFollow&&p.y>12&&key==='light'))))return false;
   const letter=key==='light'?'J':'K';if(this.routeAge>.95){this.route='';this.airRoute='';this.groundChain=[];this.airChain=[];}let move,display,prefix=[];const inAir=p.y>12;
   if(inAir){this.route='';if(!this.airRoute)this.airChain=[];prefix=this.airChain.slice();const r=this.airRoute+letter;move=mod.low?'meteor':r==='JJJ'?'airspin':r==='JJK'?'meteor':letter==='J'?'air':'slam';display='空中 '+r.split('').join(' ');this.airRoute=(r.length>=3||letter==='K'||mod.low)?'':r;}
   else {this.airRoute='';const r=this.route+letter;
    if(mod.low||mod.high){move=mod.low?(letter==='J'?'sweep':'pulse'):(letter==='K'?'dragon':'launch');display=(mod.low?'S':'W')+' + '+letter;this.route='';}
    else {if(!this.route)this.groundChain=[];prefix=this.groundChain.slice();move=r.length===3?ROUTES[r]:r==='JJ'?'cross':r==='JK'?'hook':r==='KJ'?'body':r==='KK'?'hammer':letter==='J'?'jab':'heavy';display=r.split('').join(' ');this.route=r.length>=3?'':r;}
   }
   this.routeAge=0;this.routeDisplay=display;this.routeLife=1.6;this.stats.routes[display]=(this.stats.routes[display]||0)+1;
   if(move==='air'&&hitCancel&&p.y>12)p.vy=Math.max(p.vy,220);
   this.begin(p,move);p.action.inputRoute=display;p.action.prefix=prefix;if(inAir)this.airChain.push(p.action);else this.groundChain.push(p.action);if(SKILLS[move])this.event('route',{route:display,name:move});return true;
  }return false;
 }
 damage(from,to,m,kind='melee'){
  if(to.inv>0||to.hp<=0)return 'miss';
  if(kind!=='projectile'&&Math.abs(to.x-from.x)>m.range+23)return 'miss';
  if(kind==='melee'&&!m.ground&&Math.abs(to.y-from.y)>98)return 'miss';
  if(m.ground&&to.y>48)return 'miss';
  if(kind==='melee'&&(to.x-from.x)*from.face < -20&&!m.ground&&!m.omni)return 'miss';
  const front=(from.x-to.x)*to.face> -12;
  const parry=to.blocking&&front&&to.guardAge<(to.isPlayer?(this.perks.focus?.23:.16):.07);
  if(parry){
   const copiedTrait=m.borrowTrait||(from.action&&from.action.rivalStyle)||this.enemyDef.id;
   to.guard=Math.min(100,to.guard+12);from.stun=kind==='projectile'?from.stun:.56;if(kind!=='projectile')from.action=null;
   if(!from.isPlayer&&this.ai&&kind!=='projectile'){this.ai.follow=null;this.ai.motion=null;this.ai.wait=.28;}
   to.inv=.12;this.freeze=.075;this.event('parry',{x:to.x+to.face*44,y:to.y+65,player:to.isPlayer});
   if(to.isPlayer){this.sync=clamp(this.sync+(this.perks.battery?50:34),0,100);this.borrowed=copiedTrait;this.borrowCharges=1;this.route='';this.airRoute='';this.stats.parries++;this.event('borrow',{id:this.borrowed});}return 'parry';
  }
  if(to.blocking&&front&&to.y<8){to.guard-=m.guard||(m.damage*1.4+6);to.vx=from.face*110;this.event('block',{x:to.x+to.face*32,y:65,player:to.isPlayer});if(!to.isPlayer&&this.profile.recovery&&!(this.ai.cooldowns.blockCounter>this.ai.clock)){this.ai.follow='counterpalm';this.ai.guardEnd=0;this.ai.wait=.07;this.ai.cooldowns.blockCounter=this.ai.clock+1.8;this.ai.label='架势反击';}if(to.guard<=0){to.guard=0;to.blocking=false;to.stun=.90;to.action=null;if(!to.isPlayer){this.ai.motion=null;this.ai.follow=null;this.ai.guardEnd=0;}this.event('break',{x:to.x,y:to.y});}return 'block';}
  const hitAction=kind==='projectile'?m.sourceAction:from.action;
  let amount=m.damage;if(!from.isPlayer){if(this.easy)amount*=.75;amount*=this.profile.damage||1;}if(from.isPlayer&&this.perks.edge&&to.y>10)amount*=1.18;
  if(from.isPlayer){if(hitAction&&hitAction.inputRoute&&(/^[SW] \+/.test(hitAction.inputRoute)||hitAction.prefix.some(a=>!a.connected)))amount*=.6;if(this.learned.includes(m.skill||(hitAction&&hitAction.name)))amount*=1.15;if(this.comboAge<1.15&&this.combo>=6)amount*=Math.max(.45,1-(this.combo-5)*.055);}
  const armor=to.action&&(to.action.name==='quake'?to.action.t<.55:to.action.t<(MOVES[to.action.name].armorUntil||0));
  if(armor){amount*=.60;this.event('armor',{x:to.x,y:to.y+80});}else{to.stun=m.stun||.28;to.action=null;}
  if(!to.isPlayer&&this.ai){this.ai.motion=null;this.ai.follow=null;this.ai.guardEnd=0;this.ai.wait=hitAction&&hitAction.name==='finisher'?0:.12;if(hitAction&&hitAction.name==='finisher')this.ai.lightOpening=this.ai.clock+1.1;}
  to.hp=Math.max(0,to.hp-amount);to.blocking=false;to.hitFlash=.13;to.vx=(to.x>=from.x?1:-1)*(m.push||140);
  if(m.lift&&to.airHits<4){to.vy=m.lift;to.y=Math.max(1,to.y);to.airHits++;}if(m.down){to.vy=-900;}
  if(hitAction)hitAction.connected=true;
  if(from.isPlayer&&hitAction&&this.ai&&hitAction.inputRoute&&/^[JK] [JK] [JK]$/.test(hitAction.inputRoute)&&this.ai.lastEndId!==hitAction.uid){const a=this.ai;a.lastEndId=hitAction.uid;a.repeatEnds=a.lastEnd===hitAction.name?(a.repeatEnds||0)+1:1;a.lastEnd=hitAction.name;}
  if(hitAction&&hitAction===from.action){hitAction.confirmed=true;from.hitConfirm=.24;}
  if(from.isPlayer){this.stats.hits++;this.combo=this.comboAge<1.15?this.combo+1:1;this.comboDamage=this.comboAge<1.15?this.comboDamage+amount:amount;this.comboAge=0;this.maxCombo=Math.max(this.maxCombo,this.combo);if(this.field>0){to.hp=Math.max(0,to.hp-4);this.event('echohit',{x:to.x,y:to.y+70});}if(hitAction&&hitAction.echo&&!hitAction.echoUsed&&!m.noEcho){hitAction.echoUsed=true;const id=hitAction.echo;if(id==='pulse')this.projectiles.push({x:from.x+from.face*48,y:from.y+65,vx:from.face*720,from:this.p,life:2,damage:10,noEcho:true});else this.followups.push({ttl:.12,id,x:to.x,y:to.y});this.event('trait',{id,x:to.x,y:to.y+65});}}
  else {this.stats.taken+=amount;this.comboAge=5;this.route='';this.airRoute='';}
  this.freeze=kind==='burst'?.08:m.damage>=18?.065:.035;
  this.event('hit',{x:to.x,y:to.y+65,damage:Math.round(amount),heavy:m.damage>=18,player:from.isPlayer,kind,move:hitAction&&hitAction.name,actionId:hitAction&&hitAction.uid,inputRoute:hitAction&&hitAction.inputRoute,prefixGood:!!(hitAction&&(hitAction.prefix||[]).every(a=>a.connected))});return 'hit';
 }
 initRival(){this.ai={clock:0,wait:.35,motion:null,follow:null,guardEnd:0,guardWalk:0,cooldowns:{},history:[],observed:[],lastObserved:null,style:'rush',styleUntil:0,samples:[],seen:{x:this.p.x,y:this.p.y,attack:null,blocking:false,shot:null},label:'观察距离',phaseQueued:false};}
 practicePhase(){if(!this.practice)return false;const second=this.enemyPhase===1;this.enemyPhase=1;this.e.hp=this.e.maxHp*(second?.48:1);this.e.action=null;this.e.stun=0;this.e.vx=0;this.e.vy=0;this.e.y=0;this.e.blocking=false;this.projectiles=[];this.initRival();if(second)this.ai.phaseQueued=true;this.event('hint',{text:second?'练习半血阶段：等他变阵，再按 T 切换进攻':'已回到第一阶段，敌方生命恢复'});return true;}
 rivalMotion(vx,duration,label,hop=false){const e=this.e;this.ai.motion={vx,left:duration};this.ai.label=label;this.ai.follow=null;e.blocking=false;if(hop&&e.y<1){e.vy=485;e.y=1;}this.event('rivalStep',{x:e.x,label});}
 rivalCast(name,cooldown=1.5,follow=null){const a=this.ai,e=this.e;e.face=a.seen.x>=e.x?1:-1;e.vx=0;a.motion=null;a.guardEnd=0;a.wait=(.17+(this.easy?.10:0)+this.rand()*.12)*(this.profile.wait||1);a.cooldowns[name]=a.clock+cooldown*(this.profile.cooldown||1);a.history.push(name);if(a.history.length>8)a.history.shift();a.label=MOVES[name].label;a.follow=follow;this.begin(e,name);if(name==='crossrush')e.action.goalX=clamp(e.action.targetX+e.face*85,85,1195);this.event('rivalMove',{name,phase:this.enemyPhase,at:a.clock});}
 enemyAI(dt){
  const e=this.e,p=this.p,a=this.ai;a.clock+=dt;
  // Perception is delayed and samples only world-visible state, never player key input.
  const visible=this.projectiles.filter(b=>b.from===p&&b.life>0).sort((x,y)=>Math.abs(x.x-e.x)-Math.abs(y.x-e.x))[0];
  a.samples.push({at:a.clock,x:p.x,y:p.y,attack:p.action?p.action.name:null,attackId:p.action?p.action.uid:null,blocking:p.blocking,shot:visible?{x:visible.x,y:visible.y,vx:visible.vx}:null});
  const reaction=(this.profile.reaction||.18)+(this.easy?.05:0);while(a.samples.length&&a.samples[0].at<=a.clock-reaction)a.seen=a.samples.shift();
  if(this.intro>0||e.hp<=0)return;
  if(this.profile.phases!==false&&this.enemyPhase===1&&e.hp<=e.maxHp*(this.profile.phaseAt||.5))a.phaseQueued=true;
  // Phase changes wait for a natural opening: no combo escape or invulnerability.
  if(a.phaseQueued&&this.canAct(e)&&e.y<1){this.enemyPhase=2;a.phaseQueued=false;a.motion=null;a.follow=null;a.guardEnd=0;a.wait=.30;a.label=this.enemyDef.phaseName;e.vx=0;this.begin(e,'phase');this.event('phase',{stage:this.stage,name:this.enemyDef.phaseName,tip:this.enemyDef.phaseTip});return;}
  if(this.practice&&this.dummy){a.motion=null;e.blocking=false;if(!e.action)e.vx=0;return;}
  if(!this.canAct(e)){if(e.stun>0){a.motion=null;a.guardEnd=0;}return;}
  if(a.motion){a.motion.left-=dt;if(a.motion.left>0){e.vx=a.motion.vx;return;}a.motion=null;e.vx=0;a.wait=.10;}
  if(a.guardEnd>a.clock&&e.guard>8){e.blocking=true;e.guardAge=.4;e.vx=a.guardWalk;return;}e.blocking=false;
  a.wait-=dt;if(a.wait>0)return;
  if(a.follow){const follow=a.follow;a.follow=null;this.rivalCast(follow,2.9);return;}
  const seen=a.seen,d=Math.abs(e.x-seen.x),dir=seen.x>=e.x?1:-1,second=this.enemyPhase===2;let id=this.enemyDef.id;
  if(seen.attackId!==a.lastObserved){a.lastObserved=seen.attackId;if(seen.attack){a.observed.push(seen.attack);if(a.observed.length>6)a.observed.shift();}}
  if(this.profile.champion&&a.clock>=a.styleUntil){const repeated=a.observed.length>=3&&a.observed.slice(-3).every(n=>n==='pulse');const styles=repeated?['rush']:d>370?['pulse','rush']:d<165?['rush','quake']:['pulse','rush','quake'];a.style=styles[Math.floor(this.rand()*styles.length)];a.styleUntil=a.clock+4.5;this.enemyDef.id=id=a.style;a.label='换势 · '+{pulse:'控距',rush:'压制',quake:'封路'}[id];this.event('style',{id});}
  const ready=n=>!(a.cooldowns[n]>a.clock),spaceBack=dir>0?e.x-75:1205-e.x,shot=seen.shot;
  e.decisions++;
  if(!this.profile.intro&&!this.profile.drill&&a.repeatEnds>=2&&e.y<8&&d<230&&ready('repeatGuard')&&e.guard>35){a.cooldowns.repeatGuard=a.clock+2.1;a.guardEnd=a.clock+.60;a.guardWalk=0;a.label='识破重复连招';e.blocking=true;e.guardAge=.4;return;}
  if(this.profile.recovery&&this.combo>=(this.profile.breakAfter||6)+1&&this.comboAge<.7&&seen.attack&&ready('comboGuard')&&e.guard>24){a.cooldowns.comboGuard=a.clock+2.6;a.guardEnd=a.clock+.8;a.guardWalk=0;a.label='稳住架势';e.blocking=true;e.guardAge=.4;return;}
  // A received third light hit creates a real recovery gap. Respond only after
  // hitstun ends; never cancel an attacker's connected prefix or grant invulnerability.
  if(a.lightOpening>a.clock&&!this.profile.drill&&ready('lightAnswer')){a.lightOpening=0;a.cooldowns.lightAnswer=a.clock+1.0;
   if(d<175){this.rivalCast(this.profile.intro?'enemyjab':'counterpalm',1.0);return;}
   if(id==='pulse'&&spaceBack>90){this.rivalCast('retreatshot',2.6);return;}
   a.guardEnd=a.clock+.46;a.guardWalk=dir*100;a.label='收势后接防';e.blocking=true;e.guardAge=.4;return;
  }
  if(this.profile.drill){const name=this.profile.drill,ideal=['foepulse','doublepulse'].includes(name)?240:name==='foerush'?220:100;if(d>ideal+55){this.rivalMotion(dir*215,.25,'陪练就位');return;}if(d<ideal-55&&spaceBack>80){this.rivalMotion(-dir*190,.25,'陪练拉距');return;}if(ready(name))this.rivalCast(name,2.0);else a.wait=.15;return;}
  if(shot&&ready('react')&&Math.abs(shot.x-e.x)<230&&(e.x-shot.x)*shot.vx>0&&this.rand()<(this.easy?.43:.65)){
   a.cooldowns.react=a.clock+2.1;
   if(id==='rush'&&e.y<1&&this.rand()<.55){this.rivalMotion(-dir*290,.29,'越步避弹',true);return;}
   a.guardEnd=a.clock+.43;a.guardWalk=id==='quake'?dir*110:0;a.label=id==='quake'?'架势推进':'看弹防守';e.blocking=true;e.guardAge=.4;return;
  }
  if(e.y>25){a.wait=.10;return;}
  const options=[];const offer=(n,w,ok=true,cd=1.5)=>{if(ok&&ready(n)){const repeated=a.history.at(-1)===n?.14:1;options.push({n,w:w*repeated,cd});}};
  if(this.profile.intro){if(d>125){this.rivalMotion(dir*155,.32,'慢步接近');return;}offer('enemyjab',3,true,2.0);offer('enemyheavy',1,true,2.8);offer(':retreat',1,spaceBack>80);}
  else if(id==='pulse'){
   if(d>640){this.rivalMotion(dir*245,.42,'前移控距');return;}
   offer('foepulse',3,d>190,1.55);offer('lowpulse',2,d>230,2.8);offer('doublepulse',4,second&&d>210,3.7);
   offer('retreatshot',3,d<365&&spaceBack>90,2.6);offer('foeupper',3,d<135||seen.y>50&&d<180,2.1);offer('enemyjab',2,d<118,1.5);
   offer(':retreat',d<210?5:1,spaceBack>80);offer(':advance',1,d>410);offer(':vault',3,d<175&&spaceBack<110&&ready('vault'));
  }else if(id==='rush'){
   if(d>425){this.rivalMotion(dir*365,.35,'压近距离');return;}
   offer('foerush',4,d>125&&d<340,2.0);offer('foestring',4,d<140,1.4);offer('enemyheavy',seen.blocking?4:1,d<145,2.3);offer('foeupper',2,seen.y>45&&d<155,2.2);
   offer('feint',4,second&&d<300,2.6);offer(':advance',2,d>185);offer(':retreat',2,d<140&&spaceBack>85);offer(':guard',1,!!seen.attack&&d<160);
  }else{
   if(d>420){this.rivalMotion(dir*215,.48,'沉步推进');return;}
   offer('foequake',2,d<225,2.7);offer('cleave',seen.blocking?4:3,d<170,1.8);offer('stomp',2,d<140&&seen.y<35,2.0);
   offer('chargetackle',3,d>180&&d<360,2.6);offer('faultline',4,second&&d<410,4.0);offer(':advance',2,d>180);offer(':guard',1,!!seen.attack&&d<200);
  }
  if(this.profile.allowed){for(let i=options.length-1;i>=0;i--)if(!options[i].n.startsWith(':')&&!this.profile.allowed.includes(options[i].n))options.splice(i,1);}
  if(!options.length){this.rivalMotion(dir*(id==='rush'?290:180),.26,'调整站位');return;}
  let roll=this.rand()*options.reduce((s,o)=>s+o.w,0),chosen=options.at(-1);for(const o of options){roll-=o.w;if(roll<=0){chosen=o;break;}}
  const n=chosen.n;
  if(n===':advance'){this.rivalMotion(dir*(id==='rush'?315:210),.27,'前压试探');return;}
  if(n===':retreat'){this.rivalMotion(-dir*(id==='pulse'?290:250),.29,'拉开空当');return;}
  if(n===':vault'){a.cooldowns.vault=a.clock+3.2;this.rivalMotion(dir*290,.34,'越步脱角',true);return;}
  if(n===':guard'){a.guardEnd=a.clock+.31;a.guardWalk=0;a.label='架势试探';e.blocking=true;e.guardAge=.4;a.wait=.2;return;}
  this.rivalCast(n,chosen.cd,n==='feint'?(this.rand()<.72?'crossrush':'foerush'):null);
 }
 tick(dt){
  dt=Math.min(dt,.04);this.time+=dt;if(this.status!=='fight')return;
  if(this.freeze>0){this.freeze-=dt;return;}this.elapsed+=dt;this.roundTime+=dt;this.intro=Math.max(0,this.intro-dt);this.field=Math.max(0,this.field-dt);
  this.comboAge+=dt;this.routeAge+=dt;this.routeLife=Math.max(0,this.routeLife-dt);const p=this.p,e=this.e;
  for(const f of [p,e]){f.stun=Math.max(0,f.stun-dt);f.inv=Math.max(0,f.inv-dt);f.dashCD=Math.max(0,f.dashCD-dt);f.hitFlash=Math.max(0,f.hitFlash-dt);f.hitConfirm=Math.max(0,f.hitConfirm-dt);f.guard=Math.min(100,f.guard+dt*(f.blocking?4:15));}
  if(this.intro<=0){
   if(this.controls.guard&&p.action&&p.action.name==='finisher'&&p.action.confirmed&&p.action.t>=.34){p.action=null;this.route='';this.airRoute='';}
   const was=p.blocking;p.blocking=this.controls.guard&&p.stun<=0&&!p.action&&p.dash<=0&&p.y<8;if(p.blocking){p.guardAge=was?p.guardAge+dt:0;}else p.guardAge=99;
   if(p.blocking&&!was){this.route='';this.airRoute='';}
   this.pending=this.pending.filter(i=>{if(this.process(i.key,i))return false;i.ttl-=dt;return i.ttl>0;});
   if(!p.action&&p.stun<=0&&p.dash<=0){p.vx=((this.controls.right?1:0)-(this.controls.left?1:0))*(p.blocking?120:340);}
   if(!p.action&&p.dash<=0)p.face=e.x>=p.x?1:-1;
   if(!e.action)e.face=p.x>=e.x?1:-1;
   this.enemyAI(dt*(this.field>0?.48:1)*(this.profile.tempo||1));
  }
  for(const f of [p,e]){
   const fd=dt*(f===e?(this.field>0?.48:1)*(this.profile.tempo||1):1),a=f.action;
   if(a){const m=MOVES[a.name],prev=a.t;a.t+=fd;
    if(a.name==='rush'&&a.t<.38)f.vx=f.face*740;
    if(a.name==='ultimate'&&a.t<.24&&Math.abs(p.x-e.x)>105)f.vx=f.face*1100;
    if((a.name==='hook'||a.name==='body')&&a.t<m.startup)f.vx=f.face*110;
    if(m.backstep){if(a.t<m.backstep)f.vx=-a.startFace*300;else if(prev<m.backstep)f.vx=0;}
    if(m.dashStart!==undefined){if(a.t>=m.dashStart&&a.t<m.dashEnd)f.vx=a.startFace*m.dashSpeed;else if(prev<m.dashEnd&&a.t>=m.dashEnd)f.vx=0;}
    if(a.name==='feint'){f.vx=a.t<.16?a.startFace*205:a.t<.31?-a.startFace*315:0;}
    if(a.name==='crossrush'){if(a.t>=.18&&a.t<.44){const goal=a.goalX===undefined?clamp(a.targetX+a.startFace*85,85,1195):a.goalX;f.vx=clamp((goal-f.x)/Math.max(fd,.001),-970,970);}else f.vx=0;if(a.t>=.44)f.face=-a.startFace;}
    if(a.name==='quake'&&prev<.20&&a.t>=.20&&f.y<1){f.vy=250;f.y=1;}
    if(m.shots){while(a.shotIndex<m.shots.length&&a.t>=m.shots[a.shotIndex]){this.projectiles.push({x:f.x+f.face*48,y:m.lowShot?18:f.y+66,vx:f.face*575,from:f,life:2.4,sourceAction:a,skill:a.name,trait:a.rivalStyle,damage:m.shotDamage,beat:a.shotIndex,ground:!!m.lowShot});this.event('shot',{x:f.x,y:m.lowShot?18:f.y+66,name:a.name,beat:a.shotIndex});a.shotIndex++;}}
    if(m.waveAt&&!a.wave&&a.t>=m.waveAt){a.wave=true;for(const dir of [-1,1])this.projectiles.push({x:f.x+dir*36,y:16,vx:dir*390,from:f,life:2.1,sourceAction:a,skill:a.name,trait:a.rivalStyle,damage:10,ground:true});this.event('rivalWave',{x:f.x});}
    if(!a.hit&&a.t>=m.startup){a.hit=true;if(m.projectile&&!m.shots){this.projectiles.push({x:f.x+f.face*48,y:f.y+66,vx:f.face*610,from:f,life:2.4,sourceAction:a,skill:a.name,trait:a.rivalStyle});this.event('shot',{x:f.x,y:f.y+66});}else if(!m.ticks&&!m.projectile&&!m.fake)a.resolved=this.damage(f,f===p?e:p,m)!=='miss';if((a.name==='slam'||a.name==='meteor')&&f.y>0)f.vy=-880;if(m.selfLift&&f.y<20){f.vy=m.selfLift;f.y=Math.max(1,f.y);}if(a.name==='airspin')f.vy=130;}
    if(m.ticks){while(a.tickIndex<m.ticks.length&&a.t>=m.ticks[a.tickIndex]){const last=a.tickIndex===m.ticks.length-1;this.damage(f,f===p?e:p,{...m,damage:last&&m.lastDamage?m.lastDamage:m.damage,push:last&&m.lastPush?m.lastPush:m.push});a.tickIndex++;}}
    if(m.second&&!a.second&&a.t>=m.second){a.second=true;this.damage(f,f===p?e:p,{...m,damage:m.secondDamage||11,push:290});}
    // A move remains active briefly, allowing an opponent to enter its reach.
    if(a.hit&&!a.resolved&&!m.projectile&&!m.ticks&&!m.fake&&a.t>m.startup&&a.t<m.startup+m.active)a.resolved=this.damage(f,f===p?e:p,m)!=='miss';
    if(a.t>=m.end&&f.action===a)f.action=null;
   }
   if(f.dash>0)f.dash-=fd;else f.vx*=Math.pow(.012,fd);
   f.x+=f.vx*fd;f.y+=f.vy*fd;f.vy-=1750*fd;
   if(f.y<=0){if(f.vy<-760)this.event('land',{x:f.x,heavy:true});f.y=0;f.vy=0;f.airHits=0;if(f===p)this.airRoute='';if(f===p&&a&&MOVES[a.name].landing&&a.hit&&!a.landed){a.landed=true;this.damage(p,e,{damage:18,stun:.48,push:240,lift:320,range:205,ground:true,omni:true,noEcho:true});this.event('shock',{x:p.x,y:0});a.t=Math.max(a.t,.70);}}
   if(f.x<65||f.x>1215){if(Math.abs(f.vx)>210&&f.stun>0){f.vx*=-.40;f.stun=Math.max(f.stun,.34);this.event('wall',{x:f.x,y:f.y+65});if(!f.isPlayer)this.stats.wall++;}f.x=clamp(f.x,65,1215);}
  }
  if(Math.abs(p.x-e.x)<48&&Math.abs(p.y-e.y)<75&&p.dash<=0&&e.dash<=0){const sign=p.x<e.x?-1:1;p.x=clamp(p.x+sign*3,65,1215);e.x=clamp(e.x-sign*3,65,1215);}
  for(const b of [...this.projectiles]){const old=b.x;b.x+=b.vx*dt*(b.from===e&&this.field>0?.48:1);b.life-=dt;const to=b.from===p?e:p;if(b.life>0&&Math.abs(to.y+65-b.y)<70&&to.x>=Math.min(old,b.x)-28&&to.x<=Math.max(old,b.x)+28){const outcome=this.damage(b.from,to,{damage:b.damage||32,stun:.34,push:180,sourceAction:b.sourceAction,skill:b.skill,noEcho:b.noEcho,ground:b.ground,borrowTrait:b.trait},'projectile');if(outcome!=='miss')b.life=0;}}
  this.projectiles=this.projectiles.filter(b=>b.life>0&&b.x>0&&b.x<1280);
  for(const f of this.followups){f.ttl-=dt;if(f.ttl<=0&&!f.done){f.done=true;const from={isPlayer:true,x:f.x,y:f.id==='quake'?0:f.y,face:p.face,action:null};this.damage(from,e,{damage:f.id==='quake'?12:9,stun:.30,push:95,lift:f.id==='quake'?220:0,range:f.id==='quake'?190:95,ground:f.id==='quake',omni:true,noEcho:true},'echo');this.event(f.id==='quake'?'shock':'ghost',{x:f.x,y:f.y});}}this.followups=this.followups.filter(f=>!f.done);
  if(this.practice){if(p.hp<45){p.hp=p.maxHp;this.event('hint',{text:'练习模式：生命自动恢复'});}if(e.hp<=0){e.hp=e.maxHp;e.stun=.7;this.event('hint',{text:'练习对手重置，继续试连招'});}}
  if(p.hp<=0){this.status='lost';this.result='lost';this.event('end',{won:false});}
  else if(e.hp<=0){this.status='won';this.result='won';if(!this.learned.includes(this.enemyDef.id))this.learned.push(this.enemyDef.id);this.event('end',{won:true,champion:this.stage===2});}
 }
}
const API={Game,FOES,SKILLS,MOVES,ROUTES,clamp};if(typeof module!=='undefined'&&module.exports)module.exports=API;root.EchoCore=API;
})(typeof window!=='undefined'?window:globalThis);
