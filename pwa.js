(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var btn = document.getElementById('install-app');
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    if (btn && !standalone) btn.hidden = false;
  });
  if (btn) {
    btn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () { deferredPrompt = null; btn.hidden = true; });
    });
  }
  window.addEventListener('appinstalled', function () { if (btn) btn.hidden = true; deferredPrompt = null; });

  var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  var hint = document.getElementById('ios-install-hint');
  if (isIOS && !standalone && hint && localStorage.getItem('iosInstallHintDismissed') !== '1') hint.hidden = false;
  var hintClose = document.getElementById('ios-install-hint-close');
  if (hintClose) hintClose.addEventListener('click', function () {
    hint.hidden = true;
    try { localStorage.setItem('iosInstallHintDismissed', '1'); } catch (e) {}
  });
})();
