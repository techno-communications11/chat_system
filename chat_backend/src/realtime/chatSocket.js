import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import serverConfig from "../config/server.config.js";
import { normalizeAppName } from "../Servicess/applicationDirectory.services.js";

let io = null;

const getTokenFromSocket = (socket) =>
  socket.handshake.auth?.token ||
  socket.handshake.query?.token ||
  socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
  null;

export const initChatSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed`));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = getTokenFromSocket(socket);

      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }

      const decoded = jwt.verify(token, serverConfig.secretKey);
      socket.data.appName = normalizeAppName(
        socket.handshake.auth?.appName ||
          socket.handshake.query?.appName ||
          socket.handshake.headers?.["x-chat-app-name"] ||
          "chat_system",
      );
      socket.data.userId = String(
        decoded.id || decoded.userId || decoded.user_id || "",
      );
      socket.data.email = decoded.email || null;
      socket.data.displayName =
        decoded.name || decoded.displayName || decoded.username || null;

      if (!socket.data.userId) {
        next(new Error("Unauthorized"));
        return;
      }

      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const appName = socket.data.appName;
    const userId = socket.data.userId;
    socket.join(`app:${appName}:presence`);
    socket.join(`app:${appName}:user:${userId}`);

    socket.on("join:conversation", (chatId) => {
      if (chatId) {
        socket.join(`app:${appName}:conversation:${String(chatId)}`);
      }
    });

    socket.on("leave:conversation", (chatId) => {
      if (chatId) {
        socket.leave(`app:${appName}:conversation:${String(chatId)}`);
      }
    });
  });

  return io;
};

export const getChatSocket = () => io;

export const emitToUser = (appName, userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`app:${normalizeAppName(appName)}:user:${String(userId)}`).emit(event, payload);
};

export const emitToConversation = (appName, chatId, event, payload) => {
  if (!io || !chatId) return;
  io.to(`app:${normalizeAppName(appName)}:conversation:${String(chatId)}`).emit(event, payload);
};

export const broadcastPresenceUpdate = (payload) => {
  if (!io) return;
  io.to(`app:${normalizeAppName(payload?.appName)}:presence`).emit("presence:update", payload);
};

export const broadcastAvatarUpdate = (payload) => {
  if (!io) return;
  io.to(`app:${normalizeAppName(payload?.appName)}:presence`).emit("avatar:update", payload);
};

export const notifyConversationMessage = async ({
  appName = "chat_system",
  conversationId,
  message,
  participantUserIds = [],
}) => {
  const payload = {
    chatId: String(conversationId),
    message,
  };

  emitToConversation(appName, conversationId, "message:new", payload);

  for (const userId of participantUserIds) {
    emitToUser(appName, userId, "message:new", payload);
  }
};
