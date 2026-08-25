import { Server } from "socket.io";
import crypto from "crypto";
import { Op } from "sequelize";
import { verifyChatToken } from "../auth/chatAuth.js";
import ChatIdentity from "../modules/chatIdentity.module.js";
import ChatConversation from "../modules/chatConversation.module.js";
import ChatConversationParticipant from "../modules/chatConversationParticipant.module.js";
import ChatCall from "../modules/chatCall.module.js";

const activeCallStatuses = ["ringing", "connecting", "accepted"];
const maxSignalBytes = 256 * 1024;

let io = null;
const tenantRoom = (tenantId) =>
  crypto
    .createHash("sha256")
    .update(String(tenantId))
    .digest("hex")
    .slice(0, 32);
const room = (tenantId, suffix) => `tenant:${tenantRoom(tenantId)}:${suffix}`;

const resolveConversation = async ({ tenantId, conversationId }) => {
  const requestedId = String(conversationId || "");
  if (!requestedId) return null;

  return ChatConversation.findOne({
    where: {
      appName: tenantId,
      [Op.or]: [{ publicId: requestedId }, { id: requestedId }],
    },
    attributes: ["id", "publicId"],
  });
};

const getPublicConversationId = async (appName, conversationId) => {
  const conversation = await resolveConversation({
    tenantId: appName,
    conversationId,
  });
  return String(conversation?.publicId || conversationId);
};

const getTokenFromSocket = (socket) =>
  socket.handshake.auth?.token ||
  socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
  null;

const canAccessConversation = async ({ tenantId, userId, conversationId }) => {
  const identity = await ChatIdentity.findOne({
    where: {
      appName: tenantId,
      appUserId: String(userId),
      provider: "local_chat",
    },
  });
  if (!identity) return false;

  const conversation = await resolveConversation({ tenantId, conversationId });
  if (!conversation) return false;

  const membership = await ChatConversationParticipant.findOne({
    where: { conversationId: conversation.id, chatIdentityId: identity.id },
  });
  return Boolean(membership);
};

