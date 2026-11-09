const CACHE = 'bulk-log-shell-v10';
const EXERCISE_IDS = ['db-bench-press', 'bench-press', 'machine-chest-fly', 'db-fly', 'machine-reverse-fly', 'lat-pulldown', 'seated-cable-row', 'wide-grip-seated-cable-row', 'hammer-curl', 'bicep-curl', 'incline-db-curl', 'machine-preacher-curl', 'machine-shoulder-press', 'lateral-raise', 'tricep-pushdown'];
const MUSCLE_IDS = ['chest', 'lats', 'rhomboid', 'biceps', 'brachialis', 'deltoids', 'triceps'];
const ASSETS = ['./', './index.html', './styles.css', './exercise-library.js', './app.js', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', ...EXERCISE_IDS.map(id => `./assets/exercises/${id}-illustration.webp`), ...MUSCLE_IDS.map(id => `./assets/muscles/${id}.png`)];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('bulk-log-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
