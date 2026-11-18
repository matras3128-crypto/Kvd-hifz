/* /sw.js — положить в КОРЕНЬ сайта рядом с index.html */

const ICON = "/logo.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (err) { d = { title: "Журнал хифза", body: event.data ? event.data.text() : "Новое событие" }; }

  const kind = d.kind || "info";
  const opts = {
    body: d.body || "",
    icon: d.icon || ICON,
    badge: d.badge || ICON,
    tag: d.tag || "hifz-" + kind,
    renotify: d.renotify !== false,
    timestamp: Date.now(),
    vibrate: kind === "chat" ? [70, 45, 70] : [110, 60, 110],
    requireInteraction: kind === "request",
    silent: false,
    data: { url: d.url || "/", kind: kind, id: d.id || null },
    actions: d.actions || [{ action: "open", title: "Открыть" }, { action: "close", title: "Скрыть" }]
  };
  if (d.image) opts.image = d.image;

  event.waitUntil((async () => {
    await self.registration.showNotification(d.title || "Журнал хифза", opts);
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    list.forEach((c) => c.postMessage({ type: "hifz-push", payload: d }));
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;
  const target = (event.notification.data && event.notification.data.url) || "/";
  const abs = new URL(target, self.location.origin).href;

  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of list) {
      if (c.url.startsWith(self.location.origin) && "focus" in c) {
        await c.focus();
        c.postMessage({ type: "hifz-open", url: abs, data: event.notification.data });
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(abs);
  })());
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    try {
      const old = event.oldSubscription;
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: old ? old.options.applicationServerKey : undefined
      });
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      list.forEach((c) => c.postMessage({ type: "hifz-resub", sub: sub.toJSON() }));
    } catch (err) {}
  })());
});

self.addEventListener("message", (event) => {
  const m = event.data || {};
  if (m.type === "hifz-test") {
    self.registration.showNotification(m.title || "Проверка уведомлений", {
      body: m.body || "Push работает. Так будут приходить сообщения чата и заявки.",
      icon: ICON, badge: ICON, tag: "hifz-test",
      vibrate: [70, 45, 70],
      data: { url: "/", kind: "test" },
      actions: [{ action: "open", title: "Открыть" }]
    });
  }
  if (m.type === "hifz-skip-waiting") self.skipWaiting();
});
