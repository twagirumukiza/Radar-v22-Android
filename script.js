const $=s=>document.querySelector(s);
let gScore=0,gLevel=1,gLives=3,running=false,audioOn=true,audioCtx=null;
let objects=[],spawnTimer=null,raf=null,nextId=1,kills=0,spawned=0;
let sessionKills=0;
const RECORD_KEY="radar_v4_records";
const weaponKeys=["emp","cluster","blue","black","atomic","mine","decoy"];
const weaponLabels={emp:"ONDE EM",cluster:"SOUS-MUNITIONS",blue:"BOULE BLEUE",black:"ARME NOIRE",atomic:"ATOMIQUE",mine:"MINE MAGNÉTIQUE",decoy:"LEURRE"};
function emptyWeaponMap(){return{emp:0,cluster:0,blue:0,black:0,atomic:0,mine:0,decoy:0}}
function emptyRunStats(){return{
 kills:0,impacts:0,friendlyFire:0,manualShots:0,manualKills:0,playTimeMs:0,
 weaponShots:emptyWeaponMap(),weaponKills:emptyWeaponMap()
}}
let runStats=emptyRunStats();
let lastPlayTick=0;
function defaultModeRecords(){return{bestScore:0,bestLevel:1,totalKills:0,games:0,bestRun:null,lastRun:null}}
function normalizeModeRecords(g){
 const d=defaultModeRecords(),x=Object.assign(d,g||{});
 if(x.bestRun)x.bestRun=normalizeRunData(x.bestRun);
 if(x.lastRun)x.lastRun=normalizeRunData(x.lastRun);
 return x;
}
function defaultRecords(){return{bestScore:0,bestLevel:1,totalKills:0,games:0,bestRun:null,lastRun:null,manual:defaultModeRecords(),ai:defaultModeRecords(),hybrid:defaultModeRecords()}}
function runSnapshot(){return{
 score:gScore,level:gLevel,date:new Date().toISOString(),kills:runStats.kills,impacts:runStats.impacts,
 friendlyFire:runStats.friendlyFire,manualShots:runStats.manualShots,manualKills:runStats.manualKills,
 playTimeMs:Math.max(0,Math.round(runStats.playTimeMs||0)),
 weaponShots:{...runStats.weaponShots},weaponKills:{...runStats.weaponKills}
}}
function isValidRunData(d){
 if(!d||typeof d!=="object")return false;
 if(typeof d.score!=="number"||typeof d.level!=="number")return false;
 return !!d.weaponShots&&!!d.weaponKills;
}
function normalizeRunData(d){
 return Object.assign({},d,{playTimeMs:Number(d.playTimeMs)||0,
  weaponShots:Object.assign(emptyWeaponMap(),d.weaponShots||{}),
  weaponKills:Object.assign(emptyWeaponMap(),d.weaponKills||{})
 });
}
function downloadJSON(obj,filename){
 try{
  const json=JSON.stringify(obj,null,2);
  if(window.AndroidBridge&&typeof window.AndroidBridge.saveJson==="function"){
   window.AndroidBridge.saveJson(filename,json);
   return;
  }
  const blob=new Blob([json],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){}
}
function readJSONFile(file,cb){
 const reader=new FileReader();
 reader.onload=()=>{
  try{cb(JSON.parse(reader.result))}catch(e){alert("Fichier JSON invalide.")}
 };
 reader.onerror=()=>alert("Impossible de lire le fichier.");
 reader.readAsText(file);
}
function getRecords(){
 try{
  const raw=JSON.parse(localStorage.getItem(RECORD_KEY))||{};
  const r=Object.assign(defaultRecords(),raw);
  r.manual=normalizeModeRecords(raw.manual);r.ai=normalizeModeRecords(raw.ai);r.hybrid=normalizeModeRecords(raw.hybrid);
  return r;
 }catch(e){return defaultRecords()}
}
function saveRecords(r){try{localStorage.setItem(RECORD_KEY,JSON.stringify(r))}catch(e){}renderRecords()}
function totalMap(m){return weaponKeys.reduce((n,k)=>n+(Number(m&&m[k])||0),0)}
function formatPlayTime(ms){
 const total=Math.max(0,Math.floor((Number(ms)||0)/1000));
 const hh=Math.floor(total/3600),mm=Math.floor((total%3600)/60),ss=total%60;
 return hh?String(hh).padStart(2,"0")+":"+String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0"):String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0");
}
function renderRunBlock(prefix,run){
 const b=run||{},ws=b.weaponShots||emptyWeaponMap(),wk=b.weaponKills||emptyWeaponMap();
 $("#"+prefix+"Kills").textContent=b.kills||0;$("#"+prefix+"Impacts").textContent=b.impacts||0;
 $("#"+prefix+"FriendlyFire").textContent=b.friendlyFire||0;
 const timeEl=$("#"+prefix+"PlayTime");if(timeEl)timeEl.textContent=formatPlayTime(b.playTimeMs||0);
 const manualShots=b.manualShots||0,manualKills=b.manualKills||0;
 $("#"+prefix+"Accuracy").textContent=(manualShots?Math.round(manualKills/manualShots*100):0)+"%";
 weaponKeys.forEach(k=>{
  $("#"+prefix+"Shot"+k.charAt(0).toUpperCase()+k.slice(1)).textContent=ws[k]||0;
  $("#"+prefix+"Kill"+k.charAt(0).toUpperCase()+k.slice(1)).textContent=wk[k]||0;
 });
 $("#"+prefix+"KillManual").textContent=manualKills;
 const shots=totalMap(ws),weaponKills=totalMap(wk);
 $("#"+prefix+"ShotsTotal").textContent=shots;
 $("#"+prefix+"Efficiency").textContent=shots?(weaponKills/shots).toFixed(2):"0.00";
 let best="—",bestN=0;weaponKeys.forEach(k=>{if((wk[k]||0)>bestN){bestN=wk[k]||0;best=weaponLabels[k]}});
 $("#"+prefix+"BestWeapon").textContent=bestN?best+" ("+bestN+")":"—";
}
function renderRecords(){
 const r=getRecords();
 $("#bestScore").textContent=r.bestScore||0;$("#bestLevel").textContent=r.bestLevel||1;
 $("#lastScore").textContent=(r.lastRun&&r.lastRun.score)||0;$("#lastLevel").textContent=(r.lastRun&&r.lastRun.level)||1;
 $("#totalKills").textContent=r.totalKills||0;$("#gamesPlayed").textContent=r.games||0;
 renderRunBlock("record",r.bestRun);
 renderRunBlock("last",r.lastRun);
 renderModeRecords("manual",r.manual);
 renderModeRecords("ai",r.ai);
 renderModeRecords("hybrid",r.hybrid);
}

