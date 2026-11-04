/* Visit log for the footer receipt. Pages opened and seconds of each show reel watched, kept in sessionStorage only.
   Nothing leaves the visitor's browser. */
(function () {
  if (window.__visitLog) return; window.__visitLog = true;
  var KEY = 'skVisit';
  var read = function () { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  var save = function (d) { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  var page = decodeURIComponent(location.pathname.split('/').pop() || 'Portfolio.dc.html');
  var d = read(); d.start = d.start || Date.now(); d.pages = d.pages || {}; d.reels = d.reels || {};
  d.pages[page] = (d.pages[page] || 0) + 1; save(d);
  var last = 0;
  document.addEventListener('timeupdate', function (e) {
    var v = e.target; if (!v || v.tagName !== 'VIDEO' || !/-reel\.mp4/.test(v.currentSrc || v.src || '')) return;
    if (document.hidden || Date.now() - last < 1000) return; last = Date.now();
    var x = read(); x.reels = x.reels || {}; x.reels[page] = Math.max(x.reels[page] || 0, Math.floor(v.currentTime)); save(x);
  }, true);
})();
