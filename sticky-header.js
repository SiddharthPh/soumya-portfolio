(function(){
  function init(){
    var h=document.querySelector('header');
    if(!h){return setTimeout(init,150);}
    if(h.__ctx) return; h.__ctx=true;
    h.style.transition=(h.style.transition?h.style.transition+',':'')+'transform .4s cubic-bezier(.22,1,.36,1)';
    var t, hover=false, IDLE=1400;
    function show(){ h.style.transform='translateY(0)'; }
    function hide(){ if(scrollY>h.offsetHeight && !hover && !h.contains(document.activeElement)) h.style.transform='translateY(-100%)'; }
    function arm(){ clearTimeout(t); t=setTimeout(hide,IDLE); }
    addEventListener('scroll',function(){ show(); arm(); },{passive:true});
    addEventListener('mousemove',function(e){ if(e.clientY<32){ show(); arm(); } },{passive:true});
    h.addEventListener('mouseenter',function(){ hover=true; show(); clearTimeout(t); });
    h.addEventListener('mouseleave',function(){ hover=false; arm(); });
    h.addEventListener('focusin',show);
    h.addEventListener('focusout',arm);
    if(scrollY>h.offsetHeight) arm();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