function renderModeRecords(prefix,g){
 g=normalizeModeRecords(g);
 const set=(id,v)=>{const e=$("#"+prefix+id);if(e)e.textContent=v};
 set("BestScore",g.bestScore||0);set("BestLevel",g.bestLevel||1);set("LastScore",(g.lastRun&&g.lastRun.score)||0);set("LastLevel",(g.lastRun&&g.lastRun.level)||1);
 set("TotalKills",g.totalKills||0);set("GamesPlayed",g.games||0);
 renderRunBlock(prefix+"Best",g.bestRun);renderRunBlock(prefix+"Last",g.lastRun);
}
function commitModeRecord(group,snap){
 group=normalizeModeRecords(group);
 const isNewBest=snap.score>group.bestScore || !group.bestRun;
 group.bestScore=Math.max(group.bestScore||0,snap.score||0);group.bestLevel=Math.max(group.bestLevel||1,snap.level||1);
 group.totalKills=(group.totalKills||0)+(snap.kills||0);group.games=(group.games||0)+1;
 if(isNewBest)group.bestRun=snap;group.lastRun=snap;return group;
}

function commitRecords(){
 const r=getRecords();
 const isNewBest=gScore>r.bestScore || !r.bestRun;
 r.bestScore=Math.max(r.bestScore||0,gScore);
 r.bestLevel=Math.max(r.bestLevel||1,gLevel);
 r.totalKills=(r.totalKills||0)+sessionKills;r.games=(r.games||0)+1;
 const snap=runSnapshot();
 snap.defenseMode=defenseMode;
 if(isNewBest)r.bestRun=snap;
 r.lastRun=snap;
 if(defenseMode==="manual")r.manual=commitModeRecord(r.manual,snap);
 else if(defenseMode==="ai")r.ai=commitModeRecord(r.ai,snap);
 else if(defenseMode==="hybrid")r.hybrid=commitModeRecord(r.hybrid,snap);
 sessionKills=0;saveRecords(r)
}
const cfg={
 easy:{speed:.030,spawn:1500,count:6},
 normal:{speed:.040,spawn:1200,count:8},
 hard:{speed:.052,spawn:900,count:10}
};
let arsenal={emp:0,cluster:0,blue:0,black:0,atomic:0,mine:0,decoy:0},used={emp:false,cluster:false,blue:false,black:false,atomic:false,mine:false,decoy:false},projectiles=[];
let trainingMode=false,freeMode=false;
// V19 — pilotage de la défense : utilisateur, IA seule ou IA + utilisateur.
let defenseMode="manual",aiActing=false,lastAIAction=0;
let freeRules={
 cluster:{start:3,freq:3},blue:{start:4,freq:4},emp:{start:5,freq:5},black:{start:7,freq:7},atomic:{start:8,freq:8},mine:{start:5,freq:5},decoy:{start:4,freq:4}
};
const SAVE_KEY="radar_v14_active_game";
let lastPersist=0,restoringGame=false;

function serializeObject(o){
 return {id:o.id,angle:o.angle,r:o.r,kind:o.kind,revealed:o.revealed,done:false,
         radialDir:o.radialDir||-1,bounceLeft:Math.max(0,(o.bounceUntil||0)-performance.now())};
}
function serializeProjectile(p){
 return {type:p.type,x:p.x,y:p.y,vx:p.vx,vy:p.vy,primary:!!p.primary,crossed:[...(p.crossed||[])]};
}
function persistGame(force=false){
 if(!running)return;
 const now=Date.now(); if(!force && now-lastPersist<300)return; lastPersist=now;
 const state={
  v:14,savedAt:now,
  gScore,gLevel,gLives,kills,spawned,nextId,sessionKills,
  trainingMode,freeMode,audioOn,defenseMode,
  difficulty:$("#difficulty").value,
  arsenal:{...arsenal},used:{...used},
  freeRules:JSON.parse(JSON.stringify(freeRules)),
  runStats:JSON.parse(JSON.stringify(runStats)),
  objects:objects.filter(o=>!o.done).map(serializeObject),
  projectiles:projectiles.filter(p=>p.e&&p.e.isConnected).map(serializeProjectile),
  mines:mines.filter(m=>m.el&&m.el.isConnected&&m.state!=="gone").map(serializeMine),
  decoys:decoys.filter(d=>d.el&&d.el.isConnected).map(serializeDecoy)
 };
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch(e){}
}
function clearSavedGame(){try{localStorage.removeItem(SAVE_KEY)}catch(e){}}
function getSavedGame(){
 try{
  const s=JSON.parse(localStorage.getItem(SAVE_KEY));
  return s&&s.v===14?s:null;
 }catch(e){return null}
}
function createRestoredObject(data){
 const radar=$("#radar"),el=document.createElement("button");
 el.className=data.revealed?(data.kind==="red"?"enemy":"contact-v4 "+data.kind):"contact-v4";
 el.setAttribute("aria-label","Contact radar");radar.appendChild(el);
 const item={id:data.id,el,angle:data.angle,r:data.r,last:performance.now(),kind:data.kind,
             revealed:!!data.revealed,done:false,radialDir:data.radialDir||-1,
             bounceUntil:performance.now()+(data.bounceLeft||0)};
 objects.push(item);
 el.addEventListener("pointerdown",ev=>{ev.preventDefault();shoot(item)});
 const px=50+Math.cos(item.angle)*item.r*100,py=50+Math.sin(item.angle)*item.r*100;
 el.style.left=px+"%";el.style.top=py+"%";
 return item;
}
function restoreSavedGame(){
 const s=getSavedGame(); if(!s)return false;
 restoringGame=true;
 clearTimeout(spawnTimer);cancelAnimationFrame(raf);clearObjects();
 projectiles.forEach(p=>p.e.remove());projectiles=[];
 clearMines();clearDecoys();
 gScore=s.gScore||0;gLevel=s.gLevel||1;gLives=Number.isFinite(s.gLives)?s.gLives:3;
 kills=s.kills||0;spawned=s.spawned||0;nextId=s.nextId||1;sessionKills=s.sessionKills||0;
 trainingMode=!!s.trainingMode;freeMode=!!s.freeMode;audioOn=s.audioOn!==false;
 defenseMode=["manual","ai","hybrid"].includes(s.defenseMode)?s.defenseMode:"manual";
 arsenal=Object.assign({emp:0,cluster:0,blue:0,black:0,atomic:0,mine:0,decoy:0},s.arsenal||{});
 used=Object.assign({emp:false,cluster:false,blue:false,black:false,atomic:false,mine:false,decoy:false},s.used||{});
 if(s.freeRules)freeRules=s.freeRules;
 runStats=Object.assign(emptyRunStats(),s.runStats||{});
 runStats.weaponShots=Object.assign(emptyWeaponMap(),runStats.weaponShots||{});
 runStats.weaponKills=Object.assign(emptyWeaponMap(),runStats.weaponKills||{});
 runStats.playTimeMs=Number(runStats.playTimeMs)||0;lastPlayTick=performance.now();
 if(s.difficulty&&cfg[s.difficulty])$("#difficulty").value=s.difficulty;
 $("#sound").textContent=audioOn?"🔊":"🔇";
 document.body.classList.toggle("training-mode",trainingMode);
 $("#modeBadge").hidden=!(trainingMode||freeMode);
 if(trainingMode)$("#modeBadge").textContent="ENTRAÎNEMENT";
 if(freeMode)$("#modeBadge").textContent="MODE LIBRE";
 $("#freeSettings").hidden=true;$("#home").hidden=true;$("#game").hidden=false;
 running=true;
 (s.objects||[]).forEach(createRestoredObject);
 (s.projectiles||[]).forEach(p=>addP(p.type,p.x,p.y,p.vx,p.vy,p.primary,p.crossed));
 (s.mines||[]).forEach(md=>{const m=addMine(md.ringIndex,md.ringR,md.angle,md.state);m.x=md.x;m.y=md.y;m.targetId=md.targetId;m.el.style.left=m.x+"%";m.el.style.top=m.y+"%";if(m.state==="hunt")m.el.classList.add("hunting")});
 (s.decoys||[]).forEach(dd=>addDecoy(dd.x,dd.y,dd.vx,dd.vy,dd.crossed));
 renderArsenal();renderDefenseMode();update();
 $("#status").textContent="PARTIE RESTAURÉE — NIVEAU "+gLevel;
 // Continue spawning only if this wave still has contacts to generate.
 clearTimeout(spawnTimer);
 if(spawned<target())spawnTimer=setTimeout(()=>{if(running)makeObject()},450);
 raf=requestAnimationFrame(loop);
 restoringGame=false;persistGame(true);
 return true;
}

