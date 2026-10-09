(function(){
  var KEY='theme', root=document.documentElement;
  function get(){ try{ return localStorage.getItem(KEY)==='dark'?'dark':'light'; }catch(e){ return 'light'; } }
  function apply(t){
    root.setAttribute('data-theme',t);
    root.style.colorScheme=t;
    var m=document.querySelector('meta[name="theme-color"]');
    if(m) m.setAttribute('content',t==='dark'?'#1A1A1B':'#FFFDFC');
  }
  apply(get());
  var css=''
  +':root{--t-bg:#FFFDFC;--t-ink:#2A0D09;--t-accent:#F9261C;--t-fill:#F9261C;--t-fill-hover:#E01810;--t-muted:#8A4F48;--t-line:#EFD6D2;--t-tint:#FBEAE7;--t-deep:#43160F;--t-ondeep:#F8DEDB;--t-chip:#43160F;--t-chip-ink:#F8DEDB;--t-body:#4A1E18;--t-box:#F4EDEC;--t-accent2:#C9372C;--t-slate:rgb(98,111,134);--t-good:#107003;}'
  +':root[data-theme="dark"]{--t-bg:#1A1A1B;--t-ink:#ECE8E4;--t-accent:#FF8378;--t-fill:#D63A30;--t-fill-hover:#E5483D;--t-muted:#ABA5A0;--t-line:#3B3938;--t-tint:#252324;--t-deep:#2F2C2D;--t-ondeep:#ECE8E4;--t-chip:#38302F;--t-chip-ink:#EFE9E6;--t-body:#D9D3CE;--t-box:#38302F;--t-accent2:#FF8378;--t-slate:#A4AEBF;--t-good:#7FD873;}'
  +'.name-cycle{display:inline-grid;vertical-align:baseline;}'
  +'.name-cycle .nm{grid-area:1/1;white-space:nowrap;opacity:0;animation:name-cycle 6s infinite;}'
  +'.name-cycle .nm-en{opacity:1;animation-delay:0s;}'
  +'.name-cycle .nm-ta{animation-delay:2s;font-family:"Noto Serif Tamil","Tiro Tamil",serif;font-stretch:62.5%;font-size:.88em;letter-spacing:0;line-height:1.3;}'
  +'.name-cycle .nm-mr{animation-delay:4s;font-family:"Tiro Devanagari Marathi","Noto Serif Devanagari",serif;font-size:.95em;letter-spacing:0;}'
  +''
  +'@keyframes name-cycle{0%{opacity:0;transform:translateY(6px);}4%,30%{opacity:1;transform:none;}34%,100%{opacity:0;transform:translateY(-6px);}}'
  +'@media (prefers-reduced-motion:reduce){.name-cycle .nm{animation:none;}.name-cycle .nm-ta,.name-cycle .nm-mr{display:none;}}'
  +'html{background:var(--t-bg);}'
  +'.theme-toggle{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;color:var(--t-ink);transition:color .25s ease,transform .35s cubic-bezier(.22,1,.36,1);}'
  +'.theme-toggle:hover{color:var(--t-accent);transform:rotate(18deg);}'
  +'.theme-toggle:focus-visible{outline:2px solid var(--t-accent);outline-offset:3px;}'
  +'.theme-toggle svg{display:block;width:24px;height:24px;stroke-width:1.6;}'
  +'.theme-toggle .ic-sun{display:none;}'
  +':root[data-theme="dark"] .theme-toggle .ic-sun{display:block;}'
  +':root[data-theme="dark"] .theme-toggle .ic-moon{display:none;}'
  +'.theme-toggle-mobile{display:none;margin-left:auto;}'
  +'@media (max-width:767px){.theme-toggle-mobile{display:inline-flex;}}'
  +':root[data-theme="dark"] .worked-track .wi-gray{filter:invert(1) brightness(.9);}'
  +':root[data-theme="dark"] img{filter:brightness(.94);}'
  +':root[data-theme="dark"] .worked-track img{filter:none;}'
  +'html.theme-vt *{transition:none!important;}'
  +'::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal;}'
  +'::view-transition-old(root){z-index:1;}::view-transition-new(root){z-index:2;}'
  +'@keyframes theme-spin{0%{transform:rotate(-140deg) scale(.3);opacity:0;}60%{transform:rotate(12deg) scale(1.15);opacity:1;}100%{transform:rotate(0) scale(1);opacity:1;}}'
  +'.theme-toggle.theme-spin svg{animation:theme-spin .7s cubic-bezier(.22,1,.36,1);}'
  +'html.theme-anim,html.theme-anim *{transition:background-color .35s ease,color .35s ease,border-color .35s ease!important;}';
  var st=document.createElement('style'); st.id='theme-vars'; st.textContent=css;
  (document.head||root).appendChild(st);
  var fl=document.createElement('link'); fl.rel='stylesheet'; fl.href='https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wdth,wght@62.5..100,400&family=Tiro+Devanagari+Marathi&display=swap'; (document.head||root).appendChild(fl);
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function commit(t){
    apply(t);
    try{ localStorage.setItem(KEY,t); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('themechange',{detail:t})); }catch(e){}
  }
  function fade(t){
    root.classList.add('theme-anim'); commit(t);
    clearTimeout(window.__themeT); window.__themeT=setTimeout(function(){ root.classList.remove('theme-anim'); },450);
  }
  window.__setTheme=function(t,origin){
    if(reduce||!origin||!root.animate){ fade(t); return; }
    var x=origin.x,y=origin.y,r=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))+4;
    var col=t==='dark'?'#1A1A1B':(document.querySelector('.is-research')?'#230907':'#FFFDFC');
    var ov=document.createElement('div');
    ov.setAttribute('aria-hidden','true');
    ov.style.cssText='position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:'+col+';clip-path:circle(0px at '+x+'px '+y+'px);';
    document.body.appendChild(ov);
    var grow=ov.animate({clipPath:['circle(0px at '+x+'px '+y+'px)','circle('+r+'px at '+x+'px '+y+'px)']},{duration:520,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
    var done=false;
    function swap(){
      if(done) return; done=true; clearTimeout(guard);
      root.classList.add('theme-vt'); commit(t);
      setTimeout(function(){
        root.classList.remove('theme-vt');
        var out=ov.animate({opacity:[1,0]},{duration:380,easing:'ease-out',fill:'forwards'});
        out.onfinish=function(){ ov.remove(); };
        setTimeout(function(){ ov.remove(); },1200);
      },80);
    }
    var guard=setTimeout(swap,900);
    grow.onfinish=swap;
  };
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.theme-toggle');
    if(!b) return;
    var rc=b.getBoundingClientRect();
    b.classList.remove('theme-spin'); void b.offsetWidth; b.classList.add('theme-spin');
    window.__setTheme(root.getAttribute('data-theme')==='dark'?'light':'dark',{x:rc.left+rc.width/2,y:rc.top+rc.height/2});
  });
})();
