(function(){
  "use strict";

  const d=document;
  const $=id=>d.getElementById(id);
  const ADMIN_HASH="bf3b02c501a9770f8704a135f57e478e25b8eea1240c88198e6f481384103411";
  const GLOBAL_ROOMS_INDEX_KEY="ideakdc_battle_rooms_index_v2";

  function esc(value){return String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}
  function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}}
  async function sha256(text){
    const data=new TextEncoder().encode(text);
    const hash=await crypto.subtle.digest("SHA-256",data);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  function shortPath(url){
    try{return new URL(url).pathname}catch(e){return url||""}
  }
  function status(message,isError){
    const el=$("adminStatusNote");
    if(!el)return;
    el.textContent=message;
    el.style.color=isError?"#fecaca":"#bfdbfe";
    el.style.borderColor=isError?"rgba(248,113,113,.45)":"rgba(56,189,248,.32)";
    el.style.background=isError?"rgba(248,113,113,.12)":"rgba(56,189,248,.12)";
  }
  function scanLocalRooms(){
    const index=readJson(GLOBAL_ROOMS_INDEX_KEY,[]);
    const byKey={};
    index.forEach(item=>{if(item&&item.storageKey)byKey[item.storageKey]=item});
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||!key.startsWith("ideakdc_battle_room_"))continue;
      const room=readJson(key,null);
      if(!room||!room.roomId)continue;
      byKey[key]={...(byKey[key]||{}),lessonId:room.lessonId,lessonKey:(key.match(/^ideakdc_battle_room_(.+)_BR-/)||[])[1]||"",roomId:room.roomId,hostName:room.hostName,capacity:room.capacity,joined:(room.players||[]).length,status:room.status||"waiting",quizTitle:room.quizTitle||"IdeaKDC Quiz",storageKey:key,updatedAt:room.updatedAt||room.createdAt||""};
      if(!byKey[key].membersKey&&byKey[key].lessonKey)byKey[key].membersKey="ideakdc_battle_room_members_"+byKey[key].lessonKey+"_"+room.roomId;
    }
    return Object.values(byKey).filter(item=>item&&item.roomId&&localStorage.getItem(item.storageKey)).map(item=>({...item,source:"local"})).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
  }
  async function scanFirebaseRooms(){
    if(typeof db==="undefined")return [];
    const snap=await db.collection("battleRooms").get();
    const now=Date.now();
    const rooms=[];
    snap.forEach(doc=>{
      const data=doc.data()||{};
      const players=Array.isArray(data.players)?data.players:[];
      const expiresAt=Number(data.expiresAt)||0;
      rooms.push({source:"firebase",roomId:doc.id,hostName:(players[0]&&players[0].name)||"Host",capacity:Number(data.maxPlayers)||0,joined:players.length,status:data.status||"open",quizTitle:data.game?String(data.game).toUpperCase()+" Battle":"Website Battle Room",lessonId:"Firebase battleRooms",storageKey:"firebase:"+doc.id,updatedAt:String(data.createdAt||""),expiresAt,isExpired:expiresAt>0&&expiresAt<=now});
    });
    return rooms.sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0));
  }
  async function scanRooms(){
    const localRooms=scanLocalRooms();
    try{
      const firebaseRooms=await scanFirebaseRooms();
      return [...firebaseRooms,...localRooms];
    }catch(e){
      status("Could not read Firebase rooms: "+e.message,true);
      return localRooms;
    }
  }
  function markDeleted(item){
    if(!item.lessonKey)return;
    const key="ideakdc_battle_deleted_rooms_"+item.lessonKey;
    const deleted=readJson(key,[]);
    if(deleted.indexOf(item.roomId)===-1){deleted.push(item.roomId);writeJson(key,deleted)}
  }
  function removeFromIndex(item){
    const index=readJson(GLOBAL_ROOMS_INDEX_KEY,[]);
    writeJson(GLOBAL_ROOMS_INDEX_KEY,index.filter(room=>!(room.lessonKey===item.lessonKey&&room.roomId===item.roomId)));
  }
  function deleteRoom(item){
    markDeleted(item);
    localStorage.removeItem(item.storageKey);
    if(item.membersKey)localStorage.removeItem(item.membersKey);
    removeFromIndex(item);
  }
  async function deleteAnyRoom(item){
    if(item.source==="firebase"){
      if(typeof db==="undefined")throw new Error("Firebase is not loaded.");
      await db.collection("battleRooms").doc(item.roomId).delete();
      removeMyRoom(item.roomId);
      return;
    }
    deleteRoom(item);
  }
  function removeMyRoom(roomId){
    const rooms=readJson("ideakdc_myRooms",[]);
    if(Array.isArray(rooms))writeJson("ideakdc_myRooms",rooms.filter(room=>room.roomId!==roomId));
  }
  async function renderRooms(){
    const rooms=await scanRooms();
    $("roomCountText").textContent=rooms.length===1?"1 active room":rooms.length+" active rooms";
    if(!rooms.length){
      $("adminRooms").innerHTML='<div class="admin-empty">No active battle rooms found.</div>';
      status("No active rooms found in Firebase or this browser.");
      return;
    }
    $("adminRooms").innerHTML=rooms.map(room=>`<article class="admin-room">
      <div class="source-pill">${room.source==="firebase"?"Website / Firebase":"This Browser"}</div>
      <h3>${esc(room.roomId)}</h3>
      <div class="admin-meta"><b>${esc(room.quizTitle)}</b></div>
      <div class="admin-meta">Host: ${esc(room.hostName||"Host")}</div>
      <div class="admin-meta">Players: ${Number(room.joined)||0}/${Number(room.capacity)||0} | Status: ${esc(room.isExpired?"expired":room.status||"waiting")}</div>
      <div class="admin-meta">Lesson: ${esc(shortPath(room.lessonId))}</div>
      <div class="admin-actions"><button class="btn danger" data-room="${esc(room.storageKey)}" type="button">Delete Room</button></div>
    </article>`).join("");
    status("Showing website Firebase rooms plus local browser rooms. Delete removes the room, not player history.");
    d.querySelectorAll("[data-room]").forEach(btn=>btn.onclick=async()=>{
      const room=rooms.find(item=>item.storageKey===btn.dataset.room);
      if(room&&confirm("Delete room "+room.roomId+"? Player profile and score history will remain saved.")){
        try{await deleteAnyRoom(room);status("Deleted room "+room.roomId+".");await renderRooms()}
        catch(e){status("Could not delete room "+room.roomId+": "+e.message,true)}
      }
    });
  }
  async function login(){
    const code=($("adminCode").value||"").trim();
    if(!code){$("adminError").textContent="Please enter admin code.";return}
    if(await sha256(code)!==ADMIN_HASH){$("adminError").textContent="Wrong admin code.";return}
    sessionStorage.setItem("ideakdc_battle_admin_ok","yes");
    $("loginCard").classList.add("hidden");
    $("adminPanel").classList.remove("hidden");
    renderRooms();
  }
  function init(){
    $("adminLoginBtn").onclick=login;
    $("adminCode").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
    $("refreshRoomsBtn").onclick=()=>renderRooms();
    $("deleteAllRoomsBtn").onclick=async()=>{
      const rooms=await scanRooms();
      if(!rooms.length)return;
      if(confirm("Delete all active rooms? Player profiles and score history will remain saved.")){
        try{
          await Promise.all(rooms.map(deleteAnyRoom));
          status("Deleted all active rooms.");
          await renderRooms();
        }catch(e){
          status("Could not delete all rooms: "+e.message,true);
          await renderRooms();
        }
      }
    };
    if(sessionStorage.getItem("ideakdc_battle_admin_ok")==="yes"){
      $("loginCard").classList.add("hidden");
      $("adminPanel").classList.remove("hidden");
      renderRooms();
    }
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init);else init();
})();