function freeDue(name){
 const r=freeRules[name];return gLevel>=r.start && (gLevel-r.start)%r.freq===0;
}
function readFreeRules(){
 const val=id=>Math.max(1,Math.min(99,parseInt($("#"+id).value,10)||1));
 freeRules={
  cluster:{start:val("freeClusterStart"),freq:val("freeClusterFreq")},
  blue:{start:val("freeBlueStart"),freq:val("freeBlueFreq")},
  emp:{start:val("freeEmpStart"),freq:val("freeEmpFreq")},
  black:{start:val("freeBlackStart"),freq:val("freeBlackFreq")},
  atomic:{start:val("freeAtomicStart"),freq:val("freeAtomicFreq")},
  mine:{start:val("freeMineStart"),freq:val("freeMineFreq")},
  decoy:{start:val("freeDecoyStart"),freq:val("freeDecoyFreq")}
 };
}
function freeRegen(name){
 const r=freeRules[name];
 if(gLevel<r.start)return Math.round(Math.max(0,(gLevel-1)/(Math.max(1,r.start-1))*100));
 return Math.round(((gLevel-r.start)%r.freq)/r.freq*100);
}
function regenPercent(step){
 if(trainingMode)return 100;
 // Level 1 is the starting point: progress is based on completed gLevel transitions.
 return Math.min(100,Math.round((((gLevel-1)%step)/step)*100));
}
function setRegen(name,pct){
 const bar=$("#"+name+"Regen"),txt=$("#"+name+"Pct"),btn=$("#weapon"+name.charAt(0).toUpperCase()+name.slice(1));
 if(bar)bar.style.width=pct+"%";if(txt)txt.textContent=trainingMode?"∞":pct+"%";
 if(btn)btn.classList.toggle("ready",pct>=100);
}
function renderDefenseMode(){
 const aiBtn=$("#aiDefense"),hybridBtn=$("#hybridDefense"),box=document.querySelector(".arsenal");
 if(!aiBtn||!hybridBtn||!box)return;
 aiBtn.classList.toggle("active",defenseMode==="ai");
 hybridBtn.classList.toggle("active",defenseMode==="hybrid");
 box.classList.toggle("ai-locked",defenseMode==="ai");
 aiBtn.setAttribute("aria-pressed",defenseMode==="ai");hybridBtn.setAttribute("aria-pressed",defenseMode==="hybrid");
}
function setDefenseMode(mode){
 defenseMode=(defenseMode===mode)?"manual":mode;
 renderDefenseMode();renderArsenal();persistGame(true);
 $("#status").textContent=defenseMode==="ai"?"IA AUX COMMANDES — ARSENAL VERROUILLÉ POUR L’UTILISATEUR":defenseMode==="hybrid"?"DÉFENSE PARTAGÉE — IA + UTILISATEUR":"DÉFENSE MANUELLE";
 tone(defenseMode==="manual"?440:780,.09,.025,"triangle");
}
function aiCanUse(name){return trainingMode || ((arsenal[name]||0)>0 && !used[name]);}
function aiDefenseStep(now){
 if(!running||defenseMode==="manual"||now-lastAIAction<260)return;
 lastAIAction=now;
 const reds=objects.filter(o=>!o.done&&o.revealed&&o.kind==="red").sort((a,b)=>a.r-b.r);
 if(!reds.length)return;
 aiActing=true;
 try{
  // L'IA conserve les armes rares pour les vagues chargées et privilégie la menace la plus proche du centre.
  const critical=reds.filter(o=>o.r<.18).length,near=reds.filter(o=>o.r<.28).length;
  if((reds.length>=6||critical>=3)&&aiCanUse("atomic")){useAtomic();return}
  if((reds.length>=5||critical>=3)&&aiCanUse("emp")){useEMP();return}
  if((reds.length>=4||near>=3)&&aiCanUse("mine")){useMine();return}
  if((reds.length>=4||near>=3)&&aiCanUse("decoy")){useDecoy();return}
  if((reds.length>=3||critical>=2)&&aiCanUse("black")){useBlack();return}
  if((reds.length>=3||critical>=2)&&aiCanUse("cluster")){useCluster();return}
  if((reds.length>=2||critical>=1)&&aiCanUse("blue")){useBlue();return}
  shoot(reds[0]);
 }finally{aiActing=false}
}
function renderArsenal(){
  if(trainingMode){
    empCount.textContent="∞";clusterCount.textContent="∞";blueCount.textContent="∞";
    weaponEmp.disabled=!running;weaponCluster.disabled=!running;weaponBlue.disabled=!running;
  }else{
    empCount.textContent=arsenal.emp;clusterCount.textContent=arsenal.cluster;blueCount.textContent=arsenal.blue;
    weaponEmp.disabled=!running||!arsenal.emp||used.emp;
    weaponCluster.disabled=!running||!arsenal.cluster||used.cluster;
    weaponBlue.disabled=!running||!arsenal.blue||used.blue;
  }

  setRegen("emp",trainingMode?100:(freeMode?freeRegen("emp"):regenPercent(5)));
  setRegen("cluster",trainingMode?100:(freeMode?freeRegen("cluster"):regenPercent(3)));
  setRegen("blue",trainingMode?100:(freeMode?freeRegen("blue"):regenPercent(4)));

  blackCount.textContent=trainingMode?"∞":arsenal.black;
  atomicCount.textContent=trainingMode?"∞":arsenal.atomic;
  weaponBlack.disabled=!running||(!trainingMode&&(!arsenal.black||used.black));
  weaponAtomic.disabled=!running||(!trainingMode&&(!arsenal.atomic||used.atomic));
  setRegen("black",trainingMode?100:(freeMode?freeRegen("black"):regenPercent(7)));
  setRegen("atomic",trainingMode?100:(freeMode?freeRegen("atomic"):regenPercent(8)));

  mineCount.textContent=trainingMode?"∞":arsenal.mine;
  weaponMine.disabled=!running||(!trainingMode&&(!arsenal.mine||used.mine));
  setRegen("mine",trainingMode?100:(freeMode?freeRegen("mine"):regenPercent(5)));

  decoyCount.textContent=trainingMode?"∞":arsenal.decoy;
  weaponDecoy.disabled=!running||(!trainingMode&&(!arsenal.decoy||used.decoy));
  setRegen("decoy",trainingMode?100:(freeMode?freeRegen("decoy"):regenPercent(4)));
}
function awardWeapons(){
 // IMPORTANT: stock is NEVER reset here. Only the "used this level" locks reset.
 if(trainingMode){
   used={emp:false,cluster:false,blue:false,black:false,atomic:false,mine:false,decoy:false};
   renderArsenal(); return;
 }
 const won=[];
 const give=(name,label)=>{ arsenal[name]=(arsenal[name]||0)+1; won.push(label); };

 if(freeMode){
   if(freeDue("cluster")) give("cluster","SOUS-MUNITIONS");
   if(freeDue("blue")) give("blue","BOULE BLEUE");
   if(freeDue("emp")) give("emp","ONDE EM");
   if(freeDue("black")) give("black","ARME NOIRE");
   if(freeDue("atomic")) give("atomic","ATOMIQUE");
   if(freeDue("mine")) give("mine","MINE MAGNÉTIQUE");
   if(freeDue("decoy")) give("decoy","LEURRE");
 }else{
   if(gLevel%3===0) give("cluster","SOUS-MUNITIONS");
   if(gLevel%4===0) give("blue","BOULE BLEUE");
   if(gLevel%5===0) give("emp","ONDE EM");
   if(gLevel%7===0) give("black","ARME NOIRE");
   if(gLevel%8===0) give("atomic","ATOMIQUE");
   if(gLevel%5===0) give("mine","MINE MAGNÉTIQUE");
   if(gLevel%4===0) give("decoy","LEURRE");
 }
 // One use of each weapon TYPE per level; inventory itself remains accumulated.
 used={emp:false,cluster:false,blue:false,black:false,atomic:false,mine:false,decoy:false};
 renderArsenal();
 if(won.length){
   $("#status").textContent="ARME GAGNÉE : "+won.join(" + ");
   tone(1050,.16,.04,"square");
 }
}
function boom(x,y,c="#ff555d"){let e=document.createElement("i");e.className="weapon-boom";e.style.left=x+"%";e.style.top=y+"%";e.style.color=c;$("#radar").appendChild(e);setTimeout(()=>e.remove(),420)}
function weaponKill(o,x,y,source="unknown"){if(o.done||o.kind!=="red")return;gScore+=10+gLevel*2;kills++;sessionKills++;runStats.kills++;if(runStats.weaponKills[source]!==undefined)runStats.weaponKills[source]++;boom(x,y);removeObj(o);o.el.remove();tone(920,.07,.04,"square");update();checkLevel()}
function useEMP(){if(weaponEmp.disabled)return;runStats.weaponShots.emp++;persistGame(true);if(!trainingMode){arsenal.emp--;used.emp=true;}renderArsenal();let e=document.createElement("i");e.className="emp-wave";$("#radar").appendChild(e);tone(260,.5,.05);setTimeout(()=>[...objects].forEach(o=>{if(o.kind==="red"&&!o.done)weaponKill(o,parseFloat(o.el.style.left),parseFloat(o.el.style.top),"emp")}),450);setTimeout(()=>e.remove(),1150)}
function addP(type,x,y,vx,vy,primary=false,crossed=null){
 if(projectiles.length>=220)return;
 const e=document.createElement("i");
 e.className="projectile "+type;
 e.style.left=x+"%";e.style.top=y+"%";
 $("#radar").appendChild(e);
 projectiles.push({type,x,y,vx,vy,e,last:performance.now(),primary,crossed:new Set(crossed||[])});
}
function useCluster(){if(weaponCluster.disabled)return;runStats.weaponShots.cluster++;persistGame(true);if(!trainingMode){arsenal.cluster--;used.cluster=true;}renderArsenal();[[0,-.16],[0,.16],[-.16,0],[.16,0]].forEach(v=>addP("purple",50,50,v[0],v[1],true));tone(520,.14,.04)}
function useBlue(){if(weaponBlue.disabled)return;runStats.weaponShots.blue++;persistGame(true);if(!trainingMode){arsenal.blue--;used.blue=true;}renderArsenal();let a=Math.random()*Math.PI*2;addP("blue",50,50,Math.cos(a)*.13,Math.sin(a)*.13);tone(720,.14,.04)}
function rmP(p){projectiles=projectiles.filter(q=>q!==p);p.e.remove()}
function useBlack(){
 if(weaponBlack.disabled)return;runStats.weaponShots.black++;persistGame(true);
 if(!trainingMode){arsenal.black--;used.black=true}renderArsenal();
 let a=Math.random()*Math.PI*2;addP("black",50,50,Math.cos(a)*.125,Math.sin(a)*.125);
 tone(190,.18,.045,"square");$("#status").textContent="ARME NOIRE DÉPLOYÉE";
}
function useAtomic(){
 if(weaponAtomic.disabled)return;runStats.weaponShots.atomic++;persistGame(true);
 if(!trainingMode){arsenal.atomic--;used.atomic=true}renderArsenal();
 let a=Math.random()*Math.PI*2;addP("atomic",50,50,Math.cos(a)*.115,Math.sin(a)*.115);
 tone(1120,.18,.035);$("#status").textContent="ATOMIQUE DÉPLOYÉE";
}
function atomicBlast(p){
 const wave=document.createElement("i");wave.className="atomic-wave";wave.style.left=p.x+"%";wave.style.top=p.y+"%";$("#radar").appendChild(wave);
 const originX=p.x,originY=p.y,start=performance.now(),duration=900,maxR=58;
 tone(115,.55,.065,"sawtooth");
 function blast(t){
  const rr=Math.min(maxR,(t-start)/duration*maxR);
  [...objects].forEach(o=>{
   if(o.done||o.kind!=="red"||o.atomicMarked)return;
   const x=parseFloat(o.el.style.left),y=parseFloat(o.el.style.top);
   const d=Math.hypot(x-originX,y-originY);
   if(d<=rr+2){o.atomicMarked=true;weaponKill(o,x,y,"atomic")}
  });
  if(t-start<duration)requestAnimationFrame(blast);else wave.remove()
 }
 requestAnimationFrame(blast);
}
let mines=[],nextMineId=1;
// 2 mines dans le 1er cercle, 4 dans le 2e, 6 dans le 3e, 8 sur le pourtour = 20 mines au total.
const MINE_RINGS=[{r:.125,count:2},{r:.25,count:4},{r:.375,count:6},{r:.485,count:8}];
const MINE_DETECT=.035,MINE_BLAST=7,MINE_HUNT_SPEED=48;
function addMine(ringIndex,ringR,angle,state){
 const e=document.createElement("i");e.className="mine";$("#radar").appendChild(e);
 const dir=ringIndex%2===0?1:-1,angularSpeed=(.32-ringIndex*.025)*dir;
 const m={id:nextMineId++,ringIndex,ringR,angle,angularSpeed,state:state||"patrol",targetId:null,el:e,last:performance.now(),exploding:false};
 m.x=50+Math.cos(angle)*ringR*100;m.y=50+Math.sin(angle)*ringR*100;
 e.style.left=m.x+"%";e.style.top=m.y+"%";
 mines.push(m);return m;
}
function deployMines(){
 MINE_RINGS.forEach((ring,idx)=>{
  for(let i=0;i<ring.count;i++){
   const angle=(i/ring.count)*Math.PI*2+Math.random()*.35;
   addMine(idx,ring.r,angle);
  }
 });
}
function removeMine(m){m.state="gone";mines=mines.filter(q=>q!==m);if(m.el)m.el.remove()}
function explodeMine(m,x,y){
 if(m.exploding||m.state==="gone")return;m.exploding=true;
 boom(x,y,"#7fe9ff");tone(230,.1,.05,"square");
 [...objects].forEach(o=>{
  if(o.done||o.kind!=="red")return;
  const ox=parseFloat(o.el.style.left),oy=parseFloat(o.el.style.top);
  if(Math.hypot(ox-x,oy-y)<=MINE_BLAST)weaponKill(o,ox,oy,"mine");
 });
 mines.slice().forEach(mm=>{
  if(mm===m||mm.exploding||mm.state==="gone")return;
  if(Math.hypot(mm.x-x,mm.y-y)<=MINE_BLAST)explodeMine(mm,mm.x,mm.y);
 });
 removeMine(m);
}
function detectRedInRings(){
 objects.forEach(o=>{
  if(o.done||o.kind!=="red"||!o.revealed)return;
  MINE_RINGS.forEach((ring,idx)=>{
   if(Math.abs(o.r-ring.r)<MINE_DETECT){
    mines.forEach(m=>{if(m.ringIndex===idx&&m.state==="patrol"){m.state="hunt";m.targetId=o.id}});
   }
  });
 });
}
function updateMines(now){
 mines.slice().forEach(m=>{
  if(m.exploding||m.state==="gone")return;
  const dt=Math.min(.05,(now-m.last)/1000);m.last=now;
  if(m.state==="hunt"){
   const target=objects.find(o=>o.id===m.targetId&&!o.done);
   if(!target){m.state="patrol";m.angle=Math.atan2((m.y-50)/100,(m.x-50)/100);return}
   const tx=parseFloat(target.el.style.left),ty=parseFloat(target.el.style.top);
   const dx=tx-m.x,dy=ty-m.y,dist=Math.hypot(dx,dy)||.0001;
   if(dist<3){explodeMine(m,tx,ty);return}
   m.x+=dx/dist*MINE_HUNT_SPEED*dt;m.y+=dy/dist*MINE_HUNT_SPEED*dt;
   m.el.classList.add("hunting");
  }else{
   m.angle+=m.angularSpeed*dt;
   m.x=50+Math.cos(m.angle)*m.ringR*100;m.y=50+Math.sin(m.angle)*m.ringR*100;
   m.el.classList.remove("hunting");
  }
  m.el.style.left=m.x+"%";m.el.style.top=m.y+"%";
 });
 detectRedInRings();
}
function useMine(){
 if(weaponMine.disabled)return;runStats.weaponShots.mine++;persistGame(true);
 if(!trainingMode){arsenal.mine--;used.mine=true}renderArsenal();
 deployMines();
 tone(260,.16,.045,"square");$("#status").textContent="20 MINES MAGNÉTIQUES DÉPLOYÉES";
}
function clearMines(){mines.forEach(m=>m.el.remove());mines=[]}
function serializeMine(m){return{ringIndex:m.ringIndex,ringR:m.ringR,angle:m.angle,x:m.x,y:m.y,state:m.state,targetId:m.targetId}}

