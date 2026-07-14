import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getStoredAuthToken, getStoredChatAppName } from "../utils/authToken";

const getSocketUrl = () => import.meta.env.VITE_API_URL || "http://localhost:4701";

export function useChatRealtime({
  enabled = true,
  activeConversationId,
  onMessage,
  onMessageUpdated,
  onMessageRead,
  onReactionAdded,
  onPresence,
  onAvatar,
  onCallStarted,
  onCallRinging,
  onCallAccepted,
  onCallDeclined,
  onCallCancelled,
  onCallEnded,
  onCallMissed,
}) {
  const socketRef = useRef(null);
  const activeConversationIdRef = useRef(activeConversationId);
  const handlersRef = useRef({
    onMessage,
    onMessageUpdated,
    onMessageRead,
    onReactionAdded,
    onPresence,
    onAvatar,
    onCallStarted,
    onCallRinging,
    onCallAccepted,
    onCallDeclined,
    onCallCancelled,
    onCallEnded,
    onCallMissed,
  });

  handlersRef.current = {
    onMessage,
    onMessageUpdated,
    onMessageRead,
    onReactionAdded,
    onPresence,
    onAvatar,
    onCallStarted,
    onCallRinging,
    onCallAccepted,
    onCallDeclined,
    onCallCancelled,
    onCallEnded,
    onCallMissed,
  };
  activeConversationIdRef.current = activeConversationId;

  useEffect(() => {
    if (!enabled) return undefined;

    const token = getStoredAuthToken();
    if (!token) return undefined;

    const socket = io(getSocketUrl(), {
      auth: { token, appName: getStoredChatAppName() },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      const chatId = activeConversationIdRef.current;
      if (chatId) {
        socket.emit("join:conversation", String(chatId));
      }
    });

    socket.on("message:new", (payload) => {
      handlersRef.current.onMessage?.(payload);
    });

    socket.on("message:updated", (payload) => {
      handlersRef.current.onMessageUpdated?.(payload);
    });

    socket.on("message:read", (payload) => {
      handlersRef.current.onMessageRead?.(payload);
    });

    socket.on("reaction:added", (payload) => {
      handlersRef.current.onReactionAdded?.(payload);
    });

    socket.on("presence:update", (payload) => {
      handlersRef.current.onPresence?.(payload);
    });

    socket.on("avatar:update", (payload) => {
      handlersRef.current.onAvatar?.(payload);
    });

    socket.on("call:started", (payload) => {
      handlersRef.current.onCallStarted?.(payload);
    });

    socket.on("call:ringing", (payload) => handlersRef.current.onCallRinging?.(payload));
    socket.on("call:accepted", (payload) => handlersRef.current.onCallAccepted?.(payload));
    socket.on("call:declined", (payload) => handlersRef.current.onCallDeclined?.(payload));
    socket.on("call:cancelled", (payload) => handlersRef.current.onCallCancelled?.(payload));
    socket.on("call:missed", (payload) => handlersRef.current.onCallMissed?.(payload));

    socket.on("call:ended", (payload) => {
      handlersRef.current.onCallEnded?.(payload);
    });

    return () => {
      socket.off("connect");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeConversationId) return undefined;

    const chatId = String(activeConversationId);
    socket.emit("join:conversation", chatId);

    return () => {
      socket.emit("leave:conversation", chatId);
    };
  }, [activeConversationId, enabled]);
}
