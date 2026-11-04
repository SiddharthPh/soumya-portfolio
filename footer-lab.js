/* Footer lab. A receipt printer that prints this visit every time the footer comes into view, and four hotkeys.
   The printer is a plain JS port of the Receipt Printer experiment by dqnamo, https://www.dqnamo.com/experiments/receipt-printer
   It keeps the three stages, the stepped paper feed (same keyframes and timing) and the torn edge.
   Reads the visit log written by visit-log.js. Nothing leaves the browser. */
(function () {
  if (window.__footerLab) return; window.__footerLab = true;

  /* ---------- copy, change freely ---------- */
  var COPY = {
    processing: 'Reading your visit',
    printing: 'Printing your receipt',
    complete: 'Thanks for stopping by',
    name: 'Soumya Krishnaraj',
    tagline: 'Designer who builds',
    total: 'One hello',
    thanks: 'Thank you for visiting',
    hint: 'Press a key, or click one',
    version: 'v4.2',               // bump when something meaningful ships
  };
  var LINKS = {
    email: 'soumya.krishnaraj@gmail.com',
    phone: '+1 (929) 346 8337',
    linkedin: 'https://www.linkedin.com/in/soumya-krishnaraj/',
    resume: '',                     // add the resume link here, R shows a note until then
    about: 'About.dc.html',
  };
  var PAGES = [['Checklist Builder.dc.html', 'Question builder'], ['Side Navigation.dc.html', 'Side navigation'], ['Org Structures.dc.html', 'Org structures'], ['About.dc.html', 'About']];
  var EXTRA = [['Misinformation Guidebook.dc.html', 'Misinformation guidebook'], ['Being watched while you work.dc.html', 'Being watched at work'], ['Archive.dc.html', 'Archive'], ['Sandbox.dc.html', 'Sandbox']];   // listed only once opened

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noise = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";
  // the torn edge, 40 teeth 4px deep, same as the original
  var teeth = []; for (var i = 0; i < 80; i++) teeth.push((100 - ((i + 1) * 100) / 80) + '% ' + (i % 2 === 0 ? '100%' : 'calc(100% - 4px)'));
  var clip = 'polygon(0 0, 100% 0, 100% calc(100% - 4px), ' + teeth.join(', ') + ')';
  // the stepped feed, same transforms and times as the original
  var T = ['calc(-100% + 2px)', '-91%', '-91%', '-81%', '-81%', '-70%', '-70%', '-58%', '-58%', '-45%', '-45%', '-32%', '-32%', '-20%', '-20%', '-10%', '-10%', '-3%', '-3%', '0%'];
  var K = [0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6, 0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1];
  var feed = K.map(function (k, i) { return (k * 100).toFixed(1) + '%{transform:translateY(' + T[i] + ')}'; }).join('');

  var css = document.createElement('style');
  css.textContent = [
    '.labf-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:clamp(40px,6vw,96px);align-items:start;}',
    '.labf-left{display:flex;flex-direction:column;gap:44px;min-width:0;}',
    '@media (max-width:860px){.labf-grid{grid-template-columns:minmax(0,1fr);} #labf-printer{justify-self:center;width:100%;max-width:380px;}}',
    /* keys */
    '.lk-hint{font-family:"Instrument Sans",system-ui,sans-serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted,var(--t-muted));margin-bottom:16px;}',
    '.lk-plate{display:inline-flex;gap:16px;padding:0 0 10px;}',
    '.lk{all:unset;cursor:pointer;display:block;-webkit-tap-highlight-color:transparent;}',
    '.lk-cap{position:relative;display:block;width:84px;height:84px;border-radius:13px;background:#e8e2d9;box-shadow:0 5px 0 #b9b0a4,0 8px 12px rgba(40,30,20,.22);transition:transform .07s ease,box-shadow .07s ease;}',
    '.lk-top{position:absolute;left:7px;right:7px;top:4px;bottom:11px;border-radius:9px;background:linear-gradient(180deg,#fdfbf8,#eee9e2);box-shadow:inset 0 1px 0 #fff,inset 0 -3px 4px rgba(40,30,20,.07);display:flex;flex-direction:column;justify-content:space-between;padding:8px 9px 7px;box-sizing:border-box;}',
    '.lk kbd{font:500 19px/1 "Instrument Sans",system-ui,sans-serif;color:#2b2724;transition:color .15s ease;}',
    '.lk small{font:600 9px/1.1 "Instrument Sans",system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8d8479;}',
    '.lk.accent .lk-cap{background:#d9261b;box-shadow:0 5px 0 #9c170f,0 8px 12px rgba(120,20,10,.3);}',
    '.lk.accent .lk-top{background:linear-gradient(180deg,#ff5a4c,#ec3123);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -3px 4px rgba(90,10,5,.18);}',
    '.lk.accent kbd,.lk.accent small{color:#fff;}',
    '.lk:hover kbd{color:var(--accent,var(--t-accent));} .lk.accent:hover kbd{color:#fff;}',
    '.lk.down .lk-cap,.lk:active .lk-cap{transform:translateY(4px);box-shadow:0 1px 0 #b9b0a4,0 2px 4px rgba(40,30,20,.2);}',
    '.lk.accent.down .lk-cap,.lk.accent:active .lk-cap{box-shadow:0 1px 0 #9c170f,0 2px 4px rgba(120,20,10,.25);}',
    '.lk:focus-visible .lk-cap{outline:2px solid var(--accent,var(--t-accent));outline-offset:4px;}',
    '@media (max-width:480px){.lk-cap{width:68px;height:68px;} .lk-plate{gap:10px;}}',
    '.lk-alt{margin:22px 0 0;font-size:15px;color:var(--muted,var(--t-muted));display:flex;gap:18px;flex-wrap:wrap;}',
    '.lk-alt a{color:inherit;border-bottom:1px solid currentColor;}',
    '.lk-toast{display:inline-block;margin-top:16px;padding:8px 14px;border-radius:999px;background:var(--fg,var(--t-ink));color:var(--t-bg,#fffdfc);font-size:13px;opacity:0;transform:translateY(6px);transition:opacity .25s ease,transform .25s ease;}',
    '.lk-toast.on{opacity:1;transform:none;}',
    /* printer */
    '.rp{position:relative;isolation:isolate;width:100%;display:flex;flex-direction:column;align-items:center;}',
    '.rp-machine{position:relative;isolation:isolate;width:100%;box-sizing:border-box;border-radius:24px;padding:12px 12px 32px;background:#2b2a28;border:1px solid #1b1a19;box-shadow:0 20px 36px -20px rgba(20,18,16,.55),0 6px 14px -8px rgba(20,18,16,.24),inset 0 1px 0 rgba(255,255,255,.14),inset 0 -1px 0 rgba(0,0,0,.55);}',
    '.rp-machine::before{content:"";position:absolute;inset:0;border-radius:inherit;background-image:' + noise + ';background-size:160px;opacity:.18;mix-blend-mode:overlay;pointer-events:none;}',
    '.rp-head{position:relative;display:flex;justify-content:space-between;align-items:center;height:30px;padding:0 6px 10px;font:600 11px/1 "Instrument Sans",system-ui,sans-serif;letter-spacing:.16em;color:#8f8a83;}',
    '.rp-led{width:7px;height:7px;border-radius:50%;background:#4a463f;box-shadow:inset 0 1px 1px rgba(0,0,0,.5);}',
    '.rp[data-stage="processing"] .rp-led,.rp[data-stage="printing"] .rp-led{background:#f0a23a;box-shadow:0 0 8px #f0a23a;}',
    '.rp[data-stage="complete"] .rp-led{background:#5cc27a;box-shadow:0 0 8px #5cc27a;}',
    '.rp-screen{position:relative;display:flex;align-items:center;gap:10px;height:46px;padding:0 14px;border-radius:12px;background:#121211;color:#e9e6df;box-shadow:inset 0 0 24px 4px rgba(0,0,0,.52);font:500 13px/1 "Instrument Sans",system-ui,sans-serif;}',
    '.rp-ic{width:16px;height:16px;flex:none;display:grid;place-items:center;}',
    '.rp-spin{width:14px;height:14px;border-radius:50%;border:2px solid #6b665e;border-top-color:#e9e6df;animation:rpSpin .8s linear infinite;}',
    '@keyframes rpSpin{to{transform:rotate(360deg);}}',
    '.rp-status{transition:opacity .18s cubic-bezier(.23,1,.32,1),transform .18s cubic-bezier(.23,1,.32,1);}',
    '.rp-status.swap{opacity:0;transform:translateY(4px);}',
    '.rp-slot{position:absolute;left:24px;right:24px;bottom:12px;height:8px;border-radius:4px;background:#0b0b0b;box-shadow:inset 0 2px 3px #000;z-index:4;}',
    '.rp-out{position:relative;z-index:5;margin-top:-16px;height:30rem;width:calc(80% + 3rem);max-width:100%;overflow:hidden;padding:0 24px;box-sizing:border-box;}',
    '.rp-shade{position:absolute;left:24px;right:24px;top:-4px;height:8px;background:rgba(11,11,11,.75);filter:blur(6px);z-index:2;pointer-events:none;opacity:0;}',
    '.rp:not([data-stage="idle"]):not([data-stage="processing"]) .rp-shade{opacity:1;}',
    '.rp-feed{position:relative;transform:translateY(calc(-100% + 2px));opacity:0;filter:drop-shadow(0 16px 18px rgba(40,30,20,.16)) drop-shadow(0 3px 4px rgba(40,30,20,.12));}',
    '.rp[data-stage="printing"] .rp-feed{opacity:1;animation:rpFeed 1.75s linear both;}',
    '.rp[data-stage="complete"] .rp-feed{opacity:1;transform:none;}',
    '@keyframes rpFeed{' + feed + '}',
    '.rp-paper{position:relative;box-sizing:border-box;min-height:20rem;padding:26px 22px 30px;background:#fbfaf6;background-image:' + noise + ';background-size:160px;background-blend-mode:soft-light;color:#2a2622;clip-path:' + clip + ';font:500 12px/1.75 "Instrument Sans",system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;font-variant-numeric:tabular-nums;}',
    '.rp-paper .c{text-align:center;} .rp-paper .big{font-size:15px;letter-spacing:.14em;font-weight:600;}',
    '.rp-paper .r{display:flex;justify-content:space-between;gap:12px;} .rp-paper .r span:last-child{text-align:right;}',
    '.rp-paper .m{color:#857c71;} .rp-paper hr{border:0;border-top:1px dashed #b9b1a6;margin:10px 0;}',
    '.rp-paper .tot{font-size:14px;font-weight:600;}',
    '.rp-bars{display:flex;justify-content:center;gap:2px;height:34px;margin:14px 0 4px;} .rp-bars i{display:block;background:#2a2622;}',
    '@media (prefers-reduced-motion:reduce){.rp-spin{animation:none;} .rp-feed{animation:none!important;}}',
  ].join('\n');
  document.head.appendChild(css);

  var $ = function (q, r) { return (r || document).querySelector(q); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var CHECK = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="#5cc27a"/><path d="m4.6 8.2 2.2 2.2 4.6-4.6" fill="none" stroke="#121211" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function receiptHTML() {
    var d = {}; try { d = JSON.parse(sessionStorage.getItem('skVisit') || '{}'); } catch (e) {}
    var pages = d.pages || {}, reels = d.reels || {}, now = new Date();
    var secs = Math.max(1, Math.round((Date.now() - (d.start || Date.now())) / 1000));
    var dur = secs < 60 ? secs + ' s' : Math.floor(secs / 60) + ' min ' + (secs % 60) + ' s';
    var clock = function (s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
    var rows = PAGES.concat(EXTRA.filter(function (p) { return pages[p[0]]; })).map(function (p) {
      var st = reels[p[0]] >= 3 ? 'Reel ' + clock(reels[p[0]]) : pages[p[0]] ? 'Read' : 'Not yet';
      return '<div class="r"><span>' + p[1] + '</span><span class="' + (st === 'Not yet' ? 'm' : '') + '">' + st + '</span></div>';
    }).join('');
    var seed = 7; var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var bars = ''; for (var i = 0; i < 34; i++) bars += '<i style="width:' + (1 + Math.round(rnd() * 3)) + 'px"></i>';
    return '<div class="c big">' + esc(COPY.name) + '</div><div class="c m">' + esc(COPY.tagline) + '</div>' +
      '<div class="c m">' + now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</div><hr>' +
      rows + '<div class="r"><span>Time on site</span><span>' + dur + '</span></div><hr>' +
      '<div class="r tot"><span>Total</span><span>' + esc(COPY.total) + '</span></div><hr>' +
      '<div class="c">' + esc(COPY.thanks) + '</div><div class="rp-bars" aria-hidden="true">' + bars + '</div><div class="c m">' + esc(COPY.version) + '</div>';
  }

  function buildPrinter(host) {
    host.innerHTML = '<section class="rp" aria-label="Receipt of your visit" data-stage="idle"><div class="rp-machine"><div class="rp-head"><span>SK · 01</span><span class="rp-led"></span></div>' +
      '<div class="rp-screen"><span class="rp-ic"></span><span class="rp-status" role="status" aria-live="polite"></span></div><div class="rp-slot" aria-hidden="true"></div></div>' +
      '<div class="rp-out"><div class="rp-shade" aria-hidden="true"></div><div class="rp-feed"><article class="rp-paper"></article></div></div></section>';
    var rp = $('.rp', host), status = $('.rp-status', host), ic = $('.rp-ic', host), paper = $('.rp-paper', host), timers = [];
    var setStage = function (s) {
      rp.dataset.stage = s; ic.innerHTML = s === 'complete' ? CHECK : s === 'idle' ? '' : '<span class="rp-spin"></span>';
      var label = COPY[s] || ''; if (s === 'idle') { status.textContent = ''; return; }
      status.classList.add('swap'); setTimeout(function () { status.textContent = label; status.classList.remove('swap'); }, reduce ? 0 : 140);
    };
    var print = function () {
      timers.forEach(clearTimeout); timers = [];
      paper.innerHTML = receiptHTML();
      if (reduce) { setStage('complete'); return; }
      setStage('processing');
      timers.push(setTimeout(function () { setStage('printing'); }, 900));
      timers.push(setTimeout(function () { setStage('complete'); }, 900 + 1750));
    };
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) print(); else { timers.forEach(clearTimeout); setStage('idle'); } });
    }, { threshold: 0.35 });
    io.observe(rp);
  }

  function buildKeys(host) {
    var KEYS = [['e', 'Copy email'], ['l', 'LinkedIn'], ['r', 'Resume'], ['a', 'About']];
    host.innerHTML = '<div class="lk-hint">' + esc(COPY.hint) + '</div><div class="lk-plate">' + KEYS.map(function (k) {
      return '<button type="button" class="lk' + (k[0] === 'e' ? ' accent' : '') + '" data-k="' + k[0] + '" aria-label="' + k[1] + '" aria-keyshortcuts="' + k[0].toUpperCase() + '"><span class="lk-cap"><span class="lk-top"><kbd>' + k[0].toUpperCase() + '</kbd><small>' + k[1] + '</small></span></span></button>';
    }).join('') + '</div><p class="lk-alt"><a href="mailto:' + LINKS.email + '">' + LINKS.email + '</a><a href="tel:' + LINKS.phone.replace(/[^+\d]/g, '') + '">' + LINKS.phone + '</a></p><div class="lk-toast" role="status" aria-live="polite"></div>';
    var toast = $('.lk-toast', host), tt;
    var say = function (m) { toast.textContent = m; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 2200); };
    var act = function (k) {
      var b = $('.lk[data-k="' + k + '"]', host); if (b) { b.classList.add('down'); setTimeout(function () { b.classList.remove('down'); }, 160); }
      if (k === 'e') { (navigator.clipboard ? navigator.clipboard.writeText(LINKS.email) : Promise.reject()).then(function () { say('Email copied'); }, function () { say(LINKS.email); }); }
      else if (k === 'l') window.open(LINKS.linkedin, '_blank', 'noopener');
      else if (k === 'r') { if (LINKS.resume) window.open(LINKS.resume, '_blank', 'noopener'); else say('Resume on request, press E for my email'); }
      else if (k === 'a') setTimeout(function () { location.href = LINKS.about; }, 180);
    };
    host.addEventListener('click', function (e) { var b = e.target.closest('.lk'); if (b) act(b.dataset.k); });
    // keys only listen while the footer is on screen, so typing A elsewhere never navigates away
    var live = false; new IntersectionObserver(function (en) { live = en[0].isIntersecting; }, { threshold: 0.2 }).observe(host);
    addEventListener('keydown', function (e) {
      if (!live || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      var t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      var k = (e.key || '').toLowerCase(); if ('elra'.indexOf(k) > -1 && k.length === 1) { e.preventDefault(); act(k); }
    });
  }

  function boot() {
    var p = $('#labf-printer'), k = $('#labf-keys');
    // wait for the page runtime to render the footer, otherwise it copies this markup into its template without the behaviour
    if (!p || !k || !p.hasAttribute('data-dc-tpl')) return setTimeout(boot, 150);
    if (!p.__built) { p.__built = true; buildPrinter(p); }
    if (!k.__built) { k.__built = true; buildKeys(k); }
    var v = $('#labf-version'); if (v && !v.textContent) v.textContent = COPY.version;
    setTimeout(boot, 1500);   // React can render the footer again, rebuild into the fresh nodes
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