let decoys=[];
const DECOY_CIRCLES=[12.5,25,37.5],DECOY_SPEED=.105,DECOY_ATTRACT=1.9;
function addDecoy(x=50,y=50,vx=0,vy=0,crossed=null){
 if(decoys.length>=128)return null;
 const e=document.createElement("i");e.className="decoy";$("#radar").appendChild(e);
 const d={x,y,vx,vy,e,last:performance.now(),crossed:new Set(crossed||[]),bounceUntil:0};
 e.style.left=x+"%";e.style.top=y+"%";decoys.push(d);return d;
}
function removeDecoy(d){decoys=decoys.filter(q=>q!==d);if(d.e)d.e.remove()}
function clearDecoys(){decoys.forEach(d=>d.e&&d.e.remove());decoys=[]}
function serializeDecoy(d){return{x:d.x,y:d.y,vx:d.vx,vy:d.vy,crossed:[...(d.crossed||[])]}}
function deployDecoys(){
 for(let i=0;i<8;i++){const a=i*Math.PI/4;addDecoy(50,50,Math.cos(a)*DECOY_SPEED,Math.sin(a)*DECOY_SPEED)}
}
function useDecoy(){
 if(weaponDecoy.disabled)return;runStats.weaponShots.decoy++;persistGame(true);
 if(!trainingMode){arsenal.decoy--;used.decoy=true}renderArsenal();deployDecoys();
 tone(870,.12,.035,"triangle");setTimeout(()=>tone(1180,.1,.025,"triangle"),90);$("#status").textContent="8 LEURRES TURQUOISE DÉPLOYÉS";
}
function attractRedsToDecoys(dt){
 if(!decoys.length)return;
 objects.forEach(o=>{
  if(o.done||o.kind!=="red")return;
  const ox=50+Math.cos(o.angle)*o.r*100,oy=50+Math.sin(o.angle)*o.r*100;
  let best=null,bd=Infinity;
  decoys.forEach(d=>{const q=(d.x-ox)**2+(d.y-oy)**2;if(q<bd){bd=q;best=d}});
  if(!best)return;
  const desired=Math.atan2(best.y-50,best.x-50),delta=Math.atan2(Math.sin(desired-o.angle),Math.cos(desired-o.angle));
  o.angle+=Math.max(-DECOY_ATTRACT*dt,Math.min(DECOY_ATTRACT*dt,delta));
 });
}
function bounceDecoyFriend(d,o,now){
 if(now<(d.bounceUntil||0)||now<(o.bounceUntil||0))return;
 const ox=parseFloat(o.el.style.left),oy=parseFloat(o.el.style.top),dx=d.x-ox,dy=d.y-oy,dist=Math.hypot(dx,dy)||.001;
 if(dist>3.2)return;
 const nx=dx/dist,ny=dy/dist,dot=d.vx*nx+d.vy*ny;d.vx-=2*dot*nx;d.vy-=2*dot*ny;
 o.radialDir=(o.radialDir||-1)*-1;o.angle+=.16*(dx>=0?1:-1);d.x+=nx*.9;d.y+=ny*.9;
 d.bounceUntil=o.bounceUntil=now+320;tone(560,.045,.014,"triangle");
}
function updateDecoys(now){
 [...decoys].forEach(d=>{
  if(!d.e||!d.e.isConnected)return;
  const dt=Math.min(.04,(now-d.last)/1000);d.last=now;
  d.x+=d.vx*dt*100;d.y+=d.vy*dt*100;const rr=Math.hypot(d.x-50,d.y-50);
  if(rr>48){const nx=(d.x-50)/rr,ny=(d.y-50)/rr,dot=d.vx*nx+d.vy*ny;d.vx-=2*dot*nx;d.vy-=2*dot*ny;d.x=50+nx*47;d.y=50+ny*47;tone(700,.025,.008,"triangle")}
  d.e.style.left=d.x+"%";d.e.style.top=d.y+"%";
  for(const o of [...objects]){
   if(o.done)continue;const ox=parseFloat(o.el.style.left),oy=parseFloat(o.el.style.top);if(!Number.isFinite(ox)||Math.hypot(d.x-ox,d.y-oy)>3.1)continue;
   if(o.kind==="red"){
    boom(d.x,d.y,"#32ffe6");weaponKill(o,ox,oy,"decoy");removeDecoy(d);tone(1080,.07,.03,"square");break;
   }
   if(o.kind==="yellow")bounceDecoyFriend(d,o,now);
  }
 });
}
function updateP(now){
 const circles=[12.5,25,37.5];
 [...projectiles].forEach(p=>{
  if(!p.e.isConnected)return;
  let dt=Math.min(40,now-p.last)/1000;p.last=now;
  let oldR=Math.hypot(p.x-50,p.y-50);
  p.x+=p.vx*dt*100;p.y+=p.vy*dt*100;
  let rr=Math.hypot(p.x-50,p.y-50);

  circles.forEach((cr,idx)=>{
   if(oldR<cr&&rr>=cr&&!p.crossed.has(idx)){
    p.crossed.add(idx);
    let base=Math.atan2(p.vy,p.vx),speed=Math.hypot(p.vx,p.vy);
    if(p.type==="purple"){
     [-.72,-.25,.25].forEach(off=>{let a=base+off+(Math.random()-.5)*.14;addP("purple",p.x,p.y,Math.cos(a)*speed,Math.sin(a)*speed,false,[...p.crossed])});
     tone(610,.035,.012)
    }else if(p.type==="blue"||p.type==="atomic"){
     let a=base+(Math.random()<.5?1:-1)*(.42+Math.random()*.22);
     addP(p.type,p.x,p.y,Math.cos(a)*speed,Math.sin(a)*speed,false,[...p.crossed]);
     tone(p.type==="atomic"?1080:790,.04,.014)
    }else if(p.type==="black"){
     // Parent + 2 children = triple.
     [-.48,.48].forEach(off=>{let a=base+off+(Math.random()-.5)*.12;addP("black",p.x,p.y,Math.cos(a)*speed,Math.sin(a)*speed,false,[...p.crossed])});
     tone(220,.04,.015,"square")
    }
   }
  });

  if(p.type==="purple"){
   if(rr>49){rmP(p);return}
  }else if(rr>48){
   let nx=(p.x-50)/rr,ny=(p.y-50)/rr,d=p.vx*nx+p.vy*ny;
   p.vx-=2*d*nx;p.vy-=2*d*ny;p.x=50+nx*47;p.y=50+ny*47;
   tone(p.type==="black"?180:390,.035,.01)
  }

  p.e.style.left=p.x+"%";p.e.style.top=p.y+"%";
  for(let o of [...objects]){
   if(o.done)continue;
   let ox=parseFloat(o.el.style.left),oy=parseFloat(o.el.style.top);
   if((p.x-ox)**2+(p.y-oy)**2<8){
    if(o.kind==="red"){
     if(p.type==="atomic"){atomicBlast(p);rmP(p);break}
     weaponKill(o,p.x,p.y,p.type);rmP(p);break
    }else if(p.type==="blue"||p.type==="black"||p.type==="atomic"){
     // Defensive projectiles rebound on non-red contacts.
     p.vx=-p.vx;p.vy=-p.vy;
     o.angle+=.25*(Math.random()<.5?-1:1);
     tone(460,.04,.012);break
    }
   }
  }
 })
}

