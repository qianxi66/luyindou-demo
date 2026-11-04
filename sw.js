self.__VERSION="mw2ki3ti";self.__PRECACHE=["./","./start.html","./assets/main-D7DN_UsD.js","./assets/start-DtKl0lHd.js","./assets/modulepreload-polyfill-P2Xu9kJm.js","./assets/opus-decoder-BeLHPOFH.js","./assets/main-BWrL0X_8.css","./manifest.webmanifest?v=mw2ki3ti","./icons/icon-192.png?v=mw2ki3ti","./icons/icon-512.png?v=mw2ki3ti","./icons/apple-touch-icon.png?v=mw2ki3ti","./device.webp?v=mw2ki3ti"];
/* Service worker: offline app shell + Web Push.
 * `self.__PRECACHE` and `self.__VERSION` are injected at build time (vite.config.js). */

const VERSION = self.__VERSION || 'dev'
const CACHE = `luyindou-${VERSION}`
const PRECACHE = self.__PRECACHE || ['./', './index.html', './manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' })))).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('luyindou-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname === '/ws' || url.pathname === '/ca.crt' || url.pathname === '/setup') return

  if (req.mode === 'navigate') {
    // network first so updates arrive; cached shell when offline
    event.respondWith(
      // always revalidate pages (GitHub Pages lets browsers reuse them for 10 min)
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(async () =>
          (await caches.match(req, { ignoreSearch: true })) ||
          (await caches.match('./index.html')) ||
          caches.match('./'),
        ),
    )
    return
  }

  const store = (res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy))
    }
    return res
  }
  if (url.pathname.includes('/assets/')) {
    // hashed build files never change: cache first
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(store)))
    return
  }
  // icons, images, manifests: network first so a new icon or name shows up at once
  event.respondWith(fetch(req).then(store).catch(() => caches.match(req, { ignoreSearch: true })))
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('push', (event) => {
  let data = { title: 'VoiceBean', body: 'Something happened on your recorder' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    if (event.data) data.body = event.data.text()
  }
  // iOS revokes subscriptions whose pushes show nothing, so always notify.
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'luyindou',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { url: './' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus()
      return self.clients.openWindow('./')
    }),
  )
})
