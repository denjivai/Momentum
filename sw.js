const CACHE = 'momentum-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add('./')).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Cache-first with background revalidate for the app shell and assets, so the
// app opens instantly even when the Mac is unreachable. /api is never cached —
// sync always talks to the live server.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request)
      const revalidate = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone())
          return res
        })
        .catch(() => undefined)
      if (cached) {
        e.waitUntil(revalidate)
        return cached
      }
      const fresh = await revalidate
      return fresh || (await cache.match('./')) || Response.error()
    }),
  )
})
