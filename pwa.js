/*
 * App-install and offline support.
 *  - registers the service worker and reports when an update is waiting
 *  - captures the browser's install prompt where one exists (Chrome, Edge, Android)
 *  - detects iPhone/iPad Safari, which has no prompt and needs manual steps
 */

export function isStandalone() {
  if (window.navigator.standalone === true) return true;
  return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}

export function isIOS() {
  var ua = window.navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  /* iPadOS 13+ reports itself as a Mac */
  return window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
}

export function registerServiceWorker(handlers) {
  if (!('serviceWorker' in navigator)) {
    handlers.onUnsupported();
    return;
  }

  var hadController = !!navigator.serviceWorker.controller;
  var reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    /* Reload once after the user accepts an update. A first install also fires this event; ignore it. */
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  function watch(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
      handlers.onUpdate(registration);
    }
    registration.addEventListener('updatefound', function () {
      var worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          handlers.onUpdate(registration);
        }
      });
    });
  }

  function start() {
    navigator.serviceWorker
      .register('sw.js')
      .then(function (registration) {
        watch(registration);
        /* Installed web apps stay open for days; look for updates whenever the app comes back. */
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) registration.update().catch(function () {});
        });
      })
      .catch(function () {
        handlers.onError();
      });
    navigator.serviceWorker.ready.then(function () {
      handlers.onReady();
    });
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
}

export function applyUpdate(registration) {
  if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/*
 * Returns { canPrompt(), prompt(), onChange(fn) }. The install button is useful when the
 * browser has offered a prompt, or on iOS Safari where we show manual steps instead.
 */
export function createInstaller() {
  var deferred = null;
  var listeners = [];

  function notify() {
    listeners.forEach(function (fn) {
      fn();
    });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferred = event;
    notify();
  });

  window.addEventListener('appinstalled', function () {
    deferred = null;
    notify();
  });

  return {
    available: function () {
      if (isStandalone()) return false;
      return !!deferred || isIOS();
    },
    hasNativePrompt: function () {
      return !!deferred;
    },
    prompt: function () {
      if (!deferred) return Promise.resolve('manual');
      var event = deferred;
      deferred = null;
      event.prompt();
      return event.userChoice.then(function (choice) {
        notify();
        return choice.outcome;
      });
    },
    onChange: function (fn) {
      listeners.push(fn);
    }
  };
}
