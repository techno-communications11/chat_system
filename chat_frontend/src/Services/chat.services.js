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

export const getChatStatusService = () => api.get("/chat-service/me", getChatHeaders());

export const updateChatStatusService = (presence) =>
  api.patch("/chat-service/me/status", { presence }, getChatHeaders());

export const updateChatAvatarService = (avatarUrl) =>
  api.patch("/chat-service/me/avatar", { avatarUrl }, getChatHeaders());

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

export const getChatMessagesService = (chatId, params = {}) =>
  api.get(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages`, {
    ...getChatHeaders(),
    params,
  });

export const sendConversationMessageService = (chatId, text, options = {}) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/messages`,
    { text, ...options },
    getChatHeaders(),
  );

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

export const shareConversationFileService = (chatId, formData) =>
  api.post(
    `/chat-service/conversations/${encodeURIComponent(chatId)}/files`,
    formData,
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
