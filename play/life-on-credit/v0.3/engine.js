/* 命先欠着 — deterministic game rules. All effects are emitted as events. */
(function(root){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TYPES={
 runner:{name:'刀客',hp:34,speed:155,damage:11,range:82,wind:.47,recover:.55,color:'#efb372',reward:14},
 gunner:{name:'火铳手',hp:34,speed:110,damage:12,range:530,wind:.77,recover:.8,color:'#80bab6',reward:16},
 shield:{name:'盾卫',hp:59,speed:110,damage:15,range:106,wind:.66,recover:.8,color:'#93a9d0',reward:20},
 brute:{name:'重锤',hp:78,speed:83,damage:21,range:138,wind:.9,recover:.95,color:'#cb7b8a',reward:24},
 boss:{name:'催命人',hp:430,speed:100,damage:23,range:150,wind:.8,recover:.9,color:'#e8d3a2',reward:50}
};
const LEVELS=[
 {name:'夜市街口',sub:'先把这条命借下来',world:1900,palette:0,waves:[['runner','runner','runner'],['runner','runner','gunner']]},
 {name:'货运站台',sub:'枪声响了，别站着等',world:2200,palette:1,waves:[['runner','gunner','runner','gunner'],['shield','runner','runner','gunner']]},
 {name:'风井旧巷',sub:'正面打不动，就绕过去',world:2400,palette:2,waves:[['shield','runner','gunner','runner'],['brute','shield','runner','gunner','runner']]},
 {name:'红灯高架',sub:'五秒钟，够你做个决定',world:2500,palette:3,waves:[['runner','runner','gunner','shield','gunner'],['brute','shield','gunner','runner','runner','gunner']]},
 {name:'清算大楼',sub:'今晚的账，到这里结清',world:2200,palette:4,waves:[['brute','shield','runner','gunner'],['boss']]}
];
const PERKS=[
 {id:'pursuit',mark:'追',name:'追债',desc:'重击击倒敌人，立即重置闪避冷却。',once:true,apply:g=>{g.build.pursuit=true;}},
 {id:'chain',mark:'连',name:'连环清账',desc:'结账击倒引发小爆炸，可接力三轮。',once:true,apply:g=>{g.build.chain=true;}},
 {id:'dive',mark:'落',name:'空中催收',desc:'下劈范围扩大至190，震退更远。',once:true,apply:g=>{g.build.dive=true;}},
 {id:'edge',mark:'刃',name:'磨一磨刀',desc:'轻击 +2，重击 +4。',apply:g=>{g.build.light+=2;g.build.heavy+=4;}},
 {id:'discount',mark:'抵',name:'多抵一点',desc:'每击倒一人，多抵 6 点欠血。',apply:g=>{g.build.refund+=6;}},
 {id:'grace',mark:'缓',name:'再宽限一下',desc:'新欠账多给 0.6 秒。旧账不延期。',apply:g=>{g.build.ttl+=.6;}},
 {id:'step',mark:'闪',name:'脚底抹油',desc:'闪避冷却缩短 18%。',apply:g=>{g.build.dashCD*=.82;}},
 {id:'heart',mark:'命',name:'命硬一点',desc:'最大生命 +18，立即恢复 18。',apply:g=>{g.p.maxHp+=18;g.p.hp=Math.min(g.p.maxHp,g.p.hp+18);}},
 {id:'shock',mark:'震',name:'账单大一点',desc:'结账冲击范围 +55，伤害 +12%。',apply:g=>{g.build.radius+=55;g.build.shock*=1.12;}}
];
let serial=0;
class Game{
 constructor(o={}){this.seed=o.seed||7261;this.easy=!!o.easy;this.practice=o.mode==='practice';this.passive=this.practice;this.levelIndex=clamp(o.level||0,0,4);this.events=[];this.clock=0;this.status='fight';this.input={left:false,right:false};this.pending=null;this.debts=[];this.bullets=[];this.enemies=[];this.build={light:0,heavy:0,refund:0,ttl:5,dashCD:.92,radius:0,shock:1,pursuit:false,chain:false,dive:false};this.p={x:0,y:0,vx:0,vy:0,hp:this.easy?135:100,maxHp:this.easy?135:100,face:1,stun:0,inv:0,dash:0,dashCD:0,settleCD:0,action:null,combo:0,comboAge:9,air:false,flash:0,empower:0,perfectCD:0};this.slow=0;this.markCD=0;this.stats={closeCalls:0,parries:0,launches:0,airFinish:0,marks:0,props:0,kills:0,added:0,forgiven:0,paid:0,settlements:0,bestRefund:0,maxDebt:0,maxCombo:0,hits:0,dodges:0,levels:0,perfectDodges:0,chainBursts:0,dives:0};this.wave=0;this.totalSpawned=0;this.waveKills=0;this.waveGap=-1;this.intro=1.3;this.freeze=0;this.deadReason='';this.practiceRespawn=0;this.bursts=[];this.startLevel();}
 rand(){let x=this.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 emit(type,data={}){this.events.push({...data,enemyType:data.type,type});}
 get level(){return LEVELS[this.levelIndex];}
 get debt(){return this.debts.reduce((s,d)=>s+d.amount,0);}
 get remaining(){return this.debts.length?Math.max(0,this.debts[0].due-this.clock):0;}
 get alive(){return this.enemies.filter(e=>e.hp>0);}
 startLevel(){this.p.wallKick=0;this.props=[{x:this.level.world*.38,kind:"box",hp:1},{x:this.level.world*.62,kind:"electric",hp:1}];this.marked=null;this.markCD=0;this.p.jumps=0;this.p.wallJump=true;this.p.airDash=true;this.p.airHits=0;this.p.groundHits=0;this.p.launchUntil=0;this.bursts=[];this.p.empower=0;this.p.perfectCD=0;this.p.dash=0;this.wave=0;this.enemies=[];this.bullets=[];this.debts=[];this.pending=null;this.waveGap=-1;this.status='fight';this.p.x=this.level.world*.46;this.p.y=0;this.p.vx=0;this.p.vy=0;this.p.stun=0;this.p.inv=.6;this.p.action=null;this.p.dashCD=0;this.p.settleCD=0;this.p.combo=0;this.intro=1.3;this.spawnWave();this.emit('chapter',{index:this.levelIndex,name:this.level.name});}
 spawn(type,x,extra={}){const d=TYPES[type],e={id:++serial,type,x:clamp(x,65,this.level.world-65),y:0,vx:0,vy:0,face:1,hp:d.hp,maxHp:d.hp,stun:0,state:'move',t:0,cool:.25+this.rand()*.7,wind:d.wind,recover:d.recover,damage:d.damage,range:d.range,aim:0,attack:'melee',guard:type==='shield'?38:0,exposed:0,flash:0,phase:1,phasePending:false,shots:0,added:false,...extra};this.enemies.push(e);this.emit('spawn',{x:e.x,type});return e;}
 spawnWave(){this.waveKills=0;const list=this.practice?['runner','shield','gunner']:this.level.waves[this.wave];this.totalSpawned=list.length;list.forEach((type,i)=>{const side=i%2===0?1:-1;const x=this.p.x+side*(340+Math.floor(i/2)*165);this.spawn(type,x,{cool:.6+i*.30,...(this.practice?{hp:type==='runner'?140:TYPES[type].hp,maxHp:type==='runner'?140:TYPES[type].hp}:{})});});this.emit('wave',{n:this.wave+1,total:list.length});}
 press(key){if(this.status!=='fight')return false;if(key==='practiceDebt'&&this.practice){this.debts.push({id:++serial,amount:20,total:20,due:this.clock+this.build.ttl});this.stats.added+=20;this.stats.maxDebt=Math.max(this.stats.maxDebt,this.debt);this.emit('hint',{text:'记下20练习欠血，倒计时照常。E贴欠条，打倒目标多抵10。'});return true;}if(key==='mark')return this.mark();if(key==='settle')return this.settle();if(key==='toggle'&&this.practice){this.passive=!this.passive;this.emit('hint',{text:this.passive?'陪练停止进攻，可以练习出招':'陪练开始进攻：留意红色起手提示'});return true;}if(key==='dash')return this.dash();if(!['light','heavy','jump'].includes(key))return false;if(this.act(key))return true;this.pending={key,ttl:.16};return false;}
 act(key){const p=this.p;if(p.stun>0||p.dash>0||this.intro>0)return false;if(key==='jump'){const wall=p.y>0&&p.wallJump&&(p.x<75||p.x>this.level.world-75);if((p.jumps||0)>=2&&!wall)return false;if(wall){p.wallJump=false;p.face=p.x<75?1:-1;p.wallKick=.16;p.vx=p.face*600;p.vy=700;p.action=null;p.jumps=1;this.emit('walljump',{x:p.x,y:p.y+70});return true;}if(p.action&&!p.action.connected)return false;p.jumps=(p.y>0?Math.max(1,p.jumps||0):0)+1;p.y=Math.max(1,p.y);p.vy=p.jumps===2?650:770;p.action=null;this.emit('jump',{x:p.x});return true;}
 const old=p.action;if(old){const cancel=old.connected&&old.kind==='light'&&old.t>.14&&old.chain<3;if(!cancel)return false;}
 const moveDir=Number(this.input.right)-Number(this.input.left);if(moveDir)p.face=moveDir;
 if(key==='light'){p.combo=p.comboAge<.65?Math.min(3,p.combo+1):1;if(old&&old.kind==='light')p.combo=Math.min(3,old.chain+1);p.comboAge=0;const chain=p.combo;p.action={kind:'light',chain,t:0,start:chain===3?.16:.105,end:chain===3?.53:.32,range:chain===3?135:105,damage:([0,5,6,9][chain])+this.build.light,hits:new Set(),connected:false,face:p.face,air:p.y>0};}
 else{const launch=p.y===0&&p.groundHits>=2&&this.clock<p.launchUntil;const empowered=p.empower>0,dive=p.y>0;p.empower=0;p.action={kind:dive?'dive':launch?'launcher':'heavy',chain:0,t:0,start:dive?.12:.27,end:dive?4:.68,range:dive?(this.build.dive?190:120):163+(this.debt>=35?20:0),damage:(launch?16:26)+(this.debt>=35?4:0)+this.build.heavy+(old?.connected?4:0)+(empowered?12:0),hits:new Set(),connected:false,face:p.face,air:p.y>0,empowered,landed:false};p.combo=0;p.groundHits=0;if(empowered)this.emit('empowered',{x:p.x,y:p.y+120});}
 p.vx*=.25;this.emit('swing',{x:p.x,heavy:key==='heavy'});return true;}
 dash(){const p=this.p;const air=p.y>0;if((air?!p.airDash:p.dashCD>0)||p.stun>0||this.intro>0)return false;const dir=this.input.right&&!this.input.left?1:this.input.left&&!this.input.right?-1:p.face;p.face=dir;p.action=null;p.dash=.18;p.inv=Math.max(p.inv,.205);if(air){p.airDash=false;p.vy=Math.max(p.vy,70);}else p.dashCD=this.build.dashCD;p.vx=dir*900;this.pending=null;this.emit('dash',{x:p.x,y:p.y,face:dir});return true;}
 mark(){if(this.intro>0||this.markCD>0||this.debt<=0)return false;const p=this.p;
 const e=this.alive.filter(e=>(e.x-p.x)*p.face>=-24&&Math.abs(e.x-p.x)<620).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
 if(!e)return false;this.marked=e.id;this.markCD=1;this.stats.marks++;this.emit('mark',{x:e.x,y:e.y+180});return true;}
 interact(x,range){for(const o of this.props){if(o.hp<=0||Math.abs(o.x-x)>range)continue;o.hp=0;this.stats.props++;this.emit('prop',{x:o.x,y:35,text:o.kind==='box'?'货箱震裂':'电箱放电'});
 for(const e of [...this.alive])if(Math.abs(e.x-o.x)<(o.kind==='box'?140:190)&&e.y<150){this.hurtEnemy(e,o.kind==='box'?9:6,{shock:true,face:Math.sign(e.x-o.x)||1});if(e.hp>0)e.stun=Math.max(e.stun,o.kind==='electric'?1.1:.45);}}}
 // Called only after attack geometry overlaps the player. Empty dashes cannot earn rewards.
 perfectDodge(from){const p=this.p,token=from?.attackToken;if(p.dash<=.06||p.perfectCD>0||!token||token.perfectUsed)return false;token.perfectUsed=true;p.perfectCD=.7;p.empower=4;this.stats.perfectDodges++;const amount=this.forgive(8);this.freeze=Math.max(this.freeze,.06);this.emit('perfect',{x:p.x,y:p.y+95,amount});return true;}
 bankDamage(amount,from){const p=this.p;if(this.status!=='fight')return false;if(p.inv>0||p.dash>0){this.perfectDodge(from);return false;}amount=Math.round(amount*(this.easy?.77:1));this.debts.push({id:++serial,amount,total:amount,due:this.clock+this.build.ttl});this.stats.added+=amount;this.stats.maxDebt=Math.max(this.stats.maxDebt,this.debt);p.stun=.21;p.action=null;p.inv=.43;p.flash=.2;const dir=from&&from.x>p.x?-1:1;p.vx=dir*270;p.vy=Math.max(p.vy,65);this.pending=null;this.freeze=.045;this.emit('damage',{x:p.x,y:p.y+80,amount});return true;}
 forgive(amount){const initial=this.debt;let left=amount;while(left>0&&this.debts.length){const d=this.debts[0],v=Math.min(left,d.amount);d.amount-=v;left-=v;if(d.amount<.001)this.debts.shift();}const n=initial-this.debt;this.stats.forgiven+=n;this.stats.bestRefund=Math.max(this.stats.bestRefund,n);if(n>0)this.emit('refund',{x:this.p.x,y:this.p.y+105,amount:n});return n;}
 pay(amount,reason){this.p.hp=Math.max(0,this.p.hp-amount);this.stats.paid+=amount;this.emit('paid',{amount,x:this.p.x,y:this.p.y+80,reason});if(this.p.hp<=0){if(this.practice){this.p.hp=this.p.maxHp;this.forgive(this.debt);this.p.inv=1;this.emit('hint',{text:'练习恢复了生命。实战里这笔账会要命。'});}else{this.status='lost';this.deadReason=reason==='settle'?'主动结账的欠血超过了现有生命。':'有欠账到期了，生命没有撑住。';this.emit('end',{won:false});}}}
 settle(){const p=this.p,total=this.debt;if(total<=0||p.settleCD>0||this.intro>0)return false;this.debts=[];p.settleCD=1.35;p.action=null;p.stun=0;this.pending=null;this.stats.settlements++;this.pay(total,'settle');if(this.status!=='fight')return true;p.inv=Math.max(p.inv,.32);const radius=210+Math.min(145,total*1.8)+this.build.radius,damage=(12+total*1.1)*this.build.shock;this.freeze=.085;this.emit('settle',{x:p.x,y:p.y,amount:total,radius});for(const e of [...this.alive])if(Math.abs(e.x-p.x)<radius&&Math.abs(e.y-p.y)<220)this.hurtEnemy(e,damage,{shock:true,settlement:true,chainDepth:0,face:Math.sign(e.x-p.x)||p.face});for(const b of this.bullets)if(Math.abs(b.x-p.x)<radius)b.life=0;return true;}
 hurtEnemy(e,amount,hit={}){if(e.hp<=0)return false;const p=this.p,front=(p.x-e.x)*e.face>=-18;let shield=false;
 if(e.type==='shield'&&e.guard>0&&e.exposed<=0&&front&&!hit.shock){if(hit.heavy){e.guard-=30;if(e.guard<=0){e.exposed=5;this.emit('break',{x:e.x,y:e.y+70});}amount*=.72;}else{amount*=.27;e.guard-=3;shield=true;}if(e.guard<=0)e.exposed=5;}
 const armor=(e.type==='boss'||e.type==='brute')&&e.state==='wind'&&e.attack==='slam'&&!hit.shock;if(armor)amount*=.65;
 amount=Math.round(amount*10)/10;e.hp=Math.max(0,e.hp-amount);e.flash=.13;this.stats.hits++;p.comboAge=0;this.comboCount=this.comboAge<1.1?(this.comboCount||0)+1:1;this.comboAge=0;this.stats.maxCombo=Math.max(this.stats.maxCombo,this.comboCount);this.emit(shield?'block':'hit',{x:e.x,y:e.y+90,amount,heavy:!!hit.heavy,shock:!!hit.shock});
 if(!shield&&!armor){e.state='move';e.t=0;e.stun=hit.shock?.85:hit.heavy?.52:e.type==='boss'?.13:.25;e.vx=(hit.face||p.face)*(hit.shock?520:hit.heavy?320:110);if(hit.heavy&&e.type!=='boss'){e.y=Math.max(1,e.y);e.vy=300;}}
 this.freeze=Math.max(this.freeze,hit.shock?.065:hit.heavy?.055:.026);
 if(e.type==='boss'&&e.hp<=e.maxHp*.5&&e.phase===1)e.phasePending=true;
 if(e.hp<=0){e.state='dead';this.stats.kills++;this.waveKills++;const urgent=this.debts[0]&&this.remaining>0&&this.remaining<=.5?this.debts[0].id:null;this.forgive(TYPES[e.type].reward+this.build.refund+(this.marked===e.id?10:0));if(this.marked===e.id)this.marked=null;if(urgent&&!this.debts.some(d=>d.id===urgent)){this.stats.closeCalls++;this.slow=.38;this.emit('closecall',{x:p.x,y:p.y+150});}this.emit('kill',{x:e.x,y:e.y+60,type:e.type});if(hit.heavy&&this.build.pursuit){const cooling=p.dashCD>0;p.dashCD=0;if(cooling)this.emit('pursuit',{x:p.x,y:p.y+115});}if(hit.settlement&&this.build.chain&&(hit.chainDepth||0)<3)this.bursts.push({x:e.x,y:e.y,depth:(hit.chainDepth||0)+1,due:this.clock+.14});if(this.practice)this.practiceRespawn=2;}
 return true;}
 attackEnemy(e){const p=this.p;if(e.attack==='shot'){this.shoot(e);if(e.type==='boss'||(this.levelIndex>=3&&e.type==='gunner')){e.shots=1;e.nextShot=.25;}return;}
 const dist=Math.abs(p.x-e.x),front=(p.x-e.x)*e.face>=-25;if(e.attack==='slam'){this.emit('slam',{x:e.x,range:e.range});if(dist<e.range&&p.y<65)this.bankDamage(e.damage,e);}else if(dist<e.range+20&&front&&Math.abs(p.y-e.y)<100)this.bankDamage(e.damage,e);}
 shoot(e){const y=e.type==='boss'?85:76;this.bullets.push({x:e.x+e.face*34,y:e.y+y,vx:e.face*(e.type==='boss'?550:490),damage:e.damage,life:3,from:e.id,attackToken:{}});this.emit('shot',{x:e.x,y:e.y+y});}
 enemyTick(e,dt){if(e.hp<=0)return;e.flash=Math.max(0,e.flash-dt);e.exposed=Math.max(0,e.exposed-dt);e.stun=Math.max(0,e.stun-dt);e.cool=Math.max(0,e.cool-dt);e.y+=e.vy*dt;e.vy-=1800*dt;if(e.y<=0){e.y=0;e.vy=0;e.juggles=0;}if(e.stun>0){e.x=clamp(e.x+e.vx*dt,50,this.level.world-50);e.vx*=Math.exp(-7*dt);return;}if(this.intro>0||(this.practice&&this.passive)){e.vx=0;e.state='move';return;}
 const p=this.p,d=p.x-e.x,dist=Math.abs(d),dir=d>=0?1:-1;e.t+=dt;
 if(e.state==='wind'){
  if(e.attack==='rush'&&e.t>.35&&e.t<e.wind)e.x=clamp(e.x+e.face*620*dt,50,this.level.world-50);
  if(e.t>=e.wind){this.attackEnemy(e);e.state='recover';e.t=0;}return;
 }
 if(e.state==='recover'){
  if(e.shots>0){e.nextShot-=dt;if(e.nextShot<=0){this.shoot(e);e.shots--;}}
  if(e.t>=e.recover){e.state='move';e.t=0;e.cool=.35+this.rand()*.4;e.exposed=Math.max(e.exposed,.35);}return;
 }
 e.face=dir;
 if(e.phasePending&&e.stun<=0&&e.y===0){e.phase=2;e.phasePending=false;e.state='recover';e.t=0;e.recover=.9;e.damage+=3;this.emit('bossphase',{x:e.x});this.spawn('runner',p.x-350,{cool:1.4});this.spawn('gunner',p.x+440,{cool:1.8});return;}
 const armed=this.enemies.filter(a=>a.hp>0&&a.state==='wind').length;const aggressive=armed<(this.levelIndex<2?2:3);
 let can=false,attack='melee',range=e.range,wind=TYPES[e.type].wind;
 if(e.type==='gunner'){if(dist<240)e.vx=-dir*100;else if(dist>450)e.vx=dir*TYPES[e.type].speed;else e.vx=0;can=dist<640;attack='shot';}
 else if(e.type==='boss'){
  const style=Math.floor(this.clock/3.1)%3;
  attack=style===0?'rush':style===1?'slam':'shot';range=attack==='slam'?210:attack==='rush'?175:580;wind=attack==='rush'?.8:attack==='slam'?1.0:.85;
  e.vx=dist>(attack==='shot'?380:125)?dir*(e.phase===2?145:115):0;can=dist<(attack==='rush'?390:range+15);
 }else{e.vx=dist>e.range*.83?dir*TYPES[e.type].speed*(this.levelIndex>=3?1.08:1):0;can=dist<e.range+8;attack=e.type==='brute'?'slam':'melee';}
 if(e.cool<=0&&can&&aggressive&&dist<760&&e.y<3){e.state='wind';e.t=0;e.attackToken={};e.attack=attack;e.range=range;e.wind=wind*(this.easy?1.12:1);e.recover=TYPES[e.type].recover;e.face=dir;e.aim=p.x;e.vx=0;this.emit('wind',{x:e.x,y:e.y+120,attack,type:e.type});return;}
 e.x=clamp(e.x+e.vx*dt,55,this.level.world-55);
 }
 tick(dt){if(this.status!=='fight')return;dt=Math.min(dt,.04);if(this.freeze>0){this.freeze-=dt;return;}if(this.slow>0){this.slow=Math.max(0,this.slow-dt);dt*=.35;}this.markCD=Math.max(0,this.markCD-dt);this.clock+=dt;this.intro=Math.max(0,this.intro-dt);const p=this.p;
 for(const k of ['stun','inv','dashCD','settleCD','flash','empower','perfectCD'])p[k]=Math.max(0,p[k]-dt);p.comboAge+=dt;this.comboAge=(this.comboAge||0)+dt;
 while(this.debts.length&&this.debts[0].due<=this.clock){const d=this.debts.shift();this.pay(d.amount,'due');if(this.status!=='fight')return;}
 if(this.pending){this.pending.ttl-=dt;if(this.pending.ttl<=0)this.pending=null;else if(this.act(this.pending.key))this.pending=null;}
 const dive=p.action?.kind==='dive'?p.action:null;if(dive&&!dive.landed&&dive.t>=dive.start){p.vy=-1120;p.vx=0;for(const e of this.alive)if(Math.abs(e.x-p.x)<105&&Math.abs(e.y-p.y)<130&&e.y>0){e.vy=-1200;e.vx=0;e.stun=Math.max(e.stun,.35);}}
 const dir=Number(this.input.right)-Number(this.input.left);if(p.wallKick>0){p.wallKick=Math.max(0,p.wallKick-dt);p.vx=p.face*600;}else if(p.dash>0){p.dash=Math.max(0,p.dash-dt);p.vx=p.face*900;}else if(p.stun<=0&&this.intro<=0){if(!p.action){p.vx=dir*290;if(dir)p.face=dir;}else p.vx=dir*(p.action.kind==='light'?150:p.action.kind==='dive'?100:60);}else p.vx*=Math.exp(-7*dt);
 p.x=clamp(p.x+p.vx*dt,45,this.level.world-45);p.y+=p.vy*dt;p.vy-=1900*dt;if(p.y<=0){if(p.vy<-720)this.emit('land',{x:p.x});p.y=0;p.vy=0;p.jumps=0;p.wallJump=true;p.airDash=true;if(!dive)p.airHits=0;if(dive&&!dive.landed&&dive.t>=dive.start)this.landDive(dive);}
 const a=p.action;if(a){a.t+=dt;if(a.kind!=='dive'&&a.t>=a.start&&a.t<a.start+.12){for(const e of [...this.alive].sort((e,f)=>Math.abs(e.x-p.x)-Math.abs(f.x-p.x))){if(a.kind==='light'&&a.hits.size>=1)break;if(a.hits.has(e.id))continue;const d=e.x-p.x;if(Math.abs(d)<a.range&&d*a.face>=-24&&Math.abs(e.y-p.y)<100){a.hits.add(e.id);a.connected=true;const heavy=a.kind!=='light';const launchable=e.type==='boss'?e.exposed>0:e.type==='brute'?e.state==='recover'||e.exposed>0:e.type!=='shield'||e.guard<=0||(p.x-e.x)*e.face< -18;
 const oldY=e.y,oldVY=e.vy;this.hurtEnemy(e,a.damage,{heavy,face:a.face});if(a.kind==='launcher'&&!launchable){e.y=oldY;e.vy=oldVY;}
 if(a.kind==='light'&&!a.air){p.groundHits=this.clock<p.launchUntil?(p.groundHits||0)+1:1;p.launchUntil=this.clock+.7;}
 if(a.kind==='launcher'&&launchable&&e.hp>0&&(e.juggles||0)<3){e.juggles=(e.juggles||0)+1;e.y=Math.max(e.y,1);e.vy=e.type==='boss'?230:740;e.stun=e.type==='boss'?.18:.5;e.vx=a.face*45;p.x=clamp(e.x-a.face*55,45,this.level.world-45);p.y=Math.max(1,p.y);p.vy=740;p.jumps=1;p.airHits=0;p.action=null;this.stats.launches++;this.emit('launch',{x:e.x,y:e.y+120});}
 if(a.kind==='light'&&a.air){p.airHits++;if(e.type!=='boss')e.vx=a.face*45;if(e.hp>0&&e.type!=='boss'&&(e.juggles||0)<3){e.juggles=(e.juggles||0)+1;e.vy=Math.max(e.vy,300);p.vy=Math.max(p.vy,260);e.stun=.32;}}
 }}}if(a.kind==='heavy'&&!a.propUsed&&a.t>=a.start){a.propUsed=true;if(p.y<80)this.interact(p.x+a.face*65,105);}if(a.t>=a.end&&p.action===a){p.action=null;if(a.kind==='light'&&a.chain===3){p.combo=0;p.comboAge=9;}}}
 // Snapshot due bursts: newly queued explosions wait until a later tick.
 const due=this.bursts.filter(b=>b.due<=this.clock);this.bursts=this.bursts.filter(b=>b.due>this.clock);for(const b of due){this.stats.chainBursts++;this.emit('chain',{x:b.x,y:b.y,radius:145,depth:b.depth});for(const e of [...this.alive])if(Math.abs(e.x-b.x)<145&&Math.abs(e.y-b.y)<150)this.hurtEnemy(e,20,{shock:true,settlement:true,chainDepth:b.depth,face:Math.sign(e.x-b.x)||1});}
 for(const e of this.enemies)this.enemyTick(e,dt);
 const living=this.alive;for(let i=0;i<living.length;i++)for(let j=i+1;j<living.length;j++){const a=living[i],b=living[j],dist=b.x-a.x;if(Math.abs(dist)<37&&Math.abs(a.y-b.y)<65){const s=dist>=0?1:-1;a.x=clamp(a.x-s*1.6,50,this.level.world-50);b.x=clamp(b.x+s*1.6,50,this.level.world-50);}}
 for(const b of this.bullets){if(b.life<=0)continue;const old=b.x;b.x+=b.vx*dt;b.life-=dt;
 if(b.friendly){for(const e of this.alive)if(e.x>=Math.min(old,b.x)-25&&e.x<=Math.max(old,b.x)+25&&Math.abs(e.y+65-b.y)<60){this.hurtEnemy(e,20,{heavy:true,face:Math.sign(b.vx)});b.life=0;break;}continue;}
 const a=p.action,parry=a&&a.kind==='heavy'&&a.t>=.20&&a.t<=.32&&(b.x-p.x)*a.face>=-20&&b.vx*a.face<0&&Math.abs(p.y+65-b.y)<65&&Math.min(Math.abs(old-p.x),Math.abs(b.x-p.x))<180;
 if(b.life>0&&parry){b.friendly=true;b.vx=-b.vx*1.3;b.life=2;this.forgive(4);this.stats.parries++;this.emit('parry',{x:b.x,y:b.y});continue;}
 if(b.life>0&&p.x>=Math.min(old,b.x)-23&&p.x<=Math.max(old,b.x)+23&&Math.abs(p.y+65-b.y)<58){if(this.bankDamage(b.damage,{x:b.x-Math.sign(b.vx)*20,attackToken:b.attackToken}))b.life=0;else if(p.inv>0){this.stats.dodges++;b.life=0;}}}this.bullets=this.bullets.filter(b=>b.life>0&&b.x>0&&b.x<this.level.world);
 if(this.practice){if(this.alive.length===0&&this.bursts.length===0){this.practiceRespawn-=dt;if(this.practiceRespawn<=0){this.enemies=[];this.spawnWave();}}return;}
 if(this.alive.length===0&&this.bursts.length===0&&this.status==='fight'){
  if(this.waveGap<0){this.waveGap=1.45;this.emit('waveclear',{n:this.wave+1,debt:this.debt});}
  this.waveGap=Math.max(0,this.waveGap-dt);
  if(this.waveGap<=0&&this.debts.length===0){this.p.hp=Math.min(this.p.maxHp,this.p.hp+8);this.waveGap=-1;if(this.wave+1<this.level.waves.length){this.wave++;this.enemies=[];this.p.inv=.6;this.spawnWave();}else{this.stats.levels++;this.status=this.levelIndex===4?'won':'cleared';this.emit('end',{won:true,final:this.status==='won'});}}
 }
 }
 landDive(a){if(a.landed||this.p.action!==a)return;a.landed=true;a.end=a.t+.30;this.stats.dives++;this.emit('dive',{x:this.p.x,y:0,radius:a.range,empowered:a.empowered});for(const e of [...this.alive])if(Math.abs(e.x-this.p.x)<a.range&&e.y<130){a.hits.add(e.id);a.connected=true;const face=Math.sign(e.x-this.p.x)||a.face;this.hurtEnemy(e,a.damage,{heavy:true,face});if(e.hp>0&&e.stun>0)e.vx=face*(this.build.dive?620:320);}if(a.connected&&this.p.airHits>=2){this.forgive(5);this.stats.airFinish++;this.emit('airfinish',{x:this.p.x,y:140});}this.p.airHits=0;this.interact(this.p.x,a.range);this.freeze=Math.max(this.freeze,.065);}
 next(perk){if(this.status!=='cleared')return false;const v=PERKS.find(p=>p.id===perk);if(v&&(!v.once||!this.build[v.id]))v.apply(this);this.p.hp=Math.min(this.p.maxHp,this.p.hp+27);this.levelIndex++;this.startLevel();return true;}
 resetPractice(){if(!this.practice)return;this.marked=null;this.markCD=0;this.p.jumps=0;this.p.wallJump=true;this.p.airDash=true;this.p.airHits=0;this.p.groundHits=0;this.p.launchUntil=0;this.props.forEach(o=>o.hp=1);this.bursts=[];this.pending=null;this.freeze=0;this.p.dash=0;this.p.dashCD=0;this.p.settleCD=0;this.p.empower=0;this.p.perfectCD=0;this.p.vx=0;this.p.combo=0;this.p.comboAge=9;this.p.hp=this.p.maxHp;this.forgive(this.debt);this.enemies=[];this.bullets=[];this.p.x=this.level.world*.46;this.p.y=0;this.p.vy=0;this.p.action=null;this.p.stun=0;this.p.wallKick=0;this.p.inv=.5;this.spawnWave();this.emit('hint',{text:'双方已就位，生命和欠账已恢复'});}
}
const API={Game,TYPES,LEVELS,PERKS,clamp};if(typeof module!=='undefined'&&module.exports)module.exports=API;root.CreditCore=API;
})(typeof window!=='undefined'?window:globalThis);
