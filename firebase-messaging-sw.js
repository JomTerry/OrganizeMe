importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBWaw...your_apiKey...",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc",
  databaseURL: "https://jomterryy417-c0c-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notification = payload.notification || {};
  const title = notification.title || 'OrganizeMe';
  const options = {
    body: notification.body || '',
    icon: notification.icon || '/icon-192.png',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
