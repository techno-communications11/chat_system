import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getStoredAuthToken } from "../utils/authToken";

const getSocketUrl = () => import.meta.env.VITE_API_URL || "http://localhost:4701";

export function useChatRealtime({
  enabled = true,
  activeConversationId,
  onMessage,
  onPresence,
  onAvatar,
}) {
  const socketRef = useRef(null);
  const handlersRef = useRef({ onMessage, onPresence, onAvatar });

  handlersRef.current = { onMessage, onPresence, onAvatar };

  useEffect(() => {
    if (!enabled) return undefined;

    const token = getStoredAuthToken();
    if (!token) return undefined;

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("message:new", (payload) => {
      handlersRef.current.onMessage?.(payload);
    });

    socket.on("presence:update", (payload) => {
      handlersRef.current.onPresence?.(payload);
    });

    socket.on("avatar:update", (payload) => {
      handlersRef.current.onAvatar?.(payload);
    });

    return () => {
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
