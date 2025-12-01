self.addEventListener('install', (event) => {
    // console.log('Service Worker installing.');
    // Perform install steps
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // console.log('Service Worker activating.');
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // console.log('Service Worker fetching.', event.request.url);
    // Simple pass-through fetch
    event.respondWith(fetch(event.request));
});
