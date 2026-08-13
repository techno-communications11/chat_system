import { useEffect, useRef } from "react";

export function ChatWidget({
  token,
  appName = "chat_system",
  chatUrl,
  mode = "fullpage",
  theme = "light",
  title = "Chat",
  onReady,
}) {
  const frameRef = useRef(null);
  const origin = new URL(chatUrl).origin;

  useEffect(() => {
    const onMessage = (event) => {
      if (
        event.origin !== origin ||
        event.source !== frameRef.current?.contentWindow
      )
        return;
      if (event.data?.type === "chat:ready") {
        frameRef.current.contentWindow.postMessage(
          { type: "chat:authenticate", token, appName },
          origin,
        );
      }
      if (event.data?.type === "chat:authenticated" && event.data.ok)
        onReady?.();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [appName, onReady, origin, token]);

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "chat:set-theme", theme },
      origin,
    );
  }, [origin, theme]);

  return (
    <iframe
      ref={frameRef}
      src={`${chatUrl.replace(/\/$/, "")}/chat-app?embed=${encodeURIComponent(mode)}`}
      title={title}
      allow="camera; microphone; clipboard-write"
      style={{ border: 0, width: "100%", height: "100%" }}
    />
  );
}

export default ChatWidget;
