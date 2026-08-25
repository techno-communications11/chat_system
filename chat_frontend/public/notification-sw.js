self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => "focus" in item);
      const url = event.notification.data?.url || "/";
      if (client) {
        return client.focus().then(() => {
          if (!event.notification.data?.preserveCall) return client.navigate?.(url);
          return undefined;
        });
      }
      if (event.notification.data?.preserveCall) return undefined;
      return self.clients.openWindow(url);
    }),
  );
});
