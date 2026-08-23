self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => "focus" in item);
      const url = event.notification.data?.url || "/";
      if (client) {
        return client.focus().then(() => client.navigate?.(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
