(function(){
"use strict";

const RULES=[
  {phrase:"MÁS BRILLANTE",tone:"bright",label:"Brightness"},
  {phrase:"MÁS OSCURA",tone:"dark",label:"Darkness"},
  {phrase:"MÁS FUERTE",tone:"louder",label:"Loudness"},
  {phrase:"MÁS SUAVE",tone:"quieter",label:"Quietness"},
  {phrase:"DISTORSIONADA",tone:"distorted",label:"Distortion"},
  {phrase:"LIMPIA",tone:"clean",label:"Clean"},
  {phrase:"MÁS COMPRIMIDA",tone:"compressed-more",label:"Compression"},
  {phrase:"MENOS COMPRIMIDA",tone:"compressed-less",label:"Dynamics"},
  {phrase:"ZONA",tone:"region",label:"Frequency"},
  {phrase:"DÓNDE",tone:"pan",label:"Stereo"}
];

installStyles();
startObserver();
requestAnimationFrame(decorateAll);

function installStyles(){
  if(document.getElementById("sgQuestionFocusV1Styles"))return;
  const style=document.createElement("style");
  style.id="sgQuestionFocusV1Styles";
  style.textContent=`
#sgLevel1ProTrainer .sg-l1pro-question{
  --q:255,190,61;
  position:relative;
  isolation:isolate;
  margin:2px 0 11px;
  padding:13px 12px 15px;
  border:1px solid rgba(var(--q),.30);
  border-radius:12px;
  background:linear-gradient(135deg,rgba(var(--q),.085),rgba(8,12,15,.22) 48%,rgba(var(--q),.025));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 0 24px rgba(var(--q),.045);
  overflow:hidden;
  transition:border-color .28s ease,background .28s ease,box-shadow .28s ease;
}
#sgLevel1ProTrainer .sg-l1pro-question::before{
  content:"";
  position:absolute;
  left:12%;right:12%;top:0;height:2px;
  background:linear-gradient(90deg,transparent,rgb(var(--q)),transparent);
  opacity:.78;
  pointer-events:none;
}
#sgLevel1ProTrainer .sg-l1pro-question>span{
  color:rgba(var(--q),.78);
  font-size:8px;
  letter-spacing:.20em;
  font-weight:950;
}
#sgLevel1ProTrainer [data-l1-question]{
  color:#f4f6f8;
  line-height:1.08;
  text-wrap:balance;
}
#sgLevel1ProTrainer [data-l1-question] .sg-l1q-key{
  color:rgb(var(--q));
  font:inherit;
  font-weight:1000;
  text-shadow:0 0 9px rgba(var(--q),.34),0 0 22px rgba(var(--q),.16);
  white-space:nowrap;
}
#sgLevel1ProTrainer .sg-l1pro-question.is-question-cued [data-l1-question] .sg-l1q-key{
  animation:sgL1QuestionCue .52s cubic-bezier(.2,.9,.2,1);
}
@keyframes sgL1QuestionCue{
  0%{opacity:.45;filter:brightness(.7);text-shadow:none}
  55%{opacity:1;filter:brightness(1.35);text-shadow:0 0 13px rgba(var(--q),.58),0 0 30px rgba(var(--q),.24)}
  100%{filter:brightness(1)}
}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="bright"]{--q:255,205,66}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="dark"]{--q:174,125,255}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="louder"]{--q:255,103,47}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="quieter"]{--q:55,210,255}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="clean"]{--q:83,232,133}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="distorted"]{--q:255,74,105}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="compressed-more"]{--q:255,139,50}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="compressed-less"]{--q:64,218,188}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="region"]{--q:241,195,77}
#sgLevel1ProTrainer .sg-l1pro-question[data-l1-tone="pan"]{--q:49,214,255}
@media(max-width:700px){
  #sgLevel1ProTrainer .sg-l1pro-question{padding:12px 8px 14px;margin-bottom:9px}
  #sgLevel1ProTrainer [data-l1-question]{font-size:clamp(20px,6.4vw,27px)}
  #sgLevel1ProTrainer [data-l1-question] .sg-l1q-key{display:inline-block}
}
@media(prefers-reduced-motion:reduce){
  #sgLevel1ProTrainer .sg-l1pro-question.is-question-cued [data-l1-question] .sg-l1q-key{animation:none}
}
`;
  document.head.appendChild(style);
}

function startObserver(){
  const observer=new MutationObserver(records=>{
    let needs=false;
    for(const record of records){
      const target=record.target.nodeType===1?record.target:record.target.parentElement;
      if(target?.matches?.("[data-l1-question]")||target?.querySelector?.("[data-l1-question]")){needs=true;break;}
    }
    if(needs)requestAnimationFrame(decorateAll);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
}

function decorateAll(){
  document.querySelectorAll("#sgLevel1ProTrainer [data-l1-question]").forEach(decorate);
}

function decorate(el){
  if(el.querySelector(".sg-l1q-key"))return;
  const text=(el.textContent||"").trim();
  if(!text)return;
  const upper=text.toLocaleUpperCase("es");
  const rule=RULES.find(item=>upper.includes(item.phrase));
  const box=el.closest(".sg-l1pro-question");
  if(!rule||!box)return;
  const index=upper.indexOf(rule.phrase);
  if(index<0)return;
  const before=text.slice(0,index);
  const key=text.slice(index,index+rule.phrase.length);
  const after=text.slice(index+rule.phrase.length);
  el.setAttribute("aria-label",text);
  el.textContent="";
  if(before)el.appendChild(document.createTextNode(before));
  const emphasis=document.createElement("span");
  emphasis.className="sg-l1q-key";
  emphasis.textContent=key;
  el.appendChild(emphasis);
  if(after)el.appendChild(document.createTextNode(after));
  box.dataset.l1Tone=rule.tone;
  box.classList.remove("is-question-cued");
  void box.offsetWidth;
  box.classList.add("is-question-cued");
}
})();

(function(){
  "use strict";
  if(window.SoundGymLoudnessLeveling||document.querySelector('script[data-sg-loudness-leveling]'))return;
  const script=document.createElement("script");
  script.src="assets/sound-gym-loudness-leveling-v1.js?v=sg-loud1";
  script.dataset.sgLoudnessLeveling="1";
  document.head.appendChild(script);
})();
