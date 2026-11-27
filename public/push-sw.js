self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* payload inválido */ }
  const title = String(data.title || 'AGUACOL · Mantenimiento')
  const body = String(data.body || 'Nueva solicitud de mantenimiento')
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
    ? data.url : '/'
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/Mantenimiento.ico',
    badge: '/Mantenimiento.ico',
    tag: String(data.tag || 'aguacol-notificacion'),
    data: { url },
    requireInteraction: Boolean(data.urgent)
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(url)
        return client.focus()
      }
    }
    return clients.openWindow(url)
  })())
})
