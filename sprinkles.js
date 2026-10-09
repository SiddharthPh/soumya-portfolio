(function(){
  function boot(){
    if(!document.querySelector('.about-main')) return;
    var cv=document.createElement('canvas');
    cv.setAttribute('aria-hidden','true');
    cv.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    document.body.appendChild(cv);
    var ctx=cv.getContext('2d');
    var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var vw=0,vh=0,dpr=1,dots=[],mouse=null,lastH=0,frameN=0;
    var acc=[249,38,28],ink=[42,13,9],bgc=[255,253,252];
    function hex(c,d){c=(c||'').trim();return /^#[0-9a-f]{6}$/i.test(c)?[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]:d;}
    function readColors(){var cs=getComputedStyle(document.documentElement);acc=hex(cs.getPropertyValue('--t-accent'),acc);ink=hex(cs.getPropertyValue('--t-ink'),ink);bgc=hex(cs.getPropertyValue('--t-bg'),bgc);}
    function resize(){vw=innerWidth;vh=innerHeight;dpr=Math.min(2,devicePixelRatio||1);cv.width=Math.round(vw*dpr);cv.height=Math.round(vh*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
    function sm(a,b,x){var t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}
    function build(){
      var seed=41;function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}
      var small=innerWidth<768,k=small?0.3:0.5,sy=scrollY;dots=[];
      var excl=[];
      document.querySelectorAll('.about-main h1, .about-main p, .about-main a, .about-portrait-col, .about-contact, section h2, section h3, section p, article, footer span, footer a, .about-hello').forEach(function(el){var r=el.getBoundingClientRect();if(r.width)excl.push([r.left-12,r.top+sy-12,r.right+12,r.bottom+sy+12]);});
      function inEx(x,y){for(var q=0;q<excl.length;q++){var e=excl[q];if(x>e[0]&&x<e[2]&&y>e[1]&&y<e[3])return true;}return false;}
      function add(cx,cy,n,spread,ang,elong){
        n=Math.round(n*k);
        for(var i=0;i<n;i++){
          var u=Math.max(0.0001,rnd()),rr=spread*Math.sqrt(-2*Math.log(u))*0.5,a=rnd()*6.2832;
          var dx=Math.cos(a)*rr,dy=Math.sin(a)*rr;
          if(elong){var ca=Math.cos(ang),sa=Math.sin(ang),al=dx*elong,pe=dy*0.35;dx=al*ca-pe*sa;dy=al*sa+pe*ca;}
          var x=cx+dx,y=cy+dy; if(y<0)continue; if(inEx(x,y))continue;
          var q=rnd();
          dots.push({x:x,y:y,r:0.9+rnd()*1.5,a:0.36+rnd()*0.34,tone:q<0.62?0:(q<0.88?1:2),ph:rnd()*6.28,k:(rnd()-0.5)*0.16});
        }
      }
      function abs(el){var r=el.getBoundingClientRect();return{l:r.left,t:r.top+sy,r:r.right,b:r.bottom+sy,w:r.width,h:r.height};}
      var por=document.querySelector('.about-portrait-col');
      if(por){var r=abs(por);add(r.r+10,r.t+r.h*0.15,40,80,-0.5,1.8);add(r.l-10,r.b-r.h*0.1,34,70,2.6,1.7);add(r.l+r.w*0.5,r.b+26,22,70,0,2.4);}
      var h1=document.querySelector('.about-main h1');
      if(h1){var r1=abs(h1);add(Math.min(innerWidth-30,r1.r+30),r1.t+r1.h*0.4,26,90,0,2.5);add(r1.l+r1.w*0.4,r1.t-24,18,70,0,2.6);}
      var ct=document.querySelector('.about-contact');
      if(ct){var r2=abs(ct);add(Math.min(innerWidth-24,r2.r+30),r2.t+r2.h*0.3,24,80,-0.3,2.2);}
      var h2=document.querySelector('section h2');
      if(h2){var r3=abs(h2);add(Math.min(innerWidth-40,r3.r+60),r3.t+r3.h*0.5,28,100,0,2.6);}
      document.querySelectorAll('section article').forEach(function(a){var r4=abs(a);add(r4.l+r4.w*(0.3+rnd()*0.5),r4.t-26,18,60,0,2.6);});
      var ft=document.querySelector('footer');
      if(ft){var r5=abs(ft);add(r5.l+r5.w*0.3,r5.t-30,26,100,0.2,2.4);add(r5.l+r5.w*0.75,r5.t+10,22,90,-0.2,2.4);}
      var H2=document.documentElement.scrollHeight;
      for(var i2=0;i2<Math.round(24*k);i2++)add(rnd()<0.5?14+rnd()*50:innerWidth-14-rnd()*50,rnd()*H2,3,30,0,0);
      lastH=H2;
    }
    function frame(now,force){
      if(!force)requestAnimationFrame(frame);
      if(document.hidden&&!force)return;
      var t=reduce?0:now/1000,sy=scrollY;
      ctx.clearRect(0,0,vw,vh);
      var cols=[acc,[acc[0]*0.55+bgc[0]*0.45,acc[1]*0.55+bgc[1]*0.45,acc[2]*0.55+bgc[2]*0.45],ink],base=[1,0.95,0.4],bk=[[],[],[]];
      for(var i=0;i<dots.length;i++){
        var d=dots[i],y=d.y-sy; if(y<-60||y>vh+60)continue;
        y+=(y-vh/2)*d.k;
        var x=d.x+Math.sin(t*0.3+d.ph)*3,yy=y+Math.cos(t*0.25+d.ph*1.3)*3,al=d.a;
        if(mouse&&!reduce){var dx=x-mouse.x,dy=yy-mouse.y,dd=Math.hypot(dx,dy);if(dd<110){var f=Math.pow(1-dd/110,2);x+=(dx/(dd||1))*f*16;yy+=(dy/(dd||1))*f*16;al+=f*0.22;}}
        var edge=Math.min(yy+20,vh+20-yy)/90;al*=Math.max(0,Math.min(1,edge));
        if(al<=0.01)continue;
        bk[d.tone].push(x,yy,d.r,Math.min(0.85,al)*base[d.tone]);
      }
      for(var tn=0;tn<3;tn++){
        var arr=bk[tn];if(!arr.length)continue;var c=cols[tn];
        for(var b=0;b<4;b++){
          var lo=b*0.2,hi=lo+0.2;
          ctx.fillStyle='rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+(lo+0.1).toFixed(2)+')';
          ctx.beginPath();var any=false;
          for(var q=0;q<arr.length;q+=4){var a2=arr[q+3];if(a2>=lo&&(a2<hi||b===3)){ctx.moveTo(arr[q]+arr[q+2],arr[q+1]);ctx.arc(arr[q],arr[q+1],arr[q+2],0,6.2832);any=true;}}
          if(any)ctx.fill();
        }
      }
      if(frameN++%40===0){readColors();var H2=document.documentElement.scrollHeight;if(Math.abs(H2-lastH)>40)build();}
    }
    addEventListener('mousemove',function(e){mouse={x:e.clientX,y:e.clientY};},{passive:true});
    document.addEventListener('mouseleave',function(){mouse=null;});
    var rt;addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){resize();build();},160);});
    readColors();resize();
    setTimeout(function(){build();requestAnimationFrame(frame);},500);
  }
  if(document.readyState==='complete')setTimeout(boot,300);else addEventListener('load',function(){setTimeout(boot,300);},{once:true});
})();