function ctx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function tone(f=500,d=.08,vol=.06,type="sine"){
 if(!audioOn)return;const a=ctx(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);
 o.type=type;o.frequency.value=f;g.gain.setValueAtTime(vol,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.start();o.stop(a.currentTime+d)
}
function target(){return cfg[$("#difficulty").value].count+Math.floor((gLevel-1)*1.5)}
function hearts(){
 const full=Math.floor(gLives),half=gLives-full;
 return "♥".repeat(full)+(half>=.5?"♡":"");
}
function update(){
 $("#score").textContent=gScore;$("#level").textContent=gLevel;$("#lives").textContent=hearts();
 $("#remaining").textContent=Math.max(0,target()-kills);
 $("#sweep").style.animationDuration=Math.max(1.45,4-gLevel*.10)+"s"
}
function announce(){
 let b=$(".level-banner");if(!b){b=document.createElement("div");b.className="level-banner";$("#radar").appendChild(b)}
 b.textContent="NIVEAU "+gLevel;b.classList.remove("show");void b.offsetWidth;b.classList.add("show");
 $("#status").textContent=gLevel>=3?"VAGUE "+gLevel+" — IDENTIFIEZ LES CONTACTS":"VAGUE "+gLevel+" — PROTÉGEZ LE CENTRE";
 tone(620,.12,.035);setTimeout(()=>tone(850,.13,.03),130)
}
function makeObject(){
 if(!running||spawned>=target())return;
 const radar=$("#radar"),el=document.createElement("button"),angle=Math.random()*Math.PI*2;
 // Levels 1-2: classic red enemies. Level 3+: some contacts turn green.
 let kind="red",revealed=true;
 if(gLevel>=3 && Math.random()<Math.min(.65,.35+(gLevel-3)*.035)){kind=Math.random()<.58?"red":"yellow";revealed=false}
 el.className=revealed?"enemy":"contact-v4";
 el.setAttribute("aria-label","Contact radar");radar.appendChild(el);
 const item={id:nextId++,el,angle,r:.485,last:performance.now(),kind,revealed,done:false,radialDir:-1,bounceUntil:0};
 objects.push(item);spawned++;
 el.addEventListener("pointerdown",ev=>{ev.preventDefault();shoot(item)});
 const base=cfg[$("#difficulty").value].spawn;
 spawnTimer=setTimeout(makeObject,Math.max(300,base-gLevel*65));persistGame(true)
}
function reveal(item){
 if(item.revealed||gLevel<3)return;
 // Must change no later than the second ring: reveal around outer/second-circle zone.
 item.revealed=true;item.el.className="contact-v4 "+item.kind;
 if(item.kind==="red")tone(760,.07,.025);
 else tone(520,.07,.018)
}
function removeObj(item){
 objects=objects.filter(x=>x!==item);item.done=true;
}
function shoot(item){
 if(defenseMode==="ai"&&!aiActing)return;
 if(!running||item.done||!item.el.isConnected)return;runStats.manualShots++;persistGame(true);
 if(!item.revealed){ // green: neutral, don't reward blind firing
   $("#status").textContent="CONTACT NON IDENTIFIÉ";tone(240,.08,.025);return;
 }
 if(item.kind==="yellow"){
   gLives=Math.max(0,gLives-.5);runStats.friendlyFire++;$("#status").textContent="AMI TOUCHÉ : −½ VIE";
   tone(125,.32,.075,"sawtooth");item.el.classList.add("vanish");removeObj(item);
   setTimeout(()=>item.el.remove(),330);update();if(gLives<=0)end();else checkLevel();return;
 }
 androidHaptic("hit");gScore+=10+gLevel*2;kills++;sessionKills++;runStats.kills++;runStats.manualKills++;$("#status").textContent="MENACE DÉTRUITE";
 tone(980,.06,.055,"square");item.el.classList.add("hit");removeObj(item);
 setTimeout(()=>item.el.remove(),170);update();checkLevel()
}
function redImpact(item){
 androidHaptic("impact");removeObj(item);item.el.remove();gLives=Math.max(0,gLives-1);runStats.impacts++;tone(105,.32,.09,"sawtooth");
 $("#radar").classList.remove("danger");void $("#radar").offsetWidth;$("#radar").classList.add("danger");
 $("#status").textContent="IMPACT AU CENTRE !";update();persistGame(true);if(gLives<=0)end();else checkLevel()
}
function yellowExit(item){
 removeObj(item);item.el.classList.add("vanish");$("#status").textContent="CONTACT AMI SORTI DE LA ZONE";
 tone(420,.08,.018);setTimeout(()=>item.el.remove(),330);persistGame(true);checkLevel()
}
function checkLevel(){
 // Level ends once all spawned objects have resolved; only destroyed threats count in ENNEMIS.
 if(spawned>=target() && objects.length===0){
   clearTimeout(spawnTimer);gLevel++;kills=0;spawned=0;gScore+=50;awardWeapons();update();persistGame(true);
   setTimeout(()=>{if(running){announce();makeObject()}},900)
 }
}
function bounceContactPair(a,b,now){
 if(a.done||b.done||now<(a.bounceUntil||0)||now<(b.bounceUntil||0))return;
 const ca=a.revealed?a.kind:"green",cb=b.revealed?b.kind:"green";
 if(ca!=="red"&&cb!=="red"&&!(ca==="yellow"&&cb==="yellow"))return;
 const ax=parseFloat(a.el.style.left),ay=parseFloat(a.el.style.top),bx=parseFloat(b.el.style.left),by=parseFloat(b.el.style.top);
 if(!Number.isFinite(ax)||!Number.isFinite(bx))return;
 const dx=ax-bx,dy=ay-by;if(dx*dx+dy*dy>5.2)return;
 a.radialDir=(a.radialDir||-1)*-1;b.radialDir=(b.radialDir||-1)*-1;
 const turn=.12;a.angle+=turn*(dx>=0?1:-1);b.angle-=turn*(dx>=0?1:-1);
 a.bounceUntil=b.bounceUntil=now+420;tone(330,.045,.018);
}
function resolveContactCollisions(now){
 const active=objects.filter(o=>!o.done&&o.el.isConnected);
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++)bounceContactPair(active[i],active[j],now);
}
function bounceProjectilePair(a,b,now){
 // Friendly weapon balls rebound off each other, except purple sub-munitions which pass through/split instead.
 if(a.type==="purple"||b.type==="purple")return;
 if(now<(a.bounceUntilP||0)||now<(b.bounceUntilP||0))return;
 if(!a.e.isConnected||!b.e.isConnected)return;
 const dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;
 if(d2>4.2)return;
 const dist=Math.sqrt(d2)||0.0001,nx=dx/dist,ny=dy/dist;
 // Elastic swap of velocity (equal-mass collision) plus a small separation push so the pair doesn't re-trigger immediately.
 const avx=a.vx,avy=a.vy;
 a.vx=b.vx;a.vy=b.vy;b.vx=avx;b.vy=avy;
 a.x+=nx*.7;a.y+=ny*.7;b.x-=nx*.7;b.y-=ny*.7;
 a.bounceUntilP=b.bounceUntilP=now+260;
 tone(600,.045,.015,"triangle")
}
function resolveProjectileCollisions(now){
 const active=projectiles.filter(p=>p.type!=="purple"&&p.e&&p.e.isConnected);
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++)bounceProjectilePair(active[i],active[j],now);
}
function loop(now){
 if(!running)return;
 if(!lastPlayTick)lastPlayTick=now;
 runStats.playTimeMs=(runStats.playTimeMs||0)+Math.max(0,Math.min(1000,now-lastPlayTick));
 lastPlayTick=now;
 aiDefenseStep(now);
 updateP(now);
 resolveProjectileCollisions(now);
 updateMines(now);
 updateDecoys(now);
 const diff=cfg[$("#difficulty").value];
 attractRedsToDecoys(Math.min(.04,1/60));
 [...objects].forEach(x=>{
   if(x.done)return;
   const dt=Math.min(40,now-x.last);x.last=now;
   const factor=1+(gLevel-1)*.075;
   x.r+=x.radialDir*diff.speed*factor*(dt/1000);
   if(x.r>=.485){x.r=.485;x.radialDir=-1;}
   // Reveal green contacts by the second concentric circle at the latest.
   if(!x.revealed && x.r<=.365)reveal(x);
   const px=50+Math.cos(x.angle)*x.r*100,py=50+Math.sin(x.angle)*x.r*100;
   x.el.style.left=px+"%";x.el.style.top=py+"%";
   const scale=Math.max(.72,1.18-x.r*.65);x.el.style.width=(22*scale)+"px";x.el.style.height=(22*scale)+"px";
   // Yellow contacts disappear naturally at the last/inner circle; red continues to center.
   if(x.revealed && x.kind==="yellow" && x.r<=.125)yellowExit(x);
   else if(x.kind==="red" && x.r<=.025)redImpact(x)
 });
 resolveContactCollisions(now);persistGame(false);
 raf=requestAnimationFrame(loop)
}
function clearObjects(){objects.forEach(x=>x.el.remove());objects=[];clearTimeout(spawnTimer)}
function startGame(){
 trainingMode=false;freeMode=false;
 document.body.classList.remove("training-mode");
 $("#modeBadge").hidden=true;
 startGameCommon();
}
function startTraining(){
 $("#freeSettings").hidden=true;
 trainingMode=true;freeMode=false;
 document.body.classList.add("training-mode");
 $("#modeBadge").hidden=false;
 startGameCommon();
}
function startGameCommon(){
 defenseMode="manual";lastAIAction=0;renderDefenseMode();
 clearSavedGame();$("#freeSettings").hidden=true;
 ctx();gScore=0;gLevel=1;gLives=3;kills=0;spawned=0;sessionKills=0;runStats=emptyRunStats();lastPlayTick=performance.now();
 arsenal={emp:0,cluster:0,blue:0,black:0,atomic:0,mine:0,decoy:0};used={emp:false,cluster:false,blue:false,black:false,atomic:false,mine:false,decoy:false};
 projectiles.forEach(p=>p.e.remove());projectiles=[];clearMines();clearDecoys();
 running=true;clearObjects();renderArsenal();
 $("#home").hidden=true;$("#game").hidden=false;update();announce();
 setTimeout(()=>{if(running)makeObject()},700);raf=requestAnimationFrame(loop);persistGame(true)
}
function end(){
 if(!running)return;persistGame(true);running=false;clearSavedGame();if(!trainingMode)commitRecords();clearTimeout(spawnTimer);cancelAnimationFrame(raf);clearObjects();clearMines();clearDecoys();
 $("#finalScore").textContent=gScore;$("#finalLevel").textContent=gLevel;$("#over").showModal();tone(160,.5,.07,"sawtooth")
}
function goHome(){if(running&&!trainingMode)commitRecords();running=false;clearSavedGame();clearTimeout(spawnTimer);cancelAnimationFrame(raf);clearObjects();clearMines();clearDecoys();if($("#over").open)$("#over").close();$("#game").hidden=true;$("#home").hidden=false;$("#freeSettings").hidden=true;trainingMode=false;defenseMode="manual";renderDefenseMode();document.body.classList.remove("training-mode");$("#modeBadge").hidden=true}
$("#start").onclick=startGame;
$("#again").onclick=()=>{$("#over").close();startGame()};
$("#back").onclick=goHome;
$("#quit").onclick=()=>{if(!running||confirm("Quitter la partie en cours et revenir à l’accueil ?"))goHome()};
$("#sound").onclick=()=>{audioOn=!audioOn;$("#sound").textContent=audioOn?"🔊":"🔇";if(audioOn)ctx()};

