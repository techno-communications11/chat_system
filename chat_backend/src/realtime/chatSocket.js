import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import serverConfig from "../config/server.config.js";

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
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    socket.on("join:conversation", (chatId) => {
      if (chatId) {
        socket.join(`conversation:${String(chatId)}`);
      }
    });

    socket.on("leave:conversation", (chatId) => {
      if (chatId) {
        socket.leave(`conversation:${String(chatId)}`);
      }
    });
  });

  return io;
};

export const getChatSocket = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
};

export const emitToConversation = (chatId, event, payload) => {
  if (!io || !chatId) return;
  io.to(`conversation:${String(chatId)}`).emit(event, payload);
};

export const broadcastPresenceUpdate = (payload) => {
  if (!io) return;
  io.emit("presence:update", payload);
};

export const broadcastAvatarUpdate = (payload) => {
  if (!io) return;
  io.emit("avatar:update", payload);
};

export const notifyConversationMessage = async ({
  conversationId,
  message,
  participantUserIds = [],
}) => {
  const payload = {
    chatId: String(conversationId),
    message,
  };

  emitToConversation(conversationId, "message:new", payload);

  for (const userId of participantUserIds) {
    emitToUser(userId, "message:new", payload);
  }
};