export const initChatSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    maxHttpBufferSize: 5 * 1024 * 1024,
    pingTimeout: 20_000,
    pingInterval: 25_000,
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

      const auth = verifyChatToken(token, {
        requestedApp:
          socket.handshake.auth?.appName ||
          socket.handshake.headers?.["x-chat-app-name"],
      });
      const decoded = auth.payload;
      socket.data.appName = auth.tenantId;
      socket.data.sourceApp = auth.sourceApp;
      socket.data.userId = auth.subject;
      socket.data.email =
        decoded.email ||
        decoded.userEmail ||
        decoded.user_email ||
        decoded.mail ||
        decoded.preferred_username ||
        null;
      socket.data.displayName =
        decoded.name ||
        decoded.displayName ||
        decoded.display_name ||
        decoded.username ||
        socket.data.email ||
        null;

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
    socket.join(room(appName, "presence"));
    socket.join(room(appName, `user:${userId}`));

    socket.on("join:conversation", async (chatId, acknowledge) => {
      try {
        const allowed =
          chatId &&
          (await canAccessConversation({
            tenantId: appName,
            userId,
            conversationId: String(chatId),
          }));
        if (!allowed) {
          acknowledge?.({ ok: false, code: "CHAT_CONVERSATION_FORBIDDEN" });
          return;
        }
        await socket.join(room(appName, `conversation:${String(chatId)}`));
        acknowledge?.({ ok: true });
      } catch {
        acknowledge?.({ ok: false, code: "CHAT_REALTIME_JOIN_FAILED" });
      }
    });

    socket.on("leave:conversation", (chatId) => {
      if (chatId) {
        socket.leave(room(appName, `conversation:${String(chatId)}`));
      }
    });

    socket.on("typing:update", async (payload = {}, acknowledge) => {
      try {
        const chatId = String(payload.chatId || "");
        const allowed =
          chatId &&
          (await canAccessConversation({
            tenantId: appName,
            userId,
            conversationId: chatId,
          }));
        if (!allowed) {
          acknowledge?.({ ok: false, code: "CHAT_CONVERSATION_FORBIDDEN" });
          return;
        }
        socket
          .to(room(appName, `conversation:${chatId}`))
          .emit("typing:update", {
            chatId,
            userId: String(userId),
            name: socket.data.displayName,
            typing: Boolean(payload.typing),
          });
        acknowledge?.({ ok: true });
      } catch {
        acknowledge?.({ ok: false, code: "CHAT_TYPING_FAILED" });
      }
    });

    socket.on("join:call", async (payload = {}, acknowledge) => {
      try {
        const chatId = String(payload.chatId || "");
        const callId = String(payload.callId || "");
        const allowed =
          chatId &&
          callId &&
          (await canAccessConversation({
            tenantId: appName,
            userId,
            conversationId: chatId,
          }));
        if (!allowed) {
          acknowledge?.({ ok: false, code: "CHAT_CONVERSATION_FORBIDDEN" });
          return;
        }

        const call = await ChatCall.findOne({
          where: {
            appName,
            conversationId: (await resolveConversation({
              tenantId: appName,
              conversationId: chatId,
            }))?.id,
            callId,
            status: activeCallStatuses,
          },
          attributes: ["callId"],
        });
        if (!call) {
          acknowledge?.({ ok: false, code: "CHAT_CALL_NOT_FOUND" });
          return;
        }

        const callRoom = room(appName, `call:${chatId}:${callId}`);
        const socketsBeforeJoin = await io.in(callRoom).fetchSockets();
        await socket.join(callRoom);
        socket.to(callRoom).emit("call:peer-joined", {
          chatId,
          callId,
          userId: String(userId),
          name: socket.data.displayName,
        });
        acknowledge?.({
          ok: true,
          peers: socketsBeforeJoin.map((peerSocket) => ({
            userId: String(peerSocket.data.userId),
            name: peerSocket.data.displayName,
          })),
        });
      } catch {
        acknowledge?.({ ok: false, code: "CHAT_CALL_JOIN_FAILED" });
      }
    });

    socket.on("leave:call", (payload = {}) => {
      const chatId = String(payload.chatId || "");
      const callId = String(payload.callId || "");
      if (!chatId || !callId) return;
      const callRoom = room(appName, `call:${chatId}:${callId}`);
      socket.to(callRoom).emit("call:peer-left", {
        chatId,
        callId,
        userId: String(userId),
      });
      socket.leave(callRoom);
    });

    socket.on("call:signal", async (payload = {}, acknowledge) => {
      try {
        const chatId = String(payload.chatId || "");
        const callId = String(payload.callId || "");
        const signal = payload.signal;
        const signalBytes = signal ? Buffer.byteLength(JSON.stringify(signal)) : 0;
        const allowed =
          chatId &&
          callId &&
          signal &&
          signalBytes <= maxSignalBytes &&
          (await canAccessConversation({
            tenantId: appName,
            userId,
            conversationId: chatId,
          }));
        if (!allowed) {
          acknowledge?.({ ok: false, code: "CHAT_CONVERSATION_FORBIDDEN" });
          return;
        }

        const conversation = await resolveConversation({
          tenantId: appName,
          conversationId: chatId,
        });
        const callRoom = room(appName, `call:${chatId}:${callId}`);
        const call = conversation
          ? await ChatCall.findOne({
              where: {
                appName,
                conversationId: conversation.id,
                callId,
                status: activeCallStatuses,
              },
              attributes: ["callId"],
            })
          : null;
        if (!call || !socket.rooms.has(callRoom)) {
          acknowledge?.({ ok: false, code: "CHAT_CALL_NOT_ACTIVE" });
          return;
        }

        socket
          .to(callRoom)
          .emit("call:signal", {
            chatId,
            callId,
            signal,
            fromUserId: String(userId),
            fromName: socket.data.displayName,
          });
        acknowledge?.({ ok: true, delivered: true });
      } catch {
        acknowledge?.({ ok: false, code: "CHAT_CALL_SIGNAL_FAILED" });
      }
    });
  });

  return io;
};

