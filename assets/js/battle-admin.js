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
  function scanRooms(){
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
    return Object.values(byKey).filter(item=>item&&item.roomId&&localStorage.getItem(item.storageKey)).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
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
  function renderRooms(){
    const rooms=scanRooms();
    $("roomCountText").textContent=rooms.length===1?"1 active room":rooms.length+" active rooms";
    if(!rooms.length){
      $("adminRooms").innerHTML='<div class="admin-empty">No active battle rooms found.</div>';
      return;
    }
    $("adminRooms").innerHTML=rooms.map(room=>`<article class="admin-room">
      <h3>${esc(room.roomId)}</h3>
      <div class="admin-meta"><b>${esc(room.quizTitle)}</b></div>
      <div class="admin-meta">Host: ${esc(room.hostName||"Host")}</div>
      <div class="admin-meta">Players: ${Number(room.joined)||0}/${Number(room.capacity)||0} | Status: ${esc(room.status||"waiting")}</div>
      <div class="admin-meta">Lesson: ${esc(shortPath(room.lessonId))}</div>
      <div class="admin-actions"><button class="btn danger" data-room="${esc(room.storageKey)}" type="button">Delete Room</button></div>
    </article>`).join("");
    d.querySelectorAll("[data-room]").forEach(btn=>btn.onclick=()=>{
      const room=rooms.find(item=>item.storageKey===btn.dataset.room);
      if(room&&confirm("Delete room "+room.roomId+"? Player profile and score history will remain saved.")){deleteRoom(room);renderRooms()}
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
    $("refreshRoomsBtn").onclick=renderRooms;
    $("deleteAllRoomsBtn").onclick=()=>{
      const rooms=scanRooms();
      if(!rooms.length)return;
      if(confirm("Delete all active rooms? Player profiles and score history will remain saved.")){rooms.forEach(deleteRoom);renderRooms()}
    };
    if(sessionStorage.getItem("ideakdc_battle_admin_ok")==="yes"){
      $("loginCard").classList.add("hidden");
      $("adminPanel").classList.remove("hidden");
      renderRooms();
    }
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init);else init();
})();