renderRecords();
$("#recordsToggle").addEventListener("click",()=>$("#records").classList.toggle("closed"));
$("#resetRecords").addEventListener("click",()=>{
 if(confirm("Réinitialiser tous les records ?")){
   saveRecords(defaultRecords());
 }
});

// V15 — export / import / reset séparés pour le meilleur score et la dernière partie
$("#exportBestRun").addEventListener("click",()=>{
 const r=getRecords();
 if(!r.bestRun){alert("Aucun record à exporter pour le moment.");return}
 downloadJSON(r.bestRun,"radar_meilleur_score.json");
});
$("#exportLastRun").addEventListener("click",()=>{
 const r=getRecords();
 if(!r.lastRun){alert("Aucune partie jouée à exporter pour le moment.");return}
 downloadJSON(r.lastRun,"radar_derniere_partie.json");
});
$("#importBestRunBtn").addEventListener("click",()=>$("#importBestRunFile").click());
$("#importLastRunBtn").addEventListener("click",()=>$("#importLastRunFile").click());
$("#importBestRunFile").addEventListener("change",e=>{
 const file=e.target.files[0];if(!file)return;
 readJSONFile(file,data=>{
  if(!isValidRunData(data)){alert("Le fichier ne correspond pas au format attendu d'une partie.");return}
  if(!confirm("Remplacer le record du meilleur score par les données importées ?"))return;
  const r=getRecords();
  r.bestRun=normalizeRunData(data);
  r.bestScore=Math.max(r.bestScore||0,data.score||0);
  r.bestLevel=Math.max(r.bestLevel||1,data.level||1);
  saveRecords(r);
 });
 e.target.value="";
});
$("#importLastRunFile").addEventListener("change",e=>{
 const file=e.target.files[0];if(!file)return;
 readJSONFile(file,data=>{
  if(!isValidRunData(data)){alert("Le fichier ne correspond pas au format attendu d'une partie.");return}
  if(!confirm("Remplacer les statistiques de la dernière partie par les données importées ?"))return;
  const r=getRecords();
  r.lastRun=normalizeRunData(data);
  saveRecords(r);
 });
 e.target.value="";
});
$("#resetBestRun").addEventListener("click",()=>{
 if(!confirm("Réinitialiser uniquement le record du meilleur score ?"))return;
 const r=getRecords();
 r.bestRun=null;r.bestScore=0;r.bestLevel=1;
 saveRecords(r);
});
$("#resetLastRun").addEventListener("click",()=>{
 if(!confirm("Réinitialiser uniquement les statistiques de la dernière partie ?"))return;
 const r=getRecords();
 r.lastRun=null;
 saveRecords(r);
});


