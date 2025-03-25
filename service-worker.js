const CACHE_NAME = 'eco-warrior-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/EcoWarrior.css',
  '/EcoWarrior.js',
  '/adminIcon.png',
  '/guestIcon.png',
  '/logo.png',
  '/adminSelectL.css',
  '/adminSelectL.html',
  '/adminSelectL.js',
  '/adminDashboard.html',
  '/adminDashboard.js',
  '/adminDashboard.css',
  '/firebase_config.js',
  '/UserSelectR.css',
  '/UserSelectR.html',
  '/UserSelectR.js',
  '/UserContent.css',
  '/UserContent.html',
  '/UserContent.js',
];

// Install a service worker: Cache assets individually
self.addEventListener('install', event => {
  console.log('Service Worker: Install Event');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache:', CACHE_NAME);
      return Promise.all(
        urlsToCache.map(url => {
          return fetch(url).then(response => {
            if (!response.ok) {
              // Log the error so you know which resource failed
              throw new Error(`Request for ${url} failed with status ${response.status}`);
            }
            return cache.put(url, response);
          }).catch(error => {
            // Log each failed URL but continue installing
            console.error(`Failed to fetch and cache ${url}:`, error);
          });
        })
      );
    })
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If a cache is hit, return the response
        if (response) {
          return response;
        }
        // Otherwise, fetch the resource from the network
        return fetch(event.request);
      })
  );
});

// Update a service worker: Remove old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate Event');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting outdated cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
