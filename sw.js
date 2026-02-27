self.addEventListener('install', (e)=> {
  e.waitUntil(
    caches.open('static-v2').then(c=>c.addAll([
      './',
      './index.html',
      './app.css',
      './app.js',
      './manifest.webmanifest',
      'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
    ]))
  );
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});