function modeExport(mode,label){
 const r=getRecords(),g=normalizeModeRecords(r[mode]);
 if(!g.games&&!g.bestRun&&!g.lastRun){alert("Aucune statistique "+label+" à exporter.");return}
 downloadJSON({format:"radar-mode-records-v1",mode,exportedAt:new Date().toISOString(),records:g},"radar_stats_"+mode+".json");
}
function validModeGroup(g){return g&&typeof g==="object"&&typeof g.games==="number"&&typeof g.bestScore==="number"}
function importModeFile(mode,label,file){
 readJSONFile(file,data=>{
  const g=data&&data.records?data.records:data;
  if(!validModeGroup(g)){alert("Le fichier ne correspond pas aux statistiques "+label+" attendues.");return}
  if(!confirm("Remplacer toutes les statistiques "+label+" par les données importées ?"))return;
  const r=getRecords();r[mode]=normalizeModeRecords(g);saveRecords(r);
 });
}
[["manual","UTILISATEUR"],["ai","IA"],["hybrid","IA + UTILISATEUR"]].forEach(([mode,label])=>{
 const cap=mode.charAt(0).toUpperCase()+mode.slice(1);
 $("#export"+cap+"Stats").addEventListener("click",()=>modeExport(mode,label));
 $("#import"+cap+"StatsBtn").addEventListener("click",()=>$("#import"+cap+"StatsFile").click());
 $("#import"+cap+"StatsFile").addEventListener("change",e=>{const f=e.target.files[0];if(f)importModeFile(mode,label,f);e.target.value=""});
 $("#reset"+cap+"Stats").addEventListener("click",()=>{if(!confirm("Réinitialiser toutes les statistiques "+label+" ?"))return;const r=getRecords();r[mode]=defaultModeRecords();saveRecords(r)});
});

