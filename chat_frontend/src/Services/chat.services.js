import api from "../api/axiosInstance";
import { getStoredChatAppName, getTokenEmail } from "../utils/authToken";

const getChatHeaders = () => ({
  headers: {
    "x-chat-app-name": getStoredChatAppName(),
  },
});

const withPersonEmail = (params = {}) => {
  const email = getTokenEmail();
  return email ? { ...params, email } : params;
};

export const loginChatService = (payload) =>
  api.post("/chat-service/auth/login", payload);

export const getChatStatusService = () => api.get("/chat-service/me", getChatHeaders());

export const updateChatStatusService = (presence) =>
  api.patch("/chat-service/me/status", { presence }, getChatHeaders());

export const updateChatAvatarService = (file) =>
  api.patch("/chat-service/me/avatar", file, {
    ...getChatHeaders(),
    headers: {
      ...getChatHeaders().headers,
      "Content-Type": "application/octet-stream",
      "x-file-content-type": file.type || "application/octet-stream",
      "x-file-name": encodeURIComponent(file.name || "profile-picture"),
      "x-file-size": String(file.size || 0),
    },
  });

export const getChatUsersService = (params = {}) =>
  api.get("/chat-service/users", {
    ...getChatHeaders(),
    params: withPersonEmail({ limit: 100, ...params }),
  });

export const getChatConversationsService = (params = {}) =>
  api.get("/chat-service/conversations", {
    ...getChatHeaders(),
    params: withPersonEmail(params),
  });

export const openDirectChatService = (userId) =>
  api.post(
    `/chat-service/conversations/direct/${encodeURIComponent(userId)}`,
    {},
    getChatHeaders(),
  );

export const createGroupChatService = ({ title, userIds }) =>
  api.post("/chat-service/conversations/groups", { title, userIds }, getChatHeaders());

export const addGroupMembersService = (chatId, userIds) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/members`,
    { userIds },
    getChatHeaders(),
  );

export const leaveGroupConversationService = (chatId) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/leave`,
    {},
    getChatHeaders(),
  );

export const getChatMessagesService = (chatId, params = {}) =>
  api.get(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages`, {
    ...getChatHeaders(),
    params,
  });

export const clearChatHistoryService = (chatId) =>
  api.delete(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/messages`,
    getChatHeaders(),
  );

export const sendConversationMessageService = (chatId, text, options = {}) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/messages`,
    { text, ...options },
    getChatHeaders(),
  );

export const editConversationMessageService = (chatId, messageId, text) =>
  api.patch(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      messageId,
    )}`,
    { text },
    getChatHeaders(),
  );

export const deleteConversationMessageService = (chatId, messageId) =>
  api.delete(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      messageId,
    )}`,
    getChatHeaders(),
  );

export const pinConversationMessageService = (chatId, messageId, pinned) =>
  api.patch(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      messageId,
    )}/pin`,
    { pinned },
    getChatHeaders(),
  );

export const searchChatMessagesService = (params = {}) =>
  api.get("/chat-service/messages/search", {
    ...getChatHeaders(),
    params,
  });

export const sendDirectMessageService = (userId, text, options = {}) =>
  api.post(
    `/chat-service/messages/direct/${encodeURIComponent(userId)}`,
    { text, ...options },
    getChatHeaders(),
  );

export const markConversationReadService = (chatId) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/read`,
    {},
    getChatHeaders(),
  );

export const shareConversationFileService = (chatId, file) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/files`,
    file,
    {
      ...getChatHeaders(),
      headers: {
        ...getChatHeaders().headers,
        "Content-Type": "application/octet-stream",
        "x-file-content-type": file.type || "application/octet-stream",
        "x-file-name": encodeURIComponent(file.name || "document"),
        "x-file-size": String(file.size || 0),
      },
    },
  );

export const startConversationCallService = (chatId, type) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/calls`,
    { type },
    getChatHeaders(),
  );

export const getActiveConversationCallsService = () =>
  api.get("/chat-service/calls/active", getChatHeaders());

export const endConversationCallService = (chatId, callId) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/calls/${encodeURIComponent(
      callId,
    )}/end`,
    {},
    getChatHeaders(),
  );

export const respondConversationCallService = (chatId, callId, action) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/calls/${encodeURIComponent(
      callId,
    )}/respond`,
    { action },
    getChatHeaders(),
  );

export const addMessageReactionService = (chatId, messageId, emoji) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      messageId,
    )}/reactions`,
    { emoji },
    getChatHeaders(),
  );

export const removeMessageReactionService = (chatId, messageId, emoji) =>
  api.delete(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      messageId,
    )}/reactions/${encodeURIComponent(emoji)}`,
    getChatHeaders(),
  );
