const NOTIFICATIONS_ENABLED_KEY = "chat_notifications_enabled";
let notificationAudioContext;

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

export const getNotificationSupport = () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "granted";
  return "default";
};

export const showChatNotification = ({
  title,
  body,
  icon,
  tag,
  onClick,
  url,
  requireInteraction = false,
}) => {
  if (!("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;
  if (!areChatNotificationsEnabled()) return null;

  const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobileBrowser && "serviceWorker" in navigator) {
    return navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title || "New message", {
        body: body || "",
        icon: icon || undefined,
        tag: tag || undefined,
        renotify: true,
        requireInteraction,
        data: { url: url || "/" },
        silent: false,
        vibrate: [120, 60, 120],
      }))
      .catch(() => null);
  }

  const notification = new Notification(title || "New message", {
    body: body || "",
    icon: icon || undefined,
    tag: tag || undefined,
    renotify: true,
    requireInteraction,
    data: { url: url || "/" },
    silent: false,
    vibrate: [120, 60, 120],
  });

  notification.onclick = () => {
    window.focus();
    onClick?.();
    notification.close();
  };

  return notification;
};

export const playMessageNotificationSound = () => {
  if (!areChatNotificationsEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    notificationAudioContext ||= new AudioContextClass();
    const context = notificationAudioContext;
    context.resume().catch(() => {});
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, start);
    oscillator.frequency.exponentialRampToValueAtTime(660, start + 0.12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  } catch {
    // Notification audio is best-effort and may be blocked by the browser.
  }
};

export const playCallNotificationSound = () => {
  if (!areChatNotificationsEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    notificationAudioContext ||= new AudioContextClass();
    const context = notificationAudioContext;
    context.resume().catch(() => {});

    [0, 0.28, 0.56].forEach((offset) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + offset;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1046, start);
      oscillator.frequency.exponentialRampToValueAtTime(784, start + 0.18);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
    });
  } catch {
    // Notification audio is best-effort and may be blocked by the browser.
  }
};