weaponEmp.addEventListener("click",useEMP);weaponCluster.addEventListener("click",useCluster);weaponBlue.addEventListener("click",useBlue);renderArsenal();



$("#trainingBtn").addEventListener("click",startTraining);

weaponBlack.addEventListener("click",useBlack);
weaponAtomic.addEventListener("click",useAtomic);
weaponMine.addEventListener("click",useMine);
weaponDecoy.addEventListener("click",useDecoy);

function startFree(){
 readFreeRules();trainingMode=false;freeMode=true;
 $("#freeSettings").hidden=true;document.body.classList.remove("training-mode");$("#modeBadge").hidden=false;$("#modeBadge").textContent="MODE LIBRE";
 startGameCommon();
}
$("#freeBtn").addEventListener("click",()=>{
 $("#freeSettings").hidden=!$("#freeSettings").hidden;
});
$("#launchFree").addEventListener("click",startFree);

window.addEventListener("beforeunload",()=>persistGame(true));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")persistGame(true)});
window.addEventListener("pagehide",()=>persistGame(true));

// Restore automatically after a reload/F5. A deliberate Quit/Game Over clears the save.
if(getSavedGame())restoreSavedGame();

// V19 — commandes IA de l’arsenal
$("#aiDefense").addEventListener("click",()=>setDefenseMode("ai"));
$("#hybridDefense").addEventListener("click",()=>setDefenseMode("hybrid"));
renderDefenseMode();


// V23 Android — pont natif optionnel (vibrations, bouton Retour, export JSON).
function androidHaptic(kind){
 try{if(window.AndroidBridge&&typeof window.AndroidBridge.haptic==="function")window.AndroidBridge.haptic(kind||"tap");}
 catch(e){}
}
window.radarAndroidBack=function(){
 try{
  if(document.querySelector("dialog[open]")){document.querySelector("dialog[open]").close();return "handled";}
  const game=document.querySelector("#game");
  if(game&&!game.hidden){persistGame(true);const back=document.querySelector("#quit")||document.querySelector("#homeBtn");if(back)back.click();else{running=false;game.hidden=true;document.querySelector("#home").hidden=false;}return "handled";}
 }catch(e){}
 return "exit";
};
