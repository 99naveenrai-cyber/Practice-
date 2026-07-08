(function(){
  "use strict";

  const d=document;
  const config=window.IdeaKDCPracticeConfig||{};
  const brand=config.footerBrand||"ideaKDC : Your Practice Mitra";
  const buttonLabel=config.footerButtonLabel||"Go Different Course or Class";
  const homeUrl=config.homeUrl||"/";

  function resolveHomeUrl(){
    try{return new URL(homeUrl,window.location.origin).toString()}
    catch(e){return "/"}
  }

  function renderFooter(){
    d.querySelectorAll(".footer").forEach(el=>el.remove());
    if(d.getElementById("ideakdcPracticeFooter"))return;

    const footer=d.createElement("footer");
    footer.className="ideakdc-practice-footer";
    footer.id="ideakdcPracticeFooter";
    footer.innerHTML=`<div class="ideakdc-practice-brand">${brand}</div><a class="ideakdc-course-button" href="${resolveHomeUrl()}">${buttonLabel}</a>`;

    const target=d.querySelector(".wrap")||d.querySelector("main")||d.body;
    target.appendChild(footer);
  }

  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",renderFooter);
  else renderFooter();
})();
