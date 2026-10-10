// Service worker minimal: hanya memenuhi syarat instalasi PWA (punya fetch handler).
// Tidak melakukan caching apa pun supaya data dan versi aplikasi selalu diambil langsung dari jaringan.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
