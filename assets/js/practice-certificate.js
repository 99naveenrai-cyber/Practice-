(function(){
  "use strict";

  const brand="IdeaKDC: Your Practice Mitra";

  function safeFileName(name){
    return String(name||"Student").trim().replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"")||"Student";
  }

  function cleanUrl(url){
    if(url)return String(url);
    try{return window.location.href.split("?")[0].split("#")[0]}
    catch(e){return "/"}
  }

  function drawCentered(ctx,text,x,y,maxWidth,lineHeight){
    const words=String(text||"").split(/\s+/).filter(Boolean);
    let line="",lines=[];
    words.forEach(word=>{
      const test=line?line+" "+word:word;
      if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}
      else line=test;
    });
    if(line)lines.push(line);
    lines.forEach((item,index)=>ctx.fillText(item,x,y+index*lineHeight));
    return y+lines.length*lineHeight;
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function createCertificate(options){
    const name=String(options.name||"Student").slice(0,34);
    const topic=String(options.topic||"IdeaKDC Quiz").slice(0,70);
    const scoreText=options.scoreText||`Score: ${options.score||0}/${options.total||0}`;
    const coinsText=options.coins!=null?`   |   Coins: ${options.coins}`:"";
    const canvas=document.createElement("canvas");
    const ctx=canvas.getContext("2d");
    canvas.width=1600;
    canvas.height=1000;

    const gradient=ctx.createLinearGradient(0,0,1600,1000);
    gradient.addColorStop(0,"#031225");
    gradient.addColorStop(.45,"#0b2b61");
    gradient.addColorStop(1,"#020817");
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,1600,1000);

    for(let i=0;i<72;i++){
      ctx.fillStyle=`rgba(125,211,252,${.08+Math.random()*.18})`;
      ctx.beginPath();
      ctx.arc(Math.random()*1600,Math.random()*1000,Math.random()*3+1,0,Math.PI*2);
      ctx.fill();
    }

    ctx.shadowColor="#38bdf8";
    ctx.shadowBlur=34;
    ctx.strokeStyle="#ffffff";
    ctx.lineWidth=10;
    roundRect(ctx,70,70,1460,860,42);
    ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle="#38bdf8";
    ctx.lineWidth=4;
    roundRect(ctx,105,105,1390,790,30);
    ctx.stroke();

    ctx.textAlign="center";
    ctx.fillStyle="#eaf6ff";
    ctx.font="800 42px system-ui, Arial";
    ctx.fillText(brand,800,165);
    ctx.fillStyle="#ffffff";
    ctx.font="900 76px system-ui, Arial";
    ctx.shadowColor="#38bdf8";
    ctx.shadowBlur=22;
    ctx.fillText("Certificate Of Excellent Performance",800,270);
    ctx.shadowBlur=0;
    ctx.fillStyle="#b8d5ff";
    ctx.font="500 34px system-ui, Arial";
    ctx.fillText("This certificate is proudly presented to",800,350);
    ctx.fillStyle="#ffd166";
    ctx.font="900 78px system-ui, Arial";
    ctx.fillText(name,800,455);
    ctx.fillStyle="#eaf6ff";
    ctx.font="700 38px system-ui, Arial";
    drawCentered(ctx,"For successfully completing the topic quiz:",800,530,1180,48);
    ctx.fillStyle="#7dd3fc";
    ctx.font="900 50px system-ui, Arial";
    drawCentered(ctx,topic,800,600,1180,58);
    ctx.fillStyle="#ffffff";
    ctx.font="800 42px system-ui, Arial";
    ctx.fillText(scoreText+coinsText,800,720);
    ctx.fillStyle="#dceeff";
    ctx.font="700 34px system-ui, Arial";
    drawCentered(ctx,"Keep practicing, try more IdeaKDC quizzes, and succeed with confidence.",800,795,1180,44);
    ctx.fillStyle="#93c5fd";
    ctx.font="700 28px system-ui, Arial";
    ctx.fillText("Appealing to all students: Practice daily, learn deeply, and shine brighter.",800,865);

    return canvas.toDataURL("image/jpeg",.92);
  }

  function copyText(text){
    if(navigator.clipboard){
      return navigator.clipboard.writeText(text).then(()=>true).catch(()=>fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text){
    try{
      const area=document.createElement("textarea");
      area.value=text;
      area.style.position="fixed";
      area.style.left="-999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      return true;
    }catch(e){return false}
  }

  function shareMessage(options){
    return options.shareText||`${options.name||"Student"}: ${options.score||0}/${options.total||0}${options.coins!=null?` | Coins: ${options.coins}`:""}\n${options.topic||"IdeaKDC Quiz"}\nTry this quiz and succeed:\n${cleanUrl(options.quizUrl)}`;
  }

  function renderResultTools(options){
    const opts=Object.assign({showShare:false},options||{});
    const target=typeof opts.target==="string"?document.querySelector(opts.target):opts.target;
    if(!target)return null;

    target.querySelectorAll(".ideakdc-result-tools").forEach(node=>node.remove());
    const certUrl=createCertificate(opts);
    const fileName=`IdeaKDC-Certificate-${safeFileName(opts.name)}.jpg`;
    const msg=shareMessage(opts);
    const quizUrl=cleanUrl(opts.quizUrl);
    const wrap=document.createElement("div");
    wrap.className="ideakdc-result-tools";
    wrap.innerHTML=`<div class="ideakdc-certificate-panel">${opts.askName?'<label class="ideakdc-cert-name-row">Student Name<input type="text" data-cert-name placeholder="Write student name"></label>':""}<h3>Certificate Of Excellent Performance</h3><img src="${certUrl}" alt="IdeaKDC Certificate Of Excellent Performance"><a class="ideakdc-download-certificate" download="${fileName}" href="${certUrl}">Download Certificate</a></div>${opts.showShare?'<div class="ideakdc-share-grid"><button class="ideakdc-share-wa" data-share="wa">WhatsApp Share</button><button class="ideakdc-share-wa" data-share="status">WhatsApp Status</button><button class="ideakdc-share-fb" data-share="fb">Facebook</button><button class="ideakdc-share-ig" data-share="ig">Instagram</button><button class="ideakdc-share-copy" data-share="copy">Copy Link</button></div>':""}`;
    const nameInput=wrap.querySelector("[data-cert-name]");
    if(nameInput){
      nameInput.value=opts.name||"";
      nameInput.addEventListener("input",()=>{
        const nextName=nameInput.value.trim()||"Student";
        const nextUrl=createCertificate(Object.assign({},opts,{name:nextName}));
        const img=wrap.querySelector("img");
        const link=wrap.querySelector(".ideakdc-download-certificate");
        if(img)img.src=nextUrl;
        if(link){link.href=nextUrl;link.download=`IdeaKDC-Certificate-${safeFileName(nextName)}.jpg`}
      });
    }
    target.appendChild(wrap);
    wrap.querySelectorAll("[data-share]").forEach(button=>{
      button.addEventListener("click",async()=>{
        const type=button.getAttribute("data-share");
        if(type==="wa"||type==="status")window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank","noopener,noreferrer");
        else if(type==="fb")window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(quizUrl)}`,"_blank","noopener,noreferrer");
        else if(type==="ig"){await copyText(msg);window.open("https://www.instagram.com/","_blank","noopener,noreferrer");}
        else {await copyText(quizUrl);alert("Link copied!")}
      });
    });
    return {element:wrap,certificateUrl:certUrl,message:msg,quizUrl};
  }

  window.IdeaKDCPracticeTools=Object.assign({},window.IdeaKDCPracticeTools||{},{
    createCertificate,
    renderResultTools,
    copyText,
    shareMessage
  });
})();
