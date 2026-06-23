const NOTIFICATIONS_ENABLED_KEY = "chat_notifications_enabled";

export const areChatNotificationsEnabled = () =>
  localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true";

export const setChatNotificationsEnabled = (enabled) => {
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
};

export const requestChatNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    setChatNotificationsEnabled(true);
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  const permission = await Notification.requestPermission();
  setChatNotificationsEnabled(permission === "granted");
  return permission;
};

export const showChatNotification = ({
  title,
  body,
  icon,
  tag,
  onClick,
}) => {
  if (!("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;
  if (!areChatNotificationsEnabled()) return null;

  const notification = new Notification(title || "New message", {
    body: body || "",
    icon: icon || undefined,
    tag: tag || undefined,
  });

  notification.onclick = () => {
    window.focus();
    onClick?.();
    notification.close();
  };

  return notification;
};
