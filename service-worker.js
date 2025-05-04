const CACHE_NAME = 'eco-warrior-v1.4';
const urlsToCache = [
  '/',
  '/index.html',
  '/EcoWarrior.css',
  '/EcoWarrior.js',
  '/adminIcon.png',
  '/guestIcon.png',
  '/logo.png',
  '/bg.png',
  '/userbg.png',
  '/practicesbg.png',
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
  '/practiceManage.js',
  '/auditTrail.js',
  '/auditTrail.html',
  '/auditTrail.css',
];

// Install a service worker: Cache assets individually
self.addEventListener('install', event => {
  console.log('Service Worker: Install Event');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache:', CACHE_NAME);
      return Promise.all(
        urlsToCache.map(url =>
          fetch(url)
            .then(response => {
              if (!response.ok) {
                console.warn(`Failed to fetch ${url}: ${response.statusText}`);
                return null; // Skip caching this resource
              }
              return cache.put(url, response);
            })
            .catch(error => {
              console.error(`Failed to fetch and cache ${url}:`, error);
            })
        )
      );
    })
  );
});

// Cache and return requests with offline fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return; // Skip non-GET requests
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
          });
          return networkResponse;
        })
        .catch(error => {
          console.error('Fetch failed:', error);
          throw error;
        });
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
