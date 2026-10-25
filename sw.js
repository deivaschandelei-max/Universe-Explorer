/*
 * Service worker: makes the app work offline.
 *
 * Every file listed in PRECACHE is stored when this worker installs, and served
 * from the cache afterwards. The list and VERSION are written by
 * `node tools/stamp.mjs`. Run it before every deploy so phones pick up changes.
 */
'use strict';

/* STAMP:BEGIN */
var VERSION = '3c44a4d0fb';
var PRECACHE = [
  './',
  './css/style.css',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './index.html',
  './js/hero.js',
  './js/main.js',
  './js/modules.js',
  './js/orbits.js',
  './js/pwa.js',
  './js/stars.js',
  './js/storage.js',
  './js/ui.js',
  './js/version.js',
  './manifest.webmanifest'
];
/* STAMP:END */

var CACHE_PREFIX = 'universe-explorer-';
var CACHE_NAME = CACHE_PREFIX + VERSION;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(PRECACHE.map(function (url) {
        /* cache: 'reload' skips the browser's HTTP cache, which GitHub Pages fills for 10 minutes */
        return fetch(new Request(url, { cache: 'reload' })).then(function (response) {
          if (!response.ok) throw new Error(url + ' returned ' + response.status);
          return cache.put(url, response);
        });
      }));
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (key) {
          return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        }));
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* The page asks for this after the person taps "Reload" on the update message. */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fetch(request).catch(function () {
          if (request.mode === 'navigate') return cache.match('./');
          return Response.error();
        });
      });
    })
  );
});
