// Service Worker for SyncTune - Background Notifications & Native Quick Replies
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If user clicked the inline Reply action in Windows/Chrome notification
  if (event.action === 'reply' && event.reply) {
    const replyText = event.reply;
    const { senderUsername } = event.notification.data || {};
    const content = senderUsername ? `@${senderUsername} ${replyText}` : replyText;

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'NOTIFICATION_REPLY',
            content,
          });
        }
      })
    );
    return;
  }

  // If clicked elsewhere on notification, bring window to focus
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