export const getChatSocket = () => io;

export const isUserConnected = async (appName, userId) => {
  if (!io || !userId) return false;
  const sockets = await io
    .in(room(appName, `user:${String(userId)}`))
    .fetchSockets();
  return sockets.length > 0;
};

export const emitToUser = (appName, userId, event, payload) => {
  if (!io || !userId) return;
  io.to(room(appName, `user:${String(userId)}`)).emit(event, payload);
};

export const emitToConversation = (appName, chatId, event, payload) => {
  if (!io || !chatId) return;
  io.to(room(appName, `conversation:${String(chatId)}`)).emit(event, payload);
};

export const notifyConversationMemberRemoved = async ({
  appName = "chat_system",
  conversationId,
  removedUser,
  removedBy,
  systemMessage,
}) => {
  const publicChatId = await getPublicConversationId(appName, conversationId);
  emitToConversation(appName, publicChatId, "conversation:member-removed", {
    chatId: publicChatId,
    removedUser,
    removedBy,
    systemMessage,
  });
};

export const broadcastPresenceUpdate = (payload) => {
  if (!io) return;
  io.to(room(payload?.appName, "presence")).emit("presence:update", payload);
};

export const broadcastAvatarUpdate = (payload) => {
  if (!io) return;
  io.to(room(payload?.appName, "presence")).emit("avatar:update", payload);
};

export const notifyConversationMessage = async ({
  appName = "chat_system",
  conversationId,
  message,
  participantUserIds = [],
}) => {
  const publicChatId = await getPublicConversationId(appName, conversationId);
  const payload = {
    chatId: publicChatId,
    message,
  };

  emitToConversation(appName, publicChatId, "message:new", payload);

  for (const userId of participantUserIds) {
    emitToUser(appName, userId, "message:new", payload);
  }
};

export const notifyConversationMessageUpdate = async ({
  appName = "chat_system",
  conversationId,
  message,
  participantUserIds = [],
}) => {
  const publicChatId = await getPublicConversationId(appName, conversationId);
  const payload = {
    chatId: publicChatId,
    message,
  };

  emitToConversation(appName, publicChatId, "message:updated", payload);

  for (const userId of participantUserIds) {
    emitToUser(appName, userId, "message:updated", payload);
  }
};

export const notifyConversationRead = async ({
  appName = "chat_system",
  conversationId,
  participantUserIds = [],
  userId,
  readAt,
  isDirect = false,
  readStates = [],
}) => {
  const publicChatId = await getPublicConversationId(appName, conversationId);
  const payload = {
    chatId: String(publicChatId),
    userId: String(userId),
    readAt,
    isDirect,
    readStates,
  };
  for (const participantUserId of participantUserIds) {
    emitToUser(appName, participantUserId, "message:read", payload);
  }
};

export const notifyMessageReaction = async ({
  appName = "chat_system",
  conversationId,
  targetUserId,
  reaction,
  message,
}) => {
  const publicChatId = await getPublicConversationId(appName, conversationId);
  emitToUser(appName, targetUserId, "reaction:added", {
    chatId: publicChatId,
    reaction,
    message,
  });
};

export const notifyConversationCall = async ({
  appName = "chat_system",
  conversationId,
  call,
  participantUserIds = [],
  event = "call:started",
}) => {
  const publicChatId = await getPublicConversationId(appName, conversationId);
  const payload = {
    chatId: publicChatId,
    call: call
      ? { ...call, chatId: publicChatId, chat_id: publicChatId }
      : call,
  };

  // Participant user rooms reach callers even when that conversation is not
  // currently open, and avoid duplicate delivery to sockets already in its room.
  for (const userId of participantUserIds) {
    emitToUser(appName, userId, event, payload);
  }
};
