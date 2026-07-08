(function(){
  "use strict";

  const d=document;
  const $=id=>d.getElementById(id);
  const COINS=Number(window.COINS_PER_CORRECT)||10;
  const QUIZ_TITLE=window.QUIZ_TITLE||d.title||"IdeaKDC Quiz";
  const lessonUrl=window.location.origin+window.location.pathname;
  const lessonKey=btoa(unescape(encodeURIComponent(lessonUrl))).replace(/=+$/,"");
  const BATTLE_STORAGE_PREFIX="ideakdc_battle_room_"+lessonKey+"_";
  const BATTLE_ACTIVE_KEY="ideakdc_battle_active_room_"+lessonKey;
  let selectedBattleCapacity=0,pendingJoinRoom=null,currentBattleRoom=null,currentBattlePlayerId="",currentBattleAttempt=false,scoreObserver=null;

  function esc(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}
  function hide(id){const el=$(id);if(el)el.classList.add("hidden")}
  function show(id){const el=$(id);if(el)el.classList.remove("hidden")}
  function setText(id,value){const el=$(id);if(el)el.textContent=value}
  function setHTML(id,value){const el=$(id);if(el)el.innerHTML=value}
  function roomStorageKey(roomId){return BATTLE_STORAGE_PREFIX+roomId}
  function encodeRoom(room){try{return btoa(unescape(encodeURIComponent(JSON.stringify(publicRoomData(room)))))}catch(e){return ""}}
  function decodeRoom(raw){try{return JSON.parse(decodeURIComponent(escape(atob(raw))))}catch(e){return null}}
  function battleId(prefix,len){
    const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out=prefix;
    const cryptoObj=window.crypto||window.msCrypto;
    for(let i=0;i<len;i++){
      let idx;
      if(cryptoObj&&cryptoObj.getRandomValues){const arr=new Uint32Array(1);cryptoObj.getRandomValues(arr);idx=arr[0]%chars.length}
      else idx=Math.floor(Math.random()*chars.length);
      out+=chars[idx];
    }
    return out;
  }
  function getRoomLink(room){
    const url=new URL(lessonUrl);
    url.searchParams.set("room",room.roomId);
    url.searchParams.set("battle",encodeRoom(room));
    return url.toString();
  }
  function publicRoomData(room){
    return {lessonId:lessonUrl,roomId:room.roomId,hostName:room.hostName,hostPlayerId:room.hostPlayerId,capacity:room.capacity,createdAt:room.createdAt,startedAt:room.startedAt||"",updatedAt:room.updatedAt||"",status:room.status||"waiting",quizTitle:room.quizTitle,players:room.players||[]};
  }
  function saveRoom(room){
    try{
      localStorage.setItem(roomStorageKey(room.roomId),JSON.stringify(room));
      localStorage.setItem(BATTLE_ACTIVE_KEY,room.roomId);
      localStorage.setItem("ideakdc_battle_player_id_"+lessonKey,currentBattlePlayerId||room.hostPlayerId);
    }catch(e){}
  }
  function loadRoom(roomId){
    try{const raw=localStorage.getItem(roomStorageKey(roomId));return raw?JSON.parse(raw):null}catch(e){return null}
  }
  function normalizeRoom(room){
    if(!room||room.lessonId&&room.lessonId!==lessonUrl)return null;
    const hostId=room.hostPlayerId||battleId("P-",8);
    const players=Array.isArray(room.players)?room.players.map(p=>({...p,score:Number(p.score)||0,coins:Number(p.coins)||0,attempts:Number(p.attempts)||0})):[];
    if(!players.find(p=>p.playerId===hostId))players.unshift({name:room.hostName||"Host",playerId:hostId,score:0,coins:0,attempts:0,status:"Waiting"});
    return {...room,lessonId:lessonUrl,hostPlayerId:hostId,status:room.status||"waiting",players,joined:players.length};
  }
  function hideBattleScreens(){
    hide("battleSetupCard");hide("battleJoinCard");hide("battleRoomCard");
  }
  function hideQuizScreens(){
    ["startCard","quizCard","nameCard","resultCard"].forEach(hide);
  }
  function backToQuizHome(){
    if(window.timer)clearInterval(window.timer);
    hideBattleScreens();
    hide("quizCard");hide("nameCard");hide("resultCard");
    show("joinStudentName");show("joinRoomBtn");show("startCard");
  }
  function selectBattleCapacity(n){
    selectedBattleCapacity=n;
    d.querySelectorAll(".battle-option").forEach(btn=>btn.classList.toggle("selected",+btn.dataset.capacity===n));
  }
  function showBattleSetup(){
    if(window.timer)clearInterval(window.timer);
    hideQuizScreens();
    hide("battleJoinCard");hide("battleRoomCard");show("battleSetupCard");
    setText("battleError","");
    if(!selectedBattleCapacity)selectBattleCapacity(2);
  }
  function createBattleRoom(){
    const hostName=($("battleHostName")&&$("battleHostName").value.trim())||"";
    if(!selectedBattleCapacity){setText("battleError","Please select battle size.");return}
    if(!hostName){setText("battleError","Please enter host student name.");return}
    const hostPlayerId=battleId("P-",8);
    const room=normalizeRoom({lessonId:lessonUrl,roomId:battleId("BR-",6),hostName,hostPlayerId,capacity:selectedBattleCapacity,joined:1,status:"waiting",createdAt:new Date().toISOString(),quizTitle:QUIZ_TITLE,players:[{name:hostName,playerId:hostPlayerId,score:0,coins:0,attempts:0,status:"Host waiting"}]});
    currentBattlePlayerId=hostPlayerId;
    saveRoom(room);
    renderBattleRoom(room);
  }
  async function copyText(text){
    try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);return true}}catch(e){}
    try{const ta=d.createElement("textarea");ta.value=text;d.body.appendChild(ta);ta.select();d.execCommand("copy");ta.remove();return true}catch(e){return false}
  }
  function shareRoomLink(){
    if(!currentBattleRoom)return;
    const link=getRoomLink(currentBattleRoom);
    const text=`Join my IDEAKDC Battle Room ${currentBattleRoom.roomId}: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
  }
  function roomFullMessage(room){
    hideBattleScreens();hide("startCard");show("battleJoinCard");
    setText("joinRoomCodeText",`Room Code: ${room.roomId}`);
    setHTML("joinError",'<div class="room-full">Room Full</div>This room has no space available.');
    hide("joinStudentName");hide("joinRoomBtn");
  }
  function showJoinRoom(room){
    pendingJoinRoom=normalizeRoom(room);
    if(!pendingJoinRoom)return;
    hideQuizScreens();hide("battleSetupCard");hide("battleRoomCard");
    show("joinStudentName");show("joinRoomBtn");setText("joinError","");
    setText("joinRoomCodeText",`Room Code: ${pendingJoinRoom.roomId}`);
    show("battleJoinCard");
  }
  function joinBattleRoom(){
    if(!pendingJoinRoom)return;
    const room=normalizeRoom(loadRoom(pendingJoinRoom.roomId)||pendingJoinRoom);
    if(!room)return;
    if(room.players.length>=room.capacity){roomFullMessage(room);return}
    const studentName=($("joinStudentName")&&$("joinStudentName").value.trim())||"";
    if(!studentName){setText("joinError","Please enter joining student name.");return}
    const playerId=battleId("P-",8);
    room.players.push({name:studentName,playerId,score:0,coins:0,attempts:0,status:room.status==="started"?"Joined - battle started":"Joined - waiting"});
    room.joined=room.players.length;
    currentBattlePlayerId=playerId;
    saveRoom(room);
    renderBattleRoom(room);
  }
  function startBattle(){
    if(!currentBattleRoom)return;
    const room=normalizeRoom(loadRoom(currentBattleRoom.roomId)||currentBattleRoom);
    if(!room)return;
    currentBattlePlayerId=currentBattlePlayerId||room.hostPlayerId;
    if(currentBattlePlayerId!==room.hostPlayerId){setText("battleStartError","Only host can start the battle.");return}
    if(room.players.length<2){setText("battleStartError","Waiting for players... At least 2 players needed.");return}
    room.status="started";
    room.startedAt=room.startedAt||new Date().toISOString();
    room.players=room.players.map(p=>({...p,status:p.status&&p.status.includes("Host")?"Host - Battle Started":"Battle Started"}));
    saveRoom(room);
    renderBattleRoom(room);
  }
  function startScoreObserver(){
    if(scoreObserver)scoreObserver.disconnect();
    const quizCard=$("quizCard");
    if(!quizCard||!window.MutationObserver)return;
    const readScore=()=>{const m=(quizCard.textContent||"").match(/Score:\s*(\d+)/i);if(m)updateBattleScore(Number(m[1]))};
    scoreObserver=new MutationObserver(readScore);
    scoreObserver.observe(quizCard,{childList:true,subtree:true,characterData:true});
    readScore();
  }
  function attemptBattleQuiz(){
    if(!currentBattleRoom)return;
    const room=normalizeRoom(loadRoom(currentBattleRoom.roomId)||currentBattleRoom);
    if(!room||room.status!=="started"){setText("battleStartError","Waiting for players... Battle has not started yet.");return}
    currentBattleAttempt=true;
    updateBattleScore(0);
    hideBattleScreens();
    if(typeof window.startQuiz==="function")window.startQuiz();
    else show("quizCard");
    startScoreObserver();
  }
  function updateBattleScore(latestScore,finishedAttempt=false){
    if(!currentBattleAttempt||!currentBattleRoom||!currentBattlePlayerId)return;
    const room=normalizeRoom(loadRoom(currentBattleRoom.roomId)||currentBattleRoom);
    if(!room)return;
    const player=room.players.find(p=>p.playerId===currentBattlePlayerId);
    if(!player)return;
    const safeScore=Math.max(Number(player.score)||0,Number(latestScore)||0);
    player.score=safeScore;
    player.coins=safeScore*COINS;
    player.attempts=Math.max(Number(player.attempts)||0,1);
    player.status=finishedAttempt?"Quiz Finished":"Attempting Quiz";
    room.updatedAt=new Date().toISOString();
    currentBattleRoom=room;
    saveRoom(room);
  }
  window.updateBattleScore=updateBattleScore;
  window.IdeaKDCBattle={updateScore:updateBattleScore,lessonId:lessonUrl};

  function renderPlayers(room){
    setHTML("battlePlayersList",(room.players||[]).map(p=>`<div class="player-card"><div class="player-top"><div><div class="player-name">${esc(p.name)}</div><div class="player-id">${esc(p.playerId)}</div></div><div class="player-score">Score: ${Number(p.score)||0}<br>Coins: ${Number(p.coins)||0}</div></div><div class="player-status">${esc(p.status||"Waiting")}</div></div>`).join(""));
  }
  function renderLeaderboard(room){
    const ranked=[...(room.players||[])].sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||(Number(b.coins)||0)-(Number(a.coins)||0)||String(a.name||"").localeCompare(String(b.name||"")));
    setHTML("battleLeaderboard",ranked.map((p,i)=>`<div class="leaderboard-row"><div class="rank-badge">#${i+1}</div><div class="leader-main"><div class="leader-name">${esc(p.name||"Student")}</div><div class="leader-id">${esc(p.playerId||"")}</div></div><div class="leader-score">Score: ${Number(p.score)||0}<br>Coins: ${Number(p.coins)||0}</div></div>`).join(""));
  }
  function renderBattleRoom(room){
    room=normalizeRoom(room);
    if(!room)return;
    currentBattleRoom=room;
    if(!currentBattlePlayerId)currentBattlePlayerId=room.hostPlayerId;
    saveRoom(room);
    const isHost=currentBattlePlayerId===room.hostPlayerId;
    const hasStarted=room.status==="started";
    hideQuizScreens();hide("battleSetupCard");hide("battleJoinCard");
    setText("battleRoomCode",room.roomId);
    setText("battleHostDisplay",room.hostName);
    setText("battlePlayerId",currentBattlePlayerId);
    setText("battleJoinedText",`${room.players.length}/${room.capacity} joined`);
    setText("battleCapacityText",`${room.players.length}/${room.capacity} joined`);
    setText("battleStatusText",hasStarted?"Battle Started":"Waiting for players...");
    const status=$("battleStatusText");if(status)status.classList.toggle("started",hasStarted);
    setHTML("battleWaitingMsg",hasStarted?"Battle Started<br>Joined players can attempt the quiz now.":room.players.length>=room.capacity?"Room is full. Host can start the battle now.":"Waiting for players...<br>Host can start when at least 2 players joined.");
    setText("battleLinkNote","Share link: "+getRoomLink(room));
    const startBtn=$("startBattleBtn");if(startBtn)startBtn.classList.toggle("hidden",!isHost||hasStarted);
    const attemptBtn=$("attemptBattleQuizBtn");if(attemptBtn)attemptBtn.classList.toggle("hidden",!hasStarted);
    setText("battleStartError",!hasStarted&&isHost&&room.players.length<2?"Waiting for players... At least 2 players needed.":"");
    renderPlayers(room);
    renderLeaderboard(room);
    show("battleRoomCard");
  }
  function restoreBattleRoom(){
    const params=new URLSearchParams(window.location.search);
    const roomId=params.get("room");
    const shared=decodeRoom(params.get("battle")||"");
    if(roomId&&shared){
      const local=loadRoom(roomId);
      currentBattlePlayerId=localStorage.getItem("ideakdc_battle_player_id_"+lessonKey)||"";
      const room=normalizeRoom(local||shared);
      if(!room)return;
      if(local&&currentBattlePlayerId&&room.players.find(p=>p.playerId===currentBattlePlayerId)){renderBattleRoom(room);return}
      if(room.players.length>=room.capacity)roomFullMessage(room);else showJoinRoom(room);
      return;
    }
    try{
      const active=localStorage.getItem(BATTLE_ACTIVE_KEY);
      if(!active)return;
      currentBattlePlayerId=localStorage.getItem("ideakdc_battle_player_id_"+lessonKey)||"";
      const room=loadRoom(active);
      if(room)renderBattleRoom(room);
    }catch(e){}
  }
  function battleMarkup(){
    return `<div class="card hidden center" id="battleSetupCard"><h2 class="result-title">Battle Room</h2><div class="small">Choose room size, enter host student name, and create a waiting room.</div><div class="battle-options" id="battleSizeOptions"><button class="battle-option" type="button" data-capacity="2">2 Players</button><button class="battle-option" type="button" data-capacity="3">3 Players</button><button class="battle-option" type="button" data-capacity="4">4 Players</button><button class="battle-option" type="button" data-capacity="5">5 Players</button></div><input class="name-input" id="battleHostName" maxlength="30" placeholder="Host student name"><button class="btn battle-btn" id="createBattleRoomBtn" type="button">Create Room</button><div class="battle-error" id="battleError"></div><br><button class="btn secondary" id="battleBackBtn" type="button">Back to Quiz</button></div><div class="card hidden center" id="battleJoinCard"><h2 class="result-title">Join Battle</h2><div class="join-source" id="joinRoomCodeText">Room Code: ----</div><div class="small">Enter your name to join this room.</div><input class="name-input" id="joinStudentName" maxlength="30" placeholder="Joining student name"><button class="btn battle-btn" id="joinRoomBtn" type="button">Join Room</button><div class="battle-error" id="joinError"></div><br><button class="btn secondary" id="joinBackBtn" type="button">Back to Quiz</button></div><div class="card hidden center" id="battleRoomCard"><h2 class="result-title">Battle Room Ready</h2><div class="joined-pill" id="battleJoinedText">1/5 joined</div><div class="battle-status-pill" id="battleStatusText">Waiting for players...</div><div class="battle-room-meta"><div class="battle-meta-row"><span class="battle-label">Room Code</span><span class="battle-value" id="battleRoomCode">----</span></div><div class="battle-meta-row"><span class="battle-label">Host Name</span><span class="battle-value" id="battleHostDisplay">Host</span></div><div class="battle-meta-row"><span class="battle-label">Your Player ID</span><span class="battle-value" id="battlePlayerId">----</span></div><div class="battle-meta-row"><span class="battle-label">Capacity</span><span class="battle-value" id="battleCapacityText">1/5 joined</span></div></div><div class="battle-share-actions"><button class="btn secondary" id="copyRoomLinkBtn" type="button">Copy Room Link</button><button class="btn secondary" id="whatsappRoomShareBtn" type="button">WhatsApp Share</button></div><div class="battle-link-note" id="battleLinkNote">Share this room link with students.</div><div class="player-list" id="battlePlayersList"></div><div class="leaderboard-title">Leaderboard</div><div class="leaderboard-list" id="battleLeaderboard"></div><div class="waiting-msg" id="battleWaitingMsg">Waiting for players...<br>Host can start when at least 2 players joined.</div><div class="battle-start-actions"><button class="btn battle-btn hidden" id="startBattleBtn" type="button">Start Battle</button><button class="btn battle-btn hidden" id="attemptBattleQuizBtn" type="button">Attempt Quiz</button><div class="battle-error" id="battleStartError"></div></div><br><button class="btn secondary" id="battleHomeBtn" type="button">Back to Quiz Home</button></div>`;
  }
  function init(){
    const startCard=$("startCard")||d.querySelector(".card.center");
    if(!startCard||$("battleBtn"))return;
    let actions=startCard.querySelector(".start-actions");
    if(!actions){actions=d.createElement("div");actions.className="start-actions";startCard.appendChild(actions)}
    const btn=d.createElement("button");
    btn.className="btn battle-btn";
    btn.id="battleBtn";
    btn.type="button";
    btn.textContent="आओ बैटल करते हैं";
    actions.appendChild(btn);
    startCard.insertAdjacentHTML("afterend",battleMarkup());
    d.querySelectorAll(".battle-option").forEach(option=>option.onclick=()=>selectBattleCapacity(+option.dataset.capacity));
    $("battleBtn").onclick=showBattleSetup;
    $("createBattleRoomBtn").onclick=createBattleRoom;
    $("battleBackBtn").onclick=backToQuizHome;
    $("battleHomeBtn").onclick=backToQuizHome;
    $("joinBackBtn").onclick=backToQuizHome;
    $("joinRoomBtn").onclick=joinBattleRoom;
    $("copyRoomLinkBtn").onclick=async()=>{if(currentBattleRoom){const ok=await copyText(getRoomLink(currentBattleRoom));setText("battleLinkNote",ok?"Room link copied.":"Copy failed. Long-press the link text to copy.")}};
    $("whatsappRoomShareBtn").onclick=shareRoomLink;
    $("startBattleBtn").onclick=startBattle;
    $("attemptBattleQuizBtn").onclick=attemptBattleQuiz;
    restoreBattleRoom();
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init);else init();
})();
