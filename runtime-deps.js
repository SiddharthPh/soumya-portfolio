(function () {
  var base = document.currentScript.src;
  var resources = window.__resources || (window.__resources = {});
  resources['https://unpkg.com/react@18.3.1/umd/react.production.min.js'] =
    new URL('./vendor/react.production.min.js', base).href;
  resources['https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'] =
    new URL('./vendor/react-dom.production.min.js', base).href;
})();
