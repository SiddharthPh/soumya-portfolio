(function(){
  var shell=null; try{ if(window.parent!==window && window.parent.__siteShell) shell=window.parent.__siteShell; }catch(e){}
  if(!shell) return;
  addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a[href]'):null; if(!a) return;
    var h=a.getAttribute('href')||'';
    var m=h.match(/^([^#?]+\.dc\.html)(#.*)?$/);
    if(m){ e.preventDefault(); shell.go(decodeURIComponent(m[1]), m[2]||''); return; }
    if(/^https?:/i.test(h)){ a.setAttribute('target','_blank'); a.setAttribute('rel','noopener'); }
    else if(/^(mailto|tel):/i.test(h)){ a.setAttribute('target','_top'); }
  },true);
  var hsh=location.hash; if(hsh && hsh.length>1){ var n=0; var iv=setInterval(function(){ var el=document.getElementById(hsh.slice(1)); if(el||++n>40){ clearInterval(iv); if(el) scrollTo(0, el.getBoundingClientRect().top+scrollY); } },100); }
})();
